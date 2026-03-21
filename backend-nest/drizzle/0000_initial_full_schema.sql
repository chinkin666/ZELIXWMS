CREATE TABLE "billing_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"period" text NOT NULL,
	"client_id" uuid,
	"client_name" text,
	"carrier_id" uuid,
	"carrier_name" text,
	"order_count" integer DEFAULT 0 NOT NULL,
	"total_quantity" integer DEFAULT 0 NOT NULL,
	"total_shipping_cost" numeric DEFAULT '0' NOT NULL,
	"handling_fee" numeric DEFAULT '0' NOT NULL,
	"storage_fee" numeric DEFAULT '0' NOT NULL,
	"other_fees" numeric DEFAULT '0' NOT NULL,
	"total_amount" numeric DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"confirmed_at" timestamp,
	"confirmed_by" uuid,
	"memo" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"invoice_number" text NOT NULL,
	"billing_record_id" uuid,
	"client_id" uuid,
	"client_name" text,
	"period" text NOT NULL,
	"issue_date" date NOT NULL,
	"subtotal" numeric DEFAULT '0' NOT NULL,
	"tax_rate" numeric DEFAULT '0.10' NOT NULL,
	"tax_amount" numeric DEFAULT '0' NOT NULL,
	"total_amount" numeric DEFAULT '0' NOT NULL,
	"due_date" date NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"line_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"paid_at" timestamp,
	"memo" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "service_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"charge_type" text NOT NULL,
	"unit" text DEFAULT 'per_item' NOT NULL,
	"unit_price" numeric DEFAULT '0' NOT NULL,
	"client_id" uuid,
	"client_name" text,
	"conditions" jsonb,
	"valid_from" timestamp,
	"valid_to" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"memo" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipping_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"carrier_id" uuid NOT NULL,
	"carrier_name" text,
	"name" text NOT NULL,
	"size_type" text DEFAULT 'flat' NOT NULL,
	"size_min" numeric,
	"size_max" numeric,
	"from_prefectures" jsonb,
	"to_prefectures" jsonb,
	"base_price" numeric DEFAULT '0' NOT NULL,
	"cool_surcharge" numeric DEFAULT '0' NOT NULL,
	"cod_surcharge" numeric DEFAULT '0' NOT NULL,
	"fuel_surcharge" numeric DEFAULT '0' NOT NULL,
	"valid_from" timestamp,
	"valid_to" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"memo" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_charges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"charge_type" text NOT NULL,
	"charge_date" date NOT NULL,
	"reference_type" text DEFAULT 'manual' NOT NULL,
	"reference_id" uuid,
	"reference_number" text,
	"client_id" uuid,
	"client_name" text,
	"sub_client_id" uuid,
	"sub_client_name" text,
	"shop_id" uuid,
	"shop_name" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric DEFAULT '0' NOT NULL,
	"amount" numeric DEFAULT '0' NOT NULL,
	"description" text NOT NULL,
	"billing_period" text,
	"billing_record_id" uuid,
	"is_billed" boolean DEFAULT false NOT NULL,
	"memo" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "carrier_automation_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"carrier_type" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "carrier_session_caches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"carrier_type" text NOT NULL,
	"session_token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "carriers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"tracking_id_column_name" text,
	"format_definition" jsonb DEFAULT '{"columns":[]}'::jsonb NOT NULL,
	"services" jsonb,
	"automation_type" text,
	"is_built_in" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"name2" text,
	"contact_name" text,
	"contact_email" text,
	"contact_phone" text,
	"postal_code" text,
	"prefecture" text,
	"city" text,
	"address" text,
	"address2" text,
	"phone" text,
	"billing_cycle" text,
	"credit_tier" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"memo" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"client_id" uuid,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"postal_code" text,
	"prefecture" text,
	"city" text,
	"address" text,
	"phone" text,
	"email" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"sub_client_id" uuid,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"platform" text,
	"platform_shop_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sub_clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"contact_name" text,
	"contact_phone" text,
	"contact_email" text,
	"address" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auto_processing_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"trigger_mode" text NOT NULL,
	"trigger_events" jsonb DEFAULT '[]'::jsonb,
	"conditions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"actions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"allow_rerun" boolean DEFAULT false NOT NULL,
	"memo" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_field_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"field_name" text NOT NULL,
	"field_type" text NOT NULL,
	"label" text NOT NULL,
	"label_ja" text,
	"required" boolean DEFAULT false NOT NULL,
	"options" jsonb,
	"default_value" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"enabled" boolean DEFAULT false NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "feature_flags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "rule_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"module" text NOT NULL,
	"warehouse_id" uuid,
	"client_id" uuid,
	"priority" integer DEFAULT 0 NOT NULL,
	"condition_groups" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"actions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"stop_on_match" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"valid_from" timestamp,
	"valid_to" timestamp,
	"execution_count" integer DEFAULT 0 NOT NULL,
	"last_executed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"webhook_id" uuid NOT NULL,
	"event" text NOT NULL,
	"url" text NOT NULL,
	"http_status" integer,
	"response_time_ms" integer,
	"success" boolean NOT NULL,
	"error" text,
	"payload" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"secret" text,
	"events" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inbound_order_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"inbound_order_id" uuid NOT NULL,
	"product_id" uuid,
	"product_sku" text NOT NULL,
	"expected_quantity" integer DEFAULT 0 NOT NULL,
	"received_quantity" integer DEFAULT 0 NOT NULL,
	"damaged_quantity" integer DEFAULT 0 NOT NULL,
	"location_id" uuid,
	"lot_id" uuid,
	"unit_price" numeric,
	"putaway_location_id" uuid,
	"putaway_quantity" integer DEFAULT 0 NOT NULL,
	"stock_move_ids" jsonb DEFAULT '[]'::jsonb,
	"memo" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inbound_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"order_number" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"flow_type" text DEFAULT 'standard' NOT NULL,
	"client_id" uuid,
	"supplier_id" uuid,
	"warehouse_id" uuid,
	"expected_date" timestamp,
	"notes" text,
	"linked_order_ids" jsonb DEFAULT '[]'::jsonb,
	"fba_info" jsonb,
	"rsl_info" jsonb,
	"b2b_info" jsonb,
	"service_options" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"plan" text DEFAULT 'free',
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"role" text DEFAULT 'viewer' NOT NULL,
	"warehouse_ids" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_sub_skus" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"sub_sku" text NOT NULL,
	"price" numeric,
	"description" text,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"sku" text NOT NULL,
	"name" text NOT NULL,
	"name_full" text,
	"name_en" text,
	"category" text DEFAULT '0',
	"barcode" jsonb DEFAULT '[]'::jsonb,
	"jan_code" text,
	"image_url" text,
	"memo" text,
	"customer_product_code" text,
	"brand_code" text,
	"brand_name" text,
	"size_name" text,
	"color_name" text,
	"unit_type" text,
	"width" numeric,
	"depth" numeric,
	"height" numeric,
	"weight" numeric,
	"gross_weight" numeric,
	"volume" numeric,
	"outer_box_width" numeric,
	"outer_box_depth" numeric,
	"outer_box_height" numeric,
	"outer_box_volume" numeric,
	"outer_box_weight" numeric,
	"case_quantity" integer,
	"price" numeric,
	"cost_price" numeric,
	"tax_type" text,
	"tax_rate" numeric,
	"currency" text,
	"cool_type" text,
	"shipping_size_code" text,
	"mail_calc_enabled" boolean DEFAULT false,
	"mail_calc_max_quantity" integer,
	"inventory_enabled" boolean DEFAULT false,
	"lot_tracking_enabled" boolean DEFAULT false,
	"expiry_tracking_enabled" boolean DEFAULT false,
	"serial_tracking_enabled" boolean DEFAULT false,
	"alert_days_before_expiry" integer DEFAULT 30,
	"inbound_expiry_days" integer,
	"safety_stock" integer DEFAULT 0,
	"allocation_rule" text DEFAULT 'FIFO',
	"supplier_code" text,
	"supplier_name" text,
	"fnsku" text,
	"asin" text,
	"amazon_sku" text,
	"fba_enabled" boolean DEFAULT false,
	"rakuten_sku" text,
	"rsl_enabled" boolean DEFAULT false,
	"marketplace_codes" jsonb DEFAULT '{}'::jsonb,
	"wholesale_partner_codes" jsonb DEFAULT '{}'::jsonb,
	"hazardous_type" text DEFAULT '0',
	"air_transport_ban" boolean DEFAULT false,
	"barcode_commission" boolean DEFAULT false,
	"reservation_target" boolean DEFAULT false,
	"paid_type" text DEFAULT '0',
	"country_of_origin" text,
	"handling_types" jsonb DEFAULT '[]'::jsonb,
	"default_handling_tags" jsonb DEFAULT '[]'::jsonb,
	"remarks" jsonb DEFAULT '[]'::jsonb,
	"custom_fields" jsonb DEFAULT '{}'::jsonb,
	"wh_preferred_location" text,
	"wh_handling_notes" text,
	"wh_is_fragile" boolean DEFAULT false,
	"wh_is_liquid" boolean DEFAULT false,
	"wh_requires_opp_bag" boolean DEFAULT false,
	"wh_storage_type" text,
	"client_id" uuid,
	"sub_client_id" uuid,
	"shop_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "inventory_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"product_sku" text,
	"location_id" uuid,
	"lot_id" uuid,
	"type" text NOT NULL,
	"quantity" integer NOT NULL,
	"reference_type" text,
	"reference_id" text,
	"reference_number" text,
	"reason" text,
	"executed_by" text,
	"executed_at" timestamp,
	"memo" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"warehouse_id" uuid,
	"parent_id" uuid,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"full_path" text DEFAULT '',
	"cool_type" text,
	"stock_type" text,
	"temperature_type" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0,
	"memo" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"lot_number" text NOT NULL,
	"expiry_date" timestamp,
	"manufacturing_date" timestamp,
	"memo" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_moves" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"move_number" text NOT NULL,
	"move_type" text NOT NULL,
	"status" text DEFAULT 'draft',
	"product_id" uuid NOT NULL,
	"product_sku" text,
	"from_location_id" uuid,
	"to_location_id" uuid,
	"lot_id" uuid,
	"quantity" integer NOT NULL,
	"reference_type" text,
	"reference_id" uuid,
	"reference_number" text,
	"reason" text,
	"executed_by" text,
	"executed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_quants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"lot_id" uuid,
	"quantity" integer DEFAULT 0 NOT NULL,
	"reserved_quantity" integer DEFAULT 0 NOT NULL,
	"last_moved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "return_order_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"return_order_id" uuid NOT NULL,
	"product_id" uuid,
	"product_sku" text NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"inspected_quantity" integer DEFAULT 0 NOT NULL,
	"disposition" text DEFAULT 'pending' NOT NULL,
	"restocked_quantity" integer DEFAULT 0 NOT NULL,
	"disposed_quantity" integer DEFAULT 0 NOT NULL,
	"location_id" uuid,
	"lot_id" uuid,
	"inspection_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "return_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"order_number" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"return_reason" text NOT NULL,
	"rma_number" text,
	"return_tracking_id" text,
	"shipment_order_id" uuid,
	"client_id" uuid,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "order_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"priority" integer DEFAULT 0,
	"enabled" boolean DEFAULT true NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_source_companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"sender_name" text NOT NULL,
	"sender_postal_code" text,
	"sender_address_prefecture" text,
	"sender_address_city" text,
	"sender_address_street" text,
	"sender_address_building" text,
	"sender_phone" text,
	"hatsu_base_no1" text,
	"hatsu_base_no2" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipment_order_materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"shipment_order_id" uuid NOT NULL,
	"material_sku" text NOT NULL,
	"material_name" text,
	"quantity" integer NOT NULL,
	"unit_cost" numeric,
	"total_cost" numeric,
	"auto" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "shipment_order_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"shipment_order_id" uuid NOT NULL,
	"input_sku" text NOT NULL,
	"quantity" integer NOT NULL,
	"product_id" uuid,
	"product_sku" text,
	"product_name" text,
	"unit_price" numeric,
	"subtotal" numeric,
	"cool_type" text,
	"barcode" jsonb DEFAULT '[]'::jsonb,
	"image_url" text,
	"matched_sub_sku" jsonb,
	"mail_calc_enabled" boolean,
	"mail_calc_max_quantity" integer
);
--> statement-breakpoint
CREATE TABLE "shipment_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"order_number" text NOT NULL,
	"destination_type" text DEFAULT 'B2C',
	"fba_shipment_id" text,
	"fba_destination" text,
	"carrier_id" text,
	"tracking_id" text,
	"customer_management_number" text,
	"status_confirmed" boolean DEFAULT false NOT NULL,
	"status_confirmed_at" timestamp,
	"status_carrier_received" boolean DEFAULT false NOT NULL,
	"status_carrier_received_at" timestamp,
	"status_printed" boolean DEFAULT false NOT NULL,
	"status_printed_at" timestamp,
	"status_inspected" boolean DEFAULT false NOT NULL,
	"status_inspected_at" timestamp,
	"status_shipped" boolean DEFAULT false NOT NULL,
	"status_shipped_at" timestamp,
	"status_ec_exported" boolean DEFAULT false NOT NULL,
	"status_ec_exported_at" timestamp,
	"status_held" boolean DEFAULT false NOT NULL,
	"status_held_at" timestamp,
	"recipient_postal_code" text,
	"recipient_prefecture" text,
	"recipient_city" text,
	"recipient_street" text,
	"recipient_building" text,
	"recipient_name" text,
	"recipient_phone" text,
	"honorific" text DEFAULT '様',
	"sender_postal_code" text,
	"sender_prefecture" text,
	"sender_city" text,
	"sender_street" text,
	"sender_building" text,
	"sender_name" text,
	"sender_phone" text,
	"orderer_postal_code" text,
	"orderer_prefecture" text,
	"orderer_city" text,
	"orderer_street" text,
	"orderer_building" text,
	"orderer_name" text,
	"orderer_phone" text,
	"ship_plan_date" text,
	"invoice_type" text,
	"cool_type" text,
	"delivery_time_slot" text,
	"delivery_date_preference" text,
	"source_order_at" timestamp,
	"carrier_data" jsonb,
	"cost_summary" jsonb,
	"shipping_cost" numeric,
	"shipping_cost_breakdown" jsonb,
	"cost_source" text,
	"cost_calculated_at" timestamp,
	"handling_tags" jsonb DEFAULT '[]'::jsonb,
	"custom_fields" jsonb DEFAULT '{}'::jsonb,
	"_products_meta" jsonb,
	"source_raw_rows" jsonb,
	"carrier_raw_row" jsonb,
	"internal_record" jsonb,
	"order_group_id" uuid,
	"order_source_company_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "warehouses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"name2" text,
	"postal_code" text,
	"prefecture" text,
	"city" text,
	"address" text,
	"address2" text,
	"phone" text,
	"cool_types" jsonb DEFAULT '[]'::jsonb,
	"capacity" integer,
	"operating_hours" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0,
	"memo" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"sku" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"unit_cost" numeric,
	"stock_quantity" integer DEFAULT 0,
	"category" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stocktaking_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"order_number" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'draft',
	"warehouse_id" uuid NOT NULL,
	"location_ids" jsonb DEFAULT '[]'::jsonb,
	"product_ids" jsonb DEFAULT '[]'::jsonb,
	"scheduled_date" timestamp,
	"completed_at" timestamp,
	"memo" text,
	"items" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "warehouse_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"task_number" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'pending',
	"warehouse_id" uuid NOT NULL,
	"order_id" uuid,
	"wave_id" uuid,
	"assignee_id" uuid,
	"assignee_name" text,
	"priority" integer DEFAULT 0,
	"items" jsonb DEFAULT '[]'::jsonb,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "waves" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"wave_number" text NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"status" text DEFAULT 'pending',
	"priority" integer DEFAULT 0,
	"shipment_ids" jsonb DEFAULT '[]'::jsonb,
	"assigned_to" uuid,
	"assigned_name" text,
	"total_orders" integer DEFAULT 0,
	"total_items" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"sender_name" text,
	"sender_email" text,
	"subject" text NOT NULL,
	"body_template" text NOT NULL,
	"footer_text" text,
	"carrier_id" uuid,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"target_type" text NOT NULL,
	"columns" jsonb DEFAULT '[]'::jsonb,
	"styles" jsonb DEFAULT '{}'::jsonb,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mapping_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"config_type" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"mappings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"order_source_company_name" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "print_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"canvas" jsonb,
	"elements" jsonb DEFAULT '[]'::jsonb,
	"paper_size" text,
	"orientation" text,
	"reference_image_data" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"date" timestamp NOT NULL,
	"summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"type" text NOT NULL,
	"reference_type" text,
	"reference_id" uuid,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operation_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text,
	"module" text,
	"changes" jsonb,
	"metadata" jsonb,
	"request_id" text,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"settings_key" text NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "billing_records" ADD CONSTRAINT "billing_records_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_billing_record_id_billing_records_id_fk" FOREIGN KEY ("billing_record_id") REFERENCES "public"."billing_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_rates" ADD CONSTRAINT "service_rates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_rates" ADD CONSTRAINT "shipping_rates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_charges" ADD CONSTRAINT "work_charges_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carrier_automation_configs" ADD CONSTRAINT "carrier_automation_configs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carrier_session_caches" ADD CONSTRAINT "carrier_session_caches_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carriers" ADD CONSTRAINT "carriers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shops" ADD CONSTRAINT "shops_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shops" ADD CONSTRAINT "shops_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sub_clients" ADD CONSTRAINT "sub_clients_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sub_clients" ADD CONSTRAINT "sub_clients_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auto_processing_rules" ADD CONSTRAINT "auto_processing_rules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_field_definitions" ADD CONSTRAINT "custom_field_definitions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rule_definitions" ADD CONSTRAINT "rule_definitions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_logs" ADD CONSTRAINT "webhook_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_logs" ADD CONSTRAINT "webhook_logs_webhook_id_webhooks_id_fk" FOREIGN KEY ("webhook_id") REFERENCES "public"."webhooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbound_order_lines" ADD CONSTRAINT "inbound_order_lines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbound_order_lines" ADD CONSTRAINT "inbound_order_lines_inbound_order_id_inbound_orders_id_fk" FOREIGN KEY ("inbound_order_id") REFERENCES "public"."inbound_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbound_order_lines" ADD CONSTRAINT "inbound_order_lines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbound_orders" ADD CONSTRAINT "inbound_orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_sub_skus" ADD CONSTRAINT "product_sub_skus_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_ledger" ADD CONSTRAINT "inventory_ledger_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_ledger" ADD CONSTRAINT "inventory_ledger_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lots" ADD CONSTRAINT "lots_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lots" ADD CONSTRAINT "lots_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_moves" ADD CONSTRAINT "stock_moves_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_moves" ADD CONSTRAINT "stock_moves_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_moves" ADD CONSTRAINT "stock_moves_from_location_id_locations_id_fk" FOREIGN KEY ("from_location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_moves" ADD CONSTRAINT "stock_moves_to_location_id_locations_id_fk" FOREIGN KEY ("to_location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_quants" ADD CONSTRAINT "stock_quants_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_quants" ADD CONSTRAINT "stock_quants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_quants" ADD CONSTRAINT "stock_quants_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_order_lines" ADD CONSTRAINT "return_order_lines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_order_lines" ADD CONSTRAINT "return_order_lines_return_order_id_return_orders_id_fk" FOREIGN KEY ("return_order_id") REFERENCES "public"."return_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_order_lines" ADD CONSTRAINT "return_order_lines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_orders" ADD CONSTRAINT "return_orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_groups" ADD CONSTRAINT "order_groups_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_source_companies" ADD CONSTRAINT "order_source_companies_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_order_materials" ADD CONSTRAINT "shipment_order_materials_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_order_materials" ADD CONSTRAINT "shipment_order_materials_shipment_order_id_shipment_orders_id_fk" FOREIGN KEY ("shipment_order_id") REFERENCES "public"."shipment_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_order_products" ADD CONSTRAINT "shipment_order_products_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_order_products" ADD CONSTRAINT "shipment_order_products_shipment_order_id_shipment_orders_id_fk" FOREIGN KEY ("shipment_order_id") REFERENCES "public"."shipment_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_order_products" ADD CONSTRAINT "shipment_order_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_orders" ADD CONSTRAINT "shipment_orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_orders" ADD CONSTRAINT "shipment_orders_order_group_id_order_groups_id_fk" FOREIGN KEY ("order_group_id") REFERENCES "public"."order_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_orders" ADD CONSTRAINT "shipment_orders_order_source_company_id_order_source_companies_id_fk" FOREIGN KEY ("order_source_company_id") REFERENCES "public"."order_source_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stocktaking_orders" ADD CONSTRAINT "stocktaking_orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stocktaking_orders" ADD CONSTRAINT "stocktaking_orders_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_tasks" ADD CONSTRAINT "warehouse_tasks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_tasks" ADD CONSTRAINT "warehouse_tasks_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_tasks" ADD CONSTRAINT "warehouse_tasks_wave_id_waves_id_fk" FOREIGN KEY ("wave_id") REFERENCES "public"."waves"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waves" ADD CONSTRAINT "waves_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waves" ADD CONSTRAINT "waves_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_templates" ADD CONSTRAINT "form_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mapping_configs" ADD CONSTRAINT "mapping_configs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_templates" ADD CONSTRAINT "print_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operation_logs" ADD CONSTRAINT "operation_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "billing_records_tenant_period_client_carrier_idx" ON "billing_records" USING btree ("tenant_id","period","client_id","carrier_id");--> statement-breakpoint
CREATE INDEX "billing_records_tenant_period_idx" ON "billing_records" USING btree ("tenant_id","period");--> statement-breakpoint
CREATE INDEX "billing_records_tenant_client_idx" ON "billing_records" USING btree ("tenant_id","client_id");--> statement-breakpoint
CREATE INDEX "billing_records_tenant_carrier_idx" ON "billing_records" USING btree ("tenant_id","carrier_id");--> statement-breakpoint
CREATE INDEX "billing_records_status_idx" ON "billing_records" USING btree ("status");--> statement-breakpoint
CREATE INDEX "invoices_tenant_period_idx" ON "invoices" USING btree ("tenant_id","period");--> statement-breakpoint
CREATE INDEX "invoices_tenant_client_idx" ON "invoices" USING btree ("tenant_id","client_id");--> statement-breakpoint
CREATE INDEX "invoices_tenant_status_idx" ON "invoices" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "invoices_billing_record_idx" ON "invoices" USING btree ("billing_record_id");--> statement-breakpoint
CREATE INDEX "invoices_due_status_idx" ON "invoices" USING btree ("due_date","status");--> statement-breakpoint
CREATE INDEX "service_rates_tenant_client_type_idx" ON "service_rates" USING btree ("tenant_id","client_id","charge_type");--> statement-breakpoint
CREATE INDEX "service_rates_tenant_active_idx" ON "service_rates" USING btree ("tenant_id","is_active");--> statement-breakpoint
CREATE INDEX "shipping_rates_tenant_carrier_idx" ON "shipping_rates" USING btree ("tenant_id","carrier_id");--> statement-breakpoint
CREATE INDEX "shipping_rates_tenant_active_idx" ON "shipping_rates" USING btree ("tenant_id","is_active");--> statement-breakpoint
CREATE INDEX "shipping_rates_tenant_carrier_active_idx" ON "shipping_rates" USING btree ("tenant_id","carrier_id","is_active");--> statement-breakpoint
CREATE INDEX "work_charges_tenant_date_idx" ON "work_charges" USING btree ("tenant_id","charge_date");--> statement-breakpoint
CREATE INDEX "work_charges_tenant_client_billed_idx" ON "work_charges" USING btree ("tenant_id","client_id","is_billed");--> statement-breakpoint
CREATE INDEX "work_charges_tenant_period_idx" ON "work_charges" USING btree ("tenant_id","billing_period");--> statement-breakpoint
CREATE INDEX "work_charges_reference_idx" ON "work_charges" USING btree ("reference_id");--> statement-breakpoint
CREATE INDEX "work_charges_tenant_subclient_idx" ON "work_charges" USING btree ("tenant_id","sub_client_id");--> statement-breakpoint
CREATE INDEX "work_charges_tenant_shop_idx" ON "work_charges" USING btree ("tenant_id","shop_id");--> statement-breakpoint
CREATE UNIQUE INDEX "carrier_automation_tenant_type_idx" ON "carrier_automation_configs" USING btree ("tenant_id","carrier_type");--> statement-breakpoint
CREATE UNIQUE INDEX "carrier_session_tenant_type_idx" ON "carrier_session_caches" USING btree ("tenant_id","carrier_type");--> statement-breakpoint
CREATE UNIQUE INDEX "carriers_code_idx" ON "carriers" USING btree ("code");--> statement-breakpoint
CREATE INDEX "carriers_tenant_idx" ON "carriers" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "carriers_enabled_idx" ON "carriers" USING btree ("enabled");--> statement-breakpoint
CREATE UNIQUE INDEX "clients_tenant_code_idx" ON "clients" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX "clients_tenant_active_idx" ON "clients" USING btree ("tenant_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_tenant_code_idx" ON "customers" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX "customers_client_idx" ON "customers" USING btree ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shops_tenant_code_idx" ON "shops" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX "shops_client_idx" ON "shops" USING btree ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sub_clients_tenant_code_idx" ON "sub_clients" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX "sub_clients_client_idx" ON "sub_clients" USING btree ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "suppliers_tenant_code_idx" ON "suppliers" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX "auto_rules_tenant_idx" ON "auto_processing_rules" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "auto_rules_tenant_priority_idx" ON "auto_processing_rules" USING btree ("tenant_id","priority");--> statement-breakpoint
CREATE INDEX "custom_fields_tenant_idx" ON "custom_field_definitions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "custom_fields_tenant_entity_idx" ON "custom_field_definitions" USING btree ("tenant_id","entity_type");--> statement-breakpoint
CREATE INDEX "rule_defs_tenant_idx" ON "rule_definitions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "rule_defs_tenant_module_idx" ON "rule_definitions" USING btree ("tenant_id","module");--> statement-breakpoint
CREATE INDEX "rule_defs_tenant_priority_idx" ON "rule_definitions" USING btree ("tenant_id","priority");--> statement-breakpoint
CREATE INDEX "webhook_logs_tenant_idx" ON "webhook_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "webhook_logs_webhook_idx" ON "webhook_logs" USING btree ("webhook_id");--> statement-breakpoint
CREATE INDEX "webhooks_tenant_idx" ON "webhooks" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "inbound_lines_order_idx" ON "inbound_order_lines" USING btree ("inbound_order_id");--> statement-breakpoint
CREATE INDEX "inbound_lines_tenant_product_idx" ON "inbound_order_lines" USING btree ("tenant_id","product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inbound_orders_tenant_number_idx" ON "inbound_orders" USING btree ("tenant_id","order_number");--> statement-breakpoint
CREATE INDEX "inbound_orders_tenant_status_idx" ON "inbound_orders" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "inbound_orders_tenant_client_idx" ON "inbound_orders" USING btree ("tenant_id","client_id");--> statement-breakpoint
CREATE INDEX "inbound_orders_tenant_warehouse_idx" ON "inbound_orders" USING btree ("tenant_id","warehouse_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sub_skus_product_code_idx" ON "product_sub_skus" USING btree ("product_id","sub_sku");--> statement-breakpoint
CREATE UNIQUE INDEX "products_tenant_sku_idx" ON "products" USING btree ("tenant_id","sku");--> statement-breakpoint
CREATE INDEX "products_tenant_customer_code_idx" ON "products" USING btree ("tenant_id","customer_product_code");--> statement-breakpoint
CREATE INDEX "products_tenant_brand_idx" ON "products" USING btree ("tenant_id","brand_code");--> statement-breakpoint
CREATE INDEX "products_tenant_client_idx" ON "products" USING btree ("tenant_id","client_id");--> statement-breakpoint
CREATE INDEX "ledger_tenant_created_idx" ON "inventory_ledger" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "ledger_product_idx" ON "inventory_ledger" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "locations_tenant_code_idx" ON "locations" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX "locations_tenant_type_idx" ON "locations" USING btree ("tenant_id","type");--> statement-breakpoint
CREATE INDEX "locations_warehouse_idx" ON "locations" USING btree ("warehouse_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lots_tenant_product_lot_idx" ON "lots" USING btree ("tenant_id","product_id","lot_number");--> statement-breakpoint
CREATE INDEX "stock_moves_tenant_created_idx" ON "stock_moves" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "stock_moves_reference_idx" ON "stock_moves" USING btree ("reference_type","reference_id");--> statement-breakpoint
CREATE INDEX "stock_moves_product_idx" ON "stock_moves" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_quants_unique_idx" ON "stock_quants" USING btree ("tenant_id","product_id","location_id","lot_id");--> statement-breakpoint
CREATE INDEX "stock_quants_product_idx" ON "stock_quants" USING btree ("tenant_id","product_id");--> statement-breakpoint
CREATE INDEX "stock_quants_location_idx" ON "stock_quants" USING btree ("tenant_id","location_id");--> statement-breakpoint
CREATE INDEX "return_lines_order_idx" ON "return_order_lines" USING btree ("return_order_id");--> statement-breakpoint
CREATE INDEX "return_lines_tenant_product_idx" ON "return_order_lines" USING btree ("tenant_id","product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "return_orders_tenant_number_idx" ON "return_orders" USING btree ("tenant_id","order_number");--> statement-breakpoint
CREATE INDEX "return_orders_tenant_status_idx" ON "return_orders" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "return_orders_tenant_client_idx" ON "return_orders" USING btree ("tenant_id","client_id");--> statement-breakpoint
CREATE INDEX "return_orders_shipment_idx" ON "return_orders" USING btree ("shipment_order_id");--> statement-breakpoint
CREATE INDEX "order_groups_tenant_idx" ON "order_groups" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "order_source_companies_tenant_idx" ON "order_source_companies" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "shipment_order_materials_order_idx" ON "shipment_order_materials" USING btree ("shipment_order_id");--> statement-breakpoint
CREATE INDEX "shipment_order_products_order_idx" ON "shipment_order_products" USING btree ("shipment_order_id");--> statement-breakpoint
CREATE INDEX "shipment_order_products_product_idx" ON "shipment_order_products" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "shipment_orders_tenant_created_idx" ON "shipment_orders" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "shipment_orders_tenant_status_idx" ON "shipment_orders" USING btree ("tenant_id","status_confirmed","status_shipped");--> statement-breakpoint
CREATE UNIQUE INDEX "shipment_orders_tenant_order_number_idx" ON "shipment_orders" USING btree ("tenant_id","order_number");--> statement-breakpoint
CREATE UNIQUE INDEX "warehouses_tenant_code_idx" ON "warehouses" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX "warehouses_tenant_active_idx" ON "warehouses" USING btree ("tenant_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "materials_tenant_sku_idx" ON "materials" USING btree ("tenant_id","sku");--> statement-breakpoint
CREATE INDEX "materials_tenant_category_idx" ON "materials" USING btree ("tenant_id","category");--> statement-breakpoint
CREATE UNIQUE INDEX "stocktaking_orders_tenant_number_idx" ON "stocktaking_orders" USING btree ("tenant_id","order_number");--> statement-breakpoint
CREATE INDEX "stocktaking_orders_warehouse_idx" ON "stocktaking_orders" USING btree ("warehouse_id");--> statement-breakpoint
CREATE INDEX "stocktaking_orders_status_idx" ON "stocktaking_orders" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "warehouse_tasks_tenant_number_idx" ON "warehouse_tasks" USING btree ("tenant_id","task_number");--> statement-breakpoint
CREATE INDEX "warehouse_tasks_warehouse_idx" ON "warehouse_tasks" USING btree ("warehouse_id");--> statement-breakpoint
CREATE INDEX "warehouse_tasks_wave_idx" ON "warehouse_tasks" USING btree ("wave_id");--> statement-breakpoint
CREATE INDEX "warehouse_tasks_status_idx" ON "warehouse_tasks" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "waves_tenant_number_idx" ON "waves" USING btree ("tenant_id","wave_number");--> statement-breakpoint
CREATE INDEX "waves_warehouse_idx" ON "waves" USING btree ("warehouse_id");--> statement-breakpoint
CREATE INDEX "waves_status_idx" ON "waves" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "email_templates_tenant_idx" ON "email_templates" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "form_templates_tenant_idx" ON "form_templates" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "form_templates_tenant_target_idx" ON "form_templates" USING btree ("tenant_id","target_type");--> statement-breakpoint
CREATE INDEX "mapping_configs_tenant_idx" ON "mapping_configs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "mapping_configs_tenant_type_idx" ON "mapping_configs" USING btree ("tenant_id","config_type");--> statement-breakpoint
CREATE INDEX "print_templates_tenant_idx" ON "print_templates" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "print_templates_tenant_type_idx" ON "print_templates" USING btree ("tenant_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_reports_tenant_date_idx" ON "daily_reports" USING btree ("tenant_id","date");--> statement-breakpoint
CREATE INDEX "notifications_tenant_user_idx" ON "notifications" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE INDEX "notifications_tenant_user_unread_idx" ON "notifications" USING btree ("tenant_id","user_id","is_read");--> statement-breakpoint
CREATE INDEX "operation_logs_tenant_idx" ON "operation_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "operation_logs_tenant_resource_idx" ON "operation_logs" USING btree ("tenant_id","resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "operation_logs_tenant_action_idx" ON "operation_logs" USING btree ("tenant_id","action");--> statement-breakpoint
CREATE INDEX "operation_logs_created_idx" ON "operation_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "system_settings_tenant_key_idx" ON "system_settings" USING btree ("tenant_id","settings_key");