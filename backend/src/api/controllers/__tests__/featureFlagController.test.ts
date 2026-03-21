/**
 * featureFlagController 単元テスト / featureFlagController 单元测试
 *
 * フィーチャーフラグ管理 CRUD + toggle + tenant override のテスト
 * 功能开关管理 CRUD + 切换 + 租户覆盖测试
 *
 * モック方針 / Mock strategy:
 * - extensionManager.getFeatureFlagService() をモック
 *   Mock extensionManager.getFeatureFlagService()
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言（hoisted） / 模块Mock声明（提升） ──────────

const mockService = {
  getAllFlags: vi.fn(),
  getFlagsForTenant: vi.fn(),
  createFlag: vi.fn(),
  updateFlag: vi.fn(),
  deleteFlag: vi.fn(),
  toggleFlag: vi.fn(),
  setTenantOverride: vi.fn(),
  removeTenantOverride: vi.fn(),
}

vi.mock('@/core/extensions', () => ({
  extensionManager: {
    getFeatureFlagService: vi.fn(() => mockService),
  },
}))

// ─── インポート / 导入 ──────────

import {
  listFlags,
  getFlagStatus,
  createFlag,
  updateFlag,
  deleteFlag,
  toggleFlag,
  setTenantOverride,
  removeTenantOverride,
} from '../featureFlagController'

// ─── テストユーティリティ / 测试工具 ────────────────────────

const mockReq = (overrides = {}) =>
  ({
    query: {},
    params: {},
    body: {},
    headers: {},
    user: { id: 'u1', tenantId: 'T1' },
    ...overrides,
  }) as any

const mockRes = () => {
  const res: any = { json: vi.fn(), status: vi.fn() }
  res.status.mockReturnValue(res)
  return res
}

// ─── listFlags テスト / listFlags 测试 ──────────

describe('listFlags / フラグ一覧 / 获取所有功能开关', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // 正常系 / 正常情况
  it('全フラグを返す / 返回所有功能开关', async () => {
    const flags = [{ key: 'feat_a', defaultEnabled: true }]
    mockService.getAllFlags.mockResolvedValue(flags)

    const req = mockReq()
    const res = mockRes()
    await listFlags(req, res)

    expect(res.json).toHaveBeenCalledWith({ data: flags })
  })

  // 異常系 / 异常情况
  it('エラー時に 500 を返す / 错误时返回500', async () => {
    mockService.getAllFlags.mockRejectedValue(new Error('Service error'))

    const req = mockReq()
    const res = mockRes()
    await listFlags(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── getFlagStatus テスト / getFlagStatus 测试 ──────────

describe('getFlagStatus / テナントフラグ状態 / 获取租户功能状态', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // 正常系: テナント指定 / 正常情况：指定租户
  it('テナント別のフラグ状態を返す / 返回租户的功能状态', async () => {
    const flagMap = { feat_a: true, feat_b: false }
    mockService.getFlagsForTenant.mockResolvedValue(flagMap)

    const req = mockReq({ query: { tenantId: 'T1' } })
    const res = mockRes()
    await getFlagStatus(req, res)

    expect(mockService.getFlagsForTenant).toHaveBeenCalledWith('T1')
    expect(res.json).toHaveBeenCalledWith({ data: flagMap })
  })

  // 正常系: テナント未指定 / 正常情况：未指定租户
  it('テナント未指定で全体のフラグを返す / 未指定租户时返回全局功能状态', async () => {
    mockService.getFlagsForTenant.mockResolvedValue({})

    const req = mockReq()
    const res = mockRes()
    await getFlagStatus(req, res)

    expect(mockService.getFlagsForTenant).toHaveBeenCalledWith(undefined)
  })
})

// ─── createFlag テスト / createFlag 测试 ──────────

describe('createFlag / フラグ作成 / 创建功能开关', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // 正常系: 作成成功 → 201 / 正常情况：创建成功 → 201
  it('新しいフラグを作成して 201 を返す / 创建新功能开关返回201', async () => {
    const flag = { _id: 'f1', key: 'feat_new', defaultEnabled: false }
    mockService.createFlag.mockResolvedValue(flag)

    const req = mockReq({ body: { key: 'feat_new', defaultEnabled: false } })
    const res = mockRes()
    await createFlag(req, res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(flag)
  })

  // 異常系: 重複 → 409 / 异常情况：重复 → 409
  it('重複キーで 409 を返す / 重复key返回409', async () => {
    mockService.createFlag.mockRejectedValue(new Error('duplicate key error'))

    const req = mockReq({ body: { key: 'feat_dup' } })
    const res = mockRes()
    await createFlag(req, res)

    expect(res.status).toHaveBeenCalledWith(409)
  })

  // 異常系: その他のエラー → 400 / 异常情况：其他错误 → 400
  it('バリデーションエラーで 400 を返す / 验证错误返回400', async () => {
    mockService.createFlag.mockRejectedValue(new Error('key is required'))

    const req = mockReq({ body: {} })
    const res = mockRes()
    await createFlag(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })
})

// ─── updateFlag テスト / updateFlag 测试 ──────────

describe('updateFlag / フラグ更新 / 更新功能开关', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // 正常系 / 正常情况
  it('フラグを更新して返す / 更新功能开关并返回', async () => {
    const flag = { _id: 'f1', key: 'feat_a', defaultEnabled: true }
    mockService.updateFlag.mockResolvedValue(flag)

    const req = mockReq({ params: { id: 'f1' }, body: { defaultEnabled: true } })
    const res = mockRes()
    await updateFlag(req, res)

    expect(res.json).toHaveBeenCalledWith(flag)
  })

  // 異常系: 見つからない → 404 / 异常情况：未找到 → 404
  it('フラグが見つからない場合 404 を返す / 功能开关未找到时返回404', async () => {
    mockService.updateFlag.mockResolvedValue(null)

    const req = mockReq({ params: { id: 'nonexistent' }, body: {} })
    const res = mockRes()
    await updateFlag(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
  })
})

// ─── deleteFlag テスト / deleteFlag 测试 ──────────

describe('deleteFlag / フラグ削除 / 删除功能开关', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // 正常系 / 正常情况
  it('フラグを削除してメッセージを返す / 删除功能开关并返回消息', async () => {
    mockService.deleteFlag.mockResolvedValue(true)

    const req = mockReq({ params: { id: 'f1' } })
    const res = mockRes()
    await deleteFlag(req, res)

    expect(res.json).toHaveBeenCalledWith({ message: 'フィーチャーフラグを削除しました' })
  })

  // 異常系: 見つからない → 404 / 异常情况：未找到 → 404
  it('フラグが見つからない場合 404 を返す / 功能开关未找到时返回404', async () => {
    mockService.deleteFlag.mockResolvedValue(null)

    const req = mockReq({ params: { id: 'nonexistent' } })
    const res = mockRes()
    await deleteFlag(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
  })
})

// ─── toggleFlag テスト / toggleFlag 测试 ──────────

describe('toggleFlag / フラグトグル / 切换功能开关', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // 正常系 / 正常情况
  it('フラグをトグルして返す / 切换功能开关并返回', async () => {
    const flag = { _id: 'f1', key: 'feat_a', defaultEnabled: false }
    mockService.toggleFlag.mockResolvedValue(flag)

    const req = mockReq({ params: { id: 'f1' } })
    const res = mockRes()
    await toggleFlag(req, res)

    expect(res.json).toHaveBeenCalledWith({ _id: 'f1', key: 'feat_a', defaultEnabled: false })
  })

  // 異常系: 見つからない → 404 / 异常情况：未找到 → 404
  it('フラグが見つからない場合 404 を返す / 功能开关未找到时返回404', async () => {
    mockService.toggleFlag.mockResolvedValue(null)

    const req = mockReq({ params: { id: 'nonexistent' } })
    const res = mockRes()
    await toggleFlag(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
  })
})

// ─── setTenantOverride テスト / setTenantOverride 测试 ──────────

describe('setTenantOverride / テナントオーバーライド設定 / 设置租户覆盖', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // 正常系 / 正常情况
  it('テナントオーバーライドを設定する / 设置租户覆盖', async () => {
    const flag = { _id: 'f1', key: 'feat_a', tenantOverrides: [{ tenantId: 'T1', enabled: true }] }
    mockService.setTenantOverride.mockResolvedValue(flag)

    const req = mockReq({ params: { id: 'f1' }, body: { tenantId: 'T1', enabled: true } })
    const res = mockRes()
    await setTenantOverride(req, res)

    expect(res.json).toHaveBeenCalledWith(flag)
  })

  // 異常系: バリデーションエラー → 400 / 异常情况：验证错误 → 400
  it('tenantId/enabled が不足している場合 400 を返す / 缺少tenantId/enabled时返回400', async () => {
    const req = mockReq({ params: { id: 'f1' }, body: { tenantId: 'T1' } })
    const res = mockRes()
    await setTenantOverride(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  // 異常系: フラグが見つからない → 404 / 异常情况：功能开关未找到 → 404
  it('フラグが見つからない場合 404 を返す / 功能开关未找到时返回404', async () => {
    mockService.setTenantOverride.mockResolvedValue(null)

    const req = mockReq({ params: { id: 'nonexistent' }, body: { tenantId: 'T1', enabled: true } })
    const res = mockRes()
    await setTenantOverride(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
  })
})

// ─── removeTenantOverride テスト / removeTenantOverride 测试 ──────────

describe('removeTenantOverride / テナントオーバーライド削除 / 删除租户覆盖', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // 正常系 / 正常情况
  it('テナントオーバーライドを削除する / 删除租户覆盖', async () => {
    const flag = { _id: 'f1', key: 'feat_a', tenantOverrides: [] }
    mockService.removeTenantOverride.mockResolvedValue(flag)

    const req = mockReq({ params: { id: 'f1', tenantId: 'T1' } })
    const res = mockRes()
    await removeTenantOverride(req, res)

    expect(res.json).toHaveBeenCalledWith(flag)
  })

  // 異常系: 見つからない → 404 / 异常情况：未找到 → 404
  it('フラグが見つからない場合 404 を返す / 功能开关未找到时返回404', async () => {
    mockService.removeTenantOverride.mockResolvedValue(null)

    const req = mockReq({ params: { id: 'nonexistent', tenantId: 'T1' } })
    const res = mockRes()
    await removeTenantOverride(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
  })
})
