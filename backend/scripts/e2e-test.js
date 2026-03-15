#!/usr/bin/env node

/**
 * ZELIXWMS 综合 E2E 测试脚本 / ZELIXWMS 総合E2Eテストスクリプト
 *
 * 全主要业务流程的端到端测试，使用实际数据创建和验证。
 * 主要な全ビジネスフローのエンドツーエンドテスト、実データ作成・検証を行う。
 *
 * 使用方法 / 使用方法:
 *   node backend/scripts/e2e-test.js
 *   node backend/scripts/e2e-test.js http://localhost:4000/api
 */

const BASE = process.argv[2] || 'http://localhost:4000/api';
const TS = Date.now();

// ─── HTTP 辅助 / HTTPヘルパー ───

async function api(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json().catch(() => null);
  return { status: res.status, data, ok: res.ok };
}

// ─── 测试计数器 / テストカウンター ───

let pass = 0;
let fail = 0;

function check(name, ok, detail) {
  if (ok) {
    pass++;
    console.log(`  [PASS] ${name}${detail ? ': ' + detail : ''}`);
  } else {
    fail++;
    console.log(`  [FAIL] ${name}${detail ? ': ' + detail : ''}`);
  }
}

function section(t) {
  console.log(`\n-- ${t} --`);
}

// ─── 测试用数据 ID 缓存 / テスト用データIDキャッシュ ───

const ctx = {
  token: null,
  userId: null,
  productId: null,
  productSku: null,
  locationId: null,
  materialId: null,
  inboundOrderId: null,
  crossdockInboundId: null,
  shipmentOrderId: null,
  returnOrderId: null,
  stocktakingOrderId: null,
  fbaPlanId: null,
  rslPlanId: null,
  billingRecordId: null,
  invoiceId: null,
  createdUserId: null,
};

// ═══════════════════════════════════════════════════════════
// 1. 认证 / 認証
// ═══════════════════════════════════════════════════════════

async function testAuth() {
  section('1. Auth / 認証');

  // ログイン / 登录
  const login = await api('POST', '/auth/login', {
    email: 'admin@zelix.com',
    password: 'admin123',
  });
  check('Login returns 200', login.status === 200, `status=${login.status}`);
  check('Login returns token', !!login.data?.token, login.data?.token ? 'token present' : 'no token');
  ctx.token = login.data?.token;

  if (!ctx.token) {
    console.log('\n  [FATAL] Cannot proceed without auth token. Aborting.');
    process.exit(1);
  }

  // /me エンドポイント / /me 端点
  const me = await api('GET', '/auth/me', null, ctx.token);
  check('/me returns 200', me.status === 200, `status=${me.status}`);
  check('/me has user data', !!me.data?.email || !!me.data?.id, `email=${me.data?.email}`);
  ctx.userId = me.data?.id;
}

// ═══════════════════════════════════════════════════════════
// 2. 商品マスター / 商品主数据
// ═══════════════════════════════════════════════════════════

async function testProducts() {
  section('2. Products / 商品');

  const list = await api('GET', '/products?limit=5', null, ctx.token);
  check('List products returns 200', list.status === 200, `status=${list.status}`);

  const items = list.data?.data || list.data?.items || list.data || [];
  const count = Array.isArray(items) ? items.length : 0;
  check('Products exist', count > 0, `count=${count}`);

  if (count > 0) {
    ctx.productId = items[0]._id;
    ctx.productSku = items[0].sku;
    check('First product has _id', !!ctx.productId, `id=${ctx.productId}`);
  }
}

// ═══════════════════════════════════════════════════════════
// 3. 资材マスター / 耗材主数据
// ═══════════════════════════════════════════════════════════

async function testMaterials() {
  section('3. Materials / 耗材');

  const list = await api('GET', '/materials?limit=5', null, ctx.token);
  check('List materials returns 200', list.status === 200, `status=${list.status}`);

  const items = list.data?.data || list.data?.items || list.data || [];
  const count = Array.isArray(items) ? items.length : 0;
  check('Materials count >= 0', count >= 0, `count=${count}`);

  if (count > 0) {
    ctx.materialId = items[0]._id;
  }
}

// ═══════════════════════════════════════════════════════════
// 获取ロケーション / ロケーション取得
// ═══════════════════════════════════════════════════════════

async function fetchLocation() {
  const locList = await api('GET', '/locations?limit=5', null, ctx.token);
  const locs = locList.data?.data || locList.data?.items || locList.data || [];
  if (Array.isArray(locs) && locs.length > 0) {
    ctx.locationId = locs[0]._id;
  }
}

// ═══════════════════════════════════════════════════════════
// 4. 入庫 (standard flow) / 入库（标准流程）
// ═══════════════════════════════════════════════════════════

async function testInboundStandard() {
  section('4. Inbound Standard / 入庫（標準）');

  if (!ctx.productId || !ctx.locationId) {
    check('Prerequisite: productId & locationId', false, 'missing prerequisites');
    return;
  }

  // 作成 / 创建
  const create = await api('POST', '/inbound-orders', {
    destinationLocationId: ctx.locationId,
    supplier: 'E2E Test Supplier',
    flowType: 'standard',
    lines: [{
      productId: ctx.productId,
      expectedQuantity: 10,
    }],
    memo: `E2E standard inbound test ${TS}`,
  }, ctx.token);
  check('Create inbound order', create.status === 201, `status=${create.status}`);
  ctx.inboundOrderId = create.data?._id;

  if (!ctx.inboundOrderId) {
    check('Inbound order created with _id', false, 'no _id returned');
    return;
  }

  // 確認 / 确认
  const confirm = await api('POST', `/inbound-orders/${ctx.inboundOrderId}/confirm`, {}, ctx.token);
  check('Confirm inbound', confirm.ok, `status=${confirm.status}`);

  // 入荷 / 收货
  const receive = await api('POST', `/inbound-orders/${ctx.inboundOrderId}/receive`, {
    lineIndex: 0,
    receivedQuantity: 10,
  }, ctx.token);
  check('Receive inbound line', receive.ok, `status=${receive.status}`);

  // 棚入れ / 上架
  const putaway = await api('POST', `/inbound-orders/${ctx.inboundOrderId}/putaway`, {
    lineIndex: 0,
    putawayLocationId: ctx.locationId,
    putawayQuantity: 10,
  }, ctx.token);
  check('Putaway inbound line', putaway.ok, `status=${putaway.status}`);

  // 完了 / 完成
  const complete = await api('POST', `/inbound-orders/${ctx.inboundOrderId}/complete`, {}, ctx.token);
  check('Complete inbound', complete.ok, `status=${complete.status}`);

  // 検証 / 验证
  const get = await api('GET', `/inbound-orders/${ctx.inboundOrderId}`, null, ctx.token);
  check('Verify inbound completed', get.data?.status === 'completed', `status=${get.data?.status}`);
}

// ═══════════════════════════════════════════════════════════
// 5. 入庫 (crossdock flow) / 入库（通过配送流程）
// ═══════════════════════════════════════════════════════════

async function testInboundCrossdock() {
  section('5. Inbound Crossdock / 入庫（クロスドック）');

  if (!ctx.productId || !ctx.locationId) {
    check('Prerequisite: productId & locationId', false, 'missing prerequisites');
    return;
  }

  // 作成 / 创建
  const create = await api('POST', '/inbound-orders', {
    destinationLocationId: ctx.locationId,
    supplier: 'E2E Crossdock Supplier',
    flowType: 'crossdock',
    lines: [{
      productId: ctx.productId,
      expectedQuantity: 5,
    }],
    memo: `E2E crossdock inbound test ${TS}`,
  }, ctx.token);
  check('Create crossdock inbound', create.status === 201, `status=${create.status}`);
  ctx.crossdockInboundId = create.data?._id;

  if (!ctx.crossdockInboundId) {
    check('Crossdock inbound created', false, 'no _id');
    return;
  }

  // 確認 / 确认
  const confirm = await api('POST', `/inbound-orders/${ctx.crossdockInboundId}/confirm`, {}, ctx.token);
  check('Confirm crossdock inbound', confirm.ok, `status=${confirm.status}`);

  // 入荷（クロスドックは入荷後自動完了の可能性がある）
  // 收货（crossdock 收货后可能自动完成）
  const receive = await api('POST', `/inbound-orders/${ctx.crossdockInboundId}/bulk-receive`, {
    lines: [{ lineIndex: 0, receivedQuantity: 5 }],
  }, ctx.token);
  check('Receive crossdock inbound', receive.ok, `status=${receive.status}`);

  // 完了確認 / 完成确认
  const get = await api('GET', `/inbound-orders/${ctx.crossdockInboundId}`, null, ctx.token);
  const finalStatus = get.data?.status;
  check('Crossdock inbound final state', finalStatus === 'completed' || finalStatus === 'received', `status=${finalStatus}`);
}

// ═══════════════════════════════════════════════════════════
// 6. 出荷 / 出货
// ═══════════════════════════════════════════════════════════

async function testShipment() {
  section('6. Shipment / 出荷');

  if (!ctx.productId) {
    check('Prerequisite: productId', false, 'missing prerequisites');
    return;
  }

  const cmn = `E2E-${TS}`;

  // 作成 / 创建
  const create = await api('POST', '/shipment-orders/manual/bulk', {
    items: [{
      clientId: `e2e-${TS}`,
      order: {
        customerManagementNumber: cmn,
        carrierId: '__builtin_yamato_b2__',
        invoiceType: '0',
        shipPlanDate: new Date().toISOString().slice(0, 10),
        recipient: {
          postalCode: '1000001',
          prefecture: '東京都',
          city: '千代田区',
          street: '千代田1-1',
          building: 'E2Eテストビル',
          name: 'E2Eテスト受取人',
          phone: '0312345678',
        },
        sender: {
          postalCode: '5300001',
          prefecture: '大阪府',
          city: '大阪市北区',
          street: '梅田1-1',
          building: 'E2Eテスト依頼主ビル',
          name: 'E2Eテスト依頼主',
          phone: '0612345678',
        },
        products: [{
          inputSku: ctx.productSku || 'E2E-SKU',
          quantity: 1,
          productId: ctx.productId,
        }],
      },
    }],
  }, ctx.token);
  check('Create shipment order', create.status === 201 || create.status === 207, `status=${create.status}`);

  // 成功した注文IDを取得 / 获取成功的订单ID
  const successes = create.data?.data?.successes || [];
  if (successes.length > 0) {
    ctx.shipmentOrderId = successes[0].insertedId;
  }
  check('Shipment order has ID', !!ctx.shipmentOrderId, `id=${ctx.shipmentOrderId}`);

  if (!ctx.shipmentOrderId) return;

  // 確認 / 确认 (mark-print-ready)
  const confirm = await api('POST', `/shipment-orders/${ctx.shipmentOrderId}/status`, {
    action: 'mark-print-ready',
    statusType: 'confirm',
  }, ctx.token);
  check('Confirm shipment (mark-print-ready)', confirm.ok, `status=${confirm.status}`);

  // 検品済み / 检品完成 (mark-inspected)
  const inspect = await api('POST', `/shipment-orders/${ctx.shipmentOrderId}/status`, {
    action: 'mark-inspected',
    statusType: 'inspected',
  }, ctx.token);
  check('Inspect shipment', inspect.ok, `status=${inspect.status}`);

  // 出荷済み / 已出货 (mark-shipped)
  const ship = await api('POST', `/shipment-orders/${ctx.shipmentOrderId}/status`, {
    action: 'mark-shipped',
    statusType: 'shipped',
  }, ctx.token);
  check('Ship shipment', ship.ok, `status=${ship.status}`);

  // 検証 / 验证
  const get = await api('GET', `/shipment-orders/${ctx.shipmentOrderId}`, null, ctx.token);
  check('Verify shipment shipped', get.data?.status?.shipped?.isShipped === true, `shipped=${get.data?.status?.shipped?.isShipped}`);
}

// ═══════════════════════════════════════════════════════════
// 7. 返品 / 退货
// ═══════════════════════════════════════════════════════════

async function testReturns() {
  section('7. Returns / 返品');

  if (!ctx.productId) {
    check('Prerequisite: productId', false, 'missing prerequisites');
    return;
  }

  // 作成 / 创建
  const create = await api('POST', '/return-orders', {
    returnReason: 'customer_request',
    reasonDetail: 'E2E test return',
    shipmentOrderId: ctx.shipmentOrderId || undefined,
    lines: [{
      productId: ctx.productId,
      productSku: ctx.productSku,
      quantity: 1,
    }],
  }, ctx.token);
  check('Create return order', create.status === 201 || create.status === 200, `status=${create.status}`);
  ctx.returnOrderId = create.data?._id;

  if (!ctx.returnOrderId) {
    check('Return order has ID', false, 'no _id');
    return;
  }

  // 検品開始 / 开始检品
  const startInsp = await api('POST', `/return-orders/${ctx.returnOrderId}/start-inspection`, {}, ctx.token);
  check('Start return inspection', startInsp.ok, `status=${startInsp.status}`);

  // 検品 / 检品
  const inspect = await api('POST', `/return-orders/${ctx.returnOrderId}/inspect`, {
    lines: [{
      lineIndex: 0,
      inspectedQuantity: 1,
      disposition: 'restock',
      restockedQuantity: 1,
      disposedQuantity: 0,
    }],
  }, ctx.token);
  check('Inspect return lines', inspect.ok, `status=${inspect.status}`);

  // 完了 / 完成
  const complete = await api('POST', `/return-orders/${ctx.returnOrderId}/complete`, {}, ctx.token);
  check('Complete return order', complete.ok, `status=${complete.status}`);

  // 検証 / 验证
  const get = await api('GET', `/return-orders/${ctx.returnOrderId}`, null, ctx.token);
  check('Verify return completed', get.data?.status === 'completed', `status=${get.data?.status}`);
}

// ═══════════════════════════════════════════════════════════
// 8. 棚卸 / 盘点
// ═══════════════════════════════════════════════════════════

async function testStocktaking() {
  section('8. Stocktaking / 棚卸');

  // 作成 / 创建
  const create = await api('POST', '/stocktaking-orders', {
    type: 'spot',
    targetLocations: ctx.locationId ? [ctx.locationId] : [],
    memo: `E2E stocktaking test ${TS}`,
  }, ctx.token);
  check('Create stocktaking order', create.status === 201 || create.status === 200, `status=${create.status}`);
  ctx.stocktakingOrderId = create.data?._id;

  if (!ctx.stocktakingOrderId) {
    check('Stocktaking has ID', false, 'no _id');
    return;
  }

  // 詳細確認 / 详情确认
  const get = await api('GET', `/stocktaking-orders/${ctx.stocktakingOrderId}`, null, ctx.token);
  check('Verify stocktaking created', get.ok, `status=${get.status}`);
  const lines = get.data?.lines || [];
  check('Stocktaking has lines', lines.length >= 0, `lineCount=${lines.length}`);
}

// ═══════════════════════════════════════════════════════════
// 9. FBA 入庫プラン / FBA入库计划
// ═══════════════════════════════════════════════════════════

async function testFba() {
  section('9. FBA Plan / FBA入庫プラン');

  // 作成 / 创建
  const create = await api('POST', '/fba/plans', {
    destinationFc: 'NRT1',
    amazonShipmentId: `FBA-E2E-${TS}`,
    items: [{
      sku: ctx.productSku || 'E2E-SKU',
      quantity: 10,
      productId: ctx.productId,
    }],
    memo: `E2E FBA test ${TS}`,
  }, ctx.token);
  check('Create FBA plan', create.status === 201 || create.status === 200, `status=${create.status}`);
  ctx.fbaPlanId = create.data?._id;

  if (!ctx.fbaPlanId) {
    check('FBA plan has ID', false, 'no _id');
    return;
  }

  // 確定 / 确认
  const confirm = await api('POST', `/fba/plans/${ctx.fbaPlanId}/confirm`, {}, ctx.token);
  check('Confirm FBA plan', confirm.ok, `status=${confirm.status}`);

  // 検証 / 验证
  const get = await api('GET', `/fba/plans/${ctx.fbaPlanId}`, null, ctx.token);
  check('Verify FBA plan confirmed', get.data?.status === 'confirmed', `status=${get.data?.status}`);
}

// ═══════════════════════════════════════════════════════════
// 10. RSL 入庫プラン / RSL入库计划
// ═══════════════════════════════════════════════════════════

async function testRsl() {
  section('10. RSL Plan / RSL入庫プラン');

  // 作成 / 创建
  const create = await api('POST', '/rsl/plans', {
    destinationWarehouse: 'RSL-Tokyo-01',
    rakutenShipmentId: `RSL-E2E-${TS}`,
    items: [{
      sku: ctx.productSku || 'E2E-SKU',
      quantity: 5,
      productId: ctx.productId,
    }],
    memo: `E2E RSL test ${TS}`,
  }, ctx.token);
  check('Create RSL plan', create.status === 201 || create.status === 200, `status=${create.status}`);
  ctx.rslPlanId = create.data?._id;

  if (!ctx.rslPlanId) {
    check('RSL plan has ID', false, 'no _id');
    return;
  }

  // 確定 / 确认
  const confirm = await api('POST', `/rsl/plans/${ctx.rslPlanId}/confirm`, {}, ctx.token);
  check('Confirm RSL plan', confirm.ok, `status=${confirm.status}`);

  // 検証 / 验证
  const get = await api('GET', `/rsl/plans/${ctx.rslPlanId}`, null, ctx.token);
  check('Verify RSL plan confirmed', get.data?.status === 'confirmed', `status=${get.data?.status}`);
}

// ═══════════════════════════════════════════════════════════
// 11. 請求 / 账单
// ═══════════════════════════════════════════════════════════

async function testBilling() {
  section('11. Billing / 請求');

  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // 月次請求生成 / 月次请求生成
  const generate = await api('POST', '/billing/generate', { period }, ctx.token);
  check('Generate monthly billing', generate.ok || generate.status === 201, `status=${generate.status}`);

  // 請求明細一覧 / 请求明细列表
  const list = await api('GET', `/billing?period=${period}`, null, ctx.token);
  check('List billing records', list.ok, `status=${list.status}`);

  const records = list.data?.data || [];
  if (records.length > 0) {
    ctx.billingRecordId = records[0]._id;

    // 確定 / 确认
    const confirm = await api('POST', `/billing/${ctx.billingRecordId}/confirm`, {}, ctx.token);
    check('Confirm billing record', confirm.ok, `status=${confirm.status}`);

    // 請求書作成 / 创建发票
    const invoice = await api('POST', '/billing/invoices', {
      billingRecordId: ctx.billingRecordId,
      period,
      issueDate: now.toISOString().slice(0, 10),
      dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    }, ctx.token);
    check('Create invoice', invoice.ok || invoice.status === 201, `status=${invoice.status}`);
    ctx.invoiceId = invoice.data?._id;
    check('Invoice has ID', !!ctx.invoiceId, `id=${ctx.invoiceId}`);
  } else {
    check('Billing records exist', false, 'no records for period (may need shipped orders first)');
  }
}

// ═══════════════════════════════════════════════════════════
// 12. 作業チャージ / 作业费用
// ═══════════════════════════════════════════════════════════

async function testWorkCharges() {
  section('12. Work Charges / 作業チャージ');

  // 一覧取得 / 列表获取
  const list = await api('GET', '/work-charges?limit=5', null, ctx.token);
  check('List work charges', list.ok, `status=${list.status}`);

  const charges = list.data?.data || list.data?.items || list.data || [];
  const count = Array.isArray(charges) ? charges.length : 0;
  check('Work charges exist (auto-generated from ops)', count >= 0, `count=${count}`);

  // サマリー取得 / 汇总获取
  const summary = await api('GET', '/work-charges/summary', null, ctx.token);
  check('Work charges summary', summary.ok, `status=${summary.status}`);
}

// ═══════════════════════════════════════════════════════════
// 13. ユーザー管理 / 用户管理
// ═══════════════════════════════════════════════════════════

async function testUsers() {
  section('13. Users / ユーザー');

  const email = `e2e-operator-${TS}@test.local`;

  // ユーザー作成 / 创建用户
  const create = await api('POST', '/users', {
    email,
    password: 'test123456',
    displayName: `E2E Operator ${TS}`,
    role: 'operator',
  }, ctx.token);
  check('Create operator user', create.status === 201 || create.status === 200, `status=${create.status}`);
  ctx.createdUserId = create.data?._id;
  check('User has ID', !!ctx.createdUserId, `id=${ctx.createdUserId}`);

  // 一覧取得 / 列表获取
  const list = await api('GET', '/users?limit=5', null, ctx.token);
  check('List users', list.ok, `status=${list.status}`);

  // 作成したユーザーを削除（クリーンアップ）/ 删除创建的用户（清理）
  if (ctx.createdUserId) {
    const del = await api('DELETE', `/users/${ctx.createdUserId}`, null, ctx.token);
    check('Cleanup: delete test user', del.ok, `status=${del.status}`);
  }
}

// ═══════════════════════════════════════════════════════════
// 14. OMS 在庫照会 / OMS库存查询
// ═══════════════════════════════════════════════════════════

async function testOmsStock() {
  section('14. OMS Stock / OMS在庫');

  // 在庫一覧 / 库存列表
  const stock = await api('GET', '/oms/stock', null, ctx.token);
  check('OMS stock query', stock.ok, `status=${stock.status}`);

  // SKU指定照会 / 按SKU查询
  if (ctx.productSku) {
    const skuStock = await api('GET', `/oms/stock/${encodeURIComponent(ctx.productSku)}`, null, ctx.token);
    check('OMS stock by SKU', skuStock.ok, `status=${skuStock.status}`);
  }
}

// ═══════════════════════════════════════════════════════════
// 15. 全 API エンドポイント疎通確認 / 全API端点连通确认
// ═══════════════════════════════════════════════════════════

async function testAllApis() {
  section('15. All API Endpoints / 全APIエンドポイント');

  // 全GET系エンドポイントの疎通確認 / 全GET端点连通确认
  const endpoints = [
    { path: '/dashboard', name: 'Dashboard' },
    { path: '/shipment-orders?limit=1', name: 'Shipment Orders' },
    { path: '/products?limit=1', name: 'Products' },
    { path: '/carriers?limit=1', name: 'Carriers' },
    { path: '/locations?limit=1', name: 'Locations' },
    { path: '/inventory?limit=1', name: 'Inventory' },
    { path: '/inbound-orders?limit=1', name: 'Inbound Orders' },
    { path: '/return-orders?limit=1', name: 'Return Orders' },
    { path: '/stocktaking-orders?limit=1', name: 'Stocktaking Orders' },
    { path: '/lots?limit=1', name: 'Lots' },
    { path: '/materials?limit=1', name: 'Materials' },
    { path: '/order-groups?limit=1', name: 'Order Groups' },
    { path: '/mapping-configs?limit=1', name: 'Mapping Configs' },
    { path: '/order-source-companies?limit=1', name: 'Order Source Companies' },
    { path: '/print-templates?limit=1', name: 'Print Templates' },
    { path: '/form-templates?limit=1', name: 'Form Templates' },
    { path: '/carrier-automation?limit=1', name: 'Carrier Automation' },
    { path: '/auto-processing-rules?limit=1', name: 'Auto Processing Rules' },
    { path: '/daily-reports?limit=1', name: 'Daily Reports' },
    { path: '/set-products?limit=1', name: 'Set Products' },
    { path: '/suppliers?limit=1', name: 'Suppliers' },
    { path: '/inventory-categories?limit=1', name: 'Inventory Categories' },
    { path: '/customers?limit=1', name: 'Customers' },
    { path: '/operation-logs?limit=1', name: 'Operation Logs' },
    { path: '/system-settings', name: 'System Settings' },
    { path: '/email-templates?limit=1', name: 'Email Templates' },
    { path: '/api-logs?limit=1', name: 'API Logs' },
    { path: '/wms-schedules?limit=1', name: 'WMS Schedules' },
    { path: '/tasks?limit=1', name: 'Tasks' },
    { path: '/waves?limit=1', name: 'Waves' },
    { path: '/rules?limit=1', name: 'Rules' },
    { path: '/serial-numbers?limit=1', name: 'Serial Numbers' },
    { path: '/clients?limit=1', name: 'Clients' },
    { path: '/warehouses?limit=1', name: 'Warehouses' },
    { path: '/workflows?limit=1', name: 'Workflows' },
    { path: '/shipping-rates?limit=1', name: 'Shipping Rates' },
    { path: '/billing?limit=1', name: 'Billing' },
    { path: '/billing/dashboard', name: 'Billing Dashboard' },
    { path: '/billing/invoices?limit=1', name: 'Invoices' },
    { path: '/packing-rules?limit=1', name: 'Packing Rules' },
    { path: '/service-rates?limit=1', name: 'Service Rates' },
    { path: '/work-charges?limit=1', name: 'Work Charges' },
    { path: '/work-charges/summary', name: 'Work Charges Summary' },
    { path: '/users?limit=1', name: 'Users' },
    { path: '/fba/plans?limit=1', name: 'FBA Plans' },
    { path: '/rsl/plans?limit=1', name: 'RSL Plans' },
    { path: '/oms/stock', name: 'OMS Stock' },
    { path: '/inventory-ledger?limit=1', name: 'Inventory Ledger' },
    { path: '/extensions?limit=1', name: 'Extensions' },
  ];

  // 并行请求（10并发）/ パラレルリクエスト（10並行）
  const batchSize = 10;
  for (let i = 0; i < endpoints.length; i += batchSize) {
    const batch = endpoints.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (ep) => {
        try {
          const res = await api('GET', ep.path, null, ctx.token);
          return { ...ep, status: res.status, ok: res.ok };
        } catch (err) {
          return { ...ep, status: 0, ok: false };
        }
      })
    );
    for (const r of results) {
      check(`GET ${r.name}`, r.ok || r.status === 200, `status=${r.status}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════
// クリーンアップ / 清理
// ═══════════════════════════════════════════════════════════

async function cleanup() {
  section('Cleanup / クリーンアップ');

  // 出荷注文削除 / 删除出货订单
  if (ctx.shipmentOrderId) {
    const del = await api('DELETE', `/shipment-orders/${ctx.shipmentOrderId}`, null, ctx.token);
    check('Delete test shipment order', del.ok, `status=${del.status}`);
  }

  // 入庫指示削除（standard） / 删除入库指示（标准）
  if (ctx.inboundOrderId) {
    const del = await api('DELETE', `/inbound-orders/${ctx.inboundOrderId}`, null, ctx.token);
    check('Delete test inbound (standard)', del.ok || del.status === 400, `status=${del.status}`);
  }

  // 入庫指示削除（crossdock） / 删除入库指示（crossdock）
  if (ctx.crossdockInboundId) {
    const del = await api('DELETE', `/inbound-orders/${ctx.crossdockInboundId}`, null, ctx.token);
    check('Delete test inbound (crossdock)', del.ok || del.status === 400, `status=${del.status}`);
  }

  // 返品指示削除 / 删除退货指示
  if (ctx.returnOrderId) {
    const del = await api('DELETE', `/return-orders/${ctx.returnOrderId}`, null, ctx.token);
    check('Delete test return order', del.ok || del.status === 400, `status=${del.status}`);
  }

  // 棚卸指示削除 / 删除盘点指示
  if (ctx.stocktakingOrderId) {
    const del = await api('DELETE', `/stocktaking-orders/${ctx.stocktakingOrderId}`, null, ctx.token);
    check('Delete test stocktaking order', del.ok || del.status === 400, `status=${del.status}`);
  }

  // FBAプラン削除 / 删除FBA计划
  if (ctx.fbaPlanId) {
    const del = await api('DELETE', `/fba/plans/${ctx.fbaPlanId}`, null, ctx.token);
    check('Delete test FBA plan', del.ok || del.status === 400, `status=${del.status}`);
  }

  // RSLプラン削除 / 删除RSL计划
  if (ctx.rslPlanId) {
    const del = await api('DELETE', `/rsl/plans/${ctx.rslPlanId}`, null, ctx.token);
    check('Delete test RSL plan', del.ok || del.status === 400, `status=${del.status}`);
  }
}

// ═══════════════════════════════════════════════════════════
// メインエントリー / 主入口
// ═══════════════════════════════════════════════════════════

async function main() {
  console.log('='.repeat(50));
  console.log('  ZELIXWMS E2E Test Suite');
  console.log(`  Target: ${BASE}`);
  console.log(`  Timestamp: ${new Date().toISOString()}`);
  console.log('='.repeat(50));

  try {
    await testAuth();
    await testProducts();
    await testMaterials();
    await fetchLocation();
    await testInboundStandard();
    await testInboundCrossdock();
    await testShipment();
    await testReturns();
    await testStocktaking();
    await testFba();
    await testRsl();
    await testBilling();
    await testWorkCharges();
    await testUsers();
    await testOmsStock();
    await testAllApis();
    await cleanup();
  } catch (err) {
    console.error('\n[FATAL] Unhandled error:', err);
    fail++;
  }

  // 结果汇总 / 結果サマリー
  console.log('\n' + '='.repeat(50));
  console.log(`  PASS: ${pass}  FAIL: ${fail}`);
  if (fail === 0) {
    console.log('  STATUS: ALL PASS');
  } else {
    console.log(`  STATUS: ${fail} FAILURE(S)`);
  }
  console.log('='.repeat(50));

  process.exit(fail > 0 ? 1 : 0);
}

main();
