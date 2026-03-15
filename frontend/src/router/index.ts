import { createRouter, createWebHistory } from 'vue-router'
import WmsLayout from '@/layouts/WmsLayout.vue'
import Welcome from '@/views/Welcome.vue'

// ルートメタ型拡張 / Route meta type augmentation
declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    title?: string
    parentRoute?: string
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/inbound/print/inspection/:id',
      name: 'InboundInspectionSheet',
      component: () => import('@/views/inbound/InboundInspectionSheet.vue'),
      meta: { title: '入荷検品表' },
    },
    {
      path: '/inbound/print/kanban/:id',
      name: 'InboundKanban',
      component: () => import('@/views/inbound/InboundKanban.vue'),
      meta: { title: '入荷看板' },
    },
    {
      path: '/inbound/print/barcode/:id',
      name: 'InboundBarcode',
      component: () => import('@/views/inbound/InboundBarcode.vue'),
      meta: { title: 'バーコード印刷' },
    },
    {
      path: '/',
      component: WmsLayout,
      redirect: '/home',
      children: [
        {
          path: 'home',
          name: 'Welcome',
          component: Welcome,
          meta: { title: 'ホーム' },
        },
        {
          path: 'products',
          meta: { title: '商品管理', requiresAuth: true },
          redirect: '/products/list',
          children: [
            {
              path: 'list',
              name: 'ProductSettings',
              component: () => import('@/views/settings/ProductSettings.vue'),
              meta: { title: '商品設定', requiresAuth: true },
            },
            {
              path: 'barcodes',
              name: 'BarcodeManagement',
              component: () => import('@/views/settings/BarcodeManagement.vue'),
              meta: { title: 'バーコード管理', requiresAuth: true },
            },
            {
              path: 'shipment-stats',
              name: 'ProductShipmentStats',
              component: () => import('@/views/products/ProductShipmentStats.vue'),
              meta: { title: '出荷統計', requiresAuth: true },
            },
          ],
        },
        {
          path: 'set-products',
          meta: { title: 'セット組管理', requiresAuth: true },
          redirect: '/set-products/list',
          children: [
            {
              path: 'list',
              name: 'SetProductList',
              component: () => import('@/views/set-products/SetProductList.vue'),
              meta: { title: 'セット組一覧', requiresAuth: true },
            },
            {
              path: 'assembly',
              name: 'SetAssembly',
              component: () => import('@/views/set-products/SetAssembly.vue'),
              meta: { title: 'セット組制作指示', requiresAuth: true },
            },
            {
              path: 'history',
              name: 'SetOrderHistory',
              component: () => import('@/views/set-products/SetOrderHistory.vue'),
              meta: { title: 'セット組指示履歴', requiresAuth: true },
            },
          ],
        },
        // === 出荷管理（统一）/ 出荷管理（統合） ===
        {
          path: 'shipment',
          meta: { title: '出荷管理', requiresAuth: true },
          redirect: '/shipment/orders/create',
          children: [
            // 出荷指示 / 出荷指示
            {
              path: 'orders/create',
              name: 'ShipmentOrderCreate',
              component: () => import('@/views/shipment-orders/ShipmentOrderCreate.vue'),
              meta: { title: '出荷指示作成', requiresAuth: true },
            },
            {
              path: 'orders/create-v2',
              name: 'ShipmentOrderCreateV2',
              component: () => import('@/modules/shipment/pages/ShipmentOrderCreatePage.vue'),
              meta: { title: '出荷指示作成 V2', requiresAuth: true },
            },
            // 出荷作業 / 出荷作業
            {
              path: 'operations/tasks',
              name: 'ShipmentList',
              component: () => import('@/views/shipment-operations/ShipmentList.vue'),
              meta: { title: '出荷作業一覧', requiresAuth: true },
            },
            {
              path: 'operations/list',
              name: 'ShipmentOperationsList',
              component: () => import('@/views/shipment-operations/ShipmentOperationsList.vue'),
              meta: { title: '出荷一覧', requiresAuth: true },
            },
            {
              path: 'operations/one-by-one/inspection',
              name: 'OneByOneInspection',
              component: () => import('@/views/shipment-operations/OneByOneInspection.vue'),
              meta: { title: '1-1検品', requiresAuth: true },
            },
            {
              path: 'operations/n-by-one/inspection',
              name: 'OneProductInspection',
              component: () => import('@/views/shipment-operations/OneProductInspection.vue'),
              meta: { title: 'N-1検品', requiresAuth: true },
            },
            // 出荷実績 / 出荷実績
            {
              path: 'results',
              name: 'ShipmentResults',
              component: () => import('@/views/shipment-results/ShipmentResults.vue'),
              meta: { title: '出荷実績', requiresAuth: true },
            },
          ],
        },
        // === 旧路径重定向（向后兼容）/ 旧パスリダイレクト（後方互換） ===
        { path: 'shipment-orders', redirect: '/shipment/orders/create' },
        { path: 'shipment-orders/create', redirect: '/shipment/orders/create' },
        { path: 'shipment-operations', redirect: '/shipment/operations/tasks' },
        { path: 'shipment-operations/tasks', redirect: '/shipment/operations/tasks' },
        { path: 'shipment-operations/list', redirect: '/shipment/operations/list' },
        { path: 'shipment-operations/one-by-one/inspection', redirect: '/shipment/operations/one-by-one/inspection' },
        { path: 'shipment-operations/n-by-one/inspection', redirect: '/shipment/operations/n-by-one/inspection' },
        { path: 'shipment-results', redirect: '/shipment/results' },
        {
          path: 'inbound',
          meta: { title: '入庫管理', requiresAuth: true },
          redirect: '/inbound/dashboard',
          children: [
            {
              path: 'dashboard',
              name: 'InboundDashboard',
              component: () => import('@/views/inbound/InboundDashboard.vue'),
              meta: { title: '入庫ダッシュボード', requiresAuth: true },
            },
            {
              path: 'orders',
              name: 'InboundOrderList',
              component: () => import('@/views/inbound/InboundOrderList.vue'),
              meta: { title: '入庫指示一覧', requiresAuth: true },
            },
            {
              path: 'create',
              name: 'InboundOrderCreate',
              component: () => import('@/views/inbound/InboundOrderCreate.vue'),
              meta: { title: '入庫指示作成', requiresAuth: true },
            },
            {
              path: 'receive/:id',
              name: 'InboundReceive',
              component: () => import('@/views/inbound/InboundReceive.vue'),
              meta: { title: '入庫検品', requiresAuth: true },
            },
            {
              path: 'putaway/:id',
              name: 'InboundPutaway',
              component: () => import('@/views/inbound/InboundPutaway.vue'),
              meta: { title: '棚入れ', requiresAuth: true },
            },
            {
              path: 'history',
              name: 'InboundHistory',
              component: () => import('@/views/inbound/InboundHistory.vue'),
              meta: { title: '入庫実績', requiresAuth: true },
            },
            {
              path: 'import',
              name: 'InboundImport',
              component: () => import('@/views/inbound/InboundImport.vue'),
              meta: { title: 'CSV取込', requiresAuth: true },
            },
          ],
        },
        {
          path: 'inventory',
          meta: { title: '在庫管理', requiresAuth: true },
          redirect: '/inventory/stock',
          children: [
            {
              path: 'stock',
              name: 'InventoryStock',
              component: () => import('@/views/inventory/InventoryStock.vue'),
              meta: { title: '在庫一覧', requiresAuth: true },
            },
            {
              path: 'movements',
              name: 'InventoryMovements',
              component: () => import('@/views/inventory/InventoryMovements.vue'),
              meta: { title: '入出庫履歴', requiresAuth: true },
            },
            {
              path: 'adjustments',
              name: 'InventoryAdjustments',
              component: () => import('@/views/inventory/InventoryAdjustments.vue'),
              meta: { title: '在庫調整', requiresAuth: true },
            },
            {
              path: 'lots',
              name: 'LotManagement',
              component: () => import('@/views/inventory/LotManagement.vue'),
              meta: { title: 'ロット管理', requiresAuth: true },
            },
            {
              path: 'expiry-alerts',
              name: 'ExpiryAlerts',
              component: () => import('@/views/inventory/ExpiryAlerts.vue'),
              meta: { title: '賞味期限アラート', requiresAuth: true },
            },
            {
              path: 'locations',
              name: 'LocationSettings',
              component: () => import('@/views/inventory/LocationSettings.vue'),
              meta: { title: 'ロケーション管理', requiresAuth: true },
            },
            {
              path: 'ledger',
              name: 'InventoryLedgerDashboard',
              component: () => import('@/views/inventory/InventoryLedgerDashboard.vue'),
              meta: { title: '在庫台帳ダッシュボード', requiresAuth: true },
            },
          ],
        },
        {
          path: 'stocktaking',
          meta: { title: '棚卸管理', requiresAuth: true },
          redirect: '/stocktaking/list',
          children: [
            {
              path: 'list',
              name: 'StocktakingList',
              component: () => import('@/views/stocktaking/StocktakingList.vue'),
              meta: { title: '棚卸一覧', requiresAuth: true },
            },
            {
              path: 'create',
              name: 'StocktakingCreate',
              component: () => import('@/views/stocktaking/StocktakingCreate.vue'),
              meta: { title: '棚卸作成', requiresAuth: true },
            },
            {
              path: ':id',
              name: 'StocktakingDetail',
              component: () => import('@/views/stocktaking/StocktakingDetail.vue'),
              meta: { title: '棚卸詳細', requiresAuth: true },
            },
          ],
        },
        {
          path: 'returns',
          meta: { title: '返品管理', requiresAuth: true },
          redirect: '/returns/dashboard',
          children: [
            {
              path: 'dashboard',
              name: 'ReturnDashboard',
              component: () => import('@/views/returns/ReturnDashboard.vue'),
              meta: { title: '返品ダッシュボード', requiresAuth: true },
            },
            {
              path: 'list',
              name: 'ReturnOrderList',
              component: () => import('@/views/returns/ReturnOrderList.vue'),
              meta: { title: '返品一覧', requiresAuth: true },
            },
            {
              path: 'create',
              name: 'ReturnOrderCreate',
              component: () => import('@/views/returns/ReturnOrderCreate.vue'),
              meta: { title: '返品作成', requiresAuth: true },
            },
            {
              path: ':id',
              name: 'ReturnOrderDetail',
              component: () => import('@/views/returns/ReturnOrderDetail.vue'),
              meta: { title: '返品詳細', requiresAuth: true },
            },
          ],
        },
        {
          path: 'warehouse-ops',
          meta: { title: '倉庫オペレーション', requiresAuth: true },
          redirect: '/warehouse-ops/tasks',
          children: [
            {
              path: 'tasks',
              name: 'TaskDashboard',
              component: () => import('@/views/warehouse/TaskDashboard.vue'),
              meta: { title: 'タスクダッシュボード', requiresAuth: true },
            },
            {
              path: 'waves',
              name: 'WaveManagement',
              component: () => import('@/views/warehouse/WaveManagement.vue'),
              meta: { title: 'ウェーブ管理', requiresAuth: true },
            },
            {
              path: 'serial-numbers',
              name: 'SerialNumberTracking',
              component: () => import('@/views/warehouse/SerialNumberTracking.vue'),
              meta: { title: 'シリアル番号管理', requiresAuth: true },
            },
          ],
        },
        // === 請求管理 / 請求管理 ===
        {
          path: 'billing',
          meta: { title: '請求管理', requiresAuth: true },
          redirect: '/billing/dashboard',
          children: [
            {
              path: 'dashboard',
              name: 'BillingDashboard',
              component: () => import('@/views/billing/BillingDashboard.vue'),
              meta: { title: '請求ダッシュボード', requiresAuth: true },
            },
            {
              path: 'monthly',
              name: 'BillingMonthly',
              component: () => import('@/views/billing/BillingMonthly.vue'),
              meta: { title: '月次請求', requiresAuth: true },
            },
          ],
        },
        {
          path: 'daily',
          meta: { title: '日次管理', requiresAuth: true },
          redirect: '/daily/list',
          children: [
            {
              path: 'list',
              name: 'DailyReportList',
              component: () => import('@/views/daily/DailyReportList.vue'),
              meta: { title: '日次レポート', requiresAuth: true },
            },
            {
              path: 'statistics',
              name: 'ShipmentStatistics',
              component: () => import('@/views/daily/ShipmentStatistics.vue'),
              meta: { title: '出荷統計', requiresAuth: true },
            },
            {
              path: ':date',
              name: 'DailyReportDetail',
              component: () => import('@/views/daily/DailyReportDetail.vue'),
              meta: { title: '日次レポート詳細', requiresAuth: true },
            },
          ],
        },
        {
          path: 'settings',
          meta: { title: '設定', requiresAuth: true },
          redirect: '/settings/basic',
          children: [
            {
              path: 'basic',
              name: 'BasicSettings',
              component: () => import('@/views/settings/BasicSettings.vue'),
              meta: { title: '基本設定', requiresAuth: true },
            },
            {
              path: 'orderSourceCompany',
              name: 'OrderSourceCompany',
              component: () => import('@/views/settings/OrderSourceCompany.vue'),
              meta: { title: 'ご依頼主設定', requiresAuth: true },
            },
            {
              path: 'carrier',
              name: 'CarrierSettings',
              component: () => import('@/views/settings/CarrierSettings.vue'),
              meta: { title: '配送業者設定', requiresAuth: true },
            },
            {
              path: 'mapping-patterns',
              name: 'MappingPatterns',
              component: () => import('@/views/settings/MappingPatterns.vue'),
              meta: { title: 'ファイルレイアウト管理', requiresAuth: true },
            },
            {
              path: 'mapping-patterns/new',
              name: 'MappingPatternsNew',
              component: () => import('@/views/settings/MappingPatternNew.vue'),
              meta: { title: 'ファイルレイアウト作成', requiresAuth: true, parentRoute: 'MappingPatterns' },
            },
            {
              path: 'mapping-patterns/edit/:id',
              name: 'MappingPatternsEdit',
              component: () => import('@/views/settings/MappingPatternNew.vue'),
              meta: { title: 'ファイルレイアウト編集', requiresAuth: true, parentRoute: 'MappingPatterns' },
            },
            {
              path: 'print-templates',
              name: 'PrintTemplateSettings',
              component: () => import('@/views/settings/PrintTemplateSettings.vue'),
              meta: { title: '印刷テンプレート', requiresAuth: true },
            },
            {
              path: 'print-templates/:id',
              name: 'PrintTemplateEditor',
              component: () => import('@/views/settings/PrintTemplateEditor.vue'),
              meta: { title: '印刷テンプレート編集', requiresAuth: true },
            },
            {
              path: 'printer',
              name: 'PrinterSettings',
              component: () => import('@/views/settings/PrinterSettings.vue'),
              meta: { title: 'プリンター設定', requiresAuth: true },
            },
            {
              path: 'form-templates',
              name: 'FormTemplateSettings',
              component: () => import('@/views/settings/FormTemplateSettings.vue'),
              meta: { title: '帳票テンプレート', requiresAuth: true },
            },
            {
              path: 'form-templates/:id',
              name: 'FormTemplateEditor',
              component: () => import('@/views/settings/FormTemplateEditor.vue'),
              meta: { title: '帳票テンプレート編集', requiresAuth: true },
            },
            {
              path: 'carrier-automation',
              name: 'CarrierAutomationSettings',
              component: () => import('@/views/settings/CarrierAutomationSettings.vue'),
              meta: { title: '配送業者自動化設定', requiresAuth: true },
            },
            {
              path: 'sagawa',
              name: 'sagawa-settings',
              component: () => import('@/views/settings/SagawaSettings.vue'),
              meta: { title: '佐川急便 e飛伝Ⅲ連携', requiresAuth: true },
            },
            {
              path: 'order-groups',
              name: 'OrderGroupSettings',
              component: () => import('@/views/settings/OrderGroupSettings.vue'),
              meta: { title: '出荷グループ設定', requiresAuth: true },
            },
            {
              path: 'auto-processing',
              name: 'AutoProcessingSettings',
              component: () => import('@/views/settings/AutoProcessingSettings.vue'),
              meta: { title: '自動処理設定', requiresAuth: true },
            },
            {
              path: 'email-templates',
              name: 'EmailTemplateSettings',
              component: () => import('@/views/settings/EmailTemplateSettings.vue'),
              meta: { title: '出荷メール設定', requiresAuth: true },
            },
            {
              path: 'inventory-categories',
              name: 'InventoryCategorySettings',
              component: () => import('@/views/settings/InventoryCategorySettings.vue'),
              meta: { title: '在庫区分一覧', requiresAuth: true },
            },
            {
              path: 'suppliers',
              name: 'SupplierSettings',
              component: () => import('@/views/settings/SupplierSettings.vue'),
              meta: { title: '仕入先一覧', requiresAuth: true },
            },
            {
              path: 'shipping-rates',
              name: 'ShippingRateSettings',
              component: () => import('@/views/settings/ShippingRateSettings.vue'),
              meta: { title: '運賃マスタ', requiresAuth: true },
            },
            {
              path: 'operation-logs',
              name: 'OperationLogView',
              component: () => import('@/views/settings/OperationLogView.vue'),
              meta: { title: 'WMS操作ログ', requiresAuth: true },
            },
            {
              path: 'api-logs',
              name: 'ApiLogView',
              component: () => import('@/views/settings/ApiLogView.vue'),
              meta: { title: 'API連携ログ', requiresAuth: true },
            },
            {
              path: 'customers',
              name: 'CustomerSettings',
              component: () => import('@/views/settings/CustomerSettings.vue'),
              meta: { title: '得意先一覧', requiresAuth: true },
            },
            {
              path: 'clients',
              name: 'ClientSettings',
              component: () => import('@/views/settings/ClientSettings.vue'),
              meta: { title: '顧客一覧（3PL荷主）', requiresAuth: true },
            },
            {
              path: 'warehouses',
              name: 'WarehouseSettings',
              component: () => import('@/views/settings/WarehouseSettings.vue'),
              meta: { title: '倉庫管理', requiresAuth: true },
            },
            {
              path: 'wms-schedules',
              name: 'WmsScheduleView',
              component: () => import('@/views/settings/WmsScheduleView.vue'),
              meta: { title: 'WMSスケジュール', requiresAuth: true },
            },
            {
              path: 'rules',
              name: 'RuleSettings',
              component: () => import('@/views/settings/RuleSettings.vue'),
              meta: { title: 'ルール設定', requiresAuth: true },
            },
            {
              path: 'tenants',
              name: 'TenantSettings',
              component: () => import('@/views/settings/TenantSettings.vue'),
              meta: { title: 'テナント管理', requiresAuth: true },
            },
            {
              path: 'webhooks',
              name: 'WebhookSettings',
              component: () => import('@/views/settings/WebhookSettings.vue'),
              meta: { title: 'Webhook 管理', requiresAuth: true },
            },
            {
              path: 'plugins',
              name: 'PluginManagement',
              component: () => import('@/views/settings/PluginManagement.vue'),
              meta: { title: 'プラグイン管理', requiresAuth: true },
            },
            {
              path: 'scripts',
              name: 'ScriptEditor',
              component: () => import('@/views/settings/ScriptEditor.vue'),
              meta: { title: '自動化スクリプト', requiresAuth: true },
            },
            {
              path: 'custom-fields',
              name: 'CustomFieldSettings',
              component: () => import('@/views/settings/CustomFieldSettings.vue'),
              meta: { title: 'カスタムフィールド', requiresAuth: true },
            },
            {
              path: 'feature-flags',
              name: 'FeatureFlagSettings',
              component: () => import('@/views/settings/FeatureFlagSettings.vue'),
              meta: { title: 'フィーチャーフラグ', requiresAuth: true },
            },
            {
              path: 'system',
              name: 'SystemSettings',
              component: () => import('@/views/settings/SystemSettings.vue'),
              meta: { title: '応用設定', requiresAuth: true },
            },
          ],
        },
      ],
    },
    // 404 キャッチオール / 404 catch-all route
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      component: () => import('@/views/NotFound.vue'),
      meta: { title: 'ページが見つかりません' },
    },
  ],
})

// ── ナビゲーションガード / Navigation guard ──────────────────────────────────
// 認証が必要なルートへのアクセスを制御 / Controls access to routes requiring authentication
// 現在はモック認証のため、トークンの存在のみチェック / Currently lenient — only checks token existence
router.beforeEach((to, _from, next) => {
  // TODO: ログインページ実装後に認証ガードを有効化する
  // 現在はモック認証のためスキップ
  next()
})

// 页面标题动态更新 / ページタイトル動的更新
router.afterEach((to) => {
  const title = to.meta?.title as string | undefined
  document.title = title ? `${title} | ZELIX WMS` : 'ZELIX WMS'
})

export default router
