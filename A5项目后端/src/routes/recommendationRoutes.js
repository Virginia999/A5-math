/**
 * 推荐系统路由定义
 */

const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendationController');
const { authenticate } = require('../middlewares/auth');

// 所有推荐路由需要认证
router.use(authenticate);

/**
 * @route GET /api/recommendations
 * @desc 获取个性化推荐
 * @access Private
 */
router.get('/', recommendationController.getRecommendations);

/**
 * @route GET /api/recommendations/similar/:documentId
 * @desc 获取相似文档
 * @access Private
 */
router.get('/similar/:documentId', recommendationController.getSimilarDocuments);

/**
 * @route GET /api/recommendations/config
 * @desc 获取推荐配置
 * @access Private
 */
router.get('/config', recommendationController.getConfig);

module.exports = router;
