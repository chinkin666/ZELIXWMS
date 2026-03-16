import { http } from './http'

export interface ServiceRate {
  _id: string
  chargeType: string
  name: string
  unit: string
  unitPrice: number
  clientId?: string
}

export function listServiceRates(params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  return http.get<{ data: ServiceRate[] }>(`/service-rates${qs}`)
}
