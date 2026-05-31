const Joi = require('joi');

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  name: Joi.string().min(2).max(50).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const documentSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  content: Joi.string().min(1).required(),
  summary: Joi.string().max(500).allow(''),
  tags: Joi.array().items(Joi.string()).default([]),
});

const tagSchema = Joi.object({
  name: Joi.string().min(1).max(50).required(),
  color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).allow(''),
});

const searchSchema = Joi.object({
  query: Joi.string().required(),
  tags: Joi.array().items(Joi.string()).optional(),
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(10),
});

const aiSummarizeSchema = Joi.object({
  content: Joi.string().min(1).required(),
  maxLength: Joi.number().min(50).max(2000).default(500),
  model: Joi.string().optional(),
});

const aiOptimizeSchema = Joi.object({
  content: Joi.string().min(1).required(),
  type: Joi.string().valid('rewrite', 'expand', 'simplify', 'formalize').default('rewrite'),
  model: Joi.string().optional(),
});

const aiTagsSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  content: Joi.string().min(1).required(),
  maxTags: Joi.number().min(1).max(20).default(5),
  model: Joi.string().optional(),
});

const aiChatSchema = Joi.object({
  messages: Joi.array().items(
    Joi.object({
      role: Joi.string().valid('user', 'assistant', 'system').required(),
      content: Joi.string().min(1).required(),
    })
  ).min(1).required(),
  contextDocumentIds: Joi.array().items(Joi.string()).optional(),
  model: Joi.string().optional(),
  temperature: Joi.number().min(0).max(2).optional(),
});

module.exports = {
  registerSchema,
  loginSchema,
  documentSchema,
  tagSchema,
  searchSchema,
  aiSummarizeSchema,
  aiOptimizeSchema,
  aiTagsSchema,
  aiChatSchema,
};
