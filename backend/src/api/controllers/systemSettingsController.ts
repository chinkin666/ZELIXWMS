import type { Request, Response } from 'express';
import { SystemSettings } from '@/models/systemSettings';

/** システム設定取得 */
export const getSettings = async (_req: Request, res: Response): Promise<void> => {
  try {
    const doc = await SystemSettings.findOne({ settingsKey: 'global' }).lean();
    if (doc) {
      res.json(doc);
    } else {
      // ドキュメントが存在しない場合、デフォルト値で新規作成して返す
      const created = await SystemSettings.create({ settingsKey: 'global' });
      res.json(created.toObject());
    }
  } catch (_error: unknown) {
    res.status(500).json({ message: 'システム設定の取得に失敗しました' });
  }
};

/** システム設定更新 */
export const updateSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const { settingsKey: _ignored, _id: _ignoredId, ...updates } = req.body;

    const doc = await SystemSettings.findOneAndUpdate(
      { settingsKey: 'global' },
      { $set: updates },
      { new: true, upsert: true, runValidators: true },
    ).lean();

    res.json(doc);
  } catch (_error: unknown) {
    res.status(500).json({ message: 'システム設定の更新に失敗しました' });
  }
};

/** システム設定リセット */
export const resetSettings = async (_req: Request, res: Response): Promise<void> => {
  try {
    await SystemSettings.deleteOne({ settingsKey: 'global' });
    // デフォルト値で再作成
    const created = await SystemSettings.create({ settingsKey: 'global' });
    res.json(created.toObject());
  } catch (_error: unknown) {
    res.status(500).json({ message: 'システム設定のリセットに失敗しました' });
  }
};
