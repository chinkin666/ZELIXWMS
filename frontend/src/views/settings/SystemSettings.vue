<script setup lang="ts">
import { ref, onMounted } from 'vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import OButton from '@/components/odoo/OButton.vue'
import { useToast } from '@/composables/useToast'
import {
  fetchSystemSettings,
  updateSystemSettings,
  resetSystemSettings,
  type SystemSettings,
} from '@/api/systemSettings'

const { showSuccess, showError, showWarning } = useToast()

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
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '設定の読み込みに失敗しました'
    showError(msg)
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
    showSuccess('設定を保存しました')
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '設定の保存に失敗しました'
    showError(msg)
  } finally {
    saving.value = false
  }
}

async function handleReset(): Promise<void> {
  const confirmed = window.confirm('すべての設定をデフォルト値にリセットしますか？')
  if (!confirmed) return

  saving.value = true
  try {
    const data = await resetSystemSettings()
    applySettings(data)
    showWarning('設定をデフォルト値にリセットしました')
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '設定のリセットに失敗しました'
    showError(msg)
  } finally {
    saving.value = false
  }
}

onMounted(loadSettings)
</script>

<template>
  <div class="system-settings">
    <ControlPanel title="応用設定" :show-search="false">
      <template #actions>
        <OButton variant="secondary" :disabled="saving" @click="handleReset">
          リセット
        </OButton>
        <OButton variant="primary" :disabled="saving" @click="handleSave">
          保存
        </OButton>
      </template>
    </ControlPanel>

    <div v-if="loading" class="settings-loading">読み込み中...</div>

    <div v-else class="settings-body">
      <!-- 入荷設定 -->
      <div class="o-card settings-card">
        <div class="card-header">
          <span class="card-title">入荷設定</span>
          <span class="card-description">入荷時の検品やロット自動作成に関する設定</span>
        </div>
        <div class="card-body">
          <div class="o-form-group">
            <label class="o-form-label">入荷時に検品を必須にする</label>
            <label class="toggle-switch">
              <input v-model="form.inboundRequireInspection" type="checkbox" />
              <span class="toggle-slider" />
            </label>
          </div>
          <div class="o-form-group">
            <label class="o-form-label">入荷時にロットを自動作成</label>
            <label class="toggle-switch">
              <input v-model="form.inboundAutoCreateLot" type="checkbox" />
              <span class="toggle-slider" />
            </label>
          </div>
          <div class="o-form-group">
            <label class="o-form-label">デフォルト入荷ロケーション</label>
            <input
              v-model="form.inboundDefaultLocationCode"
              type="text"
              class="o-input"
              placeholder="例: WH-IN-01"
            />
          </div>
        </div>
      </div>

      <!-- 在庫設定 -->
      <div class="o-card settings-card">
        <div class="card-header">
          <span class="card-title">在庫設定</span>
          <span class="card-description">在庫管理・ロット追跡・賞味期限に関する設定</span>
        </div>
        <div class="card-body">
          <div class="o-form-group">
            <label class="o-form-label">マイナス在庫を許可</label>
            <label class="toggle-switch">
              <input v-model="form.inventoryAllowNegativeStock" type="checkbox" />
              <span class="toggle-slider" />
            </label>
          </div>
          <div class="o-form-group">
            <label class="o-form-label">デフォルト安全在庫数</label>
            <input
              v-model.number="form.inventoryDefaultSafetyStock"
              type="number"
              class="o-input"
              min="0"
            />
          </div>
          <div class="o-form-group">
            <label class="o-form-label">ロット追跡を有効化</label>
            <label class="toggle-switch">
              <input v-model="form.inventoryLotTrackingEnabled" type="checkbox" />
              <span class="toggle-slider" />
            </label>
          </div>
          <div class="o-form-group">
            <label class="o-form-label">賞味期限アラート日数</label>
            <input
              v-model.number="form.inventoryExpiryAlertDays"
              type="number"
              class="o-input"
              min="0"
            />
          </div>
        </div>
      </div>

      <!-- 出荷設定 -->
      <div class="o-card settings-card">
        <div class="card-header">
          <span class="card-title">出荷設定</span>
          <span class="card-description">出荷時の自動引当・検品に関する設定</span>
        </div>
        <div class="card-body">
          <div class="o-form-group">
            <label class="o-form-label">出荷時に自動引当</label>
            <label class="toggle-switch">
              <input v-model="form.outboundAutoAllocate" type="checkbox" />
              <span class="toggle-slider" />
            </label>
          </div>
          <div class="o-form-group">
            <label class="o-form-label">引当ルール</label>
            <select v-model="form.outboundAllocationRule" class="o-input">
              <option value="FIFO">FIFO（先入先出）</option>
              <option value="FEFO">FEFO（先期限先出）</option>
              <option value="LIFO">LIFO（後入先出）</option>
            </select>
          </div>
          <div class="o-form-group">
            <label class="o-form-label">出荷検品必須</label>
            <label class="toggle-switch">
              <input v-model="form.outboundRequireInspection" type="checkbox" />
              <span class="toggle-slider" />
            </label>
          </div>
        </div>
      </div>

      <!-- バーコード設定 -->
      <div class="o-card settings-card">
        <div class="card-header">
          <span class="card-title">バーコード設定</span>
          <span class="card-description">バーコードフォーマットとスキャンモードの設定</span>
        </div>
        <div class="card-body">
          <div class="o-form-group">
            <label class="o-form-label">デフォルトバーコード形式</label>
            <select v-model="form.barcodeDefaultFormat" class="o-input">
              <option value="code128">Code 128</option>
              <option value="ean13">EAN-13</option>
              <option value="code39">Code 39</option>
              <option value="qrcode">QRコード</option>
            </select>
          </div>
          <div class="o-form-group">
            <label class="o-form-label">スキャンモード</label>
            <select v-model="form.barcodeScanMode" class="o-input">
              <option value="single">シングル（1件ずつ）</option>
              <option value="continuous">連続スキャン</option>
            </select>
          </div>
        </div>
      </div>

      <!-- 一般設定 -->
      <div class="o-card settings-card">
        <div class="card-header">
          <span class="card-title">一般設定</span>
          <span class="card-description">言語・タイムゾーン・表示形式の設定</span>
        </div>
        <div class="card-body">
          <div class="o-form-group">
            <label class="o-form-label">システム言語</label>
            <select v-model="form.systemLanguage" class="o-input">
              <option value="ja">日本語</option>
              <option value="en">English</option>
              <option value="zh">中文</option>
            </select>
          </div>
          <div class="o-form-group">
            <label class="o-form-label">タイムゾーン</label>
            <select v-model="form.timezone" class="o-input">
              <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
              <option value="Asia/Shanghai">Asia/Shanghai (CST)</option>
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
            </select>
          </div>
          <div class="o-form-group">
            <label class="o-form-label">日付フォーマット</label>
            <select v-model="form.dateFormat" class="o-input">
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              <option value="YYYY/MM/DD">YYYY/MM/DD</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            </select>
          </div>
          <div class="o-form-group">
            <label class="o-form-label">デフォルトページサイズ</label>
            <input
              v-model.number="form.pageSize"
              type="number"
              class="o-input"
              min="10"
              max="200"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.system-settings {
  padding: 0;
}

.settings-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: var(--o-gray-500, #6c757d);
  font-size: var(--o-font-size-base, 14px);
}

.settings-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
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

.o-form-label {
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
  border-color: var(--o-brand-primary, #714b67);
  box-shadow: 0 0 0 2px rgba(113, 75, 103, 0.15);
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
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--o-gray-300, #ced4da);
  border-radius: 12px;
  transition: background-color 0.2s;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  left: 3px;
  bottom: 3px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.2s;
}

.toggle-switch input:checked + .toggle-slider {
  background-color: var(--o-brand-primary, #714b67);
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

  .o-form-label {
    min-width: auto;
  }
}
</style>
