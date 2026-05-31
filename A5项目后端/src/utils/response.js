const successResponse = (res, data, message = '成功') => {
  return res.status(200).json({
    success: true,
    message,
    data,
  });
};

const createdResponse = (res, data, message = '创建成功') => {
  return res.status(201).json({
    success: true,
    message,
    data,
  });
};

const errorResponse = (res, error, statusCode = 500) => {
  return res.status(statusCode).json({
    success: false,
    message: error.message || '服务器错误',
    error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
  });
};

module.exports = {
  successResponse,
  createdResponse,
  errorResponse,
};
