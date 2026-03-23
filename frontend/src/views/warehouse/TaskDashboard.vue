<template>
  <div class="task-dashboard">
    <PageHeader :title="t('wms.warehouse.taskDashboard', 'タスクダッシュボード')" :show-search="false">
      <template #actions>
        <Button variant="default" @click="openCreateDialog">{{ t('wms.warehouse.newTask', '新規タスク') }}</Button>
      </template>
    </PageHeader>

    <!-- Filter bar -->
    <div class="filter-bar">
      <Select :model-value="filterType || '__all__'" @update:model-value="(v: string) => filterType = v === '__all__' ? '' : v">
        <SelectTrigger class="h-8 w-[140px] text-sm">
          <SelectValue :placeholder="t('wms.warehouse.allTypes', '全タイプ')" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{{ t('wms.warehouse.allTypes', '全タイプ') }}</SelectItem>
          <SelectItem value="picking">{{ t('wms.warehouse.typePicking', 'ピッキング') }}</SelectItem>
          <SelectItem value="putaway">{{ t('wms.warehouse.typePutaway', '棚入れ') }}</SelectItem>
          <SelectItem value="replenishment">{{ t('wms.warehouse.typeReplenishment', '補充') }}</SelectItem>
          <SelectItem value="counting">{{ t('wms.warehouse.typeCounting', '棚卸') }}</SelectItem>
          <SelectItem value="sorting">{{ t('wms.warehouse.typeSorting', '仕分け') }}</SelectItem>
          <SelectItem value="packing">{{ t('wms.warehouse.typePacking', '梱包') }}</SelectItem>
          <SelectItem value="receiving">{{ t('wms.warehouse.typeReceiving', '入荷') }}</SelectItem>
          <SelectItem value="shipping">{{ t('wms.warehouse.typeShipping', '出荷') }}</SelectItem>
        </SelectContent>
      </Select>
      <Select :model-value="filterStatus || '__all__'" @update:model-value="(v: string) => filterStatus = v === '__all__' ? '' : v">
        <SelectTrigger class="h-8 w-[140px] text-sm">
          <SelectValue :placeholder="t('wms.warehouse.allStatuses', '全ステータス')" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{{ t('wms.warehouse.allStatuses', '全ステータス') }}</SelectItem>
          <SelectItem value="pending">{{ t('wms.warehouse.statusPending', '未着手') }}</SelectItem>
          <SelectItem value="assigned">{{ t('wms.warehouse.statusAssigned', '割当済') }}</SelectItem>
          <SelectItem value="in_progress">{{ t('wms.warehouse.statusInProgress', '作業中') }}</SelectItem>
          <SelectItem value="completed">{{ t('wms.warehouse.statusCompleted', '完了') }}</SelectItem>
          <SelectItem value="cancelled">{{ t('wms.warehouse.statusCancelled', 'キャンセル') }}</SelectItem>
          <SelectItem value="on_hold">{{ t('wms.warehouse.statusOnHold', '保留') }}</SelectItem>
        </SelectContent>
      </Select>
      <Select :model-value="filterPriority || '__all__'" @update:model-value="(v: string) => filterPriority = v === '__all__' ? '' : v">
        <SelectTrigger class="h-8 w-[130px] text-sm">
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
      <Button variant="default" @click="handleSearch">{{ t('wms.common.search', '検索') }}</Button>
    </div>

    <!-- Summary cards -->
    <div class="summary-cards">
      <div class="summary-card summary-card--pending">
        <div class="summary-card__label">{{ t('wms.warehouse.statusPending', '未着手') }}</div>
        <div class="summary-card__count">{{ pendingCount }}</div>
      </div>
      <div class="summary-card summary-card--in-progress">
        <div class="summary-card__label">{{ t('wms.warehouse.statusInProgress', '作業中') }}</div>
        <div class="summary-card__count">{{ inProgressCount }}</div>
      </div>
      <div class="summary-card summary-card--completed">
        <div class="summary-card__label">{{ t('wms.warehouse.statusCompleted', '完了') }}</div>
        <div class="summary-card__count">{{ completedCount }}</div>
      </div>
      <div class="summary-card summary-card--on-hold">
        <div class="summary-card__label">{{ t('wms.warehouse.statusOnHold', '保留') }}</div>
        <div class="summary-card__count">{{ onHoldCount }}</div>
      </div>
    </div>

    <!-- Task table -->
    <div class="rounded-md border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead style="width: 130px">{{ t('wms.warehouse.taskNumber', 'タスク番号') }}</TableHead>
            <TableHead style="width: 110px">{{ t('wms.warehouse.type', 'タイプ') }}</TableHead>
            <TableHead style="width: 80px">{{ t('wms.warehouse.priority', '優先度') }}</TableHead>
            <TableHead style="width: 100px">{{ t('wms.warehouse.status', 'ステータス') }}</TableHead>
            <TableHead style="width: 120px">{{ t('wms.warehouse.assignee', '担当者') }}</TableHead>
            <TableHead style="width: 100px">{{ t('wms.warehouse.quantity', '数量') }}</TableHead>
            <TableHead style="width: 100px">倉庫</TableHead>
            <TableHead style="width: 150px">{{ t('wms.warehouse.startDateTime', '開始日時') }}</TableHead>
            <TableHead style="width: 130px">完了日時</TableHead>
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
          <TableRow v-else-if="tasks.length === 0">
            <TableCell class="text-center py-8 text-muted-foreground" colspan="10">{{ t('wms.common.noData', 'データがありません') }}</TableCell>
          </TableRow>
          <TableRow v-for="task in tasks" :key="task._id">
            <TableCell>{{ task.taskNumber }}</TableCell>
            <TableCell>{{ typeLabels[task.type] || task.type }}</TableCell>
            <TableCell>
              <span :class="['priority-tag', `priority-tag--${task.priority}`]">
                {{ priorityLabels[task.priority] || task.priority }}
              </span>
            </TableCell>
            <TableCell>
              <span :class="['status-tag', `status-tag--${task.status}`]">
                {{ statusLabels[task.status] || task.status }}
              </span>
            </TableCell>
            <TableCell>{{ task.assignedName || task.assignedTo || '-' }}</TableCell>
            <TableCell>
              <template v-if="task.quantity != null">
                {{ task.completedQuantity != null ? task.completedQuantity : 0 }} / {{ task.quantity }}
              </template>
              <template v-else>-</template>
            </TableCell>
            <TableCell>{{ task.warehouseName ?? '-' }}</TableCell>
            <TableCell>{{ task.startedAt ? formatDate(task.startedAt) : '-' }}</TableCell>
            <TableCell>{{ task.completedAt ? formatDate(task.completedAt) : '-' }}</TableCell>
            <TableCell class="text-right">
              <Button v-if="task.status === 'pending'" variant="default" size="sm" @click="openAssignDialog(task)">{{ t('wms.warehouse.assign', '割当') }}</Button>
              <Button v-if="task.status === 'assigned'" variant="default" size="sm" @click="handleStart(task)">{{ t('wms.warehouse.start', '開始') }}</Button>
              <Button v-if="task.status === 'in_progress'" variant="default" size="sm" @click="openCompleteDialog(task)">{{ t('wms.warehouse.complete', '完了') }}</Button>
              <Button v-if="task.status === 'in_progress'" variant="secondary" size="sm" @click="handleHold(task)">{{ t('wms.warehouse.hold', '保留') }}</Button>
              <Button v-if="task.status === 'on_hold'" variant="default" size="sm" @click="handleStart(task)">{{ t('wms.warehouse.resume', '再開') }}</Button>
              <Button
                v-if="task.status !== 'completed' && task.status !== 'cancelled'"
                variant="destructive"
                size="sm"
                @click="handleCancel(task)"
              >{{ t('wms.common.cancel', 'キャンセル') }}</Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- Pagination -->
    <div class="o-table-pagination">
      <span class="o-table-pagination__info">{{ t('wms.common.totalOf', '全') }}{{ total }}{{ t('wms.common.items', '件') }}{{ t('wms.common.of', '中') }} {{ paginationStart }}-{{ paginationEnd }}{{ t('wms.common.items', '件') }}</span>
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

    <!-- Create Task Dialog -->
    <Dialog :open="createDialogOpen" @update:open="createDialogOpen = $event">
      <DialogContent>
        <DialogHeader><DialogTitle>{{ t('wms.warehouse.newTask', '新規タスク') }}</DialogTitle></DialogHeader>
        <div class="form-grid">
          <div class="form-field">
            <label>{{ t('wms.warehouse.type', 'タイプ') }} <span class="text-destructive text-xs">*</span></label>
            <Select :model-value="createForm.type || '__empty__'" @update:model-value="(v: string) => createForm.type = v === '__empty__' ? '' : v">
              <SelectTrigger class="h-9 w-full">
                <SelectValue :placeholder="t('wms.common.pleaseSelect', '選択してください')" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__empty__">{{ t('wms.common.pleaseSelect', '選択してください') }}</SelectItem>
                <SelectItem value="picking">{{ t('wms.warehouse.typePicking', 'ピッキング') }}</SelectItem>
                <SelectItem value="putaway">{{ t('wms.warehouse.typePutaway', '棚入れ') }}</SelectItem>
                <SelectItem value="replenishment">{{ t('wms.warehouse.typeReplenishment', '補充') }}</SelectItem>
                <SelectItem value="counting">{{ t('wms.warehouse.typeCounting', '棚卸') }}</SelectItem>
                <SelectItem value="sorting">{{ t('wms.warehouse.typeSorting', '仕分け') }}</SelectItem>
                <SelectItem value="packing">{{ t('wms.warehouse.typePacking', '梱包') }}</SelectItem>
                <SelectItem value="receiving">{{ t('wms.warehouse.typeReceiving', '入荷') }}</SelectItem>
                <SelectItem value="shipping">{{ t('wms.warehouse.typeShipping', '出荷') }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="form-field">
            <label>{{ t('wms.warehouse.priority', '優先度') }} <span class="text-destructive text-xs">*</span></label>
            <Select v-model="createForm.priority">
              <SelectTrigger class="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">{{ t('wms.warehouse.priorityNormal', '通常') }}</SelectItem>
                <SelectItem value="urgent">{{ t('wms.warehouse.priorityUrgent', '緊急') }}</SelectItem>
                <SelectItem value="high">{{ t('wms.warehouse.priorityHigh', '高') }}</SelectItem>
                <SelectItem value="low">{{ t('wms.warehouse.priorityLow', '低') }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="form-field">
            <label>{{ t('wms.warehouse.warehouseId', '倉庫ID') }}</label>
            <Input v-model="createForm.warehouseId" type="text" />
          </div>
          <div class="form-field">
            <label>{{ t('wms.warehouse.quantity', '数量') }}</label>
            <Input v-model.number="createForm.quantity" type="number" min="0" />
          </div>
          <div class="form-field form-field--full">
            <label>{{ t('wms.warehouse.memo', '備考') }}</label>
            <Textarea v-model="createForm.memo" class="form-textarea" rows="3" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" @click="createDialogOpen = false">{{ t('wms.common.cancel', 'キャンセル') }}</Button>
          <Button variant="default" @click="handleCreate">{{ t('wms.common.confirm', '確定') }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Assign Dialog -->
    <Dialog :open="assignDialogOpen" @update:open="assignDialogOpen = $event">
      <DialogContent>
        <DialogHeader><DialogTitle>{{ t('wms.warehouse.taskAssign', 'タスク割当') }}</DialogTitle></DialogHeader>
        <div class="form-grid">
          <div class="form-field form-field--full">
            <label>{{ t('wms.warehouse.assigneeId', '担当者ID') }} <span class="text-destructive text-xs">*</span></label>
            <Input v-model="assignForm.assignedTo" type="text" />
          </div>
          <div class="form-field form-field--full">
            <label>{{ t('wms.warehouse.assigneeName', '担当者名') }}</label>
            <Input v-model="assignForm.assignedName" type="text" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" @click="assignDialogOpen = false">{{ t('wms.common.cancel', 'キャンセル') }}</Button>
          <Button variant="default" @click="handleAssign">{{ t('wms.common.confirm', '確定') }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Complete Dialog -->
    <Dialog :open="completeDialogOpen" @update:open="completeDialogOpen = $event">
      <DialogContent>
        <DialogHeader><DialogTitle>{{ t('wms.warehouse.taskComplete', 'タスク完了') }}</DialogTitle></DialogHeader>
        <div class="form-grid">
          <div class="form-field form-field--full">
            <label>{{ t('wms.warehouse.completedQuantity', '完了数量') }} <span class="text-destructive text-xs">*</span></label>
            <Input v-model.number="completeForm.completedQuantity" type="number" min="0" />
          </div>
          <div class="form-field form-field--full">
            <label>{{ t('wms.warehouse.executor', '実行者') }}</label>
            <Input v-model="completeForm.executedBy" type="text" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" @click="completeDialogOpen = false">{{ t('wms.common.cancel', 'キャンセル') }}</Button>
          <Button variant="default" @click="handleComplete">{{ t('wms.common.confirm', '確定') }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { ref, computed, onMounted } from 'vue'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/shared/PageHeader.vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  fetchTasks,
  createTask,
  assignTask,
  startTask,
  completeTask,
  cancelTask,
  holdTask,
  type WarehouseTask,
} from '@/api/task'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
const { confirm } = useConfirmDialog()

const { show: showToast } = useToast()
const { t } = useI18n()

// Label maps
const typeLabels = computed<Record<string, string>>(() => ({
  picking: t('wms.warehouse.typePicking', 'ピッキング'),
  putaway: t('wms.warehouse.typePutaway', '棚入れ'),
  replenishment: t('wms.warehouse.typeReplenishment', '補充'),
  counting: t('wms.warehouse.typeCounting', '棚卸'),
  sorting: t('wms.warehouse.typeSorting', '仕分け'),
  packing: t('wms.warehouse.typePacking', '梱包'),
  receiving: t('wms.warehouse.typeReceiving', '入荷'),
  shipping: t('wms.warehouse.typeShipping', '出荷'),
}))

const priorityLabels = computed<Record<string, string>>(() => ({
  urgent: t('wms.warehouse.priorityUrgent', '緊急'),
  high: t('wms.warehouse.priorityHigh', '高'),
  normal: t('wms.warehouse.priorityNormal', '通常'),
  low: t('wms.warehouse.priorityLow', '低'),
}))

const statusLabels = computed<Record<string, string>>(() => ({
  pending: t('wms.warehouse.statusPending', '未着手'),
  assigned: t('wms.warehouse.statusAssigned', '割当済'),
  in_progress: t('wms.warehouse.statusInProgress', '作業中'),
  completed: t('wms.warehouse.statusCompleted', '完了'),
  cancelled: t('wms.warehouse.statusCancelled', 'キャンセル'),
  on_hold: t('wms.warehouse.statusOnHold', '保留'),
}))

// State
const tasks = ref<WarehouseTask[]>([])
const total = ref(0)
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)

// Filters
const filterType = ref('')
const filterStatus = ref('')
const filterPriority = ref('')

// Create dialog
const createDialogOpen = ref(false)
const emptyCreateForm = () => ({
  type: '' as string,
  priority: 'normal' as string,
  warehouseId: '',
  quantity: undefined as number | undefined,
  memo: '',
})
const createForm = ref(emptyCreateForm())

// Assign dialog
const assignDialogOpen = ref(false)
const assignTargetId = ref('')
const assignForm = ref({ assignedTo: '', assignedName: '' })

// Complete dialog
const completeDialogOpen = ref(false)
const completeTargetId = ref('')
const completeForm = ref({ completedQuantity: 0, executedBy: '' })

// Computed - summary counts
const pendingCount = computed(() => tasks.value.filter((t) => t.status === 'pending').length)
const inProgressCount = computed(() => tasks.value.filter((t) => t.status === 'in_progress').length)
const completedCount = computed(() => tasks.value.filter((t) => t.status === 'completed').length)
const onHoldCount = computed(() => tasks.value.filter((t) => t.status === 'on_hold').length)

// Computed - pagination
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
const paginationStart = computed(() => (total.value === 0 ? 0 : (currentPage.value - 1) * pageSize.value + 1))
const paginationEnd = computed(() => Math.min(currentPage.value * pageSize.value, total.value))

// Format date
const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Load
const loadList = async () => {
  loading.value = true
  try {
    const result = await fetchTasks({
      type: filterType.value || undefined,
      status: filterStatus.value || undefined,
      priority: filterPriority.value || undefined,
      page: currentPage.value,
      limit: pageSize.value,
    })
    tasks.value = result.data
    total.value = result.total
  } catch (error: any) {
    showToast(error?.message || t('wms.warehouse.fetchTasksFailed', 'タスクの取得に失敗しました'), 'danger')
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

// Create
const openCreateDialog = () => {
  createForm.value = emptyCreateForm()
  createDialogOpen.value = true
}

const handleCreate = async () => {
  if (!createForm.value.type) {
    showToast(t('wms.warehouse.typeRequired', 'タイプは必須です'), 'danger')
    return
  }
  try {
    await createTask({
      type: createForm.value.type as WarehouseTask['type'],
      priority: createForm.value.priority as WarehouseTask['priority'],
      warehouseId: createForm.value.warehouseId || undefined,
      quantity: createForm.value.quantity,
      memo: createForm.value.memo || undefined,
    })
    showToast(t('wms.warehouse.taskCreated', 'タスクを作成しました'), 'success')
    createDialogOpen.value = false
    await loadList()
  } catch (error: any) {
    showToast(error?.message || t('wms.warehouse.createTaskFailed', 'タスクの作成に失敗しました'), 'danger')
  }
}

// Assign
const openAssignDialog = (task: WarehouseTask) => {
  assignTargetId.value = task._id
  assignForm.value = { assignedTo: '', assignedName: '' }
  assignDialogOpen.value = true
}

const handleAssign = async () => {
  if (!assignForm.value.assignedTo.trim()) {
    showToast(t('wms.warehouse.assigneeIdRequired', '担当者IDは必須です'), 'danger')
    return
  }
  try {
    await assignTask(assignTargetId.value, {
      assignedTo: assignForm.value.assignedTo,
      assignedName: assignForm.value.assignedName || undefined,
    })
    showToast(t('wms.warehouse.taskAssigned', 'タスクを割当しました'), 'success')
    assignDialogOpen.value = false
    await loadList()
  } catch (error: any) {
    showToast(error?.message || t('wms.warehouse.assignTaskFailed', 'タスクの割当に失敗しました'), 'danger')
  }
}

// Start / Resume
const handleStart = async (task: WarehouseTask) => {
  try {
    await startTask(task._id)
    showToast(t('wms.warehouse.taskStarted', 'タスクを開始しました'), 'success')
    await loadList()
  } catch (error: any) {
    showToast(error?.message || t('wms.warehouse.startTaskFailed', 'タスクの開始に失敗しました'), 'danger')
  }
}

// Complete
const openCompleteDialog = (task: WarehouseTask) => {
  completeTargetId.value = task._id
  completeForm.value = {
    completedQuantity: task.quantity ?? 0,
    executedBy: '',
  }
  completeDialogOpen.value = true
}

const handleComplete = async () => {
  try {
    await completeTask(completeTargetId.value, {
      completedQuantity: completeForm.value.completedQuantity,
      executedBy: completeForm.value.executedBy || undefined,
    })
    showToast(t('wms.warehouse.taskCompleted', 'タスクを完了しました'), 'success')
    completeDialogOpen.value = false
    await loadList()
  } catch (error: any) {
    showToast(error?.message || t('wms.warehouse.completeTaskFailed', 'タスクの完了に失敗しました'), 'danger')
  }
}

// Hold
const handleHold = async (task: WarehouseTask) => {
  try {
    await holdTask(task._id, {})
    showToast(t('wms.warehouse.taskOnHold', 'タスクを保留にしました'), 'success')
    await loadList()
  } catch (error: any) {
    showToast(error?.message || t('wms.warehouse.holdTaskFailed', 'タスクの保留に失敗しました'), 'danger')
  }
}

// Cancel
const handleCancel = async (task: WarehouseTask) => {
  if (!(await confirm('この操作を実行しますか？'))) return
  try {
    await cancelTask(task._id, {})
    showToast(t('wms.warehouse.taskCancelled', 'タスクをキャンセルしました'), 'success')
    await loadList()
  } catch (error: any) {
    showToast(error?.message || t('wms.warehouse.cancelTaskFailed', 'タスクのキャンセルに失敗しました'), 'danger')
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
.task-dashboard {
  padding: 0 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}

/* Filter bar */
.filter-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Summary cards */
.summary-cards {
  display: flex;
  gap: 16px;
}

.summary-card {
  flex: 1;
  padding: 16px 20px;
  border-radius: 6px;
  background: #fff;
  border: 1px solid var(--o-border-color, #dcdfe6);
  border-left: 4px solid #ccc;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.summary-card__label {
  font-size: 13px;
  color: var(--o-gray-500, #909399);
}

.summary-card__count {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
}

.summary-card--pending {
  border-left-color: #409eff;
}

.summary-card--pending .summary-card__count {
  color: #409eff;
}

.summary-card--in-progress {
  border-left-color: #e6a23c;
}

.summary-card--in-progress .summary-card__count {
  color: #e6a23c;
}

.summary-card--completed {
  border-left-color: #67c23a;
}

.summary-card--completed .summary-card__count {
  color: #67c23a;
}

.summary-card--on-hold {
  border-left-color: #f56c6c;
}

.summary-card--on-hold .summary-card__count {
  color: #f56c6c;
}

/* Priority tags */
.priority-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: 500;
}

.priority-tag--urgent {
  background: #fef0f0;
  color: #f56c6c;
}

.priority-tag--high {
  background: #fdf6ec;
  color: #e6a23c;
}

.priority-tag--normal {
  background: #ecf5ff;
  color: #409eff;
}

.priority-tag--low {
  background: #f4f4f5;
  color: #909399;
}

/* Status tags */
.status-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: 500;
}

.status-tag--pending {
  background: #ecf5ff;
  color: #409eff;
}

.status-tag--assigned {
  background: #e8f7f0;
  color: #13a2b8;
}

.status-tag--in_progress {
  background: #fdf6ec;
  color: #e6a23c;
}

.status-tag--completed {
  background: #f0f9eb;
  color: #67c23a;
}

.status-tag--cancelled {
  background: #f4f4f5;
  color: #909399;
}

.status-tag--on_hold {
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
