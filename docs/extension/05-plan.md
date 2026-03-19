# ZELIX WMS 二次开发扩展架构 — 开发计划

> Extension Architecture v1 | 日期: 2026-03-14

---

## 总览

整个扩展架构分 **5 个阶段**实施，每个阶段独立可用。

```
Phase 1: ExtensionManager + HookManager       ← 基础框架
Phase 2: WebhookDispatcher                     ← 外部集成
Phase 3: PluginManager                         ← 插件生态
Phase 4: ScriptRunner                          ← 低代码自动化
Phase 5: CustomFields + FeatureFlags           ← SaaS 基础
```

---

## Phase 1: ExtensionManager + HookManager

> 基础事件框架，所有后续阶段的基座

### 目标

- 建立统一事件总线
- 在核心操作中埋入事件发射点
- 不影响现有功能

### 任务清单

| # | 任务 | 文件 | 预估 |
|---|------|------|------|
| 1.1 | 创建类型定义 | `backend/src/core/extensions/types.ts` | 0.5h |
| 1.2 | 实现 HookManager | `backend/src/core/extensions/hookManager.ts` | 2h |
| 1.3 | 实现 ExtensionManager（Phase1 精简版，仅含 HookManager） | `backend/src/core/extensions/extensionManager.ts` | 1.5h |
| 1.4 | 创建 EventLog 模型 | `backend/src/models/eventLog.ts` | 0.5h |
| 1.5 | 在 `server.ts` 中初始化 ExtensionManager | 修改 `server.ts` | 0.5h |
| 1.6 | 在出荷指示 Controller 中添加 emit 调用 | 修改 `shipmentOrderController.ts` | 1h |
| 1.7 | 在库存服务中添加 emit 调用 | 修改 `stockService.ts` | 0.5h |
| 1.8 | 在入库 Controller 中添加 emit 调用 | 修改 `inboundOrderController.ts` | 0.5h |
| 1.9 | 在出库工作流中添加 emit 调用 | 修改 `outboundWorkflow.ts` | 0.5h |
| 1.10 | 在入库工作流中添加 emit 调用 | 修改 `inboundWorkflow.ts` | 0.5h |
| 1.11 | 创建 Hook 查看 API | `backend/src/api/controllers/hookController.ts` | 1h |
| 1.12 | 注册扩展路由 | 修改 `app.ts`, `routes/index.ts` | 0.5h |
| 1.13 | 测试所有事件触发 | 测试 | 2h |

**预估总时间**: ~11h

### 交付物

- `backend/src/core/extensions/` 目录（types.ts, hookManager.ts, extensionManager.ts）
- `backend/src/models/eventLog.ts`
- 17 个标准 Hook 事件已埋入核心代码
- `GET /api/extensions/hooks` 接口可查看已注册事件

### 验收标准

- [x] 创建订单后 `order.created` 事件被发射
- [x] 确认订单后 `order.confirmed` 事件被发射
- [x] 出库后 `order.shipped` 事件被发射
- [x] 库存变化后 `inventory.changed` 事件被发射
- [x] 事件日志写入 `event_logs` 集合
- [x] 所有事件处理异步执行，不影响核心操作性能
- [x] 单个 handler 失败不影响其他 handler

---

## Phase 2: WebhookDispatcher

> 外部系统集成能力

### 依赖

- Phase 1 完成

### 目标

- 用户可配置 Webhook 订阅
- 事件触发后自动推送到外部 URL
- 支持签名验证和重试

### 任务清单

| # | 任务 | 文件 | 预估 |
|---|------|------|------|
| 2.1 | 创建 Webhook 模型 | `backend/src/models/webhook.ts` | 0.5h |
| 2.2 | 创建 WebhookLog 模型 | `backend/src/models/webhookLog.ts` | 0.5h |
| 2.3 | 实现 WebhookDispatcher | `backend/src/core/extensions/webhookDispatcher.ts` | 3h |
| 2.4 | 集成到 ExtensionManager.emit() | 修改 `extensionManager.ts` | 0.5h |
| 2.5 | 实现 Webhook 管理 Controller | `backend/src/api/controllers/webhookController.ts` | 2h |
| 2.6 | 注册路由 | 修改 `extensionRoutes.ts` | 0.5h |
| 2.7 | 前端: Webhook 管理页面 | `frontend/src/views/settings/WebhookSettings.vue` | 4h |
| 2.8 | 前端: Webhook API 客户端 | `frontend/src/api/webhooks.ts` | 0.5h |
| 2.9 | 前端: 投递日志查看 | 集成在 WebhookSettings.vue | 2h |
| 2.10 | 测试 Webhook 投递和重试 | 测试 | 2h |

**预估总时间**: ~15.5h

### 交付物

- WebhookDispatcher 完整实现（HMAC签名/重试/日志）
- Webhook CRUD API + 测试发送
- 前端 Webhook 管理页面
- 投递日志查看

### 验收标准

- [x] 可创建 Webhook 订阅指定事件 + URL
- [x] 事件触发后 Webhook 自动投递
- [x] 使用 HMAC-SHA256 签名
- [x] 失败自动重试（指数退避）
- [x] 投递日志可查询
- [x] 测试发送功能正常

---

## Phase 3: PluginManager

> 插件生态基础

### 依赖

- Phase 1 完成

### 目标

- 支持文件系统插件加载
- 插件可注册 Hook + API + UI 扩展
- 插件可配置、启用/禁用

### 任务清单

| # | 任务 | 文件 | 预估 |
|---|------|------|------|
| 3.1 | 创建 Plugin 模型 | `backend/src/models/plugin.ts` | 0.5h |
| 3.2 | 创建 PluginConfig 模型 | `backend/src/models/pluginConfig.ts` | 0.5h |
| 3.3 | 实现 PluginManager | `backend/src/core/extensions/pluginManager.ts` | 4h |
| 3.4 | 集成到 ExtensionManager | 修改 `extensionManager.ts` | 1h |
| 3.5 | 创建 `extensions/plugins/` 目录结构 | 项目根目录 | 0.5h |
| 3.6 | 实现示例插件: inventory-alert | `extensions/plugins/inventory-alert/` | 2h |
| 3.7 | 实现插件管理 Controller | `backend/src/api/controllers/pluginController.ts` | 2h |
| 3.8 | 注册插件 API 路由 | 修改 `app.ts` | 0.5h |
| 3.9 | 前端: 插件管理页面 | `frontend/src/views/settings/PluginManagement.vue` | 4h |
| 3.10 | 前端: 插件配置 UI | 集成在 PluginManagement.vue | 2h |
| 3.11 | 前端: PluginRegistry 扩展 | 修改 `frontend/src/core/plugin/PluginRegistry.ts` | 2h |
| 3.12 | 前端: 插件 API 客户端 | `frontend/src/api/plugins.ts` | 0.5h |
| 3.13 | 测试插件加载/启用/禁用 | 测试 | 2h |

**预估总时间**: ~21.5h

### 交付物

- PluginManager 完整实现
- 插件目录结构规范
- 示例插件 (inventory-alert)
- 插件管理 CRUD API
- 前端插件管理页面
- 插件 Hook/API/UI 注册能力

### 验收标准

- [x] 系统启动时自动加载 `extensions/plugins/*/` 插件
- [x] 插件可注册 Hook handler
- [x] 插件可注册自定义 API（`/api/plugins/{name}/*`）
- [x] 插件可启用/禁用
- [x] 插件配置按租户隔离
- [x] 示例插件正常工作

---

## Phase 4: ScriptRunner

> 低代码自动化

### 依赖

- Phase 1 完成

### 目标

- 用户可编写简单 JS 脚本
- 脚本在沙箱中安全执行
- 替代部分手动自动处理规则

### 任务清单

| # | 任务 | 文件 | 预估 |
|---|------|------|------|
| 4.1 | 安装 `isolated-vm` 依赖 | `backend/package.json` | 0.5h |
| 4.2 | 创建 AutomationScript 模型 | `backend/src/models/automationScript.ts` | 0.5h |
| 4.3 | 创建 ScriptExecutionLog 模型 | `backend/src/models/scriptExecutionLog.ts` | 0.5h |
| 4.4 | 实现 ScriptRunner | `backend/src/core/extensions/scriptRunner.ts` | 4h |
| 4.5 | 集成到 ExtensionManager.emit() | 修改 `extensionManager.ts` | 0.5h |
| 4.6 | 实现脚本管理 Controller | `backend/src/api/controllers/scriptController.ts` | 2h |
| 4.7 | 注册路由 | 修改 `extensionRoutes.ts` | 0.5h |
| 4.8 | 前端: 脚本编辑器页面 | `frontend/src/views/settings/ScriptEditor.vue` | 5h |
| 4.9 | 前端: 代码编辑器集成（CodeMirror/Monaco） | 集成在 ScriptEditor.vue | 2h |
| 4.10 | 前端: 脚本测试/执行 UI | 集成在 ScriptEditor.vue | 2h |
| 4.11 | 前端: 执行日志查看 | 集成在 ScriptEditor.vue | 1.5h |
| 4.12 | 前端: 脚本 API 客户端 | `frontend/src/api/scripts.ts` | 0.5h |
| 4.13 | 测试脚本执行和安全隔离 | 测试 | 3h |

**预估总时间**: ~22.5h

### 交付物

- ScriptRunner 沙箱实现（isolated-vm）
- 脚本 CRUD API + 手动执行 + 语法校验
- 前端脚本编辑器（代码高亮 + 测试 + 日志）
- 5个示例脚本模板

### 验收标准

- [x] 脚本在沙箱中执行，无法访问系统资源
- [x] 脚本可读取事件 payload
- [x] 脚本可通过 setField 修改白名单字段
- [x] 超时保护正常工作（5秒超时）
- [x] 禁止关键字检查生效
- [x] 执行日志正确记录

---

## Phase 5: CustomFields + FeatureFlags

> SaaS 基础设施

### 依赖

- Phase 1 完成（FeatureFlags 独立，CustomFields 需要 UI）

### 目标

- 管理员可定义自定义字段
- 功能按租户计划控制
- 为 SaaS 多租户打下基础

### 任务清单

| # | 任务 | 文件 | 预估 |
|---|------|------|------|
| 5.1 | 创建 CustomFieldDefinition 模型 | `backend/src/models/customFieldDefinition.ts` | 0.5h |
| 5.2 | 实现 CustomFieldService | `backend/src/core/extensions/customFieldService.ts` | 2h |
| 5.3 | 实现 FeatureFlagService | `backend/src/core/extensions/featureFlagService.ts` | 2h |
| 5.4 | 为核心模型添加 `customFields` 字段 | 修改 4 个模型文件 | 1h |
| 5.5 | 实现自定义字段 Controller | `backend/src/api/controllers/customFieldController.ts` | 2h |
| 5.6 | 实现功能开关 Controller | `backend/src/api/controllers/featureFlagController.ts` | 1.5h |
| 5.7 | 添加 FeatureFlag 路由中间件到关键路由 | 修改多个路由文件 | 1.5h |
| 5.8 | 注册路由 | 修改 `extensionRoutes.ts` | 0.5h |
| 5.9 | 前端: 自定义字段管理页面 | `frontend/src/views/settings/CustomFieldSettings.vue` | 4h |
| 5.10 | 前端: 自定义字段渲染组件 | `frontend/src/components/odoo/OCustomFields.vue` | 3h |
| 5.11 | 前端: 将自定义字段集成到订单/商品详情页 | 修改多个 view 文件 | 2h |
| 5.12 | 前端: 功能开关管理页面 | `frontend/src/views/settings/FeatureFlagSettings.vue` | 2h |
| 5.13 | 前端: useFeatureFlag composable | `frontend/src/composables/useFeatureFlag.ts` | 1h |
| 5.14 | 前端: 在导航/页面中集成功能开关 | 修改 WmsLayout.vue + router | 1.5h |
| 5.15 | 前端: API 客户端 | `frontend/src/api/customFields.ts`, `featureFlags.ts` | 1h |
| 5.16 | 测试自定义字段和功能开关 | 测试 | 2h |

**预估总时间**: ~27.5h

### 交付物

- CustomFieldService 完整实现
- FeatureFlagService 完整实现（含缓存 + 中间件）
- 自定义字段管理页面 + 自动渲染组件
- 功能开关管理页面
- 核心路由已集成功能开关守卫

### 验收标准

- [x] 可为订单/商品/入库单/退货单定义自定义字段
- [x] 自定义字段值正确存储和查询
- [x] 自定义字段在详情页自动渲染
- [x] 功能开关按租户计划控制
- [x] 中间件正确拦截未授权功能
- [x] 前端菜单/页面根据功能开关显示/隐藏

---

## 实施时间线

```
Week 1-2:   Phase 1 (ExtensionManager + HookManager)     ~11h
Week 2-3:   Phase 2 (WebhookDispatcher)                   ~15.5h
Week 3-5:   Phase 3 (PluginManager)                       ~21.5h
Week 5-7:   Phase 4 (ScriptRunner)                        ~22.5h
Week 7-10:  Phase 5 (CustomFields + FeatureFlags)         ~27.5h
```

**总预估**: ~98h

### 并行实施优化

Phase 2、3、4 仅依赖 Phase 1，可并行开发：

```
Week 1-2:   Phase 1 (必须先完成)
Week 3-5:   Phase 2 + Phase 3 并行
Week 5-7:   Phase 4 + Phase 5 并行
```

**优化后**: ~6-7 周（双人团队 4-5 周）

---

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 事件发射影响核心性能 | 中 | 默认异步执行 + 性能监控 |
| isolated-vm 兼容性 | 中 | Phase 4 可降级为 vm2 或简单 Function 沙箱 |
| 插件代码质量不可控 | 高 | 权限控制 + 错误隔离 + 日志监控 |
| Webhook 投递延迟 | 低 | 异步投递 + 未来可引入队列 |
| 自定义字段性能影响 | 低 | customFields 使用 Mixed 类型，按需索引 |

---

## 后续规划（Phase 6+）

| 阶段 | 内容 | 前提 | 状态 |
|------|------|------|------|
| Phase 6 | Plugin SDK (`@zelix/plugin-sdk`) | Phase 3 稳定 | **✅ 完成 (2026-03-16)** |
| Phase 7 | 插件管理增强 (Health + SDK Info + Detail) | Phase 6 完成 | **✅ 完成 (2026-03-16)** |
| Phase 8 | 更多内置插件（佐川/日本郵便） | Phase 3 完成 | **✅ 完成 (2026-03-16)** 佐川+日本郵便 SDK 化 |
| Phase 9 | Redis + BullMQ（队列化 Webhook/脚本/审计） | Phase 2+4 需要扩展时 | **✅ 完成 (2026-03-16)** |
| Phase 10 | GraphQL API (Apollo v5, 只读 Query) | 当 REST 不够灵活时 | **✅ 完成 (2026-03-16)** |
| Phase 11 | AI Engine（需求预测/拣货优化） | 业务需求驱动 | 待开发 |
| Phase 12 | 3D 仓库可视化 | 业务需求驱动 | 待开发 |

---

## 关键原则提醒

1. **Core 永远不动** — 扩展不修改核心 Engine/Model 的已有逻辑
2. **渐进式引入** — 每个 Phase 独立可用，不依赖后续 Phase
3. **隔离性优先** — 扩展失败 ≠ 系统故障
4. **不要写死逻辑** — `carrierPlugin` 而非 `if(yamato)`
5. **向后兼容** — 现有 API 不变，扩展是增量
