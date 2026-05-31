const prisma = require('../config/database');

const searchDocuments = async (query, tags = [], page = 1, limit = 10) => {
  const skip = (page - 1) * limit;

  const where = {
    OR: [
      { title: { contains: query, mode: 'insensitive' } },
      { content: { contains: query, mode: 'insensitive' } },
      { summary: { contains: query, mode: 'insensitive' } },
    ],
  };

  if (tags.length > 0) {
    where.tags = {
      some: {
        name: {
          in: tags,
        },
      },
    };
  }

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      include: {
        author: {
          select: { id: true, name: true },
        },
        tags: {
          select: { id: true, name: true, color: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.document.count({ where }),
  ]);

  return {
    documents,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

module.exports = {
  searchDocuments,
};
