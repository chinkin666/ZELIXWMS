import { Router, Request, Response } from 'express';
import {
  listInboundOrders,
  getInboundOrder,
  createInboundOrder,
  updateInboundOrder,
  confirmInboundOrder,
  receiveInboundLine,
  putawayInboundLine,
  bulkReceiveInbound,
  completeInboundOrder,
  cancelInboundOrder,
  deleteInboundOrder,
  searchInboundHistory,
  getInboundVariance,
  suggestPutawayLocations,
} from '@/api/controllers/inboundOrderController';
import { importInboundOrders } from '@/services/csvImportService';

export const inboundOrderRouter = Router();

/**
 * 入庫予定 CSV インポート / 入库预定 CSV 导入
 * POST /api/inbound-orders/import
 * Body: raw CSV text in req.body.csv or req.body (Buffer)
 */
inboundOrderRouter.post('/import', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const { csv, defaultLocationId, preview } = req.body;
    if (!csv) {
      res.status(400).json({ message: 'csv フィールドは必須です / csv field is required' });
      return;
    }
    const buffer = Buffer.from(csv, 'utf-8');
    const result = await importInboundOrders(buffer, { tenantId, defaultLocationId, preview });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: 'CSVインポートに失敗しました', error: error.message });
  }
});

inboundOrderRouter.get('/', listInboundOrders);
inboundOrderRouter.get('/history', searchInboundHistory);
inboundOrderRouter.post('/', createInboundOrder);
inboundOrderRouter.get('/:id', getInboundOrder);
inboundOrderRouter.put('/:id', updateInboundOrder);
inboundOrderRouter.delete('/:id', deleteInboundOrder);
inboundOrderRouter.post('/:id/confirm', confirmInboundOrder);
inboundOrderRouter.post('/:id/receive', receiveInboundLine);
inboundOrderRouter.post('/:id/bulk-receive', bulkReceiveInbound);
inboundOrderRouter.post('/:id/putaway', putawayInboundLine);
inboundOrderRouter.get('/:id/variance', getInboundVariance);
inboundOrderRouter.get('/:id/suggest-locations', suggestPutawayLocations);
inboundOrderRouter.post('/:id/complete', completeInboundOrder);
inboundOrderRouter.post('/:id/cancel', cancelInboundOrder);
