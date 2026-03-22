import { getApiBaseUrl } from '@/api/base'
import { apiFetch as rawApiFetch } from '@/api/http'

const getBase = () => `${getApiBaseUrl()}/operation-logs`

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await rawApiFetch(url, init)
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Request failed')
  return res.json()
}

export interface OperationLogItem {
  readonly _id: string
  readonly action: string
  readonly category: string
  readonly description: string
  readonly productId?: string
  readonly productSku?: string
  readonly productName?: string
  readonly locationCode?: string
  readonly lotNumber?: string
  readonly quantity?: number
  readonly referenceType?: string
  readonly referenceId?: string
  readonly referenceNumber?: string
  readonly userName: string
  readonly ipAddress?: string
  readonly metadata?: Record<string, unknown>
  readonly createdAt: string
  readonly updatedAt: string
}

export interface FetchOperationLogsParams {
  readonly dateFrom?: string
  readonly dateTo?: string
  readonly action?: string
  readonly category?: string
  readonly search?: string
  readonly page?: number
  readonly limit?: number
}

export async function fetchOperationLogs(params?: FetchOperationLogsParams) {
  const url = new URL(getBase())
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '' && v !== null) url.searchParams.append(k, String(v))
    }
  }
  const json = await apiFetch<any>(url.toString())
  const data = json?.data ?? json?.items ?? (Array.isArray(json) ? json : [])
  return { data, total: json?.total ?? data.length, page: json?.page ?? 1, limit: json?.limit ?? 20 }
}

export async function exportOperationLogs(params?: FetchOperationLogsParams) {
  const url = new URL(`${getBase()}/export`)
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '' && v !== null) url.searchParams.append(k, String(v))
    }
  }
  return apiFetch<OperationLogItem[]>(url.toString())
}
