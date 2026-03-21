/**
 * PluginManager テスト / 插件管理器测试
 *
 * プラグインの一覧取得、有効/無効切り替え、ヘルスチェック、設定取得を検証。
 * 验证插件列表获取、启用/禁用切换、健康检查、配置获取。
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言（hoisted） / 模块 Mock 声明（hoisted） ───

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(false),
    readdirSync: vi.fn().mockReturnValue([]),
    readFileSync: vi.fn(),
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}))

vi.mock('@/models/plugin', () => ({
  Plugin: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    updateOne: vi.fn(),
  },
}))

vi.mock('@/models/pluginConfig', () => ({
  PluginConfig: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
}))

import { PluginManager } from '../pluginManager'

// ─── ヘルパー / 辅助工具 ───

function createMockHookManager() {
  return {
    register: vi.fn(),
    unregisterByPlugin: vi.fn(),
    emit: vi.fn(),
  } as any
}

describe('PluginManager', () => {
  let hookManager: any
  let manager: PluginManager

  beforeEach(() => {
    vi.clearAllMocks()
    hookManager = createMockHookManager()
    manager = new PluginManager(hookManager)
  })

  // 初期状態ではプラグインなし / 初始状态没有插件
  it('should return empty list when no plugins loaded', () => {
    const plugins = manager.getInstalledPlugins()
    expect(plugins).toEqual([])
  })

  // プラグインディレクトリがない場合、loadPlugins はスキップ
  // 插件目录不存在时，loadPlugins 跳过
  it('should skip loading when plugins directory does not exist', async () => {
    const fs = await import('fs')
    vi.mocked(fs.default.existsSync).mockReturnValue(false)

    await manager.loadPlugins()

    expect(manager.getInstalledPlugins()).toEqual([])
  })

  // 未登録プラグイン名で getPlugin は undefined を返す
  // 未注册的插件名 getPlugin 返回 undefined
  it('should return undefined for unknown plugin name', () => {
    expect(manager.getPlugin('nonexistent')).toBeUndefined()
  })

  // 存在しないプラグインの disable はエラー / 不存在的插件 disable 抛出错误
  it('should throw when disabling a non-existent plugin', async () => {
    await expect(manager.disable('nonexistent')).rejects.toThrow('not found')
  })

  // 存在しないプラグインの enable はエラー / 不存在的插件 enable 抛出错误
  it('should throw when enabling a non-existent plugin', async () => {
    await expect(manager.enable('nonexistent')).rejects.toThrow('not found')
  })

  // 存在しないプラグインの healthCheck は unhealthy / 不存在的插件 healthCheck 返回不健康
  it('should return unhealthy for non-existent plugin', async () => {
    const result = await manager.healthCheck('nonexistent')
    expect(result.healthy).toBe(false)
    expect(result.message).toContain('not found')
  })

  // ルーターを取得 / 获取路由器
  it('should provide a plugin router', () => {
    const router = manager.getRouter()
    expect(router).toBeDefined()
  })

  // 存在しないプラグインの updatePluginConfig はエラー
  // 不存在的插件 updatePluginConfig 抛出错误
  it('should throw when updating config for non-existent plugin', async () => {
    await expect(
      manager.updatePluginConfig('nonexistent', 'tenant-1', { key: 'val' }),
    ).rejects.toThrow('not found')
  })
})
