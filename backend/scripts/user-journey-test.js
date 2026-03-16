/**
 * 完整用户旅程测试 / 完全ユーザージャーニーテスト
 *
 * 模拟真实操作: Admin → Portal → Warehouse → Portal
 * 実際のオペレーションをシミュレート
 */

const BASE = process.env.API_URL || 'http://localhost:4000/api';
let adminToken = 'dev-token';
let portalToken = '';

async function api(method, path, body, token) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token || adminToken}`,
      'x-tenant-id': 'default',
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

function step(name) { console.log(`\n━━━ ${name} ━━━`); }

async function main() {
  console.log('🚀 完整用户旅程测试 / Complete User Journey Test\n');

  // ============================================
  step('1. Admin: 创建新客户');
  // ============================================
  const client = await api('POST', '/clients', {
    clientCode: 'JRN-001',
    name: '东京樱花物流株式会社',
    name2: 'Tokyo Sakura Logistics Co.',
    clientType: 'logistics_company',
    creditTier: 'standard',
    creditLimit: 2000000,
    paymentTermDays: 30,
    email: 'info@sakura-logistics.jp',
    phone: '03-1111-2222',
    portalLanguage: 'zh',
  });
  console.log(`✅ 客户: ${client.name} (${client.clientCode})`);

  // ============================================
  step('2. Admin: 创建子客户 + 店铺');
  // ============================================
  const subClient = await api('POST', '/sub-clients', {
    clientId: client._id,
    subClientCode: 'JRN-SUB-001',
    name: '深圳数码科技有限公司',
    subClientType: 'end_customer',
    email: 'sz-digital@example.com',
  });
  console.log(`✅ 子客户: ${subClient.name}`);

  const shop = await api('POST', '/shops', {
    clientId: client._id,
    subClientId: subClient._id,
    shopCode: 'JRN-SHOP-001',
    shopName: '数码科技 Amazon店',
    platform: 'amazon_jp',
    platformAccountId: 'A_SAKURA_001',
  });
  console.log(`✅ 店铺: ${shop.shopName} (${shop.platform})`);

  // ============================================
  step('3. Admin: 设定价格目录');
  // ============================================
  const priceItems = [
    { chargeType: 'inbound_handling', name: '数量点数', unit: 'per_item', unitPrice: 5 },
    { chargeType: 'labeling', name: '贴 FNSKU', unit: 'per_item', unitPrice: 15 },
    { chargeType: 'opp_bagging', name: '套 OPP 袋', unit: 'per_item', unitPrice: 10 },
    { chargeType: 'fba_delivery', name: 'FBA 配送', unit: 'per_case', unitPrice: 200 },
  ];
  for (const p of priceItems) {
    await api('POST', '/service-rates', {
      ...p, clientId: client._id, clientName: client.name, isActive: true,
    });
  }
  console.log(`✅ 价格目录: ${priceItems.length} 项`);

  // ============================================
  step('4. Admin: 邀请门户用户');
  // ============================================
  const portalUser = await api('POST', '/portal/auth/invite', {
    email: 'journey-test@sakura.jp',
    password: 'sakura12345',
    displayName: '物流担当 田中',
    clientId: client._id,
  });
  console.log(`✅ 门户账号: ${portalUser.email}`);

  // ============================================
  step('5. Portal: 客户登录');
  // ============================================
  const loginRes = await api('POST', '/portal/auth/login', {
    email: 'journey-test@sakura.jp',
    password: 'sakura12345',
  });
  portalToken = loginRes.token;
  console.log(`✅ 登录成功: ${loginRes.user.displayName} (clientId: ${loginRes.user.clientId})`);

  // ============================================
  step('6. Portal: 注册商品');
  // ============================================
  const product1 = await api('POST', '/products', {
    sku: 'JRN-BT-001',
    name: 'ワイヤレスイヤホン Pro',
    fnsku: 'X00JRN001',
    asin: 'B0JRN001',
    clientId: client._id,
    shopId: shop._id,
    fbaEnabled: true,
    weight: 150,
  }, portalToken);
  console.log(`✅ 商品1: ${product1.sku} - ${product1.name}`);

  const product2 = await api('POST', '/products', {
    sku: 'JRN-CASE-001',
    name: 'スマホケース レザー',
    fnsku: 'X00JRN002',
    asin: 'B0JRN002',
    clientId: client._id,
    shopId: shop._id,
    fbaEnabled: true,
    weight: 80,
  }, portalToken);
  console.log(`✅ 商品2: ${product2.sku} - ${product2.name}`);

  // ============================================
  step('7. Portal: 查看仪表板');
  // ============================================
  const dashboard1 = await api('GET', `/portal/dashboard?clientId=${client._id}`, null, portalToken);
  console.log(`✅ 仪表板: 进行中=${dashboard1.stats.inProgress}, 费用=¥${dashboard1.stats.monthlyFee}`);

  // ============================================
  step('8. Portal: 创建入库预定 (FBA 通过型)');
  // ============================================
  const order = await api('POST', '/passthrough', {
    destinationType: 'fba',
    clientId: client._id,
    subClientId: subClient._id,
    shopId: shop._id,
    expectedDate: new Date(Date.now() + 3 * 86400000).toISOString(),
    totalBoxCount: 6,
    memo: '用户旅程测试 - 首次入库',
    lines: [
      { lineNumber: 1, productId: product1._id, productSku: 'JRN-BT-001', productName: 'ワイヤレスイヤホン Pro', expectedQuantity: 300, receivedQuantity: 0, putawayQuantity: 0, stockCategory: 'new', stockMoveIds: [] },
      { lineNumber: 2, productId: product2._id, productSku: 'JRN-CASE-001', productName: 'スマホケース レザー', expectedQuantity: 200, receivedQuantity: 0, putawayQuantity: 0, stockCategory: 'new', stockMoveIds: [] },
    ],
    serviceOptions: [
      { optionCode: 'inbound_handling', optionName: '数量点数', quantity: 500, unitPrice: 0, estimatedCost: 0, status: 'pending' },
      { optionCode: 'labeling', optionName: '贴 FNSKU', quantity: 500, unitPrice: 0, estimatedCost: 0, status: 'pending' },
      { optionCode: 'opp_bagging', optionName: '套 OPP 袋', quantity: 300, unitPrice: 0, estimatedCost: 0, status: 'pending' },
    ],
    fbaInfo: { shipmentId: 'FBA-JRN-001', destinationFc: 'NRT5' },
  }, portalToken);
  console.log(`✅ 入库预定: ${order.orderNumber} [${order.status}]`);
  console.log(`   费用预估: ${order.serviceOptions.map(o => `${o.optionName}=¥${o.estimatedCost}`).join(', ')}`);
  console.log(`   总预估: ¥${order.serviceOptions.reduce((s, o) => s + o.estimatedCost, 0).toLocaleString()}`);

  // ============================================
  step('9. Warehouse: 受付 (到货接收)');
  // ============================================
  const arrived = await api('POST', `/passthrough/${order._id}/arrive`, {
    actualBoxCount: 6,
    receivedBy: '仓库员工 佐藤',
    varianceDetails: [
      { sku: 'JRN-BT-001', productName: 'ワイヤレスイヤホン Pro', expectedQuantity: 300, actualQuantity: 298, variance: -2 },
      { sku: 'JRN-CASE-001', productName: 'スマホケース レザー', expectedQuantity: 200, actualQuantity: 200, variance: 0 },
    ],
  });
  console.log(`✅ 受付完了: [${arrived.status}] 差异: ${arrived.varianceReport?.hasVariance ? 'あり' : 'なし'}`);

  // ============================================
  step('10. Portal: 查看进度 + 确认差异');
  // ============================================
  const orderDetail = await api('GET', `/passthrough/${order._id}`, null, portalToken);
  console.log(`✅ 进度: [${orderDetail.status}]`);
  if (orderDetail.varianceReport?.hasVariance) {
    console.log(`   差异: ${orderDetail.varianceReport.details.filter(d => d.variance !== 0).map(d => `${d.sku}: ${d.variance}`).join(', ')}`);
    const acked = await api('POST', `/passthrough/${order._id}/ack-variance`, null, portalToken);
    console.log(`   ✅ 客户已确认差异 (${acked.varianceReport?.clientViewedAt ? '确认时间已记录' : ''})`);
  }

  // ============================================
  step('11. Warehouse: 执行作业 (数量点数)');
  // ============================================
  const opt1 = await api('POST', `/passthrough/${order._id}/complete-option`, {
    optionCode: 'inbound_handling', actualQuantity: 498,
  });
  const ihOpt = opt1.serviceOptions.find(o => o.optionCode === 'inbound_handling');
  console.log(`✅ 数量点数完了: ${ihOpt.actualQuantity}件, ¥${ihOpt.actualCost}`);

  // ============================================
  step('12. Warehouse: 执行作业 (贴标)');
  // ============================================
  const opt2 = await api('POST', `/passthrough/${order._id}/complete-option`, {
    optionCode: 'labeling', actualQuantity: 498,
  });
  const lbOpt = opt2.serviceOptions.find(o => o.optionCode === 'labeling');
  console.log(`✅ 贴标完了: ${lbOpt.actualQuantity}件, ¥${lbOpt.actualCost}`);

  // ============================================
  step('13. Warehouse: 执行作业 (套袋)');
  // ============================================
  const opt3 = await api('POST', `/passthrough/${order._id}/complete-option`, {
    optionCode: 'opp_bagging', actualQuantity: 298,
  });
  const obOpt = opt3.serviceOptions.find(o => o.optionCode === 'opp_bagging');
  console.log(`✅ 套袋完了: ${obOpt.actualQuantity}件, ¥${obOpt.actualCost}`);
  console.log(`   全作業完了 → ステータス: [${opt3.status}]`);

  // ============================================
  step('14. Warehouse: 出货');
  // ============================================
  if (opt3.status === 'ready_to_ship' || opt3.status === 'awaiting_label') {
    // FBA標未上传の場合、label-uploaded を呼ぶ
    if (opt3.status === 'awaiting_label') {
      await api('POST', `/passthrough/${order._id}/label-uploaded`);
      console.log('   FBA標通知 → ready_to_ship');
    }

    const shipped = await api('POST', `/passthrough/${order._id}/ship`, {
      trackingNumbers: [
        { boxNumber: 'U001-U003', trackingNumber: '4567-8901-2345', carrier: '佐川急便' },
        { boxNumber: 'U004-U006', trackingNumber: '4567-8901-6789', carrier: '佐川急便' },
      ],
    });
    console.log(`✅ 出荷完了: [${shipped.status}]`);
    console.log(`   追踪号: ${shipped.trackingNumbers.map(t => t.trackingNumber).join(', ')}`);
  }

  // ============================================
  step('15. Portal: 最终查看');
  // ============================================
  const finalOrder = await api('GET', `/passthrough/${order._id}`, null, portalToken);
  console.log(`✅ 最终状态: [${finalOrder.status}]`);

  const totalActualCost = finalOrder.serviceOptions.reduce((s, o) => s + (o.actualCost || 0), 0);
  console.log(`   费用明细:`);
  for (const o of finalOrder.serviceOptions) {
    console.log(`     ${o.optionName}: ${o.actualQuantity}件 × ¥${o.unitPrice} = ¥${o.actualCost}`);
  }
  console.log(`   总费用: ¥${totalActualCost.toLocaleString()}`);

  // 查看仪表板
  const dashboard2 = await api('GET', `/portal/dashboard?clientId=${client._id}`, null, portalToken);
  console.log(`\n   仪表板更新:`);
  console.log(`   - 本月费用: ¥${dashboard2.stats.monthlyFee.toLocaleString()}`);
  console.log(`   - 信用额度: ¥${dashboard2.client.creditLimit.toLocaleString()} (使用: ${dashboard2.client.creditUsage}%)`);

  // 查看费用明细
  const charges = await api('GET', `/work-charges?clientId=${client._id}&limit=10`, null, portalToken);
  console.log(`   - 费用记录: ${charges.data?.length || 0} 笔`);

  // ============================================
  step('16. Admin: 查看全局数据');
  // ============================================
  const adminDash = await api('GET', '/admin/dashboard');
  console.log(`✅ Admin Dashboard:`);
  console.log(`   客户: ${adminDash.stats.activeClientCount}, 营收: ¥${adminDash.stats.monthlyRevenue.toLocaleString()}`);

  const kpi = await api('GET', '/kpi/dashboard');
  console.log(`   KPI:`);
  for (const k of kpi.kpis) {
    console.log(`     ${k.name}: ${k.display} ${k.met ? '✓' : '✗'}`);
  }

  console.log('\n✨ 用户旅程测试完了！\n');
}

main().catch(e => { console.error('❌ Failed:', e.message); process.exit(1); });
