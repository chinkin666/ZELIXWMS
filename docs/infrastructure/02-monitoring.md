# 監視・ログガイド / 监控与日志指南

> ZELIXWMS のヘルスチェック、構造化ログ、メトリクス、アラート、APM の全体像（NestJS + PostgreSQL + Supabase 新アーキテクチャ）。
> ZELIXWMS 的健康检查、结构化日志、指标监控、告警、APM 全貌（NestJS + PostgreSQL + Supabase 新架构）。

---

## 1. ヘルスチェック / 健康检查

### エンドポイント / 端点

| エンドポイント / 端点 | 用途 / 用途 | 認証 / 认证 |
|---|---|---|
| `GET /health` | 詳細ヘルスチェック（全依存サービスの状態を返す）/ 详细健康检查（返回所有依赖服务状态） | 不要 / 不需要 |
| `GET /health/liveness` | 存活プローブ（プロセスが動作中か）/ 存活探针（进程是否运行中） | 不要 |
| `GET /health/readiness` | 準備完了プローブ（リクエスト処理可能か）/ 就绪探针（是否可以处理请求） | 不要 |

### 各エンドポイントの用途 / 各端点用途

| プローブ / 探针 | チェック内容 / 检查内容 | 用途 / 用途 |
|---|---|---|
| **liveness** | プロセスが応答するか / 进程是否响应 | コンテナ再起動判定 / 容器重启判定 |
| **readiness** | DB + Redis 接続が正常か / DB + Redis 连接是否正常 | トラフィック配信判定 / 流量分发判定 |
| **health** | 全サービス + メモリ + キュー / 全服务 + 内存 + 队列 | 運用監視ダッシュボード / 运维监控仪表盘 |

### `/health` レスポンス例 / 响应示例

```json
{
  "status": "ok",
  "version": "2.0.0",
  "timestamp": "2026-03-21T00:00:00.000Z",
  "uptime": 86400,
  "services": {
    "postgres": {
      "status": "connected",
      "latencyMs": 2,
      "poolSize": 10,
      "activeConnections": 3,
      "idleConnections": 7
    },
    "redis": {
      "status": "connected",
      "latencyMs": 1,
      "usedMemoryMB": 45
    },
    "mongodb": {
      "status": "connected",
      "latencyMs": 3,
      "note": "移行期間中 / 迁移期间"
    }
  },
  "memory": {
    "rss": 120,
    "heapUsed": 65,
    "heapTotal": 90,
    "external": 12
  },
  "queues": {
    "wms-webhook": { "waiting": 0, "active": 0, "completed": 150, "failed": 2 },
    "wms-script": { "waiting": 0, "active": 0, "completed": 50, "failed": 0 },
    "wms-audit": { "waiting": 3, "active": 1, "completed": 1200, "failed": 0 }
  }
}
```

### ステータス判定 / 状态判定

| ステータス / 状态 | HTTP | 条件 / 条件 |
|---|---|---|
| `ok` | 200 | PostgreSQL + Redis 接続中 / 已连接 |
| `degraded` | 200 | Redis 切断、MongoDB 切断（非必須サービス）/ 非必须服务断开 |
| `error` | 503 | PostgreSQL 切断 / 已断开 |

### Docker ヘルスチェック / Docker 健康检查

```yaml
healthcheck:
  test: ["CMD", "node", "-e", "fetch('http://localhost:4000/health/liveness').then(r => r.ok ? process.exit(0) : process.exit(1))"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 30s
```

---

## 2. 構造化ログ / 结构化日志

### Pino Logger（JSON 出力）/ Pino Logger（JSON 输出）

ZELIXWMS は [Pino](https://github.com/pinojs/pino) を使用した構造化 JSON ログを採用。
ZELIXWMS 使用 [Pino](https://github.com/pinojs/pino) 进行结构化 JSON 日志记录。

### ログレベル / 日志级别

| レベル / 级别 | 用途 / 用途 | 環境 / 环境 |
|---|---|---|
| `fatal` | プロセス終了を伴う致命的エラー / 导致进程退出的致命错误 | 全環境 / 所有环境 |
| `error` | 処理失敗・例外 / 处理失败、异常 | 全環境 |
| `warn` | 遅延リクエスト、設定不備、非推奨機能 / 慢请求、配置缺失、废弃功能 | 全環境 |
| `info` | 起動、接続、リクエスト完了 / 启动、连接、请求完成 | 全環境 |
| `debug` | リクエスト詳細、SQL クエリ、内部処理 / 请求详情、SQL 查询、内部处理 | 開発のみ / 仅开发 |

### 環境別フォーマット / 各环境日志格式

| 環境 / 环境 | フォーマット / 格式 | 特徴 / 特征 |
|---|---|---|
| development | `pino-pretty`（色付き）/ 彩色 | 人間が読みやすい / 可读性好 |
| production | JSON (raw Pino) | 機械解析可能 / 机器可解析 |

### リクエスト ID 相関 / 请求 ID 关联

すべてのリクエストに一意の `requestId` を付与し、ログに含める。
为所有请求分配唯一 `requestId`，并包含在日志中。

```json
{
  "level": 30,
  "time": 1711000000000,
  "requestId": "req-abc123",
  "msg": "GET /api/products 200 45ms",
  "method": "GET",
  "url": "/api/products",
  "statusCode": 200,
  "durationMs": 45,
  "userId": "user-xyz"
}
```

リクエスト ID は以下の場所で追跡可能 / 请求 ID 可在以下位置追踪:
- リクエストログ / 请求日志
- エラーログ / 错误日志
- DB クエリログ（debug レベル）/ DB 查询日志
- レスポンスヘッダー `X-Request-Id`

---

## 3. 監視すべきメトリクス / 需要监控的指标

### レスポンスタイム / 响应时间

| メトリクス / 指标 | 正常値 / 正常值 | 警告閾値 / 警告阈值 | 危険閾値 / 危险阈值 |
|---|---|---|---|
| p50 | < 50ms | > 100ms | > 200ms |
| p95 | < 200ms | > 500ms | > 1000ms |
| p99 | < 500ms | > 1000ms | > 3000ms |

### エラーレート / 错误率

| メトリクス / 指标 | 正常値 / 正常值 | 警告閾値 | 危険閾値 |
|---|---|---|---|
| 5xx エラー率 / 错误率 | < 0.1% | > 0.5% | > 1% |
| 4xx エラー率 | < 5% | > 10% | > 20% |

### DB コネクションプール / DB 连接池

| メトリクス / 指标 | 正常値 | 警告閾値 | 危険閾値 |
|---|---|---|---|
| アクティブ接続数 / 活跃连接数 | < 50% | > 70% | > 80% |
| アイドル接続数 / 空闲连接数 | > 20% | < 10% | 0 |
| 待機リクエスト / 等待请求 | 0 | > 5 | > 20 |

### Redis メモリ / Redis 内存

| メトリクス / 指标 | 正常値 | 警告閾値 | 危険閾値 |
|---|---|---|---|
| 使用メモリ / 使用内存 | < 60% | > 75% | > 90% |
| エビクション数 / 淘汰数 | 0 | > 10/min | > 100/min |

### キュー深度 / 队列深度

| メトリクス / 指标 | 正常値 | 警告閾値 | 危険閾値 |
|---|---|---|---|
| waiting ジョブ数 / 等待任务数 | < 10 | > 50 | > 100 |
| failed ジョブ数 / 失败任务数 | 0 | > 5 | > 20 |

---

## 4. アラートルール / 告警规则

### 必須アラート / 必须告警

| アラート名 / 告警名 | 条件 / 条件 | 重要度 / 严重度 | アクション / 动作 |
|---|---|---|---|
| API エラー率高騰 / API 错误率飙升 | 5xx rate > 1%（5分間）/ 5 分钟内 | Critical | PagerDuty / Slack 通知 |
| レスポンス遅延 / 响应延迟 | p95 > 500ms（5分間） | Warning | Slack 通知 |
| DB 接続枯渇 / DB 连接耗尽 | active connections > 80% | Critical | PagerDuty 通知 |
| キュー滞留 / 队列积压 | waiting > 100（10分間）/ 10 分钟内 | Warning | Slack 通知 |
| ヘルスチェック失敗 | /health/readiness 503（3回連続）/ 连续 3 次 | Critical | PagerDuty + 自動再起動 / 自动重启 |
| ディスク使用率 / 磁盘使用率 | > 85% | Warning | Slack 通知 |
| メモリ使用率 / 内存使用率 | RSS > 450MB（512MB 上限の 88%）/ 512MB 上限的 88% | Warning | Slack 通知 |

---

## 5. ダッシュボード / 仪表盘

### 推奨構成 / 推荐配置

| ツール / 工具 | 用途 / 用途 | 備考 / 备注 |
|---|---|---|
| **Grafana** | メトリクスダッシュボード / 指标仪表盘 | Prometheus データソース |
| **Supabase Dashboard** | DB 監視、クエリパフォーマンス / DB 监控、查询性能 | Supabase 組み込み / 内置 |
| **Sentry** | エラートラッキング / 错误追踪 | ソースマップ対応 |

### Grafana ダッシュボードパネル / Grafana 仪表盘面板

推奨パネル構成 / 推荐面板配置:

1. **概要 / 概览**: リクエスト数、エラー率、平均レスポンスタイム / 请求数、错误率、平均响应时间
2. **レスポンスタイム / 响应时间**: p50 / p95 / p99 の時系列グラフ / 时序图
3. **DB コネクション / DB 连接**: アクティブ / アイドル / 待機 / 活跃 / 空闲 / 等待
4. **Redis**: メモリ使用量、キー数、エビクション / 内存使用量、键数、淘汰
5. **キュー / 队列**: 各キューの waiting / active / failed
6. **システムリソース**: CPU、メモリ、ディスク I/O

---

## 6. ログ集約 / 日志聚合

### アーキテクチャ / 架构

```
NestJS App (Pino JSON → stdout)
    │
    ▼
Docker logging driver
    │
    ├──▶ ローカル: docker logs / 本地: docker logs
    ├──▶ AWS: CloudWatch Logs
    ├──▶ GCP: Cloud Logging（自動収集）/ 自动收集
    └──▶ セルフホスト: Loki + Grafana
```

### ログドライバー設定 / 日志驱动配置

```yaml
# docker-compose.prod.yml
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "50m"
        max-file: "5"
```

### ログ検索例 / 日志搜索示例

```bash
# Docker ログ（リアルタイム） / Docker 日志（实时）
docker compose logs -f backend

# 直近 5 分間 / 最近 5 分钟
docker compose logs -f backend --since 5m

# エラーのみ抽出 / 仅提取错误
docker compose logs backend | jq 'select(.level >= 50)'

# 特定リクエスト ID で追跡 / 按请求 ID 追踪
docker compose logs backend | jq 'select(.requestId == "req-abc123")'

# 遅延リクエストのみ / 仅慢请求
docker compose logs backend | jq 'select(.durationMs > 1000)'
```

---

## 7. APM（アプリケーションパフォーマンス監視）/ APM（应用性能监控）

### OpenTelemetry 対応 / OpenTelemetry 支持

NestJS は OpenTelemetry SDK との統合が可能。将来的な導入に備えた設計。
NestJS 可与 OpenTelemetry SDK 集成，为将来的引入做好准备。

| レイヤー / 层 | トレース対象 / 追踪目标 |
|---|---|
| HTTP | 受信リクエスト / 接收请求 |
| PostgreSQL | SQL クエリ / SQL 查询 |
| Redis | キャッシュ操作 / 缓存操作 |
| BullMQ | キュージョブ実行 / 队列任务执行 |
| 外部 API | Yamato B2 Cloud 等 |

### Sentry エラートラッキング / Sentry 错误追踪

```typescript
// NestJS への Sentry 統合 / Sentry 集成到 NestJS
import * as Sentry from '@sentry/nestjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 本番は 10% サンプリング / 生产环境 10% 采样
});
```

主な機能 / 主要功能:
- エラー自動キャプチャ / 自动捕获错误
- ソースマップによるスタックトレース / 通过 Source Map 还原堆栈
- パフォーマンストランザクション / 性能事务追踪
- Release トラッキング / 版本追踪

---

## 8. 外部からの死活監視 / 外部存活监控

### Uptime 監視 / Uptime 监控

外部サービスから定期的にヘルスチェックエンドポイントを監視。
从外部服务定期监控健康检查端点。

| 設定項目 / 设置项 | 推奨値 / 推荐值 |
|---|---|
| チェック間隔 / 检查间隔 | 60 秒 |
| タイムアウト / 超时 | 10 秒 |
| 確認回数 / 确认次数 | 3 回連続失敗でアラート / 连续 3 次失败后告警 |
| 対象 URL / 目标 URL | `https://zelix-wms.com/health/liveness` |

### 推奨ツール / 推荐工具

| ツール / 工具 | 特徴 / 特征 |
|---|---|
| UptimeRobot | 無料枠あり、Slack 連携 / 有免费额度、Slack 集成 |
| Better Uptime | インシデント管理、ステータスページ / 事件管理、状态页 |
| Cloudflare Health Checks | Cloudflare 利用時は無料 / 使用 Cloudflare 时免费 |

---

## 参考ファイル / 参考文件

| ファイル / 文件 | 説明 / 说明 |
|---|---|
| `backend/src/lib/logger.ts` | Pino ロガー設定 / 日志配置 |
| `backend/src/health/` | ヘルスチェックモジュール / 健康检查模块 |
| `backend/src/common/middleware/` | リクエストログ・タイマーミドルウェア / 请求日志和计时中间件 |
| `backend/src/common/interceptors/` | ログ・パフォーマンスインターセプター / 日志和性能拦截器 |
| `docker-compose.prod.yml` | 本番 Docker 構成（ログ設定含む）/ 生产 Docker 配置（含日志设置） |
