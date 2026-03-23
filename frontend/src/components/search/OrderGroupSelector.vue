<template>
  <div class="order-group-tabs" v-if="enabledGroups.length > 0">
    <div class="o-tabs">
      <!-- 全て -->
      <Button
        class="o-tab"
        :class="{ active: activeTab === '' }"
        @click="handleTabChange('')"
      >
        <span class="tab-label">
          全て
          <span v-if="counts" class="tab-badge">{{ counts.total }}</span>
        </span>
      </button>

      <!-- 各グループ -->
      <Button
        v-for="group in enabledGroups"
        :key="group._id"
        class="o-tab"
        :class="{ active: activeTab === group.orderGroupId }"
        @click="handleTabChange(group.orderGroupId)"
      >
        <span class="tab-label">
          {{ group.name }}
          <span v-if="counts" class="tab-badge">{{ counts.groups[group.orderGroupId] || 0 }}</span>
        </span>
      </button>

      <!-- その他（未分類） -->
      <Button
        class="o-tab"
        :class="{ active: activeTab === UNCATEGORIZED_VALUE }"
        @click="handleTabChange(UNCATEGORIZED_VALUE)"
      >
        <span class="tab-label">
          その他
          <span v-if="counts" class="tab-badge">{{ counts.uncategorized }}</span>
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { ref, onMounted, watch, computed } from 'vue'
import { fetchOrderGroups, fetchOrderGroupCounts } from '@/api/orderGroup'
import type { OrderGroupCounts } from '@/api/orderGroup'
import { UNCATEGORIZED_VALUE } from '@/types/orderGroup'
import type { OrderGroup } from '@/types/orderGroup'

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
    // 出荷グループ取得失敗 / Failed to fetch order groups
  }
}

const loadCounts = async () => {
  try {
    counts.value = await fetchOrderGroupCounts()
  } catch (e) {
    // グループカウント取得失敗 / Failed to fetch group counts
  }
}

const handleTabChange = (name: string) => {
  activeTab.value = name
  emits('update:modelValue', name)
  emits('change', name)
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

.o-tabs {
  display: flex;
  border-bottom: 2px solid var(--o-border-color, #e4e7ed);
  margin-bottom: 0;
}

.o-tab {
  padding: 0 16px;
  height: 38px;
  line-height: 38px;
  border: none;
  background: none;
  font-size: 13px;
  color: #606266;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: color 0.2s, border-color 0.2s;
}

.o-tab.active {
  color: #2a3474;
  border-bottom-color: #2a3474;
  font-weight: 600;
}

.o-tab:hover {
  color: #2a3474;
}

.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  position: relative;
}

.tab-badge {
  font-size: 11px;
  height: 18px;
  line-height: 18px;
  padding: 0 5px;
  background-color: #2a3474;
  color: #fff;
  border-radius: 9px;
  display: inline-block;
  min-width: 18px;
  text-align: center;
}
</style>
