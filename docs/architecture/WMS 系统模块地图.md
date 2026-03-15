> **状态: 产品路线图参考** — OMS + WMS + TMS + Billing + Analytics + Platform 分层与当前三端设计(admin/frontend/portal)一致。作为长期产品规划参考。
> **ステータス: プロダクトロードマップ参考** — 6層構造は現行の3アプリ設計と整合。長期プロダクト計画の参考として保持。

《ZELIX WMS 系统模块地图（像 SAP 那样的产品地图）》。
这种 Product Map（产品地图） 是很多企业软件都会做的，比如：

SAP S/4HANA

SAP Extended Warehouse Management

Manhattan Active Warehouse Management

它的作用是：

让系统从“单一WMS”
升级为
完整物流平台
一、ZELIX Logistics Platform（系统产品地图）
                    ZELIX LOGISTICS PLATFORM

 ┌─────────────────────────────────────────────────────┐
 │                     Commerce Layer                  │
 │                                                     │
 │ Marketplace Integration                             │
 │ Rakuten / Amazon / Shopify / Yahoo                  │
 └─────────────────────────────────────────────────────┘

 ┌─────────────────────────────────────────────────────┐
 │                       OMS                           │
 │               Order Management System               │
 │                                                     │
 │ Order Import / Order Routing / Order Split         │
 │ Order Status / Backorder / Return Orders           │
 └─────────────────────────────────────────────────────┘

 ┌─────────────────────────────────────────────────────┐
 │                       WMS                           │
 │            Warehouse Management System              │
 │                                                     │
 │ Inbound / Putaway / Inventory / Picking             │
 │ Packing / Shipping / Cycle Count / Replenishment    │
 └─────────────────────────────────────────────────────┘

 ┌─────────────────────────────────────────────────────┐
 │                       TMS                           │
 │            Transportation Management System         │
 │                                                     │
 │ Carrier Selection / Label / Tracking / Dispatch     │
 └─────────────────────────────────────────────────────┘

 ┌─────────────────────────────────────────────────────┐
 │                     Billing                         │
 │                                                     │
 │ 3PL Billing / Storage Fee / Handling Fee            │
 │ Customer Invoice / Settlement                       │
 └─────────────────────────────────────────────────────┘

 ┌─────────────────────────────────────────────────────┐
 │                     Analytics                       │
 │                                                     │
 │ Warehouse KPI / Order Reports / Inventory Reports   │
 │ Customer Dashboard                                  │
 └─────────────────────────────────────────────────────┘

 ┌─────────────────────────────────────────────────────┐
 │                     Platform                        │
 │                                                     │
 │ User / RBAC / Workflow / Rules / API / Webhooks     │
 └─────────────────────────────────────────────────────┘
二、核心模块结构

整个系统分 6 大产品模块。

模块	作用
OMS	订单管理
WMS	仓库管理
TMS	运输管理
Billing	3PL收费
Analytics	数据分析
Platform	平台能力
三、OMS（订单系统）

OMS负责：

订单生命周期

核心功能：

订单导入
订单分仓
订单拆单
订单状态
退货管理

订单来源：

Rakuten
Shopify
Amazon
API
四、WMS（仓库系统）

WMS是核心。

模块：

Inbound
Putaway
Inventory
Picking
Packing
Shipping
Returns
Replenishment
Cycle Count

核心能力：

库位管理
库存管理
任务系统
波次拣货
五、TMS（运输系统）

TMS负责：

物流运输

功能：

Carrier API
运费计算
面单生成
物流跟踪

对接：

Yamato
Sagawa
JP Post
六、Billing（3PL收费）

3PL仓库必须有收费模块。

收费类型：

Storage Fee
Handling Fee
Shipping Fee
Value-added Service

例如：

入库费
出库费
仓储费
贴标费
七、Analytics（数据系统）

数据模块：

订单统计
库存统计
仓库效率
客户账单

例如：

拣货效率
仓库周转率
库存天数
八、Platform（平台能力）

平台模块提供：

RBAC
Workflow
Rules
API
Webhook

作用：

支持 SaaS
支持扩展
九、系统模块关系

系统模块关系：

Marketplace
 │
 ▼
OMS
 │
 ▼
WMS
 │
 ▼
TMS
 │
 ▼
Carrier

同时：

WMS
 │
 ▼
Billing
十、典型业务流程

订单流程：

订单导入
 ↓
OMS
 ↓
WMS
 ↓
Picking
 ↓
Packing
 ↓
TMS
 ↓
发货
十一、3PL业务流程

客户使用流程：

Client
 ↓
OMS订单
 ↓
WMS仓库操作
 ↓
TMS发货
 ↓
Billing收费
十二、ZELIX 产品定位

如果你把系统做完整：

ZELIX 不只是：

WMS

而是：

Logistics Platform

类似：

SAP Supply Chain
Manhattan Active
十三、未来扩展模块

未来可以扩展：

YMS（Yard Management）
Labor Management
Robot Control
AI Forecast
十四、ZELIX 平台定位

最终产品结构：

ZELIX Logistics Platform

OMS
WMS
TMS
Billing
Analytics
Platform

💡 一个很重要的产品策略建议

真正成功的仓储系统通常 不是只做 WMS。

而是：

OMS + WMS + TMS

因为：

订单 → 仓库 → 运输

必须是一体系统。