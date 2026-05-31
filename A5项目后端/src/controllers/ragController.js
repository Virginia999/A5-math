/**
 * RAG控制器 - 处理RAG相关的HTTP请求
 */

const ragService = require('../services/ragService');
const embeddingService = require('../services/embeddingService');
const { success, error } = require('../utils/response');

/**
 * RAG智能问答
 * POST /api/rag/query
 */
const ragQuery = async (req, res) => {
  try {
    const { query, options = {} } = req.body;
    const userId = req.user.id;

    if (!query || query.trim().length === 0) {
      return res.status(400).json(error('查询内容不能为空'));
    }

    const result = await ragService.generate(query, userId, {
      ...options,
      model: options.model || process.env.AI_DEFAULT_MODEL
    });

    res.json(success(result, 'RAG问答完成'));
  } catch (err) {
    console.error('RAG问答错误:', err);
    res.status(500).json(error('RAG问答处理失败: ' + err.message));
  }
};

/**
 * RAG检索（仅检索不生成）
 * POST /api/rag/retrieve
 */
const ragRetrieve = async (req, res) => {
  try {
    const { query, options = {} } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json(error('查询内容不能为空'));
    }

    const result = await ragService.retrieve(query, options);

    res.json(success(result, 'RAG检索完成'));
  } catch (err) {
    console.error('RAG检索错误:', err);
    res.status(500).json(error('RAG检索失败: ' + err.message));
  }
};

/**
 * 为文档生成嵌入向量
 * POST /api/rag/embed/:documentId
 */
const embedDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const prisma = require('../config/database');

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { id: true, title: true, content: true }
    });

    if (!document) {
      return res.status(404).json(error('文档不存在'));
    }

    const result = await embeddingService.embedDocument(
      document.id,
      document.title,
      document.content
    );

    res.json(success(result, '文档嵌入生成完成'));
  } catch (err) {
    console.error('文档嵌入错误:', err);
    res.status(500).json(error('文档嵌入生成失败: ' + err.message));
  }
};

/**
 * 批量生成文档嵌入
 * POST /api/rag/embed-batch
 */
const embedBatch = async (req, res) => {
  try {
    const prisma = require('../config/database');
    
    const documents = await prisma.document.findMany({
      select: { id: true, title: true, content: true }
    });

    const results = [];
    for (const doc of documents) {
      try {
        const result = await embeddingService.embedDocument(doc.id, doc.title, doc.content);
        results.push(result);
      } catch (err) {
        results.push({ documentId: doc.id, error: err.message });
      }
    }

    res.json(success({
      total: documents.length,
      processed: results.length,
      results
    }, '批量嵌入生成完成'));
  } catch (err) {
    console.error('批量嵌入错误:', err);
    res.status(500).json(error('批量嵌入生成失败: ' + err.message));
  }
};

/**
 * 获取RAG配置信息
 * GET /api/rag/config
 */
const getRAGConfig = async (req, res) => {
  try {
    const config = ragService.getConfig();
    res.json(success(config, '获取RAG配置成功'));
  } catch (err) {
    console.error('获取RAG配置错误:', err);
    res.status(500).json(error('获取RAG配置失败: ' + err.message));
  }
};

/**
 * 语义相似度计算
 * POST /api/rag/similarity
 */
const calculateSimilarity = async (req, res) => {
  try {
    const { text1, text2 } = req.body;

    if (!text1 || !text2) {
      return res.status(400).json(error('需要提供两段文本'));
    }

    const [embedding1, embedding2] = await Promise.all([
      embeddingService.generateEmbedding(text1),
      embeddingService.generateEmbedding(text2)
    ]);

    const vectorDb = require('../config/vectorDatabase');
    const similarity = vectorDb.cosineSimilarity(embedding1, embedding2);

    res.json(success({
      similarity,
      text1Length: text1.length,
      text2Length: text2.length
    }, '相似度计算完成'));
  } catch (err) {
    console.error('相似度计算错误:', err);
    res.status(500).json(error('相似度计算失败: ' + err.message));
  }
};

module.exports = {
  ragQuery,
  ragRetrieve,
  embedDocument,
  embedBatch,
  getRAGConfig,
  calculateSimilarity
};
