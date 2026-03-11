import { createRouter, createWebHistory } from 'vue-router'
import WmsLayout from '@/layouts/WmsLayout.vue'
import Welcome from '@/views/Welcome.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
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
              path: 'confirm',
              name: 'ShipmentOrderConfirm',
              component: () => import('@/views/shipment-orders/ShipmentOrderConfirm.vue'),
              meta: { title: '出荷指示確定' },
            },
          ],
        },
        {
          path: 'waybill-management',
          meta: { title: '送り状管理' },
          children: [
            {
              path: 'export',
              name: 'WaybillExport',
              component: () => import('@/views/waybill-management/CarrierExport.vue'),
              meta: { title: '配送会社データ出力' },
            },
            {
              path: 'import',
              name: 'WaybillImport',
              component: () => import('@/views/waybill-management/CarrierImport.vue'),
              meta: { title: '配送会社データ取込' },
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
          path: 'daily',
          meta: { title: '日次管理' },
          redirect: '/daily',
          children: [],
        },
        {
          path: 'settings',
          meta: { title: '設定' },
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
              meta: { title: '配送会社設定' },
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
              meta: { title: '配送会社自動化設定' },
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
          ],
        },
      ],
    },
  ],
})

export default router
