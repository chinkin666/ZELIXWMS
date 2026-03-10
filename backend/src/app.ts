import type { NextFunction, Request, Response } from 'express';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { loadEnv } from '@/config/env';
import { logger } from '@/lib/logger';
import { registerCoreRoutes } from '@/api/routes';

loadEnv();

export const createApp = () => {
  const app = express();

  // CORS 配置
  app.use(
    cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:4001',
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
      limit: '1gb',
    }),
  );
  app.use(
    express.urlencoded({
      extended: true,
      limit: '1gb',
    }),
  );
  app.use(morgan('dev'));

  // Serve uploaded files with 304 caching
  const env = loadEnv();
  app.use('/uploads', express.static(path.resolve(env.fileDir), {
    maxAge: '7d',
    etag: true,
    lastModified: true,
  }));

  registerCoreRoutes(app);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error(err, 'Unhandled error');
    console.error('=== ERROR DETAILS ===');
    console.error('Message:', err.message);
    console.error('Stack:', err.stack);
    console.error('=====================');
    res.status(500).json({
      message: 'Internal Server Error',
      error: process.env.NODE_ENV !== 'production' ? err.message : undefined,
      stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    });
  });

  return app;
};

