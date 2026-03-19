/**
 * operationLogger 单元测试 / operationLogger ユニットテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/models/operationLog', () => ({
  OperationLog: {
    create: vi.fn().mockResolvedValue({}),
  },
}));

import { OperationLog } from '@/models/operationLog';

describe('operationLogger / 操作ログサービス', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('logOperation / 操作ログ記録', () => {
    it('基本的なログを記録すること / 记录基本日志', async () => {
      const { logOperation } = await import('../operationLogger');
      await logOperation({
        action: 'inbound_receive' as any,
        description: '入庫受入: IN-001',
        referenceNumber: 'IN-001',
        referenceType: 'inboundOrder',
        quantity: 100,
      });

      expect(OperationLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'inbound_receive',
          category: 'inbound', // 自動推定
          description: '入庫受入: IN-001',
          userName: 'system',
          quantity: 100,
        }),
      );
    });

    it('カテゴリの自動推定（inbound_）/ 自动推断分类', async () => {
      const { logOperation } = await import('../operationLogger');
      await logOperation({
        action: 'inbound_putaway' as any,
        description: 'テスト',
      });
      expect(OperationLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'inbound' }),
      );
    });

    it('カテゴリの自動推定（outbound_）/ 自动推断分类(出库)', async () => {
      const { logOperation } = await import('../operationLogger');
      await logOperation({
        action: 'outbound_ship' as any,
        description: 'テスト',
      });
      expect(OperationLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'outbound' }),
      );
    });

    it('カテゴリの自動推定（return_）/ 自动推断分类(退货)', async () => {
      const { logOperation } = await import('../operationLogger');
      await logOperation({
        action: 'return_receive' as any,
        description: 'テスト',
      });
      expect(OperationLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'return' }),
      );
    });

    it('カテゴリの自動推定（在庫系）/ 自动推断分类(库存)', async () => {
      const { logOperation } = await import('../operationLogger');
      await logOperation({
        action: 'adjustment' as any,
        description: 'テスト',
      });
      expect(OperationLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'inventory' }),
      );
    });

    it('カテゴリの自動推定（デフォルト→master）/ 默认分类master', async () => {
      const { logOperation } = await import('../operationLogger');
      await logOperation({
        action: 'product_create' as any,
        description: 'テスト',
      });
      expect(OperationLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'master' }),
      );
    });

    it('明示的カテゴリ指定 / 明确指定分类', async () => {
      const { logOperation } = await import('../operationLogger');
      await logOperation({
        action: 'inbound_receive' as any,
        category: 'return' as any,
        description: 'テスト',
      });
      expect(OperationLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'return' }),
      );
    });

    it('DB例外→サイレント（メイン処理をブロックしない）/ DB异常静默处理', async () => {
      vi.mocked(OperationLog.create).mockRejectedValue(new Error('DB error'));

      const { logOperation } = await import('../operationLogger');
      // エラーを投げないこと
      await expect(
        logOperation({ action: 'adjustment' as any, description: 'テスト' }),
      ).resolves.toBeUndefined();
    });
  });
});
