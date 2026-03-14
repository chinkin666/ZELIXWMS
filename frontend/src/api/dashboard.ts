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

/** ダッシュボード概要を取得 / Fetch dashboard overview */
export function fetchDashboardOverview(): Promise<DashboardOverview> {
  return http.get<DashboardOverview>('/dashboard/overview')
}
