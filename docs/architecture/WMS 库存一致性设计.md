> **状态: 已实现** — StockQuant(available/reserved) + InventoryLedger + 原子更新($inc) + rebuildInventory() + releaseExpiredReservations() 已在系统中运行。无需额外开发。
> **ステータス: 実装済** — StockQuant + InventoryLedger + アトミック更新 + 在庫再構築 + 期限切れ予約解放が稼働中。追加開発不要。

《ZELIX WMS 库存一致性设计（Consistency Model）》。
这个设计解决的是 仓库系统在高并发情况下如何保证库存正确。

如果没有一致性设计，系统会出现：

库存负数

超卖

拣货库存不一致

很多大型仓库系统（如 SAP Extended Warehouse Management 或 Manhattan WMS）都会专门设计库存一致性策略。

一、库存一致性问题

假设库存：

SKU123 = 10

同时两个订单进入：

订单A 需要 8
订单B 需要 5

如果系统没有控制：

订单A 扣库存
订单B 扣库存

结果：

库存 = -3

这就是：

库存不一致
二、库存一致性总体架构
Order
 │
 ▼
Inventory Check
 │
 ▼
Inventory Reservation
 │
 ▼
Shipment
 │
 ▼
Inventory Ledger

核心原则：

库存变化必须通过库存流水
三、三种一致性模型

系统一般有三种一致性策略。

类型	说明
Strong Consistency	强一致性
Eventual Consistency	最终一致性
Optimistic Lock	乐观锁
四、强一致性（Strong Consistency）

强一致性：

一次事务完成

流程：

检查库存
 ↓
锁库存
 ↓
创建订单

数据库事务：

Transaction

优点：

库存绝对正确

缺点：

性能较低
五、最终一致性（Eventual Consistency）

大规模系统通常使用：

最终一致性

流程：

Order Created
 ↓
Event Bus
 ↓
Inventory Reservation
 ↓
Shipment Created

系统可能短时间不一致，但最终会：

一致
六、乐观锁（Optimistic Lock）

库存更新时检查版本号。

库存表：

inventory

字段：

version

更新：

update inventory
where version = x

如果：

version changed

更新失败，重新尝试。

七、库存流水模型

库存必须通过流水计算。

inventory_ledger

示例：

+100 inbound
-2 outbound

库存：

98

库存公式：

库存 = SUM(inbound) - SUM(outbound)
八、库存锁机制

库存锁防止并发冲突。

库存结构：

available
reserved

示例：

available = 10
reserved = 0

订单锁定：

available = 5
reserved = 5
九、库存一致性流程

完整流程：

订单创建
 ↓
库存检查
 ↓
库存锁定
 ↓
生成出荷
 ↓
拣货
 ↓
发货
 ↓
库存扣减
十、库存冲突解决

如果库存不足：

reservation failed

系统：

Backorder

或：

Cancel Order
十一、事件驱动架构

库存更新通过事件。

order.created
inventory.reserved
shipment.created
shipment.shipped

事件流：

Order Service
 ↓
Event Bus
 ↓
Inventory Service
十二、库存一致性层级

系统一致性分为：

层级	说明
API 层	订单入口
Service 层	业务逻辑
DB 层	库存数据
十三、数据库一致性设计

关键约束：

inventory.available >= 0

数据库更新：

update inventory
set available = available - 2
where available >= 2
十四、库存恢复机制

如果系统异常：

inventory rebuild

通过：

inventory_ledger

重新计算库存。

十五、库存一致性架构总结
Order
 │
 ▼
Inventory Reservation
 │
 ▼
Shipment
 │
 ▼
Inventory Ledger
 │
 ▼
Inventory Snapshot
十六、ZELIX WMS 一致性核心原则

系统必须遵守三个原则：

库存锁
库存流水
原子更新
十七、高并发库存设计

高并发系统通常使用：

Redis + DB

流程：

Redis Lock
 ↓
DB Update
 ↓
Ledger Record
十八、最终一致性架构
Client
 │
API
 │
Order Service
 │
Event Bus
 │
Inventory Service
 │
Database

💡 最后给你一个非常关键的经验

真正成熟的 WMS 会设计 两个库存概念：

Logical Inventory
Physical Inventory
类型	说明
Logical	系统库存
Physical	仓库实际库存

盘点系统负责：

同步两者