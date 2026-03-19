/**
 * GraphQL 类型定义 / GraphQL 型定義
 *
 * ZELIX WMS 核心数据模型的 GraphQL schema。
 * ZELIX WMS コアデータモデルの GraphQL スキーマ。
 */

export const typeDefs = `#graphql
  # ─── 分页 / ページネーション ───

  type PageInfo {
    total: Int!
    page: Int!
    limit: Int!
    hasNext: Boolean!
  }

  input PaginationInput {
    page: Int
    limit: Int
  }

  # ─── 出荷指示 / 出荷指示 ───

  type Address {
    name: String
    phone: String
    postalCode: String
    prefecture: String
    city: String
    street: String
    building: String
  }

  type ShipmentOrderProduct {
    productId: ID
    productSku: String
    productName: String
    quantity: Int
    price: Float
    barcode: String
  }

  type ShipmentOrderStatus {
    confirmed: Boolean
    confirmedAt: String
    printed: Boolean
    printedAt: String
    inspected: Boolean
    inspectedAt: String
    shipped: Boolean
    shippedAt: String
    held: Boolean
    heldAt: String
  }

  type CostSummary {
    productCost: Float
    materialCost: Float
    shippingCost: Float
    totalCost: Float
  }

  type ShipmentOrder {
    _id: ID!
    orderNumber: String!
    carrierId: String
    customerManagementNumber: String
    orderer: Address
    recipient: Address
    products: [ShipmentOrderProduct!]!
    shipPlanDate: String
    destinationType: String
    trackingId: String
    status: ShipmentOrderStatus
    costSummary: CostSummary
    memo: String
    createdAt: String
    updatedAt: String
  }

  type ShipmentOrderConnection {
    data: [ShipmentOrder!]!
    pageInfo: PageInfo!
  }

  # ─── 商品 / 商品 ───

  type Product {
    _id: ID!
    sku: String!
    name: String!
    nameFull: String
    clientId: ID
    barcode: [String]
    coolType: String
    price: Float
    costPrice: Float
    imageUrl: String
    category: String
    allocationRule: String
    serialTrackingEnabled: Boolean
    lotTrackingEnabled: Boolean
    expiryTrackingEnabled: Boolean
    safetyStock: Int
    fbaEnabled: Boolean
    fnsku: String
    asin: String
    createdAt: String
    updatedAt: String
  }

  type ProductConnection {
    data: [Product!]!
    pageInfo: PageInfo!
  }

  # ─── 在庫 / 在庫 ───

  type StockQuant {
    _id: ID!
    productId: ID!
    productSku: String!
    locationId: ID!
    quantity: Int!
    reservedQuantity: Int!
    availableQuantity: Int!
    lastMovedAt: String
    product: Product
  }

  type StockQuantConnection {
    data: [StockQuant!]!
    pageInfo: PageInfo!
  }

  type StockSummary {
    productSku: String!
    productName: String
    totalQuantity: Int!
    totalReserved: Int!
    totalAvailable: Int!
    locationCount: Int!
  }

  # ─── 入庫 / 入庫 ───

  type InboundOrderLine {
    productId: ID
    productSku: String
    expectedQuantity: Int
    receivedQuantity: Int
  }

  type InboundOrder {
    _id: ID!
    orderNumber: String!
    status: String!
    flowType: String
    destinationType: String
    lines: [InboundOrderLine!]!
    clientId: ID
    createdAt: String
    updatedAt: String
  }

  type InboundOrderConnection {
    data: [InboundOrder!]!
    pageInfo: PageInfo!
  }

  # ─── 客户 / 顧客 ───

  type Client {
    _id: ID!
    tenantId: String!
    clientCode: String!
    name: String!
    clientType: String
    contactName: String
    phone: String
    email: String
    plan: String
    isActive: Boolean!
    createdAt: String
    updatedAt: String
  }

  type ClientConnection {
    data: [Client!]!
    pageInfo: PageInfo!
  }

  # ─── 仓库 / 倉庫 ───

  type Warehouse {
    _id: ID!
    code: String!
    name: String!
    prefecture: String
    city: String
    address: String
    phone: String
    coolTypes: [String]
    capacity: Int
    isActive: Boolean!
  }

  # ─── Wave / ウェーブ ───

  type Wave {
    _id: ID!
    waveNumber: String!
    status: String!
    priority: String!
    shipmentCount: Int!
    totalItems: Int!
    totalQuantity: Int!
    assignedTo: String
    assignedName: String
    startedAt: String
    completedAt: String
    createdAt: String
  }

  type WaveConnection {
    data: [Wave!]!
    pageInfo: PageInfo!
  }

  # ─── 库存移动 / 在庫移動 ───

  type StockMove {
    _id: ID!
    moveNumber: String!
    moveType: String!
    state: String!
    productSku: String!
    productName: String
    quantity: Int!
    referenceType: String
    referenceNumber: String
    executedAt: String
    executedBy: String
    createdAt: String
  }

  type StockMoveConnection {
    data: [StockMove!]!
    pageInfo: PageInfo!
  }

  # ─── 仪表板统计 / ダッシュボード統計 ───

  type DashboardStats {
    totalOrders: Int!
    pendingOrders: Int!
    shippedToday: Int!
    totalProducts: Int!
    totalStock: Int!
    lowStockCount: Int!
    activeClients: Int!
    activeWaves: Int!
  }

  # ─── 筛选 / フィルタ ───

  input ShipmentOrderFilter {
    status: String
    carrierId: String
    destinationType: String
    dateFrom: String
    dateTo: String
    search: String
  }

  input ProductFilter {
    category: String
    clientId: ID
    search: String
  }

  input StockFilter {
    productSku: String
    locationId: ID
    belowSafety: Boolean
  }

  input InboundOrderFilter {
    status: String
    clientId: ID
    flowType: String
    search: String
  }

  # ─── Query ───

  type Query {
    # 出荷指示 / 出荷指示
    shipmentOrder(id: ID!): ShipmentOrder
    shipmentOrders(filter: ShipmentOrderFilter, pagination: PaginationInput): ShipmentOrderConnection!

    # 商品 / 商品
    product(id: ID!): Product
    productBySku(sku: String!): Product
    products(filter: ProductFilter, pagination: PaginationInput): ProductConnection!

    # 在庫 / 在庫
    stockQuants(filter: StockFilter, pagination: PaginationInput): StockQuantConnection!
    stockSummary(productSku: String): [StockSummary!]!

    # 入庫 / 入庫
    inboundOrder(id: ID!): InboundOrder
    inboundOrders(filter: InboundOrderFilter, pagination: PaginationInput): InboundOrderConnection!

    # 顧客 / 客户
    client(id: ID!): Client
    clients(pagination: PaginationInput): ClientConnection!

    # 倉庫 / 仓库
    warehouses: [Warehouse!]!

    # Wave / ウェーブ
    waves(status: String, pagination: PaginationInput): WaveConnection!

    # 在庫移動 / 库存移动
    stockMoves(moveType: String, pagination: PaginationInput): StockMoveConnection!

    # ダッシュボード / 仪表板
    dashboardStats: DashboardStats!
  }

  # ─── Mutation 入力型 / Mutation 入力型 ───

  input AddressInput {
    name: String
    phone: String
    postalCode: String
    prefecture: String
    city: String
    street: String
    building: String
  }

  input ShipmentOrderProductInput {
    productSku: String!
    productName: String
    quantity: Int!
    price: Float
    barcode: String
  }

  input CreateShipmentOrderInput {
    carrierId: String
    customerManagementNumber: String
    orderer: AddressInput
    recipient: AddressInput!
    products: [ShipmentOrderProductInput!]!
    shipPlanDate: String
    destinationType: String
    memo: String
  }

  input UpdateShipmentOrderInput {
    carrierId: String
    customerManagementNumber: String
    orderer: AddressInput
    recipient: AddressInput
    shipPlanDate: String
    destinationType: String
    memo: String
    trackingId: String
  }

  input CreateProductInput {
    sku: String!
    name: String!
    nameFull: String
    clientId: ID
    barcode: [String]
    coolType: String
    price: Float
    costPrice: Float
    imageUrl: String
    category: String
    allocationRule: String
    safetyStock: Int
  }

  input UpdateProductInput {
    name: String
    nameFull: String
    barcode: [String]
    coolType: String
    price: Float
    costPrice: Float
    imageUrl: String
    category: String
    allocationRule: String
    safetyStock: Int
  }

  input CreateInboundOrderInput {
    destinationLocationId: ID
    clientId: ID
    flowType: String
    destinationType: String
    lines: [InboundOrderLineInput!]!
  }

  input InboundOrderLineInput {
    productSku: String!
    expectedQuantity: Int!
  }

  input CreateClientInput {
    tenantId: String!
    clientCode: String!
    name: String!
    clientType: String
    contactName: String
    phone: String
    email: String
    plan: String
  }

  input UpdateClientInput {
    name: String
    clientType: String
    contactName: String
    phone: String
    email: String
    plan: String
    isActive: Boolean
  }

  input StockAdjustmentInput {
    productSku: String!
    locationId: ID!
    quantity: Int!
    reason: String
  }

  # ─── Mutation 返回型 / Mutation 戻り値型 ───

  type MutationResult {
    success: Boolean!
    message: String
    id: ID
  }

  # ─── Mutation ───

  type Mutation {
    # 出荷指示 / 出荷指示
    createShipmentOrder(input: CreateShipmentOrderInput!): ShipmentOrder!
    updateShipmentOrder(id: ID!, input: UpdateShipmentOrderInput!): ShipmentOrder
    confirmShipmentOrder(id: ID!): ShipmentOrder
    holdShipmentOrder(id: ID!, reason: String): ShipmentOrder
    unholdShipmentOrder(id: ID!): ShipmentOrder
    cancelShipmentOrder(id: ID!, reason: String): MutationResult!

    # 商品 / 商品
    createProduct(input: CreateProductInput!): Product!
    updateProduct(id: ID!, input: UpdateProductInput!): Product
    deleteProduct(id: ID!): MutationResult!

    # 入庫 / 入庫
    createInboundOrder(input: CreateInboundOrderInput!): InboundOrder!
    confirmInboundOrder(id: ID!): InboundOrder
    cancelInboundOrder(id: ID!): MutationResult!

    # 顧客 / 客户
    createClient(input: CreateClientInput!): Client!
    updateClient(id: ID!, input: UpdateClientInput!): Client

    # 在庫調整 / 库存调整
    adjustStock(input: StockAdjustmentInput!): MutationResult!
  }
`;
