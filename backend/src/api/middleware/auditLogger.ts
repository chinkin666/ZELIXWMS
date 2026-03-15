import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

/**
 * 操作監査ミドルウェア / 操作审计中间件
 *
 * 全 POST/PUT/DELETE リクエストを自動記録する。
 * 自动记录所有 POST/PUT/DELETE 请求。
 *
 * 脱敏: password, token, secret フィールドを '***' に置換。
 * 脱敏: password, token, secret 字段替换为 '***'。
 */

const SENSITIVE_FIELDS = ['password', 'token', 'secret', 'accessKey', 'secretKey'];

function sanitize(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  const result = { ...obj };
  for (const key of Object.keys(result)) {
    if (SENSITIVE_FIELDS.some((f) => key.toLowerCase().includes(f.toLowerCase()))) {
      result[key] = '***';
    }
  }
  return result;
}

let auditCol: mongoose.Collection | null = null;
function getCollection(): mongoose.Collection {
  if (!auditCol) auditCol = mongoose.connection.collection('audit_logs');
  return auditCol;
}

export function auditLogger(req: Request, res: Response, next: NextFunction): void {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    next();
    return;
  }

  const startTime = Date.now();

  // finish イベントで非同期記録 / finish 事件异步记录
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const user = (req as any).user;
    try {
      getCollection().insertOne({
        timestamp: new Date(),
        tenantId: (req.headers['x-tenant-id'] as string) || 'default',
        userId: user?.id || user?.email || 'anonymous',
        userName: user?.displayName || '',
        method: req.method,
        path: req.originalUrl || req.url,
        statusCode: res.statusCode,
        requestBody: sanitize(req.body),
        duration,
        ip: req.ip || req.socket?.remoteAddress || '',
        userAgent: req.headers['user-agent'] || '',
      }).catch(() => {});
    } catch { /* ignore */ }
  });

  next();
}
