import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { Product, computeAllSku, type ISubSku } from '@/models/product';
import { createProductSchema, updateProductSchema, type CreateProductInput } from '@/schemas/productSchema';
import { loadEnv } from '@/config/env';

type ImportRowError = {
  rowIndex: number; // 0-based index in input array
  sku?: string;
  field?: string;
  message: string;
};

/**
 * Validate that all SKU codes (main + sub) are globally unique using the _allSku index.
 * Returns an array of conflict messages if any duplicates are found.
 */
async function validateSkuUniqueness(
  codes: string[],
  excludeProductId?: mongoose.Types.ObjectId | string,
): Promise<string[]> {
  if (!codes || codes.length === 0) return [];

  const query: any = { _allSku: { $in: codes } };
  if (excludeProductId) {
    query._id = { $ne: excludeProductId };
  }

  const existingProducts = await Product.find(query, { sku: 1, _allSku: 1 }).lean();
  const conflicts: string[] = [];

  for (const product of existingProducts) {
    for (const code of codes) {
      if ((product._allSku || []).includes(code)) {
        conflicts.push(`SKU「${code}」は既存商品「${product.sku}」と重複しています`);
      }
    }
  }

  return conflicts;
}

/**
 * Validate sub-SKU conflicts for import rows (file-level + DB-level).
 * Returns an array of import row errors.
 */
async function validateImportSubSkuConflicts(
  validRows: { sku: string; subSkus?: { subSku: string }[]; _rowIndex: number }[],
  skuToFirstIndex: Map<string, number>,
): Promise<ImportRowError[]> {
  const errors: ImportRowError[] = [];

  // Collect all sub-SKUs from import rows
  const allImportSubSkus: { subSku: string; parentSku: string; rowIndex: number }[] = [];
  for (const row of validRows) {
    for (const sub of row.subSkus || []) {
      if (sub.subSku?.trim()) {
        allImportSubSkus.push({ subSku: sub.subSku.trim(), parentSku: String(row.sku).trim(), rowIndex: row._rowIndex });
      }
    }
  }

  if (allImportSubSkus.length === 0) return errors;

  const subSkuCodes = allImportSubSkus.map((s) => s.subSku);
  const importSkus = Array.from(skuToFirstIndex.keys());

  // Check DB conflicts (excluding products being overwritten by import)
  const conflictingProducts = await Product.find(
    { $and: [{ sku: { $nin: importSkus } }, { _allSku: { $in: subSkuCodes } }] },
    { sku: 1, _allSku: 1 },
  ).lean();

  for (const product of conflictingProducts) {
    for (const importSub of allImportSubSkus) {
      if ((product._allSku || []).includes(importSub.subSku)) {
        errors.push({
          rowIndex: importSub.rowIndex,
          sku: importSub.parentSku,
          field: 'subSkus',
          message: `子SKU「${importSub.subSku}」は既存商品「${product.sku}」のSKUと重複しています`,
        });
      }
    }
  }

  // Check file-level conflicts: sub-SKU vs main SKU of another row
  for (const importSub of allImportSubSkus) {
    if (skuToFirstIndex.has(importSub.subSku) && importSub.subSku !== importSub.parentSku) {
      const mainSkuRowIndex = skuToFirstIndex.get(importSub.subSku)!;
      errors.push({
        rowIndex: importSub.rowIndex,
        sku: importSub.parentSku,
        field: 'subSkus',
        message: `子SKU「${importSub.subSku}」はファイル内の別商品（行${mainSkuRowIndex + 1}）のSKUと重複しています`,
      });
    }
  }

  // Check file-level conflicts: sub-SKU duplicates across rows
  const subSkuToParent = new Map<string, { parentSku: string; rowIndex: number }>();
  for (const importSub of allImportSubSkus) {
    const existing = subSkuToParent.get(importSub.subSku);
    if (existing && existing.parentSku !== importSub.parentSku) {
      errors.push({
        rowIndex: importSub.rowIndex,
        sku: importSub.parentSku,
        field: 'subSkus',
        message: `子SKU「${importSub.subSku}」はファイル内の別商品（行${existing.rowIndex + 1}）の子SKUと重複しています`,
      });
    } else {
      subSkuToParent.set(importSub.subSku, { parentSku: importSub.parentSku, rowIndex: importSub.rowIndex });
    }
  }

  return errors;
}

export const listProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sku, name, nameFull, coolType, mailCalcEnabled } = req.query;

    const filter: Record<string, unknown> = {};
    if (typeof sku === 'string' && sku.trim()) {
      filter.sku = { $regex: sku.trim(), $options: 'i' };
    }
    if (typeof name === 'string' && name.trim()) {
      filter.name = { $regex: name.trim(), $options: 'i' };
    }
    if (typeof nameFull === 'string' && nameFull.trim()) {
      filter.nameFull = { $regex: nameFull.trim(), $options: 'i' };
    }
    if (typeof coolType === 'string' && ['0', '1', '2'].includes(coolType)) {
      filter.coolType = coolType;
    }
    if (typeof mailCalcEnabled === 'string') {
      filter.mailCalcEnabled = mailCalcEnabled === 'true';
    }

    const items = await Product.find(filter).sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch products', error: error.message });
  }
};

export const getProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const item = await Product.findById(req.params.id).lean();
    if (!item) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }
    res.json(item);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch product', error: error.message });
  }
};

export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = createProductSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: 'Validation failed',
        errors: parsed.error.flatten(),
      });
      return;
    }

    // Validate all SKU codes (main + sub) are globally unique
    const allCodes = computeAllSku(parsed.data.sku, parsed.data.subSkus);
    const conflicts = await validateSkuUniqueness(allCodes);
    if (conflicts.length > 0) {
      res.status(409).json({
        message: conflicts.join('; '),
        duplicateField: 'sku',
      });
      return;
    }

    const created = await Product.create(parsed.data);
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
    res.status(500).json({ message: 'Failed to create product', error: error.message });
  }
};

/**
 * Validate product import rows. Rejects the whole import if any error exists.
 * POST /api/products/validate-import
 * body: { rows: any[] }
 */
export const validateImportProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const rows = (req.body?.rows as any[]) || [];
    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(400).json({ message: 'Invalid request: rows is required', errors: [] });
      return;
    }

    const errors: ImportRowError[] = [];

    // validate fields/types using zod
    const parsedRows = rows.map((row, rowIndex) => {
      const parsed = createProductSchema.safeParse(row);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          errors.push({
            rowIndex,
            sku: typeof row?.sku === 'string' ? row.sku : undefined,
            field: issue.path?.[0] ? String(issue.path[0]) : undefined,
            message: issue.message,
          });
        }
        return null;
      }
      return parsed.data;
    });

    // file-level duplicate sku check
    const skuToFirstIndex = new Map<string, number>();
    parsedRows.forEach((r, rowIndex) => {
      const sku = r?.sku;
      if (!sku) return;
      const key = String(sku).trim();
      if (!key) return;
      if (skuToFirstIndex.has(key)) {
        errors.push({
          rowIndex,
          sku: key,
          field: 'sku',
          message: `SKU「${key}」はファイル内で重複しています（先頭: ${skuToFirstIndex.get(key)})`,
        });
      } else {
        skuToFirstIndex.set(key, rowIndex);
      }
    });

    // db duplicate check (main SKU)
    const skus = Array.from(skuToFirstIndex.keys());
    if (skus.length) {
      const existing = await Product.find({ _allSku: { $in: skus } }, { sku: 1 }).lean();
      const existingSkus = new Set(existing.map((d: any) => String(d.sku)));
      if (existingSkus.size) {
        for (const [sku, rowIndex] of skuToFirstIndex.entries()) {
          if (existingSkus.has(sku)) {
            errors.push({
              rowIndex,
              sku,
              field: 'sku',
              message: `SKU「${sku}」は既に存在します`,
            });
          }
        }
      }
    }

    // sub-SKU conflict checks (file-level + DB-level)
    const validRowsWithIndex = parsedRows
      .map((r, rowIndex) => (r ? { ...r, _rowIndex: rowIndex } : null))
      .filter((r): r is NonNullable<typeof r> & { _rowIndex: number } => r !== null);
    const subSkuErrors = await validateImportSubSkuConflicts(validRowsWithIndex, skuToFirstIndex);
    errors.push(...subSkuErrors);

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
 * Bulk import products. Validates rows and rejects whole import if any error exists.
 * POST /api/products/import-bulk
 * body: { rows: any[] }
 */
export const importProductsBulk = async (req: Request, res: Response): Promise<void> => {
  try {
    const rows = (req.body?.rows as any[]) || [];
    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(400).json({ message: 'Invalid request: rows is required', errors: [] });
      return;
    }

    // reuse validation logic by calling validateImportProducts-like flow inline (no extra HTTP)
    const errors: ImportRowError[] = [];
    const parsedRows = rows.map((row, rowIndex) => {
      const parsed = createProductSchema.safeParse(row);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          errors.push({
            rowIndex,
            sku: typeof row?.sku === 'string' ? row.sku : undefined,
            field: issue.path?.[0] ? String(issue.path[0]) : undefined,
            message: issue.message,
          });
        }
        return null;
      }
      return parsed.data;
    });

    const skuToFirstIndex = new Map<string, number>();
    parsedRows.forEach((r, rowIndex) => {
      const sku = r?.sku;
      if (!sku) return;
      const key = String(sku).trim();
      if (!key) return;
      if (skuToFirstIndex.has(key)) {
        errors.push({
          rowIndex,
          sku: key,
          field: 'sku',
          message: `SKU「${key}」はファイル内で重複しています（先頭: ${skuToFirstIndex.get(key)})`,
        });
      } else {
        skuToFirstIndex.set(key, rowIndex);
      }
    });

    const skus = Array.from(skuToFirstIndex.keys());
    if (skus.length) {
      const existing = await Product.find({ _allSku: { $in: skus } }, { sku: 1 }).lean();
      const existingSkus = new Set(existing.map((d: any) => String(d.sku)));
      if (existingSkus.size) {
        for (const [sku, rowIndex] of skuToFirstIndex.entries()) {
          if (existingSkus.has(sku)) {
            errors.push({
              rowIndex,
              sku,
              field: 'sku',
              message: `SKU「${sku}」は既に存在します`,
            });
          }
        }
      }
    }

    // sub-SKU conflict checks (file-level + DB-level)
    const validRowsWithIndex = parsedRows
      .map((r, rowIndex) => (r ? { ...r, _rowIndex: rowIndex } : null))
      .filter((r): r is NonNullable<typeof r> & { _rowIndex: number } => r !== null);
    const subSkuErrors = await validateImportSubSkuConflicts(validRowsWithIndex, skuToFirstIndex);
    errors.push(...subSkuErrors);

    if (errors.length) {
      res.status(400).json({ message: 'Import validation failed', errors });
      return;
    }

    // Add _allSku to each doc (insertMany does not fire pre-save hooks)
    const docs = parsedRows.filter(Boolean).map((r: any) => ({
      ...r,
      _allSku: computeAllSku(r.sku, r.subSkus),
    }));
    const created = await Product.insertMany(docs, { ordered: true });
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
    res.status(500).json({ message: 'Failed to import products', error: error.message });
  }
};

/**
 * Import products with duplicate handling strategy.
 * POST /api/products/import-with-strategy
 * body: { rows: any[], strategy: 'error' | 'skip' | 'overwrite' }
 */
export const importProductsWithStrategy = async (req: Request, res: Response): Promise<void> => {
  try {
    const rows = (req.body?.rows as any[]) || [];
    const strategy = req.body?.strategy as 'error' | 'skip' | 'overwrite';

    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(400).json({ message: 'Invalid request: rows is required', errors: [] });
      return;
    }

    if (!['error', 'skip', 'overwrite'].includes(strategy)) {
      res.status(400).json({ message: 'Invalid request: strategy must be error, skip, or overwrite' });
      return;
    }

    const errors: ImportRowError[] = [];

    // 1. Validate all rows using Zod schema
    const parsedRows = rows.map((row, rowIndex) => {
      const parsed = createProductSchema.safeParse(row);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          errors.push({
            rowIndex,
            sku: typeof row?.sku === 'string' ? row.sku : undefined,
            field: issue.path?.[0] ? String(issue.path[0]) : undefined,
            message: issue.message,
          });
        }
        return null;
      }
      return { ...parsed.data, _rowIndex: rowIndex };
    });

    // If schema validation fails, always return errors
    if (errors.length > 0) {
      res.status(400).json({ message: 'Import validation failed', errors });
      return;
    }

    // 2. Check file-level duplicate SKUs (always reject)
    const skuToFirstIndex = new Map<string, number>();
    type ParsedRow = CreateProductInput & { _rowIndex: number };
    const validRows = parsedRows.filter((r): r is ParsedRow => r !== null);

    for (const row of validRows) {
      const sku = String(row.sku).trim();
      if (skuToFirstIndex.has(sku)) {
        errors.push({
          rowIndex: row._rowIndex,
          sku,
          field: 'sku',
          message: `SKU「${sku}」はファイル内で重複しています（先頭: 行${(skuToFirstIndex.get(sku) ?? 0) + 1}）`,
        });
      } else {
        skuToFirstIndex.set(sku, row._rowIndex);
      }
    }

    if (errors.length > 0) {
      res.status(400).json({ message: 'Import validation failed', errors });
      return;
    }

    // 3. Check sub-SKU conflicts (always reject, regardless of strategy)
    const subSkuErrors = await validateImportSubSkuConflicts(validRows, skuToFirstIndex);
    errors.push(...subSkuErrors);

    if (errors.length > 0) {
      res.status(400).json({ message: 'Import validation failed', errors });
      return;
    }

    // 4. Check database duplicate SKUs
    const skus = Array.from(skuToFirstIndex.keys());
    const existingProducts = await Product.find({ _allSku: { $in: skus } }, { sku: 1 }).lean();
    const existingSkuSet = new Set(existingProducts.map((p) => String(p.sku)));

    // 5. Handle based on strategy
    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const skippedSkus: string[] = [];

    if (strategy === 'error') {
      // Report all duplicates as errors
      for (const [sku, rowIndex] of skuToFirstIndex.entries()) {
        if (existingSkuSet.has(sku)) {
          errors.push({
            rowIndex,
            sku,
            field: 'sku',
            message: `SKU「${sku}」は既に存在します`,
          });
        }
      }

      if (errors.length > 0) {
        res.status(400).json({ message: 'Import validation failed', errors });
        return;
      }

      // Insert all (no duplicates)
      const docsToInsert = validRows.map(({ _rowIndex, ...rest }) => ({
        ...rest,
        _allSku: computeAllSku(rest.sku, rest.subSkus),
      }));
      const created = await Product.insertMany(docsToInsert, { ordered: true });
      insertedCount = created.length;
    } else if (strategy === 'skip') {
      // Filter out existing SKUs
      const rowsToInsert = validRows.filter((row) => {
        const sku = String(row.sku).trim();
        if (existingSkuSet.has(sku)) {
          skippedCount++;
          skippedSkus.push(sku);
          return false;
        }
        return true;
      });

      if (rowsToInsert.length > 0) {
        const docsToInsert = rowsToInsert.map(({ _rowIndex, ...rest }) => ({
          ...rest,
          _allSku: computeAllSku(rest.sku, rest.subSkus),
        }));
        const created = await Product.insertMany(docsToInsert, { ordered: true });
        insertedCount = created.length;
      }
    } else if (strategy === 'overwrite') {
      // Separate into update and insert
      const rowsToUpdate: typeof validRows = [];
      const rowsToInsert: typeof validRows = [];

      for (const row of validRows) {
        const sku = String(row.sku).trim();
        if (existingSkuSet.has(sku)) {
          rowsToUpdate.push(row);
        } else {
          rowsToInsert.push(row);
        }
      }

      // Perform updates (use save() for pre-save hook, or compute _allSku manually)
      for (const row of rowsToUpdate) {
        const { _rowIndex, ...data } = row;
        await Product.findOneAndUpdate(
          { sku: data.sku },
          { ...data, _allSku: computeAllSku(data.sku, data.subSkus) },
          { new: true, runValidators: true },
        );
        updatedCount++;
      }

      // Perform inserts
      if (rowsToInsert.length > 0) {
        const docsToInsert = rowsToInsert.map(({ _rowIndex, ...rest }) => ({
          ...rest,
          _allSku: computeAllSku(rest.sku, rest.subSkus),
        }));
        const created = await Product.insertMany(docsToInsert, { ordered: true });
        insertedCount = created.length;
      }
    }

    res.status(200).json({
      insertedCount,
      updatedCount,
      skippedCount,
      skippedSkus,
    });
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
    res.status(500).json({ message: 'Failed to import products', error: error.message });
  }
};

export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = updateProductSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: 'Validation failed',
        errors: parsed.error.flatten(),
      });
      return;
    }

    const existingProduct = await Product.findById(req.params.id);
    if (!existingProduct) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    // Validate all SKU codes (main + sub) are globally unique, excluding self
    const newSku = parsed.data.sku || existingProduct.sku;
    const newSubSkus = parsed.data.subSkus ?? existingProduct.subSkus;
    const allCodes = computeAllSku(newSku, newSubSkus as { subSku: string }[]);
    const conflicts = await validateSkuUniqueness(allCodes, req.params.id);
    if (conflicts.length > 0) {
      res.status(409).json({
        message: conflicts.join('; '),
        duplicateField: 'sku',
      });
      return;
    }

    // Use save() so pre-save hook computes _allSku
    Object.assign(existingProduct, parsed.data);
    await existingProduct.save();

    res.json(existingProduct.toObject());
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to update product', error: error.message });
  }
};

export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id).lean();
    if (!deleted) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }
    res.json({ message: 'Deleted', id: deleted._id });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to delete product', error: error.message });
  }
};

/**
 * Batch fetch products by SKU array (also searches sub-SKUs)
 * POST /api/products/batch
 * body: { skus: string[] }
 */
export const batchGetProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { skus } = req.body;
    if (!Array.isArray(skus) || skus.length === 0) {
      res.status(400).json({ message: 'Invalid request: skus array is required' });
      return;
    }

    // Filter out empty strings and normalize
    const validSkus = skus
      .filter((sku) => sku && typeof sku === 'string' && sku.trim())
      .map((sku) => sku.trim());

    if (validSkus.length === 0) {
      res.json([]);
      return;
    }

    // Find all products matching the SKUs (main SKU or sub-SKU) via _allSku index
    const products = await Product.find({ _allSku: { $in: validSkus } }).lean();

    res.json(products);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to batch fetch products', error: error.message });
  }
};

/**
 * Resolve a SKU or sub-SKU to its parent product.
 * Returns the product with an additional `matchedSubSku` field if matched via sub-SKU.
 * GET /api/products/resolve/:sku
 */
export const resolveSku = async (req: Request, res: Response): Promise<void> => {
  try {
    const skuCode = req.params.sku?.trim();
    if (!skuCode) {
      res.status(400).json({ message: 'SKU is required' });
      return;
    }

    // Find by _allSku index (covers both main SKU and sub-SKUs)
    const product = await Product.findOne({ _allSku: skuCode }).lean();
    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    if (product.sku === skuCode) {
      res.json({ ...product, matchedSubSku: null });
    } else {
      const matchedSubSku = product.subSkus?.find((s) => s.subSku === skuCode) || null;
      res.json({ ...product, matchedSubSku });
    }
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to resolve SKU', error: error.message });
  }
};

/**
 * Check SKU availability (for both main SKU and sub-SKUs).
 * Returns availability status for each SKU.
 * POST /api/products/check-sku-availability
 * body: { skus: string[], excludeProductId?: string }
 */
/**
 * Bulk update products by IDs.
 * PATCH /api/products/bulk
 * body: { ids: string[], updates: Record<string, any> }
 */
export const bulkUpdateProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids, updates } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ message: 'Invalid request: ids array is required' });
      return;
    }

    if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
      res.status(400).json({ message: 'Invalid request: updates object is required' });
      return;
    }

    // Protected fields that cannot be bulk-updated
    const protectedFields = ['_id', 'sku', 'createdAt', 'updatedAt', 'subSkus'];
    const attemptedProtectedFields = Object.keys(updates).filter((key) =>
      protectedFields.includes(key),
    );

    if (attemptedProtectedFields.length > 0) {
      res.status(400).json({
        message: `以下のフィールドは一括更新できません: ${attemptedProtectedFields.join(', ')}`,
        protectedFields: attemptedProtectedFields,
      });
      return;
    }

    // Validate IDs are valid ObjectIds
    const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      res.status(400).json({ message: 'No valid IDs provided' });
      return;
    }

    // Perform the bulk update
    const result = await Product.updateMany(
      { _id: { $in: validIds } },
      { $set: updates },
      { runValidators: true },
    );

    res.json({
      message: '一括更新が完了しました',
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to bulk update products', error: error.message });
  }
};

export const checkSkuAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    const { skus, excludeProductId } = req.body;

    if (!Array.isArray(skus) || skus.length === 0) {
      res.status(400).json({ message: 'Invalid request: skus array is required' });
      return;
    }

    // Normalize and filter SKUs
    const normalizedSkus = skus
      .filter((sku) => sku && typeof sku === 'string' && sku.trim())
      .map((sku) => sku.trim());

    if (normalizedSkus.length === 0) {
      res.json({ results: {} });
      return;
    }

    // Use _allSku index for efficient lookup
    const query: any = { _allSku: { $in: normalizedSkus } };
    if (excludeProductId) {
      query._id = { $ne: excludeProductId };
    }

    const existingProducts = await Product.find(query, { sku: 1, _allSku: 1, subSkus: 1 }).lean();

    // Build results map
    const results: Record<string, { available: boolean; conflictType?: string; conflictProductSku?: string }> = {};
    for (const sku of normalizedSkus) {
      results[sku] = { available: true };
    }

    for (const product of existingProducts) {
      for (const code of normalizedSkus) {
        if ((product._allSku || []).includes(code)) {
          results[code] = {
            available: false,
            conflictType: product.sku === code ? 'mainSku' : 'subSku',
            conflictProductSku: product.sku,
          };
        }
      }
    }

    res.json({ results });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to check SKU availability', error: error.message });
  }
};

/**
 * Upload and process a product image.
 * POST /api/products/upload-image
 * multipart/form-data with field "image"
 * Returns { imageUrl: string }
 */
export const uploadProductImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ message: '画像ファイルが必要です' });
      return;
    }

    const env = loadEnv();
    const outputDir = path.join(env.fileDir, 'products');
    fs.mkdirSync(outputDir, { recursive: true });

    const filename = `${randomUUID()}.webp`;
    const outputPath = path.join(outputDir, filename);

    // Re-encode to 400x400 WebP (cover crop center) - strips all metadata
    await sharp(file.buffer)
      .resize(400, 400, { fit: 'cover', position: 'centre' })
      .webp({ quality: 80 })
      .toFile(outputPath);

    const imageUrl = `/uploads/products/${filename}`;
    res.json({ imageUrl });
  } catch (error: any) {
    res.status(500).json({ message: '画像のアップロードに失敗しました', error: error.message });
  }
};

