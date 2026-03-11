import type { Request, Response, NextFunction } from 'express';
import {
  FormTemplate,
  type CreateFormTemplateDto,
  type UpdateFormTemplateDto,
  type FormTemplateDocument,
} from '@/models/formTemplate';

const DEFAULT_TENANT_ID = 'default';

function toDoc(raw: any): FormTemplateDocument {
  return {
    _id: String(raw._id),
    tenantId: raw.tenantId,
    name: raw.name,
    targetType: raw.targetType,
    columns: raw.columns || [],
    styles: raw.styles || {},
    pageSize: raw.pageSize || 'A4',
    pageOrientation: raw.pageOrientation || 'landscape',
    pageMargins: raw.pageMargins || [40, 40, 40, 40],
    headerFooterItems: raw.headerFooterItems || [],
    isDefault: raw.isDefault || false,
    createdAt: raw.createdAt?.toISOString?.() || raw.createdAt,
    updatedAt: raw.updatedAt?.toISOString?.() || raw.updatedAt,
  };
}

/**
 * GET /api/form-templates
 * すべての帳票テンプレートを取得
 */
export async function listFormTemplates(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = (req.query.tenantId as string) || DEFAULT_TENANT_ID;
    const targetType = req.query.targetType as string | undefined;

    const query: any = { tenantId };
    if (targetType) {
      query.targetType = targetType;
    }

    const docs = await FormTemplate.find(query).sort({ targetType: 1, isDefault: -1, name: 1 }).lean();
    res.json(docs.map(toDoc));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/form-templates/:id
 * 帳票テンプレートを取得
 */
export async function getFormTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const doc = await FormTemplate.findById(id).lean();
    if (!doc) {
      return res.status(404).json({ message: 'Form template not found' });
    }
    res.json(toDoc(doc));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/form-templates
 * 帳票テンプレートを作成
 */
export async function createFormTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = (req.body.tenantId as string) || DEFAULT_TENANT_ID;
    const dto: CreateFormTemplateDto = req.body;

    // デフォルト設定の場合、他のデフォルトを解除
    if (dto.isDefault) {
      await FormTemplate.updateMany(
        { tenantId, targetType: dto.targetType, isDefault: true },
        { $set: { isDefault: false } },
      );
    }

    const doc = await FormTemplate.create({
      tenantId,
      ...dto,
    });

    res.status(201).json(toDoc(doc.toObject()));
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/form-templates/:id
 * 帳票テンプレートを更新
 */
export async function updateFormTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const dto: UpdateFormTemplateDto = req.body;

    const existing = await FormTemplate.findById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Form template not found' });
    }

    // デフォルト設定の場合、他のデフォルトを解除
    if (dto.isDefault) {
      await FormTemplate.updateMany(
        { tenantId: existing.tenantId, targetType: dto.targetType || existing.targetType, isDefault: true, _id: { $ne: id } },
        { $set: { isDefault: false } },
      );
    }

    const updated = await FormTemplate.findByIdAndUpdate(id, { $set: dto }, { new: true }).lean();
    if (!updated) {
      return res.status(404).json({ message: 'Form template not found' });
    }

    res.json(toDoc(updated));
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/form-templates/:id
 * 帳票テンプレートを削除
 */
export async function deleteFormTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await FormTemplate.findByIdAndDelete(id);
    if (!result) {
      return res.status(404).json({ message: 'Form template not found' });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
