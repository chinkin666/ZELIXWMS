# ZELIX WMS システム全体概要 / 系统整体概述

> 本ドキュメントは新規参画開発者向けのシステム概要です。
> 本文档面向新加入的开发人员，提供系统全局视图。

---

## 目次 / 目录

1. [プロジェクト概要 / 项目概要](#1-プロジェクト概要--项目概要)
2. [システム構成図 / 系统架构图](#2-システム構成図--系统架构图)
3. [技術スタック / 技术栈](#3-技術スタック--技术栈)
4. [モノレポ構成 / Monorepo 结构](#4-モノレポ構成--monorepo-结构)
5. [主要モジュール一覧 / 主要模块一览](#5-主要モジュール一覧--主要模块一览)
6. [データフロー / 数据流](#6-データフロー--数据流)
7. [外部システム連携 / 外部系统集成](#7-外部システム連携--外部系统集成)
8. [開発環境セットアップ / 开发环境搭建](#8-開発環境セットアップ--开发环境搭建)
9. [コーディング規約 / 编码规范](#9-コーディング規約--编码规范)
10. [変更禁止ルール / 禁止变更规则](#10-変更禁止ルール--禁止变更规则)

---

## 1. プロジェクト概要 / 项目概要

### ZELIX WMS とは / 什么是 ZELIX WMS

ZELIX WMS は、**日本の 3PL（サードパーティ・ロジスティクス）事業者**向けに設計された
倉庫管理システム（Warehouse Management System）です。

ZELIX WMS 是一个专为**日本 3PL（第三方物流）企業**设计的仓库管理系统。

### 対象ユーザー / 目标用户

| ロール / 角色 | 利用画面 / 使用界面 | 説明 / 说明 |
|---|---|---|
| 倉庫オペレーター / 仓库操作员 | Frontend (:4001) | 入庫・出荷・在庫管理・ピッキング・検品等の日常業務 |
| 顧客（荷主）/ 货主客户 | Portal (:4002) | 出荷指示投入・在庫照会・出荷状況トラッキング |
| プラットフォーム管理者 / 平台管理员 | Admin (:4003) | テナント管理・マスタ設定・システム設定 |

### 日本 3PL ビジネスコンテキスト / 日本 3PL 业务背景

- **マルチテナント構造**: 1つの倉庫に複数荷主の在庫を保管
  多租户架构：一个仓库存储多个货主的库存
- **配送業者連携**: ヤマト運輸（B2 Cloud）、佐川急便（e飛伝III）等の API 連携
  物流商集成：与大和运输（B2 Cloud）、佐川急便等 API 集成
- **日本特有の帳票**: 送り状（伝票）、納品書、ピッキングリスト等の日本語帳票
  日本特有单据：送货单、交货单、拣货单等日文单据
- **LOGIFAST 109 項目**: 業界標準の 109 機能項目を 100% 実装
  LOGIFAST 109 项：已 100% 实现行业标准的 109 个功能项

### 規模 / 规模

- **テスト数**: 1807（Backend 1454 + Frontend 353）
- **モデル数**: 75+
- **API ルート**: 70+ ファイル
- **サービス**: 30+ サービスクラス

---

## 2. システム構成図 / 系统架构图

```
                          ┌─────────────────────────────────┐
                          │          ブラウザ / Browser       │
                          └──────┬──────┬──────┬─────────────┘
                                 │      │      │
                    ┌────────────┘      │      └────────────┐
                    │                   │                    │
                    ▼                   ▼                    ▼
        ┌───────────────────┐ ┌────────────────┐ ┌──────────────────┐
        │  Frontend (Vue 3) │ │ Portal (Vue 3) │ │  Admin (Vue 3)   │
        │   :4001 (dev)     │ │  :4002 (dev)   │ │   :4003 (dev)    │
        │   :3000 (prod)    │ │  :3002 (prod)  │ │   :3001 (prod)   │
        │  倉庫オペレーター  │ │  顧客ポータル   │ │  管理ダッシュボード│
        └────────┬──────────┘ └───────┬────────┘ └────────┬─────────┘
                 │                    │                    │
                 └────────────┬───────┘                    │
                              │   REST API / GraphQL       │
                              ▼                            ▼
                 ┌────────────────────────────────────────────┐
                 │          Backend (Express + TypeScript)     │
                 │                   :4000                     │
                 │                                            │
                 │  ┌──────────┐ ┌──────────┐ ┌───────────┐  │
                 │  │   API    │ │ Services │ │  Workers  │  │
                 │  │ (Routes) │ │ (Logic)  │ │ (BullMQ)  │  │
                 │  └──────────┘ └──────────┘ └───────────┘  │
                 │                                            │
                 │  ┌──────────┐ ┌──────────┐ ┌───────────┐  │
                 │  │  Models  │ │Extension │ │ Webhooks  │  │
                 │  │(Mongoose)│ │ (Plugin) │ │           │  │
                 │  └──────────┘ └──────────┘ └───────────┘  │
                 └────────┬──────────────┬────────────────────┘
                          │              │
                ┌─────────┘              └─────────┐
                ▼                                  ▼
   ┌─────────────────────┐            ┌─────────────────────┐
   │   MongoDB 7          │            │   Redis 7            │
   │   :27017             │            │   :6379              │
   │                      │            │                      │
   │  - メインDB          │            │  - セッションキャッシュ│
   │  - 75+ コレクション   │            │  - BullMQ ジョブキュー│
   │  - nexand-shipment   │            │  - B2 Cloud セッション│
   └──────────────────────┘            └──────────────────────┘
                                                │
                                       ┌────────┘
                                       ▼
                              ┌─────────────────┐
                              │  BullMQ Workers  │
                              │  - CSV Import    │
                              │  - Notification  │
                              │  - Billing       │
                              └─────────────────┘

   ─── 外部 API 連携 / 外部 API 集成 ───

   Backend ──→ ヤマト B2 Cloud API（送り状発行・追跡）
   Backend ──→ 佐川 e飛伝III API（送り状発行・追跡）
   Backend ──→ Amazon FBA API（FBA ラベル・出荷計画）
   Backend ──→ Rakuten RSL API（RSL 出荷連携）
```

---

## 3. 技術スタック / 技术栈

### 現行スタック（Express + MongoDB）/ 当前技术栈

| レイヤー / 层 | 技術 / 技术 | 備考 / 备注 |
|---|---|---|
| Backend Runtime | Node.js + TypeScript | Express.js フレームワーク |
| API | REST + GraphQL | 70+ ルートファイル |
| バリデーション / 验证 | Zod | スキーマベースバリデーション |
| データベース | MongoDB 7 + Mongoose | 75+ モデル / コレクション |
| キャッシュ / 缓存 | Redis 7 | セッション + BullMQ キュー |
| ジョブキュー / 任务队列 | BullMQ | CSV インポート・通知・請求 |
| フロントエンド / 前端 | Vue 3 + Vite + Pinia | Element Plus UI ライブラリ |
| テスト / 测试 | Vitest | 1807 テスト（Backend + Frontend） |
| CI/CD | GitHub Actions | 自動テスト・ビルド・デプロイ |
| コンテナ / 容器 | Docker Compose | 全サービス一括起動 |

### 移行計画（NestJS + PostgreSQL）/ 迁移计划

> 現在 `backend-nest/` ディレクトリで NestJS + PostgreSQL (Supabase) + Drizzle ORM への
> 移行を計画・開発中。詳細は `docs/migration/` を参照。
>
> 当前在 `backend-nest/` 目录中计划迁移到 NestJS + PostgreSQL (Supabase) + Drizzle ORM。
> 详情参见 `docs/migration/`。

移行方針 / 迁移方针:
- フロントエンド（Vue 3）は変更しない（API URL のみ変更）
  前端（Vue 3）不变（仅修改 API URL）
- `yamatoB2Service.ts` は NestJS でも変更禁止（wrapper で囲む）
  `yamatoB2Service.ts` 在 NestJS 中也禁止修改（用 wrapper 包裹）
- 全 109 画面の機能維持が必須
  必须维持全部 109 个画面的功能

---

## 4. モノレポ構成 / Monorepo 结构

```
ZELIXWMS/
├── package.json              # ルートワークスペース定義 / 根 workspace 定义
├── docker-compose.yml        # 全サービスコンテナ定義 / 全服务容器定义
├── dev-start.sh              # 開発環境一括起動 / 开发环境一键启动
├── CLAUDE.md                 # AI 開発ルール / AI 开发规则
│
├── backend/                  # Express + TypeScript バックエンド
│   ├── src/
│   │   ├── api/              # ルート（70+ ファイル）+ ミドルウェア
│   │   │   ├── routes/       # RESTful ルート定義
│   │   │   └── middleware/   # auth, rateLimit, validation 等
│   │   ├── models/           # Mongoose モデル（75+ ファイル）
│   │   ├── services/         # ビジネスロジック（30+ ファイル）
│   │   ├── core/             # 拡張システム（Plugin/Hook）
│   │   ├── schemas/          # Zod バリデーションスキーマ
│   │   ├── utils/            # ユーティリティ関数
│   │   ├── lib/              # logger, errors 等の共通ライブラリ
│   │   └── data/             # 組み込みデータ（配送業者等）
│   └── tests/                # Vitest テスト（1454 テスト）
│
├── frontend/                 # Vue 3 倉庫オペレーター画面
│   ├── src/
│   │   ├── views/            # ページコンポーネント
│   │   ├── components/       # 共通コンポーネント
│   │   ├── stores/           # Pinia ストア
│   │   └── composables/      # Vue Composables
│   └── tests/                # Vitest テスト（353 テスト）
│
├── admin/                    # Vue 3 管理ダッシュボード
│   └── src/                  # テナント管理・マスタ設定
│
├── portal/                   # Vue 3 顧客ポータル
│   └── src/                  # 出荷指示・在庫照会・状況確認
│
├── backend-nest/             # NestJS 移行先（開発中）
│   └── drizzle/              # Drizzle ORM マイグレーション
│
├── packages/
│   └── plugin-sdk/           # 拡張プラグイン SDK
│
├── extensions/               # 拡張プラグイン
├── shared/                   # フロントエンド間共有コード
├── scripts/                  # ユーティリティスクリプト
├── carrier-format/           # 配送業者フォーマット定義
├── database/                 # DB スキーマ・シードデータ
└── docs/                     # ドキュメント
    ├── devlog.md             # 開発記録
    ├── migration/            # NestJS 移行設計（6 文書）
    ├── extension/            # 拡張アーキテクチャ（Phase 1-12）
    └── design/               # 設計ドキュメント（本ファイル）
```

### ワークスペース定義 / Workspace 定义

`package.json` で npm workspaces を使用:

```json
{
  "workspaces": ["backend", "frontend", "mobile", "packages/*"]
}
```

> **注意 / 注意**: `admin` と `portal` は独立した `node_modules` を持ち、
> ルートワークスペースには含まれていません。
> `admin` 和 `portal` 有独立的 `node_modules`，不包含在根 workspace 中。

---

## 5. 主要モジュール一覧 / 主要模块一览

### 5.1 モデル（75+ Mongoose コレクション）/ 模型

#### 入庫管理 / 入库管理
| モデル | 説明 / 说明 |
|---|---|
| `inboundOrder` | 入庫予定・指示 / 入库预定指示 |
| `inspectionRecord` | 入庫検品記録（6次元チェック）/ 入库检品记录 |
| `warehouseTask` | 倉庫タスク（検品・棚入れ等）/ 仓库任务 |

#### 出荷管理 / 出库管理
| モデル | 説明 / 说明 |
|---|---|
| `shipmentOrder` | 出荷指示（メイン）/ 出货指示（主表） |
| `order` | 受注ドキュメント / 订单文档 |
| `wave` | ウェーブ（バッチピッキング）/ 波次（批量拣货） |
| `pickTask` / `pickItem` | ピッキングタスク・明細 / 拣货任务明细 |
| `packingTask` / `packingRule` | 梱包タスク・ルール / 打包任务规则 |
| `sortingTask` | 仕分けタスク / 分拣任务 |
| `labelingTask` | ラベリングタスク / 贴标任务 |
| `orderGroup` | 注文グループ / 订单组 |

#### 在庫管理 / 库存管理
| モデル | 説明 / 说明 |
|---|---|
| `stockQuant` | 在庫数量（ロケーション×商品×ロット）/ 库存量（库位×商品×批次） |
| `stockMove` | 在庫移動記録 / 库存移动记录 |
| `inventoryLedger` | 在庫受払台帳 / 库存收付台账 |
| `inventoryReservation` | 在庫引当 / 库存预留 |
| `inventoryCategory` | 在庫カテゴリ / 库存分类 |
| `lot` | ロット管理 / 批次管理 |
| `serialNumber` | シリアル番号管理 / 序列号管理 |
| `location` | ロケーション / 库位 |
| `warehouse` | 倉庫 / 仓库 |

#### 返品・棚卸 / 退货・盘点
| モデル | 説明 / 说明 |
|---|---|
| `returnOrder` | 返品指示 / 退货指示 |
| `stocktakingOrder` | 棚卸指示 / 盘点指示 |
| `cycleCountPlan` | 循環棚卸計画 / 循环盘点计划 |

#### 請求管理 / 计费管理
| モデル | 説明 / 说明 |
|---|---|
| `billingRecord` | 請求レコード / 账单记录 |
| `invoice` | 請求書 / 发票 |
| `serviceRate` | 料金マスタ / 费率主数据 |
| `workCharge` | 作業チャージ / 作业费用 |
| `priceCatalog` | 料金カタログ / 价格目录 |
| `shippingRate` | 配送料金 / 运费 |

#### マスタ・設定 / 主数据・设置
| モデル | 説明 / 说明 |
|---|---|
| `product` / `setProduct` | 商品・セット商品 / 商品・套装商品 |
| `client` / `subClient` | 荷主・サブ荷主 / 货主・子货主 |
| `customer` | 届け先 / 收件人 |
| `carrier` | 配送業者 / 物流商 |
| `supplier` | 仕入先 / 供应商 |
| `shop` | ショップ / 店铺 |
| `material` | 梱包資材 / 包装材料 |
| `orderSourceCompany` | 受注元会社 / 订单来源公司 |

#### システム・拡張 / 系统・扩展
| モデル | 説明 / 说明 |
|---|---|
| `tenant` | テナント / 租户 |
| `user` / `role` | ユーザー・ロール / 用户・角色 |
| `systemSettings` | システム設定 / 系统设置 |
| `featureFlag` | フィーチャーフラグ / 功能开关 |
| `plugin` / `pluginConfig` | プラグイン / 插件 |
| `webhook` / `webhookLog` | Webhook |
| `notification` / `notificationPreference` | 通知 / 通知 |
| `emailTemplate` | メールテンプレート / 邮件模板 |
| `automationScript` / `scriptExecutionLog` | 自動化スクリプト / 自动化脚本 |
| `wmsSchedule` / `wmsScheduleLog` / `wmsTask` | スケジューラー / 调度器 |

#### 配送業者連携 / 物流商集成
| モデル | 説明 / 说明 |
|---|---|
| `carrierAutomationConfig` | 配送業者自動化設定 / 物流商自动化配置 |
| `carrierSessionCache` | B2 Cloud セッションキャッシュ / B2 Cloud 会话缓存 |
| `fbaShipmentPlan` / `fbaBox` | Amazon FBA 出荷計画 / FBA 出货计划 |
| `rslShipmentPlan` | Rakuten RSL 出荷計画 / RSL 出货计划 |

### 5.2 API ルート（70+ ファイル）/ API 路由

主要な API グループ / 主要 API 分组:

| パス / 路径 | ファイル | 説明 / 说明 |
|---|---|---|
| `/api/inbound-orders` | `inboundOrders.ts` | 入庫管理 CRUD + ワークフロー |
| `/api/shipment-orders` | `shipmentOrders.ts` | 出荷指示 CRUD + B2 連携 |
| `/api/inventory` | `inventory.ts` | 在庫照会・調整・移動 |
| `/api/products` | `products.ts` | 商品マスタ CRUD |
| `/api/clients` | `clients.ts` | 荷主マスタ CRUD |
| `/api/return-orders` | `returnOrders.ts` | 返品管理 |
| `/api/stocktaking-orders` | `stocktakingOrders.ts` | 棚卸管理 |
| `/api/billing` | `billing.ts` | 請求管理 |
| `/api/waves` | `waves.ts` | ウェーブ管理 |
| `/api/auth` | `auth.ts` | 認証 |
| `/api/portal-auth` | `portalAuth.ts` | 顧客ポータル認証 |
| `/api/import` | `import.ts` | CSV インポート |
| `/api/notifications` | `notifications.ts` | 通知 |

### 5.3 サービス（30+ ファイル）/ 服务层

| サービス | 説明 / 说明 |
|---|---|
| `inboundWorkflow.ts` | 入庫ワークフロー（confirmed→receiving→putaway→done） |
| `outboundWorkflow.ts` | 出庫ワークフロー（wave→pick→sort→pack→ship） |
| `shipmentOrderService.ts` | 出荷指示 CRUD・一括作成・バリデーション |
| `stockService.ts` | 在庫引当・完了・解放（StockQuant 原子操作） |
| `inspectionService.ts` | 検品サービス（6次元チェック） |
| `cycleCountService.ts` | 循環棚卸（月次20%自動生成） |
| `chargeService.ts` | 作業チャージ自動生成・請求 |
| `csvImportService.ts` | CSV 一括インポート（出荷・商品・入庫） |
| `yamatoB2Service.ts` | ヤマト B2 Cloud API 連携（**変更禁止**） |
| `yamatoCalcService.ts` | ヤマト仕分けコード計算 |
| `sagawaService.ts` | 佐川急便連携 |
| `notificationService.ts` | 通知サービス |
| `autoProcessingEngine.ts` | 自動処理エンジン（イベント駆動） |
| `taskEngine.ts` | 倉庫タスク管理エンジン |
| `ruleEngine.ts` | ルールエンジン（棚入れ先決定等） |
| `workflowEngine.ts` | ワークフローエンジン |
| `operationLogger.ts` | 操作ログ記録 |
| `kpiService.ts` | KPI 算出サービス |

---

## 6. データフロー / 数据流

### 6.1 出荷指示の流れ / 出货指示流程

```
CSV ファイル           手動入力             顧客ポータル
    │                    │                    │
    ▼                    ▼                    ▼
┌─────────────────────────────────────────────────┐
│           csvImportService / API Route           │
│  1. CSV パース + ヘッダーマッピング               │
│  2. 行ごと Zod バリデーション                     │
│  3. プレビュー表示 or 確定実行                    │
└──────────────────────┬──────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────┐
│          shipmentOrderService.createBulk          │
│  1. 注文番号自動採番                               │
│  2. 配送業者情報付与                               │
│  3. ヤマト仕分けコード自動計算                     │
│  4. MongoDB 保存                                   │
└──────────────────────┬──────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────┐
│          autoProcessingEngine                     │
│  イベント駆動で自動処理:                           │
│  - B2 Cloud 自動送信                              │
│  - Webhook 送信                                   │
│  - 通知送信                                       │
└──────────────────────┬──────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────┐
│          yamatoB2Service / sagawaService          │
│  1. 認証（3層キャッシュ）                          │
│  2. バリデーション送信                             │
│  3. エクスポート（送り状発行）                     │
│  4. 追跡番号取得 → DB 更新                        │
└─────────────────────────────────────────────────┘
```

### 6.2 入庫の流れ / 入库流程

```
CSV / 手動入力
    │
    ▼
InboundOrder (draft) → (confirmed) → InboundWorkflow.startReceiving()
    │                                           │
    │                      ┌────────────────────┘
    │                      ▼
    │               WarehouseTask (receiving)
    │                      │
    │                      ▼
    │         InboundWorkflow.confirmReceiveLine()
    │                      │
    │                      ▼
    │               InventoryLedger 記帳
    │               StockQuant 更新
    │                      │
    │                      ▼
    │         InboundWorkflow.startPutaway()
    │                      │
    │                      ▼
    │               WarehouseTask (putaway)
    │               RuleEngine → 棚入れ先決定
    │                      │
    │                      ▼
    │               StockQuant 最終更新
    └──────────────→ InboundOrder (done)
```

---

## 7. 外部システム連携 / 外部系统集成

### 7.1 ヤマト B2 Cloud / 大和 B2 Cloud

**最重要の外部連携。変更禁止。**
**最重要的外部集成。禁止修改。**

| 機能 | API エンドポイント | 説明 / 说明 |
|---|---|---|
| ログイン | B2 Cloud Login API | 3層キャッシュ: メモリ→MongoDB→API |
| バリデーション | `/api/v1/shipments/validate` | 日本語キーで送信 |
| エクスポート | `/api/v1/shipments` | 英語キーで送信、送り状番号取得 |
| 印刷 | Print API | PDF 伝票発行 |
| 追跡 | Tracking API | 配送状況取得 |

### 7.2 佐川急便 e飛伝III / 佐川急便 e飞传III

- `sagawaService.ts` で連携
- 送り状発行・追跡番号取得

### 7.3 Amazon FBA

- `fbaShipmentPlan` / `fbaBox` モデルで管理
- FBA ラベル発行（`fbaLabelService.ts`）
- FBA 出荷計画連携

### 7.4 Rakuten RSL

- `rslShipmentPlan` モデルで管理
- 楽天スーパーロジスティクス連携

---

## 8. 開発環境セットアップ / 开发环境搭建

### 前提条件 / 前提条件

| ツール | バージョン | 用途 / 用途 |
|---|---|---|
| Node.js | 18+ | ランタイム |
| npm | 9+ | パッケージ管理 |
| Docker | 最新 | MongoDB + Redis |
| Git | 最新 | バージョン管理 |

### セットアップ手順 / 搭建步骤

```bash
# 1. リポジトリクローン / 克隆仓库
git clone <repo-url> ZELIXWMS
cd ZELIXWMS

# 2. MongoDB + Redis 起動 / 启动 MongoDB + Redis
docker compose up -d mongo redis

# 3. 依存関係インストール / 安装依赖
npm install

# 4. admin と portal は個別にインストール / 单独安装
cd admin && npm install && cd ..
cd portal && npm install && cd ..

# 5. 初期データ投入 / 导入种子数据
npm run seed

# 6. 全サービス起動 / 启动所有服务
./dev-start.sh
# または個別起動 / 或单独启动:
npm run dev:backend    # Backend :4000
npm run dev:frontend   # Frontend :4001
```

### 確認 / 确认

- ブラウザで http://localhost:4001 を開く（dev mode は自動ログイン）
  浏览器打开 http://localhost:4001（dev 模式自动登录）
- Backend ヘルスチェック: http://localhost:4000/health
  后端健康检查：http://localhost:4000/health

### テスト実行 / 执行测试

```bash
# Backend テスト（1454 テスト）/ 后端测试
cd backend && npx vitest run

# Frontend テスト（353 テスト）/ 前端测试
cd frontend && npx vitest run
```

### DB 管理 / 数据库管理

```bash
# ローカル DB 直接起動（Docker なし）/ 直接启动本地 DB
npm run db

# DB ダンプ / 数据库备份
npm run db:dump

# DB リストア / 数据库恢复
npm run db:restore
```

---

## 9. コーディング規約 / 编码规范

### 9.1 バイリンガル注釈（必須）/ 双语注释（必须）

すべてのコメント・ドキュメントは**中国語 + 日本語**の二言語で記載する。
所有注释和文档必须使用**中文 + 日文**双语记载。

```typescript
// 在庫引当を実行する / 执行库存预留
async function reserveStock(orderId: string): Promise<void> {
  // ...
}
```

### 9.2 イミュータブルパターン / 不可变模式

既存オブジェクトを直接変更せず、新しいオブジェクトを返す。
不直接修改现有对象，返回新对象。

### 9.3 ファイルサイズ制限 / 文件大小限制

- 目安: 200-400 行 / 建议：200-400 行
- 上限: 800 行 / 上限：800 行
- 50 行以内の関数 / 函数不超过 50 行
- ネスト 4 階層以下 / 嵌套不超过 4 层

### 9.4 エラーハンドリング / 错误处理

- すべてのエラーを明示的にハンドリング / 所有错误显式处理
- UI 向けはユーザーフレンドリーなメッセージ / 面向 UI 的错误使用友好消息
- サーバー側は詳細ログ / 服务端记录详细日志
- エラーを無視しない / 不吞掉错误

### 9.5 入力バリデーション / 输入验证

- Zod スキーマによるバリデーション / 使用 Zod schema 验证
- 外部データを信頼しない / 不信任外部数据
- 境界でバリデーション / 在边界处验证

### 9.6 commit メッセージ / 提交信息

```
<type>: <日本語説明> <中文说明>
```

type: `feat` | `fix` | `refactor` | `docs` | `test` | `chore` | `perf` | `ci`

### 9.7 ドキュメント同期 / 文档同步

コード変更時は対応ドキュメントを**先に更新**してから開発する。
代码变更时**先更新**对应文档，再进行开发。

開発記録は `docs/devlog.md` に記録する。
开发记录记录到 `docs/devlog.md`。

---

## 10. 変更禁止ルール / 禁止变更规则

### 対象ファイル / 对象文件

以下のファイル・機能は**安定稼働中のため変更禁止**:
以下文件・功能**处于稳定运行状态，禁止修改**：

#### `backend/src/services/yamatoB2Service.ts`

| 関数 / 函数 | 説明 / 说明 |
|---|---|
| `authenticatedFetch()` | 500 + 'entry' セッション切れ自動リトライ |
| `validateShipments()` | 日本語キー + `/api/v1/shipments/validate` |
| `exportShipments()` | 英語キー + `/api/v1/shipments` |
| `login()` / `loginFromApi()` | 3層キャッシュ（インメモリ→MongoDB→API） |
| `addressMapping` | consignee/shipper 住所フィールドマッピング |

#### `backend/src/utils/yamatoB2Format.ts`

- `b2ApiToJapaneseKeyMapping` 関数

### 背景 / 背景

- 2026-03-12 に長時間デバッグして安定化
  2026-03-12 经过长时间调试后稳定化
- proxy の 'entry' エラーは B2 Cloud セッション切れが原因、自動リトライで解決済み
  proxy 的 'entry' 错误是 B2 Cloud 会话过期导致，已通过自动重试解决
- `/api/v1/shipments/validate-full` は使わない（幅チェッカーにバグあり）
  不使用 `/api/v1/shipments/validate-full`（宽度检查器有 bug）

### 機能追加する場合 / 添加功能时

B2 Cloud 関連の変更が必要な場合は、**既存のコアロジックを変更せず上に構築する**こと。
需要 B2 Cloud 相关变更时，**不修改现有核心逻辑，在其上层构建**。

```typescript
// GOOD: 既存サービスを利用して上に構築 / 在现有服务上构建
import { exportShipments } from './yamatoB2Service';
async function myNewFeature() {
  const result = await exportShipments(config, shipments);
  // ... 追加処理 / 追加处理
}

// BAD: コアロジックを変更 / 修改核心逻辑
// authenticatedFetch() の中身を変更 ← 禁止！
```

---

> **最終更新 / 最后更新**: 2026-03-21
> **テスト数 / 测试数**: 1807（Backend 1454 + Frontend 353）
> **LOGIFAST 項目 / LOGIFAST 项目**: 109 / 109（100%）
