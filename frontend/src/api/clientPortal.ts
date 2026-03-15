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
  return http.get<ClientPortalDashboard>('/client-portal/dashboard')
}
