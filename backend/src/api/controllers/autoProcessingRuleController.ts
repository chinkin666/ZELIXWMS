import type { Request, Response } from 'express';
import { AutoProcessingRule } from '@/models/autoProcessingRule';
import { TRIGGER_EVENTS } from '@/models/autoProcessingRule';
import { runRuleManually } from '@/services/autoProcessingEngine';

// ============================================
// CRUD Controllers
// ============================================

/**
 * List all rules sorted by priority
 * GET /api/auto-processing-rules
 */
export const listRules = async (_req: Request, res: Response): Promise<void> => {
  try {
    const rules = await AutoProcessingRule.find().sort({ priority: 1 }).lean();
    res.json(rules);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: 'ルールの取得に失敗しました', error: message });
  }
};

/**
 * Get a single rule by ID
 * GET /api/auto-processing-rules/:id
 */
export const getRule = async (req: Request, res: Response): Promise<void> => {
  try {
    const rule = await AutoProcessingRule.findById(req.params.id).lean();
    if (!rule) {
      res.status(404).json({ message: 'ルールが見つかりません' });
      return;
    }
    res.json(rule);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: 'ルールの取得に失敗しました', error: message });
  }
};

/**
 * Create a new rule
 * POST /api/auto-processing-rules
 */
export const createRule = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name, enabled, triggerMode, allowRerun, memo,
      triggerEvents, conditions, actions, priority,
    } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ message: 'ルール名は必須です' });
      return;
    }

    // Validate triggerEvents
    if (Array.isArray(triggerEvents)) {
      for (const ev of triggerEvents) {
        if (!TRIGGER_EVENTS.includes(ev)) {
          res.status(400).json({ message: `無効なトリガーイベント: ${ev}` });
          return;
        }
      }
    }

    const rule = await AutoProcessingRule.create({
      name: name.trim(),
      enabled: enabled !== false,
      triggerMode: triggerMode === 'manual' ? 'manual' : 'auto',
      allowRerun: allowRerun === true,
      memo: memo?.trim() || undefined,
      triggerEvents: Array.isArray(triggerEvents) ? triggerEvents : [],
      conditions: Array.isArray(conditions) ? conditions : [],
      actions: Array.isArray(actions) ? actions : [],
      priority: typeof priority === 'number' ? priority : 100,
    });

    res.status(201).json(rule.toObject());
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: 'ルールの作成に失敗しました', error: message });
  }
};

/**
 * Update a rule
 * PUT /api/auto-processing-rules/:id
 */
export const updateRule = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name, enabled, triggerMode, allowRerun, memo,
      triggerEvents, conditions, actions, priority,
    } = req.body;

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ message: 'ルール名は必須です' });
        return;
      }
      updateData.name = name.trim();
    }

    if (enabled !== undefined) updateData.enabled = Boolean(enabled);
    if (triggerMode !== undefined) updateData.triggerMode = triggerMode === 'manual' ? 'manual' : 'auto';
    if (allowRerun !== undefined) updateData.allowRerun = Boolean(allowRerun);
    if (memo !== undefined) updateData.memo = memo?.trim() || undefined;

    if (triggerEvents !== undefined) {
      if (Array.isArray(triggerEvents)) {
        for (const ev of triggerEvents) {
          if (!TRIGGER_EVENTS.includes(ev)) {
            res.status(400).json({ message: `無効なトリガーイベント: ${ev}` });
            return;
          }
        }
        updateData.triggerEvents = triggerEvents;
      }
    }

    if (conditions !== undefined) updateData.conditions = conditions;
    if (actions !== undefined) updateData.actions = actions;
    if (priority !== undefined && typeof priority === 'number') updateData.priority = priority;

    const updated = await AutoProcessingRule.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true },
    ).lean();

    if (!updated) {
      res.status(404).json({ message: 'ルールが見つかりません' });
      return;
    }

    res.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: 'ルールの更新に失敗しました', error: message });
  }
};

/**
 * Delete a rule
 * DELETE /api/auto-processing-rules/:id
 */
export const deleteRule = async (req: Request, res: Response): Promise<void> => {
  try {
    const deleted = await AutoProcessingRule.findByIdAndDelete(req.params.id).lean();
    if (!deleted) {
      res.status(404).json({ message: 'ルールが見つかりません' });
      return;
    }
    res.json({ message: 'ルールを削除しました', id: deleted._id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: 'ルールの削除に失敗しました', error: message });
  }
};

/**
 * Reorder rules by setting priority based on array order
 * POST /api/auto-processing-rules/reorder
 * body: { orderedIds: string[] }
 */
export const reorderRules = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderedIds } = req.body;

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      res.status(400).json({ message: 'orderedIds配列は必須です' });
      return;
    }

    const bulkOps = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { priority: index + 1 } },
      },
    }));

    await AutoProcessingRule.bulkWrite(bulkOps);
    res.json({ message: '優先順位を更新しました' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: '優先順位の更新に失敗しました', error: message });
  }
};

/**
 * Manually run a rule against all matching orders
 * POST /api/auto-processing-rules/:id/run
 */
export const runRule = async (req: Request, res: Response): Promise<void> => {
  try {
    const rule = await AutoProcessingRule.findById(req.params.id).lean();
    if (!rule) {
      res.status(404).json({ message: 'ルールが見つかりません' });
      return;
    }

    const result = await runRuleManually(rule);
    res.json({
      message: '手動実行が完了しました',
      data: result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: '手動実行に失敗しました', error: message });
  }
};
