/**
 * serialNumberController 統合テスト / SerialNumber Controller Integration Tests
 * シリアル番号コントローラの統合テスト / 序列号控制器集成测试
 *
 * シリアル番号 CRUD の HTTP フローを検証する。
 * 验证序列号 CRUD 的 HTTP 流程。
 *
 * モック方針 / Mock strategy:
 * - SerialNumber モデルをモック（DB不要）
 *   Mock SerialNumber model to eliminate DB dependency
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言（hoisted） / 模块Mock声明（提升） ──────────

vi.mock('@/models/serialNumber', () => ({
  SerialNumber: {
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    insertMany: vi.fn(),
    countDocuments: vi.fn(),
  },
}))

vi.mock('mongoose', () => {
  class ObjectId {
    value: string
    constructor(v: string) { this.value = v }
    toString() { return this.value }
  }
  return {
    default: { Types: { ObjectId } },
    Types: { ObjectId },
  }
})

import { SerialNumber } from '@/models/serialNumber'
import {
  listSerialNumbers,
  getSerialNumber,
  createSerialNumber,
  bulkCreateSerialNumbers,
  updateSerialNumber,
  updateStatus,
  getSerialNumberByCode,
} from '../serialNumberController'

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

// ─── listSerialNumbers / シリアル番号一覧 / 序列号列表 ──────────

describe('listSerialNumbers', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ページネーション付きで一覧を返す / 返回分页列表', async () => {
    const fakeData = [{ _id: 's1', serialNumber: 'SN-001' }]
    const chainMock = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(fakeData),
    }
    vi.mocked(SerialNumber.find).mockReturnValue(chainMock as any)
    vi.mocked(SerialNumber.countDocuments).mockResolvedValue(1)

    const req = mockReq({ query: { page: '1', limit: '50' } })
    const res = mockRes()

    await listSerialNumbers(req, res)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: fakeData, total: 1, page: 1, limit: 50 }),
    )
  })

  it('ステータスフィルタが適用される / 应用状态筛选', async () => {
    const chainMock = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(SerialNumber.find).mockReturnValue(chainMock as any)
    vi.mocked(SerialNumber.countDocuments).mockResolvedValue(0)

    const req = mockReq({ query: { status: 'available' } })
    const res = mockRes()

    await listSerialNumbers(req, res)

    expect(SerialNumber.find).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'available' }),
    )
  })

  it('DB エラー時に 500 を返す / DB错误时返回500', async () => {
    const chainMock = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockRejectedValue(new Error('DB down')),
    }
    vi.mocked(SerialNumber.find).mockReturnValue(chainMock as any)
    vi.mocked(SerialNumber.countDocuments).mockResolvedValue(0)

    const req = mockReq()
    const res = mockRes()

    await listSerialNumbers(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'シリアル番号一覧の取得に失敗しました' }),
    )
  })
})

// ─── getSerialNumber / シリアル番号詳細 / 序列号详情 ──────────

describe('getSerialNumber', () => {
  beforeEach(() => vi.clearAllMocks())

  it('既存シリアル番号を ID で取得する / 根据ID获取序列号', async () => {
    const fakeSerial = { _id: 's1', serialNumber: 'SN-001' }
    vi.mocked(SerialNumber.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeSerial),
    } as any)

    const req = mockReq({ params: { id: 's1' } })
    const res = mockRes()

    await getSerialNumber(req, res)

    expect(SerialNumber.findById).toHaveBeenCalledWith('s1')
    expect(res.json).toHaveBeenCalledWith(fakeSerial)
  })

  it('存在しない場合 404 を返す / 不存在时返回404', async () => {
    vi.mocked(SerialNumber.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'nonexistent' } })
    const res = mockRes()

    await getSerialNumber(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: 'シリアル番号が見つかりません' })
  })

  it('DB エラー時に 500 を返す / DB错误时返回500', async () => {
    vi.mocked(SerialNumber.findById).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('connection error')),
    } as any)

    const req = mockReq({ params: { id: 's1' } })
    const res = mockRes()

    await getSerialNumber(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── createSerialNumber / シリアル番号作成 / 创建序列号 ──────────

describe('createSerialNumber', () => {
  beforeEach(() => vi.clearAllMocks())

  it('バリデーション成功時に 201 を返す / 校验通过时返回201', async () => {
    vi.mocked(SerialNumber.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)
    const fakeCreated = { _id: 's-new', serialNumber: 'SN-NEW', productId: 'p1' }
    vi.mocked(SerialNumber.create).mockResolvedValue(fakeCreated as any)

    const req = mockReq({ body: { serialNumber: 'SN-NEW', productId: 'p1' } })
    const res = mockRes()

    await createSerialNumber(req, res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(fakeCreated)
  })

  it('必須フィールド不足で 400 を返す / 缺少必填字段返回400', async () => {
    const req = mockReq({ body: { serialNumber: 'SN-001' } }) // productId 欠落 / 缺少productId
    const res = mockRes()

    await createSerialNumber(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'serialNumber と productId は必須です' }),
    )
  })

  it('重複時に 409 を返す / 重复时返回409', async () => {
    vi.mocked(SerialNumber.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'existing', serialNumber: 'SN-DUP' }),
    } as any)

    const req = mockReq({ body: { serialNumber: 'SN-DUP', productId: 'p1' } })
    const res = mockRes()

    await createSerialNumber(req, res)

    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'この商品に同じシリアル番号が既に存在します' }),
    )
  })

  it('DB エラー時に 500 を返す / DB错误时返回500', async () => {
    vi.mocked(SerialNumber.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)
    vi.mocked(SerialNumber.create).mockRejectedValue(new Error('insert failed'))

    const req = mockReq({ body: { serialNumber: 'SN-ERR', productId: 'p1' } })
    const res = mockRes()

    await createSerialNumber(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── bulkCreateSerialNumbers / 一括作成 / 批量创建 ──────────

describe('bulkCreateSerialNumbers', () => {
  beforeEach(() => vi.clearAllMocks())

  it('配列でない場合 400 を返す / 非数组返回400', async () => {
    const req = mockReq({ body: { serialNumbers: 'not-array' } })
    const res = mockRes()

    await bulkCreateSerialNumbers(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('空配列で 400 を返す / 空数组返回400', async () => {
    const req = mockReq({ body: { serialNumbers: [] } })
    const res = mockRes()

    await bulkCreateSerialNumbers(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('バッチ内重複で 400 を返す / 批次内重复返回400', async () => {
    const req = mockReq({
      body: {
        serialNumbers: [
          { serialNumber: 'SN-1', productId: 'p1' },
          { serialNumber: 'SN-1', productId: 'p1' },
        ],
      },
    })
    const res = mockRes()

    await bulkCreateSerialNumbers(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'バッチ内に重複するシリアル番号があります' }),
    )
  })

  it('正常時に 201 で作成結果を返す / 正常时返回201', async () => {
    vi.mocked(SerialNumber.countDocuments).mockResolvedValue(0)
    const fakeCreated = [
      { _id: 's1', serialNumber: 'SN-1', productId: 'p1' },
      { _id: 's2', serialNumber: 'SN-2', productId: 'p1' },
    ]
    vi.mocked(SerialNumber.insertMany).mockResolvedValue(fakeCreated as any)

    const req = mockReq({
      body: {
        serialNumbers: [
          { serialNumber: 'SN-1', productId: 'p1' },
          { serialNumber: 'SN-2', productId: 'p1' },
        ],
      },
    })
    const res = mockRes()

    await bulkCreateSerialNumbers(req, res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ count: 2 }),
    )
  })
})

// ─── updateSerialNumber / シリアル番号更新 / 更新序列号 ──────────

describe('updateSerialNumber', () => {
  beforeEach(() => vi.clearAllMocks())

  it('存在しない場合 404 を返す / 不存在时返回404', async () => {
    vi.mocked(SerialNumber.findById).mockResolvedValue(null)

    const req = mockReq({ params: { id: 'nonexistent' }, body: {} })
    const res = mockRes()

    await updateSerialNumber(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('正常に更新する / 正常更新', async () => {
    const fakeSerial = {
      _id: 's1',
      serialNumber: 'SN-001',
      productId: 'p1',
      save: vi.fn().mockResolvedValue(undefined),
    }
    vi.mocked(SerialNumber.findById).mockResolvedValue(fakeSerial as any)

    const req = mockReq({ params: { id: 's1' }, body: { memo: 'test memo' } })
    const res = mockRes()

    await updateSerialNumber(req, res)

    expect(fakeSerial.save).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(fakeSerial)
  })

  it('DB エラー時に 500 を返す / DB错误时返回500', async () => {
    vi.mocked(SerialNumber.findById).mockRejectedValue(new Error('DB error'))

    const req = mockReq({ params: { id: 's1' }, body: {} })
    const res = mockRes()

    await updateSerialNumber(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── updateStatus / ステータス更新 / 状态更新 ──────────

describe('updateStatus', () => {
  beforeEach(() => vi.clearAllMocks())

  it('存在しない場合 404 を返す / 不存在时返回404', async () => {
    vi.mocked(SerialNumber.findById).mockResolvedValue(null)

    const req = mockReq({ params: { id: 'nonexistent' }, body: { status: 'reserved' } })
    const res = mockRes()

    await updateStatus(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('無効なステータスで 400 を返す / 无效状态返回400', async () => {
    const fakeSerial = { _id: 's1', status: 'available' }
    vi.mocked(SerialNumber.findById).mockResolvedValue(fakeSerial as any)

    const req = mockReq({ params: { id: 's1' }, body: { status: 'invalid' } })
    const res = mockRes()

    await updateStatus(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('許可されない遷移で 400 を返す / 不允许的转换返回400', async () => {
    const fakeSerial = { _id: 's1', status: 'scrapped' }
    vi.mocked(SerialNumber.findById).mockResolvedValue(fakeSerial as any)

    const req = mockReq({ params: { id: 's1' }, body: { status: 'available' } })
    const res = mockRes()

    await updateStatus(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ allowedTransitions: [] }),
    )
  })

  it('有効な遷移で正常に更新する / 有效转换正常更新', async () => {
    const fakeSerial = {
      _id: 's1',
      status: 'available',
      save: vi.fn().mockResolvedValue(undefined),
    }
    vi.mocked(SerialNumber.findById).mockResolvedValue(fakeSerial as any)

    const req = mockReq({ params: { id: 's1' }, body: { status: 'reserved' } })
    const res = mockRes()

    await updateStatus(req, res)

    expect(fakeSerial.status).toBe('reserved')
    expect(fakeSerial.save).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(fakeSerial)
  })
})

// ─── getSerialNumberByCode / コード検索 / 按编号搜索 ──────────

describe('getSerialNumberByCode', () => {
  beforeEach(() => vi.clearAllMocks())

  it('パラメータ不足で 400 を返す / 参数不足返回400', async () => {
    const req = mockReq({ query: { serialNumber: 'SN-001' } }) // productId 欠落 / 缺少productId
    const res = mockRes()

    await getSerialNumberByCode(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('見つからない場合 404 を返す / 找不到时返回404', async () => {
    vi.mocked(SerialNumber.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ query: { serialNumber: 'SN-GHOST', productId: 'p1' } })
    const res = mockRes()

    await getSerialNumberByCode(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('見つかった場合にシリアル番号を返す / 找到时返回序列号', async () => {
    const fakeSerial = { _id: 's1', serialNumber: 'SN-001', productId: 'p1' }
    vi.mocked(SerialNumber.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeSerial),
    } as any)

    const req = mockReq({ query: { serialNumber: 'SN-001', productId: 'p1' } })
    const res = mockRes()

    await getSerialNumberByCode(req, res)

    expect(res.json).toHaveBeenCalledWith(fakeSerial)
  })

  it('DB エラー時に 500 を返す / DB错误时返回500', async () => {
    vi.mocked(SerialNumber.findOne).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('find error')),
    } as any)

    const req = mockReq({ query: { serialNumber: 'SN-001', productId: 'p1' } })
    const res = mockRes()

    await getSerialNumberByCode(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})
