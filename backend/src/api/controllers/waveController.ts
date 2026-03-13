import type { Request, Response } from 'express';
import { Wave } from '@/models/wave';

/** ウェーブ一覧 */
export const listWaves = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      warehouseId,
      status,
      priority,
      search,
      page: pageStr,
      limit: limitStr,
    } = req.query;

    const filter: Record<string, unknown> = {};

    if (typeof warehouseId === 'string' && warehouseId.trim()) {
      filter.warehouseId = warehouseId.trim();
    }
    if (typeof status === 'string' && status.trim()) {
      filter.status = status.trim();
    }
    if (typeof priority === 'string' && priority.trim()) {
      filter.priority = priority.trim();
    }
    if (typeof search === 'string' && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { waveNumber: regex },
        { assignedName: regex },
        { memo: regex },
      ];
    }

    const page = Math.max(1, Number(pageStr) || 1);
    const limit = Math.min(500, Math.max(1, Number(limitStr) || 50));
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Wave.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Wave.countDocuments(filter),
    ]);

    res.json({ data, total, page, limit });
  } catch (error: any) {
    res.status(500).json({ message: 'ウェーブ一覧の取得に失敗しました', error: error.message });
  }
};

/** ウェーブ詳細 */
export const getWave = async (req: Request, res: Response): Promise<void> => {
  try {
    const wave = await Wave.findById(req.params.id).populate('shipmentIds').lean();
    if (!wave) {
      res.status(404).json({ message: 'ウェーブが見つかりません' });
      return;
    }
    res.json(wave);
  } catch (error: any) {
    res.status(500).json({ message: 'ウェーブの取得に失敗しました', error: error.message });
  }
};

/** ウェーブ作成 */
export const createWave = async (req: Request, res: Response): Promise<void> => {
  try {
    const { waveNumber, warehouseId, ...rest } = req.body;

    if (!waveNumber) {
      res.status(400).json({ message: 'waveNumber は必須です' });
      return;
    }
    if (!warehouseId) {
      res.status(400).json({ message: 'warehouseId は必須です' });
      return;
    }

    const existing = await Wave.findOne({ waveNumber }).lean();
    if (existing) {
      res.status(409).json({ message: `ウェーブ番号「${waveNumber}」は既に存在します` });
      return;
    }

    const wave = await Wave.create({ waveNumber, warehouseId, ...rest });
    res.status(201).json(wave);
  } catch (error: any) {
    res.status(500).json({ message: 'ウェーブの作成に失敗しました', error: error.message });
  }
};

/** ウェーブ更新 */
export const updateWave = async (req: Request, res: Response): Promise<void> => {
  try {
    const wave = await Wave.findById(req.params.id);
    if (!wave) {
      res.status(404).json({ message: 'ウェーブが見つかりません' });
      return;
    }

    const updateFields = req.body;
    Object.assign(wave, updateFields);
    await wave.save();

    res.json(wave);
  } catch (error: any) {
    res.status(500).json({ message: 'ウェーブの更新に失敗しました', error: error.message });
  }
};

/** ウェーブ削除 */
export const deleteWave = async (req: Request, res: Response): Promise<void> => {
  try {
    const wave = await Wave.findById(req.params.id).lean();
    if (!wave) {
      res.status(404).json({ message: 'ウェーブが見つかりません' });
      return;
    }

    if (wave.status !== 'draft') {
      res.status(400).json({ message: 'ドラフト状態のウェーブのみ削除できます' });
      return;
    }

    await Wave.findByIdAndDelete(req.params.id);
    res.json({ message: 'ウェーブを削除しました' });
  } catch (error: any) {
    res.status(500).json({ message: 'ウェーブの削除に失敗しました', error: error.message });
  }
};

/** ウェーブ開始 */
export const startWave = async (req: Request, res: Response): Promise<void> => {
  try {
    const wave = await Wave.findById(req.params.id);
    if (!wave) {
      res.status(404).json({ message: 'ウェーブが見つかりません' });
      return;
    }

    wave.status = 'picking';
    wave.startedAt = new Date();
    await wave.save();

    res.json(wave);
  } catch (error: any) {
    res.status(500).json({ message: 'ウェーブの開始に失敗しました', error: error.message });
  }
};

/** ウェーブ完了 */
export const completeWave = async (req: Request, res: Response): Promise<void> => {
  try {
    const wave = await Wave.findById(req.params.id);
    if (!wave) {
      res.status(404).json({ message: 'ウェーブが見つかりません' });
      return;
    }

    wave.status = 'completed';
    wave.completedAt = new Date();
    await wave.save();

    res.json(wave);
  } catch (error: any) {
    res.status(500).json({ message: 'ウェーブの完了に失敗しました', error: error.message });
  }
};
