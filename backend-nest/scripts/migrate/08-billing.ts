/**
 * 08: 請求・料金移行 / 请求・费率迁移
 *
 * MongoDB: serviceRates, shippingRates, workCharges, billingRecords, invoices コレクション
 * PostgreSQL: service_rates, shipping_rates, work_charges, billing_records, invoices テーブル
 *
 * 依存: tenants, clients が先に移行済みであること。
 * 依赖: tenants, clients 必须先完成迁移。
 */

import { Db } from 'mongodb';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  serviceRates,
  shippingRates,
  workCharges,
  billingRecords,
  invoices,
} from '../../src/database/schema/billing';
import {
  objectIdToUuid,
  objectIdToUuidOrNull,
  toTimestamp,
  toDateString,
  processBatch,
  logStart,
  logComplete,
  DEFAULT_BATCH_SIZE,
  BatchResult,
} from './utils';

// ============================================
// サービス料金マスタ / 服务费率主数据
// ============================================

/**
 * サービス料金を移行 / 迁移服务费率
 */
export async function migrateServiceRates(
  mongoDb: Db,
  pgDb: NodePgDatabase,
): Promise<BatchResult> {
  logStart('08a - Service Rates / サービス料金 / 服务费率');

  const mongoDocs = await mongoDb.collection('serviceRates').find({}).toArray();
  console.log(`  Found ${mongoDocs.length} service rates in MongoDB`);

  const result = await processBatch(mongoDocs, DEFAULT_BATCH_SIZE, async (batch) => {
    const values = batch.map((doc) => ({
      id: objectIdToUuid(doc._id.toString()),
      tenantId: objectIdToUuid((doc.tenantId || doc.tenant_id || doc._id).toString()),
      name: doc.name || 'Unknown Rate',
      chargeType: doc.chargeType || doc.charge_type || 'other',
      unit: doc.unit || 'per_item',
      unitPrice: doc.unitPrice?.toString() || doc.unit_price?.toString() || '0',
      clientId: objectIdToUuidOrNull(doc.clientId),
      clientName: doc.clientName || null,
      conditions: doc.conditions || null,
      validFrom: toTimestamp(doc.validFrom),
      validTo: toTimestamp(doc.validTo),
      isActive: doc.isActive ?? true,
      memo: doc.memo || null,
      createdAt: toTimestamp(doc.createdAt) || new Date(),
      updatedAt: toTimestamp(doc.updatedAt) || new Date(),
    }));

    await pgDb.insert(serviceRates).values(values).onConflictDoNothing();
  });

  logComplete('Service Rates', result);
  return result;
}

// ============================================
// 運費率表 / 运费率表
// ============================================

/**
 * 運賃率を移行 / 迁移运费率
 */
export async function migrateShippingRates(
  mongoDb: Db,
  pgDb: NodePgDatabase,
): Promise<BatchResult> {
  logStart('08b - Shipping Rates / 運費率 / 运费率');

  const mongoDocs = await mongoDb.collection('shippingRates').find({}).toArray();
  console.log(`  Found ${mongoDocs.length} shipping rates in MongoDB`);

  const result = await processBatch(mongoDocs, DEFAULT_BATCH_SIZE, async (batch) => {
    const values = batch.map((doc) => ({
      id: objectIdToUuid(doc._id.toString()),
      tenantId: objectIdToUuid((doc.tenantId || doc.tenant_id || doc._id).toString()),
      carrierId: objectIdToUuid((doc.carrierId || doc.carrier_id).toString()),
      carrierName: doc.carrierName || null,
      name: doc.name || 'Unknown Rate',
      sizeType: doc.sizeType || 'flat',
      sizeMin: doc.sizeMin?.toString() || null,
      sizeMax: doc.sizeMax?.toString() || null,
      fromPrefectures: doc.fromPrefectures || null,
      toPrefectures: doc.toPrefectures || null,
      basePrice: doc.basePrice?.toString() || doc.base_price?.toString() || '0',
      coolSurcharge: doc.coolSurcharge?.toString() || '0',
      codSurcharge: doc.codSurcharge?.toString() || '0',
      fuelSurcharge: doc.fuelSurcharge?.toString() || '0',
      validFrom: toTimestamp(doc.validFrom),
      validTo: toTimestamp(doc.validTo),
      isActive: doc.isActive ?? true,
      memo: doc.memo || null,
      createdAt: toTimestamp(doc.createdAt) || new Date(),
      updatedAt: toTimestamp(doc.updatedAt) || new Date(),
    }));

    await pgDb.insert(shippingRates).values(values).onConflictDoNothing();
  });

  logComplete('Shipping Rates', result);
  return result;
}

// ============================================
// 作業チャージ / 作业费用
// ============================================

/**
 * 作業チャージを移行 / 迁移作业费用
 */
export async function migrateWorkCharges(
  mongoDb: Db,
  pgDb: NodePgDatabase,
): Promise<BatchResult> {
  logStart('08c - Work Charges / 作業チャージ / 作业费用');

  const mongoDocs = await mongoDb.collection('workCharges').find({}).toArray();
  console.log(`  Found ${mongoDocs.length} work charges in MongoDB`);

  const result = await processBatch(mongoDocs, DEFAULT_BATCH_SIZE, async (batch) => {
    const values = batch.map((doc) => ({
      id: objectIdToUuid(doc._id.toString()),
      tenantId: objectIdToUuid((doc.tenantId || doc.tenant_id || doc._id).toString()),
      chargeType: doc.chargeType || doc.charge_type || 'other',
      chargeDate: toDateString(doc.chargeDate || doc.charge_date) || new Date().toISOString().split('T')[0],
      referenceType: doc.referenceType || 'manual',
      referenceId: objectIdToUuidOrNull(doc.referenceId),
      referenceNumber: doc.referenceNumber || null,
      clientId: objectIdToUuidOrNull(doc.clientId),
      clientName: doc.clientName || null,
      subClientId: objectIdToUuidOrNull(doc.subClientId),
      subClientName: doc.subClientName || null,
      shopId: objectIdToUuidOrNull(doc.shopId),
      shopName: doc.shopName || null,
      quantity: doc.quantity ?? 1,
      unitPrice: doc.unitPrice?.toString() || '0',
      amount: doc.amount?.toString() || '0',
      description: doc.description || 'Migrated charge',
      billingPeriod: doc.billingPeriod || null,
      billingRecordId: objectIdToUuidOrNull(doc.billingRecordId),
      isBilled: doc.isBilled ?? false,
      memo: doc.memo || null,
      createdAt: toTimestamp(doc.createdAt) || new Date(),
      updatedAt: toTimestamp(doc.updatedAt) || new Date(),
    }));

    await pgDb.insert(workCharges).values(values).onConflictDoNothing();
  });

  logComplete('Work Charges', result);
  return result;
}

// ============================================
// 請求明細 / 请求明细
// ============================================

/**
 * 請求明細を移行 / 迁移请求明细
 */
export async function migrateBillingRecords(
  mongoDb: Db,
  pgDb: NodePgDatabase,
): Promise<BatchResult> {
  logStart('08d - Billing Records / 請求明細 / 请求明细');

  const mongoDocs = await mongoDb.collection('billingRecords').find({}).toArray();
  console.log(`  Found ${mongoDocs.length} billing records in MongoDB`);

  const result = await processBatch(mongoDocs, DEFAULT_BATCH_SIZE, async (batch) => {
    const values = batch.map((doc) => ({
      id: objectIdToUuid(doc._id.toString()),
      tenantId: objectIdToUuid((doc.tenantId || doc.tenant_id || doc._id).toString()),
      period: doc.period || 'unknown',
      clientId: objectIdToUuidOrNull(doc.clientId),
      clientName: doc.clientName || null,
      carrierId: objectIdToUuidOrNull(doc.carrierId),
      carrierName: doc.carrierName || null,
      orderCount: doc.orderCount ?? 0,
      totalQuantity: doc.totalQuantity ?? 0,
      totalShippingCost: doc.totalShippingCost?.toString() || '0',
      handlingFee: doc.handlingFee?.toString() || '0',
      storageFee: doc.storageFee?.toString() || '0',
      otherFees: doc.otherFees?.toString() || '0',
      totalAmount: doc.totalAmount?.toString() || '0',
      status: doc.status || 'draft',
      confirmedAt: toTimestamp(doc.confirmedAt),
      confirmedBy: objectIdToUuidOrNull(doc.confirmedBy),
      memo: doc.memo || null,
      createdAt: toTimestamp(doc.createdAt) || new Date(),
      updatedAt: toTimestamp(doc.updatedAt) || new Date(),
    }));

    await pgDb.insert(billingRecords).values(values).onConflictDoNothing();
  });

  logComplete('Billing Records', result);
  return result;
}

// ============================================
// 請求書 / 发票
// ============================================

/**
 * 請求書を移行 / 迁移发票
 */
export async function migrateInvoices(
  mongoDb: Db,
  pgDb: NodePgDatabase,
): Promise<BatchResult> {
  logStart('08e - Invoices / 請求書 / 发票');

  const mongoDocs = await mongoDb.collection('invoices').find({}).toArray();
  console.log(`  Found ${mongoDocs.length} invoices in MongoDB`);

  const result = await processBatch(mongoDocs, DEFAULT_BATCH_SIZE, async (batch) => {
    const values = batch.map((doc) => ({
      id: objectIdToUuid(doc._id.toString()),
      tenantId: objectIdToUuid((doc.tenantId || doc.tenant_id || doc._id).toString()),
      invoiceNumber: doc.invoiceNumber || doc.invoice_number || `INV-MIG-${doc._id}`,
      billingRecordId: objectIdToUuidOrNull(doc.billingRecordId),
      clientId: objectIdToUuidOrNull(doc.clientId),
      clientName: doc.clientName || null,
      period: doc.period || 'unknown',
      issueDate: toDateString(doc.issueDate || doc.issue_date) || new Date().toISOString().split('T')[0],
      subtotal: doc.subtotal?.toString() || '0',
      taxRate: doc.taxRate?.toString() || '0.10',
      taxAmount: doc.taxAmount?.toString() || '0',
      totalAmount: doc.totalAmount?.toString() || '0',
      dueDate: toDateString(doc.dueDate || doc.due_date) || new Date().toISOString().split('T')[0],
      status: doc.status || 'draft',
      lineItems: doc.lineItems || doc.line_items || [],
      paidAt: toTimestamp(doc.paidAt),
      memo: doc.memo || null,
      createdAt: toTimestamp(doc.createdAt) || new Date(),
      updatedAt: toTimestamp(doc.updatedAt) || new Date(),
    }));

    await pgDb.insert(invoices).values(values).onConflictDoNothing();
  });

  logComplete('Invoices', result);
  return result;
}

/**
 * 請求関連を一括移行 / 一次性迁移请求相关数据
 */
export async function migrateAllBilling(
  mongoDb: Db,
  pgDb: NodePgDatabase,
): Promise<void> {
  await migrateServiceRates(mongoDb, pgDb);
  await migrateShippingRates(mongoDb, pgDb);
  await migrateWorkCharges(mongoDb, pgDb);
  await migrateBillingRecords(mongoDb, pgDb);
  await migrateInvoices(mongoDb, pgDb);
}

if (require.main === module) {
  console.log('Run via run-all.ts or initialize connections manually.');
}
