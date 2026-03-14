import { logger } from '@/lib/logger';
import {
  PrintTemplate,
  type CreatePrintTemplateDto,
  type PrintTemplateDocument,
  type UpdatePrintTemplateDto,
} from '@/models/printTemplate';

const getTenantId = (): string => {
  return 'default-tenant';
};

const toDocument = (doc: any, includeSampleData = false): PrintTemplateDocument => {
  const result: PrintTemplateDocument = {
    id: doc._id.toString(),
    tenantId: doc.tenantId,
    schemaVersion: doc.schemaVersion ?? 1,
    name: doc.name,
    canvas: doc.canvas,
    elements: Array.isArray(doc.elements) ? doc.elements : [],
    bindings: doc.bindings,
    meta: doc.meta,
    requiresYamatoSortCode: doc.requiresYamatoSortCode ?? false,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
  if (includeSampleData) {
    if (doc.sampleData) {
      result.sampleData = Array.isArray(doc.sampleData) ? doc.sampleData : [];
    }
    if (doc.referenceImageData) {
      result.referenceImageData = doc.referenceImageData;
    }
  }
  return result;
};

export const createPrintTemplate = async (dto: CreatePrintTemplateDto): Promise<PrintTemplateDocument> => {
  const tenantId = getTenantId();
  const created = await PrintTemplate.create({
    tenantId,
    schemaVersion: dto.schemaVersion ?? 1,
    name: dto.name,
    canvas: dto.canvas,
    elements: dto.elements,
    bindings: dto.bindings,
    meta: dto.meta,
    sampleData: dto.sampleData,
    requiresYamatoSortCode: dto.requiresYamatoSortCode ?? false,
    referenceImageData: dto.referenceImageData,
  });
  const doc = toDocument(created);
  logger.info({ id: doc.id, name: doc.name }, 'Print template created');
  return doc;
};

export const listPrintTemplates = async (filters?: {
  name?: string;
}): Promise<PrintTemplateDocument[]> => {
  const tenantId = getTenantId();
  const q: any = { tenantId };
  if (filters?.name) q.name = { $regex: String(filters.name).trim(), $options: 'i' };
  const items = await PrintTemplate.find(q).sort({ createdAt: -1 }).limit(200);
  return items.map((doc) => toDocument(doc, false));
};

export const getPrintTemplateById = async (id: string, includeSampleData = false): Promise<PrintTemplateDocument | null> => {
  const tenantId = getTenantId();
  const item = await PrintTemplate.findOne({ _id: id, tenantId });
  return item ? toDocument(item, includeSampleData) : null;
};

export const updatePrintTemplate = async (
  id: string,
  dto: UpdatePrintTemplateDto,
): Promise<PrintTemplateDocument | null> => {
  const tenantId = getTenantId();
  // Separate sampleData and referenceImageData handling: if explicitly set to null/undefined, unset it
  const { sampleData, referenceImageData, ...restDto } = dto;
  const updateOp: any = { $set: restDto };
  if (!updateOp.$unset) {
    updateOp.$unset = {};
  }
  if (sampleData === null || sampleData === undefined) {
    updateOp.$unset.sampleData = '';
  } else if (sampleData !== undefined) {
    updateOp.$set.sampleData = sampleData;
  }
  if (referenceImageData === null || referenceImageData === undefined) {
    updateOp.$unset.referenceImageData = '';
  } else if (referenceImageData !== undefined) {
    updateOp.$set.referenceImageData = referenceImageData;
  }
  // Remove $unset if empty
  if (Object.keys(updateOp.$unset).length === 0) {
    delete updateOp.$unset;
  }
  const updated = await PrintTemplate.findOneAndUpdate(
    { _id: id, tenantId },
    updateOp,
    { new: true },
  );
  if (!updated) return null;
  logger.info({ id }, 'Print template updated');
  return toDocument(updated);
};

export const deletePrintTemplate = async (id: string): Promise<boolean> => {
  const tenantId = getTenantId();
  const res = await PrintTemplate.deleteOne({ _id: id, tenantId });
  return (res as any)?.deletedCount > 0;
};


