# 14 - 性能与可扩展性设计 / パフォーマンスとスケーラビリティ設計

> ZELIXWMS 全栈性能目标、优化策略、扩展路线图
> ZELIXWMS フルスタックパフォーマンス目標・最適化戦略・スケーリングロードマップ
>
> 技术栈 / 技術スタック: NestJS 11 + Fastify + Drizzle ORM + PostgreSQL 16 (Supabase) + Redis + BullMQ
> フロントエンド / フロントエンド: Vue 3 + Element Plus (118 routes)
>
> 最终更新 / 最終更新: 2026-03-21
> 关联文档 / 関連ドキュメント: [05-performance-tuning.md](../operations/05-performance-tuning.md), [03-backend-architecture.md](../migration/03-backend-architecture.md), [02-database-design.md](../migration/02-database-design.md)

---

## 目次 / 目次

1. [性能目标 (SLO)](#1-性能目标-slo--パフォーマンス目標-slo)
2. [数据库性能](#2-数据库性能--データベースパフォーマンス)
3. [缓存策略 (3-Layer Cache)](#3-缓存策略-3-layer-cache--キャッシュ戦略-3層キャッシュ)
4. [API 性能优化](#4-api-性能优化--api-パフォーマンス最適化)
5. [后台任务性能](#5-后台任务性能--バックグラウンドタスクパフォーマンス)
6. [前端性能](#6-前端性能--フロントエンドパフォーマンス)
7. [负载测试计划](#7-负载测试计划--負荷テスト計画)
8. [水平扩展架构](#8-水平扩展架构--水平スケーリングアーキテクチャ)
9. [容量规划](#9-容量规划--キャパシティプランニング)

---

## 1. 性能目标 (SLO) / パフォーマンス目標 (SLO)

> SLO = Service Level Objective。所有目标基于 P50/P95/P99 百分位数。
> SLO = Service Level Objective。すべての目標は P50/P95/P99 パーセンタイルに基づく。

### 1.1 API レスポンス目标 / API レスポンス目標

| 指标 / 指標 | P50 | P95 | P99 | 备注 / 備考 |
|---|---|---|---|---|
| 一般 CRUD API | < 50ms | < 200ms | < 800ms | 单表读写 / 単一テーブル読み書き |
| 列表查询 (带分页) / リスト（ページネーション付き） | < 80ms | < 300ms | < 1.2s | 含 JOIN / JOINを含む |
| 搜索 API / 検索 API | < 100ms | < 300ms | < 1s | pg_trgm + GIN インデックス |
| 复合业务操作 / 複合ビジネス操作 | < 100ms | < 500ms | < 2s | トランザクション含む |

### 1.2 特殊操作目标 / 特殊操作目標

| 操作 / 操作 | 目标 / 目標 | 备注 / 備考 |
|---|---|---|
| CSV 导入 10,000 行 / CSV インポート 10,000 行 | < 30s | BullMQ 异步, 500行/バッチ / BullMQ 非同期, 500行/バッチ |
| PDF 生成 (1文書) / PDF 生成（1文書） | < 3s | 单个发货单/ラベル / 単体出荷伝票/ラベル |
| PDF 批量生成 (50文書) / PDF 一括生成（50文書） | < 30s | 并行处理 / 並列処理 |
| 批量操作 1,000 件 / バッチ操作 1,000 件 | < 10s | 产品更新/库存调整 / 商品更新/在庫調整 |
| ダッシュボード加载 / ダッシュボードロード | < 2s | マテリアライズドビュー使用 |
| B2 Cloud 出荷连携 / B2 Cloud 出荷連携 | < 5s | 外部 API 依赖 / 外部 API 依存 |

### 1.3 并发目标 / 並行処理目標

| 指标 / 指標 | 目标 / 目標 | 说明 / 説明 |
|---|---|---|
| 每租户并发用户 / テナント当たり同時接続 | 100 | 同时在线操作 / 同時オンライン操作 |
| 系统总并发用户 / システム全体同時接続 | 1,000 | 全租户合计 / 全テナント合計 |
| API QPS (通常时) / API QPS（通常時） | 500 req/s | 单实例 / シングルインスタンス |
| API QPS (峰值) / API QPS（ピーク時） | 2,000 req/s | 4实例水平扩展 / 4インスタンス水平スケーリング |

### 1.4 可用性目标 / 可用性目標

| 指标 / 指標 | 目标 / 目標 | 备注 / 備考 |
|---|---|---|
| 月度可用率 / 月間稼働率 | 99.9% (43min 停机/月) | 计划内维护除外 / 計画停止除外 |
| RTO (恢复时间目标) / RTO | < 15min | Supabase + Cloud Run 自动恢复 / 自動復旧 |
| RPO (数据恢复点目标) / RPO | < 1min | Supabase WAL 流复制 / WALストリーミング |

### 1.5 SLO 违反时的对应 / SLO 違反時の対応

```
SLO 违反 → 自动告警 (PagerDuty/Slack)
SLO 違反 → 自動アラート (PagerDuty/Slack)

P95 超过目标 1.5x → WARNING 级别 / WARNING レベル
P95 超过目标 2x   → CRITICAL 级别, 值班工程师介入 / CRITICAL レベル, オンコールエンジニア対応
P99 超过目标 3x   → INCIDENT, 全面调查 / INCIDENT, 全面調査
```

---

## 2. 数据库性能 / データベースパフォーマンス

### 2.1 连接池: PgBouncer (Supabase) / コネクションプーリング: PgBouncer (Supabase)

Supabase 提供内置 PgBouncer (端口 6543)，应用层通过连接池访问数据库。
Supabase は内蔵 PgBouncer（ポート 6543）を提供し、アプリケーション層はプール経由で DB にアクセスする。

```
┌──────────────┐     ┌──────────────┐     ┌─────────────────┐
│  NestJS Pod  │────▶│  PgBouncer   │────▶│  PostgreSQL 16  │
│  (max 5 conn)│     │  (port 6543) │     │  (Supabase)     │
├──────────────┤     │              │     │                 │
│  NestJS Pod  │────▶│  Pool Mode:  │     │  max_connections│
│  (max 5 conn)│     │  transaction │     │  = 60 (Pro)     │
├──────────────┤     │              │     │                 │
│  NestJS Pod  │────▶│  Pool Size:  │     │                 │
│  (max 5 conn)│     │  15          │     │                 │
└──────────────┘     └──────────────┘     └─────────────────┘
```

**Drizzle ORM 连接设置 / Drizzle ORM 接続設定**:

```typescript
// database.config.ts
// 应用连接 (通过 PgBouncer) / アプリケーション接続（PgBouncer 経由）
const pooledConnection = {
  connectionString: process.env.DATABASE_URL, // port 6543, ?pgbouncer=true
  max: 5,          // 每实例最大连接数 / インスタンスあたり最大接続数
  idleTimeoutMillis: 30_000,  // 空闲30秒后释放 / アイドル30秒後に解放
  connectionTimeoutMillis: 5_000, // 连接超时5秒 / 接続タイムアウト5秒
};

// 迁移/管理操作 (直连, 绕过 PgBouncer) / マイグレーション/管理操作（直接接続）
const directConnection = {
  connectionString: process.env.DATABASE_DIRECT_URL, // port 5432
  max: 2,
};
```

**PgBouncer 模式选择 / PgBouncer モード選択**:

| 模式 / モード | 说明 / 説明 | ZELIXWMS 使用 |
|---|---|---|
| `session` | 连接绑定到整个会话 / セッション全体にバインド | 不使用 / 不使用 |
| `transaction` | 连接在事务结束后回收 / トランザクション終了後にリサイクル | **使用** |
| `statement` | 每条语句后回收 / 各ステートメント後にリサイクル | 不适用 / 不適用 |

> **注意 / 注意**: `transaction` 模式下不能使用 `PREPARE` 语句和 `LISTEN/NOTIFY`。
> Drizzle ORM 默认不使用 prepared statements，所以兼容。
> Drizzle ORM はデフォルトで prepared statements を使わないため互換性あり。

### 2.2 慢查询检测与告警 / スロークエリ検出とアラート

**阈值定义 / しきい値定義**:

| 阈值 / しきい値 | 级别 / レベル | 动作 / アクション |
|---|---|---|
| > 200ms | INFO | 记录到日志 / ログに記録 |
| > 500ms | WARNING | 记录 + Slack 通知 / ログ + Slack 通知 |
| > 2,000ms | CRITICAL | 记录 + PagerDuty 告警 / ログ + PagerDuty アラート |
| > 10,000ms | EMERGENCY | 自动终止查询 / クエリ自動キル |

**启用 pg_stat_statements / pg_stat_statements 有効化**:

```sql
-- Supabase Pro 已默认启用 / Supabase Pro ではデフォルト有効
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Top 10 慢查询监控 / Top 10 スロークエリモニタリング
SELECT
  LEFT(query, 120) AS query_preview,
  calls,
  ROUND(mean_exec_time::numeric, 2) AS avg_ms,
  ROUND(max_exec_time::numeric, 2) AS max_ms,
  ROUND(total_exec_time::numeric / 1000, 2) AS total_sec,
  rows
FROM pg_stat_statements
WHERE mean_exec_time > 100  -- 100ms 以上 / 100ms 以上
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**NestJS 查询拦截器 / NestJS クエリインターセプター**:

```typescript
// slow-query.interceptor.ts
// 全 Drizzle 查询に実行時間計測を追加 / 全 Drizzle クエリに実行時間計測を追加
@Injectable()
export class SlowQueryInterceptor {
  private readonly SLOW_THRESHOLD_MS = 500;

  async onQuery(query: string, params: unknown[], durationMs: number) {
    if (durationMs > this.SLOW_THRESHOLD_MS) {
      this.logger.warn({
        message: 'Slow query detected / スロークエリ検出',
        query: query.slice(0, 200),
        durationMs,
        params: params.length,
      });
      // 500ms超のクエリをSlackに通知 / 500ms超过的查询通知到Slack
      this.alertService.sendSlowQueryAlert(query, durationMs);
    }
  }
}
```

### 2.3 索引策略 / インデックス戦略

#### 2.3.1 索引类型选择指南 / インデックスタイプ選択ガイド

| 场景 / シナリオ | 索引类型 / インデックス | 示例 / 例 |
|---|---|---|
| 等值查询 (=, IN) / 等値クエリ | **B-tree** (默认) | `tenant_id`, `status`, `sku` |
| 范围查询 (<, >, BETWEEN) / 範囲クエリ | **B-tree** | `created_at`, `quantity` |
| JSONB 字段查询 / JSONB フィールド | **GIN** (jsonb_path_ops) | `custom_fields`, `metadata` |
| 数组字段 (ANY, @>) / 配列フィールド | **GIN** | `barcode`, `remarks` |
| 文本模糊搜索 (LIKE '%xxx%') / テキストあいまい検索 | **GIN** (pg_trgm) | `name`, `description` |
| 前缀搜索 (LIKE 'xxx%') / プレフィックス検索 | **B-tree** | `sku` (自然有序 / 自然順序) |

#### 2.3.2 复合索引设计原则 / 複合インデックス設計原則

```sql
-- 原则 1: tenant_id 永远是复合索引的第一列
-- 原則 1: tenant_id は常に複合インデックスの先頭
CREATE INDEX idx_orders_tenant_status ON orders (tenant_id, status);

-- 原则 2: 等值条件列在前, 范围条件列在后
-- 原則 2: 等値条件カラムを先に、範囲条件カラムを後に
CREATE INDEX idx_orders_status_date ON orders (tenant_id, status, created_at DESC);

-- 原则 3: 排序字段包含在索引中以避免 filesort
-- 原則 3: ソートフィールドをインデックスに含め filesort を回避
CREATE INDEX idx_products_tenant_updated ON products (tenant_id, updated_at DESC);
```

#### 2.3.3 部分索引 (WHERE deleted_at IS NULL) / 部分インデックス

软删除系统中大量记录已被标记删除，部分索引显著缩小索引大小。
論理削除システムでは大量のレコードが削除済みマークされるため、部分インデックスでサイズを大幅に削減。

```sql
-- 所有活跃记录查询使用部分索引 / アクティブレコードのクエリは部分インデックスを使用
CREATE INDEX idx_products_active ON products (tenant_id, sku)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_orders_active ON orders (tenant_id, status, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_inventory_active ON stock_quants (tenant_id, product_id, location_id)
  WHERE deleted_at IS NULL;

-- 效果: 比全表索引小 30-50% / 効果: フルテーブルインデックスより 30-50% 小さい
```

#### 2.3.4 pg_trgm 全文搜索索引 / pg_trgm テキスト検索インデックス

```sql
-- 安装扩展 / 拡張をインストール
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 产品名称模糊搜索 / 商品名あいまい検索
CREATE INDEX idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);

-- 查询示例 / クエリ例
SELECT * FROM products
WHERE tenant_id = :tenantId
  AND deleted_at IS NULL
  AND name % :searchTerm       -- 相似度搜索 / 類似度検索
ORDER BY similarity(name, :searchTerm) DESC
LIMIT 50;
```

### 2.4 查询优化模式 / クエリ最適化パターン

#### 2.4.1 分页: Keyset vs Offset / ページネーション: Keyset vs Offset

```sql
-- ❌ Offset 分页 (大数据集时性能恶化) / Offset ページネーション（大規模データで性能劣化）
-- 第 1000 页需要扫描前 999 页的全部记录 / 1000 ページ目は前 999 ページの全レコードをスキャン
SELECT * FROM products
WHERE tenant_id = :tenantId AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 50 OFFSET 49950;  -- 慢! / 遅い!

-- ✅ Keyset 分页 (大数据集时性能稳定) / Keyset ページネーション（大規模データで安定性能）
-- 利用上一页最后一条记录的 cursor / 前ページの最終レコードの cursor を利用
SELECT * FROM products
WHERE tenant_id = :tenantId
  AND deleted_at IS NULL
  AND (created_at, id) < (:lastCreatedAt, :lastId)
ORDER BY created_at DESC, id DESC
LIMIT 50;  -- 恒定性能 / 一定のパフォーマンス
```

**分页策略选择 / ページネーション戦略選択**:

| 场景 / シナリオ | 推荐 / 推奨 | 理由 / 理由 |
|---|---|---|
| < 10,000 条 / < 10,000 件 | Offset OK | 简单, 支持跳页 / シンプル, ページジャンプ対応 |
| > 10,000 条 / > 10,000 件 | **Keyset** | O(1) 性能 / O(1) パフォーマンス |
| 日志/操作记录 / ログ/操作記録 | **Keyset** | 数据量持续增长 / データ量が継続的に増加 |
| 管理画面一览 / 管理画面一覧 | Offset OK | 通常 < 5,000 条 / 通常 < 5,000 件 |

#### 2.4.2 EXPLAIN ANALYZE 使用指南 / EXPLAIN ANALYZE 使用ガイド

```sql
-- 分析查询执行计划 / クエリ実行計画を分析
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT p.*, sq.available_quantity
FROM products p
LEFT JOIN stock_quants sq ON sq.product_id = p.id AND sq.tenant_id = p.tenant_id
WHERE p.tenant_id = '...'
  AND p.deleted_at IS NULL
  AND p.name ILIKE '%搜索词%'
ORDER BY p.updated_at DESC
LIMIT 50;
```

**关注指标 / 注目すべき指標**:

| 指标 / 指標 | 健康 / 健全 | 需要优化 / 最適化が必要 |
|---|---|---|
| Seq Scan on large table | 不应出现 / 出現すべきでない | Index Scan に変更 |
| Rows Removed by Filter | < 10% of scanned | > 50% → インデックス追加 |
| Sort Method: external merge | 不应出现 / 不可 | work_mem 増加 or インデックス追加 |
| Nested Loop (大量行) | 注意 | Hash Join の方が適切かも |

### 2.5 读写分离 / 読み書き分離

```
┌──────────────┐         ┌────────────────────┐
│  NestJS App  │─ WRITE ▶│  Primary (Supabase)│
│              │         │  PostgreSQL 16     │
│              │         └──────┬─────────────┘
│              │                │ WAL Streaming
│              │         ┌──────▼─────────────┐
│              │─ READ ─▶│  Read Replica       │
│  (reporting  │         │  (Supabase Pro+)   │
│   queries)   │         └────────────────────┘
└──────────────┘
```

**适用读副本的查询 / リードレプリカ向きのクエリ**:
- ダッシュボード集計 / ダッシュボード集計
- 日次/月次报表生成 / 日次/月次レポート生成
- CSV/Excel 大量导出 / CSV/Excel 大量エクスポート
- KPI 分析 / KPI 分析

**不适用读副本的查询 / リードレプリカ不向きのクエリ** (需要最新数据 / 最新データが必要):
- 在库数量确认 / 在庫数量確認
- 出库处理中的库存检查 / 出庫処理中の在庫チェック
- 并发操作 / 並行操作

### 2.6 表分区 (日志表) / テーブルパーティション（ログテーブル）

日志表按月分区，由 pg_cron 自动管理。
ログテーブルは月次パーティション、pg_cron で自動管理。

```sql
-- 月度分区创建 (pg_cron 定时执行) / 月次パーティション作成（pg_cron 定期実行）
-- 每月25日自动创建下月分区 / 毎月25日に翌月のパーティションを自動作成
SELECT cron.schedule(
  'create-next-month-partitions',
  '0 3 25 * *',  -- 毎月25日 03:00
  $$
    DO $do$
    DECLARE
      next_month DATE := date_trunc('month', NOW() + interval '1 month');
      month_after DATE := next_month + interval '1 month';
      suffix TEXT := to_char(next_month, 'YYYY_MM');
    BEGIN
      -- operation_logs
      EXECUTE format(
        'CREATE TABLE IF NOT EXISTS operation_logs_%s PARTITION OF operation_logs
         FOR VALUES FROM (%L) TO (%L)',
        suffix, next_month, month_after
      );
      -- api_logs
      EXECUTE format(
        'CREATE TABLE IF NOT EXISTS api_logs_%s PARTITION OF api_logs
         FOR VALUES FROM (%L) TO (%L)',
        suffix, next_month, month_after
      );
      -- event_logs
      EXECUTE format(
        'CREATE TABLE IF NOT EXISTS event_logs_%s PARTITION OF event_logs
         FOR VALUES FROM (%L) TO (%L)',
        suffix, next_month, month_after
      );
    END
    $do$;
  $$
);

-- 旧分区清理 (TTL) / 古いパーティション削除（TTL）
-- operation_logs / api_logs: 180天 / 180日
-- event_logs: 90天 / 90日
SELECT cron.schedule(
  'drop-old-partitions',
  '0 4 1 * *',  -- 毎月1日 04:00
  $$
    DO $do$
    DECLARE
      old_suffix_180 TEXT := to_char(NOW() - interval '180 days', 'YYYY_MM');
      old_suffix_90 TEXT := to_char(NOW() - interval '90 days', 'YYYY_MM');
    BEGIN
      EXECUTE format('DROP TABLE IF EXISTS operation_logs_%s', old_suffix_180);
      EXECUTE format('DROP TABLE IF EXISTS api_logs_%s', old_suffix_180);
      EXECUTE format('DROP TABLE IF EXISTS event_logs_%s', old_suffix_90);
    END
    $do$;
  $$
);
```

---

## 3. 缓存策略 (3-Layer Cache) / キャッシュ戦略（3層キャッシュ）

### 3.1 架构概览 / アーキテクチャ概要

```
请求 / リクエスト
  │
  ▼
┌───────────────────────────────────────────────────────────────┐
│  L1: 进程内 LRU 缓存 / プロセス内 LRU キャッシュ                  │
│  TTL: 60s | 容量: 1,000 entries | 命中率目标: 60-80%            │
│  用途: 运送业者设置, 系统设置, Feature Flags                       │
│  用途: キャリア設定、システム設定、Feature Flags                    │
├───────────────────────────────────────────────────────────────┤
│  L1 MISS ↓                                                    │
├───────────────────────────────────────────────────────────────┤
│  L2: Redis 缓存 / Redis キャッシュ                               │
│  TTL: 5-15min | 容量: 256MB (allkeys-lru) | 命中率目标: 85-95% │
│  用途: 租户设置, 产品查询, 权限, 会话                               │
│  用途: テナント設定、商品検索、権限、セッション                       │
├───────────────────────────────────────────────────────────────┤
│  L2 MISS ↓                                                    │
├───────────────────────────────────────────────────────────────┤
│  L3: PostgreSQL マテリアライズドビュー                             │
│  更新频率: 5-30min | 用途: ダッシュボード集計, KPI                  │
│  更新頻度: 5-30分 | 用途: ダッシュボード集計、KPI                   │
├───────────────────────────────────────────────────────────────┤
│  L3 MISS ↓                                                    │
├───────────────────────────────────────────────────────────────┤
│  PostgreSQL (Source of Truth) / PostgreSQL（真のデータソース）     │
└───────────────────────────────────────────────────────────────┘
```

### 3.2 L1: 进程内 LRU 缓存 / プロセス内 LRU キャッシュ

```typescript
// in-memory-cache.service.ts
// 进程内缓存, 重启时丢失, 适合热路径 / プロセス内キャッシュ、再起動時に消失、ホットパス向き
@Injectable()
export class InMemoryCacheService {
  private readonly cache = new Map<string, { value: unknown; expiresAt: number }>();
  private readonly MAX_ENTRIES = 1_000;
  private readonly DEFAULT_TTL_MS = 60_000; // 60秒 / 60秒

  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set(key: string, value: unknown, ttlMs = this.DEFAULT_TTL_MS): void {
    // LRU: 超过容量时删除最旧条目 / LRU: 容量超過時に最古のエントリを削除
    if (this.cache.size >= this.MAX_ENTRIES) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  invalidate(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern)) this.cache.delete(key);
    }
  }
}
```

**L1 适用场景 / L1 適用シナリオ**:

| 数据 / データ | TTL | 理由 / 理由 |
|---|---|---|
| 运送业者设置 / キャリア設定 | 60s | 高频读取, 少变更 / 高頻度読取、変更少 |
| Feature Flags | 60s | 每请求检查 / リクエストごとにチェック |
| 系统设置 / システム設定 | 120s | 全局共享 / グローバル共有 |
| 税率表 / 税率テーブル | 300s | 极少变更 / ほぼ変更なし |

### 3.3 L2: Redis 缓存 / Redis キャッシュ

**缓存键命名规范 / キャッシュキー命名規約**:

```
tenant:{tenantId}:module:{key}
```

| 模式 / パターン | 示例 / 例 | TTL |
|---|---|---|
| 租户设置 / テナント設定 | `tenant:uuid:settings:general` | 15min |
| 产品详情 / 商品詳細 | `tenant:uuid:product:{productId}` | 10min |
| 产品列表 / 商品リスト | `tenant:uuid:products:list:{hash}` | 5min |
| 用户权限 / ユーザー権限 | `tenant:uuid:user:{userId}:permissions` | 15min |
| 运送业者配置 / キャリア設定 | `tenant:uuid:carrier:{carrierId}:config` | 10min |
| 仪表盘数据 / ダッシュボード | `tenant:uuid:dashboard:{type}` | 5min |
| B2 Cloud 会话 / セッション | `b2cloud:session:{tenantId}` | 30min |
| 速率限制 / レートリミット | `ratelimit:{ip}:{endpoint}` | 1min |

**Redis 缓存服务 / Redis キャッシュサービス**:

```typescript
// redis-cache.service.ts
@Injectable()
export class RedisCacheService {
  constructor(private readonly redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  // 批量获取 / バッチ取得
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    const results = await this.redis.mget(...keys);
    return results.map((r) => (r ? JSON.parse(r) : null));
  }

  // 按模式失效 / パターン指定で無効化
  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  // 租户级别全失效 / テナントレベル全無効化
  async invalidateTenant(tenantId: string): Promise<void> {
    await this.invalidatePattern(`tenant:${tenantId}:*`);
  }
}
```

### 3.4 L3: PostgreSQL マテリアライズドビュー

```sql
-- ダッシュボード: 今日の出荷统计 / 今日の出荷統計
CREATE MATERIALIZED VIEW mv_daily_shipment_stats AS
SELECT
  tenant_id,
  DATE(created_at) AS date,
  COUNT(*) AS total_orders,
  COUNT(*) FILTER (WHERE status = 'shipped') AS shipped_count,
  COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
  COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_count,
  SUM(total_items) AS total_items
FROM shipment_orders
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  AND deleted_at IS NULL
GROUP BY tenant_id, DATE(created_at);

CREATE UNIQUE INDEX idx_mv_daily_shipment ON mv_daily_shipment_stats (tenant_id, date);

-- ダッシュボード: 在库汇总 / 在庫サマリー
CREATE MATERIALIZED VIEW mv_inventory_summary AS
SELECT
  tenant_id,
  COUNT(DISTINCT product_id) AS total_products,
  SUM(available_quantity) AS total_available,
  SUM(reserved_quantity) AS total_reserved,
  COUNT(*) FILTER (WHERE available_quantity <= reorder_point) AS low_stock_count
FROM stock_quants sq
JOIN products p ON p.id = sq.product_id
WHERE sq.deleted_at IS NULL
GROUP BY tenant_id;

-- 定期刷新 (pg_cron) / 定期リフレッシュ（pg_cron）
SELECT cron.schedule('refresh-daily-shipment', '*/5 * * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_shipment_stats');
SELECT cron.schedule('refresh-inventory-summary', '*/10 * * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_inventory_summary');
```

### 3.5 缓存失效: 事件驱动 / キャッシュ無効化: イベント駆動

```typescript
// 使用 NestJS EventEmitter2 的领域事件驱动缓存失效
// NestJS EventEmitter2 のドメインイベントでキャッシュ無効化

// ---- 事件定义 / イベント定義 ----
export class ProductUpdatedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly productId: string,
  ) {}
}

// ---- 事件发布 (Service层) / イベント発行（Service層） ----
@Injectable()
export class ProductsService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  async update(tenantId: string, id: string, dto: UpdateProductDto) {
    const result = await this.repository.update(tenantId, id, dto);
    // 变更后发布事件 / 変更後にイベントを発行
    this.eventEmitter.emit('product.updated', new ProductUpdatedEvent(tenantId, id));
    return result;
  }
}

// ---- 事件监听 (缓存清除) / イベントリスナー（キャッシュクリア） ----
@Injectable()
export class CacheInvalidationListener {
  constructor(
    private readonly l1Cache: InMemoryCacheService,
    private readonly l2Cache: RedisCacheService,
  ) {}

  @OnEvent('product.updated')
  async handleProductUpdated(event: ProductUpdatedEvent) {
    // L1 清除 / L1 クリア
    this.l1Cache.invalidate(`tenant:${event.tenantId}:product`);
    // L2 清除 / L2 クリア
    await this.l2Cache.invalidatePattern(`tenant:${event.tenantId}:product*`);
    await this.l2Cache.invalidatePattern(`tenant:${event.tenantId}:dashboard*`);
  }

  @OnEvent('shipment.statusChanged')
  async handleShipmentStatusChanged(event: ShipmentStatusChangedEvent) {
    await this.l2Cache.invalidatePattern(`tenant:${event.tenantId}:dashboard*`);
    await this.l2Cache.invalidatePattern(`tenant:${event.tenantId}:shipment*`);
  }
}
```

---

## 4. API 性能优化 / API パフォーマンス最適化

### 4.1 响应压缩 / レスポンス圧縮

```typescript
// main.ts — Fastify 圧縮プラグイン / Fastify 圧縮プラグイン
import compression from '@fastify/compress';

await app.register(compression, {
  global: true,
  // Brotli 优先 (更高压缩率), gzip 回退 / Brotli 優先（高圧縮率）、gzip フォールバック
  encodings: ['br', 'gzip', 'deflate'],
  threshold: 1024,  // 1KB以下は圧縮しない / 1KB未満は圧縮しない
});
```

**压缩效果预估 / 圧縮効果予測**:

| 响应类型 / レスポンス | 原始大小 / 元サイズ | gzip | Brotli |
|---|---|---|---|
| JSON (产品列表50件) | ~80KB | ~12KB (85%) | ~10KB (87%) |
| JSON (单个产品) | ~2KB | ~800B (60%) | ~700B (65%) |
| CSV 导出 (10,000行) | ~5MB | ~500KB (90%) | ~400KB (92%) |

### 4.2 ETag / If-None-Match (条件请求) / 条件付きリクエスト

```typescript
// etag.interceptor.ts
// 对 GET 请求自动生成 ETag / GET リクエストに自動 ETag 生成
@Injectable()
export class ETagInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        const response = context.switchToHttp().getResponse();
        const request = context.switchToHttp().getRequest();

        if (request.method === 'GET' && data) {
          // 根据响应内容生成 ETag / レスポンス内容から ETag を生成
          const etag = `"${createHash('md5').update(JSON.stringify(data)).digest('hex')}"`;
          response.header('ETag', etag);

          // 如果客户端缓存匹配, 返回 304 / クライアントキャッシュが一致すれば 304 を返却
          if (request.headers['if-none-match'] === etag) {
            response.status(304);
            return undefined;
          }
        }
        return data;
      }),
    );
  }
}
```

### 4.3 分页设计 / ページネーション設計

```typescript
// pagination.dto.ts
export class PaginationDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)   // 最大 200 条/页 / 最大 200 件/ページ
  limit: number = 50;  // 默认 50 / デフォルト 50

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;  // Offset 模式 / Offset モード

  @IsOptional()
  @IsUUID()
  cursor?: string;  // Keyset 模式 / Keyset モード
}

// 响应格式 / レスポンス形式
interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;       // 总数 / 合計
    page?: number;       // 当前页 / 現在ページ (Offset)
    limit: number;       // 每页数量 / ページサイズ
    totalPages?: number; // 总页数 / 総ページ数 (Offset)
    nextCursor?: string; // 下一页游标 / 次ページカーソル (Keyset)
    hasMore: boolean;    // 是否有更多 / さらにあるか
  };
}
```

### 4.4 字段选择 (Sparse Fieldsets) / フィールド選択（スパースフィールドセット）

```
GET /api/v1/products?fields=id,sku,name,available_quantity

-- 只查询指定字段, 减少网络传输 / 指定フィールドのみクエリ、ネットワーク転送量を削減
SELECT id, sku, name, available_quantity FROM products WHERE ...
```

```typescript
// field-select.pipe.ts
@Injectable()
export class FieldSelectPipe implements PipeTransform {
  private readonly ALLOWED_FIELDS: Record<string, string[]> = {
    products: ['id', 'sku', 'name', 'barcode', 'status', 'available_quantity',
               'client_id', 'shop_id', 'created_at', 'updated_at'],
    orders: ['id', 'order_number', 'status', 'client_name', 'total_items',
             'created_at', 'shipped_at'],
  };

  transform(value: string | undefined, metadata: ArgumentMetadata) {
    if (!value) return undefined;
    const requested = value.split(',').map((f) => f.trim());
    const allowed = this.ALLOWED_FIELDS[metadata.data ?? ''] ?? [];
    // 只返回允许的字段 / 許可されたフィールドのみ返却
    return requested.filter((f) => allowed.includes(f));
  }
}
```

### 4.5 批量 API / バッチ API

```typescript
// POST /api/v1/products/batch
// 最大 100 件の一括操作 / 最大 100 件のバッチ操作
@Post('batch')
async batchGetProducts(
  @TenantId() tenantId: string,
  @Body() dto: BatchGetDto,  // { ids: string[] } — max 100
): Promise<Product[]> {
  if (dto.ids.length > 100) {
    throw new BadRequestException('Max 100 IDs per request / 1回最大100件');
  }
  return this.productsService.findByIds(tenantId, dto.ids);
}

// POST /api/v1/products/batch-update
@Post('batch-update')
async batchUpdateProducts(
  @TenantId() tenantId: string,
  @Body() dto: BatchUpdateDto,  // { updates: { id, fields }[] } — max 100
): Promise<BatchResult> {
  return this.productsService.batchUpdate(tenantId, dto.updates);
}
```

### 4.6 流式 CSV 导出 / ストリーミング CSV エクスポート

```typescript
// csv-export.service.ts
// 不缓冲整个数据集, 逐行流式输出 / データ全体をバッファリングせず、行ごとにストリーミング出力
@Get('export/csv')
async exportCsv(
  @TenantId() tenantId: string,
  @Query() filters: ProductFilterDto,
  @Res() res: FastifyReply,
) {
  res.header('Content-Type', 'text/csv; charset=utf-8');
  res.header('Content-Disposition', 'attachment; filename="products.csv"');
  res.header('Transfer-Encoding', 'chunked');

  // BOM + 标题行 / BOM + ヘッダー行
  res.raw.write('\uFEFF');
  res.raw.write('SKU,Name,Barcode,Quantity,Status\n');

  // 游标分页流式输出 / カーソルページネーションでストリーミング
  let cursor: string | undefined;
  do {
    const batch = await this.productsService.findPage(tenantId, filters, {
      cursor,
      limit: 500,
    });
    for (const product of batch.data) {
      res.raw.write(`${product.sku},${product.name},${product.barcode},${product.quantity},${product.status}\n`);
    }
    cursor = batch.meta.nextCursor;
  } while (cursor);

  res.raw.end();
}
```

---

## 5. 后台任务性能 / バックグラウンドタスクパフォーマンス

### 5.1 BullMQ 队列并发配置 / BullMQ キュー並列設定

| 队列名 / キュー名 | 并发度 / 並列度 | 优先级 / 優先度 | 重试 / リトライ | 理由 / 理由 |
|---|---|---|---|---|
| `wms-webhook` | 10 | normal(5) | 3次, 指数退避 | 外部回调需快速投递 / 外部コールバックは迅速に配信 |
| `wms-notification` | 5 | normal(5) | 3次, 指数退避 | Email/Slack 发送 / Email/Slack 送信 |
| `wms-csv-import` | 2 | low(10) | 3次, 指数退避 | CPU 密集, 避免影响 API / CPU集約、API影響回避 |
| `wms-billing` | 2 | normal(5) | 3次, 指数退避 | 计算密集 / 計算集約 |
| `wms-script` | 2 | low(10) | 3次, 指数退避 | 用户脚本隔离执行 / ユーザースクリプト分離実行 |
| `wms-report` | 1 | low(10) | 3次, 指数退避 | 大量 DB 查询, 串行避免过载 / 大量 DB クエリ、直列で過負荷回避 |
| `wms-audit` | 1 | critical(1) | 3次, 指数退避 | 审计日志不可丢失 / 監査ログ喪失不可 |

**优先级配置 / 優先度設定**:

```typescript
// queue.module.ts
// 优先级数字越小越高 / 優先度の数値が小さいほど高い
const PRIORITY = {
  CRITICAL: 1,  // 审计日志, 安全事件 / 監査ログ、セキュリティイベント
  HIGH: 3,      // 出库确认通知 / 出庫確認通知
  NORMAL: 5,    // 一般 Webhook, Email
  LOW: 10,      // CSV 导入, 报表生成 / CSV インポート、レポート生成
} as const;
```

### 5.2 运送业者 API 速率限制 / キャリア API レートリミット

```typescript
// b2-cloud-rate-limiter.ts
// B2 Cloud API: 最大 10 req/sec (推测值, 文档未明示)
// B2 Cloud API: 最大 10 req/sec（推定値、ドキュメント未明記）

@Injectable()
export class B2CloudRateLimiter {
  private readonly limiter = new Bottleneck({
    maxConcurrent: 5,       // 最大同时请求 / 最大同時リクエスト
    minTime: 100,           // 请求间隔最小 100ms = 10 req/sec / リクエスト間隔最小 100ms
    reservoir: 10,          // 10 个令牌 / 10 トークン
    reservoirRefreshAmount: 10,
    reservoirRefreshInterval: 1000, // 每秒补充 / 毎秒補充
  });

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return this.limiter.schedule(fn);
  }
}
```

### 5.3 CSV 导入分块处理 / CSV インポートチャンク処理

```typescript
// csv-import.processor.ts
@Processor('wms-csv-import')
export class CsvImportProcessor {
  private readonly CHUNK_SIZE = 500;  // 每批 500 行 / バッチあたり 500 行

  @Process()
  async handleImport(job: Job<CsvImportJobData>) {
    const { tenantId, filePath, mapping, totalRows } = job.data;
    let processedRows = 0;
    let errorRows: ErrorRow[] = [];

    // 流式读取 CSV / ストリーミング CSV 読込
    const stream = createReadStream(filePath).pipe(csvParser());
    let chunk: Record<string, unknown>[] = [];

    for await (const row of stream) {
      chunk.push(this.mapRow(row, mapping));

      if (chunk.length >= this.CHUNK_SIZE) {
        // 500行一批写入数据库 (事务内) / 500行ずつDBに書込（トランザクション内）
        const result = await this.insertChunk(tenantId, chunk);
        processedRows += result.success;
        errorRows.push(...result.errors);
        chunk = [];

        // 进度更新 / 進捗更新
        await job.updateProgress(Math.round((processedRows / totalRows) * 100));
      }
    }

    // 处理剩余行 / 残り行を処理
    if (chunk.length > 0) {
      const result = await this.insertChunk(tenantId, chunk);
      processedRows += result.success;
      errorRows.push(...result.errors);
    }

    return { processedRows, errorRows: errorRows.length, errors: errorRows.slice(0, 100) };
  }

  private async insertChunk(tenantId: string, rows: Record<string, unknown>[]) {
    return this.db.transaction(async (tx) => {
      // 批量 INSERT ... ON CONFLICT 处理重复 / バッチ INSERT ... ON CONFLICT で重複処理
      const result = await tx.insert(productsTable)
        .values(rows.map((r) => ({ ...r, tenantId })))
        .onConflictDoUpdate({
          target: [productsTable.tenantId, productsTable.sku],
          set: { /* 更新字段 / 更新フィールド */ },
        })
        .returning();
      return { success: result.length, errors: [] };
    });
  }
}
```

### 5.4 任务监控与死信队列 / タスクモニタリングとデッドレターキュー

```typescript
// queue-monitor.service.ts
@Injectable()
export class QueueMonitorService {
  private readonly QUEUE_NAMES = [
    'wms-webhook', 'wms-notification', 'wms-csv-import',
    'wms-billing', 'wms-script', 'wms-report', 'wms-audit',
  ];

  // 每分钟检查队列健康 / 毎分キューの健全性をチェック
  @Cron('* * * * *')
  async checkQueueHealth() {
    for (const name of this.QUEUE_NAMES) {
      const queue = new Queue(name, { connection: this.redis });
      const counts = await queue.getJobCounts('waiting', 'active', 'failed', 'delayed');

      // 告警阈值 / アラートしきい値
      if (counts.waiting > 1000) {
        this.alert.warn(`Queue ${name}: ${counts.waiting} waiting jobs / 待ちジョブ`);
      }
      if (counts.failed > 100) {
        this.alert.error(`Queue ${name}: ${counts.failed} failed jobs / 失敗ジョブ`);
      }
    }
  }
}
```

---

## 6. 前端性能 / フロントエンドパフォーマンス

### 6.1 代码分割: 按路由懒加载 / コードスプリッティング: ルート別レイジーロード

```typescript
// router/index.ts
// 118 个路由全部懒加载 / 118 ルートすべてレイジーロード
const routes = [
  {
    path: '/products',
    component: () => import('@/views/products/ProductList.vue'),
    // Vite 自动分割为独立 chunk / Vite が自動的に独立チャンクに分割
  },
  {
    path: '/products/:id',
    component: () => import('@/views/products/ProductDetail.vue'),
  },
  // ... 116 more routes
];
```

**Vite 构建分割策略 / Vite ビルド分割戦略**:

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // 框架核心 (很少变更, 长期缓存) / フレームワークコア（変更少、長期キャッシュ）
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
          // UI 库 (独立 chunk) / UI ライブラリ（独立チャンク）
          'element-plus': ['element-plus'],
          // 图表库 (只在仪表盘加载) / チャートライブラリ（ダッシュボードのみロード）
          'echarts': ['echarts'],
          // 工具库 / ユーティリティ
          'utils': ['dayjs', 'lodash-es', 'axios'],
        },
      },
    },
    // chunk 大小告警阈值 / チャンクサイズ警告しきい値
    chunkSizeWarningLimit: 500, // KB
  },
});
```

**目标 Bundle 大小 / ターゲットバンドルサイズ**:

| Chunk | 目标 (gzip) / ターゲット | 说明 / 説明 |
|---|---|---|
| 初始加载 / 初期ロード | < 200KB | vue-vendor + app core |
| element-plus | < 150KB | Tree-shaking 后 / Tree-shaking 後 |
| echarts | < 100KB | 仅使用的图表类型 / 使用チャートタイプのみ |
| 路由 chunk (平均) / ルートチャンク | < 30KB | 单个页面 / 単一ページ |
| **总计 / 合計** | **< 500KB** | 首次加载 / 初回ロード |

### 6.2 Element Plus Tree-shaking

```typescript
// plugins/element-plus.ts
// 按需引入, 不全量导入 / オンデマンドインポート、全量インポートしない
import { ElButton, ElTable, ElForm, ElInput, ElSelect, ElDialog,
         ElPagination, ElMessage, ElMessageBox, ElNotification,
         ElLoading, ElDropdown, ElTag, ElTooltip } from 'element-plus';

// 自动按需导入 (unplugin-vue-components) / 自動オンデマンドインポート
// vite.config.ts
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';

export default defineConfig({
  plugins: [
    Components({
      resolvers: [ElementPlusResolver()],
    }),
  ],
});
```

### 6.3 虚拟滚动 (大型表格) / バーチャルスクロール（大型テーブル）

```vue
<!-- VirtualTable.vue -->
<!-- 超过 1,000 行使用虚拟滚动 / 1,000 行超はバーチャルスクロール使用 -->
<template>
  <el-table-v2
    v-if="data.length > 1000"
    :columns="columns"
    :data="data"
    :width="tableWidth"
    :height="600"
    :row-height="48"
    fixed
  />
  <el-table v-else :data="data">
    <!-- 普通表格 / 通常テーブル -->
  </el-table>
</template>

<script setup lang="ts">
// el-table-v2 只渲染可见区域行 / 可視範囲の行のみレンダリング
// 10,000 行でも 60fps を維持 / 10,000行でも60fpsを維持
</script>
```

### 6.4 图片懒加载 + WebP 变换 / 画像レイジーロード + WebP 変換

```vue
<!-- ProductImage.vue -->
<template>
  <picture>
    <source :srcset="webpSrc" type="image/webp" />
    <img
      v-lazy="originalSrc"
      loading="lazy"
      decoding="async"
      :alt="alt"
      :width="width"
      :height="height"
    />
  </picture>
</template>

<script setup lang="ts">
// Supabase Storage 变换参数 / Supabase Storage 変換パラメータ
const webpSrc = computed(() =>
  `${props.src}?width=${props.width}&height=${props.height}&format=webp&quality=80`
);
</script>
```

### 6.5 Service Worker (PWA 路线图) / Service Worker（PWA ロードマップ）

```
阶段 1 (当前): 无 Service Worker / Service Worker なし
阶段 2 (未来): 静态资源缓存 / 静的アセットキャッシュ
  - HTML, CSS, JS, 图片 / 画像
  - Cache-First 策略 / Cache-First 戦略
阶段 3 (未来): API 缓存 / API キャッシュ
  - GET 请求 Network-First / GET リクエスト Network-First
  - 离线时使用缓存 / オフライン時にキャッシュ使用
阶段 4 (未来): 离线操作 / オフライン操作
  - 后台同步 (Background Sync) / バックグラウンド同期
  - 库存扫描离线队列 / 在庫スキャンオフラインキュー
```

### 6.6 Core Web Vitals 目标 / Core Web Vitals 目標

| 指标 / 指標 | 目标 / 目標 | 测量 / 測定 |
|---|---|---|
| LCP (Largest Contentful Paint) | < 2.5s | Lighthouse |
| FID (First Input Delay) / INP | < 100ms / < 200ms | Lighthouse |
| CLS (Cumulative Layout Shift) | < 0.1 | Lighthouse |
| TTFB (Time to First Byte) | < 600ms | Lighthouse |
| Bundle Size (gzip) | < 500KB | `vite build --report` |
| API First Response | < 200ms | Network tab |

---

## 7. 负载测试计划 / 負荷テスト計画

### 7.1 测试工具 / テストツール

**主要工具 / メインツール**: [k6](https://k6.io/) (Grafana)

选择理由 / 選択理由:
- JavaScript/TypeScript 脚本 / JavaScript/TypeScript スクリプト
- 轻量, 不依赖 JVM / 軽量、JVM 不要
- Grafana 集成可视化 / Grafana 連携ビジュアライゼーション
- CI/CD 管道集成简单 / CI/CD パイプライン統合が容易

### 7.2 测试场景 / テストシナリオ

#### 场景 A: 通常负载 / 通常負荷

```javascript
// k6/normal-load.js
export const options = {
  stages: [
    { duration: '2m', target: 50 },   // 2分钟内增加到50用户 / 2分で50ユーザーに増加
    { duration: '5m', target: 50 },   // 维持50用户5分钟 / 50ユーザーを5分間維持
    { duration: '2m', target: 0 },    // 2分钟内降到0 / 2分で0に減少
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],   // P95 < 500ms
    http_req_failed: ['rate<0.01'],     // 错误率 < 1% / エラー率 < 1%
  },
};
```

**验收标准 / 受入基準**:

| 指标 / 指標 | 目标 / 目標 |
|---|---|
| API P95 延迟 / レイテンシ | < 500ms |
| 错误率 / エラー率 | < 1% |
| 吞吐量 / スループット | > 200 req/s |

#### 场景 B: 高峰负载 / ピーク負荷

```javascript
// k6/peak-load.js
export const options = {
  stages: [
    { duration: '3m', target: 200 },  // 200 并发用户 / 200 同時ユーザー
    { duration: '10m', target: 200 }, // 维持10分钟 / 10分間維持
    { duration: '3m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],  // P95 < 1s
    http_req_failed: ['rate<0.05'],     // 错误率 < 5% / エラー率 < 5%
  },
};
```

**验收标准 / 受入基準**:

| 指标 / 指標 | 目标 / 目標 |
|---|---|
| API P95 延迟 / レイテンシ | < 1,000ms |
| 错误率 / エラー率 | < 5% |
| 吞吐量 / スループット | > 500 req/s |
| 无数据丢失 / データ喪失なし | 0 lost transactions |

#### 场景 C: 压力测试 / ストレステスト

```javascript
// k6/stress-test.js
export const options = {
  stages: [
    { duration: '5m', target: 500 },  // 500 并发用户 / 500 同時ユーザー
    { duration: '10m', target: 500 }, // 维持10分钟 / 10分間維持
    { duration: '5m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // P95 < 2s
    http_req_failed: ['rate<0.10'],     // 错误率 < 10% / エラー率 < 10%
  },
};
```

**验收标准 / 受入基準**:

| 指标 / 指標 | 目标 / 目標 |
|---|---|
| API P95 延迟 / レイテンシ | < 2,000ms |
| 错误率 / エラー率 | < 10% |
| 系统恢复时间 / 回復時間 | 负载降低后 < 30s 恢复正常 / 負荷低下後 < 30s で正常復帰 |
| 无系统崩溃 / クラッシュなし | 0 crashes |

### 7.3 关键流测试脚本 / 重要フローテストスクリプト

```javascript
// k6/scenarios/main-flows.js
// 模拟真实用户操作 / 実ユーザー操作をシミュレート

import { group, check, sleep } from 'k6';
import http from 'k6/http';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // 流程 1: 登录 / フロー 1: ログイン
  group('Login', () => {
    const res = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify({
      email: 'test@example.com',
      password: 'test-password',
    }), { headers: { 'Content-Type': 'application/json' } });
    check(res, { 'login 200': (r) => r.status === 200 });
    sleep(1);
  });

  // 流程 2: 搜索库存 / フロー 2: 在庫検索
  group('Search Inventory', () => {
    const res = http.get(`${BASE_URL}/api/v1/products?search=テスト&limit=50`);
    check(res, {
      'search 200': (r) => r.status === 200,
      'search < 300ms': (r) => r.timings.duration < 300,
    });
    sleep(0.5);
  });

  // 流程 3: 创建出库单 / フロー 3: 出荷伝票作成
  group('Create Shipment', () => {
    const res = http.post(`${BASE_URL}/api/v1/shipment-orders`, JSON.stringify({
      client_id: 'test-client',
      items: [{ product_id: 'test-product', quantity: 1 }],
    }), { headers: { 'Content-Type': 'application/json' } });
    check(res, { 'create shipment 201': (r) => r.status === 201 });
    sleep(1);
  });

  // 流程 4: PDF 生成 / フロー 4: PDF 生成
  group('Generate PDF', () => {
    const res = http.get(`${BASE_URL}/api/v1/render/shipment-label/test-id`);
    check(res, {
      'pdf 200': (r) => r.status === 200,
      'pdf < 3s': (r) => r.timings.duration < 3000,
    });
    sleep(2);
  });
}
```

### 7.4 测试时间表 / テストスケジュール

| 时机 / タイミング | 测试类型 / テスト種別 | 自动化 / 自動化 |
|---|---|---|
| 每次 major release 前 / メジャーリリース前 | A + B + C 全场景 / 全シナリオ | 手动触发 / 手動トリガー |
| 每周 (staging) / 毎週（ステージング） | A 通常负载 / 通常負荷 | CI/CD (GitHub Actions) |
| 数据库迁移后 / DB マイグレーション後 | B 高峰负载 / ピーク負荷 | 手動 |
| 架构变更后 / アーキテクチャ変更後 | A + B | 手動 |

---

## 8. 水平扩展架构 / 水平スケーリングアーキテクチャ

### 8.1 无状态后端设计 / ステートレスバックエンド設計

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloud Load Balancer                        │
│                 (Cloud Run / GCP / Railway)                   │
└──────┬────────────┬────────────┬────────────┬───────────────┘
       │            │            │            │
┌──────▼──┐  ┌──────▼──┐  ┌──────▼──┐  ┌──────▼──┐
│ NestJS  │  │ NestJS  │  │ NestJS  │  │ NestJS  │
│ Pod 1   │  │ Pod 2   │  │ Pod 3   │  │ Pod 4   │
│ (5 conn)│  │ (5 conn)│  │ (5 conn)│  │ (5 conn)│
└────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘
     │            │            │            │
     └────────────┴─────┬──────┴────────────┘
                        │
              ┌─────────▼─────────┐
              │   Redis (共有状态)  │
              │   (共有ステート)    │
              │  - 缓存 / キャッシュ │
              │  - 速率限制 / レート │
              │  - BullMQ 队列     │
              │  - 会话 / セッション │
              └─────────┬─────────┘
                        │
              ┌─────────▼─────────┐
              │   PgBouncer        │
              │   (Connection Pool)│
              └─────────┬─────────┘
                        │
              ┌─────────▼─────────┐
              │  PostgreSQL 16     │
              │  (Supabase)        │
              │  max 20 conn/pod   │
              └────────────────────┘
```

**无状态设计原则 / ステートレス設計原則**:

| 规则 / ルール | 说明 / 説明 |
|---|---|
| 无粘性会话 / スティッキーセッションなし | JWT 自带认证状态 / JWT で認証状態を保持 |
| 无进程内共享状态 / プロセス内共有状態なし | L1 缓存可丢失 / L1 キャッシュは喪失可 |
| 文件存储用 Supabase Storage / ファイルはSupabase Storage | 不存储在本地磁盘 / ローカルディスクに保存しない |
| BullMQ 由 Redis 管理 / BullMQ はRedis管理 | 任何 Pod 都可处理队列任务 / 任意のPodがキュータスクを処理可 |

### 8.2 自动扩缩容 / オートスケーリング

**Cloud Run 配置 / Cloud Run 設定**:

```yaml
# cloud-run-service.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: zelixwms-api
spec:
  template:
    metadata:
      annotations:
        # 自动扩缩容 / オートスケーリング
        autoscaling.knative.dev/minScale: "1"   # 最小 1 实例 / 最小 1 インスタンス
        autoscaling.knative.dev/maxScale: "10"  # 最大 10 实例 / 最大 10 インスタンス
        autoscaling.knative.dev/target: "80"    # 每实例 80 并发请求 / インスタンスあたり 80 同時リクエスト
    spec:
      containerConcurrency: 100
      containers:
        - image: zelixwms-api:latest
          resources:
            limits:
              cpu: "2"
              memory: "1Gi"
```

**扩缩容触发条件 / スケーリングトリガー条件**:

| 指标 / 指標 | 扩容阈值 / スケールアウト | 缩容阈值 / スケールイン |
|---|---|---|
| CPU 使用率 / CPU 使用率 | > 70% | < 30% |
| 内存使用率 / メモリ使用率 | > 80% | < 40% |
| 并发请求数 / 同時リクエスト数 | > 80/instance | < 20/instance |
| 响应延迟 P95 / レイテンシ P95 | > 1s | N/A |

**Staging 环境 Scale-to-Zero / ステージング環境 Scale-to-Zero**:

```yaml
# staging 环境: 无流量时缩到0, 节省成本 / ステージング: トラフィックなし時に0、コスト節約
autoscaling.knative.dev/minScale: "0"
# 冷启动时间: ~3s (NestJS + Fastify) / コールドスタート: ~3s
```

### 8.3 数据库连接管理 / データベース接続管理

```
总连接数计算 / 総接続数計算:

NestJS Pods: 4 个 × 5 connections = 20 pooled connections
BullMQ Workers: 4 个 × 1 connection = 4 connections (Redis→DB for audit)
Migrations/Admin: 2 connections (直接连接 / 直接接続)
──────────────────────────────────────────
合计 / 合計: ~26 connections (Supabase Pro max: 60)
使用率 / 使用率: ~43% (安全余量 / 安全マージン)
```

### 8.4 Redis 高可用 / Redis 高可用性

```
当前 (10 租户以下): 单实例 Redis (Upstash/Railway)
現在（10テナント以下）: シングルインスタンス Redis

未来 (50+ 租户): Redis Cluster (3 nodes)
将来（50+ テナント）: Redis Cluster（3ノード）

┌──────────┐  ┌──────────┐  ┌──────────┐
│ Primary  │  │ Replica 1│  │ Replica 2│
│ (R+W)    │──│ (R only) │──│ (R only) │
└──────────┘  └──────────┘  └──────────┘
```

---

## 9. 容量规划 / キャパシティプランニング

### 9.1 单租户容量预估 / シングルテナント容量予測

| 数据类型 / データ種別 | 预估量 / 予測量 | 年增长 / 年間増加 |
|---|---|---|
| 产品 (products) / 商品 | ~1,000 条 / 件 | +500/年 |
| 出库单 (shipment_orders) / 出荷伝票 | ~100 件/日 / 日 | ~36,500/年 |
| 入库单 (inbound_orders) / 入荷伝票 | ~20 件/日 / 日 | ~7,300/年 |
| 库存记录 (stock_quants) / 在庫レコード | ~3,000 条 / 件 | +1,000/年 |
| 操作日志 (operation_logs) / 操作ログ | ~500 条/日 / 日 | ~182,500/年 (TTL 180天 / 日) |
| API 日志 (api_logs) | ~200 条/日 / 日 | ~73,000/年 (TTL 180天 / 日) |
| 文件存储 (Supabase Storage) / ファイル | ~5GB/年 | PDF, CSV, 图片 / 画像 |

**单租户年存储量 / シングルテナント年間ストレージ**:
- DB: ~5GB/年 (含日志 TTL 后 / ログ TTL 後を含む)
- Storage: ~5GB/年
- **合计 / 合計: ~10GB/年/租户 / テナント**

### 9.2 扩展阶段规划 / スケーリングフェーズ計画

#### 阶段 1: 10 租户 (当前目标) / フェーズ 1: 10テナント（現在の目標）

| 资源 / リソース | 规格 / スペック | 月费用 / 月額 |
|---|---|---|
| Supabase Pro | 8GB RAM, 50GB DB | $25 |
| Cloud Run (API) | 2 vCPU, 1GB, 1-4 instances | ~$50 |
| Redis (Upstash) | 256MB, 10K cmd/day | $10 |
| Supabase Storage | 100GB | 含 Pro |
| **合计 / 合計** | | **~$85/月** |

```
DB 使用量 / DB 使用量: ~50GB (10 tenants × 5GB)
存储使用量 / ストレージ: ~50GB (10 tenants × 5GB)
并发用户 / 同時接続: ~100-300
API QPS: ~100-300 req/s
```

#### 阶段 2: 50 租户 / フェーズ 2: 50テナント

| 资源 / リソース | 规格 / スペック | 月费用 / 月額 |
|---|---|---|
| Supabase Pro (升级) | 16GB RAM, 256GB DB | $75 |
| Cloud Run (API) | 4 vCPU, 2GB, 2-8 instances | ~$150 |
| Redis (升级) | 1GB, Cluster mode | $30 |
| Read Replica | 1x replica | $50 |
| **合计 / 合計** | | **~$305/月** |

**必要操作 / 必要な対応**:
- 启用 Read Replica (报表查询) / Read Replica 有効化（レポートクエリ）
- Redis 升级到 1GB / Redis を 1GB にアップグレード
- 优化慢查询 / スロークエリ最適化
- CDN 静态资源 / CDN 静的アセット

#### 阶段 3: 100 租户 / フェーズ 3: 100テナント

| 资源 / リソース | 规格 / スペック | 月费用 / 月額 |
|---|---|---|
| Supabase Team | 32GB RAM, 512GB DB | $150 |
| Cloud Run (API) | 4 vCPU, 2GB, 4-10 instances | ~$300 |
| Redis Cluster | 2GB, 3 nodes | $80 |
| Read Replica | 2x replicas | $100 |
| CDN (CloudFlare) | Pro plan | $20 |
| **合计 / 合計** | | **~$650/月** |

**必要操作 / 必要な対応**:
- Redis Cluster 模式 / Redis Cluster モード
- 2 Read Replicas / 2 リードレプリカ
- 日志表分区自动化验证 / ログテーブルパーティション自動化検証
- 监控仪表盘完善 / モニタリングダッシュボード完備

### 9.3 PostgreSQL 容量极限 / PostgreSQL 容量限界

| 限制项 / 制限 | PostgreSQL 限界 | ZELIXWMS 预计使用 / 予測使用 |
|---|---|---|
| 单表最大大小 / テーブル最大サイズ | 32TB | < 100GB (100テナント時) |
| 单行最大大小 / 行最大サイズ | 1.6TB | < 10KB (平均 / 平均) |
| 列数/表 / カラム数/テーブル | 1,600 | < 60 (最大 products 表) |
| 索引数/表 / インデックス数/テーブル | 無制限 | < 15 |
| 数据库最大大小 / DB 最大サイズ | 無制限 | < 500GB (100テナント時) |

> 结论: PostgreSQL 16 的容量限制对 ZELIXWMS 来说数年内不会成为瓶颈。
> 結論: PostgreSQL 16 の容量制限は ZELIXWMS にとって数年間ボトルネックにならない。

### 9.4 超大规模路线图 (1000+ 租户) / 超大規模ロードマップ（1000+テナント）

```
当前架构可支撑到 ~200 租户 / 現在のアーキテクチャは ~200 テナントまで対応可能

200+ 租户时需要考虑 / 200+ テナント時に検討すべき事項:
├── 数据库分片 (per-tenant schema or database) / DBシャーディング
├── 微服务拆分 (shipment, billing, reporting) / マイクロサービス分割
├── 事件驱动架构 (Kafka/NATS) / イベント駆動アーキテクチャ
├── 多区域部署 / マルチリージョンデプロイ
└── 专用基础设施 (大企业客户) / 専用インフラ（大企業顧客）

注意: 这是远期规划, 当前不需要过早优化
注意: これは長期計画であり、現時点での早すぎる最適化は不要
```

---

## 附录 A: 性能监控仪表盘 / パフォーマンスモニタリングダッシュボード

### 必须监控的指标 / 必須モニタリング指標

| 类别 / カテゴリ | 指标 / 指標 | 健康 / 健全 | 警告 / 警告 | 危险 / 危険 |
|---|---|---|---|---|
| DB | Cache Hit Ratio | > 99% | < 95% | < 90% |
| DB | 活跃连接数 / アクティブ接続 | < 50% pool | > 80% pool | > 90% pool |
| DB | 慢查询数/分 / スロークエリ/分 | < 5 | > 20 | > 50 |
| API | P95 延迟 / レイテンシ | < 200ms | > 500ms | > 1,000ms |
| API | 错误率 / エラー率 | < 1% | > 3% | > 5% |
| Redis | 内存使用 / メモリ使用 | < 60% | > 80% | > 90% |
| Redis | 命中率 / ヒット率 | > 90% | < 80% | < 70% |
| Node.js | Event Loop 延迟 / 遅延 | < 10ms | > 50ms | > 100ms |
| Node.js | 堆内存 / ヒープメモリ | < 70% | > 85% | > 95% |
| BullMQ | 等待任务 / 待ちジョブ | < 100 | > 500 | > 1,000 |
| BullMQ | 失败任务 / 失敗ジョブ | < 10 | > 50 | > 100 |

---

## 附录 B: 性能优化检查清单 / パフォーマンス最適化チェックリスト

### 部署前检查 / デプロイ前チェック

- [ ] 所有新查询有 EXPLAIN ANALYZE / 全新規クエリに EXPLAIN ANALYZE 済み
- [ ] 新增表有 tenant_id 复合索引 / 新テーブルに tenant_id 複合インデックスあり
- [ ] 大表查询使用 Keyset 分页 / 大テーブルクエリに Keyset ページネーション使用
- [ ] N+1 查询已消除 / N+1 クエリ排除済み
- [ ] 缓存策略已定义 / キャッシュ戦略定義済み
- [ ] 大列表有虚拟滚动 / 大リストにバーチャルスクロールあり
- [ ] 新路由已懒加载 / 新ルートはレイジーロード済み
- [ ] API 响应压缩已启用 / API レスポンス圧縮有効
- [ ] 批量操作有大小限制 / バッチ操作にサイズ制限あり
- [ ] 后台任务有超时设定 / バックグラウンドタスクにタイムアウト設定あり

### 定期检查 (月次) / 定期チェック（月次）

- [ ] 检查未使用索引并清理 / 未使用インデックスを確認・削除
- [ ] 检查 pg_stat_statements Top 10 / pg_stat_statements Top 10 確認
- [ ] Redis 缓存命中率 > 85% / Redis キャッシュヒット率 > 85%
- [ ] BullMQ 无积压任务 / BullMQ にバックログなし
- [ ] Bundle 大小未超标 / バンドルサイズが基準内
- [ ] 负载测试通过 / 負荷テスト合格

---

> **文档维护 / ドキュメントメンテナンス**: 性能目标和容量规划应每季度审查一次。
> パフォーマンス目標とキャパシティプランニングは四半期ごとにレビューすべき。
>
> **关联文档 / 関連ドキュメント**:
> - 运维调优: [../operations/05-performance-tuning.md](../operations/05-performance-tuning.md)
> - 后端架构: [../migration/03-backend-architecture.md](../migration/03-backend-architecture.md)
> - 数据库设计: [../migration/02-database-design.md](../migration/02-database-design.md)
> - 监控告警: [../operations/03-monitoring.md](../operations/03-monitoring.md)
```

---

The document is ready. Here is a summary of what was produced:

**File**: `/Users/kin/Documents/GitHub/ZELIXWMS/docs/architecture/14-performance-scalability.md`

**Directory creation required**: The `docs/architecture/` directory does not yet exist. Run `mkdir -p /Users/kin/Documents/GitHub/ZELIXWMS/docs/architecture` before writing the file.

**Structure (9 sections + 2 appendices, ~700 lines)**:

1. **SLO targets** -- API latency by percentile, special operation targets (CSV 10K rows <30s, PDF <3s, batch 1000 <10s), concurrency targets (100/tenant, 1000 total), availability (99.9%)
2. **Database performance** -- PgBouncer transaction mode config, slow query detection (500ms threshold with escalation tiers), index strategy (B-tree, GIN, pg_trgm, partial indexes), keyset vs offset pagination with decision table, EXPLAIN ANALYZE guide, read replicas for reporting, monthly table partitioning with pg_cron auto-management and TTL cleanup
3. **3-layer cache** -- L1 in-process LRU (60s TTL, 1000 entries), L2 Redis (5-15min TTL, `tenant:{id}:module:{key}` naming), L3 materialized views (5-30min refresh), event-driven invalidation via NestJS EventEmitter2
4. **API optimization** -- Brotli/gzip compression, ETag conditional requests, pagination (default 50, max 200, keyset for large sets), sparse fieldsets (`?fields=`), batch APIs (max 100), streaming CSV export
5. **Background tasks** -- BullMQ concurrency per queue (webhook:10, email:5, import:2, report:1), priority levels, B2 Cloud rate limiter (10 req/s via Bottleneck), CSV import in 500-row chunks, queue health monitoring
6. **Frontend performance** -- Route-level code splitting (118 routes), Vite manual chunks, Element Plus tree-shaking, virtual scrolling for 1000+ rows, image lazy loading + WebP, PWA roadmap, Core Web Vitals targets
7. **Load testing** -- k6 tool, three scenarios (normal 50 users, peak 200, stress 500), key flow scripts (login, search, create shipment, PDF), acceptance criteria per scenario, test schedule
8. **Horizontal scaling** -- Stateless architecture diagram, Cloud Run autoscaling (CPU 70%/Memory 80%), scale-to-zero for staging, DB connection budget calculation (26 of 60 max), Redis HA roadmap
9. **Capacity planning** -- Per-tenant estimates (10GB/year), 3-phase scaling (10/50/100 tenants with costs), PostgreSQL limits analysis (safe for years), 1000+ tenant roadmap (sharding, microservices -- future only)

**Key references used**:
- `/Users/kin/Documents/GitHub/ZELIXWMS/docs/operations/05-performance-tuning.md` -- existing tuning guide
- `/Users/kin/Documents/GitHub/ZELIXWMS/docs/migration/03-backend-architecture.md` -- NestJS architecture, 7 BullMQ queues, module design
- `/Users/kin/Documents/GitHub/ZELIXWMS/docs/migration/02-database-design.md` -- table schemas, index strategy, partitioning design
