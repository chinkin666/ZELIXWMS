import type { Request, Response } from 'express';
import crypto from 'crypto';
import { WmsSchedule } from '@/models/wmsSchedule';
import { WmsTask } from '@/models/wmsTask';
import { WmsScheduleLog } from '@/models/wmsScheduleLog';

/** Generate task number: WMT-{YYYYMMDD}-{random8} */
function generateTaskNumber(): string {
  const now = new Date();
  const dateStr = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');
  const rand = crypto.randomBytes(4).toString('hex');
  return `WMT-${dateStr}-${rand}`;
}

/** Build a Mongo filter from query params for logs */
function buildLogFilter(query: Record<string, unknown>): Record<string, unknown> {
  const { action, event, dateFrom, dateTo } = query;
  const filter: Record<string, unknown> = {};

  if (typeof action === 'string' && action.trim()) {
    filter.action = action.trim();
  }
  if (typeof event === 'string' && event.trim()) {
    filter.event = event.trim();
  }
  if (typeof dateFrom === 'string' && dateFrom.trim()) {
    const from = new Date(dateFrom.trim());
    if (!isNaN(from.getTime())) {
      filter.createdAt = { ...(filter.createdAt as object || {}), $gte: from };
    }
  }
  if (typeof dateTo === 'string' && dateTo.trim()) {
    const to = new Date(dateTo.trim());
    if (!isNaN(to.getTime())) {
      to.setHours(23, 59, 59, 999);
      filter.createdAt = { ...(filter.createdAt as object || {}), $lte: to };
    }
  }

  return filter;
}

/** Build a Mongo filter from query params for tasks */
function buildTaskFilter(query: Record<string, unknown>): Record<string, unknown> {
  const { status, scheduleId, dateFrom, dateTo } = query;
  const filter: Record<string, unknown> = {};

  if (typeof status === 'string' && status.trim()) {
    filter.status = status.trim();
  }
  if (typeof scheduleId === 'string' && scheduleId.trim()) {
    filter.scheduleId = scheduleId.trim();
  }
  if (typeof dateFrom === 'string' && dateFrom.trim()) {
    const from = new Date(dateFrom.trim());
    if (!isNaN(from.getTime())) {
      filter.createdAt = { ...(filter.createdAt as object || {}), $gte: from };
    }
  }
  if (typeof dateTo === 'string' && dateTo.trim()) {
    const to = new Date(dateTo.trim());
    if (!isNaN(to.getTime())) {
      to.setHours(23, 59, 59, 999);
      filter.createdAt = { ...(filter.createdAt as object || {}), $lte: to };
    }
  }

  return filter;
}

/** スケジュール一覧 */
export const listSchedules = async (_req: Request, res: Response): Promise<void> => {
  try {
    const data = await WmsSchedule.find().sort({ name: 1 }).lean();
    res.json({ data, total: data.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'スケジュール一覧の取得に失敗しました', error: message });
  }
};

/** スケジュール詳細 */
export const getSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const doc = await WmsSchedule.findById(req.params.id).lean();
    if (!doc) {
      res.status(404).json({ message: 'スケジュールが見つかりません' });
      return;
    }
    res.json(doc);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'スケジュールの取得に失敗しました', error: message });
  }
};

/** スケジュール作成 */
export const createSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const doc = await WmsSchedule.create(req.body);

    await WmsScheduleLog.create({
      scheduleId: doc._id,
      action: doc.action,
      event: 'schedule_created',
      message: `スケジュール「${doc.name}」を作成しました`,
      userName: 'system',
    });

    res.status(201).json(doc.toObject());
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'スケジュールの作成に失敗しました', error: message });
  }
};

/** スケジュール更新 */
export const updateSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const doc = await WmsSchedule.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).lean();
    if (!doc) {
      res.status(404).json({ message: 'スケジュールが見つかりません' });
      return;
    }

    await WmsScheduleLog.create({
      scheduleId: doc._id,
      action: doc.action,
      event: 'schedule_updated',
      message: `スケジュール「${doc.name}」を更新しました`,
      userName: 'system',
    });

    res.json(doc);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'スケジュールの更新に失敗しました', error: message });
  }
};

/** スケジュール削除 */
export const deleteSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const doc = await WmsSchedule.findByIdAndDelete(req.params.id).lean();
    if (!doc) {
      res.status(404).json({ message: 'スケジュールが見つかりません' });
      return;
    }
    res.json({ message: 'スケジュールを削除しました' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'スケジュールの削除に失敗しました', error: message });
  }
};

/** スケジュール手動実行 */
export const runSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const schedule = await WmsSchedule.findById(req.params.id).lean();
    if (!schedule) {
      res.status(404).json({ message: 'スケジュールが見つかりません' });
      return;
    }

    const taskNumber = generateTaskNumber();
    const task = await WmsTask.create({
      taskNumber,
      scheduleId: schedule._id,
      scheduleName: schedule.name,
      action: schedule.action,
      status: 'queued',
      triggeredBy: 'manual',
      userName: 'system',
    });

    await WmsSchedule.findByIdAndUpdate(schedule._id, {
      lastRunAt: new Date(),
      $inc: { runCount: 1 },
    });

    await WmsScheduleLog.create({
      scheduleId: schedule._id,
      taskId: task._id,
      taskNumber,
      action: schedule.action,
      event: 'manual_run',
      message: `スケジュール「${schedule.name}」を手動実行しました (タスク: ${taskNumber})`,
      userName: 'system',
    });

    res.status(201).json(task.toObject());
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'スケジュールの実行に失敗しました', error: message });
  }
};

/** スケジュール有効/無効切り替え */
export const toggleSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const schedule = await WmsSchedule.findById(req.params.id);
    if (!schedule) {
      res.status(404).json({ message: 'スケジュールが見つかりません' });
      return;
    }

    const newEnabled = !schedule.isEnabled;
    schedule.isEnabled = newEnabled;
    await schedule.save();

    const event = newEnabled ? 'schedule_enabled' : 'schedule_disabled';
    const label = newEnabled ? '有効' : '無効';

    await WmsScheduleLog.create({
      scheduleId: schedule._id,
      action: schedule.action,
      event,
      message: `スケジュール「${schedule.name}」を${label}にしました`,
      userName: 'system',
    });

    res.json(schedule.toObject());
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'スケジュールの切り替えに失敗しました', error: message });
  }
};

/** タスク一覧 */
export const listTasks = async (req: Request, res: Response): Promise<void> => {
  try {
    const filter = buildTaskFilter(req.query as Record<string, unknown>);
    const { page: pageStr, limit: limitStr } = req.query;

    const page = Math.max(1, Number(pageStr) || 1);
    const limit = Math.min(500, Math.max(1, Number(limitStr) || 50));
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      WmsTask.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      WmsTask.countDocuments(filter),
    ]);

    res.json({ data, total, page, limit });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'タスク一覧の取得に失敗しました', error: message });
  }
};

/** タスク詳細 */
export const getTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const doc = await WmsTask.findById(req.params.taskId).lean();
    if (!doc) {
      res.status(404).json({ message: 'タスクが見つかりません' });
      return;
    }
    res.json(doc);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'タスクの取得に失敗しました', error: message });
  }
};

/** ログ一覧 */
export const listLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const filter = buildLogFilter(req.query as Record<string, unknown>);
    const { page: pageStr, limit: limitStr } = req.query;

    const page = Math.max(1, Number(pageStr) || 1);
    const limit = Math.min(500, Math.max(1, Number(limitStr) || 50));
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      WmsScheduleLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      WmsScheduleLog.countDocuments(filter),
    ]);

    res.json({ data, total, page, limit });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'ログ一覧の取得に失敗しました', error: message });
  }
};

/** ログエクスポート（全件JSON） */
export const exportLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const filter = buildLogFilter(req.query as Record<string, unknown>);

    const data = await WmsScheduleLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(10000)
      .lean();

    res.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'ログのエクスポートに失敗しました', error: message });
  }
};
