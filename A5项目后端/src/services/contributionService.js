/**
 * 知识贡献度评估服务
 * 评估用户对知识库的贡献，支持排行榜和激励机制
 */

const prisma = require('../config/database');

class ContributionService {
  constructor() {
    this.weights = {
      documentCreated: 10,
      documentEdited: 5,
      commentWritten: 2,
      questionAnswered: 8,
      helpfulVote: 3,
      knowledgeNodeAdded: 4,
      collaborationInvite: 2
    };
  }

  /**
   * 计算用户贡献度
   * @param {string} userId - 用户ID
   * @param {string} period - 统计周期 (YYYY-MM)
   */
  async calculateContribution(userId, period = null) {
    const currentPeriod = period || this.getCurrentPeriod();
    
    // 检查是否已有记录
    let contribution = await prisma.userContribution.findUnique({
      where: {
        userId_period: { userId, period: currentPeriod }
      }
    });

    if (contribution) {
      return contribution;
    }

    // 计算各项指标
    const [
      documentsCreated,
      documentsEdited,
      commentsWritten,
      questionsAnswered,
      helpfulVotes
    ] = await Promise.all([
      this.countDocumentsCreated(userId, currentPeriod),
      this.countDocumentsEdited(userId, currentPeriod),
      this.countCommentsWritten(userId, currentPeriod),
      this.countQuestionsAnswered(userId, currentPeriod),
      this.countHelpfulVotes(userId, currentPeriod)
    ]);

    // 计算总分
    const totalScore = 
      documentsCreated * this.weights.documentCreated +
      documentsEdited * this.weights.documentEdited +
      commentsWritten * this.weights.commentWritten +
      questionsAnswered * this.weights.questionAnswered +
      helpfulVotes * this.weights.helpfulVote;

    // 创建或更新记录
    contribution = await prisma.userContribution.upsert({
      where: {
        userId_period: { userId, period: currentPeriod }
      },
      create: {
        userId,
        period: currentPeriod,
        documentsCreated,
        documentsEdited,
        commentsWritten,
        questionsAnswered,
        helpfulVotes,
        totalScore
      },
      update: {
        documentsCreated,
        documentsEdited,
        commentsWritten,
        questionsAnswered,
        helpfulVotes,
        totalScore
      }
    });

    return contribution;
  }

  /**
   * 获取当前周期
   */
  getCurrentPeriod() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * 统计创建的文档数
   */
  async countDocumentsCreated(userId, period) {
    const [year, month] = period.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    return prisma.document.count({
      where: {
        authorId: userId,
        createdAt: { gte: startDate, lt: endDate }
      }
    });
  }

  /**
   * 统计编辑的文档数
   */
  async countDocumentsEdited(userId, period) {
    const [year, month] = period.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    return prisma.documentVersion.count({
      where: {
        authorId: userId,
        createdAt: { gte: startDate, lt: endDate }
      }
    });
  }

  /**
   * 统计评论数
   */
  async countCommentsWritten(userId, period) {
    const [year, month] = period.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    return prisma.comment.count({
      where: {
        userId,
        createdAt: { gte: startDate, lt: endDate }
      }
    });
  }

  /**
   * 统计回答的问题数
   */
  async countQuestionsAnswered(userId, period) {
    const [year, month] = period.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    // 统计AI对话中用户获得的帮助
    const chatSessions = await prisma.aIChatSession.findMany({
      where: {
        userId,
        createdAt: { gte: startDate, lt: endDate }
      },
      include: {
        messages: {
          where: { role: 'ASSISTANT' }
        }
      }
    });

    return chatSessions.reduce((count, session) => count + session.messages.length, 0);
  }

  /**
   * 统计获得的点赞数
   */
  async countHelpfulVotes(userId, period) {
    // 简化实现：统计用户文档的浏览量作为参考
    const [year, month] = period.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const result = await prisma.document.aggregate({
      where: {
        authorId: userId,
        updatedAt: { gte: startDate, lt: endDate }
      },
      _sum: { views: true }
    });

    return Math.floor((result._sum.views || 0) / 10); // 每10次浏览计1票
  }

  /**
   * 获取贡献排行榜
   * @param {string} period - 统计周期
   * @param {number} limit - 返回数量
   */
  async getLeaderboard(period = null, limit = 10) {
    const currentPeriod = period || this.getCurrentPeriod();

    const contributions = await prisma.userContribution.findMany({
      where: { period: currentPeriod },
      include: {
        user: {
          select: { id: true, name: true, avatar: true }
        }
      },
      orderBy: { totalScore: 'desc' },
      take: limit
    });

    // 更新排名
    for (let i = 0; i < contributions.length; i++) {
      if (contributions[i].rank !== i + 1) {
        await prisma.userContribution.update({
          where: { id: contributions[i].id },
          data: { rank: i + 1 }
        });
      }
    }

    return contributions.map((c, idx) => ({
      rank: idx + 1,
      user: c.user,
      totalScore: c.totalScore,
      documentsCreated: c.documentsCreated,
      documentsEdited: c.documentsEdited,
      commentsWritten: c.commentsWritten,
      questionsAnswered: c.questionsAnswered,
      helpfulVotes: c.helpfulVotes
    }));
  }

  /**
   * 获取用户贡献详情
   */
  async getUserContributionDetails(userId) {
    const currentPeriod = this.getCurrentPeriod();
    
    // 当前周期贡献
    const current = await this.calculateContribution(userId, currentPeriod);
    
    // 历史贡献统计
    const history = await prisma.userContribution.findMany({
      where: { userId },
      orderBy: { period: 'desc' },
      take: 12
    });

    // 总贡献
    const total = await prisma.userContribution.aggregate({
      where: { userId },
      _sum: {
        documentsCreated: true,
        documentsEdited: true,
        commentsWritten: true,
        questionsAnswered: true,
        helpfulVotes: true,
        totalScore: true
      }
    });

    // 排名
    const rank = await prisma.userContribution.count({
      where: {
        period: currentPeriod,
        totalScore: { gt: current.totalScore }
      }
    }) + 1;

    return {
      current,
      history,
      total: {
        documentsCreated: total._sum.documentsCreated || 0,
        documentsEdited: total._sum.documentsEdited || 0,
        commentsWritten: total._sum.commentsWritten || 0,
        questionsAnswered: total._sum.questionsAnswered || 0,
        helpfulVotes: total._sum.helpfulVotes || 0,
        totalScore: total._sum.totalScore || 0
      },
      rank
    };
  }

  /**
   * 获取贡献趋势
   */
  async getContributionTrend(userId, months = 6) {
    const periods = [];
    const now = new Date();

    for (let i = 0; i < months; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      periods.push(period);
    }

    const contributions = await prisma.userContribution.findMany({
      where: {
        userId,
        period: { in: periods.reverse() }
      },
      orderBy: { period: 'asc' }
    });

    return periods.map(period => {
      const contribution = contributions.find(c => c.period === period);
      return {
        period,
        totalScore: contribution?.totalScore || 0,
        documentsCreated: contribution?.documentsCreated || 0,
        documentsEdited: contribution?.documentsEdited || 0
      };
    });
  }

  /**
   * 批量更新所有用户的贡献度
   */
  async updateAllContributions() {
    const users = await prisma.user.findMany({
      select: { id: true }
    });

    const results = [];
    for (const user of users) {
      try {
        const contribution = await this.calculateContribution(user.id);
        results.push({ userId: user.id, success: true, score: contribution.totalScore });
      } catch (error) {
        results.push({ userId: user.id, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * 获取贡献徽章
   */
  async getUserBadges(userId) {
    const details = await this.getUserContributionDetails(userId);
    const badges = [];

    // 文档创建徽章
    if (details.total.documentsCreated >= 50) {
      badges.push({ name: '知识大师', icon: '🏆', description: '创建50+文档', level: 3 });
    } else if (details.total.documentsCreated >= 20) {
      badges.push({ name: '知识专家', icon: '🥇', description: '创建20+文档', level: 2 });
    } else if (details.total.documentsCreated >= 5) {
      badges.push({ name: '知识贡献者', icon: '🥈', description: '创建5+文档', level: 1 });
    }

    // 编辑徽章
    if (details.total.documentsEdited >= 100) {
      badges.push({ name: '编辑大师', icon: '✏️', description: '编辑100+次', level: 3 });
    } else if (details.total.documentsEdited >= 30) {
      badges.push({ name: '编辑专家', icon: '📝', description: '编辑30+次', level: 2 });
    }

    // 评论徽章
    if (details.total.commentsWritten >= 50) {
      badges.push({ name: '讨论达人', icon: '💬', description: '评论50+次', level: 2 });
    }

    // 排名徽章
    if (details.rank === 1) {
      badges.push({ name: '月度冠军', icon: '👑', description: '本月排名第1', level: 3 });
    } else if (details.rank <= 3) {
      badges.push({ name: '月度之星', icon: '⭐', description: '本月排名前3', level: 2 });
    } else if (details.rank <= 10) {
      badges.push({ name: '月度优秀', icon: '🌟', description: '本月排名前10', level: 1 });
    }

    return badges;
  }

  /**
   * 获取权重配置
   */
  getWeights() {
    return this.weights;
  }
}

module.exports = new ContributionService();
