/**
 * 西濃運輸 API クライアント / 西浓运输 API 客户端
 *
 * カンガルー便 CSV 出力・追跡番号取込・送り状種類取得。
 * NestJS API 经由（/api/seino/*）
 */

import { getApiBaseUrl } from '@/api/base'
import { apiFetch } from '@/api/http'

const API_BASE_URL = getApiBaseUrl()
// API パス / API 路径
// NOTE: API_BASE_URL already includes /api prefix, so no need to add /api again
// 注意: API_BASE_URL 已包含 /api 前缀，无需再次添加
const SEINO_API = `${API_BASE_URL}/seino`

/** 西濃送り状種類 / 西浓送状类型 */
export interface SeinoInvoiceType {
  invoiceType: string
  name: string
}

/** CSV 出力パラメータ / CSV 出力参数 */
export interface SeinoExportParams {
  orderIds: string[]
  config?: {
    defaultInvoiceType?: string
    defaultWeight?: string
  }
}

/** 追跡番号取込結果 / 追踪号导入结果 */
export interface SeinoTrackingImportResult {
  total: number
  updated: number
  skipped: number
}

/**
 * 西濃 CSV 出力 / 西浓 CSV 导出
 * POST /api/seino/export
 */
export async function exportSeinoCsv(params: SeinoExportParams): Promise<Blob> {
  const response = await apiFetch(`${SEINO_API}/export`, {
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
 * 追跡番号取込 / 追踪号导入
 * POST /api/seino/import-tracking
 */
export async function importSeinoTracking(csvContent: string): Promise<SeinoTrackingImportResult> {
  const response = await apiFetch(`${SEINO_API}/import-tracking`, {
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
 * 送り状種類取得 / 获取送状类型
 * GET /api/seino/invoice-types
 */
export async function fetchSeinoInvoiceTypes(): Promise<SeinoInvoiceType[]> {
  const response = await apiFetch(`${SEINO_API}/invoice-types`)
  if (!response.ok) {
    throw new Error(`送り状種類の取得に失敗しました: ${response.statusText}`)
  }
  const json = await response.json()
  return Array.isArray(json) ? json : (json.items ?? json.data ?? [])
}

/** プラグイン設定 / 插件配置 */
export interface SeinoPluginConfig {
  defaultInvoiceType: string
  defaultWeight: string
}

/**
 * 設定取得 / 获取配置
 * GET /api/seino/config
 */
export async function fetchSeinoConfig(): Promise<SeinoPluginConfig> {
  const response = await apiFetch(`${SEINO_API}/config`)
  if (!response.ok) {
    return { defaultInvoiceType: '1', defaultWeight: '' }
  }
  return response.json()
}
