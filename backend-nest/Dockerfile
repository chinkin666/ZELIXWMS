# ============================================================
# NestJS Backend Dockerfile - ZELIXWMS
# NestJS バックエンド Dockerfile - ZELIXWMS 出荷管理システム
# ============================================================
# Multi-stage build: builder → production
# マルチステージビルド: ビルダー → 本番

# ---- Stage 1: Builder / ビルドステージ ----
FROM node:22-alpine AS builder

WORKDIR /app

# 依存定義ファイルを先にコピー（レイヤーキャッシュ）
# 先复制依赖文件（层缓存）
COPY package.json package-lock.json* ./

# 全依存パッケージをインストール
# 安装全部依赖
RUN npm ci

# ソースコードをコピー / 复制源码
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src/ ./src/

# TypeScript ビルド / TypeScript 构建
RUN npm run build

# ---- Stage 2: Production / 本番ステージ ----
FROM node:22-alpine AS production

# 非 root ユーザー / 非root用户
RUN addgroup -g 1001 -S nestjs && adduser -S nestjs -u 1001

WORKDIR /app

# 依存定義ファイルをコピー / 复制依赖文件
COPY package.json package-lock.json* ./

# 本番用依存パッケージのみ / 仅生产依赖
RUN npm ci --omit=dev && npm cache clean --force

# ビルド成果物をコピー / 复制构建产物
COPY --from=builder /app/dist ./dist

# Drizzle マイグレーション / Drizzle 迁移文件
COPY drizzle/ ./drizzle/
COPY drizzle.config.ts ./

# 非 root ユーザーに切替 / 切换非root用户
USER nestjs

# 環境変数 / 环境变量
ENV NODE_ENV=production
ENV PORT=4100

EXPOSE 4100

# ヘルスチェック / 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4100/health || exit 1

# アプリケーション起動 / 启动应用
CMD ["node", "dist/main.js"]
