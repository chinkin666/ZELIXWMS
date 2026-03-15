/**
 * 租户辅助函数 / テナントヘルパー
 *
 * 从请求中提取租户 ID。认证用户使用令牌中的 tenantId，
 * 未认证时降级为 'default'（渐进式迁移用）。
 *
 * リクエストからテナント ID を取得する。認証済みユーザーはトークンの tenantId を使用し、
 * 未認証時は 'default' にフォールバック（段階的移行用）。
 */
import type { Request } from 'express'

/**
 * 获取请求的租户 ID / リクエストのテナント ID を取得
 *
 * 优先从 req.user（JWT 令牌）获取，未认证时返回 'default'。
 * req.user（JWT トークン）から優先取得し、未認証時は 'default' を返す。
 */
export function getTenantId(req: Request): string {
  return req.user?.tenantId || 'default'
}
