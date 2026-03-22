-- テンプレート継承システムマイグレーション / 模板继承系统迁移
-- 3階層テンプレート継承: system → tenant → client
-- 三层模板继承: system → tenant → client

-- ============================================================
-- 1. form_templates 追加カラム / 表单模板追加列
-- ============================================================

-- スコープ: system/tenant/client / 作用域: system/tenant/client
ALTER TABLE "form_templates" ADD COLUMN IF NOT EXISTS "scope" text NOT NULL DEFAULT 'tenant';

-- クライアントID（scope='client'の時のみ）/ 客户ID（仅scope='client'时使用）
ALTER TABLE "form_templates" ADD COLUMN IF NOT EXISTS "client_id" uuid REFERENCES "clients"("id");

-- 親テンプレートID（派生元）/ 父模板ID（派生来源）
ALTER TABLE "form_templates" ADD COLUMN IF NOT EXISTS "parent_id" uuid REFERENCES "form_templates"("id");

-- アクティブフラグ / 激活标志
ALTER TABLE "form_templates" ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true;

-- バージョン番号 / 版本号
ALTER TABLE "form_templates" ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1;

-- 説明 / 描述
ALTER TABLE "form_templates" ADD COLUMN IF NOT EXISTS "description" text;

-- 継承システム用インデックス / 继承系统用索引
CREATE INDEX IF NOT EXISTS "form_templates_scope_idx"
  ON "form_templates" ("tenant_id", "target_type", "scope", "is_active");

CREATE INDEX IF NOT EXISTS "form_templates_client_idx"
  ON "form_templates" ("tenant_id", "target_type", "client_id")
  WHERE "client_id" IS NOT NULL;

-- ============================================================
-- 2. print_templates 追加カラム / 打印模板追加列
-- ============================================================

-- スコープ: system/tenant/client / 作用域: system/tenant/client
ALTER TABLE "print_templates" ADD COLUMN IF NOT EXISTS "scope" text NOT NULL DEFAULT 'tenant';

-- クライアントID（scope='client'の時のみ）/ 客户ID（仅scope='client'时使用）
ALTER TABLE "print_templates" ADD COLUMN IF NOT EXISTS "client_id" uuid REFERENCES "clients"("id");

-- 親テンプレートID（派生元）/ 父模板ID（派生来源）
ALTER TABLE "print_templates" ADD COLUMN IF NOT EXISTS "parent_id" uuid REFERENCES "print_templates"("id");

-- アクティブフラグ / 激活标志
ALTER TABLE "print_templates" ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true;

-- バージョン番号 / 版本号
ALTER TABLE "print_templates" ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1;

-- 説明 / 描述
ALTER TABLE "print_templates" ADD COLUMN IF NOT EXISTS "description" text;

-- 継承システム用インデックス / 继承系统用索引
CREATE INDEX IF NOT EXISTS "print_templates_scope_idx"
  ON "print_templates" ("tenant_id", "type", "scope", "is_active");

CREATE INDEX IF NOT EXISTS "print_templates_client_idx"
  ON "print_templates" ("tenant_id", "type", "client_id")
  WHERE "client_id" IS NOT NULL;
