/**
 * rateLimit ミドルウェアテスト / 速率限制中间件测试
 */

import { describe, it, expect } from 'vitest';

describe('rateLimit / レートリミット', () => {
  it('globalLimiter がエクスポートされていること / globalLimiter已导出', async () => {
    const { globalLimiter } = await import('../rateLimit');
    expect(globalLimiter).toBeDefined();
    expect(typeof globalLimiter).toBe('function');
  });
});
