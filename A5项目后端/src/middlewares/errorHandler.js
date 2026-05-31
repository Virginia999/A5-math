const { errorResponse } = require('../utils/response');

const notFoundHandler = (req, res, next) => {
  const error = new Error(`未找到 - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

const errorHandler = (error, req, res, next) => {
  const statusCode = error.statusCode || 500;
  
  if (error.name === 'PrismaClientKnownRequestError') {
    if (error.code === 'P2002') {
      return errorResponse(res, new Error('数据已存在'), 409);
    }
    if (error.code === 'P2025') {
      return errorResponse(res, new Error('记录不存在'), 404);
    }
  }

  errorResponse(res, error, statusCode);
};

module.exports = {
  notFoundHandler,
  errorHandler,
};
