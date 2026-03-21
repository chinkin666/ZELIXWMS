<template>
  <div class="wms-schedule-view">
    <ControlPanel :title="t('wms.schedule.title', 'WMSスケジュール')" :show-search="false">
      <template #actions>
        <div style="display:flex;gap:6px;align-items:center;">
          <OButton v-if="activeTab === 'schedules'" variant="primary" size="sm" @click="openCreateDialog">
            {{ t('wms.schedule.newSchedule', '新規スケジュール') }}
          </OButton>
          <OButton v-if="activeTab === 'logs'" variant="secondary" size="sm" @click="exportLogsCsv">
            {{ t('wms.schedule.exportCsv', 'CSV出力') }}
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
      >{{ t('wms.schedule.schedules', 'スケジュール') }}</button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'tasks' }"
        @click="activeTab = 'tasks'"
      >{{ t('wms.schedule.tasks', 'タスク') }}</button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'logs' }"
        @click="activeTab = 'logs'"
      >{{ t('wms.schedule.logs', 'ログ') }}</button>
    </div>

    <!-- ================================================================= -->
    <!-- Tab 1: スケジュール -->
    <!-- ================================================================= -->
    <div v-if="activeTab === 'schedules'">
      <div class="table-section">
        <Table
          :columns="scheduleTableColumns"
          :data="schedules"
          row-key="_id"
          highlight-columns-on-hover
          pagination-enabled
          pagination-mode="client"
          :page-size="20"
          :page-sizes="[20, 50]"
        />
      </div>
    </div>

    <!-- ================================================================= -->
    <!-- Tab 2: タスク -->
    <!-- ================================================================= -->
    <div v-if="activeTab === 'tasks'">
      <SearchForm
        class="search-section"
        :columns="taskSearchColumns"
        :show-save="false"
        storage-key="wmsTaskSearch"
        @search="handleTaskSearch"
      />

      <div class="table-section">
        <Table
          :columns="taskTableColumns"
          :data="tasks"
          row-key="_id"
          highlight-columns-on-hover
          pagination-enabled
          pagination-mode="server"
          :page-size="taskPageSize"
          :page-sizes="[25, 50, 100]"
          :total="taskTotal"
          :current-page="taskPage"
          @page-change="onTaskPageChange"
        />
      </div>
    </div>

    <!-- ================================================================= -->
    <!-- Tab 3: ログ -->
    <!-- ================================================================= -->
    <div v-if="activeTab === 'logs'">
      <SearchForm
        class="search-section"
        :columns="logSearchColumns"
        :show-save="false"
        storage-key="wmsLogSearch"
        @search="handleLogSearch"
      />

      <div class="table-section">
        <Table
          :columns="logTableColumns"
          :data="logs"
          row-key="_id"
          highlight-columns-on-hover
          pagination-enabled
          pagination-mode="server"
          :page-size="logPageSize"
          :page-sizes="[25, 50, 100]"
          :total="logTotal"
          :current-page="logPage"
          @page-change="onLogPageChange"
        />
      </div>
    </div>

    <!-- ================================================================= -->
    <!-- Create / Edit Dialog -->
    <!-- ================================================================= -->
    <ODialog v-model="showDialog" :title="editingId ? t('wms.schedule.editSchedule', 'スケジュール編集') : t('wms.schedule.newSchedule', '新規スケジュール')" size="lg" @close="closeDialog">
      <template #default>
        <div class="form-grid">
          <div class="form-field">
            <label class="form-label">{{ t('wms.schedule.name', '名前') }} <span class="required-badge">必須</span></label>
            <input type="text" class="o-input" v-model="form.name" :placeholder="t('wms.schedule.scheduleName', 'スケジュール名')" />
          </div>
          <div class="form-field">
            <label class="form-label">{{ t('wms.schedule.action', 'アクション') }} <span class="required-badge">必須</span></label>
            <select class="o-input" v-model="form.action">
              <option value="">{{ t('wms.schedule.selectPlaceholder', '選択してください') }}</option>
              <option v-for="(label, key) in ACTION_LABELS" :key="key" :value="key">{{ label }}</option>
            </select>
          </div>
          <div class="form-field form-field--full">
            <label class="form-label">{{ t('wms.schedule.description', '説明') }}</label>
            <input type="text" class="o-input" v-model="form.description" :placeholder="t('wms.schedule.descriptionOptional', '説明（任意）')" />
          </div>
          <div class="form-field form-field--full">
            <label class="form-label">{{ t('wms.schedule.executionType', '実行タイプ') }}</label>
            <div class="radio-group">
              <label class="radio-label">
                <input type="radio" value="manual" v-model="form.scheduleType" /> {{ t('wms.schedule.manual', '手動') }}
              </label>
              <label class="radio-label">
                <input type="radio" value="scheduled" v-model="form.scheduleType" /> {{ t('wms.schedule.scheduled', 'スケジュール') }}
              </label>
            </div>
          </div>
          <template v-if="form.scheduleType === 'scheduled'">
            <div class="form-field">
              <label class="form-label">{{ t('wms.schedule.hour', '時 (0-23)') }}</label>
              <input type="number" class="o-input" v-model.number="form.cronHour" min="0" max="23" />
            </div>
            <div class="form-field">
              <label class="form-label">{{ t('wms.schedule.minute', '分 (0-59)') }}</label>
              <input type="number" class="o-input" v-model.number="form.cronMinute" min="0" max="59" />
            </div>
            <div class="form-field form-field--full">
              <label class="form-label">{{ t('wms.schedule.daysOfWeek', '曜日 (空=毎日)') }}</label>
              <div class="checkbox-group">
                <label v-for="(dayLabel, idx) in DAY_LABELS" :key="idx" class="checkbox-label">
                  <input type="checkbox" :value="idx" v-model="form.cronDaysOfWeek" />
                  {{ dayLabel }}
                </label>
              </div>
            </div>
            <div class="form-field">
              <label class="form-label">{{ t('wms.schedule.cronExpression', 'Cron式 (上級)') }}</label>
              <input type="text" class="o-input" v-model="form.cronExpression" placeholder="0 9 * * *" />
            </div>
            <div class="form-field">
              <label class="checkbox-label">
                <input type="checkbox" v-model="form.skipHolidays" />
                {{ t('wms.schedule.skipHolidays', '祝日スキップ') }}
              </label>
            </div>
          </template>
          <div class="form-field form-field--full">
            <label class="form-label">{{ t('wms.schedule.metadataJson', 'メタデータ (JSON)') }}</label>
            <textarea class="o-input" v-model="form.metadataJson" rows="3" placeholder='{"key": "value"}'></textarea>
          </div>
        </div>
      </template>
      <template #footer>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <OButton variant="secondary" size="sm" @click="closeDialog">{{ t('wms.common.cancel', 'キャンセル') }}</OButton>
          <OButton variant="primary" size="sm" @click="saveSchedule">{{ t('wms.common.save', '保存') }}</OButton>
        </div>
      </template>
    </ODialog>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, reactive, ref, watch } from 'vue'
import { ElMessageBox } from 'element-plus'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import ODialog from '@/components/odoo/ODialog.vue'
import SearchForm from '@/components/search/SearchForm.vue'
import Table from '@/components/table/Table.vue'
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
import type { TableColumn, Operator } from '@/types/table'

const toast = useToast()
const { t } = useI18n()

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACTION_LABELS: Record<string, string> = {
  auto_allocate: t('wms.schedule.actionAutoAllocate', '自動引当'),
  auto_batch: t('wms.schedule.actionAutoBatch', '自動バッチ'),
  auto_print: t('wms.schedule.actionAutoPrint', '自動印刷'),
  auto_label: t('wms.schedule.actionAutoLabel', '自動ラベル'),
  inventory_sync: t('wms.schedule.actionInventorySync', '在庫同期'),
  report_generate: t('wms.schedule.actionReportGenerate', 'レポート生成'),
  cleanup: t('wms.schedule.actionCleanup', 'クリーンアップ'),
}

const EVENT_LABELS: Record<string, string> = {
  schedule_created: t('wms.schedule.eventCreated', '作成'),
  schedule_updated: t('wms.schedule.eventUpdated', '更新'),
  schedule_enabled: t('wms.schedule.eventEnabled', '有効化'),
  schedule_disabled: t('wms.schedule.eventDisabled', '無効化'),
  task_started: t('wms.schedule.eventTaskStarted', 'タスク開始'),
  task_completed: t('wms.schedule.eventTaskCompleted', 'タスク完了'),
  task_failed: t('wms.schedule.eventTaskFailed', 'タスク失敗'),
  manual_run: t('wms.schedule.eventManualRun', '手動実行'),
}

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const

const TASK_STATUS_LABELS: Record<string, string> = {
  queued: t('wms.schedule.statusQueued', '待機中'),
  running: t('wms.schedule.statusRunning', '実行中'),
  completed: t('wms.schedule.statusCompleted', '完了'),
  failed: t('wms.schedule.statusFailed', '失敗'),
  cancelled: t('wms.schedule.statusCancelled', 'キャンセル'),
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
  const hr = s.cronHour != null ? String(s.cronHour).padStart(2, '0') : '**'
  const m = s.cronMinute != null ? String(s.cronMinute).padStart(2, '0') : '**'
  const days = s.cronDaysOfWeek.length > 0
    ? s.cronDaysOfWeek.map(d => DAY_LABELS[d]).join(',')
    : t('wms.schedule.everyday', '毎日')
  return `${hr}:${m} (${days})`
}

// ---------------------------------------------------------------------------
// Tab 1: Schedules
// ---------------------------------------------------------------------------

const schedules = ref<WmsSchedule[]>([])
const schedulesLoading = ref(false)

const scheduleTableColumns: TableColumn[] = [
  { key: 'name', dataKey: 'name', title: t('wms.schedule.name', '名前'), width: 180, fieldType: 'string' },
  {
    key: 'action', dataKey: 'action', title: t('wms.schedule.action', 'アクション'), width: 120, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: WmsSchedule }) =>
      h('span', { class: 'action-badge' }, actionLabel(rowData.action)),
  },
  {
    key: 'scheduleType', dataKey: 'scheduleType', title: t('wms.schedule.type', 'タイプ'), width: 90, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: WmsSchedule }) =>
      rowData.scheduleType === 'scheduled' ? t('wms.schedule.scheduled', 'スケジュール') : t('wms.schedule.manual', '手動'),
  },
  {
    key: 'cronDisplay', title: t('wms.schedule.executionTime', '実行時間'), width: 120, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: WmsSchedule }) => formatCronDisplay(rowData),
  },
  {
    key: 'isEnabled', dataKey: 'isEnabled', title: t('wms.schedule.enabled', '有効'), width: 70, fieldType: 'boolean',
    cellRenderer: ({ rowData }: { rowData: WmsSchedule }) =>
      h('button', {
        class: `toggle-btn ${rowData.isEnabled ? 'toggle-on' : ''}`,
        onClick: () => handleToggle(rowData),
      }, rowData.isEnabled ? 'ON' : 'OFF'),
  },
  {
    key: 'lastRunAt', dataKey: 'lastRunAt', title: t('wms.schedule.lastRun', '最終実行'), width: 140, fieldType: 'date',
    cellRenderer: ({ rowData }: { rowData: WmsSchedule }) => formatDateTime(rowData.lastRunAt),
  },
  { key: 'runCount', dataKey: 'runCount', title: t('wms.schedule.runCount', '実行回数'), width: 70, fieldType: 'number' },
  {
    key: 'actions', title: t('wms.common.actions', '操作'), width: 160, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: WmsSchedule }) =>
      h('div', { style: 'display:flex;gap:4px;' }, [
        h(OButton, { variant: 'secondary', size: 'sm', onClick: () => openEditDialog(rowData) }, () => t('wms.common.edit', '編集')),
        h(OButton, { variant: 'primary', size: 'sm', onClick: () => handleRun(rowData) }, () => t('wms.schedule.run', '実行')),
        h(OButton, { variant: 'danger', size: 'sm', onClick: () => handleDelete(rowData) }, () => t('wms.common.delete', '削除')),
      ]),
  },
]

const loadSchedules = async () => {
  schedulesLoading.value = true
  try {
    const res = await fetchWmsSchedules()
    schedules.value = res.data
  } catch (e: unknown) {
    toast.showError(e instanceof Error ? e.message : t('wms.schedule.fetchError', 'スケジュールの取得に失敗しました'))
  } finally {
    schedulesLoading.value = false
  }
}

const handleToggle = async (s: WmsSchedule) => {
  try {
    await toggleWmsSchedule(s._id)
    toast.showSuccess(t('wms.schedule.toggleSuccess', `スケジュール「${s.name}」を${s.isEnabled ? '無効' : '有効'}にしました`))
    await loadSchedules()
  } catch (e: unknown) {
    toast.showError(e instanceof Error ? e.message : t('wms.schedule.toggleError', '切り替えに失敗しました'))
  }
}

const handleRun = async (s: WmsSchedule) => {
  try {
    const task = await runWmsSchedule(s._id)
    toast.showSuccess(t('wms.schedule.taskCreated', `タスク ${task.taskNumber} を作成しました`))
    await loadSchedules()
  } catch (e: unknown) {
    toast.showError(e instanceof Error ? e.message : t('wms.schedule.runError', '実行に失敗しました'))
  }
}

const handleDelete = async (s: WmsSchedule) => {
  try {
    await ElMessageBox.confirm(
      `スケジュール「${s.name}」を削除してもよろしいですか？ / 确定要删除计划「${s.name}」吗？`,
      '確認 / 确认',
      { confirmButtonText: '削除 / 删除', cancelButtonText: 'キャンセル / 取消', type: 'warning' },
    )
  } catch { return }
  try {
    await deleteWmsSchedule(s._id)
    toast.showSuccess(t('wms.schedule.deleteSuccess', 'スケジュールを削除しました'))
    await loadSchedules()
  } catch (e: unknown) {
    toast.showError(e instanceof Error ? e.message : t('wms.schedule.deleteError', '削除に失敗しました'))
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
    toast.showError(t('wms.schedule.nameActionRequired', '名前とアクションは必須です'))
    return
  }

  let metadata: Record<string, unknown> | undefined
  if (form.metadataJson.trim()) {
    try {
      metadata = JSON.parse(form.metadataJson)
    } catch {
      toast.showError(t('wms.schedule.invalidJson', 'メタデータのJSONが不正です'))
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
      toast.showSuccess(t('wms.schedule.updateSuccess', 'スケジュールを更新しました'))
    } else {
      await createWmsSchedule(payload)
      toast.showSuccess(t('wms.schedule.createSuccess', 'スケジュールを作成しました'))
    }
    closeDialog()
    await loadSchedules()
  } catch (e: unknown) {
    toast.showError(e instanceof Error ? e.message : t('wms.schedule.saveError', '保存に失敗しました'))
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

const taskSearchColumns: TableColumn[] = [
  {
    key: 'status', dataKey: 'status', title: t('wms.schedule.status', 'ステータス'), width: 90, fieldType: 'string',
    searchable: true, searchType: 'select',
    searchOptions: [
      { label: t('wms.schedule.statusQueued', '待機中'), value: 'queued' },
      { label: t('wms.schedule.statusRunning', '実行中'), value: 'running' },
      { label: t('wms.schedule.statusCompleted', '完了'), value: 'completed' },
      { label: t('wms.schedule.statusFailed', '失敗'), value: 'failed' },
      { label: t('wms.schedule.statusCancelled', 'キャンセル'), value: 'cancelled' },
    ],
  },
]

const taskTableColumns: TableColumn[] = [
  {
    key: 'taskNumber', dataKey: 'taskNumber', title: t('wms.schedule.taskNumber', 'タスク番号'), width: 140, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: WmsTask }) => h('span', { class: 'task-number' }, rowData.taskNumber),
  },
  { key: 'scheduleName', dataKey: 'scheduleName', title: t('wms.schedule.scheduleName', 'スケジュール名'), width: 140, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: WmsTask }) => rowData.scheduleName || '-' },
  {
    key: 'action', dataKey: 'action', title: t('wms.schedule.action', 'アクション'), width: 100, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: WmsTask }) => h('span', { class: 'action-badge' }, actionLabel(rowData.action)),
  },
  {
    key: 'status', dataKey: 'status', title: t('wms.schedule.status', 'ステータス'), width: 90, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: WmsTask }) =>
      h('span', { class: `status-badge status--${rowData.status}` }, taskStatusLabel(rowData.status)),
  },
  { key: 'processedCount', dataKey: 'processedCount', title: t('wms.schedule.processedCount', '処理数'), width: 60, fieldType: 'number' },
  { key: 'successCount', dataKey: 'successCount', title: t('wms.schedule.successCount', '成功数'), width: 60, fieldType: 'number' },
  { key: 'errorCount', dataKey: 'errorCount', title: t('wms.schedule.errorCount', 'エラー数'), width: 60, fieldType: 'number' },
  {
    key: 'triggeredBy', dataKey: 'triggeredBy', title: t('wms.schedule.trigger', 'トリガー'), width: 70, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: WmsTask }) => rowData.triggeredBy === 'manual' ? t('wms.schedule.manual', '手動') : t('wms.schedule.scheduler', 'スケジューラ'),
  },
  {
    key: 'startedAt', dataKey: 'startedAt', title: t('wms.schedule.startedAt', '開始日時'), width: 140, fieldType: 'date',
    cellRenderer: ({ rowData }: { rowData: WmsTask }) => formatDateTime(rowData.startedAt),
  },
  {
    key: 'durationMs', dataKey: 'durationMs', title: t('wms.schedule.duration', '処理時間'), width: 80, fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: WmsTask }) => rowData.durationMs != null ? formatDuration(rowData.durationMs) : '-',
  },
  { key: 'message', dataKey: 'message', title: t('wms.schedule.message', 'メッセージ'), width: 200, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: WmsTask }) => rowData.message || '-' },
]

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
    toast.showError(e instanceof Error ? e.message : t('wms.schedule.taskFetchError', 'タスクの取得に失敗しました'))
  } finally {
    tasksLoading.value = false
  }
}

const handleTaskSearch = (payload: Record<string, { operator: Operator; value: any }>) => {
  taskFilterStatus.value = payload.status?.value || ''
  taskPage.value = 1
  loadTasks()
}

const onTaskPageChange = (payload: { page: number; pageSize: number }) => {
  taskPage.value = payload.page
  taskPageSize.value = payload.pageSize
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

const logSearchColumns: TableColumn[] = [
  {
    key: 'action', dataKey: 'action', title: t('wms.schedule.action', 'アクション'), width: 110, fieldType: 'string',
    searchable: true, searchType: 'select',
    searchOptions: Object.entries(ACTION_LABELS).map(([value, label]) => ({ label, value })),
  },
  {
    key: 'event', dataKey: 'event', title: t('wms.schedule.event', 'イベント'), width: 120, fieldType: 'string',
    searchable: true, searchType: 'select',
    searchOptions: Object.entries(EVENT_LABELS).map(([value, label]) => ({ label, value })),
  },
]

const logTableColumns: TableColumn[] = [
  {
    key: 'createdAt', dataKey: 'createdAt', title: t('wms.schedule.dateTime', '日時'), width: 150, fieldType: 'date',
    cellRenderer: ({ rowData }: { rowData: WmsScheduleLog }) => formatDateTime(rowData.createdAt),
  },
  {
    key: 'action', dataKey: 'action', title: t('wms.schedule.action', 'アクション'), width: 110, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: WmsScheduleLog }) => h('span', { class: 'action-badge' }, actionLabel(rowData.action)),
  },
  {
    key: 'event', dataKey: 'event', title: t('wms.schedule.event', 'イベント'), width: 120, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: WmsScheduleLog }) => eventLabel(rowData.event),
  },
  {
    key: 'taskNumber', dataKey: 'taskNumber', title: t('wms.schedule.taskNumber', 'タスク番号'), width: 140, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: WmsScheduleLog }) =>
      rowData.taskNumber ? h('span', { class: 'task-number' }, rowData.taskNumber) : '-',
  },
  { key: 'message', dataKey: 'message', title: t('wms.schedule.message', 'メッセージ'), width: 200, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: WmsScheduleLog }) => rowData.message || '-' },
  { key: 'userName', dataKey: 'userName', title: t('wms.schedule.user', 'ユーザー'), width: 90, fieldType: 'string' },
]

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
    toast.showError(e instanceof Error ? e.message : t('wms.schedule.logFetchError', 'ログの取得に失敗しました'))
  } finally {
    logsLoading.value = false
  }
}

const handleLogSearch = (payload: Record<string, { operator: Operator; value: any }>) => {
  logFilterAction.value = payload.action?.value || ''
  logFilterEvent.value = payload.event?.value || ''
  logPage.value = 1
  loadLogs()
}

const onLogPageChange = (payload: { page: number; pageSize: number }) => {
  logPage.value = payload.page
  logPageSize.value = payload.pageSize
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

    const csvRows: string[] = [`${t('wms.schedule.dateTime', '日時')},${t('wms.schedule.action', 'アクション')},${t('wms.schedule.event', 'イベント')},${t('wms.schedule.taskNumber', 'タスク番号')},${t('wms.schedule.message', 'メッセージ')},${t('wms.schedule.user', 'ユーザー')}`]
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
    toast.showError(e instanceof Error ? e.message : t('wms.schedule.exportError', 'エクスポートに失敗しました'))
  }
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

onMounted(() => {
  loadSchedules()
})
</script>

<style scoped>
.wms-schedule-view {
  display: flex;
  flex-direction: column;
  padding: 0 20px 20px;
  gap: 16px;
}

:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}

.table-section {
  width: 100%;
}

/* Tabs */
.tab-bar {
  display: flex;
  gap: 0;
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
</style>
