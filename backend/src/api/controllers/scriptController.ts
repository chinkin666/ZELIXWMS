/**
 * Script 管理 API 控制器 / スクリプト管理 API コントローラ
 *
 * CRUD + 语法校验 + 手动执行 + 执行日志
 * CRUD + 構文チェック + 手動実行 + 実行ログ
 */

import type { Request, Response } from 'express';
import { AutomationScript } from '@/models/automationScript';
import { ScriptExecutionLog } from '@/models/scriptExecutionLog';
import { extensionManager } from '@/core/extensions';
import { HOOK_EVENTS } from '@/core/extensions/types';

/**
 * GET /api/extensions/scripts
 * 列出所有脚本 / すべてのスクリプトを一覧
 */
export async function listScripts(req: Request, res: Response) {
  try {
    const { event, enabled } = req.query;
    const filter: Record<string, unknown> = {};
    if (typeof event === 'string' && event) filter.event = event;
    if (enabled === 'true') filter.enabled = true;
    if (enabled === 'false') filter.enabled = false;

    const scripts = await AutomationScript.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    const availableEvents = Object.values(HOOK_EVENTS);

    res.json({ data: scripts, availableEvents });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

/**
 * GET /api/extensions/scripts/:id
 * 获取单个脚本 / 単一スクリプトを取得
 */
export async function getScript(req: Request, res: Response) {
  try {
    const script = await AutomationScript.findById(req.params.id).lean();
    if (!script) {
      res.status(404).json({ error: 'Script not found / スクリプトが見つかりません' });
      return;
    }
    res.json(script);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

/**
 * POST /api/extensions/scripts
 * 创建脚本 / スクリプトを作成
 */
export async function createScript(req: Request, res: Response) {
  try {
    const { name, event, code, description, enabled, timeout } = req.body;

    if (!name || !event || !code) {
      res.status(400).json({ error: 'name, event, code are required / name, event, code は必須です' });
      return;
    }

    // 验证事件名 / イベント名を検証
    const validEvents = Object.values(HOOK_EVENTS) as string[];
    if (!validEvents.includes(event)) {
      res.status(400).json({ error: `Invalid event: ${event}`, validEvents });
      return;
    }

    // 语法校验 / 構文チェック
    const scriptRunner = extensionManager.getScriptRunner();
    const validation = scriptRunner.validate(code);
    if (!validation.valid) {
      res.status(400).json({ error: `Script validation failed: ${validation.error}` });
      return;
    }

    const script = await AutomationScript.create({
      name,
      event,
      code,
      description,
      enabled: enabled === true,
      timeout: Math.min(Math.max(timeout ?? 5000, 100), 30000),
    });

    res.status(201).json(script.toObject());
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

/**
 * PUT /api/extensions/scripts/:id
 * 更新脚本 / スクリプトを更新
 */
export async function updateScript(req: Request, res: Response) {
  try {
    const { name, event, code, description, enabled, timeout } = req.body;

    const update: Record<string, unknown> = {};

    if (event !== undefined) {
      const validEvents = Object.values(HOOK_EVENTS) as string[];
      if (!validEvents.includes(event)) {
        res.status(400).json({ error: `Invalid event: ${event}` });
        return;
      }
      update.event = event;
    }

    if (code !== undefined) {
      const scriptRunner = extensionManager.getScriptRunner();
      const validation = scriptRunner.validate(code);
      if (!validation.valid) {
        res.status(400).json({ error: `Script validation failed: ${validation.error}` });
        return;
      }
      update.code = code;
    }

    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    if (enabled !== undefined) update.enabled = enabled;
    if (timeout !== undefined) update.timeout = Math.min(Math.max(timeout, 100), 30000);

    const script = await AutomationScript.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true },
    ).lean();

    if (!script) {
      res.status(404).json({ error: 'Script not found / スクリプトが見つかりません' });
      return;
    }

    res.json(script);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

/**
 * DELETE /api/extensions/scripts/:id
 * 删除脚本 / スクリプトを削除
 */
export async function deleteScript(req: Request, res: Response) {
  try {
    const script = await AutomationScript.findByIdAndDelete(req.params.id).lean();
    if (!script) {
      res.status(404).json({ error: 'Script not found / スクリプトが見つかりません' });
      return;
    }
    res.json({ message: 'Script deleted / スクリプトを削除しました' });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

/**
 * POST /api/extensions/scripts/:id/toggle
 * 切换启用/禁用 / 有効/無効をトグル
 */
export async function toggleScript(req: Request, res: Response) {
  try {
    const script = await AutomationScript.findById(req.params.id);
    if (!script) {
      res.status(404).json({ error: 'Script not found / スクリプトが見つかりません' });
      return;
    }

    script.enabled = !script.enabled;
    await script.save();

    res.json({
      _id: script._id,
      enabled: script.enabled,
      message: script.enabled ? 'Script enabled / 有効化' : 'Script disabled / 無効化',
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

/**
 * POST /api/extensions/scripts/:id/validate
 * 语法校验 / 構文チェック
 */
export async function validateScript(req: Request, res: Response) {
  try {
    const { code } = req.body;
    if (!code) {
      res.status(400).json({ error: 'code is required / code は必須です' });
      return;
    }

    const scriptRunner = extensionManager.getScriptRunner();
    const result = scriptRunner.validate(code);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

/**
 * POST /api/extensions/scripts/:id/test
 * 手动执行测试 / 手動テスト実行
 */
export async function testScript(req: Request, res: Response) {
  try {
    const { payload } = req.body;
    const scriptRunner = extensionManager.getScriptRunner();
    const result = await scriptRunner.testExecute(req.params.id, payload);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

/**
 * GET /api/extensions/scripts/:id/logs
 * 查询执行日志 / 実行ログをクエリ
 */
export async function getScriptLogs(req: Request, res: Response) {
  try {
    const { status, page = '1', limit = '50' } = req.query as Record<string, string>;

    const filter: Record<string, unknown> = { scriptId: req.params.id };
    if (status) filter.status = status;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      ScriptExecutionLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      ScriptExecutionLog.countDocuments(filter),
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
