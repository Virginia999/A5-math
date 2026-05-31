/**
 * 协作编辑控制器
 */

const collaborationService = require('../services/collaborationService');
const { success, error } = require('../utils/response');

/**
 * 邀请协作者
 * POST /api/collaboration/invite
 */
const inviteCollaborator = async (req, res) => {
  try {
    const { documentId, inviteeId, role } = req.body;
    const inviterId = req.user.id;

    const result = await collaborationService.inviteCollaborator(
      documentId,
      inviterId,
      inviteeId,
      role
    );

    res.json(success(result, '邀请已发送'));
  } catch (err) {
    console.error('邀请协作者错误:', err);
    res.status(500).json(error('邀请失败: ' + err.message));
  }
};

/**
 * 接受邀请
 * POST /api/collaboration/accept
 */
const acceptInvitation = async (req, res) => {
  try {
    const { documentId } = req.body;
    const userId = req.user.id;

    const result = await collaborationService.acceptInvitation(documentId, userId);
    res.json(success(result, '已接受邀请'));
  } catch (err) {
    console.error('接受邀请错误:', err);
    res.status(500).json(error('接受邀请失败: ' + err.message));
  }
};

/**
 * 拒绝邀请
 * POST /api/collaboration/reject
 */
const rejectInvitation = async (req, res) => {
  try {
    const { documentId } = req.body;
    const userId = req.user.id;

    const result = await collaborationService.rejectInvitation(documentId, userId);
    res.json(success(result, '已拒绝邀请'));
  } catch (err) {
    console.error('拒绝邀请错误:', err);
    res.status(500).json(error('拒绝邀请失败: ' + err.message));
  }
};

/**
 * 获取文档协作者
 * GET /api/collaboration/collaborators/:documentId
 */
const getCollaborators = async (req, res) => {
  try {
    const { documentId } = req.params;
    const result = await collaborationService.getCollaborators(documentId);
    res.json(success(result, '获取协作者成功'));
  } catch (err) {
    console.error('获取协作者错误:', err);
    res.status(500).json(error('获取协作者失败: ' + err.message));
  }
};

/**
 * 获取待处理邀请
 * GET /api/collaboration/invitations
 */
const getPendingInvitations = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await collaborationService.getPendingInvitations(userId);
    res.json(success(result, '获取邀请列表成功'));
  } catch (err) {
    console.error('获取邀请列表错误:', err);
    res.status(500).json(error('获取邀请列表失败: ' + err.message));
  }
};

/**
 * 开始协作会话
 * POST /api/collaboration/session/start
 */
const startSession = async (req, res) => {
  try {
    const { documentId } = req.body;
    const userId = req.user.id;

    const result = await collaborationService.startSession(documentId, userId);
    res.json(success(result, '会话已开始'));
  } catch (err) {
    console.error('开始会话错误:', err);
    res.status(500).json(error('开始会话失败: ' + err.message));
  }
};

/**
 * 结束协作会话
 * POST /api/collaboration/session/end
 */
const endSession = async (req, res) => {
  try {
    const { documentId } = req.body;
    const userId = req.user.id;

    const result = await collaborationService.endSession(documentId, userId);
    res.json(success(result, '会话已结束'));
  } catch (err) {
    console.error('结束会话错误:', err);
    res.status(500).json(error('结束会话失败: ' + err.message));
  }
};

/**
 * 更新光标位置
 * POST /api/collaboration/cursor
 */
const updateCursor = async (req, res) => {
  try {
    const { sessionId, position, selection } = req.body;

    const result = await collaborationService.updateCursor(sessionId, position, selection);
    res.json(success(result, '光标已更新'));
  } catch (err) {
    console.error('更新光标错误:', err);
    res.status(500).json(error('更新光标失败: ' + err.message));
  }
};

/**
 * 记录编辑操作
 * POST /api/collaboration/operation
 */
const recordOperation = async (req, res) => {
  try {
    const { sessionId, operation } = req.body;

    const result = await collaborationService.recordOperation(sessionId, operation);
    res.json(success(result, '操作已记录'));
  } catch (err) {
    console.error('记录操作错误:', err);
    res.status(500).json(error('记录操作失败: ' + err.message));
  }
};

/**
 * 获取操作历史
 * GET /api/collaboration/operations/:documentId
 */
const getOperations = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { sinceVersion = 0 } = req.query;

    const result = await collaborationService.getOperations(
      documentId,
      parseInt(sinceVersion)
    );
    res.json(success(result, '获取操作历史成功'));
  } catch (err) {
    console.error('获取操作历史错误:', err);
    res.status(500).json(error('获取操作历史失败: ' + err.message));
  }
};

/**
 * 获取活跃协作者
 * GET /api/collaboration/active/:documentId
 */
const getActiveCollaborators = async (req, res) => {
  try {
    const { documentId } = req.params;
    const result = collaborationService.getActiveCollaborators(documentId);
    res.json(success({ activeUsers: result }, '获取活跃用户成功'));
  } catch (err) {
    console.error('获取活跃用户错误:', err);
    res.status(500).json(error('获取活跃用户失败: ' + err.message));
  }
};

/**
 * 移除协作者
 * DELETE /api/collaboration/:documentId/:userId
 */
const removeCollaborator = async (req, res) => {
  try {
    const { documentId, userId } = req.params;

    const result = await collaborationService.removeCollaborator(documentId, userId);
    res.json(success(result, '协作者已移除'));
  } catch (err) {
    console.error('移除协作者错误:', err);
    res.status(500).json(error('移除协作者失败: ' + err.message));
  }
};

/**
 * 更新协作者角色
 * PUT /api/collaboration/role
 */
const updateRole = async (req, res) => {
  try {
    const { documentId, userId, role } = req.body;

    const result = await collaborationService.updateRole(documentId, userId, role);
    res.json(success(result, '角色已更新'));
  } catch (err) {
    console.error('更新角色错误:', err);
    res.status(500).json(error('更新角色失败: ' + err.message));
  }
};

/**
 * 获取用户参与的协作文档
 * GET /api/collaboration/my-documents
 */
const getMyCollaborations = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await collaborationService.getUserCollaborations(userId);
    res.json(success(result, '获取协作文档成功'));
  } catch (err) {
    console.error('获取协作文档错误:', err);
    res.status(500).json(error('获取协作文档失败: ' + err.message));
  }
};

module.exports = {
  inviteCollaborator,
  acceptInvitation,
  rejectInvitation,
  getCollaborators,
  getPendingInvitations,
  startSession,
  endSession,
  updateCursor,
  recordOperation,
  getOperations,
  getActiveCollaborators,
  removeCollaborator,
  updateRole,
  getMyCollaborations
};
