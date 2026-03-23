<template>
  <div class="wave-management">
    <PageHeader :title="t('wms.warehouse.waveManagement', 'ウェーブ管理')" :show-search="false">
      <template #actions>
        <Button variant="default" @click="openCreate">{{ t('wms.warehouse.newWave', '新規ウェーブ') }}</Button>
      </template>
    </PageHeader>

    <!-- Filter bar -->
    <div class="search-section">
      <Input
        v-model="searchText"
        type="text"
       
        style="flex: 1; max-width: 300px;"
        :placeholder="t('wms.warehouse.searchWavePlaceholder', 'ウェーブ番号で検索...')"
        @keydown.enter="handleSearch"
      />
      <Select :model-value="filterStatus || '__all__'" @update:model-value="(v: string) => filterStatus = v === '__all__' ? '' : v">
        <SelectTrigger class="h-9 w-[160px]">
          <SelectValue :placeholder="t('wms.warehouse.allStatuses', '全ステータス')" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{{ t('wms.warehouse.allStatuses', '全ステータス') }}</SelectItem>
          <SelectItem value="draft">{{ t('wms.warehouse.waveStatusDraft', '下書き') }}</SelectItem>
          <SelectItem value="picking">{{ t('wms.warehouse.waveStatusPicking', 'ピッキング中') }}</SelectItem>
          <SelectItem value="sorting">{{ t('wms.warehouse.waveStatusSorting', '仕分け中') }}</SelectItem>
          <SelectItem value="packing">{{ t('wms.warehouse.waveStatusPacking', '梱包中') }}</SelectItem>
          <SelectItem value="completed">{{ t('wms.warehouse.waveStatusCompleted', '完了') }}</SelectItem>
          <SelectItem value="cancelled">{{ t('wms.warehouse.waveStatusCancelled', 'キャンセル') }}</SelectItem>
        </SelectContent>
      </Select>
      <Select :model-value="filterPriority || '__all__'" @update:model-value="(v: string) => filterPriority = v === '__all__' ? '' : v">
        <SelectTrigger class="h-9 w-[130px]">
          <SelectValue :placeholder="t('wms.warehouse.allPriorities', '全優先度')" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{{ t('wms.warehouse.allPriorities', '全優先度') }}</SelectItem>
          <SelectItem value="urgent">{{ t('wms.warehouse.priorityUrgent', '緊急') }}</SelectItem>
          <SelectItem value="high">{{ t('wms.warehouse.priorityHigh', '高') }}</SelectItem>
          <SelectItem value="normal">{{ t('wms.warehouse.priorityNormal', '通常') }}</SelectItem>
          <SelectItem value="low">{{ t('wms.warehouse.priorityLow', '低') }}</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="default" @click="handleSearch">{{ t('wms.warehouse.search', '検索') }}</Button>
    </div>

    <!-- Wave table -->
    <div class="rounded-md border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead style="width: 160px">{{ t('wms.warehouse.waveNumber', 'ウェーブ番号') }}</TableHead>
            <TableHead style="width: 120px">{{ t('wms.warehouse.status', 'ステータス') }}</TableHead>
            <TableHead style="width: 90px">{{ t('wms.warehouse.priority', '優先度') }}</TableHead>
            <TableHead style="width: 90px">{{ t('wms.warehouse.shipmentCount', '出荷件数') }}</TableHead>
            <TableHead style="width: 80px">アイテム数</TableHead>
            <TableHead style="width: 100px">倉庫</TableHead>
            <TableHead style="width: 120px">{{ t('wms.warehouse.assignee', '担当者') }}</TableHead>
            <TableHead style="width: 160px">{{ t('wms.warehouse.startedAt', '開始日時') }}</TableHead>
            <TableHead style="width: 160px">{{ t('wms.warehouse.completedAt', '完了日時') }}</TableHead>
            <TableHead style="width: 200px">{{ t('wms.common.actions', '操作') }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="loading">
            <TableCell colspan="10">
              <div class="space-y-3 p-4">
                <Skeleton class="h-4 w-[250px] mx-auto" />
                <Skeleton class="h-10 w-full" />
                <Skeleton class="h-10 w-full" />
                <Skeleton class="h-10 w-full" />
              </div>
            </TableCell>
          </TableRow>
          <TableRow v-else-if="waves.length === 0">
            <TableCell class="text-center py-8 text-muted-foreground" colspan="10">{{ t('wms.warehouse.noData', 'データがありません') }}</TableCell>
          </TableRow>
          <TableRow v-for="w in waves" :key="w._id">
            <TableCell>{{ w.waveNumber }}</TableCell>
            <TableCell>
              <Badge variant="secondary" :class="statusTagClass(w.status)">{{ waveStatusLabel(w.status) }}</Badge>
            </TableCell>
            <TableCell>
              <Badge variant="secondary" :class="priorityTagClass(w.priority)">{{ wavePriorityLabel(w.priority) }}</Badge>
            </TableCell>
            <TableCell style="text-align: center">{{ w.shipmentIds?.length ?? 0 }}</TableCell>
            <TableCell style="text-align: center">{{ w.totalItems ?? '-' }}</TableCell>
            <TableCell>{{ w.warehouseName ?? '-' }}</TableCell>
            <TableCell>{{ w.assignedName || '-' }}</TableCell>
            <TableCell>{{ formatDateTime(w.startedAt) }}</TableCell>
            <TableCell>{{ formatDateTime(w.completedAt) }}</TableCell>
            <TableCell class="text-right">
              <template v-if="w.status === 'draft'">
                <Button variant="default" size="sm" @click="handleStart(w)">{{ t('wms.warehouse.start', '開始') }}</Button>
                <Button variant="default" size="sm" @click="openEdit(w)">{{ t('wms.common.edit', '編集') }}</Button>
                <Button variant="destructive" size="sm" @click="confirmDelete(w)">{{ t('wms.common.delete', '削除') }}</Button>
              </template>
              <template v-else-if="w.status === 'picking' || w.status === 'sorting' || w.status === 'packing'">
                <Button variant="default" size="sm" @click="handleComplete(w)">{{ t('wms.warehouse.waveComplete', '完了') }}</Button>
              </template>
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

    <!-- Create/Edit Dialog -->
    <Dialog :open="dialogOpen" @update:open="dialogOpen = $event">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ isEditing ? t('wms.warehouse.editWaveTitle', 'ウェーブを編集') : t('wms.warehouse.createWaveTitle', 'ウェーブを追加') }}</DialogTitle>
        </DialogHeader>
      <div class="form-grid">
        <div class="form-field">
          <label>{{ t('wms.warehouse.waveNumber', 'ウェーブ番号') }} <span class="text-destructive text-xs">*</span></label>
          <Input v-model="form.waveNumber" type="text" />
        </div>
        <div class="form-field">
          <label>{{ t('wms.warehouse.warehouseId', '倉庫ID') }} <span class="text-destructive text-xs">*</span></label>
          <Input v-model="form.warehouseId" type="text" />
        </div>
        <div class="form-field">
          <label>{{ t('wms.warehouse.priority', '優先度') }}</label>
          <Select v-model="form.priority">
            <SelectTrigger class="h-9 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="urgent">{{ t('wms.warehouse.priorityUrgent', '緊急') }}</SelectItem>
              <SelectItem value="high">{{ t('wms.warehouse.priorityHigh', '高') }}</SelectItem>
              <SelectItem value="normal">{{ t('wms.warehouse.priorityNormal', '通常') }}</SelectItem>
              <SelectItem value="low">{{ t('wms.warehouse.priorityLow', '低') }}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="form-field">
          <label>{{ t('wms.warehouse.assigneeId', '担当者ID') }}</label>
          <Input v-model="form.assignedTo" type="text" />
        </div>
        <div class="form-field">
          <label>{{ t('wms.warehouse.assigneeName', '担当者名') }}</label>
          <Input v-model="form.assignedName" type="text" />
        </div>
        <div class="form-field form-field--full">
          <label>{{ t('wms.warehouse.remarks', '備考') }}</label>
          <Textarea v-model="form.memo" class="form-textarea" rows="3" />
        </div>
      </div>
        <DialogFooter>
          <Button variant="secondary" @click="dialogOpen = false">{{ t('wms.common.cancel', 'キャンセル') }}</Button>
          <Button variant="default" @click="handleSave">{{ t('wms.common.confirm', '確定') }}</Button>
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
  fetchWaves,
  createWave,
  updateWave,
  deleteWave,
  startWave,
  completeWave,
  type Wave,
} from '@/api/wave'
import { ref, computed, onMounted } from 'vue'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
const { confirm } = useConfirmDialog()
const { t } = useI18n()
const { show: showToast } = useToast()

// State
const waves = ref<Wave[]>([])
const total = ref(0)
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)
const searchText = ref('')
const filterStatus = ref('')
const filterPriority = ref('')

// Dialog
const dialogOpen = ref(false)
const editingId = ref<string | null>(null)
const isEditing = computed(() => !!editingId.value)

const emptyForm = () => ({
  waveNumber: '',
  warehouseId: '',
  priority: 'normal' as Wave['priority'],
  assignedTo: '',
  assignedName: '',
  memo: '',
})

const form = ref(emptyForm())

// Computed
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
const paginationStart = computed(() => (total.value === 0 ? 0 : (currentPage.value - 1) * pageSize.value + 1))
const paginationEnd = computed(() => Math.min(currentPage.value * pageSize.value, total.value))

// Labels & tag classes
const waveStatusLabel = (status: Wave['status']): string => {
  const map: Record<Wave['status'], string> = {
    draft: t('wms.warehouse.waveStatusDraft', '下書き'),
    picking: t('wms.warehouse.waveStatusPicking', 'ピッキング中'),
    sorting: t('wms.warehouse.waveStatusSorting', '仕分け中'),
    packing: t('wms.warehouse.waveStatusPacking', '梱包中'),
    completed: t('wms.warehouse.waveStatusCompleted', '完了'),
    cancelled: t('wms.warehouse.waveStatusCancelled', 'キャンセル'),
  }
  return map[status] || status
}

const statusTagClass = (status: Wave['status']): string => {
  const map: Record<Wave['status'], string> = {
    draft: 'wave-tag--gray',
    picking: 'wave-tag--blue',
    sorting: 'wave-tag--orange',
    packing: 'wave-tag--cyan',
    completed: 'wave-tag--green',
    cancelled: 'wave-tag--red',
  }
  return map[status] || ''
}

const wavePriorityLabel = (priority: Wave['priority']): string => {
  const map: Record<Wave['priority'], string> = {
    urgent: t('wms.warehouse.priorityUrgent', '緊急'),
    high: t('wms.warehouse.priorityHigh', '高'),
    normal: t('wms.warehouse.priorityNormal', '通常'),
    low: t('wms.warehouse.priorityLow', '低'),
  }
  return map[priority] || priority
}

const priorityTagClass = (priority: Wave['priority']): string => {
  const map: Record<Wave['priority'], string> = {
    urgent: 'wave-tag--red',
    high: 'wave-tag--orange',
    normal: 'wave-tag--blue',
    low: 'wave-tag--gray',
  }
  return map[priority] || ''
}

const formatDateTime = (dateStr?: string): string => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Load
const loadList = async () => {
  loading.value = true
  try {
    const result = await fetchWaves({
      search: searchText.value || undefined,
      status: filterStatus.value || undefined,
      priority: filterPriority.value || undefined,
      page: currentPage.value,
      limit: pageSize.value,
    })
    waves.value = result?.data ?? []
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

// CRUD
const openCreate = () => {
  editingId.value = null
  form.value = emptyForm()
  dialogOpen.value = true
}

const openEdit = (w: Wave) => {
  editingId.value = w._id
  form.value = {
    waveNumber: w.waveNumber,
    warehouseId: w.warehouseId || '',
    priority: w.priority,
    assignedTo: w.assignedTo || '',
    assignedName: w.assignedName || '',
    memo: w.memo || '',
  }
  dialogOpen.value = true
}

const handleSave = async () => {
  if (!form.value.waveNumber.trim()) {
    showToast(t('wms.warehouse.waveNumberRequired', 'ウェーブ番号は必須です'), 'danger')
    return
  }
  if (!form.value.warehouseId.trim()) {
    showToast(t('wms.warehouse.warehouseIdRequired', '倉庫IDは必須です'), 'danger')
    return
  }

  try {
    if (editingId.value) {
      await updateWave(editingId.value, { ...form.value })
      showToast(t('wms.warehouse.updated', '更新しました'), 'success')
    } else {
      await createWave({ ...form.value })
      showToast(t('wms.warehouse.created', '作成しました'), 'success')
    }
    dialogOpen.value = false
    await loadList()
  } catch (error: any) {
    showToast(error?.message || t('wms.warehouse.saveFailed', '保存に失敗しました'), 'danger')
  }
}

const confirmDelete = async (w: Wave) => {
  if (w.status !== 'draft') {
    showToast(t('wms.warehouse.deleteDraftOnly', '下書きステータスのウェーブのみ削除できます'), 'danger')
    return
  }
  if (!(await confirm('この操作を実行しますか？'))) return
  try {
    await deleteWave(w._id)
    showToast(t('wms.warehouse.deleted', '削除しました'), 'success')
    await loadList()
  } catch (err: any) {
    showToast(err?.message || t('wms.warehouse.deleteFailed', '削除に失敗しました'), 'danger')
  }
}

// Lifecycle actions
const handleStart = async (w: Wave) => {
  try {
    await startWave(w._id)
    showToast(t('wms.warehouse.waveStarted', 'ウェーブを開始しました'), 'success')
    await loadList()
  } catch (error: any) {
    showToast(error?.message || t('wms.warehouse.startFailed', '開始に失敗しました'), 'danger')
  }
}

const handleComplete = async (w: Wave) => {
  try {
    await completeWave(w._id)
    showToast(t('wms.warehouse.waveCompleted', 'ウェーブを完了しました'), 'success')
    await loadList()
  } catch (error: any) {
    showToast(error?.message || t('wms.warehouse.completeFailed', '完了に失敗しました'), 'danger')
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
.wave-management {
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

/* Status/Priority tag colors */
.wave-tag--gray {
  background: #f0f0f0;
  color: #606266;
}

.wave-tag--blue {
  background: #dbeafe;
  color: #1d4ed8;
}

.wave-tag--orange {
  background: #fff3e0;
  color: #e65100;
}

.wave-tag--cyan {
  background: #e0f7fa;
  color: #00838f;
}

.wave-tag--green {
  background: #d1fae5;
  color: #059669;
}

.wave-tag--red {
  background: #fee2e2;
  color: #dc2626;
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

.required-badge {
  display: inline-block;
  background: #dc3545;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  padding: 2px 5px;
  border-radius: 3px;
  white-space: nowrap;
  vertical-align: middle;
  margin-left: 4px;
}
</style>
