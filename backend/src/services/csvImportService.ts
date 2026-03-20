/**
 * CSV 批量导入サービス / CSV 一括インポートサービス
 *
 * 出荷指示・商品・入庫予定の CSV 一括インポート。
 * 出荷指示、商品、入库预定的 CSV 批量导入。
 *
 * 処理フロー / 处理流程:
 * 1. CSV パース + ヘッダーマッピング
 * 2. 行ごとバリデーション
 * 3. プレビュー or 確定実行
 * 4. エラーレポート返却
 */

import { parse } from 'csv-parse/sync';
import { logger } from '@/lib/logger';
import { ShipmentOrder, calculateProductsMeta } from '@/models/shipmentOrder';
import { Product } from '@/models/product';
import { InboundOrder } from '@/models/inboundOrder';
import { generateSequenceNumber } from '@/utils/sequenceGenerator';

// ─── 共通型 / 共通型 ───

export interface ImportResult {
  success: boolean;
  totalRows: number;
  importedCount: number;
  skippedCount: number;
  errors: Array<{ row: number; field?: string; message: string }>;
  /** 導入された ID 一覧 / インポートされた ID 一覧 */
  importedIds: string[];
}

interface CsvRow {
  [key: string]: string;
}

// ─── 出荷指示一括インポート / 出荷指示批量导入 ───

/**
 * 出荷指示 CSV ヘッダーマッピング / 出荷指示 CSV 标题映射
 *
 * 日本語/英語/中国語のヘッダーを内部フィールドにマッピング。
 * 日语/英语/中文的标题映射到内部字段。
 */
const SHIPMENT_HEADER_MAP: Record<string, string> = {
  // 日本語 / 日本語
  'お客様管理番号': 'customerManagementNumber',
  '送り先名称': 'recipientName',
  '送り先郵便番号': 'recipientPostalCode',
  '送り先都道府県': 'recipientPrefecture',
  '送り先市区町村': 'recipientCity',
  '送り先番地': 'recipientStreet',
  '送り先建物名': 'recipientBuilding',
  '送り先電話番号': 'recipientPhone',
  '出荷予定日': 'shipPlanDate',
  '商品SKU': 'productSku',
  '商品名': 'productName',
  '数量': 'quantity',
  '単価': 'price',
  '配送種別': 'destinationType',
  'メモ': 'memo',
  // 英語 / English
  'customer_number': 'customerManagementNumber',
  'recipient_name': 'recipientName',
  'recipient_postal_code': 'recipientPostalCode',
  'recipient_prefecture': 'recipientPrefecture',
  'recipient_city': 'recipientCity',
  'recipient_street': 'recipientStreet',
  'recipient_building': 'recipientBuilding',
  'recipient_phone': 'recipientPhone',
  'ship_date': 'shipPlanDate',
  'product_sku': 'productSku',
  'product_name': 'productName',
  'qty': 'quantity',
  'unit_price': 'price',
  'destination_type': 'destinationType',
  'memo': 'memo',
};

/**
 * 出荷指示 CSV インポート / 出荷指示 CSV 导入
 */
export async function importShipmentOrders(
  csvContent: string,
  options?: { dryRun?: boolean; carrierId?: string },
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    totalRows: 0,
    importedCount: 0,
    skippedCount: 0,
    errors: [],
    importedIds: [],
  };

  // 1. CSV パース / CSV 解析
  let rows: CsvRow[];
  try {
    rows = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true, // BOM 自動除去 / BOM 自动去除
    });
  } catch (err) {
    result.errors.push({ row: 0, message: `CSV parse error: ${(err as Error).message}` });
    return result;
  }

  result.totalRows = rows.length;
  if (rows.length === 0) {
    result.errors.push({ row: 0, message: 'CSV is empty / CSV が空です' });
    return result;
  }

  // 2. ヘッダーマッピング / 标题映射
  const mapped = rows.map((row) => mapHeaders(row, SHIPMENT_HEADER_MAP));

  // 3. 同一 customerManagementNumber でグループ化（1注文=複数行の場合）
  // 按 customerManagementNumber 分组（1个订单可能多行）
  const grouped = groupByOrder(mapped);

  // 4. バリデーション + 構築 / 校验 + 构建
  const ordersToInsert: any[] = [];

  for (const [orderKey, lines] of grouped) {
    const firstLine = lines[0];
    const rowNum = firstLine._rowNum;

    // 必須フィールド / 必填字段
    if (!firstLine.recipientName) {
      result.errors.push({ row: rowNum, field: 'recipientName', message: '送り先名称は必須 / 收件人名称必填' });
      result.skippedCount++;
      continue;
    }

    // 商品行バリデーション / 商品行校验
    const products: any[] = [];
    let lineValid = true;

    for (const line of lines) {
      if (!line.productSku) {
        result.errors.push({ row: line._rowNum, field: 'productSku', message: '商品SKUは必須 / 商品SKU必填' });
        lineValid = false;
        continue;
      }
      const qty = parseInt(line.quantity, 10);
      if (!qty || qty <= 0) {
        result.errors.push({ row: line._rowNum, field: 'quantity', message: '数量は1以上 / 数量必须>=1' });
        lineValid = false;
        continue;
      }
      products.push({
        inputSku: line.productSku,
        productSku: line.productSku,
        productName: line.productName || line.productSku,
        quantity: qty,
        price: parseFloat(line.price) || 0,
      });
    }

    if (!lineValid) { result.skippedCount++; continue; }

    const orderNumber = await generateSequenceNumber('shipment-order');
    ordersToInsert.push({
      orderNumber,
      customerManagementNumber: firstLine.customerManagementNumber || orderNumber,
      carrierId: options?.carrierId || '__csv_import__',
      invoiceType: '0',
      sender: {
        name: '-', phone: '-', postalCode: '000-0000',
        prefecture: '-', city: '-', street: '-',
      },
      recipient: {
        name: firstLine.recipientName,
        postalCode: firstLine.recipientPostalCode || '000-0000',
        prefecture: firstLine.recipientPrefecture || '-',
        city: firstLine.recipientCity || '-',
        street: firstLine.recipientStreet || '-',
        building: firstLine.recipientBuilding || '',
        phone: firstLine.recipientPhone || '-',
      },
      products,
      shipPlanDate: firstLine.shipPlanDate || new Date().toISOString().slice(0, 10),
      destinationType: firstLine.destinationType || 'B2C',
      memo: firstLine.memo || '',
      _productsMeta: calculateProductsMeta(products),
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
  }

  // 5. ドライラン or 確定 / Dry run or 确定
  if (options?.dryRun) {
    result.success = true;
    result.importedCount = ordersToInsert.length;
    return result;
  }

  if (ordersToInsert.length === 0) {
    result.success = result.errors.length === 0;
    return result;
  }

  try {
    const inserted = await ShipmentOrder.insertMany(ordersToInsert);
    result.importedIds = inserted.map((doc) => String(doc._id));
    result.importedCount = inserted.length;
    result.success = true;

    logger.info(
      { importedCount: result.importedCount, errors: result.errors.length },
      'Shipment orders CSV imported / 出荷指示CSVインポート完了',
    );
  } catch (err) {
    result.errors.push({ row: 0, message: `DB insert error: ${(err as Error).message}` });
  }

  return result;
}

// ─── 商品一括インポート / 商品批量导入 ───

const PRODUCT_HEADER_MAP: Record<string, string> = {
  'SKU': 'sku', 'sku': 'sku', '商品コード': 'sku',
  '商品名': 'name', 'name': 'name', '名称': 'name',
  'バーコード': 'barcode', 'barcode': 'barcode', 'JAN': 'barcode',
  '価格': 'price', 'price': 'price', '単価': 'price',
  '原価': 'costPrice', 'cost_price': 'costPrice',
  'カテゴリ': 'category', 'category': 'category',
  '安全在庫': 'safetyStock', 'safety_stock': 'safetyStock',
  'FNSKU': 'fnsku', 'fnsku': 'fnsku',
  'ASIN': 'asin', 'asin': 'asin',
};

/**
 * 商品 CSV インポート / 商品 CSV 导入
 */
export async function importProducts(
  csvContent: string,
  options?: { dryRun?: boolean; clientId?: string },
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false, totalRows: 0, importedCount: 0, skippedCount: 0, errors: [], importedIds: [],
  };

  let rows: CsvRow[];
  try {
    rows = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true, bom: true });
  } catch (err) {
    result.errors.push({ row: 0, message: `CSV parse error: ${(err as Error).message}` });
    return result;
  }

  result.totalRows = rows.length;
  if (rows.length === 0) { result.errors.push({ row: 0, message: 'CSV is empty' }); return result; }

  const mapped = rows.map((row) => mapHeaders(row, PRODUCT_HEADER_MAP));
  const productsToInsert: any[] = [];

  // 既存 SKU を一括取得して重複チェック / 批量获取已有 SKU 做重复检查
  const allSkus = mapped.map((r) => r.sku).filter(Boolean);
  const existingProducts = await Product.find({ sku: { $in: allSkus } }, { sku: 1 }).lean();
  const existingSkuSet = new Set(existingProducts.map((p) => p.sku));

  for (let i = 0; i < mapped.length; i++) {
    const row = mapped[i];
    const rowNum = i + 2; // 1-indexed + header

    if (!row.sku) {
      result.errors.push({ row: rowNum, field: 'sku', message: 'SKU は必須 / SKU is required' });
      result.skippedCount++;
      continue;
    }
    if (!row.name) {
      result.errors.push({ row: rowNum, field: 'name', message: '商品名は必須 / Product name is required' });
      result.skippedCount++;
      continue;
    }
    if (existingSkuSet.has(row.sku)) {
      result.errors.push({ row: rowNum, field: 'sku', message: `SKU "${row.sku}" は既に存在 / already exists` });
      result.skippedCount++;
      continue;
    }

    productsToInsert.push({
      sku: row.sku,
      name: row.name,
      barcode: row.barcode ? [row.barcode] : [],
      price: parseFloat(row.price) || 0,
      costPrice: parseFloat(row.costPrice) || 0,
      category: row.category || '0',
      safetyStock: parseInt(row.safetyStock, 10) || 0,
      fnsku: row.fnsku || undefined,
      asin: row.asin || undefined,
      clientId: options?.clientId,
    });
    existingSkuSet.add(row.sku); // 同一 CSV 内の重複防止 / CSV 内重复防止
  }

  if (options?.dryRun) {
    result.success = true;
    result.importedCount = productsToInsert.length;
    return result;
  }

  if (productsToInsert.length === 0) {
    result.success = result.errors.length === 0;
    return result;
  }

  try {
    const inserted = await Product.insertMany(productsToInsert);
    result.importedIds = inserted.map((doc) => String(doc._id));
    result.importedCount = inserted.length;
    result.success = true;

    logger.info({ importedCount: result.importedCount }, 'Products CSV imported / 商品CSVインポート完了');
  } catch (err) {
    result.errors.push({ row: 0, message: `DB insert error: ${(err as Error).message}` });
  }

  return result;
}

// ─── 入庫予定一括インポート / 入库预定批量导入 ───

/**
 * 入庫予定 CSV ヘッダーマッピング / 入库预定 CSV 标题映射
 *
 * LOGIFAST 0531版準拠 / 符合LOGIFAST 0531版要件
 */
const INBOUND_HEADER_MAP: Record<string, string> = {
  // 日本語 / 日语
  '入庫予定番号': 'externalOrderNumber',
  '発注番号': 'purchaseOrderNumber',
  '契約顧客アカウントID': 'clientCode',
  '顧客商品コード': 'customerProductCode',
  'ハウスコード': 'customerProductCode',
  '商品コード': 'sku',
  '検品コード': 'inspectionCode',
  '商品名称': 'productName',
  '入庫予定日': 'expectedDate',
  '入庫希望日': 'requestedDate',
  '納品予定日': 'expectedDate',
  '入庫予定数': 'expectedQuantity',
  '納品予定数': 'expectedQuantity',
  '入庫予定数（ケース数）': 'expectedCaseCount',
  '入庫ケース単位': 'caseUnitType',
  '入庫ケース単位入数': 'caseUnitQuantity',
  'ロット番号': 'lotNumber',
  '有効期限': 'expiryDate',
  '納品元名称': 'supplierName',
  '納品元電話番号': 'supplierPhone',
  '納品元郵便番号': 'supplierPostalCode',
  '納品元住所': 'supplierAddress',
  '倉庫コード': 'warehouseCode',
  '倉庫拠点': 'warehouseSite',
  '入庫区分': 'flowType',
  '倉庫種類': 'temperatureType',
  '入庫コンテナ': 'containerType',
  '入庫立方数': 'cubicMeters',
  '入庫パレット数': 'palletCount',
  '入庫インナー箱数': 'innerBoxCount',
  '入庫コメント': 'memo',
  '商品取扱区分': 'handlingType',
  // 英語 / 英语
  'Order Number': 'externalOrderNumber',
  'PO Number': 'purchaseOrderNumber',
  'SKU': 'sku',
  'Product Code': 'sku',
  'Customer Product Code': 'customerProductCode',
  'Inspection Code': 'inspectionCode',
  'Product Name': 'productName',
  'Expected Date': 'expectedDate',
  'Requested Date': 'requestedDate',
  'Expected Quantity': 'expectedQuantity',
  'Lot Number': 'lotNumber',
  'Expiry Date': 'expiryDate',
  'Supplier Name': 'supplierName',
  'Container Type': 'containerType',
  'Memo': 'memo',
};

/**
 * 入庫予定 CSV インポート / 入库预定 CSV 导入
 *
 * 1行 = 1明細。同一入庫予定番号の行はグルーピングして1つの入庫予定にまとめる。
 * 1行 = 1明细。相同入库预定番号的行分组为1个入库预定。
 */
export async function importInboundOrders(
  csvBuffer: Buffer,
  options: { tenantId?: string; defaultLocationId?: string; preview?: boolean } = {},
): Promise<ImportResult> {
  const result: ImportResult = {
    success: true,
    totalRows: 0,
    importedCount: 0,
    skippedCount: 0,
    errors: [],
    importedIds: [],
  };

  let rows: CsvRow[];
  try {
    rows = parse(csvBuffer, { columns: true, skip_empty_lines: true, trim: true, bom: true });
  } catch (err: any) {
    return { ...result, success: false, errors: [{ row: 0, message: `CSVパースエラー: ${err.message}` }] };
  }

  result.totalRows = rows.length;
  if (rows.length === 0) return result;

  // ヘッダーマッピング / 标题映射
  const mapped = rows.map((r, i) => {
    const m = mapHeaders(r, INBOUND_HEADER_MAP);
    m._rowNum = i + 2;
    return m;
  });

  // 入庫予定番号でグルーピング / 按入库预定番号分组
  const groups = new Map<string, MappedRow[]>();
  for (const row of mapped) {
    const key = row.externalOrderNumber || row.purchaseOrderNumber || `__auto_${row._rowNum}`;
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  }

  if (options.preview) return result;

  // 商品SKUキャッシュ / 商品SKU缓存
  const allSkus = [...new Set(mapped.map((r) => r.sku || r.customerProductCode).filter(Boolean))];
  const products = await Product.find({
    $or: [
      { sku: { $in: allSkus } },
      { customerProductCode: { $in: allSkus } },
      { _allSku: { $in: allSkus } },
    ],
  }).lean();
  const skuMap = new Map<string, typeof products[0]>();
  for (const p of products) {
    skuMap.set(p.sku, p);
    if (p.customerProductCode) skuMap.set(p.customerProductCode, p);
    for (const s of p._allSku || []) skuMap.set(s, p);
  }

  // グループごとに入庫予定作成 / 按分组创建入库预定
  for (const [groupKey, groupRows] of groups) {
    const firstRow = groupRows[0];
    const lines = [];

    for (const row of groupRows) {
      const code = row.sku || row.customerProductCode;
      const product = code ? skuMap.get(code) : undefined;
      if (!product) {
        result.errors.push({ row: row._rowNum, field: 'sku', message: `商品が見つかりません: ${code}` });
        result.skippedCount++;
        continue;
      }
      lines.push({
        lineNumber: lines.length + 1,
        productId: product._id,
        productSku: product.sku,
        productName: product.name,
        expectedQuantity: Number(row.expectedQuantity) || 1,
        receivedQuantity: 0,
        putawayQuantity: 0,
        stockCategory: 'new' as const,
        stockMoveIds: [],
        lotNumber: row.lotNumber || undefined,
        expiryDate: row.expiryDate ? new Date(row.expiryDate) : undefined,
        customerProductCode: row.customerProductCode || product.customerProductCode || undefined,
        inspectionCode: row.inspectionCode || (product.barcode?.[0]) || undefined,
        expectedCaseCount: row.expectedCaseCount ? Number(row.expectedCaseCount) : undefined,
        caseUnitType: row.caseUnitType || undefined,
        caseUnitQuantity: row.caseUnitQuantity ? Number(row.caseUnitQuantity) : undefined,
        memo: row.memo || undefined,
      });
    }

    if (lines.length === 0) continue;

    try {
      const orderNumber = await generateSequenceNumber('IN');
      // flowType 解析 / flowType解析
      let flowType: 'standard' | 'crossdock' | 'passthrough' = 'standard';
      if (firstRow.flowType === '2' || firstRow.flowType === 'crossdock') flowType = 'crossdock';
      if (firstRow.flowType === '3' || firstRow.flowType === 'passthrough') flowType = 'passthrough';

      // containerType 解析 / containerType解析
      let containerType: string | undefined;
      if (firstRow.containerType === '1') containerType = '20ft';
      else if (firstRow.containerType === '2') containerType = '40ft';
      else if (firstRow.containerType === '3') containerType = '40ftH';
      else containerType = firstRow.containerType || undefined;

      const doc = await InboundOrder.create({
        tenantId: options.tenantId,
        orderNumber,
        status: 'draft',
        destinationLocationId: options.defaultLocationId || undefined,
        supplier: firstRow.supplierName ? {
          name: firstRow.supplierName,
          phone: firstRow.supplierPhone || undefined,
          postalCode: firstRow.supplierPostalCode || undefined,
          address: firstRow.supplierAddress || undefined,
        } : undefined,
        lines,
        expectedDate: firstRow.expectedDate ? new Date(firstRow.expectedDate) : undefined,
        requestedDate: firstRow.requestedDate ? new Date(firstRow.requestedDate) : undefined,
        purchaseOrderNumber: firstRow.purchaseOrderNumber || undefined,
        flowType,
        containerType,
        cubicMeters: firstRow.cubicMeters ? Number(firstRow.cubicMeters) : undefined,
        palletCount: firstRow.palletCount ? Number(firstRow.palletCount) : undefined,
        innerBoxCount: firstRow.innerBoxCount ? Number(firstRow.innerBoxCount) : undefined,
        memo: firstRow.memo || undefined,
      });

      result.importedIds.push(String(doc._id));
      result.importedCount++;
    } catch (err: any) {
      result.errors.push({ row: groupRows[0]._rowNum, message: `作成エラー: ${err.message}` });
      result.skippedCount++;
    }
  }

  result.success = result.errors.length === 0;
  return result;
}

// ─── ヘルパー / 辅助函数 ───

type MappedRow = Record<string, any> & { _rowNum: number };

function mapHeaders(row: CsvRow, headerMap: Record<string, string>): MappedRow {
  const mapped: Record<string, any> = {};
  for (const [csvKey, value] of Object.entries(row)) {
    const internalKey = headerMap[csvKey.trim()] || csvKey.trim();
    mapped[internalKey] = value;
  }
  mapped._rowNum = 0;
  return mapped as MappedRow;
}

function groupByOrder(rows: MappedRow[]): Map<string, MappedRow[]> {
  const groups = new Map<string, MappedRow[]>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    row._rowNum = i + 2; // 1-indexed + header row
    const key = row.customerManagementNumber || `__auto_${i}`;

    const group = groups.get(key);
    if (group) {
      group.push(row);
    } else {
      groups.set(key, [row]);
    }
  }

  return groups;
}
