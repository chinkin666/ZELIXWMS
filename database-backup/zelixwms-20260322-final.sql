--
-- PostgreSQL database dump
--

\restrict 8EbsCLy7388f8oH28NHkLD9iU0vRWxb53evfsyDBcBel8enYX1gZrPXdpjZCLOc

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
    category text DEFAULT '0'::text,
    barcode jsonb DEFAULT '[]'::jsonb,
    jan_code text,
    image_url text,
    memo text,
    customer_product_code text,
    brand_code text,
    brand_name text,
    size_name text,
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
    tax_type text,
    tax_rate numeric,
    currency text,
    cool_type text,
    shipping_size_code text,
    mail_calc_enabled boolean DEFAULT false,
    mail_calc_max_quantity integer,
    inventory_enabled boolean DEFAULT false,
    lot_tracking_enabled boolean DEFAULT false,
    expiry_tracking_enabled boolean DEFAULT false,
    serial_tracking_enabled boolean DEFAULT false,
    alert_days_before_expiry integer DEFAULT 30,
    inbound_expiry_days integer,
    safety_stock integer DEFAULT 0,
    allocation_rule text DEFAULT 'FIFO'::text,
    supplier_code text,
    supplier_name text,
    fnsku text,
    asin text,
    amazon_sku text,
    fba_enabled boolean DEFAULT false,
    rakuten_sku text,
    rsl_enabled boolean DEFAULT false,
    marketplace_codes jsonb DEFAULT '{}'::jsonb,
    wholesale_partner_codes jsonb DEFAULT '{}'::jsonb,
    hazardous_type text DEFAULT '0'::text,
    air_transport_ban boolean DEFAULT false,
    barcode_commission boolean DEFAULT false,
    reservation_target boolean DEFAULT false,
    paid_type text DEFAULT '0'::text,
    country_of_origin text,
    handling_types jsonb DEFAULT '[]'::jsonb,
    default_handling_tags jsonb DEFAULT '[]'::jsonb,
    remarks jsonb DEFAULT '[]'::jsonb,
    custom_fields jsonb DEFAULT '{}'::jsonb,
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
    deleted_at timestamp without time zone,
    abbreviation text,
    enterprise_code text,
    house_code text,
    size_code text,
    color_code text,
    purchase_price numeric,
    tax_category text,
    product_characteristic text DEFAULT 'normal'::text,
    carrier_size_class text,
    appropriate_stock integer,
    ec_channel_codes jsonb DEFAULT '{}'::jsonb,
    b2b_customer_codes jsonb DEFAULT '[]'::jsonb,
    air_prohibited boolean DEFAULT false,
    barcode_outsourced boolean DEFAULT false,
    origin_country_code text,
    inspection_lot boolean DEFAULT false,
    inspection_expiry boolean DEFAULT false,
    inspection_reference boolean DEFAULT false,
    set_product_flag text DEFAULT 'single'::text,
    inner_count integer,
    case_dimension_l numeric,
    case_dimension_w numeric,
    case_dimension_h numeric,
    case_weight numeric,
    case_volume numeric
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
50000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	__builtin_yamato_b2__	ヤマト運輸	\N	t	\N	{"columns": []}	\N	\N	t	1	2026-03-22 12:04:56.841988	2026-03-22 12:04:56.841988
50000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	sagawa	佐川急便	\N	t	\N	{"columns": []}	\N	\N	f	2	2026-03-22 12:04:56.841988	2026-03-22 12:04:56.841988
50000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	japanpost	日本郵便	\N	t	\N	{"columns": []}	\N	\N	f	3	2026-03-22 12:04:56.841988	2026-03-22 12:04:56.841988
50000000-0000-0000-0000-000000000004	00000000-0000-0000-0000-000000000001	seino	西濃運輸	\N	t	\N	{"columns": []}	\N	\N	f	4	2026-03-22 12:04:56.841988	2026-03-22 12:04:56.841988
\.


--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.clients (id, tenant_id, code, name, name2, contact_name, contact_email, contact_phone, postal_code, prefecture, city, address, address2, phone, billing_cycle, credit_tier, is_active, memo, created_at, updated_at, deleted_at) FROM stdin;
20000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	CL-001	EC商店A	EC Shop A	鈴木次郎	suzuki@ecshop-a.co.jp	03-3333-4444	150-0001	東京都	渋谷区	神宮前1-1-1 ECビル3F	\N	03-3333-4444	monthly	\N	t	\N	2026-03-22 12:04:56.838948	2026-03-22 12:04:56.838948	\N
20000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	CL-002	ファッションブランドB	Fashion Brand B	高橋美咲	takahashi@fashion-b.co.jp	06-5555-6666	530-0001	大阪府	大阪市北区	梅田2-3-4 ファッションタワー10F	\N	06-5555-6666	monthly	\N	t	\N	2026-03-22 12:04:56.838948	2026-03-22 12:04:56.838948	\N
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
30000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	\N	CUST-001	渡辺健太	160-0023	東京都	新宿区	西新宿2-8-1 都庁前マンション301	090-1234-5678	watanabe@example.com	\N	\N	\N	\N	\N	\N	2026-03-22 12:04:56.840131	2026-03-22 12:04:56.840131
30000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	\N	CUST-002	伊藤理恵	220-0012	神奈川県	横浜市西区	みなとみらい3-6-1 オーシャンビュー502	080-2345-6789	ito@example.com	\N	\N	\N	\N	\N	\N	2026-03-22 12:04:56.840131	2026-03-22 12:04:56.840131
30000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	\N	CUST-003	小林大輔	530-0011	大阪府	大阪市北区	大深町4-1 グランフロント大阪1205	070-3456-7890	kobayashi@example.com	\N	\N	\N	\N	\N	\N	2026-03-22 12:04:56.840131	2026-03-22 12:04:56.840131
30000000-0000-0000-0000-000000000004	00000000-0000-0000-0000-000000000001	\N	CUST-004	中村さくら	460-0008	愛知県	名古屋市中区	栄3-5-12 栄ハイツ801	090-4567-8901	nakamura@example.com	\N	\N	\N	\N	\N	\N	2026-03-22 12:04:56.840131	2026-03-22 12:04:56.840131
30000000-0000-0000-0000-000000000005	00000000-0000-0000-0000-000000000001	\N	CUST-005	松本翔太	812-0012	福岡県	福岡市博多区	博多駅前2-1-1 博多タワー1503	080-5678-9012	matsumoto@example.com	\N	\N	\N	\N	\N	\N	2026-03-22 12:04:56.840131	2026-03-22 12:04:56.840131
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
0d01b035-9d7c-4979-8ea1-da87175a48b0	00000000-0000-0000-0000-000000000001	【システム】ピッキングリスト	shipment-list-picking	[{"id": "sys_col_1", "type": "single", "field": "sku", "label": "SKU管理番号", "order": 0, "width": "auto", "renderType": "text"}, {"id": "sys_col_2", "type": "single", "field": "name", "label": "印刷用商品名", "order": 1, "width": "auto", "renderType": "text"}, {"id": "sys_col_3", "type": "single", "field": "totalQuantity", "label": "数量", "order": 2, "width": "auto", "renderType": "text"}]	{}	t	system	\N	\N	t	1	システムデフォルト: 出荷商品の集計リスト / 系统默认: 出库商品汇总清单	2026-03-22 11:55:18.334506	2026-03-22 11:55:18.334506
a6680a48-2a63-4769-9140-4d1713773a5a	00000000-0000-0000-0000-000000000001	【システム】出荷明細リスト	shipment-detail-list	[{"id": "sys_col_1", "type": "single", "field": "shipmentNo", "label": "出荷管理No", "order": 0, "width": "auto", "renderType": "text"}, {"id": "sys_col_2", "type": "single", "field": "customerOrderNo", "label": "お客様管理番号", "order": 1, "width": "auto", "renderType": "text"}, {"id": "sys_col_3", "type": "single", "field": "carrierName", "label": "配送業者", "order": 2, "width": "auto", "renderType": "text"}, {"id": "sys_col_4", "type": "single", "field": "shipDate", "label": "出荷予定日", "order": 3, "width": "auto", "dateFormat": "YYYY/MM/DD", "renderType": "date"}, {"id": "sys_col_5", "type": "single", "field": "productSummary", "label": "商品", "order": 4, "width": "auto", "renderType": "text"}, {"id": "sys_col_6", "type": "single", "field": "totalItems", "label": "商品総数", "order": 5, "width": "auto", "renderType": "text"}, {"id": "sys_col_7", "type": "single", "field": "consigneeName", "label": "お届け先名", "order": 6, "width": "auto", "renderType": "text"}]	{}	t	system	\N	\N	t	1	システムデフォルト: 出荷指示の詳細一覧 / 系统默认: 出库指示详细列表	2026-03-22 11:55:18.338752	2026-03-22 11:55:18.338752
c22fe2d3-7f76-49da-8b1c-a9befc373686	00000000-0000-0000-0000-000000000001	【システム】入庫リスト	inbound-detail-list	[{"id": "sys_col_1", "type": "single", "field": "inboundNo", "label": "入庫指示No", "order": 0, "width": "auto", "renderType": "text"}, {"id": "sys_col_2", "type": "single", "field": "status", "label": "ステータス", "order": 1, "width": "auto", "renderType": "text"}, {"id": "sys_col_3", "type": "single", "field": "supplierName", "label": "仕入先", "order": 2, "width": "auto", "renderType": "text"}, {"id": "sys_col_4", "type": "single", "field": "expectedDate", "label": "入荷予定日", "order": 3, "width": "auto", "dateFormat": "YYYY/MM/DD", "renderType": "date"}, {"id": "sys_col_5", "type": "single", "field": "sku", "label": "SKU", "order": 4, "width": "auto", "renderType": "text"}, {"id": "sys_col_6", "type": "single", "field": "productName", "label": "商品名", "order": 5, "width": "auto", "renderType": "text"}, {"id": "sys_col_7", "type": "single", "field": "expectedQty", "label": "入荷予定数", "order": 6, "width": "auto", "renderType": "text"}, {"id": "sys_col_8", "type": "single", "field": "inspectedQty", "label": "検品済数", "order": 7, "width": "auto", "renderType": "text"}]	{}	t	system	\N	\N	t	1	システムデフォルト: 入庫指示のライン明細 / 系统默认: 入库指示行明细	2026-03-22 11:55:18.339397	2026-03-22 11:55:18.339397
30702296-d60f-4f08-8c70-a1ee098af159	00000000-0000-0000-0000-000000000001	【システム】入庫検品シート	inbound-inspection-sheet	[{"id": "sys_col_1", "type": "single", "field": "sku", "label": "SKU", "order": 0, "width": "auto", "renderType": "text"}, {"id": "sys_col_2", "type": "single", "field": "productName", "label": "商品名", "order": 1, "width": "auto", "renderType": "text"}, {"id": "sys_col_3", "type": "single", "field": "barcode", "label": "検品コード", "order": 2, "width": "auto", "renderType": "text"}, {"id": "sys_col_4", "type": "single", "field": "expectedQty", "label": "入荷予定数", "order": 3, "width": "auto", "renderType": "text"}, {"id": "sys_col_5", "type": "single", "field": "inspectedQty", "label": "検品済数", "order": 4, "width": "auto", "renderType": "text"}, {"id": "sys_col_6", "type": "single", "field": "supplierName", "label": "仕入先", "order": 5, "width": "auto", "renderType": "text"}]	{}	t	system	\N	\N	t	1	システムデフォルト: 入庫検品用チェックリスト / 系统默认: 入库检品检查清单	2026-03-22 11:55:18.340013	2026-03-22 11:55:18.340013
0762bff7-c790-4f8f-af83-91fb012767cc	00000000-0000-0000-0000-000000000001	【システム】納品書	delivery-note	[{"id": "sys_col_1", "type": "single", "field": "shipmentNo", "label": "出荷管理No", "order": 0, "width": "auto", "renderType": "text"}, {"id": "sys_col_2", "type": "single", "field": "customerOrderNo", "label": "お客様管理番号", "order": 1, "width": "auto", "renderType": "text"}, {"id": "sys_col_3", "type": "single", "field": "productSummary", "label": "商品", "order": 2, "width": "auto", "renderType": "text"}, {"id": "sys_col_4", "type": "single", "field": "totalItems", "label": "商品総数", "order": 3, "width": "auto", "renderType": "text"}, {"id": "sys_col_5", "type": "single", "field": "consigneeName", "label": "お届け先名", "order": 4, "width": "auto", "renderType": "text"}, {"id": "sys_col_6", "type": "single", "field": "consigneeAddress", "label": "お届け先住所", "order": 5, "width": "auto", "renderType": "text"}]	{}	t	system	\N	\N	t	1	システムデフォルト: B2B出荷用の納品書 / 系统默认: B2B出库用交货单	2026-03-22 11:55:18.340677	2026-03-22 11:55:18.340677
71a15a2e-4218-4388-94b1-b3651a9ee1a0	00000000-0000-0000-0000-000000000001	【システム】商品ラベル	product-label	[{"id": "sys_col_1", "type": "single", "field": "sku", "label": "SKU管理番号", "order": 0, "width": "auto", "renderType": "text"}, {"id": "sys_col_2", "type": "single", "field": "name", "label": "印刷用商品名", "order": 1, "width": "auto", "renderType": "text"}, {"id": "sys_col_3", "type": "single", "field": "barcode", "label": "検品コード", "order": 2, "width": "auto", "renderType": "text"}, {"id": "sys_col_4", "type": "single", "field": "location", "label": "ロケーション", "order": 3, "width": "auto", "renderType": "text"}, {"id": "sys_col_5", "type": "single", "field": "quantity", "label": "数量", "order": 4, "width": "auto", "renderType": "text"}]	{}	t	system	\N	\N	t	1	システムデフォルト: 商品小標籤・外箱ラベル / 系统默认: 商品小标签・外箱标签	2026-03-22 11:55:18.341303	2026-03-22 11:55:18.341303
7baf8b5b-b3ba-4af7-b4a3-3462b38b49b2	00000000-0000-0000-0000-000000000001	【システム】入庫差異リスト	inbound-variance-list	[{"id": "sys_col_1", "type": "single", "field": "inboundNo", "label": "入庫指示No", "order": 0, "width": "auto", "renderType": "text"}, {"id": "sys_col_2", "type": "single", "field": "sku", "label": "SKU", "order": 1, "width": "auto", "renderType": "text"}, {"id": "sys_col_3", "type": "single", "field": "productName", "label": "商品名", "order": 2, "width": "auto", "renderType": "text"}, {"id": "sys_col_4", "type": "single", "field": "expectedQty", "label": "入荷予定数", "order": 3, "width": "auto", "renderType": "text"}, {"id": "sys_col_5", "type": "single", "field": "inspectedQty", "label": "検品済数", "order": 4, "width": "auto", "renderType": "text"}]	{}	t	system	\N	\N	t	1	システムデフォルト: 入荷予定数と実績数の差異 / 系统默认: 预期数量与实际数量差异	2026-03-22 11:55:18.341851	2026-03-22 11:55:18.341851
e0c52a18-b8fc-4845-8409-956d07e17e84	00000000-0000-0000-0000-000000000001	【システム】入庫看板	inbound-kanban	[{"id": "sys_col_1", "type": "single", "field": "inboundNo", "label": "入庫指示No", "order": 0, "width": "auto", "renderType": "text"}, {"id": "sys_col_2", "type": "single", "field": "status", "label": "ステータス", "order": 1, "width": "auto", "renderType": "text"}, {"id": "sys_col_3", "type": "single", "field": "supplierName", "label": "仕入先", "order": 2, "width": "auto", "renderType": "text"}, {"id": "sys_col_4", "type": "single", "field": "expectedDate", "label": "入荷予定日", "order": 3, "width": "auto", "dateFormat": "YYYY/MM/DD", "renderType": "date"}]	{}	t	system	\N	\N	t	1	システムデフォルト: 入庫指示サマリ看板 / 系统默认: 入库指示汇总看板	2026-03-22 11:55:18.342383	2026-03-22 11:55:18.342383
34a5ca39-5590-4ded-bcdb-d3ad8512232a	00000000-0000-0000-0000-000000000001	【システム】入庫実績一覧表	inbound-actual-list	[{"id": "sys_col_1", "type": "single", "field": "inboundNo", "label": "入庫指示No", "order": 0, "width": "auto", "renderType": "text"}, {"id": "sys_col_2", "type": "single", "field": "supplierName", "label": "仕入先", "order": 1, "width": "auto", "renderType": "text"}, {"id": "sys_col_3", "type": "single", "field": "sku", "label": "SKU", "order": 2, "width": "auto", "renderType": "text"}, {"id": "sys_col_4", "type": "single", "field": "productName", "label": "商品名", "order": 3, "width": "auto", "renderType": "text"}, {"id": "sys_col_5", "type": "single", "field": "expectedQty", "label": "入荷予定数", "order": 4, "width": "auto", "renderType": "text"}, {"id": "sys_col_6", "type": "single", "field": "inspectedQty", "label": "検品済数", "order": 5, "width": "auto", "renderType": "text"}, {"id": "sys_col_7", "type": "single", "field": "storedQty", "label": "格納済数", "order": 6, "width": "auto", "renderType": "text"}, {"id": "sys_col_8", "type": "single", "field": "completedAt", "label": "完了日時", "order": 7, "width": "auto", "dateFormat": "YYYY/MM/DD", "renderType": "date"}]	{}	t	system	\N	\N	t	1	システムデフォルト: 完了済み入庫の実績データ / 系统默认: 已完成入库实绩数据	2026-03-22 11:55:18.342939	2026-03-22 11:55:18.342939
2093d337-e5c6-4b6d-9426-071274f11646	00000000-0000-0000-0000-000000000001	【システム】棚卸指示書	stocktaking-instruction	[{"id": "sys_col_1", "type": "single", "field": "sku", "label": "SKU", "order": 0, "width": "auto", "renderType": "text"}, {"id": "sys_col_2", "type": "single", "field": "productName", "label": "商品名", "order": 1, "width": "auto", "renderType": "text"}, {"id": "sys_col_3", "type": "single", "field": "location", "label": "ロケーション", "order": 2, "width": "auto", "renderType": "text"}, {"id": "sys_col_4", "type": "single", "field": "systemQty", "label": "理論在庫数", "order": 3, "width": "auto", "renderType": "text"}]	{}	t	system	\N	\N	t	1	システムデフォルト: 棚卸実施指示情報 / 系统默认: 盘点实施指示信息	2026-03-22 11:55:18.34345	2026-03-22 11:55:18.34345
8c95c4c9-8ae0-4d01-98bf-7c840bf341f5	00000000-0000-0000-0000-000000000001	【システム】棚卸チェックリスト	stocktaking-checklist	[{"id": "sys_col_1", "type": "single", "field": "sku", "label": "SKU", "order": 0, "width": "auto", "renderType": "text"}, {"id": "sys_col_2", "type": "single", "field": "productName", "label": "商品名", "order": 1, "width": "auto", "renderType": "text"}, {"id": "sys_col_3", "type": "single", "field": "location", "label": "ロケーション", "order": 2, "width": "auto", "renderType": "text"}, {"id": "sys_col_4", "type": "single", "field": "systemQty", "label": "理論在庫数", "order": 3, "width": "auto", "renderType": "text"}]	{}	t	system	\N	\N	t	1	システムデフォルト: 棚卸チェック用リスト / 系统默认: 盘点检查清单	2026-03-22 11:55:18.343953	2026-03-22 11:55:18.343953
237d31c1-b0fb-4dc1-934a-4a4da4205123	00000000-0000-0000-0000-000000000001	【システム】棚卸差異リスト	stocktaking-variance	[{"id": "sys_col_1", "type": "single", "field": "sku", "label": "SKU", "order": 0, "width": "auto", "renderType": "text"}, {"id": "sys_col_2", "type": "single", "field": "productName", "label": "商品名", "order": 1, "width": "auto", "renderType": "text"}, {"id": "sys_col_3", "type": "single", "field": "location", "label": "ロケーション", "order": 2, "width": "auto", "renderType": "text"}, {"id": "sys_col_4", "type": "single", "field": "systemQty", "label": "理論在庫数", "order": 3, "width": "auto", "renderType": "text"}, {"id": "sys_col_5", "type": "single", "field": "countedQty", "label": "実棚数", "order": 4, "width": "auto", "renderType": "text"}, {"id": "sys_col_6", "type": "single", "field": "variance", "label": "差異数", "order": 5, "width": "auto", "renderType": "text"}]	{}	t	system	\N	\N	t	1	システムデフォルト: 棚卸結果の差異 / 系统默认: 盘点结果差异	2026-03-22 11:55:18.344509	2026-03-22 11:55:18.344509
48dce878-27a9-4a40-a0ee-99d4f19c7024	00000000-0000-0000-0000-000000000001	【システム】棚卸報告書	stocktaking-report	[{"id": "sys_col_1", "type": "single", "field": "sku", "label": "SKU", "order": 0, "width": "auto", "renderType": "text"}, {"id": "sys_col_2", "type": "single", "field": "productName", "label": "商品名", "order": 1, "width": "auto", "renderType": "text"}, {"id": "sys_col_3", "type": "single", "field": "systemQty", "label": "理論在庫数", "order": 2, "width": "auto", "renderType": "text"}, {"id": "sys_col_4", "type": "single", "field": "countedQty", "label": "実棚数", "order": 3, "width": "auto", "renderType": "text"}, {"id": "sys_col_5", "type": "single", "field": "variance", "label": "差異数", "order": 4, "width": "auto", "renderType": "text"}]	{}	t	system	\N	\N	t	1	システムデフォルト: 棚卸最終報告サマリ / 系统默认: 盘点最终报告汇总	2026-03-22 11:55:18.345064	2026-03-22 11:55:18.345064
77310d0e-15e4-45cf-9713-73fa3839ef9d	00000000-0000-0000-0000-000000000001	【システム】梱包明細	packing-detail	[{"id": "sys_col_1", "type": "single", "field": "shipmentNo", "label": "出荷管理No", "order": 0, "width": "auto", "renderType": "text"}, {"id": "sys_col_2", "type": "single", "field": "sku", "label": "SKU", "order": 1, "width": "auto", "renderType": "text"}, {"id": "sys_col_3", "type": "single", "field": "productName", "label": "商品名", "order": 2, "width": "auto", "renderType": "text"}, {"id": "sys_col_4", "type": "single", "field": "quantity", "label": "数量", "order": 3, "width": "auto", "renderType": "text"}]	{}	t	system	\N	\N	t	1	システムデフォルト: 箱単位の梱包内容 / 系统默认: 按箱装箱内容	2026-03-22 11:55:18.34558	2026-03-22 11:55:18.34558
ec0503d0-d0e5-41e1-b582-3ec27290f085	00000000-0000-0000-0000-000000000001	【システム】出荷未検品一覧	unshipped-list	[{"id": "sys_col_1", "type": "single", "field": "shipmentNo", "label": "出荷管理No", "order": 0, "width": "auto", "renderType": "text"}, {"id": "sys_col_2", "type": "single", "field": "customerOrderNo", "label": "お客様管理番号", "order": 1, "width": "auto", "renderType": "text"}, {"id": "sys_col_3", "type": "single", "field": "shipDate", "label": "出荷予定日", "order": 2, "width": "auto", "dateFormat": "YYYY/MM/DD", "renderType": "date"}, {"id": "sys_col_4", "type": "single", "field": "totalItems", "label": "商品総数", "order": 3, "width": "auto", "renderType": "text"}]	{}	t	system	\N	\N	t	1	システムデフォルト: 未検品の出荷注文一覧 / 系统默认: 未检品出库订单列表	2026-03-22 11:55:18.346077	2026-03-22 11:55:18.346077
f0c25a0f-ba06-4a44-acc6-d59306019407	00000000-0000-0000-0000-000000000001	【システム】配送証明 POD	pod-delivery-proof	[{"id": "sys_col_1", "type": "single", "field": "shipmentNo", "label": "出荷管理No", "order": 0, "width": "auto", "renderType": "text"}, {"id": "sys_col_2", "type": "single", "field": "carrierName", "label": "配送業者", "order": 1, "width": "auto", "renderType": "text"}, {"id": "sys_col_3", "type": "single", "field": "consigneeName", "label": "お届け先名", "order": 2, "width": "auto", "renderType": "text"}, {"id": "sys_col_4", "type": "single", "field": "consigneeAddress", "label": "お届け先住所", "order": 3, "width": "auto", "renderType": "text"}, {"id": "sys_col_5", "type": "single", "field": "deliveredAt", "label": "配達完了日時", "order": 4, "width": "auto", "dateFormat": "YYYY/MM/DD HH:mm", "renderType": "date"}]	{}	t	system	\N	\N	t	1	システムデフォルト: 配達完了の証明データ / 系统默认: 配送完成证明数据	2026-03-22 11:55:18.346613	2026-03-22 11:55:18.346613
4a682565-e649-4a60-8ca4-d9dcc11d4e1d	00000000-0000-0000-0000-000000000001	【システム】在庫証明書	inventory-certificate	[{"id": "sys_col_1", "type": "single", "field": "sku", "label": "SKU管理番号", "order": 0, "width": "auto", "renderType": "text"}, {"id": "sys_col_2", "type": "single", "field": "productName", "label": "商品名", "order": 1, "width": "auto", "renderType": "text"}, {"id": "sys_col_3", "type": "single", "field": "location", "label": "ロケーション", "order": 2, "width": "auto", "renderType": "text"}, {"id": "sys_col_4", "type": "single", "field": "quantity", "label": "数量", "order": 3, "width": "auto", "renderType": "text"}]	{}	t	system	\N	\N	t	1	システムデフォルト: 在庫証明データ / 系统默认: 库存证明数据	2026-03-22 11:55:18.347128	2026-03-22 11:55:18.347128
031031d9-0873-4c86-a7d9-d83631412f7c	00000000-0000-0000-0000-000000000001	【システム】FBA報告データ	fba-report	[{"id": "sys_col_1", "type": "single", "field": "sku", "label": "SKU", "order": 0, "width": "auto", "renderType": "text"}, {"id": "sys_col_2", "type": "single", "field": "productName", "label": "商品名", "order": 1, "width": "auto", "renderType": "text"}, {"id": "sys_col_3", "type": "single", "field": "quantity", "label": "数量", "order": 2, "width": "auto", "renderType": "text"}]	{}	t	system	\N	\N	t	1	システムデフォルト: Amazon FBA出荷プラン報告 / 系统默认: Amazon FBA出货计划报告	2026-03-22 11:55:18.34767	2026-03-22 11:55:18.34767
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
67d45191-6744-4c2b-9bf7-32a629d7c67f	00000000-0000-0000-0000-000000000001	70000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000001	SKU-001	200	200	0	\N	\N	\N	\N	0	[]	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	free	\N	f	\N	\N	\N	\N	\N	\N	\N	JPY	{}	2026-03-22 12:07:17.262251	2026-03-22 12:07:17.262251
ec7c6423-52d4-4a80-836b-c8d376bda379	00000000-0000-0000-0000-000000000001	70000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000002	SKU-002	50	48	2	\N	\N	\N	\N	0	[]	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	free	\N	f	\N	\N	\N	\N	\N	\N	\N	JPY	{}	2026-03-22 12:07:17.262251	2026-03-22 12:07:17.262251
2c198501-f1dd-4607-b06e-1adbcd121df4	00000000-0000-0000-0000-000000000001	70000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000003	SKU-003	30	30	0	\N	\N	\N	\N	0	[]	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	free	\N	f	\N	\N	\N	\N	\N	\N	\N	JPY	{}	2026-03-22 12:07:17.262251	2026-03-22 12:07:17.262251
e467eadc-62d9-4799-8886-4e8d6116eef0	00000000-0000-0000-0000-000000000001	70000000-0000-0000-0000-000000000002	60000000-0000-0000-0000-000000000007	SKU-007	120	120	0	\N	\N	\N	\N	0	[]	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	free	\N	f	\N	\N	\N	\N	\N	\N	\N	JPY	{}	2026-03-22 12:07:17.265016	2026-03-22 12:07:17.265016
2d4680a9-cf55-4a9b-845e-8490ee83b344	00000000-0000-0000-0000-000000000001	70000000-0000-0000-0000-000000000002	60000000-0000-0000-0000-000000000008	SKU-008	100	100	0	\N	\N	\N	\N	0	[]	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	free	\N	f	\N	\N	\N	\N	\N	\N	\N	JPY	{}	2026-03-22 12:07:17.265016	2026-03-22 12:07:17.265016
5bef1a16-bfec-43b2-96c0-857cfc329445	00000000-0000-0000-0000-000000000001	70000000-0000-0000-0000-000000000002	60000000-0000-0000-0000-000000000009	SKU-009	50	48	2	\N	\N	\N	\N	0	[]	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	free	\N	f	\N	\N	\N	\N	\N	\N	\N	JPY	{}	2026-03-22 12:07:17.265016	2026-03-22 12:07:17.265016
b37eef58-00a5-4edf-9049-d2beb132bc6a	00000000-0000-0000-0000-000000000001	70000000-0000-0000-0000-000000000003	60000000-0000-0000-0000-000000000015	SKU-015	300	200	0	\N	\N	\N	\N	0	[]	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	free	\N	f	\N	\N	\N	\N	\N	\N	\N	JPY	{}	2026-03-22 12:07:17.265845	2026-03-22 12:07:17.265845
41b429fb-9e96-4a51-a7e8-ecb96a94b85d	00000000-0000-0000-0000-000000000001	70000000-0000-0000-0000-000000000003	60000000-0000-0000-0000-000000000016	SKU-016	150	120	0	\N	\N	\N	\N	0	[]	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	free	\N	f	\N	\N	\N	\N	\N	\N	\N	JPY	{}	2026-03-22 12:07:17.265845	2026-03-22 12:07:17.265845
db7dc547-aef2-46b6-83ec-58d6954d9463	00000000-0000-0000-0000-000000000001	70000000-0000-0000-0000-000000000003	60000000-0000-0000-0000-000000000017	SKU-017	200	180	0	\N	\N	\N	\N	0	[]	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	free	\N	f	\N	\N	\N	\N	\N	\N	\N	JPY	{}	2026-03-22 12:07:17.265845	2026-03-22 12:07:17.265845
8fcffe97-20ac-46ff-a02e-1f8bc02b0aaf	00000000-0000-0000-0000-000000000001	70000000-0000-0000-0000-000000000004	60000000-0000-0000-0000-000000000019	SKU-019	100	24	0	\N	\N	\N	\N	0	[]	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	free	\N	f	\N	\N	\N	\N	\N	\N	\N	JPY	{}	2026-03-22 12:07:17.266538	2026-03-22 12:07:17.266538
db8d0e64-3419-4c67-a9e5-74b48b3fefc1	00000000-0000-0000-0000-000000000001	70000000-0000-0000-0000-000000000004	60000000-0000-0000-0000-000000000020	SKU-020	60	0	0	\N	\N	\N	\N	0	[]	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	free	\N	f	\N	\N	\N	\N	\N	\N	\N	JPY	{}	2026-03-22 12:07:17.266538	2026-03-22 12:07:17.266538
437c825b-a006-4c6a-a678-7eb8e5f4d19d	00000000-0000-0000-0000-000000000001	70000000-0000-0000-0000-000000000005	60000000-0000-0000-0000-000000000010	SKU-010	50	0	0	\N	\N	\N	\N	0	[]	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	free	\N	f	\N	\N	\N	\N	\N	\N	\N	JPY	{}	2026-03-22 12:07:17.267204	2026-03-22 12:07:17.267204
b46e6459-cb88-4a3e-bd48-f41922d456a5	00000000-0000-0000-0000-000000000001	70000000-0000-0000-0000-000000000005	60000000-0000-0000-0000-000000000013	SKU-013	40	0	0	\N	\N	\N	\N	0	[]	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	free	\N	f	\N	\N	\N	\N	\N	\N	\N	JPY	{}	2026-03-22 12:07:17.267204	2026-03-22 12:07:17.267204
a2f6fddb-f41d-4c39-b837-67ef5c41cc14	00000000-0000-0000-0000-000000000001	70000000-0000-0000-0000-000000000005	60000000-0000-0000-0000-000000000014	SKU-014	60	0	0	\N	\N	\N	\N	0	[]	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	free	\N	f	\N	\N	\N	\N	\N	\N	\N	JPY	{}	2026-03-22 12:07:17.267204	2026-03-22 12:07:17.267204
\.


--
-- Data for Name: inbound_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inbound_orders (id, tenant_id, order_number, status, flow_type, client_id, supplier_id, warehouse_id, expected_date, notes, linked_order_ids, fba_info, rsl_info, b2b_info, service_options, is_cod_delivery, is_unplanned, po_number, desired_date, supplier_name, supplier_phone, supplier_postal_code, supplier_address, completion_flag, completion_date, import_control_number, import_control_date, delivery_company, delivery_slip_number, inbound_comment, container_type, total_cbm, total_pallets, created_at, updated_at, deleted_at) FROM stdin;
70000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	IO-2026-0301	done	standard	20000000-0000-0000-0000-000000000001	10000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000003	2026-03-10 09:00:00	USBケーブル・モバイルバッテリー入荷	[]	\N	\N	\N	[]	f	f	\N	\N	株式会社山田商事	\N	\N	\N	t	2026-03-10 15:30:00	\N	\N	\N	\N	\N	\N	\N	0	2026-03-08 10:00:00	2026-03-22 12:07:17.256709	\N
70000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	IO-2026-0302	done	standard	20000000-0000-0000-0000-000000000002	10000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000003	2026-03-12 09:00:00	Tシャツ・デニム入荷	[]	\N	\N	\N	[]	f	f	\N	\N	大阪製造所	\N	\N	\N	t	2026-03-12 14:00:00	\N	\N	\N	\N	\N	\N	\N	0	2026-03-10 11:00:00	2026-03-22 12:07:17.259693	\N
70000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	IO-2026-0303	receiving	standard	20000000-0000-0000-0000-000000000001	10000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000003	2026-03-22 09:00:00	日用品補充入荷 検品中	[]	\N	\N	\N	[]	f	f	\N	\N	東京物産株式会社	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	0	2026-03-20 14:00:00	2026-03-22 12:07:17.260448	\N
70000000-0000-0000-0000-000000000004	00000000-0000-0000-0000-000000000001	IO-2026-0304	receiving	standard	20000000-0000-0000-0000-000000000001	10000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000003	2026-03-22 10:00:00	プロテインバー大量入荷	[]	\N	\N	\N	[]	f	f	\N	\N	株式会社山田商事	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	0	2026-03-21 09:00:00	2026-03-22 12:07:17.261084	\N
70000000-0000-0000-0000-000000000005	00000000-0000-0000-0000-000000000001	IO-2026-0305	confirmed	standard	20000000-0000-0000-0000-000000000002	10000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000003	2026-03-25 09:00:00	春物新作入荷予定	[]	\N	\N	\N	[]	f	f	\N	\N	大阪製造所	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	0	2026-03-22 08:00:00	2026-03-22 12:07:17.261698	\N
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
f72b7bb3-1c8d-4c1e-ba57-61061e25b10e	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000003	\N	A-01-01	棚A-01-01	shelf	MAIN/A-01-01	\N	\N	\N	t	1	\N	2026-03-22 12:04:24.486326	2026-03-22 12:04:24.486326
027e5377-3b6e-4d43-b33a-9309aef750d6	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000003	\N	A-01-02	棚A-01-02	shelf	MAIN/A-01-02	\N	\N	\N	t	2	\N	2026-03-22 12:04:24.486326	2026-03-22 12:04:24.486326
b29c2424-a7ad-4b69-a627-34720cd5ce78	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000003	\N	A-01-03	棚A-01-03	shelf	MAIN/A-01-03	\N	\N	\N	t	3	\N	2026-03-22 12:04:24.486326	2026-03-22 12:04:24.486326
cbb780e3-185c-43b3-81ea-508ea3aaecda	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000003	\N	A-02-01	棚A-02-01	shelf	MAIN/A-02-01	\N	\N	\N	t	4	\N	2026-03-22 12:04:24.486326	2026-03-22 12:04:24.486326
8b40a27f-d2ed-4a59-b1b4-c32329467ea9	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000003	\N	A-02-02	棚A-02-02	shelf	MAIN/A-02-02	\N	\N	\N	t	5	\N	2026-03-22 12:04:24.486326	2026-03-22 12:04:24.486326
41eb3cd5-37f2-4697-9c84-dc13b57d2fa7	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000003	\N	A-02-03	棚A-02-03	shelf	MAIN/A-02-03	\N	\N	\N	t	6	\N	2026-03-22 12:04:24.486326	2026-03-22 12:04:24.486326
af75ee54-509a-4884-8b0b-090931f27723	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000003	\N	A-03-01	棚A-03-01	shelf	MAIN/A-03-01	\N	\N	\N	t	7	\N	2026-03-22 12:04:24.486326	2026-03-22 12:04:24.486326
d441387f-ec8a-489e-99cf-59e9ca45fc6a	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000003	\N	A-03-02	棚A-03-02	shelf	MAIN/A-03-02	\N	\N	\N	t	8	\N	2026-03-22 12:04:24.486326	2026-03-22 12:04:24.486326
2e59b2c0-4634-403d-907a-209086d302f4	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000003	\N	A-03-03	棚A-03-03	shelf	MAIN/A-03-03	\N	\N	\N	t	9	\N	2026-03-22 12:04:24.486326	2026-03-22 12:04:24.486326
4ff57fc0-bb61-42c9-9f85-e938516aefa5	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000003	\N	B-01-01	棚B-01-01	shelf	MAIN/B-01-01	\N	\N	\N	t	10	\N	2026-03-22 12:04:24.486326	2026-03-22 12:04:24.486326
5bdee045-a10a-41e4-bf9a-70af3997309c	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000003	\N	B-01-02	棚B-01-02	shelf	MAIN/B-01-02	\N	\N	\N	t	11	\N	2026-03-22 12:04:24.486326	2026-03-22 12:04:24.486326
310b3b77-e958-4217-a376-e7413b5d88af	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000003	\N	B-02-01	棚B-02-01	shelf	MAIN/B-02-01	\N	\N	\N	t	12	\N	2026-03-22 12:04:24.486326	2026-03-22 12:04:24.486326
48257e1a-06e3-4407-bdc4-827acce82c0a	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000003	\N	B-02-02	棚B-02-02	shelf	MAIN/B-02-02	\N	\N	\N	t	13	\N	2026-03-22 12:04:24.486326	2026-03-22 12:04:24.486326
ba0f75a6-9bc8-4952-9a20-c28993ad4f93	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000003	\N	RR-RR-RR	入荷仮置き場	receiving	MAIN/RR-RR-RR	\N	\N	\N	t	90	\N	2026-03-22 12:04:24.486326	2026-03-22 12:04:24.486326
7f301ee5-1152-4aca-bbc5-94b0257a3931	00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000003	\N	SHIP-01	出荷ステージング	shipping	MAIN/SHIP-01	\N	\N	\N	t	91	\N	2026-03-22 12:04:24.486326	2026-03-22 12:04:24.486326
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
90b10aa4-2b5c-44ae-81bb-13f63055f15d	00000000-0000-0000-0000-000000000001	order-to-carrier	佐川急便 e飛伝3 出荷指示エクスポート	佐川急便 e飛伝3 CSV出力用マッピング（標準_飛脚宅配便_CSV_ヘッダ無形式、74列）/ 佐川急便 e飞传3 CSV输出映射（标准_飞脚宅配便_CSV_无标题格式，74列）	[{"note": "未使用 / 未使用", "required": false, "columnIndex": 0, "sourceField": null, "targetField": "お届け先コード取得区分"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 1, "sourceField": null, "targetField": "お届け先コード"}, {"note": "配送先電話番号 / 收件人电话", "required": true, "columnIndex": 2, "sourceField": "recipientPhone", "targetField": "お届け先電話番号"}, {"note": "配送先郵便番号 / 收件人邮编", "required": true, "columnIndex": 3, "sourceField": "recipientPostalCode", "targetField": "お届け先郵便番号"}, {"note": "最大32バイト / 最大32字节", "required": true, "columnIndex": 4, "sourceField": "recipientAddress1", "targetField": "お届け先住所１"}, {"note": "33バイト目～64バイト / 第33~64字节", "required": false, "columnIndex": 5, "sourceField": "recipientAddress2", "targetField": "お届け先住所２"}, {"note": "65バイト目以降 / 第65字节以后", "required": false, "columnIndex": 6, "sourceField": "recipientAddress3", "targetField": "お届け先住所３"}, {"note": "配送先名 / 收件人名", "required": true, "columnIndex": 7, "sourceField": "recipientName", "targetField": "お届け先名称１"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 8, "sourceField": null, "targetField": "お届け先名称２"}, {"note": "受注番号_配送番号 / 订单号_配送号 (orderNumber + '_' + deliveryNumber)", "required": true, "columnIndex": 9, "sourceField": "orderNumber_deliveryNumber", "targetField": "お客様管理ナンバー"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 10, "sourceField": null, "targetField": "お客様コード"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 11, "sourceField": null, "targetField": "部署ご担当者コード取得区分"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 12, "sourceField": null, "targetField": "部署ご担当者コード"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 13, "sourceField": null, "targetField": "部署ご担当者名称"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 14, "sourceField": null, "targetField": "荷送人電話番号"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 15, "sourceField": null, "targetField": "ご依頼主コード取得区分"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 16, "sourceField": null, "targetField": "ご依頼主コード"}, {"note": "ギフト：注文者電話 / 否则：店舗電話 / 礼品:下单人电话 / 否则:店铺电话", "required": true, "columnIndex": 17, "sourceField": "senderPhone", "targetField": "ご依頼主電話番号"}, {"note": "ギフト：注文者郵便番号 / 否则：店舗郵便番号 / 礼品:下单人邮编 / 否则:店铺邮编", "required": true, "columnIndex": 18, "sourceField": "senderPostalCode", "targetField": "ご依頼主郵便番号"}, {"note": "最大32バイト / 最大32字节", "required": true, "columnIndex": 19, "sourceField": "senderAddress1", "targetField": "ご依頼主住所１"}, {"note": "33バイト目以降 / 第33字节以后", "required": false, "columnIndex": 20, "sourceField": "senderAddress2", "targetField": "ご依頼主住所２"}, {"note": "ギフト：注文者名 / 否则：企業名 / 礼品:下单人名 / 否则:企业名", "required": true, "columnIndex": 21, "sourceField": "senderName", "targetField": "ご依頼主名称１"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 22, "sourceField": null, "targetField": "ご依頼主名称２"}, {"note": "001:箱類 002:バッグ 003:スーツケース 004:封筒 005:ゴルフ 006:スキー 007:スノボ 008:その他", "required": false, "columnIndex": 23, "sourceField": "packageTypeCode", "targetField": "荷姿"}, {"note": "品名（最大32バイト）/ 品名（最大32字节）", "required": true, "columnIndex": 24, "sourceField": "productName1", "targetField": "品名１"}, {"note": "品名オーバーフロー / 品名溢出（33~64バイト）", "required": false, "columnIndex": 25, "sourceField": "productName2", "targetField": "品名２"}, {"note": "品名オーバーフロー / 品名溢出（65バイト以降）", "required": false, "columnIndex": 26, "sourceField": "productName3", "targetField": "品名３"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 27, "sourceField": null, "targetField": "品名４"}, {"note": "EAZY配達場所（クール便001＋代引以外時）/ EAZY配送地点（冷藏001+非代引时）", "required": false, "columnIndex": 28, "sourceField": "eazyDeliveryLocation", "targetField": "品名５"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 29, "sourceField": null, "targetField": "荷札荷姿"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 30, "sourceField": null, "targetField": "荷札品名１"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 31, "sourceField": null, "targetField": "荷札品名２"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 32, "sourceField": null, "targetField": "荷札品名３"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 33, "sourceField": null, "targetField": "荷札品名４"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 34, "sourceField": null, "targetField": "荷札品名５"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 35, "sourceField": null, "targetField": "荷札品名６"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 36, "sourceField": null, "targetField": "荷札品名７"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 37, "sourceField": null, "targetField": "荷札品名８"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 38, "sourceField": null, "targetField": "荷札品名９"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 39, "sourceField": null, "targetField": "荷札品名１０"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 40, "sourceField": null, "targetField": "荷札品名１１"}, {"note": "固定値「1」/ 固定值「1」", "required": true, "fixedValue": "1", "columnIndex": 41, "sourceField": null, "targetField": "出荷個数"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 42, "sourceField": null, "targetField": "スピード指定"}, {"note": "001:通常 002:冷蔵 003:冷凍 / 001:常温 002:冷藏 003:冷冻", "required": true, "columnIndex": 43, "sourceField": "coolType", "targetField": "クール便指定"}, {"note": "配送日 / 配送日期", "required": false, "columnIndex": 44, "sourceField": "deliveryDate", "targetField": "配達日"}, {"note": "01:午前中 12:12-14 14:14-16 16:16-18 18:18-20 04:18-21 19:19-21", "required": false, "columnIndex": 45, "sourceField": "deliveryTimeSlot", "targetField": "配達指定時間帯"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 46, "sourceField": null, "targetField": "配達指定時間（時分）"}, {"note": "代金引換額 / 货到付款金额", "required": false, "columnIndex": 47, "sourceField": "codAmount", "targetField": "代引金額"}, {"note": "代引時のみ出力 / 仅代引时输出", "required": false, "columnIndex": 48, "sourceField": "codTax", "targetField": "消費税"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 49, "sourceField": null, "targetField": "決済種別"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 50, "sourceField": null, "targetField": "保険金額"}, {"note": "シール1 / 贴纸1", "required": false, "columnIndex": 51, "sourceField": "stickerCode1", "targetField": "指定シール１"}, {"note": "シール2 / 贴纸2", "required": false, "columnIndex": 52, "sourceField": "stickerCode2", "targetField": "指定シール２"}, {"note": "シール3 / 贴纸3", "required": false, "columnIndex": 53, "sourceField": "stickerCode3", "targetField": "指定シール３"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 54, "sourceField": null, "targetField": "営業所受取"}, {"note": "固定値「0」/ 固定值「0」", "required": false, "fixedValue": "0", "columnIndex": 55, "sourceField": null, "targetField": "SRC区分"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 56, "sourceField": null, "targetField": "営業所受取営業所コード"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 57, "sourceField": null, "targetField": "元着区分"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 58, "sourceField": null, "targetField": "メールアドレス"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 59, "sourceField": null, "targetField": "ご不在時連絡先"}, {"note": "出荷日 / 出货日", "required": true, "columnIndex": 60, "sourceField": "shipDate", "targetField": "出荷日"}, {"note": "未使用（確定後に付与）/ 未使用（确认后赋值）", "required": false, "columnIndex": 61, "sourceField": null, "targetField": "お問い合せ送り状No."}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 62, "sourceField": null, "targetField": "出荷場印字区分"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 63, "sourceField": null, "targetField": "集約解除指定"}, {"note": "予備 / 预留", "required": false, "columnIndex": 64, "sourceField": null, "targetField": "編集０１"}, {"note": "予備 / 预留", "required": false, "columnIndex": 65, "sourceField": null, "targetField": "編集０２"}, {"note": "予備 / 预留", "required": false, "columnIndex": 66, "sourceField": null, "targetField": "編集０３"}, {"note": "予備 / 预留", "required": false, "columnIndex": 67, "sourceField": null, "targetField": "編集０４"}, {"note": "予備 / 预留", "required": false, "columnIndex": 68, "sourceField": null, "targetField": "編集０５"}, {"note": "予備 / 预留", "required": false, "columnIndex": 69, "sourceField": null, "targetField": "編集０６"}, {"note": "予備 / 预留", "required": false, "columnIndex": 70, "sourceField": null, "targetField": "編集０７"}, {"note": "予備 / 预留", "required": false, "columnIndex": 71, "sourceField": null, "targetField": "編集０８"}, {"note": "予備 / 预留", "required": false, "columnIndex": 72, "sourceField": null, "targetField": "編集０９"}, {"note": "予備 / 预留", "required": false, "columnIndex": 73, "sourceField": null, "targetField": "編集１０"}]	sagawa	t	2026-03-22 11:55:18.126829	2026-03-22 11:55:18.126829
9602a1aa-ddd1-4c19-a27f-fd13ecb81981	00000000-0000-0000-0000-000000000001	order-to-carrier	ヤマト運輸 B2 出荷指示エクスポート	ヤマト運輸 B2クラウド CSV出力用マッピング（基本レイアウトテンプレート形式、76列）/ 雅玛多运输 B2 Cloud CSV输出映射（基本布局模板格式，76列）	[{"note": "受注番号_配送番号 / 订单号_配送号", "required": true, "columnIndex": 0, "sourceField": "orderNumber_deliveryNumber", "targetField": "お客様管理番号"}, {"note": "0:発払 2:コレクト 3:DM 4:タイム 7:ネコポス 8:宅急便コンパクト 9:EAZY", "required": true, "columnIndex": 1, "sourceField": "invoiceType", "targetField": "送り状種別"}, {"note": "空白:通常 2:冷蔵 3:冷凍 / 空:常温 2:冷藏 3:冷冻", "required": false, "columnIndex": 2, "sourceField": "coolType", "targetField": "クール区分"}, {"note": "空白（確定後に付与）/ 空白（确认后赋值）", "required": false, "columnIndex": 3, "sourceField": null, "targetField": "伝票番号"}, {"note": "出荷日 / 出货日", "required": true, "columnIndex": 4, "sourceField": "shipDate", "targetField": "出荷予定日"}, {"note": "配送日 / 配送日期", "required": false, "columnIndex": 5, "sourceField": "deliveryDate", "targetField": "お届け予定（指定）日"}, {"note": "01:午前中 12:12-14 14:14-16 16:16-18 18:18-20 20:20-21", "required": false, "columnIndex": 6, "sourceField": "deliveryTimeSlot", "targetField": "配達時間帯"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 7, "sourceField": null, "targetField": "お届け先コード"}, {"note": "配送先電話番号 / 收件人电话", "required": true, "columnIndex": 8, "sourceField": "recipientPhone", "targetField": "お届け先電話番号"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 9, "sourceField": null, "targetField": "お届け先電話番号枝番"}, {"note": "配送先郵便番号 / 收件人邮编", "required": true, "columnIndex": 10, "sourceField": "recipientPostalCode", "targetField": "お届け先郵便番号"}, {"note": "最大32バイト / 最大32字节", "required": true, "columnIndex": 11, "sourceField": "recipientAddress1", "targetField": "お届け先住所"}, {"note": "33バイト目以降 / 第33字节以后", "required": false, "columnIndex": 12, "sourceField": "recipientAddress2", "targetField": "お届け先住所（アパートマンション名）"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 13, "sourceField": null, "targetField": "お届け先会社・部門名１"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 14, "sourceField": null, "targetField": "お届け先会社・部門名２"}, {"note": "配送先名 / 收件人名", "required": true, "columnIndex": 15, "sourceField": "recipientName", "targetField": "お届け先名"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 16, "sourceField": null, "targetField": "お届け先名略称カナ"}, {"note": "固定値「様」/ 固定值「様」", "required": true, "fixedValue": "様", "columnIndex": 17, "sourceField": null, "targetField": "敬称"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 18, "sourceField": null, "targetField": "ご依頼主コード"}, {"note": "ギフト：注文者電話 / 否则：店舗電話 / 礼品:下单人电话 / 否则:店铺电话", "required": true, "columnIndex": 19, "sourceField": "senderPhone", "targetField": "ご依頼主電話番号"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 20, "sourceField": null, "targetField": "ご依頼主電話番号枝番"}, {"note": "ギフト：注文者郵便番号 / 否则：店舗郵便番号 / 礼品:下单人邮编 / 否则:店铺邮编", "required": true, "columnIndex": 21, "sourceField": "senderPostalCode", "targetField": "ご依頼主郵便番号"}, {"note": "最大32バイト / 最大32字节", "required": true, "columnIndex": 22, "sourceField": "senderAddress1", "targetField": "ご依頼主住所"}, {"note": "33バイト目以降 / 第33字节以后", "required": false, "columnIndex": 23, "sourceField": "senderAddress2", "targetField": "ご依頼主住所（アパートマンション名）"}, {"note": "ギフト：注文者名 / 否则：企業名 / 礼品:下单人名 / 否则:企业名", "required": true, "columnIndex": 24, "sourceField": "senderName", "targetField": "ご依頼主名"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 25, "sourceField": null, "targetField": "ご依頼主略称カナ"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 26, "sourceField": null, "targetField": "品名コード１"}, {"note": "品名（最大50バイト）/ 品名（最大50字节）", "required": true, "columnIndex": 27, "sourceField": "productName1", "targetField": "品名１"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 28, "sourceField": null, "targetField": "品名コード２"}, {"note": "品名オーバーフロー / 品名溢出（50バイト超過分）", "required": false, "columnIndex": 29, "sourceField": "productName2", "targetField": "品名２"}, {"note": "連絡事項1 / 联络事项1", "required": false, "columnIndex": 30, "sourceField": "handlingNote1", "targetField": "荷扱い１"}, {"note": "連絡事項2 / 联络事项2", "required": false, "columnIndex": 31, "sourceField": "handlingNote2", "targetField": "荷扱い２"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 32, "sourceField": null, "targetField": "記事"}, {"note": "代金引換額 / 货到付款金额", "required": false, "columnIndex": 33, "sourceField": "codAmount", "targetField": "コレクト代金引換額（税込）"}, {"note": "代引時のみ出力 / 仅代引时输出", "required": false, "columnIndex": 34, "sourceField": "codTax", "targetField": "コレクト内消費税額等"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 35, "sourceField": null, "targetField": "営業所止置き"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 36, "sourceField": null, "targetField": "営業所コード"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 37, "sourceField": null, "targetField": "発行枚数"}, {"note": "個数口数の印字 / 件数框印刷", "required": false, "columnIndex": 38, "sourceField": "packageCountPrint", "targetField": "個数口枠の印字"}, {"note": "請求先顧客コード（12桁）/ 账单客户代码（12位）", "required": false, "columnIndex": 39, "sourceField": "billingCustomerCode", "targetField": "ご請求先顧客コード"}, {"note": "請求先分類コード（3桁）/ 账单分类代码（3位）", "required": false, "columnIndex": 40, "sourceField": "billingClassCode", "targetField": "ご請求先分類コード"}, {"note": "運賃管理コード（2桁）/ 运费管理代码（2位）", "required": false, "columnIndex": 41, "sourceField": "freightManagementCode", "targetField": "運賃管理番号"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 42, "sourceField": null, "targetField": "注文時カード払いデータ登録"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 43, "sourceField": null, "targetField": "注文時カード払い加盟店番号"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 44, "sourceField": null, "targetField": "注文時カード払い申込受付番号１"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 45, "sourceField": null, "targetField": "注文時カード払い申込受付番号２"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 46, "sourceField": null, "targetField": "注文時カード払い申込受付番号３"}, {"note": "送り状種別1の場合のみ / 仅送状类型1时输出", "required": false, "columnIndex": 47, "sourceField": "emailNotificationType", "targetField": "お届け予定ｅメール利用区分"}, {"note": "注文者メール（種別1のみ）/ 下单人邮箱（仅类型1）", "required": false, "columnIndex": 48, "sourceField": "recipientEmail", "targetField": "お届け予定ｅメールe-mailアドレス"}, {"note": "送り状種別1の場合のみ / 仅送状类型1时输出", "required": false, "columnIndex": 49, "sourceField": "inputDeviceType", "targetField": "入力機種"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 50, "sourceField": null, "targetField": "お届け予定eメールメッセージ"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 51, "sourceField": null, "targetField": "お届け完了ｅメール利用区分"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 52, "sourceField": null, "targetField": "お届け完了ｅメールe-mailアドレス"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 53, "sourceField": null, "targetField": "お届け完了eメールメッセージ"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 54, "sourceField": null, "targetField": "クロネコ収納代行利用区分"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 55, "sourceField": null, "targetField": "収納代行決済ＱＲコード印刷"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 56, "sourceField": null, "targetField": "収納代行請求金額(税込)"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 57, "sourceField": null, "targetField": "収納代行内消費税額等"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 58, "sourceField": null, "targetField": "収納代行請求先郵便番号"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 59, "sourceField": null, "targetField": "収納代行請求先住所"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 60, "sourceField": null, "targetField": "収納代行請求先住所（アパートマンション名）"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 61, "sourceField": null, "targetField": "収納代行請求先会社・部門名１"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 62, "sourceField": null, "targetField": "収納代行請求先会社・部門名２"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 63, "sourceField": null, "targetField": "収納代行請求先名(漢字)"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 64, "sourceField": null, "targetField": "収納代行請求先名(カナ)"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 65, "sourceField": null, "targetField": "収納代行問合せ先名(漢字)"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 66, "sourceField": null, "targetField": "収納代行問合せ先郵便番号"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 67, "sourceField": null, "targetField": "収納代行問合せ先住所"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 68, "sourceField": null, "targetField": "収納代行問合せ先住所（アパートマンション名）"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 69, "sourceField": null, "targetField": "収納代行問合せ先電話番号"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 70, "sourceField": null, "targetField": "収納代行管理番号"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 71, "sourceField": null, "targetField": "収納代行品名"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 72, "sourceField": null, "targetField": "収納代行備考"}, {"note": "コンビニ受取時のみ / 仅便利店取货时", "required": false, "columnIndex": 73, "sourceField": "convenienceStoreNumber", "targetField": "連携管理番号"}, {"note": "コンビニ受取時のみ / 仅便利店取货时", "required": false, "columnIndex": 74, "sourceField": "notificationEmail", "targetField": "通知メールアドレス"}, {"note": "EAZY配達場所（種別1のみ）/ EAZY配送地点（仅类型1）", "required": false, "columnIndex": 75, "sourceField": "eazyDeliveryLocation", "targetField": "置き場所コード"}]	yamato	t	2026-03-22 11:55:18.129725	2026-03-22 11:55:18.129725
c271225c-057c-4d2d-858b-088960acf8cd	00000000-0000-0000-0000-000000000001	order-to-carrier	西濃運輸 カンガルーマジック2 出荷指示エクスポート	西濃運輸 カンガルーマジック2 CSV出力用マッピング（44列）/ 西浓运输 袋鼠魔术2 CSV输出映射（44列）	[{"note": "荷主人コード（11桁）/ 发货人代码（11位）", "required": true, "columnIndex": 0, "sourceField": "senderCode", "targetField": "荷送人コード"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 1, "sourceField": null, "targetField": "西濃発店コード"}, {"note": "出荷日 / 出货日", "required": true, "columnIndex": 2, "sourceField": "shipDate", "targetField": "出荷予定日"}, {"note": "空白（確定後に付与）/ 空白（确认后赋值）", "required": false, "columnIndex": 3, "sourceField": null, "targetField": "お問合せ番号"}, {"note": "受注番号_配送番号 / 订单号_配送号", "required": true, "columnIndex": 4, "sourceField": "orderNumber_deliveryNumber", "targetField": "管理番号"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 5, "sourceField": null, "targetField": "元着区分"}, {"note": "通販便は固定値「8」/ 通贩便固定值「8」", "required": false, "fixedValue": "8", "columnIndex": 6, "sourceField": "slipType", "targetField": "原票区分"}, {"note": "固定値「1」/ 固定值「1」", "required": true, "fixedValue": "1", "columnIndex": 7, "sourceField": null, "targetField": "個数"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 8, "sourceField": null, "targetField": "重量区分"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 9, "sourceField": null, "targetField": "重量（Ｋ)"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 10, "sourceField": null, "targetField": "重量（才）"}, {"note": "ギフト：注文者名 / 否则：企業名 / 礼品:下单人名 / 否则:企业名", "required": true, "columnIndex": 11, "sourceField": "senderName", "targetField": "荷送人名称"}, {"note": "最大40バイト / 最大40字节", "required": true, "columnIndex": 12, "sourceField": "senderAddress1", "targetField": "荷送人住所１"}, {"note": "41バイト目以降 / 第41字节以后", "required": false, "columnIndex": 13, "sourceField": "senderAddress2", "targetField": "荷送人住所２"}, {"note": "ギフト：注文者電話 / 否则：店舗電話 / 礼品:下单人电话 / 否则:店铺电话", "required": true, "columnIndex": 14, "sourceField": "senderPhone", "targetField": "荷送人電話番号"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 15, "sourceField": null, "targetField": "部署コード"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 16, "sourceField": null, "targetField": "部署名"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 17, "sourceField": null, "targetField": "重量契約区分"}, {"note": "配送先郵便番号 / 收件人邮编", "required": true, "columnIndex": 18, "sourceField": "recipientPostalCode", "targetField": "お届け先郵便番号"}, {"note": "配送先名 / 收件人名", "required": true, "columnIndex": 19, "sourceField": "recipientName", "targetField": "お届け先名称１"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 20, "sourceField": null, "targetField": "お届け先名称２"}, {"note": "最大40バイト / 最大40字节", "required": true, "columnIndex": 21, "sourceField": "recipientAddress1", "targetField": "お届け先住所１"}, {"note": "41バイト目以降 / 第41字节以后", "required": false, "columnIndex": 22, "sourceField": "recipientAddress2", "targetField": "お届け先住所２"}, {"note": "配送先電話番号 / 收件人电话", "required": true, "columnIndex": 23, "sourceField": "recipientPhone", "targetField": "お届け先電話番号"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 24, "sourceField": null, "targetField": "お届け先コード"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 25, "sourceField": null, "targetField": "お届け先JIS市町村コード"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 26, "sourceField": null, "targetField": "着店コード付け区分"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 27, "sourceField": null, "targetField": "着地コード"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 28, "sourceField": null, "targetField": "着店コード"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 29, "sourceField": null, "targetField": "保険金額"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 30, "sourceField": null, "targetField": "輸送指示１"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 31, "sourceField": null, "targetField": "輸送指示２"}, {"note": "連絡事項 / 联络事项", "required": false, "columnIndex": 32, "sourceField": "handlingNote1", "targetField": "記事１"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 33, "sourceField": null, "targetField": "記事２"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 34, "sourceField": null, "targetField": "記事３"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 35, "sourceField": null, "targetField": "記事４"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 36, "sourceField": null, "targetField": "記事５"}, {"note": "配送日＋時間指定コード / 配送日期+时间指定代码", "required": false, "columnIndex": 37, "sourceField": "deliveryDateTime", "targetField": "輸送指示（配達指定日付）"}, {"note": "配達日指定時のみ / 仅指定配达日时输出", "required": false, "columnIndex": 38, "sourceField": "transportCode1", "targetField": "輸送指示コード１"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 39, "sourceField": null, "targetField": "輸送指示コード２"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 40, "sourceField": null, "targetField": "輸送指示（止め店所名）"}, {"note": "予備 / 预留", "required": false, "columnIndex": 41, "sourceField": null, "targetField": "予備"}, {"note": "代金引換額 / 货到付款金额", "required": false, "columnIndex": 42, "sourceField": "codAmount", "targetField": "品代金"}, {"note": "代引時のみ出力 / 仅代引时输出", "required": false, "columnIndex": 43, "sourceField": "codTax", "targetField": "消費税"}]	seino	t	2026-03-22 11:55:18.130749	2026-03-22 11:55:18.130749
d2315c44-297e-43f6-84b5-13dc4c544dc1	00000000-0000-0000-0000-000000000001	carrier-receipt-to-order	佐川急便 e飛伝3 出荷確定インポート	佐川急便 e飛伝3 出荷確定CSVインポート用マッピング（回執取込）/ 佐川急便 e飞传3 出货确认CSV导入映射（回执导入）	[{"note": "荷物追跡番号 / 包裹追踪号", "required": true, "columnIndex": 0, "sourceField": "trackingNumber", "targetField": "お問い合せ送り状No."}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 1, "sourceField": null, "targetField": "サービス種別"}, {"note": "出荷日 / 出货日", "required": true, "columnIndex": 2, "sourceField": "shipDate", "targetField": "出荷日"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 3, "sourceField": null, "targetField": "お届け先コード"}, {"note": "参照用 / 参考用", "required": false, "columnIndex": 4, "sourceField": null, "targetField": "お届け先電話番号"}, {"note": "参照用 / 参考用", "required": false, "columnIndex": 5, "sourceField": null, "targetField": "お届け先郵便番号"}, {"note": "参照用 / 参考用", "required": false, "columnIndex": 6, "sourceField": null, "targetField": "お届け先住所１"}, {"note": "参照用 / 参考用", "required": false, "columnIndex": 7, "sourceField": null, "targetField": "お届け先住所2"}, {"note": "参照用 / 参考用", "required": false, "columnIndex": 8, "sourceField": null, "targetField": "お届け先住所3"}, {"note": "受注番号照合用 / 订单号匹配用", "required": false, "columnIndex": 18, "sourceField": "orderReference", "targetField": "お客様管理番号"}]	sagawa	t	2026-03-22 11:55:18.131517	2026-03-22 11:55:18.131517
c318d70a-8671-4718-8b30-35e52ca4cbee	00000000-0000-0000-0000-000000000001	carrier-receipt-to-order	ヤマト運輸 B2 出荷確定インポート	ヤマト運輸 B2クラウド 出荷確定CSVインポート用マッピング（回執取込）/ 雅玛多运输 B2 Cloud 出货确认CSV导入映射（回执导入）	[{"note": "受注番号照合用 / 订单号匹配用", "required": false, "columnIndex": 0, "sourceField": "orderReference", "targetField": "お客様管理番号"}, {"note": "参照用 / 参考用", "required": false, "columnIndex": 1, "sourceField": null, "targetField": "送り状種別"}, {"note": "参照用 / 参考用", "required": false, "columnIndex": 2, "sourceField": null, "targetField": "クール区分"}, {"note": "荷物追跡番号 / 包裹追踪号", "required": true, "columnIndex": 3, "sourceField": "trackingNumber", "targetField": "送り状番号"}, {"note": "出荷日 / 出货日", "required": true, "columnIndex": 4, "sourceField": "shipDate", "targetField": "出荷日"}, {"note": "配送予定日 / 预计配送日", "required": false, "columnIndex": 5, "sourceField": "deliveryDate", "targetField": "到着予定日"}, {"note": "参照用 / 参考用", "required": false, "columnIndex": 6, "sourceField": null, "targetField": "到着予定時間"}]	yamato	t	2026-03-22 11:55:18.132352	2026-03-22 11:55:18.132352
cbd5148f-2a49-4e73-8e46-ab87050aefc9	00000000-0000-0000-0000-000000000001	carrier-receipt-to-order	西濃運輸 カンガルーマジック2 出荷確定インポート	西濃運輸 カンガルーマジック2 出荷確定CSVインポート用マッピング（回執取込）/ 西浓运输 袋鼠魔术2 出货确认CSV导入映射（回执导入）	[{"note": "出荷日 / 出货日", "required": true, "columnIndex": 0, "sourceField": "shipDate", "targetField": "出荷日"}, {"note": "未使用 / 未使用", "required": false, "columnIndex": 1, "sourceField": null, "targetField": "取込番号"}, {"note": "荷物追跡番号 / 包裹追踪号", "required": true, "columnIndex": 2, "sourceField": "trackingNumber", "targetField": "送り状番号"}, {"note": "参照用 / 参考用", "required": false, "columnIndex": 3, "sourceField": null, "targetField": "元着区分"}, {"note": "参照用 / 参考用", "required": false, "columnIndex": 4, "sourceField": null, "targetField": "原票区分"}, {"note": "参照用 / 参考用", "required": false, "columnIndex": 5, "sourceField": null, "targetField": "個数"}, {"note": "参照用（荷主照合可能）/ 参考用（可匹配发货人）", "required": false, "columnIndex": 9, "sourceField": null, "targetField": "荷送人コード"}, {"note": "参照用 / 参考用", "required": false, "columnIndex": 16, "sourceField": null, "targetField": "お届け先コード"}]	seino	t	2026-03-22 11:55:18.133169	2026-03-22 11:55:18.133169
\.


--
-- Data for Name: materials; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.materials (id, tenant_id, sku, name, description, unit_cost, stock_quantity, category, is_active, created_at, updated_at) FROM stdin;
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
40000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	EC商店A 出荷センター	272-0127	千葉県	市川市	塩浜2-14-1	EC物流センター1F	047-111-2222	\N	\N	t	2026-03-22 12:04:56.841144	2026-03-22 12:04:56.841144
40000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	ファッションブランドB 配送部	560-0032	大阪府	豊中市	蛍池東町1-3-5	ブランドB配送センター	06-7777-8888	\N	\N	t	2026-03-22 12:04:56.841144	2026-03-22 12:04:56.841144
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
ffd51ba6-2a1b-4821-aa76-aa712ee5ab90	00000000-0000-0000-0000-000000000001	test-template	label	{"pxPerMm": 4, "widthMm": 100, "heightMm": 150}	[]	\N	\N	\N	f	tenant	\N	\N	t	1	\N	2026-03-22 12:14:25.102213	2026-03-22 12:14:25.102213
\.


--
-- Data for Name: product_sub_skus; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_sub_skus (id, product_id, sub_sku, price, description, is_active) FROM stdin;
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id, tenant_id, sku, name, name_full, name_en, category, barcode, jan_code, image_url, memo, customer_product_code, brand_code, brand_name, size_name, color_name, unit_type, width, depth, height, weight, gross_weight, volume, outer_box_width, outer_box_depth, outer_box_height, outer_box_volume, outer_box_weight, case_quantity, price, cost_price, tax_type, tax_rate, currency, cool_type, shipping_size_code, mail_calc_enabled, mail_calc_max_quantity, inventory_enabled, lot_tracking_enabled, expiry_tracking_enabled, serial_tracking_enabled, alert_days_before_expiry, inbound_expiry_days, safety_stock, allocation_rule, supplier_code, supplier_name, fnsku, asin, amazon_sku, fba_enabled, rakuten_sku, rsl_enabled, marketplace_codes, wholesale_partner_codes, hazardous_type, air_transport_ban, barcode_commission, reservation_target, paid_type, country_of_origin, handling_types, default_handling_tags, remarks, custom_fields, wh_preferred_location, wh_handling_notes, wh_is_fragile, wh_is_liquid, wh_requires_opp_bag, wh_storage_type, size_assessment_status, customer_customer_codes, client_id, sub_client_id, shop_id, created_at, updated_at, deleted_at, abbreviation, enterprise_code, house_code, size_code, color_code, purchase_price, tax_category, product_characteristic, carrier_size_class, appropriate_stock, ec_channel_codes, b2b_customer_codes, air_prohibited, barcode_outsourced, origin_country_code, inspection_lot, inspection_expiry, inspection_reference, set_product_flag, inner_count, case_dimension_l, case_dimension_w, case_dimension_h, case_weight, case_volume) FROM stdin;
60000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	SKU-001	USBケーブル Type-C 1m	\N	\N	0	["4901234567890"]	4901234567890	\N	\N	\N	\N	\N	\N	\N	\N	20	150	3	45	\N	\N	\N	\N	\N	\N	\N	\N	980	350	\N	\N	\N	\N	\N	f	\N	f	f	f	f	30	\N	0	FIFO	\N	\N	\N	\N	\N	f	\N	f	{}	{}	0	f	f	f	0	\N	[]	[]	[]	{}	\N	\N	f	f	f	\N	pending	{}	20000000-0000-0000-0000-000000000001	\N	\N	2026-03-22 12:05:52.247349	2026-03-22 12:05:52.247349	\N	\N	\N	\N	\N	\N	\N	\N	normal	\N	\N	{}	[]	f	f	\N	f	f	f	single	\N	\N	\N	\N	\N	\N
60000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	SKU-002	モバイルバッテリー 10000mAh	\N	\N	0	["4901234567891"]	4901234567891	\N	\N	\N	\N	\N	\N	\N	\N	70	130	15	220	\N	\N	\N	\N	\N	\N	\N	\N	3480	1500	\N	\N	\N	\N	\N	f	\N	f	f	f	f	30	\N	0	FIFO	\N	\N	\N	\N	\N	f	\N	f	{}	{}	0	f	f	f	0	\N	[]	[]	[]	{}	\N	\N	f	f	f	\N	pending	{}	20000000-0000-0000-0000-000000000001	\N	\N	2026-03-22 12:05:52.247349	2026-03-22 12:05:52.247349	\N	\N	\N	\N	\N	\N	\N	\N	normal	\N	\N	{}	[]	f	f	\N	f	f	f	single	\N	\N	\N	\N	\N	\N
60000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	SKU-003	ワイヤレスイヤホン Bluetooth	\N	\N	0	["4901234567892"]	4901234567892	\N	\N	\N	\N	\N	\N	\N	\N	65	65	45	55	\N	\N	\N	\N	\N	\N	\N	\N	5980	2200	\N	\N	\N	\N	\N	f	\N	f	f	f	f	30	\N	0	FIFO	\N	\N	\N	\N	\N	f	\N	f	{}	{}	0	f	f	f	0	\N	[]	[]	[]	{}	\N	\N	f	f	f	\N	pending	{}	20000000-0000-0000-0000-000000000001	\N	\N	2026-03-22 12:05:52.247349	2026-03-22 12:05:52.247349	\N	\N	\N	\N	\N	\N	\N	\N	normal	\N	\N	{}	[]	f	f	\N	f	f	f	single	\N	\N	\N	\N	\N	\N
60000000-0000-0000-0000-000000000004	00000000-0000-0000-0000-000000000001	SKU-004	スマホスタンド 折りたたみ式	\N	\N	0	["4901234567893"]	4901234567893	\N	\N	\N	\N	\N	\N	\N	\N	80	100	12	120	\N	\N	\N	\N	\N	\N	\N	\N	1280	450	\N	\N	\N	\N	\N	f	\N	f	f	f	f	30	\N	0	FIFO	\N	\N	\N	\N	\N	f	\N	f	{}	{}	0	f	f	f	0	\N	[]	[]	[]	{}	\N	\N	f	f	f	\N	pending	{}	20000000-0000-0000-0000-000000000001	\N	\N	2026-03-22 12:05:52.247349	2026-03-22 12:05:52.247349	\N	\N	\N	\N	\N	\N	\N	\N	normal	\N	\N	{}	[]	f	f	\N	f	f	f	single	\N	\N	\N	\N	\N	\N
60000000-0000-0000-0000-000000000005	00000000-0000-0000-0000-000000000001	SKU-005	LED卓上ライト 調光機能付き	\N	\N	0	["4901234567894"]	4901234567894	\N	\N	\N	\N	\N	\N	\N	\N	150	400	150	480	\N	\N	\N	\N	\N	\N	\N	\N	2980	1100	\N	\N	\N	\N	\N	f	\N	f	f	f	f	30	\N	0	FIFO	\N	\N	\N	\N	\N	f	\N	f	{}	{}	0	f	f	f	0	\N	[]	[]	[]	{}	\N	\N	f	f	f	\N	pending	{}	20000000-0000-0000-0000-000000000001	\N	\N	2026-03-22 12:05:52.247349	2026-03-22 12:05:52.247349	\N	\N	\N	\N	\N	\N	\N	\N	normal	\N	\N	{}	[]	f	f	\N	f	f	f	single	\N	\N	\N	\N	\N	\N
60000000-0000-0000-0000-000000000006	00000000-0000-0000-0000-000000000001	SKU-006	ワイヤレスマウス 静音タイプ	\N	\N	0	["4901234567895"]	4901234567895	\N	\N	\N	\N	\N	\N	\N	\N	60	105	35	85	\N	\N	\N	\N	\N	\N	\N	\N	1980	700	\N	\N	\N	\N	\N	f	\N	f	f	f	f	30	\N	0	FIFO	\N	\N	\N	\N	\N	f	\N	f	{}	{}	0	f	f	f	0	\N	[]	[]	[]	{}	\N	\N	f	f	f	\N	pending	{}	20000000-0000-0000-0000-000000000001	\N	\N	2026-03-22 12:05:52.247349	2026-03-22 12:05:52.247349	\N	\N	\N	\N	\N	\N	\N	\N	normal	\N	\N	{}	[]	f	f	\N	f	f	f	single	\N	\N	\N	\N	\N	\N
60000000-0000-0000-0000-000000000007	00000000-0000-0000-0000-000000000001	SKU-007	Tシャツ 白 M	\N	\N	0	["4902345678901"]	4902345678901	\N	\N	\N	\N	\N	\N	\N	\N	300	250	20	200	\N	\N	\N	\N	\N	\N	\N	\N	2480	800	\N	\N	\N	\N	\N	f	\N	f	f	f	f	30	\N	0	FIFO	\N	\N	\N	\N	\N	f	\N	f	{}	{}	0	f	f	f	0	\N	[]	[]	[]	{}	\N	\N	f	f	f	\N	pending	{}	20000000-0000-0000-0000-000000000002	\N	\N	2026-03-22 12:05:52.247349	2026-03-22 12:05:52.247349	\N	\N	\N	\N	\N	\N	\N	\N	normal	\N	\N	{}	[]	f	f	\N	f	f	f	single	\N	\N	\N	\N	\N	\N
60000000-0000-0000-0000-000000000008	00000000-0000-0000-0000-000000000001	SKU-008	Tシャツ 黒 L	\N	\N	0	["4902345678902"]	4902345678902	\N	\N	\N	\N	\N	\N	\N	\N	300	250	20	210	\N	\N	\N	\N	\N	\N	\N	\N	2480	800	\N	\N	\N	\N	\N	f	\N	f	f	f	f	30	\N	0	FIFO	\N	\N	\N	\N	\N	f	\N	f	{}	{}	0	f	f	f	0	\N	[]	[]	[]	{}	\N	\N	f	f	f	\N	pending	{}	20000000-0000-0000-0000-000000000002	\N	\N	2026-03-22 12:05:52.247349	2026-03-22 12:05:52.247349	\N	\N	\N	\N	\N	\N	\N	\N	normal	\N	\N	{}	[]	f	f	\N	f	f	f	single	\N	\N	\N	\N	\N	\N
60000000-0000-0000-0000-000000000009	00000000-0000-0000-0000-000000000001	SKU-009	デニムパンツ ストレート 32	\N	\N	0	["4902345678903"]	4902345678903	\N	\N	\N	\N	\N	\N	\N	\N	350	300	50	650	\N	\N	\N	\N	\N	\N	\N	\N	6980	2500	\N	\N	\N	\N	\N	f	\N	f	f	f	f	30	\N	0	FIFO	\N	\N	\N	\N	\N	f	\N	f	{}	{}	0	f	f	f	0	\N	[]	[]	[]	{}	\N	\N	f	f	f	\N	pending	{}	20000000-0000-0000-0000-000000000002	\N	\N	2026-03-22 12:05:52.247349	2026-03-22 12:05:52.247349	\N	\N	\N	\N	\N	\N	\N	\N	normal	\N	\N	{}	[]	f	f	\N	f	f	f	single	\N	\N	\N	\N	\N	\N
60000000-0000-0000-0000-000000000010	00000000-0000-0000-0000-000000000001	SKU-010	スニーカー 白 26.5cm	\N	\N	0	["4902345678904"]	4902345678904	\N	\N	\N	\N	\N	\N	\N	\N	320	200	130	750	\N	\N	\N	\N	\N	\N	\N	\N	8900	3200	\N	\N	\N	\N	\N	f	\N	f	f	f	f	30	\N	0	FIFO	\N	\N	\N	\N	\N	f	\N	f	{}	{}	0	f	f	f	0	\N	[]	[]	[]	{}	\N	\N	f	f	f	\N	pending	{}	20000000-0000-0000-0000-000000000002	\N	\N	2026-03-22 12:05:52.247349	2026-03-22 12:05:52.247349	\N	\N	\N	\N	\N	\N	\N	\N	normal	\N	\N	{}	[]	f	f	\N	f	f	f	single	\N	\N	\N	\N	\N	\N
60000000-0000-0000-0000-000000000011	00000000-0000-0000-0000-000000000001	SKU-011	キャンバストートバッグ	\N	\N	0	["4902345678905"]	4902345678905	\N	\N	\N	\N	\N	\N	\N	\N	400	350	50	350	\N	\N	\N	\N	\N	\N	\N	\N	3280	1000	\N	\N	\N	\N	\N	f	\N	f	f	f	f	30	\N	0	FIFO	\N	\N	\N	\N	\N	f	\N	f	{}	{}	0	f	f	f	0	\N	[]	[]	[]	{}	\N	\N	f	f	f	\N	pending	{}	20000000-0000-0000-0000-000000000002	\N	\N	2026-03-22 12:05:52.247349	2026-03-22 12:05:52.247349	\N	\N	\N	\N	\N	\N	\N	\N	normal	\N	\N	{}	[]	f	f	\N	f	f	f	single	\N	\N	\N	\N	\N	\N
60000000-0000-0000-0000-000000000012	00000000-0000-0000-0000-000000000001	SKU-012	ニットキャップ グレー	\N	\N	0	["4902345678906"]	4902345678906	\N	\N	\N	\N	\N	\N	\N	\N	200	200	30	80	\N	\N	\N	\N	\N	\N	\N	\N	1980	600	\N	\N	\N	\N	\N	f	\N	f	f	f	f	30	\N	0	FIFO	\N	\N	\N	\N	\N	f	\N	f	{}	{}	0	f	f	f	0	\N	[]	[]	[]	{}	\N	\N	f	f	f	\N	pending	{}	20000000-0000-0000-0000-000000000002	\N	\N	2026-03-22 12:05:52.247349	2026-03-22 12:05:52.247349	\N	\N	\N	\N	\N	\N	\N	\N	normal	\N	\N	{}	[]	f	f	\N	f	f	f	single	\N	\N	\N	\N	\N	\N
60000000-0000-0000-0000-000000000013	00000000-0000-0000-0000-000000000001	SKU-013	リネンシャツ ベージュ M	\N	\N	0	["4902345678907"]	4902345678907	\N	\N	\N	\N	\N	\N	\N	\N	350	280	30	280	\N	\N	\N	\N	\N	\N	\N	\N	5480	1800	\N	\N	\N	\N	\N	f	\N	f	f	f	f	30	\N	0	FIFO	\N	\N	\N	\N	\N	f	\N	f	{}	{}	0	f	f	f	0	\N	[]	[]	[]	{}	\N	\N	f	f	f	\N	pending	{}	20000000-0000-0000-0000-000000000002	\N	\N	2026-03-22 12:05:52.247349	2026-03-22 12:05:52.247349	\N	\N	\N	\N	\N	\N	\N	\N	normal	\N	\N	{}	[]	f	f	\N	f	f	f	single	\N	\N	\N	\N	\N	\N
60000000-0000-0000-0000-000000000014	00000000-0000-0000-0000-000000000001	SKU-014	レザーベルト ブラウン	\N	\N	0	["4902345678908"]	4902345678908	\N	\N	\N	\N	\N	\N	\N	\N	350	50	20	180	\N	\N	\N	\N	\N	\N	\N	\N	4280	1500	\N	\N	\N	\N	\N	f	\N	f	f	f	f	30	\N	0	FIFO	\N	\N	\N	\N	\N	f	\N	f	{}	{}	0	f	f	f	0	\N	[]	[]	[]	{}	\N	\N	f	f	f	\N	pending	{}	20000000-0000-0000-0000-000000000002	\N	\N	2026-03-22 12:05:52.247349	2026-03-22 12:05:52.247349	\N	\N	\N	\N	\N	\N	\N	\N	normal	\N	\N	{}	[]	f	f	\N	f	f	f	single	\N	\N	\N	\N	\N	\N
60000000-0000-0000-0000-000000000015	00000000-0000-0000-0000-000000000001	SKU-015	ハンドソープ 泡タイプ 250ml	\N	\N	0	["4903456789012"]	4903456789012	\N	\N	\N	\N	\N	\N	\N	\N	80	180	80	310	\N	\N	\N	\N	\N	\N	\N	\N	398	150	\N	\N	\N	\N	\N	f	\N	f	f	f	f	30	\N	0	FIFO	\N	\N	\N	\N	\N	f	\N	f	{}	{}	0	f	f	f	0	\N	[]	[]	[]	{}	\N	\N	f	f	f	\N	pending	{}	20000000-0000-0000-0000-000000000001	\N	\N	2026-03-22 12:05:52.247349	2026-03-22 12:05:52.247349	\N	\N	\N	\N	\N	\N	\N	\N	normal	\N	\N	{}	[]	f	f	\N	f	f	f	single	\N	\N	\N	\N	\N	\N
60000000-0000-0000-0000-000000000016	00000000-0000-0000-0000-000000000001	SKU-016	洗剤詰め替え 800ml	\N	\N	0	["4903456789013"]	4903456789013	\N	\N	\N	\N	\N	\N	\N	\N	140	250	60	820	\N	\N	\N	\N	\N	\N	\N	\N	298	100	\N	\N	\N	\N	\N	f	\N	f	f	f	f	30	\N	0	FIFO	\N	\N	\N	\N	\N	f	\N	f	{}	{}	0	f	f	f	0	\N	[]	[]	[]	{}	\N	\N	f	f	f	\N	pending	{}	20000000-0000-0000-0000-000000000001	\N	\N	2026-03-22 12:05:52.247349	2026-03-22 12:05:52.247349	\N	\N	\N	\N	\N	\N	\N	\N	normal	\N	\N	{}	[]	f	f	\N	f	f	f	single	\N	\N	\N	\N	\N	\N
60000000-0000-0000-0000-000000000017	00000000-0000-0000-0000-000000000001	SKU-017	除菌ウェットティッシュ 80枚入	\N	\N	0	["4903456789014"]	4903456789014	\N	\N	\N	\N	\N	\N	\N	\N	150	80	50	180	\N	\N	\N	\N	\N	\N	\N	\N	248	90	\N	\N	\N	\N	\N	f	\N	f	f	f	f	30	\N	0	FIFO	\N	\N	\N	\N	\N	f	\N	f	{}	{}	0	f	f	f	0	\N	[]	[]	[]	{}	\N	\N	f	f	f	\N	pending	{}	20000000-0000-0000-0000-000000000001	\N	\N	2026-03-22 12:05:52.247349	2026-03-22 12:05:52.247349	\N	\N	\N	\N	\N	\N	\N	\N	normal	\N	\N	{}	[]	f	f	\N	f	f	f	single	\N	\N	\N	\N	\N	\N
60000000-0000-0000-0000-000000000018	00000000-0000-0000-0000-000000000001	SKU-018	マイクロファイバータオル 3枚セット	\N	\N	0	["4903456789015"]	4903456789015	\N	\N	\N	\N	\N	\N	\N	\N	200	150	40	250	\N	\N	\N	\N	\N	\N	\N	\N	1280	400	\N	\N	\N	\N	\N	f	\N	f	f	f	f	30	\N	0	FIFO	\N	\N	\N	\N	\N	f	\N	f	{}	{}	0	f	f	f	0	\N	[]	[]	[]	{}	\N	\N	f	f	f	\N	pending	{}	20000000-0000-0000-0000-000000000001	\N	\N	2026-03-22 12:05:52.247349	2026-03-22 12:05:52.247349	\N	\N	\N	\N	\N	\N	\N	\N	normal	\N	\N	{}	[]	f	f	\N	f	f	f	single	\N	\N	\N	\N	\N	\N
60000000-0000-0000-0000-000000000019	00000000-0000-0000-0000-000000000001	SKU-019	プロテインバー チョコ味 12本入	\N	\N	0	["4904567890123"]	4904567890123	\N	\N	\N	\N	\N	\N	\N	\N	200	150	50	480	\N	\N	\N	\N	\N	\N	\N	\N	2480	900	\N	\N	\N	\N	\N	f	\N	f	f	f	f	30	\N	0	FIFO	\N	\N	\N	\N	\N	f	\N	f	{}	{}	0	f	f	f	0	\N	[]	[]	[]	{}	\N	\N	f	f	f	\N	pending	{}	20000000-0000-0000-0000-000000000001	\N	\N	2026-03-22 12:05:52.247349	2026-03-22 12:05:52.247349	\N	\N	\N	\N	\N	\N	\N	\N	normal	\N	\N	{}	[]	f	f	\N	f	f	f	single	\N	\N	\N	\N	\N	\N
60000000-0000-0000-0000-000000000020	00000000-0000-0000-0000-000000000001	SKU-020	グリーンスムージー 粉末 200g	\N	\N	0	["4904567890124"]	4904567890124	\N	\N	\N	\N	\N	\N	\N	\N	100	150	100	220	\N	\N	\N	\N	\N	\N	\N	\N	1980	700	\N	\N	\N	\N	\N	f	\N	f	f	f	f	30	\N	0	FIFO	\N	\N	\N	\N	\N	f	\N	f	{}	{}	0	f	f	f	0	\N	[]	[]	[]	{}	\N	\N	f	f	f	\N	pending	{}	20000000-0000-0000-0000-000000000001	\N	\N	2026-03-22 12:05:52.247349	2026-03-22 12:05:52.247349	\N	\N	\N	\N	\N	\N	\N	\N	normal	\N	\N	{}	[]	f	f	\N	f	f	f	single	\N	\N	\N	\N	\N	\N
60000000-0000-0000-0000-000000000021	00000000-0000-0000-0000-000000000001	SKU-021	オーガニックはちみつ 500g	\N	\N	0	["4904567890125"]	4904567890125	\N	\N	\N	\N	\N	\N	\N	\N	80	120	80	580	\N	\N	\N	\N	\N	\N	\N	\N	1580	550	\N	\N	\N	\N	\N	f	\N	f	f	f	f	30	\N	0	FIFO	\N	\N	\N	\N	\N	f	\N	f	{}	{}	0	f	f	f	0	\N	[]	[]	[]	{}	\N	\N	f	f	f	\N	pending	{}	20000000-0000-0000-0000-000000000001	\N	\N	2026-03-22 12:05:52.247349	2026-03-22 12:05:52.247349	\N	\N	\N	\N	\N	\N	\N	\N	normal	\N	\N	{}	[]	f	f	\N	f	f	f	single	\N	\N	\N	\N	\N	\N
60000000-0000-0000-0000-000000000022	00000000-0000-0000-0000-000000000001	SKU-022	ドリップコーヒー 10袋入	\N	\N	0	["4904567890126"]	4904567890126	\N	\N	\N	\N	\N	\N	\N	\N	180	120	30	150	\N	\N	\N	\N	\N	\N	\N	\N	880	300	\N	\N	\N	\N	\N	f	\N	f	f	f	f	30	\N	0	FIFO	\N	\N	\N	\N	\N	f	\N	f	{}	{}	0	f	f	f	0	\N	[]	[]	[]	{}	\N	\N	f	f	f	\N	pending	{}	20000000-0000-0000-0000-000000000001	\N	\N	2026-03-22 12:05:52.247349	2026-03-22 12:05:52.247349	\N	\N	\N	\N	\N	\N	\N	\N	normal	\N	\N	{}	[]	f	f	\N	f	f	f	single	\N	\N	\N	\N	\N	\N
60000000-0000-0000-0000-000000000023	00000000-0000-0000-0000-000000000001	SKU-023	マルチビタミン サプリ 90粒	\N	\N	0	["4904567890127"]	4904567890127	\N	\N	\N	\N	\N	\N	\N	\N	60	110	60	120	\N	\N	\N	\N	\N	\N	\N	\N	1480	500	\N	\N	\N	\N	\N	f	\N	f	f	f	f	30	\N	0	FIFO	\N	\N	\N	\N	\N	f	\N	f	{}	{}	0	f	f	f	0	\N	[]	[]	[]	{}	\N	\N	f	f	f	\N	pending	{}	20000000-0000-0000-0000-000000000001	\N	\N	2026-03-22 12:05:52.247349	2026-03-22 12:05:52.247349	\N	\N	\N	\N	\N	\N	\N	\N	normal	\N	\N	{}	[]	f	f	\N	f	f	f	single	\N	\N	\N	\N	\N	\N
60000000-0000-0000-0000-000000000024	00000000-0000-0000-0000-000000000001	SKU-024	アロマディフューザー ミニ	\N	\N	0	["4905678901234"]	4905678901234	\N	\N	\N	\N	\N	\N	\N	\N	100	100	100	320	\N	\N	\N	\N	\N	\N	\N	\N	3980	1400	\N	\N	\N	\N	\N	f	\N	f	f	f	f	30	\N	0	FIFO	\N	\N	\N	\N	\N	f	\N	f	{}	{}	0	f	f	f	0	\N	[]	[]	[]	{}	\N	\N	f	f	f	\N	pending	{}	20000000-0000-0000-0000-000000000001	\N	\N	2026-03-22 12:05:52.247349	2026-03-22 12:05:52.247349	\N	\N	\N	\N	\N	\N	\N	\N	normal	\N	\N	{}	[]	f	f	\N	f	f	f	single	\N	\N	\N	\N	\N	\N
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
51615ead-490f-4f60-bcce-622e96646275	00000000-0000-0000-0000-000000000001	80000000-0000-0000-0000-000000000001	SKU-001	2	60000000-0000-0000-0000-000000000001	SKU-001	USBケーブル Type-C 1m	980	1960	\N	[]	\N	\N	\N	\N
a7939080-2e57-4ed4-8063-ee605b3307e9	00000000-0000-0000-0000-000000000001	80000000-0000-0000-0000-000000000001	SKU-002	1	60000000-0000-0000-0000-000000000002	SKU-002	モバイルバッテリー 10000mAh	3480	3480	\N	[]	\N	\N	\N	\N
aae01d4c-629d-4c0e-b8b3-cc03cc42968d	00000000-0000-0000-0000-000000000001	80000000-0000-0000-0000-000000000002	SKU-003	1	60000000-0000-0000-0000-000000000003	SKU-003	ワイヤレスイヤホン Bluetooth	5980	5980	\N	[]	\N	\N	\N	\N
d98bb734-c3ff-4104-8c12-ea59aedb3768	00000000-0000-0000-0000-000000000001	80000000-0000-0000-0000-000000000002	SKU-004	1	60000000-0000-0000-0000-000000000004	SKU-004	スマホスタンド 折りたたみ式	1280	1280	\N	[]	\N	\N	\N	\N
7960ccf8-0e9e-4aba-aab5-9fd5966b4d67	00000000-0000-0000-0000-000000000001	80000000-0000-0000-0000-000000000003	SKU-007	2	60000000-0000-0000-0000-000000000007	SKU-007	Tシャツ 白 M	2480	4960	\N	[]	\N	\N	\N	\N
026787b6-1ace-46e0-809a-be1ac71c97e2	00000000-0000-0000-0000-000000000001	80000000-0000-0000-0000-000000000003	SKU-009	1	60000000-0000-0000-0000-000000000009	SKU-009	デニムパンツ ストレート 32	6980	6980	\N	[]	\N	\N	\N	\N
81f59deb-f98a-4c71-bd00-ba4a13b28f3e	00000000-0000-0000-0000-000000000001	80000000-0000-0000-0000-000000000004	SKU-015	3	60000000-0000-0000-0000-000000000015	SKU-015	ハンドソープ 泡タイプ 250ml	398	1194	\N	[]	\N	\N	\N	\N
d4e6566a-17ae-4387-a598-bb88821b5d45	00000000-0000-0000-0000-000000000001	80000000-0000-0000-0000-000000000004	SKU-019	2	60000000-0000-0000-0000-000000000019	SKU-019	プロテインバー チョコ味 12本入	2480	4960	\N	[]	\N	\N	\N	\N
3f6cf4e0-6b3f-4962-97d0-545badf04218	00000000-0000-0000-0000-000000000001	80000000-0000-0000-0000-000000000004	SKU-022	1	60000000-0000-0000-0000-000000000022	SKU-022	ドリップコーヒー 10袋入	880	880	\N	[]	\N	\N	\N	\N
efaa8267-b01b-454e-a426-58b4c54d9b8f	00000000-0000-0000-0000-000000000001	80000000-0000-0000-0000-000000000005	SKU-010	1	60000000-0000-0000-0000-000000000010	SKU-010	スニーカー 白 26.5cm	8900	8900	\N	[]	\N	\N	\N	\N
a374e069-a3fd-4f1a-90d5-a2403e62ec1a	00000000-0000-0000-0000-000000000001	80000000-0000-0000-0000-000000000005	SKU-011	1	60000000-0000-0000-0000-000000000011	SKU-011	キャンバストートバッグ	3280	3280	\N	[]	\N	\N	\N	\N
b9467b5c-d264-45d6-9415-13002dd55f63	00000000-0000-0000-0000-000000000001	80000000-0000-0000-0000-000000000006	SKU-005	1	60000000-0000-0000-0000-000000000005	SKU-005	LED卓上ライト 調光機能付き	2980	2980	\N	[]	\N	\N	\N	\N
664101f5-0642-421d-b1c4-05ed2b5eb850	00000000-0000-0000-0000-000000000001	80000000-0000-0000-0000-000000000006	SKU-006	1	60000000-0000-0000-0000-000000000006	SKU-006	ワイヤレスマウス 静音タイプ	1980	1980	\N	[]	\N	\N	\N	\N
3d3ee49d-3358-463e-924c-7cb467b22ef6	00000000-0000-0000-0000-000000000001	80000000-0000-0000-0000-000000000006	SKU-024	1	60000000-0000-0000-0000-000000000024	SKU-024	アロマディフューザー ミニ	3980	3980	\N	[]	\N	\N	\N	\N
108f5e09-3f29-473e-be11-c95b68215413	00000000-0000-0000-0000-000000000001	80000000-0000-0000-0000-000000000007	SKU-020	2	60000000-0000-0000-0000-000000000020	SKU-020	グリーンスムージー 粉末 200g	1980	3960	\N	[]	\N	\N	\N	\N
2ab18411-6b3e-4e59-8ef0-33d2a4c11302	00000000-0000-0000-0000-000000000001	80000000-0000-0000-0000-000000000007	SKU-023	1	60000000-0000-0000-0000-000000000023	SKU-023	マルチビタミン サプリ 90粒	1480	1480	\N	[]	\N	\N	\N	\N
aa4d0390-b977-4fc1-8404-4bcabb808ea4	00000000-0000-0000-0000-000000000001	80000000-0000-0000-0000-000000000007	SKU-021	1	60000000-0000-0000-0000-000000000021	SKU-021	オーガニックはちみつ 500g	1580	1580	\N	[]	\N	\N	\N	\N
c41cd653-0d54-4f70-9844-97153c307759	00000000-0000-0000-0000-000000000001	80000000-0000-0000-0000-000000000008	SKU-008	2	60000000-0000-0000-0000-000000000008	SKU-008	Tシャツ 黒 L	2480	4960	\N	[]	\N	\N	\N	\N
082b9607-c76a-41ac-920d-cc8906c39a58	00000000-0000-0000-0000-000000000001	80000000-0000-0000-0000-000000000008	SKU-012	1	60000000-0000-0000-0000-000000000012	SKU-012	ニットキャップ グレー	1980	1980	\N	[]	\N	\N	\N	\N
0cc485a0-a933-48da-ab7e-ee94385c91de	00000000-0000-0000-0000-000000000001	80000000-0000-0000-0000-000000000009	SKU-013	1	60000000-0000-0000-0000-000000000013	SKU-013	リネンシャツ ベージュ M	5480	5480	\N	[]	\N	\N	\N	\N
0df24bd0-450c-4b85-972b-4115fc554983	00000000-0000-0000-0000-000000000001	80000000-0000-0000-0000-000000000009	SKU-014	1	60000000-0000-0000-0000-000000000014	SKU-014	レザーベルト ブラウン	4280	4280	\N	[]	\N	\N	\N	\N
95d1c29c-5acc-4cd5-a907-bed908a0862f	00000000-0000-0000-0000-000000000001	80000000-0000-0000-0000-000000000009	SKU-018	2	60000000-0000-0000-0000-000000000018	SKU-018	マイクロファイバータオル 3枚セット	1280	2560	\N	[]	\N	\N	\N	\N
971c9a9a-04bf-4c40-9506-1f299aba97ef	00000000-0000-0000-0000-000000000001	80000000-0000-0000-0000-000000000010	SKU-016	5	60000000-0000-0000-0000-000000000016	SKU-016	洗剤詰め替え 800ml	298	1490	\N	[]	\N	\N	\N	\N
e77281fd-d72c-4b88-9196-dc742b80ca2f	00000000-0000-0000-0000-000000000001	80000000-0000-0000-0000-000000000010	SKU-017	3	60000000-0000-0000-0000-000000000017	SKU-017	除菌ウェットティッシュ 80枚入	248	744	\N	[]	\N	\N	\N	\N
\.


--
-- Data for Name: shipment_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.shipment_orders (id, tenant_id, order_number, destination_type, fba_shipment_id, fba_destination, carrier_id, tracking_id, customer_management_number, status_confirmed, status_confirmed_at, status_carrier_received, status_carrier_received_at, status_printed, status_printed_at, status_inspected, status_inspected_at, status_shipped, status_shipped_at, status_ec_exported, status_ec_exported_at, status_held, status_held_at, recipient_postal_code, recipient_prefecture, recipient_city, recipient_street, recipient_building, recipient_name, recipient_phone, honorific, sender_postal_code, sender_prefecture, sender_city, sender_street, sender_building, sender_name, sender_phone, orderer_postal_code, orderer_prefecture, orderer_city, orderer_street, orderer_building, orderer_name, orderer_phone, ship_plan_date, invoice_type, cool_type, delivery_time_slot, delivery_date_preference, source_order_at, carrier_data, cost_summary, shipping_cost, shipping_cost_breakdown, cost_source, cost_calculated_at, handling_tags, custom_fields, _products_meta, source_raw_rows, carrier_raw_row, internal_record, order_group_id, order_source_company_id, created_at, updated_at, deleted_at) FROM stdin;
80000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	SO-2026-0302	B2C	\N	\N	sagawa	5678-9012-3456	\N	t	2026-03-19 09:00:00	f	\N	f	\N	t	2026-03-19 11:00:00	t	2026-03-19 15:00:00	f	\N	f	\N	220-0012	神奈川県	横浜市西区	みなとみらい3-6-1 オーシャンビュー502	\N	伊藤理恵	080-2345-6789	様	272-0127	千葉県	市川市	塩浜2-14-1	\N	EC商店A 出荷センター	047-111-2222	\N	\N	\N	\N	\N	\N	\N	2026-03-19	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	[]	{}	\N	\N	\N	\N	\N	40000000-0000-0000-0000-000000000001	2026-03-18 16:00:00	2026-03-22 12:10:58.948122	\N
80000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	SO-2026-0303	B2C	\N	\N	japanpost	JP1234567890	\N	t	2026-03-20 09:00:00	f	\N	f	\N	t	2026-03-20 10:00:00	t	2026-03-20 13:00:00	f	\N	f	\N	530-0011	大阪府	大阪市北区	大深町4-1 グランフロント大阪1205	\N	小林大輔	070-3456-7890	様	560-0032	大阪府	豊中市	蛍池東町1-3-5	\N	ファッションブランドB 配送部	06-7777-8888	\N	\N	\N	\N	\N	\N	\N	2026-03-20	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	[]	{}	\N	\N	\N	\N	\N	40000000-0000-0000-0000-000000000002	2026-03-19 14:00:00	2026-03-22 12:10:58.948901	\N
80000000-0000-0000-0000-000000000004	00000000-0000-0000-0000-000000000001	SO-2026-0304	B2C	\N	\N	__builtin_yamato_b2__	\N	\N	t	2026-03-21 09:00:00	f	\N	f	\N	t	2026-03-21 14:00:00	f	\N	f	\N	f	\N	460-0008	愛知県	名古屋市中区	栄3-5-12 栄ハイツ801	\N	中村さくら	090-4567-8901	様	272-0127	千葉県	市川市	塩浜2-14-1	\N	EC商店A 出荷センター	047-111-2222	\N	\N	\N	\N	\N	\N	\N	2026-03-22	\N	\N	午前中	\N	\N	\N	\N	\N	\N	\N	\N	[]	{}	\N	\N	\N	\N	\N	40000000-0000-0000-0000-000000000001	2026-03-21 08:00:00	2026-03-22 12:10:58.949562	\N
80000000-0000-0000-0000-000000000005	00000000-0000-0000-0000-000000000001	SO-2026-0305	B2C	\N	\N	sagawa	\N	\N	t	2026-03-21 10:00:00	f	\N	f	\N	t	2026-03-21 15:00:00	f	\N	f	\N	f	\N	812-0012	福岡県	福岡市博多区	博多駅前2-1-1 博多タワー1503	\N	松本翔太	080-5678-9012	様	560-0032	大阪府	豊中市	蛍池東町1-3-5	\N	ファッションブランドB 配送部	06-7777-8888	\N	\N	\N	\N	\N	\N	\N	2026-03-22	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	[]	{}	\N	\N	\N	\N	\N	40000000-0000-0000-0000-000000000002	2026-03-21 09:00:00	2026-03-22 12:10:58.95016	\N
80000000-0000-0000-0000-000000000006	00000000-0000-0000-0000-000000000001	SO-2026-0306	B2C	\N	\N	__builtin_yamato_b2__	\N	\N	t	2026-03-22 08:00:00	f	\N	f	\N	f	\N	f	\N	f	\N	f	\N	171-0022	東京都	豊島区	南池袋1-28-1	\N	藤田優子	090-6789-0123	様	272-0127	千葉県	市川市	塩浜2-14-1	\N	EC商店A 出荷センター	047-111-2222	\N	\N	\N	\N	\N	\N	\N	2026-03-22	\N	\N	18-20時	\N	\N	\N	\N	\N	\N	\N	\N	[]	{}	\N	\N	\N	\N	\N	40000000-0000-0000-0000-000000000001	2026-03-22 07:00:00	2026-03-22 12:10:58.950758	\N
80000000-0000-0000-0000-000000000007	00000000-0000-0000-0000-000000000001	SO-2026-0307	B2C	\N	\N	japanpost	\N	\N	t	2026-03-22 08:30:00	f	\N	f	\N	f	\N	f	\N	f	\N	f	\N	330-0063	埼玉県	さいたま市浦和区	高砂3-1-4	\N	吉田裕也	070-7890-1234	様	272-0127	千葉県	市川市	塩浜2-14-1	\N	EC商店A 出荷センター	047-111-2222	\N	\N	\N	\N	\N	\N	\N	2026-03-22	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	[]	{}	\N	\N	\N	\N	\N	40000000-0000-0000-0000-000000000001	2026-03-22 07:30:00	2026-03-22 12:10:58.951331	\N
80000000-0000-0000-0000-000000000008	00000000-0000-0000-0000-000000000001	SO-2026-0308	B2C	\N	\N	__builtin_yamato_b2__	\N	\N	f	\N	f	\N	f	\N	f	\N	f	\N	f	\N	f	\N	260-0013	千葉県	千葉市中央区	中央1-2-3	\N	山口真一	080-8901-2345	様	272-0127	千葉県	市川市	塩浜2-14-1	\N	EC商店A 出荷センター	047-111-2222	\N	\N	\N	\N	\N	\N	\N	2026-03-23	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	[]	{}	\N	\N	\N	\N	\N	40000000-0000-0000-0000-000000000001	2026-03-22 09:00:00	2026-03-22 12:10:58.951939	\N
80000000-0000-0000-0000-000000000009	00000000-0000-0000-0000-000000000001	SO-2026-0309	B2C	\N	\N	seino	\N	\N	f	\N	f	\N	f	\N	f	\N	f	\N	f	\N	f	\N	650-0021	兵庫県	神戸市中央区	三宮町1-9-1	\N	加藤美奈	090-9012-3456	様	560-0032	大阪府	豊中市	蛍池東町1-3-5	\N	ファッションブランドB 配送部	06-7777-8888	\N	\N	\N	\N	\N	\N	\N	2026-03-23	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	[]	{}	\N	\N	\N	\N	\N	40000000-0000-0000-0000-000000000002	2026-03-22 09:30:00	2026-03-22 12:10:58.952517	\N
80000000-0000-0000-0000-000000000010	00000000-0000-0000-0000-000000000001	SO-2026-0310	B2C	\N	\N	__builtin_yamato_b2__	\N	\N	f	\N	f	\N	f	\N	f	\N	f	\N	f	\N	t	2026-03-21 16:00:00	160-0023	東京都	新宿区	歌舞伎町1-1-1	\N	田村光一	080-0123-4567	様	272-0127	千葉県	市川市	塩浜2-14-1	\N	EC商店A 出荷センター	047-111-2222	\N	\N	\N	\N	\N	\N	\N	2026-03-22	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	[]	{}	\N	\N	\N	\N	\N	40000000-0000-0000-0000-000000000001	2026-03-21 14:00:00	2026-03-22 12:10:58.953271	\N
80000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	SO-2026-0301	B2C	\N	\N	50000000-0000-0000-0000-000000000001	1234-5678-9012	\N	t	2026-03-18 09:00:00	f	\N	f	\N	t	2026-03-18 10:30:00	t	2026-03-18 14:00:00	f	\N	f	\N	160-0023	東京都	新宿区	西新宿2-8-1 都庁前マンション301	\N	渡辺健太	090-1234-5678	様	272-0127	千葉県	市川市	塩浜2-14-1	\N	EC商店A 出荷センター	047-111-2222	\N	\N	\N	\N	\N	\N	\N	2026-03-18	0	\N	14-16時	\N	\N	\N	\N	\N	\N	\N	\N	[]	{}	\N	\N	\N	\N	\N	40000000-0000-0000-0000-000000000001	2026-03-17 15:00:00	2026-03-22 12:30:23.347	\N
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
24103800-2402-4cbe-a45e-d916559fdd52	00000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000001	f72b7bb3-1c8d-4c1e-ba57-61061e25b10e	\N	150	5	2026-03-20 10:00:00	2026-03-22 12:06:45.818183	2026-03-22 12:06:45.818183
a748d421-537f-4d16-a762-ce3b23f22cf5	00000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000001	027e5377-3b6e-4d43-b33a-9309aef750d6	\N	80	0	2026-03-18 14:00:00	2026-03-22 12:06:45.818183	2026-03-22 12:06:45.818183
634e6a2a-5944-4b29-a383-704ec3510ac4	00000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000002	f72b7bb3-1c8d-4c1e-ba57-61061e25b10e	\N	45	3	2026-03-21 09:00:00	2026-03-22 12:06:45.818183	2026-03-22 12:06:45.818183
afd2f3a5-73f4-4f46-9837-759fe0ee3894	00000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000003	027e5377-3b6e-4d43-b33a-9309aef750d6	\N	30	2	2026-03-19 11:00:00	2026-03-22 12:06:45.818183	2026-03-22 12:06:45.818183
327e3ee1-cb6e-4993-9cd2-55568dd83ee6	00000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000004	b29c2424-a7ad-4b69-a627-34720cd5ce78	\N	60	0	2026-03-17 16:00:00	2026-03-22 12:06:45.818183	2026-03-22 12:06:45.818183
3c3ed321-f449-4fc1-b6d1-78d13402ab89	00000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000005	cbb780e3-185c-43b3-81ea-508ea3aaecda	\N	20	1	2026-03-20 15:00:00	2026-03-22 12:06:45.818183	2026-03-22 12:06:45.818183
b8076aae-5e6e-4599-9005-85fe9b081fbe	00000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000006	cbb780e3-185c-43b3-81ea-508ea3aaecda	\N	35	0	2026-03-18 13:00:00	2026-03-22 12:06:45.818183	2026-03-22 12:06:45.818183
3ac5c789-e3c9-48fe-bf99-4201bdb18af9	00000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000007	4ff57fc0-bb61-42c9-9f85-e938516aefa5	\N	100	8	2026-03-21 10:00:00	2026-03-22 12:06:45.818183	2026-03-22 12:06:45.818183
81ccc717-55ff-4322-a7d8-ecd25b6d4528	00000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000008	4ff57fc0-bb61-42c9-9f85-e938516aefa5	\N	85	5	2026-03-21 10:00:00	2026-03-22 12:06:45.818183	2026-03-22 12:06:45.818183
bb1f3912-6e8f-443a-9062-2eb7acf7f7bb	00000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000009	5bdee045-a10a-41e4-bf9a-70af3997309c	\N	40	3	2026-03-20 14:00:00	2026-03-22 12:06:45.818183	2026-03-22 12:06:45.818183
117e6588-766b-4a33-bdd3-01ea6c240283	00000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000010	310b3b77-e958-4217-a376-e7413b5d88af	\N	25	2	2026-03-19 09:00:00	2026-03-22 12:06:45.818183	2026-03-22 12:06:45.818183
1fb9d053-88ac-440e-9a54-a12b5f1a49c5	00000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000011	310b3b77-e958-4217-a376-e7413b5d88af	\N	50	0	2026-03-18 11:00:00	2026-03-22 12:06:45.818183	2026-03-22 12:06:45.818183
61424f52-190f-4cff-956a-836542685847	00000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000012	48257e1a-06e3-4407-bdc4-827acce82c0a	\N	70	0	2026-03-17 15:00:00	2026-03-22 12:06:45.818183	2026-03-22 12:06:45.818183
336887d2-886f-4b4c-86c9-d5658737426a	00000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000013	5bdee045-a10a-41e4-bf9a-70af3997309c	\N	35	1	2026-03-20 16:00:00	2026-03-22 12:06:45.818183	2026-03-22 12:06:45.818183
ed42397d-1f30-4e9a-bb46-ec1d588f7c0d	00000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000014	48257e1a-06e3-4407-bdc4-827acce82c0a	\N	45	0	2026-03-19 12:00:00	2026-03-22 12:06:45.818183	2026-03-22 12:06:45.818183
50afba20-64ca-4407-a415-484e5f7b2510	00000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000015	8b40a27f-d2ed-4a59-b1b4-c32329467ea9	\N	200	10	2026-03-21 08:00:00	2026-03-22 12:06:45.818183	2026-03-22 12:06:45.818183
592e760e-742f-4f92-93c0-f440061dd3ca	00000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000016	41eb3cd5-37f2-4697-9c84-dc13b57d2fa7	\N	120	0	2026-03-20 09:00:00	2026-03-22 12:06:45.818183	2026-03-22 12:06:45.818183
40f5477b-3523-4075-82a7-4db54118c75d	00000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000017	8b40a27f-d2ed-4a59-b1b4-c32329467ea9	\N	180	0	2026-03-19 10:00:00	2026-03-22 12:06:45.818183	2026-03-22 12:06:45.818183
bdae516f-4dd7-455f-86e9-31f4f6e031ef	00000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000018	41eb3cd5-37f2-4697-9c84-dc13b57d2fa7	\N	90	5	2026-03-18 14:00:00	2026-03-22 12:06:45.818183	2026-03-22 12:06:45.818183
78e7f674-7cec-4be9-8d2d-7d47fc2c8d6b	00000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000019	af75ee54-509a-4884-8b0b-090931f27723	\N	60	4	2026-03-21 11:00:00	2026-03-22 12:06:45.818183	2026-03-22 12:06:45.818183
5d5df44a-25d7-4227-a2f5-073f3843f83e	00000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000020	af75ee54-509a-4884-8b0b-090931f27723	\N	40	0	2026-03-20 13:00:00	2026-03-22 12:06:45.818183	2026-03-22 12:06:45.818183
aa2bcb61-98a9-4e6f-8500-fe4a469c5fba	00000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000021	d441387f-ec8a-489e-99cf-59e9ca45fc6a	\N	55	2	2026-03-19 15:00:00	2026-03-22 12:06:45.818183	2026-03-22 12:06:45.818183
edf59db8-b5ca-4352-a50d-ecfaf3ec9502	00000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000022	d441387f-ec8a-489e-99cf-59e9ca45fc6a	\N	80	0	2026-03-18 10:00:00	2026-03-22 12:06:45.818183	2026-03-22 12:06:45.818183
914aa6c8-f9cc-4ee8-9dd2-7c99a8fb3d88	00000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000023	2e59b2c0-4634-403d-907a-209086d302f4	\N	65	3	2026-03-20 11:00:00	2026-03-22 12:06:45.818183	2026-03-22 12:06:45.818183
85d197dc-fb14-41ed-959b-75a716576765	00000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000024	2e59b2c0-4634-403d-907a-209086d302f4	\N	30	0	2026-03-17 14:00:00	2026-03-22 12:06:45.818183	2026-03-22 12:06:45.818183
593396c8-9ca9-4913-978c-5333e50cd077	00000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000002	8b40a27f-d2ed-4a59-b1b4-c32329467ea9	\N	20	0	2026-03-15 10:00:00	2026-03-22 12:06:45.818183	2026-03-22 12:06:45.818183
e4c77640-1fac-494b-a912-141062576e46	00000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000007	48257e1a-06e3-4407-bdc4-827acce82c0a	\N	50	0	2026-03-16 11:00:00	2026-03-22 12:06:45.818183	2026-03-22 12:06:45.818183
acc82ae2-9b37-467a-be9d-89dfefe63eb0	00000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000015	2e59b2c0-4634-403d-907a-209086d302f4	\N	100	0	2026-03-14 09:00:00	2026-03-22 12:06:45.818183	2026-03-22 12:06:45.818183
79deab15-8200-430b-85d8-5190ee9d63aa	00000000-0000-0000-0000-000000000001	60000000-0000-0000-0000-000000000019	ba0f75a6-9bc8-4952-9a20-c28993ad4f93	\N	24	0	2026-03-22 08:00:00	2026-03-22 12:06:45.818183	2026-03-22 12:06:45.818183
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
10000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	SUP-001	株式会社山田商事	山田太郎	03-1234-5678	yamada@yamadashoji.co.jp	東京都中央区日本橋1-2-3 山田ビル5F	t	2026-03-22 12:04:56.836741	2026-03-22 12:04:56.836741
10000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	SUP-002	東京物産株式会社	佐藤花子	03-9876-5432	sato@tokyobussan.co.jp	東京都港区芝公園3-4-5 東京物産本社	t	2026-03-22 12:04:56.836741	2026-03-22 12:04:56.836741
10000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	SUP-003	大阪製造所	田中一郎	06-1111-2222	tanaka@osaka-mfg.co.jp	大阪府大阪市中央区本町2-5-8	t	2026-03-22 12:04:56.836741	2026-03-22 12:04:56.836741
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
00000000-0000-0000-0000-000000000001	default	Default Tenant	free	t	2026-03-22 11:55:08.918729	2026-03-22 11:55:08.918729
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, tenant_id, email, display_name, role, warehouse_ids, is_active, last_login_at, created_at, updated_at) FROM stdin;
00000000-0000-0000-0000-000000000002	00000000-0000-0000-0000-000000000001	admin@zelix.com	Admin	admin	[]	t	\N	2026-03-22 11:55:08.921702	2026-03-22 11:55:08.921702
e0343bdd-df04-424f-b8dd-053955f89c3c	00000000-0000-0000-0000-000000000001	dev@zelix.local	Dev User	admin	[]	t	2026-03-22 12:58:59.954	2026-03-22 11:56:57.823182	2026-03-22 11:56:57.823182
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
00000000-0000-0000-0000-000000000003	00000000-0000-0000-0000-000000000001	MAIN	メイン倉庫	\N	\N	\N	\N	東京都	\N	\N	[]	\N	\N	t	0	\N	2026-03-22 11:55:08.9228	2026-03-22 11:55:08.9228
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

\unrestrict 8EbsCLy7388f8oH28NHkLD9iU0vRWxb53evfsyDBcBel8enYX1gZrPXdpjZCLOc

