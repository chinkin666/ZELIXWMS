/**
 * 扩展系统 API 控制器 / 拡張システム API コントローラ
 *
 * Phase 1: Hook 查看 + 事件日志查询
 * Phase 1: Hook 確認 + イベントログクエリ
 */

import type { Request, Response } from 'express';
import { extensionManager } from '@/core/extensions';
import { EventLog } from '@/models/eventLog';
import { HOOK_EVENTS } from '@/core/extensions/types';

/**
 * GET /api/extensions/hooks
 * 查看所有已定义的 Hook 事件 + 当前注册的 handler
 * 定義済み Hook イベント + 現在登録済み handler を表示
 */
export async function listHooks(_req: Request, res: Response) {
  try {
    const hookManager = extensionManager.getHookManager();

    // 所有预定义事件 / すべての事前定義イベント
    const allEvents = Object.values(HOOK_EVENTS);

    // 每个事件的 handler 列表 / 各イベントの handler リスト
    const hooks = allEvents.map((event) => ({
      event,
      handlers: hookManager.getHandlers(event),
      handlerCount: hookManager.getHandlers(event).length,
    }));

    res.json({
      totalEvents: allEvents.length,
      activeEvents: hooks.filter((h) => h.handlerCount > 0).length,
      hooks,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

/**
 * GET /api/extensions/hooks/summary
 * 获取已注册事件概要 / 登録済みイベントのサマリを取得
 */
export async function hooksSummary(_req: Request, res: Response) {
  try {
    const hookManager = extensionManager.getHookManager();
    res.json(hookManager.getSummary());
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

/**
 * GET /api/extensions/logs
 * 查询事件日志 / イベントログをクエリ
 */
export async function listEventLogs(req: Request, res: Response) {
  try {
    const {
      event,
      source,
      status,
      tenantId,
      dateFrom,
      dateTo,
      page = '1',
      limit = '50',
    } = req.query as Record<string, string>;

    const filter: Record<string, unknown> = {};

    if (event) filter.event = event;
    if (source) filter.source = source;
    if (status) filter.status = status;
    if (tenantId) filter.tenantId = tenantId;

    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dateFrom) {
        const from = new Date(dateFrom);
        if (!isNaN(from.getTime())) dateFilter.$gte = from;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        if (!isNaN(to.getTime())) {
          to.setHours(23, 59, 59, 999);
          dateFilter.$lte = to;
        }
      }
      if (Object.keys(dateFilter).length > 0) {
        filter.createdAt = dateFilter;
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      EventLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      EventLog.countDocuments(filter),
    ]);

    res.json({
      data: logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

/**
 * GET /api/extensions/logs/stats
 * 事件日志统计 / イベントログ統計
 */
export async function eventLogStats(_req: Request, res: Response) {
  try {
    const stats = await EventLog.aggregate([
      {
        $group: {
          _id: { event: '$event', status: '$status' },
          count: { $sum: 1 },
          avgDuration: { $avg: '$duration' },
          avgHandlerCount: { $avg: '$handlerCount' },
        },
      },
      {
        $sort: { '_id.event': 1 },
      },
    ]);

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
