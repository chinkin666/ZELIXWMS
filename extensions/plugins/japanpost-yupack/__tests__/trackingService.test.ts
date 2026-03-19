/**
 * ゆうパック追跡番号解析テスト / Yu-Pack 追踪号解析测试
 */

import { describe, it, expect } from 'vitest';
import { parseYupackTrackingCsv, isValidYupackTracking } from '../services/yupackTrackingService';

describe('isValidYupackTracking', () => {
  it('should accept 12-digit tracking numbers / 12桁の追跡番号を受け付けること', () => {
    expect(isValidYupackTracking('123456789012')).toBe(true);
  });

  it('should accept 11-digit tracking numbers / 11桁の追跡番号を受け付けること', () => {
    expect(isValidYupackTracking('12345678901')).toBe(true);
  });

  it('should accept 13-digit tracking numbers / 13桁の追跡番号を受け付けること', () => {
    expect(isValidYupackTracking('1234567890123')).toBe(true);
  });

  it('should reject short numbers / 短い番号を拒否すること', () => {
    expect(isValidYupackTracking('123456')).toBe(false);
  });

  it('should reject too long numbers / 長すぎる番号を拒否すること', () => {
    expect(isValidYupackTracking('12345678901234')).toBe(false);
  });

  it('should strip non-digit chars / 数字以外を除去すること', () => {
    expect(isValidYupackTracking('1234-5678-9012')).toBe(true);
  });
});

describe('parseYupackTrackingCsv', () => {
  it('should parse standard CSV / 標準 CSV を解析すること', () => {
    const csv = [
      'お客様管理番号,追跡番号,品名',
      'SH-001,123456789012,テスト商品',
      'SH-002,234567890123,テスト商品2',
    ].join('\n');

    const result = parseYupackTrackingCsv(csv);
    expect(result.size).toBe(2);
    expect(result.get('SH-001')).toBe('123456789012');
    expect(result.get('SH-002')).toBe('234567890123');
  });

  it('should handle alternative column names / 代替カラム名を処理すること', () => {
    const csv = [
      '管理番号,問い合わせ番号',
      'SH-003,345678901234',
    ].join('\n');

    const result = parseYupackTrackingCsv(csv);
    expect(result.size).toBe(1);
    expect(result.get('SH-003')).toBe('345678901234');
  });

  it('should skip invalid tracking numbers / 無効な追跡番号をスキップすること', () => {
    const csv = [
      'お客様管理番号,追跡番号',
      'SH-004,123456789012',
      'SH-005,12345',
      'SH-006,',
    ].join('\n');

    const result = parseYupackTrackingCsv(csv);
    expect(result.size).toBe(1);
  });

  it('should handle quoted CSV fields / 引用符付きフィールドを処理すること', () => {
    const csv = [
      '"お客様管理番号","追跡番号"',
      '"SH-007","456789012345"',
    ].join('\n');

    const result = parseYupackTrackingCsv(csv);
    expect(result.size).toBe(1);
    expect(result.get('SH-007')).toBe('456789012345');
  });

  it('should return empty for insufficient lines / 行数不足で空を返すこと', () => {
    expect(parseYupackTrackingCsv('header only').size).toBe(0);
    expect(parseYupackTrackingCsv('').size).toBe(0);
  });

  it('should return empty for missing columns / カラムが見つからない場合は空を返すこと', () => {
    const csv = [
      '名前,住所',
      'テスト,東京',
    ].join('\n');
    expect(parseYupackTrackingCsv(csv).size).toBe(0);
  });
});
