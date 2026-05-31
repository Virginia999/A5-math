/**
 * 知识推荐服务
 * 实现基于内容、协同过滤和知识图谱的混合推荐算法
 */

const prisma = require('../config/database');
const embeddingService = require('./embeddingService');
const vectorDb = require('../config/vectorDatabase');

class RecommendationService {
  constructor() {
    this.contentBasedWeight = parseFloat(process.env.REC_CONTENT_WEIGHT) || 0.4;
    this.collaborativeWeight = parseFloat(process.env.REC_COLLAB_WEIGHT) || 0.3;
    this.kgWeight = parseFloat(process.env.REC_KG_WEIGHT) || 0.3;
    this.defaultLimit = parseInt(process.env.REC_DEFAULT_LIMIT) || 10;
  }

  /**
   * 混合推荐 - 主入口
   * @param {string} userId - 用户ID
   * @param {Object} options - 推荐选项
   */
  async getRecommendations(userId, options = {}) {
    const {
      limit = this.defaultLimit,
      excludeViewed = true,
      sources = ['content', 'collaborative', 'knowledge_graph']
    } = options;

    // 并行获取各种推荐结果
    const recommendations = {};

    if (sources.includes('content')) {
      recommendations.contentBased = await this.contentBasedRecommendation(userId, limit * 2);
    }

    if (sources.includes('collaborative')) {
      recommendations.collaborative = await this.collaborativeFiltering(userId, limit * 2);
    }

    if (sources.includes('knowledge_graph')) {
      recommendations.kgBased = await this.knowledgeGraphRecommendation(userId, limit * 2);
    }

    // 混合排序
    const merged = this.mergeRecommendations(recommendations, {
      contentBased: this.contentBasedWeight,
      collaborative: this.collaborativeWeight,
      kgBased: this.kgWeight
    });

    // 排除已查看的文档
    let finalResults = merged;
    if (excludeViewed) {
      const viewedDocs = await this.getUserViewedDocuments(userId);
      finalResults = merged.filter(r => !viewedDocs.has(r.documentId));
    }

    // 截取指定数量
    finalResults = finalResults.slice(0, limit);

    // 存储推荐结果
    await this.storeRecommendations(userId, finalResults);

    return finalResults;
  }

  /**
   * 基于内容的推荐
   * 根据用户浏览/收藏的文档内容相似度推荐
   */
  async contentBasedRecommendation(userId, limit) {
    // 1. 获取用户感兴趣的文档（浏览历史、收藏）
    const userInterests = await this.getUserInterestDocuments(userId);
    
    if (userInterests.length === 0) {
      return [];
    }

    // 2. 获取这些文档的向量
    const interestVectors = [];
    for (const doc of userInterests) {
      const embeddings = await prisma.documentEmbedding.findMany({
        where: { documentId: doc.id },
        select: { embeddingJson: true }
      });
      
      if (embeddings.length > 0) {
        const vector = JSON.parse(embeddings[0].embeddingJson);
        interestVectors.push({ vector, weight: doc.weight });
      }
    }

    if (interestVectors.length === 0) {
      return [];
    }

    // 3. 计算用户兴趣中心向量
    const userVector = this.computeWeightedAverage(interestVectors);

    // 4. 向量相似度搜索
    const similarDocs = await vectorDb.similaritySearch(userVector, limit, 0.5);

    // 5. 格式化结果
    return similarDocs.map(doc => ({
      documentId: doc.documentId,
      title: doc.title,
      score: doc.similarity,
      reason: '与您感兴趣的内容相似',
      source: 'CONTENT_BASED'
    }));
  }

  /**
   * 协同过滤推荐
   * 根据相似用户的行为推荐
   */
  async collaborativeFiltering(userId, limit) {
    // 1. 获取目标用户的行为向量
    const userBehavior = await this.getUserBehaviorVector(userId);
    
    // 2. 找到相似用户
    const similarUsers = await this.findSimilarUsers(userId, userBehavior, 10);
    
    if (similarUsers.length === 0) {
      return [];
    }

    // 3. 获取相似用户喜欢但目标用户未看过的文档
    const candidateDocs = await this.getCandidateDocuments(userId, similarUsers);
    
    // 4. 计算推荐分数
    const recommendations = [];
    for (const doc of candidateDocs.slice(0, limit * 2)) {
      const score = this.computeCollaborativeScore(doc, similarUsers);
      recommendations.push({
        documentId: doc.documentId,
        title: doc.title,
        score,
        reason: '相似用户也关注了此文档',
        source: 'COLLABORATIVE'
      });
    }

    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * 基于知识图谱的推荐
   * 根据知识关联推荐相关文档
   */
  async knowledgeGraphRecommendation(userId, limit) {
    // 1. 获取用户感兴趣的文档
    const userInterests = await this.getUserInterestDocuments(userId);
    
    if (userInterests.length === 0) {
      return [];
    }

    // 2. 获取这些文档的知识节点
    const interestNodes = await prisma.knowledgeNode.findMany({
      where: {
        documentId: { in: userInterests.map(d => d.id) }
      },
      include: {
        relations: {
          include: { targetNode: { include: { document: true } } }
        },
        targetRelations: {
          include: { sourceNode: { include: { document: true } } }
        }
      }
    });

    // 3. 收集关联文档
    const relatedDocs = new Map();
    
    for (const node of interestNodes) {
      // 出边关联
      for (const rel of node.relations) {
        if (rel.targetNode.document) {
          const docId = rel.targetNode.documentId;
          const current = relatedDocs.get(docId) || { count: 0, relations: [] };
          current.count += 1;
          current.relations.push(rel.relationType);
          relatedDocs.set(docId, current);
        }
      }
      
      // 入边关联
      for (const rel of node.targetRelations) {
        if (rel.sourceNode.document) {
          const docId = rel.sourceNode.documentId;
          const current = relatedDocs.get(docId) || { count: 0, relations: [] };
          current.count += 1;
          current.relations.push(rel.relationType);
          relatedDocs.set(docId, current);
        }
      }
    }

    // 4. 排序并返回
    return Array.from(relatedDocs.entries())
      .filter(([docId]) => !userInterests.some(d => d.id === docId))
      .map(([documentId, data]) => ({
        documentId,
        title: data.relations[0] || '知识关联',
        score: Math.min(data.count / 5, 1),
        reason: `通过知识关联发现 (${data.relations.slice(0, 3).join(', ')})`,
        source: 'KNOWLEDGE_GRAPH'
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * 合并多种推荐结果
   */
  mergeRecommendations(recommendations, weights) {
    const merged = new Map();

    for (const [source, results] of Object.entries(recommendations)) {
      const weight = weights[source] || 1;
      
      for (const rec of results) {
        const existing = merged.get(rec.documentId);
        
        if (existing) {
          existing.score += rec.score * weight;
          existing.sources.push(source);
        } else {
          merged.set(rec.documentId, {
            documentId: rec.documentId,
            title: rec.title,
            score: rec.score * weight,
            reason: rec.reason,
            sources: [source]
          });
        }
      }
    }

    return Array.from(merged.values())
      .sort((a, b) => b.score - a.score);
  }

  /**
   * 获取用户感兴趣的文档
   */
  async getUserInterestDocuments(userId) {
    // 收藏的文档权重更高
    const favorites = await prisma.favorite.findMany({
      where: { userId },
      select: { documentId: true }
    });

    // 浏览历史
    const recentViews = await prisma.document.findMany({
      where: {
        comments: { some: { userId } }
      },
      select: { id: true },
      take: 20
    });

    const interests = [
      ...favorites.map(f => ({ id: f.documentId, weight: 2.0 })),
      ...recentViews.map(v => ({ id: v.id, weight: 1.0 }))
    ];

    return interests;
  }

  /**
   * 获取用户已查看的文档
   */
  async getUserViewedDocuments(userId) {
    const viewed = await prisma.document.findMany({
      where: {
        OR: [
          { favorites: { some: { userId } } },
          { comments: { some: { userId } } }
        ]
      },
      select: { id: true }
    });

    return new Set(viewed.map(d => d.id));
  }

  /**
   * 计算加权平均向量
   */
  computeWeightedAverage(vectors) {
    const dimension = vectors[0].vector.length;
    const result = new Array(dimension).fill(0);
    let totalWeight = 0;

    for (const { vector, weight } of vectors) {
      for (let i = 0; i < dimension; i++) {
        result[i] += vector[i] * weight;
      }
      totalWeight += weight;
    }

    return result.map(v => v / totalWeight);
  }

  /**
   * 获取用户行为向量
   */
  async getUserBehaviorVector(userId) {
    const behaviors = await prisma.$queryRaw`
      SELECT 
        d.id as document_id,
        COUNT(CASE WHEN f.id IS NOT NULL THEN 1 END) as favorite_count,
        COUNT(CASE WHEN c.id IS NOT NULL THEN 1 END) as comment_count,
        d.views as view_count
      FROM "Document" d
      LEFT JOIN "Favorite" f ON d.id = f."documentId" AND f."userId" = ${userId}
      LEFT JOIN "Comment" c ON d.id = c."documentId" AND c."userId" = ${userId}
      GROUP BY d.id
      ORDER BY favorite_count DESC, comment_count DESC, view_count DESC
      LIMIT 100
    `;

    return behaviors;
  }

  /**
   * 找到相似用户
   */
  async findSimilarUsers(userId, userBehavior, limit) {
    // 简化的协同过滤：基于共同兴趣
    const similarUsers = await prisma.$queryRaw`
      WITH user_docs AS (
        SELECT "documentId" FROM "Favorite" WHERE "userId" = ${userId}
        UNION
        SELECT "documentId" FROM "Comment" WHERE "userId" = ${userId}
      )
      SELECT 
        f2."userId",
        COUNT(*) as common_interests
      FROM user_docs ud
      JOIN "Favorite" f2 ON ud."documentId" = f2."documentId"
      WHERE f2."userId" != ${userId}
      GROUP BY f2."userId"
      ORDER BY common_interests DESC
      LIMIT ${limit}
    `;

    return similarUsers.map(u => ({
      userId: u.userId,
      similarity: u.common_interests / 10
    }));
  }

  /**
   * 获取候选推荐文档
   */
  async getCandidateDocuments(userId, similarUsers) {
    const similarUserIds = similarUsers.map(u => u.userId);

    const docs = await prisma.$queryRaw`
      SELECT 
        d.id as "documentId",
        d.title,
        COUNT(*) as interest_count
      FROM "Document" d
      JOIN "Favorite" f ON d.id = f."documentId"
      WHERE f."userId" IN (${similarUserIds.join(',')})
      AND d.id NOT IN (
        SELECT "documentId" FROM "Favorite" WHERE "userId" = ${userId}
        UNION
        SELECT "documentId" FROM "Comment" WHERE "userId" = ${userId}
      )
      GROUP BY d.id, d.title
      ORDER BY interest_count DESC
      LIMIT 50
    `;

    return docs;
  }

  /**
   * 计算协同过滤分数
   */
  computeCollaborativeScore(doc, similarUsers) {
    return Math.min(doc.interest_count / similarUsers.length, 1);
  }

  /**
   * 存储推荐结果
   */
  async storeRecommendations(userId, recommendations) {
    for (const rec of recommendations) {
      try {
        await prisma.recommendation.upsert({
          where: {
            userId_documentId_source: {
              userId,
              documentId: rec.documentId,
              source: rec.source
            }
          },
          create: {
            userId,
            documentId: rec.documentId,
            score: rec.score,
            reason: rec.reason,
            source: rec.source
          },
          update: {
            score: rec.score,
            reason: rec.reason
          }
        });
      } catch (error) {
        console.warn('存储推荐结果失败:', error.message);
      }
    }
  }

  /**
   * 获取推荐配置
   */
  getConfig() {
    return {
      contentBasedWeight: this.contentBasedWeight,
      collaborativeWeight: this.collaborativeWeight,
      kgWeight: this.kgWeight,
      defaultLimit: this.defaultLimit
    };
  }
}

module.exports = new RecommendationService();
