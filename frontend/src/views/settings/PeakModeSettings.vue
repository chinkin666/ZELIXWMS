<template>
  <div class="peak-mode-settings">
    <PageHeader :title="t('wms.settings.peakMode', 'ピークモード設定')" :show-search="false" />

    <div v-if="isLoading" class="space-y-3 p-4">
      <Skeleton class="h-4 w-[250px]" />
      <Skeleton class="h-4 w-[200px]" />
      <Skeleton class="h-10 w-full" />
      <Skeleton class="h-10 w-full" />
      <Skeleton class="h-10 w-full" />
    </div>
    <template v-else>
      <!-- ステータスカード / 状态卡片 -->
      <div class="status-cards">
        <div class='rounded-lg border p-4 text-center'
          :title="t('wms.peakMode.currentStatus', '現在のステータス')"
          :value="status.enabled ? 'ピークモード ON' : 'ピークモード OFF'"
          :icon="status.enabled ? '\u{1F525}' : '\u{2744}\u{FE0F}'"
          :color="status.enabled ? '#f5222d' : '#1677ff'"
        />
        <div class='rounded-lg border p-4 text-center'
          :title="t('wms.peakMode.capacity', '倉庫キャパシティ')"
          :value="`${capacityPercent}%`"
          :icon="'\u{1F4E6}'"
          :color="capacityColor"
        />
        <div class='rounded-lg border p-4 text-center'
          :title="t('wms.peakMode.inboundFreeze', '入庫凍結')"
          :value="status.inboundFrozen ? '凍結中' : '通常'"
          :icon="status.inboundFrozen ? '\u{26C4}' : '\u{2705}'"
          :color="status.inboundFrozen ? '#fa8c16' : '#52c41a'"
        />
        <div class='rounded-lg border p-4 text-center'
          v-if="status.reason"
          :title="t('wms.peakMode.reason', '有効化理由')"
          :value="status.reason"
          :icon="'\u{1F4DD}'"
          color="#722ed1"
        />
      </div>

      <!-- キャパシティ表示 / 容量显示 -->
      <div class="capacity-section">
        <h3 class="section-title">{{ t('wms.peakMode.warehouseCapacity', '倉庫キャパシティ') }}</h3>
        <div class="capacity-bar-wrapper">
          <div class="capacity-bar">
            <div
              class="capacity-fill"
              :style="{ width: `${Math.min(capacityPercent, 100)}%`, background: capacityColor }"
            />
          </div>
          <span class="capacity-label" :style="{ color: capacityColor }">{{ capacityPercent }}%</span>
        </div>
        <div class="capacity-legend">
          <span class="legend-item">
            <span class="legend-dot" style="background: #52c41a" />
            {{ t('wms.peakMode.normal', '正常 (< 80%)') }}
          </span>
          <span class="legend-item">
            <span class="legend-dot" style="background: #faad14" />
            {{ t('wms.peakMode.warning', '警告 (80-95%)') }}
          </span>
          <span class="legend-item">
            <span class="legend-dot" style="background: #f5222d" />
            {{ t('wms.peakMode.critical', '危険 (> 95%)') }}
          </span>
        </div>
      </div>

      <!-- ピークモード制御 / 峰值模式控制 -->
      <div class="control-section">
        <h3 class="section-title">{{ t('wms.peakMode.controls', 'モード制御') }}</h3>

        <div class="control-row">
          <div class="control-label">
            <strong>{{ t('wms.peakMode.peakModeToggle', 'ピークモード') }}</strong>
            <span class="control-hint">{{ t('wms.peakMode.peakModeHint', '繁忙期の特別運用モードを有効にします') }}</span>
          </div>
          <label class="o-toggle">
            <input
              type="checkbox"
              :checked="status.enabled"
              @change="togglePeakMode(($event.target as HTMLInputElement).checked)"
            />
            <span class="o-toggle-slider"></span>
          </label>
        </div>

        <div class="control-row">
          <div class="control-label">
            <strong>{{ t('wms.peakMode.inboundFreezeToggle', '入庫凍結') }}</strong>
            <span class="control-hint">{{ t('wms.peakMode.inboundFreezeHint', '新規入庫受付を一時停止します') }}</span>
          </div>
          <label class="o-toggle">
            <input
              type="checkbox"
              :checked="status.inboundFrozen"
              @change="toggleInboundFreeze(($event.target as HTMLInputElement).checked)"
            />
            <span class="o-toggle-slider"></span>
          </label>
        </div>
      </div>

      <!-- 有効化理由入力ダイアログ / 启用原因输入 -->
      <div v-if="showReasonInput" class="reason-section">
        <h3 class="section-title">{{ t('wms.peakMode.enableReason', '有効化理由') }}</h3>
        <div class="reason-options">
          <label
            v-for="option in reasonOptions"
            :key="option.value"
            class="reason-option"
            :class="{ selected: selectedReason === option.value }"
          >
            <input type="radio" v-model="selectedReason" :value="option.value" />
            <span>{{ option.label }}</span>
          </label>
        </div>
        <div v-if="selectedReason === 'other'" class="reason-custom">
          <Input v-model="customReason" type="text" :placeholder="t('wms.peakMode.otherReasonPlaceholder', '理由を入力してください')" />
        </div>
        <div class="reason-actions">
          <Button variant="default" size="sm" @click="confirmEnable" :disabled="enabling">
            {{ enabling ? t('wms.common.processing', '処理中...') : t('wms.peakMode.confirmEnable', '有効化を確定') }}
          </Button>
          <Button variant="secondary" size="sm" @click="cancelEnable">
            {{ t('wms.common.cancel', 'キャンセル') }}
          </Button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * ピークモード設定 / 峰值模式设置
 *
 * ピークモードのON/OFF、入庫凍結の制御、倉庫キャパシティの確認を行う
 * 控制峰值模式开关、入库冻结、查看仓库容量
 */
import { ref, computed, onMounted } from 'vue'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/shared/PageHeader.vue'
import { getApiBaseUrl } from '@/api/base'
import { apiFetch } from '@/api/http'
import { Input } from '@/components/ui/input'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
const { confirm } = useConfirmDialog()

const API_BASE_URL = getApiBaseUrl()
const toast = useToast()
const { t } = useI18n()

// ステータスデータ型 / 状态数据类型
interface PeakModeStatus {
  enabled: boolean
  inboundFrozen: boolean
  reason?: string
  capacityPercent?: number
  enabledAt?: string
}

const isLoading = ref(false)
const enabling = ref(false)
const showReasonInput = ref(false)
const selectedReason = ref('new_year')
const customReason = ref('')
const status = ref<PeakModeStatus>({
  enabled: false,
  inboundFrozen: false,
  capacityPercent: 0,
})

// 理由選択肢 / 原因选项
const reasonOptions = [
  { value: 'new_year', label: '年末年始' },
  { value: 'obon', label: 'お中元' },
  { value: 'oseibo', label: 'お歳暮' },
  { value: 'black_friday', label: 'ブラックフライデー' },
  { value: 'other', label: 'その他' },
]

// キャパシティ数値 / 容量百分比
const capacityPercent = computed(() => status.value.capacityPercent ?? 0)

// 警告色の算出 / 计算警告颜色
const capacityColor = computed(() => {
  const pct = capacityPercent.value
  if (pct >= 95) return '#f5222d'   // 危険 / 危险
  if (pct >= 80) return '#faad14'   // 警告 / 警告
  return '#52c41a'                   // 正常 / 正常
})

// ステータス取得 / 获取状态
const loadStatus = async () => {
  isLoading.value = true
  try {
    const res = await apiFetch(`${API_BASE_URL}/peak-mode/status`)
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'ステータスの取得に失敗しました')
    const data = await res.json()
    status.value = data.data || data
  } catch (e: any) {
    toast.showError(e.message || t('wms.peakMode.fetchFailed', 'ステータスの取得に失敗しました'))
  } finally {
    isLoading.value = false
  }
}

// ピークモード切替 / 切换峰值模式
const togglePeakMode = (checked: boolean) => {
  if (checked) {
    // ON → 理由入力を表示 / 打开 → 显示原因输入
    showReasonInput.value = true
  } else {
    // OFF → 無効化 / 关闭 → 禁用
    disablePeakMode()
  }
}

// 有効化確定 / 确认启用
const confirmEnable = async () => {
  const reason = selectedReason.value === 'other'
    ? customReason.value
    : reasonOptions.find(o => o.value === selectedReason.value)?.label || selectedReason.value

  if (!reason.trim()) {
    toast.showWarning(t('wms.peakMode.reasonRequired', '理由を入力してください'))
    return
  }

  enabling.value = true
  try {
    const res = await apiFetch(`${API_BASE_URL}/peak-mode/enable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || '有効化に失敗しました')
    toast.showSuccess(t('wms.peakMode.enabled', 'ピークモードを有効にしました'))
    showReasonInput.value = false
    await loadStatus()
  } catch (e: any) {
    toast.showError(e.message || t('wms.peakMode.enableFailed', 'ピークモードの有効化に失敗しました'))
  } finally {
    enabling.value = false
  }
}

// 有効化キャンセル / 取消启用
const cancelEnable = () => {
  showReasonInput.value = false
}

// 無効化 / 禁用
const disablePeakMode = async () => {
  if (!(await confirm('この操作を実行しますか？'))) return
  try {
    const res = await apiFetch(`${API_BASE_URL}/peak-mode/disable`, {
      method: 'POST',
    })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || '無効化に失敗しました')
    toast.showSuccess(t('wms.peakMode.disabled', 'ピークモードを無効にしました'))
    await loadStatus()
  } catch (e: any) {
    toast.showError(e.message || t('wms.peakMode.disableFailed', 'ピークモードの無効化に失敗しました'))
  }
}

// 入庫凍結の切替 / 切换入库冻结
const toggleInboundFreeze = async (checked: boolean) => {
  const action = checked ? 'enable' : 'disable'
  try {
    const res = await apiFetch(`${API_BASE_URL}/peak-mode/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inboundFrozen: checked }),
    })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || '入庫凍結の更新に失敗しました')
    toast.showSuccess(
      checked
        ? t('wms.peakMode.inboundFrozen', '入庫を凍結しました')
        : t('wms.peakMode.inboundUnfrozen', '入庫凍結を解除しました')
    )
    await loadStatus()
  } catch (e: any) {
    toast.showError(e.message || t('wms.peakMode.inboundFreezeFailed', '入庫凍結の更新に失敗しました'))
    await loadStatus()
  }
}

onMounted(() => {
  loadStatus()
})
</script>

<style scoped>
.peak-mode-settings {
  display: flex;
  flex-direction: column;
  padding: 0 20px 20px;
  gap: 20px;
}

:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}

/* ステータスカード / 状态卡片 */
.status-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

/* セクションタイトル / 区域标题 */
.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--o-gray-800, #303133);
  margin: 0 0 14px;
}

/* キャパシティ表示 / 容量显示 */
.capacity-section {
  padding: 20px;
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-border-color, #e4e7ed);
  border-radius: 8px;
}

.capacity-bar-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.capacity-bar {
  flex: 1;
  height: 12px;
  background: var(--o-gray-100, #f5f7fa);
  border-radius: 6px;
  overflow: hidden;
}

.capacity-fill {
  height: 100%;
  border-radius: 6px;
  transition: width 0.5s ease, background 0.3s;
}

.capacity-label {
  font-size: 16px;
  font-weight: 700;
  min-width: 50px;
  text-align: right;
}

.capacity-legend {
  display: flex;
  gap: 20px;
  font-size: 12px;
  color: var(--o-gray-600, #606266);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

/* 制御セクション / 控制区域 */
.control-section {
  padding: 20px;
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-border-color, #e4e7ed);
  border-radius: 8px;
}

.control-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
  border-bottom: 1px solid var(--o-border-color, #e4e7ed);
}

.control-row:last-child {
  border-bottom: none;
}

.control-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.control-label strong {
  font-size: 14px;
  color: var(--o-gray-800, #303133);
}

.control-hint {
  font-size: 12px;
  color: var(--o-gray-500, #909399);
}

/* トグルスイッチ / 开关 */
.o-toggle { position: relative; display: inline-flex; align-items: center; cursor: pointer; }
.o-toggle input { position: absolute; opacity: 0; width: 0; height: 0; }
.o-toggle-slider { width: 40px; height: 20px; background: var(--o-toggle-off, #c0c4cc); border-radius: 10px; transition: 0.2s; position: relative; }
.o-toggle-slider::after { content: ''; position: absolute; width: 16px; height: 16px; border-radius: 50%; background: #fff; top: 2px; left: 2px; transition: 0.2s; }
.o-toggle input:checked + .o-toggle-slider { background: var(--o-brand-primary, #0052A3); }
.o-toggle input:checked + .o-toggle-slider::after { left: 22px; }

/* 理由セクション / 原因区域 */
.reason-section {
  padding: 20px;
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-brand-primary, #0052A3);
  border-radius: 8px;
}

.reason-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}

.reason-option {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid var(--o-border-color, #e4e7ed);
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: border-color 0.2s, background 0.2s;
}

.reason-option:hover {
  border-color: var(--o-brand-primary, #0052A3);
}

.reason-option.selected {
  border-color: var(--o-brand-primary, #0052A3);
  background: #f0f7ff;
}

.reason-option input[type="radio"] {
  accent-color: var(--o-brand-primary, #0052A3);
}

.reason-custom {
  margin-bottom: 14px;
}

.reason-input {
  width: 100%;
  max-width: 400px;
  padding: 8px 12px;
  border: 1px solid var(--o-border-color, #e4e7ed);
  border-radius: 6px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
}

.reason-input:focus {
  border-color: var(--o-brand-primary, #0052A3);
}

.reason-actions {
  display: flex;
  gap: 8px;
}
</style>
