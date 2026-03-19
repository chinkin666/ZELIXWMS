/**
 * WorkflowEngine 单元测试 / WorkflowEngine ユニットテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock 依赖サービス / Mock 依赖服务
vi.mock('@/services/inboundWorkflow', () => ({
  InboundWorkflow: {
    startReceiving: vi.fn().mockResolvedValue({ status: 'receiving' }),
    confirmReceiveLine: vi.fn().mockResolvedValue({ status: 'receiving' }),
    startPutaway: vi.fn().mockResolvedValue({ status: 'putaway' }),
    completePutaway: vi.fn().mockResolvedValue({ status: 'done' }),
    getWorkflowStatus: vi.fn().mockResolvedValue({ phase: 'receiving', progress: 50 }),
  },
}));

vi.mock('@/services/outboundWorkflow', () => ({
  OutboundWorkflow: {
    createWave: vi.fn().mockResolvedValue({ _id: 'wave-1', status: 'created' }),
    startPicking: vi.fn().mockResolvedValue({ status: 'picking' }),
    completePickingTask: vi.fn().mockResolvedValue({}),
    startSorting: vi.fn().mockResolvedValue({ status: 'sorting' }),
    completeSorting: vi.fn().mockResolvedValue({ status: 'packing' }),
    completePacking: vi.fn().mockResolvedValue({ status: 'completed' }),
    getWaveProgress: vi.fn().mockResolvedValue({ picking: 5, sorting: 3, packing: 2 }),
  },
}));

vi.mock('@/services/replenishmentWorkflow', () => ({
  ReplenishmentWorkflow: {
    checkAndTrigger: vi.fn().mockResolvedValue([]),
    completeReplenishment: vi.fn().mockResolvedValue({ status: 'completed' }),
    getReplenishmentStatus: vi.fn().mockResolvedValue({ pending: 2, inProgress: 1, completed: 10, total: 13 }),
  },
}));

vi.mock('@/models/warehouseTask', () => ({
  WarehouseTask: {
    countDocuments: vi.fn().mockResolvedValue(5),
  },
}));

vi.mock('@/models/wave', () => ({
  Wave: {
    countDocuments: vi.fn().mockResolvedValue(2),
  },
}));

import { InboundWorkflow } from '@/services/inboundWorkflow';
import { OutboundWorkflow } from '@/services/outboundWorkflow';
import { ReplenishmentWorkflow } from '@/services/replenishmentWorkflow';
import { WarehouseTask } from '@/models/warehouseTask';
import { Wave } from '@/models/wave';

describe('WorkflowEngine / ワークフローエンジン', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Inbound ───

  describe('入庫ワークフロー / 入库工作流', () => {
    it('startInboundReceiving がInboundWorkflowに委譲すること', async () => {
      const { WorkflowEngine } = await import('../workflowEngine');
      await WorkflowEngine.startInboundReceiving('order-1', 'user-1');
      expect(InboundWorkflow.startReceiving).toHaveBeenCalledWith('order-1', 'user-1');
    });

    it('confirmInboundLine がInboundWorkflowに委譲すること', async () => {
      const { WorkflowEngine } = await import('../workflowEngine');
      await WorkflowEngine.confirmInboundLine('order-1', 1, 50, 'user-1');
      expect(InboundWorkflow.confirmReceiveLine).toHaveBeenCalledWith('order-1', 1, 50, 'user-1');
    });

    it('startInboundPutaway がInboundWorkflowに委譲すること', async () => {
      const { WorkflowEngine } = await import('../workflowEngine');
      await WorkflowEngine.startInboundPutaway('order-1', 'user-1');
      expect(InboundWorkflow.startPutaway).toHaveBeenCalledWith('order-1', 'user-1');
    });

    it('completeInboundPutaway がInboundWorkflowに委譲すること', async () => {
      const { WorkflowEngine } = await import('../workflowEngine');
      await WorkflowEngine.completeInboundPutaway('order-1', 1, 'LOC-A', 50, 'user-1');
      expect(InboundWorkflow.completePutaway).toHaveBeenCalledWith('order-1', 1, 'LOC-A', 50, 'user-1');
    });

    it('getInboundStatus がInboundWorkflowに委譲すること', async () => {
      const { WorkflowEngine } = await import('../workflowEngine');
      const status = await WorkflowEngine.getInboundStatus('order-1');
      expect(status).toEqual({ phase: 'receiving', progress: 50 });
    });
  });

  // ─── Outbound ───

  describe('出庫ワークフロー / 出库工作流', () => {
    it('createOutboundWave がOutboundWorkflowに委譲すること', async () => {
      const { WorkflowEngine } = await import('../workflowEngine');
      const params = { warehouseId: 'WH-1', shipmentOrderIds: ['SO-1', 'SO-2'] };
      await WorkflowEngine.createOutboundWave(params);
      expect(OutboundWorkflow.createWave).toHaveBeenCalledWith(params);
    });

    it('startOutboundPicking がOutboundWorkflowに委譲すること', async () => {
      const { WorkflowEngine } = await import('../workflowEngine');
      await WorkflowEngine.startOutboundPicking('wave-1', 'user-1');
      expect(OutboundWorkflow.startPicking).toHaveBeenCalledWith('wave-1', 'user-1');
    });

    it('completePickingTask がOutboundWorkflowに委譲すること', async () => {
      const { WorkflowEngine } = await import('../workflowEngine');
      await WorkflowEngine.completePickingTask('task-1', 10, 'user-1');
      expect(OutboundWorkflow.completePickingTask).toHaveBeenCalledWith('task-1', 10, 'user-1');
    });

    it('startOutboundSorting がOutboundWorkflowに委譲すること / 委托排序', async () => {
      const { WorkflowEngine } = await import('../workflowEngine');
      await WorkflowEngine.startOutboundSorting('wave-1', 'user-1');
      expect(OutboundWorkflow.startSorting).toHaveBeenCalledWith('wave-1', 'user-1');
    });

    it('completeOutboundSorting がOutboundWorkflowに委譲すること / 委托排序完了', async () => {
      const { WorkflowEngine } = await import('../workflowEngine');
      await WorkflowEngine.completeOutboundSorting('wave-1', 'user-1');
      expect(OutboundWorkflow.completeSorting).toHaveBeenCalledWith('wave-1', 'user-1');
    });

    it('completeOutboundPacking がOutboundWorkflowに委譲すること / 委托梱包完了', async () => {
      const { WorkflowEngine } = await import('../workflowEngine');
      await WorkflowEngine.completeOutboundPacking('task-1', 'user-1');
      expect(OutboundWorkflow.completePacking).toHaveBeenCalledWith('task-1', 'user-1');
    });

    it('getOutboundProgress がOutboundWorkflowに委譲すること', async () => {
      const { WorkflowEngine } = await import('../workflowEngine');
      const progress = await WorkflowEngine.getOutboundProgress('wave-1');
      expect(progress).toEqual({ picking: 5, sorting: 3, packing: 2 });
    });
  });

  // ─── Replenishment ───

  describe('補充ワークフロー / 补充工作流', () => {
    it('triggerReplenishment がReplenishmentWorkflowに委譲すること', async () => {
      const { WorkflowEngine } = await import('../workflowEngine');
      await WorkflowEngine.triggerReplenishment('WH-1', 'user-1');
      expect(ReplenishmentWorkflow.checkAndTrigger).toHaveBeenCalledWith('WH-1', 'user-1');
    });

    it('completeReplenishment がReplenishmentWorkflowに委譲すること', async () => {
      const { WorkflowEngine } = await import('../workflowEngine');
      await WorkflowEngine.completeReplenishment('task-1', 20, 'user-1');
      expect(ReplenishmentWorkflow.completeReplenishment).toHaveBeenCalledWith('task-1', 20, 'user-1');
    });

    it('getReplenishmentStatus がReplenishmentWorkflowに委譲すること / 委托补充状态', async () => {
      const { WorkflowEngine } = await import('../workflowEngine');
      const status = await WorkflowEngine.getReplenishmentStatus('WH-1');
      expect(status).toEqual({ pending: 2, inProgress: 1, completed: 10, total: 13 });
      expect(ReplenishmentWorkflow.getReplenishmentStatus).toHaveBeenCalledWith('WH-1');
    });
  });

  // ─── Summary ───

  describe('getWorkflowSummary / ワークフローサマリー', () => {
    it('全ワークフローの集計を返すこと / 返回所有工作流汇总', async () => {
      vi.mocked(WarehouseTask.countDocuments)
        .mockResolvedValueOnce(3 as any)  // inbound active
        .mockResolvedValueOnce(1 as any)  // picking in progress
        .mockResolvedValueOnce(2 as any); // replenishment pending
      vi.mocked(Wave.countDocuments).mockResolvedValue(2 as any);

      const { WorkflowEngine } = await import('../workflowEngine');
      const summary = await WorkflowEngine.getWorkflowSummary('WH-1');

      expect(summary).toEqual({
        inbound: { active: 3 },
        outbound: { activeWaves: 2, pickingInProgress: 1 },
        replenishment: { pending: 2 },
      });
    });
  });
});
