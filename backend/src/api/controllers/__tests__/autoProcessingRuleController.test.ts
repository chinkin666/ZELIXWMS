/**
 * autoProcessingRuleController 単体テスト / Auto Processing Rule Controller Unit Tests
 *
 * 自動処理ルールの CRUD + 並び替え + 手動実行 HTTP フローを検証する。
 * Verifies HTTP flow for auto processing rule CRUD, reorder, and manual run operations.
 *
 * モック方針 / Mock strategy:
 * - AutoProcessingRule モデルをすべてモック（DB不要）
 *   Mock AutoProcessingRule model to eliminate DB dependency
 * - autoProcessingEngine の runRuleManually もモック
 *   Mock runRuleManually from autoProcessingEngine
 * - TRIGGER_EVENTS は実際の値を使用（定数のため）
 *   Use real TRIGGER_EVENTS values (they are constants)
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言（hoisted） ──────────────────────────────
// Module mock declarations (hoisted)

vi.mock('@/models/autoProcessingRule', () => ({
  AutoProcessingRule: {
    find: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
    create: vi.fn(),
    bulkWrite: vi.fn(),
  },
  TRIGGER_EVENTS: [
    'order.created',
    'order.confirmed',
    'order.carrierReceived',
    'order.printed',
    'order.inspected',
    'order.shipped',
    'order.ecExported',
  ],
}))

vi.mock('@/services/autoProcessingEngine', () => ({
  runRuleManually: vi.fn(),
}))

import { AutoProcessingRule } from '@/models/autoProcessingRule'
import { runRuleManually } from '@/services/autoProcessingEngine'
import {
  listRules,
  getRule,
  createRule,
  updateRule,
  deleteRule,
  reorderRules,
  runRule,
} from '@/api/controllers/autoProcessingRuleController'

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

// ─── サンプルデータ / Sample data ─────────────────────────────────

const fakeRule = {
  _id: 'rule1',
  name: 'テストルール',
  enabled: true,
  triggerMode: 'auto',
  allowRerun: false,
  memo: 'メモ',
  triggerEvents: ['order.created'],
  conditions: [],
  actions: [],
  priority: 1,
}

// ─── listRules ─────────────────────────────────────────────────

describe('listRules', () => {
  beforeEach(() => vi.clearAllMocks())

  it('全ルールを優先順位順で返す / returns all rules sorted by priority', async () => {
    // Arrange / 準備
    const fakeRules = [fakeRule]
    vi.mocked(AutoProcessingRule.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(fakeRules),
      }),
    } as any)

    const req = mockReq()
    const res = mockRes()

    // Act / 実行
    await listRules(req, res)

    // Assert / 検証: find が呼ばれ、ルール一覧が返される
    // Assert: find was called and rules list is returned
    expect(AutoProcessingRule.find).toHaveBeenCalledOnce()
    expect(res.json).toHaveBeenCalledWith(fakeRules)
  })

  it('空のコレクションの場合は空配列を返す / returns empty array when collection is empty', async () => {
    // Arrange / 準備
    vi.mocked(AutoProcessingRule.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    } as any)

    const req = mockReq()
    const res = mockRes()

    // Act / 実行
    await listRules(req, res)

    // Assert / 検証
    expect(res.json).toHaveBeenCalledWith([])
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange / 準備
    vi.mocked(AutoProcessingRule.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockRejectedValue(new Error('DB connection failed')),
      }),
    } as any)

    const req = mockReq()
    const res = mockRes()

    // Act / 実行
    await listRules(req, res)

    // Assert / 検証: 500 とエラーメッセージが返される
    // Assert: 500 status with error message
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'ルールの取得に失敗しました' }),
    )
  })

  it('DB エラーオブジェクトが Error でない場合も 500 を返す / returns 500 for non-Error thrown objects', async () => {
    // Arrange / 準備
    vi.mocked(AutoProcessingRule.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockRejectedValue('string error'),
      }),
    } as any)

    const req = mockReq()
    const res = mockRes()

    // Act / 実行
    await listRules(req, res)

    // Assert / 検証
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'string error' }),
    )
  })
})

// ─── getRule ───────────────────────────────────────────────────

describe('getRule', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ID でルールを取得する / retrieves rule by ID', async () => {
    // Arrange / 準備
    vi.mocked(AutoProcessingRule.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeRule),
    } as any)

    const req = mockReq({ params: { id: 'rule1' } })
    const res = mockRes()

    // Act / 実行
    await getRule(req, res)

    // Assert / 検証
    expect(AutoProcessingRule.findById).toHaveBeenCalledWith('rule1')
    expect(res.json).toHaveBeenCalledWith(fakeRule)
  })

  it('ルールが存在しない場合 404 を返す / returns 404 when rule not found', async () => {
    // Arrange / 準備
    vi.mocked(AutoProcessingRule.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'nonexistent' } })
    const res = mockRes()

    // Act / 実行
    await getRule(req, res)

    // Assert / 検証
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: 'ルールが見つかりません' })
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange / 準備
    vi.mocked(AutoProcessingRule.findById).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('query failed')),
    } as any)

    const req = mockReq({ params: { id: 'rule1' } })
    const res = mockRes()

    // Act / 実行
    await getRule(req, res)

    // Assert / 検証
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'ルールの取得に失敗しました', error: 'query failed' }),
    )
  })
})

// ─── createRule ────────────────────────────────────────────────

describe('createRule', () => {
  beforeEach(() => vi.clearAllMocks())

  it('有効なデータでルールを作成し 201 を返す / creates rule with valid data and returns 201', async () => {
    // Arrange / 準備
    const body = {
      name: '新しいルール',
      enabled: true,
      triggerMode: 'auto',
      allowRerun: false,
      memo: 'メモ',
      triggerEvents: ['order.created'],
      conditions: [],
      actions: [],
      priority: 10,
    }
    const createdRule = { ...body, _id: 'new-rule-id', toObject: () => ({ ...body, _id: 'new-rule-id' }) }
    vi.mocked(AutoProcessingRule.create).mockResolvedValue(createdRule as any)

    const req = mockReq({ body })
    const res = mockRes()

    // Act / 実行
    await createRule(req, res)

    // Assert / 検証: 201 で作成済みルールが返される
    // Assert: returns 201 with created rule
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ name: '新しいルール' }))
  })

  it('name が空の場合 400 を返す / returns 400 when name is empty', async () => {
    // Arrange / 準備
    const req = mockReq({ body: { name: '' } })
    const res = mockRes()

    // Act / 実行
    await createRule(req, res)

    // Assert / 検証
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ message: 'ルール名は必須です' })
  })

  it('name が空白のみの場合 400 を返す / returns 400 when name is whitespace only', async () => {
    // Arrange / 準備
    const req = mockReq({ body: { name: '   ' } })
    const res = mockRes()

    // Act / 実行
    await createRule(req, res)

    // Assert / 検証
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ message: 'ルール名は必須です' })
  })

  it('name が undefined の場合 400 を返す / returns 400 when name is undefined', async () => {
    // Arrange / 準備
    const req = mockReq({ body: {} })
    const res = mockRes()

    // Act / 実行
    await createRule(req, res)

    // Assert / 検証
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('name が string でない場合 400 を返す / returns 400 when name is not a string', async () => {
    // Arrange / 準備
    const req = mockReq({ body: { name: 123 } })
    const res = mockRes()

    // Act / 実行
    await createRule(req, res)

    // Assert / 検証
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ message: 'ルール名は必須です' })
  })

  it('無効なトリガーイベントで 400 を返す / returns 400 for invalid trigger event', async () => {
    // Arrange / 準備
    const req = mockReq({ body: { name: '有効なルール', triggerEvents: ['order.invalid'] } })
    const res = mockRes()

    // Act / 実行
    await createRule(req, res)

    // Assert / 検証
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('無効なトリガーイベント') }),
    )
  })

  it('複数の無効なトリガーイベントのうち最初のものでエラーを返す / returns error for first invalid trigger event', async () => {
    // Arrange / 準備
    const req = mockReq({
      body: {
        name: 'テスト',
        triggerEvents: ['order.created', 'order.INVALID', 'order.shipped'],
      },
    })
    const res = mockRes()

    // Act / 実行
    await createRule(req, res)

    // Assert / 検証
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '無効なトリガーイベント: order.INVALID' }),
    )
  })

  it('triggerEvents が配列でない場合は空配列として扱う / treats non-array triggerEvents as empty array', async () => {
    // Arrange / 準備
    const createdRule = {
      name: 'ルール',
      triggerEvents: [],
      _id: 'r1',
      toObject: () => ({ name: 'ルール', triggerEvents: [], _id: 'r1' }),
    }
    vi.mocked(AutoProcessingRule.create).mockResolvedValue(createdRule as any)

    const req = mockReq({ body: { name: 'ルール', triggerEvents: 'order.created' } })
    const res = mockRes()

    // Act / 実行
    await createRule(req, res)

    // Assert / 検証: triggerEvents が配列でなければバリデーションをスキップして空配列で作成
    // Assert: if triggerEvents is not an array, skip validation and create with empty array
    expect(AutoProcessingRule.create).toHaveBeenCalledWith(
      expect.objectContaining({ triggerEvents: [] }),
    )
  })

  it('enabled=false でルールを無効状態で作成する / creates rule as disabled when enabled=false', async () => {
    // Arrange / 準備
    const createdRule = {
      name: 'ルール',
      enabled: false,
      _id: 'r1',
      toObject: () => ({ name: 'ルール', enabled: false, _id: 'r1' }),
    }
    vi.mocked(AutoProcessingRule.create).mockResolvedValue(createdRule as any)

    const req = mockReq({ body: { name: 'ルール', enabled: false } })
    const res = mockRes()

    // Act / 実行
    await createRule(req, res)

    // Assert / 検証
    expect(AutoProcessingRule.create).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    )
  })

  it('triggerMode=manual でマニュアルモードのルールを作成する / creates rule with manual triggerMode', async () => {
    // Arrange / 準備
    const createdRule = {
      name: 'マニュアルルール',
      triggerMode: 'manual',
      _id: 'r1',
      toObject: () => ({ name: 'マニュアルルール', triggerMode: 'manual', _id: 'r1' }),
    }
    vi.mocked(AutoProcessingRule.create).mockResolvedValue(createdRule as any)

    const req = mockReq({ body: { name: 'マニュアルルール', triggerMode: 'manual' } })
    const res = mockRes()

    // Act / 実行
    await createRule(req, res)

    // Assert / 検証
    expect(AutoProcessingRule.create).toHaveBeenCalledWith(
      expect.objectContaining({ triggerMode: 'manual' }),
    )
  })

  it('未知の triggerMode は auto として扱う / treats unknown triggerMode as auto', async () => {
    // Arrange / 準備
    const createdRule = {
      name: 'ルール',
      triggerMode: 'auto',
      _id: 'r1',
      toObject: () => ({ name: 'ルール', triggerMode: 'auto', _id: 'r1' }),
    }
    vi.mocked(AutoProcessingRule.create).mockResolvedValue(createdRule as any)

    const req = mockReq({ body: { name: 'ルール', triggerMode: 'scheduled' } })
    const res = mockRes()

    // Act / 実行
    await createRule(req, res)

    // Assert / 検証: 'scheduled' は無効なので 'auto' にフォールバック
    // Assert: 'scheduled' is invalid so falls back to 'auto'
    expect(AutoProcessingRule.create).toHaveBeenCalledWith(
      expect.objectContaining({ triggerMode: 'auto' }),
    )
  })

  it('priority が未指定の場合はデフォルト 100 を使用する / uses default priority 100 when not provided', async () => {
    // Arrange / 準備
    const createdRule = {
      name: 'ルール',
      priority: 100,
      _id: 'r1',
      toObject: () => ({ name: 'ルール', priority: 100, _id: 'r1' }),
    }
    vi.mocked(AutoProcessingRule.create).mockResolvedValue(createdRule as any)

    const req = mockReq({ body: { name: 'ルール' } })
    const res = mockRes()

    // Act / 実行
    await createRule(req, res)

    // Assert / 検証
    expect(AutoProcessingRule.create).toHaveBeenCalledWith(
      expect.objectContaining({ priority: 100 }),
    )
  })

  it('priority が数値でない場合はデフォルト 100 を使用する / uses default priority 100 when priority is not a number', async () => {
    // Arrange / 準備
    const createdRule = {
      name: 'ルール',
      priority: 100,
      _id: 'r1',
      toObject: () => ({ name: 'ルール', priority: 100, _id: 'r1' }),
    }
    vi.mocked(AutoProcessingRule.create).mockResolvedValue(createdRule as any)

    const req = mockReq({ body: { name: 'ルール', priority: 'high' } })
    const res = mockRes()

    // Act / 実行
    await createRule(req, res)

    // Assert / 検証
    expect(AutoProcessingRule.create).toHaveBeenCalledWith(
      expect.objectContaining({ priority: 100 }),
    )
  })

  it('name の前後空白はトリムされる / trims leading/trailing whitespace from name', async () => {
    // Arrange / 準備
    const createdRule = {
      name: 'ルール名',
      _id: 'r1',
      toObject: () => ({ name: 'ルール名', _id: 'r1' }),
    }
    vi.mocked(AutoProcessingRule.create).mockResolvedValue(createdRule as any)

    const req = mockReq({ body: { name: '  ルール名  ' } })
    const res = mockRes()

    // Act / 実行
    await createRule(req, res)

    // Assert / 検証: name はトリムされて保存される
    // Assert: name is trimmed before saving
    expect(AutoProcessingRule.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'ルール名' }),
    )
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange / 準備
    vi.mocked(AutoProcessingRule.create).mockRejectedValue(new Error('insert failed'))

    const req = mockReq({ body: { name: 'ルール' } })
    const res = mockRes()

    // Act / 実行
    await createRule(req, res)

    // Assert / 検証
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'ルールの作成に失敗しました', error: 'insert failed' }),
    )
  })
})

// ─── updateRule ────────────────────────────────────────────────

describe('updateRule', () => {
  beforeEach(() => vi.clearAllMocks())

  it('有効なデータでルールを更新する / updates rule with valid data', async () => {
    // Arrange / 準備
    const updatedRule = { ...fakeRule, name: '更新後ルール名' }
    vi.mocked(AutoProcessingRule.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(updatedRule),
    } as any)

    const req = mockReq({ params: { id: 'rule1' }, body: { name: '更新後ルール名' } })
    const res = mockRes()

    // Act / 実行
    await updateRule(req, res)

    // Assert / 検証
    expect(AutoProcessingRule.findByIdAndUpdate).toHaveBeenCalledWith(
      'rule1',
      expect.objectContaining({ name: '更新後ルール名' }),
      { new: true, runValidators: true },
    )
    expect(res.json).toHaveBeenCalledWith(updatedRule)
  })

  it('ルールが存在しない場合 404 を返す / returns 404 when rule not found', async () => {
    // Arrange / 準備
    vi.mocked(AutoProcessingRule.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'nonexistent' }, body: { name: '更新' } })
    const res = mockRes()

    // Act / 実行
    await updateRule(req, res)

    // Assert / 検証
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: 'ルールが見つかりません' })
  })

  it('name が空文字列の場合 400 を返す / returns 400 when name is empty string', async () => {
    // Arrange / 準備
    const req = mockReq({ params: { id: 'rule1' }, body: { name: '' } })
    const res = mockRes()

    // Act / 実行
    await updateRule(req, res)

    // Assert / 検証
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ message: 'ルール名は必須です' })
  })

  it('name が空白のみの場合 400 を返す / returns 400 when name is whitespace only', async () => {
    // Arrange / 準備
    const req = mockReq({ params: { id: 'rule1' }, body: { name: '   ' } })
    const res = mockRes()

    // Act / 実行
    await updateRule(req, res)

    // Assert / 検証
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ message: 'ルール名は必須です' })
  })

  it('無効なトリガーイベントで 400 を返す / returns 400 for invalid trigger event in update', async () => {
    // Arrange / 準備
    const req = mockReq({
      params: { id: 'rule1' },
      body: { triggerEvents: ['order.created', 'order.BOGUS'] },
    })
    const res = mockRes()

    // Act / 実行
    await updateRule(req, res)

    // Assert / 検証
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '無効なトリガーイベント: order.BOGUS' }),
    )
  })

  it('enabled フラグを更新できる / can update enabled flag', async () => {
    // Arrange / 準備
    const updatedRule = { ...fakeRule, enabled: false }
    vi.mocked(AutoProcessingRule.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(updatedRule),
    } as any)

    const req = mockReq({ params: { id: 'rule1' }, body: { enabled: false } })
    const res = mockRes()

    // Act / 実行
    await updateRule(req, res)

    // Assert / 検証
    expect(AutoProcessingRule.findByIdAndUpdate).toHaveBeenCalledWith(
      'rule1',
      expect.objectContaining({ enabled: false }),
      expect.any(Object),
    )
  })

  it('priority が数値の場合のみ更新データに含める / includes priority in update only when it is a number', async () => {
    // Arrange / 準備
    const updatedRule = { ...fakeRule, priority: 5 }
    vi.mocked(AutoProcessingRule.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(updatedRule),
    } as any)

    const req = mockReq({ params: { id: 'rule1' }, body: { priority: 5 } })
    const res = mockRes()

    // Act / 実行
    await updateRule(req, res)

    // Assert / 検証
    expect(AutoProcessingRule.findByIdAndUpdate).toHaveBeenCalledWith(
      'rule1',
      expect.objectContaining({ priority: 5 }),
      expect.any(Object),
    )
  })

  it('priority が文字列の場合は更新データに含めない / excludes priority from update when it is a string', async () => {
    // Arrange / 準備
    const updatedRule = { ...fakeRule }
    vi.mocked(AutoProcessingRule.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(updatedRule),
    } as any)

    const req = mockReq({ params: { id: 'rule1' }, body: { priority: 'high' } })
    const res = mockRes()

    // Act / 実行
    await updateRule(req, res)

    // Assert / 検証: priority が数値でなければ更新データに含まれない
    // Assert: priority is not included in update when it's not a number
    const callArgs = vi.mocked(AutoProcessingRule.findByIdAndUpdate).mock.calls[0]
    expect(callArgs[1]).not.toHaveProperty('priority')
  })

  it('triggerMode=manual を正しく設定できる / correctly sets triggerMode to manual', async () => {
    // Arrange / 準備
    const updatedRule = { ...fakeRule, triggerMode: 'manual' }
    vi.mocked(AutoProcessingRule.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(updatedRule),
    } as any)

    const req = mockReq({ params: { id: 'rule1' }, body: { triggerMode: 'manual' } })
    const res = mockRes()

    // Act / 実行
    await updateRule(req, res)

    // Assert / 検証
    expect(AutoProcessingRule.findByIdAndUpdate).toHaveBeenCalledWith(
      'rule1',
      expect.objectContaining({ triggerMode: 'manual' }),
      expect.any(Object),
    )
  })

  it('triggerEvents が配列でない場合はスキップする / skips triggerEvents update when not an array', async () => {
    // Arrange / 準備
    const updatedRule = { ...fakeRule }
    vi.mocked(AutoProcessingRule.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(updatedRule),
    } as any)

    const req = mockReq({ params: { id: 'rule1' }, body: { triggerEvents: 'order.created' } })
    const res = mockRes()

    // Act / 実行
    await updateRule(req, res)

    // Assert / 検証: 配列でないため triggerEvents は更新データに含まれない
    // Assert: triggerEvents not included in update data when not an array
    const callArgs = vi.mocked(AutoProcessingRule.findByIdAndUpdate).mock.calls[0]
    expect(callArgs[1]).not.toHaveProperty('triggerEvents')
  })

  it('memo を更新できる / can update memo field', async () => {
    // Arrange / 準備
    const updatedRule = { ...fakeRule, memo: '新しいメモ' }
    vi.mocked(AutoProcessingRule.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(updatedRule),
    } as any)

    const req = mockReq({ params: { id: 'rule1' }, body: { memo: '  新しいメモ  ' } })
    const res = mockRes()

    // Act / 実行
    await updateRule(req, res)

    // Assert / 検証: memo がトリムされて保存される
    // Assert: memo is trimmed before saving
    expect(AutoProcessingRule.findByIdAndUpdate).toHaveBeenCalledWith(
      'rule1',
      expect.objectContaining({ memo: '新しいメモ' }),
      expect.any(Object),
    )
  })

  it('memo が空文字列の場合は undefined として保存する / saves memo as undefined when empty string', async () => {
    // Arrange / 準備
    const updatedRule = { ...fakeRule, memo: undefined }
    vi.mocked(AutoProcessingRule.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(updatedRule),
    } as any)

    const req = mockReq({ params: { id: 'rule1' }, body: { memo: '   ' } })
    const res = mockRes()

    // Act / 実行
    await updateRule(req, res)

    // Assert / 検証: 空白のみのメモは undefined に変換される
    // Assert: whitespace-only memo is converted to undefined
    expect(AutoProcessingRule.findByIdAndUpdate).toHaveBeenCalledWith(
      'rule1',
      expect.objectContaining({ memo: undefined }),
      expect.any(Object),
    )
  })

  it('body が空の場合は空の更新データで呼び出す / calls with empty update data for empty body', async () => {
    // Arrange / 準備
    const updatedRule = { ...fakeRule }
    vi.mocked(AutoProcessingRule.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(updatedRule),
    } as any)

    const req = mockReq({ params: { id: 'rule1' }, body: {} })
    const res = mockRes()

    // Act / 実行
    await updateRule(req, res)

    // Assert / 検証: 空オブジェクトで更新が呼ばれる
    // Assert: update called with empty object
    expect(AutoProcessingRule.findByIdAndUpdate).toHaveBeenCalledWith('rule1', {}, expect.any(Object))
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange / 準備
    vi.mocked(AutoProcessingRule.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('update failed')),
    } as any)

    const req = mockReq({ params: { id: 'rule1' }, body: { name: '更新' } })
    const res = mockRes()

    // Act / 実行
    await updateRule(req, res)

    // Assert / 検証
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'ルールの更新に失敗しました', error: 'update failed' }),
    )
  })
})

// ─── deleteRule ────────────────────────────────────────────────

describe('deleteRule', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ルールを削除し確認メッセージを返す / deletes rule and returns confirmation message', async () => {
    // Arrange / 準備
    const deletedRule = { ...fakeRule, _id: 'rule1' }
    vi.mocked(AutoProcessingRule.findByIdAndDelete).mockReturnValue({
      lean: vi.fn().mockResolvedValue(deletedRule),
    } as any)

    const req = mockReq({ params: { id: 'rule1' } })
    const res = mockRes()

    // Act / 実行
    await deleteRule(req, res)

    // Assert / 検証: 削除確認メッセージと ID が返される
    // Assert: deletion confirmation message with ID returned
    expect(AutoProcessingRule.findByIdAndDelete).toHaveBeenCalledWith('rule1')
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'ルールを削除しました', id: 'rule1' }),
    )
  })

  it('存在しないルールの削除で 404 を返す / returns 404 when deleting non-existent rule', async () => {
    // Arrange / 準備
    vi.mocked(AutoProcessingRule.findByIdAndDelete).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'ghost-rule' } })
    const res = mockRes()

    // Act / 実行
    await deleteRule(req, res)

    // Assert / 検証
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: 'ルールが見つかりません' })
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange / 準備
    vi.mocked(AutoProcessingRule.findByIdAndDelete).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('delete failed')),
    } as any)

    const req = mockReq({ params: { id: 'rule1' } })
    const res = mockRes()

    // Act / 実行
    await deleteRule(req, res)

    // Assert / 検証
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'ルールの削除に失敗しました', error: 'delete failed' }),
    )
  })
})

// ─── reorderRules ──────────────────────────────────────────────

describe('reorderRules', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ID 配列の順序に従い優先順位を更新する / updates priorities according to ID array order', async () => {
    // Arrange / 準備
    vi.mocked(AutoProcessingRule.bulkWrite).mockResolvedValue({} as any)

    const orderedIds = ['rule3', 'rule1', 'rule2']
    const req = mockReq({ body: { orderedIds } })
    const res = mockRes()

    // Act / 実行
    await reorderRules(req, res)

    // Assert / 検証: bulkWrite に正しいインデックスベースの priority が渡される
    // Assert: bulkWrite called with correct index-based priorities
    expect(AutoProcessingRule.bulkWrite).toHaveBeenCalledWith([
      { updateOne: { filter: { _id: 'rule3' }, update: { $set: { priority: 1 } } } },
      { updateOne: { filter: { _id: 'rule1' }, update: { $set: { priority: 2 } } } },
      { updateOne: { filter: { _id: 'rule2' }, update: { $set: { priority: 3 } } } },
    ])
    expect(res.json).toHaveBeenCalledWith({ message: '優先順位を更新しました' })
  })

  it('orderedIds が空配列の場合 400 を返す / returns 400 when orderedIds is empty array', async () => {
    // Arrange / 準備
    const req = mockReq({ body: { orderedIds: [] } })
    const res = mockRes()

    // Act / 実行
    await reorderRules(req, res)

    // Assert / 検証
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ message: 'orderedIds配列は必須です' })
  })

  it('orderedIds が配列でない場合 400 を返す / returns 400 when orderedIds is not an array', async () => {
    // Arrange / 準備
    const req = mockReq({ body: { orderedIds: 'rule1,rule2' } })
    const res = mockRes()

    // Act / 実行
    await reorderRules(req, res)

    // Assert / 検証
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ message: 'orderedIds配列は必須です' })
  })

  it('orderedIds が undefined の場合 400 を返す / returns 400 when orderedIds is undefined', async () => {
    // Arrange / 準備
    const req = mockReq({ body: {} })
    const res = mockRes()

    // Act / 実行
    await reorderRules(req, res)

    // Assert / 検証
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('単一 ID でも priority=1 として正しく処理する / handles single ID correctly with priority=1', async () => {
    // Arrange / 準備
    vi.mocked(AutoProcessingRule.bulkWrite).mockResolvedValue({} as any)

    const req = mockReq({ body: { orderedIds: ['rule1'] } })
    const res = mockRes()

    // Act / 実行
    await reorderRules(req, res)

    // Assert / 検証
    expect(AutoProcessingRule.bulkWrite).toHaveBeenCalledWith([
      { updateOne: { filter: { _id: 'rule1' }, update: { $set: { priority: 1 } } } },
    ])
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange / 準備
    vi.mocked(AutoProcessingRule.bulkWrite).mockRejectedValue(new Error('bulk write failed'))

    const req = mockReq({ body: { orderedIds: ['rule1', 'rule2'] } })
    const res = mockRes()

    // Act / 実行
    await reorderRules(req, res)

    // Assert / 検証
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '優先順位の更新に失敗しました', error: 'bulk write failed' }),
    )
  })
})

// ─── runRule ───────────────────────────────────────────────────

describe('runRule', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ルールを手動実行し結果を返す / manually runs rule and returns result', async () => {
    // Arrange / 準備
    vi.mocked(AutoProcessingRule.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeRule),
    } as any)
    const runResult = { processed: 10, matched: 5, executed: 4, errors: 1 }
    vi.mocked(runRuleManually).mockResolvedValue(runResult)

    const req = mockReq({ params: { id: 'rule1' } })
    const res = mockRes()

    // Act / 実行
    await runRule(req, res)

    // Assert / 検証: ルールが取得され、runRuleManually が呼ばれ、結果が返される
    // Assert: rule is fetched, runRuleManually is called, result is returned
    expect(AutoProcessingRule.findById).toHaveBeenCalledWith('rule1')
    expect(runRuleManually).toHaveBeenCalledWith(fakeRule)
    expect(res.json).toHaveBeenCalledWith({
      message: '手動実行が完了しました',
      data: runResult,
    })
  })

  it('ルールが存在しない場合 404 を返す / returns 404 when rule not found', async () => {
    // Arrange / 準備
    vi.mocked(AutoProcessingRule.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'nonexistent' } })
    const res = mockRes()

    // Act / 実行
    await runRule(req, res)

    // Assert / 検証: 404 が返され、runRuleManually は呼ばれない
    // Assert: 404 returned and runRuleManually is never called
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: 'ルールが見つかりません' })
    expect(runRuleManually).not.toHaveBeenCalled()
  })

  it('runRuleManually がエラーを投げた場合 500 を返す / returns 500 when runRuleManually throws', async () => {
    // Arrange / 準備
    vi.mocked(AutoProcessingRule.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeRule),
    } as any)
    vi.mocked(runRuleManually).mockRejectedValue(new Error('execution error'))

    const req = mockReq({ params: { id: 'rule1' } })
    const res = mockRes()

    // Act / 実行
    await runRule(req, res)

    // Assert / 検証
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '手動実行に失敗しました', error: 'execution error' }),
    )
  })

  it('findById の DB エラー時に 500 を返す / returns 500 when findById throws DB error', async () => {
    // Arrange / 準備
    vi.mocked(AutoProcessingRule.findById).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('DB connection lost')),
    } as any)

    const req = mockReq({ params: { id: 'rule1' } })
    const res = mockRes()

    // Act / 実行
    await runRule(req, res)

    // Assert / 検証
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '手動実行に失敗しました', error: 'DB connection lost' }),
    )
  })

  it('実行結果がゼロ件でも正常レスポンスを返す / returns successful response even with zero processed orders', async () => {
    // Arrange / 準備
    vi.mocked(AutoProcessingRule.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeRule),
    } as any)
    const emptyResult = { processed: 0, matched: 0, executed: 0, errors: 0 }
    vi.mocked(runRuleManually).mockResolvedValue(emptyResult)

    const req = mockReq({ params: { id: 'rule1' } })
    const res = mockRes()

    // Act / 実行
    await runRule(req, res)

    // Assert / 検証: 処理ゼロでも成功レスポンス
    // Assert: successful response even with zero processed
    expect(res.json).toHaveBeenCalledWith({
      message: '手動実行が完了しました',
      data: emptyResult,
    })
    expect(res.status).not.toHaveBeenCalled()
  })
})
