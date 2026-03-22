import { getApiBaseUrl } from '@/api/base'
import { apiFetch as rawApiFetch } from '@/api/http'
import type { SetProduct, SetOrder } from '@/types/setProduct'

const getBase = () => `${getApiBaseUrl()}/set-products`

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await rawApiFetch(url, init)
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || 'Request failed')
  }
  return res.json()
}

// ─── SetProduct CRUD ───

export async function fetchSetProducts(params?: { search?: string; isActive?: boolean }): Promise<SetProduct[]> {
  const url = new URL(getBase())
  if (params?.search) url.searchParams.append('search', params.search)
  if (params?.isActive !== undefined) url.searchParams.append('isActive', String(params.isActive))
  // バックエンドがページネーション応答を返す場合の正規化 / 后端返回分页响应时的规范化
  const json = await apiFetch<any>(url.toString())
  return Array.isArray(json) ? json : (json?.items ?? json?.data ?? [])
}

export async function fetchSetProduct(id: string) {
  return apiFetch<SetProduct>(`${getBase()}/${id}`)
}

export async function createSetProduct(payload: {
  sku: string
  name: string
  components: Array<{ productId: string; sku: string; name: string; quantity: number }>
  memo?: string
}) {
  return apiFetch<SetProduct>(getBase(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function updateSetProduct(id: string, payload: Partial<{
  sku: string
  name: string
  components: Array<{ productId: string; sku: string; name: string; quantity: number }>
  isActive: boolean
  memo: string
}>) {
  return apiFetch<SetProduct>(`${getBase()}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function deleteSetProduct(id: string) {
  return apiFetch<{ message: string }>(`${getBase()}/${id}`, { method: 'DELETE' })
}

// ─── SetOrder ───

export async function createSetOrder(payload: {
  setProductId: string
  type: 'assembly' | 'disassembly'
  quantity: number
  stockCategory?: string
  desiredDate?: string
  lotNumber?: string
  expiryDate?: string
  memo?: string
}) {
  return apiFetch<SetOrder>(`${getBase()}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function fetchSetOrders(params?: {
  type?: string
  status?: string
  search?: string
  setSku?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}) {
  const url = new URL(`${getBase()}/orders/list`)
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '' && v !== null) url.searchParams.append(k, String(v))
    }
  }
  // バックエンドが items/data 形式どちらでも対応 / 兼容后端 items/data 两种格式
  const json = await apiFetch<any>(url.toString())
  const items = json?.items ?? json?.data ?? (Array.isArray(json) ? json : [])
  return { items, total: json?.total ?? items.length, page: json?.page ?? 1, limit: json?.limit ?? items.length }
}

export async function fetchSetOrder(id: string) {
  return apiFetch<SetOrder>(`${getBase()}/orders/${id}`)
}

export async function completeSetOrder(id: string, completedQuantity: number) {
  return apiFetch<SetOrder>(`${getBase()}/orders/${id}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completedQuantity }),
  })
}

export async function cancelSetOrder(id: string) {
  return apiFetch<SetOrder>(`${getBase()}/orders/${id}/cancel`, {
    method: 'POST',
  })
}
