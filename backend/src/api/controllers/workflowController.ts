import type { Request, Response } from 'express';
import { WorkflowEngine } from '@/services/workflowEngine';

// ─── Inbound ───

/** 入荷検品開始 */
export const startReceiving = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const { executedBy } = req.body;

    const result = await WorkflowEngine.startInboundReceiving(orderId, executedBy);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: 'ワークフロー：入荷検品の開始に失敗しました', error: error.message });
  }
};

/** 入荷明細確認 */
export const confirmLine = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const { lineNumber, receivedQuantity, executedBy } = req.body;

    if (lineNumber == null) {
      res.status(400).json({ message: 'lineNumber は必須です' });
      return;
    }
    if (receivedQuantity == null) {
      res.status(400).json({ message: 'receivedQuantity は必須です' });
      return;
    }

    const result = await WorkflowEngine.confirmInboundLine(orderId, lineNumber, receivedQuantity, executedBy);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: 'ワークフロー：入荷明細の確認に失敗しました', error: error.message });
  }
};

/** 入荷格納開始 */
export const startPutaway = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const { executedBy } = req.body;

    const result = await WorkflowEngine.startInboundPutaway(orderId, executedBy);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: 'ワークフロー：格納の開始に失敗しました', error: error.message });
  }
};

/** 入荷格納完了 */
export const completePutaway = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const { lineNumber, putawayLocationId, putawayQuantity, executedBy } = req.body;

    if (lineNumber == null) {
      res.status(400).json({ message: 'lineNumber は必須です' });
      return;
    }
    if (!putawayLocationId) {
      res.status(400).json({ message: 'putawayLocationId は必須です' });
      return;
    }
    if (putawayQuantity == null) {
      res.status(400).json({ message: 'putawayQuantity は必須です' });
      return;
    }

    const result = await WorkflowEngine.completeInboundPutaway(orderId, lineNumber, putawayLocationId, putawayQuantity, executedBy);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: 'ワークフロー：格納の完了に失敗しました', error: error.message });
  }
};

/** 入荷ステータス取得 */
export const getInboundStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;

    const result = await WorkflowEngine.getInboundStatus(orderId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: 'ワークフロー：入荷ステータスの取得に失敗しました', error: error.message });
  }
};

// ─── Outbound ───

/** 出荷ウェーブ作成 */
export const createWave = async (req: Request, res: Response): Promise<void> => {
  try {
    const { warehouseId, shipmentOrderIds, priority, assignedTo, memo } = req.body;

    if (!warehouseId) {
      res.status(400).json({ message: 'warehouseId は必須です' });
      return;
    }
    if (!shipmentOrderIds || !Array.isArray(shipmentOrderIds) || shipmentOrderIds.length === 0) {
      res.status(400).json({ message: 'shipmentOrderIds は必須です' });
      return;
    }

    const result = await WorkflowEngine.createOutboundWave({ warehouseId, shipmentOrderIds, priority, assignedTo, memo });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: 'ワークフロー：出荷ウェーブの作成に失敗しました', error: error.message });
  }
};

/** ピッキング開始 */
export const startPicking = async (req: Request, res: Response): Promise<void> => {
  try {
    const { waveId } = req.params;
    const { executedBy } = req.body;

    const result = await WorkflowEngine.startOutboundPicking(waveId, executedBy);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: 'ワークフロー：ピッキングの開始に失敗しました', error: error.message });
  }
};

/** ピッキングタスク完了 */
export const completePickTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const { pickedQuantity, executedBy } = req.body;

    if (pickedQuantity == null) {
      res.status(400).json({ message: 'pickedQuantity は必須です' });
      return;
    }

    const result = await WorkflowEngine.completePickingTask(taskId, pickedQuantity, executedBy);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: 'ワークフロー：ピッキングタスクの完了に失敗しました', error: error.message });
  }
};

/** 仕分け開始 */
export const startSorting = async (req: Request, res: Response): Promise<void> => {
  try {
    const { waveId } = req.params;
    const { executedBy } = req.body;

    const result = await WorkflowEngine.startOutboundSorting(waveId, executedBy);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: 'ワークフロー：仕分けの開始に失敗しました', error: error.message });
  }
};

/** 仕分け完了 */
export const completeSorting = async (req: Request, res: Response): Promise<void> => {
  try {
    const { waveId } = req.params;
    const { executedBy } = req.body;

    const result = await WorkflowEngine.completeOutboundSorting(waveId, executedBy);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: 'ワークフロー：仕分けの完了に失敗しました', error: error.message });
  }
};

/** 梱包完了 */
export const completePacking = async (req: Request, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const { executedBy } = req.body;

    const result = await WorkflowEngine.completeOutboundPacking(taskId, executedBy);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: 'ワークフロー：梱包の完了に失敗しました', error: error.message });
  }
};

/** 出荷進捗取得 */
export const getOutboundProgress = async (req: Request, res: Response): Promise<void> => {
  try {
    const { waveId } = req.params;

    const result = await WorkflowEngine.getOutboundProgress(waveId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: 'ワークフロー：出荷進捗の取得に失敗しました', error: error.message });
  }
};

// ─── Replenishment ───

/** 補充トリガー */
export const triggerReplenishment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { warehouseId, executedBy } = req.body;

    if (!warehouseId) {
      res.status(400).json({ message: 'warehouseId は必須です' });
      return;
    }

    const result = await WorkflowEngine.triggerReplenishment(warehouseId, executedBy);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: 'ワークフロー：補充のトリガーに失敗しました', error: error.message });
  }
};

/** 補充完了 */
export const completeReplenish = async (req: Request, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const { movedQuantity, executedBy } = req.body;

    if (movedQuantity == null) {
      res.status(400).json({ message: 'movedQuantity は必須です' });
      return;
    }

    const result = await WorkflowEngine.completeReplenishment(taskId, movedQuantity, executedBy);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: 'ワークフロー：補充の完了に失敗しました', error: error.message });
  }
};

/** 補充ステータス取得 */
export const getReplenishStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const warehouseId = req.query.warehouseId as string | undefined;

    if (!warehouseId) {
      res.status(400).json({ message: 'warehouseId は必須です' });
      return;
    }

    const result = await WorkflowEngine.getReplenishmentStatus(warehouseId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: 'ワークフロー：補充ステータスの取得に失敗しました', error: error.message });
  }
};

// ─── Summary ───

/** ワークフローサマリー取得 */
export const getSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const warehouseId = req.query.warehouseId as string | undefined;

    if (!warehouseId) {
      res.status(400).json({ message: 'warehouseId は必須です' });
      return;
    }

    const result = await WorkflowEngine.getWorkflowSummary(warehouseId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: 'ワークフロー：サマリーの取得に失敗しました', error: error.message });
  }
};
