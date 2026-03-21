# ZELIXWMS API 移行マッピング（全492エンドポイント）
# ZELIXWMS API 迁移映射（全492端点）

> Express.js → NestJS 全エンドポイント移行マッピング
> Express.js → NestJS 全端点迁移映射
>
> 最終更新 / 最后更新: 2026-03-21

---

## 1. 移行方針 / 迁移方针

- フロントエンドの変更を最小限にするため、パス構造を維持
  前端改动最小化，保持路径结构
- `/api/` プレフィックスは維持（v2 は将来追加時に使用）
  保持 `/api/` 前缀（v2 留待将来使用）
- レスポンス形式はできるだけ互換を保つ
  响应格式尽量保持兼容
- ID 形式の変更: `_id` (ObjectId 24 文字 hex) → `id` (UUID v4) + 互換エイリアス `_id`
  ID格式变更：`_id`（ObjectId 24位hex）→ `id`（UUID v4）+ 兼容别名 `_id`

---

## 2. レスポンス標準 / 响应标准

### 2.1 レスポンスエンベロープ / 响应信封

```json
// 一覧レスポンス / 列表响应
{
  "items": [...],
  "total": 100,
  "page": 1,
  "limit": 50
}

// 単体レスポンス / 单体响应
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "_id": "550e8400-e29b-41d4-a716-446655440000",
  "sku": "ABC-001",
  ...
}
```

> `_id` はフロントエンド互換のためエイリアスとして返す。TransformInterceptor で自動付与。
> `_id` 作为前端兼容别名返回。由 TransformInterceptor 自动附加。

### 2.2 エラーレスポンス / 错误响应

```json
{
  "statusCode": 400,
  "message": "SKU は必須です / SKU is required",
  "error": "Bad Request",
  "details": [
    { "field": "sku", "message": "必須項目です / 必填项" }
  ]
}
```

### 2.3 ページネーション / 分页

```
クエリパラメータ / 查询参数:
  ?page=1        （デフォルト: 1 / 默认: 1）
  &limit=50      （デフォルト: 50, 最大: 200 / 默认: 50, 最大: 200）
  &sort=createdAt（ソートフィールド / 排序字段）
  &order=desc    （asc | desc）
```

### 2.4 ID 形式変更 / ID格式变更

```
MongoDB ObjectId: 69b6205e7ddcb7290ca9fd74  (24文字 hex)
PostgreSQL UUID:  550e8400-e29b-41d4-a716-446655440000 (36文字)

変換方式: UUID v5 (namespace + collection + ObjectId)
详见: 07-data-migration.md
```

---

## 3. 認証 API / 认证 API — AuthModule（7 endpoints）

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| POST | `/api/auth/login` | ログイン / 登录 | No | - |
| POST | `/api/auth/register` | ユーザー登録 / 用户注册 | No | - |
| GET | `/api/auth/me` | 現在のユーザー情報取得 / 获取当前用户信息 | Yes | - |
| POST | `/api/auth/logout` | ログアウト / 登出 | Yes | - |
| POST | `/api/auth/refresh-token` | トークンリフレッシュ / 刷新令牌 | Yes | - |
| POST | `/api/portal/login` | 荷主ポータルログイン / 货主门户登录 | No | - |
| POST | `/api/portal/register` | 荷主ポータル登録 / 货主门户注册 | No | - |

---

## 4. 商品管理 API / 商品管理 API — ProductsModule（22 endpoints）

### 4.1 商品 / 商品 — ProductsController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/products` | 商品一覧（ページネーション・フィルター）/ 商品列表（分页过滤） | Yes | viewer+ |
| GET | `/api/products/search` | 全文検索 / 全文搜索 | Yes | viewer+ |
| GET | `/api/products/:id` | 商品詳細取得 / 获取商品详情 | Yes | viewer+ |
| POST | `/api/products` | 商品新規作成 / 创建新商品 | Yes | operator+ |
| PUT | `/api/products/:id` | 商品全体更新 / 全量更新商品 | Yes | operator+ |
| PATCH | `/api/products/:id` | 商品部分更新 / 部分更新商品 | Yes | operator+ |
| DELETE | `/api/products/:id` | 商品ソフトデリート / 软删除商品 | Yes | manager+ |
| POST | `/api/products/import` | CSV 一括取込 / CSV批量导入 | Yes | operator+ |
| POST | `/api/products/export` | CSV エクスポート / CSV导出 | Yes | viewer+ |
| GET | `/api/products/:id/stock` | 商品別在庫照会 / 按商品查询库存 | Yes | viewer+ |
| GET | `/api/products/:id/history` | 商品変更履歴 / 商品变更历史 | Yes | viewer+ |
| POST | `/api/products/bulk-update` | 一括更新 / 批量更新 | Yes | operator+ |
| POST | `/api/products/bulk-delete` | 一括削除 / 批量删除 | Yes | manager+ |
| GET | `/api/products/barcode/:code` | バーコード検索 / 条码搜索 | Yes | viewer+ |

### 4.2 資材 / 材料 — MaterialsController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/materials` | 資材一覧 / 材料列表 | Yes | viewer+ |
| GET | `/api/materials/:id` | 資材詳細 / 材料详情 | Yes | viewer+ |
| POST | `/api/materials` | 資材作成 / 创建材料 | Yes | operator+ |
| PUT | `/api/materials/:id` | 資材更新 / 更新材料 | Yes | operator+ |
| DELETE | `/api/materials/:id` | 資材削除 / 删除材料 | Yes | manager+ |

### 4.3 セット商品 / 套装商品 — SetProductsController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/set-products` | セット商品一覧 / 套装商品列表 | Yes | viewer+ |
| GET | `/api/set-products/:id` | セット商品詳細 / 套装商品详情 | Yes | viewer+ |
| POST | `/api/set-products` | セット商品作成 / 创建套装商品 | Yes | operator+ |
| PUT | `/api/set-products/:id` | セット商品更新 / 更新套装商品 | Yes | operator+ |
| DELETE | `/api/set-products/:id` | セット商品削除 / 删除套装商品 | Yes | manager+ |

---

## 5. 在庫管理 API / 库存管理 API — InventoryModule（40 endpoints）

### 5.1 在庫照会 / 库存查询 — InventoryController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/inventory/overview` | 在庫概要ダッシュボード / 库存概览仪表盘 | Yes | viewer+ |
| GET | `/api/inventory/location-usage` | ロケーション使用率 / 库位使用率 | Yes | viewer+ |
| GET | `/api/inventory/stock` | 在庫一覧（倉庫種別フィルター）/ 库存列表（仓库类型过滤） | Yes | viewer+ |
| GET | `/api/inventory/stock/summary` | 在庫サマリー / 库存汇总 | Yes | viewer+ |
| GET | `/api/inventory/stock/:productId` | 商品別在庫詳細 / 按商品库存详情 | Yes | viewer+ |
| POST | `/api/inventory/adjust` | 在庫調整 / 库存调整 | Yes | manager+ |
| POST | `/api/inventory/bulk-adjust` | 一括在庫調整 / 批量库存调整 | Yes | manager+ |
| GET | `/api/inventory/movements` | 在庫移動履歴 / 库存移动历史 | Yes | viewer+ |
| GET | `/api/inventory/alerts/low-stock` | 在庫不足アラート / 库存不足警报 | Yes | viewer+ |
| POST | `/api/inventory/reserve-orders` | 出荷向け在庫引当 / 出库库存预留 | Yes | operator+ |
| POST | `/api/inventory/transfer` | ロケーション間移動 / 库位间移动 | Yes | operator+ |
| POST | `/api/inventory/cleanup-zero` | ゼロ在庫クリーンアップ / 清理零库存 | Yes | admin |
| POST | `/api/inventory/rebuild` | 在庫再構築 / 库存重建 | Yes | admin |
| POST | `/api/inventory/release-expired-reservations` | 期限切れ引当解放 / 释放过期预留 | Yes | admin |
| GET | `/api/inventory/ledger-summary` | 受払一覧 / 收发台账 | Yes | viewer+ |
| GET | `/api/inventory/aging` | エイジング分析 / 库存账龄分析 | Yes | viewer+ |
| POST | `/api/inventory/export` | 在庫データエクスポート / 库存数据导出 | Yes | viewer+ |

### 5.2 ロケーション / 库位 — LocationController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/locations` | ロケーション一覧 / 库位列表 | Yes | viewer+ |
| GET | `/api/locations/:id` | ロケーション詳細 / 库位详情 | Yes | viewer+ |
| POST | `/api/locations` | ロケーション作成 / 创建库位 | Yes | manager+ |
| PUT | `/api/locations/:id` | ロケーション更新 / 更新库位 | Yes | manager+ |
| DELETE | `/api/locations/:id` | ロケーション削除 / 删除库位 | Yes | admin |
| POST | `/api/locations/bulk` | 一括作成 / 批量创建 | Yes | manager+ |
| GET | `/api/locations/tree` | ツリー構造取得 / 获取树形结构 | Yes | viewer+ |

### 5.3 ロット / 批次 — LotController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/lots` | ロット一覧 / 批次列表 | Yes | viewer+ |
| GET | `/api/lots/:id` | ロット詳細 / 批次详情 | Yes | viewer+ |
| POST | `/api/lots` | ロット作成 / 创建批次 | Yes | operator+ |
| PUT | `/api/lots/:id` | ロット更新 / 更新批次 | Yes | operator+ |
| DELETE | `/api/lots/:id` | ロット削除 / 删除批次 | Yes | manager+ |

### 5.4 シリアル番号 / 序列号 — SerialNumberController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/serial-numbers` | シリアル番号一覧 / 序列号列表 | Yes | viewer+ |
| GET | `/api/serial-numbers/:id` | シリアル番号詳細 / 序列号详情 | Yes | viewer+ |
| POST | `/api/serial-numbers` | シリアル番号登録 / 登录序列号 | Yes | operator+ |
| PUT | `/api/serial-numbers/:id` | シリアル番号更新 / 更新序列号 | Yes | operator+ |
| DELETE | `/api/serial-numbers/:id` | シリアル番号削除 / 删除序列号 | Yes | manager+ |

### 5.5 在庫カテゴリ / 库存类别 — InventoryCategoryController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/inventory-categories` | カテゴリ一覧 / 类别列表 | Yes | viewer+ |
| GET | `/api/inventory-categories/:id` | カテゴリ詳細 / 类别详情 | Yes | viewer+ |
| POST | `/api/inventory-categories` | カテゴリ作成 / 创建类别 | Yes | manager+ |
| PUT | `/api/inventory-categories/:id` | カテゴリ更新 / 更新类别 | Yes | manager+ |
| DELETE | `/api/inventory-categories/:id` | カテゴリ削除 / 删除类别 | Yes | admin |

### 5.6 受払台帳 / 收发台账 — InventoryLedgerController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/inventory-ledger` | 台帳一覧 / 台账列表 | Yes | viewer+ |
| GET | `/api/inventory-ledger/summary` | 台帳サマリー / 台账汇总 | Yes | viewer+ |
| POST | `/api/inventory-ledger/export` | 台帳エクスポート / 台账导出 | Yes | viewer+ |

---

## 6. 入庫管理 API / 入库管理 API — InboundModule（25 endpoints）

### 6.1 入庫指示 / 入库指示 — InboundController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/inbound-orders` | 入庫指示一覧 / 入库指示列表 | Yes | viewer+ |
| GET | `/api/inbound-orders/:id` | 入庫指示詳細 / 入库指示详情 | Yes | viewer+ |
| POST | `/api/inbound-orders` | 入庫指示作成（LOGIFAST全フィールド）/ 创建入库指示 | Yes | operator+ |
| PUT | `/api/inbound-orders/:id` | 入庫指示更新（draft のみ）/ 更新（仅draft） | Yes | operator+ |
| DELETE | `/api/inbound-orders/:id` | 入庫指示削除（draft のみ）/ 删除（仅draft） | Yes | manager+ |
| POST | `/api/inbound-orders/:id/confirm` | 入庫確定（トランザクション）/ 确认入库（事务） | Yes | operator+ |
| POST | `/api/inbound-orders/:id/receive` | 行別検品 / 逐行检品 | Yes | operator+ |
| POST | `/api/inbound-orders/:id/bulk-receive` | 一括検品 / 批量检品 | Yes | operator+ |
| POST | `/api/inbound-orders/:id/putaway` | 棚入れ / 上架 | Yes | operator+ |
| POST | `/api/inbound-orders/:id/complete` | 入庫完了 / 入库完成 | Yes | operator+ |
| POST | `/api/inbound-orders/:id/cancel` | 入庫キャンセル / 取消入库 | Yes | manager+ |
| GET | `/api/inbound-orders/history` | 入庫履歴 / 入库历史 | Yes | viewer+ |
| GET | `/api/inbound-orders/:id/variance` | 入庫差異レポート / 入库差异报告 | Yes | viewer+ |
| POST | `/api/inbound-orders/import` | CSV 一括取込 / CSV批量导入 | Yes | operator+ |
| POST | `/api/inbound-orders/export` | CSV エクスポート / CSV导出 | Yes | viewer+ |

### 6.2 通過型入庫 / 通过型入库 — PassthroughController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/passthrough` | 通過型入庫一覧 / 通过型入库列表 | Yes | viewer+ |
| GET | `/api/passthrough/:id` | 通過型入庫詳細 / 通过型入库详情 | Yes | viewer+ |
| POST | `/api/passthrough` | 通過型入庫作成 / 创建通过型入库 | Yes | operator+ |
| PUT | `/api/passthrough/:id` | 通過型入庫更新 / 更新通过型入库 | Yes | operator+ |
| DELETE | `/api/passthrough/:id` | 通過型入庫削除 / 删除通过型入库 | Yes | manager+ |
| POST | `/api/passthrough/:id/confirm` | 通過型確定 / 确认通过型 | Yes | operator+ |
| POST | `/api/passthrough/:id/receive` | 通過型検品 / 通过型检品 | Yes | operator+ |
| POST | `/api/passthrough/:id/complete` | 通過型完了 / 通过型完成 | Yes | operator+ |
| POST | `/api/passthrough/:id/cancel` | 通過型キャンセル / 取消通过型 | Yes | manager+ |
| POST | `/api/passthrough/import` | 通過型一括取込 / 通过型批量导入 | Yes | operator+ |

---

## 7. 出荷管理 API / 出库管理 API — ShipmentModule（30 endpoints）

### 7.1 出荷指示 / 出库指示 — ShipmentController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/shipment-orders` | 出荷指示一覧（50+フィルター）/ 出库指示列表（50+过滤） | Yes | viewer+ |
| GET | `/api/shipment-orders/:id` | 出荷指示詳細 / 出库指示详情 | Yes | viewer+ |
| POST | `/api/shipment-orders/manual/bulk` | 手動一括作成 / 手动批量创建 | Yes | operator+ |
| PATCH | `/api/shipment-orders/:id` | 出荷指示部分更新 / 部分更新出库指示 | Yes | operator+ |
| PUT | `/api/shipment-orders/:id` | 出荷指示全体更新 / 全量更新出库指示 | Yes | operator+ |
| DELETE | `/api/shipment-orders/:id` | 出荷指示削除（RBAC）/ 删除出库指示 | Yes | manager+ |
| POST | `/api/shipment-orders/delete/bulk` | 一括削除（RBAC）/ 批量删除 | Yes | manager+ |
| POST | `/api/shipment-orders/by-ids` | ID 指定一括取得 / 按ID批量获取 | Yes | viewer+ |
| PATCH | `/api/shipment-orders/bulk` | 一括更新 / 批量更新 | Yes | operator+ |
| POST | `/api/shipment-orders/:id/status` | ステータス変更 / 状态变更 | Yes | operator+ |
| POST | `/api/shipment-orders/status/bulk` | 一括ステータス変更 / 批量状态变更 | Yes | operator+ |
| POST | `/api/shipment-orders/carrier-receipts/import` | 送り状番号取込 / 导入运单号 | Yes | operator+ |
| GET | `/api/shipment-orders/group-counts` | グループ集計 / 分组统计 | Yes | viewer+ |
| POST | `/api/shipment-orders/export` | CSV エクスポート / CSV导出 | Yes | viewer+ |
| GET | `/api/shipment-orders/:id/tracking` | 追跡情報取得 / 获取追踪信息 | Yes | viewer+ |

### 7.2 保管型出庫 / 保管型出库 — OutboundRequestController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/outbound-requests` | 保管型出庫一覧 / 保管型出库列表 | Yes | viewer+ |
| GET | `/api/outbound-requests/:id` | 保管型出庫詳細 / 保管型出库详情 | Yes | viewer+ |
| POST | `/api/outbound-requests` | 保管型出庫作成 / 创建保管型出库 | Yes | operator+ |
| PUT | `/api/outbound-requests/:id` | 保管型出庫更新 / 更新保管型出库 | Yes | operator+ |
| DELETE | `/api/outbound-requests/:id` | 保管型出庫削除 / 删除保管型出库 | Yes | manager+ |
| POST | `/api/outbound-requests/:id/approve` | 保管型出庫承認 / 审批保管型出库 | Yes | manager+ |
| POST | `/api/outbound-requests/:id/complete` | 保管型出庫完了 / 保管型出库完成 | Yes | operator+ |
| POST | `/api/outbound-requests/:id/cancel` | 保管型出庫キャンセル / 取消保管型出库 | Yes | manager+ |

### 7.3 セット出荷 / 套装出库 — SetOrderController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/set-orders` | セット出荷一覧 / 套装出库列表 | Yes | viewer+ |
| GET | `/api/set-orders/:id` | セット出荷詳細 / 套装出库详情 | Yes | viewer+ |
| POST | `/api/set-orders` | セット出荷作成 / 创建套装出库 | Yes | operator+ |
| PUT | `/api/set-orders/:id` | セット出荷更新 / 更新套装出库 | Yes | operator+ |
| DELETE | `/api/set-orders/:id` | セット出荷削除 / 删除套装出库 | Yes | manager+ |
| POST | `/api/set-orders/:id/complete` | セット出荷完了 / 套装出库完成 | Yes | operator+ |
| POST | `/api/set-orders/:id/cancel` | セット出荷キャンセル / 取消套装出库 | Yes | manager+ |

---

## 8. 倉庫オペレーション API / 仓库运营 API — WarehouseModule（45 endpoints）

### 8.1 倉庫管理 / 仓库管理 — WarehouseController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/warehouses` | 倉庫一覧 / 仓库列表 | Yes | viewer+ |
| GET | `/api/warehouses/:id` | 倉庫詳細 / 仓库详情 | Yes | viewer+ |
| POST | `/api/warehouses` | 倉庫作成 / 创建仓库 | Yes | admin |
| PUT | `/api/warehouses/:id` | 倉庫更新 / 更新仓库 | Yes | admin |
| DELETE | `/api/warehouses/:id` | 倉庫削除 / 删除仓库 | Yes | admin |

### 8.2 ウェーブ / 波次 — WaveController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/waves` | ウェーブ一覧 / 波次列表 | Yes | viewer+ |
| GET | `/api/waves/:id` | ウェーブ詳細 / 波次详情 | Yes | viewer+ |
| POST | `/api/waves` | ウェーブ作成 / 创建波次 | Yes | operator+ |
| PUT | `/api/waves/:id` | ウェーブ更新 / 更新波次 | Yes | operator+ |
| DELETE | `/api/waves/:id` | ウェーブ削除 / 删除波次 | Yes | manager+ |
| POST | `/api/waves/:id/release` | ウェーブリリース / 释放波次 | Yes | operator+ |
| POST | `/api/waves/:id/complete` | ウェーブ完了 / 波次完成 | Yes | operator+ |

### 8.3 タスク管理 / 任务管理 — TaskController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/tasks` | タスク一覧 / 任务列表 | Yes | viewer+ |
| GET | `/api/tasks/:id` | タスク詳細 / 任务详情 | Yes | viewer+ |
| POST | `/api/tasks` | タスク作成 / 创建任务 | Yes | operator+ |
| PUT | `/api/tasks/:id` | タスク更新 / 更新任务 | Yes | operator+ |
| PATCH | `/api/tasks/:id/complete` | タスク完了 / 完成任务 | Yes | operator+ |
| PATCH | `/api/tasks/:id/assign` | タスク割当 / 分配任务 | Yes | operator+ |
| DELETE | `/api/tasks/:id` | タスク削除 / 删除任务 | Yes | manager+ |

### 8.4 検品 / 检品 — InspectionController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/inspections` | 検品記録一覧 / 检品记录列表 | Yes | viewer+ |
| GET | `/api/inspections/:id` | 検品記録詳細 / 检品记录详情 | Yes | viewer+ |
| POST | `/api/inspections` | 検品記録作成 / 创建检品记录 | Yes | operator+ |
| PUT | `/api/inspections/:id` | 検品記録更新 / 更新检品记录 | Yes | operator+ |
| DELETE | `/api/inspections/:id` | 検品記録削除 / 删除检品记录 | Yes | manager+ |

### 8.5 ラベリング / 贴标 — LabelingController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/labeling-tasks` | ラベリングタスク一覧 / 贴标任务列表 | Yes | viewer+ |
| GET | `/api/labeling-tasks/:id` | ラベリングタスク詳細 / 贴标任务详情 | Yes | viewer+ |
| POST | `/api/labeling-tasks` | ラベリングタスク作成 / 创建贴标任务 | Yes | operator+ |
| PUT | `/api/labeling-tasks/:id` | ラベリングタスク更新 / 更新贴标任务 | Yes | operator+ |
| PATCH | `/api/labeling-tasks/:id/complete` | ラベリング完了 / 贴标完成 | Yes | operator+ |
| DELETE | `/api/labeling-tasks/:id` | ラベリングタスク削除 / 删除贴标任务 | Yes | manager+ |

### 8.6 棚卸 / 盘点 — StocktakingController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/stocktaking-orders` | 棚卸指示一覧 / 盘点指示列表 | Yes | viewer+ |
| GET | `/api/stocktaking-orders/:id` | 棚卸指示詳細 / 盘点指示详情 | Yes | viewer+ |
| POST | `/api/stocktaking-orders` | 棚卸指示作成 / 创建盘点指示 | Yes | manager+ |
| PUT | `/api/stocktaking-orders/:id` | 棚卸指示更新 / 更新盘点指示 | Yes | manager+ |
| DELETE | `/api/stocktaking-orders/:id` | 棚卸指示削除 / 删除盘点指示 | Yes | admin |
| POST | `/api/stocktaking-orders/:id/count` | カウント登録 / 登记计数 | Yes | operator+ |
| POST | `/api/stocktaking-orders/:id/complete` | 棚卸完了 / 盘点完成 | Yes | manager+ |
| POST | `/api/stocktaking-orders/:id/cancel` | 棚卸キャンセル / 取消盘点 | Yes | manager+ |

### 8.7 循環棚卸 / 循环盘点 — CycleCountController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/cycle-counts` | 循環棚卸一覧 / 循环盘点列表 | Yes | viewer+ |
| GET | `/api/cycle-counts/:id` | 循環棚卸詳細 / 循环盘点详情 | Yes | viewer+ |
| POST | `/api/cycle-counts` | 循環棚卸作成 / 创建循环盘点 | Yes | manager+ |
| PUT | `/api/cycle-counts/:id` | 循環棚卸更新 / 更新循环盘点 | Yes | manager+ |
| DELETE | `/api/cycle-counts/:id` | 循環棚卸削除 / 删除循环盘点 | Yes | admin |
| POST | `/api/cycle-counts/:id/execute` | 循環棚卸実行 / 执行循环盘点 | Yes | operator+ |

---

## 9. 返品管理 API / 退货管理 API — ReturnsModule（11 endpoints）

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/return-orders` | 返品一覧 / 退货列表 | Yes | viewer+ |
| GET | `/api/return-orders/:id` | 返品詳細 / 退货详情 | Yes | viewer+ |
| POST | `/api/return-orders` | 返品作成 / 创建退货 | Yes | operator+ |
| PUT | `/api/return-orders/:id` | 返品更新 / 更新退货 | Yes | operator+ |
| DELETE | `/api/return-orders/:id` | 返品削除 / 删除退货 | Yes | manager+ |
| POST | `/api/return-orders/:id/receive` | 返品受入 / 退货接收 | Yes | operator+ |
| POST | `/api/return-orders/:id/inspect` | 返品検品 / 退货检品 | Yes | operator+ |
| POST | `/api/return-orders/:id/putback` | 返品棚入れ / 退货上架 | Yes | operator+ |
| POST | `/api/return-orders/:id/complete` | 返品完了 / 退货完成 | Yes | operator+ |
| POST | `/api/return-orders/:id/cancel` | 返品キャンセル / 取消退货 | Yes | manager+ |
| POST | `/api/return-orders/import` | 返品一括取込 / 退货批量导入 | Yes | operator+ |

---

## 10. 請求管理 API / 计费管理 API — BillingModule（30 endpoints）

### 10.1 請求 / 计费 — BillingController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/billing` | 請求一覧（テナント隔離）/ 账单列表（租户隔离） | Yes | viewer+ |
| GET | `/api/billing/:id` | 請求詳細 / 账单详情 | Yes | viewer+ |
| POST | `/api/billing/generate-monthly` | 月次請求生成（トランザクション）/ 月度计费生成（事务） | Yes | admin |
| GET | `/api/billing/dashboard` | 請求ダッシュボード / 计费仪表盘 | Yes | manager+ |
| POST | `/api/billing/export` | 請求エクスポート / 账单导出 | Yes | manager+ |

### 10.2 作業費 / 作业费 — WorkChargeController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/billing/work-charges` | 作業費一覧 / 作业费列表 | Yes | viewer+ |
| GET | `/api/billing/work-charges/:id` | 作業費詳細 / 作业费详情 | Yes | viewer+ |
| POST | `/api/billing/work-charges` | 作業費作成 / 创建作业费 | Yes | manager+ |
| PUT | `/api/billing/work-charges/:id` | 作業費更新 / 更新作业费 | Yes | manager+ |
| DELETE | `/api/billing/work-charges/:id` | 作業費削除 / 删除作业费 | Yes | admin |

### 10.3 サービス料金 / 服务费率 — ServiceRateController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/service-rates` | サービス料金一覧 / 服务费率列表 | Yes | viewer+ |
| GET | `/api/service-rates/:id` | サービス料金詳細 / 服务费率详情 | Yes | viewer+ |
| POST | `/api/service-rates` | サービス料金作成 / 创建服务费率 | Yes | admin |
| PUT | `/api/service-rates/:id` | サービス料金更新 / 更新服务费率 | Yes | admin |
| DELETE | `/api/service-rates/:id` | サービス料金削除 / 删除服务费率 | Yes | admin |

### 10.4 配送料金 / 配送费率 — ShippingRateController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/shipping-rates` | 配送料金一覧 / 配送费率列表 | Yes | viewer+ |
| GET | `/api/shipping-rates/:id` | 配送料金詳細 / 配送费率详情 | Yes | viewer+ |
| POST | `/api/shipping-rates` | 配送料金作成 / 创建配送费率 | Yes | admin |
| PUT | `/api/shipping-rates/:id` | 配送料金更新 / 更新配送费率 | Yes | admin |
| DELETE | `/api/shipping-rates/:id` | 配送料金削除 / 删除配送费率 | Yes | admin |

### 10.5 請求書 / 发票 — InvoiceController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/invoices` | 請求書一覧 / 发票列表 | Yes | viewer+ |
| GET | `/api/invoices/:id` | 請求書詳細 / 发票详情 | Yes | viewer+ |
| POST | `/api/invoices` | 請求書作成 / 创建发票 | Yes | manager+ |
| PUT | `/api/invoices/:id` | 請求書更新 / 更新发票 | Yes | manager+ |
| DELETE | `/api/invoices/:id` | 請求書削除 / 删除发票 | Yes | admin |
| POST | `/api/invoices/:id/send` | 請求書送信 / 发送发票 | Yes | manager+ |
| GET | `/api/invoices/:id/pdf` | 請求書PDF生成 / 生成发票PDF | Yes | viewer+ |

### 10.6 価格カタログ / 价格目录 — PriceCatalogController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/price-catalogs` | 価格カタログ一覧 / 价格目录列表 | Yes | viewer+ |
| GET | `/api/price-catalogs/:id` | 価格カタログ詳細 / 价格目录详情 | Yes | viewer+ |
| POST | `/api/price-catalogs` | 価格カタログ作成 / 创建价格目录 | Yes | admin |
| PUT | `/api/price-catalogs/:id` | 価格カタログ更新 / 更新价格目录 | Yes | admin |
| DELETE | `/api/price-catalogs/:id` | 価格カタログ削除 / 删除价格目录 | Yes | admin |

---

## 11. 配送業者 API / 配送商 API — CarriersModule（20 endpoints）

### 11.1 配送業者管理 / 配送商管理 — CarriersController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/carriers` | 配送業者一覧 / 配送商列表 | Yes | viewer+ |
| GET | `/api/carriers/:id` | 配送業者詳細 / 配送商详情 | Yes | viewer+ |
| POST | `/api/carriers` | 配送業者作成 / 创建配送商 | Yes | admin |
| PUT | `/api/carriers/:id` | 配送業者更新 / 更新配送商 | Yes | admin |
| DELETE | `/api/carriers/:id` | 配送業者削除 / 删除配送商 | Yes | admin |

### 11.2 配送自動化設定 / 配送自动化设置 — CarrierAutomationController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/carrier-automation/configs` | 自動化設定一覧 / 自动化设置列表 | Yes | manager+ |
| GET | `/api/carrier-automation/configs/:type` | 自動化設定詳細 / 自动化设置详情 | Yes | manager+ |
| PUT | `/api/carrier-automation/configs/:type` | 自動化設定更新 / 更新自动化设置 | Yes | manager+ |

### 11.3 ヤマト B2 Cloud / 大和 B2 Cloud — YamatoB2Controller ★変更禁止 / 禁止修改★

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| POST | `/api/carrier-automation/yamato-b2/login` | B2 Cloud ログイン / B2 Cloud登录 | Yes | operator+ |
| POST | `/api/carrier-automation/yamato-b2/validate` | 出荷データバリデーション / 验证出库数据 | Yes | operator+ |
| POST | `/api/carrier-automation/yamato-b2/export` | B2 Cloud 出荷エクスポート / B2 Cloud出库导出 | Yes | operator+ |
| POST | `/api/carrier-automation/yamato-b2/print` | 送り状PDF生成 / 生成运单PDF | Yes | operator+ |

### 11.4 佐川急便 / 佐川急便 — SagawaController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| POST | `/api/sagawa/validate` | 佐川バリデーション / 佐川验证 | Yes | operator+ |
| POST | `/api/sagawa/export` | 佐川エクスポート / 佐川导出 | Yes | operator+ |
| POST | `/api/sagawa/print` | 佐川送り状PDF / 佐川运单PDF | Yes | operator+ |

### 11.5 ヤマト運賃計算 / 大和运费计算

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| POST | `/api/carrier-automation/yamato-calc/estimate` | 運賃概算 / 运费估算 | Yes | viewer+ |
| GET | `/api/carrier-automation/yamato-calc/rates` | 運賃テーブル取得 / 获取运费表 | Yes | viewer+ |
| PUT | `/api/carrier-automation/yamato-calc/rates` | 運賃テーブル更新 / 更新运费表 | Yes | admin |

---

## 12. 顧客管理 API / 客户管理 API — ClientsModule（35 endpoints）

### 12.1 荷主 / 货主 — ClientsController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/clients` | 荷主一覧 / 货主列表 | Yes | viewer+ |
| GET | `/api/clients/:id` | 荷主詳細 / 货主详情 | Yes | viewer+ |
| POST | `/api/clients` | 荷主作成 / 创建货主 | Yes | admin |
| PUT | `/api/clients/:id` | 荷主更新 / 更新货主 | Yes | admin |
| DELETE | `/api/clients/:id` | 荷主削除 / 删除货主 | Yes | admin |

### 12.2 サブ荷主 / 子货主 — SubClientController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/sub-clients` | サブ荷主一覧 / 子货主列表 | Yes | viewer+ |
| GET | `/api/sub-clients/:id` | サブ荷主詳細 / 子货主详情 | Yes | viewer+ |
| POST | `/api/sub-clients` | サブ荷主作成 / 创建子货主 | Yes | manager+ |
| PUT | `/api/sub-clients/:id` | サブ荷主更新 / 更新子货主 | Yes | manager+ |
| DELETE | `/api/sub-clients/:id` | サブ荷主削除 / 删除子货主 | Yes | admin |

### 12.3 店舗 / 店铺 — ShopController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/shops` | 店舗一覧 / 店铺列表 | Yes | viewer+ |
| GET | `/api/shops/:id` | 店舗詳細 / 店铺详情 | Yes | viewer+ |
| POST | `/api/shops` | 店舗作成 / 创建店铺 | Yes | manager+ |
| PUT | `/api/shops/:id` | 店舗更新 / 更新店铺 | Yes | manager+ |
| DELETE | `/api/shops/:id` | 店舗削除 / 删除店铺 | Yes | admin |

### 12.4 エンドカスタマー / 终端客户 — CustomerController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/customers` | 顧客一覧 / 客户列表 | Yes | viewer+ |
| GET | `/api/customers/:id` | 顧客詳細 / 客户详情 | Yes | viewer+ |
| POST | `/api/customers` | 顧客作成 / 创建客户 | Yes | operator+ |
| PUT | `/api/customers/:id` | 顧客更新 / 更新客户 | Yes | operator+ |
| DELETE | `/api/customers/:id` | 顧客削除 / 删除客户 | Yes | manager+ |

### 12.5 仕入先 / 供应商 — SupplierController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/suppliers` | 仕入先一覧 / 供应商列表 | Yes | viewer+ |
| GET | `/api/suppliers/:id` | 仕入先詳細 / 供应商详情 | Yes | viewer+ |
| POST | `/api/suppliers` | 仕入先作成 / 创建供应商 | Yes | manager+ |
| PUT | `/api/suppliers/:id` | 仕入先更新 / 更新供应商 | Yes | manager+ |
| DELETE | `/api/suppliers/:id` | 仕入先削除 / 删除供应商 | Yes | admin |

### 12.6 注文元 / 订单来源 — OrderSourceCompanyController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/order-source-companies` | 注文元一覧 / 订单来源列表 | Yes | viewer+ |
| GET | `/api/order-source-companies/:id` | 注文元詳細 / 订单来源详情 | Yes | viewer+ |
| POST | `/api/order-source-companies` | 注文元作成 / 创建订单来源 | Yes | manager+ |
| PUT | `/api/order-source-companies/:id` | 注文元更新 / 更新订单来源 | Yes | manager+ |
| DELETE | `/api/order-source-companies/:id` | 注文元削除 / 删除订单来源 | Yes | admin |

### 12.7 荷主ポータル / 货主门户 — ClientPortalController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/portal/dashboard` | ポータルダッシュボード / 门户仪表盘 | Yes | client |
| GET | `/api/portal/shipments` | ポータル出荷一覧 / 门户出库列表 | Yes | client |
| GET | `/api/portal/inbound` | ポータル入庫一覧 / 门户入库列表 | Yes | client |
| GET | `/api/portal/inventory` | ポータル在庫一覧 / 门户库存列表 | Yes | client |
| GET | `/api/portal/billing` | ポータル請求一覧 / 门户账单列表 | Yes | client |

---

## 13. 拡張システム API / 扩展系统 API — ExtensionsModule（46 endpoints）

### 13.1 プラグイン / 插件 — PluginController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/extensions/plugins` | プラグイン一覧 / 插件列表 | Yes | manager+ |
| GET | `/api/extensions/plugins/:id` | プラグイン詳細 / 插件详情 | Yes | manager+ |
| POST | `/api/extensions/plugins` | プラグインインストール / 安装插件 | Yes | admin |
| PUT | `/api/extensions/plugins/:id` | プラグイン設定更新 / 更新插件设置 | Yes | admin |
| DELETE | `/api/extensions/plugins/:id` | プラグインアンインストール / 卸载插件 | Yes | admin |
| POST | `/api/extensions/plugins/:id/enable` | プラグイン有効化 / 启用插件 | Yes | admin |
| POST | `/api/extensions/plugins/:id/disable` | プラグイン無効化 / 禁用插件 | Yes | admin |

### 13.2 Webhook — WebhookController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/extensions/webhooks` | Webhook 一覧 / Webhook列表 | Yes | manager+ |
| GET | `/api/extensions/webhooks/:id` | Webhook 詳細 / Webhook详情 | Yes | manager+ |
| POST | `/api/extensions/webhooks` | Webhook 作成 / 创建Webhook | Yes | admin |
| PUT | `/api/extensions/webhooks/:id` | Webhook 更新 / 更新Webhook | Yes | admin |
| DELETE | `/api/extensions/webhooks/:id` | Webhook 削除 / 删除Webhook | Yes | admin |
| POST | `/api/extensions/webhooks/:id/test` | Webhook テスト送信 / 测试Webhook | Yes | admin |
| GET | `/api/extensions/webhooks/:id/logs` | Webhook ログ / Webhook日志 | Yes | manager+ |

### 13.3 自動化スクリプト / 自动化脚本 — ScriptController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/extensions/scripts` | スクリプト一覧 / 脚本列表 | Yes | manager+ |
| GET | `/api/extensions/scripts/:id` | スクリプト詳細 / 脚本详情 | Yes | manager+ |
| POST | `/api/extensions/scripts` | スクリプト作成 / 创建脚本 | Yes | admin |
| PUT | `/api/extensions/scripts/:id` | スクリプト更新 / 更新脚本 | Yes | admin |
| DELETE | `/api/extensions/scripts/:id` | スクリプト削除 / 删除脚本 | Yes | admin |
| POST | `/api/extensions/scripts/:id/execute` | スクリプト実行 / 执行脚本 | Yes | admin |
| GET | `/api/extensions/scripts/:id/logs` | 実行ログ / 执行日志 | Yes | manager+ |

### 13.4 カスタムフィールド / 自定义字段 — CustomFieldController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/extensions/custom-fields` | カスタムフィールド一覧 / 自定义字段列表 | Yes | manager+ |
| GET | `/api/extensions/custom-fields/:id` | カスタムフィールド詳細 / 自定义字段详情 | Yes | manager+ |
| POST | `/api/extensions/custom-fields` | カスタムフィールド作成 / 创建自定义字段 | Yes | admin |
| PUT | `/api/extensions/custom-fields/:id` | カスタムフィールド更新 / 更新自定义字段 | Yes | admin |
| DELETE | `/api/extensions/custom-fields/:id` | カスタムフィールド削除 / 删除自定义字段 | Yes | admin |

### 13.5 機能フラグ / 功能标志 — FeatureFlagController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/extensions/feature-flags` | 機能フラグ一覧 / 功能标志列表 | Yes | admin |
| GET | `/api/extensions/feature-flags/:key` | 機能フラグ取得 / 获取功能标志 | Yes | admin |
| POST | `/api/extensions/feature-flags` | 機能フラグ作成 / 创建功能标志 | Yes | admin |
| PUT | `/api/extensions/feature-flags/:key` | 機能フラグ更新 / 更新功能标志 | Yes | admin |
| DELETE | `/api/extensions/feature-flags/:key` | 機能フラグ削除 / 删除功能标志 | Yes | admin |

### 13.6 自動処理ルール / 自动处理规则 — AutoProcessingRuleController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/auto-processing-rules` | 自動処理ルール一覧 / 自动处理规则列表 | Yes | manager+ |
| GET | `/api/auto-processing-rules/:id` | 自動処理ルール詳細 / 自动处理规则详情 | Yes | manager+ |
| POST | `/api/auto-processing-rules` | 自動処理ルール作成 / 创建自动处理规则 | Yes | admin |
| PUT | `/api/auto-processing-rules/:id` | 自動処理ルール更新 / 更新自动处理规则 | Yes | admin |
| DELETE | `/api/auto-processing-rules/:id` | 自動処理ルール削除 / 删除自动处理规则 | Yes | admin |
| GET | `/api/auto-processing-rules/:id/logs` | 実行ログ / 执行日志 | Yes | manager+ |

### 13.7 ルール定義 / 规则定义 — RuleController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/rules` | ルール一覧 / 规则列表 | Yes | manager+ |
| GET | `/api/rules/:id` | ルール詳細 / 规则详情 | Yes | manager+ |
| POST | `/api/rules` | ルール作成 / 创建规则 | Yes | admin |
| PUT | `/api/rules/:id` | ルール更新 / 更新规则 | Yes | admin |
| DELETE | `/api/rules/:id` | ルール削除 / 删除规则 | Yes | admin |

### 13.8 パッキングルール / 打包规则 — PackingRuleController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/packing-rules` | パッキングルール一覧 / 打包规则列表 | Yes | manager+ |
| GET | `/api/packing-rules/:id` | パッキングルール詳細 / 打包规则详情 | Yes | manager+ |
| POST | `/api/packing-rules` | パッキングルール作成 / 创建打包规则 | Yes | admin |
| PUT | `/api/packing-rules/:id` | パッキングルール更新 / 更新打包规则 | Yes | admin |
| DELETE | `/api/packing-rules/:id` | パッキングルール削除 / 删除打包规则 | Yes | admin |

---

## 14. 外部連携 API / 外部集成 API — IntegrationsModule（35 endpoints）

### 14.1 Amazon FBA — FbaController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/fba-shipment-plans` | FBA 出荷プラン一覧 / FBA出货计划列表 | Yes | viewer+ |
| GET | `/api/fba-shipment-plans/:id` | FBA 出荷プラン詳細 / FBA出货计划详情 | Yes | viewer+ |
| POST | `/api/fba-shipment-plans` | FBA 出荷プラン作成 / 创建FBA出货计划 | Yes | operator+ |
| PUT | `/api/fba-shipment-plans/:id` | FBA 出荷プラン更新 / 更新FBA出货计划 | Yes | operator+ |
| DELETE | `/api/fba-shipment-plans/:id` | FBA 出荷プラン削除 / 删除FBA出货计划 | Yes | manager+ |
| POST | `/api/fba-shipment-plans/:id/submit` | FBA プランサブミット / 提交FBA计划 | Yes | operator+ |
| GET | `/api/fba-shipment-plans/:id/labels` | FBA ラベル取得 / 获取FBA标签 | Yes | operator+ |

### 14.2 FBA ボックス / FBA箱 — FbaBoxController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/fba-boxes` | FBA ボックス一覧 / FBA箱列表 | Yes | viewer+ |
| GET | `/api/fba-boxes/:id` | FBA ボックス詳細 / FBA箱详情 | Yes | viewer+ |
| POST | `/api/fba-boxes` | FBA ボックス作成 / 创建FBA箱 | Yes | operator+ |
| PUT | `/api/fba-boxes/:id` | FBA ボックス更新 / 更新FBA箱 | Yes | operator+ |
| DELETE | `/api/fba-boxes/:id` | FBA ボックス削除 / 删除FBA箱 | Yes | manager+ |

### 14.3 楽天 RSL / 乐天RSL — RslController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/rsl-shipment-plans` | RSL 出荷プラン一覧 / RSL出货计划列表 | Yes | viewer+ |
| GET | `/api/rsl-shipment-plans/:id` | RSL 出荷プラン詳細 / RSL出货计划详情 | Yes | viewer+ |
| POST | `/api/rsl-shipment-plans` | RSL 出荷プラン作成 / 创建RSL出货计划 | Yes | operator+ |
| PUT | `/api/rsl-shipment-plans/:id` | RSL 出荷プラン更新 / 更新RSL出货计划 | Yes | operator+ |
| DELETE | `/api/rsl-shipment-plans/:id` | RSL 出荷プラン削除 / 删除RSL出货计划 | Yes | manager+ |

### 14.4 OMS 連携 / OMS对接 — OmsController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| POST | `/api/oms/sync` | OMS データ同期 / OMS数据同步 | Yes | admin |
| GET | `/api/oms/status` | OMS 同期ステータス / OMS同步状态 | Yes | manager+ |
| PUT | `/api/oms/config` | OMS 設定更新 / 更新OMS设置 | Yes | admin |

### 14.5 マーケットプレイス / 电商平台 — MarketplaceController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| POST | `/api/marketplace/sync` | マケプレ同期 / 平台同步 | Yes | admin |
| GET | `/api/marketplace/status` | マケプレ同期ステータス / 平台同步状态 | Yes | manager+ |
| PUT | `/api/marketplace/config` | マケプレ設定更新 / 更新平台设置 | Yes | admin |

### 14.6 ERP 連携 / ERP对接 — ErpController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| POST | `/api/erp/sync` | ERP データ同期 / ERP数据同步 | Yes | admin |
| GET | `/api/erp/status` | ERP 同期ステータス / ERP同步状态 | Yes | manager+ |
| PUT | `/api/erp/config` | ERP 設定更新 / 更新ERP设置 | Yes | admin |

### 14.7 B2 Cloud プロキシ / B2 Cloud代理 — PassthroughProxyController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| POST | `/api/passthrough/b2cloud/*` | B2 Cloud API プロキシ / B2 Cloud API代理 | Yes | operator+ |

---

## 15. レポート・KPI API / 报表・KPI API — ReportingModule（25 endpoints）

### 15.1 ダッシュボード / 仪表盘 — DashboardController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/dashboard/stats` | ダッシュボード統計 / 仪表盘统计 | Yes | viewer+ |
| GET | `/api/dashboard/orders-summary` | 注文サマリー / 订单汇总 | Yes | viewer+ |
| GET | `/api/dashboard/inventory-summary` | 在庫サマリー / 库存汇总 | Yes | viewer+ |

### 15.2 管理者ダッシュボード / 管理员仪表盘 — AdminDashboardController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/admin/dashboard` | 管理者ダッシュボード / 管理员仪表盘 | Yes | admin |
| GET | `/api/admin/dashboard/tenant-stats` | テナント別統計 / 按租户统计 | Yes | admin |

### 15.3 KPI — KpiController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/kpi/dashboard` | KPI ダッシュボード / KPI仪表盘 | Yes | manager+ |
| GET | `/api/kpi/fulfillment-rate` | 出荷率 / 发货率 | Yes | manager+ |
| GET | `/api/kpi/accuracy-rate` | 精度 / 准确率 | Yes | manager+ |
| GET | `/api/kpi/throughput` | スループット / 吞吐量 | Yes | manager+ |

### 15.4 日報 / 日报 — DailyReportController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/daily-reports` | 日報一覧 / 日报列表 | Yes | viewer+ |
| GET | `/api/daily-reports/:id` | 日報詳細 / 日报详情 | Yes | viewer+ |
| POST | `/api/daily-reports/generate` | 日報生成 / 生成日报 | Yes | manager+ |
| POST | `/api/daily-reports/export` | 日報エクスポート / 导出日报 | Yes | viewer+ |

### 15.5 異常レポート / 异常报表 — ExceptionController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/exceptions` | 異常一覧 / 异常列表 | Yes | viewer+ |
| GET | `/api/exceptions/:id` | 異常詳細 / 异常详情 | Yes | viewer+ |
| PATCH | `/api/exceptions/:id/resolve` | 異常解決 / 解决异常 | Yes | operator+ |

### 15.6 注文グループ / 订单分组 — OrderGroupController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/order-groups` | 注文グループ一覧 / 订单分组列表 | Yes | viewer+ |
| GET | `/api/order-groups/:id` | 注文グループ詳細 / 订单分组详情 | Yes | viewer+ |
| POST | `/api/order-groups` | 注文グループ作成 / 创建订单分组 | Yes | operator+ |
| PUT | `/api/order-groups/:id` | 注文グループ更新 / 更新订单分组 | Yes | operator+ |
| DELETE | `/api/order-groups/:id` | 注文グループ削除 / 删除订单分组 | Yes | manager+ |

### 15.7 ピークモード / 高峰模式 — PeakModeController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| POST | `/api/peak-mode/activate` | ピークモード有効化 / 启用高峰模式 | Yes | admin |
| POST | `/api/peak-mode/deactivate` | ピークモード無効化 / 禁用高峰模式 | Yes | admin |
| GET | `/api/peak-mode/status` | ピークモードステータス / 高峰模式状态 | Yes | manager+ |

---

## 16. 通知 API / 通知 API — NotificationsModule（15 endpoints）

### 16.1 通知 / 通知 — NotificationsController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/notifications` | 通知一覧 / 通知列表 | Yes | viewer+ |
| GET | `/api/notifications/unread-count` | 未読数取得 / 获取未读数 | Yes | viewer+ |
| GET | `/api/notifications/:id` | 通知詳細 / 通知详情 | Yes | viewer+ |
| PATCH | `/api/notifications/:id/read` | 既読にする / 标记已读 | Yes | viewer+ |
| POST | `/api/notifications/mark-all-read` | 全件既読 / 全部标记已读 | Yes | viewer+ |
| DELETE | `/api/notifications/:id` | 通知削除 / 删除通知 | Yes | viewer+ |

### 16.2 通知設定 / 通知设置 — NotificationPreferenceController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/notification-preferences` | 通知設定取得 / 获取通知设置 | Yes | viewer+ |
| PUT | `/api/notification-preferences` | 通知設定更新 / 更新通知设置 | Yes | viewer+ |

### 16.3 メールテンプレート / 邮件模板 — EmailTemplateController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/email-templates` | メールテンプレート一覧 / 邮件模板列表 | Yes | admin |
| GET | `/api/email-templates/:id` | メールテンプレート詳細 / 邮件模板详情 | Yes | admin |
| POST | `/api/email-templates` | メールテンプレート作成 / 创建邮件模板 | Yes | admin |
| PUT | `/api/email-templates/:id` | メールテンプレート更新 / 更新邮件模板 | Yes | admin |
| DELETE | `/api/email-templates/:id` | メールテンプレート削除 / 删除邮件模板 | Yes | admin |
| POST | `/api/email-templates/:id/preview` | メールプレビュー / 预览邮件 | Yes | admin |
| POST | `/api/email-templates/:id/send-test` | テスト送信 / 测试发送 | Yes | admin |

---

## 17. 管理者 API / 管理 API — AdminModule（25 endpoints）

### 17.1 テナント / 租户 — TenantController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/tenants` | テナント一覧 / 租户列表 | Yes | admin |
| GET | `/api/tenants/:id` | テナント詳細 / 租户详情 | Yes | admin |
| POST | `/api/tenants` | テナント作成 / 创建租户 | Yes | admin |
| PUT | `/api/tenants/:id` | テナント更新 / 更新租户 | Yes | admin |
| DELETE | `/api/tenants/:id` | テナント削除 / 删除租户 | Yes | admin |
| GET | `/api/tenants/:id/stats` | テナント統計 / 租户统计 | Yes | admin |

### 17.2 ユーザー管理 / 用户管理 — UserController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/users` | ユーザー一覧 / 用户列表 | Yes | admin |
| GET | `/api/users/:id` | ユーザー詳細 / 用户详情 | Yes | admin |
| POST | `/api/users` | ユーザー作成 / 创建用户 | Yes | admin |
| PUT | `/api/users/:id` | ユーザー更新 / 更新用户 | Yes | admin |
| DELETE | `/api/users/:id` | ユーザー削除 / 删除用户 | Yes | admin |
| PATCH | `/api/users/:id/role` | ロール変更 / 变更角色 | Yes | admin |
| PATCH | `/api/users/:id/activate` | ユーザー有効化 / 激活用户 | Yes | admin |
| PATCH | `/api/users/:id/deactivate` | ユーザー無効化 / 停用用户 | Yes | admin |

### 17.3 システム設定 / 系统设置 — SystemSettingsController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/settings` | システム設定取得 / 获取系统设置 | Yes | admin |
| PATCH | `/api/settings` | システム設定更新 / 更新系统设置 | Yes | admin |

### 17.4 操作ログ / 操作日志 — OperationLogController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/operation-logs` | 操作ログ一覧 / 操作日志列表 | Yes | manager+ |
| GET | `/api/operation-logs/:id` | 操作ログ詳細 / 操作日志详情 | Yes | manager+ |
| POST | `/api/operation-logs/export` | 操作ログエクスポート / 导出操作日志 | Yes | admin |

### 17.5 API ログ / API日志 — ApiLogController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/api-logs` | API ログ一覧 / API日志列表 | Yes | admin |
| GET | `/api/api-logs/:id` | API ログ詳細 / API日志详情 | Yes | admin |

---

## 18. データインポート API / 数据导入 API — ImportModule（15 endpoints）

### 18.1 CSV インポート / CSV导入 — ImportController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| POST | `/api/import/csv` | 汎用 CSV インポート / 通用CSV导入 | Yes | operator+ |
| POST | `/api/import/orders` | 注文一括インポート / 订单批量导入 | Yes | operator+ |
| POST | `/api/import/products` | 商品一括インポート / 商品批量导入 | Yes | operator+ |
| POST | `/api/import/inventory` | 在庫一括インポート / 库存批量导入 | Yes | manager+ |
| GET | `/api/import/history` | インポート履歴 / 导入历史 | Yes | viewer+ |
| GET | `/api/import/templates` | インポートテンプレート取得 / 获取导入模板 | Yes | viewer+ |

### 18.2 マッピング設定 / 映射配置 — MappingConfigController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/mapping-configs` | マッピング設定一覧 / 映射配置列表 | Yes | manager+ |
| GET | `/api/mapping-configs/:id` | マッピング設定詳細 / 映射配置详情 | Yes | manager+ |
| POST | `/api/mapping-configs` | マッピング設定作成 / 创建映射配置 | Yes | admin |
| PUT | `/api/mapping-configs/:id` | マッピング設定更新 / 更新映射配置 | Yes | admin |
| DELETE | `/api/mapping-configs/:id` | マッピング設定削除 / 删除映射配置 | Yes | admin |

### 18.3 WMS スケジュール / WMS计划 — WmsScheduleController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/wms-schedules` | スケジュール一覧 / 计划列表 | Yes | manager+ |
| GET | `/api/wms-schedules/:id` | スケジュール詳細 / 计划详情 | Yes | manager+ |
| POST | `/api/wms-schedules` | スケジュール作成 / 创建计划 | Yes | admin |
| PUT | `/api/wms-schedules/:id` | スケジュール更新 / 更新计划 | Yes | admin |
| DELETE | `/api/wms-schedules/:id` | スケジュール削除 / 删除计划 | Yes | admin |

---

## 19. レンダリング API / 渲染 API — RenderModule（15 endpoints）

### 19.1 印刷テンプレート / 打印模板 — PrintTemplateController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/print-templates` | 印刷テンプレート一覧 / 打印模板列表 | Yes | viewer+ |
| GET | `/api/print-templates/:id` | 印刷テンプレート詳細 / 打印模板详情 | Yes | viewer+ |
| POST | `/api/print-templates` | 印刷テンプレート作成 / 创建打印模板 | Yes | manager+ |
| PUT | `/api/print-templates/:id` | 印刷テンプレート更新 / 更新打印模板 | Yes | manager+ |
| DELETE | `/api/print-templates/:id` | 印刷テンプレート削除 / 删除打印模板 | Yes | admin |
| POST | `/api/print-templates/:id/render` | テンプレートレンダリング / 渲染模板 | Yes | operator+ |
| POST | `/api/print-templates/:id/preview` | テンプレートプレビュー / 预览模板 | Yes | viewer+ |

### 19.2 レンダリング / 渲染 — RenderController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| POST | `/api/render/label` | ラベル生成 / 生成标签 | Yes | operator+ |
| POST | `/api/render/pdf` | PDF 生成 / 生成PDF | Yes | operator+ |
| POST | `/api/render/barcode` | バーコード生成 / 生成条码 | Yes | operator+ |
| POST | `/api/render/delivery-slip` | 納品書生成 / 生成送货单 | Yes | operator+ |
| POST | `/api/render/packing-list` | パッキングリスト生成 / 生成装箱单 | Yes | operator+ |

### 19.3 フォームテンプレート / 表单模板 — FormTemplateController

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/form-templates` | フォームテンプレート一覧 / 表单模板列表 | Yes | viewer+ |
| GET | `/api/form-templates/:id` | フォームテンプレート詳細 / 表单模板详情 | Yes | viewer+ |
| POST | `/api/form-templates` | フォームテンプレート作成 / 创建表单模板 | Yes | admin |
| PUT | `/api/form-templates/:id` | フォームテンプレート更新 / 更新表单模板 | Yes | admin |
| DELETE | `/api/form-templates/:id` | フォームテンプレート削除 / 删除表单模板 | Yes | admin |

---

## 20. キュー API / 队列 API — QueueModule（5 endpoints）

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/queue/status` | キューステータス / 队列状态 | Yes | admin |
| GET | `/api/queue/jobs` | ジョブ一覧 / 作业列表 | Yes | admin |
| GET | `/api/queue/jobs/:id` | ジョブ詳細 / 作业详情 | Yes | admin |
| POST | `/api/queue/jobs/:id/retry` | ジョブリトライ / 重试作业 | Yes | admin |
| DELETE | `/api/queue/jobs/:id` | ジョブ削除 / 删除作业 | Yes | admin |

---

## 21. ヘルス API / 健康检查 API — HealthModule（3 endpoints）

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/health` | ヘルスチェック / 健康检查 | No | - |
| GET | `/health/db` | データベース接続チェック / 数据库连接检查 | No | - |
| GET | `/health/redis` | Redis 接続チェック / Redis连接检查 | No | - |

---

## 22. ワークフロー API / 工作流 API — AutomationModule（10 endpoints）

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/workflows` | ワークフロー一覧 / 工作流列表 | Yes | manager+ |
| GET | `/api/workflows/:id` | ワークフロー詳細 / 工作流详情 | Yes | manager+ |
| POST | `/api/workflows` | ワークフロー作成 / 创建工作流 | Yes | admin |
| PUT | `/api/workflows/:id` | ワークフロー更新 / 更新工作流 | Yes | admin |
| DELETE | `/api/workflows/:id` | ワークフロー削除 / 删除工作流 | Yes | admin |
| POST | `/api/workflows/trigger` | ワークフロートリガー / 触发工作流 | Yes | operator+ |
| GET | `/api/workflows/:id/logs` | ワークフローログ / 工作流日志 | Yes | manager+ |
| GET | `/api/slotting-rules` | スロッティングルール一覧 / 货位分配规则列表 | Yes | manager+ |
| POST | `/api/slotting-rules` | スロッティングルール作成 / 创建货位分配规则 | Yes | admin |
| PUT | `/api/slotting-rules/:id` | スロッティングルール更新 / 更新货位分配规则 | Yes | admin |

---

## 23. 写真管理 API / 照片管理 API（5 endpoints）

| Method | Path | Description / 説明 | Auth | Role |
|--------|------|-------------------|------|------|
| GET | `/api/photos` | 写真一覧 / 照片列表 | Yes | viewer+ |
| GET | `/api/photos/:id` | 写真取得 / 获取照片 | Yes | viewer+ |
| POST | `/api/photos/upload` | 写真アップロード / 上传照片 | Yes | operator+ |
| DELETE | `/api/photos/:id` | 写真削除 / 删除照片 | Yes | operator+ |
| POST | `/api/photos/bulk-upload` | 一括アップロード / 批量上传 | Yes | operator+ |

---

## 24. エンドポイント総数 / 端点总数

| モジュール / 模块 | エンドポイント数 / 端点数 |
|------------------|----------------------|
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

## 25. 移行チェックリスト / 迁移检查清单

各エンドポイントについて：
对于每个端点：

- [ ] NestJS Controller 実装 / 实现
- [ ] NestJS Service 実装 / 实现
- [ ] Drizzle クエリ実装 / 实现
- [ ] Zod DTO バリデーション / 验证
- [ ] 単体テスト / 单元测试
- [ ] 統合テスト / 集成测试
- [ ] フロントエンド動作確認 / 前端功能确认
- [ ] レスポンス互換性確認 / 响应兼容性确认
