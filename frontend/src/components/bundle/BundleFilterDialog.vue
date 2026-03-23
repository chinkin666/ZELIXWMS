<template>
  <Dialog :open="dialogVisible" @update:open="dialogVisible = $event">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>同梱設定</DialogTitle>
      </DialogHeader>
    <div class="bundle-filter">
      <div class="bundle-filter__actions">
        <label class="o-checkbox">
          <input
            type="checkbox"
            :checked="isAllChecked"
            :indeterminate="isIndeterminate"
            @change="handleToggleAll(($event.target as HTMLInputElement).checked)"
          />
          <span>すべて選択</span>
        </label>
        <div class="bundle-filter__actions-right">
          <span class="bundle-filter__count">
            選択中 {{ innerSelected.length }} / {{ fields.length }}
          </span>
          <Button variant="secondary" size="sm" @click="handleClear">クリア</Button>
        </div>
      </div>

      <div class="bundle-filter__list">
        <div
          v-for="field in fields"
          :key="field.key"
          class="bundle-filter__item"
        >
          <label class="o-checkbox">
            <input
              type="checkbox"
              :value="field.key"
              v-model="innerSelected"
            />
            <div>
              <div class="bundle-filter__label">
                {{ field.title }}
              </div>
              <div v-if="field.description" class="bundle-filter__desc">
                {{ field.description }}
              </div>
            </div>
          </label>
        </div>
      </div>
    </div>

    <DialogFooter>
      <Button variant="secondary" @click="handleCancel">キャンセル</Button>
      <Button variant="default" @click="handleSave">保存</Button>
    </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export interface BundleFieldOption {
  key: string
  title: string
  description?: string
}

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    fields: BundleFieldOption[]
    selectedKeys?: string[]
  }>(),
  {
    modelValue: false,
    fields: () => [],
    selectedKeys: () => [],
  },
)

const emits = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'update:selectedKeys', value: string[]): void
  (e: 'save', value: string[]): void
}>()

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emits('update:modelValue', val),
})

const innerSelected = ref<string[]>([...props.selectedKeys])

watch(
  () => props.selectedKeys,
  (val) => {
    innerSelected.value = Array.isArray(val) ? [...val] : []
  },
)

const isAllChecked = computed(() => {
  if (!props.fields.length) return false
  return innerSelected.value.length === props.fields.length
})

const isIndeterminate = computed(() => {
  if (!props.fields.length) return false
  const len = innerSelected.value.length
  return len > 0 && len < props.fields.length
})

const handleToggleAll = (checked: boolean) => {
  if (checked) {
    innerSelected.value = props.fields.map((f) => f.key)
  } else {
    innerSelected.value = []
  }
}

const handleClear = () => {
  innerSelected.value = []
}

const handleCancel = () => {
  dialogVisible.value = false
}

const handleSave = () => {
  const result = [...innerSelected.value]
  emits('update:selectedKeys', result)
  emits('save', result)
  dialogVisible.value = false
}
</script>

<style scoped>
.bundle-filter {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bundle-filter__actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 4px 0;
}

.bundle-filter__actions-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.bundle-filter__count {
  color: #606266;
  font-size: 13px;
}

.bundle-filter__list {
  max-height: 420px;
  overflow: auto;
  padding: 4px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
}

.bundle-filter__item {
  padding: 10px 8px;
  border-bottom: 1px solid #f2f3f5;
}

.bundle-filter__item:last-child {
  border-bottom: none;
}

.bundle-filter__label {
  font-weight: 600;
  color: #303133;
}

.bundle-filter__desc {
  color: #909399;
  font-size: 13px;
  margin-top: 4px;
  line-height: 1.4;
}

.o-checkbox { display:inline-flex; align-items:flex-start; gap:6px; cursor:pointer; font-size:14px; }
</style>
