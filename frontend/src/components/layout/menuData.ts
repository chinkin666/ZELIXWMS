export interface SubMenuItem {
  readonly label: string
  readonly to: string
}

export interface SubMenuGroup {
  readonly groupLabel: string
  readonly items: SubMenuItem[]
}

// 主菜单: 整合後10項目 / メインメニュー: 統合後10項目
// 16→10: 耗材→商品, 通過型→入庫, FBA/RSL→出荷, セット組→商品, 倉庫オペ→在庫, 業績→日次
export const wmsMenuItems: Array<{ label: string; to: string }> = [
  { label: '商品管理', to: '/products' },
  { label: '入庫管理', to: '/inbound' },
  { label: '在庫管理', to: '/inventory' },
  { label: '出荷管理', to: '/shipment' },
  { label: '返品管理', to: '/returns' },
  { label: '棚卸管理', to: '/stocktaking' },
  { label: '日次管理', to: '/daily' },
  { label: '請求管理', to: '/billing' },
  { label: '管理者', to: '/manager' },
  { label: '設定', to: '/settings' },
]

// 通過型サブメニュー / 通过型子菜单
export const passthroughSubMenu: SubMenuItem[] = [
  { label: '受付スキャン', to: '/passthrough/receive' },
  { label: '作業タスク', to: '/passthrough/tasks' },
  { label: '出荷マッチング', to: '/passthrough/ship' },
  { label: '暫存エリア', to: '/passthrough/staging' },
  { label: 'ラベル貼付', to: '/passthrough/labeling' },
  { label: '異常報告', to: '/passthrough/exceptions' },
]

// ============================================================
// 設定サイドバー / 设置侧边栏
// 整理済み: 頻度別4グループ、名称統一
// 已整理: 按使用频率分4组，名称统一
// ============================================================
export const settingsGroups: SubMenuGroup[] = [
  {
    groupLabel: '基本設定',
    items: [
      { label: 'システム設定', to: '/settings/basic' },
      { label: '詳細設定', to: '/settings/system' },
      { label: 'ユーザー管理', to: '/settings/users' },
      { label: '倉庫管理', to: '/settings/warehouses' },
    ],
  },
  {
    groupLabel: '出荷・配送',
    items: [
      { label: '依頼主（発送元）', to: '/settings/orderSourceCompany' },
      { label: '配送業者', to: '/settings/carrier' },
      { label: '配送自動化', to: '/settings/carrier-automation' },
      { label: '佐川急便', to: '/settings/sagawa' },
      { label: '日本郵便', to: '/settings/japan-post' },
      { label: '西濃運輸', to: '/settings/seino' },
      { label: '出荷グループ', to: '/settings/order-groups' },
      { label: '自動処理ルール', to: '/settings/auto-processing' },
      { label: 'メールテンプレート', to: '/settings/email-templates' },
      { label: '梱包ルール', to: '/settings/packing-rules' },
    ],
  },
  {
    groupLabel: 'マスタ・料金',
    items: [
      { label: '得意先（配送先）', to: '/settings/customers' },
      { label: '荷主（3PL委託元）', to: '/settings/clients' },
      { label: '仕入先', to: '/settings/suppliers' },
      { label: '在庫区分', to: '/settings/inventory-categories' },
      { label: '運賃設定', to: '/settings/shipping-rates' },
      { label: 'サービス料金', to: '/settings/service-rates' },
    ],
  },
  {
    groupLabel: 'テンプレート・印刷',
    items: [
      { label: 'ファイルレイアウト', to: '/settings/mapping-patterns' },
      { label: '送り状テンプレート', to: '/settings/print-templates' },
      { label: '帳票テンプレート', to: '/settings/form-templates' },
      { label: 'プリンター', to: '/settings/printer' },
    ],
  },
  // ============================================================
  // [HIDDEN] 拡張・開発 — 2026-03-23 非表示
  // 理由: 上線初期は不要。ルート・コンポーネントは保持。
  // 原因: 上线初期不需要。路由和组件保留。
  // 復元方法: このコメントブロックを解除するだけ
  // 恢复方法: 取消注释即可
  // ============================================================
  // {
  //   groupLabel: '拡張・開発',
  //   items: [
  //     { label: 'ルールエンジン', to: '/settings/rules' },
  //     { label: 'Webhook', to: '/settings/webhooks' },
  //     { label: 'プラグイン', to: '/settings/plugins' },
  //     { label: 'スクリプト', to: '/settings/scripts' },
  //     { label: 'カスタムフィールド', to: '/settings/custom-fields' },
  //     { label: 'フィーチャーフラグ', to: '/settings/feature-flags' },
  //   ],
  // },
  {
    groupLabel: '管理・ログ',
    items: [
      // [HIDDEN] テナント管理 — マルチテナント運用開始時に復元
      // [隐藏] 租户管理 — 多租户运营时恢复
      // { label: 'テナント管理', to: '/settings/tenants' },
      { label: 'スケジュール', to: '/settings/wms-schedules' },
      { label: '操作ログ', to: '/settings/operation-logs' },
      { label: 'API連携ログ', to: '/settings/api-logs' },
    ],
  },
]

// ============================================================
// 各セクションのサブメニュー / 各模块子菜单
// 整合: 耗材→商品, 通過型→入庫, FBA/RSL→出荷, セット組→商品, 倉庫オペ→在庫, 業績→日次
// ============================================================
export const subMenuMap: Record<string, SubMenuItem[]> = {
  // 商品管理 ← 耗材 + セット組 / 商品管理 ← 耗材 + 套装
  '/products': [
    { label: '商品一覧', to: '/products/list' },
    { label: 'バーコード管理', to: '/products/barcodes' },
    { label: '耗材管理', to: '/materials/list' },
    { label: 'セット組', to: '/set-products/list' },
    { label: '出荷統計', to: '/products/shipment-stats' },
  ],
  // 入庫管理 ← 通過型受付 / 入库管理 ← 通过型受付
  '/inbound': [
    { label: 'ワークステーション', to: '/inbound/workstation' },
    { label: 'ダッシュボード', to: '/inbound/dashboard' },
    { label: '入庫指示一覧', to: '/inbound/orders' },
    { label: '入庫指示作成', to: '/inbound/create' },
    { label: 'CSV取込', to: '/inbound/import' },
    { label: '入庫履歴', to: '/inbound/history' },
    // [HIDDEN] サイズ登録 — 初期は不要 / 尺寸登记 — 初期不需要
    // { label: 'サイズ登録', to: '/inbound/sizes' },
    { label: '入庫請求', to: '/inbound/billing' },
    { label: '通過型受付', to: '/passthrough/receive' },
    { label: '写真登録', to: '/inbound/photos' },
  ],
  // 在庫管理 ← 倉庫オペレーション / 库存管理 ← 仓库作业
  '/inventory': [
    { label: '在庫一覧', to: '/inventory/stock' },
    { label: '在庫調整', to: '/inventory/adjustments' },
    { label: '在庫移動', to: '/inventory/transfer' },
    { label: '入出庫履歴', to: '/inventory/movements' },
    { label: 'ロット管理', to: '/inventory/lots' },
    { label: '賞味期限アラート', to: '/inventory/expiry-alerts' },
    { label: 'ロケーション', to: '/inventory/locations' },
    { label: '補充管理（定点割れ）', to: '/inventory/low-stock-alerts' },
    // [HIDDEN] 補充承認 — ワークフロー連携時に復元 / 补货审批 — 工作流对接时恢复
    // { label: '補充承認', to: '/inventory/replenishment-approval' },
    { label: '受払一覧', to: '/inventory/ledger-view' },
    { label: '在庫ダッシュボード', to: '/inventory/ledger' },
    { label: '庫内作業', to: '/warehouse-ops/tasks' },
    { label: '欠品管理', to: '/inventory/shortage-records' },
    { label: '棚卸差異', to: '/inventory/stocktaking-discrepancies' },
  ],
  // 出荷管理 ← FBA + RSL / 出荷管理 ← FBA + RSL
  '/shipment': [
    { label: 'ワークステーション', to: '/shipment/workstation' },
    { label: '出荷処理', to: '/shipment/operations/tasks' },
    { label: '検品', to: '/shipment/operations/one-by-one/inspection' },
    { label: 'ピッキング', to: '/shipment/picking-list' },
    { label: '出荷指示作成', to: '/shipment/orders/create' },
    { label: '出荷一覧', to: '/shipment/operations/list' },
    { label: '出荷実績', to: '/shipment/results' },
    { label: '出荷停止', to: '/shipment/stop' },
    { label: '送り状再発行', to: '/shipment/label-reissue' },
  ],
  '/returns': [
    { label: 'ダッシュボード', to: '/returns/dashboard' },
    { label: '返品一覧', to: '/returns/list' },
    { label: '返品作成', to: '/returns/create' },
    { label: '返品請求', to: '/returns/billing' },
  ],
  '/stocktaking': [
    { label: '棚卸一覧', to: '/stocktaking/list' },
    { label: '棚卸作成', to: '/stocktaking/create' },
  ],
  // 日次管理 ← 業績レポート / 日次管理 ← 业绩报表
  '/daily': [
    { label: '日次レポート', to: '/daily/list' },
    { label: '出荷統計', to: '/daily/statistics' },
    { label: '業績レポート', to: '/reports' },
  ],
  '/billing': [
    { label: 'ダッシュボード', to: '/billing/dashboard' },
    { label: '月次請求', to: '/billing/monthly' },
    { label: '作業チャージ', to: '/billing/charges' },
    { label: '保管料', to: '/billing/storage' },
  ],
  // 管理者ダッシュボード / 管理者仪表盘
  '/manager': [
    { label: '管理者ダッシュボード', to: '/manager/dashboard' },
    { label: '業績レポート', to: '/reports' },
    { label: '日次レポート', to: '/daily/list' },
    // [HIDDEN] ピークモード — 繁忙期運用確立後に復元 / 高峰模式 — 繁忙期运营确立后恢复
    // { label: 'ピークモード', to: '/settings/peak-mode' },
  ],
  '/settings': settingsGroups.flatMap((g) => g.items),
  // 旧メニューの互換ルーティング（子ページから親メニューへのハイライト用）
  // 旧菜单兼容路由（子页面→父菜单高亮）
  '/materials': [{ label: '耗材管理', to: '/materials/list' }],
  '/set-products': [
    { label: 'セット組一覧', to: '/set-products/list' },
    { label: 'セット組制作指示', to: '/set-products/assembly' },
    { label: '指示履歴', to: '/set-products/history' },
  ],
  '/passthrough': passthroughSubMenu,
  // [HIDDEN] FBA/RSL — Amazon連携開始時に復元 / FBA/RSL — Amazon对接时恢复
  // '/fba': [
  //   { label: 'FBAプラン一覧', to: '/fba/plans' },
  //   { label: 'FBAプラン作成', to: '/fba/plans/create' },
  // ],
  // '/rsl': [
  //   { label: 'RSLプラン一覧', to: '/rsl/plans' },
  //   { label: 'RSLプラン作成', to: '/rsl/plans/create' },
  // ],
  // [HIDDEN] 倉庫オペ詳細 — 在庫管理に統合済み、個別メニュー不要
  // [隐藏] 仓库作业详细 — 已整合到库存管理，不需要单独菜单
  // '/warehouse-ops': [
  //   { label: 'タスクダッシュボード', to: '/warehouse-ops/tasks' },
  //   { label: 'ウェーブ管理', to: '/warehouse-ops/waves' },
  //   { label: 'シリアル番号', to: '/warehouse-ops/serial-numbers' },
  //   { label: 'セット組み作業', to: '/warehouse-ops/assembly-orders' },
  // ],
}
