// ページネーションDTOテスト / 分页DTO测试
import { paginationSchema, createPaginatedResult } from './pagination.dto.js';

describe('paginationSchema', () => {
  // デフォルト値の適用 / 应用默认值
  it('should apply default values', () => {
    const result = paginationSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  // 文字列から数値への変換 / 字符串转数值
  it('should coerce string values to numbers', () => {
    const result = paginationSchema.parse({ page: '3', limit: '50' });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(50);
  });

  // 有効な値の受入 / 接受有效值
  it('should accept valid values', () => {
    const result = paginationSchema.parse({ page: 5, limit: 100 });
    expect(result.page).toBe(5);
    expect(result.limit).toBe(100);
  });

  // page最小値バリデーション / page最小值验证
  it('should reject page less than 1', () => {
    expect(() => paginationSchema.parse({ page: 0 })).toThrow();
  });

  // limit最小値バリデーション / limit最小值验证
  it('should reject limit less than 1', () => {
    expect(() => paginationSchema.parse({ limit: 0 })).toThrow();
  });

  // limit最大値バリデーション / limit最大值验证
  it('should reject limit greater than 200', () => {
    expect(() => paginationSchema.parse({ limit: 201 })).toThrow();
  });

  // 小数値の拒否 / 拒绝小数值
  it('should reject non-integer values', () => {
    expect(() => paginationSchema.parse({ page: 1.5 })).toThrow();
  });
});

describe('createPaginatedResult', () => {
  // ページネーション結果の正しい生成 / 正确生成分页结果
  it('should create paginated result with correct totalPages', () => {
    const items = [{ id: 1 }, { id: 2 }];
    const result = createPaginatedResult(items, 50, 1, 20);

    expect(result.items).toEqual(items);
    expect(result.total).toBe(50);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.totalPages).toBe(3);
  });

  // 割り切れるケース / 整除的情况
  it('should calculate totalPages correctly when evenly divisible', () => {
    const result = createPaginatedResult([], 100, 1, 20);
    expect(result.totalPages).toBe(5);
  });

  // 空結果 / 空结果
  it('should handle empty results', () => {
    const result = createPaginatedResult([], 0, 1, 20);
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(0);
  });
});
