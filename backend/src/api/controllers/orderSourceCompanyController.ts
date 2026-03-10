import type { Request, Response } from 'express';
import { OrderSourceCompany } from '@/models/orderSourceCompany';
import {
  createOrderSourceCompanySchema,
  updateOrderSourceCompanySchema,
} from '@/schemas/orderSourceCompanySchema';
import { z } from 'zod';

type ImportRowError = {
  rowIndex: number;
  senderName?: string;
  field?: string;
  message: string;
};

// Import schema: treat fields as required (matches UI expectations)
const importOrderSourceCompanySchema = z.object({
  senderName: z.string().trim().min(1, '名称は必須です'),
  senderPostalCode: z.string().trim().regex(/^\d{7}$/, '郵便番号は7桁の数字で入力してください'),
  senderAddressPrefecture: z
    .union([z.string().trim().min(1), z.literal('')])
    .optional()
    .transform((val) => (val === '' || val === undefined ? undefined : val)),
  senderAddressCity: z
    .union([z.string().trim().min(1), z.literal('')])
    .optional()
    .transform((val) => (val === '' || val === undefined ? undefined : val)),
  senderAddressStreet: z
    .union([z.string().trim().min(1), z.literal('')])
    .optional()
    .transform((val) => (val === '' || val === undefined ? undefined : val)),
  senderPhone: z.string().trim().regex(/^\d+$/, '電話番号は数字のみで入力してください'),
  hatsuBaseNo1: z
    .union([
      z.string().trim().regex(/^\d{3}$/, '発店コード1は3桁の数字で入力してください'),
      z.literal(''),
    ])
    .optional()
    .transform((val) => (val === '' || val === undefined ? undefined : val)),
  hatsuBaseNo2: z
    .union([
      z.string().trim().regex(/^\d{3}$/, '発店コード2は3桁の数字で入力してください'),
      z.literal(''),
    ])
    .optional()
    .transform((val) => (val === '' || val === undefined ? undefined : val)),
});

export const listOrderSourceCompanies = async (req: Request, res: Response): Promise<void> => {
  try {
    const { senderName, senderPostalCode, senderPhone } = req.query;

    const filter: Record<string, unknown> = {};
    if (typeof senderName === 'string' && senderName.trim()) {
      filter.senderName = { $regex: senderName.trim(), $options: 'i' };
    }
    if (typeof senderPostalCode === 'string' && senderPostalCode.trim()) {
      filter.senderPostalCode = { $regex: senderPostalCode.trim() };
    }
    if (typeof senderPhone === 'string' && senderPhone.trim()) {
      filter.senderPhone = { $regex: senderPhone.trim() };
    }

    const items = await OrderSourceCompany.find(filter).sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch order source companies', error: error.message });
  }
};

export const getOrderSourceCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    const item = await OrderSourceCompany.findById(req.params.id).lean();
    if (!item) {
      res.status(404).json({ message: 'Order source company not found' });
      return;
    }
    res.json(item);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch order source company', error: error.message });
  }
};

export const createOrderSourceCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = createOrderSourceCompanySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: 'Validation failed',
        errors: parsed.error.flatten(),
      });
      return;
    }

    // MongoDB 会自动生成 _id，直接使用 parsed.data
    const created = await OrderSourceCompany.create(parsed.data);
    res.status(201).json(created.toObject());
  } catch (error: any) {
    if (error.code === 11000) {
      // 提取冲突的字段信息
      const duplicateKey = error.keyPattern ? Object.keys(error.keyPattern)[0] : 'unknown';
      const duplicateValue = error.keyValue ? error.keyValue[duplicateKey] : 'unknown';
      res.status(409).json({ 
        message: `重複エラー: ${duplicateKey} フィールドの値「${duplicateValue}」が既に存在します`,
        duplicateField: duplicateKey,
        duplicateValue: duplicateValue,
      });
      return;
    }
    res.status(500).json({ message: 'Failed to create order source company', error: error.message });
  }
};

export const updateOrderSourceCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = updateOrderSourceCompanySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: 'Validation failed',
        errors: parsed.error.flatten(),
      });
      return;
    }

    const updated = await OrderSourceCompany.findByIdAndUpdate(req.params.id, parsed.data, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updated) {
      res.status(404).json({ message: 'Order source company not found' });
      return;
    }

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to update order source company', error: error.message });
  }
};

export const deleteOrderSourceCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    const deleted = await OrderSourceCompany.findByIdAndDelete(req.params.id).lean();
    if (!deleted) {
      res.status(404).json({ message: 'Order source company not found' });
      return;
    }
    res.json({ message: 'Deleted', id: deleted._id });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to delete order source company', error: error.message });
  }
};

/**
 * Validate order source company import rows. Rejects the whole import if any error exists.
 * POST /api/order-source-companies/validate-import
 * body: { rows: any[] }
 */
export const validateImportOrderSourceCompanies = async (req: Request, res: Response): Promise<void> => {
  try {
    const rows = (req.body?.rows as any[]) || [];
    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(400).json({ message: 'Invalid request: rows is required', errors: [] });
      return;
    }

    const errors: ImportRowError[] = [];

    const parsedRows = rows.map((row, rowIndex) => {
      const parsed = importOrderSourceCompanySchema.safeParse(row);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          errors.push({
            rowIndex,
            senderName: typeof row?.senderName === 'string' ? row.senderName : undefined,
            field: issue.path?.[0] ? String(issue.path[0]) : undefined,
            message: issue.message,
          });
        }
        return null;
      }
      return parsed.data;
    });

    // file-level duplicate senderName check
    const nameToFirstIndex = new Map<string, number>();
    parsedRows.forEach((r, rowIndex) => {
      const name = r?.senderName;
      if (!name) return;
      const key = String(name).trim();
      if (!key) return;
      if (nameToFirstIndex.has(key)) {
        errors.push({
          rowIndex,
          senderName: key,
          field: 'senderName',
          message: `名称「${key}」はファイル内で重複しています（先頭: ${nameToFirstIndex.get(key)})`,
        });
      } else {
        nameToFirstIndex.set(key, rowIndex);
      }
    });

    // db duplicate senderName check (soft-unique for import)
    const names = Array.from(nameToFirstIndex.keys());
    if (names.length) {
      const existing = await OrderSourceCompany.find(
        { senderName: { $in: names } },
        { senderName: 1 },
      ).lean();
      const existingNames = new Set(existing.map((d: any) => String(d.senderName)));
      for (const [name, rowIndex] of nameToFirstIndex.entries()) {
        if (existingNames.has(name)) {
          errors.push({
            rowIndex,
            senderName: name,
            field: 'senderName',
            message: `名称「${name}」は既に存在します`,
          });
        }
      }
    }

    if (errors.length) {
      res.status(400).json({ message: 'Import validation failed', errors });
      return;
    }

    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to validate import', error: error.message });
  }
};

/**
 * Bulk import order source companies. Validates rows and rejects whole import if any error exists.
 * POST /api/order-source-companies/import-bulk
 * body: { rows: any[] }
 */
export const importOrderSourceCompaniesBulk = async (req: Request, res: Response): Promise<void> => {
  try {
    const rows = (req.body?.rows as any[]) || [];
    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(400).json({ message: 'Invalid request: rows is required', errors: [] });
      return;
    }

    const errors: ImportRowError[] = [];
    const parsedRows = rows.map((row, rowIndex) => {
      const parsed = importOrderSourceCompanySchema.safeParse(row);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          errors.push({
            rowIndex,
            senderName: typeof row?.senderName === 'string' ? row.senderName : undefined,
            field: issue.path?.[0] ? String(issue.path[0]) : undefined,
            message: issue.message,
          });
        }
        return null;
      }
      return parsed.data;
    });

    const nameToFirstIndex = new Map<string, number>();
    parsedRows.forEach((r, rowIndex) => {
      const name = r?.senderName;
      if (!name) return;
      const key = String(name).trim();
      if (!key) return;
      if (nameToFirstIndex.has(key)) {
        errors.push({
          rowIndex,
          senderName: key,
          field: 'senderName',
          message: `名称「${key}」はファイル内で重複しています（先頭: ${nameToFirstIndex.get(key)})`,
        });
      } else {
        nameToFirstIndex.set(key, rowIndex);
      }
    });

    const names = Array.from(nameToFirstIndex.keys());
    if (names.length) {
      const existing = await OrderSourceCompany.find(
        { senderName: { $in: names } },
        { senderName: 1 },
      ).lean();
      const existingNames = new Set(existing.map((d: any) => String(d.senderName)));
      for (const [name, rowIndex] of nameToFirstIndex.entries()) {
        if (existingNames.has(name)) {
          errors.push({
            rowIndex,
            senderName: name,
            field: 'senderName',
            message: `名称「${name}」は既に存在します`,
          });
        }
      }
    }

    if (errors.length) {
      res.status(400).json({ message: 'Import validation failed', errors });
      return;
    }

    const docs = parsedRows.filter(Boolean) as any[];
    const created = await OrderSourceCompany.insertMany(docs, { ordered: true });
    res.status(201).json({ insertedCount: created.length });
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
    res.status(500).json({ message: 'Failed to import order source companies', error: error.message });
  }
};

