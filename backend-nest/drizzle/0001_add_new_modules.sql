-- 新モジュール追加マイグレーション / 新模块追加迁移
-- photos, workflows, workflow_logs, slotting_rules,
-- fba_shipment_plans, fba_boxes, rsl_shipment_plans, rsl_items,
-- passthrough_orders, api_logs
-- + stock_quants partial unique index (WHERE lot_id IS NULL)

-- ============================================
-- 1. photos / 照片管理
-- ============================================
CREATE TABLE IF NOT EXISTS "photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"filename" text NOT NULL,
	"original_filename" text,
	"mime_type" text,
	"size" integer,
	"url" text NOT NULL,
	"thumbnail_url" text,
	"uploaded_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- ============================================
-- 2. workflows / 工作流
-- ============================================
CREATE TABLE IF NOT EXISTS "workflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"trigger_type" text NOT NULL,
	"trigger_config" jsonb,
	"actions" jsonb,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_run_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- ============================================
-- 3. workflow_logs / 工作流执行日志
-- ============================================
CREATE TABLE IF NOT EXISTS "workflow_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"workflow_id" uuid NOT NULL,
	"status" text NOT NULL,
	"trigger_data" jsonb,
	"result" jsonb,
	"error" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- ============================================
-- 4. slotting_rules / 上架规则
-- ============================================
CREATE TABLE IF NOT EXISTS "slotting_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"priority" integer DEFAULT 0 NOT NULL,
	"conditions" jsonb,
	"actions" jsonb,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- ============================================
-- 5. fba_shipment_plans / FBA发货计划
-- ============================================
CREATE TABLE IF NOT EXISTS "fba_shipment_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"plan_name" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"amazon_shipment_id" text,
	"destination_fulfillment_center" text,
	"ship_to_address" jsonb,
	"items" jsonb,
	"notes" text,
	"confirmed_at" timestamp,
	"shipped_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- ============================================
-- 6. fba_boxes / FBA箱
-- ============================================
CREATE TABLE IF NOT EXISTS "fba_boxes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"shipment_plan_id" uuid NOT NULL,
	"box_number" text NOT NULL,
	"weight" text,
	"dimensions" jsonb,
	"items" jsonb,
	"tracking_number" text,
	"status" text DEFAULT 'packing' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- ============================================
-- 7. rsl_shipment_plans / RSL发货计划
-- ============================================
CREATE TABLE IF NOT EXISTS "rsl_shipment_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"plan_name" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"rsl_order_id" text,
	"items" jsonb,
	"notes" text,
	"confirmed_at" timestamp,
	"shipped_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- ============================================
-- 8. rsl_items / RSL商品明细
-- ============================================
CREATE TABLE IF NOT EXISTS "rsl_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"shipment_plan_id" uuid NOT NULL,
	"product_id" uuid,
	"sku" text NOT NULL,
	"quantity" integer NOT NULL,
	"processed_quantity" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- ============================================
-- 9. passthrough_orders / 直通订单
-- ============================================
CREATE TABLE IF NOT EXISTS "passthrough_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"order_number" text NOT NULL,
	"client_id" uuid,
	"status" text DEFAULT 'draft' NOT NULL,
	"items" jsonb,
	"notes" text,
	"confirmed_at" timestamp,
	"received_at" timestamp,
	"completed_at" timestamp,
	"cancelled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- ============================================
-- 10. api_logs / API请求日志
-- ============================================
CREATE TABLE IF NOT EXISTS "api_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"method" text NOT NULL,
	"path" text NOT NULL,
	"status_code" integer,
	"request_body" jsonb,
	"response_body" jsonb,
	"user_id" uuid,
	"ip" text,
	"user_agent" text,
	"duration" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- ============================================
-- Foreign Keys / 外键约束
-- ============================================

-- photos
ALTER TABLE "photos" ADD CONSTRAINT "photos_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- workflows
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- workflow_logs
ALTER TABLE "workflow_logs" ADD CONSTRAINT "workflow_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workflow_logs" ADD CONSTRAINT "workflow_logs_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- slotting_rules
ALTER TABLE "slotting_rules" ADD CONSTRAINT "slotting_rules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- fba_shipment_plans
ALTER TABLE "fba_shipment_plans" ADD CONSTRAINT "fba_shipment_plans_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- fba_boxes
ALTER TABLE "fba_boxes" ADD CONSTRAINT "fba_boxes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "fba_boxes" ADD CONSTRAINT "fba_boxes_shipment_plan_id_fba_shipment_plans_id_fk" FOREIGN KEY ("shipment_plan_id") REFERENCES "fba_shipment_plans"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- rsl_shipment_plans
ALTER TABLE "rsl_shipment_plans" ADD CONSTRAINT "rsl_shipment_plans_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- rsl_items
ALTER TABLE "rsl_items" ADD CONSTRAINT "rsl_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "rsl_items" ADD CONSTRAINT "rsl_items_shipment_plan_id_rsl_shipment_plans_id_fk" FOREIGN KEY ("shipment_plan_id") REFERENCES "rsl_shipment_plans"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- passthrough_orders
ALTER TABLE "passthrough_orders" ADD CONSTRAINT "passthrough_orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- api_logs
ALTER TABLE "api_logs" ADD CONSTRAINT "api_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- ============================================
-- Indexes / 索引
-- ============================================

-- photos indexes
CREATE INDEX "photos_tenant_idx" ON "photos" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "photos_entity_idx" ON "photos" USING btree ("entity_type","entity_id");
--> statement-breakpoint
CREATE INDEX "photos_uploaded_by_idx" ON "photos" USING btree ("uploaded_by");
--> statement-breakpoint

-- workflows indexes
CREATE INDEX "workflows_tenant_idx" ON "workflows" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "workflows_enabled_idx" ON "workflows" USING btree ("tenant_id","enabled");
--> statement-breakpoint
CREATE INDEX "workflows_trigger_type_idx" ON "workflows" USING btree ("tenant_id","trigger_type");
--> statement-breakpoint

-- workflow_logs indexes
CREATE INDEX "workflow_logs_tenant_idx" ON "workflow_logs" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "workflow_logs_workflow_idx" ON "workflow_logs" USING btree ("workflow_id");
--> statement-breakpoint
CREATE INDEX "workflow_logs_status_idx" ON "workflow_logs" USING btree ("tenant_id","status");
--> statement-breakpoint
CREATE INDEX "workflow_logs_created_idx" ON "workflow_logs" USING btree ("created_at");
--> statement-breakpoint

-- slotting_rules indexes
CREATE INDEX "slotting_rules_tenant_idx" ON "slotting_rules" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "slotting_rules_enabled_idx" ON "slotting_rules" USING btree ("tenant_id","enabled");
--> statement-breakpoint
CREATE INDEX "slotting_rules_priority_idx" ON "slotting_rules" USING btree ("tenant_id","priority");
--> statement-breakpoint

-- fba_shipment_plans indexes
CREATE INDEX "fba_shipment_plans_tenant_idx" ON "fba_shipment_plans" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "fba_shipment_plans_status_idx" ON "fba_shipment_plans" USING btree ("tenant_id","status");
--> statement-breakpoint
CREATE INDEX "fba_shipment_plans_amazon_id_idx" ON "fba_shipment_plans" USING btree ("amazon_shipment_id");
--> statement-breakpoint

-- fba_boxes indexes
CREATE INDEX "fba_boxes_tenant_idx" ON "fba_boxes" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "fba_boxes_plan_idx" ON "fba_boxes" USING btree ("shipment_plan_id");
--> statement-breakpoint
CREATE INDEX "fba_boxes_status_idx" ON "fba_boxes" USING btree ("tenant_id","status");
--> statement-breakpoint

-- rsl_shipment_plans indexes
CREATE INDEX "rsl_shipment_plans_tenant_idx" ON "rsl_shipment_plans" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "rsl_shipment_plans_status_idx" ON "rsl_shipment_plans" USING btree ("tenant_id","status");
--> statement-breakpoint
CREATE INDEX "rsl_shipment_plans_order_idx" ON "rsl_shipment_plans" USING btree ("rsl_order_id");
--> statement-breakpoint

-- rsl_items indexes
CREATE INDEX "rsl_items_tenant_idx" ON "rsl_items" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "rsl_items_plan_idx" ON "rsl_items" USING btree ("shipment_plan_id");
--> statement-breakpoint
CREATE INDEX "rsl_items_status_idx" ON "rsl_items" USING btree ("tenant_id","status");
--> statement-breakpoint

-- passthrough_orders indexes
CREATE INDEX "passthrough_orders_tenant_idx" ON "passthrough_orders" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "passthrough_orders_status_idx" ON "passthrough_orders" USING btree ("tenant_id","status");
--> statement-breakpoint
CREATE INDEX "passthrough_orders_client_idx" ON "passthrough_orders" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "passthrough_orders_number_idx" ON "passthrough_orders" USING btree ("tenant_id","order_number");
--> statement-breakpoint

-- api_logs indexes
CREATE INDEX "api_logs_tenant_idx" ON "api_logs" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "api_logs_created_idx" ON "api_logs" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX "api_logs_method_path_idx" ON "api_logs" USING btree ("method","path");
--> statement-breakpoint
CREATE INDEX "api_logs_user_idx" ON "api_logs" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "api_logs_status_idx" ON "api_logs" USING btree ("status_code");
--> statement-breakpoint

-- ============================================
-- stock_quants partial unique index (lot_id IS NULL)
-- stock_quants 部分ユニークインデックス / 部分唯一索引
-- ============================================
CREATE UNIQUE INDEX IF NOT EXISTS "stock_quants_unique_no_lot_idx" ON "stock_quants" ("tenant_id", "product_id", "location_id") WHERE lot_id IS NULL;
