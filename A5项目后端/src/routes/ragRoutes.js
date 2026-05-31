/**
 * RAG路由定义
 */

const express = require('express');
const router = express.Router();
const ragController = require('../controllers/ragController');
const { authenticate, requireRole } = require('../middlewares/auth');

// 所有RAG路由需要认证
router.use(authenticate);

/**
 * @route POST /api/rag/query
 * @desc RAG智能问答
 * @access Private
 */
router.post('/query', ragController.ragQuery);

/**
 * @route POST /api/rag/retrieve
 * @desc RAG检索（仅检索不生成）
 * @access Private
 */
router.post('/retrieve', ragController.ragRetrieve);

/**
 * @route POST /api/rag/embed/:documentId
 * @desc 为单个文档生成嵌入向量
 * @access Private (需要编辑者或管理员权限)
 */
router.post('/embed/:documentId', requireRole(['ADMIN', 'EDITOR']), ragController.embedDocument);

/**
 * @route POST /api/rag/embed-batch
 * @desc 批量生成文档嵌入
 * @access Private (需要管理员权限)
 */
router.post('/embed-batch', requireRole(['ADMIN']), ragController.embedBatch);

/**
 * @route GET /api/rag/config
 * @desc 获取RAG配置信息
 * @access Private
 */
router.get('/config', ragController.getRAGConfig);

/**
 * @route POST /api/rag/similarity
 * @desc 计算两段文本的语义相似度
 * @access Private
 */
router.post('/similarity', ragController.calculateSimilarity);

module.exports = router;
