import type { Request, Response } from 'express';
import { ExceptionReport, SLA_MINUTES } from '@/models/exceptionReport';
import type { ExceptionLevel } from '@/models/exceptionReport';

function generateNumber(): string {
  const d = new Date();
  const ds = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `EXC-${ds}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
}

// 異常報告一覧 / 异常报告列表
export const listExceptions = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const { status, level, clientId, page, limit } = req.query;
    const filter: Record<string, unknown> = { tenantId };
    if (status) filter.status = status;
    if (level) filter.level = level;
    if (clientId) filter.clientId = clientId;

    const pageNum = Math.max(1, parseInt(String(page || '1'), 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(String(limit || '50'), 10) || 50));

    const [data, total] = await Promise.all([
      ExceptionReport.find(filter).sort({ slaDeadline: 1, createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum).lean(),
      ExceptionReport.countDocuments(filter),
    ]);
    res.json({ data, total });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// 異常報告作成 / 创建异常报告
export const createException = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const level = (req.body.level || 'A') as ExceptionLevel;
    const now = new Date();
    const slaDeadline = new Date(now.getTime() + SLA_MINUTES[level] * 60 * 1000);

    const report = await ExceptionReport.create({
      ...req.body,
      tenantId,
      reportNumber: generateNumber(),
      reportedAt: now,
      slaDeadline,
      slaBreached: false,
      status: 'open',
    });
    res.status(201).json(report.toObject());
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// 異常詳細 / 异常详情
export const getException = async (req: Request, res: Response): Promise<void> => {
  try {
    const report = await ExceptionReport.findById(req.params.id).lean();
    if (!report) { res.status(404).json({ message: 'Not found' }); return; }
    res.json(report);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// 通知 / 通知
export const notifyException = async (req: Request, res: Response): Promise<void> => {
  try {
    const updated = await ExceptionReport.findByIdAndUpdate(
      req.params.id,
      { status: 'notified', notifiedAt: new Date() },
      { new: true },
    ).lean();
    if (!updated) { res.status(404).json({ message: 'Not found' }); return; }
    // TODO: webhook 通知実装 / webhook 通知实现
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// 顧客確認 / 客户确认
export const acknowledgeException = async (req: Request, res: Response): Promise<void> => {
  try {
    const updated = await ExceptionReport.findByIdAndUpdate(
      req.params.id,
      { status: 'acknowledged', acknowledgedAt: new Date() },
      { new: true },
    ).lean();
    if (!updated) { res.status(404).json({ message: 'Not found' }); return; }
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// 処理完了 / 处理完成
export const resolveException = async (req: Request, res: Response): Promise<void> => {
  try {
    const { resolvedBy, resolution } = req.body;
    const updated = await ExceptionReport.findByIdAndUpdate(
      req.params.id,
      { status: 'resolved', resolvedBy, resolvedAt: new Date(), resolution },
      { new: true },
    ).lean();
    if (!updated) { res.status(404).json({ message: 'Not found' }); return; }
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// SLA 状況 / SLA 状况
export const slaStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const now = new Date();

    // SLA超過のオープン報告を検出 / 检测SLA超时的未处理报告
    const breached = await ExceptionReport.find({
      tenantId,
      status: { $in: ['open', 'notified'] },
      slaDeadline: { $lt: now },
    }).lean();

    // 未超過を更新 / 更新已超时标记
    if (breached.length > 0) {
      await ExceptionReport.updateMany(
        { _id: { $in: breached.map(b => b._id) }, slaBreached: false },
        { slaBreached: true },
      );
    }

    const openCount = await ExceptionReport.countDocuments({ tenantId, status: { $in: ['open', 'notified'] } });
    const breachedCount = breached.length;

    res.json({ openCount, breachedCount, breachedReports: breached });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
