const searchService = require('../services/searchService');
const { successResponse, errorResponse } = require('../utils/response');
const { searchSchema } = require('../utils/validation');

const searchDocuments = async (req, res, next) => {
  try {
    const { error, value } = searchSchema.validate(req.query);
    if (error) {
      return errorResponse(res, new Error(error.details[0].message), 400);
    }

    const { query, tags = [], page = 1, limit = 10 } = value;
    const result = await searchService.searchDocuments(query, tags, page, limit);
    successResponse(res, result, '搜索成功');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  searchDocuments,
};
