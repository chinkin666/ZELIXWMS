<template>
  <div class="task-dashboard">
    <ControlPanel title="タスクダッシュボード" :show-search="false">
      <template #actions>
        <OButton variant="primary" @click="openCreateDialog">新規タスク</OButton>
      </template>
    </ControlPanel>

    <!-- Filter bar -->
    <div class="filter-bar">
      <select v-model="filterType" class="o-input o-input-sm" style="width: 140px;">
        <option value="">全タイプ</option>
        <option value="picking">ピッキング</option>
        <option value="putaway">棚入れ</option>
        <option value="replenishment">補充</option>
        <option value="counting">棚卸</option>
        <option value="sorting">仕分け</option>
        <option value="packing">梱包</option>
        <option value="receiving">入荷</option>
        <option value="shipping">出荷</option>
      </select>
      <select v-model="filterStatus" class="o-input o-input-sm" style="width: 140px;">
        <option value="">全ステータス</option>
        <option value="pending">未着手</option>
        <option value="assigned">割当済</option>
        <option value="in_progress">作業中</option>
        <option value="completed">完了</option>
        <option value="cancelled">キャンセル</option>
        <option value="on_hold">保留</option>
      </select>
      <select v-model="filterPriority" class="o-input o-input-sm" style="width: 130px;">
        <option value="">全優先度</option>
        <option value="urgent">緊急</option>
        <option value="high">高</option>
        <option value="normal">通常</option>
        <option value="low">低</option>
      </select>
      <OButton variant="primary" @click="handleSearch">検索</OButton>
    </div>

    <!-- Summary cards -->
    <div class="summary-cards">
      <div class="summary-card summary-card--pending">
        <div class="summary-card__label">未着手</div>
        <div class="summary-card__count">{{ pendingCount }}</div>
      </div>
      <div class="summary-card summary-card--in-progress">
        <div class="summary-card__label">作業中</div>
        <div class="summary-card__count">{{ inProgressCount }}</div>
      </div>
      <div class="summary-card summary-card--completed">
        <div class="summary-card__label">完了</div>
        <div class="summary-card__count">{{ completedCount }}</div>
      </div>
      <div class="summary-card summary-card--on-hold">
        <div class="summary-card__label">保留</div>
        <div class="summary-card__count">{{ onHoldCount }}</div>
      </div>
    </div>

    <!-- Task table -->
    <div class="o-table-wrapper">
      <table class="o-table">
        <thead>
          <tr>
            <th class="o-table-th" style="width: 130px">タスク番号</th>
            <th class="o-table-th" style="width: 110px">タイプ</th>
            <th class="o-table-th" style="width: 80px">優先度</th>
            <th class="o-table-th" style="width: 100px">ステータス</th>
            <th class="o-table-th" style="width: 120px">担当者</th>
            <th class="o-table-th" style="width: 100px">数量</th>
            <th class="o-table-th" style="width: 150px">開始日時</th>
            <th class="o-table-th" style="width: 200px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td class="o-table-td o-table-empty" colspan="8">読み込み中...</td>
          </tr>
          <tr v-else-if="tasks.length === 0">
            <td class="o-table-td o-table-empty" colspan="8">データがありません</td>
          </tr>
          <tr v-for="t in tasks" :key="t._id" class="o-table-row">
            <td class="o-table-td">{{ t.taskNumber }}</td>
            <td class="o-table-td">{{ typeLabels[t.type] || t.type }}</td>
            <td class="o-table-td">
              <span :class="['priority-tag', `priority-tag--${t.priority}`]">
                {{ priorityLabels[t.priority] || t.priority }}
              </span>
            </td>
            <td class="o-table-td">
              <span :class="['status-tag', `status-tag--${t.status}`]">
                {{ statusLabels[t.status] || t.status }}
              </span>
            </td>
            <td class="o-table-td">{{ t.assignedName || t.assignedTo || '-' }}</td>
            <td class="o-table-td">
              <template v-if="t.quantity != null">
                {{ t.completedQuantity != null ? t.completedQuantity : 0 }} / {{ t.quantity }}
              </template>
              <template v-else>-</template>
            </td>
            <td class="o-table-td">{{ t.startedAt ? formatDate(t.startedAt) : '-' }}</td>
            <td class="o-table-td o-table-td--actions">
              <OButton v-if="t.status === 'pending'" variant="primary" size="sm" @click="openAssignDialog(t)">割当</OButton>
              <OButton v-if="t.status === 'assigned'" variant="primary" size="sm" @click="handleStart(t)">開始</OButton>
              <OButton v-if="t.status === 'in_progress'" variant="success" size="sm" @click="openCompleteDialog(t)">完了</OButton>
              <OButton v-if="t.status === 'in_progress'" variant="secondary" size="sm" @click="handleHold(t)">保留</OButton>
              <OButton v-if="t.status === 'on_hold'" variant="primary" size="sm" @click="handleStart(t)">再開</OButton>
              <OButton
                v-if="t.status !== 'completed' && t.status !== 'cancelled'"
                variant="icon-danger"
                size="sm"
                @click="handleCancel(t)"
              >キャンセル</OButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="o-table-pagination">
      <span class="o-table-pagination__info">全{{ total }}件中 {{ paginationStart }}-{{ paginationEnd }}件</span>
      <div class="o-table-pagination__controls">
        <select class="o-input o-input-sm" v-model.number="pageSize" style="width:80px;" @change="handlePageSizeChange">
          <option :value="10">10</option>
          <option :value="20">20</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
        </select>
        <OButton variant="secondary" size="sm" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">&lsaquo;</OButton>
        <span class="o-table-pagination__page">{{ currentPage }} / {{ totalPages }}</span>
        <OButton variant="secondary" size="sm" :disabled="currentPage >= totalPages" @click="goToPage(currentPage + 1)">&rsaquo;</OButton>
      </div>
    </div>

    <!-- Create Task Dialog -->
    <ODialog v-model="createDialogOpen" title="新規タスク" size="lg" @confirm="handleCreate">
      <div class="form-grid">
        <div class="form-field">
          <label class="form-label">タイプ <span class="required">*</span></label>
          <select v-model="createForm.type" class="o-input">
            <option value="">選択してください</option>
            <option value="picking">ピッキング</option>
            <option value="putaway">棚入れ</option>
            <option value="replenishment">補充</option>
            <option value="counting">棚卸</option>
            <option value="sorting">仕分け</option>
            <option value="packing">梱包</option>
            <option value="receiving">入荷</option>
            <option value="shipping">出荷</option>
          </select>
        </div>
        <div class="form-field">
          <label class="form-label">優先度 <span class="required">*</span></label>
          <select v-model="createForm.priority" class="o-input">
            <option value="normal">通常</option>
            <option value="urgent">緊急</option>
            <option value="high">高</option>
            <option value="low">低</option>
          </select>
        </div>
        <div class="form-field">
          <label class="form-label">倉庫ID</label>
          <input v-model="createForm.warehouseId" type="text" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">数量</label>
          <input v-model.number="createForm.quantity" type="number" class="o-input" min="0" />
        </div>
        <div class="form-field form-field--full">
          <label class="form-label">備考</label>
          <textarea v-model="createForm.memo" class="o-input form-textarea" rows="3" />
        </div>
      </div>
    </ODialog>

    <!-- Assign Dialog -->
    <ODialog v-model="assignDialogOpen" title="タスク割当" size="sm" @confirm="handleAssign">
      <div class="form-grid">
        <div class="form-field form-field--full">
          <label class="form-label">担当者ID <span class="required">*</span></label>
          <input v-model="assignForm.assignedTo" type="text" class="o-input" />
        </div>
        <div class="form-field form-field--full">
          <label class="form-label">担当者名</label>
          <input v-model="assignForm.assignedName" type="text" class="o-input" />
        </div>
      </div>
    </ODialog>

    <!-- Complete Dialog -->
    <ODialog v-model="completeDialogOpen" title="タスク完了" size="sm" @confirm="handleComplete">
      <div class="form-grid">
        <div class="form-field form-field--full">
          <label class="form-label">完了数量 <span class="required">*</span></label>
          <input v-model.number="completeForm.completedQuantity" type="number" class="o-input" min="0" />
        </div>
        <div class="form-field form-field--full">
          <label class="form-label">実行者</label>
          <input v-model="completeForm.executedBy" type="text" class="o-input" />
        </div>
      </div>
    </ODialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToast } from '@/composables/useToast'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import ODialog from '@/components/odoo/ODialog.vue'
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

const { show: showToast } = useToast()

// Label maps
const typeLabels: Record<string, string> = {
  picking: 'ピッキング',
  putaway: '棚入れ',
  replenishment: '補充',
  counting: '棚卸',
  sorting: '仕分け',
  packing: '梱包',
  receiving: '入荷',
  shipping: '出荷',
}

const priorityLabels: Record<string, string> = {
  urgent: '緊急',
  high: '高',
  normal: '通常',
  low: '低',
}

const statusLabels: Record<string, string> = {
  pending: '未着手',
  assigned: '割当済',
  in_progress: '作業中',
  completed: '完了',
  cancelled: 'キャンセル',
  on_hold: '保留',
}

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
    showToast(error?.message || 'タスクの取得に失敗しました', 'danger')
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
    showToast('タイプは必須です', 'danger')
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
    showToast('タスクを作成しました', 'success')
    createDialogOpen.value = false
    await loadList()
  } catch (error: any) {
    showToast(error?.message || 'タスクの作成に失敗しました', 'danger')
  }
}

// Assign
const openAssignDialog = (t: WarehouseTask) => {
  assignTargetId.value = t._id
  assignForm.value = { assignedTo: '', assignedName: '' }
  assignDialogOpen.value = true
}

const handleAssign = async () => {
  if (!assignForm.value.assignedTo.trim()) {
    showToast('担当者IDは必須です', 'danger')
    return
  }
  try {
    await assignTask(assignTargetId.value, {
      assignedTo: assignForm.value.assignedTo,
      assignedName: assignForm.value.assignedName || undefined,
    })
    showToast('タスクを割当しました', 'success')
    assignDialogOpen.value = false
    await loadList()
  } catch (error: any) {
    showToast(error?.message || 'タスクの割当に失敗しました', 'danger')
  }
}

// Start / Resume
const handleStart = async (t: WarehouseTask) => {
  try {
    await startTask(t._id)
    showToast('タスクを開始しました', 'success')
    await loadList()
  } catch (error: any) {
    showToast(error?.message || 'タスクの開始に失敗しました', 'danger')
  }
}

// Complete
const openCompleteDialog = (t: WarehouseTask) => {
  completeTargetId.value = t._id
  completeForm.value = {
    completedQuantity: t.quantity ?? 0,
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
    showToast('タスクを完了しました', 'success')
    completeDialogOpen.value = false
    await loadList()
  } catch (error: any) {
    showToast(error?.message || 'タスクの完了に失敗しました', 'danger')
  }
}

// Hold
const handleHold = async (t: WarehouseTask) => {
  try {
    await holdTask(t._id, {})
    showToast('タスクを保留にしました', 'success')
    await loadList()
  } catch (error: any) {
    showToast(error?.message || 'タスクの保留に失敗しました', 'danger')
  }
}

// Cancel
const handleCancel = async (t: WarehouseTask) => {
  if (!confirm(`タスク「${t.taskNumber}」をキャンセルしますか？`)) return
  try {
    await cancelTask(t._id, {})
    showToast('タスクをキャンセルしました', 'success')
    await loadList()
  } catch (error: any) {
    showToast(error?.message || 'タスクのキャンセルに失敗しました', 'danger')
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
