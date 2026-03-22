/**
 * RSL管理 API クライアント / RSL管理 API 客户端
 *
 * RSLプラン（楽天スーパーロジスティクス納品プラン）の CRUD と状態遷移操作を提供
 * 提供RSL计划（乐天超级物流纳品计划）的 CRUD 和状态转换操作
 */

import { http } from '@/api/http'

// ── 型定義 / 类型定义 ───────────────────────────────────────────────────────

/** RSLプラン状態 / RSL计划状态 */
export type RslPlanStatus = 'draft' | 'confirmed' | 'shipped' | 'received' | 'cancelled'

/** RSLプラン商品行 / RSL计划商品行 */
export interface RslPlanItem {
  readonly productId: string
  readonly sku: string
  readonly rakutenSku?: string
  readonly quantity: number
  readonly preparedQuantity: number
  readonly shippedQuantity: number
}

/** RSL納品プラン / RSL纳品计划 */
export interface RslShipmentPlan {
  readonly _id: string
  readonly planNumber: string
  readonly status: RslPlanStatus
  readonly rakutenShipmentId?: string
  readonly destinationWarehouse: string
  readonly items: RslPlanItem[]
  readonly carrierId?: string
  readonly trackingNumber?: string
  readonly boxCount?: number
  readonly totalQuantity: number
  readonly shipDate?: string
  readonly memo?: string
  readonly createdAt: string
  readonly updatedAt: string
}

/** RSLプラン一覧レスポンス / RSL计划列表响应 */
export interface RslPlansResponse {
  readonly data: RslShipmentPlan[]
  readonly total: number
}

/** RSLプラン作成/更新DTO / RSL计划创建/更新DTO */
export interface UpsertRslPlanDto {
  readonly destinationWarehouse: string
  readonly items: ReadonlyArray<{
    readonly productId: string
    readonly sku: string
    readonly rakutenSku?: string
    readonly quantity: number
  }>
  readonly shipDate?: string
  readonly memo?: string
  readonly trackingNumber?: string
  readonly boxCount?: number
  readonly carrierId?: string
}

/** RSLプラン一覧取得パラメータ / RSL计划列表获取参数 */
export interface RslPlansParams {
  readonly status?: RslPlanStatus
  readonly page?: number
  readonly limit?: number
}

// ── API 関数 / API 函数 ──────────────────────────────────────────────────────

/** RSLプラン一覧を取得 / 获取RSL计划列表 */
export async function fetchRslPlans(params?: RslPlansParams): Promise<RslPlansResponse> {
  const query: Record<string, string> = {}
  if (params?.status) query.status = params.status
  if (params?.page) query.page = String(params.page)
  if (params?.limit) query.limit = String(params.limit)
  const json = await http.get<any>('/rsl/plans', Object.keys(query).length > 0 ? query : undefined)
  // バックエンドが items/data 形式どちらでも対応 / 兼容后端 items/data 两种格式
  const items = json?.data ?? json?.items ?? (Array.isArray(json) ? json : [])
  return { data: items, total: json?.total ?? items.length }
}

/** RSLプランを作成 / 创建RSL计划 */
export function createRslPlan(payload: UpsertRslPlanDto): Promise<RslShipmentPlan> {
  return http.post<RslShipmentPlan>('/rsl/plans', payload)
}

/** RSLプランを取得 / 获取RSL计划 */
export function getRslPlan(id: string): Promise<RslShipmentPlan> {
  return http.get<RslShipmentPlan>(`/rsl/plans/${id}`)
}

/** RSLプランを更新 / 更新RSL计划 */
export function updateRslPlan(id: string, payload: UpsertRslPlanDto): Promise<RslShipmentPlan> {
  return http.put<RslShipmentPlan>(`/rsl/plans/${id}`, payload)
}

/** RSLプランを確定 / 确认RSL计划 */
export function confirmRslPlan(id: string): Promise<RslShipmentPlan> {
  return http.post<RslShipmentPlan>(`/rsl/plans/${id}/confirm`)
}

/** RSLプランを出荷 / 出货RSL计划 */
export function shipRslPlan(id: string, payload?: { trackingNumber?: string; boxCount?: number }): Promise<RslShipmentPlan> {
  return http.post<RslShipmentPlan>(`/rsl/plans/${id}/ship`, payload)
}

/** RSLプランを削除 / 删除RSL计划 */
export function deleteRslPlan(id: string): Promise<void> {
  return http.delete<void>(`/rsl/plans/${id}`)
}
