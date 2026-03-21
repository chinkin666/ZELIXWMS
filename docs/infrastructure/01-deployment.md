# デプロイメントガイド / 部署指南

> ZELIXWMS のインフラ構成・デプロイ手順・CI/CD パイプラインの全体像。
> ZELIXWMS 基础设施配置、部署流程、CI/CD 流水线全貌。

---

## 1. 環境構成 / 环境配置

| 環境 / 环境 | 用途 / 用途 | URL 例 | 備考 / 备注 |
|---|---|---|---|
| **development** | ローカル開発 / 本地开发 | `localhost:4000-4003` | hot reload、`pino-pretty` ログ / 热重载、美化日志 |
| **staging** | テスト・QA / 测试QA | `stg.zelix-wms.com` | 本番同等の Docker 構成 / 与生产相同的 Docker 配置 |
| **production** | 本番 / 生产 | `zelix-wms.com` | SSL 必須、シークレット管理必須 / SSL必须、密钥管理必须 |

### 環境ごとの差異 / 各环境差异

| 項目 / 项目 | development | staging | production |
|---|---|---|---|
| NODE_ENV | `development` | `production` | `production` |
| ログレベル / 日志级别 | `debug` | `info` | `info` |
| ログフォーマット / 日志格式 | `pino-pretty` (色付き) | JSON | JSON |
| CORS | `localhost:4001` | ステージングドメイン | 本番ドメインのみ |
| JWT_SECRET | デフォルト値可 / 可用默认 | 独自設定 / 独立设置 | **必須独自設定 / 必须独立设置** |
| MongoDB | ローカル単体 / 本地单实例 | レプリカセット推奨 | レプリカセット必須 |
| Redis | ローカル単体 | 単体 | Sentinel/Cluster 推奨 |

---

## 2. Docker Compose 構成 / Docker Compose 配置

全 6 サービスで構成。`docker-compose.yml` で定義。
共 6 个服务，定义在 `docker-compose.yml`。

### サービス一覧 / 服务列表

| サービス / 服务 | ポート / 端口 | イメージ / 镜像 | メモリ制限 | 説明 / 说明 |
|---|---|---|---|---|
| **backend** | `4000:4000` | カスタムビルド | 512M | Express + GraphQL API サーバー |
| **frontend** | `3000:80` | Nginx + Vue SPA | 128M | 倉庫端フロントエンド / 仓库端前端 |
| **admin** | `3001:80` | Nginx + Vue SPA | 128M | 管理ダッシュボード / 管理后台 |
| **portal** | `3002:80` | Nginx + Vue SPA | 128M | 顧客ポータル / 客户门户 |
| **mongo** | `27017:27017` | `mongo:7` | 1G | メインデータベース / 主数据库 |
| **redis** | `6379:6379` | `redis:7-alpine` | 256M | キャッシュ + BullMQ キュー |

### 依存関係 / 依赖关系

```
frontend ──┐
admin   ───┤──► backend ──► mongo (service_healthy)
portal  ───┘              └──► redis (service_healthy)
```

### ヘルスチェック / 健康检查

| サービス | チェック方法 / 检查方式 | 間隔 / 间隔 | タイムアウト | リトライ |
|---|---|---|---|---|
| backend | `fetch('http://localhost:4000/health')` | 30s | 10s | 3 |
| mongo | `mongosh --eval "db.adminCommand('ping')"` | 15s | 5s | 3 |
| redis | `redis-cli ping` | 15s | 5s | 3 |

### ボリューム / 数据卷

| ボリューム名 | マウント先 | 用途 / 用途 |
|---|---|---|
| `mongo-data` | `/data/db` | MongoDB データ永続化 / 数据持久化 |
| `redis-data` | `/data` | Redis AOF 永続化 / AOF 持久化 |

### Redis 設定 / Redis 配置

```
redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
```

- AOF 永続化有効 / AOF 持久化已启用
- メモリ上限 256MB / 内存限制 256MB
- LRU エビクションポリシー / LRU 淘汰策略

---

## 3. 環境変数一覧 / 环境变量列表

### 必須（本番） / 必须（生产环境）

| 変数名 / 变量名 | 説明 / 说明 | デフォルト | 例 |
|---|---|---|---|
| `NODE_ENV` | 実行環境 / 运行环境 | `development` | `production` |
| `PORT` | API サーバーポート / 端口 | `4000` | `4000` |
| `HOST` | リッスンアドレス / 监听地址 | `localhost` | `0.0.0.0` |
| `MONGODB_URI` | MongoDB 接続 URI | `mongodb://127.0.0.1:27017/nexand-shipment` | `mongodb://mongo:27017/nexand-shipment` |
| `MONGODB_DB` | データベース名 / 数据库名 | `nexand-shipment` | `nexand-shipment` |
| `JWT_SECRET` | JWT 署名キー / 签名密钥 | 開発用デフォルト | **本番は必ず変更 / 生产必须更改** |
| `SESSION_SECRET` | セッションシークレット | 開発用デフォルト | **本番は必ず変更** |
| `S3_ACCESS_KEY` | S3 アクセスキー | - | **本番必須 / 生产必须** |
| `S3_SECRET_KEY` | S3 シークレットキー | - | **本番必須** |

### オプション / 可选

| 変数名 | 説明 / 说明 | デフォルト |
|---|---|---|
| `REDIS_URL` | Redis 接続 URL | `redis://127.0.0.1:6379` |
| `CORS_ORIGINS` | 許可オリジン（カンマ区切り）/ 允许的源（逗号分隔） | `http://localhost:4001` |
| `LOG_LEVEL` | ログレベル / 日志级别 | 本番: `info`, 開発: `debug` |
| `SMTP_HOST` | メールサーバー / 邮件服务器 | 未設定＝メール通知無効 |
| `SMTP_PORT` | SMTP ポート | `587` |
| `SMTP_SECURE` | TLS 使用 | `false` |
| `SMTP_USER` | SMTP ユーザー | - |
| `SMTP_PASS` | SMTP パスワード | - |
| `SMTP_FROM` | 送信元アドレス / 发件人地址 | `noreply@zelix-wms.com` |
| `S3_BUCKET` | S3 バケット名 | `zelix-wms-photos` |
| `FILE_STORAGE_DIR` | ファイル保存ディレクトリ / 文件存储目录 | `tmp/uploads` |
| `YAMATO_CALC_BASE_URL` | ヤマト仕分けコード計算 API | `https://yamato-calc.nexand.org` |

### フロントエンドビルド引数 / 前端构建参数

| 変数名 | 説明 / 说明 | デフォルト |
|---|---|---|
| `VITE_BACKEND_ORIGIN` | バックエンド URL（空＝同一オリジン）| `""` |
| `VITE_BACKEND_API_PREFIX` | API パスプレフィックス | `/api` |

---

## 4. ローカル開発環境 / 本地开发环境

### 前提条件 / 前提条件

- Node.js >= 20.0.0, npm >= 10.0.0
- MongoDB 7.x（ローカルまたは Docker）
- Redis 7.x（ローカルまたは Docker、なくても起動可）

### セットアップ手順 / 设置步骤

```bash
# 1. リポジトリクローン / 克隆仓库
git clone <repo-url> && cd ZELIXWMS

# 2. 依存関係インストール（npm workspaces） / 安装依赖（npm 工作区）
npm install

# 3. 環境変数ファイル作成 / 创建环境变量文件
cp backend/.env.example backend/.env
# .env を編集: MONGODB_URI, JWT_SECRET 等 / 编辑 .env

# 4. MongoDB 起動（ローカル） / 启动 MongoDB（本地）
npm run db
# または Docker: docker run -d -p 27017:27017 mongo:7

# 5. シードデータ投入 / 导入种子数据
npm run seed

# 6. 全サービス一括起動 / 一键启动所有服务
./dev-start.sh
```

### dev-start.sh の起動サービス / 启动服务

| サービス | ポート | 説明 |
|---|---|---|
| Backend | `:4000` | Express + nodemon (hot reload) |
| Frontend | `:4001` | 倉庫端 Vite dev server |
| Portal | `:4002` | 顧客端 Vite dev server |
| Admin | `:4003` | プラットフォーム管理 Vite dev server |

### 個別起動 / 单独启动

```bash
npm run dev:backend     # バックエンドのみ / 仅后端
npm run dev:frontend    # 倉庫端のみ / 仅仓库端
```

---

## 5. Docker デプロイ / Docker 部署

### 本番デプロイ手順 / 生产部署步骤

```bash
# 1. 環境変数を設定 / 设置环境变量
export SESSION_SECRET="your-secure-secret"
export JWT_SECRET="your-secure-jwt-secret"

# 2. ビルド + 起動 / 构建并启动
docker compose up -d --build

# 3. ステータス確認 / 检查状态
docker compose ps

# 4. ヘルスチェック / 健康检查
curl http://localhost:4000/health

# 5. シードデータ投入（初回のみ） / 导入种子数据（仅首次）
docker compose exec backend node -e "require('./dist/scripts/seed.js')"

# 6. ログ確認 / 查看日志
docker compose logs -f backend
```

### 更新手順 / 更新步骤

```bash
git pull origin main
docker compose up -d --build    # 自動的に再ビルド / 自动重新构建
docker compose logs -f backend  # ログで起動確認 / 通过日志确认启动
```

### ロールバック / 回滚

```bash
# 前のイメージに戻す / 回退到上一版本
docker compose down
git checkout <previous-tag>
docker compose up -d --build
```

---

## 6. CI/CD パイプライン / CI/CD 流水线

GitHub Actions で自動化。`.github/workflows/ci.yml` で定義。
使用 GitHub Actions 自动化，定义在 `.github/workflows/ci.yml`。

### トリガー / 触发条件

| イベント | ブランチ | 実行ジョブ |
|---|---|---|
| `push` | `main`, `develop` | test |
| `pull_request` | `main` | test |
| `push` (main のみ) | `main` | test → build |

### 同一ブランチの重複実行はキャンセル / 同一分支重复执行自动取消

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

### test ジョブ / 测试任务

1. `actions/checkout@v4`
2. `actions/setup-node@v4` (Node 20, npm cache)
3. `npm ci` (ルートワークスペース / 根工作区)
4. Backend: `npx tsc --noEmit` (型チェック / 类型检查)
5. Backend: `npx vitest run` (ユニットテスト)
6. Frontend: `npx vitest run` (ユニットテスト)
7. Frontend: `npx vue-tsc --build` (型チェック)
8. Admin: `npx vue-tsc --build` (型チェック)
9. Portal: `npx vue-tsc --build` (型チェック)

### build ジョブ / 构建任务

**main ブランチ + test 成功後のみ実行 / 仅 main 分支且测试通过后执行**

1. `npm ci`
2. Backend: `npm run build` (TypeScript → JavaScript)
3. Frontend: `npm run build-only` (Vite ビルド)
4. Admin: `npm run build` (Vite ビルド)
5. Portal: `npm run build` (Vite ビルド)

---

## 7. SSL/HTTPS 設定 / SSL/HTTPS 配置

本番環境ではリバースプロキシ（Nginx / Caddy）を frontend に配置。
生产环境在前端服务前放置反向代理（Nginx / Caddy）。

### Nginx 設定例 / Nginx 配置示例

```nginx
server {
    listen 443 ssl http2;
    server_name zelix-wms.com;

    ssl_certificate     /etc/ssl/certs/zelix-wms.crt;
    ssl_certificate_key /etc/ssl/private/zelix-wms.key;

    # API バックエンド / API 后端
    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # GraphQL エンドポイント
    location /graphql {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
    }

    # ヘルスチェック / 健康检查
    location /health {
        proxy_pass http://localhost:4000;
    }

    # 倉庫端フロントエンド / 仓库端前端
    location / {
        proxy_pass http://localhost:3000;
    }
}

# Admin ダッシュボード / 管理后台
server {
    listen 443 ssl http2;
    server_name admin.zelix-wms.com;
    # ... SSL 設定同上 ...
    location / {
        proxy_pass http://localhost:3001;
    }
}

# 顧客ポータル / 客户门户
server {
    listen 443 ssl http2;
    server_name portal.zelix-wms.com;
    # ... SSL 設定同上 ...
    location / {
        proxy_pass http://localhost:3002;
    }
}
```

### Caddy 設定例（自動 SSL）/ Caddy 配置示例（自动 SSL）

```
zelix-wms.com {
    handle /api/* {
        reverse_proxy localhost:4000
    }
    handle /graphql {
        reverse_proxy localhost:4000
    }
    handle /health {
        reverse_proxy localhost:4000
    }
    handle {
        reverse_proxy localhost:3000
    }
}

admin.zelix-wms.com {
    reverse_proxy localhost:3001
}

portal.zelix-wms.com {
    reverse_proxy localhost:3002
}
```

---

## 8. ドメイン設定 / 域名配置

### 推奨構成 / 推荐配置

| ドメイン | 用途 | プロキシ先 |
|---|---|---|
| `zelix-wms.com` | 倉庫端 + API / 仓库端 + API | frontend `:3000` + backend `:4000` |
| `admin.zelix-wms.com` | 管理ダッシュボード / 管理后台 | admin `:3001` |
| `portal.zelix-wms.com` | 顧客ポータル / 客户门户 | portal `:3002` |
| `api-docs.zelix-wms.com` | API ドキュメント | backend `:4000/api-docs` |

### CORS 設定 / CORS 配置

`CORS_ORIGINS` 環境変数にすべてのフロントエンドドメインを設定。
在 `CORS_ORIGINS` 环境变量中设置所有前端域名。

```bash
CORS_ORIGINS=https://zelix-wms.com,https://admin.zelix-wms.com,https://portal.zelix-wms.com
```

### DNS レコード / DNS 记录

```
zelix-wms.com          A     <server-ip>
admin.zelix-wms.com    A     <server-ip>
portal.zelix-wms.com   A     <server-ip>
```

---

## 参考ファイル / 参考文件

| ファイル | 説明 |
|---|---|
| `docker-compose.yml` | Docker 構成定義 / Docker 配置定义 |
| `.github/workflows/ci.yml` | CI/CD パイプライン定義 / 流水线定义 |
| `dev-start.sh` | ローカル開発一括起動 / 本地一键启动 |
| `backend/.env.example` | 環境変数テンプレート / 环境变量模板 |
| `backend/src/config/env.ts` | 環境変数読み込み / 环境变量加载 |
| `backend/src/config/validateEnv.ts` | 環境変数バリデーション / 环境变量验证 |
