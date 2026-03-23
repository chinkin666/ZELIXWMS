<template>
  <div class="serial-tracking">
    <PageHeader :title="t('wms.warehouse.serialTracking', 'シリアル番号管理')" :show-search="false">
      <template #actions>
        <Button variant="default" @click="openBulkCreate">{{ t('wms.warehouse.bulkCreate', '一括登録') }}</Button>
        <Button variant="default" @click="openCreate">{{ t('wms.warehouse.newCreate', '新規登録') }}</Button>
      </template>
    </PageHeader>

    <!-- Search bar -->
    <div class="search-section">
      <Input
        v-model="searchText"
        type="text"
       
        style="flex: 1; max-width: 400px;"
        :placeholder="t('wms.warehouse.searchSerialPlaceholder', 'シリアル番号で検索...')"
        @keydown.enter="handleSearch"
      />
      <Select :model-value="statusFilter || '__all__'" @update:model-value="(v: string) => { statusFilter = v === '__all__' ? '' : v; handleSearch() }">
        <SelectTrigger class="h-9 w-[160px]">
          <SelectValue :placeholder="t('wms.warehouse.allStatuses', '全ステータス')" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{{ t('wms.warehouse.allStatuses', '全ステータス') }}</SelectItem>
          <SelectItem value="available">{{ t('wms.warehouse.statusAvailable', '利用可能') }}</SelectItem>
          <SelectItem value="reserved">{{ t('wms.warehouse.statusReserved', '引当済') }}</SelectItem>
          <SelectItem value="shipped">{{ t('wms.warehouse.statusShipped', '出荷済') }}</SelectItem>
          <SelectItem value="returned">{{ t('wms.warehouse.statusReturned', '返品') }}</SelectItem>
          <SelectItem value="damaged">{{ t('wms.warehouse.statusDamaged', '破損') }}</SelectItem>
          <SelectItem value="scrapped">{{ t('wms.warehouse.statusScrapped', '廃棄') }}</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="default" @click="handleSearch">{{ t('wms.warehouse.search', '検索') }}</Button>
    </div>

    <!-- Table -->
    <div class="rounded-md border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead style="width: 180px">{{ t('wms.warehouse.serialNumber', 'シリアル番号') }}</TableHead>
            <TableHead style="width: 140px">{{ t('wms.warehouse.productId', '商品ID') }}</TableHead>
            <TableHead style="width: 100px">{{ t('wms.warehouse.status', 'ステータス') }}</TableHead>
            <TableHead style="width: 120px">{{ t('wms.warehouse.warehouseId', '倉庫ID') }}</TableHead>
            <TableHead style="width: 120px">{{ t('wms.warehouse.location', 'ロケーション') }}</TableHead>
            <TableHead style="width: 110px">{{ t('wms.warehouse.receivedDate', '入荷日') }}</TableHead>
            <TableHead style="width: 110px">{{ t('wms.warehouse.shippedDate', '出荷日') }}</TableHead>
            <TableHead style="width: 180px">{{ t('wms.common.actions', '操作') }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="loading">
            <TableCell colspan="8">
              <div class="space-y-3 p-4">
                <Skeleton class="h-4 w-[250px] mx-auto" />
                <Skeleton class="h-10 w-full" />
                <Skeleton class="h-10 w-full" />
                <Skeleton class="h-10 w-full" />
              </div>
            </TableCell>
          </TableRow>
          <TableRow v-else-if="serialNumbers.length === 0">
            <TableCell class="text-center py-8 text-muted-foreground" colspan="8">{{ t('wms.warehouse.noData', 'データがありません') }}</TableCell>
          </TableRow>
          <TableRow v-for="sn in serialNumbers" :key="sn._id">
            <TableCell>{{ sn.serialNumber }}</TableCell>
            <TableCell>{{ sn.productId }}</TableCell>
            <TableCell>
              <Badge variant="secondary" :class="statusClass(sn.status)">{{ snStatusLabel(sn.status) }}</Badge>
            </TableCell>
            <TableCell>{{ sn.warehouseId || '-' }}</TableCell>
            <TableCell>{{ sn.locationId || '-' }}</TableCell>
            <TableCell>{{ formatDate(sn.receivedAt) }}</TableCell>
            <TableCell>{{ formatDate(sn.shippedAt) }}</TableCell>
            <TableCell class="text-right">
              <Button variant="default" size="sm" @click="openEdit(sn)">{{ t('wms.common.edit', '編集') }}</Button>
              <Button
                v-if="sn.status !== 'scrapped'"
                variant="secondary"
                size="sm"
                @click="openStatusChange(sn)"
              >{{ t('wms.warehouse.changeStatus', 'ステータス変更') }}</Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- Pagination -->
    <div class="o-table-pagination">
      <span class="o-table-pagination__info">{{ t('wms.warehouse.paginationInfo', `全${total}件中 ${paginationStart}-${paginationEnd}件`) }}</span>
      <div class="o-table-pagination__controls">
        <Select :model-value="String(pageSize)" @update:model-value="(v: string) => { pageSize = Number(v); handlePageSizeChange() }">
          <SelectTrigger class="h-8 w-[80px] text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="secondary" size="sm" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">&lsaquo;</Button>
        <span class="o-table-pagination__page">{{ currentPage }} / {{ totalPages }}</span>
        <Button variant="secondary" size="sm" :disabled="currentPage >= totalPages" @click="goToPage(currentPage + 1)">&rsaquo;</Button>
      </div>
    </div>

    <!-- Create Dialog -->
    <Dialog :open="createDialogOpen" @update:open="createDialogOpen = $event">
      <DialogContent>
        <DialogHeader><DialogTitle>{{ t('wms.warehouse.createSerialTitle', 'シリアル番号を登録') }}</DialogTitle></DialogHeader>
      <div class="form-grid">
        <div class="form-field">
          <label>{{ t('wms.warehouse.serialNumber', 'シリアル番号') }} <span class="text-destructive text-xs">*</span></label>
          <Input v-model="createForm.serialNumber" type="text" />
        </div>
        <div class="form-field">
          <label>{{ t('wms.warehouse.productId', '商品ID') }} <span class="text-destructive text-xs">*</span></label>
          <Input v-model="createForm.productId" type="text" />
        </div>
        <div class="form-field">
          <label>{{ t('wms.warehouse.warehouseId', '倉庫ID') }}</label>
          <Input v-model="createForm.warehouseId" type="text" />
        </div>
        <div class="form-field">
          <label>{{ t('wms.warehouse.location', 'ロケーション') }}</label>
          <Input v-model="createForm.locationId" type="text" />
        </div>
        <div class="form-field">
          <label>{{ t('wms.warehouse.lotId', 'ロットID') }}</label>
          <Input v-model="createForm.lotId" type="text" />
        </div>
        <div class="form-field form-field--full">
          <label>{{ t('wms.warehouse.remarks', '備考') }}</label>
          <Textarea v-model="createForm.memo" class="form-textarea" rows="3" />
        </div>
      </div>
        <DialogFooter>
          <Button variant="secondary" @click="createDialogOpen = false">{{ t('wms.common.cancel', 'キャンセル') }}</Button>
          <Button variant="default" @click="handleCreate">{{ t('wms.common.confirm', '確定') }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Bulk Create Dialog -->
    <Dialog :open="bulkDialogOpen" @update:open="bulkDialogOpen = $event">
      <DialogContent>
        <DialogHeader><DialogTitle>{{ t('wms.warehouse.bulkCreateTitle', 'シリアル番号一括登録') }}</DialogTitle></DialogHeader>
      <div class="form-grid">
        <div class="form-field">
          <label>{{ t('wms.warehouse.productId', '商品ID') }} <span class="text-destructive text-xs">*</span></label>
          <Input v-model="bulkForm.productId" type="text" />
        </div>
        <div class="form-field">
          <label>{{ t('wms.warehouse.warehouseId', '倉庫ID') }}</label>
          <Input v-model="bulkForm.warehouseId" type="text" />
        </div>
        <div class="form-field form-field--full">
          <label>{{ t('wms.warehouse.serialNumbersPerLine', 'シリアル番号（1行に1つ）') }} <span class="text-destructive text-xs">*</span></label>
          <Textarea v-model="bulkForm.serialNumbersText" class="form-textarea" rows="8" placeholder="SN001&#10;SN002&#10;SN003" />
        </div>
        <div v-if="bulkResult" class="form-field form-field--full">
          <div class="bulk-result">
            <p class="bulk-result__success">{{ t('wms.warehouse.bulkSuccess', `${bulkResult.createdCount}件 登録成功`) }}</p>
            <p v-if="bulkResult.failCount > 0" class="bulk-result__fail">{{ t('wms.warehouse.bulkFail', `${bulkResult.failCount}件 失敗`) }}</p>
            <ul v-if="bulkResult.errors.length > 0" class="bulk-result__errors">
              <li v-for="(err, idx) in bulkResult.errors" :key="idx">{{ err.serialNumber }}: {{ err.message }}</li>
            </ul>
          </div>
        </div>
      </div>
        <DialogFooter>
          <Button variant="secondary" @click="bulkDialogOpen = false">{{ t('wms.common.cancel', 'キャンセル') }}</Button>
          <Button variant="default" @click="handleBulkCreate">{{ t('wms.common.confirm', '確定') }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Status Change Dialog -->
    <Dialog :open="statusDialogOpen" @update:open="statusDialogOpen = $event">
      <DialogContent>
        <DialogHeader><DialogTitle>{{ t('wms.warehouse.changeStatus', 'ステータス変更') }}</DialogTitle></DialogHeader>
      <div class="form-grid">
        <div class="form-field form-field--full">
          <label>{{ t('wms.warehouse.currentStatus', '現在のステータス') }}</label>
          <Badge variant="secondary" :class="statusClass(statusChangeTarget?.status || 'available')">{{ snStatusLabel(statusChangeTarget?.status || 'available') }}</Badge>
        </div>
        <div class="form-field form-field--full">
          <label>{{ t('wms.warehouse.newStatus', '新しいステータス') }}</label>
          <Select v-model="newStatus">
            <SelectTrigger class="h-9 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="available">{{ t('wms.warehouse.statusAvailable', '利用可能') }}</SelectItem>
              <SelectItem value="reserved">{{ t('wms.warehouse.statusReserved', '引当済') }}</SelectItem>
              <SelectItem value="shipped">{{ t('wms.warehouse.statusShipped', '出荷済') }}</SelectItem>
              <SelectItem value="returned">{{ t('wms.warehouse.statusReturned', '返品') }}</SelectItem>
              <SelectItem value="damaged">{{ t('wms.warehouse.statusDamaged', '破損') }}</SelectItem>
              <SelectItem value="scrapped">{{ t('wms.warehouse.statusScrapped', '廃棄') }}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
        <DialogFooter>
          <Button variant="secondary" @click="statusDialogOpen = false">{{ t('wms.common.cancel', 'キャンセル') }}</Button>
          <Button variant="default" @click="handleStatusChange">{{ t('wms.common.confirm', '確定') }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Edit Dialog -->
    <Dialog :open="editDialogOpen" @update:open="editDialogOpen = $event">
      <DialogContent>
        <DialogHeader><DialogTitle>{{ t('wms.warehouse.editSerialTitle', 'シリアル番号を編集') }}</DialogTitle></DialogHeader>
      <div class="form-grid">
        <div class="form-field">
          <label>{{ t('wms.warehouse.serialNumber', 'シリアル番号') }}</label>
          <Input :value="editForm.serialNumber" type="text" readonly disabled />
        </div>
        <div class="form-field">
          <label>{{ t('wms.warehouse.productId', '商品ID') }}</label>
          <Input :value="editForm.productId" type="text" readonly disabled />
        </div>
        <div class="form-field">
          <label>{{ t('wms.warehouse.warehouseId', '倉庫ID') }}</label>
          <Input v-model="editForm.warehouseId" type="text" />
        </div>
        <div class="form-field">
          <label>{{ t('wms.warehouse.location', 'ロケーション') }}</label>
          <Input v-model="editForm.locationId" type="text" />
        </div>
        <div class="form-field">
          <label>{{ t('wms.warehouse.lotId', 'ロットID') }}</label>
          <Input v-model="editForm.lotId" type="text" />
        </div>
        <div class="form-field form-field--full">
          <label>{{ t('wms.warehouse.remarks', '備考') }}</label>
          <Textarea v-model="editForm.memo" class="form-textarea" rows="3" />
        </div>
      </div>
        <DialogFooter>
          <Button variant="secondary" @click="editDialogOpen = false">{{ t('wms.common.cancel', 'キャンセル') }}</Button>
          <Button variant="default" @click="handleEdit">{{ t('wms.common.confirm', '確定') }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/shared/PageHeader.vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  fetchSerialNumbers,
  createSerialNumber,
  bulkCreateSerialNumbers,
  updateSerialNumber,
  updateSerialNumberStatus,
  type SerialNumber,
  type BulkCreateResult,
} from '@/api/serialNumber'
import { ref, computed, onMounted } from 'vue'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
const { t } = useI18n()
const { show: showToast } = useToast()

// State
const serialNumbers = ref<SerialNumber[]>([])
const total = ref(0)
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)
const searchText = ref('')
const statusFilter = ref('')

// Computed
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
const paginationStart = computed(() => (total.value === 0 ? 0 : (currentPage.value - 1) * pageSize.value + 1))
const paginationEnd = computed(() => Math.min(currentPage.value * pageSize.value, total.value))

// Status helpers
const snStatusLabel = (status: string): string => {
  const map: Record<string, string> = {
    available: t('wms.warehouse.statusAvailable', '利用可能'),
    reserved: t('wms.warehouse.statusReserved', '引当済'),
    shipped: t('wms.warehouse.statusShipped', '出荷済'),
    returned: t('wms.warehouse.statusReturned', '返品'),
    damaged: t('wms.warehouse.statusDamaged', '破損'),
    scrapped: t('wms.warehouse.statusScrapped', '廃棄'),
  }
  return map[status] || status
}

const statusClass = (status: string): string => {
  const map: Record<string, string> = {
    available: 'available',
    reserved: 'reserved',
    shipped: 'shipped',
    returned: 'returned',
    damaged: 'damaged',
    scrapped: 'scrapped',
  }
  return map[status] || 'available'
}

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('ja-JP')
}

// Load
const loadList = async () => {
  loading.value = true
  try {
    const result = await fetchSerialNumbers({
      search: searchText.value || undefined,
      status: statusFilter.value || undefined,
      page: currentPage.value,
      limit: pageSize.value,
    })
    serialNumbers.value = result?.data ?? []
    total.value = result?.total ?? 0
  } catch (error: any) {
    showToast(error?.message || t('wms.warehouse.fetchFailed', '取得に失敗しました'), 'danger')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  currentPage.value = 1
  loadList()
}

const handlePageSizeChange = () => {
  currentPage.value = 1
  loadList()
}

const goToPage = (page: number) => {
  currentPage.value = page
  loadList()
}

// Create Dialog
const createDialogOpen = ref(false)

const emptyCreateForm = () => ({
  serialNumber: '',
  productId: '',
  warehouseId: '',
  locationId: '',
  lotId: '',
  memo: '',
})

const createForm = ref(emptyCreateForm())

const openCreate = () => {
  createForm.value = emptyCreateForm()
  createDialogOpen.value = true
}

const handleCreate = async () => {
  if (!createForm.value.serialNumber.trim()) {
    showToast(t('wms.warehouse.serialRequired', 'シリアル番号は必須です'), 'danger')
    return
  }
  if (!createForm.value.productId.trim()) {
    showToast(t('wms.warehouse.productIdRequired', '商品IDは必須です'), 'danger')
    return
  }
  try {
    await createSerialNumber({ ...createForm.value })
    showToast(t('wms.warehouse.registered', '登録しました'), 'success')
    createDialogOpen.value = false
    await loadList()
  } catch (error: any) {
    showToast(error?.message || t('wms.warehouse.registerFailed', '登録に失敗しました'), 'danger')
  }
}

// Bulk Create Dialog
const bulkDialogOpen = ref(false)
const bulkResult = ref<BulkCreateResult | null>(null)

const emptyBulkForm = () => ({
  productId: '',
  warehouseId: '',
  serialNumbersText: '',
})

const bulkForm = ref(emptyBulkForm())

const openBulkCreate = () => {
  bulkForm.value = emptyBulkForm()
  bulkResult.value = null
  bulkDialogOpen.value = true
}

const handleBulkCreate = async () => {
  if (!bulkForm.value.productId.trim()) {
    showToast(t('wms.warehouse.productIdRequired', '商品IDは必須です'), 'danger')
    return
  }
  const lines = bulkForm.value.serialNumbersText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
  if (lines.length === 0) {
    showToast(t('wms.warehouse.enterSerials', 'シリアル番号を入力してください'), 'danger')
    return
  }
  try {
    const serialNumberEntries = lines.map((sn) => ({
      serialNumber: sn,
      productId: bulkForm.value.productId,
      warehouseId: bulkForm.value.warehouseId || undefined,
    }))
    const result = await bulkCreateSerialNumbers({ serialNumbers: serialNumberEntries })
    bulkResult.value = result
    showToast(
      t('wms.warehouse.bulkRegistered', `${result.createdCount}件登録しました${result.failCount > 0 ? ` (${result.failCount}件失敗)` : ''}`),
      result.failCount > 0 ? 'warning' : 'success',
    )
    await loadList()
  } catch (error: any) {
    showToast(error?.message || t('wms.warehouse.bulkRegisterFailed', '一括登録に失敗しました'), 'danger')
  }
}

// Status Change Dialog
const statusDialogOpen = ref(false)
const statusChangeTarget = ref<SerialNumber | null>(null)
const newStatus = ref('available')

const openStatusChange = (sn: SerialNumber) => {
  statusChangeTarget.value = sn
  newStatus.value = sn.status
  statusDialogOpen.value = true
}

const handleStatusChange = async () => {
  if (!statusChangeTarget.value) return
  try {
    await updateSerialNumberStatus(statusChangeTarget.value._id, { status: newStatus.value })
    showToast(t('wms.warehouse.statusChanged', 'ステータスを変更しました'), 'success')
    statusDialogOpen.value = false
    await loadList()
  } catch (error: any) {
    showToast(error?.message || t('wms.warehouse.statusChangeFailed', 'ステータス変更に失敗しました'), 'danger')
  }
}

// Edit Dialog
const editDialogOpen = ref(false)
const editingId = ref<string | null>(null)

const emptyEditForm = () => ({
  serialNumber: '',
  productId: '',
  warehouseId: '',
  locationId: '',
  lotId: '',
  memo: '',
})

const editForm = ref(emptyEditForm())

const openEdit = (sn: SerialNumber) => {
  editingId.value = sn._id
  editForm.value = {
    serialNumber: sn.serialNumber,
    productId: sn.productId,
    warehouseId: sn.warehouseId || '',
    locationId: sn.locationId || '',
    lotId: sn.lotId || '',
    memo: sn.memo || '',
  }
  editDialogOpen.value = true
}

const handleEdit = async () => {
  if (!editingId.value) return
  try {
    await updateSerialNumber(editingId.value, {
      warehouseId: editForm.value.warehouseId,
      locationId: editForm.value.locationId,
      lotId: editForm.value.lotId,
      memo: editForm.value.memo,
    })
    showToast(t('wms.warehouse.updated', '更新しました'), 'success')
    editDialogOpen.value = false
    await loadList()
  } catch (error: any) {
    showToast(error?.message || t('wms.warehouse.updateFailed', '更新に失敗しました'), 'danger')
  }
}

onMounted(() => {
  loadList()
})
</script>

<style>
@import '@/styles/order-table.css';
</style>

<style scoped>
.serial-tracking {
  padding: 0 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}

/* Search section */
.search-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Status tags */
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

/* Bulk result */
.bulk-result {
  border: 1px solid var(--o-border-color, #dcdfe6);
  border-radius: var(--o-border-radius, 4px);
  padding: 12px;
  background: var(--o-gray-100, #f8f9fa);
}

.bulk-result__success {
  margin: 0;
  color: #2e7d32;
  font-weight: 500;
}

.bulk-result__fail {
  margin: 4px 0 0;
  color: #f56c6c;
  font-weight: 500;
}

.bulk-result__errors {
  margin: 8px 0 0;
  padding-left: 20px;
  font-size: 12px;
  color: var(--o-gray-600, #606266);
}
</style>
