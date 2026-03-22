/**
 * 荷主ポータル API / 货主门户 API
 *
 * 荷主（client）ロール向けダッシュボードデータ取得。
 * 面向荷主（client）角色的仪表板数据获取。
 */

import { http } from '@/api/http'

// ── 型定義 / 类型定义 ──

export interface ClientPortalStats {
  readonly totalOrders: number
  readonly shippedOrders: number
  readonly pendingOrders: number
  readonly totalShippingCost: number
}

export interface ClientPortalOrder {
  readonly _id: string
  readonly orderNumber?: string
  readonly shipPlanDate?: string
  readonly shippingCost?: number
  readonly _productsMeta?: {
    readonly totalQuantity?: number
    readonly skuCount?: number
  }
  readonly status?: {
    readonly shipped?: {
      readonly shippedAt?: string
    }
  }
  readonly carrierId?: string
  readonly createdAt?: string
}

export interface ClientPortalInvoice {
  readonly _id: string
  readonly invoiceNumber: string
  readonly period: string
  readonly issueDate: string
  readonly dueDate: string
  readonly totalAmount: number
  readonly status: string
}

export interface ClientPortalDashboard {
  readonly clientName: string
  readonly stats: ClientPortalStats
  readonly recentOrders: ClientPortalOrder[]
  readonly invoices: ClientPortalInvoice[]
}

// ── API ──

export async function fetchClientDashboard(): Promise<ClientPortalDashboard> {
  const json = await http.get<any>('/client-portal/dashboard')
  // バックエンドが data でラップする場合の対応 / 兼容后端用 data 包装的情况
  const dashboard = json?.data ?? json
  return {
    clientName: dashboard?.clientName ?? '',
    stats: dashboard?.stats ?? { totalOrders: 0, shippedOrders: 0, pendingOrders: 0, totalShippingCost: 0 },
    recentOrders: dashboard?.recentOrders ?? [],
    invoices: dashboard?.invoices ?? [],
  }
}

/** 荷主在庫照会 / 荷主库存查询 */
export interface ClientStockItem {
  readonly productSku: string
  readonly productName: string
  readonly quantity: number
  readonly reservedQuantity: number
  readonly availableQuantity: number
}

export async function fetchClientStock(): Promise<ClientStockItem[]> {
  const json = await http.get<any>('/client-portal/stock')
  return Array.isArray(json) ? json : (json.items ?? json.data ?? [])
}

/** 追跡番号検索 / 追踪号查询 */
export interface TrackingResult {
  readonly orderNumber: string
  readonly trackingId: string
  readonly carrierName: string
  readonly status: string
  readonly shippedAt?: string
  readonly recipient: string
}

export async function searchTracking(query: string): Promise<TrackingResult[]> {
  const json = await http.get<any>('/client-portal/tracking', { q: query })
  return Array.isArray(json) ? json : (json.items ?? json.data ?? [])
}
