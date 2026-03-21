/**
 * formTemplateController 统合テスト / Form Template Controller Integration Tests
 *
 * FormTemplate モデル層を通じた帳票テンプレート CRUD 操作の HTTP フローを検証する。
 * Verifies HTTP flow for form template CRUD operations through the model layer.
 *
 * モック方針 / Mock strategy:
 * - FormTemplate モデルをすべてモック（DB不要）
 *   Mock FormTemplate model to eliminate DB dependency
 * - next() はエラーコールバックとして検証する
 *   next() is verified as an error callback
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言（hoisted） ──────────────────────────────
// Module mock declarations (hoisted)

vi.mock('@/models/formTemplate', () => ({
  FormTemplate: {
    find: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
  },
}))

import { FormTemplate } from '@/models/formTemplate'
import {
  listFormTemplates,
  getFormTemplate,
  createFormTemplate,
  updateFormTemplate,
  deleteFormTemplate,
} from '@/api/controllers/formTemplateController'

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
 * json(), status(), send() をスパイとして持つオブジェクト
 * Object with json(), status(), send() as spies
 */
const mockRes = () => {
  const res: any = { json: vi.fn(), status: vi.fn(), send: vi.fn() }
  // status().json() / status().send() チェーンを可能にする / Enable chaining
  res.status.mockReturnValue(res)
  return res
}

/** モック next 関数 / Mock next function */
const mockNext = () => vi.fn()

// ─── サンプルデータ / Sample data ─────────────────────────────────

/** 帳票テンプレートのサンプルドキュメント / Sample form template document */
const sampleRawDoc = {
  _id: { toString: () => 'tpl-1' },
  tenantId: 'default',
  name: 'ピッキングリスト / Picking List',
  targetType: 'shipment-list-picking',
  columns: [
    { id: 'col-1', type: 'single', label: '商品コード', field: 'sku', order: 0, renderType: 'text' },
  ],
  styles: { fontSize: 9, headerBgColor: '#2a3474' },
  pageSize: 'A4',
  pageOrientation: 'landscape',
  pageMargins: [40, 40, 40, 40],
  headerFooterItems: [],
  isDefault: false,
  createdAt: { toISOString: () => '2026-01-01T00:00:00.000Z' },
  updatedAt: { toISOString: () => '2026-01-02T00:00:00.000Z' },
}

// ─── listFormTemplates ─────────────────────────────────────────

describe('listFormTemplates', () => {
  beforeEach(() => vi.clearAllMocks())

  it('tenantId なしの場合 default テナントで全テンプレートを返す / returns all templates using default tenantId when none provided', async () => {
    // Arrange
    const fakeDocs = [sampleRawDoc]
    vi.mocked(FormTemplate.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(fakeDocs) }),
    } as any)

    const req = mockReq({ query: {} })
    const res = mockRes()
    const next = mockNext()

    // Act
    await listFormTemplates(req, res, next)

    // Assert: default テナントでクエリ / queried with default tenant
    expect(FormTemplate.find).toHaveBeenCalledWith({ tenantId: 'default' })
    expect(res.json).toHaveBeenCalledOnce()
    const result = vi.mocked(res.json).mock.calls[0][0]
    expect(result).toHaveLength(1)
    expect(result[0]._id).toBe('tpl-1')
  })

  it('tenantId クエリが指定された場合そのテナントでフィルタする / filters by tenantId when provided as query param', async () => {
    // Arrange
    vi.mocked(FormTemplate.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
    } as any)

    const req = mockReq({ query: { tenantId: 'tenant-X' } })
    const res = mockRes()
    const next = mockNext()

    // Act
    await listFormTemplates(req, res, next)

    // Assert: 指定テナントでクエリ / queried with specified tenant
    expect(FormTemplate.find).toHaveBeenCalledWith({ tenantId: 'tenant-X' })
  })

  it('targetType クエリが指定された場合さらにフィルタする / applies targetType filter when provided', async () => {
    // Arrange
    vi.mocked(FormTemplate.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
    } as any)

    const req = mockReq({ query: { targetType: 'shipment-list-picking' } })
    const res = mockRes()
    const next = mockNext()

    // Act
    await listFormTemplates(req, res, next)

    // Assert: targetType もフィルタに含まれる / targetType included in filter
    expect(FormTemplate.find).toHaveBeenCalledWith({
      tenantId: 'default',
      targetType: 'shipment-list-picking',
    })
  })

  it('targetType なしの場合クエリに含まれない / targetType not included in query when not provided', async () => {
    // Arrange
    vi.mocked(FormTemplate.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
    } as any)

    const req = mockReq({ query: {} })
    const res = mockRes()
    const next = mockNext()

    // Act
    await listFormTemplates(req, res, next)

    // Assert: targetType がクエリにない / targetType absent from query
    const callArg = vi.mocked(FormTemplate.find).mock.calls[0][0] as Record<string, unknown>
    expect(callArg).not.toHaveProperty('targetType')
  })

  it('ソート順が正しく指定される / sort order is specified correctly', async () => {
    // Arrange
    const sortSpy = vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) })
    vi.mocked(FormTemplate.find).mockReturnValue({ sort: sortSpy } as any)

    const req = mockReq({ query: {} })
    const res = mockRes()
    const next = mockNext()

    // Act
    await listFormTemplates(req, res, next)

    // Assert: targetType → isDefault 降順 → name のソート / sort by targetType, isDefault desc, name
    expect(sortSpy).toHaveBeenCalledWith({ targetType: 1, isDefault: -1, name: 1 })
  })

  it('toDoc 変換でデフォルト値が補完される / toDoc fills defaults when fields are missing', async () => {
    // Arrange
    const minimalDoc = {
      _id: 'tpl-min',
      tenantId: 'default',
      name: '最小テンプレート / Minimal',
      targetType: 'test',
      // columns, styles, pageSize, etc. are intentionally omitted
    }
    vi.mocked(FormTemplate.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([minimalDoc]) }),
    } as any)

    const req = mockReq({ query: {} })
    const res = mockRes()
    const next = mockNext()

    // Act
    await listFormTemplates(req, res, next)

    // Assert: デフォルト値が設定される / defaults are applied
    const result = vi.mocked(res.json).mock.calls[0][0][0]
    expect(result.columns).toEqual([])
    expect(result.styles).toEqual({})
    expect(result.pageSize).toBe('A4')
    expect(result.pageOrientation).toBe('landscape')
    expect(result.pageMargins).toEqual([40, 40, 40, 40])
    expect(result.headerFooterItems).toEqual([])
    expect(result.isDefault).toBe(false)
  })

  it('DB エラー時に next にエラーを渡す / passes error to next on DB error', async () => {
    // Arrange
    const dbError = new Error('DB connection lost')
    vi.mocked(FormTemplate.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({ lean: vi.fn().mockRejectedValue(dbError) }),
    } as any)

    const req = mockReq({ query: {} })
    const res = mockRes()
    const next = mockNext()

    // Act
    await listFormTemplates(req, res, next)

    // Assert: next にエラーが渡される / error passed to next
    expect(next).toHaveBeenCalledWith(dbError)
    expect(res.json).not.toHaveBeenCalled()
  })
})

// ─── getFormTemplate ────────────────────────────────────────────

describe('getFormTemplate', () => {
  beforeEach(() => vi.clearAllMocks())

  it('既存テンプレートを ID で取得して toDoc 変換する / retrieves and converts existing template by ID', async () => {
    // Arrange
    vi.mocked(FormTemplate.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(sampleRawDoc),
    } as any)

    const req = mockReq({ params: { id: 'tpl-1' } })
    const res = mockRes()
    const next = mockNext()

    // Act
    await getFormTemplate(req, res, next)

    // Assert
    expect(FormTemplate.findById).toHaveBeenCalledWith('tpl-1')
    const result = vi.mocked(res.json).mock.calls[0][0]
    expect(result._id).toBe('tpl-1')
    expect(result.name).toBe('ピッキングリスト / Picking List')
    expect(result.createdAt).toBe('2026-01-01T00:00:00.000Z')
  })

  it('存在しない ID の場合 404 を返す / returns 404 when template not found', async () => {
    // Arrange
    vi.mocked(FormTemplate.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'nonexistent' } })
    const res = mockRes()
    const next = mockNext()

    // Act
    await getFormTemplate(req, res, next)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: 'Form template not found' })
    expect(next).not.toHaveBeenCalled()
  })

  it('DB エラー時に next にエラーを渡す / passes error to next on DB error', async () => {
    // Arrange
    const dbError = new Error('query failed')
    vi.mocked(FormTemplate.findById).mockReturnValue({
      lean: vi.fn().mockRejectedValue(dbError),
    } as any)

    const req = mockReq({ params: { id: 'tpl-1' } })
    const res = mockRes()
    const next = mockNext()

    // Act
    await getFormTemplate(req, res, next)

    // Assert: エラーが next に渡される / error forwarded to next
    expect(next).toHaveBeenCalledWith(dbError)
    expect(res.json).not.toHaveBeenCalled()
  })
})

// ─── createFormTemplate ────────────────────────────────────────

describe('createFormTemplate', () => {
  beforeEach(() => vi.clearAllMocks())

  /** 作成されたドキュメントのモック / Mock created document */
  const makeCreatedDoc = (overrides = {}) => ({
    ...sampleRawDoc,
    ...overrides,
    toObject: () => ({ ...sampleRawDoc, ...overrides }),
  })

  it('isDefault=false の場合 updateMany を呼ばずにテンプレートを作成する / creates template without calling updateMany when isDefault=false', async () => {
    // Arrange
    const dto = {
      name: '新テンプレート / New Template',
      targetType: 'shipment-list-picking',
      columns: [],
      isDefault: false,
    }
    vi.mocked(FormTemplate.create).mockResolvedValue(makeCreatedDoc() as any)

    const req = mockReq({ body: dto })
    const res = mockRes()
    const next = mockNext()

    // Act
    await createFormTemplate(req, res, next)

    // Assert: updateMany は呼ばれない / updateMany not called
    expect(FormTemplate.updateMany).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledOnce()
  })

  it('isDefault=true の場合既存デフォルトを解除する / unsets existing defaults when isDefault=true', async () => {
    // Arrange
    const dto = {
      name: 'デフォルトテンプレート / Default Template',
      targetType: 'shipment-list-picking',
      columns: [],
      isDefault: true,
    }
    vi.mocked(FormTemplate.updateMany).mockResolvedValue({ modifiedCount: 1 } as any)
    vi.mocked(FormTemplate.create).mockResolvedValue(makeCreatedDoc({ isDefault: true }) as any)

    const req = mockReq({ body: dto })
    const res = mockRes()
    const next = mockNext()

    // Act
    await createFormTemplate(req, res, next)

    // Assert: 同テナント・同 targetType の既存デフォルトを解除 / unsets defaults for same tenant & targetType
    expect(FormTemplate.updateMany).toHaveBeenCalledWith(
      { tenantId: 'default', targetType: 'shipment-list-picking', isDefault: true },
      { $set: { isDefault: false } },
    )
    expect(res.status).toHaveBeenCalledWith(201)
  })

  it('tenantId が body にある場合それを使用する / uses tenantId from body when provided', async () => {
    // Arrange
    const dto = { name: 'T', targetType: 'test', columns: [], tenantId: 'tenant-ABC' }
    vi.mocked(FormTemplate.create).mockResolvedValue(makeCreatedDoc({ tenantId: 'tenant-ABC' }) as any)

    const req = mockReq({ body: dto })
    const res = mockRes()
    const next = mockNext()

    // Act
    await createFormTemplate(req, res, next)

    // Assert: 指定テナントで作成 / created with specified tenant
    expect(FormTemplate.create).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-ABC' }),
    )
  })

  it('tenantId が body にない場合 default を使用する / falls back to "default" tenantId when not in body', async () => {
    // Arrange
    const dto = { name: 'T', targetType: 'test', columns: [] }
    vi.mocked(FormTemplate.create).mockResolvedValue(makeCreatedDoc() as any)

    const req = mockReq({ body: dto })
    const res = mockRes()
    const next = mockNext()

    // Act
    await createFormTemplate(req, res, next)

    // Assert: default テナントで作成 / created with default tenant
    expect(FormTemplate.create).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'default' }),
    )
  })

  it('作成結果を 201 で返す / returns 201 with created document', async () => {
    // Arrange
    const dto = { name: '帳票 / Form', targetType: 'shipment-detail-list', columns: [] }
    const createdDoc = makeCreatedDoc({ name: '帳票 / Form', targetType: 'shipment-detail-list' })
    vi.mocked(FormTemplate.create).mockResolvedValue(createdDoc as any)

    const req = mockReq({ body: dto })
    const res = mockRes()
    const next = mockNext()

    // Act
    await createFormTemplate(req, res, next)

    // Assert: 201 で toDoc 変換済みの結果を返す / returns toDoc-converted result with 201
    expect(res.status).toHaveBeenCalledWith(201)
    const result = vi.mocked(res.json).mock.calls[0][0]
    expect(result).toHaveProperty('_id')
    expect(result).toHaveProperty('tenantId')
  })

  it('DB エラー時に next にエラーを渡す / passes error to next on DB error', async () => {
    // Arrange
    const dbError = new Error('write failed')
    vi.mocked(FormTemplate.create).mockRejectedValue(dbError)

    const req = mockReq({ body: { name: 'T', targetType: 'test', columns: [] } })
    const res = mockRes()
    const next = mockNext()

    // Act
    await createFormTemplate(req, res, next)

    // Assert
    expect(next).toHaveBeenCalledWith(dbError)
    expect(res.status).not.toHaveBeenCalled()
  })
})

// ─── updateFormTemplate ────────────────────────────────────────

describe('updateFormTemplate', () => {
  beforeEach(() => vi.clearAllMocks())

  it('既存テンプレートを正常に更新する / updates existing template successfully', async () => {
    // Arrange
    const existingDoc = {
      _id: 'tpl-1',
      tenantId: 'default',
      targetType: 'shipment-list-picking',
      isDefault: false,
    }
    const updatedRaw = { ...sampleRawDoc, name: '更新後名称 / Updated Name' }
    vi.mocked(FormTemplate.findById).mockResolvedValue(existingDoc as any)
    vi.mocked(FormTemplate.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(updatedRaw),
    } as any)

    const req = mockReq({ params: { id: 'tpl-1' }, body: { name: '更新後名称 / Updated Name' } })
    const res = mockRes()
    const next = mockNext()

    // Act
    await updateFormTemplate(req, res, next)

    // Assert: $set で更新 / updated with $set
    expect(FormTemplate.findByIdAndUpdate).toHaveBeenCalledWith(
      'tpl-1',
      { $set: { name: '更新後名称 / Updated Name' } },
      { new: true },
    )
    expect(res.json).toHaveBeenCalledOnce()
    const result = vi.mocked(res.json).mock.calls[0][0]
    expect(result).toHaveProperty('_id', 'tpl-1')
  })

  it('isDefault=true の場合他のデフォルトを解除する / unsets other defaults when isDefault=true', async () => {
    // Arrange
    const existingDoc = {
      _id: 'tpl-1',
      tenantId: 'tenant-Y',
      targetType: 'shipment-list-picking',
      isDefault: false,
    }
    vi.mocked(FormTemplate.findById).mockResolvedValue(existingDoc as any)
    vi.mocked(FormTemplate.updateMany).mockResolvedValue({ modifiedCount: 2 } as any)
    vi.mocked(FormTemplate.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(sampleRawDoc),
    } as any)

    const req = mockReq({ params: { id: 'tpl-1' }, body: { isDefault: true } })
    const res = mockRes()
    const next = mockNext()

    // Act
    await updateFormTemplate(req, res, next)

    // Assert: 同テナント・同 targetType の他のドキュメントのデフォルトを解除 / unsets other defaults
    expect(FormTemplate.updateMany).toHaveBeenCalledWith(
      {
        tenantId: 'tenant-Y',
        targetType: 'shipment-list-picking',
        isDefault: true,
        _id: { $ne: 'tpl-1' },
      },
      { $set: { isDefault: false } },
    )
  })

  it('isDefault=true で dto.targetType がある場合それを優先する / uses dto.targetType over existing when present', async () => {
    // Arrange
    const existingDoc = {
      _id: 'tpl-2',
      tenantId: 'default',
      targetType: 'old-type',
      isDefault: false,
    }
    vi.mocked(FormTemplate.findById).mockResolvedValue(existingDoc as any)
    vi.mocked(FormTemplate.updateMany).mockResolvedValue({ modifiedCount: 0 } as any)
    vi.mocked(FormTemplate.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(sampleRawDoc),
    } as any)

    const req = mockReq({
      params: { id: 'tpl-2' },
      body: { isDefault: true, targetType: 'new-type' },
    })
    const res = mockRes()
    const next = mockNext()

    // Act
    await updateFormTemplate(req, res, next)

    // Assert: dto の targetType が使われる / dto targetType is used
    expect(FormTemplate.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ targetType: 'new-type' }),
      { $set: { isDefault: false } },
    )
  })

  it('isDefault=false の場合 updateMany を呼ばない / does not call updateMany when isDefault is falsy', async () => {
    // Arrange
    const existingDoc = { _id: 'tpl-1', tenantId: 'default', targetType: 'test', isDefault: true }
    vi.mocked(FormTemplate.findById).mockResolvedValue(existingDoc as any)
    vi.mocked(FormTemplate.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(sampleRawDoc),
    } as any)

    const req = mockReq({ params: { id: 'tpl-1' }, body: { name: '変更のみ / Name only' } })
    const res = mockRes()
    const next = mockNext()

    // Act
    await updateFormTemplate(req, res, next)

    // Assert: updateMany は呼ばれない / updateMany not called
    expect(FormTemplate.updateMany).not.toHaveBeenCalled()
  })

  it('既存テンプレートが存在しない場合 404 を返す / returns 404 when template not found by ID', async () => {
    // Arrange
    vi.mocked(FormTemplate.findById).mockResolvedValue(null as any)

    const req = mockReq({ params: { id: 'ghost' }, body: { name: '存在しない' } })
    const res = mockRes()
    const next = mockNext()

    // Act
    await updateFormTemplate(req, res, next)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: 'Form template not found' })
    expect(FormTemplate.findByIdAndUpdate).not.toHaveBeenCalled()
  })

  it('findByIdAndUpdate が null を返す場合 404 を返す / returns 404 when findByIdAndUpdate returns null', async () => {
    // Arrange
    const existingDoc = { _id: 'tpl-1', tenantId: 'default', targetType: 'test', isDefault: false }
    vi.mocked(FormTemplate.findById).mockResolvedValue(existingDoc as any)
    vi.mocked(FormTemplate.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'tpl-1' }, body: { name: 'test' } })
    const res = mockRes()
    const next = mockNext()

    // Act
    await updateFormTemplate(req, res, next)

    // Assert: 2 回目の 404 チェック / second 404 check
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: 'Form template not found' })
  })

  it('DB エラー時に next にエラーを渡す / passes error to next on DB error', async () => {
    // Arrange
    const dbError = new Error('update failed')
    vi.mocked(FormTemplate.findById).mockRejectedValue(dbError)

    const req = mockReq({ params: { id: 'tpl-1' }, body: { name: 'test' } })
    const res = mockRes()
    const next = mockNext()

    // Act
    await updateFormTemplate(req, res, next)

    // Assert
    expect(next).toHaveBeenCalledWith(dbError)
    expect(res.json).not.toHaveBeenCalled()
  })
})

// ─── deleteFormTemplate ────────────────────────────────────────

describe('deleteFormTemplate', () => {
  beforeEach(() => vi.clearAllMocks())

  it('テンプレートを削除し 204 を返す / deletes template and returns 204', async () => {
    // Arrange
    vi.mocked(FormTemplate.findByIdAndDelete).mockResolvedValue(sampleRawDoc as any)

    const req = mockReq({ params: { id: 'tpl-1' } })
    const res = mockRes()
    const next = mockNext()

    // Act
    await deleteFormTemplate(req, res, next)

    // Assert: 204 No Content / 204 response
    expect(FormTemplate.findByIdAndDelete).toHaveBeenCalledWith('tpl-1')
    expect(res.status).toHaveBeenCalledWith(204)
    expect(res.send).toHaveBeenCalled()
    expect(res.json).not.toHaveBeenCalled()
  })

  it('存在しないテンプレートの削除で 404 を返す / returns 404 when deleting non-existent template', async () => {
    // Arrange
    vi.mocked(FormTemplate.findByIdAndDelete).mockResolvedValue(null as any)

    const req = mockReq({ params: { id: 'ghost-tpl' } })
    const res = mockRes()
    const next = mockNext()

    // Act
    await deleteFormTemplate(req, res, next)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: 'Form template not found' })
  })

  it('DB エラー時に next にエラーを渡す / passes error to next on DB error', async () => {
    // Arrange
    const dbError = new Error('delete operation failed')
    vi.mocked(FormTemplate.findByIdAndDelete).mockRejectedValue(dbError)

    const req = mockReq({ params: { id: 'tpl-1' } })
    const res = mockRes()
    const next = mockNext()

    // Act
    await deleteFormTemplate(req, res, next)

    // Assert: next にエラーが渡される / error forwarded to next
    expect(next).toHaveBeenCalledWith(dbError)
    expect(res.status).not.toHaveBeenCalled()
  })
})

// ─── toDoc 変換（エッジケース） / toDoc conversion edge cases ─────

describe('toDoc conversion (via listFormTemplates)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('createdAt/updatedAt が文字列の場合そのまま使用される / uses string dates as-is when no toISOString method', async () => {
    // Arrange
    const docWithStringDates = {
      _id: 'tpl-str',
      tenantId: 'default',
      name: '日付テスト / Date Test',
      targetType: 'test',
      createdAt: '2026-01-01T00:00:00.000Z',  // already a string
      updatedAt: '2026-01-02T00:00:00.000Z',  // already a string
    }
    vi.mocked(FormTemplate.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([docWithStringDates]) }),
    } as any)

    const req = mockReq({ query: {} })
    const res = mockRes()
    const next = mockNext()

    // Act
    await listFormTemplates(req, res, next)

    // Assert: 文字列日付はそのまま渡される / string dates passed through unchanged
    const result = vi.mocked(res.json).mock.calls[0][0][0]
    expect(result.createdAt).toBe('2026-01-01T00:00:00.000Z')
    expect(result.updatedAt).toBe('2026-01-02T00:00:00.000Z')
  })

  it('_id が文字列の場合そのまま使用される / uses _id as-is when already a string', async () => {
    // Arrange
    const docWithStringId = { ...sampleRawDoc, _id: 'string-id-123' }
    vi.mocked(FormTemplate.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([docWithStringId]) }),
    } as any)

    const req = mockReq({ query: {} })
    const res = mockRes()
    const next = mockNext()

    // Act
    await listFormTemplates(req, res, next)

    // Assert: 文字列 _id はそのまま / string _id used as-is
    const result = vi.mocked(res.json).mock.calls[0][0][0]
    expect(result._id).toBe('string-id-123')
  })

  it('空のテンプレートリストを返す / returns empty array when no templates exist', async () => {
    // Arrange
    vi.mocked(FormTemplate.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
    } as any)

    const req = mockReq({ query: {} })
    const res = mockRes()
    const next = mockNext()

    // Act
    await listFormTemplates(req, res, next)

    // Assert
    expect(res.json).toHaveBeenCalledWith([])
  })
})
