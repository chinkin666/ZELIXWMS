/**
 * paginationGuard ミドルウェアテスト / 分页守卫中间件测试
 *
 * limit の上限制限、page のバリデーション、不正な値のデフォルト化を検証。
 * 验证 limit 上限限制、page 验证、无效值的默认处理。
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'

import { paginationGuard } from '../paginationGuard'

// ─── ヘルパー / 辅助工具 ───

function createMockReq(query: Record<string, string> = {}): Request {
  return { query } as unknown as Request
}

describe('paginationGuard', () => {
  let res: Response
  let next: NextFunction

  beforeEach(() => {
    res = {} as Response
    next = vi.fn()
  })

  // limit が指定されない場合はそのまま / limit 未指定时保持原样
  it('should call next without modifying query when no limit/page', () => {
    const req = createMockReq({})

    paginationGuard(req, res, next)

    expect(req.query.limit).toBeUndefined()
    expect(req.query.page).toBeUndefined()
    expect(next).toHaveBeenCalledOnce()
  })

  // 正常な limit はそのまま / 正常的 limit 保持不变
  it('should keep valid limit as-is', () => {
    const req = createMockReq({ limit: '25' })

    paginationGuard(req, res, next)

    expect(req.query.limit).toBe('25')
  })

  // MAX_LIMIT (200) を超える limit はキャップ / 超过 MAX_LIMIT(200) 的 limit 被限制
  it('should cap limit at 200', () => {
    const req = createMockReq({ limit: '500' })

    paginationGuard(req, res, next)

    expect(req.query.limit).toBe('200')
  })

  // NaN limit はデフォルト 50 / NaN 的 limit 默认为 50
  it('should default limit to 50 when NaN', () => {
    const req = createMockReq({ limit: 'abc' })

    paginationGuard(req, res, next)

    expect(req.query.limit).toBe('50')
  })

  // 負の limit はデフォルト 50 / 负数 limit 默认为 50
  it('should default limit to 50 when negative', () => {
    const req = createMockReq({ limit: '-5' })

    paginationGuard(req, res, next)

    expect(req.query.limit).toBe('50')
  })

  // 正常な page はそのまま / 正常的 page 保持不变
  it('should keep valid page as-is', () => {
    const req = createMockReq({ page: '3' })

    paginationGuard(req, res, next)

    expect(req.query.page).toBe('3')
  })

  // 0 以下の page はデフォルト 1 / 0 以下的 page 默认为 1
  it('should default page to 1 when zero or negative', () => {
    const req = createMockReq({ page: '0' })

    paginationGuard(req, res, next)

    expect(req.query.page).toBe('1')
  })

  // 小数の limit は切り捨て / 小数的 limit 向下取整
  it('should floor decimal limit values', () => {
    const req = createMockReq({ limit: '25.9' })

    paginationGuard(req, res, next)

    expect(req.query.limit).toBe('25')
  })
})
