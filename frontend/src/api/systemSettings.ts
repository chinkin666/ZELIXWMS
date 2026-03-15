import { getApiBaseUrl } from '@/api/base'
import { apiFetch as rawApiFetch } from '@/api/http'

const getBase = () => `${getApiBaseUrl()}/system-settings`

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await rawApiFetch(url, init)
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Request failed')
  return res.json()
}

export interface SystemSettings {
  readonly _id?: string
  readonly settingsKey?: string

  // 入荷設定
  readonly inboundRequireInspection: boolean
  readonly inboundAutoCreateLot: boolean
  readonly inboundDefaultLocationCode: string

  // 在庫設定
  readonly inventoryAllowNegativeStock: boolean
  readonly inventoryDefaultSafetyStock: number
  readonly inventoryLotTrackingEnabled: boolean
  readonly inventoryExpiryAlertDays: number

  // 出荷設定
  readonly outboundAutoAllocate: boolean
  readonly outboundAllocationRule: 'FIFO' | 'FEFO' | 'LIFO'
  readonly outboundRequireInspection: boolean

  // バーコード設定
  readonly barcodeDefaultFormat: 'code128' | 'ean13' | 'code39' | 'qrcode'
  readonly barcodeScanMode: 'single' | 'continuous'

  // 一般設定
  readonly systemLanguage: string
  readonly timezone: string
  readonly dateFormat: string
  readonly pageSize: number

  readonly createdAt?: string
  readonly updatedAt?: string
}

export async function fetchSystemSettings(): Promise<SystemSettings> {
  return apiFetch<SystemSettings>(getBase())
}

export async function updateSystemSettings(data: Partial<SystemSettings>): Promise<SystemSettings> {
  return apiFetch<SystemSettings>(getBase(), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function resetSystemSettings(): Promise<SystemSettings> {
  return apiFetch<SystemSettings>(`${getBase()}/reset`, {
    method: 'POST',
  })
}
