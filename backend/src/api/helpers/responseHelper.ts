/**
 * 統一レスポンスヘルパー / 统一响应辅助函数
 *
 * すべてのAPIエンドポイントで一貫したレスポンス形式を提供する
 * 为所有API端点提供一致的响应格式
 */
import type { Response } from 'express'

/** 成功レスポンス（単一）/ 成功响应（单个） */
export function sendSuccess<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ success: true, data })
}

/** 成功レスポンス（一覧）/ 成功响应（列表） */
export function sendList<T>(res: Response, items: T[], total: number, page: number, limit: number): void {
  res.json({ success: true, data: items, meta: { total, page, limit } })
}

/** エラーレスポンス / 错误响应 */
export function sendError(res: Response, message: string, status = 400, code?: string): void {
  res.status(status).json({ success: false, error: { code: code || 'ERROR', message } })
}
