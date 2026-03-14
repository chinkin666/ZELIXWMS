/**
 * 佐川急便 API 客户端 / 佐川急便 API クライアント
 *
 * e飛伝 CSV 出力・追跡番号取込・送り状種類取得。
 * プラグイン API 经由（/api/plugins/sagawa-express/*）
 */

import { getApiBaseUrl } from '@/api/base'

const API_BASE_URL = getApiBaseUrl()
// 插件 API 路径 / プラグイン API パス
const SAGAWA_API = `${API_BASE_URL}/plugins/sagawa-express`

/** 佐川送り状種類 / 佐川送り状種類 */
export interface SagawaInvoiceType {
  invoiceType: string
  name: string
}

/** CSV 出力パラメータ / CSV 出力パラメータ */
export interface SagawaExportParams {
  orderIds: string[]
  config?: {
    billingCode?: string
    defaultInvoiceType?: string
    defaultSize?: string
  }
}

/** 追跡番号取込結果 / 追跡番号取込結果 */
export interface SagawaTrackingImportResult {
  total: number
  updated: number
  skipped: number
}

/**
 * 佐川 CSV 出力 / 佐川 CSV エクスポート
 * POST /api/carriers/sagawa/export
 */
export async function exportSagawaCsv(params: SagawaExportParams): Promise<Blob> {
  const response = await fetch(`${SAGAWA_API}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error || response.statusText)
  }
  return response.blob()
}

/**
 * 追跡番号取込 / 追跡番号インポート
 * POST /api/carriers/sagawa/import-tracking
 */
export async function importSagawaTracking(csvContent: string): Promise<SagawaTrackingImportResult> {
  const response = await fetch(`${SAGAWA_API}/import-tracking`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ csvContent }),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error || response.statusText)
  }
  return response.json()
}

/**
 * 送り状種類取得 / 送り状種類取得
 * GET /api/carriers/sagawa/invoice-types
 */
export async function fetchSagawaInvoiceTypes(): Promise<SagawaInvoiceType[]> {
  const response = await fetch(`${SAGAWA_API}/invoice-types`)
  if (!response.ok) {
    throw new Error(`送り状種類の取得に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

/** 插件配置 / プラグイン設定 */
export interface SagawaPluginConfig {
  billingCode: string
  defaultInvoiceType: string
  defaultSize: string
}

/**
 * 获取插件配置 / プラグイン設定を取得
 * GET /api/plugins/sagawa-express/config
 */
export async function fetchSagawaConfig(): Promise<SagawaPluginConfig> {
  const response = await fetch(`${SAGAWA_API}/config`)
  if (!response.ok) {
    return { billingCode: '', defaultInvoiceType: '0', defaultSize: '80' }
  }
  return response.json()
}
