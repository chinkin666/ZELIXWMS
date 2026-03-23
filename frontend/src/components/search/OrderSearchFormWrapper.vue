<template>
  <component
    ref="searchFormRef"
    :is="searchFormComponent"
    :columns="columns"
    :show-save="showSave"
    :initial-values="initialValues"
    :storage-key="storageKey"
    :show-global-search="showGlobalSearch"
    :carrier-options="carrierOptions"
    @search="handleSearch"
    @save="handleSave"
  />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import type { TableColumn, Operator } from '@/types/table'

// 异步加载组件

interface Props {
  columns: TableColumn[]
  showSave?: boolean
  initialValues?: Record<string, any>
  storageKey?: string
  showGlobalSearch?: boolean
  carrierOptions?: Array<{ label: string; value: string }>
}

withDefaults(defineProps<Props>(), {
  showSave: true,
  initialValues: () => ({}),
  storageKey: 'order_search_form',
  showGlobalSearch: true,
  carrierOptions: () => [],
})

const emits = defineEmits<{
  (e: 'search', payload: Record<string, { operator: Operator; value: any }>): void
  (e: 'save', payload: Record<string, { operator: Operator; value: any }>): void
}>()

const settingsStore = useSettingsStore()

const searchFormComponent = computed(() => {
})

const handleSearch = (payload: Record<string, { operator: Operator; value: any }>) => {
  emits('search', payload)
}

const handleSave = (payload: Record<string, { operator: Operator; value: any }>) => {
  emits('save', payload)
}

// 子コンポーネントへの参照
const searchFormRef = ref<{ addFilter: (fieldKey: string, value: any, operator?: Operator) => boolean } | null>(null)

// 外部からフィルターを追加するメソッドを転送
const addFilter = (fieldKey: string, value: any, operator?: Operator) => {
  return searchFormRef.value?.addFilter(fieldKey, value, operator) ?? false
}

defineExpose({
  addFilter,
})
</script>
