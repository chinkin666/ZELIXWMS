<template>
  <div v-show="visible" class="settings-section">
    <h3 class="section-title">{{ t('wms.formEditor.pageSettings', '用紙設定') }}</h3>
    <div class="o-form">
      <div class="o-form-group">
        <label>{{ t('wms.formEditor.pageSize', '用紙サイズ') }}</label>
        <div class="radio-group">
          <label><input type="radio" :checked="template.pageSize === 'A4'" @change="$emit('update-field', 'pageSize', 'A4')" /> A4</label>
          <label><input type="radio" :checked="template.pageSize === 'A3'" @change="$emit('update-field', 'pageSize', 'A3')" /> A3</label>
          <label><input type="radio" :checked="template.pageSize === 'B4'" @change="$emit('update-field', 'pageSize', 'B4')" /> B4</label>
          <label><input type="radio" :checked="template.pageSize === 'LETTER'" @change="$emit('update-field', 'pageSize', 'LETTER')" /> Letter</label>
        </div>
      </div>
      <div class="o-form-group">
        <label>{{ t('wms.formEditor.pageOrientation', '印刷向き') }}</label>
        <div class="radio-group">
          <label><input type="radio" :checked="template.pageOrientation === 'portrait'" @change="$emit('update-field', 'pageOrientation', 'portrait')" /> {{ t('wms.formEditor.portrait', '縦 (portrait)') }}</label>
          <label><input type="radio" :checked="template.pageOrientation === 'landscape'" @change="$emit('update-field', 'pageOrientation', 'landscape')" /> {{ t('wms.formEditor.landscape', '横 (landscape)') }}</label>
        </div>
      </div>
      <div class="o-form-group">
        <label>{{ t('wms.formEditor.margins', '余白 (pt)') }}</label>
        <div class="margin-inputs">
          <div class="margin-input">
            <span>{{ t('wms.formEditor.marginLeft', '左') }}</span>
            <input type="number" :value="template.pageMargins[0]" min="0" max="200" class="o-input" style="width: 80px" @input="$emit('update-margin', 0, parseInt(($event.target as HTMLInputElement).value))" />
          </div>
          <div class="margin-input">
            <span>{{ t('wms.formEditor.marginTop', '上') }}</span>
            <input type="number" :value="template.pageMargins[1]" min="0" max="200" class="o-input" style="width: 80px" @input="$emit('update-margin', 1, parseInt(($event.target as HTMLInputElement).value))" />
          </div>
          <div class="margin-input">
            <span>{{ t('wms.formEditor.marginRight', '右') }}</span>
            <input type="number" :value="template.pageMargins[2]" min="0" max="200" class="o-input" style="width: 80px" @input="$emit('update-margin', 2, parseInt(($event.target as HTMLInputElement).value))" />
          </div>
          <div class="margin-input">
            <span>{{ t('wms.formEditor.marginBottom', '下') }}</span>
            <input type="number" :value="template.pageMargins[3]" min="0" max="200" class="o-input" style="width: 80px" @input="$emit('update-margin', 3, parseInt(($event.target as HTMLInputElement).value))" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FormTemplate } from '@/types/formTemplate'
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()

defineProps<{
  visible: boolean
  template: FormTemplate
}>()

defineEmits<{
  'update-field': [field: string, value: any]
  'update-margin': [index: number, value: number]
}>()
</script>

<style scoped>
.settings-section { margin-bottom: 24px; }
.section-title { margin: 0 0 16px; font-size: 16px; font-weight: 600; color: #303133; border-bottom: 1px solid #ebeef5; padding-bottom: 8px; }
.o-form-group { display: flex; gap: 8px; margin-bottom: 12px; align-items: flex-start; }
.o-form-group > label { width: 140px; flex-shrink: 0; font-size: 13px; color: #606266; padding-top: 6px; }
.radio-group { display: flex; gap: 12px; flex-wrap: wrap; font-size: 13px; }
.radio-group label { display: flex; align-items: center; gap: 4px; cursor: pointer; }
.margin-inputs { display: flex; gap: 16px; flex-wrap: wrap; }
.margin-input { display: flex; align-items: center; gap: 8px; }
.margin-input span { font-size: 12px; color: #606266; width: 20px; }
.o-input { padding: 6px 10px; border: 1px solid var(--o-border-color, #dee2e6); border-radius: 4px; font-size: 13px; outline: none; transition: border-color 0.15s; box-sizing: border-box; }
.o-input:focus { border-color: var(--o-primary, #0052A3); }
</style>
