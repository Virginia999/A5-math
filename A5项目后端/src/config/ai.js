const prisma = require('./database');

const AI_CONFIGS = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    baseUrl: process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1',
    defaultModel: process.env.OPENAI_DEFAULT_MODEL || 'gpt-3.5-turbo',
    models: [
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', type: 'text', contextWindow: 16384 },
      { id: 'gpt-4', name: 'GPT-4', type: 'text', contextWindow: 8192 },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', type: 'text', contextWindow: 128000 },
    ]
  },
  qwen: {
    apiKey: process.env.QWEN_API_KEY,
    baseUrl: process.env.QWEN_API_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: process.env.QWEN_DEFAULT_MODEL || 'qwen-turbo',
    models: [
      { id: 'qwen-turbo', name: 'Qwen Turbo', type: 'text', contextWindow: 8000 },
      { id: 'qwen-plus', name: 'Qwen Plus', type: 'text', contextWindow: 32000 },
      { id: 'qwen-max', name: 'Qwen Max', type: 'text', contextWindow: 32000 },
    ]
  },
  claude: {
    apiKey: process.env.CLAUDE_API_KEY,
    baseUrl: process.env.CLAUDE_API_BASE_URL || 'https://api.anthropic.com/v1',
    defaultModel: process.env.CLAUDE_DEFAULT_MODEL || 'claude-3-haiku-20240307',
    models: [
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', type: 'text', contextWindow: 200000 },
      { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', type: 'text', contextWindow: 200000 },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', type: 'text', contextWindow: 200000 },
    ]
  }
};

const DEFAULT_PROVIDER = process.env.AI_DEFAULT_PROVIDER || 'openai';
const REQUEST_TIMEOUT = parseInt(process.env.AI_REQUEST_TIMEOUT) || 30000;

async function getActiveConfig() {
  const dbConfig = await prisma.aIProviderConfig.findFirst({
    where: { isActive: true }
  });

  if (dbConfig) {
    return {
      provider: dbConfig.provider.toLowerCase(),
      apiKey: dbConfig.apiKey,
      baseUrl: dbConfig.baseUrl,
      defaultModel: dbConfig.defaultModel,
      models: AI_CONFIGS[dbConfig.provider.toLowerCase()]?.models || []
    };
  }

  const envProvider = AI_CONFIGS[DEFAULT_PROVIDER];
  if (envProvider?.apiKey) {
    return {
      provider: DEFAULT_PROVIDER,
      apiKey: envProvider.apiKey,
      baseUrl: envProvider.baseUrl,
      defaultModel: envProvider.defaultModel,
      models: envProvider.models
    };
  }

  throw new Error('No active AI provider configured');
}

function getAvailableModels() {
  const allModels = [];
  Object.entries(AI_CONFIGS).forEach(([provider, config]) => {
    if (config.apiKey) {
      config.models.forEach(model => {
        allModels.push({
          ...model,
          provider
        });
      });
    }
  });
  return allModels;
}

module.exports = {
  AI_CONFIGS,
  DEFAULT_PROVIDER,
  REQUEST_TIMEOUT,
  getActiveConfig,
  getAvailableModels
};
