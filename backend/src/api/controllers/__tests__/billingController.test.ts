/**
 * billingController 统合テスト / Billing Controller Integration Tests
 *
 * BillingRecord, Invoice モデル層を通じた請求・請求書操作の HTTP フローを検証する。
 * Verifies HTTP flow for billing and invoice operations through model layer.
 *
 * モック方針 / Mock strategy:
 * - BillingRecord, Invoice, OrderSourceCompany, Carrier モデルをすべてモック
 *   Mock all models (BillingRecord, Invoice, OrderSourceCompany, Carrier)
 * - getTenantId ヘルパーもモック / Also mock getTenantId helper
 * - DB 接続・外部依存なし / No DB connection, no external dependencies
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言（hoisted） ─────────────────────────────────────────
// Module mock declarations (hoisted)

vi.mock('@/models/billingRecord', () => ({
  BillingRecord: {
    find: vi.fn(),
    findById: vi.fn(),
    findOneAndUpdate: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
  },
}))

vi.mock('@/models/invoice', () => ({
  Invoice: {
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn(),
  },
}))

vi.mock('@/models/orderSourceCompany', () => ({
  OrderSourceCompany: {
    find: vi.fn(),
  },
}))

vi.mock('@/models/carrier', () => ({
  Carrier: {
    find: vi.fn(),
  },
}))

vi.mock('@/models/shipmentOrder', () => ({
  ShipmentOrder: {
    find: vi.fn(),
  },
}))

vi.mock('@/api/helpers/tenantHelper', () => ({
  getTenantId: vi.fn().mockReturnValue('T1'),
}))

// mongoose の動的インポートをモック / Mock mongoose dynamic import
vi.mock('mongoose', async () => {
  const mockAggregate = vi.fn().mockReturnValue({
    toArray: vi.fn().mockResolvedValue([]),
  })
  return {
    default: {
      connection: {
        collection: vi.fn().mockReturnValue({
          aggregate: mockAggregate,
        }),
      },
    },
  }
})

import { BillingRecord } from '@/models/billingRecord'
import { Invoice } from '@/models/invoice'
import {
  listBillingRecords,
  getBillingRecord,
  confirmBillingRecord,
  generateMonthlyBilling,
  createInvoice,
  listInvoices,
  getInvoice,
  updateInvoiceStatus,
  getInvoiceDetail,
  getBillingDashboard,
} from '@/api/controllers/billingController'

// ─── テストユーティリティ / Test utilities ────────────────────────────────────

/**
 * モックリクエスト生成 / Mock request factory
 */
const mockReq = (overrides: Record<string, any> = {}) =>
  ({
    query: {},
    params: {},
    body: {},
    headers: {},
    user: { id: 'u1', tenantId: 'T1' },
    ...overrides,
  }) as any

/**
 * モックレスポンス生成 / Mock response factory
 * status().json() チェーンをサポート / Supports status().json() chaining
 */
const mockRes = () => {
  const res: any = {
    json: vi.fn(),
    status: vi.fn(),
  }
  res.status.mockReturnValue(res)
  return res
}

// ─── listBillingRecords ───────────────────────────────────────────────────────

describe('listBillingRecords', () => {
  beforeEach(() => vi.clearAllMocks())

  it('フィルタなしで請求明細一覧を返す / returns billing records list without filters', async () => {
    // Arrange
    const fakeDocs = [{ _id: 'br-1', period: '2026-03', totalAmount: 50000 }]
    const chain = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(fakeDocs),
    }
    vi.mocked(BillingRecord.find).mockReturnValue(chain as any)
    vi.mocked(BillingRecord.countDocuments).mockResolvedValue(1 as any)

    const req = mockReq({ query: {} })
    const res = mockRes()

    // Act
    await listBillingRecords(req, res)

    // Assert: ページネーション付きで返される / returned with pagination
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: fakeDocs, total: 1 }),
    )
  })

  it('period と clientId フィルタを適用する / applies period and clientId filters', async () => {
    // Arrange
    const chain = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(BillingRecord.find).mockReturnValue(chain as any)
    vi.mocked(BillingRecord.countDocuments).mockResolvedValue(0 as any)

    const req = mockReq({ query: { period: '2026-03', clientId: 'client-1' } })
    const res = mockRes()

    // Act
    await listBillingRecords(req, res)

    // Assert: フィルタが渡される / filters passed
    expect(BillingRecord.find).toHaveBeenCalledWith(
      expect.objectContaining({ period: '2026-03', clientId: 'client-1' }),
    )
  })

  it('エラー時に 500 を返す / returns 500 on error', async () => {
    // Arrange
    vi.mocked(BillingRecord.find).mockImplementation(() => {
      throw new Error('DB connection failed')
    })

    const req = mockReq()
    const res = mockRes()

    // Act
    await listBillingRecords(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'DB connection failed' }),
    )
  })
})

// ─── getBillingRecord ─────────────────────────────────────────────────────────

describe('getBillingRecord', () => {
  beforeEach(() => vi.clearAllMocks())

  it('IDで請求明細を取得して返す / fetches and returns billing record by ID', async () => {
    // Arrange
    const fakeDoc = { _id: 'br-1', period: '2026-03', totalAmount: 50000 }
    const chain = { lean: vi.fn().mockResolvedValue(fakeDoc) }
    vi.mocked(BillingRecord.findById).mockReturnValue(chain as any)

    const req = mockReq({ params: { id: 'br-1' } })
    const res = mockRes()

    // Act
    await getBillingRecord(req, res)

    // Assert
    expect(BillingRecord.findById).toHaveBeenCalledWith('br-1')
    expect(res.json).toHaveBeenCalledWith(fakeDoc)
  })

  it('存在しないIDの場合 404 を返す / returns 404 for nonexistent ID', async () => {
    // Arrange
    const chain = { lean: vi.fn().mockResolvedValue(null) }
    vi.mocked(BillingRecord.findById).mockReturnValue(chain as any)

    const req = mockReq({ params: { id: 'nonexistent' } })
    const res = mockRes()

    // Act
    await getBillingRecord(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('見つかりません') }),
    )
  })

  it('エラー時に 500 を返す / returns 500 on error', async () => {
    // Arrange
    const chain = { lean: vi.fn().mockRejectedValue(new Error('DB error')) }
    vi.mocked(BillingRecord.findById).mockReturnValue(chain as any)

    const req = mockReq({ params: { id: 'br-1' } })
    const res = mockRes()

    // Act
    await getBillingRecord(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── confirmBillingRecord ─────────────────────────────────────────────────────

describe('confirmBillingRecord', () => {
  beforeEach(() => vi.clearAllMocks())

  it('draft 請求明細を confirmed に更新する / transitions draft billing record to confirmed', async () => {
    // Arrange
    const fakeDoc = {
      _id: 'br-1',
      status: 'draft',
      confirmedAt: undefined,
      confirmedBy: undefined,
      save: vi.fn().mockResolvedValue(undefined),
      toObject: vi.fn().mockReturnValue({ _id: 'br-1', status: 'confirmed' }),
    }
    vi.mocked(BillingRecord.findById).mockResolvedValue(fakeDoc as any)

    const req = mockReq({
      params: { id: 'br-1' },
      body: { confirmedBy: 'admin-user' },
    })
    const res = mockRes()

    // Act
    await confirmBillingRecord(req, res)

    // Assert: ステータスが confirmed に変わった / status changed to confirmed
    expect(fakeDoc.status).toBe('confirmed')
    expect(fakeDoc.confirmedBy).toBe('admin-user')
    expect(fakeDoc.save).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'confirmed' }),
    )
  })

  it('draft 以外の請求明細は 400 を返す / returns 400 for non-draft billing record', async () => {
    // Arrange: すでに confirmed の状態 / already in confirmed state
    const fakeDoc = { _id: 'br-1', status: 'confirmed' }
    vi.mocked(BillingRecord.findById).mockResolvedValue(fakeDoc as any)

    const req = mockReq({ params: { id: 'br-1' }, body: {} })
    const res = mockRes()

    // Act
    await confirmBillingRecord(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('ドラフト') }),
    )
  })

  it('存在しないIDの場合 404 を返す / returns 404 for nonexistent ID', async () => {
    // Arrange
    vi.mocked(BillingRecord.findById).mockResolvedValue(null)

    const req = mockReq({ params: { id: 'nonexistent' }, body: {} })
    const res = mockRes()

    // Act
    await confirmBillingRecord(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
  })
})

// ─── generateMonthlyBilling ───────────────────────────────────────────────────

describe('generateMonthlyBilling', () => {
  beforeEach(() => vi.clearAllMocks())

  it('有効な期間で月次請求データを生成する / generates monthly billing for valid period', async () => {
    // Arrange: mongoose 集計が空配列を返す（テスト用）/ mongoose aggregate returns empty array (for testing)
    vi.mocked(BillingRecord.findOneAndUpdate).mockResolvedValue({ _id: 'br-1' } as any)

    const req = mockReq({ body: { period: '2026-03' } })
    const res = mockRes()

    // Act
    await generateMonthlyBilling(req, res)

    // Assert: 201 ステータスで返される / returned with 201 status
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ count: expect.any(Number) }),
    )
  })

  it('期間パラメータが欠落している場合 400 を返す / returns 400 when period is missing', async () => {
    // Arrange: period なし / no period
    const req = mockReq({ body: {} })
    const res = mockRes()

    // Act
    await generateMonthlyBilling(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('期間') }),
    )
  })

  it('無効な期間形式の場合 400 を返す / returns 400 for invalid period format', async () => {
    // Arrange: YYYY-MM 形式でない / not in YYYY-MM format
    const req = mockReq({ body: { period: '2026/03' } })
    const res = mockRes()

    // Act
    await generateMonthlyBilling(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })
})

// ─── listInvoices ─────────────────────────────────────────────────────────────

describe('listInvoices', () => {
  beforeEach(() => vi.clearAllMocks())

  it('請求書一覧をページネーション付きで返す / returns invoice list with pagination', async () => {
    // Arrange
    const fakeInvoices = [{ _id: 'inv-1', invoiceNumber: 'INV-202603-001' }]
    const chain = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(fakeInvoices),
    }
    vi.mocked(Invoice.find).mockReturnValue(chain as any)
    vi.mocked(Invoice.countDocuments).mockResolvedValue(1 as any)

    const req = mockReq({ query: {} })
    const res = mockRes()

    // Act
    await listInvoices(req, res)

    // Assert
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: fakeInvoices, total: 1 }),
    )
  })

  it('status フィルタを適用する / applies status filter', async () => {
    // Arrange
    const chain = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(Invoice.find).mockReturnValue(chain as any)
    vi.mocked(Invoice.countDocuments).mockResolvedValue(0 as any)

    const req = mockReq({ query: { status: 'issued' } })
    const res = mockRes()

    // Act
    await listInvoices(req, res)

    // Assert
    expect(Invoice.find).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'issued' }),
    )
  })

  it('エラー時に 500 を返す / returns 500 on error', async () => {
    // Arrange
    vi.mocked(Invoice.find).mockImplementation(() => {
      throw new Error('invoice query error')
    })

    const req = mockReq()
    const res = mockRes()

    // Act
    await listInvoices(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── getInvoice ───────────────────────────────────────────────────────────────

describe('getInvoice', () => {
  beforeEach(() => vi.clearAllMocks())

  it('IDで請求書を取得して返す / fetches and returns invoice by ID', async () => {
    // Arrange
    const fakeInvoice = { _id: 'inv-1', invoiceNumber: 'INV-202603-001', totalAmount: 55000 }
    const chain = { lean: vi.fn().mockResolvedValue(fakeInvoice) }
    vi.mocked(Invoice.findById).mockReturnValue(chain as any)

    const req = mockReq({ params: { id: 'inv-1' } })
    const res = mockRes()

    // Act
    await getInvoice(req, res)

    // Assert
    expect(Invoice.findById).toHaveBeenCalledWith('inv-1')
    expect(res.json).toHaveBeenCalledWith(fakeInvoice)
  })

  it('存在しないIDの場合 404 を返す / returns 404 for nonexistent ID', async () => {
    // Arrange
    const chain = { lean: vi.fn().mockResolvedValue(null) }
    vi.mocked(Invoice.findById).mockReturnValue(chain as any)

    const req = mockReq({ params: { id: 'nonexistent' } })
    const res = mockRes()

    // Act
    await getInvoice(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('見つかりません') }),
    )
  })
})

// ─── updateInvoiceStatus ──────────────────────────────────────────────────────

describe('updateInvoiceStatus', () => {
  beforeEach(() => vi.clearAllMocks())

  it('有効なステータスに請求書を更新する / updates invoice to valid status', async () => {
    // Arrange
    const fakeInvoice = {
      _id: 'inv-1',
      status: 'draft',
      billingRecordId: null,
      paidAt: undefined,
      save: vi.fn().mockResolvedValue(undefined),
      toObject: vi.fn().mockReturnValue({ _id: 'inv-1', status: 'issued' }),
    }
    vi.mocked(Invoice.findById).mockResolvedValue(fakeInvoice as any)

    const req = mockReq({
      params: { id: 'inv-1' },
      body: { status: 'issued' },
    })
    const res = mockRes()

    // Act
    await updateInvoiceStatus(req, res)

    // Assert: ステータスが更新された / status updated
    expect(fakeInvoice.status).toBe('issued')
    expect(fakeInvoice.save).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'issued' }),
    )
  })

  it('paid ステータスに設定すると paidAt が設定される / sets paidAt when status is paid', async () => {
    // Arrange
    const fakeInvoice = {
      _id: 'inv-1',
      status: 'issued',
      billingRecordId: null,
      paidAt: undefined,
      save: vi.fn().mockResolvedValue(undefined),
      toObject: vi.fn().mockReturnValue({ _id: 'inv-1', status: 'paid' }),
    }
    vi.mocked(Invoice.findById).mockResolvedValue(fakeInvoice as any)

    const req = mockReq({
      params: { id: 'inv-1' },
      body: { status: 'paid' },
    })
    const res = mockRes()

    // Act
    await updateInvoiceStatus(req, res)

    // Assert: paidAt が設定された / paidAt was set
    expect(fakeInvoice.paidAt).toBeDefined()
  })

  it('無効なステータスの場合 400 を返す / returns 400 for invalid status', async () => {
    // Arrange: 無効なステータス / invalid status
    const req = mockReq({
      params: { id: 'inv-1' },
      body: { status: 'invalid_status' },
    })
    const res = mockRes()

    // Act
    await updateInvoiceStatus(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('ステータス') }),
    )
    expect(Invoice.findById).not.toHaveBeenCalled()
  })

  it('キャンセル済み請求書のステータス変更は 400 を返す / returns 400 when changing status of cancelled invoice', async () => {
    // Arrange: キャンセル済みは変更不可 / cancelled cannot be changed
    const fakeInvoice = { _id: 'inv-1', status: 'cancelled' }
    vi.mocked(Invoice.findById).mockResolvedValue(fakeInvoice as any)

    const req = mockReq({
      params: { id: 'inv-1' },
      body: { status: 'issued' },
    })
    const res = mockRes()

    // Act
    await updateInvoiceStatus(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('キャンセル') }),
    )
  })

  it('存在しないIDの場合 404 を返す / returns 404 for nonexistent ID', async () => {
    // Arrange
    vi.mocked(Invoice.findById).mockResolvedValue(null)

    const req = mockReq({
      params: { id: 'nonexistent' },
      body: { status: 'issued' },
    })
    const res = mockRes()

    // Act
    await updateInvoiceStatus(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
  })
})

// ─── createInvoice ────────────────────────────────────────────────────────────

describe('createInvoice', () => {
  beforeEach(() => vi.clearAllMocks())

  it('必須フィールドで請求書を作成して 201 を返す / creates invoice with required fields and returns 201', async () => {
    // Arrange
    const fakeInvoice = {
      _id: 'inv-new',
      invoiceNumber: 'INV-202603-001',
      totalAmount: 55000,
      toObject: vi.fn().mockReturnValue({ _id: 'inv-new', invoiceNumber: 'INV-202603-001' }),
    }
    vi.mocked(Invoice.create).mockResolvedValue(fakeInvoice as any)
    // generateInvoiceNumber 内の Invoice.findOne は .lean() チェーンを使う
    // Invoice.findOne inside generateInvoiceNumber uses .lean() chain
    vi.mocked(Invoice.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({
      body: {
        period: '2026-03',
        issueDate: '2026-03-31',
        dueDate: '2026-04-30',
        lineItems: [{ description: '配送料', quantity: 100, unitPrice: 500, amount: 50000 }],
      },
    })
    const res = mockRes()

    // Act
    await createInvoice(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ invoiceNumber: 'INV-202603-001' }),
    )
  })

  it('period パラメータが欠落している場合 400 を返す / returns 400 when period is missing', async () => {
    // Arrange
    const req = mockReq({
      body: { issueDate: '2026-03-31', dueDate: '2026-04-30' },
    })
    const res = mockRes()

    // Act
    await createInvoice(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('期間') }),
    )
  })

  it('issueDate または dueDate が欠落している場合 400 を返す / returns 400 when issueDate or dueDate missing', async () => {
    // Arrange: issueDate なし / no issueDate
    const req = mockReq({
      body: { period: '2026-03', dueDate: '2026-04-30' },
    })
    const res = mockRes()

    // Act
    await createInvoice(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('発行日') }),
    )
  })

  it('billingRecordId が draft の場合 400 を返す / returns 400 when billingRecordId points to draft record', async () => {
    // Arrange: billingRecord が draft 状態 / billingRecord is in draft state
    const fakeBillingRecord = { _id: 'br-1', status: 'draft' }
    const brChain = { lean: vi.fn().mockResolvedValue(fakeBillingRecord) }
    vi.mocked(BillingRecord.findById).mockReturnValue(brChain as any)

    const req = mockReq({
      body: {
        period: '2026-03',
        issueDate: '2026-03-31',
        dueDate: '2026-04-30',
        billingRecordId: 'br-1',
      },
    })
    const res = mockRes()

    // Act
    await createInvoice(req, res)

    // Assert: draft の請求明細からは請求書を作れない
    // Cannot create invoice from draft billing record
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('確定済み') }),
    )
  })
})

// ─── getInvoiceDetail ─────────────────────────────────────────────────────────

describe('getInvoiceDetail', () => {
  beforeEach(() => vi.clearAllMocks())

  it('請求書と関連請求明細をまとめて返す / returns invoice with associated billing record', async () => {
    // Arrange
    const fakeInvoice = {
      _id: 'inv-1',
      billingRecordId: 'br-1',
      invoiceNumber: 'INV-202603-001',
    }
    const fakeBillingRecord = { _id: 'br-1', period: '2026-03', totalAmount: 50000 }
    const invChain = { lean: vi.fn().mockResolvedValue(fakeInvoice) }
    const brChain = { lean: vi.fn().mockResolvedValue(fakeBillingRecord) }
    vi.mocked(Invoice.findById).mockReturnValue(invChain as any)
    vi.mocked(BillingRecord.findById).mockReturnValue(brChain as any)

    const req = mockReq({ params: { id: 'inv-1' } })
    const res = mockRes()

    // Act
    await getInvoiceDetail(req, res)

    // Assert: 請求書 + 請求明細を含む / contains invoice + billing record
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        invoiceNumber: 'INV-202603-001',
        billingRecord: fakeBillingRecord,
      }),
    )
  })

  it('存在しないIDの場合 404 を返す / returns 404 for nonexistent ID', async () => {
    // Arrange
    const chain = { lean: vi.fn().mockResolvedValue(null) }
    vi.mocked(Invoice.findById).mockReturnValue(chain as any)

    const req = mockReq({ params: { id: 'nonexistent' } })
    const res = mockRes()

    // Act
    await getInvoiceDetail(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
  })
})

// ─── getBillingDashboard ──────────────────────────────────────────────────────

describe('getBillingDashboard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('KPI データを含むダッシュボード情報を返す / returns dashboard info with KPI data', async () => {
    // Arrange: BillingRecord と Invoice のクエリをモック / Mock BillingRecord and Invoice queries
    (vi.mocked(BillingRecord.find) as any).mockImplementation((filter: any) => {
      // 異なるフィルタに応じて異なるデータを返す / Return different data based on filter
      if (filter?.period) {
        // 当月データ / Current month data
        return {
          lean: vi.fn().mockResolvedValue([
            { orderCount: 50, totalShippingCost: 250000, totalAmount: 300000 },
          ]),
        } as any
      }
      if (filter?.status?.$in?.includes('draft')) {
        // 未請求データ / Unbilled data
        return {
          lean: vi.fn().mockResolvedValue([
            { totalAmount: 100000 },
          ]),
        } as any
      }
      // 最近の記録 / Recent records
      return {
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([
          { _id: 'br-1', period: '2026-03', totalAmount: 300000 },
        ]),
      } as any
    })

    vi.mocked(Invoice.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue([{ totalAmount: 80000 }]),
    } as any)

    const req = mockReq()
    const res = mockRes()

    // Act
    await getBillingDashboard(req, res)

    // Assert: KPI フィールドが含まれる / KPI fields included
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        monthlyOrderCount: expect.any(Number),
        monthlyShippingCost: expect.any(Number),
        unbilledAmount: expect.any(Number),
        unpaidAmount: expect.any(Number),
        currentPeriod: expect.stringMatching(/^\d{4}-\d{2}$/),
        recentRecords: expect.any(Array),
      }),
    )
  })

  it('エラー時に 500 を返す / returns 500 on error', async () => {
    // Arrange
    vi.mocked(BillingRecord.find).mockImplementation(() => {
      throw new Error('aggregate error')
    })

    const req = mockReq()
    const res = mockRes()

    // Act
    await getBillingDashboard(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'aggregate error' }),
    )
  })
})
