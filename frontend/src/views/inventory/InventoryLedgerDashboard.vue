<template>
  <div class="inventory-dashboard">
    <PageHeader :title="t('wms.inventory.dashboard', '在庫ダッシュボード（台帳）')" :show-search="false">
      <template #actions>
        <Button v-if="activeTab === 'ledger'" variant="default" @click="openAdjustmentDialog">{{ t('wms.inventory.manualAdjustment', '手動調整') }}</Button>
      </template>
    </PageHeader>

    <!-- KPI 概況カード / KPI概览卡片 -->
    <div v-if="overview && overview.productCount != null" class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-value">{{ overview.productCount }}</div>
        <div class="kpi-label">商品数</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">{{ overview.totalQuantity.toLocaleString() }}</div>
        <div class="kpi-label">総在庫数</div>
        <div class="kpi-sub">引当: {{ overview.totalReserved ?? 0 }} / 有効: {{ overview.availableQuantity ?? 0 }}</div>
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
        <div class="kpi-value">{{ overview.locationUsage?.percent ?? 0 }}%</div>
        <div class="kpi-label">ロケーション使用率</div>
        <div class="kpi-sub">{{ overview.locationUsage?.used ?? 0 }} / {{ overview.locationUsage?.total ?? 0 }}</div>
      </div>
    </div>

    <!-- 期限切れ近い商品 / 即将过期商品 -->
    <div v-if="overview && overview.expiringDetails && overview.expiringDetails.length > 0" class="expiry-alert-section">
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
      <Button :class="['tab-btn', { active: activeTab === 'stock' }]" @click="activeTab = 'stock'">{{ t('wms.inventory.stockLevels', '在庫水位') }}</Button>
      <Button :class="['tab-btn', { active: activeTab === 'ledger' }]" @click="activeTab = 'ledger'">{{ t('wms.inventory.ledger', '在庫台帳') }}</Button>
      <Button :class="['tab-btn', { active: activeTab === 'reservations' }]" @click="activeTab = 'reservations'">{{ t('wms.inventory.reservationList', '引当一覧') }}</Button>
    </div>

    <!-- Tab 1: Stock Levels -->
    <div v-if="activeTab === 'stock'">
      <div class="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead style="width: 160px">{{ t('wms.inventory.productSku', '商品SKU') }}</TableHead>
              <TableHead style="width: 240px">{{ t('wms.inventory.productName', '商品名') }}</TableHead>
              <TableHead style="width: 120px; text-align: right">{{ t('wms.inventory.totalStock', '総在庫') }}</TableHead>
              <TableHead style="width: 120px; text-align: right">{{ t('wms.inventory.reserved', '引当済') }}</TableHead>
              <TableHead style="width: 120px; text-align: right">{{ t('wms.inventory.availableStock', '有効在庫') }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="stockLoading">
              <TableCell colspan="5">
                <div class="space-y-3 p-4">
                  <Skeleton class="h-4 w-[250px] mx-auto" />
                  <Skeleton class="h-10 w-full" />
                  <Skeleton class="h-10 w-full" />
                  <Skeleton class="h-10 w-full" />
                </div>
              </TableCell>
            </TableRow>
            <TableRow v-else-if="stockLevels.length === 0">
              <TableCell class="text-center py-8 text-muted-foreground" colspan="5">{{ t('wms.common.noData', 'データがありません') }}</TableCell>
            </TableRow>
            <TableRow
              v-for="s in stockLevels"
              :key="s.productId"

              :class="stockRowClass(s)"
            >
              <TableCell>{{ s.productSku }}</TableCell>
              <TableCell>{{ s.productName || '-' }}</TableCell>
              <TableCell style="text-align: right">{{ s.totalStock }}</TableCell>
              <TableCell style="text-align: right">{{ s.reservedStock }}</TableCell>
              <TableCell style="text-align: right; font-weight: 600">{{ s.availableStock }}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <!-- Stock Pagination -->
      <div class="o-table-pagination">
        <span class="o-table-pagination__info">{{ t('wms.common.paginationInfo', '全{total}件中 {start}-{end}件').replace('{total}', String(stockTotal)).replace('{start}', String(stockPaginationStart)).replace('{end}', String(stockPaginationEnd)) }}</span>
        <div class="o-table-pagination__controls">
          <Select :model-value="String(stockPageSize)" @update:model-value="(v: string) => { stockPageSize = Number(v); handleStockPageSizeChange() }">
            <SelectTrigger class="h-8 text-sm" style="width:80px;"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="secondary" size="sm" :disabled="stockPage <= 1" @click="goToStockPage(stockPage - 1)">&lsaquo;</Button>
          <span class="o-table-pagination__page">{{ stockPage }} / {{ stockTotalPages }}</span>
          <Button variant="secondary" size="sm" :disabled="stockPage >= stockTotalPages" @click="goToStockPage(stockPage + 1)">&rsaquo;</Button>
        </div>
      </div>
    </div>

    <!-- Tab 2: Ledger History -->
    <div v-if="activeTab === 'ledger'">
      <!-- Filters -->
      <div class="filter-section">
        <Select :model-value="ledgerTypeFilter || '__all__'" @update:model-value="(v: string) => { ledgerTypeFilter = v === '__all__' ? '' : v; handleLedgerFilterChange() }">
          <SelectTrigger style="width: 160px"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{{ t('wms.inventory.allTypes', '全タイプ') }}</SelectItem>
            <SelectItem value="inbound">{{ t('wms.inventory.inbound', '入庫') }}</SelectItem>
            <SelectItem value="outbound">{{ t('wms.inventory.outbound', '出庫') }}</SelectItem>
            <SelectItem value="reserve">{{ t('wms.inventory.reserve', '引当') }}</SelectItem>
            <SelectItem value="release">{{ t('wms.inventory.release', '解放') }}</SelectItem>
            <SelectItem value="adjustment">{{ t('wms.inventory.adjustment', '調整') }}</SelectItem>
            <SelectItem value="count">{{ t('wms.inventory.count', '棚卸') }}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead style="width: 160px">{{ t('wms.inventory.dateTime', '日時') }}</TableHead>
              <TableHead style="width: 140px">{{ t('wms.inventory.productSku', '商品SKU') }}</TableHead>
              <TableHead style="width: 100px">{{ t('wms.inventory.type', 'タイプ') }}</TableHead>
              <TableHead style="width: 100px; text-align: right">{{ t('wms.inventory.quantity', '数量') }}</TableHead>
              <TableHead style="width: 140px">{{ t('wms.inventory.referenceNumber', '参照番号') }}</TableHead>
              <TableHead style="width: 120px">{{ t('wms.inventory.executedBy', '実行者') }}</TableHead>
              <TableHead>{{ t('wms.inventory.memo', '備考') }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="ledgerLoading">
              <TableCell colspan="7">
                <div class="space-y-3 p-4">
                  <Skeleton class="h-4 w-[250px] mx-auto" />
                  <Skeleton class="h-10 w-full" />
                  <Skeleton class="h-10 w-full" />
                  <Skeleton class="h-10 w-full" />
                </div>
              </TableCell>
            </TableRow>
            <TableRow v-else-if="ledgerEntries.length === 0">
              <TableCell class="text-center py-8 text-muted-foreground" colspan="7">{{ t('wms.common.noData', 'データがありません') }}</TableCell>
            </TableRow>
            <TableRow v-for="e in ledgerEntries" :key="e._id">
              <TableCell>{{ formatDateTime(e.createdAt) }}</TableCell>
              <TableCell>{{ e.productSku }}</TableCell>
              <TableCell>
                <span :class="['type-tag', `type-tag--${e.type}`]">{{ ledgerTypeLabel(e.type) }}</span>
              </TableCell>
              <TableCell style="text-align: right">
                <span :class="e.quantity >= 0 ? 'qty-positive' : 'qty-negative'">
                  {{ e.quantity >= 0 ? `+${e.quantity}` : e.quantity }}
                </span>
              </TableCell>
              <TableCell>{{ e.referenceNumber || '-' }}</TableCell>
              <TableCell>{{ e.executedBy || '-' }}</TableCell>
              <TableCell>{{ e.memo || '-' }}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <!-- Ledger Pagination -->
      <div class="o-table-pagination">
        <span class="o-table-pagination__info">{{ t('wms.common.paginationInfo', '全{total}件中 {start}-{end}件').replace('{total}', String(ledgerTotal)).replace('{start}', String(ledgerPaginationStart)).replace('{end}', String(ledgerPaginationEnd)) }}</span>
        <div class="o-table-pagination__controls">
          <Select :model-value="String(ledgerPageSize)" @update:model-value="(v: string) => { ledgerPageSize = Number(v); handleLedgerPageSizeChange() }">
            <SelectTrigger class="h-8 text-sm" style="width:80px;"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="secondary" size="sm" :disabled="ledgerPage <= 1" @click="goToLedgerPage(ledgerPage - 1)">&lsaquo;</Button>
          <span class="o-table-pagination__page">{{ ledgerPage }} / {{ ledgerTotalPages }}</span>
          <Button variant="secondary" size="sm" :disabled="ledgerPage >= ledgerTotalPages" @click="goToLedgerPage(ledgerPage + 1)">&rsaquo;</Button>
        </div>
      </div>
    </div>

    <!-- Tab 3: Reservations -->
    <div v-if="activeTab === 'reservations'">
      <div class="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead style="width: 140px">{{ t('wms.inventory.productSku', '商品SKU') }}</TableHead>
              <TableHead style="width: 100px; text-align: right">{{ t('wms.inventory.quantity', '数量') }}</TableHead>
              <TableHead style="width: 100px">{{ t('wms.inventory.reservationStatus', 'ステータス') }}</TableHead>
              <TableHead style="width: 100px">{{ t('wms.inventory.source', 'ソース') }}</TableHead>
              <TableHead style="width: 140px">{{ t('wms.inventory.referenceNumber', '参照番号') }}</TableHead>
              <TableHead style="width: 160px">{{ t('wms.inventory.expiresAt', '有効期限') }}</TableHead>
              <TableHead style="width: 100px">{{ t('wms.common.actions', '操作') }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="reservationsLoading">
              <TableCell colspan="7">
                <div class="space-y-3 p-4">
                  <Skeleton class="h-4 w-[250px] mx-auto" />
                  <Skeleton class="h-10 w-full" />
                  <Skeleton class="h-10 w-full" />
                  <Skeleton class="h-10 w-full" />
                </div>
              </TableCell>
            </TableRow>
            <TableRow v-else-if="reservations.length === 0">
              <TableCell class="text-center py-8 text-muted-foreground" colspan="7">{{ t('wms.common.noData', 'データがありません') }}</TableCell>
            </TableRow>
            <TableRow v-for="r in reservations" :key="r._id">
              <TableCell>{{ r.productSku }}</TableCell>
              <TableCell style="text-align: right">{{ r.quantity }}</TableCell>
              <TableCell>
                <span :class="['status-tag', `status-tag--${r.status}`]">{{ reservationStatusLabel(r.status) }}</span>
              </TableCell>
              <TableCell>{{ reservationSourceLabel(r.source) }}</TableCell>
              <TableCell>{{ r.referenceNumber || '-' }}</TableCell>
              <TableCell>{{ r.expiresAt ? formatDateTime(r.expiresAt) : '-' }}</TableCell>
              <TableCell>
                <Button
                  v-if="r.status === 'active'"
                  variant="secondary"
                  size="sm"
                  @click="handleReleaseReservation(r)"
                >{{ t('wms.inventory.release', '解放') }}</Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <!-- Reservations Pagination -->
      <div class="o-table-pagination">
        <span class="o-table-pagination__info">{{ t('wms.common.paginationInfo', '全{total}件中 {start}-{end}件').replace('{total}', String(reservationsTotal)).replace('{start}', String(reservationsPaginationStart)).replace('{end}', String(reservationsPaginationEnd)) }}</span>
        <div class="o-table-pagination__controls">
          <Select :model-value="String(reservationsPageSize)" @update:model-value="(v: string) => { reservationsPageSize = Number(v); handleReservationsPageSizeChange() }">
            <SelectTrigger class="h-8 text-sm" style="width:80px;"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="secondary" size="sm" :disabled="reservationsPage <= 1" @click="goToReservationsPage(reservationsPage - 1)">&lsaquo;</Button>
          <span class="o-table-pagination__page">{{ reservationsPage }} / {{ reservationsTotalPages }}</span>
          <Button variant="secondary" size="sm" :disabled="reservationsPage >= reservationsTotalPages" @click="goToReservationsPage(reservationsPage + 1)">&rsaquo;</Button>
        </div>
      </div>
    </div>

    <!-- Adjustment Dialog -->
    <Dialog :open="adjustmentDialogOpen" @update:open="adjustmentDialogOpen = $event">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('wms.inventory.manualAdjustment', '手動調整') }}</DialogTitle>
        </DialogHeader>
        <div class="form-grid">
          <div class="form-field">
            <label>{{ t('wms.inventory.productSku', '商品SKU') }} <span class="text-destructive text-xs">*</span></label>
            <Input v-model="adjustmentForm.productSku" type="text" />
          </div>
          <div class="form-field">
            <label>{{ t('wms.inventory.quantity', '数量') }} <span class="text-destructive text-xs">*</span></label>
            <Input v-model.number="adjustmentForm.quantity" type="number" />
          </div>
          <div class="form-field">
            <label>{{ t('wms.inventory.warehouseId', '倉庫ID') }}</label>
            <Input v-model="adjustmentForm.warehouseId" type="text" />
          </div>
          <div class="form-field">
            <label>{{ t('wms.inventory.reason', '理由') }}</label>
            <Input v-model="adjustmentForm.reason" type="text" />
          </div>
          <div class="form-field form-field--full">
            <label>{{ t('wms.inventory.memo', '備考') }}</label>
            <Textarea v-model="adjustmentForm.memo" class="form-textarea" rows="3" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" @click="adjustmentDialogOpen = false">{{ t('wms.common.cancel', 'キャンセル') }}</Button>
          <Button variant="default" @click="handleCreateAdjustment">{{ t('wms.common.confirm', '確定') }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { ref, computed, onMounted, watch } from 'vue'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/shared/PageHeader.vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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
import { useConfirmDialog } from '@/composables/useConfirmDialog'
const { confirm } = useConfirmDialog()

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
    stockLevels.value = result?.data ?? []
    stockTotal.value = result?.total ?? 0
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
    ledgerEntries.value = result?.data ?? []
    ledgerTotal.value = result?.total ?? 0
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
    reservations.value = result?.data ?? []
    reservationsTotal.value = result?.total ?? 0
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
  if (!(await confirm('この操作を実行しますか？'))) return
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
