import { getApiBaseUrl } from '@/api/base'
import { apiFetch as rawApiFetch } from '@/api/http'

const getBase = () => `${getApiBaseUrl()}/wms-schedules`

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await rawApiFetch(url, init)
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Request failed')
  return res.json()
}

function appendParams(url: URL, params?: Record<string, unknown>): void {
  if (!params) return
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '' && v !== null) url.searchParams.append(k, String(v))
  }
}

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface WmsSchedule {
  readonly _id: string
  readonly name: string
  readonly action: string
  readonly description?: string
  readonly isEnabled: boolean
  readonly scheduleType: 'manual' | 'scheduled'
  readonly cronExpression?: string
  readonly cronHour?: number
  readonly cronMinute?: number
  readonly cronDaysOfWeek: readonly number[]
  readonly skipHolidays: boolean
  readonly lastRunAt?: string
  readonly nextRunAt?: string
  readonly runCount: number
  readonly metadata?: Record<string, unknown>
  readonly createdAt: string
  readonly updatedAt: string
}

export interface WmsTask {
  readonly _id: string
  readonly taskNumber: string
  readonly scheduleId?: string
  readonly scheduleName?: string
  readonly action: string
  readonly status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
  readonly processedCount: number
  readonly successCount: number
  readonly errorCount: number
  readonly message?: string
  readonly errors: readonly string[]
  readonly startedAt?: string
  readonly completedAt?: string
  readonly durationMs?: number
  readonly triggeredBy: string
  readonly userName: string
  readonly createdAt: string
  readonly updatedAt: string
}

export interface WmsScheduleLog {
  readonly _id: string
  readonly scheduleId?: string
  readonly taskId?: string
  readonly taskNumber?: string
  readonly action: string
  readonly event: string
  readonly message?: string
  readonly userName: string
  readonly createdAt: string
  readonly updatedAt: string
}

export interface WmsScheduleFormData {
  readonly name: string
  readonly action: string
  readonly description?: string
  readonly isEnabled?: boolean
  readonly scheduleType: 'manual' | 'scheduled'
  readonly cronExpression?: string
  readonly cronHour?: number
  readonly cronMinute?: number
  readonly cronDaysOfWeek?: readonly number[]
  readonly skipHolidays?: boolean
  readonly metadata?: Record<string, unknown>
}

export interface FetchWmsTasksParams {
  readonly status?: string
  readonly scheduleId?: string
  readonly dateFrom?: string
  readonly dateTo?: string
  readonly page?: number
  readonly limit?: number
}

export interface FetchWmsLogsParams {
  readonly action?: string
  readonly event?: string
  readonly dateFrom?: string
  readonly dateTo?: string
  readonly page?: number
  readonly limit?: number
}

// ---------------------------------------------------------------------------
// Schedule CRUD
// ---------------------------------------------------------------------------

export async function fetchWmsSchedules() {
  return apiFetch<{ data: WmsSchedule[]; total: number }>(getBase())
}

export async function fetchWmsSchedule(id: string) {
  return apiFetch<WmsSchedule>(`${getBase()}/${id}`)
}

export async function createWmsSchedule(data: WmsScheduleFormData) {
  return apiFetch<WmsSchedule>(getBase(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function updateWmsSchedule(id: string, data: Partial<WmsScheduleFormData>) {
  return apiFetch<WmsSchedule>(`${getBase()}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function deleteWmsSchedule(id: string) {
  return apiFetch<{ message: string }>(`${getBase()}/${id}`, { method: 'DELETE' })
}

export async function runWmsSchedule(id: string) {
  return apiFetch<WmsTask>(`${getBase()}/${id}/run`, { method: 'POST' })
}

export async function toggleWmsSchedule(id: string) {
  return apiFetch<WmsSchedule>(`${getBase()}/${id}/toggle`, { method: 'POST' })
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export async function fetchWmsTasks(params?: FetchWmsTasksParams) {
  const url = new URL(`${getBase()}/tasks`)
  appendParams(url, params as Record<string, unknown>)
  return apiFetch<{ data: WmsTask[]; total: number; page: number; limit: number }>(url.toString())
}

export async function fetchWmsTask(id: string) {
  return apiFetch<WmsTask>(`${getBase()}/tasks/${id}`)
}

// ---------------------------------------------------------------------------
// Logs
// ---------------------------------------------------------------------------

export async function fetchWmsLogs(params?: FetchWmsLogsParams) {
  const url = new URL(`${getBase()}/logs`)
  appendParams(url, params as Record<string, unknown>)
  return apiFetch<{ data: WmsScheduleLog[]; total: number; page: number; limit: number }>(url.toString())
}

export async function exportWmsLogs(params?: FetchWmsLogsParams) {
  const url = new URL(`${getBase()}/logs/export`)
  appendParams(url, params as Record<string, unknown>)
  return apiFetch<WmsScheduleLog[]>(url.toString())
}
