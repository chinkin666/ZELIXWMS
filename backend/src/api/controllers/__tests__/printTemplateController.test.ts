/**
 * printTemplateController 単体テスト / Print Template Controller Unit Tests
 *
 * 印刷テンプレート操作のHTTPフローをサービス層モックで検証する。
 * Verifies HTTP flow for print template CRUD operations using mocked service layer.
 *
 * モック方針 / Mock strategy:
 * - printTemplateService の全エクスポート関数をモック（DB不要）
 *   Mock all exported functions of printTemplateService (no DB needed)
 * - mongoose の ObjectId バリデーションのためモジュールをモック
 *   Mock mongoose module for ObjectId validation
 * - logger は副作用のためモック
 *   Mock logger to suppress side effects
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言（hoisted） ──────────────────────────────
// Module mock declarations (hoisted)

vi.mock('@/services/printTemplateService', () => ({
  createPrintTemplate: vi.fn(),
  listPrintTemplates: vi.fn(),
  getPrintTemplateById: vi.fn(),
  updatePrintTemplate: vi.fn(),
  deletePrintTemplate: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

vi.mock('mongoose', async (importOriginal) => {
  const actual = await importOriginal<typeof import('mongoose')>()
  return {
    ...actual,
    default: {
      ...actual.default,
      Types: {
        ObjectId: {
          isValid: vi.fn(),
        },
      },
    },
    Types: {
      ObjectId: {
        isValid: vi.fn(),
      },
    },
  }
})

import mongoose from 'mongoose'
import {
  createPrintTemplate,
  listPrintTemplates,
  getPrintTemplateById,
  updatePrintTemplate,
  deletePrintTemplate,
} from '@/services/printTemplateService'
import {
  createTemplate,
  listTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
} from '@/api/controllers/printTemplateController'

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
 * Object with json(), status(), and send() as spies
 */
const mockRes = () => {
  const res: any = {
    json: vi.fn(),
    status: vi.fn(),
    send: vi.fn(),
  }
  // status().json() および status().send() チェーンを可能にする
  // Enable status().json() and status().send() chaining
  res.status.mockReturnValue(res)
  return res
}

// 有効な MongoDB ObjectId / Valid MongoDB ObjectId
const VALID_ID = '507f1f77bcf86cd799439011'

// ─── createTemplate ─────────────────────────────────────────────

describe('createTemplate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(mongoose.Types.ObjectId.isValid).mockReturnValue(true)
  })

  it('有効な入力でテンプレートを作成し 201 を返す / creates template and returns 201 on valid input', async () => {
    // Arrange
    const dto = {
      name: 'テストテンプレート',
      canvas: { width: 100, height: 100 },
      elements: [{ type: 'text', value: 'hello' }],
    }
    const fakeCreated = { _id: VALID_ID, ...dto }
    vi.mocked(createPrintTemplate).mockResolvedValue(fakeCreated as any)

    const req = mockReq({ body: dto })
    const res = mockRes()

    // Act
    await createTemplate(req, res)

    // Assert: 201 で作成したテンプレートを返す / returns created template with 201
    expect(createPrintTemplate).toHaveBeenCalledWith(dto)
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(fakeCreated)
  })

  it('name がない場合 400 を返す / returns 400 when name is missing', async () => {
    // Arrange
    const req = mockReq({
      body: { canvas: { width: 100, height: 100 }, elements: [] },
    })
    const res = mockRes()

    // Act
    await createTemplate(req, res)

    // Assert: バリデーションエラー / validation error
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Invalid request') }),
    )
    expect(createPrintTemplate).not.toHaveBeenCalled()
  })

  it('canvas がない場合 400 を返す / returns 400 when canvas is missing', async () => {
    // Arrange
    const req = mockReq({
      body: { name: 'テンプレート', elements: [] },
    })
    const res = mockRes()

    // Act
    await createTemplate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(createPrintTemplate).not.toHaveBeenCalled()
  })

  it('elements が配列でない場合 400 を返す / returns 400 when elements is not an array', async () => {
    // Arrange
    const req = mockReq({
      body: { name: 'テンプレート', canvas: {}, elements: 'not-an-array' },
    })
    const res = mockRes()

    // Act
    await createTemplate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(createPrintTemplate).not.toHaveBeenCalled()
  })

  it('空の body で 400 を返す / returns 400 on empty body', async () => {
    // Arrange
    const req = mockReq({ body: {} })
    const res = mockRes()

    // Act
    await createTemplate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('null body で 400 を返す / returns 400 on null body', async () => {
    // Arrange
    const req = mockReq({ body: null })
    const res = mockRes()

    // Act
    await createTemplate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('referenceImageData が 5MB を超える場合 400 を返す / returns 400 when referenceImageData exceeds 5MB', async () => {
    // Arrange — 5MB + 1 byte の文字列 / string of 5MB + 1 byte
    const oversizedData = 'x'.repeat(5 * 1024 * 1024 + 1)
    const req = mockReq({
      body: {
        name: 'テンプレート',
        canvas: {},
        elements: [],
        referenceImageData: oversizedData,
      },
    })
    const res = mockRes()

    // Act
    await createTemplate(req, res)

    // Assert: 画像サイズ超過エラー / image size exceeded error
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('参考画像') }),
    )
    expect(createPrintTemplate).not.toHaveBeenCalled()
  })

  it('referenceImageData がちょうど 5MB の場合は許可する / allows referenceImageData exactly 5MB', async () => {
    // Arrange — ちょうど 5MB の文字列 / exactly 5MB string
    const exactSizeData = 'x'.repeat(5 * 1024 * 1024)
    const dto = {
      name: 'テンプレート',
      canvas: {},
      elements: [],
      referenceImageData: exactSizeData,
    }
    const fakeCreated = { _id: VALID_ID, ...dto }
    vi.mocked(createPrintTemplate).mockResolvedValue(fakeCreated as any)

    const req = mockReq({ body: dto })
    const res = mockRes()

    // Act
    await createTemplate(req, res)

    // Assert: 5MB はちょうど境界値なので通過する / exactly 5MB passes boundary check
    expect(res.status).toHaveBeenCalledWith(201)
  })

  it('elements が空配列でも作成できる / creates template with empty elements array', async () => {
    // Arrange
    const dto = { name: 'テンプレート', canvas: {}, elements: [] }
    const fakeCreated = { _id: VALID_ID, ...dto }
    vi.mocked(createPrintTemplate).mockResolvedValue(fakeCreated as any)

    const req = mockReq({ body: dto })
    const res = mockRes()

    // Act
    await createTemplate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(201)
    expect(createPrintTemplate).toHaveBeenCalledWith(dto)
  })

  it('サービスエラー時に 500 を返す / returns 500 when service throws', async () => {
    // Arrange
    const dto = { name: 'テンプレート', canvas: {}, elements: [] }
    vi.mocked(createPrintTemplate).mockRejectedValue(new Error('DB connection failed'))

    const req = mockReq({ body: dto })
    const res = mockRes()

    // Act
    await createTemplate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Failed to create print template' }),
    )
  })
})

// ─── listTemplates ───────────────────────────────────────────────

describe('listTemplates', () => {
  beforeEach(() => vi.clearAllMocks())

  it('フィルタなしで全テンプレートを返す / returns all templates without filters', async () => {
    // Arrange
    const fakeItems = [
      { _id: VALID_ID, name: 'テンプレートA' },
      { _id: '507f1f77bcf86cd799439012', name: 'テンプレートB' },
    ]
    vi.mocked(listPrintTemplates).mockResolvedValue(fakeItems as any)

    const req = mockReq({ query: {} })
    const res = mockRes()

    // Act
    await listTemplates(req, res)

    // Assert: name フィルタなしで呼ばれる / called without name filter
    expect(listPrintTemplates).toHaveBeenCalledWith({ name: undefined })
    expect(res.json).toHaveBeenCalledWith(fakeItems)
  })

  it('name クエリパラメータでフィルタリングする / filters by name query parameter', async () => {
    // Arrange
    const fakeItems = [{ _id: VALID_ID, name: '出荷ラベル' }]
    vi.mocked(listPrintTemplates).mockResolvedValue(fakeItems as any)

    const req = mockReq({ query: { name: '出荷ラベル' } })
    const res = mockRes()

    // Act
    await listTemplates(req, res)

    // Assert: name フィルタが渡される / name filter passed to service
    expect(listPrintTemplates).toHaveBeenCalledWith({ name: '出荷ラベル' })
    expect(res.json).toHaveBeenCalledWith(fakeItems)
  })

  it('name クエリが配列の場合は undefined として扱う / treats array name query as undefined', async () => {
    // Arrange
    vi.mocked(listPrintTemplates).mockResolvedValue([] as any)

    // Express では同名クエリが複数あると配列になる
    // Express treats duplicate query params as array
    const req = mockReq({ query: { name: ['ラベルA', 'ラベルB'] } })
    const res = mockRes()

    // Act
    await listTemplates(req, res)

    // Assert: 配列は string でないため undefined になる / array is not string, becomes undefined
    expect(listPrintTemplates).toHaveBeenCalledWith({ name: undefined })
  })

  it('空のリストを正常に返す / returns empty list successfully', async () => {
    // Arrange
    vi.mocked(listPrintTemplates).mockResolvedValue([] as any)

    const req = mockReq({ query: {} })
    const res = mockRes()

    // Act
    await listTemplates(req, res)

    // Assert
    expect(res.json).toHaveBeenCalledWith([])
  })

  it('サービスエラー時に 500 を返す / returns 500 when service throws', async () => {
    // Arrange
    vi.mocked(listPrintTemplates).mockRejectedValue(new Error('query timeout'))

    const req = mockReq({ query: {} })
    const res = mockRes()

    // Act
    await listTemplates(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Failed to list print templates' }),
    )
  })
})

// ─── getTemplateById ─────────────────────────────────────────────

describe('getTemplateById', () => {
  beforeEach(() => vi.clearAllMocks())

  it('有効 ID でテンプレートを取得する / retrieves template with valid ID', async () => {
    // Arrange
    vi.mocked(mongoose.Types.ObjectId.isValid).mockReturnValue(true)
    const fakeItem = { _id: VALID_ID, name: 'ラベルテンプレート' }
    vi.mocked(getPrintTemplateById).mockResolvedValue(fakeItem as any)

    const req = mockReq({ params: { id: VALID_ID }, query: {} })
    const res = mockRes()

    // Act
    await getTemplateById(req, res)

    // Assert
    expect(getPrintTemplateById).toHaveBeenCalledWith(VALID_ID, false)
    expect(res.json).toHaveBeenCalledWith(fakeItem)
  })

  it('includeSampleData=true の場合サービスに true を渡す / passes true to service when includeSampleData=true', async () => {
    // Arrange
    vi.mocked(mongoose.Types.ObjectId.isValid).mockReturnValue(true)
    const fakeItem = { _id: VALID_ID, name: 'テンプレート', sampleData: { key: 'value' } }
    vi.mocked(getPrintTemplateById).mockResolvedValue(fakeItem as any)

    const req = mockReq({ params: { id: VALID_ID }, query: { includeSampleData: 'true' } })
    const res = mockRes()

    // Act
    await getTemplateById(req, res)

    // Assert: サービスに includeSampleData=true が渡される
    // includeSampleData=true passed to service
    expect(getPrintTemplateById).toHaveBeenCalledWith(VALID_ID, true)
    expect(res.json).toHaveBeenCalledWith(fakeItem)
  })

  it('includeSampleData が "true" 以外なら false を渡す / passes false when includeSampleData is not "true"', async () => {
    // Arrange
    vi.mocked(mongoose.Types.ObjectId.isValid).mockReturnValue(true)
    vi.mocked(getPrintTemplateById).mockResolvedValue({ _id: VALID_ID } as any)

    const req = mockReq({ params: { id: VALID_ID }, query: { includeSampleData: 'false' } })
    const res = mockRes()

    // Act
    await getTemplateById(req, res)

    // Assert
    expect(getPrintTemplateById).toHaveBeenCalledWith(VALID_ID, false)
  })

  it('存在しない ID で 404 を返す / returns 404 when template not found', async () => {
    // Arrange
    vi.mocked(mongoose.Types.ObjectId.isValid).mockReturnValue(true)
    vi.mocked(getPrintTemplateById).mockResolvedValue(null)

    const req = mockReq({ params: { id: VALID_ID }, query: {} })
    const res = mockRes()

    // Act
    await getTemplateById(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: 'Print template not found' })
  })

  it('無効な ObjectId で 400 を返す / returns 400 for invalid ObjectId', async () => {
    // Arrange
    vi.mocked(mongoose.Types.ObjectId.isValid).mockReturnValue(false)

    const req = mockReq({ params: { id: 'invalid-id' }, query: {} })
    const res = mockRes()

    // Act
    await getTemplateById(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid id' })
    expect(getPrintTemplateById).not.toHaveBeenCalled()
  })

  it('id が空文字の場合 400 を返す / returns 400 when id is empty string', async () => {
    // Arrange
    vi.mocked(mongoose.Types.ObjectId.isValid).mockReturnValue(false)

    const req = mockReq({ params: { id: '' }, query: {} })
    const res = mockRes()

    // Act
    await getTemplateById(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(getPrintTemplateById).not.toHaveBeenCalled()
  })

  it('id が undefined の場合 400 を返す / returns 400 when id is undefined', async () => {
    // Arrange
    vi.mocked(mongoose.Types.ObjectId.isValid).mockReturnValue(false)

    const req = mockReq({ params: {}, query: {} })
    const res = mockRes()

    // Act
    await getTemplateById(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(getPrintTemplateById).not.toHaveBeenCalled()
  })

  it('サービスエラー時に 500 を返す / returns 500 when service throws', async () => {
    // Arrange
    vi.mocked(mongoose.Types.ObjectId.isValid).mockReturnValue(true)
    vi.mocked(getPrintTemplateById).mockRejectedValue(new Error('connection reset'))

    const req = mockReq({ params: { id: VALID_ID }, query: {} })
    const res = mockRes()

    // Act
    await getTemplateById(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Failed to get print template' }),
    )
  })
})

// ─── updateTemplate ──────────────────────────────────────────────

describe('updateTemplate', () => {
  beforeEach(() => vi.clearAllMocks())

  it('有効な入力でテンプレートを更新する / updates template with valid input', async () => {
    // Arrange
    vi.mocked(mongoose.Types.ObjectId.isValid).mockReturnValue(true)
    const dto = { name: '更新テンプレート名' }
    const fakeUpdated = { _id: VALID_ID, ...dto }
    vi.mocked(updatePrintTemplate).mockResolvedValue(fakeUpdated as any)

    const req = mockReq({ params: { id: VALID_ID }, body: dto })
    const res = mockRes()

    // Act
    await updateTemplate(req, res)

    // Assert
    expect(updatePrintTemplate).toHaveBeenCalledWith(VALID_ID, dto)
    expect(res.json).toHaveBeenCalledWith(fakeUpdated)
  })

  it('存在しない ID で 404 を返す / returns 404 when template not found', async () => {
    // Arrange
    vi.mocked(mongoose.Types.ObjectId.isValid).mockReturnValue(true)
    vi.mocked(updatePrintTemplate).mockResolvedValue(null)

    const req = mockReq({ params: { id: VALID_ID }, body: { name: '更新名' } })
    const res = mockRes()

    // Act
    await updateTemplate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: 'Print template not found' })
  })

  it('無効な ObjectId で 400 を返す / returns 400 for invalid ObjectId', async () => {
    // Arrange
    vi.mocked(mongoose.Types.ObjectId.isValid).mockReturnValue(false)

    const req = mockReq({ params: { id: 'bad-id' }, body: { name: '更新名' } })
    const res = mockRes()

    // Act
    await updateTemplate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid id' })
    expect(updatePrintTemplate).not.toHaveBeenCalled()
  })

  it('id が undefined の場合 400 を返す / returns 400 when id is undefined', async () => {
    // Arrange
    vi.mocked(mongoose.Types.ObjectId.isValid).mockReturnValue(false)

    const req = mockReq({ params: {}, body: {} })
    const res = mockRes()

    // Act
    await updateTemplate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(updatePrintTemplate).not.toHaveBeenCalled()
  })

  it('referenceImageData が 5MB 超の場合 400 を返す / returns 400 when referenceImageData exceeds 5MB', async () => {
    // Arrange
    vi.mocked(mongoose.Types.ObjectId.isValid).mockReturnValue(true)
    const oversizedData = 'x'.repeat(5 * 1024 * 1024 + 1)

    const req = mockReq({
      params: { id: VALID_ID },
      body: { referenceImageData: oversizedData },
    })
    const res = mockRes()

    // Act
    await updateTemplate(req, res)

    // Assert: 画像サイズ超過エラー / image size exceeded error
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('参考画像') }),
    )
    expect(updatePrintTemplate).not.toHaveBeenCalled()
  })

  it('referenceImageData がちょうど 5MB の場合は許可する / allows referenceImageData exactly 5MB on update', async () => {
    // Arrange
    vi.mocked(mongoose.Types.ObjectId.isValid).mockReturnValue(true)
    const exactSizeData = 'x'.repeat(5 * 1024 * 1024)
    const dto = { referenceImageData: exactSizeData }
    const fakeUpdated = { _id: VALID_ID, ...dto }
    vi.mocked(updatePrintTemplate).mockResolvedValue(fakeUpdated as any)

    const req = mockReq({ params: { id: VALID_ID }, body: dto })
    const res = mockRes()

    // Act
    await updateTemplate(req, res)

    // Assert: 境界値はパスする / boundary value passes
    expect(updatePrintTemplate).toHaveBeenCalledWith(VALID_ID, dto)
    expect(res.json).toHaveBeenCalledWith(fakeUpdated)
  })

  it('空の body でも更新可能 / allows update with empty body', async () => {
    // Arrange
    vi.mocked(mongoose.Types.ObjectId.isValid).mockReturnValue(true)
    const fakeUpdated = { _id: VALID_ID, name: '既存名' }
    vi.mocked(updatePrintTemplate).mockResolvedValue(fakeUpdated as any)

    const req = mockReq({ params: { id: VALID_ID }, body: {} })
    const res = mockRes()

    // Act
    await updateTemplate(req, res)

    // Assert
    expect(updatePrintTemplate).toHaveBeenCalledWith(VALID_ID, {})
    expect(res.json).toHaveBeenCalledWith(fakeUpdated)
  })

  it('サービスエラー時に 500 を返す / returns 500 when service throws', async () => {
    // Arrange
    vi.mocked(mongoose.Types.ObjectId.isValid).mockReturnValue(true)
    vi.mocked(updatePrintTemplate).mockRejectedValue(new Error('write failed'))

    const req = mockReq({ params: { id: VALID_ID }, body: { name: '更新名' } })
    const res = mockRes()

    // Act
    await updateTemplate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Failed to update print template' }),
    )
  })
})

// ─── deleteTemplate ──────────────────────────────────────────────

describe('deleteTemplate', () => {
  beforeEach(() => vi.clearAllMocks())

  it('テンプレートを削除し 204 を返す / deletes template and returns 204', async () => {
    // Arrange
    vi.mocked(mongoose.Types.ObjectId.isValid).mockReturnValue(true)
    vi.mocked(deletePrintTemplate).mockResolvedValue(true)

    const req = mockReq({ params: { id: VALID_ID } })
    const res = mockRes()

    // Act
    await deleteTemplate(req, res)

    // Assert: 削除成功時は 204 No Content / 204 No Content on successful delete
    expect(deletePrintTemplate).toHaveBeenCalledWith(VALID_ID)
    expect(res.status).toHaveBeenCalledWith(204)
    expect(res.send).toHaveBeenCalled()
  })

  it('存在しない ID で 404 を返す / returns 404 when template not found', async () => {
    // Arrange
    vi.mocked(mongoose.Types.ObjectId.isValid).mockReturnValue(true)
    vi.mocked(deletePrintTemplate).mockResolvedValue(false)

    const req = mockReq({ params: { id: VALID_ID } })
    const res = mockRes()

    // Act
    await deleteTemplate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: 'Print template not found' })
  })

  it('無効な ObjectId で 400 を返す / returns 400 for invalid ObjectId', async () => {
    // Arrange
    vi.mocked(mongoose.Types.ObjectId.isValid).mockReturnValue(false)

    const req = mockReq({ params: { id: 'not-valid' } })
    const res = mockRes()

    // Act
    await deleteTemplate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid id' })
    expect(deletePrintTemplate).not.toHaveBeenCalled()
  })

  it('id が空文字の場合 400 を返す / returns 400 when id is empty string', async () => {
    // Arrange
    vi.mocked(mongoose.Types.ObjectId.isValid).mockReturnValue(false)

    const req = mockReq({ params: { id: '' } })
    const res = mockRes()

    // Act
    await deleteTemplate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(deletePrintTemplate).not.toHaveBeenCalled()
  })

  it('id が undefined の場合 400 を返す / returns 400 when id is undefined', async () => {
    // Arrange
    vi.mocked(mongoose.Types.ObjectId.isValid).mockReturnValue(false)

    const req = mockReq({ params: {} })
    const res = mockRes()

    // Act
    await deleteTemplate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(deletePrintTemplate).not.toHaveBeenCalled()
  })

  it('サービスエラー時に 500 を返す / returns 500 when service throws', async () => {
    // Arrange
    vi.mocked(mongoose.Types.ObjectId.isValid).mockReturnValue(true)
    vi.mocked(deletePrintTemplate).mockRejectedValue(new Error('delete operation failed'))

    const req = mockReq({ params: { id: VALID_ID } })
    const res = mockRes()

    // Act
    await deleteTemplate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Failed to delete print template' }),
    )
  })
})
