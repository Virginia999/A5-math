/**
 * 向量数据库配置 - 支持 PostgreSQL pgvector 扩展
 * 用于存储文档的向量嵌入，实现语义搜索和RAG检索
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * 向量数据库服务类
 * 提供向量存储、检索、相似度计算等功能
 */
class VectorDatabase {
  constructor() {
    this.dimension = 1536; // OpenAI text-embedding-3-small 维度
    this.indexName = 'document_embeddings_idx';
  }

  /**
   * 初始化向量扩展（需要PostgreSQL安装pgvector扩展）
   */
  async initialize() {
    try {
      // 创建pgvector扩展
      await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS vector;`;
      console.log('✅ pgvector扩展初始化成功');
      return true;
    } catch (error) {
      console.warn('⚠️ pgvector扩展初始化失败，将使用备用方案:', error.message);
      return false;
    }
  }

  /**
   * 存储文档向量
   * @param {string} documentId - 文档ID
   * @param {number[]} embedding - 向量嵌入
   * @param {string} chunkContent - 对应的文本片段
   * @param {number} chunkIndex - 片段索引
   */
  async storeEmbedding(documentId, embedding, chunkContent, chunkIndex = 0) {
    const embeddingStr = `[${embedding.join(',')}]`;
    
    try {
      // 使用原生SQL存储向量
      await prisma.$executeRaw`
        INSERT INTO document_embeddings (id, "documentId", embedding, "chunkContent", "chunkIndex", "createdAt")
        VALUES (gen_random_uuid(), ${documentId}, ${embeddingStr}::vector, ${chunkContent}, ${chunkIndex}, NOW())
        ON CONFLICT ("documentId", "chunkIndex") 
        DO UPDATE SET embedding = ${embeddingStr}::vector, "chunkContent" = ${chunkContent}, "updatedAt" = NOW()
      `;
      return true;
    } catch (error) {
      // 备用方案：存储到JSON字段
      console.warn('使用备用向量存储方案');
      await prisma.documentEmbedding.upsert({
        where: { 
          documentId_chunkIndex: { documentId, chunkIndex }
        },
        create: {
          documentId,
          embeddingJson: JSON.stringify(embedding),
          chunkContent,
          chunkIndex,
        },
        update: {
          embeddingJson: JSON.stringify(embedding),
          chunkContent,
        }
      });
      return true;
    }
  }

  /**
   * 批量存储文档向量
   * @param {string} documentId - 文档ID
   * @param {Array<{embedding: number[], content: string}>} chunks - 文档片段数组
   */
  async storeBatchEmbeddings(documentId, chunks) {
    const results = [];
    for (let i = 0; i < chunks.length; i++) {
      const result = await this.storeEmbedding(documentId, chunks[i].embedding, chunks[i].content, i);
      results.push(result);
    }
    return results;
  }

  /**
   * 向量相似度搜索
   * @param {number[]} queryEmbedding - 查询向量
   * @param {number} topK - 返回结果数量
   * @param {number} threshold - 相似度阈值
   */
  async similaritySearch(queryEmbedding, topK = 10, threshold = 0.7) {
    const queryStr = `[${queryEmbedding.join(',')}]`;
    
    try {
      // 使用pgvector进行余弦相似度搜索
      const results = await prisma.$queryRaw`
        SELECT 
          e.id,
          e."documentId",
          e."chunkContent",
          e."chunkIndex",
          d.title,
          d.summary,
          1 - (e.embedding <=> ${queryStr}::vector) as similarity
        FROM document_embeddings e
        JOIN "Document" d ON e."documentId" = d.id
        WHERE 1 - (e.embedding <=> ${queryStr}::vector) >= ${threshold}
        ORDER BY e.embedding <=> ${queryStr}::vector
        LIMIT ${topK}
      `;
      return results;
    } catch (error) {
      // 备用方案：使用JavaScript计算相似度
      console.warn('使用备用相似度计算方案');
      return await this.fallbackSimilaritySearch(queryEmbedding, topK, threshold);
    }
  }

  /**
   * 备用相似度搜索（JavaScript实现）
   */
  async fallbackSimilaritySearch(queryEmbedding, topK, threshold) {
    const embeddings = await prisma.documentEmbedding.findMany({
      include: {
        document: {
          select: { id: true, title: true, summary: true }
        }
      }
    });

    const results = embeddings.map(e => {
      const storedEmbedding = JSON.parse(e.embeddingJson);
      const similarity = this.cosineSimilarity(queryEmbedding, storedEmbedding);
      return {
        id: e.id,
        documentId: e.documentId,
        chunkContent: e.chunkContent,
        chunkIndex: e.chunkIndex,
        title: e.document.title,
        summary: e.document.summary,
        similarity
      };
    });

    return results
      .filter(r => r.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  /**
   * 计算余弦相似度
   */
  cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (normA * normB);
  }

  /**
   * 删除文档的所有向量
   */
  async deleteDocumentEmbeddings(documentId) {
    try {
      await prisma.$executeRaw`DELETE FROM document_embeddings WHERE "documentId" = ${documentId}`;
    } catch (error) {
      await prisma.documentEmbedding.deleteMany({
        where: { documentId }
      });
    }
  }

  /**
   * 获取向量统计信息
   */
  async getStats() {
    try {
      const count = await prisma.$queryRaw`SELECT COUNT(*) as count FROM document_embeddings`;
      return { totalEmbeddings: Number(count[0].count) };
    } catch (error) {
      const count = await prisma.documentEmbedding.count();
      return { totalEmbeddings: count };
    }
  }
}

module.exports = new VectorDatabase();
