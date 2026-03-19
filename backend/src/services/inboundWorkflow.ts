import mongoose from 'mongoose';
import { InboundOrder, IInboundOrder } from '@/models/inboundOrder';
import { InventoryLedger } from '@/models/inventoryLedger';
import { Location } from '@/models/location';
import { WarehouseTask, IWarehouseTask } from '@/models/warehouseTask';
import { TaskEngine } from '@/services/taskEngine';
import { RuleEngine } from '@/services/ruleEngine';
import { extensionManager } from '@/core/extensions';
import { HOOK_EVENTS } from '@/core/extensions/types';

interface WorkflowProgress {
  totalLines: number;
  receivedLines: number;
  putawayLines: number;
}

interface WorkflowStatus {
  order: IInboundOrder;
  tasks: IWarehouseTask[];
  progress: WorkflowProgress;
}

/**
 * 入荷ワークフローサービス
 * 入荷 → 検品 → 棚入れ → 在庫記帳 の一連のプロセスをオーケストレーションする
 */
export class InboundWorkflow {
  /**
   * 入荷開始：confirmed → receiving に遷移し、各ラインの receiving タスクを作成する
   */
  static async startReceiving(
    orderId: string,
    executedBy?: string,
  ): Promise<IWarehouseTask[]> {
    try {
      const order = await InboundOrder.findById(orderId);
      if (!order) {
        throw new Error(`入荷指示が見つかりません: ${orderId}`);
      }
      if (order.status !== 'confirmed') {
        throw new Error(
          `入荷開始できません。現在のステータス: '${order.status}'（'confirmed' が必要です）`,
        );
      }

      // destinationLocation から warehouseId を取得
      const destinationLocation = await Location.findById(order.destinationLocationId).lean();
      if (!destinationLocation) {
        throw new Error(
          `入荷先ロケーションが見つかりません: ${String(order.destinationLocationId)}`,
        );
      }
      const warehouseId = destinationLocation.warehouseId
        ? String(destinationLocation.warehouseId)
        : String(destinationLocation._id);

      order.status = 'receiving';
      await order.save();

      const tasks: IWarehouseTask[] = [];
      for (const line of order.lines) {
        const task = await TaskEngine.createTask({
          type: 'receiving',
          warehouseId,
          productId: String(line.productId),
          productSku: line.productSku,
          productName: line.productName,
          requiredQuantity: line.expectedQuantity,
          toLocationId: String(order.destinationLocationId),
          referenceType: 'inbound-order',
          referenceId: String(order._id),
          referenceNumber: order.orderNumber,
          lotId: line.lotId ? String(line.lotId) : undefined,
          lotNumber: line.lotNumber,
        });
        tasks.push(task);
      }

      return tasks;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`入荷開始に失敗しました: ${message}`);
    }
  }

  /**
   * 検品完了：特定ラインの受入数量を更新し、在庫台帳に記帳する
   * 全ライン受入完了時に order ステータスを 'received' に更新する
   */
  static async confirmReceiveLine(
    orderId: string,
    lineNumber: number,
    receivedQuantity: number,
    executedBy?: string,
  ): Promise<IInboundOrder> {
    try {
      const order = await InboundOrder.findById(orderId);
      if (!order) {
        throw new Error(`入荷指示が見つかりません: ${orderId}`);
      }

      const line = order.lines.find((l) => l.lineNumber === lineNumber);
      if (!line) {
        throw new Error(
          `ライン番号 ${lineNumber} が入荷指示 ${order.orderNumber} に見つかりません`,
        );
      }

      line.receivedQuantity = receivedQuantity;

      // 在庫台帳に入荷記帳
      await InventoryLedger.create({
        productId: line.productId,
        productSku: line.productSku,
        locationId: order.destinationLocationId,
        lotId: line.lotId,
        lotNumber: line.lotNumber,
        type: 'inbound',
        quantity: receivedQuantity,
        referenceType: 'inbound-order',
        referenceId: String(order._id),
        referenceNumber: order.orderNumber,
        executedBy,
        executedAt: new Date(),
      });

      // 全ライン受入完了チェック / 全ライン受入完了チェック
      const allReceived = order.lines.every(
        (l) => l.receivedQuantity >= l.expectedQuantity,
      );
      if (allReceived) {
        order.status = 'received';
      }

      await order.save();

      // 全ライン受入完了時に事件发射 / 全ライン受入完了時にイベント発行
      if (allReceived) {
        extensionManager.emit(HOOK_EVENTS.INBOUND_RECEIVED, {
          orderId,
          orderNumber: order.orderNumber,
        }).catch(() => {/* サイレント */});
      }

      return order;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`検品確認に失敗しました: ${message}`);
    }
  }

  /**
   * 棚入れ開始：received → putaway タスクを作成する
   * RuleEngine で棚入れ先ロケーションを決定する
   */
  static async startPutaway(
    orderId: string,
    executedBy?: string,
  ): Promise<IWarehouseTask[]> {
    try {
      const order = await InboundOrder.findById(orderId);
      if (!order) {
        throw new Error(`入荷指示が見つかりません: ${orderId}`);
      }
      if (order.status !== 'received') {
        throw new Error(
          `棚入れ開始できません。現在のステータス: '${order.status}'（'received' が必要です）`,
        );
      }

      const destinationLocation = await Location.findById(order.destinationLocationId).lean();
      if (!destinationLocation) {
        throw new Error(
          `入荷先ロケーションが見つかりません: ${String(order.destinationLocationId)}`,
        );
      }
      const warehouseId = destinationLocation.warehouseId
        ? String(destinationLocation.warehouseId)
        : String(destinationLocation._id);

      // RuleEngine で棚入れルールを評価
      const ruleResults = await RuleEngine.evaluate(
        'putaway',
        { order: order.toObject(), lines: order.toObject().lines },
        { warehouseId },
      );

      // ルール結果から assign_location アクションを抽出（ルール順に最初にマッチしたものを使う）
      let ruleLocationId: string | undefined;
      for (const result of ruleResults) {
        for (const action of result.actions) {
          if (action.type === 'assign_location' && action.params?.locationId) {
            ruleLocationId = String(action.params.locationId);
            break;
          }
        }
        if (ruleLocationId) break;
      }

      const tasks: IWarehouseTask[] = [];
      for (const line of order.lines) {
        // 棚入れ先の決定優先度: ルールエンジン > ライン指定 > 入荷先デフォルト
        const toLocationId =
          ruleLocationId ??
          (line.putawayLocationId ? String(line.putawayLocationId) : undefined) ??
          String(order.destinationLocationId);

        const task = await TaskEngine.createTask({
          type: 'putaway',
          warehouseId,
          productId: String(line.productId),
          productSku: line.productSku,
          productName: line.productName,
          requiredQuantity: line.receivedQuantity,
          fromLocationId: String(order.destinationLocationId),
          toLocationId,
          referenceType: 'inbound-order',
          referenceId: String(order._id),
          referenceNumber: order.orderNumber,
          lotId: line.lotId ? String(line.lotId) : undefined,
          lotNumber: line.lotNumber,
        });
        tasks.push(task);
      }

      return tasks;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`棚入れ開始に失敗しました: ${message}`);
    }
  }

  /**
   * 棚入れ完了：特定ラインの棚入れ情報を更新し、在庫台帳に記帳する
   * 全ライン棚入れ完了時に order ステータスを 'done' に更新する
   */
  static async completePutaway(
    orderId: string,
    lineNumber: number,
    putawayLocationId: string,
    putawayQuantity: number,
    executedBy?: string,
  ): Promise<IInboundOrder> {
    try {
      const order = await InboundOrder.findById(orderId);
      if (!order) {
        throw new Error(`入荷指示が見つかりません: ${orderId}`);
      }

      const line = order.lines.find((l) => l.lineNumber === lineNumber);
      if (!line) {
        throw new Error(
          `ライン番号 ${lineNumber} が入荷指示 ${order.orderNumber} に見つかりません`,
        );
      }

      line.putawayLocationId = new mongoose.Types.ObjectId(putawayLocationId);
      line.putawayQuantity = putawayQuantity;

      // 棚入れ先ロケーションへの在庫台帳記帳
      await InventoryLedger.create({
        productId: line.productId,
        productSku: line.productSku,
        locationId: putawayLocationId,
        lotId: line.lotId,
        lotNumber: line.lotNumber,
        type: 'inbound',
        quantity: putawayQuantity,
        referenceType: 'inbound-order',
        referenceId: String(order._id),
        referenceNumber: order.orderNumber,
        reason: '棚入れ',
        executedBy,
        executedAt: new Date(),
      });

      // 全ライン棚入れ完了チェック / 全ライン棚入れ完了チェック
      const allPutaway = order.lines.every(
        (l) => l.putawayQuantity >= l.receivedQuantity && l.receivedQuantity > 0,
      );
      if (allPutaway) {
        order.status = 'done';
        order.completedAt = new Date();
      }

      await order.save();

      // 全ライン棚入れ完了時にイベント発行 / 全ライン棚入れ完了時にイベント発行
      if (allPutaway) {
        extensionManager.emit(HOOK_EVENTS.INBOUND_PUTAWAY_COMPLETED, {
          orderId,
          orderNumber: order.orderNumber,
        }).catch(() => {/* サイレント */});
      }

      return order;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`棚入れ完了に失敗しました: ${message}`);
    }
  }

  /**
   * 部分入荷：指定ラインの一部のみ受け入れ、残りを次回入荷に繰り越す
   * 部分入库：接收指定行的部分数量，剩余转入下次入库
   *
   * 日本の3PL現場では、サプライヤーが複数回に分けて納品することが一般的。
   * 日本3PL现场，供应商分多次交货很常见。
   */
  static async partialReceive(
    orderId: string,
    lineNumber: number,
    receivedQuantity: number,
    executedBy?: string,
  ): Promise<IInboundOrder> {
    try {
      const order = await InboundOrder.findById(orderId);
      if (!order) {
        throw new Error(`入荷指示が見つかりません: ${orderId}`);
      }

      const line = order.lines.find((l) => l.lineNumber === lineNumber);
      if (!line) {
        throw new Error(`ライン番号 ${lineNumber} が見つかりません`);
      }

      // 部分入荷：既存の受入数に加算 / 部分入库：加到已接收数量
      const previousReceived = line.receivedQuantity || 0;
      const totalReceived = previousReceived + receivedQuantity;

      if (totalReceived > line.expectedQuantity) {
        throw new Error(
          `受入合計(${totalReceived})が予定数量(${line.expectedQuantity})を超えています / ` +
          `接收总量(${totalReceived})超过预期数量(${line.expectedQuantity})`,
        );
      }

      line.receivedQuantity = totalReceived;

      // 在庫台帳に増分のみ記帳 / 仅记录增量到台帐
      await InventoryLedger.create({
        productId: line.productId,
        productSku: line.productSku,
        locationId: order.destinationLocationId,
        lotId: line.lotId,
        lotNumber: line.lotNumber,
        type: 'inbound',
        quantity: receivedQuantity,
        referenceType: 'inbound-order',
        referenceId: String(order._id),
        referenceNumber: order.orderNumber,
        reason: `部分入荷（${totalReceived}/${line.expectedQuantity}）/ 部分入库`,
        executedBy,
        executedAt: new Date(),
      });

      // 全ライン受入完了チェック
      const allReceived = order.lines.every(
        (l) => l.receivedQuantity >= l.expectedQuantity,
      );
      if (allReceived) {
        order.status = 'received';
        extensionManager.emit(HOOK_EVENTS.INBOUND_RECEIVED, {
          orderId,
          orderNumber: order.orderNumber,
        }).catch(() => {});
      }

      await order.save();
      return order;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`部分入荷に失敗しました: ${message}`);
    }
  }

  /**
   * 入荷検品で不良品を報告（損傷・数量不一致）
   * 入库检品时报告不良品（损坏/数量不一致）
   *
   * 日本の3PL倉庫では、入荷時の検品で破損品を発見した場合、
   * 隔離ゾーンに移動し荷主に連絡するのが一般的。
   */
  static async reportDamage(
    orderId: string,
    lineNumber: number,
    damagedQuantity: number,
    reason: string,
    executedBy?: string,
  ): Promise<IInboundOrder> {
    try {
      const order = await InboundOrder.findById(orderId);
      if (!order) {
        throw new Error(`入荷指示が見つかりません: ${orderId}`);
      }

      const line = order.lines.find((l) => l.lineNumber === lineNumber);
      if (!line) {
        throw new Error(`ライン番号 ${lineNumber} が見つかりません`);
      }

      if (damagedQuantity > line.expectedQuantity) {
        throw new Error(
          `損傷数(${damagedQuantity})が予定数量(${line.expectedQuantity})を超えています`,
        );
      }

      // 損傷情報をメモに記録 / 在备注中记录损坏信息
      const existingMemo = line.memo || '';
      const damageNote = `[損傷報告 / 损坏报告] ${damagedQuantity}個 - ${reason} (${executedBy || 'system'}, ${new Date().toISOString()})`;
      line.memo = existingMemo ? `${existingMemo}\n${damageNote}` : damageNote;

      // 在庫台帳に損傷記録 / 在台帐中记录损坏
      await InventoryLedger.create({
        productId: line.productId,
        productSku: line.productSku,
        locationId: order.destinationLocationId,
        lotId: line.lotId,
        lotNumber: line.lotNumber,
        type: 'adjustment',
        quantity: -damagedQuantity,
        referenceType: 'inbound-order',
        referenceId: String(order._id),
        referenceNumber: order.orderNumber,
        reason: `入荷損傷: ${reason} / 入库损坏: ${reason}`,
        executedBy,
        executedAt: new Date(),
      });

      await order.save();

      // 損傷イベント発行（通知サービスやWebhookで活用）
      // 发出损坏事件（供通知服务和Webhook使用）
      extensionManager.emit(HOOK_EVENTS.INBOUND_DAMAGE_REPORTED, {
        orderId: String(order._id),
        orderNumber: order.orderNumber,
        lineNumber,
        productSku: line.productSku,
        damagedQuantity,
        reason,
      }).catch(() => {});

      return order;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`損傷報告に失敗しました: ${message}`);
    }
  }

  /**
   * ワークフロー進捗取得：入荷指示と関連タスク、進捗情報を返す
   */
  static async getWorkflowStatus(orderId: string): Promise<WorkflowStatus> {
    try {
      const order = await InboundOrder.findById(orderId);
      if (!order) {
        throw new Error(`入荷指示が見つかりません: ${orderId}`);
      }

      const tasks = await WarehouseTask.find({
        referenceType: 'inbound-order',
        referenceId: String(order._id),
      }).lean<IWarehouseTask[]>();

      const totalLines = order.lines.length;
      const receivedLines = order.lines.filter(
        (l) => l.receivedQuantity >= l.expectedQuantity,
      ).length;
      const putawayLines = order.lines.filter(
        (l) => l.putawayQuantity >= l.receivedQuantity && l.receivedQuantity > 0,
      ).length;

      return {
        order,
        tasks,
        progress: {
          totalLines,
          receivedLines,
          putawayLines,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`ワークフロー状態の取得に失敗しました: ${message}`);
    }
  }
}
