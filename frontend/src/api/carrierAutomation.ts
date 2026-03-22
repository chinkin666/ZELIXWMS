import type {
  CarrierAutomationConfig,
  UpsertCarrierAutomationConfigDto,
  ConnectionTestResult,
  YamatoB2ValidateResult,
  YamatoB2ExportResult,
  YamatoB2PrintResult,
  YamatoB2ImportResult,
  YamatoB2UnconfirmResult,
  ChangeInvoiceTypeResult,
  CarrierDeleteErrorResponse,
  SplitOrderRequest,
  SplitOrderResult,
} from '@/types/carrierAutomation'

import { getApiBaseUrl } from '@/api/base'
import { apiFetch } from '@/api/http'

const API_BASE_URL = getApiBaseUrl()

/**
 * 全ての自動化設定を取得
 */
export async function fetchCarrierAutomationConfigs(): Promise<CarrierAutomationConfig[]> {
  const response = await apiFetch(`${API_BASE_URL}/carrier-automation/configs`)
  if (!response.ok) {
    throw new Error(`設定の取得に失敗しました: ${response.statusText}`)
  }
  const json = await response.json()
  return Array.isArray(json) ? json : (json.items ?? json.data ?? [])
}

/**
 * 特定タイプの自動化設定を取得
 */
export async function fetchCarrierAutomationConfig(
  type: string
): Promise<CarrierAutomationConfig> {
  const response = await apiFetch(`${API_BASE_URL}/carrier-automation/configs/${type}`)
  if (!response.ok) {
    throw new Error(`設定の取得に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

/**
 * 自動化設定を保存
 */
export async function saveCarrierAutomationConfig(
  type: string,
  payload: UpsertCarrierAutomationConfigDto
): Promise<CarrierAutomationConfig> {
  const response = await apiFetch(`${API_BASE_URL}/carrier-automation/configs/${type}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`設定の保存に失敗しました: ${message}`)
  }
  return response.json()
}

/**
 * 自動化設定を削除
 */
export async function deleteCarrierAutomationConfig(type: string): Promise<void> {
  const response = await apiFetch(`${API_BASE_URL}/carrier-automation/configs/${type}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`設定の削除に失敗しました: ${message}`)
  }
}

/**
 * 接続テスト
 */
export async function testCarrierAutomationConnection(type: string): Promise<ConnectionTestResult> {
  const response = await apiFetch(`${API_BASE_URL}/carrier-automation/configs/${type}/test`, {
    method: 'POST',
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`接続テストに失敗しました: ${message}`)
  }
  return response.json()
}

/**
 * Yamato B2: 配送データを検証（エクスポート前のフォーマットチェック）
 */
export async function yamatoB2Validate(orderIds: string[]): Promise<YamatoB2ValidateResult> {
  const response = await apiFetch(`${API_BASE_URL}/carrier-automation/yamato-b2/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderIds }),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    // Include the detailed error info from the 'error' field if available
    const errorDetail = data.error || data.message || response.statusText
    throw new Error(errorDetail)
  }
  return response.json()
}

/**
 * Yamato B2: 配送データをエクスポート
 */
export async function yamatoB2Export(orderIds: string[]): Promise<YamatoB2ExportResult> {
  const response = await apiFetch(`${API_BASE_URL}/carrier-automation/yamato-b2/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderIds }),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    // Include the detailed error info from the 'error' field if available
    const errorDetail = data.error || data.message || response.statusText
    throw new Error(errorDetail)
  }
  return response.json()
}

/**
 * Yamato B2: ラベル印刷
 */
export async function yamatoB2Print(trackingNumbers: string[]): Promise<YamatoB2PrintResult> {
  const response = await apiFetch(`${API_BASE_URL}/carrier-automation/yamato-b2/print`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trackingNumbers }),
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`印刷に失敗しました: ${message}`)
  }
  return response.json()
}

/**
 * Yamato B2: 履歴からインポート
 * @param options - インポートオプション（日付フィルタ）
 */
export async function yamatoB2Import(options?: {
  shipmentDateFrom?: string  // YYYY-MM-DD format
  shipmentDateTo?: string    // YYYY-MM-DD format
}): Promise<YamatoB2ImportResult> {
  const response = await apiFetch(`${API_BASE_URL}/carrier-automation/yamato-b2/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options || {}),
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`インポートに失敗しました: ${message}`)
  }
  return response.json()
}

/**
 * B2削除スキップ可能なエラーかどうかを判定
 */
export function isCarrierDeleteError(error: unknown): error is CarrierDeleteErrorResponse {
  return (
    typeof error === 'object' &&
    error !== null &&
    'canRetryWithSkip' in error &&
    (error as CarrierDeleteErrorResponse).canRetryWithSkip === true
  )
}

/**
 * Yamato B2: 確認取消
 * - 注文のステータスをリセット（confirm, printed, carrierReceipt, shipped を false に）
 * - trackingId, carrierRawRow をクリア
 * - B2 Cloud 履歴から削除（trackingId がある場合）
 * - internalRecord に記録を追加
 * @param options.skipCarrierDelete B2削除をスキップしてローカル操作のみ実行 / B2削除をスキップして本地操作のみ実行
 */
export async function yamatoB2Unconfirm(
  orderIds: string[],
  reason: string,
  options?: { skipCarrierDelete?: boolean }
): Promise<YamatoB2UnconfirmResult> {
  const response = await apiFetch(`${API_BASE_URL}/carrier-automation/yamato-b2/unconfirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderIds, reason, skipCarrierDelete: options?.skipCarrierDelete }),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    // B2削除エラーの場合はcanRetryWithSkip付きでthrow
    if (data.canRetryWithSkip) {
      throw data as CarrierDeleteErrorResponse
    }
    const message = data.message || response.statusText
    throw new Error(`確認取消に失敗しました: ${message}`)
  }
  return response.json()
}

/**
 * 送り状種類変更
 * - 内蔵Carrier（B2 Cloud等）の場合：既存運単を削除 → invoiceType更新 → 再提出 → 新trackingId取得
 * - 手動Carrierの場合：invoiceType更新 → ステータスリセット（確認画面に戻す）
 * @param options.skipCarrierDelete B2削除をスキップしてローカル操作のみ実行 / B2削除をスキップして本地操作のみ実行
 */
export async function changeInvoiceType(
  orderIds: string[],
  newInvoiceType: string,
  options?: { skipCarrierDelete?: boolean }
): Promise<ChangeInvoiceTypeResult> {
  const response = await apiFetch(`${API_BASE_URL}/carrier-automation/change-invoice-type`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderIds, newInvoiceType, skipCarrierDelete: options?.skipCarrierDelete }),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    // B2削除エラーの場合はcanRetryWithSkip付きでthrow
    if (data.canRetryWithSkip) {
      throw data as CarrierDeleteErrorResponse
    }
    const errorDetail = data.error || data.message || response.statusText
    throw new Error(errorDetail)
  }
  return response.json()
}

/**
 * 注文分割
 * - 1つの注文を複数の注文に分割
 * - 内蔵Carrier（B2 Cloud等）の場合：既存運単を削除 → 分割注文を再提出
 * - 手動Carrierの場合：分割注文を未確認状態で作成
 */
export async function splitOrder(
  request: SplitOrderRequest,
  options?: { skipCarrierDelete?: boolean }
): Promise<SplitOrderResult> {
  const response = await apiFetch(`${API_BASE_URL}/carrier-automation/split-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...request,
      skipCarrierDelete: options?.skipCarrierDelete,
    }),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    if (data.canRetryWithSkip) {
      throw data as CarrierDeleteErrorResponse
    }
    const errorDetail = data.error || data.message || response.statusText
    throw new Error(errorDetail)
  }
  return response.json()
}

/**
 * Yamato B2: 複数追跡番号からPDFを一括取得（b2-webapiからの直接取得）
 * @param trackingNumbers 追跡番号の配列
 * @returns PDFのBlobデータ
 */
export async function yamatoB2FetchBatchPdf(trackingNumbers: string[]): Promise<Blob> {
  const response = await apiFetch(`${API_BASE_URL}/carrier-automation/yamato-b2/pdf/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trackingNumbers }),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    const message = data.message || data.error || response.statusText
    throw new Error(`PDF取得に失敗しました: ${message}`)
  }
  return response.blob()
}
