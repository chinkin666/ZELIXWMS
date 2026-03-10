<template>
  <el-dialog v-model="visibleProxy" width="500px" title="配列要素を取得" destroy-on-close>
    <el-form label-width="140px">
      <el-form-item label="配列インデックス">
        <el-input-number
          v-model="form.index"
          :min="0"
          :max="100"
          placeholder="取得する配列のインデックス（0から開始）"
          style="width: 100%"
        />
        <div class="hint">handlingTags 配列の指定されたインデックスの値を取得します</div>
      </el-form-item>

      <el-form-item label="プレビュー">
        <div class="preview-box">
          <div v-if="previewValue !== null" class="preview-content">
            {{ previewValue }}
          </div>
          <div v-else class="preview-placeholder">（インデックスを入力するとプレビューが表示されます）</div>
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
  target: { field: string; required: boolean } | null
  sampleRow?: Record<string, any> | null
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
  index: 0,
})

const previewValue = ref<string | null>(null)

// 构建 mapping 并预览
const buildMapping = (): TransformMapping | null => {
  if (!props.target) return null

  return {
    targetField: props.target.field,
    inputs: [
      {
        id: 'handling-tags-input',
        type: 'column',
        column: 'handlingTags',
        pipeline: undefined,
      },
    ],
    combine: {
      plugin: 'combine.first',
      params: {},
    },
    outputPipeline: {
      steps: [
        {
          id: 'array-index',
          plugin: 'array.index',
          params: {
            index: form.value.index,
          },
          enabled: true,
        },
      ],
    },
    required: props.target.required,
    defaultValue: undefined,
  }
}

// 预览
watch(
  () => [form.value.index, props.sampleRow],
  async () => {
    const mapping = buildMapping()
    if (!mapping || !props.sampleRow) {
      previewValue.value = null
      return
    }

    try {
      const result = await runTransformMapping(mapping, props.sampleRow)
      previewValue.value = result !== undefined && result !== null ? String(result) : '（結果なし）'
    } catch (e) {
      previewValue.value = `（エラー: ${e instanceof Error ? e.message : String(e)}）`
    }
  },
  { immediate: true },
)

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
.hint {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
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

