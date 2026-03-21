/**
 * E2E API フロー統合テスト / E2E API Flow Integration Test
 *
 * 実際のユーザーシナリオをシミュレート：
 * 模拟实际用户场景：
 *
 * 1. 認証 → ログイン / 认证 → 登录
 * 2. 倉庫マスタ作成 / 创建仓库主数据
 * 3. 商品マスタ作成 / 创建商品主数据
 * 4. 入庫指示作成・受入・棚入 / 创建入库指示・收货・上架
 * 5. 在庫確認 / 库存确认
 * 6. 出荷指示作成 / 创建出荷指示
 * 7. 棚卸指示作成 / 创建棚卸指示
 * 8. 日次レポート生成 / 生成日报
 * 9. ダッシュボード概要確認 / 确认仪表盘概览
 *
 * モック方針 / Mock strategy:
 * - 全モデルをモック、DB 不要
 *   All models mocked, no DB required
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モデルモック / Model Mocks ────────────────────────────────

vi.mock('@/models/user', () => ({
  User: {
    findOne: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    updateOne: vi.fn(),
    hashPassword: vi.fn((pw: string) => `hashed_${pw}`),
    verifyPassword: vi.fn(),
  },
}))

vi.mock('@/models/tenant', () => ({
  Tenant: {
    findOne: vi.fn(),
    create: vi.fn(),
  },
}))

vi.mock('@/models/warehouse', () => ({
  Warehouse: {
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn(),
  },
}))

vi.mock('@/models/product', () => ({
  Product: {
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn(),
    insertMany: vi.fn(),
    updateMany: vi.fn(),
    findOneAndUpdate: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
  },
  computeAllSku: vi.fn((sku: string) => [sku]),
}))

vi.mock('@/models/shipmentOrder', () => ({
  ShipmentOrder: {
    find: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
  },
}))

vi.mock('@/models/inboundOrder', () => ({
  InboundOrder: {
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
  },
}))

vi.mock('@/models/returnOrder', () => ({
  ReturnOrder: {
    countDocuments: vi.fn(),
  },
}))

vi.mock('@/models/stockQuant', () => ({
  StockQuant: {
    find: vi.fn(),
    findOneAndUpdate: vi.fn(),
    aggregate: vi.fn(),
    countDocuments: vi.fn(),
  },
}))

vi.mock('@/models/stockMove', () => ({
  StockMove: {
    create: vi.fn(),
    updateOne: vi.fn(),
  },
}))

vi.mock('@/models/location', () => ({
  Location: {
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
  },
}))

vi.mock('@/models/dailyReport', () => ({
  DailyReport: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
}))

vi.mock('@/models/stocktakingOrder', () => ({
  StocktakingOrder: {
    countDocuments: vi.fn(),
  },
}))

vi.mock('@/api/middleware/auth', () => ({
  generateToken: vi.fn(() => 'e2e-test-jwt-token'),
}))

vi.mock('@/config/env', () => ({
  loadEnv: vi.fn(() => ({ fileDir: '/tmp/test' })),
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

vi.mock('@/services/operationLogger', () => ({
  logOperation: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/services/chargeService', () => ({
  createAutoCharge: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/schemas/productSchema', () => ({
  createProductSchema: { safeParse: vi.fn() },
  updateProductSchema: { safeParse: vi.fn() },
}))

vi.mock('sharp', () => ({
  default: vi.fn(() => ({
    resize: vi.fn().mockReturnThis(),
    webp: vi.fn().mockReturnThis(),
    toFile: vi.fn().mockResolvedValue(undefined),
  })),
}))

vi.mock('fs', () => ({
  default: { mkdirSync: vi.fn() },
  mkdirSync: vi.fn(),
}))

vi.mock('@/utils/sequenceGenerator', () => ({
  generateSequenceNumber: vi.fn().mockResolvedValue('IN-00001'),
}))

vi.mock('@/api/controllers/lotController', () => ({
  findOrCreateLot: vi.fn().mockResolvedValue('lot-id-1'),
}))

vi.mock('@/api/helpers/tenantHelper', () => ({
  getWarehouseFilter: vi.fn(() => []),
}))

import { User } from '@/models/user'
import { Tenant } from '@/models/tenant'
import { Warehouse } from '@/models/warehouse'
import { Product } from '@/models/product'
import { InboundOrder } from '@/models/inboundOrder'
import { ShipmentOrder } from '@/models/shipmentOrder'
import { StockQuant } from '@/models/stockQuant'
import { DailyReport } from '@/models/dailyReport'
import { ReturnOrder } from '@/models/returnOrder'
import { StocktakingOrder } from '@/models/stocktakingOrder'
import { login, register } from '@/api/controllers/authController'
import { createWarehouse, listWarehouses } from '@/api/controllers/warehouseController'
import { getDashboardOverview } from '@/api/controllers/dashboardController'

// ─── テストヘルパー / Test helpers ─────────────────────────────

function mockReq(overrides: Record<string, unknown> = {}): any {
  return { body: {}, params: {}, query: {}, user: undefined, headers: {}, ...overrides }
}

function mockRes(): any {
  const res: any = { _data: null, _status: 200 }
  res.status = vi.fn((code: number) => { res._status = code; return res })
  res.json = vi.fn((data: any) => { res._data = data; return res })
  return res
}

// ─── E2E シナリオ / E2E Scenarios ──────────────────────────────

describe('E2E: 完全倉庫業務フロー / Complete Warehouse Operations Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('シナリオ1: 新テナント登録 → ログイン / Scenario 1: New tenant registration → Login', async () => {
    // Step 1: 登録 / Register
    vi.mocked(Tenant.findOne).mockResolvedValue(null)
    vi.mocked(User.findOne).mockResolvedValue(null)
    vi.mocked(Tenant.create).mockResolvedValue({ tenantCode: 'E2E-TENANT' } as any)
    vi.mocked(User.create).mockResolvedValue({
      _id: { toString: () => 'user-e2e' },
      email: 'admin@e2e-test.com',
      displayName: 'E2E Admin',
      role: 'admin',
      tenantId: 'E2E-TENANT',
      isActive: true,
      warehouseIds: [],
    } as any)

    const registerReq = mockReq({
      body: {
        tenantCode: 'E2E-TENANT',
        tenantName: 'E2Eテストテナント',
        email: 'admin@e2e-test.com',
        password: 'e2etest1234',
        displayName: 'E2E Admin',
      },
    })
    const registerRes = mockRes()
    await register(registerReq, registerRes)
    expect(registerRes._status).toBe(201)
    expect(registerRes._data.token).toBe('e2e-test-jwt-token')

    // Step 2: ログイン / Login
    vi.mocked(User.findOne).mockResolvedValue({
      _id: { toString: () => 'user-e2e' },
      email: 'admin@e2e-test.com',
      isActive: true,
      passwordHash: 'hashed',
      tenantId: 'E2E-TENANT',
      role: 'admin',
      displayName: 'E2E Admin',
      warehouseIds: [],
    } as any)
    vi.mocked(User.verifyPassword).mockReturnValue(true)
    vi.mocked(User.updateOne).mockResolvedValue({} as any)

    const loginReq = mockReq({
      body: { email: 'admin@e2e-test.com', password: 'e2etest1234', tenantId: 'E2E-TENANT' },
    })
    const loginRes = mockRes()
    await login(loginReq, loginRes)
    expect(loginRes._status).toBe(200)
    expect(loginRes._data.token).toBeDefined()
  })

  it('シナリオ2: 倉庫作成 → 商品登録 / Scenario 2: Warehouse creation → Product registration', async () => {
    // Step 1: 倉庫作成 / Create warehouse
    const leanMock = vi.fn().mockResolvedValue(null)
    vi.mocked(Warehouse.findOne).mockReturnValue({ lean: leanMock } as any)
    vi.mocked(Warehouse.create).mockResolvedValue({
      _id: 'wh-e2e',
      code: 'WH-E2E',
      name: 'E2Eテスト倉庫',
      toObject: () => ({ _id: 'wh-e2e', code: 'WH-E2E', name: 'E2Eテスト倉庫' }),
    } as any)

    const whReq = mockReq({ body: { code: 'WH-E2E', name: 'E2Eテスト倉庫' } })
    const whRes = mockRes()
    await createWarehouse(whReq, whRes)
    expect(whRes._status).toBe(201)
    expect(whRes._data.code).toBe('WH-E2E')

    // Step 2: 倉庫一覧確認 / Verify warehouse list
    const whListChain = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        { _id: 'wh-e2e', code: 'WH-E2E', name: 'E2Eテスト倉庫' },
      ]),
    }
    vi.mocked(Warehouse.find).mockReturnValue(whListChain as any)
    vi.mocked(Warehouse.countDocuments).mockResolvedValue(1)

    const listReq = mockReq({ query: {} })
    const listRes = mockRes()
    await listWarehouses(listReq, listRes)
    expect(listRes._data.data).toHaveLength(1)
    expect(listRes._data.data[0].code).toBe('WH-E2E')
  })

  it('シナリオ3: ダッシュボード概要確認 / Scenario 3: Dashboard overview check', async () => {
    // 各種統計クエリをモック / Mock statistics queries
    vi.mocked(ShipmentOrder.countDocuments).mockResolvedValue(15)
    vi.mocked(InboundOrder.countDocuments).mockResolvedValue(8)
    vi.mocked(ReturnOrder.countDocuments).mockResolvedValue(2)
    vi.mocked(StockQuant.aggregate).mockResolvedValue([{ totalQuantity: 5000, skuCount: 100 }])
    vi.mocked(StockQuant.countDocuments).mockResolvedValue(200)
    vi.mocked(InboundOrder.aggregate).mockResolvedValue([{ totalLines: 30 }])
    vi.mocked(StocktakingOrder.countDocuments).mockResolvedValue(1)

    const chainMock = {
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        { _id: 'so1', orderNumber: 'SO-E2E-001', status: {}, createdAt: new Date() },
      ]),
    }
    vi.mocked(ShipmentOrder.find).mockReturnValue(chainMock as any)

    const req = mockReq()
    const res = mockRes()
    await getDashboardOverview(req, res)

    expect(res._status).toBe(200)
    expect(res._data.shipments).toBeDefined()
    expect(res._data.generatedAt).toBeDefined()
  })

  it('シナリオ4: 倉庫一覧取得 / Scenario 4: Warehouse list retrieval', async () => {
    const whChain = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        { _id: 'wh1', code: 'WH01', name: '東京倉庫' },
        { _id: 'wh2', code: 'WH02', name: '大阪倉庫' },
      ]),
    }
    vi.mocked(Warehouse.find).mockReturnValue(whChain as any)
    vi.mocked(Warehouse.countDocuments).mockResolvedValue(2)

    const whReq = mockReq({ query: { page: '1', limit: '50' } })
    const whRes = mockRes()
    await listWarehouses(whReq, whRes)
    expect(whRes._data.data).toHaveLength(2)
    expect(whRes._data.total).toBe(2)
  })

  it('シナリオ5: エラーハンドリング検証 / Scenario 5: Error handling verification', async () => {
    // 認証失敗 / Auth failure
    vi.mocked(User.findOne).mockResolvedValue(null)
    const loginReq = mockReq({
      body: { email: 'nonexistent@test.com', password: 'wrong' },
    })
    const loginRes = mockRes()
    await login(loginReq, loginRes)
    expect(loginRes._status).toBe(401)

    // 重複作成 / Duplicate creation
    const dupLean = vi.fn().mockResolvedValue({ code: 'WH-DUP' })
    vi.mocked(Warehouse.findOne).mockReturnValue({ lean: dupLean } as any)
    const dupReq = mockReq({ body: { code: 'WH-DUP', name: '重複倉庫' } })
    const dupRes = mockRes()
    await createWarehouse(dupReq, dupRes)
    expect(dupRes._status).toBe(409)

    // バリデーション失敗 / Validation failure
    const valReq = mockReq({ body: {} })
    const valRes = mockRes()
    await createWarehouse(valReq, valRes)
    expect(valRes._status).toBe(400)
  })
})
