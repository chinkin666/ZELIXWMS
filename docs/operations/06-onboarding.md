# 新开发者入职指南 / 新規開発者オンボーディングガイド

> 新成员快速上手 ZELIXWMS 项目的完整指南
> 新メンバーが ZELIXWMS プロジェクトに素早く馴染むための完全ガイド

---

## Day 1: 环境搭建 / 環境構築

### 1.1 前提条件 / 前提条件

以下工具需要预先安装。
以下のツールを事前にインストールする必要がある。

| 工具 / ツール | 版本 / バージョン | 安装方法 / インストール方法 |
|---|---|---|
| Node.js | 20+ LTS | `nvm install 20` |
| npm | 10+ | Node.js 附带 / Node.js に付属 |
| Docker Desktop | 最新版 | https://docker.com |
| Git | 最新版 | `brew install git` (macOS) |
| PostgreSQL client | 16+ | `brew install postgresql` (macOS) |
| Redis CLI | 最新版 | `brew install redis` (macOS) |
| VS Code (推荐 / 推奨) | 最新版 | https://code.visualstudio.com |

### 1.2 克隆与初始化 / クローンと初期化

```bash
# 1. 克隆仓库 / リポジトリをクローン
git clone https://github.com/your-org/ZELIXWMS.git
cd ZELIXWMS

# 2. 启动数据库和 Redis / データベースと Redis を起動
docker compose up -d

# 3. 安装依赖 / 依存関係をインストール
npm install

# 4. 复制环境变量模板 / 環境変数テンプレートをコピー
cp .env.example .env
# 编辑 .env 填入开发环境配置 / .env を編集して開発環境設定を記入

# 5. 运行数据库迁移 / データベースマイグレーションを実行
npm run db:migrate

# 6. 加载种子数据 / シードデータを投入
npm run db:seed

# 7. 启动所有服务 / 全サービスを起動
npm run dev
```

### 1.3 验证环境 / 環境検証

```bash
# 检查后端健康状态 / バックエンドヘルスチェック
curl http://localhost:4001/api/health
# 应返回 / 期待レスポンス: {"status":"ok","db":"connected","redis":"connected"}

# 打开前端 / フロントエンドを開く
# http://localhost:4001 (或 Vite 开发服务器端口 / または Vite 開発サーバーポート)

# 使用开发者账号登录 / 開発者アカウントでログイン
# Email: dev@zelixwms.local
# Password: (见 .env 或 seed 脚本 / .env または seed スクリプトを参照)
```

### 1.4 推荐的 VS Code 扩展 / 推奨 VS Code 拡張

- **Volar** — Vue 3 语言支持 / Vue 3 言語サポート
- **ESLint** — 代码检查 / コードチェック
- **Prettier** — 代码格式化 / コードフォーマット
- **Thunder Client** — API 测试 / API テスト
- **Database Client** — PostgreSQL 查询 / PostgreSQL クエリ

---

## Day 1: 架构概览 / アーキテクチャ概要

### 1.5 必读文档 / 必読ドキュメント

按顺序阅读以下文档。
以下のドキュメントを順番に読むこと。

1. **系统概览 / システム概要**: `docs/design/00-system-overview.md`
2. **后端架构 / バックエンドアーキテクチャ**: `docs/migration/03-backend-architecture.md`
   - 了解 16 个模块的结构 / 16 モジュールの構造を理解
3. **数据库设计 / データベース設計**: `docs/migration/02-database-design.md`
4. **API 映射 / API マッピング**: `docs/migration/04-api-mapping.md`

### 1.6 理解 WMS 业务领域 / WMS 業務ドメインを理解

ZELIXWMS 是仓库管理系统。核心业务流程：
ZELIXWMS は倉庫管理システム。コア業務フロー：

```
入庫 (Receiving)     →  在庫 (Inventory)     →  出荷 (Shipping)
商品を受け入れる        在庫を管理する            商品を出荷する
接收商品               管理库存                  发出商品
    ↓                      ↓                      ↓
入庫伝票作成            在庫数量更新             出荷指示作成
入库单创建              库存数量更新             出库指令创建
    ↓                      ↓                      ↓
検品・棚入れ            ロケーション管理          ピッキング → 梱包
质检・上架              货位管理                  拣货 → 打包
                                                   ↓
                                               B2 Cloud 連携
                                               B2 Cloud 集成
```

### 1.7 技术栈 / テクノロジースタック

| 层 / レイヤー | 技术 / テクノロジー |
|---|---|
| 前端 / フロントエンド | Vue 3 + TypeScript + Element Plus + Pinia |
| 后端 / バックエンド | NestJS + TypeScript + Drizzle ORM |
| 数据库 / データベース | PostgreSQL (Supabase) |
| 缓存/队列 / キャッシュ/キュー | Redis + BullMQ |
| 认证 / 認証 | Supabase Auth (JWT) |
| 外部集成 / 外部連携 | Yamato B2 Cloud API |
| CI/CD | GitHub Actions |

---

## Day 2: 代码走读 / コードウォークスルー

### 2.1 后端模块走读 / バックエンドモジュールウォークスルー

选择一个模块（推荐: Products），追踪完整请求链路。
一つのモジュール（推奨: Products）を選び、完全なリクエストチェーンを追跡。

```
请求流程 / リクエストフロー:

HTTP Request
  ↓
Controller (路由处理 / ルーティング)
  → @Get(), @Post(), @Put(), @Delete()
  → 参数验证 (ValidationPipe)
  → 认证检查 (JwtAuthGuard)
  → 角色检查 (RoleGuard)
  ↓
Service (业务逻辑 / ビジネスロジック)
  → 数据转换 / データ変換
  → 业务规则验证 / ビジネスルール検証
  → 跨模块调用 / クロスモジュール呼び出し
  ↓
Repository (数据访问 / データアクセス)
  → Drizzle ORM 查询 / クエリ
  → tenant_id 自动过滤 / 自動フィルタ
  ↓
Schema (Drizzle 表定义 / テーブル定義)
  → 字段类型、约束、关系 / フィールド型、制約、リレーション
```

**实践 / 実践**:
```bash
# 找到 Products 模块 / Products モジュールを探す
# backend-nestjs/src/modules/products/
#   ├── products.controller.ts   ← 路由处理 / ルーティング
#   ├── products.service.ts      ← 业务逻辑 / ビジネスロジック
#   ├── products.repository.ts   ← 数据访问 / データアクセス
#   ├── products.module.ts       ← 模块定义 / モジュール定義
#   └── dto/                     ← 数据传输对象 / DTO
```

### 2.2 前端页面走读 / フロントエンドページウォークスルー

选择一个页面，追踪完整数据流。
一つのページを選び、完全なデータフローを追跡。

```
数据流 / データフロー:

View (Vue SFC 页面组件 / ページコンポーネント)
  → template: Element Plus 组件 / コンポーネント
  → script setup: composables, refs
  ↓
Store (Pinia 状态管理 / ステート管理)
  → state: 数据存储 / データストア
  → getters: 计算属性 / 算出プロパティ
  → actions: 异步操作 / 非同期操作
  ↓
API Layer (HTTP 请求层 / リクエストレイヤー)
  → axios 或 fetch 封装 / ラッパー
  → 错误处理 / エラーハンドリング
  → token 自动附加 / トークン自動付与
```

### 2.3 运行测试 / テストを実行

```bash
# 运行全部测试 / 全テストを実行
npm run test

# 运行单一模块测试 / 単一モジュールテストを実行
npm run test -- --filter products

# 查看覆盖率 / カバレッジを確認
npm run test:coverage
```

理解测试模式：mock 的使用方式、测试数据工厂等。
テストパターンを理解：モックの使い方、テストデータファクトリなど。

---

## Day 3: 第一个任务 / 最初のタスク

### 3.1 选择任务 / タスクを選択

1. 在 GitHub Issues 中找一个标记为 `good-first-issue` 的任务
   GitHub Issues で `good-first-issue` タグのタスクを探す
2. 或者由导师分配一个小任务 / またはメンターから小さなタスクを割り当てられる
3. 推荐的第一个任务类型 / 推奨する最初のタスク:
   - 添加一个简单的 API 端点 / 簡単な API エンドポイントの追加
   - 修复一个小 bug / 小さなバグの修正
   - 添加测试用例 / テストケースの追加

### 3.2 Git 工作流 / Git ワークフロー

```bash
# 1. 创建分支 / ブランチを作成
git checkout -b feat/short-description
# 分支命名规则 / ブランチ命名規則:
# feat/xxx, fix/xxx, refactor/xxx, docs/xxx

# 2. 开发（遵循 TDD）/ 開発（TDD に従う）
# 先写测试 → 运行失败 → 写实现 → 运行通过 → 重构
# テストを先に書く → 失敗を確認 → 実装を書く → 通過を確認 → リファクタリング

# 3. 提交 / コミット
git add <specific-files>
git commit -m "feat: 简要描述 簡潔な説明"
# Commit message 使用中日双语 / コミットメッセージは中日バイリンガル

# 4. 推送并创建 PR / プッシュして PR を作成
git push -u origin feat/short-description
gh pr create --title "feat: ..." --body "..."
```

### 3.3 PR 检查清单 / PR チェックリスト

提交 PR 前确认。PR 提出前に確認。

- [ ] 代码遵循项目编码规范 / プロジェクトのコーディング規約に準拠
- [ ] 测试已编写且通过 / テストが書かれ通過済み
- [ ] 覆盖率 ≥ 80% / カバレッジ ≥ 80%
- [ ] commit message 使用中日双语 / コミットメッセージが中日バイリンガル
- [ ] 无硬编码密钥 / ハードコードされた秘密情報なし
- [ ] 相关文档已更新 / 関連ドキュメントが更新済み
- [ ] devlog 已记录 / devlog に記録済み

---

## 关键联系人与资源 / 主要連絡先とリソース

| 角色 / 役割 | 联系方式 / 連絡方法 |
|---|---|
| 技术负责人 / テックリード | （填入联系方式 / 連絡先を記入） |
| 新人导师 / メンター | （填入联系方式 / 連絡先を記入） |
| DevOps | （填入联系方式 / 連絡先を記入） |

### 常用链接 / よく使うリンク

| 资源 / リソース | URL |
|---|---|
| GitHub 仓库 / リポジトリ | （URL を記入） |
| Supabase Dashboard | https://app.supabase.com |
| CI/CD (GitHub Actions) | （URL を記入） |
| 错误追踪 / エラートラッキング (Sentry) | （URL を記入） |
| API 文档 / API ドキュメント (Swagger) | http://localhost:4001/api/docs |

---

## 常见陷阱 / よくある落とし穴

### 1. B2 Cloud 代码不可修改 / B2 Cloud コードは変更禁止

`yamatoB2Service.ts` 和 `yamatoB2Format.ts` 的核心代码已稳定运行，**绝对不能修改**。
如需扩展功能，在上层构建 wrapper。

`yamatoB2Service.ts` と `yamatoB2Format.ts` のコアコードは安定稼働中、**絶対に変更禁止**。
機能拡張が必要な場合、上位レイヤーで wrapper を構築。

### 2. 多租户数据隔离 / マルチテナントデータ分離

所有数据库查询**必须**包含 `tenant_id` 过滤。
全データベースクエリに **必ず** `tenant_id` フィルタを含めること。

### 3. 双语注释 / バイリンガルコメント

所有代码注释、commit message、文档都需要中日双语。
全コードコメント、コミットメッセージ、ドキュメントは中日バイリンガルで記載。

### 4. 文档同步 / ドキュメント同期

代码变更前先更新相关文档，变更后记录到 devlog。
コード変更前に関連ドキュメントを更新、変更後に devlog に記録。

### 5. 不可变性原则 / イミュータビリティ原則

永远创建新对象，不要修改现有对象。
常に新しいオブジェクトを作成し、既存のオブジェクトを変更しない。
