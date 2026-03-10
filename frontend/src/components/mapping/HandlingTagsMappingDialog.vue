<template>
  <el-dialog v-model="visibleProxy" width="600px" title="荷扱いタグレイアウト設定" destroy-on-close>
    <el-form label-width="140px">
      <el-form-item label="対象列">
        <div class="columns-list">
          <div v-for="(col, idx) in form.columns" :key="idx" class="column-item">
            <el-select
              v-model="form.columns[idx]"
              filterable
              placeholder="列を選択"
              style="width: 100%"
              clearable
            >
              <el-option v-for="c in availableColumns" :key="c" :label="c" :value="c" />
            </el-select>
            <el-button
              v-if="form.columns.length > 1"
              type="danger"
              size="small"
              text
              @click="removeColumn(idx)"
              style="margin-left: 8px"
            >
              削除
            </el-button>
          </div>
          <el-button type="primary" plain size="small" @click="addColumn" style="margin-top: 8px">
            + 列を追加
          </el-button>
        </div>
      </el-form-item>

      <el-form-item label="プレビュー">
        <div class="preview-box">
          <div v-if="previewValue" class="preview-content">
            {{ previewValue }}
          </div>
          <div v-else class="preview-placeholder">（列を選択するとプレビューが表示されます）</div>
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visibleProxy = false">キャンセル</el-button>
      <el-button type="primary" @click="handleSubmit">適用</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, watch, ref } from 'vue'
import type { TransformMapping } from '@/api/mappingConfig'
import { runTransformMapping } from '@/utils/transformRunner'

interface Props {
  modelValue: boolean
  availableColumns: string[]
  sampleRow?: Record<string, any> | null
  targetField: string
}

const props = defineProps<Props>()

const emits = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'submit', mapping: TransformMapping): void
}>()

const visibleProxy = computed({
  get: () => props.modelValue,
  set: (v) => emits('update:modelValue', v),
})

const form = ref({
  columns: [''] as string[],
})

const previewValue = ref<string>('')

// 构建 mapping 并预览
const buildMapping = (): TransformMapping | null => {
  const validColumns = form.value.columns.filter((c) => c && c.trim() !== '')
  if (validColumns.length === 0) {
    return null
  }

  // 为每个列创建一个 input
  const inputs = validColumns.map((col, idx) => ({
    id: `tag-input-${idx}`,
    type: 'column' as const,
    column: col,
    pipeline: undefined,
  }))

  return {
    targetField: props.targetField,
    inputs,
    combine: {
      plugin: 'combine.array',
      params: {},
    },
    outputPipeline: undefined,
    required: false,
    defaultValue: undefined,
  }
}

// 预览
watch(
  () => [form.value.columns, props.sampleRow],
  async () => {
    const mapping = buildMapping()
    if (!mapping || !props.sampleRow) {
      previewValue.value = ''
      return
    }

    try {
      const result = await runTransformMapping(mapping, props.sampleRow)
      if (Array.isArray(result)) {
        previewValue.value = result.filter((v) => v !== undefined && v !== null && String(v).trim() !== '').join(', ')
      } else if (result !== undefined && result !== null) {
        previewValue.value = String(result)
      } else {
        previewValue.value = '（結果なし）'
      }
    } catch (e) {
      previewValue.value = `（エラー: ${e instanceof Error ? e.message : String(e)}）`
    }
  },
  { immediate: true, deep: true },
)

const addColumn = () => {
  form.value.columns.push('')
}

const removeColumn = (idx: number) => {
  form.value.columns.splice(idx, 1)
}

const handleSubmit = () => {
  const mapping = buildMapping()
  if (!mapping) {
    return
  }
  emits('submit', mapping)
  visibleProxy.value = false
}
</script>

<style scoped>
.columns-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.column-item {
  display: flex;
  align-items: center;
}

.preview-box {
  min-height: 40px;
  padding: 8px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background-color: #f5f7fa;
}

.preview-content {
  color: #606266;
}

.preview-placeholder {
  color: #909399;
  font-style: italic;
}
</style>

