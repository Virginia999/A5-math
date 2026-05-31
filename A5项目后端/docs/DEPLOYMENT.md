# 智慧知识库部署文档

## 1. 环境要求

### 1.1 基础环境
- Node.js >= 18.0.0
- PostgreSQL >= 15.0 (需安装pgvector扩展)
- Redis >= 6.0 (可选，用于缓存)
- npm >= 9.0.0

### 1.2 推荐配置
- CPU: 4核及以上
- 内存: 8GB及以上
- 存储: 50GB及以上

## 2. 本地开发部署

### 2.1 克隆项目
```bash
git clone <repository-url>
cd knowledge-base-backend
```

### 2.2 安装依赖
```bash
npm install
```

### 2.3 配置环境变量
```bash
cp .env.example .env
```

编辑 `.env` 文件，配置以下关键参数：
```env
DATABASE_URL="postgresql://用户名:密码@localhost:5432/knowledge_base?schema=public"
JWT_SECRET="你的密钥"
OPENAI_API_KEY="你的API密钥"
```

### 2.4 初始化数据库
```bash
# 生成Prisma Client
npm run db:generate

# 推送数据库架构
npm run db:push

# 或使用迁移
npm run db:migrate
```

### 2.5 启动服务
```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

服务将在 `http://localhost:3000` 启动。

## 3. PostgreSQL配置

### 3.1 安装pgvector扩展
```sql
-- 连接到数据库
psql -U postgres -d knowledge_base

-- 创建扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- 验证安装
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### 3.2 创建向量索引
```sql
-- 为嵌入向量创建IVFFlat索引
CREATE INDEX document_embeddings_idx ON document_embeddings 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);
```

### 3.3 性能优化配置
```sql
-- postgresql.conf
shared_buffers = 256MB
work_mem = 64MB
maintenance_work_mem = 128MB
effective_cache_size = 768MB
```

## 4. Docker部署

### 4.1 创建Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY prisma ./prisma/
RUN npx prisma generate

COPY src ./src

EXPOSE 3000

CMD ["node", "src/index.js"]
```

### 4.2 创建docker-compose.yml
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/knowledge_base?schema=public
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  db:
    image: pgvector/pgvector:pg15
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=knowledge_base
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:
```

### 4.3 启动Docker容器
```bash
docker-compose up -d
```

## 5. 生产环境部署

### 5.1 使用PM2部署
```bash
# 安装PM2
npm install -g pm2

# 启动应用
pm2 start src/index.js --name knowledge-base

# 设置开机自启
pm2 startup
pm2 save
```

### 5.2 PM2配置文件 (ecosystem.config.js)
```javascript
module.exports = {
  apps: [{
    name: 'knowledge-base',
    script: 'src/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
};
```

### 5.3 Nginx反向代理配置
```nginx
upstream knowledge_base {
    server localhost:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name your-domain.com;

    # HTTPS重定向
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Gzip压缩
    gzip on;
    gzip_types application/json text/plain;

    location / {
        proxy_pass http://knowledge_base;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # 超时配置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket支持
    location /ws {
        proxy_pass http://knowledge_base;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## 6. 数据库备份

### 6.1 自动备份脚本
```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/var/backups/postgresql"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/knowledge_base_$DATE.sql.gz"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 执行备份
pg_dump -U postgres knowledge_base | gzip > $BACKUP_FILE

# 删除7天前的备份
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE"
```

### 6.2 配置定时任务
```bash
# 编辑crontab
crontab -e

# 每天凌晨2点执行备份
0 2 * * * /path/to/backup.sh
```

## 7. 监控与日志

### 7.1 日志配置
```javascript
// 使用Winston日志框架
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### 7.2 健康检查
```bash
# 检查服务状态
curl http://localhost:3000/health

# 检查数据库连接
curl http://localhost:3000/health/db
```

### 7.3 性能监控
```bash
# 使用PM2监控
pm2 monit

# 查看日志
pm2 logs knowledge-base
```

## 8. 安全加固

### 8.1 防火墙配置
```bash
# 只开放必要端口
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp
ufw enable
```

### 8.2 环境变量安全
- 使用强随机JWT密钥
- 定期轮换API密钥
- 不要将密钥提交到版本控制

### 8.3 数据库安全
```sql
-- 创建专用数据库用户
CREATE USER kb_user WITH PASSWORD 'strong_password';
GRANT ALL PRIVILEGES ON DATABASE knowledge_base TO kb_user;

-- 限制访问
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO kb_user;
```

## 9. 故障排除

### 9.1 常见问题

**问题1: 数据库连接失败**
```bash
# 检查PostgreSQL服务状态
systemctl status postgresql

# 检查连接
psql -U postgres -d knowledge_base -c "SELECT 1"
```

**问题2: 向量扩展未安装**
```sql
-- 安装扩展
CREATE EXTENSION IF NOT EXISTS vector;
```

**问题3: 内存不足**
```bash
# 增加Node.js内存限制
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

### 9.2 日志查看
```bash
# PM2日志
pm2 logs

# Nginx日志
tail -f /var/log/nginx/error.log

# PostgreSQL日志
tail -f /var/log/postgresql/postgresql.log
```

## 10. 升级指南

### 10.1 应用升级
```bash
# 拉取最新代码
git pull origin main

# 安装依赖
npm install

# 数据库迁移
npm run db:migrate

# 重启服务
pm2 restart knowledge-base
```

### 10.2 数据库迁移
```bash
# 创建迁移
npx prisma migrate dev --name migration_name

# 应用迁移
npx prisma migrate deploy
```

---

文档版本: v2.0.0
