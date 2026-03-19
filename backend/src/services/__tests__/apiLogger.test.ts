/**
 * apiLogger 单元测试 / apiLogger ユニットテスト
 *
 * API操作ログの作成・完了のテスト
 * API操作日志的创建和完成测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';

vi.mock('@/models/apiLog', () => ({
  ApiLog: {
    create: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
}));

import { ApiLog } from '@/models/apiLog';

const chainLean = (val: any) => ({ lean: () => Promise.resolve(val) });

describe('apiLogger / APIログ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createApiLog / APIログ作成', () => {
    it('ログを作成してIDを返すこと / 创建日志并返回ID', async () => {
      const mockId = new mongoose.Types.ObjectId();
      vi.mocked(ApiLog.create).mockResolvedValue({ _id: mockId } as any);

      const { createApiLog } = await import('../apiLogger');
      const result = await createApiLog({
        apiName: 'yamatoB2',
        action: 'export',
        requestUrl: '/api/v1/shipments',
        requestMethod: 'POST',
      });

      expect(result).toEqual(mockId);
      expect(ApiLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          apiName: 'yamatoB2',
          action: 'export',
          status: 'running',
          startedAt: expect.any(Date),
        }),
      );
    });

    it('カスタムステータスを設定できること / 可以设置自定义状态', async () => {
      const mockId = new mongoose.Types.ObjectId();
      vi.mocked(ApiLog.create).mockResolvedValue({ _id: mockId } as any);

      const { createApiLog } = await import('../apiLogger');
      await createApiLog({
        apiName: 'sagawa',
        action: 'tracking',
        status: 'pending',
      });

      expect(ApiLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'pending' }),
      );
    });

    it('DB例外でnullを返すこと / DB异常返回null', async () => {
      vi.mocked(ApiLog.create).mockRejectedValue(new Error('DB error'));

      const { createApiLog } = await import('../apiLogger');
      const result = await createApiLog({
        apiName: 'test',
        action: 'test',
      });

      expect(result).toBeNull();
    });
  });

  describe('completeApiLog / APIログ完了', () => {
    it('ログを完了状態に更新すること / 将日志更新为完成状态', async () => {
      const logId = new mongoose.Types.ObjectId();
      const startedAt = new Date(Date.now() - 5000);
      vi.mocked(ApiLog.findById).mockReturnValue(chainLean({ _id: logId, startedAt }) as any);

      const { completeApiLog } = await import('../apiLogger');
      await completeApiLog(logId, {
        status: 'success',
        statusCode: 200,
        processedCount: 10,
        successCount: 8,
        errorCount: 2,
        message: '処理完了',
      });

      expect(ApiLog.findByIdAndUpdate).toHaveBeenCalledWith(
        logId,
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'success',
            statusCode: 200,
            processedCount: 10,
            completedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('logIdがnullの場合は何もしない / logId为null时不做任何操作', async () => {
      const { completeApiLog } = await import('../apiLogger');
      await completeApiLog(null, { status: 'success' });

      expect(ApiLog.findById).not.toHaveBeenCalled();
    });

    it('エラー結果を記録できること / 可以记录错误结果', async () => {
      const logId = new mongoose.Types.ObjectId();
      vi.mocked(ApiLog.findById).mockReturnValue(chainLean({ _id: logId, startedAt: new Date() }) as any);

      const { completeApiLog } = await import('../apiLogger');
      await completeApiLog(logId, {
        status: 'error',
        statusCode: 500,
        errorDetail: 'Connection timeout',
      });

      expect(ApiLog.findByIdAndUpdate).toHaveBeenCalledWith(
        logId,
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'error',
            errorDetail: 'Connection timeout',
          }),
        }),
      );
    });

    it('DB例外でもエラーを投げない / DB异常也不抛出错误', async () => {
      const logId = new mongoose.Types.ObjectId();
      vi.mocked(ApiLog.findById).mockReturnValue({
        lean: () => Promise.reject(new Error('DB error')),
      } as any);

      const { completeApiLog } = await import('../apiLogger');
      await expect(
        completeApiLog(logId, { status: 'error' }),
      ).resolves.toBeUndefined();
    });

    it('startedAtがない場合はdurationMsを計算しない / startedAt不存在时不计算durationMs', async () => {
      const logId = new mongoose.Types.ObjectId();
      vi.mocked(ApiLog.findById).mockReturnValue(chainLean({ _id: logId }) as any);

      const { completeApiLog } = await import('../apiLogger');
      await completeApiLog(logId, { status: 'success' });

      expect(ApiLog.findByIdAndUpdate).toHaveBeenCalled();
    });

    it('文字列IDでも動作すること / 字符串ID也能正常工作', async () => {
      const logId = new mongoose.Types.ObjectId();
      vi.mocked(ApiLog.findById).mockReturnValue(chainLean({ _id: logId, startedAt: new Date() }) as any);

      const { completeApiLog } = await import('../apiLogger');
      await completeApiLog(String(logId), { status: 'success' });

      expect(ApiLog.findById).toHaveBeenCalled();
    });
  });
});
