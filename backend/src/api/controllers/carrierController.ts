import type { Request, Response } from 'express';
import { Carrier } from '@/models/carrier';
import { createCarrierSchema, updateCarrierSchema } from '@/schemas/carrierSchema';
import { BUILT_IN_CARRIERS, isBuiltInCarrierId, getBuiltInCarrier } from '@/data/builtInCarriers';

export const listCarriers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, name, enabled } = req.query;

    const filter: Record<string, unknown> = {};
    if (typeof code === 'string' && code.trim()) {
      filter.code = { $regex: code.trim(), $options: 'i' };
    }
    if (typeof name === 'string' && name.trim()) {
      filter.name = { $regex: name.trim(), $options: 'i' };
    }
    if (typeof enabled === 'string') {
      if (enabled === 'true') filter.enabled = true;
      if (enabled === 'false') filter.enabled = false;
    }

    // Get DB carriers
    const dbCarriers = await Carrier.find(filter).sort({ createdAt: -1 }).lean();

    // Filter built-in carriers based on query params
    let filteredBuiltIn = [...BUILT_IN_CARRIERS];
    if (typeof code === 'string' && code.trim()) {
      const codePattern = code.trim().toLowerCase();
      filteredBuiltIn = filteredBuiltIn.filter((c) => c.code.toLowerCase().includes(codePattern));
    }
    if (typeof name === 'string' && name.trim()) {
      const namePattern = name.trim().toLowerCase();
      filteredBuiltIn = filteredBuiltIn.filter((c) => c.name.toLowerCase().includes(namePattern));
    }
    if (typeof enabled === 'string') {
      if (enabled === 'true') filteredBuiltIn = filteredBuiltIn.filter((c) => c.enabled === true);
      if (enabled === 'false') filteredBuiltIn = filteredBuiltIn.filter((c) => c.enabled === false);
    }

    // Built-in carriers first, then DB carriers
    const items = [...filteredBuiltIn, ...dbCarriers];
    res.json(items);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch carriers', error: error.message });
  }
};

export const getCarrier = async (req: Request, res: Response): Promise<void> => {
  try {
    const carrierId = req.params.id;

    // Check if it's a built-in carrier
    if (isBuiltInCarrierId(carrierId)) {
      const builtInCarrier = getBuiltInCarrier(carrierId);
      if (builtInCarrier) {
        res.json(builtInCarrier);
        return;
      }
      res.status(404).json({ message: 'Carrier not found' });
      return;
    }

    // Otherwise, fetch from database
    const item = await Carrier.findById(carrierId).lean();
    if (!item) {
      res.status(404).json({ message: 'Carrier not found' });
      return;
    }
    res.json(item);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch carrier', error: error.message });
  }
};

export const createCarrier = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = createCarrierSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: 'Validation failed',
        errors: parsed.error.flatten(),
      });
      return;
    }

    const created = await Carrier.create(parsed.data);
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
    res.status(500).json({ message: 'Failed to create carrier', error: error.message });
  }
};

export const updateCarrier = async (req: Request, res: Response): Promise<void> => {
  try {
    const carrierId = req.params.id;

    // Prevent updating built-in carriers
    if (isBuiltInCarrierId(carrierId)) {
      res.status(403).json({ message: '内蔵配送業者は編集できません' });
      return;
    }

    const existing = await Carrier.findById(carrierId).lean();
    if (!existing) {
      res.status(404).json({ message: 'Carrier not found' });
      return;
    }

    const parsed = updateCarrierSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: 'Validation failed',
        errors: parsed.error.flatten(),
      });
      return;
    }

    const updated = await Carrier.findByIdAndUpdate(req.params.id, parsed.data, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updated) {
      res.status(404).json({ message: 'Carrier not found' });
      return;
    }

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to update carrier', error: error.message });
  }
};

export const deleteCarrier = async (req: Request, res: Response): Promise<void> => {
  try {
    const carrierId = req.params.id;

    // Prevent deleting built-in carriers
    if (isBuiltInCarrierId(carrierId)) {
      res.status(403).json({ message: '内蔵配送業者は削除できません' });
      return;
    }

    const deleted = await Carrier.findByIdAndDelete(carrierId).lean();
    if (!deleted) {
      res.status(404).json({ message: 'Carrier not found' });
      return;
    }
    res.json({ message: 'Deleted', id: deleted._id });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to delete carrier', error: error.message });
  }
};



