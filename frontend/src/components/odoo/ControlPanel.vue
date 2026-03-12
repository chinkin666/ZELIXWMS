<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import OPresenceIndicator from './OPresenceIndicator.vue'
import OFileUploader from './OFileUploader.vue'
import ODialog from './ODialog.vue'
import OButton from './OButton.vue'
import { useI18n } from '../../composables/useI18n'

const router = useRouter()
const currentRoute = useRoute()
const { t } = useI18n()

const showUploadDialog = ref(false)
const uploadedFiles = ref<File[]>([])

function handleUpload(files: File[]) {
  uploadedFiles.value = [...uploadedFiles.value, ...files]
}

function handleRemoveFile(file: File) {
  uploadedFiles.value = uploadedFiles.value.filter(f => f !== file)
}

function confirmUpload() {
  showUploadDialog.value = false
  uploadedFiles.value = []
}

const props = defineProps<{
  title?: string
  breadcrumbs?: string[]
  showSearch?: boolean
  showCreate?: boolean
  showUpload?: boolean
  createLabel?: string
}>()

defineEmits<{
  'create': []
  'search': [query: string]
}>()

// Route-to-group mapping for auto-breadcrumbs
const routeGroupMap: Record<string, { group: string; groupRoute?: string }> = {
  '/': { group: '' },
  '/dashboard-customize': { group: 'sidebar.main', groupRoute: '/' },
  '/discuss': { group: 'sidebar.main', groupRoute: '/' },
  '/inbox': { group: 'sidebar.main', groupRoute: '/' },
  '/calendar': { group: 'sidebar.main', groupRoute: '/' },
  '/documents': { group: 'sidebar.main', groupRoute: '/' },
  // Sales
  '/crm': { group: 'sidebar.sales' },
  '/orders': { group: 'sidebar.sales' },
  '/pos': { group: 'sidebar.sales' },
  '/customers': { group: 'sidebar.sales' },
  '/products': { group: 'sidebar.sales' },
  '/subscriptions': { group: 'sidebar.sales' },
  '/rental': { group: 'sidebar.sales' },
  '/ecommerce': { group: 'sidebar.sales' },
  // Accounting
  '/invoices': { group: 'sidebar.accounting' },
  '/reporting': { group: 'sidebar.accounting' },
  '/consolidation': { group: 'sidebar.accounting' },
  '/bank-reconciliation': { group: 'sidebar.accounting' },
  '/accounting-reports': { group: 'sidebar.accounting' },
  '/tax-config': { group: 'sidebar.accounting' },
  '/payment-providers': { group: 'sidebar.accounting' },
  '/recurring-documents': { group: 'sidebar.accounting' },
  '/analytic-accounts': { group: 'sidebar.accounting' },
  '/journal-entries': { group: 'sidebar.accounting' },
  '/accounting': { group: 'sidebar.accounting' },
  '/chart-of-accounts': { group: 'sidebar.accounting' },
  // Operations
  '/projects': { group: 'sidebar.operations' },
  '/inventory': { group: 'sidebar.operations' },
  '/product-configurator': { group: 'sidebar.operations' },
  '/product-categories': { group: 'sidebar.operations' },
  '/warehouse-config': { group: 'sidebar.operations' },
  '/uom': { group: 'sidebar.operations' },
  '/manufacturing': { group: 'sidebar.operations' },
  '/bom': { group: 'sidebar.operations' },
  '/work-centers': { group: 'sidebar.operations' },
  '/email-marketing': { group: 'sidebar.operations' },
  '/fleet': { group: 'sidebar.operations' },
  '/knowledge': { group: 'sidebar.operations' },
  '/events': { group: 'sidebar.operations' },
  '/field-service': { group: 'sidebar.operations' },
  '/workflow': { group: 'sidebar.operations' },
  '/social-marketing': { group: 'sidebar.operations' },
  '/marketing-automation': { group: 'sidebar.operations' },
  '/sms-marketing': { group: 'sidebar.operations' },
  '/sign': { group: 'sidebar.operations' },
  '/approvals': { group: 'sidebar.operations' },
  '/maintenance': { group: 'sidebar.operations' },
  '/quality': { group: 'sidebar.operations' },
  '/elearning': { group: 'sidebar.operations' },
  '/plm': { group: 'sidebar.operations' },
  '/iot': { group: 'sidebar.operations' },
  '/whatsapp': { group: 'sidebar.operations' },
  '/purchase': { group: 'sidebar.operations' },
  '/helpdesk': { group: 'sidebar.operations' },
  '/surveys': { group: 'sidebar.operations' },
  // HR
  '/employees': { group: 'sidebar.humanResources' },
  '/time-off': { group: 'sidebar.humanResources' },
  '/recruitment': { group: 'sidebar.humanResources' },
  '/appraisals': { group: 'sidebar.humanResources' },
  '/attendances': { group: 'sidebar.humanResources' },
  '/planning': { group: 'sidebar.humanResources' },
  '/timesheets': { group: 'sidebar.humanResources' },
  '/lunch': { group: 'sidebar.humanResources' },
  '/referrals': { group: 'sidebar.humanResources' },
  '/gamification': { group: 'sidebar.humanResources' },
  '/expenses': { group: 'sidebar.humanResources' },
  // Configuration
  '/apps': { group: 'sidebar.configuration' },
  '/settings': { group: 'sidebar.configuration' },
  '/automation': { group: 'sidebar.configuration' },
  '/email-templates': { group: 'sidebar.configuration' },
  '/users': { group: 'sidebar.configuration' },
  '/cron-jobs': { group: 'sidebar.configuration' },
  '/system-parameters': { group: 'sidebar.configuration' },
  '/translation-manager': { group: 'sidebar.configuration' },
  '/company-settings': { group: 'sidebar.configuration' },
  '/email-config': { group: 'sidebar.configuration' },
  '/sequence-config': { group: 'sidebar.configuration' },
  '/currencies': { group: 'sidebar.configuration' },
  '/countries': { group: 'sidebar.configuration' },
  '/access-rights': { group: 'sidebar.configuration' },
  '/developer-mode': { group: 'sidebar.configuration' },
  '/studio': { group: 'sidebar.configuration' },
  '/barcode': { group: 'sidebar.configuration' },
  '/website': { group: 'sidebar.configuration' },
  '/portal': { group: 'sidebar.portal' },
}

// Form page parent mapping (detail pages → list parent)
const formParentMap: Record<string, { parentLabel: string; parentRoute: string }> = {
  'lead-form': { parentLabel: 'sidebar.crm', parentRoute: '/crm' },
  'order-form': { parentLabel: 'sidebar.orders', parentRoute: '/orders' },
  'contact-form': { parentLabel: 'sidebar.customers', parentRoute: '/customers' },
  'product-form': { parentLabel: 'sidebar.products', parentRoute: '/products' },
  'invoice-form': { parentLabel: 'sidebar.invoices', parentRoute: '/invoices' },
  'invoice-print': { parentLabel: 'sidebar.invoices', parentRoute: '/invoices' },
  'task-form': { parentLabel: 'sidebar.projects', parentRoute: '/projects' },
  'employee-form': { parentLabel: 'sidebar.employees', parentRoute: '/employees' },
  'recruitment-form': { parentLabel: 'sidebar.recruitment', parentRoute: '/recruitment' },
  'appraisal-form': { parentLabel: 'sidebar.appraisals', parentRoute: '/appraisals' },
  'ticket-form': { parentLabel: 'sidebar.helpdesk', parentRoute: '/helpdesk' },
  'purchase-form': { parentLabel: 'sidebar.purchase', parentRoute: '/purchase' },
  'manufacturing-form': { parentLabel: 'sidebar.manufacturing', parentRoute: '/manufacturing' },
  'fleet-form': { parentLabel: 'sidebar.fleet', parentRoute: '/fleet' },
  'expense-form': { parentLabel: 'sidebar.expenses', parentRoute: '/expenses' },
  'email-template': { parentLabel: 'sidebar.emailMarketing', parentRoute: '/email-marketing' },
  'knowledge-article': { parentLabel: 'sidebar.knowledge', parentRoute: '/knowledge' },
  'survey-form': { parentLabel: 'sidebar.surveys', parentRoute: '/surveys' },
}

// WMS top-level navigation — maps prefix to parent breadcrumb label + default route
const wmsParentMap: Record<string, { label: string; route: string }> = {
  '/products': { label: '商品管理', route: '/products/list' },
  '/shipment-orders': { label: '出荷指示', route: '/shipment-orders/create' },
  '/shipment-operations': { label: '出荷作業', route: '/shipment-operations/tasks' },
  '/shipment-results': { label: '出荷実績', route: '/shipment-results' },
  '/inbound': { label: '入庫管理', route: '/inbound/orders' },
  '/inventory': { label: '在庫管理', route: '/inventory/stock' },
  '/settings': { label: '設定', route: '/settings/basic' },
}

// Auto-generate breadcrumbs from current route
const autoBreadcrumbs = computed<{ label: string; route?: string }[]>(() => {
  if (props.breadcrumbs && props.breadcrumbs.length > 0) {
    return props.breadcrumbs.map((crumb, i, arr) => ({
      label: crumb,
      route: i < arr.length - 1 ? (breadcrumbRoutes[crumb] || undefined) : undefined,
    }))
  }

  const path = currentRoute.path
  const routeName = currentRoute.name as string | undefined
  const crumbs: { label: string; route?: string }[] = []

  // Check form page parents first
  if (routeName && formParentMap[routeName]) {
    const parent = formParentMap[routeName]
    const parentGroup = routeGroupMap[parent.parentRoute]
    if (parentGroup?.group) {
      crumbs.push({ label: t(parentGroup.group), route: undefined })
    }
    crumbs.push({ label: t(parent.parentLabel), route: parent.parentRoute })
    crumbs.push({ label: props.title ?? '' })
    return crumbs
  }

  // WMS prefix match: /settings/carrier → parent "設定", etc.
  const wmsKey = Object.keys(wmsParentMap)
    .filter(k => path.startsWith(k + '/') || path === k)
    .sort((a, b) => b.length - a.length)[0]
  if (wmsKey) {
    const parent = wmsParentMap[wmsKey]
    // Push parent crumb only when: section has a default route, and we're on a different sub-route
    if (parent && parent.route && path !== parent.route && path !== wmsKey) {
      crumbs.push({ label: parent.label, route: parent.route })
    }
    crumbs.push({ label: props.title ?? '' })
    return crumbs
  }

  // Regular pages: add group as parent breadcrumb
  const mapping = routeGroupMap[path]
  if (mapping?.group) {
    crumbs.push({ label: t(mapping.group), route: mapping.groupRoute })
  }
  crumbs.push({ label: props.title ?? '' })
  return crumbs
})

// Legacy breadcrumb route mapping (for manually passed breadcrumbs)
const breadcrumbRoutes: Record<string, string> = {
  'Contacts': '/customers',
  'Pipeline': '/crm',
  'Projects': '/projects',
  'Invoices': '/invoices',
  'Sales Orders': '/orders',
  'Orders': '/orders',
  'Products': '/products',
  'Sales': '/orders',
  'Inventory': '/inventory',
  'Purchase': '/purchase',
  'Employees': '/employees',
  'Time Off': '/time-off',
  'Accounting': '/accounting',
  'Helpdesk': '/helpdesk',
  'Expenses': '/expenses',
  'Manufacturing': '/manufacturing',
  'Knowledge': '/knowledge',
  'Fleet': '/fleet',
  'Appraisals': '/appraisals',
  'Recruitment': '/recruitment',
  'Surveys': '/surveys',
  'Reporting': '/reporting',
  'Settings': '/settings',
}

function navigateBreadcrumb(route?: string) {
  if (route) router.push(route)
}
</script>

<template>
  <div class="o-control-panel">
    <div class="o-cp-top">
      <!-- Breadcrumbs -->
      <div class="o-cp-breadcrumbs">
        <ol class="o-breadcrumb">
          <li v-for="(crumb, i) in autoBreadcrumbs" :key="i" class="o-breadcrumb-item">
            <a v-if="i < autoBreadcrumbs.length - 1 && crumb.route" href="#" @click.prevent="navigateBreadcrumb(crumb.route)">{{ crumb.label }}</a>
            <span v-else-if="i < autoBreadcrumbs.length - 1" class="o-breadcrumb-parent">{{ crumb.label }}</span>
            <span v-else class="active">{{ crumb.label }}</span>
          </li>
        </ol>
      </div>

      <!-- Center slot -->
      <div class="o-cp-center">
        <slot name="center" />
      </div>

      <!-- Action buttons -->
      <div class="o-cp-actions">
        <OPresenceIndicator />
        <slot name="actions">
          <OButton v-if="showUpload" variant="secondary" @click="showUploadDialog = true">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
              <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z"/>
            </svg>
            {{ t('common.upload') }}
          </OButton>
          <OButton v-if="showCreate" variant="primary" @click="$emit('create')">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2z"/>
            </svg>
            {{ createLabel || t('controlPanel.new') }}
          </OButton>
        </slot>
      </div>
    </div>

    <!-- Search bar row -->
    <div v-if="showSearch !== false" class="o-cp-bottom">
      <div class="o-searchview">
        <div class="o-searchview-input-container">
          <svg class="o-searchview-icon" width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
          </svg>
          <input
            type="text"
            class="o-searchview-input"
            :placeholder="t('common.search')"
            @input="$emit('search', ($event.target as HTMLInputElement).value)"
          />
        </div>
        <slot name="search-actions">
          <div class="o-search-options">
            <button class="o-search-option-btn" :title="t('controlPanel.groupBy')">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3z"/>
              </svg>
            </button>
            <button class="o-search-option-btn" :title="t('controlPanel.favorites')">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/>
              </svg>
            </button>
          </div>
        </slot>
      </div>
    </div>

    <!-- Upload Dialog -->
    <ODialog
      :open="showUploadDialog"
      :title="t('common.upload')"
      @close="showUploadDialog = false"
      @confirm="confirmUpload"
    >
      <OFileUploader
        multiple
        :max-size="50"
        :max-files="10"
        @upload="handleUpload"
        @remove="handleRemoveFile"
      />
    </ODialog>
  </div>
</template>

<style scoped>
.o-control-panel {
  background: var(--o-view-background);
  border-bottom: 1px solid var(--o-border-color);
  padding: 0 1rem;
  position: sticky;
  top: 0;
  z-index: 10;
}

.o-cp-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 42px;
  padding: 0.25rem 0;
  position: relative;
}

.o-cp-breadcrumbs {
  flex: 0 0 auto;
  min-width: 0;
  position: relative;
  z-index: 2;
}
.o-breadcrumb {
  display: flex;
  align-items: center;
  list-style: none;
  gap: 0;
  margin: 0;
  padding: 0;
  flex-wrap: nowrap;
}
.o-breadcrumb-item {
  display: flex;
  align-items: center;
  font-size: var(--o-font-size-base);
}
.o-breadcrumb-item + .o-breadcrumb-item::before {
  content: '/';
  padding: 0 0.375rem;
  color: var(--o-gray-500);
}
.o-breadcrumb-item a {
  color: var(--o-brand-primary);
  text-decoration: none;
  font-weight: 400;
}
.o-breadcrumb-item a:hover { text-decoration: underline; }
.o-breadcrumb-parent {
  color: var(--o-gray-600);
  font-weight: 400;
}
.o-breadcrumb-item .active {
  color: var(--o-gray-900);
  font-weight: 600;
  font-size: var(--o-font-size-base);
}

.o-cp-center {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  justify-content: center;
  pointer-events: auto;
  z-index: 1;
}

.o-cp-actions {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-shrink: 0;
  position: relative;
  z-index: 2;
}

/* Search view */
.o-cp-bottom {
  padding-bottom: 0.5rem;
}
.o-searchview {
  display: flex;
  align-items: center;
  border: 1px solid var(--o-gray-300);
  border-radius: var(--o-border-radius);
  background: var(--o-view-background);
  min-height: 30px;
}
.o-searchview-input-container {
  display: flex;
  align-items: center;
  flex: 1;
  padding: 0 0.5rem;
  gap: 0.375rem;
}
.o-searchview-icon {
  color: var(--o-gray-500);
  flex-shrink: 0;
}
.o-searchview-input {
  flex: 1;
  border: none;
  background: none;
  outline: none;
  font-size: var(--o-font-size-base);
  color: var(--o-gray-700);
  padding: 0.25rem 0;
}
.o-searchview-input::placeholder {
  color: var(--o-gray-500);
}
.o-search-options {
  display: flex;
  border-left: 1px solid var(--o-gray-300);
}
.o-search-option-btn {
  padding: 0.375rem 0.5rem;
  background: none;
  border: none;
  color: var(--o-gray-600);
  display: flex;
  align-items: center;
}
.o-search-option-btn:hover {
  color: var(--o-gray-900);
  background: var(--o-gray-100);
}
</style>
