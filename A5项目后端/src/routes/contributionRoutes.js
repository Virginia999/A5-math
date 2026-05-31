/**
 * 知识贡献度路由定义
 */

const express = require('express');
const router = express.Router();
const contributionController = require('../controllers/contributionController');
const { authenticate, requireRole } = require('../middlewares/auth');

// 所有贡献度路由需要认证
router.use(authenticate);

/**
 * @route GET /api/contribution/me
 * @desc 获取当前用户贡献度
 * @access Private
 */
router.get('/me', contributionController.getMyContribution);

/**
 * @route GET /api/contribution/leaderboard
 * @desc 获取贡献排行榜
 * @access Private
 */
router.get('/leaderboard', contributionController.getLeaderboard);

/**
 * @route GET /api/contribution/trend
 * @desc 获取贡献趋势
 * @access Private
 */
router.get('/trend', contributionController.getContributionTrend);

/**
 * @route GET /api/contribution/badges
 * @desc 获取用户徽章
 * @access Private
 */
router.get('/badges', contributionController.getUserBadges);

/**
 * @route GET /api/contribution/weights
 * @desc 获取权重配置
 * @access Private
 */
router.get('/weights', contributionController.getWeights);

/**
 * @route POST /api/contribution/update-all
 * @desc 批量更新贡献度
 * @access Private (需要管理员权限)
 */
router.post('/update-all', requireRole(['ADMIN']), contributionController.updateAllContributions);

module.exports = router;
