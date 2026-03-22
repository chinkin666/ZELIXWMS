<template>
  <div class="basic-settings">
    <ControlPanel :title="t('wms.settings.basicSettings', '基本設定')" :show-search="false">
      <template #actions>
        <OButton variant="primary" :disabled="saving" @click="handleSave">
          {{ saving ? t('wms.common.saving', '保存中...') : t('wms.common.save', '保存') }}
        </OButton>
      </template>
    </ControlPanel>

    <div v-if="loading" class="settings-loading">{{ t('wms.settings.loading', '読み込み中...') }}</div>

    <div v-else class="settings-body">
      <!-- 一般设定 / 一般設定 -->
      <div class="o-card settings-card">
        <div class="card-header">
          <span class="card-title">{{ t('wms.settings.generalSettings', '一般設定') }}</span>
          <span class="card-description">{{ t('wms.settings.generalSettingsDesc', '言語・タイムゾーン・表示形式の設定') }}</span>
        </div>
        <div class="card-body">
          <div class="o-form-group">
            <label class="form-label">{{ t('wms.settings.systemLanguage', 'システム言語') }}</label>
            <select v-model="form.systemLanguage" class="o-input">
              <option value="ja">日本語</option>
              <option value="en">English</option>
              <option value="zh">中文</option>
            </select>
          </div>
          <div class="o-form-group">
            <label class="form-label">{{ t('wms.settings.timezone', 'タイムゾーン') }}</label>
            <select v-model="form.timezone" class="o-input">
              <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
              <option value="Asia/Shanghai">Asia/Shanghai (CST)</option>
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
            </select>
          </div>
          <div class="o-form-group">
            <label class="form-label">{{ t('wms.settings.dateFormat', '日付フォーマット') }}</label>
            <select v-model="form.dateFormat" class="o-input">
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              <option value="YYYY/MM/DD">YYYY/MM/DD</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            </select>
          </div>
          <div class="o-form-group">
            <label class="form-label">{{ t('wms.settings.defaultPageSize', 'デフォルトページサイズ') }}</label>
            <input v-model.number="form.pageSize" type="number" class="o-input" min="10" max="200" />
          </div>
        </div>
      </div>

      <!-- 出荷设定 / 出荷設定 -->
      <div class="o-card settings-card">
        <div class="card-header">
          <span class="card-title">{{ t('wms.settings.outboundSettings', '出荷設定') }}</span>
          <span class="card-description">{{ t('wms.settings.outboundSettingsBasicDesc', '出荷検品・引当ルールの基本設定') }}</span>
        </div>
        <div class="card-body">
          <div class="o-form-group">
            <label class="form-label">{{ t('wms.settings.outboundRequireInspection', '出荷検品必須') }}</label>
            <label class="toggle-switch">
              <input v-model="form.outboundRequireInspection" type="checkbox" />
              <span class="toggle-slider" />
            </label>
          </div>
          <div class="o-form-group">
            <label class="form-label">{{ t('wms.settings.allocationRule', '引当ルール') }}</label>
            <select v-model="form.outboundAllocationRule" class="o-input">
              <option value="FIFO">FIFO（先入先出）</option>
              <option value="FEFO">FEFO（先期限先出）</option>
              <option value="LIFO">LIFO（後入先出）</option>
            </select>
          </div>
        </div>
      </div>

      <!-- 条码设定 / バーコード設定 -->
      <div class="o-card settings-card">
        <div class="card-header">
          <span class="card-title">{{ t('wms.settings.barcodeSettings', 'バーコード設定') }}</span>
          <span class="card-description">{{ t('wms.settings.barcodeSettingsDesc', 'バーコードフォーマットとスキャンモードの設定') }}</span>
        </div>
        <div class="card-body">
          <div class="o-form-group">
            <label class="form-label">{{ t('wms.settings.defaultBarcodeFormat', 'デフォルトバーコード形式') }}</label>
            <select v-model="form.barcodeDefaultFormat" class="o-input">
              <option value="code128">Code 128</option>
              <option value="ean13">EAN-13</option>
              <option value="code39">Code 39</option>
              <option value="qrcode">QR コード</option>
            </select>
          </div>
          <div class="o-form-group">
            <label class="form-label">{{ t('wms.settings.scanMode', 'スキャンモード') }}</label>
            <select v-model="form.barcodeScanMode" class="o-input">
              <option value="single">シングル（1件ずつ）</option>
              <option value="continuous">連続スキャン</option>
            </select>
          </div>
        </div>
      </div>

      <!-- 表示设定 / 表示設定 -->
      <div class="o-card settings-card">
        <div class="card-header">
          <span class="card-title">{{ t('wms.settings.displaySettings', '表示設定') }}</span>
          <span class="card-description">UI 表示スタイルの設定</span>
        </div>
        <div class="card-body">
          <div class="o-form-group">
            <label class="form-label">{{ t('wms.settings.orderSearchPanel', '受注一覧の検索パネル') }}</label>
            <select v-model="orderSearchStyle" class="o-input" @change="handleSearchStyleChange">
              <option value="classic">伝統スタイル（フィールド固定）</option>
              <option value="modern">新式スタイル（フィルター選択式）</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import OButton from '@/components/odoo/OButton.vue'
import { useSettingsStore, type OrderSearchStyle } from '@/stores/settings'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import {
  fetchSystemSettings,
  updateSystemSettings,
  type SystemSettings,
} from '@/api/systemSettings'

const settingsStore = useSettingsStore()
const { showSuccess, showError } = useToast()
const { t } = useI18n()

const loading = ref(false)
const saving = ref(false)
const orderSearchStyle = ref<OrderSearchStyle>('classic')

// 后端系统设定 / バックエンドシステム設定
const form = ref<Partial<SystemSettings>>({
  systemLanguage: 'ja',
  timezone: 'Asia/Tokyo',
  dateFormat: 'YYYY-MM-DD',
  pageSize: 50,
  outboundRequireInspection: true,
  outboundAllocationRule: 'FIFO',
  barcodeDefaultFormat: 'code128',
  barcodeScanMode: 'single',
})

async function loadSettings() {
  loading.value = true
  try {
    const data = await fetchSystemSettings()
    form.value = {
      systemLanguage: data.systemLanguage || 'ja',
      timezone: data.timezone || 'Asia/Tokyo',
      dateFormat: data.dateFormat || 'YYYY-MM-DD',
      pageSize: data.pageSize || 50,
      outboundRequireInspection: data.outboundRequireInspection ?? true,
      outboundAllocationRule: data.outboundAllocationRule || 'FIFO',
      barcodeDefaultFormat: data.barcodeDefaultFormat || 'code128',
      barcodeScanMode: data.barcodeScanMode || 'single',
    }
  } catch {
    // システム設定が未構成の場合はデフォルト値を使用（404は正常）/ 系统设置未配置时使用默认值（404正常）
  }
  orderSearchStyle.value = settingsStore.orderSearchStyle
  loading.value = false
}

async function handleSave() {
  saving.value = true
  try {
    await updateSystemSettings(form.value as SystemSettings)
    showSuccess(t('wms.settings.settingsSaved', '設定を保存しました'))
  } catch (e: unknown) {
    showError((e instanceof Error ? e.message : '設定の保存に失敗しました'))
  } finally {
    saving.value = false
  }
}

function handleSearchStyleChange() {
  settingsStore.setOrderSearchStyle(orderSearchStyle.value)
}

onMounted(loadSettings)
</script>

<style scoped>
.basic-settings {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0 20px 20px;
}

:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}

.settings-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: var(--o-gray-500, #6c757d);
}

.settings-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 800px;
}

.o-card {
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-border-color, #e4e7ed);
  border-radius: var(--o-border-radius, 8px);
  padding: 1.25rem;
}

.card-header {
  padding-bottom: 12px;
  border-bottom: 1px solid var(--o-border-color, #e4e7ed);
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--o-gray-800, #212529);
}

.card-description {
  font-size: 0.8125rem;
  color: var(--o-gray-500, #6c757d);
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.o-form-group {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.form-label {
  font-size: var(--o-font-size-base, 14px);
  color: var(--o-gray-700, #495057);
  white-space: nowrap;
  min-width: 200px;
}

.o-input {
  flex: 1;
  max-width: 300px;
  height: 34px;
  padding: 0 10px;
  border: 1px solid var(--o-border-color, #ced4da);
  border-radius: var(--o-border-radius, 4px);
  font-size: var(--o-font-size-base, 14px);
  color: var(--o-gray-800, #212529);
  background: var(--o-view-background, #fff);
  outline: none;
  transition: border-color 0.15s;
}

.o-input:focus {
  border-color: var(--o-brand-primary, #0052A3);
  box-shadow: 0 0 0 2px rgba(0, 82, 163, 0.15);
}

select.o-input {
  cursor: pointer;
}

/* Toggle switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
  cursor: pointer;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: var(--o-gray-300, #ced4da);
  border-radius: 12px;
  transition: background-color 0.2s;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 18px; height: 18px;
  left: 3px; bottom: 3px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.2s;
}

.toggle-switch input:checked + .toggle-slider {
  background-color: var(--o-brand-primary, #0052A3);
}

.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(20px);
}

@media (max-width: 640px) {
  .o-form-group {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  .o-input {
    max-width: 100%;
    width: 100%;
  }
  .form-label {
    min-width: auto;
  }
}
</style>
