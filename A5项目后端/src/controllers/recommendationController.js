/**
 * 推荐系统控制器
 */

const recommendationService = require('../services/recommendationService');
const { success, error } = require('../utils/response');

/**
 * 获取个性化推荐
 * GET /api/recommendations
 */
const getRecommendations = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10, sources } = req.query;

    const options = {
      limit: parseInt(limit),
      sources: sources ? sources.split(',') : ['content', 'collaborative', 'knowledge_graph']
    };

    const recommendations = await recommendationService.getRecommendations(userId, options);

    res.json(success({
      recommendations,
      config: recommendationService.getConfig()
    }, '获取推荐成功'));
  } catch (err) {
    console.error('获取推荐错误:', err);
    res.status(500).json(error('获取推荐失败: ' + err.message));
  }
};

/**
 * 获取相似文档
 * GET /api/recommendations/similar/:documentId
 */
const getSimilarDocuments = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { limit = 5 } = req.query;

    const vectorDb = require('../config/vectorDatabase');
    const prisma = require('../config/database');

    // 获取文档的嵌入向量
    const embeddings = await prisma.documentEmbedding.findFirst({
      where: { documentId }
    });

    if (!embeddings) {
      return res.status(404).json(error('文档嵌入不存在'));
    }

    const queryVector = JSON.parse(embeddings.embeddingJson);
    const similar = await vectorDb.similaritySearch(queryVector, parseInt(limit) + 1, 0.5);

    // 排除自身
    const results = similar
      .filter(s => s.documentId !== documentId)
      .slice(0, parseInt(limit));

    res.json(success(results, '获取相似文档成功'));
  } catch (err) {
    console.error('获取相似文档错误:', err);
    res.status(500).json(error('获取相似文档失败: ' + err.message));
  }
};

/**
 * 获取推荐配置
 * GET /api/recommendations/config
 */
const getConfig = async (req, res) => {
  try {
    const config = recommendationService.getConfig();
    res.json(success(config, '获取配置成功'));
  } catch (err) {
    console.error('获取配置错误:', err);
    res.status(500).json(error('获取配置失败: ' + err.message));
  }
};

module.exports = {
  getRecommendations,
  getSimilarDocuments,
  getConfig
};
