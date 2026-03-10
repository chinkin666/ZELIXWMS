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

export const registerCoreRoutes = (app: Application): void => {
  const api = Router();

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

  app.use('/api', api);
};

