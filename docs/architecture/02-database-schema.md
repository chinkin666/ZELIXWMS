# 02 - データベーススキーマ設計 / 数据库Schema设计

> ZELIXWMS PostgreSQL (Supabase) 完全スキーマ定義書
> ZELIXWMS PostgreSQL (Supabase) 完整Schema定义文档
>
> 対応 MongoDB モデル: `backend/src/models/*.ts` (78 files)
> 对应 MongoDB 模型文件: `backend/src/models/*.ts` (78 files)
>
> 最終更新 / 最后更新: 2026-03-21

---

## 目次 / 目录

1. [設計原則 / 设计原则](#1-設計原則--设计原则)
2. [MongoDB → PostgreSQL 型マッピング / 类型映射](#2-mongodb--postgresql-型マッピング--类型映射)
3. [共通トリガー・関数 / 通用触发器与函数](#3-共通トリガー関数--通用触发器与函数)
4. [Core ドメイン / Core 域](#4-core-ドメイン--core-域)
5. [Shipment ドメイン / 出货域](#5-shipment-ドメイン--出货域)
6. [Inbound ドメイン / 入库域](#6-inbound-ドメイン--入库域)
7. [Inventory ドメイン / 库存域](#7-inventory-ドメイン--库存域)
8. [Returns ドメイン / 退货域](#8-returns-ドメイン--退货域)
9. [Billing ドメイン / 计费域](#9-billing-ドメイン--计费域)
10. [Carriers ドメイン / 配送域](#10-carriers-ドメイン--配送域)
11. [Warehouse Operations ドメイン / 仓库运营域](#11-warehouse-operations-ドメイン--仓库运营域)
12. [Notifications & Logs ドメイン / 通知与日志域](#12-notifications--logs-ドメイン--通知与日志域)
13. [RLS ポリシー / RLS 策略](#13-rls-ポリシー--rls-策略)
14. [インデックス戦略サマリー / 索引策略汇总](#14-インデックス戦略サマリー--索引策略汇总)
15. [Drizzle Schema サンプル / Drizzle Schema 示例](#15-drizzle-schema-サンプル--drizzle-schema-示例)

---

## 1. 設計原則 / 设计原则

### 1.1 標準カラム規約 / 通用列规约

すべてのテーブルに以下の標準カラムを含むこと（例外は明記）:
所有表必须包含以下标准列（例外会明确注明）:

| カラム名 / 列名 | 型 / 类型 | 説明 / 说明 |
|---|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` | 主キー / 主键 |
| `tenant_id` | `UUID NOT NULL REFERENCES tenants(id)` | マルチテナント分離キー / 多租户隔离键 |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` | 作成日時 / 创建时间 |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` | 更新日時（トリガーで自動更新）/ 更新时间（触发器自动更新） |
| `deleted_at` | `TIMESTAMPTZ` | 論理削除タイムスタンプ（NULL = 未削除）/ 软删除时间戳 |

**例外 / 例外**:
- `tenants` テーブル自身は `tenant_id` と `deleted_at` を持たない / tenants 表不含 tenant_id 和 deleted_at
- ログテーブル（Priority 4）は `deleted_at` を持たない（TTL で管理）/ 日志表不含 deleted_at（TTL管理）
- 子テーブル（明細行）は `deleted_at` を持たない（親カスケード削除）/ 子表不含 deleted_at（父级级联）

### 1.2 命名規約 / 命名规约

| 対象 / 对象 | 規約 / 规约 | 例 / 示例 |
|---|---|---|
| テーブル名 / 表名 | snake_case 複数形 / snake_case 复数 | `shipment_orders`, `stock_quants` |
| カラム名 / 列名 | snake_case | `order_number`, `created_at` |
| 外部キー / 外键 | `<参照テーブル単数>_id` | `product_id`, `warehouse_id` |
| インデックス / 索引 | `idx_<テーブル>_<カラム>` | `idx_products_tenant_sku` |
| ユニーク制約 / 唯一约束 | `UNIQUE (tenant_id, code)` パターン | テナント内一意 / 租户内唯一 |
| CHECK 制約 / CHECK 约束 | 列定義内にインライン / 列定义内联 | `CHECK (status IN (...))` |

### 1.3 型使用ガイドライン / 类型使用指南

| ユースケース / 用例 | PostgreSQL 型 / 类型 | 備考 / 备注 |
|---|---|---|
| 識別子 / 标识符 | `UUID` | gen_random_uuid() |
| 金額 / 金额 | `NUMERIC(14,2)` | 丸め誤差回避 / 避免舍入误差 |
| 重量 / 重量 | `NUMERIC(10,4)` | 小数4桁 / 4位小数 |
| 短い文字列 / 短字符串 | `VARCHAR(n)` | 制約明示 / 显式约束 |
| 長い文字列 / 长字符串 | `TEXT` | 住所、メモ等 / 地址、备注等 |
| 日時 / 日期时间 | `TIMESTAMPTZ` | タイムゾーン付き / 带时区 |
| 真偽値 / 布尔值 | `BOOLEAN` | NOT NULL DEFAULT 推奨 / 推荐 |
| 配列 / 数组 | `TEXT[]`, `UUID[]` | GIN インデックス対応 / 支持GIN索引 |
| 非構造化データ / 非结构化 | `JSONB` | GIN (jsonb_path_ops) |
| 列挙 / 枚举 | `VARCHAR + CHECK` | enum型より柔軟 / 比enum更灵活 |

### 1.4 外部キー規約 / 外键规约

```sql
-- 標準: 参照先の削除を禁止 / 标准: 禁止删除被引用记录
REFERENCES parent_table(id) ON DELETE RESTRICT

-- 子レコード連動削除 / 子记录随父删除
REFERENCES parent_table(id) ON DELETE CASCADE

-- 親削除時にNULLに設定 / 父删除时设NULL
REFERENCES parent_table(id) ON DELETE SET NULL
```

---

## 2. MongoDB → PostgreSQL 型マッピング / 类型映射

| MongoDB 型 | PostgreSQL 型 | 変換メモ / 转换备注 |
|---|---|---|
| `ObjectId` | `UUID` | UUID v5 で変換。gen_random_uuid() で新規生成 / UUID v5转换，新建用gen_random_uuid() |
| `String` | `VARCHAR(n)` / `TEXT` | 長さ制約があれば VARCHAR / 有长度限制用VARCHAR |
| `Number` (整数) | `INT` / `BIGINT` | 用途に応じて選択 / 根据用途选择 |
| `Number` (小数) | `NUMERIC(p,s)` | 金額: (14,2), 重量: (10,4) |
| `Boolean` | `BOOLEAN` | 1:1 マッピング / 1:1 映射 |
| `Date` | `TIMESTAMPTZ` | タイムゾーン付きに統一 / 统一使用带时区 |
| `[String]` | `TEXT[]` | PostgreSQL 配列 + GIN / PostgreSQL数组 + GIN |
| `[ObjectId]` | `UUID[]` | PostgreSQL 配列 / PostgreSQL数组 |
| `Mixed` / `Object` | `JSONB` | GIN (jsonb_path_ops) 推奨 / 推荐GIN索引 |
| `Schema.Types.Mixed` | `JSONB` | 非構造化データ用 / 非结构化数据 |
| サブドキュメント配列 | 子テーブル or `JSONB` | 正規化推奨、複雑なら JSONB / 推荐正规化 |
| `enum: [...]` | `VARCHAR + CHECK` | CHECK 制約でバリデーション / CHECK约束验证 |
| `{ type: Map }` | `JSONB` | キーバリューマップ / 键值映射 |
| `timestamps: true` | `created_at` + `updated_at` | トリガーで updated_at 自動更新 / 触发器自动更新 |
| `unique: true` | `UNIQUE` 制約 | テナント内一意: UNIQUE(tenant_id, col) |
| `index: true` | `CREATE INDEX` | 複合インデックス推奨 / 推荐复合索引 |
| `ref: 'Model'` | `REFERENCES table(id)` | 外部キー制約 / 外键约束 |
| `trim: true` | アプリ層で処理 | PostgreSQL にはなし / PG无对应 |
| `default: value` | `DEFAULT value` | 1:1 マッピング / 1:1 映射 |

---

## 3. 共通トリガー・関数 / 通用触发器与函数

### 3.1 拡張機能 / 扩展

```sql
-- テキスト検索用 / 文本搜索用
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- UUID 生成用（Supabase はデフォルトで有効）/ UUID生成（Supabase默认已启用）
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

### 3.2 updated_at 自動更新トリガー / updated_at 自动更新触发器

```sql
-- ============================================================================
-- updated_at 自動更新関数 / updated_at 自动更新函数
-- すべてのテーブルで共通利用 / 所有表通用
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- テーブルごとにトリガーを作成するヘルパー / 为每个表创建触发器的辅助宏
-- 使い方: SELECT create_updated_at_trigger('table_name');
-- 用法: SELECT create_updated_at_trigger('table_name');
CREATE OR REPLACE FUNCTION create_updated_at_trigger(tbl TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE format(
    'CREATE TRIGGER trg_%s_updated_at
       BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
    tbl, tbl
  );
END;
$$ LANGUAGE plpgsql;
```

### 3.3 監査ログトリガー / 审计日志触发器

```sql
-- ============================================================================
-- 監査ログテーブル / 审计日志表
-- 重要テーブルの変更履歴を自動記録 / 自动记录重要表的变更历史
-- ============================================================================
CREATE TABLE audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  table_name  VARCHAR(100) NOT NULL,
  record_id   UUID NOT NULL,
  tenant_id   UUID,
  action      VARCHAR(10) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data    JSONB,
  new_data    JSONB,
  changed_by  UUID,                    -- JWT から取得 / 从JWT获取
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_table_record ON audit_logs (table_name, record_id);
CREATE INDEX idx_audit_logs_tenant_time ON audit_logs (tenant_id, changed_at DESC);

-- 監査トリガー関数 / 审计触发器函数
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  _tenant_id UUID;
  _user_id UUID;
BEGIN
  -- JWT からユーザー情報を取得 / 从JWT获取用户信息
  BEGIN
    _user_id := (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid;
    _tenant_id := (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'tenant_id')::uuid;
  EXCEPTION WHEN OTHERS THEN
    _user_id := NULL;
    _tenant_id := NULL;
  END;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (table_name, record_id, tenant_id, action, new_data, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, _tenant_id, 'INSERT', to_jsonb(NEW), _user_id);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (table_name, record_id, tenant_id, action, old_data, new_data, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, _tenant_id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), _user_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (table_name, record_id, tenant_id, action, old_data, changed_by)
    VALUES (TG_TABLE_NAME, OLD.id, _tenant_id, 'DELETE', to_jsonb(OLD), _user_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 監査トリガーを作成するヘルパー / 创建审计触发器的辅助函数
CREATE OR REPLACE FUNCTION create_audit_trigger(tbl TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE format(
    'CREATE TRIGGER trg_%s_audit
       AFTER INSERT OR UPDATE OR DELETE ON %I
       FOR EACH ROW EXECUTE FUNCTION audit_trigger_func()',
    tbl, tbl
  );
END;
$$ LANGUAGE plpgsql;
```

### 3.4 論理削除フィルタービュー / 软删除过滤视图

```sql
-- 論理削除レコードを除外するビューパターン / 排除软删除记录的视图模式
-- 使用例 / 使用示例:
-- CREATE VIEW active_products AS
--   SELECT * FROM products WHERE deleted_at IS NULL;
```

---

## 4. Core ドメイン / Core 域

### 4.1 tenants — テナント / 租户

> MongoDB: `backend/src/models/tenant.ts`
> 例外: tenant_id, deleted_at を持たない / 不含 tenant_id, deleted_at

```sql
CREATE TABLE tenants (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 基本情報 / 基本信息
  tenant_code        VARCHAR(50) NOT NULL UNIQUE,          -- テナントコード（一意）/ 租户编码（唯一）
  name               VARCHAR(200) NOT NULL,                -- テナント名（会社名）/ 租户名（公司名）
  name2              VARCHAR(200),                         -- 英語名等 / 英文名等
  plan               VARCHAR(20) NOT NULL DEFAULT 'free'   -- 契約プラン / 合同计划
                     CHECK (plan IN ('free', 'starter', 'standard', 'pro', 'enterprise')),
  status             VARCHAR(20) NOT NULL DEFAULT 'trial'  -- テナントステータス / 租户状态
                     CHECK (status IN ('active', 'suspended', 'trial', 'cancelled')),
  -- 連絡先情報 / 联系信息
  contact_name       VARCHAR(100),                         -- 担当者名 / 负责人
  contact_email      VARCHAR(200),                         -- 連絡先メール / 联系邮箱
  contact_phone      VARCHAR(50),                          -- 連絡先電話 / 联系电话
  postal_code        VARCHAR(20),                          -- 郵便番号 / 邮编
  prefecture         VARCHAR(50),                          -- 都道府県 / 都道府县
  city               VARCHAR(100),                         -- 市区町村 / 市区町村
  address            TEXT,                                 -- 住所 / 地址
  -- 制限 / 限额
  max_users          INT NOT NULL DEFAULT 5,               -- 最大ユーザー数 / 最大用户数
  max_warehouses     INT NOT NULL DEFAULT 1,               -- 最大倉庫数 / 最大仓库数
  max_clients        INT NOT NULL DEFAULT 10,              -- 最大顧客数 / 最大客户数
  -- 期日 / 日期
  trial_expires_at   TIMESTAMPTZ,                          -- トライアル期限 / 试用到期日
  billing_started_at TIMESTAMPTZ,                          -- 課金開始日 / 计费开始日
  -- 機能・設定 / 功能与设定
  features           TEXT[] DEFAULT '{}',                   -- 有効機能リスト / 启用功能列表
  settings           JSONB NOT NULL DEFAULT '{}',           -- テナント固有設定 / 租户自定义设置
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,         -- 有効フラグ / 有效标志
  memo               TEXT,                                 -- 備考 / 备注
  -- タイムスタンプ / 时间戳
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス / 索引
CREATE INDEX idx_tenants_status ON tenants (status, is_active);
CREATE INDEX idx_tenants_plan ON tenants (plan);
CREATE INDEX idx_tenants_name_trgm ON tenants USING GIN (name gin_trgm_ops);
CREATE INDEX idx_tenants_created ON tenants (created_at DESC);

-- トリガー / 触发器
SELECT create_updated_at_trigger('tenants');
SELECT create_audit_trigger('tenants');
```

### 4.2 users — ユーザー / 用户

> MongoDB: `backend/src/models/user.ts`

```sql
CREATE TABLE users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  supabase_uid     UUID UNIQUE,                            -- Supabase Auth UID（移行後に追加）/ 迁移后添加
  -- 認証情報 / 认证信息
  email            VARCHAR(200) NOT NULL,                  -- メールアドレス / 邮箱
  password_hash    TEXT NOT NULL,                          -- PBKDF2 salt:hash 形式 / PBKDF2 salt:hash 格式
  display_name     VARCHAR(200) NOT NULL,                  -- 表示名 / 显示名
  role             VARCHAR(20) NOT NULL DEFAULT 'operator' -- ロール / 角色
                   CHECK (role IN ('admin', 'manager', 'operator', 'viewer', 'client')),
  -- アクセス制限 / 访问限制
  warehouse_ids    UUID[],                                 -- 倉庫制限（空=全倉庫）/ 仓库限制（空=全仓库）
  client_id        UUID,                                   -- 荷主制限 / 客户限制（role=client时）
  client_name      VARCHAR(200),                           -- 荷主名キャッシュ / 客户名缓存
  parent_user_id   UUID REFERENCES users(id) ON DELETE SET NULL, -- 親ユーザー / 父用户
  -- プロフィール / 个人资料
  phone            VARCHAR(50),                            -- 電話番号 / 电话
  avatar           TEXT,                                   -- アバターURL / 头像URL
  language         VARCHAR(5) CHECK (language IN ('ja', 'zh', 'en')), -- 言語 / 语言
  -- ステータス / 状态
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,          -- 有効フラグ / 有效标志
  last_login_at    TIMESTAMPTZ,                            -- 最終ログイン / 最后登录
  login_count      INT NOT NULL DEFAULT 0,                 -- ログイン回数 / 登录次数
  memo             TEXT,                                   -- 備考 / 备注
  -- タイムスタンプ / 时间戳
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,

  UNIQUE (tenant_id, email)
);

-- インデックス / 索引
CREATE INDEX idx_users_tenant ON users (tenant_id);
CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_users_client ON users (client_id);
CREATE INDEX idx_users_active ON users (tenant_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_supabase ON users (supabase_uid) WHERE supabase_uid IS NOT NULL;

-- トリガー / 触发器
SELECT create_updated_at_trigger('users');
SELECT create_audit_trigger('users');
```

### 4.3 warehouses — 倉庫 / 仓库

> MongoDB: `backend/src/models/warehouse.ts`

```sql
CREATE TABLE warehouses (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- 基本情報 / 基本信息
  code             VARCHAR(50) NOT NULL,                   -- 倉庫コード / 仓库编码
  name             VARCHAR(200) NOT NULL,                  -- 倉庫名 / 仓库名
  name2            VARCHAR(200),                           -- 英語名等 / 英文名等
  -- 住所 / 地址
  postal_code      VARCHAR(20),                            -- 郵便番号 / 邮编
  prefecture       VARCHAR(50),                            -- 都道府県 / 都道府县
  city             VARCHAR(100),                           -- 市区町村 / 市区町村
  address          TEXT,                                   -- 住所 / 地址
  address2         TEXT,                                   -- 住所2 / 地址2
  phone            VARCHAR(50),                            -- 電話番号 / 电话
  -- 倉庫属性 / 仓库属性
  cool_types       VARCHAR(5)[] DEFAULT '{}',              -- 対応温度帯 / 支持温度类型 ['0','1','2']
  capacity         INT,                                    -- 保管キャパシティ / 存储容量（托盘数等）
  operating_hours  VARCHAR(100),                           -- 営業時間 / 营业时间
  -- ステータス / 状态
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,          -- 有効フラグ / 有效标志
  sort_order       INT NOT NULL DEFAULT 0,                 -- 表示順 / 显示顺序
  memo             TEXT,                                   -- 備考 / 备注
  -- タイムスタンプ / 时间戳
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,

  UNIQUE (tenant_id, code)
);

-- インデックス / 索引
CREATE INDEX idx_warehouses_active ON warehouses (tenant_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_warehouses_name_trgm ON warehouses USING GIN (name gin_trgm_ops);

-- トリガー / 触发器
SELECT create_updated_at_trigger('warehouses');
SELECT create_audit_trigger('warehouses');
```

### 4.4 locations — ロケーション（階層構造）/ 库位（层级结构）

> MongoDB: `backend/src/models/location.ts`
> 自己参照で倉庫→ゾーン→棚→ビンの階層を表現 / 自引用实现仓库→区域→货架→库位的层级

```sql
CREATE TABLE locations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- 基本情報 / 基本信息
  code             VARCHAR(100) NOT NULL,                  -- ロケーションコード / 库位编码
  name             VARCHAR(200) NOT NULL,                  -- ロケーション名 / 库位名
  type             VARCHAR(30) NOT NULL                    -- ロケーションタイプ / 库位类型
                   CHECK (type IN ('warehouse', 'zone', 'shelf', 'bin', 'staging',
                                   'receiving', 'virtual/supplier', 'virtual/customer')),
  -- 階層構造 / 层级结构
  parent_id        UUID REFERENCES locations(id) ON DELETE SET NULL,    -- 親ロケーション / 父库位
  warehouse_id     UUID REFERENCES warehouses(id) ON DELETE SET NULL,   -- 所属倉庫 / 所属仓库
  full_path        TEXT NOT NULL DEFAULT '',                -- フルパス / 完整路径（如 W01/Z-A/S-01/B-003）
  -- 属性 / 属性
  cool_type        VARCHAR(5) CHECK (cool_type IN ('0', '1', '2')),    -- 温度帯 / 温度类型（0:常温/1:冷蔵/2:冷凍）
  stock_type       VARCHAR(5) CHECK (stock_type IN ('01', '02', '03', '04', '05', '06')), -- 在庫種別 / 库存类型（01:良品~06:其他）
  temperature_type VARCHAR(5) CHECK (temperature_type IN ('01', '02', '03', '04', '05')), -- 倉庫種類 / 温度类型（01:常温~05:其他）
  -- ステータス / 状态
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,          -- 有効フラグ / 有效标志
  sort_order       INT NOT NULL DEFAULT 0,                 -- 表示順 / 显示顺序
  memo             TEXT,                                   -- 備考 / 备注
  -- タイムスタンプ / 时间戳
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,

  UNIQUE (tenant_id, code)
);

-- インデックス / 索引
CREATE INDEX idx_locations_parent ON locations (parent_id);
CREATE INDEX idx_locations_warehouse ON locations (warehouse_id);
CREATE INDEX idx_locations_type ON locations (type);
CREATE INDEX idx_locations_active ON locations (tenant_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_locations_path ON locations (full_path text_pattern_ops);

-- トリガー / 触发器
SELECT create_updated_at_trigger('locations');
```

### 4.5 clients — 荷主 / 客户

> MongoDB: `backend/src/models/client.ts`
> 3PLのコア: テナント配下の顧客（荷主）管理 / 3PL核心: 管理租户下属的货主

```sql
CREATE TABLE clients (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- 基本情報 / 基本信息
  client_code      VARCHAR(100) NOT NULL,                  -- 顧客コード / 客户编号
  name             VARCHAR(200) NOT NULL,                  -- 顧客名 / 客户名称
  name2            VARCHAR(200),                           -- 別名 / 别名
  client_type      VARCHAR(30)                             -- 顧客タイプ / 客户类型
                   CHECK (client_type IN ('logistics_company', 'domestic_company', 'individual_seller')),
  -- 連絡先 / 联系方式
  contact_name     VARCHAR(100),                           -- 担当者名 / 负责人
  postal_code      VARCHAR(20),                            -- 郵便番号 / 邮编
  prefecture       VARCHAR(50),                            -- 都道府県 / 都道府县
  city             VARCHAR(100),                           -- 市区町村 / 市区町村
  address          TEXT,                                   -- 住所 / 地址
  address2         TEXT,                                   -- 住所2 / 地址2
  phone            VARCHAR(50),                            -- 電話番号 / 电话
  email            VARCHAR(200),                           -- メール / 邮箱
  -- 契約情報 / 合同信息
  plan             VARCHAR(20)                             -- SaaS契約プラン / SaaS合同计划
                   CHECK (plan IN ('free', 'standard', 'pro', 'enterprise')),
  billing_enabled  BOOLEAN NOT NULL DEFAULT FALSE,         -- 課金有効 / 计费启用
  -- 与信管理 / 信用管理
  credit_tier      VARCHAR(20) DEFAULT 'new'               -- 与信ランク / 信用等级
                   CHECK (credit_tier IN ('vip', 'standard', 'new', 'custom')),
  credit_limit     NUMERIC(14,2) DEFAULT 100000            -- 与信枠 / 信用额度上限
                   CHECK (credit_limit >= 0),
  current_balance  NUMERIC(14,2) DEFAULT 0                 -- 未精算残高 / 当前未结余额
                   CHECK (current_balance >= 0),
  payment_term_days INT DEFAULT 30                         -- 支払条件（日数）/ 结算周期（天）
                   CHECK (payment_term_days > 0),
  -- ポータル / 门户设定
  portal_enabled   BOOLEAN NOT NULL DEFAULT FALSE,         -- ポータル有効 / 门户启用
  portal_language  VARCHAR(5) DEFAULT 'ja'                 -- ポータル言語 / 门户语言
                   CHECK (portal_language IN ('zh', 'ja', 'en')),
  -- ステータス / 状态
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,          -- 有効フラグ / 有效标志
  memo             TEXT,                                   -- 備考 / 备注
  -- タイムスタンプ / 时间戳
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,

  UNIQUE (tenant_id, client_code)
);

-- インデックス / 索引
CREATE INDEX idx_clients_tenant_active ON clients (tenant_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_name_trgm ON clients USING GIN (name gin_trgm_ops);
CREATE INDEX idx_clients_credit ON clients (tenant_id, credit_tier);

-- トリガー / 触发器
SELECT create_updated_at_trigger('clients');
SELECT create_audit_trigger('clients');
```

### 4.6 sub_clients — 子顧客 / 子客户

> MongoDB: `backend/src/models/subClient.ts`

```sql
CREATE TABLE sub_clients (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id        UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,  -- 所属顧客 / 所属客户
  -- 基本情報 / 基本信息
  sub_client_code  VARCHAR(100) NOT NULL,                  -- 子顧客コード / 子客户编号
  name             VARCHAR(200) NOT NULL,                  -- 名称 / 名称
  name2            VARCHAR(200),                           -- 別名 / 别名
  sub_client_type  VARCHAR(30)                             -- タイプ / 类型
                   CHECK (sub_client_type IN ('end_customer', 'branch_office')),
  -- 連絡先 / 联系方式
  contact_person   VARCHAR(100),                           -- 担当者 / 负责人
  phone            VARCHAR(50),                            -- 電話 / 电话
  email            VARCHAR(200),                           -- メール / 邮箱
  -- ポータル / 门户
  portal_enabled   BOOLEAN NOT NULL DEFAULT FALSE,         -- ポータル有効 / 门户启用
  portal_user_id   UUID REFERENCES users(id) ON DELETE SET NULL, -- ポータルユーザー / 门户用户
  -- ステータス / 状态
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  memo             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,

  UNIQUE (tenant_id, sub_client_code)
);

-- インデックス / 索引
CREATE INDEX idx_sub_clients_client ON sub_clients (client_id);
CREATE INDEX idx_sub_clients_active ON sub_clients (tenant_id, is_active) WHERE deleted_at IS NULL;

-- トリガー / 触发器
SELECT create_updated_at_trigger('sub_clients');
```

### 4.7 shops — 店舗 / 店铺

> MongoDB: `backend/src/models/shop.ts`

```sql
CREATE TABLE shops (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id           UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  sub_client_id       UUID REFERENCES sub_clients(id) ON DELETE SET NULL,
  -- 基本情報 / 基本信息
  shop_code           VARCHAR(100) NOT NULL,               -- 店舗コード / 店铺编号
  shop_name           VARCHAR(200) NOT NULL,               -- 店舗名 / 店铺名
  platform            VARCHAR(30) NOT NULL                  -- プラットフォーム / 平台
                      CHECK (platform IN ('amazon_jp', 'rakuten', 'yahoo_shopping', 'shopify', 'b2b', 'other')),
  platform_account_id VARCHAR(200),                        -- プラットフォームアカウントID / 平台账户ID
  platform_store_name VARCHAR(200),                        -- プラットフォーム店舗名 / 平台店铺名
  -- ステータス / 状态
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  memo                TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ,

  UNIQUE (tenant_id, shop_code)
);

-- インデックス / 索引
CREATE INDEX idx_shops_client ON shops (client_id);
CREATE INDEX idx_shops_platform ON shops (tenant_id, platform);

-- トリガー / 触发器
SELECT create_updated_at_trigger('shops');
```

### 4.8 products — 商品（ワイドテーブル）/ 商品（宽表）

> MongoDB: `backend/src/models/product.ts` (100+ フィールドのフラット構造)
> ワイドテーブル設計: MongoDB のフラット構造を維持、コメントでグルーピング
> 宽表设计: 保持 MongoDB 的扁平结构，用注释分组

```sql
CREATE TABLE products (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- =========================================================================
  -- [A] 所属関連 / 归属关联
  -- =========================================================================
  client_id          UUID REFERENCES clients(id) ON DELETE SET NULL,     -- 所属顧客 / 所属客户
  sub_client_id      UUID REFERENCES sub_clients(id) ON DELETE SET NULL, -- 所属子顧客 / 所属子客户
  shop_id            UUID REFERENCES shops(id) ON DELETE SET NULL,       -- 所属店舗 / 所属店铺

  -- =========================================================================
  -- [B] 基本情報 / 基本信息
  -- =========================================================================
  sku                VARCHAR(200) NOT NULL,                 -- SKU（テナント内一意）/ SKU（租户内唯一）
  name               VARCHAR(500) NOT NULL,                 -- 商品名 / 商品名
  name_full          VARCHAR(1000),                         -- 正式名称 / 正式名称
  barcode            TEXT[] DEFAULT '{}',                    -- バーコード配列 / 条码数组
  cool_type          VARCHAR(5)                             -- クール区分 / 温度区分
                     CHECK (cool_type IN ('0', '1', '2')),  -- 0:常温/1:冷蔵/2:冷凍
  mail_calc_enabled  BOOLEAN NOT NULL DEFAULT FALSE,        -- メール便計算 / 邮件便计算
  mail_calc_max_quantity INT CHECK (mail_calc_max_quantity > 0), -- メール便最大数量 / 邮件便最大数量
  memo               TEXT,                                  -- 備考 / 备注
  price              NUMERIC(12,2),                         -- 販売価格 / 销售价格
  handling_types     TEXT[] DEFAULT '{}',                    -- 荷扱いタイプ / 处理类型
  image_url          TEXT,                                  -- 画像URL / 图片URL
  sub_skus           JSONB DEFAULT '[]',                    -- 子SKU配列 / 子SKU数组 [{subSku, price, description, isActive}]
  category           VARCHAR(100) DEFAULT '0',              -- カテゴリ / 分类
  cost_price         NUMERIC(12,2) CHECK (cost_price >= 0), -- 原価 / 成本价
  custom_field1      VARCHAR(500),                          -- カスタムフィールド1 / 自定义字段1
  custom_field2      VARCHAR(500),                          -- カスタムフィールド2 / 自定义字段2
  custom_field3      VARCHAR(500),                          -- カスタムフィールド3 / 自定义字段3
  custom_field4      VARCHAR(500),                          -- カスタムフィールド4 / 自定义字段4
  name_en            VARCHAR(500),                          -- 英語商品名 / 英文商品名
  country_of_origin  VARCHAR(100),                          -- 原産国 / 原产国
  allocation_rule    VARCHAR(10) DEFAULT 'FIFO'             -- 引当規則 / 分配规则
                     CHECK (allocation_rule IN ('FIFO', 'FEFO', 'LIFO')),
  serial_tracking_enabled BOOLEAN NOT NULL DEFAULT FALSE,   -- シリアルNo管理 / 序列号管理
  inbound_expiry_days INT CHECK (inbound_expiry_days > 0),  -- 入庫期限日数 / 入库期限天数
  _all_sku           TEXT[] DEFAULT '{}',                    -- 内部: sku + 全子SKUコード / 内部: sku+全子SKU编码

  -- =========================================================================
  -- [C] 在庫管理設定 / 库存管理设置
  -- =========================================================================
  inventory_enabled       BOOLEAN NOT NULL DEFAULT FALSE,   -- 在庫管理有効 / 库存管理启用
  lot_tracking_enabled    BOOLEAN NOT NULL DEFAULT FALSE,   -- ロット管理有効 / 批次管理启用
  expiry_tracking_enabled BOOLEAN NOT NULL DEFAULT FALSE,   -- 期限管理有効 / 期限管理启用
  alert_days_before_expiry INT NOT NULL DEFAULT 30,         -- 期限アラート日数 / 到期提醒天数
  default_location_id     UUID REFERENCES locations(id) ON DELETE SET NULL, -- デフォルトロケーション / 默认库位
  safety_stock            INT NOT NULL DEFAULT 0,           -- 安全在庫 / 安全库存
  jan_code                VARCHAR(50),                      -- JANコード / JAN码
  default_handling_tags   TEXT[] DEFAULT '{}',               -- デフォルト荷扱いタグ / 默认处理标签
  supplier_code           VARCHAR(100),                     -- 主仕入先コード / 主要供应商编码

  -- =========================================================================
  -- [D] 寸法・重量 / 尺寸与重量
  -- =========================================================================
  width              NUMERIC(10,2),                         -- 幅(cm) / 宽(cm)
  depth              NUMERIC(10,2),                         -- 奥行(cm) / 深(cm)
  height             NUMERIC(10,2),                         -- 高さ(cm) / 高(cm)
  weight             NUMERIC(10,4),                         -- 重量(kg) / 重量(kg)
  outer_box_width    NUMERIC(10,2) CHECK (outer_box_width >= 0),   -- 外箱幅 / 外箱宽
  outer_box_depth    NUMERIC(10,2) CHECK (outer_box_depth >= 0),   -- 外箱奥行 / 外箱深
  outer_box_height   NUMERIC(10,2) CHECK (outer_box_height >= 0),  -- 外箱高さ / 外箱高
  outer_box_volume   NUMERIC(12,4) CHECK (outer_box_volume >= 0),  -- 外箱容積(M3) / 外箱体积
  outer_box_weight   NUMERIC(10,4) CHECK (outer_box_weight >= 0),  -- 外箱重量(kg) / 外箱重量
  gross_weight       NUMERIC(10,4) CHECK (gross_weight >= 0),      -- 総重量G/W / 毛重
  volume             NUMERIC(12,6) CHECK (volume >= 0),            -- 商品容積(M3) / 商品体积

  -- =========================================================================
  -- [E] 梱包・配送 / 包装与配送
  -- =========================================================================
  case_quantity      INT CHECK (case_quantity >= 1),        -- 箱入数 / 每箱数量
  shipping_size_code VARCHAR(20),                           -- 配送サイズコード / 配送尺寸编码 (SS/60/80/.../260)
  unit_type          VARCHAR(5)                             -- 単位区分 / 单位类型
                     CHECK (unit_type IN ('01', '02', '03', '04', '05')), -- 01:ﾋﾟｰｽ/02:ｹｰｽ/03:ﾕﾆｯﾄ/04:ﾎﾞｯｸｽ/05:ﾛｰﾙ

  -- =========================================================================
  -- [F] Amazon FBA 関連 / Amazon FBA 相关
  -- =========================================================================
  fnsku              VARCHAR(100),                          -- Amazon FNSKU
  asin               VARCHAR(100),                          -- Amazon ASIN
  amazon_sku         VARCHAR(200),                          -- Amazon出品者SKU / Amazon卖家SKU
  fba_enabled        BOOLEAN NOT NULL DEFAULT FALSE,        -- FBA出荷対応 / 是否FBA出货

  -- =========================================================================
  -- [G] 楽天RSL 関連 / 乐天RSL 相关
  -- =========================================================================
  rakuten_sku        VARCHAR(200),                          -- 楽天SKU / 乐天SKU
  rsl_enabled        BOOLEAN NOT NULL DEFAULT FALSE,        -- RSL出荷対応 / 是否RSL出货

  -- =========================================================================
  -- [H] LOGIFAST 固有 / LOGIFAST 专属
  -- =========================================================================
  customer_product_code VARCHAR(200),                       -- 顧客商品コード / 客户商品编码
  brand_code         VARCHAR(100),                          -- ブランドコード / 品牌编码
  brand_name         VARCHAR(200),                          -- ブランド名称 / 品牌名称
  size_name          VARCHAR(100),                          -- サイズ名称 / 尺码名称
  color_name         VARCHAR(100),                          -- カラー名称 / 颜色名称
  tax_type           VARCHAR(5) CHECK (tax_type IN ('01', '02')), -- 税区分（01:課税/02:非課税）/ 税区分
  tax_rate           NUMERIC(5,2) CHECK (tax_rate >= 0),    -- 税率(%) / 税率
  hazardous_type     VARCHAR(5) DEFAULT '0'                 -- 危険区分 / 危险品区分
                     CHECK (hazardous_type IN ('0', '1')),  -- 0:一般/1:危険
  air_transport_ban  BOOLEAN NOT NULL DEFAULT FALSE,        -- 航空搭載禁止 / 禁止航空运输
  barcode_commission BOOLEAN NOT NULL DEFAULT FALSE,        -- バーコード委託 / 条码委托贴付
  reservation_target BOOLEAN NOT NULL DEFAULT FALSE,        -- 予約対象 / 是否预约对象
  currency           VARCHAR(5)                             -- 通貨 / 货币
                     CHECK (currency IN ('1', '2', '3')),   -- 1:JPY/2:RMB/3:USD
  supplier_name      VARCHAR(200),                          -- 仕入先名称 / 供货方名称
  paid_type          VARCHAR(5) DEFAULT '0'                 -- 有償無償区分 / 有偿无偿区分
                     CHECK (paid_type IN ('0', '1')),       -- 0:無償/1:有償

  -- =========================================================================
  -- [I] 販売チャネル / 销售渠道
  -- =========================================================================
  marketplace_codes       JSONB DEFAULT '{}',               -- モール別販売コード / 各平台销售编码 {rakuten: 'ABC'}
  wholesale_partner_codes JSONB DEFAULT '{}',               -- 卸先別商品コード / B2B卸先编码 {joshin: 'X123'}

  -- =========================================================================
  -- [J] 倉庫側メモ / 仓库侧备注
  -- =========================================================================
  warehouse_notes    JSONB,                                 -- {preferredLocation, handlingNotes, isFragile, isLiquid, ...}

  -- =========================================================================
  -- [K] カスタムフィールド / 自定义字段
  -- =========================================================================
  custom_fields      JSONB DEFAULT '{}',                    -- 自由フィールド / 自由字段

  -- =========================================================================
  -- [Z] タイムスタンプ / 时间戳
  -- =========================================================================
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ,

  UNIQUE (tenant_id, sku)
);

-- インデックス / 索引
CREATE INDEX idx_products_all_sku ON products USING GIN (_all_sku) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_client ON products (tenant_id, client_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_shop ON products (tenant_id, shop_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_shop_sku ON products (tenant_id, shop_id, sku) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_customer_product_code ON products (tenant_id, customer_product_code) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_brand_code ON products (tenant_id, brand_code) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_barcode ON products USING GIN (barcode);
CREATE INDEX idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);
CREATE INDEX idx_products_custom_fields ON products USING GIN (custom_fields jsonb_path_ops);
CREATE INDEX idx_products_marketplace ON products USING GIN (marketplace_codes jsonb_path_ops);
CREATE INDEX idx_products_fba ON products (tenant_id, fnsku) WHERE fba_enabled = TRUE AND deleted_at IS NULL;
CREATE INDEX idx_products_rsl ON products (tenant_id, rakuten_sku) WHERE rsl_enabled = TRUE AND deleted_at IS NULL;

-- トリガー / 触发器
SELECT create_updated_at_trigger('products');
SELECT create_audit_trigger('products');
```

---

## 5. Shipment ドメイン / 出货域

### 5.1 shipment_orders — 出荷指示 / 出货单

> MongoDB: `backend/src/models/shipmentOrder.ts`
> ステータスはネストオブジェクトから独立ブーリアンに平坦化
> 状态从嵌套对象平坦化为独立布尔字段

```sql
CREATE TABLE shipment_orders (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- 出荷先タイプ / 出货目的地类型
  destination_type          VARCHAR(10) DEFAULT 'B2C'
                            CHECK (destination_type IN ('B2C', 'B2B', 'FBA', 'RSL')),
  fba_shipment_id           VARCHAR(100),                  -- FBA入庫プランID / FBA入库计划ID
  fba_destination            VARCHAR(50),                   -- FBA倉庫コード / FBA仓库代码
  -- =========================================================================
  -- ステータス（フラットブーリアン）/ 状态（扁平布尔字段）
  -- =========================================================================
  status_carrier_received    BOOLEAN NOT NULL DEFAULT FALSE,  -- 配送業者受付済 / 快递已受理
  status_carrier_received_at TIMESTAMPTZ,
  status_confirmed           BOOLEAN NOT NULL DEFAULT FALSE,  -- 確認済 / 已确认
  status_confirmed_at        TIMESTAMPTZ,
  status_printed             BOOLEAN NOT NULL DEFAULT FALSE,  -- 印刷済 / 已打印
  status_printed_at          TIMESTAMPTZ,
  status_inspected           BOOLEAN NOT NULL DEFAULT FALSE,  -- 検品済 / 已检品
  status_inspected_at        TIMESTAMPTZ,
  status_shipped             BOOLEAN NOT NULL DEFAULT FALSE,  -- 出荷済 / 已出货
  status_shipped_at          TIMESTAMPTZ,
  status_ec_exported         BOOLEAN NOT NULL DEFAULT FALSE,  -- EC連携済 / 已EC联动
  status_ec_exported_at      TIMESTAMPTZ,
  status_held                BOOLEAN NOT NULL DEFAULT FALSE,  -- 保留中 / 已保留
  status_held_at             TIMESTAMPTZ,
  -- =========================================================================
  -- 注文情報 / 订单信息
  -- =========================================================================
  order_number               VARCHAR(100) NOT NULL UNIQUE,   -- 注文番号 / 订单号
  source_order_at            TIMESTAMPTZ,                    -- 元注文日時 / 原始订单时间
  carrier_id                 VARCHAR(100) NOT NULL,          -- 配送業者ID / 配送商ID
  customer_management_number VARCHAR(200) NOT NULL,          -- 顧客管理番号 / 客户管理号
  tracking_id                VARCHAR(100),                   -- 伝票番号 / 快递单号
  -- =========================================================================
  -- 注文者（全フィールド optional）/ 订购人（全字段可选）
  -- =========================================================================
  orderer_postal_code        VARCHAR(20),
  orderer_prefecture         VARCHAR(50),
  orderer_city               VARCHAR(100),
  orderer_street             TEXT,
  orderer_building           TEXT,
  orderer_name               VARCHAR(200),
  orderer_phone              VARCHAR(50),
  -- =========================================================================
  -- 送付先（必須）/ 收件人（必填）
  -- =========================================================================
  recipient_postal_code      VARCHAR(20) NOT NULL,
  recipient_prefecture       VARCHAR(50) NOT NULL,
  recipient_city             VARCHAR(100) NOT NULL,
  recipient_street           TEXT NOT NULL,
  recipient_building         TEXT,
  recipient_name             VARCHAR(200) NOT NULL,
  recipient_phone            VARCHAR(50) NOT NULL,
  honorific                  VARCHAR(20) DEFAULT '様',       -- 敬称 / 尊称
  -- =========================================================================
  -- 配送希望 / 配送偏好
  -- =========================================================================
  ship_plan_date             VARCHAR(20) NOT NULL,           -- 出荷予定日 / 出货预定日
  invoice_type               VARCHAR(10) NOT NULL,           -- 送り状種類 / 送状类型
  cool_type                  VARCHAR(5),                     -- クール区分 / 温度区分
  delivery_time_slot         VARCHAR(20),                    -- 配達時間帯 / 配送时间段
  delivery_date_preference   VARCHAR(20),                    -- 配達希望日 / 配送希望日
  order_source_company_id    VARCHAR(100),                   -- 依頼主ID / 委托方ID
  carrier_data               JSONB,                         -- 配送業者固有データ / 快递商专属数据 {yamato: {sortingCode, hatsuBaseNo1, hatsuBaseNo2}}
  -- =========================================================================
  -- 依頼主住所（必須）/ 发件人地址（必填）
  -- =========================================================================
  sender_postal_code         VARCHAR(20) NOT NULL,
  sender_prefecture          VARCHAR(50) NOT NULL,
  sender_city                VARCHAR(100) NOT NULL,
  sender_street              TEXT NOT NULL,
  sender_building            TEXT,
  sender_name                VARCHAR(200) NOT NULL,
  sender_phone               VARCHAR(50) NOT NULL,
  -- =========================================================================
  -- その他 / 其他
  -- =========================================================================
  handling_tags              TEXT[] DEFAULT '{}',             -- 荷扱いタグ / 处理标签
  source_raw_rows            JSONB,                         -- 元データ行 / 原始数据行
  carrier_raw_row            JSONB,                         -- 配送業者回执データ / 快递回执数据
  internal_record            JSONB DEFAULT '[]',             -- 操作記録 / 操作记录 [{user, timestamp, content}]
  order_group_id             VARCHAR(100),                   -- 出荷グループID / 出货组ID
  custom_fields              JSONB DEFAULT '{}',             -- カスタムフィールド / 自定义字段
  -- =========================================================================
  -- 配送料金 / 配送费用
  -- =========================================================================
  shipping_cost              NUMERIC(12,2) CHECK (shipping_cost >= 0),  -- 配送料金 / 配送费用
  shipping_cost_breakdown    JSONB,                          -- 料金内訳 / 费用明细 {base, cool, cod, fuel, other}
  cost_source                VARCHAR(20)                     -- 料金ソース / 费用来源
                             CHECK (cost_source IN ('auto', 'manual', 'import')),
  cost_calculated_at         TIMESTAMPTZ,                    -- 料金計算日時 / 费用计算时间
  _products_meta             JSONB DEFAULT '{}',             -- 商品集計メタ / 商品聚合元数据 {skus, names, skuCount, totalQuantity, totalPrice}
  cost_summary               JSONB,                         -- コスト集計 / 成本汇总 {productCost, materialCost, shippingCost, totalCost}
  -- タイムスタンプ / 时间戳
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at                 TIMESTAMPTZ
);

-- インデックス / 索引
CREATE INDEX idx_shipment_orders_tenant_time ON shipment_orders (tenant_id, created_at DESC);
CREATE INDEX idx_shipment_orders_confirmed ON shipment_orders (tenant_id, status_confirmed, created_at DESC);
CREATE INDEX idx_shipment_orders_shipped ON shipment_orders (tenant_id, status_shipped, created_at DESC);
CREATE INDEX idx_shipment_orders_carrier ON shipment_orders (carrier_id, status_confirmed);
CREATE INDEX idx_shipment_orders_tracking ON shipment_orders (tracking_id) WHERE tracking_id IS NOT NULL;
CREATE INDEX idx_shipment_orders_group ON shipment_orders (order_group_id) WHERE order_group_id IS NOT NULL;
CREATE INDEX idx_shipment_orders_source ON shipment_orders (order_source_company_id);
CREATE INDEX idx_shipment_orders_postal ON shipment_orders (recipient_postal_code);
CREATE INDEX idx_shipment_orders_meta ON shipment_orders USING GIN (_products_meta jsonb_path_ops);
CREATE INDEX idx_shipment_orders_ship_date ON shipment_orders (tenant_id, ship_plan_date, status_confirmed);

-- トリガー / 触发器
SELECT create_updated_at_trigger('shipment_orders');
SELECT create_audit_trigger('shipment_orders');
```

### 5.2 shipment_order_products — 出荷指示商品 / 出货单商品明细

> MongoDB: shipmentOrder.products[] → 正規化して独立テーブル
> MongoDB: shipmentOrder.products[] → 正规化为独立表

```sql
CREATE TABLE shipment_order_products (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  shipment_order_id   UUID NOT NULL REFERENCES shipment_orders(id) ON DELETE CASCADE,
  -- 商品情報 / 商品信息
  input_sku           VARCHAR(200) NOT NULL,                -- ユーザー入力SKU / 用户输入SKU
  quantity            INT NOT NULL CHECK (quantity >= 1),    -- 数量 / 数量
  product_id          UUID REFERENCES products(id) ON DELETE SET NULL, -- 親商品ID / 父商品ID
  product_sku         VARCHAR(200),                         -- 親商品SKU / 父商品SKU
  product_name        VARCHAR(500),                         -- 商品名 / 商品名
  matched_sub_sku     JSONB,                                -- 子SKU情報 / 子SKU信息 {code, price, description}
  -- スナップショット / 快照
  image_url           TEXT,                                 -- 画像URL / 图片URL
  barcode             TEXT[],                               -- バーコード / 条码
  cool_type           VARCHAR(5),                           -- クール区分 / 温度区分
  mail_calc_enabled   BOOLEAN,                              -- メール便計算 / 邮件便计算
  mail_calc_max_quantity INT,                               -- メール便最大数量 / 邮件便最大数量
  -- 価格 / 价格
  unit_price          NUMERIC(12,2) CHECK (unit_price >= 0), -- 単価 / 单价
  subtotal            NUMERIC(12,2) CHECK (subtotal >= 0),   -- 小計 / 小计
  -- タイムスタンプ / 时间戳
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス / 索引
CREATE INDEX idx_sop_shipment ON shipment_order_products (shipment_order_id);
CREATE INDEX idx_sop_product ON shipment_order_products (product_id);
CREATE INDEX idx_sop_sku ON shipment_order_products (input_sku);

-- トリガー / 触发器
SELECT create_updated_at_trigger('shipment_order_products');
```

### 5.3 shipment_order_materials — 出荷指示耗材 / 出货单耗材明细

> MongoDB: shipmentOrder.materials[] → 正規化
> MongoDB: shipmentOrder.materials[] → 正规化

```sql
CREATE TABLE shipment_order_materials (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  shipment_order_id   UUID NOT NULL REFERENCES shipment_orders(id) ON DELETE CASCADE,
  -- 耗材情報 / 耗材信息
  material_sku        VARCHAR(200) NOT NULL,                -- 耗材SKU / 耗材SKU
  material_name       VARCHAR(500),                         -- 耗材名 / 耗材名
  quantity            INT NOT NULL CHECK (quantity >= 1),    -- 数量 / 数量
  unit_cost           NUMERIC(12,2) CHECK (unit_cost >= 0), -- 単価 / 单价
  total_cost          NUMERIC(12,2) CHECK (total_cost >= 0),-- 合計コスト / 总成本
  auto                BOOLEAN NOT NULL DEFAULT FALSE,       -- 自動追加フラグ / 自动追加标志
  -- タイムスタンプ / 时间戳
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス / 索引
CREATE INDEX idx_som_shipment ON shipment_order_materials (shipment_order_id);

-- トリガー / 触发器
SELECT create_updated_at_trigger('shipment_order_materials');
```

---

## 6. Inbound ドメイン / 入库域

### 6.1 inbound_orders — 入庫指示 / 入库单

> MongoDB: `backend/src/models/inboundOrder.ts`

```sql
CREATE TABLE inbound_orders (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- 基本情報 / 基本信息
  order_number             VARCHAR(50) NOT NULL UNIQUE,     -- 入庫番号 / 入库单号
  status                   VARCHAR(20) NOT NULL DEFAULT 'draft'
                           CHECK (status IN ('draft', 'confirmed', 'arrived', 'processing',
                                  'awaiting_label', 'ready_to_ship', 'shipped', 'receiving',
                                  'received', 'done', 'cancelled')),
  destination_location_id  UUID REFERENCES locations(id) ON DELETE SET NULL,
  -- サプライヤー（インライン）/ 供应商（内联）
  supplier_name            VARCHAR(200),                    -- サプライヤー名 / 供货方名
  supplier_code            VARCHAR(100),                    -- サプライヤーコード / 供货方编码
  supplier_memo            TEXT,                            -- サプライヤー備考 / 供货方备注
  supplier_phone           VARCHAR(50),                     -- サプライヤー電話 / 供货方电话
  supplier_postal_code     VARCHAR(20),                     -- サプライヤー郵便番号 / 供货方邮编
  supplier_address         TEXT,                            -- サプライヤー住所 / 供货方地址
  -- 日付 / 日期
  expected_date            TIMESTAMPTZ,                     -- 入庫予定日 / 预计入库日
  requested_date           TIMESTAMPTZ,                     -- 入庫希望日 / 希望入库日
  completed_at             TIMESTAMPTZ,                     -- 完了日時 / 完成时间
  memo                     TEXT,                            -- 備考 / 备注
  created_by               VARCHAR(200),                    -- 作成者 / 创建人
  purchase_order_number    VARCHAR(100),                    -- 発注番号 / 采购单号
  purchase_order_date      TIMESTAMPTZ,                     -- 発注日 / 采购日
  -- LOGIFAST 固有 / LOGIFAST 专属
  container_type           VARCHAR(10)                      -- コンテナタイプ / 集装箱类型
                           CHECK (container_type IN ('20ft', '40ft', '40ftH')),
  cubic_meters             NUMERIC(10,4) CHECK (cubic_meters >= 0), -- 立方数(M3) / 体积
  pallet_count             INT CHECK (pallet_count >= 0),   -- パレット数 / 托盘数
  inner_box_count          INT CHECK (inner_box_count >= 0),-- インナー箱数 / 内箱数
  import_batch_number      VARCHAR(100),                    -- 取込管理番号 / 导入批次号
  import_batch_date        TIMESTAMPTZ,                     -- 取込管理日 / 导入批次日期
  -- フロータイプ / 流程类型
  flow_type                VARCHAR(20) DEFAULT 'standard'   -- 入庫フロータイプ / 入库流程
                           CHECK (flow_type IN ('standard', 'crossdock', 'passthrough')),
  linked_order_ids         TEXT[],                          -- 紐付く出荷指示 / 关联出货指示
  -- 顧客関連 / 客户关联
  client_id                UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_name              VARCHAR(200),                    -- 顧客名キャッシュ / 客户名缓存
  sub_client_id            UUID REFERENCES sub_clients(id) ON DELETE SET NULL,
  sub_client_name          VARCHAR(200),
  shop_id                  UUID REFERENCES shops(id) ON DELETE SET NULL,
  shop_name                VARCHAR(200),
  -- 通過型拡張 / 通过型扩展
  destination_type         VARCHAR(10)                      -- 出荷先タイプ / 出货目的地
                           CHECK (destination_type IN ('fba', 'rsl', 'b2b')),
  service_options          JSONB DEFAULT '[]',              -- 作業オプション / 作业选项
  fba_info                 JSONB,                           -- FBA情報 / FBA信息
  rsl_info                 JSONB,                           -- RSL情報 / RSL信息
  b2b_info                 JSONB,                           -- B2B情報 / B2B信息
  shipping_method          VARCHAR(20)                      -- 配送方式 / 配送方法
                           CHECK (shipping_method IN ('truck', 'parcel')),
  tracking_numbers         JSONB DEFAULT '[]',              -- 追跡番号 / 追踪号
  variance_report          JSONB,                           -- 差異明細 / 差异明细
  -- 到着情報 / 到货信息
  actual_arrival_date      TIMESTAMPTZ,                     -- 実到着日 / 实际到货日
  total_box_count          INT CHECK (total_box_count >= 0),-- 総箱数 / 总箱数
  actual_box_count         INT CHECK (actual_box_count >= 0),-- 実受領箱数 / 实收箱数
  total_weight             NUMERIC(10,2) CHECK (total_weight >= 0), -- 総重量(kg) / 总重量
  received_by              VARCHAR(200),                    -- 受付担当 / 受付人员
  arrived_at               TIMESTAMPTZ,                     -- 受付完了日時 / 受付完成时间
  shipped_at               TIMESTAMPTZ,                     -- 出荷完了日時 / 出货完成时间
  custom_fields            JSONB DEFAULT '{}',              -- カスタムフィールド / 自定义字段
  -- タイムスタンプ / 时间戳
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at               TIMESTAMPTZ
);

-- インデックス / 索引
CREATE INDEX idx_inbound_orders_tenant_status ON inbound_orders (tenant_id, status);
CREATE INDEX idx_inbound_orders_flow ON inbound_orders (tenant_id, flow_type, status);
CREATE INDEX idx_inbound_orders_client ON inbound_orders (tenant_id, client_id, created_at DESC);
CREATE INDEX idx_inbound_orders_expected ON inbound_orders (tenant_id, expected_date) WHERE status NOT IN ('done', 'cancelled');

-- トリガー / 触发器
SELECT create_updated_at_trigger('inbound_orders');
SELECT create_audit_trigger('inbound_orders');
```

### 6.2 inbound_order_lines — 入庫指示明細 / 入库单明细

> MongoDB: inboundOrder.lines[] → 正規化して独立テーブル

```sql
CREATE TABLE inbound_order_lines (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  inbound_order_id         UUID NOT NULL REFERENCES inbound_orders(id) ON DELETE CASCADE,
  -- 明細情報 / 明细信息
  line_number              INT NOT NULL,                    -- 行番号 / 行号
  product_id               UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_sku              VARCHAR(200) NOT NULL,           -- 商品SKU / 商品SKU
  product_name             VARCHAR(500),                    -- 商品名 / 商品名
  expected_quantity        INT NOT NULL CHECK (expected_quantity >= 1), -- 予定数量 / 预定数量
  received_quantity        INT NOT NULL DEFAULT 0 CHECK (received_quantity >= 0), -- 受領数量 / 实收数量
  -- ロット / 批次
  lot_id                   UUID,                            -- ロットID / 批次ID
  lot_number               VARCHAR(100),                    -- ロット番号 / 批次号
  expiry_date              TIMESTAMPTZ,                     -- 有効期限 / 有效期
  -- ロケーション / 库位
  location_id              UUID REFERENCES locations(id) ON DELETE SET NULL,
  stock_move_ids           UUID[] DEFAULT '{}',             -- 在庫移動IDs / 库存移动IDs
  putaway_location_id      UUID REFERENCES locations(id) ON DELETE SET NULL,
  putaway_quantity         INT NOT NULL DEFAULT 0 CHECK (putaway_quantity >= 0),
  stock_category           VARCHAR(20) NOT NULL DEFAULT 'new'
                           CHECK (stock_category IN ('new', 'damaged')),
  order_reference_number   VARCHAR(100),                    -- 注文参照番号 / 订单参考号
  memo                     TEXT,
  -- LOGIFAST 固有 / LOGIFAST 专属
  expected_case_count      INT CHECK (expected_case_count >= 0),  -- 予定ケース数 / 预定箱数
  received_case_count      INT CHECK (received_case_count >= 0),  -- 実績ケース数 / 实际箱数
  case_unit_type           VARCHAR(5) CHECK (case_unit_type IN ('01', '02', '03', '04', '05')),
  case_unit_quantity       INT CHECK (case_unit_quantity >= 1),
  customer_product_code    VARCHAR(200),                    -- 顧客商品コード / 客户商品编码
  inspection_code          VARCHAR(100),                    -- 検品コード / 检品编码
  -- タイムスタンプ / 时间戳
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (inbound_order_id, line_number)
);

-- インデックス / 索引
CREATE INDEX idx_inbound_lines_order ON inbound_order_lines (inbound_order_id);
CREATE INDEX idx_inbound_lines_product ON inbound_order_lines (product_id);
CREATE INDEX idx_inbound_lines_lot ON inbound_order_lines (lot_id) WHERE lot_id IS NOT NULL;

-- トリガー / 触发器
SELECT create_updated_at_trigger('inbound_order_lines');
```

---

## 7. Inventory ドメイン / 库存域

### 7.1 lots — ロット / 批次

> MongoDB: `backend/src/models/lot.ts`

```sql
CREATE TABLE lots (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- 基本情報 / 基本信息
  lot_number            VARCHAR(100) NOT NULL,              -- ロット番号 / 批次号
  product_id            UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_sku           VARCHAR(200) NOT NULL,              -- 商品SKU / 商品SKU
  product_name          VARCHAR(500),                       -- 商品名 / 商品名
  -- 日付 / 日期
  expiry_date           TIMESTAMPTZ,                        -- 有効期限 / 有效期
  manufacture_date      TIMESTAMPTZ,                        -- 製造日 / 生产日
  -- ステータス / 状态
  status                VARCHAR(20) NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'expired', 'recalled', 'quarantine')),
  -- 追加情報 / 附加信息
  supplier_lot_number   VARCHAR(200),                       -- 仕入先ロット番号 / 供应商批次号
  inbound_date          TIMESTAMPTZ,                        -- 入庫日 / 入库日
  inbound_order_number  VARCHAR(100),                       -- 入庫指示番号 / 入库单号
  memo                  TEXT,
  -- タイムスタンプ / 时间戳
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ,

  UNIQUE (product_id, lot_number)
);

-- インデックス / 索引
CREATE INDEX idx_lots_product ON lots (product_id);
CREATE INDEX idx_lots_status ON lots (status);
CREATE INDEX idx_lots_expiry ON lots (expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX idx_lots_sku ON lots (product_sku);
CREATE INDEX idx_lots_tenant ON lots (tenant_id, created_at DESC);

-- トリガー / 触发器
SELECT create_updated_at_trigger('lots');
```

### 7.2 stock_quants — 在庫数量 / 库存量

> MongoDB: `backend/src/models/stockQuant.ts`
> コア制約: product_id + location_id + lot_id がユニーク
> 核心约束: product_id + location_id + lot_id 唯一

```sql
CREATE TABLE stock_quants (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- 在庫キー / 库存键
  product_id        UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_sku       VARCHAR(200) NOT NULL,                  -- 冗長フィールド（検索高速化）/ 冗余字段（加速查询）
  location_id       UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  lot_id            UUID REFERENCES lots(id) ON DELETE SET NULL,
  -- 数量 / 数量
  quantity          INT NOT NULL DEFAULT 0,                 -- 在庫数量 / 库存数量
  reserved_quantity INT NOT NULL DEFAULT 0,                 -- 引当数量 / 预留数量
  last_moved_at     TIMESTAMPTZ,                            -- 最終移動日時 / 最后移动时间
  -- タイムスタンプ / 时间戳
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

-- COALESCE で NULL lot_id のユニーク制約を実現 / 用COALESCE处理NULL lot_id的唯一约束
CREATE UNIQUE INDEX idx_stock_quants_unique
  ON stock_quants (product_id, location_id, COALESCE(lot_id, '00000000-0000-0000-0000-000000000000'));

-- インデックス / 索引
CREATE INDEX idx_stock_quants_product ON stock_quants (product_id);
CREATE INDEX idx_stock_quants_location ON stock_quants (location_id);
CREATE INDEX idx_stock_quants_lot ON stock_quants (lot_id) WHERE lot_id IS NOT NULL;
CREATE INDEX idx_stock_quants_sku ON stock_quants (product_sku);
CREATE INDEX idx_stock_quants_available ON stock_quants (product_id, quantity, reserved_quantity) WHERE quantity > 0;
CREATE INDEX idx_stock_quants_tenant ON stock_quants (tenant_id, product_id, location_id);

-- トリガー / 触发器
SELECT create_updated_at_trigger('stock_quants');
```

### 7.3 stock_moves — 在庫移動（追記型台帳）/ 库存移动（追加型台账）

> MongoDB: `backend/src/models/stockMove.ts`

```sql
CREATE TABLE stock_moves (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- 基本情報 / 基本信息
  move_number       VARCHAR(50) NOT NULL UNIQUE,            -- 移動番号 / 移动单号
  move_type         VARCHAR(20) NOT NULL                    -- 移動タイプ / 移动类型
                    CHECK (move_type IN ('inbound', 'outbound', 'transfer', 'adjustment', 'return', 'stocktaking')),
  state             VARCHAR(20) NOT NULL DEFAULT 'draft'    -- ステータス / 状态
                    CHECK (state IN ('draft', 'confirmed', 'done', 'cancelled')),
  -- 商品情報 / 商品信息
  product_id        UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_sku       VARCHAR(200) NOT NULL,
  product_name      VARCHAR(500),
  lot_id            UUID REFERENCES lots(id) ON DELETE SET NULL,
  lot_number        VARCHAR(100),
  -- ロケーション / 库位
  from_location_id  UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  to_location_id    UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  quantity          INT NOT NULL CHECK (quantity >= 0),      -- 移動数量 / 移动数量
  -- 参照 / 关联
  reference_type    VARCHAR(30)                             -- 参照タイプ / 引用类型
                    CHECK (reference_type IN ('inbound-order', 'shipment-order', 'adjustment',
                                              'manual', 'stocktaking-order', 'return-order')),
  reference_id      VARCHAR(100),                           -- 参照ID / 引用ID
  reference_number  VARCHAR(100),                           -- 参照番号 / 引用编号
  -- 実行情報 / 执行信息
  scheduled_date    TIMESTAMPTZ,                            -- 予定日 / 预定日
  executed_at       TIMESTAMPTZ,                            -- 実行日時 / 执行时间
  executed_by       VARCHAR(200),                           -- 実行者 / 执行人
  memo              TEXT,
  -- タイムスタンプ / 时间戳
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

-- インデックス / 索引
CREATE INDEX idx_stock_moves_type_state ON stock_moves (move_type, state);
CREATE INDEX idx_stock_moves_product ON stock_moves (product_id, state);
CREATE INDEX idx_stock_moves_ref ON stock_moves (reference_type, reference_id);
CREATE INDEX idx_stock_moves_ref_state ON stock_moves (reference_id, state);
CREATE INDEX idx_stock_moves_tenant_time ON stock_moves (tenant_id, created_at DESC);
CREATE INDEX idx_stock_moves_executed ON stock_moves (executed_at DESC);

-- トリガー / 触发器
SELECT create_updated_at_trigger('stock_moves');
```

### 7.4 inventory_reservations — 在庫引当 / 库存预留

> MongoDB: `backend/src/models/inventoryReservation.ts`

```sql
CREATE TABLE inventory_reservations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- 引当対象 / 预留目标
  product_id        UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_sku       VARCHAR(200) NOT NULL,
  client_id         UUID REFERENCES clients(id) ON DELETE SET NULL,
  warehouse_id      UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  location_id       UUID REFERENCES locations(id) ON DELETE SET NULL,
  lot_id            UUID REFERENCES lots(id) ON DELETE SET NULL,
  serial_id         UUID,                                   -- FK → serial_numbers
  -- 引当情報 / 预留信息
  quantity          INT NOT NULL CHECK (quantity >= 1),      -- 引当数量 / 预留数量
  status            VARCHAR(20) NOT NULL DEFAULT 'active'   -- ステータス / 状态
                    CHECK (status IN ('active', 'fulfilled', 'released', 'expired')),
  source            VARCHAR(20) NOT NULL                    -- 引当元 / 预留来源
                    CHECK (source IN ('order', 'shipment', 'transfer', 'manual')),
  reference_id      VARCHAR(100) NOT NULL,                  -- 参照ID / 引用ID
  reference_number  VARCHAR(100),                           -- 参照番号 / 引用编号
  -- 日時 / 日期
  reserved_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),     -- 引当日時 / 预留时间
  fulfilled_at      TIMESTAMPTZ,                            -- 充足日時 / 完成时间
  released_at       TIMESTAMPTZ,                            -- 解放日時 / 释放时间
  expires_at        TIMESTAMPTZ,                            -- 有効期限 / 到期时间
  -- タイムスタンプ / 时间戳
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

-- インデックス / 索引
CREATE INDEX idx_reservations_product ON inventory_reservations (product_id, warehouse_id, status);
CREATE INDEX idx_reservations_ref ON inventory_reservations (reference_id, source);
CREATE INDEX idx_reservations_expires ON inventory_reservations (expires_at, status) WHERE status = 'active';
CREATE INDEX idx_reservations_tenant ON inventory_reservations (tenant_id, status);

-- トリガー / 触发器
SELECT create_updated_at_trigger('inventory_reservations');
```

### 7.5 inventory_ledger — 在庫台帳（追記型）/ 库存台账（追加型）

> MongoDB: `backend/src/models/inventoryLedger.ts`
> 追記専用テーブル: UPDATE/DELETE 禁止パターン推奨
> 只追加表: 建议禁止UPDATE/DELETE

```sql
CREATE TABLE inventory_ledger (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- 対象 / 目标
  client_id         UUID REFERENCES clients(id) ON DELETE SET NULL,
  product_id        UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_sku       VARCHAR(200) NOT NULL,
  warehouse_id      UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  location_id       UUID REFERENCES locations(id) ON DELETE SET NULL,
  lot_id            UUID REFERENCES lots(id) ON DELETE SET NULL,
  lot_number        VARCHAR(100),
  -- 変動情報 / 变动信息
  type              VARCHAR(20) NOT NULL                    -- 変動タイプ / 变动类型
                    CHECK (type IN ('inbound', 'outbound', 'reserve', 'release', 'adjustment', 'count')),
  quantity          INT NOT NULL,                           -- 変動数（正=増, 負=減）/ 变动数（正=增，负=减）
  -- 参照 / 关联
  reference_type    VARCHAR(30),                            -- 参照タイプ / 引用类型
  reference_id      VARCHAR(100),                           -- 参照ID / 引用ID
  reference_number  VARCHAR(100),                           -- 参照番号 / 引用编号
  reason            TEXT,                                   -- 理由 / 原因
  executed_by       VARCHAR(200),                           -- 実行者 / 执行人
  executed_at       TIMESTAMPTZ,                            -- 実行日時 / 执行时间
  -- タイムスタンプ / 时间戳（作成のみ）
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- 注意: updated_at, deleted_at なし（追記専用）/ 无updated_at, deleted_at（只追加）
);

-- インデックス / 索引
CREATE INDEX idx_ledger_product ON inventory_ledger (product_id, warehouse_id, client_id);
CREATE INDEX idx_ledger_tenant_time ON inventory_ledger (tenant_id, created_at DESC);
CREATE INDEX idx_ledger_ref ON inventory_ledger (reference_type, reference_id);
CREATE INDEX idx_ledger_type ON inventory_ledger (type, created_at DESC);
```

---

## 8. Returns ドメイン / 退货域

### 8.1 return_orders — 返品指示 / 退货单

> MongoDB: `backend/src/models/returnOrder.ts`

```sql
CREATE TABLE return_orders (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- 基本情報 / 基本信息
  order_number           VARCHAR(50) NOT NULL UNIQUE,       -- 返品番号 / 退货单号
  status                 VARCHAR(20) NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft', 'inspecting', 'completed', 'cancelled')),
  -- 関連出荷 / 关联出货
  shipment_order_id      UUID REFERENCES shipment_orders(id) ON DELETE SET NULL,
  shipment_order_number  VARCHAR(100),                      -- 出荷番号キャッシュ / 出货单号缓存
  -- 返品理由 / 退货原因
  return_reason          VARCHAR(30) NOT NULL               -- 返品理由 / 退货原因
                         CHECK (return_reason IN ('customer_request', 'defective', 'wrong_item', 'damaged', 'other')),
  reason_detail          TEXT,                              -- 理由詳細 / 详细原因
  customer_name          VARCHAR(200),                      -- 顧客名 / 客户名
  -- 日時 / 日期
  received_date          TIMESTAMPTZ NOT NULL,              -- 受領日 / 收货日
  completed_at           TIMESTAMPTZ,                       -- 完了日時 / 完成时间
  -- 追加情報 / 附加信息
  memo                   TEXT,
  created_by             VARCHAR(200),                      -- 作成者 / 创建人
  rma_number             VARCHAR(100),                      -- RMA番号 / RMA编号
  return_tracking_id     VARCHAR(100),                      -- 返品伝票番号 / 退货快递单号
  customer_order_number  VARCHAR(100),                      -- 顧客注文番号 / 客户订单号
  custom_fields          JSONB DEFAULT '{}',
  -- タイムスタンプ / 时间戳
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at             TIMESTAMPTZ
);

-- インデックス / 索引
CREATE INDEX idx_return_orders_tenant_time ON return_orders (tenant_id, created_at DESC);
CREATE INDEX idx_return_orders_status ON return_orders (tenant_id, status);
CREATE INDEX idx_return_orders_shipment ON return_orders (shipment_order_id) WHERE shipment_order_id IS NOT NULL;

-- トリガー / 触发器
SELECT create_updated_at_trigger('return_orders');
SELECT create_audit_trigger('return_orders');
```

### 8.2 return_order_lines — 返品明細 / 退货明细

```sql
CREATE TABLE return_order_lines (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  return_order_id    UUID NOT NULL REFERENCES return_orders(id) ON DELETE CASCADE,
  -- 明細情報 / 明细信息
  line_number        INT NOT NULL,                          -- 行番号 / 行号
  product_id         UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_sku        VARCHAR(200) NOT NULL,
  product_name       VARCHAR(500),
  quantity           INT NOT NULL CHECK (quantity >= 1),     -- 返品数量 / 退货数量
  inspected_quantity INT NOT NULL DEFAULT 0,                -- 検品済数量 / 已检品数量
  disposition        VARCHAR(20) NOT NULL DEFAULT 'pending' -- 処分方法 / 处置方式
                     CHECK (disposition IN ('restock', 'dispose', 'repair', 'pending')),
  restocked_quantity INT NOT NULL DEFAULT 0,                -- 再入庫数量 / 重新入库数量
  disposed_quantity  INT NOT NULL DEFAULT 0,                -- 廃棄数量 / 废弃数量
  location_id        UUID REFERENCES locations(id) ON DELETE SET NULL,
  lot_id             UUID REFERENCES lots(id) ON DELETE SET NULL,
  lot_number         VARCHAR(100),
  memo               TEXT,
  -- タイムスタンプ / 时间戳
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (return_order_id, line_number)
);

-- インデックス / 索引
CREATE INDEX idx_return_lines_order ON return_order_lines (return_order_id);
CREATE INDEX idx_return_lines_product ON return_order_lines (product_id);

-- トリガー / 触发器
SELECT create_updated_at_trigger('return_order_lines');
```

---

## 9. Billing ドメイン / 计费域

### 9.1 service_rates — サービス料金マスタ / 服务费率主数据

> MongoDB: `backend/src/models/serviceRate.ts`

```sql
CREATE TABLE service_rates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- 基本情報 / 基本信息
  client_id       UUID REFERENCES clients(id) ON DELETE SET NULL, -- 顧客別料金 / 客户专属费率（NULL=全客户通用）
  charge_type     VARCHAR(30) NOT NULL                     -- チャージ種別 / 费用类型
                  CHECK (charge_type IN (
                    'inbound_handling', 'storage', 'outbound_handling', 'picking', 'packing',
                    'inspection', 'shipping', 'material', 'return_handling', 'labeling',
                    'opp_bagging', 'suffocation_label', 'fragile_label', 'bubble_wrap',
                    'set_assembly', 'box_splitting', 'box_merging', 'box_replacement',
                    'photo_documentation', 'rush_processing', 'multi_fc_surcharge',
                    'overdue_storage', 'fba_delivery', 'other'
                  )),
  name            VARCHAR(200) NOT NULL,                   -- 料金名 / 费率名称
  unit            VARCHAR(30),                             -- 単位 / 单位（件/箱/パレット等）
  unit_price      NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0), -- 単価 / 单价
  conditions      JSONB DEFAULT '{}',                      -- 適用条件 / 适用条件
  -- 有効期間 / 有效期
  valid_from      TIMESTAMPTZ,
  valid_to        TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  memo            TEXT,
  -- タイムスタンプ / 时间戳
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

-- インデックス / 索引
CREATE INDEX idx_service_rates_tenant_type ON service_rates (tenant_id, charge_type, is_active);
CREATE INDEX idx_service_rates_client ON service_rates (client_id) WHERE client_id IS NOT NULL;

-- トリガー / 触发器
SELECT create_updated_at_trigger('service_rates');
```

### 9.2 shipping_rates — 運賃レート / 运费率

> MongoDB: `backend/src/models/shippingRate.ts`

```sql
CREATE TABLE shipping_rates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- 基本情報 / 基本信息
  carrier_id        VARCHAR(100) NOT NULL,                  -- 配送業者ID / 配送商ID
  carrier_name      VARCHAR(200),                           -- 配送業者名キャッシュ / 配送商名缓存
  name              VARCHAR(200) NOT NULL,                  -- 料金プラン名 / 费率方案名
  -- サイズ条件 / 尺寸条件
  size_type         VARCHAR(20) NOT NULL                    -- サイズタイプ / 尺寸类型
                    CHECK (size_type IN ('weight', 'dimension', 'flat')),
  size_min          NUMERIC(10,2),                          -- 最小値 / 最小值
  size_max          NUMERIC(10,2),                          -- 最大値 / 最大值
  -- 地区条件 / 地区条件
  from_prefectures  TEXT[],                                 -- 発送元都道府県 / 发货地都道府县
  to_prefectures    TEXT[],                                 -- 配送先都道府県 / 收货地都道府县
  -- 料金 / 费用
  base_price        NUMERIC(12,2) NOT NULL CHECK (base_price >= 0), -- 基本料金 / 基本费用
  cool_surcharge    NUMERIC(12,2) NOT NULL DEFAULT 0,       -- クール便追加 / 冷藏附加费
  cod_surcharge     NUMERIC(12,2) NOT NULL DEFAULT 0,       -- 代金引換手数料 / 货到付款手续费
  fuel_surcharge    NUMERIC(12,2) NOT NULL DEFAULT 0,       -- 燃油サーチャージ / 燃油附加费
  -- 有効期間 / 有效期
  valid_from        TIMESTAMPTZ,
  valid_to          TIMESTAMPTZ,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  memo              TEXT,
  -- タイムスタンプ / 时间戳
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

-- インデックス / 索引
CREATE INDEX idx_shipping_rates_carrier ON shipping_rates (tenant_id, carrier_id, is_active);
CREATE INDEX idx_shipping_rates_size ON shipping_rates (size_type, size_min, size_max);

-- トリガー / 触发器
SELECT create_updated_at_trigger('shipping_rates');
```

### 9.3 billing_records — 請求明細 / 请求明细

> MongoDB: `backend/src/models/billingRecord.ts`

```sql
CREATE TABLE billing_records (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- 集計キー / 聚合键
  period                VARCHAR(7) NOT NULL                 -- 対象期間 / 对象期间
                        CHECK (period ~ '^\d{4}-\d{2}$'),   -- YYYY-MM 形式
  client_id             UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_name           VARCHAR(200),
  carrier_id            VARCHAR(100),
  carrier_name          VARCHAR(200),
  -- 集計データ / 汇总数据
  order_count           INT NOT NULL DEFAULT 0,             -- 出荷件数 / 出货件数
  total_quantity        INT NOT NULL DEFAULT 0,             -- 商品総数 / 商品总数
  total_shipping_cost   NUMERIC(14,2) NOT NULL DEFAULT 0,   -- 配送料金合計 / 配送费用合计
  handling_fee          NUMERIC(14,2) NOT NULL DEFAULT 0,   -- 作業手数料 / 操作手续费
  storage_fee           NUMERIC(14,2) NOT NULL DEFAULT 0,   -- 保管料 / 保管费
  other_fees            NUMERIC(14,2) NOT NULL DEFAULT 0,   -- その他費用 / 其他费用
  total_amount          NUMERIC(14,2) NOT NULL DEFAULT 0,   -- 合計金額 / 合计金额
  -- ステータス / 状态
  status                VARCHAR(20) NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'confirmed', 'invoiced', 'paid')),
  confirmed_at          TIMESTAMPTZ,
  confirmed_by          VARCHAR(200),
  memo                  TEXT,
  -- タイムスタンプ / 时间戳
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ,

  UNIQUE (tenant_id, period, COALESCE(client_id, '00000000-0000-0000-0000-000000000000'),
          COALESCE(carrier_id, ''))
);

-- インデックス / 索引
CREATE INDEX idx_billing_records_period ON billing_records (tenant_id, period);
CREATE INDEX idx_billing_records_client ON billing_records (tenant_id, client_id);
CREATE INDEX idx_billing_records_status ON billing_records (status);

-- トリガー / 触发器
SELECT create_updated_at_trigger('billing_records');
SELECT create_audit_trigger('billing_records');
```

### 9.4 invoices — 請求書 / 发票

> MongoDB: `backend/src/models/invoice.ts`

```sql
CREATE TABLE invoices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- 基本情報 / 基本信息
  invoice_number    VARCHAR(100) NOT NULL UNIQUE,           -- 請求書番号 / 发票编号（INV-YYYYMM-NNN）
  billing_record_id UUID REFERENCES billing_records(id) ON DELETE SET NULL,
  client_id         UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_name       VARCHAR(200),
  period            VARCHAR(7) NOT NULL                     -- 対象期間 / 对象期间
                    CHECK (period ~ '^\d{4}-\d{2}$'),
  -- 日付 / 日期
  issue_date        TIMESTAMPTZ NOT NULL,                   -- 発行日 / 发行日
  due_date          TIMESTAMPTZ NOT NULL,                   -- 支払期限 / 支付期限
  -- 金額 / 金额
  subtotal          NUMERIC(14,2) NOT NULL DEFAULT 0,       -- 小計 / 小计
  tax_rate          NUMERIC(5,4) NOT NULL DEFAULT 0.10,     -- 税率 / 税率（例: 0.10）
  tax_amount        NUMERIC(14,2) NOT NULL DEFAULT 0,       -- 税額 / 税额
  total_amount      NUMERIC(14,2) NOT NULL DEFAULT 0,       -- 合計 / 合计
  -- 明細 / 明细
  line_items        JSONB DEFAULT '[]',                     -- 明細行配列 / 明细行数组 [{description, quantity, unitPrice, amount}]
  -- ステータス / 状态
  status            VARCHAR(20) NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'issued', 'sent', 'paid', 'overdue', 'cancelled')),
  paid_at           TIMESTAMPTZ,
  memo              TEXT,
  -- タイムスタンプ / 时间戳
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

-- インデックス / 索引
CREATE INDEX idx_invoices_tenant_period ON invoices (tenant_id, period);
CREATE INDEX idx_invoices_client ON invoices (client_id);
CREATE INDEX idx_invoices_status ON invoices (status);
CREATE INDEX idx_invoices_due ON invoices (due_date) WHERE status IN ('issued', 'sent', 'overdue');

-- トリガー / 触发器
SELECT create_updated_at_trigger('invoices');
SELECT create_audit_trigger('invoices');
```

### 9.5 work_charges — 作業チャージ / 作业费用

> MongoDB: `backend/src/models/workCharge.ts`

```sql
CREATE TABLE work_charges (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- 対象 / 目标
  client_id         UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_name       VARCHAR(200),
  sub_client_id     UUID REFERENCES sub_clients(id) ON DELETE SET NULL,
  sub_client_name   VARCHAR(200),
  shop_id           UUID REFERENCES shops(id) ON DELETE SET NULL,
  shop_name         VARCHAR(200),
  -- チャージ情報 / 费用信息
  charge_type       VARCHAR(30) NOT NULL,                   -- チャージ種別 / 费用类型
  charge_date       TIMESTAMPTZ NOT NULL,                   -- チャージ日 / 费用日期
  reference_type    VARCHAR(30),                            -- 参照タイプ / 引用类型
  reference_id      VARCHAR(100),                           -- 参照ID / 引用ID
  quantity          INT NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  unit_price        NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  amount            NUMERIC(12,2) NOT NULL,                 -- 金額 / 金额
  description       TEXT,                                   -- 説明 / 说明
  billing_period    VARCHAR(7),                             -- 請求期間 / 计费期间
  is_billed         BOOLEAN NOT NULL DEFAULT FALSE,         -- 請求済 / 已计费
  -- タイムスタンプ / 时间戳
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

-- インデックス / 索引
CREATE INDEX idx_work_charges_tenant_date ON work_charges (tenant_id, charge_date DESC);
CREATE INDEX idx_work_charges_client_billed ON work_charges (tenant_id, client_id, is_billed);
CREATE INDEX idx_work_charges_period ON work_charges (billing_period);

-- トリガー / 触发器
SELECT create_updated_at_trigger('work_charges');
```

---

## 10. Carriers ドメイン / 配送域

### 10.1 carriers — 配送業者 / 快递公司

> MongoDB: `backend/src/models/carrier.ts`

```sql
CREATE TABLE carriers (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- 基本情報 / 基本信息
  code                    VARCHAR(100) NOT NULL,            -- 配送業者コード / 快递公司编码
  name                    VARCHAR(200) NOT NULL,            -- 配送業者名 / 快递公司名
  description             TEXT,                             -- 説明 / 描述
  enabled                 BOOLEAN NOT NULL DEFAULT TRUE,    -- 有効フラグ / 是否启用
  -- フォーマット / 格式
  tracking_id_column_name VARCHAR(200),                     -- 伝票番号列名 / 快递单号列名
  format_definition       JSONB NOT NULL DEFAULT '{"columns":[]}', -- 格式定義 / 格式定义 {columns: [{name, type, maxWidth, required, userUploadable}]}
  is_built_in             BOOLEAN NOT NULL DEFAULT FALSE,   -- 内蔵配送業者 / 是否内置
  automation_type         VARCHAR(20)                       -- 自動化タイプ / 自动化类型
                          CHECK (automation_type IN ('yamato-b2', 'sagawa-api', 'seino-api')),
  services                JSONB,                            -- 送り状種類設定 / 送状类型设定 [{invoiceType, printTemplateId}]
  -- タイムスタンプ / 时间戳
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at              TIMESTAMPTZ,

  UNIQUE (tenant_id, code)
);

-- インデックス / 索引
CREATE INDEX idx_carriers_enabled ON carriers (tenant_id, enabled) WHERE deleted_at IS NULL;

-- トリガー / 触发器
SELECT create_updated_at_trigger('carriers');
```

### 10.2 order_source_companies — 依頼主 / 委托方

> MongoDB: `backend/src/models/orderSourceCompany.ts`

```sql
CREATE TABLE order_source_companies (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- 依頼主情報 / 委托方信息
  sender_name              VARCHAR(200) NOT NULL,           -- 依頼主名 / 委托方名
  sender_postal_code       VARCHAR(7),                      -- 郵便番号 / 邮编
  sender_address_prefecture VARCHAR(50),                    -- 都道府県 / 都道府县
  sender_address_city      VARCHAR(100),                    -- 市区町村 / 市区町村
  sender_address_street    TEXT,                            -- 町・番地 / 街道
  sender_phone             VARCHAR(50),                     -- 電話番号 / 电话
  -- ヤマト固有 / 雅玛多专属
  hatsu_base_no1           VARCHAR(3),                      -- 発店コード1 / 发站代码1
  hatsu_base_no2           VARCHAR(3),                      -- 発店コード2 / 发站代码2
  -- ステータス / 状态
  is_active                BOOLEAN NOT NULL DEFAULT TRUE,
  memo                     TEXT,
  -- タイムスタンプ / 时间戳
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at               TIMESTAMPTZ
);

-- インデックス / 索引
CREATE INDEX idx_osc_tenant_active ON order_source_companies (tenant_id, is_active) WHERE deleted_at IS NULL;

-- トリガー / 触发器
SELECT create_updated_at_trigger('order_source_companies');
```

---

## 11. Warehouse Operations ドメイン / 仓库运营域

### 11.1 waves — 波次 / 波次

> MongoDB: `backend/src/models/wave.ts`

```sql
CREATE TABLE waves (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- 基本情報 / 基本信息
  wave_number     VARCHAR(50) NOT NULL UNIQUE,              -- 波次番号 / 波次号
  warehouse_id    UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  client_id       UUID REFERENCES clients(id) ON DELETE SET NULL,
  -- ステータス / 状态
  status          VARCHAR(20) NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'picking', 'sorting', 'packing', 'completed', 'cancelled')),
  priority        VARCHAR(10) NOT NULL DEFAULT 'normal'
                  CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  -- 集計 / 汇总
  shipment_ids    UUID[] DEFAULT '{}',                      -- 出荷指示IDリスト / 出货指示ID列表
  shipment_count  INT NOT NULL DEFAULT 0,                   -- 出荷件数 / 出货件数
  total_items     INT NOT NULL DEFAULT 0,                   -- 合計商品点数 / 总商品种数
  total_quantity  INT NOT NULL DEFAULT 0,                   -- 合計数量 / 总数量
  -- 担当 / 负责人
  assigned_to     VARCHAR(100),                             -- 担当者ID / 负责人ID
  assigned_name   VARCHAR(200),                             -- 担当者名 / 负责人名
  -- 日時 / 日期
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  memo            TEXT,
  -- タイムスタンプ / 时间戳
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

-- インデックス / 索引
CREATE INDEX idx_waves_tenant_status ON waves (tenant_id, status);
CREATE INDEX idx_waves_warehouse ON waves (warehouse_id, status);
CREATE INDEX idx_waves_priority ON waves (tenant_id, priority, status);

-- トリガー / 触发器
SELECT create_updated_at_trigger('waves');
```

### 11.2 pick_tasks — ピッキングタスク / 拣货任务

> MongoDB: `backend/src/models/pickTask.ts`

```sql
CREATE TABLE pick_tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- 基本情報 / 基本信息
  task_number     VARCHAR(50) NOT NULL UNIQUE,              -- タスク番号 / 任务号
  wave_id         UUID NOT NULL REFERENCES waves(id) ON DELETE CASCADE,
  warehouse_id    UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  -- 担当 / 负责人
  picker_id       VARCHAR(100),                             -- 拣货者ID / 拣货员ID
  picker_name     VARCHAR(200),                             -- 拣货者名 / 拣货员名
  -- ステータス / 状态
  status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'picking', 'completed', 'cancelled')),
  -- 進捗 / 进度
  total_items     INT NOT NULL DEFAULT 0,                   -- 合計商品点数 / 总商品种数
  picked_items    INT NOT NULL DEFAULT 0,                   -- 拣取済点数 / 已拣种数
  total_quantity  INT NOT NULL DEFAULT 0,                   -- 合計数量 / 总数量
  picked_quantity INT NOT NULL DEFAULT 0,                   -- 拣取済数量 / 已拣数量
  -- 日時 / 日期
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  memo            TEXT,
  -- タイムスタンプ / 时间戳
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス / 索引
CREATE INDEX idx_pick_tasks_wave ON pick_tasks (wave_id);
CREATE INDEX idx_pick_tasks_status ON pick_tasks (tenant_id, status);
CREATE INDEX idx_pick_tasks_picker ON pick_tasks (picker_id, status);

-- トリガー / 触发器
SELECT create_updated_at_trigger('pick_tasks');
```

### 11.3 pick_items — ピッキング明細 / 拣货明细

> MongoDB: `backend/src/models/pickItem.ts`

```sql
CREATE TABLE pick_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  pick_task_id      UUID NOT NULL REFERENCES pick_tasks(id) ON DELETE CASCADE,
  -- 対象 / 目标
  shipment_id       UUID REFERENCES shipment_orders(id) ON DELETE SET NULL,
  product_id        UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  location_id       UUID REFERENCES locations(id) ON DELETE SET NULL,
  lot_id            UUID REFERENCES lots(id) ON DELETE SET NULL,
  -- 数量 / 数量
  required_quantity INT NOT NULL CHECK (required_quantity >= 1),  -- 必要数量 / 需求数量
  picked_quantity   INT NOT NULL DEFAULT 0,                      -- 拣取済数量 / 已拣数量
  -- ステータス / 状态
  status            VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'picked', 'short', 'skipped')),
  -- タイムスタンプ / 时间戳
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス / 索引
CREATE INDEX idx_pick_items_task ON pick_items (pick_task_id);
CREATE INDEX idx_pick_items_shipment ON pick_items (shipment_id);
CREATE INDEX idx_pick_items_product ON pick_items (product_id);

-- トリガー / 触发器
SELECT create_updated_at_trigger('pick_items');
```

### 11.4 materials — 耗材マスタ / 耗材主数据

> MongoDB: `backend/src/models/material.ts`

```sql
CREATE TABLE materials (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- 基本情報 / 基本信息
  material_sku    VARCHAR(200) NOT NULL,                    -- 耗材SKU / 耗材SKU
  name            VARCHAR(500) NOT NULL,                    -- 耗材名 / 耗材名
  description     TEXT,                                     -- 説明 / 描述
  unit_cost       NUMERIC(12,2) CHECK (unit_cost >= 0),     -- 単価 / 单价
  stock_quantity  INT NOT NULL DEFAULT 0,                   -- 在庫数 / 库存数
  -- ステータス / 状态
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  memo            TEXT,
  -- タイムスタンプ / 时间戳
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,

  UNIQUE (tenant_id, material_sku)
);

-- インデックス / 索引
CREATE INDEX idx_materials_active ON materials (tenant_id, is_active) WHERE deleted_at IS NULL;

-- トリガー / 触发器
SELECT create_updated_at_trigger('materials');
```

---

## 12. Notifications & Logs ドメイン / 通知与日志域

### 12.1 notifications — 通知 / 通知

> MongoDB: `backend/src/models/notification.ts`
> deleted_at なし: TTL で管理 / 不含deleted_at: TTL管理

```sql
CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  -- 受信者 / 接收者
  recipient_type  VARCHAR(20) NOT NULL                      -- 受信者タイプ / 接收者类型
                  CHECK (recipient_type IN ('user', 'client', 'role')),
  recipient_id    VARCHAR(100) NOT NULL,                    -- 受信者ID / 接收者ID
  recipient_email VARCHAR(200),                             -- 受信者メール / 接收者邮箱
  -- 配信 / 渠道
  channel         VARCHAR(20) NOT NULL                      -- チャネル / 渠道
                  CHECK (channel IN ('email', 'in_app', 'webhook', 'line', 'slack')),
  priority        VARCHAR(10) NOT NULL DEFAULT 'normal'     -- 優先度 / 优先级
                  CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  -- コンテンツ / 内容
  title           VARCHAR(500) NOT NULL,                    -- タイトル / 标题
  body            TEXT NOT NULL,                            -- 本文 / 正文
  html_body       TEXT,                                     -- HTML本文 / HTML正文
  -- 関連 / 关联
  event           VARCHAR(100),                             -- イベント名 / 事件名
  reference_type  VARCHAR(50),                              -- 関連エンティティタイプ / 关联实体类型
  reference_id    VARCHAR(100),                             -- 関連エンティティID / 关联实体ID
  -- ステータス / 状态
  status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'sent', 'failed', 'read')),
  sent_at         TIMESTAMPTZ,                              -- 送信時刻 / 发送时间
  read_at         TIMESTAMPTZ,                              -- 既読時刻 / 阅读时间
  error_message   TEXT,                                     -- 失敗理由 / 失败原因
  retry_count     INT NOT NULL DEFAULT 0,                   -- リトライ回数 / 重试次数
  -- タイムスタンプ / 时间戳
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス / 索引
CREATE INDEX idx_notifications_recipient ON notifications (recipient_id, status, created_at DESC);
CREATE INDEX idx_notifications_tenant_time ON notifications (tenant_id, created_at DESC);
CREATE INDEX idx_notifications_status ON notifications (status, retry_count) WHERE status IN ('pending', 'failed');

-- トリガー / 触发器
SELECT create_updated_at_trigger('notifications');
```

### 12.2 operation_logs — 操作ログ / 操作日志

> MongoDB: `backend/src/models/operationLog.ts`
> 追記専用テーブル / 只追加表

```sql
CREATE TABLE operation_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  -- 操作情報 / 操作信息
  user_id         UUID,                                     -- 操作者ID / 操作者ID
  user_name       VARCHAR(200),                             -- 操作者名 / 操作者名
  action          VARCHAR(100) NOT NULL,                    -- アクション / 操作动作
  entity_type     VARCHAR(50),                              -- エンティティタイプ / 实体类型
  entity_id       VARCHAR(100),                             -- エンティティID / 实体ID
  -- 詳細 / 详情
  description     TEXT,                                     -- 説明 / 描述
  metadata        JSONB DEFAULT '{}',                       -- 追加データ / 附加数据
  ip_address      INET,                                     -- IPアドレス / IP地址
  user_agent      TEXT,                                     -- ユーザーエージェント / 用户代理
  -- タイムスタンプ / 时间戳（作成のみ）
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス / 索引
CREATE INDEX idx_operation_logs_tenant_time ON operation_logs (tenant_id, created_at DESC);
CREATE INDEX idx_operation_logs_user ON operation_logs (user_id, created_at DESC);
CREATE INDEX idx_operation_logs_entity ON operation_logs (entity_type, entity_id);
CREATE INDEX idx_operation_logs_action ON operation_logs (action, created_at DESC);
```

---

## 13. RLS ポリシー / RLS 策略

> Supabase Auth の JWT `app_metadata` に `tenant_id` を格納し、二重防護とする。
> 将 tenant_id 存储在 Supabase Auth JWT 的 app_metadata 中，作为双重防护。

### 13.1 テンプレートパターン / 模板模式

```sql
-- ============================================================================
-- RLS ポリシーテンプレート / RLS 策略模板
-- すべてのテナントスコープテーブルに適用 / 应用于所有租户范围的表
-- ============================================================================

-- ステップ1: RLS 有効化 / 步骤1: 启用RLS
ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;

-- ステップ2: テナント分離ポリシー / 步骤2: 租户隔离策略
CREATE POLICY tenant_isolation_select ON <table_name>
  FOR SELECT
  USING (
    tenant_id = (
      current_setting('request.jwt.claims', true)::jsonb
      -> 'app_metadata' ->> 'tenant_id'
    )::uuid
  );

CREATE POLICY tenant_isolation_insert ON <table_name>
  FOR INSERT
  WITH CHECK (
    tenant_id = (
      current_setting('request.jwt.claims', true)::jsonb
      -> 'app_metadata' ->> 'tenant_id'
    )::uuid
  );

CREATE POLICY tenant_isolation_update ON <table_name>
  FOR UPDATE
  USING (
    tenant_id = (
      current_setting('request.jwt.claims', true)::jsonb
      -> 'app_metadata' ->> 'tenant_id'
    )::uuid
  );

CREATE POLICY tenant_isolation_delete ON <table_name>
  FOR DELETE
  USING (
    tenant_id = (
      current_setting('request.jwt.claims', true)::jsonb
      -> 'app_metadata' ->> 'tenant_id'
    )::uuid
  );
```

### 13.2 全テーブルへの RLS 適用 / 对所有表应用 RLS

```sql
-- ============================================================================
-- RLS 一括適用スクリプト / RLS 批量应用脚本
-- tenant_id を持つ全テーブルに適用 / 应用于所有含 tenant_id 的表
-- ============================================================================

DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'users', 'warehouses', 'locations', 'clients', 'sub_clients', 'shops',
    'products', 'stock_quants', 'stock_moves', 'lots',
    'inbound_orders', 'inbound_order_lines',
    'shipment_orders', 'shipment_order_products', 'shipment_order_materials',
    'return_orders', 'return_order_lines',
    'inventory_reservations', 'inventory_ledger',
    'billing_records', 'invoices', 'work_charges',
    'service_rates', 'shipping_rates',
    'carriers', 'order_source_companies',
    'waves', 'pick_tasks', 'pick_items', 'materials',
    'notifications', 'operation_logs'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    -- RLS 有効化 / 启用RLS
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);

    -- SELECT ポリシー / SELECT 策略
    EXECUTE format(
      'CREATE POLICY tenant_iso_sel_%s ON %I FOR SELECT USING (
        tenant_id = (current_setting(''request.jwt.claims'', true)::jsonb -> ''app_metadata'' ->> ''tenant_id'')::uuid
      )', tbl, tbl
    );

    -- INSERT ポリシー / INSERT 策略
    EXECUTE format(
      'CREATE POLICY tenant_iso_ins_%s ON %I FOR INSERT WITH CHECK (
        tenant_id = (current_setting(''request.jwt.claims'', true)::jsonb -> ''app_metadata'' ->> ''tenant_id'')::uuid
      )', tbl, tbl
    );

    -- UPDATE ポリシー / UPDATE 策略
    EXECUTE format(
      'CREATE POLICY tenant_iso_upd_%s ON %I FOR UPDATE USING (
        tenant_id = (current_setting(''request.jwt.claims'', true)::jsonb -> ''app_metadata'' ->> ''tenant_id'')::uuid
      )', tbl, tbl
    );

    -- DELETE ポリシー / DELETE 策略
    EXECUTE format(
      'CREATE POLICY tenant_iso_del_%s ON %I FOR DELETE USING (
        tenant_id = (current_setting(''request.jwt.claims'', true)::jsonb -> ''app_metadata'' ->> ''tenant_id'')::uuid
      )', tbl, tbl
    );
  END LOOP;
END $$;

-- tenants テーブルは管理者のみアクセス / tenants 表仅管理员可访问
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_only_tenants ON tenants
  USING (
    (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role') = 'admin'
    OR id = (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'tenant_id')::uuid
  );
```

---

## 14. インデックス戦略サマリー / 索引策略汇总

### 14.1 インデックスタイプ使い分け / 索引类型选用

| タイプ / 类型 | 用途 / 用途 | 適用例 / 适用场景 |
|---|---|---|
| B-Tree (デフォルト) | 等値・範囲検索 / 等值与范围查询 | `tenant_id`, `status`, `created_at` |
| GIN | JSONB, 配列, 全文検索 / JSONB、数组、全文搜索 | `barcode TEXT[]`, `custom_fields JSONB` |
| GIN (gin_trgm_ops) | あいまい検索 / 模糊搜索 | `name`, `order_number` |
| GIN (jsonb_path_ops) | JSONB パス検索 / JSONB路径查询 | `_products_meta`, `marketplace_codes` |
| 部分インデックス | 条件付き / 条件索引 | `WHERE deleted_at IS NULL`, `WHERE quantity > 0` |
| ユニーク | 一意性保証 / 唯一性保证 | `UNIQUE (tenant_id, sku)` |

### 14.2 パフォーマンスガイドライン / 性能指南

```sql
-- 原則 / 原则:
-- 1. すべてのクエリに tenant_id を含める / 所有查询包含 tenant_id
-- 2. ステータスフィルターは複合インデックスの先頭に / 状态过滤器放在复合索引前端
-- 3. 論理削除は部分インデックスで除外 / 软删除用部分索引排除
-- 4. 日付範囲は DESC 順 / 日期范围用 DESC 排序
-- 5. JSONB 検索は jsonb_path_ops を使用 / JSONB搜索用 jsonb_path_ops

-- 例: 出荷指示の高頻度クエリ / 示例: 出货指示高频查询
-- テナント別、確認済み、日付降順 / 按租户、已确认、日期降序
EXPLAIN ANALYZE
SELECT * FROM shipment_orders
WHERE tenant_id = :tid
  AND status_confirmed = TRUE
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 50;
-- → idx_shipment_orders_confirmed を使用 / 使用 idx_shipment_orders_confirmed
```

---

## 15. Drizzle Schema サンプル / Drizzle Schema 示例

### 15.1 tenants

```typescript
import { pgTable, uuid, varchar, text, integer, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';

// テナントテーブル / 租户表
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantCode: varchar('tenant_code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 200 }).notNull(),
  name2: varchar('name2', { length: 200 }),
  plan: varchar('plan', { length: 20 }).notNull().default('free'),
  status: varchar('status', { length: 20 }).notNull().default('trial'),
  // 連絡先 / 联系方式
  contactName: varchar('contact_name', { length: 100 }),
  contactEmail: varchar('contact_email', { length: 200 }),
  contactPhone: varchar('contact_phone', { length: 50 }),
  postalCode: varchar('postal_code', { length: 20 }),
  prefecture: varchar('prefecture', { length: 50 }),
  city: varchar('city', { length: 100 }),
  address: text('address'),
  // 制限 / 限额
  maxUsers: integer('max_users').notNull().default(5),
  maxWarehouses: integer('max_warehouses').notNull().default(1),
  maxClients: integer('max_clients').notNull().default(10),
  // 日付 / 日期
  trialExpiresAt: timestamp('trial_expires_at', { withTimezone: true }),
  billingStartedAt: timestamp('billing_started_at', { withTimezone: true }),
  // 機能 / 功能
  features: text('features').array().default([]),
  settings: jsonb('settings').notNull().default({}),
  isActive: boolean('is_active').notNull().default(true),
  memo: text('memo'),
  // タイムスタンプ / 时间戳
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

### 15.2 products

```typescript
import { pgTable, uuid, varchar, text, integer, boolean, numeric, timestamp, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { clients } from './clients';
import { locations } from './locations';

// 商品テーブル / 商品表
export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  // [A] 所属 / 归属
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
  subClientId: uuid('sub_client_id'),
  shopId: uuid('shop_id'),
  // [B] 基本 / 基本
  sku: varchar('sku', { length: 200 }).notNull(),
  name: varchar('name', { length: 500 }).notNull(),
  nameFull: varchar('name_full', { length: 1000 }),
  barcode: text('barcode').array().default([]),
  coolType: varchar('cool_type', { length: 5 }),
  mailCalcEnabled: boolean('mail_calc_enabled').notNull().default(false),
  mailCalcMaxQuantity: integer('mail_calc_max_quantity'),
  memo: text('memo'),
  price: numeric('price', { precision: 12, scale: 2 }),
  handlingTypes: text('handling_types').array().default([]),
  imageUrl: text('image_url'),
  subSkus: jsonb('sub_skus').default([]),
  category: varchar('category', { length: 100 }).default('0'),
  costPrice: numeric('cost_price', { precision: 12, scale: 2 }),
  allocationRule: varchar('allocation_rule', { length: 10 }).default('FIFO'),
  serialTrackingEnabled: boolean('serial_tracking_enabled').notNull().default(false),
  // [C] 在庫管理 / 库存管理
  inventoryEnabled: boolean('inventory_enabled').notNull().default(false),
  lotTrackingEnabled: boolean('lot_tracking_enabled').notNull().default(false),
  expiryTrackingEnabled: boolean('expiry_tracking_enabled').notNull().default(false),
  alertDaysBeforeExpiry: integer('alert_days_before_expiry').notNull().default(30),
  defaultLocationId: uuid('default_location_id').references(() => locations.id, { onDelete: 'set null' }),
  safetyStock: integer('safety_stock').notNull().default(0),
  janCode: varchar('jan_code', { length: 50 }),
  // [F] FBA
  fnsku: varchar('fnsku', { length: 100 }),
  asin: varchar('asin', { length: 100 }),
  amazonSku: varchar('amazon_sku', { length: 200 }),
  fbaEnabled: boolean('fba_enabled').notNull().default(false),
  // [G] RSL
  rakutenSku: varchar('rakuten_sku', { length: 200 }),
  rslEnabled: boolean('rsl_enabled').notNull().default(false),
  // [K] JSONB
  warehouseNotes: jsonb('warehouse_notes'),
  customFields: jsonb('custom_fields').default({}),
  marketplaceCodes: jsonb('marketplace_codes').default({}),
  // [Z] タイムスタンプ / 时间戳
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  tenantSkuIdx: uniqueIndex('idx_products_tenant_sku').on(table.tenantId, table.sku),
  clientIdx: index('idx_products_client').on(table.tenantId, table.clientId),
}));
```

### 15.3 shipment_orders

```typescript
import { pgTable, uuid, varchar, text, boolean, numeric, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

// 出荷指示テーブル / 出货单表
export const shipmentOrders = pgTable('shipment_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  destinationType: varchar('destination_type', { length: 10 }).default('B2C'),
  // ステータス / 状态
  statusConfirmed: boolean('status_confirmed').notNull().default(false),
  statusConfirmedAt: timestamp('status_confirmed_at', { withTimezone: true }),
  statusShipped: boolean('status_shipped').notNull().default(false),
  statusShippedAt: timestamp('status_shipped_at', { withTimezone: true }),
  statusPrinted: boolean('status_printed').notNull().default(false),
  statusPrintedAt: timestamp('status_printed_at', { withTimezone: true }),
  statusInspected: boolean('status_inspected').notNull().default(false),
  statusInspectedAt: timestamp('status_inspected_at', { withTimezone: true }),
  // 注文 / 订单
  orderNumber: varchar('order_number', { length: 100 }).notNull().unique(),
  carrierId: varchar('carrier_id', { length: 100 }).notNull(),
  customerManagementNumber: varchar('customer_management_number', { length: 200 }).notNull(),
  trackingId: varchar('tracking_id', { length: 100 }),
  // 送付先 / 收件人
  recipientPostalCode: varchar('recipient_postal_code', { length: 20 }).notNull(),
  recipientPrefecture: varchar('recipient_prefecture', { length: 50 }).notNull(),
  recipientCity: varchar('recipient_city', { length: 100 }).notNull(),
  recipientStreet: text('recipient_street').notNull(),
  recipientName: varchar('recipient_name', { length: 200 }).notNull(),
  recipientPhone: varchar('recipient_phone', { length: 50 }).notNull(),
  // 配送 / 配送
  shipPlanDate: varchar('ship_plan_date', { length: 20 }).notNull(),
  invoiceType: varchar('invoice_type', { length: 10 }).notNull(),
  carrierData: jsonb('carrier_data'),
  handlingTags: text('handling_tags').array().default([]),
  shippingCost: numeric('shipping_cost', { precision: 12, scale: 2 }),
  customFields: jsonb('custom_fields').default({}),
  // タイムスタンプ / 时间戳
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  tenantTimeIdx: index('idx_so_tenant_time').on(table.tenantId, table.createdAt),
  trackingIdx: index('idx_so_tracking').on(table.trackingId),
}));
```

### 15.4 stock_quants

```typescript
import { pgTable, uuid, varchar, integer, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { products } from './products';
import { locations } from './locations';
import { lots } from './lots';
import { sql } from 'drizzle-orm';

// 在庫数量テーブル / 库存量表
export const stockQuants = pgTable('stock_quants', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'restrict' }),
  productSku: varchar('product_sku', { length: 200 }).notNull(),
  locationId: uuid('location_id').notNull().references(() => locations.id, { onDelete: 'restrict' }),
  lotId: uuid('lot_id').references(() => lots.id, { onDelete: 'set null' }),
  quantity: integer('quantity').notNull().default(0),
  reservedQuantity: integer('reserved_quantity').notNull().default(0),
  lastMovedAt: timestamp('last_moved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  productIdx: index('idx_sq_product').on(table.productId),
  locationIdx: index('idx_sq_location').on(table.locationId),
  tenantProductIdx: index('idx_sq_tenant_product').on(table.tenantId, table.productId, table.locationId),
}));
```

### 15.5 inbound_orders

```typescript
import { pgTable, uuid, varchar, text, integer, numeric, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { locations } from './locations';
import { clients } from './clients';

// 入庫指示テーブル / 入库单表
export const inboundOrders = pgTable('inbound_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  orderNumber: varchar('order_number', { length: 50 }).notNull().unique(),
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  destinationLocationId: uuid('destination_location_id').references(() => locations.id, { onDelete: 'set null' }),
  // サプライヤー / 供应商
  supplierName: varchar('supplier_name', { length: 200 }),
  supplierCode: varchar('supplier_code', { length: 100 }),
  supplierPhone: varchar('supplier_phone', { length: 50 }),
  // 日付 / 日期
  expectedDate: timestamp('expected_date', { withTimezone: true }),
  requestedDate: timestamp('requested_date', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  memo: text('memo'),
  createdBy: varchar('created_by', { length: 200 }),
  // フロー / 流程
  flowType: varchar('flow_type', { length: 20 }).default('standard'),
  // 顧客 / 客户
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
  clientName: varchar('client_name', { length: 200 }),
  // 通過型 / 通过型
  destinationType: varchar('destination_type', { length: 10 }),
  serviceOptions: jsonb('service_options').default([]),
  fbaInfo: jsonb('fba_info'),
  varianceReport: jsonb('variance_report'),
  customFields: jsonb('custom_fields').default({}),
  // タイムスタンプ / 时间戳
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  tenantStatusIdx: index('idx_io_tenant_status').on(table.tenantId, table.status),
  clientIdx: index('idx_io_client').on(table.tenantId, table.clientId),
}));
```

---

## 付録A: 全テーブル updated_at トリガー一括作成 / 附录A: 批量创建 updated_at 触发器

```sql
-- ============================================================================
-- すべてのテーブルに updated_at トリガーを作成 / 为所有表创建 updated_at 触发器
-- ============================================================================
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'tenants', 'users', 'warehouses', 'locations', 'clients', 'sub_clients', 'shops',
    'products', 'stock_quants', 'stock_moves', 'lots',
    'inbound_orders', 'inbound_order_lines',
    'shipment_orders', 'shipment_order_products', 'shipment_order_materials',
    'return_orders', 'return_order_lines',
    'inventory_reservations',
    'billing_records', 'invoices', 'work_charges',
    'service_rates', 'shipping_rates',
    'carriers', 'order_source_companies',
    'waves', 'pick_tasks', 'pick_items', 'materials',
    'notifications'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    PERFORM create_updated_at_trigger(tbl);
  END LOOP;
END $$;
```

## 付録B: 全テーブル監査トリガー一括作成 / 附录B: 批量创建审计触发器

```sql
-- ============================================================================
-- 重要テーブルに監査トリガーを作成 / 为重要表创建审计触发器
-- ============================================================================
DO $$
DECLARE
  tbl TEXT;
  -- 監査対象テーブル（変更追跡が必要なテーブルのみ）/ 需要变更追踪的表
  tables TEXT[] := ARRAY[
    'tenants', 'users', 'clients', 'products',
    'shipment_orders', 'inbound_orders', 'return_orders',
    'billing_records', 'invoices'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    PERFORM create_audit_trigger(tbl);
  END LOOP;
END $$;
```

## 付録C: テーブル総数サマリー / 附录C: 表总数汇总

| ドメイン / 域 | テーブル数 / 表数 | テーブル名 / 表名 |
|---|---|---|
| Core | 8 | tenants, users, warehouses, locations, clients, sub_clients, shops, products |
| Shipment | 3 | shipment_orders, shipment_order_products, shipment_order_materials |
| Inbound | 2 | inbound_orders, inbound_order_lines |
| Inventory | 5 | lots, stock_quants, stock_moves, inventory_reservations, inventory_ledger |
| Returns | 2 | return_orders, return_order_lines |
| Billing | 5 | service_rates, shipping_rates, billing_records, invoices, work_charges |
| Carriers | 2 | carriers, order_source_companies |
| Warehouse Ops | 4 | waves, pick_tasks, pick_items, materials |
| Notifications & Logs | 2 | notifications, operation_logs |
| System | 1 | audit_logs |
| **合計 / 合计** | **34** | |
