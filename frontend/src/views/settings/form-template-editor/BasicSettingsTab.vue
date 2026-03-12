<template>
  <div v-show="visible" class="settings-section">
    <h3 class="section-title">基本設定</h3>
    <div class="o-form">
      <div class="o-form-group">
        <label>テンプレート名</label>
        <input :value="template.name" class="o-input" placeholder="例：ピッキングリスト" @input="$emit('update-field', 'name', ($event.target as HTMLInputElement).value)" />
      </div>
      <div class="o-form-group">
        <label>種類</label>
        <select :value="template.targetType" class="o-input" disabled style="width: 100%">
          <option
            v-for="t in formTypeRegistry"
            :key="t.type"
            :value="t.type"
          >{{ t.label }}</option>
        </select>
        <div class="hint">種類は作成時に設定され、変更できません</div>
      </div>
      <div class="o-form-group">
        <label>デフォルト</label>
        <div>
          <label class="o-toggle">
            <input type="checkbox" :checked="template.isDefault" @change="$emit('update-field', 'isDefault', ($event.target as HTMLInputElement).checked)" />
            <span class="o-toggle-slider"></span>
          </label>
          <div class="hint">この種類のデフォルトテンプレートとして使用</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FormTemplate } from '@/types/formTemplate'
import { formTypeRegistry } from '@/utils/form-export/formFieldRegistry'

defineProps<{
  visible: boolean
  template: FormTemplate
}>()

defineEmits<{
  'update-field': [field: string, value: any]
}>()
</script>

<style scoped>
.settings-section { margin-bottom: 24px; }
.section-title { margin: 0 0 16px; font-size: 16px; font-weight: 600; color: #303133; border-bottom: 1px solid #ebeef5; padding-bottom: 8px; }
.hint { margin-top: 4px; font-size: 12px; color: #909399; }
.o-form-group { display: flex; gap: 8px; margin-bottom: 12px; align-items: flex-start; }
.o-form-group > label { width: 140px; flex-shrink: 0; font-size: 13px; color: #606266; padding-top: 6px; }
.o-form-group > input, .o-form-group > select, .o-form-group > textarea { flex: 1; min-width: 0; }
.o-input { padding: 6px 10px; border: 1px solid var(--o-border-color, #dee2e6); border-radius: 4px; font-size: 13px; outline: none; transition: border-color 0.15s; box-sizing: border-box; }
.o-input:focus { border-color: var(--o-primary, #714B67); }
.o-toggle { position: relative; display: inline-flex; align-items: center; cursor: pointer; }
.o-toggle input { display: none; }
.o-toggle-slider { width: 36px; height: 20px; background: #ccc; border-radius: 10px; position: relative; transition: background 0.2s; }
.o-toggle-slider::after { content: ''; position: absolute; width: 16px; height: 16px; background: #fff; border-radius: 50%; top: 2px; left: 2px; transition: transform 0.2s; }
.o-toggle input:checked + .o-toggle-slider { background: var(--o-primary, #714B67); }
.o-toggle input:checked + .o-toggle-slider::after { transform: translateX(16px); }
</style>
