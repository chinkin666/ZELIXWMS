# ZELIXWMS 迁移需求定义书 / ZELIXWMS 移行要件定義書

> 创建日期 / 作成日: 2026-03-21
> 最后更新 / 最終更新: 2026-03-21
> 状态 / ステータス: 确定 / 確定

---

## 1. 项目概要 / プロジェクト概要

### 1.1 ZELIX WMS 是什么 / ZELIX WMS とは

ZELIX WMS 是面向日本 3PL（第三方物流）行业的仓库管理系统（WMS），
覆盖 LOGIFAST 全部 109 个业务画面，包括入库、出库、库存、计费、配送对接等核心功能。

ZELIX WMS は日本の 3PL（サードパーティ・ロジスティクス）業界向け倉庫管理システム（WMS）であり、
LOGIFAST の全 109 業務画面（入庫・出荷・在庫・請求・配送連携等）をカバーする。

### 1.2 迁移目标 / 移行目標

将现有 Express.js + MongoDB 技术栈迁移至 NestJS + PostgreSQL (Supabase)，
实现以下核心目标：

現行の Express.js + MongoDB スタックを NestJS + PostgreSQL (Supabase) へ移行し、
以下の目標を達成する：

| 目标 / 目標 | 说明 / 説明 |
|---|---|
| **关系型数据建模 / リレーショナルデータモデリング** | WMS 数据天然具有关系型特征（库存移动、出库、计费需要事务完整性）/ WMS データは本質的にリレーショナル（在庫移動・出荷・請求にトランザクション整合性が必要） |
| **多租户 SaaS 化 / マルチテナント SaaS 化** | 通过 RLS + 应用层双重隔离实现租户分离 / RLS + アプリケーション層の二重分離によるテナント隔離 |
| **类型安全 + 架构规范 / 型安全 + アーキテクチャ規範** | NestJS 的 DI + 模块化 + Drizzle 的类型安全查询 / NestJS の DI + モジュール化 + Drizzle の型安全クエリ |
| **托管基础设施 / マネージドインフラ** | Supabase 提供 Auth、Storage、Realtime 等开箱即用功能 / Supabase が Auth・Storage・Realtime を提供 |

### 1.3 技术栈对照 / 技術スタック対照

| 项目 / 項目 | 现行 / 現行 | 目标 / 目標 |
|---|---|---|
| 框架 / フレームワーク | Express.js 4.x | **NestJS 11.x (Fastify)** |
| 数据库 / データベース | MongoDB 7.x | **PostgreSQL 16 (Supabase)** |
| ORM | Mongoose 8.x | **Drizzle ORM** |
| 认证 / 認証 | 手写 JWT (jsonwebtoken) / 手書き JWT | **Supabase Auth** |
| 验证 / バリデーション | Zod 3.x | Zod 3.x（继续使用 / 継続使用） |
| 测试 / テスト | Vitest | Vitest（继续使用 / 継続使用） |
| 队列 / キュー | BullMQ + Redis | BullMQ + Redis（继续使用 / 継続使用） |
| 运行时 / ランタイム | Node.js 20+ | Node.js 20+（继续使用 / 継続使用） |

### 1.4 多租户 SaaS 模型 / マルチテナント SaaS モデル

采用**共享数据库 + RLS 隔离**模式（非 schema-per-tenant）：

**共有データベース + RLS 分離**モデルを採用（schema-per-tenant ではない）：

- 全表包含 `tenant_id` 列 / 全テーブルに `tenant_id` カラム
- PostgreSQL RLS 策略强制行级别隔离 / PostgreSQL RLS ポリシーで行レベル分離
- 应用层 Repository Pattern 自动注入 `tenant_id` / アプリケーション層の Repository Pattern で `tenant_id` 自動注入
- Supabase Auth JWT 中携带 `tenant_id` claim / Supabase Auth JWT に `tenant_id` claim を含める

---

## 2. 现行系统规模 / 現行システム規模

### 2.1 总体规模 / 全体規模

| 指标 / 指標 | 数值 / 数値 | 备注 / 備考 |
|---|---|---|
| Mongoose 模型 / Mongoose モデル | **78** | 迁移到 65+ PostgreSQL 表 / 65+ PostgreSQL テーブルに移行 |
| API 端点 / API エンドポイント | **492** | 70 路由文件、88 控制器 / 70 ルートファイル、88 コントローラ |
| 服务层 / サービス層 | **34** | 包含核心业务逻辑 / コアビジネスロジック含む |
| 中间件 / ミドルウェア | **9** | 迁移到 NestJS Guards/Interceptors/Pipes |
| 前端应用 / フロントエンドアプリ | **3** | Vue 3 + Vite + Pinia |
| 测试用例 / テストケース | **1778+** | 后端 1454 + 前端 324 / バックエンド 1454 + フロントエンド 324 |

### 2.2 前端应用明细 / フロントエンドアプリ明細

| 应用 / アプリ | 组件数 / コンポーネント数 | 用途 / 用途 |
|---|---|---|
| `frontend/` | **247** | 仓库操作员主界面 / 倉庫オペレータメイン画面 |
| `admin/` | **9** | 系统管理画面 / システム管理画面 |
| `portal/` | **12** | 客户门户 / クライアントポータル |

### 2.3 数据模型分类 / データモデル分類

| 分类 / 分類 | 模型数 / モデル数 | 代表模型 / 代表モデル |
|---|---|---|
| 租户 + 用户 / テナント + ユーザー | 3 | `User`, `Tenant`, `Role` |
| 仓库 + 位置 / 倉庫 + ロケーション | 2 | `Warehouse`, `Location` |
| 商品 + 材料 / 商品 + 資材 | 3 | `Product`, `Material`, `SetProduct` |
| 入库 / 入庫 | 2 | `InboundOrder`, `InspectionRecord` |
| 出库 / 出荷 | 2 | `ShipmentOrder`, `SetOrder` |
| 退货 / 返品 | 1 | `ReturnOrder` |
| 库存 / 在庫 | 7 | `StockQuant`, `StockMove`, `InventoryReservation`, `InventoryLedger`, `Lot`, `SerialNumber`, `InventoryCategory` |
| 盘点 / 棚卸 | 2 | `StocktakingOrder`, `CycleCountPlan` |
| 计费 / 請求 | 6 | `BillingRecord`, `Invoice`, `WorkCharge`, `ServiceRate`, `ShippingRate`, `PriceCatalog` |
| 配送 / 配送 | 3 | `Carrier`, `CarrierAutomationConfig`, `CarrierSessionCache` |
| 客户 / 顧客 | 6 | `Client`, `SubClient`, `Shop`, `Customer`, `Supplier`, `OrderSourceCompany` |
| 报表 / レポート | 3 | `DailyReport`, `ExceptionReport`, `OrderGroup` |
| 作业管理 / 作業管理 | 8 | `Wave`, `PickTask`, `PickItem`, `PackingTask`, `PackingRule`, `LabelingTask`, `SortingTask`, `ReplenishmentTask` |
| 扩展 + 插件 / 拡張 + プラグイン | 18 | `Plugin`, `Webhook`, `AutomationScript`, `RuleDefinition`, `PrintTemplate`, `EmailTemplate` 等 |
| 系统 / システム | 5 | `Notification`, `OperationLog`, `ApiLog`, `EventLog`, `SystemSettings` |
| FBA/RSL | 3 | `FbaShipmentPlan`, `RslShipmentPlan`, `FbaBox` |
| 通用任务 / 汎用タスク | 2 | `WarehouseTask`, `WmsTask` |
| 其他 / その他 | 2 | `MappingConfig`, `FormTemplate` |

### 2.4 服务层概览 / サービス層概要

核心服务 34 个，关键服务包括：

コアサービス 34 個、主要サービスは以下：

| 服务 / サービス | 职责 / 責務 |
|---|---|
| `shipmentOrderService` | 出库指示 CRUD + 状态流转 + 批量操作 / 出荷指示 CRUD + ステータス遷移 + バルク操作 |
| `inventoryService` | 库存查询 + 调整 + 预留 / 在庫照会 + 調整 + 引当 |
| `inboundWorkflow` | 入库工作流（收货→检品→上架）/ 入庫ワークフロー（受入→検品→格納） |
| `outboundWorkflow` | 出库工作流（预留→拣货→打包→出库）/ 出荷ワークフロー（引当→ピック→パック→出荷） |
| `yamatoB2Service` | 大和 B2 Cloud 对接（**禁止修改**）/ ヤマト B2 Cloud 連携（**変更禁止**） |
| `chargeService` | 计费计算 + 作业费核算 / 請求計算 + 作業費算出 |
| `ruleEngine` | 规则引擎（货位分配、打包等）/ ルールエンジン（スロッティング・パッキング等） |
| `workflowEngine` | 通用工作流引擎 / 汎用ワークフローエンジン |

---

## 3. 迁移范围 / 移行範囲

### 3.1 迁移对象 / 移行対象

| 迁移项 / 移行項目 | 现行 / 現行 | 目标 / 目標 | 说明 / 説明 |
|---|---|---|---|
| 数据库 / データベース | MongoDB 7.x | PostgreSQL 16 (Supabase) | 78 集合 → 65+ 规范化表 / 78 コレクション → 65+ 正規化テーブル |
| 后端框架 / バックエンドフレームワーク | Express.js 4.x | NestJS 11 (Fastify platform) | 模块化 + DI + 装饰器 / モジュール化 + DI + デコレータ |
| ORM | Mongoose 8.x | Drizzle ORM | 类型安全 + 轻量 / 型安全 + 軽量 |
| 认证 / 認証 | 手写 JWT | Supabase Auth | 托管认证 + RLS 集成 / マネージド認証 + RLS 統合 |
| 中间件 / ミドルウェア | Express middleware | NestJS Guards / Interceptors / Pipes | 声明式 + 模块化 / 宣言的 + モジュール化 |
| API 文档 / API ドキュメント | swagger-jsdoc | @nestjs/swagger | 装饰器自动生成 / デコレータ自動生成 |
| 限流 / レートリミット | express-rate-limit | @nestjs/throttler | NestJS 原生集成 / NestJS ネイティブ統合 |

### 3.2 不迁移 / 移行しないもの

| 项目 / 項目 | 理由 / 理由 |
|---|---|
| **yamatoB2Service.ts** | 2026-03-12 经过长时间调试已稳定。NestJS 中用 adapter 包裹，核心逻辑不动 / 2026-03-12 に長時間デバッグして安定化。NestJS では adapter でラップし、コアロジック変更禁止 |
| **yamatoB2Format.ts** | B2 Cloud 格式定义，与 yamatoB2Service 配套 / B2 Cloud フォーマット定義、yamatoB2Service と連動 |
| **Vue 3 前端 / Vue 3 フロントエンド** | 仅变更 API base URL。247 + 9 + 12 组件无需修改 / API ベース URL のみ変更。268 コンポーネント変更不要 |
| **BullMQ 队列架构 / BullMQ キューアーキテクチャ** | 继续使用，通过 @nestjs/bullmq 集成 / 継続使用、@nestjs/bullmq で統合 |
| **Redis** | 继续作为缓存 + 队列后端 / キャッシュ + キューバックエンドとして継続 |
| **PDF 处理 / PDF 処理** | pdf-lib, muhammara 继续使用 / pdf-lib, muhammara 継続使用 |
| **图像处理 / 画像処理** | sharp, skia-canvas 继续使用 / sharp, skia-canvas 継続使用 |
| **GraphQL** | **废止不迁移**（见 ADR-002）/ **廃止、移行しない**（ADR-002 参照） |

---

## 4. 技术栈决定 / 技術スタック決定

### 4.1 技术选型详情 / 技術選定詳細

| 领域 / 領域 | 选定 / 選定 | 选定理由 / 選定理由 | 被否定的替代方案 / 却下した代替案 |
|---|---|---|---|
| **后端框架 / バックエンド** | NestJS 11 + Fastify | 企业级 DI、模块化、TypeScript first、Fastify 性能优于 Express 2-3x / エンタープライズ DI、モジュール化、TypeScript first、Fastify は Express の 2-3 倍高速 | Express 5（缺少 DI 规范）、Hono（生态不够成熟）/ Express 5（DI 規範なし）、Hono（エコシステム未成熟） |
| **ORM** | Drizzle ORM | 类型安全、零抽象、SQL-like API、轻量（无 query builder 开销）/ 型安全、ゼロ抽象、SQL-like API、軽量 | Prisma（运行时大、migration 锁问题）、TypeORM（类型安全差、维护不活跃）/ Prisma（ランタイム大、migration ロック問題）、TypeORM（型安全性低、メンテ不活発） |
| **数据库 / データベース** | PostgreSQL 16 on Supabase | RLS 原生支持、ACID 事务、JSON/JSONB 兼容、Supabase 托管 / RLS ネイティブ、ACID トランザクション、JSON/JSONB 互換、Supabase マネージド | CockroachDB（成本高）、PlanetScale（MySQL 系、缺少 RLS）/ CockroachDB（コスト高）、PlanetScale（MySQL 系、RLS なし） |
| **缓存 / キャッシュ** | 3 层：LRU (内存) → Redis → PostgreSQL / 3 層：LRU (メモリ) → Redis → PostgreSQL | 热数据内存命中、次热 Redis、冷数据 PG fallback / ホットデータはメモリヒット、次に Redis、コールドデータは PG フォールバック | 纯 Redis（缺少本地缓存层）/ 純 Redis（ローカルキャッシュ層なし） |
| **队列 / キュー** | BullMQ (继续 / 継続) | 成熟稳定、已有生产验证、@nestjs/bullmq 集成 / 成熟安定、本番実績あり、@nestjs/bullmq 統合 | — |
| **全文搜索 / 全文検索** | pg_trgm + GIN index | 无需额外服务、支持模糊搜索 + 日文搜索 / 追加サービス不要、あいまい検索 + 日本語検索対応 | Elasticsearch（运维负担重）、Meilisearch（额外基础设施）/ Elasticsearch（運用負荷大）、Meilisearch（追加インフラ） |
| **认证 / 認証** | Supabase Auth | 与 RLS 深度集成、JWT 自动管理、多种 OAuth provider / RLS と深い統合、JWT 自動管理、多種 OAuth プロバイダ | Auth0（成本高）、自建（维护负担）/ Auth0（コスト高）、自前実装（メンテ負荷） |
| **文件存储 / ファイルストレージ** | Supabase Storage | S3 兼容、与 Auth 集成、RLS 策略 / S3 互換、Auth 統合、RLS ポリシー | AWS S3 直连（需额外 IAM 管理）/ AWS S3 直接（追加 IAM 管理必要） |
| **前端 / フロントエンド** | Vue 3 + Element Plus (**不变 / 変更なし**) | 已成熟稳定、268 组件无需重写 / 成熟安定、268 コンポーネント書き直し不要 | — |

### 4.2 新增包 / 新規追加パッケージ

| 包名 / パッケージ名 | 用途 / 用途 |
|---|---|
| `@nestjs/core`, `@nestjs/common`, `@nestjs/platform-fastify` | NestJS 核心 + Fastify 适配器 / NestJS コア + Fastify アダプタ |
| `@nestjs/config` | 配置管理（.env 加载）/ 設定管理（.env 読み込み） |
| `@nestjs/swagger` | API 文档自动生成 / API ドキュメント自動生成 |
| `@nestjs/throttler` | 限流 / レートリミット |
| `@nestjs/bullmq` | BullMQ 队列集成 / BullMQ キュー統合 |
| `drizzle-orm`, `drizzle-kit` | ORM + 迁移工具 / ORM + マイグレーションツール |
| `@supabase/supabase-js` | Supabase 客户端 / Supabase クライアント |
| `postgres` (pg driver) | PostgreSQL 驱动 / PostgreSQL ドライバ |

### 4.3 废弃包 / 廃止パッケージ

| 废弃 / 廃止 | 替代 / 代替 |
|---|---|
| `express`, `cors`, `helmet`, `morgan`, `multer` | NestJS + Fastify 内置 / NestJS + Fastify 組み込み |
| `mongoose` | `drizzle-orm` + `drizzle-kit` |
| `jsonwebtoken` | `@supabase/supabase-js` |
| `@apollo/server` | 废止（REST only）/ 廃止（REST のみ） |
| `swagger-jsdoc`, `swagger-ui-express` | `@nestjs/swagger` |
| `express-rate-limit` | `@nestjs/throttler` |

---

## 5. 非功能需求 / 非機能要件

### 5.1 性能 / パフォーマンス

| 指标 / 指標 | 目标值 / 目標値 | 备注 / 備考 |
|---|---|---|
| API 响应时间 (p95) / API レスポンスタイム (p95) | **< 200ms** | 现行同等或更优 / 現行同等以上 |
| 数据库查询 / データベースクエリ | **< 50ms** | 含 RLS 开销 / RLS オーバーヘッド含む |
| 批量操作 (1000 件) / バルク操作 (1000 件) | **< 5s** | 出库批量创建等 / 出荷バルク作成等 |
| 冷启动 / コールドスタート | **< 3s** | NestJS + Fastify 启动时间 / NestJS + Fastify 起動時間 |
| 并发用户 / 同時接続ユーザー | **100+** | 单实例 / シングルインスタンス |

**性能保证手段 / パフォーマンス保証手段：**
- PostgreSQL 索引优化（复合索引、部分索引、GIN 索引）/ PostgreSQL インデックス最適化（複合・部分・GIN）
- Drizzle relational query 防止 N+1 / Drizzle relational query で N+1 防止
- 连接池 pgBouncer (Supabase 内置) / コネクションプール pgBouncer (Supabase 内蔵)
- 3 层缓存（LRU → Redis → PG）/ 3 層キャッシュ（LRU → Redis → PG）

### 5.2 可扩展性 / スケーラビリティ

- 支持 **10x 用户增长**，无架构变更 / **10 倍ユーザー増**にアーキテクチャ変更なしで対応
- 无状态后端设计，支持水平扩展 / ステートレスバックエンド設計、水平スケーリング対応
- Supabase 连接管理 (pgBouncer) 自动处理连接池 / Supabase 接続管理 (pgBouncer) で自動プーリング
- BullMQ 队列支持多 worker 并行 / BullMQ キューは複数 worker 並列対応

### 5.3 安全 / セキュリティ

| 安全措施 / セキュリティ対策 | 实现 / 実装 |
|---|---|
| 租户隔离 / テナント分離 | **RLS + 应用层双重隔离** / **RLS + アプリケーション層の二重分離** |
| 认证 / 認証 | Supabase Auth (JWT, OAuth) |
| 授权 / 認可 | RBAC（角色 + 权限 Guard）/ RBAC（ロール + パーミッション Guard） |
| SQL 注入防止 / SQL インジェクション防止 | Drizzle 参数化查询 / Drizzle パラメータ化クエリ |
| XSS 防止 | Fastify 内置 + Helmet 等效配置 |
| CSRF 防止 | SameSite cookie + CSRF token |
| 限流 / レートリミット | @nestjs/throttler（全端点）/ @nestjs/throttler（全エンドポイント） |
| OWASP 合规 / OWASP 準拠 | Top 10 全项对策实施 / Top 10 全項目対策実施 |

### 5.4 可用性 / 可用性

- 目标可用率 / 目標稼働率: **99.9%**（月停机 < 43 分钟 / 月間ダウンタイム < 43 分）
- Supabase 托管 PostgreSQL 自带高可用 / Supabase マネージド PostgreSQL は HA 内蔵
- 零停机部署（rolling update）/ ゼロダウンタイムデプロイ（rolling update）

### 5.5 可观测性 / 可観測性

| 领域 / 領域 | 工具/实现 / ツール/実装 |
|---|---|
| 结构化日志 / 構造化ログ | Pino（继续使用、JSON 格式）/ Pino（継続使用、JSON フォーマット） |
| 健康检查 / ヘルスチェック | `@nestjs/terminus`（DB, Redis, BullMQ 检查）/ `@nestjs/terminus`（DB, Redis, BullMQ チェック） |
| APM 准备 / APM レディ | OpenTelemetry instrumentation 预留 / OpenTelemetry instrumentation 準備 |
| 操作日志 / 操作ログ | AuditInterceptor → PostgreSQL 持久化 / AuditInterceptor → PostgreSQL 永続化 |
| API 日志 / API ログ | LoggingInterceptor → 请求/响应记录 / LoggingInterceptor → リクエスト/レスポンス記録 |
| 错误追踪 / エラー追跡 | 全局 ExceptionFilter + 结构化错误上下文 / グローバル ExceptionFilter + 構造化エラーコンテキスト |

---

## 6. 关键设计决定 (ADR) / 重要設計決定 (ADR)

### ADR-001: NestJS Platform → Fastify（非 Express）

**状态 / ステータス:** 确定 / 確定

**决定 / 決定:**
使用 `@nestjs/platform-fastify` 而非默认的 `@nestjs/platform-express`。

`@nestjs/platform-express` ではなく `@nestjs/platform-fastify` を使用する。

**理由 / 理由:**
- Fastify 基准性能为 Express 的 2-3 倍 / Fastify のベンチマーク性能は Express の 2-3 倍
- 内置 JSON schema 验证 / JSON schema バリデーション内蔵
- 更好的插件生态（@fastify/helmet, @fastify/cors 等）/ 優れたプラグインエコシステム
- 既然是全新迁移，没有理由沿用 Express / 全面移行であり Express を踏襲する理由なし

**影响 / 影響:**
- 部分 Express 专用中间件需替换为 Fastify 版本 / 一部 Express 専用ミドルウェアは Fastify 版に置換

### ADR-002: GraphQL 废止 → REST Only

**状态 / ステータス:** 确定 / 確定

**决定 / 決定:**
废止现有 @apollo/server GraphQL 端点，迁移后仅提供 REST API。

現行の @apollo/server GraphQL エンドポイントを廃止し、REST API のみ提供する。

**理由 / 理由:**
- 现有前端 100% 使用 REST，GraphQL 利用率为 0 / 現行フロントエンドは 100% REST 使用、GraphQL 利用率は 0
- 减少维护双重 API 的负担 / 二重 API メンテナンスの負荷削減
- @nestjs/swagger 自动生成 REST 文档足够 / @nestjs/swagger の自動 REST ドキュメントで十分

### ADR-003: ObjectId → UUID v5 确定性转换 / ObjectId → UUID v5 決定論的変換

**状态 / ステータス:** 确定 / 確定

**决定 / 決定:**
MongoDB ObjectId 通过 UUID v5 (namespace + ObjectId hex string) 确定性转换为 UUID。

MongoDB ObjectId を UUID v5 (namespace + ObjectId hex string) で決定論的に UUID に変換する。

**理由 / 理由:**
- 确定性：同一 ObjectId 始终生成同一 UUID / 決定論的：同一 ObjectId は常に同一 UUID を生成
- 前端 URL 中的 ID 引用可通过全局替换迁移 / フロントエンド URL の ID 参照はグローバル置換で移行可能
- 保持外键关系完整性 / 外部キー関係の整合性維持

**转换函数 / 変換関数:**
```
UUID v5(namespace="ZELIXWMS", name=ObjectId.toHexString())
```

### ADR-004: RLS + Application-level 双层租户隔离 / RLS + アプリケーション層の二重テナント分離

**状态 / ステータス:** 确定 / 確定

**决定 / 決定:**
同时使用 PostgreSQL RLS 和应用层 tenant_id 过滤，双重保障。

PostgreSQL RLS とアプリケーション層 tenant_id フィルタリングの両方を使用する二重保障。

**理由 / 理由:**
- RLS 是最后防线，防止应用层 bug 导致数据泄露 / RLS は最後の砦、アプリ層バグによるデータ漏洩を防止
- 应用层过滤提供更好的查询计划和错误信息 / アプリ層フィルタリングでより良いクエリプランとエラーメッセージ
- 两层独立验证，单层失效不会导致数据泄露 / 二層独立検証、単層故障でもデータ漏洩しない

### ADR-005: Repository Pattern 强制 tenant_id / Repository Pattern で tenant_id 強制

**状态 / ステータス:** 确定 / 確定

**决定 / 決定:**
所有数据访问通过 Repository 基类，自动注入 tenant_id WHERE 条件。

全データアクセスは Repository 基底クラス経由、tenant_id WHERE 条件を自動注入する。

**理由 / 理由:**
- 防止开发者遗忘 tenant_id 过滤 / 開発者の tenant_id フィルタ漏れを防止
- 统一数据访问模式，便于审计 / 統一データアクセスパターン、監査容易
- 测试中可轻松 mock / テスト時に容易にモック可能

**实现 / 実装:**
```typescript
// BaseRepository 自动为所有查询添加 tenant_id 条件
// BaseRepository が全クエリに自動で tenant_id 条件を付与
abstract class BaseRepository<T> {
  findAll(tenantId: string): Promise<T[]>
  findById(tenantId: string, id: string): Promise<T | null>
  create(tenantId: string, data: CreateDTO): Promise<T>
  update(tenantId: string, id: string, data: UpdateDTO): Promise<T>
  delete(tenantId: string, id: string): Promise<void>
}
```

### ADR-006: Products 表保持宽表设计（不拆分 EAV）/ Products テーブルはワイドレイアウト維持（EAV 分割しない）

**状态 / ステータス:** 确定 / 確定

**决定 / 決定:**
Products 表保持单表宽列设计，动态属性使用 JSONB 列。不采用 EAV 模式。

Products テーブルは単一テーブルのワイドカラム設計を維持、動的属性は JSONB カラムを使用。EAV パターンは採用しない。

**理由 / 理由:**
- WMS 商品属性相对固定，不需要 EAV 的灵活性 / WMS 商品属性は比較的固定、EAV の柔軟性は不要
- 宽表查询性能远优于 EAV 多表 JOIN / ワイドテーブルのクエリ性能は EAV の多テーブル JOIN より遥かに優秀
- JSONB 列可处理少量动态属性 / JSONB カラムで少量の動的属性を処理可能
- 与前端现有数据结构完全兼容 / フロントエンド既存データ構造と完全互換

---

## 7. 工期估算 / 工期見積もり

**总工期 / 総工期:** 11 周 / 11 週間、**340 时间 / 340 時間**

> 注意：这是现实估算，非乐观估算。包含测试、调试、文档时间。
> 注意：これは現実的な見積もりであり、楽観的ではない。テスト・デバッグ・ドキュメント時間を含む。

| Phase | 名称 / 名称 | 周次 / 週 | 时间 / 時間 | 主要内容 / 主要内容 |
|---|---|---|---|---|
| **Phase 0** | 基础骨架 / 基盤骨格 | Week 1 | 30h | NestJS + Drizzle 项目初始化、Supabase 设置、CI/CD 搭建 / NestJS + Drizzle プロジェクト初期化、Supabase セットアップ、CI/CD 構築 |
| **Phase 1** | 认证 + 租户 + 主数据 / 認証 + テナント + マスタ | Week 2 | 40h | Supabase Auth 集成、User/Tenant/Role、Product/Warehouse/Location CRUD / Supabase Auth 統合、User/Tenant/Role、Product/Warehouse/Location CRUD |
| **Phase 2** | 入出库核心 / 入出荷コア | Week 3-4 | 60h | InboundOrder、ShipmentOrder、StockQuant/StockMove、库存引当 / InboundOrder、ShipmentOrder、StockQuant/StockMove、在庫引当 |
| **Phase 3** | 作业管理 + 计费 / 作業管理 + 請求 | Week 5-6 | 50h | Wave/Pick/Pack/Label、BillingRecord/Invoice/ServiceRate、工作流引擎 / Wave/Pick/Pack/Label、BillingRecord/Invoice/ServiceRate、ワークフローエンジン |
| **Phase 4** | 配送对接 + 扩展 / 配送連携 + 拡張 | Week 7-8 | 50h | B2 Cloud wrapper、佐川、FBA/RSL、插件系统、自动化规则 / B2 Cloud ラッパー、佐川、FBA/RSL、プラグインシステム、自動化ルール |
| **Phase 5** | 数据迁移 + 集成测试 / データ移行 + 統合テスト | Week 9-10 | 60h | MongoDB → PG 迁移脚本、ObjectId→UUID 转换、全端点集成测试 / MongoDB → PG 移行スクリプト、ObjectId→UUID 変換、全エンドポイント統合テスト |
| **Phase 6** | 端到端验证 + 上线准备 / E2E 検証 + 本番準備 | Week 11 | 50h | 109 画面全量验证、性能测试、安全审计、部署文档 / 109 画面全量検証、性能テスト、セキュリティ監査、デプロイドキュメント |

### 工期前提条件 / 工期前提条件

- 单人全职开发 / 一人フルタイム開発
- 前端无需大幅修改（仅 API URL）/ フロントエンド大幅修正不要（API URL のみ）
- yamatoB2Service.ts 包裹而非重写 / yamatoB2Service.ts はラップのみ、書き直しなし
- Supabase Pro plan 使用 / Supabase Pro プラン使用

---

## 8. 风险与对策 / リスクと対策

| # | 风险 / リスク | 发生概率 / 発生確率 | 影响度 / 影響度 | 对策 / 対策 |
|---|---|---|---|---|
| 1 | **B2 Cloud 服务包裹复杂度 / B2 Cloud サービスラップの複雑さ** | 中 | 高 | yamatoB2Service.ts 的 3 层缓存（内存→MongoDB→API）需改为（内存→Redis→API）。仅修改缓存层，核心逻辑完全不动 / yamatoB2Service.ts の 3 層キャッシュ（メモリ→MongoDB→API）を（メモリ→Redis→API）に変更。キャッシュ層のみ修正、コアロジック一切変更なし |
| 2 | **数据迁移完整性（78 集合）/ データ移行整合性（78 コレクション）** | 中 | 高 | 编写可重复执行的迁移脚本 + 行数校验 + 哈希校验。先在 staging 环境完整跑一轮 / 冪等な移行スクリプト + 行数検証 + ハッシュ検証。staging 環境で先に完全実行 |
| 3 | **前端兼容性（ObjectId→UUID）/ フロントエンド互換性（ObjectId→UUID）** | 中 | 中 | UUID v5 确定性转换保证 ID 可预测。API 响应格式保持完全兼容 / UUID v5 決定論的変換で ID 予測可能。API レスポンス形式は完全互換維持 |
| 4 | **聚合查询→SQL 性能退化 / 集約クエリ→SQL パフォーマンス退化** | 低 | 高 | MongoDB aggregation pipeline 的复杂查询需仔细转换为优化的 SQL + 索引。提前识别 Top 20 慢查询候选 / MongoDB aggregation pipeline の複雑クエリは最適化 SQL + インデックスに慎重に変換。Top 20 スロークエリ候補を事前特定 |
| 5 | **Supabase 连接数限制 / Supabase 接続数制限** | 低 | 中 | Pro plan 提供 pgBouncer + 直连模式。应用层使用连接池、控制最大连接数 / Pro プランは pgBouncer + 直接接続モード提供。アプリ層でコネクションプール使用、最大接続数制御 |

### 风险缓解总策略 / リスク緩和総合戦略

- 每个 Phase 结束后进行完整回归测试 / 各 Phase 終了後に完全リグレッションテスト
- 保留 MongoDB 只读连接作为 fallback 验证 / MongoDB 読み取り専用接続を fallback 検証として保持
- 关键路径（出库→配送→请求）优先迁移和验证 / クリティカルパス（出荷→配送→請求）を優先移行・検証

---

## 9. 成功标准 / 成功基準

迁移完成时必须满足以下全部条件：

移行完了時に以下の全条件を満たすこと：

| # | 标准 / 基準 | 验证方法 / 検証方法 |
|---|---|---|
| 1 | **全部 109 个 LOGIFAST 画面功能正常 / 全 109 LOGIFAST 画面が正常動作** | E2E 测试覆盖 + 手动验证清单 / E2E テストカバレッジ + 手動検証チェックリスト |
| 2 | **现有测试全部通过（适配后）/ 既存テスト全パス（適応後）** | `vitest run` 1778+ 测试通过 / `vitest run` 1778+ テストパス |
| 3 | **B2 Cloud validate → export → PDF 完整流程 / B2 Cloud validate → export → PDF フルフロー** | 端到端测试：创建出库→验证→导出→PDF 生成 / E2E テスト：出荷作成→バリデーション→エクスポート→PDF 生成 |
| 4 | **零数据丢失 / ゼロデータロス** | MongoDB 全集合行数 = PostgreSQL 对应表行数 + 外键完整性检查 / MongoDB 全コレクション行数 = PostgreSQL 対応テーブル行数 + 外部キー整合性チェック |
| 5 | **性能同等或更优 / パフォーマンス同等以上** | API 响应 p95 < 200ms、DB 查询 < 50ms（负载测试验证）/ API レスポンス p95 < 200ms、DB クエリ < 50ms（負荷テスト検証） |
| 6 | **多租户隔离验证 / マルチテナント分離検証** | 租户 A 的请求无法访问租户 B 的数据（安全测试）/ テナント A のリクエストでテナント B のデータにアクセス不可（セキュリティテスト） |
| 7 | **测试覆盖率 80%+ / テストカバレッジ 80%+** | `vitest --coverage` 报告 / `vitest --coverage` レポート |
| 8 | **CI/CD 绿色通过 / CI/CD グリーンパス** | GitHub Actions 全 pipeline 通过 / GitHub Actions 全パイプラインパス |

---

## 附录 A: 术语对照 / 付録 A: 用語対照

| 中文 | 日本語 | English |
|---|---|---|
| 仓库管理系统 | 倉庫管理システム | Warehouse Management System (WMS) |
| 第三方物流 | サードパーティ・ロジスティクス | Third-Party Logistics (3PL) |
| 入库 | 入庫 | Inbound |
| 出库 | 出荷 | Outbound / Shipment |
| 库存 | 在庫 | Inventory / Stock |
| 盘点 | 棚卸 | Stocktaking |
| 拣货 | ピッキング | Picking |
| 打包 | パッキング | Packing |
| 计费 | 請求 | Billing |
| 租户 | テナント | Tenant |
| 行级安全 | 行レベルセキュリティ | Row Level Security (RLS) |
