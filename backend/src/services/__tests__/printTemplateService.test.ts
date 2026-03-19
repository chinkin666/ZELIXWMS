/**
 * printTemplateService 单元测试 / printTemplateService ユニットテスト
 *
 * 送り状テンプレートのCRUD操作テスト
 * 发货单模板的CRUD操作测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';

const oid = () => new mongoose.Types.ObjectId();
const now = new Date();

vi.mock('@/models/printTemplate', () => ({
  PrintTemplate: {
    create: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    deleteOne: vi.fn(),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { PrintTemplate } from '@/models/printTemplate';

const mockDoc = (overrides: any = {}) => ({
  _id: overrides._id || oid(),
  tenantId: 'default-tenant',
  schemaVersion: 1,
  name: overrides.name || 'ヤマト送り状',
  canvas: overrides.canvas || { widthMm: 100, heightMm: 150, pxPerMm: 4 },
  elements: overrides.elements || [],
  bindings: overrides.bindings || {},
  meta: overrides.meta || {},
  sampleData: overrides.sampleData,
  referenceImageData: overrides.referenceImageData,
  requiresYamatoSortCode: overrides.requiresYamatoSortCode ?? false,
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

describe('printTemplateService / 印刷テンプレートサービス', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('createPrintTemplate / テンプレート作成', () => {
    it('テンプレートを作成してドキュメントを返すこと / 创建模板并返回文档', async () => {
      const doc = mockDoc({ name: '佐川送り状' });
      vi.mocked(PrintTemplate.create).mockResolvedValue(doc as any);

      const { createPrintTemplate } = await import('../printTemplateService');
      const result = await createPrintTemplate({
        name: '佐川送り状',
        canvas: { widthMm: 100, heightMm: 150, pxPerMm: 4 },
        elements: [],
      });

      expect(result.name).toBe('佐川送り状');
      expect(result.id).toBe(String(doc._id));
      expect(result.createdAt).toBeDefined();
      expect(PrintTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'default-tenant', name: '佐川送り状' }),
      );
    });

    it('schemaVersionデフォルトは1 / 默认schemaVersion为1', async () => {
      const doc = mockDoc();
      vi.mocked(PrintTemplate.create).mockResolvedValue(doc as any);

      const { createPrintTemplate } = await import('../printTemplateService');
      await createPrintTemplate({ name: 'test', canvas: { widthMm: 100, heightMm: 150, pxPerMm: 4 }, elements: [] });

      expect(PrintTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({ schemaVersion: 1 }),
      );
    });

    it('requiresYamatoSortCode=trueを設定できること / 可设置仕分けコード必要', async () => {
      const doc = mockDoc({ requiresYamatoSortCode: true });
      vi.mocked(PrintTemplate.create).mockResolvedValue(doc as any);

      const { createPrintTemplate } = await import('../printTemplateService');
      const result = await createPrintTemplate({
        name: 'ヤマト送り状',
        canvas: { widthMm: 100, heightMm: 150, pxPerMm: 4 },
        elements: [],
        requiresYamatoSortCode: true,
      });

      expect(result.requiresYamatoSortCode).toBe(true);
    });
  });

  describe('listPrintTemplates / テンプレート一覧', () => {
    it('テンプレートリストを返すこと / 返回模板列表', async () => {
      const docs = [mockDoc({ name: 'A' }), mockDoc({ name: 'B' })];
      vi.mocked(PrintTemplate.find).mockReturnValue({
        sort: () => ({ limit: () => Promise.resolve(docs) }),
      } as any);

      const { listPrintTemplates } = await import('../printTemplateService');
      const result = await listPrintTemplates();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('A');
    });

    it('名前でフィルタできること / 可按名称过滤', async () => {
      vi.mocked(PrintTemplate.find).mockReturnValue({
        sort: () => ({ limit: () => Promise.resolve([]) }),
      } as any);

      const { listPrintTemplates } = await import('../printTemplateService');
      await listPrintTemplates({ name: 'ヤマト' });

      expect(PrintTemplate.find).toHaveBeenCalledWith(
        expect.objectContaining({ name: expect.objectContaining({ $regex: 'ヤマト' }) }),
      );
    });
  });

  describe('getPrintTemplateById / テンプレート取得', () => {
    it('IDでテンプレートを取得すること / 按ID获取模板', async () => {
      const doc = mockDoc();
      vi.mocked(PrintTemplate.findOne).mockResolvedValue(doc as any);

      const { getPrintTemplateById } = await import('../printTemplateService');
      const result = await getPrintTemplateById(String(doc._id));

      expect(result).not.toBeNull();
      expect(result!.name).toBe('ヤマト送り状');
    });

    it('存在しないIDはnullを返す / 不存在的ID返回null', async () => {
      vi.mocked(PrintTemplate.findOne).mockResolvedValue(null);

      const { getPrintTemplateById } = await import('../printTemplateService');
      const result = await getPrintTemplateById('nonexistent');

      expect(result).toBeNull();
    });

    it('includeSampleData=trueでサンプルデータを含めること / includeSampleData=true时包含样本数据', async () => {
      const doc = mockDoc({
        sampleData: [{ orderNumber: 'SH-001' }],
        referenceImageData: 'base64...',
      });
      vi.mocked(PrintTemplate.findOne).mockResolvedValue(doc as any);

      const { getPrintTemplateById } = await import('../printTemplateService');
      const result = await getPrintTemplateById(String(doc._id), true);

      expect(result!.sampleData).toHaveLength(1);
      expect(result!.referenceImageData).toBe('base64...');
    });
  });

  describe('updatePrintTemplate / テンプレート更新', () => {
    it('テンプレートを更新すること / 更新模板', async () => {
      const doc = mockDoc({ name: '更新後' });
      vi.mocked(PrintTemplate.findOneAndUpdate).mockResolvedValue(doc as any);

      const { updatePrintTemplate } = await import('../printTemplateService');
      const result = await updatePrintTemplate(String(doc._id), { name: '更新後' });

      expect(result).not.toBeNull();
      expect(result!.name).toBe('更新後');
    });

    it('存在しないテンプレートはnull / 不存在的模板返回null', async () => {
      vi.mocked(PrintTemplate.findOneAndUpdate).mockResolvedValue(null);

      const { updatePrintTemplate } = await import('../printTemplateService');
      const result = await updatePrintTemplate('xxx', { name: 'test' });

      expect(result).toBeNull();
    });

    it('sampleData=nullで$unsetすること / sampleData=null时执行$unset', async () => {
      const doc = mockDoc();
      vi.mocked(PrintTemplate.findOneAndUpdate).mockResolvedValue(doc as any);

      const { updatePrintTemplate } = await import('../printTemplateService');
      await updatePrintTemplate(String(doc._id), { name: 'x', sampleData: null as any });

      const updateArg = vi.mocked(PrintTemplate.findOneAndUpdate).mock.calls[0][1] as any;
      expect(updateArg.$unset).toHaveProperty('sampleData');
    });
  });

  describe('deletePrintTemplate / テンプレート削除', () => {
    it('テンプレートを削除してtrueを返す / 删除模板返回true', async () => {
      vi.mocked(PrintTemplate.deleteOne).mockResolvedValue({ deletedCount: 1 } as any);

      const { deletePrintTemplate } = await import('../printTemplateService');
      const result = await deletePrintTemplate('id-1');

      expect(result).toBe(true);
    });

    it('存在しないテンプレートはfalse / 不存在的模板返回false', async () => {
      vi.mocked(PrintTemplate.deleteOne).mockResolvedValue({ deletedCount: 0 } as any);

      const { deletePrintTemplate } = await import('../printTemplateService');
      const result = await deletePrintTemplate('xxx');

      expect(result).toBe(false);
    });
  });
});
