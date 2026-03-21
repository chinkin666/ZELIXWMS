import type { Request, Response } from 'express';
import { Tenant } from '@/models/tenant';

export const listTenants = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, status, plan, page, limit } = req.query;

    const filter: Record<string, unknown> = {};

    if (typeof search === 'string' && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { tenantCode: { $regex: escaped, $options: 'i' } },
        { name: { $regex: escaped, $options: 'i' } },
      ];
    }

    if (typeof status === 'string' && status.trim()) {
      filter.status = status.trim();
    }

    if (typeof plan === 'string' && plan.trim()) {
      filter.plan = plan.trim();
    }

    const pageNum = Math.max(1, parseInt(String(page || '1'), 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(String(limit || '50'), 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [data, total] = await Promise.all([
      Tenant.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Tenant.countDocuments(filter),
    ]);

    res.json({ data, total });
  } catch (error: any) {
    res.status(500).json({ message: 'テナントの取得に失敗しました' });
  }
};

export const getTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    const item = await Tenant.findById(req.params.id).lean();
    if (!item) {
      res.status(404).json({ message: 'テナントが見つかりません' });
      return;
    }
    res.json(item);
  } catch (error: any) {
    res.status(500).json({ message: 'テナントの取得に失敗しました' });
  }
};

export const createTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      tenantCode, name, name2, plan, status, contactName, contactEmail, contactPhone,
      postalCode, prefecture, city, address, maxUsers, maxWarehouses, maxClients,
      trialExpiresAt, billingStartedAt, features, settings, memo,
    } = req.body;

    if (!tenantCode || typeof tenantCode !== 'string' || !tenantCode.trim()) {
      res.status(400).json({ message: 'テナントコードは必須です' });
      return;
    }
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ message: 'テナント名は必須です' });
      return;
    }

    const existing = await Tenant.findOne({ tenantCode: tenantCode.trim() }).lean();
    if (existing) {
      res.status(409).json({
        message: `テナントコード「${tenantCode.trim()}」は既に存在します`,
        duplicateField: 'tenantCode',
        duplicateValue: tenantCode.trim(),
      });
      return;
    }

    const created = await Tenant.create({
      tenantCode: tenantCode.trim(),
      name: name.trim(),
      name2: name2?.trim(),
      plan: plan || 'free',
      status: status || 'trial',
      contactName: contactName?.trim(),
      contactEmail: contactEmail?.trim(),
      contactPhone: contactPhone?.trim(),
      postalCode: postalCode?.trim(),
      prefecture: prefecture?.trim(),
      city: city?.trim(),
      address: address?.trim(),
      maxUsers: maxUsers !== undefined ? maxUsers : 5,
      maxWarehouses: maxWarehouses !== undefined ? maxWarehouses : 1,
      maxClients: maxClients !== undefined ? maxClients : 10,
      trialExpiresAt,
      billingStartedAt,
      features: features || [],
      settings: settings || {},
      memo: memo?.trim(),
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
    res.status(500).json({ message: 'テナントの作成に失敗しました' });
  }
};

export const updateTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      tenantCode, name, name2, plan, contactName, contactEmail, contactPhone,
      postalCode, prefecture, city, address, maxUsers, maxWarehouses, maxClients,
      trialExpiresAt, billingStartedAt, features, settings, memo, isActive,
    } = req.body;

    const existing = await Tenant.findById(req.params.id).lean();
    if (!existing) {
      res.status(404).json({ message: 'テナントが見つかりません' });
      return;
    }

    if (tenantCode && tenantCode.trim() !== existing.tenantCode) {
      const duplicate = await Tenant.findOne({ tenantCode: tenantCode.trim(), _id: { $ne: existing._id } }).lean();
      if (duplicate) {
        res.status(409).json({
          message: `テナントコード「${tenantCode.trim()}」は既に存在します`,
          duplicateField: 'tenantCode',
          duplicateValue: tenantCode.trim(),
        });
        return;
      }
    }

    const updateData: Record<string, unknown> = {};
    if (tenantCode !== undefined) updateData.tenantCode = tenantCode.trim();
    if (name !== undefined) updateData.name = name.trim();
    if (name2 !== undefined) updateData.name2 = name2.trim();
    if (plan !== undefined) updateData.plan = plan;
    if (contactName !== undefined) updateData.contactName = contactName.trim();
    if (contactEmail !== undefined) updateData.contactEmail = contactEmail.trim();
    if (contactPhone !== undefined) updateData.contactPhone = contactPhone.trim();
    if (postalCode !== undefined) updateData.postalCode = postalCode.trim();
    if (prefecture !== undefined) updateData.prefecture = prefecture.trim();
    if (city !== undefined) updateData.city = city.trim();
    if (address !== undefined) updateData.address = address.trim();
    if (maxUsers !== undefined) updateData.maxUsers = maxUsers;
    if (maxWarehouses !== undefined) updateData.maxWarehouses = maxWarehouses;
    if (maxClients !== undefined) updateData.maxClients = maxClients;
    if (trialExpiresAt !== undefined) updateData.trialExpiresAt = trialExpiresAt;
    if (billingStartedAt !== undefined) updateData.billingStartedAt = billingStartedAt;
    if (features !== undefined) updateData.features = features;
    if (settings !== undefined) updateData.settings = settings;
    if (memo !== undefined) updateData.memo = memo.trim();
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await Tenant.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updated) {
      res.status(404).json({ message: 'テナントが見つかりません' });
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
    res.status(500).json({ message: 'テナントの更新に失敗しました' });
  }
};

export const deleteTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    const updated = await Tenant.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled' },
      { new: true },
    ).lean();

    if (!updated) {
      res.status(404).json({ message: 'テナントが見つかりません' });
      return;
    }

    res.json({ message: 'Deleted', id: updated._id });
  } catch (error: any) {
    res.status(500).json({ message: 'テナントの削除に失敗しました' });
  }
};

export const toggleTenantStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.body;

    const validStatuses = ['active', 'suspended', 'trial', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({
        message: `ステータスは ${validStatuses.join(', ')} のいずれかを指定してください`,
      });
      return;
    }

    const existing = await Tenant.findById(req.params.id).lean();
    if (!existing) {
      res.status(404).json({ message: 'テナントが見つかりません' });
      return;
    }

    const updated = await Tenant.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true },
    ).lean();

    if (!updated) {
      res.status(404).json({ message: 'テナントが見つかりません' });
      return;
    }

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: 'テナントステータスの変更に失敗しました' });
  }
};
