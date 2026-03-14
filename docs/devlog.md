# 开发记录 / 開発記録

> ZELIX WMS Development Log
> 所有开发活动按时间倒序记录 / すべての開発活動を時系列逆順で記録

---

## [2026-03-14] Extension Architecture Phase 5 完成 / 拡張アーキテクチャ Phase 5 完了

**变更类型 / 変更種別**: feat
**影响范围 / 影響範囲**: `backend/src/core/extensions/customFieldService.ts`、`backend/src/core/extensions/featureFlagService.ts`、`backend/src/models/customFieldDefinition.ts`、`backend/src/models/featureFlag.ts`
**关联文档 / 関連ドキュメント**: `docs/extension/05-plan.md`

### 内容 / 内容

实现了 Extension Architecture Phase 5（CustomFields + FeatureFlags）：

#### 新增文件 / 新規ファイル
- `backend/src/models/customFieldDefinition.ts` — 自定义字段定义模型（支持 text/number/boolean/date/select 类型）
- `backend/src/models/featureFlag.ts` — 功能开关模型（支持按租户覆盖）
- `backend/src/core/extensions/customFieldService.ts` — 自定义字段服务（CRUD + 值校验 + 默认值）
- `backend/src/core/extensions/featureFlagService.ts` — 功能开关服务（含1分钟内存缓存 + 租户覆盖）
- `backend/src/api/controllers/customFieldController.ts` — 自定义字段管理 API
- `backend/src/api/controllers/featureFlagController.ts` — 功能开关管理 API
- `frontend/src/api/customField.ts` — 前端自定义字段 API 客户端
- `frontend/src/api/featureFlag.ts` — 前端功能开关 API 客户端
- `frontend/src/views/settings/CustomFieldSettings.vue` — 自定义字段管理页面
- `frontend/src/views/settings/FeatureFlagSettings.vue` — 功能开关管理页面
- `frontend/src/composables/useFeatureFlag.ts` — 功能开关 composable

#### 修改文件 / 変更ファイル
- `backend/src/core/extensions/extensionManager.ts` — 集成 CustomFieldService + FeatureFlagService
- `backend/src/core/extensions/index.ts` — 导出新服务
- `backend/src/api/routes/extensions.ts` — 注册 custom-fields 和 feature-flags 路由
- `backend/src/models/shipmentOrder.ts` — 添加 customFields 字段
- `backend/src/models/product.ts` — 添加 customFields 字段
- `backend/src/models/inboundOrder.ts` — 添加 customFields 字段
- `backend/src/models/returnOrder.ts` — 添加 customFields 字段
- `frontend/src/router/index.ts` — 注册 CustomFieldSettings 和 FeatureFlagSettings 路由
- `frontend/src/layouts/WmsLayout.vue` — 侧边栏添加「カスタムフィールド」和「フィーチャーフラグ」菜单
- `frontend/src/views/settings/product-settings/ProductFormDialog.vue` — 集成 OCustomFields 到商品独自フィールド tab
- `frontend/src/components/form/ShipmentOrderEditDialog.vue` — 集成 OCustomFields 到订单编辑「カスタムフィールド」tab
- `backend/src/api/middleware/featureFlagGuard.ts` — 功能开关路由中间件（NEW）
- `backend/src/api/routes/extensions.ts` — Webhook/Plugin/Script 路由添加功能开关守卫

#### API 新增 / API 追加
- `GET /api/extensions/custom-fields` — 列出所有字段定义
- `POST /api/extensions/custom-fields` — 创建字段定义
- `GET /api/extensions/custom-fields/:entityType/active` — 获取指定实体启用的字段定义
- `POST /api/extensions/custom-fields/:entityType/validate` — 校验字段值
- `PUT /api/extensions/custom-fields/:id` — 更新字段定义
- `DELETE /api/extensions/custom-fields/:id` — 删除字段定义
- `GET /api/extensions/feature-flags` — 列出所有功能开关
- `GET /api/extensions/feature-flags/status` — 获取租户功能状态映射
- `POST /api/extensions/feature-flags` — 创建功能开关
- `PUT /api/extensions/feature-flags/:id` — 更新功能开关
- `DELETE /api/extensions/feature-flags/:id` — 删除功能开关
- `POST /api/extensions/feature-flags/:id/toggle` — 切换功能开关
- `POST /api/extensions/feature-flags/:id/tenant-override` — 设置租户覆盖
- `DELETE /api/extensions/feature-flags/:id/tenant-override/:tenantId` — 删除租户覆盖

---

## [2026-03-14] Extension Architecture Phase 4 完成 / 拡張アーキテクチャ Phase 4 完了

**变更类型 / 変更種別**: feat
**影响范围 / 影響範囲**: `backend/src/core/extensions/scriptRunner.ts`、`backend/src/models/automationScript.ts`、`backend/src/models/scriptExecutionLog.ts`
**关联文档 / 関連ドキュメント**: `docs/extension/05-plan.md`

### 内容 / 内容

实现了 Extension Architecture Phase 4（ScriptRunner）：

#### 新增文件 / 新規ファイル
- `backend/src/models/automationScript.ts` — 自动化脚本模型
- `backend/src/models/scriptExecutionLog.ts` — 脚本执行日志模型（30天TTL）
- `backend/src/core/extensions/scriptRunner.ts` — 脚本执行器（Node.js vm 沙箱）
- `backend/src/api/controllers/scriptController.ts` — 脚本管理 API
- `frontend/src/api/script.ts` — 前端脚本 API 客户端
- `frontend/src/views/settings/ScriptEditor.vue` — 脚本管理页面

#### 修改文件 / 変更ファイル
- `backend/src/core/extensions/extensionManager.ts` — 集成 ScriptRunner（emit 后异步执行匹配脚本）
- `backend/src/api/routes/extensions.ts` — 注册脚本管理路由
- `frontend/src/router/index.ts` — 注册脚本页面路由
- `frontend/src/layouts/WmsLayout.vue` — 侧边栏添加「スクリプト」菜单

#### 安全特性 / セキュリティ機能
- Node.js vm 沙箱隔离（禁止代码生成和 WASM）
- 禁止关键字检查（require, import, eval, process, fs 等）
- 白名单字段修改（仅允许修改指定路径如 order.orderGroup）
- 超时保护（100ms - 30s 可配置）
- 创建时强制语法校验

#### API 新增 / API 追加
- `GET /api/extensions/scripts` — 列出所有脚本
- `POST /api/extensions/scripts` — 创建脚本（含语法校验）
- `GET /api/extensions/scripts/:id` — 获取单个脚本
- `PUT /api/extensions/scripts/:id` — 更新脚本
- `DELETE /api/extensions/scripts/:id` — 删除脚本
- `POST /api/extensions/scripts/:id/toggle` — 切换启用/禁用
- `POST /api/extensions/scripts/:id/validate` — 语法校验
- `POST /api/extensions/scripts/:id/test` — 手动测试执行
- `GET /api/extensions/scripts/:id/logs` — 查询执行日志

---

## [2026-03-14] Extension Architecture Phase 3 完成 / 拡張アーキテクチャ Phase 3 完了

**变更类型 / 変更種別**: feat
**影响范围 / 影響範囲**: `backend/src/core/extensions/pluginManager.ts`、`backend/src/models/plugin.ts`、`backend/src/models/pluginConfig.ts`、`extensions/plugins/`
**关联文档 / 関連ドキュメント**: `docs/extension/05-plan.md`

### 内容 / 内容

实现了 Extension Architecture Phase 3（PluginManager）：

#### 新增文件 / 新規ファイル
- `backend/src/models/plugin.ts` — 插件元数据模型
- `backend/src/models/pluginConfig.ts` — 插件配置模型（按租户隔离）
- `backend/src/core/extensions/pluginManager.ts` — 插件管理器（加载/启用/禁用/配置）
- `backend/src/api/controllers/pluginController.ts` — 插件管理 API
- `extensions/plugins/inventory-alert/` — 示例插件（库存预警）
- `frontend/src/api/plugin.ts` — 前端插件 API 客户端
- `frontend/src/views/settings/PluginManagement.vue` — 插件管理页面

#### 修改文件 / 変更ファイル
- `backend/src/core/extensions/extensionManager.ts` — 集成 PluginManager（启动时加载插件）
- `backend/src/core/extensions/index.ts` — 导出 PluginManager
- `backend/src/api/routes/extensions.ts` — 注册插件管理路由
- `backend/src/app.ts` — 挂载插件自定义 API 路由 (`/api/plugins/{name}/*`)
- `frontend/src/router/index.ts` — 注册插件管理页面路由
- `frontend/src/layouts/WmsLayout.vue` — 侧边栏添加「プラグイン」菜单

#### API 新增 / API 追加
- `GET /api/extensions/plugins` — 列出所有插件
- `GET /api/extensions/plugins/:name` — 获取单个插件详情
- `POST /api/extensions/plugins/:name/enable` — 启用插件
- `POST /api/extensions/plugins/:name/disable` — 禁用插件
- `GET /api/extensions/plugins/:name/config` — 获取插件配置
- `PUT /api/extensions/plugins/:name/config` — 更新插件配置
- `GET /api/plugins/{name}/*` — 插件自定义 API

---

## [2026-03-14] Extension Architecture Phase 2 完成 / 拡張アーキテクチャ Phase 2 完了

**变更类型 / 変更種別**: feat
**影响范围 / 影響範囲**: `backend/src/core/extensions/webhookDispatcher.ts`、`backend/src/models/webhook.ts`、`backend/src/models/webhookLog.ts`、`backend/src/api/controllers/webhookController.ts`
**关联文档 / 関連ドキュメント**: `docs/extension/05-plan.md`

### 内容 / 内容

实现了 Extension Architecture Phase 2（WebhookDispatcher）的后端部分：

拡張アーキテクチャ Phase 2（WebhookDispatcher）のバックエンドを実装完了：

#### 新增文件 / 新規ファイル
- `backend/src/models/webhook.ts` — Webhook 配置模型 / Webhook 設定モデル
- `backend/src/models/webhookLog.ts` — 投递日志模型（30天TTL）/ 配信ログモデル（30日TTL）
- `backend/src/core/extensions/webhookDispatcher.ts` — Webhook 投递器（HMAC-SHA256 签名、指数退避重试、30s 超时）
- `backend/src/api/controllers/webhookController.ts` — Webhook CRUD + 测试发送 + 投递日志查询

#### 修改文件 / 変更ファイル
- `backend/src/core/extensions/extensionManager.ts` — 集成 WebhookDispatcher（emit 后异步投递）
- `backend/src/api/routes/extensions.ts` — 注册 Webhook 路由

#### API 新增 / API 追加
- `GET /api/extensions/webhooks` — 列出所有 Webhook（可按 event/enabled 筛选）
- `POST /api/extensions/webhooks` — 创建 Webhook（自动生成 secret）
- `GET /api/extensions/webhooks/:id` — 获取单个 Webhook
- `PUT /api/extensions/webhooks/:id` — 更新 Webhook
- `DELETE /api/extensions/webhooks/:id` — 删除 Webhook
- `POST /api/extensions/webhooks/:id/test` — 测试发送
- `POST /api/extensions/webhooks/:id/toggle` — 快速切换启用/禁用
- `GET /api/extensions/webhooks/:id/logs` — 查询投递日志（分页）

---

## [2026-03-14] Extension Architecture Phase 1 完成 / 拡張アーキテクチャ Phase 1 完了

**变更类型 / 変更種別**: feat
**影响范围 / 影響範囲**: `backend/src/core/extensions/`、`backend/src/models/eventLog.ts`、核心 Controller/Service
**关联文档 / 関連ドキュメント**: `docs/extension/01-requirements.md` ~ `docs/extension/05-plan.md`

### 内容 / 内容

实现了 Extension Architecture Phase 1 的全部内容：

拡張アーキテクチャ Phase 1 のすべてを実装完了：

#### 新增文件 / 新規ファイル
- `backend/src/core/extensions/types.ts` — 17个标准 Hook 事件定义 / 17個の標準 Hook イベント定義
- `backend/src/core/extensions/hookManager.ts` — Hook 注册与事件分发 / Hook 登録・イベント配信
- `backend/src/core/extensions/extensionManager.ts` — 统一扩展管理入口 / 統一拡張管理エントリ
- `backend/src/core/extensions/index.ts` — 公共导出 / 公開エクスポート
- `backend/src/models/eventLog.ts` — 事件日志模型（90天TTL）/ イベントログモデル（90日TTL）
- `backend/src/api/controllers/extensionController.ts` — Hook 查看 + 事件日志 API
- `backend/src/api/routes/extensions.ts` — 扩展系统路由

#### 修改文件 / 変更ファイル
- `backend/src/server.ts` — 初始化 ExtensionManager / ExtensionManager 初期化
- `backend/src/api/routes/index.ts` — 注册 `/api/extensions` 路由
- `backend/src/api/controllers/shipmentOrderController.ts` — 埋入 order.created/confirmed/shipped/held/unheld/cancelled 事件
- `backend/src/services/stockService.ts` — 埋入 stock.reserved/released + inventory.changed 事件
- `backend/src/services/inboundWorkflow.ts` — 埋入 inbound.received/putaway.completed 事件
- `backend/src/services/outboundWorkflow.ts` — 埋入 wave.created/completed 事件
- `backend/src/api/controllers/returnOrderController.ts` — 埋入 return.completed 事件

#### API 新增 / API 追加
- `GET /api/extensions/hooks` — 查看所有 Hook 事件及 handler
- `GET /api/extensions/hooks/summary` — Hook 概要
- `GET /api/extensions/logs` — 事件日志查询（分页）
- `GET /api/extensions/logs/stats` — 事件日志统计

---

## [2026-03-14] 建立开发规范与记录体系 / 開発規範と記録体制の構築

**变更类型 / 変更種別**: docs
**影响范围 / 影響範囲**: `CLAUDE.md`, `docs/devlog.md`
**关联文档 / 関連ドキュメント**: `CLAUDE.md`

### 内容 / 内容

新增三条项目规则 / 3つのプロジェクトルールを追加：

1. **文档同步规则** — 需求/设计/技术/开发/计划变更时，必须先更新对应文档再开发
   **ドキュメント同期ルール** — 要件/設計/技術/開発/計画変更時、対応ドキュメントを先に更新してから開発

2. **开发记录规则** — 所有开发活动记录到 `docs/devlog.md`
   **開発記録ルール** — すべての開発活動を `docs/devlog.md` に記録

3. **双语备注规则** — 所有备注、注释、文档使用中文+日文双语
   **バイリンガル注釈ルール** — すべてのコメント・注釈・ドキュメントは中国語+日本語の二言語

---
