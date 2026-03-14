<template>
  <div class="plugin-management">
    <ControlPanel title="プラグイン管理" :show-search="false" />

    <SearchForm
      class="search-section"
      :columns="searchColumns"
      :show-save="false"
      storage-key="pluginManagementSearch"
      @search="handleSearch"
    />

    <div class="table-section">
      <Table
        :columns="tableColumns"
        :data="plugins"
        :height="520"
        row-key="name"
        pagination-enabled
        pagination-mode="client"
        :page-size="20"
        :global-search-text="globalSearchText"
      />
    </div>

    <!-- エラー情報 -->
    <div v-for="p in errorPlugins" :key="p.name" class="error-banner">
      <strong>{{ p.name }}</strong>: {{ p.errorMessage }}
    </div>

    <!-- 設定ダイアログ -->
    <ODialog v-model="configDialogOpen" :title="`${configPluginName} 設定`" size="md" @confirm="handleSaveConfig">
      <div class="config-form">
        <div v-for="(def, key) in configSchema" :key="key" class="form-field form-field--full">
          <label class="form-label">
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
            <input v-model.number="configValues[key]" type="number" class="o-input" />
          </template>
          <template v-else>
            <input v-model="configValues[key]" type="text" class="o-input" />
          </template>
        </div>
      </div>
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
  fetchPlugins,
  enablePlugin,
  disablePlugin,
  fetchPluginConfig,
  updatePluginConfig,
  type PluginInfo,
} from '@/api/plugin'

const { show: showToast } = useToast()
const { t } = useI18n()

// State
const plugins = ref<PluginInfo[]>([])
const loading = ref(false)
const toggling = ref<string | null>(null)
const globalSearchText = ref('')

// Config dialog
const configDialogOpen = ref(false)
const configPluginName = ref('')
const configSchema = ref<Record<string, { type: string; default?: unknown; description?: string }>>({})
const configValues = ref<Record<string, any>>({})

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
      { label: '未初期化', value: 'installed' },
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
          h('strong', {}, rowData.name),
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
    width: 200,
    cellRenderer: ({ rowData }: { rowData: PluginInfo }) => {
      const buttons: any[] = []

      if (rowData.status === 'enabled') {
        buttons.push(
          h(
            OButton,
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
            OButton,
            {
              variant: 'primary',
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
            OButton,
            { variant: 'secondary', size: 'sm', onClick: () => openConfig(rowData) },
            () => '設定',
          ),
        )
      }

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
  if (!confirm(`「${p.name}」を無効化しますか？`)) return
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

// Helpers
const statusTagClass = (status: string) => {
  const map: Record<string, string> = {
    enabled: 'o-status-tag o-status-tag--confirmed',
    disabled: 'o-status-tag o-status-tag--cancelled',
    error: 'o-status-tag o-status-tag--cancelled',
    installed: 'o-status-tag o-status-tag--pending',
  }
  return map[status] || 'o-status-tag'
}

const statusLabel = (status: string) => {
  const map: Record<string, string> = {
    enabled: '有効',
    disabled: '無効',
    error: 'エラー',
    installed: '未初期化',
  }
  return map[status] || status
}

onMounted(() => {
  loadList()
})
</script>

<style>
.o-status-tag--cancelled { background: #fef0f0; color: #f56c6c; }
.o-status-tag--pending { background: #fdf6ec; color: #e6a23c; }
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
</style>
