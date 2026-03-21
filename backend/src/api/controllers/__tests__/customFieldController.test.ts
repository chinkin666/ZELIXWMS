/**
 * customFieldController 単体テスト / Custom Field Controller Unit Tests
 *
 * カスタムフィールド管理コントローラーの全エクスポート関数を検証する。
 * Verifies all exported functions of the custom field management controller.
 *
 * モック方針 / Mock strategy:
 * - @/core/extensions をモックし、extensionManager.getCustomFieldService() を制御する
 *   Mock @/core/extensions to control extensionManager.getCustomFieldService()
 * - DB・外部依存を完全に排除 / Eliminate all DB and external dependencies
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言（hoisted） ──────────────────────────────
// Module mock declarations (hoisted)

// カスタムフィールドサービスのメソッドスパイ / Custom field service method spies
const mockService = {
  getAllDefinitions: vi.fn(),
  getDefinitions: vi.fn(),
  createDefinition: vi.fn(),
  updateDefinition: vi.fn(),
  deleteDefinition: vi.fn(),
  validateValues: vi.fn(),
}

vi.mock('@/core/extensions', () => ({
  extensionManager: {
    getCustomFieldService: vi.fn(() => mockService),
  },
}))

import {
  listDefinitions,
  getActiveDefinitions,
  createDefinition,
  updateDefinition,
  deleteDefinition,
  validateValues,
} from '@/api/controllers/customFieldController'

// ─── テストユーティリティ / Test utilities ────────────────────────

/**
 * モックリクエスト生成 / Mock request factory
 * 最小限の Request オブジェクト / Minimal Request object
 */
const mockReq = (overrides: Record<string, unknown> = {}) =>
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

// ─── listDefinitions ───────────────────────────────────────────

describe('listDefinitions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('フィルタなしで全定義を返す / returns all definitions without filters', async () => {
    // Arrange
    const fakeDefinitions = [
      { fieldKey: 'memo', label: 'メモ', entityType: 'order' },
      { fieldKey: 'grade', label: 'グレード', entityType: 'product' },
    ]
    mockService.getAllDefinitions.mockResolvedValue(fakeDefinitions)

    const req = mockReq({ query: {} })
    const res = mockRes()

    // Act
    await listDefinitions(req, res)

    // Assert: フィルタなしでサービスが呼ばれる / service called without filters
    expect(mockService.getAllDefinitions).toHaveBeenCalledWith({
      entityType: undefined,
      tenantId: undefined,
    })
    expect(res.json).toHaveBeenCalledWith({ data: fakeDefinitions })
  })

  it('entityType クエリで絞り込む / filters by entityType query param', async () => {
    // Arrange
    const fakeDefinitions = [{ fieldKey: 'memo', label: 'メモ', entityType: 'order' }]
    mockService.getAllDefinitions.mockResolvedValue(fakeDefinitions)

    const req = mockReq({ query: { entityType: 'order' } })
    const res = mockRes()

    // Act
    await listDefinitions(req, res)

    // Assert: entityType フィルタが渡される / entityType filter passed to service
    expect(mockService.getAllDefinitions).toHaveBeenCalledWith({
      entityType: 'order',
      tenantId: undefined,
    })
    expect(res.json).toHaveBeenCalledWith({ data: fakeDefinitions })
  })

  it('tenantId クエリで絞り込む / filters by tenantId query param', async () => {
    // Arrange
    mockService.getAllDefinitions.mockResolvedValue([])

    const req = mockReq({ query: { tenantId: 'tenant-123' } })
    const res = mockRes()

    // Act
    await listDefinitions(req, res)

    // Assert: tenantId フィルタが渡される / tenantId filter passed to service
    expect(mockService.getAllDefinitions).toHaveBeenCalledWith({
      entityType: undefined,
      tenantId: 'tenant-123',
    })
  })

  it('entityType と tenantId の両方でフィルタ / filters by both entityType and tenantId', async () => {
    // Arrange
    mockService.getAllDefinitions.mockResolvedValue([])

    const req = mockReq({ query: { entityType: 'product', tenantId: 'tenant-456' } })
    const res = mockRes()

    // Act
    await listDefinitions(req, res)

    // Assert: 両フィルタが渡される / both filters passed to service
    expect(mockService.getAllDefinitions).toHaveBeenCalledWith({
      entityType: 'product',
      tenantId: 'tenant-456',
    })
  })

  it('結果が空配列でも正常に返す / returns empty array when no definitions exist', async () => {
    // Arrange
    mockService.getAllDefinitions.mockResolvedValue([])

    const req = mockReq()
    const res = mockRes()

    // Act
    await listDefinitions(req, res)

    // Assert: 空配列でも data ラッパーで返す / returns empty array in data wrapper
    expect(res.json).toHaveBeenCalledWith({ data: [] })
  })

  it('サービスエラー時に 500 を返す / returns 500 when service throws', async () => {
    // Arrange
    mockService.getAllDefinitions.mockRejectedValue(new Error('DB connection failed'))

    const req = mockReq()
    const res = mockRes()

    // Act
    await listDefinitions(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'DB connection failed' })
  })
})

// ─── getActiveDefinitions ──────────────────────────────────────

describe('getActiveDefinitions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('指定エンティティの有効フィールド定義を返す / returns active definitions for entity type', async () => {
    // Arrange
    const fakeDefinitions = [
      { fieldKey: 'priority', label: '優先度', entityType: 'order', enabled: true },
    ]
    mockService.getDefinitions.mockResolvedValue(fakeDefinitions)

    const req = mockReq({ params: { entityType: 'order' }, query: {} })
    const res = mockRes()

    // Act
    await getActiveDefinitions(req, res)

    // Assert: entityType と tenantId=undefined でサービスが呼ばれる / service called with entityType and tenantId=undefined
    expect(mockService.getDefinitions).toHaveBeenCalledWith('order', undefined)
    expect(res.json).toHaveBeenCalledWith({ data: fakeDefinitions })
  })

  it('tenantId クエリを渡す / passes tenantId query to service', async () => {
    // Arrange
    mockService.getDefinitions.mockResolvedValue([])

    const req = mockReq({ params: { entityType: 'product' }, query: { tenantId: 'T1' } })
    const res = mockRes()

    // Act
    await getActiveDefinitions(req, res)

    // Assert: tenantId がサービスに渡される / tenantId forwarded to service
    expect(mockService.getDefinitions).toHaveBeenCalledWith('product', 'T1')
  })

  it('inboundOrder エンティティタイプで動作する / works with inboundOrder entity type', async () => {
    // Arrange
    const fakeDefinitions = [{ fieldKey: 'supplier_code', label: '仕入先コード', entityType: 'inboundOrder', enabled: true }]
    mockService.getDefinitions.mockResolvedValue(fakeDefinitions)

    const req = mockReq({ params: { entityType: 'inboundOrder' }, query: {} })
    const res = mockRes()

    // Act
    await getActiveDefinitions(req, res)

    // Assert
    expect(mockService.getDefinitions).toHaveBeenCalledWith('inboundOrder', undefined)
    expect(res.json).toHaveBeenCalledWith({ data: fakeDefinitions })
  })

  it('returnOrder エンティティタイプで動作する / works with returnOrder entity type', async () => {
    // Arrange
    mockService.getDefinitions.mockResolvedValue([])

    const req = mockReq({ params: { entityType: 'returnOrder' }, query: {} })
    const res = mockRes()

    // Act
    await getActiveDefinitions(req, res)

    // Assert
    expect(mockService.getDefinitions).toHaveBeenCalledWith('returnOrder', undefined)
  })

  it('サービスエラー時に 500 を返す / returns 500 when service throws', async () => {
    // Arrange
    mockService.getDefinitions.mockRejectedValue(new Error('query failed'))

    const req = mockReq({ params: { entityType: 'order' }, query: {} })
    const res = mockRes()

    // Act
    await getActiveDefinitions(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'query failed' })
  })
})

// ─── createDefinition ──────────────────────────────────────────

describe('createDefinition', () => {
  beforeEach(() => vi.clearAllMocks())

  it('正常にフィールド定義を作成し 201 を返す / creates definition and returns 201', async () => {
    // Arrange
    const inputBody = { fieldKey: 'memo', label: 'メモ', entityType: 'order', fieldType: 'text' }
    const created = { ...inputBody, _id: 'def-001', enabled: true }
    mockService.createDefinition.mockResolvedValue(created)

    const req = mockReq({ body: inputBody })
    const res = mockRes()

    // Act
    await createDefinition(req, res)

    // Assert: 201 で作成結果を返す / returns 201 with created definition
    expect(mockService.createDefinition).toHaveBeenCalledWith(inputBody)
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(created)
  })

  it('duplicate key エラー時に 409 を返す / returns 409 on duplicate key error', async () => {
    // Arrange
    mockService.createDefinition.mockRejectedValue(new Error('duplicate key violation'))

    const req = mockReq({ body: { fieldKey: 'memo', label: 'メモ', entityType: 'order' } })
    const res = mockRes()

    // Act
    await createDefinition(req, res)

    // Assert: "duplicate key" を含むエラーは 409 / error containing "duplicate key" → 409
    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith({ error: 'duplicate key violation' })
  })

  it('一般バリデーションエラー時に 400 を返す / returns 400 on general validation error', async () => {
    // Arrange
    mockService.createDefinition.mockRejectedValue(new Error('fieldKey は英数字とアンダースコアのみ使用可能'))

    const req = mockReq({ body: { fieldKey: 'invalid-key!', label: 'テスト', entityType: 'order' } })
    const res = mockRes()

    // Act
    await createDefinition(req, res)

    // Assert: "duplicate key" を含まないエラーは 400 / error without "duplicate key" → 400
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'fieldKey は英数字とアンダースコアのみ使用可能' })
  })

  it('select タイプで options なしのエラーは 400 を返す / returns 400 when select type has no options', async () => {
    // Arrange
    mockService.createDefinition.mockRejectedValue(new Error('select タイプには options が必須です'))

    const req = mockReq({ body: { fieldKey: 'status', label: 'ステータス', entityType: 'order', fieldType: 'select' } })
    const res = mockRes()

    // Act
    await createDefinition(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('空ボディでもサービスに委譲する / delegates to service even with empty body', async () => {
    // Arrange
    mockService.createDefinition.mockRejectedValue(new Error('required fields missing'))

    const req = mockReq({ body: {} })
    const res = mockRes()

    // Act
    await createDefinition(req, res)

    // Assert: サービスが空ボディで呼ばれる / service called with empty body
    expect(mockService.createDefinition).toHaveBeenCalledWith({})
    expect(res.status).toHaveBeenCalledWith(400)
  })
})

// ─── updateDefinition ──────────────────────────────────────────

describe('updateDefinition', () => {
  beforeEach(() => vi.clearAllMocks())

  it('既存定義を正常に更新する / updates existing definition successfully', async () => {
    // Arrange
    const updated = { _id: 'def-001', fieldKey: 'memo', label: '更新後メモ', entityType: 'order' }
    mockService.updateDefinition.mockResolvedValue(updated)

    const req = mockReq({ params: { id: 'def-001' }, body: { label: '更新後メモ' } })
    const res = mockRes()

    // Act
    await updateDefinition(req, res)

    // Assert: ID とボディでサービスが呼ばれる / service called with id and body
    expect(mockService.updateDefinition).toHaveBeenCalledWith('def-001', { label: '更新後メモ' })
    expect(res.json).toHaveBeenCalledWith(updated)
  })

  it('定義が見つからない場合 404 を返す / returns 404 when definition not found', async () => {
    // Arrange
    mockService.updateDefinition.mockResolvedValue(null)

    const req = mockReq({ params: { id: 'nonexistent-id' }, body: { label: 'テスト' } })
    const res = mockRes()

    // Act
    await updateDefinition(req, res)

    // Assert: null 返却で 404 / null result → 404
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ error: 'フィールド定義が見つかりません' })
  })

  it('サービスエラー時に 400 を返す / returns 400 when service throws', async () => {
    // Arrange
    mockService.updateDefinition.mockRejectedValue(new Error('select タイプには options が必須です'))

    const req = mockReq({ params: { id: 'def-001' }, body: { fieldType: 'select', options: [] } })
    const res = mockRes()

    // Act
    await updateDefinition(req, res)

    // Assert: 更新エラーは 400 / update error → 400
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'select タイプには options が必須です' })
  })

  it('空ボディでも正常に更新できる / handles empty body update gracefully', async () => {
    // Arrange
    const updated = { _id: 'def-002', fieldKey: 'grade', label: 'グレード' }
    mockService.updateDefinition.mockResolvedValue(updated)

    const req = mockReq({ params: { id: 'def-002' }, body: {} })
    const res = mockRes()

    // Act
    await updateDefinition(req, res)

    // Assert
    expect(mockService.updateDefinition).toHaveBeenCalledWith('def-002', {})
    expect(res.json).toHaveBeenCalledWith(updated)
  })

  it('DB 接続エラー時に 400 を返す / returns 400 on DB connection error', async () => {
    // Arrange
    mockService.updateDefinition.mockRejectedValue(new Error('MongoNetworkError'))

    const req = mockReq({ params: { id: 'def-001' }, body: { label: '新ラベル' } })
    const res = mockRes()

    // Act
    await updateDefinition(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'MongoNetworkError' })
  })
})

// ─── deleteDefinition ──────────────────────────────────────────

describe('deleteDefinition', () => {
  beforeEach(() => vi.clearAllMocks())

  it('定義を削除し確認メッセージを返す / deletes definition and returns confirmation', async () => {
    // Arrange
    mockService.deleteDefinition.mockResolvedValue(true)

    const req = mockReq({ params: { id: 'def-001' } })
    const res = mockRes()

    // Act
    await deleteDefinition(req, res)

    // Assert: 削除確認レスポンス / deletion confirmation response
    expect(mockService.deleteDefinition).toHaveBeenCalledWith('def-001')
    expect(res.json).toHaveBeenCalledWith({ message: 'フィールド定義を削除しました' })
  })

  it('存在しない定義の削除で 404 を返す / returns 404 when deleting non-existent definition', async () => {
    // Arrange
    mockService.deleteDefinition.mockResolvedValue(false)

    const req = mockReq({ params: { id: 'ghost-id' } })
    const res = mockRes()

    // Act
    await deleteDefinition(req, res)

    // Assert: false 返却で 404 / false result → 404
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ error: 'フィールド定義が見つかりません' })
  })

  it('サービスエラー時に 500 を返す / returns 500 when service throws', async () => {
    // Arrange
    mockService.deleteDefinition.mockRejectedValue(new Error('DB write failed'))

    const req = mockReq({ params: { id: 'def-001' } })
    const res = mockRes()

    // Act
    await deleteDefinition(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'DB write failed' })
  })

  it('ID パラメータをサービスに正しく渡す / passes ID param correctly to service', async () => {
    // Arrange
    mockService.deleteDefinition.mockResolvedValue(true)

    const req = mockReq({ params: { id: 'specific-def-id-xyz' } })
    const res = mockRes()

    // Act
    await deleteDefinition(req, res)

    // Assert: 正確な ID でサービス呼び出し / service called with exact ID
    expect(mockService.deleteDefinition).toHaveBeenCalledWith('specific-def-id-xyz')
  })
})

// ─── validateValues ────────────────────────────────────────────

describe('validateValues', () => {
  beforeEach(() => vi.clearAllMocks())

  it('有効な値でバリデーション成功結果を返す / returns valid result for valid values', async () => {
    // Arrange
    const validResult = { valid: true, errors: [] }
    mockService.validateValues.mockResolvedValue(validResult)

    const req = mockReq({
      params: { entityType: 'order' },
      body: { values: { memo: 'テスト注文', priority: 'high' }, tenantId: 'T1' },
    })
    const res = mockRes()

    // Act
    await validateValues(req, res)

    // Assert: サービスが正しい引数で呼ばれる / service called with correct arguments
    expect(mockService.validateValues).toHaveBeenCalledWith(
      'order',
      { memo: 'テスト注文', priority: 'high' },
      'T1',
    )
    expect(res.json).toHaveBeenCalledWith(validResult)
  })

  it('バリデーション失敗時にエラー一覧を返す / returns errors list when validation fails', async () => {
    // Arrange
    const invalidResult = { valid: false, errors: ['メモ は必須です', '優先度 のタイプが正しくありません（期待: select）'] }
    mockService.validateValues.mockResolvedValue(invalidResult)

    const req = mockReq({
      params: { entityType: 'order' },
      body: { values: { priority: 123 }, tenantId: undefined },
    })
    const res = mockRes()

    // Act
    await validateValues(req, res)

    // Assert: 無効な結果もそのまま 200 で返す / invalid result returned as-is with 200
    expect(res.json).toHaveBeenCalledWith(invalidResult)
  })

  it('values が undefined の場合に空オブジェクトを渡す / passes empty object when values is undefined', async () => {
    // Arrange
    const validResult = { valid: true, errors: [] }
    mockService.validateValues.mockResolvedValue(validResult)

    const req = mockReq({
      params: { entityType: 'product' },
      body: { tenantId: 'T2' },
      // values は未定義 / values is not set
    })
    const res = mockRes()

    // Act
    await validateValues(req, res)

    // Assert: values が undefined → {} にフォールバック / undefined values → {} fallback
    expect(mockService.validateValues).toHaveBeenCalledWith('product', {}, 'T2')
  })

  it('tenantId なしで動作する / works without tenantId', async () => {
    // Arrange
    mockService.validateValues.mockResolvedValue({ valid: true, errors: [] })

    const req = mockReq({
      params: { entityType: 'inboundOrder' },
      body: { values: { supplier_code: 'S001' } },
    })
    const res = mockRes()

    // Act
    await validateValues(req, res)

    // Assert: tenantId=undefined でサービスが呼ばれる / service called with tenantId=undefined
    expect(mockService.validateValues).toHaveBeenCalledWith('inboundOrder', { supplier_code: 'S001' }, undefined)
  })

  it('returnOrder エンティティタイプで動作する / works with returnOrder entity type', async () => {
    // Arrange
    mockService.validateValues.mockResolvedValue({ valid: false, errors: ['返品理由 は必須です'] })

    const req = mockReq({
      params: { entityType: 'returnOrder' },
      body: { values: {}, tenantId: 'T3' },
    })
    const res = mockRes()

    // Act
    await validateValues(req, res)

    // Assert
    expect(mockService.validateValues).toHaveBeenCalledWith('returnOrder', {}, 'T3')
  })

  it('サービスエラー時に 500 を返す / returns 500 when service throws', async () => {
    // Arrange
    mockService.validateValues.mockRejectedValue(new Error('validation service unavailable'))

    const req = mockReq({
      params: { entityType: 'order' },
      body: { values: { memo: 'test' } },
    })
    const res = mockRes()

    // Act
    await validateValues(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'validation service unavailable' })
  })

  it('values が null の場合に空オブジェクトを渡す / passes empty object when values is null', async () => {
    // Arrange
    mockService.validateValues.mockResolvedValue({ valid: true, errors: [] })

    const req = mockReq({
      params: { entityType: 'order' },
      body: { values: null, tenantId: 'T1' },
    })
    const res = mockRes()

    // Act
    await validateValues(req, res)

    // Assert: null の values は {} にフォールバック (values ?? {}) / null values fallback to {} via (values ?? {})
    expect(mockService.validateValues).toHaveBeenCalledWith('order', {}, 'T1')
  })
})
