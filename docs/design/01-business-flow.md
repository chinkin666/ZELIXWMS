# ZELIX WMS 業務フロー詳細 / 业务流程详解

> 本ドキュメントは WMS の業務ロジックを理解するための詳細フローガイドです。
> 本文档是理解 WMS 业务逻辑的详细流程指南。

---

## 目次 / 目录

1. [全体業務フロー / 整体业务流程](#1-全体業務フロー--整体业务流程)
2. [入庫フロー詳細 / 入库流程详解](#2-入庫フロー詳細--入库流程详解)
3. [出荷フロー詳細 / 出货流程详解](#3-出荷フロー詳細--出货流程详解)
4. [在庫管理フロー / 库存管理流程](#4-在庫管理フロー--库存管理流程)
5. [返品フロー / 退货流程](#5-返品フロー--退货流程)
6. [棚卸フロー / 盘点流程](#6-棚卸フロー--盘点流程)
7. [請求フロー / 计费流程](#7-請求フロー--计费流程)
8. [B2 Cloud 連携フロー / B2 Cloud 集成流程](#8-b2-cloud-連携フロー--b2-cloud-集成流程)

---

## 1. 全体業務フロー / 整体业务流程

3PL 倉庫の核心業務は **入庫→在庫管理→出荷** のサイクルです。
3PL 仓库的核心业务是**入库→库存管理→出货**的循环。

```mermaid
flowchart TD
    subgraph 入庫 / 入库
        A[CSV / 手動入力<br>CSV / 手动输入] --> B[入庫予定作成<br>创建入库预定]
        B --> C[検品<br>检品]
        C --> D[棚入れ<br>上架]
    end

    subgraph 在庫管理 / 库存管理
        D --> E[在庫保管<br>库存保管]
        E --> F[棚卸<br>盘点]
        E --> G[在庫調整<br>库存调整]
        E --> H[ロケーション移動<br>库位移动]
        E --> I[補充<br>补货]
    end

    subgraph 出荷 / 出货
        J[出荷指示<br>出货指示] --> K[在庫引当<br>库存预留]
        K --> L[ウェーブ作成<br>创建波次]
        L --> M[ピッキング<br>拣货]
        M --> N[仕分け<br>分拣]
        N --> O[検品・梱包<br>检品打包]
        O --> P[送り状発行<br>发运单打印]
        P --> Q[出荷完了<br>出货完成]
    end

    subgraph 付帯業務 / 附加业务
        R[返品処理<br>退货处理]
        S[請求管理<br>计费管理]
        T[日次レポート<br>日报]
    end

    D --> E
    E --> J
    Q --> S
    R --> E
    F --> G
```

### 関連サービス / 相关服务

| フロー / 流程 | NestJS サービス / 服务 | DB テーブル / 数据库表 |
|---|---|---|
| 入庫 / 入库 | `InboundWorkflowService` | `inbound_orders`, `warehouse_tasks`, `inventory_ledger` |
| 出荷 / 出货 | `ShipmentService`, `WaveService` | `shipment_orders`, `waves`, `pick_tasks` |
| 在庫 / 库存 | `StockService` | `stock_quants`, `stock_moves` |
| 返品 / 退货 | `ReturnsService` | `return_orders` |
| 棚卸 / 盘点 | `CycleCountService`, `StocktakingService` | `cycle_count_plans`, `stocktaking_orders` |
| 請求 / 计费 | `BillingService`, `WorkChargeService` | `work_charges`, `billing_records`, `service_rates` |

---

## 2. 入庫フロー詳細 / 入库流程详解

### ステータス遷移 / 状态迁移

```mermaid
stateDiagram-v2
    [*] --> draft: 作成 / 创建
    draft --> confirmed: 確定 / 确认
    confirmed --> receiving: 検品開始 / 开始检品
    receiving --> received: 全ライン検品完了 / 全行检品完成
    received --> putaway: 棚入れ開始 / 开始上架
    putaway --> done: 棚入れ完了 / 上架完成
    draft --> cancelled: キャンセル / 取消
    confirmed --> cancelled: キャンセル / 取消
```

### シーケンス図 / 序列图

```mermaid
sequenceDiagram
    participant OP as オペレーター<br>操作员
    participant FE as Frontend
    participant API as NestJS API
    participant WF as InboundWorkflowService
    participant TE as TaskService
    participant RE as RuleEngineService
    participant DB as PostgreSQL
    participant EXT as EventEmitter2

    Note over OP,EXT: === Phase 1: 入庫予定作成 / 创建入库预定 ===

    OP->>FE: CSV アップロード or 手動入力<br>CSV上传或手动输入
    FE->>API: POST /api/inbound-orders
    API->>DB: InboundOrder.create (status: draft)
    DB-->>API: 入庫予定データ
    API-->>FE: 作成完了

    Note over OP,EXT: === Phase 2: 確定 / 确认 ===

    OP->>FE: 「確定」ボタン / "确认"按钮
    FE->>API: PATCH /api/inbound-orders/:id (status: confirmed)
    API->>DB: order.status = 'confirmed'

    Note over OP,EXT: === Phase 3: 検品開始 / 开始检品 ===

    OP->>FE: 「検品開始」ボタン / "开始检品"按钮
    FE->>API: POST /api/inbound-orders/:id/start-receiving
    API->>WF: InboundWorkflow.startReceiving(orderId)
    WF->>DB: order.status = 'receiving'
    loop 各ライン / 每一行
        WF->>TE: TaskEngine.createTask(type: 'receiving')
        TE->>DB: WarehouseTask.create
    end
    WF-->>API: タスク一覧

    Note over OP,EXT: === Phase 4: 検品実行 / 执行检品 ===

    loop 各ライン / 每一行
        OP->>FE: 受入数量入力（6次元チェック）<br>输入接收数量（6维检查）
        FE->>API: POST /api/inbound-orders/:id/confirm-line
        API->>WF: InboundWorkflow.confirmReceiveLine(orderId, lineNumber, qty)
        WF->>DB: InventoryLedger.create (type: 'inbound')
        WF->>DB: line.receivedQuantity = qty
    end
    WF->>DB: order.status = 'received' (全ライン完了時)
    WF->>EXT: emit(INBOUND_RECEIVED)

    Note over OP,EXT: === Phase 5: 棚入れ / 上架 ===

    OP->>FE: 「棚入れ開始」ボタン / "开始上架"按钮
    FE->>API: POST /api/inbound-orders/:id/start-putaway
    API->>WF: InboundWorkflow.startPutaway(orderId)
    loop 各ライン / 每一行
        WF->>RE: RuleEngine.suggestLocation(productId)
        RE-->>WF: 推奨ロケーション / 推荐库位
        WF->>TE: TaskEngine.createTask(type: 'putaway')
        TE->>DB: WarehouseTask.create
    end

    Note over OP,EXT: === Phase 6: 棚入れ完了 / 上架完成 ===

    OP->>FE: 棚入れ完了操作 / 上架完成操作
    FE->>API: PATCH (task complete)
    API->>DB: StockQuant 更新（最終在庫反映）
    API->>DB: order.status = 'done'
```

### 検品の 6 次元チェック / 检品的 6 维度检查

`InspectionService` で管理される 6 次元チェック:
由 `InspectionService` 管理的 6 维度检查：

| # | チェック項目 / 检查项 | フィールド | 説明 / 说明 |
|---|---|---|---|
| 1 | SKU 照合 / SKU 核对 | `skuMatch` | 予定 SKU と実物の一致確認 |
| 2 | バーコード照合 / 条码核对 | `barcodeMatch` | バーコードスキャンによる照合 |
| 3 | 数量照合 / 数量核对 | `quantityMatch` | 予定数量と実数量の一致 |
| 4 | 外観チェック / 外观检查 | `appearanceOk` | 破損・汚れの有無 |
| 5 | 付属品チェック / 附件检查 | `accessoriesOk` | 付属品の過不足 |
| 6 | 梱包状態 / 包装状态 | `packagingOk` | 梱包の適切さ |

---

## 3. 出荷フロー詳細 / 出货流程详解

### 出荷指示の入力経路 / 出货指示的输入路径

```mermaid
flowchart LR
    A[CSV インポート<br>CSV 导入] --> D[shipmentOrderService<br>createBulk]
    B[手動入力<br>手动输入] --> D
    C[顧客ポータル<br>客户门户] --> D
    D --> E[ShipmentOrder<br>PostgreSQL 保存]
    E --> F[autoProcessingEngine<br>自動処理エンジン]
```

### シーケンス図 / 序列图

```mermaid
sequenceDiagram
    participant CL as 荷主 / 货主
    participant FE as Frontend / Portal
    participant API as NestJS API
    participant SVC as ShipmentService
    participant STK as StockService
    participant OW as WaveService
    participant B2 as B2CloudService
    participant AUTO as AutoProcessingService
    participant DB as PostgreSQL

    Note over CL,DB: === Phase 1: 出荷指示登録 / 出货指示登记 ===

    CL->>FE: CSV アップロード or 手動入力
    FE->>API: POST /api/shipment-orders (or /import)
    API->>SVC: createBulk(orders)
    SVC->>SVC: generateOrderNumbers()
    SVC->>SVC: Zod バリデーション
    SVC->>SVC: ヤマト仕分けコード自動計算
    SVC->>DB: ShipmentOrder.insertMany
    SVC->>AUTO: processOrderEventBulk(created)
    AUTO-->>B2: (自動送信設定時) B2 Cloud バリデーション

    Note over CL,DB: === Phase 2: B2 Cloud 連携 / B2 Cloud 集成 ===

    FE->>API: POST /api/shipment-orders/validate (B2)
    API->>B2: validateShipments (日本語キー)
    B2-->>API: バリデーション結果
    FE->>API: POST /api/shipment-orders/export (B2)
    API->>B2: exportShipments (英語キー)
    B2-->>API: 送り状番号 / 追跡番号
    API->>DB: trackingNumber 更新

    Note over CL,DB: === Phase 3: 在庫引当 / 库存预留 ===

    API->>STK: reserveStockForOrder(orderId, products)
    STK->>DB: Product.find (SKU マッチング)
    STK->>DB: StockQuant.findOne (在庫検索)
    STK->>DB: StockQuant.reservedQuantity += qty
    STK->>DB: StockMove.create (type: 'reserve')
    STK-->>API: ReservationResult

    Note over CL,DB: === Phase 4: ウェーブ→ピッキング / 波次→拣货 ===

    FE->>API: POST /api/waves
    API->>OW: OutboundWorkflow.createWave(shipmentOrderIds)
    OW->>DB: Wave.create
    OW->>OW: allocateStock (引当確認)
    loop 各注文の各商品 / 每个订单的每个商品
        OW->>DB: WarehouseTask.create (type: 'picking')
    end

    Note over CL,DB: === Phase 5: 仕分け→梱包→出荷 / 分拣→打包→出货 ===

    FE->>API: ピッキング完了報告
    API->>DB: Task status → completed
    FE->>API: 検品・梱包完了
    API->>STK: completeStockForOrder(orderId)
    STK->>DB: StockQuant.quantity -= qty
    STK->>DB: StockQuant.reservedQuantity -= qty
    STK->>DB: StockMove.create (type: 'complete')
    API->>DB: ShipmentOrder.status = 'shipped'
```

### 出荷指示のステータス遷移 / 出货指示状态迁移

```mermaid
stateDiagram-v2
    [*] --> draft: 登録 / 登记
    draft --> confirmed: 確定 / 确认
    confirmed --> validated: B2 バリデーション通過
    validated --> exported: B2 エクスポート完了
    exported --> picking: ピッキング開始
    picking --> inspecting: 検品中
    inspecting --> packed: 梱包完了
    packed --> shipped: 出荷完了
    draft --> cancelled: キャンセル
    confirmed --> cancelled: キャンセル
```

---

## 4. 在庫管理フロー / 库存管理流程

### StockQuant — 原子的在庫管理 / 原子级库存管理

`StockQuant` は **ロケーション × 商品 × ロット** の粒度で在庫を管理するコアモデルです。
`StockQuant` 是以**库位 x 商品 x 批次**粒度管理库存的核心模型。

```
StockQuant {
  productId        // 商品 / 商品
  locationId       // ロケーション / 库位
  lotId            // ロット（オプション）/ 批次（可选）
  quantity          // 実在庫数 / 实际库存数
  reservedQuantity  // 引当済み数 / 已预留数
  availableQuantity // = quantity - reservedQuantity（仮想フィールド）
}
```

### 在庫操作一覧 / 库存操作一览

```mermaid
flowchart TD
    subgraph 入庫系 / 入库系
        A[入庫検品完了] -->|quantity += n| SQ[StockQuant]
    end

    subgraph 出庫系 / 出库系
        B[在庫引当<br>reserveStockForOrder] -->|reservedQuantity += n| SQ
        C[出荷完了<br>completeStockForOrder] -->|quantity -= n<br>reservedQuantity -= n| SQ
        D[引当解放<br>unreserveStockForOrder] -->|reservedQuantity -= n| SQ
    end

    subgraph 調整系 / 调整系
        E[在庫調整] -->|quantity ±= n| SQ
        F[ロケーション移動] -->|from.qty -= n<br>to.qty += n| SQ
        G[棚卸差異確定] -->|quantity = count| SQ
    end

    SQ --> SM[StockMove 記録<br>库存移动记录]
    SQ --> IL[InventoryLedger 記帳<br>库存台账记账]
```

### 引当の流れ（`StockService`）/ 预留流程

`reserveStockForOrder()` の処理（PostgreSQL トランザクション内で実行）:
`reserveStockForOrder()` 的处理逻辑（在 PostgreSQL 事务中执行）：

1. **VIRTUAL/CUSTOMER ロケーション確認** — 仮想出庫先ロケーションの存在チェック
   确认 VIRTUAL/CUSTOMER 虚拟出库目的地库位存在
2. **商品マスタ一括取得** — N+1 問題を回避するため JOIN / バッチ取得
   批量获取商品主数据，通过 JOIN 避免 N+1 问题
3. **inventoryEnabled チェック** — `inventory_enabled=true` の商品のみ引当対象
   仅对 `inventory_enabled=true` 的商品执行预留
4. **stock_quants 検索** — 該当ロケーションから利用可能在庫を検索（`SELECT ... FOR UPDATE`）
   从目标库位搜索可用库存（行锁定）
5. **原子的更新** — `reserved_quantity += quantity` をトランザクション内で実行
   在事务中执行 `reserved_quantity += quantity`
6. **stock_moves 作成** — 移動記録を作成（監査証跡）
   创建移动记录（审计跟踪）

---

## 5. 返品フロー / 退货流程

### ステータス遷移 / 状态迁移

```mermaid
stateDiagram-v2
    [*] --> draft: 作成 / 创建
    draft --> inspecting: 検品開始 / 开始检品
    inspecting --> completed: 確定 / 确定
    draft --> cancelled: キャンセル / 取消
    inspecting --> cancelled: キャンセル / 取消
```

### 返品処理フロー / 退货处理流程

```mermaid
sequenceDiagram
    participant OP as オペレーター
    participant API as NestJS API
    participant DB as PostgreSQL

    Note over OP,DB: === 返品作成 / 创建退货 ===

    OP->>API: POST /api/return-orders
    API->>DB: ReturnOrder.create (status: draft)
    Note right of DB: orderNumber 自動採番<br>自动编号

    Note over OP,DB: === 検品 / 检品 ===

    OP->>API: PATCH /api/return-orders/:id/inspect
    API->>DB: status = 'inspecting'
    loop 各ライン / 每一行
        OP->>API: ライン検品結果入力
        Note right of API: disposition 判定:<br>restock(再入庫)<br>dispose(廃棄)<br>repair(修理)<br>pending(保留)
        API->>DB: line.inspectedQuantity 更新
        API->>DB: line.disposition 設定
    end

    Note over OP,DB: === 確定・在庫反映 / 确定・库存反映 ===

    OP->>API: PATCH /api/return-orders/:id/complete
    API->>DB: status = 'completed'
    alt disposition = restock
        API->>DB: StockQuant.quantity += restockedQuantity
        Note right of DB: 良品在庫に戻す / 返回良品库存
    else disposition = dispose
        API->>DB: disposedQuantity 記録
        Note right of DB: 廃棄処理 / 废弃处理
    end
    API->>DB: WorkCharge.create (返品検品チャージ)
```

### ReturnOrder モデル / 退货模型

| フィールド | 型 | 説明 / 说明 |
|---|---|---|
| `status` | `draft` \| `inspecting` \| `completed` \| `cancelled` | ステータス |
| `returnReason` | `customer_request` \| `defective` \| `wrong_item` \| `damaged` \| `other` | 返品理由 / 退货原因 |
| `lines[].disposition` | `restock` \| `dispose` \| `repair` \| `pending` | 処分方法 / 处置方式 |
| `rmaNumber` | string | RMA 番号（返品承認番号）/ RMA 编号 |

---

## 6. 棚卸フロー / 盘点流程

### 循環棚卸（月次自動生成）/ 循环盘点（月度自动生成）

`CycleCountService` が月次で自動生成（BullMQ スケジュールジョブ）:
`CycleCountService` 每月自动生成（BullMQ 定时任务）：

- **毎月 20% の SKU** をランダム抽選 → 5 ヶ月で 100% カバー
  每月随机抽选 20% 的 SKU → 5 个月覆盖 100%
- **差異率 > 0.5%** の場合は即時アラート
  差异率 > 0.5% 时立即报警
- **年 1 回の全数棚卸**は決算期に実施
  年终全面盘点在结算期实施

### 棚卸フロー / 盘点流程

```mermaid
sequenceDiagram
    participant SYS as システム / 系统
    participant OP as オペレーター
    participant API as NestJS API
    participant DB as PostgreSQL

    Note over SYS,DB: === 計画生成 / 计划生成 ===

    SYS->>API: generateMonthlyCycleCount(tenantId, period)
    API->>DB: 全 SKU 取得
    API->>API: 20% ランダム抽選 / 随机抽选20%
    API->>DB: CycleCountPlan.create
    Note right of DB: planNumber: CC-YYYY-MM-XXXX

    Note over SYS,DB: === カウント実施 / 执行盘点 ===

    OP->>API: GET /api/cycle-counts/:id (棚卸リスト取得)
    loop 各 SKU × ロケーション / 每个 SKU x 库位
        OP->>API: POST /api/cycle-counts/:id/count
        Note right of OP: 実数カウント入力<br>输入实际盘点数
        API->>DB: countResult 記録
    end

    Note over SYS,DB: === 差異分析 / 差异分析 ===

    API->>DB: StockQuant.quantity (システム在庫) 取得
    API->>API: 差異 = カウント - システム在庫<br>差异 = 盘点数 - 系统库存
    alt 差異率 > 0.5%
        API->>DB: アラート生成 / 生成报警
    end

    Note over SYS,DB: === 差異確定・在庫調整 / 差异确定・库存调整 ===

    OP->>API: POST /api/cycle-counts/:id/adjust
    API->>DB: StockQuant.quantity = カウント数
    API->>DB: StockMove.create (type: 'adjustment')
    API->>DB: InventoryLedger.create (type: 'cycle-count')
    API->>DB: CycleCountPlan.status = 'completed'
```

---

## 7. 請求フロー / 计费流程

### 料金体系 / 费率体系

`WorkChargeService` による自動チャージ生成（ドメインイベント経由）:
通过 `WorkChargeService` 自动生成费用（经由领域事件）：

```mermaid
flowchart TD
    subgraph 料金マスタ / 费率主数据
        SR[ServiceRate<br>料金マスタ]
        SR --> |顧客専用 / 客户专属| CR[顧客別料金]
        SR --> |デフォルト / 默认| DR[汎用料金]
    end

    subgraph 自動チャージ / 自动费用
        EV[イベント発生<br>事件触发] --> CS[chargeService<br>createAutoCharge]
        CS --> |料金検索<br>findRate| SR
        CS --> WC[WorkCharge 作成<br>创建作业费用]
    end

    subgraph 月次請求 / 月度账单
        WC --> AGG[月次集計<br>月度汇总]
        STQ[StockQuant] --> |保管料計算<br>仓储费计算| AGG
        AGG --> BR[BillingRecord<br>账单记录]
        BR --> INV[Invoice<br>请求书/发票]
    end
```

### チャージタイプ / 费用类型

| タイプ | トリガー | 説明 / 说明 |
|---|---|---|
| 入庫チャージ | 入庫完了イベント | 1件あたりの入庫作業料 / 每件入库作业费 |
| 出荷チャージ | 出荷完了イベント | 1件あたりの出荷作業料 / 每件出货作业费 |
| 返品チャージ | 返品検品完了 | 返品検品作業料 / 退货检品作业费 |
| 保管料 | 月次バッチ | StockQuant ベースの在庫保管料 / 基于库存量的仓储费 |
| ラベリング | ラベリング完了 | ラベル貼付作業料 / 贴标作业费 |

### 料金検索ロジック / 费率查找逻辑

`findRate()` は 2 段階フォールバック:
`findRate()` 采用 2 级回退：

1. **顧客専用料金** — `service_rates` テーブルから `client_id + charge_type` で検索
   客户专属费率 — 从 service_rates 表按客户 + 费用类型查找
2. **デフォルト料金** — `client_id IS NULL` のレコードにフォールバック
   默认费率 — 回退到无客户指定的通用费率

---

## 8. B2 Cloud 連携フロー / B2 Cloud 集成流程

> **重要 / 重要**: このフローの実装コード（`yamatoB2Service.ts`）は **変更禁止** です。
> 此流程的实现代码（`yamatoB2Service.ts`）**禁止修改**。

### 全体フロー / 整体流程

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant API as NestJS API
    participant B2S as YamatoB2Service
    participant CACHE as キャッシュ層<br>缓存层
    participant B2 as B2 Cloud API

    Note over FE,B2: === Step 1: ログイン（3層キャッシュ）/ 登录（3级缓存）===

    FE->>API: B2 Cloud 操作要求
    API->>B2S: login(config)
    B2S->>B2S: ① インメモリキャッシュ確認<br>① 检查内存缓存
    alt キャッシュヒット / 缓存命中
        B2S-->>API: session_token
    else メモリミス / 内存未命中
        B2S->>CACHE: ② DB CarrierSessionCache 確認<br>② 检查 DB 会话缓存
        alt DB ヒット / DB 命中
            CACHE-->>B2S: session_token
            B2S->>B2S: インメモリに保存 / 存入内存
        else DB ミス / DB 未命中
            B2S->>B2: ③ B2 Cloud Login API 呼び出し<br>③ 调用 B2 Cloud Login API
            B2-->>B2S: session_token + expires_at
            B2S->>CACHE: DB に保存 / 存入 DB
            B2S->>B2S: インメモリに保存 / 存入内存
        end
    end

    Note over FE,B2: === Step 2: バリデーション / 验证 ===

    FE->>API: POST /api/shipment-orders/validate
    API->>B2S: validateShipments(config, shipments)
    B2S->>B2S: 日本語キーにマッピング<br>映射为日文键名
    B2S->>B2: POST /api/v1/shipments/validate
    Note right of B2: ShipmentInput schema<br>日本語キー使用
    B2-->>B2S: バリデーション結果
    alt 500 + 'entry' エラー
        B2S->>B2S: セッション切れ検出<br>检测到会话过期
        B2S->>B2: 自動リログイン / 自动重新登录
        B2S->>B2: リトライ / 重试
    end
    B2S-->>API: 結果
    API-->>FE: バリデーション結果表示

    Note over FE,B2: === Step 3: エクスポート（送り状発行）/ 导出（发运单发行）===

    FE->>API: POST /api/shipment-orders/export
    API->>B2S: exportShipments(config, shipments)
    B2S->>B2S: 英語キーにマッピング<br>映射为英文键名
    B2S->>B2: POST /api/v1/shipments
    Note right of B2: 英語キー使用
    B2-->>B2S: tracking_number, results
    B2S-->>API: YamatoExportResponse
    API->>API: DB 更新 (trackingNumber)

    Note over FE,B2: === Step 4: PDF 印刷 / PDF 打印 ===

    FE->>API: POST /api/shipment-orders/print
    API->>B2S: print(tracking_numbers)
    B2S->>B2: Print API
    B2-->>B2S: PDF データ + 正式送り状番号
    B2S-->>API: YamatoPrintResultByType
    API-->>FE: PDF ダウンロード
```

### 重要な技術的ポイント / 重要技术要点

| ポイント / 要点 | 詳細 / 详情 |
|---|---|
| **3 層キャッシュ** | インメモリ → DB(`carrier_session_caches` テーブル) → B2 Cloud API |
| **セッション切れリトライ** | `authenticatedFetch()` が HTTP 500 + レスポンスに 'entry' を検出したら自動リトライ |
| **validate vs validate-full** | `validate`（ShipmentInput, 日本語キー）を使用。`validate-full` は幅チェッカーにバグがあるため使用禁止 |
| **validate = 日本語キー** | `validateShipments()` は日本語キーマッピングで送信 |
| **export = 英語キー** | `exportShipments()` は英語キーマッピングで送信 |
| **addressMapping** | consignee/shipper の住所フィールドを B2 API 形式にマッピング |

### B2 Cloud API エンドポイント / API 端点

| 用途 / 用途 | メソッド | エンドポイント | キー形式 |
|---|---|---|---|
| ログイン / 登录 | POST | Login API | — |
| バリデーション / 验证 | POST | `/api/v1/shipments/validate` | 日本語 |
| エクスポート / 导出 | POST | `/api/v1/shipments` | 英語 |
| 印刷 / 打印 | POST | Print API | — |
| ~~バリデーション(full)~~ | ~~POST~~ | ~~`/api/v1/shipments/validate-full`~~ | ~~使用禁止~~ |

---

## 補足: イベント駆動アーキテクチャ / 补充：事件驱动架构

ZELIX WMS は **EventEmitter2** (`@nestjs/event-emitter`) を通じたドメインイベント駆動処理を採用しています。
イベントは BullMQ キューを経由して非同期処理されます。
ZELIX WMS 采用 **EventEmitter2** 的领域事件驱动处理。事件通过 BullMQ 队列异步处理。

### 主要イベント / 主要事件

| イベント | トリガー / 触发器 | 処理例 / 处理示例 |
|---|---|---|
| `INBOUND_RECEIVED` | 入庫検品完了 | 通知送信・チャージ生成 |
| `ORDER_CREATED` | 出荷指示作成 | B2 自動送信・Webhook |
| `ORDER_SHIPPED` | 出荷完了 | 通知・請求 |
| `STOCK_ADJUSTED` | 在庫調整 | 監査ログ記録（BullMQ → `operation_logs`） |

### 自動処理エンジン / 自动处理引擎

`AutoProcessingService` は `auto_processing_rules` テーブルに基づいて、
ドメインイベント発生時に定義されたアクションを自動実行します。

`AutoProcessingService` 基于 `auto_processing_rules` 表，
在领域事件发生时自动执行已定义的动作。

```
ドメインイベント発生 → EventEmitter2
    → AutoProcessingService.handleEvent()
    → ルール検索（tenant_id + event_type）
    → 条件マッチ → BullMQ キューにジョブ投入
        - B2 Cloud 自動送信
        - Webhook 送信（webhook キュー）
        - 通知送信（notification キュー）
        - ステータス自動遷移
```

---

> **最終更新 / 最后更新**: 2026-03-21
> **対象コード / 对象代码**: `backend-nest/src/modules/` 配下の各 NestJS サービス
> **関連ドキュメント / 相关文档**: `docs/design/00-system-overview.md`, `docs/migration/03-backend-architecture.md`
