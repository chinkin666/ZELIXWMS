import type { Request, Response } from 'express';
import { InspectionRecord } from '@/models/inspectionRecord';
import { ExceptionReport, SLA_MINUTES } from '@/models/exceptionReport';
import { getTenantId } from '@/api/helpers/tenantHelper';

function generateNumber(prefix: string): string {
  const d = new Date();
  const ds = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `${prefix}-${ds}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
}

// 検品記録一覧 / 检品记录列表
export const listInspections = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);
    const { inboundOrderId, page, limit } = req.query;
    const filter: Record<string, unknown> = { tenantId };
    if (inboundOrderId) filter.inboundOrderId = inboundOrderId;

    const pageNum = Math.max(1, parseInt(String(page || '1'), 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(String(limit || '50'), 10) || 50));

    const [data, total] = await Promise.all([
      InspectionRecord.find(filter).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum).lean(),
      InspectionRecord.countDocuments(filter),
    ]);
    res.json({ data, total });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// 検品記録作成 / 创建检品记录
export const createInspection = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);
    const record = await InspectionRecord.create({
      ...req.body,
      tenantId,
      recordNumber: generateNumber('INS'),
    });

    // 異常がある場合、自動で ExceptionReport 作成 / 有异常时自动创建异常报告
    if (req.body.exceptions?.length > 0) {
      for (const exc of req.body.exceptions) {
        const level = exc.quantity > 10 ? 'C' : exc.quantity > 3 ? 'B' : 'A';
        const now = new Date();
        const slaDeadline = new Date(now.getTime() + SLA_MINUTES[level] * 60 * 1000);

        await ExceptionReport.create({
          tenantId,
          reportNumber: generateNumber('EXC'),
          referenceType: 'inbound_order',
          referenceId: req.body.inboundOrderId,
          clientId: req.body.clientId,
          level,
          category: exc.category,
          sku: req.body.sku,
          affectedQuantity: exc.quantity,
          description: exc.description || `検品異常: ${exc.category}`,
          photos: exc.photoUrls || [],
          status: 'open',
          reportedBy: req.body.inspectedBy,
          reportedAt: now,
          slaDeadline,
          slaBreached: false,
        });
      }
    }

    res.status(201).json(record.toObject());
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// 検品詳細 / 检品详情
export const getInspection = async (req: Request, res: Response): Promise<void> => {
  try {
    const record = await InspectionRecord.findById(req.params.id).lean();
    if (!record) { res.status(404).json({ message: 'Not found' }); return; }
    res.json(record);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// 検品復核 / 检品复核
export const verifyInspection = async (req: Request, res: Response): Promise<void> => {
  try {
    const { verifiedBy } = req.body;
    const updated = await InspectionRecord.findByIdAndUpdate(
      req.params.id,
      { verifiedBy, verifiedAt: new Date() },
      { new: true },
    ).lean();
    if (!updated) { res.status(404).json({ message: 'Not found' }); return; }
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
