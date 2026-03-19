/**
 * 佐川追跡番号解析テスト / 佐川追踪号解析测试
 */

import { describe, it, expect } from 'vitest';
import { parseSagawaTrackingCsv } from '../services/sagawaTrackingService';

describe('parseSagawaTrackingCsv', () => {
  it('should parse standard CSV / 標準 CSV を解析すること', () => {
    const csv = [
      'お客様管理番号,お問い合せ送り状No,品名',
      'SH-001,1234567890,テスト商品',
      'SH-002,2345678901,テスト商品2',
    ].join('\n');

    const result = parseSagawaTrackingCsv(csv);
    expect(result.size).toBe(2);
    expect(result.get('SH-001')).toBe('1234567890');
    expect(result.get('SH-002')).toBe('2345678901');
  });

  it('should return empty for no headers match / ヘッダーが一致しない場合空を返すこと', () => {
    const csv = '名前,住所\ntest,tokyo';
    expect(parseSagawaTrackingCsv(csv).size).toBe(0);
  });

  it('should return empty for single line / 1行のみの場合空を返すこと', () => {
    expect(parseSagawaTrackingCsv('header only').size).toBe(0);
  });

  it('should skip empty values / 空の値をスキップすること', () => {
    const csv = [
      'お客様管理番号,お問い合せ送り状No',
      'SH-001,1234567890',
      ',2345678901',
      'SH-003,',
    ].join('\n');

    const result = parseSagawaTrackingCsv(csv);
    expect(result.size).toBe(1);
  });
});
