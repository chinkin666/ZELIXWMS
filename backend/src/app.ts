import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import { loadEnv } from '@/config/env';
import { registerCoreRoutes } from '@/api/routes';
import { extensionManager } from '@/core/extensions';
import { errorHandler, notFoundHandler } from '@/api/middleware/errorHandler';
import { paginationGuard } from '@/api/middleware/paginationGuard';
import { swaggerSpec } from '@/config/swagger';
import { optionalAuth } from '@/api/middleware/auth';

loadEnv();

export const createApp = () => {
  const app = express();

  // CORS 配置 / CORS 設定
  // 允许的来源从环境变量读取（逗号分隔）/ 許可オリジンを環境変数から取得（カンマ区切り）
  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:4001'];
  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
  app.use(
    express.json({
      limit: '10mb',
    }),
  );
  app.use(
    express.urlencoded({
      extended: true,
      limit: '10mb',
    }),
  );
  app.use(morgan('dev'));

  // 可选认证（全局）：提取 JWT 用户信息但不阻止未认证请求
  // オプション認証（グローバル）：JWT ユーザー情報を抽出するが未認証リクエストは阻止しない
  app.use(optionalAuth);

  // 分页参数守卫（全局） / ページネーションガード（グローバル）
  app.use(paginationGuard);

  // Serve uploaded files with 304 caching
  const env = loadEnv();
  app.use('/uploads', express.static(path.resolve(env.fileDir), {
    maxAge: '7d',
    etag: true,
    lastModified: true,
  }));

  registerCoreRoutes(app);

  // Swagger UI / API ドキュメント
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec));

  // 插件自定义 API 路由 / プラグインカスタム API ルート
  // 插件通过 registerAPI() 注册的路由挂载到 /api/plugins/{name}/*
  app.use('/api/plugins', extensionManager.getPluginManager().getRouter());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // 未匹配路由处理 / 未マッチルートハンドラー
  app.use(notFoundHandler);

  // 全局错误处理 / グローバルエラーハンドラー
  app.use(errorHandler);

  return app;
};

