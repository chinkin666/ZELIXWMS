# 11 商品管理与库存管理设计 / 商品管理・在庫管理設計

> 3PL 场景下的商品归属、多平台编码、通过型 vs 保管型库存差异
> 3PL における商品帰属、マルチプラットフォームコード、通過型 vs 保管型の在庫差異

## 1. 商品管理 / 商品管理

### 1.1 核心原则 / コア原則

```
现有问题:
  Product 是全局的，所有客户共用，SKU 可能冲突

3PL 正确做法:
  商品归属到 Shop（店铺）级别
  张三的 SKU "ABC-001" ≠ 李四的 SKU "ABC-001"
  它们是完全不同的两个商品
```

### 1.2 商品模型改造 / 商品モデル改修

```diff
Product {
  _id: ObjectId
  tenantId: string

+ clientId: ObjectId              // ★ 归属顶层客户
+ subClientId: ObjectId           // 归属子客户（可选）
+ shopId: ObjectId                // ★ 归属店铺

  // 客户侧信息（客户在门户维护）/ 顧客側情報（顧客がポータルで管理）
  sku: string                     // 客户自己的 SKU
  name: string                    // 商品名称
  name2: string                   // 商品名称（备用语言）
  description: string
  imageUrl: string
  weight: number                  // 单件重量 g
  length: number                  // cm
  width: number                   // cm
  height: number                  // cm

  // 多平台编码 / マルチプラットフォームコード
+ platformCodes: {
+   fnsku: string                 // Amazon FNSKU（FBA 用）
+   asin: string                  // Amazon ASIN
+   amazonSku: string             // Amazon Seller SKU
+   rakutenSku: string            // 楽天 SKU（RSL 用）
+   rakutenItemId: string         // 楽天商品管理番号
+   yahooSku: string              // Yahoo! SKU
+   janCode: string               // JAN コード（共通）
+   eanCode: string               // EAN コード
+   customCode1: string           // 客户自定义编码 1
+   customCode2: string           // 客户自定义编码 2
+ }

  // 仓库侧信息（仓库在 frontend 维护）/ 倉庫側情報（倉庫が管理端で管理）
+ warehouseNotes: {
+   preferredLocation: string     // 库位偏好 / ロケーション推奨
+   handlingNotes: string         // 特殊处理备注 / 特殊取扱注意
+   isFragile: boolean            // 易碎 / 壊れ物
+   isLiquid: boolean             // 液体 / 液体
+   requiresOppBag: boolean       // 需要 OPP 袋 / OPP 袋要
+   requiresSuffocationLabel: boolean  // 需要防窒息标 / 窒息防止ラベル要
+   storageType: enum['ambient', 'chilled', 'frozen']  // 保管温度带
+ }

  // 库存设置（保管型用）/ 在庫設定（保管型用）
  inventoryEnabled: boolean       // 是否管理库存
  safetyStock: number             // 安全库存
  fbaEnabled: boolean             // FBA 商品标记

  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

唯一约束变更:
- 旧: { tenantId: 1, sku: 1 } unique
+ 新: { tenantId: 1, shopId: 1, sku: 1 } unique
  // 同一租户 + 同一店铺下 SKU 唯一
  // 不同店铺可以有相同 SKU
```

### 1.3 数据维护职责 / データ管理責任

```
谁维护什么:

客户（门户）:
  ✓ SKU、商品名、FNSKU、ASIN、JAN 等编码
  ✓ 商品图片
  ✓ 重量/尺寸（客户提供，仓库可修正）
  ✗ 不能改仓库侧信息

仓库（仓库端）:
  ✓ warehouseNotes（库位偏好、特殊处理）
  ✓ 可修正重量/尺寸（实测值覆盖客户值）
  ✓ inventoryEnabled、safetyStock
  ✗ 不能改客户的 SKU/FNSKU

平台（平台端）:
  ✓ 全部字段（紧急情况下代客户/仓库修改）
```

### 1.4 商品搜索与匹配 / 商品検索・マッチング

```
入库预定时客户选择商品:
  1. 先选店铺 → 商品范围自动限定为该店铺
  2. 搜索: SKU / FNSKU / 商品名 / JAN 码
  3. 没找到 → 当场新建（快速录入 SKU + FNSKU + 名称）

仓库受付时扫码匹配:
  扫条码 → 系统按以下顺序匹配:
  1. FNSKU（最常见，FBA 商品贴了 FNSKU 标）
  2. JAN / EAN 码
  3. 客户 SKU
  4. 自定义编码
  匹配范围: 该入库预定关联店铺的商品

Excel 导入匹配:
  客户上传的 Excel 里有 SKU 列
  系统按 shopId + sku 精确匹配
  未匹配到 → 标红，让客户确认是新商品还是拼写错误
```

## 2. 库存管理 / 在庫管理

### 2.1 通过型 vs 保管型 / 通過型 vs 保管型

```
              通过型（FBA/RSL/B2B）         保管型（本土 3PL）
─────────────────────────────────────────────────────────────
货物生命周期   到货 → 作业 → 出货（1-3天）   到货 → 上架 → 保管 → 出库
是否占库位     不占（暂存区）               占（正式库位）
StockQuant     ✗ 不写入                    ✓ 写入
盘点           ✗ 不需要                    ✓ 需要循环盘点
库龄           ✗ 不适用                    ✓ 60/90/180 天预警
安全库存       ✗ 不适用                    ✓ 低库存预警
客户看到什么   入库预定进度                 库存数量 + 库位
保管费         ✗ 不收（或只收暂存超时费）    ✓ 按坪/天收
```

### 2.2 通过型：暂存区管理 / 通過型：一時保管エリア管理

通过型的货不进 StockQuant，用入库预定单状态管理：

通過型の貨物は StockQuant に入れず、入庫予約ステータスで管理：

```
暂存区数据来源:
  SELECT * FROM InboundOrder
  WHERE flowType = 'passthrough'
  AND status IN ('arrived', 'processing', 'awaiting_label', 'ready_to_ship')

暂存区看板:
┌─────────────────────────────────────────────┐
│ 暂存区概况                                   │
│                                              │
│ 当前暂存: 23 单, 187 箱                      │
│                                              │
│ 按停留时间:                                   │
│   < 24h:  15 单 ██████████████ (65%)         │
│   24-48h:  5 单 █████ (22%)                  │
│   48-72h:  2 单 ██ (9%)                      │
│   > 72h:   1 单 █ (4%) ⚠                    │
│                                              │
│ 按客户:                                       │
│   客户A:  10 单, 82 箱                        │
│   客户B:   8 单, 65 箱                        │
│   客户C:   5 单, 40 箱                        │
│                                              │
│ ⚠ 超 72h 暂存:                               │
│   IN-003 客户A 3箱 — 原因: FBA标未上传        │
│                                              │
└─────────────────────────────────────────────┘

暂存超时预警:
  > 48h: 通知仓库主管
  > 72h: 通知客户 + 仓库主管
  > 7天: 开始收暂存超时费（按天计费）
```

### 2.3 保管型：正式库存 / 保管型：正式在庫

保管型使用现有的 StockQuant 体系，不需要大改。只需要加上客户关联：

保管型は既存の StockQuant を使用、大幅な改修不要。顧客関連の追加のみ：

```diff
StockQuant 扩展:
+ clientId: ObjectId              // 库存归属客户
+ subClientId: ObjectId           // 归属子客户（可选）
+ shopId: ObjectId                // 归属店铺

// 索引追加
+ { tenantId: 1, clientId: 1, productId: 1 }
+ { tenantId: 1, shopId: 1, productId: 1 }
```

```
保管型库存查询层级:

仓库端看到:
  全部客户的库存（按客户/库位/商品筛选）

平台端看到:
  全仓库全客户的库存汇总

客户门户看到:
  只看到自己的库存
  - 顶层客户: 所有子客户/店铺的库存汇总 + 明细
  - 子客户: 只看自己店铺的库存
```

### 2.4 混合型客户 / 混合型顧客

一个客户可能同时有通过型和保管型业务：

一つの顧客が通過型と保管型の両方を持つ場合：

```
客户 A:
  店铺 1 (Amazon) → FBA 通过型：不占库存
  店铺 2 (自社EC) → 保管型：有库存，按单出库

客户门户显示:
┌──────────────────────────────────┐
│ 店铺 1: Amazon.co.jp             │
│ [入库预定] — 查看通过型预定进度    │
│                                   │
│ 店铺 2: 自社EC                    │
│ [库存查询] — 查看保管型库存        │
│ [出库申请] — 保管型按单出库        │
└──────────────────────────────────┘
```

### 2.5 保管型出库（补充设计）/ 保管型出庫（補足設計）

通过型的出货已在 07 文档设计。保管型出库是另一个流程：

```
保管型出库流程:
  客户在门户提交出库申请（收件人 + 商品 + 数量）
    ↓
  系统检查库存是否足够
    ↓
  仓库端生成拣货任务
    ↓
  拣货 → 检品 → 包装 → 出货
    ↓
  库存减少（StockQuant - quantity）
    ↓
  录入追踪号
    ↓
  客户查看追踪

这个流程现有系统已基本具备（ShipmentOrder + OutboundWorkflow）
只需要加上客户门户的出库申请入口
```

## 3. 商品与库存的数据隔离 / 商品・在庫のデータ分離

```
数据隔离层级:

tenant (租户)
  └─ client (客户)
       └─ subClient (子客户)
            └─ shop (店铺)
                 └─ product (商品)
                      └─ stockQuant (库存，仅保管型)

查询过滤规则:
  平台端:  tenantId
  仓库端:  tenantId + warehouseId（+ 可选 clientId 筛选）
  客户端:  tenantId + clientId（+ 可选 subClientId/shopId）

不能跨客户看到商品:
  客户 A 看不到客户 B 的商品
  子客户 X 看不到子客户 Y 的商品
  仓库端能看到所有客户的商品（用于受付匹配）
```

## 4. 商品标签打印 / 商品ラベル印刷

```
客户门户可打印:
  - FNSKU 标签（热敏 30x50mm）
  - 商品条码标签（JAN/EAN）
  - 自定义商品标签（使用平台端设计的模板）

打印场景:
  1. 客户自己打印贴好再发货到仓库（客户自贴）
  2. 客户创建入库预定时勾选"贴 FNSKU"（仓库贴）
  3. 仓库端执行贴标任务时打印（仓库打印）

打印数据来源:
  Product.platformCodes.fnsku → 条码内容
  Product.sku → 显示文字
  Product.name → 显示文字（可选）
```

## 5. 对开发计划的影响 / 開発計画への影響

```
Phase 0 新增/调整:
  0.1 客户模型改造 — 同时改造 Product 模型（加 shopId + platformCodes）
  这个必须在 Phase 1 之前完成，否则门户的商品管理无法开发

数据迁移:
  现有 Product 数据需要:
  - 补充 clientId（可从关联订单推断或手动指定）
  - 补充 shopId（需要先创建 Shop 记录）
  - 将 fnsku/asin 迁移到 platformCodes 下
  - SKU 唯一约束从全局改为 shopId + sku

  迁移脚本在 Phase 0 完成
```

## 6. 参考文档 / 参考文書

- [客户体系](./08-client-model.md)
- [通过型流程](./07-passthrough-flow.md)
- [客户门户页面](./09-portal-pages.md)
- [三端架构](./10-platform-rbac.md)
