/**
 * レートリミット中間件 / 速率限制中间件
 *
 * API 保護のためのレート制限。
 * API 保护的速率限制。
 *
 * 3 つのプリセット / 3 个预设:
 * - globalLimiter: 全 API（1000 req/15min）
 * - authLimiter: 認証エンドポイント（20 req/15min）
 * - writeLimiter: 書き込み操作（200 req/15min）
 */

import rateLimit from 'express-rate-limit';

/**
 * 全 API 共通レートリミット / 全 API 通用速率限制
 * 1000 requests per 15 minutes per IP
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many requests, please try again later / リクエストが多すぎます。しばらくしてから再試行してください',
  },
  skip: (req) => {
    // ヘルスチェックはスキップ / 健康检查跳过
    return req.path === '/health';
  },
});

/**
 * 認証エンドポイント用の厳格なリミット / 认证端点的严格限制
 * 20 requests per 15 minutes per IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many login attempts, please try again later / ログイン試行が多すぎます。しばらくしてから再試行してください',
  },
});

/**
 * 書き込み操作用のリミット / 写操作限制
 * 200 requests per 15 minutes per IP
 */
export const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many write requests, please try again later / 書き込みリクエストが多すぎます',
  },
});
