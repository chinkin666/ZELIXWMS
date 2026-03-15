import { getApiBaseUrl } from '@/api/base'
import { apiFetch } from '@/api/http'

const API_BASE_URL = getApiBaseUrl()

export interface Wave {
  _id: string
  waveNumber: string
  status: 'draft' | 'picking' | 'sorting' | 'packing' | 'completed' | 'cancelled'
  priority: 'urgent' | 'high' | 'normal' | 'low'
  warehouseId?: string
  clientId?: string
  shipmentIds: string[]
  assignedTo?: string
  assignedName?: string
  startedAt?: string
  completedAt?: string
  memo?: string
  createdAt: string
  updatedAt: string
}

export interface WaveListParams {
  search?: string
  status?: string
  priority?: string
  warehouseId?: string
  page?: number
  limit?: number
}

export interface WaveListResponse {
  data: Wave[]
  total: number
}

export async function fetchWaves(params?: WaveListParams): Promise<WaveListResponse> {
  const url = new URL(`${API_BASE_URL}/waves`)
  if (params) {
    if (params.search) url.searchParams.append('search', params.search)
    if (params.status) url.searchParams.append('status', params.status)
    if (params.priority) url.searchParams.append('priority', params.priority)
    if (params.warehouseId) url.searchParams.append('warehouseId', params.warehouseId)
    if (params.page) url.searchParams.append('page', String(params.page))
    if (params.limit) url.searchParams.append('limit', String(params.limit))
  }
  const response = await apiFetch(url.toString())
  if (!response.ok) {
    throw new Error(`ウェーブの取得に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function fetchWave(id: string): Promise<Wave> {
  const response = await apiFetch(`${API_BASE_URL}/waves/${id}`)
  if (!response.ok) {
    throw new Error(`ウェーブの取得に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function createWave(data: Partial<Wave>): Promise<Wave> {
  const response = await apiFetch(`${API_BASE_URL}/waves`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`ウェーブの作成に失敗しました: ${message}`)
  }
  return response.json()
}

export async function updateWave(id: string, data: Partial<Wave>): Promise<Wave> {
  const response = await apiFetch(`${API_BASE_URL}/waves/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`ウェーブの更新に失敗しました: ${message}`)
  }
  return response.json()
}

export async function deleteWave(id: string): Promise<void> {
  const response = await apiFetch(`${API_BASE_URL}/waves/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`ウェーブの削除に失敗しました: ${message}`)
  }
}

export async function startWave(id: string): Promise<Wave> {
  const response = await apiFetch(`${API_BASE_URL}/waves/${id}/start`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`ウェーブの開始に失敗しました: ${message}`)
  }
  return response.json()
}

export async function completeWave(id: string): Promise<Wave> {
  const response = await apiFetch(`${API_BASE_URL}/waves/${id}/complete`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`ウェーブの完了に失敗しました: ${message}`)
  }
  return response.json()
}
