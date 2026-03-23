<template>
  <div class="carrier-selector-wrapper">
    <div class="carrier-selector-label">配送業者：</div>
    <div class="carrier-selector-group">
      <label
        v-for="carrier in carriers"
        :key="String(carrier._id)"
        class="carrier-option"
      >
        <label class="o-checkbox">
          <Input
            type="checkbox"
            :checked="selectedCarrierId === String(carrier._id)"
            @change="() => handleCarrierClick(carrier._id)"
          />
          <span class="carrier-option-label">{{ carrier.name }} ({{ carrier.code }})</span>
        </label>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Input } from '@/components/ui/input'
import { ref, onMounted, watch } from 'vue'
import { fetchCarriers } from '@/api/carrier'
import type { Carrier } from '@/types/carrier'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    enabled?: boolean | undefined
  }>(),
  {
    modelValue: '',
    enabled: undefined, // undefined means get all carriers, true means get only enabled ones
  }
)

const emits = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
  (e: 'carriers-loaded', carriers: Carrier[]): void
}>()

const carriers = ref<Carrier[]>([])
const selectedCarrierId = ref<string>(props.modelValue || '')

const loadCarriers = async () => {
  try {
    // Only pass enabled parameter when it's explicitly true (to filter enabled carriers)
    // When undefined, don't pass the parameter to get all carriers
    // fetchCarriers 已经自动包含内置配送業者
    const params = props.enabled === true ? { enabled: true } : undefined
    carriers.value = await fetchCarriers(params)
    emits('carriers-loaded', carriers.value)
    // 不自动选择第一个配送業者，让用户手动选择（不选择时不过滤）
  } catch (e) {
    // 配送業者マスタ取得失敗 / Failed to fetch carriers
  }
}

const handleCarrierClick = (carrierId: string | undefined) => {
  if (!carrierId) return
  const id = String(carrierId)
  // 单选：如果点击的是已选中的，则取消选择；否则选中新的
  if (selectedCarrierId.value === id) {
    selectedCarrierId.value = ''
  } else {
    selectedCarrierId.value = id
  }
  emits('update:modelValue', selectedCarrierId.value)
  emits('change', selectedCarrierId.value)
}

watch(
  () => props.modelValue,
  (newValue) => {
    selectedCarrierId.value = newValue || ''
  },
  { immediate: true }
)

onMounted(() => {
  loadCarriers()
})

// Expose carriers for parent component access if needed
defineExpose({
  carriers,
})
</script>

<style scoped>
.carrier-selector-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 12px;
  background: white;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  min-height: 30px;
}

.carrier-selector-label {
  font-size: 12px;
  color: #303133;
  flex-shrink: 0;
  line-height: 24px;
}

.carrier-selector-group {
  display: flex;
  flex: 1;
  gap: 16px;
  flex-wrap: wrap;
  align-items: center;
}

.carrier-option {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  user-select: none;
}

.o-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  cursor: pointer;
  font-size: var(--o-font-size-base, 14px);
}

.o-checkbox input {
  accent-color: var(--o-brand-primary, #714b67);
  width: 14px;
  height: 14px;
}

.carrier-option-label {
  font-size: 12px;
  color: #303133;
  line-height: 24px;
}
</style>
