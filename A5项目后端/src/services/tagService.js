const prisma = require('../config/database');

const getTags = async () => {
  const tags = await prisma.tag.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { documents: true },
      },
    },
  });

  return tags.map(tag => ({
    ...tag,
    documentCount: tag._count.documents,
    _count: undefined,
  }));
};

const createTag = async (name, color) => {
  const tag = await prisma.tag.create({
    data: {
      name,
      color,
    },
  });

  return tag;
};

const updateTag = async (id, name, color) => {
  const tag = await prisma.tag.update({
    where: { id },
    data: {
      name,
      color,
    },
  });

  return tag;
};

const deleteTag = async (id) => {
  await prisma.tag.delete({
    where: { id },
  });

  return { message: '标签删除成功' };
};

module.exports = {
  getTags,
  createTag,
  updateTag,
  deleteTag,
};
