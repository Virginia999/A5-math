/**
 * 智慧知识库测试用例
 * 使用 Jest + Supertest 进行API测试
 */

const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/database');

// 测试用户Token
let authToken;
let adminToken;
let testDocumentId;

describe('智慧知识库API测试', () => {
  
  // ==================== 认证测试 ====================
  describe('认证接口', () => {
    
    test('用户注册 - 应该成功', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: '测试用户'
        });
      
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      authToken = res.body.data.token;
    });

    test('用户登录 - 应该成功', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });
      
      expect(res.statusCode).toBe(200);
      expect(res.body.data.token).toBeDefined();
    });

    test('获取当前用户 - 需要认证', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.data.email).toBe('test@example.com');
    });

    test('未认证请求 - 应返回401', async () => {
      const res = await request(app)
        .get('/api/auth/me');
      
      expect(res.statusCode).toBe(401);
    });

  });

  // ==================== 文档测试 ====================
  describe('文档接口', () => {
    
    test('创建文档 - 应该成功', async () => {
      const res = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '测试文档',
          content: '这是一个测试文档的内容，用于验证文档创建功能。',
          summary: '测试文档摘要',
          tags: ['测试', '技术']
        });
      
      expect(res.statusCode).toBe(200);
      expect(res.body.data.title).toBe('测试文档');
      testDocumentId = res.body.data.id;
    });

    test('获取文档列表', async () => {
      const res = await request(app)
        .get('/api/documents')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data.documents)).toBe(true);
    });

    test('获取文档详情', async () => {
      const res = await request(app)
        .get(`/api/documents/${testDocumentId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.data.title).toBe('测试文档');
    });

    test('更新文档', async () => {
      const res = await request(app)
        .put(`/api/documents/${testDocumentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '更新后的标题',
          content: '更新后的内容',
          tags: ['测试']
        });
      
      expect(res.statusCode).toBe(200);
      expect(res.body.data.title).toBe('更新后的标题');
    });

  });

  // ==================== RAG测试 ====================
  describe('RAG接口', () => {
    
    test('生成文档嵌入', async () => {
      const res = await request(app)
        .post(`/api/rag/embed/${testDocumentId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.data.chunkCount).toBeGreaterThan(0);
    });

    test('RAG检索', async () => {
      const res = await request(app)
        .post('/api/rag/retrieve')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: '测试文档',
          options: { topK: 5 }
        });
      
      expect(res.statusCode).toBe(200);
      expect(res.body.data.results).toBeDefined();
    });

    test('RAG智能问答', async () => {
      const res = await request(app)
        .post('/api/rag/query')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: '这个文档是什么内容？'
        });
      
      expect(res.statusCode).toBe(200);
      expect(res.body.data.answer).toBeDefined();
      expect(res.body.data.sources).toBeDefined();
    });

    test('计算语义相似度', async () => {
      const res = await request(app)
        .post('/api/rag/similarity')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          text1: '这是一个测试文本',
          text2: '这是另一个测试文本'
        });
      
      expect(res.statusCode).toBe(200);
      expect(res.body.data.similarity).toBeGreaterThanOrEqual(0);
      expect(res.body.data.similarity).toBeLessThanOrEqual(1);
    });

  });

  // ==================== 知识图谱测试 ====================
  describe('知识图谱接口', () => {
    
    test('构建知识图谱', async () => {
      const res = await request(app)
        .post(`/api/knowledge-graph/build/${testDocumentId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.data.nodes).toBeGreaterThanOrEqual(0);
    });

    test('获取知识图谱统计', async () => {
      const res = await request(app)
        .get('/api/knowledge-graph/stats')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.data.totalNodes).toBeDefined();
    });

    test('获取可视化数据', async () => {
      const res = await request(app)
        .get(`/api/knowledge-graph/visualize/${testDocumentId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.data.nodes).toBeDefined();
      expect(res.body.data.edges).toBeDefined();
    });

  });

  // ==================== 推荐测试 ====================
  describe('推荐接口', () => {
    
    test('获取个性化推荐', async () => {
      const res = await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data.recommendations)).toBe(true);
    });

    test('获取相似文档', async () => {
      const res = await request(app)
        .get(`/api/recommendations/similar/${testDocumentId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toBe(200);
    });

  });

  // ==================== 贡献度测试 ====================
  describe('贡献度接口', () => {
    
    test('获取我的贡献度', async () => {
      const res = await request(app)
        .get('/api/contribution/me')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.data.current).toBeDefined();
    });

    test('获取排行榜', async () => {
      const res = await request(app)
        .get('/api/contribution/leaderboard')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('获取用户徽章', async () => {
      const res = await request(app)
        .get('/api/contribution/badges')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

  });

  // ==================== AI测试 ====================
  describe('AI接口', () => {
    
    test('生成摘要', async () => {
      const res = await request(app)
        .post('/api/ai/summarize')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: '这是一段需要生成摘要的长文本内容。' .repeat(10),
          maxLength: 100
        });
      
      expect(res.statusCode).toBe(200);
      expect(res.body.data.summary).toBeDefined();
    });

    test('生成智能标签', async () => {
      const res = await request(app)
        .post('/api/ai/tags')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '人工智能技术发展',
          content: '人工智能是计算机科学的一个分支，旨在创建智能机器。'
        });
      
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data.tags)).toBe(true);
    });

  });

  // ==================== 搜索测试 ====================
  describe('搜索接口', () => {
    
    test('搜索文档', async () => {
      const res = await request(app)
        .get('/api/search')
        .query({ query: '测试' })
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.data.documents).toBeDefined();
    });

  });

  // ==================== 清理测试数据 ====================
  afterAll(async () => {
    // 清理测试数据
    if (testDocumentId) {
      await prisma.document.delete({
        where: { id: testDocumentId }
      }).catch(() => {});
    }
    
    await prisma.user.deleteMany({
      where: { email: 'test@example.com' }
    }).catch(() => {});
    
    await prisma.$disconnect();
  });

});

// ==================== 性能测试 ====================
describe('性能测试', () => {
  
  test('RAG检索响应时间应小于2秒', async () => {
    const start = Date.now();
    
    await request(app)
      .post('/api/rag/retrieve')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        query: '性能测试查询'
      });
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000);
  });

  test('文档列表响应时间应小于500毫秒', async () => {
    const start = Date.now();
    
    await request(app)
      .get('/api/documents')
      .set('Authorization', `Bearer ${authToken}`);
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(500);
  });

});
