# ============================================================
# Backend Dockerfile - ZELIXWMS
# バックエンド Dockerfile - ZELIXWMS 出荷管理システム
# ============================================================
# Multi-stage build: builder → production
# マルチステージビルド: ビルダー → 本番

# ---- Stage 1: Builder / ビルドステージ ----
FROM node:20-alpine AS builder

WORKDIR /app

# Install build tools for native modules (sharp, skia-canvas, muhammara)
# ネイティブモジュール用のビルドツールをインストール
RUN apk add --no-cache python3 make g++ pkgconfig pixman-dev cairo-dev pango-dev jpeg-dev giflib-dev

# Copy dependency manifests first for layer caching
# レイヤーキャッシュのため依存定義ファイルを先にコピー
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies for building)
# 全依存パッケージをインストール（ビルド用 devDependencies 含む）
RUN npm ci

# Copy source code / ソースコードをコピー
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript → dist/
# TypeScript をビルド → dist/
RUN npm run build

# ---- Stage 2: Production / 本番ステージ ----
FROM node:20-alpine AS production

WORKDIR /app

# Install runtime dependencies for native modules
# ネイティブモジュールのランタイム依存をインストール
RUN apk add --no-cache pixman cairo pango jpeg giflib

# Copy dependency manifests / 依存定義ファイルをコピー
COPY package.json package-lock.json* ./

# Install production dependencies only
# 本番用依存パッケージのみインストール
RUN npm ci --omit=dev

# Copy built output from builder stage
# ビルド成果物をビルダーステージからコピー
COPY --from=builder /app/dist ./dist

# Create temp directory for file uploads
# ファイルアップロード用の一時ディレクトリを作成
RUN mkdir -p /app/tmp/uploads

# Set environment / 環境変数を設定
ENV NODE_ENV=production
ENV PORT=4000
ENV HOST=0.0.0.0

# Expose port / ポートを公開
EXPOSE 4000

# Health check - GET /health endpoint
# ヘルスチェック - GET /health エンドポイント
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

# Start the application / アプリケーションを起動
CMD ["node", "dist/server.js"]
