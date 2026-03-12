<template>
  <div class="wms-schedule-view">
    <ControlPanel title="WMSスケジュール" :show-search="false">
      <template #actions>
        <div style="display:flex;gap:6px;align-items:center;">
          <OButton v-if="activeTab === 'schedules'" variant="primary" size="sm" @click="openCreateDialog">
            新規スケジュール
          </OButton>
          <OButton v-if="activeTab === 'logs'" variant="secondary" size="sm" @click="exportLogsCsv">
            CSV出力
          </OButton>
        </div>
      </template>
    </ControlPanel>

    <!-- Tabs -->
    <div class="tab-bar">
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'schedules' }"
        @click="activeTab = 'schedules'"
      >スケジュール</button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'tasks' }"
        @click="activeTab = 'tasks'"
      >タスク</button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'logs' }"
        @click="activeTab = 'logs'"
      >ログ</button>
    </div>

    <!-- ================================================================= -->
    <!-- Tab 1: スケジュール -->
    <!-- ================================================================= -->
    <div v-if="activeTab === 'schedules'">
      <div class="o-table-wrapper">
        <table class="o-table">
          <thead>
            <tr>
              <th class="o-table-th" style="width:180px;">名前</th>
              <th class="o-table-th" style="width:120px;">アクション</th>
              <th class="o-table-th" style="width:90px;">タイプ</th>
              <th class="o-table-th" style="width:120px;">実行時間</th>
              <th class="o-table-th" style="width:70px;">有効</th>
              <th class="o-table-th" style="width:140px;">最終実行</th>
              <th class="o-table-th o-table-th--right" style="width:70px;">実行回数</th>
              <th class="o-table-th" style="width:160px;">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="schedulesLoading">
              <td colspan="8" class="o-table-empty">読み込み中...</td>
            </tr>
            <tr v-else-if="schedules.length === 0">
              <td colspan="8" class="o-table-empty">データがありません</td>
            </tr>
            <tr v-for="s in schedules" :key="s._id" class="o-table-row">
              <td class="o-table-td">{{ s.name }}</td>
              <td class="o-table-td">
                <span class="action-badge">{{ actionLabel(s.action) }}</span>
              </td>
              <td class="o-table-td">{{ s.scheduleType === 'scheduled' ? 'スケジュール' : '手動' }}</td>
              <td class="o-table-td">{{ formatCronDisplay(s) }}</td>
              <td class="o-table-td">
                <button class="toggle-btn" :class="{ 'toggle-on': s.isEnabled }" @click="handleToggle(s)">
                  {{ s.isEnabled ? 'ON' : 'OFF' }}
                </button>
              </td>
              <td class="o-table-td">{{ formatDateTime(s.lastRunAt) }}</td>
              <td class="o-table-td o-table-td--right">{{ s.runCount }}</td>
              <td class="o-table-td">
                <div style="display:flex;gap:4px;">
                  <OButton variant="secondary" size="sm" @click="openEditDialog(s)">編集</OButton>
                  <OButton variant="primary" size="sm" @click="handleRun(s)">実行</OButton>
                  <OButton variant="secondary" size="sm" @click="handleDelete(s)">削除</OButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ================================================================= -->
    <!-- Tab 2: タスク -->
    <!-- ================================================================= -->
    <div v-if="activeTab === 'tasks'">
      <div class="filter-bar">
        <div class="filter-row">
          <div class="filter-item">
            <label class="filter-label">ステータス</label>
            <select class="o-input o-input-sm" v-model="taskFilterStatus">
              <option value="">全て</option>
              <option value="queued">待機中</option>
              <option value="running">実行中</option>
              <option value="completed">完了</option>
              <option value="failed">失敗</option>
              <option value="cancelled">キャンセル</option>
            </select>
          </div>
          <div class="filter-item">
            <label class="filter-label">開始日</label>
            <input type="date" class="o-input o-input-sm" v-model="taskFilterDateFrom" />
          </div>
          <div class="filter-item">
            <label class="filter-label">終了日</label>
            <input type="date" class="o-input o-input-sm" v-model="taskFilterDateTo" />
          </div>
          <div class="filter-item filter-actions">
            <OButton variant="primary" size="sm" @click="doTaskSearch">検索</OButton>
            <OButton variant="secondary" size="sm" @click="resetTaskFilters">リセット</OButton>
          </div>
        </div>
      </div>

      <div class="o-table-wrapper">
        <table class="o-table">
          <thead>
            <tr>
              <th class="o-table-th" style="width:140px;">タスク番号</th>
              <th class="o-table-th" style="width:140px;">スケジュール名</th>
              <th class="o-table-th" style="width:100px;">アクション</th>
              <th class="o-table-th" style="width:90px;">ステータス</th>
              <th class="o-table-th o-table-th--right" style="width:60px;">処理数</th>
              <th class="o-table-th o-table-th--right" style="width:60px;">成功数</th>
              <th class="o-table-th o-table-th--right" style="width:60px;">エラー数</th>
              <th class="o-table-th" style="width:70px;">トリガー</th>
              <th class="o-table-th" style="width:140px;">開始日時</th>
              <th class="o-table-th" style="width:80px;">処理時間</th>
              <th class="o-table-th">メッセージ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="tasksLoading">
              <td colspan="11" class="o-table-empty">読み込み中...</td>
            </tr>
            <tr v-else-if="tasks.length === 0">
              <td colspan="11" class="o-table-empty">データがありません</td>
            </tr>
            <tr v-for="t in tasks" :key="t._id" class="o-table-row">
              <td class="o-table-td">
                <span class="task-number">{{ t.taskNumber }}</span>
              </td>
              <td class="o-table-td">{{ t.scheduleName || '-' }}</td>
              <td class="o-table-td">
                <span class="action-badge">{{ actionLabel(t.action) }}</span>
              </td>
              <td class="o-table-td">
                <span class="status-badge" :class="'status--' + t.status">{{ taskStatusLabel(t.status) }}</span>
              </td>
              <td class="o-table-td o-table-td--right">{{ t.processedCount }}</td>
              <td class="o-table-td o-table-td--right">{{ t.successCount }}</td>
              <td class="o-table-td o-table-td--right">{{ t.errorCount }}</td>
              <td class="o-table-td">{{ t.triggeredBy === 'manual' ? '手動' : 'スケジューラ' }}</td>
              <td class="o-table-td">{{ formatDateTime(t.startedAt) }}</td>
              <td class="o-table-td">{{ t.durationMs != null ? formatDuration(t.durationMs) : '-' }}</td>
              <td class="o-table-td">{{ t.message || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Task Pagination -->
      <div class="o-table-pagination">
        <span class="o-table-pagination__info">{{ taskTotal }} 件中 {{ tasks.length }} 件表示</span>
        <div class="o-table-pagination__controls">
          <select class="o-input o-input-sm" v-model.number="taskPageSize" style="width:80px;" @change="onTaskPageSizeChange">
            <option :value="25">25</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
          </select>
          <OButton variant="secondary" size="sm" :disabled="taskPage <= 1" @click="goTaskPage(taskPage - 1)">&lsaquo;</OButton>
          <span class="o-table-pagination__page">{{ taskPage }} / {{ taskTotalPages }}</span>
          <OButton variant="secondary" size="sm" :disabled="taskPage >= taskTotalPages" @click="goTaskPage(taskPage + 1)">&rsaquo;</OButton>
        </div>
      </div>
    </div>

    <!-- ================================================================= -->
    <!-- Tab 3: ログ -->
    <!-- ================================================================= -->
    <div v-if="activeTab === 'logs'">
      <div class="filter-bar">
        <div class="filter-row">
          <div class="filter-item">
            <label class="filter-label">アクション</label>
            <select class="o-input o-input-sm" v-model="logFilterAction">
              <option value="">全て</option>
              <option v-for="(label, key) in ACTION_LABELS" :key="key" :value="key">{{ label }}</option>
            </select>
          </div>
          <div class="filter-item">
            <label class="filter-label">イベント</label>
            <select class="o-input o-input-sm" v-model="logFilterEvent">
              <option value="">全て</option>
              <option v-for="(label, key) in EVENT_LABELS" :key="key" :value="key">{{ label }}</option>
            </select>
          </div>
          <div class="filter-item">
            <label class="filter-label">開始日</label>
            <input type="date" class="o-input o-input-sm" v-model="logFilterDateFrom" />
          </div>
          <div class="filter-item">
            <label class="filter-label">終了日</label>
            <input type="date" class="o-input o-input-sm" v-model="logFilterDateTo" />
          </div>
          <div class="filter-item filter-actions">
            <OButton variant="primary" size="sm" @click="doLogSearch">検索</OButton>
            <OButton variant="secondary" size="sm" @click="resetLogFilters">リセット</OButton>
          </div>
        </div>
      </div>

      <div class="o-table-wrapper">
        <table class="o-table">
          <thead>
            <tr>
              <th class="o-table-th" style="width:150px;">日時</th>
              <th class="o-table-th" style="width:110px;">アクション</th>
              <th class="o-table-th" style="width:120px;">イベント</th>
              <th class="o-table-th" style="width:140px;">タスク番号</th>
              <th class="o-table-th">メッセージ</th>
              <th class="o-table-th" style="width:90px;">ユーザー</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="logsLoading">
              <td colspan="6" class="o-table-empty">読み込み中...</td>
            </tr>
            <tr v-else-if="logs.length === 0">
              <td colspan="6" class="o-table-empty">データがありません</td>
            </tr>
            <tr v-for="l in logs" :key="l._id" class="o-table-row">
              <td class="o-table-td">{{ formatDateTime(l.createdAt) }}</td>
              <td class="o-table-td">
                <span class="action-badge">{{ actionLabel(l.action) }}</span>
              </td>
              <td class="o-table-td">{{ eventLabel(l.event) }}</td>
              <td class="o-table-td">
                <span v-if="l.taskNumber" class="task-number">{{ l.taskNumber }}</span>
                <span v-else>-</span>
              </td>
              <td class="o-table-td">{{ l.message || '-' }}</td>
              <td class="o-table-td">{{ l.userName }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Log Pagination -->
      <div class="o-table-pagination">
        <span class="o-table-pagination__info">{{ logTotal }} 件中 {{ logs.length }} 件表示</span>
        <div class="o-table-pagination__controls">
          <select class="o-input o-input-sm" v-model.number="logPageSize" style="width:80px;" @change="onLogPageSizeChange">
            <option :value="25">25</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
          </select>
          <OButton variant="secondary" size="sm" :disabled="logPage <= 1" @click="goLogPage(logPage - 1)">&lsaquo;</OButton>
          <span class="o-table-pagination__page">{{ logPage }} / {{ logTotalPages }}</span>
          <OButton variant="secondary" size="sm" :disabled="logPage >= logTotalPages" @click="goLogPage(logPage + 1)">&rsaquo;</OButton>
        </div>
      </div>
    </div>

    <!-- ================================================================= -->
    <!-- Create / Edit Dialog -->
    <!-- ================================================================= -->
    <ODialog v-model="showDialog" :title="editingId ? 'スケジュール編集' : '新規スケジュール'" size="lg" @close="closeDialog">
      <template #default>
        <div class="form-grid">
          <div class="form-field">
            <label class="form-label">名前 <span class="required">*</span></label>
            <input type="text" class="o-input" v-model="form.name" placeholder="スケジュール名" />
          </div>
          <div class="form-field">
            <label class="form-label">アクション <span class="required">*</span></label>
            <select class="o-input" v-model="form.action">
              <option value="">選択してください</option>
              <option v-for="(label, key) in ACTION_LABELS" :key="key" :value="key">{{ label }}</option>
            </select>
          </div>
          <div class="form-field form-field--full">
            <label class="form-label">説明</label>
            <input type="text" class="o-input" v-model="form.description" placeholder="説明（任意）" />
          </div>
          <div class="form-field form-field--full">
            <label class="form-label">実行タイプ</label>
            <div class="radio-group">
              <label class="radio-label">
                <input type="radio" value="manual" v-model="form.scheduleType" /> 手動
              </label>
              <label class="radio-label">
                <input type="radio" value="scheduled" v-model="form.scheduleType" /> スケジュール
              </label>
            </div>
          </div>
          <template v-if="form.scheduleType === 'scheduled'">
            <div class="form-field">
              <label class="form-label">時 (0-23)</label>
              <input type="number" class="o-input" v-model.number="form.cronHour" min="0" max="23" />
            </div>
            <div class="form-field">
              <label class="form-label">分 (0-59)</label>
              <input type="number" class="o-input" v-model.number="form.cronMinute" min="0" max="59" />
            </div>
            <div class="form-field form-field--full">
              <label class="form-label">曜日 (空=毎日)</label>
              <div class="checkbox-group">
                <label v-for="(dayLabel, idx) in DAY_LABELS" :key="idx" class="checkbox-label">
                  <input type="checkbox" :value="idx" v-model="form.cronDaysOfWeek" />
                  {{ dayLabel }}
                </label>
              </div>
            </div>
            <div class="form-field">
              <label class="form-label">Cron式 (上級)</label>
              <input type="text" class="o-input" v-model="form.cronExpression" placeholder="0 9 * * *" />
            </div>
            <div class="form-field">
              <label class="checkbox-label">
                <input type="checkbox" v-model="form.skipHolidays" />
                祝日スキップ
              </label>
            </div>
          </template>
          <div class="form-field form-field--full">
            <label class="form-label">メタデータ (JSON)</label>
            <textarea class="o-input" v-model="form.metadataJson" rows="3" placeholder='{"key": "value"}'></textarea>
          </div>
        </div>
      </template>
      <template #footer>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <OButton variant="secondary" size="sm" @click="closeDialog">キャンセル</OButton>
          <OButton variant="primary" size="sm" @click="saveSchedule">保存</OButton>
        </div>
      </template>
    </ODialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useToast } from '@/composables/useToast'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import ODialog from '@/components/odoo/ODialog.vue'
import {
  fetchWmsSchedules,
  createWmsSchedule,
  updateWmsSchedule,
  deleteWmsSchedule,
  runWmsSchedule,
  toggleWmsSchedule,
  fetchWmsTasks,
  fetchWmsLogs,
  exportWmsLogs,
} from '@/api/wmsSchedule'
import type { WmsSchedule, WmsTask, WmsScheduleLog } from '@/api/wmsSchedule'

const toast = useToast()

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACTION_LABELS: Record<string, string> = {
  auto_allocate: '自動引当',
  auto_batch: '自動バッチ',
  auto_print: '自動印刷',
  auto_label: '自動ラベル',
  inventory_sync: '在庫同期',
  report_generate: 'レポート生成',
  cleanup: 'クリーンアップ',
}

const EVENT_LABELS: Record<string, string> = {
  schedule_created: '作成',
  schedule_updated: '更新',
  schedule_enabled: '有効化',
  schedule_disabled: '無効化',
  task_started: 'タスク開始',
  task_completed: 'タスク完了',
  task_failed: 'タスク失敗',
  manual_run: '手動実行',
}

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const

const TASK_STATUS_LABELS: Record<string, string> = {
  queued: '待機中',
  running: '実行中',
  completed: '完了',
  failed: '失敗',
  cancelled: 'キャンセル',
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

const activeTab = ref<'schedules' | 'tasks' | 'logs'>('schedules')

watch(activeTab, (tab) => {
  if (tab === 'schedules') loadSchedules()
  else if (tab === 'tasks') loadTasks()
  else if (tab === 'logs') loadLogs()
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const actionLabel = (a: string) => ACTION_LABELS[a] || a
const eventLabel = (e: string) => EVENT_LABELS[e] || e
const taskStatusLabel = (s: string) => TASK_STATUS_LABELS[s] || s

const formatDateTime = (d?: string) => {
  if (!d) return '-'
  return new Date(d).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

const formatDuration = (ms: number) => {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

const formatCronDisplay = (s: WmsSchedule) => {
  if (s.scheduleType !== 'scheduled') return '-'
  if (s.cronExpression) return s.cronExpression
  const h = s.cronHour != null ? String(s.cronHour).padStart(2, '0') : '**'
  const m = s.cronMinute != null ? String(s.cronMinute).padStart(2, '0') : '**'
  const days = s.cronDaysOfWeek.length > 0
    ? s.cronDaysOfWeek.map(d => DAY_LABELS[d]).join(',')
    : '毎日'
  return `${h}:${m} (${days})`
}

// ---------------------------------------------------------------------------
// Tab 1: Schedules
// ---------------------------------------------------------------------------

const schedules = ref<WmsSchedule[]>([])
const schedulesLoading = ref(false)

const loadSchedules = async () => {
  schedulesLoading.value = true
  try {
    const res = await fetchWmsSchedules()
    schedules.value = res.data
  } catch (e: unknown) {
    toast.showError(e instanceof Error ? e.message : 'スケジュールの取得に失敗しました')
  } finally {
    schedulesLoading.value = false
  }
}

const handleToggle = async (s: WmsSchedule) => {
  try {
    await toggleWmsSchedule(s._id)
    toast.showSuccess(`スケジュール「${s.name}」を${s.isEnabled ? '無効' : '有効'}にしました`)
    await loadSchedules()
  } catch (e: unknown) {
    toast.showError(e instanceof Error ? e.message : '切り替えに失敗しました')
  }
}

const handleRun = async (s: WmsSchedule) => {
  try {
    const task = await runWmsSchedule(s._id)
    toast.showSuccess(`タスク ${task.taskNumber} を作成しました`)
    await loadSchedules()
  } catch (e: unknown) {
    toast.showError(e instanceof Error ? e.message : '実行に失敗しました')
  }
}

const handleDelete = async (s: WmsSchedule) => {
  if (!confirm(`スケジュール「${s.name}」を削除しますか？`)) return
  try {
    await deleteWmsSchedule(s._id)
    toast.showSuccess('スケジュールを削除しました')
    await loadSchedules()
  } catch (e: unknown) {
    toast.showError(e instanceof Error ? e.message : '削除に失敗しました')
  }
}

// ---------------------------------------------------------------------------
// Dialog (Create / Edit)
// ---------------------------------------------------------------------------

const showDialog = ref(false)
const editingId = ref<string | null>(null)

const form = reactive({
  name: '',
  action: '',
  description: '',
  scheduleType: 'manual' as 'manual' | 'scheduled',
  cronExpression: '',
  cronHour: 9,
  cronMinute: 0,
  cronDaysOfWeek: [] as number[],
  skipHolidays: false,
  metadataJson: '',
})

const resetForm = () => {
  form.name = ''
  form.action = ''
  form.description = ''
  form.scheduleType = 'manual'
  form.cronExpression = ''
  form.cronHour = 9
  form.cronMinute = 0
  form.cronDaysOfWeek = []
  form.skipHolidays = false
  form.metadataJson = ''
}

const openCreateDialog = () => {
  editingId.value = null
  resetForm()
  showDialog.value = true
}

const openEditDialog = (s: WmsSchedule) => {
  editingId.value = s._id
  form.name = s.name
  form.action = s.action
  form.description = s.description || ''
  form.scheduleType = s.scheduleType
  form.cronExpression = s.cronExpression || ''
  form.cronHour = s.cronHour ?? 9
  form.cronMinute = s.cronMinute ?? 0
  form.cronDaysOfWeek = [...s.cronDaysOfWeek]
  form.skipHolidays = s.skipHolidays
  form.metadataJson = s.metadata ? JSON.stringify(s.metadata, null, 2) : ''
  showDialog.value = true
}

const closeDialog = () => {
  showDialog.value = false
}

const saveSchedule = async () => {
  if (!form.name.trim() || !form.action) {
    toast.showError('名前とアクションは必須です')
    return
  }

  let metadata: Record<string, unknown> | undefined
  if (form.metadataJson.trim()) {
    try {
      metadata = JSON.parse(form.metadataJson)
    } catch {
      toast.showError('メタデータのJSONが不正です')
      return
    }
  }

  const payload = {
    name: form.name.trim(),
    action: form.action,
    description: form.description.trim() || undefined,
    scheduleType: form.scheduleType,
    cronExpression: form.scheduleType === 'scheduled' ? form.cronExpression || undefined : undefined,
    cronHour: form.scheduleType === 'scheduled' ? form.cronHour : undefined,
    cronMinute: form.scheduleType === 'scheduled' ? form.cronMinute : undefined,
    cronDaysOfWeek: form.scheduleType === 'scheduled' ? [...form.cronDaysOfWeek] : [],
    skipHolidays: form.scheduleType === 'scheduled' ? form.skipHolidays : false,
    metadata,
  }

  try {
    if (editingId.value) {
      await updateWmsSchedule(editingId.value, payload)
      toast.showSuccess('スケジュールを更新しました')
    } else {
      await createWmsSchedule(payload)
      toast.showSuccess('スケジュールを作成しました')
    }
    closeDialog()
    await loadSchedules()
  } catch (e: unknown) {
    toast.showError(e instanceof Error ? e.message : '保存に失敗しました')
  }
}

// ---------------------------------------------------------------------------
// Tab 2: Tasks
// ---------------------------------------------------------------------------

const tasks = ref<WmsTask[]>([])
const tasksLoading = ref(false)
const taskTotal = ref(0)
const taskPage = ref(1)
const taskPageSize = ref(50)

const taskFilterStatus = ref('')
const taskFilterDateFrom = ref('')
const taskFilterDateTo = ref('')

const taskTotalPages = computed(() => Math.max(1, Math.ceil(taskTotal.value / taskPageSize.value)))

const loadTasks = async () => {
  tasksLoading.value = true
  try {
    const res = await fetchWmsTasks({
      status: taskFilterStatus.value || undefined,
      dateFrom: taskFilterDateFrom.value || undefined,
      dateTo: taskFilterDateTo.value || undefined,
      page: taskPage.value,
      limit: taskPageSize.value,
    })
    tasks.value = res.data
    taskTotal.value = res.total
  } catch (e: unknown) {
    toast.showError(e instanceof Error ? e.message : 'タスクの取得に失敗しました')
  } finally {
    tasksLoading.value = false
  }
}

const doTaskSearch = () => {
  taskPage.value = 1
  loadTasks()
}

const resetTaskFilters = () => {
  taskFilterStatus.value = ''
  taskFilterDateFrom.value = ''
  taskFilterDateTo.value = ''
  taskPage.value = 1
  loadTasks()
}

const onTaskPageSizeChange = () => {
  taskPage.value = 1
  loadTasks()
}

const goTaskPage = (p: number) => {
  taskPage.value = p
  loadTasks()
}

// ---------------------------------------------------------------------------
// Tab 3: Logs
// ---------------------------------------------------------------------------

const logs = ref<WmsScheduleLog[]>([])
const logsLoading = ref(false)
const logTotal = ref(0)
const logPage = ref(1)
const logPageSize = ref(50)

const logFilterAction = ref('')
const logFilterEvent = ref('')
const logFilterDateFrom = ref('')
const logFilterDateTo = ref('')

const logTotalPages = computed(() => Math.max(1, Math.ceil(logTotal.value / logPageSize.value)))

const loadLogs = async () => {
  logsLoading.value = true
  try {
    const res = await fetchWmsLogs({
      action: logFilterAction.value || undefined,
      event: logFilterEvent.value || undefined,
      dateFrom: logFilterDateFrom.value || undefined,
      dateTo: logFilterDateTo.value || undefined,
      page: logPage.value,
      limit: logPageSize.value,
    })
    logs.value = res.data
    logTotal.value = res.total
  } catch (e: unknown) {
    toast.showError(e instanceof Error ? e.message : 'ログの取得に失敗しました')
  } finally {
    logsLoading.value = false
  }
}

const doLogSearch = () => {
  logPage.value = 1
  loadLogs()
}

const resetLogFilters = () => {
  logFilterAction.value = ''
  logFilterEvent.value = ''
  logFilterDateFrom.value = ''
  logFilterDateTo.value = ''
  logPage.value = 1
  loadLogs()
}

const onLogPageSizeChange = () => {
  logPage.value = 1
  loadLogs()
}

const goLogPage = (p: number) => {
  logPage.value = p
  loadLogs()
}

const exportLogsCsv = async () => {
  try {
    const data = await exportWmsLogs({
      action: logFilterAction.value || undefined,
      event: logFilterEvent.value || undefined,
      dateFrom: logFilterDateFrom.value || undefined,
      dateTo: logFilterDateTo.value || undefined,
    })

    const csvRows: string[] = ['日時,アクション,イベント,タスク番号,メッセージ,ユーザー']
    for (const r of data) {
      csvRows.push([
        `"${formatDateTime(r.createdAt)}"`,
        `"${actionLabel(r.action)}"`,
        `"${eventLabel(r.event)}"`,
        `"${r.taskNumber || ''}"`,
        `"${(r.message || '').replace(/"/g, '""')}"`,
        `"${r.userName}"`,
      ].join(','))
    }

    const bom = '\uFEFF'
    const blob = new Blob([bom + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `wms_schedule_logs_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e: unknown) {
    toast.showError(e instanceof Error ? e.message : 'エクスポートに失敗しました')
  }
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

onMounted(() => {
  loadSchedules()
})
</script>

<style>
@import '@/styles/order-table.css';
</style>

<style scoped>
.wms-schedule-view {
  display: flex;
  flex-direction: column;
  padding: 1rem;
}

/* Tabs */
.tab-bar {
  display: flex;
  gap: 0;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--o-gray-200, #e4e7ed);
}

.tab-btn {
  padding: 8px 20px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: var(--o-gray-600, #606266);
  position: relative;
  transition: color 0.15s;
}

.tab-btn:hover {
  color: var(--o-gray-900, #303133);
}

.tab-btn.active {
  color: var(--o-brand-primary, #714b67);
  font-weight: 600;
  box-shadow: inset 0 -2px 0 var(--o-brand-primary, #714b67);
}

/* Filters */
.filter-bar {
  background: var(--o-gray-50, #fafafa);
  border: 1px solid var(--o-gray-200, #e4e7ed);
  border-radius: 4px;
  padding: 12px 16px;
  margin-bottom: 12px;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-end;
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-label {
  font-size: 12px;
  color: var(--o-gray-600, #606266);
  font-weight: 500;
}

.filter-actions {
  display: flex;
  flex-direction: row;
  gap: 6px;
  align-items: flex-end;
}

/* Badges */
.action-badge {
  font-size: 12px;
  background: var(--o-gray-100, #f5f7fa);
  padding: 2px 8px;
  border-radius: 3px;
  font-weight: 600;
  white-space: nowrap;
}

.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: 600;
}

.status--queued { background: #f4f4f5; color: #909399; }
.status--running { background: #d9ecff; color: #409eff; }
.status--completed { background: #e1f3d8; color: #67c23a; }
.status--failed { background: #fef0f0; color: #f56c6c; }
.status--cancelled { background: #f4f4f5; color: #909399; text-decoration: line-through; }

.task-number {
  font-family: monospace;
  font-size: 12px;
  color: var(--o-brand-primary, #714b67);
  font-weight: 600;
}

/* Toggle button */
.toggle-btn {
  padding: 2px 10px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid var(--o-gray-300, #dcdfe6);
  background: var(--o-gray-100, #f5f7fa);
  color: var(--o-gray-500, #909399);
  cursor: pointer;
  transition: all 0.15s;
}

.toggle-btn.toggle-on {
  background: #e1f3d8;
  color: #67c23a;
  border-color: #c2e7b0;
}

/* Form */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-field--full {
  grid-column: 1 / -1;
}

.form-label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: var(--o-gray-700, #303133);
  margin-bottom: 4px;
}

.required {
  color: #f56c6c;
}

.radio-group {
  display: flex;
  gap: 16px;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  cursor: pointer;
}

.checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  cursor: pointer;
}

.o-table-td--right { text-align: right; }
.o-table-th--right { text-align: right; }
</style>
