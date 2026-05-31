const aiService = require('../services/aiService');
const { getAvailableModels } = require('../config/ai');
const prisma = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');
const {
  aiSummarizeSchema,
  aiOptimizeSchema,
  aiTagsSchema,
  aiChatSchema
} = require('../utils/validation');

async function summarize(req, res, next) {
  try {
    const { error, value } = aiSummarizeSchema.validate(req.body);
    if (error) {
      return errorResponse(res, new Error(error.details[0].message), 400);
    }

    const { content, maxLength, model } = value;
    const result = await aiService.summarize(content, { maxLength, model });

    await aiService.logUsage(
      req.user.id,
      'default',
      'SUMMARIZE',
      result.model,
      result.usage
    );

    successResponse(res, { summary: result.summary, model: result.model }, '摘要生成成功');
  } catch (error) {
    next(error);
  }
}

async function optimize(req, res, next) {
  try {
    const { error, value } = aiOptimizeSchema.validate(req.body);
    if (error) {
      return errorResponse(res, new Error(error.details[0].message), 400);
    }

    const { content, type, model } = value;
    const result = await aiService.optimize(content, type, { model });

    await aiService.logUsage(
      req.user.id,
      'default',
      'OPTIMIZE',
      result.model,
      result.usage
    );

    successResponse(res, {
      original: result.original,
      optimized: result.optimized,
      suggestions: result.suggestions,
      model: result.model
    }, '内容优化成功');
  } catch (error) {
    next(error);
  }
}

async function generateTags(req, res, next) {
  try {
    const { error, value } = aiTagsSchema.validate(req.body);
    if (error) {
      return errorResponse(res, new Error(error.details[0].message), 400);
    }

    const { title, content, maxTags, model } = value;
    const result = await aiService.generateTags(title, content, maxTags, { model });

    await aiService.logUsage(
      req.user.id,
      'default',
      'GENERATE_TAGS',
      result.model,
      result.usage
    );

    successResponse(res, { tags: result.tags, model: result.model }, '标签生成成功');
  } catch (error) {
    next(error);
  }
}

async function chat(req, res, next) {
  try {
    const { error, value } = aiChatSchema.validate(req.body);
    if (error) {
      return errorResponse(res, new Error(error.details[0].message), 400);
    }

    const { messages, contextDocumentIds = [], model, temperature } = value;

    let contextDocuments = [];
    if (contextDocumentIds.length > 0) {
      contextDocuments = await prisma.document.findMany({
        where: { id: { in: contextDocumentIds } },
        select: { id: true, title: true, content: true }
      });
    }

    const result = await aiService.chat(messages, contextDocuments, { model, temperature });

    await aiService.logUsage(
      req.user.id,
      'default',
      'CHAT',
      result.model,
      result.usage
    );

    successResponse(res, {
      message: result.message,
      model: result.model,
      citations: result.citations
    }, '对话成功');
  } catch (error) {
    next(error);
  }
}

async function getModels(req, res, next) {
  try {
    const models = getAvailableModels();
    successResponse(res, { models }, '获取模型列表成功');
  } catch (error) {
    next(error);
  }
}

async function getChatSessions(req, res, next) {
  try {
    const sessions = await aiService.getChatSessions(req.user.id);
    successResponse(res, { sessions }, '获取会话列表成功');
  } catch (error) {
    next(error);
  }
}

async function getChatSession(req, res, next) {
  try {
    const { sessionId } = req.params;
    const session = await aiService.getChatSession(sessionId, req.user.id);
    
    if (!session) {
      return errorResponse(res, new Error('会话不存在'), 404);
    }
    
    successResponse(res, { session }, '获取会话成功');
  } catch (error) {
    next(error);
  }
}

async function deleteChatSession(req, res, next) {
  try {
    const { sessionId } = req.params;
    
    const session = await prisma.aIChatSession.findFirst({
      where: { id: sessionId, userId: req.user.id }
    });
    
    if (!session) {
      return errorResponse(res, new Error('会话不存在'), 404);
    }
    
    await prisma.aIChatSession.delete({
      where: { id: sessionId }
    });
    
    successResponse(res, null, '删除会话成功');
  } catch (error) {
    next(error);
  }
}

module.exports = {
  summarize,
  optimize,
  generateTags,
  chat,
  getModels,
  getChatSessions,
  getChatSession,
  deleteChatSession
};
