/**
 * ExtensionManager テスト / 扩展管理器测试
 *
 * サブマネージャーアクセスを検証。
 * 验证子管理器访问。
 *
 * 注意: initialize() は内部の pluginManager.loadPlugins() が fs/DB に依存するため、
 * サブマネージャーのアクセサのみをテストする。
 * 注意: initialize() 因内部 pluginManager.loadPlugins() 依赖 fs/DB，
 * 仅测试子管理器访问器。
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言（hoisted） / 模块 Mock 声明（hoisted） ───

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}))

vi.mock('@/models/eventLog', () => ({
  EventLog: { create: vi.fn().mockResolvedValue({}) },
}))

vi.mock('@/core/queue', () => ({
  queueManager: {
    isReady: vi.fn().mockReturnValue(false),
    addJob: vi.fn().mockResolvedValue(undefined),
  },
  QUEUE_NAMES: {
    WEBHOOK: 'webhook',
    SCRIPT: 'script',
    AUDIT: 'audit',
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

vi.mock('@/models/webhook', () => ({
  Webhook: { find: vi.fn(), findById: vi.fn() },
}))

vi.mock('@/models/webhookLog', () => ({
  WebhookLog: { create: vi.fn() },
}))

vi.mock('@/services/notificationService', () => ({
  sendNotificationsForEvent: vi.fn().mockResolvedValue(undefined),
}))

import { extensionManager } from '../extensionManager'

describe('ExtensionManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // サブマネージャーへのアクセス / 访问子管理器
  it('should provide access to HookManager', () => {
    const hookManager = extensionManager.getHookManager()
    expect(hookManager).toBeDefined()
  })

  it('should provide access to WebhookDispatcher', () => {
    const dispatcher = extensionManager.getWebhookDispatcher()
    expect(dispatcher).toBeDefined()
  })

  it('should provide access to PluginManager', () => {
    const pluginManager = extensionManager.getPluginManager()
    expect(pluginManager).toBeDefined()
  })

  it('should provide access to ScriptRunner', () => {
    const scriptRunner = extensionManager.getScriptRunner()
    expect(scriptRunner).toBeDefined()
  })

  it('should provide access to CustomFieldService', () => {
    const service = extensionManager.getCustomFieldService()
    expect(service).toBeDefined()
  })

  it('should provide access to FeatureFlagService', () => {
    const service = extensionManager.getFeatureFlagService()
    expect(service).toBeDefined()
  })

  // 全サブマネージャーが異なるインスタンス / 所有子管理器为不同实例
  it('should return distinct sub-manager instances', () => {
    const hook = extensionManager.getHookManager()
    const plugin = extensionManager.getPluginManager()
    const webhook = extensionManager.getWebhookDispatcher()
    const script = extensionManager.getScriptRunner()

    expect(hook).not.toBe(plugin)
    expect(webhook).not.toBe(script)
  })
})
