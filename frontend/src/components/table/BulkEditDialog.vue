<template>
  <Dialog :open="visible" @update:open="visible = $event"><DialogContent class="sm:max-w-lg"><DialogHeader><DialogTitle>{{ title }}</DialogTitle></DialogHeader>
    <div class="bulk-edit__meta">
      <div>選択中件数：<strong>{{ selectedCount }}</strong></div>
    </div>

    <div class="o-form-group">
      <label class="o-form-label">対象列</label>
      <select
       
        v-model="selectedColumnKey"
        style="width: 100%"
      >
        <option value="" disabled>列を選択</option>
        <option
          v-for="col in columns"
          :key="String(col.key)"
          :value="String(col.key)"
        >{{ col.title ?? String(col.key) }}</option>
      </select>
    </div>

    <div class="o-form-group">
      <label class="o-form-label">設定値</label>
      <select
        v-if="valueInputKind === 'select'"
       
        v-model="value"
        style="width: 100%"
      >
        <option value="" disabled>値を選択</option>
        <option
          v-for="opt in options"
          :key="String(opt.value)"
          :value="opt.value"
        >{{ opt.label }}</option>
      </select>

      <Input
        v-else-if="valueInputKind === 'number'"
        type="number"
       
        v-model.number="value"
        style="width: 100%"
        :min="selectedColumn?.min"
        :max="selectedColumn?.max"
        placeholder="数値を入力"
      />

      <Input
        v-else-if="valueInputKind === 'date'"
        :type="selectedColumn?.fieldType === 'dateOnly' ? 'date' : 'datetime-local'"
       
        v-model="value"
        style="width: 100%"
      />

      <select
        v-else-if="valueInputKind === 'boolean'"
       
        v-model="value"
        style="width: 100%"
      >
        <option value="" disabled>はい/いいえ</option>
        <option :value="true">はい</option>
        <option :value="false">いいえ</option>
      </select>

      <Input
        v-else
       
        v-model="value"
        placeholder="文字列を入力"
        style="width: 100%"
      />
    </div>

    <div class="o-form-group">
      <label class="o-form-label">既存値</label>
      <label class="o-toggle">
        <input type="checkbox" v-model="overwrite" />
        <span class="o-toggle-slider"></span>
      </label>
      <span style="margin-left: 8px; font-size: 13px; color: #606266">{{ overwrite ? '上書き' : '保持' }}</span>
    </div>

    <DialogFooter>
      <div class="bulk-edit__footer">
        <Button variant="secondary" @click="visible = false">キャンセル</Button>
        <Button variant="default" :disabled="!selectedColumn" @click="confirm">確定</Button>
      </div>
    </DialogFooter>
  </DialogContent></Dialog>
</template>

<script setup lang="ts">
import { Input } from '@/components/ui/input'
import { computed, ref, watch } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

type AnyColumn = Record<string, any>

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title?: string
    columns: AnyColumn[]
    selectedCount: number
  }>(),
  {
    title: '一括修正',
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', payload: { columnKey: string; dataKey: string; fieldType?: string; value: any; overwrite: boolean }): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const selectedColumnKey = ref<string>('')
const overwrite = ref(false)
const value = ref<any>('')

const selectedColumn = computed<AnyColumn | null>(() => {
  const key = selectedColumnKey.value
  if (!key) return null
  return props.columns.find((c) => String(c.key) === key) ?? null
})

const options = computed<Array<{ label: string; value: any }>>(() => {
  const col = selectedColumn.value
  const opts = col?.searchOptions ?? col?.options
  return Array.isArray(opts) ? opts : []
})

const valueInputKind = computed<'select' | 'number' | 'date' | 'boolean' | 'text'>(() => {
  const col = selectedColumn.value
  if (!col) return 'text'
  if (options.value.length > 0) return 'select'
  const ft = col.fieldType
  if (ft === 'number') return 'number'
  if (ft === 'date' || ft === 'dateOnly') return 'date'
  if (ft === 'boolean') return 'boolean'
  return 'text'
})

const resetValueForColumn = (col: AnyColumn | null) => {
  if (!col) {
    value.value = ''
    overwrite.value = false
    return
  }
  if (col.fieldType === 'number' || col.fieldType === 'boolean') {
    value.value = undefined
  } else {
    value.value = ''
  }
  overwrite.value = false
}

watch(
  () => selectedColumn.value,
  (col) => resetValueForColumn(col),
)

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      resetValueForColumn(selectedColumn.value)
    }
  },
)

const confirm = () => {
  const col = selectedColumn.value
  if (!col) {
    alert('対象列を選択してください')
    return
  }
  const dataKey = typeof col.dataKey === 'string' ? col.dataKey : typeof col.key === 'string' ? col.key : ''
  if (!dataKey) {
    alert('列の dataKey が無効です')
    return
  }
  emit('confirm', {
    columnKey: String(col.key),
    dataKey,
    fieldType: typeof col.fieldType === 'string' ? col.fieldType : undefined,
    value: value.value,
    overwrite: overwrite.value,
  })
  visible.value = false
}
</script>

<style scoped>
.bulk-edit__meta {
  margin-bottom: 12px;
  color: #606266;
  font-size: 13px;
  display: flex;
  justify-content: space-between;
}
.bulk-edit__footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.o-form-group { margin-bottom:1rem; }
.o-form-label { display:block; font-size:13px; font-weight:500; color:#374151; margin-bottom:0.25rem; }
.o-toggle { position:relative; display:inline-block; width:40px; height:20px; cursor:pointer; }
.o-toggle input { opacity:0; width:0; height:0; }
.o-toggle-slider { position:absolute; inset:0; background:#ccc; border-radius:20px; transition:background .2s; }
.o-toggle-slider::before { content:''; position:absolute; left:2px; top:2px; width:16px; height:16px; background:#fff; border-radius:50%; transition:transform .2s; }
.o-toggle input:checked + .o-toggle-slider { background:#714b67; }
.o-toggle input:checked + .o-toggle-slider::before { transform:translateX(20px); }
</style>
