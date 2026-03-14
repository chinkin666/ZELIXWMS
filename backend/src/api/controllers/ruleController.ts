import type { Request, Response } from 'express';
import { RuleDefinition } from '@/models/ruleDefinition';
import { RuleEngine } from '@/services/ruleEngine';
import { createRuleSchema, updateRuleSchema } from '@/schemas/ruleSchema';
import { AppError } from '@/lib/errors';

/**
 * エラーレスポンスヘルパー / 错误响应辅助函数
 * AppError はステータスコードを保持、それ以外は 500
 */
function handleError(res: Response, error: unknown, fallbackMessage: string): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ message: error.message, code: error.code, details: error.details });
    return;
  }
  const message = error instanceof Error ? error.message : String(error);
  res.status(500).json({ message: fallbackMessage, error: message });
}

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
      // 正規表現の特殊文字をエスケープ / 转义正则特殊字符
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
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
  } catch (error) {
    handleError(res, error, 'ルール一覧の取得に失敗しました');
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
  } catch (error) {
    handleError(res, error, 'ルールの取得に失敗しました');
  }
};

/** ルール作成 */
export const createRule = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = createRuleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: 'バリデーションエラー',
        error: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const rule = await RuleDefinition.create({
      ...parsed.data,
      name: parsed.data.name.trim(),
    });

    res.status(201).json(rule);
  } catch (error) {
    handleError(res, error, 'ルールの作成に失敗しました');
  }
};

/** ルール更新 */
export const updateRule = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = updateRuleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: 'バリデーションエラー',
        error: parsed.error.flatten().fieldErrors,
      });
      return;
    }

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
      if (parsed.data[field] !== undefined) {
        (rule as any)[field] = parsed.data[field];
      }
    }

    await rule.save();
    res.json(rule);
  } catch (error) {
    handleError(res, error, 'ルールの更新に失敗しました');
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
  } catch (error) {
    handleError(res, error, 'ルールの削除に失敗しました');
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
  } catch (error) {
    handleError(res, error, 'ルールの切替に失敗しました');
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
  } catch (error) {
    handleError(res, error, 'ルールテストの実行に失敗しました');
  }
};
