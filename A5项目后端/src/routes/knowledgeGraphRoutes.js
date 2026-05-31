/**
 * 知识图谱路由定义
 */

const express = require('express');
const router = express.Router();
const kgController = require('../controllers/knowledgeGraphController');
const { authenticate, requireRole } = require('../middlewares/auth');

// 所有知识图谱路由需要认证
router.use(authenticate);

/**
 * @route POST /api/knowledge-graph/build/:documentId
 * @desc 为文档构建知识图谱
 * @access Private (需要编辑者或管理员权限)
 */
router.post('/build/:documentId', requireRole(['ADMIN', 'EDITOR']), kgController.buildKnowledgeGraph);

/**
 * @route POST /api/knowledge-graph/build-batch
 * @desc 批量构建知识图谱
 * @access Private (需要管理员权限)
 */
router.post('/build-batch', requireRole(['ADMIN']), kgController.buildBatch);

/**
 * @route GET /api/knowledge-graph/concepts/:concept
 * @desc 查询相关概念
 * @access Private
 */
router.get('/concepts/:concept', kgController.queryConcepts);

/**
 * @route POST /api/knowledge-graph/infer
 * @desc 知识推理
 * @access Private
 */
router.post('/infer', kgController.inferRelation);

/**
 * @route GET /api/knowledge-graph/search
 * @desc 语义搜索
 * @access Private
 */
router.get('/search', kgController.semanticSearch);

/**
 * @route GET /api/knowledge-graph/stats
 * @desc 获取知识图谱统计信息
 * @access Private
 */
router.get('/stats', kgController.getStats);

/**
 * @route GET /api/knowledge-graph/visualize/:documentId
 * @desc 获取文档知识图谱可视化数据
 * @access Private
 */
router.get('/visualize/:documentId', kgController.getVisualization);

/**
 * @route DELETE /api/knowledge-graph/:documentId
 * @desc 删除文档的知识图谱
 * @access Private (需要管理员权限)
 */
router.delete('/:documentId', requireRole(['ADMIN']), kgController.deleteKnowledgeGraph);

module.exports = router;
