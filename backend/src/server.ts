import http from 'http';
import { createApp } from '@/app';
import { loadEnv } from '@/config/env';
import { connectDatabase, checkTransactionSupport } from '@/config/database';
import { logger } from '@/lib/logger';
import { extensionManager } from '@/core/extensions';

const env = loadEnv();
const app = createApp();

const server = http.createServer(app);

// 启动服务器前先连接数据库
async function startServer() {
  try {
    await connectDatabase();
    logger.info('Database connected successfully');

    // Check if transactions are supported (requires replica set)
    await checkTransactionSupport();

    // 初始化扩展系统 / 拡張システムを初期化
    await extensionManager.initialize();

    server.listen(env.port, env.host, () => {
      logger.info(`API server listening on http://${env.host}:${env.port}`);
    });
  } catch (error) {
    logger.error(error, 'Failed to start server');
    process.exit(1);
  }
}

void startServer();

