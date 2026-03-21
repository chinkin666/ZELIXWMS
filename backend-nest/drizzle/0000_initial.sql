-- ZELIXWMS 初期マイグレーション / 初始迁移
-- NestJS + PostgreSQL (Supabase)

-- テナント / 租户
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  plan TEXT DEFAULT 'free',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- デフォルトテナント / 默认租户
INSERT INTO tenants (id, code, name, plan) VALUES
  ('00000000-0000-0000-0000-000000000001', 'default', 'Default Tenant', 'standard')
ON CONFLICT (code) DO NOTHING;

-- ユーザー / 用户
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY, -- Supabase Auth user.id
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  email TEXT NOT NULL,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'viewer',
  warehouse_ids JSONB DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 倉庫 / 仓库
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  name2 TEXT,
  postal_code TEXT,
  prefecture TEXT,
  city TEXT,
  address TEXT,
  address2 TEXT,
  phone TEXT,
  cool_types JSONB DEFAULT '[]',
  capacity INTEGER,
  operating_hours TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, code)
);

-- ロケーション / 库位
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  warehouse_id UUID REFERENCES warehouses(id),
  parent_id UUID REFERENCES locations(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  full_path TEXT DEFAULT '',
  cool_type TEXT,
  stock_type TEXT,
  temperature_type TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, code)
);

-- 商品 / 商品
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  name_full TEXT,
  name_en TEXT,
  category TEXT DEFAULT '0',
  barcode JSONB DEFAULT '[]',
  jan_code TEXT,
  image_url TEXT,
  memo TEXT,
  customer_product_code TEXT,
  brand_code TEXT,
  brand_name TEXT,
  size_name TEXT,
  color_name TEXT,
  unit_type TEXT,
  width NUMERIC,
  depth NUMERIC,
  height NUMERIC,
  weight NUMERIC,
  gross_weight NUMERIC,
  volume NUMERIC,
  outer_box_width NUMERIC,
  outer_box_depth NUMERIC,
  outer_box_height NUMERIC,
  outer_box_volume NUMERIC,
  outer_box_weight NUMERIC,
  case_quantity INTEGER,
  price NUMERIC,
  cost_price NUMERIC,
  tax_type TEXT,
  tax_rate NUMERIC,
  currency TEXT,
  cool_type TEXT,
  shipping_size_code TEXT,
  mail_calc_enabled BOOLEAN DEFAULT false,
  mail_calc_max_quantity INTEGER,
  inventory_enabled BOOLEAN DEFAULT false,
  lot_tracking_enabled BOOLEAN DEFAULT false,
  expiry_tracking_enabled BOOLEAN DEFAULT false,
  serial_tracking_enabled BOOLEAN DEFAULT false,
  alert_days_before_expiry INTEGER DEFAULT 30,
  inbound_expiry_days INTEGER,
  safety_stock INTEGER DEFAULT 0,
  allocation_rule TEXT DEFAULT 'FIFO',
  supplier_code TEXT,
  supplier_name TEXT,
  fnsku TEXT,
  asin TEXT,
  amazon_sku TEXT,
  fba_enabled BOOLEAN DEFAULT false,
  rakuten_sku TEXT,
  rsl_enabled BOOLEAN DEFAULT false,
  marketplace_codes JSONB DEFAULT '{}',
  wholesale_partner_codes JSONB DEFAULT '{}',
  hazardous_type TEXT DEFAULT '0',
  air_transport_ban BOOLEAN DEFAULT false,
  barcode_commission BOOLEAN DEFAULT false,
  reservation_target BOOLEAN DEFAULT false,
  paid_type TEXT DEFAULT '0',
  country_of_origin TEXT,
  handling_types JSONB DEFAULT '[]',
  default_handling_tags JSONB DEFAULT '[]',
  remarks JSONB DEFAULT '[]',
  custom_fields JSONB DEFAULT '{}',
  wh_preferred_location TEXT,
  wh_handling_notes TEXT,
  wh_is_fragile BOOLEAN DEFAULT false,
  wh_is_liquid BOOLEAN DEFAULT false,
  wh_requires_opp_bag BOOLEAN DEFAULT false,
  wh_storage_type TEXT,
  client_id UUID,
  sub_client_id UUID,
  shop_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_products_tenant_customer_code ON products(tenant_id, customer_product_code);
CREATE INDEX IF NOT EXISTS idx_products_tenant_brand ON products(tenant_id, brand_code);
CREATE INDEX IF NOT EXISTS idx_products_tenant_client ON products(tenant_id, client_id);

-- 子SKU / 子SKU
CREATE TABLE IF NOT EXISTS product_sub_skus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sub_sku TEXT NOT NULL,
  price NUMERIC,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(product_id, sub_sku)
);

-- 在庫数量 / 库存数量
CREATE TABLE IF NOT EXISTS stock_quants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  product_id UUID NOT NULL REFERENCES products(id),
  location_id UUID NOT NULL REFERENCES locations(id),
  lot_id UUID,
  quantity INTEGER NOT NULL DEFAULT 0,
  reserved_quantity INTEGER NOT NULL DEFAULT 0,
  last_moved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, product_id, location_id, lot_id)
);

CREATE INDEX IF NOT EXISTS idx_stock_quants_product ON stock_quants(tenant_id, product_id);
CREATE INDEX IF NOT EXISTS idx_stock_quants_location ON stock_quants(tenant_id, location_id);

-- 在庫移動 / 库存移动
CREATE TABLE IF NOT EXISTS stock_moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  move_number TEXT NOT NULL,
  move_type TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  product_id UUID NOT NULL REFERENCES products(id),
  product_sku TEXT,
  from_location_id UUID REFERENCES locations(id),
  to_location_id UUID REFERENCES locations(id),
  lot_id UUID,
  quantity INTEGER NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  reference_number TEXT,
  reason TEXT,
  executed_by TEXT,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_moves_tenant_created ON stock_moves(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_stock_moves_reference ON stock_moves(reference_type, reference_id);

-- ロット / 批次
CREATE TABLE IF NOT EXISTS lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  product_id UUID NOT NULL REFERENCES products(id),
  lot_number TEXT NOT NULL,
  expiry_date TIMESTAMPTZ,
  manufacturing_date TIMESTAMPTZ,
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, product_id, lot_number)
);

-- 在庫台帳 / 库存台账
CREATE TABLE IF NOT EXISTS inventory_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  product_id UUID NOT NULL REFERENCES products(id),
  product_sku TEXT,
  location_id UUID,
  lot_id UUID,
  type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  reference_type TEXT,
  reference_id TEXT,
  reference_number TEXT,
  reason TEXT,
  executed_by TEXT,
  executed_at TIMESTAMPTZ,
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ledger_tenant_created ON inventory_ledger(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ledger_product ON inventory_ledger(product_id);

-- RLS ポリシー / RLS策略
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_quants ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

-- updated_at 自動更新トリガー / updated_at自动更新触发器
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON warehouses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON stock_quants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON stock_moves FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON lots FOR EACH ROW EXECUTE FUNCTION update_updated_at();
