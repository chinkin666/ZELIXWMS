export type LocationType =
  | 'warehouse'
  | 'zone'
  | 'shelf'
  | 'bin'
  | 'staging'
  | 'receiving'
  | 'virtual/supplier'
  | 'virtual/customer'

export interface Location {
  _id: string
  code: string
  name: string
  type: LocationType
  parentId?: string
  warehouseId?: string
  fullPath: string
  coolType?: '0' | '1' | '2'
  isActive: boolean
  sortOrder: number
  memo?: string
  createdAt: string
  updatedAt: string
}

export interface StockQuant {
  _id: string
  productId: string
  productSku: string
  product?: {
    name: string
    nameFull?: string
    imageUrl?: string
    coolType?: string
    safetyStock?: number
    barcode?: string[]
    janCode?: string
    category?: string
  }
  locationId: string
  location?: {
    code: string
    name: string
    fullPath: string
    type: string
    warehouseName?: string
  }
  lotId?: string
  lot?: {
    lotNumber: string
    expiryDate?: string
    status: string
  }
  quantity: number
  reservedQuantity: number
  availableQuantity: number
  lastMovedAt?: string
  updatedAt: string
}

export interface StockSummary {
  productId: string
  productSku: string
  product?: {
    name: string
    nameFull?: string
    imageUrl?: string
    coolType?: string
    safetyStock?: number
    barcode?: string[]
    janCode?: string
    category?: string
  }
  totalQuantity: number
  totalReserved: number
  totalAvailable: number
  locationCount: number
  isBelowSafety: boolean
  lastMovedAt?: string
  warehouseName?: string
}

export type MoveType = 'inbound' | 'outbound' | 'transfer' | 'site_transfer' | 'adjustment' | 'return'
export type MoveState = 'draft' | 'confirmed' | 'done' | 'cancelled'

export interface StockMove {
  _id: string
  moveNumber: string
  moveType: MoveType
  state: MoveState
  productId: string
  productSku: string
  productName?: string
  lotId?: string
  lotNumber?: string
  fromLocation?: { code: string; name: string }
  toLocation?: { code: string; name: string }
  quantity: number
  referenceType?: string
  referenceId?: string
  referenceNumber?: string
  scheduledDate?: string
  executedAt?: string
  executedBy?: string
  reason?: string
  memo?: string
  createdAt: string
}

export type InboundOrderStatus = 'draft' | 'confirmed' | 'receiving' | 'received' | 'done' | 'cancelled'
export type StockCategory = 'new' | 'damaged'

export interface InboundOrderLine {
  lineNumber: number
  productId: string
  productSku: string
  productName?: string
  expectedQuantity: number
  receivedQuantity: number
  lotId?: string
  lotNumber?: string
  expiryDate?: string
  locationId?: string
  stockMoveIds: string[]
  putawayLocationId?: string | { _id: string; code: string; name: string }
  putawayQuantity: number
  stockCategory: StockCategory
  orderReferenceNumber?: string
  memo?: string
}

export interface InboundHistoryLine {
  orderNumber: string
  orderId: string
  orderStatus: string
  expectedDate?: string
  completedAt?: string
  supplierName?: string
  lineNumber: number
  productSku: string
  productName?: string
  locationCode?: string
  locationName?: string
  putawayLocationCode?: string
  putawayLocationName?: string
  expectedQuantity: number
  receivedQuantity: number
  stockCategory: string
  orderReferenceNumber?: string
  lotNumber?: string
  expiryDate?: string
  memo?: string
}

export interface InboundOrder {
  _id: string
  orderNumber: string
  status: InboundOrderStatus
  destinationLocationId: string | { _id: string; code: string; name: string }
  supplier?: {
    name: string
    code?: string
    memo?: string
  }
  lines: InboundOrderLine[]
  expectedDate?: string
  completedAt?: string
  memo?: string
  createdBy?: string
  createdAt: string
  updatedAt: string
  // LOGIFAST新フィールド / LOGIFAST新字段
  purchaseOrderNumber?: string
  requestedDate?: string
  containerType?: string
}

export interface LowStockAlert {
  productId: string
  productSku: string
  productName: string
  safetyStock: number
  currentStock: number
  availableQuantity: number
  shortage: number
  deficit: number
  reorderSuggestion: number
  status: 'critical' | 'warning'
  locationCode: string
  locations: Array<{
    locationCode: string
    quantity: number
    reservedQuantity: number
    availableQuantity: number
  }>
}

export type LotStatus = 'active' | 'expired' | 'recalled' | 'quarantine'

export interface Lot {
  _id: string
  lotNumber: string
  productId: string
  productSku: string
  productName?: string
  expiryDate?: string
  manufactureDate?: string
  status: LotStatus
  memo?: string
  createdAt: string
  updatedAt: string
}

export interface LotDetail extends Lot {
  quants: StockQuant[]
  totalQuantity: number
  totalReserved: number
  totalAvailable: number
}

export interface ExpiryAlert {
  lotId: string
  lotNumber: string
  productId: string
  productSku: string
  productName?: string
  expiryDate: string
  daysUntilExpiry: number | null
  isExpired: boolean
  totalQuantity: number
  totalAvailable: number
}

// 拠点間移動レコード（拡張フィールド付き）/ 跨仓库转移记录（带扩展字段）
export interface TransferRecord {
  id: string
  moveNumber: string
  moveType: string
  status: 'draft' | 'confirmed' | 'done' | 'cancelled'
  productId: string
  productSku: string
  productName?: string
  quantity: number
  fromLocationId: string
  toLocationId: string
  fromLocationCode?: string
  fromLocationName?: string
  toLocationCode?: string
  toLocationName?: string
  fromWarehouseName?: string
  toWarehouseName?: string
  reason?: string
  executedBy?: string
  executedAt?: string
  createdAt: string
  updatedAt: string
}

export interface TransferStockPayload {
  productId: string
  fromLocationId: string
  toLocationId: string
  quantity: number
  lotId?: string
  memo?: string
}

export interface BulkAdjustItem {
  productSku: string
  locationCode: string
  quantity: number
  lotNumber?: string
  memo?: string
}
