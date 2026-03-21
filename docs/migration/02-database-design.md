# ZELIXWMS PostgreSQL スキーマ設計

# ZELIXWMS PostgreSQL 数据库设计

> 最終更新 / 最后更新: 2026-03-21

---

## 1. 設計方針 / 设计方针

| 項目 / 项目 | 方針 / 方针 |
|---|---|
| データベース / 数据库 | Supabase (PostgreSQL 15+) |
| 主キー / 主键 | UUID v4 (`gen_random_uuid()`) |
| ORM | Drizzle ORM (TypeScript schema definitions) |
| マルチテナント / 多租户 | `tenant_id` カラム全テーブル + RLS ポリシー |
| タイムスタンプ / 时间戳 | `created_at`, `updated_at` (自動管理 / 自动管理) |
| ソフトデリート / 软删除 | `deleted_at` (nullable timestamp) |
| 文字コード / 字符编码 | UTF-8 (日本語・中国語対応 / 日中对应) |
| JSONB 利用 / JSONB使用 | 柔軟なネスト構造のみ。検索対象フィールドはカラム化 |
| 命名規則 / 命名规则 | snake_case (テーブル名・カラム名) |

### 設計原則 / 设计原则

1. **正規化優先**: MongoDB の埋め込みドキュメント → 別テーブル + FK / MongoDB的嵌入文档 → 独立表 + 外键
2. **JSONB は補助的に利用**: `customFields`, `carrierData`, `marketplaceCodes` 等の動的データのみ / 仅用于动态数据
3. **明示的 FK 制約**: MongoDB の文字列参照 → UUID FK with ON DELETE 制約 / MongoDB字符串引用 → UUID外键约束
4. **Enum → PostgreSQL enum or check**: ステータス等は PG enum で型安全 / 状态等用PG enum保证类型安全

---

## 2. テーブル一覧 / 表一览

### コアドメイン / 核心域

| # | テーブル名 / 表名 | 説明 / 说明 | MongoDB 元 / MongoDB源 |
|---|---|---|---|
| 1 | `tenants` | テナント / 租户 | (新規) |
| 2 | `users` | ユーザー / 用户 | `users` collection |
| 3 | `warehouses` | 倉庫 / 仓库 | `warehouses` collection |
| 4 | `locations` | ロケーション / 库位 | `locations` collection |
| 5 | `products` | 商品マスタ / 商品主数据 | `products` collection |
| 6 | `product_sub_skus` | 子SKU / 子SKU | `products.subSkus[]` embedded |

### 出荷ドメイン / 出库域

| # | テーブル名 / 表名 | 説明 / 说明 | MongoDB 元 / MongoDB源 |
|---|---|---|---|
| 7 | `shipment_orders` | 出荷指示 / 出库指示 | `shipmentorders` collection |
| 8 | `shipment_order_products` | 出荷商品明細 / 出库商品明细 | `shipmentorders.products[]` embedded |
| 9 | `shipment_order_materials` | 出荷耗材 / 出库耗材 | `shipmentorders.materials[]` embedded |

### 入庫ドメイン / 入库域

| # | テーブル名 / 表名 | 説明 / 说明 | MongoDB 元 / MongoDB源 |
|---|---|---|---|
| 10 | `inbound_orders` | 入庫指示 / 入库指示 | `inboundorders` collection |
| 11 | `inbound_order_lines` | 入庫明細 / 入库明细 | `inboundorders.lines[]` embedded |
| 12 | `inbound_service_options` | 入庫作業オプション / 入库作业选项 | `inboundorders.serviceOptions[]` embedded |

### 在庫ドメイン / 库存域

| # | テーブル名 / 表名 | 説明 / 说明 | MongoDB 元 / MongoDB源 |
|---|---|---|---|
| 13 | `stock_quants` | 在庫 / 库存 | `stock_quants` collection |
| 14 | `stock_moves` | 在庫移動 / 库存移动 | `stock_moves` collection |

### 補助ドメイン / 辅助域

| # | テーブル名 / 表名 | 説明 / 说明 | MongoDB 元 / MongoDB源 |
|---|---|---|---|
| 15 | `return_orders` | 返品 / 退货 | `returnorders` collection |
| 16 | `billing_records` | 請求 / 账单 | `billingrecords` collection |
| 17 | `carriers` | 配送業者 / 配送商 | `carriers` collection |

---

## 3. コアテーブル定義 / 核心表定义

### 3.1 tenants (テナント / 租户)

> 新規テーブル。マルチテナント分離の基盤。
> 新增表。多租户隔离的基础。

| カラム / 列 | 型 / 类型 | 制約 / 约束 | 説明 / 说明 |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | テナントID / 租户ID |
| `name` | `varchar(255)` | NOT NULL | テナント名 / 租户名 |
| `slug` | `varchar(100)` | NOT NULL, UNIQUE | URL用スラッグ / URL slug |
| `plan` | `varchar(50)` | DEFAULT `'free'` | プラン / 套餐 |
| `settings` | `jsonb` | DEFAULT `'{}'` | テナント設定 / 租户设置 |
| `is_active` | `boolean` | DEFAULT `true` | 有効フラグ / 有效标志 |
| `created_at` | `timestamptz` | DEFAULT `now()` | 作成日時 / 创建时间 |
| `updated_at` | `timestamptz` | DEFAULT `now()` | 更新日時 / 更新时间 |
| `deleted_at` | `timestamptz` | NULL | 削除日時 / 删除时间 |

**インデックス / 索引**: `idx_tenants_slug` UNIQUE ON (`slug`)

---

### 3.2 users (ユーザー / 用户)

> Supabase Auth (`auth.users`) と連携。`auth_uid` で紐付け。
> 与 Supabase Auth (`auth.users`) 关联。通过 `auth_uid` 绑定。

| カラム / 列 | 型 / 类型 | 制約 / 约束 | 説明 / 说明 |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | ユーザーID / 用户ID |
| `tenant_id` | `uuid` | NOT NULL, FK → `tenants.id` | テナントID / 租户ID |
| `auth_uid` | `uuid` | UNIQUE, FK → `auth.users.id` | Supabase Auth UID |
| `email` | `varchar(255)` | NOT NULL | メール / 邮箱 |
| `display_name` | `varchar(255)` | NOT NULL | 表示名 / 显示名 |
| `role` | `user_role` | NOT NULL, DEFAULT `'viewer'` | ロール / 角色 |
| `client_id` | `uuid` | NULL, FK → `clients.id` | 荷主制限 / 荷主限制 (role=client) |
| `client_name` | `varchar(255)` | NULL | 荷主名キャッシュ / 荷主名缓存 |
| `parent_user_id` | `uuid` | NULL, FK → `users.id` | 親ユーザー / 父用户 |
| `phone` | `varchar(50)` | NULL | 電話 / 电话 |
| `avatar` | `text` | NULL | アバターURL / 头像URL |
| `language` | `varchar(5)` | DEFAULT `'ja'` | 言語 / 语言 (ja/zh/en) |
| `is_active` | `boolean` | DEFAULT `true` | 有効 / 有效 |
| `last_login_at` | `timestamptz` | NULL | 最終ログイン / 最后登录 |
| `login_count` | `integer` | DEFAULT `0` | ログイン回数 / 登录次数 |
| `memo` | `text` | NULL | 備考 / 备注 |
| `created_at` | `timestamptz` | DEFAULT `now()` | 作成日時 / 创建时间 |
| `updated_at` | `timestamptz` | DEFAULT `now()` | 更新日時 / 更新时间 |
| `deleted_at` | `timestamptz` | NULL | 削除日時 / 删除时间 |

```sql
-- Enum 定義 / Enum定义
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'operator', 'viewer', 'client');
```

**インデックス / 索引**:
- `idx_users_tenant` ON (`tenant_id`)
- `idx_users_email` UNIQUE ON (`tenant_id`, `email`)
- `idx_users_auth_uid` UNIQUE ON (`auth_uid`)

---

### 3.3 warehouses (倉庫 / 仓库)

| カラム / 列 | 型 / 类型 | 制約 / 约束 | 説明 / 说明 |
|---|---|---|---|
| `id` | `uuid` | PK | 倉庫ID / 仓库ID |
| `tenant_id` | `uuid` | NOT NULL, FK → `tenants.id` | テナントID / 租户ID |
| `code` | `varchar(50)` | NOT NULL | 倉庫コード / 仓库编码 |
| `name` | `varchar(255)` | NOT NULL | 倉庫名 / 仓库名 |
| `address` | `text` | NULL | 住所 / 地址 |
| `is_active` | `boolean` | DEFAULT `true` | 有効 / 有效 |
| `created_at` | `timestamptz` | DEFAULT `now()` | |
| `updated_at` | `timestamptz` | DEFAULT `now()` | |
| `deleted_at` | `timestamptz` | NULL | |

**インデックス / 索引**: `idx_warehouses_tenant_code` UNIQUE ON (`tenant_id`, `code`)

---

### 3.4 locations (ロケーション / 库位)

| カラム / 列 | 型 / 类型 | 制約 / 约束 | 説明 / 说明 |
|---|---|---|---|
| `id` | `uuid` | PK | ロケーションID / 库位ID |
| `tenant_id` | `uuid` | NOT NULL, FK → `tenants.id` | テナントID / 租户ID |
| `code` | `varchar(100)` | NOT NULL | ロケーションコード / 库位编码 |
| `name` | `varchar(255)` | NOT NULL | ロケーション名 / 库位名 |
| `type` | `location_type` | NOT NULL | 種別 / 类型 |
| `parent_id` | `uuid` | NULL, FK → `locations.id` | 親ロケーション / 父库位 |
| `warehouse_id` | `uuid` | NULL, FK → `warehouses.id` | 所属倉庫 / 所属仓库 |
| `full_path` | `varchar(500)` | DEFAULT `''` | フルパス / 完整路径 |
| `cool_type` | `varchar(2)` | NULL | クール区分 / 温控类型 (0/1/2) |
| `stock_type` | `varchar(2)` | NULL | 在庫種別 / 库存类型 (01-06) |
| `temperature_type` | `varchar(2)` | NULL | 温度帯 / 温度类型 (01-05) |
| `is_active` | `boolean` | DEFAULT `true` | 有効 / 有效 |
| `sort_order` | `integer` | DEFAULT `0` | 表示順 / 排序 |
| `memo` | `text` | NULL | 備考 / 备注 |
| `created_at` | `timestamptz` | DEFAULT `now()` | |
| `updated_at` | `timestamptz` | DEFAULT `now()` | |
| `deleted_at` | `timestamptz` | NULL | |

```sql
CREATE TYPE location_type AS ENUM (
  'warehouse', 'zone', 'shelf', 'bin',
  'staging', 'receiving', 'virtual_supplier', 'virtual_customer'
);
```

**インデックス / 索引**:
- `idx_locations_tenant_code` UNIQUE ON (`tenant_id`, `code`)
- `idx_locations_parent` ON (`parent_id`)
- `idx_locations_warehouse` ON (`warehouse_id`)
- `idx_locations_type` ON (`type`)
- `idx_locations_stock_type` ON (`stock_type`)
- `idx_locations_temperature_type` ON (`temperature_type`)

---

### 3.5 products (商品 / 商品) — LOGIFAST 全フィールド含む

| カラム / 列 | 型 / 类型 | 制約 / 约束 | 説明 / 说明 |
|---|---|---|---|
| **基本 / 基本** | | | |
| `id` | `uuid` | PK | 商品ID / 商品ID |
| `tenant_id` | `uuid` | NOT NULL, FK → `tenants.id` | テナントID / 租户ID |
| `client_id` | `uuid` | NULL, FK → `clients.id` | 所属顧客 / 所属客户 |
| `sub_client_id` | `uuid` | NULL | 所属子顧客 / 所属子客户 |
| `shop_id` | `uuid` | NULL | 所属店舗 / 所属店铺 |
| `sku` | `varchar(100)` | NOT NULL | SKUコード / SKU编码 |
| `name` | `varchar(500)` | NOT NULL | 商品名 / 商品名 |
| `name_full` | `varchar(1000)` | NULL | 正式商品名 / 完整商品名 |
| `name_en` | `varchar(500)` | NULL | 英語商品名 / 英文商品名 |
| `barcode` | `text[]` | DEFAULT `'{}'` | バーコード配列 / 条码数组 |
| `jan_code` | `varchar(50)` | NULL | JANコード / JAN码 |
| `image_url` | `text` | NULL | 商品画像URL / 商品图片URL |
| `category` | `varchar(100)` | DEFAULT `'0'` | カテゴリ / 类别 |
| `memo` | `text` | NULL | 備考 / 备注 |
| **価格 / 价格** | | | |
| `price` | `numeric(12,2)` | NULL | 販売価格 / 销售价格 |
| `cost_price` | `numeric(12,2)` | NULL | 原価 / 成本价 |
| `currency` | `varchar(3)` | NULL | 通貨 (1:JPY/2:RMB/3:USD) / 货币 |
| `tax_type` | `varchar(2)` | NULL | 税区分 (01:課税/02:非課税) / 税类型 |
| `tax_rate` | `numeric(5,2)` | NULL | 税率(%) / 税率 |
| `paid_type` | `varchar(1)` | DEFAULT `'0'` | 有償無償 (0:無償/1:有償) / 有偿无偿 |
| **寸法・重量 / 尺寸・重量** | | | |
| `width` | `numeric(10,2)` | NULL | 幅(cm) / 宽 |
| `depth` | `numeric(10,2)` | NULL | 奥行(cm) / 深 |
| `height` | `numeric(10,2)` | NULL | 高さ(cm) / 高 |
| `weight` | `numeric(10,3)` | NULL | 重量(kg) / 重量 |
| `volume` | `numeric(12,6)` | NULL | 容積(M3) / 体积 |
| `gross_weight` | `numeric(10,3)` | NULL | 総重量G/W(kg) / 毛重 |
| **外箱 / 外箱** | | | |
| `outer_box_width` | `numeric(10,2)` | NULL | 外箱幅(cm) / 外箱宽 |
| `outer_box_depth` | `numeric(10,2)` | NULL | 外箱奥行(cm) / 外箱深 |
| `outer_box_height` | `numeric(10,2)` | NULL | 外箱高さ(cm) / 外箱高 |
| `outer_box_volume` | `numeric(12,6)` | NULL | 外箱容積(M3) / 外箱体积 |
| `outer_box_weight` | `numeric(10,3)` | NULL | 外箱重量(kg) / 外箱重量 |
| **配送 / 配送** | | | |
| `cool_type` | `varchar(2)` | NULL | クール区分 (0/1/2) / 温控类型 |
| `shipping_size_code` | `varchar(10)` | NULL | 配送サイズ (SS/60/80/.../260) / 配送尺寸 |
| `hazardous_type` | `varchar(1)` | DEFAULT `'0'` | 危険区分 (0:一般/1:危険) / 危险品 |
| `air_transport_ban` | `boolean` | DEFAULT `false` | 航空搭載禁止 / 禁止航空 |
| **メール便 / 邮件便** | | | |
| `mail_calc_enabled` | `boolean` | DEFAULT `false` | メール便計算 / 邮件便计算 |
| `mail_calc_max_quantity` | `integer` | NULL | メール便最大数量 / 最大数量 |
| **在庫管理 / 库存管理** | | | |
| `inventory_enabled` | `boolean` | DEFAULT `false` | 在庫管理有効 / 启用库存管理 |
| `lot_tracking_enabled` | `boolean` | DEFAULT `false` | ロット管理 / 批次管理 |
| `expiry_tracking_enabled` | `boolean` | DEFAULT `false` | 期限管理 / 有效期管理 |
| `alert_days_before_expiry` | `integer` | DEFAULT `30` | 期限アラート日数 / 过期预警天数 |
| `serial_tracking_enabled` | `boolean` | DEFAULT `false` | シリアルNo管理 / 序列号管理 |
| `inbound_expiry_days` | `integer` | NULL | 入庫期限日数 / 入库有效期天数 |
| `allocation_rule` | `varchar(4)` | DEFAULT `'FIFO'` | 引当規則 (FIFO/FEFO/LIFO) / 分配规则 |
| `default_location_id` | `uuid` | NULL, FK → `locations.id` | デフォルトロケーション / 默认库位 |
| `safety_stock` | `integer` | DEFAULT `0` | 安全在庫 / 安全库存 |
| `case_quantity` | `integer` | NULL | ケース入数 / 每箱数量 |
| **取扱い / 处理** | | | |
| `handling_types` | `text[]` | DEFAULT `'{}'` | 荷扱いタイプ / 荷扱い类型 |
| `default_handling_tags` | `text[]` | DEFAULT `'{}'` | デフォルト荷扱い / 默认荷扱い标签 |
| `barcode_commission` | `boolean` | DEFAULT `false` | バーコード委託 / 条码委托贴付 |
| `reservation_target` | `boolean` | DEFAULT `false` | 予約対象 / 预约对象 |
| **LOGIFAST ブランド・属性 / 品牌・属性** | | | |
| `customer_product_code` | `varchar(100)` | NULL | 顧客商品コード / 客户商品编码 |
| `brand_code` | `varchar(50)` | NULL | ブランドコード / 品牌编码 |
| `brand_name` | `varchar(255)` | NULL | ブランド名 / 品牌名 |
| `size_name` | `varchar(100)` | NULL | サイズ名 / 尺码名 |
| `color_name` | `varchar(100)` | NULL | カラー名 / 颜色名 |
| `unit_type` | `varchar(2)` | NULL | 単位区分 (01-05) / 单位类型 |
| `country_of_origin` | `varchar(100)` | NULL | 原産国 / 原产国 |
| **仕入先 / 供货商** | | | |
| `supplier_code` | `varchar(100)` | NULL | 仕入先コード / 供货商编码 |
| `supplier_name` | `varchar(255)` | NULL | 仕入先名 / 供货商名 |
| **EC モール / 电商平台** | | | |
| `fnsku` | `varchar(50)` | NULL | Amazon FNSKU |
| `asin` | `varchar(20)` | NULL | Amazon ASIN |
| `amazon_sku` | `varchar(100)` | NULL | Amazon出品者SKU / Amazon卖家SKU |
| `fba_enabled` | `boolean` | DEFAULT `false` | FBA対応 / FBA对应 |
| `rakuten_sku` | `varchar(100)` | NULL | 楽天SKU / 乐天SKU |
| `rsl_enabled` | `boolean` | DEFAULT `false` | RSL対応 / RSL对应 |
| `marketplace_codes` | `jsonb` | DEFAULT `'{}'` | モール別商品コード / 平台商品编码 |
| `wholesale_partner_codes` | `jsonb` | DEFAULT `'{}'` | 卸先別商品コード / 批发商编码 |
| **カスタム / 自定义** | | | |
| `custom_field_1` | `varchar(500)` | NULL | カスタム1 / 自定义1 |
| `custom_field_2` | `varchar(500)` | NULL | カスタム2 / 自定义2 |
| `custom_field_3` | `varchar(500)` | NULL | カスタム3 / 自定义3 |
| `custom_field_4` | `varchar(500)` | NULL | カスタム4 / 自定义4 |
| `custom_fields` | `jsonb` | DEFAULT `'{}'` | 動的カスタムフィールド / 动态自定义字段 |
| `remarks` | `text[]` | DEFAULT `'{}'` | 備考（複数）/ 备注（多条） |
| **倉庫メモ / 仓库备注** | | | |
| `wh_preferred_location` | `varchar(255)` | NULL | 推奨ロケーション / 推荐库位 |
| `wh_handling_notes` | `text` | NULL | 特殊取扱注意 / 特殊处理备注 |
| `wh_is_fragile` | `boolean` | DEFAULT `false` | 壊れ物 / 易碎 |
| `wh_is_liquid` | `boolean` | DEFAULT `false` | 液体 / 液体 |
| `wh_requires_opp_bag` | `boolean` | DEFAULT `false` | OPP袋要 / 需要OPP袋 |
| `wh_requires_suffocation_label` | `boolean` | DEFAULT `false` | 窒息防止ラベル / 防窒息标 |
| `wh_storage_type` | `varchar(10)` | DEFAULT `'ambient'` | 保管温度帯 / 保管温度 |
| **タイムスタンプ / 时间戳** | | | |
| `created_at` | `timestamptz` | DEFAULT `now()` | |
| `updated_at` | `timestamptz` | DEFAULT `now()` | |
| `deleted_at` | `timestamptz` | NULL | |

**インデックス / 索引**:
- `idx_products_tenant_sku` UNIQUE ON (`tenant_id`, `sku`) WHERE `deleted_at IS NULL`
- `idx_products_tenant_client` ON (`tenant_id`, `client_id`)
- `idx_products_tenant_shop` ON (`tenant_id`, `shop_id`)
- `idx_products_tenant_shop_sku` ON (`tenant_id`, `shop_id`, `sku`)
- `idx_products_tenant_customer_code` ON (`tenant_id`, `customer_product_code`)
- `idx_products_tenant_brand` ON (`tenant_id`, `brand_code`)
- `idx_products_barcode` GIN ON (`barcode`)
- `idx_products_jan_code` ON (`jan_code`) WHERE `jan_code IS NOT NULL`

> **注意 / 注意**: MongoDB の `warehouseNotes` 埋め込みドキュメントは `wh_` プレフィックスのフラットカラムに展開。
> MongoDB的 `warehouseNotes` 嵌入文档展开为 `wh_` 前缀的平铺列。

---

### 3.5.1 product_sub_skus (子SKU / 子SKU)

> MongoDB の `products.subSkus[]` 埋め込み配列 → 正規化テーブル。
> MongoDB 的 `products.subSkus[]` 嵌入数组 → 正规化表。

| カラム / 列 | 型 / 类型 | 制約 / 约束 | 説明 / 说明 |
|---|---|---|---|
| `id` | `uuid` | PK | 子SKU ID |
| `tenant_id` | `uuid` | NOT NULL, FK → `tenants.id` | テナントID / 租户ID |
| `product_id` | `uuid` | NOT NULL, FK → `products.id` ON DELETE CASCADE | 親商品 / 父商品 |
| `sub_sku` | `varchar(100)` | NOT NULL | 子SKUコード / 子SKU编码 |
| `price` | `numeric(12,2)` | NULL | 子SKU価格 / 子SKU价格 |
| `description` | `text` | NULL | 説明 / 说明 |
| `is_active` | `boolean` | DEFAULT `true` | 有効 / 有效 |
| `created_at` | `timestamptz` | DEFAULT `now()` | |

**インデックス / 索引**:
- `idx_sub_skus_tenant_sku` UNIQUE ON (`tenant_id`, `sub_sku`) WHERE `is_active = true`
- `idx_sub_skus_product` ON (`product_id`)

---

### 3.6 shipment_orders (出荷指示 / 出库指示)

| カラム / 列 | 型 / 类型 | 制約 / 约束 | 説明 / 说明 |
|---|---|---|---|
| `id` | `uuid` | PK | 出荷指示ID / 出库指示ID |
| `tenant_id` | `uuid` | NOT NULL, FK → `tenants.id` | テナントID / 租户ID |
| `order_number` | `varchar(100)` | NOT NULL | 注文番号 / 订单号 |
| `destination_type` | `varchar(10)` | NULL | 出荷先タイプ (B2C/B2B/FBA/RSL) / 出货类型 |
| `fba_shipment_id` | `varchar(100)` | NULL | FBA入庫プランID / FBA入库计划ID |
| `fba_destination` | `varchar(20)` | NULL | FBA倉庫コード / FBA仓库代码 |
| **ステータス / 状态** | | | |
| `carrier_receipt_received` | `boolean` | DEFAULT `false` | 配送業者受付済 / 配送商已受理 |
| `carrier_receipt_at` | `timestamptz` | NULL | 受付日時 / 受理时间 |
| `is_confirmed` | `boolean` | DEFAULT `false` | 確認済 / 已确认 |
| `confirmed_at` | `timestamptz` | NULL | 確認日時 / 确认时间 |
| `is_printed` | `boolean` | DEFAULT `false` | 印刷済 / 已打印 |
| `printed_at` | `timestamptz` | NULL | 印刷日時 / 打印时间 |
| `is_inspected` | `boolean` | DEFAULT `false` | 検品済 / 已检品 |
| `inspected_at` | `timestamptz` | NULL | 検品日時 / 检品时间 |
| `is_shipped` | `boolean` | DEFAULT `false` | 出荷済 / 已出荷 |
| `shipped_at` | `timestamptz` | NULL | 出荷日時 / 出荷时间 |
| `is_ec_exported` | `boolean` | DEFAULT `false` | EC連携済 / EC已同步 |
| `ec_exported_at` | `timestamptz` | NULL | EC連携日時 / EC同步时间 |
| **注文情報 / 订单信息** | | | |
| `source_order_at` | `timestamptz` | NULL | 元注文日時 / 原始订单时间 |
| `carrier_id` | `uuid` | NULL, FK → `carriers.id` | 配送業者ID / 配送商ID |
| `customer_management_number` | `varchar(255)` | NOT NULL | 顧客管理番号 / 客户管理号 |
| `tracking_id` | `varchar(100)` | NULL | 伝票番号 / 追踪号 |
| **注文者 / 下单人** | | | |
| `orderer` | `jsonb` | NULL | 注文者住所 / 下单人地址 |
| **送付先 / 收件人** | | | |
| `recipient_postal_code` | `varchar(10)` | NOT NULL | 郵便番号 / 邮编 |
| `recipient_prefecture` | `varchar(20)` | NOT NULL | 都道府県 / 都道府县 |
| `recipient_city` | `varchar(100)` | NOT NULL | 市区町村 / 市区町村 |
| `recipient_street` | `varchar(255)` | NOT NULL | 町番地 / 街道 |
| `recipient_building` | `varchar(255)` | DEFAULT `''` | 建物名 / 建筑名 |
| `recipient_name` | `varchar(255)` | NOT NULL | 宛名 / 收件人名 |
| `recipient_phone` | `varchar(30)` | NOT NULL | 電話 / 电话 |
| `honorific` | `varchar(10)` | DEFAULT `'様'` | 敬称 / 敬称 |
| **依頼主 / 发货人** | | | |
| `sender_postal_code` | `varchar(10)` | NOT NULL | 依頼主郵便番号 / 发货人邮编 |
| `sender_prefecture` | `varchar(20)` | NOT NULL | 依頼主都道府県 / 发货人都道府县 |
| `sender_city` | `varchar(100)` | NOT NULL | 依頼主市区 / 发货人市区 |
| `sender_street` | `varchar(255)` | NOT NULL | 依頼主町番地 / 发货人街道 |
| `sender_building` | `varchar(255)` | DEFAULT `''` | 依頼主建物 / 发货人建筑 |
| `sender_name` | `varchar(255)` | NOT NULL | 依頼主名 / 发货人名 |
| `sender_phone` | `varchar(30)` | NOT NULL | 依頼主電話 / 发货人电话 |
| **配送 / 配送** | | | |
| `ship_plan_date` | `date` | NOT NULL | 出荷予定日 / 出荷预定日 |
| `invoice_type` | `varchar(50)` | NOT NULL | 伝票種別 / 单据类型 |
| `cool_type` | `varchar(2)` | NULL | クール区分 / 温控 |
| `delivery_time_slot` | `varchar(50)` | NULL | 配達時間帯 / 送达时间段 |
| `delivery_date_preference` | `varchar(50)` | NULL | 配達希望日 / 希望送达日 |
| `handling_tags` | `text[]` | DEFAULT `'{}'` | 荷扱いタグ / 荷扱い标签 |
| `order_source_company_id` | `uuid` | NULL | 依頼主会社ID / 委托方ID |
| `order_group_id` | `varchar(100)` | NULL | 出荷グループID / 出荷组ID |
| **コスト / 费用** | | | |
| `shipping_cost` | `numeric(10,2)` | NULL | 配送料金 / 配送费用 |
| `shipping_cost_breakdown` | `jsonb` | NULL | 配送料金内訳 / 费用明细 |
| `cost_source` | `varchar(10)` | NULL | 料金ソース (auto/manual/import) / 费用来源 |
| `cost_calculated_at` | `timestamptz` | NULL | 料金計算日時 / 费用计算时间 |
| `cost_summary` | `jsonb` | NULL | コスト集計 / 成本汇总 |
| **メタ / 元数据** | | | |
| `products_meta` | `jsonb` | NULL | 商品集約情報 / 商品聚合信息 |
| `carrier_data` | `jsonb` | NULL | 配送業者固有データ / 配送商特有数据 |
| `source_raw_rows` | `jsonb` | NULL | 元データ / 原始数据 |
| `carrier_raw_row` | `jsonb` | NULL | 配送業者元データ / 配送商原始数据 |
| `internal_record` | `jsonb` | DEFAULT `'[]'` | 操作記録 / 操作记录 |
| `custom_fields` | `jsonb` | DEFAULT `'{}'` | カスタムフィールド / 自定义字段 |
| **タイムスタンプ / 时间戳** | | | |
| `created_at` | `timestamptz` | DEFAULT `now()` | |
| `updated_at` | `timestamptz` | DEFAULT `now()` | |
| `deleted_at` | `timestamptz` | NULL | |

**インデックス / 索引**:
- `idx_shipment_tenant_order` UNIQUE ON (`tenant_id`, `order_number`) WHERE `deleted_at IS NULL`
- `idx_shipment_tenant_date` ON (`tenant_id`, `ship_plan_date`)
- `idx_shipment_tracking` ON (`tracking_id`) WHERE `tracking_id IS NOT NULL`
- `idx_shipment_carrier` ON (`carrier_id`)
- `idx_shipment_confirmed` ON (`tenant_id`, `is_confirmed`, `is_shipped`)
- `idx_shipment_group` ON (`order_group_id`) WHERE `order_group_id IS NOT NULL`

---

### 3.7 shipment_order_products (出荷商品明細 / 出库商品明细)

> MongoDB の `shipmentorders.products[]` 埋め込み配列 → 正規化テーブル。
> MongoDB 的 `shipmentorders.products[]` 嵌入数组 → 正规化表。

| カラム / 列 | 型 / 类型 | 制約 / 约束 | 説明 / 说明 |
|---|---|---|---|
| `id` | `uuid` | PK | 明細ID / 明细ID |
| `shipment_order_id` | `uuid` | NOT NULL, FK → `shipment_orders.id` ON DELETE CASCADE | 出荷指示ID / 出库指示ID |
| `input_sku` | `varchar(100)` | NOT NULL | 入力SKU / 输入SKU |
| `quantity` | `integer` | NOT NULL, CHECK > 0 | 数量 / 数量 |
| `product_id` | `uuid` | NULL, FK → `products.id` | 親商品ID / 父商品ID |
| `product_sku` | `varchar(100)` | NULL | 親商品SKU / 父商品SKU |
| `product_name` | `varchar(500)` | NULL | 商品名 / 商品名 |
| `matched_sub_sku` | `jsonb` | NULL | 子SKUマッチ情報 / 子SKU匹配信息 |
| `image_url` | `text` | NULL | 商品画像 / 商品图片 |
| `barcode` | `text[]` | NULL | 検品コード / 检品条码 |
| `cool_type` | `varchar(2)` | NULL | クール区分 / 温控 |
| `mail_calc_enabled` | `boolean` | NULL | メール便計算 / 邮件便 |
| `mail_calc_max_quantity` | `integer` | NULL | メール便最大数量 / 最大数量 |
| `unit_price` | `numeric(12,2)` | NULL | 単価 / 单价 |
| `subtotal` | `numeric(12,2)` | NULL | 小計 / 小计 |
| `sort_order` | `integer` | DEFAULT `0` | 表示順 / 排序 |

**インデックス / 索引**:
- `idx_sop_shipment` ON (`shipment_order_id`)
- `idx_sop_product` ON (`product_id`)

---

### 3.8 inbound_orders (入庫指示 / 入库指示)

| カラム / 列 | 型 / 类型 | 制約 / 约束 | 説明 / 说明 |
|---|---|---|---|
| `id` | `uuid` | PK | 入庫指示ID / 入库指示ID |
| `tenant_id` | `uuid` | NOT NULL, FK → `tenants.id` | テナントID / 租户ID |
| `order_number` | `varchar(100)` | NOT NULL | 入庫番号 / 入库号 |
| `status` | `inbound_order_status` | NOT NULL, DEFAULT `'draft'` | ステータス / 状态 |
| `flow_type` | `varchar(20)` | DEFAULT `'standard'` | フロータイプ / 流程类型 |
| `destination_location_id` | `uuid` | NOT NULL, FK → `locations.id` | 入庫先 / 入库目的地 |
| `destination_type` | `varchar(10)` | NULL | 出荷先タイプ (fba/rsl/b2b) / 出货类型 |
| **仕入先 / 供货商** | | | |
| `supplier_name` | `varchar(255)` | NULL | 仕入先名 / 供货商名 |
| `supplier_code` | `varchar(100)` | NULL | 仕入先コード / 供货商编码 |
| `supplier_memo` | `text` | NULL | 仕入先備考 / 供货商备注 |
| `supplier_phone` | `varchar(50)` | NULL | 仕入先電話 / 供货商电话 |
| `supplier_postal_code` | `varchar(10)` | NULL | 仕入先郵便番号 / 供货商邮编 |
| `supplier_address` | `text` | NULL | 仕入先住所 / 供货商地址 |
| **日時 / 日期** | | | |
| `expected_date` | `date` | NULL | 入庫予定日 / 预计入库日 |
| `requested_date` | `date` | NULL | 入庫希望日 / 希望入库日 |
| `completed_at` | `timestamptz` | NULL | 完了日時 / 完成时间 |
| `actual_arrival_date` | `date` | NULL | 実到着日 / 实际到货日 |
| `arrived_at` | `timestamptz` | NULL | 受付完了日時 / 受付完成时间 |
| **顧客 / 客户** | | | |
| `client_id` | `uuid` | NULL, FK → `clients.id` | 顧客ID / 客户ID |
| `client_name` | `varchar(255)` | NULL | 顧客名 / 客户名 |
| `sub_client_id` | `uuid` | NULL | 子顧客ID / 子客户ID |
| `sub_client_name` | `varchar(255)` | NULL | 子顧客名 / 子客户名 |
| `shop_id` | `uuid` | NULL | 店舗ID / 店铺ID |
| `shop_name` | `varchar(255)` | NULL | 店舗名 / 店铺名 |
| **LOGIFAST / LOGIFAST** | | | |
| `container_type` | `varchar(20)` | NULL | コンテナタイプ / 集装箱类型 |
| `cubic_meters` | `numeric(10,3)` | NULL | 立方数(M3) / 体积 |
| `pallet_count` | `integer` | NULL | パレット数 / 托盘数 |
| `inner_box_count` | `integer` | NULL | インナー箱数 / 内箱数 |
| `import_batch_number` | `varchar(100)` | NULL | 取込管理番号 / 导入批次号 |
| `import_batch_date` | `date` | NULL | 取込管理日 / 导入批次日期 |
| **到着 / 到货** | | | |
| `total_box_count` | `integer` | NULL | 総箱数 / 总箱数 |
| `actual_box_count` | `integer` | NULL | 実受領箱数 / 实收箱数 |
| `total_weight` | `numeric(10,3)` | NULL | 総重量(kg) / 总重量 |
| `received_by` | `varchar(255)` | NULL | 受付担当 / 受付人员 |
| **配送 / 配送** | | | |
| `shipping_method` | `varchar(20)` | NULL | 配送方式 (truck/parcel) / 配送方法 |
| `tracking_numbers` | `jsonb` | NULL | 追跡番号 / 追踪号 |
| **その他 / 其他** | | | |
| `linked_order_ids` | `uuid[]` | NULL | 紐付く出荷IDs / 关联出库IDs |
| `purchase_order_number` | `varchar(100)` | NULL | PO番号 / PO号 |
| `purchase_order_date` | `date` | NULL | PO日付 / PO日期 |
| `memo` | `text` | NULL | 備考 / 备注 |
| `created_by` | `varchar(255)` | NULL | 作成者 / 创建者 |
| `fba_info` | `jsonb` | NULL | FBA情報 / FBA信息 |
| `rsl_info` | `jsonb` | NULL | RSL情報 / RSL信息 |
| `b2b_info` | `jsonb` | NULL | B2B情報 / B2B信息 |
| `variance_report` | `jsonb` | NULL | 差異明細 / 差异明细 |
| `created_at` | `timestamptz` | DEFAULT `now()` | |
| `updated_at` | `timestamptz` | DEFAULT `now()` | |
| `deleted_at` | `timestamptz` | NULL | |

```sql
CREATE TYPE inbound_order_status AS ENUM (
  'draft', 'confirmed', 'arrived', 'processing',
  'awaiting_label', 'ready_to_ship', 'shipped',
  'receiving', 'received', 'done', 'cancelled'
);
```

**インデックス / 索引**:
- `idx_inbound_tenant_order` UNIQUE ON (`tenant_id`, `order_number`) WHERE `deleted_at IS NULL`
- `idx_inbound_tenant_status` ON (`tenant_id`, `status`)
- `idx_inbound_tenant_date` ON (`tenant_id`, `expected_date`)
- `idx_inbound_client` ON (`client_id`)

---

### 3.9 inbound_order_lines (入庫明細 / 入库明细)

| カラム / 列 | 型 / 类型 | 制約 / 约束 | 説明 / 说明 |
|---|---|---|---|
| `id` | `uuid` | PK | 明細ID / 明细ID |
| `inbound_order_id` | `uuid` | NOT NULL, FK → `inbound_orders.id` ON DELETE CASCADE | 入庫指示ID / 入库指示ID |
| `line_number` | `integer` | NOT NULL | 行番号 / 行号 |
| `product_id` | `uuid` | NOT NULL, FK → `products.id` | 商品ID / 商品ID |
| `product_sku` | `varchar(100)` | NOT NULL | 商品SKU / 商品SKU |
| `product_name` | `varchar(500)` | NULL | 商品名 / 商品名 |
| `expected_quantity` | `integer` | NOT NULL | 予定数量 / 预计数量 |
| `received_quantity` | `integer` | DEFAULT `0` | 受領数量 / 实收数量 |
| `lot_id` | `uuid` | NULL | ロットID / 批次ID |
| `lot_number` | `varchar(100)` | NULL | ロット番号 / 批次号 |
| `expiry_date` | `date` | NULL | 有効期限 / 有效期 |
| `location_id` | `uuid` | NULL, FK → `locations.id` | ロケーション / 库位 |
| `putaway_location_id` | `uuid` | NULL, FK → `locations.id` | 格納先 / 上架库位 |
| `putaway_quantity` | `integer` | DEFAULT `0` | 格納数量 / 上架数量 |
| `stock_category` | `varchar(10)` | DEFAULT `'new'` | 在庫区分 (new/damaged) / 库存类型 |
| `order_reference_number` | `varchar(100)` | NULL | 注文参照番号 / 订单参考号 |
| `memo` | `text` | NULL | 備考 / 备注 |
| **LOGIFAST / LOGIFAST** | | | |
| `expected_case_count` | `integer` | NULL | 予定ケース数 / 预定箱数 |
| `received_case_count` | `integer` | NULL | 実績ケース数 / 实际箱数 |
| `case_unit_type` | `varchar(2)` | NULL | ケース単位 (01-05) / 箱单位类型 |
| `case_unit_quantity` | `integer` | NULL | ケース入数 / 每箱数量 |
| `customer_product_code` | `varchar(100)` | NULL | 顧客商品コード / 客户商品编码 |
| `inspection_code` | `varchar(100)` | NULL | 検品コード / 检品编码 |

**インデックス / 索引**:
- `idx_iol_inbound` ON (`inbound_order_id`)
- `idx_iol_product` ON (`product_id`)
- `idx_iol_line_unique` UNIQUE ON (`inbound_order_id`, `line_number`)

---

### 3.10 stock_quants (在庫 / 库存)

| カラム / 列 | 型 / 类型 | 制約 / 约束 | 説明 / 说明 |
|---|---|---|---|
| `id` | `uuid` | PK | 在庫ID / 库存ID |
| `tenant_id` | `uuid` | NOT NULL, FK → `tenants.id` | テナントID / 租户ID |
| `product_id` | `uuid` | NOT NULL, FK → `products.id` | 商品ID / 商品ID |
| `product_sku` | `varchar(100)` | NOT NULL | 商品SKU (検索最適化) / 商品SKU(搜索优化) |
| `location_id` | `uuid` | NOT NULL, FK → `locations.id` | ロケーションID / 库位ID |
| `lot_id` | `uuid` | NULL | ロットID / 批次ID |
| `quantity` | `integer` | NOT NULL, DEFAULT `0` | 現在庫数 / 当前库存 |
| `reserved_quantity` | `integer` | NOT NULL, DEFAULT `0` | 引当数 / 已预留数 |
| `last_moved_at` | `timestamptz` | NULL | 最終移動日時 / 最后移动时间 |
| `created_at` | `timestamptz` | DEFAULT `now()` | |
| `updated_at` | `timestamptz` | DEFAULT `now()` | |

**インデックス / 索引**:
- `idx_sq_unique` UNIQUE ON (`product_id`, `location_id`, `lot_id`) — `lot_id` が NULL の場合は COALESCE で対応
- `idx_sq_product` ON (`product_id`)
- `idx_sq_location` ON (`location_id`)
- `idx_sq_lot` ON (`lot_id`) WHERE `lot_id IS NOT NULL`
- `idx_sq_sku` ON (`product_sku`)
- `idx_sq_product_qty` ON (`product_id`, `quantity`) WHERE `quantity > 0` — 引当用部分インデックス / 分配用部分索引
- `idx_sq_tenant_product_location` ON (`tenant_id`, `product_id`, `location_id`)

---

### 3.11 stock_moves (在庫移動 / 库存移动)

| カラム / 列 | 型 / 类型 | 制約 / 约束 | 説明 / 说明 |
|---|---|---|---|
| `id` | `uuid` | PK | 移動ID / 移动ID |
| `tenant_id` | `uuid` | NOT NULL, FK → `tenants.id` | テナントID / 租户ID |
| `product_id` | `uuid` | NOT NULL, FK → `products.id` | 商品ID / 商品ID |
| `from_location_id` | `uuid` | NULL, FK → `locations.id` | 移動元 / 源库位 |
| `to_location_id` | `uuid` | NULL, FK → `locations.id` | 移動先 / 目标库位 |
| `quantity` | `integer` | NOT NULL | 移動数量 / 移动数量 |
| `move_type` | `varchar(30)` | NOT NULL | 移動タイプ / 移动类型 |
| `reference_type` | `varchar(30)` | NULL | 参照タイプ (inbound/shipment/return) / 参照类型 |
| `reference_id` | `uuid` | NULL | 参照先ID / 参照ID |
| `lot_id` | `uuid` | NULL | ロットID / 批次ID |
| `performed_by` | `uuid` | NULL, FK → `users.id` | 実行者 / 执行者 |
| `memo` | `text` | NULL | 備考 / 备注 |
| `created_at` | `timestamptz` | DEFAULT `now()` | |

**インデックス / 索引**:
- `idx_sm_tenant_created` ON (`tenant_id`, `created_at`)
- `idx_sm_product` ON (`product_id`)
- `idx_sm_reference` ON (`reference_type`, `reference_id`)

---

### 3.12 return_orders (返品 / 退货)

| カラム / 列 | 型 / 类型 | 制約 / 约束 | 説明 / 说明 |
|---|---|---|---|
| `id` | `uuid` | PK | 返品ID / 退货ID |
| `tenant_id` | `uuid` | NOT NULL, FK → `tenants.id` | テナントID / 租户ID |
| `order_number` | `varchar(100)` | NOT NULL | 返品番号 / 退货号 |
| `shipment_order_id` | `uuid` | NULL, FK → `shipment_orders.id` | 元出荷指示 / 原出库指示 |
| `status` | `varchar(30)` | NOT NULL, DEFAULT `'pending'` | ステータス / 状态 |
| `reason` | `text` | NULL | 返品理由 / 退货原因 |
| `lines` | `jsonb` | NOT NULL, DEFAULT `'[]'` | 返品明細 / 退货明细 |
| `memo` | `text` | NULL | 備考 / 备注 |
| `created_at` | `timestamptz` | DEFAULT `now()` | |
| `updated_at` | `timestamptz` | DEFAULT `now()` | |
| `deleted_at` | `timestamptz` | NULL | |

---

### 3.13 billing_records (請求 / 账单)

| カラム / 列 | 型 / 类型 | 制約 / 约束 | 説明 / 说明 |
|---|---|---|---|
| `id` | `uuid` | PK | 請求ID / 账单ID |
| `tenant_id` | `uuid` | NOT NULL, FK → `tenants.id` | テナントID / 租户ID |
| `client_id` | `uuid` | NULL | 顧客ID / 客户ID |
| `billing_period_start` | `date` | NOT NULL | 請求期間開始 / 账单期间开始 |
| `billing_period_end` | `date` | NOT NULL | 請求期間終了 / 账单期间结束 |
| `total_amount` | `numeric(12,2)` | NOT NULL | 合計金額 / 总金额 |
| `currency` | `varchar(3)` | DEFAULT `'JPY'` | 通貨 / 货币 |
| `status` | `varchar(20)` | DEFAULT `'draft'` | ステータス / 状态 |
| `line_items` | `jsonb` | DEFAULT `'[]'` | 明細 / 明细 |
| `memo` | `text` | NULL | 備考 / 备注 |
| `created_at` | `timestamptz` | DEFAULT `now()` | |
| `updated_at` | `timestamptz` | DEFAULT `now()` | |

---

### 3.14 carriers (配送業者 / 配送商)

| カラム / 列 | 型 / 类型 | 制約 / 约束 | 説明 / 说明 |
|---|---|---|---|
| `id` | `uuid` | PK | 配送業者ID / 配送商ID |
| `tenant_id` | `uuid` | NOT NULL, FK → `tenants.id` | テナントID / 租户ID |
| `code` | `varchar(50)` | NOT NULL | 業者コード / 配送商编码 |
| `name` | `varchar(255)` | NOT NULL | 業者名 / 配送商名 |
| `carrier_type` | `varchar(30)` | NOT NULL | 業者タイプ / 配送商类型 |
| `settings` | `jsonb` | DEFAULT `'{}'` | 業者設定 / 配送商设置 |
| `is_active` | `boolean` | DEFAULT `true` | 有効 / 有效 |
| `created_at` | `timestamptz` | DEFAULT `now()` | |
| `updated_at` | `timestamptz` | DEFAULT `now()` | |

---

## 4. MongoDB → PostgreSQL マッピング / 映射

### パターン対照表 / 模式对照表

| MongoDB パターン / MongoDB模式 | PostgreSQL 変換 / PostgreSQL转换 | 例 / 示例 |
|---|---|---|
| `ObjectId` PK | `uuid` PK with `gen_random_uuid()` | `_id` → `id` |
| `ObjectId` ref | `uuid` FK with constraint | `productId` → `product_id uuid FK` |
| 文字列 ref (tenantId) | `uuid` FK with constraint | `tenantId: String` → `tenant_id uuid FK` |
| 埋め込みドキュメント / 嵌入文档 | 別テーブル or フラットカラム / 独立表或平铺列 | `warehouseNotes{}` → `wh_*` columns |
| 埋め込み配列 / 嵌入数组 | 子テーブル / 子表 | `products[]` → `shipment_order_products` |
| `Mixed` / `Map<string,string>` | `jsonb` | `marketplaceCodes` → `jsonb` |
| `[String]` 配列 / 数组 | `text[]` (PG array) | `barcode: [String]` → `barcode text[]` |
| `timestamps: true` | `created_at`, `updated_at` triggers | 自動管理 / 自动管理 |
| Mongoose enum | PostgreSQL `CREATE TYPE ... AS ENUM` | `UserRole` → `user_role` |
| Compound unique index | UNIQUE constraint (partial index) | `{tenantId, sku}` → partial unique |
| Partial filter index | `WHERE` clause on index | `quantity > 0` partial index |

### キー差分 / 关键差异

1. **`products.subSkus[]`**: MongoDB embedded array → `product_sub_skus` テーブル。`_allSku` 計算フィールドは DB trigger または application-level で実現。
   MongoDB嵌入数组 → `product_sub_skus` 表。`_allSku` 计算字段通过DB trigger或应用层实现。

2. **`shipmentorders.products[]`**: MongoDB embedded → `shipment_order_products` テーブル。`_productsMeta` は DB generated column or materialized view。
   MongoDB嵌入 → `shipment_order_products` 表。`_productsMeta` 通过DB生成列或物化视图实现。

3. **`shipmentorders.status{}`**: MongoDB nested status object → フラット boolean + timestamp カラム。クエリ性能向上。
   MongoDB嵌套状态对象 → 平铺 boolean + timestamp 列。提升查询性能。

4. **`inboundorders.lines[]`**: MongoDB embedded → `inbound_order_lines` テーブル。
   MongoDB嵌入 → `inbound_order_lines` 表。

5. **Address fields**: MongoDB `addressSchema` subdocument → フラットカラム（`recipient_*`, `sender_*`）。頻繁にクエリされるため正規化不要。
   MongoDB `addressSchema` 子文档 → 平铺列。因频繁查询故不再正规化。

---

## 5. インデックス戦略 / 索引策略

### 基本方針 / 基本方针

| カテゴリ / 类别 | 戦略 / 策略 |
|---|---|
| テナント分離 / 租户隔离 | 全テーブルの主要クエリに `tenant_id` 先頭の複合インデックス / 所有表主查询用 `tenant_id` 开头的复合索引 |
| ユニーク制約 / 唯一约束 | `WHERE deleted_at IS NULL` 部分インデックスでソフトデリート対応 / 部分索引支持软删除 |
| 検索最適化 / 搜索优化 | GIN インデックスを `text[]`, `jsonb` カラムに / GIN索引用于数组和JSONB列 |
| 部分インデックス / 部分索引 | `quantity > 0` 等の条件でインデックスサイズ削減 / 通过条件减小索引大小 |
| 外部キー / 外键 | 全 FK カラムに自動インデックス (Drizzle で定義) / 所有FK列自动索引 |

### GIN インデックス / GIN索引

```sql
-- 商品バーコード検索 / 商品条码搜索
CREATE INDEX idx_products_barcode_gin ON products USING GIN (barcode);

-- 荷扱いタグ検索 / 荷扱い标签搜索
CREATE INDEX idx_shipment_handling_gin ON shipment_orders USING GIN (handling_tags);

-- JSONB カスタムフィールド / JSONB自定义字段
CREATE INDEX idx_products_custom_gin ON products USING GIN (custom_fields);
CREATE INDEX idx_products_marketplace_gin ON products USING GIN (marketplace_codes);
```

---

## 6. RLS ポリシー (マルチテナント) / RLS策略（多租户）

### 基本 RLS テンプレート / 基本RLS模板

```sql
-- テナント分離 RLS / 租户隔离 RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON products
  USING (tenant_id = (current_setting('app.current_tenant_id'))::uuid);

CREATE POLICY tenant_insert ON products
  FOR INSERT
  WITH CHECK (tenant_id = (current_setting('app.current_tenant_id'))::uuid);
```

### 全テーブル適用 / 全表应用

以下の全テーブルに同一パターンの RLS を適用:
对以下所有表应用相同模式的 RLS：

```sql
-- 全テーブルに RLS 有効化 / 对所有表启用 RLS
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'tenants', 'users', 'warehouses', 'locations',
      'products', 'product_sub_skus',
      'shipment_orders', 'shipment_order_products', 'shipment_order_materials',
      'inbound_orders', 'inbound_order_lines', 'inbound_service_options',
      'stock_quants', 'stock_moves',
      'return_orders', 'billing_records', 'carriers'
    ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (tenant_id = (current_setting(''app.current_tenant_id''))::uuid)',
      tbl
    );
  END LOOP;
END $$;
```

### ロールベースポリシー / 基于角色的策略

```sql
-- client ロールは自分の荷主データのみ / client角色仅可访问自己的荷主数据
CREATE POLICY client_products ON products
  FOR SELECT
  USING (
    tenant_id = (current_setting('app.current_tenant_id'))::uuid
    AND (
      current_setting('app.current_user_role') != 'client'
      OR client_id = (current_setting('app.current_client_id'))::uuid
    )
  );
```

---

## 7. Drizzle Schema 定義例 / Drizzle Schema 定义示例

> 5 つの主要テーブルの Drizzle ORM TypeScript 定義。
> 5个主要表的 Drizzle ORM TypeScript 定义。

```typescript
// src/db/schema/enums.ts
import { pgEnum } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', [
  'admin', 'manager', 'operator', 'viewer', 'client',
]);

export const inboundOrderStatusEnum = pgEnum('inbound_order_status', [
  'draft', 'confirmed', 'arrived', 'processing',
  'awaiting_label', 'ready_to_ship', 'shipped',
  'receiving', 'received', 'done', 'cancelled',
]);

export const locationTypeEnum = pgEnum('location_type', [
  'warehouse', 'zone', 'shelf', 'bin',
  'staging', 'receiving', 'virtual_supplier', 'virtual_customer',
]);
```

```typescript
// src/db/schema/products.ts
import { pgTable, uuid, varchar, text, boolean, integer,
         numeric, timestamp, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { locations } from './locations';

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  clientId: uuid('client_id'),
  subClientId: uuid('sub_client_id'),
  shopId: uuid('shop_id'),

  // 基本 / 基本
  sku: varchar('sku', { length: 100 }).notNull(),
  name: varchar('name', { length: 500 }).notNull(),
  nameFull: varchar('name_full', { length: 1000 }),
  nameEn: varchar('name_en', { length: 500 }),
  barcode: text('barcode').array().default([]),
  janCode: varchar('jan_code', { length: 50 }),
  imageUrl: text('image_url'),
  category: varchar('category', { length: 100 }).default('0'),
  memo: text('memo'),

  // 価格 / 价格
  price: numeric('price', { precision: 12, scale: 2 }),
  costPrice: numeric('cost_price', { precision: 12, scale: 2 }),
  currency: varchar('currency', { length: 3 }),
  taxType: varchar('tax_type', { length: 2 }),
  taxRate: numeric('tax_rate', { precision: 5, scale: 2 }),
  paidType: varchar('paid_type', { length: 1 }).default('0'),

  // 寸法 / 尺寸
  width: numeric('width', { precision: 10, scale: 2 }),
  depth: numeric('depth', { precision: 10, scale: 2 }),
  height: numeric('height', { precision: 10, scale: 2 }),
  weight: numeric('weight', { precision: 10, scale: 3 }),
  volume: numeric('volume', { precision: 12, scale: 6 }),
  grossWeight: numeric('gross_weight', { precision: 10, scale: 3 }),

  // 外箱 / 外箱
  outerBoxWidth: numeric('outer_box_width', { precision: 10, scale: 2 }),
  outerBoxDepth: numeric('outer_box_depth', { precision: 10, scale: 2 }),
  outerBoxHeight: numeric('outer_box_height', { precision: 10, scale: 2 }),
  outerBoxVolume: numeric('outer_box_volume', { precision: 12, scale: 6 }),
  outerBoxWeight: numeric('outer_box_weight', { precision: 10, scale: 3 }),

  // 配送・取扱い / 配送・处理
  coolType: varchar('cool_type', { length: 2 }),
  shippingSizeCode: varchar('shipping_size_code', { length: 10 }),
  hazardousType: varchar('hazardous_type', { length: 1 }).default('0'),
  airTransportBan: boolean('air_transport_ban').default(false),
  mailCalcEnabled: boolean('mail_calc_enabled').default(false),
  mailCalcMaxQuantity: integer('mail_calc_max_quantity'),
  handlingTypes: text('handling_types').array().default([]),
  defaultHandlingTags: text('default_handling_tags').array().default([]),
  barcodeCommission: boolean('barcode_commission').default(false),
  reservationTarget: boolean('reservation_target').default(false),

  // 在庫管理 / 库存管理
  inventoryEnabled: boolean('inventory_enabled').default(false),
  lotTrackingEnabled: boolean('lot_tracking_enabled').default(false),
  expiryTrackingEnabled: boolean('expiry_tracking_enabled').default(false),
  alertDaysBeforeExpiry: integer('alert_days_before_expiry').default(30),
  serialTrackingEnabled: boolean('serial_tracking_enabled').default(false),
  inboundExpiryDays: integer('inbound_expiry_days'),
  allocationRule: varchar('allocation_rule', { length: 4 }).default('FIFO'),
  defaultLocationId: uuid('default_location_id').references(() => locations.id),
  safetyStock: integer('safety_stock').default(0),
  caseQuantity: integer('case_quantity'),

  // LOGIFAST ブランド / 品牌
  customerProductCode: varchar('customer_product_code', { length: 100 }),
  brandCode: varchar('brand_code', { length: 50 }),
  brandName: varchar('brand_name', { length: 255 }),
  sizeName: varchar('size_name', { length: 100 }),
  colorName: varchar('color_name', { length: 100 }),
  unitType: varchar('unit_type', { length: 2 }),
  countryOfOrigin: varchar('country_of_origin', { length: 100 }),

  // 仕入先 / 供货商
  supplierCode: varchar('supplier_code', { length: 100 }),
  supplierName: varchar('supplier_name', { length: 255 }),

  // EC
  fnsku: varchar('fnsku', { length: 50 }),
  asin: varchar('asin', { length: 20 }),
  amazonSku: varchar('amazon_sku', { length: 100 }),
  fbaEnabled: boolean('fba_enabled').default(false),
  rakutenSku: varchar('rakuten_sku', { length: 100 }),
  rslEnabled: boolean('rsl_enabled').default(false),
  marketplaceCodes: jsonb('marketplace_codes').default({}),
  wholesalePartnerCodes: jsonb('wholesale_partner_codes').default({}),

  // カスタム / 自定义
  customField1: varchar('custom_field_1', { length: 500 }),
  customField2: varchar('custom_field_2', { length: 500 }),
  customField3: varchar('custom_field_3', { length: 500 }),
  customField4: varchar('custom_field_4', { length: 500 }),
  customFields: jsonb('custom_fields').default({}),
  remarks: text('remarks').array().default([]),

  // 倉庫メモ / 仓库备注
  whPreferredLocation: varchar('wh_preferred_location', { length: 255 }),
  whHandlingNotes: text('wh_handling_notes'),
  whIsFragile: boolean('wh_is_fragile').default(false),
  whIsLiquid: boolean('wh_is_liquid').default(false),
  whRequiresOppBag: boolean('wh_requires_opp_bag').default(false),
  whRequiresSuffocationLabel: boolean('wh_requires_suffocation_label').default(false),
  whStorageType: varchar('wh_storage_type', { length: 10 }).default('ambient'),

  // タイムスタンプ / 时间戳
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  uniqueIndex('idx_products_tenant_sku')
    .on(table.tenantId, table.sku)
    .where(sql`deleted_at IS NULL`),
  index('idx_products_tenant_client').on(table.tenantId, table.clientId),
  index('idx_products_tenant_shop').on(table.tenantId, table.shopId),
  index('idx_products_tenant_customer_code').on(table.tenantId, table.customerProductCode),
  index('idx_products_tenant_brand').on(table.tenantId, table.brandCode),
]);
```

```typescript
// src/db/schema/shipmentOrders.ts
import { pgTable, uuid, varchar, text, boolean, integer,
         numeric, timestamp, date, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from './tenants';
import { carriers } from './carriers';

export const shipmentOrders = pgTable('shipment_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  orderNumber: varchar('order_number', { length: 100 }).notNull(),
  destinationType: varchar('destination_type', { length: 10 }),
  fbaShipmentId: varchar('fba_shipment_id', { length: 100 }),
  fbaDestination: varchar('fba_destination', { length: 20 }),

  // ステータス / 状态 (フラット化 / 平铺)
  carrierReceiptReceived: boolean('carrier_receipt_received').default(false),
  carrierReceiptAt: timestamp('carrier_receipt_at', { withTimezone: true }),
  isConfirmed: boolean('is_confirmed').default(false),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  isPrinted: boolean('is_printed').default(false),
  printedAt: timestamp('printed_at', { withTimezone: true }),
  isInspected: boolean('is_inspected').default(false),
  inspectedAt: timestamp('inspected_at', { withTimezone: true }),
  isShipped: boolean('is_shipped').default(false),
  shippedAt: timestamp('shipped_at', { withTimezone: true }),
  isEcExported: boolean('is_ec_exported').default(false),
  ecExportedAt: timestamp('ec_exported_at', { withTimezone: true }),

  // 注文情報 / 订单信息
  sourceOrderAt: timestamp('source_order_at', { withTimezone: true }),
  carrierId: uuid('carrier_id').references(() => carriers.id),
  customerManagementNumber: varchar('customer_management_number', { length: 255 }).notNull(),
  trackingId: varchar('tracking_id', { length: 100 }),

  // 送付先 / 收件人 (フラット化 / 平铺)
  recipientPostalCode: varchar('recipient_postal_code', { length: 10 }).notNull(),
  recipientPrefecture: varchar('recipient_prefecture', { length: 20 }).notNull(),
  recipientCity: varchar('recipient_city', { length: 100 }).notNull(),
  recipientStreet: varchar('recipient_street', { length: 255 }).notNull(),
  recipientBuilding: varchar('recipient_building', { length: 255 }).default(''),
  recipientName: varchar('recipient_name', { length: 255 }).notNull(),
  recipientPhone: varchar('recipient_phone', { length: 30 }).notNull(),
  honorific: varchar('honorific', { length: 10 }).default('様'),

  // 依頼主 / 发货人 (フラット化 / 平铺)
  senderPostalCode: varchar('sender_postal_code', { length: 10 }).notNull(),
  senderPrefecture: varchar('sender_prefecture', { length: 20 }).notNull(),
  senderCity: varchar('sender_city', { length: 100 }).notNull(),
  senderStreet: varchar('sender_street', { length: 255 }).notNull(),
  senderBuilding: varchar('sender_building', { length: 255 }).default(''),
  senderName: varchar('sender_name', { length: 255 }).notNull(),
  senderPhone: varchar('sender_phone', { length: 30 }).notNull(),

  // 注文者・配送 / 下单人・配送
  orderer: jsonb('orderer'),
  shipPlanDate: date('ship_plan_date').notNull(),
  invoiceType: varchar('invoice_type', { length: 50 }).notNull(),
  coolType: varchar('cool_type', { length: 2 }),
  deliveryTimeSlot: varchar('delivery_time_slot', { length: 50 }),
  deliveryDatePreference: varchar('delivery_date_preference', { length: 50 }),
  handlingTags: text('handling_tags').array().default([]),
  orderSourceCompanyId: uuid('order_source_company_id'),
  orderGroupId: varchar('order_group_id', { length: 100 }),

  // コスト / 费用
  shippingCost: numeric('shipping_cost', { precision: 10, scale: 2 }),
  shippingCostBreakdown: jsonb('shipping_cost_breakdown'),
  costSource: varchar('cost_source', { length: 10 }),
  costCalculatedAt: timestamp('cost_calculated_at', { withTimezone: true }),
  costSummary: jsonb('cost_summary'),

  // メタ / 元数据
  productsMeta: jsonb('products_meta'),
  carrierData: jsonb('carrier_data'),
  sourceRawRows: jsonb('source_raw_rows'),
  carrierRawRow: jsonb('carrier_raw_row'),
  internalRecord: jsonb('internal_record').default([]),
  customFields: jsonb('custom_fields').default({}),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  uniqueIndex('idx_shipment_tenant_order')
    .on(table.tenantId, table.orderNumber)
    .where(sql`deleted_at IS NULL`),
  index('idx_shipment_tenant_date').on(table.tenantId, table.shipPlanDate),
  index('idx_shipment_tracking').on(table.trackingId),
  index('idx_shipment_carrier').on(table.carrierId),
  index('idx_shipment_confirmed').on(table.tenantId, table.isConfirmed, table.isShipped),
]);
```

```typescript
// src/db/schema/inboundOrders.ts
import { pgTable, uuid, varchar, text, boolean, integer,
         numeric, timestamp, date, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from './tenants';
import { locations } from './locations';
import { inboundOrderStatusEnum } from './enums';

export const inboundOrders = pgTable('inbound_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  orderNumber: varchar('order_number', { length: 100 }).notNull(),
  status: inboundOrderStatusEnum('status').notNull().default('draft'),
  flowType: varchar('flow_type', { length: 20 }).default('standard'),
  destinationLocationId: uuid('destination_location_id').notNull().references(() => locations.id),
  destinationType: varchar('destination_type', { length: 10 }),

  // 仕入先 / 供货商
  supplierName: varchar('supplier_name', { length: 255 }),
  supplierCode: varchar('supplier_code', { length: 100 }),
  supplierMemo: text('supplier_memo'),
  supplierPhone: varchar('supplier_phone', { length: 50 }),
  supplierPostalCode: varchar('supplier_postal_code', { length: 10 }),
  supplierAddress: text('supplier_address'),

  // 日時 / 日期
  expectedDate: date('expected_date'),
  requestedDate: date('requested_date'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  actualArrivalDate: date('actual_arrival_date'),
  arrivedAt: timestamp('arrived_at', { withTimezone: true }),

  // 顧客 / 客户
  clientId: uuid('client_id'),
  clientName: varchar('client_name', { length: 255 }),
  subClientId: uuid('sub_client_id'),
  subClientName: varchar('sub_client_name', { length: 255 }),
  shopId: uuid('shop_id'),
  shopName: varchar('shop_name', { length: 255 }),

  // LOGIFAST
  containerType: varchar('container_type', { length: 20 }),
  cubicMeters: numeric('cubic_meters', { precision: 10, scale: 3 }),
  palletCount: integer('pallet_count'),
  innerBoxCount: integer('inner_box_count'),
  importBatchNumber: varchar('import_batch_number', { length: 100 }),
  importBatchDate: date('import_batch_date'),

  // 到着 / 到货
  totalBoxCount: integer('total_box_count'),
  actualBoxCount: integer('actual_box_count'),
  totalWeight: numeric('total_weight', { precision: 10, scale: 3 }),
  receivedBy: varchar('received_by', { length: 255 }),
  shippingMethod: varchar('shipping_method', { length: 20 }),
  trackingNumbers: jsonb('tracking_numbers'),
  linkedOrderIds: uuid('linked_order_ids').array(),
  purchaseOrderNumber: varchar('purchase_order_number', { length: 100 }),
  purchaseOrderDate: date('purchase_order_date'),
  memo: text('memo'),
  createdBy: varchar('created_by', { length: 255 }),
  fbaInfo: jsonb('fba_info'),
  rslInfo: jsonb('rsl_info'),
  b2bInfo: jsonb('b2b_info'),
  varianceReport: jsonb('variance_report'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  uniqueIndex('idx_inbound_tenant_order')
    .on(table.tenantId, table.orderNumber)
    .where(sql`deleted_at IS NULL`),
  index('idx_inbound_tenant_status').on(table.tenantId, table.status),
  index('idx_inbound_tenant_date').on(table.tenantId, table.expectedDate),
  index('idx_inbound_client').on(table.clientId),
]);
```

```typescript
// src/db/schema/stockQuants.ts
import { pgTable, uuid, varchar, integer,
         timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from './tenants';
import { products } from './products';
import { locations } from './locations';

export const stockQuants = pgTable('stock_quants', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  productId: uuid('product_id').notNull().references(() => products.id),
  productSku: varchar('product_sku', { length: 100 }).notNull(),
  locationId: uuid('location_id').notNull().references(() => locations.id),
  lotId: uuid('lot_id'),
  quantity: integer('quantity').notNull().default(0),
  reservedQuantity: integer('reserved_quantity').notNull().default(0),
  lastMovedAt: timestamp('last_moved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  uniqueIndex('idx_sq_unique')
    .on(table.productId, table.locationId, table.lotId),
  index('idx_sq_product').on(table.productId),
  index('idx_sq_location').on(table.locationId),
  index('idx_sq_sku').on(table.productSku),
  index('idx_sq_product_qty').on(table.productId, table.quantity)
    .where(sql`quantity > 0`),
  index('idx_sq_tenant_product_location')
    .on(table.tenantId, table.productId, table.locationId),
]);
```

```typescript
// src/db/schema/users.ts
import { pgTable, uuid, varchar, text, boolean, integer,
         timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { userRoleEnum } from './enums';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  authUid: uuid('auth_uid').unique(),
  email: varchar('email', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  role: userRoleEnum('role').notNull().default('viewer'),
  clientId: uuid('client_id'),
  clientName: varchar('client_name', { length: 255 }),
  parentUserId: uuid('parent_user_id'),
  phone: varchar('phone', { length: 50 }),
  avatar: text('avatar'),
  language: varchar('language', { length: 5 }).default('ja'),
  isActive: boolean('is_active').default(true),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  loginCount: integer('login_count').default(0),
  memo: text('memo'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  index('idx_users_tenant').on(table.tenantId),
  uniqueIndex('idx_users_email').on(table.tenantId, table.email),
]);
```

---

## 付録: updated_at 自動更新トリガー / 附录: updated_at 自动更新触发器

```sql
-- 全テーブル共通の updated_at 自動更新 / 所有表通用的 updated_at 自动更新
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 各テーブルにトリガー適用 / 对各表应用触发器
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'tenants', 'users', 'warehouses', 'locations',
      'products', 'shipment_orders', 'inbound_orders',
      'stock_quants', 'return_orders', 'billing_records', 'carriers'
    ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      tbl, tbl
    );
  END LOOP;
END $$;
```
