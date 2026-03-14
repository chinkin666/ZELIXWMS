<template>
  <div v-show="visible" class="settings-section">
    <h3 class="section-title">{{ t('wms.formEditor.styleSettings', 'スタイル設定') }}</h3>
    <div class="o-form">
      <div class="o-form-group">
        <label>{{ t('wms.formEditor.fontSize', 'フォントサイズ') }}</label>
        <div style="display: flex; align-items: center; gap: 8px">
          <input type="number" :value="styles.fontSize" min="6" max="24" class="o-input" style="width: 80px" @input="updateStyle('fontSize', parseInt(($event.target as HTMLInputElement).value))" />
          <span class="unit">pt</span>
        </div>
      </div>
      <div class="o-form-group">
        <label>{{ t('wms.formEditor.headerBgColor', 'ヘッダー背景色') }}</label>
        <div style="display: flex; align-items: center; gap: 8px">
          <input type="color" :value="styles.headerBgColor" @input="updateStyle('headerBgColor', ($event.target as HTMLInputElement).value)" />
          <input :value="styles.headerBgColor" class="o-input" style="width: 120px" placeholder="#2a3474" @input="updateStyle('headerBgColor', ($event.target as HTMLInputElement).value)" />
        </div>
      </div>
      <div class="o-form-group">
        <label>{{ t('wms.formEditor.headerTextColor', 'ヘッダー文字色') }}</label>
        <div style="display: flex; align-items: center; gap: 8px">
          <input type="color" :value="styles.headerTextColor" @input="updateStyle('headerTextColor', ($event.target as HTMLInputElement).value)" />
          <input :value="styles.headerTextColor" class="o-input" style="width: 120px" placeholder="#ffffff" @input="updateStyle('headerTextColor', ($event.target as HTMLInputElement).value)" />
        </div>
      </div>
      <div class="o-form-group">
        <label>{{ t('wms.formEditor.borderColor', '罫線色') }}</label>
        <div style="display: flex; align-items: center; gap: 8px">
          <input type="color" :value="styles.borderColor" @input="updateStyle('borderColor', ($event.target as HTMLInputElement).value)" />
          <input :value="styles.borderColor" class="o-input" style="width: 120px" placeholder="#cccccc" @input="updateStyle('borderColor', ($event.target as HTMLInputElement).value)" />
        </div>
      </div>
      <div class="o-form-group">
        <label>{{ t('wms.formEditor.cellPadding', 'セル内余白') }}</label>
        <div style="display: flex; align-items: center; gap: 8px">
          <input type="number" :value="styles.cellPadding" min="0" max="20" class="o-input" style="width: 80px" @input="updateStyle('cellPadding', parseInt(($event.target as HTMLInputElement).value))" />
          <span class="unit">pt</span>
        </div>
      </div>

      <div class="o-divider"></div>

      <h4 class="sub-section-title">{{ t('wms.formEditor.cellAlignment', 'セル配置') }}</h4>

      <div class="o-form-group">
        <label>{{ t('wms.formEditor.horizontalAlign', '水平方向') }}</label>
        <div class="o-segmented">
          <button :class="{ active: styles.horizontalAlign === 'left' }" @click="updateStyle('horizontalAlign', 'left')">&#x21E4; {{ t('wms.formEditor.alignLeft', '左') }}</button>
          <button :class="{ active: styles.horizontalAlign === 'center' }" @click="updateStyle('horizontalAlign', 'center')">&#x2014; {{ t('wms.formEditor.alignCenter', '中央') }}</button>
          <button :class="{ active: styles.horizontalAlign === 'right' }" @click="updateStyle('horizontalAlign', 'right')">&#x21E5; {{ t('wms.formEditor.alignRight', '右') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()
defineProps<{
  visible: boolean
  styles: {
    fontSize: number
    headerBgColor: string
    headerTextColor: string
    borderColor: string
    cellPadding: number
    horizontalAlign: string
  }
}>()

const emit = defineEmits<{
  'update-style': [key: string, value: any]
}>()

function updateStyle(key: string, value: any) {
  emit('update-style', key, value)
}
</script>

<style scoped>
.settings-section { margin-bottom: 24px; }
.section-title { margin: 0 0 16px; font-size: 16px; font-weight: 600; color: #303133; border-bottom: 1px solid #ebeef5; padding-bottom: 8px; }
.sub-section-title { margin: 0 0 12px; font-size: 14px; font-weight: 500; color: #606266; }
.unit { margin-left: 8px; color: #909399; }
.o-form-group { display: flex; gap: 8px; margin-bottom: 12px; align-items: flex-start; }
.o-form-group > label { width: 140px; flex-shrink: 0; font-size: 13px; color: #606266; padding-top: 6px; }
.o-input { padding: 6px 10px; border: 1px solid var(--o-border-color, #dee2e6); border-radius: 4px; font-size: 13px; outline: none; transition: border-color 0.15s; box-sizing: border-box; }
.o-input:focus { border-color: var(--o-primary, #714B67); }
.o-divider { border: none; border-top: 1px solid #ebeef5; margin: 16px 0; }
.o-segmented { display: inline-flex; border: 1px solid #dcdfe6; border-radius: 4px; overflow: hidden; }
.o-segmented button { padding: 6px 14px; border: none; background: #fff; cursor: pointer; font-size: 13px; color: #606266; border-right: 1px solid #dcdfe6; }
.o-segmented button:last-child { border-right: none; }
.o-segmented button.active { background: var(--o-primary, #714B67); color: #fff; }
.o-segmented button:hover:not(.active) { background: #f5f7fa; }
</style>
