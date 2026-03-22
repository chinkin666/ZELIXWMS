/**
 * FBA管理 API クライアント / FBA管理 API 客户端
 *
 * FBAプラン（納品プラン）の CRUD と状態遷移操作を提供
 * 提供FBA计划（纳品计划）的 CRUD 和状态转换操作
 */

import { http } from '@/api/http'

// ── 型定義 / 类型定义 ───────────────────────────────────────────────────────

/** FBAプラン状態 / FBA计划状态 */
export type FbaPlanStatus = 'draft' | 'confirmed' | 'shipped' | 'received' | 'cancelled'

/** FBAプラン商品行 / FBA计划商品行 */
export interface FbaPlanItem {
  readonly productId: string
  readonly sku: string
  readonly fnsku?: string
  readonly asin?: string
  readonly quantity: number
  readonly preparedQuantity: number
  readonly shippedQuantity: number
}

/** FBA納品プラン / FBA纳品计划 */
export interface FbaShipmentPlan {
  readonly _id: string
  readonly planNumber: string
  readonly status: FbaPlanStatus
  readonly amazonShipmentId?: string
  readonly destinationFc: string
  readonly items: FbaPlanItem[]
  readonly carrierId?: string
  readonly trackingNumber?: string
  readonly boxCount?: number
  readonly totalQuantity: number
  readonly shipDate?: string
  readonly memo?: string
  readonly createdAt: string
  readonly updatedAt: string
}

/** FBAプラン一覧レスポンス / FBA计划列表响应 */
export interface FbaPlansResponse {
  readonly data: FbaShipmentPlan[]
  readonly total: number
}

/** FBAプラン作成/更新DTO / FBA计划创建/更新DTO */
export interface UpsertFbaPlanDto {
  readonly destinationFc: string
  readonly items: ReadonlyArray<{
    readonly productId: string
    readonly sku: string
    readonly fnsku?: string
    readonly asin?: string
    readonly quantity: number
  }>
  readonly shipDate?: string
  readonly memo?: string
  readonly trackingNumber?: string
  readonly boxCount?: number
  readonly carrierId?: string
}

/** FBAプラン一覧取得パラメータ / FBA计划列表获取参数 */
export interface FbaPlansParams {
  readonly status?: FbaPlanStatus
  readonly page?: number
  readonly limit?: number
}

// ── API 関数 / API 函数 ──────────────────────────────────────────────────────

/** FBAプラン一覧を取得 / 获取FBA计划列表 */
export function fetchFbaPlans(params?: FbaPlansParams): Promise<FbaPlansResponse> {
  const query: Record<string, string> = {}
  if (params?.status) query.status = params.status
  if (params?.page) query.page = String(params.page)
  if (params?.limit) query.limit = String(params.limit)
  // バックエンドは /fba/shipment-plans を使用 / 后端使用 /fba/shipment-plans
  return http.get<FbaPlansResponse>('/fba/shipment-plans', Object.keys(query).length > 0 ? query : undefined)
}

/** FBAプランを作成 / 创建FBA计划 */
export function createFbaPlan(payload: UpsertFbaPlanDto): Promise<FbaShipmentPlan> {
  return http.post<FbaShipmentPlan>('/fba/shipment-plans', payload)
}

/** FBAプランを取得 / 获取FBA计划 */
export function getFbaPlan(id: string): Promise<FbaShipmentPlan> {
  return http.get<FbaShipmentPlan>(`/fba/shipment-plans/${id}`)
}

/** FBAプランを更新 / 更新FBA计划 */
export function updateFbaPlan(id: string, payload: UpsertFbaPlanDto): Promise<FbaShipmentPlan> {
  return http.put<FbaShipmentPlan>(`/fba/shipment-plans/${id}`, payload)
}

/** FBAプランを確定 / 确认FBA计划 */
export function confirmFbaPlan(id: string): Promise<FbaShipmentPlan> {
  return http.post<FbaShipmentPlan>(`/fba/shipment-plans/${id}/confirm`)
}

/** FBAプランを出荷 / 出货FBA计划 */
export function shipFbaPlan(id: string, payload?: { trackingNumber?: string; boxCount?: number }): Promise<FbaShipmentPlan> {
  return http.post<FbaShipmentPlan>(`/fba/shipment-plans/${id}/ship`, payload)
}

/** FBAプランを削除 / 删除FBA计划 */
export function deleteFbaPlan(id: string): Promise<void> {
  return http.delete<void>(`/fba/shipment-plans/${id}`)
}
