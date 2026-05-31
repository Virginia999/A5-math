const authService = require('../services/authService');
const { successResponse, createdResponse, errorResponse } = require('../utils/response');
const { registerSchema, loginSchema } = require('../utils/validation');

const register = async (req, res, next) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return errorResponse(res, new Error(error.details[0].message), 400);
    }

    const { email, password, name } = value;
    const result = await authService.register(email, password, name);
    
    createdResponse(res, result, '注册成功');
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return errorResponse(res, new Error(error.details[0].message), 400);
    }

    const { email, password } = value;
    const result = await authService.login(email, password);
    
    successResponse(res, result, '登录成功');
  } catch (error) {
    next(error);
  }
};

const getCurrentUser = async (req, res, next) => {
  try {
    successResponse(res, { user: req.user }, '获取用户信息成功');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getCurrentUser,
};
