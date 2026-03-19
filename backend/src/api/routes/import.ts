/**
 * CSV 導入路由 / CSV インポートルート
 */

import { Router } from 'express';
import {
  uploadMiddleware,
  importShipmentOrdersCsv,
  importProductsCsv,
  downloadTemplate,
} from '@/api/controllers/importController';

export const importRouter = Router();

// CSV インポート / CSV 导入
importRouter.post('/shipment-orders', uploadMiddleware, importShipmentOrdersCsv);
importRouter.post('/products', uploadMiddleware, importProductsCsv);

// テンプレートダウンロード / 模板下载
importRouter.get('/templates/:type', downloadTemplate);
