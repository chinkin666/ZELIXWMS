/**
 * ReplenishmentWorkflow 单元测试 / ReplenishmentWorkflow ユニットテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';

vi.mock('@/models/location', () => ({
  Location: {
    find: vi.fn(),
  },
}));

vi.mock('@/models/stockQuant', () => ({
  StockQuant: {
    find: vi.fn(),
  },
}));

vi.mock('@/models/warehouseTask', () => ({
  WarehouseTask: {
    find: vi.fn(),
  },
  WarehouseTaskPriority: { urgent: 'urgent', high: 'high', normal: 'normal', low: 'low' },
}));

vi.mock('@/services/taskEngine', () => {
  const { Types } = require('mongoose');
  return {
    TaskEngine: {
      createTask: vi.fn().mockResolvedValue({
        _id: new Types.ObjectId(),
        taskNumber: 'WT-RPL-001',
        type: 'replenishment',
        status: 'created',
      }),
      completeTask: vi.fn().mockResolvedValue({
        _id: new Types.ObjectId(),
        status: 'completed',
        completedQuantity: 20,
      }),
    },
  };
});

vi.mock('@/services/ruleEngine', () => ({
  RuleEngine: {
    evaluate: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { Location } from '@/models/location';
import { StockQuant } from '@/models/stockQuant';
import { WarehouseTask } from '@/models/warehouseTask';
import { TaskEngine } from '@/services/taskEngine';
import { RuleEngine } from '@/services/ruleEngine';

const oid = () => new mongoose.Types.ObjectId();
const chainLean = (val: any) => ({ lean: () => Promise.resolve(val) });

describe('ReplenishmentWorkflow / 補充ワークフロー', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkAndTrigger / 補充チェック＆トリガー', () => {
    it('ピッキングゾーンのロケーションなし→空配列 / 无拣货区返回空数组', async () => {
      vi.mocked(Location.find).mockReturnValue(chainLean([]) as any);

      const { ReplenishmentWorkflow } = await import('../replenishmentWorkflow');
      const tasks = await ReplenishmentWorkflow.checkAndTrigger('WH-1');

      expect(tasks).toEqual([]);
      expect(TaskEngine.createTask).not.toHaveBeenCalled();
    });

    it('在庫がminQuantity以上→タスク不要 / 库存充足不触发补充', async () => {
      const locId = oid();
      vi.mocked(Location.find).mockReturnValue(
        chainLean([{ _id: locId, code: 'PICK-A1', type: 'bin', isActive: true }]) as any,
      );
      vi.mocked(StockQuant.find).mockReturnValue(
        chainLean([{ productId: 'P1', productSku: 'SKU-1', quantity: 100, reservedQuantity: 0, locationId: locId }]) as any,
      );
      vi.mocked(RuleEngine.evaluate).mockResolvedValue([
        {
          matched: true,
          rule: {} as any,
          actions: [
            {
              type: 'trigger_replenishment',
              params: { minQuantity: 50, replenishQuantity: 100, sourceZone: 'STORAGE' },
            },
          ],
        },
      ]);

      const { ReplenishmentWorkflow } = await import('../replenishmentWorkflow');
      const tasks = await ReplenishmentWorkflow.checkAndTrigger('WH-1');

      expect(tasks).toEqual([]);
      expect(TaskEngine.createTask).not.toHaveBeenCalled();
    });

    it('在庫不足時にタスクを作成すること / 库存不足时创建补充任务', async () => {
      const locId = oid();
      const sourceLocId = oid();
      vi.mocked(Location.find)
        // ピッキングロケーション
        .mockReturnValueOnce(
          chainLean([{ _id: locId, code: 'PICK-A1', type: 'bin', isActive: true, warehouseId: 'WH-1' }]) as any,
        )
        // ソースロケーション（findSourceLocation内）
        .mockReturnValueOnce(
          chainLean([{ _id: sourceLocId, code: 'STORAGE-B1', type: 'shelf', isActive: true }]) as any,
        );

      vi.mocked(StockQuant.find)
        // ピッキングゾーンの在庫
        .mockReturnValueOnce(
          chainLean([{
            productId: 'P1',
            productSku: 'SKU-1',
            quantity: 10,
            reservedQuantity: 5,
            locationId: locId,
          }]) as any,
        )
        // ソースの在庫
        .mockReturnValueOnce(
          chainLean([{
            productId: 'P1',
            quantity: 200,
            reservedQuantity: 0,
            locationId: sourceLocId,
          }]) as any,
        );

      vi.mocked(RuleEngine.evaluate).mockResolvedValue([
        {
          matched: true,
          rule: {} as any,
          actions: [
            {
              type: 'trigger_replenishment',
              params: { minQuantity: 20, replenishQuantity: 50, sourceZone: 'STORAGE' },
            },
          ],
        },
      ]);

      const { ReplenishmentWorkflow } = await import('../replenishmentWorkflow');
      const tasks = await ReplenishmentWorkflow.checkAndTrigger('WH-1', 'system');

      expect(TaskEngine.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'replenishment',
          warehouseId: 'WH-1',
          productId: 'P1',
          requiredQuantity: 50,
        }),
      );
      expect(tasks.length).toBeGreaterThanOrEqual(1);
    });

    it('ソースロケーションなし→タスク不作成 / 无源库位不创建任务', async () => {
      const locId = oid();
      vi.mocked(Location.find)
        .mockReturnValueOnce(
          chainLean([{ _id: locId, code: 'PICK-A1', type: 'bin', isActive: true }]) as any,
        )
        .mockReturnValueOnce(chainLean([]) as any); // ソースなし

      vi.mocked(StockQuant.find).mockReturnValue(
        chainLean([{ productId: 'P1', productSku: 'SKU-1', quantity: 5, reservedQuantity: 0, locationId: locId }]) as any,
      );

      vi.mocked(RuleEngine.evaluate).mockResolvedValue([
        {
          matched: true,
          rule: {} as any,
          actions: [
            {
              type: 'trigger_replenishment',
              params: { minQuantity: 20, replenishQuantity: 50, sourceZone: 'STORAGE' },
            },
          ],
        },
      ]);

      const { ReplenishmentWorkflow } = await import('../replenishmentWorkflow');
      const tasks = await ReplenishmentWorkflow.checkAndTrigger('WH-1');

      expect(tasks).toEqual([]);
    });
  });

  describe('completeReplenishment / 補充完了', () => {
    it('TaskEngine.completeTaskに委譲すること / 委派给TaskEngine', async () => {
      const { ReplenishmentWorkflow } = await import('../replenishmentWorkflow');
      await ReplenishmentWorkflow.completeReplenishment('task-1', 20, 'worker-1');

      expect(TaskEngine.completeTask).toHaveBeenCalledWith('task-1', 20, 'worker-1');
    });
  });

  describe('getReplenishmentStatus / 補充ステータス', () => {
    it('ステータス別集計を返すこと / 按状态返回汇总', async () => {
      const tasks = [
        { status: 'created', type: 'replenishment' },
        { status: 'assigned', type: 'replenishment' },
        { status: 'in_progress', type: 'replenishment' },
        { status: 'completed', type: 'replenishment' },
        { status: 'completed', type: 'replenishment' },
      ];
      vi.mocked(WarehouseTask.find).mockReturnValue(chainLean(tasks) as any);

      const { ReplenishmentWorkflow } = await import('../replenishmentWorkflow');
      const status = await ReplenishmentWorkflow.getReplenishmentStatus('WH-1');

      expect(status.pending).toBe(2);     // created + assigned
      expect(status.inProgress).toBe(1);
      expect(status.completed).toBe(2);
      expect(status.total).toBe(5);
    });
  });
});
