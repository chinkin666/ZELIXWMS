# 運用ランブック / 运维手册

> ZELIXWMS の日常運用・障害対応・データベース管理の手順書。
> ZELIXWMS 日常运维、故障处理、数据库管理的操作手册。

---

## 1. 日常運用 / 日常运维

### データベースバックアップ / 数据库备份

```bash
# BSON ダンプ（local-db/dump/ に出力） / BSON 导出
npm run db:dump

# Docker 環境 / Docker 环境
docker compose exec backend npm run db:dump
```

**出力先 / 输出目录**: `local-db/dump/`
- 各コレクション `.bson` + `.metadata.json`（インデックス情報）
- 每个集合的 `.bson` + `.metadata.json`（索引信息）

### データベースリストア / 数据库恢复

```bash
# local-db/dump/ から復元（既存データは上書き） / 从 dump 恢复（覆盖现有数据）
npm run db:restore

# Docker 環境
docker compose exec backend npm run db:restore
```

**注意 / 注意**: リストアは既存コレクションを `drop` してから挿入する。
恢复时会先 `drop` 现有集合再插入数据。

### シードデータ投入 / 导入种子数据

```bash
# 基本シードデータ（配送業者、マッピング、帳票テンプレート） / 基础种子数据
npm run seed

# B2 Cloud マッピング専用 / B2 Cloud 映射专用
cd backend && npm run seed:b2-mapping
```

シードデータの投入順序（依存関係あり） / 种子数据导入顺序（有依赖关系）：
1. `seedCarriers` - 配送業者 / 运输商
2. `seedMappingConfigs` - マッピング設定 / 映射配置
3. `seedPrintTemplates` - 帳票テンプレート / 单据模板
4. `seedFormTemplates` - フォームテンプレート / 表单模板
5. `seedInboundPrintTemplates` - 入庫帳票テンプレート / 入库单据模板

### データベースクリア / 清空数据库

```bash
# 全コレクション削除（開発環境のみ！） / 清空所有集合（仅开发环境！）
cd backend && npm run db:clear
```

**危険 / 危险**: 本番環境では絶対に実行しない / 绝对不要在生产环境执行！

### ログ確認 / 查看日志

```bash
# Docker ログ（リアルタイム） / Docker 日志（实时）
docker compose logs -f backend

# 直近 5 分間のログ / 最近 5 分钟日志
docker compose logs -f backend --since 5m

# 特定のエラーを検索 / 搜索特定错误
docker compose logs backend | grep '"level":50'  # error 以上

# ヘルスチェック / 健康检查
curl -s http://localhost:4000/health | jq .
```

---

## 2. 障害対応 / 故障处理

### MongoDB ダウン / MongoDB 宕机

**症状 / 症状**:
- `/health` が 503 を返す（`database.status: "disconnected"`）
- バックエンドログに接続エラー / 后端日志出现连接错误

**対応手順 / 处理步骤**:

```bash
# 1. MongoDB コンテナ確認 / 确认 MongoDB 容器状态
docker compose ps mongo

# 2. MongoDB ログ確認 / 查看 MongoDB 日志
docker compose logs --tail 50 mongo

# 3. 再起動 / 重启
docker compose restart mongo

# 4. バックエンドがリコネクトするか確認 / 确认后端是否重连
curl -s http://localhost:4000/health | jq '.services.database'

# 5. ダメな場合はボリューム確認 / 如果不行检查数据卷
docker volume inspect zelixwms_mongo-data
```

**ディスク容量不足の場合 / 磁盘空间不足时**:

```bash
# MongoDB データサイズ確認
docker compose exec mongo mongosh --eval "db.stats()"

# 不要なログを手動削除（TTL 待てない場合）
docker compose exec mongo mongosh --eval "
  db.api_logs.deleteMany({ createdAt: { \$lt: new Date(Date.now() - 30*24*60*60*1000) } })
"
```

### Redis ダウン / Redis 宕机

**症状 / 症状**:
- `/health` の `redis.status: "unavailable"`
- キュージョブが処理されない / 队列任务未处理
- Webhook 配信が止まる / Webhook 投递停止

**対応手順 / 处理步骤**:

```bash
# 1. Redis コンテナ確認
docker compose ps redis

# 2. Redis ログ確認
docker compose logs --tail 50 redis

# 3. 再起動
docker compose restart redis

# 4. 接続確認
docker compose exec redis redis-cli ping
# 期待: PONG

# 5. メモリ使用量確認
docker compose exec redis redis-cli info memory
```

**注意 / 注意**: Redis がダウンしてもバックエンドは起動・動作する（キュー機能のみ無効）。
Redis 宕机后后端仍可启动运行（仅队列功能不可用）。

### B2 Cloud エラー / B2 Cloud 错误

**症状 / 症状**:
- API ログに `status: "error"` のレコード
- 出荷連携が失敗 / 发货对接失败

**対応手順 / 处理步骤**:

```bash
# 1. API ログで詳細確認（Admin UI または MongoDB）
# Admin ダッシュボード → API ログ画面

# 2. 'entry' エラーの場合 → セッション切れ（自動リトライ済み）
# 'entry' 错误 → 会话过期（已自动重试）

# 3. 認証情報の確認
# B2 Cloud のログイン情報が有効か確認

# 4. B2 Cloud サービス自体のステータス確認
# 検証サーバー: https://test.delivery.b2-cloud.net
```

**重要 / 重要**: `yamatoB2Service.ts` のコアロジックは変更禁止（CLAUDE.md 参照）。
`yamatoB2Service.ts` 的核心逻辑禁止修改（参照 CLAUDE.md）。

---

## 3. データベース操作 / 数据库操作

### ダンプ / 导出

```bash
# 全コレクション BSON ダンプ
npm run db:dump
# 出力: local-db/dump/<collection>.bson + <collection>.metadata.json
```

### リストア / 恢复

```bash
# local-db/dump/ からリストア（全コレクション上書き）
npm run db:restore
```

### インデックス再構築 / 重建索引

```bash
# MongoDB シェルでインデックス再構築
docker compose exec mongo mongosh nexand-shipment --eval "
  db.getCollectionNames().forEach(function(c) {
    print('Rebuilding indexes for: ' + c);
    db[c].reIndex();
  });
"
```

### コレクション統計 / 集合统计

```bash
docker compose exec mongo mongosh nexand-shipment --eval "
  db.getCollectionNames().forEach(function(c) {
    var stats = db[c].stats();
    print(c + ': ' + stats.count + ' docs, ' + (stats.size/1024/1024).toFixed(2) + ' MB');
  });
"
```

---

## 4. キュー管理 / 队列管理

### キュー一覧 / 队列列表

| キュー名 | 用途 / 用途 |
|---|---|
| `wms-webhook` | Webhook 配信（最大 3 回リトライ）/ Webhook 投递（最多重试 3 次） |
| `wms-script` | 自動化スクリプト実行 / 自动化脚本执行 |
| `wms-audit` | 監査ログ非同期書き込み / 审计日志异步写入 |

### ステータス確認 / 状态确认

```bash
# ヘルスチェック経由で確認 / 通过健康检查确认
curl -s http://localhost:4000/health | jq '.queues'
```

### スタックジョブの確認 / 检查卡住的任务

```bash
# Redis で直接確認 / 直接在 Redis 中确认
docker compose exec redis redis-cli

# アクティブジョブ数
LLEN bull:wms-webhook:active

# 待機ジョブ数
LLEN bull:wms-webhook:wait

# 失敗ジョブ数
ZCARD bull:wms-webhook:failed
```

### 失敗ジョブの再処理 / 重新处理失败任务

```bash
# Redis からジョブ状態をリセット（BullMQ の内部構造に注意）
# 推奨: Admin UI または専用スクリプトで対応

# 全失敗ジョブをクリア
docker compose exec redis redis-cli DEL bull:wms-webhook:failed
```

---

## 5. ユーザー管理 / 用户管理

### ユーザー作成 / 创建用户

Admin ダッシュボード（`:3001` / `:3003`）からユーザーを作成。
通过管理后台创建用户。

必要情報 / 必要信息:
- メールアドレス / 邮箱
- パスワード / 密码
- ロール / 角色: `admin`, `manager`, `operator`, `viewer`
- テナント割り当て / 租户分配

### パスワードリセット / 重置密码

```bash
# MongoDB で直接リセット（緊急時のみ） / 直接在 MongoDB 中重置（仅紧急情况）
docker compose exec mongo mongosh nexand-shipment --eval "
  // bcrypt ハッシュを事前に生成して設定
  // 通常は Admin UI から操作すること / 通常应从管理后台操作
  db.users.updateOne(
    { email: 'user@example.com' },
    { \$set: { password: '<bcrypt-hash>' } }
  )
"
```

### ロール変更 / 更改角色

```bash
# Admin UI から操作（推奨） / 从管理后台操作（推荐）

# 緊急時 MongoDB 直接操作 / 紧急时直接操作 MongoDB
docker compose exec mongo mongosh nexand-shipment --eval "
  db.users.updateOne(
    { email: 'user@example.com' },
    { \$set: { role: 'admin' } }
  )
"
```

---

## 6. 倉庫追加手順 / 添加仓库步骤

### 1. 倉庫マスタ登録 / 注册仓库主数据

Admin ダッシュボード → 倉庫管理 → 新規作成
管理后台 → 仓库管理 → 新建

必要情報 / 必要信息:
- 倉庫コード / 仓库编码（一意 / 唯一）
- 倉庫名 / 仓库名称
- 住所 / 地址
- テナント / 租户

### 2. ロケーション設定 / 设置库位

倉庫作成後、ロケーション（棚）を登録。
仓库创建后，注册库位（货架）。

```
ロケーションコード例 / 库位编码示例:
A-01-01  (エリア-列-段 / 区域-列-层)
B-02-03
STAGING-01  (ステージングエリア / 暂存区)
```

### 3. オペレーター割り当て / 分配操作员

倉庫に操作権限を持つユーザーを割り当て。
将具有操作权限的用户分配到仓库。

---

## 7. 配送業者追加 / 添加运输商

### 1. キャリアマスタ登録 / 注册运输商主数据

Admin ダッシュボード → 配送業者管理 → 新規作成
管理后台 → 运输商管理 → 新建

必要情報 / 必要信息:
- キャリアコード / 运输商编码（例: `yamato`, `sagawa`, `jppost`）
- キャリア名 / 运输商名称
- 有効/無効 / 启用/禁用

### 2. マッピング設定 / 映射配置

配送業者の API フォーマットとシステムフィールドの対応関係を設定。
设置运输商 API 格式与系统字段的对应关系。

```bash
# シードデータにマッピング追加 / 在种子数据中添加映射
# backend/src/scripts/seeds/seedMappingConfigs.ts を参照
```

### 3. 自動化設定 / 自动化配置

- Webhook 配信先 URL / Webhook 投递 URL
- 自動処理ルール（ruleEngine）/ 自动处理规则
- 帳票テンプレート / 单据模板

---

## 8. よくあるトラブルシューティング / 常见问题排查

### バックエンドが起動しない / 后端无法启动

| 原因 / 原因 | 確認方法 / 确认方式 | 対処 / 处理 |
|---|---|---|
| MongoDB 未接続 | `docker compose ps mongo` | MongoDB コンテナを起動 |
| 環境変数不足 | 起動ログの `[env]` エラー | `.env` ファイルを確認 |
| ポート競合 | `lsof -i :4000` | 競合プロセスを停止 |
| node_modules 不整合 | `npm ci` でエラー | `rm -rf node_modules && npm install` |

### フロントエンドが API に接続できない / 前端无法连接 API

| 原因 | 確認方法 | 対処 |
|---|---|---|
| CORS エラー | ブラウザコンソール | `CORS_ORIGINS` 環境変数を確認 |
| バックエンド未起動 | `curl localhost:4000/health` | バックエンドを起動 |
| API プレフィックス不一致 | ネットワークタブで URL 確認 | `VITE_BACKEND_API_PREFIX` を確認 |

### Docker ビルドが失敗する / Docker 构建失败

```bash
# キャッシュをクリアして再ビルド / 清除缓存重新构建
docker compose build --no-cache

# 特定サービスのみ再ビルド / 仅重新构建特定服务
docker compose build --no-cache backend
```

### メモリ不足 / 内存不足

```bash
# コンテナ別メモリ使用量確認 / 确认各容器内存使用量
docker stats

# backend が 512MB 超えている場合 / 后端超过 512MB
# → メモリリークの可能性、再起動で一時的に解消
docker compose restart backend
```

### セッション切れ（B2 Cloud） / 会话过期（B2 Cloud）

**症状**: API ログに `'entry'` エラー
**原因**: B2 Cloud のセッションが期限切れ
**対処**: 自動リトライが実装済み（`authenticatedFetch`）。持続する場合は B2 Cloud の認証情報を確認。

自动重试已实装（`authenticatedFetch`）。如果持续出错，请确认 B2 Cloud 认证信息。

### レートリミット到達 / 达到速率限制

**症状**: HTTP 429 レスポンス
**対処**: `backend/src/api/middleware/rateLimit.ts` の設定を確認。正当なトラフィックの場合はリミットを引き上げ。

确认 `rateLimit.ts` 配置。如果是正常流量，可以提高限制值。

---

## 参考ファイル / 参考文件

| ファイル | 説明 |
|---|---|
| `backend/src/scripts/seed.ts` | シードデータ実行 / 种子数据执行 |
| `backend/src/scripts/dumpDb.ts` | DB ダンプスクリプト / 数据库导出脚本 |
| `backend/src/scripts/restoreDb.ts` | DB リストアスクリプト / 数据库恢复脚本 |
| `backend/src/scripts/clearDb.ts` | DB クリアスクリプト / 数据库清空脚本 |
| `backend/src/core/queue/queueManager.ts` | キューマネージャー / 队列管理器 |
| `backend/src/services/notificationService.ts` | 通知サービス / 通知服务 |
| `backend/src/api/middleware/rateLimit.ts` | レートリミット設定 / 速率限制配置 |
