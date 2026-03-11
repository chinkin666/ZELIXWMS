<template>
  <ODialog :open="visibleProxy" title="荷扱いタグレイアウト設定" @close="visibleProxy = false" width="600px">
    <div class="o-form-group">
      <label class="o-form-label">対象列</label>
      <div class="columns-list">
        <div v-for="(col, idx) in form.columns" :key="idx" class="column-item">
          <select class="o-input" v-model="form.columns[idx]" style="width: 100%">
            <option value="" disabled>列を選択</option>
            <option v-for="c in availableColumns" :key="c" :value="c">{{ c }}</option>
          </select>
          <button v-if="form.columns.length > 1" class="o-btn o-btn-danger o-btn-sm" @click="removeColumn(idx)" style="margin-left: 8px">削除</button>
        </div>
        <button class="o-btn o-btn-primary o-btn-sm" @click="addColumn" style="margin-top: 8px">+ 列を追加</button>
      </div>
    </div>

    <div class="o-form-group">
      <label class="o-form-label">プレビュー</label>
      <div class="preview-box">
        <div v-if="previewValue" class="preview-content">{{ previewValue }}</div>
        <div v-else class="preview-placeholder">（列を選択するとプレビューが表示されます）</div>
      </div>
    </div>

    <template #footer>
      <button class="o-btn o-btn-secondary" @click="visibleProxy = false">キャンセル</button>
      <button class="o-btn o-btn-primary" @click="handleSubmit">適用</button>
    </template>
  </ODialog>
</template>

<script setup lang="ts">
import { computed, watch, ref } from 'vue'
import ODialog from '@/components/odoo/ODialog.vue'
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

const form = ref({ columns: [''] as string[] })
const previewValue = ref<string>('')

const buildMapping = (): TransformMapping | null => {
  const validColumns = form.value.columns.filter((c) => c && c.trim() !== '')
  if (validColumns.length === 0) return null
  const inputs = validColumns.map((col, idx) => ({ id: `tag-input-${idx}`, type: 'column' as const, column: col, pipeline: undefined }))
  return { targetField: props.targetField, inputs, combine: { plugin: 'combine.array', params: {} }, outputPipeline: undefined, required: false, defaultValue: undefined }
}

watch(
  () => [form.value.columns, props.sampleRow],
  async () => {
    const mapping = buildMapping()
    if (!mapping || !props.sampleRow) { previewValue.value = ''; return }
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

const addColumn = () => { form.value.columns.push('') }
const removeColumn = (idx: number) => { form.value.columns.splice(idx, 1) }

const handleSubmit = () => {
  const mapping = buildMapping()
  if (!mapping) return
  emits('submit', mapping)
  visibleProxy.value = false
}
</script>

<style scoped>
.columns-list { display: flex; flex-direction: column; gap: 8px; }
.column-item { display: flex; align-items: center; }
.preview-box { min-height: 40px; padding: 8px; border: 1px solid #dcdfe6; border-radius: 4px; background-color: #f5f7fa; }
.preview-content { color: #606266; }
.preview-placeholder { color: #909399; font-style: italic; }
.o-form-group { margin-bottom:1rem; }
.o-form-label { display:block; font-size:13px; font-weight:500; color:#374151; margin-bottom:0.25rem; }
</style>
