<template>
  <div class="script-editor">
    <ControlPanel :title="t('wms.settings.automationScripts', '自動化スクリプト')" :show-search="false">
      <template #actions>
        <OButton variant="primary" @click="openCreate">{{ t('wms.settings.addNew', '新規追加') }}</OButton>
      </template>
    </ControlPanel>

    <!-- Filter -->
    <div class="search-section">
      <select v-model="filterEvent" class="o-input" style="width: 220px" @change="loadList">
        <option value="">{{ t('wms.settings.allEvents', 'すべてのイベント') }}</option>
        <option v-for="ev in availableEvents" :key="ev" :value="ev">{{ ev }}</option>
      </select>
      <label class="search-section__filter">
        <input v-model="showEnabledOnly" type="checkbox" @change="loadList" />
        {{ t('wms.settings.enabledOnly', '有効のみ') }}
      </label>
    </div>

    <!-- Table -->
    <div class="o-table-wrapper">
      <table class="o-table">
        <thead>
          <tr>
            <th class="o-table-th" style="width: 60px">{{ t('wms.settings.state', '状態') }}</th>
            <th class="o-table-th" style="width: 200px">{{ t('wms.settings.name', '名称') }}</th>
            <th class="o-table-th" style="width: 180px">{{ t('wms.settings.event', 'イベント') }}</th>
            <th class="o-table-th">{{ t('wms.settings.description', '説明') }}</th>
            <th class="o-table-th" style="width: 80px">{{ t('wms.settings.timeout', 'タイムアウト') }}</th>
            <th class="o-table-th" style="width: 260px">{{ t('wms.common.actions', '操作') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td class="o-table-td o-table-empty" colspan="6">{{ t('wms.settings.loading', '読み込み中...') }}</td>
          </tr>
          <tr v-else-if="scripts.length === 0">
            <td class="o-table-td o-table-empty" colspan="6">{{ t('wms.settings.noScripts', 'スクリプトがありません') }}</td>
          </tr>
          <tr v-for="s in scripts" :key="s._id" class="o-table-row">
            <td class="o-table-td" style="text-align: center">
              <span
                :class="s.enabled ? 'o-status-tag o-status-tag--confirmed' : 'o-status-tag o-status-tag--cancelled'"
                style="cursor: pointer"
                @click="handleToggle(s)"
              >
                {{ s.enabled ? 'ON' : 'OFF' }}
              </span>
            </td>
            <td class="o-table-td"><strong>{{ s.name }}</strong></td>
            <td class="o-table-td"><code class="event-code">{{ s.event }}</code></td>
            <td class="o-table-td">{{ s.description || '-' }}</td>
            <td class="o-table-td" style="text-align: center">{{ s.timeout }}ms</td>
            <td class="o-table-td o-table-td--actions">
              <OButton variant="secondary" size="sm" :disabled="testingId === s._id" @click="handleTest(s)">
                {{ testingId === s._id ? t('wms.settings.testing', 'テスト中...') : t('wms.settings.test', 'テスト') }}
              </OButton>
              <OButton variant="secondary" size="sm" @click="openLogs(s)">{{ t('wms.settings.logs', 'ログ') }}</OButton>
              <OButton variant="primary" size="sm" @click="openEdit(s)">{{ t('wms.common.edit', '編集') }}</OButton>
              <OButton variant="icon-danger" size="sm" @click="confirmDelete(s)">{{ t('wms.common.delete', '削除') }}</OButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Create/Edit Dialog -->
    <ODialog v-model="dialogOpen" :title="isEditing ? t('wms.settings.editScript', 'スクリプトを編集') : t('wms.settings.addScript', 'スクリプトを追加')" size="xl" @confirm="handleSave">
      <div class="form-grid">
        <div class="form-field">
          <label class="form-label">{{ t('wms.settings.name', '名称') }} <span class="required">*</span></label>
          <input v-model="form.name" type="text" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">{{ t('wms.settings.event', 'イベント') }} <span class="required">*</span></label>
          <select v-model="form.event" class="o-input">
            <option value="" disabled>{{ t('wms.settings.selectPlease', '選択してください') }}</option>
            <option v-for="ev in availableEvents" :key="ev" :value="ev">{{ ev }}</option>
          </select>
        </div>
        <div class="form-field">
          <label class="form-label">{{ t('wms.settings.timeoutMs', 'タイムアウト(ms)') }}</label>
          <input v-model.number="form.timeout" type="number" class="o-input" min="100" max="30000" />
        </div>
        <div class="form-field">
          <label class="form-label">{{ t('wms.settings.description', '説明') }}</label>
          <input v-model="form.description" type="text" class="o-input" />
        </div>
        <div class="form-field form-field--full">
          <label class="form-label">{{ t('wms.settings.code', 'コード') }} <span class="required">*</span></label>
          <textarea
            v-model="form.code"
            class="o-input code-textarea"
            rows="14"
            spellcheck="false"
            placeholder="// 利用可能な変数: order, product, inventory, event
// 変更するには: setField('order.orderGroup', 'cold')
// ログ出力: console.log('message')

if (order.coolType === 'frozen') {
  setField('order.orderGroup', 'cold-chain')
  console.log('Cold chain order detected')
}"
          />
        </div>
      </div>
    </ODialog>

    <!-- Logs Dialog -->
    <ODialog v-model="logsDialogOpen" :title="`${t('wms.settings.executionLog', '実行ログ')} — ${logsScriptName}`" size="xl">
      <div class="logs-filter">
        <select v-model="logsFilterStatus" class="o-input" style="width: 160px" @change="loadLogs">
          <option value="">{{ t('wms.settings.all', 'すべて') }}</option>
          <option value="success">{{ t('wms.settings.statusSuccess', '成功') }}</option>
          <option value="error">{{ t('wms.settings.statusError', 'エラー') }}</option>
          <option value="timeout">{{ t('wms.settings.statusTimeout', 'タイムアウト') }}</option>
        </select>
      </div>
      <div class="o-table-wrapper" style="max-height: 400px; overflow-y: auto">
        <table class="o-table">
          <thead>
            <tr>
              <th class="o-table-th" style="width: 160px">{{ t('wms.settings.dateTime', '日時') }}</th>
              <th class="o-table-th" style="width: 80px">{{ t('wms.settings.state', '状態') }}</th>
              <th class="o-table-th" style="width: 80px">{{ t('wms.settings.executionTime', '実行時間') }}</th>
              <th class="o-table-th">{{ t('wms.settings.errorOutput', 'エラー / 出力') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="logsLoading">
              <td class="o-table-td o-table-empty" colspan="4">{{ t('wms.settings.loading', '読み込み中...') }}</td>
            </tr>
            <tr v-else-if="logs.length === 0">
              <td class="o-table-td o-table-empty" colspan="4">{{ t('wms.settings.noLogs', 'ログがありません') }}</td>
            </tr>
            <tr v-for="log in logs" :key="log._id" class="o-table-row">
              <td class="o-table-td">{{ formatDate(log.createdAt) }}</td>
              <td class="o-table-td">
                <span :class="logStatusClass(log.status)">{{ logStatusLabel(log.status) }}</span>
              </td>
              <td class="o-table-td" style="text-align: right">{{ log.duration }}ms</td>
              <td class="o-table-td">
                <span v-if="log.error" class="error-cell">{{ log.error }}</span>
                <span v-else-if="log.output && Object.keys(log.output).length > 0" class="output-cell">
                  {{ JSON.stringify(log.output) }}
                </span>
                <span v-else>-</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="logsPagination.totalPages > 1" class="o-table-pagination" style="margin-top: 12px">
        <span class="o-table-pagination__info">{{ t('wms.settings.totalCount', `全${logsPagination.total}件`) }}</span>
        <div class="o-table-pagination__controls">
          <OButton variant="secondary" size="sm" :disabled="logsPagination.page <= 1" @click="goToLogsPage(logsPagination.page - 1)">&lsaquo;</OButton>
          <span class="o-table-pagination__page">{{ logsPagination.page }} / {{ logsPagination.totalPages }}</span>
          <OButton variant="secondary" size="sm" :disabled="logsPagination.page >= logsPagination.totalPages" @click="goToLogsPage(logsPagination.page + 1)">&rsaquo;</OButton>
        </div>
      </div>
      <template #footer>
        <OButton variant="secondary" @click="logsDialogOpen = false">{{ t('wms.settings.close', '閉じる') }}</OButton>
      </template>
    </ODialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import ODialog from '@/components/odoo/ODialog.vue'
import {
  fetchScripts,
  createScript,
  updateScript,
  deleteScript as deleteScriptApi,
  toggleScript,
  testScript,
  fetchScriptLogs,
  type AutomationScript,
  type ScriptExecutionLog,
} from '@/api/script'

const { show: showToast } = useToast()
const { t } = useI18n()

// State
const scripts = ref<AutomationScript[]>([])
const availableEvents = ref<string[]>([])
const loading = ref(false)
const filterEvent = ref('')
const showEnabledOnly = ref(false)

// Dialog
const dialogOpen = ref(false)
const editingId = ref<string | null>(null)
const isEditing = computed(() => !!editingId.value)

const emptyForm = () => ({
  name: '',
  event: '',
  code: '',
  description: '',
  timeout: 5000,
})

const form = ref(emptyForm())

// Test
const testingId = ref<string | null>(null)

// Logs
const logsDialogOpen = ref(false)
const logsScriptId = ref('')
const logsScriptName = ref('')
const logs = ref<ScriptExecutionLog[]>([])
const logsLoading = ref(false)
const logsFilterStatus = ref('')
const logsPagination = ref({ page: 1, limit: 50, total: 0, totalPages: 1 })

// Load
const loadList = async () => {
  loading.value = true
  try {
    const params: { event?: string; enabled?: string } = {}
    if (filterEvent.value) params.event = filterEvent.value
    if (showEnabledOnly.value) params.enabled = 'true'
    const result = await fetchScripts(params)
    scripts.value = result.data
    availableEvents.value = result.availableEvents
  } catch (error: any) {
    showToast(error?.message || t('wms.settings.fetchFailed', '取得に失敗しました'), 'danger')
  } finally {
    loading.value = false
  }
}

// CRUD
const openCreate = () => {
  editingId.value = null
  form.value = emptyForm()
  dialogOpen.value = true
}

const openEdit = (s: AutomationScript) => {
  editingId.value = s._id
  form.value = {
    name: s.name,
    event: s.event,
    code: s.code,
    description: s.description || '',
    timeout: s.timeout,
  }
  dialogOpen.value = true
}

const handleSave = async () => {
  if (!form.value.name.trim()) { showToast(t('wms.settings.nameRequired', '名称は必須です'), 'danger'); return }
  if (!form.value.event) { showToast(t('wms.settings.eventRequired', 'イベントを選択してください'), 'danger'); return }
  if (!form.value.code.trim()) { showToast(t('wms.settings.codeRequired', 'コードは必須です'), 'danger'); return }

  try {
    if (editingId.value) {
      await updateScript(editingId.value, { ...form.value })
      showToast(t('wms.settings.updated', '更新しました'), 'success')
    } else {
      await createScript({ ...form.value })
      showToast(t('wms.settings.created', '作成しました'), 'success')
    }
    dialogOpen.value = false
    await loadList()
  } catch (error: any) {
    showToast(error?.message || t('wms.settings.saveFailed', '保存に失敗しました'), 'danger')
  }
}

const confirmDelete = (s: AutomationScript) => {
  if (!confirm(t('wms.settings.confirmDeleteScript', `「${s.name}」を削除しますか？`))) return
  deleteScriptApi(s._id)
    .then(async () => {
      showToast(t('wms.settings.deleted', '削除しました'), 'success')
      await loadList()
    })
    .catch((err: any) => showToast(err?.message || t('wms.settings.deleteFailed', '削除に失敗しました'), 'danger'))
}

// Toggle
const handleToggle = async (s: AutomationScript) => {
  try {
    const result = await toggleScript(s._id)
    s.enabled = result.enabled
    showToast(result.enabled ? t('wms.settings.scriptEnabled', '有効化しました') : t('wms.settings.scriptDisabled', '無効化しました'), 'success')
  } catch (error: any) {
    showToast(error?.message || t('wms.settings.toggleFailed', 'トグルに失敗しました'), 'danger')
  }
}

// Test
const handleTest = async (s: AutomationScript) => {
  testingId.value = s._id
  try {
    const result = await testScript(s._id)
    if (result.success) {
      const mods = Object.keys(result.modifications).length
      showToast(t('wms.settings.testSuccess', `テスト成功${mods > 0 ? ` (${mods}件の変更)` : ''}`), 'success')
    } else {
      showToast(`${t('wms.settings.testFailed', 'テスト失敗')}: ${result.error}`, 'danger')
    }
  } catch (error: any) {
    showToast(error?.message || t('wms.settings.testFailed', 'テストに失敗しました'), 'danger')
  } finally {
    testingId.value = null
  }
}

// Logs
const openLogs = (s: AutomationScript) => {
  logsScriptId.value = s._id
  logsScriptName.value = s.name
  logsFilterStatus.value = ''
  logsPagination.value = { page: 1, limit: 50, total: 0, totalPages: 1 }
  logsDialogOpen.value = true
  loadLogs()
}

const loadLogs = async () => {
  logsLoading.value = true
  try {
    const result = await fetchScriptLogs(logsScriptId.value, {
      status: logsFilterStatus.value || undefined,
      page: logsPagination.value.page,
      limit: logsPagination.value.limit,
    })
    logs.value = result.data
    logsPagination.value = result.pagination
  } catch (error: any) {
    showToast(error?.message || t('wms.settings.fetchLogsFailed', 'ログ取得に失敗しました'), 'danger')
  } finally {
    logsLoading.value = false
  }
}

const goToLogsPage = (page: number) => {
  logsPagination.value.page = page
  loadLogs()
}

// Helpers
const formatDate = (dateStr: string) => {
  const d = new Date(dateStr)
  return d.toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const logStatusClass = (status: string) => {
  const map: Record<string, string> = {
    success: 'o-status-tag o-status-tag--confirmed',
    error: 'o-status-tag o-status-tag--cancelled',
    timeout: 'o-status-tag o-status-tag--pending',
  }
  return map[status] || 'o-status-tag'
}

const logStatusLabel = (status: string) => {
  const map: Record<string, string> = { success: t('wms.settings.statusSuccess', '成功'), error: t('wms.settings.statusError', 'エラー'), timeout: t('wms.settings.statusTimeout', 'タイムアウト') }
  return map[status] || status
}

onMounted(() => { loadList() })
</script>

<style>
@import '@/styles/order-table.css';

.o-status-tag--cancelled { background: #fef0f0; color: #f56c6c; }
.o-status-tag--pending { background: #fdf6ec; color: #e6a23c; }
</style>

<style scoped>
.script-editor {
  padding: 0 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}

.search-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-section__filter {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
}

.event-code {
  font-size: 12px;
  background: var(--o-gray-100, #f0f2f5);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'SF Mono', 'Fira Code', monospace;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 16px;
}

.form-field--full { grid-column: 1 / -1; }

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 4px;
  color: var(--o-gray-700, #303133);
}

.required { color: #dc2626; }

.code-textarea {
  font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.5;
  tab-size: 2;
  resize: vertical;
  white-space: pre;
  overflow-wrap: normal;
  overflow-x: auto;
}

.error-cell {
  display: block;
  max-width: 350px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: #f56c6c;
}

.output-cell {
  display: block;
  max-width: 350px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: var(--o-gray-500, #909399);
  font-family: 'SF Mono', monospace;
}

.logs-filter { margin-bottom: 12px; }
</style>
