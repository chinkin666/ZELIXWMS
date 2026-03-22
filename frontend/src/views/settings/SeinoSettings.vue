<template>
  <div class="seino-settings">
    <ControlPanel title="西濃運輸 カンガルー便 設定" :show-search="false">
      <template #actions>
        <OButton variant="primary" :disabled="saving" @click="handleSave">
          {{ saving ? '保存中...' : '保存' }}
        </OButton>
      </template>
    </ControlPanel>

    <!-- プラグイン状態 / 插件状态 -->
    <div class="plugin-status" :class="pluginRunning ? 'plugin-status--ok' : 'plugin-status--off'">
      <span class="plugin-status__dot" />
      <span>連携: {{ pluginRunning ? '稼働中' : '未稼働' }}</span>
      <span v-if="pluginVersion" class="plugin-status__ver">v{{ pluginVersion }}</span>
    </div>

    <div v-if="loading" class="loading-state">読み込み中...</div>

    <template v-else>
      <!-- 基本設定 / 基本设定 -->
      <div class="o-card settings-card">
        <div class="card-header">
          <span class="card-title">基本設定</span>
          <span class="card-description">カンガルー便 CSV 出力時のデフォルト値を設定します</span>
        </div>
        <div class="card-body">
          <div class="o-form-group">
            <label class="form-label">デフォルト送り状種類</label>
            <select class="o-input" v-model="form.defaultInvoiceType" style="max-width:250px">
              <option value="1">1: カンガルー特急便</option>
              <option value="2">2: カンガルーミニ便</option>
              <option value="3">3: カンガルー航空便</option>
            </select>
          </div>
          <div class="o-form-group">
            <label class="form-label">デフォルト重量（kg）</label>
            <input class="o-input" v-model="form.defaultWeight" placeholder="例: 5" maxlength="6" style="max-width:250px" />
            <div class="field-hint">荷物のデフォルト重量（kg）を設定してください</div>
          </div>
        </div>
      </div>

      <!-- 使い方ガイド / 使用说明 -->
      <div class="o-card settings-card guide-card">
        <div class="card-header">
          <span class="card-title">使い方</span>
        </div>
        <div class="card-body">
          <div class="guide-steps">
            <div class="guide-step">
              <span class="guide-step__num">1</span>
              <div>
                <strong>CSV出力（WMS → カンガルーマジック）</strong>
                <p>出荷管理 → 送り状未発行タブ → 注文を選択 →「配送業者データ出力」ボタン</p>
              </div>
            </div>
            <div class="guide-step">
              <span class="guide-step__num">2</span>
              <div>
                <strong>カンガルーマジックで送り状発行</strong>
                <p>出力したCSVをカンガルーマジックに取り込み、送り状を発行します</p>
              </div>
            </div>
            <div class="guide-step">
              <span class="guide-step__num">3</span>
              <div>
                <strong>追跡番号取込（カンガルーマジック → WMS）</strong>
                <p>出荷管理 → 送り状未発行タブ →「送り状データ取込」ボタン → カンガルーマジックの実績CSVをアップロード</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from '@/composables/useToast'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import { fetchSeinoConfig } from '@/api/seino'
import { getApiBaseUrl } from '@/api/base'

const toast = useToast()
const loading = ref(false)
const saving = ref(false)
const pluginRunning = ref(false)
const pluginVersion = ref('')

const form = ref({
  defaultInvoiceType: '1',
  defaultWeight: '',
})

async function checkPlugin() {
  try {
    const res = await fetch(`${getApiBaseUrl()}/seino/invoice-types`)
    if (res.ok) {
      pluginRunning.value = true
      pluginVersion.value = ''
    }
  } catch { pluginRunning.value = false }
}

async function loadConfig() {
  loading.value = true
  try {
    const config = await fetchSeinoConfig()
    form.value.defaultInvoiceType = config.defaultInvoiceType || '1'
    form.value.defaultWeight = config.defaultWeight || ''
  } catch { /* 使用默认值 / デフォルト値を使用 */ }
  finally { loading.value = false }
}

async function handleSave() {
  saving.value = true
  try {
    const res = await fetch(`${getApiBaseUrl()}/seino/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        defaultInvoiceType: form.value.defaultInvoiceType,
        defaultWeight: form.value.defaultWeight,
      }),
    })
    if (!res.ok) throw new Error('保存に失敗しました')
    toast.showSuccess('設定を保存しました')
  } catch (e: any) {
    toast.showError(e?.message || '保存に失敗しました')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await checkPlugin()
  await loadConfig()
})
</script>

<style scoped>
.seino-settings {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0 20px 20px;
}
:deep(.o-control-panel) { margin-left: -20px; margin-right: -20px; }

/* 插件状态 / プラグイン状態 */
.plugin-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  font-size: 13px;
  border-left: 3px solid;
}
.plugin-status--ok { background: #f0f9eb; border-color: var(--o-success, #3D8B37); color: var(--o-success-text, #1B5E1B); }
.plugin-status--off { background: var(--o-gray-100); border-color: var(--o-gray-300); color: var(--o-gray-600); }
.plugin-status__dot {
  width: 8px; height: 8px; border-radius: 50%;
}
.plugin-status--ok .plugin-status__dot { background: var(--o-success); }
.plugin-status--off .plugin-status__dot { background: var(--o-gray-400); }
.plugin-status__ver { font-size: 11px; color: var(--o-gray-500); }

.loading-state { text-align: center; padding: 40px; color: var(--o-gray-500); }

/* 卡片 / カード */
.o-card {
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-border-color, #e4e7ed);
  padding: 1.25rem;
}
.settings-card { max-width: 700px; }

.card-header {
  padding-bottom: 12px;
  border-bottom: 1px solid var(--o-border-color, #e4e7ed);
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.card-title { font-size: 1rem; font-weight: 600; color: var(--o-gray-800); }
.card-description { font-size: 0.8125rem; color: var(--o-gray-500); }

.card-body { display: flex; flex-direction: column; gap: 14px; }

.o-form-group { display: flex; flex-direction: column; gap: 4px; }
.form-label { font-size: 13px; font-weight: 500; color: var(--o-gray-700); }
.field-hint { font-size: 11px; color: var(--o-gray-400); }

/* 使い方ガイド / 使用指南 */
.guide-card { background: var(--o-gray-100, #f5f7fa); border-style: dashed; }
.guide-steps { display: flex; flex-direction: column; gap: 16px; }
.guide-step {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.guide-step__num {
  width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  background: var(--o-brand-primary, #0052A3);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  border-radius: 50%;
  flex-shrink: 0;
}
.guide-step strong { font-size: 14px; color: var(--o-gray-800); }
.guide-step p { margin: 4px 0 0; font-size: 13px; color: var(--o-gray-600); }
</style>
