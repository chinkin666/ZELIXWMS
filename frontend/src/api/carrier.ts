import type { Carrier, CarrierFilters, UpsertCarrierDto } from '@/types/carrier'

import { getApiBaseUrl } from '@/api/base'

const API_BASE_URL = getApiBaseUrl()

const buildQueryUrl = (filters?: CarrierFilters): string => {
  const url = new URL(`${API_BASE_URL}/carriers`)
  if (filters) {
    if (filters.code) url.searchParams.append('code', filters.code)
    if (filters.name) url.searchParams.append('name', filters.name)
    if (typeof filters.enabled === 'boolean') url.searchParams.append('enabled', String(filters.enabled))
  }
  return url.toString()
}

/**
 * 获取配送会社列表
 * 后端API已包含内置配送会社（放在列表最前面）
 */
export async function fetchCarriers(filters?: CarrierFilters): Promise<Carrier[]> {
  const response = await fetch(buildQueryUrl(filters))
  if (!response.ok) {
    throw new Error(`配送会社の取得に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function createCarrier(payload: UpsertCarrierDto): Promise<Carrier> {
  const response = await fetch(`${API_BASE_URL}/carriers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`配送会社の作成に失敗しました: ${message}`)
  }
  return response.json()
}

export async function updateCarrier(id: string, payload: UpsertCarrierDto): Promise<Carrier> {
  const response = await fetch(`${API_BASE_URL}/carriers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`配送会社の更新に失敗しました: ${message}`)
  }
  return response.json()
}

export async function deleteCarrier(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/carriers/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`配送会社の削除に失敗しました: ${message}`)
  }
}







