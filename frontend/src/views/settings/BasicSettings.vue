<template>
  <div class="basic-settings">
    <h2 class="page-title">基本設定</h2>

    <div class="o-card settings-card">
      <div class="card-header">
        <span class="card-title">表示設定</span>
      </div>

      <div class="o-form-group">
        <label class="o-form-label">受注一覧の検索パネル</label>
        <div class="radio-group">
          <label class="radio-option">
            <input
              type="radio"
              name="orderSearchStyle"
              value="classic"
              :checked="orderSearchStyle === 'classic'"
              @change="handleSearchStyleChange('classic')"
            />
            <span>伝統スタイル（フィールド固定）</span>
          </label>
          <label class="radio-option">
            <input
              type="radio"
              name="orderSearchStyle"
              value="modern"
              :checked="orderSearchStyle === 'modern'"
              @change="handleSearchStyleChange('modern')"
            />
            <span>新式スタイル（フィルター選択式）</span>
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSettingsStore, type OrderSearchStyle } from '@/stores/settings'
import { useToast } from '@/composables/useToast'

const settingsStore = useSettingsStore()
const { show: showToast } = useToast()

const orderSearchStyle = ref<OrderSearchStyle>('classic')

onMounted(() => {
  orderSearchStyle.value = settingsStore.orderSearchStyle
})

const handleSearchStyleChange = (value: OrderSearchStyle) => {
  orderSearchStyle.value = value
  settingsStore.setOrderSearchStyle(value)
  showToast('設定を保存しました', 'success')
}
</script>

<style scoped>
.basic-settings {
  padding: 0;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 20px;
  color: var(--o-gray-700, #303133);
}

.settings-card {
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
}

.card-title {
  font-size: 16px;
  font-weight: 500;
}

.o-form-group {
  margin-bottom: 1rem;
}

.o-form-label {
  display: block;
  font-size: var(--o-font-size-small, 13px);
  font-weight: 500;
  color: var(--o-gray-700, #303133);
  margin-bottom: 0.5rem;
}

.radio-group {
  display: flex;
  flex-direction: row;
  gap: 24px;
}

.radio-option {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 14px;
  color: var(--o-gray-700, #303133);
}

.radio-option input[type="radio"] {
  accent-color: var(--o-brand-primary, #714b67);
}
</style>
