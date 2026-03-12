import type { Request, Response } from 'express';
import { Supplier } from '@/models/supplier';

/**
 * List suppliers with search, pagination, isActive filter
 * GET /api/suppliers?search=xxx&page=1&limit=20&isActive=true
 */
export const listSuppliers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, page, limit, isActive } = req.query;

    const filter: Record<string, unknown> = {};

    if (typeof search === 'string' && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { supplierCode: { $regex: escaped, $options: 'i' } },
        { name: { $regex: escaped, $options: 'i' } },
        { name2: { $regex: escaped, $options: 'i' } },
        { phone: { $regex: escaped, $options: 'i' } },
      ];
    }

    if (typeof isActive === 'string') {
      if (isActive === 'true') filter.isActive = true;
      if (isActive === 'false') filter.isActive = false;
    }

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [data, total] = await Promise.all([
      Supplier.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Supplier.countDocuments(filter),
    ]);

    res.json({ data, total });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: '仕入先の取得に失敗しました', error: message });
  }
};

/**
 * Get a single supplier by ID
 * GET /api/suppliers/:id
 */
export const getSupplier = async (req: Request, res: Response): Promise<void> => {
  try {
    const item = await Supplier.findById(req.params.id).lean();
    if (!item) {
      res.status(404).json({ message: '仕入先が見つかりません' });
      return;
    }
    res.json(item);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: '仕入先の取得に失敗しました', error: message });
  }
};

/**
 * Create a new supplier
 * POST /api/suppliers
 */
export const createSupplier = async (req: Request, res: Response): Promise<void> => {
  try {
    const { supplierCode, name, name2, postalCode, address1, address2, address3, phone, isActive, memo } = req.body;

    if (!supplierCode || typeof supplierCode !== 'string' || !supplierCode.trim()) {
      res.status(400).json({ message: '仕入先コードは必須です' });
      return;
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ message: '仕入先名は必須です' });
      return;
    }

    const existing = await Supplier.findOne({ supplierCode: supplierCode.trim() }).lean();
    if (existing) {
      res.status(409).json({ message: `仕入先コード「${supplierCode.trim()}」は既に存在します` });
      return;
    }

    const created = await Supplier.create({
      supplierCode: supplierCode.trim(),
      name: name.trim(),
      name2: name2?.trim() || undefined,
      postalCode: postalCode?.trim() || undefined,
      address1: address1?.trim() || undefined,
      address2: address2?.trim() || undefined,
      address3: address3?.trim() || undefined,
      phone: phone?.trim() || undefined,
      isActive: isActive !== false,
      memo: memo?.trim() || undefined,
    });

    res.status(201).json(created.toObject());
  } catch (error: unknown) {
    if ((error as any).code === 11000) {
      const duplicateKey = (error as any).keyPattern ? Object.keys((error as any).keyPattern)[0] : 'unknown';
      const duplicateValue = (error as any).keyValue ? (error as any).keyValue[duplicateKey] : 'unknown';
      res.status(409).json({
        message: `重複エラー: ${duplicateKey} フィールドの値「${duplicateValue}」が既に存在します`,
        duplicateField: duplicateKey,
        duplicateValue,
      });
      return;
    }
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: '仕入先の作成に失敗しました', error: message });
  }
};

/**
 * Update a supplier
 * PUT /api/suppliers/:id
 */
export const updateSupplier = async (req: Request, res: Response): Promise<void> => {
  try {
    const { supplierCode, name, name2, postalCode, address1, address2, address3, phone, isActive, memo } = req.body;

    const updateData: Record<string, unknown> = {};

    if (supplierCode !== undefined) {
      if (typeof supplierCode !== 'string' || !supplierCode.trim()) {
        res.status(400).json({ message: '仕入先コードは必須です' });
        return;
      }
      const existing = await Supplier.findOne({
        supplierCode: supplierCode.trim(),
        _id: { $ne: req.params.id },
      }).lean();
      if (existing) {
        res.status(409).json({ message: `仕入先コード「${supplierCode.trim()}」は既に存在します` });
        return;
      }
      updateData.supplierCode = supplierCode.trim();
    }

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ message: '仕入先名は必須です' });
        return;
      }
      updateData.name = name.trim();
    }

    if (name2 !== undefined) updateData.name2 = name2?.trim() || undefined;
    if (postalCode !== undefined) updateData.postalCode = postalCode?.trim() || undefined;
    if (address1 !== undefined) updateData.address1 = address1?.trim() || undefined;
    if (address2 !== undefined) updateData.address2 = address2?.trim() || undefined;
    if (address3 !== undefined) updateData.address3 = address3?.trim() || undefined;
    if (phone !== undefined) updateData.phone = phone?.trim() || undefined;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    if (memo !== undefined) updateData.memo = memo?.trim() || undefined;

    const updated = await Supplier.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updated) {
      res.status(404).json({ message: '仕入先が見つかりません' });
      return;
    }

    res.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: '仕入先の更新に失敗しました', error: message });
  }
};

/**
 * Soft-delete a supplier (set isActive = false)
 * DELETE /api/suppliers/:id
 */
export const deleteSupplier = async (req: Request, res: Response): Promise<void> => {
  try {
    const updated = await Supplier.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true },
    ).lean();

    if (!updated) {
      res.status(404).json({ message: '仕入先が見つかりません' });
      return;
    }

    res.json({ message: '仕入先を無効にしました', id: updated._id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: '仕入先の削除に失敗しました', error: message });
  }
};

/**
 * Bulk import suppliers
 * POST /api/suppliers/bulk-import
 * body: { suppliers: Array<SupplierData> }
 */
export const bulkImportSuppliers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { suppliers } = req.body;

    if (!Array.isArray(suppliers) || suppliers.length === 0) {
      res.status(400).json({ message: '仕入先データが必要です' });
      return;
    }

    let successCount = 0;
    let failCount = 0;
    const errors: Array<{ row: number; supplierCode: string; message: string }> = [];

    for (let i = 0; i < suppliers.length; i++) {
      const row = suppliers[i];
      try {
        if (!row.supplierCode || !row.name) {
          failCount++;
          errors.push({
            row: i + 1,
            supplierCode: row.supplierCode || '',
            message: '仕入先コードと仕入先名は必須です',
          });
          continue;
        }

        await Supplier.findOneAndUpdate(
          { supplierCode: String(row.supplierCode).trim() },
          {
            $set: {
              supplierCode: String(row.supplierCode).trim(),
              name: String(row.name).trim(),
              name2: row.name2 ? String(row.name2).trim() : undefined,
              postalCode: row.postalCode ? String(row.postalCode).trim() : undefined,
              address1: row.address1 ? String(row.address1).trim() : undefined,
              address2: row.address2 ? String(row.address2).trim() : undefined,
              address3: row.address3 ? String(row.address3).trim() : undefined,
              phone: row.phone ? String(row.phone).trim() : undefined,
              isActive: row.isActive !== false && row.isActive !== 'false',
              memo: row.memo ? String(row.memo).trim() : undefined,
            },
          },
          { upsert: true, new: true, runValidators: true },
        );
        successCount++;
      } catch (err: unknown) {
        failCount++;
        const errMessage = err instanceof Error ? err.message : String(err);
        errors.push({
          row: i + 1,
          supplierCode: row.supplierCode || '',
          message: errMessage,
        });
      }
    }

    res.json({
      message: `${successCount}件登録、${failCount}件失敗`,
      successCount,
      failCount,
      errors,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: '一括取込に失敗しました', error: message });
  }
};

/**
 * Export all active suppliers as JSON array
 * GET /api/suppliers/export
 */
export const exportSuppliers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const suppliers = await Supplier.find({ isActive: true })
      .sort({ supplierCode: 1 })
      .lean();
    res.json(suppliers);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: '仕入先のエクスポートに失敗しました', error: message });
  }
};
