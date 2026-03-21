# 監視・ログガイド / 监控与日志指南

> ZELIXWMS のログ設計、ヘルスチェック、メトリクス、アラートの全体像。
> ZELIXWMS 的日志设计、健康检查、指标监控、告警的全貌。

---

## 1. ログ設計 / 日志设计

### Pino Logger

ZELIXWMS は [Pino](https://github.com/pinojs/pino) を使用した構造化ログを採用。
ZELIXWMS 使用 [Pino](https://github.com/pinojs/pino) 进行结构化日志记录。

**設定ファイル / 配置文件**: `backend/src/lib/logger.ts`

```typescript
import pino from 'pino';

const isProd = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isProd ? 'info' : 'debug'),
  transport: isProd ? undefined : {
    target: 'pino-pretty',
    options: { colorize: true, translateTime: 'SYS:standard' },
  },
});
```

### ログレベル / 日志级别

| レベル | 用途 / 用途 | 環境 |
|---|---|---|
| `fatal` | プロセス終了を伴う致命的エラー / 导致进程退出的致命错误 | 全環境 |
| `error` | 処理失敗 / 处理失败 | 全環境 |
| `warn` | 遅延リクエスト、設定不備 / 慢请求、配置缺失 | 全環境 |
| `info` | 起動、接続、処理完了 / 启动、连接、处理完成 | 全環境 |
| `debug` | リクエスト詳細、内部処理 / 请求详情、内部处理 | 開発のみ |

### 構造化ログの例 / 结构化日志示例

```json
{
  "level": 30,
  "time": 1711000000000,
  "msg": "Slow request detected (1523ms)",
  "method": "GET",
  "url": "/api/shipments",
  "statusCode": 200,
  "durationMs": 1523
}
```

### 環境別フォーマット / 各环境日志格式

| 環境 | フォーマット | 特徴 / 特征 |
|---|---|---|
| development | `pino-pretty` | 色付き、人間が読みやすい / 彩色、可读性好 |
| production | JSON (raw Pino) | 機械解析可能、集約ツール対応 / 机器可解析、可接入聚合工具 |

---

## 2. ヘルスチェック / 健康检查

### エンドポイント / 端点

**ファイル**: `backend/src/api/routes/health.ts`

| エンドポイント | 用途 / 用途 | 認証 |
|---|---|---|
| `GET /health` | 詳細ヘルスチェック / 详细健康检查 | 不要 |
| `GET /health/liveness` | 存活プローブ（K8s 用）/ 存活探针 | 不要 |

### `/health` レスポンス例 / 响应示例

```json
{
  "status": "ok",
  "version": "0.1.0",
  "timestamp": "2026-03-21T00:00:00.000Z",
  "uptime": 86400,
  "services": {
    "database": {
      "status": "connected",
      "latencyMs": 2
    },
    "redis": {
      "status": "connected"
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

| ステータス | HTTP | 条件 / 条件 |
|---|---|---|
| `ok` | 200 | MongoDB 接続中 / 已连接 |
| `degraded` | 503 | MongoDB 切断 / 已断开 |
| `error` | 503 | チェック自体が失敗 / 检查本身失败 |

### Docker ヘルスチェック / Docker 健康检查

`docker-compose.yml` で定義済み。
已在 `docker-compose.yml` 中定义。

```yaml
healthcheck:
  test: ["CMD", "node", "-e", "fetch('http://localhost:4000/health').then(...)"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 20s
```

---

## 3. メトリクス / 指标监控

### requestTimer ミドルウェア / 中间件

**ファイル**: `backend/src/api/middleware/requestTimer.ts`

すべてのリクエストのレスポンスタイムを計測。
对所有请求的响应时间进行计测。

| 機能 / 功能 | 詳細 / 详情 |
|---|---|
| レスポンスヘッダー | `X-Response-Time: <ms>ms` |
| 遅延閾値 / 慢请求阈值 | 1000ms 以上で `warn` ログ出力 |
| 通常リクエスト | `debug` レベルでログ出力 |

### 遅延リクエスト検出ログ / 慢请求检测日志

```json
{
  "level": 40,
  "msg": "Slow request detected (1523ms)",
  "method": "GET",
  "url": "/api/shipments?page=1&limit=100",
  "statusCode": 200,
  "durationMs": 1523
}
```

### Redis キュー統計 / Redis 队列统计

`/health` エンドポイントでキュー統計を確認可能。
可通过 `/health` 端点查看队列统计。

| キュー名 | 用途 / 用途 |
|---|---|
| `wms-webhook` | Webhook 配信 / Webhook 投递 |
| `wms-script` | 自動化スクリプト実行 / 自动化脚本执行 |
| `wms-audit` | 監査ログ書き込み / 审计日志写入 |

各キューの `waiting`, `active`, `completed`, `failed` カウントが表示される。
显示每个队列的等待、活动、完成、失败计数。

### メモリ使用量 / 内存使用量

`/health` レスポンスに含まれるメモリ情報（MB 単位）。
包含在 `/health` 响应中的内存信息（单位 MB）。

- `rss`: プロセス全体の常駐メモリ / 进程常驻内存
- `heapUsed`: V8 ヒープ使用量 / V8 堆使用量
- `heapTotal`: V8 ヒープ合計 / V8 堆总量
- `external`: C++ オブジェクト（Buffer 等）/ C++ 对象

---

## 4. アラート / 告警

### 在庫アラート / 库存告警

**低在庫検出 / 低库存检测**: `lowStockCount`

GraphQL (`dashboardStats`) および REST API (`/api/inventory/dashboard`) で提供。
通过 GraphQL 和 REST API 提供。

検出ロジック / 检测逻辑:
- `StockQuant` の `quantity` が `product.minStockLevel` を下回る商品数を集計
- 集计库存数量低于 `product.minStockLevel` 的商品数

### 通知システム / 通知系统

**ファイル**: `backend/src/services/notificationService.ts`

| チャネル / 通道 | 説明 / 说明 | 設定 |
|---|---|---|
| `in_app` | アプリ内通知（MongoDB 保存）/ 站内通知 | 常に有効 |
| `email` | メール通知（nodemailer）/ 邮件通知 | `SMTP_HOST` 設定時のみ |
| `webhook` | 外部 Webhook 配信 / 外部 Webhook | BullMQ 経由で非同期 |

### イベントテンプレート / 事件模板

| イベント | 通知内容 / 通知内容 | 優先度 |
|---|---|---|
| `order.created` | 新しい出荷指示 / 新出库指示 | normal |
| `order.confirmed` | 出荷指示確認 / 出库确认 | normal |
| `order.shipped` | 出荷完了（追跡番号付き）/ 出库完成（含追踪号）| normal |

### ユーザー通知設定 / 用户通知偏好

`NotificationPreference` モデルでユーザーごとのチャネル設定を管理。
通过 `NotificationPreference` 模型管理每个用户的通道偏好设置。

---

## 5. ログローテーション / 日志轮转

### MongoDB TTL インデックス / MongoDB TTL 索引

ログコレクションには 180 日の TTL インデックスが設定済み。MongoDB が自動削除。
日志集合已设置 180 天 TTL 索引，MongoDB 自动删除过期数据。

| コレクション | TTL | インデックス |
|---|---|---|
| `api_logs` | 180 日 | `{ createdAt: 1 }, { expireAfterSeconds: 15552000 }` |
| `operation_logs` | 180 日 | `{ createdAt: 1 }, { expireAfterSeconds: 15552000 }` |

### api_logs の構造 / api_logs 结构

外部 API 連携（Yamato B2 Cloud 等）の呼び出し記録。
外部 API 对接（Yamato B2 Cloud 等）的调用记录。

主要フィールド / 主要字段:
- `apiName`, `action`, `status` (`pending` / `running` / `success` / `error` / `timeout`)
- `requestUrl`, `requestMethod`, `statusCode`
- `processedCount`, `successCount`, `errorCount`
- `durationMs`, `startedAt`, `completedAt`

### operation_logs の構造 / operation_logs 结构

倉庫業務の操作記録。
仓库业务操作记录。

主要フィールド / 主要字段:
- `action`: `inbound_receive`, `outbound_pick`, `transfer`, `adjustment` 等
- `category`: `inbound`, `outbound`, `inventory`, `master`, `return`
- `productSku`, `productName`, `locationCode`, `quantity`
- `userName`, `referenceNumber`

---

## 6. デバッグ手法 / 调试方法

### ログベースのデバッグ / 基于日志的调试

```bash
# 開発環境（pino-pretty で色付き出力） / 开发环境（美化输出）
cd backend && npm run dev

# Docker 環境でのログ確認 / Docker 环境查看日志
docker compose logs -f backend

# 特定サービスのログ / 特定服务日志
docker compose logs -f backend --since 5m

# 遅延リクエストのみ抽出（本番 JSON ログ） / 仅提取慢请求（生产 JSON 日志）
docker compose logs backend | grep "Slow request"
```

### API ログ UI / API 日志界面

Admin ダッシュボード（`:3001` / `:3003`）で API ログと操作ログを閲覧可能。
可在管理后台查看 API 日志和操作日志。

| 画面 | 内容 / 内容 |
|---|---|
| API ログ一覧 | 外部 API 呼び出し履歴、ステータス、レスポンスタイム |
| 操作ログ一覧 | 入出庫・在庫調整・マスタ変更の操作履歴 |

### ヘルスチェックによる障害切り分け / 通过健康检查排查故障

```bash
# 全体ステータス確認 / 整体状态确认
curl -s http://localhost:4000/health | jq .

# 確認すべきポイント / 需要确认的要点:
# 1. services.database.status → "connected" か？ / 是否为 "connected"？
# 2. services.redis.status → "connected" か？
# 3. memory.heapUsed → 異常に高くないか？ / 是否异常偏高？
# 4. queues → failed ジョブが増えていないか？ / 失败任务是否在增加？
```

### グレースフルシャットダウン / 优雅关闭

`backend/src/server.ts` にシグナルハンドラが実装済み。
`backend/src/server.ts` 中已实现信号处理器。

| シグナル | 動作 / 行为 |
|---|---|
| `SIGTERM` / `SIGINT` | HTTP → Queue → DB の順に閉じる / 按顺序关闭 |
| `uncaughtException` | ログ出力後シャットダウン / 输出日志后关闭 |
| `unhandledRejection` | ログ出力後シャットダウン |
| タイムアウト (10s) | 強制終了 / 强制退出 |

---

## 参考ファイル / 参考文件

| ファイル | 説明 |
|---|---|
| `backend/src/lib/logger.ts` | Pino ロガー設定 / 日志配置 |
| `backend/src/api/routes/health.ts` | ヘルスチェックルート / 健康检查路由 |
| `backend/src/api/middleware/requestTimer.ts` | レスポンスタイム計測 / 响应时间计测 |
| `backend/src/models/apiLog.ts` | API ログモデル（180 日 TTL）|
| `backend/src/models/operationLog.ts` | 操作ログモデル（180 日 TTL）|
| `backend/src/services/notificationService.ts` | 通知サービス / 通知服务 |
| `backend/src/services/operationLogger.ts` | 操作ログ記録 / 操作日志记录 |
| `backend/src/services/apiLogger.ts` | API ログ記録 / API 日志记录 |
| `backend/src/server.ts` | グレースフルシャットダウン / 优雅关闭 |
