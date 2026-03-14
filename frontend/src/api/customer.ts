import { http } from '@/api/http'

// ─── Types / 型定義 ─────────────────────────────────────────────────────────

export interface Customer {
  _id: string
  customerCode: string
  name: string
  name2?: string
  postalCode?: string
  prefecture?: string
  city?: string
  address?: string
  address2?: string
  phone?: string
  email?: string
  memo?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CustomerListParams {
  search?: string
  page?: number
  limit?: number
  isActive?: string
}

export interface CustomerListResponse {
  data: Customer[]
  total: number
}

export interface BulkImportResult {
  message: string
  successCount: number
  failCount: number
  errors: { row: number; customerCode?: string; message: string }[]
}

// ─── Helper / ヘルパー ──────────────────────────────────────────────────────

function buildCustomerParams(params?: CustomerListParams): Record<string, string> | undefined {
  if (!params) return undefined
  const result: Record<string, string> = {}
  if (params.search) result.search = params.search
  if (params.page) result.page = String(params.page)
  if (params.limit) result.limit = String(params.limit)
  if (params.isActive !== undefined) result.isActive = params.isActive
  return Object.keys(result).length > 0 ? result : undefined
}

// ─── API Functions / API 関数 ───────────────────────────────────────────────

/** 得意先一覧を取得 / Fetch customer list */
export function fetchCustomers(params?: CustomerListParams): Promise<CustomerListResponse> {
  return http.get<CustomerListResponse>('/customers', buildCustomerParams(params))
}

/** 得意先を取得 / Fetch single customer */
export function fetchCustomer(id: string): Promise<Customer> {
  return http.get<Customer>(`/customers/${id}`)
}

/** 得意先を作成 / Create customer */
export function createCustomer(data: Partial<Customer>): Promise<Customer> {
  return http.post<Customer>('/customers', data)
}

/** 得意先を更新 / Update customer */
export function updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
  return http.put<Customer>(`/customers/${id}`, data)
}

/** 得意先を削除 / Delete customer */
export function deleteCustomer(id: string): Promise<void> {
  return http.delete<void>(`/customers/${id}`)
}

/** 得意先を一括取り込み / Bulk import customers */
export function bulkImportCustomers(customers: Partial<Customer>[]): Promise<BulkImportResult> {
  return http.post<BulkImportResult>('/customers/bulk-import', { customers })
}

/** 得意先をエクスポート / Export customers */
export function exportCustomers(): Promise<Customer[]> {
  return http.get<Customer[]>('/customers/export')
}
