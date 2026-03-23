<template>
  <div class="plugin-management">
    <PageHeader title="プラグイン管理" :show-search="false">
      <template #actions>
        <Button variant="secondary" size="sm" @click="runHealthCheck" :disabled="healthLoading">
          {{ healthLoading ? 'チェック中...' : 'ヘルスチェック' }}
        </Button>
        <Button variant="secondary" size="sm" @click="showSdkInfo = !showSdkInfo">
          SDK 情報
        </Button>
      </template>
    </PageHeader>

    <!-- 健康仪表板 / ヘルスダッシュボード -->
    <div v-if="healthDashboard" class="health-dashboard">
      <div class="health-header">
        <span :class="['health-badge', healthDashboard.overall === 'healthy' ? 'health-badge--ok' : 'health-badge--warn']">
          {{ healthDashboard.overall === 'healthy' ? '全プラグイン正常' : '一部異常あり' }}
        </span>
        <span class="health-time">{{ formatTime(healthDashboard.checkedAt) }}</span>
      </div>
      <div class="health-grid">
        <div
          v-for="p in healthDashboard.plugins"
          :key="p.name"
          :class="['health-card', p.healthy ? 'health-card--ok' : 'health-card--err']"
        >
          <div class="health-card__name">{{ p.name }}</div>
          <div class="health-card__ver">v{{ p.version }}</div>
          <div class="health-card__status">{{ p.healthy ? '正常' : p.message || 'エラー' }}</div>
        </div>
      </div>
    </div>

    <!-- SDK 信息面板 / SDK 情報パネル -->
    <div v-if="showSdkInfo && sdkInfo" class="sdk-info-panel">
      <div class="sdk-info-header">
        <strong>@zelix/plugin-sdk</strong>
        <span class="sdk-version">v{{ sdkInfo.version }}</span>
      </div>
      <div class="sdk-info-section">
        <div class="sdk-info-label">利用可能なモデル ({{ sdkInfo.availableModels.length }})</div>
        <div class="sdk-info-tags">
          <code v-for="m in sdkInfo.availableModels" :key="m" class="event-code">{{ m }}</code>
        </div>
      </div>
      <div class="sdk-info-section">
        <div class="sdk-info-label">利用可能なイベント ({{ sdkInfo.availableEvents.length }})</div>
        <div class="sdk-info-tags">
          <code v-for="e in sdkInfo.availableEvents" :key="e" class="event-code">{{ e }}</code>
        </div>
      </div>
    </div>

    <div class="table-section">
      <DataTable
        :columns="tableColumns"
        :data="plugins"
        row-key="name"
        :search-columns="searchColumns"
        @search="handleSearch"
        pagination-enabled
        pagination-mode="client"
        :page-size="20"
      />
    </div>

    <!-- エラー情報 -->
    <div v-for="p in errorPlugins" :key="p.name" class="error-banner">
      <strong>{{ p.name }}</strong>: {{ p.errorMessage }}
    </div>

    <!-- 設定ダイアログ -->
    <Dialog :open="configDialogOpen" @update:open="configDialogOpen = $event">
      <DialogContent>
        <DialogHeader><DialogTitle>{{ `${configPluginName} 設定` }}</DialogTitle></DialogHeader>
      <div class="config-form">
        <div v-for="(def, key) in configSchema" :key="key" class="form-field form-field--full">
          <label>
            {{ def.description || key }}
            <span class="config-type">({{ def.type }})</span>
          </label>
          <template v-if="def.type === 'boolean'">
            <label class="checkbox-label">
              <input v-model="configValues[key]" type="checkbox" />
              {{ configValues[key] ? 'ON' : 'OFF' }}
            </label>
          </template>
          <template v-else-if="def.type === 'number'">
            <Input v-model.number="configValues[key]" type="number" />
          </template>
          <template v-else>
            <Input v-model="configValues[key]" type="text" />
          </template>
        </div>
      </div>
    </DialogContent>
    </Dialog>

    <!-- 详细信息侧边栏 / 詳細サイドバー -->
    <Dialog :open="detailOpen" @update:open="detailOpen = $event">
      <DialogContent>
        <DialogHeader><DialogTitle>{{ detailPlugin?.name || '' }}</DialogTitle></DialogHeader>
      <div v-if="detailPlugin" class="plugin-detail">
        <div class="detail-row">
          <span class="detail-label">バージョン</span>
          <span>{{ detailPlugin.version }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">作者</span>
          <span>{{ detailPlugin.author }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">状態</span>
          <span :class="statusTagClass(detailPlugin.status)">{{ statusLabel(detailPlugin.status) }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">説明</span>
          <span>{{ detailPlugin.description }}</span>
        </div>
        <div class="detail-row" v-if="detailPlugin.installedAt">
          <span class="detail-label">インストール日</span>
          <span>{{ formatTime(detailPlugin.installedAt) }}</span>
        </div>
        <div class="detail-row" v-if="detailPlugin.enabledAt">
          <span class="detail-label">有効化日</span>
          <span>{{ formatTime(detailPlugin.enabledAt) }}</span>
        </div>
        <div class="detail-section">
          <span class="detail-label">Hook イベント</span>
          <div class="sdk-info-tags">
            <code v-for="h in detailPlugin.hooks" :key="h" class="event-code">{{ h }}</code>
          </div>
        </div>
        <div class="detail-section" v-if="detailPlugin.permissions?.length">
          <span class="detail-label">権限</span>
          <div class="sdk-info-tags">
            <code v-for="p in detailPlugin.permissions" :key="p" class="event-code">{{ p }}</code>
          </div>
        </div>
        <div class="detail-section" v-if="detailHealth">
          <span class="detail-label">ヘルスチェック</span>
          <span :class="detailHealth.healthy ? 'health-ok' : 'health-err'">
            {{ detailHealth.healthy ? '正常' : detailHealth.message || 'エラー' }}
          </span>
        </div>
      </div>
    </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/shared/PageHeader.vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { DataTable } from '@/components/data-table'
import type { TableColumn, Operator } from '@/types/table'
import { Input } from '@/components/ui/input'
import {
  fetchPlugins,
  enablePlugin,
  disablePlugin,
  fetchPluginConfig,
  updatePluginConfig,
  fetchPluginsHealth,
  fetchPluginHealth,
  fetchSdkInfo,
  type PluginInfo,
  type PluginsHealthDashboard,
  type PluginHealthResult,
  type SdkInfo,
} from '@/api/plugin'
import { computed, h, onMounted, ref } from 'vue'
import { Badge } from '@/components/ui/badge'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
const { confirm } = useConfirmDialog()
const { show: showToast } = useToast()
const { t } = useI18n()

// State
const plugins = ref<PluginInfo[]>([])
const loading = ref(false)
const toggling = ref<string | null>(null)
const globalSearchText = ref('')

// 健康检查 / ヘルスチェック
const healthDashboard = ref<PluginsHealthDashboard | null>(null)
const healthLoading = ref(false)

// SDK 信息 / SDK 情報
const showSdkInfo = ref(false)
const sdkInfo = ref<SdkInfo | null>(null)

// Config dialog
const configDialogOpen = ref(false)
const configPluginName = ref('')
const configSchema = ref<Record<string, { type: string; default?: unknown; description?: string }>>({})
const configValues = ref<Record<string, any>>({})

// Detail dialog / 詳細ダイアログ
const detailOpen = ref(false)
const detailPlugin = ref<PluginInfo | null>(null)
const detailHealth = ref<PluginHealthResult | null>(null)

// Computed
const errorPlugins = computed(() => plugins.value.filter((p) => p.status === 'error' && p.errorMessage))

// Column definitions
const baseColumns: TableColumn[] = [
  {
    key: 'status',
    title: '状態',
    width: 70,
    searchable: true,
    searchType: 'select',
    searchOptions: [
      { label: '有効', value: 'enabled' },
      { label: '無効', value: 'disabled' },
      { label: 'エラー', value: 'error' },
    ],
  },
  {
    key: 'name',
    title: '名称',
    width: 180,
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'version',
    title: 'バージョン',
    width: 80,
  },
  {
    key: 'description',
    title: '説明',
    width: 300,
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'author',
    title: '作者',
    width: 100,
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'hooks',
    title: 'Hook イベント',
    width: 180,
  },
]

const searchColumns: TableColumn[] = baseColumns.filter((c) => c.searchable)

const tableColumns: TableColumn[] = [
  ...baseColumns.map((col) => {
    if (col.key === 'status') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: PluginInfo }) =>
          h('span', { class: statusTagClass(rowData.status) }, statusLabel(rowData.status)),
      }
    }
    if (col.key === 'name') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: PluginInfo }) =>
          h('strong', {
            style: 'cursor: pointer; color: var(--o-primary, #714b67)',
            onClick: () => openDetail(rowData),
          }, rowData.name),
      }
    }
    if (col.key === 'version') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: PluginInfo }) =>
          h('span', { style: 'text-align: center; display: block' }, rowData.version),
      }
    }
    if (col.key === 'hooks') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: PluginInfo }) =>
          h(
            'span',
            {},
            (rowData.hooks || []).map((hook) =>
              h('code', { class: 'event-code', key: hook }, hook),
            ),
          ),
      }
    }
    return col
  }),
  {
    key: 'actions',
    title: t('wms.common.actions', '操作'),
    width: 220,
    cellRenderer: ({ rowData }: { rowData: PluginInfo }) => {
      const buttons: any[] = []

      if (rowData.status === 'enabled') {
        buttons.push(
          h(
            Button,
            {
              variant: 'secondary',
              size: 'sm',
              disabled: toggling.value === rowData.name,
              onClick: () => handleDisable(rowData),
            },
            () => '無効化',
          ),
        )
      } else if (rowData.status === 'disabled') {
        buttons.push(
          h(
            Button,
            {
              variant: 'default',
              size: 'sm',
              disabled: toggling.value === rowData.name,
              onClick: () => handleEnable(rowData),
            },
            () => '有効化',
          ),
        )
      }

      if (rowData.config && Object.keys(rowData.config).length > 0) {
        buttons.push(
          h(
            Button,
            { variant: 'secondary', size: 'sm', onClick: () => openConfig(rowData) },
            () => '設定',
          ),
        )
      }

      buttons.push(
        h(
          Button,
          { variant: 'secondary', size: 'sm', onClick: () => openDetail(rowData) },
          () => '詳細',
        ),
      )

      return h('div', { class: 'action-cell' }, buttons)
    },
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
}

// Load
const loadList = async () => {
  loading.value = true
  try {
    const result = await fetchPlugins()
    plugins.value = result.data
  } catch (error: any) {
    showToast(error?.message || '取得に失敗しました', 'danger')
  } finally {
    loading.value = false
  }
}

// Enable/Disable
const handleEnable = async (p: PluginInfo) => {
  toggling.value = p.name
  try {
    await enablePlugin(p.name)
    showToast(`${p.name} を有効化しました`, 'success')
    await loadList()
  } catch (error: any) {
    showToast(error?.message || '有効化に失敗しました', 'danger')
  } finally {
    toggling.value = null
  }
}

const handleDisable = async (p: PluginInfo) => {
  if (!(await confirm('この操作を実行しますか？'))) return
  toggling.value = p.name
  try {
    await disablePlugin(p.name)
    showToast(`${p.name} を無効化しました`, 'success')
    await loadList()
  } catch (error: any) {
    showToast(error?.message || '無効化に失敗しました', 'danger')
  } finally {
    toggling.value = null
  }
}

// Config
const openConfig = async (p: PluginInfo) => {
  configPluginName.value = p.name
  configSchema.value = p.config || {}

  try {
    const result = await fetchPluginConfig(p.name)
    const values: Record<string, any> = {}
    for (const [key, def] of Object.entries(configSchema.value)) {
      values[key] = result.data[key] ?? def.default ?? ''
    }
    configValues.value = values
    configDialogOpen.value = true
  } catch (error: any) {
    showToast(error?.message || '設定の取得に失敗しました', 'danger')
  }
}

const handleSaveConfig = async () => {
  try {
    await updatePluginConfig(configPluginName.value, { ...configValues.value })
    showToast('設定を保存しました', 'success')
    configDialogOpen.value = false
  } catch (error: any) {
    showToast(error?.message || '設定の保存に失敗しました', 'danger')
  }
}

// Health check / ヘルスチェック
const runHealthCheck = async () => {
  healthLoading.value = true
  try {
    healthDashboard.value = await fetchPluginsHealth()
  } catch (error: any) {
    showToast(error?.message || 'ヘルスチェックに失敗しました', 'danger')
  } finally {
    healthLoading.value = false
  }
}

// Detail dialog / 詳細ダイアログ
const openDetail = async (p: PluginInfo) => {
  detailPlugin.value = p
  detailHealth.value = null
  detailOpen.value = true

  // 非同期でヘルスチェックを実行 / 异步执行健康检查
  if (p.status === 'enabled') {
    try {
      detailHealth.value = await fetchPluginHealth(p.name)
    } catch {
      detailHealth.value = { healthy: false, message: 'ヘルスチェック失敗' }
    }
  }
}

// Load SDK info / SDK 情報を読み込む
const loadSdkInfo = async () => {
  try {
    sdkInfo.value = await fetchSdkInfo()
  } catch {
    // サイレント / 静默
  }
}

// Helpers
const statusTagClass = (status: string) => {
  const map: Record<string, string> = {
    enabled: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800',
    disabled: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800',
    error: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800',
  }
  return map[status] || 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground'
}

const statusLabel = (status: string) => {
  const map: Record<string, string> = {
    enabled: '有効',
    disabled: '無効',
    error: 'エラー',
  }
  return map[status] || status
}

const formatTime = (dateStr: string | undefined) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('ja-JP')
}

onMounted(() => {
  loadList()
  loadSdkInfo()
})
</script>

<style>
</style>

<style scoped>
.plugin-management {
  padding: 0 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}

/* 健康仪表板 / ヘルスダッシュボード */
.health-dashboard {
  background: var(--o-gray-50, #fafbfc);
  border: 1px solid var(--o-gray-200, #e4e7ed);
  border-radius: 6px;
  padding: 14px;
}

.health-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.health-badge {
  font-size: 13px;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 12px;
}

.health-badge--ok { background: #f0f9eb; color: #67c23a; }
.health-badge--warn { background: #fef0f0; color: #f56c6c; }

.health-time {
  font-size: 12px;
  color: var(--o-gray-400, #c0c4cc);
}

.health-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 8px;
}

.health-card {
  padding: 10px 12px;
  border-radius: 4px;
  border: 1px solid;
}

.health-card--ok { background: #f0f9eb; border-color: #e1f3d8; }
.health-card--err { background: #fef0f0; border-color: #fde2e2; }

.health-card__name { font-weight: 600; font-size: 13px; }
.health-card__ver { font-size: 11px; color: var(--o-gray-400, #c0c4cc); }
.health-card__status { font-size: 12px; margin-top: 4px; }

/* SDK 信息面板 / SDK 情報パネル */
.sdk-info-panel {
  background: var(--o-gray-50, #fafbfc);
  border: 1px solid var(--o-gray-200, #e4e7ed);
  border-radius: 6px;
  padding: 14px;
}

.sdk-info-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 14px;
}

.sdk-version {
  background: var(--o-primary-light, #f3edf2);
  color: var(--o-primary, #714b67);
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
}

.sdk-info-section {
  margin-bottom: 10px;
}

.sdk-info-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--o-gray-600, #606266);
  margin-bottom: 6px;
}

.sdk-info-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.event-code {
  display: inline-block;
  font-size: 11px;
  background: var(--o-gray-100, #f0f2f5);
  padding: 1px 5px;
  border-radius: 3px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  margin-right: 4px;
  margin-bottom: 2px;
}

.action-cell {
  display: flex;
  gap: 4px;
  align-items: center;
}

.error-banner {
  padding: 10px 14px;
  background: #fef0f0;
  border: 1px solid #f56c6c;
  border-radius: 4px;
  color: #f56c6c;
  font-size: 13px;
}

.config-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-field--full {
  width: 100%;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 4px;
  color: var(--o-gray-700, #303133);
}

.config-type {
  font-weight: 400;
  color: var(--o-gray-400, #c0c4cc);
  font-size: 12px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 14px;
}

/* 详细面板 / 詳細パネル */
.plugin-detail {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.detail-row {
  display: flex;
  gap: 12px;
  font-size: 13px;
  align-items: baseline;
}

.detail-section {
  margin-top: 4px;
}

.detail-label {
  font-weight: 600;
  color: var(--o-gray-600, #606266);
  min-width: 120px;
  font-size: 12px;
}

.health-ok { color: #67c23a; font-weight: 600; }
.health-err { color: #f56c6c; font-weight: 600; }
</style>
