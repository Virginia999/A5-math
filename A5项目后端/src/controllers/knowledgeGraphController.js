/**
 * 知识图谱控制器
 */

const knowledgeGraphService = require('../services/knowledgeGraphService');
const prisma = require('../config/database');
const { success, error } = require('../utils/response');

/**
 * 为文档构建知识图谱
 * POST /api/knowledge-graph/build/:documentId
 */
const buildKnowledgeGraph = async (req, res) => {
  try {
    const { documentId } = req.params;

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { id: true, title: true, content: true }
    });

    if (!document) {
      return res.status(404).json(error('文档不存在'));
    }

    const result = await knowledgeGraphService.extractKnowledge(
      document.id,
      document.title,
      document.content
    );

    res.json(success(result, '知识图谱构建完成'));
  } catch (err) {
    console.error('知识图谱构建错误:', err);
    res.status(500).json(error('知识图谱构建失败: ' + err.message));
  }
};

/**
 * 批量构建知识图谱
 * POST /api/knowledge-graph/build-batch
 */
const buildBatch = async (req, res) => {
  try {
    const documents = await prisma.document.findMany({
      select: { id: true, title: true, content: true }
    });

    const results = [];
    for (const doc of documents) {
      try {
        const result = await knowledgeGraphService.extractKnowledge(
          doc.id,
          doc.title,
          doc.content
        );
        results.push(result);
      } catch (err) {
        results.push({ documentId: doc.id, error: err.message });
      }
    }

    res.json(success({
      total: documents.length,
      processed: results.length,
      results
    }, '批量知识图谱构建完成'));
  } catch (err) {
    console.error('批量构建错误:', err);
    res.status(500).json(error('批量构建失败: ' + err.message));
  }
};

/**
 * 查询相关概念
 * GET /api/knowledge-graph/concepts/:concept
 */
const queryConcepts = async (req, res) => {
  try {
    const { concept } = req.params;
    const { depth = 2 } = req.query;

    const results = await knowledgeGraphService.queryRelatedConcepts(
      concept,
      parseInt(depth)
    );

    res.json(success(results, '概念查询完成'));
  } catch (err) {
    console.error('概念查询错误:', err);
    res.status(500).json(error('概念查询失败: ' + err.message));
  }
};

/**
 * 知识推理
 * POST /api/knowledge-graph/infer
 */
const inferRelation = async (req, res) => {
  try {
    const { startConcept, endConcept } = req.body;

    if (!startConcept || !endConcept) {
      return res.status(400).json(error('需要提供起始和目标概念'));
    }

    const result = await knowledgeGraphService.inferRelation(
      startConcept,
      endConcept
    );

    res.json(success(result, '知识推理完成'));
  } catch (err) {
    console.error('知识推理错误:', err);
    res.status(500).json(error('知识推理失败: ' + err.message));
  }
};

/**
 * 语义搜索
 * GET /api/knowledge-graph/search
 */
const semanticSearch = async (req, res) => {
  try {
    const { query, limit = 10 } = req.query;

    if (!query) {
      return res.status(400).json(error('需要提供查询内容'));
    }

    const results = await knowledgeGraphService.semanticSearch(
      query,
      parseInt(limit)
    );

    res.json(success({
      query,
      results,
      total: results.length
    }, '语义搜索完成'));
  } catch (err) {
    console.error('语义搜索错误:', err);
    res.status(500).json(error('语义搜索失败: ' + err.message));
  }
};

/**
 * 获取知识图谱统计信息
 * GET /api/knowledge-graph/stats
 */
const getStats = async (req, res) => {
  try {
    const stats = await knowledgeGraphService.getStats();
    res.json(success(stats, '获取统计信息成功'));
  } catch (err) {
    console.error('获取统计错误:', err);
    res.status(500).json(error('获取统计信息失败: ' + err.message));
  }
};

/**
 * 获取文档知识图谱可视化数据
 * GET /api/knowledge-graph/visualize/:documentId
 */
const getVisualization = async (req, res) => {
  try {
    const { documentId } = req.params;

    const data = await knowledgeGraphService.getVisualizationData(documentId);
    res.json(success(data, '获取可视化数据成功'));
  } catch (err) {
    console.error('获取可视化数据错误:', err);
    res.status(500).json(error('获取可视化数据失败: ' + err.message));
  }
};

/**
 * 删除文档的知识图谱
 * DELETE /api/knowledge-graph/:documentId
 */
const deleteKnowledgeGraph = async (req, res) => {
  try {
    const { documentId } = req.params;

    // 删除相关关系
    await prisma.knowledgeRelation.deleteMany({
      where: {
        OR: [
          { sourceNode: { documentId } },
          { targetNode: { documentId } }
        ]
      }
    });

    // 删除节点
    await prisma.knowledgeNode.deleteMany({
      where: { documentId }
    });

    res.json(success({ documentId }, '知识图谱删除成功'));
  } catch (err) {
    console.error('删除知识图谱错误:', err);
    res.status(500).json(error('删除知识图谱失败: ' + err.message));
  }
};

module.exports = {
  buildKnowledgeGraph,
  buildBatch,
  queryConcepts,
  inferRelation,
  semanticSearch,
  getStats,
  getVisualization,
  deleteKnowledgeGraph
};
