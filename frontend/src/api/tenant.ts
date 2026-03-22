import { getApiBaseUrl } from '@/api/base'
import { apiFetch } from '@/api/http'

const API_BASE_URL = getApiBaseUrl()

export type TenantPlan = 'free' | 'starter' | 'standard' | 'pro' | 'enterprise'
export type TenantStatus = 'active' | 'suspended' | 'trial' | 'cancelled'

export interface Tenant {
  _id: string
  tenantCode: string
  name: string
  name2?: string
  plan: TenantPlan
  status: TenantStatus
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  postalCode?: string
  prefecture?: string
  city?: string
  address?: string
  maxUsers: number
  maxWarehouses: number
  maxClients: number
  trialExpiresAt?: string
  billingStartedAt?: string
  features: string[]
  settings: Record<string, unknown>
  isActive: boolean
  memo?: string
  createdAt: string
  updatedAt: string
}

export interface TenantListParams {
  search?: string
  status?: string
  plan?: string
  page?: number
  limit?: number
}

export interface TenantListResponse {
  data: Tenant[]
  total: number
}

export async function fetchTenants(params?: TenantListParams): Promise<TenantListResponse> {
  const url = new URL(`${API_BASE_URL}/admin/tenants`)
  if (params) {
    if (params.search) url.searchParams.append('search', params.search)
    if (params.status) url.searchParams.append('status', params.status)
    if (params.plan) url.searchParams.append('plan', params.plan)
    if (params.page) url.searchParams.append('page', String(params.page))
    if (params.limit) url.searchParams.append('limit', String(params.limit))
  }
  const response = await apiFetch(url.toString())
  if (!response.ok) {
    throw new Error(`テナントの取得に失敗しました: ${response.statusText}`)
  }
  const json = await response.json()
  const data = json?.data ?? json?.items ?? (Array.isArray(json) ? json : [])
  return { data, total: json?.total ?? data.length }
}

export async function fetchTenant(id: string): Promise<Tenant> {
  const response = await apiFetch(`${API_BASE_URL}/tenants/${id}`)
  if (!response.ok) {
    throw new Error(`テナントの取得に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function createTenant(data: Partial<Tenant>): Promise<Tenant> {
  const response = await apiFetch(`${API_BASE_URL}/admin/tenants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`テナントの作成に失敗しました: ${message}`)
  }
  return response.json()
}

export async function updateTenant(id: string, data: Partial<Tenant>): Promise<Tenant> {
  const response = await apiFetch(`${API_BASE_URL}/tenants/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`テナントの更新に失敗しました: ${message}`)
  }
  return response.json()
}

export async function deleteTenant(id: string): Promise<void> {
  const response = await apiFetch(`${API_BASE_URL}/tenants/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`テナントの削除に失敗しました: ${message}`)
  }
}

export async function updateTenantStatus(id: string, status: string): Promise<Tenant> {
  const response = await apiFetch(`${API_BASE_URL}/tenants/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`テナントのステータス変更に失敗しました: ${message}`)
  }
  return response.json()
}
