/**
 * fbaBoxController 単元テスト / fbaBoxController 单元测试
 *
 * FBA 箱管理 CRUD + seal + validate のテスト
 * FBA箱管理 CRUD + 封箱 + 校验测试
 *
 * モック方針 / Mock strategy:
 * - FbaBox モデル + getTenantId + validateFbaBox をモック
 *   Mock FbaBox model + getTenantId + validateFbaBox
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言（hoisted） / 模块Mock声明（提升） ──────────

vi.mock('@/models/fbaBox', () => ({
  FbaBox: {
    find: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn(),
  },
  validateFbaBox: vi.fn(),
}))

vi.mock('@/api/helpers/tenantHelper', () => ({
  getTenantId: vi.fn(),
}))

// ─── インポート / 导入 ──────────

import { FbaBox, validateFbaBox } from '@/models/fbaBox'
import { getTenantId } from '@/api/helpers/tenantHelper'
import { listBoxes, createBox, updateBox, deleteBox, sealBox, validateBoxes } from '../fbaBoxController'

// ─── テストユーティリティ / 测试工具 ────────────────────────

const mockReq = (overrides = {}) =>
  ({
    query: {},
    params: {},
    body: {},
    headers: { 'x-tenant-id': 'T1' },
    user: { id: 'u1', tenantId: 'T1' },
    ...overrides,
  }) as any

const mockRes = () => {
  const res: any = { json: vi.fn(), status: vi.fn() }
  res.status.mockReturnValue(res)
  return res
}

// ─── listBoxes テスト / listBoxes 测试 ──────────

describe('listBoxes / 箱一覧取得 / 获取箱列表', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // 正常系: 箱一覧返却 / 正常情况：返回箱列表
  it('テナントの箱一覧を返す / 返回租户的箱列表', async () => {
    vi.mocked(getTenantId).mockReturnValue('T1')
    const boxes = [{ boxNumber: 'BOX-0001', status: 'packing' }]
    vi.mocked(FbaBox.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(boxes) }),
    } as any)

    const req = mockReq()
    const res = mockRes()
    await listBoxes(req, res)

    expect(res.json).toHaveBeenCalledWith({ data: boxes, total: 1 })
  })

  // 正常系: inboundOrderId フィルター / 正常情况：inboundOrderId过滤
  it('inboundOrderId でフィルターする / 使用inboundOrderId过滤', async () => {
    vi.mocked(getTenantId).mockReturnValue('T1')
    vi.mocked(FbaBox.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
    } as any)

    const req = mockReq({ query: { inboundOrderId: 'inb-001' } })
    const res = mockRes()
    await listBoxes(req, res)

    expect(FbaBox.find).toHaveBeenCalledWith({ tenantId: 'T1', inboundOrderId: 'inb-001' })
  })

  // 異常系: エラー → 500 / 异常情况：错误 → 500
  it('エラー時に 500 を返す / 错误时返回500', async () => {
    vi.mocked(getTenantId).mockImplementation(() => { throw new Error('Tenant error') })

    const req = mockReq()
    const res = mockRes()
    await listBoxes(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── createBox テスト / createBox 测试 ──────────

describe('createBox / 箱作成 / 创建箱', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // 正常系: 箱作成 / 正常情况：创建箱
  it('新しい箱を作成して 201 を返す / 创建新箱返回201', async () => {
    vi.mocked(getTenantId).mockReturnValue('T1')
    vi.mocked(FbaBox.countDocuments).mockResolvedValue(0)
    const createdBox = {
      _id: 'box1',
      boxNumber: 'BOX-0001',
      status: 'packing',
      tenantId: 'T1',
      toObject: vi.fn().mockReturnValue({ _id: 'box1', boxNumber: 'BOX-0001', status: 'packing' }),
    }
    vi.mocked(FbaBox.create).mockResolvedValue(createdBox as any)

    const req = mockReq({ body: { inboundOrderId: 'inb-001' } })
    const res = mockRes()
    await createBox(req, res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ boxNumber: 'BOX-0001' }))
  })

  // 正常系: カスタム boxNumber / 正常情况：自定义boxNumber
  it('body で指定された boxNumber を使用する / 使用body中指定的boxNumber', async () => {
    vi.mocked(getTenantId).mockReturnValue('T1')
    vi.mocked(FbaBox.countDocuments).mockResolvedValue(0)
    const createdBox = {
      toObject: vi.fn().mockReturnValue({ boxNumber: 'CUSTOM-001' }),
    }
    vi.mocked(FbaBox.create).mockResolvedValue(createdBox as any)

    const req = mockReq({ body: { boxNumber: 'CUSTOM-001', inboundOrderId: 'inb-001' } })
    const res = mockRes()
    await createBox(req, res)

    expect(res.status).toHaveBeenCalledWith(201)
  })

  // 異常系: DB エラー → 500 / 异常情况：DB错误 → 500
  it('DB エラー時に 500 を返す / DB错误时返回500', async () => {
    vi.mocked(getTenantId).mockReturnValue('T1')
    vi.mocked(FbaBox.countDocuments).mockResolvedValue(0)
    vi.mocked(FbaBox.create).mockRejectedValue(new Error('Create failed'))

    const req = mockReq({ body: { inboundOrderId: 'inb-001' } })
    const res = mockRes()
    await createBox(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── updateBox テスト / updateBox 测试 ──────────

describe('updateBox / 箱更新 / 更新箱', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // 正常系: 更新成功 / 正常情况：更新成功
  it('箱を更新して返す / 更新箱并返回', async () => {
    const updated = { _id: 'box1', boxNumber: 'BOX-0001', status: 'packing' }
    vi.mocked(FbaBox.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(updated),
    } as any)

    const req = mockReq({ params: { id: 'box1' }, body: { status: 'sealed' } })
    const res = mockRes()
    await updateBox(req, res)

    expect(res.json).toHaveBeenCalledWith(updated)
  })

  // 異常系: 箱が見つからない → 404 / 异常情况：箱未找到 → 404
  it('箱が見つからない場合 404 を返す / 箱未找到时返回404', async () => {
    vi.mocked(FbaBox.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'nonexistent' } })
    const res = mockRes()
    await updateBox(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
  })
})

// ─── deleteBox テスト / deleteBox 测试 ──────────

describe('deleteBox / 箱削除 / 删除箱', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // 正常系: 削除成功 / 正常情况：删除成功
  it('箱を削除して Deleted メッセージを返す / 删除箱并返回Deleted消息', async () => {
    vi.mocked(FbaBox.findByIdAndDelete).mockResolvedValue({ _id: 'box1' } as any)

    const req = mockReq({ params: { id: 'box1' } })
    const res = mockRes()
    await deleteBox(req, res)

    expect(res.json).toHaveBeenCalledWith({ message: 'Deleted' })
  })

  // 異常系: 箱が見つからない → 404 / 异常情况：箱未找到 → 404
  it('箱が見つからない場合 404 を返す / 箱未找到时返回404', async () => {
    vi.mocked(FbaBox.findByIdAndDelete).mockResolvedValue(null)

    const req = mockReq({ params: { id: 'nonexistent' } })
    const res = mockRes()
    await deleteBox(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
  })
})

// ─── sealBox テスト / sealBox 测试 ──────────

describe('sealBox / 箱封印 / 封箱', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // 正常系: 封印成功 / 正常情况：封箱成功
  it('箱を sealed に更新する / 将箱更新为sealed状态', async () => {
    const sealed = { _id: 'box1', status: 'sealed', sealedAt: new Date(), sealedBy: 'user1' }
    vi.mocked(FbaBox.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(sealed),
    } as any)

    const req = mockReq({ params: { id: 'box1' }, body: { sealedBy: 'user1', photoUrl: 'http://photo.jpg' } })
    const res = mockRes()
    await sealBox(req, res)

    expect(res.json).toHaveBeenCalledWith(sealed)
  })

  // 異常系: 箱が見つからない → 404 / 异常情况：箱未找到 → 404
  it('箱が見つからない場合 404 を返す / 箱未找到时返回404', async () => {
    vi.mocked(FbaBox.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'nonexistent' }, body: {} })
    const res = mockRes()
    await sealBox(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
  })
})

// ─── validateBoxes テスト / validateBoxes 测试 ──────────

describe('validateBoxes / 箱検証 / 箱校验', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // 正常系: 全箱 valid / 正常情况：所有箱有效
  it('全箱 valid の場合 allValid: true を返す / 所有箱有效时返回allValid: true', async () => {
    vi.mocked(getTenantId).mockReturnValue('T1')
    const boxes = [{ boxNumber: 'BOX-0001' }, { boxNumber: 'BOX-0002' }]
    vi.mocked(FbaBox.find).mockReturnValue({ lean: vi.fn().mockResolvedValue(boxes) } as any)
    vi.mocked(validateFbaBox).mockReturnValue({ valid: true, errors: [] })

    const req = mockReq({ params: { inboundOrderId: 'inb-001' } })
    const res = mockRes()
    await validateBoxes(req, res)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ allValid: true, totalBoxes: 2 }),
    )
  })

  // 正常系: 一部無効 / 正常情况：部分无效
  it('無効な箱がある場合 allValid: false を返す / 有无效箱时返回allValid: false', async () => {
    vi.mocked(getTenantId).mockReturnValue('T1')
    const boxes = [{ boxNumber: 'BOX-0001' }]
    vi.mocked(FbaBox.find).mockReturnValue({ lean: vi.fn().mockResolvedValue(boxes) } as any)
    vi.mocked(validateFbaBox).mockReturnValue({ valid: false, errors: ['Weight exceeds limit'] })

    const req = mockReq({ params: { inboundOrderId: 'inb-001' } })
    const res = mockRes()
    await validateBoxes(req, res)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ allValid: false }),
    )
  })

  // 異常系: エラー → 500 / 异常情况：错误 → 500
  it('エラー時に 500 を返す / 错误时返回500', async () => {
    vi.mocked(getTenantId).mockReturnValue('T1')
    vi.mocked(FbaBox.find).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('DB error')),
    } as any)

    const req = mockReq({ params: { inboundOrderId: 'inb-001' } })
    const res = mockRes()
    await validateBoxes(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})
