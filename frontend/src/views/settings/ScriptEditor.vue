<template>
  <div class="script-editor">
    <PageHeader :title="t('wms.settings.automationScripts', '自動化スクリプト')" :show-search="false">
      <template #actions>
        <Button variant="default" @click="openCreate">{{ t('wms.settings.addNew', '新規追加') }}</Button>
      </template>
    </PageHeader>

    <!-- Filter -->
    <div class="search-section">
      <Select v-model="filterEvent" @update:model-value="loadList">
        <SelectTrigger class="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
        <SelectItem value="__all__">{{ t('wms.settings.allEvents', 'すべてのイベント') }}</SelectItem>
        <SelectItem v-for="ev in availableEvents" :key="ev" :value="ev">{{ ev }}</SelectItem>
        </SelectContent>
      </Select>
      <label class="search-section__filter">
        <Checkbox :checked="showEnabledOnly" @update:checked="val => showEnabledOnly = val" />
        {{ t('wms.settings.enabledOnly', '有効のみ') }}
      </label>
    </div>

    <!-- Table -->
    <div class="rounded-md border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead style="width: 60px">{{ t('wms.settings.state', '状態') }}</TableHead>
            <TableHead style="width: 200px">{{ t('wms.settings.name', '名称') }}</TableHead>
            <TableHead style="width: 180px">{{ t('wms.settings.event', 'イベント') }}</TableHead>
            <TableHead>{{ t('wms.settings.description', '説明') }}</TableHead>
            <TableHead style="width: 80px">{{ t('wms.settings.timeout', 'タイムアウト') }}</TableHead>
            <TableHead style="width: 260px">{{ t('wms.common.actions', '操作') }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="loading">
            <TableCell colspan="6">
              <div class="space-y-3 p-4">
                <Skeleton class="h-4 w-[250px] mx-auto" />
                <Skeleton class="h-10 w-full" />
                <Skeleton class="h-10 w-full" />
                <Skeleton class="h-10 w-full" />
              </div>
            </TableCell>
          </TableRow>
          <TableRow v-else-if="scripts.length === 0">
            <TableCell class="text-center py-8 text-muted-foreground" colspan="6">{{ t('wms.settings.noScripts', 'スクリプトがありません') }}</TableCell>
          </TableRow>
          <TableRow v-for="s in scripts" :key="s._id">
            <TableCell style="text-align: center">
              <Badge variant="default">
                {{ s.enabled ? 'ON' : 'OFF' }}
              </Badge>
            </TableCell>
            <TableCell><strong>{{ s.name }}</strong></TableCell>
            <TableCell><code class="event-code">{{ s.event }}</code></TableCell>
            <TableCell>{{ s.description || '-' }}</TableCell>
            <TableCell style="text-align: center">{{ s.timeout }}ms</TableCell>
            <TableCell class="text-right">
              <Button variant="secondary" size="sm" :disabled="testingId === s._id" @click="handleTest(s)">
                {{ testingId === s._id ? t('wms.settings.testing', 'テスト中...') : t('wms.settings.test', 'テスト') }}
              </Button>
              <Button variant="secondary" size="sm" @click="openLogs(s)">{{ t('wms.settings.logs', 'ログ') }}</Button>
              <Button variant="default" size="sm" @click="openEdit(s)">{{ t('wms.common.edit', '編集') }}</Button>
              <Button variant="destructive" size="sm" @click="confirmDelete(s)">{{ t('wms.common.delete', '削除') }}</Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- Create/Edit Dialog -->
    <Dialog :open="dialogOpen" @update:open="dialogOpen = $event">
      <DialogContent>
        <DialogHeader><DialogTitle>{{ isEditing ? t('wms.settings.editScript', 'スクリプトを編集') : t('wms.settings.addScript', 'スクリプトを追加') }}</DialogTitle></DialogHeader>
      <div class="form-grid">
        <div class="form-field">
          <label>{{ t('wms.settings.name', '名称') }} <span class="text-destructive text-xs">*</span></label>
          <Input v-model="form.name" type="text" />
        </div>
        <div class="form-field">
          <label>{{ t('wms.settings.event', 'イベント') }} <span class="text-destructive text-xs">*</span></label>
          <Select v-model="form.event">
        <SelectTrigger class="w-full">
          <SelectValue placeholder="{{ t('wms.settings.selectPlease', '選択してください') }}" />
        </SelectTrigger>
        <SelectContent>
        <SelectItem v-for="ev in availableEvents" :key="ev" :value="ev">{{ ev }}</SelectItem>
        </SelectContent>
      </Select>
        </div>
        <div class="form-field">
          <label>{{ t('wms.settings.timeoutMs', 'タイムアウト(ms)') }}</label>
          <Input v-model.number="form.timeout" type="number" min="100" max="30000" />
        </div>
        <div class="form-field">
          <label>{{ t('wms.settings.description', '説明') }}</label>
          <Input v-model="form.description" type="text" />
        </div>
        <div class="form-field form-field--full">
          <label>{{ t('wms.settings.code', 'コード') }} <span class="text-destructive text-xs">*</span></label>
          <Textarea
            v-model="form.code"
            class="code-textarea"
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
    </DialogContent>
    </Dialog>

    <!-- Logs Dialog -->
    <Dialog :open="logsDialogOpen" @update:open="logsDialogOpen = $event">
      <DialogContent>
        <DialogHeader><DialogTitle>{{ `${t('wms.settings.executionLog', '実行ログ')} — ${logsScriptName}` }}</DialogTitle></DialogHeader>
      <div class="logs-filter">
        <Select v-model="logsFilterStatus" @update:model-value="loadLogs">
        <SelectTrigger class="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
        <SelectItem value="__all__">{{ t('wms.settings.all', 'すべて') }}</SelectItem>
        <SelectItem value="success">{{ t('wms.settings.statusSuccess', '成功') }}</SelectItem>
        <SelectItem value="error">{{ t('wms.settings.statusError', 'エラー') }}</SelectItem>
        <SelectItem value="timeout">{{ t('wms.settings.statusTimeout', 'タイムアウト') }}</SelectItem>
        </SelectContent>
      </Select>
      </div>
      <div class="rounded-md border overflow-auto" style="max-height: 400px; overflow-y: auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead style="width: 160px">{{ t('wms.settings.dateTime', '日時') }}</TableHead>
              <TableHead style="width: 80px">{{ t('wms.settings.state', '状態') }}</TableHead>
              <TableHead style="width: 80px">{{ t('wms.settings.executionTime', '実行時間') }}</TableHead>
              <TableHead>{{ t('wms.settings.errorOutput', 'エラー / 出力') }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="logsLoading">
              <TableCell colspan="4">
                <div class="space-y-3 p-4">
                  <Skeleton class="h-4 w-[250px] mx-auto" />
                  <Skeleton class="h-10 w-full" />
                  <Skeleton class="h-10 w-full" />
                </div>
              </TableCell>
            </TableRow>
            <TableRow v-else-if="logs.length === 0">
              <TableCell class="text-center py-8 text-muted-foreground" colspan="4">{{ t('wms.settings.noLogs', 'ログがありません') }}</TableCell>
            </TableRow>
            <TableRow v-for="log in logs" :key="log._id">
              <TableCell>{{ formatDate(log.createdAt) }}</TableCell>
              <TableCell>
                <span :class="logStatusClass(log.status)">{{ logStatusLabel(log.status) }}</span>
              </TableCell>
              <TableCell style="text-align: right">{{ log.duration }}ms</TableCell>
              <TableCell>
                <span v-if="log.error" class="error-cell">{{ log.error }}</span>
                <span v-else-if="log.output && Object.keys(log.output).length > 0" class="output-cell">
                  {{ JSON.stringify(log.output) }}
                </span>
                <span v-else>-</span>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      <div v-if="logsPagination.totalPages > 1" class="o-table-pagination" style="margin-top: 12px">
        <span class="o-table-pagination__info">{{ t('wms.settings.totalCount', `全${logsPagination.total}件`) }}</span>
        <div class="o-table-pagination__controls">
          <Button variant="secondary" size="sm" :disabled="logsPagination.page <= 1" @click="goToLogsPage(logsPagination.page - 1)">&lsaquo;</Button>
          <span class="o-table-pagination__page">{{ logsPagination.page }} / {{ logsPagination.totalPages }}</span>
          <Button variant="secondary" size="sm" :disabled="logsPagination.page >= logsPagination.totalPages" @click="goToLogsPage(logsPagination.page + 1)">&rsaquo;</Button>
        </div>
      </div>
      <DialogFooter>
        <Button variant="secondary" @click="logsDialogOpen = false">{{ t('wms.settings.close', '閉じる') }}</Button>
      </DialogFooter>
    </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/shared/PageHeader.vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
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
import { computed, onMounted, ref } from 'vue'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
const { confirm } = useConfirmDialog()
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

const confirmDelete = async (s: AutomationScript) => {
  if (!(await confirm('この操作を実行しますか？'))) return
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
    success: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800',
    error: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800',
    timeout: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800',
  }
  return map[status] || 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground'
}

const logStatusLabel = (status: string) => {
  const map: Record<string, string> = { success: t('wms.settings.statusSuccess', '成功'), error: t('wms.settings.statusError', 'エラー'), timeout: t('wms.settings.statusTimeout', 'タイムアウト') }
  return map[status] || status
}

onMounted(() => { loadList() })
</script>

<style>
@import '@/styles/order-table.css';

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
