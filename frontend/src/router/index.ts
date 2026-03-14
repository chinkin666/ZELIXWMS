import { createRouter, createWebHistory } from 'vue-router'
import WmsLayout from '@/layouts/WmsLayout.vue'
import Welcome from '@/views/Welcome.vue'

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
          meta: { title: '商品管理' },
          redirect: '/products/list',
          children: [
            {
              path: 'list',
              name: 'ProductSettings',
              component: () => import('@/views/settings/ProductSettings.vue'),
              meta: { title: '商品設定' },
            },
            {
              path: 'barcodes',
              name: 'BarcodeManagement',
              component: () => import('@/views/settings/BarcodeManagement.vue'),
              meta: { title: 'バーコード管理' },
            },
          ],
        },
        {
          path: 'set-products',
          meta: { title: 'セット組管理' },
          redirect: '/set-products/list',
          children: [
            {
              path: 'list',
              name: 'SetProductList',
              component: () => import('@/views/set-products/SetProductList.vue'),
              meta: { title: 'セット組一覧' },
            },
            {
              path: 'assembly',
              name: 'SetAssembly',
              component: () => import('@/views/set-products/SetAssembly.vue'),
              meta: { title: 'セット組制作指示' },
            },
            {
              path: 'history',
              name: 'SetOrderHistory',
              component: () => import('@/views/set-products/SetOrderHistory.vue'),
              meta: { title: 'セット組指示履歴' },
            },
          ],
        },
        {
          path: 'shipment-orders',
          meta: { title: '出荷指示' },
          redirect: '/shipment-orders/create',
          children: [
            {
              path: '',
              redirect: '/shipment-orders/create',
            },
            {
              path: 'create',
              name: 'ShipmentOrderCreate',
              component: () => import('@/views/shipment-orders/ShipmentOrderCreate.vue'),
              meta: { title: '出荷指示作成' },
            },
            {
              path: 'create-v2',
              name: 'ShipmentOrderCreateV2',
              component: () => import('@/modules/shipment/pages/ShipmentOrderCreatePage.vue'),
              meta: { title: '出荷指示作成 V2' },
            },
          ],
        },
        {
          path: 'shipment-operations',
          meta: { title: '出荷作業' },
          redirect: '/shipment-operations/tasks',
          children: [
            {
              path: 'list',
              name: 'ShipmentOperationsList',
              component: () => import('@/views/shipment-operations/ShipmentOperationsList.vue'),
              meta: { title: '出荷一覧' },
            },
            {
              path: 'tasks',
              name: 'ShipmentList',
              component: () => import('@/views/shipment-operations/ShipmentList.vue'),
              meta: { title: '出荷作業一覧' },
            },
            {
              path: 'one-by-one/inspection',
              name: 'OneByOneInspection',
              component: () => import('@/views/shipment-operations/OneByOneInspection.vue'),
              meta: { title: '1-1検品' },
            },
            {
              path: 'n-by-one/inspection',
              name: 'OneProductInspection',
              component: () => import('@/views/shipment-operations/OneProductInspection.vue'),
              meta: { title: 'N-1検品' },
            },
          ],
        },
        {
          path: 'shipment-results',
          name: 'ShipmentResults',
          component: () => import('@/views/shipment-results/ShipmentResults.vue'),
          meta: { title: '出荷実績一覧' },
        },
        {
          path: 'inbound',
          meta: { title: '入庫管理' },
          redirect: '/inbound/dashboard',
          children: [
            {
              path: 'dashboard',
              name: 'InboundDashboard',
              component: () => import('@/views/inbound/InboundDashboard.vue'),
              meta: { title: '入庫ダッシュボード' },
            },
            {
              path: 'orders',
              name: 'InboundOrderList',
              component: () => import('@/views/inbound/InboundOrderList.vue'),
              meta: { title: '入庫指示一覧' },
            },
            {
              path: 'create',
              name: 'InboundOrderCreate',
              component: () => import('@/views/inbound/InboundOrderCreate.vue'),
              meta: { title: '入庫指示作成' },
            },
            {
              path: 'receive/:id',
              name: 'InboundReceive',
              component: () => import('@/views/inbound/InboundReceive.vue'),
              meta: { title: '入庫検品' },
            },
            {
              path: 'putaway/:id',
              name: 'InboundPutaway',
              component: () => import('@/views/inbound/InboundPutaway.vue'),
              meta: { title: '棚入れ' },
            },
            {
              path: 'history',
              name: 'InboundHistory',
              component: () => import('@/views/inbound/InboundHistory.vue'),
              meta: { title: '入庫実績' },
            },
            {
              path: 'import',
              name: 'InboundImport',
              component: () => import('@/views/inbound/InboundImport.vue'),
              meta: { title: 'CSV取込' },
            },
          ],
        },
        {
          path: 'inventory',
          meta: { title: '在庫管理' },
          redirect: '/inventory/stock',
          children: [
            {
              path: 'stock',
              name: 'InventoryStock',
              component: () => import('@/views/inventory/InventoryStock.vue'),
              meta: { title: '在庫一覧' },
            },
            {
              path: 'movements',
              name: 'InventoryMovements',
              component: () => import('@/views/inventory/InventoryMovements.vue'),
              meta: { title: '入出庫履歴' },
            },
            {
              path: 'adjustments',
              name: 'InventoryAdjustments',
              component: () => import('@/views/inventory/InventoryAdjustments.vue'),
              meta: { title: '在庫調整' },
            },
            {
              path: 'lots',
              name: 'LotManagement',
              component: () => import('@/views/inventory/LotManagement.vue'),
              meta: { title: 'ロット管理' },
            },
            {
              path: 'expiry-alerts',
              name: 'ExpiryAlerts',
              component: () => import('@/views/inventory/ExpiryAlerts.vue'),
              meta: { title: '賞味期限アラート' },
            },
            {
              path: 'locations',
              name: 'LocationSettings',
              component: () => import('@/views/inventory/LocationSettings.vue'),
              meta: { title: 'ロケーション管理' },
            },
            {
              path: 'ledger',
              name: 'InventoryLedgerDashboard',
              component: () => import('@/views/inventory/InventoryLedgerDashboard.vue'),
              meta: { title: '在庫台帳ダッシュボード' },
            },
          ],
        },
        {
          path: 'stocktaking',
          meta: { title: '棚卸管理' },
          redirect: '/stocktaking/list',
          children: [
            {
              path: 'list',
              name: 'StocktakingList',
              component: () => import('@/views/stocktaking/StocktakingList.vue'),
              meta: { title: '棚卸一覧' },
            },
            {
              path: 'create',
              name: 'StocktakingCreate',
              component: () => import('@/views/stocktaking/StocktakingCreate.vue'),
              meta: { title: '棚卸作成' },
            },
            {
              path: ':id',
              name: 'StocktakingDetail',
              component: () => import('@/views/stocktaking/StocktakingDetail.vue'),
              meta: { title: '棚卸詳細' },
            },
          ],
        },
        {
          path: 'returns',
          meta: { title: '返品管理' },
          redirect: '/returns/list',
          children: [
            {
              path: 'list',
              name: 'ReturnOrderList',
              component: () => import('@/views/returns/ReturnOrderList.vue'),
              meta: { title: '返品一覧' },
            },
            {
              path: 'create',
              name: 'ReturnOrderCreate',
              component: () => import('@/views/returns/ReturnOrderCreate.vue'),
              meta: { title: '返品作成' },
            },
            {
              path: ':id',
              name: 'ReturnOrderDetail',
              component: () => import('@/views/returns/ReturnOrderDetail.vue'),
              meta: { title: '返品詳細' },
            },
          ],
        },
        {
          path: 'warehouse-ops',
          meta: { title: '倉庫オペレーション' },
          redirect: '/warehouse-ops/tasks',
          children: [
            {
              path: 'tasks',
              name: 'TaskDashboard',
              component: () => import('@/views/warehouse/TaskDashboard.vue'),
              meta: { title: 'タスクダッシュボード' },
            },
            {
              path: 'waves',
              name: 'WaveManagement',
              component: () => import('@/views/warehouse/WaveManagement.vue'),
              meta: { title: 'ウェーブ管理' },
            },
            {
              path: 'serial-numbers',
              name: 'SerialNumberTracking',
              component: () => import('@/views/warehouse/SerialNumberTracking.vue'),
              meta: { title: 'シリアル番号管理' },
            },
          ],
        },
        {
          path: 'daily',
          meta: { title: '日次管理' },
          redirect: '/daily/list',
          children: [
            {
              path: 'list',
              name: 'DailyReportList',
              component: () => import('@/views/daily/DailyReportList.vue'),
              meta: { title: '日次レポート' },
            },
            {
              path: ':date',
              name: 'DailyReportDetail',
              component: () => import('@/views/daily/DailyReportDetail.vue'),
              meta: { title: '日次レポート詳細' },
            },
          ],
        },
        {
          path: 'settings',
          meta: { title: '設定' },
          redirect: '/settings/basic',
          children: [
            {
              path: 'basic',
              name: 'BasicSettings',
              component: () => import('@/views/settings/BasicSettings.vue'),
              meta: { title: '基本設定' },
            },
            {
              path: 'orderSourceCompany',
              name: 'OrderSourceCompany',
              component: () => import('@/views/settings/OrderSourceCompany.vue'),
              meta: { title: 'ご依頼主設定' },
            },
            {
              path: 'carrier',
              name: 'CarrierSettings',
              component: () => import('@/views/settings/CarrierSettings.vue'),
              meta: { title: '配送業者設定' },
            },
            {
              path: 'mapping-patterns',
              name: 'MappingPatterns',
              component: () => import('@/views/settings/MappingPatterns.vue'),
              meta: { title: 'ファイルレイアウト管理' },
            },
            {
              path: 'mapping-patterns/new',
              name: 'MappingPatternsNew',
              component: () => import('@/views/settings/MappingPatternNew.vue'),
              meta: { title: 'ファイルレイアウト作成', parentRoute: 'MappingPatterns' },
            },
            {
              path: 'mapping-patterns/edit/:id',
              name: 'MappingPatternsEdit',
              component: () => import('@/views/settings/MappingPatternNew.vue'),
              meta: { title: 'ファイルレイアウト編集', parentRoute: 'MappingPatterns' },
            },
            {
              path: 'print-templates',
              name: 'PrintTemplateSettings',
              component: () => import('@/views/settings/PrintTemplateSettings.vue'),
              meta: { title: '印刷テンプレート' },
            },
            {
              path: 'print-templates/:id',
              name: 'PrintTemplateEditor',
              component: () => import('@/views/settings/PrintTemplateEditor.vue'),
              meta: { title: '印刷テンプレート編集' },
            },
            {
              path: 'printer',
              name: 'PrinterSettings',
              component: () => import('@/views/settings/PrinterSettings.vue'),
              meta: { title: 'プリンター設定' },
            },
            {
              path: 'form-templates',
              name: 'FormTemplateSettings',
              component: () => import('@/views/settings/FormTemplateSettings.vue'),
              meta: { title: '帳票テンプレート' },
            },
            {
              path: 'form-templates/:id',
              name: 'FormTemplateEditor',
              component: () => import('@/views/settings/FormTemplateEditor.vue'),
              meta: { title: '帳票テンプレート編集' },
            },
            {
              path: 'carrier-automation',
              name: 'CarrierAutomationSettings',
              component: () => import('@/views/settings/CarrierAutomationSettings.vue'),
              meta: { title: '配送業者自動化設定' },
            },
            {
              path: 'order-groups',
              name: 'OrderGroupSettings',
              component: () => import('@/views/settings/OrderGroupSettings.vue'),
              meta: { title: '検品グループ設定' },
            },
            {
              path: 'auto-processing',
              name: 'AutoProcessingSettings',
              component: () => import('@/views/settings/AutoProcessingSettings.vue'),
              meta: { title: '自動処理設定' },
            },
            {
              path: 'email-templates',
              name: 'EmailTemplateSettings',
              component: () => import('@/views/settings/EmailTemplateSettings.vue'),
              meta: { title: '出荷メール設定' },
            },
            {
              path: 'inventory-categories',
              name: 'InventoryCategorySettings',
              component: () => import('@/views/settings/InventoryCategorySettings.vue'),
              meta: { title: '在庫区分一覧' },
            },
            {
              path: 'suppliers',
              name: 'SupplierSettings',
              component: () => import('@/views/settings/SupplierSettings.vue'),
              meta: { title: '仕入先一覧' },
            },
            {
              path: 'operation-logs',
              name: 'OperationLogView',
              component: () => import('@/views/settings/OperationLogView.vue'),
              meta: { title: 'WMS操作ログ' },
            },
            {
              path: 'api-logs',
              name: 'ApiLogView',
              component: () => import('@/views/settings/ApiLogView.vue'),
              meta: { title: 'API連携ログ' },
            },
            {
              path: 'customers',
              name: 'CustomerSettings',
              component: () => import('@/views/settings/CustomerSettings.vue'),
              meta: { title: '得意先一覧' },
            },
            {
              path: 'clients',
              name: 'ClientSettings',
              component: () => import('@/views/settings/ClientSettings.vue'),
              meta: { title: '顧客一覧（3PL荷主）' },
            },
            {
              path: 'warehouses',
              name: 'WarehouseSettings',
              component: () => import('@/views/settings/WarehouseSettings.vue'),
              meta: { title: '倉庫管理' },
            },
            {
              path: 'wms-schedules',
              name: 'WmsScheduleView',
              component: () => import('@/views/settings/WmsScheduleView.vue'),
              meta: { title: 'WMSスケジュール' },
            },
            {
              path: 'rules',
              name: 'RuleSettings',
              component: () => import('@/views/settings/RuleSettings.vue'),
              meta: { title: 'ルール設定' },
            },
            {
              path: 'tenants',
              name: 'TenantSettings',
              component: () => import('@/views/settings/TenantSettings.vue'),
              meta: { title: 'テナント管理' },
            },
            {
              path: 'webhooks',
              name: 'WebhookSettings',
              component: () => import('@/views/settings/WebhookSettings.vue'),
              meta: { title: 'Webhook 管理' },
            },
            {
              path: 'plugins',
              name: 'PluginManagement',
              component: () => import('@/views/settings/PluginManagement.vue'),
              meta: { title: 'プラグイン管理' },
            },
            {
              path: 'system',
              name: 'SystemSettings',
              component: () => import('@/views/settings/SystemSettings.vue'),
              meta: { title: '応用設定' },
            },
          ],
        },
      ],
    },
  ],
})

export default router
