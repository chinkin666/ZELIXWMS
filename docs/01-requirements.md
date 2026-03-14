# ZELIXWMS 需求文档（Requirements Document）

> 版本: 1.0 | 日期: 2026-03-14 | 系统名称: Nexand 出荷管理システム (ZELIXWMS)

---

## 1. 项目概述

ZELIXWMS 是一套面向日本 3PL（第三方物流）及电商履约企业的全栈仓储管理系统（WMS），覆盖从入库收货、库存管理、出库发货、退货处理到盘点的完整物流生命周期，并深度集成日本快递运营商（ヤマト運輸 B2 Cloud）API。

### 1.1 目标用户

| 角色 | 说明 |
|------|------|
| super_admin | 系统超级管理员，拥有全部权限 |
| admin | 仓库管理员，管理配置与运营 |
| operator | 仓库操作员，执行拣货/检品/上架 |
| viewer | 只读用户，查看报表与数据 |

### 1.2 业务目标

- 实现仓储全流程数字化管理
- 支持多荷主（3PL客户）、多仓库运营
- 自动化运单生成与标签打印
- 支持多电商平台订单导入
- 提供实时库存可视化与预警

---

## 2. 功能需求

### 2.1 出库管理（出荷管理）

#### FR-OUT-001: 出荷指示管理
- 支持手动创建出库订单
- 支持 CSV/Excel 批量导入订单（通过 MappingConfig 映射不同电商平台格式）
- 订单字段：订单号、收件人/发件人/委托人地址、商品明细（SKU/数量/单价）、配送方式、温度类型、时间指定
- 支持订单分组（検品グループ）
- 支持订单保留（hold）/取消保留
- 支持订单拆分
- 订单状态流转：创建 → 运单回执 → 确认（锁库）→ 已打印 → 已检品 → 已出库 → EC导出

#### FR-OUT-002: 运营商自动化（ヤマト B2 Cloud）
- B2 Cloud API 集成：验证（validate）→ 登录（export 获取追踪号）→ 打印标签（PDF）
- 3层会话缓存（内存 → MongoDB → API 登录）
- 自动重试机制（session 过期自动重新登录）
- 运费类型支持：発払い/着払い/コレクト/コンパクト/ネコポス/DM便/EAZY/タイム等
- 温度类型支持：通常/冷凍/冷蔵
- 分拣码（ソートコード）自动计算
- 批量 PDF 下载

#### FR-OUT-003: 自动处理规则引擎
- 事件触发型：order.created / confirmed / carrierReceived / printed / inspected / shipped / ecExported
- 条件匹配：订单字段、状态、分组、原始数据行
- 操作符：is / isNot / contains / hasAnyValue / isEmpty / between / before / after
- 动作：自动添加商品、设置检品分组
- 支持手动执行规则

#### FR-OUT-004: 检品作业
- 1:1 检品模式（OneByOne）：扫描订单 → 逐件扫描商品条码
- N:1 检品模式（OneProduct）：扫描商品 → 跨多个订单匹配
- 条码扫描硬件支持（OBarcodeListener 组件）

#### FR-OUT-005: Wave 拣货
- 创建 Wave（批次）：从已确认订单中选择
- Wave 状态流转：draft → picking → sorting → packing → completed
- 自动创建拣货任务（WarehouseTask）
- 按 FEFO（先到期先出）分配库存
- 拣货完成 → 分拣 → 打包 → 出库

#### FR-OUT-006: 标签打印
- Canvas 可视化模板设计器（拖拽元素：文本/条码/QR码/图片/矩形）
- 数据绑定：通过 transform pipeline 将订单字段映射到模板变量
- 服务端 Skia Canvas 渲染 → PNG → PDF 组装
- Worker 线程并行渲染（Piscina）
- 渲染缓存机制

#### FR-OUT-007: 帳票打印（PDF 文档）
- PDFMake 驱动的文档模板（送り状/纳品书等）
- 前端可视化编辑器
- 客户端 PDF 生成

### 2.2 入库管理（入庫管理）

#### FR-IN-001: 入库指示
- 手动创建/CSV 导入入库订单
- 订单明细：商品/预期数量/收货数量/上架数量/库存分类（新品/损品）/批次
- 状态流转：draft → confirmed → receiving → received → done

#### FR-IN-002: 收货作业
- 条码扫描收货界面
- 按行确认收货数量
- 自动写入 InventoryLedger（库存流水台帳）
- 全部行完成后自动推进状态

#### FR-IN-003: 上架作业
- RuleEngine 自动推荐上架库位
- 创建上架任务（putaway WarehouseTask）
- 完成上架：更新 StockQuant、写入 InventoryLedger

### 2.3 库存管理（在庫管理）

#### FR-INV-001: 库存查询
- 按商品/库位/批次维度查看库存（StockQuant）
- 显示可用量、预留量
- 库位层级结构（仓库 → 区域 → 货架 → 库位）

#### FR-INV-002: 库存移动
- 记录所有库存变动（StockMove）
- 移动类型：入库/出库/内部调拨/退货
- 状态：draft → confirmed → done → cancelled

#### FR-INV-003: 库存调整
- 手动库存调整（差异处理）
- 写入 InventoryLedger 审计记录

#### FR-INV-004: 批次管理
- 批次状态：active / expired / recalled / quarantine
- 有效期管理、生产日期追踪
- 到期预警（alertDaysBeforeExpiry）

#### FR-INV-005: 库存流水台帳
- 追加式审计日志（InventoryLedger）
- 类型：inbound / outbound / reserve / release / adjustment / count
- 关联源单据（入库单/出库单/盘点单/退货单/手动）

#### FR-INV-006: 补货工作流
- 安全库存检查（safetyStock 阈值）
- 自动触发补货任务
- 从储备库位 → 拣货库位移动

### 2.4 盘点管理（棚卸管理）

#### FR-ST-001: 盘点
- 盘点类型：全面盘点（full）/ 循环盘点（cycle）/ 抽查（spot）
- 状态：draft → in_progress → completed → adjusted
- 明细：系统数量 vs 实盘数量 → 差异
- 差异调整

### 2.5 退货管理（返品管理）

#### FR-RET-001: 退货处理
- 退货原因：客户要求/不良品/错发/损坏/其他
- 退货状态：draft → inspecting → completed
- 处置方式：重新上架（restock）/ 废弃（dispose）/ 修理（repair）/ 待定（pending）
- 重新上架自动回补库存

### 2.6 商品管理

#### FR-PRD-001: 商品主数据
- 字段：SKU（唯一）、名称、条码（多条码）、sub-SKU（辅助编码）
- 温度类型（coolType）、商品分类（商品/消耗品/作業/おまけ/部材）
- 序列号追踪、批次追踪、有效期追踪
- 库存启用标记、安全库存
- 分配规则：FIFO / FEFO / LIFO

#### FR-PRD-002: 套装商品（セット組）
- 定义套装组件（components）
- 组装作业指示
- 组装履历

#### FR-PRD-003: 条码管理
- 多条码关联
- 条码查找与映射

### 2.7 仓库任务管理

#### FR-TASK-001: 仓库任务
- 任务类型：putaway / picking / replenishment / packing / sorting / cycle_count / transfer / receiving
- 状态：created → assigned → in_progress → completed
- 关联：来源/目标库位、商品、批次、Wave、出库单

#### FR-TASK-002: 序列号追踪
- 按件追踪，关联商品与订单

### 2.8 运营管理

#### FR-OPS-001: 日报
- 状态：open / closed / locked
- 汇总指标：出库数、入库数、退货数、库存变动、盘点情况

#### FR-OPS-002: 定时任务
- 动作类型：auto_allocate / auto_batch / auto_print / auto_label / inventory_sync / report_generate / cleanup
- Cron 表达式配置
- 跳过假日选项

#### FR-OPS-003: 操作日志
- 所有 WMS 用户操作的审计追踪

#### FR-OPS-004: API 日志
- 外部 API 调用记录（请求/响应）

### 2.9 设置与配置

#### FR-SET-001: 映射配置（MappingConfig）
- 类型：ec-company-to-order / order-to-carrier / order-to-sheet / customer / product / inventory
- Pipeline 式转换引擎：inputs → per-input pipeline → combine → output pipeline
- 支持不同电商平台文件格式的灵活映射

#### FR-SET-002: 运营商配置
- 运营商定义（CSV 列格式）
- B2 Cloud API 配置（endpoint/apiKey/customerCode 等）
- 服务类型映射（发票类型 → B2 服务类型 + 打印模板）

#### FR-SET-003: 邮件模板
- 出荷通知邮件模板编辑

#### FR-SET-004: 系统设置
- 入库检品规则、库存规则、出库分配规则
- 条码格式、语言、时区

### 2.10 多租户 & 多仓库

#### FR-MT-001: 多租户
- 租户计划：free / starter / standard / pro / enterprise
- 功能开关（features[]）
- 用户数/仓库数/客户数限制

#### FR-MT-002: 多仓库
- 仓库主数据（地址、温度区域、容量、营业时间）
- 库位关联仓库

#### FR-MT-003: 多荷主（3PL 客户）
- 客户主数据（Client）
- 数据按 tenantId 隔离

### 2.11 国际化

#### FR-I18N-001: 多语言
- 日语（默认）/ 英语 / 中文（简体）
- 前端语言切换器
- WMS 专业术语词典

---

## 3. 非功能需求

### NFR-001: 性能
- 标签渲染使用 Worker 线程并行处理
- PDF/图片渲染缓存
- 数据库索引优化（复合索引/文本索引）

### NFR-002: 可靠性
- MongoDB 重连机制
- B2 Cloud API 自动重试（session 过期/服务器错误）
- 3层会话缓存降低 API 依赖

### NFR-003: 安全性
- Helmet 安全头
- CORS 白名单
- 角色权限控制（4级层级）
- 操作审计日志
- **待完善**: 后端目前无认证中间件，API 开放访问

### NFR-004: 可扩展性
- 插件系统（前端 PluginRegistry）
- 可配置的转换管道（MappingConfig pipeline）
- 自动处理规则引擎

### NFR-005: 可用性
- 响应式布局（移动端侧边栏）
- 条码扫描硬件集成
- 丰富的 UI 组件库（Odoo 风格）

---

## 4. 数据需求

### 4.1 核心数据实体

| 实体 | 集合名 | 说明 |
|------|--------|------|
| ShipmentOrder | orders | 出库订单 |
| InboundOrder | inbound_orders | 入库订单 |
| StockQuant | stock_quants | 库存量子（按商品+库位+批次） |
| StockMove | stock_moves | 库存移动记录 |
| InventoryLedger | inventory_ledger | 库存流水台帳 |
| Product | products | 商品主数据 |
| Location | locations | 库位 |
| Lot | lots | 批次 |
| Wave | waves | Wave 批次拣货 |
| WarehouseTask | warehouse_tasks | 仓库任务 |
| ReturnOrder | return_orders | 退货单 |
| StocktakingOrder | stocktaking_orders | 盘点单 |
| Carrier | carriers | 运营商 |
| MappingConfig | mapping_configs | 映射配置 |
| PrintTemplate | print_templates | 标签模板 |
| FormTemplate | form_templates | 帳票模板 |
| Tenant | tenants | 租户 |
| Warehouse | warehouses | 仓库 |
| Client | clients | 3PL 客户（荷主） |

### 4.2 数据关系

```
Tenant ──1:N──> Warehouse ──1:N──> Location (层级: zone > shelf > bin)
Tenant ──1:N──> Client (荷主)
Product ──1:N──> StockQuant <──N:1── Location
Product ──1:N──> Lot
StockQuant ──1:N──> StockMove
ShipmentOrder ──N:1──> OrderGroup
ShipmentOrder ──N:1──> OrderSourceCompany
ShipmentOrder ──N:1──> Carrier
ShipmentOrder ──N:M──> Product (via products[])
Wave ──1:N──> ShipmentOrder
Wave ──1:N──> WarehouseTask
InboundOrder ──1:N──> WarehouseTask
SetProduct ──N:M──> Product (via components[])
```

---

## 5. 外部接口

| 接口 | 类型 | 说明 |
|------|------|------|
| ヤマト B2 Cloud API | REST | 运单验证/登录/打印/历史查询/PDF下载 |
| ヤマト分拣码计算器 | REST | 邮编 → 分拣码转换 |
| MongoDB | Database | 主数据存储 |

---

## 6. 约束与限制

1. **B2 Cloud 核心代码禁止修改**（详见 CLAUDE.md）
2. MongoDB 事务需要 Replica Set 模式
3. 后端认证机制待实现（当前 API 无鉴权）
4. 前端认证为 Mock 模式（localStorage）
5. 多租户隔离目前为应用层过滤，非中间件级别
