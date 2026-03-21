# ZELIXWMS 部署拓扑 / デプロイメントトポロジー

> 生产级部署架构、环境配置、CI/CD 流水线、灾难恢复的完整参考文档。
> 本番レベルのデプロイアーキテクチャ、環境設定、CI/CD パイプライン、災害復旧の完全リファレンス。

---

## 目次 / 目次

1. [部署拓扑图 / デプロイメントトポロジー図](#1-部署拓扑图--デプロイメントトポロジー図)
2. [环境矩阵 / 環境マトリックス](#2-环境矩阵--環境マトリックス)
3. [Docker 配置全集 / Docker 設定コレクション](#3-docker-配置全集--docker-設定コレクション)
4. [Supabase 配置 / Supabase 設定](#4-supabase-配置--supabase-設定)
5. [CI/CD 完整流水线 / CI/CD 完全パイプライン](#5-cicd-完整流水线--cicd-完全パイプライン)
6. [域名与 SSL / ドメインと SSL](#6-域名与-ssl--ドメインと-ssl)
7. [自动伸缩策略 / オートスケーリング戦略](#7-自动伸缩策略--オートスケーリング戦略)
8. [灾难恢复 / 災害復旧](#8-灾难恢复--災害復旧)

---

## 1. 部署拓扑图 / デプロイメントトポロジー図

### 1.1 生产架构全景 / 本番アーキテクチャ全景

```mermaid
graph TB
    subgraph clients["客户端 / クライアント"]
        browser["浏览器 / ブラウザ"]
        mobile["移动端 / モバイル"]
    end

    subgraph cdn["CDN 层 / CDN レイヤー"]
        cf["Cloudflare CDN<br/>DDoS 防护 / 保護<br/>WAF + Rate Limiting"]
    end

    subgraph dns["DNS 路由 / DNS ルーティング"]
        app_dns["app.zelix.io → Frontend"]
        admin_dns["admin.zelix.io → Admin"]
        portal_dns["portal.zelix.io → Portal"]
        api_dns["api.zelix.io → Backend"]
    end

    subgraph frontend_tier["前端层 / フロントエンド層 (Cloud Run)"]
        fe_app["Frontend<br/>(Nginx + Vue 3 SPA)<br/>仓库端 / 倉庫端"]
        fe_admin["Admin Dashboard<br/>(Nginx + Vue 3 SPA)<br/>管理端 / 管理端"]
        fe_portal["Client Portal<br/>(Nginx + Vue 3 SPA)<br/>客户门户 / 顧客ポータル"]
    end

    subgraph backend_tier["后端层 / バックエンド層 (Cloud Run)"]
        lb["Cloud Run<br/>Load Balancer<br/>ロードバランサー"]
        api1["NestJS API<br/>Replica 1"]
        api2["NestJS API<br/>Replica 2"]
        apiN["NestJS API<br/>Replica N<br/>(2-10 auto-scale)"]
    end

    subgraph worker_tier["Worker 层 / ワーカー層 (Cloud Run Jobs)"]
        w1["BullMQ Worker<br/>shipment-export"]
        w2["BullMQ Worker<br/>csv-import"]
        w3["BullMQ Worker<br/>notification"]
        w4["BullMQ Worker<br/>billing-calc"]
    end

    subgraph data_tier["数据层 / データ層"]
        subgraph supabase["Supabase Platform"]
            pg["PostgreSQL 16<br/>(Supavisor Connection Pooler)<br/>主数据库 / メインDB"]
            auth["Supabase Auth<br/>JWT + OAuth"]
            storage["Supabase Storage<br/>(S3 互换 / 互換)<br/>文件存储 / ファイルストレージ"]
            realtime["Supabase Realtime<br/>WebSocket 订阅 / サブスクリプション"]
        end
        redis["Redis 7<br/>(Upstash Serverless)<br/>Cache + BullMQ Queue"]
    end

    subgraph monitoring["监控层 / 監視層"]
        gcp_mon["Cloud Monitoring<br/>+ Cloud Logging"]
        alerts["Alert Policies<br/>Slack / Email 通知"]
    end

    subgraph cicd["CI/CD (GitHub Actions)"]
        ga["GitHub Actions<br/>Build → Test → Deploy"]
        gcr["Artifact Registry<br/>(Docker Images)"]
    end

    browser --> cf
    mobile --> cf
    cf --> app_dns
    cf --> admin_dns
    cf --> portal_dns
    cf --> api_dns
    app_dns --> fe_app
    admin_dns --> fe_admin
    portal_dns --> fe_portal
    api_dns --> lb
    lb --> api1
    lb --> api2
    lb --> apiN
    api1 --> pg
    api2 --> pg
    apiN --> pg
    api1 --> redis
    api2 --> redis
    apiN --> redis
    api1 --> auth
    api1 --> storage
    api1 --> realtime
    redis --> w1
    redis --> w2
    redis --> w3
    redis --> w4
    w1 --> pg
    w2 --> pg
    w3 --> pg
    w4 --> pg
    api1 --> gcp_mon
    gcp_mon --> alerts
    ga --> gcr
    gcr --> backend_tier
    gcr --> frontend_tier
```

### 1.2 请求流向 / リクエストフロー

```mermaid
sequenceDiagram
    participant C as Client
    participant CF as Cloudflare CDN
    participant LB as Cloud Run LB
    participant API as NestJS API
    participant Cache as Redis
    participant DB as PostgreSQL
    participant Auth as Supabase Auth
    participant RT as Supabase Realtime

    C->>CF: HTTPS Request
    CF->>CF: WAF Check + DDoS Protection
    CF->>LB: Forward (SSL termination)
    LB->>API: Route to healthy replica

    alt 认证请求 / 認証リクエスト
        API->>Auth: Verify JWT
        Auth-->>API: User context + tenant_id
    end

    alt 缓存命中 / キャッシュヒット
        API->>Cache: GET cache key
        Cache-->>API: Cached response
        API-->>C: 200 OK (cached)
    else 缓存未中 / キャッシュミス
        API->>DB: Query (with RLS tenant filter)
        DB-->>API: Result set
        API->>Cache: SET cache key (TTL)
        API-->>C: 200 OK
    end

    opt 实时通知 / リアルタイム通知
        API->>RT: Broadcast change
        RT-->>C: WebSocket push
    end
```

### 1.3 网络拓扑 / ネットワークトポロジー

```mermaid
graph LR
    subgraph public["公共网络 / パブリックネットワーク"]
        inet["Internet"]
    end

    subgraph edge["边缘层 / エッジ層"]
        cf["Cloudflare<br/>PoP (Global)"]
    end

    subgraph vpc["VPC (asia-northeast1)"]
        subgraph public_subnet["公共子网 / パブリックサブネット"]
            cr_fe["Cloud Run<br/>Frontend Services"]
            cr_api["Cloud Run<br/>API Services"]
        end

        subgraph private_subnet["私有子网 / プライベートサブネット"]
            vpc_conn["VPC Connector<br/>(Serverless)"]
        end
    end

    subgraph managed["托管服务 / マネージドサービス"]
        supa["Supabase<br/>(ap-northeast-1)"]
        upstash["Upstash Redis<br/>(ap-northeast-1)"]
    end

    inet --> cf
    cf --> cr_fe
    cf --> cr_api
    cr_api --> vpc_conn
    vpc_conn --> supa
    vpc_conn --> upstash
```

---

## 2. 环境矩阵 / 環境マトリックス

### 2.1 环境概览 / 環境一覧

| 属性 / 属性 | Development | Staging | Production |
|---|---|---|---|
| **部署方式 / デプロイ方式** | Docker Compose (本地 / ローカル) | Cloud Run (单副本 / 単一レプリカ) | Cloud Run (自动伸缩 / オートスケーリング) |
| **数据库 / データベース** | PostgreSQL 15 (Docker) | Supabase Free/Pro | Supabase Pro |
| **Redis** | Redis 7 (Docker) | Upstash Free | Upstash Pro |
| **副本数 / レプリカ数** | 1 | 1 | 2-10 (auto) |
| **CPU / メモリ** | 本地资源 / ローカルリソース | 1 vCPU / 512 MB | 2 vCPU / 1 GB |
| **域名 / ドメイン** | localhost:4000-4003 | staging.zelix.io | app/api/admin/portal.zelix.io |
| **SSL** | 无 / なし (HTTP) | Cloudflare (自动 / 自動) | Cloudflare (Full Strict) |
| **监控 / 監視** | 控制台日志 / コンソールログ | Cloud Logging | Cloud Monitoring + Alerts |
| **备份 / バックアップ** | 无 / なし | 日次 / 毎日 (7日保持) | 日次 + PITR (7日) |
| **CI/CD 触发 / トリガー** | 手动 / 手動 | PR merge to develop | PR merge to main + 手動承認 |

### 2.2 开发环境详细 / 開発環境詳細

```yaml
# 开发环境端口映射 / 開発環境ポートマッピング
Services:
  Backend (NestJS):    localhost:4000  # Hot reload (nodemon)
  Frontend (Vite):     localhost:4001  # HMR enabled
  Portal (Vite):       localhost:4002  # HMR enabled
  Admin (Vite):        localhost:4003  # HMR enabled
  PostgreSQL:          localhost:5432  # Direct access for debugging
  MongoDB:             localhost:27017 # 迁移期间 / 移行期間
  Redis:               localhost:6379  # Direct access for debugging
```

### 2.3 Staging 环境详细 / ステージング環境詳細

| 组件 / コンポーネント | 配置 / 設定 |
|---|---|
| **Cloud Run** | Region: `asia-northeast1`, 1 replica, 1 vCPU, 512MB |
| **Supabase** | Project: `zelixwms-staging`, Region: `ap-northeast-1` |
| **Upstash Redis** | Region: `ap-northeast-1`, maxmemory: 256MB |
| **DNS** | `staging-api.zelix.io`, `staging-app.zelix.io` |
| **Secrets** | GCP Secret Manager (staging namespace) |

### 2.4 生产环境详细 / 本番環境詳細

| 组件 / コンポーネント | 配置 / 設定 |
|---|---|
| **Cloud Run** | Region: `asia-northeast1`, 2-10 replicas, 2 vCPU, 1GB |
| **Supabase** | Project: `zelixwms-production`, Region: `ap-northeast-1`, Pro Plan |
| **Upstash Redis** | Region: `ap-northeast-1`, maxmemory: 1GB, Read Replicas |
| **DNS** | `api.zelix.io`, `app.zelix.io`, `admin.zelix.io`, `portal.zelix.io` |
| **Secrets** | GCP Secret Manager (production namespace) |
| **Backup** | Daily snapshot + PITR 7-day, monthly restore test |

---

## 3. Docker 配置全集 / Docker 設定コレクション

### 3.1 Backend Dockerfile (多阶段构建 / マルチステージビルド)

```dockerfile
# ============================================================
# ZELIXWMS Backend - Production Dockerfile
# 多阶段构建: 依赖安装 → 构建 → 本番镜像
# マルチステージビルド: 依存関係インストール → ビルド → 本番イメージ
# ============================================================

# ── Stage 1: 依赖安装 / 依存関係インストール ──
FROM node:20-alpine AS deps
WORKDIR /app

# 仅复制 package 文件以利用缓存 / package ファイルのみコピーしてキャッシュ活用
COPY package.json package-lock.json ./
RUN npm ci --production=false

# ── Stage 2: 构建 / ビルド ──
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# TypeScript 编译 / TypeScript コンパイル
RUN npm run build

# 仅安装生产依赖 / 本番依存関係のみインストール
RUN npm ci --production --ignore-scripts && \
    npm cache clean --force

# ── Stage 3: 本番镜像 / 本番イメージ ──
FROM node:20-alpine AS runner
WORKDIR /app

# 安全性: 非 root 用户 / セキュリティ: 非 root ユーザー
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs
USER nestjs

# 复制构建产物和生产依赖 / ビルド成果物と本番依存関係をコピー
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./

# 环境变量 / 環境変数
ENV NODE_ENV=production
ENV PORT=4000
ENV HOST=0.0.0.0

EXPOSE 4000

# ヘルスチェック / 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD ["node", "-e", "fetch('http://localhost:4000/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"]

CMD ["node", "dist/main.js"]
```

### 3.2 Frontend Dockerfile (多阶段构建 / マルチステージビルド)

```dockerfile
# ============================================================
# ZELIXWMS Frontend - Production Dockerfile
# 适用于: frontend / admin / portal (共用同一模板)
# 適用: frontend / admin / portal (共通テンプレート)
# ============================================================

# ── Stage 1: 构建 / ビルド ──
FROM node:20-alpine AS builder
WORKDIR /app

# 构建参数 / ビルド引数
ARG VITE_BACKEND_ORIGIN=""
ARG VITE_BACKEND_API_PREFIX=/api

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: Nginx 配信 / 配信 ──
FROM nginx:1.27-alpine AS runner

# 安全性: 删除默认页面 / セキュリティ: デフォルトページ削除
RUN rm -rf /usr/share/nginx/html/*

# 复制构建产物 / ビルド成果物コピー
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx 配置 (SPA 路由支持) / Nginx 設定 (SPA ルーティング対応)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 安全性: 非 root / セキュリティ: 非 root
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD ["wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:80/", "||", "exit", "1"]

CMD ["nginx", "-g", "daemon off;"]
```

### 3.3 docker-compose.yml (本地开发 / ローカル開発)

```yaml
# ============================================================
# Docker Compose - ZELIXWMS 本地开发环境 / ローカル開発環境
# ============================================================
# 用法 / 使い方:
#   docker compose up -d          # 启动全服务 / 全サービス起動
#   docker compose down           # 停止全服务 / 全サービス停止
#   docker compose logs -f api    # 查看日志 / ログ確認
# ============================================================

services:
  # ── 数据库: PostgreSQL / データベース: PostgreSQL ──
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: zelixwms
      POSTGRES_USER: zelixwms
      POSTGRES_PASSWORD: zelixwms_dev
      POSTGRES_INITDB_ARGS: "--encoding=UTF-8 --locale=ja_JP.UTF-8"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U zelixwms"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 10s
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M
    networks:
      - zelixwms-dev

  # ── 旧数据库: MongoDB (迁移期间) / レガシーDB: MongoDB (移行期間) ──
  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 10s
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 1G
    networks:
      - zelixwms-dev

  # ── 缓存 + 队列: Redis / キャッシュ + キュー: Redis ──
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: >
      redis-server
        --appendonly yes
        --maxmemory 256mb
        --maxmemory-policy allkeys-lru
        --requirepass zelixwms_dev
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "zelixwms_dev", "ping"]
      interval: 15s
      timeout: 5s
      retries: 3
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 256M
    networks:
      - zelixwms-dev

  # ── 邮件测试: Mailpit / メールテスト: Mailpit ──
  mailpit:
    image: axllent/mailpit:latest
    ports:
      - "1025:1025"  # SMTP
      - "8025:8025"  # Web UI
    restart: unless-stopped
    networks:
      - zelixwms-dev

networks:
  zelixwms-dev:
    driver: bridge

volumes:
  postgres-data:
  mongo-data:
  redis-data:
```

### 3.4 docker-compose.staging.yml (Staging 环境 / ステージング環境)

```yaml
# ============================================================
# Docker Compose - ZELIXWMS Staging 环境 / ステージング環境
# ============================================================
# 注意: Staging 使用 Supabase 托管 PostgreSQL + Upstash Redis
# 注意: Staging は Supabase マネージド PostgreSQL + Upstash Redis を使用
# ============================================================

services:
  # ── 后端 API / バックエンド API ──
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=staging
      - PORT=4000
      - HOST=0.0.0.0
      - DATABASE_URL=${DATABASE_URL}
      - DATABASE_SSL=true
      - DATABASE_POOL_MIN=2
      - DATABASE_POOL_MAX=10
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
      - SESSION_SECRET=${SESSION_SECRET}
      - CORS_ORIGINS=https://staging-app.zelix.io,https://staging-admin.zelix.io,https://staging-portal.zelix.io
      - BULL_QUEUE_PREFIX=wms-staging
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://localhost:4000/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 20s
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 512M
    networks:
      - zelixwms-staging

  # ── BullMQ Worker / BullMQ ワーカー ──
  worker:
    build:
      context: ./backend
      dockerfile: Dockerfile
    command: ["node", "dist/worker.js"]
    environment:
      - NODE_ENV=staging
      - DATABASE_URL=${DATABASE_URL}
      - DATABASE_SSL=true
      - REDIS_URL=${REDIS_URL}
      - BULL_QUEUE_PREFIX=wms-staging
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: "0.5"
          memory: 256M
    networks:
      - zelixwms-staging

  # ── 仓库端前端 / 倉庫フロントエンド ──
  frontend:
    build:
      context: ./frontend
      args:
        VITE_BACKEND_ORIGIN: https://staging-api.zelix.io
        VITE_BACKEND_API_PREFIX: /api
    ports:
      - "3000:80"
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 128M
    networks:
      - zelixwms-staging

  # ── 管理端 / 管理ダッシュボード ──
  admin:
    build:
      context: ./admin
      args:
        VITE_BACKEND_ORIGIN: https://staging-api.zelix.io
        VITE_BACKEND_API_PREFIX: /api
    ports:
      - "3001:80"
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 128M
    networks:
      - zelixwms-staging

  # ── 客户门户 / 顧客ポータル ──
  portal:
    build:
      context: ./portal
      args:
        VITE_BACKEND_ORIGIN: https://staging-api.zelix.io
        VITE_BACKEND_API_PREFIX: /api
    ports:
      - "3002:80"
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 128M
    networks:
      - zelixwms-staging

  # ── 反向代理 / リバースプロキシ ──
  nginx:
    image: nginx:1.27-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./infra/nginx/staging.conf:/etc/nginx/conf.d/default.conf:ro
      - ./infra/ssl:/etc/nginx/ssl:ro
    depends_on:
      - backend
      - frontend
      - admin
      - portal
    restart: unless-stopped
    networks:
      - zelixwms-staging

networks:
  zelixwms-staging:
    driver: bridge
```

### 3.5 docker-compose.production.yml (生产环境 / 本番環境)

```yaml
# ============================================================
# Docker Compose - ZELIXWMS 生产环境 / 本番環境
# ============================================================
# 注意: 生产环境推荐使用 Cloud Run，此文件用于单服务器部署场景
# 注意: 本番は Cloud Run 推奨、このファイルは単一サーバーデプロイ用
# ============================================================

services:
  # ── 后端 API (多副本) / バックエンド API (複数レプリカ) ──
  backend:
    image: ${REGISTRY}/zelixwms-backend:${TAG:-latest}
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
      - PORT=4000
      - HOST=0.0.0.0
      - DATABASE_URL=${DATABASE_URL}
      - DATABASE_SSL=true
      - DATABASE_POOL_MIN=2
      - DATABASE_POOL_MAX=20
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
      - SESSION_SECRET=${SESSION_SECRET}
      - CORS_ORIGINS=https://app.zelix.io,https://admin.zelix.io,https://portal.zelix.io
      - BULL_QUEUE_PREFIX=wms-prod
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://localhost:4000/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"]
      interval: 15s
      timeout: 10s
      retries: 5
      start_period: 30s
    restart: always
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: "2.0"
          memory: 1G
        reservations:
          cpus: "0.5"
          memory: 256M
      update_config:
        parallelism: 1
        delay: 30s
        order: start-first
        failure_action: rollback
      rollback_config:
        parallelism: 1
        delay: 10s
    networks:
      - zelixwms-prod

  # ── BullMQ Worker / BullMQ ワーカー ──
  worker:
    image: ${REGISTRY}/zelixwms-backend:${TAG:-latest}
    command: ["node", "dist/worker.js"]
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - DATABASE_SSL=true
      - REDIS_URL=${REDIS_URL}
      - BULL_QUEUE_PREFIX=wms-prod
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
    restart: always
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: "1.0"
          memory: 512M
    networks:
      - zelixwms-prod

  # ── 仓库端前端 / 倉庫フロントエンド ──
  frontend:
    image: ${REGISTRY}/zelixwms-frontend:${TAG:-latest}
    restart: always
    deploy:
      resources:
        limits:
          memory: 128M
    networks:
      - zelixwms-prod

  # ── 管理端 / 管理ダッシュボード ──
  admin:
    image: ${REGISTRY}/zelixwms-admin:${TAG:-latest}
    restart: always
    deploy:
      resources:
        limits:
          memory: 128M
    networks:
      - zelixwms-prod

  # ── 客户门户 / 顧客ポータル ──
  portal:
    image: ${REGISTRY}/zelixwms-portal:${TAG:-latest}
    restart: always
    deploy:
      resources:
        limits:
          memory: 128M
    networks:
      - zelixwms-prod

  # ── Nginx 反向代理 + SSL / リバースプロキシ + SSL ──
  nginx:
    image: nginx:1.27-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./infra/nginx/production.conf:/etc/nginx/conf.d/default.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - backend
      - frontend
      - admin
      - portal
    restart: always
    deploy:
      resources:
        limits:
          memory: 128M
    networks:
      - zelixwms-prod

networks:
  zelixwms-prod:
    driver: bridge
```

### 3.6 .dockerignore

```dockerignore
# ── Git / バージョン管理 ──
.git
.gitignore

# ── 依赖 / 依存関係 ──
node_modules
npm-debug.log*

# ── 构建产物 / ビルド成果物 ──
dist
build
.next

# ── 开发文件 / 開発ファイル ──
.env
.env.*
!.env.example
*.md
docs/
tests/
__tests__
*.test.ts
*.spec.ts
coverage/
.nyc_output

# ── IDE ──
.vscode
.idea
*.swp
*.swo
.DS_Store

# ── Docker ──
Dockerfile
docker-compose*.yml
.dockerignore

# ── CI/CD ──
.github
.gitlab-ci.yml
```

---

## 4. Supabase 配置 / Supabase 設定

### 4.1 项目设置清单 / プロジェクトセットアップチェックリスト

```markdown
# Supabase 项目初始化 / プロジェクト初期化

## 基础设置 / 基本設定
- [ ] 创建 Supabase 项目 / Supabase プロジェクト作成
  - Organization: ZELIX
  - Project name: zelixwms-{environment}
  - Region: ap-northeast-1 (Tokyo)
  - Database password: 使用强密码生成器 / 強力なパスワードを生成
  - Pricing plan: Pro (production) / Free (staging)

## 认证设置 / 認証設定
- [ ] JWT Secret 记录并存储到 Secret Manager / JWT Secret を Secret Manager に保存
- [ ] JWT expiry: 3600s (1 hour)
- [ ] Refresh token rotation: enabled
- [ ] Email confirmations: enabled (production)
- [ ] Password minimum length: 12
- [ ] 配置 SMTP / SMTP 設定 (自定义邮件模板 / カスタムメールテンプレート)

## Auth Providers / 認証プロバイダ
- [ ] Email/Password: enabled
- [ ] OAuth (Google): 按需配置 / 必要に応じて設定
- [ ] Redirect URLs:
  - Production:
    - https://app.zelix.io/auth/callback
    - https://admin.zelix.io/auth/callback
    - https://portal.zelix.io/auth/callback
  - Staging:
    - https://staging-app.zelix.io/auth/callback
  - Development:
    - http://localhost:4001/auth/callback
    - http://localhost:4002/auth/callback
    - http://localhost:4003/auth/callback

## 数据库设置 / データベース設定
- [ ] Connection Pooler (Supavisor): Transaction mode, Pool size: 50
- [ ] SSL enforcement: enabled
- [ ] Network restrictions: 仅允许 Cloud Run IP / Cloud Run IP のみ許可
- [ ] Extensions:
  - uuid-ossp (UUID 生成)
  - pg_trgm (模糊搜索 / あいまい検索)
  - btree_gist (排他约束 / 排他制約)

## RLS 策略 / RLS ポリシー
- [ ] 全テーブルに RLS 有効化 / 全テーブルで RLS を有効化
- [ ] テナント分離ポリシー適用 / テナント分離ポリシーを適用
- [ ] Service Role Key は backend のみ使用 / バックエンドのみ使用

## ストレージ設定 / 存储设置
- [ ] バケット作成 / バケット作成:
  - `shipment-labels` (出荷ラベル / 发货标签): 10MB max, image/*, application/pdf
  - `product-images` (商品画像 / 商品图片): 5MB max, image/*
  - `csv-imports` (CSVインポート / CSV导入): 50MB max, text/csv, application/vnd.ms-excel
  - `documents` (書類 / 文档): 20MB max, application/pdf, image/*
  - `exports` (エクスポート / 导出): 100MB max, * (一時保存 / 临时存储)
- [ ] 各バケットに RLS ポリシー設定 / 各バケットに RLS を設定
- [ ] テナントごとのフォルダ分離 / テナントごとのフォルダ分離: `{bucket}/{tenant_id}/...`

## Realtime 設定 / 实时配置
- [ ] 有効化するテーブル / 有効化するテーブル:
  - shipment_orders (出荷ステータス変更 / 发货状态变更)
  - notifications (通知)
  - tasks (作業タスク / 工作任务)
  - inbound_orders (入庫ステータス / 入库状态)
- [ ] Broadcast: enabled (カスタムイベント / 自定义事件)
- [ ] Presence: enabled (オンラインユーザー表示 / 在线用户展示)
- [ ] RLS 経由のフィルタリング / RLS を通じたフィルタリング

## バックアップ設定 / 备份设置
- [ ] Daily automatic backups: enabled
- [ ] Point-in-Time Recovery (PITR): enabled (Pro plan)
  - 保持期間 / 保留期间: 7 days
- [ ] 月次リストアテスト / 月次復元テスト: スケジュール設定済み
```

### 4.2 RLS 策略部署脚本 / RLS ポリシーデプロイスクリプト

```sql
-- ============================================================
-- ZELIXWMS RLS ポリシー / RLS 策略
-- 全テーブルにテナント分離を適用 / 全表应用租户隔离
-- ============================================================

-- 共通: JWT からテナント ID を取得する関数 / JWT からテナント ID を取得
CREATE OR REPLACE FUNCTION auth.tenant_id()
RETURNS uuid AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 共通: ユーザーロールを取得する関数 / 获取用户角色
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS text AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'role',
    'anonymous'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ── products テーブルの例 / products 表示例 ──
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- SELECT: 同一テナントのデータのみ / 同一租户数据
CREATE POLICY "tenant_isolation_select" ON products
  FOR SELECT USING (tenant_id = auth.tenant_id());

-- INSERT: テナント ID を自動設定 / 自动设置租户 ID
CREATE POLICY "tenant_isolation_insert" ON products
  FOR INSERT WITH CHECK (tenant_id = auth.tenant_id());

-- UPDATE: 同一テナントのデータのみ / 同一租户数据
CREATE POLICY "tenant_isolation_update" ON products
  FOR UPDATE USING (tenant_id = auth.tenant_id());

-- DELETE: 管理者のみ / 管理者のみ
CREATE POLICY "tenant_isolation_delete" ON products
  FOR DELETE USING (
    tenant_id = auth.tenant_id()
    AND auth.user_role() IN ('admin', 'manager')
  );

-- Service Role はすべてバイパス / Service Role 绕过所有策略
-- (backend が service_role_key で接続するため)
-- (因为后端使用 service_role_key 连接)
```

### 4.3 Connection Pooler 设置 / Connection Pooler 設定

```
# Supabase Dashboard → Settings → Database → Connection Pooling

Mode:           Transaction    # 推荐 / 推奨 (NestJS + Drizzle 互換)
Pool Size:      50             # 同时接続数 / 同時接続数
                               # Pro plan 默认 / デフォルト: 50
Connection URL: postgresql://[user].[project-ref]:[password]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres

# 直接连接 (迁移用) / 直接接続 (マイグレーション用)
Direct URL:     postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
```

---

## 5. CI/CD 完整流水线 / CI/CD 完全パイプライン

### 5.1 流水线全景 / パイプライン全景

```mermaid
graph LR
    subgraph pr["PR Pipeline"]
        lint["Lint<br/>ESLint"]
        tc["TypeCheck<br/>tsc + vue-tsc"]
        ut["Unit Test<br/>Vitest"]
        build["Build<br/>All apps"]
        sec["Security<br/>npm audit"]
    end

    subgraph staging_pipe["Staging Pipeline"]
        pr_pass["PR Pipeline<br/>通过 / パス"]
        deploy_stg["Deploy<br/>Staging"]
        e2e["E2E Test<br/>Playwright"]
    end

    subgraph prod_pipe["Production Pipeline"]
        stg_pass["Staging<br/>通过 / パス"]
        approval["Manual<br/>Approval<br/>手動承認"]
        bg_deploy["Blue-Green<br/>Deploy"]
        smoke["Smoke Test<br/>スモークテスト"]
    end

    subgraph rollback_pipe["Rollback"]
        rb["One-Click<br/>Rollback<br/>ワンクリック"]
    end

    lint --> tc --> ut --> build --> sec
    sec --> pr_pass --> deploy_stg --> e2e
    e2e --> stg_pass --> approval --> bg_deploy --> smoke
    smoke -.->|失败 / 失敗| rb
```

### 5.2 PR Pipeline (ci.yml)

```yaml
# ============================================================
# PR Pipeline: lint → typecheck → unit test → build → security scan
# PR パイプライン: リント → 型チェック → 単体テスト → ビルド → セキュリティスキャン
# ============================================================

name: PR Pipeline

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [develop]

concurrency:
  group: pr-${{ github.head_ref || github.ref }}
  cancel-in-progress: true

jobs:
  # ════════════════════════════════════════
  # Lint / リント
  # ════════════════════════════════════════
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - name: Backend - ESLint
        run: npx eslint --ext .ts src
        working-directory: backend
      - name: Frontend - ESLint
        run: npx eslint src
        working-directory: frontend

  # ════════════════════════════════════════
  # TypeCheck / 型チェック / 类型检查
  # ════════════════════════════════════════
  typecheck:
    name: TypeCheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - name: Backend - TypeCheck
        run: npx tsc --project tsconfig.json --noEmit
        working-directory: backend
      - name: Frontend - TypeCheck
        run: npx vue-tsc --build
        working-directory: frontend
      - name: Admin - TypeCheck
        run: npx vue-tsc --build
        working-directory: admin
      - name: Portal - TypeCheck
        run: npx vue-tsc --build
        working-directory: portal

  # ════════════════════════════════════════
  # Unit Tests / 単体テスト / 单元测试
  # ════════════════════════════════════════
  test:
    name: Unit Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - name: Backend - Unit Tests
        run: npx vitest run --coverage
        working-directory: backend
      - name: Frontend - Unit Tests
        run: npx vitest run
        working-directory: frontend
      - name: Upload Coverage
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: backend/coverage/

  # ════════════════════════════════════════
  # Build / ビルド / 构建
  # ════════════════════════════════════════
  build:
    name: Build All
    runs-on: ubuntu-latest
    needs: [lint, typecheck, test]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - name: Backend - Build
        run: npm run build
        working-directory: backend
      - name: Frontend - Build
        run: npm run build-only
        working-directory: frontend
      - name: Admin - Build
        run: npm run build
        working-directory: admin
      - name: Portal - Build
        run: npm run build
        working-directory: portal

  # ════════════════════════════════════════
  # Security Scan / セキュリティスキャン / 安全扫描
  # ════════════════════════════════════════
  security:
    name: Security Scan
    runs-on: ubuntu-latest
    needs: [build]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci

      # npm audit / 依赖漏洞扫描 / 依存関係脆弱性スキャン
      - name: npm audit (backend)
        run: npm audit --audit-level=high --omit=dev
        working-directory: backend
        continue-on-error: true

      # Trivy 容器扫描 / コンテナスキャン
      - name: Build Docker Image
        run: docker build -t zelixwms-backend:scan ./backend

      - name: Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: zelixwms-backend:scan
          format: table
          exit-code: 1
          severity: CRITICAL,HIGH
          ignore-unfixed: true
```

### 5.3 Staging Pipeline (deploy-staging.yml)

```yaml
# ============================================================
# Staging Pipeline: PR 通过后部署到 Staging + E2E 测试
# Staging パイプライン: PR 通過後 Staging にデプロイ + E2E テスト
# ============================================================

name: Deploy Staging

on:
  push:
    branches: [develop]

concurrency:
  group: staging-deploy
  cancel-in-progress: false

env:
  PROJECT_ID: zelixwms
  REGION: asia-northeast1
  REGISTRY: ${{ vars.ARTIFACT_REGISTRY }}

jobs:
  # ════════════════════════════════════════
  # PR Pipeline 再実行 / PR Pipeline 重新执行
  # ════════════════════════════════════════
  pr-checks:
    name: PR Checks
    uses: ./.github/workflows/ci.yml

  # ════════════════════════════════════════
  # Docker ビルド + プッシュ / 构建 + 推送
  # ════════════════════════════════════════
  build-images:
    name: Build & Push Images
    runs-on: ubuntu-latest
    needs: [pr-checks]
    permissions:
      contents: read
      id-token: write

    steps:
      - uses: actions/checkout@v4

      # GCP 認証 / GCP 认证
      - id: auth
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.WIF_PROVIDER }}
          service_account: ${{ secrets.WIF_SA }}

      # Artifact Registry 認証 / 认证
      - uses: google-github-actions/setup-gcloud@v2
      - run: gcloud auth configure-docker ${{ env.REGISTRY }}

      # バックエンドイメージ / 后端镜像
      - name: Build & Push Backend
        run: |
          docker build -t ${{ env.REGISTRY }}/zelixwms-backend:staging-${{ github.sha }} ./backend
          docker push ${{ env.REGISTRY }}/zelixwms-backend:staging-${{ github.sha }}

      # フロントエンドイメージ / 前端镜像
      - name: Build & Push Frontend
        run: |
          docker build \
            --build-arg VITE_BACKEND_ORIGIN=https://staging-api.zelix.io \
            --build-arg VITE_BACKEND_API_PREFIX=/api \
            -t ${{ env.REGISTRY }}/zelixwms-frontend:staging-${{ github.sha }} ./frontend
          docker push ${{ env.REGISTRY }}/zelixwms-frontend:staging-${{ github.sha }}

      # Admin + Portal (同様 / 同样)
      - name: Build & Push Admin
        run: |
          docker build \
            --build-arg VITE_BACKEND_ORIGIN=https://staging-api.zelix.io \
            --build-arg VITE_BACKEND_API_PREFIX=/api \
            -t ${{ env.REGISTRY }}/zelixwms-admin:staging-${{ github.sha }} ./admin
          docker push ${{ env.REGISTRY }}/zelixwms-admin:staging-${{ github.sha }}

      - name: Build & Push Portal
        run: |
          docker build \
            --build-arg VITE_BACKEND_ORIGIN=https://staging-api.zelix.io \
            --build-arg VITE_BACKEND_API_PREFIX=/api \
            -t ${{ env.REGISTRY }}/zelixwms-portal:staging-${{ github.sha }} ./portal
          docker push ${{ env.REGISTRY }}/zelixwms-portal:staging-${{ github.sha }}

  # ════════════════════════════════════════
  # Staging デプロイ / Staging 部署
  # ════════════════════════════════════════
  deploy:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: [build-images]
    environment: staging

    steps:
      - uses: actions/checkout@v4

      - id: auth
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.WIF_PROVIDER }}
          service_account: ${{ secrets.WIF_SA }}

      - uses: google-github-actions/setup-gcloud@v2

      # Backend デプロイ / 后端部署
      - name: Deploy Backend to Cloud Run
        run: |
          gcloud run deploy zelixwms-api-staging \
            --image=${{ env.REGISTRY }}/zelixwms-backend:staging-${{ github.sha }} \
            --region=${{ env.REGION }} \
            --platform=managed \
            --memory=512Mi \
            --cpu=1 \
            --min-instances=0 \
            --max-instances=1 \
            --port=4000 \
            --set-env-vars="NODE_ENV=staging" \
            --set-secrets="DATABASE_URL=zelixwms-staging-database-url:latest,JWT_SECRET=zelixwms-staging-jwt-secret:latest,REDIS_URL=zelixwms-staging-redis-url:latest,SUPABASE_URL=zelixwms-staging-supabase-url:latest,SUPABASE_SERVICE_ROLE_KEY=zelixwms-staging-supabase-key:latest" \
            --allow-unauthenticated

      # DB マイグレーション / 数据库迁移
      - name: Run Migrations
        run: |
          gcloud run jobs execute zelixwms-migrate-staging \
            --region=${{ env.REGION }} \
            --wait

  # ════════════════════════════════════════
  # E2E テスト / E2E 测试
  # ════════════════════════════════════════
  e2e:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: [deploy]

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install Playwright
        run: |
          cd e2e
          npm ci
          npx playwright install --with-deps chromium

      - name: Run E2E Tests
        run: |
          cd e2e
          npx playwright test --project=chromium
        env:
          BASE_URL: https://staging-app.zelix.io
          API_URL: https://staging-api.zelix.io

      - name: Upload E2E Report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: e2e-report
          path: e2e/playwright-report/
```

### 5.4 Production Pipeline (deploy-production.yml)

```yaml
# ============================================================
# Production Pipeline: Staging 通过 + 手動承認 + Blue-Green Deploy + Smoke Test
# Production パイプライン: Staging パス + 手動承認 + Blue-Green デプロイ + スモークテスト
# ============================================================

name: Deploy Production

on:
  push:
    branches: [main]

concurrency:
  group: production-deploy
  cancel-in-progress: false

env:
  PROJECT_ID: zelixwms
  REGION: asia-northeast1
  REGISTRY: ${{ vars.ARTIFACT_REGISTRY }}

jobs:
  # ════════════════════════════════════════
  # 全テスト再実行 / 全测试重新执行
  # ════════════════════════════════════════
  verify:
    name: Verify All Checks
    uses: ./.github/workflows/ci.yml

  # ════════════════════════════════════════
  # Docker ビルド / Docker 构建
  # ════════════════════════════════════════
  build-images:
    name: Build Production Images
    runs-on: ubuntu-latest
    needs: [verify]
    permissions:
      contents: read
      id-token: write

    steps:
      - uses: actions/checkout@v4

      - id: auth
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.WIF_PROVIDER }}
          service_account: ${{ secrets.WIF_SA }}

      - uses: google-github-actions/setup-gcloud@v2
      - run: gcloud auth configure-docker ${{ env.REGISTRY }}

      - name: Build & Push All Images
        run: |
          TAG="prod-${{ github.sha }}"

          # Backend
          docker build -t ${{ env.REGISTRY }}/zelixwms-backend:${TAG} ./backend
          docker push ${{ env.REGISTRY }}/zelixwms-backend:${TAG}
          docker tag ${{ env.REGISTRY }}/zelixwms-backend:${TAG} ${{ env.REGISTRY }}/zelixwms-backend:latest
          docker push ${{ env.REGISTRY }}/zelixwms-backend:latest

          # Frontend
          docker build \
            --build-arg VITE_BACKEND_ORIGIN=https://api.zelix.io \
            -t ${{ env.REGISTRY }}/zelixwms-frontend:${TAG} ./frontend
          docker push ${{ env.REGISTRY }}/zelixwms-frontend:${TAG}

          # Admin
          docker build \
            --build-arg VITE_BACKEND_ORIGIN=https://api.zelix.io \
            -t ${{ env.REGISTRY }}/zelixwms-admin:${TAG} ./admin
          docker push ${{ env.REGISTRY }}/zelixwms-admin:${TAG}

          # Portal
          docker build \
            --build-arg VITE_BACKEND_ORIGIN=https://api.zelix.io \
            -t ${{ env.REGISTRY }}/zelixwms-portal:${TAG} ./portal
          docker push ${{ env.REGISTRY }}/zelixwms-portal:${TAG}

  # ════════════════════════════════════════
  # 手動承認 / 手动审批
  # ════════════════════════════════════════
  approval:
    name: Manual Approval
    runs-on: ubuntu-latest
    needs: [build-images]
    environment:
      name: production
      # GitHub Environment Protection Rules:
      # - Required reviewers: 1+
      # - Wait timer: 0 (手動のみ / 仅手动)

    steps:
      - name: Approval Gate
        run: echo "Production deployment approved by ${{ github.actor }}"

  # ════════════════════════════════════════
  # Blue-Green デプロイ / Blue-Green 部署
  # ════════════════════════════════════════
  deploy:
    name: Blue-Green Deploy
    runs-on: ubuntu-latest
    needs: [approval]
    environment: production

    steps:
      - uses: actions/checkout@v4

      - id: auth
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.WIF_PROVIDER }}
          service_account: ${{ secrets.WIF_SA }}

      - uses: google-github-actions/setup-gcloud@v2

      # Blue-Green: 新 revision をデプロイ (トラフィック 0%)
      # Blue-Green: 部署新 revision (流量 0%)
      - name: Deploy new revision (no traffic)
        run: |
          TAG="prod-${{ github.sha }}"
          gcloud run deploy zelixwms-api \
            --image=${{ env.REGISTRY }}/zelixwms-backend:${TAG} \
            --region=${{ env.REGION }} \
            --platform=managed \
            --memory=1Gi \
            --cpu=2 \
            --min-instances=2 \
            --max-instances=10 \
            --port=4000 \
            --set-env-vars="NODE_ENV=production" \
            --set-secrets="DATABASE_URL=zelixwms-prod-database-url:latest,JWT_SECRET=zelixwms-prod-jwt-secret:latest,REDIS_URL=zelixwms-prod-redis-url:latest,SUPABASE_URL=zelixwms-prod-supabase-url:latest,SUPABASE_SERVICE_ROLE_KEY=zelixwms-prod-supabase-key:latest" \
            --no-traffic \
            --tag=canary \
            --allow-unauthenticated

      # DB マイグレーション / 数据库迁移
      - name: Run Migrations
        run: |
          gcloud run jobs execute zelixwms-migrate-prod \
            --region=${{ env.REGION }} \
            --wait

      # Canary テスト / 金丝雀测试
      - name: Canary Health Check
        run: |
          CANARY_URL=$(gcloud run services describe zelixwms-api \
            --region=${{ env.REGION }} \
            --format='value(status.traffic[tag=canary].url)')
          echo "Canary URL: ${CANARY_URL}"

          # ヘルスチェック (5 回リトライ) / 健康检查 (5 次重试)
          for i in $(seq 1 5); do
            STATUS=$(curl -s -o /dev/null -w '%{http_code}' "${CANARY_URL}/health")
            if [ "$STATUS" = "200" ]; then
              echo "Health check passed (attempt $i)"
              exit 0
            fi
            echo "Attempt $i failed (status: $STATUS), retrying in 10s..."
            sleep 10
          done
          echo "Health check failed after 5 attempts"
          exit 1

      # トラフィック切替 / 流量切换 (100%)
      - name: Switch traffic to new revision
        run: |
          gcloud run services update-traffic zelixwms-api \
            --region=${{ env.REGION }} \
            --to-latest

  # ════════════════════════════════════════
  # スモークテスト / 冒烟测试
  # ════════════════════════════════════════
  smoke-test:
    name: Smoke Test
    runs-on: ubuntu-latest
    needs: [deploy]

    steps:
      - uses: actions/checkout@v4

      - name: API Health Check
        run: |
          sleep 15
          STATUS=$(curl -s -o /dev/null -w '%{http_code}' https://api.zelix.io/health)
          if [ "$STATUS" != "200" ]; then
            echo "CRITICAL: API health check failed (status: $STATUS)"
            exit 1
          fi
          echo "API health check passed"

      - name: Frontend Health Check
        run: |
          STATUS=$(curl -s -o /dev/null -w '%{http_code}' https://app.zelix.io)
          if [ "$STATUS" != "200" ]; then
            echo "CRITICAL: Frontend health check failed (status: $STATUS)"
            exit 1
          fi
          echo "Frontend health check passed"

      - name: Admin Health Check
        run: |
          STATUS=$(curl -s -o /dev/null -w '%{http_code}' https://admin.zelix.io)
          echo "Admin health check: $STATUS"

      - name: Portal Health Check
        run: |
          STATUS=$(curl -s -o /dev/null -w '%{http_code}' https://portal.zelix.io)
          echo "Portal health check: $STATUS"

      - name: API Functional Check
        run: |
          # 基本 API 端点测试 / 基本 API エンドポイントテスト
          RESPONSE=$(curl -s https://api.zelix.io/health)
          echo "Health response: $RESPONSE"

          # バージョン確認 / 版本确认
          VERSION=$(echo $RESPONSE | jq -r '.version // "unknown"')
          echo "Deployed version: $VERSION"

  # ════════════════════════════════════════
  # デプロイ通知 / 部署通知
  # ════════════════════════════════════════
  notify:
    name: Notify
    runs-on: ubuntu-latest
    needs: [smoke-test]
    if: always()

    steps:
      - name: Slack Notification
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ needs.smoke-test.result }}
          fields: repo,message,commit,author,action,workflow
          text: |
            Production deploy ${{ needs.smoke-test.result == 'success' && 'succeeded' || 'FAILED' }}
            本番デプロイ ${{ needs.smoke-test.result == 'success' && '成功' || '失敗' }}
            Commit: ${{ github.sha }}
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

### 5.5 Rollback Pipeline (rollback.yml)

```yaml
# ============================================================
# Rollback Pipeline: ワンクリックで前バージョンに戻す
# 回滚流水线: 一键回滚到上一版本
# ============================================================

name: Rollback Production

on:
  workflow_dispatch:
    inputs:
      revision:
        description: 'Cloud Run revision to rollback to (leave empty for previous)'
        required: false
        default: ''
      reason:
        description: 'Reason for rollback / 回滚原因 / ロールバック理由'
        required: true

env:
  REGION: asia-northeast1

jobs:
  rollback:
    name: Rollback
    runs-on: ubuntu-latest
    environment: production

    steps:
      - id: auth
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.WIF_PROVIDER }}
          service_account: ${{ secrets.WIF_SA }}

      - uses: google-github-actions/setup-gcloud@v2

      # 現在のリビジョン一覧 / 当前 revision 列表
      - name: List current revisions
        run: |
          echo "=== Current revisions / 現在のリビジョン ==="
          gcloud run revisions list \
            --service=zelixwms-api \
            --region=${{ env.REGION }} \
            --format='table(REVISION,ACTIVE,DEPLOYED,PERCENT_TRAFFIC)' \
            --limit=5

      # ロールバック実行 / 执行回滚
      - name: Rollback traffic
        run: |
          if [ -n "${{ github.event.inputs.revision }}" ]; then
            # 指定リビジョンへ / 回滚到指定 revision
            TARGET="${{ github.event.inputs.revision }}"
            echo "Rolling back to specified revision: ${TARGET}"
            gcloud run services update-traffic zelixwms-api \
              --region=${{ env.REGION }} \
              --to-revisions="${TARGET}=100"
          else
            # 前のリビジョンへ / 回滚到上一 revision
            echo "Rolling back to previous revision"
            PREVIOUS=$(gcloud run revisions list \
              --service=zelixwms-api \
              --region=${{ env.REGION }} \
              --format='value(REVISION)' \
              --limit=2 | tail -n 1)
            echo "Previous revision: ${PREVIOUS}"
            gcloud run services update-traffic zelixwms-api \
              --region=${{ env.REGION }} \
              --to-revisions="${PREVIOUS}=100"
          fi

      # ヘルスチェック / 健康检查
      - name: Verify rollback
        run: |
          sleep 10
          STATUS=$(curl -s -o /dev/null -w '%{http_code}' https://api.zelix.io/health)
          if [ "$STATUS" = "200" ]; then
            echo "Rollback successful - API healthy"
          else
            echo "WARNING: API returned status $STATUS after rollback"
            exit 1
          fi

      # Slack 通知 / Slack 通知
      - name: Notify rollback
        uses: 8398a7/action-slack@v3
        with:
          status: custom
          custom_payload: |
            {
              "text": ":warning: Production ROLLBACK executed / 本番ロールバック実行\nReason / 理由: ${{ github.event.inputs.reason }}\nBy / 実行者: ${{ github.actor }}"
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

---

## 6. 域名与 SSL / ドメインと SSL

### 6.1 域名映射 / ドメインマッピング

| 域名 / ドメイン | 用途 / 用途 | 后端服务 / バックエンドサービス | 环境 / 環境 |
|---|---|---|---|
| `api.zelix.io` | Backend API | Cloud Run: `zelixwms-api` | Production |
| `app.zelix.io` | 仓库端前端 / 倉庫フロントエンド | Cloud Run: `zelixwms-frontend` | Production |
| `admin.zelix.io` | 管理端 / 管理ダッシュボード | Cloud Run: `zelixwms-admin` | Production |
| `portal.zelix.io` | 客户门户 / 顧客ポータル | Cloud Run: `zelixwms-portal` | Production |
| `staging-api.zelix.io` | Staging API | Cloud Run: `zelixwms-api-staging` | Staging |
| `staging-app.zelix.io` | Staging Frontend | Cloud Run: `zelixwms-frontend-staging` | Staging |

### 6.2 Cloudflare DNS 设置 / DNS 設定

```
# Production DNS Records / 本番 DNS レコード
# Type  Name              Content                            Proxy
A       api.zelix.io      <Cloud Run IP>                     Proxied (orange)
CNAME   app.zelix.io      zelixwms-frontend-xxxxx.run.app    Proxied (orange)
CNAME   admin.zelix.io    zelixwms-admin-xxxxx.run.app       Proxied (orange)
CNAME   portal.zelix.io   zelixwms-portal-xxxxx.run.app      Proxied (orange)

# Staging DNS Records / Staging DNS レコード
CNAME   staging-api.zelix.io    zelixwms-api-staging-xxxxx.run.app     Proxied
CNAME   staging-app.zelix.io    zelixwms-frontend-staging-xxxxx.run.app Proxied
```

### 6.3 SSL 配置 / SSL 設定

```yaml
# Cloudflare SSL 设置 / SSL 設定
SSL/TLS:
  mode: Full (Strict)             # 端到端加密 / エンドツーエンド暗号化
  min_tls_version: "1.2"          # 最低 TLS 1.2
  tls_1_3: enabled                # TLS 1.3 有效 / 有効

  # 自动 HTTPS 重写 / 自動 HTTPS リライト
  always_use_https: true
  automatic_https_rewrites: true

  # HSTS 设置 / HSTS 設定
  hsts:
    enabled: true
    max_age: 31536000             # 1 year
    include_subdomains: true
    preload: true

# Cloudflare Security Headers / セキュリティヘッダー
security_headers:
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  X-XSS-Protection: "1; mode=block"
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: "camera=(), microphone=(), geolocation=()"

# Cloudflare WAF Rules / WAF ルール
waf:
  managed_rules: enabled
  rate_limiting:
    - path: /api/auth/*
      requests: 20
      period: 60s
      action: block
    - path: /api/*
      requests: 500
      period: 60s
      action: challenge
```

### 6.4 Cloud Run ドメインマッピング / 域名映射

```bash
# Cloud Run にカスタムドメインをマッピング / 将自定义域名映射到 Cloud Run

# Backend API
gcloud run domain-mappings create \
  --service=zelixwms-api \
  --domain=api.zelix.io \
  --region=asia-northeast1

# Frontend
gcloud run domain-mappings create \
  --service=zelixwms-frontend \
  --domain=app.zelix.io \
  --region=asia-northeast1

# Admin
gcloud run domain-mappings create \
  --service=zelixwms-admin \
  --domain=admin.zelix.io \
  --region=asia-northeast1

# Portal
gcloud run domain-mappings create \
  --service=zelixwms-portal \
  --domain=portal.zelix.io \
  --region=asia-northeast1
```

---

## 7. 自动伸缩策略 / オートスケーリング戦略

### 7.1 Cloud Run 自动伸缩配置 / オートスケーリング設定

```yaml
# Cloud Run Autoscaling Configuration
# Cloud Run オートスケーリング設定

zelixwms-api:
  scaling:
    min_instances: 2              # 最小副本数 / 最小レプリカ数
    max_instances: 10             # 最大副本数 / 最大レプリカ数
    target_cpu_utilization: 70    # CPU 目标利用率 / CPU 目標使用率 (%)
    target_memory_utilization: 80 # 内存目标利用率 / メモリ目標使用率 (%)
    max_concurrent_requests: 80   # 每实例最大并发 / インスタンスあたり最大同時リクエスト
    startup_cpu_boost: true       # 启动时 CPU 提升 / 起動時 CPU ブースト

  resources:
    cpu: 2                        # vCPU
    memory: 1Gi                   # メモリ

  # Cloud Run は CPU・リクエスト数ベースで自動スケーリング
  # Cloud Run 基于 CPU 和请求数自动伸缩

zelixwms-worker:
  scaling:
    min_instances: 1
    max_instances: 5
    target_cpu_utilization: 80
  resources:
    cpu: 1
    memory: 512Mi
```

### 7.2 伸缩策略详细 / スケーリング戦略詳細

```mermaid
graph TD
    subgraph triggers["伸缩触发条件 / スケーリングトリガー"]
        cpu["CPU > 70%"]
        mem["Memory > 80%"]
        req["Request Rate > 500/min<br/>(per instance)"]
        lat["P95 Latency > 500ms"]
    end

    subgraph actions["伸缩动作 / スケーリングアクション"]
        up["Scale UP<br/>+1 replica<br/>最大 10 / 最大 10"]
        down["Scale DOWN<br/>-1 replica<br/>最小 2 / 最小 2"]
    end

    subgraph cooldown["冷却期 / クールダウン"]
        up_cool["Scale-up cooldown:<br/>60 seconds"]
        down_cool["Scale-down cooldown:<br/>300 seconds (5 min)"]
    end

    cpu -->|任一触发 / いずれか| up
    mem -->|任一触发 / いずれか| up
    req -->|任一触发 / いずれか| up
    lat -->|任一触发 / いずれか| up
    up --> up_cool

    cpu -->|全部低于阈值 / 全て閾値以下| down
    mem -->|全部低于阈值 / 全て閾値以下| down
    down --> down_cool
```

### 7.3 伸缩策略参数 / スケーリングパラメータ

| 参数 / パラメータ | 值 / 値 | 说明 / 説明 |
|---|---|---|
| **最小副本数 / 最小レプリカ** | 2 | 高可用保证 / 高可用性の保証 (1 つダウンしても稼働) |
| **最大副本数 / 最大レプリカ** | 10 | 成本上限 / コスト上限 |
| **CPU 阈值 / CPU 閾値** | 70% | 超过时扩容 / 超過時スケールアップ |
| **内存阈值 / メモリ閾値** | 80% | 超过时扩容 / 超過時スケールアップ |
| **请求率阈值 / リクエストレート閾値** | 500/min per instance | 超过时扩容 / 超過時スケールアップ |
| **扩容冷却 / スケールアップクールダウン** | 60s | 频繁扩容防止 / 頻繁なスケールアップ防止 |
| **缩容冷却 / スケールダウンクールダウン** | 300s (5 min) | 过早缩容防止 / 早すぎるスケールダウン防止 |
| **每实例并发 / インスタンス同時リクエスト** | 80 | Cloud Run 配分基准 / Cloud Run 配分基準 |

### 7.4 gcloud 部署命令 / デプロイコマンド

```bash
# 生产环境自动伸缩配置 / 本番オートスケーリング設定

gcloud run deploy zelixwms-api \
  --image=${REGISTRY}/zelixwms-backend:${TAG} \
  --region=asia-northeast1 \
  --platform=managed \
  --cpu=2 \
  --memory=1Gi \
  --min-instances=2 \
  --max-instances=10 \
  --concurrency=80 \
  --cpu-throttling \
  --startup-cpu-boost \
  --port=4000 \
  --timeout=300 \
  --set-env-vars="NODE_ENV=production" \
  --allow-unauthenticated

# Worker 自动伸缩 / ワーカーオートスケーリング
gcloud run deploy zelixwms-worker \
  --image=${REGISTRY}/zelixwms-backend:${TAG} \
  --region=asia-northeast1 \
  --platform=managed \
  --cpu=1 \
  --memory=512Mi \
  --min-instances=1 \
  --max-instances=5 \
  --concurrency=10 \
  --command="node","dist/worker.js" \
  --no-allow-unauthenticated
```

### 7.5 Cloud Monitoring 告警策略 / アラートポリシー

```yaml
# 监控告警 / 監視アラート

alerts:
  # CPU 高负载 / CPU 高負荷
  - name: "zelixwms-api-cpu-high"
    condition: >
      resource.type = "cloud_run_revision"
      AND metric.type = "run.googleapis.com/container/cpu/utilizations"
      AND metric.value > 0.8
    duration: 300s  # 5分持续 / 5分間継続
    notification: [slack, email]

  # 内存高负载 / メモリ高負荷
  - name: "zelixwms-api-memory-high"
    condition: >
      resource.type = "cloud_run_revision"
      AND metric.type = "run.googleapis.com/container/memory/utilizations"
      AND metric.value > 0.85
    duration: 300s
    notification: [slack, email]

  # 5xx 错误率 / 5xx エラー率
  - name: "zelixwms-api-error-rate"
    condition: >
      resource.type = "cloud_run_revision"
      AND metric.type = "run.googleapis.com/request_count"
      AND metric.labels.response_code_class = "5xx"
      AND metric.value > 10
    duration: 60s
    notification: [slack, email, pager]

  # 延迟 P95 / レイテンシ P95
  - name: "zelixwms-api-latency-p95"
    condition: >
      resource.type = "cloud_run_revision"
      AND metric.type = "run.googleapis.com/request_latencies"
      AND metric.percentile(95) > 1000
    duration: 300s
    notification: [slack]

  # 实例数 / インスタンス数 (接近上限 / 上限に接近)
  - name: "zelixwms-api-near-max-instances"
    condition: >
      resource.type = "cloud_run_revision"
      AND metric.type = "run.googleapis.com/container/instance_count"
      AND metric.value > 8
    duration: 300s
    notification: [slack, email]
```

---

## 8. 灾难恢复 / 災害復旧

### 8.1 恢复目标 / 復旧目標

| 指标 / 指標 | 目标 / 目標 | 说明 / 説明 |
|---|---|---|
| **RTO** (Recovery Time Objective) | **1 小时 / 1 時間** | 服务恢复时间 / サービス復旧時間 |
| **RPO** (Recovery Point Objective) | **5 分钟 / 5 分** | 最大数据丢失时间 / 最大データ損失時間 (Supabase PITR) |

### 8.2 备份策略 / バックアップ戦略

```mermaid
graph TB
    subgraph daily["每日备份 / 日次バックアップ"]
        auto["Supabase 自動バックアップ<br/>毎日 03:00 JST"]
        pitr["PITR (Point-in-Time Recovery)<br/>WAL ストリーミング<br/>5 分粒度 / 5 分粒度"]
    end

    subgraph storage_backup["文件存储备份 / ファイルストレージバックアップ"]
        s3_ver["Supabase Storage<br/>Object Versioning"]
    end

    subgraph redis_backup["Redis 备份 / Redis バックアップ"]
        upstash["Upstash<br/>Daily Snapshot<br/>+ AOF Persistence"]
    end

    subgraph retention["保留策略 / 保持ポリシー"]
        r7["日次: 7 日間保持<br/>Daily: 7 days"]
        r30["週次: 30 日間保持<br/>Weekly: 30 days"]
        r365["月次: 365 日間保持<br/>Monthly: 1 year"]
    end

    subgraph verify["验证 / 検証"]
        monthly["月次リストアテスト<br/>Monthly Restore Test"]
    end

    auto --> r7
    pitr --> r7
    r7 --> r30 --> r365
    r7 --> monthly
```

### 8.3 灾难恢复场景 / 災害復旧シナリオ

#### 场景 A: 应用层故障 / アプリケーション層障害

```
症状 / 症状: API 502/503 错误, 应用无响应
原因 / 原因: 代码 bug, OOM, 死锁
```

| 步骤 / ステップ | 操作 / 操作 | 时间 / 時間 |
|---|---|---|
| 1 | 告警触发 → Slack/PagerDuty 通知 | 0-2 min |
| 2 | 确认故障 → GitHub Actions Rollback | 2-5 min |
| 3 | 执行 `Rollback Production` workflow | 5-10 min |
| 4 | 验证恢复 (smoke test) | 10-15 min |
| **合计 / 合計** | | **< 15 min** |

#### 场景 B: 数据库故障 / データベース障害

```
症状 / 症状: 数据库连接错误, 查询超时
原因 / 原因: Supabase 平台障害, 数据损坏
```

| 步骤 / ステップ | 操作 / 操作 | 时间 / 時間 |
|---|---|---|
| 1 | 告警触发 → 确认 Supabase Status Page | 0-5 min |
| 2 | Supabase 平台障害の場合 → 待機 | - |
| 3 | データ損傷の場合 → PITR リストア | 15-30 min |
| 4 | 接続確認 + 整合性チェック | 30-45 min |
| 5 | トラフィック復旧 | 45-60 min |
| **合计 / 合計** | | **< 1 hour** |

#### 场景 C: 区域故障 / リージョン障害

```
症状 / 症状: 整个区域不可用
原因 / 原因: GCP/AWS 区域停机
```

| 步骤 / ステップ | 操作 / 操作 | 时间 / 時間 |
|---|---|---|
| 1 | 确认区域故障 | 0-5 min |
| 2 | DNS 切换到备用区域 (Cloudflare) | 5-10 min |
| 3 | 启动备用区域 Cloud Run 服务 | 10-30 min |
| 4 | 数据库: Supabase 跨区域复制 (if configured) | 30-60 min |
| 5 | 验证恢复 | 50-60 min |
| **合计 / 合計** | | **< 1 hour** |

### 8.4 多区域故障转移 / マルチリージョンフェイルオーバー

```mermaid
graph TB
    subgraph primary["主区域 / プライマリリージョン<br/>asia-northeast1 (Tokyo)"]
        cr_primary["Cloud Run<br/>(Active)"]
        supa_primary["Supabase<br/>ap-northeast-1<br/>(Primary)"]
    end

    subgraph secondary["备用区域 / セカンダリリージョン<br/>asia-northeast2 (Osaka)"]
        cr_secondary["Cloud Run<br/>(Standby)"]
    end

    subgraph dns_layer["DNS 层 / DNS レイヤー"]
        cf_dns["Cloudflare DNS<br/>Health Check + Failover"]
    end

    cf_dns -->|正常时 / 正常時| cr_primary
    cf_dns -.->|故障时 / 障害時| cr_secondary
    cr_primary --> supa_primary
    cr_secondary -.->|Direct connection| supa_primary
```

### 8.5 恢复操作手册 / 復旧オペレーション手順書

```bash
#!/bin/bash
# ============================================================
# ZELIXWMS 灾难恢复脚本 / 災害復旧スクリプト
# ============================================================

# 1. 检查服务状态 / サービス状態確認
echo "=== Service Status Check / サービス状態チェック ==="
curl -s -o /dev/null -w "API: %{http_code}\n" https://api.zelix.io/health
curl -s -o /dev/null -w "App: %{http_code}\n" https://app.zelix.io
curl -s -o /dev/null -w "Admin: %{http_code}\n" https://admin.zelix.io
curl -s -o /dev/null -w "Portal: %{http_code}\n" https://portal.zelix.io

# 2. Cloud Run Revision 确认 / リビジョン確認
echo "=== Cloud Run Revisions ==="
gcloud run revisions list --service=zelixwms-api --region=asia-northeast1 --limit=5

# 3. 快速回滚 / クイックロールバック
echo "=== Quick Rollback ==="
PREVIOUS=$(gcloud run revisions list \
  --service=zelixwms-api \
  --region=asia-northeast1 \
  --format='value(REVISION)' \
  --limit=2 | tail -n 1)
echo "Rolling back to: ${PREVIOUS}"
gcloud run services update-traffic zelixwms-api \
  --region=asia-northeast1 \
  --to-revisions="${PREVIOUS}=100"

# 4. Supabase PITR 复原 (需要 Supabase Dashboard)
# Supabase PITR リストア (Supabase ダッシュボードが必要)
echo "=== For database restore ==="
echo "1. Go to https://supabase.com/dashboard/project/{ref}/settings/database"
echo "2. Click 'Point-in-Time Recovery'"
echo "3. Select recovery point (RPO: 5 min)"
echo "4. Confirm restore"

# 5. DNS 故障转移 (Cloudflare API)
# DNS フェイルオーバー (Cloudflare API)
echo "=== DNS Failover (if needed) ==="
echo "Update Cloudflare DNS via dashboard or API"
echo "Switch api.zelix.io CNAME to backup region service URL"
```

### 8.6 月次复原测试清单 / 月次リストアテストチェックリスト

```markdown
# 月次灾难恢复演练 / 月次災害復旧演習
# 执行日 / 実施日: 每月第一个周六 / 毎月第1土曜日

## 数据库复原测试 / データベースリストアテスト
- [ ] Supabase バックアップからリストア (staging 環境)
- [ ] テーブル数確認 / 表数确认
- [ ] レコード数確認 / 记录数确认
- [ ] 最新データのタイムスタンプ確認 / 最新数据时间戳确认
- [ ] アプリケーション接続テスト / 应用连接测试
- [ ] 基本 CRUD 操作テスト / 基本 CRUD 操作测试

## アプリケーションロールバックテスト / 应用回滚测试
- [ ] Staging で前バージョンにロールバック / 在 Staging 回滚到上一版本
- [ ] ヘルスチェック確認 / 健康检查确认
- [ ] 基本機能テスト / 基本功能测试
- [ ] 最新バージョンに再デプロイ / 重新部署最新版本

## DNS フェイルオーバーテスト / DNS 故障转移测试
- [ ] Cloudflare ヘルスチェック確認 / 确认健康检查
- [ ] フェイルオーバールール確認 / 确认故障转移规则

## 结果记录 / 結果記録
- RTO 実績 / 实际 RTO: _____ 分
- RPO 実績 / 实际 RPO: _____ 分
- 問題点 / 问题: ___________
- 改善点 / 改善项: ___________
```

---

## 附录 A: 环境变量完整一览 / 環境変数完全一覧

参考 [01-deployment.md](../infrastructure/01-deployment.md) 的第 4 节。
[01-deployment.md](../infrastructure/01-deployment.md) のセクション 4 を参照。

## 附录 B: Nginx 配置模板 / Nginx 設定テンプレート

### 本番用 Nginx 设置 / Production Nginx Config

```nginx
# ============================================================
# ZELIXWMS Production Nginx Configuration
# ============================================================

upstream backend {
    server backend:4000;
}

# ── API Backend / API バックエンド ──
server {
    listen 443 ssl http2;
    server_name api.zelix.io;

    ssl_certificate     /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    # 安全头 / セキュリティヘッダー
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # 请求体大小限制 / リクエストボディサイズ制限
    client_max_body_size 50M;

    # API 代理 / API プロキシ
    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket 支持 / WebSocket 対応
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # 超时 / タイムアウト
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    # 健康检查 (不日志) / ヘルスチェック (ログなし)
    location /health {
        proxy_pass http://backend;
        access_log off;
    }
}

# ── Frontend / フロントエンド ──
server {
    listen 443 ssl http2;
    server_name app.zelix.io;

    ssl_certificate     /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    root /usr/share/nginx/html/frontend;
    index index.html;

    # SPA 路由 / SPA ルーティング
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源缓存 / 静的アセットキャッシュ
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# ── HTTP → HTTPS 重定向 / リダイレクト ──
server {
    listen 80;
    server_name api.zelix.io app.zelix.io admin.zelix.io portal.zelix.io;
    return 301 https://$host$request_uri;
}
```

---

> **文档版本 / ドキュメントバージョン**: 1.0.0
> **作成日 / 作成日**: 2026-03-21
> **最终更新 / 最終更新**: 2026-03-21
> **作者 / 著者**: ZELIXWMS Architecture Team
```
