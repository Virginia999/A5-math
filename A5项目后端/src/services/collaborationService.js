/**
 * 协作编辑服务
 * 支持多人实时协作编辑文档
 */

const prisma = require('../config/database');

class CollaborationService {
  constructor() {
    this.activeSessions = new Map(); // documentId -> Set of userId
    this.sessionData = new Map(); // sessionId -> session info
  }

  /**
   * 邀请用户协作
   * @param {string} documentId - 文档ID
   * @param {string} inviterId - 邀请人ID
   * @param {string} inviteeId - 被邀人ID
   * @param {string} role - 协作角色
   */
  async inviteCollaborator(documentId, inviterId, inviteeId, role = 'VIEWER') {
    // 检查文档是否存在
    const document = await prisma.document.findUnique({
      where: { id: documentId }
    });

    if (!document) {
      throw new Error('文档不存在');
    }

    // 检查是否已有协作关系
    const existing = await prisma.collaboration.findUnique({
      where: {
        documentId_userId: { documentId, userId: inviteeId }
      }
    });

    if (existing) {
      throw new Error('用户已被邀请');
    }

    // 创建协作邀请
    const collaboration = await prisma.collaboration.create({
      data: {
        documentId,
        userId: inviteeId,
        role,
        invitedBy: inviterId,
        status: 'PENDING'
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        document: { select: { id: true, title: true } }
      }
    });

    // 发送通知
    await this.sendCollaborationNotification(inviteeId, documentId, document.title, '邀请您协作编辑文档');

    return collaboration;
  }

  /**
   * 接受协作邀请
   */
  async acceptInvitation(documentId, userId) {
    const collaboration = await prisma.collaboration.update({
      where: {
        documentId_userId: { documentId, userId }
      },
      data: {
        status: 'ACCEPTED',
        lastActiveAt: new Date()
      }
    });

    return collaboration;
  }

  /**
   * 拒绝协作邀请
   */
  async rejectInvitation(documentId, userId) {
    const collaboration = await prisma.collaboration.update({
      where: {
        documentId_userId: { documentId, userId }
      },
      data: {
        status: 'REJECTED'
      }
    });

    return collaboration;
  }

  /**
   * 获取文档的协作者列表
   */
  async getCollaborators(documentId) {
    const collaborations = await prisma.collaboration.findMany({
      where: {
        documentId,
        status: 'ACCEPTED'
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } }
      }
    });

    // 获取文档作者
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        author: { select: { id: true, name: true, email: true, avatar: true } }
      }
    });

    return {
      owner: document.author,
      collaborators: collaborations.map(c => ({
        ...c.user,
        role: c.role,
        lastActiveAt: c.lastActiveAt
      }))
    };
  }

  /**
   * 获取用户的协作邀请列表
   */
  async getPendingInvitations(userId) {
    return prisma.collaboration.findMany({
      where: {
        userId,
        status: 'PENDING'
      },
      include: {
        document: { select: { id: true, title: true } },
        user: { select: { id: true, name: true } }
      }
    });
  }

  /**
   * 开始协作会话
   */
  async startSession(documentId, userId) {
    // 检查权限
    const hasAccess = await this.checkAccess(documentId, userId);
    if (!hasAccess) {
      throw new Error('无权访问此文档');
    }

    // 创建或更新会话
    const session = await prisma.collaborationSession.upsert({
      where: {
        id: `${documentId}_${userId}`
      },
      create: {
        id: `${documentId}_${userId}`,
        documentId,
        userId,
        cursorPosition: 0
      },
      update: {
        lastActiveAt: new Date()
      }
    });

    // 记录活跃用户
    if (!this.activeSessions.has(documentId)) {
      this.activeSessions.set(documentId, new Set());
    }
    this.activeSessions.get(documentId).add(userId);

    return {
      sessionId: session.id,
      documentId,
      activeUsers: Array.from(this.activeSessions.get(documentId) || [])
    };
  }

  /**
   * 结束协作会话
   */
  async endSession(documentId, userId) {
    // 移除活跃用户
    if (this.activeSessions.has(documentId)) {
      this.activeSessions.get(documentId).delete(userId);
    }

    return { success: true };
  }

  /**
   * 更新光标位置
   */
  async updateCursor(sessionId, position, selection = null) {
    return prisma.collaborationSession.update({
      where: { id: sessionId },
      data: {
        cursorPosition: position,
        selection,
        lastActiveAt: new Date()
      }
    });
  }

  /**
   * 记录编辑操作
   */
  async recordOperation(sessionId, operation) {
    const { type, position, content, version } = operation;

    const session = await prisma.collaborationSession.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      throw new Error('会话不存在');
    }

    const op = await prisma.collaborationOperation.create({
      data: {
        sessionId,
        operationType: type,
        position,
        content,
        userId: session.userId,
        version
      }
    });

    return op;
  }

  /**
   * 获取操作历史
   */
  async getOperations(documentId, sinceVersion = 0) {
    return prisma.collaborationOperation.findMany({
      where: {
        sessionId: { startsWith: `${documentId}_` },
        version: { gt: sinceVersion }
      },
      orderBy: { createdAt: 'asc' },
      take: 100
    });
  }

  /**
   * 获取活跃协作者
   */
  getActiveCollaborators(documentId) {
    const users = this.activeSessions.get(documentId) || new Set();
    return Array.from(users);
  }

  /**
   * 检查用户访问权限
   */
  async checkAccess(documentId, userId) {
    // 检查是否是作者
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { authorId: true, isPublic: true }
    });

    if (!document) return false;
    if (document.authorId === userId) return true;
    if (document.isPublic) return true;

    // 检查是否是协作者
    const collaboration = await prisma.collaboration.findFirst({
      where: {
        documentId,
        userId,
        status: 'ACCEPTED'
      }
    });

    return !!collaboration;
  }

  /**
   * 检查编辑权限
   */
  async checkEditPermission(documentId, userId) {
    // 检查是否是作者
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { authorId: true }
    });

    if (!document) return false;
    if (document.authorId === userId) return true;

    // 检查是否有编辑权限
    const collaboration = await prisma.collaboration.findFirst({
      where: {
        documentId,
        userId,
        status: 'ACCEPTED',
        role: { in: ['EDITOR', 'OWNER'] }
      }
    });

    return !!collaboration;
  }

  /**
   * 移除协作者
   */
  async removeCollaborator(documentId, userId) {
    return prisma.collaboration.delete({
      where: {
        documentId_userId: { documentId, userId }
      }
    });
  }

  /**
   * 更新协作者角色
   */
  async updateRole(documentId, userId, newRole) {
    return prisma.collaboration.update({
      where: {
        documentId_userId: { documentId, userId }
      },
      data: { role: newRole }
    });
  }

  /**
   * 发送协作通知
   */
  async sendCollaborationNotification(userId, documentId, documentTitle, message) {
    return prisma.notification.create({
      data: {
        userId,
        type: 'COLLABORATION_INVITE',
        title: '协作邀请',
        content: message,
        data: JSON.stringify({ documentId, documentTitle })
      }
    });
  }

  /**
   * 获取用户参与协作的文档列表
   */
  async getUserCollaborations(userId) {
    return prisma.collaboration.findMany({
      where: {
        userId,
        status: 'ACCEPTED'
      },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            summary: true,
            updatedAt: true,
            author: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { lastActiveAt: 'desc' }
    });
  }
}

module.exports = new CollaborationService();
