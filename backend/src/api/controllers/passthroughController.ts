import type { Request, Response } from 'express';
import { InboundOrder } from '@/models/inboundOrder';
import { getTenantId } from '@/api/helpers/tenantHelper';
import {
  createPassthroughOrder,
  arriveOrder,
  completeServiceOption,
  onLabelUploaded,
  shipOrder,
  acknowledgeVariance,
} from '@/services/passthroughService';
import { processOrderFbaLabel } from '@/services/fbaLabelService';

/**
 * 通過型入庫予約一覧 / 通过型入库预定列表
 */
export const listPassthroughOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);
    const { status, clientId, shopId, search, page, limit } = req.query;

    const filter: Record<string, unknown> = { tenantId, flowType: 'passthrough' };

    if (typeof status === 'string' && status) filter.status = status;
    if (typeof clientId === 'string' && clientId) filter.clientId = clientId;
    if (typeof shopId === 'string' && shopId) filter.shopId = shopId;
    if (typeof search === 'string' && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.orderNumber = { $regex: escaped, $options: 'i' };
    }

    const pageNum = Math.max(1, parseInt(String(page || '1'), 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(String(limit || '50'), 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [data, total] = await Promise.all([
      InboundOrder.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      InboundOrder.countDocuments(filter),
    ]);

    res.json({ data, total });
  } catch (error: any) {
    res.status(500).json({ message: '一覧取得に失敗 / 获取列表失败', error: error.message });
  }
};

/**
 * 通過型入庫予約詳細 / 通过型入库预定详情
 */
export const getPassthroughOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const order = await InboundOrder.findById(req.params.id).lean();
    if (!order) {
      res.status(404).json({ message: '入庫予約が見つかりません / 入库预定不存在' });
      return;
    }
    res.json(order);
  } catch (error: any) {
    res.status(500).json({ message: '詳細取得に失敗 / 获取详情失败', error: error.message });
  }
};

/**
 * 入庫予約作成（客户门户调用）/ 入庫予約作成
 */
export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);
    const order = await createPassthroughOrder({ ...req.body, tenantId });
    res.status(201).json(order.toObject());
  } catch (error: any) {
    res.status(500).json({ message: '作成に失敗 / 创建失败', error: error.message });
  }
};

/**
 * 受付（仓库扫码）/ 受付
 */
export const arrive = async (req: Request, res: Response): Promise<void> => {
  try {
    const { actualBoxCount, receivedBy, varianceDetails } = req.body;
    const order = await arriveOrder(req.params.id, { actualBoxCount, receivedBy, varianceDetails });
    res.json(order.toObject());
  } catch (error: any) {
    const status = error.message.includes('見つかりません') ? 404 : 400;
    res.status(status).json({ message: error.message });
  }
};

/**
 * 作業オプション完了 / 作业选项完成
 */
export const completeOption = async (req: Request, res: Response): Promise<void> => {
  try {
    const { optionCode, actualQuantity } = req.body;
    if (!optionCode) {
      res.status(400).json({ message: 'optionCode は必須です / optionCode 必填' });
      return;
    }
    const order = await completeServiceOption(req.params.id, optionCode, actualQuantity || 0);
    res.json(order.toObject());
  } catch (error: any) {
    const status = error.message.includes('見つかりません') ? 404 : 400;
    res.status(status).json({ message: error.message });
  }
};

/**
 * FBAラベルアップロード通知 / FBA标上传完成通知
 */
export const labelUploaded = async (req: Request, res: Response): Promise<void> => {
  try {
    const order = await onLabelUploaded(req.params.id);
    res.json(order.toObject());
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * 出荷完了 / 出货完成
 */
export const ship = async (req: Request, res: Response): Promise<void> => {
  try {
    const { trackingNumbers } = req.body;
    if (!trackingNumbers || !Array.isArray(trackingNumbers) || trackingNumbers.length === 0) {
      res.status(400).json({ message: '追跡番号は必須です / 追踪号必填' });
      return;
    }
    const order = await shipOrder(req.params.id, { trackingNumbers });
    res.json(order.toObject());
  } catch (error: any) {
    const status = error.message.includes('見つかりません') ? 404 : 400;
    res.status(status).json({ message: error.message });
  }
};

/**
 * 差異確認（客户门户）/ 差異確認
 */
export const ackVariance = async (req: Request, res: Response): Promise<void> => {
  try {
    const order = await acknowledgeVariance(req.params.id);
    res.json(order.toObject());
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * 暂存区看板 / 一時保管エリアダッシュボード
 */
export const stagingDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);
    const activeStatuses = ['arrived', 'processing', 'awaiting_label', 'ready_to_ship'];

    const orders = await InboundOrder.find({
      tenantId,
      flowType: 'passthrough',
      status: { $in: activeStatuses },
    }).sort({ arrivedAt: 1 }).lean();

    const now = Date.now();
    const summary = {
      totalOrders: orders.length,
      totalBoxes: orders.reduce((sum, o) => sum + (o.actualBoxCount || o.totalBoxCount || 0), 0),
      byDuration: {
        under24h: 0,
        under48h: 0,
        under72h: 0,
        over72h: 0,
      },
      byClient: {} as Record<string, { orders: number; boxes: number }>,
      alerts: [] as Array<{ orderNumber: string; clientId?: string; reason: string; hours: number }>,
    };

    for (const order of orders) {
      const arrived = order.arrivedAt ? new Date(order.arrivedAt).getTime() : now;
      const hours = (now - arrived) / (1000 * 60 * 60);

      if (hours < 24) summary.byDuration.under24h++;
      else if (hours < 48) summary.byDuration.under48h++;
      else if (hours < 72) summary.byDuration.under72h++;
      else summary.byDuration.over72h++;

      // 超72h预警 / 72時間超過警告
      if (hours > 72) {
        const reason = order.status === 'awaiting_label' ? 'FBA標未上传' : '暂存超时';
        summary.alerts.push({
          orderNumber: order.orderNumber,
          clientId: order.clientId?.toString(),
          reason,
          hours: Math.round(hours),
        });
      }

      // 按客户汇总 / 顧客別集計
      const cid = order.clientId?.toString() || 'unknown';
      if (!summary.byClient[cid]) summary.byClient[cid] = { orders: 0, boxes: 0 };
      summary.byClient[cid].orders++;
      summary.byClient[cid].boxes += order.actualBoxCount || order.totalBoxCount || 0;
    }

    res.json(summary);
  } catch (error: any) {
    res.status(500).json({ message: 'ダッシュボード取得に失敗 / 获取看板失败', error: error.message });
  }
};

/**
 * FBA/RSLラベルPDFアップロード＋分割 / FBA/RSL标PDF上传+拆分
 *
 * multipart/form-data: file + format(4up/6up/single)
 */
export const uploadAndSplitLabel = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = (req as any).file;
    if (!file) {
      res.status(400).json({ message: 'PDFファイルが必要です / 需要PDF文件' });
      return;
    }

    const format = (req.body.format || '6up') as '4up' | '6up' | 'single';
    if (!['4up', '6up', 'single'].includes(format)) {
      res.status(400).json({ message: 'format は 4up/6up/single のいずれか / format 必须是 4up/6up/single' });
      return;
    }

    const splitLabels = await processOrderFbaLabel(req.params.id, file.buffer, format);
    res.json({ splitLabels, count: splitLabels.length });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
