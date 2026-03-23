<template>
  <section class="search-form">
    <div class="search-fields">
      <template v-for="field in searchFields" :key="field.key">
        <!-- テキスト検索 -->
        <div v-if="field.type === 'string'" class="search-field">
          <label class="search-field__label">{{ field.label }}</label>
          <Input
            class="o-input -sm"
            v-model="fieldValues[field.key]"
            :placeholder="field.label"
            @keyup.enter="doSearch"
          />
        </div>

        <!-- 数値検索 -->
        <div v-else-if="field.type === 'number'" class="search-field">
          <label class="search-field__label">{{ field.label }}</label>
          <Input
            type="number"
            class="o-input -sm"
            v-model.number="fieldValues[field.key]"
            :placeholder="field.label"
            @keyup.enter="doSearch"
          />
        </div>

        <!-- セレクト検索 -->
        <div v-else-if="field.type === 'select'" class="search-field">
          <label class="search-field__label">{{ field.label }}</label>
          <Select :model-value="fieldValues[field.key] || '__all__'" @update:model-value="(val: string) => fieldValues[field.key] = val === '__all__' ? '' : val">
            <SelectTrigger class="h-7 -sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{{ t('wms.search.all') }}</SelectItem>
              <SelectItem
                v-for="opt in field.options"
                :key="opt.value"
                :value="String(opt.value)"
              >{{ opt.label }}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- ブール検索 -->
        <div v-else-if="field.type === 'boolean'" class="search-field">
          <label class="search-field__label">{{ field.label }}</label>
          <Select :model-value="fieldValues[field.key] === true ? 'true' : fieldValues[field.key] === false ? 'false' : '__all__'" @update:model-value="(val: string) => fieldValues[field.key] = val === '__all__' ? '' : val === 'true'">
            <SelectTrigger class="h-7 -sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{{ t('wms.search.all') }}</SelectItem>
              <SelectItem value="true">{{ t('wms.search.yes') }}</SelectItem>
              <SelectItem value="false">{{ t('wms.search.no') }}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- 日付検索 -->
        <div v-else-if="field.type === 'date'" class="search-field">
          <label class="search-field__label">{{ field.label }}</label>
          <Input
            type="date"
            class="o-input -sm"
            v-model="fieldValues[field.key]"
            @keyup.enter="doSearch"
          />
        </div>

        <!-- 日付範囲検索 -->
        <div v-else-if="field.type === 'daterange'" class="search-field search-field--daterange">
          <label class="search-field__label">{{ field.label }}</label>
          <div class="daterange-inputs">
            <Input
              type="date"
              class="o-input -sm"
              v-model="fieldValues[field.key + '__from']"
              @keyup.enter="doSearch"
            />
            <span class="daterange-sep">〜</span>
            <Input
              type="date"
              class="o-input -sm"
              v-model="fieldValues[field.key + '__to']"
              @keyup.enter="doSearch"
            />
          </div>
        </div>
      </template>

      <div class="search-actions">
        <Button class="o-btn o-btn-primary o-btn-sm" @click="doSearch">{{ t('wms.search.search') }}</Button>
        <Button class="o-btn o-btn-secondary o-btn-sm" @click="doReset">{{ t('wms.search.clear') }}</Button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ref, computed, onMounted } from 'vue'
import { useI18n } from '@/composables/useI18n'
import type { TableColumn, Operator } from '@/types/table'

const { t } = useI18n()

interface SearchField {
  key: string
  label: string
  type: 'string' | 'number' | 'select' | 'boolean' | 'date' | 'daterange'
  options?: Array<{ label: string; value: any }>
}

const props = withDefaults(
  defineProps<{
    columns: TableColumn[]
    showSave?: boolean
    initialValues?: Record<string, any>
    storageKey?: string
    showGlobalSearch?: boolean
  }>(),
  {
    showSave: true,
    initialValues: () => ({}),
    storageKey: 'search_form_default',
    showGlobalSearch: true,
  },
)

const emits = defineEmits<{
  (e: 'search', payload: Record<string, { operator: Operator; value: any }>): void
  (e: 'save', payload: Record<string, { operator: Operator; value: any }>): void
}>()

const searchFields = computed<SearchField[]>(() => {
  return props.columns
    .filter((col) => col.searchable || col.searchType)
    .map((col) => {
      const type = col.searchType || col.fieldType || 'string'
      return {
        key: col.key,
        label: col.title || col.key,
        type: type as SearchField['type'],
        options: col.searchOptions,
      }
    })
})

const fieldValues = ref<Record<string, any>>({})

const initValues = () => {
  const vals: Record<string, any> = {}
  for (const field of searchFields.value) {
    if (field.type === 'daterange') {
      vals[field.key + '__from'] = props.initialValues[field.key + '__from'] ?? ''
      vals[field.key + '__to'] = props.initialValues[field.key + '__to'] ?? ''
    } else if (field.type === 'boolean') {
      vals[field.key] = props.initialValues[field.key] ?? ''
    } else {
      vals[field.key] = props.initialValues[field.key] ?? ''
    }
  }
  fieldValues.value = vals
}

onMounted(() => {
  initValues()
})

const buildPayload = (): Record<string, { operator: Operator; value: any }> => {
  const payload: Record<string, { operator: Operator; value: any }> = {}

  // グローバル検索テキスト（全フィールドの値を結合）
  const globalParts: string[] = []

  for (const field of searchFields.value) {
    if (field.type === 'daterange') {
      const from = fieldValues.value[field.key + '__from']
      const to = fieldValues.value[field.key + '__to']
      if (from || to) {
        payload[field.key] = {
          operator: 'between' as Operator,
          value: [from || '', to || ''],
        }
      }
    } else if (field.type === 'boolean') {
      const val = fieldValues.value[field.key]
      if (val !== '' && val !== undefined && val !== null) {
        payload[field.key] = {
          operator: 'is' as Operator,
          value: val === true || val === 'true',
        }
      }
    } else if (field.type === 'select') {
      const val = fieldValues.value[field.key]
      if (val !== '' && val !== undefined && val !== null) {
        payload[field.key] = {
          operator: 'is' as Operator,
          value: val,
        }
      }
    } else if (field.type === 'number') {
      const val = fieldValues.value[field.key]
      if (val !== '' && val !== undefined && val !== null) {
        payload[field.key] = {
          operator: '=' as Operator,
          value: Number(val),
        }
      }
    } else if (field.type === 'date') {
      const val = fieldValues.value[field.key]
      if (val) {
        payload[field.key] = {
          operator: '=' as Operator,
          value: val,
        }
      }
    } else {
      // string
      const val = fieldValues.value[field.key]
      if (val && String(val).trim()) {
        const trimmed = String(val).trim()
        payload[field.key] = {
          operator: 'contains' as Operator,
          value: trimmed,
        }
        globalParts.push(trimmed)
      }
    }
  }

  // Table コンポーネントの globalSearchText 用
  if (globalParts.length > 0) {
    payload.__global = {
      operator: 'contains' as Operator,
      value: globalParts.join(' '),
    }
  }

  return payload
}

const doSearch = () => {
  emits('search', buildPayload())
}

const doReset = () => {
  initValues()
  emits('search', {})
}

const addFilter = (fieldKey: string, value: any, _operator?: Operator): boolean => {
  const field = searchFields.value.find((f) => f.key === fieldKey)
  if (!field) return false
  fieldValues.value[fieldKey] = value
  doSearch()
  return true
}

defineExpose({
  addFilter,
})
</script>

<style scoped>
.search-form {
  padding: 8px 0;
}

.search-fields {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 10px;
}

.search-field {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.search-field__label {
  font-size: 12px;
  font-weight: 500;
  color: var(--o-gray-600, #7A706A);
  white-space: nowrap;
}

.search-field 
.search-field 
.search-field--daterange .daterange-inputs {
  display: flex;
  align-items: center;
  gap: 4px;
}

.search-field--daterange 
.daterange-sep {
  color: var(--o-gray-500, #A69B91);
  font-size: 12px;
}

.search-actions {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  padding-bottom: 1px;
}

.o-btn-sm {
  height: 28px;
  padding: 0 12px;
  font-size: 13px;
  border: 1px solid transparent;
  cursor: pointer;
  white-space: nowrap;
}

.o-btn-primary {
  background: var(--o-brand-primary, #0052A3);
  color: white;
  border-color: var(--o-brand-primary, #0052A3);
}

.o-btn-primary:hover {
  opacity: 0.9;
}

.o-btn-secondary {
  background: white;
  color: var(--o-gray-700, #4A433D);
  border-color: var(--o-border-color, #E2DBD5);
}

.o-btn-secondary:hover {
  background: var(--o-gray-100, #FAF7F5);
}
</style>
