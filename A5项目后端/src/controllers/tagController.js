const tagService = require('../services/tagService');
const { successResponse, createdResponse, errorResponse } = require('../utils/response');
const { tagSchema } = require('../utils/validation');

const getTags = async (req, res, next) => {
  try {
    const tags = await tagService.getTags();
    successResponse(res, tags, '获取标签列表成功');
  } catch (error) {
    next(error);
  }
};

const createTag = async (req, res, next) => {
  try {
    const { error, value } = tagSchema.validate(req.body);
    if (error) {
      return errorResponse(res, new Error(error.details[0].message), 400);
    }

    const { name, color } = value;
    const tag = await tagService.createTag(name, color);
    createdResponse(res, tag, '创建标签成功');
  } catch (error) {
    next(error);
  }
};

const updateTag = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error, value } = tagSchema.validate(req.body);
    if (error) {
      return errorResponse(res, new Error(error.details[0].message), 400);
    }

    const { name, color } = value;
    const tag = await tagService.updateTag(id, name, color);
    successResponse(res, tag, '更新标签成功');
  } catch (error) {
    next(error);
  }
};

const deleteTag = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await tagService.deleteTag(id);
    successResponse(res, result, '删除标签成功');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTags,
  createTag,
  updateTag,
  deleteTag,
};
