import type { Request, Response } from 'express';
import { TaskEngine } from '@/services/taskEngine';
import { WarehouseTask } from '@/models/warehouseTask';

/** タスク一覧 */
export const listTasks = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      warehouseId,
      type,
      status,
      assignedTo,
      priority,
      search,
      page: pageStr,
      limit: limitStr,
    } = req.query;

    const filter: Record<string, unknown> = {};

    if (typeof warehouseId === 'string' && warehouseId.trim()) {
      filter.warehouseId = warehouseId.trim();
    }
    if (typeof type === 'string' && type.trim()) {
      filter.type = type.trim();
    }
    if (typeof status === 'string' && status.trim()) {
      filter.status = status.trim();
    }
    if (typeof assignedTo === 'string' && assignedTo.trim()) {
      filter.assignedTo = assignedTo.trim();
    }
    if (typeof priority === 'string' && priority.trim()) {
      filter.priority = priority.trim();
    }
    if (typeof search === 'string' && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { taskNumber: regex },
        { assignedName: regex },
      ];
    }

    const page = Math.max(1, Number(pageStr) || 1);
    const limit = Math.min(500, Math.max(1, Number(limitStr) || 50));
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      WarehouseTask.find(filter)
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      WarehouseTask.countDocuments(filter),
    ]);

    res.json({ data, total, page, limit });
  } catch (error: any) {
    res.status(500).json({ message: 'タスク一覧の取得に失敗しました', error: error.message });
  }
};

/** タスク詳細 */
export const getTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const task = await WarehouseTask.findById(req.params.id).lean();
    if (!task) {
      res.status(404).json({ message: 'タスクが見つかりません' });
      return;
    }
    res.json(task);
  } catch (error: any) {
    res.status(500).json({ message: 'タスクの取得に失敗しました', error: error.message });
  }
};

/** タスク作成 */
export const createTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const task = await TaskEngine.createTask(req.body);
    res.status(201).json(task);
  } catch (error: any) {
    res.status(500).json({ message: 'タスクの作成に失敗しました', error: error.message });
  }
};

/** タスク割り当て */
export const assignTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const existing = await WarehouseTask.findById(req.params.id).lean();
    if (!existing) {
      res.status(404).json({ message: 'タスクが見つかりません' });
      return;
    }

    const { assignedTo, assignedName } = req.body;
    if (!assignedTo) {
      res.status(400).json({ message: 'assignedTo は必須です' });
      return;
    }

    const task = await TaskEngine.assignTask(req.params.id, assignedTo, assignedName);
    res.json(task);
  } catch (error: any) {
    res.status(500).json({ message: 'タスクの割り当てに失敗しました', error: error.message });
  }
};

/** タスク開始 */
export const startTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const existing = await WarehouseTask.findById(req.params.id).lean();
    if (!existing) {
      res.status(404).json({ message: 'タスクが見つかりません' });
      return;
    }

    const task = await TaskEngine.startTask(req.params.id);
    res.json(task);
  } catch (error: any) {
    res.status(500).json({ message: 'タスクの開始に失敗しました', error: error.message });
  }
};

/** タスク完了 */
export const completeTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const existing = await WarehouseTask.findById(req.params.id).lean();
    if (!existing) {
      res.status(404).json({ message: 'タスクが見つかりません' });
      return;
    }

    const { completedQuantity, executedBy } = req.body;
    if (completedQuantity === undefined || completedQuantity === null) {
      res.status(400).json({ message: 'completedQuantity は必須です' });
      return;
    }

    const task = await TaskEngine.completeTask(req.params.id, completedQuantity, executedBy);
    res.json(task);
  } catch (error: any) {
    res.status(500).json({ message: 'タスクの完了に失敗しました', error: error.message });
  }
};

/** タスクキャンセル */
export const cancelTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const existing = await WarehouseTask.findById(req.params.id).lean();
    if (!existing) {
      res.status(404).json({ message: 'タスクが見つかりません' });
      return;
    }

    const { reason } = req.body;
    const task = await TaskEngine.cancelTask(req.params.id, reason);
    res.json(task);
  } catch (error: any) {
    res.status(500).json({ message: 'タスクのキャンセルに失敗しました', error: error.message });
  }
};

/** タスク保留 */
export const holdTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const existing = await WarehouseTask.findById(req.params.id).lean();
    if (!existing) {
      res.status(404).json({ message: 'タスクが見つかりません' });
      return;
    }

    const { reason } = req.body;
    const task = await TaskEngine.holdTask(req.params.id, reason);
    res.json(task);
  } catch (error: any) {
    res.status(500).json({ message: 'タスクの保留に失敗しました', error: error.message });
  }
};

/** 次のタスク取得 */
export const getNextTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const { warehouseId, assignedTo } = req.query;

    if (typeof warehouseId !== 'string' || !warehouseId.trim()) {
      res.status(400).json({ message: 'warehouseId は必須です' });
      return;
    }
    if (typeof assignedTo !== 'string' || !assignedTo.trim()) {
      res.status(400).json({ message: 'assignedTo は必須です' });
      return;
    }

    const task = await TaskEngine.getNextTask(warehouseId.trim(), assignedTo.trim());
    res.json(task);
  } catch (error: any) {
    res.status(500).json({ message: '次のタスクの取得に失敗しました', error: error.message });
  }
};

/** タスクキュー取得 */
export const getTaskQueue = async (req: Request, res: Response): Promise<void> => {
  try {
    const { warehouseId, type, status, assignedTo, limit: limitStr } = req.query;

    if (typeof warehouseId !== 'string' || !warehouseId.trim()) {
      res.status(400).json({ message: 'warehouseId は必須です' });
      return;
    }

    const options: Record<string, unknown> = {};
    if (typeof type === 'string' && type.trim()) {
      options.type = type.trim();
    }
    if (typeof status === 'string' && status.trim()) {
      options.status = status.trim();
    }
    if (typeof assignedTo === 'string' && assignedTo.trim()) {
      options.assignedTo = assignedTo.trim();
    }
    if (typeof limitStr === 'string' && limitStr.trim()) {
      options.limit = Math.min(500, Math.max(1, Number(limitStr) || 50));
    }

    const tasks = await TaskEngine.getTaskQueue(warehouseId.trim(), options);
    res.json(tasks);
  } catch (error: any) {
    res.status(500).json({ message: 'タスクキューの取得に失敗しました', error: error.message });
  }
};
