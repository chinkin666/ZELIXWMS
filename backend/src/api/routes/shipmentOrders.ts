import { Router } from 'express';
import { bulkUpdateOrders, createManualOrdersBulk, deleteOrder, deleteOrdersBulk, getOrder, getOrdersByIds, handleStatus, handleStatusBulk, importCarrierReceiptRows, listOrders, updateOrder } from '@/api/controllers/shipmentOrderController';

export const shipmentOrderRouter = Router();

// 批量操作和具体路径放在前面
shipmentOrderRouter.post('/manual/bulk', createManualOrdersBulk);
shipmentOrderRouter.post('/carrier-receipts/import', importCarrierReceiptRows);
shipmentOrderRouter.post('/status/bulk', handleStatusBulk);
shipmentOrderRouter.post('/delete/bulk', deleteOrdersBulk);
shipmentOrderRouter.post('/by-ids', getOrdersByIds);
shipmentOrderRouter.patch('/bulk', bulkUpdateOrders);

// 参数化路径放在最后
shipmentOrderRouter.post('/:id/status', handleStatus);
shipmentOrderRouter.get('/', listOrders);
shipmentOrderRouter.get('/:id', getOrder);
shipmentOrderRouter.put('/:id', updateOrder);
shipmentOrderRouter.delete('/:id', deleteOrder);

