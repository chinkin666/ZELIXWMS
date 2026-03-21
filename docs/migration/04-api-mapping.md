# ZELIXWMS API 移行マッピング
# ZELIXWMS API 迁移映射

> Express.js → NestJS の全エンドポイント移行マッピング
> Express.js → NestJS 全端点迁移映射

## 1. 移行方針 / 迁移方针

- フロントエンドの変更を最小限にするため、パス構造を維持
- `/api/` プレフィックスは維持（v2 は将来追加時に使用）
- レスポンス形式はできるだけ互換を保つ
- 前端改动最小化，保持路径结构
- 保持 `/api/` 前缀
- 响应格式尽量保持兼容

## 2. 認証 API / 认证 API

| Express (現行) | NestJS (移行後) | Controller | 備考 |
|----------------|-----------------|------------|------|
| POST /api/auth/login | POST /api/auth/login | AuthController | Supabase Auth に変更 |
| POST /api/auth/register | POST /api/auth/register | AuthController | Supabase Auth |
| GET /api/auth/me | GET /api/auth/me | AuthController | JWT decode |
| POST /api/auth/logout | POST /api/auth/logout | AuthController | Supabase signOut |

## 3. 商品管理 API / 商品管理 API

| Express | NestJS | Module | 備考 |
|---------|--------|--------|------|
| GET /api/products | GET /api/products | ProductsModule | クエリパラメータ互換 |
| POST /api/products | POST /api/products | ProductsModule | Zod schema 流用 |
| GET /api/products/:id | GET /api/products/:id | ProductsModule | UUID化 |
| PUT /api/products/:id | PUT /api/products/:id | ProductsModule | 全フィールド更新 |
| PATCH /api/products/:id | PATCH /api/products/:id | ProductsModule | 部分更新 |
| DELETE /api/products/:id | DELETE /api/products/:id | ProductsModule | ソフトデリート |
| POST /api/products/import | POST /api/products/import | ProductsModule | CSV一括取込 |

## 4. 入庫管理 API / 入库管理 API

| Express | NestJS | Module | 備考 |
|---------|--------|--------|------|
| GET /api/inbound-orders | GET /api/inbound-orders | InboundModule | ページネーション |
| POST /api/inbound-orders | POST /api/inbound-orders | InboundModule | LOGIFAST全フィールド |
| GET /api/inbound-orders/:id | GET /api/inbound-orders/:id | InboundModule | |
| PUT /api/inbound-orders/:id | PUT /api/inbound-orders/:id | InboundModule | draft のみ |
| DELETE /api/inbound-orders/:id | DELETE /api/inbound-orders/:id | InboundModule | draft のみ |
| POST /api/inbound-orders/:id/confirm | POST /api/inbound-orders/:id/confirm | InboundModule | トランザクション化 |
| POST /api/inbound-orders/:id/receive | POST /api/inbound-orders/:id/receive | InboundModule | 行別検品 |
| POST /api/inbound-orders/:id/bulk-receive | POST /api/inbound-orders/:id/bulk-receive | InboundModule | 一括検品 |
| POST /api/inbound-orders/:id/putaway | POST /api/inbound-orders/:id/putaway | InboundModule | 棚入れ |
| POST /api/inbound-orders/:id/complete | POST /api/inbound-orders/:id/complete | InboundModule | |
| POST /api/inbound-orders/:id/cancel | POST /api/inbound-orders/:id/cancel | InboundModule | |
| GET /api/inbound-orders/history | GET /api/inbound-orders/history | InboundModule | |
| GET /api/inbound-orders/:id/variance | GET /api/inbound-orders/:id/variance | InboundModule | |
| POST /api/inbound-orders/import | POST /api/inbound-orders/import | InboundModule | CSV取込 |

## 5. 出荷管理 API / 出荷管理 API

| Express | NestJS | Module | 備考 |
|---------|--------|--------|------|
| GET /api/shipment-orders | GET /api/shipment-orders | ShipmentModule | 50+フィルター |
| POST /api/shipment-orders/manual/bulk | POST /api/shipment-orders/manual/bulk | ShipmentModule | 一括作成 |
| GET /api/shipment-orders/:id | GET /api/shipment-orders/:id | ShipmentModule | |
| PATCH /api/shipment-orders/:id | PATCH /api/shipment-orders/:id | ShipmentModule | 部分更新 |
| DELETE /api/shipment-orders/:id | DELETE /api/shipment-orders/:id | ShipmentModule | RBAC |
| POST /api/shipment-orders/delete/bulk | POST /api/shipment-orders/delete/bulk | ShipmentModule | RBAC |
| POST /api/shipment-orders/by-ids | POST /api/shipment-orders/by-ids | ShipmentModule | |
| PATCH /api/shipment-orders/bulk | PATCH /api/shipment-orders/bulk | ShipmentModule | 一括更新 |
| POST /api/shipment-orders/status/bulk | POST /api/shipment-orders/status/bulk | ShipmentModule | ステータス変更 |
| POST /api/shipment-orders/carrier-receipts/import | POST /api/shipment-orders/carrier-receipts/import | ShipmentModule | 送り状取込 |

## 6. 在庫管理 API / 库存管理 API

| Express | NestJS | Module | 備考 |
|---------|--------|--------|------|
| GET /api/inventory/overview | GET /api/inventory/overview | InventoryModule | |
| GET /api/inventory/location-usage | GET /api/inventory/location-usage | InventoryModule | |
| GET /api/inventory/stock | GET /api/inventory/stock | InventoryModule | 倉庫種別フィルター |
| GET /api/inventory/stock/summary | GET /api/inventory/stock/summary | InventoryModule | |
| GET /api/inventory/stock/:productId | GET /api/inventory/stock/:productId | InventoryModule | |
| POST /api/inventory/adjust | POST /api/inventory/adjust | InventoryModule | RBAC |
| POST /api/inventory/bulk-adjust | POST /api/inventory/bulk-adjust | InventoryModule | RBAC |
| GET /api/inventory/movements | GET /api/inventory/movements | InventoryModule | |
| GET /api/inventory/alerts/low-stock | GET /api/inventory/alerts/low-stock | InventoryModule | |
| POST /api/inventory/reserve-orders | POST /api/inventory/reserve-orders | InventoryModule | トランザクション化 |
| POST /api/inventory/transfer | POST /api/inventory/transfer | InventoryModule | RBAC |
| POST /api/inventory/cleanup-zero | POST /api/inventory/cleanup-zero | InventoryModule | RBAC |
| POST /api/inventory/rebuild | POST /api/inventory/rebuild | InventoryModule | RBAC |
| POST /api/inventory/release-expired-reservations | POST /api/inventory/release-expired-reservations | InventoryModule | RBAC |
| GET /api/inventory/ledger-summary | GET /api/inventory/ledger-summary | InventoryModule | 受払一覧 |

## 7. 配送業者 API / 配送公司 API

| Express | NestJS | Module | 備考 |
|---------|--------|--------|------|
| GET /api/carriers | GET /api/carriers | CarriersModule | |
| GET /api/carrier-automation/configs | GET /api/carrier-automation/configs | CarriersModule | |
| PUT /api/carrier-automation/configs/:type | PUT /api/carrier-automation/configs/:type | CarriersModule | |
| POST /api/carrier-automation/yamato-b2/validate | POST /api/carrier-automation/yamato-b2/validate | YamatoB2Module | **変更禁止** |
| POST /api/carrier-automation/yamato-b2/export | POST /api/carrier-automation/yamato-b2/export | YamatoB2Module | **変更禁止** |
| POST /api/carrier-automation/yamato-b2/print | POST /api/carrier-automation/yamato-b2/print | YamatoB2Module | **変更禁止** |

## 8. 請求管理 API / 请求管理 API

| Express | NestJS | Module | 備考 |
|---------|--------|--------|------|
| GET /api/billing | GET /api/billing | BillingModule | テナント隔離 |
| POST /api/billing/generate-monthly | POST /api/billing/generate-monthly | BillingModule | トランザクション化 |
| GET /api/billing/work-charges | GET /api/billing/work-charges | BillingModule | |
| GET /api/billing/dashboard | GET /api/billing/dashboard | BillingModule | |

## 9. その他 API / 其他 API

| Express | NestJS | Module | 備考 |
|---------|--------|--------|------|
| GET /api/return-orders | GET /api/return-orders | ReturnsModule | |
| POST /api/return-orders | POST /api/return-orders | ReturnsModule | |
| GET /api/locations | GET /api/locations | LocationsModule | |
| GET /api/warehouses | GET /api/warehouses | WarehousesModule | |
| GET /api/clients | GET /api/clients | ClientsModule | |
| GET /api/notifications | GET /api/notifications | NotificationsModule | |
| GET /api/daily-reports | GET /api/daily-reports | DailyReportsModule | |
| GET /api/kpi/dashboard | GET /api/kpi/dashboard | KpiModule | |
| GET /api/operation-logs | GET /api/operation-logs | LogsModule | |
| GET /api/print-templates | GET /api/print-templates | TemplatesModule | |
| GET /health | GET /health | HealthModule | NestJS TerminusModule |

## 10. レスポンス形式の互換性 / 响应格式兼容性

### 現行 (Express)
```json
// 一覧
{ "items": [...], "total": 100, "page": 1, "limit": 50 }

// 単体
{ "_id": "...", "sku": "...", ... }

// エラー
{ "message": "...", "error": "..." }
```

### 移行後 (NestJS)
```json
// 一覧（互換維持）
{ "items": [...], "total": 100, "page": 1, "limit": 50 }

// 単体（_id → id にしたいが互換のため _id も返す）
{ "id": "uuid", "_id": "uuid", "sku": "...", ... }

// エラー（NestJS標準に合わせつつ互換維持）
{ "statusCode": 400, "message": "...", "error": "Bad Request" }
```

### TransformInterceptor で互換処理
```typescript
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(
      map(data => {
        // _id 互換: id → _id エイリアス
        if (data?.id && !data._id) data._id = data.id;
        return data;
      }),
    );
  }
}
```

## 11. 移行チェックリスト / 迁移检查清单

各エンドポイントについて：
- [ ] NestJS Controller 実装
- [ ] Service 実装
- [ ] Drizzle クエリ実装
- [ ] テスト移行
- [ ] フロントエンド動作確認
- [ ] レスポンス互換性確認
