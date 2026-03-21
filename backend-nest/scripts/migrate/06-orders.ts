/**
 * 06: 注文移行 / 订单迁移
 *
 * MongoDB: shipmentOrders, inboundOrders, returnOrders コレクション
 * PostgreSQL: shipment_orders, shipment_order_products, shipment_order_materials,
 *             inbound_orders, inbound_order_lines,
 *             return_orders, return_order_lines テーブル
 *
 * 依存: tenants, products, clients, warehouses が先に移行済みであること。
 * 依赖: tenants, products, clients, warehouses 必须先完成迁移。
 */

import { Db } from 'mongodb';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  shipmentOrders,
  shipmentOrderProducts,
  shipmentOrderMaterials,
} from '../../src/database/schema/shipments';
import { inboundOrders, inboundOrderLines } from '../../src/database/schema/inbound';
import { returnOrders, returnOrderLines } from '../../src/database/schema/returns';
import {
  objectIdToUuid,
  objectIdToUuidOrNull,
  toTimestamp,
  processBatch,
  logStart,
  logComplete,
  DEFAULT_BATCH_SIZE,
  BatchResult,
} from './utils';

// ============================================
// 出荷注文 / 出货订单
// ============================================

/**
 * 出荷注文を移行 / 迁移出货订单
 */
export async function migrateShipmentOrders(
  mongoDb: Db,
  pgDb: NodePgDatabase,
): Promise<BatchResult> {
  logStart('06a - Shipment Orders / 出荷注文 / 出货订单');

  const mongoDocs = await mongoDb.collection('shipmentOrders').find({}).toArray();
  console.log(`  Found ${mongoDocs.length} shipment orders in MongoDB`);

  // メインテーブル / 主表
  const result = await processBatch(mongoDocs, DEFAULT_BATCH_SIZE, async (batch) => {
    const values = batch.map((doc) => ({
      id: objectIdToUuid(doc._id.toString()),
      tenantId: objectIdToUuid((doc.tenantId || doc.tenant_id || doc._id).toString()),

      // 基本情報 / 基本信息
      orderNumber: doc.orderNumber || doc.order_number || `ORD-${doc._id}`,
      destinationType: doc.destinationType || 'B2C',
      fbaShipmentId: doc.fbaShipmentId || null,
      fbaDestination: doc.fbaDestination || null,

      // 配送業者 / 配送商
      carrierId: doc.carrierId || null,
      trackingId: doc.trackingId || null,
      customerManagementNumber: doc.customerManagementNumber || null,

      // ステータスフラグ / 状态标志
      statusConfirmed: doc.statusConfirmed ?? doc.confirmed ?? false,
      statusConfirmedAt: toTimestamp(doc.statusConfirmedAt || doc.confirmedAt),
      statusCarrierReceived: doc.statusCarrierReceived ?? false,
      statusCarrierReceivedAt: toTimestamp(doc.statusCarrierReceivedAt),
      statusPrinted: doc.statusPrinted ?? doc.printed ?? false,
      statusPrintedAt: toTimestamp(doc.statusPrintedAt || doc.printedAt),
      statusInspected: doc.statusInspected ?? doc.inspected ?? false,
      statusInspectedAt: toTimestamp(doc.statusInspectedAt || doc.inspectedAt),
      statusShipped: doc.statusShipped ?? doc.shipped ?? false,
      statusShippedAt: toTimestamp(doc.statusShippedAt || doc.shippedAt),
      statusEcExported: doc.statusEcExported ?? false,
      statusEcExportedAt: toTimestamp(doc.statusEcExportedAt),
      statusHeld: doc.statusHeld ?? doc.held ?? false,
      statusHeldAt: toTimestamp(doc.statusHeldAt),

      // 送付先住所 / 收件人地址
      recipientPostalCode: doc.recipientPostalCode || doc.recipient?.postalCode || null,
      recipientPrefecture: doc.recipientPrefecture || doc.recipient?.prefecture || null,
      recipientCity: doc.recipientCity || doc.recipient?.city || null,
      recipientStreet: doc.recipientStreet || doc.recipient?.street || null,
      recipientBuilding: doc.recipientBuilding || doc.recipient?.building || null,
      recipientName: doc.recipientName || doc.recipient?.name || null,
      recipientPhone: doc.recipientPhone || doc.recipient?.phone || null,
      honorific: doc.honorific || '様',

      // 依頼主住所 / 发件人地址
      senderPostalCode: doc.senderPostalCode || doc.sender?.postalCode || null,
      senderPrefecture: doc.senderPrefecture || doc.sender?.prefecture || null,
      senderCity: doc.senderCity || doc.sender?.city || null,
      senderStreet: doc.senderStreet || doc.sender?.street || null,
      senderBuilding: doc.senderBuilding || doc.sender?.building || null,
      senderName: doc.senderName || doc.sender?.name || null,
      senderPhone: doc.senderPhone || doc.sender?.phone || null,

      // 注文者住所 / 下单人地址
      ordererPostalCode: doc.ordererPostalCode || null,
      ordererPrefecture: doc.ordererPrefecture || null,
      ordererCity: doc.ordererCity || null,
      ordererStreet: doc.ordererStreet || null,
      ordererBuilding: doc.ordererBuilding || null,
      ordererName: doc.ordererName || null,
      ordererPhone: doc.ordererPhone || null,

      // 配送希望 / 配送偏好
      shipPlanDate: doc.shipPlanDate || null,
      invoiceType: doc.invoiceType || null,
      coolType: doc.coolType || null,
      deliveryTimeSlot: doc.deliveryTimeSlot || null,
      deliveryDatePreference: doc.deliveryDatePreference || null,
      sourceOrderAt: toTimestamp(doc.sourceOrderAt),

      // JSON フィールド / JSON 字段
      carrierData: doc.carrierData || null,
      costSummary: doc.costSummary || null,
      shippingCost: doc.shippingCost?.toString() || null,
      shippingCostBreakdown: doc.shippingCostBreakdown || null,
      costSource: doc.costSource || null,
      costCalculatedAt: toTimestamp(doc.costCalculatedAt),
      handlingTags: doc.handlingTags || [],
      customFields: doc.customFields || {},
      _productsMeta: doc._productsMeta || null,
      sourceRawRows: doc.sourceRawRows || null,
      carrierRawRow: doc.carrierRawRow || null,
      internalRecord: doc.internalRecord || null,

      // 関連 / 关联
      orderGroupId: objectIdToUuidOrNull(doc.orderGroupId),
      orderSourceCompanyId: objectIdToUuidOrNull(doc.orderSourceCompanyId),

      // タイムスタンプ / 时间戳
      createdAt: toTimestamp(doc.createdAt) || new Date(),
      updatedAt: toTimestamp(doc.updatedAt) || new Date(),
      deletedAt: toTimestamp(doc.deletedAt),
    }));

    await pgDb.insert(shipmentOrders).values(values).onConflictDoNothing();
  });

  logComplete('Shipment Orders (main)', result);

  // 商品明細 / 商品明细
  console.log('\n  Migrating shipment order products...');
  let productCount = 0;
  for (const doc of mongoDocs) {
    const items = doc.products || doc.items || [];
    if (!Array.isArray(items) || items.length === 0) continue;

    const orderId = objectIdToUuid(doc._id.toString());
    const tenantId = objectIdToUuid((doc.tenantId || doc.tenant_id || doc._id).toString());

    const values = items.map((item: any, idx: number) => ({
      id: objectIdToUuid(item._id?.toString() || `${doc._id}-p-${idx}`),
      tenantId,
      shipmentOrderId: orderId,
      inputSku: item.inputSku || item.sku || item.SKU || 'UNKNOWN',
      quantity: item.quantity || 1,
      productId: objectIdToUuidOrNull(item.productId),
      productSku: item.productSku || item.sku || null,
      productName: item.productName || item.name || null,
      unitPrice: item.unitPrice?.toString() || null,
      subtotal: item.subtotal?.toString() || null,
      coolType: item.coolType || null,
      barcode: item.barcode || [],
      imageUrl: item.imageUrl || null,
      matchedSubSku: item.matchedSubSku || null,
      mailCalcEnabled: item.mailCalcEnabled || null,
      mailCalcMaxQuantity: item.mailCalcMaxQuantity || null,
    }));

    await pgDb.insert(shipmentOrderProducts).values(values).onConflictDoNothing();
    productCount += values.length;
  }
  console.log(`  Migrated ${productCount} shipment order products`);

  // 耗材明細 / 耗材明细
  console.log('\n  Migrating shipment order materials...');
  let materialCount = 0;
  for (const doc of mongoDocs) {
    const materials = doc.materials || [];
    if (!Array.isArray(materials) || materials.length === 0) continue;

    const orderId = objectIdToUuid(doc._id.toString());
    const tenantId = objectIdToUuid((doc.tenantId || doc.tenant_id || doc._id).toString());

    const values = materials.map((mat: any, idx: number) => ({
      id: objectIdToUuid(mat._id?.toString() || `${doc._id}-m-${idx}`),
      tenantId,
      shipmentOrderId: orderId,
      materialSku: mat.materialSku || mat.sku || 'UNKNOWN',
      materialName: mat.materialName || mat.name || null,
      quantity: mat.quantity || 1,
      unitCost: mat.unitCost?.toString() || null,
      totalCost: mat.totalCost?.toString() || null,
      auto: mat.auto ?? false,
    }));

    await pgDb.insert(shipmentOrderMaterials).values(values).onConflictDoNothing();
    materialCount += values.length;
  }
  console.log(`  Migrated ${materialCount} shipment order materials`);

  return result;
}

// ============================================
// 入庫注文 / 入库订单
// ============================================

/**
 * 入庫注文を移行 / 迁移入库订单
 */
export async function migrateInboundOrders(
  mongoDb: Db,
  pgDb: NodePgDatabase,
): Promise<BatchResult> {
  logStart('06b - Inbound Orders / 入庫注文 / 入库订单');

  const mongoDocs = await mongoDb.collection('inboundOrders').find({}).toArray();
  console.log(`  Found ${mongoDocs.length} inbound orders in MongoDB`);

  const result = await processBatch(mongoDocs, DEFAULT_BATCH_SIZE, async (batch) => {
    const values = batch.map((doc) => ({
      id: objectIdToUuid(doc._id.toString()),
      tenantId: objectIdToUuid((doc.tenantId || doc.tenant_id || doc._id).toString()),
      orderNumber: doc.orderNumber || doc.order_number || `INB-${doc._id}`,
      status: doc.status || 'draft',
      flowType: doc.flowType || 'standard',
      clientId: objectIdToUuidOrNull(doc.clientId),
      supplierId: objectIdToUuidOrNull(doc.supplierId),
      warehouseId: objectIdToUuidOrNull(doc.warehouseId),
      expectedDate: toTimestamp(doc.expectedDate),
      notes: doc.notes || null,
      linkedOrderIds: doc.linkedOrderIds || [],
      fbaInfo: doc.fbaInfo || null,
      rslInfo: doc.rslInfo || null,
      b2bInfo: doc.b2bInfo || null,
      serviceOptions: doc.serviceOptions || [],
      createdAt: toTimestamp(doc.createdAt) || new Date(),
      updatedAt: toTimestamp(doc.updatedAt) || new Date(),
      deletedAt: toTimestamp(doc.deletedAt),
    }));

    await pgDb.insert(inboundOrders).values(values).onConflictDoNothing();
  });

  logComplete('Inbound Orders (main)', result);

  // 明細行 / 明细行
  console.log('\n  Migrating inbound order lines...');
  let lineCount = 0;
  for (const doc of mongoDocs) {
    const lines = doc.lines || doc.items || [];
    if (!Array.isArray(lines) || lines.length === 0) continue;

    const orderId = objectIdToUuid(doc._id.toString());
    const tenantId = objectIdToUuid((doc.tenantId || doc.tenant_id || doc._id).toString());

    const values = lines.map((line: any, idx: number) => ({
      id: objectIdToUuid(line._id?.toString() || `${doc._id}-l-${idx}`),
      tenantId,
      inboundOrderId: orderId,
      productId: objectIdToUuidOrNull(line.productId),
      productSku: line.productSku || line.sku || 'UNKNOWN',
      expectedQuantity: line.expectedQuantity ?? line.quantity ?? 0,
      receivedQuantity: line.receivedQuantity ?? 0,
      damagedQuantity: line.damagedQuantity ?? 0,
      locationId: objectIdToUuidOrNull(line.locationId),
      lotId: objectIdToUuidOrNull(line.lotId),
      unitPrice: line.unitPrice?.toString() || null,
      putawayLocationId: objectIdToUuidOrNull(line.putawayLocationId),
      putawayQuantity: line.putawayQuantity ?? 0,
      stockMoveIds: line.stockMoveIds || [],
      memo: line.memo || null,
      createdAt: toTimestamp(line.createdAt) || new Date(),
      updatedAt: toTimestamp(line.updatedAt) || new Date(),
    }));

    await pgDb.insert(inboundOrderLines).values(values).onConflictDoNothing();
    lineCount += values.length;
  }
  console.log(`  Migrated ${lineCount} inbound order lines`);

  return result;
}

// ============================================
// 返品注文 / 退货订单
// ============================================

/**
 * 返品注文を移行 / 迁移退货订单
 */
export async function migrateReturnOrders(
  mongoDb: Db,
  pgDb: NodePgDatabase,
): Promise<BatchResult> {
  logStart('06c - Return Orders / 返品注文 / 退货订单');

  const mongoDocs = await mongoDb.collection('returnOrders').find({}).toArray();
  console.log(`  Found ${mongoDocs.length} return orders in MongoDB`);

  const result = await processBatch(mongoDocs, DEFAULT_BATCH_SIZE, async (batch) => {
    const values = batch.map((doc) => ({
      id: objectIdToUuid(doc._id.toString()),
      tenantId: objectIdToUuid((doc.tenantId || doc.tenant_id || doc._id).toString()),
      orderNumber: doc.orderNumber || doc.order_number || `RET-${doc._id}`,
      status: doc.status || 'draft',
      returnReason: doc.returnReason || doc.reason || 'other',
      rmaNumber: doc.rmaNumber || null,
      returnTrackingId: doc.returnTrackingId || null,
      shipmentOrderId: objectIdToUuidOrNull(doc.shipmentOrderId),
      clientId: objectIdToUuidOrNull(doc.clientId),
      notes: doc.notes || null,
      createdAt: toTimestamp(doc.createdAt) || new Date(),
      updatedAt: toTimestamp(doc.updatedAt) || new Date(),
      deletedAt: toTimestamp(doc.deletedAt),
    }));

    await pgDb.insert(returnOrders).values(values).onConflictDoNothing();
  });

  logComplete('Return Orders (main)', result);

  // 明細行 / 明细行
  console.log('\n  Migrating return order lines...');
  let lineCount = 0;
  for (const doc of mongoDocs) {
    const lines = doc.lines || doc.items || [];
    if (!Array.isArray(lines) || lines.length === 0) continue;

    const orderId = objectIdToUuid(doc._id.toString());
    const tenantId = objectIdToUuid((doc.tenantId || doc.tenant_id || doc._id).toString());

    const values = lines.map((line: any, idx: number) => ({
      id: objectIdToUuid(line._id?.toString() || `${doc._id}-rl-${idx}`),
      tenantId,
      returnOrderId: orderId,
      productId: objectIdToUuidOrNull(line.productId),
      productSku: line.productSku || line.sku || 'UNKNOWN',
      quantity: line.quantity ?? 0,
      inspectedQuantity: line.inspectedQuantity ?? 0,
      disposition: line.disposition || 'pending',
      restockedQuantity: line.restockedQuantity ?? 0,
      disposedQuantity: line.disposedQuantity ?? 0,
      locationId: objectIdToUuidOrNull(line.locationId),
      lotId: objectIdToUuidOrNull(line.lotId),
      inspectionNotes: line.inspectionNotes || null,
      createdAt: toTimestamp(line.createdAt) || new Date(),
      updatedAt: toTimestamp(line.updatedAt) || new Date(),
    }));

    await pgDb.insert(returnOrderLines).values(values).onConflictDoNothing();
    lineCount += values.length;
  }
  console.log(`  Migrated ${lineCount} return order lines`);

  return result;
}

/**
 * 全注文を一括移行 / 一次性迁移所有订单
 */
export async function migrateAllOrders(
  mongoDb: Db,
  pgDb: NodePgDatabase,
): Promise<void> {
  await migrateShipmentOrders(mongoDb, pgDb);
  await migrateInboundOrders(mongoDb, pgDb);
  await migrateReturnOrders(mongoDb, pgDb);
}

if (require.main === module) {
  console.log('Run via run-all.ts or initialize connections manually.');
}
