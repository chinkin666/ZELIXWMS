import { InboundWorkflow } from '@/services/inboundWorkflow';
import { OutboundWorkflow } from '@/services/outboundWorkflow';
import { ReplenishmentWorkflow } from '@/services/replenishmentWorkflow';
import { WarehouseTask, IWarehouseTask } from '@/models/warehouseTask';
import { Wave, IWave } from '@/models/wave';

interface WorkflowSummary {
  inbound: {
    active: number;
  };
  outbound: {
    activeWaves: number;
    pickingInProgress: number;
  };
  replenishment: {
    pending: number;
  };
}

/**
 * ワークフローエンジン
 * 全ワークフロー（入庫・出庫・補充）の統合エントリーポイント
 */
export class WorkflowEngine {
  // ─── Inbound Methods ───

  static async startInboundReceiving(
    orderId: string,
    executedBy?: string,
  ) {
    return InboundWorkflow.startReceiving(orderId, executedBy);
  }

  static async confirmInboundLine(
    orderId: string,
    lineNumber: number,
    receivedQuantity: number,
    executedBy?: string,
  ) {
    return InboundWorkflow.confirmReceiveLine(orderId, lineNumber, receivedQuantity, executedBy);
  }

  static async startInboundPutaway(
    orderId: string,
    executedBy?: string,
  ) {
    return InboundWorkflow.startPutaway(orderId, executedBy);
  }

  static async completeInboundPutaway(
    orderId: string,
    lineNumber: number,
    locationId: string,
    quantity: number,
    executedBy?: string,
  ) {
    return InboundWorkflow.completePutaway(orderId, lineNumber, locationId, quantity, executedBy);
  }

  static async getInboundStatus(orderId: string) {
    return InboundWorkflow.getWorkflowStatus(orderId);
  }

  // ─── Outbound Methods ───

  static async createOutboundWave(params: {
    warehouseId: string;
    shipmentOrderIds: string[];
    priority?: string;
    assignedTo?: string;
    memo?: string;
  }) {
    return OutboundWorkflow.createWave(params);
  }

  static async startOutboundPicking(
    waveId: string,
    executedBy?: string,
  ) {
    return OutboundWorkflow.startPicking(waveId, executedBy);
  }

  static async completePickingTask(
    taskId: string,
    pickedQuantity: number,
    executedBy?: string,
  ) {
    return OutboundWorkflow.completePickingTask(taskId, pickedQuantity, executedBy);
  }

  static async startOutboundSorting(
    waveId: string,
    executedBy?: string,
  ) {
    return OutboundWorkflow.startSorting(waveId, executedBy);
  }

  static async completeOutboundSorting(
    waveId: string,
    executedBy?: string,
  ) {
    return OutboundWorkflow.completeSorting(waveId, executedBy);
  }

  static async completeOutboundPacking(
    taskId: string,
    executedBy?: string,
  ) {
    return OutboundWorkflow.completePacking(taskId, executedBy);
  }

  static async getOutboundProgress(waveId: string) {
    return OutboundWorkflow.getWaveProgress(waveId);
  }

  // ─── Replenishment Methods ───

  static async triggerReplenishment(
    warehouseId: string,
    executedBy?: string,
  ) {
    return ReplenishmentWorkflow.checkAndTrigger(warehouseId, executedBy);
  }

  static async completeReplenishment(
    taskId: string,
    movedQuantity: number,
    executedBy?: string,
  ) {
    return ReplenishmentWorkflow.completeReplenishment(taskId, movedQuantity, executedBy);
  }

  static async getReplenishmentStatus(warehouseId: string) {
    return ReplenishmentWorkflow.getReplenishmentStatus(warehouseId);
  }

  // ─── Utility ───

  /**
   * Get a combined workflow summary for a warehouse across all workflow types.
   */
  static async getWorkflowSummary(warehouseId: string): Promise<WorkflowSummary> {
    // Run all queries in parallel for performance
    const [
      activeInboundCount,
      activeWaveCount,
      pickingInProgressCount,
      replenishmentPendingCount,
    ] = await Promise.all([
      // Active inbound tasks (receiving or putaway, not completed/cancelled)
      WarehouseTask.countDocuments({
        warehouseId,
        type: { $in: ['receiving', 'putaway'] },
        status: { $in: ['created', 'assigned', 'in_progress'] },
      }),
      // Active waves (not completed/cancelled)
      Wave.countDocuments({
        warehouseId,
        status: { $nin: ['completed', 'cancelled'] },
      }),
      // Picking tasks currently in progress
      WarehouseTask.countDocuments({
        warehouseId,
        type: 'picking',
        status: 'in_progress',
      }),
      // Pending replenishment tasks
      WarehouseTask.countDocuments({
        warehouseId,
        type: 'replenishment',
        status: { $in: ['created', 'assigned'] },
      }),
    ]);

    return {
      inbound: {
        active: activeInboundCount,
      },
      outbound: {
        activeWaves: activeWaveCount,
        pickingInProgress: pickingInProgressCount,
      },
      replenishment: {
        pending: replenishmentPendingCount,
      },
    };
  }
}
