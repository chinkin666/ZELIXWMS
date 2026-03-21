# 11 - データ移行 ETL アーキテクチャ設計書
# 11 - 数据迁移 ETL 架构设计文档

> MongoDB 78 コレクション → PostgreSQL 65+ テーブル 完全 ETL 設計
> MongoDB 78 集合 → PostgreSQL 65+ 表 完整 ETL 设计
>
> 関連ドキュメント / 关联文档:
> - [07-data-migration.md](../migration/07-data-migration.md) — 移行手順書 / 迁移手册
> - [02-database-design.md](../migration/02-database-design.md) — DB設計書 / DB设计文档
> - [03-backend-architecture.md](./03-backend-modules.md) — バックエンドモジュール / 后端模块
>
> 最終更新 / 最后更新: 2026-03-21

---

## 目次 / 目录

1. [移行アーキテクチャ概要 / 迁移架构概述](#1-移行アーキテクチャ概要--迁移架构概述)
2. [ID 変換戦略 / ID转换策略](#2-id-変換戦略--id转换策略)
3. [テーブル別移行マッピング / 表级迁移映射](#3-テーブル別移行マッピング--表级迁移映射)
4. [フィールド変換ルール / 字段转换规则](#4-フィールド変換ルール--字段转换规则)
5. [ETL スクリプト設計（8 フェーズ）/ ETL脚本设计（8阶段）](#5-etl-スクリプト設計8-フェーズ-etl脚本设计8阶段)
6. [データ検証マトリクス / 数据验证矩阵](#6-データ検証マトリクス--数据验证矩阵)
7. [ロールバック計画 / 回滚计划](#7-ロールバック計画--回滚计划)
8. [ゼロダウンタイム移行戦略 / 零停机迁移策略](#8-ゼロダウンタイム移行戦略--零停机迁移策略)

---

## 1. 移行アーキテクチャ概要 / 迁移架构概述

### 1.1 全体アーキテクチャ / 整体架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ZELIXWMS ETL Pipeline                           │
│                                                                     │
│  ┌───────────┐   ┌──────────┐   ┌──────────────┐   ┌───────────┐  │
│  │ MongoDB   │──▶│ Extract  │──▶│  Transform   │──▶│   Load    │  │
│  │ 78 colls  │   │ (BSON→   │   │ (ObjectId→   │   │ (Batch    │  │
│  │ ~60K docs │   │  JSON)   │   │  UUID v5,    │   │  INSERT   │  │
│  └───────────┘   └──────────┘   │  Normalize,  │   │  w/Drizzle│  │
│                                  │  Type Cast)  │   └─────┬─────┘  │
│                                  └──────────────┘         │        │
│                                                           ▼        │
│                                               ┌───────────────┐    │
│                                               │  PostgreSQL   │    │
│                                               │  65+ tables   │    │
│                                               │  + RLS + FK   │    │
│                                               └───────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 設計原則 / 设计原则

| 原則 / 原则 | 説明 / 说明 |
|---|---|
| **冪等性 / 幂等性** | ETL は何度実行しても同じ結果を生成する。UUID v5 の決定論的生成により保証。每次执行ETL都产生相同结果，由UUID v5确定性生成保证。 |
| **依存順序 / 依赖顺序** | FK 依存を尊重し Layer 0 → 6 の順にロード。遵循FK依赖按Layer 0→6顺序加载。 |
| **バッチ処理 / 批处理** | 1000 レコード単位のバッチ INSERT でメモリ・パフォーマンスを最適化。按1000条记录批量INSERT优化内存和性能。 |
| **検証可能 / 可验证** | 各フェーズ終了時にカウント・チェックサム・サンプル検証を実施。每阶段结束时执行计数、校验和、抽样验证。 |
| **ロールバック可能 / 可回滚** | 任意のフェーズで失敗しても完全ロールバック可能。在任意阶段失败都可完全回滚。 |
| **ゼロダウンタイム / 零停机** | Dual-Write 期間を経て段階的に切替。通过双写期间逐步切换。 |

### 1.3 技術スタック / 技术栈

```typescript
// ETL パイプライン依存関係 / ETL管道依赖
const dependencies = {
  runtime: 'Node.js 20+ / tsx',
  orm: 'Drizzle ORM',
  mongoDriver: 'mongodb (native driver)',
  uuid: 'uuid (v5)',
  validation: 'zod',
  logging: 'pino',
  cli: 'commander',
  progress: 'cli-progress',
};
```

### 1.4 データ量推定 / 数据量估算

| カテゴリ / 类别 | MongoDB コレクション数 / 集合数 | 推定レコード数 / 预估记录数 | PostgreSQL テーブル数 / 表数 |
|---|---|---|---|
| コアマスタ / 核心主数据 | 8 | ~2,000 | 12 |
| ビジネストランザクション / 业务事务 | 18 | ~50,000 | 25 |
| 拡張・プラグイン / 扩展插件 | 15 | ~500 | 15 |
| ログ・監査 / 日志审计 | 8 | ~100,000 | 8 (partitioned) |
| テンプレート・設定 / 模板配置 | 10 | ~200 | 8 |
| **合計 / 合计** | **78** | **~152,700** | **65+** |

---

## 2. ID 変換戦略 / ID转换策略

### 2.1 UUID v5 決定論的変換 / UUID v5 确定性转换

MongoDB の 24 文字 hex ObjectId を UUID v5 に変換する。同じ入力から常に同じ UUID を生成する。
将MongoDB的24字符hex ObjectId转换为UUID v5。相同输入始终生成相同UUID。

```typescript
import { v5 as uuidv5, v4 as uuidv4 } from 'uuid';

// ZELIXWMS 専用名前空間 UUID（DNS namespace ベース）
// ZELIXWMS专用命名空间UUID（基于DNS namespace）
const ZELIXWMS_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

/**
 * MongoDB ObjectId → UUID v5 決定論的変換
 * MongoDB ObjectId → UUID v5 确定性转换
 *
 * コレクション名を seed に含めることで異なるコレクション間の衝突を防止。
 * 在seed中包含集合名以防止不同集合间的冲突。
 *
 * @param collection - コレクション名 / 集合名
 * @param objectId - 24文字 hex 文字列 / 24字符hex字符串
 * @returns UUID v5 文字列 / UUID v5字符串
 */
export function objectIdToUuid(collection: string, objectId: string): string {
  if (!objectId || typeof objectId !== 'string') {
    throw new Error(`Invalid ObjectId: ${objectId}`);
  }
  // ObjectId の正規化（$oid 形式対応）/ ObjectId归一化（支持$oid格式）
  const normalized = objectId.replace(/[^0-9a-fA-F]/g, '');
  if (normalized.length !== 24) {
    throw new Error(`ObjectId must be 24 hex chars, got ${normalized.length}: ${objectId}`);
  }
  const seed = `${collection}:${normalized}`;
  return uuidv5(seed, ZELIXWMS_NAMESPACE);
}
```

### 2.2 特殊 ID マッピング / 特殊ID映射

```typescript
// テナント ID の固定マッピング / 租户ID固定映射
const TENANT_MAPPING: Record<string, string> = {
  'default': '00000000-0000-0000-0000-000000000001',
};

// 文字列参照の解決 / 字符串引用解析
export function resolveRef(collection: string, ref: string | null | undefined): string | null {
  if (!ref) return null;
  if (TENANT_MAPPING[ref]) return TENANT_MAPPING[ref];
  // ObjectId 形式かチェック / 检查是否为ObjectId格式
  if (/^[0-9a-fA-F]{24}$/.test(ref)) {
    return objectIdToUuid(collection, ref);
  }
  return null;
}

// 配列参照の一括解決 / 数组引用批量解析
export function resolveRefs(collection: string, refs: string[] | null | undefined): string[] {
  if (!refs || !Array.isArray(refs)) return [];
  return refs
    .map((ref) => resolveRef(collection, ref))
    .filter((id): id is string => id !== null);
}
```

### 2.3 ID マッピングテーブル / ID映射表

ETL 実行中に全ての ID 変換を記録し、後続フェーズ・検証で参照する。
ETL执行中记录所有ID转换，供后续阶段和验证参考。

```sql
-- 移行用一時テーブル / 迁移用临时表
CREATE TABLE IF NOT EXISTS _migration_id_map (
  collection VARCHAR(100) NOT NULL,
  mongo_id   VARCHAR(24)  NOT NULL,
  pg_uuid    UUID         NOT NULL,
  created_at TIMESTAMPTZ  DEFAULT NOW(),
  PRIMARY KEY (collection, mongo_id)
);

CREATE INDEX idx_migration_id_map_uuid ON _migration_id_map (pg_uuid);
CREATE INDEX idx_migration_id_map_collection ON _migration_id_map (collection);

-- 移行メタデータテーブル / 迁移元数据表
CREATE TABLE IF NOT EXISTS _migration_meta (
  phase       VARCHAR(50) PRIMARY KEY,
  status      VARCHAR(20) NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at  TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  record_count INT DEFAULT 0,
  error_message TEXT,
  checksum    VARCHAR(64)
);
```

### 2.4 ID 変換フロー / ID转换流程

```
MongoDB Document:
{
  "_id": ObjectId("69b6205e7ddcb7290ca9fd74"),
  "clientId": ObjectId("69b6205e7ddcb7290ca9fd75"),
  "warehouseId": ObjectId("69b6205e7ddcb7290ca9fd76")
}
          │
          ▼
objectIdToUuid('products',  '69b6205e7ddcb7290ca9fd74') → PK UUID
objectIdToUuid('clients',   '69b6205e7ddcb7290ca9fd75') → FK UUID → clients.id
objectIdToUuid('warehouses','69b6205e7ddcb7290ca9fd76') → FK UUID → warehouses.id
          │
          ▼
PostgreSQL Row:
{
  "id": "a3f4b5c6-...",            -- PK
  "client_id": "b4c5d6e7-...",     -- FK → clients(id)
  "warehouse_id": "c5d6e7f8-..."   -- FK → warehouses(id)
}
```

---

## 3. テーブル別移行マッピング / 表级迁移映射

### 3.1 完全マッピング表 / 完整映射表

78 の MongoDB コレクションから 65+ の PostgreSQL テーブルへの完全マッピング。
从78个MongoDB集合到65+个PostgreSQL表的完整映射。

#### Layer 0: 依存なし / 无依赖

| # | MongoDB コレクション | PostgreSQL テーブル | 変換パターン / 转换模式 | 推定行数 |
|---|---|---|---|---|
| 1 | `tenants` | `tenants` | 1:1 直接マッピング / 直接映射 | ~5 |

#### Layer 1: tenants に依存 / 依赖 tenants

| # | MongoDB コレクション | PostgreSQL テーブル | 変換パターン / 转换模式 | 推定行数 |
|---|---|---|---|---|
| 2 | `users` | `users` | 1:1 + password_hash 形式変換 / 格式转换 | ~50 |
| 3 | `warehouses` | `warehouses` | 1:1 直接マッピング | ~10 |
| 4 | `carriers` | `carriers` | 1:1 直接マッピング | ~20 |
| 5 | `clients` | `clients` | 1:1 直接マッピング | ~100 |

#### Layer 2: Layer 1 に依存 / 依赖 Layer 1

| # | MongoDB コレクション | PostgreSQL テーブル | 変換パターン / 转换模式 | 推定行数 |
|---|---|---|---|---|
| 6 | `locations` | `locations` | 1:1 + warehouseId FK 変換 | ~200 |
| 7 | `sub_clients` / `subclients` | `sub_clients` | 1:1 + clientId FK 変換 | ~50 |
| 8 | `shops` | `shops` | 1:1 + clientId FK 変換 | ~30 |
| 9 | `customers` | `customers` | 1:1 + clientId FK 変換 | ~500 |
| 10 | `suppliers` | `suppliers` | 1:1 + clientId FK 変換 | ~30 |
| 11 | `products` | `products` | 1:1 + clientId FK 変換、barcode → TEXT[] | ~2,000 |
| 12 | `systemsettings` | `system_settings` | 1:1 + value → JSONB | ~20 |

#### Layer 3: Layer 2 に依存 / 依赖 Layer 2

| # | MongoDB コレクション | PostgreSQL テーブル | 変換パターン / 转换模式 | 推定行数 |
|---|---|---|---|---|
| 13 | `products.subSkus[]` (embedded) | `product_sub_skus` | 1:N 分解 / 拆分 | ~5,000 |
| 14 | `lots` | `lots` | 1:1 + productId FK | ~1,000 |
| 15 | `serialnumbers` | `serial_numbers` | 1:1 + productId, lotId FK | ~3,000 |
| 16 | `stockquants` | `stock_quants` | 1:1 + productId, locationId FK | ~5,000 |
| 17 | `carrierautomationconfigs` | `carrier_automation_configs` | 1:1 + config → JSONB | ~20 |
| 18 | `printtemplates` | `print_templates` | 1:1 + elements → JSONB | ~50 |
| 19 | `emailtemplates` | `email_templates` | 1:1 + body → TEXT | ~30 |
| 20 | `formtemplates` | `form_templates` | 1:1 + fields → JSONB | ~20 |

#### Layer 4: Layer 3 に依存 / 依赖 Layer 3

| # | MongoDB コレクション | PostgreSQL テーブル | 変換パターン / 转换模式 | 推定行数 |
|---|---|---|---|---|
| 21 | `inboundorders` | `inbound_orders` | 1:1 + status nested → flat | ~2,000 |
| 22 | `inboundorders.lines[]` | `inbound_order_lines` | 1:N 分解 | ~6,000 |
| 23 | `inboundorders.serviceOptions[]` | `inbound_service_options` | 1:N 分解 | ~1,000 |
| 24 | `shipmentorders` | `shipment_orders` | 1:1 + status/recipient nested → flat | ~15,000 |
| 25 | `shipmentorders.products[]` | `shipment_order_products` | 1:N 分解 | ~38,000 |
| 26 | `shipmentorders.materials[]` | `shipment_order_materials` | 1:N 分解 | ~5,000 |
| 27 | `returnorders` | `return_orders` | 1:1 + shipmentOrderId FK | ~500 |
| 28 | `returnorders.lines[]` | `return_order_lines` | 1:N 分解 | ~1,500 |

#### Layer 5: Layer 4 に依存 / 依赖 Layer 4

| # | MongoDB コレクション | PostgreSQL テーブル | 変換パターン / 转换模式 | 推定行数 |
|---|---|---|---|---|
| 29 | `stockmoves` | `stock_moves` | 1:1 + quantId, productId FK | ~20,000 |
| 30 | `inventoryledger` | `inventory_ledger` | 1:1 + productId, locationId FK | ~15,000 |
| 31 | `billingrecords` | `billing_records` | 1:1 + clientId, shipmentOrderId FK | ~3,000 |
| 32 | `invoices` | `invoices` | 1:1 + clientId FK | ~500 |
| 33 | `workcharges` | `work_charges` | 1:1 + clientId FK | ~200 |
| 34 | `rates` / `ratesettings` | `rate_settings` | 1:1 | ~100 |
| 35 | `operationlogs` | `operation_logs` (partitioned) | 1:1 + userId FK | ~50,000 |
| 36 | `apilogs` | `api_logs` (partitioned) | 1:1 + userId FK | ~30,000 |
| 37 | `notifications` | `notifications` | 1:1 + userId FK | ~5,000 |

#### Layer 6: 独立テーブル / 独立表

| # | MongoDB コレクション | PostgreSQL テーブル | 変換パターン / 转换模式 | 推定行数 |
|---|---|---|---|---|
| 38 | `plugins` | `plugins` | 1:1 + settings → JSONB | ~10 |
| 39 | `webhooks` | `webhooks` | 1:1 | ~20 |
| 40 | `automationscripts` | `automation_scripts` | 1:1 + script → TEXT | ~15 |
| 41 | `featureflags` | `feature_flags` | 1:1 | ~30 |
| 42 | `autoprocessingrules` | `auto_processing_rules` | 1:1 + conditions → JSONB | ~20 |
| 43 | `ruledefinitions` | `rule_definitions` | 1:1 + config → JSONB | ~15 |
| 44 | `waves` | `waves` | 1:1 | ~100 |
| 45 | `warehousetasks` | `warehouse_tasks` | 1:1 | ~500 |
| 46 | `picktasks` | `pick_tasks` | 1:1 | ~300 |
| 47 | `stocktakingorders` | `stocktaking_orders` | 1:1 | ~50 |
| 48 | `cyclecountplans` | `cycle_count_plans` | 1:1 | ~20 |
| 49 | `fbashipmentplans` | `fba_shipment_plans` | 1:1 + items → JSONB | ~100 |
| 50 | `rslshipmentplans` | `rsl_shipment_plans` | 1:1 | ~50 |
| 51 | `mappingconfigs` | `mapping_configs` | 1:1 + mapping → JSONB | ~30 |
| 52 | `wmsschedules` | `wms_schedules` | 1:1 + cron → VARCHAR | ~20 |
| 53 | `dailyreports` | `daily_reports` | 1:1 + data → JSONB | ~500 |
| 54 | `exceptionreports` | `exception_reports` | 1:1 | ~200 |
| 55 | `ordergroups` | `order_groups` | 1:1 | ~100 |

#### 統合・削除対象 / 合并或删除的集合

| MongoDB コレクション | 処理 / 处理 | 理由 / 理由 |
|---|---|---|
| `sessions` | 移行しない / 不迁移 | Supabase Auth で代替 / 被Supabase Auth替代 |
| `password_resets` | 移行しない | Supabase Auth で代替 |
| `temp_*` (一時コレクション) | 移行しない | 一時データ / 临时数据 |
| `migrations` | 移行しない | MongoDB 固有 / MongoDB特有 |
| `counters` | 移行しない | PostgreSQL SEQUENCE で代替 |

---

## 4. フィールド変換ルール / 字段转换规则

### 4.1 型マッピング / 类型映射

| MongoDB 型 | PostgreSQL 型 | 変換ロジック / 转换逻辑 |
|---|---|---|
| `ObjectId` | `UUID` | `objectIdToUuid(collection, oid)` |
| `String` | `VARCHAR(n)` / `TEXT` | 長さに応じて選択 / 按长度选择 |
| `Number` (整数) | `INT` / `BIGINT` | 値範囲チェック / 值范围检查 |
| `Number` (小数) | `NUMERIC(p,s)` / `DECIMAL` | 金額: `NUMERIC(12,2)` |
| `Boolean` | `BOOLEAN` | 直接変換 / 直接转换 |
| `Date` / `ISODate` | `TIMESTAMPTZ` | UTC 統一 / UTC统一 |
| `[String]` | `TEXT[]` | PostgreSQL 配列型 / 数组类型 |
| `[ObjectId]` | `UUID[]` | 各要素を `objectIdToUuid` で変換 |
| `Mixed` / `Object` | `JSONB` | `toJsonb()` で変換（ObjectId 再帰変換含む） |
| `Buffer` / `Binary` | `BYTEA` | Base64 デコード / 解码 |
| `Embedded Doc[]` | 別テーブル / 子表 | 1:N 分解パターン |
| `Nested Object` | フラットカラム / 扁平列 | `flatten*()` 関数で展開 |

### 4.2 フィールド変換 TypeScript 実装 / 字段转换TypeScript实现

```typescript
import { z } from 'zod';

// === 基本型変換 / 基本类型转换 ===

/** MongoDB Date → PostgreSQL TIMESTAMPTZ */
export function toTimestamp(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value.$date) return new Date(value.$date);
  if (typeof value === 'string') return new Date(value);
  if (typeof value === 'number') return new Date(value);
  return null;
}

/** MongoDB Number → PostgreSQL NUMERIC(12,2) (金額用 / 金额用) */
export function toDecimal(value: any): string | null {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  if (isNaN(num)) return null;
  return num.toFixed(2);
}

/** MongoDB [String] → PostgreSQL TEXT[] */
export function toTextArray(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((v) => typeof v === 'string');
  if (typeof value === 'string') return [value];
  return [];
}

/** MongoDB Boolean (緩い型 / 宽松类型) → PostgreSQL BOOLEAN */
export function toBoolean(value: any): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1' || value === 'true') return true;
  return false;
}

// === 複合変換 / 复合转换 ===

/** Nested Status Object → Flat Columns */
export function flattenStatus(status: any) {
  return {
    isConfirmed: toBoolean(status?.confirm?.isConfirmed),
    confirmedAt: toTimestamp(status?.confirm?.confirmedAt),
    isPrintReady: toBoolean(status?.printReady?.isPrintReady),
    isShipped: toBoolean(status?.shipped?.isShipped),
    shippedAt: toTimestamp(status?.shipped?.shippedAt),
    isDelivered: toBoolean(status?.delivered?.isDelivered),
    deliveredAt: toTimestamp(status?.delivered?.deliveredAt),
    isCancelled: toBoolean(status?.cancelled?.isCancelled),
    cancelledAt: toTimestamp(status?.cancelled?.cancelledAt),
  };
}

/** Nested Recipient Object → Flat Columns */
export function flattenRecipient(recipient: any) {
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

/** JSONB 内の ObjectId 参照を再帰的に UUID に変換 / 递归转换JSONB内的ObjectId为UUID */
export function deepTransformObjectIds(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string' && /^[0-9a-fA-F]{24}$/.test(obj)) {
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

/** Mixed 型 → JSONB（ObjectId 変換含む）/ Mixed类型→JSONB（含ObjectId转换）*/
export function toJsonb(value: any): any {
  if (value === undefined || value === null) return {};
  if (typeof value === 'object') return deepTransformObjectIds(value);
  return value;
}
```

### 4.3 Zod バリデーションスキーマ / Zod验证模式

```typescript
// 変換後のデータを PostgreSQL INSERT 前にバリデーション
// 转换后的数据在PostgreSQL INSERT前进行验证

const PgProductSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  clientId: z.string().uuid(),
  sku: z.string().min(1).max(100),
  name: z.string().min(1).max(500),
  name2: z.string().max(500).nullable(),
  barcode: z.array(z.string()).default([]),
  weight: z.number().nonnegative().nullable(),
  price: z.string().regex(/^\d+\.\d{2}$/).nullable(),
  customFields: z.record(z.unknown()).default({}),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

const PgShipmentOrderSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  clientId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  carrierId: z.string().uuid().nullable(),
  orderNumber: z.string().min(1).max(50),
  // ステータスフラットカラム / 状态扁平列
  isConfirmed: z.boolean(),
  confirmedAt: z.date().nullable(),
  isPrintReady: z.boolean(),
  isShipped: z.boolean(),
  shippedAt: z.date().nullable(),
  isDelivered: z.boolean(),
  deliveredAt: z.date().nullable(),
  isCancelled: z.boolean(),
  cancelledAt: z.date().nullable(),
  // 受取人フラットカラム / 收件人扁平列
  recipientPostalCode: z.string(),
  recipientPrefecture: z.string(),
  recipientCity: z.string(),
  recipientStreet: z.string(),
  recipientName: z.string(),
  recipientPhone: z.string(),
  recipientCompany: z.string().nullable(),
  // JSONB フィールド / JSONB字段
  carrierData: z.record(z.unknown()).default({}),
  customFields: z.record(z.unknown()).default({}),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});
```

---

## 5. ETL スクリプト設計（8 フェーズ）/ ETL脚本设计（8阶段）

### 5.1 フェーズ概要 / 阶段概述

```
Phase 1: Schema Setup       → PostgreSQL スキーマ・一時テーブル作成
Phase 2: ID Mapping Build   → 全 ObjectId → UUID v5 マッピング生成・記録
Phase 3: Extract            → MongoDB からデータ抽出（BSON → JSON）
Phase 4: Transform          → 型変換・正規化・バリデーション
Phase 5: Load               → PostgreSQL バッチ INSERT（FK 無効状態）
Phase 6: FK Enable          → 外部キー制約の有効化・整合性チェック
Phase 7: RLS Enable         → Row-Level Security ポリシー有効化
Phase 8: Verify             → 行数・チェックサム・サンプル・FK 整合性検証
```

```
┌─────────────┐    ┌──────────────┐    ┌─────────┐    ┌───────────┐
│  Phase 1    │───▶│  Phase 2     │───▶│ Phase 3 │───▶│ Phase 4   │
│  Schema     │    │  ID Mapping  │    │ Extract │    │ Transform │
└─────────────┘    └──────────────┘    └─────────┘    └─────┬─────┘
                                                            │
┌─────────────┐    ┌──────────────┐    ┌─────────┐    ┌─────▼─────┐
│  Phase 8    │◀───│  Phase 7     │◀───│ Phase 6 │◀───│ Phase 5   │
│  Verify     │    │  RLS Enable  │    │FK Enable│    │   Load    │
└─────────────┘    └──────────────┘    └─────────┘    └───────────┘
```

### 5.2 Phase 1: Schema Setup / スキーマセットアップ

```typescript
// scripts/migrate/phase1-schema.ts

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { logger } from './utils/logger';

export async function phase1SchemaSetup(): Promise<void> {
  logger.info('Phase 1: Schema Setup 開始 / 开始');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  try {
    // Step 1: Drizzle マイグレーション適用 / 应用Drizzle迁移
    logger.info('Drizzle マイグレーション適用中... / 正在应用Drizzle迁移...');
    await migrate(db, { migrationsFolder: './drizzle' });

    // Step 2: FK 制約を一時的に無効化 / 临时禁用FK约束
    logger.info('FK 制約を無効化中... / 正在禁用FK约束...');
    await pool.query(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (
          SELECT conname, conrelid::regclass AS table_name
          FROM pg_constraint
          WHERE contype = 'f'
        ) LOOP
          EXECUTE 'ALTER TABLE ' || r.table_name || ' DROP CONSTRAINT IF EXISTS ' || r.conname;
        END LOOP;
      END $$;
    `);

    // Step 3: 移行用一時テーブル作成 / 创建迁移临时表
    logger.info('移行用一時テーブル作成中... / 正在创建迁移临时表...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS _migration_id_map (
        collection VARCHAR(100) NOT NULL,
        mongo_id   VARCHAR(24)  NOT NULL,
        pg_uuid    UUID         NOT NULL,
        created_at TIMESTAMPTZ  DEFAULT NOW(),
        PRIMARY KEY (collection, mongo_id)
      );
      CREATE INDEX IF NOT EXISTS idx_migration_id_map_uuid
        ON _migration_id_map (pg_uuid);

      CREATE TABLE IF NOT EXISTS _migration_meta (
        phase        VARCHAR(50) PRIMARY KEY,
        status       VARCHAR(20) NOT NULL DEFAULT 'pending',
        started_at   TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        record_count INT DEFAULT 0,
        error_message TEXT,
        checksum     VARCHAR(64)
      );
    `);

    // Step 4: メタ初期化 / 初始化元数据
    const phases = [
      'schema', 'id_mapping', 'extract', 'transform',
      'load', 'fk_enable', 'rls_enable', 'verify',
    ];
    for (const phase of phases) {
      await pool.query(`
        INSERT INTO _migration_meta (phase) VALUES ($1)
        ON CONFLICT (phase) DO UPDATE SET status = 'pending'
      `, [phase]);
    }

    await updateMeta(pool, 'schema', 'completed');
    logger.info('Phase 1: Schema Setup 完了 / 完成');
  } finally {
    await pool.end();
  }
}

async function updateMeta(
  pool: Pool,
  phase: string,
  status: string,
  count?: number,
  error?: string,
): Promise<void> {
  await pool.query(`
    UPDATE _migration_meta
    SET status = $2,
        ${status === 'running' ? 'started_at = NOW(),' : ''}
        ${status === 'completed' ? 'completed_at = NOW(),' : ''}
        record_count = COALESCE($3, record_count),
        error_message = $4
    WHERE phase = $1
  `, [phase, status, count ?? null, error ?? null]);
}
```

### 5.3 Phase 2: ID Mapping Build / IDマッピング構築

```typescript
// scripts/migrate/phase2-id-mapping.ts

import { MongoClient } from 'mongodb';
import { Pool } from 'pg';
import { objectIdToUuid } from './utils/id-converter';
import { logger } from './utils/logger';

// 移行対象コレクション一覧 / 迁移目标集合列表
const COLLECTIONS_TO_MIGRATE = [
  'tenants', 'users', 'warehouses', 'carriers', 'clients',
  'locations', 'subclients', 'shops', 'customers', 'suppliers',
  'products', 'lots', 'serialnumbers', 'stockquants',
  'inboundorders', 'shipmentorders', 'returnorders',
  'stockmoves', 'inventoryledger', 'billingrecords', 'invoices',
  'workcharges', 'operationlogs', 'apilogs', 'notifications',
  'plugins', 'webhooks', 'automationscripts', 'featureflags',
  'autoprocessingrules', 'ruledefinitions', 'waves',
  'warehousetasks', 'picktasks', 'stocktakingorders',
  'cyclecountplans', 'fbashipmentplans', 'rslshipmentplans',
  'mappingconfigs', 'wmsschedules', 'dailyreports',
  'exceptionreports', 'ordergroups', 'printtemplates',
  'emailtemplates', 'formtemplates', 'carrierautomationconfigs',
  'systemsettings', 'ratesettings',
];

export async function phase2IdMapping(): Promise<void> {
  logger.info('Phase 2: ID Mapping Build 開始 / 开始');

  const mongo = new MongoClient(process.env.MONGO_URI!);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    await mongo.connect();
    const db = mongo.db('nexand-shipment');
    let totalMapped = 0;

    for (const collName of COLLECTIONS_TO_MIGRATE) {
      const collection = db.collection(collName);
      const count = await collection.countDocuments();

      if (count === 0) {
        logger.info(`  ${collName}: 0 件 スキップ / 跳过`);
        continue;
      }

      // バッチで ID マッピングを生成 / 批量生成ID映射
      const cursor = collection.find({}, { projection: { _id: 1 } });
      const batch: Array<{ collection: string; mongo_id: string; pg_uuid: string }> = [];

      for await (const doc of cursor) {
        const mongoId = doc._id.toString();
        const pgUuid = objectIdToUuid(collName, mongoId);
        batch.push({ collection: collName, mongo_id: mongoId, pg_uuid: pgUuid });

        if (batch.length >= 1000) {
          await insertIdMappingBatch(pool, batch);
          totalMapped += batch.length;
          batch.length = 0;
        }
      }

      if (batch.length > 0) {
        await insertIdMappingBatch(pool, batch);
        totalMapped += batch.length;
      }

      logger.info(`  ${collName}: ${count} 件マッピング完了 / 映射完成`);
    }

    await updateMeta(pool, 'id_mapping', 'completed', totalMapped);
    logger.info(`Phase 2: ID Mapping Build 完了 / 完成 (${totalMapped} mappings)`);
  } finally {
    await mongo.close();
    await pool.end();
  }
}

async function insertIdMappingBatch(
  pool: Pool,
  batch: Array<{ collection: string; mongo_id: string; pg_uuid: string }>,
): Promise<void> {
  const values = batch
    .map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`)
    .join(', ');
  const params = batch.flatMap((b) => [b.collection, b.mongo_id, b.pg_uuid]);

  await pool.query(`
    INSERT INTO _migration_id_map (collection, mongo_id, pg_uuid)
    VALUES ${values}
    ON CONFLICT (collection, mongo_id) DO NOTHING
  `, params);
}
```

### 5.4 Phase 3-4: Extract & Transform / 抽出と変換

```typescript
// scripts/migrate/phase3-4-extract-transform.ts

import { MongoClient, Document } from 'mongodb';
import { objectIdToUuid, resolveRef } from './utils/id-converter';
import { flattenStatus, flattenRecipient, toTimestamp, toDecimal, toJsonb, toTextArray } from './utils/transformers';
import { logger } from './utils/logger';

// === 変換関数のレジストリ / 转换函数注册表 ===

type TransformFn<T = any> = (doc: Document, tenantId: string) => T;

const transformerRegistry: Record<string, TransformFn> = {
  tenants: transformTenant,
  users: transformUser,
  products: transformProduct,
  shipmentorders: transformShipmentOrder,
  // ... 他のコレクションも同様 / 其他集合类似
};

// === テナント変換 / 租户转换 ===
function transformTenant(doc: Document): any {
  return {
    id: objectIdToUuid('tenants', doc._id.toString()),
    tenantCode: doc.tenantCode ?? doc.code ?? 'default',
    name: doc.name ?? '',
    name2: doc.name2 ?? null,
    plan: doc.plan ?? 'free',
    status: doc.status ?? 'active',
    contactName: doc.contactName ?? null,
    contactEmail: doc.contactEmail ?? null,
    contactPhone: doc.contactPhone ?? null,
    postalCode: doc.postalCode ?? null,
    prefecture: doc.prefecture ?? null,
    city: doc.city ?? null,
    address: doc.address ?? null,
    maxUsers: doc.maxUsers ?? 5,
    maxWarehouses: doc.maxWarehouses ?? 1,
    maxClients: doc.maxClients ?? 10,
    trialExpiresAt: toTimestamp(doc.trialExpiresAt),
    billingStartedAt: toTimestamp(doc.billingStartedAt),
    features: toTextArray(doc.features),
    settings: toJsonb(doc.settings),
    isActive: doc.isActive ?? true,
    memo: doc.memo ?? null,
    createdAt: toTimestamp(doc.createdAt) ?? new Date(),
    updatedAt: toTimestamp(doc.updatedAt) ?? new Date(),
  };
}

// === ユーザー変換 / 用户转换 ===
function transformUser(doc: Document, tenantId: string): any {
  return {
    id: objectIdToUuid('users', doc._id.toString()),
    tenantId,
    email: doc.email,
    passwordHash: doc.password, // salt:hash 形式はそのまま / salt:hash格式直接保留
    displayName: doc.displayName ?? doc.name ?? doc.email,
    role: doc.role ?? 'operator',
    warehouseIds: resolveRefs('warehouses', doc.warehouseIds),
    clientId: resolveRef('clients', doc.clientId?.toString()),
    clientName: doc.clientName ?? null,
    parentUserId: resolveRef('users', doc.parentUserId?.toString()),
    phone: doc.phone ?? null,
    avatar: doc.avatar ?? null,
    language: doc.language ?? 'ja',
    isActive: doc.isActive ?? true,
    lastLoginAt: toTimestamp(doc.lastLoginAt),
    loginCount: doc.loginCount ?? 0,
    memo: doc.memo ?? null,
    createdAt: toTimestamp(doc.createdAt) ?? new Date(),
    updatedAt: toTimestamp(doc.updatedAt) ?? new Date(),
    deletedAt: toTimestamp(doc.deletedAt),
  };
}

// === 商品変換 / 商品转换 ===
function transformProduct(doc: Document, tenantId: string): any {
  return {
    id: objectIdToUuid('products', doc._id.toString()),
    tenantId,
    clientId: resolveRef('clients', doc.clientId?.toString()),
    sku: doc.sku ?? '',
    name: doc.name ?? '',
    name2: doc.name2 ?? null,
    barcode: toTextArray(doc.barcode),
    janCode: doc.janCode ?? null,
    category: doc.category ?? null,
    weight: doc.weight ?? null,
    width: doc.width ?? null,
    height: doc.height ?? null,
    depth: doc.depth ?? null,
    price: toDecimal(doc.price),
    cost: toDecimal(doc.cost),
    imageUrl: doc.imageUrl ?? null,
    customFields: toJsonb(doc.customFields),
    marketplaceCodes: toJsonb(doc.marketplaceCodes),
    wholesalePartnerCodes: toJsonb(doc.wholesalePartnerCodes),
    isActive: doc.isActive ?? true,
    createdAt: toTimestamp(doc.createdAt) ?? new Date(),
    updatedAt: toTimestamp(doc.updatedAt) ?? new Date(),
    deletedAt: toTimestamp(doc.deletedAt),
  };
}

// === 出荷オーダー変換（最も複雑）/ 出货订单转换（最复杂）===
function transformShipmentOrder(doc: Document, tenantId: string): any {
  const statusFlat = flattenStatus(doc.status);
  const recipientFlat = flattenRecipient(doc.recipient);

  return {
    id: objectIdToUuid('shipmentorders', doc._id.toString()),
    tenantId,
    clientId: resolveRef('clients', doc.clientId?.toString()),
    warehouseId: resolveRef('warehouses', doc.warehouseId?.toString()),
    carrierId: resolveRef('carriers', doc.carrierId?.toString()),
    orderNumber: doc.orderNumber ?? '',
    externalOrderNumber: doc.externalOrderNumber ?? null,
    orderDate: toTimestamp(doc.orderDate),
    shippingMethod: doc.shippingMethod ?? null,
    trackingNumber: doc.trackingNumber ?? null,
    // ステータス展開 / 状态展开
    ...statusFlat,
    // 受取人展開 / 收件人展开
    ...recipientFlat,
    // JSONB フィールド / JSONB字段
    carrierData: toJsonb(doc.carrierData),
    customFields: toJsonb(doc.customFields),
    memo: doc.memo ?? null,
    createdAt: toTimestamp(doc.createdAt) ?? new Date(),
    updatedAt: toTimestamp(doc.updatedAt) ?? new Date(),
    deletedAt: toTimestamp(doc.deletedAt),
  };
}

// === 埋め込みドキュメント分解 / 嵌入文档拆分 ===

/**
 * ShipmentOrder.products[] → shipment_order_products テーブル
 * 1:N 分解パターン / 拆分模式
 */
export function extractShipmentOrderProducts(
  mongoOrder: Document,
  pgOrderId: string,
  tenantId: string,
): any[] {
  const products = mongoOrder.products ?? [];
  return products.map((item: any, index: number) => ({
    id: uuidv4(), // 埋め込みドキュメントは元の _id がない / 嵌入文档没有原始_id
    tenantId,
    shipmentOrderId: pgOrderId,
    productId: resolveRef('products', item.productId?.toString()),
    sku: item.sku ?? '',
    name: item.name ?? '',
    quantity: item.quantity ?? 0,
    price: toDecimal(item.price),
    sortOrder: index,
  }));
}

/**
 * Product.subSkus[] → product_sub_skus テーブル
 */
export function extractProductSubSkus(
  mongoProduct: Document,
  pgProductId: string,
  tenantId: string,
): any[] {
  const subSkus = mongoProduct.subSkus ?? [];
  return subSkus.map((sub: any, index: number) => ({
    id: uuidv4(),
    tenantId,
    productId: pgProductId,
    sku: sub.sku ?? '',
    name: sub.name ?? '',
    barcode: sub.barcode ?? null,
    weight: sub.weight ?? null,
    isActive: sub.isActive ?? true,
    sortOrder: index,
  }));
}
```

### 5.5 Phase 5: Load / ロード

```typescript
// scripts/migrate/phase5-load.ts

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../../src/db/schema';
import { logger } from './utils/logger';

const BATCH_SIZE = 1000;

interface LoadStats {
  table: string;
  inserted: number;
  errors: number;
  duration: number;
}

export async function phase5Load(
  transformedData: Map<string, any[]>,
): Promise<LoadStats[]> {
  logger.info('Phase 5: Load 開始 / 开始');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });
  const stats: LoadStats[] = [];

  // Layer 順にロード / 按Layer顺序加载
  const loadOrder = [
    { table: 'tenants', data: transformedData.get('tenants') },
    { table: 'users', data: transformedData.get('users') },
    { table: 'warehouses', data: transformedData.get('warehouses') },
    { table: 'carriers', data: transformedData.get('carriers') },
    { table: 'clients', data: transformedData.get('clients') },
    { table: 'locations', data: transformedData.get('locations') },
    { table: 'products', data: transformedData.get('products') },
    { table: 'product_sub_skus', data: transformedData.get('product_sub_skus') },
    { table: 'lots', data: transformedData.get('lots') },
    { table: 'stock_quants', data: transformedData.get('stock_quants') },
    { table: 'shipment_orders', data: transformedData.get('shipment_orders') },
    { table: 'shipment_order_products', data: transformedData.get('shipment_order_products') },
    { table: 'shipment_order_materials', data: transformedData.get('shipment_order_materials') },
    { table: 'inbound_orders', data: transformedData.get('inbound_orders') },
    { table: 'inbound_order_lines', data: transformedData.get('inbound_order_lines') },
    { table: 'return_orders', data: transformedData.get('return_orders') },
    { table: 'return_order_lines', data: transformedData.get('return_order_lines') },
    // ... 残り全テーブル / 剩余所有表
  ];

  for (const { table, data } of loadOrder) {
    if (!data || data.length === 0) {
      logger.info(`  ${table}: 0 件 スキップ / 跳过`);
      continue;
    }

    const startTime = Date.now();
    let inserted = 0;
    let errors = 0;

    // バッチ INSERT / 批量INSERT
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE);
      try {
        await db.insert(schema[table as keyof typeof schema] as any)
          .values(batch)
          .onConflictDoNothing();
        inserted += batch.length;
      } catch (err: any) {
        logger.error(`  ${table} バッチ ${i}-${i + batch.length} エラー / 错误: ${err.message}`);
        // 個別 INSERT にフォールバック / 回退到逐条INSERT
        for (const record of batch) {
          try {
            await db.insert(schema[table as keyof typeof schema] as any)
              .values(record)
              .onConflictDoNothing();
            inserted++;
          } catch (innerErr: any) {
            errors++;
            logger.error(`  ${table} レコード ${record.id} エラー / 错误: ${innerErr.message}`);
          }
        }
      }
    }

    const duration = Date.now() - startTime;
    stats.push({ table, inserted, errors, duration });
    logger.info(`  ${table}: ${inserted} 件挿入 / 插入, ${errors} 件エラー / 错误 (${duration}ms)`);
  }

  logger.info('Phase 5: Load 完了 / 完成');
  return stats;
}
```

### 5.6 Phase 6: FK Enable / 外部キー有効化

```typescript
// scripts/migrate/phase6-fk-enable.ts

import { Pool } from 'pg';
import { logger } from './utils/logger';

/**
 * FK 制約定義 / FK约束定义
 * Phase 1 で削除した FK を再作成する / 重新创建Phase 1中删除的FK
 */
const FK_CONSTRAINTS = [
  // Layer 1 → Layer 0
  { table: 'users', column: 'tenant_id', ref: 'tenants(id)', onDelete: 'CASCADE' },
  { table: 'warehouses', column: 'tenant_id', ref: 'tenants(id)', onDelete: 'CASCADE' },
  { table: 'carriers', column: 'tenant_id', ref: 'tenants(id)', onDelete: 'CASCADE' },
  { table: 'clients', column: 'tenant_id', ref: 'tenants(id)', onDelete: 'CASCADE' },

  // Layer 2 → Layer 1
  { table: 'locations', column: 'warehouse_id', ref: 'warehouses(id)', onDelete: 'CASCADE' },
  { table: 'sub_clients', column: 'client_id', ref: 'clients(id)', onDelete: 'CASCADE' },
  { table: 'products', column: 'client_id', ref: 'clients(id)', onDelete: 'RESTRICT' },

  // Layer 3 → Layer 2
  { table: 'product_sub_skus', column: 'product_id', ref: 'products(id)', onDelete: 'CASCADE' },
  { table: 'lots', column: 'product_id', ref: 'products(id)', onDelete: 'RESTRICT' },
  { table: 'stock_quants', column: 'product_id', ref: 'products(id)', onDelete: 'RESTRICT' },
  { table: 'stock_quants', column: 'location_id', ref: 'locations(id)', onDelete: 'RESTRICT' },

  // Layer 4 → Layer 1-3
  { table: 'shipment_orders', column: 'client_id', ref: 'clients(id)', onDelete: 'RESTRICT' },
  { table: 'shipment_orders', column: 'warehouse_id', ref: 'warehouses(id)', onDelete: 'RESTRICT' },
  { table: 'shipment_orders', column: 'carrier_id', ref: 'carriers(id)', onDelete: 'SET NULL' },
  { table: 'shipment_order_products', column: 'shipment_order_id', ref: 'shipment_orders(id)', onDelete: 'CASCADE' },
  { table: 'shipment_order_products', column: 'product_id', ref: 'products(id)', onDelete: 'RESTRICT' },
  { table: 'inbound_orders', column: 'warehouse_id', ref: 'warehouses(id)', onDelete: 'RESTRICT' },
  { table: 'inbound_order_lines', column: 'inbound_order_id', ref: 'inbound_orders(id)', onDelete: 'CASCADE' },
  { table: 'return_orders', column: 'shipment_order_id', ref: 'shipment_orders(id)', onDelete: 'RESTRICT' },

  // Layer 5 → Layer 3-4
  { table: 'stock_moves', column: 'product_id', ref: 'products(id)', onDelete: 'RESTRICT' },
  { table: 'billing_records', column: 'client_id', ref: 'clients(id)', onDelete: 'RESTRICT' },
  { table: 'operation_logs', column: 'user_id', ref: 'users(id)', onDelete: 'SET NULL' },
  { table: 'notifications', column: 'user_id', ref: 'users(id)', onDelete: 'CASCADE' },
];

export async function phase6FkEnable(): Promise<void> {
  logger.info('Phase 6: FK Enable 開始 / 开始');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  let succeeded = 0;
  let failed = 0;

  for (const fk of FK_CONSTRAINTS) {
    const constraintName = `fk_${fk.table}_${fk.column}`;
    try {
      await pool.query(`
        ALTER TABLE ${fk.table}
        ADD CONSTRAINT ${constraintName}
        FOREIGN KEY (${fk.column}) REFERENCES ${fk.ref}
        ON DELETE ${fk.onDelete}
      `);
      succeeded++;
    } catch (err: any) {
      failed++;
      logger.error(`  FK ${constraintName} 作成失敗 / 创建失败: ${err.message}`);

      // 孤立レコード検出 / 检测孤立记录
      const refTable = fk.ref.split('(')[0];
      const result = await pool.query(`
        SELECT COUNT(*) as orphaned
        FROM ${fk.table} t
        LEFT JOIN ${refTable} r ON t.${fk.column} = r.id
        WHERE t.${fk.column} IS NOT NULL AND r.id IS NULL
      `);
      logger.error(`  → ${result.rows[0].orphaned} 件の孤立レコード / 孤立记录`);
    }
  }

  logger.info(`Phase 6: FK Enable 完了 / 完成 (${succeeded} OK, ${failed} failed)`);

  if (failed > 0) {
    throw new Error(`${failed} FK constraints failed. 手動確認が必要 / 需要手动确认.`);
  }

  await pool.end();
}
```

### 5.7 Phase 7: RLS Enable / Row-Level Security 有効化

```typescript
// scripts/migrate/phase7-rls-enable.ts

import { Pool } from 'pg';
import { logger } from './utils/logger';

// RLS 対象テーブル（tenants 以外の全テーブル）/ RLS目标表（tenants以外的所有表）
const RLS_TABLES = [
  'users', 'warehouses', 'carriers', 'clients', 'locations',
  'sub_clients', 'shops', 'customers', 'suppliers', 'products',
  'product_sub_skus', 'lots', 'serial_numbers', 'stock_quants',
  'shipment_orders', 'shipment_order_products', 'shipment_order_materials',
  'inbound_orders', 'inbound_order_lines', 'inbound_service_options',
  'return_orders', 'return_order_lines',
  'stock_moves', 'inventory_ledger', 'billing_records', 'invoices',
  'operation_logs', 'api_logs', 'notifications',
  'plugins', 'webhooks', 'automation_scripts', 'feature_flags',
  'auto_processing_rules', 'rule_definitions',
  'waves', 'warehouse_tasks', 'pick_tasks',
  'stocktaking_orders', 'cycle_count_plans',
  'print_templates', 'email_templates', 'form_templates',
  'system_settings', 'carrier_automation_configs',
];

export async function phase7RlsEnable(): Promise<void> {
  logger.info('Phase 7: RLS Enable 開始 / 开始');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  for (const table of RLS_TABLES) {
    try {
      // RLS 有効化 / 启用RLS
      await pool.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);

      // テナント分離ポリシー作成 / 创建租户隔离策略
      await pool.query(`
        CREATE POLICY tenant_isolation_${table} ON ${table}
        USING (
          tenant_id = (
            current_setting('request.jwt.claims', true)::jsonb
            -> 'app_metadata' ->> 'tenant_id'
          )::uuid
        )
      `);

      // サービスロール用バイパスポリシー / 服务角色旁路策略
      await pool.query(`
        CREATE POLICY service_role_${table} ON ${table}
        FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true)
      `);

      logger.info(`  ${table}: RLS 有効化完了 / 启用完成`);
    } catch (err: any) {
      logger.error(`  ${table}: RLS エラー / 错误: ${err.message}`);
    }
  }

  logger.info('Phase 7: RLS Enable 完了 / 完成');
  await pool.end();
}
```

### 5.8 Phase 8: Verify / 検証

```typescript
// scripts/migrate/phase8-verify.ts

import { MongoClient } from 'mongodb';
import { Pool } from 'pg';
import { createHash } from 'crypto';
import { logger } from './utils/logger';

interface VerificationResult {
  table: string;
  mongoCollection: string;
  mongoCount: number;
  pgCount: number;
  countMatch: boolean;
  checksumMatch: boolean | null;  // null = 未実施 / 未执行
  sampleMatch: boolean | null;
  fkIntegrity: boolean | null;
  details?: string;
}

// コレクション → テーブル マッピング / 集合→表映射
const COLLECTION_TABLE_MAP: Record<string, string> = {
  tenants: 'tenants',
  users: 'users',
  warehouses: 'warehouses',
  carriers: 'carriers',
  clients: 'clients',
  locations: 'locations',
  products: 'products',
  lots: 'lots',
  stockquants: 'stock_quants',
  shipmentorders: 'shipment_orders',
  inboundorders: 'inbound_orders',
  returnorders: 'return_orders',
  billingrecords: 'billing_records',
  operationlogs: 'operation_logs',
  notifications: 'notifications',
  // ... 全テーブル / 所有表
};

export async function phase8Verify(): Promise<VerificationResult[]> {
  logger.info('Phase 8: Verify 開始 / 开始');

  const mongo = new MongoClient(process.env.MONGO_URI!);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const results: VerificationResult[] = [];

  try {
    await mongo.connect();
    const mdb = mongo.db('nexand-shipment');

    // === 1. 行数比較 / 行数比较 ===
    logger.info('--- 行数検証 / 行数验证 ---');
    for (const [collName, tableName] of Object.entries(COLLECTION_TABLE_MAP)) {
      const mongoCount = await mdb.collection(collName).countDocuments();
      const pgResult = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      const pgCount = parseInt(pgResult.rows[0].count, 10);

      const match = mongoCount === pgCount;
      results.push({
        table: tableName,
        mongoCollection: collName,
        mongoCount,
        pgCount,
        countMatch: match,
        checksumMatch: null,
        sampleMatch: null,
        fkIntegrity: null,
        details: match ? undefined : `差分 / 差异: ${mongoCount - pgCount}`,
      });

      const icon = match ? '[OK]' : '[NG]';
      logger.info(`  ${icon} ${tableName}: MongoDB=${mongoCount}, PG=${pgCount}`);
    }

    // === 2. 在庫合計チェック / 库存总数检查 ===
    logger.info('--- 在庫合計検証 / 库存总数验证 ---');
    const mongoStockSum = await mdb.collection('stockquants').aggregate([
      { $group: { _id: null, total: { $sum: '$quantity' } } },
    ]).toArray();
    const pgStockSum = await pool.query('SELECT SUM(quantity) as total FROM stock_quants');
    const mongoTotal = mongoStockSum[0]?.total ?? 0;
    const pgTotal = parseInt(pgStockSum.rows[0].total ?? '0', 10);
    logger.info(`  在庫合計 / 库存总数: MongoDB=${mongoTotal}, PG=${pgTotal} ${mongoTotal === pgTotal ? '[OK]' : '[NG]'}`);

    // === 3. 金額合計チェック / 金额总数检查 ===
    logger.info('--- 金額合計検証 / 金额总数验证 ---');
    const mongoBillingSum = await mdb.collection('billingrecords').aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]).toArray();
    const pgBillingSum = await pool.query('SELECT SUM(amount) as total FROM billing_records');
    logger.info(`  請求合計 / 账单总额: MongoDB=${mongoBillingSum[0]?.total ?? 0}, PG=${pgBillingSum.rows[0].total ?? 0}`);

    // === 4. FK 整合性チェック / FK完整性检查 ===
    logger.info('--- FK 整合性検証 / FK完整性验证 ---');
    const fkChecks = [
      { table: 'shipment_order_products', column: 'shipment_order_id', ref: 'shipment_orders' },
      { table: 'shipment_order_products', column: 'product_id', ref: 'products' },
      { table: 'inbound_order_lines', column: 'inbound_order_id', ref: 'inbound_orders' },
      { table: 'stock_quants', column: 'product_id', ref: 'products' },
      { table: 'stock_quants', column: 'location_id', ref: 'locations' },
    ];

    for (const check of fkChecks) {
      const orphanResult = await pool.query(`
        SELECT COUNT(*) as count
        FROM ${check.table} t
        LEFT JOIN ${check.ref} r ON t.${check.column} = r.id
        WHERE t.${check.column} IS NOT NULL AND r.id IS NULL
      `);
      const orphanCount = parseInt(orphanResult.rows[0].count, 10);
      const ok = orphanCount === 0;
      logger.info(`  ${ok ? '[OK]' : '[NG]'} ${check.table}.${check.column} → ${check.ref}: ${orphanCount} 件孤立 / 孤立`);
    }

    // === 5. サンプルデータ比較 / 抽样数据比较 ===
    logger.info('--- サンプルデータ検証 / 抽样数据验证 ---');
    const sampleCollections = ['products', 'shipmentorders', 'users'];
    for (const collName of sampleCollections) {
      const samples = await mdb.collection(collName).find().limit(5).toArray();
      for (const sample of samples) {
        const pgRow = await pool.query(
          `SELECT * FROM ${COLLECTION_TABLE_MAP[collName]} WHERE id = $1`,
          [objectIdToUuid(collName, sample._id.toString())],
        );
        if (pgRow.rows.length === 0) {
          logger.error(`  [NG] ${collName}/${sample._id}: PostgreSQL にレコードなし / 无记录`);
        } else {
          logger.info(`  [OK] ${collName}/${sample._id}: 存在確認 / 存在确认`);
        }
      }
    }

    // === 結果サマリ出力 / 输出结果摘要 ===
    printVerificationSummary(results);

    logger.info('Phase 8: Verify 完了 / 完成');
    return results;
  } finally {
    await mongo.close();
    await pool.end();
  }
}

function printVerificationSummary(results: VerificationResult[]): void {
  console.log('\n┌────────────────────────────────┬──────────┬──────────┬─────────┐');
  console.log('│ Table                          │ MongoDB  │ Postgres │ Match   │');
  console.log('├────────────────────────────────┼──────────┼──────────┼─────────┤');
  for (const r of results) {
    const name = r.table.padEnd(30);
    const mc = String(r.mongoCount).padStart(8);
    const pc = String(r.pgCount).padStart(8);
    const match = r.countMatch ? '  [OK]  ' : '  [NG]  ';
    console.log(`│ ${name} │ ${mc} │ ${pc} │${match}│`);
  }
  console.log('└────────────────────────────────┴──────────┴──────────┴─────────┘');
}
```

### 5.9 統合実行スクリプト / 集成执行脚本

```typescript
// scripts/migrate/run-all.ts

import { phase1SchemaSetup } from './phase1-schema';
import { phase2IdMapping } from './phase2-id-mapping';
import { phase5Load } from './phase5-load';
import { phase6FkEnable } from './phase6-fk-enable';
import { phase7RlsEnable } from './phase7-rls-enable';
import { phase8Verify } from './phase8-verify';
import { logger } from './utils/logger';

async function main(): Promise<void> {
  const startTime = Date.now();
  logger.info('=== ZELIXWMS ETL Migration 開始 / 开始 ===');

  try {
    // Phase 1: Schema Setup
    await phase1SchemaSetup();

    // Phase 2: ID Mapping
    await phase2IdMapping();

    // Phase 3-4: Extract & Transform
    // (各コレクションの変換結果を Map に格納 / 将各集合转换结果存入Map)
    const transformedData = await extractAndTransformAll();

    // Phase 5: Load
    const loadStats = await phase5Load(transformedData);

    // Phase 6: FK Enable
    await phase6FkEnable();

    // Phase 7: RLS Enable
    await phase7RlsEnable();

    // Phase 8: Verify
    const verifyResults = await phase8Verify();

    // 結果判定 / 结果判定
    const allCountsMatch = verifyResults.every((r) => r.countMatch);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    if (allCountsMatch) {
      logger.info(`=== ETL Migration 成功 / 成功 (${elapsed}s) ===`);
    } else {
      const failures = verifyResults.filter((r) => !r.countMatch);
      logger.error(`=== ETL Migration 検証失敗 / 验证失败 (${failures.length} tables) ===`);
      process.exit(1);
    }
  } catch (err: any) {
    logger.error(`=== ETL Migration エラー / 错误: ${err.message} ===`);
    logger.error(err.stack);
    process.exit(1);
  }
}

main();
```

---

## 6. データ検証マトリクス / 数据验证矩阵

### 6.1 検証カテゴリ / 验证类别

| カテゴリ / 类别 | 検証方法 / 验证方法 | 合格基準 / 合格标准 | 自動化 / 自动化 |
|---|---|---|---|
| **行数整合性** / 行数一致性 | `COUNT(*)` MongoDB vs PostgreSQL | 完全一致 / 完全一致 | Phase 8 自動 |
| **在庫合計** / 库存总数 | `SUM(quantity)` 比較 | 完全一致 | Phase 8 自動 |
| **金額合計** / 金额总数 | `SUM(amount)` 比較 | 小数点以下 2 桁一致 / 小数点后2位一致 | Phase 8 自動 |
| **FK 整合性** / FK完整性 | orphaned record 検出 | 0 件 | Phase 8 自動 |
| **サンプル検証** / 抽样验证 | ランダム 100 件のフィールド比較 | 全フィールド一致 / 全字段一致 | Phase 8 自動 |
| **UNIQUE 制約** / UNIQUE约束 | 重複チェック | 0 件 | FK Enable 時 |
| **日時精度** / 日期精度 | タイムスタンプ比較 | 秒単位一致 / 秒级一致 | Phase 8 自動 |
| **JSONB 構造** / JSONB结构 | JSON キー比較 | キーセット一致 / 键集一致 | 手動スポットチェック / 手动抽检 |
| **画像 URL** / 图片URL | HTTP HEAD リクエスト | 404 なし / 无404 | 別スクリプト |
| **パスワードハッシュ** / 密码哈希 | ログイン試行 | 認証成功 / 认证成功 | 手動テスト / 手动测试 |

### 6.2 テーブル別検証マトリクス / 表级验证矩阵

| テーブル | 行数 | 合計値 | FK | サンプル | JSONB | 備考 / 备注 |
|---|---|---|---|---|---|---|
| `tenants` | x | - | - | x | x (settings) | 最優先 / 最优先 |
| `users` | x | - | x | x | - | パスワード検証必須 / 密码验证必须 |
| `products` | x | - | x | x | x (customFields) | SKU 一意性チェック / SKU唯一性检查 |
| `stock_quants` | x | x (quantity) | x | x | - | 在庫整合性最重要 / 库存一致性最重要 |
| `shipment_orders` | x | - | x | x | x (carrierData) | 最大テーブル / 最大表 |
| `shipment_order_products` | x | x (quantity) | x | x | - | 1:N 分解検証 / 拆分验证 |
| `billing_records` | x | x (amount) | x | x | - | 金額精度重要 / 金额精度重要 |
| `operation_logs` | x | - | x | - | - | パーティション検証 / 分区验证 |

### 6.3 チェックサム計算 / 校验和计算

```typescript
// 重要テーブルのチェックサム計算 / 重要表的校验和计算

import { createHash } from 'crypto';

/**
 * テーブルの全レコードからチェックサムを計算
 * 从表的所有记录计算校验和
 *
 * MongoDB 側: db.collection.find().sort({_id:1}).forEach(doc => hash.update(JSON.stringify(doc)))
 * PostgreSQL 側: SELECT * FROM table ORDER BY id で同様に計算
 */
async function calculateTableChecksum(
  pool: Pool,
  table: string,
  columns: string[],
): Promise<string> {
  const hash = createHash('sha256');
  const query = `SELECT ${columns.join(', ')} FROM ${table} ORDER BY id`;
  const result = await pool.query(query);

  for (const row of result.rows) {
    hash.update(JSON.stringify(row));
  }

  return hash.digest('hex');
}

/**
 * MongoDB コレクションのチェックサム計算
 * MongoDB集合的校验和计算
 */
async function calculateMongoChecksum(
  db: Db,
  collection: string,
  fields: Record<string, 1>,
): Promise<string> {
  const hash = createHash('sha256');
  const cursor = db.collection(collection)
    .find({}, { projection: fields })
    .sort({ _id: 1 });

  for await (const doc of cursor) {
    hash.update(JSON.stringify(doc));
  }

  return hash.digest('hex');
}
```

---

## 7. ロールバック計画 / 回滚计划

### 7.1 ロールバックシナリオ / 回滚场景

```
┌──────────────────────────────────────────────────────────────────┐
│                    ロールバック判断フロー / 回滚判断流程            │
│                                                                    │
│  ETL 実行中にエラー?                                              │
│  ETL执行中发生错误？                                               │
│    ├─ Yes → Phase 1-5 → PostgreSQL TRUNCATE + 再実行 / 重新执行   │
│    ├─ Yes → Phase 6-7 → FK/RLS 手動修正 / 手动修复                │
│    └─ No  → Phase 8 検証失敗?                                     │
│              ├─ 行数不一致 → 差分分析 → 部分再移行 / 部分重新迁移   │
│              ├─ FK 孤立 → 孤立レコード修正 / 修复孤立记录           │
│              └─ 金額不一致 → 手動確認 / 手动确认                   │
│                                                                    │
│  Dual-Write 期間中にエラー?                                       │
│  双写期间发生错误？                                                │
│    ├─ PostgreSQL 障害 → MongoDB にフォールバック / 回退到MongoDB   │
│    ├─ 不整合検出 → Dual-Write 停止 + 調査 / 停止双写+调查        │
│    └─ 正常 → カットオーバーへ / 进入切换                          │
└──────────────────────────────────────────────────────────────────┘
```

### 7.2 移行前ロールバック / 迁移前回滚

MongoDB は一切変更しないため、ETL 開始前はロールバック不要。
因为不对MongoDB做任何修改，ETL开始前无需回滚。

```bash
# 前提確認 / 前提确认
# MongoDB のバックアップは取得済みか / 是否已备份MongoDB
mongodump --uri "$MONGO_URI" --out /backup/pre-migration-$(date +%Y%m%d)
```

### 7.3 移行中ロールバック / 迁移中回滚

```bash
# === ETL 途中失敗時の完全ロールバック / ETL中途失败时的完全回滚 ===

# 1. 全テーブルの移行データ削除（TRUNCATE CASCADE）/ 删除所有迁移数据
psql $DATABASE_URL -c "
DO \$\$ DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename NOT LIKE '_migration_%'
    AND tablename != 'drizzle_migrations'
  ) LOOP
    EXECUTE 'TRUNCATE TABLE ' || r.tablename || ' CASCADE';
  END LOOP;
END \$\$;
"

# 2. マッピングテーブル削除 / 删除映射表
psql $DATABASE_URL -c "
  DROP TABLE IF EXISTS _migration_id_map;
  DROP TABLE IF EXISTS _migration_meta;
"

# 3. 問題修正後に再実行 / 修复问题后重新执行
npx tsx scripts/migrate/run-all.ts
```

### 7.4 移行後ロールバック（Dual-Write 期間）/ 迁移后回滚（双写期间）

```bash
# === PostgreSQL → MongoDB フォールバック / 回退到MongoDB ===

# 1. Dual-Write フラグ OFF / 关闭双写标志
# .env: DUAL_WRITE_ENABLED=false

# 2. フロントエンド API URL を Express に戻す / 将前端API URL切回Express
# frontend/.env: VITE_API_URL=http://localhost:4000/api

# 3. フロントエンド再デプロイ / 前端重新部署
cd /app/frontend && pnpm build && pnpm deploy

# 4. NestJS サーバー停止（データは保持）/ 停止NestJS（保留数据）
docker compose stop zelixwms-backend-nest

# 5. MongoDB は Dual-Write 期間中も書き込まれているのでデータは最新
# MongoDB在双写期间也有写入，数据是最新的
```

### 7.5 完全切替後のロールバック / 完全切换后的回滚

完全切替（MongoDB 停止）後のロールバックは MongoDB が最新でないため困難。
完全切换（MongoDB停止）后的回滚因MongoDB不是最新的而困难。

対策 / 对策:
1. 完全切替前に必ず 1 週間の Dual-Write 期間を設ける / 完全切换前必须设置1周的双写期间
2. 完全切替時に MongoDB の最終スナップショットを取得 / 完全切换时获取MongoDB最终快照
3. 完全切替後 30 日間は PostgreSQL → MongoDB 逆移行スクリプトを準備 / 切换后30天内准备反向迁移脚本

---

## 8. ゼロダウンタイム移行戦略 / 零停机迁移策略

### 8.1 移行タイムライン / 迁移时间线

```
Week 0: 準備 / 准备
├── ETL スクリプト開発・テスト（ステージング環境）/ 开发测试ETL脚本（临时环境）
├── MongoDB バックアップ取得 / 获取MongoDB备份
└── PostgreSQL スキーマ構築 / 构建PostgreSQL模式

Week 1: 初期移行 / 初始迁移
├── Day 1: ETL 実行（Phase 1-8）/ 执行ETL
├── Day 2: 検証・問題修正 / 验证和修复
├── Day 3: 再実行（必要な場合）/ 重新执行（如需）
└── Day 4-5: NestJS API 最終テスト / NestJS API最终测试

Week 2: Dual-Write 期間 / 双写期间
├── Day 1: Dual-Write 有効化 / 启用双写
│   └── Frontend → NestJS (primary) → PostgreSQL + MongoDB (shadow)
├── Day 2-5: 不整合モニタリング / 不一致监控
│   └── compare-dual-write.ts 定期実行 / 定期执行
└── Day 6-7: 切替判定 / 切换判定

Week 3: カットオーバー / 切换
├── Day 1: MongoDB への shadow write 停止 / 停止MongoDB影子写入
├── Day 2-3: 最終検証 / 最终验证
├── Day 4: Express サーバー停止 / 停止Express服务器
└── Day 5-7: ポストモニタリング / 后续监控
```

### 8.2 Dual-Write アーキテクチャ / 双写架构

```
                       ┌──────────────┐
                       │   Frontend   │
                       │   (Vue 3)    │
                       └──────┬───────┘
                              │
                              ▼
                       ┌──────────────┐
                       │   NestJS     │  ← プライマリ / 主服务
                       │   Backend    │
                       └──────┬───────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
            ┌──────────────┐   ┌──────────────┐
            │  PostgreSQL  │   │  MongoDB     │
            │  (Primary)   │   │  (Shadow)    │
            │  via Drizzle │   │  via Event   │
            └──────────────┘   └──────────────┘
                                      │
                                      ▼
                               ┌──────────────┐
                               │ Compare Job  │
                               │ (cron 1h)    │
                               └──────────────┘
```

### 8.3 Dual-Write 実装 / 双写实现

```typescript
// src/interceptors/dual-write.interceptor.ts

import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { MongoClient } from 'mongodb';
import { logger } from '../common/logger';

@Injectable()
export class DualWriteInterceptor implements NestInterceptor {
  private mongoClient: MongoClient;

  constructor() {
    if (process.env.DUAL_WRITE_ENABLED === 'true') {
      this.mongoClient = new MongoClient(process.env.MONGO_URI!);
      this.mongoClient.connect();
    }
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      tap(async (responseData) => {
        if (process.env.DUAL_WRITE_ENABLED !== 'true') return;

        const request = context.switchToHttp().getRequest();
        const method = request.method;

        // 読取操作はスキップ / 跳过读取操作
        if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return;

        try {
          await this.syncToMongo(request, responseData);
        } catch (err: any) {
          // Dual-Write エラーは警告のみ。PostgreSQL が正 / 双写错误仅告警。PostgreSQL为准
          logger.warn({
            msg: 'Dual-Write shadow write failed / 双写影子写入失败',
            method,
            path: request.path,
            error: err.message,
          });
        }
      }),
    );
  }

  private async syncToMongo(request: any, data: any): Promise<void> {
    const db = this.mongoClient.db('nexand-shipment');
    const path = request.path;

    // パスからコレクション名を推定 / 从路径推断集合名
    const collectionName = this.resolveCollection(path);
    if (!collectionName) return;

    const collection = db.collection(collectionName);

    switch (request.method) {
      case 'POST':
        if (data?.id) {
          await collection.insertOne({ ...data, _synced: true });
        }
        break;
      case 'PUT':
      case 'PATCH':
        if (data?.id) {
          await collection.updateOne(
            { _id: data.id },
            { $set: { ...data, _synced: true } },
            { upsert: true },
          );
        }
        break;
      case 'DELETE':
        const id = path.split('/').pop();
        if (id) {
          await collection.deleteOne({ _id: id });
        }
        break;
    }
  }

  private resolveCollection(path: string): string | null {
    const mapping: Record<string, string> = {
      '/api/products': 'products',
      '/api/shipment-orders': 'shipmentorders',
      '/api/inbound-orders': 'inboundorders',
      '/api/clients': 'clients',
      '/api/warehouses': 'warehouses',
      // ... 全エンドポイント / 所有端点
    };

    for (const [prefix, coll] of Object.entries(mapping)) {
      if (path.startsWith(prefix)) return coll;
    }
    return null;
  }
}
```

### 8.4 Dual-Write 整合性チェック / 双写一致性检查

```typescript
// scripts/migrate/compare-dual-write.ts

import { MongoClient } from 'mongodb';
import { Pool } from 'pg';
import { logger } from './utils/logger';

/**
 * Dual-Write 期間中に MongoDB と PostgreSQL のデータ整合性をチェック
 * 在双写期间检查MongoDB和PostgreSQL的数据一致性
 *
 * cron: 毎時実行 / 每小时执行
 */
async function compareDualWrite(): Promise<void> {
  const mongo = new MongoClient(process.env.MONGO_URI!);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    await mongo.connect();
    const mdb = mongo.db('nexand-shipment');

    const tables = [
      { mongo: 'products', pg: 'products' },
      { mongo: 'shipmentorders', pg: 'shipment_orders' },
      { mongo: 'stockquants', pg: 'stock_quants' },
    ];

    for (const { mongo: collName, pg: tableName } of tables) {
      const mongoCount = await mdb.collection(collName).countDocuments();
      const pgResult = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      const pgCount = parseInt(pgResult.rows[0].count, 10);
      const diff = Math.abs(mongoCount - pgCount);

      if (diff > 0) {
        logger.warn({
          msg: '不整合検出 / 检测到不一致',
          table: tableName,
          mongoCount,
          pgCount,
          diff,
        });

        // 閾値超過時にアラート / 超过阈值时告警
        if (diff > 10) {
          // Slack 通知 / 发送Slack通知
          await sendAlert(`Dual-Write 不整合: ${tableName} diff=${diff}`);
        }
      }
    }
  } finally {
    await mongo.close();
    await pool.end();
  }
}

compareDualWrite();
```

### 8.5 カットオーバーチェックリスト / 切换检查清单

カットオーバー（完全切替）前に以下をすべて確認すること。
在切换（完全切换）前确认以下所有项目。

| # | チェック項目 / 检查项目 | 確認方法 / 确认方法 | 担当 / 负责 |
|---|---|---|---|
| 1 | Dual-Write 期間 1 週間以上経過 / 双写期间超过1周 | カレンダー / 日历 | PM |
| 2 | Dual-Write 不整合アラート 0 件 / 双写不一致告警0条 | モニタリング / 监控 | SRE |
| 3 | NestJS API 全エンドポイント正常 / 所有端点正常 | E2E テスト / 测试 | QA |
| 4 | 109 画面全機能動作確認 / 109画面全功能确认 | 手動テスト / 手动测试 | QA |
| 5 | パフォーマンス劣化なし / 无性能退化 | APM メトリクス / 指标 | SRE |
| 6 | MongoDB 最終スナップショット取得 / 获取最终快照 | mongodump | SRE |
| 7 | ロールバック手順確認 / 确认回滚步骤 | ドキュメント / 文档 | PM |
| 8 | 関係者全員に切替通知 / 通知所有相关人员 | メール / 邮件 | PM |

### 8.6 カットオーバー手順 / 切换步骤

```bash
# === カットオーバー実行手順 / 切换执行步骤 ===

# Step 1: メンテナンスモード（任意）/ 维护模式（可选）
# 短時間の読取専用モードにする場合のみ / 仅在需要短时间只读模式时
# curl -X POST https://api.zelixwms.com/admin/maintenance -d '{"enabled": true}'

# Step 2: MongoDB shadow write 停止 / 停止MongoDB影子写入
# .env: DUAL_WRITE_ENABLED=false
# NestJS 再起動 / 重启NestJS

# Step 3: 最終整合性チェック / 最终一致性检查
npx tsx scripts/migrate/compare-dual-write.ts

# Step 4: Express サーバー停止 / 停止Express服务器
docker compose stop zelixwms-backend-express

# Step 5: メンテナンスモード解除（使用した場合）/ 解除维护模式（如使用）
# curl -X POST https://api.zelixwms.com/admin/maintenance -d '{"enabled": false}'

# Step 6: 切替後モニタリング開始 / 开始切换后监控
# ダッシュボードで以下を監視 / 在仪表板监控以下内容:
#   - API レスポンスタイム / API响应时间
#   - エラーレート / 错误率
#   - データベース接続数 / 数据库连接数
#   - メモリ・CPU 使用率 / 内存CPU使用率
```

---

## 付録 A: ETL ユーティリティ / 附录A：ETL工具

### A.1 ロガー / 日志记录器

```typescript
// scripts/migrate/utils/logger.ts

import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'yyyy-mm-dd HH:MM:ss',
    },
  },
});
```

### A.2 プログレスバー / 进度条

```typescript
// scripts/migrate/utils/progress.ts

import cliProgress from 'cli-progress';

export function createProgressBar(total: number, label: string) {
  const bar = new cliProgress.SingleBar({
    format: `  ${label} [{bar}] {percentage}% | {value}/{total} | ETA: {eta}s`,
    barCompleteChar: '=',
    barIncompleteChar: '-',
  });
  bar.start(total, 0);
  return bar;
}
```

### A.3 環境変数 / 环境变量

```bash
# .env.migration

# MongoDB 接続 / MongoDB连接
MONGO_URI=mongodb://localhost:27017/nexand-shipment

# PostgreSQL 接続 / PostgreSQL连接
DATABASE_URL=postgresql://postgres:password@localhost:5432/zelixwms

# Dual-Write 制御 / 双写控制
DUAL_WRITE_ENABLED=false

# ETL 設定 / ETL设置
BATCH_SIZE=1000
LOG_LEVEL=info
DRY_RUN=false
```

---

## 付録 B: トラブルシューティング / 附录B：故障排查

| 問題 / 问题 | 原因 / 原因 | 対処 / 对策 |
|---|---|---|
| UUID 重複エラー | 異なるコレクションの同一 ObjectId | namespace に collection 名を含めて回避済み / 已通过在namespace中包含集合名回避 |
| FK 制約違反 | 参照先レコードが未移行 | Layer 順序を遵守。Phase 5 で FK 無効化済み / 遵循Layer顺序，Phase 5已禁用FK |
| JSONB 内の ObjectId 未変換 | 深い階層の ObjectId | `deepTransformObjectIds` の再帰処理で対応 / 通过递归处理应对 |
| タイムスタンプずれ | MongoDB ISODate vs JS Date | `toTimestamp()` で統一変換 / 统一转换 |
| 空文字列 vs NULL | MongoDB の `""` | PostgreSQL 側で `NULLIF(value, '')` 適用 / 应用NULLIF |
| メモリ不足 | 大量データの一括処理 | BATCH_SIZE を 500 に下げる / 降低到500 |
| Dual-Write 遅延 | MongoDB 書込の非同期エラー | エラーはログのみ、PostgreSQL が正 / 仅记录日志，以PostgreSQL为准 |

---

> このドキュメントは ZELIXWMS MongoDB → PostgreSQL 移行の ETL アーキテクチャを網羅的に定義する。
> 实際の実行手順は [07-data-migration.md](../migration/07-data-migration.md) を参照。
>
> 本文档全面定义了ZELIXWMS MongoDB → PostgreSQL迁移的ETL架构。
> 实际执行步骤请参考 [07-data-migration.md](../migration/07-data-migration.md)。
