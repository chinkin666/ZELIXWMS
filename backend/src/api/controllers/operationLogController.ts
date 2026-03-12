import type { Request, Response } from 'express';
import { OperationLog } from '@/models/operationLog';

/** 操作ログ一覧 */
export const listOperationLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      dateFrom,
      dateTo,
      action,
      category,
      search,
      page: pageStr,
      limit: limitStr,
    } = req.query;

    const filter: Record<string, unknown> = {};

    // 日付範囲フィルタ
    if (typeof dateFrom === 'string' && dateFrom.trim()) {
      const from = new Date(dateFrom.trim());
      if (!isNaN(from.getTime())) {
        filter.createdAt = { ...(filter.createdAt as object || {}), $gte: from };
      }
    }
    if (typeof dateTo === 'string' && dateTo.trim()) {
      const to = new Date(dateTo.trim());
      if (!isNaN(to.getTime())) {
        // dateTo の日付の終わりまでを含める
        to.setHours(23, 59, 59, 999);
        filter.createdAt = { ...(filter.createdAt as object || {}), $lte: to };
      }
    }

    // アクションフィルタ（カンマ区切り対応）
    if (typeof action === 'string' && action.trim()) {
      const actions = action.split(',').map(a => a.trim()).filter(Boolean);
      if (actions.length === 1) {
        filter.action = actions[0];
      } else if (actions.length > 1) {
        filter.action = { $in: actions };
      }
    }

    // カテゴリフィルタ
    if (typeof category === 'string' && category.trim()) {
      filter.category = category.trim();
    }

    // テキスト検索
    if (typeof search === 'string' && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { productSku: regex },
        { productName: regex },
        { referenceNumber: regex },
        { description: regex },
      ];
    }

    const page = Math.max(1, Number(pageStr) || 1);
    const limit = Math.min(500, Math.max(1, Number(limitStr) || 50));
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      OperationLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      OperationLog.countDocuments(filter),
    ]);

    res.json({ data, total, page, limit });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: '操作ログの取得に失敗しました', error: message });
  }
};

/** 操作ログエクスポート（全件JSON） */
export const exportOperationLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      dateFrom,
      dateTo,
      action,
      category,
      search,
    } = req.query;

    const filter: Record<string, unknown> = {};

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
    if (typeof action === 'string' && action.trim()) {
      const actions = action.split(',').map(a => a.trim()).filter(Boolean);
      if (actions.length === 1) {
        filter.action = actions[0];
      } else if (actions.length > 1) {
        filter.action = { $in: actions };
      }
    }
    if (typeof category === 'string' && category.trim()) {
      filter.category = category.trim();
    }
    if (typeof search === 'string' && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { productSku: regex },
        { productName: regex },
        { referenceNumber: regex },
        { description: regex },
      ];
    }

    const data = await OperationLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(10000)
      .lean();

    res.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: '操作ログのエクスポートに失敗しました', error: message });
  }
};
