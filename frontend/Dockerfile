# ============================================================
# Frontend Dockerfile - ZELIXWMS
# フロントエンド Dockerfile - ZELIXWMS 出荷管理システム
# ============================================================
# Multi-stage build: builder → nginx
# マルチステージビルド: ビルダー → nginx

# ---- Stage 1: Builder / ビルドステージ ----
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests first for layer caching
# レイヤーキャッシュのため依存定義ファイルを先にコピー
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies for building)
# 全依存パッケージをインストール（ビルド用 devDependencies 含む）
RUN npm ci

# Copy source and config files / ソースと設定ファイルをコピー
COPY . .

# Build with Vite (production mode)
# Vite でビルド（本番モード）
# Backend URL is configured via .env.production or build args
# バックエンド URL は .env.production またはビルド引数で設定
ARG VITE_BACKEND_ORIGIN=http://localhost:4000
ARG VITE_BACKEND_API_PREFIX=/api
ENV VITE_BACKEND_ORIGIN=${VITE_BACKEND_ORIGIN}
ENV VITE_BACKEND_API_PREFIX=${VITE_BACKEND_API_PREFIX}

RUN npm run build-only

# ---- Stage 2: Nginx / 本番ステージ ----
FROM nginx:alpine AS production

# Remove default nginx config / デフォルトの nginx 設定を削除
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config / カスタム nginx 設定をコピー
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static files from builder stage
# ビルド済み静的ファイルをビルダーステージからコピー
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80 / ポート 80 を公開
EXPOSE 80

# Start nginx / nginx を起動
CMD ["nginx", "-g", "daemon off;"]
