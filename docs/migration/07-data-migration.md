# ZELIXWMS データ移行手順書
# ZELIXWMS 数据迁移手册

> MongoDB → PostgreSQL 完全データ移行ガイド
> MongoDB → PostgreSQL 完整数据迁移指南
>
> 最終更新 / 最后更新: 2026-03-21

---

## 1. 移行概要 / 迁移概述

```
MongoDB (nexand-shipment DB)
  ↓ mongodump (BSON)
  ↓ bsondump → JSON
  ↓ ETL スクリプト (TypeScript + Drizzle)
  ↓   ├── ObjectId → UUID v5 変換 / 转换
  ↓   ├── 埋め込みドキュメント → 正規化テーブル / 嵌入文档 → 规范化表
  ↓   ├── Mixed 型 → JSONB / Mixed类型 → JSONB
  ↓   └── ステータス nested → flat カラム / 状态嵌套 → 扁平列
  ↓ PostgreSQL INSERT (batch)
PostgreSQL (zelixwms DB)
```

### 前提条件 / 前提条件

- MongoDB 稼働中 (port 27017) / MongoDB运行中
- PostgreSQL 稼働中 (port 5432) / PostgreSQL运行中
- 全 Drizzle マイグレーション適用済み / 全部Drizzle迁移已应用
- Node.js 20+ / tsx
- 十分なディスク容量（MongoDB データの 2 倍以上）/ 足够磁盘空间

---

## 2. ObjectId → UUID v5 変換 / ObjectId → UUID v5 转换

### 2.1 変換方針 / 转换方针

**重要: `padEnd` 方式は使用しない。UUID v5 (namespace + seed) を使用する。**
**重要：不使用 `padEnd` 方式。使用 UUID v5（namespace + seed）。**

理由 / 理由:
- `padEnd` はゼロ埋めにより UUID の一意性が保証されない
  `padEnd` 通过补零无法保证UUID唯一性
- UUID v5 は同じ入力から常に同じ UUID を生成する（決定論的）
  UUID v5 从相同输入始终生成相同UUID（确定性）
- コレクション名を含めることで異なるコレクション間の衝突を防止
  包含集合名可防止不同集合间的冲突

### 2.2 変換ロジック / 转换逻辑

```typescript
import { v5 as uuidv5 } from 'uuid';

// ZELIXWMS 専用の名前空間 UUID / ZELIXWMS专用命名空间UUID
const ZELIXWMS_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // DNS namespace

/**
 * MongoDB ObjectId を UUID v5 に変換する
 * 将MongoDB ObjectId转换为UUID v5
 *
 * @param collection - コレクション名 / 集合名 (例: 'products', 'shipmentorders')
 * @param objectId - MongoDB ObjectId 文字列 / MongoDB ObjectId字符串 (24文字 hex)
 * @returns UUID v5 文字列 / UUID v5字符串
 *
 * 例 / 示例:
 *   objectIdToUuid('products', '69b6205e7ddcb7290ca9fd74')
 *   → 'a3f4b5c6-d7e8-5f90-a1b2-c3d4e5f6a7b8' (確定的 / 确定性)
 */
function objectIdToUuid(collection: string, objectId: string): string {
  const seed = `${collection}:${objectId}`;
  return uuidv5(seed, ZELIXWMS_NAMESPACE);
}
```

### 2.3 特殊な ID 変換 / 特殊ID转换

```typescript
// tenantId の固定マッピング / tenantId固定映射
const TENANT_MAPPING: Record<string, string> = {
  'default': '00000000-0000-0000-0000-000000000001',
  // 他のテナントは objectIdToUuid('tenants', oid) で変換
  // 其他租户使用 objectIdToUuid('tenants', oid) 转换
};

// 文字列参照の変換 / 字符串引用转换
function resolveRef(collection: string, ref: string | null): string | null {
  if (!ref) return null;
  if (TENANT_MAPPING[ref]) return TENANT_MAPPING[ref];
  return objectIdToUuid(collection, ref);
}
```

### 2.4 ID マッピングテーブル / ID映射表

ETL 実行時に ID マッピングを記録する一時テーブル：
ETL执行时记录ID映射的临时表：

```sql
-- マッピングテーブル / 映射表
CREATE TABLE IF NOT EXISTS _migration_id_map (
  collection VARCHAR(100) NOT NULL,
  mongo_id   VARCHAR(24)  NOT NULL,
  pg_uuid    UUID         NOT NULL,
  created_at TIMESTAMPTZ  DEFAULT now(),
  PRIMARY KEY (collection, mongo_id)
);

CREATE INDEX idx_migration_id_map_uuid ON _migration_id_map (pg_uuid);
```

---

## 3. コレクション別移行順序 / 按集合迁移顺序

### 3.1 依存関係グラフ / 依赖关系图

外部キー依存を尊重し、親テーブルから子テーブルの順に移行する。
遵循外键依赖，从父表到子表的顺序迁移。

```
Layer 0 (依存なし / 无依赖):
  tenants

Layer 1 (tenants に依存 / 依赖tenants):
  users, warehouses, carriers, clients

Layer 2 (Layer 1 に依存 / 依赖Layer 1):
  locations (→ warehouses)
  sub_clients (→ clients)
  shops (→ clients)
  customers (→ clients)
  suppliers (→ clients)
  products (→ clients)
  system_settings (→ tenants)

Layer 3 (Layer 2 に依存 / 依赖Layer 2):
  product_sub_skus (→ products)
  lots (→ products)
  serial_numbers (→ products, lots)
  stock_quants (→ products, locations)
  carrier_automation_configs (→ carriers)
  print_templates (→ tenants)
  email_templates (→ tenants)

Layer 4 (Layer 3 に依存 / 依赖Layer 3):
  inbound_orders (→ warehouses, clients)
  inbound_order_lines (→ inbound_orders, products)
  shipment_orders (→ warehouses, clients, carriers)
  shipment_order_products (→ shipment_orders, products)
  shipment_order_materials (→ shipment_orders)
  return_orders (→ shipment_orders)
  return_order_lines (→ return_orders, products)

Layer 5 (Layer 4 に依存 / 依赖Layer 4):
  stock_moves (→ stock_quants, products, locations)
  inventory_ledger (→ products, locations)
  billing_records (→ clients, shipment_orders)
  invoices (→ clients, billing_records)
  operation_logs (→ users)
  api_logs (→ users)
  notifications (→ users)

Layer 6 (独立 / 独立):
  plugins, webhooks, automation_scripts, feature_flags
  auto_processing_rules, rule_definitions
  waves, warehouse_tasks, pick_tasks
  stocktaking_orders, cycle_count_plans
  fba_shipment_plans, rsl_shipment_plans
  mapping_configs, wms_schedules
  daily_reports, exception_reports, order_groups
```

### 3.2 移行スクリプト一覧 / 迁移脚本列表

```
scripts/migrate/
├── 00-setup.ts                 # マッピングテーブル作成 / 创建映射表
├── 01-tenants-users.ts         # Layer 0-1: tenants, users
├── 02-master-data.ts           # Layer 1-2: warehouses, locations, carriers, clients, sub-entities
├── 03-products.ts              # Layer 2-3: products, product_sub_skus, lots, serial_numbers
├── 04-inventory.ts             # Layer 3: stock_quants, stock_moves, inventory_ledger
├── 05-inbound-orders.ts        # Layer 4: inbound_orders, inbound_order_lines
├── 06-shipment-orders.ts       # Layer 4: shipment_orders, shipment_order_products (最大量)
├── 07-returns.ts               # Layer 4: return_orders, return_order_lines
├── 08-billing.ts               # Layer 5: billing_records, invoices, work_charges, rates
├── 09-logs-notifications.ts    # Layer 5: operation_logs, api_logs, notifications
├── 10-extensions.ts            # Layer 6: plugins, webhooks, scripts, rules
├── 11-warehouse-ops.ts         # Layer 6: waves, tasks, stocktaking
├── 12-integrations.ts          # Layer 6: FBA, RSL, schedules, reports
├── 13-templates.ts             # Layer 3: print/email/form templates
├── verify.ts                   # 全テーブル検証 / 全表验证
├── cleanup.ts                  # マッピングテーブル削除 / 删除映射表
└── run-all.ts                  # 全ステップ実行 / 执行全部步骤
```

---

## 4. 埋め込みドキュメント → 正規化テーブル変換 / 嵌入文档 → 规范化表转换

### 4.1 パターン一覧 / 模式列表

| MongoDB 構造 / MongoDB结构 | PostgreSQL 構造 / PostgreSQL结构 | 変換パターン / 转换模式 |
|---|---|---|
| `products.subSkus[]` | `product_sub_skus` テーブル | 1:N 分解 / 拆分 |
| `shipmentorders.products[]` | `shipment_order_products` テーブル | 1:N 分解 / 拆分 |
| `shipmentorders.materials[]` | `shipment_order_materials` テーブル | 1:N 分解 / 拆分 |
| `inboundorders.lines[]` | `inbound_order_lines` テーブル | 1:N 分解 / 拆分 |
| `inboundorders.serviceOptions[]` | `inbound_service_options` テーブル | 1:N 分解 / 拆分 |
| `returnorders.lines[]` | `return_order_lines` テーブル | 1:N 分解 / 拆分 |
| `shipmentorders.status` (nested) | フラットカラム / 扁平列 | nested → flat |
| `shipmentorders.recipient` (nested) | フラットカラム / 扁平列 | nested → flat |
| `Mixed` 型フィールド | JSONB カラム | そのまま / 直接 |

### 4.2 1:N 分解パターン / 1:N拆分模式

```typescript
// ShipmentOrder.products[] → shipment_order_products テーブル
// ShipmentOrder.products[] → shipment_order_products 表

interface MongoShipmentOrder {
  _id: ObjectId;
  products: Array<{
    productId: string;
    sku: string;
    name: string;
    quantity: number;
    price: number;
  }>;
}

async function migrateShipmentOrderProducts(
  mongoOrder: MongoShipmentOrder,
  pgOrderId: string,
  tenantId: string,
  tx: DrizzleTransaction,
) {
  for (const [index, item] of mongoOrder.products.entries()) {
    await tx.insert(shipmentOrderProducts).values({
      id: uuidv4(),  // 新規 UUID / 新UUID（元の _id がないため）
      tenantId,
      shipmentOrderId: pgOrderId,
      productId: objectIdToUuid('products', item.productId),
      sku: item.sku,
      name: item.name,
      quantity: item.quantity,
      price: item.price?.toString() ?? null,
      sortOrder: index,
    });
  }
}
```

### 4.3 Nested → Flat パターン / 嵌套 → 扁平模式

```typescript
// ShipmentOrder.status (nested) → flat columns
// ShipmentOrder.status（嵌套）→ 扁平列

interface MongoStatus {
  confirm: { isConfirmed: boolean; confirmedAt?: Date };
  printReady: { isPrintReady: boolean };
  shipped: { isShipped: boolean; shippedAt?: Date };
  delivered: { isDelivered: boolean; deliveredAt?: Date };
  cancelled: { isCancelled: boolean; cancelledAt?: Date };
}

function flattenStatus(status: MongoStatus) {
  return {
    isConfirmed: status?.confirm?.isConfirmed ?? false,
    confirmedAt: status?.confirm?.confirmedAt ?? null,
    isPrintReady: status?.printReady?.isPrintReady ?? false,
    isShipped: status?.shipped?.isShipped ?? false,
    shippedAt: status?.shipped?.shippedAt ?? null,
    isDelivered: status?.delivered?.isDelivered ?? false,
    deliveredAt: status?.delivered?.deliveredAt ?? null,
    isCancelled: status?.cancelled?.isCancelled ?? false,
    cancelledAt: status?.cancelled?.cancelledAt ?? null,
  };
}

// ShipmentOrder.recipient (nested) → flat columns
// ShipmentOrder.recipient（嵌套）→ 扁平列

interface MongoRecipient {
  postalCode: string;
  prefecture: string;
  city: string;
  street: string;
  name: string;
  phone: string;
  company?: string;
}

function flattenRecipient(recipient: MongoRecipient) {
  return {
    recipientPostalCode: recipient?.postalCode ?? '',
    recipientPrefecture: recipient?.prefecture ?? '',
    recipientCity: recipient?.city ?? '',
    recipientStreet: recipient?.street ?? '',
    recipientName: recipient?.name ?? '',
    recipientPhone: recipient?.phone ?? '',
    recipientCompany: recipient?.company ?? null,
  };
}
```

---

## 5. JSONB フィールド処理 / JSONB字段处理

### 5.1 JSONB に移行するフィールド / 迁移到JSONB的字段

以下のフィールドは動的構造のため JSONB にそのまま移行する：
以下字段因动态结构直接迁移到JSONB：

| MongoDB フィールド | PostgreSQL カラム | 理由 / 理由 |
|---|---|---|
| `carrierData` (Mixed) | `carrier_data` (JSONB) | キャリアごとに構造が異なる / 每个承运商结构不同 |
| `customFields` (Mixed) | `custom_fields` (JSONB) | テナントごとに定義が異なる / 每个租户定义不同 |
| `marketplaceCodes` (Mixed) | `marketplace_codes` (JSONB) | EC モールごとに構造が異なる / 每个电商平台结构不同 |
| `wholesalePartnerCodes` (Mixed) | `wholesale_partner_codes` (JSONB) | 卸先ごとに構造が異なる / 每个批发商结构不同 |
| `carrierAutomationConfigs.config` | `config` (JSONB) | キャリア種別ごとに設定が異なる / 每种承运商设置不同 |
| `printTemplates.elements` | `elements` (JSONB) | テンプレートエディタの自由形式 / 模板编辑器自由格式 |
| `plugins.settings` | `settings` (JSONB) | プラグインごとに設定が異なる / 每个插件设置不同 |
| `tenants.settings` | `settings` (JSONB) | テナント固有設定 / 租户特有设置 |

### 5.2 JSONB 変換ロジック / JSONB转换逻辑

```typescript
// Mixed 型はそのまま JSONB に変換 / Mixed类型直接转换为JSONB
function toJsonb(value: any): any {
  if (value === undefined || value === null) return {};
  if (typeof value === 'object') {
    // ObjectId 参照を含む場合は UUID に変換
    // 如果包含ObjectId引用则转换为UUID
    return deepTransformObjectIds(value);
  }
  return value;
}

// JSONB 内の ObjectId 参照を再帰的に UUID に変換
// 递归转换JSONB内的ObjectId引用为UUID
function deepTransformObjectIds(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string' && /^[0-9a-fA-F]{24}$/.test(obj)) {
    // ObjectId っぽい文字列 → UUID に変換（コレクション不明のため汎用変換）
    // 看起来像ObjectId的字符串 → 转换为UUID（集合未知所以通用转换）
    return objectIdToUuid('_unknown', obj);
  }
  if (Array.isArray(obj)) return obj.map(deepTransformObjectIds);
  if (typeof obj === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = deepTransformObjectIds(value);
    }
    return result;
  }
  return obj;
}
```

---

## 6. データ検証戦略 / 数据验证策略

### 6.1 検証項目 / 验证项目

```typescript
// scripts/migrate/verify.ts

interface VerificationResult {
  table: string;
  mongoCount: number;
  pgCount: number;
  match: boolean;
  details?: string;
}

async function verify(): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];

  // 1. 行数比較 / 行数比较
  // 各コレクション/テーブルのレコード数を比較
  // 比较每个集合/表的记录数

  // 2. 在庫合計整合性 / 库存总数一致性
  // MongoDB: db.stock_quants.aggregate([{ $group: { _id: null, total: { $sum: "$quantity" } } }])
  // PostgreSQL: SELECT SUM(quantity) FROM stock_quants

  // 3. 外部キー参照整合性 / 外键引用一致性
  // 全テーブルの FK が有効な参照先を持つか検証
  // 验证所有表的FK是否有有效的引用目标

  // 4. NULL/空文字の扱い / NULL/空字符串处理
  // MongoDB の '' と null の違いを確認
  // 确认MongoDB的''和null的区别

  // 5. 日時の精度 / 日期时间精度
  // MongoDB ISODate と PostgreSQL timestamptz の一致を確認
  // 确认MongoDB ISODate和PostgreSQL timestamptz的一致性

  return results;
}
```

### 6.2 検証チェックリスト / 验证检查清单

| 検証項目 / 验证项目 | 方法 / 方法 | 合格基準 / 合格标准 |
|---|---|---|
| テーブルごとの行数 / 每表行数 | COUNT(*) 比較 / 比较 | MongoDB count = PostgreSQL count |
| 商品 SKU の一意性 / 商品SKU唯一性 | UNIQUE 制約違反チェック / 检查UNIQUE约束 | 重複なし / 无重复 |
| 在庫合計 / 库存总数 | SUM(quantity) 比較 / 比较 | MongoDB sum = PostgreSQL sum |
| 外部キー参照 / 外键引用 | orphaned record チェック / 检查孤立记录 | 0 件 / 0条 |
| 日時フィールド / 日期字段 | サンプル 100 件比較 / 抽样100条比较 | 秒単位で一致 / 秒级一致 |
| JSONB フィールド / JSONB字段 | サンプルの JSON 比較 / 抽样JSON比较 | 構造一致 / 结构一致 |
| 画像 URL / 图片URL | URL 到達性チェック / URL可达性检查 | 404 なし / 无404 |
| 金額フィールド / 金额字段 | SUM 比較 / 比较 | 小数点以下 2 桁で一致 / 小数点后2位一致 |

### 6.3 検証レポート出力 / 验证报告输出

```bash
# 検証実行 / 执行验证
npx tsx scripts/migrate/verify.ts

# 出力例 / 输出示例:
# ┌──────────────────────────┬────────────┬──────────┬─────────┐
# │ Table                    │ Mongo Count│ PG Count │ Match   │
# ├──────────────────────────┼────────────┼──────────┼─────────┤
# │ tenants                  │          1 │        1 │ ✓       │
# │ users                    │         12 │       12 │ ✓       │
# │ products                 │        842 │      842 │ ✓       │
# │ shipment_orders          │      15230 │    15230 │ ✓       │
# │ shipment_order_products  │      38420 │    38420 │ ✓       │
# │ stock_quants             │       3210 │     3210 │ ✓       │
# │ ...                      │        ... │      ... │ ...     │
# ├──────────────────────────┼────────────┼──────────┼─────────┤
# │ Stock Sum Check          │    120450  │  120450  │ ✓       │
# │ FK Integrity Check       │          - │    0 err │ ✓       │
# └──────────────────────────┴────────────┴──────────┴─────────┘
```

---

## 7. Dual-Write（二重書込）期間 / 双写期间

### 7.1 設計 / 设计

データ移行後、即座に Express を停止するのではなく、一定期間は Express (MongoDB) と NestJS (PostgreSQL) の両方にデータを書き込む。

数据迁移后不立即停止Express，而是在一段时间内同时向Express（MongoDB）和NestJS（PostgreSQL）写入数据。

```
Phase A: MongoDB のみ（現状）/ 仅MongoDB（现状）
  Frontend → Express → MongoDB

Phase B: Dual-Write（移行後 1 週間）/ 双写（迁移后1周）
  Frontend → NestJS → PostgreSQL (primary)
                    → MongoDB (shadow write via event)

Phase C: PostgreSQL のみ（完全切替）/ 仅PostgreSQL（完全切换）
  Frontend → NestJS → PostgreSQL
  Express → 停止 / 停止
```

### 7.2 Dual-Write 実装 / 双写实现

```typescript
// dual-write.interceptor.ts
// 移行期間中のみ有効 / 仅在迁移期间有效

@Injectable()
export class DualWriteInterceptor implements NestInterceptor {
  constructor(
    private readonly dualWriteService: DualWriteService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(
      tap(async (data) => {
        if (process.env.DUAL_WRITE_ENABLED !== 'true') return;

        const request = context.switchToHttp().getRequest();
        const method = request.method;

        // 書き込み操作のみ MongoDB にも反映
        // 仅将写操作同步到MongoDB
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
          await this.dualWriteService.syncToMongo(request, data).catch(err => {
            // Dual-write エラーはログのみ、本体処理は止めない
            // 双写错误仅记录日志，不阻止主处理
            console.error('Dual-write error:', err.message);
          });
        }
      }),
    );
  }
}
```

### 7.3 Dual-Write 比較 / 双写比较

```bash
# 定期的に MongoDB と PostgreSQL のデータを比較
# 定期比较MongoDB和PostgreSQL的数据
npx tsx scripts/migrate/compare-dual-write.ts

# 不一致があればアラート / 有不一致则告警
# → Slack 通知 or ログ出力 / Slack通知或日志输出
```

---

## 8. ロールバック計画 / 回滚计划

### 8.1 移行前ロールバック / 迁移前回滚

移行開始前は何もする必要がない。MongoDB は変更しない。
迁移开始前无需操作。MongoDB不做任何变更。

### 8.2 移行中ロールバック / 迁移中回滚

```bash
# ETL スクリプトが途中で失敗した場合:
# ETL脚本中途失败时：

# 1. PostgreSQL の移行データを全削除
# 清空PostgreSQL的迁移数据
npx tsx scripts/migrate/cleanup.ts

# 2. マッピングテーブルも削除
# 删除映射表
psql $DATABASE_URL -c "DROP TABLE IF EXISTS _migration_id_map;"

# 3. 問題を修正して再実行
# 修复问题后重新执行
npx tsx scripts/migrate/run-all.ts
```

### 8.3 移行後ロールバック / 迁移后回滚

```bash
# フロントエンドを Express に戻す
# 将前端切回Express

# 1. フロントエンド API URL 変更
# 变更前端API URL
# frontend/.env: VITE_API_URL=http://localhost:4000/api

# 2. フロントエンド再ビルド・デプロイ
# 前端重新构建部署
cd frontend && pnpm build && pnpm deploy

# 3. NestJS は停止（ただしデータは残す）
# 停止NestJS（但保留数据）
docker compose stop zelixwms-backend-nest

# MongoDB は変更していないため即座にロールバック可能
# MongoDB未被修改，可立即回滚
```

### 8.4 PostgreSQL データ全削除（最終手段）/ 清空PostgreSQL数据（最后手段）

```bash
docker exec zelixwms-db psql -U postgres -d zelixwms -c "
  -- 全テーブルの TRUNCATE（FK 依存順）/ 清空所有表（按FK依赖顺序）
  TRUNCATE
    shipment_order_products, shipment_order_materials, shipment_orders,
    inbound_order_lines, inbound_service_options, inbound_orders,
    return_order_lines, return_orders,
    stock_moves, stock_quants, inventory_ledger, lots, serial_numbers,
    billing_records, invoices, work_charges, service_rates, shipping_rates,
    product_sub_skus, products,
    locations, warehouses,
    carrier_automation_configs, carriers,
    sub_clients, shops, customers, suppliers, order_source_companies, clients,
    operation_logs, api_logs, event_logs, notifications,
    plugins, webhooks, webhook_logs, automation_scripts,
    auto_processing_rules, rule_definitions,
    print_templates, email_templates, form_templates,
    stocktaking_orders, cycle_count_plans,
    waves, pick_tasks, warehouse_tasks,
    fba_shipment_plans, fba_boxes, rsl_shipment_plans,
    mapping_configs, wms_schedules,
    daily_reports, exception_reports, order_groups,
    users, tenants
  CASCADE;
"
```

---

## 9. ETL スクリプト構造 / ETL脚本结构

### 9.1 共通ユーティリティ / 通用工具

```typescript
// scripts/migrate/utils.ts

import { v5 as uuidv5, v4 as uuidv4 } from 'uuid';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { MongoClient } from 'mongodb';

const ZELIXWMS_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

export function objectIdToUuid(collection: string, oid: string): string {
  return uuidv5(`${collection}:${oid}`, ZELIXWMS_NAMESPACE);
}

export async function connectMongo(): Promise<MongoClient> {
  const client = new MongoClient(process.env.MONGO_URL ?? 'mongodb://localhost:27017');
  await client.connect();
  return client;
}

export function connectPg() {
  const client = postgres(process.env.DATABASE_URL!);
  return drizzle(client);
}

// バッチ INSERT ヘルパー / 批量INSERT辅助
export async function batchInsert<T>(
  db: DrizzleDB,
  table: any,
  rows: T[],
  batchSize: number = 500,
): Promise<number> {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    await db.insert(table).values(batch);
    inserted += batch.length;
    // 進捗表示 / 显示进度
    process.stdout.write(`\r  Inserted ${inserted}/${rows.length}`);
  }
  process.stdout.write('\n');
  return inserted;
}

// ID マッピング記録 / 记录ID映射
export async function recordMapping(
  db: DrizzleDB,
  collection: string,
  mongoId: string,
  pgUuid: string,
): Promise<void> {
  await db.execute(sql`
    INSERT INTO _migration_id_map (collection, mongo_id, pg_uuid)
    VALUES (${collection}, ${mongoId}, ${pgUuid})
    ON CONFLICT DO NOTHING
  `);
}
```

### 9.2 移行スクリプト例 / 迁移脚本示例

```typescript
// scripts/migrate/03-products.ts

import { connectMongo, connectPg, objectIdToUuid, batchInsert, recordMapping } from './utils';
import { products, productSubSkus } from '../../src/database/schema';

async function migrateProducts() {
  const mongo = await connectMongo();
  const db = connectPg();
  const mongoDb = mongo.db('nexand-shipment');

  console.log('=== Products 移行開始 / 开始迁移 Products ===');

  // 1. MongoDB から全商品取得 / 从MongoDB获取全部商品
  const mongoProducts = await mongoDb.collection('products').find({}).toArray();
  console.log(`  MongoDB products: ${mongoProducts.length}`);

  // 2. 変換 + INSERT / 转换 + INSERT
  const pgProducts = mongoProducts.map(mp => {
    const pgId = objectIdToUuid('products', mp._id.toString());
    return {
      id: pgId,
      tenantId: resolveRef('tenants', mp.tenantId),
      clientId: mp.clientId ? objectIdToUuid('clients', mp.clientId) : null,
      sku: mp.sku,
      name: mp.name,
      nameFull: mp.nameFull ?? null,
      nameEn: mp.nameEn ?? null,
      barcode: mp.barcode ?? [],
      janCode: mp.janCode ?? null,
      imageUrl: mp.imageUrl ?? null,
      category: mp.category ?? '0',
      price: mp.price?.toString() ?? null,
      costPrice: mp.costPrice?.toString() ?? null,
      // ... 全フィールドのマッピング / 全字段映射
      customFields: mp.customFields ?? {},
      marketplaceCodes: mp.marketplaceCodes ?? {},
      createdAt: mp.createdAt ?? new Date(),
      updatedAt: mp.updatedAt ?? new Date(),
      deletedAt: mp.deletedAt ?? null,
    };
  });

  await batchInsert(db, products, pgProducts);

  // 3. ID マッピング記録 / 记录ID映射
  for (const mp of mongoProducts) {
    await recordMapping(db, 'products', mp._id.toString(), objectIdToUuid('products', mp._id.toString()));
  }

  // 4. SubSKU 分解 / SubSKU拆分
  console.log('  SubSKU 移行 / SubSKU迁移...');
  const subSkuRows = [];
  for (const mp of mongoProducts) {
    if (mp.subSkus && mp.subSkus.length > 0) {
      for (const [index, sub] of mp.subSkus.entries()) {
        subSkuRows.push({
          id: uuidv4(),
          tenantId: resolveRef('tenants', mp.tenantId),
          productId: objectIdToUuid('products', mp._id.toString()),
          sku: sub.sku,
          name: sub.name ?? '',
          sortOrder: index,
          createdAt: mp.createdAt ?? new Date(),
          updatedAt: mp.updatedAt ?? new Date(),
        });
      }
    }
  }
  if (subSkuRows.length > 0) {
    await batchInsert(db, productSubSkus, subSkuRows);
  }

  console.log(`  PostgreSQL products: ${pgProducts.length}, sub_skus: ${subSkuRows.length}`);
  console.log('=== Products 移行完了 / Products迁移完成 ===\n');

  await mongo.close();
}

migrateProducts().catch(console.error);
```

### 9.3 全ステップ実行 / 执行全部步骤

```typescript
// scripts/migrate/run-all.ts

import { execSync } from 'child_process';

const steps = [
  '00-setup.ts',
  '01-tenants-users.ts',
  '02-master-data.ts',
  '03-products.ts',
  '04-inventory.ts',
  '05-inbound-orders.ts',
  '06-shipment-orders.ts',
  '07-returns.ts',
  '08-billing.ts',
  '09-logs-notifications.ts',
  '10-extensions.ts',
  '11-warehouse-ops.ts',
  '12-integrations.ts',
  '13-templates.ts',
];

async function runAll() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║  ZELIXWMS データ移行 / 数据迁移      ║');
  console.log('║  MongoDB → PostgreSQL                ║');
  console.log('╚══════════════════════════════════════╝\n');

  const startTime = Date.now();

  for (const step of steps) {
    console.log(`▶ ${step}`);
    const stepStart = Date.now();
    execSync(`npx tsx scripts/migrate/${step}`, { stdio: 'inherit' });
    const elapsed = ((Date.now() - stepStart) / 1000).toFixed(1);
    console.log(`  ✓ ${elapsed}s\n`);
  }

  // 検証実行 / 执行验证
  console.log('▶ verify.ts');
  execSync('npx tsx scripts/migrate/verify.ts', { stdio: 'inherit' });

  const totalElapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log(`\n全移行完了 / 全部迁移完成: ${totalElapsed} 分 / 分钟`);
}

runAll().catch(console.error);
```

---

## 10. コレクション → テーブル マッピング一覧 / 集合 → 表映射一览

| MongoDB Collection | PostgreSQL Table(s) | 変換方法 / 转换方法 |
|---|---|---|
| `tenants` | `tenants` | 1:1, tenantCode → slug |
| `users` | `users` | 1:1, Supabase Auth user 作成 |
| `warehouses` | `warehouses` | 1:1, code UNIQUE 化 |
| `locations` | `locations` | 1:1, type → PG enum |
| `products` | `products` + `product_sub_skus` | 1:N 分解 (subSkus → 別テーブル) |
| `shipmentorders` | `shipment_orders` + `shipment_order_products` + `shipment_order_materials` | 1:N 分解 + nested → flat |
| `inboundorders` | `inbound_orders` + `inbound_order_lines` + `inbound_service_options` | 1:N 分解 |
| `returnorders` | `return_orders` + `return_order_lines` | 1:N 分解 |
| `stock_quants` | `stock_quants` | 1:1 |
| `stock_moves` | `stock_moves` | 1:1 |
| `lots` | `lots` | 1:1 |
| `serial_numbers` | `serial_numbers` | 1:1 |
| `inventory_ledger` | `inventory_ledger` | 1:1 |
| `billing_records` | `billing_records` | 1:1 |
| `invoices` | `invoices` | 1:1 |
| `carriers` | `carriers` | 1:1 |
| `carrier_automation_configs` | `carrier_automation_configs` | 1:1, config → JSONB |
| `clients` | `clients` | 1:1 |
| `sub_clients` | `sub_clients` | 1:1 |
| `shops` | `shops` | 1:1 |
| `customers` | `customers` | 1:1 |
| `suppliers` | `suppliers` | 1:1 |
| `operation_logs` | `operation_logs` | 1:1, TTL → pg_cron 対応 |
| `api_logs` | `api_logs` | 1:1, TTL → pg_cron 対応 |
| `notifications` | `notifications` | 1:1 |
| `print_templates` | `print_templates` | 1:1, elements → JSONB |
| `email_templates` | `email_templates` | 1:1 |
| `plugins` | `plugins` | 1:1, settings → JSONB |
| `webhooks` | `webhooks` | 1:1 |
| `automation_scripts` | `automation_scripts` | 1:1 |
| `stocktaking_orders` | `stocktaking_orders` | 1:1 |
| `cycle_count_plans` | `cycle_count_plans` | 1:1 |
| `daily_reports` | `daily_reports` | 1:1 |
| `fba_shipment_plans` | `fba_shipment_plans` | 1:1 |
| `rsl_shipment_plans` | `rsl_shipment_plans` | 1:1 |

---

## 11. 特殊変換詳細 / 特殊转换详情

### 11.1 ShipmentOrder の完全変換例 / ShipmentOrder完整转换示例

```
MongoDB shipmentorders ドキュメント → PostgreSQL 3 テーブル:
MongoDB shipmentorders 文档 → PostgreSQL 3张表：

shipmentorders (1 ドキュメント / 1个文档)
├── ._id                    → shipment_orders.id (UUID v5)
├── .tenantId               → shipment_orders.tenant_id (UUID)
├── .orderNumber            → shipment_orders.order_number
├── .status.confirm         → shipment_orders.is_confirmed, confirmed_at
├── .status.shipped         → shipment_orders.is_shipped, shipped_at
├── .recipient.postalCode   → shipment_orders.recipient_postal_code
├── .recipient.name         → shipment_orders.recipient_name
├── .carrierData            → shipment_orders.carrier_data (JSONB)
├── .products[]             → shipment_order_products (N行 / N行)
│   ├── [0].productId       → shipment_order_products.product_id (UUID v5)
│   ├── [0].sku             → shipment_order_products.sku
│   └── [0].quantity        → shipment_order_products.quantity
└── .materials[]            → shipment_order_materials (N行 / N行)
    ├── [0].materialId      → shipment_order_materials.material_id (UUID v5)
    └── [0].quantity        → shipment_order_materials.quantity
```

### 11.2 Users の Supabase Auth 連携 / Users的Supabase Auth关联

```typescript
// users 移行時に Supabase Auth にもユーザーを作成
// 迁移users时同时在Supabase Auth创建用户

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

async function migrateUser(mongoUser: any) {
  // 1. Supabase Auth にユーザー作成 / 在Supabase Auth创建用户
  const { data: authUser, error } = await supabase.auth.admin.createUser({
    email: mongoUser.email,
    password: generateTempPassword(), // 初回ログイン時にリセット / 首次登录时重置
    email_confirm: true,
    user_metadata: {
      display_name: mongoUser.displayName,
      role: mongoUser.role,
    },
  });

  if (error) throw error;

  // 2. users テーブルに INSERT / 插入users表
  return {
    id: objectIdToUuid('users', mongoUser._id.toString()),
    tenantId: resolveRef('tenants', mongoUser.tenantId),
    authUid: authUser.user.id, // Supabase Auth UID
    email: mongoUser.email,
    displayName: mongoUser.displayName,
    role: mongoUser.role,
    // ...
  };
}
```

---

## 12. 移行後チェックリスト / 迁移后检查清单

### データ整合性 / 数据一致性
- [ ] 全テーブルのレコード数が MongoDB と一致 / 全表行数与MongoDB一致
- [ ] 在庫合計 (stock_quants.quantity) が一致 / 库存总数一致
- [ ] 請求金額合計が一致 / 账单金额总数一致
- [ ] 外部キー参照に孤立レコードなし / 无孤立记录

### 機能確認 / 功能确认
- [ ] 商品検索が正常に動作 / 商品搜索正常
- [ ] 入庫フロー（作成→確定→検品→棚入れ→完了）が動作 / 入库全流程正常
- [ ] 出荷フロー（作成→確認→B2 Cloud→伝票→出荷完了）が動作 / 出库全流程正常
- [ ] 請求データが正しく表示される / 账单数据正确显示
- [ ] 操作ログが検索可能 / 操作日志可搜索
- [ ] フロントエンドの全 109 画面が表示される / 全部109画面正常显示

### パフォーマンス / 性能
- [ ] 商品一覧 API < 500ms / 商品列表API <500ms
- [ ] 出荷一覧 API < 500ms (50+ フィルター使用時) / 出库列表API <500ms
- [ ] 在庫照会 API < 300ms / 库存查询API <300ms

### クリーンアップ / 清理
- [ ] `_migration_id_map` テーブル削除 / 删除映射表
- [ ] 移行スクリプトをアーカイブ / 归档迁移脚本
- [ ] Dual-Write 無効化 / 禁用双写
- [ ] Express バックエンド停止（1 週間後）/ 停止Express（1周后）
