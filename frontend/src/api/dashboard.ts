/**
 * 仪表盘 API 客户端 / ダッシュボード API クライアント
 */

import { http } from '@/api/http'

export interface DashboardOverview {
  shipments: {
    todayCreated: number;
    todayShipped: number;
    totalPending: number;
    totalHeld: number;
    todayScheduled: number;
  };
  inbound: {
    todayReceived: number;
    active: number;
    pendingPutaway: number;
  };
  returns: {
    inspecting: number;
    completed: number;
  };
  inventory: {
    totalSkus: number;
    totalQuantity: number;
    reservedQuantity: number;
    availableQuantity: number;
  };
  recentShipments: Array<{
    _id: string;
    orderNumber: string;
    status: Record<string, unknown>;
    createdAt: string;
    _productsMeta?: { itemCount: number; totalQuantity: number };
    shipPlanDate?: string;
  }>;
  overdueOrders: number;
  generatedAt: string;
}

export interface TrendItem {
  date: string;
  created: number;
  shipped: number;
}

/** ダッシュボード概要を取得 / Fetch dashboard overview */
export function fetchDashboardOverview(): Promise<DashboardOverview> {
  return http.get<DashboardOverview>('/dashboard/overview')
}

/** 7日間出荷トレンドを取得 / Fetch 7-day shipment trend */
export function fetchShipmentTrend(): Promise<TrendItem[]> {
  return http.get<TrendItem[]>('/dashboard/trend')
}

export interface ShipmentStatsResult {
  from: string
  to: string
  totalShipped: number
  totalQuantity: number
  totalSkus: number
  daily: Array<{ date: string; count: number; quantity: number }>
  carriers: Array<{ carrierId: string; count: number }>
}

/** 出荷実績統計を取得 / Fetch shipment statistics */
export function fetchShipmentStats(from?: string, to?: string): Promise<ShipmentStatsResult> {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const qs = params.toString()
  return http.get<ShipmentStatsResult>(`/dashboard/shipment-stats${qs ? `?${qs}` : ''}`)
}
