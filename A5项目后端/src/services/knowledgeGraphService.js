/**
 * 知识图谱服务
 * 从文档中提取实体和关系，构建知识图谱
 * 支持知识推理和语义搜索
 */

const aiClient = require('./aiClient');
const prisma = require('../config/database');
const embeddingService = require('./embeddingService');

class KnowledgeGraphService {
  constructor() {
    this.maxNodesPerDocument = parseInt(process.env.KG_MAX_NODES) || 20;
    this.maxRelationsPerNode = parseInt(process.env.KG_MAX_RELATIONS) || 10;
    this.confidenceThreshold = parseFloat(process.env.KG_CONFIDENCE_THRESHOLD) || 0.6;
  }

  /**
   * 从文档中提取知识节点和关系
   * @param {string} documentId - 文档ID
   * @param {string} title - 文档标题
   * @param {string} content - 文档内容
   */
  async extractKnowledge(documentId, title, content) {
    // 1. 使用AI提取实体和关系
    const extractionResult = await this.extractWithAI(title, content);
    
    // 2. 存储知识节点
    const nodes = await this.storeNodes(documentId, extractionResult.entities);
    
    // 3. 存储知识关系
    const relations = await this.storeRelations(nodes, extractionResult.relations);
    
    // 4. 更新文档的知识图谱状态
    await this.updateDocumentKGStatus(documentId, nodes.length, relations.length);
    
    return {
      documentId,
      nodes: nodes.length,
      relations: relations.length,
      extractionResult
    };
  }

  /**
   * 使用AI提取实体和关系
   */
  async extractWithAI(title, content) {
    const prompt = `请分析以下文档内容，提取其中的知识实体和关系。

文档标题：${title}
文档内容：
${content.slice(0, 3000)}

请按照以下JSON格式输出：
{
  "entities": [
    {"name": "实体名称", "type": "CONCEPT|ENTITY|EVENT|ATTRIBUTE", "description": "简短描述"}
  ],
  "relations": [
    {"source": "源实体", "target": "目标实体", "relation": "关系类型", "evidence": "原文依据"}
  ]
}

提取规则：
1. 实体类型说明：
   - CONCEPT: 抽象概念（如"机器学习"、"设计模式"）
   - ENTITY: 具体实体（如"Python"、"React"）
   - EVENT: 事件或过程（如"部署流程"）
   - ATTRIBUTE: 属性或特征（如"高性能"）
2. 关系类型包括：包含、属于、依赖、相关、导致、等价等
3. 只提取文档中明确提到的实体和关系
4. 每个实体提供简短描述
5. 关系需要提供原文依据

请只输出JSON，不要有其他内容。`;

    const response = await aiClient.chat([
      { role: 'system', content: '你是一个知识图谱构建专家，擅长从文本中提取结构化知识。' },
      { role: 'user', content: prompt }
    ], { temperature: 0.3 });

    try {
      // 解析JSON响应
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.warn('知识提取JSON解析失败:', error.message);
    }

    return { entities: [], relations: [] };
  }

  /**
   * 存储知识节点
   */
  async storeNodes(documentId, entities) {
    const nodes = [];
    
    for (const entity of entities.slice(0, this.maxNodesPerDocument)) {
      try {
        const node = await prisma.knowledgeNode.upsert({
          where: {
            documentId_concept: {
              documentId,
              concept: entity.name
            }
          },
          create: {
            documentId,
            concept: entity.name,
            description: entity.description || '',
            nodeType: entity.type || 'CONCEPT',
            confidence: 1.0
          },
          update: {
            description: entity.description || '',
            nodeType: entity.type || 'CONCEPT'
          }
        });
        nodes.push(node);
      } catch (error) {
        console.warn(`存储节点失败: ${entity.name}`, error.message);
      }
    }
    
    return nodes;
  }

  /**
   * 存储知识关系
   */
  async storeRelations(nodes, relations) {
    const storedRelations = [];
    const nodeMap = new Map(nodes.map(n => [n.concept, n]));
    
    for (const rel of relations) {
      const sourceNode = nodeMap.get(rel.source);
      const targetNode = nodeMap.get(rel.target);
      
      if (!sourceNode || !targetNode) continue;
      
      try {
        const relation = await prisma.knowledgeRelation.upsert({
          where: {
            sourceNodeId_targetNodeId_relationType: {
              sourceNodeId: sourceNode.id,
              targetNodeId: targetNode.id,
              relationType: rel.relation
            }
          },
          create: {
            sourceNodeId: sourceNode.id,
            targetNodeId: targetNode.id,
            relationType: rel.relation,
            evidence: rel.evidence || '',
            weight: 1.0
          },
          update: {
            evidence: rel.evidence || ''
          }
        });
        storedRelations.push(relation);
      } catch (error) {
        console.warn(`存储关系失败: ${rel.source} -> ${rel.target}`, error.message);
      }
    }
    
    return storedRelations;
  }

  /**
   * 更新文档的知识图谱状态
   */
  async updateDocumentKGStatus(documentId, nodeCount, relationCount) {
    // 可以添加一个字段来标记文档是否已构建知识图谱
    console.log(`文档 ${documentId} 知识图谱构建完成: ${nodeCount} 节点, ${relationCount} 关系`);
  }

  /**
   * 知识图谱查询 - 查找相关概念
   * @param {string} concept - 概念名称
   * @param {number} depth - 搜索深度
   */
  async queryRelatedConcepts(concept, depth = 2) {
    const results = [];
    const visited = new Set();
    
    // BFS搜索
    const queue = [{ concept, depth: 0 }];
    
    while (queue.length > 0) {
      const { concept: currentConcept, depth: currentDepth } = queue.shift();
      
      if (visited.has(currentConcept) || currentDepth > depth) continue;
      visited.add(currentConcept);
      
      // 查找节点
      const nodes = await prisma.knowledgeNode.findMany({
        where: { concept: currentConcept },
        include: {
          relations: {
            include: { targetNode: true }
          },
          targetRelations: {
            include: { sourceNode: true }
          }
        }
      });
      
      for (const node of nodes) {
        results.push({
          concept: node.concept,
          documentId: node.documentId,
          nodeType: node.nodeType,
          depth: currentDepth
        });
        
        // 添加相邻节点到队列
        for (const rel of node.relations) {
          if (!visited.has(rel.targetNode.concept)) {
            queue.push({ concept: rel.targetNode.concept, depth: currentDepth + 1 });
          }
        }
        
        for (const rel of node.targetRelations) {
          if (!visited.has(rel.sourceNode.concept)) {
            queue.push({ concept: rel.sourceNode.concept, depth: currentDepth + 1 });
          }
        }
      }
    }
    
    return results;
  }

  /**
   * 知识推理 - 发现隐含关系
   * @param {string} startConcept - 起始概念
   * @param {string} endConcept - 目标概念
   */
  async inferRelation(startConcept, endConcept) {
    // 查找两个概念之间的路径
    const paths = await this.findPaths(startConcept, endConcept, 4);
    
    if (paths.length === 0) {
      return { inferred: false, reason: '未找到关联路径' };
    }
    
    // 基于路径生成推理结果
    const inference = await this.generateInference(paths);
    
    return {
      inferred: true,
      paths,
      inference
    };
  }

  /**
   * 查找概念间的路径（DFS）
   */
  async findPaths(start, end, maxDepth) {
    const paths = [];
    
    const dfs = async (current, target, path, visited, depth) => {
      if (depth > maxDepth) return;
      if (current === target) {
        paths.push([...path]);
        return;
      }
      
      visited.add(current);
      
      const nodes = await prisma.knowledgeNode.findMany({
        where: { concept: current },
        include: {
          relations: {
            include: { targetNode: true }
          }
        }
      });
      
      for (const node of nodes) {
        for (const rel of node.relations) {
          const nextConcept = rel.targetNode.concept;
          if (!visited.has(nextConcept)) {
            path.push({
              from: current,
              to: nextConcept,
              relation: rel.relationType
            });
            await dfs(nextConcept, target, path, visited, depth + 1);
            path.pop();
          }
        }
      }
      
      visited.delete(current);
    };
    
    await dfs(start, end, [], new Set(), 0);
    return paths.slice(0, 5); // 返回最多5条路径
  }

  /**
   * 基于路径生成推理结果
   */
  async generateInference(paths) {
    if (paths.length === 0) return null;
    
    const pathDescriptions = paths.map((path, idx) => {
      const steps = path.map(p => `${p.from} --[${p.relation}]--> ${p.to}`);
      return `路径${idx + 1}: ${steps.join(' -> ')}`;
    }).join('\n');
    
    const prompt = `基于以下知识图谱路径，推断起始概念和目标概念之间的关系：

${pathDescriptions}

请用一句话总结推断的关系。`;

    const response = await aiClient.chat([
      { role: 'system', content: '你是一个知识推理专家。' },
      { role: 'user', content: prompt }
    ], { temperature: 0.3, maxTokens: 100 });
    
    return response.content;
  }

  /**
   * 语义搜索 - 基于知识图谱
   * @param {string} query - 查询文本
   * @param {number} limit - 结果数量限制
   */
  async semanticSearch(query, limit = 10) {
    // 1. 从查询中提取关键概念
    const concepts = await this.extractQueryConcepts(query);
    
    // 2. 查找相关节点
    const relatedNodes = await Promise.all(
      concepts.map(c => this.queryRelatedConcepts(c, 1))
    );
    
    // 3. 合并并去重
    const allNodes = relatedNodes.flat();
    const nodeScores = new Map();
    
    for (const node of allNodes) {
      const key = node.documentId;
      const score = nodeScores.get(key) || 0;
      nodeScores.set(key, score + (1 / (node.depth + 1)));
    }
    
    // 4. 获取文档信息
    const documentIds = Array.from(nodeScores.keys())
      .sort((a, b) => nodeScores.get(b) - nodeScores.get(a))
      .slice(0, limit);
    
    const documents = await prisma.document.findMany({
      where: { id: { in: documentIds } },
      include: {
        author: { select: { id: true, name: true } },
        tags: { select: { id: true, name: true, color: true } }
      }
    });
    
    // 5. 按分数排序返回
    return documents.sort((a, b) => 
      (nodeScores.get(b.id) || 0) - (nodeScores.get(a.id) || 0)
    ).map(doc => ({
      ...doc,
      kgScore: nodeScores.get(doc.id) || 0,
      matchedConcepts: concepts
    }));
  }

  /**
   * 从查询中提取概念
   */
  async extractQueryConcepts(query) {
    const prompt = `请从以下查询中提取关键概念（名词、术语），用逗号分隔：

查询：${query}

只输出概念列表，不要有其他内容。`;

    const response = await aiClient.chat([
      { role: 'system', content: '你是一个概念提取专家。' },
      { role: 'user', content: prompt }
    ], { temperature: 0.3, maxTokens: 100 });
    
    return response.content
      .split(/[,，、]/)
      .map(c => c.trim())
      .filter(c => c.length > 0 && c.length < 20);
  }

  /**
   * 获取知识图谱统计信息
   */
  async getStats() {
    const [nodeCount, relationCount, documentCount] = await Promise.all([
      prisma.knowledgeNode.count(),
      prisma.knowledgeRelation.count(),
      prisma.document.count({
        where: {
          knowledgeNodes: { some: {} }
        }
      })
    ]);
    
    // 获取关系类型分布
    const relationTypes = await prisma.knowledgeRelation.groupBy({
      by: ['relationType'],
      _count: true
    });
    
    return {
      totalNodes: nodeCount,
      totalRelations: relationCount,
      documentsWithKG: documentCount,
      relationTypeDistribution: relationTypes.map(r => ({
        type: r.relationType,
        count: r._count
      }))
    };
  }

  /**
   * 获取文档的知识图谱可视化数据
   */
  async getVisualizationData(documentId) {
    const nodes = await prisma.knowledgeNode.findMany({
      where: { documentId },
      include: {
        relations: {
          include: { targetNode: true }
        },
        targetRelations: {
          include: { sourceNode: true }
        }
      }
    });
    
    // 转换为可视化格式
    const visNodes = nodes.map(n => ({
      id: n.id,
      label: n.concept,
      type: n.nodeType,
      description: n.description
    }));
    
    const visEdges = [];
    const edgeSet = new Set();
    
    for (const node of nodes) {
      for (const rel of node.relations) {
        const edgeKey = `${rel.sourceNodeId}-${rel.targetNodeId}`;
        if (!edgeSet.has(edgeKey)) {
          edgeSet.add(edgeKey);
          visEdges.push({
            id: rel.id,
            source: rel.sourceNodeId,
            target: rel.targetNodeId,
            label: rel.relationType,
            evidence: rel.evidence
          });
        }
      }
    }
    
    return {
      nodes: visNodes,
      edges: visEdges
    };
  }
}

module.exports = new KnowledgeGraphService();
