/**
 * 高級種子データ / 高级种子数据
 * Lot期限管理 + 棚卸 + 返品 + API验证
 */
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const http = require('http');
const SECRET = 'zelix-wms-dev-secret-change-in-production';

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/nexand-shipment');
  const db = mongoose.connection;

  const admin = await db.collection('users').findOne({ email: 'admin@zelix.com' });
  const TOKEN = jwt.sign(
    { id: admin._id.toString(), email: admin.email, tenantId: 'default', role: 'admin', displayName: 'Admin' },
    SECRET, { expiresIn: '1h' }
  );

  const products = await db.collection('products').find({ sku: /^SKU/ }).toArray();
  const binLocs = await db.collection('locations').find({ type: 'bin' }).toArray();
  const wh = await db.collection('warehouses').findOne({ code: 'WH-TOKYO' });
  const pMap = {};
  products.forEach(p => { pMap[p.sku] = p; });

  const now = new Date();
  const in7d = new Date(now); in7d.setDate(in7d.getDate() + 7);
  const in30d = new Date(now); in30d.setDate(in30d.getDate() + 30);
  const in90d = new Date(now); in90d.setDate(in90d.getDate() + 90);
  const expd = new Date(now); expd.setDate(expd.getDate() - 5);

  // 1. Lot
  const lots = [
    { lotNumber: 'LOT-B001-2026A', productId: pMap['SKU-B001']._id, expiryDate: in7d, tenantId: 'default', createdAt: now, updatedAt: now },
    { lotNumber: 'LOT-B001-2026B', productId: pMap['SKU-B001']._id, expiryDate: in90d, tenantId: 'default', createdAt: now, updatedAt: now },
    { lotNumber: 'LOT-B002-2026A', productId: pMap['SKU-B002']._id, expiryDate: in30d, tenantId: 'default', createdAt: now, updatedAt: now },
    { lotNumber: 'LOT-C001-EXP', productId: pMap['SKU-C001']._id, expiryDate: expd, tenantId: 'default', createdAt: now, updatedAt: now },
    { lotNumber: 'LOT-C001-2026B', productId: pMap['SKU-C001']._id, expiryDate: in30d, tenantId: 'default', createdAt: now, updatedAt: now },
  ];
  let lotInserted = 0;
  for (const lot of lots) {
    try { await db.collection('lots').insertOne(lot); lotInserted++; } catch (e) { /* dup */ }
  }
  console.log(`Lot x${lotInserted} OK`);

  // 2. Lot在庫
  const lotDocs = await db.collection('lots').find({ lotNumber: /^LOT-/ }).toArray();
  const lotMap = {};
  lotDocs.forEach(l => { lotMap[l.lotNumber] = l; });

  const getBin = code => binLocs.find(l => l.code === code);
  const lotStocks = [
    { productId: pMap['SKU-B001']._id, locationId: getBin('B-1-1')?._id, lotId: lotMap['LOT-B001-2026A']?._id, quantity: 30, reservedQuantity: 0, availableQuantity: 30, productSku: 'SKU-B001', tenantId: 'default' },
    { productId: pMap['SKU-B001']._id, locationId: getBin('B-1-2')?._id, lotId: lotMap['LOT-B001-2026B']?._id, quantity: 50, reservedQuantity: 0, availableQuantity: 50, productSku: 'SKU-B001', tenantId: 'default' },
    { productId: pMap['SKU-B002']._id, locationId: getBin('B-1-3')?._id, lotId: lotMap['LOT-B002-2026A']?._id, quantity: 20, reservedQuantity: 0, availableQuantity: 20, productSku: 'SKU-B002', tenantId: 'default' },
    { productId: pMap['SKU-C001']._id, locationId: getBin('B-2-1')?._id, lotId: lotMap['LOT-C001-EXP']?._id, quantity: 15, reservedQuantity: 0, availableQuantity: 15, productSku: 'SKU-C001', tenantId: 'default' },
    { productId: pMap['SKU-C001']._id, locationId: getBin('B-2-2')?._id, lotId: lotMap['LOT-C001-2026B']?._id, quantity: 60, reservedQuantity: 0, availableQuantity: 60, productSku: 'SKU-C001', tenantId: 'default' },
  ];
  let stockInserted = 0;
  for (const s of lotStocks) {
    if (!s.locationId || !s.lotId) continue;
    s.createdAt = now; s.updatedAt = now;
    try { await db.collection('stock_quants').insertOne(s); stockInserted++; } catch (e) { /* dup */ }
  }
  console.log(`Lot在庫 x${stockInserted} OK`);

  // 3. 棚卸
  const stocktakes = [
    {
      orderNumber: 'ST-20260315-001', tenantId: 'default', type: 'full', status: 'draft',
      warehouseId: wh?._id, targetLocationIds: binLocs.filter(l => l.code.startsWith('A-1')).map(l => l._id),
      memo: 'A-1棚 定期棚卸', createdBy: admin._id.toString(), lines: [],
      createdAt: now, updatedAt: now,
    },
    {
      orderNumber: 'ST-20260314-001', tenantId: 'default', type: 'cycle', status: 'completed',
      warehouseId: wh?._id, targetLocationIds: binLocs.filter(l => l.code.startsWith('B-')).map(l => l._id),
      completedAt: new Date('2026-03-14T18:00:00'), memo: 'B区 循環棚卸', createdBy: admin._id.toString(),
      lines: [
        { productId: pMap['SKU-B001']?._id, productSku: 'SKU-B001', locationId: getBin('B-1-1')?._id, systemQuantity: 30, countedQuantity: 30, difference: 0 },
        { productId: pMap['SKU-B002']?._id, productSku: 'SKU-B002', locationId: getBin('B-1-3')?._id, systemQuantity: 20, countedQuantity: 18, difference: -2 },
      ],
      createdAt: new Date('2026-03-14'), updatedAt: new Date('2026-03-14'),
    },
  ];
  let stInserted = 0;
  for (const st of stocktakes) {
    try { await db.collection('stocktaking_orders').insertOne(st); stInserted++; } catch (e) { /* dup */ }
  }
  console.log(`棚卸 x${stInserted} OK`);

  // 4. 返品
  const returns = [
    {
      returnNumber: 'RET-20260315-001', tenantId: 'default', status: 'inspecting',
      originalOrderNumber: 'SH20260312-95534473', reason: '商品不良', customerName: '山本京子',
      lines: [{ productId: pMap['SKU-A001']?._id, productSku: 'SKU-A001', productName: 'ワイヤレスイヤホン Pro', quantity: 1, condition: 'damaged', memo: '片耳から音が出ない' }],
      memo: '顧客から返品依頼', createdBy: admin._id.toString(), createdAt: now, updatedAt: now,
    },
  ];
  let retInserted = 0;
  for (const ret of returns) {
    try { await db.collection('return_orders').insertOne(ret); retInserted++; } catch (e) { /* dup */ }
  }
  console.log(`返品 x${retInserted} OK`);

  // 5. API 验证
  function apiGet(path) {
    return new Promise((resolve, reject) => {
      const url = new URL('http://localhost:4000/api' + path);
      http.get({ hostname: url.hostname, port: url.port, path: url.pathname + url.search, headers: { Authorization: 'Bearer ' + TOKEN } }, res => {
        let d = ''; res.on('data', c => d += c); res.on('end', () => { try { resolve({ s: res.statusCode, d: JSON.parse(d) }); } catch { resolve({ s: res.statusCode, d }); } });
      }).on('error', reject);
    });
  }

  console.log('\n=== API 验证 ===');
  const tests = [
    ['/dashboard/overview', r => `shipments=${r.d.shipments?.todayScheduled} inbound=${r.d.inbound?.active} inventory.skus=${r.d.inventory?.totalSkus}`],
    ['/inventory/stock', r => `records=${Array.isArray(r.d) ? r.d.length : (r.d.items?.length || '?')}`],
    ['/inventory/overview', r => `totalSkus=${r.d.totalSkus} expiringCount=${r.d.expiringCount} expiredCount=${r.d.expiredCount}`],
    ['/inventory/alerts/low-stock', r => `lowStock=${Array.isArray(r.d) ? r.d.length : '?'}`],
    ['/stocktaking-orders', r => `stocktake=${Array.isArray(r.d) ? r.d.length : (r.d.items?.length || '?')}`],
    ['/return-orders', r => `returns=${Array.isArray(r.d) ? r.d.length : (r.d.items?.length || '?')}`],
    ['/lots', r => `lots=${Array.isArray(r.d) ? r.d.length : (r.d.items?.length || '?')}`],
    ['/products', r => `products=${Array.isArray(r.d) ? r.d.length : (r.d.items?.length || '?')}`],
    ['/warehouses', r => `warehouses=${Array.isArray(r.d) ? r.d.length : (r.d.data?.length || '?')}`],
    ['/clients', r => `clients=${Array.isArray(r.d) ? r.d.length : (r.d.data?.length || '?')}`],
  ];

  let pass = 0, fail = 0;
  for (const [path, fmt] of tests) {
    try {
      const r = await apiGet(path);
      const ok = r.s === 200;
      console.log(`  ${ok ? '✓' : '✗'} ${path} [${r.s}] ${fmt(r)}`);
      ok ? pass++ : fail++;
    } catch (e) {
      console.log(`  ✗ ${path} ERROR: ${e.message}`);
      fail++;
    }
  }
  console.log(`\n結果: ${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error(e.message); process.exit(1); });
