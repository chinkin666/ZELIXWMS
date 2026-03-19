# ============================================================
# Admin Dockerfile - ZELIXWMS
# 管理端 Dockerfile - ZELIXWMS 出荷管理システム
# ============================================================

# ---- Stage 1: Builder / ビルドステージ ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

ARG VITE_BACKEND_ORIGIN=http://localhost:4000
ARG VITE_BACKEND_API_PREFIX=/api
ENV VITE_BACKEND_ORIGIN=${VITE_BACKEND_ORIGIN}
ENV VITE_BACKEND_API_PREFIX=${VITE_BACKEND_API_PREFIX}

RUN npm run build-only

# ---- Stage 2: Nginx / 本番ステージ ----
FROM nginx:alpine AS production

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
