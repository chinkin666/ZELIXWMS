import { getApiBaseUrl } from '@/api/base'
import { apiFetch as rawApiFetch } from '@/api/http'

const getBase = () => `${getApiBaseUrl()}/api-logs`

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await rawApiFetch(url, init)
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Request failed')
  return res.json()
}

export interface ApiLogItem {
  readonly _id: string
  readonly apiName: string
  readonly action: string
  readonly status: 'pending' | 'running' | 'success' | 'error' | 'timeout'
  readonly requestUrl?: string
  readonly requestMethod?: string
  readonly statusCode?: number
  readonly processedCount: number
  readonly successCount: number
  readonly errorCount: number
  readonly message?: string
  readonly errorDetail?: string
  readonly referenceType?: string
  readonly referenceId?: string
  readonly referenceNumber?: string
  readonly startedAt?: string
  readonly completedAt?: string
  readonly durationMs?: number
  readonly metadata?: Record<string, unknown>
  readonly createdAt: string
  readonly updatedAt: string
}

export interface ApiLogStats {
  readonly totalCalls: number
  readonly successRate: number
  readonly avgDurationMs: number
  readonly errorTotal: number
  readonly byStatus: Record<string, number>
  readonly byApiName: ReadonlyArray<{
    readonly _id: string
    readonly total: number
    readonly successCount: number
    readonly errorCount: number
  }>
}

export interface FetchApiLogsParams {
  readonly apiName?: string
  readonly status?: string
  readonly dateFrom?: string
  readonly dateTo?: string
  readonly search?: string
  readonly page?: number
  readonly limit?: number
}

function appendParams(url: URL, params?: Record<string, unknown>): void {
  if (!params) return
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '' && v !== null) url.searchParams.append(k, String(v))
  }
}

export async function fetchApiLogs(params?: FetchApiLogsParams) {
  const url = new URL(getBase())
  appendParams(url, params as Record<string, unknown>)
  const json = await apiFetch<any>(url.toString())
  const data = json?.data ?? json?.items ?? (Array.isArray(json) ? json : [])
  return { data, total: json?.total ?? data.length, page: json?.page ?? 1, limit: json?.limit ?? 20 }
}

export async function fetchApiLog(id: string) {
  return apiFetch<ApiLogItem>(`${getBase()}/${id}`)
}

export async function fetchApiStats(params?: { dateFrom?: string; dateTo?: string }) {
  const url = new URL(`${getBase()}/stats`)
  appendParams(url, params as Record<string, unknown>)
  return apiFetch<ApiLogStats>(url.toString())
}

export async function exportApiLogs(params?: FetchApiLogsParams) {
  const url = new URL(`${getBase()}/export`)
  appendParams(url, params as Record<string, unknown>)
  return apiFetch<ApiLogItem[]>(url.toString())
}
