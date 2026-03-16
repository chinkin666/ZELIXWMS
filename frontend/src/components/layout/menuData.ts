export interface SubMenuItem {
  readonly label: string
  readonly to: string
}

export interface SubMenuGroup {
  readonly groupLabel: string
  readonly items: SubMenuItem[]
}

// 主菜单: 仓库业务流程顺序 / メインメニュー: 倉庫業務フロー順
export const wmsMenuItems: Array<{ label: string; to: string }> = [
  { label: '商品管理', to: '/products' },
  { label: '耗材管理', to: '/materials' },
  { label: '入庫管理', to: '/inbound' },
  { label: '通過型受付', to: '/passthrough' },
  { label: '在庫管理', to: '/inventory' },
  { label: '出荷管理', to: '/shipment' },
  { label: 'FBA管理', to: '/fba' },
  { label: 'RSL管理', to: '/rsl' },
  { label: '返品管理', to: '/returns' },
  { label: '棚卸管理', to: '/stocktaking' },
  { label: 'セット組管理', to: '/set-products' },
  { label: '倉庫オペレーション', to: '/warehouse-ops' },
  { label: '日次管理', to: '/daily' },
  { label: '業績レポート', to: '/reports' },
  { label: '請求管理', to: '/billing' },
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

// 設定サイドバー / 设置侧边栏
// 整理済み: 頻度別4グループ、名称統一
// 已整理: 按使用频率分4组，名称统一
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
  {
    groupLabel: '拡張・開発',
    items: [
      { label: 'ルールエンジン', to: '/settings/rules' },
      { label: 'Webhook', to: '/settings/webhooks' },
      { label: 'プラグイン', to: '/settings/plugins' },
      { label: 'スクリプト', to: '/settings/scripts' },
      { label: 'カスタムフィールド', to: '/settings/custom-fields' },
      { label: 'フィーチャーフラグ', to: '/settings/feature-flags' },
    ],
  },
  {
    groupLabel: '管理・ログ',
    items: [
      { label: 'テナント管理', to: '/settings/tenants' },
      { label: 'スケジュール', to: '/settings/wms-schedules' },
      { label: '操作ログ', to: '/settings/operation-logs' },
      { label: 'API連携ログ', to: '/settings/api-logs' },
    ],
  },
]

// 各セクションのサブメニュー / 各模块子菜单
export const subMenuMap: Record<string, SubMenuItem[]> = {
  '/products': [
    { label: '商品一覧', to: '/products/list' },
    { label: 'バーコード管理', to: '/products/barcodes' },
    { label: '出荷統計', to: '/products/shipment-stats' },
  ],
  '/materials': [
    { label: '耗材一覧', to: '/materials/list' },
  ],
  '/set-products': [
    { label: 'セット組一覧', to: '/set-products/list' },
    { label: 'セット組制作指示', to: '/set-products/assembly' },
    { label: '指示履歴', to: '/set-products/history' },
  ],
  '/shipment': [
    { label: '出荷指示作成', to: '/shipment/orders/create' },
    { label: '出荷作業一覧', to: '/shipment/operations/tasks' },
    { label: '出荷一覧', to: '/shipment/operations/list' },
    { label: '1-1検品', to: '/shipment/operations/one-by-one/inspection' },
    { label: 'N-1検品', to: '/shipment/operations/n-by-one/inspection' },
    { label: '出荷実績', to: '/shipment/results' },
  ],
  '/passthrough': passthroughSubMenu,
  '/inbound': [
    { label: 'ダッシュボード', to: '/inbound/dashboard' },
    { label: '入庫指示一覧', to: '/inbound/orders' },
    { label: '入庫指示作成', to: '/inbound/create' },
    { label: 'CSV取込', to: '/inbound/import' },
    { label: '入庫履歴', to: '/inbound/history' },
  ],
  '/inventory': [
    { label: '在庫ダッシュボード', to: '/inventory/ledger' },
    { label: '在庫一覧', to: '/inventory/stock' },
    { label: '入出庫履歴', to: '/inventory/movements' },
    { label: '在庫調整', to: '/inventory/adjustments' },
    { label: 'ロット管理', to: '/inventory/lots' },
    { label: '賞味期限アラート', to: '/inventory/expiry-alerts' },
    { label: 'ロケーション', to: '/inventory/locations' },
  ],
  '/stocktaking': [
    { label: '棚卸一覧', to: '/stocktaking/list' },
    { label: '棚卸作成', to: '/stocktaking/create' },
  ],
  '/fba': [
    { label: 'FBAプラン一覧', to: '/fba/plans' },
    { label: 'FBAプラン作成', to: '/fba/plans/create' },
  ],
  '/rsl': [
    { label: 'RSLプラン一覧', to: '/rsl/plans' },
    { label: 'RSLプラン作成', to: '/rsl/plans/create' },
  ],
  '/returns': [
    { label: 'ダッシュボード', to: '/returns/dashboard' },
    { label: '返品一覧', to: '/returns/list' },
    { label: '返品作成', to: '/returns/create' },
  ],
  '/warehouse-ops': [
    { label: 'タスクダッシュボード', to: '/warehouse-ops/tasks' },
    { label: 'ウェーブ管理', to: '/warehouse-ops/waves' },
    { label: 'シリアル番号', to: '/warehouse-ops/serial-numbers' },
  ],
  '/daily': [
    { label: '日次レポート', to: '/daily/list' },
    { label: '出荷統計', to: '/daily/statistics' },
  ],
  '/billing': [
    { label: 'ダッシュボード', to: '/billing/dashboard' },
    { label: '月次請求', to: '/billing/monthly' },
    { label: '作業チャージ', to: '/billing/charges' },
  ],
  '/settings': settingsGroups.flatMap((g) => g.items),
}
