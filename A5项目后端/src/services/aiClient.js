const OpenAI = require('openai');
const { getActiveConfig, REQUEST_TIMEOUT } = require('../config/ai');

class AIClient {
  constructor() {
    this.client = null;
    this.config = null;
  }

  async init() {
    this.config = await getActiveConfig();
    
    if (this.config.provider === 'openai' || this.config.provider === 'qwen') {
      this.client = new OpenAI({
        apiKey: this.config.apiKey,
        baseURL: this.config.baseUrl,
        timeout: REQUEST_TIMEOUT
      });
    } else if (this.config.provider === 'claude') {
      this.client = {
        provider: 'claude',
        apiKey: this.config.apiKey,
        baseUrl: this.config.baseUrl
      };
    } else {
      throw new Error(`Unsupported provider: ${this.config.provider}`);
    }
  }

  async ensureClient() {
    if (!this.client) {
      await this.init();
    }
  }

  async chat(messages, options = {}) {
    await this.ensureClient();
    
    const model = options.model || this.config.defaultModel;
    const temperature = options.temperature ?? 0.7;
    const maxTokens = options.maxTokens;

    if (this.config.provider === 'openai' || this.config.provider === 'qwen') {
      const response = await this.client.chat.completions.create({
        model,
        messages,
        temperature,
        ...(maxTokens && { max_tokens: maxTokens })
      });

      return {
        content: response.choices[0].message.content,
        model: response.model,
        usage: {
          promptTokens: response.usage?.prompt_tokens,
          completionTokens: response.usage?.completion_tokens,
          totalTokens: response.usage?.total_tokens
        }
      };
    } else if (this.config.provider === 'claude') {
      const axios = require('axios');
      const response = await axios.post(
        `${this.config.baseUrl}/messages`,
        {
          model,
          messages: messages.map(m => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content
          })),
          max_tokens: maxTokens || 4096,
          temperature
        },
        {
          headers: {
            'x-api-key': this.config.apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          },
          timeout: REQUEST_TIMEOUT
        }
      );

      return {
        content: response.data.content[0].text,
        model: response.data.model,
        usage: {
          promptTokens: response.data.usage?.input_tokens,
          completionTokens: response.data.usage?.output_tokens,
          totalTokens: (response.data.usage?.input_tokens || 0) + (response.data.usage?.output_tokens || 0)
        }
      };
    }

    throw new Error(`Unsupported provider: ${this.config.provider}`);
  }
}

const aiClient = new AIClient();

module.exports = aiClient;
