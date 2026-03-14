/**
 * ローカル印刷ブリッジAPIユーティリティ / 本地打印桥接 API 工具函数
 * Local Print Bridge API (http://127.0.0.1:8765) 対応 / 对应 Local Print Bridge API (http://127.0.0.1:8765)
 * CORS自動処理：ローカル環境ではViteプロキシ、リモート環境では直接アクセス / 自动处理 CORS 问题：在本地环境使用 Vite 代理，在远程环境直接访问
 */

import type { PrinterInfo, TemplatePrintParams } from './printConfig'

// ─── Internal Helpers ───

function isLocalAddress(serviceUrl: string): boolean {
  try {
    const url = new URL(serviceUrl)
    const hostname = url.hostname.toLowerCase()
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
  } catch {
    return false
  }
}

function isRunningLocally(): boolean {
  if (typeof window === 'undefined') return false
  const hostname = window.location.hostname.toLowerCase()
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
}

function getProxyUrl(apiPath: string): string {
  return `/api/print-bridge${apiPath}`
}

function getDirectUrl(serviceUrl: string, apiPath: string): string {
  const baseUrl = serviceUrl.replace(/\/$/, '')
  return `${baseUrl}${apiPath}`
}

/**
 * プロキシ経由を試行、失敗時は直接アクセスにフォールバック / 尝试使用代理，如果失败则回退到直接访问
 */
async function fetchWithProxyFallback(
  serviceUrl: string,
  apiPath: string,
  options?: RequestInit,
): Promise<Response> {
  const isLocal = isLocalAddress(serviceUrl)
  const isLocalEnv = isRunningLocally()

  // リモートサーバー + ローカルサービス：直接アクセス / 远程服务器 + 本地服务：直接访问
  if (isLocal && !isLocalEnv) {
    const directUrl = getDirectUrl(serviceUrl, apiPath)
    return fetch(directUrl, options)
  }

  // ローカル環境 + ローカルサービス：プロキシ優先、直接アクセスフォールバック / 本地环境 + 本地服务：先代理，后直接
  if (isLocal && isLocalEnv) {
    try {
      const proxyUrl = getProxyUrl(apiPath)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)

      const proxyResponse = await fetch(proxyUrl, {
        ...options,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (proxyResponse.ok) return proxyResponse
      if (proxyResponse.status === 404) {
        console.debug('Proxy not available (404), using direct access')
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.debug('Proxy failed, falling back to direct access:', error.message)
      }
    }
  }

  const directUrl = getDirectUrl(serviceUrl, apiPath)
  return fetch(directUrl, options)
}

/**
 * 汎用API呼び出し / 通用 API 调用
 */
async function callApi<T = any>(
  serviceUrl: string,
  apiPath: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetchWithProxyFallback(serviceUrl, apiPath, options)

  if (!response.ok) {
    const errorText = await response.text()
    let errorData: any
    try {
      errorData = JSON.parse(errorText)
    } catch {
      errorData = { detail: errorText || response.statusText }
    }
    throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`)
  }

  const contentType = response.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    return await response.json()
  }
  return (await response.text()) as T
}

// ─── API Endpoints ───

/**
 * GET /api/health - ヘルスチェック / 健康检查
 */
export async function healthCheck(serviceUrl: string) {
  return callApi<{
    status: string
    config_path: string
    host: string
    port: number
  }>(serviceUrl, '/api/health')
}

/**
 * GET /api/printers - プリンター一覧取得 / 获取打印机列表
 */
export async function getPrinters(serviceUrl: string) {
  return callApi<{
    printers: PrinterInfo[]
    default_printer_os: string | null
  }>(serviceUrl, '/api/printers')
}

/**
 * GET /api/default-printer - 設定済みデフォルトプリンター取得 / 获取配置的默认打印机
 */
export async function getDefaultPrinter(serviceUrl: string) {
  return callApi<{
    default_printer: string | null
  }>(serviceUrl, '/api/default-printer')
}

/**
 * PUT /api/default-printer - デフォルトプリンター設定 / 设置默认打印机
 */
export async function setDefaultPrinter(serviceUrl: string, printerName: string | null) {
  return callApi<{
    default_printer: string | null
  }>(serviceUrl, '/api/default-printer', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ default_printer: printerName }),
  })
}

/**
 * GET /api/supported-formats - 対応ファイル形式取得 / 获取支持的文件格式
 */
export async function getSupportedFormats(serviceUrl: string) {
  return callApi<{
    image_formats: string[]
    document_formats: string[]
  }>(serviceUrl, '/api/supported-formats')
}

/**
 * POST /api/print - ファイル印刷 / 打印文件
 */
export async function printFile(
  serviceUrl: string,
  file: Blob,
  params?: TemplatePrintParams,
  filename?: string,
): Promise<{
  status: string
  job_id: string
  printer: string
  copies: number
  pages_printed: number
}> {
  const queryParams = new URLSearchParams()
  if (params?.printer) queryParams.append('printer', params.printer)
  if (params?.paper && params.paper !== 'AUTO') queryParams.append('paper', params.paper)
  if (params?.orientation) queryParams.append('orientation', params.orientation)
  if (params?.scale) queryParams.append('scale', params.scale)
  if (params?.margin_mm !== undefined) queryParams.append('margin_mm', String(params.margin_mm))
  if (params?.copies !== undefined && params.copies > 1) queryParams.append('copies', String(params.copies))

  const qs = queryParams.toString()
  const apiPath = `/api/print${qs ? `?${qs}` : ''}`

  const formData = new FormData()
  formData.append('file', file, filename || 'print.pdf')

  const response = await fetchWithProxyFallback(serviceUrl, apiPath, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const errorText = await response.text()
    let errorData: any
    try {
      errorData = JSON.parse(errorText)
    } catch {
      errorData = { detail: errorText || response.statusText }
    }
    throw new Error(errorData.detail || `Print failed: ${response.statusText}`)
  }

  return await response.json()
}

/**
 * GET /api/debug/printer-caps - プリンター機能デバッグ / 调试打印机能力
 */
export async function getDebugPrinterCaps(serviceUrl: string, printerName: string) {
  const qs = new URLSearchParams({ printer: printerName }).toString()
  return callApi<{
    port: string
    driver: string
    dc_papers_len: number
    dc_papers_sample: number[]
    dc_papersize_len: number
    dc_papernames_len: number
    dc_papernames_sample: string[]
    get_printer_paper_sizes_len: number
    get_printer_paper_sizes_sample: Array<{ name: string; width_mm: number; height_mm: number }>
  }>(serviceUrl, `/api/debug/printer-caps?${qs}`)
}
