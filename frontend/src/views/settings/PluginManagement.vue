<template>
  <div class="plugin-management">
    <ControlPanel title="プラグイン管理" :show-search="false" />

    <!-- 插件列表 -->
    <div class="o-table-wrapper">
      <table class="o-table">
        <thead>
          <tr>
            <th class="o-table-th" style="width: 60px">状態</th>
            <th class="o-table-th" style="width: 180px">名称</th>
            <th class="o-table-th" style="width: 80px">バージョン</th>
            <th class="o-table-th">説明</th>
            <th class="o-table-th" style="width: 100px">作者</th>
            <th class="o-table-th" style="width: 180px">Hook イベント</th>
            <th class="o-table-th" style="width: 200px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td class="o-table-td o-table-empty" colspan="7">読み込み中...</td>
          </tr>
          <tr v-else-if="plugins.length === 0">
            <td class="o-table-td o-table-empty" colspan="7">
              プラグインがインストールされていません。
              <code>extensions/plugins/</code> にプラグインを配置してください。
            </td>
          </tr>
          <tr v-for="p in plugins" :key="p.name" class="o-table-row">
            <td class="o-table-td" style="text-align: center">
              <span :class="statusTagClass(p.status)">{{ statusLabel(p.status) }}</span>
            </td>
            <td class="o-table-td"><strong>{{ p.name }}</strong></td>
            <td class="o-table-td" style="text-align: center">{{ p.version }}</td>
            <td class="o-table-td">{{ p.description }}</td>
            <td class="o-table-td">{{ p.author }}</td>
            <td class="o-table-td">
              <code v-for="h in p.hooks" :key="h" class="event-code">{{ h }}</code>
            </td>
            <td class="o-table-td o-table-td--actions">
              <OButton
                v-if="p.status === 'enabled'"
                variant="secondary" size="sm"
                :disabled="toggling === p.name"
                @click="handleDisable(p)"
              >
                無効化
              </OButton>
              <OButton
                v-else-if="p.status === 'disabled'"
                variant="primary" size="sm"
                :disabled="toggling === p.name"
                @click="handleEnable(p)"
              >
                有効化
              </OButton>
              <OButton
                v-if="p.config && Object.keys(p.config).length > 0"
                variant="secondary" size="sm"
                @click="openConfig(p)"
              >
                設定
              </OButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 错误信息 -->
    <div v-for="p in errorPlugins" :key="p.name" class="error-banner">
      <strong>{{ p.name }}</strong>: {{ p.errorMessage }}
    </div>

    <!-- 配置对话框 -->
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
import { computed, onMounted, ref } from 'vue'
import { useToast } from '@/composables/useToast'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import ODialog from '@/components/odoo/ODialog.vue'
import {
  fetchPlugins,
  enablePlugin,
  disablePlugin,
  fetchPluginConfig,
  updatePluginConfig,
  type PluginInfo,
} from '@/api/plugin'

const { show: showToast } = useToast()

// State
const plugins = ref<PluginInfo[]>([])
const loading = ref(false)
const toggling = ref<string | null>(null)

// Config dialog
const configDialogOpen = ref(false)
const configPluginName = ref('')
const configSchema = ref<Record<string, { type: string; default?: unknown; description?: string }>>({})
const configValues = ref<Record<string, any>>({})

// Computed
const errorPlugins = computed(() => plugins.value.filter((p) => p.status === 'error' && p.errorMessage))

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
    // 合并默认值和当前值 / デフォルト値と現在の値をマージ
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
@import '@/styles/order-table.css';

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
