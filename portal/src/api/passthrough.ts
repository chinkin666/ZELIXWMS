import { http } from './http'

export interface ServiceOption {
  optionCode: string
  optionName: string
  quantity: number
  unitPrice: number
  estimatedCost: number
  actualQuantity?: number
  actualCost?: number
  status: 'pending' | 'in_progress' | 'completed'
}

export interface PassthroughOrder {
  _id: string
  orderNumber: string
  status: string
  flowType: string
  destinationType?: 'fba' | 'rsl' | 'b2b'
  clientId?: string
  subClientId?: string
  shopId?: string
  lines: Array<{
    productId: string
    productSku: string
    productName?: string
    expectedQuantity: number
    receivedQuantity: number
  }>
  serviceOptions?: ServiceOption[]
  fbaInfo?: {
    shipmentId?: string
    destinationFc?: string
    labelPdfUrl?: string
    labelSplitStatus?: string
    splitLabels?: Array<{ index: number; boxNumber: string; imageUrl: string; printed: boolean }>
    labelFormat?: string
  }
  varianceReport?: {
    hasVariance: boolean
    details: Array<{
      sku: string
      productName?: string
      expectedQuantity: number
      actualQuantity: number
      variance: number
    }>
    reportedAt?: string
    clientViewedAt?: string
  }
  trackingNumbers?: Array<{ boxNumber?: string; trackingNumber: string; carrier?: string }>
  totalBoxCount?: number
  actualBoxCount?: number
  expectedDate?: string
  arrivedAt?: string
  shippedAt?: string
  memo?: string
  createdAt: string
}

// 一覧 / 列表
export function listOrders(params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  return http.get<{ data: PassthroughOrder[]; total: number }>(`/passthrough${qs}`)
}

// 詳細 / 详情
export function getOrder(id: string) {
  return http.get<PassthroughOrder>(`/passthrough/${id}`)
}

// 作成 / 创建
export function createOrder(data: Record<string, unknown>) {
  return http.post<PassthroughOrder>('/passthrough', data)
}

// 差異確認 / 差异确认
export function acknowledgeVariance(id: string) {
  return http.post<PassthroughOrder>(`/passthrough/${id}/ack-variance`)
}

// FBAラベルアップロード / FBA标上传
export async function uploadFbaLabel(id: string, file: File, format: string) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('format', format)
  return http.upload<{ splitLabels: any[]; count: number }>(`/passthrough/${id}/upload-label`, formData)
}
