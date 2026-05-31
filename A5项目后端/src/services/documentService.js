const prisma = require('../config/database');

const getDocuments = async (page = 1, limit = 10, tags = []) => {
  const skip = (page - 1) * limit;

  const where = {};
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

const getDocumentById = async (id) => {
  const document = await prisma.document.findUnique({
    where: { id },
    include: {
      author: {
        select: { id: true, name: true },
      },
      tags: {
        select: { id: true, name: true, color: true },
      },
      versions: {
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: { id: true, name: true },
          },
        },
      },
      comments: {
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  if (!document) {
    throw new Error('文档不存在');
  }

  await prisma.document.update({
    where: { id },
    data: { views: { increment: 1 } },
  });

  return document;
};

const createDocument = async (authorId, data) => {
  const { title, content, summary, tags = [] } = data;

  const tagConnectOrCreate = tags.map((tagName) => ({
    where: { name: tagName },
    create: { name: tagName },
  }));

  const document = await prisma.document.create({
    data: {
      title,
      content,
      summary,
      authorId,
      tags: {
        connectOrCreate: tagConnectOrCreate,
      },
    },
    include: {
      author: {
        select: { id: true, name: true },
      },
      tags: {
        select: { id: true, name: true, color: true },
      },
    },
  });

  await prisma.documentVersion.create({
    data: {
      documentId: document.id,
      content,
      version: 1,
      authorId,
    },
  });

  return document;
};

const updateDocument = async (id, userId, data) => {
  const { title, content, summary, tags = [] } = data;

  const existingDocument = await prisma.document.findUnique({
    where: { id },
  });

  if (!existingDocument) {
    throw new Error('文档不存在');
  }

  const tagConnectOrCreate = tags.map((tagName) => ({
    where: { name: tagName },
    create: { name: tagName },
  }));

  const newVersion = existingDocument.version + 1;

  const document = await prisma.document.update({
    where: { id },
    data: {
      title,
      content,
      summary,
      version: newVersion,
      tags: {
        set: [],
        connectOrCreate: tagConnectOrCreate,
      },
    },
    include: {
      author: {
        select: { id: true, name: true },
      },
      tags: {
        select: { id: true, name: true, color: true },
      },
    },
  });

  await prisma.documentVersion.create({
    data: {
      documentId: id,
      content,
      version: newVersion,
      authorId: userId,
    },
  });

  return document;
};

const deleteDocument = async (id) => {
  const document = await prisma.document.findUnique({
    where: { id },
  });

  if (!document) {
    throw new Error('文档不存在');
  }

  await prisma.document.delete({
    where: { id },
  });

  return { message: '文档删除成功' };
};

module.exports = {
  getDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  deleteDocument,
};
