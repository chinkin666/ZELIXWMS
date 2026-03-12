import type { Request, Response } from 'express';
import { EmailTemplate } from '@/models/emailTemplate';

/**
 * プレースホルダーを実データで置換する
 */
function renderTemplate(template: string, data: Record<string, string>): string {
  return Object.entries(data).reduce(
    (result, [key, value]) => result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value),
    template,
  );
}

export const listEmailTemplates = async (req: Request, res: Response): Promise<void> => {
  try {
    const { carrierId, isActive, page, limit } = req.query;

    const filter: Record<string, unknown> = {};

    if (typeof carrierId === 'string' && carrierId.trim()) {
      filter.carrierId = carrierId.trim();
    }

    if (typeof isActive === 'string') {
      if (isActive === 'true') filter.isActive = true;
      if (isActive === 'false') filter.isActive = false;
    }

    const pageNum = Math.max(1, parseInt(String(page || '1'), 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(String(limit || '50'), 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [data, total] = await Promise.all([
      EmailTemplate.find(filter).sort({ isDefault: -1, createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      EmailTemplate.countDocuments(filter),
    ]);

    res.json({ data, total });
  } catch (error: any) {
    res.status(500).json({ message: 'メールテンプレートの取得に失敗しました', error: error.message });
  }
};

export const getEmailTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const item = await EmailTemplate.findById(req.params.id).lean();
    if (!item) {
      res.status(404).json({ message: 'メールテンプレートが見つかりません' });
      return;
    }
    res.json(item);
  } catch (error: any) {
    res.status(500).json({ message: 'メールテンプレートの取得に失敗しました', error: error.message });
  }
};

export const createEmailTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name, carrierId, carrierName, isActive, senderName, senderEmail,
      replyToEmail, subject, bodyTemplate, footerText, isDefault,
    } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ message: 'テンプレート名は必須です' });
      return;
    }
    if (!senderName || typeof senderName !== 'string' || !senderName.trim()) {
      res.status(400).json({ message: '発送元名は必須です' });
      return;
    }
    if (!senderEmail || typeof senderEmail !== 'string' || !senderEmail.trim()) {
      res.status(400).json({ message: '送信元メールアドレスは必須です' });
      return;
    }
    if (!subject || typeof subject !== 'string' || !subject.trim()) {
      res.status(400).json({ message: 'メールタイトルは必須です' });
      return;
    }
    if (!bodyTemplate || typeof bodyTemplate !== 'string' || !bodyTemplate.trim()) {
      res.status(400).json({ message: 'メール本文テンプレートは必須です' });
      return;
    }

    // If setting as default, unset existing defaults for same carrier scope
    if (isDefault) {
      const defaultFilter: Record<string, unknown> = { isDefault: true };
      if (carrierId) {
        defaultFilter.carrierId = carrierId;
      } else {
        defaultFilter.carrierId = null;
      }
      await EmailTemplate.updateMany(defaultFilter, { isDefault: false });
    }

    const created = await EmailTemplate.create({
      name: name.trim(),
      carrierId: carrierId || null,
      carrierName: carrierName?.trim() || '',
      isActive: isActive !== undefined ? isActive : true,
      senderName: senderName.trim(),
      senderEmail: senderEmail.trim(),
      replyToEmail: replyToEmail?.trim() || '',
      subject: subject.trim(),
      bodyTemplate: bodyTemplate.trim(),
      footerText: footerText?.trim() || '',
      isDefault: isDefault || false,
    });

    res.status(201).json(created.toObject());
  } catch (error: any) {
    res.status(500).json({ message: 'メールテンプレートの作成に失敗しました', error: error.message });
  }
};

export const updateEmailTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const existing = await EmailTemplate.findById(req.params.id).lean();
    if (!existing) {
      res.status(404).json({ message: 'メールテンプレートが見つかりません' });
      return;
    }

    const {
      name, carrierId, carrierName, isActive, senderName, senderEmail,
      replyToEmail, subject, bodyTemplate, footerText, isDefault,
    } = req.body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (carrierId !== undefined) updateData.carrierId = carrierId || null;
    if (carrierName !== undefined) updateData.carrierName = carrierName.trim();
    if (isActive !== undefined) updateData.isActive = isActive;
    if (senderName !== undefined) updateData.senderName = senderName.trim();
    if (senderEmail !== undefined) updateData.senderEmail = senderEmail.trim();
    if (replyToEmail !== undefined) updateData.replyToEmail = replyToEmail.trim();
    if (subject !== undefined) updateData.subject = subject.trim();
    if (bodyTemplate !== undefined) updateData.bodyTemplate = bodyTemplate.trim();
    if (footerText !== undefined) updateData.footerText = footerText.trim();
    if (isDefault !== undefined) updateData.isDefault = isDefault;

    // If setting as default, unset existing defaults for same carrier scope
    if (isDefault) {
      const effectiveCarrierId = carrierId !== undefined ? (carrierId || null) : existing.carrierId;
      const defaultFilter: Record<string, unknown> = {
        isDefault: true,
        _id: { $ne: existing._id },
      };
      if (effectiveCarrierId) {
        defaultFilter.carrierId = effectiveCarrierId;
      } else {
        defaultFilter.carrierId = null;
      }
      await EmailTemplate.updateMany(defaultFilter, { isDefault: false });
    }

    const updated = await EmailTemplate.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updated) {
      res.status(404).json({ message: 'メールテンプレートが見つかりません' });
      return;
    }

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: 'メールテンプレートの更新に失敗しました', error: error.message });
  }
};

export const deleteEmailTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const deleted = await EmailTemplate.findByIdAndDelete(req.params.id).lean();

    if (!deleted) {
      res.status(404).json({ message: 'メールテンプレートが見つかりません' });
      return;
    }

    res.json({ message: 'Deleted', id: deleted._id });
  } catch (error: any) {
    res.status(500).json({ message: 'メールテンプレートの削除に失敗しました', error: error.message });
  }
};

export const previewEmailTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { templateId, sampleData } = req.body;

    if (!templateId) {
      res.status(400).json({ message: 'テンプレートIDは必須です' });
      return;
    }

    const template = await EmailTemplate.findById(templateId).lean();
    if (!template) {
      res.status(404).json({ message: 'メールテンプレートが見つかりません' });
      return;
    }

    const defaultSampleData: Record<string, string> = {
      customerName: '山田 太郎',
      orderNumber: 'ORD-2026-0001',
      trackingNumber: '1234-5678-9012',
      carrierName: template.carrierName || 'ヤマト運輸',
      itemList: '・商品A x 1\n・商品B x 2',
      shippingDate: '2026-03-13',
      senderName: template.senderName,
    };

    const mergedData = { ...defaultSampleData, ...(sampleData || {}) };

    const renderedSubject = renderTemplate(template.subject, mergedData);
    const renderedBody = renderTemplate(template.bodyTemplate, mergedData);
    const renderedFooter = template.footerText
      ? renderTemplate(template.footerText, mergedData)
      : '';

    const html = [
      `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">`,
      `<h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 8px;">${escapeHtml(renderedSubject)}</h2>`,
      `<div style="white-space: pre-wrap; line-height: 1.8; color: #444;">${escapeHtml(renderedBody)}</div>`,
      renderedFooter
        ? `<hr style="margin: 24px 0; border: none; border-top: 1px solid #ddd;" /><div style="white-space: pre-wrap; color: #888; font-size: 0.85em;">${escapeHtml(renderedFooter)}</div>`
        : '',
      `</div>`,
    ].join('\n');

    res.json({
      subject: renderedSubject,
      body: renderedBody,
      footer: renderedFooter,
      html,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'プレビューの生成に失敗しました', error: error.message });
  }
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
