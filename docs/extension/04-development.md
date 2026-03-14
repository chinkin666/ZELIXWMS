# ZELIX WMS 二次开发扩展架构 — 开发文档

> Extension Architecture v1 | 日期: 2026-03-14

---

## 1. 插件开发指南

### 1.1 创建插件

```bash
# 1. 创建插件目录
mkdir -p extensions/plugins/my-plugin

# 2. 创建必要文件
touch extensions/plugins/my-plugin/manifest.json
touch extensions/plugins/my-plugin/index.ts
touch extensions/plugins/my-plugin/hooks.ts
```

### 1.2 manifest.json 编写

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "我的自定义插件",
  "author": "Your Name",
  "hooks": [
    "order.created",
    "order.confirmed"
  ],
  "permissions": [
    "order.read",
    "order.write",
    "notification.send"
  ],
  "config": {
    "enableNotification": {
      "type": "boolean",
      "default": true,
      "description": "启用通知功能"
    },
    "notificationEmail": {
      "type": "string",
      "default": "",
      "description": "通知邮箱地址"
    }
  }
}
```

**manifest 字段说明**：

| 字段 | 必填 | 说明 |
|------|------|------|
| `name` | 是 | 插件唯一标识（英文，小写+连字符） |
| `version` | 是 | 语义化版本 (semver) |
| `description` | 否 | 插件描述 |
| `author` | 否 | 作者 |
| `hooks` | 是 | 监听的事件列表 |
| `permissions` | 否 | 需要的权限列表 |
| `config` | 否 | 可配置项定义 |

### 1.3 index.ts 编写

```typescript
// extensions/plugins/my-plugin/index.ts

import { PluginDefinition, PluginContext } from '../../backend/src/core/extensions/types'
import { setupHooks } from './hooks'

const plugin: PluginDefinition = {
  manifest: require('./manifest.json'),

  async install(ctx: PluginContext) {
    ctx.logger.info('my-plugin installing...')

    // 注册 Hook 处理器
    setupHooks(ctx)

    // 注册自定义 API（可选）
    // ctx.registerAPI(myRouter)

    ctx.logger.info('my-plugin installed successfully')
  },

  async uninstall() {
    // 清理资源
  }
}

export default plugin
```

### 1.4 hooks.ts 编写

```typescript
// extensions/plugins/my-plugin/hooks.ts

import { PluginContext, HookContext } from '../../backend/src/core/extensions/types'

export function setupHooks(ctx: PluginContext) {

  // 监听订单创建
  ctx.registerHook('order.created', async (hookCtx: HookContext) => {
    const order = hookCtx.payload.order
    const config = await ctx.getConfig(order.tenantId)

    ctx.logger.info('Order created', { orderNumber: order.orderNumber })

    // 示例: 高价订单自动标记为 VIP
    if (order._productsMeta?.totalPrice > 10000) {
      hookCtx.setField('order.handlingTags', [...(order.handlingTags || []), 'VIP'])
    }

    // 示例: 发送通知
    if (config.enableNotification && config.notificationEmail) {
      // 调用通知服务
    }
  }, {
    priority: 50,   // 默认优先级
    async: true      // 异步执行
  })

  // 监听订单确认
  ctx.registerHook('order.confirmed', async (hookCtx: HookContext) => {
    const order = hookCtx.payload.order
    ctx.logger.info('Order confirmed', { orderNumber: order.orderNumber })
  })
}
```

### 1.5 添加自定义 API（可选）

```typescript
// extensions/plugins/my-plugin/api.ts

import { Router } from 'express'

export function createRouter(): Router {
  const router = Router()

  // GET /api/plugins/my-plugin/stats
  router.get('/stats', async (req, res) => {
    // 插件自定义接口
    res.json({ processed: 100, errors: 0 })
  })

  return router
}

// 在 index.ts 中注册:
// import { createRouter } from './api'
// ctx.registerAPI(createRouter())
```

### 1.6 添加前端 UI 扩展（可选）

```typescript
// extensions/plugins/my-plugin/ui.ts

export const uiExtensions = {
  // 新增菜单项
  menus: [{
    section: '設定',
    label: 'My Plugin 設定',
    icon: 'Setting',
    route: '/settings/my-plugin',
    order: 100
  }],

  // 新增仪表板 Widget
  widgets: [{
    name: 'my-plugin-stats',
    component: 'MyPluginStats',  // Vue 组件名
    defaultSize: { w: 4, h: 2 }
  }],

  // 新增操作按钮
  actions: [{
    scope: 'shipment-order',
    label: 'VIP マーク',
    icon: 'Star',
    position: 'toolbar',
    handler: 'markAsVip'  // 注册的 handler 名
  }]
}
```

---

## 2. Webhook 集成指南

### 2.1 配置 Webhook

**通过 API 创建**:

```bash
curl -X POST http://localhost:4000/api/extensions/webhooks \
  -H "Content-Type: application/json" \
  -d '{
    "event": "order.shipped",
    "url": "https://your-system.com/webhook/order-shipped",
    "secret": "your-hmac-secret-key",
    "enabled": true,
    "retry": 3
  }'
```

### 2.2 接收 Webhook

Webhook 接收端需要：

```typescript
// 你的系统接收端示例
app.post('/webhook/order-shipped', (req, res) => {
  // 1. 验证签名
  const signature = req.headers['x-webhook-signature']
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', 'your-hmac-secret-key')
    .update(JSON.stringify(req.body))
    .digest('hex')

  if (signature !== expectedSignature) {
    return res.status(401).json({ error: 'Invalid signature' })
  }

  // 2. 处理事件
  const { event, data, timestamp } = req.body
  console.log(`Received ${event} at ${timestamp}`, data)

  // 3. 返回 200 表示成功接收
  res.status(200).json({ received: true })
})
```

### 2.3 Webhook 请求格式

```json
// Request Headers
{
  "Content-Type": "application/json",
  "X-Webhook-Signature": "sha256=abc123...",
  "X-Webhook-Event": "order.shipped",
  "X-Webhook-Delivery": "507f1f77bcf86cd799439011"
}

// Request Body
{
  "event": "order.shipped",
  "timestamp": "2026-03-14T10:30:00.000Z",
  "data": {
    "order": {
      "orderNumber": "SO-20260314-00042",
      "trackingId": "1234-5678-9012",
      "recipient": { "name": "田中太郎", "prefecture": "東京都" },
      "products": [
        { "productSku": "SKU-001", "quantity": 2 }
      ],
      "status": {
        "shipped": { "isShipped": true, "shippedAt": "2026-03-14T10:30:00Z" }
      }
    }
  }
}
```

### 2.4 可用事件列表

| 事件 | 触发时机 | Payload |
|------|----------|---------|
| `order.created` | 创建出库订单 | `{ order }` |
| `order.confirmed` | 确认订单 | `{ order, stockMoves }` |
| `order.shipped` | 出库完成 | `{ order }` |
| `order.cancelled` | 取消订单 | `{ order, reason }` |
| `inventory.changed` | 库存变化 | `{ productId, locationId, quantity, type }` |
| `stock.reserved` | 库存预留 | `{ orderId, items }` |
| `stock.released` | 库存释放 | `{ orderId, items }` |
| `wave.created` | 创建 Wave | `{ wave }` |
| `wave.completed` | Wave 完成 | `{ wave }` |
| `task.completed` | 任务完成 | `{ task }` |
| `inbound.received` | 收货完成 | `{ inboundOrder }` |
| `return.completed` | 退货完成 | `{ returnOrder }` |

### 2.5 重试策略

- 非 2xx 响应或网络错误触发重试
- 指数退避：第1次重试 2秒后，第2次 4秒后，第3次 8秒后
- 最大重试次数由配置决定（默认3次，最大10次）
- 超过最大重试次数后标记为 `failed`

---

## 3. 自动化脚本开发指南

### 3.1 脚本基础

脚本是绑定到特定事件的 JavaScript 代码段，在沙箱中执行。

**创建脚本（通过 API）**：

```bash
curl -X POST http://localhost:4000/api/extensions/scripts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "VIP订单自动分组",
    "description": "高价订单自动分配到VIP检品组",
    "event": "order.created",
    "code": "if (ctx.order.totalPrice > 10000) { ctx.setField(\"order.orderGroup\", \"VIP\") }",
    "enabled": true,
    "timeout": 5000
  }'
```

### 3.2 脚本 API

脚本中可用的上下文对象：

```javascript
ctx = {
  // 事件数据（只读）
  order: { ... },        // 订单数据
  product: { ... },      // 商品数据
  inventory: { ... },    // 库存数据

  // 修改方法（受限）
  setField(path, value)  // 设置字段值
}
```

### 3.3 脚本示例

**示例1: VIP 订单自动分组**
```javascript
// 事件: order.created
if (ctx.order._productsMeta && ctx.order._productsMeta.totalPrice > 10000) {
  ctx.setField('order.orderGroup', 'VIP')
}
```

**示例2: 冷冻品强制発払い**
```javascript
// 事件: order.created
var hasCool = false
for (var i = 0; i < ctx.order.products.length; i++) {
  if (ctx.order.products[i].coolType === '1' || ctx.order.products[i].coolType === '2') {
    hasCool = true
    break
  }
}
if (hasCool) {
  ctx.setField('order.invoiceType', '0')
}
```

**示例3: 自动添加标签**
```javascript
// 事件: order.created
var tags = ctx.order.handlingTags || []
if (ctx.order._productsMeta && ctx.order._productsMeta.totalQuantity > 10) {
  tags.push('大口')
}
if (ctx.order.coolType === '1') {
  tags.push('冷凍注意')
}
ctx.setField('order.handlingTags', tags)
```

### 3.4 脚本限制

| 限制 | 值 |
|------|-----|
| 执行超时 | 默认 5 秒 |
| 内存限制 | 32 MB |
| 可修改字段 | 白名单控制 |
| 禁止关键字 | `require`, `import`, `eval`, `Function`, `process`, `fs`, `child_process`, `net`, `http` |

**可修改字段白名单**：
- `order.orderGroup`
- `order.invoiceType`
- `order.coolType`
- `order.handlingTags`
- `order.customFields.*`

---

## 4. 自定义字段开发指南

### 4.1 创建字段定义

```bash
# 为订单添加 "销售渠道" 字段
curl -X POST http://localhost:4000/api/extensions/custom-fields \
  -H "Content-Type: application/json" \
  -d '{
    "scope": "order",
    "name": "salesChannel",
    "label": "販売チャネル",
    "type": "select",
    "options": ["Rakuten", "Amazon", "Shopify", "直販"],
    "required": false,
    "defaultValue": "直販"
  }'

# 为商品添加 "原产国" 字段
curl -X POST http://localhost:4000/api/extensions/custom-fields \
  -H "Content-Type: application/json" \
  -d '{
    "scope": "product",
    "name": "countryOfOrigin",
    "label": "原産国",
    "type": "string",
    "required": false
  }'
```

### 4.2 使用自定义字段

**设置值**：
```bash
curl -X PUT http://localhost:4000/api/extensions/custom-fields/order/{orderId}/salesChannel \
  -H "Content-Type: application/json" \
  -d '{ "value": "Rakuten" }'
```

**在搜索中使用**：
```json
{
  "filters": {
    "customFields.salesChannel": {
      "operator": "is",
      "value": "Rakuten"
    }
  }
}
```

### 4.3 前端渲染

自定义字段在详情页/表格中自动渲染，无需额外开发。系统根据字段 `type` 自动选择渲染组件：

| 类型 | 渲染组件 |
|------|----------|
| `string` | `el-input` |
| `number` | `el-input-number` |
| `boolean` | `el-switch` |
| `date` | `el-date-picker` |
| `select` | `el-select` |
| `multiselect` | `el-select multiple` |
| `text` | `el-input type="textarea"` |

---

## 5. Feature Flag 使用指南

### 5.1 后端中检查功能开关

```typescript
import { extensionManager } from '../core/extensions/extensionManager'

// 方式1: 在代码中检查
async function createWave(req, res) {
  const hasFeature = await extensionManager.checkFeature(req.tenantId, 'wavePicking')
  if (!hasFeature) {
    return res.status(403).json({ error: 'Wave picking is not available for your plan' })
  }
  // ... 创建 Wave 逻辑
}

// 方式2: 使用路由中间件
const featureFlags = extensionManager.getFeatureFlagService()

router.use('/waves', featureFlags.requireFeature('wavePicking'), waveController)
router.use('/webhooks', featureFlags.requireFeature('webhooks'), webhookController)
router.use('/scripts', featureFlags.requireFeature('scripting'), scriptController)
```

### 5.2 前端中检查功能开关

```typescript
// composables/useFeatureFlag.ts
import { featureFlagApi } from '@/api/featureFlags'

export function useFeatureFlag() {
  const features = ref<Record<string, boolean>>({})

  onMounted(async () => {
    features.value = await featureFlagApi.getAll()
  })

  function hasFeature(flag: string): boolean {
    return features.value[flag] === true
  }

  return { features, hasFeature }
}

// 在组件中使用
const { hasFeature } = useFeatureFlag()
// v-if="hasFeature('wavePicking')"
```

### 5.3 管理功能开关

```bash
# 为租户启用功能
curl -X PUT http://localhost:4000/api/extensions/feature-flags/wavePicking \
  -H "Content-Type: application/json" \
  -d '{ "enabled": true }'

# 查看所有功能开关
curl http://localhost:4000/api/extensions/feature-flags
```

---

## 6. Engine 集成指南

### 6.1 在现有代码中添加事件发射

在现有 Controller/Service 操作完成后，添加 `extensionManager.emit()` 调用：

```typescript
// 示例: shipmentOrderController.ts

import { extensionManager } from '../../core/extensions/extensionManager'

// 创建订单后
router.post('/', async (req, res) => {
  const order = new ShipmentOrder(req.body)
  await order.save()

  // 原有逻辑: 自动处理规则
  await processOrderEvent(order._id, 'order.created')

  // 新增: 发射事件到扩展系统
  await extensionManager.emit('order.created', { order: order.toObject() })

  res.status(201).json(order)
})

// 确认订单后
router.post('/:id/confirm', async (req, res) => {
  const order = await ShipmentOrder.findById(req.params.id)
  const stockMoves = await stockService.reserveStockForOrder(order._id, order.products)

  order.status.confirm = { isConfirmed: true, confirmedAt: new Date() }
  await order.save()

  // 新增
  await extensionManager.emit('order.confirmed', {
    order: order.toObject(),
    stockMoves
  })

  res.json(order)
})
```

### 6.2 Engine 设计模式

未来将 Controller 中的业务逻辑迁移到 Engine：

```typescript
// backend/src/core/engines/orderEngine.ts

class OrderEngine {
  async create(orderData: CreateOrderInput): Promise<OrderDoc> {
    // 1. 创建订单
    const order = new ShipmentOrder(orderData)
    await order.save()

    // 2. 发射事件（AutoProcessing + 插件 + 脚本 + Webhook 都会被触发）
    await extensionManager.emit('order.created', { order: order.toObject() })

    return order
  }

  async confirm(orderId: string): Promise<OrderDoc> {
    const order = await ShipmentOrder.findById(orderId)
    if (!order) throw new Error('Order not found')

    // 1. 库存预留
    const stockMoves = await inventoryEngine.reserve(orderId, order.products)

    // 2. 更新状态
    order.status.confirm = { isConfirmed: true, confirmedAt: new Date() }
    await order.save()

    // 3. 发射事件
    await extensionManager.emit('order.confirmed', { order: order.toObject(), stockMoves })

    return order
  }
}
```

---

## 7. 调试与排错

### 7.1 扩展系统日志

```bash
# 查看事件日志
curl "http://localhost:4000/api/extensions/logs?event=order.created&limit=10"

# 查看 Webhook 投递日志
curl "http://localhost:4000/api/extensions/webhooks/{id}/logs"

# 查看脚本执行日志
curl "http://localhost:4000/api/extensions/scripts/{id}/logs"
```

### 7.2 常见问题

| 问题 | 原因 | 解决 |
|------|------|------|
| 插件未加载 | manifest.json 格式错误 | 检查 JSON 语法 |
| 插件 Hook 未触发 | 事件名不匹配 | 检查 manifest.hooks 与 emit 事件名 |
| Webhook 未投递 | enabled=false 或 event 不匹配 | 检查配置 |
| Webhook 签名验证失败 | secret 不一致 | 两端使用相同 secret |
| 脚本执行超时 | 代码复杂或死循环 | 减少计算量，检查循环 |
| 脚本修改无效 | 字段不在白名单 | 检查允许修改的字段列表 |
| Feature flag 不生效 | 缓存未刷新 | 等待1分钟或重启服务 |

### 7.3 插件开发调试

```bash
# 启用插件详细日志
LOG_LEVEL=debug npm run dev

# 手动触发事件测试
curl -X POST http://localhost:4000/api/extensions/scripts/{id}/execute \
  -H "Content-Type: application/json" \
  -d '{ "order": { "totalPrice": 15000, "products": [] } }'
```

---

## 8. 插件 SDK（未来）

未来将提供 `@zelix/plugin-sdk`，简化插件开发：

```typescript
import { definePlugin } from '@zelix/plugin-sdk'

export default definePlugin({
  name: 'my-plugin',
  version: '1.0.0',

  hooks: {
    'order.created': async (ctx) => {
      if (ctx.order.totalPrice > 10000) {
        ctx.setField('order.orderGroup', 'VIP')
      }
    },

    'inventory.changed': async (ctx) => {
      if (ctx.quantity < 10) {
        await ctx.notify('低库存警告', `${ctx.productId} 库存不足`)
      }
    }
  },

  api: (router) => {
    router.get('/dashboard', (req, res) => {
      res.json({ status: 'healthy' })
    })
  }
})
```

安装使用：
```bash
npm install @zelix/plugin-sdk
```

---

## 9. 安全注意事项

### 9.1 插件安全

- 只从可信来源安装插件
- 审查插件 manifest 中的 permissions
- 生产环境禁用未知插件
- 定期更新插件版本

### 9.2 脚本安全

- 脚本代码在沙箱中执行，无法访问系统资源
- 但仍需审核脚本逻辑，避免业务错误
- 建议先在测试环境验证脚本

### 9.3 Webhook 安全

- 始终使用 HTTPS URL
- secret 使用高强度随机字符串
- 接收端必须验证 HMAC 签名
- 不要在 Webhook payload 中包含敏感数据（密码/token）
