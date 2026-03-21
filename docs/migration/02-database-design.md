# 02 - 数据库设计 / データベース設計

> ZELIXWMS NestJS + PostgreSQL (Supabase) 移行用データベース設計書
> ZELIXWMS NestJS + PostgreSQL (Supabase) 迁移数据库设计文档
>
> 对应 MongoDB 模型文件: `backend/src/models/*.ts` (78 files)
> 対応する MongoDB モデルファイル: `backend/src/models/*.ts` (78 files)
>
> 最終更新 / 最后更新: 2026-03-21

---

## 目次 / 目次

1. [设计原则 / 設計原則](#1-设计原则--設計原則)
2. [多租户策略 / マルチテナント戦略](#2-多租户策略--マルチテナント戦略)
3. [核心表 (Priority 1) / コアテーブル](#3-核心表-priority-1--コアテーブル)
4. [业务表 (Priority 2) / ビジネステーブル](#4-业务表-priority-2--ビジネステーブル)
5. [扩展表 (Priority 3) / 拡張テーブル](#5-扩展表-priority-3--拡張テーブル)
6. [日志表 (Priority 4, 带分区) / ログテーブル（パーティション付き）](#6-日志表-priority-4-带分区--ログテーブルパーティション付き)
7. [索引策略 / インデックス戦略](#7-索引策略--インデックス戦略)
8. [Drizzle Schema 示例 / Drizzle Schema サンプル](#8-drizzle-schema-示例--drizzle-schema-サンプル)
9. [MongoDB → PostgreSQL 类型映射 / 型マッピング](#9-mongodb--postgresql-类型映射--型マッピング)
10. [数据迁移注意事项 / データ移行注意事項](#10-数据迁移注意事项--データ移行注意事項)

---

## 1. 设计原则 / 設計原則

### 1.1 共通カラム規約 / 通用列规约

所有表必须包含以下标准列 / すべてのテーブルに以下の標準カラムを含むこと：

| 列名 / カラム名 | 型 / 型 | 説明 / 说明 |
|---|---|---|
| `id` | `UUID` (DEFAULT gen_random_uuid()) | 主键。MongoDB ObjectId から UUID v5 へ変換 / 主键，从 MongoDB ObjectId 转换为 UUID v5 |
| `tenant_id` | `UUID NOT NULL` | 多租户隔离键。外键 → tenants(id) / マルチテナント分離キー |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` | 创建时间 / 作成日時 |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` | 更新时间（トリガーで自動更新） / 更新日時 |
| `deleted_at` | `TIMESTAMPTZ` | 软删除时间戳（NULL = 未删除）/ 論理削除タイムスタンプ |

> **例外 / 例外**: `tenants` テーブル自身は `tenant_id` を持たない。
> ログテーブル（Priority 4）は `deleted_at` を持たない（パーティション + TTL で管理）。

### 1.2 外键约束 / 外部キー制約

```sql
-- 标准外键模板 / 標準外部キーテンプレート
REFERENCES parent_table(id) ON DELETE RESTRICT  -- 默认: 禁止删除有引用的记录 / デフォルト: 参照先の削除を禁止
REFERENCES parent_table(id) ON DELETE CASCADE   -- 子记录随父记录删除 / 子レコードも一緒に削除
REFERENCES parent_table(id) ON DELETE SET NULL   -- 父记录删除时设为 NULL / 親削除時にNULLに設定
```

### 1.3 CHECK 约束 / CHECK 制約

```sql
-- 业务规则的强制校验 / ビジネスルールの強制検証
CHECK (quantity >= 0)
CHECK (status IN ('draft', 'confirmed', 'done', 'cancelled'))
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
CHECK (period ~ '^\d{4}-\d{2}$')
```

### 1.4 索引规约 / インデックス規約

```sql
-- GIN 索引用于 JSONB 和数组字段 / GIN インデックス: JSONB・配列フィールド用
CREATE INDEX idx_products_barcode ON products USING GIN (barcode);
CREATE INDEX idx_products_custom_fields ON products USING GIN (custom_fields jsonb_path_ops);

-- 部分索引用于软删除 / 部分インデックス: 論理削除用
CREATE INDEX idx_products_active ON products (tenant_id, sku) WHERE deleted_at IS NULL;

-- pg_trgm 用于文本搜索 / pg_trgm: テキスト検索用
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);
```

### 1.5 updated_at 自动触发器 / updated_at 自動トリガー

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 对每个表创建触发器 / 各テーブルにトリガーを作成
CREATE TRIGGER trg_update_updated_at
  BEFORE UPDATE ON table_name
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## 2. 多租户策略 / マルチテナント戦略

### 2.1 应用层隔离 / アプリケーション層分離

所有查询必须包含 tenant_id 条件 / すべてのクエリに tenant_id 条件を含むこと：

```sql
-- NestJS 服务层中的每个查询 / NestJS サービス層の全クエリ
SELECT * FROM products WHERE tenant_id = :tenantId AND deleted_at IS NULL;
```

Drizzle 的 `where` 子句中始终包含 `eq(schema.tenantId, ctx.tenantId)`:

```typescript
// NestJS service 内 / NestJS サービス内
const products = await db.select()
  .from(productsTable)
  .where(and(
    eq(productsTable.tenantId, tenantId),
    isNull(productsTable.deletedAt),
  ));
```

### 2.2 RLS (Row-Level Security) 安全网 / RLS セーフティネット

Supabase Auth 的 JWT `app_metadata` 中存储 `tenant_id`，作为二层防护：
Supabase Auth の JWT `app_metadata` に `tenant_id` を格納し、二重防護とする：

```sql
-- 启用 RLS / RLS 有効化
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 基于 JWT 的策略 / JWT ベースのポリシー
CREATE POLICY tenant_isolation ON products
  USING (tenant_id = (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'tenant_id')::uuid);
```

### 2.3 Supabase Auth 集成 / Supabase Auth 統合

- `users` 表的 `supabase_uid` 列与 `auth.users.id` 关联
- `users` テーブルの `supabase_uid` カラムが `auth.users.id` と紐付け
- 登录时 Supabase Auth 处理认证，应用层从 JWT 中提取 tenant_id
- ログイン時は Supabase Auth が認証処理、アプリ層は JWT から tenant_id を抽出

---

## 3. 核心表 (Priority 1) / コアテーブル

### 3.1 tenants — 租户 / テナント

> MongoDB: `backend/src/models/tenant.ts`

```sql
CREATE TABLE tenants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_code   VARCHAR(50) NOT NULL UNIQUE,
  name          VARCHAR(200) NOT NULL,
  name2         VARCHAR(200),                  -- 英語名等 / 英文名等
  plan          VARCHAR(20) NOT NULL DEFAULT 'free'
                CHECK (plan IN ('free', 'starter', 'standard', 'pro', 'enterprise')),
  status        VARCHAR(20) NOT NULL DEFAULT 'trial'
                CHECK (status IN ('active', 'suspended', 'trial', 'cancelled')),
  -- 联系信息 / 連絡先情報
  contact_name  VARCHAR(100),
  contact_email VARCHAR(200),
  contact_phone VARCHAR(50),
  postal_code   VARCHAR(20),
  prefecture    VARCHAR(50),
  city          VARCHAR(100),
  address       TEXT,
  -- 限制 / 制限
  max_users      INT NOT NULL DEFAULT 5,
  max_warehouses INT NOT NULL DEFAULT 1,
  max_clients    INT NOT NULL DEFAULT 10,
  -- 日期 / 日付
  trial_expires_at  TIMESTAMPTZ,
  billing_started_at TIMESTAMPTZ,
  -- 特性 / 機能
  features      TEXT[] DEFAULT '{}',            -- MongoDB: features: [String]
  settings      JSONB NOT NULL DEFAULT '{}',    -- MongoDB: settings: Mixed
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  memo          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- 注意: tenants 表无 tenant_id 和 deleted_at / テナント表は tenant_id と deleted_at を持たない
);

CREATE INDEX idx_tenants_status ON tenants (status, is_active);
CREATE INDEX idx_tenants_plan ON tenants (plan);
CREATE INDEX idx_tenants_name_trgm ON tenants USING GIN (name gin_trgm_ops);
```

### 3.2 users — 用户 / ユーザー

> MongoDB: `backend/src/models/user.ts`

```sql
CREATE TABLE users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  supabase_uid   UUID UNIQUE,                  -- Supabase Auth UID（移行後に追加）
  email          VARCHAR(200) NOT NULL,
  password_hash  TEXT NOT NULL,                 -- PBKDF2 salt:hash 格式 / 形式
  display_name   VARCHAR(200) NOT NULL,
  role           VARCHAR(20) NOT NULL DEFAULT 'operator'
                 CHECK (role IN ('admin', 'manager', 'operator', 'viewer', 'client')),
  warehouse_ids  UUID[],                        -- 仓库限制 / 倉庫制限（空=全倉庫アクセス）
  client_id      UUID,                          -- FK → clients (延迟创建 / 遅延作成)
  client_name    VARCHAR(200),                  -- 缓存字段 / キャッシュフィールド
  parent_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  phone          VARCHAR(50),
  avatar         TEXT,
  language       VARCHAR(5) CHECK (language IN ('ja', 'zh', 'en')),
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at  TIMESTAMPTZ,
  login_count    INT NOT NULL DEFAULT 0,
  memo           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ,

  UNIQUE (tenant_id, email)
);

CREATE INDEX idx_users_tenant ON users (tenant_id);
CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_users_client ON users (client_id);
CREATE INDEX idx_users_active ON users (tenant_id, is_active) WHERE deleted_at IS NULL;
```

### 3.3 warehouses — 仓库 / 倉庫

> MongoDB: `backend/src/models/warehouse.ts`

```sql
CREATE TABLE warehouses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code         VARCHAR(50) NOT NULL,
  name         VARCHAR(200) NOT NULL,
  name2        VARCHAR(200),
  postal_code  VARCHAR(20),
  prefecture   VARCHAR(50),
  city         VARCHAR(100),
  address      TEXT,
  address2     TEXT,
  phone        VARCHAR(50),
  cool_types   VARCHAR(5)[] DEFAULT '{}',       -- ['0','1','2']
  capacity     INT,
  operating_hours VARCHAR(100),
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order   INT NOT NULL DEFAULT 0,
  memo         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ,

  UNIQUE (tenant_id, code)
);

CREATE INDEX idx_warehouses_active ON warehouses (tenant_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_warehouses_name_trgm ON warehouses USING GIN (name gin_trgm_ops);
```

### 3.4 locations — 库位（层级结构）/ ロケーション（階層構造）

> MongoDB: `backend/src/models/location.ts`

```sql
CREATE TABLE locations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code             VARCHAR(100) NOT NULL,
  name             VARCHAR(200) NOT NULL,
  type             VARCHAR(30) NOT NULL
                   CHECK (type IN ('warehouse','zone','shelf','bin','staging','receiving','virtual/supplier','virtual/customer')),
  parent_id        UUID REFERENCES locations(id) ON DELETE SET NULL,  -- 层级: 自引用 / 階層: 自己参照
  warehouse_id     UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  full_path        TEXT NOT NULL DEFAULT '',
  cool_type        VARCHAR(5) CHECK (cool_type IN ('0','1','2')),
  stock_type       VARCHAR(5) CHECK (stock_type IN ('01','02','03','04','05','06')),
  temperature_type VARCHAR(5) CHECK (temperature_type IN ('01','02','03','04','05')),
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order       INT NOT NULL DEFAULT 0,
  memo             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,

  UNIQUE (tenant_id, code)
);

CREATE INDEX idx_locations_parent ON locations (parent_id);
CREATE INDEX idx_locations_warehouse ON locations (warehouse_id);
CREATE INDEX idx_locations_type ON locations (type);
CREATE INDEX idx_locations_active ON locations (tenant_id, is_active) WHERE deleted_at IS NULL;
```

### 3.5 products — 商品（宽表 + 分区注释）/ 商品（ワイドテーブル + セクションコメント）

> MongoDB: `backend/src/models/product.ts` (100+ フィールドのフラット構造)
> 宽表设计: 保持 MongoDB 的扁平结构，用注释分组
> ワイドテーブル設計: MongoDB のフラット構造を維持、コメントでグルーピング

```sql
CREATE TABLE products (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- =========================================================================
  -- [A] 归属关联 / 所属関連
  -- =========================================================================
  client_id      UUID,                          -- FK → clients (延迟创建 / 遅延作成)
  sub_client_id  UUID,                          -- FK → sub_clients
  shop_id        UUID,                          -- FK → shops

  -- =========================================================================
  -- [B] 基本信息 / 基本情報
  -- =========================================================================
  sku              VARCHAR(200) NOT NULL,
  name             VARCHAR(500) NOT NULL,
  name_full        VARCHAR(1000),
  barcode          TEXT[] DEFAULT '{}',              -- GIN 索引 / GINインデックス
  cool_type        VARCHAR(5) CHECK (cool_type IN ('0','1','2')),
  mail_calc_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
  mail_calc_max_quantity INT CHECK (mail_calc_max_quantity > 0),
  memo             TEXT,
  price            NUMERIC(12,2),
  handling_types   TEXT[] DEFAULT '{}',
  image_url        TEXT,
  sub_skus         JSONB DEFAULT '[]',               -- [{subSku, price, description, isActive}]
  category         VARCHAR(100) DEFAULT '0',
  cost_price       NUMERIC(12,2) CHECK (cost_price >= 0),
  custom_field1    VARCHAR(500),
  custom_field2    VARCHAR(500),
  custom_field3    VARCHAR(500),
  custom_field4    VARCHAR(500),
  name_en          VARCHAR(500),
  country_of_origin VARCHAR(100),
  allocation_rule  VARCHAR(10) DEFAULT 'FIFO' CHECK (allocation_rule IN ('FIFO','FEFO','LIFO')),
  serial_tracking_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  inbound_expiry_days INT CHECK (inbound_expiry_days > 0),
  _all_sku         TEXT[] DEFAULT '{}',               -- 内部字段: sku + 全子SKU / 内部: sku + 全子SKU

  -- =========================================================================
  -- [C] 库存管理设置 / 在庫管理設定
  -- =========================================================================
  inventory_enabled       BOOLEAN NOT NULL DEFAULT FALSE,
  lot_tracking_enabled    BOOLEAN NOT NULL DEFAULT FALSE,
  expiry_tracking_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  alert_days_before_expiry INT NOT NULL DEFAULT 30,
  default_location_id     UUID REFERENCES locations(id) ON DELETE SET NULL,
  safety_stock            INT NOT NULL DEFAULT 0,
  jan_code                VARCHAR(50),
  default_handling_tags   TEXT[] DEFAULT '{}',
  supplier_code           VARCHAR(100),

  -- =========================================================================
  -- [D] 尺寸/重量 / 寸法・重量
  -- =========================================================================
  width            NUMERIC(10,2),
  depth            NUMERIC(10,2),
  height           NUMERIC(10,2),
  weight           NUMERIC(10,4),
  outer_box_width  NUMERIC(10,2) CHECK (outer_box_width >= 0),
  outer_box_depth  NUMERIC(10,2) CHECK (outer_box_depth >= 0),
  outer_box_height NUMERIC(10,2) CHECK (outer_box_height >= 0),
  outer_box_volume NUMERIC(12,4) CHECK (outer_box_volume >= 0),
  outer_box_weight NUMERIC(10,4) CHECK (outer_box_weight >= 0),
  gross_weight     NUMERIC(10,4) CHECK (gross_weight >= 0),
  volume           NUMERIC(12,6) CHECK (volume >= 0),

  -- =========================================================================
  -- [E] 包装/配送 / 梱包・配送
  -- =========================================================================
  case_quantity       INT CHECK (case_quantity >= 1),
  shipping_size_code  VARCHAR(20),
  unit_type           VARCHAR(5) CHECK (unit_type IN ('01','02','03','04','05')),

  -- =========================================================================
  -- [F] Amazon FBA 相关 / Amazon FBA 関連
  -- =========================================================================
  fnsku        VARCHAR(100),
  asin         VARCHAR(100),
  amazon_sku   VARCHAR(200),
  fba_enabled  BOOLEAN NOT NULL DEFAULT FALSE,

  -- =========================================================================
  -- [G] 乐天RSL 相关 / 楽天RSL 関連
  -- =========================================================================
  rakuten_sku  VARCHAR(200),
  rsl_enabled  BOOLEAN NOT NULL DEFAULT FALSE,

  -- =========================================================================
  -- [H] LOGIFAST 专属 / LOGIFAST 固有
  -- =========================================================================
  customer_product_code VARCHAR(200),
  brand_code            VARCHAR(100),
  brand_name            VARCHAR(200),
  size_name             VARCHAR(100),
  color_name            VARCHAR(100),
  tax_type              VARCHAR(5) CHECK (tax_type IN ('01','02')),
  tax_rate              NUMERIC(5,2) CHECK (tax_rate >= 0),
  hazardous_type        VARCHAR(5) DEFAULT '0' CHECK (hazardous_type IN ('0','1')),
  air_transport_ban     BOOLEAN NOT NULL DEFAULT FALSE,
  barcode_commission    BOOLEAN NOT NULL DEFAULT FALSE,
  reservation_target    BOOLEAN NOT NULL DEFAULT FALSE,
  currency              VARCHAR(5) CHECK (currency IN ('1','2','3')),
  supplier_name         VARCHAR(200),
  paid_type             VARCHAR(5) DEFAULT '0' CHECK (paid_type IN ('0','1')),

  -- =========================================================================
  -- [I] 销售渠道 / 販売チャネル
  -- =========================================================================
  marketplace_codes       JSONB DEFAULT '{}',   -- {rakuten: 'ABC', amazon: 'DEF'}
  wholesale_partner_codes JSONB DEFAULT '{}',   -- {joshin: 'X123', biccamera: 'Y456'}

  -- =========================================================================
  -- [J] 仓库侧备注 / 倉庫側メモ
  -- =========================================================================
  warehouse_notes JSONB,  -- {preferredLocation, handlingNotes, isFragile, isLiquid, ...}

  -- =========================================================================
  -- [K] 其他 / その他
  -- =========================================================================
  remarks        TEXT[] DEFAULT '{}',
  custom_fields  JSONB DEFAULT '{}',

  -- =========================================================================
  -- [Z] 时间戳 / タイムスタンプ
  -- =========================================================================
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ,

  UNIQUE (tenant_id, sku)
);

-- 索引 / インデックス
CREATE INDEX idx_products_all_sku ON products USING GIN (_all_sku) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_client ON products (tenant_id, client_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_shop ON products (tenant_id, shop_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_shop_sku ON products (tenant_id, shop_id, sku) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_customer_product_code ON products (tenant_id, customer_product_code) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_brand_code ON products (tenant_id, brand_code) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_barcode ON products USING GIN (barcode);
CREATE INDEX idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);
CREATE INDEX idx_products_custom_fields ON products USING GIN (custom_fields jsonb_path_ops);
CREATE INDEX idx_products_marketplace_codes ON products USING GIN (marketplace_codes jsonb_path_ops);
```

### 3.6 stock_quants — 库存量 / 在庫数量

> MongoDB: `backend/src/models/stockQuant.ts`
> 核心约束: product_id + location_id + lot_id 唯一（COALESCE处理NULL）
> コア制約: product_id + location_id + lot_id がユニーク（NULL 処理に COALESCE 使用）

```sql
CREATE TABLE stock_quants (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id       UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_sku      VARCHAR(200) NOT NULL,       -- 冗余字段加速查询 / 冗長フィールド（検索高速化）
  location_id      UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  lot_id           UUID,                        -- FK → lots (延迟创建 / 遅延作成)
  quantity         INT NOT NULL DEFAULT 0,
  reserved_quantity INT NOT NULL DEFAULT 0,
  last_moved_at    TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);

-- 使用 COALESCE 处理 NULL lot_id 的唯一约束 / NULL lot_id のユニーク制約
CREATE UNIQUE INDEX idx_stock_quants_unique
  ON stock_quants (product_id, location_id, COALESCE(lot_id, '00000000-0000-0000-0000-000000000000'));

CREATE INDEX idx_stock_quants_product ON stock_quants (product_id);
CREATE INDEX idx_stock_quants_location ON stock_quants (location_id);
CREATE INDEX idx_stock_quants_lot ON stock_quants (lot_id);
CREATE INDEX idx_stock_quants_sku ON stock_quants (product_sku);
CREATE INDEX idx_stock_quants_available ON stock_quants (product_id, quantity, reserved_quantity)
  WHERE quantity > 0;
CREATE INDEX idx_stock_quants_tenant ON stock_quants (tenant_id, product_id, location_id);
```

### 3.7 stock_moves — 库存移动（追加型台账）/ 在庫移動（追記型台帳）

> MongoDB: `backend/src/models/stockMove.ts`

```sql
CREATE TABLE stock_moves (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  move_number     VARCHAR(50) NOT NULL UNIQUE,
  move_type       VARCHAR(20) NOT NULL
                  CHECK (move_type IN ('inbound','outbound','transfer','adjustment','return','stocktaking')),
  state           VARCHAR(20) NOT NULL DEFAULT 'draft'
                  CHECK (state IN ('draft','confirmed','done','cancelled')),
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_sku     VARCHAR(200) NOT NULL,
  product_name    VARCHAR(500),
  lot_id          UUID,
  lot_number      VARCHAR(100),
  from_location_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  to_location_id   UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  quantity        INT NOT NULL CHECK (quantity >= 0),
  reference_type  VARCHAR(30)
                  CHECK (reference_type IN ('inbound-order','shipment-order','adjustment','manual','stocktaking-order','return-order')),
  reference_id    VARCHAR(100),
  reference_number VARCHAR(100),
  scheduled_date  TIMESTAMPTZ,
  executed_at     TIMESTAMPTZ,
  executed_by     VARCHAR(200),
  memo            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_stock_moves_type_state ON stock_moves (move_type, state);
CREATE INDEX idx_stock_moves_product ON stock_moves (product_id, state);
CREATE INDEX idx_stock_moves_ref ON stock_moves (reference_type, reference_id);
CREATE INDEX idx_stock_moves_ref_state ON stock_moves (reference_id, state);
CREATE INDEX idx_stock_moves_tenant_time ON stock_moves (tenant_id, created_at DESC);
CREATE INDEX idx_stock_moves_executed ON stock_moves (executed_at DESC);
```

### 3.8 inbound_orders — 入库单 / 入庫指示

> MongoDB: `backend/src/models/inboundOrder.ts`

```sql
CREATE TABLE inbound_orders (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_number          VARCHAR(50) NOT NULL UNIQUE,
  status                VARCHAR(20) NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','confirmed','arrived','processing','awaiting_label',
                               'ready_to_ship','shipped','receiving','received','done','cancelled')),
  destination_location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  -- 供应商（内联）/ サプライヤー（インライン）
  supplier_name         VARCHAR(200),
  supplier_code         VARCHAR(100),
  supplier_memo         TEXT,
  supplier_phone        VARCHAR(50),
  supplier_postal_code  VARCHAR(20),
  supplier_address      TEXT,
  -- 日期 / 日付
  expected_date         TIMESTAMPTZ,
  requested_date        TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  memo                  TEXT,
  created_by            VARCHAR(200),
  purchase_order_number VARCHAR(100),
  purchase_order_date   TIMESTAMPTZ,
  -- LOGIFAST
  container_type        VARCHAR(10) CHECK (container_type IN ('20ft','40ft','40ftH')),
  cubic_meters          NUMERIC(10,4) CHECK (cubic_meters >= 0),
  pallet_count          INT CHECK (pallet_count >= 0),
  inner_box_count       INT CHECK (inner_box_count >= 0),
  import_batch_number   VARCHAR(100),
  import_batch_date     TIMESTAMPTZ,
  -- 流程类型 / フロータイプ
  flow_type             VARCHAR(20) DEFAULT 'standard'
                        CHECK (flow_type IN ('standard','crossdock','passthrough')),
  linked_order_ids      TEXT[],
  -- 客户关联 / 顧客関連
  client_id             UUID,
  client_name           VARCHAR(200),
  sub_client_id         UUID,
  sub_client_name       VARCHAR(200),
  shop_id               UUID,
  shop_name             VARCHAR(200),
  -- 通过型扩展 / 通過型拡張
  destination_type      VARCHAR(10) CHECK (destination_type IN ('fba','rsl','b2b')),
  service_options       JSONB DEFAULT '[]',
  fba_info              JSONB,
  rsl_info              JSONB,
  b2b_info              JSONB,
  shipping_method       VARCHAR(20) CHECK (shipping_method IN ('truck','parcel')),
  tracking_numbers      JSONB DEFAULT '[]',
  variance_report       JSONB,
  -- 到货信息 / 到着情報
  actual_arrival_date   TIMESTAMPTZ,
  total_box_count       INT CHECK (total_box_count >= 0),
  actual_box_count      INT CHECK (actual_box_count >= 0),
  total_weight          NUMERIC(10,2) CHECK (total_weight >= 0),
  received_by           VARCHAR(200),
  arrived_at            TIMESTAMPTZ,
  shipped_at            TIMESTAMPTZ,
  custom_fields         JSONB DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ
);

CREATE INDEX idx_inbound_orders_tenant_status ON inbound_orders (tenant_id, status);
CREATE INDEX idx_inbound_orders_flow ON inbound_orders (tenant_id, flow_type, status);
CREATE INDEX idx_inbound_orders_client ON inbound_orders (tenant_id, client_id, created_at DESC);
```

### 3.9 inbound_order_lines — 入库单明细 / 入庫指示明細

> MongoDB: inboundOrder.lines[] 内包 → 正規化して独立テーブル

```sql
CREATE TABLE inbound_order_lines (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  inbound_order_id      UUID NOT NULL REFERENCES inbound_orders(id) ON DELETE CASCADE,
  line_number           INT NOT NULL,
  product_id            UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_sku           VARCHAR(200) NOT NULL,
  product_name          VARCHAR(500),
  expected_quantity     INT NOT NULL CHECK (expected_quantity >= 1),
  received_quantity     INT NOT NULL DEFAULT 0 CHECK (received_quantity >= 0),
  lot_id                UUID,
  lot_number            VARCHAR(100),
  expiry_date           TIMESTAMPTZ,
  location_id           UUID REFERENCES locations(id) ON DELETE SET NULL,
  stock_move_ids        UUID[] DEFAULT '{}',
  putaway_location_id   UUID REFERENCES locations(id) ON DELETE SET NULL,
  putaway_quantity      INT NOT NULL DEFAULT 0 CHECK (putaway_quantity >= 0),
  stock_category        VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (stock_category IN ('new','damaged')),
  order_reference_number VARCHAR(100),
  memo                  TEXT,
  -- LOGIFAST
  expected_case_count   INT CHECK (expected_case_count >= 0),
  received_case_count   INT CHECK (received_case_count >= 0),
  case_unit_type        VARCHAR(5) CHECK (case_unit_type IN ('01','02','03','04','05')),
  case_unit_quantity    INT CHECK (case_unit_quantity >= 1),
  customer_product_code VARCHAR(200),
  inspection_code       VARCHAR(100),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (inbound_order_id, line_number)
);

CREATE INDEX idx_inbound_lines_order ON inbound_order_lines (inbound_order_id);
CREATE INDEX idx_inbound_lines_product ON inbound_order_lines (product_id);
```

### 3.10 shipment_orders — 出货单 / 出荷指示

> MongoDB: `backend/src/models/shipmentOrder.ts`

```sql
CREATE TABLE shipment_orders (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  destination_type       VARCHAR(10) DEFAULT 'B2C' CHECK (destination_type IN ('B2C','B2B','FBA','RSL')),
  fba_shipment_id        VARCHAR(100),
  fba_destination        VARCHAR(50),
  -- 状态（拆分为独立布尔字段）/ ステータス（独立ブーリアンフィールドに分割）
  status_carrier_received   BOOLEAN NOT NULL DEFAULT FALSE,
  status_carrier_received_at TIMESTAMPTZ,
  status_confirmed       BOOLEAN NOT NULL DEFAULT FALSE,
  status_confirmed_at    TIMESTAMPTZ,
  status_printed         BOOLEAN NOT NULL DEFAULT FALSE,
  status_printed_at      TIMESTAMPTZ,
  status_inspected       BOOLEAN NOT NULL DEFAULT FALSE,
  status_inspected_at    TIMESTAMPTZ,
  status_shipped         BOOLEAN NOT NULL DEFAULT FALSE,
  status_shipped_at      TIMESTAMPTZ,
  status_ec_exported     BOOLEAN NOT NULL DEFAULT FALSE,
  status_ec_exported_at  TIMESTAMPTZ,
  status_held            BOOLEAN NOT NULL DEFAULT FALSE,
  status_held_at         TIMESTAMPTZ,
  -- 订单信息 / 注文情報
  order_number           VARCHAR(100) NOT NULL UNIQUE,
  source_order_at        TIMESTAMPTZ,
  carrier_id             VARCHAR(100) NOT NULL,
  customer_management_number VARCHAR(200) NOT NULL,
  tracking_id            VARCHAR(100),
  -- 注文者（全字段可选）/ 注文者
  orderer_postal_code    VARCHAR(20),
  orderer_prefecture     VARCHAR(50),
  orderer_city           VARCHAR(100),
  orderer_street         TEXT,
  orderer_building       TEXT,
  orderer_name           VARCHAR(200),
  orderer_phone          VARCHAR(50),
  -- 收件人 / 送付先
  recipient_postal_code  VARCHAR(20) NOT NULL,
  recipient_prefecture   VARCHAR(50) NOT NULL,
  recipient_city         VARCHAR(100) NOT NULL,
  recipient_street       TEXT NOT NULL,
  recipient_building     TEXT,
  recipient_name         VARCHAR(200) NOT NULL,
  recipient_phone        VARCHAR(50) NOT NULL,
  honorific              VARCHAR(20) DEFAULT '様',
  -- 配送 / 配送希望
  ship_plan_date         VARCHAR(20) NOT NULL,
  invoice_type           VARCHAR(10) NOT NULL,
  cool_type              VARCHAR(5),
  delivery_time_slot     VARCHAR(20),
  delivery_date_preference VARCHAR(20),
  order_source_company_id VARCHAR(100),
  carrier_data           JSONB,
  -- 发件人 / 依頼主住所
  sender_postal_code     VARCHAR(20) NOT NULL,
  sender_prefecture      VARCHAR(50) NOT NULL,
  sender_city            VARCHAR(100) NOT NULL,
  sender_street          TEXT NOT NULL,
  sender_building        TEXT,
  sender_name            VARCHAR(200) NOT NULL,
  sender_phone           VARCHAR(50) NOT NULL,
  -- 其他 / その他
  handling_tags          TEXT[] DEFAULT '{}',
  source_raw_rows        JSONB,
  carrier_raw_row        JSONB,
  internal_record        JSONB DEFAULT '[]',
  order_group_id         VARCHAR(100),
  custom_fields          JSONB DEFAULT '{}',
  -- 配送费用 / 配送料金
  shipping_cost          NUMERIC(12,2) CHECK (shipping_cost >= 0),
  shipping_cost_breakdown JSONB,
  cost_source            VARCHAR(20) CHECK (cost_source IN ('auto','manual','import')),
  cost_calculated_at     TIMESTAMPTZ,
  _products_meta         JSONB DEFAULT '{}',
  cost_summary           JSONB,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at             TIMESTAMPTZ
);

CREATE INDEX idx_shipment_orders_tenant_time ON shipment_orders (tenant_id, created_at DESC);
CREATE INDEX idx_shipment_orders_confirmed ON shipment_orders (tenant_id, status_confirmed, created_at DESC);
CREATE INDEX idx_shipment_orders_shipped ON shipment_orders (tenant_id, status_shipped, created_at DESC);
CREATE INDEX idx_shipment_orders_carrier ON shipment_orders (carrier_id, status_confirmed);
CREATE INDEX idx_shipment_orders_tracking ON shipment_orders (tracking_id) WHERE tracking_id IS NOT NULL;
CREATE INDEX idx_shipment_orders_group ON shipment_orders (order_group_id) WHERE order_group_id IS NOT NULL;
CREATE INDEX idx_shipment_orders_source_company ON shipment_orders (order_source_company_id);
CREATE INDEX idx_shipment_orders_recipient_postal ON shipment_orders (recipient_postal_code);
CREATE INDEX idx_shipment_orders_meta ON shipment_orders USING GIN (_products_meta jsonb_path_ops);
```

### 3.11 shipment_order_products — 出货单商品 / 出荷指示商品

> MongoDB: shipmentOrder.products[] → 正規化

```sql
CREATE TABLE shipment_order_products (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  shipment_order_id UUID NOT NULL REFERENCES shipment_orders(id) ON DELETE CASCADE,
  input_sku         VARCHAR(200) NOT NULL,
  quantity          INT NOT NULL CHECK (quantity >= 1),
  product_id        UUID,
  product_sku       VARCHAR(200),
  product_name      VARCHAR(500),
  matched_sub_sku   JSONB,
  image_url         TEXT,
  barcode           TEXT[],
  cool_type         VARCHAR(5),
  mail_calc_enabled BOOLEAN,
  mail_calc_max_quantity INT,
  unit_price        NUMERIC(12,2) CHECK (unit_price >= 0),
  subtotal          NUMERIC(12,2) CHECK (subtotal >= 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sop_shipment ON shipment_order_products (shipment_order_id);
CREATE INDEX idx_sop_product ON shipment_order_products (product_id);
```

### 3.12 shipment_order_materials — 出货单耗材 / 出荷指示耗材

> MongoDB: shipmentOrder.materials[] → 正規化

```sql
CREATE TABLE shipment_order_materials (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  shipment_order_id UUID NOT NULL REFERENCES shipment_orders(id) ON DELETE CASCADE,
  material_sku      VARCHAR(200) NOT NULL,
  material_name     VARCHAR(500),
  quantity          INT NOT NULL CHECK (quantity >= 1),
  unit_cost         NUMERIC(12,2) CHECK (unit_cost >= 0),
  total_cost        NUMERIC(12,2) CHECK (total_cost >= 0),
  auto              BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_som_shipment ON shipment_order_materials (shipment_order_id);
```

### 3.13 return_orders + return_order_lines — 退货单 / 返品指示

> MongoDB: `backend/src/models/returnOrder.ts` (lines[] → 正規化)

```sql
CREATE TABLE return_orders (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_number           VARCHAR(50) NOT NULL UNIQUE,
  status                 VARCHAR(20) NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft','inspecting','completed','cancelled')),
  shipment_order_id      UUID,
  shipment_order_number  VARCHAR(100),
  return_reason          VARCHAR(30) NOT NULL
                         CHECK (return_reason IN ('customer_request','defective','wrong_item','damaged','other')),
  reason_detail          TEXT,
  customer_name          VARCHAR(200),
  received_date          TIMESTAMPTZ NOT NULL,
  completed_at           TIMESTAMPTZ,
  memo                   TEXT,
  created_by             VARCHAR(200),
  rma_number             VARCHAR(100),
  return_tracking_id     VARCHAR(100),
  customer_order_number  VARCHAR(100),
  custom_fields          JSONB DEFAULT '{}',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at             TIMESTAMPTZ
);

CREATE TABLE return_order_lines (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  return_order_id   UUID NOT NULL REFERENCES return_orders(id) ON DELETE CASCADE,
  line_number       INT NOT NULL,
  product_id        UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_sku       VARCHAR(200) NOT NULL,
  product_name      VARCHAR(500),
  quantity          INT NOT NULL CHECK (quantity >= 1),
  inspected_quantity INT NOT NULL DEFAULT 0,
  disposition       VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (disposition IN ('restock','dispose','repair','pending')),
  restocked_quantity INT NOT NULL DEFAULT 0,
  disposed_quantity  INT NOT NULL DEFAULT 0,
  location_id       UUID REFERENCES locations(id) ON DELETE SET NULL,
  lot_id            UUID,
  lot_number        VARCHAR(100),
  memo              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (return_order_id, line_number)
);

CREATE INDEX idx_return_orders_tenant_time ON return_orders (tenant_id, created_at DESC);
CREATE INDEX idx_return_lines_order ON return_order_lines (return_order_id);
CREATE INDEX idx_return_lines_product ON return_order_lines (product_id);
```

### 3.14 carriers — 配送业者 / 配送業者

> MongoDB: `backend/src/models/carrier.ts`

```sql
CREATE TABLE carriers (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code                   VARCHAR(100) NOT NULL,
  name                   VARCHAR(200) NOT NULL,
  description            TEXT,
  enabled                BOOLEAN NOT NULL DEFAULT TRUE,
  tracking_id_column_name VARCHAR(200),
  format_definition      JSONB NOT NULL DEFAULT '{"columns":[]}',
  is_built_in            BOOLEAN NOT NULL DEFAULT FALSE,
  automation_type        VARCHAR(20) CHECK (automation_type IN ('yamato-b2','sagawa-api','seino-api')),
  services               JSONB,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at             TIMESTAMPTZ,
  UNIQUE (tenant_id, code)
);

CREATE INDEX idx_carriers_enabled ON carriers (tenant_id, enabled) WHERE deleted_at IS NULL;
```

---

## 4. 业务表 (Priority 2) / ビジネステーブル

> 以下使用紧凑格式: 表名、主要列、约束、索引
> 以下コンパクトフォーマット: テーブル名、主要カラム、制約、インデックス

### 4.1 lots — 批次 / ロット

> MongoDB: `backend/src/models/lot.ts`

| Column | Type | Constraints |
|---|---|---|
| id | UUID PK | |
| tenant_id | UUID NOT NULL | FK → tenants |
| lot_number | VARCHAR(100) NOT NULL | |
| product_id | UUID NOT NULL | FK → products |
| product_sku | VARCHAR(200) NOT NULL | |
| product_name | VARCHAR(500) | |
| expiry_date | TIMESTAMPTZ | |
| manufacture_date | TIMESTAMPTZ | |
| status | VARCHAR(20) NOT NULL DEFAULT 'active' | CHECK IN ('active','expired','recalled','quarantine') |
| supplier_lot_number | VARCHAR(200) | |
| inbound_date | TIMESTAMPTZ | |
| inbound_order_number | VARCHAR(100) | |
| memo | TEXT | |

**UNIQUE**: (product_id, lot_number) / **索引**: (product_id), (status), (expiry_date), (product_sku)

### 4.2 serial_numbers — 序列号 / シリアル番号

> MongoDB: `backend/src/models/serialNumber.ts`

| Column | Type | Constraints |
|---|---|---|
| id | UUID PK | |
| tenant_id | UUID NOT NULL | FK → tenants |
| serial_number | VARCHAR(200) NOT NULL | |
| product_id | UUID NOT NULL | FK → products |
| product_sku, product_name | VARCHAR | |
| client_id, warehouse_id, location_id, lot_id | UUID | FK refs |
| location_code, lot_number | VARCHAR | |
| status | VARCHAR(20) NOT NULL DEFAULT 'available' | CHECK IN ('available','reserved','shipped','returned','damaged','scrapped') |
| received_at, shipped_at | TIMESTAMPTZ | |
| inbound_order_id, shipment_id | VARCHAR(100) | |

**UNIQUE**: (product_id, serial_number)

### 4.3 inventory_reservations — 库存预留 / 在庫引当

> MongoDB: `backend/src/models/inventoryReservation.ts`

| Column | Type | Constraints |
|---|---|---|
| id | UUID PK | |
| tenant_id | UUID NOT NULL | FK → tenants |
| product_id | UUID NOT NULL | FK → products |
| product_sku | VARCHAR(200) NOT NULL | |
| client_id, warehouse_id, location_id, lot_id, serial_id | UUID | |
| quantity | INT NOT NULL CHECK >= 1 | |
| status | VARCHAR(20) NOT NULL DEFAULT 'active' | CHECK IN ('active','fulfilled','released','expired') |
| source | VARCHAR(20) NOT NULL | CHECK IN ('order','shipment','transfer','manual') |
| reference_id | VARCHAR(100) NOT NULL | |
| reference_number | VARCHAR(100) | |
| reserved_at, fulfilled_at, released_at, expires_at | TIMESTAMPTZ | |

**索引**: (product_id, warehouse_id, status), (reference_id, source), (expires_at, status)

### 4.4 inventory_ledger — 库存台账（追加型）/ 在庫台帳（追記型）

> MongoDB: `backend/src/models/inventoryLedger.ts`

| Column | Type | Constraints |
|---|---|---|
| id | UUID PK | |
| tenant_id | UUID NOT NULL | FK → tenants |
| client_id, product_id (NOT NULL), warehouse_id, location_id, lot_id | UUID | |
| product_sku | VARCHAR(200) NOT NULL | |
| lot_number | VARCHAR(100) | |
| type | VARCHAR(20) NOT NULL | CHECK IN ('inbound','outbound','reserve','release','adjustment','count') |
| quantity | INT NOT NULL | (正=增, 负=减) |
| reference_type | VARCHAR(30) | |
| reference_id, reference_number, reason, executed_by | VARCHAR | |
| executed_at | TIMESTAMPTZ | |

**索引**: (product_id, warehouse_id, client_id), (tenant_id, created_at DESC)

### 4.5 clients — 荷主 / 荷主

> MongoDB: `backend/src/models/client.ts`

| Column | Type | Constraints |
|---|---|---|
| id | UUID PK | |
| tenant_id | UUID NOT NULL | FK → tenants |
| client_code | VARCHAR(100) NOT NULL | UNIQUE(tenant_id, client_code) |
| name, name2 | VARCHAR(200) | |
| client_type | VARCHAR(30) | CHECK IN ('logistics_company','domestic_company','individual_seller') |
| contact_name, postal_code, prefecture, city, address, address2, phone, email | VARCHAR | |
| plan | VARCHAR(20) | |
| billing_enabled | BOOLEAN DEFAULT FALSE | |
| credit_tier | VARCHAR(20) DEFAULT 'new' | |
| credit_limit | NUMERIC(14,2) DEFAULT 100000 | |
| current_balance | NUMERIC(14,2) DEFAULT 0 | |
| payment_term_days | INT DEFAULT 30 | |
| portal_enabled | BOOLEAN DEFAULT FALSE | |
| portal_language | VARCHAR(5) DEFAULT 'ja' | |
| is_active | BOOLEAN DEFAULT TRUE | |

### 4.6 sub_clients — 子客户 / 子顧客

> MongoDB: `backend/src/models/subClient.ts`

| Column | Type | Constraints |
|---|---|---|
| tenant_id, client_id (NOT NULL) | UUID | FK refs |
| sub_client_code | VARCHAR(100) NOT NULL | UNIQUE(tenant_id, sub_client_code) |
| name, name2, sub_client_type, contact_person, phone, email | VARCHAR | |
| portal_enabled | BOOLEAN | portal_user_id UUID |
| is_active | BOOLEAN DEFAULT TRUE | |

### 4.7 shops — 店铺 / 店舗

> MongoDB: `backend/src/models/shop.ts`

| Column | Type | Constraints |
|---|---|---|
| tenant_id, client_id (NOT NULL), sub_client_id | UUID | FK refs |
| shop_code | VARCHAR(100) NOT NULL | UNIQUE(tenant_id, shop_code) |
| shop_name | VARCHAR(200) NOT NULL | |
| platform | VARCHAR(30) NOT NULL | CHECK IN ('amazon_jp','rakuten','yahoo_shopping','shopify','b2b','other') |
| platform_account_id, platform_store_name | VARCHAR(200) | |

### 4.8 customers — 得意先 / 得意先

> MongoDB: `backend/src/models/customer.ts`

customer_code UNIQUE, name, name2, postal_code, prefecture, city, address, address2, phone, email, is_active, memo

### 4.9 suppliers — 仕入先 / 仕入先

> MongoDB: `backend/src/models/supplier.ts`

supplier_code UNIQUE, name, name2, postal_code, address1-3, prefecture, city, street, building, phone, email, contact_person, lead_time INT, minimum_order INT, is_active

### 4.10 order_source_companies — 依赖主 / 依頼主

> MongoDB: `backend/src/models/orderSourceCompany.ts`

sender_name NOT NULL, sender_postal_code VARCHAR(7), sender_address_prefecture/city/street, sender_phone, hatsu_base_no1 VARCHAR(3), hatsu_base_no2 VARCHAR(3)

### 4.11 billing_records — 请求明细 / 請求明細

> MongoDB: `backend/src/models/billingRecord.ts`

period VARCHAR(7) CHECK `^\d{4}-\d{2}$`, client_id, carrier_id, order_count, total_quantity, total_shipping_cost, handling_fee, storage_fee, other_fees, total_amount NUMERIC(14,2), status CHECK IN ('draft','confirmed','invoiced','paid')

**UNIQUE**: (tenant_id, period, client_id, carrier_id)

### 4.12 invoices — 发票 / 請求書

> MongoDB: `backend/src/models/invoice.ts`

invoice_number UNIQUE, billing_record_id, client_id, period, issue_date, due_date, subtotal, tax_rate, tax_amount, total_amount, line_items JSONB, status CHECK IN ('draft','issued','sent','paid','overdue','cancelled')

### 4.13 work_charges — 作业费用 / 作業チャージ

> MongoDB: `backend/src/models/workCharge.ts`

client_id, sub_client_id, shop_id (+ name 缓存), charge_type VARCHAR(30), charge_date, reference_type, reference_id, quantity, unit_price, amount NUMERIC(12,2), description TEXT, billing_period, is_billed BOOLEAN

**索引**: (tenant_id, charge_date DESC), (tenant_id, client_id, is_billed)

### 4.14 service_rates — 服务费率 / サービス料金マスタ

> MongoDB: `backend/src/models/serviceRate.ts`

client_id, charge_type, name, unit VARCHAR(30), unit_price NUMERIC(12,2), conditions JSONB, is_active, valid_from, valid_to

### 4.15 shipping_rates — 运费率 / 運賃レート

> MongoDB: `backend/src/models/shippingRate.ts`

carrier_id, name, size_type CHECK IN ('weight','dimension','flat'), size_min, size_max, from_prefectures TEXT[], to_prefectures TEXT[], base_price, cool_surcharge, cod_surcharge, fuel_surcharge, valid_from, valid_to, is_active

### 4.16 price_catalogs — 价格目录 / 価格カタログ

> MongoDB: `backend/src/models/priceCatalog.ts`

catalog_name, description, target_client_type, items JSONB, is_default, is_active

### 4.17 waves — 波次 / 波次

> MongoDB: `backend/src/models/wave.ts`

wave_number UNIQUE, warehouse_id FK, client_id FK, status, priority, shipment_ids UUID[], shipment_count, total_items, total_quantity, assigned_to, started_at, completed_at

### 4.18 pick_tasks — 拣货任务

> MongoDB: `backend/src/models/pickTask.ts`

task_number UNIQUE, wave_id FK, warehouse_id FK, picker_id, status, total_items, picked_items, total_quantity, picked_quantity

### 4.19 pick_items — 拣货明细

> MongoDB: `backend/src/models/pickItem.ts`

pick_task_id FK, shipment_id FK, product_id FK, location_id FK, lot_id, required_quantity, picked_quantity, status CHECK IN ('pending','picked','short','skipped')

### 4.20 packing_tasks — 梱包任务

> MongoDB: `backend/src/models/packingTask.ts`

task_number UNIQUE, wave_id, shipment_id FK, warehouse_id FK, packer_id, status, packing_station_id, total_items, packed_items, box_count, total_weight, tracking_number, label_printed BOOLEAN

### 4.21 packing_rules — 梱包规则

> MongoDB: `backend/src/models/packingRule.ts`

name, priority INT, is_active, conditions JSONB, materials JSONB

### 4.22 labeling_tasks — 贴标任务

> MongoDB: `backend/src/models/labelingTask.ts`

task_number UNIQUE, inbound_order_id, product_id, sku, fnsku, label_types TEXT[], required_quantity, completed_quantity, status, labeled_by, verified_by, verification_result, failed_quantity, failure_reason

### 4.23 sorting_tasks — 分拣任务

> MongoDB: `backend/src/models/sortingTask.ts`

task_number UNIQUE, wave_id FK, shipment_id FK, warehouse_id FK, sorter_id, status, sorting_slot, total_items, sorted_items

### 4.24 warehouse_tasks — 仓库任务

> MongoDB: `backend/src/models/warehouseTask.ts`

task_number UNIQUE, type CHECK IN (8 types), status CHECK IN (6 states), priority, warehouse_id FK, client_id, assigned_to, product_id, from/to_location_id, lot_id, required_quantity, completed_quantity, reference_type/id, wave_id, shipment_id, instructions, duration_ms

### 4.25 wms_tasks — WMS 批量任务

> MongoDB: `backend/src/models/wmsTask.ts`

task_number UNIQUE, schedule_id FK, action, status, processed_count, success_count, error_count, errors TEXT[], duration_ms, triggered_by, user_name

### 4.26 replenishment_tasks — 补货任务

> MongoDB: `backend/src/models/replenishmentTask.ts`

task_number UNIQUE, warehouse_id FK, product_id FK, from/to_location_id FK, quantity CHECK >= 1, status, trigger CHECK IN ('auto','manual','wave'), wave_id

### 4.27 stocktaking_orders — 盘点单

> MongoDB: `backend/src/models/stocktakingOrder.ts`

order_number UNIQUE, type CHECK IN ('full','cycle','spot'), status, target_locations UUID[], target_products UUID[], lines JSONB, scheduled_date, created_by

### 4.28 cycle_count_plans — 循环盘点计划

> MongoDB: `backend/src/models/cycleCountPlan.ts`

plan_number UNIQUE, plan_type, warehouse_id, period VARCHAR(7), target_sku_count, total_sku_count, coverage_rate, items JSONB, status, total_variance_rate, alert_triggered

### 4.29 inspection_records — 检品记录

> MongoDB: `backend/src/models/inspectionRecord.ts`

record_number UNIQUE, inbound_order_id FK, product_id, inspection_mode, sampling_rate, checks JSONB, expected/inspected/passed/failed_quantity, exceptions JSONB, inspected_by, photos TEXT[]

### 4.30 daily_reports — 日报

> MongoDB: `backend/src/models/dailyReport.ts`

date VARCHAR(10), status, summary JSONB. **UNIQUE**: (tenant_id, date)

### 4.31 exception_reports — 异常报告

> MongoDB: `backend/src/models/exceptionReport.ts`

report_number UNIQUE(tenant_id, report_number), reference_type, client_id FK, level CHECK IN ('A','B','C'), category, description TEXT NOT NULL, photos TEXT[], status, sla_deadline, sla_breached

### 4.32 materials — 耗材

> MongoDB: `backend/src/models/material.ts`

sku UNIQUE(tenant_id, sku), name, category CHECK IN ('box','cushioning','tape','label','bag','other'), unit_cost, inventory_enabled, current_stock, safety_stock, width_mm, depth_mm, height_mm, supplier_code, case_quantity, lead_time

### 4.33 roles — 角色

> MongoDB: `backend/src/models/role.ts`

code UNIQUE(tenant_id, code), name, permissions TEXT[], is_system, scope CHECK IN ('platform','warehouse','client'), warehouse_id

### 4.34 inventory_categories — 库存类别

> MongoDB: `backend/src/models/inventoryCategory.ts`

code UNIQUE, name, is_default, is_active, sort_order, color_label

---

## 5. 扩展表 (Priority 3) / 拡張テーブル

### 5.1 plugins — 插件 / プラグイン

> MongoDB: `backend/src/models/plugin.ts`

name UNIQUE, version, description, author, status CHECK IN ('installed','enabled','disabled','error'), hooks TEXT[], permissions TEXT[], installed_at, enabled_at, error_message

### 5.2 plugin_configs — 插件配置

> MongoDB: `backend/src/models/pluginConfig.ts`

plugin_name, tenant_id. **UNIQUE**: (plugin_name, tenant_id). config JSONB

### 5.3 webhooks — Webhook 配置

> MongoDB: `backend/src/models/webhook.ts`

tenant_id, event, name, url TEXT, secret TEXT, enabled, retry INT (0-10), headers JSONB, description

### 5.4 webhook_logs — Webhook 日志 (30天TTL)

> MongoDB: `backend/src/models/webhookLog.ts`

webhook_id FK, event, payload JSONB, status, status_code, response_body TEXT, attempt, error, duration

### 5.5 automation_scripts — 自动化脚本

> MongoDB: `backend/src/models/automationScript.ts`

tenant_id, name, event, code TEXT, enabled, timeout INT (100-30000)

### 5.6 script_execution_logs — 脚本执行日志 (30天TTL)

> MongoDB: `backend/src/models/scriptExecutionLog.ts`

script_id FK, script_name, event, status, error, input JSONB, output JSONB, duration

### 5.7 auto_processing_rules — 自动处理规则

> MongoDB: `backend/src/models/autoProcessingRule.ts`

name, enabled, trigger_mode CHECK IN ('auto','manual'), allow_rerun, trigger_events TEXT[], conditions JSONB, actions JSONB, priority

### 5.8 auto_processing_logs — 自动处理日志

> MongoDB: `backend/src/models/autoProcessingLog.ts`

order_id FK, order_system_id, rule_id FK, rule_name, event, actions_executed JSONB, success, error, executed_at. **索引**: (order_id, rule_id)

### 5.9 rule_definitions — 规则定义

> MongoDB: `backend/src/models/ruleDefinition.ts`

name, module CHECK IN (8 types), warehouse_id, client_id, priority, condition_groups JSONB, actions JSONB, stop_on_match, is_active, valid_from, valid_to, execution_count, last_executed_at

### 5.10 slotting_rules — 库位分配规则

> MongoDB: `backend/src/models/slottingRule.ts`

name, warehouse_id FK, criterion, priority, zone_preference, conditions JSONB, sort_order, is_active

### 5.11 custom_field_definitions — 自定义字段定义

> MongoDB: `backend/src/models/customFieldDefinition.ts`

entity_type, field_key CHECK regex, label, field_type, required, default_value JSONB, options TEXT[], sort_order, enabled. **UNIQUE**: (tenant_id, entity_type, field_key)

### 5.12 feature_flags — 功能开关 (无 tenant_id)

> MongoDB: `backend/src/models/featureFlag.ts`

key UNIQUE, name, default_enabled, tenant_overrides JSONB, group

### 5.13 print_templates — 打印模板

> MongoDB: `backend/src/models/printTemplate.ts`

tenant_id, name, schema_version, canvas JSONB, elements JSONB, bindings JSONB, meta JSONB, sample_data JSONB, requires_yamato_sort_code, reference_image_data TEXT

### 5.14 email_templates — 邮件模板

> MongoDB: `backend/src/models/emailTemplate.ts`

name, carrier_id, is_active, sender_name, sender_email, reply_to_email, subject, body_template TEXT, footer_text, is_default

### 5.15 form_templates — 帐票模板

> MongoDB: `backend/src/models/formTemplate.ts`

name, target_type, columns JSONB, styles JSONB, page_size, page_orientation, page_margins INT[], header_footer_items JSONB, is_default

### 5.16 wms_schedules — 定时计划

> MongoDB: `backend/src/models/wmsSchedule.ts`

name, action CHECK IN (7 types), is_enabled, schedule_type, cron_expression, cron_hour, cron_minute, cron_days_of_week INT[], skip_holidays, last_run_at, next_run_at, run_count, metadata JSONB

### 5.17 wms_schedule_logs — 计划日志

> MongoDB: `backend/src/models/wmsScheduleLog.ts`

schedule_id, task_id, task_number, action, event CHECK IN (8 types), message, user_name

### 5.18 mapping_configs — 映射配置

> MongoDB: `backend/src/models/mappingConfig.ts`

schema_version, config_type, name, is_default, order_source_company_id/name, carrier_id/code/name, mappings JSONB, created_by, updated_by

### 5.19 fba_shipment_plans — FBA 出货计划

> MongoDB: `backend/src/models/fbaShipmentPlan.ts`

plan_number UNIQUE(tenant_id, plan_number), status, amazon_shipment_id, destination_fc, items JSONB, carrier_id, tracking_number, box_count, total_quantity, ship_date, estimated_arrival

### 5.20 rsl_shipment_plans — RSL 出货计划

> MongoDB: `backend/src/models/rslShipmentPlan.ts`

plan_number UNIQUE(tenant_id, plan_number), status, rakuten_shipment_id, destination_warehouse, items JSONB, carrier_id, tracking_number, box_count, total_quantity

### 5.21 fba_boxes — FBA 箱管理

> MongoDB: `backend/src/models/fbaBox.ts`

inbound_order_id FK, box_number UNIQUE(tenant_id, box_number), destination_fc, items JSONB, weight, length, width, height, status, box_label_printed, shipping_label_printed, tracking_number, sealed_at, sealed_by

### 5.22 notifications — 通知 (90天TTL)

> MongoDB: `backend/src/models/notification.ts`

recipient_type, recipient_id, recipient_email, channel, priority, title, body, html_body, event, reference_type/id, status, sent_at, read_at, error_message, retry_count

### 5.23 notification_preferences — 通知偏好

> MongoDB: `backend/src/models/notificationPreference.ts`

subscriber_id, subscriber_type. **UNIQUE**: (subscriber_id, subscriber_type). channels TEXT[], subscribed_events TEXT[], muted

### 5.24 order_groups — 出货分组

> MongoDB: `backend/src/models/orderGroup.ts`

order_group_id UNIQUE, name UNIQUE, priority, enabled

### 5.25 set_products — 套装组品

> MongoDB: `backend/src/models/setProduct.ts`

sku UNIQUE, name, components JSONB NOT NULL, is_active

### 5.26 set_orders — 套装组装指示

> MongoDB: `backend/src/models/setOrder.ts`

order_number UNIQUE, type CHECK IN ('assembly','disassembly'), set_product_id FK, quantity, completed_quantity, status, components JSONB

### 5.27 carrier_automation_configs — 配送自动化配置

> MongoDB: `backend/src/models/carrierAutomationConfig.ts`

automation_type, enabled, yamato_b2 JSONB, auto_validation JSONB. **UNIQUE**: (tenant_id, automation_type)

### 5.28 carrier_session_caches — 会话缓存

> MongoDB: `backend/src/models/carrierSessionCache.ts`

carrier_type, session_token TEXT, expires_at. **UNIQUE**: (tenant_id, carrier_type). 用 pg_cron 清理过期行。

---

## 6. 日志表 (Priority 4, 带分区) / ログテーブル（パーティション付き）

> 月度范围分区、无 deleted_at、用 pg_cron 或 DROP PARTITION 实现 TTL
> 月次レンジパーティション、deleted_at なし、pg_cron または DROP PARTITION で TTL 実現

### 6.1 operation_logs — 操作日志 (180天)

> MongoDB: `backend/src/models/operationLog.ts`

```sql
CREATE TABLE operation_logs (
  id              UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  action          VARCHAR(30) NOT NULL,
  category        VARCHAR(20),
  description     TEXT NOT NULL,
  product_id      UUID,
  product_sku     VARCHAR(200),
  product_name    VARCHAR(500),
  location_code   VARCHAR(100),
  lot_number      VARCHAR(100),
  quantity        INT,
  reference_type  VARCHAR(50),
  reference_id    VARCHAR(100),
  reference_number VARCHAR(100),
  user_name       VARCHAR(200) DEFAULT 'system',
  ip_address      VARCHAR(50),
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- 自动创建月度分区 / 月次パーティションを自動作成
-- CREATE TABLE operation_logs_2026_03 PARTITION OF operation_logs
--   FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

CREATE INDEX idx_oplog_tenant_time ON operation_logs (tenant_id, created_at DESC);
CREATE INDEX idx_oplog_category ON operation_logs (category, action, created_at DESC);
```

### 6.2 api_logs — API 日志 (180天)

> MongoDB: `backend/src/models/apiLog.ts`

```sql
CREATE TABLE api_logs (
  id              UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id       UUID,
  api_name        VARCHAR(100) NOT NULL,
  action          VARCHAR(100) NOT NULL,
  status          VARCHAR(20) DEFAULT 'pending',
  request_url     TEXT,
  request_method  VARCHAR(10),
  status_code     INT,
  processed_count INT DEFAULT 0,
  success_count   INT DEFAULT 0,
  error_count     INT DEFAULT 0,
  message         TEXT,
  error_detail    TEXT,
  reference_type  VARCHAR(50),
  reference_id    VARCHAR(100),
  reference_number VARCHAR(100),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  duration_ms     BIGINT,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE INDEX idx_apilog_tenant_time ON api_logs (tenant_id, created_at DESC);
CREATE INDEX idx_apilog_name ON api_logs (api_name);
CREATE INDEX idx_apilog_status ON api_logs (status);
```

### 6.3 event_logs — 事件日志 (90天)

> MongoDB: `backend/src/models/eventLog.ts`

```sql
CREATE TABLE event_logs (
  id            UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id     UUID,
  event         VARCHAR(200) NOT NULL,
  source        VARCHAR(20) NOT NULL CHECK (source IN ('engine','plugin','script','webhook')),
  source_name   VARCHAR(200),
  payload       JSONB,
  status        VARCHAR(20) NOT NULL CHECK (status IN ('emitted','processed','error')),
  error         TEXT,
  duration      INT NOT NULL,
  handler_count INT DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE INDEX idx_eventlog_event_time ON event_logs (event, created_at DESC);
CREATE INDEX idx_eventlog_tenant ON event_logs (tenant_id);
```

### 6.4 system_settings — 系统设置 / システム設定

> MongoDB: `backend/src/models/systemSettings.ts`
> 非日志表，每租户一行 / ログテーブルではない、テナントごとに1行

```sql
CREATE TABLE system_settings (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  settings_key                VARCHAR(50) NOT NULL DEFAULT 'global',
  inbound_require_inspection  BOOLEAN DEFAULT TRUE,
  inbound_auto_create_lot     BOOLEAN DEFAULT FALSE,
  inbound_default_location_code VARCHAR(100) DEFAULT '',
  inventory_allow_negative_stock BOOLEAN DEFAULT FALSE,
  inventory_default_safety_stock INT DEFAULT 0,
  inventory_lot_tracking_enabled BOOLEAN DEFAULT TRUE,
  inventory_expiry_alert_days   INT DEFAULT 30,
  outbound_auto_allocate      BOOLEAN DEFAULT FALSE,
  outbound_allocation_rule    VARCHAR(10) DEFAULT 'FIFO',
  outbound_require_inspection BOOLEAN DEFAULT TRUE,
  barcode_default_format      VARCHAR(20) DEFAULT 'code128',
  barcode_scan_mode           VARCHAR(20) DEFAULT 'single',
  system_language             VARCHAR(10) DEFAULT 'ja',
  timezone                    VARCHAR(50) DEFAULT 'Asia/Tokyo',
  date_format                 VARCHAR(20) DEFAULT 'YYYY-MM-DD',
  page_size                   INT DEFAULT 50,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, settings_key)
);
```

---

## 7. 索引策略 / インデックス戦略

### 7.1 复合索引 / 複合インデックス

| 表 | 索引 | 用途 |
|---|---|---|
| products | (tenant_id, sku) WHERE deleted_at IS NULL | SKU 精确查询 |
| products | (tenant_id, client_id) WHERE deleted_at IS NULL | 客户商品列表 |
| shipment_orders | (tenant_id, created_at DESC) | 订单列表 |
| shipment_orders | (tenant_id, status_confirmed, created_at DESC) | 未确认订单 |
| stock_quants | (product_id, quantity, reserved_quantity) WHERE quantity > 0 | 可用库存 |
| stock_moves | (reference_type, reference_id, state, move_type) | 出库确认 |
| inbound_orders | (tenant_id, flow_type, status) | 入库看板 |
| warehouse_tasks | (warehouse_id, type, status) | 任务看板 |
| work_charges | (tenant_id, client_id, is_billed) | 未计费查询 |

### 7.2 GIN 索引

| 表 | 列 | 说明 |
|---|---|---|
| products | barcode (array) | 条码搜索 |
| products | custom_fields (jsonb_path_ops) | 自定义字段 |
| products | marketplace_codes (jsonb_path_ops) | 平台编码 |
| shipment_orders | _products_meta (jsonb_path_ops) | 商品聚合搜索 |
| shipment_orders | handling_tags (array) | 荷扱い搜索 |
| products | name (gin_trgm_ops) | 模糊搜索 |
| tenants | name (gin_trgm_ops) | 模糊搜索 |

### 7.3 部分索引

所有带 `deleted_at` 的表的主要查询索引都加 `WHERE deleted_at IS NULL`，减小索引体积、提升活跃数据查询性能。

---

## 8. Drizzle Schema 示例 / Drizzle Schema サンプル

```typescript
// src/db/schema/tenants.ts
import { pgTable, uuid, varchar, text, integer, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantCode: varchar('tenant_code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 200 }).notNull(),
  name2: varchar('name2', { length: 200 }),
  plan: varchar('plan', { length: 20 }).notNull().default('free'),
  status: varchar('status', { length: 20 }).notNull().default('trial'),
  contactName: varchar('contact_name', { length: 100 }),
  contactEmail: varchar('contact_email', { length: 200 }),
  maxUsers: integer('max_users').notNull().default(5),
  maxWarehouses: integer('max_warehouses').notNull().default(1),
  maxClients: integer('max_clients').notNull().default(10),
  features: text('features').array().default([]),
  settings: jsonb('settings').notNull().default({}),
  isActive: boolean('is_active').notNull().default(true),
  memo: text('memo'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

```typescript
// src/db/schema/products.ts
import { pgTable, uuid, varchar, text, integer, numeric, boolean, timestamp, jsonb, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id'),
  sku: varchar('sku', { length: 200 }).notNull(),
  name: varchar('name', { length: 500 }).notNull(),
  barcode: text('barcode').array().default([]),
  coolType: varchar('cool_type', { length: 5 }),
  mailCalcEnabled: boolean('mail_calc_enabled').notNull().default(false),
  price: numeric('price', { precision: 12, scale: 2 }),
  subSkus: jsonb('sub_skus').default([]),
  category: varchar('category', { length: 100 }).default('0'),
  allocationRule: varchar('allocation_rule', { length: 10 }).default('FIFO'),
  inventoryEnabled: boolean('inventory_enabled').notNull().default(false),
  lotTrackingEnabled: boolean('lot_tracking_enabled').notNull().default(false),
  safetyStock: integer('safety_stock').notNull().default(0),
  fbaEnabled: boolean('fba_enabled').notNull().default(false),
  rslEnabled: boolean('rsl_enabled').notNull().default(false),
  marketplaceCodes: jsonb('marketplace_codes').default({}),
  customFields: jsonb('custom_fields').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  uniqueSku: uniqueIndex('idx_products_tenant_sku').on(table.tenantId, table.sku),
}));
```

```typescript
// src/db/schema/stock-quants.ts
import { pgTable, uuid, varchar, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { products } from './products';
import { locations } from './locations';

export const stockQuants = pgTable('stock_quants', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'restrict' }),
  productSku: varchar('product_sku', { length: 200 }).notNull(),
  locationId: uuid('location_id').notNull().references(() => locations.id, { onDelete: 'restrict' }),
  lotId: uuid('lot_id'),
  quantity: integer('quantity').notNull().default(0),
  reservedQuantity: integer('reserved_quantity').notNull().default(0),
  lastMovedAt: timestamp('last_moved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  productIdx: index('idx_sq_product').on(table.productId),
  tenantIdx: index('idx_sq_tenant').on(table.tenantId, table.productId, table.locationId),
}));
```

```typescript
// src/db/schema/shipment-orders.ts
import { pgTable, uuid, varchar, text, boolean, numeric, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const shipmentOrders = pgTable('shipment_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  destinationType: varchar('destination_type', { length: 10 }).default('B2C'),
  statusConfirmed: boolean('status_confirmed').notNull().default(false),
  statusConfirmedAt: timestamp('status_confirmed_at', { withTimezone: true }),
  statusShipped: boolean('status_shipped').notNull().default(false),
  statusShippedAt: timestamp('status_shipped_at', { withTimezone: true }),
  orderNumber: varchar('order_number', { length: 100 }).notNull().unique(),
  carrierId: varchar('carrier_id', { length: 100 }).notNull(),
  customerManagementNumber: varchar('customer_management_number', { length: 200 }).notNull(),
  trackingId: varchar('tracking_id', { length: 100 }),
  recipientPostalCode: varchar('recipient_postal_code', { length: 20 }).notNull(),
  recipientName: varchar('recipient_name', { length: 200 }).notNull(),
  recipientPhone: varchar('recipient_phone', { length: 50 }).notNull(),
  shipPlanDate: varchar('ship_plan_date', { length: 20 }).notNull(),
  invoiceType: varchar('invoice_type', { length: 10 }).notNull(),
  handlingTags: text('handling_tags').array().default([]),
  _productsMeta: jsonb('_products_meta').default({}),
  customFields: jsonb('custom_fields').default({}),
  shippingCost: numeric('shipping_cost', { precision: 12, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  tenantTime: index('idx_so_tenant_time').on(table.tenantId, table.createdAt),
}));
```

```typescript
// src/db/schema/inbound-orders.ts
import { pgTable, uuid, varchar, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const inboundOrders = pgTable('inbound_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  orderNumber: varchar('order_number', { length: 50 }).notNull().unique(),
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  destinationLocationId: uuid('destination_location_id'),
  supplierName: varchar('supplier_name', { length: 200 }),
  expectedDate: timestamp('expected_date', { withTimezone: true }),
  memo: text('memo'),
  flowType: varchar('flow_type', { length: 20 }).default('standard'),
  clientId: uuid('client_id'),
  clientName: varchar('client_name', { length: 200 }),
  serviceOptions: jsonb('service_options').default([]),
  fbaInfo: jsonb('fba_info'),
  varianceReport: jsonb('variance_report'),
  customFields: jsonb('custom_fields').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  tenantStatus: index('idx_io_tenant_status').on(table.tenantId, table.status),
}));
```

---

## 9. MongoDB → PostgreSQL 类型映射 / 型マッピング

| MongoDB 类型 | PostgreSQL 类型 | 说明 |
|---|---|---|
| `ObjectId` | `UUID` | UUID v5 (namespace = OID hex) |
| `String` | `VARCHAR(n)` / `TEXT` | 短字段 VARCHAR、长文本 TEXT |
| `Number` (整数) | `INT` / `BIGINT` | |
| `Number` (浮点) | `NUMERIC(p,s)` | 精确小数 |
| `Boolean` | `BOOLEAN` | |
| `Date` | `TIMESTAMPTZ` | 始终 with timezone |
| `[String]` | `TEXT[]` | PostgreSQL 原生数组 |
| `[ObjectId]` | `UUID[]` | PostgreSQL 原生数组 |
| `Mixed` / `Object` | `JSONB` | GIN 索引可选 |
| `[SubDocument]` (少量) | `JSONB` | 不需独立查询时 |
| `[SubDocument]` (大量) | 独立表 + FK | 需要独立查询/索引时 |
| `Map<String, String>` | `JSONB` | key-value 查询 |
| `Mongoose timestamps` | `created_at` + `updated_at` | 触发器管理 |
| MongoDB TTL index | pg_cron + DELETE / DROP PARTITION | 定期清理 |
| MongoDB text index | pg_trgm GIN | 模糊搜索 |

---

## 10. 数据迁移注意事项 / データ移行注意事項

### 10.1 ObjectId → UUID v5 转换

```typescript
import { v5 as uuidv5 } from 'uuid';
const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

function objectIdToUuid(objectId: string): string {
  return uuidv5(objectId, NAMESPACE);
}
```

### 10.2 嵌套数组 → 独立表

| 源 MongoDB 字段 | 目标 PostgreSQL 表 |
|---|---|
| `inboundOrder.lines[]` | `inbound_order_lines` |
| `shipmentOrder.products[]` | `shipment_order_products` |
| `shipmentOrder.materials[]` | `shipment_order_materials` |
| `returnOrder.lines[]` | `return_order_lines` |

### 10.3 保留为 JSONB 的嵌套对象

| 字段 | 理由 |
|---|---|
| `product.subSkus` | 子SKU 数量少、随父商品访问 |
| `product.warehouseNotes` | 单一对象 |
| `shipmentOrder.carrierData` | 嵌套深但数据量小 |
| `shipmentOrder.internalRecord` | 追加型日志 |
| `stocktakingOrder.lines` | 行数有限 |
| `cycleCountPlan.items` | 项目数有限 |
| `fbaShipmentPlan.items` | 明细数有限 |
| `packingRule.conditions/materials` | 规则条件少 |

### 10.4 迁移执行顺序

1. **Phase 1**: DDL - 创建全部表
2. **Phase 2**: tenants → users → warehouses → locations
3. **Phase 3**: clients → sub_clients → shops → suppliers → customers
4. **Phase 4**: products → lots → stock_quants
5. **Phase 5**: carriers → shipment_orders → inbound_orders → return_orders
6. **Phase 6**: stock_moves → inventory_ledger → inventory_reservations
7. **Phase 7**: 业务表 (waves, tasks, billing)
8. **Phase 8**: 扩展表 (plugins, webhooks, templates)
9. **Phase 9**: 日志表 (operation_logs, api_logs, event_logs)
10. **Phase 10**: 验证 + 索引 + RLS

### 10.5 数据验证检查表

- [ ] ObjectId → UUID 映射一致
- [ ] 外键关系正确无断裂
- [ ] 嵌套数组正确展开为独立表行
- [ ] JSONB 字段格式有效
- [ ] 数值精度无损失
- [ ] 时间戳时区统一 (UTC)
- [ ] 索引创建完成
- [ ] RLS 策略生效
- [ ] 行数一致校验通过
