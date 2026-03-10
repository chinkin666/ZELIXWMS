<template>
  <el-dialog
    v-model="visible"
    :title="title"
    width="560px"
    :close-on-click-modal="false"
  >
    <div class="bulk-edit__meta">
      <div>選択中件数：<strong>{{ selectedCount }}</strong></div>
    </div>

    <el-form label-width="120px">
      <el-form-item label="対象列">
        <el-select
          v-model="selectedColumnKey"
          filterable
          clearable
          style="width: 100%"
          placeholder="列を選択"
        >
          <el-option
            v-for="col in columns"
            :key="String(col.key)"
            :label="col.title ?? String(col.key)"
            :value="String(col.key)"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="設定値" :disabled="!selectedColumn">
        <el-select
          v-if="valueInputKind === 'select'"
          v-model="value"
          filterable
          clearable
          style="width: 100%"
          placeholder="値を選択"
        >
          <el-option
            v-for="opt in options"
            :key="String(opt.value)"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>

        <el-input-number
          v-else-if="valueInputKind === 'number'"
          v-model="value"
          style="width: 100%"
          :min="selectedColumn?.min"
          :max="selectedColumn?.max"
          :precision="selectedColumn?.precision ?? 0"
          placeholder="数値を入力"
        />

        <el-date-picker
          v-else-if="valueInputKind === 'date'"
          v-model="value"
          :type="selectedColumn?.fieldType === 'dateOnly' ? 'date' : 'datetime'"
          style="width: 100%"
          :format="
            selectedColumn?.fieldType === 'dateOnly'
              ? (selectedColumn?.dateFormat || 'YYYY/MM/DD')
              : (selectedColumn?.dateFormat || 'YYYY-MM-DD HH:mm:ss')
          "
          :value-format="selectedColumn?.fieldType === 'dateOnly' ? 'YYYY/MM/DD' : 'YYYY-MM-DDTHH:mm:ss.SSS[Z]'"
          :placeholder="selectedColumn?.fieldType === 'dateOnly' ? '日付を選択' : '日時を選択'"
        />

        <el-select
          v-else-if="valueInputKind === 'boolean'"
          v-model="value"
          clearable
          style="width: 100%"
          placeholder="はい/いいえ"
        >
          <el-option label="はい" :value="true" />
          <el-option label="いいえ" :value="false" />
        </el-select>

        <el-input
          v-else
          v-model="value"
          clearable
          placeholder="文字列を入力"
        />
      </el-form-item>

      <el-form-item label="既存値">
        <el-switch
          v-model="overwrite"
          inline-prompt
          active-text="上書き"
          inactive-text="保持"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="bulk-edit__footer">
        <el-button @click="visible = false">キャンセル</el-button>
        <el-button type="primary" :disabled="!selectedColumn" @click="confirm">
          確定
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'

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
      // 保持上次选择的列，但重置值，避免误操作
      resetValueForColumn(selectedColumn.value)
    }
  },
)

const confirm = () => {
  const col = selectedColumn.value
  if (!col) {
    ElMessage.warning('対象列を選択してください')
    return
  }
  const dataKey = typeof col.dataKey === 'string' ? col.dataKey : typeof col.key === 'string' ? col.key : ''
  if (!dataKey) {
    ElMessage.warning('列の dataKey が無効です')
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
</style>


