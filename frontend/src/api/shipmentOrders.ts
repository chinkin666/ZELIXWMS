import { getApiBaseUrl } from '@/api/base'
import { apiFetch } from '@/api/http'

const API_BASE_URL = getApiBaseUrl()

export type ShipmentOrderBulkError = {
  clientId?: string
  field?: string
  message: string
}

export class ShipmentOrderBulkApiError extends Error {
  status?: number
  errors?: ShipmentOrderBulkError[]

  constructor(message: string, opts?: { status?: number; errors?: ShipmentOrderBulkError[] }) {
    super(message)
    this.name = 'ShipmentOrderBulkApiError'
    this.status = opts?.status
    this.errors = opts?.errors
  }
}

export type CreateShipmentOrdersBulkPayload = {
  items: Array<{
    clientId: string
    order: Record<string, any>
  }>
}

export type CreateShipmentOrdersBulkResult = {
  message: string
  data?: {
    total: number
    successCount: number
    failureCount: number
    successes: Array<{ clientId: string; insertedId: string }>
    failures: Array<{ clientId?: string; field?: string; message: string }>
  }
}

export async function createShipmentOrdersBulk(
  payload: CreateShipmentOrdersBulkPayload,
): Promise<CreateShipmentOrdersBulkResult> {
  const response = await apiFetch(`${API_BASE_URL}/shipment-orders/manual/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const json = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message = json?.message || response.statusText || 'アップロードに失敗しました'
    const errors = Array.isArray(json?.errors) ? (json.errors as ShipmentOrderBulkError[]) : undefined
    throw new ShipmentOrderBulkApiError(message, { status: response.status, errors })
  }

  return json
}

type ShipmentOrdersListResponse<T = any> = T[] | { items: T[]; total?: number; page?: number; limit?: number }

export async function fetchShipmentOrders(params?: { limit?: number }): Promise<any[]> {
  // NOTE: This endpoint supports server-side pagination/filtering/sorting.
  // - use q(JSON) to send SearchForm payload.
  const url = new URL(`${API_BASE_URL}/shipment-orders`)
  if (params?.limit) url.searchParams.set('limit', String(params.limit))
  // デフォルトはorderNumberでソート / 默认使用 orderNumber 排序
  url.searchParams.set('sortBy', 'orderNumber')
  url.searchParams.set('sortOrder', 'asc')
  const response = await apiFetch(url.toString())
  if (!response.ok) {
    throw new Error(`出荷予定の取得に失敗しました: ${response.statusText}`)
  }
  const json: ShipmentOrdersListResponse = await response.json()
  // Backend may return either a raw array or a paged object depending on query params.
  if (Array.isArray(json)) return json
  if (json && Array.isArray((json as any).items)) return (json as any).items
  return []
}

export async function fetchShipmentOrder(id: string): Promise<any> {
  const response = await apiFetch(`${API_BASE_URL}/shipment-orders/${id}`)
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`出荷予定の取得に失敗しました: ${message}`)
  }
  return response.json()
}

export type FetchShipmentOrdersQuery = {
  page: number
  limit: number
  q?: Record<string, { operator: string; value: any }>
  sortBy?: string | null
  sortOrder?: 'asc' | 'desc' | null
  tzOffsetMinutes?: number
}

export type PagedResult<T> = { items: T[]; total: number; page: number; limit: number }

export async function fetchShipmentOrdersPage<T = any>(query: FetchShipmentOrdersQuery): Promise<PagedResult<T>> {
  const url = new URL(`${API_BASE_URL}/shipment-orders`)
  url.searchParams.set('page', String(query.page))
  url.searchParams.set('limit', String(query.limit))

  // デフォルトはorderNumberでソート（未指定の場合） / 默认使用 orderNumber 排序（如果没有指定）
  const sortBy = query.sortBy || 'orderNumber'
  const sortOrder = query.sortOrder || 'asc'
  
  url.searchParams.set('sortBy', String(sortBy))
  url.searchParams.set('sortOrder', String(sortOrder))

  if (typeof query.tzOffsetMinutes === 'number') {
    url.searchParams.set('tzOffsetMinutes', String(query.tzOffsetMinutes))
  }

  if (query.q && Object.keys(query.q).length > 0) {
    url.searchParams.set('q', JSON.stringify(query.q))
  }

  const response = await apiFetch(url.toString())
  if (!response.ok) {
    throw new Error(`出荷予定の取得に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export type ImportCarrierReceiptRowsPayload = {
  orderMatchField: 'orderNumber' | 'customerManagementNumber' | 'recipient.phone' | 'recipient.postalCode'
  items: Array<{
    matchValue: any
    carrierRawRow: Record<string, any>
  }>
}

export type ImportCarrierReceiptRowsResult = {
  message: string
  data?: {
    totalRows: number
    skippedEmpty: number
    matchedOrders: number
    updatedOrders: number
    unmatched: string[]
    ambiguous: string[]
    duplicatedInFile: string[]
  }
}

export async function importCarrierReceiptRows(
  payload: ImportCarrierReceiptRowsPayload,
): Promise<ImportCarrierReceiptRowsResult> {
  const response = await apiFetch(`${API_BASE_URL}/shipment-orders/carrier-receipts/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const json = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = json?.message || response.statusText || '取込に失敗しました'
    throw new Error(message)
  }
  return json
}

/**
 * Update order status (unified status operation).
 * Backend route: POST /api/shipment-orders/:id/status
 * @param id Order ID
 * @param action Status action ('mark-print-ready' | 'mark-printed' | 'mark-shipped' | 'unconfirm')
 * @param statusType Status type for unconfirm action ('confirm' | 'carrierReceipt' | 'printed' | 'shipped')
 */
export async function updateShipmentOrderStatus(
  id: string,
  action: 'mark-print-ready' | 'mark-printed' | 'mark-shipped' | 'mark-ec-exported' | 'mark-inspected' | 'mark-held' | 'unhold' | 'unconfirm',
  statusType?: 'confirm' | 'carrierReceipt' | 'printed' | 'shipped' | 'ecExported' | 'inspected' | 'held',
): Promise<any> {
  const body: any = { action }
  if (action === 'unconfirm' && statusType) {
    body.statusType = statusType
  }

  const response = await apiFetch(`${API_BASE_URL}/shipment-orders/${encodeURIComponent(id)}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = json?.message || response.statusText || 'ステータスの更新に失敗しました'
    throw new Error(message)
  }
  return json
}

/**
 * Mark an order as ready to print (server-side status flag).
 * @deprecated Use updateShipmentOrderStatus(id, 'mark-print-ready') instead
 */
export async function markShipmentOrderPrintReady(id: string): Promise<any> {
  return updateShipmentOrderStatus(id, 'mark-print-ready')
}

/**
 * Bulk update multiple orders.
 * Backend route: PATCH /api/shipment-orders/bulk
 * @param ids Array of order IDs to update
 * @param updates Object with fields to update (e.g., { 'status.confirm.isConfirmed': true, 'status.confirm.confirmedAt': '...' })
 */
export async function bulkUpdateShipmentOrders(ids: string[], updates: Record<string, any>): Promise<any> {
  const response = await apiFetch(`${API_BASE_URL}/shipment-orders/bulk`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, updates }),
  })
  const json = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = json?.message || response.statusText || '一括更新に失敗しました'
    throw new Error(message)
  }
  return json
}

/**
 * Update order status in bulk (unified status operation).
 * Backend route: POST /api/shipment-orders/status/bulk
 * @param ids Array of order IDs
 * @param action Status action ('mark-print-ready' | 'mark-printed' | 'mark-shipped' | 'unconfirm')
 * @param statusType Status type for unconfirm action ('confirm' | 'carrierReceipt' | 'printed' | 'shipped')
 */
export async function updateShipmentOrderStatusBulk(
  ids: string[],
  action: 'mark-print-ready' | 'mark-printed' | 'mark-shipped' | 'mark-ec-exported' | 'mark-inspected' | 'mark-held' | 'unhold' | 'unconfirm',
  statusType?: 'confirm' | 'carrierReceipt' | 'printed' | 'shipped' | 'ecExported' | 'inspected' | 'held',
): Promise<any> {
  const body: any = { ids, action }
  if (action === 'unconfirm' && statusType) {
    body.statusType = statusType
  }

  const response = await apiFetch(`${API_BASE_URL}/shipment-orders/status/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = json?.message || response.statusText || '一括ステータス更新に失敗しました'
    throw new Error(message)
  }
  return json
}

/**
 * Mark multiple orders as ready to print (bulk operation).
 * @deprecated Use updateShipmentOrderStatusBulk(ids, 'mark-print-ready') instead
 */
export async function markShipmentOrdersPrintReadyBulk(ids: string[]): Promise<any> {
  return updateShipmentOrderStatusBulk(ids, 'mark-print-ready')
}

/**
 * Mark an order as printed (server-side status flag).
 * @deprecated Use updateShipmentOrderStatus(id, 'mark-printed') instead
 */
export async function markShipmentOrderPrinted(id: string): Promise<any> {
  return updateShipmentOrderStatus(id, 'mark-printed')
}

/**
 * Update an order.
 * Backend route: PUT /api/shipment-orders/:id
 */
export async function updateShipmentOrder(id: string, data: Record<string, any>): Promise<any> {
  const response = await apiFetch(`${API_BASE_URL}/shipment-orders/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const json = await response.json().catch(() => ({}))
  if (!response.ok) {
    const errors = json?.errors
    let message = json?.message || response.statusText || '出荷予定の更新に失敗しました'
    if (Array.isArray(errors) && errors.length > 0) {
      const details = errors.map((e: any) => `${e.field}: ${e.message}`).join(', ')
      message = `${message} (${details})`
      // バリデーションエラーはメッセージに含まれる / Validation errors included in message
    }
    throw new Error(message)
  }
  return json
}

/**
 * Delete an order.
 * Backend route: DELETE /api/shipment-orders/:id
 */
export async function deleteShipmentOrder(id: string): Promise<any> {
  const response = await apiFetch(`${API_BASE_URL}/shipment-orders/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  const json = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = json?.message || response.statusText || '出荷予定の削除に失敗しました'
    throw new Error(message)
  }
  return json
}

/**
 * Bulk delete multiple orders.
 * Backend route: POST /api/shipment-orders/delete/bulk
 * @param ids Array of order IDs to delete
 */
export async function deleteShipmentOrdersBulk(ids: string[]): Promise<{ deletedCount: number; requestedCount: number }> {
  if (!ids || ids.length === 0) {
    return { deletedCount: 0, requestedCount: 0 }
  }

  const response = await apiFetch(`${API_BASE_URL}/shipment-orders/delete/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  })

  const json = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = json?.message || response.statusText || '一括削除に失敗しました'
    throw new Error(message)
  }
  return json
}

/**
 * Unconfirm a status for a single order.
 * @deprecated Use updateShipmentOrderStatus(id, 'unconfirm', statusType) instead
 */
export async function unconfirmShipmentOrderStatus(
  id: string,
  statusType: 'confirm' | 'carrierReceipt' | 'printed' | 'shipped',
): Promise<any> {
  return updateShipmentOrderStatus(id, 'unconfirm', statusType)
}

/**
 * Bulk unconfirm status for multiple orders.
 * @deprecated Use updateShipmentOrderStatusBulk(ids, 'unconfirm', statusType) instead
 */
export async function unconfirmShipmentOrderStatusBulk(
  ids: string[],
  statusType: 'confirm' | 'carrierReceipt' | 'printed' | 'shipped',
): Promise<any> {
  return updateShipmentOrderStatusBulk(ids, 'unconfirm', statusType)
}

/**
 * Fetch multiple orders by IDs using POST (to avoid URL length limits).
 * Use this when you have many order IDs to fetch at once.
 * Backend route: POST /api/shipment-orders/by-ids
 * @param ids Array of order IDs to fetch
 * @param options.includeRawData If true, returns full data including sourceRawRows/carrierRawRow (for print).
 *                               Default is false (lightweight data for list views).
 */
export async function fetchShipmentOrdersByIds<T = any>(
  ids: string[],
  options?: { includeRawData?: boolean },
): Promise<T[]> {
  if (!ids || ids.length === 0) {
    return []
  }

  const response = await apiFetch(`${API_BASE_URL}/shipment-orders/by-ids`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ids,
      includeRawData: options?.includeRawData ?? false,
    }),
  })

  if (!response.ok) {
    const json = await response.json().catch(() => ({}))
    const message = json?.message || response.statusText || '出荷予定の取得に失敗しました'
    throw new Error(message)
  }

  const json = await response.json()
  return json.items || []
}


