# ZELIX WMS API 契約仕様書 / API 合约规范文档

> 全 ~492 エンドポイントの完全な API 契約。リクエスト・レスポンス形式、認証、エラーコード、Webhook イベントを網羅。
> 涵盖全部 ~492 个端点的完整 API 合约。包含请求/响应格式、认证、错误码、Webhook 事件。
>
> 最終更新 / 最后更新: 2026-03-21

---

## 目次 / 目录

1. [API 规范总则 / API 規範総則](#1-api-规范总则--api-規範総則)
2. [统一响应格式 / 統一レスポンス形式](#2-统一响应格式--統一レスポンス形式)
3. [统一查询参数 / 統一クエリパラメータ](#3-统一查询参数--統一クエリパラメータ)
4. [认证模块 / 認証モジュール — AuthModule](#4-认证模块--認証モジュール--authmodule7-endpoints)
5. [商品管理 / 商品管理 — ProductsModule](#5-商品管理--商品管理--productsmodule22-endpoints)
6. [库存管理 / 在庫管理 — InventoryModule](#6-库存管理--在庫管理--inventorymodule40-endpoints)
7. [入库管理 / 入庫管理 — InboundModule](#7-入库管理--入庫管理--inboundmodule25-endpoints)
8. [出库管理 / 出荷管理 — ShipmentModule](#8-出库管理--出荷管理--shipmentmodule30-endpoints)
9. [仓库运营 / 倉庫オペレーション — WarehouseModule](#9-仓库运营--倉庫オペレーション--warehousemodule45-endpoints)
10. [退货管理 / 返品管理 — ReturnsModule](#10-退货管理--返品管理--returnsmodule11-endpoints)
11. [计费管理 / 請求管理 — BillingModule](#11-计费管理--請求管理--billingmodule30-endpoints)
12. [配送商 / 配送業者 — CarriersModule](#12-配送商--配送業者--carriersmodule20-endpoints)
13. [客户管理 / 顧客管理 — ClientsModule](#13-客户管理--顧客管理--clientsmodule35-endpoints)
14. [扩展系统 / 拡張システム — ExtensionsModule](#14-扩展系统--拡張システム--extensionsmodule46-endpoints)
15. [外部集成 / 外部連携 — IntegrationsModule](#15-外部集成--外部連携--integrationsmodule35-endpoints)
16. [报表・KPI / レポート・KPI — ReportingModule](#16-报表kpi--レポートkpi--reportingmodule25-endpoints)
17. [通知 / 通知 — NotificationsModule](#17-通知--通知--notificationsmodule15-endpoints)
18. [管理 / 管理 — AdminModule](#18-管理--管理--adminmodule25-endpoints)
19. [数据导入 / データインポート — ImportModule](#19-数据导入--データインポート--importmodule15-endpoints)
20. [渲染 / レンダリング — RenderModule](#20-渲染--レンダリング--rendermodule15-endpoints)
21. [队列 / キュー — QueueModule](#21-队列--キュー--queuemodule5-endpoints)
22. [健康检查 / ヘルスチェック — HealthModule](#22-健康检查--ヘルスチェック--healthmodule3-endpoints)
23. [Webhook 事件契约 / Webhook イベント契約](#23-webhook-事件契约--webhook-イベント契約)
24. [错误码全表 / エラーコード全表](#24-错误码全表--エラーコード全表)

---

## 1. API 规范总则 / API 規範総則

### 1.1 基础 URL / ベース URL

```
生产环境 / 本番: https://api.zelixwms.com/api
开发环境 / 開発: http://localhost:4000/api
```

### 1.2 版本策略 / バージョニング戦略

- URL ベース: `/api/` (v1 暗黙、破壊的変更なし)
- URL 方式：`/api/`（隐含 v1，永不破坏）
- 将来 v2 が必要な場合は `/api/v2/` に追加、v1 は維持
- 未来需要 v2 时追加 `/api/v2/`，v1 永久保留

### 1.3 认证 / 認証

全ての保護エンドポイントは Bearer JWT が必要。
所有受保护端点需要 Bearer JWT。

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

| 项目 / 項目 | 仕様 / 规格 |
|---|---|
| アルゴリズム / 算法 | HS256 固定（混乱攻撃防止 / 防混淆攻击） |
| JWT_SECRET | 本番未設定 → 起動拒否 / 生产环境未设置 → 拒绝启动 |
| トークン有効期限 / 令牌有效期 | 24 時間 / 24 小时 |
| リフレッシュ / 刷新 | `POST /api/auth/refresh-token` |

### 1.4 通用请求头 / 共通リクエストヘッダー

| Header | 必須 / 必须 | 说明 / 説明 |
|--------|:---:|---|
| `Authorization` | Yes* | `Bearer <JWT token>` (*Public エンドポイント以外) |
| `Content-Type` | Yes | `application/json` |
| `X-Request-ID` | No | リクエスト追跡用 UUID / 请求追踪用 UUID |
| `Accept-Language` | No | `ja` / `zh` / `en`（将来対応 / 将来支持） |

### 1.5 速率限制 / レート制限

| 种别 / 種別 | 制限 / 限制 | 窗口 / ウィンドウ |
|---|---|---|
| 認証 / 认证 | 20 req | 15 min |
| 全体 / 全局 | 1000 req | 15 min |
| 書込み / 写入 | 200 req | 15 min |
| ログイン / 登录 | 同一アカウント5回 / 同一账户5次 | 15 min |

レスポンスヘッダー / 响应头：

| Header | 说明 / 説明 |
|--------|---|
| `X-RateLimit-Limit` | 制限値 / 限制值 |
| `X-RateLimit-Remaining` | 残りリクエスト数 / 剩余请求数 |
| `X-RateLimit-Reset` | リセット時刻（Unix timestamp）/ 重置时间（Unix 时间戳） |

### 1.6 数据格式 / データ形式

| 项目 / 項目 | 格式 / 形式 | 示例 / 例 |
|---|---|---|
| ID | UUID v4 (互換: `_id` も返却) | `550e8400-e29b-41d4-a716-446655440000` |
| 日期时间 / 日時 | ISO 8601 | `2026-03-21T12:00:00.000Z` |
| 日期 / 日付 | YYYY/MM/DD | `2026/03/21` |
| 金额 / 金額 | number (小数2桁) | `1234.56` |
| 布尔 / ブール | boolean | `true` / `false` |

---

## 2. 统一响应格式 / 統一レスポンス形式

### 2.1 单体响应 / 単体レスポンス (200/201)

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

> `id` と `_id` は同じ値。旧 MongoDB との後方互換性のため両方返却。
> `id` 和 `_id` 值相同。为与旧 MongoDB 系统向后兼容。

### 2.2 列表响应 / 一覧レスポンス (200)

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
  "error": "VALIDATION_ERROR",
  "details": [
    { "field": "sku", "message": "SKUは必須です" }
  ]
}
```

### 2.4 批量操作响应 / バッチ操作レスポンス (207 Multi-Status)

```json
{
  "message": "登録: 成功3件 / 失敗1件",
  "data": {
    "successCount": 3,
    "failureCount": 1,
    "results": [
      { "index": 0, "success": true, "id": "..." },
      { "index": 3, "success": false, "error": "SKU重複" }
    ]
  }
}
```

### 2.5 删除响应 / 削除レスポンス (204/200)

- `204 No Content`: ソフトデリート成功（ボディなし）/ 软删除成功（无响应体）
- `200 OK`: 削除結果を返す場合 / 需要返回删除结果时

### 2.6 HTTP 状态码使用表 / HTTP ステータスコード使用表

| Code | 含义 / 意味 | 使用场景 / 使用場面 |
|------|---|---|
| `200` | OK | 取得・更新成功 / 取得・更新成功 |
| `201` | Created | 新規作成成功 / 新建成功 |
| `204` | No Content | 削除成功 / 删除成功 |
| `207` | Multi-Status | バッチ操作（部分成功）/ 批量操作（部分成功） |
| `400` | Bad Request | 入力値不正・バリデーション失敗 / 输入值不正确・验证失败 |
| `401` | Unauthorized | 未認証・トークン無効 / 未认证・令牌无效 |
| `403` | Forbidden | 権限不足 / 权限不足 |
| `404` | Not Found | リソース未発見 / 资源未找到 |
| `409` | Conflict | 重複・状態競合 / 重复・状态冲突 |
| `429` | Too Many Requests | レート制限超過 / 速率限制超过 |
| `500` | Internal Server Error | サーバー内部エラー / 服务器内部错误 |
| `503` | Service Unavailable | サービス利用不可 / 服务不可用 |

---

## 3. 统一查询参数 / 統一クエリパラメータ

### 3.1 分页 / ページネーション

| 参数 / パラメータ | 类型 / 型 | 默认 / デフォルト | 说明 / 説明 |
|---|---|:---:|---|
| `page` | number | `1` | ページ番号（1始まり）/ 页码（从1开始） |
| `limit` | number | `50` | 1ページあたり件数（最大200）/ 每页条数（最大200） |

```
GET /api/products?page=2&limit=50
```

### 3.2 排序 / ソート

| 参数 / パラメータ | 类型 / 型 | 默认 / デフォルト | 说明 / 説明 |
|---|---|:---:|---|
| `sort` | string | `createdAt` | ソート対象フィールド / 排序字段 |
| `order` | string | `desc` | `asc` または `desc` / `asc` 或 `desc` |

```
GET /api/products?sort=name&order=asc
```

### 3.3 筛选 / フィルタ

| 参数 / パラメータ | 说明 / 説明 | 示例 / 例 |
|---|---|---|
| `status` | 状態フィルタ / 状态过滤 | `?status=active` |
| `search` | キーワードあいまい検索 / 关键词模糊搜索 | `?search=りんご` |
| `clientId` | 荷主ID / 货主ID | `?clientId=xxx` |
| `warehouseId` | 倉庫ID / 仓库ID | `?warehouseId=xxx` |
| `startDate` | 開始日 / 开始日期 | `?startDate=2026-03-01` |
| `endDate` | 終了日 / 结束日期 | `?endDate=2026-03-31` |
| `stockType` | 在庫種別 / 库存类型 | `?stockType=regular` |

### 3.4 高级过滤（NestJS 移行后）/ 高度なフィルタリング

```
field=value          # 完全一致 / 精确匹配
field__gte=value     # 以上 / 大于等于
field__lte=value     # 以下 / 小于等于
field__in=a,b,c      # 含まれる / 包含
field__like=pattern  # パターンマッチ / 模式匹配
```

---

## 4. 认证模块 / 認証モジュール — AuthModule（7 endpoints）

### POST /api/auth/login
ログイン / 登录

- **認証 / 认证**: 不要 / 不需要
- **ロール / 角色**: -

**Request:**
```json
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

**エラー / 错误:**
- `401`: メール/パスワード不正 / 邮箱/密码错误
- `429`: ログイン試行上限（15分5回）/ 登录尝试上限（15分钟5次）

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"SecurePass123!"}'
```

### POST /api/auth/register
ユーザー登録 / 用户注册

- **認証 / 认证**: 不要 / 不需要
- **ロール / 角色**: -

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "新しいユーザー",
  "role": "operator"
}
```

**Response (201):** 同 login レスポンス / 同 login 响应

### GET /api/auth/me
現在のユーザー情報取得 / 获取当前用户信息

- **認証 / 认证**: 必要 / 需要
- **ロール / 角色**: 全ロール / 所有角色

**Response (200):**
```json
{
  "id": "550e8400-...",
  "_id": "550e8400-...",
  "email": "admin@example.com",
  "name": "管理者",
  "role": "admin",
  "tenantId": "tenant-001",
  "permissions": ["order:delete", "inventory:adjust", "..."]
}
```

### POST /api/auth/logout
ログアウト / 登出 — 認証必要 / 需要认证

### POST /api/auth/refresh-token
トークンリフレッシュ / 刷新令牌 — 認証必要 / 需要认证

### POST /api/portal/login
荷主ポータルログイン / 货主门户登录 — 認証不要 / 无需认证

### POST /api/portal/register
荷主ポータル登録 / 货主门户注册 — 認証不要 / 无需认证

---

## 5. 商品管理 / 商品管理 — ProductsModule（22 endpoints）

### GET /api/products
商品一覧（ページネーション・フィルター）/ 商品列表（分页过滤）

- **ロール / 角色**: viewer+

**Query パラメータ / 查询参数:**

| 参数 | 类型 | 说明 |
|---|---|---|
| `page` | number | ページ番号 / 页码 |
| `limit` | number | 件数 / 条数 |
| `search` | string | SKU/名前あいまい検索 / SKU/名称模糊搜索 |
| `category` | string | カテゴリフィルタ / 类别过滤 |
| `sort` | string | ソートフィールド / 排序字段 |
| `order` | string | asc/desc |

**Response (200):**
```json
{
  "items": [
    {
      "id": "a1b2c3d4-...",
      "_id": "a1b2c3d4-...",
      "sku": "APPLE-001",
      "name": "りんごジュース 1L",
      "nameFull": "青森産りんごジュース 1000ml",
      "barcode": ["4901234567890"],
      "coolType": "0",
      "category": "食品",
      "price": 198,
      "weight": 1.2,
      "width": 8.0,
      "depth": 8.0,
      "height": 26.0,
      "safetyStock": 10,
      "inventoryEnabled": true,
      "lotTrackingEnabled": false,
      "expiryTrackingEnabled": true,
      "alertDaysBeforeExpiry": 30,
      "allocationRule": "FIFO",
      "subSkus": [
        { "subSku": "APPLE-001-6P", "price": 1100, "description": "6本パック", "isActive": true }
      ],
      "customField1": "自社コード: Z001",
      "createdAt": "2026-03-01T00:00:00.000Z",
      "updatedAt": "2026-03-21T12:00:00.000Z"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 50
}
```

```bash
curl -X GET "http://localhost:4000/api/products?page=1&limit=50&search=りんご" \
  -H "Authorization: Bearer eyJ..."
```

### POST /api/products
商品新規作成 / 创建新商品

- **ロール / 角色**: operator+

**Request (Zod validated):**
```json
{
  "sku": "APPLE-001",
  "name": "りんごジュース 1L",
  "nameFull": "青森産りんごジュース 1000ml",
  "barcode": ["4901234567890"],
  "coolType": "0",
  "category": "食品",
  "mailCalcEnabled": false,
  "price": 198,
  "weight": 1.2,
  "width": 8.0,
  "depth": 8.0,
  "height": 26.0,
  "safetyStock": 10,
  "inventoryEnabled": true,
  "lotTrackingEnabled": false,
  "expiryTrackingEnabled": true,
  "alertDaysBeforeExpiry": 30,
  "allocationRule": "FIFO",
  "serialTrackingEnabled": false,
  "subSkus": [
    { "subSku": "APPLE-001-6P", "price": 1100, "description": "6本パック" }
  ],
  "handlingTypes": ["割れ物"],
  "memo": "冷蔵保管必要 / 需要冷藏保管"
}
```

**バリデーション / 验证规则:**
- `sku`: 必須、trim、1文字以上 / 必填，trim，1字符以上
- `name`: 必須、trim、1文字以上 / 必填，trim，1字符以上
- `price`: 0以上（オプション）/ >= 0（可选）
- `weight`: 0以上（オプション）/ >= 0（可选）
- `safetyStock`: 非負整数 / 非负整数
- `allocationRule`: FIFO | FEFO | LIFO
- `coolType`: "0"(常温) | "1"(冷蔵) | "2"(冷凍)
- `subSkus`: 子SKU重複禁止、親SKUと同じ禁止 / 子SKU不可重复，不可与父SKU相同

**Response (201):** 作成されたプロダクトオブジェクト / 创建的商品对象

**エラー / 错误:**
- `400 VALIDATION_ERROR`: 必須フィールド未入力 / 必填字段缺失
- `409 CONFLICT`: SKU重複 / SKU 重复

### GET /api/products/:id
商品詳細取得 / 获取商品详情 — viewer+

### PUT /api/products/:id
商品全体更新 / 全量更新商品 — operator+

### PATCH /api/products/:id
商品部分更新 / 部分更新商品 — operator+ (部分フィールドのみ)

### DELETE /api/products/:id
商品ソフトデリート / 软删除商品 — manager+

### GET /api/products/resolve/:sku
SKUで商品検索 / 按SKU搜索商品 — viewer+

### GET /api/products/shipment-stats
商品別出荷統計 / 按商品出货统计 — viewer+ (`?dateFrom=&dateTo=&limit=`)

### POST /api/products/batch
ID指定で複数商品取得 / 按ID批量获取商品 — viewer+

**Request:**
```json
{ "ids": ["id-1", "id-2", "id-3"] }
```

### POST /api/products/check-sku-availability
SKU使用可否チェック / SKU可用性检查 — viewer+

**Request:**
```json
{ "sku": "NEW-SKU-001" }
```
**Response:**
```json
{ "available": true }
```

### POST /api/products/validate-import
インポートデータ事前バリデーション / 导入数据预验证 — operator+

### POST /api/products/import-bulk
商品一括インポート / 商品批量导入 — operator+

### POST /api/products/import-with-strategy
競合戦略付きインポート / 带冲突策略导入 — operator+

**Request:**
```json
{
  "products": [{ "sku": "...", "name": "..." }],
  "strategy": "skip"
}
```
`strategy`: `skip` | `overwrite` | `merge`

### POST /api/products/upload-image
商品画像アップロード / 商品图片上传 — operator+ (multipart/form-data, max 5MB)

### PATCH /api/products/bulk
商品一括更新 / 商品批量更新 — operator+

**Request:**
```json
{
  "updates": [
    { "id": "xxx", "data": { "price": 250 } },
    { "id": "yyy", "data": { "safetyStock": 20 } }
  ]
}
```

### 资材 / 資材 (Materials)

| Method | Path | 说明 | Role |
|---|---|---|---|
| GET | `/api/materials` | 資材一覧 / 材料列表 | viewer+ |
| GET | `/api/materials/:id` | 資材詳細 / 材料详情 | viewer+ |
| POST | `/api/materials` | 資材作成 / 创建材料 | operator+ |
| PUT | `/api/materials/:id` | 資材更新 / 更新材料 | operator+ |
| DELETE | `/api/materials/:id` | 資材削除 / 删除材料 | manager+ |

### 套装商品 / セット商品 (Set Products)

| Method | Path | 说明 | Role |
|---|---|---|---|
| GET | `/api/set-products` | セット商品一覧 / 套装商品列表 | viewer+ |
| GET | `/api/set-products/:id` | セット商品詳細 / 套装商品详情 | viewer+ |
| POST | `/api/set-products` | セット商品作成 / 创建套装商品 | operator+ |
| PUT | `/api/set-products/:id` | セット商品更新 / 更新套装商品 | operator+ |
| DELETE | `/api/set-products/:id` | セット商品削除 / 删除套装商品 | manager+ |

---

## 6. 库存管理 / 在庫管理 — InventoryModule（40 endpoints）

### GET /api/inventory/stock
在庫一覧（ページネーション付き）/ 库存列表（带分页）

- **ロール / 角色**: viewer+

**Query パラメータ / 查询参数:**

| 参数 | 类型 | 说明 |
|---|---|---|
| `page` | number | ページ番号 / 页码（デフォルト: 1）|
| `limit` | number | 件数 / 条数（デフォルト: 50、最大: 200）|
| `productId` | string | 商品IDフィルタ / 商品ID过滤 |
| `productSku` | string | 商品SKUフィルタ / 商品SKU过滤 |
| `locationId` | string | ロケーションIDフィルタ / 库位ID过滤 |
| `showZero` | boolean | ゼロ在庫表示 / 显示零库存 |
| `stockType` | string | 在庫種別 / 库存类型（regular, damaged, hold, returns）|

**Response (200):**
```json
{
  "items": [
    {
      "id": "...",
      "productId": "...",
      "productSku": "APPLE-001",
      "productName": "りんごジュース 1L",
      "locationId": "...",
      "locationCode": "A-01-01",
      "quantity": 100,
      "reservedQuantity": 10,
      "availableQuantity": 90,
      "lotId": "...",
      "lotNumber": "LOT-2026-001",
      "expiryDate": "2027-03-01"
    }
  ],
  "total": 500,
  "page": 1,
  "limit": 50
}
```

```bash
curl -X GET "http://localhost:4000/api/inventory/stock?stockType=regular&page=1&limit=50" \
  -H "Authorization: Bearer eyJ..."
```

### GET /api/inventory/stock/summary
在庫サマリー（商品単位）/ 库存汇总（按商品）— viewer+

**Query:** `?search=&stockType=&page=&limit=`

### GET /api/inventory/stock/:productId
商品別在庫詳細 / 按商品库存详情 — viewer+

### GET /api/inventory/overview
在庫概要ダッシュボード / 库存概览仪表盘 — viewer+

### GET /api/inventory/location-usage
ロケーション使用率 / 库位使用率 — viewer+

### POST /api/inventory/adjust
在庫調整 / 库存调整

- **ロール / 角色**: manager+ (`inventory:adjust` permission)

**Request:**
```json
{
  "productId": "a1b2c3d4-...",
  "locationId": "loc-001",
  "quantity": -5,
  "reason": "棚卸差異 / 盘点差异",
  "lotId": "lot-001"
}
```

**Response (200):**
```json
{
  "message": "在庫調整が完了しました",
  "adjustment": {
    "productId": "a1b2c3d4-...",
    "previousQuantity": 100,
    "adjustedQuantity": -5,
    "newQuantity": 95
  }
}
```

### POST /api/inventory/bulk-adjust
一括在庫調整 / 批量库存调整 — manager+ (`inventory:adjust`)

**Request:**
```json
{
  "adjustments": [
    { "productId": "...", "locationId": "...", "quantity": -5, "reason": "..." },
    { "productId": "...", "locationId": "...", "quantity": 10, "reason": "..." }
  ]
}
```

### POST /api/inventory/transfer
ロケーション間移動 / 库位间移动 — operator+ (`inventory:transfer`)

**Request:**
```json
{
  "productId": "a1b2c3d4-...",
  "fromLocationId": "loc-001",
  "toLocationId": "loc-002",
  "quantity": 20,
  "lotId": "lot-001",
  "reason": "棚替え / 换架"
}
```

### POST /api/inventory/reserve-orders
出荷向け在庫引当 / 出库库存预留 — operator+ (`inventory:reserve`)

**Request:**
```json
{
  "orderIds": ["order-001", "order-002"]
}
```

### POST /api/inventory/cleanup-zero
ゼロ在庫クリーンアップ / 清理零库存 — admin (`inventory:admin`)

**Response:** `{ "deletedCount": 15 }`

### POST /api/inventory/rebuild
在庫再構築 / 库存重建 — admin (`inventory:admin`)

**Query:** `?fix=true|false`（デフォルト: false / 默认: false）

### POST /api/inventory/release-expired-reservations
期限切れ引当解放 / 释放过期预留 — admin (`inventory:admin`)

**Query:** `?timeoutMinutes=30`

### GET /api/inventory/movements
在庫移動履歴 / 库存移动历史 — viewer+

**Query:** `?page=&limit=&productId=&startDate=&endDate=`

### GET /api/inventory/alerts/low-stock
在庫不足アラート / 库存不足警报 — viewer+

### GET /api/inventory/ledger-summary
受払一覧 / 收发台账 — viewer+

**Query（必須）:** `?startDate=2026-03-01&endDate=2026-03-31&productId=`

### 库位 / ロケーション (Locations)

| Method | Path | 说明 | Role |
|---|---|---|---|
| GET | `/api/locations` | ロケーション一覧 / 库位列表 | viewer+ |
| GET | `/api/locations/:id` | ロケーション詳細 / 库位详情 | viewer+ |
| POST | `/api/locations` | ロケーション作成 / 创建库位 | manager+ |
| PUT | `/api/locations/:id` | ロケーション更新 / 更新库位 | manager+ |
| DELETE | `/api/locations/:id` | ロケーション削除 / 删除库位 | admin |
| POST | `/api/locations/bulk` | 一括作成 / 批量创建 | manager+ |
| GET | `/api/locations/tree` | ツリー構造 / 树形结构 | viewer+ |

### 批次 / ロット (Lots)

| Method | Path | 说明 | Role |
|---|---|---|---|
| GET | `/api/lots` | ロット一覧 / 批次列表 | viewer+ |
| GET | `/api/lots/:id` | ロット詳細 / 批次详情 | viewer+ |
| POST | `/api/lots` | ロット作成 / 创建批次 | operator+ |
| PUT | `/api/lots/:id` | ロット更新 / 更新批次 | operator+ |
| DELETE | `/api/lots/:id` | ロット削除 / 删除批次 | manager+ |

### 序列号 / シリアル番号 (Serial Numbers)

| Method | Path | 说明 | Role |
|---|---|---|---|
| GET | `/api/serial-numbers` | シリアル番号一覧 / 序列号列表 | viewer+ |
| GET | `/api/serial-numbers/:id` | シリアル番号詳細 / 序列号详情 | viewer+ |
| POST | `/api/serial-numbers` | シリアル番号登録 / 登录序列号 | operator+ |
| PUT | `/api/serial-numbers/:id` | シリアル番号更新 / 更新序列号 | operator+ |
| DELETE | `/api/serial-numbers/:id` | シリアル番号削除 / 删除序列号 | manager+ |

### 库存类别 / 在庫カテゴリ

| Method | Path | 说明 | Role |
|---|---|---|---|
| GET | `/api/inventory-categories` | カテゴリ一覧 / 类别列表 | viewer+ |
| GET | `/api/inventory-categories/:id` | カテゴリ詳細 / 类别详情 | viewer+ |
| POST | `/api/inventory-categories` | カテゴリ作成 / 创建类别 | manager+ |
| PUT | `/api/inventory-categories/:id` | カテゴリ更新 / 更新类别 | manager+ |
| DELETE | `/api/inventory-categories/:id` | カテゴリ削除 / 删除类别 | admin |

### 收发台账 / 受払台帳

| Method | Path | 说明 | Role |
|---|---|---|---|
| GET | `/api/inventory-ledger` | 台帳一覧 / 台账列表 | viewer+ |
| GET | `/api/inventory-ledger/summary` | 台帳サマリー / 台账汇总 | viewer+ |
| POST | `/api/inventory-ledger/export` | 台帳エクスポート / 台账导出 | viewer+ |

---

## 7. 入库管理 / 入庫管理 — InboundModule（25 endpoints）

### POST /api/inbound-orders
入庫指示作成 / 创建入库指示

- **ロール / 角色**: operator+

**Request:**
```json
{
  "clientId": "client-001",
  "warehouseId": "wh-001",
  "expectedDate": "2026-03-25T00:00:00.000Z",
  "notes": "紧急入库 / 緊急入庫",
  "items": [
    {
      "productId": "a1b2c3d4-...",
      "expectedQuantity": 100,
      "locationCode": "A-01-01"
    }
  ]
}
```

**Response (201):**
```json
{
  "id": "b2c3d4e5-...",
  "_id": "b2c3d4e5-...",
  "status": "draft",
  "clientId": "client-001",
  "items": [{ "productId": "...", "expectedQuantity": 100, "receivedQuantity": 0 }],
  "createdAt": "2026-03-21T12:00:00.000Z"
}
```

### 入库指示完整端点表 / 入庫指示エンドポイント一覧

| Method | Path | 说明 | Role |
|---|---|---|---|
| GET | `/api/inbound-orders` | 一覧 / 列表 | viewer+ |
| POST | `/api/inbound-orders` | 作成 / 创建 | operator+ |
| GET | `/api/inbound-orders/history` | 入庫履歴 / 入库历史 | viewer+ |
| POST | `/api/inbound-orders/import` | CSV取込 / CSV导入 | operator+ |
| GET | `/api/inbound-orders/:id` | 詳細 / 详情 | viewer+ |
| PUT | `/api/inbound-orders/:id` | 更新（draft のみ）/ 更新（仅draft） | operator+ |
| DELETE | `/api/inbound-orders/:id` | 削除（draft のみ）/ 删除（仅draft） | manager+ |
| POST | `/api/inbound-orders/:id/confirm` | 確定 / 确认（draft → confirmed） | operator+ |
| POST | `/api/inbound-orders/:id/receive` | 行別検品 / 逐行检品 | operator+ |
| POST | `/api/inbound-orders/:id/bulk-receive` | 一括検品 / 批量检品 | operator+ |
| POST | `/api/inbound-orders/:id/putaway` | 棚入れ / 上架 | operator+ |
| GET | `/api/inbound-orders/:id/suggest-locations` | 棚入れ候補 / 上架推荐 | operator+ |
| GET | `/api/inbound-orders/:id/variance` | 差異レポート / 差异报告 | viewer+ |
| POST | `/api/inbound-orders/:id/complete` | 完了 / 完成 | operator+ |
| POST | `/api/inbound-orders/:id/cancel` | キャンセル / 取消 | manager+ |

### 通过型入库 / 通過型入庫 (Passthrough)

| Method | Path | 说明 | Role |
|---|---|---|---|
| GET | `/api/passthrough` | 一覧 / 列表 | viewer+ |
| GET | `/api/passthrough/:id` | 詳細 / 详情 | viewer+ |
| POST | `/api/passthrough` | 作成 / 创建 | operator+ |
| PUT | `/api/passthrough/:id` | 更新 | operator+ |
| DELETE | `/api/passthrough/:id` | 削除 / 删除 | manager+ |
| POST | `/api/passthrough/:id/confirm` | 確定 / 确认 | operator+ |
| POST | `/api/passthrough/:id/receive` | 検品 / 检品 | operator+ |
| POST | `/api/passthrough/:id/complete` | 完了 / 完成 | operator+ |
| POST | `/api/passthrough/:id/cancel` | キャンセル / 取消 | manager+ |
| POST | `/api/passthrough/import` | CSV取込 / CSV导入 | operator+ |

---

## 8. 出库管理 / 出荷管理 — ShipmentModule（30 endpoints）

### GET /api/shipment-orders
出荷指示一覧（50+フィルター）/ 出库指示列表（50+过滤）

- **ロール / 角色**: viewer+

**Query パラメータ（主要）/ 查询参数（主要）:**

| 参数 | 类型 | 说明 |
|---|---|---|
| `page` | number | ページ番号 / 页码 |
| `limit` / `pageSize` | number | 件数 / 条数（最大200）|
| `sortBy` | string | ソートフィールド / 排序字段 |
| `sortOrder` | string | asc/desc |
| `status` | string | ステータスフィルタ / 状态过滤 |
| `carrierId` | string | 配送業者フィルタ / 配送商过滤 |
| `search` | string | 管理番号・受取人検索 / 管理号・收件人搜索 |
| `startDate` | string | 開始日 / 开始日期 |
| `endDate` | string | 終了日 / 结束日期 |
| `orderGroupId` | string | グループフィルタ / 分组过滤 |
| `invoiceType` | string | 送り状種類 / 运单类型 |

### POST /api/shipment-orders/manual/bulk
手動一括作成 / 手动批量创建

- **ロール / 角色**: operator+

**Request:**
```json
{
  "items": [
    {
      "order": {
        "carrierId": "yamato",
        "customerManagementNumber": "ORD-2026-001",
        "recipient": {
          "postalCode": "1000001",
          "prefecture": "東京都",
          "city": "千代田区",
          "street": "千代田1-1",
          "building": "",
          "name": "山田太郎",
          "phone": "0312345678"
        },
        "sender": {
          "postalCode": "5300001",
          "prefecture": "大阪府",
          "city": "大阪市北区",
          "street": "梅田1-1",
          "building": "ビル3F",
          "name": "ZELIX倉庫",
          "phone": "0612345678"
        },
        "products": [
          { "inputSku": "APPLE-001", "quantity": 2 }
        ],
        "shipPlanDate": "2026/03/25",
        "invoiceType": "0",
        "coolType": "0"
      }
    }
  ]
}
```

**Response (201/207):**
```json
{
  "message": "注文が正常に作成されました",
  "data": {
    "successCount": 1,
    "failureCount": 0,
    "results": [{ "index": 0, "success": true, "id": "..." }]
  }
}
```

**バリデーション / 验证规则（Zod schema）:**
- `carrierId`: 必須 / 必填
- `customerManagementNumber`: 必須、半角英数字 + ハイフン・アンダースコア、最大50文字 / 必填，半角字母数字，最大50字符
- `recipient`: 全フィールド必須（postalCode 7桁、phone 数字のみ）/ 全字段必填
- `products`: 1件以上、各 `inputSku` 必須・`quantity` 正の整数 / 至少1个
- `shipPlanDate`: YYYY/MM/DD 形式 / YYYY/MM/DD 格式
- `invoiceType`: "0"-"9","A" のいずれか / 枚举值
- `coolType`: 発払い(0)/コレクト(2)/着払い(5) 以外はクール不可 / 仅特定运单类型支持冷链

### 出荷指示完整端点表 / 出庫指示エンドポイント一覧

| Method | Path | 说明 | Role |
|---|---|---|---|
| GET | `/api/shipment-orders` | 一覧（50+フィルター）/ 列表 | viewer+ |
| GET | `/api/shipment-orders/group-counts` | グループ集計 / 分组统计 | viewer+ |
| POST | `/api/shipment-orders/manual/bulk` | 手動一括作成 / 手动批量创建 | operator+ |
| POST | `/api/shipment-orders/by-ids` | ID指定一括取得 / 按ID批量获取 | viewer+ |
| POST | `/api/shipment-orders/status/bulk` | 一括ステータス変更 / 批量状态变更 | operator+ |
| POST | `/api/shipment-orders/delete/bulk` | 一括削除 / 批量删除 | manager+ (order:delete) |
| POST | `/api/shipment-orders/carrier-receipts/import` | 送り状番号取込 / 导入运单号 | operator+ |
| PATCH | `/api/shipment-orders/bulk` | 一括更新 / 批量更新 | operator+ |
| GET | `/api/shipment-orders/:id` | 詳細 / 详情 | viewer+ |
| PUT | `/api/shipment-orders/:id` | 全体更新 / 全量更新 | operator+ |
| DELETE | `/api/shipment-orders/:id` | 削除 / 删除 | manager+ (order:delete) |
| POST | `/api/shipment-orders/:id/status` | ステータス変更 / 状态变更 | operator+ |

**ステータスアクション / 状态操作:**
`mark-print-ready`, `mark-printed`, `mark-shipped`, `mark-ec-exported`, `mark-inspected`, `mark-held`, `unhold`, `unconfirm`

### 保管型出库 / 保管型出庫

| Method | Path | 说明 | Role |
|---|---|---|---|
| GET | `/api/outbound-requests` | 一覧 / 列表 | viewer+ |
| GET | `/api/outbound-requests/:id` | 詳細 / 详情 | viewer+ |
| POST | `/api/outbound-requests` | 作成 / 创建 | operator+ |
| PUT | `/api/outbound-requests/:id` | 更新 | operator+ |
| DELETE | `/api/outbound-requests/:id` | 削除 / 删除 | manager+ |
| POST | `/api/outbound-requests/:id/approve` | 承認 / 审批 | manager+ |
| POST | `/api/outbound-requests/:id/complete` | 完了 / 完成 | operator+ |
| POST | `/api/outbound-requests/:id/cancel` | キャンセル / 取消 | manager+ |

---

## 9. 仓库运营 / 倉庫オペレーション — WarehouseModule（45 endpoints）

### 仓库管理 / 倉庫管理

| Method | Path | 说明 | Role |
|---|---|---|---|
| GET | `/api/warehouses` | 倉庫一覧 / 仓库列表 | viewer+ |
| GET | `/api/warehouses/:id` | 倉庫詳細 / 仓库详情 | viewer+ |
| POST | `/api/warehouses` | 倉庫作成 / 创建仓库 | admin |
| PUT | `/api/warehouses/:id` | 倉庫更新 / 更新仓库 | admin |
| DELETE | `/api/warehouses/:id` | 倉庫削除 / 删除仓库 | admin |

### 波次 / ウェーブ

| Method | Path | 说明 | Role |
|---|---|---|---|
| GET | `/api/waves` | ウェーブ一覧 / 波次列表 | viewer+ |
| GET | `/api/waves/:id` | ウェーブ詳細 / 波次详情 | viewer+ |
| POST | `/api/waves` | ウェーブ作成 / 创建波次 | operator+ |
| PUT | `/api/waves/:id` | ウェーブ更新 / 更新波次 | operator+ |
| DELETE | `/api/waves/:id` | ウェーブ削除 / 删除波次 | manager+ |
| POST | `/api/waves/:id/release` | リリース / 释放 | operator+ |
| POST | `/api/waves/:id/complete` | 完了 / 完成 | operator+ |

### 任务管理 / タスク管理

| Method | Path | 说明 | Role |
|---|---|---|---|
| GET | `/api/tasks` | タスク一覧 / 任务列表 | viewer+ |
| GET | `/api/tasks/:id` | タスク詳細 / 任务详情 | viewer+ |
| POST | `/api/tasks` | タスク作成 / 创建任务 | operator+ |
| PUT | `/api/tasks/:id` | タスク更新 / 更新任务 | operator+ |
| PATCH | `/api/tasks/:id/complete` | 完了 / 完成 | operator+ |
| PATCH | `/api/tasks/:id/assign` | 割当 / 分配 | operator+ |
| DELETE | `/api/tasks/:id` | 削除 / 删除 | manager+ |

### 检品 / 検品

| Method | Path | 说明 | Role |
|---|---|---|---|
| GET | `/api/inspections` | 検品記録一覧 / 检品记录列表 | viewer+ |
| GET | `/api/inspections/:id` | 検品記録詳細 / 检品记录详情 | viewer+ |
| POST | `/api/inspections` | 検品記録作成 / 创建检品记录 | operator+ |
| PUT | `/api/inspections/:id` | 検品記録更新 / 更新检品记录 | operator+ |
| DELETE | `/api/inspections/:id` | 検品記録削除 / 删除检品记录 | manager+ |

### 贴标 / ラベリング

| Method | Path | 说明 | Role |
|---|---|---|---|
| GET | `/api/labeling-tasks` | タスク一覧 / 任务列表 | viewer+ |
| GET | `/api/labeling-tasks/:id` | タスク詳細 / 任务详情 | viewer+ |
| POST | `/api/labeling-tasks` | タスク作成 / 创建 | operator+ |
| PUT | `/api/labeling-tasks/:id` | タスク更新 / 更新 | operator+ |
| PATCH | `/api/labeling-tasks/:id/complete` | 完了 / 完成 | operator+ |
| DELETE | `/api/labeling-tasks/:id` | 削除 / 删除 | manager+ |

### 盘点 / 棚卸

| Method | Path | 说明 | Role |
|---|---|---|---|
| GET | `/api/stocktaking-orders` | 棚卸指示一覧 / 盘点指示列表 | viewer+ |
| GET | `/api/stocktaking-orders/:id` | 棚卸指示詳細 / 盘点指示详情 | viewer+ |
| POST | `/api/stocktaking-orders` | 棚卸指示作成 / 创建盘点指示 | manager+ |
| PUT | `/api/stocktaking-orders/:id` | 棚卸指示更新 / 更新盘点指示 | manager+ |
| DELETE | `/api/stocktaking-orders/:id` | 棚卸指示削除 / 删除盘点指示 | admin |
| POST | `/api/stocktaking-orders/:id/count` | カウント登録 / 登记计数 | operator+ |
| POST | `/api/stocktaking-orders/:id/complete` | 棚卸完了 / 盘点完成 | manager+ |
| POST | `/api/stocktaking-orders/:id/cancel` | キャンセル / 取消 | manager+ |

### 循环盘点 / 循環棚卸

| Method | Path | 说明 | Role |
|---|---|---|---|
| GET | `/api/cycle-counts` | 一覧 / 列表 | viewer+ |
| GET | `/api/cycle-counts/:id` | 詳細 / 详情 | viewer+ |
| POST | `/api/cycle-counts` | 作成 / 创建 | manager+ |
| PUT | `/api/cycle-counts/:id` | 更新 | manager+ |
| DELETE | `/api/cycle-counts/:id` | 削除 / 删除 | admin |
| POST | `/api/cycle-counts/:id/execute` | 実行 / 执行 | operator+ |

---

## 10. 退货管理 / 返品管理 — ReturnsModule（11 endpoints）

### POST /api/return-orders
返品作成 / 创建退货

- **ロール / 角色**: operator+

**Request (Zod validated):**
```json
{
  "shipmentOrderId": "order-001",
  "returnReason": "customer_request",
  "reasonDetail": "サイズ違い / 尺寸不对",
  "lines": [
    {
      "productId": "prod-001",
      "productSku": "APPLE-001",
      "quantity": 2,
      "locationId": "loc-returns",
      "lotId": "lot-001"
    }
  ]
}
```

`returnReason` 枚举: `customer_request` | `defective` | `wrong_item` | `damaged` | `other`

### 退货完整端点表 / 返品エンドポイント一覧

| Method | Path | 说明 | Role |
|---|---|---|---|
| GET | `/api/return-orders` | 一覧 / 列表 | viewer+ |
| POST | `/api/return-orders` | 作成 / 创建 | operator+ |
| POST | `/api/return-orders/bulk-create` | 一括作成 / 批量创建 | operator+ |
| GET | `/api/return-orders/dashboard-stats` | 統計 / 统计 | viewer+ |
| GET | `/api/return-orders/:id` | 詳細 / 详情 | viewer+ |
| PUT | `/api/return-orders/:id` | 更新 | operator+ |
| DELETE | `/api/return-orders/:id` | 削除 / 删除 | manager+ |
| POST | `/api/return-orders/:id/start-inspection` | 検品開始 / 开始检品 | operator+ |
| POST | `/api/return-orders/:id/inspect` | 検品結果登録 / 登录检品结果 | operator+ |
| POST | `/api/return-orders/:id/complete` | 完了 / 完成 | operator+ |
| POST | `/api/return-orders/:id/cancel` | キャンセル / 取消 | manager+ |

### POST /api/return-orders/:id/inspect
検品結果登録 / 登录检品结果

**Request (Zod validated):**
```json
{
  "lines": [
    {
      "lineIndex": 0,
      "inspectedQuantity": 2,
      "disposition": "restock",
      "restockedQuantity": 2,
      "disposedQuantity": 0,
      "locationId": "loc-001",
      "inspectionNotes": "状態良好 / 状态良好"
    }
  ]
}
```

`disposition` 枚举: `pending` | `restock` | `dispose` | `repair`

---

## 11. 计费管理 / 請求管理 — BillingModule（30 endpoints）

| Method | Path | 说明 | Role |
|---|---|---|---|
| GET | `/api/billing` | 請求一覧 / 账单列表 | viewer+ |
| GET | `/api/billing/:id` | 請求詳細 / 账单详情 | viewer+ |
| POST | `/api/billing/generate-monthly` | 月次請求生成 / 月度计费生成 | admin |
| GET | `/api/billing/dashboard` | 請求ダッシュボード / 计费仪表盘 | manager+ |
| GET | `/api/billing/work-charges` | 作業費一覧 / 作业费列表 | viewer+ |
| GET | `/api/billing/work-charges/:id` | 作業費詳細 / 作业费详情 | viewer+ |
| POST | `/api/billing/work-charges` | 作業費作成 / 创建作业费 | manager+ |
| PUT | `/api/billing/work-charges/:id` | 作業費更新 / 更新作业费 | manager+ |
| DELETE | `/api/billing/work-charges/:id` | 作業費削除 / 删除作业费 | admin |
| GET | `/api/service-rates` | サービス料金一覧 / 服务费率列表 | viewer+ |
| POST/PUT/DELETE | `/api/service-rates[/:id]` | サービス料金 CRUD / 服务费率增删改 | admin |
| GET | `/api/shipping-rates` | 配送料金一覧 / 配送费率列表 | viewer+ |
| POST/PUT/DELETE | `/api/shipping-rates[/:id]` | 配送料金 CRUD / 配送费率增删改 | admin |

---

## 12. 配送商 / 配送業者 — CarriersModule（20 endpoints）

### 配送商管理 / 配送業者管理

| Method | Path | 说明 | Role |
|---|---|---|---|
| GET | `/api/carriers` | 配送業者一覧 / 配送商列表 | viewer+ |
| GET | `/api/carriers/:id` | 配送業者詳細 / 配送商详情 | viewer+ |
| POST | `/api/carriers` | 配送業者作成 / 创建配送商 | admin |
| PUT | `/api/carriers/:id` | 配送業者更新 / 更新配送商 | admin |
| DELETE | `/api/carriers/:id` | 配送業者削除 / 删除配送商 | admin |

**POST /api/carriers Request (Zod):**
```json
{
  "code": "yamato",
  "name": "ヤマト運輸",
  "description": "宅急便",
  "enabled": true,
  "trackingIdColumnName": "伝票番号",
  "formatDefinition": {
    "columns": [
      { "name": "お届け先電話番号", "type": "string", "required": true, "userUploadable": true }
    ]
  },
  "services": [
    { "invoiceType": "0", "printTemplateId": "tpl-001" }
  ]
}
```

### 配送自动化 / 配送自動化設定

| Method | Path | 说明 | Role |
|---|---|---|---|
| GET | `/api/carrier-automation/configs` | 設定一覧 / 设置列表 | manager+ |
| GET | `/api/carrier-automation/configs/:type` | 設定詳細 / 设置详情 | manager+ |
| PUT | `/api/carrier-automation/configs/:type` | 設定更新 / 更新设置 | manager+ |
| DELETE | `/api/carrier-automation/configs/:type` | 設定削除 / 删除设置 | manager+ |
| POST | `/api/carrier-automation/configs/:type/test` | 接続テスト / 连接测试 | manager+ |

### Yamato B2 Cloud ★变更禁止 / 変更禁止★

| Method | Path | 说明 | Role |
|---|---|---|---|
| POST | `/api/carrier-automation/yamato-b2/validate` | バリデーション / 验证 | operator+ |
| POST | `/api/carrier-automation/yamato-b2/export` | エクスポート / 导出 | operator+ |
| POST | `/api/carrier-automation/yamato-b2/print` | PDF生成 / 生成PDF | operator+ |
| POST | `/api/carrier-automation/yamato-b2/pdf/batch` | 一括PDF / 批量PDF | operator+ |
| POST | `/api/carrier-automation/yamato-b2/import` | 取込 / 导入 | operator+ |
| GET | `/api/carrier-automation/yamato-b2/history` | 履歴 / 历史 | operator+ |
| POST | `/api/carrier-automation/yamato-b2/unconfirm` | 確定取消 / 取消确认 | operator+ |

### 共通操作 / 共通操作

| Method | Path | 说明 | Role |
|---|---|---|---|
| POST | `/api/carrier-automation/change-invoice-type` | 送り状種類変更 / 变更运单类型 | operator+ |
| POST | `/api/carrier-automation/split-order` | 注文分割 / 订单拆分 | operator+ |

**POST /api/carrier-automation/split-order Request (Zod):**
```json
{
  "orderId": "order-001",
  "splitGroups": [
    { "products": [{ "productIndex": 0, "quantity": 1 }] },
    { "products": [{ "productIndex": 0, "quantity": 2 }] }
  ],
  "skipCarrierDelete": false
}
```

---

## 13. 客户管理 / 顧客管理 — ClientsModule（35 endpoints）

### 标准 CRUD 模式 / 標準 CRUD パターン

以下のリソースは全て同じ CRUD パターン（GET一覧, GET詳細, POST作成, PUT更新, DELETE削除）
以下资源均遵循相同 CRUD 模式：

| リソース / 资源 | Path | 说明 | CRUD Roles |
|---|---|---|---|
| 荷主 / 货主 | `/api/clients` | 荷主管理 / 货主管理 | viewer+ / admin |
| サブ荷主 / 子货主 | `/api/sub-clients` | サブ荷主管理 / 子货主管理 | viewer+ / manager+ |
| 店舗 / 店铺 | `/api/shops` | 店舗管理 / 店铺管理 | viewer+ / manager+ |
| 顧客 / 客户 | `/api/customers` | エンドカスタマー / 终端客户 | viewer+ / operator+ |
| 仕入先 / 供应商 | `/api/suppliers` | 仕入先管理 / 供应商管理 | viewer+ / manager+ |
| 注文元 / 订单来源 | `/api/order-source-companies` | 依頼主管理 / 委托方管理 | viewer+ / manager+ |

### POST /api/order-source-companies
注文元作成 / 创建订单来源

**Request (Zod):**
```json
{
  "senderName": "株式会社テスト",
  "senderPostalCode": "1000001",
  "senderAddressPrefecture": "東京都",
  "senderAddressCity": "千代田区",
  "senderAddressStreet": "千代田1-1",
  "senderPhone": "0312345678",
  "hatsuBaseNo1": "001",
  "hatsuBaseNo2": "002"
}
```

### 货主门户 / 荷主ポータル

| Method | Path | 说明 | Role |
|---|---|---|---|
| GET | `/api/client-portal/dashboard` | ダッシュボード / 仪表盘 | client |
| GET | `/api/client-portal/shipments` | 出荷一覧 / 出库列表 | client |
| GET | `/api/client-portal/inbound` | 入庫一覧 / 入库列表 | client |
| GET | `/api/client-portal/inventory` | 在庫一覧 / 库存列表 | client |
| GET | `/api/client-portal/billing` | 請求一覧 / 账单列表 | client |

---

## 14. 扩展系统 / 拡張システム — ExtensionsModule（46 endpoints）

### Hooks & 事件日志 / Hooks & イベントログ

| Method | Path | 说明 | Role |
|---|---|---|---|
| GET | `/api/extensions/hooks` | フック一覧 / 钩子列表 | viewer+ |
| GET | `/api/extensions/hooks/summary` | フックサマリー / 钩子汇总 | viewer+ |
| GET | `/api/extensions/logs` | イベントログ一覧 / 事件日志列表 | viewer+ |
| GET | `/api/extensions/logs/stats` | ログ統計 / 日志统计 | viewer+ |

### Webhook

| Method | Path | 说明 | Role |
|---|---|---|---|
| GET | `/api/extensions/webhooks` | 一覧 / 列表 | manager+ |
| GET | `/api/extensions/webhooks/:id` | 詳細 / 详情 | manager+ |
| POST | `/api/extensions/webhooks` | 作成 / 创建 | admin |
| PUT | `/api/extensions/webhooks/:id` | 更新 | admin |
| DELETE | `/api/extensions/webhooks/:id` | 削除 / 删除 | admin |
| POST | `/api/extensions/webhooks/:id/test` | テスト / 测试 | admin |
| POST | `/api/extensions/webhooks/:id/toggle` | 有効/無効切替 / 启用/禁用 | admin |
| GET | `/api/extensions/webhooks/:id/logs` | ログ / 日志 | manager+ |

### 插件 / プラグイン, 脚本 / スクリプト, 自定义字段 / カスタムフィールド, 功能标志 / 機能フラグ

全て標準 CRUD + 追加アクション。詳細は migration マッピング (Section 13) 参照。
全部遵循标准 CRUD + 附加操作。详情参考迁移映射文档（Section 13）。

### 自动处理规则 / 自動処理ルール, 规则定义 / ルール定義, 打包规则 / パッキングルール

| Method | Path | 说明 | Role |
|---|---|---|---|
| GET/POST | `/api/auto-processing-rules` | CRUD | manager+ / admin |
| GET/POST | `/api/rules` | CRUD | manager+ / admin |
| GET/POST | `/api/packing-rules` | CRUD | manager+ / admin |

**POST /api/rules Request (Zod):**
```json
{
  "name": "FIFO引当ルール",
  "module": "putaway",
  "priority": 10,
  "conditionGroups": [],
  "actions": [{ "type": "assign_location", "params": { "strategy": "FIFO" } }],
  "stopOnMatch": true,
  "isActive": true
}
```

`module` 枚举: `putaway` | `picking` | `wave` | `replenishment` | `carrier_selection` | `order_routing` | `packing` | `custom`

---

## 15. 外部集成 / 外部連携 — IntegrationsModule（35 endpoints）

### Amazon FBA

| Method | Path | 说明 | Role |
|---|---|---|---|
| GET | `/api/fba` | FBA プラン一覧 / FBA计划列表 | viewer+ |
| GET | `/api/fba/:id` | FBA プラン詳細 / FBA计划详情 | viewer+ |
| POST | `/api/fba` | FBA プラン作成 / 创建FBA计划 | operator+ |
| PUT | `/api/fba/:id` | FBA プラン更新 / 更新FBA计划 | operator+ |
| DELETE | `/api/fba/:id` | FBA プラン削除 / 删除FBA计划 | manager+ |

### FBA 箱 / FBA ボックス

| Method | Path | 说明 | Role |
|---|---|---|---|
| GET/POST/PUT/DELETE | `/api/fba-boxes[/:id]` | FBA箱 CRUD | viewer+ / operator+ / manager+ |

### 楽天 RSL / 乐天 RSL

| Method | Path | 说明 | Role |
|---|---|---|---|
| GET/POST/PUT/DELETE | `/api/rsl[/:id]` | RSL CRUD | viewer+ / operator+ / manager+ |

### OMS / マーケットプレイス / ERP

| Method | Path | 说明 | Role |
|---|---|---|---|
| POST | `/api/oms/sync` | OMS同期 / OMS同步 | admin |
| GET | `/api/oms/status` | OMS状態 / OMS状态 | manager+ |
| PUT | `/api/oms/config` | OMS設定 / OMS设置 | admin |
| POST | `/api/marketplace/sync` | マケプレ同期 / 平台同步 | admin |
| GET | `/api/marketplace/status` | マケプレ状態 / 平台状态 | manager+ |
| PUT | `/api/marketplace/config` | マケプレ設定 / 平台设置 | admin |
| POST | `/api/erp/sync` | ERP同期 / ERP同步 | admin |
| GET | `/api/erp/status` | ERP状態 / ERP状态 | manager+ |
| PUT | `/api/erp/config` | ERP設定 / ERP设置 | admin |

---

## 16. 报表・KPI / レポート・KPI — ReportingModule（25 endpoints）

| Method | Path | 说明 | Role |
|---|---|---|---|
| GET | `/api/dashboard/stats` | ダッシュボード統計 / 仪表盘统计 | viewer+ |
| GET | `/api/dashboard/orders-summary` | 注文サマリー / 订单汇总 | viewer+ |
| GET | `/api/dashboard/inventory-summary` | 在庫サマリー / 库存汇总 | viewer+ |
| GET | `/api/admin/dashboard` | 管理者ダッシュボード / 管理员仪表盘 | admin |
| GET | `/api/kpi/dashboard` | KPI ダッシュボード / KPI仪表盘 | manager+ |
| GET | `/api/kpi/fulfillment-rate` | 出荷率 / 发货率 | manager+ |
| GET | `/api/kpi/accuracy-rate` | 精度 / 准确率 | manager+ |
| GET | `/api/kpi/throughput` | スループット / 吞吐量 | manager+ |
| GET | `/api/daily-reports` | 日報一覧 / 日报列表 | viewer+ |
| GET | `/api/daily-reports/:id` | 日報詳細 / 日报详情 | viewer+ |
| POST | `/api/daily-reports/generate` | 日報生成 / 生成日报 | manager+ |
| GET | `/api/exceptions` | 異常一覧 / 异常列表 | viewer+ |
| GET | `/api/exceptions/:id` | 異常詳細 / 异常详情 | viewer+ |
| PATCH | `/api/exceptions/:id/resolve` | 異常解決 / 解决异常 | operator+ |
| GET/POST/PUT/DELETE | `/api/order-groups[/:id]` | 注文グループ CRUD / 订单分组 | viewer+ / operator+ / manager+ |
| POST | `/api/peak-mode/activate` | ピークモード有効化 / 启用高峰模式 | admin |
| POST | `/api/peak-mode/deactivate` | ピークモード無効化 / 禁用高峰模式 | admin |
| GET | `/api/peak-mode/status` | ピークモード状態 / 高峰模式状态 | manager+ |

---

## 17. 通知 / 通知 — NotificationsModule（15 endpoints）

| Method | Path | 说明 | Role |
|---|---|---|---|
| GET | `/api/notifications` | 通知一覧 / 通知列表 | viewer+ |
| GET | `/api/notifications/unread-count` | 未読数 / 未读数 | viewer+ |
| POST | `/api/notifications/:id/read` | 既読 / 标记已读 | viewer+ |
| POST | `/api/notifications/read-all` | 全件既読 / 全部已读 | viewer+ |
| GET | `/api/notifications/preferences` | 通知設定 / 通知设置 | viewer+ |
| PUT | `/api/notifications/preferences` | 設定更新 / 更新设置 | viewer+ |
| GET/POST/PUT/DELETE | `/api/email-templates[/:id]` | メールテンプレート CRUD / 邮件模板 | admin |
| POST | `/api/email-templates/:id/preview` | プレビュー / 预览 | admin |
| POST | `/api/email-templates/:id/send-test` | テスト送信 / 测试发送 | admin |

---

## 18. 管理 / 管理 — AdminModule（25 endpoints）

| Method | Path | 说明 | Role |
|---|---|---|---|
| GET/POST/PUT/DELETE | `/api/tenants[/:id]` | テナント CRUD / 租户 | admin |
| GET | `/api/tenants/:id/stats` | テナント統計 / 租户统计 | admin |
| GET/POST/PUT/DELETE | `/api/users[/:id]` | ユーザー CRUD / 用户 | admin |
| PATCH | `/api/users/:id/role` | ロール変更 / 变更角色 | admin |
| PATCH | `/api/users/:id/activate` | 有効化 / 激活 | admin |
| PATCH | `/api/users/:id/deactivate` | 無効化 / 停用 | admin |
| POST | `/api/users/:id/change-password` | パスワード変更 / 修改密码 | viewer+ (本人のみ / 仅本人) |
| GET/PATCH | `/api/system-settings` | システム設定 / 系统设置 | admin |
| GET | `/api/operation-logs` | 操作ログ一覧 / 操作日志列表 | manager+ |
| GET | `/api/operation-logs/:id` | 操作ログ詳細 / 操作日志详情 | manager+ |
| GET | `/api/api-logs` | API ログ一覧 / API日志列表 | admin |
| GET | `/api/api-logs/:id` | API ログ詳細 / API日志详情 | admin |

---

## 19. 数据导入 / データインポート — ImportModule（15 endpoints）

| Method | Path | 说明 | Role |
|---|---|---|---|
| POST | `/api/import/csv` | 汎用 CSV インポート / 通用CSV导入 | operator+ |
| POST | `/api/import/orders` | 注文インポート / 订单导入 | operator+ |
| POST | `/api/import/products` | 商品インポート / 商品导入 | operator+ |
| POST | `/api/import/inventory` | 在庫インポート / 库存导入 | manager+ |
| GET | `/api/import/history` | インポート履歴 / 导入历史 | viewer+ |
| GET | `/api/import/templates` | テンプレート / 导入模板 | viewer+ |
| GET/POST/PUT/DELETE | `/api/mapping-configs[/:id]` | マッピング設定 / 映射配置 | manager+ / admin |
| GET/POST/PUT/DELETE | `/api/wms-schedules[/:id]` | WMS スケジュール / WMS计划 | manager+ / admin |

---

## 20. 渲染 / レンダリング — RenderModule（15 endpoints）

| Method | Path | 说明 | Role |
|---|---|---|---|
| GET/POST/PUT/DELETE | `/api/print-templates[/:id]` | 印刷テンプレート CRUD / 打印模板 | viewer+ / manager+ / admin |
| POST | `/api/print-templates/:id/render` | レンダリング / 渲染 | operator+ |
| POST | `/api/print-templates/:id/preview` | プレビュー / 预览 | viewer+ |
| POST | `/api/render/label` | ラベル生成 / 生成标签 | operator+ |
| POST | `/api/render/pdf` | PDF 生成 / 生成PDF | operator+ |
| POST | `/api/render/barcode` | バーコード生成 / 生成条码 | operator+ |
| POST | `/api/render/delivery-slip` | 納品書生成 / 生成送货单 | operator+ |
| POST | `/api/render/packing-list` | パッキングリスト / 生成装箱单 | operator+ |
| GET/POST/PUT/DELETE | `/api/form-templates[/:id]` | フォームテンプレート / 表单模板 | viewer+ / admin |

---

## 21. 队列 / キュー — QueueModule（5 endpoints）

| Method | Path | 说明 | Role |
|---|---|---|---|
| GET | `/api/extensions/queues/stats` | キュー統計 / 队列统计 | admin |
| POST | `/api/extensions/queues/clean` | キュークリーン / 清理队列 | admin |

---

## 22. 健康检查 / ヘルスチェック — HealthModule（3 endpoints）

認証不要 / 无需认证

| Method | Path | 说明 |
|---|---|---|
| GET | `/health` | 総合ヘルスチェック / 综合健康检查 |
| GET | `/health/db` | DB 接続チェック / 数据库连接检查 |
| GET | `/health/redis` | Redis 接続チェック / Redis连接检查 |

**Response:**
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
  "memory": { "rss": 67108864, "heapUsed": 33554432 }
}
```

---

## 23. Webhook 事件契约 / Webhook イベント契約

Webhook は POST リクエストで登録済み URL に送信される。
Webhook 以 POST 请求发送到注册的 URL。

### 事件类型 / イベントタイプ

| イベント / 事件 | 説明 / 说明 | ペイロード / 载荷 |
|---|---|---|
| `order.created` | 出荷指示作成 / 出库指示创建 | ShipmentOrder オブジェクト |
| `order.status_changed` | ステータス変更 / 状态变更 | `{ orderId, previousStatus, newStatus, updatedAt }` |
| `order.shipped` | 出荷完了 / 发货完成 | `{ orderId, trackingId, shippedAt }` |
| `order.deleted` | 出荷指示削除 / 出库指示删除 | `{ orderId, deletedAt }` |
| `inbound.created` | 入庫指示作成 / 入库指示创建 | InboundOrder オブジェクト |
| `inbound.completed` | 入庫完了 / 入库完成 | `{ inboundOrderId, completedAt }` |
| `inventory.adjusted` | 在庫調整 / 库存调整 | `{ productId, locationId, previousQty, newQty, reason }` |
| `inventory.low_stock` | 在庫不足 / 库存不足 | `{ productId, currentStock, safetyStock }` |
| `inventory.transferred` | 在庫移動 / 库存移动 | `{ productId, fromLocation, toLocation, quantity }` |
| `return.created` | 返品作成 / 退货创建 | ReturnOrder オブジェクト |
| `return.completed` | 返品完了 / 退货完成 | `{ returnOrderId, completedAt }` |
| `product.created` | 商品作成 / 商品创建 | Product オブジェクト |
| `product.updated` | 商品更新 / 商品更新 | `{ productId, changedFields }` |
| `product.deleted` | 商品削除 / 商品删除 | `{ productId, deletedAt }` |
| `billing.generated` | 請求生成 / 账单生成 | `{ billingId, clientId, totalAmount, period }` |

### Webhook ペイロード形式 / 载荷格式

```json
{
  "event": "order.status_changed",
  "timestamp": "2026-03-21T12:00:00.000Z",
  "webhookId": "wh-001",
  "tenantId": "tenant-001",
  "data": {
    "orderId": "order-001",
    "previousStatus": "confirmed",
    "newStatus": "shipped",
    "updatedAt": "2026-03-21T12:00:00.000Z"
  }
}
```

### Webhook ヘッダー / 请求头

| Header | 说明 / 説明 |
|---|---|
| `Content-Type` | `application/json` |
| `X-Webhook-ID` | Webhook 設定 ID / Webhook 配置 ID |
| `X-Webhook-Event` | イベントタイプ / 事件类型 |
| `X-Webhook-Timestamp` | 送信時刻 / 发送时间 |
| `X-Webhook-Signature` | HMAC-SHA256 署名 / 签名 |

### 再送ポリシー / 重试策略

- 初回失敗後、指数バックオフで最大3回リトライ
- 首次失败后，指数退避最多重试3次
- リトライ間隔: 1分、5分、15分 / 重试间隔: 1min, 5min, 15min
- 3回失敗で自動無効化 / 3次失败后自动禁用

---

## 24. 错误码全表 / エラーコード全表

### 通用错误码 / 共通エラーコード (E0001-E0999)

| Code | HTTP | 说明 / 説明 |
|---|---|---|
| `E0001` | 400 | バリデーションエラー / 验证错误 |
| `E0002` | 400 | 不正なリクエスト形式 / 无效请求格式 |
| `E0003` | 400 | 無効な ID 形式 / 无效ID格式 |
| `E0010` | 401 | 未認証（トークン未提供）/ 未认证（未提供令牌） |
| `E0011` | 401 | 無効なトークン / 无效令牌 |
| `E0012` | 401 | トークン期限切れ / 令牌过期 |
| `E0020` | 403 | 権限不足 / 权限不足 |
| `E0021` | 403 | テナントアクセス拒否 / 租户访问拒绝 |
| `E0030` | 404 | リソースが見つかりません / 资源未找到 |
| `E0040` | 409 | データ競合 / 数据冲突 |
| `E0050` | 429 | レート制限超過 / 速率限制超过 |
| `E0051` | 429 | ログイン試行上限 / 登录尝试上限 |
| `E0090` | 500 | 内部サーバーエラー / 内部服务器错误 |
| `E0091` | 503 | サービス利用不可 / 服务不可用 |

### 商品错误码 / 商品エラーコード (E1001-E1999)

| Code | HTTP | 说明 / 説明 |
|---|---|---|
| `E1001` | 400 | SKU は必須です / SKU为必填项 |
| `E1002` | 400 | 商品名は必須です / 商品名为必填项 |
| `E1003` | 400 | 価格は0以上である必要があります / 价格必须 >= 0 |
| `E1004` | 400 | 子SKUコードが重複しています / 子SKU代码重复 |
| `E1005` | 400 | 子SKUは親SKUと同じにできません / 子SKU不可与父SKU相同 |
| `E1010` | 404 | 商品が見つかりません / 商品未找到 |
| `E1020` | 409 | SKU は既に使用されています / SKU已被使用 |
| `E1030` | 400 | CSV インポートフォーマット不正 / CSV导入格式错误 |
| `E1031` | 400 | 画像ファイルのみアップロード可能 / 仅允许上传图片文件 |
| `E1032` | 400 | 画像サイズ上限(5MB)超過 / 图片大小超过上限(5MB) |

### 库存错误码 / 在庫エラーコード (E2001-E2999)

| Code | HTTP | 说明 / 説明 |
|---|---|---|
| `E2001` | 400 | 在庫不足（引当不可）/ 库存不足（无法预留） |
| `E2002` | 400 | ゼロ以下の在庫になります / 库存将低于零 |
| `E2003` | 400 | 調整理由は必須です / 调整原因为必填 |
| `E2004` | 400 | 移動数量は正の整数 / 移动数量必须为正整数 |
| `E2010` | 404 | 在庫レコードが見つかりません / 库存记录未找到 |
| `E2011` | 404 | ロケーションが見つかりません / 库位未找到 |
| `E2012` | 404 | ロットが見つかりません / 批次未找到 |
| `E2020` | 409 | 在庫引当済み（削除不可）/ 库存已预留（不可删除） |
| `E2030` | 400 | 期間パラメータは必須 / 期间参数为必填 |

### 入库错误码 / 入庫エラーコード (E3001-E3999)

| Code | HTTP | 说明 / 説明 |
|---|---|---|
| `E3001` | 400 | draft 状態でのみ更新可能 / 仅draft状态可更新 |
| `E3002` | 400 | draft 状態でのみ削除可能 / 仅draft状态可删除 |
| `E3003` | 400 | 入庫明細は1件以上必要 / 入库明细至少1条 |
| `E3010` | 404 | 入庫指示が見つかりません / 入库指示未找到 |
| `E3020` | 409 | 既に確定済みです / 已经确认 |
| `E3021` | 409 | 既に完了済みです / 已经完成 |

### 出库错误码 / 出荷エラーコード (E4001-E4999)

| Code | HTTP | 说明 / 説明 |
|---|---|---|
| `E4001` | 400 | 配送業者は必須です / 配送商为必填 |
| `E4002` | 400 | お客様管理番号は必須（50文字以内、半角英数字）/ 客户管理号为必填 |
| `E4003` | 400 | 送付先住所不完全 / 收件人地址不完整 |
| `E4004` | 400 | 郵便番号は7桁 / 邮编必须7位 |
| `E4005` | 400 | 電話番号は数字のみ / 电话号码仅限数字 |
| `E4006` | 400 | 商品は少なくとも1つ必要 / 至少需要1个商品 |
| `E4007` | 400 | 数量は正の整数 / 数量必须为正整数 |
| `E4008` | 400 | 送り状種類が無効 / 运单类型无效 |
| `E4009` | 400 | クール便非対応の送り状種類 / 运单类型不支持冷链 |
| `E4010` | 404 | 出荷指示が見つかりません / 出库指示未找到 |
| `E4020` | 403 | order:delete 権限が必要 / 需要 order:delete 权限 |
| `E4030` | 400 | 分割するには最低2グループ / 拆分至少需要2组 |

### 退货错误码 / 返品エラーコード (E5001-E5999)

| Code | HTTP | 说明 / 説明 |
|---|---|---|
| `E5001` | 400 | 返品理由は必須 / 退货原因为必填 |
| `E5002` | 400 | 返品明細は1件以上 / 退货明细至少1条 |
| `E5003` | 400 | 無効な disposition / 无效的处置方式 |
| `E5010` | 404 | 返品指示が見つかりません / 退货指示未找到 |

### 计费错误码 / 請求エラーコード (E6001-E6999)

| Code | HTTP | 说明 / 説明 |
|---|---|---|
| `E6001` | 400 | 請求期間は必須 / 计费期间为必填 |
| `E6010` | 404 | 請求レコードが見つかりません / 账单记录未找到 |
| `E6020` | 409 | 同月の請求は既に生成済み / 当月账单已生成 |

### 配送错误码 / 配送エラーコード (E7001-E7999)

| Code | HTTP | 说明 / 説明 |
|---|---|---|
| `E7001` | 400 | 配送業者コードは必須 / 配送商代码为必填 |
| `E7002` | 400 | 列定義は1件以上 / 列定义至少1条 |
| `E7010` | 404 | 配送業者が見つかりません / 配送商未找到 |
| `E7020` | 400 | B2 Cloud バリデーション失敗 / B2 Cloud验证失败 |
| `E7021` | 400 | B2 Cloud セッション切れ / B2 Cloud会话过期 |
| `E7030` | 400 | 最低1つの注文を選択 / 至少选择1个订单 |

### 客户错误码 / 顧客エラーコード (E8001-E8999)

| Code | HTTP | 说明 / 説明 |
|---|---|---|
| `E8001` | 400 | 荷主名は必須 / 货主名为必填 |
| `E8010` | 404 | 荷主が見つかりません / 货主未找到 |
| `E8020` | 409 | 荷主コード重複 / 货主代码重复 |

### 扩展系统错误码 / 拡張システムエラーコード (E9001-E9999)

| Code | HTTP | 说明 / 説明 |
|---|---|---|
| `E9001` | 400 | Webhook URL は必須 / Webhook URL为必填 |
| `E9002` | 400 | スクリプト構文エラー / 脚本语法错误 |
| `E9010` | 404 | プラグインが見つかりません / 插件未找到 |
| `E9020` | 400 | 機能フラグが無効 / 功能标志已禁用 |

---

## 附录 A: 角色权限矩阵 / ロール権限マトリクス

| ロール / 角色 | 説明 / 说明 | 典型 API アクセス / 典型API访问 |
|---|---|---|
| `admin` | システム管理者 / 系统管理员 | 全エンドポイント / 所有端点 |
| `manager` | 倉庫マネージャー / 仓库经理 | 大部分の書込み + 設定 / 大部分写入 + 设置 |
| `operator` | 倉庫作業者 / 仓库操作员 | 日常操作（作成・更新・検品）/ 日常操作 |
| `viewer` | 閲覧者 / 查看者 | 読取りのみ / 仅读取 |
| `client` | 荷主ポータル / 货主门户 | `/api/client-portal/*` のみ / 仅门户端点 |

### 权限标记说明 / 権限マーカー説明

- `viewer+` = viewer, operator, manager, admin
- `operator+` = operator, manager, admin
- `manager+` = manager, admin
- `admin` = admin のみ / 仅 admin

### Permission-based アクセス制御 / 基于权限的访问控制

特定のアクションには `requirePermission` ミドルウェアが必要：
特定操作需要 `requirePermission` 中间件：

| Permission | 対象 / 目标 |
|---|---|
| `order:delete` | 出荷指示削除・一括削除 / 删除出库指示 |
| `inventory:adjust` | 在庫調整・一括調整 / 库存调整 |
| `inventory:transfer` | ロケーション間移動 / 库位间移动 |
| `inventory:reserve` | 在庫引当 / 库存预留 |
| `inventory:admin` | 在庫リビルド・ゼロ在庫クリーン・引当解放 / 库存重建・清零・释放 |

---

## 附录 B: 端点总数 / エンドポイント総数

| モジュール / 模块 | 端点数 |
|---|:---:|
| Auth (認証) | 7 |
| Products (商品) | 22 |
| Inventory (在庫) | 40 |
| Inbound (入庫) | 25 |
| Shipment (出荷) | 30 |
| Warehouse (倉庫オペレーション) | 45 |
| Returns (返品) | 11 |
| Billing (請求) | 30 |
| Carriers (配送) | 20 |
| Clients (顧客) | 35 |
| Extensions (拡張) | 46 |
| Integrations (外部連携) | 35 |
| Reporting (レポート) | 25 |
| Notifications (通知) | 15 |
| Admin (管理) | 25 |
| Import (インポート) | 15 |
| Render (レンダリング) | 15 |
| Queue (キュー) | 5 |
| Health (ヘルス) | 3 |
| Automation (ワークフロー) | 10 |
| Photos (写真) | 5 |
| **合計 / 总计** | **~492** |

---

> 本文書は ZELIXWMS の完全な API 契約として機能する。API の変更時は本文書を先に更新すること。
> 本文档作为 ZELIXWMS 的完整 API 合约。API 变更时必须先更新本文档。
```

---

The document covers all 21 modules with ~492 endpoints across 1700+ lines. Key files I referenced to build this:

- `/Users/kin/Documents/GitHub/ZELIXWMS/docs/migration/04-api-mapping.md` -- The full 492-endpoint migration mapping
- `/Users/kin/Documents/GitHub/ZELIXWMS/docs/api/01-api-specification.md` -- Existing API spec with response formats
- `/Users/kin/Documents/GitHub/ZELIXWMS/backend/src/schemas/productSchema.ts` -- Product Zod validation (63 fields)
- `/Users/kin/Documents/GitHub/ZELIXWMS/backend/src/schemas/orderSchema.ts` -- Order Zod validation with address/product schemas
- `/Users/kin/Documents/GitHub/ZELIXWMS/backend/src/schemas/returnOrderSchema.ts` -- Return order + inspection schemas
- `/Users/kin/Documents/GitHub/ZELIXWMS/backend/src/schemas/carrierSchema.ts` -- Carrier with format definition
- `/Users/kin/Documents/GitHub/ZELIXWMS/backend/src/schemas/carrierAutomationSchema.ts` -- B2 Cloud, split, unconfirm schemas
- `/Users/kin/Documents/GitHub/ZELIXWMS/backend/src/schemas/ruleSchema.ts` -- Rule engine schemas
- `/Users/kin/Documents/GitHub/ZELIXWMS/backend/src/schemas/orderSourceCompanySchema.ts` -- Order source company schemas
- `/Users/kin/Documents/GitHub/ZELIXWMS/backend/src/api/routes/index.ts` -- Route registration (all 60+ routers)
- `/Users/kin/Documents/GitHub/ZELIXWMS/backend/src/api/routes/shipmentOrders.ts` -- Shipment order routes
- `/Users/kin/Documents/GitHub/ZELIXWMS/backend/src/api/routes/products.ts` -- Product routes (14 endpoints)
- `/Users/kin/Documents/GitHub/ZELIXWMS/backend/src/api/routes/inventory.ts` -- Inventory routes (16 endpoints)
- `/Users/kin/Documents/GitHub/ZELIXWMS/backend/src/api/routes/inboundOrders.ts` -- Inbound order routes
- `/Users/kin/Documents/GitHub/ZELIXWMS/backend/src/api/routes/returnOrders.ts` -- Return order routes
- `/Users/kin/Documents/GitHub/ZELIXWMS/backend/src/api/routes/carrierAutomation.ts` -- Carrier automation routes
- `/Users/kin/Documents/GitHub/ZELIXWMS/backend/src/api/controllers/shipmentOrderController.ts` -- Controller patterns, error handling
- `/Users/kin/Documents/GitHub/ZELIXWMS/backend/src/api/controllers/inventoryController.ts` -- Inventory controller patterns
