-- 要件ギャップ補填マイグレーション / 需求差距补填迁移
-- 新テーブル作成 + 既存テーブルにカラム追加
-- 新建表 + 给已有表添加列

-- ============================================
-- 1a. 国コード参照テーブル / 国家代码参考表
-- ============================================
CREATE TABLE IF NOT EXISTS "country_codes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "numeric_code" integer NOT NULL,
  "alpha2" text NOT NULL,
  "alpha3" text NOT NULL,
  "name_ja" text NOT NULL,
  "name_en" text NOT NULL,
  "region" text
);

CREATE UNIQUE INDEX IF NOT EXISTS "country_codes_alpha2_idx" ON "country_codes" ("alpha2");
CREATE UNIQUE INDEX IF NOT EXISTS "country_codes_alpha3_idx" ON "country_codes" ("alpha3");
CREATE INDEX IF NOT EXISTS "country_codes_region_idx" ON "country_codes" ("region");

-- ============================================
-- 1b. 欠品レコード / 缺货记录
-- ============================================
CREATE TABLE IF NOT EXISTS "shortage_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "shipment_order_id" uuid NOT NULL REFERENCES "shipment_orders"("id"),
  "product_id" uuid NOT NULL REFERENCES "products"("id"),
  "requested_quantity" integer NOT NULL,
  "available_quantity" integer NOT NULL,
  "shortage_quantity" integer NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "reserved_at" timestamp,
  "fulfilled_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "shortage_records_tenant_idx" ON "shortage_records" ("tenant_id");
CREATE INDEX IF NOT EXISTS "shortage_records_shipment_order_idx" ON "shortage_records" ("shipment_order_id");
CREATE INDEX IF NOT EXISTS "shortage_records_product_idx" ON "shortage_records" ("product_id");
CREATE INDEX IF NOT EXISTS "shortage_records_status_idx" ON "shortage_records" ("status");

-- ============================================
-- 1c. セット組み作業 / 组装作业
-- ============================================
CREATE TABLE IF NOT EXISTS "assembly_orders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "assembly_number" text NOT NULL,
  "status" text NOT NULL DEFAULT 'draft',
  "set_product_id" uuid,
  "items" jsonb DEFAULT '[]'::jsonb,
  "assembled_quantity" integer NOT NULL DEFAULT 0,
  "target_quantity" integer NOT NULL,
  "assigned_to" text,
  "notes" text,
  "started_at" timestamp,
  "completed_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "assembly_orders_tenant_idx" ON "assembly_orders" ("tenant_id");
CREATE INDEX IF NOT EXISTS "assembly_orders_status_idx" ON "assembly_orders" ("tenant_id", "status");

-- ============================================
-- 1d. ギフトオプション / 礼品选项
-- ============================================
CREATE TABLE IF NOT EXISTS "gift_options" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "shipment_order_id" uuid NOT NULL,
  "gift_type" text NOT NULL,
  "option_name" text,
  "option_value" text,
  "message" text,
  "price" numeric DEFAULT '0',
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "gift_options_tenant_idx" ON "gift_options" ("tenant_id");
CREATE INDEX IF NOT EXISTS "gift_options_shipment_order_idx" ON "gift_options" ("shipment_order_id");

-- ============================================
-- 1e. 棚卸差異 / 盘点差异
-- ============================================
CREATE TABLE IF NOT EXISTS "stocktaking_discrepancies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "stocktaking_order_id" uuid NOT NULL REFERENCES "stocktaking_orders"("id"),
  "product_id" uuid NOT NULL REFERENCES "products"("id"),
  "location_id" uuid NOT NULL REFERENCES "locations"("id"),
  "system_quantity" integer NOT NULL,
  "counted_quantity" integer NOT NULL,
  "discrepancy" integer NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "adjusted_by" uuid,
  "adjusted_at" timestamp,
  "notes" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "stocktaking_discrepancies_tenant_idx" ON "stocktaking_discrepancies" ("tenant_id");
CREATE INDEX IF NOT EXISTS "stocktaking_discrepancies_order_idx" ON "stocktaking_discrepancies" ("stocktaking_order_id");

-- ============================================
-- 1f. 取扱注意ラベルタイプ / 处理注意标签类型
-- ============================================
CREATE TABLE IF NOT EXISTS "handling_label_types" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" text UNIQUE NOT NULL,
  "name_ja" text NOT NULL,
  "name_en" text NOT NULL,
  "name_zh" text NOT NULL,
  "icon" text,
  "sort_order" integer NOT NULL DEFAULT 0,
  "is_active" boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS "handling_label_types_sort_idx" ON "handling_label_types" ("sort_order");

-- 事前定義8種 / 预定义8种类型
INSERT INTO "handling_label_types" ("code", "name_ja", "name_en", "name_zh", "sort_order")
VALUES
  ('fragile',               'ワレモノ注意',     'Fragile',               '易碎品',       1),
  ('liquid',                '液体注意',         'Contains Liquid',        '含液体',       2),
  ('this_side_up',          '天地無用',         'This Side Up',           '请勿倒置',     3),
  ('keep_dry',              '水濡れ厳禁',       'Keep Dry',               '防潮',         4),
  ('no_stack',              '積み重ね不可',     'Do Not Stack',           '请勿堆叠',     5),
  ('temperature_sensitive', '温度管理品',       'Temperature Sensitive',  '温度敏感品',   6),
  ('handle_with_care',      '取扱注意',         'Handle With Care',       '小心轻放',     7),
  ('opp_bag_required',      'OPP袋必要',        'OPP Bag Required',       '需要OPP袋',   8)
ON CONFLICT ("code") DO NOTHING;

-- ============================================
-- 2a. customers テーブルにカラム追加 / 给customers表添加列
-- ============================================
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "corporate_number" text;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "invoice_registration_number" text;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "fax" text;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "sns_number" text;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "department" text;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "contact_person" text;

-- ============================================
-- 2b. products テーブルにカラム追加 / 给products表添加列
-- ============================================
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "size_assessment_status" text DEFAULT 'pending';
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "customer_customer_codes" jsonb DEFAULT '{}'::jsonb;

-- ============================================
-- 2c. inbound_orders テーブルにカラム追加 / 给inbound_orders表添加列
-- ============================================
ALTER TABLE "inbound_orders" ADD COLUMN IF NOT EXISTS "is_cod_delivery" boolean DEFAULT false;
ALTER TABLE "inbound_orders" ADD COLUMN IF NOT EXISTS "is_unplanned" boolean DEFAULT false;
