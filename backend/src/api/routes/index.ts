import type { Application } from 'express';
import { Router } from 'express';
import { shipmentOrderRouter } from './shipmentOrders';
import { mappingConfigRouter } from './mappingConfigs';
import { orderSourceCompanyRouter } from './orderSourceCompanies';
import { carrierRouter } from './carriers';
import { productRouter } from './products';
import { printTemplateRouter } from './printTemplates';
import formTemplateRouter from './formTemplates';
import { carrierAutomationRouter } from './carrierAutomation';
import { orderGroupRouter } from './orderGroups';
import { autoProcessingRuleRouter } from './autoProcessingRules';
import { renderRouter } from './render';
import { locationRouter } from './locations';
import { inventoryRouter } from './inventory';
import { inboundOrderRouter } from './inboundOrders';
import { lotRouter } from './lots';
import { stocktakingOrderRouter } from './stocktakingOrders';
import { returnOrderRouter } from './returnOrders';
import { dailyReportRouter } from './dailyReports';
import { setProductRouter } from './setProducts';
import { supplierRouter } from './suppliers';
import { inventoryCategoryRouter } from './inventoryCategories';
import { customerRouter } from './customers';
import { operationLogRouter } from './operationLogs';
import { systemSettingsRouter } from './systemSettings';
import { emailTemplateRouter } from './emailTemplates';
import { apiLogRouter } from './apiLogs';
import { wmsScheduleRouter } from './wmsSchedules';
import { taskRouter } from './tasks';
import { waveRouter } from './waves';
import { ruleRouter } from './rules';
import { serialNumberRouter } from './serialNumbers';
import { tenantRouter } from './tenants';
import { inventoryLedgerRouter } from './inventoryLedger';
import { clientRouter } from './clients';
import { warehouseRouter } from './warehouses';
import { workflowRouter } from './workflows';
import { extensionRouter } from './extensions';
import { dashboardRouter } from './dashboard';
import { sagawaRouter } from './sagawa';
import { shippingRateRouter } from './shippingRates';
import { billingRouter } from './billing';
import { packingRuleRouter } from './packingRules';
import { materialRouter } from './materials';
import { serviceRateRouter } from './serviceRates';
import { workChargeRouter } from './workCharges';
import { userRouter } from './users';
import { authRouter } from './auth';
import { fbaRouter } from './fba';

export const registerCoreRoutes = (app: Application): void => {
  const api = Router();

  // 认证路由（登录・注册等，无需全局认证） / 認証ルート（ログイン・登録等、グローバル認証不要）
  api.use('/auth', authRouter);

  api.use('/dashboard', dashboardRouter);
  api.use('/shipment-orders', shipmentOrderRouter);
  api.use('/mapping-configs', mappingConfigRouter);
  api.use('/order-source-companies', orderSourceCompanyRouter);
  api.use('/carriers', carrierRouter);
  api.use('/products', productRouter);
  api.use('/print-templates', printTemplateRouter);
  api.use('/form-templates', formTemplateRouter);
  api.use('/carrier-automation', carrierAutomationRouter);
  api.use('/order-groups', orderGroupRouter);
  api.use('/auto-processing-rules', autoProcessingRuleRouter);
  api.use('/render', renderRouter);
  api.use('/locations', locationRouter);
  api.use('/inventory', inventoryRouter);
  api.use('/inbound-orders', inboundOrderRouter);
  api.use('/lots', lotRouter);
  api.use('/stocktaking-orders', stocktakingOrderRouter);
  api.use('/return-orders', returnOrderRouter);
  api.use('/daily-reports', dailyReportRouter);
  api.use('/set-products', setProductRouter);
  api.use('/suppliers', supplierRouter);
  api.use('/inventory-categories', inventoryCategoryRouter);
  api.use('/customers', customerRouter);
  api.use('/operation-logs', operationLogRouter);
  api.use('/system-settings', systemSettingsRouter);
  api.use('/email-templates', emailTemplateRouter);
  api.use('/api-logs', apiLogRouter);
  api.use('/wms-schedules', wmsScheduleRouter);
  api.use('/tasks', taskRouter);
  api.use('/waves', waveRouter);
  api.use('/rules', ruleRouter);
  api.use('/serial-numbers', serialNumberRouter);
  api.use('/tenants', tenantRouter);
  api.use('/inventory-ledger', inventoryLedgerRouter);
  api.use('/clients', clientRouter);
  api.use('/warehouses', warehouseRouter);
  api.use('/workflows', workflowRouter);

  // 运费率表 / 運賃率表
  api.use('/shipping-rates', shippingRateRouter);

  // 請求・請求書 / 账单・发票
  api.use('/billing', billingRouter);

  // 佐川急便 / 佐川急便
  api.use('/carriers/sagawa', sagawaRouter);

  // 梱包ルール / 梱包规则
  api.use('/packing-rules', packingRuleRouter);

  // 耗材マスター / 耗材主数据
  api.use('/materials', materialRouter);

  // サービス料金マスタ / 服务费率主数据
  api.use('/service-rates', serviceRateRouter);

  // 作業チャージ / 作业费用
  api.use('/work-charges', workChargeRouter);

  // ユーザー管理 / 用户管理
  api.use('/users', userRouter);

  // FBA入庫プラン / FBA入库计划
  api.use('/fba', fbaRouter);

  // 扩展系统 / 拡張システム
  api.use('/extensions', extensionRouter);

  app.use('/api', api);
};

