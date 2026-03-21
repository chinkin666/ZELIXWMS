# ZELIX WMS API 规范 / API 仕様書

> 完整的 API 参考文档，面向开发者。
> 完全な API リファレンスドキュメント、開発者向け。

---

## 1. 概述 / 概要

### 基础 URL / ベース URL

```
/api
```

### 认证 / 認証

所有受保护端点需要 Bearer JWT（Supabase Auth 签发）。
すべての保護エンドポイントは Bearer JWT（Supabase Auth 発行）が必要。

### 通用请求头 / 共通リクエストヘッダー

| Header | 必须 / 必須 | 说明 / 説明 |
|--------|:-----------:|-------------|
| `Authorization` | Yes | `Bearer <JWT token>` |
| `Content-Type` | Yes | `application/json` |
| `X-Request-ID` | No | 请求追踪用 UUID / リクエスト追跡用 UUID |

### 请求格式 / リクエスト形式

- Body: JSON
- 字符编码 / 文字エンコーディング: UTF-8

---

## 2. 响应格式 / レスポンス形式

### 2.1 单体响应 / 単体レスポンス

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "_id": "550e8400-e29b-41d4-a716-446655440000",
  "sku": "APPLE-001",
  "name": "りんごジュース 1L",
  "createdAt": "2026-03-21T12:00:00.000Z",
  "updatedAt": "2026-03-21T12:00:00.000Z"
}
```

> `id` と `_id` は同じ値。旧システム（MongoDB）との後方互換性のため両方返却。
> `id` 和 `_id` 值相同。为与旧系统（MongoDB）向后兼容，两者都返回。

### 2.2 列表响应 / 一覧レスポンス

```json
{
  "items": [
    { "id": "...", "_id": "...", "sku": "APPLE-001", "name": "..." },
    { "id": "...", "_id": "...", "sku": "BANANA-002", "name": "..." }
  ],
  "total": 100,
  "page": 1,
  "limit": 50
}
```

### 2.3 错误响应 / エラーレスポンス

```json
{
  "statusCode": 400,
  "message": "Validation failed: sku is required",
  "error": "VALIDATION_ERROR"
}
```

---

## 3. 分页・排序・筛选 / ページネーション・ソート・フィルタ

### 3.1 分页 / ページネーション

| 参数 / パラメータ | 默认 / デフォルト | 说明 / 説明 |
|-------------------|:-----------------:|-------------|
| `page` | `1` | ページ番号（1 始まり）/ 页码（从 1 开始） |
| `limit` | `50` | 1 ページあたり件数 / 每页条数（最大 200） |

```
GET /api/products?page=2&limit=50
```

### 3.2 排序 / ソート

| 参数 / パラメータ | 默认 / デフォルト | 说明 / 説明 |
|-------------------|:-----------------:|-------------|
| `sort` | `createdAt` | ソート対象フィールド / 排序字段 |
| `order` | `desc` | `asc` または `desc` / `asc` 或 `desc` |

```
GET /api/products?sort=name&order=asc
```

### 3.3 筛选 / フィルタ

| 参数 / パラメータ | 说明 / 説明 |
|-------------------|-------------|
| `status` | 状态筛选 / ステータスフィルタ（例: `active`, `draft`） |
| `search` | 关键词模糊搜索 / キーワードあいまい検索 |

```
GET /api/products?status=active&search=りんご
```

---

## 4. HTTP 状态码 / HTTP ステータスコード

| Code | 含义 / 意味 | 使用场景 / 使用場面 |
|------|-------------|---------------------|
| `200` | OK | 取得・更新成功 / 取得・更新成功 |
| `201` | Created | 新規作成成功 / 新建成功 |
| `204` | No Content | 削除成功 / 删除成功 |
| `400` | Bad Request | 入力値不正 / 输入值不正确 |
| `401` | Unauthorized | 未認証 / 未认证 |
| `403` | Forbidden | 権限不足 / 权限不足 |
| `404` | Not Found | リソース未発見 / 资源未找到 |
| `409` | Conflict | 重複・競合 / 重复・冲突 |
| `429` | Too Many Requests | レート制限超過 / 速率限制超过 |
| `500` | Internal Server Error | サーバー内部エラー / 服务器内部错误 |
| `503` | Service Unavailable | サービス利用不可 / 服务不可用 |

---

## 5. 错误码 / エラーコード

| Code | 说明 / 説明 |
|------|-------------|
| `VALIDATION_ERROR` | 入力値バリデーション失敗 / 输入值验证失败 |
| `NOT_FOUND` | リソースが存在しない / 资源不存在 |
| `CONFLICT` | 重複データ・状態競合 / 重复数据・状态冲突 |
| `UNAUTHORIZED` | 認証が必要・トークン無効 / 需要认证・令牌无效 |
| `FORBIDDEN` | アクセス権限なし / 无访问权限 |
| `RATE_LIMITED` | レート制限超過 / 速率限制超过 |
| `INTERNAL_ERROR` | サーバー内部エラー / 服务器内部错误 |

---

## 6. 速率限制 / レート制限

レスポンスヘッダーに以下を含む：
响应头包含以下信息：

| Header | 说明 / 説明 |
|--------|-------------|
| `X-RateLimit-Limit` | 制限値（リクエスト数/ウィンドウ） / 限制值（请求数/窗口） |
| `X-RateLimit-Remaining` | 残りリクエスト数 / 剩余请求数 |
| `X-RateLimit-Reset` | リセット時刻（Unix timestamp） / 重置时间（Unix 时间戳） |

---

## 7. 数据格式 / データ形式

| 项目 / 項目 | 格式 / 形式 | 示例 / 例 |
|-------------|-------------|-----------|
| ID | UUID v4 | `550e8400-e29b-41d4-a716-446655440000` |
| 日期 / 日時 | ISO 8601 | `2026-03-21T12:00:00.000Z` |

> 响应中 `id` 和 `_id` 都会返回，值相同（向后兼容旧 MongoDB 系统）。
> レスポンスでは `id` と `_id` の両方を返却、値は同一（旧 MongoDB システムとの後方互換性）。

---

## 8. API 端点一览 / API エンドポイント一覧

### 8.1 认证 / 認証 (`/api/auth`)

| Method | Path | 说明 / 説明 |
|--------|------|-------------|
| POST | `/api/auth/login` | 登录（email + password → JWT） / ログイン |
| POST | `/api/auth/register` | 注册 / 新規登録 |
| GET | `/api/auth/me` | 获取当前用户 / 現在のユーザー情報取得 |

### 8.2 商品管理 / 商品管理 (`/api/products`)

| Method | Path | 说明 / 説明 | RBAC |
|--------|------|-------------|------|
| GET | `/api/products` | 一覧（?page, ?limit, ?sku, ?name） | - |
| GET | `/api/products/:id` | 详情 / 詳細 | - |
| POST | `/api/products` | 新建 / 作成（Zod validation） | - |
| PUT | `/api/products/:id` | 全量更新 / 全体更新 | - |
| PATCH | `/api/products/:id` | 部分更新 / 部分更新 | - |
| DELETE | `/api/products/:id` | 删除 / 削除 | - |
| POST | `/api/products/import` | CSV 批量导入 / CSV 一括取込 | - |

### 8.3 入库管理 / 入庫管理 (`/api/inbound-orders`)

| Method | Path | 说明 / 説明 | RBAC |
|--------|------|-------------|------|
| GET | `/api/inbound-orders` | 一覧 | - |
| POST | `/api/inbound-orders` | 新建 / 作成（全字段） | - |
| GET | `/api/inbound-orders/:id` | 详情 / 詳細 | - |
| PUT | `/api/inbound-orders/:id` | 更新（仅草稿 / draft のみ） | - |
| DELETE | `/api/inbound-orders/:id` | 删除（仅草稿 / draft のみ） | - |
| POST | `/api/inbound-orders/:id/confirm` | 确认 / 確定（draft → confirmed） | - |
| POST | `/api/inbound-orders/:id/receive` | 逐行验收 / 行別検品 | - |
| POST | `/api/inbound-orders/:id/bulk-receive` | 批量验收 / 一括検品 | - |
| POST | `/api/inbound-orders/:id/putaway` | 上架 / 棚入れ | - |
| POST | `/api/inbound-orders/:id/complete` | 完成 / 完了 | - |
| POST | `/api/inbound-orders/:id/cancel` | 取消 / キャンセル | - |
| GET | `/api/inbound-orders/history` | 验收历史 / 検品履歴検索 | - |
| GET | `/api/inbound-orders/:id/variance` | 差异报告 / 差異レポート | - |
| POST | `/api/inbound-orders/import` | CSV 导入 / CSV 取込 | - |

### 8.4 出荷管理 / 出荷管理 (`/api/shipment-orders`)

| Method | Path | 说明 / 説明 | RBAC |
|--------|------|-------------|------|
| GET | `/api/shipment-orders` | 一覧（50+ フィルター） | - |
| POST | `/api/shipment-orders/manual/bulk` | 批量创建 / 一括作成 | - |
| GET | `/api/shipment-orders/:id` | 详情 / 詳細 | - |
| PATCH | `/api/shipment-orders/:id` | 部分更新 / 部分更新 | - |
| DELETE | `/api/shipment-orders/:id` | 删除 / 削除 | order:delete |
| POST | `/api/shipment-orders/delete/bulk` | 批量删除 / 一括削除 | order:delete |
| POST | `/api/shipment-orders/status/bulk` | 批量状态变更 / ステータス一括変更 | - |
| POST | `/api/shipment-orders/carrier-receipts/import` | 运单导入 / 送り状取込 | - |

**状态变更操作 / ステータス変更アクション:**
`mark-print-ready`, `mark-printed`, `mark-shipped`, `mark-ec-exported`, `mark-inspected`, `mark-held`, `unhold`, `unconfirm`

### 8.5 库存管理 / 在庫管理 (`/api/inventory`)

| Method | Path | 说明 / 説明 | RBAC |
|--------|------|-------------|------|
| GET | `/api/inventory/stock` | 库存一览 / 在庫一覧（?stockType フィルター） | - |
| GET | `/api/inventory/stock/summary` | 汇总 / サマリー | - |
| GET | `/api/inventory/stock/:productId` | 按商品查询 / 商品別在庫 | - |
| POST | `/api/inventory/adjust` | 库存调整 / 在庫調整 | inventory:adjust |
| POST | `/api/inventory/bulk-adjust` | 批量调整 / 一括調整 | inventory:adjust |
| POST | `/api/inventory/transfer` | 库存转移 / 在庫移動 | inventory:transfer |
| POST | `/api/inventory/reserve-orders` | 预留 / 引当 | inventory:reserve |
| POST | `/api/inventory/cleanup-zero` | 清除零库存 / ゼロ在庫削除 | inventory:admin |
| POST | `/api/inventory/rebuild` | 重建 / リビルド | inventory:admin |
| GET | `/api/inventory/movements` | 移动历史 / 移動履歴 | - |
| GET | `/api/inventory/alerts/low-stock` | 低库存告警 / 低在庫アラート | - |
| GET | `/api/inventory/overview` | 概况 / 概況 | - |
| GET | `/api/inventory/ledger-summary` | 收发汇总 / 受払一覧 | - |

### 8.6 配送商 / 配送業者 (`/api/carriers`, `/api/carrier-automation`)

| Method | Path | 说明 / 説明 |
|--------|------|-------------|
| GET | `/api/carriers` | 配送商一览 / 一覧 |
| GET | `/api/carrier-automation/configs` | 自动化配置一览 / 自動化設定一覧 |
| PUT | `/api/carrier-automation/configs/:type` | 更新配置 / 設定更新 |
| POST | `/api/carrier-automation/yamato-b2/validate` | B2 Cloud 验证 / 検証 |
| POST | `/api/carrier-automation/yamato-b2/export` | B2 Cloud 导出 / エクスポート |
| POST | `/api/carrier-automation/yamato-b2/print` | B2 Cloud PDF 获取 / PDF 取得 |

### 8.7 其他 / その他

| Method | Path | 说明 / 説明 |
|--------|------|-------------|
| GET | `/api/return-orders` | 退货一览 / 返品一覧 |
| POST | `/api/return-orders` | 创建退货 / 返品作成 |
| GET | `/api/billing` | 账单一览 / 請求一覧 |
| GET | `/api/billing/work-charges` | 作业费用 / 作業チャージ |
| GET | `/api/notifications` | 通知一览 / 通知一覧 |
| GET | `/api/daily-reports` | 日报 / 日次レポート |
| POST | `/api/daily-reports/generate` | 生成日报 / レポート生成 |
| GET | `/api/kpi/dashboard` | KPI 仪表盘 / KPI ダッシュボード |
| GET | `/api/locations` | 库位一览 / ロケーション一覧 |
| GET | `/api/warehouses` | 仓库一览 / 倉庫一覧 |
| GET | `/api/clients` | 货主一览 / 荷主一覧 |
| GET | `/api/operation-logs` | 操作日志 / 操作ログ |
| GET | `/api/print-templates` | 打印模板 / 帳票テンプレート |

### 8.8 健康检查 / ヘルスチェック

| Method | Path | 说明 / 説明 |
|--------|------|-------------|
| GET | `/health` | 健康检查 / ヘルスチェック |

---

## 9. 请求/响应示例 / リクエスト・レスポンス例

### 9.1 登录 / ログイン

**Request:**
```http
POST /api/auth/login HTTP/1.1
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "_id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "admin@example.com",
    "name": "管理者",
    "role": "admin",
    "tenantId": "tenant-001"
  }
}
```

### 9.2 商品列表 / 商品一覧

**Request:**
```http
GET /api/products?page=1&limit=50&search=りんご HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response (200):**
```json
{
  "items": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "sku": "APPLE-001",
      "name": "りんごジュース 1L",
      "category": "食品",
      "barcode": ["4901234567890"],
      "price": 198,
      "weight": 1.2,
      "safetyStock": 10,
      "inventoryEnabled": true,
      "createdAt": "2026-03-01T00:00:00.000Z",
      "updatedAt": "2026-03-21T12:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 50
}
```

### 9.3 创建入库单 / 入庫オーダー作成

**Request:**
```http
POST /api/inbound-orders HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json
X-Request-ID: 7c9e6679-7425-40de-944b-e07fc1f90ae7

{
  "clientId": "client-001",
  "warehouseId": "wh-001",
  "expectedDate": "2026-03-25T00:00:00.000Z",
  "notes": "紧急入库 / 緊急入庫",
  "items": [
    {
      "productId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "expectedQuantity": 100,
      "locationCode": "A-01-01"
    }
  ]
}
```

**Response (201):**
```json
{
  "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "status": "draft",
  "clientId": "client-001",
  "warehouseId": "wh-001",
  "expectedDate": "2026-03-25T00:00:00.000Z",
  "notes": "紧急入库 / 緊急入庫",
  "items": [
    {
      "productId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "expectedQuantity": 100,
      "receivedQuantity": 0,
      "locationCode": "A-01-01"
    }
  ],
  "createdAt": "2026-03-21T12:00:00.000Z",
  "updatedAt": "2026-03-21T12:00:00.000Z"
}
```

### 9.4 错误响应示例 / エラーレスポンス例

**验证错误 / バリデーションエラー (400):**
```json
{
  "statusCode": 400,
  "message": "Validation failed: sku is required",
  "error": "VALIDATION_ERROR"
}
```

**未认证 / 未認証 (401):**
```json
{
  "statusCode": 401,
  "message": "Invalid or expired token",
  "error": "UNAUTHORIZED"
}
```

**权限不足 / 権限不足 (403):**
```json
{
  "statusCode": 403,
  "message": "Insufficient permissions: order:delete required",
  "error": "FORBIDDEN"
}
```

**未找到 / 未発見 (404):**
```json
{
  "statusCode": 404,
  "message": "Product not found: a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "error": "NOT_FOUND"
}
```

**速率限制 / レート制限 (429):**
```json
{
  "statusCode": 429,
  "message": "Too many requests. Retry after 60 seconds.",
  "error": "RATE_LIMITED"
}
```

---

## 10. 健康检查 / ヘルスチェック

### GET /health

```json
{
  "status": "ok",
  "version": "0.1.0",
  "timestamp": "2026-03-21T12:00:00.000Z",
  "uptime": 3600,
  "services": {
    "database": { "status": "connected", "latencyMs": 2 },
    "redis": { "status": "connected" }
  },
  "memory": {
    "rss": 67108864,
    "heapUsed": 33554432
  }
}
```
