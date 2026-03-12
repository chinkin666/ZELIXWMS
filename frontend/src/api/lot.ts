import { getApiBaseUrl } from '@/api/base'
import type { Lot, LotDetail, ExpiryAlert } from '@/types/inventory'

const getBase = () => `${getApiBaseUrl()}/lots`

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Request failed')
  return res.json()
}

export async function fetchLots(params?: {
  productId?: string
  status?: string
  search?: string
  page?: number
  limit?: number
}) {
  const url = new URL(getBase())
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '' && v !== null) url.searchParams.append(k, String(v))
    }
  }
  return apiFetch<{ items: Lot[]; total: number; page: number; limit: number }>(url.toString())
}

export async function fetchLot(id: string) {
  return apiFetch<LotDetail>(`${getBase()}/${id}`)
}

export async function createLot(payload: {
  lotNumber: string
  productId: string
  expiryDate?: string
  manufactureDate?: string
  status?: string
  memo?: string
}) {
  return apiFetch<Lot>(getBase(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function updateLot(id: string, payload: {
  expiryDate?: string | null
  manufactureDate?: string | null
  status?: string
  memo?: string
}) {
  return apiFetch<Lot>(`${getBase()}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function deleteLot(id: string) {
  const res = await fetch(`${getBase()}/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to delete')
}

export async function fetchExpiryAlerts(daysAhead?: number) {
  const url = new URL(`${getBase()}/expiry-alerts`)
  if (daysAhead !== undefined) url.searchParams.append('daysAhead', String(daysAhead))
  return apiFetch<{ alerts: ExpiryAlert[]; daysAhead: number }>(url.toString())
}

export async function updateExpiredLots() {
  return apiFetch<{ message: string; modifiedCount: number }>(`${getBase()}/update-expired`, {
    method: 'POST',
  })
}
