/**
 * 分页参数守卫中间件 / ページネーションパラメータガードミドルウェア
 *
 * 解析并校验 limit 和 page 查询参数，防止恶意大数值请求。
 * limit と page クエリパラメータを解析・検証し、悪意のある大きな値のリクエストを防止する。
 */
import type { NextFunction, Request, Response } from 'express'

/** 最大允许的 limit 值 / 許可される limit の最大値 */
const MAX_LIMIT = 200

/** 默认 limit 值 / デフォルトの limit 値 */
const DEFAULT_LIMIT = 50

/** 默认页码 / デフォルトのページ番号 */
const DEFAULT_PAGE = 1

/**
 * 分页守卫中间件 / ページネーションガードミドルウェア
 *
 * - 将 limit 限制在 1~200 范围内 / limit を 1〜200 の範囲に制限
 * - 将 page 限制为 >= 1 / page を 1 以上に制限
 * - 将校验后的值写回 req.query / 検証済みの値を req.query に書き戻す
 */
export function paginationGuard(req: Request, _res: Response, next: NextFunction): void {
  const rawLimit = req.query.limit
  const rawPage = req.query.page

  if (rawLimit !== undefined) {
    const parsed = Number(rawLimit)
    const sanitized = Number.isNaN(parsed) || parsed < 1
      ? DEFAULT_LIMIT
      : Math.min(parsed, MAX_LIMIT)
    req.query.limit = String(Math.floor(sanitized))
  }

  if (rawPage !== undefined) {
    const parsed = Number(rawPage)
    const sanitized = Number.isNaN(parsed) || parsed < 1
      ? DEFAULT_PAGE
      : Math.floor(parsed)
    req.query.page = String(sanitized)
  }

  next()
}
