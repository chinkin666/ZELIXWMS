import type { Request, Response } from 'express';
import { LabelingTask } from '@/models/labelingTask';
import { WorkCharge } from '@/models/workCharge';

function generateNumber(): string {
  const d = new Date();
  const ds = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `LBL-${ds}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
}

export const listLabelingTasks = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const { status, inboundOrderId, page, limit } = req.query;
    const filter: Record<string, unknown> = { tenantId };
    if (status) filter.status = status;
    if (inboundOrderId) filter.inboundOrderId = inboundOrderId;

    const pageNum = Math.max(1, parseInt(String(page || '1'), 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(String(limit || '50'), 10) || 50));

    const [data, total] = await Promise.all([
      LabelingTask.find(filter).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum).lean(),
      LabelingTask.countDocuments(filter),
    ]);
    res.json({ data, total });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createLabelingTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const task = await LabelingTask.create({
      ...req.body,
      tenantId,
      taskNumber: generateNumber(),
      status: 'pending',
      completedQuantity: 0,
      failedQuantity: 0,
    });
    res.status(201).json(task.toObject());
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getLabelingTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const task = await LabelingTask.findById(req.params.id).lean();
    if (!task) { res.status(404).json({ message: 'Not found' }); return; }
    res.json(task);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ステータス遷移 / 状态流转
export const startPrint = async (req: Request, res: Response): Promise<void> => {
  try {
    const updated = await LabelingTask.findByIdAndUpdate(
      req.params.id,
      { status: 'printing', labeledBy: req.body.operatorId },
      { new: true },
    ).lean();
    if (!updated) { res.status(404).json({ message: 'Not found' }); return; }
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const startLabel = async (req: Request, res: Response): Promise<void> => {
  try {
    const updated = await LabelingTask.findByIdAndUpdate(req.params.id, { status: 'labeling' }, { new: true }).lean();
    if (!updated) { res.status(404).json({ message: 'Not found' }); return; }
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const verifyLabel = async (req: Request, res: Response): Promise<void> => {
  try {
    const { verifiedBy, result, failedQuantity, failureReason } = req.body;
    const task = await LabelingTask.findById(req.params.id);
    if (!task) { res.status(404).json({ message: 'Not found' }); return; }

    task.status = 'completed';
    task.verifiedBy = verifiedBy;
    task.verifiedAt = new Date();
    task.verificationResult = result || 'pass';
    task.failedQuantity = failedQuantity || 0;
    task.failureReason = failureReason;
    task.completedQuantity = task.requiredQuantity - (failedQuantity || 0);
    await task.save();

    res.json(task.toObject());
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// 入庫予約から一括生成 / 入库预定批量生成
export const batchCreateFromOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const { inboundOrderId, lines } = req.body;
    if (!lines?.length) { res.status(400).json({ message: 'lines required' }); return; }

    const tasks = [];
    for (const line of lines) {
      const task = await LabelingTask.create({
        tenantId,
        taskNumber: generateNumber(),
        inboundOrderId,
        productId: line.productId,
        sku: line.sku,
        fnsku: line.fnsku,
        labelTypes: line.labelTypes || ['fnsku'],
        requiredQuantity: line.quantity,
        completedQuantity: 0,
        failedQuantity: 0,
        status: 'pending',
      });
      tasks.push(task.toObject());
    }

    res.status(201).json({ tasks, count: tasks.length });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
