<template>
  <div class="webhook-settings">
    <ControlPanel title="Webhook 管理" :show-search="false">
      <template #actions>
        <OButton variant="primary" @click="openCreate">新規追加</OButton>
      </template>
    </ControlPanel>

    <SearchForm
      class="search-section"
      :columns="searchColumns"
      :show-save="false"
      storage-key="webhookSettingsSearch"
      @search="handleSearch"
    />

    <div class="table-section">
      <Table
        :columns="tableColumns"
        :data="webhooks"
        :height="520"
        row-key="_id"
        pagination-enabled
        pagination-mode="client"
        :page-size="20"
        :global-search-text="globalSearchText"
      />
    </div>

    <!-- Create/Edit Dialog -->
    <ODialog v-model="dialogOpen" :title="isEditing ? 'Webhook を編集' : 'Webhook を追加'" size="lg" @confirm="handleSave">
      <div class="form-grid">
        <div class="form-field">
          <label class="form-label">名称 <span class="required">*</span></label>
          <input v-model="form.name" type="text" class="o-input" placeholder="例: 出荷通知 Slack" />
        </div>
        <div class="form-field">
          <label class="form-label">イベント <span class="required">*</span></label>
          <select v-model="form.event" class="o-input">
            <option value="" disabled>選択してください</option>
            <option v-for="ev in availableEvents" :key="ev" :value="ev">{{ ev }}</option>
          </select>
        </div>
        <div class="form-field form-field--full">
          <label class="form-label">URL <span class="required">*</span></label>
          <input v-model="form.url" type="url" class="o-input" placeholder="https://example.com/webhook" />
        </div>
        <div class="form-field">
          <label class="form-label">Secret</label>
          <div class="secret-field">
            <input
              v-model="form.secret"
              :type="showSecret ? 'text' : 'password'"
              class="o-input"
              placeholder="自動生成（空欄可）"
            />
            <button type="button" class="secret-toggle" @click="showSecret = !showSecret">
              {{ showSecret ? '隠す' : '表示' }}
            </button>
          </div>
        </div>
        <div class="form-field">
          <label class="form-label">リトライ回数</label>
          <input v-model.number="form.retry" type="number" class="o-input" min="0" max="10" />
        </div>
        <div class="form-field form-field--full">
          <label class="form-label">メモ</label>
          <textarea v-model="form.description" class="o-input form-textarea" rows="2" />
        </div>
      </div>
    </ODialog>

    <!-- Logs Dialog -->
    <ODialog v-model="logsDialogOpen" :title="`配信ログ — ${logsWebhookName}`" size="xl">
      <div class="logs-filter">
        <select v-model="logsFilterStatus" class="o-input" style="width: 160px" @change="loadLogs">
          <option value="">すべて</option>
          <option value="success">成功</option>
          <option value="failed">失敗</option>
          <option value="retrying">リトライ中</option>
        </select>
      </div>
      <div class="o-table-wrapper" style="max-height: 400px; overflow-y: auto">
        <table class="o-table">
          <thead>
            <tr>
              <th class="o-table-th" style="width: 160px">日時</th>
              <th class="o-table-th" style="width: 80px">状態</th>
              <th class="o-table-th" style="width: 80px">HTTP</th>
              <th class="o-table-th" style="width: 60px">試行</th>
              <th class="o-table-th" style="width: 80px">応答時間</th>
              <th class="o-table-th">エラー</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="logsLoading">
              <td class="o-table-td o-table-empty" colspan="6">読み込み中...</td>
            </tr>
            <tr v-else-if="logs.length === 0">
              <td class="o-table-td o-table-empty" colspan="6">ログがありません</td>
            </tr>
            <tr v-for="log in logs" :key="log._id" class="o-table-row">
              <td class="o-table-td">{{ formatDate(log.createdAt) }}</td>
              <td class="o-table-td">
                <span :class="logStatusClass(log.status)">{{ logStatusLabel(log.status) }}</span>
              </td>
              <td class="o-table-td" style="text-align: center">{{ log.statusCode || '-' }}</td>
              <td class="o-table-td" style="text-align: center">{{ log.attempt }}</td>
              <td class="o-table-td" style="text-align: right">{{ log.duration }}ms</td>
              <td class="o-table-td"><span class="error-cell">{{ log.error || '-' }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- Logs Pagination -->
      <div v-if="logsPagination.totalPages > 1" class="o-table-pagination" style="margin-top: 12px">
        <span class="o-table-pagination__info">全{{ logsPagination.total }}件</span>
        <div class="o-table-pagination__controls">
          <OButton variant="secondary" size="sm" :disabled="logsPagination.page <= 1" @click="goToLogsPage(logsPagination.page - 1)">&lsaquo;</OButton>
          <span class="o-table-pagination__page">{{ logsPagination.page }} / {{ logsPagination.totalPages }}</span>
          <OButton variant="secondary" size="sm" :disabled="logsPagination.page >= logsPagination.totalPages" @click="goToLogsPage(logsPagination.page + 1)">&rsaquo;</OButton>
        </div>
      </div>
      <template #footer>
        <OButton variant="secondary" @click="logsDialogOpen = false">閉じる</OButton>
      </template>
    </ODialog>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import ODialog from '@/components/odoo/ODialog.vue'
import SearchForm from '@/components/search/SearchForm.vue'
import Table from '@/components/table/Table.vue'
import type { TableColumn, Operator } from '@/types/table'
import {
  fetchWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  testWebhook,
  toggleWebhook,
  fetchWebhookLogs,
  type Webhook,
  type WebhookLog,
} from '@/api/webhook'

const { show: showToast } = useToast()
const { t } = useI18n()

// State
const webhooks = ref<Webhook[]>([])
const availableEvents = ref<string[]>([])
const loading = ref(false)
const globalSearchText = ref('')

// Dialog
const dialogOpen = ref(false)
const editingId = ref<string | null>(null)
const isEditing = computed(() => !!editingId.value)
const showSecret = ref(false)

const emptyForm = () => ({
  name: '',
  event: '',
  url: '',
  secret: '',
  retry: 3,
  description: '',
})

const form = ref(emptyForm())

// Test
const testingId = ref<string | null>(null)

// Logs
const logsDialogOpen = ref(false)
const logsWebhookId = ref('')
const logsWebhookName = ref('')
const logs = ref<WebhookLog[]>([])
const logsLoading = ref(false)
const logsFilterStatus = ref('')
const logsPagination = ref({ page: 1, limit: 50, total: 0, totalPages: 1 })

// Column definitions
const baseColumns: TableColumn[] = [
  {
    key: 'enabled',
    title: '状態',
    width: 70,
    searchable: true,
    searchType: 'boolean',
  },
  {
    key: 'name',
    title: '名称',
    width: 180,
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'event',
    title: 'イベント',
    width: 180,
    searchable: true,
    searchType: 'select',
    get searchOptions() {
      return availableEvents.value.map((ev) => ({ label: ev, value: ev }))
    },
  },
  {
    key: 'url',
    title: 'URL',
    width: 300,
  },
  {
    key: 'retry',
    title: 'リトライ',
    width: 80,
  },
]

const searchColumns: TableColumn[] = baseColumns.filter((c) => c.searchable)

const tableColumns: TableColumn[] = [
  ...baseColumns.map((col) => {
    if (col.key === 'enabled') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: Webhook }) =>
          h(
            'span',
            {
              class: rowData.enabled
                ? 'o-status-tag o-status-tag--confirmed'
                : 'o-status-tag o-status-tag--cancelled',
              style: 'cursor: pointer',
              onClick: () => handleToggle(rowData),
            },
            rowData.enabled ? 'ON' : 'OFF',
          ),
      }
    }
    if (col.key === 'event') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: Webhook }) =>
          h('code', { class: 'event-code' }, rowData.event),
      }
    }
    if (col.key === 'url') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: Webhook }) =>
          h('span', { class: 'url-cell' }, rowData.url),
      }
    }
    if (col.key === 'retry') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: Webhook }) =>
          h('span', { style: 'text-align: center; display: block' }, String(rowData.retry)),
      }
    }
    return col
  }),
  {
    key: 'actions',
    title: t('wms.common.actions', '操作'),
    width: 260,
    cellRenderer: ({ rowData }: { rowData: Webhook }) =>
      h('div', { class: 'action-cell' }, [
        h(
          OButton,
          {
            variant: 'secondary',
            size: 'sm',
            disabled: testingId.value === rowData._id,
            onClick: () => handleTest(rowData),
          },
          () => (testingId.value === rowData._id ? 'テスト中...' : 'テスト'),
        ),
        h(
          OButton,
          { variant: 'secondary', size: 'sm', onClick: () => openLogs(rowData) },
          () => 'ログ',
        ),
        h(
          OButton,
          { variant: 'primary', size: 'sm', onClick: () => openEdit(rowData) },
          () => '編集',
        ),
        h(
          OButton,
          { variant: 'icon-danger', size: 'sm', onClick: () => confirmDelete(rowData) },
          () => '削除',
        ),
      ]),
  },
]

// Search
const handleSearch = (payload: Record<string, { operator: Operator; value: any }>) => {
  if (payload.__global?.value) {
    globalSearchText.value = String(payload.__global.value).trim()
    delete payload.__global
  } else {
    globalSearchText.value = ''
  }

  // Build server-side filter params from search payload
  const params: { event?: string; enabled?: string } = {}

  if (payload.event?.value) {
    params.event = String(payload.event.value)
  }
  if (payload.enabled?.value !== undefined && payload.enabled?.value !== '') {
    params.enabled = String(payload.enabled.value)
  }

  loadList(params)
}

// Load
const loadList = async (params: { event?: string; enabled?: string } = {}) => {
  loading.value = true
  try {
    const result = await fetchWebhooks(params)
    webhooks.value = result.data
    availableEvents.value = result.availableEvents
  } catch (error: any) {
    showToast(error?.message || '取得に失敗しました', 'danger')
  } finally {
    loading.value = false
  }
}

// CRUD
const openCreate = () => {
  editingId.value = null
  form.value = emptyForm()
  showSecret.value = false
  dialogOpen.value = true
}

const openEdit = (w: Webhook) => {
  editingId.value = w._id
  form.value = {
    name: w.name,
    event: w.event,
    url: w.url,
    secret: w.secret,
    retry: w.retry,
    description: w.description || '',
  }
  showSecret.value = false
  dialogOpen.value = true
}

const handleSave = async () => {
  if (!form.value.name.trim()) {
    showToast('名称は必須です', 'danger')
    return
  }
  if (!form.value.event) {
    showToast('イベントを選択してください', 'danger')
    return
  }
  if (!form.value.url.trim()) {
    showToast('URL は必須です', 'danger')
    return
  }

  try {
    if (editingId.value) {
      await updateWebhook(editingId.value, { ...form.value })
      showToast('更新しました', 'success')
    } else {
      await createWebhook({ ...form.value })
      showToast('作成しました', 'success')
    }
    dialogOpen.value = false
    await loadList()
  } catch (error: any) {
    showToast(error?.message || '保存に失敗しました', 'danger')
  }
}

const confirmDelete = (w: Webhook) => {
  if (!confirm(`「${w.name}」を削除しますか？`)) return
  deleteWebhook(w._id)
    .then(async () => {
      showToast('削除しました', 'success')
      await loadList()
    })
    .catch((err: any) => {
      showToast(err?.message || '削除に失敗しました', 'danger')
    })
}

// Toggle
const handleToggle = async (w: Webhook) => {
  try {
    const result = await toggleWebhook(w._id)
    w.enabled = result.enabled
    showToast(result.enabled ? '有効化しました' : '無効化しました', 'success')
  } catch (error: any) {
    showToast(error?.message || 'トグルに失敗しました', 'danger')
  }
}

// Test
const handleTest = async (w: Webhook) => {
  testingId.value = w._id
  try {
    const result = await testWebhook(w._id)
    if (result.success) {
      showToast(`テスト成功 (HTTP ${result.statusCode}, ${result.duration}ms)`, 'success')
    } else {
      showToast(`テスト失敗: ${result.error || `HTTP ${result.statusCode}`}`, 'danger')
    }
  } catch (error: any) {
    showToast(error?.message || 'テストに失敗しました', 'danger')
  } finally {
    testingId.value = null
  }
}

// Logs
const openLogs = (w: Webhook) => {
  logsWebhookId.value = w._id
  logsWebhookName.value = w.name
  logsFilterStatus.value = ''
  logsPagination.value = { page: 1, limit: 50, total: 0, totalPages: 1 }
  logsDialogOpen.value = true
  loadLogs()
}

const loadLogs = async () => {
  logsLoading.value = true
  try {
    const result = await fetchWebhookLogs(logsWebhookId.value, {
      status: logsFilterStatus.value || undefined,
      page: logsPagination.value.page,
      limit: logsPagination.value.limit,
    })
    logs.value = result.data
    logsPagination.value = result.pagination
  } catch (error: any) {
    showToast(error?.message || 'ログ取得に失敗しました', 'danger')
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
    failed: 'o-status-tag o-status-tag--cancelled',
    retrying: 'o-status-tag o-status-tag--pending',
  }
  return map[status] || 'o-status-tag'
}

const logStatusLabel = (status: string) => {
  const map: Record<string, string> = { success: '成功', failed: '失敗', retrying: 'リトライ' }
  return map[status] || status
}

onMounted(() => {
  loadList()
})
</script>

<style>
@import '@/styles/order-table.css';

.o-status-tag--cancelled { background: #fef0f0; color: #f56c6c; }
.o-status-tag--pending { background: #fdf6ec; color: #e6a23c; }
</style>

<style scoped>
.webhook-settings {
  padding: 0 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}

.event-code {
  font-size: 12px;
  background: var(--o-gray-100, #f0f2f5);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'SF Mono', 'Fira Code', monospace;
}

.url-cell {
  display: block;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: var(--o-gray-600, #606266);
}

.error-cell {
  display: block;
  max-width: 250px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: var(--o-gray-500, #909399);
}

.action-cell {
  display: flex;
  gap: 4px;
  align-items: center;
}

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

.secret-field {
  display: flex;
  gap: 4px;
}

.secret-field .o-input {
  flex: 1;
}

.secret-toggle {
  padding: 0 8px;
  border: 1px solid var(--o-border-color, #dcdfe6);
  border-radius: var(--o-border-radius, 4px);
  background: var(--o-gray-100, #f8f9fa);
  cursor: pointer;
  font-size: 12px;
  white-space: nowrap;
}

.secret-toggle:hover {
  background: var(--o-gray-200, #e9ecef);
}

.logs-filter {
  margin-bottom: 12px;
}
</style>
