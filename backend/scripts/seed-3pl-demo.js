/**
 * 3PL 通過型デモデータ / 3PL 通过型演示数据
 *
 * 三端（portal/admin/frontend）で即座にデータが見えるようにする。
 * 让三端（portal/admin/frontend）启动后立刻有数据可看。
 *
 * 生成内容:
 * - 2 客户（物流公司 + 独立卖家）
 * - 3 子客户 + 4 店铺
 * - 10 商品
 * - 价格目录（2套）
 * - 5 入库预定（各种状态）
 * - 检品/异常/贴标/FBA箱 记录
 * - 门户用户
 * - WorkCharge 费用记录
 *
 * Usage: node scripts/seed-3pl-demo.js
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nexand-shipment';
const TENANT = 'default';

function oid() { return new mongoose.Types.ObjectId(); }
function hash(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const h = crypto.pbkdf2Sync(pw, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${h}`;
}

async function main() {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  console.log('Connected to MongoDB');

  // === IDs ===
  const client1Id = oid(); // 物流公司
  const client2Id = oid(); // 独立卖家
  const sub1Id = oid(); // 卖家张三
  const sub2Id = oid(); // 卖家李四
  const sub3Id = oid(); // 東京支社
  const shop1Id = oid(); // 张三 Amazon
  const shop2Id = oid(); // 张三 楽天
  const shop3Id = oid(); // 李四 Amazon
  const shop4Id = oid(); // 独立卖家 Amazon

  // === Clients ===
  await db.collection('clients').insertMany([
    {
      _id: client1Id, tenantId: TENANT, clientCode: 'CLT-001', name: '深圳星辰国际物流',
      name2: 'Shenzhen StarExpress Logistics', clientType: 'logistics_company',
      contactName: '王经理', phone: '0755-1234-5678', email: 'wang@starexpress.cn',
      creditTier: 'vip', creditLimit: 5000000, currentBalance: 156000, paymentTermDays: 60,
      portalEnabled: true, portalLanguage: 'zh', billingEnabled: true,
      isActive: true, createdAt: new Date(), updatedAt: new Date(),
    },
    {
      _id: client2Id, tenantId: TENANT, clientCode: 'CLT-002', name: '山田太郎商店',
      clientType: 'individual_seller',
      contactName: '山田太郎', phone: '090-1234-5678', email: 'yamada@example.jp',
      creditTier: 'standard', creditLimit: 1000000, currentBalance: 45000, paymentTermDays: 30,
      portalEnabled: true, portalLanguage: 'ja', billingEnabled: true,
      isActive: true, createdAt: new Date(), updatedAt: new Date(),
    },
  ]);
  console.log('✓ Clients x2');

  // === SubClients ===
  await db.collection('sub_clients').insertMany([
    { _id: sub1Id, tenantId: TENANT, clientId: client1Id, subClientCode: 'SUB-001', name: '卖家张三', subClientType: 'end_customer', email: 'zhang@seller.com', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { _id: sub2Id, tenantId: TENANT, clientId: client1Id, subClientCode: 'SUB-002', name: '卖家李四', subClientType: 'end_customer', email: 'li@seller.com', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { _id: sub3Id, tenantId: TENANT, clientId: client1Id, subClientCode: 'SUB-003', name: '東京支社', subClientType: 'branch_office', isActive: true, createdAt: new Date(), updatedAt: new Date() },
  ]);
  console.log('✓ SubClients x3');

  // === Shops ===
  await db.collection('shops').insertMany([
    { _id: shop1Id, tenantId: TENANT, clientId: client1Id, subClientId: sub1Id, shopCode: 'SHP-001', shopName: '张三 Amazon', platform: 'amazon_jp', platformAccountId: 'A1ZHANG', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { _id: shop2Id, tenantId: TENANT, clientId: client1Id, subClientId: sub1Id, shopCode: 'SHP-002', shopName: '张三 楽天', platform: 'rakuten', platformAccountId: 'R1ZHANG', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { _id: shop3Id, tenantId: TENANT, clientId: client1Id, subClientId: sub2Id, shopCode: 'SHP-003', shopName: '李四 Amazon', platform: 'amazon_jp', platformAccountId: 'A1LI', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { _id: shop4Id, tenantId: TENANT, clientId: client2Id, shopCode: 'SHP-004', shopName: '山田商店 Amazon', platform: 'amazon_jp', platformAccountId: 'A1YAMADA', isActive: true, createdAt: new Date(), updatedAt: new Date() },
  ]);
  console.log('✓ Shops x4');

  // === Products ===
  const products = [
    { sku: 'BT-EARPHONE-001', name: 'ワイヤレスBluetoothイヤホン', fnsku: 'X00BT001', asin: 'B0BT001', shopId: shop1Id, clientId: client1Id, fbaEnabled: true },
    { sku: 'PHONE-CASE-001', name: 'iPhone15 クリアケース', fnsku: 'X00PC001', asin: 'B0PC001', shopId: shop1Id, clientId: client1Id, fbaEnabled: true },
    { sku: 'USB-CABLE-001', name: 'USB-C 充電ケーブル 2m', fnsku: 'X00UC001', asin: 'B0UC001', shopId: shop1Id, clientId: client1Id, fbaEnabled: true },
    { sku: 'LED-LIGHT-001', name: 'LEDデスクライト', fnsku: 'X00LL001', asin: 'B0LL001', shopId: shop1Id, clientId: client1Id, fbaEnabled: true },
    { sku: 'MOUSE-PAD-001', name: 'ゲーミングマウスパッド XXL', fnsku: 'X00MP001', asin: 'B0MP001', shopId: shop3Id, clientId: client1Id, fbaEnabled: true },
    { sku: 'POWER-BANK-001', name: 'モバイルバッテリー 10000mAh', fnsku: 'X00PB001', asin: 'B0PB001', shopId: shop3Id, clientId: client1Id, fbaEnabled: true },
    { sku: 'WATCH-BAND-001', name: 'Apple Watch バンド', fnsku: 'X00WB001', asin: 'B0WB001', shopId: shop4Id, clientId: client2Id, fbaEnabled: true },
    { sku: 'SCREEN-FILM-001', name: 'iPad ガラスフィルム', fnsku: 'X00SF001', asin: 'B0SF001', shopId: shop4Id, clientId: client2Id, fbaEnabled: true },
    { sku: 'LAPTOP-STAND-001', name: 'ノートPCスタンド アルミ', fnsku: 'X00LS001', asin: 'B0LS001', shopId: shop2Id, clientId: client1Id, rslEnabled: true },
    { sku: 'DESK-ORG-001', name: 'デスクオーガナイザー', fnsku: 'X00DO001', asin: 'B0DO001', shopId: shop2Id, clientId: client1Id, rslEnabled: true },
  ];
  const productDocs = products.map(p => ({
    _id: oid(), ...p, tenantId: TENANT,
    weight: Math.floor(Math.random() * 500) + 50,
    inventoryEnabled: false, lotTrackingEnabled: false, expiryTrackingEnabled: false,
    serialTrackingEnabled: false, mailCalcEnabled: false, safetyStock: 0, alertDaysBeforeExpiry: 30,
    _allSku: [p.sku], createdAt: new Date(), updatedAt: new Date(),
  }));
  await db.collection('products').insertMany(productDocs);
  console.log('✓ Products x10');

  // === ServiceRates (价格目录) ===
  const rateTypes = [
    { chargeType: 'inbound_handling', name: '数量点数', unit: 'per_item', price1: 5, price2: 8 },
    { chargeType: 'labeling', name: '贴FNSKU', unit: 'per_item', price1: 15, price2: 18 },
    { chargeType: 'opp_bagging', name: '套OPP袋', unit: 'per_item', price1: 10, price2: 12 },
    { chargeType: 'inspection', name: '开箱全检', unit: 'per_item', price1: 20, price2: 25 },
    { chargeType: 'fba_delivery', name: 'FBA配送', unit: 'per_case', price1: 200, price2: 250 },
    { chargeType: 'box_splitting', name: '分箱', unit: 'per_case', price1: 200, price2: 250 },
    { chargeType: 'storage', name: '保管費', unit: 'per_location_day', price1: 50, price2: 60 },
  ];
  const rates = [];
  for (const rt of rateTypes) {
    rates.push({ tenantId: TENANT, clientId: client1Id.toString(), clientName: '深圳星辰国际物流', chargeType: rt.chargeType, name: rt.name, unit: rt.unit, unitPrice: rt.price1, isActive: true, createdAt: new Date(), updatedAt: new Date() });
    rates.push({ tenantId: TENANT, clientId: client2Id.toString(), clientName: '山田太郎商店', chargeType: rt.chargeType, name: rt.name, unit: rt.unit, unitPrice: rt.price2, isActive: true, createdAt: new Date(), updatedAt: new Date() });
  }
  await db.collection('service_rates').insertMany(rates);
  console.log('✓ ServiceRates x14');

  // === InboundOrders (5个不同状态) ===
  const now = new Date();
  const orders = [
    { _id: oid(), orderNumber: 'IN-DEMO-001', status: 'confirmed', clientId: client1Id, subClientId: sub1Id, shopId: shop1Id, destinationType: 'fba', totalBoxCount: 8, expectedDate: new Date(now.getTime() + 2*86400000), fbaInfo: { shipmentId: 'FBA-DEMO-001', destinationFc: 'NRT5' }, serviceOptions: [{ optionCode: 'inbound_handling', optionName: '数量点数', quantity: 500, unitPrice: 5, estimatedCost: 2500, status: 'pending' }, { optionCode: 'labeling', optionName: '贴FNSKU', quantity: 500, unitPrice: 15, estimatedCost: 7500, status: 'pending' }], lines: [{ lineNumber: 1, productId: productDocs[0]._id, productSku: 'BT-EARPHONE-001', productName: 'ワイヤレスBluetoothイヤホン', expectedQuantity: 200, receivedQuantity: 0, putawayQuantity: 0, stockCategory: 'new', stockMoveIds: [] }, { lineNumber: 2, productId: productDocs[1]._id, productSku: 'PHONE-CASE-001', productName: 'iPhone15 クリアケース', expectedQuantity: 300, receivedQuantity: 0, putawayQuantity: 0, stockCategory: 'new', stockMoveIds: [] }] },

    { _id: oid(), orderNumber: 'IN-DEMO-002', status: 'processing', clientId: client1Id, subClientId: sub1Id, shopId: shop1Id, destinationType: 'fba', totalBoxCount: 5, actualBoxCount: 5, arrivedAt: new Date(now.getTime() - 12*3600000), fbaInfo: { shipmentId: 'FBA-DEMO-002', destinationFc: 'KIX2' }, serviceOptions: [{ optionCode: 'inbound_handling', optionName: '数量点数', quantity: 300, unitPrice: 5, estimatedCost: 1500, actualQuantity: 300, actualCost: 1500, status: 'completed' }, { optionCode: 'labeling', optionName: '贴FNSKU', quantity: 300, unitPrice: 15, estimatedCost: 4500, status: 'in_progress' }], varianceReport: { hasVariance: true, details: [{ sku: 'USB-CABLE-001', productName: 'USB-C 充電ケーブル', expectedQuantity: 200, actualQuantity: 195, variance: -5 }], reportedAt: new Date() }, lines: [{ lineNumber: 1, productId: productDocs[2]._id, productSku: 'USB-CABLE-001', productName: 'USB-C 充電ケーブル 2m', expectedQuantity: 200, receivedQuantity: 195, putawayQuantity: 0, stockCategory: 'new', stockMoveIds: [] }, { lineNumber: 2, productId: productDocs[3]._id, productSku: 'LED-LIGHT-001', productName: 'LEDデスクライト', expectedQuantity: 100, receivedQuantity: 100, putawayQuantity: 0, stockCategory: 'new', stockMoveIds: [] }] },

    { _id: oid(), orderNumber: 'IN-DEMO-003', status: 'awaiting_label', clientId: client1Id, subClientId: sub2Id, shopId: shop3Id, destinationType: 'fba', totalBoxCount: 3, actualBoxCount: 3, arrivedAt: new Date(now.getTime() - 36*3600000), fbaInfo: { shipmentId: 'FBA-DEMO-003', destinationFc: 'NRT5', labelSplitStatus: 'pending' }, serviceOptions: [{ optionCode: 'inbound_handling', optionName: '数量点数', quantity: 150, unitPrice: 5, estimatedCost: 750, actualQuantity: 150, actualCost: 750, status: 'completed' }], lines: [{ lineNumber: 1, productId: productDocs[4]._id, productSku: 'MOUSE-PAD-001', productName: 'ゲーミングマウスパッド', expectedQuantity: 150, receivedQuantity: 150, putawayQuantity: 0, stockCategory: 'new', stockMoveIds: [] }] },

    { _id: oid(), orderNumber: 'IN-DEMO-004', status: 'shipped', clientId: client2Id, shopId: shop4Id, destinationType: 'fba', totalBoxCount: 2, actualBoxCount: 2, arrivedAt: new Date(now.getTime() - 72*3600000), shippedAt: new Date(now.getTime() - 24*3600000), fbaInfo: { shipmentId: 'FBA-DEMO-004', destinationFc: 'HND3' }, trackingNumbers: [{ trackingNumber: '1234-5678-9012', carrier: '佐川急便' }], serviceOptions: [{ optionCode: 'inbound_handling', optionName: '数量点数', quantity: 100, unitPrice: 8, estimatedCost: 800, actualQuantity: 100, actualCost: 800, status: 'completed' }, { optionCode: 'labeling', optionName: '贴FNSKU', quantity: 100, unitPrice: 18, estimatedCost: 1800, actualQuantity: 100, actualCost: 1800, status: 'completed' }], lines: [{ lineNumber: 1, productId: productDocs[6]._id, productSku: 'WATCH-BAND-001', productName: 'Apple Watch バンド', expectedQuantity: 60, receivedQuantity: 60, putawayQuantity: 0, stockCategory: 'new', stockMoveIds: [] }, { lineNumber: 2, productId: productDocs[7]._id, productSku: 'SCREEN-FILM-001', productName: 'iPad ガラスフィルム', expectedQuantity: 40, receivedQuantity: 40, putawayQuantity: 0, stockCategory: 'new', stockMoveIds: [] }] },

    { _id: oid(), orderNumber: 'IN-DEMO-005', status: 'ready_to_ship', clientId: client1Id, subClientId: sub1Id, shopId: shop2Id, destinationType: 'rsl', totalBoxCount: 4, actualBoxCount: 4, arrivedAt: new Date(now.getTime() - 8*3600000), rslInfo: { rslPlanId: 'RSL-DEMO-001', destinationWarehouse: '習志野' }, serviceOptions: [{ optionCode: 'inbound_handling', optionName: '数量点数', quantity: 200, unitPrice: 5, estimatedCost: 1000, actualQuantity: 200, actualCost: 1000, status: 'completed' }], lines: [{ lineNumber: 1, productId: productDocs[8]._id, productSku: 'LAPTOP-STAND-001', productName: 'ノートPCスタンド', expectedQuantity: 120, receivedQuantity: 120, putawayQuantity: 0, stockCategory: 'new', stockMoveIds: [] }, { lineNumber: 2, productId: productDocs[9]._id, productSku: 'DESK-ORG-001', productName: 'デスクオーガナイザー', expectedQuantity: 80, receivedQuantity: 80, putawayQuantity: 0, stockCategory: 'new', stockMoveIds: [] }] },
  ];
  for (const o of orders) {
    o.tenantId = TENANT; o.flowType = 'passthrough'; o.createdAt = new Date(); o.updatedAt = new Date(); o.createdBy = 'seed';
  }
  await db.collection('inbound_orders').insertMany(orders);
  console.log('✓ InboundOrders x5 (confirmed/processing/awaiting_label/shipped/ready_to_ship)');

  // === WorkCharges ===
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const charges = [
    { tenantId: TENANT, clientId: client1Id.toString(), clientName: '深圳星辰国际物流', subClientId: sub1Id.toString(), subClientName: '卖家张三', chargeType: 'inbound_handling', chargeDate: now, referenceType: 'inboundOrder', referenceNumber: 'IN-DEMO-002', quantity: 300, unitPrice: 5, amount: 1500, description: '数量点数 (IN-DEMO-002)', billingPeriod: period, isBilled: false },
    { tenantId: TENANT, clientId: client1Id.toString(), clientName: '深圳星辰国际物流', subClientId: sub2Id.toString(), subClientName: '卖家李四', chargeType: 'inbound_handling', chargeDate: now, referenceType: 'inboundOrder', referenceNumber: 'IN-DEMO-003', quantity: 150, unitPrice: 5, amount: 750, description: '数量点数 (IN-DEMO-003)', billingPeriod: period, isBilled: false },
    { tenantId: TENANT, clientId: client1Id.toString(), clientName: '深圳星辰国际物流', subClientId: sub1Id.toString(), subClientName: '卖家张三', chargeType: 'inbound_handling', chargeDate: now, referenceType: 'inboundOrder', referenceNumber: 'IN-DEMO-005', quantity: 200, unitPrice: 5, amount: 1000, description: '数量点数 (IN-DEMO-005)', billingPeriod: period, isBilled: false },
    { tenantId: TENANT, clientId: client2Id.toString(), clientName: '山田太郎商店', chargeType: 'inbound_handling', chargeDate: new Date(now.getTime() - 48*3600000), referenceType: 'inboundOrder', referenceNumber: 'IN-DEMO-004', quantity: 100, unitPrice: 8, amount: 800, description: '数量点数 (IN-DEMO-004)', billingPeriod: period, isBilled: false },
    { tenantId: TENANT, clientId: client2Id.toString(), clientName: '山田太郎商店', chargeType: 'labeling', chargeDate: new Date(now.getTime() - 48*3600000), referenceType: 'inboundOrder', referenceNumber: 'IN-DEMO-004', quantity: 100, unitPrice: 18, amount: 1800, description: '贴FNSKU (IN-DEMO-004)', billingPeriod: period, isBilled: false },
  ];
  for (const c of charges) { c.createdAt = new Date(); c.updatedAt = new Date(); }
  await db.collection('work_charges').insertMany(charges);
  console.log('✓ WorkCharges x5');

  // === Portal Users ===
  await db.collection('users').insertMany([
    { tenantId: TENANT, email: 'wang@starexpress.cn', passwordHash: hash('password123'), displayName: '王经理', role: 'client', clientId: client1Id, clientName: '深圳星辰国际物流', language: 'zh', isActive: true, loginCount: 0, createdAt: new Date(), updatedAt: new Date() },
    { tenantId: TENANT, email: 'yamada@example.jp', passwordHash: hash('password123'), displayName: '山田太郎', role: 'client', clientId: client2Id, clientName: '山田太郎商店', language: 'ja', isActive: true, loginCount: 0, createdAt: new Date(), updatedAt: new Date() },
  ]);
  console.log('✓ Portal Users x2 (wang@starexpress.cn / yamada@example.jp, pw: password123)');

  // === Exception Report ===
  const slaDeadline = new Date(now.getTime() + 2*3600000);
  await db.collection('exception_reports').insertOne({
    tenantId: TENANT, reportNumber: 'EXC-DEMO-001', referenceType: 'inbound_order', referenceId: orders[1]._id, clientId: client1Id, clientName: '深圳星辰国际物流',
    level: 'B', category: 'quantity_variance', sku: 'USB-CABLE-001', affectedQuantity: 5,
    description: 'USB-C ケーブル 5本不足。中国側の梱包ミスの可能性。', photos: [],
    suggestedAction: '顧客に確認し、次回入庫で補充',
    status: 'notified', reportedBy: 'テスト検品員', reportedAt: now, notifiedAt: now,
    slaDeadline, slaBreached: false, createdAt: now, updatedAt: now,
  });
  console.log('✓ ExceptionReport x1');

  console.log('\n✨ Demo data seeded successfully!');
  console.log('\n📋 Portal login:');
  console.log('  深圳星辰: wang@starexpress.cn / password123');
  console.log('  山田商店: yamada@example.jp / password123');
  console.log('\n🔗 URLs:');
  console.log('  Frontend: http://localhost:4001');
  console.log('  Portal:   http://localhost:4002');
  console.log('  Admin:    http://localhost:4003');

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
