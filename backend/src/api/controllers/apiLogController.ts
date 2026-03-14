import type { Request, Response } from 'express';
import { ApiLog } from '@/models/apiLog';

/** Build a Mongo filter from common query params */
function buildFilter(query: Record<string, unknown>): Record<string, unknown> {
  const { apiName, status, dateFrom, dateTo, search } = query;
  const filter: Record<string, unknown> = {};

  if (typeof apiName === 'string' && apiName.trim()) {
    filter.apiName = apiName.trim();
  }

  if (typeof status === 'string' && status.trim()) {
    filter.status = status.trim();
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

  if (typeof search === 'string' && search.trim()) {
    // 正規表現の特殊文字をエスケープ / 转义正则特殊字符
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    filter.$or = [
      { message: regex },
      { referenceNumber: regex },
    ];
  }

  return filter;
}

/** API連携ログ一覧 */
export const listApiLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const filter = buildFilter(req.query as Record<string, unknown>);
    const { page: pageStr, limit: limitStr } = req.query;

    const page = Math.max(1, Number(pageStr) || 1);
    const limit = Math.min(500, Math.max(1, Number(limitStr) || 50));
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      ApiLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ApiLog.countDocuments(filter),
    ]);

    res.json({ data, total, page, limit });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'API連携ログの取得に失敗しました', error: message });
  }
};

/** API連携ログ詳細 */
export const getApiLog = async (req: Request, res: Response): Promise<void> => {
  try {
    const doc = await ApiLog.findById(req.params.id).lean();
    if (!doc) {
      res.status(404).json({ message: 'ログが見つかりません' });
      return;
    }
    res.json(doc);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'API連携ログの取得に失敗しました', error: message });
  }
};

/** API連携ログ統計 */
export const getApiStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { dateFrom, dateTo } = req.query;
    const dateFilter: Record<string, unknown> = {};

    if (typeof dateFrom === 'string' && dateFrom.trim()) {
      const from = new Date(dateFrom.trim());
      if (!isNaN(from.getTime())) {
        dateFilter.$gte = from;
      }
    }
    if (typeof dateTo === 'string' && dateTo.trim()) {
      const to = new Date(dateTo.trim());
      if (!isNaN(to.getTime())) {
        to.setHours(23, 59, 59, 999);
        dateFilter.$lte = to;
      }
    }

    const match: Record<string, unknown> = {};
    if (Object.keys(dateFilter).length > 0) {
      match.createdAt = dateFilter;
    }

    const [totalResult, statusResult, apiNameResult, durationResult] = await Promise.all([
      ApiLog.countDocuments(match),
      ApiLog.aggregate([
        { $match: match },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      ApiLog.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$apiName',
            total: { $sum: 1 },
            successCount: {
              $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] },
            },
            errorCount: {
              $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] },
            },
          },
        },
        { $sort: { total: -1 } },
      ]),
      ApiLog.aggregate([
        { $match: { ...match, durationMs: { $exists: true, $ne: null } } },
        { $group: { _id: null, avgDuration: { $avg: '$durationMs' } } },
      ]),
    ]);

    const statusMap: Record<string, number> = {};
    for (const s of statusResult) {
      statusMap[s._id as string] = s.count as number;
    }

    const totalCalls = totalResult;
    const successTotal = statusMap['success'] ?? 0;
    const errorTotal = (statusMap['error'] ?? 0) + (statusMap['timeout'] ?? 0);
    const successRate = totalCalls > 0 ? Math.round((successTotal / totalCalls) * 10000) / 100 : 0;
    const avgDurationMs = durationResult.length > 0 ? Math.round(durationResult[0].avgDuration) : 0;

    res.json({
      totalCalls,
      successRate,
      avgDurationMs,
      errorTotal,
      byStatus: statusMap,
      byApiName: apiNameResult,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: '統計の取得に失敗しました', error: message });
  }
};

/** API連携ログエクスポート（全件JSON） */
export const exportApiLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const filter = buildFilter(req.query as Record<string, unknown>);

    const data = await ApiLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(10000)
      .lean();

    res.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'API連携ログのエクスポートに失敗しました', error: message });
  }
};
