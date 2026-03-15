# 开发记录 / 開発記録

> ZELIX WMS Development Log
> 所有开发活动按时间倒序记录 / すべての開発活動を時系列逆順で記録

---

## [2026-03-15] 商品設定ページに在庫数カラムと在庫フィルターを追加 / 商品设置页面添加库存数列和库存过滤器

**变更类型 / 変更種別**: feat
**影响范围 / 影響範囲**: `frontend/src/views/settings/ProductSettings.vue`
**关联文档 / 関連ドキュメント**: なし

### 内容 / 内容

商品設定ページに以下の改善を実施：
对商品设置页面进行了以下改善：

- **在庫数カラム追加 / 添加库存数列**: テーブルに「在庫数」列を追加。既存の在庫サマリーAPIを非同期で呼び出し、商品一覧と在庫数量をマージ表示。在庫あり=緑色、在庫なし=グレー表示。
- **在庫クイックフィルター追加 / 添加库存快速过滤器**: 「全て」「在庫あり」「在庫なし」の3ボタンフィルターを追加。クライアントサイドで即時フィルタリング。
- **CSV出力に在庫数を追加 / CSV导出添加库存数**: CSV出力設定に在庫数列を追加。

技術的アプローチ：バックエンド変更なし。既存の `/api/inventory/stock/summary` エンドポイントを利用して、商品一覧ロード後に非同期で在庫データを取得・マージする軽量な実装。
技术方案：无后端变更。利用已有的 `/api/inventory/stock/summary` 端点，在商品列表加载后异步获取库存数据进行合并的轻量级实现。

---

## [2026-03-16] 第2弾: 機能拡充・UX改善・モバイル対応 / 第2弹: 功能扩充、UX改善、移动端适配

**变更类型 / 変更種別**: feat, fix, refactor
**影响范围 / 影響範囲**: 全モジュール
**关联文档 / 関連ドキュメント**: なし

### 内容 / 内容

#### 新機能 / 新功能
- 商品一括ラベル印刷（複数商品選択→順次印刷、前後ナビ付きプレビュー）
- 返品ダッシュボード（KPIカード+理由別集計+最近の返品テーブル）
- ロケーション使用状況表示（GET /api/inventory/location-usage + 色分けバッジ）
- 日次レポートKPIカード（出荷/入庫/返品/在庫/棚卸の完了率表示）
- 日次レポート詳細ページに進捗バー追加

#### 品質改善 / 质量改善
- CSV導入バリデーション改善（エラー行赤ハイライト+インラインメッセージ+サマリーバナー）
- Wave管理バグ修正（assignedNameスキーマ欠落、warehouseIdフォーム欠落）
- モバイルレスポンシブ対応（InboundReceive/InboundPutaway/OrderItemScan）
- サイドバーナビゲーション整理（業務フロー順、設定グループ再編）

---

## [2026-03-16] 返品管理改善・商品ラベル・N+1最適化 / 返品管理改善、商品标签、N+1优化

**变更类型 / 変更種別**: feat, fix, perf
**影响范围 / 影響範囲**: 返品管理、商品設定、入庫CSV、stockService
**关联文档 / 関連ドキュメント**: なし

### 内容 / 内容

#### 返品管理フロー改善 / 返品管理流程改善
- 後端: 返品検品に数量バリデーション追加（Zodスキーマ）、操作ログ接入
- 前端: 返品詳細ページにロケーション選択器追加（disposition=restock時）
- 前端: 数量バリデーションUI（エラー行ハイライト+インラインメッセージ）
- 前端: 返品作成ページの商品SKU入力をマスタドロップダウンに変更

#### 入庫CSV仕入先マスタ連携 / 入库CSV仕入先主数据连接
- InboundImport: CSV値/マスタ選択/手動入力の3モード対応

#### 商品ラベル印刷機能 / 商品标签打印功能
- 商品一覧ページに「ラベル」ボタン追加
- LabelPrintDialog: テンプレート選択→プレビュー→印刷
- renderTemplateToPng: 汎用コンテキスト対応リファクタ

#### stockService N+1クエリ最適化 / stockService N+1查询优化
- reserveStockForOrder: 商品/在庫/ロット一括取得（N回→2~3回に削減）
- completeStockForOrder: bulkWrite + updateMany化
- unreserveStockForOrder: 同上パターン

---

## [2026-03-15] 入庫管理強化・操作ログ・帳票拡張・検品UX・コード品質 / 入库管理强化、操作日志、帐票扩展、检品UX、代码质量

**变更类型 / 変更種別**: feat, fix, refactor, perf
**影响范围 / 影響範囲**: 全モジュール（出荷/入庫/在庫/商品/帳票/検品）
**关联文档 / 関連ドキュメント**: なし

### 内容 / 内容

#### 機能追加 / 功能追加
- 送り状種類マッピング enabled Zodスキーマ修正 + 出荷指示フォーム連動
- 操作ログ全量接入（出荷CRUD/ステータス、入庫全操作、在庫調整/移動、商品CRUD、B2エクスポート）
- 入庫差異レポート API + 検品画面に差異サマリー表示
- 棚入れロケーション推薦 API + 自動選択・ヒント表示
- 帳票テンプレートに入庫系（入庫リスト/検品シート）・商品ラベル targetType 追加
- 入庫一覧ページ帳票印刷ボタン接続
- FormTemplateSettings Table組件化 + プリセットテンプレート
- 在庫ダッシュボードKPIカード + 期限切れ警告
- 入庫仕入先フィールドを仕入先マスタ連携

#### 出荷検品UX改善 / 出货检品UX改善
- 3ページ共通: 検品進捗バー、スキャン成功フラッシュ
- 商品スキャン検品: 重複スキャン防護
- N-1/1-1検品: スキャンエラー時に期待SKU表示
- 自動印刷失敗時のエラー表示

#### コード品質修正 / 代码质量修正
- v-for変数遮蔽修正（3箇所）、renderサービスconsole→logger（24箇所）
- JSON.parse防護、regex注入対策、静默エラー→logger.warn
- ruleController Zodバリデーション、DBインデックス追加

---

## [2026-03-14] Phase 8: 佐川急便插件实装 / Phase 8: 佐川急便プラグイン実装

**变更类型 / 変更種別**: feat
**影响范围 / 影響範囲**: `extensions/plugins/sagawa-express/`、`frontend/src/api/sagawa.ts`、`backend/src/api/routes/sagawa.ts`
**关联文档 / 関連ドキュメント**: `docs/extension/05-plan.md` Phase 8

### 内容 / 内容

将佐川急便 CSV 连携从硬编码路由迁移到标准插件架构。
佐川急便 CSV 連携をハードコードルートから標準プラグインアーキテクチャに移行。

#### 新增文件 / 新規ファイル
- `extensions/plugins/sagawa-express/manifest.json` — 插件声明
- `extensions/plugins/sagawa-express/index.ts` — 插件入口（Hook 注册 + API 注册）
- `extensions/plugins/sagawa-express/routes.ts` — 插件 API 路由（5个端点）
- `extensions/plugins/sagawa-express/services/sagawaCsvService.ts` — CSV 生成服务
- `extensions/plugins/sagawa-express/services/sagawaTrackingService.ts` — 追踪号解析服务
- `extensions/plugins/sagawa-express/data/invoiceTypes.ts` — 送り状种类 + 配达时间带定义

#### 变更文件 / 変更ファイル
- `frontend/src/api/sagawa.ts` — API 路径迁移到 `/api/plugins/sagawa-express/*`
- `backend/src/api/routes/sagawa.ts` — 旧路由添加 deprecation 警告

#### API 端点 / API エンドポイント
- `GET /api/plugins/sagawa-express/status` — 插件状态
- `GET /api/plugins/sagawa-express/invoice-types` — 送り状种类
- `GET /api/plugins/sagawa-express/config` — 插件配置
- `POST /api/plugins/sagawa-express/export` — CSV 导出
- `POST /api/plugins/sagawa-express/import-tracking` — 追踪号导入

#### Hook 连携 / Hook 連携
- `order.shipped` — 佐川订单出荷完了时记录日志
- `order.confirmed` — 佐川订单确认时记录日志

---

## [2026-03-14] UI 打磨 + Dashboard 改善 / UI ポリッシュ + ダッシュボード改善

**变更类型 / 変更種別**: fix / refactor
**影响范围 / 影響範囲**: `frontend/src/views/Welcome.vue`、`frontend/src/components/odoo/ODialog.vue`、`frontend/src/components/layout/WmsNavbar.vue`、`backend/src/core/queue/queueManager.ts`、`frontend/.env.development`、`frontend/src/views/settings/ProductSettings.vue`、`frontend/src/views/inventory/InventoryStock.vue`
**关联文档 / 関連ドキュメント**: 无 / なし

### 内容 / 内容

#### Dashboard 改善 / ダッシュボード改善
- Dashboard 页面增加 padding，修复内容紧贴顶部/边缘的问题 / ダッシュボードページに padding を追加、コンテンツが上端・端に密着する問題を修正
- Quick Nav 图标从纯文字符号（+, >, v, #）改为 SVG 图标 / クイックナビのアイコンをテキスト文字から SVG アイコンに変更
- 保留・逾期订单卡片增加警告/危险背景色 / 保留・遅延注文カードに警告・危険背景色を追加
- 最近出荷表格点击修复（从创建页改为作业列表）/ 最近出荷テーブルのクリック先を修正（作成ページ→作業一覧）

#### Navbar 改善 / ナビバー改善
- Home 按钮与菜单之间增加分隔线 / ホームボタンとメニュー間にセパレーターを追加

#### Bug 修复 / バグ修正
- ODialog `width` 属性警告消除（`inheritAttrs: false`）/ ODialog width 属性警告を解消
- 前端 `.env.development` 中 API 地址从 `192.168.0.99` 改为 `localhost` / フロントエンド API アドレスを localhost に変更
- 后端 + 前端 host 绑定从 `0.0.0.0` 改为 `localhost` / バックエンド・フロントエンドの host バインドを localhost に変更
- 商品一览 + 在库一览的产品图片大小限制（inline style 替代 scoped CSS）/ 商品・在庫一覧の商品画像サイズを制限

#### 基础设施 / インフラ
- Redis 连接失败不再无限刷错误日志（3次重试后放弃，只打一次 WARN）/ Redis 接続失敗時の無限ログ出力を修正
- BullMQ 队列名从 `wms:webhook` 改为 `wms-webhook`（修复 `:` 不允许的问题）/ BullMQ キュー名のコロンをハイフンに修正

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
