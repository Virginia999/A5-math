/**
 * 协作编辑路由定义
 */

const express = require('express');
const router = express.Router();
const collaborationController = require('../controllers/collaborationController');
const { authenticate, requireRole } = require('../middlewares/auth');

// 所有协作路由需要认证
router.use(authenticate);

/**
 * @route POST /api/collaboration/invite
 * @desc 邀请协作者
 * @access Private
 */
router.post('/invite', collaborationController.inviteCollaborator);

/**
 * @route POST /api/collaboration/accept
 * @desc 接受邀请
 * @access Private
 */
router.post('/accept', collaborationController.acceptInvitation);

/**
 * @route POST /api/collaboration/reject
 * @desc 拒绝邀请
 * @access Private
 */
router.post('/reject', collaborationController.rejectInvitation);

/**
 * @route GET /api/collaboration/collaborators/:documentId
 * @desc 获取文档协作者
 * @access Private
 */
router.get('/collaborators/:documentId', collaborationController.getCollaborators);

/**
 * @route GET /api/collaboration/invitations
 * @desc 获取待处理邀请
 * @access Private
 */
router.get('/invitations', collaborationController.getPendingInvitations);

/**
 * @route POST /api/collaboration/session/start
 * @desc 开始协作会话
 * @access Private
 */
router.post('/session/start', collaborationController.startSession);

/**
 * @route POST /api/collaboration/session/end
 * @desc 结束协作会话
 * @access Private
 */
router.post('/session/end', collaborationController.endSession);

/**
 * @route POST /api/collaboration/cursor
 * @desc 更新光标位置
 * @access Private
 */
router.post('/cursor', collaborationController.updateCursor);

/**
 * @route POST /api/collaboration/operation
 * @desc 记录编辑操作
 * @access Private
 */
router.post('/operation', collaborationController.recordOperation);

/**
 * @route GET /api/collaboration/operations/:documentId
 * @desc 获取操作历史
 * @access Private
 */
router.get('/operations/:documentId', collaborationController.getOperations);

/**
 * @route GET /api/collaboration/active/:documentId
 * @desc 获取活跃协作者
 * @access Private
 */
router.get('/active/:documentId', collaborationController.getActiveCollaborators);

/**
 * @route DELETE /api/collaboration/:documentId/:userId
 * @desc 移除协作者
 * @access Private
 */
router.delete('/:documentId/:userId', collaborationController.removeCollaborator);

/**
 * @route PUT /api/collaboration/role
 * @desc 更新协作者角色
 * @access Private
 */
router.put('/role', collaborationController.updateRole);

/**
 * @route GET /api/collaboration/my-documents
 * @desc 获取用户参与的协作文档
 * @access Private
 */
router.get('/my-documents', collaborationController.getMyCollaborations);

module.exports = router;
