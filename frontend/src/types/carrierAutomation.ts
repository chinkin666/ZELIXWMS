/**
 * PDF取得元
 */
export type PdfSource = 'local' | 'b2-webapi'

/**
 * 送り状種類ごとの設定
 */
export interface ServiceTypeConfig {
  /** B2サービス種類 (0-9, A) */
  b2ServiceType: string
  /** 印刷テンプレートID */
  printTemplateId?: string
  /** PDF取得元（'local' = ローカルテンプレート, 'b2-webapi' = B2 Cloudから取得） */
  pdfSource?: PdfSource
}

/**
 * Yamato B2 設定
 */
export interface YamatoB2Config {
  apiEndpoint: string
  apiKey: string
  customerCode: string
  customerPassword: string
  customerClsCode?: string
  loginUserId?: string
  /**
   * 送り状種類ごとの設定マッピング
   * key: 送り状種類 (0-9, A)
   * value: ServiceTypeConfig（B2サービス種類 + 印刷テンプレート）
   */
  serviceTypeMapping?: Record<string, ServiceTypeConfig>
  /** 請求先顧客コード（10-12桁）- B2 webapi field: invoice_code */
  invoiceCode?: string
  /** 運賃管理番号（2桁）- B2 webapi field: invoice_freight_no */
  invoiceFreightNo?: string
}

/**
 * 配送会社自動化設定
 */
export interface CarrierAutomationConfig {
  _id?: string
  tenantId: string
  automationType: string
  enabled: boolean
  yamatoB2?: YamatoB2Config
  createdAt?: string
  updatedAt?: string
}

/**
 * 設定保存用DTO
 */
export interface UpsertCarrierAutomationConfigDto {
  enabled: boolean
  yamatoB2?: YamatoB2Config
}

/**
 * 接続テスト結果
 */
export interface ConnectionTestResult {
  success: boolean
  message: string
}

/**
 * 検証結果（個別）
 */
export interface YamatoB2ValidateResultItem {
  index: number
  valid: boolean
  errors: string[]
}

/**
 * 検証結果（全体）
 */
export interface YamatoB2ValidateResult {
  results: YamatoB2ValidateResultItem[]
  total: number
  valid_count: number
  invalid_count: number
  all_valid: boolean
}

/**
 * エクスポート結果
 */
export interface YamatoB2ShipmentResult {
  success: boolean
  tracking_number?: string
  service_type?: string
  error?: string
  order_index: number
}

/**
 * 発行結果（print_type ごと）
 */
export interface YamatoB2PrintResultByType {
  print_type: string
  success: boolean
  tracking_numbers: string[]
  error?: string
}

export interface YamatoB2ExportResult {
  results: YamatoB2ShipmentResult[]
  total: number
  success_count: number
  error_count: number
  printResults?: YamatoB2PrintResultByType[]
}

/**
 * 印刷結果
 */
export interface YamatoB2PrintResult {
  pdf_base64?: string
  tracking_numbers: string[]
  success: boolean
  error?: string
}

/**
 * インポート結果
 */
export interface YamatoB2ImportResult {
  success: boolean
  total: number
  matched: number
  unmatched: number
}

/**
 * 確認取消結果
 */
export interface YamatoB2UnconfirmResult {
  success: boolean
  updatedCount: number
  b2DeleteResult?: {
    success: boolean
    deleted: number
    error?: string
  } | null
  carrierDeleteSkipped?: boolean
}

/**
 * B2削除エラー（スキップ可能）
 */
export interface CarrierDeleteErrorResponse {
  message: string
  error: string
  canRetryWithSkip: boolean
  trackingNumbers: string[]
}

/**
 * 送り状種類変更結果（個別注文）
 */
export interface ChangeInvoiceTypeOrderResult {
  orderId: string
  orderNumber: string
  success: boolean
  newTrackingId?: string
  error?: string
  isBuiltIn: boolean
}

/**
 * 送り状種類変更結果
 */
export interface ChangeInvoiceTypeResult {
  success: boolean
  total: number
  updatedCount: number
  resubmittedCount: number
  isBuiltInCarrier: boolean
  requiresManualUpload: boolean
  deleteResult?: {
    success: boolean
    deleted: number
    error?: string
  } | null
  carrierDeleteSkipped?: boolean
  orderResults: ChangeInvoiceTypeOrderResult[]
  errors?: string[]
  message?: string
}

/**
 * 注文分割リクエスト
 */
export interface SplitOrderRequest {
  orderId: string
  splitGroups: Array<{
    products: Array<{ productIndex: number; quantity: number }>
  }>
  skipCarrierDelete?: boolean
}

/**
 * 注文分割結果（個別注文）
 */
export interface SplitOrderResultItem {
  orderId: string
  orderNumber: string
  productCount: number
  success: boolean
  newTrackingId?: string
  error?: string
}

/**
 * 注文分割結果
 */
export interface SplitOrderResult {
  success: boolean
  originalOrderId: string
  originalOrderNumber: string
  splitOrders: SplitOrderResultItem[]
  isBuiltInCarrier: boolean
  deleteResult?: {
    success: boolean
    deleted: number
    error?: string
  } | null
  carrierDeleteSkipped?: boolean
  errors?: string[]
}
