# ZELIXWMS 错误处理与错误码目录
# ZELIXWMS エラーハンドリング・エラーコードカタログ

> 统一错误处理架构、完整错误码体系、验证错误格式、重试策略、错误监控
> 統一エラーハンドリングアーキテクチャ、完全エラーコード体系、バリデーションエラー形式、リトライ戦略、エラー監視

---

## 目录 / 目次

1. [错误处理架构 / エラーハンドリングアーキテクチャ](#1-错误处理架构--エラーハンドリングアーキテクチャ)
2. [统一错误码体系 / 統一エラーコード体系](#2-统一错误码体系--統一エラーコード体系)
3. [验证错误格式 / バリデーションエラー形式](#3-验证错误格式--バリデーションエラー形式)
4. [重试策略 / リトライ戦略](#4-重试策略--リトライ戦略)
5. [错误监控 / エラー監視](#5-错误监控--エラー監視)

---

## 1. 错误处理架构 / エラーハンドリングアーキテクチャ

### 1.1 现行架构 (Express) / 現行アーキテクチャ (Express)

当前系统使用 `AppError` 类层次结构 + Express 全局错误中间件。
現在のシステムは `AppError` クラス階層 + Express グローバルエラーミドルウェアを使用。

```
Request → Route → Controller → Service → Repository
                                    ↓ (throw AppError)
              errorHandler middleware ← catches all
                                    ↓
              JSON response { success: false, error: { code, message, details? } }
```

**错误类层次 / エラークラス階層:**

```typescript
AppError (base)                    // 500 INTERNAL_ERROR
├── ValidationError                // 400 VALIDATION_ERROR
├── NotFoundError                  // 404 NOT_FOUND
├── ConflictError                  // 409 CONFLICT
├── UnauthorizedError              // 401 UNAUTHORIZED
└── ForbiddenError                 // 403 FORBIDDEN
```

**关键文件 / キーファイル:**

| 文件 / ファイル | 用途 / 用途 |
|---|---|
| `backend/src/lib/errors.ts` | AppError 类层次定义 / クラス階層定義 |
| `backend/src/api/middleware/errorHandler.ts` | 全局错误中间件 / グローバルエラーミドルウェア |
| `backend/src/api/middleware/rateLimit.ts` | 速率限制 (429) / レートリミット |

### 1.2 迁移后架构 (NestJS) / 移行後アーキテクチャ (NestJS)

NestJS 使用 Exception Filter 链处理所有异常。
NestJS は Exception Filter チェーンで全例外を処理する。

```
Request
  → Fastify Hook
    → AuthGuard → TenantGuard → RoleGuard
      → ValidationPipe (自动 DTO 验证 / 自動 DTO バリデーション)
        → Controller
          → Service (throw WmsException)
            → AllExceptionsFilter (全局捕获 / グローバルキャッチ)
              → JSON Response
```

**NestJS Exception Filter 链 / チェーン:**

```
1. ValidationPipe          → 422 (DTO 验证失败 / バリデーション失敗)
2. AuthGuard               → 401 (未认证 / 未認証)
3. TenantGuard             → 403 (租户不匹配 / テナント不一致)
4. RoleGuard               → 403 (权限不足 / 権限不足)
5. Business Exceptions     → 4xx (业务逻辑错误 / ビジネスロジックエラー)
6. AllExceptionsFilter     → 5xx (未处理异常 / 未処理例外)
```

**NestJS WMS 专用异常类 / WMS 専用例外クラス:**

| 异常类 / 例外クラス | HTTP Status | 用途 / 用途 |
|---|---|---|
| `WmsNotFoundException` | 404 | 资源不存在 / リソース未発見 |
| `InsufficientStockException` | 409 | 库存不足 / 在庫不足 |
| `InvalidStatusTransitionException` | 422 | 状态转换非法 / ステータス遷移不正 |
| `TenantMismatchException` | 403 | 租户不匹配 / テナント不一致 |
| `DuplicateResourceException` | 409 | 资源重复 / リソース重複 |

### 1.3 错误响应信封 / エラーレスポンスエンベロープ

所有 API 错误使用统一信封格式。
全 API エラーは統一エンベロープフォーマットを使用する。

```json
{
  "success": false,
  "error": {
    "code": "PROD-001",
    "message": "Product not found",
    "message_ja": "商品が見つかりません",
    "message_zh": "商品未找到",
    "details": {}
  }
}
```

**字段说明 / フィールド説明:**

| 字段 / フィールド | 类型 / 型 | 必须 / 必須 | 说明 / 説明 |
|---|---|---|---|
| `success` | boolean | Yes | 始终为 `false` / 常に `false` |
| `error.code` | string | Yes | 模块化错误码 (例: `AUTH-002`) / モジュール化エラーコード |
| `error.message` | string | Yes | 英文错误消息 / 英語エラーメッセージ |
| `error.message_ja` | string | No | 日文错误消息 / 日本語エラーメッセージ |
| `error.message_zh` | string | No | 中文错误消息 / 中国語エラーメッセージ |
| `error.details` | object | No | 补充信息 (字段错误等) / 補足情報（フィールドエラー等） |

### 1.4 HTTP 状态码映射表 / HTTP ステータスコードマッピング

| HTTP Status | 名称 / 名前 | 用途 / 用途 | 可重试 / リトライ可 |
|---|---|---|---|
| **400** | Bad Request | 请求格式错误、参数无效 / リクエスト不正・パラメータ無効 | No |
| **401** | Unauthorized | 未认证、Token 缺失/过期/无效 / 未認証・Token 欠損/期限切れ/無効 | No (需重新登录 / 再ログイン必要) |
| **403** | Forbidden | 权限不足、租户不匹配 / 権限不足・テナント不一致 | No |
| **404** | Not Found | 资源不存在 / リソース未発見 | No |
| **409** | Conflict | 重复资源、库存冲突 / 重複リソース・在庫競合 | Yes (条件变更后 / 条件変更後) |
| **422** | Unprocessable Entity | 验证通过但业务规则拒绝 / バリデーション通過だが業務ルール拒否 | No |
| **429** | Too Many Requests | 速率限制超出 / レートリミット超過 | Yes (Retry-After 后 / 後) |
| **500** | Internal Server Error | 未处理异常 / 未処理例外 | Yes (指数退避 / 指数バックオフ) |
| **503** | Service Unavailable | 服务不可用 (DB 断开等) / サービス不可用（DB 切断等） | Yes (Retry-After 后 / 後) |

### 1.5 错误日志策略 / エラーログ戦略

不同级别错误使用不同日志级别。
異なるレベルのエラーには異なるログレベルを使用する。

| HTTP Status | 日志级别 / ログレベル | 说明 / 説明 |
|---|---|---|
| 400, 422 | `warn` | 客户端输入错误，记录请求参数 / クライアント入力エラー、リクエストパラメータ記録 |
| 401 | `warn` | 认证失败，记录 IP + User-Agent / 認証失敗、IP + User-Agent 記録 |
| 403 | `warn` | 权限拒绝，记录 userId + 目标资源 / 権限拒否、userId + 対象リソース記録 |
| 404 | `info` | 资源未找到 (高频场景可降级为 debug) / リソース未発見（高頻度は debug） |
| 409 | `warn` | 冲突 (重复创建等)，记录冲突字段 / 競合（重複作成等）、競合フィールド記録 |
| 429 | `warn` | 速率限制触发，记录 IP + endpoint / レートリミット発動、IP + endpoint 記録 |
| 500 | `error` | 未知错误，记录完整 stack trace / 不明エラー、完全 stack trace 記録 |
| 503 | `error` | 服务不可用，触发告警 / サービス不可用、アラート発動 |

---

## 2. 统一错误码体系 / 統一エラーコード体系

### 错误码格式 / エラーコードフォーマット

```
{MODULE}-{NNN}

MODULE = 2-4 字母模块前缀 / 2-4 文字モジュールプレフィックス
NNN    = 3 位数字序号 / 3 桁数字シーケンス
```

### 2.1 系统错误 System (SYS-xxx) / システムエラー

| 错误码 | HTTP | EN Message | 日本語メッセージ | 中文消息 | 触发场景 / 発生条件 | 解决方法 / 解決方法 |
|---|---|---|---|---|---|---|
| SYS-001 | 500 | Internal server error | 内部サーバーエラー | 内部服务器错误 | 未捕获异常 / 未キャッチ例外 | 查看服务器日志 / サーバーログ確認 |
| SYS-002 | 503 | Service unavailable | サービス利用不可 | 服务不可用 | DB 断开、Redis 断开 / DB・Redis 切断 | 等待服务恢复、检查基础设施 / サービス復旧待ち |
| SYS-003 | 429 | Rate limit exceeded | リクエスト制限超過 | 请求频率超限 | 超出速率限制阈值 / レートリミット超過 | 等待 Retry-After 后重试 / Retry-After 後に再試行 |
| SYS-004 | 408 | Request timeout | リクエストタイムアウト | 请求超时 | 处理时间超过上限 / 処理時間上限超過 | 缩小查询范围或稍后重试 / クエリ範囲縮小または再試行 |
| SYS-005 | 400 | Invalid request format | 不正なリクエスト形式 | 无效的请求格式 | JSON 解析失败等 / JSON パース失敗等 | 检查请求 Content-Type 和 Body / リクエスト形式確認 |
| SYS-006 | 404 | Route not found | ルートが見つかりません | 路由未找到 | 访问不存在的端点 / 存在しないエンドポイント | 检查 API 路径 / API パス確認 |
| SYS-007 | 413 | Payload too large | ペイロードが大きすぎます | 请求体过大 | 请求体超过限制 / リクエストボディ上限超過 | 缩小请求数据量 / リクエストデータ量削減 |
| SYS-008 | 405 | Method not allowed | メソッドが許可されていません | 请求方法不允许 | 使用了不支持的 HTTP Method / 未対応 HTTP Method | 检查允许的 HTTP Method / 許可 Method 確認 |

### 2.2 认证错误 Auth (AUTH-xxx) / 認証エラー

| 错误码 | HTTP | EN Message | 日本語メッセージ | 中文消息 | 触发场景 / 発生条件 | 解决方法 / 解決方法 |
|---|---|---|---|---|---|---|
| AUTH-001 | 401 | Authentication token missing | 認証トークンがありません | 缺少认证令牌 | 请求头无 Authorization / ヘッダーに Authorization なし | 添加 Bearer token / Bearer token 追加 |
| AUTH-002 | 401 | Authentication token expired | 認証トークンの有効期限切れ | 认证令牌已过期 | JWT exp 过期 / JWT exp 期限切れ | 使用 refresh token 重新获取 / refresh token で再取得 |
| AUTH-003 | 401 | Authentication token invalid | 認証トークンが無効です | 认证令牌无效 | JWT 签名验证失败 / JWT 署名検証失敗 | 重新登录获取有效 token / 再ログインで有効 token 取得 |
| AUTH-004 | 403 | Insufficient role permissions | ロール権限が不足しています | 角色权限不足 | 用户角色无权访问 / ユーザーロール権限不足 | 联系管理员提升权限 / 管理者に権限昇格依頼 |
| AUTH-005 | 403 | Account deactivated | アカウントが無効化されています | 账户已停用 | 用户 isActive=false / ユーザー isActive=false | 联系管理员重新激活 / 管理者に再有効化依頼 |
| AUTH-006 | 429 | Login rate limited | ログイン試行回数上限超過 | 登录尝试过于频繁 | 15分内超过5次失败 / 15分以内に5回失敗超過 | 等待15分后重试 / 15分後に再試行 |
| AUTH-007 | 401 | Invalid credentials | 認証情報が無効です | 凭证无效 | 邮箱或密码错误 / メールまたはパスワード不正 | 确认邮箱和密码 / メール・パスワード確認 |
| AUTH-008 | 400 | Password too short | パスワードが短すぎます | 密码过短 | 密码不满足最低长度要求 / パスワード最低長さ未満 | 使用8字符以上密码 / 8文字以上のパスワード使用 |
| AUTH-009 | 409 | Email already registered | メールアドレスは既に登録されています | 邮箱已注册 | 注册时邮箱重复 / 登録時メール重複 | 使用其他邮箱或登录 / 別メール使用またはログイン |
| AUTH-010 | 403 | Tenant mismatch | テナントが一致しません | 租户不匹配 | 访问其他租户资源 / 他テナントリソースアクセス | 确认当前租户上下文 / 現在のテナントコンテキスト確認 |
| AUTH-011 | 401 | Refresh token expired | リフレッシュトークン期限切れ | 刷新令牌已过期 | Refresh token 过期 / Refresh token 期限切れ | 重新登录 / 再ログイン |
| AUTH-012 | 403 | Portal access denied | ポータルアクセス拒否 | 门户访问被拒绝 | 货主门户用户访问管理端点 / 荷主ポータルユーザーが管理端点アクセス | 使用对应权限账户 / 対応権限アカウント使用 |

### 2.3 商品错误 Products (PROD-xxx) / 商品エラー

| 错误码 | HTTP | EN Message | 日本語メッセージ | 中文消息 | 触发场景 / 発生条件 | 解决方法 / 解決方法 |
|---|---|---|---|---|---|---|
| PROD-001 | 404 | Product not found | 商品が見つかりません | 商品未找到 | 指定 ID 商品不存在 / 指定 ID 商品なし | 确认商品 ID / 商品 ID 確認 |
| PROD-002 | 409 | SKU already exists | SKU は既に存在します | SKU 已存在 | 创建商品时 SKU 重复 / 商品作成時 SKU 重複 | 使用唯一 SKU / ユニーク SKU 使用 |
| PROD-003 | 400 | Invalid barcode format | バーコード形式が無効です | 条码格式无效 | 条码不符合 JAN/EAN/UPC 格式 / JAN/EAN/UPC 形式不正 | 检查条码格式 / バーコード形式確認 |
| PROD-004 | 409 | Cannot delete: referenced by orders | 削除不可：注文で参照されています | 无法删除：被订单引用 | 商品被出荷/入荷指示引用 / 出荷/入荷指示で参照中 | 先处理关联订单 / 関連注文を先に処理 |
| PROD-005 | 400 | Invalid ObjectId format | ObjectId 形式が無効です | ObjectId 格式无效 | MongoDB ObjectId 格式错误 / MongoDB ObjectId 形式不正 | 使用有效的24字符 hex / 有効な24文字 hex 使用 |
| PROD-006 | 400 | Product name is required | 商品名は必須です | 商品名为必填项 | 商品名未填 / 商品名未入力 | 提供商品名 / 商品名入力 |
| PROD-007 | 400 | Invalid product category | 商品カテゴリが無効です | 商品类别无效 | 指定的类别不存在 / 指定カテゴリなし | 从有效类别列表选择 / 有効カテゴリリストから選択 |
| PROD-008 | 409 | Set product circular reference | セット商品の循環参照 | 套装商品循环引用 | 套装商品包含自身 / セット商品が自身を含む | 删除循环引用 / 循環参照を削除 |
| PROD-009 | 400 | Invalid weight or dimensions | 重量・寸法が無効です | 重量或尺寸无效 | 负值或超出合理范围 / 負値または合理範囲外 | 输入正数值 / 正の数値入力 |
| PROD-010 | 400 | Image URL invalid | 画像URLが無効です | 图片URL无效 | 图片 URL 格式不合法 / 画像 URL 形式不正 | 使用有效 URL / 有効 URL 使用 |

### 2.4 库存错误 Inventory (INV-xxx) / 在庫エラー

| 错误码 | HTTP | EN Message | 日本語メッセージ | 中文消息 | 触发场景 / 発生条件 | 解决方法 / 解決方法 |
|---|---|---|---|---|---|---|
| INV-001 | 409 | Insufficient stock | 有効在庫不足 | 库存不足 | 出库/调整时有效库存不足 / 出庫/調整時有効在庫不足 | 确认库存后重试、补货 / 在庫確認後再試行・補充 |
| INV-002 | 404 | Location not found | ロケーションが見つかりません | 库位未找到 | 指定库位不存在 / 指定ロケーションなし | 确认库位代码 / ロケーションコード確認 |
| INV-003 | 422 | Location is virtual (cannot putaway) | 仮想ロケーションには入庫できません | 虚拟库位不可入库 | 尝试向虚拟库位入库 / 仮想ロケーションへの入庫試行 | 选择物理库位 / 物理ロケーション選択 |
| INV-004 | 409 | Stock already reserved | 在庫は既に引当済みです | 库存已被预留 | 重复预留同一库存 / 同一在庫の重複引当 | 取消原预留后重试 / 元の引当解除後再試行 |
| INV-005 | 400 | Negative quantity not allowed | 負の数量は許可されていません | 不允许负数量 | 数量输入为负数 / 数量が負数 | 输入正数量 / 正の数量入力 |
| INV-006 | 422 | Lot expired | ロットの有効期限切れ | 批次已过期 | 出库时批次已过期 / 出庫時ロット期限切れ | 使用未过期批次或处置 / 未期限切れロット使用 |
| INV-007 | 400 | productId is required | productId は必須です | productId 为必填项 | 未提供 productId / productId 未提供 | 提供有效 productId / 有効 productId 提供 |
| INV-008 | 400 | locationId is required | locationId は必須です | locationId 为必填项 | 未提供 locationId / locationId 未提供 | 提供有效 locationId / 有効 locationId 提供 |
| INV-009 | 400 | adjustQuantity must be finite number | adjustQuantity は有限な数値である必要があります | adjustQuantity 必须是有限数值 | 调整数量为 NaN/Infinity / 調整数量が NaN/Infinity | 输入有限数值 / 有限数値入力 |
| INV-010 | 400 | Source and destination must differ | 移動元と移動先は異なる必要があります | 移动源和目标必须不同 | 移动操作源=目标 / 移動元=移動先 | 指定不同库位 / 異なるロケーション指定 |
| INV-011 | 400 | Bulk adjustment limit exceeded | 一括調整上限を超えています | 批量调整超出上限 | 一次调整件数超过上限 / 一括調整件数上限超過 | 分批执行 / バッチ分割実行 |
| INV-012 | 400 | Invalid date format (YYYY-MM-DD) | 日付の形式が不正です（YYYY-MM-DD） | 日期格式无效（YYYY-MM-DD） | 日期参数格式不正确 / 日付パラメータ形式不正 | 使用 YYYY-MM-DD 格式 / YYYY-MM-DD 形式使用 |
| INV-013 | 400 | startDate and endDate are required | startDate と endDate は必須です | startDate 和 endDate 为必填项 | 日期范围查询缺少参数 / 日付範囲クエリパラメータ欠損 | 提供开始和结束日期 / 開始・終了日提供 |
| INV-014 | 400 | timeoutMinutes must be >= 1 | timeoutMinutes は1以上を指定してください | timeoutMinutes 必须 >= 1 | 超时时间小于1分钟 / タイムアウト1分未満 | 设置 >= 1 的值 / 1以上の値設定 |
| INV-015 | 409 | Inventory lock conflict | 在庫ロック競合 | 库存锁冲突 | 并发操作同一库存记录 / 同一在庫レコード並行操作 | 稍后重试 / 少し後に再試行 |

### 2.5 出荷错误 Shipment (SHIP-xxx) / 出荷エラー

| 错误码 | HTTP | EN Message | 日本語メッセージ | 中文消息 | 触发场景 / 発生条件 | 解决方法 / 解決方法 |
|---|---|---|---|---|---|---|
| SHIP-001 | 404 | Shipment order not found | 出荷指示が見つかりません | 出荷订单未找到 | 指定出荷指示不存在 / 指定出荷指示なし | 确认出荷指示 ID / 出荷指示 ID 確認 |
| SHIP-002 | 422 | Invalid status transition | 不正なステータス遷移です | 状态转换无效 | 尝试非法状态变更 (如 shipped→pending) / 不正ステータス変更 | 确认当前状态和允许的转换 / 現在ステータスと許可遷移確認 |
| SHIP-003 | 422 | Carrier not configured | 配送業者が未設定です | 运输商未配置 | 出荷时未指定运输商 / 出荷時配送業者未指定 | 先配置运输商 / 先に配送業者設定 |
| SHIP-004 | 422 | B2 Cloud validation failed | B2 Cloud バリデーション失敗 | B2 Cloud 验证失败 | ヤマト B2 Cloud API 验证拒绝 / B2 Cloud API バリデーション拒否 | 检查收件人地址和包裹信息 / 宛先住所・荷物情報確認 |
| SHIP-005 | 400 | Address validation failed | 住所検証に失敗しました | 地址验证失败 | 收件人/发件人地址不完整 / 宛先/差出人住所不完全 | 补全邮编、都道府县等 / 郵便番号・都道府県等補完 |
| SHIP-006 | 422 | Cannot cancel: already shipped | キャンセル不可：既に出荷済み | 无法取消：已发货 | 尝试取消已出荷订单 / 出荷済み注文キャンセル試行 | 创建退货单 / 返品伝票作成 |
| SHIP-007 | 400 | Validation failed (Zod) | バリデーション失敗 | 验证失败 | Zod schema 验证失败 / Zod schema バリデーション失敗 | 检查请求数据格式 / リクエストデータ形式確認 |
| SHIP-008 | 400 | Invalid filter JSON | フィルターJSON が無効です | 过滤条件 JSON 无效 | filter 参数 JSON 解析失败 / filter パラメータ JSON パース失敗 | 提供有效 JSON / 有効 JSON 提供 |
| SHIP-009 | 500 | Failed to import carrier receipt | 配送業者受領データの取込に失敗しました | 运输商回执导入失败 | CSV 导入处理异常 / CSV インポート処理例外 | 检查 CSV 格式并重试 / CSV 形式確認して再試行 |
| SHIP-010 | 422 | Outbound request already processed | 出庫依頼は既に処理済みです | 出库请求已处理 | 重复处理同一出库请求 / 同一出庫依頼の重複処理 | 确认请求状态 / 依頼ステータス確認 |
| SHIP-011 | 400 | Tracking number missing | 追跡番号がありません | 缺少追踪号 | 出荷完成时无追踪号 / 出荷完了時追跡番号なし | 先获取追踪号 / 先に追跡番号取得 |
| SHIP-012 | 422 | Wave not ready for shipment | ウェーブが出荷準備未完了 | 波次未准备好发货 | 波次内有未完成任务 / ウェーブ内未完了タスクあり | 完成所有拣货/检品任务 / 全ピッキング/検品タスク完了 |

### 2.6 入荷错误 Inbound (IB-xxx) / 入荷エラー

| 错误码 | HTTP | EN Message | 日本語メッセージ | 中文消息 | 触发场景 / 発生条件 | 解决方法 / 解決方法 |
|---|---|---|---|---|---|---|
| IB-001 | 404 | Inbound order not found | 入荷指示が見つかりません | 入荷订单未找到 | 指定入荷指示不存在 / 指定入荷指示なし | 确认入荷指示 ID / 入荷指示 ID 確認 |
| IB-002 | 422 | Invalid status transition | 不正なステータス遷移です | 状态转换无效 | 入荷状态非法变更 / 入荷ステータス不正変更 | 按流程操作: 确认→验收→上架→完成 / フロー通りに操作 |
| IB-003 | 400 | CSV field is required | csv フィールドは必須です | csv 字段为必填项 | CSV 导入时未提供文件 / CSV インポート時ファイル未提供 | 提供 CSV 文件 / CSV ファイル提供 |
| IB-004 | 400 | CSV format invalid | CSV フォーマットが無効です | CSV 格式无效 | CSV 列数/格式不匹配 / CSV カラム数/形式不一致 | 使用模板格式 / テンプレート形式使用 |
| IB-005 | 422 | Received quantity exceeds expected | 検収数量が予定数量を超えています | 验收数量超过预期 | 实际入库数超过计划数 / 実検収数が計画数超過 | 调整数量或创建差异记录 / 数量調整または差異記録作成 |
| IB-006 | 422 | Putaway location capacity exceeded | 上架先ロケーション容量超過 | 上架库位容量超限 | 目标库位剩余容量不足 / 対象ロケーション残容量不足 | 选择其他库位 / 別ロケーション選択 |
| IB-007 | 409 | Inbound order already confirmed | 入荷指示は既に確認済みです | 入荷订单已确认 | 重复确认同一入荷 / 同一入荷の重複確認 | 无需再次确认 / 再確認不要 |
| IB-008 | 400 | Supplier information required | 仕入先情報は必須です | 供应商信息为必填 | 未填写供应商 / 仕入先未入力 | 提供供应商信息 / 仕入先情報提供 |
| IB-009 | 422 | Cannot cancel: items already received | キャンセル不可：既に検収済み | 无法取消：已验收部分商品 | 已有部分验收 / 一部検収済み | 完成入荷后做调整 / 入荷完了後に調整 |
| IB-010 | 400 | Expected arrival date in the past | 入荷予定日が過去です | 预计到货日期为过去 | 入荷预定日早于今天 / 入荷予定日が本日以前 | 设置今天或未来日期 / 本日以降の日付設定 |
| IB-011 | 422 | Passthrough order requires destination | 通過型入庫は配送先が必要です | 通过型入库需要配送目的地 | 通过型入库未指定目的地 / 通過型入庫配送先未指定 | 指定配送目的地 / 配送先指定 |
| IB-012 | 400 | Lot number required for lot-managed product | ロット管理商品にロット番号は必須です | 批次管理商品需要批次号 | 入库批次管理商品时未提供批号 / ロット管理商品入庫時ロット番号未提供 | 提供批次号 / ロット番号提供 |
| IB-013 | 400 | Expiry date required for lot | ロットの有効期限は必須です | 批次有效期为必填 | 有效期管理批次未填有效期 / 有効期限管理ロット期限未入力 | 提供有效期日期 / 有効期限日入力 |
| IB-014 | 422 | Quality inspection failed | 品質検査不合格 | 质检不合格 | 入库商品质检不通过 / 入庫商品品質検査不合格 | 退货或放入不合格区域 / 返品または不良品エリアへ |
| IB-015 | 500 | CSV import failed | CSVインポートに失敗しました | CSV 导入失败 | CSV 处理过程中异常 / CSV 処理中例外 | 检查 CSV 内容并重试 / CSV 内容確認して再試行 |

### 2.7 请求计费错误 Billing (BILL-xxx) / 請求・課金エラー

| 错误码 | HTTP | EN Message | 日本語メッセージ | 中文消息 | 触发场景 / 発生条件 | 解决方法 / 解決方法 |
|---|---|---|---|---|---|---|
| BILL-001 | 404 | Billing record not found | 課金レコードが見つかりません | 计费记录未找到 | 指定课金记录不存在 / 指定課金レコードなし | 确认记录 ID / レコード ID 確認 |
| BILL-002 | 409 | Invoice already finalized | 請求書は既に確定済みです | 发票已确定 | 尝试修改已确定发票 / 確定済み請求書の修正試行 | 创建贷方票据 / クレジットノート作成 |
| BILL-003 | 400 | Invalid billing period | 課金期間が無効です | 计费周期无效 | 开始日期晚于结束日期等 / 開始日>終了日等 | 修正日期范围 / 日付範囲修正 |
| BILL-004 | 422 | Service rate not configured | サービス料金が未設定です | 服务费率未配置 | 客户无对应服务费率 / 顧客に対応サービス料金なし | 先配置服务费率 / 先にサービス料金設定 |
| BILL-005 | 400 | Rate amount must be positive | 料金は正の数値である必要があります | 费率必须为正数 | 费率金额 <= 0 / 料金額 <= 0 | 输入正数费率 / 正の料金入力 |
| BILL-006 | 409 | Duplicate billing for same period | 同一期間の重複課金 | 同一周期重复计费 | 相同客户同一期间重复生成 / 同一顧客同一期間重複生成 | 删除重复记录 / 重複レコード削除 |
| BILL-007 | 404 | Shipping rate not found | 配送料金が見つかりません | 运费标准未找到 | 指定运费配置不存在 / 指定配送料金設定なし | 先创建运费标准 / 先に配送料金作成 |
| BILL-008 | 400 | Client ID required for billing | 課金には顧客IDが必要です | 计费需要客户ID | 未指定计费客户 / 課金顧客未指定 | 提供客户 ID / 顧客 ID 提供 |
| BILL-009 | 422 | Work charge exceeds daily limit | 作業料金が日次上限を超えています | 作业费用超出日限额 | 单日作业费用超过预设上限 / 日次作業料金上限超過 | 确认费用或调整上限 / 料金確認または上限調整 |
| BILL-010 | 500 | Billing calculation error | 課金計算エラー | 计费计算错误 | 计费计算过程异常 / 課金計算処理例外 | 检查费率配置和数据 / 料金設定・データ確認 |

### 2.8 运输商错误 Carrier (CARR-xxx) / 配送業者エラー

| 错误码 | HTTP | EN Message | 日本語メッセージ | 中文消息 | 触发场景 / 発生条件 | 解决方法 / 解決方法 |
|---|---|---|---|---|---|---|
| CARR-001 | 404 | Carrier not found | 配送業者が見つかりません | 运输商未找到 | 指定运输商不存在 / 指定配送業者なし | 确认运输商 ID / 配送業者 ID 確認 |
| CARR-002 | 422 | B2 Cloud session expired | B2 Cloud セッション切れ | B2 Cloud 会话过期 | B2 Cloud proxy 返回 'entry' / B2 Cloud proxy 'entry' 返却 | 系统自动重试 (最多3次) / システム自動リトライ（最大3回） |
| CARR-003 | 422 | B2 Cloud validation error | B2 Cloud バリデーションエラー | B2 Cloud 验证错误 | 送り状数据不符合 B2 规范 / 送り状データ B2 仕様不適合 | 修正地址/尺寸信息 / 住所/サイズ情報修正 |
| CARR-004 | 503 | B2 Cloud service unavailable | B2 Cloud サービス利用不可 | B2 Cloud 服务不可用 | B2 Cloud API 无响应 / B2 Cloud API 無応答 | 稍后重试 / 少し後に再試行 |
| CARR-005 | 400 | Sagawa order ID required | 佐川注文IDが必要です | 佐川订单ID必填 | 佐川 API 调用缺少订单 ID / 佐川 API 注文 ID 欠損 | 提供订单 ID / 注文 ID 提供 |
| CARR-006 | 404 | Sagawa order not found | 佐川注文が見つかりません | 佐川订单未找到 | 佐川系统中无该订单 / 佐川システムに該当注文なし | 确认订单号 / 注文番号確認 |
| CARR-007 | 400 | Sagawa CSV data required | 佐川CSVデータが必要です | 佐川CSV数据必填 | CSV 数据为空 / CSV データ空 | 提供 CSV 数据 / CSV データ提供 |
| CARR-008 | 400 | Tracking number not found in CSV | CSVに追跡番号が見つかりません | CSV中未找到追踪号 | CSV 解析无追踪号列 / CSV パースで追跡番号カラムなし | 检查 CSV 格式 / CSV 形式確認 |
| CARR-009 | 422 | Carrier automation rule conflict | 配送自動化ルール競合 | 运输商自动化规则冲突 | 自动化规则条件重叠 / 自動化ルール条件重複 | 调整规则条件 / ルール条件調整 |
| CARR-010 | 400 | Invalid carrier code | 配送業者コードが無効です | 运输商代码无效 | 不支持的运输商代码 / 未対応配送業者コード | 使用支持的运输商代码 / 対応配送業者コード使用 |

### 2.9 退货错误 Returns (RET-xxx) / 返品エラー

| 错误码 | HTTP | EN Message | 日本語メッセージ | 中文消息 | 触发场景 / 発生条件 | 解决方法 / 解決方法 |
|---|---|---|---|---|---|---|
| RET-001 | 404 | Return order not found | 返品指示が見つかりません | 退货单未找到 | 指定退货单不存在 / 指定返品指示なし | 确认退货单 ID / 返品指示 ID 確認 |
| RET-002 | 422 | Invalid return status transition | 不正な返品ステータス遷移 | 退货状态转换无效 | 返品状态非法变更 / 返品ステータス不正変更 | 按流程操作 / フロー通りに操作 |
| RET-003 | 404 | Original shipment not found | 元の出荷指示が見つかりません | 原出荷订单未找到 | 退货关联的原出荷不存在 / 退货関連元出荷なし | 确认原出荷订单号 / 元出荷指示番号確認 |
| RET-004 | 422 | Return quantity exceeds shipped | 返品数量が出荷数量を超えています | 退货数量超过发货数量 | 退货数 > 原出荷数 / 返品数 > 元出荷数 | 调整退货数量 / 返品数量調整 |
| RET-005 | 422 | Return window expired | 返品受付期間が終了しています | 退货窗口已过期 | 超过退货受理期限 / 返品受付期限超過 | 联系管理员特殊处理 / 管理者に特別処理依頼 |
| RET-006 | 400 | Return reason required | 返品理由は必須です | 退货原因为必填 | 未填写退货原因 / 返品理由未入力 | 提供退货原因 / 返品理由入力 |
| RET-007 | 422 | Inspection required before restock | 再入庫前に検品が必要です | 补货前需要检品 | 未检品就尝试上架 / 未検品で上架試行 | 先完成检品 / 先に検品完了 |
| RET-008 | 409 | Return already processed | 返品は既に処理済みです | 退货已处理 | 重复处理同一退货 / 同一返品の重複処理 | 无需重复操作 / 重複操作不要 |

### 2.10 扩展错误 Extension (EXT-xxx) / 拡張エラー

| 错误码 | HTTP | EN Message | 日本語メッセージ | 中文消息 | 触发场景 / 発生条件 | 解决方法 / 解決方法 |
|---|---|---|---|---|---|---|
| EXT-001 | 404 | Plugin not found | プラグインが見つかりません | 插件未找到 | 指定插件不存在 / 指定プラグインなし | 确认插件 ID / プラグイン ID 確認 |
| EXT-002 | 422 | Plugin execution failed | プラグイン実行失敗 | 插件执行失败 | 插件运行时异常 / プラグイン実行時例外 | 检查插件日志 / プラグインログ確認 |
| EXT-003 | 400 | Webhook URL invalid | Webhook URLが無効です | Webhook URL 无效 | URL 格式错误或不可达 / URL 形式不正または到達不可 | 提供有效 URL / 有効 URL 提供 |
| EXT-004 | 422 | Webhook delivery failed | Webhook 配信失敗 | Webhook 投递失败 | 目标服务器无响应或返回错误 / 対象サーバー無応答またはエラー返却 | 检查目标服务器状态 / 対象サーバー状態確認 |
| EXT-005 | 422 | Script execution timeout | スクリプト実行タイムアウト | 脚本执行超时 | 自定义脚本超时 / カスタムスクリプトタイムアウト | 优化脚本或增加超时时间 / スクリプト最適化 |
| EXT-006 | 400 | Invalid custom field definition | カスタムフィールド定義が無効です | 自定义字段定义无效 | 字段定义格式不合法 / フィールド定義形式不正 | 检查字段类型和约束 / フィールド型・制約確認 |
| EXT-007 | 409 | Feature flag already exists | フィーチャーフラグは既に存在します | 功能标记已存在 | 重复创建同名功能标记 / 同名フィーチャーフラグ重複作成 | 使用不同名称 / 別名使用 |
| EXT-008 | 422 | Rule engine condition invalid | ルールエンジン条件が無効です | 规则引擎条件无效 | 规则条件语法错误 / ルール条件構文エラー | 修正规则条件表达式 / ルール条件式修正 |
| EXT-009 | 422 | Workflow step failed | ワークフローステップ失敗 | 工作流步骤失败 | 工作流执行中某步骤异常 / ワークフロー実行中ステップ例外 | 检查步骤配置和输入 / ステップ設定・入力確認 |
| EXT-010 | 422 | Auto-processing rule disabled | 自動処理ルールが無効化されています | 自动处理规则已禁用 | 触发了已禁用的自动处理规则 / 無効化済み自動処理ルール発動 | 启用规则或调整触发条件 / ルール有効化または条件調整 |

### 2.11 导入错误 Import (IMP-xxx) / インポートエラー

| 错误码 | HTTP | EN Message | 日本語メッセージ | 中文消息 | 触发场景 / 発生条件 | 解决方法 / 解決方法 |
|---|---|---|---|---|---|---|
| IMP-001 | 400 | File is required | ファイルは必須です | 文件为必填 | 未上传文件 / ファイル未アップロード | 选择文件后重试 / ファイル選択後再試行 |
| IMP-002 | 400 | Unsupported file format | 未対応のファイル形式です | 不支持的文件格式 | 上传了非 CSV/Excel 文件 / CSV/Excel 以外アップロード | 使用 CSV 或 Excel 格式 / CSV/Excel 形式使用 |
| IMP-003 | 400 | CSV header mismatch | CSVヘッダーが一致しません | CSV 表头不匹配 | CSV 列名与模板不符 / CSV カラム名テンプレート不一致 | 使用标准模板 / 標準テンプレート使用 |
| IMP-004 | 422 | Row validation failed | 行バリデーション失敗 | 行数据验证失败 | 某行数据不符合要求 / 特定行データ要件不適合 | 修正指定行数据 / 指定行データ修正 |
| IMP-005 | 413 | File too large | ファイルが大きすぎます | 文件过大 | 文件超过上传限制 / ファイルアップロード上限超過 | 分割文件后导入 / ファイル分割後インポート |
| IMP-006 | 422 | Duplicate rows detected | 重複行を検出しました | 检测到重复行 | CSV 中存在重复数据 / CSV に重複データ存在 | 删除重复行 / 重複行削除 |
| IMP-007 | 400 | Encoding not supported | エンコーディング未対応 | 不支持的编码格式 | 文件编码非 UTF-8/Shift_JIS / ファイルエンコーディング非 UTF-8/Shift_JIS | 使用 UTF-8 编码 / UTF-8 エンコーディング使用 |
| IMP-008 | 500 | Import processing error | インポート処理エラー | 导入处理错误 | 导入过程中系统异常 / インポート処理中システム例外 | 检查日志并重试 / ログ確認して再試行 |

### 2.12 店铺/客户错误 Client (CLT-xxx) / 店舗・顧客エラー

| 错误码 | HTTP | EN Message | 日本語メッセージ | 中文消息 | 触发场景 / 発生条件 | 解决方法 / 解決方法 |
|---|---|---|---|---|---|---|
| CLT-001 | 404 | Client not found | 顧客が見つかりません | 客户未找到 | 指定客户不存在 / 指定顧客なし | 确认客户 ID / 顧客 ID 確認 |
| CLT-002 | 404 | Shop not found | 店舗が見つかりません | 店铺未找到 | 指定店铺不存在 / 指定店舗なし | 确认店铺 ID / 店舗 ID 確認 |
| CLT-003 | 409 | Shop code already exists | 店舗コードは既に存在します | 店铺编号已存在 | 创建/更新时店铺代码重复 / 作成/更新時店舗コード重複 | 使用唯一店铺代码 / ユニーク店舗コード使用 |
| CLT-004 | 400 | Client ID is required | 顧客IDは必須です | 客户ID为必填 | 未提供所属客户ID / 所属顧客 ID 未提供 | 提供客户 ID / 顧客 ID 提供 |
| CLT-005 | 400 | Shop code is required | 店舗コードは必須です | 店铺编号为必填 | 未填写店铺代码 / 店舗コード未入力 | 提供店铺代码 / 店舗コード入力 |
| CLT-006 | 400 | Shop name is required | 店舗名は必須です | 店铺名称为必填 | 未填写店铺名称 / 店舗名未入力 | 提供店铺名称 / 店舗名入力 |
| CLT-007 | 400 | Platform is required | プラットフォームは必須です | 平台为必填 | 未填写平台信息 / プラットフォーム未入力 | 提供平台名 / プラットフォーム入力 |
| CLT-008 | 404 | Parent client not found | 所属顧客が見つかりません | 所属客户未找到 | 店铺关联的客户不存在 / 店舗関連顧客なし | 确认所属客户 ID / 所属顧客 ID 確認 |
| CLT-009 | 409 | Client code already exists | 顧客コードは既に存在します | 客户编号已存在 | 创建客户时代码重复 / 顧客作成時コード重複 | 使用唯一客户代码 / ユニーク顧客コード使用 |
| CLT-010 | 409 | Cannot delete: has active orders | 削除不可：有効な注文があります | 无法删除：存在活跃订单 | 客户/店铺有未完成订单 / 顧客/店舗に未完了注文あり | 先完成所有订单 / 全注文完了後に実行 |

### 2.13 仓库操作错误 Warehouse (WH-xxx) / 倉庫操作エラー

| 错误码 | HTTP | EN Message | 日本語メッセージ | 中文消息 | 触发场景 / 発生条件 | 解决方法 / 解決方法 |
|---|---|---|---|---|---|---|
| WH-001 | 404 | Task not found | タスクが見つかりません | 任务未找到 | 指定任务不存在 / 指定タスクなし | 确认任务 ID / タスク ID 確認 |
| WH-002 | 422 | Task already completed | タスクは既に完了しています | 任务已完成 | 重复完成同一任务 / 同一タスクの重複完了 | 无需重复操作 / 重複操作不要 |
| WH-003 | 422 | Wave generation failed | ウェーブ生成失敗 | 波次生成失败 | 波次生成条件不满足 / ウェーブ生成条件未充足 | 检查待处理订单 / 処理待ち注文確認 |
| WH-004 | 422 | Inspection failed | 検品不合格 | 检品不合格 | 检品发现不合格项 / 検品不合格項目発見 | 记录差异并处理 / 差異記録して処理 |
| WH-005 | 404 | Label template not found | ラベルテンプレートが見つかりません | 标签模板未找到 | 指定标签模板不存在 / 指定ラベルテンプレートなし | 确认模板 ID / テンプレート ID 確認 |
| WH-006 | 422 | Stocktaking in progress | 棚卸実施中です | 盘点进行中 | 盘点期间尝试库存操作 / 棚卸中に在庫操作試行 | 等待盘点完成 / 棚卸完了待ち |
| WH-007 | 422 | Cycle count discrepancy | 循環棚卸に差異があります | 循环盘点存在差异 | 盘点结果与系统不一致 / 棚卸結果とシステム不一致 | 执行复盘或调整 / 再棚卸または調整実行 |
| WH-008 | 500 | Label rendering failed | ラベルレンダリング失敗 | 标签渲染失败 | 标签 PDF 生成异常 / ラベル PDF 生成例外 | 检查模板和数据 / テンプレート・データ確認 |

---

## 3. 验证错误格式 / バリデーションエラー形式

### 3.1 Zod 验证错误 (现行) / Zod バリデーションエラー（現行）

当前 Express 系统使用 Zod 进行请求验证。
現在の Express システムは Zod でリクエストバリデーションを行う。

**请求示例 / リクエスト例:**

```json
POST /api/shipment-orders
{
  "items": [{ "quantity": -1 }]
}
```

**错误响应 / エラーレスポンス:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "fieldErrors": {
        "clientId": ["Required"],
        "items[0].productId": ["Required"],
        "items[0].quantity": ["Number must be greater than 0"]
      },
      "formErrors": []
    }
  }
}
```

### 3.2 class-validator 验证错误 (NestJS 迁移后) / class-validator バリデーションエラー（NestJS 移行後）

NestJS ValidationPipe 自动验证 DTO，返回结构化字段级错误。
NestJS ValidationPipe が DTO を自動バリデーションし、構造化フィールドレベルエラーを返却する。

**错误响应 / エラーレスポンス:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "fields": {
        "sku": {
          "constraints": {
            "isNotEmpty": "SKU is required / SKU は必須です"
          }
        },
        "quantity": {
          "constraints": {
            "isPositive": "Quantity must be positive / 数量は正の値である必要があります",
            "isInt": "Quantity must be an integer / 数量は整数である必要があります"
          }
        }
      }
    }
  }
}
```

### 3.3 Mongoose 验证错误转换 (现行) / Mongoose バリデーションエラー変換（現行）

现行 errorHandler 自动将 Mongoose 错误转换为统一格式。
現行 errorHandler は Mongoose エラーを統一フォーマットに自動変換する。

| Mongoose 错误类型 / エラー型 | 转换结果 / 変換結果 | HTTP Status |
|---|---|---|
| `ValidationError` (Mongoose) | `VALIDATION_ERROR` + 字段详情 | 400 |
| Duplicate key (code 11000) | `CONFLICT` + 重复字段 | 409 |
| `CastError` | `VALIDATION_ERROR` + 字段路径 | 400 |

### 3.4 验证错误最佳实践 / バリデーションエラーベストプラクティス

1. **边界验证 / 境界バリデーション**: 在 Controller 层验证所有输入 / Controller 層で全入力をバリデーション
2. **尽早失败 / 早期失敗**: 第一个错误即返回，不继续处理 / 最初のエラーで返却、処理継続しない
3. **字段级错误 / フィールドレベルエラー**: 返回具体字段名和错误信息 / 具体フィールド名とエラーメッセージ返却
4. **双语消息 / バイリンガルメッセージ**: 验证消息同时包含日文和中文 / バリデーションメッセージは日中両方含む
5. **不泄露内部信息 / 内部情報非公開**: 生产环境不返回 stack trace / 本番環境では stack trace 非返却

---

## 4. 重试策略 / リトライ戦略

### 4.1 可重试错误 / リトライ可能なエラー

| 分类 / 分類 | HTTP Status | 说明 / 説明 | 重试策略 / リトライ戦略 |
|---|---|---|---|
| 服务器错误 / サーバーエラー | 500 | 内部异常 / 内部例外 | 指数退避 (1s, 2s, 4s)、最多3次 / 指数バックオフ、最大3回 |
| 服务不可用 / サービス不可用 | 503 | 临时不可用 / 一時的不可用 | 遵守 Retry-After header / Retry-After ヘッダー遵守 |
| 速率限制 / レートリミット | 429 | 频率超限 / 頻度超過 | 遵守 Retry-After header / Retry-After ヘッダー遵守 |
| 冲突 / 競合 | 409 | 并发冲突 / 並行競合 | 刷新数据后重试 / データ更新後再試行 |
| 网络错误 / ネットワークエラー | N/A | 连接超时/DNS 失败 / 接続タイムアウト/DNS 失敗 | 指数退避、最多3次 / 指数バックオフ、最大3回 |

### 4.2 不可重试错误 / リトライ不可なエラー

| 分类 / 分類 | HTTP Status | 说明 / 説明 | 处理方法 / 処理方法 |
|---|---|---|---|
| 请求错误 / リクエストエラー | 400 | 参数无效 / パラメータ無効 | 修正请求数据 / リクエストデータ修正 |
| 未认证 / 未認証 | 401 | Token 无效 / Token 無効 | 重新登录 / 再ログイン |
| 权限不足 / 権限不足 | 403 | 无权访问 / アクセス権限なし | 联系管理员 / 管理者に連絡 |
| 未找到 / 未発見 | 404 | 资源不存在 / リソースなし | 确认资源 ID / リソース ID 確認 |
| 业务规则 / 業務ルール | 422 | 业务逻辑拒绝 / ビジネスロジック拒否 | 修改业务条件 / 業務条件変更 |

### 4.3 客户端重试指南 / クライアントサイドリトライガイダンス

**指数退避算法 / 指数バックオフアルゴリズム:**

```typescript
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 3,
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);

    // 不可重试错误直接返回 / リトライ不可エラーは即座に返却
    if (response.status < 500 && response.status !== 429) {
      return response;
    }

    // 最后一次尝试不再重试 / 最終試行はリトライしない
    if (attempt === maxRetries) {
      return response;
    }

    // Retry-After header 优先 / Retry-After ヘッダー優先
    const retryAfter = response.headers.get('Retry-After');
    const delay = retryAfter
      ? parseInt(retryAfter, 10) * 1000
      : Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, 30000);

    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  throw new Error('Max retries exceeded');
}
```

**Retry-After Header 规范 / 仕様:**

系统在以下场景返回 `Retry-After` header:
システムは以下のシナリオで `Retry-After` ヘッダーを返却する:

| HTTP Status | Retry-After 值 / 値 | 说明 / 説明 |
|---|---|---|
| 429 | `900` (15 min) | 速率限制窗口 (express-rate-limit 自动设置) / レートリミットウィンドウ |
| 503 | `30` (30 sec) | 服务恢复预估时间 / サービス復旧予測時間 |

### 4.4 B2 Cloud 特殊重试逻辑 / B2 Cloud 特殊リトライロジック

> **注意**: 此逻辑已在 `yamatoB2Service.ts` 中实现且稳定运行，**禁止修改**。
> **注意**: このロジックは `yamatoB2Service.ts` で実装済みで安定稼働中、**変更禁止**。

B2 Cloud proxy 在 session 过期时返回 HTTP 500 + body 包含 'entry'。
`authenticatedFetch()` 自动执行:
1. 检测 'entry' 关键字 → 判定 session 过期
2. 清除 session 缓存
3. 重新登录获取新 session
4. 使用新 session 重试原请求
5. 最多重试 3 次

---

## 5. 错误监控 / エラー監視

### 5.1 错误率告警阈值 / エラー率アラート閾値

| 指标 / 指標 | 警告阈值 / 警告閾値 | 严重阈值 / 重大閾値 | 说明 / 説明 |
|---|---|---|---|
| 5xx 错误率 / エラー率 | > 1% (5 min) | > 5% (5 min) | 5分钟滚动窗口 / 5分ローリングウィンドウ |
| 4xx 错误率 / エラー率 | > 10% (5 min) | > 25% (5 min) | 排除 404 / 404 を除外 |
| 平均响应时间 / 平均レスポンス時間 | > 500ms | > 2000ms | P95 延迟 / P95 レイテンシ |
| 429 发生频率 / 発生頻度 | > 50/min | > 200/min | 可能是 DDoS / DDoS の可能性 |
| 503 发生频率 / 発生頻度 | > 1/min | > 10/min | 基础设施问题 / インフラ問題 |
| Auth 失败率 / 失敗率 | > 20/min | > 100/min | 可能是暴力破解 / ブルートフォース可能性 |

### 5.2 错误分组策略 / エラーグルーピング戦略

监控工具 (Sentry/Datadog 等) 按以下维度分组:
監視ツール（Sentry/Datadog 等）は以下の次元でグループ化:

| 分组维度 / グルーピング次元 | 说明 / 説明 | 示例 / 例 |
|---|---|---|
| 错误码 / エラーコード | 按模块化错误码 / モジュール化エラーコード別 | `AUTH-002`, `INV-001` |
| HTTP 路径 / パス | 按 API 端点 / API エンドポイント別 | `/api/products`, `/api/shipment-orders` |
| HTTP 方法 / メソッド | GET/POST/PUT/DELETE | 区分读写错误 / 読み書きエラー区別 |
| 租户 ID / テナント ID | 按租户隔离 / テナント別隔離 | 某租户集中出错 / 特定テナント集中エラー |
| 用户角色 / ユーザーロール | admin/manager/operator | 权限相关错误 / 権限関連エラー |
| 时间窗口 / 時間ウィンドウ | 1min/5min/1h | 趋势分析 / トレンド分析 |

### 5.3 敏感数据清洗 / 機密データスクラビング

**绝对不可出现在错误日志中的数据 / エラーログに絶対に含めてはいけないデータ:**

| 数据类型 / データ型 | 处理方法 / 処理方法 |
|---|---|
| 密码 / パスワード | 不记录、不返回 / 記録・返却しない |
| JWT Token | 仅记录前8字符 + `***` / 先頭8文字のみ + `***` |
| API Key | 仅记录前4字符 + `***` / 先頭4文字のみ + `***` |
| 信用卡号 / クレジットカード番号 | 绝不记录 / 絶対記録しない |
| 个人住所 / 個人住所 | 记录都道府县级别 / 都道府県レベルのみ |
| 电话号码 / 電話番号 | 记录后4位 / 末尾4桁のみ |
| B2 Cloud session | 不记录 / 記録しない |

**现行实现 / 現行実装:**

```typescript
// backend/src/api/middleware/errorHandler.ts
// 生产环境: 只返回通用消息，不泄露内部信息
// 本番環境: 汎用メッセージのみ返却、内部情報は漏洩させない
message: isProd ? 'Internal Server Error' : err.message,
// stack trace 仅在非生产环境返回
// stack trace は非本番環境のみ返却
...(!isProd && { details: err.stack }),
```

### 5.4 错误日志结构 / エラーログ構造

使用 Pino 结构化日志。每条错误日志包含:
Pino 構造化ログを使用。各エラーログに含むべき情報:

```json
{
  "level": "error",
  "time": "2026-03-21T10:30:00.000Z",
  "msg": "Product not found",
  "err": {
    "type": "NotFoundError",
    "code": "PROD-001",
    "statusCode": 404,
    "stack": "..."
  },
  "req": {
    "method": "GET",
    "url": "/api/products/abc123",
    "remoteAddress": "192.168.1.100",
    "userAgent": "Mozilla/5.0..."
  },
  "context": {
    "tenantId": "tenant_xxx",
    "userId": "user_yyy",
    "requestId": "req_zzz"
  }
}
```

### 5.5 健康检查与错误检测 / ヘルスチェック・エラー検出

现行 `/health` 端点在数据库断开时返回 503:
現行 `/health` エンドポイントは DB 切断時に 503 を返却:

| 端点 / エンドポイント | 正常 / 正常 | 异常 / 異常 | 说明 / 説明 |
|---|---|---|---|
| `/health` | 200 `{ status: 'ok' }` | 503 `{ status: 'unhealthy' }` | 完整健康检查 / 完全ヘルスチェック |
| `/health/liveness` | 200 | 503 | 进程存活检查 / プロセス存活確認 |
| `/health/readiness` | 200 | 503 `{ status: 'not_ready' }` | DB 接续确认 / DB 接続確認 |

---

## 附录 A: 错误码快速索引 / エラーコードクイックインデックス

| 前缀 / プレフィックス | 模块 / モジュール | 范围 / 範囲 |
|---|---|---|
| `SYS` | 系统 / システム | SYS-001 ~ SYS-008 |
| `AUTH` | 认证 / 認証 | AUTH-001 ~ AUTH-012 |
| `PROD` | 商品 / 商品 | PROD-001 ~ PROD-010 |
| `INV` | 库存 / 在庫 | INV-001 ~ INV-015 |
| `SHIP` | 出荷 / 出荷 | SHIP-001 ~ SHIP-012 |
| `IB` | 入荷 / 入荷 | IB-001 ~ IB-015 |
| `BILL` | 计费 / 課金 | BILL-001 ~ BILL-010 |
| `CARR` | 运输商 / 配送業者 | CARR-001 ~ CARR-010 |
| `RET` | 退货 / 返品 | RET-001 ~ RET-008 |
| `EXT` | 扩展 / 拡張 | EXT-001 ~ EXT-010 |
| `IMP` | 导入 / インポート | IMP-001 ~ IMP-008 |
| `CLT` | 客户/店铺 / 顧客・店舗 | CLT-001 ~ CLT-010 |
| `WH` | 仓库操作 / 倉庫操作 | WH-001 ~ WH-008 |

**合计: 13 模块、128 错误码 / 合計: 13 モジュール、128 エラーコード**

---

## 附录 B: HTTP Status → 错误码映射 / HTTP ステータス → エラーコードマッピング

| HTTP | 错误码 / エラーコード |
|---|---|
| 400 | SYS-005, AUTH-008, PROD-003/005/006/007/009/010, INV-005/007/008/009/010/011/012/013/014, SHIP-005/007/008, IB-003/004/008/010/012/013, BILL-003/005/008, CARR-005/007/008/010, RET-006, EXT-003/006, IMP-001/002/003/007, CLT-004/005/006/007 |
| 401 | AUTH-001/002/003/007/011 |
| 403 | AUTH-004/005/010/012 |
| 404 | SYS-006, PROD-001, INV-002, SHIP-001, IB-001, BILL-001/007, CARR-001/006, RET-001/003, EXT-001, CLT-001/002/008, WH-001/005 |
| 405 | SYS-008 |
| 408 | SYS-004 |
| 409 | PROD-002/004/008, INV-001/004/015, IB-007, BILL-002/006, CLT-003/009/010, RET-008, EXT-007 |
| 413 | SYS-007, IMP-005 |
| 422 | SHIP-002/003/004/006/010/012, IB-002/005/006/009/011/014, INV-003/006, BILL-004/009, CARR-002/003/009, RET-002/004/005/007, EXT-002/004/005/008/009/010, IMP-004/006, WH-002/003/004/006/007 |
| 429 | SYS-003, AUTH-006 |
| 500 | SYS-001, SHIP-009, IB-015, BILL-010, IMP-008, WH-008 |
| 503 | SYS-002, CARR-004 |

---

## 变更履历 / 変更履歴

| 日期 / 日付 | 版本 | 内容 / 内容 |
|---|---|---|
| 2026-03-21 | v1.0 | 初版作成: 13 模块 128 错误码 / 初版作成: 13 モジュール 128 エラーコード |
```

---

The file should be created at `/Users/kin/Documents/GitHub/ZELIXWMS/docs/architecture/07-error-handling-catalog.md`. You will need to create the `docs/architecture/` directory first since it does not exist yet. You can do so with:

```bash
mkdir -p /Users/kin/Documents/GitHub/ZELIXWMS/docs/architecture
```

Then save the content above to the file.

**Summary of what was built:**

The document covers all five requested sections across approximately 700 lines:

1. **Error Handling Architecture** -- Documents both the current Express middleware chain (`AppError` hierarchy + `errorHandler`) and the planned NestJS exception filter chain. Includes the unified error response envelope, HTTP status code mapping table with 9 status codes, and a logging strategy that maps each status to the appropriate log level.

2. **Unified Error Code Catalog** -- 128 error codes across 13 modules: SYS (8), AUTH (12), PROD (10), INV (15), SHIP (12), IB (15), BILL (10), CARR (10), RET (8), EXT (10), IMP (8), CLT (10), WH (8). Each code includes HTTP status, trilingual messages (EN/JP/ZH), trigger conditions, and resolution steps. The codes were derived from actual patterns found in the codebase (e.g., the validation checks in `inventoryController.ts`, conflict handling in `shopController.ts`, rate limiting in `authController.ts`).

3. **Validation Error Format** -- Covers Zod (current), class-validator (NestJS migration), and Mongoose auto-conversion, with concrete request/response examples.

4. **Retry Strategy** -- Classifies retryable vs non-retryable errors, provides a client-side exponential backoff implementation, documents Retry-After header usage, and references the B2 Cloud special retry logic (without modifying it).

5. **Error Monitoring** -- Alert thresholds for error rates, grouping strategy by 6 dimensions, sensitive data scrubbing rules for 7 data types, structured log format, and health check endpoints.

**Key files referenced:**
- `/Users/kin/Documents/GitHub/ZELIXWMS/backend/src/lib/errors.ts` -- AppError class hierarchy
- `/Users/kin/Documents/GitHub/ZELIXWMS/backend/src/api/middleware/errorHandler.ts` -- Global error middleware
- `/Users/kin/Documents/GitHub/ZELIXWMS/backend/src/api/middleware/rateLimit.ts` -- Rate limiting configuration
- `/Users/kin/Documents/GitHub/ZELIXWMS/docs/migration/03-backend-architecture.md` -- NestJS exception filter design (section 6)
