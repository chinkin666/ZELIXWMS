/**
 * naturalSort 单元测试 / naturalSort ユニットテスト
 *
 * 自然排序用于WMS注文番号等包含数字的字符串排序
 * 自然ソートはWMS注文番号など数字を含む文字列のソートに使用
 */

import { describe, it, expect } from 'vitest';
import { naturalSort } from '../naturalSort';

describe('naturalSort / 自然ソート', () => {
  describe('null/undefined 处理 / null/undefined ハンドリング', () => {
    it('null同士で0を返す / null同士で0を返す', () => {
      expect(naturalSort(null, null)).toBe(0);
      expect(naturalSort(undefined, undefined)).toBe(0);
      expect(naturalSort(null, undefined)).toBe(0);
    });

    it('nullは非nullより前に来る / nullは非nullより前', () => {
      expect(naturalSort(null, 'a')).toBe(-1);
      expect(naturalSort('a', null)).toBe(1);
      expect(naturalSort(undefined, 'a')).toBe(-1);
      expect(naturalSort('a', undefined)).toBe(1);
    });
  });

  describe('空文字列・プレースホルダー処理 / 空文字列・プレースホルダー', () => {
    it('空文字列同士で0を返す / 空文字列同士で0', () => {
      expect(naturalSort('', '')).toBe(0);
      expect(naturalSort('-', '-')).toBe(0);
      expect(naturalSort('', '-')).toBe(0);
    });

    it('空文字列は通常文字列より前 / 空文字列は通常文字列より前', () => {
      expect(naturalSort('', 'abc')).toBe(-1);
      expect(naturalSort('abc', '')).toBe(1);
      expect(naturalSort('-', 'abc')).toBe(-1);
      expect(naturalSort('abc', '-')).toBe(1);
    });
  });

  describe('注文番号ソート / 注文番号ソート', () => {
    it('SH番号を正しくソート / SH番号を正しくソート', () => {
      const numbers = ['SH20260319-001', 'SH20260319-010', 'SH20260319-002', 'SH20260319-100'];
      const sorted = [...numbers].sort(naturalSort);
      expect(sorted).toEqual([
        'SH20260319-001',
        'SH20260319-002',
        'SH20260319-010',
        'SH20260319-100',
      ]);
    });

    it('日付の異なる注文番号をソート / 日付違いの注文番号ソート', () => {
      const numbers = ['SH20260320-001', 'SH20260319-002', 'SH20260319-001'];
      const sorted = [...numbers].sort(naturalSort);
      expect(sorted).toEqual([
        'SH20260319-001',
        'SH20260319-002',
        'SH20260320-001',
      ]);
    });
  });

  describe('ロケーションコードソート / ロケーションコードソート', () => {
    it('棚番号を正しくソート / 棚番号を正しくソート', () => {
      const locations = ['A-1-1', 'A-1-10', 'A-1-2', 'A-2-1', 'B-1-1'];
      const sorted = [...locations].sort(naturalSort);
      expect(sorted).toEqual(['A-1-1', 'A-1-2', 'A-1-10', 'A-2-1', 'B-1-1']);
    });
  });

  describe('数字のみの比較 / 数字のみの比較', () => {
    it('数値を正しくソート / 数値を正しくソート', () => {
      expect(naturalSort('2', '10')).toBeLessThan(0);
      expect(naturalSort('10', '2')).toBeGreaterThan(0);
      expect(naturalSort('100', '100')).toBe(0);
    });
  });

  describe('大文字小文字を無視 / 大文字小文字を無視', () => {
    it('ケースインセンシティブソート / ケースインセンシティブソート', () => {
      expect(naturalSort('abc', 'ABC')).toBe(0);
      expect(naturalSort('Abc', 'abc')).toBe(0);
    });
  });

  describe('混合タイプ / 混合タイプ', () => {
    it('数字が文字列より前 / 数字が文字列より前', () => {
      expect(naturalSort('1abc', 'abc1')).toBeLessThan(0);
    });

    it('同じ値で0を返す / 同じ値で0を返す', () => {
      expect(naturalSort('abc123', 'abc123')).toBe(0);
    });

    it('異なる長さのトークン / 異なる長さのトークン', () => {
      expect(naturalSort('a', 'ab')).toBeLessThan(0);
      expect(naturalSort('ab', 'a')).toBeGreaterThan(0);
    });
  });

  describe('Wave番号ソート / Wave番号ソート', () => {
    it('WV番号を正しくソート / WV番号を正しくソート', () => {
      const waves = ['WV-20260319-0001', 'WV-20260319-0010', 'WV-20260319-0002'];
      const sorted = [...waves].sort(naturalSort);
      expect(sorted).toEqual([
        'WV-20260319-0001',
        'WV-20260319-0002',
        'WV-20260319-0010',
      ]);
    });
  });
});
