/**
 * idGenerator 单元测试 / idGenerator ユニットテスト
 *
 * 注文番号・グループID・ユニークトークン生成のテスト
 * 订单号、分组ID、唯一令牌生成的测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/models/shipmentOrder', () => ({
  ShipmentOrder: {
    findOne: vi.fn(() => ({
      select: () => ({ lean: () => ({ exec: () => Promise.resolve(null) }) }),
    })),
  },
}));

vi.mock('@/models/orderGroup', () => ({
  OrderGroup: {
    find: vi.fn(() => ({
      select: () => ({ lean: () => ({ exec: () => Promise.resolve([]) }) }),
    })),
    findOne: vi.fn(() => ({
      select: () => ({ lean: () => ({ exec: () => Promise.resolve(null) }) }),
    })),
  },
}));

describe('idGenerator / ID生成', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('generateOrderSystemId / システムID生成', () => {
    it('正しいフォーマットのIDを生成すること / 生成正确格式的ID', async () => {
      const { generateOrderSystemId } = await import('../idGenerator');
      const id = generateOrderSystemId('tenant-001');

      // フォーマット: {prefix}_{yyyymmdd}_{tenant}_{time36}_{uuid8}
      const parts = id.split('_');
      expect(parts[0]).toBe('ord');
      expect(parts[1]).toMatch(/^\d{8}$/); // 日付
      expect(parts[2]).toBe('tenant001'); // テナント（サニタイズ済み）
      expect(parts.length).toBeGreaterThanOrEqual(4);
    });

    it('カスタムプレフィックスを使用できること / 可使用自定义前缀', async () => {
      const { generateOrderSystemId } = await import('../idGenerator');
      const id = generateOrderSystemId('test', 'ship');
      expect(id.startsWith('ship_')).toBe(true);
    });

    it('テナントIDをサニタイズすること / 清洁化租户ID', async () => {
      const { generateOrderSystemId } = await import('../idGenerator');
      const id = generateOrderSystemId('test@special#chars!');
      // 特殊文字は除去される、末尾12文字が使用される
      expect(id).toContain('specialchars');
      expect(id).not.toContain('@');
      expect(id).not.toContain('#');
    });

    it('毎回異なるIDを生成すること / 每次生成不同的ID', async () => {
      const { generateOrderSystemId } = await import('../idGenerator');
      const id1 = generateOrderSystemId('t1');
      const id2 = generateOrderSystemId('t1');
      expect(id1).not.toBe(id2);
    });
  });

  describe('generateOrderNumbers / 注文番号一括生成', () => {
    it('指定数の注文番号を生成すること / 生成指定数量的订单号', async () => {
      const { generateOrderNumbers } = await import('../idGenerator');
      const numbers = await generateOrderNumbers(3);

      expect(numbers).toHaveLength(3);
      // フォーマット: SH{YYYYMMDD}-{8桁}
      for (const n of numbers) {
        expect(n).toMatch(/^SH\d{8}-\d{8}$/);
      }
    });

    it('生成された番号は一意であること / 生成的号码唯一', async () => {
      const { generateOrderNumbers } = await import('../idGenerator');
      const numbers = await generateOrderNumbers(10);
      const unique = new Set(numbers);
      expect(unique.size).toBe(10);
    });

    it('count=0の場合は空配列 / count=0返回空数组', async () => {
      const { generateOrderNumbers } = await import('../idGenerator');
      const numbers = await generateOrderNumbers(0);
      expect(numbers).toEqual([]);
    });

    it('指定日付で番号を生成すること / 按指定日期生成号码', async () => {
      const { generateOrderNumbers } = await import('../idGenerator');
      const date = new Date(2026, 2, 19); // 2026-03-19
      const numbers = await generateOrderNumbers(1, date);
      expect(numbers[0]).toContain('SH20260319-');
    });
  });

  describe('generateOrderNumber / 単一注文番号生成', () => {
    it('1件の注文番号を生成すること / 生成1个订单号', async () => {
      const { generateOrderNumber } = await import('../idGenerator');
      const number = await generateOrderNumber();
      expect(number).toMatch(/^SH\d{8}-\d{8}$/);
    });
  });

  describe('generateUniqueToken / ユニークトークン生成', () => {
    it('デフォルトプレフィックスtoken / 默认前缀token', async () => {
      const { generateUniqueToken } = await import('../idGenerator');
      const token = generateUniqueToken();
      expect(token.startsWith('token_')).toBe(true);
    });

    it('カスタムプレフィックス / 自定义前缀', async () => {
      const { generateUniqueToken } = await import('../idGenerator');
      const token = generateUniqueToken('session');
      expect(token.startsWith('session_')).toBe(true);
    });

    it('毎回異なるトークン / 每次生成不同的令牌', async () => {
      const { generateUniqueToken } = await import('../idGenerator');
      const t1 = generateUniqueToken();
      const t2 = generateUniqueToken();
      expect(t1).not.toBe(t2);
    });
  });

  describe('generateOrderGroupId / グループID生成', () => {
    it('正しいフォーマットのIDを生成すること / 生成正确格式的分组ID', async () => {
      const { generateOrderGroupId } = await import('../idGenerator');
      const id = await generateOrderGroupId();
      // フォーマット: PK-{yyyymmdd}-{5桁以上}
      expect(id).toMatch(/^PK-\d{8}-\d{5,}$/);
    });

    it('指定日付で生成すること / 按指定日期生成', async () => {
      const { generateOrderGroupId } = await import('../idGenerator');
      const date = new Date(2026, 2, 19);
      const id = await generateOrderGroupId(date);
      expect(id).toContain('PK-20260319-');
    });
  });
});
