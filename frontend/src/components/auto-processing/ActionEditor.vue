<template>
  <div class="action-editor">
    <div v-for="(action, index) in modelValue" :key="index" class="action-row">
      <select
        class="o-input"
        :value="action.type"
        @change="handleTypeChange(index, ($event.target as HTMLSelectElement).value as ActionType)"
        style="width: 180px"
      >
        <option value="" disabled>動作タイプ</option>
        <option
          v-for="(label, key) in ACTION_TYPE_LABELS"
          :key="key"
          :value="key"
        >
          {{ label }}
        </option>
      </select>

      <!-- addProduct -->
      <template v-if="action.type === 'addProduct'">
        <input
          class="o-input"
          :value="action.productSku"
          @input="updateAction(index, { ...action, productSku: ($event.target as HTMLInputElement).value })"
          placeholder="SKU"
          style="width: 200px"
        />
        <input
          type="number"
          class="o-input"
          :value="action.quantity ?? 1"
          min="1"
          @input="updateAction(index, { ...action, quantity: Number(($event.target as HTMLInputElement).value) })"
          style="width: 120px"
        />
      </template>

      <!-- setOrderGroup -->
      <template v-if="action.type === 'setOrderGroup'">
        <select
          class="o-input"
          :value="action.orderGroupId"
          @change="updateAction(index, { ...action, orderGroupId: ($event.target as HTMLSelectElement).value })"
          style="width: 240px"
        >
          <option value="" disabled>グループを選択</option>
          <option
            v-for="g in orderGroups"
            :key="g.orderGroupId"
            :value="g.orderGroupId"
          >
            {{ g.name }}
          </option>
        </select>
      </template>

      <Button variant="destructive" size="sm" @click="removeAction(index)" title="削除">✕</Button>
    </div>

    <Button variant="secondary" size="sm" @click="addAction">+ 動作を追加</Button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Button } from '@/components/ui/button'
import type { AutoProcessingAction, ActionType } from '@/types/autoProcessingRule'
import { ACTION_TYPE_LABELS } from '@/types/autoProcessingRule'
import { fetchOrderGroups } from '@/api/orderGroup'
import type { OrderGroup } from '@/types/orderGroup'

const props = defineProps<{
  modelValue: AutoProcessingAction[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: AutoProcessingAction[]): void
}>()

const orderGroups = ref<OrderGroup[]>([])

const updateAction = (index: number, action: AutoProcessingAction) => {
  const updated = [...props.modelValue]
  updated[index] = action
  emit('update:modelValue', updated)
}

const handleTypeChange = (index: number, type: ActionType) => {
  const action: AutoProcessingAction = { type }
  if (type === 'addProduct') {
    action.quantity = 1
  }
  updateAction(index, action)
}

const addAction = () => {
  emit('update:modelValue', [
    ...props.modelValue,
    { type: 'addProduct' as ActionType, quantity: 1 },
  ])
}

const removeAction = (index: number) => {
  const updated = props.modelValue.filter((_, i) => i !== index)
  emit('update:modelValue', updated)
}

onMounted(async () => {
  orderGroups.value = await fetchOrderGroups().catch(() => [])
})
</script>

<style scoped>
.action-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.action-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
