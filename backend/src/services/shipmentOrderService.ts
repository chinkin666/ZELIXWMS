import type { OrderDocument } from '@/models/order';
import { ShipmentOrder, calculateProductsMeta } from '@/models/shipmentOrder';
import { generateOrderNumbers } from '@/utils/idGenerator';

export interface UploadArtifact {
  uploadId: string;
  tenantId: string;
  filename: string;
  mimeType: string;
  storedPath: string;
}

export const ingestCsv = async (_artifact: UploadArtifact): Promise<OrderDocument[]> => {
  throw new Error('ingestCsv not implemented');
};

/**
 * 为订单数组生成订单号
 * 批量生成时，按顺序为每个订单生成唯一的订单号
 */
export const assignOrderNumbers = async (orders: Partial<OrderDocument>[]): Promise<OrderDocument[]> => {
  const orderNumbers = await generateOrderNumbers(orders.length);
  return orders.map((order, i) => ({ ...order, orderNumber: orderNumbers[i] } as OrderDocument));
};

export const persistShipmentOrders = async (orders: OrderDocument[]): Promise<{ insertedIds: string[] }> => {
  // insertMany 不会触发 pre-save hooks，所以需要手动计算 _productsMeta
  const ordersWithMeta = orders.map((order) => {
    const products = order.products || [];
    const _productsMeta = calculateProductsMeta(products);
    return {
      ...order,
      _productsMeta,
    };
  });

  const inserted = await ShipmentOrder.insertMany(ordersWithMeta as any[], { ordered: true });
  return { insertedIds: inserted.map((d) => String(d._id)) };
};

