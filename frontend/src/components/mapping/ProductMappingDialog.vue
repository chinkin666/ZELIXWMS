<template>
  <el-dialog v-model="visibleProxy" width="600px" title="商品マスタ設定" destroy-on-close>
    <el-form label-width="140px">
      <el-form-item label="SKU列">
        <el-select v-model="form.skuColumn" filterable placeholder="SKU列を選択" style="width: 100%">
          <el-option v-for="col in availableColumns" :key="col" :label="col" :value="col" />
        </el-select>
      </el-form-item>

      <el-form-item label="数量列">
        <el-select v-model="form.quantityColumn" filterable placeholder="数量列を選択" style="width: 100%">
          <el-option v-for="col in availableColumns" :key="col" :label="col" :value="col" />
        </el-select>
      </el-form-item>

      <el-form-item label="商品名列">
        <el-select v-model="form.nameColumn" filterable placeholder="商品名列を選択" style="width: 100%">
          <el-option v-for="col in availableColumns" :key="col" :label="col" :value="col" />
        </el-select>
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
      console.error('Preview error:', e)
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

.preview-content {
  color: #606266;
}

.preview-placeholder {
  color: #909399;
  font-style: italic;
}
</style>

