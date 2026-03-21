/**
 * carrierAutomationController 単体テスト / Carrier Automation Controller Unit Tests
 *
 * キャリア自動化設定の CRUD・接続テスト・Yamato B2 操作の HTTP フローを検証する。
 * Verifies HTTP flow for carrier automation config CRUD, connection test, and Yamato B2 operations.
 *
 * モック方針 / Mock strategy:
 * - CarrierAutomationConfig モデルをモック（DB不要）/ Mock CarrierAutomationConfig model (no DB required)
 * - ShipmentOrder モデルをモック / Mock ShipmentOrder model
 * - yamatoB2Service をモック（外部API呼び出し不要）/ Mock yamatoB2Service (no external API calls)
 * - 各スキーマ（Zod）をモック / Mock Zod schemas for deterministic validation behavior
 * - getTenantId ヘルパーをモック / Mock getTenantId helper
 * - apiLogger / operationLogger / logger をモック / Mock loggers
 * - generateOrderNumbers をモック / Mock order number generator
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言（hoisted） ───────────────────────────────────────
// Module mock declarations (hoisted)

vi.mock('@/models/carrierAutomationConfig', () => ({
  CarrierAutomationConfig: {
    find: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    findOneAndDelete: vi.fn(),
  },
}))

vi.mock('@/models/shipmentOrder', () => ({
  ShipmentOrder: {
    find: vi.fn(),
    findById: vi.fn(),
    findOneAndUpdate: vi.fn(),
    updateOne: vi.fn(),
    insertMany: vi.fn(),
    deleteMany: vi.fn(),
    deleteOne: vi.fn(),
  },
}))

vi.mock('@/services/yamatoB2Service', () => ({
  createYamatoB2Service: vi.fn(),
}))

vi.mock('@/services/yamatoCalcService', () => ({
  deriveYamatoSortCode: vi.fn(() => '123456'),
}))

vi.mock('@/utils/yamatoB2Format', () => ({
  convertB2ApiToCarrierRawRow: vi.fn(() => ({ '荷送人名': 'Test' })),
}))

vi.mock('@/schemas/carrierAutomationSchema', () => ({
  upsertCarrierAutomationConfigSchema: { safeParse: vi.fn() },
  exportRequestSchema: { safeParse: vi.fn() },
  printRequestSchema: { safeParse: vi.fn() },
  historyRequestSchema: { safeParse: vi.fn() },
  importRequestSchema: { safeParse: vi.fn() },
  unconfirmRequestSchema: { safeParse: vi.fn() },
  changeInvoiceTypeRequestSchema: { safeParse: vi.fn() },
  splitOrderRequestSchema: { safeParse: vi.fn() },
}))

vi.mock('@/utils/idGenerator', () => ({
  generateOrderNumbers: vi.fn(),
}))

vi.mock('@/data/builtInCarriers', () => ({
  isBuiltInCarrierId: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/services/apiLogger', () => ({
  createApiLog: vi.fn().mockResolvedValue('log-id-1'),
  completeApiLog: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/services/operationLogger', () => ({
  logOperation: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/api/helpers/tenantHelper', () => ({
  getTenantId: vi.fn(() => 'tenant-test'),
}))

// ─── インポート / Imports ────────────────────────────────────────────────
import { CarrierAutomationConfig } from '@/models/carrierAutomationConfig'
import { ShipmentOrder } from '@/models/shipmentOrder'
import { createYamatoB2Service } from '@/services/yamatoB2Service'
import { isBuiltInCarrierId } from '@/data/builtInCarriers'
import { generateOrderNumbers } from '@/utils/idGenerator'
import {
  upsertCarrierAutomationConfigSchema,
  exportRequestSchema,
  printRequestSchema,
  historyRequestSchema,
  importRequestSchema,
  unconfirmRequestSchema,
  changeInvoiceTypeRequestSchema,
  splitOrderRequestSchema,
} from '@/schemas/carrierAutomationSchema'
import {
  listCarrierAutomationConfigs,
  getCarrierAutomationConfig,
  upsertCarrierAutomationConfig,
  deleteCarrierAutomationConfig,
  testCarrierAutomationConnection,
  yamatoB2Validate,
  yamatoB2Export,
  yamatoB2Print,
  yamatoB2FetchBatchPdf,
  yamatoB2Import,
  yamatoB2History,
  yamatoB2Unconfirm,
  changeInvoiceType,
  splitOrder,
} from '@/api/controllers/carrierAutomationController'

// ─── テストユーティリティ / Test utilities ───────────────────────────────

/**
 * モックリクエスト生成 / Mock request factory
 */
const mockReq = (overrides: Record<string, any> = {}) =>
  ({
    query: {},
    params: {},
    body: {},
    headers: {},
    user: { id: 'u1', tenantId: 'tenant-test' },
    ...overrides,
  }) as any

/**
 * モックレスポンス生成 / Mock response factory
 * setHeader と send もサポート / Also supports setHeader and send
 */
const mockRes = () => {
  const res: any = {
    json: vi.fn(),
    status: vi.fn(),
    setHeader: vi.fn(),
    send: vi.fn(),
  }
  res.status.mockReturnValue(res)
  return res
}

/**
 * 標準的な Yamato B2 有効設定を返すヘルパー
 * Helper that returns a standard enabled Yamato B2 config
 */
const fakeYamatoConfig = (overrides: Record<string, any> = {}) => ({
  tenantId: 'tenant-test',
  automationType: 'yamato-b2',
  enabled: true,
  yamatoB2: {
    apiEndpoint: 'https://yamato-b2-webapi.nexand.org',
    apiKey: 'key',
    customerCode: 'CC001',
    customerPassword: 'pass',
    customerClsCode: 'cls',
    loginUserId: 'user',
    serviceTypeMapping: {},
  },
  ...overrides,
})

/**
 * モック B2 サービスを構築するヘルパー
 * Helper to build a mock B2 service
 */
const fakeB2Service = (overrides: Record<string, any> = {}) => ({
  testConnection: vi.fn().mockResolvedValue({ success: true, message: 'OK' }),
  validateShipments: vi.fn().mockResolvedValue({ total: 1, valid_count: 1, invalid_count: 0 }),
  exportAndPrint: vi.fn().mockResolvedValue({
    total: 1,
    success_count: 1,
    error_count: 0,
    results: [{ success: true, tracking_number: 'TRK001' }],
    printResults: [],
  }),
  printLabels: vi.fn().mockResolvedValue({ success: true, tracking_numbers: ['TRK001'] }),
  fetchBatchPdf: vi.fn().mockResolvedValue(Buffer.from('PDF')),
  getHistory: vi.fn().mockResolvedValue([]),
  deleteFromHistory: vi.fn().mockResolvedValue({ success: true, deleted: 1 }),
  ...overrides,
})

// ═══════════════════════════════════════════════════════════════════
// listCarrierAutomationConfigs
// ═══════════════════════════════════════════════════════════════════
describe('listCarrierAutomationConfigs', () => {
  beforeEach(() => vi.clearAllMocks())

  it('テナントの全設定を返す / returns all configs for tenant', async () => {
    // Arrange 準備
    const fakeConfigs = [fakeYamatoConfig()]
    vi.mocked(CarrierAutomationConfig.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeConfigs),
    } as any)

    const req = mockReq()
    const res = mockRes()

    // Act 実行
    await listCarrierAutomationConfigs(req, res)

    // Assert 検証: テナントフィルタで検索し、設定一覧を返す
    // Assert: searches with tenant filter and returns configs
    expect(CarrierAutomationConfig.find).toHaveBeenCalledWith({ tenantId: 'tenant-test' })
    expect(res.json).toHaveBeenCalledWith(fakeConfigs)
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(CarrierAutomationConfig.find).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('DB down')),
    } as any)

    const req = mockReq()
    const res = mockRes()

    // Act
    await listCarrierAutomationConfigs(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '設定の取得に失敗しました' })
    )
  })
})

// ═══════════════════════════════════════════════════════════════════
// getCarrierAutomationConfig
// ═══════════════════════════════════════════════════════════════════
describe('getCarrierAutomationConfig', () => {
  beforeEach(() => vi.clearAllMocks())

  it('存在する設定を返す / returns existing config', async () => {
    // Arrange
    const config = fakeYamatoConfig()
    vi.mocked(CarrierAutomationConfig.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(config),
    } as any)

    const req = mockReq({ params: { type: 'yamato-b2' } })
    const res = mockRes()

    // Act
    await getCarrierAutomationConfig(req, res)

    // Assert
    expect(res.json).toHaveBeenCalledWith(config)
  })

  it('設定が存在しない場合 yamato-b2 のデフォルト値を返す / returns yamato-b2 defaults when config missing', async () => {
    // Arrange: 設定が見つからない / config not found
    vi.mocked(CarrierAutomationConfig.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { type: 'yamato-b2' } })
    const res = mockRes()

    // Act
    await getCarrierAutomationConfig(req, res)

    // Assert: デフォルト yamato-b2 設定を含む / includes default yamato-b2 config
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        automationType: 'yamato-b2',
        enabled: false,
        yamatoB2: expect.objectContaining({ apiEndpoint: expect.any(String) }),
      })
    )
  })

  it('yamato-b2 以外のタイプで設定未設定時は yamatoB2 が undefined / non-yamato-b2 type returns no yamatoB2 defaults', async () => {
    // Arrange
    vi.mocked(CarrierAutomationConfig.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { type: 'other-carrier' } })
    const res = mockRes()

    // Act
    await getCarrierAutomationConfig(req, res)

    // Assert: yamatoB2 フィールドが undefined / yamatoB2 field is undefined
    const response = vi.mocked(res.json).mock.calls[0][0]
    expect(response.yamatoB2).toBeUndefined()
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(CarrierAutomationConfig.findOne).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('connection error')),
    } as any)

    const req = mockReq({ params: { type: 'yamato-b2' } })
    const res = mockRes()

    // Act
    await getCarrierAutomationConfig(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ═══════════════════════════════════════════════════════════════════
// upsertCarrierAutomationConfig
// ═══════════════════════════════════════════════════════════════════
describe('upsertCarrierAutomationConfig', () => {
  beforeEach(() => vi.clearAllMocks())

  it('バリデーション成功時に設定を upsert して返す / upserts and returns config on valid input', async () => {
    // Arrange
    const validData = { enabled: true }
    vi.mocked(upsertCarrierAutomationConfigSchema.safeParse).mockReturnValue({
      success: true,
      data: validData,
    } as any)
    const savedConfig = fakeYamatoConfig()
    vi.mocked(CarrierAutomationConfig.findOneAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(savedConfig),
    } as any)

    const req = mockReq({ params: { type: 'yamato-b2' }, body: validData })
    const res = mockRes()

    // Act
    await upsertCarrierAutomationConfig(req, res)

    // Assert: upsert オプション付きで呼び出される / called with upsert options
    expect(CarrierAutomationConfig.findOneAndUpdate).toHaveBeenCalledWith(
      { tenantId: 'tenant-test', automationType: 'yamato-b2' },
      expect.objectContaining({ tenantId: 'tenant-test', automationType: 'yamato-b2' }),
      { upsert: true, new: true, runValidators: true }
    )
    expect(res.json).toHaveBeenCalledWith(savedConfig)
  })

  it('Zod バリデーション失敗時に 400 を返す / returns 400 when Zod validation fails', async () => {
    // Arrange
    vi.mocked(upsertCarrierAutomationConfigSchema.safeParse).mockReturnValue({
      success: false,
      error: { flatten: () => ({ fieldErrors: { enabled: ['Required'] } }) },
    } as any)

    const req = mockReq({ params: { type: 'yamato-b2' }, body: {} })
    const res = mockRes()

    // Act
    await upsertCarrierAutomationConfig(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'バリデーションエラー' })
    )
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(upsertCarrierAutomationConfigSchema.safeParse).mockReturnValue({
      success: true,
      data: { enabled: true },
    } as any)
    vi.mocked(CarrierAutomationConfig.findOneAndUpdate).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('write failed')),
    } as any)

    const req = mockReq({ params: { type: 'yamato-b2' }, body: {} })
    const res = mockRes()

    // Act
    await upsertCarrierAutomationConfig(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '設定の保存に失敗しました' })
    )
  })
})

// ═══════════════════════════════════════════════════════════════════
// deleteCarrierAutomationConfig
// ═══════════════════════════════════════════════════════════════════
describe('deleteCarrierAutomationConfig', () => {
  beforeEach(() => vi.clearAllMocks())

  it('設定を削除して成功メッセージを返す / deletes config and returns success message', async () => {
    // Arrange
    const deleted = { _id: 'cfg-1', automationType: 'yamato-b2' }
    vi.mocked(CarrierAutomationConfig.findOneAndDelete).mockReturnValue({
      lean: vi.fn().mockResolvedValue(deleted),
    } as any)

    const req = mockReq({ params: { type: 'yamato-b2' } })
    const res = mockRes()

    // Act
    await deleteCarrierAutomationConfig(req, res)

    // Assert: 削除成功メッセージ / deletion success message
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '削除しました', id: 'cfg-1' })
    )
  })

  it('設定が存在しない場合 404 を返す / returns 404 when config not found', async () => {
    // Arrange
    vi.mocked(CarrierAutomationConfig.findOneAndDelete).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { type: 'yamato-b2' } })
    const res = mockRes()

    // Act
    await deleteCarrierAutomationConfig(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '設定が見つかりません' })
    )
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(CarrierAutomationConfig.findOneAndDelete).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('delete failed')),
    } as any)

    const req = mockReq({ params: { type: 'yamato-b2' } })
    const res = mockRes()

    // Act
    await deleteCarrierAutomationConfig(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '設定の削除に失敗しました' })
    )
  })
})

// ═══════════════════════════════════════════════════════════════════
// testCarrierAutomationConnection
// ═══════════════════════════════════════════════════════════════════
describe('testCarrierAutomationConnection', () => {
  beforeEach(() => vi.clearAllMocks())

  it('Yamato B2 接続テスト成功時に結果を返す / returns connection test result on success', async () => {
    // Arrange
    vi.mocked(CarrierAutomationConfig.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeYamatoConfig()),
    } as any)
    const service = fakeB2Service()
    vi.mocked(createYamatoB2Service).mockReturnValue(service as any)

    const req = mockReq({ params: { type: 'yamato-b2' } })
    const res = mockRes()

    // Act
    await testCarrierAutomationConnection(req, res)

    // Assert: サービスの testConnection が呼ばれ、結果が返る
    // Assert: service.testConnection is called and result returned
    expect(service.testConnection).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'OK' })
  })

  it('設定が存在しない場合 404 を返す / returns 404 when config missing', async () => {
    // Arrange
    vi.mocked(CarrierAutomationConfig.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { type: 'yamato-b2' } })
    const res = mockRes()

    // Act
    await testCarrierAutomationConnection(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '設定が見つかりません。先に設定を保存してください。' })
    )
  })

  it('yamatoB2 フィールドが欠損の場合 400 を返す / returns 400 when yamatoB2 field is missing', async () => {
    // Arrange: yamatoB2 フィールドなし / config exists but no yamatoB2 field
    vi.mocked(CarrierAutomationConfig.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ tenantId: 'tenant-test', automationType: 'yamato-b2', enabled: true }),
    } as any)

    const req = mockReq({ params: { type: 'yamato-b2' } })
    const res = mockRes()

    // Act
    await testCarrierAutomationConnection(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Yamato B2の設定が見つかりません' })
    )
  })

  it('未対応タイプの場合 400 を返す / returns 400 for unsupported automation type', async () => {
    // Arrange
    vi.mocked(CarrierAutomationConfig.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeYamatoConfig({ automationType: 'unknown' })),
    } as any)

    const req = mockReq({ params: { type: 'unknown' } })
    const res = mockRes()

    // Act
    await testCarrierAutomationConnection(req, res)

    // Assert: 未対応タイプエラー / unsupported type error
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('未対応') })
    )
  })

  it('接続テスト失敗時に 500 を返す / returns 500 when connection test throws', async () => {
    // Arrange
    vi.mocked(CarrierAutomationConfig.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeYamatoConfig()),
    } as any)
    const service = fakeB2Service({
      testConnection: vi.fn().mockRejectedValue(new Error('network error')),
    })
    vi.mocked(createYamatoB2Service).mockReturnValue(service as any)

    const req = mockReq({ params: { type: 'yamato-b2' } })
    const res = mockRes()

    // Act
    await testCarrierAutomationConnection(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '接続テストに失敗しました' })
    )
  })
})

// ═══════════════════════════════════════════════════════════════════
// yamatoB2Validate
// ═══════════════════════════════════════════════════════════════════
describe('yamatoB2Validate', () => {
  beforeEach(() => vi.clearAllMocks())

  it('検証成功時に結果を返す / returns validation result on success', async () => {
    // Arrange
    vi.mocked(exportRequestSchema.safeParse).mockReturnValue({
      success: true,
      data: { orderIds: ['order-1'] },
    } as any)
    vi.mocked(CarrierAutomationConfig.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeYamatoConfig()),
    } as any)
    vi.mocked(ShipmentOrder.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue([{ _id: 'order-1', orderNumber: 'ON001' }]),
    } as any)
    const service = fakeB2Service()
    vi.mocked(createYamatoB2Service).mockReturnValue(service as any)

    const req = mockReq({ body: { orderIds: ['order-1'] } })
    const res = mockRes()

    // Act
    await yamatoB2Validate(req, res)

    // Assert
    expect(service.validateShipments).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ total: 1, valid_count: 1, invalid_count: 0 })
    )
  })

  it('スキーマバリデーション失敗時に 400 を返す / returns 400 on schema validation failure', async () => {
    // Arrange
    vi.mocked(exportRequestSchema.safeParse).mockReturnValue({
      success: false,
      error: { flatten: () => ({ fieldErrors: { orderIds: ['Required'] } }) },
    } as any)

    const req = mockReq({ body: {} })
    const res = mockRes()

    // Act
    await yamatoB2Validate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('Yamato B2 設定が存在しない場合 400 を返す / returns 400 when yamato config missing', async () => {
    // Arrange
    vi.mocked(exportRequestSchema.safeParse).mockReturnValue({
      success: true,
      data: { orderIds: ['order-1'] },
    } as any)
    vi.mocked(CarrierAutomationConfig.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ body: { orderIds: ['order-1'] } })
    const res = mockRes()

    // Act
    await yamatoB2Validate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Yamato B2の設定が見つかりません' })
    )
  })

  it('連携が無効な場合 400 を返す / returns 400 when integration disabled', async () => {
    // Arrange
    vi.mocked(exportRequestSchema.safeParse).mockReturnValue({
      success: true,
      data: { orderIds: ['order-1'] },
    } as any)
    vi.mocked(CarrierAutomationConfig.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeYamatoConfig({ enabled: false })),
    } as any)

    const req = mockReq({ body: { orderIds: ['order-1'] } })
    const res = mockRes()

    // Act
    await yamatoB2Validate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Yamato B2連携が無効になっています' })
    )
  })

  it('注文が存在しない場合 400 を返す / returns 400 when no orders found', async () => {
    // Arrange
    vi.mocked(exportRequestSchema.safeParse).mockReturnValue({
      success: true,
      data: { orderIds: ['ghost-id'] },
    } as any)
    vi.mocked(CarrierAutomationConfig.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeYamatoConfig()),
    } as any)
    vi.mocked(ShipmentOrder.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    } as any)

    const req = mockReq({ body: { orderIds: ['ghost-id'] } })
    const res = mockRes()

    // Act
    await yamatoB2Validate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '注文が見つかりません' })
    )
  })

  it('検証 API エラー時に 500 を返す / returns 500 on API error', async () => {
    // Arrange
    vi.mocked(exportRequestSchema.safeParse).mockReturnValue({
      success: true,
      data: { orderIds: ['order-1'] },
    } as any)
    vi.mocked(CarrierAutomationConfig.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeYamatoConfig()),
    } as any)
    vi.mocked(ShipmentOrder.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue([{ _id: 'order-1', orderNumber: 'ON001' }]),
    } as any)
    const service = fakeB2Service({
      validateShipments: vi.fn().mockRejectedValue(new Error('API error')),
    })
    vi.mocked(createYamatoB2Service).mockReturnValue(service as any)

    const req = mockReq({ body: { orderIds: ['order-1'] } })
    const res = mockRes()

    // Act
    await yamatoB2Validate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '検証に失敗しました' })
    )
  })
})

// ═══════════════════════════════════════════════════════════════════
// yamatoB2Export
// ═══════════════════════════════════════════════════════════════════
describe('yamatoB2Export', () => {
  beforeEach(() => vi.clearAllMocks())

  it('エクスポート成功時に結果と更新件数を返す / returns export result and updated count on success', async () => {
    // Arrange
    vi.mocked(exportRequestSchema.safeParse).mockReturnValue({
      success: true,
      data: { orderIds: ['order-1'] },
    } as any)
    vi.mocked(CarrierAutomationConfig.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeYamatoConfig()),
    } as any)
    const orders = [{ _id: 'order-1', orderNumber: 'ON001' }]
    vi.mocked(ShipmentOrder.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue(orders),
    } as any)
    vi.mocked(ShipmentOrder.updateOne).mockResolvedValue({ modifiedCount: 1 } as any)

    const exportResult = {
      total: 1,
      success_count: 1,
      error_count: 0,
      results: [{ success: true, tracking_number: 'TRK001' }],
      printResults: [
        {
          success: true,
          print_type: 'A4',
          tracking_numbers: ['TRK001'],
          shipments: [
            {
              tracking_number: 'TRK-REAL-001',
              shipment_number: 'ON001',
              temp_tracking_number: 'TRK001',
              sorting_code: '1234567',
            },
          ],
        },
      ],
    }
    const service = fakeB2Service({ exportAndPrint: vi.fn().mockResolvedValue(exportResult) })
    vi.mocked(createYamatoB2Service).mockReturnValue(service as any)

    const req = mockReq({ body: { orderIds: ['order-1'] } })
    const res = mockRes()

    // Act
    await yamatoB2Export(req, res)

    // Assert: updatedCount が含まれる / response includes updatedCount
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ updatedCount: expect.any(Number) })
    )
  })

  it('スキーマバリデーション失敗時に 400 を返す / returns 400 on schema failure', async () => {
    // Arrange
    vi.mocked(exportRequestSchema.safeParse).mockReturnValue({
      success: false,
      error: { flatten: () => ({ fieldErrors: {} }) },
    } as any)

    const req = mockReq({ body: {} })
    const res = mockRes()

    // Act
    await yamatoB2Export(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('設定が存在しない場合 400 を返す / returns 400 when config missing', async () => {
    // Arrange
    vi.mocked(exportRequestSchema.safeParse).mockReturnValue({
      success: true,
      data: { orderIds: ['order-1'] },
    } as any)
    vi.mocked(CarrierAutomationConfig.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ body: { orderIds: ['order-1'] } })
    const res = mockRes()

    // Act
    await yamatoB2Export(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('連携無効の場合 400 を返す / returns 400 when integration disabled', async () => {
    // Arrange
    vi.mocked(exportRequestSchema.safeParse).mockReturnValue({
      success: true,
      data: { orderIds: ['order-1'] },
    } as any)
    vi.mocked(CarrierAutomationConfig.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeYamatoConfig({ enabled: false })),
    } as any)

    const req = mockReq({ body: { orderIds: ['order-1'] } })
    const res = mockRes()

    // Act
    await yamatoB2Export(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Yamato B2連携が無効になっています' })
    )
  })

  it('注文が空の場合 400 を返す / returns 400 when orders array is empty', async () => {
    // Arrange
    vi.mocked(exportRequestSchema.safeParse).mockReturnValue({
      success: true,
      data: { orderIds: [] },
    } as any)
    vi.mocked(CarrierAutomationConfig.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeYamatoConfig()),
    } as any)
    vi.mocked(ShipmentOrder.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    } as any)

    const req = mockReq({ body: { orderIds: [] } })
    const res = mockRes()

    // Act
    await yamatoB2Export(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '注文が見つかりません' })
    )
  })

  it('エクスポート API エラー時に 500 を返す / returns 500 on export API error', async () => {
    // Arrange
    vi.mocked(exportRequestSchema.safeParse).mockReturnValue({
      success: true,
      data: { orderIds: ['order-1'] },
    } as any)
    vi.mocked(CarrierAutomationConfig.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeYamatoConfig()),
    } as any)
    vi.mocked(ShipmentOrder.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue([{ _id: 'order-1', orderNumber: 'ON001' }]),
    } as any)
    const service = fakeB2Service({
      exportAndPrint: vi.fn().mockRejectedValue(new Error('export error')),
    })
    vi.mocked(createYamatoB2Service).mockReturnValue(service as any)

    const req = mockReq({ body: { orderIds: ['order-1'] } })
    const res = mockRes()

    // Act
    await yamatoB2Export(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'エクスポートに失敗しました' })
    )
  })

  it('print結果なしでエクスポートが成功する場合（一時番号使用） / handles export with no print results using temp tracking', async () => {
    // Arrange: printResults が空の場合 / when printResults are empty
    vi.mocked(exportRequestSchema.safeParse).mockReturnValue({
      success: true,
      data: { orderIds: ['order-1'] },
    } as any)
    vi.mocked(CarrierAutomationConfig.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeYamatoConfig()),
    } as any)
    const orders = [{ _id: 'order-1', orderNumber: 'ON001' }]
    vi.mocked(ShipmentOrder.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue(orders),
    } as any)
    vi.mocked(ShipmentOrder.updateOne).mockResolvedValue({ modifiedCount: 1 } as any)

    // printResults なし、result に tracking_number のみ
    const exportResult = {
      total: 1,
      success_count: 1,
      error_count: 0,
      results: [{ success: true, tracking_number: 'TRK-TEMP-001' }],
      printResults: [],
    }
    const service = fakeB2Service({ exportAndPrint: vi.fn().mockResolvedValue(exportResult) })
    vi.mocked(createYamatoB2Service).mockReturnValue(service as any)

    const req = mockReq({ body: { orderIds: ['order-1'] } })
    const res = mockRes()

    // Act
    await yamatoB2Export(req, res)

    // Assert: 一時番号で注文が更新される / order updated with temp tracking number
    expect(ShipmentOrder.updateOne).toHaveBeenCalledWith(
      { _id: 'order-1' },
      expect.objectContaining({
        $set: expect.objectContaining({ trackingId: 'TRK-TEMP-001' }),
      })
    )
  })
})

// ═══════════════════════════════════════════════════════════════════
// yamatoB2Print
// ═══════════════════════════════════════════════════════════════════
describe('yamatoB2Print', () => {
  beforeEach(() => vi.clearAllMocks())

  it('印刷成功時に結果を返す / returns print result on success', async () => {
    // Arrange
    vi.mocked(printRequestSchema.safeParse).mockReturnValue({
      success: true,
      data: { trackingNumbers: ['TRK001', 'TRK002'] },
    } as any)
    vi.mocked(CarrierAutomationConfig.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeYamatoConfig()),
    } as any)
    const service = fakeB2Service()
    vi.mocked(createYamatoB2Service).mockReturnValue(service as any)

    const req = mockReq({ body: { trackingNumbers: ['TRK001', 'TRK002'] } })
    const res = mockRes()

    // Act
    await yamatoB2Print(req, res)

    // Assert: サービスの printLabels が呼ばれる / service.printLabels is called
    expect(service.printLabels).toHaveBeenCalledWith(['TRK001', 'TRK002'])
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    )
  })

  it('スキーマバリデーション失敗時に 400 を返す / returns 400 on schema failure', async () => {
    // Arrange
    vi.mocked(printRequestSchema.safeParse).mockReturnValue({
      success: false,
      error: { flatten: () => ({ fieldErrors: {} }) },
    } as any)

    const req = mockReq({ body: {} })
    const res = mockRes()

    // Act
    await yamatoB2Print(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('設定が存在しない場合 400 を返す / returns 400 when config missing', async () => {
    // Arrange
    vi.mocked(printRequestSchema.safeParse).mockReturnValue({
      success: true,
      data: { trackingNumbers: ['TRK001'] },
    } as any)
    vi.mocked(CarrierAutomationConfig.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ body: { trackingNumbers: ['TRK001'] } })
    const res = mockRes()

    // Act
    await yamatoB2Print(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Yamato B2の設定が見つかりません' })
    )
  })

  it('連携無効の場合 400 を返す / returns 400 when integration disabled', async () => {
    // Arrange
    vi.mocked(printRequestSchema.safeParse).mockReturnValue({
      success: true,
      data: { trackingNumbers: ['TRK001'] },
    } as any)
    vi.mocked(CarrierAutomationConfig.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeYamatoConfig({ enabled: false })),
    } as any)

    const req = mockReq({ body: { trackingNumbers: ['TRK001'] } })
    const res = mockRes()

    // Act
    await yamatoB2Print(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('印刷 API エラー時に 500 を返す / returns 500 on print API error', async () => {
    // Arrange
    vi.mocked(printRequestSchema.safeParse).mockReturnValue({
      success: true,
      data: { trackingNumbers: ['TRK001'] },
    } as any)
    vi.mocked(CarrierAutomationConfig.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeYamatoConfig()),
    } as any)
    const service = fakeB2Service({
      printLabels: vi.fn().mockRejectedValue(new Error('print error')),
    })
    vi.mocked(createYamatoB2Service).mockReturnValue(service as any)

    const req = mockReq({ body: { trackingNumbers: ['TRK001'] } })
    const res = mockRes()

    // Act
    await yamatoB2Print(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '印刷に失敗しました' })
    )
  })
})

// ═══════════════════════════════════════════════════════════════════
// yamatoB2FetchBatchPdf
// ═══════════════════════════════════════════════════════════════════
describe('yamatoB2FetchBatchPdf', () => {
  beforeEach(() => vi.clearAllMocks())

  it('PDF を application/pdf として返す / returns PDF with application/pdf content type', async () => {
    // Arrange
    const pdfBuffer = Buffer.from('%PDF-1.4 test content')
    vi.mocked(printRequestSchema.safeParse).mockReturnValue({
      success: true,
      data: { trackingNumbers: ['TRK001'] },
    } as any)
    vi.mocked(CarrierAutomationConfig.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeYamatoConfig()),
    } as any)
    const service = fakeB2Service({ fetchBatchPdf: vi.fn().mockResolvedValue(pdfBuffer) })
    vi.mocked(createYamatoB2Service).mockReturnValue(service as any)

    const req = mockReq({ body: { trackingNumbers: ['TRK001'] } })
    const res = mockRes()

    // Act
    await yamatoB2FetchBatchPdf(req, res)

    // Assert: Content-Type と Content-Disposition が設定される
    // Assert: Content-Type and Content-Disposition are set
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf')
    expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename=labels.pdf')
    expect(res.send).toHaveBeenCalledWith(pdfBuffer)
  })

  it('スキーマバリデーション失敗時に 400 を返す / returns 400 on schema failure', async () => {
    // Arrange
    vi.mocked(printRequestSchema.safeParse).mockReturnValue({
      success: false,
      error: { flatten: () => ({ fieldErrors: {} }) },
    } as any)

    const req = mockReq({ body: {} })
    const res = mockRes()

    // Act
    await yamatoB2FetchBatchPdf(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('設定が存在しない場合 400 を返す / returns 400 when config missing', async () => {
    // Arrange
    vi.mocked(printRequestSchema.safeParse).mockReturnValue({
      success: true,
      data: { trackingNumbers: ['TRK001'] },
    } as any)
    vi.mocked(CarrierAutomationConfig.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ body: { trackingNumbers: ['TRK001'] } })
    const res = mockRes()

    // Act
    await yamatoB2FetchBatchPdf(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('連携無効の場合 400 を返す / returns 400 when integration disabled', async () => {
    // Arrange
    vi.mocked(printRequestSchema.safeParse).mockReturnValue({
      success: true,
      data: { trackingNumbers: ['TRK001'] },
    } as any)
    vi.mocked(CarrierAutomationConfig.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeYamatoConfig({ enabled: false })),
    } as any)

    const req = mockReq({ body: { trackingNumbers: ['TRK001'] } })
    const res = mockRes()

    // Act
    await yamatoB2FetchBatchPdf(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('PDF 取得エラー時に 500 を返す / returns 500 on PDF fetch error', async () => {
    // Arrange
    vi.mocked(printRequestSchema.safeParse).mockReturnValue({
      success: true,
      data: { trackingNumbers: ['TRK001'] },
    } as any)
    vi.mocked(CarrierAutomationConfig.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeYamatoConfig()),
    } as any)
    const service = fakeB2Service({
      fetchBatchPdf: vi.fn().mockRejectedValue(new Error('PDF error')),
    })
    vi.mocked(createYamatoB2Service).mockReturnValue(service as any)

    const req = mockReq({ body: { trackingNumbers: ['TRK001'] } })
    const res = mockRes()

    // Act
    await yamatoB2FetchBatchPdf(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'PDF取得に失敗しました' })
    )
  })
})

// ═══════════════════════════════════════════════════════════════════
// yamatoB2Import
// ═══════════════════════════════════════════════════════════════════
describe('yamatoB2Import', () => {
  beforeEach(() => vi.clearAllMocks())

  it('インポート成功時にマッチ件数を返す / returns match counts on successful import', async () => {
    // Arrange
    vi.mocked(importRequestSchema.safeParse).mockReturnValue({
      success: true,
      data: { shipmentDateFrom: '2026-03-01', shipmentDateTo: '2026-03-21' },
    } as any)
    vi.mocked(CarrierAutomationConfig.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeYamatoConfig()),
    } as any)
    const historyItems = [
      {
        shipment: {
          shipment_number: 'ON001',
          tracking_number: 'TRK001',
          sorting_code: '1234567',
        },
      },
    ]
    const service = fakeB2Service({ getHistory: vi.fn().mockResolvedValue(historyItems) })
    vi.mocked(createYamatoB2Service).mockReturnValue(service as any)
    vi.mocked(ShipmentOrder.findOneAndUpdate).mockResolvedValue({ _id: 'order-1' } as any)

    const req = mockReq({ body: { shipmentDateFrom: '2026-03-01', shipmentDateTo: '2026-03-21' } })
    const res = mockRes()

    // Act
    await yamatoB2Import(req, res)

    // Assert: マッチ件数が返る / matched count is returned
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        total: 1,
        matched: 1,
        unmatched: 0,
      })
    )
  })

  it('マッチしない履歴は unmatched にカウントされる / unmatched items are counted in unmatched', async () => {
    // Arrange
    vi.mocked(importRequestSchema.safeParse).mockReturnValue({
      success: true,
      data: {},
    } as any)
    vi.mocked(CarrierAutomationConfig.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeYamatoConfig()),
    } as any)
    const historyItems = [
      {
        shipment: {
          shipment_number: 'NONEXISTENT',
          tracking_number: 'TRK999',
        },
      },
    ]
    const service = fakeB2Service({ getHistory: vi.fn().mockResolvedValue(historyItems) })
    vi.mocked(createYamatoB2Service).mockReturnValue(service as any)
    // findOneAndUpdate が null を返す（マッチなし）/ returns null (no match)
    vi.mocked(ShipmentOrder.findOneAndUpdate).mockResolvedValue(null as any)

    const req = mockReq({ body: {} })
    const res = mockRes()

    // Act
    await yamatoB2Import(req, res)

    // Assert
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ matched: 0, unmatched: 1 })
    )
  })

  it('スキーマバリデーション失敗時に 400 を返す / returns 400 on schema failure', async () => {
    // Arrange
    vi.mocked(importRequestSchema.safeParse).mockReturnValue({
      success: false,
      error: { flatten: () => ({ fieldErrors: {} }) },
    } as any)

    const req = mockReq({ body: {} })
    const res = mockRes()

    // Act
    await yamatoB2Import(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('設定が存在しない場合 400 を返す / returns 400 when config missing', async () => {
    // Arrange
    vi.mocked(importRequestSchema.safeParse).mockReturnValue({
      success: true,
      data: {},
    } as any)
    vi.mocked(CarrierAutomationConfig.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ body: {} })
    const res = mockRes()

    // Act
    await yamatoB2Import(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('API エラー時に 500 を返す / returns 500 on API error', async () => {
    // Arrange
    vi.mocked(importRequestSchema.safeParse).mockReturnValue({
      success: true,
      data: {},
    } as any)
    vi.mocked(CarrierAutomationConfig.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeYamatoConfig()),
    } as any)
    const service = fakeB2Service({
      getHistory: vi.fn().mockRejectedValue(new Error('history error')),
    })
    vi.mocked(createYamatoB2Service).mockReturnValue(service as any)

    const req = mockReq({ body: {} })
    const res = mockRes()

    // Act
    await yamatoB2Import(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'インポートに失敗しました' })
    )
  })

  it('trackingNumber がない履歴項目はスキップされる / items without trackingNumber are skipped', async () => {
    // Arrange
    vi.mocked(importRequestSchema.safeParse).mockReturnValue({
      success: true,
      data: {},
    } as any)
    vi.mocked(CarrierAutomationConfig.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeYamatoConfig()),
    } as any)
    // tracking_number なしの履歴項目 / history item without tracking_number
    const historyItems = [{ shipment: { shipment_number: 'ON001' } }]
    const service = fakeB2Service({ getHistory: vi.fn().mockResolvedValue(historyItems) })
    vi.mocked(createYamatoB2Service).mockReturnValue(service as any)

    const req = mockReq({ body: {} })
    const res = mockRes()

    // Act
    await yamatoB2Import(req, res)

    // Assert: ShipmentOrder.findOneAndUpdate は呼ばれない / findOneAndUpdate not called
    expect(ShipmentOrder.findOneAndUpdate).not.toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ total: 1, matched: 0, unmatched: 0 })
    )
  })
})

// ═══════════════════════════════════════════════════════════════════
// yamatoB2History
// ═══════════════════════════════════════════════════════════════════
describe('yamatoB2History', () => {
  beforeEach(() => vi.clearAllMocks())

  it('発行履歴を返す / returns shipment history', async () => {
    // Arrange
    vi.mocked(historyRequestSchema.safeParse).mockReturnValue({
      success: true,
      data: { limit: 50 },
    } as any)
    vi.mocked(CarrierAutomationConfig.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeYamatoConfig()),
    } as any)
    const history = [{ tracking_number: 'TRK001' }]
    const service = fakeB2Service({ getHistory: vi.fn().mockResolvedValue(history) })
    vi.mocked(createYamatoB2Service).mockReturnValue(service as any)

    const req = mockReq({ query: { limit: '50' } })
    const res = mockRes()

    // Act
    await yamatoB2History(req, res)

    // Assert
    expect(res.json).toHaveBeenCalledWith({ history })
  })

  it('スキーマバリデーション失敗時に 400 を返す / returns 400 on schema failure', async () => {
    // Arrange
    vi.mocked(historyRequestSchema.safeParse).mockReturnValue({
      success: false,
      error: { flatten: () => ({ fieldErrors: { limit: ['Expected number'] } }) },
    } as any)

    const req = mockReq({ query: { limit: 'bad' } })
    const res = mockRes()

    // Act
    await yamatoB2History(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('設定が存在しない場合 400 を返す / returns 400 when config missing', async () => {
    // Arrange
    vi.mocked(historyRequestSchema.safeParse).mockReturnValue({
      success: true,
      data: {},
    } as any)
    vi.mocked(CarrierAutomationConfig.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ query: {} })
    const res = mockRes()

    // Act
    await yamatoB2History(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('API エラー時に 500 を返す / returns 500 on API error', async () => {
    // Arrange
    vi.mocked(historyRequestSchema.safeParse).mockReturnValue({
      success: true,
      data: {},
    } as any)
    vi.mocked(CarrierAutomationConfig.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeYamatoConfig()),
    } as any)
    const service = fakeB2Service({
      getHistory: vi.fn().mockRejectedValue(new Error('history error')),
    })
    vi.mocked(createYamatoB2Service).mockReturnValue(service as any)

    const req = mockReq({ query: {} })
    const res = mockRes()

    // Act
    await yamatoB2History(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '履歴の取得に失敗しました' })
    )
  })
})

// ═══════════════════════════════════════════════════════════════════
// yamatoB2Unconfirm
// ═══════════════════════════════════════════════════════════════════
describe('yamatoB2Unconfirm', () => {
  beforeEach(() => vi.clearAllMocks())

  const makeOrders = (trackingId?: string) => [
    {
      _id: 'order-1',
      orderNumber: 'ON001',
      carrierId: 'builtin-yamato',
      trackingId: trackingId || 'TRK001',
      internalRecord: [],
    },
  ]

  it('確認取消成功時に更新件数を返す / returns updated count on successful unconfirm', async () => {
    // Arrange
    vi.mocked(unconfirmRequestSchema.safeParse).mockReturnValue({
      success: true,
      data: { orderIds: ['order-1'], reason: '取消理由', skipCarrierDelete: false },
    } as any)
    vi.mocked(ShipmentOrder.find).mockResolvedValue(makeOrders() as any)
    vi.mocked(CarrierAutomationConfig.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeYamatoConfig()),
    } as any)
    vi.mocked(isBuiltInCarrierId).mockReturnValue(true)
    const service = fakeB2Service()
    vi.mocked(createYamatoB2Service).mockReturnValue(service as any)
    vi.mocked(ShipmentOrder.updateOne).mockResolvedValue({ modifiedCount: 1 } as any)

    const req = mockReq({ body: { orderIds: ['order-1'], reason: '取消理由' } })
    const res = mockRes()

    // Act
    await yamatoB2Unconfirm(req, res)

    // Assert: 成功レスポンス / success response
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, updatedCount: 1 })
    )
  })

  it('skipCarrierDelete=true の場合 B2 削除をスキップする / skips B2 delete when skipCarrierDelete is true', async () => {
    // Arrange
    vi.mocked(unconfirmRequestSchema.safeParse).mockReturnValue({
      success: true,
      data: { orderIds: ['order-1'], skipCarrierDelete: true },
    } as any)
    vi.mocked(ShipmentOrder.find).mockResolvedValue(makeOrders() as any)
    vi.mocked(CarrierAutomationConfig.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeYamatoConfig()),
    } as any)
    vi.mocked(isBuiltInCarrierId).mockReturnValue(true)
    const service = fakeB2Service()
    vi.mocked(createYamatoB2Service).mockReturnValue(service as any)
    vi.mocked(ShipmentOrder.updateOne).mockResolvedValue({ modifiedCount: 1 } as any)

    const req = mockReq({ body: { orderIds: ['order-1'], skipCarrierDelete: true } })
    const res = mockRes()

    // Act
    await yamatoB2Unconfirm(req, res)

    // Assert: deleteFromHistory は呼ばれない / deleteFromHistory not called
    expect(service.deleteFromHistory).not.toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ carrierDeleteSkipped: true })
    )
  })

  it('注文が存在しない場合 400 を返す / returns 400 when orders not found', async () => {
    // Arrange
    vi.mocked(unconfirmRequestSchema.safeParse).mockReturnValue({
      success: true,
      data: { orderIds: ['ghost'], skipCarrierDelete: false },
    } as any)
    vi.mocked(ShipmentOrder.find).mockResolvedValue([] as any)

    const req = mockReq({ body: { orderIds: ['ghost'] } })
    const res = mockRes()

    // Act
    await yamatoB2Unconfirm(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '注文が見つかりません' })
    )
  })

  it('スキーマバリデーション失敗時に 400 を返す / returns 400 on schema failure', async () => {
    // Arrange
    vi.mocked(unconfirmRequestSchema.safeParse).mockReturnValue({
      success: false,
      error: { flatten: () => ({ fieldErrors: {} }) },
    } as any)

    const req = mockReq({ body: {} })
    const res = mockRes()

    // Act
    await yamatoB2Unconfirm(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('B2 Cloud 削除失敗時に canRetryWithSkip エラーを返す / returns canRetryWithSkip error when B2 delete fails', async () => {
    // Arrange
    vi.mocked(unconfirmRequestSchema.safeParse).mockReturnValue({
      success: true,
      data: { orderIds: ['order-1'], skipCarrierDelete: false },
    } as any)
    vi.mocked(ShipmentOrder.find).mockResolvedValue(makeOrders('TRK001') as any)
    vi.mocked(CarrierAutomationConfig.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeYamatoConfig()),
    } as any)
    vi.mocked(isBuiltInCarrierId).mockReturnValue(true)
    const service = fakeB2Service({
      deleteFromHistory: vi.fn().mockRejectedValue(new Error('B2 delete failed')),
    })
    vi.mocked(createYamatoB2Service).mockReturnValue(service as any)

    const req = mockReq({ body: { orderIds: ['order-1'] } })
    const res = mockRes()

    // Act
    await yamatoB2Unconfirm(req, res)

    // Assert: canRetryWithSkip フラグが付いたエラーレスポンス
    // Assert: error response with canRetryWithSkip flag
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ canRetryWithSkip: true })
    )
  })

  it('B2 設定が無効の場合は B2 削除をスキップして完了する / skips B2 delete when B2 config is disabled', async () => {
    // Arrange
    vi.mocked(unconfirmRequestSchema.safeParse).mockReturnValue({
      success: true,
      data: { orderIds: ['order-1'], skipCarrierDelete: false },
    } as any)
    vi.mocked(ShipmentOrder.find).mockResolvedValue(makeOrders() as any)
    vi.mocked(CarrierAutomationConfig.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeYamatoConfig({ enabled: false })),
    } as any)
    vi.mocked(isBuiltInCarrierId).mockReturnValue(true)
    vi.mocked(ShipmentOrder.updateOne).mockResolvedValue({ modifiedCount: 1 } as any)

    const req = mockReq({ body: { orderIds: ['order-1'] } })
    const res = mockRes()

    // Act
    await yamatoB2Unconfirm(req, res)

    // Assert: 成功（B2 削除なし）/ success without B2 deletion
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, updatedCount: 1 })
    )
  })
})

// ═══════════════════════════════════════════════════════════════════
// changeInvoiceType
// ═══════════════════════════════════════════════════════════════════
describe('changeInvoiceType', () => {
  beforeEach(() => vi.clearAllMocks())

  const makeOrders = (carrierId = 'manual-carrier', coolType?: string) => [
    {
      _id: 'order-1',
      orderNumber: 'ON001',
      carrierId,
      invoiceType: '0',
      coolType: coolType || '0',
      trackingId: 'TRK001',
      internalRecord: [],
    },
  ]

  it('手動 Carrier の場合 invoiceType を更新してリセットする / updates invoiceType for manual carrier', async () => {
    // Arrange: 手動 Carrier のみ / manual carrier only
    vi.mocked(changeInvoiceTypeRequestSchema.safeParse).mockReturnValue({
      success: true,
      data: { orderIds: ['order-1'], newInvoiceType: '1', skipCarrierDelete: false },
    } as any)
    vi.mocked(ShipmentOrder.find).mockResolvedValue(makeOrders('manual-carrier') as any)
    vi.mocked(isBuiltInCarrierId).mockReturnValue(false)
    vi.mocked(ShipmentOrder.updateOne).mockResolvedValue({ modifiedCount: 1 } as any)

    const req = mockReq({ body: { orderIds: ['order-1'], newInvoiceType: '1' } })
    const res = mockRes()

    // Act
    await changeInvoiceType(req, res)

    // Assert: requiresManualUpload が true / requiresManualUpload is true
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        requiresManualUpload: true,
        total: 1,
      })
    )
  })

  it('クール便と非対応送り状種類の組み合わせで 400 を返す / returns 400 for incompatible cool type and invoice type', async () => {
    // Arrange: coolType='1'（冷蔵）, newInvoiceType='1'（非対応）
    vi.mocked(changeInvoiceTypeRequestSchema.safeParse).mockReturnValue({
      success: true,
      data: { orderIds: ['order-1'], newInvoiceType: '1', skipCarrierDelete: false },
    } as any)
    // coolType='1' は対応外の送り状種類と組み合わせ不可
    vi.mocked(ShipmentOrder.find).mockResolvedValue(makeOrders('manual-carrier', '1') as any)
    vi.mocked(isBuiltInCarrierId).mockReturnValue(false)

    const req = mockReq({ body: { orderIds: ['order-1'], newInvoiceType: '1' } })
    const res = mockRes()

    // Act
    await changeInvoiceType(req, res)

    // Assert: 互換性エラー / compatibility error
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ incompatibleOrderNumbers: ['ON001'] })
    )
  })

  it('注文が空の場合 400 を返す / returns 400 when orders not found', async () => {
    // Arrange
    vi.mocked(changeInvoiceTypeRequestSchema.safeParse).mockReturnValue({
      success: true,
      data: { orderIds: ['ghost'], newInvoiceType: '1', skipCarrierDelete: false },
    } as any)
    vi.mocked(ShipmentOrder.find).mockResolvedValue([] as any)

    const req = mockReq({ body: { orderIds: ['ghost'], newInvoiceType: '1' } })
    const res = mockRes()

    // Act
    await changeInvoiceType(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '注文が見つかりません' })
    )
  })

  it('スキーマバリデーション失敗時に 400 を返す / returns 400 on schema failure', async () => {
    // Arrange
    vi.mocked(changeInvoiceTypeRequestSchema.safeParse).mockReturnValue({
      success: false,
      error: { flatten: () => ({ fieldErrors: {} }) },
    } as any)

    const req = mockReq({ body: {} })
    const res = mockRes()

    // Act
    await changeInvoiceType(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('内蔵 Carrier で B2 設定が無効の場合、手動処理扱いで成功する / built-in carrier with disabled B2 falls back to manual handling', async () => {
    // Arrange
    vi.mocked(changeInvoiceTypeRequestSchema.safeParse).mockReturnValue({
      success: true,
      data: { orderIds: ['order-1'], newInvoiceType: '2', skipCarrierDelete: false },
    } as any)
    vi.mocked(ShipmentOrder.find).mockResolvedValue(makeOrders('builtin-yamato') as any)
    vi.mocked(isBuiltInCarrierId).mockReturnValue(true)
    vi.mocked(CarrierAutomationConfig.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeYamatoConfig({ enabled: false })),
    } as any)
    vi.mocked(ShipmentOrder.updateOne).mockResolvedValue({ modifiedCount: 1 } as any)

    const req = mockReq({ body: { orderIds: ['order-1'], newInvoiceType: '2' } })
    const res = mockRes()

    // Act
    await changeInvoiceType(req, res)

    // Assert: 成功（B2 削除なし、手動扱い）/ success without B2 deletion, treated as manual
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    )
  })
})

// ═══════════════════════════════════════════════════════════════════
// splitOrder
// ═══════════════════════════════════════════════════════════════════
describe('splitOrder', () => {
  beforeEach(() => vi.clearAllMocks())

  /**
   * 注文分割テスト用の元注文を構築するヘルパー
   * Helper to build an original order for split tests
   */
  const makeOriginalOrder = (overrides: Record<string, any> = {}) => ({
    _id: 'original-order-id',
    orderNumber: 'ON001',
    carrierId: 'manual-carrier',
    trackingId: 'TRK001',
    products: [
      { _id: 'p1', quantity: 2, unitPrice: 1000, subtotal: 2000 },
      { _id: 'p2', quantity: 3, unitPrice: 500, subtotal: 1500 },
    ],
    toObject: vi.fn().mockReturnValue({
      tenantId: 'tenant-test',
      orderNumber: 'ON001',
      carrierId: 'manual-carrier',
      products: [
        { _id: 'p1', quantity: 2, unitPrice: 1000, subtotal: 2000 },
        { _id: 'p2', quantity: 3, unitPrice: 500, subtotal: 1500 },
      ],
    }),
    ...overrides,
  })

  it('手動 Carrier で注文を正常に分割する / splits order successfully for manual carrier', async () => {
    // Arrange
    const splitGroupsData = [
      { products: [{ productIndex: 0, quantity: 2 }] },
      { products: [{ productIndex: 1, quantity: 3 }] },
    ]
    vi.mocked(splitOrderRequestSchema.safeParse).mockReturnValue({
      success: true,
      data: { orderId: 'original-order-id', splitGroups: splitGroupsData, skipCarrierDelete: false },
    } as any)
    vi.mocked(ShipmentOrder.findById).mockResolvedValue(makeOriginalOrder() as any)
    vi.mocked(isBuiltInCarrierId).mockReturnValue(false)
    vi.mocked(generateOrderNumbers).mockResolvedValue(['ON-NEW-1', 'ON-NEW-2'])
    vi.mocked(ShipmentOrder.insertMany).mockResolvedValue([
      { _id: 'new-order-1', orderNumber: 'ON-NEW-1', products: [{}] },
      { _id: 'new-order-2', orderNumber: 'ON-NEW-2', products: [{}] },
    ] as any)
    vi.mocked(ShipmentOrder.deleteOne).mockResolvedValue({ deletedCount: 1 } as any)

    const req = mockReq({ body: { orderId: 'original-order-id', splitGroups: splitGroupsData } })
    const res = mockRes()

    // Act
    await splitOrder(req, res)

    // Assert: 分割注文が返り、元注文が削除される
    // Assert: split orders are returned and original order is deleted
    expect(ShipmentOrder.deleteOne).toHaveBeenCalledWith({ _id: 'original-order-id' })
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        originalOrderId: 'original-order-id',
        splitOrders: expect.arrayContaining([
          expect.objectContaining({ orderNumber: 'ON-NEW-1' }),
          expect.objectContaining({ orderNumber: 'ON-NEW-2' }),
        ]),
      })
    )
  })

  it('元注文が存在しない場合 404 を返す / returns 404 when original order not found', async () => {
    // Arrange
    vi.mocked(splitOrderRequestSchema.safeParse).mockReturnValue({
      success: true,
      data: { orderId: 'ghost', splitGroups: [], skipCarrierDelete: false },
    } as any)
    vi.mocked(ShipmentOrder.findById).mockResolvedValue(null as any)

    const req = mockReq({ body: { orderId: 'ghost', splitGroups: [] } })
    const res = mockRes()

    // Act
    await splitOrder(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '注文が見つかりません' })
    )
  })

  it('商品数が 1 以下の場合 400 を返す / returns 400 when total product quantity is 1 or less', async () => {
    // Arrange: 商品数が 1 / only 1 product unit
    vi.mocked(splitOrderRequestSchema.safeParse).mockReturnValue({
      success: true,
      data: { orderId: 'order-1', splitGroups: [], skipCarrierDelete: false },
    } as any)
    const singleProductOrder = makeOriginalOrder({
      products: [{ _id: 'p1', quantity: 1 }],
      toObject: vi.fn().mockReturnValue({
        products: [{ _id: 'p1', quantity: 1 }],
      }),
    })
    vi.mocked(ShipmentOrder.findById).mockResolvedValue(singleProductOrder as any)

    const req = mockReq({ body: { orderId: 'order-1', splitGroups: [] } })
    const res = mockRes()

    // Act
    await splitOrder(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '商品数が1以下の注文は分割できません' })
    )
  })

  it('無効な商品インデックスで 400 を返す / returns 400 for invalid product index', async () => {
    // Arrange: productIndex が範囲外 / productIndex out of range
    vi.mocked(splitOrderRequestSchema.safeParse).mockReturnValue({
      success: true,
      data: {
        orderId: 'order-1',
        splitGroups: [{ products: [{ productIndex: 99, quantity: 1 }] }],
        skipCarrierDelete: false,
      },
    } as any)
    vi.mocked(ShipmentOrder.findById).mockResolvedValue(makeOriginalOrder() as any)

    const req = mockReq({ body: { orderId: 'order-1', splitGroups: [{ products: [{ productIndex: 99, quantity: 1 }] }] } })
    const res = mockRes()

    // Act
    await splitOrder(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('無効な商品インデックス') })
    )
  })

  it('割当数量と元数量が一致しない場合 400 を返す / returns 400 when allocated quantity does not match original', async () => {
    // Arrange: 商品[0]の数量が 2 なのに 1 しか割り当てない / allocate 1 but original is 2
    vi.mocked(splitOrderRequestSchema.safeParse).mockReturnValue({
      success: true,
      data: {
        orderId: 'order-1',
        splitGroups: [
          { products: [{ productIndex: 0, quantity: 1 }] },  // 1 だけ（元は 2）/ only 1 (original is 2)
          { products: [{ productIndex: 1, quantity: 3 }] },
        ],
        skipCarrierDelete: false,
      },
    } as any)
    vi.mocked(ShipmentOrder.findById).mockResolvedValue(makeOriginalOrder() as any)

    const req = mockReq({ body: {} })
    const res = mockRes()

    // Act
    await splitOrder(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('数量が一致しません') })
    )
  })

  it('スキーマバリデーション失敗時に 400 を返す / returns 400 on schema failure', async () => {
    // Arrange
    vi.mocked(splitOrderRequestSchema.safeParse).mockReturnValue({
      success: false,
      error: { flatten: () => ({ fieldErrors: { orderId: ['Required'] } }) },
    } as any)

    const req = mockReq({ body: {} })
    const res = mockRes()

    // Act
    await splitOrder(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('内蔵 Carrier で B2 削除失敗時、挿入済み注文をロールバックする / rolls back inserted orders when B2 delete fails for built-in carrier', async () => {
    // Arrange: 内蔵 Carrier + B2 削除失敗
    const splitGroupsData = [
      { products: [{ productIndex: 0, quantity: 2 }] },
      { products: [{ productIndex: 1, quantity: 3 }] },
    ]
    vi.mocked(splitOrderRequestSchema.safeParse).mockReturnValue({
      success: true,
      data: { orderId: 'original-order-id', splitGroups: splitGroupsData, skipCarrierDelete: false },
    } as any)
    const originalOrder = makeOriginalOrder({ carrierId: 'builtin-yamato', trackingId: 'TRK001' })
    vi.mocked(ShipmentOrder.findById).mockResolvedValue(originalOrder as any)
    vi.mocked(isBuiltInCarrierId).mockReturnValue(true)
    vi.mocked(CarrierAutomationConfig.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeYamatoConfig()),
    } as any)
    vi.mocked(generateOrderNumbers).mockResolvedValue(['ON-NEW-1', 'ON-NEW-2'])
    vi.mocked(ShipmentOrder.insertMany).mockResolvedValue([
      { _id: 'new-1', orderNumber: 'ON-NEW-1', products: [{}] },
      { _id: 'new-2', orderNumber: 'ON-NEW-2', products: [{}] },
    ] as any)
    const service = fakeB2Service({
      deleteFromHistory: vi.fn().mockRejectedValue(new Error('B2 delete failed')),
    })
    vi.mocked(createYamatoB2Service).mockReturnValue(service as any)
    vi.mocked(ShipmentOrder.deleteMany).mockResolvedValue({ deletedCount: 2 } as any)

    const req = mockReq({ body: { orderId: 'original-order-id', splitGroups: splitGroupsData } })
    const res = mockRes()

    // Act
    await splitOrder(req, res)

    // Assert: 挿入済み注文をロールバック / inserted orders are rolled back
    expect(ShipmentOrder.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ _id: { $in: ['new-1', 'new-2'] } })
    )
    // canRetryWithSkip エラーが返る / canRetryWithSkip error is returned
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ canRetryWithSkip: true })
    )
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(splitOrderRequestSchema.safeParse).mockReturnValue({
      success: true,
      data: { orderId: 'order-1', splitGroups: [], skipCarrierDelete: false },
    } as any)
    vi.mocked(ShipmentOrder.findById).mockRejectedValue(new Error('DB error'))

    const req = mockReq({ body: { orderId: 'order-1', splitGroups: [] } })
    const res = mockRes()

    // Act
    await splitOrder(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '注文分割に失敗しました' })
    )
  })
})
