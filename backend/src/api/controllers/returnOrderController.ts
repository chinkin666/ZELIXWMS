import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { ReturnOrder } from '@/models/returnOrder';
import { ShipmentOrder } from '@/models/shipmentOrder';
import { StockQuant } from '@/models/stockQuant';
import { StockMove } from '@/models/stockMove';
import { Location } from '@/models/location';
import { Product } from '@/models/product';
import { extensionManager } from '@/core/extensions';
import { HOOK_EVENTS } from '@/core/extensions/types';
import { logOperation } from '@/services/operationLogger';
import { createReturnOrderSchema, inspectLinesSchema } from '@/schemas/returnOrderSchema';
import { checkTransactionSupport } from '@/config/database';
import { logger } from '@/lib/logger';

// ---------------------------------------------------------------------------
// 番号生成
// ---------------------------------------------------------------------------
function generateOrderNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(10000000 + Math.random() * 90000000);
  return `RT${dateStr}-${rand}`;
}

// ---------------------------------------------------------------------------
// GET /api/return-orders
// ---------------------------------------------------------------------------
export async function listReturnOrders(req: Request, res: Response) {
  try {
    const { status, page = '1', limit = '50' } = req.query;
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [docs, total] = await Promise.all([
      ReturnOrder.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      ReturnOrder.countDocuments(filter),
    ]);

    res.json({ data: docs, total, page: Number(page), limit: Number(limit) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// ---------------------------------------------------------------------------
// GET /api/return-orders/:id
// ---------------------------------------------------------------------------
export async function getReturnOrder(req: Request, res: Response) {
  try {
    const doc = await ReturnOrder.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: '返品指示が見つかりません' });
    res.json(doc);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// ---------------------------------------------------------------------------
// POST /api/return-orders
// ---------------------------------------------------------------------------
export async function createReturnOrder(req: Request, res: Response) {
  try {
    // Zodバリデーション / Zod验证
    const parsed = createReturnOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ') });
    }

    const {
      shipmentOrderId,
      returnReason,
      reasonDetail,
      customerName,
      receivedDate,
      lines,
      memo,
    } = req.body;

    // 元出荷指示から情報取得
    let shipmentOrderNumber: string | undefined;
    if (shipmentOrderId) {
      const so = await ShipmentOrder.findById(shipmentOrderId).lean();
      if (so) {
        shipmentOrderNumber = so.orderNumber;
      }
    }

    // 商品情報のdenormalize
    const enrichedLines = [];
    for (let i = 0; i < (lines || []).length; i++) {
      const line = lines[i];
      let productName = line.productName;
      let productSku = line.productSku;

      if (line.productId && (!productName || !productSku)) {
        const prod = await Product.findById(line.productId).lean();
        if (prod) {
          productSku = productSku || prod.sku;
          productName = productName || prod.name;
        }
      }

      enrichedLines.push({
        lineNumber: i + 1,
        productId: line.productId,
        productSku: productSku || '',
        productName,
        quantity: line.quantity,
        inspectedQuantity: 0,
        disposition: 'pending',
        restockedQuantity: 0,
        disposedQuantity: 0,
        locationId: line.locationId,
        lotId: line.lotId,
        lotNumber: line.lotNumber,
        memo: line.memo,
      });
    }

    const doc = await ReturnOrder.create({
      orderNumber: generateOrderNumber(),
      status: 'draft',
      shipmentOrderId,
      shipmentOrderNumber,
      returnReason,
      reasonDetail,
      customerName,
      receivedDate: receivedDate || new Date(),
      lines: enrichedLines,
      memo,
    });

    // 操作ログ記録 / 操作日志记录
    logOperation({
      action: 'return_receive',
      category: 'return',
      description: `返品指示を作成: ${doc.orderNumber}（${enrichedLines.length}行）`,
      referenceNumber: doc.orderNumber,
      referenceType: 'returnOrder',
      referenceId: String(doc._id),
      quantity: enrichedLines.reduce((s, l) => s + (l.quantity || 0), 0),
    }).catch(() => {});

    res.status(201).json(doc.toObject());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// ---------------------------------------------------------------------------
// PUT /api/return-orders/:id
// ---------------------------------------------------------------------------
export async function updateReturnOrder(req: Request, res: Response) {
  try {
    const doc = await ReturnOrder.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: '返品指示が見つかりません' });
    if (doc.status === 'completed' || doc.status === 'cancelled') {
      return res.status(400).json({ error: 'この状態では編集できません' });
    }

    const allowedFields = ['returnReason', 'reasonDetail', 'customerName', 'receivedDate', 'lines', 'memo'] as const;
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        (doc as any)[field] = req.body[field];
      }
    }

    await doc.save();
    res.json(doc.toObject());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// ---------------------------------------------------------------------------
// POST /api/return-orders/:id/start-inspection - 検品開始
// ---------------------------------------------------------------------------
export async function startInspection(req: Request, res: Response) {
  try {
    const doc = await ReturnOrder.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: '返品指示が見つかりません' });
    if (doc.status !== 'draft') {
      return res.status(400).json({ error: 'ドラフト状態のみ検品開始できます' });
    }

    doc.status = 'inspecting';
    await doc.save();

    // 操作ログ記録 / 操作日志记录
    logOperation({
      action: 'return_inspect',
      category: 'return',
      description: `検品開始: ${doc.orderNumber}`,
      referenceNumber: doc.orderNumber,
      referenceType: 'returnOrder',
      referenceId: String(doc._id),
    }).catch(() => {});

    res.json(doc.toObject());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// ---------------------------------------------------------------------------
// POST /api/return-orders/:id/inspect - 検品結果登録
// ---------------------------------------------------------------------------
export async function inspectLines(req: Request, res: Response) {
  try {
    const doc = await ReturnOrder.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: '返品指示が見つかりません' });
    if (doc.status !== 'inspecting') {
      return res.status(400).json({ error: '検品中の返品のみ検品可能です' });
    }

    // Zodバリデーション / Zod验证
    const parsed = inspectLinesSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ') });
    }

    const { lines: inspections } = parsed.data;
    const warnings: string[] = [];

    // 数量バリデーション / 数量验证
    for (const insp of inspections) {
      const line = doc.lines[insp.lineIndex];
      if (!line) {
        return res.status(400).json({ error: `lineIndex ${insp.lineIndex}: 該当する明細が存在しません` });
      }

      // inspectedQuantityは0以上かつ元数量以下 / inspectedQuantity必须>=0且<=原始数量
      if (insp.inspectedQuantity > line.quantity) {
        return res.status(400).json({
          error: `lineIndex ${insp.lineIndex}: 検品数量(${insp.inspectedQuantity})が元数量(${line.quantity})を超えています`,
        });
      }

      // restockedQuantity + disposedQuantity <= inspectedQuantity
      const restocked = insp.restockedQuantity ?? 0;
      const disposed = insp.disposedQuantity ?? 0;
      if (restocked + disposed > insp.inspectedQuantity) {
        return res.status(400).json({
          error: `lineIndex ${insp.lineIndex}: 再入庫数(${restocked})+廃棄数(${disposed})が検品数量(${insp.inspectedQuantity})を超えています`,
        });
      }

      // restockの場合、locationIdが設定されていることを推奨 / restock时建议设置locationId
      if (insp.disposition === 'restock' && !insp.locationId) {
        warnings.push(`lineIndex ${insp.lineIndex}: 再入庫の場合、入庫先ロケーション(locationId)の設定を推奨します`);
      }
    }

    for (const insp of inspections) {
      const line = doc.lines[insp.lineIndex];
      line.inspectedQuantity = insp.inspectedQuantity;
      line.disposition = insp.disposition;
      line.restockedQuantity = insp.restockedQuantity ?? 0;
      line.disposedQuantity = insp.disposedQuantity ?? 0;
      if (insp.locationId !== undefined) line.locationId = insp.locationId as any;
    }

    await doc.save();

    // 操作ログ記録 / 操作日志记录
    logOperation({
      action: 'return_inspect',
      category: 'return',
      description: `検品結果登録: ${doc.orderNumber}（${inspections.length}行）`,
      referenceNumber: doc.orderNumber,
      referenceType: 'returnOrder',
      referenceId: String(doc._id),
    }).catch(() => {});

    const result: Record<string, unknown> = { ...doc.toObject() };
    if (warnings.length > 0) {
      result.warnings = warnings;
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// ---------------------------------------------------------------------------
// POST /api/return-orders/:id/complete - 返品完了 (在庫反映)
// ---------------------------------------------------------------------------
export async function completeReturnOrder(req: Request, res: Response) {
  try {
    const doc = await ReturnOrder.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: '返品指示が見つかりません' });
    if (doc.status !== 'inspecting') {
      return res.status(400).json({ error: '検品中の返品のみ完了できます' });
    }

    // 全行が検品済みか確認 / 检查所有行是否已检品
    const pendingLines = doc.lines.filter((l) => l.disposition === 'pending');
    if (pendingLines.length > 0) {
      return res.status(400).json({
        error: `未判定の明細が${pendingLines.length}件あります`,
      });
    }

    // 仮想ロケーション取得 / 获取虚拟位置
    const virtualCustomer = await Location.findOne({ type: 'virtual/customer' }).lean();
    if (!virtualCustomer) {
      return res.status(400).json({ error: '仮想ロケーション(VIRTUAL/CUSTOMER)が見つかりません' });
    }

    // トランザクション対応で在庫更新を実行 / 使用事务保护执行库存更新
    const useTransaction = await checkTransactionSupport();

    // TypeScript制御フロー用の非null参照 / 为TypeScript控制流分析提供非null引用
    const order = doc;
    const virtualLoc = virtualCustomer;

    async function executeCompletion(opts: { session?: mongoose.ClientSession }) {
      const errors: string[] = [];
      let restockedTotal = 0;
      let disposedTotal = 0;

      for (const line of order.lines) {
        const now = new Date();

        // 再入庫処理 / 重新入库处理
        if (line.disposition === 'restock' && line.restockedQuantity > 0) {
          const targetLocationId = line.locationId;
          if (!targetLocationId) {
            errors.push(`${line.productSku}: 入庫先ロケーションが未設定です`);
            continue;
          }

          const moveNumber = `SM${now.toISOString().slice(0, 10).replace(/-/g, '')}${Math.floor(10000000 + Math.random() * 90000000)}`;
          await StockMove.create(
            [
              {
                moveNumber,
                moveType: 'return',
                state: 'done',
                productId: line.productId,
                productSku: line.productSku,
                productName: line.productName,
                lotId: line.lotId,
                fromLocationId: virtualLoc._id,
                toLocationId: targetLocationId,
                quantity: line.restockedQuantity,
                referenceType: 'return-order',
                referenceId: String(order._id),
                referenceNumber: order.orderNumber,
                executedAt: now,
                memo: `返品再入庫`,
              },
            ],
            opts,
          );

          // StockQuant増加 / 增加StockQuant
          const quantFilter = {
            productId: line.productId,
            locationId: targetLocationId,
            ...(line.lotId ? { lotId: line.lotId } : {}),
          };
          await StockQuant.findOneAndUpdate(
            quantFilter,
            {
              $inc: { quantity: line.restockedQuantity },
              $setOnInsert: { productSku: line.productSku },
            },
            { upsert: true, ...opts },
          );

          restockedTotal += line.restockedQuantity;
        }

        // 廃棄処理（StockMoveのみ記録、在庫は増やさない） / 废弃处理（仅记录StockMove，不增加库存）
        if (line.disposition === 'dispose' && line.disposedQuantity > 0) {
          const moveNumber = `SM${now.toISOString().slice(0, 10).replace(/-/g, '')}${Math.floor(10000000 + Math.random() * 90000000)}`;
          await StockMove.create(
            [
              {
                moveNumber,
                moveType: 'return',
                state: 'done',
                productId: line.productId,
                productSku: line.productSku,
                productName: line.productName,
                lotId: line.lotId,
                fromLocationId: virtualLoc._id,
                toLocationId: virtualLoc._id,
                quantity: line.disposedQuantity,
                referenceType: 'return-order',
                referenceId: String(order._id),
                referenceNumber: order.orderNumber,
                executedAt: now,
                memo: `返品廃棄`,
              },
            ],
            opts,
          );

          disposedTotal += line.disposedQuantity;
        }
      }

      order.status = 'completed';
      order.completedAt = new Date();
      await order.save(opts);

      return { errors, restockedTotal, disposedTotal };
    }

    let result: { errors: string[]; restockedTotal: number; disposedTotal: number };

    if (useTransaction) {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        result = await executeCompletion({ session });
        await session.commitTransaction();
      } catch (e) {
        await session.abortTransaction();
        throw e;
      } finally {
        session.endSession();
      }
    } else {
      result = await executeCompletion({});
    }

    const { errors, restockedTotal, disposedTotal } = result;

    // 操作ログ記録 / 操作日志记录
    logOperation({
      action: 'return_receive',
      category: 'return',
      description: `返品完了: ${doc.orderNumber}（再入庫${restockedTotal}個、廃棄${disposedTotal}個）`,
      referenceNumber: doc.orderNumber,
      referenceType: 'returnOrder',
      referenceId: String(doc._id),
      quantity: restockedTotal + disposedTotal,
    }).catch(() => {});

    res.json({
      data: doc.toObject(),
      restockedTotal,
      disposedTotal,
      errors,
    });

    // 扩展系统事件: 退货完成 / 拡張システムイベント: 返品完了
    extensionManager.emit(HOOK_EVENTS.RETURN_COMPLETED, {
      orderId: String(doc._id),
      orderNumber: doc.orderNumber,
      restockedTotal,
      disposedTotal,
    }).catch((err: unknown) => logger.error(err));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// ---------------------------------------------------------------------------
// POST /api/return-orders/:id/cancel
// ---------------------------------------------------------------------------
export async function cancelReturnOrder(req: Request, res: Response) {
  try {
    const doc = await ReturnOrder.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: '返品指示が見つかりません' });
    if (doc.status === 'completed') {
      return res.status(400).json({ error: '完了済みの返品はキャンセルできません' });
    }

    doc.status = 'cancelled';
    await doc.save();

    // 操作ログ記録 / 操作日志记录
    logOperation({
      action: 'order_cancel',
      category: 'return',
      description: `返品キャンセル: ${doc.orderNumber}`,
      referenceNumber: doc.orderNumber,
      referenceType: 'returnOrder',
      referenceId: String(doc._id),
    }).catch(() => {});

    res.json(doc.toObject());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// ---------------------------------------------------------------------------
// POST /api/return-orders/bulk-create
// ---------------------------------------------------------------------------
export async function bulkCreateReturns(req: Request, res: Response) {
  try {
    const { returns } = req.body;
    if (!Array.isArray(returns) || returns.length === 0) {
      return res.status(400).json({ error: 'returns配列が必要です' });
    }

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < returns.length; i++) {
      const item = returns[i];
      const { productSku, quantity, returnReason, customerName, receivedDate, memo } = item;

      if (!productSku || !quantity) {
        failCount++;
        errors.push(`行${i + 1}: productSkuとquantityは必須です`);
        continue;
      }

      try {
        const product = await Product.findOne({ sku: productSku }).lean();
        if (!product) {
          failCount++;
          errors.push(`行${i + 1}: SKU "${productSku}" の商品が見つかりません`);
          continue;
        }

        const enrichedLines = [
          {
            lineNumber: 1,
            productId: product._id,
            productSku: product.sku,
            productName: product.name,
            quantity: Number(quantity),
            inspectedQuantity: 0,
            disposition: 'pending',
            restockedQuantity: 0,
            disposedQuantity: 0,
            memo: memo || undefined,
          },
        ];

        await ReturnOrder.create({
          orderNumber: generateOrderNumber(),
          status: 'draft',
          returnReason: returnReason || '',
          customerName: customerName || '',
          receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
          lines: enrichedLines,
          memo: memo || '',
        });

        successCount++;
      } catch (e: any) {
        failCount++;
        errors.push(`行${i + 1}: ${e.message}`);
      }
    }

    res.status(201).json({
      message: `一括登録完了: 成功${successCount}件、失敗${failCount}件`,
      successCount,
      failCount,
      errors,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/return-orders/:id
// ---------------------------------------------------------------------------
export async function deleteReturnOrder(req: Request, res: Response) {
  try {
    const doc = await ReturnOrder.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: '返品指示が見つかりません' });
    if (doc.status !== 'draft' && doc.status !== 'cancelled') {
      return res.status(400).json({ error: 'ドラフトまたはキャンセル済みのみ削除できます' });
    }

    await doc.deleteOne();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
