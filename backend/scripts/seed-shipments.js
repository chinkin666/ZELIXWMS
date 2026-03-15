/**
 * 出荷注文テストデータ / 出货订单测试数据
 */
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/nexand-shipment');
  const db = mongoose.connection;

  // 删除之前的错误数据
  await db.collection('orders').deleteMany({ orderNumber: /^SO-/ });

  // 获取商品
  const products = await db.collection('products').find({ sku: /^SKU/ }).toArray();
  const pMap = {};
  products.forEach(p => { pMap[p.sku] = p; });

  const now = new Date();
  const today = now.toISOString().slice(0, 10).replace(/-/g, '/');

  const sender = {
    postalCode: '135-0061',
    prefecture: '東京都',
    city: '江東区',
    street: '豊洲2-4-9',
    building: 'ZELIX倉庫',
    name: 'ZELIX WMS 東京倉庫',
    phone: '03-1234-5678'
  };

  function mkProduct(sku, qty, price) {
    const p = pMap[sku];
    return {
      inputSku: sku,
      quantity: qty,
      productId: p ? p._id.toString() : undefined,
      productSku: sku,
      productName: p ? p.name : sku,
      unitPrice: price,
      subtotal: price * qty
    };
  }

  function mkMeta(prods) {
    const skus = [...new Set(prods.map(p => p.inputSku))];
    const names = [...new Set(prods.map(p => p.productName).filter(Boolean))];
    return {
      skus, names, barcodes: [],
      skuCount: skus.length,
      totalQuantity: prods.reduce((s, p) => s + p.quantity, 0),
      totalPrice: prods.reduce((s, p) => s + p.subtotal, 0)
    };
  }

  const orders = [];

  // 1: B2C 确认済・未検品 (Amazon)
  const p1 = [mkProduct('SKU-A001', 2, 4980), mkProduct('SKU-A002', 1, 980)];
  orders.push({
    orderNumber: 'SH20260315-TEST001',
    tenantId: 'default',
    destinationType: 'B2C',
    carrierId: '__builtin_yamato_b2__',
    customerManagementNumber: 'AMZ-2026031501',
    shipPlanDate: today,
    invoiceType: '0',
    coolType: '0',
    deliveryTimeSlot: '0812',
    status: {
      carrierReceipt: { isReceived: false },
      confirm: { isConfirmed: true, confirmedAt: now },
      printed: { isPrinted: false },
      inspected: { isInspected: false },
      shipped: { isShipped: false },
    },
    recipient: { postalCode: '150-0002', prefecture: '東京都', city: '渋谷区', street: '渋谷1-2-3', building: 'テストビル101', name: '山本京子', phone: '090-1234-5678' },
    sender,
    products: p1,
    _productsMeta: mkMeta(p1),
    handlingTags: [],
    createdAt: now, updatedAt: now
  });

  // 2: B2C 确认済・未検品 (楽天)
  const p2 = [mkProduct('SKU-D001', 1, 6980), mkProduct('SKU-D002', 1, 12800)];
  orders.push({
    orderNumber: 'SH20260315-TEST002',
    tenantId: 'default',
    destinationType: 'B2C',
    carrierId: '__builtin_yamato_b2__',
    customerManagementNumber: 'RAK-2026031502',
    shipPlanDate: today,
    invoiceType: '0',
    coolType: '0',
    status: {
      carrierReceipt: { isReceived: false },
      confirm: { isConfirmed: true, confirmedAt: now },
      printed: { isPrinted: false },
      inspected: { isInspected: false },
      shipped: { isShipped: false },
    },
    recipient: { postalCode: '530-0001', prefecture: '大阪府', city: '北区', street: '梅田1-1-1', building: '', name: '佐々木翔太', phone: '080-9876-5432' },
    sender,
    products: p2,
    _productsMeta: mkMeta(p2),
    handlingTags: [],
    createdAt: now, updatedAt: now
  });

  // 3: B2C 未确认 (Yahoo)
  const p3 = [mkProduct('SKU-C001', 3, 2480), mkProduct('SKU-A003', 2, 1480)];
  orders.push({
    orderNumber: 'SH20260315-TEST003',
    tenantId: 'default',
    destinationType: 'B2C',
    carrierId: '__builtin_yamato_b2__',
    customerManagementNumber: 'YAH-2026031503',
    shipPlanDate: today,
    invoiceType: '0',
    coolType: '0',
    deliveryTimeSlot: '1416',
    status: {
      carrierReceipt: { isReceived: false },
      confirm: { isConfirmed: false },
      printed: { isPrinted: false },
      inspected: { isInspected: false },
      shipped: { isShipped: false },
    },
    recipient: { postalCode: '460-0008', prefecture: '愛知県', city: '名古屋市中区', street: '栄3-4-5', building: 'パークタワー202', name: '田村美咲', phone: '070-1111-2222' },
    sender,
    products: p3,
    _productsMeta: mkMeta(p3),
    handlingTags: [],
    createdAt: now, updatedAt: now
  });

  // 4: B2B 确认済 (法人卸売)
  const p4 = [mkProduct('SKU-A001', 50, 3500), mkProduct('SKU-D001', 30, 5000)];
  orders.push({
    orderNumber: 'SH20260315-TEST004',
    tenantId: 'default',
    destinationType: 'B2B',
    carrierId: '__builtin_yamato_b2__',
    customerManagementNumber: 'B2B-2026031504',
    shipPlanDate: today,
    invoiceType: '2',
    coolType: '0',
    status: {
      carrierReceipt: { isReceived: false },
      confirm: { isConfirmed: true, confirmedAt: now },
      printed: { isPrinted: false },
      inspected: { isInspected: false },
      shipped: { isShipped: false },
    },
    recipient: { postalCode: '170-0013', prefecture: '東京都', city: '豊島区', street: '東池袋1-1-1', building: 'ビッグカメラ池袋店', name: '株式会社ビッグカメラ', phone: '03-5555-1234' },
    sender,
    products: p4,
    _productsMeta: mkMeta(p4),
    handlingTags: ['取扱注意'],
    createdAt: now, updatedAt: now
  });

  await db.collection('orders').insertMany(orders);
  console.log('出荷注文 x' + orders.length + ' OK');

  // 验证
  const total = await db.collection('orders').countDocuments({ tenantId: 'default' });
  console.log('default tenant 出荷注文 total:', total);

  const testOrders = await db.collection('orders').find({ orderNumber: /^SH20260315-TEST/ })
    .project({ orderNumber: 1, destinationType: 1, 'status.confirm.isConfirmed': 1 }).toArray();
  testOrders.forEach(o => console.log('  ' + o.orderNumber, o.destinationType, 'confirmed:', o.status?.confirm?.isConfirmed));

  process.exit(0);
}

main().catch(e => { console.error(e.message); process.exit(1); });
