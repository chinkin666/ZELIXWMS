import { getApiBaseUrl } from '@/api/base'
import type { SetProduct, SetOrder } from '@/types/setProduct'

const getBase = () => `${getApiBaseUrl()}/set-products`

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || 'Request failed')
  }
  return res.json()
}

// ─── SetProduct CRUD ───

export async function fetchSetProducts(params?: { search?: string; isActive?: boolean }) {
  const url = new URL(getBase())
  if (params?.search) url.searchParams.append('search', params.search)
  if (params?.isActive !== undefined) url.searchParams.append('isActive', String(params.isActive))
  return apiFetch<SetProduct[]>(url.toString())
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
  return apiFetch<{ items: SetOrder[]; total: number; page: number; limit: number }>(url.toString())
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
