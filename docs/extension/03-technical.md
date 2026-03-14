# ZELIX WMS 二次开发扩展架构 — 技术文档

> Extension Architecture v1 | 日期: 2026-03-14

---

## 1. 目录结构

### 1.1 后端扩展目录

```
backend/src/
├── core/
│   └── extensions/                    # 扩展框架核心
│       ├── extensionManager.ts        # 扩展管理器（统一入口）
│       ├── hookManager.ts             # Hook 注册与事件分发
│       ├── pluginManager.ts           # 插件加载与生命周期
│       ├── scriptRunner.ts            # 脚本沙箱执行
│       ├── webhookDispatcher.ts       # Webhook 投递
│       ├── featureFlagService.ts      # 功能开关
│       ├── customFieldService.ts      # 自定义字段
│       └── types.ts                   # 扩展系统类型定义
│
├── models/
│   ├── plugin.ts                      # 插件注册模型
│   ├── pluginConfig.ts                # 插件配置模型
│   ├── webhook.ts                     # Webhook 配置模型
│   ├── webhookLog.ts                  # Webhook 投递日志
│   ├── automationScript.ts            # 自动化脚本模型
│   ├── scriptExecutionLog.ts          # 脚本执行日志
│   ├── customFieldDefinition.ts       # 自定义字段定义
│   └── eventLog.ts                    # 统一事件日志
│
├── api/
│   ├── routes/
│   │   └── extensionRoutes.ts         # 扩展 API 路由
│   └── controllers/
│       ├── pluginController.ts        # 插件管理 API
│       ├── webhookController.ts       # Webhook 管理 API
│       ├── scriptController.ts        # 脚本管理 API
│       ├── customFieldController.ts   # 自定义字段 API
│       └── featureFlagController.ts   # 功能开关 API
│
└── ...existing files...

extensions/                            # 插件安装目录（项目根）
└── plugins/
    ├── inventory-alert/               # 示例插件
    │   ├── manifest.json
    │   ├── index.ts
    │   ├── hooks.ts
    │   ├── api.ts
    │   └── ui.ts
    └── ...
```

### 1.2 前端扩展目录

```
frontend/src/
├── core/
│   └── plugin/
│       ├── PluginRegistry.ts          # 已有，扩展功能
│       ├── PluginLoader.ts            # 插件前端加载器
│       └── types.ts                   # 插件类型定义
│
├── views/settings/
│   ├── PluginManagement.vue           # 插件管理页
│   ├── WebhookSettings.vue            # Webhook 管理页
│   ├── ScriptEditor.vue               # 脚本编辑器页
│   ├── CustomFieldSettings.vue        # 自定义字段管理页
│   ├── FeatureFlagSettings.vue        # 功能开关页
│   └── ExtensionLogs.vue              # 扩展日志页
│
├── api/
│   ├── plugins.ts                     # 插件 API 客户端
│   ├── webhooks.ts                    # Webhook API 客户端
│   ├── scripts.ts                     # 脚本 API 客户端
│   ├── customFields.ts               # 自定义字段 API 客户端
│   └── featureFlags.ts               # 功能开关 API 客户端
│
└── ...existing files...
```

---

## 2. 核心模块技术规格

### 2.1 ExtensionManager

```typescript
// backend/src/core/extensions/extensionManager.ts

import { HookManager } from './hookManager'
import { PluginManager } from './pluginManager'
import { ScriptRunner } from './scriptRunner'
import { WebhookDispatcher } from './webhookDispatcher'
import { FeatureFlagService } from './featureFlagService'
import { CustomFieldService } from './customFieldService'

class ExtensionManager {
  private hookManager: HookManager
  private pluginManager: PluginManager
  private scriptRunner: ScriptRunner
  private webhookDispatcher: WebhookDispatcher
  private featureFlagService: FeatureFlagService
  private customFieldService: CustomFieldService

  constructor() {
    this.hookManager = new HookManager()
    this.pluginManager = new PluginManager(this.hookManager)
    this.scriptRunner = new ScriptRunner()
    this.webhookDispatcher = new WebhookDispatcher()
    this.featureFlagService = new FeatureFlagService()
    this.customFieldService = new CustomFieldService()
  }

  /**
   * 初始化扩展系统（服务启动时调用）
   */
  async initialize(): Promise<void> {
    await this.pluginManager.loadPlugins()
    logger.info('Extension system initialized')
  }

  /**
   * 统一事件分发入口
   * 所有 Engine 操作完成后调用此方法
   */
  async emit(event: string, payload: any, options?: EmitOptions): Promise<void> {
    const startTime = Date.now()

    try {
      // 1. Hook handlers (插件注册的处理函数)
      await this.hookManager.emit(event, payload)

      // 2. 自动化脚本
      await this.scriptRunner.executeForEvent(event, payload)

      // 3. Webhook 投递 (异步，不阻塞)
      this.webhookDispatcher.dispatch(event, payload).catch(err => {
        logger.error('Webhook dispatch error', { event, error: err.message })
      })

      // 4. 记录事件日志
      await this.logEvent(event, 'engine', payload, Date.now() - startTime)

    } catch (error) {
      // 扩展层错误不影响核心
      logger.error('Extension emit error', { event, error: error.message })
      await this.logEvent(event, 'engine', payload, Date.now() - startTime, error)
    }
  }

  /**
   * 功能开关检查
   */
  checkFeature(tenantId: string, flag: string): Promise<boolean> {
    return this.featureFlagService.check(tenantId, flag)
  }

  /**
   * 获取各子管理器（供 Controller 使用）
   */
  getHookManager(): HookManager { return this.hookManager }
  getPluginManager(): PluginManager { return this.pluginManager }
  getScriptRunner(): ScriptRunner { return this.scriptRunner }
  getWebhookDispatcher(): WebhookDispatcher { return this.webhookDispatcher }
  getFeatureFlagService(): FeatureFlagService { return this.featureFlagService }
  getCustomFieldService(): CustomFieldService { return this.customFieldService }

  private async logEvent(
    event: string, source: string, payload: any,
    duration: number, error?: Error
  ): Promise<void> {
    // 写入 event_logs 集合
  }
}

// 单例导出
export const extensionManager = new ExtensionManager()
```

### 2.2 HookManager

```typescript
// backend/src/core/extensions/hookManager.ts

interface HookHandler {
  name: string                    // 处理器名称
  pluginName?: string             // 所属插件
  priority: number                // 0=最高, 100=最低
  async: boolean                  // true=异步(fire-and-forget), false=同步(await)
  handler: (ctx: HookContext) => Promise<void>
}

interface HookContext {
  event: string
  payload: any
  tenantId?: string
  timestamp: Date
  setField: (path: string, value: any) => void  // 受限字段修改
}

class HookManager {
  private handlers: Map<string, HookHandler[]> = new Map()

  /**
   * 注册 Hook 处理器
   */
  register(event: string, handler: HookHandler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, [])
    }
    const handlers = this.handlers.get(event)!
    handlers.push(handler)
    // 按 priority 排序
    handlers.sort((a, b) => a.priority - b.priority)
  }

  /**
   * 注销 Hook（按插件名批量注销）
   */
  unregister(pluginName: string): void {
    for (const [event, handlers] of this.handlers) {
      this.handlers.set(
        event,
        handlers.filter(h => h.pluginName !== pluginName)
      )
    }
  }

  /**
   * 发射事件，执行所有注册的 handlers
   */
  async emit(event: string, payload: any): Promise<void> {
    const handlers = this.handlers.get(event)
    if (!handlers?.length) return

    const ctx: HookContext = {
      event,
      payload,
      timestamp: new Date(),
      setField: (path, value) => {
        // 受限写入实现
        setNestedField(payload, path, value)
      }
    }

    for (const h of handlers) {
      try {
        if (h.async) {
          // 异步处理，不等待结果
          h.handler(ctx).catch(err => {
            logger.error(`Hook handler error [${h.name}]`, { event, error: err.message })
          })
        } else {
          // 同步处理，等待结果
          await h.handler(ctx)
        }
      } catch (error) {
        logger.error(`Hook handler error [${h.name}]`, { event, error: error.message })
        // 单个 handler 失败不阻止其他 handler 执行
      }
    }
  }

  /**
   * 获取已注册事件列表
   */
  getRegisteredEvents(): string[] {
    return Array.from(this.handlers.keys())
  }

  /**
   * 获取某事件的所有 handlers
   */
  getHandlers(event: string): HookHandler[] {
    return this.handlers.get(event) || []
  }
}
```

### 2.3 PluginManager

```typescript
// backend/src/core/extensions/pluginManager.ts

interface PluginManifest {
  name: string
  version: string
  description: string
  author: string
  hooks: string[]
  permissions: string[]
  config?: Record<string, { type: string; default?: any; description?: string }>
}

interface PluginDefinition {
  manifest: PluginManifest
  install: (ctx: PluginContext) => Promise<void>
  uninstall?: () => Promise<void>
}

interface PluginContext {
  hookManager: HookManager
  registerHook: (event: string, handler: Function, options?: Partial<HookHandler>) => void
  registerAPI: (router: Router) => void
  getConfig: (tenantId: string) => Promise<Record<string, any>>
  logger: Logger
}

class PluginManager {
  private plugins: Map<string, PluginInstance> = new Map()
  private hookManager: HookManager
  private pluginRouter: Router = Router()

  constructor(hookManager: HookManager) {
    this.hookManager = hookManager
  }

  /**
   * 启动时加载所有插件
   */
  async loadPlugins(): Promise<void> {
    const pluginDir = path.resolve(process.cwd(), '../extensions/plugins')

    if (!fs.existsSync(pluginDir)) {
      logger.info('No plugins directory found, skipping plugin loading')
      return
    }

    const dirs = fs.readdirSync(pluginDir, { withFileTypes: true })
      .filter(d => d.isDirectory())

    for (const dir of dirs) {
      try {
        await this.loadPlugin(path.join(pluginDir, dir.name))
      } catch (error) {
        logger.error(`Failed to load plugin: ${dir.name}`, { error: error.message })
      }
    }

    logger.info(`Loaded ${this.plugins.size} plugins`)
  }

  private async loadPlugin(pluginPath: string): Promise<void> {
    // 1. 读取 manifest
    const manifestPath = path.join(pluginPath, 'manifest.json')
    const manifest: PluginManifest = JSON.parse(
      fs.readFileSync(manifestPath, 'utf-8')
    )

    // 2. 校验 manifest
    this.validateManifest(manifest)

    // 3. 检查数据库中的插件状态
    const dbPlugin = await PluginModel.findOne({ name: manifest.name })
    if (dbPlugin?.status === 'disabled') {
      logger.info(`Plugin ${manifest.name} is disabled, skipping`)
      return
    }

    // 4. 加载入口文件
    const pluginModule = require(path.join(pluginPath, 'index.ts'))
    const pluginDef: PluginDefinition = pluginModule.default || pluginModule

    // 5. 创建插件上下文
    const ctx: PluginContext = {
      hookManager: this.hookManager,
      registerHook: (event, handler, options = {}) => {
        this.hookManager.register(event, {
          name: `${manifest.name}:${event}`,
          pluginName: manifest.name,
          priority: options.priority ?? 50,
          async: options.async ?? true,
          handler
        })
      },
      registerAPI: (router) => {
        this.pluginRouter.use(`/${manifest.name}`, router)
      },
      getConfig: (tenantId) => this.getPluginConfig(manifest.name, tenantId),
      logger: logger.child({ plugin: manifest.name })
    }

    // 6. 执行安装
    await pluginDef.install(ctx)

    // 7. 注册到内存
    this.plugins.set(manifest.name, {
      manifest,
      definition: pluginDef,
      status: 'enabled'
    })

    // 8. 更新数据库状态
    await PluginModel.findOneAndUpdate(
      { name: manifest.name },
      { name: manifest.name, version: manifest.version, status: 'enabled', hooks: manifest.hooks, permissions: manifest.permissions },
      { upsert: true }
    )
  }

  /**
   * 禁用插件
   */
  async disable(name: string): Promise<void> {
    const plugin = this.plugins.get(name)
    if (!plugin) throw new Error(`Plugin ${name} not found`)

    this.hookManager.unregister(name)
    plugin.status = 'disabled'
    await PluginModel.updateOne({ name }, { status: 'disabled' })
  }

  /**
   * 启用插件
   */
  async enable(name: string): Promise<void> {
    // 重新加载插件
    const dbPlugin = await PluginModel.findOne({ name })
    if (!dbPlugin) throw new Error(`Plugin ${name} not found`)

    await PluginModel.updateOne({ name }, { status: 'enabled' })
    // 需要重启服务或重新加载
  }

  /**
   * 获取插件路由（挂载到 Express）
   */
  getRouter(): Router {
    return this.pluginRouter
  }

  /**
   * 获取已安装插件列表
   */
  getInstalledPlugins(): PluginInfo[] {
    return Array.from(this.plugins.values()).map(p => ({
      name: p.manifest.name,
      version: p.manifest.version,
      description: p.manifest.description,
      status: p.status,
      hooks: p.manifest.hooks
    }))
  }

  private async getPluginConfig(name: string, tenantId: string): Promise<Record<string, any>> {
    const config = await PluginConfigModel.findOne({ pluginName: name, tenantId })
    return config?.config || {}
  }

  private validateManifest(manifest: PluginManifest): void {
    if (!manifest.name) throw new Error('Plugin manifest missing "name"')
    if (!manifest.version) throw new Error('Plugin manifest missing "version"')
    if (!manifest.hooks || !Array.isArray(manifest.hooks)) {
      throw new Error('Plugin manifest missing "hooks" array')
    }
  }
}
```

### 2.4 WebhookDispatcher

```typescript
// backend/src/core/extensions/webhookDispatcher.ts

import crypto from 'crypto'

class WebhookDispatcher {
  /**
   * 分发 Webhook
   */
  async dispatch(event: string, payload: any): Promise<void> {
    // 查找匹配的 Webhook 配置
    const webhooks = await WebhookModel.find({ event, enabled: true })

    for (const webhook of webhooks) {
      this.deliverWithRetry(webhook, event, payload).catch(err => {
        logger.error('Webhook delivery failed', {
          webhookId: webhook._id,
          event,
          error: err.message
        })
      })
    }
  }

  private async deliverWithRetry(
    webhook: WebhookDoc,
    event: string,
    payload: any,
    attempt: number = 1
  ): Promise<void> {
    const body = {
      event,
      timestamp: new Date().toISOString(),
      data: payload
    }

    const bodyStr = JSON.stringify(body)
    const signature = this.sign(bodyStr, webhook.secret)

    const startTime = Date.now()
    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': `sha256=${signature}`,
          'X-Webhook-Event': event,
          'X-Webhook-Delivery': new ObjectId().toHexString(),
          ...webhook.headers
        },
        body: bodyStr,
        signal: AbortSignal.timeout(30000) // 30秒超时
      })

      // 记录成功日志
      await WebhookLogModel.create({
        webhookId: webhook._id,
        event,
        payload: body,
        status: response.ok ? 'success' : 'failed',
        statusCode: response.status,
        responseBody: await response.text().catch(() => ''),
        attempt,
        duration: Date.now() - startTime
      })

      if (!response.ok && attempt < webhook.retry) {
        // 非2xx响应，重试
        const delay = Math.pow(2, attempt) * 1000 // 指数退避: 2s, 4s, 8s
        await new Promise(r => setTimeout(r, delay))
        return this.deliverWithRetry(webhook, event, payload, attempt + 1)
      }

    } catch (error) {
      // 记录失败日志
      await WebhookLogModel.create({
        webhookId: webhook._id,
        event,
        payload: body,
        status: attempt >= webhook.retry ? 'failed' : 'retrying',
        statusCode: 0,
        error: error.message,
        attempt,
        duration: Date.now() - startTime
      })

      if (attempt < webhook.retry) {
        const delay = Math.pow(2, attempt) * 1000
        await new Promise(r => setTimeout(r, delay))
        return this.deliverWithRetry(webhook, event, payload, attempt + 1)
      }
    }
  }

  /**
   * HMAC-SHA256 签名
   */
  private sign(body: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(body).digest('hex')
  }

  /**
   * 测试发送
   */
  async test(webhookId: string): Promise<{ success: boolean; statusCode: number; error?: string }> {
    const webhook = await WebhookModel.findById(webhookId)
    if (!webhook) throw new Error('Webhook not found')

    const testPayload = {
      event: webhook.event,
      timestamp: new Date().toISOString(),
      data: { test: true, message: 'Webhook test from ZELIX WMS' }
    }

    try {
      const bodyStr = JSON.stringify(testPayload)
      const signature = this.sign(bodyStr, webhook.secret)

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': `sha256=${signature}`,
          'X-Webhook-Event': 'test',
        },
        body: bodyStr,
        signal: AbortSignal.timeout(10000)
      })

      return { success: response.ok, statusCode: response.status }
    } catch (error) {
      return { success: false, statusCode: 0, error: error.message }
    }
  }
}
```

### 2.5 ScriptRunner

```typescript
// backend/src/core/extensions/scriptRunner.ts

import ivm from 'isolated-vm'  // 沙箱执行

class ScriptRunner {
  /**
   * 执行匹配事件的所有脚本
   */
  async executeForEvent(event: string, payload: any): Promise<void> {
    const scripts = await AutomationScriptModel.find({
      event,
      enabled: true
    })

    for (const script of scripts) {
      try {
        await this.execute(script, payload)
      } catch (error) {
        logger.error(`Script execution error [${script.name}]`, {
          event,
          error: error.message
        })

        await ScriptExecutionLogModel.create({
          scriptId: script._id,
          event,
          status: error.message.includes('timeout') ? 'timeout' : 'error',
          error: error.message,
          input: payload,
          duration: 0
        })
      }
    }
  }

  /**
   * 在沙箱中执行脚本
   */
  async execute(script: ScriptDoc, payload: any): Promise<any> {
    const startTime = Date.now()
    const isolate = new ivm.Isolate({ memoryLimit: 32 }) // 32MB 内存限制

    try {
      const context = await isolate.createContext()
      const jail = context.global

      // 注入只读数据
      await jail.set('order', new ivm.ExternalCopy(payload.order || {}).copyInto())
      await jail.set('product', new ivm.ExternalCopy(payload.product || {}).copyInto())
      await jail.set('inventory', new ivm.ExternalCopy(payload.inventory || {}).copyInto())

      // 注入结果收集器
      const modifications: Record<string, any> = {}
      await jail.set('__setField', new ivm.Reference((path: string, value: any) => {
        modifications[path] = value
      }))

      // 包装脚本代码
      const wrappedCode = `
        const ctx = {
          order: order,
          product: product,
          inventory: inventory,
          setField: (path, value) => __setField.applySync(undefined, [path, value])
        }
        ;(function() { ${script.code} }).call(ctx)
      `

      // 执行（带超时）
      const scriptObj = await isolate.compileScript(wrappedCode)
      await scriptObj.run(context, { timeout: script.timeout || 5000 })

      const duration = Date.now() - startTime

      // 应用修改
      if (Object.keys(modifications).length > 0) {
        await this.applyModifications(payload, modifications)
      }

      // 记录成功日志
      await ScriptExecutionLogModel.create({
        scriptId: script._id,
        event: script.event,
        status: 'success',
        duration,
        input: payload,
        output: modifications
      })

      return modifications

    } finally {
      isolate.dispose()
    }
  }

  /**
   * 应用脚本修改到实际数据
   */
  private async applyModifications(
    payload: any,
    modifications: Record<string, any>
  ): Promise<void> {
    // 白名单字段：只允许修改特定字段
    const allowedFields = [
      'order.orderGroup',
      'order.invoiceType',
      'order.coolType',
      'order.handlingTags',
      'order.customFields'
    ]

    for (const [path, value] of Object.entries(modifications)) {
      if (!allowedFields.some(f => path.startsWith(f))) {
        logger.warn(`Script tried to modify disallowed field: ${path}`)
        continue
      }
      setNestedField(payload, path, value)
    }
  }

  /**
   * 静态校验脚本语法
   */
  validate(code: string): { valid: boolean; error?: string } {
    try {
      new Function(code) // 语法检查
      // 检查禁止关键字
      const forbidden = ['require', 'import', 'eval', 'Function', 'process', 'fs', 'child_process', 'net', 'http']
      for (const keyword of forbidden) {
        if (code.includes(keyword)) {
          return { valid: false, error: `Forbidden keyword: ${keyword}` }
        }
      }
      return { valid: true }
    } catch (error) {
      return { valid: false, error: error.message }
    }
  }
}
```

### 2.6 FeatureFlagService

```typescript
// backend/src/core/extensions/featureFlagService.ts

// 计划对应的默认功能
const PLAN_FEATURES: Record<string, string[]> = {
  free: [],
  starter: ['lotTracking', 'expiryTracking', 'autoProcessing'],
  standard: ['lotTracking', 'expiryTracking', 'autoProcessing',
             'wavePicking', 'multiWarehouse', 'serialTracking',
             'carrierAutomation', 'customFields'],
  pro: ['lotTracking', 'expiryTracking', 'autoProcessing',
        'wavePicking', 'multiWarehouse', 'serialTracking',
        'carrierAutomation', 'customFields',
        'webhooks', 'scripting', 'plugins'],
  enterprise: ['*']  // 全部功能
}

class FeatureFlagService {
  // 缓存
  private cache: Map<string, { features: string[], expiry: number }> = new Map()
  private CACHE_TTL = 60000 // 1分钟

  /**
   * 检查租户是否有某功能
   */
  async check(tenantId: string, flag: string): Promise<boolean> {
    const features = await this.getTenantFeatures(tenantId)

    // enterprise 计划拥有所有功能
    if (features.includes('*')) return true

    return features.includes(flag)
  }

  /**
   * 获取租户的完整功能列表
   */
  async getTenantFeatures(tenantId: string): Promise<string[]> {
    // 检查缓存
    const cached = this.cache.get(tenantId)
    if (cached && cached.expiry > Date.now()) {
      return cached.features
    }

    const tenant = await TenantModel.findById(tenantId)
    if (!tenant) return []

    // 合并计划默认功能 + 租户自定义功能
    const planFeatures = PLAN_FEATURES[tenant.plan] || []
    const customFeatures = tenant.features || []
    const features = [...new Set([...planFeatures, ...customFeatures])]

    // 更新缓存
    this.cache.set(tenantId, { features, expiry: Date.now() + this.CACHE_TTL })

    return features
  }

  /**
   * 为租户启用功能
   */
  async enable(tenantId: string, flag: string): Promise<void> {
    await TenantModel.updateOne(
      { _id: tenantId },
      { $addToSet: { features: flag } }
    )
    this.cache.delete(tenantId)
  }

  /**
   * 为租户禁用功能
   */
  async disable(tenantId: string, flag: string): Promise<void> {
    await TenantModel.updateOne(
      { _id: tenantId },
      { $pull: { features: flag } }
    )
    this.cache.delete(tenantId)
  }

  /**
   * Express 中间件：功能开关守卫
   */
  requireFeature(flag: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const tenantId = req.headers['x-tenant-id'] as string
      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID required' })
      }

      const hasFeature = await this.check(tenantId, flag)
      if (!hasFeature) {
        return res.status(403).json({
          error: `Feature "${flag}" is not available for your plan`
        })
      }

      next()
    }
  }
}
```

### 2.7 CustomFieldService

```typescript
// backend/src/core/extensions/customFieldService.ts

type FieldScope = 'order' | 'product' | 'inventory' | 'client' | 'inbound' | 'return'

class CustomFieldService {
  /**
   * 创建自定义字段定义
   */
  async defineField(tenantId: string, definition: {
    scope: FieldScope
    name: string
    label: string
    type: string
    options?: string[]
    required?: boolean
    defaultValue?: any
  }): Promise<CustomFieldDefinitionDoc> {
    // 验证名称唯一性
    const existing = await CustomFieldDefinitionModel.findOne({
      tenantId, scope: definition.scope, name: definition.name
    })
    if (existing) throw new Error(`Field "${definition.name}" already exists for ${definition.scope}`)

    // 验证名称格式（英文标识符）
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(definition.name)) {
      throw new Error('Field name must be a valid identifier (letters, numbers, underscores)')
    }

    return CustomFieldDefinitionModel.create({
      tenantId,
      ...definition
    })
  }

  /**
   * 获取某 scope 的所有字段定义
   */
  async getDefinitions(tenantId: string, scope: FieldScope): Promise<CustomFieldDefinitionDoc[]> {
    return CustomFieldDefinitionModel.find({ tenantId, scope }).sort('sortOrder')
  }

  /**
   * 设置实体的自定义字段值
   */
  async setValue(
    scope: FieldScope,
    entityId: string,
    fieldName: string,
    value: any,
    tenantId: string
  ): Promise<void> {
    // 验证字段定义存在
    const definition = await CustomFieldDefinitionModel.findOne({
      tenantId, scope, name: fieldName
    })
    if (!definition) throw new Error(`Custom field "${fieldName}" not defined for ${scope}`)

    // 验证值类型
    this.validateFieldValue(definition, value)

    // 更新实体
    const Model = this.getModelForScope(scope)
    await Model.updateOne(
      { _id: entityId },
      { $set: { [`customFields.${fieldName}`]: value } }
    )
  }

  /**
   * 获取实体的所有自定义字段值
   */
  async getValues(scope: FieldScope, entityId: string): Promise<Record<string, any>> {
    const Model = this.getModelForScope(scope)
    const entity = await Model.findById(entityId).select('customFields').lean()
    return entity?.customFields || {}
  }

  private getModelForScope(scope: FieldScope) {
    const models: Record<string, any> = {
      order: ShipmentOrderModel,
      product: ProductModel,
      inbound: InboundOrderModel,
      return: ReturnOrderModel,
      client: ClientModel,
    }
    return models[scope]
  }

  private validateFieldValue(definition: CustomFieldDefinitionDoc, value: any): void {
    const { type, options, required } = definition

    if (required && (value === null || value === undefined || value === '')) {
      throw new Error(`Field "${definition.name}" is required`)
    }

    if (value === null || value === undefined) return

    switch (type) {
      case 'string':
      case 'text':
        if (typeof value !== 'string') throw new Error(`Expected string for "${definition.name}"`)
        break
      case 'number':
        if (typeof value !== 'number') throw new Error(`Expected number for "${definition.name}"`)
        break
      case 'boolean':
        if (typeof value !== 'boolean') throw new Error(`Expected boolean for "${definition.name}"`)
        break
      case 'date':
        if (isNaN(Date.parse(value))) throw new Error(`Expected date for "${definition.name}"`)
        break
      case 'select':
        if (!options?.includes(value)) throw new Error(`Invalid option for "${definition.name}"`)
        break
      case 'multiselect':
        if (!Array.isArray(value) || !value.every(v => options?.includes(v))) {
          throw new Error(`Invalid options for "${definition.name}"`)
        }
        break
    }
  }
}
```

---

## 3. 数据模型

### 3.1 Plugin Model

```typescript
// backend/src/models/plugin.ts
const pluginSchema = new Schema({
  name:        { type: String, required: true, unique: true },
  version:     { type: String, required: true },
  description: { type: String },
  author:      { type: String },
  status:      { type: String, enum: ['installed', 'enabled', 'disabled', 'error'], default: 'installed' },
  hooks:       [{ type: String }],
  permissions: [{ type: String }],
  installedAt: { type: Date, default: Date.now },
  enabledAt:   { type: Date },
  errorMessage:{ type: String }
}, { timestamps: true })
```

### 3.2 Webhook Model

```typescript
// backend/src/models/webhook.ts
const webhookSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  event:    { type: String, required: true, index: true },
  url:      { type: String, required: true },
  secret:   { type: String, required: true },
  enabled:  { type: Boolean, default: true },
  retry:    { type: Number, default: 3, min: 0, max: 10 },
  headers:  { type: Schema.Types.Mixed, default: {} }
}, { timestamps: true })

webhookSchema.index({ event: 1, enabled: 1 })
```

### 3.3 WebhookLog Model

```typescript
const webhookLogSchema = new Schema({
  webhookId:    { type: Schema.Types.ObjectId, ref: 'Webhook', required: true, index: true },
  event:        { type: String, required: true },
  payload:      { type: Schema.Types.Mixed },
  status:       { type: String, enum: ['success', 'failed', 'retrying'] },
  statusCode:   { type: Number },
  responseBody: { type: String, maxlength: 10000 },
  attempt:      { type: Number, default: 1 },
  error:        { type: String },
  duration:     { type: Number }
}, { timestamps: true })

// 30天自动过期
webhookLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 3600 })
```

### 3.4 AutomationScript Model

```typescript
const automationScriptSchema = new Schema({
  tenantId:    { type: String, required: true, index: true },
  name:        { type: String, required: true },
  description: { type: String },
  event:       { type: String, required: true, index: true },
  code:        { type: String, required: true },
  enabled:     { type: Boolean, default: false },
  timeout:     { type: Number, default: 5000 }
}, { timestamps: true })
```

### 3.5 CustomFieldDefinition Model

```typescript
const customFieldDefinitionSchema = new Schema({
  tenantId:     { type: String, required: true },
  scope:        { type: String, enum: ['order', 'product', 'inventory', 'client', 'inbound', 'return'], required: true },
  name:         { type: String, required: true },
  label:        { type: String, required: true },
  type:         { type: String, enum: ['string', 'number', 'boolean', 'date', 'select', 'multiselect', 'text'], required: true },
  options:      [{ type: String }],
  required:     { type: Boolean, default: false },
  defaultValue: { type: Schema.Types.Mixed },
  sortOrder:    { type: Number, default: 0 }
}, { timestamps: true })

customFieldDefinitionSchema.index({ tenantId: 1, scope: 1, name: 1 }, { unique: true })
```

### 3.6 EventLog Model

```typescript
const eventLogSchema = new Schema({
  event:      { type: String, required: true, index: true },
  source:     { type: String, enum: ['engine', 'plugin', 'script', 'webhook'] },
  sourceName: { type: String },
  tenantId:   { type: String, index: true },
  payload:    { type: Schema.Types.Mixed },
  status:     { type: String, enum: ['emitted', 'processed', 'error'] },
  error:      { type: String },
  duration:   { type: Number }
}, { timestamps: true })

eventLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 3600 }) // 90天过期
```

---

## 4. API 接口

### 4.1 路由注册

```typescript
// backend/src/api/routes/extensionRoutes.ts
import { Router } from 'express'
import pluginController from '../controllers/pluginController'
import webhookController from '../controllers/webhookController'
import scriptController from '../controllers/scriptController'
import customFieldController from '../controllers/customFieldController'
import featureFlagController from '../controllers/featureFlagController'

const router = Router()

router.use('/plugins', pluginController)
router.use('/webhooks', webhookController)
router.use('/scripts', scriptController)
router.use('/custom-fields', customFieldController)
router.use('/feature-flags', featureFlagController)

export default router

// app.ts 注册
app.use('/api/extensions', extensionRoutes)
app.use('/api/plugins', extensionManager.getPluginManager().getRouter())
```

### 4.2 接口详细规格

| 端点 | 方法 | 说明 |
|------|------|------|
| `GET /api/extensions/plugins` | GET | 列出所有插件 |
| `POST /api/extensions/plugins/:name/enable` | POST | 启用插件 |
| `POST /api/extensions/plugins/:name/disable` | POST | 禁用插件 |
| `GET /api/extensions/plugins/:name/config` | GET | 获取插件配置 |
| `PUT /api/extensions/plugins/:name/config` | PUT | 更新插件配置 |
| `GET /api/extensions/webhooks` | GET | 列出 Webhooks |
| `POST /api/extensions/webhooks` | POST | 创建 Webhook |
| `PUT /api/extensions/webhooks/:id` | PUT | 更新 Webhook |
| `DELETE /api/extensions/webhooks/:id` | DELETE | 删除 Webhook |
| `POST /api/extensions/webhooks/:id/test` | POST | 测试发送 |
| `GET /api/extensions/webhooks/:id/logs` | GET | 投递日志 |
| `GET /api/extensions/scripts` | GET | 列出脚本 |
| `POST /api/extensions/scripts` | POST | 创建脚本 |
| `PUT /api/extensions/scripts/:id` | PUT | 更新脚本 |
| `DELETE /api/extensions/scripts/:id` | DELETE | 删除脚本 |
| `POST /api/extensions/scripts/:id/execute` | POST | 手动执行 |
| `POST /api/extensions/scripts/validate` | POST | 校验语法 |
| `GET /api/extensions/scripts/:id/logs` | GET | 执行日志 |
| `GET /api/extensions/custom-fields/:scope` | GET | 获取字段定义 |
| `POST /api/extensions/custom-fields` | POST | 创建字段定义 |
| `PUT /api/extensions/custom-fields/:id` | PUT | 更新字段定义 |
| `DELETE /api/extensions/custom-fields/:id` | DELETE | 删除字段定义 |
| `GET /api/extensions/feature-flags` | GET | 获取功能开关 |
| `PUT /api/extensions/feature-flags/:flag` | PUT | 设置功能开关 |
| `GET /api/extensions/hooks` | GET | 查看已注册事件 |
| `GET /api/extensions/logs` | GET | 事件日志查询 |

---

## 5. 依赖说明

### 5.1 新增依赖

| 包 | 用途 | 必要性 |
|----|------|--------|
| `isolated-vm` | 脚本沙箱执行 | Phase 4 (ScriptRunner) |

### 5.2 已有依赖（无需新增）

| 包 | 用途 |
|----|------|
| `express` | API 路由 |
| `mongoose` | 数据模型 |
| `crypto` (Node内置) | HMAC 签名 |
| `fs` / `path` (Node内置) | 插件文件加载 |

---

## 6. 与现有代码的集成点

### 6.1 需要修改的文件

| 文件 | 修改内容 |
|------|----------|
| `backend/src/app.ts` | 注册扩展路由 + 初始化 ExtensionManager |
| `backend/src/server.ts` | 启动时调用 `extensionManager.initialize()` |
| `backend/src/api/routes/index.ts` | 添加 `/extensions` 和 `/plugins` 路由 |
| `backend/src/models/shipmentOrder.ts` | 添加 `customFields` 字段 |
| `backend/src/models/product.ts` | 添加 `customFields` 字段 |
| `backend/src/models/inboundOrder.ts` | 添加 `customFields` 字段 |
| `backend/src/models/returnOrder.ts` | 添加 `customFields` 字段 |

### 6.2 需要在 Engine 中添加 emit 调用

| 文件 | 添加位置 |
|------|----------|
| `shipmentOrderController.ts` | 创建/确认/出库/取消操作后 |
| `inboundOrderController.ts` | 收货/上架完成后 |
| `stockService.ts` | reserve/release/consume 后 |
| `outboundWorkflow.ts` | wave 创建/完成后 |
| `inboundWorkflow.ts` | 收货/上架完成后 |

### 6.3 不需要修改的文件

以下文件保持不变（Core 稳定原则）：

- `yamatoB2Service.ts` — B2 Cloud 核心（禁止修改）
- `yamatoB2Format.ts` — B2 格式映射（禁止修改）
- 所有 Mongoose model 的核心 schema 字段
- 现有 API 的请求/响应格式
