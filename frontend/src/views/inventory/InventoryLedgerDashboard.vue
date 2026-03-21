<template>
  <div class="inventory-dashboard">
    <ControlPanel :title="t('wms.inventory.dashboard', '在庫ダッシュボード（台帳）')" :show-search="false">
      <template #actions>
        <OButton v-if="activeTab === 'ledger'" variant="primary" @click="openAdjustmentDialog">{{ t('wms.inventory.manualAdjustment', '手動調整') }}</OButton>
      </template>
    </ControlPanel>

    <!-- KPI 概況カード / KPI概览卡片 -->
    <div v-if="overview" class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-value">{{ overview.productCount }}</div>
        <div class="kpi-label">商品数</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">{{ overview.totalQuantity.toLocaleString() }}</div>
        <div class="kpi-label">総在庫数</div>
        <div class="kpi-sub">引当: {{ overview.totalReserved }} / 有効: {{ overview.availableQuantity }}</div>
      </div>
      <div class="kpi-card" :class="{ 'kpi-card--warning': overview.lowStockCount > 0 }">
        <div class="kpi-value">{{ overview.lowStockCount }}</div>
        <div class="kpi-label">低在庫警告</div>
      </div>
      <div class="kpi-card" :class="{ 'kpi-card--danger': overview.expiredCount > 0, 'kpi-card--warning': overview.expiredCount === 0 && overview.expiringCount > 0 }">
        <div class="kpi-value">{{ overview.expiringCount }}</div>
        <div class="kpi-label">期限切れ近い</div>
        <div v-if="overview.expiredCount > 0" class="kpi-sub kpi-sub--danger">期限切れ: {{ overview.expiredCount }}件</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">{{ overview.locationUsage.percent }}%</div>
        <div class="kpi-label">ロケーション使用率</div>
        <div class="kpi-sub">{{ overview.locationUsage.used }} / {{ overview.locationUsage.total }}</div>
      </div>
    </div>

    <!-- 期限切れ近い商品 / 即将过期商品 -->
    <div v-if="overview && overview.expiringDetails.length > 0" class="expiry-alert-section">
      <h4 class="expiry-alert-title">&#x26A0; 期限切れ近い商品（30日以内）</h4>
      <div class="expiry-alert-list">
        <div v-for="item in overview.expiringDetails" :key="item.lotNumber" class="expiry-alert-item">
          <span class="expiry-sku">{{ item.productSku }}</span>
          <span class="expiry-name">{{ item.productName }}</span>
          <span class="expiry-lot">LOT: {{ item.lotNumber }}</span>
          <span class="expiry-days" :class="{ 'expiry-days--critical': item.daysRemaining <= 7 }">残り{{ item.daysRemaining }}日</span>
        </div>
      </div>
    </div>

    <!-- Tab header -->
    <div class="tab-header">
      <button :class="['tab-btn', { active: activeTab === 'stock' }]" @click="activeTab = 'stock'">{{ t('wms.inventory.stockLevels', '在庫水位') }}</button>
      <button :class="['tab-btn', { active: activeTab === 'ledger' }]" @click="activeTab = 'ledger'">{{ t('wms.inventory.ledger', '在庫台帳') }}</button>
      <button :class="['tab-btn', { active: activeTab === 'reservations' }]" @click="activeTab = 'reservations'">{{ t('wms.inventory.reservationList', '引当一覧') }}</button>
    </div>

    <!-- Tab 1: Stock Levels -->
    <div v-if="activeTab === 'stock'">
      <div class="o-table-wrapper">
        <table class="o-table">
          <thead>
            <tr>
              <th class="o-table-th" style="width: 160px">{{ t('wms.inventory.productSku', '商品SKU') }}</th>
              <th class="o-table-th" style="width: 240px">{{ t('wms.inventory.productName', '商品名') }}</th>
              <th class="o-table-th" style="width: 120px; text-align: right">{{ t('wms.inventory.totalStock', '総在庫') }}</th>
              <th class="o-table-th" style="width: 120px; text-align: right">{{ t('wms.inventory.reserved', '引当済') }}</th>
              <th class="o-table-th" style="width: 120px; text-align: right">{{ t('wms.inventory.availableStock', '有効在庫') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="stockLoading">
              <td class="o-table-td o-table-empty" colspan="5">{{ t('wms.common.loading', '読み込み中...') }}</td>
            </tr>
            <tr v-else-if="stockLevels.length === 0">
              <td class="o-table-td o-table-empty" colspan="5">{{ t('wms.common.noData', 'データがありません') }}</td>
            </tr>
            <tr
              v-for="s in stockLevels"
              :key="s.productId"
              class="o-table-row"
              :class="stockRowClass(s)"
            >
              <td class="o-table-td">{{ s.productSku }}</td>
              <td class="o-table-td">{{ s.productName || '-' }}</td>
              <td class="o-table-td" style="text-align: right">{{ s.totalStock }}</td>
              <td class="o-table-td" style="text-align: right">{{ s.reservedStock }}</td>
              <td class="o-table-td" style="text-align: right; font-weight: 600">{{ s.availableStock }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Stock Pagination -->
      <div class="o-table-pagination">
        <span class="o-table-pagination__info">{{ t('wms.common.paginationInfo', '全{total}件中 {start}-{end}件').replace('{total}', String(stockTotal)).replace('{start}', String(stockPaginationStart)).replace('{end}', String(stockPaginationEnd)) }}</span>
        <div class="o-table-pagination__controls">
          <select class="o-input o-input-sm" v-model.number="stockPageSize" style="width:80px;" @change="handleStockPageSizeChange">
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
          </select>
          <OButton variant="secondary" size="sm" :disabled="stockPage <= 1" @click="goToStockPage(stockPage - 1)">&lsaquo;</OButton>
          <span class="o-table-pagination__page">{{ stockPage }} / {{ stockTotalPages }}</span>
          <OButton variant="secondary" size="sm" :disabled="stockPage >= stockTotalPages" @click="goToStockPage(stockPage + 1)">&rsaquo;</OButton>
        </div>
      </div>
    </div>

    <!-- Tab 2: Ledger History -->
    <div v-if="activeTab === 'ledger'">
      <!-- Filters -->
      <div class="filter-section">
        <select v-model="ledgerTypeFilter" class="o-input" style="width: 160px" @change="handleLedgerFilterChange">
          <option value="">{{ t('wms.inventory.allTypes', '全タイプ') }}</option>
          <option value="inbound">{{ t('wms.inventory.inbound', '入庫') }}</option>
          <option value="outbound">{{ t('wms.inventory.outbound', '出庫') }}</option>
          <option value="reserve">{{ t('wms.inventory.reserve', '引当') }}</option>
          <option value="release">{{ t('wms.inventory.release', '解放') }}</option>
          <option value="adjustment">{{ t('wms.inventory.adjustment', '調整') }}</option>
          <option value="count">{{ t('wms.inventory.count', '棚卸') }}</option>
        </select>
      </div>

      <div class="o-table-wrapper">
        <table class="o-table">
          <thead>
            <tr>
              <th class="o-table-th" style="width: 160px">{{ t('wms.inventory.dateTime', '日時') }}</th>
              <th class="o-table-th" style="width: 140px">{{ t('wms.inventory.productSku', '商品SKU') }}</th>
              <th class="o-table-th" style="width: 100px">{{ t('wms.inventory.type', 'タイプ') }}</th>
              <th class="o-table-th" style="width: 100px; text-align: right">{{ t('wms.inventory.quantity', '数量') }}</th>
              <th class="o-table-th" style="width: 140px">{{ t('wms.inventory.referenceNumber', '参照番号') }}</th>
              <th class="o-table-th" style="width: 120px">{{ t('wms.inventory.executedBy', '実行者') }}</th>
              <th class="o-table-th">{{ t('wms.inventory.memo', '備考') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="ledgerLoading">
              <td class="o-table-td o-table-empty" colspan="7">{{ t('wms.common.loading', '読み込み中...') }}</td>
            </tr>
            <tr v-else-if="ledgerEntries.length === 0">
              <td class="o-table-td o-table-empty" colspan="7">{{ t('wms.common.noData', 'データがありません') }}</td>
            </tr>
            <tr v-for="e in ledgerEntries" :key="e._id" class="o-table-row">
              <td class="o-table-td">{{ formatDateTime(e.createdAt) }}</td>
              <td class="o-table-td">{{ e.productSku }}</td>
              <td class="o-table-td">
                <span :class="['type-tag', `type-tag--${e.type}`]">{{ ledgerTypeLabel(e.type) }}</span>
              </td>
              <td class="o-table-td" style="text-align: right">
                <span :class="e.quantity >= 0 ? 'qty-positive' : 'qty-negative'">
                  {{ e.quantity >= 0 ? `+${e.quantity}` : e.quantity }}
                </span>
              </td>
              <td class="o-table-td">{{ e.referenceNumber || '-' }}</td>
              <td class="o-table-td">{{ e.executedBy || '-' }}</td>
              <td class="o-table-td">{{ e.memo || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Ledger Pagination -->
      <div class="o-table-pagination">
        <span class="o-table-pagination__info">{{ t('wms.common.paginationInfo', '全{total}件中 {start}-{end}件').replace('{total}', String(ledgerTotal)).replace('{start}', String(ledgerPaginationStart)).replace('{end}', String(ledgerPaginationEnd)) }}</span>
        <div class="o-table-pagination__controls">
          <select class="o-input o-input-sm" v-model.number="ledgerPageSize" style="width:80px;" @change="handleLedgerPageSizeChange">
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
          </select>
          <OButton variant="secondary" size="sm" :disabled="ledgerPage <= 1" @click="goToLedgerPage(ledgerPage - 1)">&lsaquo;</OButton>
          <span class="o-table-pagination__page">{{ ledgerPage }} / {{ ledgerTotalPages }}</span>
          <OButton variant="secondary" size="sm" :disabled="ledgerPage >= ledgerTotalPages" @click="goToLedgerPage(ledgerPage + 1)">&rsaquo;</OButton>
        </div>
      </div>
    </div>

    <!-- Tab 3: Reservations -->
    <div v-if="activeTab === 'reservations'">
      <div class="o-table-wrapper">
        <table class="o-table">
          <thead>
            <tr>
              <th class="o-table-th" style="width: 140px">{{ t('wms.inventory.productSku', '商品SKU') }}</th>
              <th class="o-table-th" style="width: 100px; text-align: right">{{ t('wms.inventory.quantity', '数量') }}</th>
              <th class="o-table-th" style="width: 100px">{{ t('wms.inventory.reservationStatus', 'ステータス') }}</th>
              <th class="o-table-th" style="width: 100px">{{ t('wms.inventory.source', 'ソース') }}</th>
              <th class="o-table-th" style="width: 140px">{{ t('wms.inventory.referenceNumber', '参照番号') }}</th>
              <th class="o-table-th" style="width: 160px">{{ t('wms.inventory.expiresAt', '有効期限') }}</th>
              <th class="o-table-th" style="width: 100px">{{ t('wms.common.actions', '操作') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="reservationsLoading">
              <td class="o-table-td o-table-empty" colspan="7">{{ t('wms.common.loading', '読み込み中...') }}</td>
            </tr>
            <tr v-else-if="reservations.length === 0">
              <td class="o-table-td o-table-empty" colspan="7">{{ t('wms.common.noData', 'データがありません') }}</td>
            </tr>
            <tr v-for="r in reservations" :key="r._id" class="o-table-row">
              <td class="o-table-td">{{ r.productSku }}</td>
              <td class="o-table-td" style="text-align: right">{{ r.quantity }}</td>
              <td class="o-table-td">
                <span :class="['status-tag', `status-tag--${r.status}`]">{{ reservationStatusLabel(r.status) }}</span>
              </td>
              <td class="o-table-td">{{ reservationSourceLabel(r.source) }}</td>
              <td class="o-table-td">{{ r.referenceNumber || '-' }}</td>
              <td class="o-table-td">{{ r.expiresAt ? formatDateTime(r.expiresAt) : '-' }}</td>
              <td class="o-table-td">
                <OButton
                  v-if="r.status === 'active'"
                  variant="secondary"
                  size="sm"
                  @click="handleReleaseReservation(r)"
                >{{ t('wms.inventory.release', '解放') }}</OButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Reservations Pagination -->
      <div class="o-table-pagination">
        <span class="o-table-pagination__info">{{ t('wms.common.paginationInfo', '全{total}件中 {start}-{end}件').replace('{total}', String(reservationsTotal)).replace('{start}', String(reservationsPaginationStart)).replace('{end}', String(reservationsPaginationEnd)) }}</span>
        <div class="o-table-pagination__controls">
          <select class="o-input o-input-sm" v-model.number="reservationsPageSize" style="width:80px;" @change="handleReservationsPageSizeChange">
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
          </select>
          <OButton variant="secondary" size="sm" :disabled="reservationsPage <= 1" @click="goToReservationsPage(reservationsPage - 1)">&lsaquo;</OButton>
          <span class="o-table-pagination__page">{{ reservationsPage }} / {{ reservationsTotalPages }}</span>
          <OButton variant="secondary" size="sm" :disabled="reservationsPage >= reservationsTotalPages" @click="goToReservationsPage(reservationsPage + 1)">&rsaquo;</OButton>
        </div>
      </div>
    </div>

    <!-- Adjustment Dialog -->
    <ODialog v-model="adjustmentDialogOpen" :title="t('wms.inventory.manualAdjustment', '手動調整')" size="md" @confirm="handleCreateAdjustment">
      <div class="form-grid">
        <div class="form-field">
          <label class="form-label">{{ t('wms.inventory.productSku', '商品SKU') }} <span class="required-badge">必須</span></label>
          <input v-model="adjustmentForm.productSku" type="text" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">{{ t('wms.inventory.quantity', '数量') }} <span class="required-badge">必須</span></label>
          <input v-model.number="adjustmentForm.quantity" type="number" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">{{ t('wms.inventory.warehouseId', '倉庫ID') }}</label>
          <input v-model="adjustmentForm.warehouseId" type="text" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">{{ t('wms.inventory.reason', '理由') }}</label>
          <input v-model="adjustmentForm.reason" type="text" class="o-input" />
        </div>
        <div class="form-field form-field--full">
          <label class="form-label">{{ t('wms.inventory.memo', '備考') }}</label>
          <textarea v-model="adjustmentForm.memo" class="o-input form-textarea" rows="3" />
        </div>
      </div>
    </ODialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessageBox } from 'element-plus'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import ODialog from '@/components/odoo/ODialog.vue'
import {
  fetchStockLevels,
  fetchLedgerEntries,
  fetchReservations,
  createLedgerEntry,
  releaseReservation,
  type StockLevel,
  type LedgerEntry,
  type Reservation,
} from '@/api/inventoryLedger'
import { fetchInventoryOverview, type InventoryOverview } from '@/api/inventory'

const { show: showToast } = useToast()
const { t } = useI18n()

// 概況データ / 概览数据
const overview = ref<InventoryOverview | null>(null)

async function loadOverview() {
  try {
    overview.value = await fetchInventoryOverview()
  } catch {
    // 概況取得失敗は無視 / 概览获取失败忽略
  }
}

// Active tab
const activeTab = ref<'stock' | 'ledger' | 'reservations'>('stock')

// ── Tab 1: Stock Levels ──
const stockLevels = ref<StockLevel[]>([])
const stockTotal = ref(0)
const stockLoading = ref(false)
const stockPage = ref(1)
const stockPageSize = ref(20)

const stockTotalPages = computed(() => Math.max(1, Math.ceil(stockTotal.value / stockPageSize.value)))
const stockPaginationStart = computed(() => (stockTotal.value === 0 ? 0 : (stockPage.value - 1) * stockPageSize.value + 1))
const stockPaginationEnd = computed(() => Math.min(stockPage.value * stockPageSize.value, stockTotal.value))

const stockRowClass = (s: StockLevel): string => {
  if (s.availableStock <= 0) return 'row-danger'
  if (s.availableStock < 10) return 'row-warning'
  return ''
}

const loadStockLevels = async () => {
  stockLoading.value = true
  try {
    const result = await fetchStockLevels({
      page: stockPage.value,
      limit: stockPageSize.value,
    })
    stockLevels.value = result.data
    stockTotal.value = result.total
  } catch (error: any) {
    showToast(error?.message || '在庫水準の取得に失敗しました', 'danger')
  } finally {
    stockLoading.value = false
  }
}

const handleStockPageSizeChange = () => {
  stockPage.value = 1
  loadStockLevels()
}

const goToStockPage = (page: number) => {
  stockPage.value = page
  loadStockLevels()
}

// ── Tab 2: Ledger History ──
const ledgerEntries = ref<LedgerEntry[]>([])
const ledgerTotal = ref(0)
const ledgerLoading = ref(false)
const ledgerPage = ref(1)
const ledgerPageSize = ref(20)
const ledgerTypeFilter = ref('')

const ledgerTotalPages = computed(() => Math.max(1, Math.ceil(ledgerTotal.value / ledgerPageSize.value)))
const ledgerPaginationStart = computed(() => (ledgerTotal.value === 0 ? 0 : (ledgerPage.value - 1) * ledgerPageSize.value + 1))
const ledgerPaginationEnd = computed(() => Math.min(ledgerPage.value * ledgerPageSize.value, ledgerTotal.value))

const ledgerTypeLabel = (type: LedgerEntry['type']): string => {
  const labels: Record<LedgerEntry['type'], string> = {
    inbound: '入庫',
    outbound: '出庫',
    reserve: '引当',
    release: '解放',
    adjustment: '調整',
    count: '棚卸',
  }
  return labels[type] || type
}

const loadLedgerEntries = async () => {
  ledgerLoading.value = true
  try {
    const result = await fetchLedgerEntries({
      type: ledgerTypeFilter.value || undefined,
      page: ledgerPage.value,
      limit: ledgerPageSize.value,
    })
    ledgerEntries.value = result.data
    ledgerTotal.value = result.total
  } catch (error: any) {
    showToast(error?.message || '台帳の取得に失敗しました', 'danger')
  } finally {
    ledgerLoading.value = false
  }
}

const handleLedgerFilterChange = () => {
  ledgerPage.value = 1
  loadLedgerEntries()
}

const handleLedgerPageSizeChange = () => {
  ledgerPage.value = 1
  loadLedgerEntries()
}

const goToLedgerPage = (page: number) => {
  ledgerPage.value = page
  loadLedgerEntries()
}

// ── Tab 3: Reservations ──
const reservations = ref<Reservation[]>([])
const reservationsTotal = ref(0)
const reservationsLoading = ref(false)
const reservationsPage = ref(1)
const reservationsPageSize = ref(20)

const reservationsTotalPages = computed(() => Math.max(1, Math.ceil(reservationsTotal.value / reservationsPageSize.value)))
const reservationsPaginationStart = computed(() => (reservationsTotal.value === 0 ? 0 : (reservationsPage.value - 1) * reservationsPageSize.value + 1))
const reservationsPaginationEnd = computed(() => Math.min(reservationsPage.value * reservationsPageSize.value, reservationsTotal.value))

const reservationStatusLabel = (status: Reservation['status']): string => {
  const labels: Record<Reservation['status'], string> = {
    active: '有効',
    fulfilled: '消込済',
    released: '解放済',
    expired: '期限切れ',
  }
  return labels[status] || status
}

const reservationSourceLabel = (source: Reservation['source']): string => {
  const labels: Record<Reservation['source'], string> = {
    order: '受注',
    shipment: '出荷',
    transfer: '移動',
    manual: '手動',
  }
  return labels[source] || source
}

const loadReservations = async () => {
  reservationsLoading.value = true
  try {
    const result = await fetchReservations({
      page: reservationsPage.value,
      limit: reservationsPageSize.value,
    })
    reservations.value = result.data
    reservationsTotal.value = result.total
  } catch (error: any) {
    showToast(error?.message || '引当の取得に失敗しました', 'danger')
  } finally {
    reservationsLoading.value = false
  }
}

const handleReservationsPageSizeChange = () => {
  reservationsPage.value = 1
  loadReservations()
}

const goToReservationsPage = (page: number) => {
  reservationsPage.value = page
  loadReservations()
}

const handleReleaseReservation = async (r: Reservation) => {
  try {
    await ElMessageBox.confirm(
      `引当（${r.productSku} x ${r.quantity}）を解放しますか？ / 确定要释放预留（${r.productSku} x ${r.quantity}）吗？`,
      '確認 / 确认',
      { confirmButtonText: '解放 / 释放', cancelButtonText: 'キャンセル / 取消', type: 'warning' },
    )
  } catch { return }
  try {
    await releaseReservation(r._id)
    showToast('引当を解放しました', 'success')
    await loadReservations()
  } catch (error: any) {
    showToast(error?.message || '引当の解放に失敗しました', 'danger')
  }
}

// ── Adjustment Dialog ──
const adjustmentDialogOpen = ref(false)

const emptyAdjustmentForm = () => ({
  productSku: '',
  quantity: 0,
  warehouseId: '',
  reason: '',
  memo: '',
})

const adjustmentForm = ref(emptyAdjustmentForm())

const openAdjustmentDialog = () => {
  adjustmentForm.value = emptyAdjustmentForm()
  adjustmentDialogOpen.value = true
}

const handleCreateAdjustment = async () => {
  if (!adjustmentForm.value.productSku.trim()) {
    showToast('商品SKUは必須です', 'danger')
    return
  }
  if (adjustmentForm.value.quantity === 0) {
    showToast('数量は0以外を指定してください', 'danger')
    return
  }

  try {
    await createLedgerEntry({
      productSku: adjustmentForm.value.productSku,
      type: 'adjustment',
      quantity: adjustmentForm.value.quantity,
      warehouseId: adjustmentForm.value.warehouseId || undefined,
      reason: adjustmentForm.value.reason || undefined,
      memo: adjustmentForm.value.memo || undefined,
    })
    showToast('調整エントリを作成しました', 'success')
    adjustmentDialogOpen.value = false
    await loadLedgerEntries()
  } catch (error: any) {
    showToast(error?.message || '調整エントリの作成に失敗しました', 'danger')
  }
}

// ── Helpers ──
const formatDateTime = (iso: string): string => {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ── Tab switching reloads data ──
watch(activeTab, (tab) => {
  if (tab === 'stock') loadStockLevels()
  else if (tab === 'ledger') loadLedgerEntries()
  else if (tab === 'reservations') loadReservations()
})

onMounted(() => {
  loadOverview()
  loadStockLevels()
})
</script>

<style>
@import '@/styles/order-table.css';
</style>

<style scoped>
.inventory-dashboard {
  padding: 0 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* KPI 概況カード / KPI概览卡片 */
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
.kpi-card { background: #fff; border: 1px solid var(--o-border-color, #e4e7ed); border-radius: 8px; padding: 16px; text-align: center; }
.kpi-card--warning { border-left: 4px solid #e6a23c; }
.kpi-card--danger { border-left: 4px solid #f56c6c; }
.kpi-value { font-size: 28px; font-weight: 700; color: var(--o-gray-800, #303133); }
.kpi-label { font-size: 12px; color: var(--o-gray-500, #909399); margin-top: 2px; }
.kpi-sub { font-size: 11px; color: var(--o-gray-400, #c0c4cc); margin-top: 2px; }
.kpi-sub--danger { color: #f56c6c; font-weight: 600; }

/* 期限切れ警告 / 过期警告 */
.expiry-alert-section { background: #fdf6ec; border: 1px solid #faecd8; border-radius: 8px; padding: 12px 16px; }
.expiry-alert-title { margin: 0 0 8px; font-size: 14px; font-weight: 600; color: #e6a23c; }
.expiry-alert-list { display: flex; flex-direction: column; gap: 6px; }
.expiry-alert-item { display: flex; gap: 12px; align-items: center; font-size: 13px; color: #606266; }
.expiry-sku { font-family: monospace; font-weight: 600; min-width: 100px; }
.expiry-name { flex: 1; }
.expiry-lot { font-size: 12px; color: #909399; }
.expiry-days { font-weight: 600; color: #e6a23c; }
.expiry-days--critical { color: #f56c6c; }

:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}

/* Tab header */
.tab-header {
  display: flex;
  gap: 0;
  border-bottom: 2px solid var(--o-border-color, #dcdfe6);
}

.tab-btn {
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  cursor: pointer;
  color: var(--o-gray-600, #606266);
  transition: color 0.2s, border-color 0.2s;
}

.tab-btn:hover {
  color: var(--o-primary, #714b67);
}

.tab-btn.active {
  color: var(--o-primary, #714b67);
  border-bottom-color: var(--o-primary, #714b67);
}

/* Filter section */
.filter-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Stock row color coding */
.row-danger {
  background-color: #fef0f0 !important;
}

.row-warning {
  background-color: #fdf6ec !important;
}

/* Ledger type tags */
.type-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.type-tag--inbound {
  background: #f0f9eb;
  color: #67c23a;
}

.type-tag--outbound {
  background: #fef0f0;
  color: #f56c6c;
}

.type-tag--reserve {
  background: #fdf6ec;
  color: #e6a23c;
}

.type-tag--release {
  background: #ecf5ff;
  color: #409eff;
}

.type-tag--adjustment {
  background: #f4f4f5;
  color: #909399;
}

.type-tag--count {
  background: #f3e8ff;
  color: #9333ea;
}

/* Quantity colors */
.qty-positive {
  color: #67c23a;
  font-weight: 600;
}

.qty-negative {
  color: #f56c6c;
  font-weight: 600;
}

/* Reservation status tags */
.status-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status-tag--active {
  background: #f0f9eb;
  color: #67c23a;
}

.status-tag--fulfilled {
  background: #f4f4f5;
  color: #909399;
}

.status-tag--released {
  background: #ecf5ff;
  color: #409eff;
}

.status-tag--expired {
  background: #fef0f0;
  color: #f56c6c;
}

/* Form */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 16px;
}

.form-field--full {
  grid-column: 1 / -1;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 4px;
  color: var(--o-gray-700, #303133);
}

.required {
  color: #dc2626;
}

.form-textarea {
  resize: vertical;
}
</style>
