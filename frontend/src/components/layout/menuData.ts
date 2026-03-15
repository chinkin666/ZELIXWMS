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

// 設定サイドバー / 设置侧边栏
export const settingsGroups: SubMenuGroup[] = [
  {
    groupLabel: '基本・システム',
    items: [
      { label: '基本設定', to: '/settings/basic' },
      { label: '応用設定', to: '/settings/system' },
      { label: 'テナント管理', to: '/settings/tenants' },
      { label: 'WMSスケジュール', to: '/settings/wms-schedules' },
      { label: 'ユーザー管理', to: '/settings/users' },
    ],
  },
  {
    groupLabel: '出荷設定',
    items: [
      { label: 'ご依頼主設定', to: '/settings/orderSourceCompany' },
      { label: '配送業者設定', to: '/settings/carrier' },
      { label: '配送業者自動化', to: '/settings/carrier-automation' },
      { label: '佐川急便設定', to: '/settings/sagawa' },
      { label: '出荷グループ', to: '/settings/order-groups' },
      { label: '自動処理ルール', to: '/settings/auto-processing' },
      { label: '出荷メール設定', to: '/settings/email-templates' },
      { label: '運賃マスタ', to: '/settings/shipping-rates' },
      { label: '料金マスタ', to: '/settings/service-rates' },
      { label: '梱包ルール', to: '/settings/packing-rules' },
    ],
  },
  {
    groupLabel: 'テンプレート・印刷',
    items: [
      { label: 'ファイルレイアウト', to: '/settings/mapping-patterns' },
      { label: '印刷テンプレート', to: '/settings/print-templates' },
      { label: '帳票テンプレート', to: '/settings/form-templates' },
      { label: 'プリンター設定', to: '/settings/printer' },
    ],
  },
  {
    groupLabel: 'マスタ管理',
    items: [
      { label: '得意先一覧', to: '/settings/customers' },
      { label: '顧客（3PL荷主）', to: '/settings/clients' },
      { label: '仕入先一覧', to: '/settings/suppliers' },
      { label: '倉庫管理', to: '/settings/warehouses' },
      { label: '在庫区分', to: '/settings/inventory-categories' },
      { label: 'ルール設定', to: '/settings/rules' },
    ],
  },
  {
    groupLabel: '拡張機能',
    items: [
      { label: 'Webhook', to: '/settings/webhooks' },
      { label: 'プラグイン', to: '/settings/plugins' },
      { label: 'スクリプト', to: '/settings/scripts' },
      { label: 'カスタムフィールド', to: '/settings/custom-fields' },
      { label: 'フィーチャーフラグ', to: '/settings/feature-flags' },
    ],
  },
  {
    groupLabel: 'ログ・監視',
    items: [
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
