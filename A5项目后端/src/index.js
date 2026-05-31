const app = require('./app');
const prisma = require('./config/database');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await prisma.$connect();
    console.log('数据库连接成功');

    app.listen(PORT, () => {
      console.log(`服务器运行在 http://localhost:${PORT}`);
      console.log(`健康检查: http://localhost:${PORT}/health`);
      console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('启动服务器失败:', error);
    process.exit(1);
  }
};

process.on('SIGINT', async () => {
  console.log('\n正在关闭服务器...');
  await prisma.$disconnect();
  console.log('数据库连接已关闭');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n正在关闭服务器...');
  await prisma.$disconnect();
  console.log('数据库连接已关闭');
  process.exit(0);
});

startServer();
