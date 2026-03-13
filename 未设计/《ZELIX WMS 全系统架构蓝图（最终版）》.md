《ZELIX WMS 全系统架构蓝图（最终版）》。
这张图把我们前面所有设计 统一到一个完整系统架构，适合：

3PL仓库

电商仓

SaaS WMS

整体复杂度接近企业级系统，例如
SAP Extended Warehouse Management 和
Manhattan WMS 的基础结构。

一、ZELIX WMS 全系统架构总图
                           ZELIX WMS

 ┌───────────────────────────────────────────────┐
 │                   Clients                     │
 │ Web Admin / PDA / Mobile / API / Marketplace │
 └───────────────────────────────────────────────┘
                         │
                         ▼
                ┌─────────────────┐
                │   API Gateway   │
                │ Auth / Routing  │
                └─────────────────┘
                         │
                         ▼

 ┌──────────────────────────────────────────────────────────┐
 │                    Application Services                   │
 │                                                          │
 │ Order Service        Inventory Service        Warehouse Service │
 │ Shipping Service     Picking Service          Task Service      │
 │ Rule Service         Workflow Service         Notification      │
 │ Billing Service      Analytics Service                         │
 └──────────────────────────────────────────────────────────┘
                         │
                         ▼

 ┌──────────────────────────────────────────────────────────┐
 │                     Core Engines                          │
 │                                                          │
 │ Workflow Engine      Task Engine      Rule Engine        │
 │ Inventory Engine     Location Engine                     │
 └──────────────────────────────────────────────────────────┘
                         │
                         ▼

 ┌──────────────────────────────────────────────────────────┐
 │                     Event & Async Layer                  │
 │                                                          │
 │ Event Bus (Kafka / MQ)                                  │
 │ Task Queue                                              │
 │ Worker Cluster                                          │
 │                                                         │
 │ Shipment Worker  Inventory Worker  Picking Worker      │
 │ Notification Worker                                     │
 └──────────────────────────────────────────────────────────┘
                         │
                         ▼

 ┌──────────────────────────────────────────────────────────┐
 │                       Data Layer                         │
 │                                                          │
 │ MongoDB Cluster                                         │
 │ Redis Cluster                                           │
 │ Object Storage (Labels / Images / Docs)                 │
 └──────────────────────────────────────────────────────────┘
                         │
                         ▼

 ┌──────────────────────────────────────────────────────────┐
 │                    Integration Layer                     │
 │                                                          │
 │ Marketplace APIs                                        │
 │ Rakuten / Shopify / Amazon                              │
 │                                                          │
 │ Carrier APIs                                            │
 │ Yamato / Sagawa / JP Post                               │
 │                                                          │
 │ ERP / Accounting / BI                                   │
 └──────────────────────────────────────────────────────────┘
二、系统五大核心引擎

这是 ZELIX WMS 的核心能力层。

Workflow Engine
Task Engine
Inventory Engine
Location Engine
Rule Engine
1 Workflow Engine

负责业务流程：

订单 → 出荷 → 拣货 → 打包 → 发货
2 Task Engine

所有仓库操作任务化：

Putaway Task
Pick Task
Pack Task
Replenishment Task
Cycle Count Task
3 Inventory Engine

库存核心逻辑：

库存数量
库存锁
库存流水
库存一致性
4 Location Engine

仓库空间结构：

Warehouse
 └ Zone
    └ Aisle
       └ Rack
          └ Level
             └ Bin
5 Rule Engine

自动决策：

上架规则
波次规则
拣货规则
补货规则
三、核心业务模块

系统功能模块：

Master Data
Inbound
Inventory
Picking
Packing
Shipping
Returns
Replenishment
Billing
Analytics
四、核心数据库模块

数据库主要模块：

Master Data
Warehouse Structure
Inventory
Inbound
Orders
Shipping
Picking
Tasks
Rules
System

核心表：

clients
products
warehouses
locations
inventory
inventory_ledger
orders
shipments
tasks
waves
rules
五、事件驱动架构

系统内部通过事件通信：

order.created
inventory.reserved
shipment.created
wave.created
pick_task.created
shipment.shipped
inventory.updated

事件流：

Order Service
 ↓
Event Bus
 ↓
Inventory Service
 ↓
Picking Service
 ↓
Shipping Service
六、高并发处理架构

高并发系统采用：

API → Event → Queue → Worker

示例：

订单创建
 ↓
Event Bus
 ↓
Create Shipment Worker
 ↓
Create Wave Worker
 ↓
Create Pick Tasks

API响应时间：

10ms

任务后台处理。

七、库存一致性体系

库存系统核心设计：

库存锁
库存流水
原子更新

库存结构：

available
reserved

库存公式：

库存 = SUM(inbound) - SUM(outbound)
八、SaaS 多租户结构

支持 3PL SaaS：

tenant
 └ client
    └ warehouse
       └ inventory

关键字段：

tenantId
clientId
warehouseId
九、基础设施层

推荐部署：

Docker
Kubernetes

监控：

Prometheus
Grafana
ELK

日志：

API
Worker
Database
十、ZELIX WMS 技术栈

推荐技术：

Frontend
Vue3 + TypeScript

Backend
Node.js (NestJS)

Database
MongoDB

Cache
Redis

Queue
Kafka / RabbitMQ

Infra
Docker + Kubernetes
十一、系统能力规模

该架构可以支持：

指标	规模
订单/天	100k+
库存记录	10M+
库存流水	100M+
仓库数量	100+
十二、ZELIX WMS 系统核心原则

一个成熟 WMS 必须遵守：

库存 = 库存流水计算
任务驱动仓库操作
事件驱动系统架构

💡 给你一个非常关键的架构建议

真正稳定的 WMS 系统核心其实只有 三个中心对象：

Inventory
Task
Location

如果这三个设计稳定：

系统可以扩展10年以上