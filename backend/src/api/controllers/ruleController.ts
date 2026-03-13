import type { Request, Response } from 'express';
import { RuleDefinition } from '@/models/ruleDefinition';
import { RuleEngine } from '@/services/ruleEngine';

/** ルール一覧 */
export const listRules = async (req: Request, res: Response): Promise<void> => {
  try {
    const { module, isActive, search, page: pageStr, limit: limitStr } = req.query;

    const filter: Record<string, unknown> = {};
    if (typeof module === 'string' && module.trim()) {
      filter.module = module.trim();
    }
    if (typeof isActive === 'string') {
      filter.isActive = isActive === 'true';
    }
    if (typeof search === 'string' && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { name: regex },
        { description: regex },
      ];
    }

    const page = Math.max(1, Number(pageStr) || 1);
    const limit = Math.min(500, Math.max(1, Number(limitStr) || 50));
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      RuleDefinition.find(filter)
        .sort({ priority: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      RuleDefinition.countDocuments(filter),
    ]);

    res.json({ data, total, page, limit });
  } catch (error: any) {
    res.status(500).json({ message: 'ルール一覧の取得に失敗しました', error: error.message });
  }
};

/** ルール詳細 */
export const getRule = async (req: Request, res: Response): Promise<void> => {
  try {
    const rule = await RuleDefinition.findById(req.params.id).lean();
    if (!rule) {
      res.status(404).json({ message: 'ルールが見つかりません' });
      return;
    }
    res.json(rule);
  } catch (error: any) {
    res.status(500).json({ message: 'ルールの取得に失敗しました', error: error.message });
  }
};

/** ルール作成 */
export const createRule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, module, conditionGroups, actions } = req.body;

    if (!name || !module || !conditionGroups || !actions) {
      res.status(400).json({
        message: 'name, module, conditionGroups, actions は必須です',
      });
      return;
    }

    const rule = await RuleDefinition.create({
      ...req.body,
      name: name.trim(),
    });

    res.status(201).json(rule);
  } catch (error: any) {
    res.status(500).json({ message: 'ルールの作成に失敗しました', error: error.message });
  }
};

/** ルール更新 */
export const updateRule = async (req: Request, res: Response): Promise<void> => {
  try {
    const rule = await RuleDefinition.findById(req.params.id);
    if (!rule) {
      res.status(404).json({ message: 'ルールが見つかりません' });
      return;
    }

    const updatableFields = [
      'name', 'description', 'module', 'warehouseId', 'clientId',
      'conditionGroups', 'actions', 'priority', 'isActive', 'stopOnMatch',
      'validFrom', 'validTo', 'memo', 'createdBy',
    ] as const;

    for (const field of updatableFields) {
      if (req.body[field] !== undefined) {
        (rule as any)[field] = req.body[field];
      }
    }

    await rule.save();
    res.json(rule);
  } catch (error: any) {
    res.status(500).json({ message: 'ルールの更新に失敗しました', error: error.message });
  }
};

/** ルール削除 */
export const deleteRule = async (req: Request, res: Response): Promise<void> => {
  try {
    const rule = await RuleDefinition.findById(req.params.id).lean();
    if (!rule) {
      res.status(404).json({ message: 'ルールが見つかりません' });
      return;
    }

    await RuleDefinition.findByIdAndDelete(req.params.id);
    res.json({ message: 'ルールを削除しました' });
  } catch (error: any) {
    res.status(500).json({ message: 'ルールの削除に失敗しました', error: error.message });
  }
};

/** ルール有効/無効切替 */
export const toggleRule = async (req: Request, res: Response): Promise<void> => {
  try {
    const rule = await RuleDefinition.findById(req.params.id);
    if (!rule) {
      res.status(404).json({ message: 'ルールが見つかりません' });
      return;
    }

    rule.isActive = !rule.isActive;
    await rule.save();
    res.json(rule);
  } catch (error: any) {
    res.status(500).json({ message: 'ルールの切替に失敗しました', error: error.message });
  }
};

/** ルールテスト実行 */
export const testRule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { module, context } = req.body;

    if (!module || !context) {
      res.status(400).json({ message: 'module と context は必須です' });
      return;
    }

    const matchedRules = await RuleEngine.evaluate(module, context);
    res.json({ matchedRules });
  } catch (error: any) {
    res.status(500).json({ message: 'ルールテストの実行に失敗しました', error: error.message });
  }
};
