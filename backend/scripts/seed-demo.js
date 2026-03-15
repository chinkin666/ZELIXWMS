/**
 * デモデータ種子スクリプト / 演示数据种子脚本
 * 仓库、库位、荷主、仕入先、商品、在庫カテゴリ
 */
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/nexand-shipment');
  const db = mongoose.connection;

  // 1. 仓库 / 倉庫
  const wh1Id = new mongoose.Types.ObjectId();
  const wh2Id = new mongoose.Types.ObjectId();
  await db.collection('warehouses').insertMany([
    { _id: wh1Id, code: 'WH-TOKYO', name: '東京倉庫', name2: 'Tokyo Warehouse', postalCode: '135-0061', prefecture: '東京都', city: '江東区', address: '豊洲2-4-9', phone: '03-1234-5678', coolTypes: ['0','1'], capacity: 500, operatingHours: '08:00-20:00', isActive: true, sortOrder: 1, createdAt: new Date(), updatedAt: new Date() },
    { _id: wh2Id, code: 'WH-OSAKA', name: '大阪倉庫', name2: 'Osaka Warehouse', postalCode: '559-0034', prefecture: '大阪府', city: '住之江区', address: '南港北1-2-3', phone: '06-9876-5432', coolTypes: ['0'], capacity: 300, operatingHours: '09:00-18:00', isActive: true, sortOrder: 2, createdAt: new Date(), updatedAt: new Date() }
  ]);
  console.log('仓库 x2 OK');

  // 2. 库位 / ロケーション
  const recvLocId = new mongoose.Types.ObjectId();
  const stageLocId = new mongoose.Types.ObjectId();
  const zoneAId = new mongoose.Types.ObjectId();
  const zoneBId = new mongoose.Types.ObjectId();

  const baseLocs = [
    { _id: recvLocId, code: 'WH-TOKYO-RECV', name: '入庫エリア', type: 'receiving', warehouseId: wh1Id, fullPath: 'WH-TOKYO/RECV', isActive: true, sortOrder: 1 },
    { _id: stageLocId, code: 'WH-TOKYO-STAGE', name: 'ステージング', type: 'staging', warehouseId: wh1Id, fullPath: 'WH-TOKYO/STAGE', isActive: true, sortOrder: 2 },
    { _id: zoneAId, code: 'WH-TOKYO-A', name: 'Aゾーン（常温）', type: 'zone', warehouseId: wh1Id, fullPath: 'WH-TOKYO/A', coolType: '0', isActive: true, sortOrder: 3 },
    { _id: zoneBId, code: 'WH-TOKYO-B', name: 'Bゾーン（冷蔵）', type: 'zone', warehouseId: wh1Id, fullPath: 'WH-TOKYO/B', coolType: '1', isActive: true, sortOrder: 4 },
  ];

  const shelves = [];
  const bins = [];

  // A区 3棚 x 4格 = 12格
  for (let i = 1; i <= 3; i++) {
    const shelfId = new mongoose.Types.ObjectId();
    shelves.push({ _id: shelfId, code: `A-${i}`, name: `A-${i}棚`, type: 'shelf', parentId: zoneAId, warehouseId: wh1Id, fullPath: `WH-TOKYO/A/A-${i}`, coolType: '0', isActive: true, sortOrder: i });
    for (let j = 1; j <= 4; j++) {
      bins.push({ _id: new mongoose.Types.ObjectId(), code: `A-${i}-${j}`, name: `A-${i}-${j}`, type: 'bin', parentId: shelfId, warehouseId: wh1Id, fullPath: `WH-TOKYO/A/A-${i}/A-${i}-${j}`, coolType: '0', isActive: true, sortOrder: j });
    }
  }

  // B区 2棚 x 3格 = 6格
  for (let i = 1; i <= 2; i++) {
    const shelfId = new mongoose.Types.ObjectId();
    shelves.push({ _id: shelfId, code: `B-${i}`, name: `B-${i}棚`, type: 'shelf', parentId: zoneBId, warehouseId: wh1Id, fullPath: `WH-TOKYO/B/B-${i}`, coolType: '1', isActive: true, sortOrder: i });
    for (let j = 1; j <= 3; j++) {
      bins.push({ _id: new mongoose.Types.ObjectId(), code: `B-${i}-${j}`, name: `B-${i}-${j}`, type: 'bin', parentId: shelfId, warehouseId: wh1Id, fullPath: `WH-TOKYO/B/B-${i}/B-${i}-${j}`, coolType: '1', isActive: true, sortOrder: j });
    }
  }

  const allLocs = [...baseLocs, ...shelves, ...bins].map(l => ({ ...l, createdAt: new Date(), updatedAt: new Date() }));
  await db.collection('locations').insertMany(allLocs);
  console.log(`库位 x${allLocs.length} OK`);

  // 3. 荷主 / クライアント
  await db.collection('clients').insertMany([
    { clientCode: 'CL-001', name: '株式会社ECショップ', contactName: '田中太郎', prefecture: '東京都', city: '渋谷区', phone: '03-1111-2222', email: 'tanaka@ecshop.co.jp', plan: 'pro', billingEnabled: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { clientCode: 'CL-002', name: 'ファッションモール合同会社', contactName: '佐藤花子', prefecture: '大阪府', city: '北区', phone: '06-3333-4444', email: 'sato@fashion-mall.jp', plan: 'standard', billingEnabled: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { clientCode: 'CL-003', name: 'グローバルトレード株式会社', contactName: '鈴木一郎', prefecture: '神奈川県', city: '横浜市', phone: '045-5555-6666', email: 'suzuki@globaltrade.co.jp', plan: 'enterprise', billingEnabled: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },
  ]);
  console.log('荷主 x3 OK');

  // 4. 仕入先 / サプライヤー
  await db.collection('suppliers').insertMany([
    { code: 'SUP-001', name: '深圳テック工場', contactName: '王明', country: 'CN', phone: '+86-755-1234', email: 'wang@sztech.cn', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { code: 'SUP-002', name: '東京部材センター', contactName: '山田健一', country: 'JP', phone: '03-7777-8888', email: 'yamada@tokyoparts.jp', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { code: 'SUP-003', name: 'Korea Electronics Co.', contactName: 'Kim Soo-jin', country: 'KR', phone: '+82-2-1234', email: 'kim@koreaelec.kr', isActive: true, createdAt: new Date(), updatedAt: new Date() },
  ]);
  console.log('仕入先 x3 OK');

  // 5. 商品 / プロダクト
  const products = [
    { sku: 'SKU-A001', name: 'ワイヤレスイヤホン Pro', barcode: ['4901234567890'], coolType: '0', category: '0', price: 4980, costPrice: 2200, weight: 150, width: 80, depth: 60, height: 40, inventoryEnabled: true, lotTrackingEnabled: false, expiryTrackingEnabled: false, serialTrackingEnabled: false, mailCalcEnabled: true, mailCalcMaxQuantity: 2, alertDaysBeforeExpiry: 30, safetyStock: 50 },
    { sku: 'SKU-A002', name: 'USBケーブル Type-C 1m', barcode: ['4901234567891'], coolType: '0', category: '0', price: 980, costPrice: 300, weight: 50, width: 150, depth: 30, height: 10, inventoryEnabled: true, lotTrackingEnabled: false, expiryTrackingEnabled: false, serialTrackingEnabled: false, mailCalcEnabled: true, mailCalcMaxQuantity: 5, alertDaysBeforeExpiry: 30, safetyStock: 100 },
    { sku: 'SKU-A003', name: 'スマホケース クリア (iPhone)', barcode: ['4901234567892'], coolType: '0', category: '0', price: 1480, costPrice: 400, weight: 30, width: 80, depth: 5, height: 160, inventoryEnabled: true, lotTrackingEnabled: false, expiryTrackingEnabled: false, serialTrackingEnabled: false, mailCalcEnabled: true, mailCalcMaxQuantity: 3, alertDaysBeforeExpiry: 30, safetyStock: 80 },
    { sku: 'SKU-B001', name: 'プロテインバー チョコ味 12本入', barcode: ['4901234567893'], coolType: '0', category: '0', price: 2980, costPrice: 1500, weight: 600, inventoryEnabled: true, lotTrackingEnabled: true, expiryTrackingEnabled: true, serialTrackingEnabled: false, mailCalcEnabled: false, alertDaysBeforeExpiry: 60, safetyStock: 30 },
    { sku: 'SKU-B002', name: 'オーガニック青汁 30包', barcode: ['4901234567894'], coolType: '0', category: '0', price: 3480, costPrice: 1800, weight: 450, inventoryEnabled: true, lotTrackingEnabled: true, expiryTrackingEnabled: true, serialTrackingEnabled: false, mailCalcEnabled: false, alertDaysBeforeExpiry: 90, safetyStock: 20 },
    { sku: 'SKU-C001', name: '化粧水 保湿ローション 200ml', barcode: ['4901234567895'], coolType: '0', category: '0', price: 2480, costPrice: 800, weight: 250, inventoryEnabled: true, lotTrackingEnabled: true, expiryTrackingEnabled: true, serialTrackingEnabled: false, mailCalcEnabled: false, alertDaysBeforeExpiry: 180, safetyStock: 40 },
    { sku: 'SKU-D001', name: 'ゲーミングマウス RGB', barcode: ['4901234567896'], coolType: '0', category: '0', price: 6980, costPrice: 3200, weight: 120, width: 120, depth: 65, height: 40, inventoryEnabled: true, lotTrackingEnabled: false, expiryTrackingEnabled: false, serialTrackingEnabled: true, mailCalcEnabled: false, alertDaysBeforeExpiry: 30, safetyStock: 25 },
    { sku: 'SKU-D002', name: 'メカニカルキーボード テンキーレス', barcode: ['4901234567897'], coolType: '0', category: '0', price: 12800, costPrice: 5800, weight: 800, width: 360, depth: 140, height: 35, inventoryEnabled: true, lotTrackingEnabled: false, expiryTrackingEnabled: false, serialTrackingEnabled: true, mailCalcEnabled: false, alertDaysBeforeExpiry: 30, safetyStock: 15 },
    { sku: 'SKU-E001', name: 'A4コピー用紙 500枚', barcode: ['4901234567898'], coolType: '0', category: '1', price: 480, costPrice: 300, weight: 2500, inventoryEnabled: true, lotTrackingEnabled: false, expiryTrackingEnabled: false, serialTrackingEnabled: false, mailCalcEnabled: false, alertDaysBeforeExpiry: 30, safetyStock: 10 },
    { sku: 'SKU-E002', name: 'OPP袋 A4サイズ 100枚', barcode: ['4901234567899'], coolType: '0', category: '1', price: 680, costPrice: 350, weight: 200, inventoryEnabled: true, lotTrackingEnabled: false, expiryTrackingEnabled: false, serialTrackingEnabled: false, mailCalcEnabled: false, alertDaysBeforeExpiry: 30, safetyStock: 20 },
  ];

  const productDocs = products.map(p => ({
    ...p,
    _allSku: [p.sku],
    createdAt: new Date(),
    updatedAt: new Date()
  }));
  await db.collection('products').insertMany(productDocs);
  console.log(`商品 x${products.length} OK`);

  // 6. 在庫カテゴリ / 库存分类
  await db.collection('inventory_categories').insertMany([
    { code: 'GOOD', name: '良品', description: '正常品', isDefault: true, isActive: true, sortOrder: 1, createdAt: new Date(), updatedAt: new Date() },
    { code: 'DAMAGED', name: '不良品', description: '破損・不良', isDefault: false, isActive: true, sortOrder: 2, createdAt: new Date(), updatedAt: new Date() },
    { code: 'RETURN', name: '返品', description: '返品待検品', isDefault: false, isActive: true, sortOrder: 3, createdAt: new Date(), updatedAt: new Date() },
  ]);
  console.log('在庫カテゴリ x3 OK');

  console.log('\n=== 种子数据生成完成 / シードデータ生成完了 ===');
  console.log('仓库: 2 (东京/大阪)');
  console.log(`库位: ${allLocs.length} (入库区/暂存区/A区3棚12格/B区2棚6格)`);
  console.log('荷主: 3');
  console.log('仕入先: 3');
  console.log('商品: 10 (电子/食品/化妆品/耗材)');
  console.log('在庫カテゴリ: 3');

  process.exit(0);
}

main().catch(e => { console.error(e.message); process.exit(1); });
