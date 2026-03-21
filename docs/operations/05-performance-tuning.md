# 性能调优指南 / パフォーマンスチューニングガイド

> 各层组件的性能优化建议与实践
> 各レイヤーコンポーネントのパフォーマンス最適化の推奨と実践

---

## 1. PostgreSQL 调优 / PostgreSQL チューニング

### 1.1 Supabase 默认配置 / Supabase デフォルト設定

Supabase Pro 计划已优化以下参数，通常无需手动调整。
Supabase Pro プランは以下のパラメータを最適化済み、通常は手動調整不要。

| 参数 / パラメータ | 推荐值 / 推奨値 | 说明 / 説明 |
|---|---|---|
| `shared_buffers` | RAM の 25% | 数据库共享缓存 / データベース共有キャッシュ |
| `effective_cache_size` | RAM の 75% | 查询优化器参考值 / クエリオプティマイザ参考値 |
| `work_mem` | 4-16MB | 排序/哈希操作内存 / ソート/ハッシュ操作メモリ |
| `maintenance_work_mem` | 256MB-1GB | VACUUM/CREATE INDEX 用 |
| `random_page_cost` | 1.1 (SSD) | SSD 上降低此值 / SSD では低い値に |

### 1.2 索引分析 / インデックス分析

**查找未使用的索引 / 未使用インデックスを検索**:
```sql
-- 未使用索引（浪费写入性能）/ 未使用インデックス（書き込み性能の無駄）
SELECT
  schemaname || '.' || relname AS table,
  indexrelname AS index,
  pg_size_pretty(pg_relation_size(i.indexrelid)) AS index_size,
  idx_scan AS times_used
FROM pg_stat_user_indexes i
JOIN pg_index USING (indexrelid)
WHERE idx_scan < 50
  AND NOT indisunique
  AND NOT indisprimary
ORDER BY pg_relation_size(i.indexrelid) DESC;
```

**查找缺失索引 / 欠損インデックスを検索**:
```sql
-- 大表的顺序扫描（可能需要索引）/ 大テーブルのシーケンシャルスキャン（インデックスが必要かも）
SELECT
  schemaname || '.' || relname AS table,
  seq_scan,
  seq_tup_read,
  idx_scan,
  n_live_tup AS row_count
FROM pg_stat_user_tables
WHERE seq_scan > 100
  AND n_live_tup > 10000
ORDER BY seq_tup_read DESC
LIMIT 20;
```

**关键索引建议 / 重要インデックス推奨**:
```sql
-- 所有多租户表必须有 tenant_id 索引 / 全マルチテナントテーブルに tenant_id インデックスが必須
-- 复合索引: (tenant_id, <常用查询字段>) / 複合インデックス: (tenant_id, <よく使うクエリフィールド>)
CREATE INDEX CONCURRENTLY idx_products_tenant_sku
  ON products (tenant_id, sku);
CREATE INDEX CONCURRENTLY idx_orders_tenant_status_date
  ON orders (tenant_id, status, created_at DESC);
```

### 1.3 慢查询分析 / スロークエリ分析

```sql
-- 启用 pg_stat_statements / pg_stat_statements を有効化
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Top 10 最慢查询 / Top 10 最も遅いクエリ
SELECT
  LEFT(query, 100) AS query_preview,
  calls,
  ROUND(mean_exec_time::numeric, 2) AS avg_ms,
  ROUND(total_exec_time::numeric, 2) AS total_ms,
  rows
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- 重置统计（谨慎使用）/ 統計リセット（慎重に使用）
SELECT pg_stat_statements_reset();
```

### 1.4 VACUUM 与 ANALYZE / VACUUM と ANALYZE

```sql
-- 检查需要 VACUUM 的表 / VACUUM が必要なテーブルを確認
SELECT
  schemaname || '.' || relname AS table,
  n_dead_tup,
  n_live_tup,
  ROUND(n_dead_tup::numeric / NULLIF(n_live_tup, 0) * 100, 2) AS dead_pct,
  last_autovacuum,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC;

-- 手动 VACUUM（通常 autovacuum 已够用）/ 手動 VACUUM（通常 autovacuum で十分）
VACUUM ANALYZE products;
```

### 1.5 连接池 / コネクションプーリング

Supabase 提供 pgBouncer（端口 6543）。
Supabase は pgBouncer を提供（ポート 6543）。

```
# 直接连接（用于迁移等）/ 直接接続（マイグレーション等に使用）
postgresql://postgres:xxx@db.xxx.supabase.co:5432/postgres

# 连接池（用于应用）/ コネクションプール（アプリケーション用）
postgresql://postgres:xxx@db.xxx.supabase.co:6543/postgres?pgbouncer=true
```

**建议 / 推奨**:
- 应用连接使用 6543 端口（pooled）/ アプリケーション接続は 6543 ポートを使用
- 迁移和管理操作使用 5432 端口（direct）/ マイグレーションと管理操作は 5432 ポートを使用
- 在 Drizzle 中设置合理的 pool size / Drizzle で適切な pool size を設定

---

## 2. NestJS / Node.js 调优 / NestJS / Node.js チューニング

### 2.1 集群模式与水平扩展 / クラスターモードと水平スケーリング

```bash
# 使用 PM2 集群模式 / PM2 クラスターモードを使用
pm2 start dist/main.js -i max  # CPU 核心数个实例 / CPUコア数のインスタンス

# 或在 Docker 中水平扩展 / または Docker で水平スケーリング
docker compose up --scale api=4
```

### 2.2 内存管理 / メモリ管理

```bash
# 设置 V8 堆内存上限 / V8 ヒープメモリ上限を設定
node --max-old-space-size=1024 dist/main.js  # 1GB

# 生产环境推荐 / 本番環境推奨:
# 轻量操作: 512MB / 軽量操作: 512MB
# 重操作（CSV导入/大量数据处理）: 1024MB / 重い操作（CSVインポート/大量データ処理）: 1024MB
```

### 2.3 Event Loop 监控 / イベントループモニタリング

```typescript
// 添加 Event Loop 延迟监控 / イベントループ遅延モニタリングを追加
import { monitorEventLoopDelay } from 'perf_hooks';

const h = monitorEventLoopDelay({ resolution: 20 });
h.enable();

// 定期报告 / 定期レポート
setInterval(() => {
  console.log({
    eventLoop: {
      min: h.min / 1e6,      // ms
      max: h.max / 1e6,      // ms
      mean: h.mean / 1e6,    // ms
      p99: h.percentile(99) / 1e6, // ms
    }
  });
  h.reset();
}, 60000);
```

**Event Loop 延迟阈值 / イベントループ遅延しきい値**:
- < 10ms: 正常 / 正常
- 10-50ms: 需要关注 / 要注意
- > 50ms: 需要优化 / 最適化が必要
- > 100ms: 紧急 / 緊急

### 2.4 GC 调优 / GC チューニング

```bash
# 启用 GC 日志 / GC ログを有効化
node --trace-gc dist/main.js

# 优化 GC / GC を最適化
node --max-old-space-size=1024 \
     --optimize-for-size \
     dist/main.js
```

---

## 3. Redis 调优 / Redis チューニング

### 3.1 内存策略 / メモリポリシー

```conf
# redis.conf
maxmemory 256mb
maxmemory-policy allkeys-lru  # 推荐: 所有键LRU淘汰 / 推奨: 全キーLRU削除

# 其他策略选项 / その他のポリシーオプション:
# volatile-lru: 只淘汰有TTL的键 / TTL付きキーのみ削除
# allkeys-random: 随机淘汰 / ランダム削除
# noeviction: 不淘汰（内存满时返回错误）/ 削除なし（メモリフル時エラーを返す）
```

### 3.2 连接池 / コネクションプーリング

```typescript
// BullMQ / ioredis 连接池配置 / コネクションプール設定
const redisOptions = {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  // 连接池 / コネクションプール
  lazyConnect: true,
  // 自动重连 / 自動再接続
  retryStrategy: (times: number) => Math.min(times * 50, 2000),
};
```

### 3.3 监控命令 / モニタリングコマンド

```bash
# 内存使用 / メモリ使用状況
redis-cli INFO memory

# 命中率 / ヒット率
redis-cli INFO stats | grep keyspace

# 慢日志 / スローログ
redis-cli SLOWLOG GET 10

# 连接数 / 接続数
redis-cli INFO clients
```

---

## 4. 前端性能 / フロントエンドパフォーマンス

### 4.1 已完成的优化 / 完了済みの最適化

以下优化已在项目中实现。
以下の最適化はプロジェクトで実装済み。

- **Element Plus Tree-shaking**: 按需引入组件 / オンデマンドコンポーネントインポート
- **路由懒加载 / ルートレイジーローディング**: 各页面按需加载 / 各ページをオンデマンドロード

### 4.2 待优化项 / 今後の最適化項目

**图片优化 / 画像最適化**:
```html
<!-- WebP 格式 + 懒加载 / WebP フォーマット + レイジーローディング -->
<img
  v-lazy="imageUrl"
  loading="lazy"
  decoding="async"
  alt="product image"
/>
```

**CDN 配置 / CDN 設定**:
```javascript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // 分割大库 / 大きなライブラリを分割
        manualChunks: {
          'element-plus': ['element-plus'],
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
          'chart': ['echarts'],
        },
      },
    },
  },
});
```

**静态资源缓存 / 静的アセットキャッシュ**:
```nginx
# nginx.conf
location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

location /index.html {
    expires -1;
    add_header Cache-Control "no-cache";
}
```

### 4.3 性能指标目标 / パフォーマンス指標目標

| 指标 / 指標 | 目标 / 目標 | 测量方式 / 測定方法 |
|---|---|---|
| LCP (Largest Contentful Paint) | < 2.5s | Lighthouse |
| FID (First Input Delay) | < 100ms | Lighthouse |
| CLS (Cumulative Layout Shift) | < 0.1 | Lighthouse |
| Bundle 大小 / バンドルサイズ | < 500KB (gzip) | `npm run build` |
| API 首次响应 / API 初回レスポンス | < 200ms | Network tab |

---

## 5. 性能监控 / パフォーマンスモニタリング

### 5.1 关键指标 / 重要指標

```sql
-- 数据库性能概览 / データベースパフォーマンス概要
SELECT
  numbackends AS connections,
  xact_commit AS commits,
  xact_rollback AS rollbacks,
  blks_read AS disk_reads,
  blks_hit AS cache_hits,
  ROUND(blks_hit::numeric / NULLIF(blks_read + blks_hit, 0) * 100, 2) AS cache_hit_ratio
FROM pg_stat_database
WHERE datname = current_database();
```

### 5.2 性能基线 / パフォーマンスベースライン

定期记录以下指标作为基线。
定期的に以下の指標をベースラインとして記録する。

| 指标 / 指標 | 健康值 / 健全値 | 警告值 / 警告値 | 危险值 / 危険値 |
|---|---|---|---|
| DB cache hit ratio | > 99% | < 95% | < 90% |
| API p95 延迟 / レイテンシ | < 200ms | > 500ms | > 1000ms |
| Event loop 延迟 / 遅延 | < 10ms | > 50ms | > 100ms |
| Redis 内存使用 / メモリ使用 | < 60% | > 80% | > 90% |
| DB 连接使用 / 接続使用 | < 50% | > 80% | > 90% |
