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

/**
 * ユーザーのアクセス可能な倉庫IDリストを取得 / 获取用户可访问的仓库ID列表
 *
 * - admin/manager: 全倉庫アクセス可（空配列 = フィルタなし）
 *   admin/manager: 可访问所有仓库（空数组 = 无过滤）
 * - operator/viewer: warehouseIds に制限（設定されている場合）
 *   operator/viewer: 限制在 warehouseIds（如果已设置）
 * - フロントの倉庫セレクター選択値も考慮
 *   也考虑前端仓库选择器的值
 */
export function getWarehouseFilter(req: Request): string[] {
  const role = req.user?.role
  // admin/manager は全倉庫 / admin/manager 全仓库
  if (!role || role === 'admin' || (role as string) === 'super_admin' || role === 'manager') {
    // フロントの倉庫セレクターヘッダーがある場合はそれを使用
    // 如果有前端仓库选择器header则使用
    const selectedWh = req.headers['x-warehouse-id'] as string | undefined
    if (selectedWh && selectedWh.trim()) {
      return [selectedWh.trim()]
    }
    return []
  }

  // operator/viewer/client: warehouseIds で制限 / 按 warehouseIds 限制
  const userWarehouses = req.user?.warehouseIds || []
  if (userWarehouses.length === 0) return [] // 未設定 = 全倉庫 / 未设置 = 全仓库

  // フロントの選択値が userWarehouses 内であればそれだけに絞る
  // 如果前端选择的值在 userWarehouses 内则只过滤该仓库
  const selectedWh = req.headers['x-warehouse-id'] as string | undefined
  if (selectedWh && userWarehouses.includes(selectedWh)) {
    return [selectedWh]
  }

  return userWarehouses
}
