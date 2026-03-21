import type { Request, Response } from 'express';
import { SubClient } from '@/models/subClient';
import { Client } from '@/models/client';
import { getTenantId } from '@/api/helpers/tenantHelper';

// 子顧客一覧 / 子客户列表
export const listSubClients = async (req: Request, res: Response): Promise<void> => {
  try {
    const { clientId, search, isActive, page, limit } = req.query;
    const tenantId = getTenantId(req);

    const filter: Record<string, unknown> = { tenantId };

    if (typeof clientId === 'string' && clientId.trim()) {
      filter.clientId = clientId.trim();
    }
    if (typeof isActive === 'string') {
      if (isActive === 'true') filter.isActive = true;
      if (isActive === 'false') filter.isActive = false;
    }
    if (typeof search === 'string' && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { subClientCode: { $regex: escaped, $options: 'i' } },
        { name: { $regex: escaped, $options: 'i' } },
        { name2: { $regex: escaped, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(String(page || '1'), 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(String(limit || '50'), 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [data, total] = await Promise.all([
      SubClient.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      SubClient.countDocuments(filter),
    ]);

    res.json({ data, total });
  } catch (error: any) {
    res.status(500).json({ message: '子顧客の取得に失敗しました / 获取子客户失败', error: error.message });
  }
};

// 子顧客詳細 / 子客户详情
export const getSubClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const item = await SubClient.findById(req.params.id).lean();
    if (!item) {
      res.status(404).json({ message: '子顧客が見つかりません / 子客户不存在' });
      return;
    }
    res.json(item);
  } catch (error: any) {
    res.status(500).json({ message: '子顧客の取得に失敗しました / 获取子客户失败', error: error.message });
  }
};

// 子顧客作成 / 创建子客户
export const createSubClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);
    const { clientId, subClientCode, name, name2, subClientType, contactPerson, phone, email, portalEnabled, memo } = req.body;

    // 必須チェック / 必填校验
    if (!clientId) {
      res.status(400).json({ message: '所属顧客IDは必須です / 所属客户ID必填' });
      return;
    }
    if (!subClientCode || typeof subClientCode !== 'string' || !subClientCode.trim()) {
      res.status(400).json({ message: '子顧客コードは必須です / 子客户编号必填' });
      return;
    }
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ message: '子顧客名は必須です / 子客户名称必填' });
      return;
    }

    // 所属顧客の存在確認 / 所属客户存在校验
    const client = await Client.findById(clientId).lean();
    if (!client) {
      res.status(404).json({ message: '所属顧客が見つかりません / 所属客户不存在' });
      return;
    }

    // コード重複チェック / 编号重复校验
    const existing = await SubClient.findOne({ tenantId, subClientCode: subClientCode.trim() }).lean();
    if (existing) {
      res.status(409).json({ message: `子顧客コード「${subClientCode.trim()}」は既に存在します / 子客户编号已存在` });
      return;
    }

    const created = await SubClient.create({
      tenantId,
      clientId,
      subClientCode: subClientCode.trim(),
      name: name.trim(),
      name2: name2?.trim() || '',
      subClientType: subClientType || undefined,
      contactPerson: contactPerson?.trim() || '',
      phone: phone?.trim() || '',
      email: email?.trim() || '',
      portalEnabled: portalEnabled ?? false,
      memo: memo?.trim() || '',
      isActive: true,
    });

    res.status(201).json(created.toObject());
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({ message: '子顧客コードが重複しています / 子客户编号重复' });
      return;
    }
    res.status(500).json({ message: '子顧客の作成に失敗しました / 创建子客户失败', error: error.message });
  }
};

// 子顧客更新 / 更新子客户
export const updateSubClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);
    const existing = await SubClient.findById(req.params.id).lean();
    if (!existing) {
      res.status(404).json({ message: '子顧客が見つかりません / 子客户不存在' });
      return;
    }

    const { subClientCode, name, name2, subClientType, contactPerson, phone, email, portalEnabled, memo, isActive } = req.body;

    // コード変更時の重複チェック / 编号变更时的重复校验
    if (subClientCode && subClientCode.trim() !== existing.subClientCode) {
      const duplicate = await SubClient.findOne({ tenantId, subClientCode: subClientCode.trim(), _id: { $ne: existing._id } }).lean();
      if (duplicate) {
        res.status(409).json({ message: `子顧客コード「${subClientCode.trim()}」は既に存在します / 子客户编号已存在` });
        return;
      }
    }

    const updateData: Record<string, unknown> = {};
    if (subClientCode !== undefined) updateData.subClientCode = subClientCode.trim();
    if (name !== undefined) updateData.name = name.trim();
    if (name2 !== undefined) updateData.name2 = name2.trim();
    if (subClientType !== undefined) updateData.subClientType = subClientType;
    if (contactPerson !== undefined) updateData.contactPerson = contactPerson.trim();
    if (phone !== undefined) updateData.phone = phone.trim();
    if (email !== undefined) updateData.email = email.trim();
    if (portalEnabled !== undefined) updateData.portalEnabled = portalEnabled;
    if (memo !== undefined) updateData.memo = memo.trim();
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await SubClient.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true }).lean();
    if (!updated) {
      res.status(404).json({ message: '子顧客が見つかりません / 子客户不存在' });
      return;
    }

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: '子顧客の更新に失敗しました / 更新子客户失败', error: error.message });
  }
};

// 子顧客削除（ソフトデリート）/ 删除子客户（软删除）
export const deleteSubClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const updated = await SubClient.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true }).lean();
    if (!updated) {
      res.status(404).json({ message: '子顧客が見つかりません / 子客户不存在' });
      return;
    }
    res.json({ message: 'Deleted', id: updated._id });
  } catch (error: any) {
    res.status(500).json({ message: '子顧客の削除に失敗しました / 删除子客户失败', error: error.message });
  }
};
