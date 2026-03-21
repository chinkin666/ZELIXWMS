# ZELIX WMS システム全体概要 / 系统整体概述

> 本ドキュメントは新規参画開発者向けのシステム概要です。
> 本文档面向新加入的开发人员，提供系统全局视图。
>
> 最終更新 / 最后更新: 2026-03-21

---

## 目次 / 目录

1. [プロジェクト概要 / 项目概要](#1-プロジェクト概要--项目概要)
2. [システム構成図 / 系统架构图](#2-システム構成図--系统架构图)
3. [技術スタック / 技术栈](#3-技術スタック--技术栈)
4. [モジュール概要（16 NestJS モジュール）/ 模块概要](#4-モジュール概要16-nestjs-モジュール--模块概要)
5. [インフラストラクチャ / 基础设施](#5-インフラストラクチャ--基础设施)
6. [外部システム連携 / 外部系统集成](#6-外部システム連携--外部系统集成)
7. [ユーザーロール / 用户角色](#7-ユーザーロール--用户角色)
8. [モノレポ構成 / Monorepo 结构](#8-モノレポ構成--monorepo-结构)
9. [開発環境セットアップ / 开发环境搭建](#9-開発環境セットアップ--开发环境搭建)
10. [コーディング規約 / 编码规范](#10-コーディング規約--编码规范)
11. [変更禁止ルール / 禁止变更规则](#11-変更禁止ルール--禁止变更规则)

---

## 1. プロジェクト概要 / 项目概要

### ZELIX WMS とは / 什么是 ZELIX WMS

ZELIX WMS は、**日本の 3PL（サードパーティ・ロジスティクス）事業者**向けに設計された
**マルチテナント SaaS 型**倉庫管理システム（Warehouse Management System）です。

ZELIX WMS 是一个专为**日本 3PL（第三方物流）企业**设计的
**多租户 SaaS 型**仓库管理系统。

### 主な特徴 / 主要特征

- **LOGIFAST 109 項目 100% 実装** — 業界標準の全機能をカバー
  100% 实现 LOGIFAST 109 个功能项，覆盖行业标准全功能
- **マルチテナント構造** — 1 つの倉庫に複数荷主の在庫を保管、RLS + アプリケーション層で完全分離
  多租户架构：一个仓库存储多个货主库存，RLS + 应用层双重隔离
- **配送業者連携** — ヤマト B2 Cloud、佐川 e飛伝III、Amazon FBA、Rakuten RSL
  物流商集成：大和 B2 Cloud、佐川、FBA、RSL
- **日本特有の帳票** — 送り状、納品書、ピッキングリスト等の日本語帳票
  日本特有单据：送货单、交货单、拣货单等

### 規模 / 规模

| 指標 / 指标 | 値 / 值 |
|---|---|
| テスト数 / 测试数 | 1807（Backend 1454 + Frontend 353） |
| DB テーブル / 数据库表 | 40+ テーブル（PostgreSQL） |
| API ルート / API 路由 | 70+ エンドポイント |
| NestJS モジュール / 模块 | 16 業務モジュール + 共通モジュール |
| フロントエンド画面 / 前端页面 | 109 画面（118 遅延ロードルート） |

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
        │  倉庫オペレーター  │ │  顧客ポータル   │ │  管理ダッシュボード│
        └────────┬──────────┘ └───────┬────────┘ └────────┬─────────┘
                 │                    │                    │
                 └────────────┬───────┘                    │
                              │   REST API (JSON)          │
                              ▼                            ▼
                 ┌────────────────────────────────────────────┐
                 │       Backend (NestJS 11 + Fastify)        │
                 │                                            │
                 │  ┌───────────┐ ┌──────────┐ ┌──────────┐  │
                 │  │ Controller│ │ Service  │ │Repository│  │
                 │  │  (Routes) │ │ (Logic)  │ │(Drizzle) │  │
                 │  └───────────┘ └──────────┘ └──────────┘  │
                 │                                            │
                 │  ┌───────────┐ ┌──────────┐ ┌──────────┐  │
                 │  │  Guards   │ │  Events  │ │  Queue   │  │
                 │  │(Auth/RBAC)│ │(Emitter) │ │ (BullMQ) │  │
                 │  └───────────┘ └──────────┘ └──────────┘  │
                 └────────┬──────────────┬────────────────────┘
                          │              │
                ┌─────────┘              └─────────┐
                ▼                                  ▼
   ┌──────────────────────────┐      ┌─────────────────────┐
   │  PostgreSQL 16 (Supabase) │      │   Redis 7            │
   │                            │      │                      │
   │  - メイン DB               │      │  - セッションキャッシュ│
   │  - 40+ テーブル + RLS      │      │  - BullMQ ジョブキュー│
   │  - Drizzle ORM             │      │  - B2 Cloud セッション│
   └────────────────────────────┘      └──────────┬───────────┘
                                                  │
   Supabase 提供サービス / Supabase 提供的服务:    ┌──┘
   ┌──────────────────────┐           ┌──────────▼────────┐
   │  Supabase Auth       │           │  BullMQ Workers   │
   │  - JWT 発行/検証      │           │  - CSV Import     │
   │  - MFA               │           │  - Notification   │
   │  - メール認証          │           │  - Billing        │
   └──────────────────────┘           │  - Webhook        │
   ┌──────────────────────┐           │  - Audit Log      │
   │  Supabase Storage    │           │  - Report         │
   │  - ファイルアップロード │           │  - Script         │
   └──────────────────────┘           └───────────────────┘

   ─── 外部 API 連携 / 外部 API 集成 ───

   Backend ──→ ヤマト B2 Cloud API（送り状発行・追跡）  ★変更禁止
   Backend ──→ 佐川 e飛伝III API（送り状発行・追跡）
   Backend ──→ Amazon FBA API（FBA ラベル・出荷計画）
   Backend ──→ Rakuten RSL API（RSL 出荷連携）
```

---

## 3. 技術スタック / 技术栈

| レイヤー / 层 | 技術 / 技术 | 備考 / 备注 |
|---|---|---|
| **Backend フレームワーク** | NestJS 11 + Fastify | モジュラーモノリス / 模块化单体 |
| **言語 / 语言** | TypeScript 5.6 | strict モード |
| **ORM** | Drizzle ORM | 型安全クエリ / 类型安全查询 |
| **データベース / 数据库** | PostgreSQL 16 (Supabase) | RLS + 40+ テーブル |
| **認証 / 认证** | Supabase Auth | JWT + app_metadata (tenant_id, role) |
| **バリデーション / 验证** | Zod 3.x + NestJS ValidationPipe | スキーマベース / schema-based |
| **キャッシュ / 缓存** | Redis 7 | セッション + キュー |
| **ジョブキュー / 任务队列** | BullMQ (@nestjs/bullmq) | 7 キュー（CSV, 通知, 請求, Webhook, 監査, レポート, スクリプト） |
| **イベント / 事件** | EventEmitter2 (@nestjs/event-emitter) | ドメインイベント駆動 |
| **ロギング / 日志** | Pino 9.x (nestjs-pino) | 構造化ログ / 结构化日志 |
| **API ドキュメント** | @nestjs/swagger | Decorator ベース自動生成 |
| **フロントエンド / 前端** | Vue 3 + Vite + Pinia | Element Plus UI |
| **テスト / 测试** | Vitest | 1807 テスト |
| **CI/CD** | GitHub Actions | 自動テスト・ビルド・デプロイ |
| **コンテナ / 容器** | Docker Compose | ローカル開発用 |

---

## 4. モジュール概要（16 NestJS モジュール）/ 模块概要

### アーキテクチャ分層 / 架构分层

```
Controller → Service → Repository → Drizzle ORM → PostgreSQL
     ↑            ↑
  Guards      EventEmitter2 → BullMQ Workers
```

### 16 業務モジュール / 16 个业务模块

| # | モジュール / 模块 | 主要機能 / 主要功能 |
|---|---|---|
| 1 | **products** | 商品マスタ CRUD、セット商品、子 SKU / 商品主数据、套装商品、子 SKU |
| 2 | **inventory** | 在庫管理（StockQuant, StockMove, Lot, Location）、引当・調整・移動 / 库存管理、预留・调整・移动 |
| 3 | **inbound** | 入庫ワークフロー（draft→confirmed→receiving→putaway→done）/ 入库工作流 |
| 4 | **shipment** | 出荷指示 CRUD、出庫申請 / 出货指示、出库申请 |
| 5 | **warehouse** | 倉庫マスタ、タスク管理、ウェーブ、検品、ラベリング、棚卸 / 仓库、任务、波次、检品、贴标、盘点 |
| 6 | **returns** | 返品処理（draft→inspecting→completed）/ 退货处理 |
| 7 | **billing** | 請求管理、料金マスタ、作業チャージ、運賃 / 计费管理、费率、作业费用、运费 |
| 8 | **carriers** | 配送業者マスタ、B2 Cloud wrapper（変更禁止）、佐川連携 / 物流商、B2 Cloud、佐川 |
| 9 | **clients** | 荷主・サブ荷主・顧客・ショップ管理、ポータル API / 货主、子货主、客户、店铺、门户 |
| 10 | **extensions** | プラグイン、Webhook、スクリプト、フィーチャーフラグ、ルールエンジン、ワークフローエンジン / 插件、Webhook、脚本、功能开关、规则引擎、工作流 |
| 11 | **integrations** | Amazon FBA、Rakuten RSL、OMS、マーケットプレイス、ERP 連携 / FBA、RSL、OMS、市场、ERP |
| 12 | **reporting** | ダッシュボード、日次レポート、KPI、ピークモード / 看板、日报、KPI、高峰模式 |
| 13 | **notifications** | 通知サービス、メールテンプレート / 通知、邮件模板 |
| 14 | **admin** | テナント管理、ユーザー管理、システム設定、操作ログ / 租户、用户、系统设置、操作日志 |
| 15 | **import** | CSV インポート、マッピング設定 / CSV 导入、映射配置 |
| 16 | **render** | PDF/ラベル生成、帳票テンプレート / PDF/标签生成、单据模板 |

### 共通モジュール / 通用模块

| モジュール / 模块 | 内容 / 内容 |
|---|---|
| **CommonModule** (global) | Guards (Auth, Tenant, Role)、Interceptors、Pipes、Filters、Decorators |
| **DatabaseModule** (global) | Drizzle ORM 接続、Schema 定義、Repository 基底クラス / Drizzle 连接、Schema、Base Repository |
| **AuthModule** | Supabase Auth 連携、ログイン/ログアウト、ポータル認証 / Supabase Auth、登录登出、门户认证 |
| **QueueModule** | BullMQ 7 キュー + プロセッサー / 7 个队列 + 处理器 |
| **ConfigModule** | 環境変数バリデーション (Zod)、Supabase/Redis/DB 設定 / 环境变量验证、各种连接配置 |

---

## 5. インフラストラクチャ / 基础设施

### 本番環境 / 生产环境

| コンポーネント / 组件 | 技術 / 技术 | 説明 / 说明 |
|---|---|---|
| **データベース / 数据库** | PostgreSQL 16 (Supabase) | マネージド DB + RLS + バックアップ |
| **認証 / 认证** | Supabase Auth | JWT 発行・検証・MFA・メール認証 / JWT、MFA、邮件认证 |
| **ストレージ / 存储** | Supabase Storage | ファイルアップロード / 文件上传 |
| **キャッシュ / 缓存** | Redis 7 | セッション + BullMQ キュー |
| **ジョブキュー / 任务队列** | BullMQ | 非同期処理（CSV, 通知, 請求, Webhook, 監査, レポート, スクリプト） |
| **CI/CD** | GitHub Actions | テスト・ビルド・デプロイ自動化 |
| **コンテナ / 容器** | Docker Compose | ローカル開発用 / 本地开发用 |

### ローカル開発環境 / 本地开发环境

```bash
# Docker で PostgreSQL + Redis を起動 / 用 Docker 启动 PostgreSQL + Redis
docker compose up -d postgres redis

# NestJS バックエンド起動 / 启动 NestJS 后端
cd backend-nest && npm run start:dev

# フロントエンド起動 / 启动前端
cd frontend && npm run dev
```

---

## 6. 外部システム連携 / 外部系统集成

### 6.1 ヤマト B2 Cloud / 大和 B2 Cloud

**最重要の外部連携。コアロジック変更禁止。**
**最重要的外部集成。核心逻辑禁止修改。**

| 機能 / 功能 | API エンドポイント | 説明 / 说明 |
|---|---|---|
| ログイン / 登录 | B2 Cloud Login API | 3 層キャッシュ: メモリ→DB→API / 3 级缓存 |
| バリデーション / 验证 | `/api/v1/shipments/validate` | 日本語キーで送信 / 日文键名 |
| エクスポート / 导出 | `/api/v1/shipments` | 英語キーで送信、送り状番号取得 / 英文键名 |
| 印刷 / 打印 | Print API | PDF 伝票発行 |
| 追跡 / 追踪 | Tracking API | 配送状況取得 |

> NestJS では `b2-cloud.service.ts` として wrapper で囲む。内部の `yamatoB2Service.ts` は変更禁止。
> 在 NestJS 中通过 `b2-cloud.service.ts` 包装。内部的 `yamatoB2Service.ts` 禁止修改。

### 6.2 佐川急便 e飛伝III / 佐川急便 e飞传III

- `sagawa.service.ts` で連携 / 通过 sagawa.service.ts 集成
- 送り状発行・追跡番号取得 / 发运单发行、追踪号获取

### 6.3 Amazon FBA

- `integrations/fba/` モジュールで管理 / 通过 fba 模块管理
- FBA ラベル発行・出荷計画連携 / FBA 标签发行、出货计划集成

### 6.4 Rakuten RSL

- `integrations/rsl/` モジュールで管理 / 通过 rsl 模块管理
- 楽天スーパーロジスティクス連携 / 乐天超级物流集成

---

## 7. ユーザーロール / 用户角色

| ロール / 角色 | 利用画面 / 使用界面 | 説明 / 说明 |
|---|---|---|
| **admin** | Frontend + Admin | テナント内全権限。ユーザー管理・設定変更 / 租户内全权限 |
| **manager** | Frontend | 倉庫管理者。承認・レポート・KPI / 仓库管理者，审批、报表、KPI |
| **operator** | Frontend | 倉庫オペレーター。入出庫・ピッキング・検品等の日常業務 / 日常操作 |
| **viewer** | Frontend | 閲覧のみ。レポート参照 / 仅查看 |
| **client** | Portal | 荷主（顧客）。出荷指示投入・在庫照会・出荷状況トラッキング / 货主门户 |

認証は **Supabase Auth** で管理。JWT の `app_metadata` に `tenant_id` と `role` を格納。
认证由 **Supabase Auth** 管理。JWT 的 `app_metadata` 中存储 `tenant_id` 和 `role`。

---

## 8. モノレポ構成 / Monorepo 结构

```
ZELIXWMS/
├── package.json              # ルートワークスペース定義 / 根 workspace 定义
├── docker-compose.yml        # 全サービスコンテナ定義 / 全服务容器定义
├── CLAUDE.md                 # AI 開発ルール / AI 开发规则
│
├── backend-nest/             # NestJS 11 + Fastify バックエンド
│   ├── src/
│   │   ├── app.module.ts     # ルートモジュール / 根模块
│   │   ├── main.ts           # Fastify bootstrap
│   │   ├── common/           # Guards, Interceptors, Pipes, Filters
│   │   ├── database/         # Drizzle Schema + Repository
│   │   ├── auth/             # Supabase Auth 連携
│   │   ├── modules/          # 16 業務モジュール / 16 个业务模块
│   │   ├── queue/            # BullMQ 7 キュー
│   │   └── config/           # 環境変数・接続設定
│   ├── drizzle/              # マイグレーション SQL
│   └── test/                 # unit / integration / e2e
│
├── backend/                  # Express + MongoDB（現行、移行元）
│   └── ...                   # 移行完了後に削除予定 / 迁移完成后删除
│
├── frontend/                 # Vue 3 倉庫オペレーター画面
│   ├── src/
│   │   ├── views/            # ページコンポーネント / 页面组件
│   │   ├── components/       # 共通コンポーネント（Odoo 風）/ Odoo 风格组件
│   │   ├── stores/           # Pinia ストア
│   │   └── composables/      # Vue Composables
│   └── tests/
│
├── admin/                    # Vue 3 管理ダッシュボード
│   └── src/                  # テナント管理・マスタ設定
│
├── portal/                   # Vue 3 顧客ポータル
│   └── src/                  # 出荷指示・在庫照会・状況確認
│
├── packages/
│   └── plugin-sdk/           # 拡張プラグイン SDK
│
├── shared/                   # フロントエンド間共有コード / 前端共享代码
├── scripts/                  # ユーティリティスクリプト
├── carrier-format/           # 配送業者フォーマット定義
└── docs/                     # ドキュメント
    ├── devlog.md             # 開発記録
    ├── migration/            # NestJS 移行設計（6 文書）
    └── design/               # 設計ドキュメント（本ファイル）
```

---

## 9. 開発環境セットアップ / 开发环境搭建

### 前提条件 / 前提条件

| ツール / 工具 | バージョン / 版本 | 用途 / 用途 |
|---|---|---|
| Node.js | 20+ | ランタイム / 运行时 |
| npm | 9+ | パッケージ管理 / 包管理 |
| Docker | 最新 / 最新 | PostgreSQL + Redis |
| Git | 最新 / 最新 | バージョン管理 / 版本管理 |

### セットアップ手順 / 搭建步骤

```bash
# 1. リポジトリクローン / 克隆仓库
git clone <repo-url> ZELIXWMS
cd ZELIXWMS

# 2. PostgreSQL + Redis 起動 / 启动 PostgreSQL + Redis
docker compose up -d postgres redis

# 3. 依存関係インストール / 安装依赖
npm install

# 4. admin と portal は個別にインストール / 单独安装
cd admin && npm install && cd ..
cd portal && npm install && cd ..

# 5. DB マイグレーション / 数据库迁移
cd backend-nest && npx drizzle-kit migrate

# 6. 初期データ投入 / 导入种子数据
npm run seed

# 7. 全サービス起動 / 启动所有服务
npm run dev:backend    # NestJS Backend
npm run dev:frontend   # Frontend :4001
```

### テスト実行 / 执行测试

```bash
# Backend テスト / 后端测试
cd backend-nest && npx vitest run

# Frontend テスト / 前端测试
cd frontend && npx vitest run
```

---

## 10. コーディング規約 / 编码规范

### 10.1 バイリンガル注釈（必須）/ 双语注释（必须）

すべてのコメント・ドキュメントは**中国語 + 日本語**の二言語で記載する。
所有注释和文档必须使用**中文 + 日文**双语记载。

### 10.2 イミュータブルパターン / 不可变模式

既存オブジェクトを直接変更せず、新しいオブジェクトを返す。DTO は `readonly`。
不直接修改现有对象，返回新对象。DTO 使用 `readonly`。

### 10.3 ファイルサイズ制限 / 文件大小限制

- 目安: 200-400 行 / 建议：200-400 行
- 上限: 800 行 / 上限：800 行
- 50 行以内の関数 / 函数不超过 50 行
- ネスト 4 階層以下 / 嵌套不超过 4 层

### 10.4 NestJS 規約 / NestJS 规范

- **Controller**: 軽量。ルーティング + DTO 検証 + Service 呼び出し / 轻量级，路由 + 验证 + 调用 Service
- **Service**: ビジネスロジック集中。Repository 経由で DB アクセス / 业务逻辑集中，通过 Repository 访问 DB
- **Repository**: データアクセス封装。`tenant_id` 自動フィルタ / 数据访问封装，自动过滤 tenant_id
- **Module**: 機能単位で分離。各モジュール独立テスト可能 / 按功能分离，各模块可独立测试

### 10.5 commit メッセージ / 提交信息

```
<type>: <日本語説明> <中文说明>
```

type: `feat` | `fix` | `refactor` | `docs` | `test` | `chore` | `perf` | `ci`

### 10.6 ドキュメント同期 / 文档同步

コード変更時は対応ドキュメントを**先に更新**してから開発する。
代码变更时**先更新**对应文档，再进行开发。

開発記録は `docs/devlog.md` に記録する。
开发记录记录到 `docs/devlog.md`。

---

## 11. 変更禁止ルール / 禁止变更规则

### 対象ファイル / 对象文件

以下のファイル・機能は**安定稼働中のため変更禁止**:
以下文件・功能**处于稳定运行状态，禁止修改**：

#### `backend/src/services/yamatoB2Service.ts`（NestJS でも wrapper 経由で利用）

| 関数 / 函数 | 説明 / 说明 |
|---|---|
| `authenticatedFetch()` | 500 + 'entry' セッション切れ自動リトライ |
| `validateShipments()` | 日本語キー + `/api/v1/shipments/validate` |
| `exportShipments()` | 英語キー + `/api/v1/shipments` |
| `login()` / `loginFromApi()` | 3 層キャッシュ（インメモリ→DB→API） |
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

---

> **最終更新 / 最后更新**: 2026-03-21
> **関連ドキュメント / 相关文档**: `docs/migration/03-backend-architecture.md`
