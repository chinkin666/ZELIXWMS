export interface SubMenuItem {
  readonly label: string
  readonly to: string
}

export interface SubMenuGroup {
  readonly groupLabel: string
  readonly items: SubMenuItem[]
}

export const wmsMenuItems: Array<{ label: string; to: string }> = [
  { label: '入庫管理', to: '/inbound' },
  { label: '在庫管理', to: '/inventory' },
  { label: '商品管理', to: '/products' },
  { label: 'セット組管理', to: '/set-products' },
  { label: '出荷指示', to: '/shipment-orders' },
  { label: '出荷作業', to: '/shipment-operations' },
  { label: '出荷実績', to: '/shipment-results' },
  { label: '棚卸管理', to: '/stocktaking' },
  { label: '返品管理', to: '/returns' },
  { label: '倉庫オペレーション', to: '/warehouse-ops' },
  { label: '日次管理', to: '/daily' },
  { label: '設定管理', to: '/settings' },
]

export const settingsGroups: SubMenuGroup[] = [
  {
    groupLabel: '出荷設定',
    items: [
      { label: '基本設定', to: '/settings/basic' },
      { label: 'ご依頼主設定', to: '/settings/orderSourceCompany' },
      { label: '配送業者設定', to: '/settings/carrier' },
      { label: '配送業者自動化', to: '/settings/carrier-automation' },
      { label: '佐川急便設定', to: '/settings/sagawa' },
      { label: '検品グループ', to: '/settings/order-groups' },
      { label: '自動処理', to: '/settings/auto-processing' },
      { label: '出荷メール設定', to: '/settings/email-templates' },
    ],
  },
  {
    groupLabel: 'テンプレート',
    items: [
      { label: 'ファイルレイアウト', to: '/settings/mapping-patterns' },
      { label: '印刷テンプレート', to: '/settings/print-templates' },
      { label: 'プリンター設定', to: '/settings/printer' },
      { label: '帳票テンプレート', to: '/settings/form-templates' },
    ],
  },
  {
    groupLabel: 'マスタ管理',
    items: [
      { label: '得意先一覧', to: '/settings/customers' },
      { label: '顧客（3PL荷主）', to: '/settings/clients' },
      { label: '倉庫管理', to: '/settings/warehouses' },
      { label: '仕入先一覧', to: '/settings/suppliers' },
      { label: '在庫区分', to: '/settings/inventory-categories' },
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
    groupLabel: 'システム',
    items: [
      { label: 'テナント管理', to: '/settings/tenants' },
      { label: 'ルール設定', to: '/settings/rules' },
      { label: 'WMSスケジュール', to: '/settings/wms-schedules' },
      { label: '応用設定', to: '/settings/system' },
      { label: '操作ログ', to: '/settings/operation-logs' },
      { label: 'API連携ログ', to: '/settings/api-logs' },
    ],
  },
]

export const subMenuMap: Record<string, SubMenuItem[]> = {
  '/products': [
    { label: '商品設定', to: '/products/list' },
    { label: 'バーコード管理', to: '/products/barcodes' },
  ],
  '/set-products': [
    { label: 'セット組一覧', to: '/set-products/list' },
    { label: 'セット組制作指示', to: '/set-products/assembly' },
    { label: '指示履歴', to: '/set-products/history' },
  ],
  '/shipment-orders': [
    { label: '出荷指示作成', to: '/shipment-orders/create' },
  ],
  '/shipment-operations': [
    { label: '出荷作業一覧', to: '/shipment-operations/tasks' },
    { label: '出荷一覧', to: '/shipment-operations/list' },
    { label: '1-1検品', to: '/shipment-operations/one-by-one/inspection' },
    { label: 'N-1検品', to: '/shipment-operations/n-by-one/inspection' },
  ],
  '/shipment-results': [],
  '/inbound': [
    { label: '入庫ダッシュボード', to: '/inbound/dashboard' },
    { label: '入庫指示一覧', to: '/inbound/orders' },
    { label: '入庫指示作成', to: '/inbound/create' },
    { label: 'CSV取込', to: '/inbound/import' },
    { label: '入庫実績', to: '/inbound/history' },
  ],
  '/inventory': [
    { label: '在庫一覧', to: '/inventory/stock' },
    { label: '入出庫履歴', to: '/inventory/movements' },
    { label: '在庫調整', to: '/inventory/adjustments' },
    { label: 'ロット管理', to: '/inventory/lots' },
    { label: '賞味期限アラート', to: '/inventory/expiry-alerts' },
    { label: 'ロケーション', to: '/inventory/locations' },
    { label: '在庫台帳', to: '/inventory/ledger' },
  ],
  '/stocktaking': [
    { label: '棚卸一覧', to: '/stocktaking/list' },
    { label: '棚卸作成', to: '/stocktaking/create' },
  ],
  '/returns': [
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
  ],
  '/settings': settingsGroups.flatMap((g) => g.items),
}
