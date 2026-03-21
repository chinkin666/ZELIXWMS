# デプロイメントガイド / 部署指南

> ZELIXWMS のインフラ構成・デプロイ手順・CI/CD パイプラインの全体像（NestJS + PostgreSQL + Supabase 新アーキテクチャ）。
> ZELIXWMS 基础设施配置、部署流程、CI/CD 流水线全貌（NestJS + PostgreSQL + Supabase 新架构）。

---

## 1. ローカル開発環境 / 本地开发环境

### 前提条件 / 前提条件

- Node.js >= 20.0.0, npm >= 10.0.0
- Docker & Docker Compose（MongoDB は移行期間中に使用 / MongoDB 在迁移期间继续使用）
- PostgreSQL 15+（Supabase ローカル or Docker / Supabase 本地或 Docker）
- Redis 7.x（キュー・キャッシュ用 / 队列和缓存用）

### docker-compose（開発用） / docker-compose（开发用）

移行期間中は MongoDB と PostgreSQL が共存する構成。
迁移期间 MongoDB 和 PostgreSQL 共存。

```yaml
services:
  postgres:
    image: postgres:15-alpine
    ports: ["5432:5432"]
    environment:
      POSTGRES_DB: zelixwms
      POSTGRES_USER: zelixwms
      POSTGRES_PASSWORD: zelixwms_dev
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U zelixwms"]
      interval: 10s
      timeout: 5s
      retries: 3

  mongo:
    image: mongo:7
    ports: ["27017:27017"]
    volumes:
      - mongo-data:/data/db
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 15s
      timeout: 5s
      retries: 3

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 15s
      timeout: 5s
      retries: 3

volumes:
  postgres-data:
  mongo-data:
  redis-data:
```

### セットアップ手順 / 设置步骤

```bash
# 1. リポジトリクローン / 克隆仓库
git clone <repo-url> && cd ZELIXWMS

# 2. 依存関係インストール / 安装依赖
npm install

# 3. 環境変数ファイル作成 / 创建环境变量文件
cp backend/.env.example backend/.env
# .env を編集 / 编辑 .env

# 4. インフラ起動（Docker Compose） / 启动基础设施
docker compose up -d postgres mongo redis

# 5. データベースマイグレーション / 数据库迁移
cd backend && npm run migration:run

# 6. シードデータ投入 / 导入种子数据
npm run seed

# 7. 全サービス一括起動 / 一键启动所有服务
npm run dev
```

### 開発サービスポート / 开发服务端口

| サービス / 服务 | ポート / 端口 | 説明 / 说明 |
|---|---|---|
| Backend (NestJS) | `:4000` | API サーバー（hot reload） |
| Frontend | `:4001` | 倉庫端 Vite dev server / 仓库端 |
| Portal | `:4002` | 顧客端 Vite dev server / 客户端 |
| Admin | `:4003` | 管理ダッシュボード Vite dev server / 管理后台 |
| PostgreSQL | `:5432` | メインデータベース / 主数据库 |
| MongoDB | `:27017` | レガシーデータベース（移行期間）/ 旧数据库（迁移期间） |
| Redis | `:6379` | キャッシュ + BullMQ キュー / 缓存 + 队列 |

---

## 2. 本番デプロイオプション / 生产部署选项

### Option A: Docker Compose（シンプル・単一サーバー）/ Docker Compose（简单、单服务器）

単一サーバーで全サービスを実行する最もシンプルな構成。
在单台服务器上运行所有服务的最简配置。

```
┌─────────────────────────────────────────┐
│              Single Server              │
│                                         │
│  ┌──────────┐  ┌──────────┐            │
│  │ frontend │  │  admin   │  Nginx     │
│  │  (Nginx) │  │ (Nginx)  │  (SSL)     │
│  └────┬─────┘  └────┬─────┘            │
│       │              │                  │
│  ┌────▼──────────────▼─────┐           │
│  │   backend (NestJS)      │           │
│  └────┬──────────┬─────────┘           │
│       │          │                     │
│  ┌────▼────┐ ┌───▼───┐ ┌──────────┐  │
│  │PostgreSQL│ │ Redis │ │ MongoDB  │  │
│  └─────────┘ └───────┘ │(移行期間)│  │
│                         └──────────┘  │
└─────────────────────────────────────────┘
```

```bash
# 本番デプロイ / 生产部署
docker compose -f docker-compose.prod.yml up -d --build

# ステータス確認 / 检查状态
docker compose -f docker-compose.prod.yml ps

# ヘルスチェック / 健康检查
curl http://localhost:4000/health
```

### Option B: クラウドサービス構成 / 云服务配置

Supabase + Cloud Run/Railway + Vercel/Cloudflare の分散構成。
Supabase + Cloud Run/Railway + Vercel/Cloudflare 的分布式配置。

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│   Vercel /   │     │  Cloud Run /     │     │   Supabase   │
│  Cloudflare  │────▶│   Railway        │────▶│              │
│  (Frontend)  │     │  (NestJS API)    │     │ - PostgreSQL │
└──────────────┘     └──────┬───────────┘     │ - Auth       │
                            │                 │ - Storage    │
                       ┌────▼────┐            └──────────────┘
                       │  Redis  │
                       │(Upstash)│
                       └─────────┘
```

| コンポーネント / 组件 | サービス / 服务 | 備考 / 备注 |
|---|---|---|
| データベース + 認証 + ストレージ / DB + Auth + Storage | Supabase | PostgreSQL、Row Level Security、S3 互換ストレージ |
| バックエンド API | Cloud Run / Railway | NestJS コンテナ、オートスケール / 自动扩缩 |
| フロントエンド | Vercel / Cloudflare Pages | 静的ホスティング、CDN 配信 / 静态托管、CDN 分发 |
| キャッシュ + キュー / Cache + Queue | Upstash Redis / Redis Cloud | サーバーレス Redis |

---

## 3. Docker イメージ構成 / Docker 镜像配置

### Backend（NestJS）

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --production=false
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 4000
CMD ["node", "dist/main.js"]
```

### Frontend / Admin / Portal（Nginx）

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

---

## 4. 環境変数一覧 / 环境变量列表

### 必須（本番） / 必须（生产环境）

| 変数名 / 变量名 | 説明 / 说明 | デフォルト | 例 |
|---|---|---|---|
| `NODE_ENV` | 実行環境 / 运行环境 | `development` | `production` |
| `PORT` | API サーバーポート / 端口 | `4000` | `4000` |
| `HOST` | リッスンアドレス / 监听地址 | `0.0.0.0` | `0.0.0.0` |
| `DATABASE_URL` | PostgreSQL 接続 URL / 连接 URL | - | `postgresql://user:pass@host:5432/zelixwms` |
| `JWT_SECRET` | JWT 署名キー / 签名密钥 | - | **本番は必ず変更 / 生产必须更改** |
| `SESSION_SECRET` | セッションシークレット | - | **本番は必ず変更** |

### データベース / 数据库

| 変数名 | 説明 / 说明 | デフォルト |
|---|---|---|
| `DATABASE_URL` | PostgreSQL 接続 URL | `postgresql://zelixwms:zelixwms_dev@localhost:5432/zelixwms` |
| `DATABASE_POOL_MIN` | コネクションプール最小数 / 连接池最小数 | `2` |
| `DATABASE_POOL_MAX` | コネクションプール最大数 / 连接池最大数 | `10` |
| `DATABASE_SSL` | SSL 接続を使用 / 使用 SSL 连接 | `false` (本番: `true`) |
| `MONGODB_URI` | MongoDB 接続 URI（移行期間）/ MongoDB 连接（迁移期间） | `mongodb://127.0.0.1:27017/nexand-shipment` |

### Supabase

| 変数名 | 説明 / 说明 | デフォルト |
|---|---|---|
| `SUPABASE_URL` | Supabase プロジェクト URL | - |
| `SUPABASE_ANON_KEY` | Supabase 匿名キー / 匿名密钥 | - |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase サービスロールキー / 服务角色密钥 | - |

### Redis + キュー / Redis + 队列

| 変数名 | 説明 / 说明 | デフォルト |
|---|---|---|
| `REDIS_URL` | Redis 接続 URL / 连接 URL | `redis://127.0.0.1:6379` |
| `REDIS_MAX_RETRIES` | Redis 再接続リトライ回数 / 重连重试次数 | `3` |
| `BULL_QUEUE_PREFIX` | BullMQ キュープレフィックス / 队列前缀 | `wms` |

### 認証・セキュリティ / 认证与安全

| 変数名 | 説明 / 说明 | デフォルト |
|---|---|---|
| `JWT_SECRET` | JWT 署名キー / 签名密钥 | **本番必須設定** |
| `JWT_EXPIRES_IN` | JWT 有効期間 / 有效期 | `7d` |
| `SESSION_SECRET` | セッション署名キー | **本番必須設定** |
| `CORS_ORIGINS` | 許可オリジン（カンマ区切り） / 允许的源（逗号分隔） | `http://localhost:4001` |

### メール / 邮件

| 変数名 | 説明 / 说明 | デフォルト |
|---|---|---|
| `SMTP_HOST` | メールサーバー / 邮件服务器 | 未設定＝メール無効 |
| `SMTP_PORT` | SMTP ポート | `587` |
| `SMTP_SECURE` | TLS 使用 | `false` |
| `SMTP_USER` | SMTP ユーザー | - |
| `SMTP_PASS` | SMTP パスワード | - |
| `SMTP_FROM` | 送信元アドレス / 发件人地址 | `noreply@zelix-wms.com` |

### ストレージ / 存储

| 変数名 | 説明 / 说明 | デフォルト |
|---|---|---|
| `S3_ACCESS_KEY` | S3 アクセスキー | **本番必須** |
| `S3_SECRET_KEY` | S3 シークレットキー | **本番必須** |
| `S3_BUCKET` | S3 バケット名 | `zelix-wms-photos` |
| `FILE_STORAGE_DIR` | ローカルファイル保存先 / 本地文件存储目录 | `tmp/uploads` |

### 外部サービス / 外部服务

| 変数名 | 説明 / 说明 | デフォルト |
|---|---|---|
| `YAMATO_CALC_BASE_URL` | ヤマト仕分けコード計算 API | `https://yamato-calc.nexand.org` |

### フロントエンドビルド引数 / 前端构建参数

| 変数名 | 説明 / 说明 | デフォルト |
|---|---|---|
| `VITE_BACKEND_ORIGIN` | バックエンド URL（空＝同一オリジン） | `""` |
| `VITE_BACKEND_API_PREFIX` | API パスプレフィックス | `/api` |

---

## 5. SSL/TLS 設定 / SSL/TLS 配置

### Option A: Let's Encrypt + Nginx

```nginx
server {
    listen 443 ssl http2;
    server_name zelix-wms.com;

    ssl_certificate     /etc/letsencrypt/live/zelix-wms.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/zelix-wms.com/privkey.pem;

    # API バックエンド / API 后端
    location /api/ {
        proxy_pass http://backend:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 倉庫端フロントエンド / 仓库端前端
    location / {
        proxy_pass http://frontend:80;
    }
}

# HTTP → HTTPS リダイレクト / HTTP → HTTPS 重定向
server {
    listen 80;
    server_name zelix-wms.com;
    return 301 https://$host$request_uri;
}
```

```bash
# Let's Encrypt 証明書取得 / 获取证书
certbot --nginx -d zelix-wms.com -d admin.zelix-wms.com -d portal.zelix-wms.com

# 自動更新（cron） / 自动续期
0 0 * * * certbot renew --quiet
```

### Option B: Cloudflare

Cloudflare をリバースプロキシとして使用し、SSL を自動管理。
使用 Cloudflare 作为反向代理，自动管理 SSL。

- DNS を Cloudflare に向ける / 将 DNS 指向 Cloudflare
- SSL モード: **Full (Strict)**
- Origin Certificate をサーバーにインストール / 在服务器安装 Origin 证书

---

## 6. ドメイン設定 / 域名配置

### 推奨構成 / 推荐配置

| ドメイン / 域名 | 用途 / 用途 | プロキシ先 / 代理目标 |
|---|---|---|
| `zelix-wms.com` | 倉庫端 + API / 仓库端 + API | frontend + backend |
| `admin.zelix-wms.com` | 管理ダッシュボード / 管理后台 | admin |
| `portal.zelix-wms.com` | 顧客ポータル / 客户门户 | portal |

### DNS レコード / DNS 记录

```
zelix-wms.com          A     <server-ip>
admin.zelix-wms.com    A     <server-ip>
portal.zelix-wms.com   A     <server-ip>
```

### CORS 設定 / CORS 配置

```bash
CORS_ORIGINS=https://zelix-wms.com,https://admin.zelix-wms.com,https://portal.zelix-wms.com
```

---

## 7. 起動シーケンス / 启动顺序

サービスの起動には依存関係がある。以下の順序で起動すること。
服务启动有依赖关系，须按以下顺序启动。

```
1. PostgreSQL  ──► ヘルスチェック通過まで待機 / 等待健康检查通过
2. MongoDB     ──► ヘルスチェック通過まで待機（移行期間）
3. Redis       ──► ヘルスチェック通過まで待機
4. Backend     ──► DB マイグレーション実行 → API サーバー起動
5. Frontend    ──► Backend の起動後
6. Admin       ──► Backend の起動後
7. Portal      ──► Backend の起動後
```

依存関係図 / 依赖关系图:

```
frontend ──┐
admin   ───┤──► backend ──► postgres (service_healthy)
portal  ───┘              ├──► mongo (service_healthy) [移行期間 / 迁移期间]
                          └──► redis (service_healthy)
```

---

## 8. スケーリング / 扩缩容

### 水平スケーリング（バックエンド） / 水平扩缩（后端）

NestJS バックエンドはステートレスに設計されており、水平スケーリングが可能。
NestJS 后端设计为无状态，可以水平扩缩。

```bash
# Docker Compose でレプリカ数指定 / 指定副本数
docker compose up -d --scale backend=3
```

### コネクションプーリング（pgBouncer） / 连接池（pgBouncer）

複数バックエンドインスタンスが PostgreSQL に接続する場合、pgBouncer を使用。
多个后端实例连接 PostgreSQL 时，使用 pgBouncer。

```yaml
pgbouncer:
  image: edoburu/pgbouncer:latest
  environment:
    DATABASE_URL: postgresql://zelixwms:password@postgres:5432/zelixwms
    POOL_MODE: transaction
    DEFAULT_POOL_SIZE: 20
    MAX_CLIENT_CONN: 100
  ports: ["6432:6432"]
```

| パラメータ / 参数 | 推奨値 / 推荐值 | 説明 / 说明 |
|---|---|---|
| `POOL_MODE` | `transaction` | トランザクション単位でプーリング / 按事务池化 |
| `DEFAULT_POOL_SIZE` | `20` | DB への同時接続数 / 到 DB 的并发连接数 |
| `MAX_CLIENT_CONN` | `100` | クライアント最大接続数 / 客户端最大连接数 |

### Supabase のスケーリング / Supabase 扩缩

Supabase は組み込みのコネクションプーリング（Supavisor）を提供。
Supabase 提供内置连接池（Supavisor）。

- Supabase Dashboard → Settings → Database → Connection Pooling を有効化
- Transaction mode を推奨 / 推荐 Transaction 模式

---

## 9. CI/CD パイプライン / CI/CD 流水线

GitHub Actions で自動化。`.github/workflows/ci.yml` で定義。
使用 GitHub Actions 自动化，定义在 `.github/workflows/ci.yml`。

### パイプラインフロー / 流水线流程

```
┌─────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Push /  │────▶│  Build   │────▶│   Test   │────▶│  Deploy  │
│   PR     │     │          │     │          │     │          │
└─────────┘     └──────────┘     └──────────┘     └──────────┘
```

### トリガー / 触发条件

| イベント / 事件 | ブランチ / 分支 | 実行ジョブ / 执行任务 |
|---|---|---|
| `push` | `main`, `develop` | build → test |
| `pull_request` | `main` | build → test |
| `push` (main のみ) | `main` | build → test → deploy |

### test ジョブ / 测试任务

1. `actions/checkout@v4`
2. `actions/setup-node@v4` (Node 20, npm cache)
3. `npm ci`
4. Backend: `npx tsc --noEmit`（型チェック / 类型检查）
5. Backend: `npx vitest run`（ユニットテスト / 单元测试）
6. Frontend: `npx vitest run`（ユニットテスト）
7. Frontend / Admin / Portal: `npx vue-tsc --build`（型チェック）

### build ジョブ / 构建任务

1. Backend: `npm run build`（TypeScript → JavaScript）
2. Frontend / Admin / Portal: `npm run build`（Vite ビルド / 构建）
3. Docker イメージビルド + レジストリプッシュ / 构建 Docker 镜像并推送到仓库

### deploy ジョブ / 部署任务

| 対象 / 目标 | 方法 / 方式 | 備考 / 备注 |
|---|---|---|
| Docker Compose | SSH + `docker compose pull && docker compose up -d` | Option A |
| Cloud Run | `gcloud run deploy` | Option B |
| Vercel | `vercel --prod` (自動) | フロントエンド / 前端 |

### 同一ブランチの重複実行はキャンセル / 同一分支重复执行自动取消

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

---

## 参考ファイル / 参考文件

| ファイル / 文件 | 説明 / 说明 |
|---|---|
| `docker-compose.yml` | Docker 構成定義（開発用）/ Docker 配置（开发用） |
| `docker-compose.prod.yml` | Docker 構成定義（本番用）/ Docker 配置（生产用） |
| `.github/workflows/ci.yml` | CI/CD パイプライン定義 / 流水线定义 |
| `backend/.env.example` | 環境変数テンプレート / 环境变量模板 |
| `backend/src/config/` | 環境変数読み込み・バリデーション / 环境变量加载和验证 |
| `backend/drizzle.config.ts` | Drizzle ORM マイグレーション設定 / 迁移配置 |
