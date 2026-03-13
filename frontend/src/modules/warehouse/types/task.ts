export type WarehouseTaskType = 'putaway' | 'picking' | 'replenishment' | 'packing' | 'sorting' | 'cycle_count' | 'transfer' | 'receiving'
export type WarehouseTaskStatus = 'created' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'
export type WarehouseTaskPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface WarehouseTask {
  _id: string
  taskNumber: string
  type: WarehouseTaskType
  status: WarehouseTaskStatus
  priority: WarehouseTaskPriority
  warehouseId: string
  clientId?: string
  assignedTo?: string
  assignedName?: string
  productId?: string
  productSku?: string
  productName?: string
  fromLocationId?: string
  fromLocationCode?: string
  toLocationId?: string
  toLocationCode?: string
  lotId?: string
  lotNumber?: string
  requiredQuantity: number
  completedQuantity: number
  referenceType?: string
  referenceId?: string
  referenceNumber?: string
  waveId?: string
  shipmentId?: string
  instructions?: string
  startedAt?: string
  completedAt?: string
  durationMs?: number
  memo?: string
  createdAt: string
  updatedAt: string
}

export const TASK_TYPE_LABELS: Record<WarehouseTaskType, string> = {
  putaway: '上架',
  picking: '拣货',
  replenishment: '補充',
  packing: '梱包',
  sorting: '仕分け',
  cycle_count: '棚卸',
  transfer: '移動',
  receiving: '入荷検品',
}

export const TASK_STATUS_LABELS: Record<WarehouseTaskStatus, string> = {
  created: '作成済',
  assigned: '割当済',
  in_progress: '作業中',
  completed: '完了',
  cancelled: 'キャンセル',
  on_hold: '保留',
}

export const TASK_PRIORITY_LABELS: Record<WarehouseTaskPriority, string> = {
  low: '低',
  normal: '通常',
  high: '高',
  urgent: '緊急',
}
