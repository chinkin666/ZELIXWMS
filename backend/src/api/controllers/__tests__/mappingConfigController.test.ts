/**
 * mappingConfigController 单元测试 / MappingConfig Controller Unit Tests
 *
 * 映射配置コントローラーの HTTP フローを検証する。
 * Verifies HTTP flow for mapping config CRUD and plugin list operations.
 *
 * モック方針 / Mock strategy:
 * - mappingConfigService の全関数をモック（DB 不要）
 *   Mock all functions in mappingConfigService (no DB required)
 * - transformPluginsMetadata / combinePluginsMetadata もモック
 *   Mock plugins metadata to control zodToJsonSchema conversion
 * - logger はサイドエフェクトのためモック
 *   Mock logger (side-effect only, not under test)
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言（hoisted） ──────────────────────────────
// Module mock declarations (hoisted)

vi.mock('@/services/mappingConfigService', () => ({
  createMappingConfig: vi.fn(),
  getAllMappingConfigs: vi.fn(),
  getMappingConfigById: vi.fn(),
  updateMappingConfig: vi.fn(),
  deleteMappingConfig: vi.fn(),
  getDefaultMappingConfig: vi.fn(),
}))

vi.mock('@/transforms/plugins/metadata', () => ({
  transformPluginsMetadata: [],
  combinePluginsMetadata: [],
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

import {
  createMappingConfig,
  getAllMappingConfigs,
  getMappingConfigById,
  updateMappingConfig,
  deleteMappingConfig,
  getDefaultMappingConfig,
} from '@/services/mappingConfigService'

import { transformPluginsMetadata, combinePluginsMetadata } from '@/transforms/plugins/metadata'

import {
  createConfig,
  listConfigs,
  getConfigById,
  updateConfig,
  deleteConfig,
  getDefaultConfig,
  getTransformPlugins,
} from '@/api/controllers/mappingConfigController'

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
 * json() / status() / send() をスパイとして持つオブジェクト
 * Object with json() / status() / send() as spies
 */
const mockRes = () => {
  const res: any = { json: vi.fn(), status: vi.fn(), send: vi.fn() }
  // status().json() / status().send() チェーンを可能にする
  // Enable status().json() / status().send() chaining
  res.status.mockReturnValue(res)
  return res
}

/** テスト用の最小マッピング設定 / Minimal mapping config for tests */
const fakeMappingConfig = (overrides = {}) => ({
  _id: 'cfg-001',
  configType: 'ec-company-to-order',
  name: 'テスト設定',
  mappings: [{ outputField: 'orderId', inputSources: [] }],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

// ─── createConfig ───────────────────────────────────────────────

describe('createConfig', () => {
  beforeEach(() => vi.clearAllMocks())

  it('有効なリクエストで 201 と設定を返す / returns 201 with config on valid input', async () => {
    // Arrange
    const dto = { configType: 'ec-company-to-order', name: '新設定', mappings: [] }
    const created = fakeMappingConfig()
    vi.mocked(createMappingConfig).mockResolvedValue(created as any)

    const req = mockReq({ body: dto })
    const res = mockRes()

    // Act
    await createConfig(req, res)

    // Assert: 201 で作成した設定を返す / returns created config with 201
    expect(createMappingConfig).toHaveBeenCalledWith(dto)
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(created)
  })

  it('configType が欠落している場合 400 を返す / returns 400 when configType is missing', async () => {
    // Arrange: configType なし / missing configType
    const req = mockReq({ body: { name: 'テスト', mappings: [] } })
    const res = mockRes()

    // Act
    await createConfig(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('required') }),
    )
    expect(createMappingConfig).not.toHaveBeenCalled()
  })

  it('name が欠落している場合 400 を返す / returns 400 when name is missing', async () => {
    // Arrange
    const req = mockReq({ body: { configType: 'ec-company-to-order', mappings: [] } })
    const res = mockRes()

    // Act
    await createConfig(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(createMappingConfig).not.toHaveBeenCalled()
  })

  it('mappings が欠落している場合 400 を返す / returns 400 when mappings is missing', async () => {
    // Arrange
    const req = mockReq({ body: { configType: 'ec-company-to-order', name: 'テスト' } })
    const res = mockRes()

    // Act
    await createConfig(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(createMappingConfig).not.toHaveBeenCalled()
  })

  it('mappings が配列でない場合 400 を返す / returns 400 when mappings is not an array', async () => {
    // Arrange
    const req = mockReq({
      body: { configType: 'ec-company-to-order', name: 'テスト', mappings: 'invalid' },
    })
    const res = mockRes()

    // Act
    await createConfig(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(createMappingConfig).not.toHaveBeenCalled()
  })

  it('body が空オブジェクトの場合 400 を返す / returns 400 when body is empty object', async () => {
    // Arrange
    const req = mockReq({ body: {} })
    const res = mockRes()

    // Act
    await createConfig(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(createMappingConfig).not.toHaveBeenCalled()
  })

  it('サービスエラー時に 500 を返す / returns 500 on service error', async () => {
    // Arrange
    vi.mocked(createMappingConfig).mockRejectedValue(new Error('DB error'))

    const req = mockReq({
      body: { configType: 'ec-company-to-order', name: 'テスト', mappings: [] },
    })
    const res = mockRes()

    // Act
    await createConfig(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Failed to create mapping config' }),
    )
  })
})

// ─── listConfigs ────────────────────────────────────────────────

describe('listConfigs', () => {
  beforeEach(() => vi.clearAllMocks())

  it('クエリなしで全設定を返す / returns all configs without query params', async () => {
    // Arrange
    const configs = [fakeMappingConfig()]
    vi.mocked(getAllMappingConfigs).mockResolvedValue(configs as any)

    const req = mockReq({ query: {} })
    const res = mockRes()

    // Act
    await listConfigs(req, res)

    // Assert: configType=undefined, searchParams=undefined で呼ばれる
    // called with configType=undefined, searchParams=undefined
    expect(getAllMappingConfigs).toHaveBeenCalledWith(undefined, undefined)
    expect(res.json).toHaveBeenCalledWith(configs)
  })

  it('configType クエリを渡す / passes configType query to service', async () => {
    // Arrange
    vi.mocked(getAllMappingConfigs).mockResolvedValue([] as any)

    const req = mockReq({ query: { configType: 'ec-company-to-order' } })
    const res = mockRes()

    // Act
    await listConfigs(req, res)

    // Assert
    expect(getAllMappingConfigs).toHaveBeenCalledWith(
      'ec-company-to-order',
      undefined,
    )
  })

  it('name クエリを searchParams に含める / includes name in searchParams', async () => {
    // Arrange
    vi.mocked(getAllMappingConfigs).mockResolvedValue([] as any)

    const req = mockReq({ query: { name: '設定A' } })
    const res = mockRes()

    // Act
    await listConfigs(req, res)

    // Assert
    expect(getAllMappingConfigs).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ name: '設定A' }),
    )
  })

  it('orderSourceCompanyName クエリを searchParams に含める / includes orderSourceCompanyName in searchParams', async () => {
    // Arrange
    vi.mocked(getAllMappingConfigs).mockResolvedValue([] as any)

    const req = mockReq({ query: { orderSourceCompanyName: 'テスト会社' } })
    const res = mockRes()

    // Act
    await listConfigs(req, res)

    // Assert
    expect(getAllMappingConfigs).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ orderSourceCompanyName: 'テスト会社' }),
    )
  })

  it('isDefault=true を boolean に変換する / converts isDefault=true string to boolean true', async () => {
    // Arrange
    vi.mocked(getAllMappingConfigs).mockResolvedValue([] as any)

    const req = mockReq({ query: { isDefault: 'true' } })
    const res = mockRes()

    // Act
    await listConfigs(req, res)

    // Assert: 文字列 "true" → boolean true に変換 / "true" string → boolean true
    expect(getAllMappingConfigs).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ isDefault: true }),
    )
  })

  it('isDefault=1 を boolean に変換する / converts isDefault=1 string to boolean true', async () => {
    // Arrange
    vi.mocked(getAllMappingConfigs).mockResolvedValue([] as any)

    const req = mockReq({ query: { isDefault: '1' } })
    const res = mockRes()

    // Act
    await listConfigs(req, res)

    // Assert
    expect(getAllMappingConfigs).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ isDefault: true }),
    )
  })

  it('isDefault=false を boolean に変換する / converts isDefault=false string to boolean false', async () => {
    // Arrange
    vi.mocked(getAllMappingConfigs).mockResolvedValue([] as any)

    const req = mockReq({ query: { isDefault: 'false' } })
    const res = mockRes()

    // Act
    await listConfigs(req, res)

    // Assert
    expect(getAllMappingConfigs).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ isDefault: false }),
    )
  })

  it('description クエリを searchParams に含める / includes description in searchParams', async () => {
    // Arrange
    vi.mocked(getAllMappingConfigs).mockResolvedValue([] as any)

    const req = mockReq({ query: { description: '説明テキスト' } })
    const res = mockRes()

    // Act
    await listConfigs(req, res)

    // Assert
    expect(getAllMappingConfigs).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ description: '説明テキスト' }),
    )
  })

  it('複数クエリを同時に渡す / passes multiple query params simultaneously', async () => {
    // Arrange
    vi.mocked(getAllMappingConfigs).mockResolvedValue([] as any)

    const req = mockReq({
      query: { configType: 'ec-company-to-order', name: '設定A', isDefault: 'true' },
    })
    const res = mockRes()

    // Act
    await listConfigs(req, res)

    // Assert
    expect(getAllMappingConfigs).toHaveBeenCalledWith(
      'ec-company-to-order',
      expect.objectContaining({ name: '設定A', isDefault: true }),
    )
  })

  it('サービスエラー時に 500 を返す / returns 500 on service error', async () => {
    // Arrange
    vi.mocked(getAllMappingConfigs).mockRejectedValue(new Error('connection lost'))

    const req = mockReq({ query: {} })
    const res = mockRes()

    // Act
    await listConfigs(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Failed to list mapping configs' }),
    )
  })
})

// ─── getConfigById ──────────────────────────────────────────────

describe('getConfigById', () => {
  beforeEach(() => vi.clearAllMocks())

  it('存在する ID で設定を返す / returns config for existing ID', async () => {
    // Arrange
    const config = fakeMappingConfig()
    vi.mocked(getMappingConfigById).mockResolvedValue(config as any)

    const req = mockReq({ params: { id: 'cfg-001' } })
    const res = mockRes()

    // Act
    await getConfigById(req, res)

    // Assert
    expect(getMappingConfigById).toHaveBeenCalledWith('cfg-001')
    expect(res.json).toHaveBeenCalledWith(config)
  })

  it('存在しない ID の場合 404 を返す / returns 404 when config not found', async () => {
    // Arrange
    vi.mocked(getMappingConfigById).mockResolvedValue(null as any)

    const req = mockReq({ params: { id: 'nonexistent' } })
    const res = mockRes()

    // Act
    await getConfigById(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: 'Mapping config not found' })
  })

  it('サービスエラー時に 500 を返す / returns 500 on service error', async () => {
    // Arrange
    vi.mocked(getMappingConfigById).mockRejectedValue(new Error('DB timeout'))

    const req = mockReq({ params: { id: 'cfg-001' } })
    const res = mockRes()

    // Act
    await getConfigById(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Failed to get mapping config' }),
    )
  })
})

// ─── updateConfig ───────────────────────────────────────────────

describe('updateConfig', () => {
  beforeEach(() => vi.clearAllMocks())

  it('存在する設定を正常に更新し返す / updates existing config and returns it', async () => {
    // Arrange
    const updated = fakeMappingConfig({ name: '更新後名称' })
    vi.mocked(updateMappingConfig).mockResolvedValue(updated as any)

    const req = mockReq({ params: { id: 'cfg-001' }, body: { name: '更新後名称' } })
    const res = mockRes()

    // Act
    await updateConfig(req, res)

    // Assert
    expect(updateMappingConfig).toHaveBeenCalledWith('cfg-001', { name: '更新後名称' })
    expect(res.json).toHaveBeenCalledWith(updated)
  })

  it('存在しない ID の場合 404 を返す / returns 404 when config not found', async () => {
    // Arrange
    vi.mocked(updateMappingConfig).mockResolvedValue(null as any)

    const req = mockReq({ params: { id: 'ghost' }, body: { name: '更新' } })
    const res = mockRes()

    // Act
    await updateConfig(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: 'Mapping config not found' })
  })

  it('body が空でも動作する / works with empty body (partial update)', async () => {
    // Arrange
    const config = fakeMappingConfig()
    vi.mocked(updateMappingConfig).mockResolvedValue(config as any)

    const req = mockReq({ params: { id: 'cfg-001' }, body: {} })
    const res = mockRes()

    // Act
    await updateConfig(req, res)

    // Assert: 空の DTO で呼ばれる / called with empty DTO
    expect(updateMappingConfig).toHaveBeenCalledWith('cfg-001', {})
    expect(res.json).toHaveBeenCalledWith(config)
  })

  it('サービスエラー時に 500 を返す / returns 500 on service error', async () => {
    // Arrange
    vi.mocked(updateMappingConfig).mockRejectedValue(new Error('write failed'))

    const req = mockReq({ params: { id: 'cfg-001' }, body: { name: '更新' } })
    const res = mockRes()

    // Act
    await updateConfig(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Failed to update mapping config' }),
    )
  })
})

// ─── deleteConfig ───────────────────────────────────────────────

describe('deleteConfig', () => {
  beforeEach(() => vi.clearAllMocks())

  it('設定を削除し 204 を返す / deletes config and returns 204', async () => {
    // Arrange
    vi.mocked(deleteMappingConfig).mockResolvedValue(true)

    const req = mockReq({ params: { id: 'cfg-001' } })
    const res = mockRes()

    // Act
    await deleteConfig(req, res)

    // Assert: 204 No Content / 204 no-content response
    expect(deleteMappingConfig).toHaveBeenCalledWith('cfg-001')
    expect(res.status).toHaveBeenCalledWith(204)
    expect(res.send).toHaveBeenCalled()
  })

  it('存在しない ID の場合 404 を返す / returns 404 when config not found', async () => {
    // Arrange
    vi.mocked(deleteMappingConfig).mockResolvedValue(false)

    const req = mockReq({ params: { id: 'ghost' } })
    const res = mockRes()

    // Act
    await deleteConfig(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: 'Mapping config not found' })
  })

  it('サービスエラー時に 500 を返す / returns 500 on service error', async () => {
    // Arrange
    vi.mocked(deleteMappingConfig).mockRejectedValue(new Error('delete failed'))

    const req = mockReq({ params: { id: 'cfg-001' } })
    const res = mockRes()

    // Act
    await deleteConfig(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Failed to delete mapping config' }),
    )
  })
})

// ─── getDefaultConfig ───────────────────────────────────────────

describe('getDefaultConfig', () => {
  beforeEach(() => vi.clearAllMocks())

  it('有効な configType でデフォルト設定を返す / returns default config for valid configType', async () => {
    // Arrange
    const config = fakeMappingConfig({ isDefault: true })
    vi.mocked(getDefaultMappingConfig).mockResolvedValue(config as any)

    const req = mockReq({ query: { configType: 'shipment-order' } })
    const res = mockRes()

    // Act
    await getDefaultConfig(req, res)

    // Assert
    expect(getDefaultMappingConfig).toHaveBeenCalledWith('shipment-order')
    expect(res.json).toHaveBeenCalledWith(config)
  })

  it('configType が欠落している場合 400 を返す / returns 400 when configType is missing', async () => {
    // Arrange
    const req = mockReq({ query: {} })
    const res = mockRes()

    // Act
    await getDefaultConfig(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Invalid or missing configType parameter' }),
    )
    expect(getDefaultMappingConfig).not.toHaveBeenCalled()
  })

  it('configType が空文字の場合 400 を返す / returns 400 when configType is empty string', async () => {
    // Arrange
    const req = mockReq({ query: { configType: '' } })
    const res = mockRes()

    // Act
    await getDefaultConfig(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(getDefaultMappingConfig).not.toHaveBeenCalled()
  })

  it('デフォルト設定が見つからない場合 404 を返す / returns 404 when default config not found', async () => {
    // Arrange
    vi.mocked(getDefaultMappingConfig).mockResolvedValue(null as any)

    const req = mockReq({ query: { configType: 'ec-company-to-order' } })
    const res = mockRes()

    // Act
    await getDefaultConfig(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: 'Default mapping config not found' })
  })

  it('サービスエラー時に 500 を返す / returns 500 on service error', async () => {
    // Arrange
    vi.mocked(getDefaultMappingConfig).mockRejectedValue(new Error('query failed'))

    const req = mockReq({ query: { configType: 'ec-company-to-order' } })
    const res = mockRes()

    // Act
    await getDefaultConfig(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Failed to get default mapping config' }),
    )
  })
})

// ─── getTransformPlugins ────────────────────────────────────────

describe('getTransformPlugins', () => {
  beforeEach(() => vi.clearAllMocks())

  it('空のメタデータで transforms と combines を返す / returns transforms and combines for empty metadata', async () => {
    // Arrange: モックは [] で設定済み / mocks already set to []
    const req = mockReq()
    const res = mockRes()

    // Act
    await getTransformPlugins(req, res)

    // Assert: 空配列の形式で返す / returns with empty array shape
    expect(res.json).toHaveBeenCalledWith({
      transforms: [],
      combines: [],
    })
  })

  it('paramsSchema なしのプラグインが正しくシリアライズされる / serializes plugins without paramsSchema correctly', async () => {
    // Arrange: paramsSchema を持たないプラグインを設定 / setup plugins without paramsSchema
    vi.mocked(transformPluginsMetadata as any[]).splice(
      0,
      Infinity,
      {
        name: 'string.trim',
        nameJa: '空白削除',
        summary: 'Trim whitespace',
        inputKinds: ['string'],
        outputKind: 'string',
        outputType: 'string',
        descriptionJa: 'テスト',
        sideEffects: false,
        // paramsSchema なし / no paramsSchema
      },
    )

    const req = mockReq()
    const res = mockRes()

    // Act
    await getTransformPlugins(req, res)

    // Assert: paramsSchema は undefined になる / paramsSchema should be undefined
    const callArg = (res.json.mock.calls[0] as any)?.[0]
    expect(callArg.transforms[0]).toMatchObject({
      name: 'string.trim',
      nameJa: '空白削除',
      paramsSchema: undefined,
    })
  })

  it('paramsSchema を持つプラグインが JSON Schema に変換される / converts plugins with paramsSchema to JSON Schema', async () => {
    // Arrange: paramsSchema を持つプラグインを設定 / setup plugin with paramsSchema
    const { z } = await import('zod')
    vi.mocked(transformPluginsMetadata as any[]).splice(
      0,
      Infinity,
      {
        name: 'string.pad',
        nameJa: 'パディング',
        summary: 'Pad string',
        inputKinds: ['string'],
        outputKind: 'string',
        outputType: 'string',
        descriptionJa: 'テスト',
        sideEffects: false,
        paramsSchema: z.object({
          targetLength: z.number(),
          padChar: z.string().default('0'),
        }),
      },
    )

    const req = mockReq()
    const res = mockRes()

    // Act
    await getTransformPlugins(req, res)

    // Assert: paramsSchema が JSON Schema オブジェクトに変換される
    // paramsSchema converted to JSON Schema object
    const callArg = (res.json.mock.calls[0] as any)?.[0]
    expect(callArg.transforms[0].paramsSchema).toBeDefined()
    expect(callArg.transforms[0].paramsSchema.type).toBe('object')
    expect(callArg.transforms[0].paramsSchema.properties).toHaveProperty('targetLength')
    expect(callArg.transforms[0].paramsSchema.properties).toHaveProperty('padChar')
  })

  it('ZodDefault プロパティにデフォルト値が含まれる / includes default value for ZodDefault properties', async () => {
    // Arrange
    const { z } = await import('zod')
    vi.mocked(transformPluginsMetadata as any[]).splice(
      0,
      Infinity,
      {
        name: 'string.pad',
        nameJa: 'パディング',
        summary: 'Pad string',
        paramsSchema: z.object({
          padChar: z.string().default('0'),
        }),
      },
    )

    const req = mockReq()
    const res = mockRes()

    // Act
    await getTransformPlugins(req, res)

    // Assert: default 値が properties に含まれる / default value included in properties
    const callArg = (res.json.mock.calls[0] as any)?.[0]
    expect(callArg.transforms[0].paramsSchema.properties.padChar).toMatchObject({
      type: 'string',
      default: '0',
    })
  })

  it('ZodEnum プロパティが enum 配列を含む / includes enum array for ZodEnum properties', async () => {
    // Arrange
    const { z } = await import('zod')
    vi.mocked(transformPluginsMetadata as any[]).splice(
      0,
      Infinity,
      {
        name: 'string.pad',
        nameJa: 'パディング',
        summary: 'Pad string',
        paramsSchema: z.object({
          position: z.enum(['start', 'end']).default('start'),
        }),
      },
    )

    const req = mockReq()
    const res = mockRes()

    // Act
    await getTransformPlugins(req, res)

    // Assert: enum 値が含まれる / enum values included
    const callArg = (res.json.mock.calls[0] as any)?.[0]
    expect(callArg.transforms[0].paramsSchema.properties.position).toMatchObject({
      type: 'string',
      enum: ['start', 'end'],
    })
  })

  it('combine プラグインが正しくシリアライズされる / serializes combine plugins correctly', async () => {
    // Arrange
    vi.mocked(combinePluginsMetadata as any[]).splice(
      0,
      Infinity,
      {
        name: 'concat',
        nameJa: '結合',
        summary: 'Concatenate strings',
        // paramsSchema なし / no paramsSchema
      },
    )

    const req = mockReq()
    const res = mockRes()

    // Act
    await getTransformPlugins(req, res)

    // Assert
    const callArg = (res.json.mock.calls[0] as any)?.[0]
    expect(callArg.combines[0]).toMatchObject({
      name: 'concat',
      nameJa: '結合',
      summary: 'Concatenate strings',
      paramsSchema: undefined,
    })
  })

  it('エラー時に 500 を返す / returns 500 on error', async () => {
    // Arrange: transformPluginsMetadata の map を強制エラーにする
    // Force error by making transformPluginsMetadata.map throw
    const originalMap = Array.prototype.map
    const mapSpy = vi.spyOn(Array.prototype, 'map').mockImplementationOnce(() => {
      throw new Error('metadata error')
    })

    const req = mockReq()
    const res = mockRes()

    // Act
    await getTransformPlugins(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Failed to get transform plugins' }),
    )

    mapSpy.mockRestore()
  })
})

// ─── zodToJsonSchema (内部関数のカバレッジ) ─────────────────────
// Coverage for internal zodToJsonSchema via getTransformPlugins

describe('zodToJsonSchema (via getTransformPlugins)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ZodBoolean プロパティを正しく変換する / correctly converts ZodBoolean property', async () => {
    // Arrange
    const { z } = await import('zod')
    vi.mocked(transformPluginsMetadata as any[]).splice(
      0,
      Infinity,
      {
        name: 'plugin.bool',
        nameJa: 'テスト',
        summary: 'test',
        paramsSchema: z.object({ flag: z.boolean() }),
      },
    )

    const req = mockReq()
    const res = mockRes()

    // Act
    await getTransformPlugins(req, res)

    // Assert
    const callArg = (res.json.mock.calls[0] as any)?.[0]
    expect(callArg.transforms[0].paramsSchema.properties.flag).toMatchObject({ type: 'boolean' })
  })

  it('ZodArray プロパティを正しく変換する / correctly converts ZodArray property', async () => {
    // Arrange
    const { z } = await import('zod')
    vi.mocked(transformPluginsMetadata as any[]).splice(
      0,
      Infinity,
      {
        name: 'plugin.arr',
        nameJa: 'テスト',
        summary: 'test',
        paramsSchema: z.object({ items: z.array(z.string()) }),
      },
    )

    const req = mockReq()
    const res = mockRes()

    // Act
    await getTransformPlugins(req, res)

    // Assert
    const callArg = (res.json.mock.calls[0] as any)?.[0]
    expect(callArg.transforms[0].paramsSchema.properties.items).toMatchObject({
      type: 'array',
      items: { type: 'string' },
    })
  })

  it('ZodLiteral プロパティを正しく変換する / correctly converts ZodLiteral property', async () => {
    // Arrange
    const { z } = await import('zod')
    vi.mocked(transformPluginsMetadata as any[]).splice(
      0,
      Infinity,
      {
        name: 'plugin.lit',
        nameJa: 'テスト',
        summary: 'test',
        paramsSchema: z.object({ mode: z.literal('fixed') }),
      },
    )

    const req = mockReq()
    const res = mockRes()

    // Act
    await getTransformPlugins(req, res)

    // Assert
    const callArg = (res.json.mock.calls[0] as any)?.[0]
    expect(callArg.transforms[0].paramsSchema.properties.mode).toMatchObject({
      type: 'string',
      const: 'fixed',
    })
  })

  it('未知の Zod 型は type: any として出力される / unknown Zod types output as type: any', async () => {
    // Arrange: 標準外の型を _def で直接モックする / directly mock non-standard type via _def
    const fakeUnknownSchema = {
      _def: {
        typeName: 'ZodObject',
        shape: () => ({
          weirdProp: { _def: { typeName: 'ZodUnknownType' } },
        }),
      },
    }
    vi.mocked(transformPluginsMetadata as any[]).splice(
      0,
      Infinity,
      {
        name: 'plugin.unknown',
        nameJa: 'テスト',
        summary: 'test',
        paramsSchema: fakeUnknownSchema,
      },
    )

    const req = mockReq()
    const res = mockRes()

    // Act
    await getTransformPlugins(req, res)

    // Assert: 未知の型は { type: 'any' } / unknown type maps to { type: 'any' }
    const callArg = (res.json.mock.calls[0] as any)?.[0]
    expect(callArg.transforms[0].paramsSchema.properties.weirdProp).toMatchObject({ type: 'any' })
  })

  it('ZodObject でないスキーマは { type: any } を返す / returns { type: any } for non-ZodObject schema', async () => {
    // Arrange: ZodObject 以外のスキーマを渡す / pass non-ZodObject schema
    const { z } = await import('zod')
    vi.mocked(transformPluginsMetadata as any[]).splice(
      0,
      Infinity,
      {
        name: 'plugin.str',
        nameJa: 'テスト',
        summary: 'test',
        paramsSchema: z.string(), // ZodString (not ZodObject)
      },
    )

    const req = mockReq()
    const res = mockRes()

    // Act
    await getTransformPlugins(req, res)

    // Assert: ZodObject 以外は { type: 'any' } / non-ZodObject returns { type: 'any' }
    const callArg = (res.json.mock.calls[0] as any)?.[0]
    expect(callArg.transforms[0].paramsSchema).toMatchObject({ type: 'any' })
  })

  it('Optional フィールドは required 配列に含まれない / optional fields are not in required array', async () => {
    // Arrange
    const { z } = await import('zod')
    vi.mocked(transformPluginsMetadata as any[]).splice(
      0,
      Infinity,
      {
        name: 'plugin.opt',
        nameJa: 'テスト',
        summary: 'test',
        paramsSchema: z.object({
          required: z.string(),
          optional: z.string().optional(),
        }),
      },
    )

    const req = mockReq()
    const res = mockRes()

    // Act
    await getTransformPlugins(req, res)

    // Assert: optional フィールドは required に含まれない
    // optional field is not in required array
    const callArg = (res.json.mock.calls[0] as any)?.[0]
    const schema = callArg.transforms[0].paramsSchema
    expect(schema.required).toContain('required')
    expect(schema.required).not.toContain('optional')
  })

  it('全フィールドが optional の場合 required は undefined になる / required is undefined when all fields are optional', async () => {
    // Arrange
    const { z } = await import('zod')
    vi.mocked(transformPluginsMetadata as any[]).splice(
      0,
      Infinity,
      {
        name: 'plugin.allopt',
        nameJa: 'テスト',
        summary: 'test',
        paramsSchema: z.object({
          a: z.string().optional(),
          b: z.number().optional(),
        }),
      },
    )

    const req = mockReq()
    const res = mockRes()

    // Act
    await getTransformPlugins(req, res)

    // Assert: required 配列なし / no required array
    const callArg = (res.json.mock.calls[0] as any)?.[0]
    const schema = callArg.transforms[0].paramsSchema
    expect(schema.required).toBeUndefined()
  })
})
