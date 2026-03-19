import http from 'http';
import { createApp } from '@/app';
import { loadEnv } from '@/config/env';
import { connectDatabase, disconnectDatabase } from '@/config/database';
import { checkTransactionSupport } from '@/config/database';
import { logger } from '@/lib/logger';
import { validateEnv } from '@/config/validateEnv';
import { extensionManager } from '@/core/extensions';
import { queueManager, registerWorkers } from '@/core/queue';
import { initGraphQL } from '@/graphql';
import { errorHandler, notFoundHandler } from '@/api/middleware/errorHandler';

const env = loadEnv();
const app = createApp();

const server = http.createServer(app);

// 优雅关闭超时（毫秒） / グレースフルシャットダウンタイムアウト（ミリ秒）
const SHUTDOWN_TIMEOUT_MS = 10_000;

/**
 * 优雅关闭处理 / グレースフルシャットダウン処理
 *
 * 按顺序关闭：HTTP サーバー → キュー → データベース
 * 順番に閉じる：HTTP サーバー → キュー → データベース
 */
let isShuttingDown = false;

async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info({ signal }, `Received ${signal}, starting graceful shutdown / ${signal} 受信、グレースフルシャットダウン開始`);

  // 强制超时保护 / 強制タイムアウト保護
  const forceTimer = setTimeout(() => {
    logger.error('Shutdown timeout exceeded, forcing exit / シャットダウンタイムアウト超過、強制終了');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);

  try {
    // 1. 停止接受新连接 / 新規接続の受付を停止
    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) {
          logger.error({ err }, 'Error closing HTTP server / HTTP サーバー閉鎖エラー');
          reject(err);
        } else {
          logger.info('HTTP server closed / HTTP サーバーを閉じました');
          resolve();
        }
      });
    });

    // 2. 关闭队列和 Redis / キューと Redis を閉じる
    try {
      await queueManager.shutdown();
      logger.info('Queue manager shut down / キューマネージャーをシャットダウンしました');
    } catch (err) {
      logger.warn({ err }, 'Error shutting down queue manager / キューマネージャーシャットダウンエラー');
    }

    // 3. 关闭数据库连接 / データベース接続を閉じる
    try {
      await disconnectDatabase();
      logger.info('Database disconnected / データベース切断完了');
    } catch (err) {
      logger.warn({ err }, 'Error disconnecting database / データベース切断エラー');
    }

    logger.info('Graceful shutdown complete / グレースフルシャットダウン完了');
    clearTimeout(forceTimer);
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'Error during graceful shutdown / グレースフルシャットダウン中にエラー発生');
    clearTimeout(forceTimer);
    process.exit(1);
  }
}

// シグナルハンドラー登録 / 信号处理器注册
process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => void gracefulShutdown('SIGINT'));

// 未捕获异常处理 / 未キャッチ例外処理
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception / 未キャッチ例外');
  void gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason }, 'Unhandled rejection / 未ハンドル Promise 拒否');
  void gracefulShutdown('unhandledRejection');
});

// 启动服务器前先连接数据库
async function startServer() {
  try {
    // 环境变量验证 / 環境変数バリデーション
    const envResult = validateEnv();
    if (!envResult.valid) {
      logger.error('Aborting startup due to environment validation errors / 環境変数バリデーションエラーのため起動を中止します');
      process.exit(1);
    }

    await connectDatabase();
    logger.info('Database connected successfully');

    // Check if transactions are supported (requires replica set)
    await checkTransactionSupport();

    // 初始化扩展系统 / 拡張システムを初期化
    await extensionManager.initialize();

    // 初始化队列系统（Redis 不可用时不阻塞）/ キューシステム初期化（Redis 不可用時はブロックしない）
    await queueManager.initialize().catch((err) => {
      logger.warn({ err }, 'QueueManager initialization skipped / キューマネージャー初期化をスキップ');
    });
    registerWorkers();

    // 初始化 GraphQL（/graphql エンドポイント）
    await initGraphQL(app).catch((err) => {
      logger.warn({ err }, 'GraphQL initialization skipped / GraphQL 初期化をスキップ');
    });

    // GraphQL 登録後に notFoundHandler / errorHandler を追加
    // GraphQL 登録後に notFoundHandler / errorHandler を追加
    app.use(notFoundHandler);
    app.use(errorHandler);

    server.listen(env.port, env.host, () => {
      logger.info(`API server listening on http://${env.host}:${env.port}`);
    });
  } catch (error) {
    logger.error(error, 'Failed to start server');
    process.exit(1);
  }
}

void startServer();
