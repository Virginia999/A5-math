/**
 * RAG (Retrieval-Augmented Generation) 服务
 * 结合向量检索和大语言模型，实现知识增强的智能问答
 * 这是本项目的核心技术亮点之一
 */

const embeddingService = require('./embeddingService');
const vectorDb = require('../config/vectorDatabase');
const aiClient = require('./aiClient');
const prisma = require('../config/database');

class RAGService {
  constructor() {
    this.topK = parseInt(process.env.RAG_TOP_K) || 5;
    this.similarityThreshold = parseFloat(process.env.RAG_SIMILARITY_THRESHOLD) || 0.7;
    this.maxContextLength = parseInt(process.env.RAG_MAX_CONTEXT_LENGTH) || 4000;
    this.enableHybridSearch = process.env.RAG_HYBRID_SEARCH !== 'false';
    this.enableReRanking = process.env.RAG_RERANKING !== 'false';
  }

  /**
   * RAG检索 - 核心方法
   * @param {string} query - 用户查询
   * @param {Object} options - 配置选项
   * @returns {Promise<{answer: string, sources: Array, confidence: number}>}
   */
  async retrieve(query, options = {}) {
    const {
      topK = this.topK,
      threshold = this.similarityThreshold,
      filters = {},
      includeMetadata = true
    } = options;

    // 1. 生成查询向量
    const queryEmbedding = await embeddingService.generateEmbedding(query);

    // 2. 向量相似度搜索
    let vectorResults = await vectorDb.similaritySearch(queryEmbedding, topK * 2, threshold);

    // 3. 应用过滤条件
    if (filters.tags && filters.tags.length > 0) {
      vectorResults = await this.filterByTags(vectorResults, filters.tags);
    }

    if (filters.dateRange) {
      vectorResults = await this.filterByDateRange(vectorResults, filters.dateRange);
    }

    // 4. 混合搜索（结合关键词搜索）
    if (this.enableHybridSearch) {
      const keywordResults = await this.keywordSearch(query, topK);
      vectorResults = this.mergeResults(vectorResults, keywordResults);
    }

    // 5. 重排序（基于相关性）
    if (this.enableReRanking) {
      vectorResults = await this.reRankResults(query, vectorResults);
    }

    // 6. 截取topK结果
    vectorResults = vectorResults.slice(0, topK);

    // 7. 构建上下文
    const context = this.buildContext(vectorResults);

    return {
      results: vectorResults,
      context,
      queryEmbedding
    };
  }

  /**
   * RAG生成 - 基于检索结果生成回答
   * @param {string} query - 用户查询
   * @param {string} userId - 用户ID
   * @param {Object} options - 配置选项
   */
  async generate(query, userId, options = {}) {
    const startTime = Date.now();

    // 1. 检索相关文档
    const { results, context } = await this.retrieve(query, options);

    // 2. 构建RAG提示词
    const systemPrompt = this.buildRAGPrompt(context, options);

    // 3. 调用LLM生成回答
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query }
    ];

    const response = await aiClient.chat(messages, {
      model: options.model,
      temperature: options.temperature ?? 0.3,
      maxTokens: options.maxTokens ?? 1000
    });

    // 4. 提取引用来源
    const citations = this.extractCitations(response.content, results);

    // 5. 计算置信度
    const confidence = this.calculateConfidence(results, response.content);

    // 6. 记录RAG使用日志
    await this.logRAGUsage(userId, query, results, response, Date.now() - startTime);

    return {
      answer: response.content,
      sources: results.map(r => ({
        documentId: r.documentId,
        title: r.title,
        chunkContent: r.chunkContent.slice(0, 200) + '...',
        similarity: r.similarity
      })),
      citations,
      confidence,
      model: response.model,
      retrievalTime: Date.now() - startTime,
      contextDocuments: results.length
    };
  }

  /**
   * 构建RAG系统提示词
   */
  buildRAGPrompt(context, options = {}) {
    const language = options.language || '中文';
    
    return `你是一个专业的知识库问答助手。请基于提供的知识库内容回答用户问题。

## 回答规则：
1. 优先使用知识库中的信息回答问题
2. 如果知识库中没有相关信息，请明确告知用户
3. 回答时引用具体的文档来源，格式为【来源：文档标题】
4. 保持回答准确、简洁、专业
5. 使用${language}回答

## 知识库内容：
${context}

## 注意：
- 如果问题超出知识库范围，请诚实说明
- 不要编造或推测知识库中不存在的信息
- 对于不确定的内容，标注"需要进一步确认"`;
  }

  /**
   * 构建上下文字符串
   */
  buildContext(results) {
    if (!results || results.length === 0) {
      return '（知识库中没有找到相关内容）';
    }

    let context = '';
    let currentLength = 0;

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const chunk = `\n【文档${i + 1}】${result.title}\n${result.chunkContent}\n`;
      
      if (currentLength + chunk.length > this.maxContextLength) {
        break;
      }
      
      context += chunk;
      currentLength += chunk.length;
    }

    return context;
  }

  /**
   * 关键词搜索（混合搜索的补充）
   */
  async keywordSearch(query, limit) {
    // 使用PostgreSQL全文搜索
    const results = await prisma.$queryRaw`
      SELECT 
        d.id as "documentId",
        d.title,
        d.content,
        d.summary,
        ts_rank_cd(to_tsvector('chinese', d.title || ' ' || d.content), plainto_tsquery('chinese', ${query})) as rank
      FROM "Document" d
      WHERE to_tsvector('chinese', d.title || ' ' || d.content) @@ plainto_tsquery('chinese', ${query})
      ORDER BY rank DESC
      LIMIT ${limit}
    `;

    return results.map(r => ({
      documentId: r.documentId,
      title: r.title,
      chunkContent: r.content.slice(0, 500),
      similarity: r.rank,
      source: 'keyword'
    }));
  }

  /**
   * 合并向量搜索和关键词搜索结果
   */
  mergeResults(vectorResults, keywordResults) {
    const merged = new Map();
    
    // 向量搜索结果权重更高
    vectorResults.forEach(r => {
      merged.set(r.documentId, {
        ...r,
        score: (r.similarity || 0) * 0.7,
        sources: ['vector']
      });
    });
    
    // 关键词搜索结果
    keywordResults.forEach(r => {
      if (merged.has(r.documentId)) {
        const existing = merged.get(r.documentId);
        existing.score += (r.similarity || 0) * 0.3;
        existing.sources.push('keyword');
      } else {
        merged.set(r.documentId, {
          ...r,
          score: (r.similarity || 0) * 0.3,
          sources: ['keyword']
        });
      }
    });
    
    return Array.from(merged.values())
      .sort((a, b) => b.score - a.score);
  }

  /**
   * 重排序结果（基于查询相关性）
   */
  async reRankResults(query, results) {
    // 简化的重排序：基于标题和内容的相关性
    const queryTerms = query.toLowerCase().split(/\s+/);
    
    return results.map(r => {
      let boost = 0;
      const titleLower = r.title.toLowerCase();
      const contentLower = r.chunkContent.toLowerCase();
      
      queryTerms.forEach(term => {
        if (titleLower.includes(term)) boost += 0.1;
        if (contentLower.includes(term)) boost += 0.05;
      });
      
      return {
        ...r,
        similarity: (r.similarity || r.score || 0) + boost,
        reranked: true
      };
    }).sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * 按标签过滤
   */
  async filterByTags(results, tags) {
    const documentIds = results.map(r => r.documentId);
    
    const filteredDocs = await prisma.document.findMany({
      where: {
        id: { in: documentIds },
        tags: { some: { name: { in: tags } } }
      },
      select: { id: true }
    });
    
    const filteredIds = new Set(filteredDocs.map(d => d.id));
    return results.filter(r => filteredIds.has(r.documentId));
  }

  /**
   * 按日期范围过滤
   */
  async filterByDateRange(results, dateRange) {
    const documentIds = results.map(r => r.documentId);
    
    const filteredDocs = await prisma.document.findMany({
      where: {
        id: { in: documentIds },
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end
        }
      },
      select: { id: true }
    });
    
    const filteredIds = new Set(filteredDocs.map(d => d.id));
    return results.filter(r => filteredIds.has(r.documentId));
  }

  /**
   * 提取引用来源
   */
  extractCitations(answer, results) {
    const citations = [];
    const citationPattern = /【来源：(.+?)】/g;
    let match;
    
    while ((match = citationPattern.exec(answer)) !== null) {
      const citedTitle = match[1];
      const source = results.find(r => r.title === citedTitle);
      if (source) {
        citations.push({
          documentId: source.documentId,
          title: source.title,
          text: match[0]
        });
      }
    }
    
    return citations;
  }

  /**
   * 计算回答置信度
   */
  calculateConfidence(results, answer) {
    if (!results || results.length === 0) return 0;
    
    // 基于检索结果质量和数量的置信度
    const avgSimilarity = results.reduce((sum, r) => sum + (r.similarity || 0), 0) / results.length;
    const coverageBonus = Math.min(results.length / 5, 1) * 0.2;
    
    // 检查回答是否包含"不知道"等不确定表述
    const uncertainPhrases = ['不知道', '不确定', '没有找到', '无法回答', '暂无信息'];
    const hasUncertainty = uncertainPhrases.some(phrase => answer.includes(phrase));
    const uncertaintyPenalty = hasUncertainty ? 0.3 : 0;
    
    return Math.min(Math.max(avgSimilarity + coverageBonus - uncertaintyPenalty, 0), 1);
  }

  /**
   * 记录RAG使用日志
   */
  async logRAGUsage(userId, query, results, response, duration) {
    try {
      await prisma.rAGUsageLog.create({
        data: {
          userId,
          query,
          resultCount: results.length,
          model: response.model,
          promptTokens: response.usage?.promptTokens || 0,
          completionTokens: response.usage?.completionTokens || 0,
          duration,
          createdAt: new Date()
        }
      });
    } catch (error) {
      console.warn('RAG使用日志记录失败:', error.message);
    }
  }

  /**
   * 获取RAG配置信息
   */
  getConfig() {
    return {
      topK: this.topK,
      similarityThreshold: this.similarityThreshold,
      maxContextLength: this.maxContextLength,
      enableHybridSearch: this.enableHybridSearch,
      enableReRanking: this.enableReRanking,
      embeddingModel: embeddingService.getModelInfo()
    };
  }
}

module.exports = new RAGService();
