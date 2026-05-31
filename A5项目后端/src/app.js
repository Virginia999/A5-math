require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/authRoutes');
const documentRoutes = require('./routes/documentRoutes');
const tagRoutes = require('./routes/tagRoutes');
const searchRoutes = require('./routes/searchRoutes');
const statsRoutes = require('./routes/statsRoutes');
const aiRoutes = require('./routes/aiRoutes');

// 新增路由
const ragRoutes = require('./routes/ragRoutes');
const knowledgeGraphRoutes = require('./routes/knowledgeGraphRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');
const collaborationRoutes = require('./routes/collaborationRoutes');
const contributionRoutes = require('./routes/contributionRoutes');

const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');

const app = express();

// 安全中间件
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  credentials: true,
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: '智慧知识库后端服务运行正常',
    version: '2.0.0',
    features: [
      'RAG检索增强生成',
      '知识图谱',
      '智能推荐',
      '协作编辑',
      '贡献度评估'
    ],
    timestamp: new Date().toISOString(),
  });
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/ai', aiRoutes);

// 新增API路由
app.use('/api/rag', ragRoutes);
app.use('/api/knowledge-graph', knowledgeGraphRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/collaboration', collaborationRoutes);
app.use('/api/contribution', contributionRoutes);

// 错误处理
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
