/**
 * 知识贡献度控制器
 */

const contributionService = require('../services/contributionService');
const { success, error } = require('../utils/response');

/**
 * 获取用户贡献度
 * GET /api/contribution/me
 */
const getMyContribution = async (req, res) => {
  try {
    const userId = req.user.id;
    const details = await contributionService.getUserContributionDetails(userId);

    res.json(success(details, '获取贡献度成功'));
  } catch (err) {
    console.error('获取贡献度错误:', err);
    res.status(500).json(error('获取贡献度失败: ' + err.message));
  }
};

/**
 * 获取贡献排行榜
 * GET /api/contribution/leaderboard
 */
const getLeaderboard = async (req, res) => {
  try {
    const { period, limit = 10 } = req.query;

    const leaderboard = await contributionService.getLeaderboard(period, parseInt(limit));

    res.json(success(leaderboard, '获取排行榜成功'));
  } catch (err) {
    console.error('获取排行榜错误:', err);
    res.status(500).json(error('获取排行榜失败: ' + err.message));
  }
};

/**
 * 获取用户贡献趋势
 * GET /api/contribution/trend
 */
const getContributionTrend = async (req, res) => {
  try {
    const userId = req.user.id;
    const { months = 6 } = req.query;

    const trend = await contributionService.getContributionTrend(userId, parseInt(months));

    res.json(success(trend, '获取趋势成功'));
  } catch (err) {
    console.error('获取趋势错误:', err);
    res.status(500).json(error('获取趋势失败: ' + err.message));
  }
};

/**
 * 获取用户徽章
 * GET /api/contribution/badges
 */
const getUserBadges = async (req, res) => {
  try {
    const userId = req.user.id;
    const badges = await contributionService.getUserBadges(userId);

    res.json(success(badges, '获取徽章成功'));
  } catch (err) {
    console.error('获取徽章错误:', err);
    res.status(500).json(error('获取徽章失败: ' + err.message));
  }
};

/**
 * 获取权重配置
 * GET /api/contribution/weights
 */
const getWeights = async (req, res) => {
  try {
    const weights = contributionService.getWeights();
    res.json(success(weights, '获取权重配置成功'));
  } catch (err) {
    console.error('获取权重配置错误:', err);
    res.status(500).json(error('获取权重配置失败: ' + err.message));
  }
};

/**
 * 批量更新贡献度（管理员）
 * POST /api/contribution/update-all
 */
const updateAllContributions = async (req, res) => {
  try {
    const results = await contributionService.updateAllContributions();

    res.json(success({
      total: results.length,
      success: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    }, '批量更新完成'));
  } catch (err) {
    console.error('批量更新错误:', err);
    res.status(500).json(error('批量更新失败: ' + err.message));
  }
};

module.exports = {
  getMyContribution,
  getLeaderboard,
  getContributionTrend,
  getUserBadges,
  getWeights,
  updateAllContributions
};
