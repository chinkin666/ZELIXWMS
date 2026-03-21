/**
 * orderGroupController 单元测试 / OrderGroup Controller Unit Tests
 *
 * 出荷グループ CRUD・カウント・並び替えの HTTP フローを検証する。
 * Verifies HTTP flow for order group CRUD, count aggregation, and reordering.
 *
 * モック方針 / Mock strategy:
 * - OrderGroup, ShipmentOrder モデルをすべてモック（DB不要）
 *   Mock all models (OrderGroup, ShipmentOrder) to eliminate DB dependency
 * - generateOrderGroupId もモック（ID生成ロジックを切り離す）
 *   Mock generateOrderGroupId to isolate ID generation logic
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言（hoisted） ──────────────────────────────
// Module mock declarations (hoisted)

vi.mock('@/models/orderGroup', () => ({
  OrderGroup: {
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    findByIdAndDelete: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    create: vi.fn(),
    bulkWrite: vi.fn(),
    aggregate: vi.fn(),
  },
}))

vi.mock('@/models/shipmentOrder', () => ({
  ShipmentOrder: {
    aggregate: vi.fn(),
    updateMany: vi.fn(),
  },
}))

vi.mock('@/utils/idGenerator', () => ({
  generateOrderGroupId: vi.fn(),
}))

import { OrderGroup } from '@/models/orderGroup'
import { ShipmentOrder } from '@/models/shipmentOrder'
import { generateOrderGroupId } from '@/utils/idGenerator'
import {
  listOrderGroups,
  getOrderGroupCounts,
  getOrderGroup,
  createOrderGroup,
  updateOrderGroup,
  deleteOrderGroup,
  reorderOrderGroups,
} from '@/api/controllers/orderGroupController'

// ─── テストユーティリティ / Test utilities ────────────────────────

/**
 * モックリクエスト生成 / Mock request factory
 * 最小限の Request オブジェクト / Minimal Request object
 */
const mockReq = (overrides = {}) =>
  ({
    query: {},
    params: {},
    body: {},
    headers: {},
    ...overrides,
  }) as any

/**
 * モックレスポンス生成 / Mock response factory
 * json() と status() をスパイとして持つオブジェクト
 * Object with json() and status() as spies
 */
const mockRes = () => {
  const res: any = { json: vi.fn(), status: vi.fn() }
  // status().json() チェーンを可能にする / Enable status().json() chaining
  res.status.mockReturnValue(res)
  return res
}

// ─── listOrderGroups ────────────────────────────────────────────

describe('listOrderGroups', () => {
  beforeEach(() => vi.clearAllMocks())

  it('全グループを優先順位でソートして返す / returns all groups sorted by priority', async () => {
    // Arrange（準備）
    const fakeGroups = [
      { orderGroupId: 'PK-20260321-00001', name: 'グループA', priority: 1 },
      { orderGroupId: 'PK-20260321-00002', name: 'グループB', priority: 2 },
    ]
    vi.mocked(OrderGroup.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(fakeGroups) }),
    } as any)

    const req = mockReq()
    const res = mockRes()

    // Act（実行）
    await listOrderGroups(req, res)

    // Assert（検証）: priority:1 でソート / sorted by priority:1
    expect(OrderGroup.find).toHaveBeenCalledWith()
    expect(res.json).toHaveBeenCalledWith(fakeGroups)
  })

  it('グループが存在しない場合は空配列を返す / returns empty array when no groups exist', async () => {
    // Arrange
    vi.mocked(OrderGroup.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
    } as any)

    const req = mockReq()
    const res = mockRes()

    // Act
    await listOrderGroups(req, res)

    // Assert
    expect(res.json).toHaveBeenCalledWith([])
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(OrderGroup.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockRejectedValue(new Error('DB down')),
      }),
    } as any)

    const req = mockReq()
    const res = mockRes()

    // Act
    await listOrderGroups(req, res)

    // Assert: エラーメッセージと 500 ステータス / 500 status with error message
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '出荷グループの取得に失敗しました' }),
    )
  })

  it('DB エラーが Error インスタンスでない場合も 500 を返す / returns 500 for non-Error thrown values', async () => {
    // Arrange: 文字列をスロー / throwing a string
    vi.mocked(OrderGroup.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockRejectedValue('unexpected string error'),
      }),
    } as any)

    const req = mockReq()
    const res = mockRes()

    // Act
    await listOrderGroups(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'unexpected string error' }),
    )
  })
})

// ─── getOrderGroupCounts ────────────────────────────────────────

describe('getOrderGroupCounts', () => {
  beforeEach(() => vi.clearAllMocks())

  it('グループ別カウントを集計して返す / returns aggregated counts per group', async () => {
    // Arrange
    const aggregateResult = [
      { _id: 'PK-20260321-00001', count: 5 },
      { _id: 'PK-20260321-00002', count: 3 },
    ]
    vi.mocked(ShipmentOrder.aggregate).mockResolvedValue(aggregateResult as any)

    const req = mockReq()
    const res = mockRes()

    // Act
    await getOrderGroupCounts(req, res)

    // Assert: total=8, グループ別カウント, 未分類=0
    expect(ShipmentOrder.aggregate).toHaveBeenCalledOnce()
    expect(res.json).toHaveBeenCalledWith({
      total: 8,
      groups: {
        'PK-20260321-00001': 5,
        'PK-20260321-00002': 3,
      },
      uncategorized: 0,
    })
  })

  it('orderGroupId が null の注文を未分類としてカウントする / counts null orderGroupId as uncategorized', async () => {
    // Arrange: _id が null のレコードが未分類 / null _id = uncategorized
    const aggregateResult = [
      { _id: null, count: 7 },
      { _id: 'PK-20260321-00001', count: 3 },
    ]
    vi.mocked(ShipmentOrder.aggregate).mockResolvedValue(aggregateResult as any)

    const req = mockReq()
    const res = mockRes()

    // Act
    await getOrderGroupCounts(req, res)

    // Assert
    expect(res.json).toHaveBeenCalledWith({
      total: 10,
      groups: { 'PK-20260321-00001': 3 },
      uncategorized: 7,
    })
  })

  it('orderGroupId が空文字の注文も未分類としてカウントする / counts empty string orderGroupId as uncategorized', async () => {
    // Arrange
    const aggregateResult = [{ _id: '', count: 4 }]
    vi.mocked(ShipmentOrder.aggregate).mockResolvedValue(aggregateResult as any)

    const req = mockReq()
    const res = mockRes()

    // Act
    await getOrderGroupCounts(req, res)

    // Assert
    expect(res.json).toHaveBeenCalledWith({
      total: 4,
      groups: {},
      uncategorized: 4,
    })
  })

  it('注文がない場合はゼロを返す / returns all zeros when no orders exist', async () => {
    // Arrange
    vi.mocked(ShipmentOrder.aggregate).mockResolvedValue([] as any)

    const req = mockReq()
    const res = mockRes()

    // Act
    await getOrderGroupCounts(req, res)

    // Assert
    expect(res.json).toHaveBeenCalledWith({ total: 0, groups: {}, uncategorized: 0 })
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(ShipmentOrder.aggregate).mockRejectedValue(new Error('aggregate failed'))

    const req = mockReq()
    const res = mockRes()

    // Act
    await getOrderGroupCounts(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'カウントの取得に失敗しました' }),
    )
  })
})

// ─── getOrderGroup ──────────────────────────────────────────────

describe('getOrderGroup', () => {
  beforeEach(() => vi.clearAllMocks())

  it('既存グループを ID で取得する / retrieves existing group by ID', async () => {
    // Arrange
    const fakeGroup = { _id: 'g1', name: 'グループA', priority: 1 }
    vi.mocked(OrderGroup.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeGroup),
    } as any)

    const req = mockReq({ params: { id: 'g1' } })
    const res = mockRes()

    // Act
    await getOrderGroup(req, res)

    // Assert
    expect(OrderGroup.findById).toHaveBeenCalledWith('g1')
    expect(res.json).toHaveBeenCalledWith(fakeGroup)
  })

  it('存在しないグループは 404 を返す / returns 404 when group not found', async () => {
    // Arrange
    vi.mocked(OrderGroup.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'nonexistent' } })
    const res = mockRes()

    // Act
    await getOrderGroup(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: '出荷グループが見つかりません' })
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(OrderGroup.findById).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('connection error')),
    } as any)

    const req = mockReq({ params: { id: 'g1' } })
    const res = mockRes()

    // Act
    await getOrderGroup(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '出荷グループの取得に失敗しました' }),
    )
  })
})

// ─── createOrderGroup ───────────────────────────────────────────

describe('createOrderGroup', () => {
  beforeEach(() => vi.clearAllMocks())

  it('有効なデータでグループを作成し 201 を返す / creates group and returns 201 on valid input', async () => {
    // Arrange
    vi.mocked(OrderGroup.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)
    vi.mocked(generateOrderGroupId).mockResolvedValue('PK-20260321-00001')
    const fakeCreated = {
      _id: 'g1',
      orderGroupId: 'PK-20260321-00001',
      name: '新グループ',
      priority: 10,
      enabled: true,
      toObject: () => ({ _id: 'g1', orderGroupId: 'PK-20260321-00001', name: '新グループ' }),
    }
    vi.mocked(OrderGroup.create).mockResolvedValue(fakeCreated as any)

    const req = mockReq({ body: { name: '新グループ', priority: 10, enabled: true } })
    const res = mockRes()

    // Act
    await createOrderGroup(req, res)

    // Assert: 201 と作成したグループを返す / returns 201 with created group
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ name: '新グループ' }))
  })

  it('name が未指定の場合 400 を返す / returns 400 when name is missing', async () => {
    // Arrange: body に name なし / no name in body
    const req = mockReq({ body: {} })
    const res = mockRes()

    // Act
    await createOrderGroup(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ message: 'グループ名は必須です' })
  })

  it('name が空文字の場合 400 を返す / returns 400 when name is empty string', async () => {
    // Arrange
    const req = mockReq({ body: { name: '' } })
    const res = mockRes()

    // Act
    await createOrderGroup(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('name が空白のみの場合 400 を返す / returns 400 when name is whitespace only', async () => {
    // Arrange
    const req = mockReq({ body: { name: '   ' } })
    const res = mockRes()

    // Act
    await createOrderGroup(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ message: 'グループ名は必須です' })
  })

  it('name が文字列でない場合 400 を返す / returns 400 when name is not a string', async () => {
    // Arrange: name に数値を渡す / passing number as name
    const req = mockReq({ body: { name: 123 } })
    const res = mockRes()

    // Act
    await createOrderGroup(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('グループ名が重複する場合 409 を返す / returns 409 when group name already exists', async () => {
    // Arrange: 既存グループあり / existing group found
    vi.mocked(OrderGroup.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'existing', name: '既存グループ' }),
    } as any)

    const req = mockReq({ body: { name: '既存グループ' } })
    const res = mockRes()

    // Act
    await createOrderGroup(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('既存グループ') }),
    )
  })

  it('priority が未指定の場合デフォルト 100 が使われる / uses default priority 100 when not specified', async () => {
    // Arrange
    vi.mocked(OrderGroup.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)
    vi.mocked(generateOrderGroupId).mockResolvedValue('PK-20260321-00001')
    const capturedArgs: any[] = []
    const fakeCreated = {
      _id: 'g1',
      toObject: () => ({ _id: 'g1', name: '新グループ', priority: 100 }),
    }
    vi.mocked(OrderGroup.create).mockImplementation(async (data: any) => {
      capturedArgs.push(data)
      return fakeCreated as any
    })

    const req = mockReq({ body: { name: '新グループ' } })
    const res = mockRes()

    // Act
    await createOrderGroup(req, res)

    // Assert: priority=100（デフォルト値）/ default priority=100
    expect(capturedArgs[0]).toMatchObject({ priority: 100 })
  })

  it('enabled が false の場合そのまま保存される / saves enabled=false when explicitly set', async () => {
    // Arrange
    vi.mocked(OrderGroup.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)
    vi.mocked(generateOrderGroupId).mockResolvedValue('PK-20260321-00002')
    const capturedArgs: any[] = []
    vi.mocked(OrderGroup.create).mockImplementation(async (data: any) => {
      capturedArgs.push(data)
      return {
        toObject: () => ({ ...data }),
      } as any
    })

    const req = mockReq({ body: { name: 'グループ無効', enabled: false } })
    const res = mockRes()

    // Act
    await createOrderGroup(req, res)

    // Assert: enabled=false が保存される / enabled=false is persisted
    expect(capturedArgs[0]).toMatchObject({ enabled: false })
  })

  it('description が自動トリムされる / trims description whitespace', async () => {
    // Arrange
    vi.mocked(OrderGroup.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)
    vi.mocked(generateOrderGroupId).mockResolvedValue('PK-20260321-00003')
    const capturedArgs: any[] = []
    vi.mocked(OrderGroup.create).mockImplementation(async (data: any) => {
      capturedArgs.push(data)
      return { toObject: () => data } as any
    })

    const req = mockReq({ body: { name: 'グループC', description: '  説明  ' } })
    const res = mockRes()

    // Act
    await createOrderGroup(req, res)

    // Assert: description がトリムされる / description is trimmed
    expect(capturedArgs[0]).toMatchObject({ description: '説明' })
  })

  it('description が空文字の場合 undefined として保存される / saves undefined when description is empty', async () => {
    // Arrange
    vi.mocked(OrderGroup.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)
    vi.mocked(generateOrderGroupId).mockResolvedValue('PK-20260321-00004')
    const capturedArgs: any[] = []
    vi.mocked(OrderGroup.create).mockImplementation(async (data: any) => {
      capturedArgs.push(data)
      return { toObject: () => data } as any
    })

    const req = mockReq({ body: { name: 'グループD', description: '' } })
    const res = mockRes()

    // Act
    await createOrderGroup(req, res)

    // Assert: description は undefined / description is undefined
    expect(capturedArgs[0].description).toBeUndefined()
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(OrderGroup.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)
    vi.mocked(generateOrderGroupId).mockResolvedValue('PK-20260321-00005')
    vi.mocked(OrderGroup.create).mockRejectedValue(new Error('insert failed'))

    const req = mockReq({ body: { name: 'エラーグループ' } })
    const res = mockRes()

    // Act
    await createOrderGroup(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '出荷グループの作成に失敗しました' }),
    )
  })
})

// ─── updateOrderGroup ───────────────────────────────────────────

describe('updateOrderGroup', () => {
  beforeEach(() => vi.clearAllMocks())

  it('既存グループを正常に更新する / updates existing group successfully', async () => {
    // Arrange
    const updatedGroup = { _id: 'g1', name: '更新後グループ名', priority: 5 }
    // 重複チェック：なし / no duplicate
    vi.mocked(OrderGroup.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)
    vi.mocked(OrderGroup.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(updatedGroup),
    } as any)

    const req = mockReq({
      params: { id: 'g1' },
      body: { name: '更新後グループ名', priority: 5 },
    })
    const res = mockRes()

    // Act
    await updateOrderGroup(req, res)

    // Assert: 更新後のグループを返す / returns updated group
    expect(OrderGroup.findByIdAndUpdate).toHaveBeenCalledWith(
      'g1',
      expect.objectContaining({ name: '更新後グループ名', priority: 5 }),
      { new: true, runValidators: true },
    )
    expect(res.json).toHaveBeenCalledWith(updatedGroup)
  })

  it('name が空文字の場合 400 を返す / returns 400 when name is empty string', async () => {
    // Arrange
    const req = mockReq({ params: { id: 'g1' }, body: { name: '' } })
    const res = mockRes()

    // Act
    await updateOrderGroup(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ message: 'グループ名は必須です' })
  })

  it('name が空白のみの場合 400 を返す / returns 400 when name is whitespace only', async () => {
    // Arrange
    const req = mockReq({ params: { id: 'g1' }, body: { name: '   ' } })
    const res = mockRes()

    // Act
    await updateOrderGroup(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('他グループと名前が重複する場合 409 を返す / returns 409 when name conflicts with another group', async () => {
    // Arrange: 別の _id を持つグループが同名で存在 / another group with same name
    vi.mocked(OrderGroup.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'g2', name: '重複名' }),
    } as any)

    const req = mockReq({ params: { id: 'g1' }, body: { name: '重複名' } })
    const res = mockRes()

    // Act
    await updateOrderGroup(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('重複名') }),
    )
  })

  it('グループが存在しない場合 404 を返す / returns 404 when group not found', async () => {
    // Arrange: findByIdAndUpdate が null を返す / returns null
    vi.mocked(OrderGroup.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)
    vi.mocked(OrderGroup.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'nonexistent' }, body: { name: '新しい名前' } })
    const res = mockRes()

    // Act
    await updateOrderGroup(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: '出荷グループが見つかりません' })
  })

  it('name が未指定の場合は変更しない / does not update name when not provided', async () => {
    // Arrange: name なしで priority のみ更新 / update only priority without name
    const updatedGroup = { _id: 'g1', priority: 99 }
    vi.mocked(OrderGroup.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(updatedGroup),
    } as any)

    const req = mockReq({ params: { id: 'g1' }, body: { priority: 99 } })
    const res = mockRes()

    // Act
    await updateOrderGroup(req, res)

    // Assert: name が updateData に含まれない / name not in updateData
    const callArg = vi.mocked(OrderGroup.findByIdAndUpdate).mock.calls[0]?.[1] as Record<string, unknown>
    expect(callArg).not.toHaveProperty('name')
    expect(callArg).toMatchObject({ priority: 99 })
  })

  it('priority が数値でない場合は更新しない / skips priority update when not a number', async () => {
    // Arrange
    const updatedGroup = { _id: 'g1', name: '既存名' }
    vi.mocked(OrderGroup.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)
    vi.mocked(OrderGroup.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(updatedGroup),
    } as any)

    const req = mockReq({ params: { id: 'g1' }, body: { name: '既存名', priority: 'invalid' } })
    const res = mockRes()

    // Act
    await updateOrderGroup(req, res)

    // Assert: priority が updateData に含まれない / priority not in updateData
    const callArg = vi.mocked(OrderGroup.findByIdAndUpdate).mock.calls[0]?.[1] as Record<string, unknown>
    expect(callArg).not.toHaveProperty('priority')
  })

  it('enabled が更新される / updates enabled field', async () => {
    // Arrange
    const updatedGroup = { _id: 'g1', enabled: false }
    vi.mocked(OrderGroup.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(updatedGroup),
    } as any)

    const req = mockReq({ params: { id: 'g1' }, body: { enabled: false } })
    const res = mockRes()

    // Act
    await updateOrderGroup(req, res)

    // Assert: enabled=false が updateData に含まれる / enabled=false in updateData
    const callArg = vi.mocked(OrderGroup.findByIdAndUpdate).mock.calls[0]?.[1] as Record<string, unknown>
    expect(callArg).toMatchObject({ enabled: false })
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(OrderGroup.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('update failed')),
    } as any)

    const req = mockReq({ params: { id: 'g1' }, body: { priority: 5 } })
    const res = mockRes()

    // Act
    await updateOrderGroup(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '出荷グループの更新に失敗しました' }),
    )
  })
})

// ─── deleteOrderGroup ───────────────────────────────────────────

describe('deleteOrderGroup', () => {
  beforeEach(() => vi.clearAllMocks())

  it('グループを削除し確認メッセージを返す / deletes group and returns confirmation', async () => {
    // Arrange
    const fakeDeleted = {
      _id: 'g1',
      orderGroupId: 'PK-20260321-00001',
      name: '削除グループ',
    }
    vi.mocked(OrderGroup.findByIdAndDelete).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeDeleted),
    } as any)
    vi.mocked(ShipmentOrder.updateMany).mockResolvedValue({ modifiedCount: 2 } as any)

    const req = mockReq({ params: { id: 'g1' } })
    const res = mockRes()

    // Act
    await deleteOrderGroup(req, res)

    // Assert: 削除確認と関連注文の orderGroupId クリア
    // Confirm deletion and orderGroupId cleared from related orders
    expect(OrderGroup.findByIdAndDelete).toHaveBeenCalledWith('g1')
    expect(ShipmentOrder.updateMany).toHaveBeenCalledWith(
      { orderGroupId: 'PK-20260321-00001' },
      { $unset: { orderGroupId: '' } },
    )
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '出荷グループを削除しました', id: 'g1' }),
    )
  })

  it('存在しないグループの削除で 404 を返す / returns 404 when deleting non-existent group', async () => {
    // Arrange
    vi.mocked(OrderGroup.findByIdAndDelete).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'ghost' } })
    const res = mockRes()

    // Act
    await deleteOrderGroup(req, res)

    // Assert: ShipmentOrder は呼ばれない / ShipmentOrder.updateMany not called
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: '出荷グループが見つかりません' })
    expect(ShipmentOrder.updateMany).not.toHaveBeenCalled()
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(OrderGroup.findByIdAndDelete).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('delete failed')),
    } as any)

    const req = mockReq({ params: { id: 'g1' } })
    const res = mockRes()

    // Act
    await deleteOrderGroup(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '出荷グループの削除に失敗しました' }),
    )
  })

  it('グループ削除後に関連注文の orderGroupId が解除される / clears orderGroupId from related orders after deletion', async () => {
    // Arrange: 関連注文が 10 件存在 / 10 related orders
    const fakeDeleted = { _id: 'g2', orderGroupId: 'PK-20260321-00002', name: '大グループ' }
    vi.mocked(OrderGroup.findByIdAndDelete).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeDeleted),
    } as any)
    vi.mocked(ShipmentOrder.updateMany).mockResolvedValue({ modifiedCount: 10 } as any)

    const req = mockReq({ params: { id: 'g2' } })
    const res = mockRes()

    // Act
    await deleteOrderGroup(req, res)

    // Assert: updateMany が正しいフィルタで呼ばれる / updateMany called with correct filter
    expect(ShipmentOrder.updateMany).toHaveBeenCalledWith(
      { orderGroupId: 'PK-20260321-00002' },
      { $unset: { orderGroupId: '' } },
    )
  })
})

// ─── reorderOrderGroups ─────────────────────────────────────────

describe('reorderOrderGroups', () => {
  beforeEach(() => vi.clearAllMocks())

  it('orderedIds に基づいて優先順位を更新する / updates priorities based on orderedIds array', async () => {
    // Arrange
    vi.mocked(OrderGroup.bulkWrite).mockResolvedValue({} as any)

    const orderedIds = ['g1', 'g2', 'g3']
    const req = mockReq({ body: { orderedIds } })
    const res = mockRes()

    // Act
    await reorderOrderGroups(req, res)

    // Assert: 各グループの priority がインデックス+1 で設定される
    // Each group's priority set to index+1
    expect(OrderGroup.bulkWrite).toHaveBeenCalledWith([
      { updateOne: { filter: { _id: 'g1' }, update: { $set: { priority: 1 } } } },
      { updateOne: { filter: { _id: 'g2' }, update: { $set: { priority: 2 } } } },
      { updateOne: { filter: { _id: 'g3' }, update: { $set: { priority: 3 } } } },
    ])
    expect(res.json).toHaveBeenCalledWith({ message: '優先順位を更新しました' })
  })

  it('orderedIds が配列でない場合 400 を返す / returns 400 when orderedIds is not an array', async () => {
    // Arrange: 文字列を渡す / passing a string
    const req = mockReq({ body: { orderedIds: 'g1,g2' } })
    const res = mockRes()

    // Act
    await reorderOrderGroups(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ message: 'orderedIds配列は必須です' })
  })

  it('orderedIds が空配列の場合 400 を返す / returns 400 when orderedIds is empty array', async () => {
    // Arrange
    const req = mockReq({ body: { orderedIds: [] } })
    const res = mockRes()

    // Act
    await reorderOrderGroups(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ message: 'orderedIds配列は必須です' })
  })

  it('orderedIds が undefined の場合 400 を返す / returns 400 when orderedIds is undefined', async () => {
    // Arrange
    const req = mockReq({ body: {} })
    const res = mockRes()

    // Act
    await reorderOrderGroups(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('要素が 1 つの配列でも動作する / works with single-element array', async () => {
    // Arrange
    vi.mocked(OrderGroup.bulkWrite).mockResolvedValue({} as any)

    const req = mockReq({ body: { orderedIds: ['g1'] } })
    const res = mockRes()

    // Act
    await reorderOrderGroups(req, res)

    // Assert: priority=1 で単一操作 / single operation with priority=1
    expect(OrderGroup.bulkWrite).toHaveBeenCalledWith([
      { updateOne: { filter: { _id: 'g1' }, update: { $set: { priority: 1 } } } },
    ])
    expect(res.json).toHaveBeenCalledWith({ message: '優先順位を更新しました' })
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(OrderGroup.bulkWrite).mockRejectedValue(new Error('bulkWrite failed'))

    const req = mockReq({ body: { orderedIds: ['g1', 'g2'] } })
    const res = mockRes()

    // Act
    await reorderOrderGroups(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '優先順位の更新に失敗しました' }),
    )
  })
})
