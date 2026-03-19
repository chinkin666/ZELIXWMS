/**
 * GraphQL Mutation Resolvers / GraphQL ミューテーションリゾルバ
 *
 * 写操作: 出荷指示/商品/入庫/客户/在庫調整
 * 書き込み操作: 出荷指示/商品/入庫/顧客/在庫調整
 */

import { ShipmentOrder } from '@/models/shipmentOrder';
import { Product } from '@/models/product';
import { InboundOrder } from '@/models/inboundOrder';
import { Client } from '@/models/client';
import { extensionManager, HOOK_EVENTS } from '@/core/extensions';
import { logger } from '@/lib/logger';

// 延迟导入 / 遅延インポート
let StockQuant: any = null;
async function getStockQuant() {
  if (!StockQuant) {
    const mod = await import('@/models/stockQuant');
    StockQuant = mod.StockQuant;
  }
  return StockQuant;
}

// ─── ID 生成辅助 / ID 生成ヘルパー ───

function generateOrderNumber(prefix: string): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `${prefix}${date}-${rand}`;
}

// ─── Mutations ───

export const mutationResolvers = {
  Mutation: {
    // ─── 出荷指示 / 出荷指示 ───

    createShipmentOrder: async (_: unknown, { input }: { input: any }) => {
      const orderNumber = generateOrderNumber('SH');

      // 必填字段デフォルト値 / 必填字段默认值
      const products = (input.products || []).map((p: any) => ({
        ...p,
        inputSku: p.productSku || p.inputSku || '',
        productName: p.productName || p.productSku || '',
      }));

      const order = await ShipmentOrder.create({
        orderNumber,
        carrierId: input.carrierId || '__manual__',
        customerManagementNumber: input.customerManagementNumber || orderNumber,
        invoiceType: input.invoiceType || '0',
        sender: {
          name: input.orderer?.name || '-',
          phone: input.orderer?.phone || '-',
          postalCode: input.orderer?.postalCode || '000-0000',
          prefecture: input.orderer?.prefecture || '-',
          city: input.orderer?.city || '-',
          street: input.orderer?.street || '-',
          building: input.orderer?.building || '',
        },
        recipient: input.recipient,
        products,
        shipPlanDate: input.shipPlanDate || new Date().toISOString().slice(0, 10),
        destinationType: input.destinationType || 'B2C',
        memo: input.memo,
        status: {
          carrierReceipt: { isReceived: false },
          confirm: { isConfirmed: false },
          printed: { isPrinted: false },
          inspected: { isInspected: false },
          shipped: { isShipped: false },
          ecExported: { isExported: false },
          held: { isHeld: false },
        },
      });

      // 事件发射 / イベント発行
      extensionManager.emit(HOOK_EVENTS.ORDER_CREATED, {
        orderId: String(order._id),
        orderNumber: order.orderNumber,
        order: order.toObject(),
      }).catch((err) => logger.error({ err }, 'emit error'));

      return order.toObject();
    },

    updateShipmentOrder: async (_: unknown, { id, input }: { id: string; input: any }) => {
      const order = await ShipmentOrder.findByIdAndUpdate(
        id,
        { $set: input },
        { new: true, runValidators: true },
      ).lean();
      return order;
    },

    confirmShipmentOrder: async (_: unknown, { id }: { id: string }) => {
      const order = await ShipmentOrder.findByIdAndUpdate(
        id,
        {
          $set: {
            'status.confirm.isConfirmed': true,
            'status.confirm.confirmedAt': new Date(),
          },
        },
        { new: true },
      ).lean();

      if (order) {
        extensionManager.emit(HOOK_EVENTS.ORDER_CONFIRMED, {
          orderId: String(order._id),
          order,
        }).catch((err) => logger.error({ err }, 'emit error'));
      }

      return flattenStatus(order);
    },

    holdShipmentOrder: async (_: unknown, { id, reason }: { id: string; reason?: string }) => {
      const order = await ShipmentOrder.findByIdAndUpdate(
        id,
        {
          $set: {
            'status.held.isHeld': true,
            'status.held.heldAt': new Date(),
            'status.held.reason': reason || '',
          },
        },
        { new: true },
      ).lean();

      if (order) {
        extensionManager.emit(HOOK_EVENTS.ORDER_HELD, {
          orderId: String(order._id),
          order,
        }).catch((err) => logger.error({ err }, 'emit error'));
      }

      return flattenStatus(order);
    },

    unholdShipmentOrder: async (_: unknown, { id }: { id: string }) => {
      const order = await ShipmentOrder.findByIdAndUpdate(
        id,
        {
          $set: {
            'status.held.isHeld': false,
          },
        },
        { new: true },
      ).lean();

      if (order) {
        extensionManager.emit(HOOK_EVENTS.ORDER_UNHELD, {
          orderId: String(order._id),
          order,
        }).catch((err) => logger.error({ err }, 'emit error'));
      }

      return flattenStatus(order);
    },

    cancelShipmentOrder: async (_: unknown, { id, reason }: { id: string; reason?: string }) => {
      const order = await ShipmentOrder.findById(id);
      if (!order) return { success: false, message: 'Order not found', id: null };

      // 已出荷不可取消 / 出荷済みは取消不可
      if (order.status?.shipped?.isShipped) {
        return { success: false, message: '出荷済みのため取消できません', id };
      }

      await ShipmentOrder.findByIdAndDelete(id);

      extensionManager.emit(HOOK_EVENTS.ORDER_CANCELLED, {
        orderId: id,
        orderNumber: order.orderNumber,
        reason: reason || 'cancelled via GraphQL',
      }).catch((err) => logger.error({ err }, 'emit error'));

      return { success: true, message: 'Order cancelled', id };
    },

    // ─── 商品 / 商品 ───

    createProduct: async (_: unknown, { input }: { input: any }) => {
      const product = await Product.create(input);
      return product.toObject();
    },

    updateProduct: async (_: unknown, { id, input }: { id: string; input: any }) => {
      const product = await Product.findByIdAndUpdate(
        id,
        { $set: input },
        { new: true, runValidators: true },
      ).lean();
      return product;
    },

    deleteProduct: async (_: unknown, { id }: { id: string }) => {
      const result = await Product.findByIdAndDelete(id);
      if (!result) return { success: false, message: 'Product not found', id: null };
      return { success: true, message: 'Product deleted', id };
    },

    // ─── 入庫 / 入庫 ───

    createInboundOrder: async (_: unknown, { input }: { input: any }) => {
      const orderNumber = generateOrderNumber('IN');

      // lines の productSku から productId を解決 / lines の productSku から productId を解決
      const resolvedLines = await Promise.all(
        (input.lines || []).map(async (line: any) => {
          const product = await Product.findOne({ sku: line.productSku }, { _id: 1 }).lean();
          return {
            productId: product?._id,
            productSku: line.productSku,
            expectedQuantity: line.expectedQuantity,
            receivedQuantity: 0,
          };
        }),
      );

      const order = await InboundOrder.create({
        ...input,
        orderNumber,
        status: 'draft',
        lines: resolvedLines,
      });

      return order.toObject();
    },

    confirmInboundOrder: async (_: unknown, { id }: { id: string }) => {
      const order = await InboundOrder.findByIdAndUpdate(
        id,
        { $set: { status: 'confirmed' } },
        { new: true },
      ).lean();
      return order;
    },

    cancelInboundOrder: async (_: unknown, { id }: { id: string }) => {
      const order = await InboundOrder.findById(id);
      if (!order) return { success: false, message: 'Inbound order not found', id: null };

      if (['received', 'done'].includes(order.status)) {
        return { success: false, message: '入庫済みのため取消できません', id };
      }

      await InboundOrder.findByIdAndUpdate(id, { $set: { status: 'cancelled' } });
      return { success: true, message: 'Inbound order cancelled', id };
    },

    // ─── 客户 / 顧客 ───

    createClient: async (_: unknown, { input }: { input: any }) => {
      const client = await Client.create({ ...input, isActive: true });
      return client.toObject();
    },

    updateClient: async (_: unknown, { id, input }: { id: string; input: any }) => {
      const client = await Client.findByIdAndUpdate(
        id,
        { $set: input },
        { new: true, runValidators: true },
      ).lean();
      return client;
    },

    // ─── 在庫調整 / 库存调整 ───

    adjustStock: async (_: unknown, { input }: { input: { productSku: string; locationId: string; quantity: number; reason?: string } }) => {
      const SQ = await getStockQuant();

      const quant = await SQ.findOne({
        productSku: input.productSku,
        locationId: input.locationId,
      });

      if (!quant) {
        // 新建库存记录 / 新規在庫レコードを作成
        if (input.quantity < 0) {
          return { success: false, message: '在庫が存在しません', id: null };
        }

        const product = await Product.findOne({ sku: input.productSku }, { _id: 1 }).lean();
        await SQ.create({
          productId: product?._id,
          productSku: input.productSku,
          locationId: input.locationId,
          quantity: input.quantity,
          reservedQuantity: 0,
        });

        extensionManager.emit(HOOK_EVENTS.INVENTORY_CHANGED, {
          type: 'adjustment',
          sku: input.productSku,
          currentStock: input.quantity,
          movedCount: input.quantity,
        }).catch((err) => logger.error({ err }, 'emit error'));

        return { success: true, message: `Stock created: ${input.quantity}`, id: null };
      }

      const newQty = quant.quantity + input.quantity;
      if (newQty < 0) {
        return { success: false, message: `在庫不足: 現在 ${quant.quantity}, 調整 ${input.quantity}`, id: null };
      }

      quant.quantity = newQty;
      await quant.save();

      extensionManager.emit(HOOK_EVENTS.INVENTORY_CHANGED, {
        type: 'adjustment',
        sku: input.productSku,
        currentStock: newQty,
        movedCount: input.quantity,
      }).catch((err) => logger.error({ err }, 'emit error'));

      return { success: true, message: `Stock adjusted to ${newQty}`, id: String(quant._id) };
    },
  },
};

// ─── 辅助 / ヘルパー ───

function flattenStatus(order: any) {
  if (!order) return null;
  const s = order.status || {};
  return {
    ...order,
    status: {
      confirmed: s.confirm?.isConfirmed ?? false,
      confirmedAt: s.confirm?.confirmedAt ?? null,
      printed: s.printed?.isPrinted ?? false,
      printedAt: s.printed?.printedAt ?? null,
      inspected: s.inspected?.isInspected ?? false,
      inspectedAt: s.inspected?.inspectedAt ?? null,
      shipped: s.shipped?.isShipped ?? false,
      shippedAt: s.shipped?.shippedAt ?? null,
      held: s.held?.isHeld ?? false,
      heldAt: s.held?.heldAt ?? null,
    },
  };
}
