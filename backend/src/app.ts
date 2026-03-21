import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { randomUUID } from 'crypto';
import swaggerUi from 'swagger-ui-express';
import { loadEnv } from '@/config/env';
import { registerCoreRoutes } from '@/api/routes';
import { extensionManager } from '@/core/extensions';
import { errorHandler, notFoundHandler } from '@/api/middleware/errorHandler';
import { paginationGuard } from '@/api/middleware/paginationGuard';
import { requestTimer } from '@/api/middleware/requestTimer';
import { swaggerSpec } from '@/config/swagger';
import { optionalAuth } from '@/api/middleware/auth';
import { globalLimiter } from '@/api/middleware/rateLimit';
import { healthRouter } from '@/api/routes/health';

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
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Warehouse-Id'],
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
  // リクエストID付与（ログ相関用）/ 请求ID（日志关联用）
  app.use((req, _res, next) => {
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();
    req.headers['x-request-id'] = requestId;
    _res.setHeader('X-Request-ID', requestId);
    next();
  });

  // 本番は combined フォーマット、開発は dev / 生产用 combined 格式，开发用 dev
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  // 请求计时 / リクエストタイマー（レスポンスタイム計測 + 遅延検出）
  app.use(requestTimer);

  // レートリミット / 速率限制
  app.use(globalLimiter);

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

  // Swagger UI は本番環境では無効化 / Swagger UI 在生产环境禁用
  if (process.env.NODE_ENV !== 'production') {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
      customSiteTitle: 'ZELIX WMS API Docs',
    }));
    app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec));
  }

  // 插件自定义 API 路由 / プラグインカスタム API ルート
  // 插件通过 registerAPI() 注册的路由挂载到 /api/plugins/{name}/*
  app.use('/api/plugins', extensionManager.getPluginManager().getRouter());

  // 健康检查（认证不要） / ヘルスチェック（認証不要）
  app.use('/health', healthRouter);

  // notFoundHandler / errorHandler は server.ts で GraphQL 登録後に追加
  // notFoundHandler / errorHandler は server.ts で GraphQL 登録後に追加

  return app;
};

