-- 要件ギャップ全項目追加マイグレーション / 需求差距全项补充迁移
-- 棚卸明細行テーブル + セットマスタテーブル + 棚卸指示・入庫追加フィールド
-- 盘点明细行表 + 套装主数据表 + 盘点单・入库追加字段

-- ============================================================
-- 1. 新テーブル: stocktaking_lines (棚卸明細行 / 盘点明细行)
-- ============================================================
CREATE TABLE IF NOT EXISTS "stocktaking_lines" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "stocktaking_order_id" uuid NOT NULL REFERENCES "stocktaking_orders"("id"),
  "product_id" uuid NOT NULL REFERENCES "products"("id"),
  "location_id" uuid REFERENCES "locations"("id"),

  "count_round" integer NOT NULL DEFAULT 1,
  "system_quantity" integer NOT NULL DEFAULT 0,
  "counted_quantity" integer,
  "discrepancy" integer,
  "previous_count" integer,

  "warehouse_code" text,
  "warehouse_type" text,
  "result_mark" text,

  "lot_id" uuid,
  "expiry_date" timestamp,
  "best_before_date" timestamp,
  "serial_number" text,

  "last_updated_by" uuid,
  "notes" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "stocktaking_lines_tenant_idx" ON "stocktaking_lines" ("tenant_id");
CREATE INDEX IF NOT EXISTS "stocktaking_lines_order_idx" ON "stocktaking_lines" ("stocktaking_order_id");
CREATE INDEX IF NOT EXISTS "stocktaking_lines_product_idx" ON "stocktaking_lines" ("product_id");

-- ============================================================
-- 2. 新テーブル: set_master (セットマスタ / 套装主数据)
-- ============================================================
CREATE TABLE IF NOT EXISTS "set_master" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "set_product_id" uuid NOT NULL REFERENCES "products"("id"),
  "component_product_id" uuid NOT NULL REFERENCES "products"("id"),
  "quantity" integer NOT NULL DEFAULT 1,
  "sort_order" integer DEFAULT 0,
  "notes" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "set_master_tenant_idx" ON "set_master" ("tenant_id");
CREATE INDEX IF NOT EXISTS "set_master_set_product_idx" ON "set_master" ("set_product_id");

-- ============================================================
-- 3. stocktaking_orders 追加カラム / 盘点单追加列
-- ============================================================
ALTER TABLE "stocktaking_orders" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "stocktaking_orders" ADD COLUMN IF NOT EXISTS "client_id" uuid REFERENCES "clients"("id");
ALTER TABLE "stocktaking_orders" ADD COLUMN IF NOT EXISTS "stocktaking_category" text DEFAULT 'full';
ALTER TABLE "stocktaking_orders" ADD COLUMN IF NOT EXISTS "location_from" text;
ALTER TABLE "stocktaking_orders" ADD COLUMN IF NOT EXISTS "location_to" text;
ALTER TABLE "stocktaking_orders" ADD COLUMN IF NOT EXISTS "instruction_date" timestamp;
ALTER TABLE "stocktaking_orders" ADD COLUMN IF NOT EXISTS "discrepancy_category" text;
ALTER TABLE "stocktaking_orders" ADD COLUMN IF NOT EXISTS "total_slots" integer DEFAULT 0;
ALTER TABLE "stocktaking_orders" ADD COLUMN IF NOT EXISTS "completed_slots" integer DEFAULT 0;
ALTER TABLE "stocktaking_orders" ADD COLUMN IF NOT EXISTS "theoretical_item_count" integer DEFAULT 0;
ALTER TABLE "stocktaking_orders" ADD COLUMN IF NOT EXISTS "actual_item_count" integer DEFAULT 0;
ALTER TABLE "stocktaking_orders" ADD COLUMN IF NOT EXISTS "theoretical_piece_count" integer DEFAULT 0;
ALTER TABLE "stocktaking_orders" ADD COLUMN IF NOT EXISTS "actual_piece_count" integer DEFAULT 0;
ALTER TABLE "stocktaking_orders" ADD COLUMN IF NOT EXISTS "judgment" text;
ALTER TABLE "stocktaking_orders" ADD COLUMN IF NOT EXISTS "confirmed_at" timestamp;
ALTER TABLE "stocktaking_orders" ADD COLUMN IF NOT EXISTS "customer_notification_date" timestamp;
ALTER TABLE "stocktaking_orders" ADD COLUMN IF NOT EXISTS "customer_notifier" text;

CREATE INDEX IF NOT EXISTS "stocktaking_orders_client_idx" ON "stocktaking_orders" ("tenant_id", "client_id");

-- ============================================================
-- 4. inbound_orders 追加カラム / 入库订单追加列
-- ============================================================
ALTER TABLE "inbound_orders" ADD COLUMN IF NOT EXISTS "po_number" text;
ALTER TABLE "inbound_orders" ADD COLUMN IF NOT EXISTS "desired_date" timestamp;
ALTER TABLE "inbound_orders" ADD COLUMN IF NOT EXISTS "supplier_name" text;
ALTER TABLE "inbound_orders" ADD COLUMN IF NOT EXISTS "supplier_phone" text;
ALTER TABLE "inbound_orders" ADD COLUMN IF NOT EXISTS "supplier_postal_code" text;
ALTER TABLE "inbound_orders" ADD COLUMN IF NOT EXISTS "supplier_address" text;
ALTER TABLE "inbound_orders" ADD COLUMN IF NOT EXISTS "completion_flag" boolean DEFAULT false;
ALTER TABLE "inbound_orders" ADD COLUMN IF NOT EXISTS "completion_date" timestamp;
ALTER TABLE "inbound_orders" ADD COLUMN IF NOT EXISTS "import_control_number" text;
ALTER TABLE "inbound_orders" ADD COLUMN IF NOT EXISTS "import_control_date" timestamp;
ALTER TABLE "inbound_orders" ADD COLUMN IF NOT EXISTS "delivery_company" text;
ALTER TABLE "inbound_orders" ADD COLUMN IF NOT EXISTS "delivery_slip_number" text;
ALTER TABLE "inbound_orders" ADD COLUMN IF NOT EXISTS "inbound_comment" text;
ALTER TABLE "inbound_orders" ADD COLUMN IF NOT EXISTS "container_type" text;
ALTER TABLE "inbound_orders" ADD COLUMN IF NOT EXISTS "total_cbm" text;
ALTER TABLE "inbound_orders" ADD COLUMN IF NOT EXISTS "total_pallets" integer DEFAULT 0;

-- ============================================================
-- 5. inbound_order_lines 追加カラム / 入库明细行追加列
-- ============================================================
ALTER TABLE "inbound_order_lines" ADD COLUMN IF NOT EXISTS "detail_number" text;
ALTER TABLE "inbound_order_lines" ADD COLUMN IF NOT EXISTS "handling_category" text;
ALTER TABLE "inbound_order_lines" ADD COLUMN IF NOT EXISTS "inbound_type" text;
ALTER TABLE "inbound_order_lines" ADD COLUMN IF NOT EXISTS "warehouse_code" text;
ALTER TABLE "inbound_order_lines" ADD COLUMN IF NOT EXISTS "warehouse_type" text;
ALTER TABLE "inbound_order_lines" ADD COLUMN IF NOT EXISTS "case_quantity" integer;
ALTER TABLE "inbound_order_lines" ADD COLUMN IF NOT EXISTS "case_unit_type" text;
ALTER TABLE "inbound_order_lines" ADD COLUMN IF NOT EXISTS "case_unit_quantity" integer;
ALTER TABLE "inbound_order_lines" ADD COLUMN IF NOT EXISTS "inner_box_quantity" integer;
ALTER TABLE "inbound_order_lines" ADD COLUMN IF NOT EXISTS "serial_number" text;
ALTER TABLE "inbound_order_lines" ADD COLUMN IF NOT EXISTS "best_before_date" timestamp;
ALTER TABLE "inbound_order_lines" ADD COLUMN IF NOT EXISTS "expiry_date_input" text;
ALTER TABLE "inbound_order_lines" ADD COLUMN IF NOT EXISTS "rack_number" text;
ALTER TABLE "inbound_order_lines" ADD COLUMN IF NOT EXISTS "hazardous_flag" boolean DEFAULT false;
ALTER TABLE "inbound_order_lines" ADD COLUMN IF NOT EXISTS "paid_free_flag" text DEFAULT 'free';
ALTER TABLE "inbound_order_lines" ADD COLUMN IF NOT EXISTS "origin_country" text;
ALTER TABLE "inbound_order_lines" ADD COLUMN IF NOT EXISTS "air_shipping_prohibited" boolean DEFAULT false;
ALTER TABLE "inbound_order_lines" ADD COLUMN IF NOT EXISTS "service_work_type" text;
ALTER TABLE "inbound_order_lines" ADD COLUMN IF NOT EXISTS "selling_price" text;
ALTER TABLE "inbound_order_lines" ADD COLUMN IF NOT EXISTS "selling_price_unit" text;
ALTER TABLE "inbound_order_lines" ADD COLUMN IF NOT EXISTS "purchase_price" text;
ALTER TABLE "inbound_order_lines" ADD COLUMN IF NOT EXISTS "purchase_price_unit" text;
ALTER TABLE "inbound_order_lines" ADD COLUMN IF NOT EXISTS "tax_type" text;
ALTER TABLE "inbound_order_lines" ADD COLUMN IF NOT EXISTS "tax_rate" text;
ALTER TABLE "inbound_order_lines" ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'JPY';
ALTER TABLE "inbound_order_lines" ADD COLUMN IF NOT EXISTS "reserve_fields" jsonb DEFAULT '{}';
