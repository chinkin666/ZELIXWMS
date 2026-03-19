/**
 * errorHandler ミドルウェアテスト / 错误处理中间件测试
 *
 * AppError・Mongooseエラー・未知エラーの処理を検証
 * 验证AppError、Mongoose错误、未知错误的处理
 */

import { describe, it, expect, vi } from 'vitest';
import { AppError, ValidationError, NotFoundError, ConflictError } from '@/lib/errors';

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const mockReq = (overrides: any = {}) => ({
  method: 'GET',
  originalUrl: '/api/test',
  ...overrides,
}) as any;

const mockRes = () => {
  const res: any = { json: vi.fn(), status: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
};

const mockNext = vi.fn();

describe('errorHandler / エラーハンドリング', () => {
  describe('notFoundHandler / 404ハンドラ', () => {
    it('404 JSONレスポンスを返すこと / 返回404 JSON', async () => {
      const { notFoundHandler } = await import('../errorHandler');
      const req = mockReq({ method: 'GET', originalUrl: '/api/unknown' });
      const res = mockRes();

      notFoundHandler(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: 'NOT_FOUND' }),
        }),
      );
    });
  });

  describe('errorHandler / エラーハンドラ', () => {
    it('AppErrorのステータスコードとコードを使用 / 使用AppError的状态码', async () => {
      const { errorHandler } = await import('../errorHandler');
      const err = new ValidationError('入力エラー', { field: 'name' });
      const res = mockRes();

      errorHandler(err, mockReq(), res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: '入力エラー',
            details: { field: 'name' },
          }),
        }),
      );
    });

    it('NotFoundError → 404 / NotFoundError返回404', async () => {
      const { errorHandler } = await import('../errorHandler');
      const err = new NotFoundError('見つかりません');
      const res = mockRes();

      errorHandler(err, mockReq(), res, mockNext);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('ConflictError → 409 / ConflictError返回409', async () => {
      const { errorHandler } = await import('../errorHandler');
      const err = new ConflictError('重複');
      const res = mockRes();

      errorHandler(err, mockReq(), res, mockNext);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('Mongoose ValidationError → 400 / Mongoose验证错误返回400', async () => {
      const { errorHandler } = await import('../errorHandler');
      const err = {
        name: 'ValidationError',
        message: 'Validation failed',
        errors: {
          sku: { message: 'SKU is required' },
          name: { message: 'Name is required' },
        },
      } as any;
      const res = mockRes();

      errorHandler(err, mockReq(), res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            details: { sku: 'SKU is required', name: 'Name is required' },
          }),
        }),
      );
    });

    it('MongoDB重複キーエラー(11000) → 409 / MongoDB重复键返回409', async () => {
      const { errorHandler } = await import('../errorHandler');
      const err = {
        name: 'MongoError',
        code: 11000,
        keyValue: { orderNumber: 'SH-001' },
        message: 'duplicate key',
      } as any;
      const res = mockRes();

      errorHandler(err, mockReq(), res, mockNext);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'CONFLICT' }),
        }),
      );
    });

    it('CastError → 400 / CastError返回400', async () => {
      const { errorHandler } = await import('../errorHandler');
      const err = {
        name: 'CastError',
        path: '_id',
        value: 'invalid-id',
        message: 'Cast error',
      } as any;
      const res = mockRes();

      errorHandler(err, mockReq(), res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('未知エラー → 500 / 未知错误返回500', async () => {
      const { errorHandler } = await import('../errorHandler');
      const err = new Error('Unexpected error');
      const res = mockRes();

      errorHandler(err, mockReq(), res, mockNext);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'INTERNAL_ERROR' }),
        }),
      );
    });
  });
});
