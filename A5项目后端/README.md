# 智慧知识库后端

<div align="center">

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)
![License](https://img.shields.io/badge/license-MIT-orange.svg)

**一个基于人工智能技术的企业级知识管理平台**

*大学生软件设计大赛参赛作品*

</div>

---

## 📖 项目简介

智慧知识库是一个集成多项前沿AI技术的知识管理平台，旨在帮助组织高效管理、检索和利用知识资源。本项目融合了RAG检索增强生成、知识图谱、智能推荐等创新技术，为用户提供智能化的知识服务。

## ✨ 核心功能

### 🔥 技术创新功能

| 功能 | 描述 | 技术亮点 |
|------|------|----------|
| **RAG智能问答** | 基于检索增强生成的智能问答 | 混合检索、引用溯源、置信度评估 |
| **知识图谱** | 自动构建知识图谱，支持推理 | 实体抽取、关系推理、可视化 |
| **语义搜索** | 基于向量相似度的语义搜索 | 向量嵌入、混合检索、重排序 |

### 🌟 竞赛加分功能

| 功能 | 描述 | 价值 |
|------|------|------|
| **智能推荐** | 个性化知识推荐 | 混合推荐算法、可解释性 |
| **协作编辑** | 多人实时协作编辑 | 实时同步、权限管理 |
| **贡献评估** | 知识贡献度评估与激励 | 多维度评估、排行榜、徽章 |

### 📦 基础功能

- 📝 文档管理：创建、编辑、版本控制
- 🔍 全文搜索：关键词搜索、标签筛选
- 🏷️ 标签管理：分类标签、智能标签推荐
- 📊 统计分析：使用统计、热门文档排行
- 🔐 权限管理：角色权限、访问控制

## 🏗️ 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                      前端应用 (React)                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     API网关 (Express.js)                     │
│              JWT认证 │ 限流 │ 日志 │ 错误处理                  │
└─────────────────────────────────────────────────────────────┘
                              │
    ┌─────────────┬───────────┼───────────┬─────────────┐
    ▼             ▼           ▼           ▼             ▼
┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐
│ 文档   │  │  RAG   │  │ 知识   │  │ 推荐   │  │ 协作   │
│ 服务   │  │ 服务   │ │ 图谱   │  │ 服务   │  │ 服务   │
└────────┘  └────────┘  └────────┘  └────────┘  └────────┘
    │             │           │           │             │
    └─────────────┴───────────┼───────────┴─────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      数据存储层                              │
│   PostgreSQL + pgvector  │  Redis  │  文件存储              │
└─────────────────────────────────────────────────────────────┘
```

## 🛠️ 技术栈

| 类别 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 运行时 | Node.js | ≥18 | 高性能JavaScript运行时 |
| Web框架 | Express.js | 4.18 | 灵活的Web框架 |
| 数据库 | PostgreSQL | ≥15 | 支持pgvector扩展 |
| ORM | Prisma | 5.x | 类型安全的数据库操作 |
| 认证 | JWT | - | 无状态认证 |
| AI集成 | OpenAI SDK | 4.x | 多模型支持 |
| 缓存 | Redis | 7.x | 可选，用于缓存 |
| 实时通信 | WebSocket | - | 协作编辑 |

## 📁 项目结构

```
.
├── prisma/
│   └── schema.prisma          # 数据模型定义
├── src/
│   ├── config/                # 配置文件
│   │   ├── database.js        # 数据库配置
│   │   ├── ai.js              # AI配置
│   │   └── vectorDatabase.js  # 向量数据库配置
│   ├── controllers/           # 控制器层
│   │   ├── ragController.js   # RAG控制器
│   │   ├── knowledgeGraphController.js
│   │   ├── recommendationController.js
│   │   ├── collaborationController.js
│   │   └── contributionController.js
│   ├── services/              # 服务层
│   │   ├── ragService.js      # RAG服务
│   │   ├── embeddingService.js
│   │   ├── knowledgeGraphService.js
│   │   ├── recommendationService.js
│   │   ├── collaborationService.js
│   │   └── contributionService.js
│   ├── routes/                # 路由层
│   ├── middlewares/           # 中间件
│   ├── utils/                 # 工具函数
│   ├── app.js                 # Express应用配置
│   └── index.js               # 应用入口
├── docs/                      # 文档
│   ├── SYSTEM_DESIGN.md       # 系统设计文档
│   ├── API_DOCUMENTATION.md   # API文档
│   ├── DEPLOYMENT.md          # 部署文档
│   ├── TECHNICAL_HIGHLIGHTS.md
│   └── DEMO_SCRIPT.md         # 演示脚本
├── tests/                     # 测试用例
├── .env.example               # 环境变量示例
└── package.json
```

## 🚀 快速开始

### 1. 环境要求

- Node.js ≥ 18
- PostgreSQL ≥ 15 (需安装pgvector扩展)
- Redis ≥ 6 (可选)

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置必要参数：

```env
# 数据库
DATABASE_URL="postgresql://user:password@localhost:5432/knowledge_base?schema=public"

# JWT
JWT_SECRET="your-secret-key"

# AI
OPENAI_API_KEY="your-api-key"
```

### 4. 初始化数据库

```bash
# 生成Prisma Client
npm run db:generate

# 推送数据库架构
npm run db:push
```

### 5. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

服务将在 `http://localhost:3000` 启动。

## 📚 API文档

### 核心API

| 模块 | 方法 | 路径 | 说明 |
|------|------|------|------|
| RAG | POST | /api/rag/query | RAG智能问答 |
| RAG | POST | /api/rag/retrieve | RAG检索 |
| KG | POST | /api/knowledge-graph/build/:id | 构建知识图谱 |
| KG | GET | /api/knowledge-graph/search | 语义搜索 |
| REC | GET | /api/recommendations | 获取推荐 |
| COL | POST | /api/collaboration/invite | 邀请协作 |
| CON | GET | /api/contribution/me | 获取贡献度 |

详细API文档请参考 [API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md)

## 📖 文档

- [系统设计文档](docs/SYSTEM_DESIGN.md)
- [API文档](docs/API_DOCUMENTATION.md)
- [部署文档](docs/DEPLOYMENT.md)
- [技术亮点说明](docs/TECHNICAL_HIGHLIGHTS.md)
- [演示脚本](docs/DEMO_SCRIPT.md)

## 🧪 测试

```bash
# 运行测试
npm test

# 测试覆盖率
npm run test:coverage
```

## 🔧 开发命令

```bash
npm run dev          # 开发模式
npm start            # 生产模式
npm run db:generate  # 生成Prisma Client
npm run db:push      # 推送数据库架构
npm run db:migrate   # 数据库迁移
npm run db:studio    # 打开Prisma Studio
npm run lint         # 代码检查
```

## 🌟 技术亮点

### 1. RAG检索增强生成
- 混合检索策略（向量+关键词）
- 智能重排序
- 引用溯源
- 置信度评估

### 2. 知识图谱构建
- 自动实体抽取
- 关系推理
- 可视化展示
- 语义搜索

### 3. 混合推荐系统
- 内容推荐 + 协同过滤 + 知识图谱
- 可解释推荐
- 冷启动处理

### 4. 实时协作编辑
- 多人实时同步
- 细粒度权限
- 操作历史

### 5. 知识贡献评估
- 多维度评估
- 排行榜激励
- 成就徽章

## 📄 许可证

MIT License

---

<div align="center">

**智慧知识库 - 让知识更智能**

*大学生软件设计大赛参赛作品*

</div>
