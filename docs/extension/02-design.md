# ZELIX WMS 二次开发扩展架构 — 设计文档

> Extension Architecture v1 | 日期: 2026-03-14

---

## 1. 系统总体架构

### 1.1 六层架构

```
                    ┌──────────────────────────┐
                    │       Client Layer       │
                    │                          │
                    │  Web Admin (Vue3 SPA)   │
                    │  Mobile Scanner (PWA)   │
                    │  API Clients            │
                    └─────────────┬───────────┘
                                  │
                           API Gateway
                    (认证 / 权限 / 限流 / 日志)
                                  │
                    ┌─────────────┴─────────────┐
                    │     Application Layer     │
                    │                           │
                    │ Controllers → Services    │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │       Engine Layer        │
                    │                           │
                    │ OrderEngine               │
                    │ InventoryEngine           │
                    │ WorkflowEngine            │
                    │ TaskEngine                │
                    │ CarrierEngine             │
                    │ MappingEngine             │
                    │ RuleEngine                │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │     Extension Layer       │
                    │                           │
                    │ ExtensionManager          │
                    │ ├── HookManager           │
                    │ ├── PluginManager         │
                    │ ├── ScriptRunner          │
                    │ ├── WebhookDispatcher     │
                    │ ├── FeatureFlagService    │
                    │ └── CustomFieldService    │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │   Infrastructure Layer    │
                    │                           │
                    │ MongoDB │ FileStorage     │
                    │ Redis*  │ Queue*          │
                    └───────────────────────────┘
```

### 1.2 核心设计原则

| 原则 | 说明 |
|------|------|
| Core 永远不动 | 核心引擎代码稳定，扩展不修改核心 |
| Extension First | 所有定制需求通过扩展层实现 |
| Schema Stable | 核心数据模型稳定，扩展通过 customFields |
| SaaS Ready | 所有扩展按租户隔离 |
| 隔离性 | 扩展失败不影响核心 |

---

## 2. Engine Layer 设计

### 2.1 Engine 架构

Engine 是纯业务逻辑层，不依赖 Controller，不返回 HTTP Response。

```
Controller
    │
    ▼
WorkflowEngine（流程协调者）
    │
    ├──> OrderEngine（订单管理）
    ├──> InventoryEngine（库存管理）
    ├──> TaskEngine（任务管理）
    │
    ├──> CarrierEngine（物流接口）
    ├──> MappingEngine（数据转换）
    └──> RuleEngine（自动规则）
```

### 2.2 七大核心引擎

#### OrderEngine（订单引擎）

```
OrderEngine
├── create(orderData)        → 创建订单 + emit('order.created')
├── confirm(orderId)         → 确认订单 + 触发库存预留 + emit('order.confirmed')
├── ship(orderId)            → 出库完成 + emit('order.shipped')
├── cancel(orderId, reason)  → 取消订单 + emit('order.cancelled')
├── split(orderId, config)   → 拆分订单
├── hold(orderId)            → 保留订单 + emit('order.held')
└── unhold(orderId)          → 解除保留 + emit('order.unheld')
```

#### InventoryEngine（库存引擎）

```
InventoryEngine
├── reserve(orderId, items)     → FEFO 分配 + emit('stock.reserved')
├── release(orderId)            → 释放预留 + emit('stock.released')
├── consume(orderId)            → 消耗库存 + emit('inventory.changed')
├── adjust(productId, loc, qty) → 调整库存 + emit('inventory.changed')
├── transfer(from, to, items)   → 内部调拨 + emit('inventory.changed')
└── getAvailable(productId)     → 查询可用库存
```

#### WorkflowEngine（流程引擎）

```
WorkflowEngine（协调者，调用其他 Engine）
├── InboundWorkflow
│   ├── startReceiving()
│   ├── confirmReceiveLine()    → emit('inbound.received')
│   ├── startPutaway()
│   └── completePutaway()       → emit('inbound.putaway.completed')
│
├── OutboundWorkflow
│   ├── createWave()             → emit('wave.created')
│   ├── startPicking()
│   ├── completePickingTask()
│   ├── completeSorting()
│   └── completePacking()       → emit('wave.completed')
│
└── ReplenishmentWorkflow
    ├── checkAndTrigger()
    └── completeReplenishment()
```

#### TaskEngine（任务引擎）

```
TaskEngine
├── create(taskData)       → emit('task.created')
├── assign(taskId, userId)
├── start(taskId)
├── complete(taskId, result) → emit('task.completed')
└── cancel(taskId)
```

#### CarrierEngine（物流引擎）

```
CarrierEngine
├── validate(carrierId, orders)
├── export(carrierId, orders)
├── printLabel(carrierId, trackingNumbers)
└── track(carrierId, trackingNumber)

通过插件扩展不同运营商：
├── yamato-b2 (内置)
├── sagawa-api (插件)
├── japanpost-api (插件)
└── custom (插件)
```

#### MappingEngine（数据转换引擎）

```
MappingEngine
├── parseCSV(file, configId)
├── parseExcel(file, configId)
├── transform(data, pipeline)
└── validate(data, schema)
```

#### RuleEngine（规则引擎）

```
RuleEngine
├── evaluate(rules, context)
├── matchConditions(conditions, data)
└── executeActions(actions, data)
```

### 2.3 Engine 调用规则

```
✅ Controller → Engine
✅ WorkflowEngine → OrderEngine / InventoryEngine / TaskEngine
✅ Plugin → Engine (通过 Extension API)
✅ Script → Engine (通过沙箱 API)

❌ Engine → Controller
❌ Engine → 直接返回 HTTP Response
❌ Engine 之间循环依赖
```

### 2.4 Engine 与事件集成

每个 Engine 操作完成后，通过 ExtensionManager 发射事件：

```typescript
// OrderEngine.confirm() 内部
async confirm(orderId: string) {
  const order = await this.doConfirm(orderId)
  await inventoryEngine.reserve(orderId, order.products)

  // 核心操作完成后，发射事件到扩展层
  extensionManager.emit('order.confirmed', { order })

  return order
}
```

---

## 3. Extension Layer 设计

### 3.1 ExtensionManager（扩展管理核心）

```
ExtensionManager
├── hookManager          → 事件注册与分发
├── pluginManager        → 插件加载与生命周期
├── scriptRunner         → 自动化脚本执行
├── webhookDispatcher    → Webhook 投递
├── featureFlagService   → 功能开关检查
└── customFieldService   → 自定义字段管理

核心方法：
├── emit(event, payload)  → 统一事件分发入口
├── loadPlugins()         → 启动时加载所有插件
└── checkFeature(tenant, flag) → 功能开关检查
```

### 3.2 事件分发流程

```
Engine 操作完成
        │
        ▼
ExtensionManager.emit(event, payload)
        │
        ├──> HookManager → 执行注册的 Hook 处理函数
        │
        ├──> ScriptRunner → 执行匹配事件的自动化脚本
        │
        └──> WebhookDispatcher → 发送匹配的 Webhook
```

### 3.3 HookManager 设计

```
HookManager
├── handlers: Map<string, HookHandler[]>
│
├── register(event, handler, options?)
│   options: { priority, async, pluginName }
│
├── emit(event, payload)
│   → 按 priority 排序执行 handlers
│   → async handler: fire-and-forget
│   → sync handler: await 结果
│
└── unregister(event, handlerOrPluginName)
```

事件处理优先级：

```
priority: 0 (最高) → 100 (最低)

内置处理 (AutoProcessing): priority 10
插件处理: priority 50
脚本处理: priority 80
Webhook: priority 100
```

### 3.4 PluginManager 设计

```
PluginManager
├── plugins: Map<string, PluginInstance>
│
├── loadPlugins()
│   → 扫描 extensions/plugins/*/manifest.json
│   → 校验 manifest
│   → 加载 index.ts
│   → 注册 hooks
│   → 注册 API routes
│
├── register(plugin: PluginDefinition)
├── enable(name: string)
├── disable(name: string)
├── uninstall(name: string)
│
├── getConfig(name, tenantId) → 读取插件配置
└── setConfig(name, tenantId, config) → 保存插件配置
```

插件加载流程：

```
服务启动
    │
    ▼
扫描 extensions/plugins/*/
    │
    ▼
解析 manifest.json
    │
    ├── 校验必填字段 (name, version, hooks)
    ├── 校验权限声明
    │
    ▼
加载 index.ts → 调用 plugin.install()
    │
    ├── 注册 Hook handlers → HookManager
    ├── 注册 API routes → Express Router
    └── 注册 UI extensions → PluginRegistry
    │
    ▼
标记 plugin 状态 = enabled
```

### 3.5 WebhookDispatcher 设计

```
WebhookDispatcher
├── dispatch(event, payload)
│   → 查询匹配 event 的 WebhookConfig
│   → 过滤 enabled = true
│   → 按 tenantId 过滤
│   │
│   → for each webhook:
│       ├── 构建 payload (event + data + timestamp)
│       ├── 生成 HMAC-SHA256 签名
│       ├── HTTP POST 到 webhook.url
│       ├── 成功 → 记录日志
│       └── 失败 → 重试 (指数退避, 最多 webhook.retry 次)
│
├── test(webhookId) → 发送测试事件
└── getLogs(webhookId) → 查询投递日志
```

签名计算：

```
signature = HMAC-SHA256(
  key: webhook.secret,
  message: JSON.stringify(payload)
)

Header: X-Webhook-Signature: sha256={signature}
```

### 3.6 ScriptRunner 设计

```
ScriptRunner
├── execute(scriptId, context)
│   → 从 DB 加载脚本代码
│   → 创建沙箱环境 (vm2 / isolated-vm)
│   → 注入只读 API:
│       ├── ctx.order (事件 payload)
│       ├── ctx.product (只读查询)
│       ├── ctx.inventory (只读查询)
│       └── ctx.setField(field, value) (受限写入)
│   → 执行脚本
│   → 超时保护 (默认 5 秒)
│   → 记录执行日志
│
├── validate(code) → 静态校验脚本语法
└── getLogs(scriptId) → 执行历史
```

沙箱限制：

```
✅ 允许: 读取事件数据、简单计算、条件判断、设置字段值
❌ 禁止: require/import、文件系统、网络请求、进程操作、无限循环
```

### 3.7 FeatureFlagService 设计

```
FeatureFlagService
├── check(tenantId, flag) → boolean
│   → 从 tenant.features[] 检查
│   → 从 tenant.plan 推断默认值
│
├── enable(tenantId, flag)
├── disable(tenantId, flag)
│
└── getAll(tenantId) → { [flag]: boolean }
```

中间件级检查：

```typescript
// 路由中间件
function requireFeature(flag: string) {
  return (req, res, next) => {
    if (!featureFlagService.check(req.tenantId, flag)) {
      return res.status(403).json({ error: `Feature "${flag}" not available` })
    }
    next()
  }
}

// 使用
router.use('/waves', requireFeature('wavePicking'), waveController)
```

### 3.8 CustomFieldService 设计

```
CustomFieldService
├── defineField(scope, fieldDef)
│   → 保存到 custom_field_definitions
│   → scope: order | product | inventory | client
│
├── getDefinitions(scope, tenantId)
│   → 返回该 scope 的所有字段定义
│
├── setValue(scope, entityId, fieldName, value)
│   → 校验字段类型
│   → 更新 entity.customFields[fieldName] = value
│
└── getValues(scope, entityId)
    → 返回 entity.customFields
```

---

## 4. 数据库扩展设计

### 4.1 新增集合

#### plugins（插件注册）

```typescript
{
  name: string           // 唯一标识
  version: string        // semver
  description: string
  author: string
  status: 'installed' | 'enabled' | 'disabled' | 'error'
  hooks: string[]        // 监听的事件
  permissions: string[]  // 声明的权限
  installedAt: Date
  enabledAt: Date
  errorMessage?: string
}
```

#### plugin_configs（插件配置）

```typescript
{
  pluginName: string
  tenantId: string
  config: Record<string, any>  // 键值对配置
  updatedAt: Date
}
// unique: { pluginName, tenantId }
```

#### webhooks（Webhook 配置）

```typescript
{
  tenantId: string
  event: string          // Hook 事件名
  url: string            // 目标 URL
  secret: string         // HMAC 密钥
  enabled: boolean
  retry: number          // 最大重试次数 (默认 3)
  headers?: Record<string, string>  // 自定义请求头
  createdAt: Date
  updatedAt: Date
}
```

#### webhook_logs（Webhook 投递日志）

```typescript
{
  webhookId: ObjectId
  event: string
  payload: any
  status: 'success' | 'failed' | 'retrying'
  statusCode: number
  responseBody: string
  attempt: number        // 第几次尝试
  error?: string
  createdAt: Date
  duration: number       // 响应时间 ms
}
```

#### automation_scripts（自动化脚本）

```typescript
{
  tenantId: string
  name: string
  description: string
  event: string          // 绑定的 Hook 事件
  code: string           // JavaScript 代码
  enabled: boolean
  timeout: number        // 超时毫秒 (默认 5000)
  createdAt: Date
  updatedAt: Date
}
```

#### script_execution_logs（脚本执行日志）

```typescript
{
  scriptId: ObjectId
  event: string
  status: 'success' | 'error' | 'timeout'
  duration: number
  error?: string
  input: any             // 事件 payload 快照
  output?: any           // 脚本修改的字段
  createdAt: Date
}
```

#### custom_field_definitions（自定义字段定义）

```typescript
{
  tenantId: string
  scope: 'order' | 'product' | 'inventory' | 'client' | 'inbound' | 'return'
  name: string           // 字段名（英文标识符）
  label: string          // 显示名称
  type: 'string' | 'number' | 'boolean' | 'date' | 'select' | 'multiselect' | 'text'
  options?: string[]     // select/multiselect 的选项
  required: boolean
  defaultValue?: any
  sortOrder: number
  createdAt: Date
}
// unique: { tenantId, scope, name }
```

#### event_logs（统一事件日志）

```typescript
{
  event: string
  source: 'engine' | 'plugin' | 'script' | 'webhook'
  sourceName?: string    // 插件名/脚本名
  tenantId: string
  payload: any
  status: 'emitted' | 'processed' | 'error'
  error?: string
  duration: number
  createdAt: Date
}
```

### 4.2 现有集合扩展

```typescript
// orders, products, inbound_orders, return_orders 增加:
{
  customFields: {
    type: Schema.Types.Mixed,
    default: {}
  }
}

// tenants 增加 features 数组 (如尚未存在):
{
  features: [String]  // ['wavePicking', 'multiWarehouse', ...]
}
```

---

## 5. 前端扩展设计

### 5.1 PluginRegistry（前端插件注册）

```typescript
class PluginRegistry {
  // 菜单注册
  registerMenu(menuItem: {
    section: string       // 导航区域
    label: string
    icon: string
    route: string
    order: number
  })

  // 页面注册
  registerPage(page: {
    route: string
    component: Component  // Vue 组件
    layout?: string
  })

  // 动作按钮注册
  registerAction(action: {
    scope: string         // 'shipment-order' | 'inbound-order' | ...
    label: string
    icon: string
    handler: Function
    position: 'toolbar' | 'context-menu' | 'batch-action'
  })

  // 仪表板 Widget 注册
  registerWidget(widget: {
    name: string
    component: Component
    defaultSize: { w: number, h: number }
  })

  // 自定义字段渲染器注册
  registerFieldRenderer(renderer: {
    type: string          // 字段类型
    component: Component  // 渲染组件
  })
}
```

### 5.2 扩展管理 UI 页面

| 页面 | 路径 | 说明 |
|------|------|------|
| 插件管理 | `/settings/plugins` | 安装/启用/禁用/配置插件 |
| Webhook 管理 | `/settings/webhooks` | CRUD + 测试 + 日志查看 |
| 自动化脚本 | `/settings/scripts` | 脚本编辑器 + 测试 + 日志 |
| 自定义字段 | `/settings/custom-fields` | 按 scope 管理字段定义 |
| 功能开关 | `/settings/features` | 租户功能管理 |
| 扩展日志 | `/settings/extension-logs` | 统一事件日志查看 |

---

## 6. 安全设计

### 6.1 插件安全

```
┌──────────────────────────────────┐
│         Plugin Sandbox           │
│                                  │
│  ✅ 调用 Engine API (受权限控制)  │
│  ✅ 读写自己的 plugin_configs    │
│  ✅ 注册 Hook / API / UI        │
│                                  │
│  ❌ 直接操作 MongoDB             │
│  ❌ 修改其他插件配置             │
│  ❌ 绕过权限声明访问资源          │
│  ❌ 访问文件系统                  │
└──────────────────────────────────┘
```

### 6.2 脚本安全

```
┌──────────────────────────────────┐
│         Script Sandbox           │
│                                  │
│  ✅ 读取事件 payload             │
│  ✅ 简单计算和条件判断            │
│  ✅ ctx.setField() 受限写入      │
│                                  │
│  ❌ require / import             │
│  ❌ 文件系统 / 网络请求           │
│  ❌ 进程操作                      │
│  ❌ 无限循环 (5秒超时)            │
└──────────────────────────────────┘
```

### 6.3 Webhook 安全

- HMAC-SHA256 签名验证
- HTTPS 强制（生产环境）
- 敏感字段脱敏（如密码、token）
- 投递频率限制

---

## 7. 与现有系统的集成方案

### 7.1 AutoProcessingEngine 迁移

现有 `autoProcessingEngine.ts` 可作为内置插件保留：

```
现有: shipmentOrderController → autoProcessingEngine.processOrderEvent()

迁移后:
OrderEngine.create()
    → ExtensionManager.emit('order.created')
        → HookManager
            → AutoProcessingPlugin.onOrderCreated() (priority: 10)
            → UserPlugin.onOrderCreated() (priority: 50)
            → UserScript.onOrderCreated() (priority: 80)
            → WebhookDispatcher (priority: 100)
```

### 7.2 渐进式迁移策略

```
Phase 1: 添加 ExtensionManager + HookManager
         在现有代码中插入 emit() 调用
         AutoProcessingEngine 保持不变

Phase 2: 添加 WebhookDispatcher
         Webhook 通过 emit() 自动触发

Phase 3: 添加 PluginManager
         第一个插件: inventory-alert

Phase 4: 添加 ScriptRunner
         替代部分 AutoProcessingRule

Phase 5: 添加 CustomFields + FeatureFlags
         完善 SaaS 基础
```

---

## 8. 未来扩展模块预留

### 8.1 未来 Engine

| Engine | 用途 | 优先级 |
|--------|------|--------|
| SlottingEngine | 库位优化 | 中 |
| PickPathEngine | 拣货路径优化 | 中 |
| ForecastEngine | AI 需求预测 | 低 |
| BillingEngine | 3PL 计费 | 中 |
| AnalyticsEngine | BI 分析 | 低 |
| WcsEngine | 自动化仓库对接 | 低 |

### 8.2 未来基础设施

| 组件 | 用途 | 时机 |
|------|------|------|
| Redis | 缓存/Session/实时 | 当性能需要时 |
| BullMQ | 任务队列 | 当异步需求增加时 |
| OpenSearch | 全文搜索 | 当数据量增大时 |
| WebSocket | 实时通知 | 当需要实时推送时 |

### 8.3 平台级演进

```
当前: ZELIX WMS (仓储管理)
  ↓
Phase 2: + OMS (订单管理)
  ↓
Phase 3: + TMS (运输管理)
  ↓
Phase 4: + BI (数据分析)
  ↓
未来: ZELIX 物流平台
```
