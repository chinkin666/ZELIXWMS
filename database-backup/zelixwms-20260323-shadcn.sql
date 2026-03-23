--
-- PostgreSQL database dump
--

\restrict 9WUcVQ8DSJcnQUxYQqJUWqhqU0UzVLvHmlCW73DiFFOb0ppStzT3eqKti1W9tK9

-- Dumped from database version 17.9
-- Dumped by pg_dump version 17.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.workflows DROP CONSTRAINT IF EXISTS workflows_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.workflow_logs DROP CONSTRAINT IF EXISTS workflow_logs_workflow_id_workflows_id_fk;
ALTER TABLE IF EXISTS ONLY public.workflow_logs DROP CONSTRAINT IF EXISTS workflow_logs_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.work_charges DROP CONSTRAINT IF EXISTS work_charges_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.webhooks DROP CONSTRAINT IF EXISTS webhooks_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.webhook_logs DROP CONSTRAINT IF EXISTS webhook_logs_webhook_id_webhooks_id_fk;
ALTER TABLE IF EXISTS ONLY public.webhook_logs DROP CONSTRAINT IF EXISTS webhook_logs_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.waves DROP CONSTRAINT IF EXISTS waves_warehouse_id_warehouses_id_fk;
ALTER TABLE IF EXISTS ONLY public.waves DROP CONSTRAINT IF EXISTS waves_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.warehouses DROP CONSTRAINT IF EXISTS warehouses_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.warehouse_tasks DROP CONSTRAINT IF EXISTS warehouse_tasks_wave_id_waves_id_fk;
ALTER TABLE IF EXISTS ONLY public.warehouse_tasks DROP CONSTRAINT IF EXISTS warehouse_tasks_warehouse_id_warehouses_id_fk;
ALTER TABLE IF EXISTS ONLY public.warehouse_tasks DROP CONSTRAINT IF EXISTS warehouse_tasks_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.system_settings DROP CONSTRAINT IF EXISTS system_settings_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.suppliers DROP CONSTRAINT IF EXISTS suppliers_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.sub_clients DROP CONSTRAINT IF EXISTS sub_clients_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.sub_clients DROP CONSTRAINT IF EXISTS sub_clients_client_id_clients_id_fk;
ALTER TABLE IF EXISTS ONLY public.stocktaking_orders DROP CONSTRAINT IF EXISTS stocktaking_orders_warehouse_id_warehouses_id_fk;
ALTER TABLE IF EXISTS ONLY public.stocktaking_orders DROP CONSTRAINT IF EXISTS stocktaking_orders_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.stocktaking_orders DROP CONSTRAINT IF EXISTS stocktaking_orders_client_id_clients_id_fk;
ALTER TABLE IF EXISTS ONLY public.stocktaking_lines DROP CONSTRAINT IF EXISTS stocktaking_lines_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.stocktaking_lines DROP CONSTRAINT IF EXISTS stocktaking_lines_stocktaking_order_id_stocktaking_orders_id_fk;
ALTER TABLE IF EXISTS ONLY public.stocktaking_lines DROP CONSTRAINT IF EXISTS stocktaking_lines_product_id_products_id_fk;
ALTER TABLE IF EXISTS ONLY public.stocktaking_lines DROP CONSTRAINT IF EXISTS stocktaking_lines_location_id_locations_id_fk;
ALTER TABLE IF EXISTS ONLY public.stocktaking_discrepancies DROP CONSTRAINT IF EXISTS stocktaking_discrepancies_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.stocktaking_discrepancies DROP CONSTRAINT IF EXISTS stocktaking_discrepancies_stocktaking_order_id_stocktaking_orde;
ALTER TABLE IF EXISTS ONLY public.stocktaking_discrepancies DROP CONSTRAINT IF EXISTS stocktaking_discrepancies_product_id_products_id_fk;
ALTER TABLE IF EXISTS ONLY public.stocktaking_discrepancies DROP CONSTRAINT IF EXISTS stocktaking_discrepancies_location_id_locations_id_fk;
ALTER TABLE IF EXISTS ONLY public.stock_quants DROP CONSTRAINT IF EXISTS stock_quants_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.stock_quants DROP CONSTRAINT IF EXISTS stock_quants_product_id_products_id_fk;
ALTER TABLE IF EXISTS ONLY public.stock_quants DROP CONSTRAINT IF EXISTS stock_quants_location_id_locations_id_fk;
ALTER TABLE IF EXISTS ONLY public.stock_moves DROP CONSTRAINT IF EXISTS stock_moves_to_location_id_locations_id_fk;
ALTER TABLE IF EXISTS ONLY public.stock_moves DROP CONSTRAINT IF EXISTS stock_moves_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.stock_moves DROP CONSTRAINT IF EXISTS stock_moves_product_id_products_id_fk;
ALTER TABLE IF EXISTS ONLY public.stock_moves DROP CONSTRAINT IF EXISTS stock_moves_from_location_id_locations_id_fk;
ALTER TABLE IF EXISTS ONLY public.slotting_rules DROP CONSTRAINT IF EXISTS slotting_rules_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.shortage_records DROP CONSTRAINT IF EXISTS shortage_records_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.shortage_records DROP CONSTRAINT IF EXISTS shortage_records_shipment_order_id_shipment_orders_id_fk;
ALTER TABLE IF EXISTS ONLY public.shortage_records DROP CONSTRAINT IF EXISTS shortage_records_product_id_products_id_fk;
ALTER TABLE IF EXISTS ONLY public.shops DROP CONSTRAINT IF EXISTS shops_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.shops DROP CONSTRAINT IF EXISTS shops_client_id_clients_id_fk;
ALTER TABLE IF EXISTS ONLY public.shipping_rates DROP CONSTRAINT IF EXISTS shipping_rates_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.shipment_orders DROP CONSTRAINT IF EXISTS shipment_orders_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.shipment_orders DROP CONSTRAINT IF EXISTS shipment_orders_order_source_company_id_order_source_companies_;
ALTER TABLE IF EXISTS ONLY public.shipment_orders DROP CONSTRAINT IF EXISTS shipment_orders_order_group_id_order_groups_id_fk;
ALTER TABLE IF EXISTS ONLY public.shipment_order_products DROP CONSTRAINT IF EXISTS shipment_order_products_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.shipment_order_products DROP CONSTRAINT IF EXISTS shipment_order_products_shipment_order_id_shipment_orders_id_fk;
ALTER TABLE IF EXISTS ONLY public.shipment_order_products DROP CONSTRAINT IF EXISTS shipment_order_products_product_id_products_id_fk;
ALTER TABLE IF EXISTS ONLY public.shipment_order_materials DROP CONSTRAINT IF EXISTS shipment_order_materials_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.shipment_order_materials DROP CONSTRAINT IF EXISTS shipment_order_materials_shipment_order_id_shipment_orders_id_f;
ALTER TABLE IF EXISTS ONLY public.set_master DROP CONSTRAINT IF EXISTS set_master_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.set_master DROP CONSTRAINT IF EXISTS set_master_set_product_id_products_id_fk;
ALTER TABLE IF EXISTS ONLY public.set_master DROP CONSTRAINT IF EXISTS set_master_component_product_id_products_id_fk;
ALTER TABLE IF EXISTS ONLY public.service_rates DROP CONSTRAINT IF EXISTS service_rates_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.scripts DROP CONSTRAINT IF EXISTS scripts_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.rule_definitions DROP CONSTRAINT IF EXISTS rule_definitions_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.rsl_shipment_plans DROP CONSTRAINT IF EXISTS rsl_shipment_plans_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.rsl_items DROP CONSTRAINT IF EXISTS rsl_items_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.rsl_items DROP CONSTRAINT IF EXISTS rsl_items_shipment_plan_id_rsl_shipment_plans_id_fk;
ALTER TABLE IF EXISTS ONLY public.return_orders DROP CONSTRAINT IF EXISTS return_orders_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.return_order_lines DROP CONSTRAINT IF EXISTS return_order_lines_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.return_order_lines DROP CONSTRAINT IF EXISTS return_order_lines_return_order_id_return_orders_id_fk;
ALTER TABLE IF EXISTS ONLY public.return_order_lines DROP CONSTRAINT IF EXISTS return_order_lines_product_id_products_id_fk;
ALTER TABLE IF EXISTS ONLY public.products DROP CONSTRAINT IF EXISTS products_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.product_sub_skus DROP CONSTRAINT IF EXISTS product_sub_skus_product_id_products_id_fk;
ALTER TABLE IF EXISTS ONLY public.print_templates DROP CONSTRAINT IF EXISTS print_templates_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.print_templates DROP CONSTRAINT IF EXISTS print_templates_client_id_clients_id_fk;
ALTER TABLE IF EXISTS ONLY public.plugins DROP CONSTRAINT IF EXISTS plugins_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.photos DROP CONSTRAINT IF EXISTS photos_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.passthrough_orders DROP CONSTRAINT IF EXISTS passthrough_orders_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.order_source_companies DROP CONSTRAINT IF EXISTS order_source_companies_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.order_groups DROP CONSTRAINT IF EXISTS order_groups_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.operation_logs DROP CONSTRAINT IF EXISTS operation_logs_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.notifications DROP CONSTRAINT IF EXISTS notifications_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.materials DROP CONSTRAINT IF EXISTS materials_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.mapping_configs DROP CONSTRAINT IF EXISTS mapping_configs_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.lots DROP CONSTRAINT IF EXISTS lots_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.lots DROP CONSTRAINT IF EXISTS lots_product_id_products_id_fk;
ALTER TABLE IF EXISTS ONLY public.locations DROP CONSTRAINT IF EXISTS locations_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.invoices DROP CONSTRAINT IF EXISTS invoices_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.invoices DROP CONSTRAINT IF EXISTS invoices_billing_record_id_billing_records_id_fk;
ALTER TABLE IF EXISTS ONLY public.inventory_ledger DROP CONSTRAINT IF EXISTS inventory_ledger_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.inventory_ledger DROP CONSTRAINT IF EXISTS inventory_ledger_product_id_products_id_fk;
ALTER TABLE IF EXISTS ONLY public.inbound_orders DROP CONSTRAINT IF EXISTS inbound_orders_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.inbound_order_lines DROP CONSTRAINT IF EXISTS inbound_order_lines_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.inbound_order_lines DROP CONSTRAINT IF EXISTS inbound_order_lines_product_id_products_id_fk;
ALTER TABLE IF EXISTS ONLY public.inbound_order_lines DROP CONSTRAINT IF EXISTS inbound_order_lines_inbound_order_id_inbound_orders_id_fk;
ALTER TABLE IF EXISTS ONLY public.gift_options DROP CONSTRAINT IF EXISTS gift_options_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.form_templates DROP CONSTRAINT IF EXISTS form_templates_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.form_templates DROP CONSTRAINT IF EXISTS form_templates_client_id_clients_id_fk;
ALTER TABLE IF EXISTS ONLY public.fba_shipment_plans DROP CONSTRAINT IF EXISTS fba_shipment_plans_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.fba_boxes DROP CONSTRAINT IF EXISTS fba_boxes_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.fba_boxes DROP CONSTRAINT IF EXISTS fba_boxes_shipment_plan_id_fba_shipment_plans_id_fk;
ALTER TABLE IF EXISTS ONLY public.exception_reports DROP CONSTRAINT IF EXISTS exception_reports_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.email_templates DROP CONSTRAINT IF EXISTS email_templates_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.daily_reports DROP CONSTRAINT IF EXISTS daily_reports_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.customers DROP CONSTRAINT IF EXISTS customers_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.custom_field_definitions DROP CONSTRAINT IF EXISTS custom_field_definitions_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.clients DROP CONSTRAINT IF EXISTS clients_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.carriers DROP CONSTRAINT IF EXISTS carriers_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.carrier_session_caches DROP CONSTRAINT IF EXISTS carrier_session_caches_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.carrier_automation_configs DROP CONSTRAINT IF EXISTS carrier_automation_configs_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.billing_records DROP CONSTRAINT IF EXISTS billing_records_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.auto_processing_rules DROP CONSTRAINT IF EXISTS auto_processing_rules_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.assembly_orders DROP CONSTRAINT IF EXISTS assembly_orders_tenant_id_tenants_id_fk;
ALTER TABLE IF EXISTS ONLY public.api_logs DROP CONSTRAINT IF EXISTS api_logs_tenant_id_tenants_id_fk;
DROP INDEX IF EXISTS public.workflows_trigger_type_idx;
DROP INDEX IF EXISTS public.workflows_tenant_idx;
DROP INDEX IF EXISTS public.workflows_enabled_idx;
DROP INDEX IF EXISTS public.workflow_logs_workflow_idx;
DROP INDEX IF EXISTS public.workflow_logs_tenant_idx;
DROP INDEX IF EXISTS public.workflow_logs_status_idx;
DROP INDEX IF EXISTS public.workflow_logs_created_idx;
DROP INDEX IF EXISTS public.work_charges_tenant_subclient_idx;
DROP INDEX IF EXISTS public.work_charges_tenant_shop_idx;
DROP INDEX IF EXISTS public.work_charges_tenant_period_idx;
DROP INDEX IF EXISTS public.work_charges_tenant_date_idx;
DROP INDEX IF EXISTS public.work_charges_tenant_client_billed_idx;
DROP INDEX IF EXISTS public.work_charges_reference_idx;
DROP INDEX IF EXISTS public.webhooks_tenant_idx;
DROP INDEX IF EXISTS public.webhook_logs_webhook_idx;
DROP INDEX IF EXISTS public.webhook_logs_tenant_idx;
DROP INDEX IF EXISTS public.waves_warehouse_idx;
DROP INDEX IF EXISTS public.waves_tenant_number_idx;
DROP INDEX IF EXISTS public.waves_status_idx;
DROP INDEX IF EXISTS public.warehouses_tenant_code_idx;
DROP INDEX IF EXISTS public.warehouses_tenant_active_idx;
DROP INDEX IF EXISTS public.warehouse_tasks_wave_idx;
DROP INDEX IF EXISTS public.warehouse_tasks_warehouse_idx;
DROP INDEX IF EXISTS public.warehouse_tasks_tenant_number_idx;
DROP INDEX IF EXISTS public.warehouse_tasks_status_idx;
DROP INDEX IF EXISTS public.system_settings_tenant_key_idx;
DROP INDEX IF EXISTS public.suppliers_tenant_code_idx;
DROP INDEX IF EXISTS public.sub_skus_product_code_idx;
DROP INDEX IF EXISTS public.sub_clients_tenant_code_idx;
DROP INDEX IF EXISTS public.sub_clients_client_idx;
DROP INDEX IF EXISTS public.stocktaking_orders_warehouse_idx;
DROP INDEX IF EXISTS public.stocktaking_orders_tenant_number_idx;
DROP INDEX IF EXISTS public.stocktaking_orders_status_idx;
DROP INDEX IF EXISTS public.stocktaking_orders_client_idx;
DROP INDEX IF EXISTS public.stocktaking_lines_tenant_idx;
DROP INDEX IF EXISTS public.stocktaking_lines_product_idx;
DROP INDEX IF EXISTS public.stocktaking_lines_order_idx;
DROP INDEX IF EXISTS public.stocktaking_discrepancies_tenant_idx;
DROP INDEX IF EXISTS public.stocktaking_discrepancies_order_idx;
DROP INDEX IF EXISTS public.stock_quants_unique_idx;
DROP INDEX IF EXISTS public.stock_quants_product_idx;
DROP INDEX IF EXISTS public.stock_quants_location_idx;
DROP INDEX IF EXISTS public.stock_moves_tenant_created_idx;
DROP INDEX IF EXISTS public.stock_moves_reference_idx;
DROP INDEX IF EXISTS public.stock_moves_product_idx;
DROP INDEX IF EXISTS public.slotting_rules_tenant_idx;
DROP INDEX IF EXISTS public.slotting_rules_priority_idx;
DROP INDEX IF EXISTS public.slotting_rules_enabled_idx;
DROP INDEX IF EXISTS public.shortage_records_tenant_idx;
DROP INDEX IF EXISTS public.shortage_records_status_idx;
DROP INDEX IF EXISTS public.shortage_records_shipment_order_idx;
DROP INDEX IF EXISTS public.shortage_records_product_idx;
DROP INDEX IF EXISTS public.shops_tenant_code_idx;
DROP INDEX IF EXISTS public.shops_client_idx;
DROP INDEX IF EXISTS public.shipping_rates_tenant_carrier_idx;
DROP INDEX IF EXISTS public.shipping_rates_tenant_carrier_active_idx;
DROP INDEX IF EXISTS public.shipping_rates_tenant_active_idx;
DROP INDEX IF EXISTS public.shipment_orders_tenant_status_idx;
DROP INDEX IF EXISTS public.shipment_orders_tenant_order_number_idx;
DROP INDEX IF EXISTS public.shipment_orders_tenant_created_idx;
DROP INDEX IF EXISTS public.shipment_order_products_product_idx;
DROP INDEX IF EXISTS public.shipment_order_products_order_idx;
DROP INDEX IF EXISTS public.shipment_order_materials_order_idx;
DROP INDEX IF EXISTS public.set_master_tenant_idx;
DROP INDEX IF EXISTS public.set_master_set_product_idx;
DROP INDEX IF EXISTS public.service_rates_tenant_client_type_idx;
DROP INDEX IF EXISTS public.service_rates_tenant_active_idx;
DROP INDEX IF EXISTS public.scripts_tenant_idx;
DROP INDEX IF EXISTS public.rule_defs_tenant_priority_idx;
DROP INDEX IF EXISTS public.rule_defs_tenant_module_idx;
DROP INDEX IF EXISTS public.rule_defs_tenant_idx;
DROP INDEX IF EXISTS public.rsl_shipment_plans_tenant_idx;
DROP INDEX IF EXISTS public.rsl_shipment_plans_status_idx;
DROP INDEX IF EXISTS public.rsl_shipment_plans_order_idx;
DROP INDEX IF EXISTS public.rsl_items_tenant_idx;
DROP INDEX IF EXISTS public.rsl_items_status_idx;
DROP INDEX IF EXISTS public.rsl_items_plan_idx;
DROP INDEX IF EXISTS public.return_orders_tenant_status_idx;
DROP INDEX IF EXISTS public.return_orders_tenant_number_idx;
DROP INDEX IF EXISTS public.return_orders_tenant_client_idx;
DROP INDEX IF EXISTS public.return_orders_shipment_idx;
DROP INDEX IF EXISTS public.return_lines_tenant_product_idx;
DROP INDEX IF EXISTS public.return_lines_order_idx;
DROP INDEX IF EXISTS public.products_tenant_sku_idx;
DROP INDEX IF EXISTS public.products_tenant_house_code_idx;
DROP INDEX IF EXISTS public.products_tenant_enterprise_code_idx;
DROP INDEX IF EXISTS public.products_tenant_customer_code_idx;
DROP INDEX IF EXISTS public.products_tenant_client_idx;
DROP INDEX IF EXISTS public.products_tenant_brand_idx;
DROP INDEX IF EXISTS public.print_templates_tenant_type_idx;
DROP INDEX IF EXISTS public.print_templates_tenant_idx;
DROP INDEX IF EXISTS public.print_templates_scope_idx;
DROP INDEX IF EXISTS public.print_templates_client_idx;
DROP INDEX IF EXISTS public.plugins_tenant_idx;
DROP INDEX IF EXISTS public.plugins_tenant_enabled_idx;
DROP INDEX IF EXISTS public.photos_uploaded_by_idx;
DROP INDEX IF EXISTS public.photos_tenant_idx;
DROP INDEX IF EXISTS public.photos_entity_idx;
DROP INDEX IF EXISTS public.passthrough_orders_tenant_idx;
DROP INDEX IF EXISTS public.passthrough_orders_status_idx;
DROP INDEX IF EXISTS public.passthrough_orders_number_idx;
DROP INDEX IF EXISTS public.passthrough_orders_client_idx;
DROP INDEX IF EXISTS public.order_source_companies_tenant_idx;
DROP INDEX IF EXISTS public.order_groups_tenant_idx;
DROP INDEX IF EXISTS public.operation_logs_tenant_resource_idx;
DROP INDEX IF EXISTS public.operation_logs_tenant_idx;
DROP INDEX IF EXISTS public.operation_logs_tenant_action_idx;
DROP INDEX IF EXISTS public.operation_logs_created_idx;
DROP INDEX IF EXISTS public.notifications_tenant_user_unread_idx;
DROP INDEX IF EXISTS public.notifications_tenant_user_idx;
DROP INDEX IF EXISTS public.materials_tenant_sku_idx;
DROP INDEX IF EXISTS public.materials_tenant_category_idx;
DROP INDEX IF EXISTS public.mapping_configs_tenant_type_idx;
DROP INDEX IF EXISTS public.mapping_configs_tenant_idx;
DROP INDEX IF EXISTS public.lots_tenant_product_lot_idx;
DROP INDEX IF EXISTS public.locations_warehouse_idx;
DROP INDEX IF EXISTS public.locations_tenant_type_idx;
DROP INDEX IF EXISTS public.locations_tenant_code_idx;
DROP INDEX IF EXISTS public.ledger_tenant_created_idx;
DROP INDEX IF EXISTS public.ledger_product_idx;
DROP INDEX IF EXISTS public.invoices_tenant_status_idx;
DROP INDEX IF EXISTS public.invoices_tenant_period_idx;
DROP INDEX IF EXISTS public.invoices_tenant_client_idx;
DROP INDEX IF EXISTS public.invoices_due_status_idx;
DROP INDEX IF EXISTS public.invoices_billing_record_idx;
DROP INDEX IF EXISTS public.inbound_orders_tenant_warehouse_idx;
DROP INDEX IF EXISTS public.inbound_orders_tenant_status_idx;
DROP INDEX IF EXISTS public.inbound_orders_tenant_number_idx;
DROP INDEX IF EXISTS public.inbound_orders_tenant_client_idx;
DROP INDEX IF EXISTS public.inbound_lines_tenant_product_idx;
DROP INDEX IF EXISTS public.inbound_lines_order_idx;
DROP INDEX IF EXISTS public.handling_label_types_sort_idx;
DROP INDEX IF EXISTS public.gift_options_tenant_idx;
DROP INDEX IF EXISTS public.gift_options_shipment_order_idx;
DROP INDEX IF EXISTS public.form_templates_tenant_target_idx;
DROP INDEX IF EXISTS public.form_templates_tenant_idx;
DROP INDEX IF EXISTS public.form_templates_scope_idx;
DROP INDEX IF EXISTS public.form_templates_client_idx;
DROP INDEX IF EXISTS public.fba_shipment_plans_tenant_idx;
DROP INDEX IF EXISTS public.fba_shipment_plans_status_idx;
DROP INDEX IF EXISTS public.fba_shipment_plans_amazon_id_idx;
DROP INDEX IF EXISTS public.fba_boxes_tenant_idx;
DROP INDEX IF EXISTS public.fba_boxes_status_idx;
DROP INDEX IF EXISTS public.fba_boxes_plan_idx;
DROP INDEX IF EXISTS public.exception_reports_tenant_status_idx;
DROP INDEX IF EXISTS public.exception_reports_tenant_number_idx;
DROP INDEX IF EXISTS public.exception_reports_tenant_client_idx;
DROP INDEX IF EXISTS public.exception_reports_sla_idx;
DROP INDEX IF EXISTS public.email_templates_tenant_idx;
DROP INDEX IF EXISTS public.daily_reports_tenant_date_idx;
DROP INDEX IF EXISTS public.customers_tenant_code_idx;
DROP INDEX IF EXISTS public.customers_client_idx;
DROP INDEX IF EXISTS public.custom_fields_tenant_idx;
DROP INDEX IF EXISTS public.custom_fields_tenant_entity_idx;
DROP INDEX IF EXISTS public.country_codes_region_idx;
DROP INDEX IF EXISTS public.country_codes_alpha3_idx;
DROP INDEX IF EXISTS public.country_codes_alpha2_idx;
DROP INDEX IF EXISTS public.clients_tenant_code_idx;
DROP INDEX IF EXISTS public.clients_tenant_active_idx;
DROP INDEX IF EXISTS public.carriers_tenant_idx;
DROP INDEX IF EXISTS public.carriers_enabled_idx;
DROP INDEX IF EXISTS public.carriers_code_idx;
DROP INDEX IF EXISTS public.carrier_session_tenant_type_idx;
DROP INDEX IF EXISTS public.carrier_automation_tenant_type_idx;
DROP INDEX IF EXISTS public.billing_records_tenant_period_idx;
DROP INDEX IF EXISTS public.billing_records_tenant_period_client_carrier_idx;
DROP INDEX IF EXISTS public.billing_records_tenant_client_idx;
DROP INDEX IF EXISTS public.billing_records_tenant_carrier_idx;
DROP INDEX IF EXISTS public.billing_records_status_idx;
DROP INDEX IF EXISTS public.auto_rules_tenant_priority_idx;
DROP INDEX IF EXISTS public.auto_rules_tenant_idx;
DROP INDEX IF EXISTS public.assembly_orders_tenant_idx;
DROP INDEX IF EXISTS public.assembly_orders_status_idx;
DROP INDEX IF EXISTS public.api_logs_user_idx;
DROP INDEX IF EXISTS public.api_logs_tenant_idx;
DROP INDEX IF EXISTS public.api_logs_status_idx;
DROP INDEX IF EXISTS public.api_logs_method_path_idx;
DROP INDEX IF EXISTS public.api_logs_created_idx;
ALTER TABLE IF EXISTS ONLY public.workflows DROP CONSTRAINT IF EXISTS workflows_pkey;
ALTER TABLE IF EXISTS ONLY public.workflow_logs DROP CONSTRAINT IF EXISTS workflow_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.work_charges DROP CONSTRAINT IF EXISTS work_charges_pkey;
ALTER TABLE IF EXISTS ONLY public.webhooks DROP CONSTRAINT IF EXISTS webhooks_pkey;
ALTER TABLE IF EXISTS ONLY public.webhook_logs DROP CONSTRAINT IF EXISTS webhook_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.waves DROP CONSTRAINT IF EXISTS waves_pkey;
ALTER TABLE IF EXISTS ONLY public.warehouses DROP CONSTRAINT IF EXISTS warehouses_pkey;
ALTER TABLE IF EXISTS ONLY public.warehouse_tasks DROP CONSTRAINT IF EXISTS warehouse_tasks_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.tenants DROP CONSTRAINT IF EXISTS tenants_pkey;
ALTER TABLE IF EXISTS ONLY public.tenants DROP CONSTRAINT IF EXISTS tenants_code_unique;
ALTER TABLE IF EXISTS ONLY public.system_settings DROP CONSTRAINT IF EXISTS system_settings_pkey;
ALTER TABLE IF EXISTS ONLY public.suppliers DROP CONSTRAINT IF EXISTS suppliers_pkey;
ALTER TABLE IF EXISTS ONLY public.sub_clients DROP CONSTRAINT IF EXISTS sub_clients_pkey;
ALTER TABLE IF EXISTS ONLY public.stocktaking_orders DROP CONSTRAINT IF EXISTS stocktaking_orders_pkey;
ALTER TABLE IF EXISTS ONLY public.stocktaking_lines DROP CONSTRAINT IF EXISTS stocktaking_lines_pkey;
ALTER TABLE IF EXISTS ONLY public.stocktaking_discrepancies DROP CONSTRAINT IF EXISTS stocktaking_discrepancies_pkey;
ALTER TABLE IF EXISTS ONLY public.stock_quants DROP CONSTRAINT IF EXISTS stock_quants_pkey;
ALTER TABLE IF EXISTS ONLY public.stock_moves DROP CONSTRAINT IF EXISTS stock_moves_pkey;
ALTER TABLE IF EXISTS ONLY public.slotting_rules DROP CONSTRAINT IF EXISTS slotting_rules_pkey;
ALTER TABLE IF EXISTS ONLY public.shortage_records DROP CONSTRAINT IF EXISTS shortage_records_pkey;
ALTER TABLE IF EXISTS ONLY public.shops DROP CONSTRAINT IF EXISTS shops_pkey;
ALTER TABLE IF EXISTS ONLY public.shipping_rates DROP CONSTRAINT IF EXISTS shipping_rates_pkey;
ALTER TABLE IF EXISTS ONLY public.shipment_orders DROP CONSTRAINT IF EXISTS shipment_orders_pkey;
ALTER TABLE IF EXISTS ONLY public.shipment_order_products DROP CONSTRAINT IF EXISTS shipment_order_products_pkey;
ALTER TABLE IF EXISTS ONLY public.shipment_order_materials DROP CONSTRAINT IF EXISTS shipment_order_materials_pkey;
ALTER TABLE IF EXISTS ONLY public.set_master DROP CONSTRAINT IF EXISTS set_master_pkey;
ALTER TABLE IF EXISTS ONLY public.service_rates DROP CONSTRAINT IF EXISTS service_rates_pkey;
ALTER TABLE IF EXISTS ONLY public.scripts DROP CONSTRAINT IF EXISTS scripts_pkey;
ALTER TABLE IF EXISTS ONLY public.rule_definitions DROP CONSTRAINT IF EXISTS rule_definitions_pkey;
ALTER TABLE IF EXISTS ONLY public.rsl_shipment_plans DROP CONSTRAINT IF EXISTS rsl_shipment_plans_pkey;
ALTER TABLE IF EXISTS ONLY public.rsl_items DROP CONSTRAINT IF EXISTS rsl_items_pkey;
ALTER TABLE IF EXISTS ONLY public.return_orders DROP CONSTRAINT IF EXISTS return_orders_pkey;
ALTER TABLE IF EXISTS ONLY public.return_order_lines DROP CONSTRAINT IF EXISTS return_order_lines_pkey;
ALTER TABLE IF EXISTS ONLY public.products DROP CONSTRAINT IF EXISTS products_pkey;
ALTER TABLE IF EXISTS ONLY public.product_sub_skus DROP CONSTRAINT IF EXISTS product_sub_skus_pkey;
ALTER TABLE IF EXISTS ONLY public.print_templates DROP CONSTRAINT IF EXISTS print_templates_pkey;
ALTER TABLE IF EXISTS ONLY public.plugins DROP CONSTRAINT IF EXISTS plugins_pkey;
ALTER TABLE IF EXISTS ONLY public.photos DROP CONSTRAINT IF EXISTS photos_pkey;
ALTER TABLE IF EXISTS ONLY public.passthrough_orders DROP CONSTRAINT IF EXISTS passthrough_orders_pkey;
ALTER TABLE IF EXISTS ONLY public.order_source_companies DROP CONSTRAINT IF EXISTS order_source_companies_pkey;
ALTER TABLE IF EXISTS ONLY public.order_groups DROP CONSTRAINT IF EXISTS order_groups_pkey;
ALTER TABLE IF EXISTS ONLY public.operation_logs DROP CONSTRAINT IF EXISTS operation_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.notifications DROP CONSTRAINT IF EXISTS notifications_pkey;
ALTER TABLE IF EXISTS ONLY public.materials DROP CONSTRAINT IF EXISTS materials_pkey;
ALTER TABLE IF EXISTS ONLY public.mapping_configs DROP CONSTRAINT IF EXISTS mapping_configs_pkey;
ALTER TABLE IF EXISTS ONLY public.lots DROP CONSTRAINT IF EXISTS lots_pkey;
ALTER TABLE IF EXISTS ONLY public.locations DROP CONSTRAINT IF EXISTS locations_pkey;
ALTER TABLE IF EXISTS ONLY public.invoices DROP CONSTRAINT IF EXISTS invoices_pkey;
ALTER TABLE IF EXISTS ONLY public.invoices DROP CONSTRAINT IF EXISTS invoices_invoice_number_unique;
ALTER TABLE IF EXISTS ONLY public.inventory_ledger DROP CONSTRAINT IF EXISTS inventory_ledger_pkey;
ALTER TABLE IF EXISTS ONLY public.inbound_orders DROP CONSTRAINT IF EXISTS inbound_orders_pkey;
ALTER TABLE IF EXISTS ONLY public.inbound_order_lines DROP CONSTRAINT IF EXISTS inbound_order_lines_pkey;
ALTER TABLE IF EXISTS ONLY public.handling_label_types DROP CONSTRAINT IF EXISTS handling_label_types_pkey;
ALTER TABLE IF EXISTS ONLY public.handling_label_types DROP CONSTRAINT IF EXISTS handling_label_types_code_unique;
ALTER TABLE IF EXISTS ONLY public.gift_options DROP CONSTRAINT IF EXISTS gift_options_pkey;
ALTER TABLE IF EXISTS ONLY public.form_templates DROP CONSTRAINT IF EXISTS form_templates_pkey;
ALTER TABLE IF EXISTS ONLY public.feature_flags DROP CONSTRAINT IF EXISTS feature_flags_pkey;
ALTER TABLE IF EXISTS ONLY public.feature_flags DROP CONSTRAINT IF EXISTS feature_flags_name_unique;
ALTER TABLE IF EXISTS ONLY public.fba_shipment_plans DROP CONSTRAINT IF EXISTS fba_shipment_plans_pkey;
ALTER TABLE IF EXISTS ONLY public.fba_boxes DROP CONSTRAINT IF EXISTS fba_boxes_pkey;
ALTER TABLE IF EXISTS ONLY public.exception_reports DROP CONSTRAINT IF EXISTS exception_reports_pkey;
ALTER TABLE IF EXISTS ONLY public.email_templates DROP CONSTRAINT IF EXISTS email_templates_pkey;
ALTER TABLE IF EXISTS ONLY public.daily_reports DROP CONSTRAINT IF EXISTS daily_reports_pkey;
ALTER TABLE IF EXISTS ONLY public.customers DROP CONSTRAINT IF EXISTS customers_pkey;
ALTER TABLE IF EXISTS ONLY public.custom_field_definitions DROP CONSTRAINT IF EXISTS custom_field_definitions_pkey;
ALTER TABLE IF EXISTS ONLY public.country_codes DROP CONSTRAINT IF EXISTS country_codes_pkey;
ALTER TABLE IF EXISTS ONLY public.clients DROP CONSTRAINT IF EXISTS clients_pkey;
ALTER TABLE IF EXISTS ONLY public.carriers DROP CONSTRAINT IF EXISTS carriers_pkey;
ALTER TABLE IF EXISTS ONLY public.carrier_session_caches DROP CONSTRAINT IF EXISTS carrier_session_caches_pkey;
ALTER TABLE IF EXISTS ONLY public.carrier_automation_configs DROP CONSTRAINT IF EXISTS carrier_automation_configs_pkey;
ALTER TABLE IF EXISTS ONLY public.billing_records DROP CONSTRAINT IF EXISTS billing_records_pkey;
ALTER TABLE IF EXISTS ONLY public.auto_processing_rules DROP CONSTRAINT IF EXISTS auto_processing_rules_pkey;
ALTER TABLE IF EXISTS ONLY public.assembly_orders DROP CONSTRAINT IF EXISTS assembly_orders_pkey;
ALTER TABLE IF EXISTS ONLY public.api_logs DROP CONSTRAINT IF EXISTS api_logs_pkey;
DROP TABLE IF EXISTS public.workflows;
DROP TABLE IF EXISTS public.workflow_logs;
DROP TABLE IF EXISTS public.work_charges;
DROP TABLE IF EXISTS public.webhooks;
DROP TABLE IF EXISTS public.webhook_logs;
DROP TABLE IF EXISTS public.waves;
DROP TABLE IF EXISTS public.warehouses;
DROP TABLE IF EXISTS public.warehouse_tasks;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.tenants;
DROP TABLE IF EXISTS public.system_settings;
DROP TABLE IF EXISTS public.suppliers;
DROP TABLE IF EXISTS public.sub_clients;
DROP TABLE IF EXISTS public.stocktaking_orders;
DROP TABLE IF EXISTS public.stocktaking_lines;
DROP TABLE IF EXISTS public.stocktaking_discrepancies;
DROP TABLE IF EXISTS public.stock_quants;
DROP TABLE IF EXISTS public.stock_moves;
DROP TABLE IF EXISTS public.slotting_rules;
DROP TABLE IF EXISTS public.shortage_records;
DROP TABLE IF EXISTS public.shops;
DROP TABLE IF EXISTS public.shipping_rates;
DROP TABLE IF EXISTS public.shipment_orders;
DROP TABLE IF EXISTS public.shipment_order_products;
DROP TABLE IF EXISTS public.shipment_order_materials;
DROP TABLE IF EXISTS public.set_master;
DROP TABLE IF EXISTS public.service_rates;
DROP TABLE IF EXISTS public.scripts;
DROP TABLE IF EXISTS public.rule_definitions;
DROP TABLE IF EXISTS public.rsl_shipment_plans;
DROP TABLE IF EXISTS public.rsl_items;
DROP TABLE IF EXISTS public.return_orders;
DROP TABLE IF EXISTS public.return_order_lines;
DROP TABLE IF EXISTS public.products;
DROP TABLE IF EXISTS public.product_sub_skus;
DROP TABLE IF EXISTS public.print_templates;
DROP TABLE IF EXISTS public.plugins;
DROP TABLE IF EXISTS public.photos;
DROP TABLE IF EXISTS public.passthrough_orders;
DROP TABLE IF EXISTS public.order_source_companies;
DROP TABLE IF EXISTS public.order_groups;
DROP TABLE IF EXISTS public.operation_logs;
DROP TABLE IF EXISTS public.notifications;
DROP TABLE IF EXISTS public.materials;
DROP TABLE IF EXISTS public.mapping_configs;
DROP TABLE IF EXISTS public.lots;
DROP TABLE IF EXISTS public.locations;
DROP TABLE IF EXISTS public.invoices;
DROP TABLE IF EXISTS public.inventory_ledger;
DROP TABLE IF EXISTS public.inbound_orders;
DROP TABLE IF EXISTS public.inbound_order_lines;
DROP TABLE IF EXISTS public.handling_label_types;
DROP TABLE IF EXISTS public.gift_options;
DROP TABLE IF EXISTS public.form_templates;
DROP TABLE IF EXISTS public.feature_flags;
DROP TABLE IF EXISTS public.fba_shipment_plans;
DROP TABLE IF EXISTS public.fba_boxes;
DROP TABLE IF EXISTS public.exception_reports;
DROP TABLE IF EXISTS public.email_templates;
DROP TABLE IF EXISTS public.daily_reports;
DROP TABLE IF EXISTS public.customers;
DROP TABLE IF EXISTS public.custom_field_definitions;
DROP TABLE IF EXISTS public.country_codes;
DROP TABLE IF EXISTS public.clients;
DROP TABLE IF EXISTS public.carriers;
DROP TABLE IF EXISTS public.carrier_session_caches;
DROP TABLE IF EXISTS public.carrier_automation_configs;
DROP TABLE IF EXISTS public.billing_records;
DROP TABLE IF EXISTS public.auto_processing_rules;
DROP TABLE IF EXISTS public.assembly_orders;
DROP TABLE IF EXISTS public.api_logs;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: api_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.api_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    method text NOT NULL,
    path text NOT NULL,
    status_code integer,
    request_body jsonb,
    response_body jsonb,
    user_id uuid,
    ip text,
    user_agent text,
    duration integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.api_logs OWNER TO postgres;

--
-- Name: assembly_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assembly_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    assembly_number text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    set_product_id uuid,
    items jsonb DEFAULT '[]'::jsonb,
    assembled_quantity integer DEFAULT 0 NOT NULL,
    target_quantity integer NOT NULL,
    assigned_to text,
    notes text,
    started_at timestamp without time zone,
    completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.assembly_orders OWNER TO postgres;

--
-- Name: auto_processing_rules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.auto_processing_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    trigger_mode text NOT NULL,
    trigger_events jsonb DEFAULT '[]'::jsonb,
    conditions jsonb DEFAULT '[]'::jsonb NOT NULL,
    actions jsonb DEFAULT '[]'::jsonb NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    allow_rerun boolean DEFAULT false NOT NULL,
    memo text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.auto_processing_rules OWNER TO postgres;

--
-- Name: billing_records; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.billing_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    period text NOT NULL,
    client_id uuid,
    client_name text,
    carrier_id uuid,
    carrier_name text,
    order_count integer DEFAULT 0 NOT NULL,
    total_quantity integer DEFAULT 0 NOT NULL,
    total_shipping_cost numeric DEFAULT '0'::numeric NOT NULL,
    handling_fee numeric DEFAULT '0'::numeric NOT NULL,
    storage_fee numeric DEFAULT '0'::numeric NOT NULL,
    other_fees numeric DEFAULT '0'::numeric NOT NULL,
    total_amount numeric DEFAULT '0'::numeric NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    confirmed_at timestamp without time zone,
    confirmed_by uuid,
    memo text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.billing_records OWNER TO postgres;

--
-- Name: carrier_automation_configs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.carrier_automation_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    carrier_type text NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.carrier_automation_configs OWNER TO postgres;

--
-- Name: carrier_session_caches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.carrier_session_caches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    carrier_type text NOT NULL,
    session_token text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.carrier_session_caches OWNER TO postgres;

--
-- Name: carriers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.carriers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    enabled boolean DEFAULT true NOT NULL,
    tracking_id_column_name text,
    format_definition jsonb DEFAULT '{"columns": []}'::jsonb NOT NULL,
    services jsonb,
    automation_type text,
    is_built_in boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.carriers OWNER TO postgres;

--
-- Name: clients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    name2 text,
    contact_name text,
    contact_email text,
    contact_phone text,
    postal_code text,
    prefecture text,
    city text,
    address text,
    address2 text,
    phone text,
    billing_cycle text,
    credit_tier text,
    is_active boolean DEFAULT true NOT NULL,
    memo text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE public.clients OWNER TO postgres;

--
-- Name: country_codes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.country_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    numeric_code integer NOT NULL,
    alpha2 text NOT NULL,
    alpha3 text NOT NULL,
    name_ja text NOT NULL,
    name_en text NOT NULL,
    region text
);


ALTER TABLE public.country_codes OWNER TO postgres;

--
-- Name: custom_field_definitions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.custom_field_definitions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    entity_type text NOT NULL,
    field_name text NOT NULL,
    field_type text NOT NULL,
    label text NOT NULL,
    label_ja text,
    required boolean DEFAULT false NOT NULL,
    options jsonb,
    default_value text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.custom_field_definitions OWNER TO postgres;

--
-- Name: customers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    client_id uuid,
    code text NOT NULL,
    name text NOT NULL,
    postal_code text,
    prefecture text,
    city text,
    address text,
    phone text,
    email text,
    corporate_number text,
    invoice_registration_number text,
    fax text,
    sns_number text,
    department text,
    contact_person text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.customers OWNER TO postgres;

--
-- Name: daily_reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.daily_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    date timestamp without time zone NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    summary jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.daily_reports OWNER TO postgres;

--
-- Name: email_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.email_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    sender_name text,
    sender_email text,
    subject text NOT NULL,
    body_template text NOT NULL,
    footer_text text,
    carrier_id uuid,
    is_default boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.email_templates OWNER TO postgres;

--
-- Name: exception_reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.exception_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    report_number text NOT NULL,
    reference_type text NOT NULL,
    reference_id uuid,
    client_id uuid,
    client_name text,
    level text NOT NULL,
    category text NOT NULL,
    box_number text,
    sku text,
    affected_quantity integer,
    description text NOT NULL,
    photos jsonb DEFAULT '[]'::jsonb,
    suggested_action text,
    status text DEFAULT 'open'::text NOT NULL,
    reported_by text NOT NULL,
    reported_at timestamp without time zone DEFAULT now() NOT NULL,
    notified_at timestamp without time zone,
    acknowledged_at timestamp without time zone,
    resolved_by text,
    resolved_at timestamp without time zone,
    resolution text,
    sla_deadline timestamp without time zone NOT NULL,
    sla_breached boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.exception_reports OWNER TO postgres;

--
-- Name: fba_boxes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fba_boxes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    shipment_plan_id uuid NOT NULL,
    box_number text NOT NULL,
    weight text,
    dimensions jsonb,
    items jsonb,
    tracking_number text,
    status text DEFAULT 'packing'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.fba_boxes OWNER TO postgres;

--
-- Name: fba_shipment_plans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fba_shipment_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    plan_name text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    amazon_shipment_id text,
    destination_fulfillment_center text,
    ship_to_address jsonb,
    items jsonb,
    notes text,
    confirmed_at timestamp without time zone,
    shipped_at timestamp without time zone,
    completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.fba_shipment_plans OWNER TO postgres;

--
-- Name: feature_flags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.feature_flags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    enabled boolean DEFAULT false NOT NULL,
    config jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.feature_flags OWNER TO postgres;

--
-- Name: form_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.form_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    target_type text NOT NULL,
    columns jsonb DEFAULT '[]'::jsonb,
    styles jsonb DEFAULT '{}'::jsonb,
    is_default boolean DEFAULT false NOT NULL,
    scope text DEFAULT 'tenant'::text NOT NULL,
    client_id uuid,
    parent_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.form_templates OWNER TO postgres;

--
-- Name: gift_options; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.gift_options (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    shipment_order_id uuid NOT NULL,
    gift_type text NOT NULL,
    option_name text,
    option_value text,
    message text,
    price numeric DEFAULT '0'::numeric,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.gift_options OWNER TO postgres;

--
-- Name: handling_label_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.handling_label_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name_ja text NOT NULL,
    name_en text NOT NULL,
    name_zh text NOT NULL,
    icon text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.handling_label_types OWNER TO postgres;

--
-- Name: inbound_order_lines; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inbound_order_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    inbound_order_id uuid NOT NULL,
    product_id uuid,
    product_sku text NOT NULL,
    expected_quantity integer DEFAULT 0 NOT NULL,
    received_quantity integer DEFAULT 0 NOT NULL,
    damaged_quantity integer DEFAULT 0 NOT NULL,
    location_id uuid,
    lot_id uuid,
    unit_price numeric,
    putaway_location_id uuid,
    putaway_quantity integer DEFAULT 0 NOT NULL,
    stock_move_ids jsonb DEFAULT '[]'::jsonb,
    memo text,
    detail_number text,
    handling_category text,
    inbound_type text,
    warehouse_code text,
    warehouse_type text,
    case_quantity integer,
    case_unit_type text,
    case_unit_quantity integer,
    inner_box_quantity integer,
    serial_number text,
    best_before_date timestamp without time zone,
    expiry_date_input text,
    rack_number text,
    hazardous_flag boolean DEFAULT false,
    paid_free_flag text DEFAULT 'free'::text,
    origin_country text,
    air_shipping_prohibited boolean DEFAULT false,
    service_work_type text,
    selling_price text,
    selling_price_unit text,
    purchase_price text,
    purchase_price_unit text,
    tax_type text,
    tax_rate text,
    currency text DEFAULT 'JPY'::text,
    reserve_fields jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.inbound_order_lines OWNER TO postgres;

--
-- Name: inbound_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inbound_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    order_number text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    flow_type text DEFAULT 'standard'::text NOT NULL,
    client_id uuid,
    supplier_id uuid,
    warehouse_id uuid,
    expected_date timestamp without time zone,
    notes text,
    linked_order_ids jsonb DEFAULT '[]'::jsonb,
    fba_info jsonb,
    rsl_info jsonb,
    b2b_info jsonb,
    service_options jsonb DEFAULT '[]'::jsonb,
    is_cod_delivery boolean DEFAULT false,
    is_unplanned boolean DEFAULT false,
    po_number text,
    desired_date timestamp without time zone,
    supplier_name text,
    supplier_phone text,
    supplier_postal_code text,
    supplier_address text,
    completion_flag boolean DEFAULT false,
    completion_date timestamp without time zone,
    import_control_number text,
    import_control_date timestamp without time zone,
    delivery_company text,
    delivery_slip_number text,
    inbound_comment text,
    container_type text,
    total_cbm text,
    total_pallets integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE public.inbound_orders OWNER TO postgres;

--
-- Name: inventory_ledger; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_ledger (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    product_id uuid NOT NULL,
    product_sku text,
    location_id uuid,
    lot_id uuid,
    type text NOT NULL,
    quantity integer NOT NULL,
    reference_type text,
    reference_id text,
    reference_number text,
    reason text,
    executed_by text,
    executed_at timestamp without time zone,
    memo text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.inventory_ledger OWNER TO postgres;

--
-- Name: invoices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    invoice_number text NOT NULL,
    billing_record_id uuid,
    client_id uuid,
    client_name text,
    period text NOT NULL,
    issue_date date NOT NULL,
    subtotal numeric DEFAULT '0'::numeric NOT NULL,
    tax_rate numeric DEFAULT 0.10 NOT NULL,
    tax_amount numeric DEFAULT '0'::numeric NOT NULL,
    total_amount numeric DEFAULT '0'::numeric NOT NULL,
    due_date date NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    line_items jsonb DEFAULT '[]'::jsonb NOT NULL,
    paid_at timestamp without time zone,
    memo text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.invoices OWNER TO postgres;

--
-- Name: locations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    warehouse_id uuid,
    parent_id uuid,
    code text NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    full_path text DEFAULT ''::text,
    cool_type text,
    stock_type text,
    temperature_type text,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0,
    memo text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.locations OWNER TO postgres;

--
-- Name: lots; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    product_id uuid NOT NULL,
    lot_number text NOT NULL,
    expiry_date timestamp without time zone,
    manufacturing_date timestamp without time zone,
    memo text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.lots OWNER TO postgres;

--
-- Name: mapping_configs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mapping_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    config_type text NOT NULL,
    name text NOT NULL,
    description text,
    mappings jsonb DEFAULT '[]'::jsonb NOT NULL,
    order_source_company_name text,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.mapping_configs OWNER TO postgres;

--
-- Name: materials; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.materials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    sku text NOT NULL,
    name text NOT NULL,
    description text,
    unit_cost numeric,
    stock_quantity integer DEFAULT 0,
    category text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.materials OWNER TO postgres;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    body text,
    type text NOT NULL,
    reference_type text,
    reference_id uuid,
    is_read boolean DEFAULT false NOT NULL,
    read_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: operation_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.operation_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    user_id uuid,
    action text NOT NULL,
    resource_type text NOT NULL,
    resource_id text,
    module text,
    changes jsonb,
    metadata jsonb,
    request_id text,
    ip_address text,
    user_agent text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.operation_logs OWNER TO postgres;

--
-- Name: order_groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    priority integer DEFAULT 0,
    enabled boolean DEFAULT true NOT NULL,
    description text,
    sort_criteria jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.order_groups OWNER TO postgres;

--
-- Name: order_source_companies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_source_companies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    sender_name text NOT NULL,
    sender_postal_code text,
    sender_address_prefecture text,
    sender_address_city text,
    sender_address_street text,
    sender_address_building text,
    sender_phone text,
    hatsu_base_no1 text,
    hatsu_base_no2 text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.order_source_companies OWNER TO postgres;

--
-- Name: passthrough_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.passthrough_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    order_number text NOT NULL,
    client_id uuid,
    status text DEFAULT 'draft'::text NOT NULL,
    items jsonb,
    destination_name text,
    destination_postal_code text,
    destination_prefecture text,
    destination_city text,
    destination_address text,
    destination_building text,
    destination_phone text,
    notes text,
    confirmed_at timestamp without time zone,
    received_at timestamp without time zone,
    completed_at timestamp without time zone,
    cancelled_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.passthrough_orders OWNER TO postgres;

--
-- Name: photos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.photos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    filename text NOT NULL,
    original_filename text,
    mime_type text,
    size integer,
    url text NOT NULL,
    thumbnail_url text,
    uploaded_by uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.photos OWNER TO postgres;

--
-- Name: plugins; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.plugins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    version text DEFAULT '1.0.0'::text NOT NULL,
    author text,
    enabled boolean DEFAULT false NOT NULL,
    config jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.plugins OWNER TO postgres;

--
-- Name: print_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.print_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    canvas jsonb,
    elements jsonb DEFAULT '[]'::jsonb,
    paper_size text,
    orientation text,
    reference_image_data text,
    is_default boolean DEFAULT false NOT NULL,
    scope text DEFAULT 'tenant'::text NOT NULL,
    client_id uuid,
    parent_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.print_templates OWNER TO postgres;

--
-- Name: product_sub_skus; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_sub_skus (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    sub_sku text NOT NULL,
    price numeric,
    description text,
    is_active boolean DEFAULT true
);


ALTER TABLE public.product_sub_skus OWNER TO postgres;

--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    sku text NOT NULL,
    name text NOT NULL,
    name_full text,
    name_en text,
    abbreviation text,
    category text DEFAULT '0'::text,
    barcode jsonb DEFAULT '[]'::jsonb,
    jan_code text,
    image_url text,
    memo text,
    enterprise_code text,
    house_code text,
    customer_product_code text,
    brand_code text,
    brand_name text,
    size_code text,
    size_name text,
    color_code text,
    color_name text,
    unit_type text,
    width numeric,
    depth numeric,
    height numeric,
    weight numeric,
    gross_weight numeric,
    volume numeric,
    outer_box_width numeric,
    outer_box_depth numeric,
    outer_box_height numeric,
    outer_box_volume numeric,
    outer_box_weight numeric,
    case_quantity integer,
    price numeric,
    cost_price numeric,
    purchase_price numeric,
    tax_type text,
    tax_category text,
    tax_rate numeric,
    currency text,
    cool_type text,
    product_characteristic text DEFAULT 'normal'::text,
    shipping_size_code text,
    carrier_size_class text,
    mail_calc_enabled boolean DEFAULT false,
    mail_calc_max_quantity integer,
    inventory_enabled boolean DEFAULT false,
    lot_tracking_enabled boolean DEFAULT false,
    expiry_tracking_enabled boolean DEFAULT false,
    serial_tracking_enabled boolean DEFAULT false,
    alert_days_before_expiry integer DEFAULT 30,
    inbound_expiry_days integer,
    safety_stock integer DEFAULT 0,
    appropriate_stock integer,
    allocation_rule text DEFAULT 'FIFO'::text,
    supplier_code text,
    supplier_name text,
    fnsku text,
    asin text,
    amazon_sku text,
    fba_enabled boolean DEFAULT false,
    rakuten_sku text,
    rsl_enabled boolean DEFAULT false,
    ec_channel_codes jsonb DEFAULT '{}'::jsonb,
    marketplace_codes jsonb DEFAULT '{}'::jsonb,
    b2b_customer_codes jsonb DEFAULT '[]'::jsonb,
    wholesale_partner_codes jsonb DEFAULT '{}'::jsonb,
    hazardous_type text DEFAULT '0'::text,
    air_transport_ban boolean DEFAULT false,
    air_prohibited boolean DEFAULT false,
    barcode_commission boolean DEFAULT false,
    barcode_outsourced boolean DEFAULT false,
    reservation_target boolean DEFAULT false,
    paid_type text DEFAULT '0'::text,
    country_of_origin text,
    origin_country_code text,
    handling_types jsonb DEFAULT '[]'::jsonb,
    default_handling_tags jsonb DEFAULT '[]'::jsonb,
    remarks jsonb DEFAULT '[]'::jsonb,
    custom_fields jsonb DEFAULT '{}'::jsonb,
    inspection_lot boolean DEFAULT false,
    inspection_expiry boolean DEFAULT false,
    inspection_reference boolean DEFAULT false,
    set_product_flag text DEFAULT 'single'::text,
    inner_count integer,
    case_dimension_l numeric,
    case_dimension_w numeric,
    case_dimension_h numeric,
    case_weight numeric,
    case_volume numeric,
    wh_preferred_location text,
    wh_handling_notes text,
    wh_is_fragile boolean DEFAULT false,
    wh_is_liquid boolean DEFAULT false,
    wh_requires_opp_bag boolean DEFAULT false,
    wh_storage_type text,
    size_assessment_status text DEFAULT 'pending'::text,
    customer_customer_codes jsonb DEFAULT '{}'::jsonb,
    client_id uuid,
    sub_client_id uuid,
    shop_id uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE public.products OWNER TO postgres;

--
-- Name: return_order_lines; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.return_order_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    return_order_id uuid NOT NULL,
    product_id uuid,
    product_sku text NOT NULL,
    quantity integer DEFAULT 0 NOT NULL,
    inspected_quantity integer DEFAULT 0 NOT NULL,
    disposition text DEFAULT 'pending'::text NOT NULL,
    restocked_quantity integer DEFAULT 0 NOT NULL,
    disposed_quantity integer DEFAULT 0 NOT NULL,
    location_id uuid,
    lot_id uuid,
    inspection_notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.return_order_lines OWNER TO postgres;

--
-- Name: return_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.return_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    order_number text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    return_reason text NOT NULL,
    rma_number text,
    return_tracking_id text,
    shipment_order_id uuid,
    client_id uuid,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE public.return_orders OWNER TO postgres;

--
-- Name: rsl_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rsl_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    shipment_plan_id uuid NOT NULL,
    product_id uuid,
    sku text NOT NULL,
    quantity integer NOT NULL,
    processed_quantity integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.rsl_items OWNER TO postgres;

--
-- Name: rsl_shipment_plans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rsl_shipment_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    plan_name text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    rsl_order_id text,
    items jsonb,
    notes text,
    confirmed_at timestamp without time zone,
    shipped_at timestamp without time zone,
    completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.rsl_shipment_plans OWNER TO postgres;

--
-- Name: rule_definitions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rule_definitions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    module text NOT NULL,
    warehouse_id uuid,
    client_id uuid,
    priority integer DEFAULT 0 NOT NULL,
    condition_groups jsonb DEFAULT '[]'::jsonb NOT NULL,
    actions jsonb DEFAULT '[]'::jsonb NOT NULL,
    stop_on_match boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    valid_from timestamp without time zone,
    valid_to timestamp without time zone,
    execution_count integer DEFAULT 0 NOT NULL,
    last_executed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.rule_definitions OWNER TO postgres;

--
-- Name: scripts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.scripts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    language text DEFAULT 'javascript'::text NOT NULL,
    code text DEFAULT ''::text NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    trigger_event text,
    last_run_at timestamp without time zone,
    last_run_status text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.scripts OWNER TO postgres;

--
-- Name: service_rates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.service_rates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    charge_type text NOT NULL,
    unit text DEFAULT 'per_item'::text NOT NULL,
    unit_price numeric DEFAULT '0'::numeric NOT NULL,
    client_id uuid,
    client_name text,
    conditions jsonb,
    valid_from timestamp without time zone,
    valid_to timestamp without time zone,
    is_active boolean DEFAULT true NOT NULL,
    memo text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.service_rates OWNER TO postgres;

--
-- Name: set_master; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.set_master (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    set_product_id uuid NOT NULL,
    component_product_id uuid NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    sort_order integer DEFAULT 0,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.set_master OWNER TO postgres;

--
-- Name: shipment_order_materials; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shipment_order_materials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    shipment_order_id uuid NOT NULL,
    material_sku text NOT NULL,
    material_name text,
    quantity integer NOT NULL,
    unit_cost numeric,
    total_cost numeric,
    auto boolean DEFAULT false
);


ALTER TABLE public.shipment_order_materials OWNER TO postgres;

--
-- Name: shipment_order_products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shipment_order_products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    shipment_order_id uuid NOT NULL,
    input_sku text NOT NULL,
    quantity integer NOT NULL,
    product_id uuid,
    product_sku text,
    product_name text,
    unit_price numeric,
    subtotal numeric,
    cool_type text,
    barcode jsonb DEFAULT '[]'::jsonb,
    image_url text,
    matched_sub_sku jsonb,
    mail_calc_enabled boolean,
    mail_calc_max_quantity integer
);


ALTER TABLE public.shipment_order_products OWNER TO postgres;

--
-- Name: shipment_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shipment_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    order_number text NOT NULL,
    destination_type text DEFAULT 'B2C'::text,
    fba_shipment_id text,
    fba_destination text,
    carrier_id text,
    tracking_id text,
    customer_management_number text,
    status_confirmed boolean DEFAULT false NOT NULL,
    status_confirmed_at timestamp without time zone,
    status_carrier_received boolean DEFAULT false NOT NULL,
    status_carrier_received_at timestamp without time zone,
    status_printed boolean DEFAULT false NOT NULL,
    status_printed_at timestamp without time zone,
    status_inspected boolean DEFAULT false NOT NULL,
    status_inspected_at timestamp without time zone,
    status_shipped boolean DEFAULT false NOT NULL,
    status_shipped_at timestamp without time zone,
    status_ec_exported boolean DEFAULT false NOT NULL,
    status_ec_exported_at timestamp without time zone,
    status_held boolean DEFAULT false NOT NULL,
    status_held_at timestamp without time zone,
    recipient_postal_code text,
    recipient_prefecture text,
    recipient_city text,
    recipient_street text,
    recipient_building text,
    recipient_name text,
    recipient_phone text,
    honorific text DEFAULT '様'::text,
    sender_postal_code text,
    sender_prefecture text,
    sender_city text,
    sender_street text,
    sender_building text,
    sender_name text,
    sender_phone text,
    orderer_postal_code text,
    orderer_prefecture text,
    orderer_city text,
    orderer_street text,
    orderer_building text,
    orderer_name text,
    orderer_phone text,
    ship_plan_date text,
    invoice_type text,
    cool_type text,
    delivery_time_slot text,
    delivery_date_preference text,
    source_order_at timestamp without time zone,
    carrier_data jsonb,
    cost_summary jsonb,
    shipping_cost numeric,
    shipping_cost_breakdown jsonb,
    cost_source text,
    cost_calculated_at timestamp without time zone,
    handling_tags jsonb DEFAULT '[]'::jsonb,
    custom_fields jsonb DEFAULT '{}'::jsonb,
    _products_meta jsonb,
    source_raw_rows jsonb,
    carrier_raw_row jsonb,
    internal_record jsonb,
    order_group_id uuid,
    order_source_company_id uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE public.shipment_orders OWNER TO postgres;

--
-- Name: shipping_rates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shipping_rates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    carrier_id uuid NOT NULL,
    carrier_name text,
    name text NOT NULL,
    size_type text DEFAULT 'flat'::text NOT NULL,
    size_min numeric,
    size_max numeric,
    from_prefectures jsonb,
    to_prefectures jsonb,
    base_price numeric DEFAULT '0'::numeric NOT NULL,
    cool_surcharge numeric DEFAULT '0'::numeric NOT NULL,
    cod_surcharge numeric DEFAULT '0'::numeric NOT NULL,
    fuel_surcharge numeric DEFAULT '0'::numeric NOT NULL,
    valid_from timestamp without time zone,
    valid_to timestamp without time zone,
    is_active boolean DEFAULT true NOT NULL,
    memo text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.shipping_rates OWNER TO postgres;

--
-- Name: shops; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shops (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    client_id uuid NOT NULL,
    sub_client_id uuid,
    code text NOT NULL,
    name text NOT NULL,
    platform text,
    platform_shop_id text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.shops OWNER TO postgres;

--
-- Name: shortage_records; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shortage_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    shipment_order_id uuid NOT NULL,
    product_id uuid NOT NULL,
    requested_quantity integer NOT NULL,
    available_quantity integer NOT NULL,
    shortage_quantity integer NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    reserved_at timestamp without time zone,
    fulfilled_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.shortage_records OWNER TO postgres;

--
-- Name: slotting_rules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.slotting_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    priority integer DEFAULT 0 NOT NULL,
    conditions jsonb,
    actions jsonb,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.slotting_rules OWNER TO postgres;

--
-- Name: stock_moves; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_moves (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    move_number text NOT NULL,
    move_type text NOT NULL,
    status text DEFAULT 'draft'::text,
    product_id uuid NOT NULL,
    product_sku text,
    from_location_id uuid,
    to_location_id uuid,
    lot_id uuid,
    quantity integer NOT NULL,
    reference_type text,
    reference_id uuid,
    reference_number text,
    reason text,
    executed_by text,
    executed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.stock_moves OWNER TO postgres;

--
-- Name: stock_quants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_quants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    product_id uuid NOT NULL,
    location_id uuid NOT NULL,
    lot_id uuid,
    quantity integer DEFAULT 0 NOT NULL,
    reserved_quantity integer DEFAULT 0 NOT NULL,
    last_moved_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.stock_quants OWNER TO postgres;

--
-- Name: stocktaking_discrepancies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stocktaking_discrepancies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    stocktaking_order_id uuid NOT NULL,
    product_id uuid NOT NULL,
    location_id uuid NOT NULL,
    system_quantity integer NOT NULL,
    counted_quantity integer NOT NULL,
    discrepancy integer NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    adjusted_by uuid,
    adjusted_at timestamp without time zone,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.stocktaking_discrepancies OWNER TO postgres;

--
-- Name: stocktaking_lines; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stocktaking_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    stocktaking_order_id uuid NOT NULL,
    product_id uuid NOT NULL,
    location_id uuid,
    count_round integer DEFAULT 1 NOT NULL,
    system_quantity integer DEFAULT 0 NOT NULL,
    counted_quantity integer,
    discrepancy integer,
    previous_count integer,
    warehouse_code text,
    warehouse_type text,
    result_mark text,
    lot_id uuid,
    expiry_date timestamp without time zone,
    best_before_date timestamp without time zone,
    serial_number text,
    last_updated_by uuid,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.stocktaking_lines OWNER TO postgres;

--
-- Name: stocktaking_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stocktaking_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    order_number text NOT NULL,
    type text NOT NULL,
    status text DEFAULT 'draft'::text,
    warehouse_id uuid NOT NULL,
    location_ids jsonb DEFAULT '[]'::jsonb,
    product_ids jsonb DEFAULT '[]'::jsonb,
    scheduled_date timestamp without time zone,
    completed_at timestamp without time zone,
    memo text,
    items jsonb DEFAULT '[]'::jsonb,
    title text,
    client_id uuid,
    stocktaking_category text DEFAULT 'full'::text,
    location_from text,
    location_to text,
    instruction_date timestamp without time zone,
    discrepancy_category text,
    total_slots integer DEFAULT 0,
    completed_slots integer DEFAULT 0,
    theoretical_item_count integer DEFAULT 0,
    actual_item_count integer DEFAULT 0,
    theoretical_piece_count integer DEFAULT 0,
    actual_piece_count integer DEFAULT 0,
    judgment text,
    confirmed_at timestamp without time zone,
    customer_notification_date timestamp without time zone,
    customer_notifier text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE public.stocktaking_orders OWNER TO postgres;

--
-- Name: sub_clients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sub_clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    client_id uuid NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.sub_clients OWNER TO postgres;

--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.suppliers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    contact_name text,
    contact_phone text,
    contact_email text,
    address text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.suppliers OWNER TO postgres;

--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    settings_key text NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.system_settings OWNER TO postgres;

--
-- Name: tenants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tenants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    plan text DEFAULT 'free'::text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.tenants OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    email text NOT NULL,
    display_name text,
    role text DEFAULT 'viewer'::text NOT NULL,
    warehouse_ids jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true NOT NULL,
    last_login_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: warehouse_tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.warehouse_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    task_number text NOT NULL,
    type text NOT NULL,
    status text DEFAULT 'pending'::text,
    warehouse_id uuid NOT NULL,
    order_id uuid,
    wave_id uuid,
    assignee_id uuid,
    assignee_name text,
    priority integer DEFAULT 0,
    items jsonb DEFAULT '[]'::jsonb,
    completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.warehouse_tasks OWNER TO postgres;

--
-- Name: warehouses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.warehouses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    name2 text,
    postal_code text,
    prefecture text,
    city text,
    address text,
    address2 text,
    phone text,
    cool_types jsonb DEFAULT '[]'::jsonb,
    capacity integer,
    operating_hours text,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0,
    memo text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.warehouses OWNER TO postgres;

--
-- Name: waves; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.waves (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    wave_number text NOT NULL,
    warehouse_id uuid NOT NULL,
    status text DEFAULT 'pending'::text,
    priority integer DEFAULT 0,
    shipment_ids jsonb DEFAULT '[]'::jsonb,
    assigned_to uuid,
    assigned_name text,
    total_orders integer DEFAULT 0,
    total_items integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.waves OWNER TO postgres;

--
-- Name: webhook_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.webhook_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    webhook_id uuid NOT NULL,
    event text NOT NULL,
    url text NOT NULL,
    http_status integer,
    response_time_ms integer,
    success boolean NOT NULL,
    error text,
    payload jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.webhook_logs OWNER TO postgres;

--
-- Name: webhooks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.webhooks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    url text NOT NULL,
    secret text,
    events jsonb DEFAULT '[]'::jsonb NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.webhooks OWNER TO postgres;

--
-- Name: work_charges; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.work_charges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    charge_type text NOT NULL,
    charge_date date NOT NULL,
    reference_type text DEFAULT 'manual'::text NOT NULL,
    reference_id uuid,
    reference_number text,
    client_id uuid,
    client_name text,
    sub_client_id uuid,
    sub_client_name text,
    shop_id uuid,
    shop_name text,
    quantity integer DEFAULT 1 NOT NULL,
    unit_price numeric DEFAULT '0'::numeric NOT NULL,
    amount numeric DEFAULT '0'::numeric NOT NULL,
    description text NOT NULL,
    billing_period text,
    billing_record_id uuid,
    is_billed boolean DEFAULT false NOT NULL,
    memo text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.work_charges OWNER TO postgres;

--
-- Name: workflow_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.workflow_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    workflow_id uuid NOT NULL,
    status text NOT NULL,
    trigger_data jsonb,
    result jsonb,
    error text,
    started_at timestamp without time zone,
    completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.workflow_logs OWNER TO postgres;

--
-- Name: workflows; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.workflows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    trigger_type text NOT NULL,
    trigger_config jsonb,
    actions jsonb,
    enabled boolean DEFAULT true NOT NULL,
    last_run_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.workflows OWNER TO postgres;

--
-- Data for Name: api_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.api_logs (id, tenant_id, method, path, status_code, request_body, response_body, user_id, ip, user_agent, duration, created_at) FROM stdin;
\.


--
-- Data for Name: assembly_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.assembly_orders (id, tenant_id, assembly_number, status, set_product_id, items, assembled_quantity, target_quantity, assigned_to, notes, started_at, completed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: auto_processing_rules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.auto_processing_rules (id, tenant_id, name, enabled, trigger_mode, trigger_events, conditions, actions, priority, allow_rerun, memo, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: billing_records; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.billing_records (id, tenant_id, period, client_id, client_name, carrier_id, carrier_name, order_count, total_quantity, total_shipping_cost, handling_fee, storage_fee, other_fees, total_amount, status, confirmed_at, confirmed_by, memo, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: carrier_automation_configs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.carrier_automation_configs (id, tenant_id, carrier_type, enabled, config, created_at, updated_at) FROM stdin;
b5749320-168b-4c22-9b0a-19c531cf06b2	00000000-0000-0000-0000-000000000001	yamato-b2	f	{"apiUrl": "", "loginId": "", "password": ""}	2026-03-22 16:47:49.017632	2026-03-22 16:47:49.017632
\.


--
-- Data for Name: carrier_session_caches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.carrier_session_caches (id, tenant_id, carrier_type, session_token, expires_at, created_at) FROM stdin;
\.


--
-- Data for Name: carriers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.carriers (id, tenant_id, code, name, description, enabled, tracking_id_column_name, format_definition, services, automation_type, is_built_in, sort_order, created_at, updated_at) FROM stdin;
50000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	yamato	ヤマト運輸	ヤマト運輸 宅急便 / 大和运输 宅急便	t	\N	{"columns": []}	\N	yamato-b2	t	1	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
50000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	sagawa	佐川急便	佐川急便 飛脚宅配便 / 佐川急便 飞脚宅配便	t	\N	{"columns": []}	\N	sagawa-api	t	2	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
50000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	japanpost	日本郵便	日本郵便 ゆうパック / 日本邮政 邮包	t	\N	{"columns": []}	\N	\N	t	3	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
50000000-0000-0000-0000-000000000004	00000000-0000-0000-0000-000000000001	seino	西濃運輸	西濃運輸 カンガルー便 / 西浓运输 袋鼠便	t	\N	{"columns": []}	\N	seino-api	t	4	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
\.


--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.clients (id, tenant_id, code, name, name2, contact_name, contact_email, contact_phone, postal_code, prefecture, city, address, address2, phone, billing_cycle, credit_tier, is_active, memo, created_at, updated_at, deleted_at) FROM stdin;
40000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	CL-002	合同会社フードデリバリー	\N	鈴木 一郎	suzuki@food-delivery.jp	06-3333-4444	530-0001	大阪府	大阪市北区	梅田2-5-10 フードタワー3F	\N	06-3333-4444	monthly	B	t	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263	\N
40000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	CL-003	有限会社テックガジェット	\N	佐藤 大輔	sato@tech-gadget.co.jp	460-0008	460-0008	愛知県	名古屋市中区	栄3-15-27 テックプラザ8F	\N	052-5555-6666	biweekly	A	t	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263	\N
40000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	CL-001	株式会社サクラコスメ		田中 美香	tanaka@sakura-cosme.co.jp	03-1111-2222	150-0001	東京都	渋谷区	神宮前1-2-3 サクラビル5F		03-1111-2222	monthly	A	t		2026-03-22 15:39:42.406263	2026-03-22 17:35:37.604	\N
\.


--
-- Data for Name: country_codes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.country_codes (id, numeric_code, alpha2, alpha3, name_ja, name_en, region) FROM stdin;
\.


--
-- Data for Name: custom_field_definitions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.custom_field_definitions (id, tenant_id, entity_type, field_name, field_type, label, label_ja, required, options, default_value, sort_order, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.customers (id, tenant_id, client_id, code, name, postal_code, prefecture, city, address, phone, email, corporate_number, invoice_registration_number, fax, sns_number, department, contact_person, created_at, updated_at) FROM stdin;
a0000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	40000000-0000-0000-0000-000000000001	CUST-001	山田 太郎	160-0022	東京都	新宿区	新宿3-14-1	090-1111-2222	yamada@example.com	\N	\N	\N	\N	\N	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
a0000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	40000000-0000-0000-0000-000000000001	CUST-002	高橋 花子	530-0001	大阪府	大阪市北区	梅田1-1-1	080-3333-4444	takahashi@example.com	\N	\N	\N	\N	\N	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
a0000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	40000000-0000-0000-0000-000000000002	CUST-003	伊藤 次郎	150-0001	東京都	渋谷区	神宮前5-6-7	070-5555-6666	ito@example.com	\N	\N	\N	\N	\N	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
a0000000-0000-0000-0000-000000000004	00000000-0000-0000-0000-000000000001	40000000-0000-0000-0000-000000000003	CUST-004	株式会社東北電子	980-0021	宮城県	仙台市青葉区	中央1-3-1	022-3333-4444	info@tohoku-denshi.co.jp	\N	\N	\N	\N	\N	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
a0000000-0000-0000-0000-000000000005	00000000-0000-0000-0000-000000000001	40000000-0000-0000-0000-000000000002	CUST-005	北野 雪子	060-0042	北海道	札幌市中央区	大通西3-6	011-5555-6666	kitano@example.com	\N	\N	\N	\N	\N	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
\.


--
-- Data for Name: daily_reports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.daily_reports (id, tenant_id, date, status, summary, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: email_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.email_templates (id, tenant_id, name, sender_name, sender_email, subject, body_template, footer_text, carrier_id, is_default, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: exception_reports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.exception_reports (id, tenant_id, report_number, reference_type, reference_id, client_id, client_name, level, category, box_number, sku, affected_quantity, description, photos, suggested_action, status, reported_by, reported_at, notified_at, acknowledged_at, resolved_by, resolved_at, resolution, sla_deadline, sla_breached, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: fba_boxes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fba_boxes (id, tenant_id, shipment_plan_id, box_number, weight, dimensions, items, tracking_number, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: fba_shipment_plans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fba_shipment_plans (id, tenant_id, plan_name, status, amazon_shipment_id, destination_fulfillment_center, ship_to_address, items, notes, confirmed_at, shipped_at, completed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: feature_flags; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.feature_flags (id, name, description, enabled, config, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: form_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.form_templates (id, tenant_id, name, target_type, columns, styles, is_default, scope, client_id, parent_id, is_active, version, description, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: gift_options; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.gift_options (id, tenant_id, shipment_order_id, gift_type, option_name, option_value, message, price, created_at) FROM stdin;
\.


--
-- Data for Name: handling_label_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.handling_label_types (id, code, name_ja, name_en, name_zh, icon, sort_order, is_active) FROM stdin;
\.


--
-- Data for Name: inbound_order_lines; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inbound_order_lines (id, tenant_id, inbound_order_id, product_id, product_sku, expected_quantity, received_quantity, damaged_quantity, location_id, lot_id, unit_price, putaway_location_id, putaway_quantity, stock_move_ids, memo, detail_number, handling_category, inbound_type, warehouse_code, warehouse_type, case_quantity, case_unit_type, case_unit_quantity, inner_box_quantity, serial_number, best_before_date, expiry_date_input, rack_number, hazardous_flag, paid_free_flag, origin_country, air_shipping_prohibited, service_work_type, selling_price, selling_price_unit, purchase_price, purchase_price_unit, tax_type, tax_rate, currency, reserve_fields, created_at, updated_at) FROM stdin;
91000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	90000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000001	SKU-COS-001	200	0	0	\N	\N	\N	\N	0	[]	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	free	\N	f	\N	\N	\N	\N	\N	\N	\N	JPY	{}	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
91000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	90000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000002	SKU-COS-002	100	0	0	\N	\N	\N	\N	0	[]	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	free	\N	f	\N	\N	\N	\N	\N	\N	\N	JPY	{}	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
91000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	90000000-0000-0000-0000-000000000002	60000000-0000-0000-0000-000000000009	SKU-FD-002	50	0	0	\N	\N	\N	\N	0	[]	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	free	\N	f	\N	\N	\N	\N	\N	\N	\N	JPY	{}	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
91000000-0000-0000-0000-000000000004	00000000-0000-0000-0000-000000000001	90000000-0000-0000-0000-000000000002	60000000-0000-0000-0000-000000000010	SKU-FD-003	80	0	0	\N	\N	\N	\N	0	[]	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	free	\N	f	\N	\N	\N	\N	\N	\N	\N	JPY	{}	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
91000000-0000-0000-0000-000000000005	00000000-0000-0000-0000-000000000001	90000000-0000-0000-0000-000000000002	60000000-0000-0000-0000-000000000014	SKU-FD-007	40	0	0	\N	\N	\N	\N	0	[]	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	free	\N	f	\N	\N	\N	\N	\N	\N	\N	JPY	{}	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
91000000-0000-0000-0000-000000000006	00000000-0000-0000-0000-000000000001	90000000-0000-0000-0000-000000000003	60000000-0000-0000-0000-000000000015	SKU-TG-001	100	0	0	\N	\N	\N	\N	0	[]	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	free	\N	f	\N	\N	\N	\N	\N	\N	\N	JPY	{}	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
91000000-0000-0000-0000-000000000007	00000000-0000-0000-0000-000000000001	90000000-0000-0000-0000-000000000003	60000000-0000-0000-0000-000000000016	SKU-TG-002	50	0	0	\N	\N	\N	\N	0	[]	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	free	\N	f	\N	\N	\N	\N	\N	\N	\N	JPY	{}	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
91000000-0000-0000-0000-000000000008	00000000-0000-0000-0000-000000000001	90000000-0000-0000-0000-000000000004	60000000-0000-0000-0000-000000000005	SKU-COS-005	500	320	0	\N	\N	\N	\N	0	[]	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	free	\N	f	\N	\N	\N	\N	\N	\N	\N	JPY	{}	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
91000000-0000-0000-0000-000000000009	00000000-0000-0000-0000-000000000001	90000000-0000-0000-0000-000000000004	60000000-0000-0000-0000-000000000004	SKU-COS-004	200	150	0	\N	\N	\N	\N	0	[]	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	free	\N	f	\N	\N	\N	\N	\N	\N	\N	JPY	{}	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
91000000-0000-0000-0000-000000000010	00000000-0000-0000-0000-000000000001	90000000-0000-0000-0000-000000000005	60000000-0000-0000-0000-000000000013	SKU-FD-006	100	100	0	\N	\N	\N	\N	0	[]	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	free	\N	f	\N	\N	\N	\N	\N	\N	\N	JPY	{}	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
\.


--
-- Data for Name: inbound_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inbound_orders (id, tenant_id, order_number, status, flow_type, client_id, supplier_id, warehouse_id, expected_date, notes, linked_order_ids, fba_info, rsl_info, b2b_info, service_options, is_cod_delivery, is_unplanned, po_number, desired_date, supplier_name, supplier_phone, supplier_postal_code, supplier_address, completion_flag, completion_date, import_control_number, import_control_date, delivery_company, delivery_slip_number, inbound_comment, container_type, total_cbm, total_pallets, created_at, updated_at, deleted_at) FROM stdin;
90000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	IN-2026-0001	draft	standard	40000000-0000-0000-0000-000000000001	\N	20000000-0000-0000-0000-000000000001	2026-03-28 00:00:00	化粧品3月追加発注分 / 化妆品3月追加订单	[]	\N	\N	\N	[]	f	f	\N	\N	株式会社コスメ工場	048-1234-5678	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	0	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263	\N
90000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	IN-2026-0002	confirmed	standard	40000000-0000-0000-0000-000000000002	\N	20000000-0000-0000-0000-000000000001	2026-03-26 00:00:00	冷蔵・冷凍食品定期入荷 / 冷藏冷冻食品定期到货	[]	\N	\N	\N	[]	f	f	\N	\N	北海道食品株式会社	011-9876-5432	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	0	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263	\N
90000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	IN-2026-0003	arrived	standard	40000000-0000-0000-0000-000000000003	\N	20000000-0000-0000-0000-000000000001	2026-03-23 00:00:00	ガジェット新商品入荷 / 电子产品新品到货	[]	\N	\N	\N	[]	f	f	\N	\N	深圳テック株式会社	03-5555-6666	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	0	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263	\N
90000000-0000-0000-0000-000000000004	00000000-0000-0000-0000-000000000001	IN-2026-0004	receiving	standard	40000000-0000-0000-0000-000000000001	\N	20000000-0000-0000-0000-000000000002	2026-03-22 00:00:00	大阪倉庫向け補充 / 大阪仓库补货	[]	\N	\N	\N	[]	f	f	\N	\N	株式会社コスメ工場	048-1234-5678	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	0	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263	\N
90000000-0000-0000-0000-000000000005	00000000-0000-0000-0000-000000000001	IN-2026-0005	done	standard	40000000-0000-0000-0000-000000000002	\N	20000000-0000-0000-0000-000000000001	2026-03-20 00:00:00	国産はちみつ追加入荷 / 国产蜂蜜追加到货	[]	\N	\N	\N	[]	f	f	\N	\N	鹿児島農産物直売所	099-1111-2222	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	0	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263	\N
\.


--
-- Data for Name: inventory_ledger; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventory_ledger (id, tenant_id, product_id, product_sku, location_id, lot_id, type, quantity, reference_type, reference_id, reference_number, reason, executed_by, executed_at, memo, created_at) FROM stdin;
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invoices (id, tenant_id, invoice_number, billing_record_id, client_id, client_name, period, issue_date, subtotal, tax_rate, tax_amount, total_amount, due_date, status, line_items, paid_at, memo, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: locations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.locations (id, tenant_id, warehouse_id, parent_id, code, name, type, full_path, cool_type, stock_type, temperature_type, is_active, sort_order, memo, created_at, updated_at) FROM stdin;
30000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	20000000-0000-0000-0000-000000000001	\N	TKY-RCV	東京入荷場	receiving	TKY/RCV	0	01	\N	t	1	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
30000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	20000000-0000-0000-0000-000000000001	\N	TKY-SHP	東京出荷場	staging	TKY/SHP	0	01	\N	t	2	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
30000000-0000-0000-0000-000000000011	00000000-0000-0000-0000-000000000001	20000000-0000-0000-0000-000000000001	\N	TKY-A-1-1	棚 A-1-1	bin	TKY/A/1/1	0	01	\N	t	10	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
30000000-0000-0000-0000-000000000012	00000000-0000-0000-0000-000000000001	20000000-0000-0000-0000-000000000001	\N	TKY-A-1-2	棚 A-1-2	bin	TKY/A/1/2	0	01	\N	t	11	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
30000000-0000-0000-0000-000000000013	00000000-0000-0000-0000-000000000001	20000000-0000-0000-0000-000000000001	\N	TKY-A-1-3	棚 A-1-3	bin	TKY/A/1/3	0	01	\N	t	12	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
30000000-0000-0000-0000-000000000014	00000000-0000-0000-0000-000000000001	20000000-0000-0000-0000-000000000001	\N	TKY-A-1-4	棚 A-1-4	bin	TKY/A/1/4	0	01	\N	t	13	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
30000000-0000-0000-0000-000000000015	00000000-0000-0000-0000-000000000001	20000000-0000-0000-0000-000000000001	\N	TKY-A-1-5	棚 A-1-5	bin	TKY/A/1/5	0	01	\N	t	14	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
30000000-0000-0000-0000-000000000021	00000000-0000-0000-0000-000000000001	20000000-0000-0000-0000-000000000001	\N	TKY-A-2-1	棚 A-2-1	bin	TKY/A/2/1	0	01	\N	t	20	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
30000000-0000-0000-0000-000000000022	00000000-0000-0000-0000-000000000001	20000000-0000-0000-0000-000000000001	\N	TKY-A-2-2	棚 A-2-2	bin	TKY/A/2/2	0	01	\N	t	21	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
30000000-0000-0000-0000-000000000023	00000000-0000-0000-0000-000000000001	20000000-0000-0000-0000-000000000001	\N	TKY-A-2-3	棚 A-2-3	bin	TKY/A/2/3	0	01	\N	t	22	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
30000000-0000-0000-0000-000000000024	00000000-0000-0000-0000-000000000001	20000000-0000-0000-0000-000000000001	\N	TKY-A-2-4	棚 A-2-4	bin	TKY/A/2/4	0	01	\N	t	23	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
30000000-0000-0000-0000-000000000025	00000000-0000-0000-0000-000000000001	20000000-0000-0000-0000-000000000001	\N	TKY-A-2-5	棚 A-2-5	bin	TKY/A/2/5	0	01	\N	t	24	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
30000000-0000-0000-0000-000000000031	00000000-0000-0000-0000-000000000001	20000000-0000-0000-0000-000000000001	\N	TKY-A-3-1	棚 A-3-1	bin	TKY/A/3/1	0	01	\N	t	30	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
30000000-0000-0000-0000-000000000032	00000000-0000-0000-0000-000000000001	20000000-0000-0000-0000-000000000001	\N	TKY-A-3-2	棚 A-3-2	bin	TKY/A/3/2	0	01	\N	t	31	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
30000000-0000-0000-0000-000000000033	00000000-0000-0000-0000-000000000001	20000000-0000-0000-0000-000000000001	\N	TKY-A-3-3	棚 A-3-3	bin	TKY/A/3/3	0	01	\N	t	32	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
30000000-0000-0000-0000-000000000034	00000000-0000-0000-0000-000000000001	20000000-0000-0000-0000-000000000001	\N	TKY-A-3-4	棚 A-3-4	bin	TKY/A/3/4	0	01	\N	t	33	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
30000000-0000-0000-0000-000000000035	00000000-0000-0000-0000-000000000001	20000000-0000-0000-0000-000000000001	\N	TKY-A-3-5	棚 A-3-5	bin	TKY/A/3/5	0	01	\N	t	34	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
30000000-0000-0000-0000-000000000041	00000000-0000-0000-0000-000000000001	20000000-0000-0000-0000-000000000001	\N	TKY-C-1-1	冷蔵棚 C-1-1	bin	TKY/C/1/1	1	01	\N	t	40	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
30000000-0000-0000-0000-000000000042	00000000-0000-0000-0000-000000000001	20000000-0000-0000-0000-000000000001	\N	TKY-C-1-2	冷蔵棚 C-1-2	bin	TKY/C/1/2	1	01	\N	t	41	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
30000000-0000-0000-0000-000000000051	00000000-0000-0000-0000-000000000001	20000000-0000-0000-0000-000000000001	\N	TKY-F-1-1	冷凍棚 F-1-1	bin	TKY/F/1/1	2	01	\N	t	50	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
30000000-0000-0000-0000-000000000052	00000000-0000-0000-0000-000000000001	20000000-0000-0000-0000-000000000001	\N	TKY-F-1-2	冷凍棚 F-1-2	bin	TKY/F/1/2	2	01	\N	t	51	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
30000000-0000-0000-0000-000000000101	00000000-0000-0000-0000-000000000001	20000000-0000-0000-0000-000000000002	\N	OSK-RCV	大阪入荷場	receiving	OSK/RCV	0	01	\N	t	1	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
30000000-0000-0000-0000-000000000102	00000000-0000-0000-0000-000000000001	20000000-0000-0000-0000-000000000002	\N	OSK-SHP	大阪出荷場	staging	OSK/SHP	0	01	\N	t	2	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
30000000-0000-0000-0000-000000000111	00000000-0000-0000-0000-000000000001	20000000-0000-0000-0000-000000000002	\N	OSK-B-1-1	棚 B-1-1	bin	OSK/B/1/1	0	01	\N	t	10	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
30000000-0000-0000-0000-000000000112	00000000-0000-0000-0000-000000000001	20000000-0000-0000-0000-000000000002	\N	OSK-B-1-2	棚 B-1-2	bin	OSK/B/1/2	0	01	\N	t	11	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
30000000-0000-0000-0000-000000000113	00000000-0000-0000-0000-000000000001	20000000-0000-0000-0000-000000000002	\N	OSK-B-1-3	棚 B-1-3	bin	OSK/B/1/3	0	01	\N	t	12	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
30000000-0000-0000-0000-000000000114	00000000-0000-0000-0000-000000000001	20000000-0000-0000-0000-000000000002	\N	OSK-B-1-4	棚 B-1-4	bin	OSK/B/1/4	0	01	\N	t	13	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
30000000-0000-0000-0000-000000000115	00000000-0000-0000-0000-000000000001	20000000-0000-0000-0000-000000000002	\N	OSK-B-1-5	棚 B-1-5	bin	OSK/B/1/5	0	01	\N	t	14	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
30000000-0000-0000-0000-000000000121	00000000-0000-0000-0000-000000000001	20000000-0000-0000-0000-000000000002	\N	OSK-B-2-1	棚 B-2-1	bin	OSK/B/2/1	0	01	\N	t	20	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
30000000-0000-0000-0000-000000000122	00000000-0000-0000-0000-000000000001	20000000-0000-0000-0000-000000000002	\N	OSK-B-2-2	棚 B-2-2	bin	OSK/B/2/2	0	01	\N	t	21	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
30000000-0000-0000-0000-000000000123	00000000-0000-0000-0000-000000000001	20000000-0000-0000-0000-000000000002	\N	OSK-B-2-3	棚 B-2-3	bin	OSK/B/2/3	0	01	\N	t	22	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
30000000-0000-0000-0000-000000000131	00000000-0000-0000-0000-000000000001	20000000-0000-0000-0000-000000000002	\N	OSK-C-1-1	冷蔵棚 C-1-1	bin	OSK/C/1/1	1	01	\N	t	30	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
\.


--
-- Data for Name: lots; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lots (id, tenant_id, product_id, lot_number, expiry_date, manufacturing_date, memo, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: mapping_configs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mapping_configs (id, tenant_id, config_type, name, description, mappings, order_source_company_name, is_default, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: materials; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.materials (id, tenant_id, sku, name, description, unit_cost, stock_quantity, category, is_active, created_at, updated_at) FROM stdin;
c0000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	MAT-BOX-60	ダンボール箱 60サイズ	60サイズ配送用ダンボール / 60号纸箱	45	500	box	t	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
c0000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	MAT-BOX-80	ダンボール箱 80サイズ	80サイズ配送用ダンボール / 80号纸箱	65	300	box	t	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
c0000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	MAT-BOX-100	ダンボール箱 100サイズ	100サイズ配送用ダンボール / 100号纸箱	85	200	box	t	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
c0000000-0000-0000-0000-000000000004	00000000-0000-0000-0000-000000000001	MAT-BUBBLE	気泡緩衝材 ロール	プチプチ 30cm x 50m / 气泡膜卷	1200	50	cushion	t	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
c0000000-0000-0000-0000-000000000005	00000000-0000-0000-0000-000000000001	MAT-TAPE	OPPテープ 48mm	透明梱包テープ 48mm x 100m / OPP胶带	180	200	tape	t	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
c0000000-0000-0000-0000-000000000006	00000000-0000-0000-0000-000000000001	MAT-COOL-S	保冷剤 Sサイズ	保冷剤 100g / 保冷剂小号	30	1000	cool	t	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
c0000000-0000-0000-0000-000000000007	00000000-0000-0000-0000-000000000001	MAT-COOL-L	保冷剤 Lサイズ	保冷剤 500g / 保冷剂大号	80	400	cool	t	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
c0000000-0000-0000-0000-000000000008	00000000-0000-0000-0000-000000000001	MAT-POLYMAILER	ポリメーラー A4	宅配ビニール袋 A4サイズ / 快递袋A4	12	2000	bag	t	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, tenant_id, user_id, title, body, type, reference_type, reference_id, is_read, read_at, created_at) FROM stdin;
\.


--
-- Data for Name: operation_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.operation_logs (id, tenant_id, user_id, action, resource_type, resource_id, module, changes, metadata, request_id, ip_address, user_agent, created_at) FROM stdin;
\.


--
-- Data for Name: order_groups; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_groups (id, tenant_id, name, priority, enabled, description, sort_criteria, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: order_source_companies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_source_companies (id, tenant_id, sender_name, sender_postal_code, sender_address_prefecture, sender_address_city, sender_address_street, sender_address_building, sender_phone, hatsu_base_no1, hatsu_base_no2, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: passthrough_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.passthrough_orders (id, tenant_id, order_number, client_id, status, items, destination_name, destination_postal_code, destination_prefecture, destination_city, destination_address, destination_building, destination_phone, notes, confirmed_at, received_at, completed_at, cancelled_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: photos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.photos (id, tenant_id, entity_type, entity_id, filename, original_filename, mime_type, size, url, thumbnail_url, uploaded_by, created_at) FROM stdin;
\.


--
-- Data for Name: plugins; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.plugins (id, tenant_id, name, description, version, author, enabled, config, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: print_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.print_templates (id, tenant_id, name, type, canvas, elements, paper_size, orientation, reference_image_data, is_default, scope, client_id, parent_id, is_active, version, description, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: product_sub_skus; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_sub_skus (id, product_id, sub_sku, price, description, is_active) FROM stdin;
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id, tenant_id, sku, name, name_full, name_en, abbreviation, category, barcode, jan_code, image_url, memo, enterprise_code, house_code, customer_product_code, brand_code, brand_name, size_code, size_name, color_code, color_name, unit_type, width, depth, height, weight, gross_weight, volume, outer_box_width, outer_box_depth, outer_box_height, outer_box_volume, outer_box_weight, case_quantity, price, cost_price, purchase_price, tax_type, tax_category, tax_rate, currency, cool_type, product_characteristic, shipping_size_code, carrier_size_class, mail_calc_enabled, mail_calc_max_quantity, inventory_enabled, lot_tracking_enabled, expiry_tracking_enabled, serial_tracking_enabled, alert_days_before_expiry, inbound_expiry_days, safety_stock, appropriate_stock, allocation_rule, supplier_code, supplier_name, fnsku, asin, amazon_sku, fba_enabled, rakuten_sku, rsl_enabled, ec_channel_codes, marketplace_codes, b2b_customer_codes, wholesale_partner_codes, hazardous_type, air_transport_ban, air_prohibited, barcode_commission, barcode_outsourced, reservation_target, paid_type, country_of_origin, origin_country_code, handling_types, default_handling_tags, remarks, custom_fields, inspection_lot, inspection_expiry, inspection_reference, set_product_flag, inner_count, case_dimension_l, case_dimension_w, case_dimension_h, case_weight, case_volume, wh_preferred_location, wh_handling_notes, wh_is_fragile, wh_is_liquid, wh_requires_opp_bag, wh_storage_type, size_assessment_status, customer_customer_codes, client_id, sub_client_id, shop_id, created_at, updated_at, deleted_at) FROM stdin;
60000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	SKU-COS-001	美白化粧水 しっとり 200ml	\N	Whitening Lotion Moist 200ml	\N	1	["4901234567001"]	4901234567001	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	6.5	6.5	18.0	0.25	\N	\N	\N	\N	\N	\N	\N	\N	1980	\N	\N	\N	\N	\N	\N	0	normal	\N	\N	f	\N	t	f	f	f	30	\N	20	\N	FIFO	\N	\N	\N	\N	\N	f	\N	f	{}	{}	[]	{}	0	f	f	f	f	f	0	\N	\N	[]	[]	[]	{}	f	f	f	single	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	\N	pending	{}	40000000-0000-0000-0000-000000000001	\N	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263	\N
60000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	SKU-COS-002	保湿クリーム リッチ 50g	\N	Moisturizing Cream Rich 50g	\N	1	["4901234567002"]	4901234567002	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	5.0	5.0	5.5	0.12	\N	\N	\N	\N	\N	\N	\N	\N	3280	\N	\N	\N	\N	\N	\N	0	normal	\N	\N	f	\N	t	f	f	f	30	\N	15	\N	FIFO	\N	\N	\N	\N	\N	f	\N	f	{}	{}	[]	{}	0	f	f	f	f	f	0	\N	\N	[]	[]	[]	{}	f	f	f	single	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	\N	pending	{}	40000000-0000-0000-0000-000000000001	\N	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263	\N
60000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	SKU-COS-003	UVプロテクトジェル SPF50+ 80g	\N	UV Protect Gel SPF50+ 80g	\N	1	["4901234567003"]	4901234567003	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	4.5	3.0	15.0	0.10	\N	\N	\N	\N	\N	\N	\N	\N	1580	\N	\N	\N	\N	\N	\N	0	normal	\N	\N	f	\N	t	f	f	f	30	\N	30	\N	FIFO	\N	\N	\N	\N	\N	f	\N	f	{}	{}	[]	{}	0	f	f	f	f	f	0	\N	\N	[]	[]	[]	{}	f	f	f	single	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	\N	pending	{}	40000000-0000-0000-0000-000000000001	\N	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263	\N
60000000-0000-0000-0000-000000000004	00000000-0000-0000-0000-000000000001	SKU-COS-004	クレンジングオイル 150ml	\N	Cleansing Oil 150ml	\N	1	["4901234567004"]	4901234567004	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	5.5	5.5	16.0	0.18	\N	\N	\N	\N	\N	\N	\N	\N	1480	\N	\N	\N	\N	\N	\N	0	normal	\N	\N	f	\N	t	f	f	f	30	\N	25	\N	FIFO	\N	\N	\N	\N	\N	f	\N	f	{}	{}	[]	{}	0	f	f	f	f	f	0	\N	\N	[]	[]	[]	{}	f	f	f	single	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	\N	pending	{}	40000000-0000-0000-0000-000000000001	\N	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263	\N
60000000-0000-0000-0000-000000000005	00000000-0000-0000-0000-000000000001	SKU-COS-005	フェイスマスク 7枚入り	\N	Face Mask 7 Sheets	\N	1	["4901234567005"]	4901234567005	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	15.0	1.5	20.0	0.08	\N	\N	\N	\N	\N	\N	\N	\N	980	\N	\N	\N	\N	\N	\N	0	normal	\N	\N	f	\N	t	f	f	f	30	\N	50	\N	FIFO	\N	\N	\N	\N	\N	f	\N	f	{}	{}	[]	{}	0	f	f	f	f	f	0	\N	\N	[]	[]	[]	{}	f	f	f	single	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	\N	pending	{}	40000000-0000-0000-0000-000000000001	\N	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263	\N
60000000-0000-0000-0000-000000000006	00000000-0000-0000-0000-000000000001	SKU-COS-006	リップティント コーラルピンク	\N	Lip Tint Coral Pink	\N	1	["4901234567006"]	4901234567006	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2.0	2.0	10.0	0.02	\N	\N	\N	\N	\N	\N	\N	\N	1280	\N	\N	\N	\N	\N	\N	0	normal	\N	\N	f	\N	t	f	f	f	30	\N	40	\N	FIFO	\N	\N	\N	\N	\N	f	\N	f	{}	{}	[]	{}	0	f	f	f	f	f	0	\N	\N	[]	[]	[]	{}	f	f	f	single	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	\N	pending	{}	40000000-0000-0000-0000-000000000001	\N	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263	\N
60000000-0000-0000-0000-000000000007	00000000-0000-0000-0000-000000000001	SKU-COS-007	ヘアトリートメント 250ml	\N	Hair Treatment 250ml	\N	1	["4901234567007"]	4901234567007	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	6.0	6.0	20.0	0.30	\N	\N	\N	\N	\N	\N	\N	\N	1680	\N	\N	\N	\N	\N	\N	0	normal	\N	\N	f	\N	t	f	f	f	30	\N	20	\N	FIFO	\N	\N	\N	\N	\N	f	\N	f	{}	{}	[]	{}	0	f	f	f	f	f	0	\N	\N	[]	[]	[]	{}	f	f	f	single	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	\N	pending	{}	40000000-0000-0000-0000-000000000001	\N	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263	\N
60000000-0000-0000-0000-000000000008	00000000-0000-0000-0000-000000000001	SKU-FD-001	有機抹茶パウダー 100g	\N	Organic Matcha Powder 100g	\N	2	["4902345678001"]	4902345678001	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	10.0	5.0	15.0	0.12	\N	\N	\N	\N	\N	\N	\N	\N	2480	\N	\N	\N	\N	\N	\N	0	normal	\N	\N	f	\N	t	f	f	f	30	\N	30	\N	FIFO	\N	\N	\N	\N	\N	f	\N	f	{}	{}	[]	{}	0	f	f	f	f	f	0	\N	\N	[]	[]	[]	{}	f	f	f	single	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	\N	pending	{}	40000000-0000-0000-0000-000000000002	\N	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263	\N
60000000-0000-0000-0000-000000000009	00000000-0000-0000-0000-000000000001	SKU-FD-002	北海道産チーズケーキ 6個入	\N	Hokkaido Cheesecake 6pcs	\N	2	["4902345678002"]	4902345678002	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	20.0	15.0	8.0	0.45	\N	\N	\N	\N	\N	\N	\N	\N	3200	\N	\N	\N	\N	\N	\N	1	refrigerated	\N	\N	f	\N	t	f	f	f	30	\N	10	\N	FIFO	\N	\N	\N	\N	\N	f	\N	f	{}	{}	[]	{}	0	f	f	f	f	f	0	\N	\N	[]	[]	[]	{}	f	f	f	single	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	\N	pending	{}	40000000-0000-0000-0000-000000000002	\N	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263	\N
60000000-0000-0000-0000-000000000010	00000000-0000-0000-0000-000000000001	SKU-FD-003	黒毛和牛ハンバーグ 4個セット	\N	Wagyu Hamburg Steak Set 4pcs	\N	2	["4902345678003"]	4902345678003	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	25.0	18.0	6.0	0.80	\N	\N	\N	\N	\N	\N	\N	\N	4980	\N	\N	\N	\N	\N	\N	2	frozen	\N	\N	f	\N	t	f	f	f	30	\N	8	\N	FIFO	\N	\N	\N	\N	\N	f	\N	f	{}	{}	[]	{}	0	f	f	f	f	f	0	\N	\N	[]	[]	[]	{}	f	f	f	single	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	\N	pending	{}	40000000-0000-0000-0000-000000000002	\N	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263	\N
60000000-0000-0000-0000-000000000011	00000000-0000-0000-0000-000000000001	SKU-FD-004	宇治抹茶アイス 12個入	\N	Uji Matcha Ice Cream 12pcs	\N	2	["4902345678004"]	4902345678004	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	30.0	20.0	10.0	1.20	\N	\N	\N	\N	\N	\N	\N	\N	3680	\N	\N	\N	\N	\N	\N	2	frozen	\N	\N	f	\N	t	f	f	f	30	\N	12	\N	FIFO	\N	\N	\N	\N	\N	f	\N	f	{}	{}	[]	{}	0	f	f	f	f	f	0	\N	\N	[]	[]	[]	{}	f	f	f	single	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	\N	pending	{}	40000000-0000-0000-0000-000000000002	\N	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263	\N
60000000-0000-0000-0000-000000000012	00000000-0000-0000-0000-000000000001	SKU-FD-005	特選だし醤油 500ml	\N	Premium Dashi Soy Sauce 500ml	\N	2	["4902345678005"]	4902345678005	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	7.0	7.0	22.0	0.55	\N	\N	\N	\N	\N	\N	\N	\N	780	\N	\N	\N	\N	\N	\N	0	normal	\N	\N	f	\N	t	f	f	f	30	\N	40	\N	FIFO	\N	\N	\N	\N	\N	f	\N	f	{}	{}	[]	{}	0	f	f	f	f	f	0	\N	\N	[]	[]	[]	{}	f	f	f	single	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	\N	pending	{}	40000000-0000-0000-0000-000000000002	\N	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263	\N
60000000-0000-0000-0000-000000000013	00000000-0000-0000-0000-000000000001	SKU-FD-006	国産はちみつ 300g	\N	Japanese Honey 300g	\N	2	["4902345678006"]	4902345678006	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	7.0	7.0	10.0	0.35	\N	\N	\N	\N	\N	\N	\N	\N	1580	\N	\N	\N	\N	\N	\N	0	normal	\N	\N	f	\N	t	f	f	f	30	\N	20	\N	FIFO	\N	\N	\N	\N	\N	f	\N	f	{}	{}	[]	{}	0	f	f	f	f	f	0	\N	\N	[]	[]	[]	{}	f	f	f	single	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	\N	pending	{}	40000000-0000-0000-0000-000000000002	\N	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263	\N
60000000-0000-0000-0000-000000000014	00000000-0000-0000-0000-000000000001	SKU-FD-007	明太子 博多直送 200g	\N	Mentaiko Hakata Direct 200g	\N	2	["4902345678007"]	4902345678007	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	15.0	10.0	5.0	0.25	\N	\N	\N	\N	\N	\N	\N	\N	2180	\N	\N	\N	\N	\N	\N	1	refrigerated	\N	\N	f	\N	t	f	f	f	30	\N	10	\N	FIFO	\N	\N	\N	\N	\N	f	\N	f	{}	{}	[]	{}	0	f	f	f	f	f	0	\N	\N	[]	[]	[]	{}	f	f	f	single	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	\N	pending	{}	40000000-0000-0000-0000-000000000002	\N	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263	\N
60000000-0000-0000-0000-000000000015	00000000-0000-0000-0000-000000000001	SKU-TG-001	ワイヤレスイヤホン Pro	\N	Wireless Earbuds Pro	\N	3	["4903456789001"]	4903456789001	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	8.0	8.0	4.0	0.05	\N	\N	\N	\N	\N	\N	\N	\N	12800	\N	\N	\N	\N	\N	\N	0	normal	\N	\N	f	\N	t	f	f	f	30	\N	15	\N	FIFO	\N	\N	\N	\N	\N	f	\N	f	{}	{}	[]	{}	0	f	f	f	f	f	0	\N	\N	[]	[]	[]	{}	f	f	f	single	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	\N	pending	{}	40000000-0000-0000-0000-000000000003	\N	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263	\N
60000000-0000-0000-0000-000000000016	00000000-0000-0000-0000-000000000001	SKU-TG-002	スマートウォッチ X1	\N	Smart Watch X1	\N	3	["4903456789002"]	4903456789002	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	10.0	10.0	8.0	0.08	\N	\N	\N	\N	\N	\N	\N	\N	29800	\N	\N	\N	\N	\N	\N	0	normal	\N	\N	f	\N	t	f	f	f	30	\N	10	\N	FIFO	\N	\N	\N	\N	\N	f	\N	f	{}	{}	[]	{}	0	f	f	f	f	f	0	\N	\N	[]	[]	[]	{}	f	f	f	single	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	\N	pending	{}	40000000-0000-0000-0000-000000000003	\N	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263	\N
60000000-0000-0000-0000-000000000017	00000000-0000-0000-0000-000000000001	SKU-TG-003	USB-C ハブ 7in1	\N	USB-C Hub 7in1	\N	3	["4903456789003"]	4903456789003	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	12.0	5.0	2.0	0.12	\N	\N	\N	\N	\N	\N	\N	\N	4980	\N	\N	\N	\N	\N	\N	0	normal	\N	\N	f	\N	t	f	f	f	30	\N	25	\N	FIFO	\N	\N	\N	\N	\N	f	\N	f	{}	{}	[]	{}	0	f	f	f	f	f	0	\N	\N	[]	[]	[]	{}	f	f	f	single	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	\N	pending	{}	40000000-0000-0000-0000-000000000003	\N	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263	\N
60000000-0000-0000-0000-000000000018	00000000-0000-0000-0000-000000000001	SKU-TG-004	モバイルバッテリー 20000mAh	\N	Mobile Battery 20000mAh	\N	3	["4903456789004"]	4903456789004	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	15.0	7.5	2.5	0.35	\N	\N	\N	\N	\N	\N	\N	\N	3980	\N	\N	\N	\N	\N	\N	0	normal	\N	\N	f	\N	t	f	f	f	30	\N	30	\N	FIFO	\N	\N	\N	\N	\N	f	\N	f	{}	{}	[]	{}	0	f	f	f	f	f	0	\N	\N	[]	[]	[]	{}	f	f	f	single	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	\N	pending	{}	40000000-0000-0000-0000-000000000003	\N	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263	\N
60000000-0000-0000-0000-000000000019	00000000-0000-0000-0000-000000000001	SKU-TG-005	ノイズキャンセリングヘッドホン	\N	Noise Cancelling Headphones	\N	3	["4903456789005"]	4903456789005	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	20.0	18.0	9.0	0.28	\N	\N	\N	\N	\N	\N	\N	\N	19800	\N	\N	\N	\N	\N	\N	0	normal	\N	\N	f	\N	t	f	f	f	30	\N	8	\N	FIFO	\N	\N	\N	\N	\N	f	\N	f	{}	{}	[]	{}	0	f	f	f	f	f	0	\N	\N	[]	[]	[]	{}	f	f	f	single	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	\N	pending	{}	40000000-0000-0000-0000-000000000003	\N	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263	\N
60000000-0000-0000-0000-000000000020	00000000-0000-0000-0000-000000000001	SKU-TG-006	急速充電器 65W GaN	\N	Fast Charger 65W GaN	\N	3	["4903456789006"]	4903456789006	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	6.0	6.0	3.0	0.15	\N	\N	\N	\N	\N	\N	\N	\N	4280	\N	\N	\N	\N	\N	\N	0	normal	\N	\N	f	\N	t	f	f	f	30	\N	35	\N	FIFO	\N	\N	\N	\N	\N	f	\N	f	{}	{}	[]	{}	0	f	f	f	f	f	0	\N	\N	[]	[]	[]	{}	f	f	f	single	\N	\N	\N	\N	\N	\N	\N	\N	f	f	f	\N	pending	{}	40000000-0000-0000-0000-000000000003	\N	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263	\N
\.


--
-- Data for Name: return_order_lines; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.return_order_lines (id, tenant_id, return_order_id, product_id, product_sku, quantity, inspected_quantity, disposition, restocked_quantity, disposed_quantity, location_id, lot_id, inspection_notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: return_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.return_orders (id, tenant_id, order_number, status, return_reason, rma_number, return_tracking_id, shipment_order_id, client_id, notes, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: rsl_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rsl_items (id, tenant_id, shipment_plan_id, product_id, sku, quantity, processed_quantity, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: rsl_shipment_plans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rsl_shipment_plans (id, tenant_id, plan_name, status, rsl_order_id, items, notes, confirmed_at, shipped_at, completed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: rule_definitions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rule_definitions (id, tenant_id, name, description, module, warehouse_id, client_id, priority, condition_groups, actions, stop_on_match, is_active, valid_from, valid_to, execution_count, last_executed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: scripts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.scripts (id, tenant_id, name, description, language, code, enabled, trigger_event, last_run_at, last_run_status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: service_rates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.service_rates (id, tenant_id, name, charge_type, unit, unit_price, client_id, client_name, conditions, valid_from, valid_to, is_active, memo, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: set_master; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.set_master (id, tenant_id, set_product_id, component_product_id, quantity, sort_order, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: shipment_order_materials; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.shipment_order_materials (id, tenant_id, shipment_order_id, material_sku, material_name, quantity, unit_cost, total_cost, auto) FROM stdin;
\.


--
-- Data for Name: shipment_order_products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.shipment_order_products (id, tenant_id, shipment_order_id, input_sku, quantity, product_id, product_sku, product_name, unit_price, subtotal, cool_type, barcode, image_url, matched_sub_sku, mail_calc_enabled, mail_calc_max_quantity) FROM stdin;
81000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	80000000-0000-0000-0000-000000000001	SKU-COS-001	2	60000000-0000-0000-0000-000000000001	SKU-COS-001	美白化粧水 しっとり 200ml	1980	3960	\N	[]	\N	\N	\N	\N
81000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	80000000-0000-0000-0000-000000000001	SKU-COS-003	1	60000000-0000-0000-0000-000000000003	SKU-COS-003	UVプロテクトジェル SPF50+ 80g	1580	1580	\N	[]	\N	\N	\N	\N
81000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	80000000-0000-0000-0000-000000000002	SKU-FD-001	3	60000000-0000-0000-0000-000000000008	SKU-FD-001	有機抹茶パウダー 100g	2480	7440	\N	[]	\N	\N	\N	\N
81000000-0000-0000-0000-000000000004	00000000-0000-0000-0000-000000000001	80000000-0000-0000-0000-000000000003	SKU-COS-002	1	60000000-0000-0000-0000-000000000002	SKU-COS-002	保湿クリーム リッチ 50g	3280	3280	\N	[]	\N	\N	\N	\N
81000000-0000-0000-0000-000000000005	00000000-0000-0000-0000-000000000001	80000000-0000-0000-0000-000000000003	SKU-COS-005	2	60000000-0000-0000-0000-000000000005	SKU-COS-005	フェイスマスク 7枚入り	980	1960	\N	[]	\N	\N	\N	\N
81000000-0000-0000-0000-000000000006	00000000-0000-0000-0000-000000000001	80000000-0000-0000-0000-000000000004	SKU-FD-002	2	60000000-0000-0000-0000-000000000009	SKU-FD-002	北海道産チーズケーキ 6個入	3200	6400	\N	[]	\N	\N	\N	\N
81000000-0000-0000-0000-000000000007	00000000-0000-0000-0000-000000000001	80000000-0000-0000-0000-000000000005	SKU-TG-001	1	60000000-0000-0000-0000-000000000015	SKU-TG-001	ワイヤレスイヤホン Pro	12800	12800	\N	[]	\N	\N	\N	\N
81000000-0000-0000-0000-000000000008	00000000-0000-0000-0000-000000000001	80000000-0000-0000-0000-000000000005	SKU-TG-003	2	60000000-0000-0000-0000-000000000017	SKU-TG-003	USB-C ハブ 7in1	4980	9960	\N	[]	\N	\N	\N	\N
81000000-0000-0000-0000-000000000009	00000000-0000-0000-0000-000000000001	80000000-0000-0000-0000-000000000006	SKU-COS-006	3	60000000-0000-0000-0000-000000000006	SKU-COS-006	リップティント コーラルピンク	1280	3840	\N	[]	\N	\N	\N	\N
81000000-0000-0000-0000-000000000010	00000000-0000-0000-0000-000000000001	80000000-0000-0000-0000-000000000007	SKU-COS-007	1	60000000-0000-0000-0000-000000000007	SKU-COS-007	ヘアトリートメント 250ml	1680	1680	\N	[]	\N	\N	\N	\N
81000000-0000-0000-0000-000000000011	00000000-0000-0000-0000-000000000001	80000000-0000-0000-0000-000000000007	SKU-COS-001	1	60000000-0000-0000-0000-000000000001	SKU-COS-001	美白化粧水 しっとり 200ml	1980	1980	\N	[]	\N	\N	\N	\N
81000000-0000-0000-0000-000000000012	00000000-0000-0000-0000-000000000001	80000000-0000-0000-0000-000000000008	SKU-TG-002	5	60000000-0000-0000-0000-000000000016	SKU-TG-002	スマートウォッチ X1	29800	149000	\N	[]	\N	\N	\N	\N
81000000-0000-0000-0000-000000000013	00000000-0000-0000-0000-000000000001	80000000-0000-0000-0000-000000000008	SKU-TG-004	10	60000000-0000-0000-0000-000000000018	SKU-TG-004	モバイルバッテリー 20000mAh	3980	39800	\N	[]	\N	\N	\N	\N
81000000-0000-0000-0000-000000000014	00000000-0000-0000-0000-000000000001	80000000-0000-0000-0000-000000000009	SKU-FD-003	2	60000000-0000-0000-0000-000000000010	SKU-FD-003	黒毛和牛ハンバーグ 4個セット	4980	9960	\N	[]	\N	\N	\N	\N
81000000-0000-0000-0000-000000000015	00000000-0000-0000-0000-000000000001	80000000-0000-0000-0000-000000000009	SKU-FD-004	1	60000000-0000-0000-0000-000000000011	SKU-FD-004	宇治抹茶アイス 12個入	3680	3680	\N	[]	\N	\N	\N	\N
81000000-0000-0000-0000-000000000016	00000000-0000-0000-0000-000000000001	80000000-0000-0000-0000-000000000010	SKU-TG-005	1	60000000-0000-0000-0000-000000000019	SKU-TG-005	ノイズキャンセリングヘッドホン	19800	19800	\N	[]	\N	\N	\N	\N
\.


--
-- Data for Name: shipment_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.shipment_orders (id, tenant_id, order_number, destination_type, fba_shipment_id, fba_destination, carrier_id, tracking_id, customer_management_number, status_confirmed, status_confirmed_at, status_carrier_received, status_carrier_received_at, status_printed, status_printed_at, status_inspected, status_inspected_at, status_shipped, status_shipped_at, status_ec_exported, status_ec_exported_at, status_held, status_held_at, recipient_postal_code, recipient_prefecture, recipient_city, recipient_street, recipient_building, recipient_name, recipient_phone, honorific, sender_postal_code, sender_prefecture, sender_city, sender_street, sender_building, sender_name, sender_phone, orderer_postal_code, orderer_prefecture, orderer_city, orderer_street, orderer_building, orderer_name, orderer_phone, ship_plan_date, invoice_type, cool_type, delivery_time_slot, delivery_date_preference, source_order_at, carrier_data, cost_summary, shipping_cost, shipping_cost_breakdown, cost_source, cost_calculated_at, handling_tags, custom_fields, _products_meta, source_raw_rows, carrier_raw_row, internal_record, order_group_id, order_source_company_id, created_at, updated_at, deleted_at) FROM stdin;
80000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	SO-2026-0001	B2C	\N	\N	50000000-0000-0000-0000-000000000001	\N	\N	f	\N	f	\N	f	\N	f	\N	f	\N	f	\N	f	\N	160-0022	東京都	新宿区	新宿3-14-1	\N	山田 太郎	090-1111-2222	様	135-0061	東京都	江東区	豊洲6-1-1	\N	ZELIX物流 東京倉庫	03-1234-5678	\N	\N	\N	\N	\N	\N	\N	2026-03-24	\N	0	0812	\N	\N	\N	\N	\N	\N	\N	\N	[]	{}	\N	\N	\N	\N	\N	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263	\N
80000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	SO-2026-0002	B2C	\N	\N	50000000-0000-0000-0000-000000000002	\N	\N	f	\N	f	\N	f	\N	f	\N	f	\N	f	\N	f	\N	530-0001	大阪府	大阪市北区	梅田1-1-1	\N	高橋 花子	080-3333-4444	様	559-0034	大阪府	大阪市住之江区	南港北1-14-16	\N	ZELIX物流 大阪倉庫	06-9876-5432	\N	\N	\N	\N	\N	\N	\N	2026-03-24	\N	0	1416	\N	\N	\N	\N	\N	\N	\N	\N	[]	{}	\N	\N	\N	\N	\N	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263	\N
80000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	SO-2026-0003	B2C	\N	\N	50000000-0000-0000-0000-000000000001	\N	\N	t	2026-03-22 10:00:00	f	\N	f	\N	f	\N	f	\N	f	\N	f	\N	150-0001	東京都	渋谷区	神宮前5-6-7	\N	伊藤 次郎	070-5555-6666	様	135-0061	東京都	江東区	豊洲6-1-1	\N	ZELIX物流 東京倉庫	03-1234-5678	\N	\N	\N	\N	\N	\N	\N	2026-03-24	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	[]	{}	\N	\N	\N	\N	\N	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263	\N
80000000-0000-0000-0000-000000000004	00000000-0000-0000-0000-000000000001	SO-2026-0004	B2C	\N	\N	50000000-0000-0000-0000-000000000003	\N	\N	t	2026-03-22 11:30:00	f	\N	f	\N	f	\N	f	\N	f	\N	f	\N	460-0008	愛知県	名古屋市中区	栄4-1-1	\N	渡辺 美咲	090-7777-8888	様	135-0061	東京都	江東区	豊洲6-1-1	\N	ZELIX物流 東京倉庫	03-1234-5678	\N	\N	\N	\N	\N	\N	\N	2026-03-25	\N	1	1820	\N	\N	\N	\N	\N	\N	\N	\N	[]	{}	\N	\N	\N	\N	\N	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263	\N
80000000-0000-0000-0000-000000000005	00000000-0000-0000-0000-000000000001	SO-2026-0005	B2C	\N	\N	50000000-0000-0000-0000-000000000001	1234-5678-9012	\N	t	2026-03-21 09:00:00	f	\N	t	2026-03-21 14:00:00	f	\N	f	\N	f	\N	f	\N	104-0061	東京都	中央区	銀座1-2-3	\N	中村 健太	080-9999-0000	様	135-0061	東京都	江東区	豊洲6-1-1	\N	ZELIX物流 東京倉庫	03-1234-5678	\N	\N	\N	\N	\N	\N	\N	2026-03-23	\N	0	0812	\N	\N	\N	\N	\N	\N	\N	\N	[]	{}	\N	\N	\N	\N	\N	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263	\N
80000000-0000-0000-0000-000000000006	00000000-0000-0000-0000-000000000001	SO-2026-0006	B2C	\N	\N	50000000-0000-0000-0000-000000000002	9876-5432-1098	\N	t	2026-03-20 08:00:00	f	\N	t	2026-03-20 10:00:00	t	2026-03-20 15:00:00	f	\N	f	\N	f	\N	810-0001	福岡県	福岡市中央区	天神2-3-4	\N	小林 大輔	090-1234-5678	様	135-0061	東京都	江東区	豊洲6-1-1	\N	ZELIX物流 東京倉庫	03-1234-5678	\N	\N	\N	\N	\N	\N	\N	2026-03-22	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	[]	{}	\N	\N	\N	\N	\N	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263	\N
80000000-0000-0000-0000-000000000007	00000000-0000-0000-0000-000000000001	SO-2026-0007	B2C	\N	\N	50000000-0000-0000-0000-000000000001	5555-6666-7777	\N	t	2026-03-18 09:00:00	f	\N	t	2026-03-18 11:00:00	t	2026-03-18 14:00:00	t	2026-03-18 17:00:00	f	\N	f	\N	600-8216	京都府	京都市下京区	烏丸通七条下る	\N	松本 あゆみ	075-1111-2222	様	135-0061	東京都	江東区	豊洲6-1-1	\N	ZELIX物流 東京倉庫	03-1234-5678	\N	\N	\N	\N	\N	\N	\N	2026-03-19	\N	0	1416	\N	\N	\N	\N	\N	\N	\N	\N	[]	{}	\N	\N	\N	\N	\N	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263	\N
80000000-0000-0000-0000-000000000008	00000000-0000-0000-0000-000000000001	SO-2026-0008	B2B	\N	\N	50000000-0000-0000-0000-000000000004	8888-9999-0000	\N	t	2026-03-17 08:30:00	f	\N	t	2026-03-17 10:00:00	t	2026-03-17 13:00:00	t	2026-03-17 16:00:00	f	\N	f	\N	980-0021	宮城県	仙台市青葉区	中央1-3-1	\N	株式会社東北電子	022-3333-4444	様	135-0061	東京都	江東区	豊洲6-1-1	\N	ZELIX物流 東京倉庫	03-1234-5678	\N	\N	\N	\N	\N	\N	\N	2026-03-18	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	[]	{}	\N	\N	\N	\N	\N	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263	\N
80000000-0000-0000-0000-000000000009	00000000-0000-0000-0000-000000000001	SO-2026-0009	B2C	\N	\N	50000000-0000-0000-0000-000000000001	1111-2222-3333	\N	t	2026-03-19 09:00:00	f	\N	t	2026-03-19 11:00:00	t	2026-03-19 14:30:00	t	2026-03-19 16:30:00	f	\N	f	\N	060-0042	北海道	札幌市中央区	大通西3-6	\N	北野 雪子	011-5555-6666	様	135-0061	東京都	江東区	豊洲6-1-1	\N	ZELIX物流 東京倉庫	03-1234-5678	\N	\N	\N	\N	\N	\N	\N	2026-03-20	\N	2	0812	\N	\N	\N	\N	\N	\N	\N	\N	[]	{}	\N	\N	\N	\N	\N	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263	\N
80000000-0000-0000-0000-000000000010	00000000-0000-0000-0000-000000000001	SO-2026-0010	B2C	\N	\N	50000000-0000-0000-0000-000000000001	\N	\N	t	2026-03-22 09:00:00	f	\N	f	\N	f	\N	f	\N	f	\N	t	2026-03-22 12:00:00	700-0024	岡山県	岡山市北区	駅元町1-1	\N	岡田 優子	086-7777-8888	様	135-0061	東京都	江東区	豊洲6-1-1	\N	ZELIX物流 東京倉庫	03-1234-5678	\N	\N	\N	\N	\N	\N	\N	2026-03-25	\N	0	\N	\N	\N	\N	\N	\N	\N	\N	\N	[]	{}	\N	\N	\N	\N	\N	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263	\N
\.


--
-- Data for Name: shipping_rates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.shipping_rates (id, tenant_id, carrier_id, carrier_name, name, size_type, size_min, size_max, from_prefectures, to_prefectures, base_price, cool_surcharge, cod_surcharge, fuel_surcharge, valid_from, valid_to, is_active, memo, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: shops; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.shops (id, tenant_id, client_id, sub_client_id, code, name, platform, platform_shop_id, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: shortage_records; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.shortage_records (id, tenant_id, shipment_order_id, product_id, requested_quantity, available_quantity, shortage_quantity, status, reserved_at, fulfilled_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: slotting_rules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.slotting_rules (id, tenant_id, name, description, priority, conditions, actions, enabled, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: stock_moves; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stock_moves (id, tenant_id, move_number, move_type, status, product_id, product_sku, from_location_id, to_location_id, lot_id, quantity, reference_type, reference_id, reference_number, reason, executed_by, executed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: stock_quants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stock_quants (id, tenant_id, product_id, location_id, lot_id, quantity, reserved_quantity, last_moved_at, created_at, updated_at) FROM stdin;
70000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000001	30000000-0000-0000-0000-000000000011	\N	150	5	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
70000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000002	30000000-0000-0000-0000-000000000012	\N	80	3	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
70000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000003	30000000-0000-0000-0000-000000000013	\N	200	10	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
70000000-0000-0000-0000-000000000004	00000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000004	30000000-0000-0000-0000-000000000014	\N	120	0	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
70000000-0000-0000-0000-000000000005	00000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000005	30000000-0000-0000-0000-000000000015	\N	300	15	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
70000000-0000-0000-0000-000000000006	00000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000006	30000000-0000-0000-0000-000000000021	\N	250	8	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
70000000-0000-0000-0000-000000000007	00000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000007	30000000-0000-0000-0000-000000000022	\N	90	2	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
70000000-0000-0000-0000-000000000008	00000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000008	30000000-0000-0000-0000-000000000023	\N	100	5	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
70000000-0000-0000-0000-000000000009	00000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000009	30000000-0000-0000-0000-000000000041	\N	40	4	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
70000000-0000-0000-0000-000000000010	00000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000010	30000000-0000-0000-0000-000000000051	\N	60	6	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
70000000-0000-0000-0000-000000000011	00000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000011	30000000-0000-0000-0000-000000000052	\N	48	0	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
70000000-0000-0000-0000-000000000012	00000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000012	30000000-0000-0000-0000-000000000024	\N	180	10	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
70000000-0000-0000-0000-000000000013	00000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000013	30000000-0000-0000-0000-000000000025	\N	65	0	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
70000000-0000-0000-0000-000000000014	00000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000014	30000000-0000-0000-0000-000000000042	\N	30	3	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
70000000-0000-0000-0000-000000000015	00000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000015	30000000-0000-0000-0000-000000000031	\N	45	2	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
70000000-0000-0000-0000-000000000016	00000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000016	30000000-0000-0000-0000-000000000032	\N	25	1	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
70000000-0000-0000-0000-000000000017	00000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000017	30000000-0000-0000-0000-000000000033	\N	120	5	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
70000000-0000-0000-0000-000000000018	00000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000018	30000000-0000-0000-0000-000000000034	\N	200	12	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
70000000-0000-0000-0000-000000000019	00000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000019	30000000-0000-0000-0000-000000000035	\N	18	0	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
70000000-0000-0000-0000-000000000020	00000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000020	30000000-0000-0000-0000-000000000111	\N	80	3	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
70000000-0000-0000-0000-000000000021	00000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000015	30000000-0000-0000-0000-000000000112	\N	30	0	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
70000000-0000-0000-0000-000000000022	00000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000017	30000000-0000-0000-0000-000000000113	\N	60	2	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
70000000-0000-0000-0000-000000000023	00000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000018	30000000-0000-0000-0000-000000000114	\N	100	0	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
\.


--
-- Data for Name: stocktaking_discrepancies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stocktaking_discrepancies (id, tenant_id, stocktaking_order_id, product_id, location_id, system_quantity, counted_quantity, discrepancy, status, adjusted_by, adjusted_at, notes, created_at) FROM stdin;
\.


--
-- Data for Name: stocktaking_lines; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stocktaking_lines (id, tenant_id, stocktaking_order_id, product_id, location_id, count_round, system_quantity, counted_quantity, discrepancy, previous_count, warehouse_code, warehouse_type, result_mark, lot_id, expiry_date, best_before_date, serial_number, last_updated_by, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: stocktaking_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stocktaking_orders (id, tenant_id, order_number, type, status, warehouse_id, location_ids, product_ids, scheduled_date, completed_at, memo, items, title, client_id, stocktaking_category, location_from, location_to, instruction_date, discrepancy_category, total_slots, completed_slots, theoretical_item_count, actual_item_count, theoretical_piece_count, actual_piece_count, judgment, confirmed_at, customer_notification_date, customer_notifier, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: sub_clients; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sub_clients (id, tenant_id, client_id, code, name, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.suppliers (id, tenant_id, code, name, contact_name, contact_phone, contact_email, address, is_active, created_at, updated_at) FROM stdin;
b0000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	SUP-001	株式会社コスメ工場	工藤 真一	048-1234-5678	kudo@cosme-factory.co.jp	埼玉県さいたま市大宮区桜木町1-7-5	t	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
b0000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	SUP-002	北海道食品株式会社	千葉 悟	011-9876-5432	chiba@hokkaido-foods.co.jp	北海道札幌市白石区菊水1条1丁目	t	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
b0000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	SUP-003	深圳テック株式会社	王 明	03-5555-6666	wang@shenzhen-tech.co.jp	東京都千代田区丸の内1-9-2	t	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.system_settings (id, tenant_id, settings_key, settings, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: tenants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tenants (id, code, name, plan, is_active, created_at, updated_at) FROM stdin;
00000000-0000-0000-0000-000000000001	ZELIX001	ZELIX物流	enterprise	t	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, tenant_id, email, display_name, role, warehouse_ids, is_active, last_login_at, created_at, updated_at) FROM stdin;
10000000-0000-0000-0000-000000000004	00000000-0000-0000-0000-000000000001	client@zelix.co.jp	荷主 美咲	viewer	[]	t	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
10000000-0000-0000-0000-000000000005	00000000-0000-0000-0000-000000000001	viewer@zelix.co.jp	閲覧者 健太	viewer	[]	t	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
10000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	worker@zelix.co.jp	作業者 花子	operator	["20000000-0000-0000-0000-000000000001"]	t	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
10000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	manager@zelix.co.jp	マネージャー 次郎	manager	["20000000-0000-0000-0000-000000000001", "20000000-0000-0000-0000-000000000002"]	t	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
10000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	admin@zelix.co.jp	管理者 太郎	admin	["20000000-0000-0000-0000-000000000001", "20000000-0000-0000-0000-000000000002"]	t	2026-03-22 17:09:05.398	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
\.


--
-- Data for Name: warehouse_tasks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.warehouse_tasks (id, tenant_id, task_number, type, status, warehouse_id, order_id, wave_id, assignee_id, assignee_name, priority, items, completed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: warehouses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.warehouses (id, tenant_id, code, name, name2, postal_code, prefecture, city, address, address2, phone, cool_types, capacity, operating_hours, is_active, sort_order, memo, created_at, updated_at) FROM stdin;
20000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	WH-TKY	東京倉庫	\N	135-0061	東京都	江東区	豊洲6-1-1	\N	03-1234-5678	["ambient", "chilled", "frozen"]	50000	08:00-20:00	t	1	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
20000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	WH-OSK	大阪倉庫	\N	559-0034	大阪府	大阪市住之江区	南港北1-14-16	\N	06-9876-5432	["ambient", "chilled"]	30000	09:00-18:00	t	2	\N	2026-03-22 15:39:42.406263	2026-03-22 15:39:42.406263
05df4cdf-e8eb-442b-9857-06e1817a6c72	00000000-0000-0000-0000-000000000001	00000001	SHINPUR		2310058	神奈川県	横浜市中区	弥生町2-15-1			[]	0		t	0		2026-03-22 17:34:44.052834	2026-03-22 17:34:44.052834
\.


--
-- Data for Name: waves; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.waves (id, tenant_id, wave_number, warehouse_id, status, priority, shipment_ids, assigned_to, assigned_name, total_orders, total_items, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: webhook_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.webhook_logs (id, tenant_id, webhook_id, event, url, http_status, response_time_ms, success, error, payload, created_at) FROM stdin;
\.


--
-- Data for Name: webhooks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.webhooks (id, tenant_id, name, url, secret, events, enabled, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: work_charges; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.work_charges (id, tenant_id, charge_type, charge_date, reference_type, reference_id, reference_number, client_id, client_name, sub_client_id, sub_client_name, shop_id, shop_name, quantity, unit_price, amount, description, billing_period, billing_record_id, is_billed, memo, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: workflow_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.workflow_logs (id, tenant_id, workflow_id, status, trigger_data, result, error, started_at, completed_at, created_at) FROM stdin;
\.


--
-- Data for Name: workflows; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.workflows (id, tenant_id, name, description, trigger_type, trigger_config, actions, enabled, last_run_at, created_at, updated_at) FROM stdin;
\.


--
-- Name: api_logs api_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_logs
    ADD CONSTRAINT api_logs_pkey PRIMARY KEY (id);


--
-- Name: assembly_orders assembly_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assembly_orders
    ADD CONSTRAINT assembly_orders_pkey PRIMARY KEY (id);


--
-- Name: auto_processing_rules auto_processing_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auto_processing_rules
    ADD CONSTRAINT auto_processing_rules_pkey PRIMARY KEY (id);


--
-- Name: billing_records billing_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_records
    ADD CONSTRAINT billing_records_pkey PRIMARY KEY (id);


--
-- Name: carrier_automation_configs carrier_automation_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carrier_automation_configs
    ADD CONSTRAINT carrier_automation_configs_pkey PRIMARY KEY (id);


--
-- Name: carrier_session_caches carrier_session_caches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carrier_session_caches
    ADD CONSTRAINT carrier_session_caches_pkey PRIMARY KEY (id);


--
-- Name: carriers carriers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carriers
    ADD CONSTRAINT carriers_pkey PRIMARY KEY (id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: country_codes country_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.country_codes
    ADD CONSTRAINT country_codes_pkey PRIMARY KEY (id);


--
-- Name: custom_field_definitions custom_field_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_field_definitions
    ADD CONSTRAINT custom_field_definitions_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: daily_reports daily_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_reports
    ADD CONSTRAINT daily_reports_pkey PRIMARY KEY (id);


--
-- Name: email_templates email_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_pkey PRIMARY KEY (id);


--
-- Name: exception_reports exception_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exception_reports
    ADD CONSTRAINT exception_reports_pkey PRIMARY KEY (id);


--
-- Name: fba_boxes fba_boxes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fba_boxes
    ADD CONSTRAINT fba_boxes_pkey PRIMARY KEY (id);


--
-- Name: fba_shipment_plans fba_shipment_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fba_shipment_plans
    ADD CONSTRAINT fba_shipment_plans_pkey PRIMARY KEY (id);


--
-- Name: feature_flags feature_flags_name_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feature_flags
    ADD CONSTRAINT feature_flags_name_unique UNIQUE (name);


--
-- Name: feature_flags feature_flags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feature_flags
    ADD CONSTRAINT feature_flags_pkey PRIMARY KEY (id);


--
-- Name: form_templates form_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_templates
    ADD CONSTRAINT form_templates_pkey PRIMARY KEY (id);


--
-- Name: gift_options gift_options_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gift_options
    ADD CONSTRAINT gift_options_pkey PRIMARY KEY (id);


--
-- Name: handling_label_types handling_label_types_code_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.handling_label_types
    ADD CONSTRAINT handling_label_types_code_unique UNIQUE (code);


--
-- Name: handling_label_types handling_label_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.handling_label_types
    ADD CONSTRAINT handling_label_types_pkey PRIMARY KEY (id);


--
-- Name: inbound_order_lines inbound_order_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inbound_order_lines
    ADD CONSTRAINT inbound_order_lines_pkey PRIMARY KEY (id);


--
-- Name: inbound_orders inbound_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inbound_orders
    ADD CONSTRAINT inbound_orders_pkey PRIMARY KEY (id);


--
-- Name: inventory_ledger inventory_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_ledger
    ADD CONSTRAINT inventory_ledger_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_invoice_number_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_invoice_number_unique UNIQUE (invoice_number);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: locations locations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (id);


--
-- Name: lots lots_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT lots_pkey PRIMARY KEY (id);


--
-- Name: mapping_configs mapping_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mapping_configs
    ADD CONSTRAINT mapping_configs_pkey PRIMARY KEY (id);


--
-- Name: materials materials_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT materials_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: operation_logs operation_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.operation_logs
    ADD CONSTRAINT operation_logs_pkey PRIMARY KEY (id);


--
-- Name: order_groups order_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_groups
    ADD CONSTRAINT order_groups_pkey PRIMARY KEY (id);


--
-- Name: order_source_companies order_source_companies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_source_companies
    ADD CONSTRAINT order_source_companies_pkey PRIMARY KEY (id);


--
-- Name: passthrough_orders passthrough_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.passthrough_orders
    ADD CONSTRAINT passthrough_orders_pkey PRIMARY KEY (id);


--
-- Name: photos photos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.photos
    ADD CONSTRAINT photos_pkey PRIMARY KEY (id);


--
-- Name: plugins plugins_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plugins
    ADD CONSTRAINT plugins_pkey PRIMARY KEY (id);


--
-- Name: print_templates print_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.print_templates
    ADD CONSTRAINT print_templates_pkey PRIMARY KEY (id);


--
-- Name: product_sub_skus product_sub_skus_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_sub_skus
    ADD CONSTRAINT product_sub_skus_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: return_order_lines return_order_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.return_order_lines
    ADD CONSTRAINT return_order_lines_pkey PRIMARY KEY (id);


--
-- Name: return_orders return_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.return_orders
    ADD CONSTRAINT return_orders_pkey PRIMARY KEY (id);


--
-- Name: rsl_items rsl_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rsl_items
    ADD CONSTRAINT rsl_items_pkey PRIMARY KEY (id);


--
-- Name: rsl_shipment_plans rsl_shipment_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rsl_shipment_plans
    ADD CONSTRAINT rsl_shipment_plans_pkey PRIMARY KEY (id);


--
-- Name: rule_definitions rule_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rule_definitions
    ADD CONSTRAINT rule_definitions_pkey PRIMARY KEY (id);


--
-- Name: scripts scripts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scripts
    ADD CONSTRAINT scripts_pkey PRIMARY KEY (id);


--
-- Name: service_rates service_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_rates
    ADD CONSTRAINT service_rates_pkey PRIMARY KEY (id);


--
-- Name: set_master set_master_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.set_master
    ADD CONSTRAINT set_master_pkey PRIMARY KEY (id);


--
-- Name: shipment_order_materials shipment_order_materials_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipment_order_materials
    ADD CONSTRAINT shipment_order_materials_pkey PRIMARY KEY (id);


--
-- Name: shipment_order_products shipment_order_products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipment_order_products
    ADD CONSTRAINT shipment_order_products_pkey PRIMARY KEY (id);


--
-- Name: shipment_orders shipment_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipment_orders
    ADD CONSTRAINT shipment_orders_pkey PRIMARY KEY (id);


--
-- Name: shipping_rates shipping_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipping_rates
    ADD CONSTRAINT shipping_rates_pkey PRIMARY KEY (id);


--
-- Name: shops shops_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shops
    ADD CONSTRAINT shops_pkey PRIMARY KEY (id);


--
-- Name: shortage_records shortage_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shortage_records
    ADD CONSTRAINT shortage_records_pkey PRIMARY KEY (id);


--
-- Name: slotting_rules slotting_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.slotting_rules
    ADD CONSTRAINT slotting_rules_pkey PRIMARY KEY (id);


--
-- Name: stock_moves stock_moves_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_moves
    ADD CONSTRAINT stock_moves_pkey PRIMARY KEY (id);


--
-- Name: stock_quants stock_quants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_quants
    ADD CONSTRAINT stock_quants_pkey PRIMARY KEY (id);


--
-- Name: stocktaking_discrepancies stocktaking_discrepancies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stocktaking_discrepancies
    ADD CONSTRAINT stocktaking_discrepancies_pkey PRIMARY KEY (id);


--
-- Name: stocktaking_lines stocktaking_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stocktaking_lines
    ADD CONSTRAINT stocktaking_lines_pkey PRIMARY KEY (id);


--
-- Name: stocktaking_orders stocktaking_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stocktaking_orders
    ADD CONSTRAINT stocktaking_orders_pkey PRIMARY KEY (id);


--
-- Name: sub_clients sub_clients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sub_clients
    ADD CONSTRAINT sub_clients_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_code_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_code_unique UNIQUE (code);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: warehouse_tasks warehouse_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouse_tasks
    ADD CONSTRAINT warehouse_tasks_pkey PRIMARY KEY (id);


--
-- Name: warehouses warehouses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT warehouses_pkey PRIMARY KEY (id);


--
-- Name: waves waves_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.waves
    ADD CONSTRAINT waves_pkey PRIMARY KEY (id);


--
-- Name: webhook_logs webhook_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.webhook_logs
    ADD CONSTRAINT webhook_logs_pkey PRIMARY KEY (id);


--
-- Name: webhooks webhooks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.webhooks
    ADD CONSTRAINT webhooks_pkey PRIMARY KEY (id);


--
-- Name: work_charges work_charges_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_charges
    ADD CONSTRAINT work_charges_pkey PRIMARY KEY (id);


--
-- Name: workflow_logs workflow_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_logs
    ADD CONSTRAINT workflow_logs_pkey PRIMARY KEY (id);


--
-- Name: workflows workflows_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflows
    ADD CONSTRAINT workflows_pkey PRIMARY KEY (id);


--
-- Name: api_logs_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX api_logs_created_idx ON public.api_logs USING btree (created_at);


--
-- Name: api_logs_method_path_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX api_logs_method_path_idx ON public.api_logs USING btree (method, path);


--
-- Name: api_logs_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX api_logs_status_idx ON public.api_logs USING btree (status_code);


--
-- Name: api_logs_tenant_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX api_logs_tenant_idx ON public.api_logs USING btree (tenant_id);


--
-- Name: api_logs_user_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX api_logs_user_idx ON public.api_logs USING btree (user_id);


--
-- Name: assembly_orders_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX assembly_orders_status_idx ON public.assembly_orders USING btree (tenant_id, status);


--
-- Name: assembly_orders_tenant_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX assembly_orders_tenant_idx ON public.assembly_orders USING btree (tenant_id);


--
-- Name: auto_rules_tenant_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX auto_rules_tenant_idx ON public.auto_processing_rules USING btree (tenant_id);


--
-- Name: auto_rules_tenant_priority_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX auto_rules_tenant_priority_idx ON public.auto_processing_rules USING btree (tenant_id, priority);


--
-- Name: billing_records_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX billing_records_status_idx ON public.billing_records USING btree (status);


--
-- Name: billing_records_tenant_carrier_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX billing_records_tenant_carrier_idx ON public.billing_records USING btree (tenant_id, carrier_id);


--
-- Name: billing_records_tenant_client_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX billing_records_tenant_client_idx ON public.billing_records USING btree (tenant_id, client_id);


--
-- Name: billing_records_tenant_period_client_carrier_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX billing_records_tenant_period_client_carrier_idx ON public.billing_records USING btree (tenant_id, period, client_id, carrier_id);


--
-- Name: billing_records_tenant_period_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX billing_records_tenant_period_idx ON public.billing_records USING btree (tenant_id, period);


--
-- Name: carrier_automation_tenant_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX carrier_automation_tenant_type_idx ON public.carrier_automation_configs USING btree (tenant_id, carrier_type);


--
-- Name: carrier_session_tenant_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX carrier_session_tenant_type_idx ON public.carrier_session_caches USING btree (tenant_id, carrier_type);


--
-- Name: carriers_code_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX carriers_code_idx ON public.carriers USING btree (code);


--
-- Name: carriers_enabled_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX carriers_enabled_idx ON public.carriers USING btree (enabled);


--
-- Name: carriers_tenant_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX carriers_tenant_idx ON public.carriers USING btree (tenant_id);


--
-- Name: clients_tenant_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX clients_tenant_active_idx ON public.clients USING btree (tenant_id, is_active);


--
-- Name: clients_tenant_code_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX clients_tenant_code_idx ON public.clients USING btree (tenant_id, code);


--
-- Name: country_codes_alpha2_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX country_codes_alpha2_idx ON public.country_codes USING btree (alpha2);


--
-- Name: country_codes_alpha3_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX country_codes_alpha3_idx ON public.country_codes USING btree (alpha3);


--
-- Name: country_codes_region_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX country_codes_region_idx ON public.country_codes USING btree (region);


--
-- Name: custom_fields_tenant_entity_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX custom_fields_tenant_entity_idx ON public.custom_field_definitions USING btree (tenant_id, entity_type);


--
-- Name: custom_fields_tenant_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX custom_fields_tenant_idx ON public.custom_field_definitions USING btree (tenant_id);


--
-- Name: customers_client_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX customers_client_idx ON public.customers USING btree (client_id);


--
-- Name: customers_tenant_code_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX customers_tenant_code_idx ON public.customers USING btree (tenant_id, code);


--
-- Name: daily_reports_tenant_date_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX daily_reports_tenant_date_idx ON public.daily_reports USING btree (tenant_id, date);


--
-- Name: email_templates_tenant_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX email_templates_tenant_idx ON public.email_templates USING btree (tenant_id);


--
-- Name: exception_reports_sla_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX exception_reports_sla_idx ON public.exception_reports USING btree (tenant_id, sla_deadline, status);


--
-- Name: exception_reports_tenant_client_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX exception_reports_tenant_client_idx ON public.exception_reports USING btree (tenant_id, client_id);


--
-- Name: exception_reports_tenant_number_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX exception_reports_tenant_number_idx ON public.exception_reports USING btree (tenant_id, report_number);


--
-- Name: exception_reports_tenant_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX exception_reports_tenant_status_idx ON public.exception_reports USING btree (tenant_id, status, level);


--
-- Name: fba_boxes_plan_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fba_boxes_plan_idx ON public.fba_boxes USING btree (shipment_plan_id);


--
-- Name: fba_boxes_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fba_boxes_status_idx ON public.fba_boxes USING btree (tenant_id, status);


--
-- Name: fba_boxes_tenant_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fba_boxes_tenant_idx ON public.fba_boxes USING btree (tenant_id);


--
-- Name: fba_shipment_plans_amazon_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fba_shipment_plans_amazon_id_idx ON public.fba_shipment_plans USING btree (amazon_shipment_id);


--
-- Name: fba_shipment_plans_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fba_shipment_plans_status_idx ON public.fba_shipment_plans USING btree (tenant_id, status);


--
-- Name: fba_shipment_plans_tenant_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fba_shipment_plans_tenant_idx ON public.fba_shipment_plans USING btree (tenant_id);


--
-- Name: form_templates_client_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX form_templates_client_idx ON public.form_templates USING btree (tenant_id, target_type, client_id);


--
-- Name: form_templates_scope_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX form_templates_scope_idx ON public.form_templates USING btree (tenant_id, target_type, scope, is_active);


--
-- Name: form_templates_tenant_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX form_templates_tenant_idx ON public.form_templates USING btree (tenant_id);


--
-- Name: form_templates_tenant_target_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX form_templates_tenant_target_idx ON public.form_templates USING btree (tenant_id, target_type);


--
-- Name: gift_options_shipment_order_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX gift_options_shipment_order_idx ON public.gift_options USING btree (shipment_order_id);


--
-- Name: gift_options_tenant_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX gift_options_tenant_idx ON public.gift_options USING btree (tenant_id);


--
-- Name: handling_label_types_sort_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX handling_label_types_sort_idx ON public.handling_label_types USING btree (sort_order);


--
-- Name: inbound_lines_order_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX inbound_lines_order_idx ON public.inbound_order_lines USING btree (inbound_order_id);


--
-- Name: inbound_lines_tenant_product_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX inbound_lines_tenant_product_idx ON public.inbound_order_lines USING btree (tenant_id, product_id);


--
-- Name: inbound_orders_tenant_client_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX inbound_orders_tenant_client_idx ON public.inbound_orders USING btree (tenant_id, client_id);


--
-- Name: inbound_orders_tenant_number_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX inbound_orders_tenant_number_idx ON public.inbound_orders USING btree (tenant_id, order_number);


--
-- Name: inbound_orders_tenant_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX inbound_orders_tenant_status_idx ON public.inbound_orders USING btree (tenant_id, status);


--
-- Name: inbound_orders_tenant_warehouse_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX inbound_orders_tenant_warehouse_idx ON public.inbound_orders USING btree (tenant_id, warehouse_id);


--
-- Name: invoices_billing_record_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX invoices_billing_record_idx ON public.invoices USING btree (billing_record_id);


--
-- Name: invoices_due_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX invoices_due_status_idx ON public.invoices USING btree (due_date, status);


--
-- Name: invoices_tenant_client_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX invoices_tenant_client_idx ON public.invoices USING btree (tenant_id, client_id);


--
-- Name: invoices_tenant_period_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX invoices_tenant_period_idx ON public.invoices USING btree (tenant_id, period);


--
-- Name: invoices_tenant_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX invoices_tenant_status_idx ON public.invoices USING btree (tenant_id, status);


--
-- Name: ledger_product_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ledger_product_idx ON public.inventory_ledger USING btree (product_id);


--
-- Name: ledger_tenant_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ledger_tenant_created_idx ON public.inventory_ledger USING btree (tenant_id, created_at);


--
-- Name: locations_tenant_code_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX locations_tenant_code_idx ON public.locations USING btree (tenant_id, code);


--
-- Name: locations_tenant_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX locations_tenant_type_idx ON public.locations USING btree (tenant_id, type);


--
-- Name: locations_warehouse_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX locations_warehouse_idx ON public.locations USING btree (warehouse_id);


--
-- Name: lots_tenant_product_lot_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX lots_tenant_product_lot_idx ON public.lots USING btree (tenant_id, product_id, lot_number);


--
-- Name: mapping_configs_tenant_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX mapping_configs_tenant_idx ON public.mapping_configs USING btree (tenant_id);


--
-- Name: mapping_configs_tenant_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX mapping_configs_tenant_type_idx ON public.mapping_configs USING btree (tenant_id, config_type);


--
-- Name: materials_tenant_category_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX materials_tenant_category_idx ON public.materials USING btree (tenant_id, category);


--
-- Name: materials_tenant_sku_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX materials_tenant_sku_idx ON public.materials USING btree (tenant_id, sku);


--
-- Name: notifications_tenant_user_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX notifications_tenant_user_idx ON public.notifications USING btree (tenant_id, user_id);


--
-- Name: notifications_tenant_user_unread_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX notifications_tenant_user_unread_idx ON public.notifications USING btree (tenant_id, user_id, is_read);


--
-- Name: operation_logs_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX operation_logs_created_idx ON public.operation_logs USING btree (created_at);


--
-- Name: operation_logs_tenant_action_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX operation_logs_tenant_action_idx ON public.operation_logs USING btree (tenant_id, action);


--
-- Name: operation_logs_tenant_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX operation_logs_tenant_idx ON public.operation_logs USING btree (tenant_id);


--
-- Name: operation_logs_tenant_resource_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX operation_logs_tenant_resource_idx ON public.operation_logs USING btree (tenant_id, resource_type, resource_id);


--
-- Name: order_groups_tenant_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX order_groups_tenant_idx ON public.order_groups USING btree (tenant_id);


--
-- Name: order_source_companies_tenant_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX order_source_companies_tenant_idx ON public.order_source_companies USING btree (tenant_id);


--
-- Name: passthrough_orders_client_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX passthrough_orders_client_idx ON public.passthrough_orders USING btree (client_id);


--
-- Name: passthrough_orders_number_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX passthrough_orders_number_idx ON public.passthrough_orders USING btree (tenant_id, order_number);


--
-- Name: passthrough_orders_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX passthrough_orders_status_idx ON public.passthrough_orders USING btree (tenant_id, status);


--
-- Name: passthrough_orders_tenant_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX passthrough_orders_tenant_idx ON public.passthrough_orders USING btree (tenant_id);


--
-- Name: photos_entity_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX photos_entity_idx ON public.photos USING btree (entity_type, entity_id);


--
-- Name: photos_tenant_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX photos_tenant_idx ON public.photos USING btree (tenant_id);


--
-- Name: photos_uploaded_by_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX photos_uploaded_by_idx ON public.photos USING btree (uploaded_by);


--
-- Name: plugins_tenant_enabled_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX plugins_tenant_enabled_idx ON public.plugins USING btree (tenant_id, enabled);


--
-- Name: plugins_tenant_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX plugins_tenant_idx ON public.plugins USING btree (tenant_id);


--
-- Name: print_templates_client_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX print_templates_client_idx ON public.print_templates USING btree (tenant_id, type, client_id);


--
-- Name: print_templates_scope_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX print_templates_scope_idx ON public.print_templates USING btree (tenant_id, type, scope, is_active);


--
-- Name: print_templates_tenant_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX print_templates_tenant_idx ON public.print_templates USING btree (tenant_id);


--
-- Name: print_templates_tenant_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX print_templates_tenant_type_idx ON public.print_templates USING btree (tenant_id, type);


--
-- Name: products_tenant_brand_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX products_tenant_brand_idx ON public.products USING btree (tenant_id, brand_code);


--
-- Name: products_tenant_client_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX products_tenant_client_idx ON public.products USING btree (tenant_id, client_id);


--
-- Name: products_tenant_customer_code_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX products_tenant_customer_code_idx ON public.products USING btree (tenant_id, customer_product_code);


--
-- Name: products_tenant_enterprise_code_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX products_tenant_enterprise_code_idx ON public.products USING btree (tenant_id, enterprise_code);


--
-- Name: products_tenant_house_code_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX products_tenant_house_code_idx ON public.products USING btree (tenant_id, house_code);


--
-- Name: products_tenant_sku_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX products_tenant_sku_idx ON public.products USING btree (tenant_id, sku);


--
-- Name: return_lines_order_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX return_lines_order_idx ON public.return_order_lines USING btree (return_order_id);


--
-- Name: return_lines_tenant_product_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX return_lines_tenant_product_idx ON public.return_order_lines USING btree (tenant_id, product_id);


--
-- Name: return_orders_shipment_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX return_orders_shipment_idx ON public.return_orders USING btree (shipment_order_id);


--
-- Name: return_orders_tenant_client_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX return_orders_tenant_client_idx ON public.return_orders USING btree (tenant_id, client_id);


--
-- Name: return_orders_tenant_number_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX return_orders_tenant_number_idx ON public.return_orders USING btree (tenant_id, order_number);


--
-- Name: return_orders_tenant_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX return_orders_tenant_status_idx ON public.return_orders USING btree (tenant_id, status);


--
-- Name: rsl_items_plan_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX rsl_items_plan_idx ON public.rsl_items USING btree (shipment_plan_id);


--
-- Name: rsl_items_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX rsl_items_status_idx ON public.rsl_items USING btree (tenant_id, status);


--
-- Name: rsl_items_tenant_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX rsl_items_tenant_idx ON public.rsl_items USING btree (tenant_id);


--
-- Name: rsl_shipment_plans_order_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX rsl_shipment_plans_order_idx ON public.rsl_shipment_plans USING btree (rsl_order_id);


--
-- Name: rsl_shipment_plans_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX rsl_shipment_plans_status_idx ON public.rsl_shipment_plans USING btree (tenant_id, status);


--
-- Name: rsl_shipment_plans_tenant_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX rsl_shipment_plans_tenant_idx ON public.rsl_shipment_plans USING btree (tenant_id);


--
-- Name: rule_defs_tenant_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX rule_defs_tenant_idx ON public.rule_definitions USING btree (tenant_id);


--
-- Name: rule_defs_tenant_module_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX rule_defs_tenant_module_idx ON public.rule_definitions USING btree (tenant_id, module);


--
-- Name: rule_defs_tenant_priority_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX rule_defs_tenant_priority_idx ON public.rule_definitions USING btree (tenant_id, priority);


--
-- Name: scripts_tenant_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX scripts_tenant_idx ON public.scripts USING btree (tenant_id);


--
-- Name: service_rates_tenant_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX service_rates_tenant_active_idx ON public.service_rates USING btree (tenant_id, is_active);


--
-- Name: service_rates_tenant_client_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX service_rates_tenant_client_type_idx ON public.service_rates USING btree (tenant_id, client_id, charge_type);


--
-- Name: set_master_set_product_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX set_master_set_product_idx ON public.set_master USING btree (set_product_id);


--
-- Name: set_master_tenant_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX set_master_tenant_idx ON public.set_master USING btree (tenant_id);


--
-- Name: shipment_order_materials_order_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX shipment_order_materials_order_idx ON public.shipment_order_materials USING btree (shipment_order_id);


--
-- Name: shipment_order_products_order_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX shipment_order_products_order_idx ON public.shipment_order_products USING btree (shipment_order_id);


--
-- Name: shipment_order_products_product_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX shipment_order_products_product_idx ON public.shipment_order_products USING btree (product_id);


--
-- Name: shipment_orders_tenant_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX shipment_orders_tenant_created_idx ON public.shipment_orders USING btree (tenant_id, created_at);


--
-- Name: shipment_orders_tenant_order_number_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX shipment_orders_tenant_order_number_idx ON public.shipment_orders USING btree (tenant_id, order_number);


--
-- Name: shipment_orders_tenant_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX shipment_orders_tenant_status_idx ON public.shipment_orders USING btree (tenant_id, status_confirmed, status_shipped);


--
-- Name: shipping_rates_tenant_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX shipping_rates_tenant_active_idx ON public.shipping_rates USING btree (tenant_id, is_active);


--
-- Name: shipping_rates_tenant_carrier_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX shipping_rates_tenant_carrier_active_idx ON public.shipping_rates USING btree (tenant_id, carrier_id, is_active);


--
-- Name: shipping_rates_tenant_carrier_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX shipping_rates_tenant_carrier_idx ON public.shipping_rates USING btree (tenant_id, carrier_id);


--
-- Name: shops_client_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX shops_client_idx ON public.shops USING btree (client_id);


--
-- Name: shops_tenant_code_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX shops_tenant_code_idx ON public.shops USING btree (tenant_id, code);


--
-- Name: shortage_records_product_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX shortage_records_product_idx ON public.shortage_records USING btree (product_id);


--
-- Name: shortage_records_shipment_order_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX shortage_records_shipment_order_idx ON public.shortage_records USING btree (shipment_order_id);


--
-- Name: shortage_records_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX shortage_records_status_idx ON public.shortage_records USING btree (status);


--
-- Name: shortage_records_tenant_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX shortage_records_tenant_idx ON public.shortage_records USING btree (tenant_id);


--
-- Name: slotting_rules_enabled_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX slotting_rules_enabled_idx ON public.slotting_rules USING btree (tenant_id, enabled);


--
-- Name: slotting_rules_priority_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX slotting_rules_priority_idx ON public.slotting_rules USING btree (tenant_id, priority);


--
-- Name: slotting_rules_tenant_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX slotting_rules_tenant_idx ON public.slotting_rules USING btree (tenant_id);


--
-- Name: stock_moves_product_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX stock_moves_product_idx ON public.stock_moves USING btree (product_id);


--
-- Name: stock_moves_reference_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX stock_moves_reference_idx ON public.stock_moves USING btree (reference_type, reference_id);


--
-- Name: stock_moves_tenant_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX stock_moves_tenant_created_idx ON public.stock_moves USING btree (tenant_id, created_at);


--
-- Name: stock_quants_location_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX stock_quants_location_idx ON public.stock_quants USING btree (tenant_id, location_id);


--
-- Name: stock_quants_product_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX stock_quants_product_idx ON public.stock_quants USING btree (tenant_id, product_id);


--
-- Name: stock_quants_unique_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX stock_quants_unique_idx ON public.stock_quants USING btree (tenant_id, product_id, location_id, lot_id);


--
-- Name: stocktaking_discrepancies_order_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX stocktaking_discrepancies_order_idx ON public.stocktaking_discrepancies USING btree (stocktaking_order_id);


--
-- Name: stocktaking_discrepancies_tenant_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX stocktaking_discrepancies_tenant_idx ON public.stocktaking_discrepancies USING btree (tenant_id);


--
-- Name: stocktaking_lines_order_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX stocktaking_lines_order_idx ON public.stocktaking_lines USING btree (stocktaking_order_id);


--
-- Name: stocktaking_lines_product_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX stocktaking_lines_product_idx ON public.stocktaking_lines USING btree (product_id);


--
-- Name: stocktaking_lines_tenant_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX stocktaking_lines_tenant_idx ON public.stocktaking_lines USING btree (tenant_id);


--
-- Name: stocktaking_orders_client_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX stocktaking_orders_client_idx ON public.stocktaking_orders USING btree (tenant_id, client_id);


--
-- Name: stocktaking_orders_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX stocktaking_orders_status_idx ON public.stocktaking_orders USING btree (tenant_id, status);


--
-- Name: stocktaking_orders_tenant_number_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX stocktaking_orders_tenant_number_idx ON public.stocktaking_orders USING btree (tenant_id, order_number);


--
-- Name: stocktaking_orders_warehouse_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX stocktaking_orders_warehouse_idx ON public.stocktaking_orders USING btree (warehouse_id);


--
-- Name: sub_clients_client_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX sub_clients_client_idx ON public.sub_clients USING btree (client_id);


--
-- Name: sub_clients_tenant_code_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX sub_clients_tenant_code_idx ON public.sub_clients USING btree (tenant_id, code);


--
-- Name: sub_skus_product_code_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX sub_skus_product_code_idx ON public.product_sub_skus USING btree (product_id, sub_sku);


--
-- Name: suppliers_tenant_code_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX suppliers_tenant_code_idx ON public.suppliers USING btree (tenant_id, code);


--
-- Name: system_settings_tenant_key_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX system_settings_tenant_key_idx ON public.system_settings USING btree (tenant_id, settings_key);


--
-- Name: warehouse_tasks_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX warehouse_tasks_status_idx ON public.warehouse_tasks USING btree (tenant_id, status);


--
-- Name: warehouse_tasks_tenant_number_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX warehouse_tasks_tenant_number_idx ON public.warehouse_tasks USING btree (tenant_id, task_number);


--
-- Name: warehouse_tasks_warehouse_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX warehouse_tasks_warehouse_idx ON public.warehouse_tasks USING btree (warehouse_id);


--
-- Name: warehouse_tasks_wave_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX warehouse_tasks_wave_idx ON public.warehouse_tasks USING btree (wave_id);


--
-- Name: warehouses_tenant_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX warehouses_tenant_active_idx ON public.warehouses USING btree (tenant_id, is_active);


--
-- Name: warehouses_tenant_code_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX warehouses_tenant_code_idx ON public.warehouses USING btree (tenant_id, code);


--
-- Name: waves_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX waves_status_idx ON public.waves USING btree (tenant_id, status);


--
-- Name: waves_tenant_number_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX waves_tenant_number_idx ON public.waves USING btree (tenant_id, wave_number);


--
-- Name: waves_warehouse_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX waves_warehouse_idx ON public.waves USING btree (warehouse_id);


--
-- Name: webhook_logs_tenant_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX webhook_logs_tenant_idx ON public.webhook_logs USING btree (tenant_id);


--
-- Name: webhook_logs_webhook_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX webhook_logs_webhook_idx ON public.webhook_logs USING btree (webhook_id);


--
-- Name: webhooks_tenant_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX webhooks_tenant_idx ON public.webhooks USING btree (tenant_id);


--
-- Name: work_charges_reference_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX work_charges_reference_idx ON public.work_charges USING btree (reference_id);


--
-- Name: work_charges_tenant_client_billed_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX work_charges_tenant_client_billed_idx ON public.work_charges USING btree (tenant_id, client_id, is_billed);


--
-- Name: work_charges_tenant_date_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX work_charges_tenant_date_idx ON public.work_charges USING btree (tenant_id, charge_date);


--
-- Name: work_charges_tenant_period_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX work_charges_tenant_period_idx ON public.work_charges USING btree (tenant_id, billing_period);


--
-- Name: work_charges_tenant_shop_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX work_charges_tenant_shop_idx ON public.work_charges USING btree (tenant_id, shop_id);


--
-- Name: work_charges_tenant_subclient_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX work_charges_tenant_subclient_idx ON public.work_charges USING btree (tenant_id, sub_client_id);


--
-- Name: workflow_logs_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX workflow_logs_created_idx ON public.workflow_logs USING btree (created_at);


--
-- Name: workflow_logs_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX workflow_logs_status_idx ON public.workflow_logs USING btree (tenant_id, status);


--
-- Name: workflow_logs_tenant_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX workflow_logs_tenant_idx ON public.workflow_logs USING btree (tenant_id);


--
-- Name: workflow_logs_workflow_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX workflow_logs_workflow_idx ON public.workflow_logs USING btree (workflow_id);


--
-- Name: workflows_enabled_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX workflows_enabled_idx ON public.workflows USING btree (tenant_id, enabled);


--
-- Name: workflows_tenant_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX workflows_tenant_idx ON public.workflows USING btree (tenant_id);


--
-- Name: workflows_trigger_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX workflows_trigger_type_idx ON public.workflows USING btree (tenant_id, trigger_type);


--
-- Name: api_logs api_logs_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_logs
    ADD CONSTRAINT api_logs_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: assembly_orders assembly_orders_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assembly_orders
    ADD CONSTRAINT assembly_orders_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: auto_processing_rules auto_processing_rules_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auto_processing_rules
    ADD CONSTRAINT auto_processing_rules_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: billing_records billing_records_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_records
    ADD CONSTRAINT billing_records_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: carrier_automation_configs carrier_automation_configs_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carrier_automation_configs
    ADD CONSTRAINT carrier_automation_configs_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: carrier_session_caches carrier_session_caches_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carrier_session_caches
    ADD CONSTRAINT carrier_session_caches_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: carriers carriers_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carriers
    ADD CONSTRAINT carriers_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: clients clients_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: custom_field_definitions custom_field_definitions_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_field_definitions
    ADD CONSTRAINT custom_field_definitions_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: customers customers_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: daily_reports daily_reports_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_reports
    ADD CONSTRAINT daily_reports_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: email_templates email_templates_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: exception_reports exception_reports_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exception_reports
    ADD CONSTRAINT exception_reports_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: fba_boxes fba_boxes_shipment_plan_id_fba_shipment_plans_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fba_boxes
    ADD CONSTRAINT fba_boxes_shipment_plan_id_fba_shipment_plans_id_fk FOREIGN KEY (shipment_plan_id) REFERENCES public.fba_shipment_plans(id);


--
-- Name: fba_boxes fba_boxes_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fba_boxes
    ADD CONSTRAINT fba_boxes_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: fba_shipment_plans fba_shipment_plans_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fba_shipment_plans
    ADD CONSTRAINT fba_shipment_plans_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: form_templates form_templates_client_id_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_templates
    ADD CONSTRAINT form_templates_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: form_templates form_templates_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_templates
    ADD CONSTRAINT form_templates_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: gift_options gift_options_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gift_options
    ADD CONSTRAINT gift_options_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: inbound_order_lines inbound_order_lines_inbound_order_id_inbound_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inbound_order_lines
    ADD CONSTRAINT inbound_order_lines_inbound_order_id_inbound_orders_id_fk FOREIGN KEY (inbound_order_id) REFERENCES public.inbound_orders(id) ON DELETE CASCADE;


--
-- Name: inbound_order_lines inbound_order_lines_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inbound_order_lines
    ADD CONSTRAINT inbound_order_lines_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: inbound_order_lines inbound_order_lines_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inbound_order_lines
    ADD CONSTRAINT inbound_order_lines_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: inbound_orders inbound_orders_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inbound_orders
    ADD CONSTRAINT inbound_orders_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: inventory_ledger inventory_ledger_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_ledger
    ADD CONSTRAINT inventory_ledger_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: inventory_ledger inventory_ledger_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_ledger
    ADD CONSTRAINT inventory_ledger_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: invoices invoices_billing_record_id_billing_records_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_billing_record_id_billing_records_id_fk FOREIGN KEY (billing_record_id) REFERENCES public.billing_records(id);


--
-- Name: invoices invoices_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: locations locations_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: lots lots_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT lots_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: lots lots_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT lots_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: mapping_configs mapping_configs_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mapping_configs
    ADD CONSTRAINT mapping_configs_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: materials materials_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT materials_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: notifications notifications_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: operation_logs operation_logs_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.operation_logs
    ADD CONSTRAINT operation_logs_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: order_groups order_groups_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_groups
    ADD CONSTRAINT order_groups_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: order_source_companies order_source_companies_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_source_companies
    ADD CONSTRAINT order_source_companies_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: passthrough_orders passthrough_orders_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.passthrough_orders
    ADD CONSTRAINT passthrough_orders_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: photos photos_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.photos
    ADD CONSTRAINT photos_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: plugins plugins_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plugins
    ADD CONSTRAINT plugins_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: print_templates print_templates_client_id_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.print_templates
    ADD CONSTRAINT print_templates_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: print_templates print_templates_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.print_templates
    ADD CONSTRAINT print_templates_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: product_sub_skus product_sub_skus_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_sub_skus
    ADD CONSTRAINT product_sub_skus_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: products products_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: return_order_lines return_order_lines_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.return_order_lines
    ADD CONSTRAINT return_order_lines_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: return_order_lines return_order_lines_return_order_id_return_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.return_order_lines
    ADD CONSTRAINT return_order_lines_return_order_id_return_orders_id_fk FOREIGN KEY (return_order_id) REFERENCES public.return_orders(id) ON DELETE CASCADE;


--
-- Name: return_order_lines return_order_lines_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.return_order_lines
    ADD CONSTRAINT return_order_lines_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: return_orders return_orders_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.return_orders
    ADD CONSTRAINT return_orders_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: rsl_items rsl_items_shipment_plan_id_rsl_shipment_plans_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rsl_items
    ADD CONSTRAINT rsl_items_shipment_plan_id_rsl_shipment_plans_id_fk FOREIGN KEY (shipment_plan_id) REFERENCES public.rsl_shipment_plans(id);


--
-- Name: rsl_items rsl_items_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rsl_items
    ADD CONSTRAINT rsl_items_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: rsl_shipment_plans rsl_shipment_plans_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rsl_shipment_plans
    ADD CONSTRAINT rsl_shipment_plans_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: rule_definitions rule_definitions_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rule_definitions
    ADD CONSTRAINT rule_definitions_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: scripts scripts_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scripts
    ADD CONSTRAINT scripts_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: service_rates service_rates_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_rates
    ADD CONSTRAINT service_rates_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: set_master set_master_component_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.set_master
    ADD CONSTRAINT set_master_component_product_id_products_id_fk FOREIGN KEY (component_product_id) REFERENCES public.products(id);


--
-- Name: set_master set_master_set_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.set_master
    ADD CONSTRAINT set_master_set_product_id_products_id_fk FOREIGN KEY (set_product_id) REFERENCES public.products(id);


--
-- Name: set_master set_master_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.set_master
    ADD CONSTRAINT set_master_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: shipment_order_materials shipment_order_materials_shipment_order_id_shipment_orders_id_f; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipment_order_materials
    ADD CONSTRAINT shipment_order_materials_shipment_order_id_shipment_orders_id_f FOREIGN KEY (shipment_order_id) REFERENCES public.shipment_orders(id) ON DELETE CASCADE;


--
-- Name: shipment_order_materials shipment_order_materials_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipment_order_materials
    ADD CONSTRAINT shipment_order_materials_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: shipment_order_products shipment_order_products_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipment_order_products
    ADD CONSTRAINT shipment_order_products_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: shipment_order_products shipment_order_products_shipment_order_id_shipment_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipment_order_products
    ADD CONSTRAINT shipment_order_products_shipment_order_id_shipment_orders_id_fk FOREIGN KEY (shipment_order_id) REFERENCES public.shipment_orders(id) ON DELETE CASCADE;


--
-- Name: shipment_order_products shipment_order_products_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipment_order_products
    ADD CONSTRAINT shipment_order_products_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: shipment_orders shipment_orders_order_group_id_order_groups_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipment_orders
    ADD CONSTRAINT shipment_orders_order_group_id_order_groups_id_fk FOREIGN KEY (order_group_id) REFERENCES public.order_groups(id);


--
-- Name: shipment_orders shipment_orders_order_source_company_id_order_source_companies_; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipment_orders
    ADD CONSTRAINT shipment_orders_order_source_company_id_order_source_companies_ FOREIGN KEY (order_source_company_id) REFERENCES public.order_source_companies(id);


--
-- Name: shipment_orders shipment_orders_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipment_orders
    ADD CONSTRAINT shipment_orders_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: shipping_rates shipping_rates_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipping_rates
    ADD CONSTRAINT shipping_rates_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: shops shops_client_id_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shops
    ADD CONSTRAINT shops_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: shops shops_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shops
    ADD CONSTRAINT shops_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: shortage_records shortage_records_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shortage_records
    ADD CONSTRAINT shortage_records_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: shortage_records shortage_records_shipment_order_id_shipment_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shortage_records
    ADD CONSTRAINT shortage_records_shipment_order_id_shipment_orders_id_fk FOREIGN KEY (shipment_order_id) REFERENCES public.shipment_orders(id);


--
-- Name: shortage_records shortage_records_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shortage_records
    ADD CONSTRAINT shortage_records_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: slotting_rules slotting_rules_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.slotting_rules
    ADD CONSTRAINT slotting_rules_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: stock_moves stock_moves_from_location_id_locations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_moves
    ADD CONSTRAINT stock_moves_from_location_id_locations_id_fk FOREIGN KEY (from_location_id) REFERENCES public.locations(id);


--
-- Name: stock_moves stock_moves_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_moves
    ADD CONSTRAINT stock_moves_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: stock_moves stock_moves_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_moves
    ADD CONSTRAINT stock_moves_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: stock_moves stock_moves_to_location_id_locations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_moves
    ADD CONSTRAINT stock_moves_to_location_id_locations_id_fk FOREIGN KEY (to_location_id) REFERENCES public.locations(id);


--
-- Name: stock_quants stock_quants_location_id_locations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_quants
    ADD CONSTRAINT stock_quants_location_id_locations_id_fk FOREIGN KEY (location_id) REFERENCES public.locations(id);


--
-- Name: stock_quants stock_quants_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_quants
    ADD CONSTRAINT stock_quants_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: stock_quants stock_quants_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_quants
    ADD CONSTRAINT stock_quants_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: stocktaking_discrepancies stocktaking_discrepancies_location_id_locations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stocktaking_discrepancies
    ADD CONSTRAINT stocktaking_discrepancies_location_id_locations_id_fk FOREIGN KEY (location_id) REFERENCES public.locations(id);


--
-- Name: stocktaking_discrepancies stocktaking_discrepancies_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stocktaking_discrepancies
    ADD CONSTRAINT stocktaking_discrepancies_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: stocktaking_discrepancies stocktaking_discrepancies_stocktaking_order_id_stocktaking_orde; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stocktaking_discrepancies
    ADD CONSTRAINT stocktaking_discrepancies_stocktaking_order_id_stocktaking_orde FOREIGN KEY (stocktaking_order_id) REFERENCES public.stocktaking_orders(id);


--
-- Name: stocktaking_discrepancies stocktaking_discrepancies_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stocktaking_discrepancies
    ADD CONSTRAINT stocktaking_discrepancies_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: stocktaking_lines stocktaking_lines_location_id_locations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stocktaking_lines
    ADD CONSTRAINT stocktaking_lines_location_id_locations_id_fk FOREIGN KEY (location_id) REFERENCES public.locations(id);


--
-- Name: stocktaking_lines stocktaking_lines_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stocktaking_lines
    ADD CONSTRAINT stocktaking_lines_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: stocktaking_lines stocktaking_lines_stocktaking_order_id_stocktaking_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stocktaking_lines
    ADD CONSTRAINT stocktaking_lines_stocktaking_order_id_stocktaking_orders_id_fk FOREIGN KEY (stocktaking_order_id) REFERENCES public.stocktaking_orders(id);


--
-- Name: stocktaking_lines stocktaking_lines_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stocktaking_lines
    ADD CONSTRAINT stocktaking_lines_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: stocktaking_orders stocktaking_orders_client_id_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stocktaking_orders
    ADD CONSTRAINT stocktaking_orders_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: stocktaking_orders stocktaking_orders_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stocktaking_orders
    ADD CONSTRAINT stocktaking_orders_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: stocktaking_orders stocktaking_orders_warehouse_id_warehouses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stocktaking_orders
    ADD CONSTRAINT stocktaking_orders_warehouse_id_warehouses_id_fk FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: sub_clients sub_clients_client_id_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sub_clients
    ADD CONSTRAINT sub_clients_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: sub_clients sub_clients_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sub_clients
    ADD CONSTRAINT sub_clients_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: suppliers suppliers_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: system_settings system_settings_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: users users_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: warehouse_tasks warehouse_tasks_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouse_tasks
    ADD CONSTRAINT warehouse_tasks_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: warehouse_tasks warehouse_tasks_warehouse_id_warehouses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouse_tasks
    ADD CONSTRAINT warehouse_tasks_warehouse_id_warehouses_id_fk FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: warehouse_tasks warehouse_tasks_wave_id_waves_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouse_tasks
    ADD CONSTRAINT warehouse_tasks_wave_id_waves_id_fk FOREIGN KEY (wave_id) REFERENCES public.waves(id);


--
-- Name: warehouses warehouses_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT warehouses_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: waves waves_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.waves
    ADD CONSTRAINT waves_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: waves waves_warehouse_id_warehouses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.waves
    ADD CONSTRAINT waves_warehouse_id_warehouses_id_fk FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: webhook_logs webhook_logs_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.webhook_logs
    ADD CONSTRAINT webhook_logs_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: webhook_logs webhook_logs_webhook_id_webhooks_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.webhook_logs
    ADD CONSTRAINT webhook_logs_webhook_id_webhooks_id_fk FOREIGN KEY (webhook_id) REFERENCES public.webhooks(id) ON DELETE CASCADE;


--
-- Name: webhooks webhooks_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.webhooks
    ADD CONSTRAINT webhooks_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: work_charges work_charges_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_charges
    ADD CONSTRAINT work_charges_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: workflow_logs workflow_logs_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_logs
    ADD CONSTRAINT workflow_logs_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: workflow_logs workflow_logs_workflow_id_workflows_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_logs
    ADD CONSTRAINT workflow_logs_workflow_id_workflows_id_fk FOREIGN KEY (workflow_id) REFERENCES public.workflows(id);


--
-- Name: workflows workflows_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflows
    ADD CONSTRAINT workflows_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- PostgreSQL database dump complete
--

\unrestrict 9WUcVQ8DSJcnQUxYQqJUWqhqU0UzVLvHmlCW73DiFFOb0ppStzT3eqKti1W9tK9

