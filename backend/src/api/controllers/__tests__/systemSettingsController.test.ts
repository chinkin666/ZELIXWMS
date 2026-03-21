/**
 * systemSettingsController 单元测试 / System Settings Controller Unit Tests
 *
 * SystemSettings モデル層を通じた設定操作の HTTP フローを検証する。
 * Verifies HTTP flow for system settings operations through the model layer.
 *
 * モック方針 / Mock strategy:
 * - SystemSettings モデルをすべてモック（DB不要）
 *   Mock SystemSettings model to eliminate DB dependency
 * - findOne / create / findOneAndUpdate / deleteOne をスパイとして設定
 *   Set findOne / create / findOneAndUpdate / deleteOne as spies
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言（hoisted） ──────────────────────────────
// Module mock declarations (hoisted)

vi.mock('@/models/systemSettings', () => ({
  SystemSettings: {
    findOne: vi.fn(),
    create: vi.fn(),
    findOneAndUpdate: vi.fn(),
    deleteOne: vi.fn(),
  },
}))

import { SystemSettings } from '@/models/systemSettings'
import {
  getSettings,
  updateSettings,
  resetSettings,
} from '@/api/controllers/systemSettingsController'

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

/**
 * デフォルト設定オブジェクト / Default settings object fixture
 * テスト用の代表的な設定値 / Representative settings values for tests
 */
const defaultSettings = {
  _id: 'settings-id-1',
  settingsKey: 'global',
  inboundRequireInspection: true,
  inboundAutoCreateLot: false,
  inboundDefaultLocationCode: '',
  inventoryAllowNegativeStock: false,
  inventoryDefaultSafetyStock: 0,
  inventoryLotTrackingEnabled: true,
  inventoryExpiryAlertDays: 30,
  outboundAutoAllocate: false,
  outboundAllocationRule: 'FIFO',
  outboundRequireInspection: true,
  barcodeDefaultFormat: 'code128',
  barcodeScanMode: 'single',
  systemLanguage: 'ja',
  timezone: 'Asia/Tokyo',
  dateFormat: 'YYYY-MM-DD',
  pageSize: 50,
}

// ─── getSettings ───────────────────────────────────────────────

describe('getSettings', () => {
  beforeEach(() => vi.clearAllMocks())

  it('既存ドキュメントが存在する場合それを返す / returns existing document when found', async () => {
    // Arrange: findOne がドキュメントを返す / findOne returns a document
    vi.mocked(SystemSettings.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(defaultSettings),
    } as any)

    const req = mockReq()
    const res = mockRes()

    // Act
    await getSettings(req, res)

    // Assert: settingsKey='global' で検索し、結果を json で返す
    // Assert: searched with settingsKey='global', returns result as json
    expect(SystemSettings.findOne).toHaveBeenCalledWith({ settingsKey: 'global' })
    expect(res.json).toHaveBeenCalledWith(defaultSettings)
    expect(SystemSettings.create).not.toHaveBeenCalled()
  })

  it('ドキュメントが存在しない場合デフォルト値で作成して返す / creates default document when none exists', async () => {
    // Arrange: findOne が null を返す（未作成状態） / findOne returns null (not yet created)
    vi.mocked(SystemSettings.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)
    const createdDoc = { ...defaultSettings }
    vi.mocked(SystemSettings.create).mockResolvedValue({
      toObject: () => createdDoc,
    } as any)

    const req = mockReq()
    const res = mockRes()

    // Act
    await getSettings(req, res)

    // Assert: create が呼ばれ、作成されたドキュメントを返す
    // Assert: create is called, returns created document
    expect(SystemSettings.create).toHaveBeenCalledWith({ settingsKey: 'global' })
    expect(res.json).toHaveBeenCalledWith(createdDoc)
  })

  it('作成されたドキュメントを toObject() で返す / returns created document via toObject()', async () => {
    // Arrange: findOne=null、createが toObject を持つオブジェクトを返す
    // findOne=null, create returns object with toObject
    vi.mocked(SystemSettings.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)
    const plainDoc = { settingsKey: 'global', pageSize: 50 }
    vi.mocked(SystemSettings.create).mockResolvedValue({
      toObject: vi.fn().mockReturnValue(plainDoc),
    } as any)

    const req = mockReq()
    const res = mockRes()

    // Act
    await getSettings(req, res)

    // Assert: toObject() の戻り値がレスポンスに使われる
    // Assert: toObject() return value is used in response
    expect(res.json).toHaveBeenCalledWith(plainDoc)
  })

  it('findOne でエラーが発生した場合 500 を返す / returns 500 when findOne throws', async () => {
    // Arrange: findOne が例外を投げる / findOne throws an error
    vi.mocked(SystemSettings.findOne).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('DB connection failed')),
    } as any)

    const req = mockReq()
    const res = mockRes()

    // Act
    await getSettings(req, res)

    // Assert: 500 とエラーメッセージ / 500 with error message
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ message: 'システム設定の取得に失敗しました' })
  })

  it('create でエラーが発生した場合 500 を返す / returns 500 when create throws', async () => {
    // Arrange: findOne=null の後 create が例外 / findOne=null then create throws
    vi.mocked(SystemSettings.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)
    vi.mocked(SystemSettings.create).mockRejectedValue(new Error('create failed'))

    const req = mockReq()
    const res = mockRes()

    // Act
    await getSettings(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ message: 'システム設定の取得に失敗しました' })
  })
})

// ─── updateSettings ────────────────────────────────────────────

describe('updateSettings', () => {
  beforeEach(() => vi.clearAllMocks())

  it('設定を正常に更新して返す / updates settings and returns updated document', async () => {
    // Arrange: 更新後のドキュメントを返す / returns updated document
    const updatedDoc = { ...defaultSettings, pageSize: 100, systemLanguage: 'en' }
    vi.mocked(SystemSettings.findOneAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(updatedDoc),
    } as any)

    const req = mockReq({ body: { pageSize: 100, systemLanguage: 'en' } })
    const res = mockRes()

    // Act
    await updateSettings(req, res)

    // Assert: findOneAndUpdate が正しいパラメータで呼ばれる
    // Assert: findOneAndUpdate called with correct parameters
    expect(SystemSettings.findOneAndUpdate).toHaveBeenCalledWith(
      { settingsKey: 'global' },
      { $set: { pageSize: 100, systemLanguage: 'en' } },
      { new: true, upsert: true, runValidators: true },
    )
    expect(res.json).toHaveBeenCalledWith(updatedDoc)
  })

  it('settingsKey フィールドは更新から除外される / settingsKey field is stripped from updates', async () => {
    // Arrange: リクエストに settingsKey が含まれる / request body includes settingsKey
    vi.mocked(SystemSettings.findOneAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(defaultSettings),
    } as any)

    const req = mockReq({
      body: { settingsKey: 'hacked', pageSize: 25 },
    })
    const res = mockRes()

    // Act
    await updateSettings(req, res)

    // Assert: $set に settingsKey が含まれない / settingsKey not in $set
    const callArg = vi.mocked(SystemSettings.findOneAndUpdate).mock.calls[0] as any
    expect(callArg[1].$set).not.toHaveProperty('settingsKey')
    expect(callArg[1].$set).toHaveProperty('pageSize', 25)
  })

  it('_id フィールドは更新から除外される / _id field is stripped from updates', async () => {
    // Arrange: リクエストに _id が含まれる / request body includes _id
    vi.mocked(SystemSettings.findOneAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(defaultSettings),
    } as any)

    const req = mockReq({
      body: { _id: 'fake-id', timezone: 'America/New_York' },
    })
    const res = mockRes()

    // Act
    await updateSettings(req, res)

    // Assert: $set に _id が含まれない / _id not in $set
    const callArg = vi.mocked(SystemSettings.findOneAndUpdate).mock.calls[0] as any
    expect(callArg[1].$set).not.toHaveProperty('_id')
    expect(callArg[1].$set).toHaveProperty('timezone', 'America/New_York')
  })

  it('settingsKey と _id を同時に除外する / strips both settingsKey and _id simultaneously', async () => {
    // Arrange
    vi.mocked(SystemSettings.findOneAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(defaultSettings),
    } as any)

    const req = mockReq({
      body: {
        settingsKey: 'evil',
        _id: 'evil-id',
        outboundAllocationRule: 'FEFO',
        inventoryExpiryAlertDays: 14,
      },
    })
    const res = mockRes()

    // Act
    await updateSettings(req, res)

    // Assert: 有効なフィールドだけが $set に渡される
    // Assert: only valid fields are passed in $set
    const callArg = vi.mocked(SystemSettings.findOneAndUpdate).mock.calls[0] as any
    expect(callArg[1].$set).toEqual({
      outboundAllocationRule: 'FEFO',
      inventoryExpiryAlertDays: 14,
    })
  })

  it('空の body でも upsert が動作する / upsert works even with empty body', async () => {
    // Arrange: 空のボディ / empty body
    vi.mocked(SystemSettings.findOneAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(defaultSettings),
    } as any)

    const req = mockReq({ body: {} })
    const res = mockRes()

    // Act
    await updateSettings(req, res)

    // Assert: $set が空でも findOneAndUpdate が呼ばれる
    // Assert: findOneAndUpdate called even with empty $set
    expect(SystemSettings.findOneAndUpdate).toHaveBeenCalledWith(
      { settingsKey: 'global' },
      { $set: {} },
      { new: true, upsert: true, runValidators: true },
    )
    expect(res.json).toHaveBeenCalledWith(defaultSettings)
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange: findOneAndUpdate が例外を投げる / findOneAndUpdate throws
    vi.mocked(SystemSettings.findOneAndUpdate).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('update failed')),
    } as any)

    const req = mockReq({ body: { pageSize: 10 } })
    const res = mockRes()

    // Act
    await updateSettings(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ message: 'システム設定の更新に失敗しました' })
  })

  it('バリデーションエラー（runValidators）時に 500 を返す / returns 500 on validation error', async () => {
    // Arrange: Mongoose バリデーションエラーを模倣 / simulate Mongoose validation error
    const validationError = Object.assign(new Error('Validation failed'), {
      name: 'ValidationError',
    })
    vi.mocked(SystemSettings.findOneAndUpdate).mockReturnValue({
      lean: vi.fn().mockRejectedValue(validationError),
    } as any)

    const req = mockReq({ body: { outboundAllocationRule: 'INVALID_RULE' } })
    const res = mockRes()

    // Act
    await updateSettings(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ message: 'システム設定の更新に失敗しました' })
  })
})

// ─── resetSettings ─────────────────────────────────────────────

describe('resetSettings', () => {
  beforeEach(() => vi.clearAllMocks())

  it('既存ドキュメントを削除してデフォルト値で再作成する / deletes existing doc and recreates with defaults', async () => {
    // Arrange: deleteOne 成功 → create 成功 / deleteOne succeeds → create succeeds
    vi.mocked(SystemSettings.deleteOne).mockResolvedValue({ deletedCount: 1 } as any)
    const freshDoc = { ...defaultSettings }
    vi.mocked(SystemSettings.create).mockResolvedValue({
      toObject: () => freshDoc,
    } as any)

    const req = mockReq()
    const res = mockRes()

    // Act
    await resetSettings(req, res)

    // Assert: deleteOne → create の順で呼ばれ、新しいドキュメントを返す
    // Assert: deleteOne → create called in order, returns new document
    expect(SystemSettings.deleteOne).toHaveBeenCalledWith({ settingsKey: 'global' })
    expect(SystemSettings.create).toHaveBeenCalledWith({ settingsKey: 'global' })
    expect(res.json).toHaveBeenCalledWith(freshDoc)
  })

  it('リセット後に toObject() の戻り値がレスポンスに使われる / toObject() return value is used in response after reset', async () => {
    // Arrange
    vi.mocked(SystemSettings.deleteOne).mockResolvedValue({ deletedCount: 1 } as any)
    const plainObj = { settingsKey: 'global', systemLanguage: 'ja' }
    const mockCreated = { toObject: vi.fn().mockReturnValue(plainObj) }
    vi.mocked(SystemSettings.create).mockResolvedValue(mockCreated as any)

    const req = mockReq()
    const res = mockRes()

    // Act
    await resetSettings(req, res)

    // Assert: toObject が呼ばれ戻り値がレスポンスに使われる
    // Assert: toObject is called and its return value used in response
    expect(mockCreated.toObject).toHaveBeenCalledOnce()
    expect(res.json).toHaveBeenCalledWith(plainObj)
  })

  it('deleteOne でエラーが発生した場合 500 を返す / returns 500 when deleteOne throws', async () => {
    // Arrange: deleteOne が例外を投げる / deleteOne throws an error
    vi.mocked(SystemSettings.deleteOne).mockRejectedValue(new Error('delete failed'))

    const req = mockReq()
    const res = mockRes()

    // Act
    await resetSettings(req, res)

    // Assert: create が呼ばれず 500 を返す / create not called, returns 500
    expect(SystemSettings.create).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ message: 'システム設定のリセットに失敗しました' })
  })

  it('create でエラーが発生した場合 500 を返す / returns 500 when create throws after delete', async () => {
    // Arrange: deleteOne 成功 → create が例外 / deleteOne succeeds → create throws
    vi.mocked(SystemSettings.deleteOne).mockResolvedValue({ deletedCount: 1 } as any)
    vi.mocked(SystemSettings.create).mockRejectedValue(new Error('create failed'))

    const req = mockReq()
    const res = mockRes()

    // Act
    await resetSettings(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ message: 'システム設定のリセットに失敗しました' })
  })

  it('ドキュメントが存在しない場合でも deleteOne は成功し再作成する / works even when no document exists (deletedCount=0)', async () => {
    // Arrange: 削除対象なし（冪等性確認） / nothing to delete (idempotency check)
    vi.mocked(SystemSettings.deleteOne).mockResolvedValue({ deletedCount: 0 } as any)
    const freshDoc = { settingsKey: 'global', pageSize: 50 }
    vi.mocked(SystemSettings.create).mockResolvedValue({
      toObject: () => freshDoc,
    } as any)

    const req = mockReq()
    const res = mockRes()

    // Act
    await resetSettings(req, res)

    // Assert: 削除なしでも create が呼ばれ正常に返す
    // Assert: create called and returns normally even with no deletion
    expect(SystemSettings.create).toHaveBeenCalledWith({ settingsKey: 'global' })
    expect(res.json).toHaveBeenCalledWith(freshDoc)
  })
})
