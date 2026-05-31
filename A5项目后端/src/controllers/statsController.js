const statsService = require('../services/statsService');
const { successResponse } = require('../utils/response');

const getStats = async (req, res, next) => {
  try {
    const stats = await statsService.getStats();
    successResponse(res, stats, '获取统计数据成功');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStats,
};
