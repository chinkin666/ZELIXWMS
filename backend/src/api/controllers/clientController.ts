import type { Request, Response } from 'express';
import { Client } from '@/models/client';

export const listClients = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, page, limit, isActive } = req.query;

    const filter: Record<string, unknown> = {};

    if (typeof search === 'string' && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { clientCode: { $regex: escaped, $options: 'i' } },
        { name: { $regex: escaped, $options: 'i' } },
        { name2: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
      ];
    }

    if (typeof isActive === 'string') {
      if (isActive === 'true') filter.isActive = true;
      if (isActive === 'false') filter.isActive = false;
    }

    const pageNum = Math.max(1, parseInt(String(page || '1'), 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(String(limit || '50'), 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [data, total] = await Promise.all([
      Client.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Client.countDocuments(filter),
    ]);

    res.json({ data, total });
  } catch (error: any) {
    res.status(500).json({ message: '顧客の取得に失敗しました', error: error.message });
  }
};

export const getClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const item = await Client.findById(req.params.id).lean();
    if (!item) {
      res.status(404).json({ message: '顧客が見つかりません' });
      return;
    }
    res.json(item);
  } catch (error: any) {
    res.status(500).json({ message: '顧客の取得に失敗しました', error: error.message });
  }
};

export const createClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const {
      clientCode, name, name2, clientType, contactName,
      postalCode, prefecture, city, address, address2, phone, email,
      plan, billingEnabled,
      creditTier, creditLimit, paymentTermDays,
      portalEnabled, portalLanguage,
      memo, isActive,
    } = req.body;

    if (!clientCode || typeof clientCode !== 'string' || !clientCode.trim()) {
      res.status(400).json({ message: '顧客コードは必須です / 客户编号必填' });
      return;
    }
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ message: '顧客名は必須です / 客户名称必填' });
      return;
    }

    const existing = await Client.findOne({ tenantId, clientCode: clientCode.trim() }).lean();
    if (existing) {
      res.status(409).json({
        message: `顧客コード「${clientCode.trim()}」は既に存在します / 客户编号已存在`,
        duplicateField: 'clientCode',
        duplicateValue: clientCode.trim(),
      });
      return;
    }

    const created = await Client.create({
      tenantId,
      clientCode: clientCode.trim(),
      name: name.trim(),
      name2: name2?.trim() || '',
      clientType: clientType || undefined,
      contactName: contactName?.trim() || '',
      postalCode: postalCode?.trim() || '',
      prefecture: prefecture?.trim() || '',
      city: city?.trim() || '',
      address: address?.trim() || '',
      address2: address2?.trim() || '',
      phone: phone?.trim() || '',
      email: email?.trim() || '',
      plan: plan?.trim() || undefined,
      billingEnabled: billingEnabled !== undefined ? billingEnabled : false,
      creditTier: creditTier || 'new',
      creditLimit: creditLimit !== undefined ? creditLimit : 100000,
      paymentTermDays: paymentTermDays !== undefined ? paymentTermDays : 30,
      portalEnabled: portalEnabled ?? false,
      portalLanguage: portalLanguage || 'ja',
      memo: memo?.trim() || '',
      isActive: isActive !== undefined ? isActive : true,
    });

    res.status(201).json(created.toObject());
  } catch (error: any) {
    if (error.code === 11000) {
      const duplicateKey = error.keyPattern ? Object.keys(error.keyPattern)[0] : 'unknown';
      const duplicateValue = error.keyValue ? error.keyValue[duplicateKey] : 'unknown';
      res.status(409).json({
        message: `重複エラー: ${duplicateKey} フィールドの値「${duplicateValue}」が既に存在します`,
        duplicateField: duplicateKey,
        duplicateValue,
      });
      return;
    }
    res.status(500).json({ message: '顧客の作成に失敗しました', error: error.message });
  }
};

export const updateClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const {
      clientCode, name, name2, clientType, contactName,
      postalCode, prefecture, city, address, address2, phone, email,
      plan, billingEnabled,
      creditTier, creditLimit, currentBalance, paymentTermDays,
      portalEnabled, portalLanguage,
      memo, isActive,
    } = req.body;

    const existing = await Client.findById(req.params.id).lean();
    if (!existing) {
      res.status(404).json({ message: '顧客が見つかりません / 客户不存在' });
      return;
    }

    // コード変更時の重複チェック / 编号变更时的重复校验
    if (clientCode && clientCode.trim() !== existing.clientCode) {
      const duplicate = await Client.findOne({ tenantId, clientCode: clientCode.trim(), _id: { $ne: existing._id } }).lean();
      if (duplicate) {
        res.status(409).json({
          message: `顧客コード「${clientCode.trim()}」は既に存在します / 客户编号已存在`,
          duplicateField: 'clientCode',
          duplicateValue: clientCode.trim(),
        });
        return;
      }
    }

    const updateData: Record<string, unknown> = {};
    if (clientCode !== undefined) updateData.clientCode = clientCode.trim();
    if (name !== undefined) updateData.name = name.trim();
    if (name2 !== undefined) updateData.name2 = name2.trim();
    if (clientType !== undefined) updateData.clientType = clientType;
    if (contactName !== undefined) updateData.contactName = contactName.trim();
    if (postalCode !== undefined) updateData.postalCode = postalCode.trim();
    if (prefecture !== undefined) updateData.prefecture = prefecture.trim();
    if (city !== undefined) updateData.city = city.trim();
    if (address !== undefined) updateData.address = address.trim();
    if (address2 !== undefined) updateData.address2 = address2.trim();
    if (phone !== undefined) updateData.phone = phone.trim();
    if (email !== undefined) updateData.email = email.trim();
    if (plan !== undefined) updateData.plan = plan.trim();
    if (billingEnabled !== undefined) updateData.billingEnabled = billingEnabled;
    if (creditTier !== undefined) updateData.creditTier = creditTier;
    if (creditLimit !== undefined) updateData.creditLimit = creditLimit;
    if (currentBalance !== undefined) updateData.currentBalance = currentBalance;
    if (paymentTermDays !== undefined) updateData.paymentTermDays = paymentTermDays;
    if (portalEnabled !== undefined) updateData.portalEnabled = portalEnabled;
    if (portalLanguage !== undefined) updateData.portalLanguage = portalLanguage;
    if (memo !== undefined) updateData.memo = memo.trim();
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await Client.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updated) {
      res.status(404).json({ message: '顧客が見つかりません' });
      return;
    }

    res.json(updated);
  } catch (error: any) {
    if (error.code === 11000) {
      const duplicateKey = error.keyPattern ? Object.keys(error.keyPattern)[0] : 'unknown';
      const duplicateValue = error.keyValue ? error.keyValue[duplicateKey] : 'unknown';
      res.status(409).json({
        message: `重複エラー: ${duplicateKey} フィールドの値「${duplicateValue}」が既に存在します`,
        duplicateField: duplicateKey,
        duplicateValue,
      });
      return;
    }
    res.status(500).json({ message: '顧客の更新に失敗しました', error: error.message });
  }
};

export const deleteClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const updated = await Client.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true },
    ).lean();

    if (!updated) {
      res.status(404).json({ message: '顧客が見つかりません' });
      return;
    }

    res.json({ message: 'Deleted', id: updated._id });
  } catch (error: any) {
    res.status(500).json({ message: '顧客の削除に失敗しました', error: error.message });
  }
};

export const exportClients = async (_req: Request, res: Response): Promise<void> => {
  try {
    const clients = await Client.find({ isActive: true }).sort({ clientCode: 1 }).lean();
    res.json(clients);
  } catch (error: any) {
    res.status(500).json({ message: '顧客のエクスポートに失敗しました', error: error.message });
  }
};
