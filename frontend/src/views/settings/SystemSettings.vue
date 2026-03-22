<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessageBox } from 'element-plus'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import OButton from '@/components/odoo/OButton.vue'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import {
  fetchSystemSettings,
  updateSystemSettings,
  resetSystemSettings,
  type SystemSettings,
} from '@/api/systemSettings'

const { showSuccess, showError, showWarning } = useToast()
const { t } = useI18n()

const loading = ref(false)
const saving = ref(false)

// --- Form state (mutable local copy) ---
const form = ref<SystemSettings>({
  inboundRequireInspection: true,
  inboundAutoCreateLot: false,
  inboundDefaultLocationCode: '',
  inventoryAllowNegativeStock: false,
  inventoryDefaultSafetyStock: 0,
  inventoryLotTrackingEnabled: true,
  inventoryExpiryAlertDays: 30,
  outboundAutoAllocate: false,
  outboundAllocationRule: 'FIFO',
  outboundRequireInspection: true,
  barcodeDefaultFormat: 'code128',
  barcodeScanMode: 'single',
  systemLanguage: 'ja',
  timezone: 'Asia/Tokyo',
  dateFormat: 'YYYY-MM-DD',
  pageSize: 50,
})

function applySettings(data: SystemSettings): void {
  form.value = { ...data }
}

async function loadSettings(): Promise<void> {
  loading.value = true
  try {
    const data = await fetchSystemSettings()
    applySettings(data)
  } catch {
    // システム設定が未構成の場合はデフォルト値を使用（404は正常）/ 系统设置未配置时使用默认值（404正常）
  } finally {
    loading.value = false
  }
}

async function handleSave(): Promise<void> {
  saving.value = true
  try {
    const {
      _id: _ignored,
      settingsKey: _ignored2,
      createdAt: _ignored3,
      updatedAt: _ignored4,
      ...payload
    } = form.value
    const data = await updateSystemSettings(payload)
    applySettings(data)
    showSuccess(t('wms.settings.settingsSaved', '設定を保存しました'))
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : t('wms.settings.saveSettingsFailed', '設定の保存に失敗しました')
    showError(msg)
  } finally {
    saving.value = false
  }
}

async function handleReset(): Promise<void> {
  try {
    await ElMessageBox.confirm(
      'すべての設定をデフォルト値にリセットしてもよろしいですか？ / 确定要将所有设置重置为默认值吗？',
      '確認 / 确认',
      { confirmButtonText: 'リセット / 重置', cancelButtonText: 'キャンセル / 取消', type: 'warning' },
    )
  } catch { return }

  saving.value = true
  try {
    const data = await resetSystemSettings()
    applySettings(data)
    showWarning(t('wms.settings.settingsResetToDefault', '設定をデフォルト値にリセットしました'))
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : t('wms.settings.resetSettingsFailed', '設定のリセットに失敗しました')
    showError(msg)
  } finally {
    saving.value = false
  }
}

onMounted(loadSettings)
</script>

<template>
  <div class="system-settings">
    <ControlPanel :title="t('wms.settings.advancedSettings', '応用設定')" :show-search="false">
      <template #actions>
        <OButton variant="secondary" :disabled="saving" @click="handleReset">
          {{ t('wms.settings.reset', 'リセット') }}
        </OButton>
        <OButton variant="primary" :disabled="saving" @click="handleSave">
          {{ t('wms.common.save', '保存') }}
        </OButton>
      </template>
    </ControlPanel>

    <div v-if="loading" class="settings-loading">{{ t('wms.settings.loading', '読み込み中...') }}</div>

    <div v-else class="settings-body">
      <p class="settings-hint">
        基本的な設定は「基本設定」ページで行えます。こちらは入庫・在庫・出荷の詳細設定です。
      </p>

      <!-- 入荷设定 / 入荷設定 -->
      <div class="o-card settings-card">
        <div class="card-header">
          <span class="card-title">{{ t('wms.settings.inboundSettings', '入荷設定') }}</span>
          <span class="card-description">{{ t('wms.settings.inboundSettingsDesc', '入荷時の検品やロット自動作成に関する設定') }}</span>
        </div>
        <div class="card-body">
          <div class="o-form-group">
            <label class="form-label">{{ t('wms.settings.inboundRequireInspection', '入荷時に検品を必須にする') }}</label>
            <label class="toggle-switch">
              <input v-model="form.inboundRequireInspection" type="checkbox" />
              <span class="toggle-slider" />
            </label>
          </div>
          <div class="o-form-group">
            <label class="form-label">{{ t('wms.settings.inboundAutoCreateLot', '入荷時にロットを自動作成') }}</label>
            <label class="toggle-switch">
              <input v-model="form.inboundAutoCreateLot" type="checkbox" />
              <span class="toggle-slider" />
            </label>
          </div>
          <div class="o-form-group">
            <label class="form-label">{{ t('wms.settings.defaultInboundLocation', 'デフォルト入荷ロケーション') }}</label>
            <input v-model="form.inboundDefaultLocationCode" type="text" class="o-input" placeholder="例: WH-IN-01" />
          </div>
        </div>
      </div>

      <!-- 在库设定 / 在庫設定 -->
      <div class="o-card settings-card">
        <div class="card-header">
          <span class="card-title">{{ t('wms.settings.inventorySettings', '在庫設定') }}</span>
          <span class="card-description">{{ t('wms.settings.inventorySettingsDesc', '在庫管理・ロット追跡・賞味期限に関する設定') }}</span>
        </div>
        <div class="card-body">
          <div class="o-form-group">
            <label class="form-label">{{ t('wms.settings.allowNegativeStock', 'マイナス在庫を許可') }}</label>
            <label class="toggle-switch">
              <input v-model="form.inventoryAllowNegativeStock" type="checkbox" />
              <span class="toggle-slider" />
            </label>
          </div>
          <div class="o-form-group">
            <label class="form-label">{{ t('wms.settings.defaultSafetyStock', 'デフォルト安全在庫数') }}</label>
            <input v-model.number="form.inventoryDefaultSafetyStock" type="number" class="o-input" min="0" />
          </div>
          <div class="o-form-group">
            <label class="form-label">{{ t('wms.settings.enableLotTracking', 'ロット追跡を有効化') }}</label>
            <label class="toggle-switch">
              <input v-model="form.inventoryLotTrackingEnabled" type="checkbox" />
              <span class="toggle-slider" />
            </label>
          </div>
          <div class="o-form-group">
            <label class="form-label">{{ t('wms.settings.expiryAlertDays', '賞味期限アラート日数') }}</label>
            <input v-model.number="form.inventoryExpiryAlertDays" type="number" class="o-input" min="0" />
          </div>
        </div>
      </div>

      <!-- 出荷高级设定 / 出荷詳細設定 -->
      <div class="o-card settings-card">
        <div class="card-header">
          <span class="card-title">{{ t('wms.settings.outboundAdvanced', '出荷詳細設定') }}</span>
          <span class="card-description">出荷時の自動引当に関する詳細設定（検品・引当ルールは基本設定で変更可能）</span>
        </div>
        <div class="card-body">
          <div class="o-form-group">
            <label class="form-label">{{ t('wms.settings.outboundAutoAllocate', '出荷時に自動引当') }}</label>
            <label class="toggle-switch">
              <input v-model="form.outboundAutoAllocate" type="checkbox" />
              <span class="toggle-slider" />
            </label>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.system-settings {
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

.settings-hint {
  font-size: 13px;
  color: var(--o-gray-500, #6c757d);
  padding: 8px 12px;
  background: var(--o-gray-100, #f5f7fa);
  border-left: 3px solid var(--o-brand-primary, #0052A3);
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

.settings-card {
  max-width: 800px;
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

select.o-input { cursor: pointer; }

/* Toggle switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
  cursor: pointer;
}
.toggle-switch input { opacity: 0; width: 0; height: 0; }
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
  .o-input { max-width: 100%; width: 100%; }
  .form-label { min-width: auto; }
}
</style>
