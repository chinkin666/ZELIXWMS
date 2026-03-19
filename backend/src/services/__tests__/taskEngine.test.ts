/**
 * TaskEngine 单元测试 / TaskEngine ユニットテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';

const oid = () => new mongoose.Types.ObjectId();

// WarehouseTask mock with save method
const createTaskDoc = (overrides: any = {}) => {
  const doc: any = {
    _id: oid(),
    taskNumber: 'WT-20260319-00001',
    type: 'picking',
    warehouseId: 'WH-1',
    status: 'created',
    priority: 'normal',
    createdAt: new Date(),
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  return doc;
};

vi.mock('@/models/warehouseTask', () => {
  const statuses = ['created', 'assigned', 'in_progress', 'completed', 'cancelled', 'on_hold'];
  const types = ['receiving', 'putaway', 'picking', 'sorting', 'packing', 'replenishment'];
  const priorities = ['urgent', 'high', 'normal', 'low'];
  return {
    WarehouseTask: {
      create: vi.fn(),
      findById: vi.fn(),
      find: vi.fn(),
    },
    WarehouseTaskStatus: Object.fromEntries(statuses.map((s) => [s, s])),
    WarehouseTaskType: Object.fromEntries(types.map((t) => [t, t])),
    WarehouseTaskPriority: Object.fromEntries(priorities.map((p) => [p, p])),
  };
});

vi.mock('@/models/inventoryLedger', () => ({
  InventoryLedger: {
    create: vi.fn().mockResolvedValue({}),
  },
  LedgerType: { inbound: 'inbound', outbound: 'outbound' },
}));

vi.mock('@/core/extensions', () => ({
  extensionManager: { emit: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('@/core/extensions/types', () => ({
  HOOK_EVENTS: {
    TASK_CREATED: 'task.created',
    TASK_COMPLETED: 'task.completed',
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { WarehouseTask } from '@/models/warehouseTask';
import { InventoryLedger } from '@/models/inventoryLedger';
import { extensionManager } from '@/core/extensions';

describe('TaskEngine / タスクエンジン', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTask / タスク作成', () => {
    it('タスクを作成しイベントを発火すること / 创建任务并触发事件', async () => {
      const mockTask = createTaskDoc();
      vi.mocked(WarehouseTask.create).mockResolvedValue(mockTask as any);

      const { TaskEngine } = await import('../taskEngine');
      const task = await TaskEngine.createTask({
        type: 'picking' as any,
        warehouseId: 'WH-1',
        productSku: 'SKU-001',
      });

      expect(WarehouseTask.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'picking',
          warehouseId: 'WH-1',
          status: 'created',
        }),
      );
      expect(extensionManager.emit).toHaveBeenCalled();
      expect(task).toBeDefined();
    });
  });

  describe('assignTask / タスク割当', () => {
    it('created状態のタスクを割り当てること / 分配created状态的任务', async () => {
      const mockTask = createTaskDoc({ status: 'created' });
      vi.mocked(WarehouseTask.findById).mockResolvedValue(mockTask);

      const { TaskEngine } = await import('../taskEngine');
      const task = await TaskEngine.assignTask(String(mockTask._id), 'worker-1', '田中太郎');

      expect(mockTask.status).toBe('assigned');
      expect(mockTask.assignedTo).toBe('worker-1');
      expect(mockTask.assignedName).toBe('田中太郎');
      expect(mockTask.save).toHaveBeenCalled();
    });

    it('完了タスクは割り当て不可 / 不能分配已完成的任务', async () => {
      const mockTask = createTaskDoc({ status: 'completed' });
      vi.mocked(WarehouseTask.findById).mockResolvedValue(mockTask);

      const { TaskEngine } = await import('../taskEngine');
      await expect(
        TaskEngine.assignTask(String(mockTask._id), 'worker-1'),
      ).rejects.toThrow('Cannot assign');
    });

    it('存在しないタスクでエラー / 任务不存在时抛出异常', async () => {
      vi.mocked(WarehouseTask.findById).mockResolvedValue(null);

      const { TaskEngine } = await import('../taskEngine');
      await expect(
        TaskEngine.assignTask('nonexistent', 'worker-1'),
      ).rejects.toThrow('Task not found');
    });
  });

  describe('startTask / タスク開始', () => {
    it('assigned状態のタスクを開始すること / 开始assigned状态的任务', async () => {
      const mockTask = createTaskDoc({ status: 'assigned' });
      vi.mocked(WarehouseTask.findById).mockResolvedValue(mockTask);

      const { TaskEngine } = await import('../taskEngine');
      await TaskEngine.startTask(String(mockTask._id));

      expect(mockTask.status).toBe('in_progress');
      expect(mockTask.startedAt).toBeInstanceOf(Date);
      expect(mockTask.save).toHaveBeenCalled();
    });

    it('assigned以外では開始不可 / 非assigned状态不能开始', async () => {
      const mockTask = createTaskDoc({ status: 'created' });
      vi.mocked(WarehouseTask.findById).mockResolvedValue(mockTask);

      const { TaskEngine } = await import('../taskEngine');
      await expect(TaskEngine.startTask(String(mockTask._id))).rejects.toThrow('Cannot start');
    });
  });

  describe('completeTask / タスク完了', () => {
    it('in_progressタスクを完了しLedgerを記録すること / 完成任务并记录Ledger', async () => {
      const startedAt = new Date(Date.now() - 60000);
      const mockTask = createTaskDoc({
        status: 'in_progress',
        startedAt,
        type: 'picking',
        productId: 'P1',
        productSku: 'SKU-001',
        fromLocationId: 'LOC-A',
      });
      vi.mocked(WarehouseTask.findById).mockResolvedValue(mockTask);

      const { TaskEngine } = await import('../taskEngine');
      await TaskEngine.completeTask(String(mockTask._id), 10, 'worker-1');

      expect(mockTask.status).toBe('completed');
      expect(mockTask.completedQuantity).toBe(10);
      expect(mockTask.durationMs).toBeGreaterThan(0);
      expect(InventoryLedger.create).toHaveBeenCalled();
      expect(extensionManager.emit).toHaveBeenCalled();
    });

    it('productIdなしの場合Ledgerをスキップ / 无productId时跳过Ledger', async () => {
      const mockTask = createTaskDoc({
        status: 'in_progress',
        productId: undefined,
        productSku: undefined,
      });
      vi.mocked(WarehouseTask.findById).mockResolvedValue(mockTask);

      const { TaskEngine } = await import('../taskEngine');
      await TaskEngine.completeTask(String(mockTask._id), 5);

      expect(InventoryLedger.create).not.toHaveBeenCalled();
    });
  });

  describe('cancelTask / タスクキャンセル', () => {
    it('タスクをキャンセルすること / 取消任务', async () => {
      const mockTask = createTaskDoc({ status: 'in_progress' });
      vi.mocked(WarehouseTask.findById).mockResolvedValue(mockTask);

      const { TaskEngine } = await import('../taskEngine');
      await TaskEngine.cancelTask(String(mockTask._id), '顧客都合');

      expect(mockTask.status).toBe('cancelled');
      expect(mockTask.memo).toBe('顧客都合');
    });

    it('完了タスクはキャンセル不可 / 不能取消已完成的任务', async () => {
      const mockTask = createTaskDoc({ status: 'completed' });
      vi.mocked(WarehouseTask.findById).mockResolvedValue(mockTask);

      const { TaskEngine } = await import('../taskEngine');
      await expect(
        TaskEngine.cancelTask(String(mockTask._id)),
      ).rejects.toThrow('Cannot cancel');
    });
  });

  describe('holdTask / タスク保留', () => {
    it('タスクを保留にすること / 暂停任务', async () => {
      const mockTask = createTaskDoc({ status: 'in_progress' });
      vi.mocked(WarehouseTask.findById).mockResolvedValue(mockTask);

      const { TaskEngine } = await import('../taskEngine');
      await TaskEngine.holdTask(String(mockTask._id), '在庫確認中');

      expect(mockTask.status).toBe('on_hold');
      expect(mockTask.memo).toBe('在庫確認中');
    });
  });

  describe('getNextTask / 次タスク取得', () => {
    it('優先度順にタスクを返すこと / 按优先级返回任务', async () => {
      const tasks = [
        createTaskDoc({ priority: 'low', createdAt: new Date('2026-01-01') }),
        createTaskDoc({ priority: 'urgent', createdAt: new Date('2026-01-02') }),
        createTaskDoc({ priority: 'normal', createdAt: new Date('2026-01-01') }),
      ];
      vi.mocked(WarehouseTask.find).mockReturnValue({
        lean: () => Promise.resolve(tasks),
      } as any);

      const { TaskEngine } = await import('../taskEngine');
      const next = await TaskEngine.getNextTask('WH-1', 'worker-1');

      expect(next?.priority).toBe('urgent');
    });

    it('タスクなし→nullを返す / 无任务返回null', async () => {
      vi.mocked(WarehouseTask.find).mockReturnValue({
        lean: () => Promise.resolve([]),
      } as any);

      const { TaskEngine } = await import('../taskEngine');
      const next = await TaskEngine.getNextTask('WH-1', 'worker-1');

      expect(next).toBeNull();
    });
  });

  describe('getTaskQueue / タスクキュー取得', () => {
    it('フィルター付きでタスクリストを返すこと / 带筛选返回任务列表', async () => {
      const tasks = [
        createTaskDoc({ type: 'picking', priority: 'high' }),
        createTaskDoc({ type: 'picking', priority: 'normal' }),
      ];
      vi.mocked(WarehouseTask.find).mockReturnValue({
        limit: vi.fn().mockReturnValue({
          lean: () => Promise.resolve(tasks),
        }),
      } as any);

      const { TaskEngine } = await import('../taskEngine');
      const queue = await TaskEngine.getTaskQueue('WH-1', {
        type: 'picking' as any,
        limit: 10,
      });

      expect(queue).toHaveLength(2);
      // high が先に来ること
      expect(queue[0].priority).toBe('high');
    });
  });
});
