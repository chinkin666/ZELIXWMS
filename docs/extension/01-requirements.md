# ZELIX WMS 二次开发扩展架构 — 需求文档

> Extension Architecture v1 | 日期: 2026-03-14

---

## 1. 项目背景与目标

### 1.1 背景

ZELIX WMS 核心系统已具备企业级 WMS 基础功能（出荷/入庫/在庫/棚卸/返品/Wave拣货/B2 Cloud集成），数据模型达到 SAP EWM / Manhattan WMS 级别。但当前所有业务逻辑硬编码在 Controller/Service 中，缺乏扩展机制，无法满足：

- 不同客户的定制需求（VIP订单处理、自动赠品、特殊物流规则）
- 外部系统对接（ERP/OMS/EC平台 Webhook）
- SaaS 多租户差异化功能
- 未来插件市场/生态系统

### 1.2 目标

构建 **Extension Architecture v1**，实现：

| 目标 | 说明 |
|------|------|
| 核心稳定 | Core Engine 永远不动，所有扩展通过接口 |
| 插件式扩展 | 第三方可开发/安装/购买插件 |
| SaaS 可升级 | 功能开关按租户/计划差异化 |
| 低代码自动化 | 用户可写简单脚本实现业务规则 |
| 外部集成 | Webhook / External API 标准化 |

### 1.3 核心原则

```
Core System（稳定，不修改）
        ↓
Extension Layer（所有扩展通过此层）
        ↓
Plugins / Hooks / Scripts / Webhooks
```

---

## 2. 功能需求

### 2.1 ExtensionManager（扩展管理核心）

#### FR-EXT-001: 事件发射与监听

- 系统核心操作完成后，通过 `ExtensionManager.emit(event, payload)` 发射事件
- 插件/Hook/Script/Webhook 通过统一事件总线接收并响应
- 事件处理支持异步，不阻塞核心流程（可配置同步/异步模式）
- 事件处理失败不影响核心操作（隔离性）

#### FR-EXT-002: 标准 Hook 事件列表

必须预留以下事件触发点：

| Hook 事件 | 触发位置 | Payload |
|-----------|----------|---------|
| `order.created` | 创建出库订单后 | `{ order }` |
| `order.confirmed` | 确认订单（锁库）后 | `{ order, stockMoves }` |
| `order.shipped` | 出库完成后 | `{ order }` |
| `order.cancelled` | 订单取消后 | `{ order, reason }` |
| `order.held` | 订单保留时 | `{ order }` |
| `order.unheld` | 订单解除保留时 | `{ order }` |
| `inventory.changed` | 库存变化后 | `{ productId, locationId, quantity, type }` |
| `stock.reserved` | 库存预留后 | `{ orderId, items }` |
| `stock.released` | 库存释放后 | `{ orderId, items }` |
| `wave.created` | 创建 Wave 后 | `{ wave }` |
| `wave.completed` | Wave 完成后 | `{ wave }` |
| `task.created` | 任务创建后 | `{ task }` |
| `task.completed` | 任务完成后 | `{ task }` |
| `inbound.received` | 收货完成后 | `{ inboundOrder }` |
| `inbound.putaway.completed` | 上架完成后 | `{ inboundOrder }` |
| `return.completed` | 退货完成后 | `{ returnOrder }` |
| `stocktaking.completed` | 盘点完成后 | `{ stocktakingOrder }` |

---

### 2.2 Plugin System（插件系统）

#### FR-PLG-001: 插件生命周期管理

- 安装（install）：加载插件代码 + 注册 Hook
- 启用（enable）：激活插件功能
- 禁用（disable）：暂停插件，不卸载
- 更新（update）：热更新插件版本
- 卸载（uninstall）：移除插件 + 清理数据

#### FR-PLG-002: 插件目录结构

```
extensions/plugins/{plugin-name}/
├── manifest.json       # 插件声明（名称/版本/Hook/权限）
├── index.ts            # 插件入口
├── hooks.ts            # Hook 处理逻辑
├── api.ts              # 自定义 API 端点
├── ui.ts               # 前端 UI 扩展声明
└── config.schema.json  # 配置项 Schema
```

#### FR-PLG-003: 插件声明（manifest.json）

```json
{
  "name": "inventory-alert",
  "version": "1.0.0",
  "description": "库存预警插件",
  "author": "ZELIX",
  "hooks": ["inventory.changed"],
  "permissions": ["inventory.read", "notification.send"],
  "config": {
    "threshold": { "type": "number", "default": 10 }
  }
}
```

#### FR-PLG-004: 插件权限控制

- 插件必须在 manifest 中声明所需权限
- 系统校验权限，拒绝越权操作
- 权限粒度：`{domain}.{action}`（如 `inventory.read`、`order.write`、`notification.send`）

#### FR-PLG-005: 插件配置

- 每个插件可定义配置项（config.schema.json）
- 配置按租户隔离存储（`plugin_configs` 集合）
- 提供 UI 配置界面

#### FR-PLG-006: 插件 API 扩展

- 插件可注册自定义 API 端点
- 统一挂载在 `/api/plugins/{pluginName}/...`
- 受插件权限控制

#### FR-PLG-007: 插件 UI 扩展

- 插件可通过 PluginRegistry 注册前端扩展
- 支持扩展类型：菜单项、页面、按钮、仪表板 Widget
- 接口：`registerMenu()` / `registerPage()` / `registerAction()` / `registerWidget()`

---

### 2.3 Webhook System

#### FR-WHK-001: Webhook 配置

- 用户可配置 Webhook 订阅：事件 + URL + 密钥 + 重试次数
- 数据模型：

```json
{
  "event": "order.shipped",
  "url": "https://client.com/webhook/order-shipped",
  "secret": "hmac-secret-key",
  "enabled": true,
  "retry": 3,
  "tenantId": "..."
}
```

#### FR-WHK-002: Webhook 投递

- 事件触发后，WebhookDispatcher 异步发送 HTTP POST
- 请求体包含事件名 + payload + 时间戳
- 使用 HMAC-SHA256 签名（secret）
- 失败自动重试（指数退避）
- 记录投递日志（成功/失败/重试）

#### FR-WHK-003: Webhook 管理

- CRUD 管理 Webhook 配置
- 测试发送功能
- 查看投递历史和状态

---

### 2.4 Script Engine（低代码自动化）

#### FR-SCR-001: 自动化脚本

- 用户可编写 JavaScript 脚本，绑定到 Hook 事件
- 脚本在沙箱环境中执行（限制文件系统/网络访问）
- 脚本可访问事件 payload + 只读系统 API

#### FR-SCR-002: 脚本示例

```javascript
// 触发: order.created
if (order.totalPrice > 10000) {
  order.orderGroup = "VIP"
}

// 触发: order.created
if (order.products.some(p => p.coolType === '1')) {
  order.invoiceType = '0'  // 冷凍品强制発払い
}
```

#### FR-SCR-003: 脚本管理

- 数据库存储：`automation_scripts` 集合
- 启用/禁用控制
- 执行日志记录
- 错误隔离（脚本失败不影响核心）

---

### 2.5 Custom Fields（自定义字段）

#### FR-CF-001: 自定义字段定义

- 管理员可为核心实体添加自定义字段
- 支持范围（scope）：`order` / `product` / `inventory` / `client` / `inbound` / `return`

#### FR-CF-002: 字段类型

| 类型 | 说明 |
|------|------|
| `string` | 文本 |
| `number` | 数值 |
| `boolean` | 布尔 |
| `date` | 日期 |
| `select` | 下拉选择（预定义选项） |
| `multiselect` | 多选 |
| `text` | 长文本 |

#### FR-CF-003: 字段存储

- 定义存储在 `custom_field_definitions` 集合
- 值存储在各实体的 `customFields: { [key]: value }` 字段中
- 支持搜索/筛选/排序

---

### 2.6 Feature Flags（功能开关）

#### FR-FF-001: 租户级功能开关

- 按租户控制功能可用性
- 与 `tenant.plan` 关联（不同计划不同功能）
- 运行时检查，无需重启

#### FR-FF-002: 预定义功能标记

| Feature Flag | 说明 | 最低计划 |
|--------------|------|----------|
| `wavePicking` | Wave 批次拣货 | standard |
| `multiWarehouse` | 多仓库管理 | standard |
| `lotTracking` | 批次追踪 | starter |
| `serialTracking` | 序列号追踪 | standard |
| `expiryTracking` | 保质期管理 | starter |
| `autoProcessing` | 自动处理规则 | starter |
| `carrierAutomation` | 运营商 API 自动化 | standard |
| `webhooks` | Webhook 推送 | pro |
| `scripting` | 自动化脚本 | pro |
| `plugins` | 插件安装 | pro |
| `customFields` | 自定义字段 | standard |
| `aiForecast` | AI 需求预测 | enterprise |
| `3dWarehouse` | 3D 仓库可视化 | enterprise |
| `multiTenant` | 多租户管理 | enterprise |

---

## 3. 非功能需求

### NFR-EXT-001: 隔离性

- 插件/脚本执行失败不影响核心系统运行
- 插件之间相互隔离
- Webhook 投递失败不阻塞业务流程

### NFR-EXT-002: 性能

- Hook 事件处理默认异步（fire-and-forget）
- 可配置同步模式（用于需要结果的场景，如数据变换）
- Webhook 投递使用队列，不阻塞请求线程

### NFR-EXT-003: 安全性

- 脚本在沙箱中执行，禁止文件系统/网络/进程操作
- 插件权限校验，不可越权
- Webhook 使用 HMAC 签名防篡改
- 插件 API 受认证/授权保护

### NFR-EXT-004: 可观测性

- 所有扩展操作记录日志（EventLog）
- Webhook 投递历史可查询
- 脚本执行日志可查询
- 插件错误收集与告警

### NFR-EXT-005: 兼容性

- 扩展系统不影响现有 API 和功能
- 渐进式引入，现有 AutoProcessingEngine 可作为内置插件迁移
- 插件 API 版本化管理（semver）

---

## 4. 数据需求

### 4.1 新增集合

| 集合 | 说明 |
|------|------|
| `plugins` | 已安装插件注册信息 |
| `plugin_configs` | 插件配置（按租户） |
| `webhooks` | Webhook 订阅配置 |
| `webhook_logs` | Webhook 投递日志 |
| `automation_scripts` | 自动化脚本定义 |
| `script_execution_logs` | 脚本执行日志 |
| `custom_field_definitions` | 自定义字段定义 |
| `event_logs` | 统一事件日志 |

### 4.2 现有集合扩展

| 集合 | 扩展 |
|------|------|
| `tenants` | 增加 `features[]` 功能开关数组 |
| `orders` | 增加 `customFields: {}` |
| `products` | 增加 `customFields: {}` |
| `inbound_orders` | 增加 `customFields: {}` |
| `return_orders` | 增加 `customFields: {}` |

---

## 5. 外部接口需求

### 5.1 新增 API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/extensions/hooks` | GET | 查看已注册的 Hook 事件 |
| `/api/extensions/plugins` | GET/POST/PUT/DELETE | 插件 CRUD |
| `/api/extensions/plugins/:name/config` | GET/PUT | 插件配置 |
| `/api/extensions/plugins/:name/enable` | POST | 启用插件 |
| `/api/extensions/plugins/:name/disable` | POST | 禁用插件 |
| `/api/extensions/webhooks` | GET/POST/PUT/DELETE | Webhook CRUD |
| `/api/extensions/webhooks/:id/test` | POST | 测试 Webhook |
| `/api/extensions/webhooks/:id/logs` | GET | 投递日志 |
| `/api/extensions/scripts` | GET/POST/PUT/DELETE | 脚本 CRUD |
| `/api/extensions/scripts/:id/execute` | POST | 手动执行脚本 |
| `/api/extensions/scripts/:id/logs` | GET | 执行日志 |
| `/api/extensions/custom-fields` | GET/POST/PUT/DELETE | 自定义字段定义 |
| `/api/extensions/feature-flags` | GET/PUT | 功能开关管理 |
| `/api/plugins/{pluginName}/*` | * | 插件自定义端点 |

### 5.2 对外 Webhook 格式

```json
{
  "event": "order.shipped",
  "timestamp": "2026-03-14T10:30:00Z",
  "data": { /* event payload */ },
  "signature": "HMAC-SHA256 hash"
}
```

---

## 6. 约束与限制

1. **Core Engine 禁止修改** — 所有扩展必须通过 Extension Layer
2. **禁止写死逻辑** — 不允许 `if(yamato)` 式硬编码，应通过 `carrierPlugin` 模式
3. **向后兼容** — 扩展系统不破坏现有 API/功能
4. **渐进式引入** — 可分阶段实施，每阶段独立可用
5. **脚本沙箱** — 用户脚本禁止访问文件系统/网络/进程

---

## Phase 13: LOGIFAST入庫要件整合 / LOGIFAST入库要件整合

> 基于 0531【入庫編】LOGIFAST要件定義修正版.xlsx 的入库模块要件，整合到现有 ZELIXWMS 架构中。
> 0531版LOGIFAST入庫要件定義に基づき、既存ZELIXWMS アーキテクチャへ統合する。

### 背景 / 背景
- LOGIFAST要件定義は2025年5月31日合意版の入庫業務フルスペック
- 現行ZELIXWMSは入庫基本機能を実装済みだが、以下の業務要件が不足
- 本Phaseでは段階的にLOGIFAST要件を統合する

### 13.1 商品マスタ拡張 / 商品主数据扩展

**追加フィールド / 新增字段:**
| フィールド | 型 | 必須 | 説明(JP) | 说明(CN) |
|---|---|---|---|---|
| customerProductCode | String | △ | 顧客商品コード/ハウスコード | 客户商品编码/内部管理编码 |
| brandCode | String | △ | ブランドコード | 品牌编码 |
| brandName | String | △ | ブランド名称 | 品牌名称 |
| sizeName | String | △ | サイズ名称 | 尺码名称 |
| colorName | String | △ | カラー名称 | 颜色名称 |
| unitType | String enum | △ | 単位区分(01:ﾋﾟｰｽ/02:ｹｰｽ/03:ﾕﾆｯﾄ/04:ﾎﾞｯｸｽ/05:ﾛｰﾙ) | 单位类型 |
| outerBoxWidth | Number | △ | 外箱サイズ縦(cm) | 外箱尺寸-长 |
| outerBoxDepth | Number | △ | 外箱サイズ横(cm) | 外箱尺寸-宽 |
| outerBoxHeight | Number | △ | 外箱サイズ高(cm) | 外箱尺寸-高 |
| outerBoxVolume | Number | △ | 外箱容積(M3) | 外箱体积 |
| outerBoxWeight | Number | △ | 外箱重量(kg) | 外箱重量 |
| grossWeight | Number | △ | 総重量G/W(kg) | 毛重 |
| shippingSizeCode | String | △ | 配送サイズ(SS/60/80/.../260) | 配送尺寸编码 |
| taxType | String enum | △ | 税区分(01:課税/02:非課税) | 税区分 |
| taxRate | Number | △ | 税率(%) | 税率 |
| hazardousType | String enum | △ | 危険区分(0:一般/1:危険) | 危险品区分 |
| airTransportBan | Boolean | △ | 航空搭載禁止 | 禁止航空运输 |
| barcodeCommission | Boolean | △ | バーコード委託区分 | 条码委托贴付 |
| reservationTarget | Boolean | △ | 予約対象区分 | 是否预约对象 |

### 13.2 入庫予定拡張 / 入库预定扩展

**InboundOrder 追加フィールド:**
| フィールド | 型 | 必須 | 説明(JP) | 说明(CN) |
|---|---|---|---|---|
| requestedDate | Date | △ | 入庫希望日 | 入库希望日 |
| supplier.phone | String | △ | 納品元電話番号 | 供货方电话 |
| supplier.postalCode | String | △ | 納品元郵便番号 | 供货方邮编 |
| supplier.address | String | △ | 納品元住所 | 供货方地址 |
| containerType | String enum | △ | コンテナ(20ft/40ft/40ftH) | 集装箱类型 |
| cubicMeters | Number | △ | 立方数(M3) | 体积 |
| palletCount | Number | △ | パレット数 | 托盘数 |
| innerBoxCount | Number | △ | インナー箱数 | 内箱数 |
| importBatchNumber | String | △ | 取込管理番号 | 导入批次号 |
| importBatchDate | Date | △ | 取込管理日 | 导入批次日期 |

**InboundOrderLine 追加フィールド:**
| フィールド | 型 | 必須 | 説明(JP) | 说明(CN) |
|---|---|---|---|---|
| expectedCaseCount | Number | △ | 入庫予定ケース数 | 预定箱数 |
| receivedCaseCount | Number | △ | 入庫実績ケース数 | 实际箱数 |
| caseUnitType | String enum | △ | ケース単位(01-05) | 箱单位类型 |
| caseUnitQuantity | Number | △ | ケース入数 | 每箱数量 |
| customerProductCode | String | △ | 顧客商品コード | 客户商品编码 |
| inspectionCode | String | △ | 検品コード | 检品编码 |

### 13.3 倉庫/ロケーション拡張 / 仓库/库位扩展

**Location 追加フィールド:**
| フィールド | 型 | 説明(JP) | 说明(CN) |
|---|---|---|---|
| stockType | String enum | 倉庫コード(01:良品/02:不良品/03:保留/04:返品/05:廃棄/06:その他/07-:指定品) | 库存类型 |
| temperatureType | String enum | 倉庫種類(01:常温/02:冷蔵/03:冷凍/04:危険/05:その他) | 温度类型 |

### 13.4 入庫帳票 / 入库单据

printTemplate系统に以下のテンプレートを追加:
1. **入庫予定一覧表** — 商品コード/商品名/納品元/倉庫種類/入庫予定数/入庫数/未入庫数/付帯作業
2. **入庫チェックリスト** — 入庫予定数/入庫数/差異/結果判明/コンテナ・パレット・カートン・pcs集計
3. **入庫差異/破損リスト** — 差異分のみ抽出/良品数/不良品数/結果判明
4. **入庫実績一覧表** — 全明細の入庫実績
5. **入庫看板(A4)** — 商品コード/検品コード/商品名/入庫日/棚番号/入庫数/バーコード

### 13.5 納品元/仕入先マスタ / 供货方/采购方主数据

**新規Model: Supplier**
| フィールド | 型 | 必須 | 説明(JP) | 说明(CN) |
|---|---|---|---|---|
| tenantId | String | ○ | テナントID | 租户ID |
| code | String | ○ | 仕入先コード | 供货方编码 |
| name | String | ○ | 名称 | 名称 |
| phone | String | △ | 電話番号 | 电话 |
| postalCode | String | △ | 郵便番号 | 邮编 |
| address | String | △ | 住所 | 地址 |
| clientId | ObjectId | △ | 関連顧客 | 关联客户 |
| isActive | Boolean | ○ | 有効フラグ | 有效标志 |

### 実装優先度 / 实施优先级

| 優先度 | 内容 | 影響範囲 |
|---|---|---|
| P0 | 商品マスタ拡張 + 入庫予定拡張 + Location拡張 | Product, InboundOrder, Location models |
| P1 | 入庫帳票テンプレート5種 | renderService, printTemplate |
| P2 | Supplier独立マスタ化 | 新model + routes + controller |
| P3 | 配送サイズ自動判定ロジック | Product pre-save hook |
