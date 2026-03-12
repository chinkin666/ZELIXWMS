import type { Request, Response } from 'express';
import { Location } from '@/models/location';
import { StockQuant } from '@/models/stockQuant';

export const listLocations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, warehouseId, parentId, isActive } = req.query;

    const filter: Record<string, unknown> = {};
    if (typeof type === 'string' && type.trim()) {
      filter.type = type.trim();
    }
    if (typeof warehouseId === 'string' && warehouseId.trim()) {
      filter.warehouseId = warehouseId.trim();
    }
    if (typeof parentId === 'string') {
      filter.parentId = parentId === 'null' ? { $exists: false } : parentId;
    }
    if (typeof isActive === 'string') {
      filter.isActive = isActive === 'true';
    }

    const locations = await Location.find(filter).sort({ sortOrder: 1, code: 1 }).lean();
    res.json(locations);
  } catch (error: any) {
    res.status(500).json({ message: 'ロケーション一覧の取得に失敗しました', error: error.message });
  }
};

export const getLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const location = await Location.findById(req.params.id).lean();
    if (!location) {
      res.status(404).json({ message: 'ロケーションが見つかりません' });
      return;
    }
    res.json(location);
  } catch (error: any) {
    res.status(500).json({ message: 'ロケーションの取得に失敗しました', error: error.message });
  }
};

export const createLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, name, type, parentId, warehouseId, coolType, memo, sortOrder } = req.body;

    if (!code || !name || !type) {
      res.status(400).json({ message: 'code, name, type は必須です' });
      return;
    }

    const existing = await Location.findOne({ code }).lean();
    if (existing) {
      res.status(409).json({ message: `ロケーションコード "${code}" は既に存在します` });
      return;
    }

    // fullPath を構築
    let fullPath = name;
    if (parentId) {
      const parent = await Location.findById(parentId).lean();
      if (parent) {
        fullPath = `${parent.fullPath} > ${name}`;
      }
    }

    const location = await Location.create({
      code,
      name,
      type,
      parentId: parentId || undefined,
      warehouseId: warehouseId || undefined,
      fullPath,
      coolType: coolType || undefined,
      memo: memo || undefined,
      sortOrder: sortOrder ?? 0,
    });

    res.status(201).json(location);
  } catch (error: any) {
    res.status(500).json({ message: 'ロケーションの作成に失敗しました', error: error.message });
  }
};

export const updateLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) {
      res.status(404).json({ message: 'ロケーションが見つかりません' });
      return;
    }

    const { code, name, type, parentId, warehouseId, coolType, isActive, memo, sortOrder } = req.body;

    if (code !== undefined) location.code = code;
    if (name !== undefined) location.name = name;
    if (type !== undefined) location.type = type;
    if (parentId !== undefined) location.parentId = parentId || undefined;
    if (warehouseId !== undefined) location.warehouseId = warehouseId || undefined;
    if (coolType !== undefined) location.coolType = coolType || undefined;
    if (isActive !== undefined) location.isActive = isActive;
    if (memo !== undefined) location.memo = memo || undefined;
    if (sortOrder !== undefined) location.sortOrder = sortOrder;

    // fullPath を再構築
    if (name !== undefined || parentId !== undefined) {
      const displayName = name ?? location.name;
      if (location.parentId) {
        const parent = await Location.findById(location.parentId).lean();
        location.fullPath = parent ? `${parent.fullPath} > ${displayName}` : displayName;
      } else {
        location.fullPath = displayName;
      }
    }

    await location.save();
    res.json(location);
  } catch (error: any) {
    res.status(500).json({ message: 'ロケーションの更新に失敗しました', error: error.message });
  }
};

export const deleteLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const locationId = req.params.id;

    // 在库があるロケーションは削除不可
    const quantCount = await StockQuant.countDocuments({ locationId, quantity: { $gt: 0 } });
    if (quantCount > 0) {
      res.status(409).json({ message: '在庫があるため削除できません' });
      return;
    }

    // 子ロケーションがあるか確認
    const childCount = await Location.countDocuments({ parentId: locationId });
    if (childCount > 0) {
      res.status(409).json({ message: '子ロケーションがあるため削除できません' });
      return;
    }

    const result = await Location.findByIdAndDelete(locationId);
    if (!result) {
      res.status(404).json({ message: 'ロケーションが見つかりません' });
      return;
    }

    res.json({ message: 'ロケーションを削除しました' });
  } catch (error: any) {
    res.status(500).json({ message: 'ロケーションの削除に失敗しました', error: error.message });
  }
};

/** 初期ロケーションを作成（存在しない場合のみ） */
export const seedLocations = async (_req: Request, res: Response): Promise<void> => {
  try {
    const seeds = [
      { code: 'VIRTUAL/SUPPLIER', name: '仕入先（仮想）', type: 'virtual/supplier' as const, sortOrder: 900 },
      { code: 'VIRTUAL/CUSTOMER', name: '顧客（仮想）', type: 'virtual/customer' as const, sortOrder: 901 },
      { code: 'WH-MAIN', name: 'メイン倉庫', type: 'warehouse' as const, sortOrder: 0 },
    ];

    const created: string[] = [];

    for (const seed of seeds) {
      const exists = await Location.findOne({ code: seed.code }).lean();
      if (!exists) {
        const loc = await Location.create({ ...seed, fullPath: seed.name, isActive: true });

        // warehouse の子ロケーションを作成
        if (seed.type === 'warehouse') {
          const children = [
            { code: `${seed.code}/RECEIVING`, name: '入庫検品エリア', type: 'receiving' as const, sortOrder: 1 },
            { code: `${seed.code}/STAGING`, name: '出荷準備エリア', type: 'staging' as const, sortOrder: 2 },
          ];
          for (const child of children) {
            const childExists = await Location.findOne({ code: child.code }).lean();
            if (!childExists) {
              await Location.create({
                ...child,
                parentId: loc._id,
                warehouseId: loc._id,
                fullPath: `${seed.name} > ${child.name}`,
                isActive: true,
              });
              created.push(child.code);
            }
          }
        }

        created.push(seed.code);
      }
    }

    res.json({ message: `初期ロケーションを作成しました`, created });
  } catch (error: any) {
    res.status(500).json({ message: '初期ロケーション作成に失敗しました', error: error.message });
  }
};
