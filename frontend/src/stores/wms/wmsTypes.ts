// WMS Type Definitions & Default Configuration

// ===== Core Types =====

export type UserRole = 'super_admin' | 'admin' | 'operator' | 'viewer'

export interface WmsMenuItem {
  id: string
  key: string // i18n key
  label: string // default label (Japanese)
  icon: string
  order: number
  visible: boolean
  permissions: UserRole[]
  children: WmsMenuItem[]
  badge?: { text: string; variant: 'primary' | 'success' | 'warning' | 'danger' }
}

export interface TableColumn {
  id: string
  key: string
  label: string
  type: 'text' | 'number' | 'date' | 'datetime' | 'boolean' | 'status' | 'badge' | 'link' | 'image' | 'actions'
  width?: string
  sortable: boolean
  filterable: boolean
  visible: boolean
  order: number
  format?: string // date format, number format
  options?: { value: string; label: string; variant?: string }[] // for status/badge
  editable?: boolean
}

export interface TableConfig {
  id: string
  columns: TableColumn[]
  defaultSort?: { key: string; direction: 'asc' | 'desc' }
  pageSize: number
  pageSizeOptions: number[]
  selectable: boolean
  exportable: boolean
  printable: boolean
  searchable: boolean
  groupBy?: string[]
}

export interface ActionConfig {
  id: string
  type: 'create' | 'edit' | 'delete' | 'upload' | 'download' | 'print' | 'api' | 'export' | 'import' | 'scan' | 'custom'
  label: string
  icon: string
  permissions: UserRole[]
  position: 'toolbar' | 'row' | 'bulk' | 'context'
  confirmMessage?: string
  apiEndpoint?: string
  handler?: string // custom handler name
  visible: boolean
  order: number
}

export interface PageConfig {
  id: string
  menuId: string
  title: string
  layout: 'list' | 'kanban' | 'form' | 'dashboard' | 'calendar' | 'split'
  tableId?: string
  actions: ActionConfig[]
  filters?: FilterConfig[]
  components?: PageComponent[]
}

export interface FilterConfig {
  id: string
  key: string
  label: string
  type: 'text' | 'select' | 'date' | 'daterange' | 'number' | 'boolean' | 'warehouse' | 'client' | 'user'
  options?: { value: string; label: string }[]
  defaultValue?: any
}

export interface PageComponent {
  id: string
  type: 'stats-cards' | 'chart' | 'recent-activity' | 'alerts' | 'quick-actions' | 'barcode-input'
  config: Record<string, any>
  order: number
  span?: number // grid columns (1-12)
}

export interface EnvironmentConfig {
  id: string
  name: string
  warehouseId: string
  clientId?: string
  menus: WmsMenuItem[]
  tables: Record<string, TableConfig>
  pages: Record<string, PageConfig>
  customActions: ActionConfig[]
  theme?: { primaryColor?: string; logo?: string }
}

// ===== Warehouse Types =====

export interface Warehouse {
  id: string
  code: string
  name: string
  address: string
  zones: WarehouseZone[]
  isActive: boolean
}

export interface WarehouseZone {
  id: string
  code: string
  name: string
  type: 'receiving' | 'storage' | 'picking' | 'packing' | 'shipping' | 'returns' | 'quarantine'
  locations: WarehouseLocation[]
}

export interface WarehouseLocation {
  id: string
  code: string
  zoneId: string
  capacity: number
  currentLoad: number
  isActive: boolean
}

// ===== User Types =====

export interface WmsUser {
  id: string
  username: string
  displayName: string
  role: UserRole
  parentUserId?: string
  warehouseIds: string[]
  clientIds: string[]
  permissions: string[]
  settings: Record<string, any>
  createdAt: string
  lastLoginAt?: string
}

export interface Client3PL {
  id: string
  code: string
  name: string
  contactInfo: { email: string; phone: string; address: string }
  warehouseIds: string[]
  isActive: boolean
}

// ===== WMS Domain Types =====

export type InboundStatus = 'pending' | 'scheduled' | 'arriving' | 'receiving' | 'inspecting' | 'putaway' | 'completed' | 'cancelled'
export type OutboundStatus = 'pending' | 'allocated' | 'picking' | 'packing' | 'shipping' | 'shipped' | 'delivered' | 'cancelled'
export type OrderStatus = 'draft' | 'confirmed' | 'processing' | 'ready' | 'shipped' | 'delivered' | 'cancelled'
export type ReturnStatus = 'requested' | 'approved' | 'receiving' | 'inspecting' | 'restocked' | 'disposed' | 'completed' | 'rejected'
export type StocktakeStatus = 'planned' | 'in_progress' | 'counting' | 'review' | 'adjusted' | 'completed'

export interface InboundShipment {
  id: string
  shipmentNo: string
  clientId: string
  warehouseId: string
  status: InboundStatus
  expectedDate: string
  actualDate?: string
  supplierName: string
  items: InboundItem[]
  notes?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface InboundItem {
  id: string
  sku: string
  productName: string
  expectedQty: number
  receivedQty: number
  damagedQty: number
  lotNumber?: string
  expiryDate?: string
  locationCode?: string
}

export interface InventoryItem {
  id: string
  sku: string
  productName: string
  clientId: string
  warehouseId: string
  locationCode: string
  quantity: number
  availableQty: number
  reservedQty: number
  lotNumber?: string
  expiryDate?: string
  lastCountedAt?: string
  updatedAt: string
}

export interface SalesOrder {
  id: string
  orderNo: string
  clientId: string
  warehouseId: string
  status: OrderStatus
  customerName: string
  shippingAddress: string
  orderDate: string
  requiredDate: string
  items: OrderItem[]
  priority: 'low' | 'normal' | 'high' | 'urgent'
  notes?: string
  createdBy: string
}

export interface OrderItem {
  id: string
  sku: string
  productName: string
  orderedQty: number
  allocatedQty: number
  pickedQty: number
  unitPrice: number
}

export interface OutboundShipment {
  id: string
  shipmentNo: string
  orderId: string
  clientId: string
  warehouseId: string
  status: OutboundStatus
  carrier: string
  trackingNo?: string
  shippedDate?: string
  items: OutboundItem[]
  createdBy: string
}

export interface OutboundItem {
  id: string
  sku: string
  productName: string
  qty: number
  pickedQty: number
  locationCode: string
}

export interface ReturnRequest {
  id: string
  returnNo: string
  originalOrderId?: string
  clientId: string
  warehouseId: string
  status: ReturnStatus
  reason: string
  items: ReturnItem[]
  createdBy: string
  createdAt: string
}

export interface ReturnItem {
  id: string
  sku: string
  productName: string
  qty: number
  condition: 'good' | 'damaged' | 'defective'
  disposition: 'restock' | 'dispose' | 'return_to_supplier'
}

export interface StocktakeTask {
  id: string
  taskNo: string
  warehouseId: string
  type: 'full' | 'cycle' | 'spot'
  status: StocktakeStatus
  zoneIds: string[]
  scheduledDate: string
  completedDate?: string
  assignedUsers: string[]
  items: StocktakeItem[]
}

export interface StocktakeItem {
  id: string
  sku: string
  productName: string
  locationCode: string
  systemQty: number
  countedQty?: number
  variance?: number
  countedBy?: string
  countedAt?: string
}

export interface DailyReport {
  id: string
  date: string
  warehouseId: string
  inboundCount: number
  outboundCount: number
  returnsCount: number
  pickedOrders: number
  issues: string[]
  createdBy: string
}

export interface BillingRecord {
  id: string
  invoiceNo: string
  clientId: string
  period: string // "2026-03" format
  storageCharges: number
  handlingCharges: number
  shippingCharges: number
  additionalCharges: { label: string; amount: number }[]
  totalAmount: number
  status: 'draft' | 'sent' | 'paid' | 'overdue'
  dueDate: string
}

// ===== Default Menu Configuration =====

export const DEFAULT_WMS_MENUS: WmsMenuItem[] = [
  {
    id: 'inbound',
    key: 'wms.menu.inbound',
    label: '入库管理',
    icon: '📥',
    order: 1,
    visible: true,
    permissions: ['super_admin', 'admin', 'operator'],
    children: [
      { id: 'inbound-list', key: 'wms.menu.inboundList', label: '入库一覧', icon: '📋', order: 1, visible: true, permissions: ['super_admin', 'admin', 'operator'], children: [] },
      { id: 'inbound-create', key: 'wms.menu.inboundCreate', label: '入库予定登録', icon: '➕', order: 2, visible: true, permissions: ['super_admin', 'admin', 'operator'], children: [] },
      { id: 'inbound-inspect', key: 'wms.menu.inboundInspect', label: '検品', icon: '🔍', order: 3, visible: true, permissions: ['super_admin', 'admin', 'operator'], children: [] },
      { id: 'inbound-putaway', key: 'wms.menu.inboundPutaway', label: '棚入れ', icon: '📦', order: 4, visible: true, permissions: ['super_admin', 'admin', 'operator'], children: [] },
      { id: 'inbound-history', key: 'wms.menu.inboundHistory', label: '入库履歴', icon: '📊', order: 5, visible: true, permissions: ['super_admin', 'admin'], children: [] },
    ],
  },
  {
    id: 'inventory',
    key: 'wms.menu.inventory',
    label: '在库管理',
    icon: '🏭',
    order: 2,
    visible: true,
    permissions: ['super_admin', 'admin', 'operator'],
    children: [
      { id: 'inventory-list', key: 'wms.menu.inventoryList', label: '在库一覧', icon: '📋', order: 1, visible: true, permissions: ['super_admin', 'admin', 'operator'], children: [] },
      { id: 'inventory-location', key: 'wms.menu.inventoryLocation', label: 'ロケーション管理', icon: '📍', order: 2, visible: true, permissions: ['super_admin', 'admin'], children: [] },
      { id: 'inventory-lot', key: 'wms.menu.inventoryLot', label: 'ロット管理', icon: '🏷️', order: 3, visible: true, permissions: ['super_admin', 'admin', 'operator'], children: [] },
      { id: 'inventory-move', key: 'wms.menu.inventoryMove', label: '在库移動', icon: '🔄', order: 4, visible: true, permissions: ['super_admin', 'admin', 'operator'], children: [] },
      { id: 'inventory-adjust', key: 'wms.menu.inventoryAdjust', label: '在库調整', icon: '📝', order: 5, visible: true, permissions: ['super_admin', 'admin'], children: [] },
      { id: 'inventory-expiry', key: 'wms.menu.inventoryExpiry', label: '期限管理', icon: '⏰', order: 6, visible: true, permissions: ['super_admin', 'admin', 'operator'], children: [] },
    ],
  },
  {
    id: 'orders',
    key: 'wms.menu.orders',
    label: '受注管理',
    icon: '📝',
    order: 3,
    visible: true,
    permissions: ['super_admin', 'admin', 'operator'],
    children: [
      { id: 'orders-list', key: 'wms.menu.ordersList', label: '受注一覧', icon: '📋', order: 1, visible: true, permissions: ['super_admin', 'admin', 'operator'], children: [] },
      { id: 'orders-create', key: 'wms.menu.ordersCreate', label: '受注登録', icon: '➕', order: 2, visible: true, permissions: ['super_admin', 'admin', 'operator'], children: [] },
      { id: 'orders-allocate', key: 'wms.menu.ordersAllocate', label: '引当処理', icon: '🔗', order: 3, visible: true, permissions: ['super_admin', 'admin', 'operator'], children: [] },
      { id: 'orders-backorder', key: 'wms.menu.ordersBackorder', label: 'バックオーダー', icon: '⏳', order: 4, visible: true, permissions: ['super_admin', 'admin'], children: [] },
    ],
  },
  {
    id: 'shipping',
    key: 'wms.menu.shipping',
    label: '出荷管理',
    icon: '🚚',
    order: 4,
    visible: true,
    permissions: ['super_admin', 'admin', 'operator'],
    children: [
      { id: 'shipping-list', key: 'wms.menu.shippingList', label: '出荷一覧', icon: '📋', order: 1, visible: true, permissions: ['super_admin', 'admin', 'operator'], children: [] },
      { id: 'shipping-picking', key: 'wms.menu.shippingPicking', label: 'ピッキング', icon: '🛒', order: 2, visible: true, permissions: ['super_admin', 'admin', 'operator'], children: [] },
      { id: 'shipping-packing', key: 'wms.menu.shippingPacking', label: '梱包', icon: '📦', order: 3, visible: true, permissions: ['super_admin', 'admin', 'operator'], children: [] },
      { id: 'shipping-dispatch', key: 'wms.menu.shippingDispatch', label: '出荷確定', icon: '✅', order: 4, visible: true, permissions: ['super_admin', 'admin', 'operator'], children: [] },
      { id: 'shipping-tracking', key: 'wms.menu.shippingTracking', label: '配送追跡', icon: '📡', order: 5, visible: true, permissions: ['super_admin', 'admin'], children: [] },
    ],
  },
  {
    id: 'returns',
    key: 'wms.menu.returns',
    label: '返品管理',
    icon: '🔄',
    order: 5,
    visible: true,
    permissions: ['super_admin', 'admin', 'operator'],
    children: [
      { id: 'returns-list', key: 'wms.menu.returnsList', label: '返品一覧', icon: '📋', order: 1, visible: true, permissions: ['super_admin', 'admin', 'operator'], children: [] },
      { id: 'returns-create', key: 'wms.menu.returnsCreate', label: '返品受付', icon: '➕', order: 2, visible: true, permissions: ['super_admin', 'admin', 'operator'], children: [] },
      { id: 'returns-inspect', key: 'wms.menu.returnsInspect', label: '返品検品', icon: '🔍', order: 3, visible: true, permissions: ['super_admin', 'admin', 'operator'], children: [] },
      { id: 'returns-dispose', key: 'wms.menu.returnsDispose', label: '廃棄処理', icon: '🗑️', order: 4, visible: true, permissions: ['super_admin', 'admin'], children: [] },
    ],
  },
  {
    id: 'stocktake',
    key: 'wms.menu.stocktake',
    label: '棚卸管理',
    icon: '📊',
    order: 6,
    visible: true,
    permissions: ['super_admin', 'admin', 'operator'],
    children: [
      { id: 'stocktake-list', key: 'wms.menu.stocktakeList', label: '棚卸一覧', icon: '📋', order: 1, visible: true, permissions: ['super_admin', 'admin', 'operator'], children: [] },
      { id: 'stocktake-create', key: 'wms.menu.stocktakeCreate', label: '棚卸計画', icon: '📅', order: 2, visible: true, permissions: ['super_admin', 'admin'], children: [] },
      { id: 'stocktake-count', key: 'wms.menu.stocktakeCount', label: '棚卸実施', icon: '🔢', order: 3, visible: true, permissions: ['super_admin', 'admin', 'operator'], children: [] },
      { id: 'stocktake-result', key: 'wms.menu.stocktakeResult', label: '棚卸結果', icon: '📊', order: 4, visible: true, permissions: ['super_admin', 'admin'], children: [] },
    ],
  },
  {
    id: 'daily',
    key: 'wms.menu.daily',
    label: '日次管理',
    icon: '📅',
    order: 7,
    visible: true,
    permissions: ['super_admin', 'admin'],
    children: [
      { id: 'daily-report', key: 'wms.menu.dailyReport', label: '日次レポート', icon: '📊', order: 1, visible: true, permissions: ['super_admin', 'admin'], children: [] },
      { id: 'daily-close', key: 'wms.menu.dailyClose', label: '日次締め処理', icon: '🔒', order: 2, visible: true, permissions: ['super_admin', 'admin'], children: [] },
      { id: 'daily-issues', key: 'wms.menu.dailyIssues', label: '問題・課題', icon: '⚠️', order: 3, visible: true, permissions: ['super_admin', 'admin', 'operator'], children: [] },
      { id: 'daily-kpi', key: 'wms.menu.dailyKpi', label: 'KPIダッシュボード', icon: '📈', order: 4, visible: true, permissions: ['super_admin', 'admin'], children: [] },
    ],
  },
  {
    id: 'billing',
    key: 'wms.menu.billing',
    label: '請求管理',
    icon: '💰',
    order: 8,
    visible: true,
    permissions: ['super_admin', 'admin'],
    children: [
      { id: 'billing-list', key: 'wms.menu.billingList', label: '請求一覧', icon: '📋', order: 1, visible: true, permissions: ['super_admin', 'admin'], children: [] },
      { id: 'billing-create', key: 'wms.menu.billingCreate', label: '請求書作成', icon: '➕', order: 2, visible: true, permissions: ['super_admin', 'admin'], children: [] },
      { id: 'billing-rates', key: 'wms.menu.billingRates', label: '料金マスタ', icon: '💲', order: 3, visible: true, permissions: ['super_admin', 'admin'], children: [] },
      { id: 'billing-report', key: 'wms.menu.billingReport', label: '請求レポート', icon: '📊', order: 4, visible: true, permissions: ['super_admin', 'admin'], children: [] },
    ],
  },
  {
    id: 'settings',
    key: 'wms.menu.settings',
    label: '設定管理',
    icon: '⚙️',
    order: 9,
    visible: true,
    permissions: ['super_admin', 'admin'],
    children: [
      { id: 'settings-warehouse', key: 'wms.menu.settingsWarehouse', label: '倉庫設定', icon: '🏭', order: 1, visible: true, permissions: ['super_admin', 'admin'], children: [] },
      { id: 'settings-users', key: 'wms.menu.settingsUsers', label: 'ユーザー管理', icon: '👥', order: 2, visible: true, permissions: ['super_admin', 'admin'], children: [] },
      { id: 'settings-clients', key: 'wms.menu.settingsClients', label: '荷主管理', icon: '🏢', order: 3, visible: true, permissions: ['super_admin', 'admin'], children: [] },
      { id: 'settings-products', key: 'wms.menu.settingsProducts', label: '商品マスタ', icon: '📦', order: 4, visible: true, permissions: ['super_admin', 'admin', 'operator'], children: [] },
      { id: 'settings-locations', key: 'wms.menu.settingsLocations', label: 'ロケーション設定', icon: '📍', order: 5, visible: true, permissions: ['super_admin', 'admin'], children: [] },
      { id: 'settings-menu', key: 'wms.menu.settingsMenu', label: 'メニュー編集', icon: '📝', order: 6, visible: true, permissions: ['super_admin'], children: [] },
      { id: 'settings-table', key: 'wms.menu.settingsTable', label: 'テーブル設定', icon: '🗂️', order: 7, visible: true, permissions: ['super_admin'], children: [] },
      { id: 'settings-actions', key: 'wms.menu.settingsActions', label: 'アクション設定', icon: '⚡', order: 8, visible: true, permissions: ['super_admin'], children: [] },
      { id: 'settings-import', key: 'wms.menu.settingsImport', label: 'データインポート', icon: '📥', order: 9, visible: true, permissions: ['super_admin', 'admin'], children: [] },
      { id: 'settings-export', key: 'wms.menu.settingsExport', label: 'データエクスポート', icon: '📤', order: 10, visible: true, permissions: ['super_admin', 'admin'], children: [] },
    ],
  },
]
