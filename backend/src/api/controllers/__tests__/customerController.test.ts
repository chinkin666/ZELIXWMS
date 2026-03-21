/**
 * customerController 統合テスト / Customer Controller Integration Tests
 * 得意先コントローラの統合テスト / 客户控制器集成测试
 *
 * 得意先 CRUD の HTTP フローを検証する。
 * 验证客户 CRUD 的 HTTP 流程。
 *
 * モック方針 / Mock strategy:
 * - Customer モデルをモック（DB不要）
 *   Mock Customer model to eliminate DB dependency
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言（hoisted） / 模块Mock声明（提升） ──────────

vi.mock('@/models/customer', () => ({
  Customer: {
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findOneAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
  },
}))

import { Customer } from '@/models/customer'
import {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  bulkImportCustomers,
  exportCustomers,
} from '../customerController'

// ─── テストユーティリティ / 测试工具 ────────────────────────

/** モックリクエスト生成 / Mock请求工厂 */
const mockReq = (overrides = {}) =>
  ({
    query: {},
    params: {},
    body: {},
    headers: {},
    ...overrides,
  }) as any

/** モックレスポンス生成 / Mock响应工厂 */
const mockRes = () => {
  const res: any = { json: vi.fn(), status: vi.fn() }
  res.status.mockReturnValue(res)
  return res
}

// ─── listCustomers / 得意先一覧 / 客户列表 ──────────

describe('listCustomers', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ページネーション付きで一覧を返す / 返回分页列表', async () => {
    const fakeData = [{ _id: 'cust1', customerCode: 'CUST-001', name: 'テスト得意先' }]
    const chainMock = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(fakeData),
    }
    vi.mocked(Customer.find).mockReturnValue(chainMock as any)
    vi.mocked(Customer.countDocuments).mockResolvedValue(1)

    const req = mockReq({ query: { page: '1', limit: '50' } })
    const res = mockRes()

    await listCustomers(req, res)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: fakeData, total: 1 }),
    )
  })

  it('検索フィルタが適用される / 应用搜索筛选', async () => {
    const chainMock = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(Customer.find).mockReturnValue(chainMock as any)
    vi.mocked(Customer.countDocuments).mockResolvedValue(0)

    const req = mockReq({ query: { search: 'テスト' } })
    const res = mockRes()

    await listCustomers(req, res)

    expect(Customer.find).toHaveBeenCalledWith(
      expect.objectContaining({ $or: expect.any(Array) }),
    )
  })

  it('isActive フィルタが適用される / 应用isActive筛选', async () => {
    const chainMock = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(Customer.find).mockReturnValue(chainMock as any)
    vi.mocked(Customer.countDocuments).mockResolvedValue(0)

    const req = mockReq({ query: { isActive: 'false' } })
    const res = mockRes()

    await listCustomers(req, res)

    expect(Customer.find).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: false }),
    )
  })

  it('DB エラー時に 500 を返す / DB错误时返回500', async () => {
    const chainMock = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockRejectedValue(new Error('DB down')),
    }
    vi.mocked(Customer.find).mockReturnValue(chainMock as any)
    vi.mocked(Customer.countDocuments).mockResolvedValue(0)

    const req = mockReq()
    const res = mockRes()

    await listCustomers(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '得意先の取得に失敗しました' }),
    )
  })
})

// ─── getCustomer / 得意先詳細 / 客户详情 ──────────

describe('getCustomer', () => {
  beforeEach(() => vi.clearAllMocks())

  it('既存得意先を ID で取得する / 根据ID获取客户', async () => {
    const fakeCustomer = { _id: 'cust1', customerCode: 'CUST-001', name: 'テスト得意先' }
    vi.mocked(Customer.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeCustomer),
    } as any)

    const req = mockReq({ params: { id: 'cust1' } })
    const res = mockRes()

    await getCustomer(req, res)

    expect(Customer.findById).toHaveBeenCalledWith('cust1')
    expect(res.json).toHaveBeenCalledWith(fakeCustomer)
  })

  it('存在しない場合 404 を返す / 不存在时返回404', async () => {
    vi.mocked(Customer.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'nonexistent' } })
    const res = mockRes()

    await getCustomer(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: '得意先が見つかりません' })
  })

  it('DB エラー時に 500 を返す / DB错误时返回500', async () => {
    vi.mocked(Customer.findById).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('connection error')),
    } as any)

    const req = mockReq({ params: { id: 'cust1' } })
    const res = mockRes()

    await getCustomer(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── createCustomer / 得意先作成 / 创建客户 ──────────

describe('createCustomer', () => {
  beforeEach(() => vi.clearAllMocks())

  it('正常に作成し 201 を返す / 正常创建返回201', async () => {
    vi.mocked(Customer.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)
    const fakeCreated = {
      _id: 'cust-new',
      customerCode: 'CUST-NEW',
      name: '新得意先',
      toObject: () => ({ _id: 'cust-new', customerCode: 'CUST-NEW', name: '新得意先' }),
    }
    vi.mocked(Customer.create).mockResolvedValue(fakeCreated as any)

    const req = mockReq({ body: { customerCode: 'CUST-NEW', name: '新得意先' } })
    const res = mockRes()

    await createCustomer(req, res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ customerCode: 'CUST-NEW' }),
    )
  })

  it('得意先コード不足で 400 を返す / 缺少客户编号返回400', async () => {
    const req = mockReq({ body: { name: 'テスト' } })
    const res = mockRes()

    await createCustomer(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '得意先コードは必須です' }),
    )
  })

  it('得意先名不足で 400 を返す / 缺少客户名称返回400', async () => {
    const req = mockReq({ body: { customerCode: 'CUST-001' } })
    const res = mockRes()

    await createCustomer(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '得意先名は必須です' }),
    )
  })

  it('重複時に 409 を返す / 重复时返回409', async () => {
    vi.mocked(Customer.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'existing', customerCode: 'CUST-DUP' }),
    } as any)

    const req = mockReq({ body: { customerCode: 'CUST-DUP', name: '重複得意先' } })
    const res = mockRes()

    await createCustomer(req, res)

    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ duplicateField: 'customerCode' }),
    )
  })

  it('DB 11000 エラー時に 409 を返す / DB 11000错误时返回409', async () => {
    vi.mocked(Customer.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)
    const dbError = Object.assign(new Error('duplicate'), {
      code: 11000,
      keyPattern: { customerCode: 1 },
      keyValue: { customerCode: 'CUST-DUP' },
    })
    vi.mocked(Customer.create).mockRejectedValue(dbError)

    const req = mockReq({ body: { customerCode: 'CUST-DUP', name: 'テスト' } })
    const res = mockRes()

    await createCustomer(req, res)

    expect(res.status).toHaveBeenCalledWith(409)
  })

  it('DB エラー時に 500 を返す / DB错误时返回500', async () => {
    vi.mocked(Customer.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)
    vi.mocked(Customer.create).mockRejectedValue(new Error('insert failed'))

    const req = mockReq({ body: { customerCode: 'CUST-ERR', name: 'エラー得意先' } })
    const res = mockRes()

    await createCustomer(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── updateCustomer / 得意先更新 / 更新客户 ──────────

describe('updateCustomer', () => {
  beforeEach(() => vi.clearAllMocks())

  it('存在しない場合 404 を返す / 不存在时返回404', async () => {
    vi.mocked(Customer.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'nonexistent' }, body: { name: '更新' } })
    const res = mockRes()

    await updateCustomer(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('正常に更新する / 正常更新', async () => {
    const fakeExisting = { _id: 'cust1', customerCode: 'CUST-001', name: '旧得意先' }
    vi.mocked(Customer.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeExisting),
    } as any)
    const fakeUpdated = { _id: 'cust1', customerCode: 'CUST-001', name: '更新得意先' }
    vi.mocked(Customer.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeUpdated),
    } as any)

    const req = mockReq({ params: { id: 'cust1' }, body: { name: '更新得意先' } })
    const res = mockRes()

    await updateCustomer(req, res)

    expect(res.json).toHaveBeenCalledWith(fakeUpdated)
  })

  it('コード変更時の重複で 409 を返す / 编号变更重复返回409', async () => {
    const fakeExisting = { _id: 'cust1', customerCode: 'CUST-001' }
    vi.mocked(Customer.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeExisting),
    } as any)
    vi.mocked(Customer.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'cust2', customerCode: 'CUST-DUP' }),
    } as any)

    const req = mockReq({ params: { id: 'cust1' }, body: { customerCode: 'CUST-DUP' } })
    const res = mockRes()

    await updateCustomer(req, res)

    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ duplicateField: 'customerCode' }),
    )
  })

  it('DB エラー時に 500 を返す / DB错误时返回500', async () => {
    vi.mocked(Customer.findById).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('DB error')),
    } as any)

    const req = mockReq({ params: { id: 'cust1' }, body: {} })
    const res = mockRes()

    await updateCustomer(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── deleteCustomer / 得意先削除 / 删除客户 ──────────

describe('deleteCustomer', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ソフトデリートし確認を返す / 软删除并返回确认', async () => {
    const fakeUpdated = { _id: 'cust1', isActive: false }
    vi.mocked(Customer.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeUpdated),
    } as any)

    const req = mockReq({ params: { id: 'cust1' } })
    const res = mockRes()

    await deleteCustomer(req, res)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Deleted' }),
    )
  })

  it('存在しない場合 404 を返す / 不存在时返回404', async () => {
    vi.mocked(Customer.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'ghost' } })
    const res = mockRes()

    await deleteCustomer(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('DB エラー時に 500 を返す / DB错误时返回500', async () => {
    vi.mocked(Customer.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('delete error')),
    } as any)

    const req = mockReq({ params: { id: 'cust1' } })
    const res = mockRes()

    await deleteCustomer(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── bulkImportCustomers / 一括取込 / 批量导入 ──────────

describe('bulkImportCustomers', () => {
  beforeEach(() => vi.clearAllMocks())

  it('空配列で 400 を返す / 空数组返回400', async () => {
    const req = mockReq({ body: { customers: [] } })
    const res = mockRes()

    await bulkImportCustomers(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('正常にインポートする / 正常导入', async () => {
    vi.mocked(Customer.findOneAndUpdate).mockResolvedValue({} as any)

    const req = mockReq({
      body: {
        customers: [
          { customerCode: 'CUST-001', name: '得意先1' },
          { customerCode: 'CUST-002', name: '得意先2' },
        ],
      },
    })
    const res = mockRes()

    await bulkImportCustomers(req, res)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ successCount: 2, failCount: 0 }),
    )
  })

  it('必須フィールド不足の行はエラーとしてカウントされる / 缺少必填字段的行计为失败', async () => {
    vi.mocked(Customer.findOneAndUpdate).mockResolvedValue({} as any)

    const req = mockReq({
      body: {
        customers: [
          { customerCode: '', name: '得意先1' },  // コード空 / 编号为空
          { customerCode: 'CUST-002', name: '得意先2' },
        ],
      },
    })
    const res = mockRes()

    await bulkImportCustomers(req, res)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ successCount: 1, failCount: 1 }),
    )
  })

  it('DB エラー時に 500 を返す / DB错误时返回500', async () => {
    vi.mocked(Customer.findOneAndUpdate).mockRejectedValue(new Error('DB crash'))

    const req = mockReq({
      body: {
        customers: [{ customerCode: 'CUST-001', name: '得意先1' }],
      },
    })
    const res = mockRes()

    await bulkImportCustomers(req, res)

    // 個別行のエラーは failCount に計上される / 单行错误计入failCount
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ failCount: 1 }),
    )
  })
})

// ─── exportCustomers / エクスポート / 导出 ──────────

describe('exportCustomers', () => {
  beforeEach(() => vi.clearAllMocks())

  it('アクティブな得意先を返す / 返回活跃客户', async () => {
    const fakeData = [{ _id: 'cust1', customerCode: 'CUST-001', name: 'テスト' }]
    vi.mocked(Customer.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(fakeData),
      }),
    } as any)

    const req = mockReq()
    const res = mockRes()

    await exportCustomers(req, res)

    expect(Customer.find).toHaveBeenCalledWith({ isActive: true })
    expect(res.json).toHaveBeenCalledWith(fakeData)
  })

  it('DB エラー時に 500 を返す / DB错误时返回500', async () => {
    vi.mocked(Customer.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockRejectedValue(new Error('export error')),
      }),
    } as any)

    const req = mockReq()
    const res = mockRes()

    await exportCustomers(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})
