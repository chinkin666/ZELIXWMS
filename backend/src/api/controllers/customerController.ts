import type { Request, Response } from 'express';
import { Customer } from '@/models/customer';

export const listCustomers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, page, limit, isActive } = req.query;

    const filter: Record<string, unknown> = {};

    if (typeof search === 'string' && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { customerCode: { $regex: escaped, $options: 'i' } },
        { name: { $regex: escaped, $options: 'i' } },
        { name2: { $regex: escaped, $options: 'i' } },
        { phone: { $regex: escaped, $options: 'i' } },
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
      Customer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Customer.countDocuments(filter),
    ]);

    res.json({ data, total });
  } catch (error: any) {
    res.status(500).json({ message: '得意先の取得に失敗しました', error: error.message });
  }
};

export const getCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const item = await Customer.findById(req.params.id).lean();
    if (!item) {
      res.status(404).json({ message: '得意先が見つかりません' });
      return;
    }
    res.json(item);
  } catch (error: any) {
    res.status(500).json({ message: '得意先の取得に失敗しました', error: error.message });
  }
};

export const createCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerCode, name, name2, postalCode, prefecture, city, address, address2, phone, email, memo, isActive } = req.body;

    if (!customerCode || typeof customerCode !== 'string' || !customerCode.trim()) {
      res.status(400).json({ message: '得意先コードは必須です' });
      return;
    }
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ message: '得意先名は必須です' });
      return;
    }

    const existing = await Customer.findOne({ customerCode: customerCode.trim() }).lean();
    if (existing) {
      res.status(409).json({
        message: `得意先コード「${customerCode.trim()}」は既に存在します`,
        duplicateField: 'customerCode',
        duplicateValue: customerCode.trim(),
      });
      return;
    }

    const created = await Customer.create({
      customerCode: customerCode.trim(),
      name: name.trim(),
      name2: name2?.trim() || '',
      postalCode: postalCode?.trim() || '',
      prefecture: prefecture?.trim() || '',
      city: city?.trim() || '',
      address: address?.trim() || '',
      address2: address2?.trim() || '',
      phone: phone?.trim() || '',
      email: email?.trim() || '',
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
    res.status(500).json({ message: '得意先の作成に失敗しました', error: error.message });
  }
};

export const updateCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerCode, name, name2, postalCode, prefecture, city, address, address2, phone, email, memo, isActive } = req.body;

    const existing = await Customer.findById(req.params.id).lean();
    if (!existing) {
      res.status(404).json({ message: '得意先が見つかりません' });
      return;
    }

    // If customerCode is changing, verify uniqueness
    if (customerCode && customerCode.trim() !== existing.customerCode) {
      const duplicate = await Customer.findOne({ customerCode: customerCode.trim(), _id: { $ne: existing._id } }).lean();
      if (duplicate) {
        res.status(409).json({
          message: `得意先コード「${customerCode.trim()}」は既に存在します`,
          duplicateField: 'customerCode',
          duplicateValue: customerCode.trim(),
        });
        return;
      }
    }

    const updateData: Record<string, unknown> = {};
    if (customerCode !== undefined) updateData.customerCode = customerCode.trim();
    if (name !== undefined) updateData.name = name.trim();
    if (name2 !== undefined) updateData.name2 = name2.trim();
    if (postalCode !== undefined) updateData.postalCode = postalCode.trim();
    if (prefecture !== undefined) updateData.prefecture = prefecture.trim();
    if (city !== undefined) updateData.city = city.trim();
    if (address !== undefined) updateData.address = address.trim();
    if (address2 !== undefined) updateData.address2 = address2.trim();
    if (phone !== undefined) updateData.phone = phone.trim();
    if (email !== undefined) updateData.email = email.trim();
    if (memo !== undefined) updateData.memo = memo.trim();
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await Customer.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updated) {
      res.status(404).json({ message: '得意先が見つかりません' });
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
    res.status(500).json({ message: '得意先の更新に失敗しました', error: error.message });
  }
};

export const deleteCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const updated = await Customer.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true },
    ).lean();

    if (!updated) {
      res.status(404).json({ message: '得意先が見つかりません' });
      return;
    }

    res.json({ message: 'Deleted', id: updated._id });
  } catch (error: any) {
    res.status(500).json({ message: '得意先の削除に失敗しました', error: error.message });
  }
};

export const bulkImportCustomers = async (req: Request, res: Response): Promise<void> => {
  try {
    const customers = req.body?.customers;
    if (!Array.isArray(customers) || customers.length === 0) {
      res.status(400).json({ message: '取り込みデータが空です' });
      return;
    }

    let successCount = 0;
    let failCount = 0;
    const errors: { row: number; customerCode?: string; message: string }[] = [];

    for (let i = 0; i < customers.length; i++) {
      const row = customers[i];
      try {
        if (!row.customerCode || !String(row.customerCode).trim()) {
          failCount++;
          errors.push({ row: i + 1, message: '得意先コードは必須です' });
          continue;
        }
        if (!row.name || !String(row.name).trim()) {
          failCount++;
          errors.push({ row: i + 1, customerCode: row.customerCode, message: '得意先名は必須です' });
          continue;
        }

        await Customer.findOneAndUpdate(
          { customerCode: String(row.customerCode).trim() },
          {
            customerCode: String(row.customerCode).trim(),
            name: String(row.name || '').trim(),
            name2: String(row.name2 || '').trim(),
            postalCode: String(row.postalCode || '').trim(),
            prefecture: String(row.prefecture || '').trim(),
            city: String(row.city || '').trim(),
            address: String(row.address || '').trim(),
            address2: String(row.address2 || '').trim(),
            phone: String(row.phone || '').trim(),
            email: String(row.email || '').trim(),
            memo: String(row.memo || '').trim(),
            isActive: row.isActive !== undefined ? row.isActive : true,
          },
          { upsert: true, new: true, runValidators: true },
        );
        successCount++;
      } catch (err: any) {
        failCount++;
        errors.push({ row: i + 1, customerCode: row.customerCode, message: err.message });
      }
    }

    res.json({ message: '取り込み完了', successCount, failCount, errors });
  } catch (error: any) {
    res.status(500).json({ message: '一括取り込みに失敗しました', error: error.message });
  }
};

export const exportCustomers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const customers = await Customer.find({ isActive: true }).sort({ customerCode: 1 }).lean();
    res.json(customers);
  } catch (error: any) {
    res.status(500).json({ message: '得意先のエクスポートに失敗しました', error: error.message });
  }
};
