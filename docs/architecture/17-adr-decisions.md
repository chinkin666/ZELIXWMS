# ZELIXWMS Architecture Decision Records (ADR)
# ZELIXWMS 架构决策记录 / アーキテクチャ決定記録

> 本文档记录了 ZELIXWMS 从 Express.js + MongoDB 迁移到 NestJS + PostgreSQL (Supabase) 过程中的所有重大架构决策。
> 本ドキュメントは ZELIXWMS の Express.js + MongoDB から NestJS + PostgreSQL (Supabase) への移行における全ての重要なアーキテクチャ決定を記録する。
>
> 创建日期 / 作成日: 2026-03-21
> 最后更新 / 最終更新: 2026-03-21
> 状态 / ステータス: 确定 / 確定

---

## 目录 / 目次

| ADR | 标题 / タイトル | 状态 / ステータス |
|-----|----------------|------------------|
| [ADR-001](#adr-001-postgresql-over-mongodb) | PostgreSQL over MongoDB | Accepted |
| [ADR-002](#adr-002-nestjs-over-express) | NestJS over Express | Accepted |
| [ADR-003](#adr-003-drizzle-over-prismatypeorm) | Drizzle over Prisma/TypeORM | Accepted |
| [ADR-004](#adr-004-supabase-auth-over-custom-jwt) | Supabase Auth over Custom JWT | Accepted |
| [ADR-005](#adr-005-shared-db--rls-over-schema-per-tenant) | Shared DB + RLS over Schema-per-Tenant | Accepted |
| [ADR-006](#adr-006-bullmq-retained-over-alternatives) | BullMQ Retained over Alternatives | Accepted |
| [ADR-007](#adr-007-modular-monolith-over-microservices) | Modular Monolith over Microservices | Accepted |
| [ADR-008](#adr-008-vue-3-frontend-unchanged) | Vue 3 Frontend Unchanged | Accepted |
| [ADR-009](#adr-009-graphql-removal) | GraphQL Removal | Accepted |
| [ADR-010](#adr-010-pino-over-winston-for-logging) | Pino over Winston for Logging | Accepted |
| [ADR-011](#adr-011-vitest-over-jest-for-testing) | Vitest over Jest for Testing | Accepted |
| [ADR-012](#adr-012-fastify-adapter-over-express-adapter-in-nestjs) | Fastify Adapter over Express Adapter | Accepted |
| [ADR-013](#adr-013-uuid-v5-over-auto-increment-ids) | UUID v5 over Auto-Increment IDs | Accepted |
| [ADR-014](#adr-014-soft-delete-with-deleted_at-over-hard-delete) | Soft Delete over Hard Delete | Accepted |
| [ADR-015](#adr-015-b2-cloud-service-wrapper-change-forbidden) | B2 Cloud Service Wrapper (Change-Forbidden) | Accepted |
| [ADR-016](#adr-016-bilingual-cnjp-code-comments) | Bilingual CN+JP Code Comments | Accepted |
| [ADR-017](#adr-017-supabase-storage-over-s3-direct) | Supabase Storage over S3 Direct | Accepted |
| [ADR-018](#adr-018-opentelemetry-for-distributed-tracing) | OpenTelemetry for Distributed Tracing | Accepted |

---

## ADR-001: PostgreSQL over MongoDB

### 状态 / ステータス
**Accepted**

### 日期 / 日付
2026-03-21

### 背景 / コンテキスト

ZELIXWMS 是面向日本 3PL 行业的仓库管理系统，覆盖 109 个业务画面，涵盖入库、出库、库存、计费、配送对接等核心功能。
现有系统基于 MongoDB 7.x + Mongoose 8.x，在以下场景中遇到了严重的技术瓶颈：

ZELIXWMS は日本の 3PL 業界向け倉庫管理システムであり、109 業務画面をカバーし、入庫・出荷・在庫・請求・配送連携等のコア機能を含む。
既存システムは MongoDB 7.x + Mongoose 8.x ベースで、以下のシーンで深刻な技術的ボトルネックに直面していた：

1. **库存操作需要 ACID 事务 / 在庫操作に ACID トランザクションが必要**:
   出库预留（reservation）→ 拣货 → 库存扣减是原子操作，MongoDB 的多文档事务性能差且使用复杂。
   出荷引当 → ピッキング → 在庫引落はアトミック操作であり、MongoDB のマルチドキュメントトランザクションは性能が悪く使用が複雑。

2. **计费需要精确的关系查询 / 請求に正確なリレーショナルクエリが必要**:
   计费记录关联出库单、客户、费率表，需要多表 JOIN 和聚合。MongoDB 的 `$lookup` 在多层嵌套场景下性能退化严重。
   請求レコードは出荷指示・顧客・料金表に関連し、複数テーブルの JOIN と集計が必要。MongoDB の `$lookup` は多段ネストで性能劣化が激しい。

3. **多租户隔离缺乏数据库层保障 / マルチテナント分離にDB層の保証がない**:
   MongoDB 无原生行级安全（RLS），全靠应用层过滤 `tenant_id`，存在数据泄露风险。
   MongoDB にネイティブ行レベルセキュリティ（RLS）がなく、アプリ層での `tenant_id` フィルタリングのみで、データ漏洩リスクがある。

4. **78 个 Mongoose 模型中大量嵌入文档导致数据冗余 / 78 Mongoose モデルの大量の埋め込みドキュメントによるデータ冗長**:
   同一地址数据在 shipmentOrders、clients、customers 中重复存储，更新时容易不一致。
   同じ住所データが shipmentOrders・clients・customers に重複保存され、更新時に不整合が発生しやすい。

### 选项评估 / オプション評価

| 选项 / オプション | 优势 / 利点 | 劣势 / 欠点 |
|---|---|---|
| **MongoDB + Replica Set（维持现状）** | 无需迁移成本；团队已熟悉 / 移行コスト不要；チーム既に熟知 | 多文档事务性能差；无 RLS；$lookup 性能问题；嵌入文档导致数据冗余 / マルチドキュメントトランザクション性能悪；RLS なし；$lookup 性能問題；埋め込みによるデータ冗長 |
| **PostgreSQL (Supabase)** | ACID 事务原生支持；RLS 行级安全；外键约束保证数据完整性；成熟生态（pg_trgm, GIN, JSONB）；Supabase 提供托管 Auth/Storage/Realtime / ACID トランザクション ネイティブ；RLS 行レベルセキュリティ；FK 制約でデータ整合性保証；成熟エコシステム；Supabase マネージド Auth/Storage/Realtime | 需要迁移 78 个模型；学习曲线；数据迁移需要 ETL / 78 モデルの移行が必要；学習曲線；ETL によるデータ移行が必要 |
| **CockroachDB** | 分布式 ACID；水平扩展 / 分散 ACID；水平スケーリング | 成本高；运维复杂度高；Supabase 不支持；无 RLS 集成 / コスト高；運用複雑；Supabase 非対応；RLS 統合なし |

### 决策 / 決定

**采用 PostgreSQL 16 (Supabase 托管) / PostgreSQL 16（Supabase マネージド）を採用**

### 理由 / 理由

- WMS 数据天然具有关系型特征：库存移动、出库、计费需要事务完整性
  WMS データは本質的にリレーショナル：在庫移動・出荷・請求にトランザクション整合性が必要
- PostgreSQL RLS 与 Supabase Auth JWT 深度集成，实现数据库层面的多租户隔离
  PostgreSQL RLS と Supabase Auth JWT の深い統合で、DB 層のマルチテナント分離を実現
- 外键约束从数据库层面保证引用完整性，消除 MongoDB 时代的悬空引用问题
  FK 制約が DB 層で参照整合性を保証し、MongoDB 時代の孤立参照問題を解消
- JSONB 类型兼容 MongoDB 的灵活文档场景（自定义字段、扩展属性）
  JSONB 型が MongoDB の柔軟なドキュメントシーン（カスタムフィールド・拡張属性）と互換
- 78 个 Mongoose 模型整理为 65+ 正规化 PostgreSQL 表，消除数据冗余
  78 Mongoose モデルを 65+ 正規化 PostgreSQL テーブルに整理し、データ冗長を解消
- Supabase 提供 Auth、Storage、Realtime 开箱即用，减少自建基础设施
  Supabase が Auth・Storage・Realtime を提供し、自前インフラ構築を削減

### 影响 / 影響

**正面 / ポジティブ:**
- 库存操作的事务安全性从应用层保证升级为数据库层保证
  在庫操作のトランザクション安全性がアプリ層からDB層保証へ昇格
- 计费的多表 JOIN 查询性能大幅提升（无需 $lookup）
  請求の複数テーブル JOIN クエリ性能が大幅向上（$lookup 不要）
- RLS 策略在数据库层实现租户隔离，即使应用代码有 bug 也不会泄露数据
  RLS ポリシーが DB 層でテナント分離を実現、アプリコードにバグがあってもデータ漏洩を防止
- CHECK 约束在数据库层实施业务规则（status 枚举、quantity >= 0 等）
  CHECK 制約で DB 層にビジネスルールを実施（status 列挙、quantity >= 0 等）

**负面 / ネガティブ:**
- 需要编写完整的 ETL 数据迁移脚本（ObjectId → UUID v5 转换）
  完全な ETL データ移行スクリプトの作成が必要（ObjectId → UUID v5 変換）
- 嵌入文档需要正规化为关联表（如 shipment_order_products、inbound_order_lines）
  埋め込みドキュメントの関連テーブルへの正規化が必要
- 团队需要学习 PostgreSQL 的索引策略（GIN、部分索引、pg_trgm）
  チームの PostgreSQL インデックス戦略の学習が必要

---

## ADR-002: NestJS over Express

### 状态 / ステータス
**Accepted**

### 日期 / 日付
2026-03-21

### 背景 / コンテキスト

现有 Express.js 4.x 后端包含 492 个 API 端点、70 个路由文件、88 个控制器、34 个服务，
代码组织缺乏统一规范，DI 手动管理，中间件链路不清晰，难以维护和测试。

既存 Express.js 4.x バックエンドは 492 API エンドポイント・70 ルートファイル・88 コントローラ・34 サービスを含み、
コード組織に統一規範がなく、DI は手動管理、ミドルウェアチェーンが不明確で、保守とテストが困難。

### 选项评估 / オプション評価

| 选项 / オプション | 优势 / 利点 | 劣势 / 欠点 |
|---|---|---|
| **Express.js 重构** | 无需学习新框架；可渐进式改善 / 新フレームワーク学習不要；漸進的改善可能 | 仍缺乏 DI 规范；模块化需要手动实现；492 端点的组织问题无法根本解决 / DI 規範なし；モジュール化は手動実装必要；492 端点の組織問題は根本解決不可 |
| **NestJS + Fastify adapter** | 企业级 DI 容器；模块系统天然组织 492 端点；装饰器驱动的 Guards/Interceptors/Pipes；@nestjs/swagger 自动生成 OpenAPI；@nestjs/bullmq 原生集成 / エンタープライズ DI コンテナ；モジュールシステムで 492 端点を自然に組織；デコレータ駆動の Guards/Interceptors/Pipes；@nestjs/swagger 自動 OpenAPI 生成；@nestjs/bullmq ネイティブ統合 | 学习曲线（装饰器、DI、模块）；迁移工作量大 / 学習曲線（デコレータ・DI・モジュール）；移行作業量大 |
| **Fastify standalone** | 高性能；TypeScript 友好 / 高性能；TypeScript フレンドリー | 无内置 DI；模块化需要自建；生态不如 NestJS 丰富 / 組み込み DI なし；モジュール化は自前構築必要；エコシステムが NestJS より小さい |

### 决策 / 決定

**采用 NestJS 11 + Fastify adapter / NestJS 11 + Fastify アダプタを採用**

### 理由 / 理由

- NestJS 的模块系统天然适合组织 492 个端点为 16 个业务模块
  NestJS のモジュールシステムが 492 端点を 16 業務モジュールに自然に組織
- DI 容器确保 Service → Repository → Database 的依赖链清晰可测
  DI コンテナが Service → Repository → Database の依存チェーンを明確かつテスト可能に
- 装饰器驱动的 AuthGuard / TenantGuard / RolesGuard 替代手写中间件链
  デコレータ駆動の AuthGuard / TenantGuard / RolesGuard が手書きミドルウェアチェーンを代替
- @nestjs/swagger 从装饰器自动生成 OpenAPI 文档
  @nestjs/swagger がデコレータから自動的に OpenAPI ドキュメントを生成
- Fastify adapter 提供 2-3x Express 性能提升
  Fastify アダプタが Express の 2-3 倍の性能向上を提供

### 影响 / 影響

**正面 / ポジティブ:**
- 16 个 NestJS Module 各自独立封装 Controller/Service/Repository/DTO
  16 NestJS Module が各自 Controller/Service/Repository/DTO を独立カプセル化
- 新人可以快速理解模块边界和依赖关系
  新メンバーがモジュール境界と依存関係を素早く理解可能
- 测试时可以通过 DI 轻松 mock 依赖
  テスト時に DI で依存を容易にモック可能

**负面 / ネガティブ:**
- 迁移 492 个端点预估需要 340 小时（11 周）
  492 端点の移行は推定 340 時間（11 週間）必要
- 装饰器语法需要团队适应期
  デコレータ構文にチーム適応期間が必要

---

## ADR-003: Drizzle over Prisma/TypeORM

### 状态 / ステータス
**Accepted**

### 日期 / 日付
2026-03-21

### 背景 / コンテキスト

迁移到 PostgreSQL 后需要选择 TypeScript ORM。现有系统使用 Mongoose 8.x，
需要一个兼具类型安全和性能的 ORM 来管理 65+ 个 PostgreSQL 表。

PostgreSQL 移行後に TypeScript ORM の選定が必要。既存システムは Mongoose 8.x を使用しており、
65+ PostgreSQL テーブルを管理する型安全かつ高性能な ORM が必要。

### 选项评估 / オプション評価

| 选项 / オプション | 优势 / 利点 | 劣势 / 欠点 |
|---|---|---|
| **Prisma** | 人气高；schema-first 直观；自动生成类型 / 人気高；schema-first 直感的；型自動生成 | 运行时引擎 4MB+；migration lock 问题；JSONB 操作受限；生成代码体积大 / ランタイムエンジン 4MB+；migration ロック問題；JSONB 操作制限；生成コード体積大 |
| **TypeORM** | 功能丰富；Active Record + Data Mapper / 機能豊富；Active Record + Data Mapper | 类型安全差（运行时才发现类型错误）；维护不活跃；decorator 方式与 NestJS 耦合过深 / 型安全性低（ランタイムで型エラー発見）；メンテ不活発；デコレータ方式が NestJS と過度に結合 |
| **Drizzle ORM** | SQL-like API，编写即 SQL，无抽象层；编译时类型安全；轻量零运行时开销；迁移工具内置 / SQL-like API、書いた通りの SQL、抽象層なし；コンパイル時型安全；軽量ゼロランタイムオーバーヘッド；マイグレーションツール内蔵 | 社区较新（2023 年发布）；文档不如 Prisma 详尽 / コミュニティが比較的新しい（2023 年リリース）；ドキュメントが Prisma ほど詳細でない |
| **Knex.js** | 成熟稳定；灵活的 query builder / 成熟安定；柔軟なクエリビルダ | 无模式定义；类型安全需要手动维护；不算 ORM / スキーマ定義なし；型安全は手動維持；ORM ではない |

### 决策 / 決定

**采用 Drizzle ORM / Drizzle ORM を採用**

### 理由 / 理由

- SQL-like API 让 WMS 中复杂的库存查询和计费聚合更直观
  SQL-like API により WMS の複雑な在庫クエリと請求集計がより直感的
- 编译时类型安全：schema 定义即 TypeScript 类型，修改字段时编译器立即报错
  コンパイル時型安全：スキーマ定義が TypeScript 型、フィールド修正時にコンパイラが即座にエラー報告
- 零运行时开销：不生成额外代码，不需要引擎进程
  ゼロランタイムオーバーヘッド：追加コード生成なし、エンジンプロセス不要
- `drizzle-kit` 提供 push/pull/generate 迁移工具
  `drizzle-kit` が push/pull/generate マイグレーションツールを提供
- 对 PostgreSQL 特性（JSONB、GIN index、pg_trgm、RLS）的支持优于 Prisma
  PostgreSQL 機能（JSONB・GIN index・pg_trgm・RLS）のサポートが Prisma より優秀

### 影响 / 影響

**正面 / ポジティブ:**
- 65+ 表的 schema 定义即 TypeScript 代码，IDE 自动补全完备
  65+ テーブルのスキーマ定義が TypeScript コード、IDE 自動補完完備
- 复杂查询可以直接用类 SQL 语法，无需学习特殊 API
  複雑クエリを SQL-like 構文で直接記述可能、特殊 API の学習不要
- 无 Prisma 的 migration lock 问题，多开发者并行无冲突
  Prisma の migration ロック問題なし、複数開発者が並行して衝突なし

**负面 / ネガティブ:**
- 团队需要适应 Drizzle 的 API（相比 Mongoose 变化较大）
  チームが Drizzle API への適応が必要（Mongoose からの変化が大きい）
- 错误信息有时不如 Prisma 友好
  エラーメッセージが Prisma ほどフレンドリーでない場合がある

---

## ADR-004: Supabase Auth over Custom JWT

### 状态 / ステータス
**Accepted**

### 日期 / 日付
2026-03-21

### 背景 / コンテキスト

现有系统使用 `jsonwebtoken` 手写 JWT 认证，包括 token 签发、刷新、黑名单管理。
迁移后需要与 PostgreSQL RLS 集成的认证方案，同时支持多租户的 `tenant_id` claim。

既存システムは `jsonwebtoken` による手書き JWT 認証を使用（トークン発行・リフレッシュ・ブラックリスト管理含む）。
移行後は PostgreSQL RLS と統合する認証方式が必要で、マルチテナントの `tenant_id` claim のサポートも必要。

### 选项评估 / オプション評価

| 选项 / オプション | 优势 / 利点 | 劣势 / 欠点 |
|---|---|---|
| **Custom JWT（维持现状）** | 完全控制；无第三方依赖 / 完全制御；サードパーティ依存なし | 需要自维护 refresh token、密钥轮换、session 管理；无法与 RLS 原生集成 / refresh token・鍵ローテーション・セッション管理の自前保守が必要；RLS とネイティブ統合不可 |
| **Auth0** | 成熟的企业方案；丰富的 OAuth provider / 成熟なエンタープライズソリューション；豊富な OAuth プロバイダ | 月费高（1000+ 用户时）；与 Supabase RLS 需要额外桥接 / 月額高（1000+ ユーザー時）；Supabase RLS との追加ブリッジが必要 |
| **Clerk** | 现代 UI；React 友好 / モダン UI；React フレンドリー | Vue 3 支持有限；与 PostgreSQL RLS 无原生集成 / Vue 3 サポート限定的；PostgreSQL RLS とのネイティブ統合なし |
| **Supabase Auth** | 与 RLS 深度集成（JWT claim 即 RLS 上下文）；RS256 签名；托管 refresh token；内置 OAuth provider；免费额度充足 / RLS と深い統合（JWT claim が RLS コンテキスト）；RS256 署名；マネージド refresh token；組み込み OAuth プロバイダ；無料枠十分 | 绑定 Supabase 平台；自定义认证流程受限 / Supabase プラットフォームにバインド；カスタム認証フロー制限あり |

### 决策 / 決定

**采用 Supabase Auth (RS256 JWT) / Supabase Auth（RS256 JWT）を採用**

### 理由 / 理由

- Supabase Auth 的 JWT 中可以携带自定义 `tenant_id` claim，RLS 策略直接读取
  Supabase Auth の JWT にカスタム `tenant_id` claim を含め、RLS ポリシーが直接読み取り
- RS256 非对称签名：后端只需公钥验证，无需共享密钥
  RS256 非対称署名：バックエンドは公開鍵検証のみ、共有秘密鍵不要
- Refresh token 由 Supabase 托管，无需自建存储和轮换逻辑
  Refresh token は Supabase マネージドで、自前のストレージとローテーションロジック不要
- 内置 Google / GitHub / LINE 等 OAuth provider，零配置集成
  Google / GitHub / LINE 等 OAuth プロバイダ内蔵、ゼロ設定で統合

### 影响 / 影響

**正面 / ポジティブ:**
- 认证代码从数百行减少到 AuthGuard + Supabase SDK 调用
  認証コードが数百行から AuthGuard + Supabase SDK 呼び出しに削減
- RLS 策略 `auth.jwt() ->> 'tenant_id'` 直接实现数据库层租户隔离
  RLS ポリシー `auth.jwt() ->> 'tenant_id'` で DB 層テナント分離を直接実現
- 密码哈希、token 刷新、session 管理全部由 Supabase 处理
  パスワードハッシュ・トークンリフレッシュ・セッション管理を全て Supabase が処理

**负面 / ネガティブ:**
- 平台锁定：从 Supabase 迁走需要重建认证层
  プラットフォームロックイン：Supabase からの移行時に認証層の再構築が必要
- 自定义认证流程（如复杂的审批注册）需要 Edge Function 或外部逻辑
  カスタム認証フロー（複雑な承認登録等）に Edge Function または外部ロジックが必要

---

## ADR-005: Shared DB + RLS over Schema-per-Tenant

### 状态 / ステータス
**Accepted**

### 日期 / 日付
2026-03-21

### 背景 / コンテキスト

ZELIXWMS 需要多租户 SaaS 架构支持多个 3PL 客户使用同一系统。
需要在安全隔离和运维成本之间取得平衡。

ZELIXWMS は複数の 3PL 顧客が同一システムを利用するマルチテナント SaaS アーキテクチャが必要。
セキュリティ分離と運用コストのバランスを取る必要がある。

### 选项评估 / オプション評価

| 选项 / オプション | 优势 / 利点 | 劣势 / 欠点 |
|---|---|---|
| **Schema-per-Tenant** | 物理隔离强；迁移互不影响 / 物理分離が強い；マイグレーション相互非影響 | 租户增加时 schema 数爆炸；连接池管理复杂；Supabase 不支持动态 schema / テナント増加時に schema 数が爆発；接続プール管理が複雑；Supabase が動的 schema 非対応 |
| **Database-per-Tenant** | 完全隔离；可独立备份恢复 / 完全分離；独立バックアップ・リストア可能 | 成本极高（每租户一个 DB 实例）；运维复杂度指数级增长 / コスト極めて高（テナントごとに DB インスタンス）；運用複雑度が指数的に増大 |
| **Shared DB + RLS** | 成本低（单一数据库）；迁移统一管理；Supabase 原生支持 RLS + JWT claim / コスト低（単一DB）；マイグレーション統一管理；Supabase ネイティブ RLS + JWT claim 対応 | 应用层必须正确注入 tenant_id；RLS 策略需要仔细设计和测试 / アプリ層で正確に tenant_id を注入する必要あり；RLS ポリシーの慎重な設計とテストが必要 |

### 决策 / 決定

**采用 Shared DB + RLS（共享数据库 + 行级安全策略）/ Shared DB + RLS（共有DB + 行レベルセキュリティポリシー）を採用**

### 理由 / 理由

- 全表包含 `tenant_id` 列，PostgreSQL RLS 策略强制行级别隔离
  全テーブルに `tenant_id` カラム、PostgreSQL RLS ポリシーが行レベル分離を強制
- 应用层 BaseRepository 自动注入 `tenant_id` 过滤，双重保障
  アプリ層 BaseRepository が `tenant_id` フィルタを自動注入、二重保障
- 单一数据库降低运维成本和迁移复杂度
  単一 DB が運用コストとマイグレーション複雑度を削減
- Supabase 原生支持 RLS + JWT claim 集成
  Supabase が RLS + JWT claim 統合をネイティブサポート

### 影响 / 影響

**正面 / ポジティブ:**
- 65+ 表统一管理，schema 变更一次迁移全部生效
  65+ テーブルの統一管理、スキーマ変更は一度のマイグレーションで全て反映
- 即使应用代码存在 bug（忘记过滤 tenant_id），RLS 仍然阻止跨租户数据访问
  アプリコードにバグがあっても（tenant_id フィルタ忘れ）、RLS が跨テナントデータアクセスを阻止
- 新增租户只需 INSERT tenants 表一条记录
  新規テナント追加は tenants テーブルに 1 レコード INSERT するだけ

**负面 / ネガティブ:**
- 大租户的数据量可能影响小租户的查询性能（需要索引优化）
  大テナントのデータ量が小テナントのクエリ性能に影響する可能性（インデックス最適化が必要）
- RLS 策略的测试需要额外的集成测试覆盖
  RLS ポリシーのテストに追加の統合テストカバレッジが必要

---

## ADR-006: BullMQ Retained over Alternatives

### 状态 / ステータス
**Accepted**

### 日期 / 日付
2026-03-21

### 背景 / コンテキスト

现有系统已使用 BullMQ + Redis 实现 7 个后台任务队列（CSV 导入、报表生成、邮件发送、库存调整等）。
迁移需要决定是否更换队列系统。

既存システムは BullMQ + Redis で 7 つのバックグラウンドタスクキュー（CSV インポート・レポート生成・メール送信・在庫調整等）を実装済み。
移行時にキューシステムの変更要否を決定する必要がある。

### 选项评估 / オプション評価

| 选项 / オプション | 优势 / 利点 | 劣势 / 欠点 |
|---|---|---|
| **BullMQ（维持）** | 已有生产验证；团队熟悉；@nestjs/bullmq 原生集成；功能完备（延迟、重试、优先级、并发控制）/ 本番実績あり；チーム熟知；@nestjs/bullmq ネイティブ統合；機能完備（遅延・リトライ・優先度・並行制御） | 依赖 Redis / Redis 依存 |
| **Agenda** | MongoDB 后端（但我们正在离开 MongoDB）/ MongoDB バックエンド（しかし MongoDB から移行中） | 不适合当前迁移方向 / 現在の移行方向に不適 |
| **pg-boss** | PostgreSQL 后端，无需 Redis / PostgreSQL バックエンド、Redis 不要 | 功能不如 BullMQ 丰富；社区较小；无 NestJS 官方集成 / 機能が BullMQ より少ない；コミュニティが小さい；NestJS 公式統合なし |
| **AWS SQS** | 全托管；高可用 / フルマネージド；高可用性 | 增加 AWS 依赖；延迟较高；本地开发困难 / AWS 依存追加；レイテンシ高；ローカル開発困難 |

### 决策 / 決定

**维持 BullMQ，通过 @nestjs/bullmq 集成 / BullMQ を維持、@nestjs/bullmq で統合**

### 理由 / 理由

- 已在生产环境验证稳定，无需承担更换风险
  本番環境で安定性検証済み、変更リスクを負う必要なし
- @nestjs/bullmq 提供开箱即用的 Module/Processor/Queue 装饰器
  @nestjs/bullmq が Module/Processor/Queue デコレータを提供
- Redis 已作为缓存层存在，不增加额外基础设施
  Redis がキャッシュ層として既に存在、追加インフラ不要

### 影响 / 影響

**正面 / ポジティブ:**
- 零迁移成本：队列逻辑仅需包装为 NestJS Processor 类
  ゼロ移行コスト：キューロジックは NestJS Processor クラスへのラップのみ
- 保持现有 7 个队列的功能一致性
  既存 7 キューの機能一貫性を維持

**负面 / ネガティブ:**
- 继续依赖 Redis 作为必要组件
  Redis を必須コンポーネントとして依存継続

---

## ADR-007: Modular Monolith over Microservices

### 状态 / ステータス
**Accepted**

### 日期 / 日付
2026-03-21

### 背景 / コンテキスト

ZELIXWMS 服务 3PL 行业，日处理量 10K-100K 出库单。
需要决定是采用微服务架构还是单体架构。

ZELIXWMS は 3PL 業界にサービスを提供し、日処理量は 10K-100K 出荷指示。
マイクロサービスアーキテクチャかモノリスアーキテクチャかを決定する必要がある。

### 选项评估 / オプション評価

| 选项 / オプション | 优势 / 利点 | 劣势 / 欠点 |
|---|---|---|
| **微服务 / マイクロサービス** | 独立部署；独立扩展；技术异构 / 独立デプロイ；独立スケーリング；技術異種混合 | 分布式事务复杂（出库 = 预留 + 拣货 + 库存扣减跨多服务）；运维成本高；网络延迟；当前团队规模不支持 / 分散トランザクション複雑（出荷 = 引当 + ピック + 在庫引落が複数サービスにまたがる）；運用コスト高；ネットワークレイテンシ；現在のチーム規模で対応不可 |
| **Modular Monolith（模块化单体）** | NestJS Module 天然支持；事务简单（同一 DB）；部署简单；日后可拆分 / NestJS Module がネイティブサポート；トランザクション単純（同一 DB）；デプロイ単純；将来分割可能 | 单点扩展限制；模块间耦合需要纪律维护 / 単一ポイントスケーリング制限；モジュール間結合に規律維持が必要 |

### 决策 / 決定

**采用 Modular Monolith（NestJS Module 为单位）/ Modular Monolith（NestJS Module 単位）を採用**

### 理由 / 理由

- 出库工作流（预留 → 拣货 → 打包 → 出库 → 库存扣减 → 计费）需要单一事务
  出荷ワークフロー（引当 → ピック → パック → 出荷 → 在庫引落 → 請求）に単一トランザクションが必要
- 16 个 NestJS Module 通过 DI 实现松耦合，但共享同一 PostgreSQL 实例
  16 NestJS Module が DI で疎結合を実現しつつ、同一 PostgreSQL インスタンスを共有
- 当前处理量（10K-100K 单/天）远未达到需要微服务的规模
  現在の処理量（10K-100K 件/日）はマイクロサービスが必要な規模に遠く及ばない
- 未来如果某模块成为瓶颈，可以独立抽出为微服务
  将来特定モジュールがボトルネックになった場合、独立マイクロサービスとして抽出可能

### 影响 / 影響

**正面 / ポジティブ:**
- 部署简单：单一 Docker 镜像 + PostgreSQL + Redis
  デプロイ単純：単一 Docker イメージ + PostgreSQL + Redis
- 开发效率高：同一代码库，IDE 全局搜索和重构
  開発効率高：同一コードベース、IDE 全文検索とリファクタリング
- 事务管理简单：Drizzle `db.transaction()` 即可
  トランザクション管理単純：Drizzle `db.transaction()` のみ

**负面 / ネガティブ:**
- 峰值时只能垂直扩展或增加实例（水平扩展能力有限）
  ピーク時に垂直スケーリングまたはインスタンス追加のみ（水平スケーリング能力限定）
- 需要在代码层面维护模块间的边界纪律
  コード層でモジュール間の境界規律を維持する必要あり

### 扩展路径 / スケーリングパス

| 规模 / 規模 | 架构 / アーキテクチャ |
|---|---|
| 10K 单/天 | 当前 Modular Monolith 足够 / 現在の Modular Monolith で十分 |
| 100K 单/天 | 增加只读副本 + Redis 集群 + CDN / リードレプリカ追加 + Redis クラスタ + CDN |
| 1M 单/天 | 抽出高负载模块（出库、库存）为独立服务 / 高負荷モジュール（出荷・在庫）を独立サービスとして抽出 |

---

## ADR-008: Vue 3 Frontend Unchanged

### 状态 / ステータス
**Accepted**

### 日期 / 日付
2026-03-21

### 背景 / コンテキスト

前端由 3 个 Vue 3 应用组成：主应用（247 组件）、管理后台（9 组件）、客户门户（12 组件），
总计 268 个组件覆盖 109 个业务画面，已经过充分测试（324 前端测试）。

フロントエンドは 3 つの Vue 3 アプリで構成：メインアプリ（247 コンポーネント）、管理画面（9 コンポーネント）、クライアントポータル（12 コンポーネント）、
合計 268 コンポーネントで 109 業務画面をカバーし、十分にテスト済み（324 フロントエンドテスト）。

### 决策 / 決定

**前端不做任何功能变更，仅修改 API base URL / フロントエンドは機能変更なし、API ベース URL のみ変更**

### 理由 / 理由

- 268 个组件运行稳定，重写风险远大于收益
  268 コンポーネントが安定稼働中、書き直しのリスクはメリットを大きく上回る
- API 路径结构在迁移后保持不变（见 `04-api-mapping.md`），前端无需感知后端变化
  API パス構造は移行後も維持（`04-api-mapping.md` 参照）、フロントエンドはバックエンド変更を意識する必要なし
- TransformInterceptor 自动添加 `_id` 别名，兼容前端现有的 ObjectId 引用
  TransformInterceptor が `_id` エイリアスを自動付与、フロントエンドの既存 ObjectId 参照と互換
- 迁移总工期 11 周，不应在前端上增加不必要的工作量
  移行総工期 11 週間、フロントエンドに不要な作業量を追加すべきでない

### 影响 / 影響

**正面 / ポジティブ:**
- 迁移范围最小化，降低风险
  移行範囲を最小化、リスク低減
- 前端开发者可以继续正常工作，不受迁移影响
  フロントエンド開発者が通常通り作業可能、移行の影響を受けない

**负面 / ネガティブ:**
- ID 格式从 24 位 hex 变为 36 位 UUID，前端需要通过 `_id` 别名兼容
  ID 格式が 24 桁 hex から 36 桁 UUID に変更、フロントエンドは `_id` エイリアスで互換
- 将来可能需要前端适配 UUID 格式（去除 `_id` 别名）
  将来フロントエンドの UUID 形式対応が必要になる可能性（`_id` エイリアス廃止）

---

## ADR-009: GraphQL Removal

### 状态 / ステータス
**Accepted**

### 日期 / 日付
2026-03-21

### 背景 / コンテキスト

现有系统包含 Apollo GraphQL 集成，但前端（Vue 3）全部通过 REST API 通信，
GraphQL 端点无任何消费者。

既存システムに Apollo GraphQL 統合が含まれているが、フロントエンド（Vue 3）は全て REST API で通信しており、
GraphQL エンドポイントに消費者がない。

### 决策 / 決定

**移除 Apollo GraphQL，迁移后仅保留 REST API / Apollo GraphQL を削除、移行後は REST API のみ維持**

### 理由 / 理由

- 无前端消费者：Vue 3 应用全部使用 axios 调用 REST 端点
  フロントエンド消費者なし：Vue 3 アプリは全て axios で REST エンドポイントを呼び出し
- 增加不必要的复杂度：schema 定义、resolver、Apollo 服务器配置
  不要な複雑度の追加：スキーマ定義・リゾルバ・Apollo サーバー設定
- @nestjs/swagger 已提供完善的 REST API 文档
  @nestjs/swagger が完全な REST API ドキュメントを提供済み
- 减少依赖包体积和安全攻击面
  依存パッケージ体積とセキュリティ攻撃面を削減

### 影响 / 影響

**正面 / ポジティブ:**
- 减少维护负担和包体积
  メンテナンス負担とパッケージ体積の削減
- API 层统一为 REST，降低认知负担
  API 層を REST に統一、認知負荷を低減

**负面 / ネガティブ:**
- 如果未来需要 GraphQL（如移动端 BFF），需要重新添加
  将来 GraphQL が必要になった場合（モバイル BFF 等）、再追加が必要

---

## ADR-010: Pino over Winston for Logging

### 状态 / ステータス
**Accepted**

### 日期 / 日付
2026-03-21

### 背景 / コンテキスト

现有系统使用 Pino 9.x 作为日志库。迁移到 NestJS 后需要决定是否继续使用。

既存システムは Pino 9.x をロギングライブラリとして使用中。NestJS 移行後に継続使用するか決定が必要。

### 选项评估 / オプション評価

| 选项 / オプション | 优势 / 利点 | 劣势 / 欠点 |
|---|---|---|
| **Pino** | 最快的 JSON 日志库（基准测试 5x Winston）；结构化输出；低 CPU 开销；nestjs-pino 集成完善 / 最速の JSON ロギングライブラリ（ベンチマーク 5x Winston）；構造化出力；低 CPU オーバーヘッド；nestjs-pino 統合完善 | 格式化输出不如 Winston 灵活 / フォーマット出力が Winston ほど柔軟でない |
| **Winston** | 灵活的 transport 系统；丰富的格式化选项 / 柔軟な transport システム；豊富なフォーマットオプション | 性能低于 Pino；内存占用高 / 性能が Pino 以下；メモリ使用量が多い |

### 决策 / 決定

**继续使用 Pino 9.x，通过 nestjs-pino 集成 / Pino 9.x を継続使用、nestjs-pino で統合**

### 理由 / 理由

- WMS 高吞吐场景（10K+ 单/天）对日志性能敏感
  WMS 高スループットシーン（10K+ 件/日）ではロギング性能に敏感
- JSON 结构化日志便于 ELK/Grafana Loki 等日志平台解析
  JSON 構造化ログが ELK/Grafana Loki 等のログプラットフォームでの解析に便利
- 零迁移成本：已有的日志格式和级别配置可以直接复用
  ゼロ移行コスト：既存のログ形式とレベル設定を直接再利用可能

### 影响 / 影響

**正面 / ポジティブ:**
- 请求日志对应用性能的影响可忽略不计（Pino 异步写入）
  リクエストログのアプリ性能への影響は無視可能（Pino 非同期書き込み）
- nestjs-pino 自动为每个请求注入 requestId 和 traceId
  nestjs-pino が各リクエストに requestId と traceId を自動注入

**负面 / ネガティブ:**
- 无 / なし（维持现状无风险）

---

## ADR-011: Vitest over Jest for Testing

### 状态 / ステータス
**Accepted**

### 日期 / 日付
2026-03-21

### 背景 / コンテキスト

现有系统使用 Vitest 4.x，已有 1778+ 测试用例（后端 1454 + 前端 324）。
迁移需要保持测试框架兼容性。

既存システムは Vitest 4.x を使用し、1778+ テストケース（バックエンド 1454 + フロントエンド 324）が存在。
移行時にテストフレームワークの互換性維持が必要。

### 选项评估 / オプション評価

| 选项 / オプション | 优势 / 利点 | 劣势 / 欠点 |
|---|---|---|
| **Vitest** | 原生 ESM 支持；极快的执行速度（Vite 构建）；与 Vue 3 前端共享同一测试框架；API 兼容 Jest / ネイティブ ESM サポート；極めて高速な実行速度（Vite ビルド）；Vue 3 フロントエンドと同一テストフレームワークを共有；Jest API 互換 | NestJS 官方文档默认使用 Jest / NestJS 公式ドキュメントのデフォルトが Jest |
| **Jest** | NestJS 官方推荐；社区资源丰富 / NestJS 公式推奨；コミュニティリソース豊富 | ESM 支持不完善；需要配置 transform；比 Vitest 慢 / ESM サポート不完全；transform 設定が必要；Vitest より遅い |

### 决策 / 決定

**继续使用 Vitest 4.x / Vitest 4.x を継続使用**

### 理由 / 理由

- 1778 个现有测试基于 Vitest，迁移到 Jest 无实际收益
  1778 既存テストが Vitest ベース、Jest への移行に実際のメリットなし
- 前后端使用同一测试框架，降低认知成本
  フロントエンドとバックエンドが同一テストフレームワーク、認知コスト低減
- Vitest 原生 ESM 支持避免了 Jest 的 transform 配置问题
  Vitest のネイティブ ESM サポートが Jest の transform 設定問題を回避

### 影响 / 影響

**正面 / ポジティブ:**
- 1778 个测试无需修改即可继续运行
  1778 テストが修正なしで継続実行可能
- 新的 NestJS 模块测试可以使用相同的 API 和配置
  新 NestJS モジュールテストが同じ API と設定を使用可能

**负面 / ネガティブ:**
- NestJS 社区的测试示例大多基于 Jest，需要自行适配
  NestJS コミュニティのテスト例の多くが Jest ベース、自前での適応が必要

---

## ADR-012: Fastify Adapter over Express Adapter in NestJS

### 状态 / ステータス
**Accepted**

### 日期 / 日付
2026-03-21

### 背景 / コンテキスト

NestJS 支持 Express 和 Fastify 两种 HTTP 平台适配器。
需要选择性能和功能平衡最优的方案。

NestJS は Express と Fastify の 2 つの HTTP プラットフォームアダプタをサポート。
性能と機能のバランスが最適な方案の選定が必要。

### 选项评估 / オプション評価

| 选项 / オプション | 优势 / 利点 | 劣势 / 欠点 |
|---|---|---|
| **Express adapter** | 生态最大；中间件兼容性最好；NestJS 默认 / エコシステム最大；ミドルウェア互換性最高；NestJS デフォルト |性能较低；TypeScript 支持较弱 / 性能が低い；TypeScript サポートが弱い |
| **Fastify adapter** | 2-3x Express 性能（基准测试）；内置 JSON schema 验证；更好的 TypeScript 支持；内置序列化 / 2-3x Express 性能（ベンチマーク）；組み込み JSON スキーマ検証；より良い TypeScript サポート；組み込みシリアライゼーション | Express 中间件不直接兼容（需要适配）；部分 NestJS 第三方包假设 Express / Express ミドルウェアが直接互換でない（アダプタが必要）；一部 NestJS サードパーティパッケージが Express を前提 |

### 决策 / 決定

**采用 Fastify adapter (@nestjs/platform-fastify) / Fastify アダプタ（@nestjs/platform-fastify）を採用**

### 理由 / 理由

- WMS 高吞吐场景（492 端点，批量操作频繁）需要最佳 HTTP 性能
  WMS 高スループットシーン（492 端点、バルク操作頻繁）に最高の HTTP 性能が必要
- 从零开始构建 NestJS 后端，无需考虑 Express 中间件兼容性
  NestJS バックエンドをゼロから構築、Express ミドルウェア互換性を考慮する必要なし
- Fastify 内置的 JSON schema 验证可以与 @nestjs/swagger 协同使用
  Fastify 組み込みの JSON スキーマ検証が @nestjs/swagger と連携可能

### 影响 / 影響

**正面 / ポジティブ:**
- API 响应时间降低 50-65%（基于基准测试数据）
  API レスポンスタイムが 50-65% 低減（ベンチマークデータに基づく）
- 内置序列化比 `class-transformer` 更快
  組み込みシリアライゼーションが `class-transformer` より高速

**负面 / ネガティブ:**
- 部分 Express 专属中间件（如 multer）需要使用 Fastify 替代方案
  一部 Express 専用ミドルウェア（multer 等）に Fastify 代替の使用が必要

---

## ADR-013: UUID v5 over Auto-Increment IDs

### 状态 / ステータス
**Accepted**

### 日期 / 日付
2026-03-21

### 背景 / コンテキスト

从 MongoDB ObjectId（24 位 hex）迁移到 PostgreSQL 需要确定主键策略。
需要保证迁移数据的 ID 稳定性（同一条记录迁移多次应产生相同 ID）。

MongoDB ObjectId（24 桁 hex）から PostgreSQL への移行時に主キー戦略の決定が必要。
移行データの ID 安定性を保証する必要がある（同一レコードを複数回移行しても同じ ID を生成）。

### 选项评估 / オプション評価

| 选项 / オプション | 优势 / 利点 | 劣势 / 欠点 |
|---|---|---|
| **Auto-increment** | 简单；顺序清晰 / シンプル；順序が明確 | 暴露业务量（ID 大小 = 记录数）；多表合并时冲突；分布式环境需要协调 / ビジネス量を暴露（ID サイズ = レコード数）；複数テーブル統合時に衝突；分散環境で協調が必要 |
| **UUID v4（随机）** | 全局唯一；无序列暴露 / グローバル一意；シーケンス非暴露 | 非确定性（同一记录多次生成不同 UUID）；索引性能略差 / 非決定性（同一レコードで毎回異なる UUID）；インデックス性能がやや劣る |
| **UUID v5（确定性）** | 确定性：namespace + collection + ObjectId → 唯一且可复现的 UUID；无冲突；不暴露顺序 / 決定性：namespace + collection + ObjectId → 一意かつ再現可能な UUID；衝突なし；順序非暴露 | 生成逻辑略复杂；需要维护 namespace 常量 / 生成ロジックがやや複雑；namespace 定数の維持が必要 |

### 决策 / 決定

**采用 UUID v5（基于 namespace + collection + ObjectId 生成）/ UUID v5（namespace + collection + ObjectId ベースで生成）を採用**

### 理由 / 理由

- 确定性：`objectIdToUuid('products', '69b6205e7ddcb7290ca9fd74')` 始终返回相同 UUID
  決定性：`objectIdToUuid('products', '69b6205e7ddcb7290ca9fd74')` が常に同じ UUID を返す
- ETL 可以多次运行而不产生重复数据（幂等性）
  ETL を複数回実行してもデータ重複なし（冪等性）
- 包含 collection 名可以防止不同表间的 ID 冲突
  collection 名を含むことで異なるテーブル間の ID 衝突を防止
- 新记录使用 `gen_random_uuid()`（UUID v4），仅迁移数据使用 UUID v5
  新規レコードは `gen_random_uuid()`（UUID v4）を使用、移行データのみ UUID v5

### 影响 / 影響

**正面 / ポジティブ:**
- ETL 迁移脚本可以安全地重复执行（UPSERT on conflict）
  ETL 移行スクリプトが安全に繰り返し実行可能（UPSERT on conflict）
- 外键引用的 ObjectId 可以确定性地转换，不需要查找表
  外部キー参照の ObjectId が決定的に変換可能、ルックアップテーブル不要
- 前端通过 `_id` 别名兼容，无需修改
  フロントエンドは `_id` エイリアスで互換、修正不要

**负面 / ネガティブ:**
- UUID 比 auto-increment 占用更多存储空间（16 bytes vs 4/8 bytes）
  UUID が auto-increment より多くのストレージを占有（16 bytes vs 4/8 bytes）
- UUID v5 依赖 `uuid` 库的 v5 函数
  UUID v5 が `uuid` ライブラリの v5 関数に依存

---

## ADR-014: Soft Delete with deleted_at over Hard Delete

### 状态 / ステータス
**Accepted**

### 日期 / 日付
2026-03-21

### 背景 / コンテキスト

WMS 系统中数据有法规保存要求（出库记录、计费记录需要保存特定年限），
同时需要支持误删恢复和审计追踪。

WMS システムのデータには法令保存要件があり（出荷記録・請求記録は特定年限の保存が必要）、
同時に誤削除リカバリと監査追跡のサポートが必要。

### 选项评估 / オプション評価

| 选项 / オプション | 优势 / 利点 | 劣势 / 欠点 |
|---|---|---|
| **Hard Delete** | 简单直接；不浪费存储 / シンプル直接；ストレージ浪費なし | 数据不可恢复；外键引用可能悬空；无审计追踪 / データ復元不可；外部キー参照が孤立する可能性；監査追跡なし |
| **Soft Delete (deleted_at)** | 数据可恢复；审计追踪完整；外键引用不会断裂 / データ復元可能；監査追跡完全；外部キー参照が断裂しない | 查询需要过滤 deleted_at IS NULL；存储持续增长 / クエリで deleted_at IS NULL フィルタが必要；ストレージ継続増大 |

### 决策 / 決定

**采用 Soft Delete（deleted_at TIMESTAMPTZ 列）/ Soft Delete（deleted_at TIMESTAMPTZ カラム）を採用**

### 理由 / 理由

- WMS 业务要求数据可追溯：出库记录、计费记录不可物理删除
  WMS 業務でデータ追跡が必要：出荷記録・請求記録は物理削除不可
- 部分索引 `WHERE deleted_at IS NULL` 确保查询性能不受软删除影响
  部分インデックス `WHERE deleted_at IS NULL` でクエリ性能が論理削除の影響を受けない
- BaseRepository 自动添加 `deleted_at IS NULL` 过滤，开发者无需手动处理
  BaseRepository が `deleted_at IS NULL` フィルタを自動追加、開発者の手動処理不要

### 影响 / 影響

**正面 / ポジティブ:**
- 误删数据可以通过设置 `deleted_at = NULL` 恢复
  誤削除データを `deleted_at = NULL` 設定で復元可能
- 外键引用始终有效，不会产生 orphan record
  外部キー参照が常に有効、orphan record が発生しない
- 完整的审计追踪：何时删除、谁删除
  完全な監査追跡：いつ削除されたか、誰が削除したか

**负面 / ネガティブ:**
- 存储持续增长，需要定期归档策略（但日志表使用分区 + TTL 管理）
  ストレージ継続増大、定期アーカイブ戦略が必要（ただしログテーブルはパーティション + TTL で管理）

**例外 / 例外:**
- 日志表（Priority 4: operation_logs, api_logs, event_logs）不使用 soft delete，
  而是使用 PostgreSQL 表分区 + TTL 自动清理
  ログテーブル（Priority 4）は soft delete を使わず、PostgreSQL テーブルパーティション + TTL 自動クリーンアップを使用

---

## ADR-015: B2 Cloud Service Wrapper (Change-Forbidden)

### 状态 / ステータス
**Accepted**

### 日期 / 日付
2026-03-21

### 背景 / コンテキスト

`yamatoB2Service.ts` 是 Yamato B2 Cloud 配送对接的核心服务，于 2026-03-12 经过长时间调试后稳定化。
该服务包含认证（3 层缓存）、验证（日语键）、导出（英语键）等复杂逻辑，
proxy 的 'entry' 错误是 B2 Cloud session 过期导致，已通过自动重试解决。

`yamatoB2Service.ts` はヤマト B2 Cloud 配送連携のコアサービスで、2026-03-12 に長時間デバッグして安定化。
認証（3 層キャッシュ）・バリデーション（日本語キー）・エクスポート（英語キー）等の複雑なロジックを含み、
proxy の 'entry' エラーは B2 Cloud セッション切れが原因で、自動リトライで解決済み。

### 决策 / 決定

**在 NestJS 中用 Service Wrapper 包裹 yamatoB2Service.ts，禁止修改内部逻辑**
**NestJS で Service Wrapper として yamatoB2Service.ts をラップし、内部ロジックの変更を禁止**

### 禁止修改的范围 / 変更禁止の範囲

| 函数 / 関数 | 功能 / 機能 |
|---|---|
| `authenticatedFetch()` | 500 + 'entry' session 过期自动重试 / セッション切れ自動リトライ |
| `validateShipments()` | 日语键 + `/api/v1/shipments/validate` |
| `exportShipments()` | 英语键 + `/api/v1/shipments` |
| `login()` / `loginFromApi()` | 3 层缓存：内存 → MongoDB → API / 3 層キャッシュ：インメモリ → MongoDB → API |
| `addressMapping` | consignee/shipper 地址字段映射 / 住所フィールドマッピング |
| `b2ApiToJapaneseKeyMapping` | B2 API 到日语键映射 / B2 API から日本語キーマッピング |

### NestJS 包装方式 / NestJS ラップ方式

```typescript
// b2-cloud.service.ts - NestJS wrapper
// 内部调用原始 yamatoB2Service，不修改任何逻辑
// 内部で元の yamatoB2Service を呼び出し、ロジックを一切変更しない
@Injectable()
export class B2CloudService {
  // 原始 service 的 adapter，所有方法透传
  // 元サービスのアダプタ、全メソッドをパススルー
}
```

### 理由 / 理由

- 2026-03-12 经过长时间调试才稳定，修改有极高的回归风险
  2026-03-12 に長時間デバッグして安定化、変更は極めて高い回帰リスクを伴う
- B2 Cloud API 的行为（session 管理、键名差异、验证 bug）已经被完整处理
  B2 Cloud API の動作（セッション管理・キー名差異・バリデーションバグ）が完全に対処済み
- `/api/v1/shipments/validate-full` 有宽度检查器 bug，绝不能使用
  `/api/v1/shipments/validate-full` にはバリデータバグがあり、絶対に使用不可

### 影响 / 影響

**正面 / ポジティブ:**
- B2 Cloud 对接功能在迁移后保持 100% 一致
  B2 Cloud 連携機能が移行後も 100% 一致を維持
- 新功能可以在 wrapper 上层构建，不触碰核心逻辑
  新機能をラッパー上層に構築可能、コアロジックに触れない

**负面 / ネガティブ:**
- MongoDB session cache 的部分可能需要适配 PostgreSQL（仅缓存层，不改逻辑）
  MongoDB セッションキャッシュの部分は PostgreSQL への適応が必要な可能性（キャッシュ層のみ、ロジック変更なし）

---

## ADR-016: Bilingual CN+JP Code Comments

### 状态 / ステータス
**Accepted**

### 日期 / 日付
2026-03-21

### 背景 / コンテキスト

开发团队由中国和日本的开发者组成，需要统一的注释和文档语言策略。

開発チームは中国と日本の開発者で構成されており、統一されたコメントとドキュメントの言語戦略が必要。

### 决策 / 決定

**所有代码注释、commit message、文档、PR 描述使用中文 + 日文双语**
**全てのコードコメント・commit message・ドキュメント・PR 説明に中国語 + 日本語の二言語を使用**

### 适用范围 / 適用範囲

- 代码注释 / コードコメント: `// 检查库存是否充足 / 在庫が十分かチェック`
- Commit message: `feat: 添加出库批量操作 出荷一括操作を追加`
- 文档 / ドキュメント: 所有 `.md` 文件中日双语交替
- PR 描述 / PR 説明: 中日双语
- devlog / 開発記録: 中日双语

### 理由 / 理由

- 团队成员母语包括中文和日文，双语确保所有人能理解
  チームメンバーの母語が中国語と日本語を含み、バイリンガルで全員の理解を確保
- WMS 业务术语中日文有对应关系（如「出库」=「出荷」、「库存」=「在庫」）
  WMS 業務用語の中日対応関係（例：「出库」=「出荷」、「库存」=「在庫」）
- 避免单语文档导致部分团队成员无法有效参与 code review
  単言語ドキュメントによる一部チームメンバーのコードレビュー参加困難を回避

### 影响 / 影響

**正面 / ポジティブ:**
- 全团队成员可以无障碍阅读所有代码和文档
  全チームメンバーが全てのコードとドキュメントを障害なく閲読可能
- 业务术语的中日对照有助于减少沟通误解
  業務用語の中日対照がコミュニケーション誤解の低減に貢献

**负面 / ネガティブ:**
- 注释和文档的撰写时间增加约 30%
  コメントとドキュメントの執筆時間が約 30% 増加
- 代码注释行数增加
  コードコメント行数が増加

---

## ADR-017: Supabase Storage over S3 Direct

### 状态 / ステータス
**Accepted**

### 日期 / 日付
2026-03-21

### 背景 / コンテキスト

WMS 需要存储 PDF 标签、CSV 导入文件、商品图片等文件资源。
需要与认证系统集成的文件存储方案。

WMS は PDF ラベル・CSV インポートファイル・商品画像等のファイルリソースの保存が必要。
認証システムと統合するファイルストレージ方案が必要。

### 选项评估 / オプション評価

| 选项 / オプション | 优势 / 利点 | 劣势 / 欠点 |
|---|---|---|
| **AWS S3 直连 / 直接接続** | 功能最全；CDN (CloudFront) 集成 / 機能最完全；CDN (CloudFront) 統合 | 需要单独的 AWS 账号和 IAM 管理；与 Supabase Auth 无原生集成 / 別途 AWS アカウントと IAM 管理が必要；Supabase Auth とのネイティブ統合なし |
| **Supabase Storage** | S3 兼容 API；与 Supabase Auth 集成；RLS 策略控制文件访问；per-tenant bucket 策略 / S3 互換 API；Supabase Auth 統合；RLS ポリシーでファイルアクセス制御；テナントごとの bucket ポリシー | 功能不如 S3 丰富；大文件处理限制 / 機能が S3 ほど豊富でない；大ファイル処理制限 |
| **MinIO (自建)** | 完全 S3 兼容；自主控制 / 完全 S3 互換；自主制御 | 需要自运维；与 Auth 无原生集成 / 自前運用が必要；Auth とのネイティブ統合なし |

### 决策 / 決定

**采用 Supabase Storage (S3 兼容) / Supabase Storage（S3 互換）を採用**

### 理由 / 理由

- 与 Supabase Auth 深度集成：JWT 验证后直接访问文件
  Supabase Auth との深い統合：JWT 検証後にファイルへ直接アクセス
- RLS 策略可以限制文件访问为同一 tenant_id 下的用户
  RLS ポリシーでファイルアクセスを同一 tenant_id のユーザーに制限可能
- 无需管理额外的 AWS 账号、IAM 角色、bucket 策略
  追加の AWS アカウント・IAM ロール・バケットポリシー管理不要
- S3 兼容 API 意味着未来可以无缝迁移到 AWS S3
  S3 互換 API により将来 AWS S3 へのシームレス移行が可能

### 影响 / 影響

**正面 / ポジティブ:**
- 文件存储的认证和授权与应用统一
  ファイルストレージの認証・認可がアプリケーションと統一
- 单一平台管理（Supabase Dashboard）
  単一プラットフォーム管理（Supabase Dashboard）

**负面 / ネガティブ:**
- Supabase Storage 的免费额度有限（1GB），超出后需要付费
  Supabase Storage の無料枠が限定的（1GB）、超過後は課金が必要
- 大文件上传（>50MB）可能需要 resumable upload 配置
  大ファイルアップロード（>50MB）に resumable upload 設定が必要な可能性

---

## ADR-018: OpenTelemetry for Distributed Tracing

### 状态 / ステータス
**Accepted**

### 日期 / 日付
2026-03-21

### 背景 / コンテキスト

WMS 的请求链路涉及多个组件：Fastify → AuthGuard → Service → Repository → PostgreSQL → Redis → BullMQ。
需要端到端的可观测性方案来诊断性能瓶颈和错误。

WMS のリクエストチェーンは複数コンポーネントにまたがる：Fastify → AuthGuard → Service → Repository → PostgreSQL → Redis → BullMQ。
性能ボトルネックとエラーの診断にエンドツーエンドの可観測性方案が必要。

### 选项评估 / オプション評価

| 选项 / オプション | 优势 / 利点 | 劣势 / 欠点 |
|---|---|---|
| **OpenTelemetry SDK** | 厂商无关；自动 instrumentation（pg, ioredis, http, fastify）；社区标准；可导出到任何 backend（Jaeger, Grafana Tempo, Datadog）/ ベンダーニュートラル；自動 instrumentation（pg, ioredis, http, fastify）；コミュニティ標準；任意のバックエンドにエクスポート可能 | 初始配置复杂；SDK 体积较大 / 初期設定が複雑；SDK 体積が大きい |
| **Datadog APM** | 全托管；UI 优秀 / フルマネージド；UI 優秀 | 成本高；厂商锁定 / コスト高；ベンダーロックイン |
| **New Relic** | 免费额度大 / 無料枠が大きい | 厂商锁定；Node.js agent 有兼容性问题 / ベンダーロックイン；Node.js エージェントに互換性問題 |
| **手动日志追踪 / 手動ログトレーシング** | 简单；无依赖 / シンプル；依存なし | 无法自动关联请求链路；分析困难 / リクエストチェーンの自動関連付け不可；分析困難 |

### 决策 / 決定

**采用 OpenTelemetry SDK / OpenTelemetry SDK を採用**

### 理由 / 理由

- 厂商无关：可以自由切换 Jaeger/Grafana Tempo/Datadog 等后端
  ベンダーニュートラル：Jaeger/Grafana Tempo/Datadog 等のバックエンドを自由に切り替え可能
- 自动 instrumentation 覆盖 PostgreSQL (pg driver)、Redis (ioredis)、HTTP (fastify)
  自動 instrumentation が PostgreSQL (pg driver)・Redis (ioredis)・HTTP (fastify) をカバー
- 与 Pino 日志集成：traceId 自动注入日志，实现 log-trace 关联
  Pino ログとの統合：traceId がログに自動注入、log-trace 関連付けを実現
- W3C Trace Context 标准，与任何上下游系统互通
  W3C Trace Context 標準、任意の上流・下流システムと相互運用可能

### 实施方式 / 実装方式

```
Traces:  OpenTelemetry SDK → OTLP Exporter → Grafana Tempo / Jaeger
Metrics: OpenTelemetry SDK → Prometheus Exporter → Grafana
Logs:    Pino → stdout → Grafana Loki (with traceId correlation)
```

### 影响 / 影響

**正面 / ポジティブ:**
- 可以追踪单个请求从 HTTP 入口到 PostgreSQL 查询的完整链路
  単一リクエストの HTTP 入口から PostgreSQL クエリまでの完全チェーンを追跡可能
- 性能瓶颈可视化：哪个 Service/Repository/Query 最慢一目了然
  性能ボトルネックの可視化：どの Service/Repository/Query が最遅かが一目瞭然
- 错误链路追踪：异常发生在哪个层、影响了哪些后续操作
  エラーチェーン追跡：例外がどの層で発生し、どの後続操作に影響したか

**负面 / ネガティブ:**
- SDK 增加约 2-5MB 依赖体积
  SDK が約 2-5MB の依存体積を追加
- 初始配置需要设置 OTLP endpoint、采样率、resource attributes
  初期設定に OTLP endpoint・サンプリング率・resource attributes の設定が必要
- trace 数据需要存储后端（Grafana Tempo 或 Jaeger）
  trace データにストレージバックエンド（Grafana Tempo または Jaeger）が必要

---

## 附录: 决策关系图 / 付録: 決定関係図

```
ADR-001 (PostgreSQL)
  ├── ADR-003 (Drizzle ORM) ─── 操作 PostgreSQL 的 ORM
  ├── ADR-004 (Supabase Auth) ── JWT + RLS 集成
  ├── ADR-005 (Shared DB + RLS) ─ 多租户隔离策略
  ├── ADR-013 (UUID v5) ──────── 主键迁移策略
  ├── ADR-014 (Soft Delete) ──── 数据生命周期管理
  └── ADR-017 (Supabase Storage) ─ 文件存储

ADR-002 (NestJS)
  ├── ADR-006 (BullMQ) ────────── @nestjs/bullmq 集成
  ├── ADR-007 (Modular Monolith) ─ NestJS Module 模块化
  ├── ADR-009 (GraphQL 删除) ──── REST-only 简化
  ├── ADR-010 (Pino) ─────────── nestjs-pino 集成
  ├── ADR-012 (Fastify) ────────── HTTP platform 选择
  └── ADR-015 (B2 Wrapper) ────── NestJS Service 包装

ADR-008 (Vue 3 不变) ──────────── 前端隔离，最小化迁移范围
ADR-011 (Vitest) ─────────────── 前后端统一测试框架
ADR-016 (双语注释) ────────────── 团队协作规范
ADR-018 (OpenTelemetry) ──────── 可观测性基础设施
```

---

## 变更历史 / 変更履歴

| 日期 / 日付 | 变更内容 / 変更内容 | 作者 / 作成者 |
|---|---|---|
| 2026-03-21 | 初版：18 项 ADR 完整创建 / 初版：18 項 ADR 完全作成 | ZELIXWMS Team |

---

> 本文档是 ZELIXWMS 架构设计的核心参考资料。所有重大技术决策必须在此记录，
> 并经过团队评审后方可实施。
>
> 本ドキュメントは ZELIXWMS アーキテクチャ設計のコア参考資料である。全ての重要な技術決定は
> ここに記録し、チームレビューを経てから実施すること。
```
