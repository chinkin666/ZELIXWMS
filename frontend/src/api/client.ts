import { getApiBaseUrl } from '@/api/base'
import { apiFetch } from '@/api/http'

const API_BASE_URL = getApiBaseUrl()

export interface Client {
  _id: string
  clientCode: string
  name: string
  name2?: string
  contactName?: string
  postalCode?: string
  prefecture?: string
  city?: string
  address?: string
  address2?: string
  phone?: string
  email?: string
  plan?: 'free' | 'standard' | 'pro' | 'enterprise'
  billingEnabled?: boolean
  memo?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ClientListParams {
  search?: string
  page?: number
  limit?: number
  isActive?: string
}

export interface ClientListResponse {
  data: Client[]
  total: number
}

export async function fetchClients(params?: ClientListParams): Promise<ClientListResponse> {
  const url = new URL(`${API_BASE_URL}/clients`)
  if (params) {
    if (params.search) url.searchParams.append('search', params.search)
    if (params.page) url.searchParams.append('page', String(params.page))
    if (params.limit) url.searchParams.append('limit', String(params.limit))
    if (params.isActive !== undefined) url.searchParams.append('isActive', params.isActive)
  }
  const response = await apiFetch(url.toString())
  if (!response.ok) {
    throw new Error(`顧客の取得に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function fetchClient(id: string): Promise<Client> {
  const response = await apiFetch(`${API_BASE_URL}/clients/${id}`)
  if (!response.ok) {
    throw new Error(`顧客の取得に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function createClient(data: Partial<Client>): Promise<Client> {
  const response = await apiFetch(`${API_BASE_URL}/clients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`顧客の作成に失敗しました: ${message}`)
  }
  return response.json()
}

export async function updateClient(id: string, data: Partial<Client>): Promise<Client> {
  const response = await apiFetch(`${API_BASE_URL}/clients/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`顧客の更新に失敗しました: ${message}`)
  }
  return response.json()
}

export async function deleteClient(id: string): Promise<void> {
  const response = await apiFetch(`${API_BASE_URL}/clients/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`顧客の削除に失敗しました: ${message}`)
  }
}

export async function exportClients(): Promise<Client[]> {
  const response = await apiFetch(`${API_BASE_URL}/clients/export`)
  if (!response.ok) {
    throw new Error(`顧客のエクスポートに失敗しました: ${response.statusText}`)
  }
  return response.json()
}
