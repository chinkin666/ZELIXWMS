<template>
  <div class="order-group-tabs" v-if="enabledGroups.length > 0">
    <el-tabs v-model="activeTab" @tab-change="handleTabChange">
      <!-- 全て -->
      <el-tab-pane name="">
        <template #label>
          <span class="tab-label">
            全て
            <el-badge
              v-if="counts"
              :value="counts.total"
              :max="99999"
              class="tab-badge"
            />
          </span>
        </template>
      </el-tab-pane>

      <!-- 各グループ -->
      <el-tab-pane
        v-for="group in enabledGroups"
        :key="group._id"
        :name="group.orderGroupId"
      >
        <template #label>
          <span class="tab-label">
            {{ group.name }}
            <el-badge
              v-if="counts"
              :value="counts.groups[group.orderGroupId] || 0"
              :max="99999"
              class="tab-badge"
            />
          </span>
        </template>
      </el-tab-pane>

      <!-- その他（未分類） -->
      <el-tab-pane :name="UNCATEGORIZED_VALUE">
        <template #label>
          <span class="tab-label">
            その他
            <el-badge
              v-if="counts"
              :value="counts.uncategorized"
              :max="99999"
              class="tab-badge"
            />
          </span>
        </template>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { fetchOrderGroups, fetchOrderGroupCounts } from '@/api/orderGroup'
import type { OrderGroupCounts } from '@/api/orderGroup'
import { UNCATEGORIZED_VALUE } from '@/types/orderGroup'
import type { OrderGroup } from '@/types/orderGroup'
import { ElMessage } from 'element-plus'

const props = withDefaults(
  defineProps<{
    modelValue?: string
  }>(),
  {
    modelValue: '',
  }
)

const emits = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
  (e: 'groups-loaded', groups: OrderGroup[]): void
}>()

const groups = ref<OrderGroup[]>([])
const counts = ref<OrderGroupCounts | null>(null)
const activeTab = ref<string>(props.modelValue || '')

const enabledGroups = computed(() => groups.value.filter(g => g.enabled))

const loadGroups = async () => {
  try {
    groups.value = await fetchOrderGroups()
    emits('groups-loaded', groups.value)
  } catch (e) {
    console.error(e)
    ElMessage.warning('検品グループの取得に失敗しました')
  }
}

const loadCounts = async () => {
  try {
    counts.value = await fetchOrderGroupCounts()
  } catch (e) {
    console.error(e)
  }
}

const handleTabChange = (name: string | number) => {
  const value = String(name)
  emits('update:modelValue', value)
  emits('change', value)
}

watch(
  () => props.modelValue,
  (newValue) => {
    activeTab.value = newValue || ''
  },
  { immediate: true }
)

onMounted(async () => {
  await loadGroups()
  await loadCounts()
})

defineExpose({
  groups,
  reload: loadGroups,
  reloadCounts: loadCounts,
})
</script>

<style scoped>
.order-group-tabs {
  margin-bottom: 0;
}

.order-group-tabs :deep(.el-tabs__header) {
  margin-bottom: 0;
}

.order-group-tabs :deep(.el-tabs__nav-wrap::after) {
  height: 1px;
  background-color: #e4e7ed;
}

.order-group-tabs :deep(.el-tabs__item) {
  height: 38px;
  line-height: 38px;
  font-size: 13px;
  padding: 0 16px;
  color: #606266;
}

.order-group-tabs :deep(.el-tabs__item.is-active) {
  color: #2a3474;
  font-weight: 600;
}

.order-group-tabs :deep(.el-tabs__active-bar) {
  background-color: #2a3474;
}

.order-group-tabs :deep(.el-tabs__item:hover) {
  color: #2a3474;
}

.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  position: relative;
}

.tab-badge {
  position: relative;
  top: -1px;
}

.tab-badge :deep(.el-badge__content) {
  font-size: 11px;
  height: 18px;
  line-height: 18px;
  padding: 0 5px;
  border: none;
  background-color: #2a3474;
}

.tab-badge :deep(.el-badge__content.is-fixed) {
  position: relative;
  top: auto;
  right: auto;
  transform: none;
}
</style>
