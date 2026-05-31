const documentService = require('../services/documentService');
const { successResponse, createdResponse, errorResponse } = require('../utils/response');
const { documentSchema } = require('../utils/validation');

const getDocuments = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const tags = req.query.tags ? req.query.tags.split(',') : [];

    const result = await documentService.getDocuments(page, limit, tags);
    successResponse(res, result, '获取文档列表成功');
  } catch (error) {
    next(error);
  }
};

const getDocumentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const document = await documentService.getDocumentById(id);
    successResponse(res, document, '获取文档详情成功');
  } catch (error) {
    next(error);
  }
};

const createDocument = async (req, res, next) => {
  try {
    const { error, value } = documentSchema.validate(req.body);
    if (error) {
      return errorResponse(res, new Error(error.details[0].message), 400);
    }

    const document = await documentService.createDocument(req.user.id, value);
    createdResponse(res, document, '创建文档成功');
  } catch (error) {
    next(error);
  }
};

const updateDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error, value } = documentSchema.validate(req.body);
    if (error) {
      return errorResponse(res, new Error(error.details[0].message), 400);
    }

    const document = await documentService.updateDocument(id, req.user.id, value);
    successResponse(res, document, '更新文档成功');
  } catch (error) {
    next(error);
  }
};

const deleteDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await documentService.deleteDocument(id);
    successResponse(res, result, '删除文档成功');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  deleteDocument,
};
