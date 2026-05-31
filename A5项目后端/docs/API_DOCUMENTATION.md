# 智慧知识库 API 文档

## 基础信息

- **Base URL**: `http://localhost:3000/api`
- **认证方式**: Bearer Token (JWT)
- **Content-Type**: `application/json`

---

## 1. 认证接口

### 1.1 用户注册
```
POST /api/auth/register
```

**请求体**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "用户名"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "clxxx",
      "email": "user@example.com",
      "name": "用户名",
      "role": "USER"
    }
  },
  "message": "注册成功"
}
```

### 1.2 用户登录
```
POST /api/auth/login
```

**请求体**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### 1.3 获取当前用户
```
GET /api/auth/me
Authorization: Bearer <token>
```

---

## 2. 文档接口

### 2.1 获取文档列表
```
GET /api/documents?page=1&limit=10&tags=标签1,标签2
Authorization: Bearer <token>
```

### 2.2 获取文档详情
```
GET /api/documents/:id
Authorization: Bearer <token>
```

### 2.3 创建文档
```
POST /api/documents
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "title": "文档标题",
  "content": "文档内容...",
  "summary": "文档摘要",
  "tags": ["标签1", "标签2"]
}
```

### 2.4 更新文档
```
PUT /api/documents/:id
Authorization: Bearer <token>
```

### 2.5 删除文档
```
DELETE /api/documents/:id
Authorization: Bearer <token>
```

---

## 3. RAG检索增强生成接口

### 3.1 RAG智能问答
```
POST /api/rag/query
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "query": "如何使用RAG进行知识检索？",
  "options": {
    "topK": 5,
    "threshold": 0.7,
    "model": "gpt-3.5-turbo",
    "filters": {
      "tags": ["技术文档"]
    }
  }
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "answer": "RAG检索增强生成的工作原理是...",
    "sources": [
      {
        "documentId": "clxxx",
        "title": "RAG技术详解",
        "chunkContent": "RAG是...",
        "similarity": 0.89
      }
    ],
    "citations": [
      {
        "documentId": "clxxx",
        "title": "RAG技术详解"
      }
    ],
    "confidence": 0.85,
    "model": "gpt-3.5-turbo",
    "retrievalTime": 1250,
    "contextDocuments": 3
  },
  "message": "RAG问答完成"
}
```

### 3.2 RAG检索（仅检索）
```
POST /api/rag/retrieve
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "query": "知识图谱构建方法",
  "options": {
    "topK": 10,
    "threshold": 0.6
  }
}
```

### 3.3 生成文档嵌入
```
POST /api/rag/embed/:documentId
Authorization: Bearer <token>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "documentId": "clxxx",
    "chunkCount": 5,
    "dimension": 1536
  },
  "message": "文档嵌入生成完成"
}
```

### 3.4 批量生成嵌入
```
POST /api/rag/embed-batch
Authorization: Bearer <token>
```

### 3.5 计算语义相似度
```
POST /api/rag/similarity
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "text1": "这是一段文本",
  "text2": "这是另一段文本"
}
```

### 3.6 获取RAG配置
```
GET /api/rag/config
Authorization: Bearer <token>
```

---

## 4. 知识图谱接口

### 4.1 构建知识图谱
```
POST /api/knowledge-graph/build/:documentId
Authorization: Bearer <token>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "documentId": "clxxx",
    "nodes": 15,
    "relations": 23,
    "extractionResult": {
      "entities": [
        {"name": "RAG", "type": "CONCEPT", "description": "检索增强生成"}
      ],
      "relations": [
        {"source": "RAG", "target": "向量检索", "relation": "依赖"}
      ]
    }
  },
  "message": "知识图谱构建完成"
}
```

### 4.2 批量构建知识图谱
```
POST /api/knowledge-graph/build-batch
Authorization: Bearer <token>
```

### 4.3 查询相关概念
```
GET /api/knowledge-graph/concepts/:concept?depth=2
Authorization: Bearer <token>
```

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "concept": "RAG",
      "documentId": "clxxx",
      "nodeType": "CONCEPT",
      "depth": 0
    },
    {
      "concept": "向量检索",
      "documentId": "clxxx",
      "nodeType": "CONCEPT",
      "depth": 1
    }
  ],
  "message": "概念查询完成"
}
```

### 4.4 知识推理
```
POST /api/knowledge-graph/infer
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "startConcept": "RAG",
  "endConcept": "知识图谱"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "inferred": true,
    "paths": [
      [
        {"from": "RAG", "to": "向量检索", "relation": "依赖"},
        {"from": "向量检索", "to": "知识图谱", "relation": "相关"}
      ]
    ],
    "inference": "RAG通过向量检索与知识图谱相关联"
  },
  "message": "知识推理完成"
}
```

### 4.5 语义搜索
```
GET /api/knowledge-graph/search?query=人工智能&limit=10
Authorization: Bearer <token>
```

### 4.6 获取知识图谱统计
```
GET /api/knowledge-graph/stats
Authorization: Bearer <token>
```

### 4.7 获取可视化数据
```
GET /api/knowledge-graph/visualize/:documentId
Authorization: Bearer <token>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "nodes": [
      {"id": "n1", "label": "RAG", "type": "CONCEPT"}
    ],
    "edges": [
      {"id": "e1", "source": "n1", "target": "n2", "label": "依赖"}
    ]
  },
  "message": "获取可视化数据成功"
}
```

### 4.8 删除知识图谱
```
DELETE /api/knowledge-graph/:documentId
Authorization: Bearer <token>
```

---

## 5. 推荐系统接口

### 5.1 获取个性化推荐
```
GET /api/recommendations?limit=10&sources=content,collaborative,knowledge_graph
Authorization: Bearer <token>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "documentId": "clxxx",
        "title": "RAG技术详解",
        "score": 0.92,
        "reason": "与您感兴趣的内容相似",
        "sources": ["content", "knowledge_graph"]
      }
    ],
    "config": {
      "contentBasedWeight": 0.4,
      "collaborativeWeight": 0.3,
      "kgWeight": 0.3
    }
  },
  "message": "获取推荐成功"
}
```

### 5.2 获取相似文档
```
GET /api/recommendations/similar/:documentId?limit=5
Authorization: Bearer <token>
```

### 5.3 获取推荐配置
```
GET /api/recommendations/config
Authorization: Bearer <token>
```

---

## 6. 协作编辑接口

### 6.1 邀请协作者
```
POST /api/collaboration/invite
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "documentId": "clxxx",
  "inviteeId": "user-id",
  "role": "EDITOR"
}
```

### 6.2 接受邀请
```
POST /api/collaboration/accept
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "documentId": "clxxx"
}
```

### 6.3 拒绝邀请
```
POST /api/collaboration/reject
Authorization: Bearer <token>
```

### 6.4 获取文档协作者
```
GET /api/collaboration/collaborators/:documentId
Authorization: Bearer <token>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "owner": {
      "id": "u1",
      "name": "作者"
    },
    "collaborators": [
      {
        "id": "u2",
        "name": "协作者1",
        "role": "EDITOR",
        "lastActiveAt": "2024-01-15T10:00:00Z"
      }
    ]
  },
  "message": "获取协作者成功"
}
```

### 6.5 获取待处理邀请
```
GET /api/collaboration/invitations
Authorization: Bearer <token>
```

### 6.6 开始协作会话
```
POST /api/collaboration/session/start
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "documentId": "clxxx"
}
```

### 6.7 结束协作会话
```
POST /api/collaboration/session/end
Authorization: Bearer <token>
```

### 6.8 更新光标位置
```
POST /api/collaboration/cursor
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "sessionId": "session-id",
  "position": 100,
  "selection": "选中的文本"
}
```

### 6.9 记录编辑操作
```
POST /api/collaboration/operation
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "sessionId": "session-id",
  "operation": {
    "type": "insert",
    "position": 50,
    "content": "插入的文本",
    "version": 3
  }
}
```

### 6.10 获取活跃协作者
```
GET /api/collaboration/active/:documentId
Authorization: Bearer <token>
```

### 6.11 移除协作者
```
DELETE /api/collaboration/:documentId/:userId
Authorization: Bearer <token>
```

### 6.12 获取我的协作文档
```
GET /api/collaboration/my-documents
Authorization: Bearer <token>
```

---

## 7. 贡献度接口

### 7.1 获取我的贡献度
```
GET /api/contribution/me
Authorization: Bearer <token>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "current": {
      "period": "2024-01",
      "documentsCreated": 5,
      "documentsEdited": 12,
      "commentsWritten": 8,
      "totalScore": 126,
      "rank": 3
    },
    "total": {
      "documentsCreated": 25,
      "totalScore": 580
    },
    "rank": 3
  },
  "message": "获取贡献度成功"
}
```

### 7.2 获取排行榜
```
GET /api/contribution/leaderboard?period=2024-01&limit=10
Authorization: Bearer <token>
```

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "rank": 1,
      "user": {
        "id": "u1",
        "name": "用户A"
      },
      "totalScore": 256,
      "documentsCreated": 15
    }
  ],
  "message": "获取排行榜成功"
}
```

### 7.3 获取贡献趋势
```
GET /api/contribution/trend?months=6
Authorization: Bearer <token>
```

### 7.4 获取用户徽章
```
GET /api/contribution/badges
Authorization: Bearer <token>
```

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "name": "知识专家",
      "icon": "🥇",
      "description": "创建20+文档",
      "level": 2
    },
    {
      "name": "月度之星",
      "icon": "⭐",
      "description": "本月排名前3",
      "level": 2
    }
  ],
  "message": "获取徽章成功"
}
```

---

## 8. AI接口

### 8.1 生成摘要
```
POST /api/ai/summarize
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "content": "需要生成摘要的内容...",
  "maxLength": 200,
  "model": "gpt-3.5-turbo"
}
```

### 8.2 内容优化
```
POST /api/ai/optimize
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "content": "需要优化的内容...",
  "type": "rewrite"
}
```

**type可选值**: `rewrite` | `expand` | `simplify` | `formalize`

### 8.3 生成智能标签
```
POST /api/ai/tags
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "title": "文档标题",
  "content": "文档内容...",
  "maxTags": 5
}
```

### 8.4 知识库对话
```
POST /api/ai/chat
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "messages": [
    {"role": "user", "content": "你好"}
  ],
  "contextDocuments": ["doc-id-1", "doc-id-2"],
  "model": "gpt-3.5-turbo"
}
```

### 8.5 获取可用模型
```
GET /api/ai/models
Authorization: Bearer <token>
```

---

## 9. 统计接口

### 9.1 获取统计数据
```
GET /api/stats
Authorization: Bearer <token>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "totalDocuments": 150,
    "totalUsers": 45,
    "totalViews": 3500,
    "popularDocuments": [...],
    "recentDocuments": [...],
    "tagStats": [...],
    "aiUsageStats": {
      "totalQueries": 500,
      "totalTokens": 150000
    }
  },
  "message": "获取统计数据成功"
}
```

---

## 10. 搜索接口

### 10.1 搜索文档
```
GET /api/search?query=关键词&tags=标签1,标签2&page=1&limit=10
Authorization: Bearer <token>
```

---

## 错误码说明

| 错误码 | 说明 |
|--------|------|
| 400 | 请求参数错误 |
| 401 | 未授权（未登录或Token过期） |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 409 | 资源冲突 |
| 500 | 服务器内部错误 |

---

## WebSocket事件（协作编辑）

### 连接
```
ws://localhost:3000/collaboration/:documentId
```

### 事件

| 事件 | 方向 | 说明 |
|------|------|------|
| `join` | 客户端→服务器 | 加入协作 |
| `cursor` | 客户端→服务器 | 光标移动 |
| `edit` | 客户端→服务器 | 编辑操作 |
| `sync` | 服务器→客户端 | 同步状态 |
| `user_joined` | 服务器→客户端 | 用户加入 |
| `user_left` | 服务器→客户端 | 用户离开 |

---

文档版本: v2.0.0
