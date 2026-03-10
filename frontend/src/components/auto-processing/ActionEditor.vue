<template>
  <div class="action-editor">
    <div v-for="(action, index) in modelValue" :key="index" class="action-row">
      <el-select
        :model-value="action.type"
        @update:model-value="handleTypeChange(index, $event as ActionType)"
        placeholder="動作タイプ"
        style="width: 180px"
      >
        <el-option
          v-for="(label, key) in ACTION_TYPE_LABELS"
          :key="key"
          :label="label"
          :value="key"
        />
      </el-select>

      <!-- addProduct -->
      <template v-if="action.type === 'addProduct'">
        <el-input
          :model-value="action.productSku"
          @update:model-value="updateAction(index, { ...action, productSku: $event })"
          placeholder="SKU"
          style="width: 200px"
        />
        <el-input-number
          :model-value="action.quantity ?? 1"
          @update:model-value="updateAction(index, { ...action, quantity: $event })"
          :min="1"
          controls-position="right"
          style="width: 120px"
        />
      </template>

      <!-- setOrderGroup -->
      <template v-if="action.type === 'setOrderGroup'">
        <el-select
          :model-value="action.orderGroupId"
          @update:model-value="updateAction(index, { ...action, orderGroupId: $event })"
          placeholder="グループを選択"
          filterable
          style="width: 240px"
        >
          <el-option
            v-for="g in orderGroups"
            :key="g.orderGroupId"
            :label="g.name"
            :value="g.orderGroupId"
          />
        </el-select>
      </template>

      <el-button
        type="danger"
        :icon="Delete"
        circle
        size="small"
        @click="removeAction(index)"
      />
    </div>

    <el-button :icon="Plus" @click="addAction" size="small">
      動作を追加
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Plus, Delete } from '@element-plus/icons-vue'
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
