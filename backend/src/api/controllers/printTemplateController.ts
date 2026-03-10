import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import type { CreatePrintTemplateDto, UpdatePrintTemplateDto } from '@/models/printTemplate';
import {
  createPrintTemplate,
  deletePrintTemplate,
  getPrintTemplateById,
  listPrintTemplates,
  updatePrintTemplate,
} from '@/services/printTemplateService';
import { logger } from '@/lib/logger';

export const createTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const dto = req.body as CreatePrintTemplateDto;
    if (!dto?.name || !dto?.canvas || !Array.isArray(dto?.elements)) {
      res.status(400).json({ message: 'Invalid request: name, canvas, elements are required' });
      return;
    }
    const created = await createPrintTemplate(dto);
    res.status(201).json(created);
  } catch (e: any) {
    logger.error(e, 'Failed to create print template');
    res.status(500).json({ message: 'Failed to create print template' });
  }
};

export const listTemplates = async (req: Request, res: Response): Promise<void> => {
  try {
    const items = await listPrintTemplates({
      name: typeof req.query.name === 'string' ? req.query.name : undefined,
    });
    res.json(items);
  } catch (e: any) {
    logger.error(e, 'Failed to list print templates');
    res.status(500).json({ message: 'Failed to list print templates' });
  }
};

export const getTemplateById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params?.id;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid id' });
      return;
    }
    // Only include sampleData if includeSampleData query parameter is 'true'
    const includeSampleData = req.query.includeSampleData === 'true';
    const item = await getPrintTemplateById(id, includeSampleData);
    if (!item) {
      res.status(404).json({ message: 'Print template not found' });
      return;
    }
    res.json(item);
  } catch (e: any) {
    logger.error(e, 'Failed to get print template');
    res.status(500).json({ message: 'Failed to get print template' });
  }
};

export const updateTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params?.id;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid id' });
      return;
    }
    const dto = req.body as UpdatePrintTemplateDto;
    const updated = await updatePrintTemplate(id, dto);
    if (!updated) {
      res.status(404).json({ message: 'Print template not found' });
      return;
    }
    res.json(updated);
  } catch (e: any) {
    logger.error(e, 'Failed to update print template');
    res.status(500).json({ message: 'Failed to update print template' });
  }
};

export const deleteTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params?.id;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid id' });
      return;
    }
    const ok = await deletePrintTemplate(id);
    if (!ok) {
      res.status(404).json({ message: 'Print template not found' });
      return;
    }
    res.status(204).send();
  } catch (e: any) {
    logger.error(e, 'Failed to delete print template');
    res.status(500).json({ message: 'Failed to delete print template' });
  }
};





