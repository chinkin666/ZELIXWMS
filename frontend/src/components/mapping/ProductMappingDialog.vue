<template>
  <Dialog :open="visibleProxy" @update:open="visibleProxy = $event">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>商品マスタ設定</DialogTitle>
      </DialogHeader>
    <div class="o-form-group">
      <label class="o-form-label">SKU列</label>
      <Select v-model="form.skuColumn">
        <SelectTrigger class="h-9 w-full"><SelectValue placeholder="SKU列を選択" /></SelectTrigger>
        <SelectContent>
          <SelectItem v-for="col in availableColumns" :key="col" :value="col">{{ col }}</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div class="o-form-group">
      <label class="o-form-label">数量列</label>
      <Select v-model="form.quantityColumn">
        <SelectTrigger class="h-9 w-full"><SelectValue placeholder="数量列を選択" /></SelectTrigger>
        <SelectContent>
          <SelectItem v-for="col in availableColumns" :key="col" :value="col">{{ col }}</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div class="o-form-group">
      <label class="o-form-label">商品名列</label>
      <Select v-model="form.nameColumn">
        <SelectTrigger class="h-9 w-full"><SelectValue placeholder="商品名列を選択" /></SelectTrigger>
        <SelectContent>
          <SelectItem v-for="col in availableColumns" :key="col" :value="col">{{ col }}</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div class="o-form-group">
      <label class="o-form-label">プレビュー</label>
      <div class="preview-box">
        <div v-if="previewValue" class="preview-content">
          {{ previewValue }}
        </div>
        <div v-else class="preview-placeholder">（列を選択するとプレビューが表示されます）</div>
      </div>
    </div>

    <DialogFooter>
      <Button variant="secondary" @click="visibleProxy = false">キャンセル</Button>
      <Button variant="default" @click="handleSubmit">適用</Button>
    </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, watch, ref } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  skuColumn: '',
  quantityColumn: '',
  nameColumn: '',
})

const previewValue = ref<string>('')

// 构建 mapping 并预览
const buildMapping = (): TransformMapping | null => {
  if (!form.value.skuColumn || !form.value.quantityColumn || !form.value.nameColumn) {
    return null
  }

  return {
    targetField: props.targetField,
    inputs: [
      {
        id: 'sku-input',
        type: 'column',
        column: form.value.skuColumn,
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
          id: 'product-from-columns',
          plugin: 'product.fromColumns',
          params: {
            skuColumn: form.value.skuColumn,
            quantityColumn: form.value.quantityColumn,
            nameColumn: form.value.nameColumn,
          },
          enabled: true,
        },
      ],
    },
    required: false,
    defaultValue: undefined,
  }
}

// 预览
watch(
  () => [form.value.skuColumn, form.value.quantityColumn, form.value.nameColumn, props.sampleRow],
  async () => {
    const mapping = buildMapping()
    if (!mapping || !props.sampleRow) {
      previewValue.value = ''
      return
    }

    try {
      const result = await runTransformMapping(mapping, props.sampleRow)
      if (Array.isArray(result) && result.length > 0) {
        const product = result[0]
        if (product && typeof product === 'object') {
          const quantity = product.quantity || 1
          const name = product.name || product.sku || ''
          previewValue.value = quantity === 1 ? name : `${name} x ${quantity}`
        } else {
          previewValue.value = `（結果: ${JSON.stringify(result)}）`
        }
      } else if (result !== undefined && result !== null) {
        previewValue.value = `（結果: ${JSON.stringify(result)}）`
      } else {
        previewValue.value = '（結果なし）'
      }
    } catch (e) {
      // プレビューエラー / Preview error
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
.preview-box {
  min-height: 40px;
  padding: 8px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background-color: #f5f7fa;
}
.preview-content { color: #606266; }
.preview-placeholder { color: #909399; font-style: italic; }
.o-form-group { margin-bottom:1rem; }
.o-form-label { display:block; font-size:13px; font-weight:500; color:#374151; margin-bottom:0.25rem; }
</style>
