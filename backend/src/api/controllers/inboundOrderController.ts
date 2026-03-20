import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { InboundOrder } from '@/models/inboundOrder';
import { Product } from '@/models/product';
import { Location } from '@/models/location';
import { StockQuant } from '@/models/stockQuant';
import { StockMove } from '@/models/stockMove';
import { generateSequenceNumber } from '@/utils/sequenceGenerator';
import { findOrCreateLot } from '@/api/controllers/lotController';
import { logOperation } from '@/services/operationLogger';
import { createAutoCharge } from '@/services/chargeService';
import { getWarehouseFilter } from '@/api/helpers/tenantHelper';

/** 入庫指示一覧 */
export const listInboundOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, page: pageStr, limit: limitStr } = req.query;

    const filter: Record<string, unknown> = {};
    if (typeof status === 'string' && status.trim()) {
      filter.status = status.trim();
    }

    // 倉庫フィルタ / 仓库过滤
    const whFilter = getWarehouseFilter(req);
    if (whFilter.length > 0) {
      // destinationLocationId がある Location の warehouseId で絞る
      // 通过 destinationLocationId 关联的 Location 的 warehouseId 过滤
      const locIds = await Location.find({ warehouseId: { $in: whFilter } }).select('_id').lean();
      filter.destinationLocationId = { $in: locIds.map(l => l._id) };
    }

    const page = Math.max(1, Number(pageStr) || 1);
    const limit = Math.min(500, Math.max(1, Number(limitStr) || 50));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      InboundOrder.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('destinationLocationId', 'code name')
        .lean(),
      InboundOrder.countDocuments(filter),
    ]);

    res.json({ items, total, page, limit });
  } catch (error: any) {
    res.status(500).json({ message: '入庫指示一覧の取得に失敗しました', error: error.message });
  }
};

/** 入庫指示詳細 */
export const getInboundOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const order = await InboundOrder.findById(req.params.id)
      .populate('destinationLocationId', 'code name fullPath')
      .populate('lines.locationId', 'code name')
      .populate('lines.putawayLocationId', 'code name')
      .lean();
    if (!order) {
      res.status(404).json({ message: '入庫指示が見つかりません' });
      return;
    }
    res.json(order);
  } catch (error: any) {
    res.status(500).json({ message: '入庫指示の取得に失敗しました', error: error.message });
  }
};

/** 入庫指示作成 */
export const createInboundOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      destinationLocationId, supplier, lines, expectedDate, requestedDate, memo, flowType, linkedOrderIds,
      // LOGIFAST Phase 13 fields
      clientId, clientName, subClientId, subClientName, shopId, shopName,
      containerType, cubicMeters, palletCount, innerBoxCount, importBatchNumber, importBatchDate,
      purchaseOrderNumber, purchaseOrderDate,
    } = req.body;

    if (!destinationLocationId || !lines || !Array.isArray(lines) || lines.length === 0) {
      res.status(400).json({ message: 'destinationLocationId と lines（1行以上）は必須です' });
      return;
    }

    // 入庫先チェック
    const destLoc = await Location.findById(destinationLocationId).lean();
    if (!destLoc) {
      res.status(400).json({ message: '指定された入庫先ロケーションが見つかりません' });
      return;
    }

    // 商品存在チェック & 行データ構築
    const processedLines = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.productId || !line.expectedQuantity || line.expectedQuantity < 1) {
        res.status(400).json({ message: `行${i + 1}: productId と expectedQuantity(1以上) は必須です` });
        return;
      }
      const product = await Product.findById(line.productId).lean();
      if (!product) {
        res.status(400).json({ message: `行${i + 1}: 商品が見つかりません (${line.productId})` });
        return;
      }
      processedLines.push({
        lineNumber: i + 1,
        productId: product._id,
        productSku: product.sku,
        productName: product.name,
        expectedQuantity: Number(line.expectedQuantity),
        receivedQuantity: 0,
        lotNumber: line.lotNumber || undefined,
        expiryDate: line.expiryDate ? new Date(line.expiryDate) : undefined,
        locationId: line.locationId || undefined,
        stockMoveIds: [],
        stockCategory: line.stockCategory === 'damaged' ? 'damaged' : 'new',
        orderReferenceNumber: line.orderReferenceNumber || undefined,
        memo: line.memo || undefined,
        // LOGIFAST Phase 13: ケース管理・検品コード / 箱管理・检品编码
        expectedCaseCount: line.expectedCaseCount != null ? Number(line.expectedCaseCount) : undefined,
        caseUnitType: line.caseUnitType || undefined,
        caseUnitQuantity: line.caseUnitQuantity != null ? Number(line.caseUnitQuantity) : undefined,
        customerProductCode: line.customerProductCode || product.customerProductCode || undefined,
        inspectionCode: line.inspectionCode || (product.barcode?.[0]) || undefined,
      });
    }

    const orderNumber = await generateSequenceNumber('IN');

    // flowType バリデーション / flowType 验证
    const validFlowType = flowType === 'crossdock' ? 'crossdock' : 'standard';

    // テナントID取得 / 获取租户ID
    const tenantId = (req as any).user?.tenantId;

    const order = await InboundOrder.create({
      tenantId,
      orderNumber,
      status: 'draft',
      destinationLocationId,
      supplier: supplier || undefined,
      lines: processedLines,
      expectedDate: expectedDate ? new Date(expectedDate) : undefined,
      requestedDate: requestedDate ? new Date(requestedDate) : undefined,
      memo: memo || undefined,
      flowType: validFlowType,
      linkedOrderIds: Array.isArray(linkedOrderIds) ? linkedOrderIds : [],
      // LOGIFAST Phase 13: 顧客・物流情報 / 客户・物流信息
      clientId: clientId || undefined,
      clientName: clientName || undefined,
      subClientId: subClientId || undefined,
      subClientName: subClientName || undefined,
      shopId: shopId || undefined,
      shopName: shopName || undefined,
      containerType: containerType || undefined,
      cubicMeters: cubicMeters != null ? Number(cubicMeters) : undefined,
      palletCount: palletCount != null ? Number(palletCount) : undefined,
      innerBoxCount: innerBoxCount != null ? Number(innerBoxCount) : undefined,
      importBatchNumber: importBatchNumber || undefined,
      importBatchDate: importBatchDate ? new Date(importBatchDate) : undefined,
      purchaseOrderNumber: purchaseOrderNumber || undefined,
      purchaseOrderDate: purchaseOrderDate ? new Date(purchaseOrderDate) : undefined,
    });

    // 操作ログ / 操作日志 (fire-and-forget)
    logOperation({
      action: 'order_create',
      category: 'inbound',
      description: `入庫指示を作成: ${order.orderNumber}（${order.lines.length}行）`,
      referenceNumber: order.orderNumber,
      referenceType: 'inboundOrder',
      referenceId: String(order._id),
      quantity: order.lines.reduce((s: number, l: any) => s + (l.expectedQuantity || 0), 0),
    }).catch(() => {});

    res.status(201).json(order);
  } catch (error: any) {
    res.status(500).json({ message: '入庫指示の作成に失敗しました', error: error.message });
  }
};

/** 入庫指示更新（draft のみ） */
export const updateInboundOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const order = await InboundOrder.findById(req.params.id);
    if (!order) {
      res.status(404).json({ message: '入庫指示が見つかりません' });
      return;
    }
    if (order.status !== 'draft') {
      res.status(400).json({ message: '下書き状態の入庫指示のみ編集可能です' });
      return;
    }

    const {
      destinationLocationId, supplier, lines, expectedDate, requestedDate, memo,
      clientId, clientName, subClientId, subClientName, shopId, shopName,
      containerType, cubicMeters, palletCount, innerBoxCount, importBatchNumber, importBatchDate,
      purchaseOrderNumber, purchaseOrderDate,
    } = req.body;

    if (destinationLocationId !== undefined) order.destinationLocationId = destinationLocationId;
    if (supplier !== undefined) order.supplier = supplier || undefined;
    if (expectedDate !== undefined) order.expectedDate = expectedDate ? new Date(expectedDate) : undefined;
    if (requestedDate !== undefined) order.requestedDate = requestedDate ? new Date(requestedDate) : undefined;
    if (memo !== undefined) order.memo = memo || undefined;
    // LOGIFAST Phase 13: 追加フィールド更新 / 追加字段更新
    if (clientId !== undefined) order.clientId = clientId || undefined;
    if (clientName !== undefined) order.clientName = clientName || undefined;
    if (subClientId !== undefined) order.subClientId = subClientId || undefined;
    if (subClientName !== undefined) order.subClientName = subClientName || undefined;
    if (shopId !== undefined) order.shopId = shopId || undefined;
    if (shopName !== undefined) order.shopName = shopName || undefined;
    if (containerType !== undefined) order.containerType = containerType || undefined;
    if (cubicMeters !== undefined) order.cubicMeters = cubicMeters != null ? Number(cubicMeters) : undefined;
    if (palletCount !== undefined) order.palletCount = palletCount != null ? Number(palletCount) : undefined;
    if (innerBoxCount !== undefined) order.innerBoxCount = innerBoxCount != null ? Number(innerBoxCount) : undefined;
    if (importBatchNumber !== undefined) order.importBatchNumber = importBatchNumber || undefined;
    if (importBatchDate !== undefined) order.importBatchDate = importBatchDate ? new Date(importBatchDate) : undefined;
    if (purchaseOrderNumber !== undefined) order.purchaseOrderNumber = purchaseOrderNumber || undefined;
    if (purchaseOrderDate !== undefined) order.purchaseOrderDate = purchaseOrderDate ? new Date(purchaseOrderDate) : undefined;

    if (lines && Array.isArray(lines)) {
      const processedLines = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const product = await Product.findById(line.productId).lean();
        if (!product) {
          res.status(400).json({ message: `行${i + 1}: 商品が見つかりません` });
          return;
        }
        processedLines.push({
          lineNumber: i + 1,
          productId: product._id,
          productSku: product.sku,
          productName: product.name,
          expectedQuantity: Number(line.expectedQuantity),
          receivedQuantity: line.receivedQuantity ?? 0,
          lotNumber: line.lotNumber || undefined,
          expiryDate: line.expiryDate ? new Date(line.expiryDate) : undefined,
          locationId: line.locationId || undefined,
          stockMoveIds: line.stockMoveIds || [],
          stockCategory: line.stockCategory === 'damaged' ? 'damaged' : 'new',
          orderReferenceNumber: line.orderReferenceNumber || undefined,
          memo: line.memo || undefined,
          // LOGIFAST Phase 13
          expectedCaseCount: line.expectedCaseCount != null ? Number(line.expectedCaseCount) : undefined,
          receivedCaseCount: line.receivedCaseCount != null ? Number(line.receivedCaseCount) : undefined,
          caseUnitType: line.caseUnitType || undefined,
          caseUnitQuantity: line.caseUnitQuantity != null ? Number(line.caseUnitQuantity) : undefined,
          customerProductCode: line.customerProductCode || undefined,
          inspectionCode: line.inspectionCode || undefined,
        });
      }
      order.lines = processedLines as any;
    }

    await order.save();
    res.json(order);
  } catch (error: any) {
    res.status(500).json({ message: '入庫指示の更新に失敗しました', error: error.message });
  }
};

/** 入庫指示確定 (draft → confirmed) */
export const confirmInboundOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const order = await InboundOrder.findById(req.params.id);
    if (!order) {
      res.status(404).json({ message: '入庫指示が見つかりません' });
      return;
    }
    if (order.status !== 'draft') {
      res.status(400).json({ message: '下書き状態の入庫指示のみ確定可能です' });
      return;
    }

    // 仮想ロケーション（仕入先）取得
    const virtualSupplier = await Location.findOne({ code: 'VIRTUAL/SUPPLIER' }).lean();
    if (!virtualSupplier) {
      res.status(500).json({ message: '仮想ロケーション(VIRTUAL/SUPPLIER)が見つかりません。初期データを作成してください。' });
      return;
    }

    // 各行に StockMove (draft) を作成
    for (const line of order.lines) {
      const destLocId = line.locationId || order.destinationLocationId;
      const moveNumber = await generateSequenceNumber('MV');
      const move = await StockMove.create({
        moveNumber,
        moveType: 'inbound',
        state: 'draft',
        productId: line.productId,
        productSku: line.productSku,
        productName: line.productName,
        lotNumber: line.lotNumber || undefined,
        fromLocationId: virtualSupplier._id,
        toLocationId: destLocId,
        quantity: line.expectedQuantity,
        referenceType: 'inbound-order',
        referenceId: String(order._id),
        referenceNumber: order.orderNumber,
        scheduledDate: order.expectedDate || undefined,
      });
      line.stockMoveIds.push(move._id);
    }

    order.status = 'confirmed';
    await order.save();

    logOperation({
      action: 'inbound_receive',
      description: `入庫指示を確定: ${order.orderNumber}`,
      referenceNumber: order.orderNumber,
      referenceType: 'inboundOrder',
      referenceId: String(order._id),
    }).catch(() => {});

    res.json({ message: '入庫指示を確定しました', order });
  } catch (error: any) {
    res.status(500).json({ message: '入庫指示の確定に失敗しました', error: error.message });
  }
};

/** 入庫検品（行単位で数量を受け取り） */
export const receiveInboundLine = async (req: Request, res: Response): Promise<void> => {
  try {
    const { lineNumber, receiveQuantity } = req.body;
    const order = await InboundOrder.findById(req.params.id);
    if (!order) {
      res.status(404).json({ message: '入庫指示が見つかりません' });
      return;
    }
    if (order.status !== 'confirmed' && order.status !== 'receiving') {
      res.status(400).json({ message: '確認済みまたは入庫作業中の入庫指示のみ検品可能です' });
      return;
    }

    const line = order.lines.find(l => l.lineNumber === lineNumber);
    if (!line) {
      res.status(404).json({ message: `行番号 ${lineNumber} が見つかりません` });
      return;
    }

    const qty = Number(receiveQuantity);
    if (!qty || qty < 1) {
      res.status(400).json({ message: 'receiveQuantity は 1 以上必須です' });
      return;
    }

    const newReceived = line.receivedQuantity + qty;
    if (newReceived > line.expectedQuantity) {
      res.status(400).json({
        message: `受入数量が予定を超えます（予定: ${line.expectedQuantity}, 既受入: ${line.receivedQuantity}, 今回: ${qty}）`,
      });
      return;
    }

    // Lot 自動作成/取得（lotTrackingEnabled の商品 + lotNumber あり）
    let lotId = line.lotId;
    const product = await Product.findById(line.productId).lean();
    if (product?.lotTrackingEnabled && line.lotNumber && !lotId) {
      lotId = await findOrCreateLot(
        String(line.productId),
        line.productSku,
        line.productName,
        line.lotNumber,
        line.expiryDate || undefined,
      );
      line.lotId = lotId;
    }

    // StockQuant 更新
    const destLocId = line.locationId || order.destinationLocationId;
    await StockQuant.findOneAndUpdate(
      {
        productId: line.productId,
        locationId: destLocId,
        lotId: lotId || undefined,
      },
      {
        $inc: { quantity: qty },
        $set: { productSku: line.productSku, lastMovedAt: new Date() },
        $setOnInsert: { reservedQuantity: 0 },
      },
      { upsert: true },
    );

    // StockMove を done に更新（または新規作成）
    const moveNumber = await generateSequenceNumber('MV');
    const virtualSupplier = await Location.findOne({ code: 'VIRTUAL/SUPPLIER' }).lean();

    const move = await StockMove.create({
      moveNumber,
      moveType: 'inbound',
      state: 'done',
      productId: line.productId,
      productSku: line.productSku,
      productName: line.productName,
      lotId: lotId || undefined,
      lotNumber: line.lotNumber || undefined,
      fromLocationId: virtualSupplier!._id,
      toLocationId: destLocId,
      quantity: qty,
      referenceType: 'inbound-order',
      referenceId: String(order._id),
      referenceNumber: order.orderNumber,
      executedAt: new Date(),
    });

    line.stockMoveIds.push(move._id);
    line.receivedQuantity = newReceived;

    // ステータス更新
    if (order.status === 'confirmed') {
      order.status = 'receiving';
    }

    // 全行入庫完了チェック → received（棚入れ待ち）
    const allReceived = order.lines.every(l => l.receivedQuantity >= l.expectedQuantity);
    if (allReceived) {
      // 通過型: 棚入れスキップし直接完了 / 通过型: 跳过上架直接完成
      if (order.flowType === 'crossdock') {
        order.status = 'done';
        order.completedAt = new Date();
        // 未完了の draft StockMove をキャンセル / 取消未完成的draft库存移动
        for (const l of order.lines) {
          for (const moveId of l.stockMoveIds) {
            await StockMove.updateOne(
              { _id: moveId, state: 'draft' },
              { $set: { state: 'cancelled' } },
            );
          }
        }
      } else {
        order.status = 'received';
      }
    }

    await order.save();

    // 通過型完了ログ / 通过型完成日志
    if (allReceived && order.flowType === 'crossdock') {
      logOperation({
        action: 'inbound_putaway',
        description: `通過型入庫完了: ${order.orderNumber}（棚入れスキップ）`,
        referenceNumber: order.orderNumber,
        referenceType: 'inboundOrder',
        referenceId: String(order._id),
      }).catch(() => {});
    }

    logOperation({
      action: 'inbound_receive',
      description: `入庫検品: ${order.orderNumber} 行${lineNumber} ${line.productSku} ${qty}個（${newReceived}/${line.expectedQuantity}）`,
      referenceNumber: order.orderNumber,
      referenceType: 'inboundOrder',
      referenceId: String(order._id),
      productSku: line.productSku,
      productName: line.productName,
      quantity: qty,
    }).catch(() => {});

    // 自動チャージ: 入庫作業料 / 自动收费: 入库作业费 (fire-and-forget)
    createAutoCharge({
      tenantId: 'default',
      chargeType: 'inbound_handling',
      referenceType: 'inboundOrder',
      referenceId: String(order._id),
      referenceNumber: order.orderNumber,
      quantity: qty,
      description: `入庫作業料: ${order.orderNumber} ${line.productSku} x${qty}`,
    }).catch(() => {});

    res.json({
      message: `行${lineNumber}: ${qty}個を入庫しました（${newReceived}/${line.expectedQuantity}）`,
      line: { lineNumber, receivedQuantity: newReceived, expectedQuantity: line.expectedQuantity },
      orderStatus: order.status,
    });
  } catch (error: any) {
    res.status(500).json({ message: '入庫検品に失敗しました', error: error.message });
  }
};

/** 入庫完了（強制完了） */
export const completeInboundOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const order = await InboundOrder.findById(req.params.id);
    if (!order) {
      res.status(404).json({ message: '入庫指示が見つかりません' });
      return;
    }
    if (!['confirmed', 'receiving', 'received'].includes(order.status)) {
      res.status(400).json({ message: '確認済み・入庫作業中・検品済みの入庫指示のみ完了可能です' });
      return;
    }

    order.status = 'done';
    order.completedAt = new Date();

    // 通過型完了ログ / 通过型完成日志
    const isCrossdock = order.flowType === 'crossdock';

    // 未完了の draft StockMove をキャンセル
    for (const line of order.lines) {
      for (const moveId of line.stockMoveIds) {
        await StockMove.updateOne(
          { _id: moveId, state: 'draft' },
          { $set: { state: 'cancelled' } },
        );
      }
    }

    await order.save();
    logOperation({
      action: 'inbound_putaway',
      description: isCrossdock
        ? `通過型入庫完了: ${order.orderNumber}（棚入れスキップ）`
        : `入庫完了: ${order.orderNumber}`,
      referenceNumber: order.orderNumber,
      referenceType: 'inboundOrder',
      referenceId: String(order._id),
    }).catch(() => {});

    res.json({ message: isCrossdock ? '通過型入庫を完了にしました' : '入庫指示を完了にしました', order });
  } catch (error: any) {
    res.status(500).json({ message: '入庫完了に失敗しました', error: error.message });
  }
};

/** 入庫キャンセル */
export const cancelInboundOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const order = await InboundOrder.findById(req.params.id);
    if (!order) {
      res.status(404).json({ message: '入庫指示が見つかりません' });
      return;
    }
    if (order.status === 'done' || order.status === 'cancelled') {
      res.status(400).json({ message: '完了済み・キャンセル済みの入庫指示はキャンセルできません' });
      return;
    }

    // receiving/received 状態の場合、すでに入庫した分は戻さない（手動調整で対応）
    if (order.status === 'receiving' || order.status === 'received') {
      const receivedLines = order.lines.filter(l => l.receivedQuantity > 0);
      if (receivedLines.length > 0) {
        res.status(400).json({
          message: `入庫済み行が${receivedLines.length}件あります。先に在庫調整で戻してからキャンセルしてください。`,
        });
        return;
      }
    }

    // 全 StockMove をキャンセル
    for (const line of order.lines) {
      for (const moveId of line.stockMoveIds) {
        await StockMove.updateOne(
          { _id: moveId, state: { $ne: 'done' } },
          { $set: { state: 'cancelled' } },
        );
      }
    }

    order.status = 'cancelled';
    await order.save();
    logOperation({
      action: 'order_cancel',
      category: 'inbound',
      description: `入庫指示をキャンセル: ${order.orderNumber}`,
      referenceNumber: order.orderNumber,
      referenceType: 'inboundOrder',
      referenceId: String(order._id),
    }).catch(() => {});

    res.json({ message: '入庫指示をキャンセルしました', order });
  } catch (error: any) {
    res.status(500).json({ message: 'キャンセルに失敗しました', error: error.message });
  }
};

/** 棚入れ（行単位でロケーション割当） */
export const putawayInboundLine = async (req: Request, res: Response): Promise<void> => {
  try {
    const { lineNumber, locationId, quantity } = req.body;
    const order = await InboundOrder.findById(req.params.id);
    if (!order) {
      res.status(404).json({ message: '入庫指示が見つかりません' });
      return;
    }
    if (order.status !== 'received') {
      res.status(400).json({ message: '検品済みの入庫指示のみ棚入れ可能です' });
      return;
    }

    const line = order.lines.find(l => l.lineNumber === lineNumber);
    if (!line) {
      res.status(404).json({ message: `行番号 ${lineNumber} が見つかりません` });
      return;
    }

    // ロケーション存在チェック
    const loc = await Location.findById(locationId).lean();
    if (!loc) {
      res.status(400).json({ message: 'ロケーションが見つかりません' });
      return;
    }
    if (loc.type === 'virtual/supplier' || loc.type === 'virtual/customer') {
      res.status(400).json({ message: '仮想ロケーションには棚入れできません' });
      return;
    }

    const qty = Number(quantity) || line.receivedQuantity;
    if (qty < 1 || qty > line.receivedQuantity) {
      res.status(400).json({ message: `棚入れ数量は1～${line.receivedQuantity}の範囲で指定してください` });
      return;
    }

    // 既存の入庫先と異なる場合、StockQuantを移動
    const currentLocId = line.locationId || order.destinationLocationId;
    const newLocId = new mongoose.Types.ObjectId(locationId);

    if (String(currentLocId) !== String(newLocId)) {
      // 元ロケーションから減算
      await StockQuant.findOneAndUpdate(
        { productId: line.productId, locationId: currentLocId, lotId: line.lotId || undefined },
        { $inc: { quantity: -qty }, $set: { lastMovedAt: new Date() } },
      );
      // 新ロケーションに加算
      await StockQuant.findOneAndUpdate(
        { productId: line.productId, locationId: newLocId, lotId: line.lotId || undefined },
        {
          $inc: { quantity: qty },
          $set: { productSku: line.productSku, lastMovedAt: new Date() },
          $setOnInsert: { reservedQuantity: 0 },
        },
        { upsert: true },
      );

      // StockMove（transfer）作成
      const moveNumber = await generateSequenceNumber('MV');
      const move = await StockMove.create({
        moveNumber,
        moveType: 'transfer',
        state: 'done',
        productId: line.productId,
        productSku: line.productSku,
        productName: line.productName,
        lotId: line.lotId || undefined,
        lotNumber: line.lotNumber || undefined,
        fromLocationId: currentLocId,
        toLocationId: newLocId,
        quantity: qty,
        referenceType: 'inbound-order',
        referenceId: String(order._id),
        referenceNumber: order.orderNumber,
        executedAt: new Date(),
        memo: '棚入れ（putaway）',
      });
      line.stockMoveIds.push(move._id);
    }

    line.putawayLocationId = newLocId;
    line.putawayQuantity = qty;

    await order.save();

    // 全行棚入れ完了チェック
    const allPutaway = order.lines.every(l => l.putawayQuantity >= l.receivedQuantity && l.receivedQuantity > 0);

    logOperation({
      action: 'inbound_putaway',
      description: `棚入れ: ${order.orderNumber} 行${lineNumber} ${line.productSku} ${qty}個 → ${loc.code}`,
      referenceNumber: order.orderNumber,
      referenceType: 'inboundOrder',
      referenceId: String(order._id),
      productSku: line.productSku,
      productName: line.productName,
      locationCode: loc.code,
      quantity: qty,
    }).catch(() => {});

    res.json({
      message: `行${lineNumber}: 棚入れ完了（${loc.code}）`,
      line: { lineNumber, putawayLocationId: locationId, putawayQuantity: qty },
      allPutaway,
    });
  } catch (error: any) {
    res.status(500).json({ message: '棚入れに失敗しました', error: error.message });
  }
};

/** 一括検品（全行を予定数量で入庫） */
export const bulkReceiveInbound = async (req: Request, res: Response): Promise<void> => {
  try {
    const order = await InboundOrder.findById(req.params.id);
    if (!order) {
      res.status(404).json({ message: '入庫指示が見つかりません' });
      return;
    }
    if (order.status !== 'confirmed' && order.status !== 'receiving') {
      res.status(400).json({ message: '確認済みまたは入庫作業中の入庫指示のみ一括検品可能です' });
      return;
    }

    const virtualSupplier = await Location.findOne({ code: 'VIRTUAL/SUPPLIER' }).lean();
    if (!virtualSupplier) {
      res.status(500).json({ message: '仮想ロケーション(VIRTUAL/SUPPLIER)が見つかりません' });
      return;
    }

    let totalProcessed = 0;

    for (const line of order.lines) {
      const remaining = line.expectedQuantity - line.receivedQuantity;
      if (remaining <= 0) continue;

      // Lot 自動作成
      let lotId = line.lotId;
      const product = await Product.findById(line.productId).lean();
      if (product?.lotTrackingEnabled && line.lotNumber && !lotId) {
        lotId = await findOrCreateLot(
          String(line.productId), line.productSku, line.productName, line.lotNumber, line.expiryDate || undefined,
        );
        line.lotId = lotId;
      }

      // StockQuant 更新
      const destLocId = line.locationId || order.destinationLocationId;
      await StockQuant.findOneAndUpdate(
        { productId: line.productId, locationId: destLocId, lotId: lotId || undefined },
        {
          $inc: { quantity: remaining },
          $set: { productSku: line.productSku, lastMovedAt: new Date() },
          $setOnInsert: { reservedQuantity: 0 },
        },
        { upsert: true },
      );

      // StockMove
      const moveNumber = await generateSequenceNumber('MV');
      const move = await StockMove.create({
        moveNumber,
        moveType: 'inbound',
        state: 'done',
        productId: line.productId,
        productSku: line.productSku,
        productName: line.productName,
        lotId: lotId || undefined,
        lotNumber: line.lotNumber || undefined,
        fromLocationId: virtualSupplier._id,
        toLocationId: destLocId,
        quantity: remaining,
        referenceType: 'inbound-order',
        referenceId: String(order._id),
        referenceNumber: order.orderNumber,
        executedAt: new Date(),
        memo: '一括検品',
      });
      line.stockMoveIds.push(move._id);
      line.receivedQuantity = line.expectedQuantity;
      totalProcessed += remaining;
    }

    // 未完了の draft StockMove をキャンセル / 取消未完成的draft库存移动
    for (const line of order.lines) {
      for (const moveId of line.stockMoveIds) {
        await StockMove.updateOne(
          { _id: moveId, state: 'draft' },
          { $set: { state: 'cancelled' } },
        );
      }
    }

    // 通過型: 棚入れスキップし直接完了 / 通过型: 跳过上架直接完成
    if (order.flowType === 'crossdock') {
      order.status = 'done';
      order.completedAt = new Date();
    } else {
      // 全行受入完了の場合 / 所有行接收完成
      order.status = 'received';
    }

    await order.save();

    logOperation({
      action: 'inbound_receive',
      description: order.flowType === 'crossdock'
        ? `通過型一括検品完了: ${order.orderNumber} ${totalProcessed}個（棚入れスキップ）`
        : `一括検品: ${order.orderNumber} ${totalProcessed}個`,
      referenceNumber: order.orderNumber,
      referenceType: 'inboundOrder',
      referenceId: String(order._id),
      quantity: totalProcessed,
    }).catch(() => {});

    res.json({
      message: order.flowType === 'crossdock'
        ? `通過型一括検品完了: ${totalProcessed}個を入庫しました（棚入れスキップ）`
        : `一括検品完了: ${totalProcessed}個を入庫しました`,
      order,
    });
  } catch (error: any) {
    res.status(500).json({ message: '一括検品に失敗しました', error: error.message });
  }
};

/** 入庫指示削除（draft のみ） */
export const deleteInboundOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const order = await InboundOrder.findById(req.params.id).lean();
    if (!order) {
      res.status(404).json({ message: '入庫指示が見つかりません' });
      return;
    }
    if (order.status !== 'draft') {
      res.status(400).json({ message: '下書き状態の入庫指示のみ削除可能です' });
      return;
    }
    await InboundOrder.findByIdAndDelete(req.params.id);
    res.json({ message: '入庫指示を削除しました' });
  } catch (error: any) {
    res.status(500).json({ message: '入庫指示の削除に失敗しました', error: error.message });
  }
};

/** 入庫履歴検索（行レベル） */
export const searchInboundHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      dateFrom, dateTo,
      productSku, productName,
      supplierName,
      locationCode,
      stockCategory,
      orderReferenceNumber,
      expectedQtyMin, expectedQtyMax,
      receivedQtyMin, receivedQtyMax,
      page: pageStr, limit: limitStr,
    } = req.query;

    // Build order-level filter
    const orderFilter: Record<string, unknown> = {
      status: { $in: ['receiving', 'received', 'done'] },
    };

    if (typeof dateFrom === 'string' || typeof dateTo === 'string') {
      const dateRange: Record<string, Date> = {};
      if (dateFrom) dateRange.$gte = new Date(dateFrom as string);
      if (dateTo) {
        const to = new Date(dateTo as string);
        to.setHours(23, 59, 59, 999);
        dateRange.$lte = to;
      }
      orderFilter.completedAt = dateRange;
    }

    if (typeof supplierName === 'string' && supplierName.trim()) {
      orderFilter['supplier.name'] = { $regex: supplierName.trim(), $options: 'i' };
    }

    const page = Math.max(1, Number(pageStr) || 1);
    const limit = Math.min(500, Math.max(1, Number(limitStr) || 50));

    // Fetch orders with populated data
    const orders = await InboundOrder.find(orderFilter)
      .sort({ completedAt: -1, createdAt: -1 })
      .populate('destinationLocationId', 'code name')
      .populate('lines.locationId', 'code name')
      .populate('lines.putawayLocationId', 'code name')
      .lean();

    // Flatten to line-level records with filters
    interface HistoryLine {
      orderNumber: string;
      orderId: string;
      orderStatus: string;
      expectedDate?: string;
      completedAt?: string;
      supplierName?: string;
      lineNumber: number;
      productSku: string;
      productName?: string;
      locationCode?: string;
      locationName?: string;
      putawayLocationCode?: string;
      putawayLocationName?: string;
      expectedQuantity: number;
      receivedQuantity: number;
      stockCategory: string;
      orderReferenceNumber?: string;
      lotNumber?: string;
      expiryDate?: string;
      memo?: string;
    }

    const allLines: HistoryLine[] = [];

    for (const order of orders) {
      for (const line of order.lines) {
        if (line.receivedQuantity === 0) continue;

        // Line-level filters
        if (typeof productSku === 'string' && productSku.trim()) {
          if (!line.productSku.toLowerCase().includes(productSku.trim().toLowerCase())) continue;
        }
        if (typeof productName === 'string' && productName.trim()) {
          if (!line.productName?.toLowerCase().includes(productName.trim().toLowerCase())) continue;
        }
        if (typeof stockCategory === 'string' && stockCategory.trim()) {
          if ((line as any).stockCategory !== stockCategory) continue;
        }
        if (typeof orderReferenceNumber === 'string' && orderReferenceNumber.trim()) {
          if (!(line as any).orderReferenceNumber?.includes(orderReferenceNumber.trim())) continue;
        }
        if (typeof locationCode === 'string' && locationCode.trim()) {
          const locObj = line.putawayLocationId || line.locationId;
          const code = (locObj as any)?.code || '';
          if (!code.toLowerCase().includes(locationCode.trim().toLowerCase())) continue;
        }
        if (expectedQtyMin && line.expectedQuantity < Number(expectedQtyMin)) continue;
        if (expectedQtyMax && line.expectedQuantity > Number(expectedQtyMax)) continue;
        if (receivedQtyMin && line.receivedQuantity < Number(receivedQtyMin)) continue;
        if (receivedQtyMax && line.receivedQuantity > Number(receivedQtyMax)) continue;

        const locObj = line.putawayLocationId || line.locationId || order.destinationLocationId;

        allLines.push({
          orderNumber: order.orderNumber,
          orderId: String(order._id),
          orderStatus: order.status,
          expectedDate: order.expectedDate?.toISOString(),
          completedAt: order.completedAt?.toISOString(),
          supplierName: order.supplier?.name,
          lineNumber: line.lineNumber,
          productSku: line.productSku,
          productName: line.productName,
          locationCode: (locObj as any)?.code,
          locationName: (locObj as any)?.name,
          putawayLocationCode: (line.putawayLocationId as any)?.code,
          putawayLocationName: (line.putawayLocationId as any)?.name,
          expectedQuantity: line.expectedQuantity,
          receivedQuantity: line.receivedQuantity,
          stockCategory: (line as any).stockCategory || 'new',
          orderReferenceNumber: (line as any).orderReferenceNumber,
          lotNumber: line.lotNumber,
          expiryDate: line.expiryDate?.toISOString(),
          memo: line.memo,
        });
      }
    }

    const total = allLines.length;
    const skip = (page - 1) * limit;
    const items = allLines.slice(skip, skip + limit);

    res.json({ items, total, page, limit });
  } catch (error: any) {
    res.status(500).json({ message: '入庫履歴の検索に失敗しました', error: error.message });
  }
};

/**
 * 入庫差異レポート / 入库差异报告
 * 検品数と予定数の差異を返す
 * GET /inbound-orders/:id/variance
 */
export const getInboundVariance = async (req: Request, res: Response): Promise<void> => {
  try {
    const order = await InboundOrder.findById(req.params.id)
      .populate('destinationLocationId', 'code name')
      .lean();

    if (!order) {
      res.status(404).json({ message: '入庫指示が見つかりません' });
      return;
    }

    let totalExpected = 0;
    let totalReceived = 0;
    const lines: {
      lineNumber: number;
      productSku: string;
      productName: string;
      expectedQuantity: number;
      receivedQuantity: number;
      variance: number;
      variancePercent: number;
      status: 'ok' | 'shortage' | 'pending';
    }[] = [];

    for (const line of order.lines) {
      const expected = line.expectedQuantity || 0;
      const received = line.receivedQuantity || 0;
      const variance = received - expected;
      totalExpected += expected;
      totalReceived += received;

      let status: 'ok' | 'shortage' | 'pending' = 'ok';
      if (received === 0 && expected > 0) status = 'pending';
      else if (received < expected) status = 'shortage';

      lines.push({
        lineNumber: line.lineNumber,
        productSku: line.productSku,
        productName: line.productName || '',
        expectedQuantity: expected,
        receivedQuantity: received,
        variance,
        variancePercent: expected > 0 ? Math.round((variance / expected) * 100) : 0,
        status,
      });
    }

    const shortageLines = lines.filter(l => l.status === 'shortage');
    const pendingLines = lines.filter(l => l.status === 'pending');
    const hasVariance = shortageLines.length > 0 || pendingLines.length > 0;

    res.json({
      orderNumber: order.orderNumber,
      orderStatus: order.status,
      supplierName: (order as any).supplier?.name || '',
      totalExpected,
      totalReceived,
      totalVariance: totalReceived - totalExpected,
      hasVariance,
      shortageCount: shortageLines.length,
      pendingCount: pendingLines.length,
      lines,
    });
  } catch (error: any) {
    res.status(500).json({ message: '差異レポートの取得に失敗しました', error: error.message });
  }
};

/**
 * 棚入れロケーション推薦 / 上架位置推荐
 * 各ラインの商品が既に在庫がある場所を推薦する
 * GET /inbound-orders/:id/suggest-locations
 */
export const suggestPutawayLocations = async (req: Request, res: Response): Promise<void> => {
  try {
    const order = await InboundOrder.findById(req.params.id).lean();
    if (!order) {
      res.status(404).json({ message: '入庫指示が見つかりません' });
      return;
    }

    // 各ラインの productId を集約 / 汇总每行的productId
    const productIds = [...new Set(order.lines.map(l => String(l.productId)))];

    // 各商品の在庫量が最も多いロケーションを取得 / 获取每个商品库存最多的位置
    const suggestions: Record<string, { locationId: string; locationCode: string; locationName: string; quantity: number }> = {};

    for (const pid of productIds) {
      const topQuant = await StockQuant.aggregate([
        { $match: { productId: new mongoose.Types.ObjectId(pid), quantity: { $gt: 0 } } },
        {
          $lookup: {
            from: 'locations',
            localField: 'locationId',
            foreignField: '_id',
            as: 'location',
          },
        },
        { $unwind: '$location' },
        // 仮想ロケーションを除外 / 排除虚拟位置
        { $match: { 'location.type': { $not: /^virtual\// } } },
        { $sort: { quantity: -1 } },
        { $limit: 1 },
      ]);

      if (topQuant.length > 0) {
        const q = topQuant[0];
        suggestions[pid] = {
          locationId: String(q.locationId),
          locationCode: q.location?.code || '',
          locationName: q.location?.name || '',
          quantity: q.quantity,
        };
      }
    }

    // ライン単位で推薦結果を返す / 按行返回推荐结果
    const result = order.lines.map(line => {
      const pid = String(line.productId);
      const suggestion = suggestions[pid] || null;
      return {
        lineNumber: line.lineNumber,
        productSku: line.productSku,
        suggestedLocationId: suggestion?.locationId || null,
        suggestedLocationCode: suggestion?.locationCode || null,
        suggestedLocationName: suggestion?.locationName || null,
        existingStock: suggestion?.quantity || 0,
        reason: suggestion
          ? `既存在庫 ${suggestion.quantity}個 @ ${suggestion.locationCode}`
          : null,
      };
    });

    res.json({ suggestions: result });
  } catch (error: any) {
    res.status(500).json({ message: 'ロケーション推薦の取得に失敗しました', error: error.message });
  }
};
