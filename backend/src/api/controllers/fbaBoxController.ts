import type { Request, Response } from 'express';
import { FbaBox, validateFbaBox } from '@/models/fbaBox';

function generateBoxNumber(index: number): string {
  return `BOX-${String(index).padStart(4, '0')}`;
}

export const listBoxes = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const { inboundOrderId } = req.query;
    const filter: Record<string, unknown> = { tenantId };
    if (inboundOrderId) filter.inboundOrderId = inboundOrderId;

    const data = await FbaBox.find(filter).sort({ boxNumber: 1 }).lean();
    res.json({ data, total: data.length });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createBox = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const count = await FbaBox.countDocuments({ tenantId, inboundOrderId: req.body.inboundOrderId });
    const box = await FbaBox.create({
      ...req.body,
      tenantId,
      boxNumber: req.body.boxNumber || generateBoxNumber(count + 1),
      status: 'packing',
      boxLabelPrinted: false,
      shippingLabelPrinted: false,
    });
    res.status(201).json(box.toObject());
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateBox = async (req: Request, res: Response): Promise<void> => {
  try {
    const updated = await FbaBox.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).lean();
    if (!updated) { res.status(404).json({ message: 'Not found' }); return; }
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteBox = async (req: Request, res: Response): Promise<void> => {
  try {
    const deleted = await FbaBox.findByIdAndDelete(req.params.id);
    if (!deleted) { res.status(404).json({ message: 'Not found' }); return; }
    res.json({ message: 'Deleted' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const sealBox = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sealedBy, photoUrl } = req.body;
    const updated = await FbaBox.findByIdAndUpdate(
      req.params.id,
      { status: 'sealed', sealedAt: new Date(), sealedBy, photoUrl },
      { new: true },
    ).lean();
    if (!updated) { res.status(404).json({ message: 'Not found' }); return; }
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// 箱規格検証 / 箱规校验
export const validateBoxes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { inboundOrderId } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const boxes = await FbaBox.find({ tenantId, inboundOrderId }).lean();

    const results = boxes.map((box) => {
      const validation = validateFbaBox(box);
      return { boxNumber: box.boxNumber, ...validation };
    });

    const allValid = results.every((r) => r.valid);
    res.json({ allValid, results, totalBoxes: boxes.length });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
