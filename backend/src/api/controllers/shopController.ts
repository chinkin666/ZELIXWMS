import type { Request, Response } from 'express';
import { Shop } from '@/models/shop';
import { Client } from '@/models/client';

// 店舗一覧 / 店铺列表
export const listShops = async (req: Request, res: Response): Promise<void> => {
  try {
    const { clientId, subClientId, platform, search, isActive, page, limit } = req.query;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    const filter: Record<string, unknown> = { tenantId };

    if (typeof clientId === 'string' && clientId.trim()) {
      filter.clientId = clientId.trim();
    }
    if (typeof subClientId === 'string' && subClientId.trim()) {
      filter.subClientId = subClientId.trim();
    }
    if (typeof platform === 'string' && platform.trim()) {
      filter.platform = platform.trim();
    }
    if (typeof isActive === 'string') {
      if (isActive === 'true') filter.isActive = true;
      if (isActive === 'false') filter.isActive = false;
    }
    if (typeof search === 'string' && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { shopCode: { $regex: escaped, $options: 'i' } },
        { shopName: { $regex: escaped, $options: 'i' } },
        { platformStoreName: { $regex: escaped, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(String(page || '1'), 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(String(limit || '50'), 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [data, total] = await Promise.all([
      Shop.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Shop.countDocuments(filter),
    ]);

    res.json({ data, total });
  } catch (error: any) {
    res.status(500).json({ message: '店舗の取得に失敗しました / 获取店铺失败', error: error.message });
  }
};

// 店舗詳細 / 店铺详情
export const getShop = async (req: Request, res: Response): Promise<void> => {
  try {
    const item = await Shop.findById(req.params.id).lean();
    if (!item) {
      res.status(404).json({ message: '店舗が見つかりません / 店铺不存在' });
      return;
    }
    res.json(item);
  } catch (error: any) {
    res.status(500).json({ message: '店舗の取得に失敗しました / 获取店铺失败', error: error.message });
  }
};

// 店舗作成 / 创建店铺
export const createShop = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const { clientId, subClientId, shopCode, shopName, platform, platformAccountId, platformStoreName, memo } = req.body;

    // 必須チェック / 必填校验
    if (!clientId) {
      res.status(400).json({ message: '所属顧客IDは必須です / 所属客户ID必填' });
      return;
    }
    if (!shopCode || typeof shopCode !== 'string' || !shopCode.trim()) {
      res.status(400).json({ message: '店舗コードは必須です / 店铺编号必填' });
      return;
    }
    if (!shopName || typeof shopName !== 'string' || !shopName.trim()) {
      res.status(400).json({ message: '店舗名は必須です / 店铺名称必填' });
      return;
    }
    if (!platform) {
      res.status(400).json({ message: 'プラットフォームは必須です / 平台必填' });
      return;
    }

    // 所属顧客の存在確認 / 所属客户存在校验
    const client = await Client.findById(clientId).lean();
    if (!client) {
      res.status(404).json({ message: '所属顧客が見つかりません / 所属客户不存在' });
      return;
    }

    // コード重複チェック / 编号重复校验
    const existing = await Shop.findOne({ tenantId, shopCode: shopCode.trim() }).lean();
    if (existing) {
      res.status(409).json({ message: `店舗コード「${shopCode.trim()}」は既に存在します / 店铺编号已存在` });
      return;
    }

    const created = await Shop.create({
      tenantId,
      clientId,
      subClientId: subClientId || undefined,
      shopCode: shopCode.trim(),
      shopName: shopName.trim(),
      platform,
      platformAccountId: platformAccountId?.trim() || '',
      platformStoreName: platformStoreName?.trim() || '',
      memo: memo?.trim() || '',
      isActive: true,
    });

    res.status(201).json(created.toObject());
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({ message: '店舗コードが重複しています / 店铺编号重复' });
      return;
    }
    res.status(500).json({ message: '店舗の作成に失敗しました / 创建店铺失败', error: error.message });
  }
};

// 店舗更新 / 更新店铺
export const updateShop = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const existing = await Shop.findById(req.params.id).lean();
    if (!existing) {
      res.status(404).json({ message: '店舗が見つかりません / 店铺不存在' });
      return;
    }

    const { shopCode, shopName, platform, subClientId, platformAccountId, platformStoreName, memo, isActive } = req.body;

    // コード変更時の重複チェック / 编号变更时的重复校验
    if (shopCode && shopCode.trim() !== existing.shopCode) {
      const duplicate = await Shop.findOne({ tenantId, shopCode: shopCode.trim(), _id: { $ne: existing._id } }).lean();
      if (duplicate) {
        res.status(409).json({ message: `店舗コード「${shopCode.trim()}」は既に存在します / 店铺编号已存在` });
        return;
      }
    }

    const updateData: Record<string, unknown> = {};
    if (shopCode !== undefined) updateData.shopCode = shopCode.trim();
    if (shopName !== undefined) updateData.shopName = shopName.trim();
    if (platform !== undefined) updateData.platform = platform;
    if (subClientId !== undefined) updateData.subClientId = subClientId || null;
    if (platformAccountId !== undefined) updateData.platformAccountId = platformAccountId.trim();
    if (platformStoreName !== undefined) updateData.platformStoreName = platformStoreName.trim();
    if (memo !== undefined) updateData.memo = memo.trim();
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await Shop.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true }).lean();
    if (!updated) {
      res.status(404).json({ message: '店舗が見つかりません / 店铺不存在' });
      return;
    }

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: '店舗の更新に失敗しました / 更新店铺失败', error: error.message });
  }
};

// 店舗削除（ソフトデリート）/ 删除店铺（软删除）
export const deleteShop = async (req: Request, res: Response): Promise<void> => {
  try {
    const updated = await Shop.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true }).lean();
    if (!updated) {
      res.status(404).json({ message: '店舗が見つかりません / 店铺不存在' });
      return;
    }
    res.json({ message: 'Deleted', id: updated._id });
  } catch (error: any) {
    res.status(500).json({ message: '店舗の削除に失敗しました / 删除店铺失败', error: error.message });
  }
};
