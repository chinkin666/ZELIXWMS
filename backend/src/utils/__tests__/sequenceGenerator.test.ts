/**
 * sequenceGenerator 单元测试 / sequenceGenerator ユニットテスト
 *
 * 自动递增编号生成器测试 / 自動採番ジェネレーターテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// mongooseモデルのモック / mongoose模型的mock
// vi.hoisted で巻き上げ対応 / 使用 vi.hoisted 处理提升问题
const { mockFindOneAndUpdate } = vi.hoisted(() => ({
  mockFindOneAndUpdate: vi.fn(),
}));
vi.mock('mongoose', () => {
  const SchemaClass = vi.fn();
  SchemaClass.prototype = {};
  return {
    default: {
      Schema: SchemaClass,
      model: vi.fn(() => ({
        findOneAndUpdate: mockFindOneAndUpdate,
      })),
    },
  };
});

import { generateSequenceNumber } from '../sequenceGenerator';

describe('sequenceGenerator / シーケンス生成', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルトのモック戻り値 / 默认的mock返回值
    mockFindOneAndUpdate.mockResolvedValue({ seq: 1 });
  });

  // 基本フォーマット検証 / 基本格式验证
  it('should generate number in PREFIX-YYYYMMDD-NNNNN format / PREFIX-YYYYMMDD-NNNNN形式で生成', async () => {
    const result = await generateSequenceNumber('MV');
    // MV-YYYYMMDD-00001 のパターンにマッチ / 匹配 MV-YYYYMMDD-00001 模式
    expect(result).toMatch(/^MV-\d{8}-00001$/);
  });

  // 異なるプレフィックス / 不同前缀
  it('should use the provided prefix / 指定されたプレフィックスを使用', async () => {
    const result = await generateSequenceNumber('IN');
    expect(result).toMatch(/^IN-\d{8}-00001$/);
  });

  // カスタム桁数 / 自定义位数
  it('should support custom digit count / カスタム桁数をサポート', async () => {
    mockFindOneAndUpdate.mockResolvedValue({ seq: 42 });
    const result = await generateSequenceNumber('ORD', 8);
    expect(result).toMatch(/^ORD-\d{8}-00000042$/);
  });

  // 連番のインクリメント / 序号的递增
  it('should pad sequence number correctly / シーケンス番号を正しくパディング', async () => {
    mockFindOneAndUpdate.mockResolvedValue({ seq: 999 });
    const result = await generateSequenceNumber('MV');
    expect(result).toMatch(/^MV-\d{8}-00999$/);
  });

  // 日付部分の検証 / 日期部分的验证
  it('should include today date in YYYYMMDD format / 今日の日付をYYYYMMDD形式で含む', async () => {
    const today = new Date();
    const expectedDate = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('');

    const result = await generateSequenceNumber('MV');
    expect(result).toContain(expectedDate);
  });

  // findOneAndUpdateが正しいパラメータで呼ばれる / findOneAndUpdate被正确调用
  it('should call findOneAndUpdate with upsert and $inc / findOneAndUpdateをupsert+$incで呼び出す', async () => {
    await generateSequenceNumber('MV');
    expect(mockFindOneAndUpdate).toHaveBeenCalledTimes(1);
    const [filter, update, options] = mockFindOneAndUpdate.mock.calls[0];
    expect(filter._id).toMatch(/^MV-\d{8}$/);
    expect(update).toEqual({ $inc: { seq: 1 } });
    expect(options).toEqual(
      expect.objectContaining({ upsert: true, returnDocument: 'after' })
    );
  });
});
