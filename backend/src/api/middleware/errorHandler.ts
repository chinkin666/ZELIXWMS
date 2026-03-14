/**
 * 全局错误处理中间件 / グローバルエラーハンドリングミドルウェア
 *
 * 捕获所有未处理错误并返回统一 JSON 格式。
 * 全ての未処理エラーをキャッチし、統一 JSON 形式で返却する。
 */
import type { NextFunction, Request, Response } from 'express'
import { AppError } from '@/lib/errors'
import { logger } from '@/lib/logger'

const isProd = process.env.NODE_ENV === 'production'

/**
 * 将 Mongoose 错误转换为 AppError 格式 / Mongoose エラーを AppError 形式に変換
 */
function normalizeMongooseError(err: Record<string, unknown>): AppError | null {
  // Mongoose ValidationError / Mongoose バリデーションエラー
  if (err.name === 'ValidationError' && err.errors) {
    const details: Record<string, string> = {}
    const errors = err.errors as Record<string, { message: string }>
    for (const [field, fieldError] of Object.entries(errors)) {
      details[field] = fieldError.message
    }
    return new AppError('Validation failed', 400, 'VALIDATION_ERROR', details)
  }

  // MongoDB 重复键错误 / MongoDB 重複キーエラー (code 11000)
  if (err.code === 11000) {
    const keyValue = (err.keyValue as Record<string, unknown>) ?? {}
    const fields = Object.keys(keyValue).join(', ')
    return new AppError(
      `Duplicate value for: ${fields}`,
      409,
      'CONFLICT',
      { keyValue },
    )
  }

  // Mongoose CastError / Mongoose キャストエラー
  if (err.name === 'CastError') {
    return new AppError(
      `Invalid value for ${err.path ?? 'field'}: ${err.value}`,
      400,
      'VALIDATION_ERROR',
      { path: err.path, value: err.value },
    )
  }

  return null
}

/**
 * 404 路由未匹配处理 / 未マッチルートの 404 ハンドラー
 */
export function notFoundHandler(_req: Request, res: Response, _next: NextFunction): void {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route not found: ${_req.method} ${_req.originalUrl}`,
    },
  })
}

/**
 * 统一错误处理中间件 / 統一エラーハンドリングミドルウェア
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // 如果是自定义 AppError，直接使用 / AppError の場合はそのまま使用
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined && { details: err.details }),
      },
    })
    return
  }

  // 尝试将 Mongoose 错误转换 / Mongoose エラーの変換を試みる
  const mongooseError = normalizeMongooseError(err as unknown as Record<string, unknown>)
  if (mongooseError) {
    res.status(mongooseError.statusCode).json({
      success: false,
      error: {
        code: mongooseError.code,
        message: mongooseError.message,
        ...(mongooseError.details !== undefined && { details: mongooseError.details }),
      },
    })
    return
  }

  // 未知错误 → 500 / 不明なエラー → 500
  logger.error(err, 'Unhandled error')

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: isProd ? 'Internal Server Error' : err.message,
      // 生产环境不泄露堆栈 / 本番環境ではスタックトレースを漏洩させない
      ...(!isProd && { details: err.stack }),
    },
  })
}
