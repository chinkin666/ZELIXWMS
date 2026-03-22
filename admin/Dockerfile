# ============================================================
# Admin Dockerfile - ZELIXWMS
# 管理端 Dockerfile - ZELIXWMS 出荷管理システム
# ============================================================

# ---- Stage 1: Builder / ビルドステージ ----
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

ARG VITE_BACKEND_ORIGIN=http://localhost:4100
ARG VITE_BACKEND_API_PREFIX=/api
ENV VITE_BACKEND_ORIGIN=${VITE_BACKEND_ORIGIN}
ENV VITE_BACKEND_API_PREFIX=${VITE_BACKEND_API_PREFIX}

RUN npx vite build

# ---- Stage 2: Nginx / 本番ステージ ----
FROM nginx:alpine AS production

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
