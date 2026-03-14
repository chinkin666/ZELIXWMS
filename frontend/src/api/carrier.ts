import type { Carrier, CarrierFilters, UpsertCarrierDto } from '@/types/carrier'

import { http } from '@/api/http'

/**
 * クエリパラメータを構築 / Build query params from filters
 */
function buildCarrierParams(filters?: CarrierFilters): Record<string, string> | undefined {
  if (!filters) return undefined
  const params: Record<string, string> = {}
  if (filters.code) params.code = filters.code
  if (filters.name) params.name = filters.name
  if (typeof filters.enabled === 'boolean') params.enabled = String(filters.enabled)
  return Object.keys(params).length > 0 ? params : undefined
}

/**
 * 配送業者一覧を取得 / Fetch carrier list
 * バックエンドAPIには組み込み配送業者が含まれている（リストの先頭に配置） / 后端API已包含内置配送业者（放在列表最前面）
 */
export function fetchCarriers(filters?: CarrierFilters): Promise<Carrier[]> {
  return http.get<Carrier[]>('/carriers', buildCarrierParams(filters))
}

/** 配送業者を作成 / Create carrier */
export function createCarrier(payload: UpsertCarrierDto): Promise<Carrier> {
  return http.post<Carrier>('/carriers', payload)
}

/** 配送業者を更新 / Update carrier */
export function updateCarrier(id: string, payload: UpsertCarrierDto): Promise<Carrier> {
  return http.put<Carrier>(`/carriers/${id}`, payload)
}

/** 配送業者を削除 / Delete carrier */
export function deleteCarrier(id: string): Promise<void> {
  return http.delete<void>(`/carriers/${id}`)
}
