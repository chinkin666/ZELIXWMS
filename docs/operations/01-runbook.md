# 運用ランブック / 运维手册

> ZELIXWMS の日常運用・定期メンテナンス・障害対応・バックアップの包括的な運用マニュアル（NestJS + PostgreSQL + Supabase 新アーキテクチャ）。
> ZELIXWMS 日常运维、定期维护、故障处理、备份的综合运维手册（NestJS + PostgreSQL + Supabase 新架构）。

---

## 1. 日常運用チェックリスト / 日常运维检查清单

### 毎日実施 / 每日执行

- [ ] ヘルスエンドポイント確認 / 确认健康端点
  ```bash
  curl -s https://zelix-wms.com/health | jq '.status'
  # 期待値: "ok" / 期望值: "ok"
  ```
- [ ] エラーログ確認 / 检查错误日志
  ```bash
  docker compose logs backend --since 24h | jq 'select(.level >= 50)' | head -20
  ```
- [ ] キュー処理状況確認 / 确认队列处理状况
  ```bash
  curl -s https://zelix-wms.com/health | jq '.queues'
  # failed が増加していないか確認 / 确认 failed 是否在增加
  ```
- [ ] DB 接続プール状況 / DB 连接池状况
  ```bash
  curl -s https://zelix-wms.com/health | jq '.services.postgres'
  # activeConnections が poolSize の 80% 未満か確認 / 确认活跃连接不超过池大小的 80%
  ```

### 毎週実施 / 每周执行

- [ ] PostgreSQL VACUUM / ANALYZE
  ```bash
  # Supabase の場合は自動実行されるが、手動実行も可 / Supabase 自动执行，也可手动执行
  docker compose exec postgres psql -U zelixwms -c "VACUUM ANALYZE;"
  ```
- [ ] スロークエリログ確認 / 检查慢查询日志
  ```bash
  # Supabase Dashboard → SQL Editor で確認 / 在 Supabase Dashboard 中确认
  SELECT query, calls, mean_exec_time, total_exec_time
  FROM pg_stat_statements
  ORDER BY mean_exec_time DESC
  LIMIT 20;
  ```
- [ ] ディスク使用量確認 / 检查磁盘使用量
  ```bash
  docker system df
  docker compose exec postgres psql -U zelixwms -c "SELECT pg_size_pretty(pg_database_size('zelixwms'));"
  ```
- [ ] Redis メモリ使用量確認 / 检查 Redis 内存使用量
  ```bash
  docker compose exec redis redis-cli info memory | grep used_memory_human
  ```
- [ ] 失敗ジョブ数の確認とクリーンアップ / 确认失败任务数并清理
  ```bash
  curl -s https://zelix-wms.com/health | jq '[.queues[] | .failed] | add'
  ```

### 毎月実施 / 每月执行

- [ ] API キーのローテーション / 轮换 API 密钥
  - JWT_SECRET（影響範囲を確認してから実施 / 确认影响范围后执行）
  - 外部サービス API キー / 外部服务 API 密钥
- [ ] アクセスログレビュー / 审查访问日志
  - 不審なアクセスパターンがないか確認 / 确认是否有可疑访问模式
  - 不要なユーザーアカウントの無効化 / 禁用不必要的用户账户
- [ ] 依存パッケージ更新 / 更新依赖包
  ```bash
  npm audit
  npm outdated
  ```
- [ ] バックアップリストアテスト / 备份恢复测试
  - テスト環境でバックアップからリストアして動作確認 / 在测试环境中从备份恢复并确认运行

---

## 2. インシデント対応 / 事件响应

### 重要度レベル / 严重度级别

| レベル / 级别 | 定義 / 定义 | 対応時間 / 响应时间 | 例 / 示例 |
|---|---|---|---|
| **P1 - Critical** | サービス完全停止 / 服务完全停止 | 15 分以内 / 15 分钟内 | DB ダウン、API 全エラー / DB 宕机、API 全错误 |
| **P2 - High** | 主要機能が利用不可 / 主要功能不可用 | 1 時間以内 / 1 小时内 | 出荷処理不可、認証障害 / 无法出库、认证故障 |
| **P3 - Medium** | 一部機能に影響 / 部分功能受影响 | 4 時間以内 / 4 小时内 | キュー遅延、メール送信失敗 / 队列延迟、邮件发送失败 |
| **P4 - Low** | 軽微な問題 / 轻微问题 | 24 時間以内 / 24 小时内 | UI 表示崩れ、ログ欠損 / UI 显示异常、日志缺失 |

### エスカレーションマトリクス / 升级矩阵

| 経過時間 / 经过时间 | P1 | P2 | P3 |
|---|---|---|---|
| 0 分 | オンコールエンジニア / 值班工程师 | オンコールエンジニア | チケット作成 / 创建工单 |
| 15 分 | チームリーダー / 团队负责人 | - | - |
| 30 分 | エンジニアリングマネージャー / 工程经理 | チームリーダー | - |
| 1 時間 | CTO | エンジニアリングマネージャー | オンコールエンジニア |

### インシデント通知テンプレート / 事件通知模板

```
【ZELIXWMS 障害通知 / 故障通知】
重要度 / 严重度: P[1-4]
発生日時 / 发生时间: YYYY-MM-DD HH:MM (JST)
影響範囲 / 影响范围: [影響を受ける機能 / 受影响功能]
現在の状況 / 当前状况: [調査中 / 对応中 / 復旧済み | 调查中 / 处理中 / 已恢复]
担当者 / 负责人: [名前 / 姓名]
次回更新 / 下次更新: [予定時刻 / 预定时间]
```

---

## 3. よくあるインシデントと対応 / 常见事件和处理

### 3.1 バックエンドが応答しない / 后端无响应

**症状 / 症状**: `/health` がタイムアウト or 接続拒否 / 超时或连接被拒

```bash
# 1. コンテナ状態確認 / 确认容器状态
docker compose ps backend

# 2. ヘルスチェック / 健康检查
curl -s http://localhost:4000/health | jq .

# 3. ログでエラー確認 / 在日志中确认错误
docker compose logs --tail 100 backend

# 4. コンテナ再起動 / 重启容器
docker compose restart backend

# 5. それでもダメなら DB 接続確認 / 如果仍然不行，确认 DB 连接
docker compose exec postgres psql -U zelixwms -c "SELECT 1;"

# 6. 全サービス再起動（最終手段）/ 重启所有服务（最后手段）
docker compose down && docker compose up -d
```

### 3.2 API レスポンスが遅い / API 响应缓慢

**症状 / 症状**: p95 > 500ms

```bash
# 1. スロークエリの確認 / 确认慢查询
docker compose exec postgres psql -U zelixwms -c "
  SELECT query, calls, mean_exec_time
  FROM pg_stat_statements
  ORDER BY mean_exec_time DESC
  LIMIT 10;
"

# 2. DB 接続プール確認 / 确认 DB 连接池
curl -s http://localhost:4000/health | jq '.services.postgres'

# 3. Redis 状態確認 / 确认 Redis 状态
docker compose exec redis redis-cli info stats | grep instantaneous_ops_per_sec

# 4. コネクションプールが枯渇している場合 / 连接池耗尽时
# → pgBouncer の導入または pool_max の引き上げを検討
# → 考虑引入 pgBouncer 或增加 pool_max
```

### 3.3 キューが滞留している / 队列积压

**症状 / 症状**: waiting ジョブ > 100

```bash
# 1. キュー状況確認 / 确认队列状况
curl -s http://localhost:4000/health | jq '.queues'

# 2. ワーカープロセスの状態確認 / 确认 Worker 进程状态
docker compose logs --tail 50 backend | jq 'select(.msg | contains("queue"))'

# 3. 失敗ジョブの確認（ポイズンメッセージがないか）/ 确认失败任务（是否有毒消息）
docker compose exec redis redis-cli ZRANGE bull:wms-webhook:failed 0 5

# 4. バックエンド再起動でワーカー再接続 / 重启后端重新连接 Worker
docker compose restart backend

# 5. ワーカーのスケールアウト / Worker 扩缩
docker compose up -d --scale backend=3
```

### 3.4 データベースのディスク容量不足 / 数据库磁盘空间不足

**症状 / 症状**: DB 書き込みエラー、ディスク使用率 > 90%

```bash
# 1. テーブルサイズ確認 / 确认表大小
docker compose exec postgres psql -U zelixwms -c "
  SELECT relname, pg_size_pretty(pg_total_relation_size(relid))
  FROM pg_catalog.pg_statio_user_tables
  ORDER BY pg_total_relation_size(relid) DESC
  LIMIT 10;
"

# 2. VACUUM FULL で領域回収 / 回收空间
docker compose exec postgres psql -U zelixwms -c "VACUUM FULL;"

# 3. 古いログデータのアーカイブと削除 / 归档并删除旧日志数据
docker compose exec postgres psql -U zelixwms -c "
  DELETE FROM api_logs WHERE created_at < NOW() - INTERVAL '90 days';
  DELETE FROM operation_logs WHERE created_at < NOW() - INTERVAL '90 days';
"

# 4. ストレージ増設（Supabase の場合は Plan アップグレード）
# 增加存储（Supabase 需要升级计划）

# 5. MongoDB（移行期間中の場合）/ MongoDB（迁移期间）
docker compose exec mongo mongosh nexand-shipment --eval "
  db.api_logs.deleteMany({ createdAt: { \$lt: new Date(Date.now() - 30*24*60*60*1000) } })
"
```

### 3.5 認証障害 / 认证故障

**症状 / 症状**: ログインできない、401 エラーが頻発 / 无法登录、频繁出现 401 错误

```bash
# 1. Supabase のステータス確認 / 确认 Supabase 状态
# https://status.supabase.com/

# 2. JWT_SECRET の確認 / 确认 JWT_SECRET
# 環境変数が正しく設定されているか / 环境变量是否正确设置

# 3. トークン有効期限の確認 / 确认 Token 有效期
# JWT_EXPIRES_IN の値が適切か / JWT_EXPIRES_IN 的值是否合适

# 4. Redis セッションキャッシュの確認 / 确认 Redis 会话缓存
docker compose exec redis redis-cli DBSIZE

# 5. CORS 設定の確認 / 确认 CORS 设置
# CORS_ORIGINS に正しいドメインが含まれているか
# CORS_ORIGINS 中是否包含正确的域名
```

### 3.6 B2 Cloud エラー / B2 Cloud 错误

**症状 / 症状**: 出荷連携失敗 / 发货对接失败

```bash
# 1. API ログで詳細確認 / 在 API 日志中确认详情
# Admin ダッシュボード → API ログ画面

# 2. 'entry' エラー → セッション切れ（自動リトライ済み）
# 'entry' 错误 → 会话过期（已自动重试）

# 3. B2 Cloud サービス自体のステータス確認
# 检查 B2 Cloud 服务本身的状态
```

**重要 / 重要**: `yamatoB2Service.ts` のコアロジックは変更禁止（CLAUDE.md 参照）。
`yamatoB2Service.ts` 的核心逻辑禁止修改（参照 CLAUDE.md）。

---

## 4. バックアップとリストア / 备份与恢复

### PostgreSQL バックアップ / PostgreSQL 备份

#### 自動バックアップ（pg_dump スケジュール）/ 自动备份（pg_dump 定时）

```bash
# crontab 設定 / 设置 crontab
# 毎日 3:00 AM にフルバックアップ / 每天凌晨 3 点全量备份
0 3 * * * docker compose exec -T postgres pg_dump -U zelixwms -Fc zelixwms > /backups/zelixwms_$(date +\%Y\%m\%d).dump

# 7 日以上前のバックアップを削除 / 删除 7 天前的备份
0 4 * * * find /backups -name "zelixwms_*.dump" -mtime +7 -delete
```

#### 手動バックアップ / 手动备份

```bash
# カスタムフォーマット（圧縮、最速リストア）/ 自定义格式（压缩、最快恢复）
docker compose exec -T postgres pg_dump -U zelixwms -Fc zelixwms > backup.dump

# SQL フォーマット（可読性重視）/ SQL 格式（重视可读性）
docker compose exec -T postgres pg_dump -U zelixwms zelixwms > backup.sql
```

#### リストア / 恢复

```bash
# カスタムフォーマットからリストア / 从自定义格式恢复
docker compose exec -T postgres pg_restore -U zelixwms -d zelixwms --clean backup.dump

# SQL フォーマットからリストア / 从 SQL 格式恢复
docker compose exec -T postgres psql -U zelixwms -d zelixwms < backup.sql
```

### Supabase のバックアップ / Supabase 备份

Supabase Pro プランでは以下が利用可能 / Supabase Pro 计划提供以下功能:

| 機能 / 功能 | 説明 / 说明 |
|---|---|
| 自動日次バックアップ / 自动每日备份 | 7 日間保持 / 保留 7 天 |
| ポイントインタイムリカバリ (PITR) | 任意の時点に復元可能 / 可恢复到任意时间点 |
| 手動バックアップ | Dashboard → Database → Backups |

### MongoDB バックアップ（移行期間）/ MongoDB 备份（迁移期间）

```bash
# BSON ダンプ / BSON 导出
docker compose exec backend npm run db:dump
# 出力先: local-db/dump/

# リストア / 恢复
docker compose exec backend npm run db:restore
```

---

## 5. データベースメンテナンス / 数据库维护

### VACUUM（不要領域の回収）/ VACUUM（回收无用空间）

```bash
# 通常 VACUUM（ロック不要、推奨）/ 普通 VACUUM（无需锁定，推荐）
docker compose exec postgres psql -U zelixwms -c "VACUUM ANALYZE;"

# VACUUM FULL（テーブルロックあり、大幅な領域回収）/ FULL VACUUM（有表锁、大幅回收空间）
# 注意: メンテナンスウィンドウで実行 / 注意: 在维护窗口执行
docker compose exec postgres psql -U zelixwms -c "VACUUM FULL ANALYZE;"
```

### ANALYZE（統計情報更新）/ ANALYZE（更新统计信息）

```bash
# 全テーブルの統計更新 / 更新所有表的统计信息
docker compose exec postgres psql -U zelixwms -c "ANALYZE;"

# 特定テーブルのみ / 仅特定表
docker compose exec postgres psql -U zelixwms -c "ANALYZE products;"
```

### REINDEX（インデックス再構築）/ REINDEX（重建索引）

```bash
# データベース全体のインデックス再構築 / 重建整个数据库的索引
docker compose exec postgres psql -U zelixwms -c "REINDEX DATABASE zelixwms;"

# 特定テーブルのみ / 仅特定表
docker compose exec postgres psql -U zelixwms -c "REINDEX TABLE products;"

# 同時実行可能（PostgreSQL 12+）/ 可并发执行
docker compose exec postgres psql -U zelixwms -c "REINDEX TABLE CONCURRENTLY products;"
```

### パーティション管理 / 分区管理

大量ログデータは日次/月次パーティションで管理。
大量日志数据使用日/月分区管理。

```sql
-- 月次パーティション作成例 / 创建月分区示例
CREATE TABLE operation_logs_2026_03 PARTITION OF operation_logs
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

-- 古いパーティションの削除 / 删除旧分区
DROP TABLE operation_logs_2025_01;
```

### テーブル統計確認 / 确认表统计

```bash
docker compose exec postgres psql -U zelixwms -c "
  SELECT
    schemaname,
    relname AS table_name,
    n_live_tup AS live_rows,
    n_dead_tup AS dead_rows,
    last_vacuum,
    last_analyze
  FROM pg_stat_user_tables
  ORDER BY n_dead_tup DESC
  LIMIT 10;
"
```

---

## 6. キュー管理 / 队列管理

### キュー一覧 / 队列列表

| キュー名 / 队列名 | 用途 / 用途 | リトライ / 重试 |
|---|---|---|
| `wms-webhook` | Webhook 配信 / Webhook 投递 | 最大 3 回 / 最多 3 次 |
| `wms-script` | 自動化スクリプト実行 / 自动化脚本执行 | 最大 2 回 |
| `wms-audit` | 監査ログ非同期書き込み / 审计日志异步写入 | 最大 5 回 |

### ステータス確認 / 状态确认

```bash
# ヘルスチェック経由 / 通过健康检查
curl -s http://localhost:4000/health | jq '.queues'

# Redis で直接確認 / 直接在 Redis 中确认
docker compose exec redis redis-cli
LLEN bull:wms-webhook:active
LLEN bull:wms-webhook:wait
ZCARD bull:wms-webhook:failed
```

### 失敗ジョブの処理 / 处理失败任务

```bash
# 失敗ジョブの詳細確認 / 确认失败任务详情
docker compose exec redis redis-cli ZRANGE bull:wms-webhook:failed 0 5

# 全失敗ジョブをクリア / 清除所有失败任务
docker compose exec redis redis-cli DEL bull:wms-webhook:failed
```

---

## 7. ユーザー管理 / 用户管理

### ユーザー作成 / 创建用户

Admin ダッシュボードからユーザーを作成。
通过管理后台创建用户。

必要情報 / 必要信息:
- メールアドレス / 邮箱
- パスワード / 密码
- ロール / 角色: `admin`, `manager`, `operator`, `viewer`
- テナント割り当て / 租户分配

### パスワードリセット / 重置密码

```bash
# Admin UI から操作（推奨） / 从管理后台操作（推荐）
# 緊急時は DB 直接操作 / 紧急时直接操作 DB
```

---

## 8. よくあるトラブルシューティング / 常见问题排查

| 症状 / 症状 | 確認方法 / 确认方式 | 対処 / 处理 |
|---|---|---|
| バックエンドが起動しない / 后端无法启动 | `docker compose logs backend` | DB 接続・環境変数を確認 / 确认 DB 连接和环境变量 |
| フロントエンドが API に接続できない / 前端无法连接 API | ブラウザコンソール | CORS_ORIGINS を確認 / 确认 CORS_ORIGINS |
| マイグレーション失敗 / 迁移失败 | `npm run migration:run` の出力 | DB スキーマの状態を確認 / 确认 DB Schema 状态 |
| Docker ビルド失敗 / Docker 构建失败 | `docker compose build --no-cache` | キャッシュクリアして再ビルド / 清除缓存重新构建 |
| メモリ不足 / 内存不足 | `docker stats` | コンテナ再起動、メモリリーク調査 / 重启容器、调查内存泄漏 |
| セッション切れ（B2 Cloud）/ 会话过期 | API ログに 'entry' エラー | 自動リトライ済み、持続する場合は認証情報確認 / 已自动重试 |

---

## 参考ファイル / 参考文件

| ファイル / 文件 | 説明 / 说明 |
|---|---|
| `backend/src/health/` | ヘルスチェックモジュール / 健康检查模块 |
| `backend/drizzle.config.ts` | Drizzle ORM 設定 / Drizzle ORM 配置 |
| `backend/src/db/migrations/` | DB マイグレーションファイル / 数据库迁移文件 |
| `backend/src/scripts/seed.ts` | シードデータ実行 / 种子数据执行 |
| `backend/src/core/queue/` | キューマネージャー / 队列管理器 |
| `docker-compose.yml` | Docker 構成 / Docker 配置 |
| `docker-compose.prod.yml` | 本番 Docker 構成 / 生产 Docker 配置 |
