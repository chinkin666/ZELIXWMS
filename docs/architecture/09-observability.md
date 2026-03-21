# ZELIXWMS 可观测性设计 / オブザーバビリティ設計

> ZELIXWMS 的可观测性（Observability）全面设计文档，覆盖日志、指标、追踪三大支柱。
> ZELIXWMS のオブザーバビリティ（可観測性）包括的設計書。ログ・メトリクス・トレースの三本柱をカバー。
>
> 最后更新 / 最終更新: 2026-03-21

---

## 目录 / 目次

1. [可观测性三大支柱 / オブザーバビリティ三本柱](#1-可观测性三大支柱--オブザーバビリティ三本柱)
2. [日志设计 / ログ設計](#2-日志设计--ログ設計)
3. [指标设计 / メトリクス設計](#3-指标设计--メトリクス設計)
4. [追踪设计 / トレーシング設計](#4-追踪设计--トレーシング設計)
5. [仪表板设计 / ダッシュボード設計](#5-仪表板设计--ダッシュボード設計)
6. [告警规则 / アラートルール](#6-告警规则--アラートルール)
7. [审计日志 / 監査ログ](#7-审计日志--監査ログ)
8. [健康检查 / ヘルスチェック](#8-健康检查--ヘルスチェック)
9. [实施路线图 / 実装ロードマップ](#9-实施路线图--実装ロードマップ)
10. [参考文件 / 参考ファイル](#10-参考文件--参考ファイル)

---

## 1. 可观测性三大支柱 / オブザーバビリティ三本柱

### 1.1 总体架构 / 全体アーキテクチャ

```
┌─────────────────────────────────────────────────────────────────┐
│                     ZELIXWMS Application                         │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────────────┐  │
│  │  Pino    │  │ prom-client  │  │ @opentelemetry/sdk-node   │  │
│  │  Logger  │  │  Metrics     │  │  Tracing                  │  │
│  └────┬─────┘  └──────┬───────┘  └─────────────┬─────────────┘  │
└───────┼───────────────┼─────────────────────────┼────────────────┘
        │               │                         │
        ▼               ▼                         ▼
   ┌─────────┐   ┌───────────┐          ┌─────────────────┐
   │  Loki   │   │Prometheus │          │ Tempo / Jaeger  │
   │ (日志)  │   │ (指标)    │          │ (追踪)          │
   └────┬────┘   └─────┬─────┘          └────────┬────────┘
        │               │                         │
        └───────────────┼─────────────────────────┘
                        ▼
               ┌─────────────────┐
               │    Grafana      │
               │  (统一仪表板)   │
               │  (統一ダッシュ  │
               │   ボード)       │
               └────────┬────────┘
                        ▼
               ┌─────────────────┐
               │   Alertmanager  │
               │  → Slack        │
               │  → PagerDuty    │
               │  → Email        │
               └─────────────────┘
```

### 1.2 三大支柱概要 / 三本柱サマリ

| 支柱 / 柱 | 工具 / ツール | 用途 / 用途 | 存储 / ストレージ |
|---|---|---|---|
| **日志 / ログ** | Pino → Loki | 离散事件记录 / 離散イベント記録 | Loki (30 天热存储 / 1 年冷存储) |
| **指标 / メトリクス** | prom-client → Prometheus | 时序数值聚合 / 時系列数値集計 | Prometheus (15 天) + Thanos (1 年) |
| **追踪 / トレース** | OpenTelemetry → Tempo | 请求链路分析 / リクエストチェーン分析 | Tempo (7 天) |

### 1.3 关联性设计 / 相関設計

三大支柱通过以下字段关联，实现跨信号的端到端调查能力：
三本柱を以下のフィールドで相関させ、シグナル横断の E2E 調査を実現：

| 关联字段 / 相関フィールド | 日志 / ログ | 指标 / メトリクス | 追踪 / トレース |
|---|---|---|---|
| `traceId` | 包含 / 含む | exemplar 标签 | span の traceId |
| `requestId` | 包含 / 含む | - | span attribute |
| `tenantId` | 包含 / 含む | label | span attribute |

---

## 2. 日志设计 / ログ設計

### 2.1 日志级别 / ログレベル

| 级别 / レベル | 数值 / 値 | 用途 / 用途 | 示例 / 例 | 环境 / 環境 |
|---|---|---|---|---|
| `fatal` | 60 | 进程即将退出的致命错误 / プロセス終了を伴う致命的エラー | 无法连接数据库启动失败 / DB 接続不可で起動失敗 | 全环境 / 全環境 |
| `error` | 50 | 请求处理失败、未捕获异常 / リクエスト処理失敗・未キャッチ例外 | API 500 错误、第三方 API 超时 / API 500 エラー、外部 API タイムアウト | 全环境 |
| `warn` | 40 | 潜在问题、降级操作 / 潜在的な問題・縮退運転 | 慢查询、缓存未命中、废弃 API 调用 / スロークエリ、キャッシュミス、廃止 API | 全环境 |
| `info` | 30 | 正常业务事件 / 正常な業務イベント | 服务启动、请求完成、出荷创建 / サービス起動、リクエスト完了、出荷作成 | 全环境 |
| `debug` | 20 | 详细调试信息 / 詳細デバッグ情報 | SQL 查询内容、变量值、分支判断 / SQL クエリ内容、変数値、分岐判定 | 开发/staging |
| `trace` | 10 | 极细粒度追踪 / 極めて細かい粒度のトレース | 函数入口/出口、循环迭代 / 関数の入口/出口、ループ反復 | 仅开发 / 開発のみ |

### 2.2 结构化字段 / 構造化フィールド

所有日志条目必须包含以下标准字段：
すべてのログエントリに以下の標準フィールドを含める：

#### 必须字段 / 必須フィールド

```typescript
interface LogEntry {
  // Pino 自动生成 / Pino 自動生成
  level: number;             // 日志级别 / ログレベル
  time: number;              // Unix 毫秒时间戳 / Unix ミリ秒タイムスタンプ
  pid: number;               // 进程 ID / プロセス ID
  hostname: string;          // 主机名 / ホスト名

  // 请求上下文 / リクエストコンテキスト
  requestId: string;         // 唯一请求 ID (UUID v4) / 一意リクエスト ID
  traceId?: string;          // OpenTelemetry trace ID
  spanId?: string;           // OpenTelemetry span ID

  // 租户/用户上下文 / テナント/ユーザーコンテキスト
  tenantId?: string;         // 租户 ID / テナント ID
  userId?: string;           // 用户 ID / ユーザー ID

  // 操作上下文 / 操作コンテキスト
  module: string;            // 模块名 / モジュール名 (e.g., 'shipment', 'inventory')
  action: string;            // 操作名 / アクション名 (e.g., 'create', 'update', 'delete')
  durationMs?: number;       // 操作耗时(ms) / 処理時間(ms)

  // HTTP 上下文（中间件自动附加） / HTTP コンテキスト（ミドルウェア自動付与）
  method?: string;           // HTTP 方法 / HTTP メソッド
  url?: string;              // 请求路径 / リクエストパス
  statusCode?: number;       // 响应状态码 / レスポンスステータスコード
  userAgent?: string;        // User-Agent
  ip?: string;               // 客户端 IP / クライアント IP

  // 消息 / メッセージ
  msg: string;               // 可读消息 / 可読メッセージ
  err?: Error;               // 错误对象 / エラーオブジェクト
}
```

#### 日志示例 / ログ出力例

```json
{
  "level": 30,
  "time": 1711324800000,
  "pid": 1,
  "hostname": "wms-backend-7f8d9c6b5-x2k4p",
  "requestId": "req-550e8400-e29b-41d4-a716-446655440000",
  "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
  "spanId": "00f067aa0ba902b7",
  "tenantId": "tenant-abc123",
  "userId": "user-xyz789",
  "module": "shipment",
  "action": "create",
  "method": "POST",
  "url": "/api/shipment-orders",
  "statusCode": 201,
  "durationMs": 127,
  "msg": "Shipment order created successfully / 出荷オーダー作成成功"
}
```

### 2.3 Pino 配置 / Pino 設定

当前 `backend/src/lib/logger.ts` 的增强配置：
現在の `backend/src/lib/logger.ts` の拡張設定：

```typescript
import pino from 'pino';

const isProd = process.env.NODE_ENV === 'production';

// 敏感字段自动脱敏 / 機密フィールド自動マスキング
const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'password',
  'token',
  'secret',
  'accessToken',
  'refreshToken',
  'apiKey',
  'creditCard',
  'ssn',
  '*.password',
  '*.token',
  '*.secret',
  '*.accessToken',
  '*.refreshToken',
  '*.apiKey',
];

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isProd ? 'info' : 'debug'),

  // 脱敏配置 / マスキング設定
  redact: {
    paths: REDACT_PATHS,
    censor: '[REDACTED]',
  },

  // 基础字段（全条目共通）/ ベースフィールド（全エントリ共通）
  base: {
    pid: process.pid,
    hostname: process.env.HOSTNAME || undefined,
    service: 'zelixwms-backend',
    version: process.env.APP_VERSION || 'unknown',
    env: process.env.NODE_ENV || 'development',
  },

  // 时间戳格式 / タイムスタンプ形式
  timestamp: pino.stdTimeFunctions.isoTime,

  // 序列化器 / シリアライザー
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },

  // 开发环境美化输出 / 開発環境で見やすく整形
  transport: isProd
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
});

// 子logger工厂 / 子ロガーファクトリ
export function createModuleLogger(module: string) {
  return logger.child({ module });
}
```

### 2.4 请求上下文中间件 / リクエストコンテキストミドルウェア

```typescript
import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { logger } from '@/lib/logger';

export function requestContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();
  const startTime = Date.now();

  // 注入请求上下文到 logger / リクエストコンテキストを logger に注入
  req.log = logger.child({
    requestId,
    tenantId: req.user?.tenantId,
    userId: req.user?.id,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });

  // 响应头返回 requestId / レスポンスヘッダーに requestId を返す
  res.setHeader('X-Request-Id', requestId);

  // 响应完成后记录 / レスポンス完了後に記録
  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    const logData = {
      statusCode: res.statusCode,
      durationMs,
      contentLength: res.getHeader('content-length'),
    };

    if (res.statusCode >= 500) {
      req.log.error(logData, `${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms`);
    } else if (res.statusCode >= 400) {
      req.log.warn(logData, `${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms`);
    } else if (durationMs > 1000) {
      req.log.warn({ ...logData, slow: true }, `SLOW ${req.method} ${req.originalUrl} ${durationMs}ms`);
    } else {
      req.log.info(logData, `${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms`);
    }
  });

  next();
}
```

### 2.5 日志轮转与保留 / ログローテーションと保持

| 层级 / レイヤー | 策略 / ストラテジー | 保留期间 / 保持期間 | 存储 / ストレージ |
|---|---|---|---|
| **热存储 / ホット** | Loki 实时索引 / リアルタイムインデックス | 30 天 / 30 日 | Loki + S3 (chunks) |
| **温存储 / ウォーム** | S3 压缩存档 / 圧縮アーカイブ | 1 年 / 1 年 | S3 Glacier Instant |
| **冷存储 / コールド** | S3 深层归档 / ディープアーカイブ | 7 年（审计） / 7 年（監査） | S3 Glacier Deep Archive |

#### Docker 日志驱动配置 / Docker ログドライバー設定

```yaml
# docker-compose.prod.yml
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "50m"      # 单文件最大 50MB / ファイル最大 50MB
        max-file: "10"       # 最多保留 10 个文件 / 最大 10 ファイル保持
        tag: "zelixwms-backend"
```

#### Loki 保留策略 / Loki 保持ポリシー

```yaml
# loki-config.yaml
limits_config:
  retention_period: 720h       # 30 天 / 30 日
  max_query_series: 5000

compactor:
  working_directory: /tmp/loki/compactor
  shared_store: s3
  retention_enabled: true
  retention_delete_delay: 2h
```

### 2.6 敏感数据脱敏 / 機密データマスキング

#### 自动脱敏字段 / 自動マスキングフィールド

以下字段在日志输出时自动替换为 `[REDACTED]`：
以下のフィールドはログ出力時に自動的に `[REDACTED]` に置換：

| 字段路径 / フィールドパス | 说明 / 説明 |
|---|---|
| `password`, `*.password` | 密码 / パスワード |
| `token`, `*.token` | 认证令牌 / 認証トークン |
| `secret`, `*.secret` | 密钥 / シークレット |
| `accessToken`, `*.accessToken` | 访问令牌 / アクセストークン |
| `refreshToken`, `*.refreshToken` | 刷新令牌 / リフレッシュトークン |
| `apiKey`, `*.apiKey` | API 密钥 / API キー |
| `creditCard` | 信用卡号 / クレジットカード番号 |
| `req.headers.authorization` | Authorization 头 / ヘッダー |
| `req.headers.cookie` | Cookie 头 / ヘッダー |

#### 脱敏验证 / マスキング検証

```typescript
// 测试：确保敏感字段不泄漏 / テスト：機密フィールドの漏洩防止確認
describe('Logger redaction / ロガー脱敏', () => {
  it('should redact password fields / パスワードフィールドを脱敏する', () => {
    const output = captureLogOutput(() => {
      logger.info({ password: 'super-secret', user: 'test' }, 'login attempt');
    });
    expect(output).not.toContain('super-secret');
    expect(output).toContain('[REDACTED]');
  });
});
```

---

## 3. 指标设计 / メトリクス設計

### 3.1 指标收集架构 / メトリクス収集アーキテクチャ

```
ZELIXWMS Backend
    │
    ├── prom-client (Node.js metrics)
    │   └── GET /metrics (Prometheus 格式 / 形式)
    │
    ▼
Prometheus Server
    │
    ├── scrape interval: 15s
    ├── retention: 15 天 / 15 日
    │
    ▼
Grafana (可视化 / 可視化)
```

### 3.2 指标端点配置 / メトリクスエンドポイント設定

```typescript
import { collectDefaultMetrics, Registry, Counter, Histogram, Gauge } from 'prom-client';

const register = new Registry();

// 收集 Node.js 默认指标 / Node.js デフォルトメトリクス収集
collectDefaultMetrics({
  register,
  prefix: 'zelixwms_',
  labels: { service: 'backend' },
});

// Prometheus 端点 / エンドポイント
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

### 3.3 HTTP 指标 / HTTP メトリクス

| 指标名 / メトリクス名 | 类型 / タイプ | 标签 / ラベル | 说明 / 説明 |
|---|---|---|---|
| `zelixwms_http_request_total` | Counter | method, path, status_code, tenant_id | HTTP 请求总数 / リクエスト総数 |
| `zelixwms_http_request_duration_seconds` | Histogram | method, path, status_code | HTTP 请求耗时 / リクエスト所要時間 |
| `zelixwms_http_request_size_bytes` | Histogram | method, path | 请求体大小 / リクエストボディサイズ |
| `zelixwms_http_response_size_bytes` | Histogram | method, path | 响应体大小 / レスポンスボディサイズ |
| `zelixwms_http_error_total` | Counter | method, path, status_code, error_type | HTTP 错误总数 / エラー総数 |

```typescript
// HTTP 指标定义 / HTTP メトリクス定義
const httpRequestTotal = new Counter({
  name: 'zelixwms_http_request_total',
  help: 'Total HTTP requests / HTTP リクエスト総数',
  labelNames: ['method', 'path', 'status_code', 'tenant_id'],
  registers: [register],
});

const httpRequestDuration = new Histogram({
  name: 'zelixwms_http_request_duration_seconds',
  help: 'HTTP request duration in seconds / HTTP リクエスト所要時間（秒）',
  labelNames: ['method', 'path', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

const httpErrorTotal = new Counter({
  name: 'zelixwms_http_error_total',
  help: 'Total HTTP errors / HTTP エラー総数',
  labelNames: ['method', 'path', 'status_code', 'error_type'],
  registers: [register],
});
```

### 3.4 业务指标 / ビジネスメトリクス

| 指标名 / メトリクス名 | 类型 / タイプ | 标签 / ラベル | 说明 / 説明 |
|---|---|---|---|
| `zelixwms_shipments_created_total` | Counter | tenant_id, carrier, status | 出荷创建总数 / 出荷作成総数 |
| `zelixwms_shipments_completed_total` | Counter | tenant_id, carrier | 出荷完成总数 / 出荷完了総数 |
| `zelixwms_shipments_cancelled_total` | Counter | tenant_id, reason | 出荷取消总数 / 出荷キャンセル総数 |
| `zelixwms_inbound_received_total` | Counter | tenant_id, type | 入荷受领总数 / 入荷受領総数 |
| `zelixwms_inbound_inspected_total` | Counter | tenant_id, result | 入荷检品总数 / 入荷検品総数 |
| `zelixwms_stock_adjustments_total` | Counter | tenant_id, reason, direction | 库存调整总数 / 在庫調整総数 |
| `zelixwms_picking_completed_total` | Counter | tenant_id, method | 拣选完成总数 / ピッキング完了総数 |
| `zelixwms_returns_processed_total` | Counter | tenant_id, reason | 退货处理总数 / 返品処理総数 |
| `zelixwms_labels_generated_total` | Counter | tenant_id, carrier, format | 标签生成总数 / ラベル生成総数 |
| `zelixwms_csv_imports_total` | Counter | tenant_id, entity_type, status | CSV 导入总数 / CSV インポート総数 |
| `zelixwms_active_inventory_items` | Gauge | tenant_id | 活跃库存 SKU 数 / アクティブ在庫 SKU 数 |
| `zelixwms_daily_shipment_volume` | Gauge | tenant_id | 当日出荷量 / 当日出荷量 |

```typescript
// 业务指标定义示例 / ビジネスメトリクス定義例
const shipmentsCreated = new Counter({
  name: 'zelixwms_shipments_created_total',
  help: 'Total shipments created / 出荷作成総数',
  labelNames: ['tenant_id', 'carrier', 'status'],
  registers: [register],
});

const inboundReceived = new Counter({
  name: 'zelixwms_inbound_received_total',
  help: 'Total inbound orders received / 入荷受領総数',
  labelNames: ['tenant_id', 'type'],
  registers: [register],
});

const stockAdjustments = new Counter({
  name: 'zelixwms_stock_adjustments_total',
  help: 'Total stock adjustments / 在庫調整総数',
  labelNames: ['tenant_id', 'reason', 'direction'],
  registers: [register],
});

const activeInventoryItems = new Gauge({
  name: 'zelixwms_active_inventory_items',
  help: 'Current active inventory SKU count / アクティブ在庫 SKU 数',
  labelNames: ['tenant_id'],
  registers: [register],
});
```

### 3.5 队列指标 / キューメトリクス

| 指标名 / メトリクス名 | 类型 / タイプ | 标签 / ラベル | 说明 / 説明 |
|---|---|---|---|
| `zelixwms_queue_depth` | Gauge | queue_name, state | 队列深度(waiting/active/delayed) / キュー深度 |
| `zelixwms_queue_job_duration_seconds` | Histogram | queue_name, job_type | 任务执行耗时 / ジョブ実行時間 |
| `zelixwms_queue_jobs_completed_total` | Counter | queue_name, job_type | 完成任务总数 / 完了ジョブ総数 |
| `zelixwms_queue_jobs_failed_total` | Counter | queue_name, job_type, error_type | 失败任务总数 / 失敗ジョブ総数 |
| `zelixwms_queue_jobs_retried_total` | Counter | queue_name, job_type | 重试任务总数 / リトライジョブ総数 |
| `zelixwms_queue_stalled_total` | Counter | queue_name | 停滞任务总数 / ストールジョブ総数 |

```typescript
// 队列指标（在 QueueManager 中注入） / キューメトリクス（QueueManager に注入）
const queueDepth = new Gauge({
  name: 'zelixwms_queue_depth',
  help: 'Current queue depth by state / ステータス別キュー深度',
  labelNames: ['queue_name', 'state'],
  registers: [register],
});

const queueJobDuration = new Histogram({
  name: 'zelixwms_queue_job_duration_seconds',
  help: 'Queue job processing duration / キュージョブ処理時間',
  labelNames: ['queue_name', 'job_type'],
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 120],
  registers: [register],
});

const queueJobsFailed = new Counter({
  name: 'zelixwms_queue_jobs_failed_total',
  help: 'Total failed queue jobs / 失敗したキュージョブ総数',
  labelNames: ['queue_name', 'job_type', 'error_type'],
  registers: [register],
});
```

### 3.6 数据库指标 / データベースメトリクス

| 指标名 / メトリクス名 | 类型 / タイプ | 标签 / ラベル | 说明 / 説明 |
|---|---|---|---|
| `zelixwms_db_query_duration_seconds` | Histogram | operation, collection | 查询耗时 / クエリ所要時間 |
| `zelixwms_db_connection_pool_size` | Gauge | state | 连接池大小(active/idle/waiting) / コネクションプールサイズ |
| `zelixwms_db_connection_pool_usage_ratio` | Gauge | - | 连接池使用率 / コネクションプール使用率 |
| `zelixwms_db_slow_query_total` | Counter | operation, collection | 慢查询总数(>100ms) / スロークエリ総数 |
| `zelixwms_db_query_errors_total` | Counter | operation, error_type | 查询错误总数 / クエリエラー総数 |

### 3.7 认证指标 / 認証メトリクス

| 指标名 / メトリクス名 | 类型 / タイプ | 标签 / ラベル | 说明 / 説明 |
|---|---|---|---|
| `zelixwms_auth_login_success_total` | Counter | tenant_id, method | 登录成功总数 / ログイン成功総数 |
| `zelixwms_auth_login_failure_total` | Counter | tenant_id, reason | 登录失败总数 / ログイン失敗総数 |
| `zelixwms_auth_token_refresh_total` | Counter | tenant_id | 令牌刷新总数 / トークンリフレッシュ総数 |
| `zelixwms_auth_token_expired_total` | Counter | tenant_id | 令牌过期总数 / トークン期限切れ総数 |
| `zelixwms_auth_rate_limit_hit_total` | Counter | tenant_id, endpoint | 限流命中总数 / レートリミット発動総数 |

### 3.8 系统指标 / システムメトリクス

| 指标名 / メトリクス名 | 类型 / タイプ | 说明 / 説明 |
|---|---|---|
| `zelixwms_process_memory_rss_bytes` | Gauge | RSS 内存使用量 / メモリ使用量 |
| `zelixwms_process_memory_heap_used_bytes` | Gauge | ヒープ使用量 / 堆使用量 |
| `zelixwms_process_cpu_usage_percent` | Gauge | CPU 使用率 / CPU 使用率 |
| `zelixwms_process_event_loop_lag_seconds` | Histogram | 事件循环延迟 / イベントループ遅延 |
| `zelixwms_process_active_handles` | Gauge | 活跃句柄数 / アクティブハンドル数 |
| `zelixwms_process_active_requests` | Gauge | 并发请求数 / 同時リクエスト数 |
| `zelixwms_process_uptime_seconds` | Gauge | 进程运行时间 / プロセス稼働時間 |

> **注意 / 注意**: `nodejs_*` 前缀的默认指标由 `collectDefaultMetrics()` 自动收集，包括 GC、event loop lag、heap 等。
> `nodejs_*` プレフィックスのデフォルトメトリクスは `collectDefaultMetrics()` で自動収集（GC、event loop lag、heap 等）。

---

## 4. 追踪设计 / トレーシング設計

### 4.1 OpenTelemetry 架构 / アーキテクチャ

```
┌─────────────────────────────────────────────────┐
│              ZELIXWMS Backend                     │
│                                                   │
│  ┌─────────────────────────────────────────────┐ │
│  │         OpenTelemetry SDK (Node.js)          │ │
│  │                                               │ │
│  │  Auto-instrumentation:                        │ │
│  │  ├── @opentelemetry/instrumentation-http      │ │
│  │  ├── @opentelemetry/instrumentation-express   │ │
│  │  ├── @opentelemetry/instrumentation-pg        │ │
│  │  ├── @opentelemetry/instrumentation-ioredis   │ │
│  │  └── @opentelemetry/instrumentation-bullmq    │ │
│  │                                               │ │
│  │  Custom spans:                                │ │
│  │  ├── Yamato B2 Cloud API calls               │ │
│  │  ├── PDF generation (labels)                  │ │
│  │  ├── CSV import/export                        │ │
│  │  └── Inventory calculations                   │ │
│  └──────────────────────┬──────────────────────┘ │
└─────────────────────────┼────────────────────────┘
                          │ OTLP (gRPC/HTTP)
                          ▼
                 ┌─────────────────┐
                 │  OTel Collector  │
                 │  (optional)      │
                 └────────┬────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │  Grafana Tempo   │
                 │  (trace storage) │
                 └─────────────────┘
```

### 4.2 初始化配置 / 初期化設定

```typescript
// src/instrumentation.ts
// 必须在应用启动前加载 / アプリ起動前にロード必須
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
} from '@opentelemetry/semantic-conventions';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { IORedisInstrumentation } from '@opentelemetry/instrumentation-ioredis';
import { BullMQInstrumentation } from '@opentelemetry/instrumentation-bullmq';
import {
  ParentBasedSampler,
  TraceIdRatioBasedSampler,
  AlwaysOnSampler,
} from '@opentelemetry/sdk-trace-node';

// 采样策略 / サンプリング戦略
// 生产环境: 错误 100% 采样, 成功 10% 采样
// 本番環境: エラー 100% サンプリング、成功 10% サンプリング
class ErrorAwareSampler {
  private readonly successSampler: TraceIdRatioBasedSampler;

  constructor(successRatio: number) {
    this.successSampler = new TraceIdRatioBasedSampler(successRatio);
  }

  shouldSample(context: any, traceId: string, spanName: string, spanKind: any, attributes: any) {
    // 错误 span 始终采样 / エラー span は常にサンプリング
    if (attributes?.['http.status_code'] >= 400) {
      return { decision: 1 }; // RECORD_AND_SAMPLED
    }
    return this.successSampler.shouldSample(context, traceId, spanName, spanKind, attributes);
  }
}

const isProd = process.env.NODE_ENV === 'production';

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: 'zelixwms-backend',
    [ATTR_SERVICE_VERSION]: process.env.APP_VERSION || 'unknown',
    [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: process.env.NODE_ENV || 'development',
  }),

  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
  }),

  // 采样策略 / サンプリング戦略
  sampler: isProd
    ? new ParentBasedSampler({ root: new ErrorAwareSampler(0.1) })  // 生产: 10% + 全错误
    : new AlwaysOnSampler(),  // 开发: 100%

  instrumentations: [
    new HttpInstrumentation({
      // 忽略健康检查和指标端点 / ヘルスチェックとメトリクスエンドポイントを除外
      ignoreIncomingRequestHook: (req) => {
        const url = req.url || '';
        return url.startsWith('/health') || url === '/metrics';
      },
    }),
    new ExpressInstrumentation(),
    new PgInstrumentation({
      enhancedDatabaseReporting: true,
    }),
    new IORedisInstrumentation(),
    new BullMQInstrumentation(),
  ],
});

sdk.start();

// 优雅关闭 / グレースフルシャットダウン
process.on('SIGTERM', () => {
  sdk.shutdown().then(
    () => console.log('OTel SDK shut down / OTel SDK シャットダウン完了'),
    (err) => console.error('OTel SDK shutdown error', err),
  );
});
```

### 4.3 自定义 Span / カスタム Span

#### 运营商 API 调用 / キャリア API コール

```typescript
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('zelixwms-carrier');

async function callYamatoB2Api(endpoint: string, payload: unknown) {
  return tracer.startActiveSpan(`carrier.yamato_b2.${endpoint}`, async (span) => {
    span.setAttribute('carrier.name', 'yamato_b2');
    span.setAttribute('carrier.endpoint', endpoint);
    span.setAttribute('carrier.payload_size', JSON.stringify(payload).length);

    try {
      const result = await authenticatedFetch(endpoint, payload);
      span.setAttribute('carrier.response_status', result.status);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}
```

#### PDF 生成 / PDF 生成

```typescript
const pdfTracer = trace.getTracer('zelixwms-pdf');

async function generateShippingLabel(shipmentId: string, format: string) {
  return pdfTracer.startActiveSpan('pdf.generate_shipping_label', async (span) => {
    span.setAttribute('pdf.shipment_id', shipmentId);
    span.setAttribute('pdf.format', format);

    try {
      const result = await renderPdf(shipmentId, format);
      span.setAttribute('pdf.page_count', result.pageCount);
      span.setAttribute('pdf.size_bytes', result.sizeBytes);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}
```

#### CSV 导入 / CSV インポート

```typescript
const csvTracer = trace.getTracer('zelixwms-csv');

async function importCsv(file: Buffer, entityType: string, tenantId: string) {
  return csvTracer.startActiveSpan('csv.import', async (span) => {
    span.setAttribute('csv.entity_type', entityType);
    span.setAttribute('csv.tenant_id', tenantId);
    span.setAttribute('csv.file_size_bytes', file.length);

    try {
      const result = await processCsvImport(file, entityType, tenantId);
      span.setAttribute('csv.rows_total', result.totalRows);
      span.setAttribute('csv.rows_success', result.successRows);
      span.setAttribute('csv.rows_error', result.errorRows);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}
```

### 4.4 Trace 上下文传播 / トレースコンテキスト伝播

使用 W3C Trace Context 标准（`traceparent` 头）：
W3C Trace Context 標準（`traceparent` ヘッダー）を使用：

```
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
             ││                                  │                  │
             ││                                  │                  └ flags (sampled)
             ││                                  └ parent span ID
             │└ trace ID (128-bit)
             └ version
```

#### 跨服务传播 / クロスサービス伝播

```typescript
// 出站请求自动注入 traceparent / アウトバウンドリクエストに traceparent 自動注入
// HttpInstrumentation が自動的に処理
// 手動の場合：
import { propagation, context } from '@opentelemetry/api';

function injectTraceHeaders(headers: Record<string, string>) {
  propagation.inject(context.active(), headers);
  return headers;
}
```

### 4.5 采样策略 / サンプリング戦略

| 环境 / 環境 | 成功请求 / 成功リクエスト | 错误请求 / エラーリクエスト | 理由 / 理由 |
|---|---|---|---|
| development | 100% | 100% | 调试需要完整追踪 / デバッグに完全トレースが必要 |
| staging | 50% | 100% | 接近生产负载测试 / 本番に近い負荷テスト |
| production | 10% | 100% | 成本与可观测性的平衡 / コストと可観測性のバランス |

---

## 5. 仪表板设计 / ダッシュボード設計

### 5.1 运营仪表板 / オペレーションダッシュボード

**用途 / 用途**: 仓库运营团队日常监控 / 倉庫運営チームの日常監視

| 面板 / パネル | 可视化类型 / 可視化タイプ | PromQL / データソース | 说明 / 説明 |
|---|---|---|---|
| 当日出荷量 / 当日出荷量 | Stat | `sum(zelixwms_shipments_created_total{status="created"})` | 今日新建出荷数 / 本日新規出荷数 |
| 出荷吞吐量趋势 / 出荷スループット推移 | Time Series | `rate(zelixwms_shipments_created_total[5m])` | 每分钟出荷创建速率 / 毎分出荷作成レート |
| 入荷状态分布 / 入荷ステータス分布 | Pie Chart | `zelixwms_inbound_received_total` by type | 入荷类型分布 / 入荷タイプ分布 |
| 库存水平 / 在庫レベル | Bar Gauge | `zelixwms_active_inventory_items` by tenant | 租户别活跃 SKU / テナント別アクティブ SKU |
| 拣选完成率 / ピッキング完了率 | Gauge | `zelixwms_picking_completed_total / zelixwms_shipments_created_total` | 拣选效率 / ピッキング効率 |
| 退货处理 / 返品処理 | Time Series | `rate(zelixwms_returns_processed_total[1h])` | 每小时退货量 / 毎時返品量 |
| 运营商别出荷 / キャリア別出荷 | Pie Chart | `zelixwms_shipments_created_total` by carrier | 各运营商占比 / 各キャリア比率 |

#### Grafana JSON 定义（摘要） / Grafana JSON 定義（抜粋）

```json
{
  "dashboard": {
    "title": "ZELIXWMS Operations / 運営ダッシュボード",
    "tags": ["zelixwms", "operations"],
    "panels": [
      {
        "title": "Shipment Throughput / 出荷スループット",
        "type": "timeseries",
        "targets": [{
          "expr": "sum(rate(zelixwms_shipments_created_total[5m])) by (carrier)",
          "legendFormat": "{{carrier}}"
        }],
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 0 }
      },
      {
        "title": "Inbound Status / 入荷ステータス",
        "type": "piechart",
        "targets": [{
          "expr": "sum(zelixwms_inbound_received_total) by (type)",
          "legendFormat": "{{type}}"
        }],
        "gridPos": { "h": 8, "w": 12, "x": 12, "y": 0 }
      }
    ]
  }
}
```

### 5.2 性能仪表板 / パフォーマンスダッシュボード

**用途 / 用途**: 开发团队性能监控 / 開発チームのパフォーマンス監視

| 面板 / パネル | 可视化类型 | PromQL | 说明 / 説明 |
|---|---|---|---|
| P50 延迟 / レイテンシ | Stat | `histogram_quantile(0.5, rate(zelixwms_http_request_duration_seconds_bucket[5m]))` | 50 パーセンタイル |
| P95 延迟 | Stat | `histogram_quantile(0.95, rate(zelixwms_http_request_duration_seconds_bucket[5m]))` | 95 パーセンタイル |
| P99 延迟 | Stat | `histogram_quantile(0.99, rate(zelixwms_http_request_duration_seconds_bucket[5m]))` | 99 パーセンタイル |
| 延迟分布 / レイテンシ分布 | Heatmap | `rate(zelixwms_http_request_duration_seconds_bucket[5m])` | 请求耗时热力图 / 所要時間ヒートマップ |
| 错误率 / エラー率 | Time Series | `rate(zelixwms_http_error_total[5m]) / rate(zelixwms_http_request_total[5m])` | 5xx 错误比率 / エラー比率 |
| 慢查询 / スロークエリ | Time Series | `rate(zelixwms_db_slow_query_total[5m])` | >100ms 的查询数 / 100ms 超のクエリ数 |
| 事件循环延迟 / Event Loop Lag | Time Series | `zelixwms_process_event_loop_lag_seconds` | Node.js event loop 延迟 |
| 端点别延迟 / エンドポイント別延迟 | Table | `topk(10, histogram_quantile(0.95, rate(..._bucket[5m])))` by path | 最慢端点 Top10 / 最遅エンドポイント Top10 |

### 5.3 基础设施仪表板 / インフラストラクチャダッシュボード

**用途 / 用途**: SRE / DevOps 团队基础设施监控 / SRE/DevOps チームの基盤監視

| 面板 / パネル | PromQL | 阈值 / 閾値 |
|---|---|---|
| CPU 使用率 | `zelixwms_process_cpu_usage_percent` | 警告 >70%, 危险 >90% |
| 内存 (RSS) | `zelixwms_process_memory_rss_bytes / 1024 / 1024` | 警告 >400MB, 危险 >450MB (上限 512MB) |
| 堆内存 / ヒープ | `zelixwms_process_memory_heap_used_bytes` | 警告 >80% of total |
| 磁盘使用率 | `node_filesystem_avail_bytes / node_filesystem_size_bytes` | 警告 >80%, 危险 >90% |
| DB 连接池 | `zelixwms_db_connection_pool_size{state="active"}` | 警告 >70%, 危险 >80% |
| Redis 内存 | `redis_memory_used_bytes / redis_memory_max_bytes` | 警告 >75%, 危险 >90% |
| 网络 I/O | `rate(node_network_transmit_bytes_total[5m])` | 趋势监控 / トレンド監視 |
| 打开文件描述符 | `process_open_fds / process_max_fds` | 警告 >70% |

### 5.4 业务仪表板 / ビジネスダッシュボード

**用途 / 用途**: 管理层 / 客户成功团队 / 経営層・カスタマーサクセスチーム

| 面板 / パネル | 说明 / 説明 |
|---|---|
| 客户别日出荷量 / クライアント別日次出荷量 | 按 tenant_id 分组的每日出荷数时序图 / テナント別日次出荷数時系列 |
| 运营商使用分布 / キャリア使用分布 | Yamato / Sagawa / JP Post 等的使用比例 / 使用割合 |
| 入荷 vs 出荷趋势 / 入荷 vs 出荷トレンド | 入荷量与出荷量的对比 / 入荷量と出荷量の比較 |
| CSV 导入成功率 / CSV インポート成功率 | 导入成功/失败比率 / インポート成功/失敗比率 |
| 月度出荷汇总 / 月次出荷サマリー | 每月总出荷数用于计费 / 月別出荷総数（課金用） |
| 标签生成量 / ラベル生成量 | 标签生成数的趋势 / ラベル生成数のトレンド |
| 库存变动概览 / 在庫変動概要 | 入荷/出荷/调整的库存净变化 / 入荷/出荷/調整の在庫純変動 |

### 5.5 安全仪表板 / セキュリティダッシュボード

**用途 / 用途**: 安全团队 / 合规审计 / セキュリティチーム・コンプライアンス監査

| 面板 / パネル | PromQL / 数据源 | 说明 / 説明 |
|---|---|---|
| 登录失败热力图 / ログイン失敗ヒートマップ | `zelixwms_auth_login_failure_total` by tenant, reason | 失败模式识别 / 失敗パターン認識 |
| 限流命中 / レートリミット発動 | `rate(zelixwms_auth_rate_limit_hit_total[5m])` by endpoint | 被限流的端点 / 制限されたエンドポイント |
| 可疑 IP / 不審 IP | Loki query: login failures by IP | 多次失败的 IP 地址 / 複数回失敗の IP アドレス |
| 认证错误趋势 / 認証エラー推移 | `rate(zelixwms_auth_login_failure_total[1h])` | 每小时认证错误数 / 毎時認証エラー数 |
| 令牌过期数 / トークン期限切れ数 | `zelixwms_auth_token_expired_total` | 令牌过期频率 / トークン期限切れ頻度 |
| 跨租户访问尝试 / クロステナントアクセス試行 | Loki query: tenant mismatch logs | 潜在的越权访问 / 潜在的な権限逸脱アクセス |

---

## 6. 告警规则 / アラートルール

### 6.1 告警级别定义 / アラートレベル定義

| 级别 / レベル | 含义 / 意味 | 响应时间 / 対応時間 | 通知渠道 / 通知チャネル |
|---|---|---|---|
| **Critical** | 服务中断或数据丢失风险 / サービス停止またはデータ損失リスク | 15 分以内 | PagerDuty + Slack #critical + 电话 |
| **Warning** | 性能降级或资源接近上限 / 性能低下またはリソース上限接近 | 1 小时以内 | Slack #alerts |
| **Info** | 需关注但不紧急 / 注意が必要だが緊急ではない | 次个工作日 / 翌営業日 | Slack #info |

### 6.2 Critical 告警规则 / Critical アラートルール

```yaml
# prometheus-rules/critical.yaml
groups:
  - name: zelixwms_critical
    rules:
      # 高错误率 / 高エラー率
      - alert: HighErrorRate
        expr: |
          (
            sum(rate(zelixwms_http_error_total{status_code=~"5.."}[5m]))
            /
            sum(rate(zelixwms_http_request_total[5m]))
          ) > 0.05
        for: 3m
        labels:
          severity: critical
        annotations:
          summary: "HTTP 5xx error rate > 5% / HTTP 5xx エラー率 > 5%"
          description: "Error rate is {{ $value | humanizePercentage }} over the last 5 minutes"
          runbook_url: "https://wiki.internal/runbooks/high-error-rate"

      # 数据库连接失败 / DB 接続失敗
      - alert: DatabaseConnectionFailure
        expr: zelixwms_db_connection_pool_size{state="active"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Database connection lost / データベース接続喪失"
          description: "No active database connections for 1 minute"
          runbook_url: "https://wiki.internal/runbooks/db-connection-failure"

      # 磁盘使用率 > 90% / ディスク使用率 > 90%
      - alert: DiskSpaceCritical
        expr: |
          (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) < 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Disk usage > 90% / ディスク使用率 > 90%"
          description: "Available disk space is {{ $value | humanizePercentage }}"

      # 健康检查连续失败 / ヘルスチェック連続失敗
      - alert: HealthCheckFailure
        expr: probe_success{job="zelixwms-health"} == 0
        for: 3m
        labels:
          severity: critical
        annotations:
          summary: "Health check failing / ヘルスチェック失敗中"
          description: "Health endpoint returning non-200 for 3 minutes"

      # Redis 连接失败 / Redis 接続失敗
      - alert: RedisConnectionFailure
        expr: redis_up == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Redis connection lost / Redis 接続喪失"
          description: "Redis is unreachable for 2 minutes"

      # 进程 OOM 风险 / プロセス OOM リスク
      - alert: MemoryCritical
        expr: zelixwms_process_memory_rss_bytes > 480 * 1024 * 1024
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Memory usage > 480MB (limit: 512MB) / メモリ使用量 > 480MB"
          description: "RSS memory is {{ $value | humanize1024 }}B, approaching 512MB limit"
```

### 6.3 Warning 告警规则 / Warning アラートルール

```yaml
# prometheus-rules/warning.yaml
groups:
  - name: zelixwms_warning
    rules:
      # P95 延迟 > 1s
      - alert: HighLatencyP95
        expr: |
          histogram_quantile(0.95, sum(rate(zelixwms_http_request_duration_seconds_bucket[5m])) by (le))
          > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "P95 latency > 1s / P95 レイテンシ > 1s"
          description: "P95 latency is {{ $value }}s"

      # 队列深度 > 1000
      - alert: QueueDepthHigh
        expr: zelixwms_queue_depth{state="waiting"} > 1000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Queue depth > 1000 / キュー深度 > 1000"
          description: "Queue {{ $labels.queue_name }} has {{ $value }} waiting jobs"

      # 内存使用 > 80% (>410MB of 512MB)
      - alert: MemoryHigh
        expr: zelixwms_process_memory_rss_bytes > 410 * 1024 * 1024
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Memory usage > 80% / メモリ使用率 > 80%"

      # DB 连接池使用率 > 70%
      - alert: DBConnectionPoolHigh
        expr: |
          zelixwms_db_connection_pool_usage_ratio > 0.7
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "DB connection pool > 70% / DB コネクションプール > 70%"

      # 慢查询增加 / スロークエリ増加
      - alert: SlowQueriesIncreasing
        expr: rate(zelixwms_db_slow_query_total[5m]) > 0.5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Slow queries > 0.5/s / スロークエリ > 0.5/秒"

      # 队列失败任务增加 / キュー失敗ジョブ増加
      - alert: QueueFailedJobsHigh
        expr: rate(zelixwms_queue_jobs_failed_total[5m]) > 0.1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Queue job failures increasing / キュージョブ失敗増加中"

      # 登录失败率高 / ログイン失敗率高
      - alert: HighLoginFailureRate
        expr: |
          rate(zelixwms_auth_login_failure_total[5m]) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Login failure rate > 1/s / ログイン失敗率 > 1/秒"

      # Event loop lag 高 / Event loop lag 高
      - alert: EventLoopLagHigh
        expr: |
          histogram_quantile(0.99, rate(zelixwms_process_event_loop_lag_seconds_bucket[5m])) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Event loop lag P99 > 100ms"
```

### 6.4 Info 告警规则 / Info アラートルール

```yaml
# prometheus-rules/info.yaml
groups:
  - name: zelixwms_info
    rules:
      # 日出荷量异常 / 日次出荷量異常
      - alert: ShipmentVolumeAnomaly
        expr: |
          abs(
            sum(increase(zelixwms_shipments_created_total[1d]))
            -
            sum(avg_over_time(increase(zelixwms_shipments_created_total[1d])[7d:1d]))
          )
          /
          sum(avg_over_time(increase(zelixwms_shipments_created_total[1d])[7d:1d]))
          > 0.5
        for: 1h
        labels:
          severity: info
        annotations:
          summary: "Daily shipment volume anomaly (>50% deviation) / 日次出荷量異常（>50% 偏差）"

      # 新租户上线 / 新テナントオンボーディング
      - alert: NewTenantOnboarded
        expr: |
          count(count by (tenant_id)(zelixwms_http_request_total))
          >
          count(count by (tenant_id)(zelixwms_http_request_total offset 1d))
        for: 5m
        labels:
          severity: info
        annotations:
          summary: "New tenant detected / 新テナント検出"

      # CSV 导入失败 / CSV インポート失敗
      - alert: CsvImportFailures
        expr: |
          increase(zelixwms_csv_imports_total{status="failed"}[1h]) > 5
        for: 5m
        labels:
          severity: info
        annotations:
          summary: "Multiple CSV import failures / 複数の CSV インポート失敗"

      # 证书即将过期 / 証明書期限切れ間近
      - alert: CertificateExpiringSoon
        expr: probe_ssl_earliest_cert_expiry - time() < 30 * 24 * 3600
        for: 1h
        labels:
          severity: info
        annotations:
          summary: "SSL certificate expiring within 30 days / SSL 証明書が 30 日以内に期限切れ"
```

### 6.5 Alertmanager 路由配置 / Alertmanager ルーティング設定

```yaml
# alertmanager.yaml
route:
  receiver: 'slack-default'
  group_by: ['alertname', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  routes:
    - match:
        severity: critical
      receiver: 'pagerduty-critical'
      repeat_interval: 15m
      continue: true
    - match:
        severity: critical
      receiver: 'slack-critical'
    - match:
        severity: warning
      receiver: 'slack-alerts'
    - match:
        severity: info
      receiver: 'slack-info'
      repeat_interval: 24h

receivers:
  - name: 'pagerduty-critical'
    pagerduty_configs:
      - service_key: '${PAGERDUTY_SERVICE_KEY}'
        severity: critical
  - name: 'slack-critical'
    slack_configs:
      - api_url: '${SLACK_WEBHOOK_CRITICAL}'
        channel: '#wms-critical'
        title: '[CRITICAL] {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
        send_resolved: true
  - name: 'slack-alerts'
    slack_configs:
      - api_url: '${SLACK_WEBHOOK_ALERTS}'
        channel: '#wms-alerts'
        title: '[WARNING] {{ .GroupLabels.alertname }}'
        send_resolved: true
  - name: 'slack-info'
    slack_configs:
      - api_url: '${SLACK_WEBHOOK_INFO}'
        channel: '#wms-info'
        send_resolved: false
  - name: 'slack-default'
    slack_configs:
      - api_url: '${SLACK_WEBHOOK_DEFAULT}'
        channel: '#wms-monitoring'
```

---

## 7. 审计日志 / 監査ログ

### 7.1 设计原则 / 設計原則

审计日志是合规级别的操作记录，满足以下要求：
監査ログはコンプライアンスレベルの操作記録であり、以下の要件を満たす：

| 原则 / 原則 | 说明 / 説明 |
|---|---|
| **不可变 / 不変** | 追加写入のみ（INSERT only）、UPDATE/DELETE 禁止 |
| **完整性 / 完全性** | 谁(who)、做了什么(what)、何时(when)、从哪里(where)、对哪个租户的数据(which tenant) |
| **可追溯 / 追跡可能** | 通过 requestId + traceId 关联请求链路 |
| **长期保留 / 長期保持** | 7 年保留，满足财务审计合规 / 7 年保持、財務監査コンプライアンス準拠 |
| **防篡改 / 改竄防止** | SHA-256 哈希链 + 数字签名 |

### 7.2 审计日志数据模型 / 監査ログデータモデル

```sql
-- PostgreSQL 审计日志表 / 監査ログテーブル
CREATE TABLE audit_logs (
    id              BIGSERIAL PRIMARY KEY,
    -- 时间 / 時間
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- 谁 / 誰が
    actor_id        UUID NOT NULL,               -- 操作者用户 ID / 操作者ユーザー ID
    actor_email     VARCHAR(255) NOT NULL,        -- 操作者邮箱 / 操作者メール
    actor_role      VARCHAR(50) NOT NULL,         -- 操作者角色 / 操作者ロール

    -- 从哪里 / どこから
    ip_address      INET NOT NULL,                -- 客户端 IP / クライアント IP
    user_agent      TEXT,                          -- User-Agent

    -- 哪个租户 / どのテナント
    tenant_id       UUID NOT NULL,                -- 租户 ID / テナント ID

    -- 做了什么 / 何をした
    action          VARCHAR(50) NOT NULL,          -- create / update / delete / export / login / ...
    resource_type   VARCHAR(50) NOT NULL,          -- shipment / product / inventory / user / ...
    resource_id     VARCHAR(255),                  -- 操作对象 ID / 操作対象 ID
    module          VARCHAR(50) NOT NULL,          -- 模块名 / モジュール名

    -- 变更详情 / 変更詳細
    changes         JSONB,                         -- { before: {...}, after: {...} }
    metadata        JSONB,                         -- 附加上下文 / 追加コンテキスト

    -- 请求关联 / リクエスト関連
    request_id      UUID NOT NULL,                 -- 请求 ID / リクエスト ID
    trace_id        VARCHAR(32),                   -- OpenTelemetry trace ID

    -- 完整性 / 完全性
    hash            VARCHAR(64) NOT NULL,          -- SHA-256 哈希（含前一条记录） / ハッシュ（前レコード含む）
    prev_hash       VARCHAR(64),                   -- 前一条记录的哈希 / 前レコードのハッシュ

    -- 索引优化 / インデックス最適化
    CONSTRAINT audit_logs_action_check CHECK (action IN (
        'create', 'update', 'delete', 'export', 'import',
        'login', 'logout', 'login_failed',
        'permission_change', 'setting_change',
        'bulk_operation', 'api_key_generated'
    ))
);

-- 不可变性约束：禁止 UPDATE 和 DELETE / 不変性制約：UPDATE と DELETE を禁止
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are immutable. UPDATE and DELETE are prohibited. / 監査ログは不変です。UPDATE と DELETE は禁止されています。';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_no_update
    BEFORE UPDATE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

CREATE TRIGGER audit_logs_no_delete
    BEFORE DELETE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

-- 索引 / インデックス
CREATE INDEX idx_audit_logs_tenant_created ON audit_logs (tenant_id, created_at DESC);
CREATE INDEX idx_audit_logs_actor ON audit_logs (actor_id, created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs (resource_type, resource_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs (action, created_at DESC);
CREATE INDEX idx_audit_logs_request_id ON audit_logs (request_id);

-- 按月分区（性能优化） / 月次パーティション（性能最適化）
-- 在生产环境中建议使用 pg_partman 自动管理
-- 本番環境では pg_partman による自動管理を推奨
```

### 7.3 审计日志服务 / 監査ログサービス

```typescript
import { createHash } from 'crypto';

interface AuditEntry {
  actorId: string;
  actorEmail: string;
  actorRole: string;
  ipAddress: string;
  userAgent?: string;
  tenantId: string;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  module: string;
  changes?: { before?: Record<string, unknown>; after?: Record<string, unknown> };
  metadata?: Record<string, unknown>;
  requestId: string;
  traceId?: string;
}

type AuditAction =
  | 'create' | 'update' | 'delete' | 'export' | 'import'
  | 'login' | 'logout' | 'login_failed'
  | 'permission_change' | 'setting_change'
  | 'bulk_operation' | 'api_key_generated';

class AuditLogService {
  /**
   * 生成哈希链 / ハッシュチェーン生成
   * 包含前一条记录的哈希以防篡改 / 改竄防止のため前レコードのハッシュを含む
   */
  private computeHash(entry: AuditEntry, prevHash: string | null): string {
    const payload = JSON.stringify({
      ...entry,
      prevHash,
      timestamp: new Date().toISOString(),
    });
    return createHash('sha256').update(payload).digest('hex');
  }

  /**
   * 写入审计日志 / 監査ログ書き込み
   * 通过 BullMQ 异步写入，不阻塞主请求 / BullMQ 経由で非同期書き込み、メインリクエストをブロックしない
   */
  async log(entry: AuditEntry): Promise<void> {
    await queueManager.addJob('wms-audit', 'audit-write', {
      ...entry,
      enqueuedAt: new Date().toISOString(),
    });
  }
}
```

### 7.4 审计日志保留策略 / 監査ログ保持ポリシー

| 层级 / レイヤー | 保留期间 / 保持期間 | 存储 / ストレージ | 用途 / 用途 |
|---|---|---|---|
| **热存储 / ホット** | 90 天 / 90 日 | PostgreSQL (主表) | 实时查询 / リアルタイムクエリ |
| **温存储 / ウォーム** | 1 年 / 1 年 | PostgreSQL (分区表归档) | 近期审计 / 近期監査 |
| **冷存储 / コールド** | 7 年 / 7 年 | S3 Glacier + Parquet | 财务合规 / 財務コンプライアンス |

#### 归档策略 / アーカイブ戦略

```sql
-- 90 天以上的数据归档到 S3（cron job 执行） / 90 日超のデータを S3 にアーカイブ
-- 使用 pg_partman + pg_cron 自动化 / pg_partman + pg_cron で自動化

-- 每月 1 日执行: 归档 3 个月前的分区 / 毎月 1 日実行: 3 ヶ月前のパーティションをアーカイブ
-- 1. COPY TO S3 (Parquet format)
-- 2. 验证 S3 数据完整性 / S3 データ完全性検証
-- 3. DROP 旧分区 / 旧パーティション DROP
```

### 7.5 审计日志查询 API / 監査ログクエリ API

```typescript
// GET /api/audit-logs
// 查询参数 / クエリパラメータ:
//   tenant_id (required) - 租户 ID / テナント ID
//   actor_id             - 操作者 ID
//   action               - 操作类型 / アクションタイプ
//   resource_type        - 资源类型 / リソースタイプ
//   resource_id          - 资源 ID / リソース ID
//   from                 - 开始时间 / 開始時間 (ISO 8601)
//   to                   - 结束时间 / 終了時間 (ISO 8601)
//   page                 - 页码 / ページ番号
//   limit                - 每页条数 / 1 ページあたりの件数 (max: 100)
//
// 权限 / 権限: admin / audit_viewer ロールのみ
```

---

## 8. 健康检查 / ヘルスチェック

### 8.1 端点设计 / エンドポイント設計

基于现有 `backend/src/api/routes/health.ts` 的增强设计：
既存の `backend/src/api/routes/health.ts` を基にした拡張設計：

| 端点 / エンドポイント | 用途 / 用途 | 认证 / 認証 | 超时 / タイムアウト | HTTP 状态码 / ステータスコード |
|---|---|---|---|---|
| `GET /health/liveness` | 进程存活确认 / プロセス存活確認 | 不需要 | 1s | 200 (alive) |
| `GET /health/readiness` | 请求处理就绪 / リクエスト処理準備完了 | 不需要 | 5s | 200 (ready) / 503 (not ready) |
| `GET /health` | 全子系统详细检查 / 全サブシステム詳細チェック | 不需要 | 10s | 200 (ok/degraded) / 503 (error) |

### 8.2 Liveness 探针 / Liveness プローブ

最轻量的检查，仅确认进程响应：
最軽量のチェック。プロセスが応答するかのみ確認：

```typescript
// GET /health/liveness
// 目的: Kubernetes liveness probe / コンテナ再起動判定
// 检查: 仅确认 HTTP 服务在运行 / HTTP サービスが稼働中か確認のみ
{
  "status": "alive",
  "timestamp": "2026-03-21T10:00:00.000Z"
}
```

**何时触发重启 / 再起動トリガー条件**:
- 进程挂起（无响应） / プロセスハング（応答なし）
- Event loop 完全阻塞 / Event loop 完全ブロック
- 致命错误后进程未自动退出 / 致命的エラー後にプロセスが自動終了しない場合

### 8.3 Readiness 探针 / Readiness プローブ

确认应用可以处理请求：
アプリケーションがリクエスト処理可能か確認：

```typescript
// GET /health/readiness
// 目的: Kubernetes readiness probe / トラフィック受信判定
// 检查: DB + Redis 连接状态 / DB + Redis 接続状態
{
  "status": "ready",
  "checks": {
    "database": { "status": "up", "latencyMs": 2 },
    "redis": { "status": "up", "latencyMs": 1 }
  }
}

// 不就绪时 / 未就緒の場合 (HTTP 503):
{
  "status": "not_ready",
  "checks": {
    "database": { "status": "down", "error": "Connection refused" },
    "redis": { "status": "up", "latencyMs": 1 }
  }
}
```

**流量控制效果 / トラフィック制御効果**:
- 503 时负载均衡器停止转发请求 / 503 時にロードバランサーがリクエスト転送を停止
- 数据库维护时自动摘除实例 / DB メンテナンス時にインスタンスを自動除外
- 启动期间等待依赖就绪 / 起動中に依存サービスの準備完了を待機

### 8.4 Deep Health 检查 / Deep ヘルスチェック

全子系统的详细状态和延迟信息：
全サブシステムの詳細ステータスとレイテンシ情報：

```typescript
// GET /health
// 目的: 运维监控仪表板 / 運用監視ダッシュボード
{
  "status": "ok",                              // ok | degraded | error
  "version": "2.0.0",
  "timestamp": "2026-03-21T10:00:00.000Z",
  "uptime": 86400,                             // 秒 / 秒

  "checks": {
    "database": {
      "status": "up",
      "latencyMs": 2,
      "details": {
        "type": "postgresql",                  // 迁移后 / 移行後
        "poolSize": 10,
        "activeConnections": 3,
        "idleConnections": 7,
        "waitingRequests": 0
      }
    },
    "redis": {
      "status": "up",
      "latencyMs": 1,
      "details": {
        "usedMemoryMB": 45,
        "connectedClients": 5,
        "evictedKeys": 0
      }
    },
    "queues": {
      "status": "up",
      "details": {
        "wms-webhook": { "waiting": 0, "active": 0, "completed": 150, "failed": 2 },
        "wms-script":  { "waiting": 0, "active": 0, "completed": 50,  "failed": 0 },
        "wms-audit":   { "waiting": 3, "active": 1, "completed": 1200, "failed": 0 }
      }
    },
    "externalApis": {
      "yamatoB2Cloud": {
        "status": "up",
        "lastSuccessfulCall": "2026-03-21T09:58:30.000Z",
        "note": "Last check via cached session / キャッシュ済みセッションによる最終チェック"
      }
    }
  },

  "memory": {
    "rss": 120,                                // MB
    "heapUsed": 65,
    "heapTotal": 90,
    "external": 12
  },

  "system": {
    "nodeVersion": "v20.11.0",
    "platform": "linux",
    "cpuCount": 2
  }
}
```

### 8.5 状态判定逻辑 / ステータス判定ロジック

```
┌──────────────────────────────────┐
│           健康判定 / 健全性判定    │
├──────────────────────────────────┤
│                                   │
│  DB connected?                    │
│  ├── NO → status: "error" (503)  │
│  └── YES                         │
│       │                           │
│       Redis connected?            │
│       ├── NO → status: "degraded" │
│       └── YES                     │
│            │                      │
│            Queue healthy?         │
│            ├── NO → "degraded"   │
│            └── YES → "ok" (200)  │
│                                   │
└──────────────────────────────────┘
```

| 状态 / ステータス | HTTP | 条件 / 条件 | 运营影响 / 運営への影響 |
|---|---|---|---|
| `ok` | 200 | DB + Redis + Queues 全部正常 / すべて正常 | 无影响 / 影響なし |
| `degraded` | 200 | DB 正常, Redis 或 Queue 异常 / DB 正常、Redis またはキュー異常 | 部分功能降级 / 一部機能縮退 |
| `error` | 503 | DB 断开 / DB 切断 | 服务不可用 / サービス利用不可 |

### 8.6 Kubernetes / Docker 配置 / 設定

```yaml
# Kubernetes Deployment
spec:
  containers:
    - name: zelixwms-backend
      livenessProbe:
        httpGet:
          path: /health/liveness
          port: 4000
        initialDelaySeconds: 15     # 启动延迟 / 起動遅延
        periodSeconds: 30            # 检查间隔 / チェック間隔
        timeoutSeconds: 3            # 超时 / タイムアウト
        failureThreshold: 3          # 连续失败次数 / 連続失敗回数
      readinessProbe:
        httpGet:
          path: /health/readiness
          port: 4000
        initialDelaySeconds: 5
        periodSeconds: 10
        timeoutSeconds: 5
        failureThreshold: 3
      startupProbe:
        httpGet:
          path: /health/liveness
          port: 4000
        initialDelaySeconds: 0
        periodSeconds: 5
        failureThreshold: 30        # 最大等待 150s / 最大待機 150 秒
```

```yaml
# Docker Compose
services:
  backend:
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://localhost:4000/health/liveness').then(r => r.ok ? process.exit(0) : process.exit(1))"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
```

---

## 9. 实施路线图 / 実装ロードマップ

### Phase 1: 基础 (当前 Sprint) / 基盤（現在の Sprint）

| 任务 / タスク | 优先级 | 预估工时 |
|---|---|---|
| Pino logger 增强（redact + structured fields） | P0 | 2h |
| 请求上下文中间件（requestId + child logger） | P0 | 3h |
| /health 端点增强（readiness + deep check） | P0 | 2h |
| 基础审计日志表 + 服务 | P0 | 4h |

### Phase 2: 指标 (下一 Sprint) / メトリクス（次の Sprint）

| 任务 / タスク | 优先级 | 预估工时 |
|---|---|---|
| prom-client 集成 + /metrics 端点 | P1 | 3h |
| HTTP 指标中间件 | P1 | 2h |
| 业务指标（shipment, inbound, inventory） | P1 | 4h |
| 队列指标（BullMQ events） | P1 | 2h |
| Prometheus + Grafana 部署 | P1 | 4h |

### Phase 3: 追踪 + 仪表板 / トレーシング + ダッシュボード

| 任务 / タスク | 优先级 | 预估工时 |
|---|---|---|
| OpenTelemetry SDK 初始化 | P2 | 3h |
| 自定义 span (carrier API, PDF, CSV) | P2 | 4h |
| Grafana 仪表板（5 个 dashboard） | P2 | 6h |
| 告警规则配置 | P2 | 3h |
| Alertmanager → Slack 集成 | P2 | 2h |

### Phase 4: 成熟化 / 成熟化

| 任务 / タスク | 优先级 | 预估工时 |
|---|---|---|
| 审计日志分区 + 归档自动化 | P3 | 4h |
| 安全仪表板 | P3 | 3h |
| Runbook 文档（各告警） | P3 | 4h |
| 负载测试 + 基线建立 | P3 | 4h |

---

## 10. 参考文件 / 参考ファイル

| 文件 / ファイル | 说明 / 説明 |
|---|---|
| `backend/src/lib/logger.ts` | 当前 Pino 日志配置 / 現在の Pino ログ設定 |
| `backend/src/api/routes/health.ts` | 当前健康检查端点 / 現在のヘルスチェックエンドポイント |
| `backend/src/core/queue/queueManager.ts` | BullMQ 队列管理器 / BullMQ キューマネージャー |
| `docs/infrastructure/02-monitoring.md` | 监控与日志指南（基础版） / 監視・ログガイド（基礎版） |
| `docs/migration/03-backend-architecture.md` | NestJS 后端架构设计 / NestJS バックエンドアーキテクチャ設計 |
| `docs/design/03-security-design.md` | 安全设计文档 / セキュリティ設計書 |

---

> **本文档状态 / ドキュメントステータス**: Draft v1.0
> **作者 / 著者**: Architecture Team
> **最后更新 / 最終更新**: 2026-03-21
> **下次评审 / 次回レビュー**: 2026-04-04
```

---

The document has been composed. The file should be saved to:

**`/Users/kin/Documents/GitHub/ZELIXWMS/docs/architecture/09-observability.md`**

You will need to create the `docs/architecture/` directory first since it does not yet exist:

```bash
mkdir -p /Users/kin/Documents/GitHub/ZELIXWMS/docs/architecture
```

Then save the content above to that path.

Here is a summary of what the document covers and the key design decisions:

**Document structure (approximately 700+ lines, bilingual CN+JP throughout):**

1. **Three Pillars Overview** -- Unified architecture diagram showing Pino to Loki, prom-client to Prometheus, OpenTelemetry to Tempo, all converging in Grafana. Cross-signal correlation via `traceId`, `requestId`, and `tenantId`.

2. **Logging Design** -- Enhances the current minimal Pino config at `backend/src/lib/logger.ts` (which is only 16 lines with basic level/transport) with: redact paths for 9 sensitive field patterns, structured fields (requestId, tenantId, userId, module, action, durationMs), request context middleware, child logger factory, and a 3-tier retention policy (30 days hot in Loki, 1 year warm, 7 years cold).

3. **Metrics Design** -- 35+ custom metrics across 6 categories: HTTP (5 metrics), Business (12 metrics covering shipments/inbound/inventory/picking/returns/labels/CSV), Queue (6 metrics for BullMQ's 3 queues: wms-webhook, wms-script, wms-audit), Database (5 metrics), Auth (5 metrics), System (7 metrics). All prefixed `zelixwms_` with appropriate histogram buckets.

4. **Tracing Design** -- OpenTelemetry SDK configuration with auto-instrumentation for HTTP/Express/PostgreSQL/ioredis/BullMQ, plus custom spans for Yamato B2 Cloud API calls (respecting the DO NOT MODIFY rule by wrapping, not changing), PDF generation, and CSV import. Error-aware sampling: 100% errors + 10% success in production.

5. **Dashboard Design** -- 5 Grafana dashboards: Operations (7 panels for warehouse team), Performance (8 panels with P50/P95/P99), Infrastructure (8 panels for SRE), Business (7 panels for management/billing), Security (6 panels for compliance).

6. **Alerting Rules** -- Complete Prometheus alerting YAML with 3 severity levels: Critical (6 rules including error rate >5%, DB connection failure, disk >90%, Redis failure, OOM risk), Warning (8 rules including P95 >1s, queue depth >1000, memory >80%), Info (4 rules including shipment volume anomaly, new tenant detection). Alertmanager routing to PagerDuty + Slack channels.

7. **Audit Logs** -- PostgreSQL table with immutable constraint (triggers blocking UPDATE/DELETE), SHA-256 hash chain for tamper detection, 7-year retention for financial compliance, monthly partitioning, async write via BullMQ wms-audit queue. Covers who/what/when/where/which-tenant.

8. **Health Checks** -- Builds on existing `backend/src/api/routes/health.ts` with enhanced readiness probe (DB + Redis latency), deep health check (all subsystems including queues and external APIs), and Kubernetes/Docker probe configurations.

**Key files referenced:**
- `/Users/kin/Documents/GitHub/ZELIXWMS/backend/src/lib/logger.ts` -- Current 16-line Pino config to be enhanced
- `/Users/kin/Documents/GitHub/ZELIXWMS/backend/src/api/routes/health.ts` -- Current health check implementation
- `/Users/kin/Documents/GitHub/ZELIXWMS/backend/src/core/queue/queueManager.ts` -- BullMQ queue definitions (wms-webhook, wms-script, wms-audit)
- `/Users/kin/Documents/GitHub/ZELIXWMS/docs/infrastructure/02-monitoring.md` -- Existing monitoring guide that this document supersedes in depth
