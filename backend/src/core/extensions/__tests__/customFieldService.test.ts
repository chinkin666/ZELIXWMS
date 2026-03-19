/**
 * CustomFieldService 单元测试 / CustomFieldService ユニットテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock CustomFieldDefinition model
const mockFind = vi.fn();
const mockCreate = vi.fn();
const mockFindByIdAndUpdate = vi.fn();
const mockFindByIdAndDelete = vi.fn();

vi.mock('@/models/customFieldDefinition', () => ({
  CustomFieldDefinition: {
    find: (...args: any[]) => ({ sort: () => ({ lean: () => mockFind(...args) }) }),
    create: (...args: any[]) => mockCreate(...args),
    findByIdAndUpdate: (...args: any[]) => ({ lean: () => mockFindByIdAndUpdate(...args) }),
    findByIdAndDelete: (...args: any[]) => mockFindByIdAndDelete(...args),
  },
  // 需要导出的类型（空实现）/ エクスポートが必要な型（空実装）
}));

import { CustomFieldService } from '../customFieldService';

describe('CustomFieldService', () => {
  let service: CustomFieldService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CustomFieldService();
  });

  describe('createDefinition / フィールド定義作成', () => {
    it('should reject invalid fieldKey format / 無効な fieldKey フォーマットを拒否すること', async () => {
      await expect(service.createDefinition({
        fieldKey: '123-invalid',
        entityType: 'order' as any,
        fieldType: 'text' as any,
        label: 'Test',
      } as any)).rejects.toThrow();
    });

    it('should reject select type without options / options なしの select タイプを拒否すること', async () => {
      await expect(service.createDefinition({
        fieldKey: 'testField',
        entityType: 'order' as any,
        fieldType: 'select' as any,
        label: 'Test',
        options: [],
      } as any)).rejects.toThrow('options');
    });

    it('should accept valid fieldKey / 有効な fieldKey を受け付けること', async () => {
      mockCreate.mockResolvedValue({ toObject: () => ({ fieldKey: 'myField', label: 'My Field' }) });

      const result = await service.createDefinition({
        fieldKey: 'myField',
        entityType: 'order' as any,
        fieldType: 'text' as any,
        label: 'My Field',
      } as any);

      expect(result.fieldKey).toBe('myField');
    });

    it('should accept fieldKey starting with underscore / アンダースコア始まりの fieldKey を受け付けること', async () => {
      mockCreate.mockResolvedValue({ toObject: () => ({ fieldKey: '_internal', label: 'Internal' }) });

      const result = await service.createDefinition({
        fieldKey: '_internal',
        entityType: 'order' as any,
        fieldType: 'text' as any,
        label: 'Internal',
      } as any);

      expect(result.fieldKey).toBe('_internal');
    });
  });

  describe('validateValues / 値バリデーション', () => {
    it('should validate required fields / 必須フィールドをバリデーションすること', async () => {
      mockFind.mockResolvedValue([
        { fieldKey: 'requiredField', fieldType: 'text', required: true, label: '必須項目' },
      ]);

      const result = await service.validateValues('order' as any, {});
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('必須');
    });

    it('should pass when required field provided / 必須フィールドが提供されていればパスすること', async () => {
      mockFind.mockResolvedValue([
        { fieldKey: 'name', fieldType: 'text', required: true, label: '名前' },
      ]);

      const result = await service.validateValues('order' as any, { name: 'テスト' });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate field types / フィールドタイプをバリデーションすること', async () => {
      mockFind.mockResolvedValue([
        { fieldKey: 'count', fieldType: 'number', required: false, label: '数量' },
      ]);

      const result = await service.validateValues('order' as any, { count: 'not-a-number' });
      expect(result.valid).toBe(false);
    });

    it('should validate select options / select オプションをバリデーションすること', async () => {
      mockFind.mockResolvedValue([
        { fieldKey: 'priority', fieldType: 'select', required: false, label: '優先度', options: ['high', 'low'] },
      ]);

      const invalid = await service.validateValues('order' as any, { priority: 'invalid' });
      expect(invalid.valid).toBe(false);

      const valid = await service.validateValues('order' as any, { priority: 'high' });
      expect(valid.valid).toBe(true);
    });

    it('should skip optional null fields / オプションの null フィールドをスキップすること', async () => {
      mockFind.mockResolvedValue([
        { fieldKey: 'notes', fieldType: 'text', required: false, label: 'メモ' },
      ]);

      const result = await service.validateValues('order' as any, { notes: null });
      expect(result.valid).toBe(true);
    });
  });

  describe('getDefaultValues / デフォルト値取得', () => {
    it('should return defaults / デフォルト値を返すこと', async () => {
      mockFind.mockResolvedValue([
        { fieldKey: 'priority', defaultValue: 'normal' },
        { fieldKey: 'notes', defaultValue: null },
        { fieldKey: 'count', defaultValue: 0 },
      ]);

      const defaults = await service.getDefaultValues('order' as any);
      expect(defaults).toEqual({ priority: 'normal', count: 0 });
    });
  });
});
