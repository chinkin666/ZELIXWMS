<template>
  <div class="table-card">
    <div class="table-title">
      {{ t('wms.mapping.target', '出力先') }}
      <!-- order-to-sheet カスタム項目管理 -->
      <template v-if="configType === 'order-to-sheet'">
        <div class="custom-target-controls">
          <input
            v-model="localNewField"
            class="o-input"
            :placeholder="t('wms.mapping.newTargetFieldName', '新しい出力項目名')"
            style="width: 160px; margin-left: 16px"
            @keyup.enter="handleAddCustomField"
          />
          <OButton variant="primary" @click="handleAddCustomField" :disabled="!localNewField.trim()">
            {{ t('wms.mapping.add', '追加') }}
          </OButton>
          <OButton
            variant="danger"
            @click="$emit('remove-custom-field')"
            :disabled="!selectedTarget || !isCustomTargetField(selectedTarget.field)"
          >
            {{ t('wms.mapping.removeSelectedField', '選択項目を削除') }}
          </OButton>
        </div>
      </template>
    </div>
    <div class="target-table-wrap" style="height: 520px; overflow-y: auto;">
      <table class="o-list-table target-table">
        <thead>
          <tr>
            <th style="width: 70px">{{ t('wms.mapping.required', '必須') }}</th>
            <th style="min-width: 220px">{{ t('wms.mapping.fieldName', '項目名') }}</th>
            <th style="min-width: 240px">{{ t('wms.mapping.mappingContent', '紐付け内容') }}</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="row in targetRows" :key="row.field">
            <tr
              :class="{ 'row-selected': selectedTarget?.field === row.field }"
              @click="$emit('select-target', row)"
              style="cursor: pointer"
            >
              <td>
                <span class="o-badge" :class="row.required ? 'o-badge-danger' : 'o-badge-info'">
                  {{ row.required ? t('wms.mapping.requiredBadge', '必須') : t('wms.mapping.optionalBadge', '任意') }}
                </span>
              </td>
              <td>
                <div
                  :class="{ 'product-child-item': row.field?.startsWith('products.0') }"
                  style="display: flex; align-items: center; gap: 4px"
                >
                  <span>{{ row.label || row.field }}</span>
                  <span v-if="row.isExpandable" class="o-badge o-badge-info" style="margin-left: 4px">{{ t('wms.mapping.expandOnly', '展開のみ') }}</span>
                  <span
                    v-if="getFieldHint(row.field)"
                    :title="getFieldHint(row.field) ?? ''"
                    style="color: #909399; cursor: help; font-size: 14px"
                  >&#9432;</span>
                </div>
              </td>
              <td>
                <!-- 商品の子項目マッピング表示 -->
                <template v-if="row.isExpandable && row.field === 'products' && row.children">
                  <div v-for="child in row.children" :key="child.field" style="margin-bottom: 4px">
                    <span class="pipeline-chip" v-if="mappings[child.field]" style="display: inline-block; font-size: 11px">
                      {{ child.label }}: {{ summaryForMapping(mappings[child.field]) }}
                    </span>
                    <span class="pipeline-chip empty" v-else style="display: inline-block; font-size: 11px">
                      {{ child.label }}: {{ t('wms.mapping.notSet', '未設定') }}
                    </span>
                  </div>
                </template>
                <template v-else>
                  <span class="pipeline-chip" v-if="mappings[row.field]">
                    {{ summaryForMapping(mappings[row.field]) }}
                  </span>
                  <span class="pipeline-chip empty" v-else>{{ t('wms.mapping.notSet', '未設定') }}</span>
                </template>
              </td>
            </tr>
            <!-- Render children rows for tree-like products -->
            <template v-if="row.isExpandable && row.children">
              <tr
                v-for="child in row.children"
                :key="child.field"
                :class="{ 'row-selected': selectedTarget?.field === child.field }"
                @click="$emit('select-target', child)"
                style="cursor: pointer; background-color: #f9fafc"
              >
                <td>
                  <span class="o-badge" :class="child.required ? 'o-badge-danger' : 'o-badge-info'">
                    {{ child.required ? t('wms.mapping.requiredBadge', '必須') : t('wms.mapping.optionalBadge', '任意') }}
                  </span>
                </td>
                <td>
                  <div class="product-child-item" style="display: flex; align-items: center; gap: 4px">
                    <span>{{ child.label || child.field }}</span>
                  </div>
                </td>
                <td>
                  <span class="pipeline-chip" v-if="mappings[child.field]">
                    {{ summaryForMapping(mappings[child.field]) }}
                  </span>
                  <span class="pipeline-chip empty" v-else>{{ t('wms.mapping.notSet', '未設定') }}</span>
                </td>
              </tr>
            </template>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import OButton from '@/components/odoo/OButton.vue'
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()

interface TargetRow {
  field: string
  required: boolean
  label?: string
  children?: TargetRow[]
  isExpandable?: boolean
}

const props = defineProps<{
  targetRows: TargetRow[]
  selectedTarget: TargetRow | null
  mappings: Record<string, any>
  configType: string
  customTargetFields: string[]
  summaryForMapping: (mapping?: any) => string
  getFieldHint: (field: string) => string | null
}>()

const emit = defineEmits<{
  'select-target': [row: TargetRow]
  'add-custom-field': [fieldName: string]
  'remove-custom-field': []
}>()

const localNewField = ref('')

function handleAddCustomField() {
  const fieldName = localNewField.value.trim()
  if (!fieldName) return
  emit('add-custom-field', fieldName)
  localNewField.value = ''
}

function isCustomTargetField(field: string): boolean {
  return props.customTargetFields.includes(field)
}
</script>

<style scoped>
.table-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  padding: 10px;
  display: flex;
  flex-direction: column;
}
.table-title {
  font-weight: 600;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.custom-target-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
/* .o-list-table base styles are defined globally in style.css */
.row-selected {
  background: #ecf5ff !important;
}
.pipeline-chip {
  padding: 4px 8px;
  background: #f5f7fa;
  border-radius: 6px;
  font-size: 12px;
}
.pipeline-chip.empty {
  color: #999;
}
.product-child-item {
  padding-left: 20px;
  position: relative;
}
.product-child-item::before {
  content: '\2514';
  position: absolute;
  left: 8px;
  color: #c0c4cc;
  font-weight: normal;
}
.o-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
}
.o-badge-danger {
  background: #fef0f0;
  color: #f56c6c;
}
.o-badge-info {
  background: #f4f4f5;
  color: #909399;
}
.o-input {
  padding: 6px 10px;
  border: 1px solid var(--o-border-color, #dee2e6);
  border-radius: 4px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s;
}
.o-input:focus { border-color: var(--o-primary, #714B67); }
</style>
