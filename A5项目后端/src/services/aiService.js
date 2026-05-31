const aiClient = require('./aiClient');
const prisma = require('../config/database');

function calculateCost(promptTokens, completionTokens, model) {
  const costPer1K = {
    'gpt-3.5-turbo': { prompt: 0.0015, completion: 0.002 },
    'gpt-4': { prompt: 0.03, completion: 0.06 },
    'gpt-4-turbo': { prompt: 0.01, completion: 0.03 },
    'qwen-turbo': { prompt: 0.0008, completion: 0.002 },
    'qwen-plus': { prompt: 0.004, completion: 0.012 },
    'qwen-max': { prompt: 0.04, completion: 0.12 },
    'claude-3-haiku-20240307': { prompt: 0.00025, completion: 0.00125 },
    'claude-3-sonnet-20240229': { prompt: 0.003, completion: 0.015 },
    'claude-3-opus-20240229': { prompt: 0.015, completion: 0.075 }
  };

  const modelCost = costPer1K[model] || { prompt: 0.0015, completion: 0.002 };
  return (
    (promptTokens / 1000) * modelCost.prompt +
    (completionTokens / 1000) * modelCost.completion
  );
}

async function logUsage(userId, configId, actionType, model, usage) {
  const cost = calculateCost(usage.promptTokens || 0, usage.completionTokens || 0, model);
  
  return prisma.aIUsageLog.create({
    data: {
      userId,
      configId,
      actionType,
      model,
      promptTokens: usage.promptTokens || 0,
      completionTokens: usage.completionTokens || 0,
      cost
    }
  });
}

async function summarize(content, options = {}) {
  const maxLength = options.maxLength || 500;
  const model = options.model;
  
  const messages = [
    {
      role: 'system',
      content: '你是一个专业的内容摘要助手。请为用户提供的内容生成简洁、准确的摘要。'
    },
    {
      role: 'user',
      content: `请为以下内容生成不超过 ${maxLength} 字的摘要：\n\n${content}`
    }
  ];

  const response = await aiClient.chat(messages, { model, maxTokens: maxLength + 200 });
  
  return {
    summary: response.content,
    model: response.model,
    usage: response.usage
  };
}

async function optimize(content, type = 'rewrite', options = {}) {
  const model = options.model;
  
  const typeInstructions = {
    rewrite: '重新组织和润色这段内容，使其更加流畅易读',
    expand: '扩展并丰富这段内容，增加更多细节和解释',
    simplify: '简化这段内容，使其更容易理解',
    formalize: '将这段内容改写为更加正式和专业的风格'
  };

  const instruction = typeInstructions[type] || typeInstructions.rewrite;

  const messages = [
    {
      role: 'system',
      content: '你是一个专业的内容优化助手。请按照要求优化用户提供的内容，并给出改进建议。'
    },
    {
      role: 'user',
      content: `${instruction}：\n\n${content}\n\n请输出优化后的内容，并给出3-5条简短的改进建议。格式要求：\n【优化后的内容】\n...\n\n【改进建议】\n1. ...\n2. ...`
    }
  ];

  const response = await aiClient.chat(messages, { model });
  
  const contentMatch = response.content.match(/【优化后的内容】\s*([\s\S]*?)\s*【改进建议】/);
  const suggestionsMatch = response.content.match(/【改进建议】\s*([\s\S]*)/);
  
  const optimized = contentMatch ? contentMatch[1].trim() : response.content;
  const suggestionsText = suggestionsMatch ? suggestionsMatch[1].trim() : '';
  const suggestions = suggestionsText
    .split('\n')
    .map(s => s.replace(/^\d+\.\s*/, '').trim())
    .filter(s => s.length > 0);

  return {
    original: content,
    optimized,
    suggestions,
    model: response.model,
    usage: response.usage
  };
}

async function generateTags(title, content, maxTags = 5, options = {}) {
  const model = options.model;
  
  const messages = [
    {
      role: 'system',
      content: '你是一个智能的标签生成助手。请为给定的文档生成合适的标签。'
    },
    {
      role: 'user',
      content: `请为以下文档生成最多 ${maxTags} 个标签，用逗号分隔：\n\n标题：${title}\n\n内容：${content}`
    }
  ];

  const response = await aiClient.chat(messages, { model, temperature: 0.5 });
  
  const tags = response.content
    .split(/[,，]/)
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0)
    .slice(0, maxTags);

  return {
    tags,
    model: response.model,
    usage: response.usage
  };
}

async function chat(messages, contextDocuments = [], options = {}) {
  const model = options.model;
  const temperature = options.temperature ?? 0.7;
  
  let systemPrompt = '你是一个知识渊博的智能助手，基于知识库中的内容为用户提供帮助。';
  
  if (contextDocuments.length > 0) {
    const contextText = contextDocuments.map(doc => 
      `【文档${doc.id}】标题：${doc.title}\n内容：${doc.content.substring(0, 1000)}`
    ).join('\n\n');
    
    systemPrompt += `\n\n请参考以下知识库文档来回答问题：\n\n${contextText}`;
  }

  const finalMessages = [
    { role: 'system', content: systemPrompt },
    ...messages
  ];

  const response = await aiClient.chat(finalMessages, { model, temperature });
  
  return {
    message: response.content,
    model: response.model,
    usage: response.usage,
    citations: contextDocuments.map(doc => ({ documentId: doc.id, title: doc.title }))
  };
}

async function saveChatSession(userId, title, messages, model) {
  let session;
  
  session = await prisma.aIChatSession.create({
    data: {
      userId,
      title,
    }
  });

  for (const msg of messages) {
    await prisma.aIChatMessage.create({
      data: {
        sessionId: session.id,
        role: msg.role.toUpperCase(),
        content: msg.content,
        model: msg.model || model,
        promptTokens: msg.usage?.promptTokens,
        completionTokens: msg.usage?.completionTokens
      }
    });
  }

  return session;
}

async function getChatSessions(userId) {
  return prisma.aIChatSession.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        take: 1
      }
    }
  });
}

async function getChatSession(sessionId, userId) {
  return prisma.aIChatSession.findFirst({
    where: { id: sessionId, userId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' }
      }
    }
  });
}

module.exports = {
  summarize,
  optimize,
  generateTags,
  chat,
  logUsage,
  saveChatSession,
  getChatSessions,
  getChatSession
};
