const { verifyToken } = require('../utils/jwt');
const prisma = require('../config/database');
const { errorResponse } = require('../utils/response');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, new Error('未提供认证令牌'), 401);
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
      return errorResponse(res, new Error('用户不存在'), 401);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return errorResponse(res, new Error('无效的认证令牌'), 401);
    }
    if (error.name === 'TokenExpiredError') {
      return errorResponse(res, new Error('认证令牌已过期'), 401);
    }
    errorResponse(res, error, 500);
  }
};

const authorizeRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return errorResponse(res, new Error('权限不足'), 403);
    }
    next();
  };
};

module.exports = {
  authenticate,
  authorizeRole,
};
