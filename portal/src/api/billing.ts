import { http } from './http'

export function getBillingOverview(params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  return http.get<any>(`/work-charges/summary${qs}`)
}

export function getWorkCharges(params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  return http.get<{ data: any[]; total: number }>(`/work-charges${qs}`)
}
