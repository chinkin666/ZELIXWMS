/**
 * 03: 商品マスタ移行 / 商品主数据迁移
 *
 * MongoDB: products コレクション
 * PostgreSQL: products, product_sub_skus テーブル
 *
 * 最も複雑な移行。100+ フィールドのマッピングが必要。
 * 最复杂的迁移。需要映射 100+ 个字段。
 */

import { Db } from 'mongodb';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { products, productSubSkus } from '../../src/database/schema/products';
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

/**
 * MongoDB 商品ドキュメント → PostgreSQL products 行に変換
 * 将 MongoDB 商品文档转换为 PostgreSQL products 行
 */
function mapProduct(doc: any): Record<string, any> {
  const tenantId = objectIdToUuid((doc.tenantId || doc.tenant_id || doc._id).toString());

  return {
    id: objectIdToUuid(doc._id.toString()),
    tenantId,

    // 基本情報 / 基本信息
    sku: doc.sku || doc.SKU || `UNKNOWN-${doc._id}`,
    name: doc.name || doc.productName || 'Unknown Product',
    nameFull: doc.nameFull || doc.name_full || null,
    nameEn: doc.nameEn || doc.name_en || null,
    category: doc.category || '0',
    barcode: Array.isArray(doc.barcode) ? doc.barcode : (doc.barcode ? [doc.barcode] : []),
    janCode: doc.janCode || doc.jan_code || null,
    imageUrl: doc.imageUrl || doc.image_url || null,
    memo: doc.memo || null,

    // LOGIFAST 固有フィールド / LOGIFAST 特有字段
    customerProductCode: doc.customerProductCode || null,
    brandCode: doc.brandCode || null,
    brandName: doc.brandName || null,
    sizeName: doc.sizeName || null,
    colorName: doc.colorName || null,
    unitType: doc.unitType || null,

    // 寸法・重量 / 尺寸重量
    width: doc.width?.toString() || null,
    depth: doc.depth?.toString() || null,
    height: doc.height?.toString() || null,
    weight: doc.weight?.toString() || null,
    grossWeight: doc.grossWeight?.toString() || null,
    volume: doc.volume?.toString() || null,

    // 外箱 / 外箱
    outerBoxWidth: doc.outerBoxWidth?.toString() || null,
    outerBoxDepth: doc.outerBoxDepth?.toString() || null,
    outerBoxHeight: doc.outerBoxHeight?.toString() || null,
    outerBoxVolume: doc.outerBoxVolume?.toString() || null,
    outerBoxWeight: doc.outerBoxWeight?.toString() || null,
    caseQuantity: doc.caseQuantity || null,

    // 価格 / 价格
    price: doc.price?.toString() || null,
    costPrice: doc.costPrice?.toString() || null,
    taxType: doc.taxType || null,
    taxRate: doc.taxRate?.toString() || null,
    currency: doc.currency || null,

    // 配送 / 配送
    coolType: doc.coolType || '0',
    shippingSizeCode: doc.shippingSizeCode || null,
    mailCalcEnabled: doc.mailCalcEnabled ?? false,
    mailCalcMaxQuantity: doc.mailCalcMaxQuantity || null,

    // 管理区分 / 管理区分
    inventoryEnabled: doc.inventoryEnabled ?? false,
    lotTrackingEnabled: doc.lotTrackingEnabled ?? false,
    expiryTrackingEnabled: doc.expiryTrackingEnabled ?? false,
    serialTrackingEnabled: doc.serialTrackingEnabled ?? false,
    alertDaysBeforeExpiry: doc.alertDaysBeforeExpiry ?? 30,
    inboundExpiryDays: doc.inboundExpiryDays || null,
    safetyStock: doc.safetyStock ?? 0,
    allocationRule: doc.allocationRule || 'FIFO',

    // 仕入先 / 供货方
    supplierCode: doc.supplierCode || null,
    supplierName: doc.supplierName || null,

    // Amazon FBA / 楽天 RSL
    fnsku: doc.fnsku || null,
    asin: doc.asin || null,
    amazonSku: doc.amazonSku || null,
    fbaEnabled: doc.fbaEnabled ?? false,
    rakutenSku: doc.rakutenSku || null,
    rslEnabled: doc.rslEnabled ?? false,

    // モール別コード / 各平台编码
    marketplaceCodes: doc.marketplaceCodes || {},
    wholesalePartnerCodes: doc.wholesalePartnerCodes || {},

    // その他 / 其他
    hazardousType: doc.hazardousType || '0',
    airTransportBan: doc.airTransportBan ?? false,
    barcodeCommission: doc.barcodeCommission ?? false,
    reservationTarget: doc.reservationTarget ?? false,
    paidType: doc.paidType || '0',
    countryOfOrigin: doc.countryOfOrigin || null,
    handlingTypes: doc.handlingTypes || [],
    defaultHandlingTags: doc.defaultHandlingTags || [],
    remarks: doc.remarks || [],
    customFields: doc.customFields || {},

    // 倉庫メモ / 仓库备注
    whPreferredLocation: doc.whPreferredLocation || null,
    whHandlingNotes: doc.whHandlingNotes || null,
    whIsFragile: doc.whIsFragile ?? false,
    whIsLiquid: doc.whIsLiquid ?? false,
    whRequiresOppBag: doc.whRequiresOppBag ?? false,
    whStorageType: doc.whStorageType || null,

    // 所属 / 归属
    clientId: objectIdToUuidOrNull(doc.clientId),
    subClientId: objectIdToUuidOrNull(doc.subClientId),
    shopId: objectIdToUuidOrNull(doc.shopId),

    // タイムスタンプ / 时间戳
    createdAt: toTimestamp(doc.createdAt) || new Date(),
    updatedAt: toTimestamp(doc.updatedAt) || new Date(),
    deletedAt: toTimestamp(doc.deletedAt),
  };
}

/**
 * 商品マスタを移行する / 迁移商品主数据
 */
export async function migrateProducts(
  mongoDb: Db,
  pgDb: NodePgDatabase,
): Promise<BatchResult> {
  logStart('03 - Products / 商品 / 商品');

  const mongoProducts = await mongoDb.collection('products').find({}).toArray();
  console.log(`  Found ${mongoProducts.length} products in MongoDB`);

  // ステップ1: products テーブルを移行 / 步骤1: 迁移 products 表
  const result = await processBatch(mongoProducts, DEFAULT_BATCH_SIZE, async (batch) => {
    const values = batch.map(mapProduct);
    await pgDb.insert(products).values(values as any).onConflictDoNothing();
  });

  logComplete('Products (main)', result);

  // ステップ2: 子SKU を移行 / 步骤2: 迁移子SKU
  console.log('\n  Migrating sub-SKUs...');
  let subSkuCount = 0;

  for (const doc of mongoProducts) {
    const subSkus = doc.subSkus || doc.sub_skus || [];
    if (!Array.isArray(subSkus) || subSkus.length === 0) continue;

    const productId = objectIdToUuid(doc._id.toString());
    const subSkuValues = subSkus.map((sub: any) => ({
      id: objectIdToUuid(sub._id?.toString() || `${doc._id}-${sub.code || sub.subSku}`),
      productId,
      subSku: sub.code || sub.subSku || sub.sku || 'UNKNOWN',
      price: sub.price?.toString() || null,
      description: sub.description || null,
      isActive: sub.isActive ?? true,
    }));

    await pgDb.insert(productSubSkus).values(subSkuValues).onConflictDoNothing();
    subSkuCount += subSkuValues.length;
  }

  console.log(`  Migrated ${subSkuCount} sub-SKUs`);
  return result;
}

if (require.main === module) {
  console.log('Run via run-all.ts or initialize connections manually.');
}
