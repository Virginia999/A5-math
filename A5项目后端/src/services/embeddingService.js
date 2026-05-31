/**
 * 嵌入服务 - 生成文本向量嵌入
 * 支持 OpenAI Embeddings API 和本地模型
 */

const axios = require('axios');
const prisma = require('../config/database');

class EmbeddingService {
  constructor() {
    this.provider = process.env.EMBEDDING_PROVIDER || 'openai';
    this.model = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
    this.dimension = parseInt(process.env.EMBEDDING_DIMENSION) || 1536;
    this.batchSize = parseInt(process.env.EMBEDDING_BATCH_SIZE) || 100;
    
    // API配置
    this.apiKey = process.env.OPENAI_API_KEY;
    this.baseUrl = process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1';
  }

  /**
   * 生成单个文本的嵌入向量
   * @param {string} text - 输入文本
   * @returns {Promise<number[]>} 嵌入向量
   */
  async generateEmbedding(text) {
    // 清理和预处理文本
    const cleanedText = this.preprocessText(text);
    
    try {
      if (this.provider === 'openai') {
        return await this.openaiEmbedding(cleanedText);
      } else if (this.provider === 'local') {
        return await this.localEmbedding(cleanedText);
      } else if (this.provider === 'qwen') {
        return await this.qwenEmbedding(cleanedText);
      }
      throw new Error(`不支持的嵌入提供者: ${this.provider}`);
    } catch (error) {
      console.error('嵌入生成失败:', error.message);
      throw error;
    }
  }

  /**
   * 批量生成嵌入向量
   * @param {string[]} texts - 文本数组
   * @returns {Promise<number[][]>} 嵌入向量数组
   */
  async generateBatchEmbeddings(texts) {
    const results = [];
    
    // 分批处理
    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize);
      const batchResults = await Promise.all(
        batch.map(text => this.generateEmbedding(text))
      );
      results.push(...batchResults);
    }
    
    return results;
  }

  /**
   * OpenAI Embeddings API
   */
  async openaiEmbedding(text) {
    const response = await axios.post(
      `${this.baseUrl}/embeddings`,
      {
        input: text,
        model: this.model,
        encoding_format: 'float'
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    return response.data.data[0].embedding;
  }

  /**
   * 通义千问 Embeddings API
   */
  async qwenEmbedding(text) {
    const response = await axios.post(
      'https://dashscope.aliyuncs.com/api/v1/services/embeddings/text-embedding/text-embedding',
      {
        input: { texts: [text] },
        parameters: { text_type: 'document' }
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.QWEN_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    return response.data.output.embeddings[0].embedding;
  }

  /**
   * 本地嵌入模型（简化版，实际应接入本地模型）
   */
  async localEmbedding(text) {
    // 这里可以接入本地模型如 sentence-transformers
    // 目前返回一个简单的哈希向量作为示例
    const words = text.toLowerCase().split(/\s+/);
    const embedding = new Array(this.dimension).fill(0);
    
    words.forEach((word, idx) => {
      const hash = this.simpleHash(word);
      const pos = hash % this.dimension;
      embedding[pos] += 1 / (idx + 1);
    });
    
    // 归一化
    const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    return embedding.map(v => v / (norm || 1));
  }

  /**
   * 简单哈希函数
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * 文本预处理
   */
  preprocessText(text) {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[\x00-\x1F\x7F]/g, '')
      .trim()
      .slice(0, 8000); // 限制长度
  }

  /**
   * 文档分块
   * @param {string} content - 文档内容
   * @param {number} chunkSize - 块大小（字符数）
   * @param {number} overlap - 重叠大小
   */
  chunkDocument(content, chunkSize = 500, overlap = 50) {
    const chunks = [];
    let start = 0;
    
    while (start < content.length) {
      const end = Math.min(start + chunkSize, content.length);
      let chunk = content.slice(start, end);
      
      // 尝试在句子边界分割
      if (end < content.length) {
        const lastPeriod = chunk.lastIndexOf('。');
        const lastNewline = chunk.lastIndexOf('\n');
        const breakPoint = Math.max(lastPeriod, lastNewline);
        
        if (breakPoint > chunkSize * 0.5) {
          chunk = chunk.slice(0, breakPoint + 1);
          start += breakPoint + 1 - overlap;
        } else {
          start += chunkSize - overlap;
        }
      } else {
        start = content.length;
      }
      
      if (chunk.trim().length > 0) {
        chunks.push(chunk.trim());
      }
    }
    
    return chunks;
  }

  /**
   * 为文档生成并存储嵌入
   * @param {string} documentId - 文档ID
   * @param {string} title - 文档标题
   * @param {string} content - 文档内容
   */
  async embedDocument(documentId, title, content) {
    const vectorDb = require('../config/vectorDatabase');
    
    // 分块
    const chunks = this.chunkDocument(content);
    
    // 为每个块生成嵌入
    const embeddings = await this.generateBatchEmbeddings(chunks);
    
    // 存储到向量数据库
    const chunksWithEmbeddings = chunks.map((chunk, idx) => ({
      content: chunk,
      embedding: embeddings[idx]
    }));
    
    await vectorDb.storeBatchEmbeddings(documentId, chunksWithEmbeddings);
    
    return {
      documentId,
      chunkCount: chunks.length,
      dimension: this.dimension
    };
  }

  /**
   * 获取嵌入模型信息
   */
  getModelInfo() {
    return {
      provider: this.provider,
      model: this.model,
      dimension: this.dimension,
      batchSize: this.batchSize
    };
  }
}

module.exports = new EmbeddingService();
