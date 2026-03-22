/**
 * 日本郵便 API クライアント / 日本邮便 API 客户端
 *
 * ゆうパック CSV 出力・追跡番号取込・送り状種類取得。
 * NestJS API 经由（/api/japan-post/*）
 */

import { getApiBaseUrl } from '@/api/base'
import { apiFetch } from '@/api/http'

const API_BASE_URL = getApiBaseUrl()
// API パス / API 路径
const JAPAN_POST_API = `${API_BASE_URL}/api/japan-post`

/** 日本郵便送り状種類 / 日本邮便送状类型 */
export interface JapanPostInvoiceType {
  invoiceType: string
  name: string
}

/** CSV 出力パラメータ / CSV 出力参数 */
export interface JapanPostExportParams {
  orderIds: string[]
  config?: {
    defaultInvoiceType?: string
    defaultPackageCount?: string
  }
}

/** 追跡番号取込結果 / 追踪号导入结果 */
export interface JapanPostTrackingImportResult {
  total: number
  updated: number
  skipped: number
}

/**
 * 日本郵便 CSV 出力 / 日本邮便 CSV 导出
 * POST /api/japan-post/export
 */
export async function exportJapanPostCsv(params: JapanPostExportParams): Promise<Blob> {
  const response = await apiFetch(`${JAPAN_POST_API}/export`, {
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
 * POST /api/japan-post/import-tracking
 */
export async function importJapanPostTracking(csvContent: string): Promise<JapanPostTrackingImportResult> {
  const response = await apiFetch(`${JAPAN_POST_API}/import-tracking`, {
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
 * GET /api/japan-post/invoice-types
 */
export async function fetchJapanPostInvoiceTypes(): Promise<JapanPostInvoiceType[]> {
  const response = await apiFetch(`${JAPAN_POST_API}/invoice-types`)
  if (!response.ok) {
    throw new Error(`送り状種類の取得に失敗しました: ${response.statusText}`)
  }
  const json = await response.json()
  return Array.isArray(json) ? json : (json.items ?? json.data ?? [])
}

/** プラグイン設定 / 插件配置 */
export interface JapanPostPluginConfig {
  defaultInvoiceType: string
  defaultPackageCount: string
}

/**
 * 設定取得 / 获取配置
 * GET /api/japan-post/config
 */
export async function fetchJapanPostConfig(): Promise<JapanPostPluginConfig> {
  const response = await apiFetch(`${JAPAN_POST_API}/config`)
  if (!response.ok) {
    return { defaultInvoiceType: '1', defaultPackageCount: '1' }
  }
  return response.json()
}
