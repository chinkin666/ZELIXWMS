/**
 * 保管型出庫申請 / 保管型出库申请
 *
 * 客户从门户提交出库请求，仓库端生成拣货→包装→出货任务。
 * 顧客がポータルから出庫リクエストを送信、倉庫端でピッキング→梱包→出荷タスクを生成。
 */
import type { Request, Response } from 'express';
import mongoose from 'mongoose';

const OutboundRequest = mongoose.connection.collection('outbound_requests');

function generateNumber(): string {
  const d = new Date();
  const ds = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `OB-${ds}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
}

// 出库申请一覧 / 出库申请列表
export const listOutboundRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const { clientId, status, page, limit } = req.query;
    const filter: Record<string, unknown> = { tenantId };
    if (clientId) filter.clientId = clientId;
    if (status) filter.status = status;

    const pageNum = Math.max(1, parseInt(String(page || '1'), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit || '50'), 10) || 50));

    const data = await OutboundRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .toArray();
    const total = await OutboundRequest.countDocuments(filter);

    res.json({ data, total });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// 出库申请作成 / 创建出库申请
export const createOutboundRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const {
      clientId, clientName, subClientId, shopId,
      recipientName, postalCode, prefecture, city, address1, address2, phone,
      items, // [{ productId, sku, productName, quantity }]
      carrier, deliveryNote, memo,
    } = req.body;

    if (!items?.length) {
      res.status(400).json({ message: '商品は必須です / 商品必填' });
      return;
    }

    const doc = {
      tenantId,
      requestNumber: generateNumber(),
      status: 'pending', // pending → approved → picking → packed → shipped → completed
      clientId,
      clientName,
      subClientId,
      shopId,
      recipient: { recipientName, postalCode, prefecture, city, address1, address2, phone },
      items: items.map((item: any, idx: number) => ({
        lineNumber: idx + 1,
        productId: item.productId,
        sku: item.sku,
        productName: item.productName,
        quantity: item.quantity,
        pickedQuantity: 0,
      })),
      carrier,
      deliveryNote,
      memo,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await OutboundRequest.insertOne(doc);
    res.status(201).json({ ...doc, _id: result.insertedId });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// 出库申请详情 / 出库申请详情
export const getOutboundRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const doc = await OutboundRequest.findOne({ _id: new mongoose.Types.ObjectId(req.params.id) });
    if (!doc) { res.status(404).json({ message: 'Not found' }); return; }
    res.json(doc);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// 承认 / 承認
export const approveOutboundRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await OutboundRequest.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(req.params.id), status: 'pending' },
      { $set: { status: 'approved', approvedAt: new Date(), approvedBy: req.body.approvedBy } },
      { returnDocument: 'after' },
    );
    if (!result) { res.status(404).json({ message: 'Not found or not pending' }); return; }
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// 出货完成 / 出荷完了
export const shipOutboundRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { trackingNumber, carrier } = req.body;
    const result = await OutboundRequest.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      { $set: { status: 'shipped', trackingNumber, carrier, shippedAt: new Date() } },
      { returnDocument: 'after' },
    );
    if (!result) { res.status(404).json({ message: 'Not found' }); return; }
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
