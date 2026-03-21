/**
 * pluginController 单元测试 / pluginController ユニットテスト
 *
 * 插件管理 API（列表 + 启用/禁用 + 配置 + 健康检查 + SDK 信息）
 * プラグイン管理 API（一覧 + 有効/無効 + 設定 + ヘルスチェック + SDK 情報）
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言（hoisted） / 模块mock声明 ─────────────────

const mockPluginManager = {
  getInstalledPlugins: vi.fn(),
  getPlugin: vi.fn(),
  enable: vi.fn(),
  disable: vi.fn(),
  getConfig: vi.fn(),
  updatePluginConfig: vi.fn(),
  healthCheck: vi.fn(),
  healthCheckAll: vi.fn(),
  getSdkInfo: vi.fn(),
}

vi.mock('@/core/extensions', () => ({
  extensionManager: {
    getPluginManager: () => mockPluginManager,
  },
}))

vi.mock('@/models/plugin', () => ({
  Plugin: {
    find: vi.fn(),
    findOne: vi.fn(),
  },
}))

import { Plugin } from '@/models/plugin'
import {
  listPlugins,
  getPlugin,
  enablePlugin,
  disablePlugin,
  getPluginConfig,
  updatePluginConfig,
  pluginHealthCheck,
  pluginsHealthDashboard,
  getSdkInfo,
} from '@/api/controllers/pluginController'

// ─── テストユーティリティ / 测试工具函数 ───────────────────────────

const mockReq = (overrides = {}) =>
  ({ query: {}, params: {}, body: {}, headers: {}, user: { id: 'u1', tenantId: 'T1' }, ...overrides }) as any

const mockRes = () => {
  const res: any = { json: vi.fn(), status: vi.fn() }
  res.status.mockReturnValue(res)
  return res
}

// ─── テスト / 测试 ─────────────────────────────────────────────────

describe('pluginController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // 插件列表 / プラグイン一覧
  describe('listPlugins', () => {
    it('メモリとDBをマージして返す / 合并内存和数据库数据', async () => {
      const memPlugins = [{ name: 'p1', version: '1.0' }, { name: 'p2', version: '2.0' }]
      mockPluginManager.getInstalledPlugins.mockReturnValue(memPlugins)
      ;(Plugin.find as any).mockReturnValue({ lean: () => [{ name: 'p1', installedAt: '2026-01-01', enabledAt: '2026-01-02', errorMessage: null }] })

      const res = mockRes()
      await listPlugins(mockReq(), res)

      expect(res.json).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ name: 'p1', installedAt: '2026-01-01' }),
          expect.objectContaining({ name: 'p2' }),
        ]),
      })
    })

    it('エラー時 500 を返す / 错误时返回500', async () => {
      mockPluginManager.getInstalledPlugins.mockImplementation(() => { throw new Error('fail') })
      const res = mockRes()
      await listPlugins(mockReq(), res)
      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  // 插件详情 / プラグイン詳細
  describe('getPlugin', () => {
    it('プラグインが見つかった場合、DB情報を補足して返す / 找到插件时补充DB信息', async () => {
      mockPluginManager.getPlugin.mockReturnValue({ name: 'p1', version: '1.0' })
      ;(Plugin.findOne as any).mockReturnValue({ lean: () => ({ name: 'p1', installedAt: '2026-01-01' }) })

      const res = mockRes()
      await getPlugin(mockReq({ params: { name: 'p1' } }), res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ name: 'p1', installedAt: '2026-01-01' }))
    })

    it('プラグインが見つからない場合 404 / 找不到插件返回404', async () => {
      mockPluginManager.getPlugin.mockReturnValue(null)
      const res = mockRes()
      await getPlugin(mockReq({ params: { name: 'unknown' } }), res)
      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  // 启用/禁用 / 有効/無効
  describe('enablePlugin', () => {
    it('有効化成功メッセージを返す / 返回启用成功消息', async () => {
      mockPluginManager.enable.mockResolvedValue(undefined)
      const res = mockRes()
      await enablePlugin(mockReq({ params: { name: 'p1' } }), res)
      expect(res.json).toHaveBeenCalledWith({ message: 'Plugin p1 enabled / プラグイン p1 有効化' })
    })
  })

  describe('disablePlugin', () => {
    it('無効化成功メッセージを返す / 返回禁用成功消息', async () => {
      mockPluginManager.disable.mockResolvedValue(undefined)
      const res = mockRes()
      await disablePlugin(mockReq({ params: { name: 'p1' } }), res)
      expect(res.json).toHaveBeenCalledWith({ message: 'Plugin p1 disabled / プラグイン p1 無効化' })
    })
  })

  // 配置 / 設定
  describe('getPluginConfig', () => {
    it('テナント指定で設定を返す / 指定租户返回配置', async () => {
      const configData = { key: 'val' }
      mockPluginManager.getConfig.mockResolvedValue(configData)
      const res = mockRes()
      await getPluginConfig(mockReq({ params: { name: 'p1' }, query: { tenantId: 'T2' } }), res)
      expect(mockPluginManager.getConfig).toHaveBeenCalledWith('p1', 'T2')
      expect(res.json).toHaveBeenCalledWith({ data: configData })
    })

    it('テナント未指定時は _default を使用 / 未指定租户时使用_default', async () => {
      mockPluginManager.getConfig.mockResolvedValue({})
      const res = mockRes()
      await getPluginConfig(mockReq({ params: { name: 'p1' }, query: {} }), res)
      expect(mockPluginManager.getConfig).toHaveBeenCalledWith('p1', '_default')
    })
  })

  describe('updatePluginConfig', () => {
    it('設定更新成功 / 更新配置成功', async () => {
      const updated = { key: 'new' }
      mockPluginManager.updatePluginConfig.mockResolvedValue(updated)
      const res = mockRes()
      await updatePluginConfig(mockReq({ params: { name: 'p1' }, query: {}, body: { config: { key: 'new' } } }), res)
      expect(res.json).toHaveBeenCalledWith({ data: updated })
    })

    it('config が無い場合 400 / 缺少config时返回400', async () => {
      const res = mockRes()
      await updatePluginConfig(mockReq({ params: { name: 'p1' }, query: {}, body: {} }), res)
      expect(res.status).toHaveBeenCalledWith(400)
    })
  })

  // 健康检查 / ヘルスチェック
  describe('pluginHealthCheck', () => {
    it('ヘルスチェック結果を返す / 返回健康检查结果', async () => {
      const result = { healthy: true, name: 'p1' }
      mockPluginManager.healthCheck.mockResolvedValue(result)
      const res = mockRes()
      await pluginHealthCheck(mockReq({ params: { name: 'p1' } }), res)
      expect(res.json).toHaveBeenCalledWith(result)
    })
  })

  describe('pluginsHealthDashboard', () => {
    it('全プラグイン healthy の場合 overall=healthy / 全部健康时overall=healthy', async () => {
      mockPluginManager.healthCheckAll.mockResolvedValue([{ healthy: true }, { healthy: true }])
      const res = mockRes()
      await pluginsHealthDashboard(mockReq(), res)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ overall: 'healthy' }))
    })

    it('一部不健全の場合 overall=degraded / 部分不健康时overall=degraded', async () => {
      mockPluginManager.healthCheckAll.mockResolvedValue([{ healthy: true }, { healthy: false }])
      const res = mockRes()
      await pluginsHealthDashboard(mockReq(), res)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ overall: 'degraded' }))
    })
  })

  // SDK 信息 / SDK 情報
  describe('getSdkInfo', () => {
    it('SDK 情報を返す / 返回SDK信息', async () => {
      const info = { version: '1.0', docs: 'https://...' }
      mockPluginManager.getSdkInfo.mockReturnValue(info)
      const res = mockRes()
      await getSdkInfo(mockReq(), res)
      expect(res.json).toHaveBeenCalledWith(info)
    })
  })
})
