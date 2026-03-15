#!/usr/bin/env node
/**
 * E2E 全業務フロー テスト / E2E 全业务流程测试
 *
 * 入庫 → 検品 → 棚入れ → 在庫確認 → 出荷作成 → 出荷確認 → 検品 → 出荷完了
 * 全フローを API 経由でデータを生成しながら実行する
 */
const http = require('http');

const BASE = 'http://localhost:4000/api';
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'zelix-wms-dev-secret-change-in-production';

// トークンは run() 内でログインAPIから取得 / Token在run()中通过登录API获取
let TOKEN = '';

let passed = 0;
let failed = 0;
const errors = [];

function api(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + path);
    const headers = { 'Content-Type': 'application/json' };
    if (TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`;
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers,
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: json });
        } catch {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function assert(name, condition, detail) {
  if (condition) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.log(`  ✗ ${name} — ${detail || 'FAILED'}`);
    failed++;
    errors.push(name + ': ' + (detail || 'FAILED'));
  }
}

async function run() {
  console.log('========================================');
  console.log('  ZELIX WMS E2E 全業務フロー テスト');
  console.log('========================================\n');

  // ─── 1. 認証 ─────────────────────────────────
  console.log('1. 認証 / 认证');
  const loginRes = await api('POST', '/auth/login', { email: 'admin@zelix.com', password: 'admin123' });
  assert('ログイン成功', loginRes.status === 200, `status=${loginRes.status} body=${JSON.stringify(loginRes.data).slice(0,200)}`);
  const authToken = loginRes.data.token;
  assert('トークン取得', !!authToken, 'token is empty');

  // ログインで取得したトークンを以降のAPI呼び出しに使用 / 使用登录获取的token
  if (authToken) TOKEN = authToken;

  const meRes = await api('GET', '/auth/me');
  assert('現在ユーザー取得', meRes.status === 200 && meRes.data.user, `status=${meRes.status} ${JSON.stringify(meRes.data).slice(0,200)}`);

  // ─── 2. マスタデータ確認 ─────────────────────
  console.log('\n2. マスタデータ / 主数据');
  const whRes = await api('GET', '/warehouses');
  const warehouses = whRes.data.data || whRes.data || [];
  assert('倉庫一覧', Array.isArray(warehouses) && warehouses.length >= 1, `count=${warehouses.length}`);

  const locRes = await api('GET', '/locations');
  const locations = locRes.data.data || locRes.data || [];
  assert('ロケーション一覧', Array.isArray(locations) && locations.length >= 5, `count=${locations.length}`);

  const prodRes = await api('GET', '/products');
  const products = Array.isArray(prodRes.data) ? prodRes.data : (prodRes.data.items || prodRes.data.data || []);
  assert('商品一覧', products.length >= 5, `count=${products.length}`);

  const clientRes = await api('GET', '/clients');
  const clients = clientRes.data.data || clientRes.data || [];
  assert('荷主一覧', Array.isArray(clients) && clients.length >= 1, `count=${Array.isArray(clients) ? clients.length : 'not array'}`);

  // 获取IDs
  const recvLoc = locations.find(l => l.type === 'receiving');
  const binLocs = locations.filter(l => l.type === 'bin').slice(0, 3);
  const testProduct1 = products.find(p => p.sku === 'SKU-A001') || products[0];
  const testProduct2 = products.find(p => p.sku === 'SKU-A002') || products[1];

  assert('入庫ロケーション存在', !!recvLoc, 'no receiving location');
  assert('棚ロケーション存在', binLocs.length >= 1, `bin count=${binLocs.length}`);

  // ─── 3. 入庫フロー ───────────────────────────
  console.log('\n3. 入庫フロー / 入库流程');
  const inboundData = {
    destinationLocationId: recvLoc ? recvLoc._id : null,
    supplier: { name: 'E2Eテスト仕入先', code: 'E2E-SUP' },
    expectedDate: new Date().toISOString(),
    flowType: 'standard',
    memo: 'E2E自動テスト',
    lines: [
      { productId: testProduct1._id, productSku: testProduct1.sku, productName: testProduct1.name, expectedQuantity: 100 },
      { productId: testProduct2._id, productSku: testProduct2.sku, productName: testProduct2.name, expectedQuantity: 200 },
    ],
  };

  const createInb = await api('POST', '/inbound-orders', inboundData);
  assert('入庫指示作成', createInb.status === 201 || createInb.status === 200, `status=${createInb.status} ${JSON.stringify(createInb.data).slice(0,300)}`);
  const inboundId = createInb.data?._id || createInb.data?.data?._id;
  assert('入庫指示ID取得', !!inboundId, `id=${inboundId}`);

  // 入庫指示詳細
  if (inboundId) {
    const getInb = await api('GET', `/inbound-orders/${inboundId}`);
    assert('入庫指示詳細取得', getInb.status === 200, `status=${getInb.status}`);
    assert('ステータス=draft', getInb.data?.status === 'draft', `status=${getInb.data?.status}`);

    // 確認
    const confirmInb = await api('POST', `/inbound-orders/${inboundId}/confirm`);
    assert('入庫指示確認', confirmInb.status === 200, `status=${confirmInb.status} ${JSON.stringify(confirmInb.data).slice(0,200)}`);

    // 検品（1行目: lineNumber=1）
    const recvLine1 = await api('POST', `/inbound-orders/${inboundId}/receive`, {
      lineNumber: 1,
      receiveQuantity: 100,
    });
    assert('入庫検品（行1）', recvLine1.status === 200, `status=${recvLine1.status} ${JSON.stringify(recvLine1.data).slice(0,200)}`);

    // 検品（2行目: lineNumber=2）
    const recvLine2 = await api('POST', `/inbound-orders/${inboundId}/receive`, {
      lineNumber: 2,
      receiveQuantity: 200,
    });
    assert('入庫検品（行2）', recvLine2.status === 200, `status=${recvLine2.status} ${JSON.stringify(recvLine2.data).slice(0,200)}`);

    // ステータス確認
    const afterRecv = await api('GET', `/inbound-orders/${inboundId}`);
    const recvStatus = afterRecv.data?.status;
    assert('検品後ステータス', ['received', 'done'].includes(recvStatus), `status=${recvStatus}`);

    // 棚入れ（1行目）
    if (binLocs.length > 0 && recvStatus === 'received') {
      const putaway1 = await api('POST', `/inbound-orders/${inboundId}/putaway`, {
        lineNumber: 1,
        locationId: binLocs[0]._id,
        quantity: 100,
      });
      assert('棚入れ（行1）', putaway1.status === 200, `status=${putaway1.status} ${JSON.stringify(putaway1.data).slice(0,200)}`);

      if (binLocs.length > 1) {
        const putaway2 = await api('POST', `/inbound-orders/${inboundId}/putaway`, {
          lineNumber: 2,
          locationId: binLocs[1]._id,
          quantity: 200,
        });
        assert('棚入れ（行2）', putaway2.status === 200, `status=${putaway2.status} ${JSON.stringify(putaway2.data).slice(0,200)}`);
      }
    }

    // 手動完了
    const completeRes = await api('POST', `/inbound-orders/${inboundId}/complete`);
    assert('入庫手動完了', completeRes.status === 200, `status=${completeRes.status} ${JSON.stringify(completeRes.data).slice(0,200)}`);

    // 最終ステータス
    const finalInb = await api('GET', `/inbound-orders/${inboundId}`);
    assert('入庫最終ステータス=done', finalInb.data?.status === 'done', `status=${finalInb.data?.status}`);

    // 差異レポート
    const variance = await api('GET', `/inbound-orders/${inboundId}/variance`);
    assert('差異レポート', variance.status === 200, `status=${variance.status}`);
  }

  // ─── 4. 在庫確認 ─────────────────────────────
  console.log('\n4. 在庫確認 / 库存确认');
  const stockRes = await api('GET', '/inventory/stock');
  const stocks = Array.isArray(stockRes.data) ? stockRes.data : (stockRes.data.items || []);
  assert('在庫一覧取得', stockRes.status === 200, `status=${stockRes.status}`);
  assert('在庫レコード存在', stocks.length >= 1, `count=${stocks.length}`);

  const summaryRes = await api('GET', '/inventory/stock/summary');
  assert('在庫サマリー', summaryRes.status === 200, `status=${summaryRes.status}`);

  const overviewRes = await api('GET', '/inventory/overview');
  assert('在庫概況', overviewRes.status === 200, `status=${overviewRes.status}`);

  const movRes = await api('GET', '/inventory/movements');
  assert('在庫移動履歴', movRes.status === 200, `status=${movRes.status}`);

  // ─── 5. 在庫調整 ─────────────────────────────
  console.log('\n5. 在庫調整 / 库存调整');
  if (testProduct1 && binLocs[0]) {
    const adjRes = await api('POST', '/inventory/adjust', {
      productId: testProduct1._id,
      locationId: binLocs[0]._id,
      adjustQuantity: 10,
      memo: 'E2E調整テスト',
    });
    assert('在庫調整', adjRes.status === 200, `status=${adjRes.status} ${JSON.stringify(adjRes.data).slice(0,200)}`);
  }

  // ─── 6. 在庫振替 ─────────────────────────────
  console.log('\n6. 在庫振替 / 库存转移');
  if (testProduct1 && binLocs.length >= 2) {
    const transferRes = await api('POST', '/inventory/transfer', {
      productId: testProduct1._id,
      fromLocationId: binLocs[0]._id,
      toLocationId: binLocs[1]._id,
      quantity: 5,
      memo: 'E2E振替テスト',
    });
    assert('在庫振替', transferRes.status === 200, `status=${transferRes.status} ${JSON.stringify(transferRes.data).slice(0,200)}`);
  }

  // ─── 7. 出荷注文 ─────────────────────────────
  console.log('\n7. 出荷注文 / 出货订单');
  const shipListRes = await api('GET', '/shipment-orders?page=1&limit=10');
  assert('出荷一覧取得', shipListRes.status === 200, `status=${shipListRes.status}`);
  assert('出荷注文存在', (shipListRes.data.total || 0) >= 1, `total=${shipListRes.data.total}`);

  // 出荷注文一括作成（/manual/bulk エンドポイント、items形式）
  const ts = Date.now();
  const shipData = {
    items: [{
      clientId: 'E2E-TEST',
      order: {
        carrierId: '__builtin_yamato_b2__',
        customerManagementNumber: `E2E-${ts}`,
        shipPlanDate: new Date().toISOString().slice(0, 10).replace(/-/g, '/'),
        invoiceType: '0',
        coolType: '0',
        recipient: {
          postalCode: '1000001',
          prefecture: '東京都',
          city: '千代田区',
          street: '千代田1-1',
          building: '',
          name: 'E2Eテスト太郎',
          phone: '03-0000-0000',
        },
        sender: {
          postalCode: '1350061',
          prefecture: '東京都',
          city: '江東区',
          street: '豊洲2-4-9',
          building: '',
          name: 'ZELIX倉庫',
          phone: '03-1234-5678',
        },
        products: [
          { inputSku: testProduct1.sku, quantity: 5 },
        ],
      },
    }],
  };
  const createShip = await api('POST', '/shipment-orders/manual/bulk', shipData);
  assert('出荷注文一括作成', [200, 201, 207].includes(createShip.status), `status=${createShip.status} ${JSON.stringify(createShip.data).slice(0,300)}`);

  // ─── 8. 商品管理 ─────────────────────────────
  console.log('\n8. 商品管理 / 商品管理');
  const prodCreateRes = await api('POST', '/products', {
    sku: `E2E-PROD-${Date.now()}`,
    name: 'E2Eテスト商品',
    price: 999,
    inventoryEnabled: true,
    lotTrackingEnabled: false,
    expiryTrackingEnabled: false,
    serialTrackingEnabled: false,
    mailCalcEnabled: false,
    safetyStock: 10,
    alertDaysBeforeExpiry: 30,
  });
  assert('商品作成', [200, 201].includes(prodCreateRes.status), `status=${prodCreateRes.status} ${JSON.stringify(prodCreateRes.data).slice(0,200)}`);

  // ─── 9. ロケーション管理 ──────────────────────
  console.log('\n9. ロケーション管理 / 库位管理');
  const locCreateRes = await api('POST', '/locations', {
    code: `E2E-LOC-${Date.now()}`,
    name: 'E2Eテスト棚',
    type: 'bin',
    fullPath: 'E2E/TEST',
  });
  assert('ロケーション作成', [200, 201].includes(locCreateRes.status), `status=${locCreateRes.status} ${JSON.stringify(locCreateRes.data).slice(0,200)}`);

  // ─── 10. 荷主管理 ────────────────────────────
  console.log('\n10. 荷主管理 / 客户管理');
  const clientCreateRes = await api('POST', '/clients', {
    clientCode: `E2E-CL-${Date.now()}`,
    name: 'E2Eテスト荷主',
    plan: 'standard',
  });
  assert('荷主作成', [200, 201].includes(clientCreateRes.status), `status=${clientCreateRes.status} ${JSON.stringify(clientCreateRes.data).slice(0,200)}`);

  // ─── 11. 返品フロー ──────────────────────────
  console.log('\n11. 返品 / 退货');
  const returnListRes = await api('GET', '/return-orders');
  assert('返品一覧', returnListRes.status === 200, `status=${returnListRes.status}`);

  // ─── 12. 棚卸 ────────────────────────────────
  console.log('\n12. 棚卸 / 盘点');
  const stocktakeListRes = await api('GET', '/stocktaking-orders');
  assert('棚卸一覧', stocktakeListRes.status === 200, `status=${stocktakeListRes.status}`);

  // ─── 13. 日報 ────────────────────────────────
  console.log('\n13. 日報 / 日报');
  const dailyRes = await api('GET', '/daily-reports');
  assert('日報一覧', dailyRes.status === 200, `status=${dailyRes.status}`);

  // ─── 14. 料金体系 ────────────────────────────
  console.log('\n14. 料金体系 / 费率体系');
  const rateRes = await api('GET', '/service-rates');
  assert('料金マスタ', rateRes.status === 200, `status=${rateRes.status}`);

  const billingRes = await api('GET', '/billing');
  assert('請求一覧', billingRes.status === 200, `status=${billingRes.status}`);

  // ─── 15. ユーザー管理 ─────────────────────────
  console.log('\n15. ユーザー管理 / 用户管理');
  const usersRes = await api('GET', '/users');
  assert('ユーザー一覧', usersRes.status === 200, `status=${usersRes.status}`);

  // ─── 16. 設定系 ──────────────────────────────
  console.log('\n16. 設定 / 设置');
  const settingsRes = await api('GET', '/system-settings');
  assert('システム設定', settingsRes.status === 200 || settingsRes.status === 404, `status=${settingsRes.status}`);

  const suppRes = await api('GET', '/suppliers');
  assert('仕入先一覧', suppRes.status === 200, `status=${suppRes.status}`);

  // ─── 17. 拡張機能 ────────────────────────────
  console.log('\n17. 拡張機能 / 扩展功能');
  const webhookRes = await api('GET', '/extensions/webhooks');
  assert('Webhook一覧', [200, 403].includes(webhookRes.status), `status=${webhookRes.status}`);

  const pluginRes = await api('GET', '/extensions/plugins');
  assert('プラグイン一覧', [200, 403].includes(pluginRes.status), `status=${pluginRes.status}`);

  const eventLogRes = await api('GET', '/extensions/logs/stats');
  assert('イベントログ統計', [200, 403].includes(eventLogRes.status), `status=${eventLogRes.status}`);

  // ─── 結果 ────────────────────────────────────
  console.log('\n========================================');
  console.log(`  結果: ${passed} passed, ${failed} failed`);
  console.log('========================================');
  if (errors.length > 0) {
    console.log('\n失敗項目:');
    errors.forEach(e => console.log('  - ' + e));
  }
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => {
  console.error('Fatal error:', e.message);
  process.exit(1);
});
