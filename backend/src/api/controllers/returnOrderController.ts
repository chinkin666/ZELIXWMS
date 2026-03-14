import type { Request, Response } from 'express';
import { ReturnOrder } from '@/models/returnOrder';
import { ShipmentOrder } from '@/models/shipmentOrder';
import { StockQuant } from '@/models/stockQuant';
import { StockMove } from '@/models/stockMove';
import { Location } from '@/models/location';
import { Product } from '@/models/product';
import { extensionManager } from '@/core/extensions';
import { HOOK_EVENTS } from '@/core/extensions/types';

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

    const { inspections } = req.body;
    // inspections: Array<{ lineIndex, inspectedQuantity, disposition, restockedQuantity, disposedQuantity, locationId? }>
    if (!Array.isArray(inspections)) {
      return res.status(400).json({ error: 'inspections配列が必要です' });
    }

    for (const insp of inspections) {
      const line = doc.lines[insp.lineIndex];
      if (!line) continue;
      if (insp.inspectedQuantity !== undefined) line.inspectedQuantity = insp.inspectedQuantity;
      if (insp.disposition !== undefined) line.disposition = insp.disposition;
      if (insp.restockedQuantity !== undefined) line.restockedQuantity = insp.restockedQuantity;
      if (insp.disposedQuantity !== undefined) line.disposedQuantity = insp.disposedQuantity;
      if (insp.locationId !== undefined) line.locationId = insp.locationId;
    }

    await doc.save();
    res.json(doc.toObject());
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

    // 全行が検品済みか確認
    const pendingLines = doc.lines.filter((l) => l.disposition === 'pending');
    if (pendingLines.length > 0) {
      return res.status(400).json({
        error: `未判定の明細が${pendingLines.length}件あります`,
      });
    }

    // 仮想ロケーション取得
    const virtualCustomer = await Location.findOne({ type: 'virtual/customer' }).lean();
    if (!virtualCustomer) {
      return res.status(400).json({ error: '仮想ロケーション(VIRTUAL/CUSTOMER)が見つかりません' });
    }

    const errors: string[] = [];
    let restockedTotal = 0;
    let disposedTotal = 0;

    for (const line of doc.lines) {
      const now = new Date();

      // 再入庫処理
      if (line.disposition === 'restock' && line.restockedQuantity > 0) {
        const targetLocationId = line.locationId;
        if (!targetLocationId) {
          errors.push(`${line.productSku}: 入庫先ロケーションが未設定です`);
          continue;
        }

        try {
          const moveNumber = `SM${now.toISOString().slice(0, 10).replace(/-/g, '')}${Math.floor(10000000 + Math.random() * 90000000)}`;
          await StockMove.create({
            moveNumber,
            moveType: 'return',
            state: 'done',
            productId: line.productId,
            productSku: line.productSku,
            productName: line.productName,
            lotId: line.lotId,
            fromLocationId: virtualCustomer._id,
            toLocationId: targetLocationId,
            quantity: line.restockedQuantity,
            referenceType: 'return-order',
            referenceId: String(doc._id),
            referenceNumber: doc.orderNumber,
            executedAt: now,
            memo: `返品再入庫`,
          });

          // StockQuant増加
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
            { upsert: true },
          );

          restockedTotal += line.restockedQuantity;
        } catch (e: any) {
          errors.push(`${line.productSku} 再入庫エラー: ${e.message}`);
        }
      }

      // 廃棄処理（StockMoveのみ記録、在庫は増やさない）
      if (line.disposition === 'dispose' && line.disposedQuantity > 0) {
        try {
          const moveNumber = `SM${now.toISOString().slice(0, 10).replace(/-/g, '')}${Math.floor(10000000 + Math.random() * 90000000)}`;
          await StockMove.create({
            moveNumber,
            moveType: 'return',
            state: 'done',
            productId: line.productId,
            productSku: line.productSku,
            productName: line.productName,
            lotId: line.lotId,
            fromLocationId: virtualCustomer._id,
            toLocationId: virtualCustomer._id,
            quantity: line.disposedQuantity,
            referenceType: 'return-order',
            referenceId: String(doc._id),
            referenceNumber: doc.orderNumber,
            executedAt: now,
            memo: `返品廃棄`,
          });

          disposedTotal += line.disposedQuantity;
        } catch (e: any) {
          errors.push(`${line.productSku} 廃棄記録エラー: ${e.message}`);
        }
      }
    }

    doc.status = 'completed';
    doc.completedAt = new Date();
    await doc.save();

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
    }).catch(console.error);
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
