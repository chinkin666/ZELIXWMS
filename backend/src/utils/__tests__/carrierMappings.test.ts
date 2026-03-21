/**
 * carrierMappings 单元测试 / carrierMappings ユニットテスト
 *
 * 运输商映射配置测试 / キャリアマッピング設定テスト
 */

import { describe, it, expect } from 'vitest';
import { carrierMappings, type CarrierMapping } from '../carrierMappings';

describe('carrierMappings / キャリアマッピング設定', () => {
  // 全3社のマッピングが存在する / 全3社的映射都存在
  it('should contain all 3 carrier mappings / 3社のマッピングを含む', () => {
    expect(carrierMappings).toHaveLength(3);
    const carriers = carrierMappings.map((m) => m.carrier);
    expect(carriers).toContain('sagawa_efiden3');
    expect(carriers).toContain('yamato_b2');
    expect(carriers).toContain('seino_km2');
  });

  // 各マッピングにexport/importフィールドがある / 各映射有export/import字段
  it('should have exportFields and importFields for every carrier / 全キャリアにexport/importフィールドがある', () => {
    for (const mapping of carrierMappings) {
      expect(mapping.exportFields.length).toBeGreaterThan(0);
      expect(mapping.importFields.length).toBeGreaterThan(0);
    }
  });

  // 全importFieldsにtrackingNoまたはdelivery関連がある / 全import字段包含trackingNo或delivery
  it('should have trackingNo in importFields for each carrier / 各キャリアのimportFieldsにtrackingNoがある', () => {
    for (const mapping of carrierMappings) {
      const hasTracking = mapping.importFields.some((f) => f.field === 'trackingNo');
      expect(hasTracking).toBe(true);
    }
  });

  // 全フィールドに必須プロパティがある / 全字段有必需属性
  it('should have required properties on all fields / 全フィールドに必須プロパティがある', () => {
    for (const mapping of carrierMappings) {
      const allFields = [...mapping.exportFields, ...mapping.importFields];
      for (const field of allFields) {
        expect(field).toHaveProperty('field');
        expect(field).toHaveProperty('specNo');
        expect(field).toHaveProperty('required');
        expect(field).toHaveProperty('description');
        expect(typeof field.field).toBe('string');
        expect(typeof field.specNo).toBe('number');
        expect(typeof field.required).toBe('boolean');
        expect(typeof field.description).toBe('string');
      }
    }
  });

  // specNo は各キャリアのexportFields/importFields内でユニーク / specNo在各carrier的字段内唯一
  it('should have unique specNo within each field group / 各フィールドグループ内でspecNoがユニーク', () => {
    for (const mapping of carrierMappings) {
      const exportSpecNos = mapping.exportFields.map((f) => f.specNo);
      const importSpecNos = mapping.importFields.map((f) => f.specNo);
      // exportFields内の重複チェック / export字段内重复检查
      expect(new Set(exportSpecNos).size).toBe(exportSpecNos.length);
      // importFields内の重複チェック / import字段内重复检查
      expect(new Set(importSpecNos).size).toBe(importSpecNos.length);
    }
  });
});
