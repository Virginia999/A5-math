const prisma = require('../config/database');

const getStats = async () => {
  const [
    totalDocuments,
    totalUsers,
    totalViews,
    popularDocuments,
    recentDocuments,
    tagStats,
  ] = await Promise.all([
    prisma.document.count(),
    prisma.user.count(),
    prisma.document.aggregate({
      _sum: { views: true },
    }),
    prisma.document.findMany({
      orderBy: { views: 'desc' },
      take: 5,
      include: {
        author: { select: { id: true, name: true } },
        tags: { select: { id: true, name: true, color: true } },
      },
    }),
    prisma.document.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        author: { select: { id: true, name: true } },
        tags: { select: { id: true, name: true, color: true } },
      },
    }),
    prisma.tag.findMany({
      include: {
        _count: { select: { documents: true } },
      },
      orderBy: {
        documents: {
          _count: 'desc',
        },
      },
      take: 10,
    }),
  ]);

  return {
    totalDocuments,
    totalUsers,
    totalViews: totalViews._sum.views || 0,
    popularDocuments,
    recentDocuments,
    tagStats: tagStats.map(tag => ({
      ...tag,
      documentCount: tag._count.documents,
      _count: undefined,
    })),
  };
};

module.exports = {
  getStats,
};
