# 故障排查指南 / トラブルシューティングガイド

> 常见问题的诊断与解决方法
> よくある問題の診断と解決方法

---

## 目录 / 目次

1. [API 返回 500](#1-api-返回-500--api-が-500-を返す)
2. [API 返回 401](#2-api-返回-401--api-が-401-を返す)
3. [API 返回 403](#3-api-返回-403--api-が-403-を返す)
4. [数据库连接错误](#4-数据库连接错误--データベース接続エラー)
5. [慢查询](#5-慢查询--スロークエリ)
6. [队列未处理](#6-队列未处理--キューが処理されない)
7. [前端白屏](#7-前端白屏--フロントエンド白画面)
8. [文件上传失败](#8-文件上传失败--ファイルアップロード失敗)
9. [B2 Cloud 集成错误](#9-b2-cloud-集成错误--b2-cloud-連携エラー)
10. [租户数据泄漏](#10-租户数据泄漏--テナントデータ漏洩)

---

## 1. API 返回 500 / API が 500 を返す

### 症状 / 症状
API 请求返回 HTTP 500 Internal Server Error。
API リクエストが HTTP 500 Internal Server Error を返す。

### 诊断步骤 / 診断手順

**Step 1: 获取请求 ID / リクエスト ID を取得**
```bash
# 响应头中包含请求ID / レスポンスヘッダーにリクエストIDを含む
# x-request-id: abc-123-def
```

**Step 2: 检查 Pino 日志 / Pino ログを確認**
```bash
# 按请求ID搜索日志 / リクエストIDでログを検索
docker logs backend-api 2>&1 | grep "abc-123-def"

# 或使用日志聚合工具 / またはログ集約ツールを使用
# 查找 level: 50 (error) 的日志 / level: 50 (error) のログを検索
```

**Step 3: 常见原因与解决 / よくある原因と解決**

| 原因 / 原因 | 日志特征 / ログ特徴 | 解决方案 / 解決策 |
|---|---|---|
| 未捕获异常 / キャッチされない例外 | `unhandled error` | 检查代码中缺失的 try/catch / コード内の try/catch 漏れを確認 |
| DB 查询失败 / DB クエリ失敗 | `QueryFailedError` | 检查 SQL 语法和约束 / SQL 構文と制約を確認 |
| 空引用 / Null 参照 | `Cannot read property of undefined` | 检查数据是否存在 / データの存在を確認 |
| 内存不足 / メモリ不足 | `FATAL ERROR: heap out of memory` | 增加 `--max-old-space-size` / `--max-old-space-size` を増加 |
| 第三方 API 超时 / サードパーティAPI タイムアウト | `ETIMEDOUT` | 检查网络连接和超时配置 / ネットワーク接続とタイムアウト設定を確認 |

---

## 2. API 返回 401 / API が 401 を返す

### 症状 / 症状
API 请求返回 HTTP 401 Unauthorized。
API リクエストが HTTP 401 Unauthorized を返す。

### 诊断步骤 / 診断手順

**Step 1: 检查 JWT Token / JWT トークンを確認**
```bash
# 解码 JWT（不验证签名）/ JWT をデコード（署名検証なし）
echo "YOUR_TOKEN" | cut -d. -f2 | base64 -d 2>/dev/null | jq .

# 确认以下字段 / 以下フィールドを確認:
# - exp: token是否过期 / トークンが期限切れか
# - sub: 用户ID是否存在 / ユーザーIDが存在するか
# - app_metadata.tenant_id: 租户ID / テナントID
# - app_metadata.role: 用户角色 / ユーザーロール
```

**Step 2: 检查 Supabase Auth 状态 / Supabase Auth ステータスを確認**
```bash
# 使用 Supabase CLI / Supabase CLI を使用
supabase auth list-users --project-ref [PROJECT_REF]
```

**Step 3: 常见原因与解决 / よくある原因と解決**

| 原因 / 原因 | 解决方案 / 解決策 |
|---|---|
| Token 过期 / トークン期限切れ | 前端应自动刷新 token / フロントエンドで自動リフレッシュすべき |
| Token 格式错误 / トークンフォーマット不正 | 检查 Authorization header 格式 `Bearer <token>` |
| JWT_SECRET 不匹配 / JWT_SECRET 不一致 | 确认后端 JWT_SECRET 与 Supabase 一致 / バックエンドと Supabase の JWT_SECRET が一致か確認 |
| 用户已被禁用 / ユーザーが無効化済み | Supabase Dashboard で確認 |
| app_metadata 缺失 / app_metadata 欠損 | 检查用户注册流程 / ユーザー登録フローを確認 |

---

## 3. API 返回 403 / API が 403 を返す

### 症状 / 症状
API 请求返回 HTTP 403 Forbidden。已认证但无权限。
API リクエストが HTTP 403 Forbidden を返す。認証済みだが権限なし。

### 诊断步骤 / 診断手順

**Step 1: 确认用户角色 / ユーザーロールを確認**
```sql
-- 查询用户角色 / ユーザーロールを照会
SELECT id, email, raw_app_meta_data->>'role' as role,
       raw_app_meta_data->>'tenant_id' as tenant_id
FROM auth.users
WHERE id = 'USER_ID';
```

**Step 2: 检查 RoleGuard 配置 / RoleGuard 設定を確認**
```typescript
// 确认端点所需的角色 / エンドポイントに必要なロールを確認
@Roles('admin', 'manager')  // 需要 admin 或 manager 角色 / admin または manager ロールが必要
@UseGuards(JwtAuthGuard, RoleGuard)
```

**Step 3: 常见原因与解决 / よくある原因と解決**

| 原因 / 原因 | 解决方案 / 解決策 |
|---|---|
| 用户角色不足 / ユーザーロール不足 | 升级用户角色或检查端点权限要求 / ユーザーロールを昇格またはエンドポイント権限要件を確認 |
| RoleGuard 配置错误 / RoleGuard 設定ミス | 检查 @Roles() 装饰器 / @Roles() デコレーターを確認 |
| RLS 策略阻止 / RLS ポリシーがブロック | 检查 Supabase RLS 策略 / Supabase RLS ポリシーを確認 |
| 跨租户访问 / テナント間アクセス | 确认 tenant_id 匹配 / tenant_id が一致するか確認 |

---

## 4. 数据库连接错误 / データベース接続エラー

### 症状 / 症状
`ConnectionError`, `ECONNREFUSED`, `too many connections`

### 诊断步骤 / 診断手順

**Step 1: 检查 Supabase 状态 / Supabase ステータスを確認**
- 访问 https://status.supabase.com/
- 检查 Supabase Dashboard → Database → Connection Info

**Step 2: 检查连接字符串 / 接続文字列を確認**
```bash
# 验证连接 / 接続を検証
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres" -c "SELECT 1"
```

**Step 3: 检查连接池 / コネクションプールを確認**
```sql
-- 当前连接数 / 現在の接続数
SELECT count(*) FROM pg_stat_activity;

-- 按状态分组 / ステータス別
SELECT state, count(*) FROM pg_stat_activity GROUP BY state;

-- 最大连接数 / 最大接続数
SHOW max_connections;
```

**Step 4: 常见原因与解决 / よくある原因と解決**

| 原因 / 原因 | 解决方案 / 解決策 |
|---|---|
| Supabase 服务中断 / Supabase サービス停止 | 等待恢复或切换到备用 / 復旧待ちまたは予備に切替 |
| 连接池耗尽 / コネクションプール枯渇 | 增加 pool size 或检查连接泄漏 / プールサイズ増加またはコネクションリーク確認 |
| 密码错误 / パスワード不正 | 重置 Supabase 数据库密码 / Supabase DB パスワードをリセット |
| 网络问题 / ネットワーク問題 | 检查防火墙和 DNS / ファイアウォールと DNS を確認 |
| SSL 配置 / SSL 設定 | 确认 `?sslmode=require` 在连接字符串中 / 接続文字列に `?sslmode=require` を確認 |

---

## 5. 慢查询 / スロークエリ

### 症状 / 症状
API 响应时间超过 500ms，数据库 CPU 使用率高。
API レスポンスタイムが 500ms を超え、データベース CPU 使用率が高い。

### 诊断步骤 / 診断手順

**Step 1: 启用 pg_stat_statements / pg_stat_statements を有効化**
```sql
-- 查看最慢的查询 / 最も遅いクエリを表示
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

**Step 2: 分析查询计划 / クエリプランを分析**
```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM products WHERE tenant_id = 'xxx' AND sku = 'yyy';
```

**Step 3: 检查缺失索引 / 欠損インデックスを確認**
```sql
-- 大表的顺序扫描 / 大きなテーブルのシーケンシャルスキャン
SELECT schemaname, relname, seq_scan, seq_tup_read,
       idx_scan, idx_tup_fetch
FROM pg_stat_user_tables
WHERE seq_scan > 100
ORDER BY seq_tup_read DESC;
```

**Step 4: 常见优化 / よくある最適化**

| 问题 / 問題 | 解决方案 / 解決策 |
|---|---|
| 缺失索引 / インデックス欠損 | 添加复合索引 `(tenant_id, column)` / 複合インデックスを追加 |
| N+1 查询 / N+1 クエリ | 使用 JOIN 或批量查询 / JOIN またはバッチクエリを使用 |
| 未使用索引 / 未使用インデックス | 删除无用索引减少写入开销 / 不要なインデックスを削除し書き込みオーバーヘッドを軽減 |
| 锁等待 / ロック待ち | 检查长事务 `SELECT * FROM pg_locks` / 長時間トランザクションを確認 |
| 大结果集 / 大きな結果セット | 添加分页 (LIMIT/OFFSET) / ページネーション追加 |

---

## 6. 队列未处理 / キューが処理されない

### 症状 / 症状
BullMQ 任务积压，后台任务不执行。
BullMQ ジョブが滞留し、バックグラウンドタスクが実行されない。

### 诊断步骤 / 診断手順

**Step 1: 检查 Redis 连接 / Redis 接続を確認**
```bash
redis-cli -u $REDIS_URL ping
# 应返回 PONG / PONG が返るべき
```

**Step 2: 检查队列状态 / キュー状態を確認**
```bash
# 使用 BullMQ 的 Bull Board 或 CLI / BullMQ の Bull Board または CLI を使用
redis-cli -u $REDIS_URL
> KEYS bull:*
> LLEN bull:queue-name:wait      # 等待中的任务 / 待機中のジョブ
> LLEN bull:queue-name:active    # 处理中的任务 / 処理中のジョブ
> ZCARD bull:queue-name:failed   # 失败的任务 / 失敗したジョブ
> ZCARD bull:queue-name:delayed  # 延迟的任务 / 遅延ジョブ
```

**Step 3: 检查 Worker 进程 / Worker プロセスを確認**
```bash
# 确认 worker 正在运行 / worker が稼働中か確認
docker ps | grep worker
docker logs worker-container --tail 50
```

**Step 4: 检查 Poison Messages / ポイズンメッセージを確認**
```bash
# 查看失败任务的错误信息 / 失敗ジョブのエラー情報を表示
redis-cli -u $REDIS_URL
> ZRANGE bull:queue-name:failed 0 5
# 解析返回的JSON查看失败原因 / 返されたJSONを解析して失敗原因を確認
```

**Step 5: 常见原因与解决 / よくある原因と解決**

| 原因 / 原因 | 解决方案 / 解決策 |
|---|---|
| Redis 连接断开 / Redis 接続断絶 | 检查 Redis 状态和连接字符串 / Redis 状態と接続文字列を確認 |
| Worker 进程崩溃 / Worker プロセスクラッシュ | 重启 worker，检查错误日志 / worker を再起動、エラーログを確認 |
| Poison message 阻塞 / ポイズンメッセージがブロック | 移除或重试失败任务 / 失敗ジョブを削除またはリトライ |
| 内存不足 / メモリ不足 | 检查 Redis maxmemory / Redis の maxmemory を確認 |
| 并发限制 / 同時実行制限 | 调整 worker 的 concurrency 设置 / worker の concurrency 設定を調整 |

---

## 7. 前端白屏 / フロントエンド白画面

### 症状 / 症状
页面加载后显示空白，无内容渲染。
ページ読み込み後に空白が表示され、コンテンツがレンダリングされない。

### 诊断步骤 / 診断手順

**Step 1: 检查浏览器控制台 / ブラウザコンソールを確認**
- 打开 DevTools (F12) → Console
- 查找 JavaScript 错误 / JavaScript エラーを検索

**Step 2: 检查网络请求 / ネットワークリクエストを確認**
- DevTools → Network
- 确认 API 请求是否返回正确数据 / API リクエストが正しいデータを返しているか確認
- 查找 CORS 错误 / CORS エラーを検索

**Step 3: 常见原因与解决 / よくある原因と解決**

| 原因 / 原因 | 日志特征 / ログ特徴 | 解决方案 / 解決策 |
|---|---|---|
| API URL 配置错误 / API URL 設定ミス | `ERR_CONNECTION_REFUSED` | 检查 `.env` 中 `VITE_API_URL` / `.env` の `VITE_API_URL` を確認 |
| CORS 错误 / CORS エラー | `Access-Control-Allow-Origin` | 后端添加前端域名到 CORS 允许列表 / バックエンドで CORS 許可リストにフロントエンドドメインを追加 |
| JS 构建错误 / JS ビルドエラー | `SyntaxError`, `ChunkLoadError` | 清除缓存，重新构建 / キャッシュクリア、再ビルド |
| Vue Router 配置 / Vue Router 設定 | 空白但无错误 / 空白だがエラーなし | 检查路由配置和 base URL / ルート設定と base URL を確認 |
| 认证循环 / 認証ループ | 重复重定向 / リダイレクトループ | 检查 auth guard 逻辑 / auth guard ロジックを確認 |

---

## 8. 文件上传失败 / ファイルアップロード失敗

### 症状 / 症状
文件上传请求失败，返回 413 或 500。
ファイルアップロードリクエストが失敗し、413 または 500 を返す。

### 诊断步骤 / 診断手順

**Step 1: 检查文件大小 / ファイルサイズを確認**
```bash
# 默认限制 / デフォルト制限
# NestJS body-parser: 10MB
# Nginx: 1MB (需要调整 client_max_body_size)
# Supabase Storage: 50MB (Free), 5GB (Pro)
```

**Step 2: 检查 Supabase Storage 配置 / Supabase Storage 設定を確認**
- Dashboard → Storage → Policies
- 确认 bucket 存在且策略正确 / バケットが存在しポリシーが正しいか確認

**Step 3: 常见原因与解决 / よくある原因と解決**

| 原因 / 原因 | 解决方案 / 解決策 |
|---|---|
| 文件过大 / ファイルサイズ超過 | 调整上传限制或压缩文件 / アップロード制限を調整またはファイルを圧縮 |
| MIME 类型不允许 / MIME タイプ不許可 | 检查 Storage bucket 的 MIME 类型白名单 / Storage バケットの MIME タイプホワイトリストを確認 |
| Storage 权限 / Storage 権限 | 检查 RLS 策略和 bucket policies / RLS ポリシーと bucket policies を確認 |
| Nginx 限制 / Nginx 制限 | 增加 `client_max_body_size` / `client_max_body_size` を増加 |
| 超时 / タイムアウト | 增加上传超时时间 / アップロードタイムアウトを増加 |

---

## 9. B2 Cloud 集成错误 / B2 Cloud 連携エラー

> **注意 / 注意**: B2 Cloud 核心代码不可修改。参见 CLAUDE.md。
> B2 Cloud コアコードは変更禁止。CLAUDE.md を参照。

### 症状 / 症状
B2 Cloud API 调用失败，出荷数据无法同步。
B2 Cloud API 呼び出しが失敗し、出荷データが同期できない。

### 诊断步骤 / 診断手順

**Step 1: 检查 Session 缓存 / セッションキャッシュを確認**
```bash
# B2 Cloud 使用3层缓存: 内存 → Redis → API
# B2 Cloud は3層キャッシュを使用: メモリ → Redis → API

# 检查 Redis 中的 session / Redis のセッションを確認
redis-cli -u $REDIS_URL GET "b2cloud:session"
```

**Step 2: 检查认证信息 / 認証情報を確認**
```bash
# 确认环境变量已设置 / 環境変数が設定済みか確認
echo $B2_CLOUD_USERNAME
echo $B2_CLOUD_PASSWORD  # 应该已设置 / 設定済みであるべき
```

**Step 3: 检查 API 限流 / API レート制限を確認**
- B2 Cloud 有 API 调用频率限制 / B2 Cloud には API 呼び出し頻度制限がある
- 检查日志中的 429 状态码 / ログ内の 429 ステータスコードを確認

**Step 4: 常见错误与解决 / よくあるエラーと解決**

| 错误 / エラー | 原因 / 原因 | 解决方案 / 解決策 |
|---|---|---|
| `500 + 'entry'` | Session 过期 / セッション期限切れ | `authenticatedFetch()` 会自动重试 / 自動リトライされる。如果仍然失败则清除 Redis session / それでも失敗なら Redis セッションをクリア |
| 认证失败 / 認証失敗 | 凭据错误 / 認証情報不正 | 检查 B2 Cloud 账号密码 / B2 Cloud アカウント・パスワードを確認 |
| 验证失败 / バリデーション失敗 | 发送数据格式错误 / 送信データフォーマット不正 | 使用 `/api/v1/shipments/validate`（日本語キー）確認 |
| 连接超时 / 接続タイムアウト | B2 Cloud 服务端问题 / B2 Cloud サーバー側の問題 | 等待后重试 / 待ってからリトライ |

### 重要提醒 / 重要な注意

- **不要使用** `/api/v1/shipments/validate-full`（宽度检查器有 bug）
  **使用禁止**: `/api/v1/shipments/validate-full`（幅チェッカーにバグあり）
- **使用** `/api/v1/shipments/validate`（ShipmentInput schema, 日本語キー）
- proxy 的 `entry` 错误是 B2 Cloud session 过期导致，自动重试可解决
  proxy の `entry` エラーは B2 Cloud セッション切れが原因、自動リトライで解決

---

## 10. 租户数据泄漏 / テナントデータ漏洩

### 严重等级: P0 / 重大度: P0

> 这是最严重的安全事件。必须立即响应。
> これは最も深刻なセキュリティインシデント。即座に対応が必要。

### 紧急响应流程 / 緊急対応フロー

**Step 1: 立即隔离 / 即座に隔離**
```bash
# 如果确认数据泄漏，立即阻止进一步访问
# データ漏洩が確認された場合、直ちにさらなるアクセスを阻止

# 1. 考虑暂停受影响的 API 端点 / 影響を受けた API エンドポイントの一時停止を検討
# 2. 如有必要禁用受影响用户 / 必要に応じて影響ユーザーを無効化
```

**Step 2: 审查审计日志 / 監査ログをレビュー**
```sql
-- 检查跨租户访问 / テナント間アクセスを確認
SELECT * FROM audit_logs
WHERE tenant_id != request_tenant_id
ORDER BY created_at DESC
LIMIT 100;

-- 检查异常数据访问模式 / 異常なデータアクセスパターンを確認
SELECT user_id, tenant_id, action, COUNT(*)
FROM audit_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY user_id, tenant_id, action
ORDER BY count DESC;
```

**Step 3: 确认 RLS 策略 / RLS ポリシーを確認**
```sql
-- 检查所有表的 RLS 是否启用 / 全テーブルの RLS が有効か確認
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- 检查 RLS 策略定义 / RLS ポリシー定義を確認
SELECT * FROM pg_policies;
```

**Step 4: 修复与通知 / 修復と通知**
1. 修复 RLS 策略或代码中的 tenant_id 过滤漏洞 / RLS ポリシーまたはコード内の tenant_id フィルタ漏れを修正
2. 通知受影响租户 / 影響を受けたテナントに通知
3. 提交事后报告（RCA）/ ポストモーテム（RCA）を提出
4. 记录到 devlog / devlog に記録

---

## 通用调试技巧 / 汎用デバッグテクニック

### 日志级别 / ログレベル

```bash
# 临时启用 debug 日志 / 一時的に debug ログを有効化
LOG_LEVEL=debug npm run start

# Pino 日志级别 / Pino ログレベル:
# 10: trace, 20: debug, 30: info, 40: warn, 50: error, 60: fatal
```

### 请求追踪 / リクエストトレーシング

```bash
# 每个请求都有 x-request-id / 各リクエストに x-request-id がある
# 使用此 ID 在所有日志中追踪 / この ID で全ログを追跡
curl -v http://localhost:4001/api/health 2>&1 | grep x-request-id
```

### 数据库调试 / データベースデバッグ

```sql
-- 当前活跃查询 / 現在のアクティブクエリ
SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY duration DESC;

-- 终止长时间查询 / 長時間クエリを終了
SELECT pg_cancel_backend(pid);     -- 优雅终止 / グレースフル終了
SELECT pg_terminate_backend(pid);  -- 强制终止 / 強制終了
```
