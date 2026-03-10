<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="600px"
    :close-on-click-modal="false"
  >
    <div class="form-export-dialog">
      <div class="info-section">
        <div class="info-item">
          <span class="info-label">選択件数：</span>
          <strong>{{ selectedCount }}</strong> 件
        </div>
        <div class="info-item">
          <span class="info-label">帳票種類：</span>
          <strong>{{ currentTypeLabel }}</strong>
        </div>
      </div>

      <el-form label-width="140px" label-position="left">
        <el-form-item label="テンプレート">
          <el-select
            v-model="selectedTemplateId"
            placeholder="テンプレートを選択"
            style="width: 100%"
            :disabled="templatesForType.length === 0"
          >
            <el-option
              v-for="t in templatesForType"
              :key="t._id"
              :label="t.name"
              :value="t._id"
            >
              <div style="display: flex; align-items: center; gap: 8px;">
                <span>{{ t.name }}</span>
                <el-tag v-if="t.isDefault" type="success" size="small">デフォルト</el-tag>
              </div>
            </el-option>
          </el-select>
          <div v-if="templatesForType.length === 0" class="no-template-hint">
            <el-icon><Warning /></el-icon>
            この種類のテンプレートがありません。
            <router-link to="/settings/form-templates">設定画面</router-link>で作成してください。
          </div>
        </el-form-item>
      </el-form>

      <div v-if="selectedTemplate" class="template-info">
        <div class="template-info-title">テンプレート設定</div>
        <div class="template-info-grid">
          <div class="template-info-item">
            <span class="label">用紙:</span>
            <span>{{ selectedTemplate.pageSize }} {{ selectedTemplate.pageOrientation === 'portrait' ? '縦' : '横' }}</span>
          </div>
          <div class="template-info-item">
            <span class="label">出力列:</span>
            <span>{{ enabledColumnCount }} 列</span>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="visible = false">キャンセル</el-button>
        <el-button
          :loading="printing"
          :disabled="!canGenerate"
          @click="handlePrint"
        >
          印刷
        </el-button>
        <el-button
          type="primary"
          :loading="generating"
          :disabled="!canGenerate"
          @click="handleGenerate"
        >
          PDF出力
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Warning } from '@element-plus/icons-vue'
import type { FormTemplate } from '@/types/formTemplate'
import type { OrderDocument } from '@/types/order'
import type { Carrier } from '@/types/carrier'
import type { Product } from '@/types/product'
import { fetchFormTemplates } from '@/api/formTemplate'
import { formTypeRegistry } from '@/utils/form-export/formFieldRegistry'
import { generateFormPdf } from '@/utils/form-export/pdfGenerator'
import { printPdfBlob } from '@/utils/print/printImage'
import {
  formatPickingListData,
  formatShipmentDetailData,
  type FormatterContext,
} from '@/utils/form-export/formDataFormatter'

const props = defineProps<{
  modelValue: boolean
  targetType: 'shipment-list-picking' | 'shipment-detail-list'
  selectedOrders: OrderDocument[]
  carriers: Carrier[]
  products: Product[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const selectedTemplateId = ref('')
const templates = ref<FormTemplate[]>([])
const generating = ref(false)
const printing = ref(false)

const selectedCount = computed(() => props.selectedOrders.length)

// ダイアログタイトル
const dialogTitle = computed(() => {
  const typeDef = formTypeRegistry.find((t) => t.type === props.targetType)
  return typeDef ? `${typeDef.label}出力` : '帳票出力'
})

// 現在のタイプ名
const currentTypeLabel = computed(() => {
  const typeDef = formTypeRegistry.find((t) => t.type === props.targetType)
  return typeDef?.label || props.targetType
})

// 指定されたタイプのテンプレートのみ
const templatesForType = computed(() => {
  return templates.value.filter((t) => t.targetType === props.targetType)
})

const selectedTemplate = computed(() => {
  if (!selectedTemplateId.value) return null
  return templates.value.find((t) => t._id === selectedTemplateId.value)
})

const enabledColumnCount = computed(() => {
  if (!selectedTemplate.value) return 0
  // 新しい設計では enabled フィールドは使用しない（列の数をそのまま返す）
  return selectedTemplate.value.columns.length
})

const canGenerate = computed(() => {
  return selectedTemplateId.value && props.selectedOrders.length > 0
})

async function loadTemplates() {
  try {
    templates.value = await fetchFormTemplates()
  } catch (e: any) {
    console.error('Failed to load form templates:', e)
  }
}

// ダイアログが開かれたときにデフォルトテンプレートを選択
watch(visible, (isVisible) => {
  if (isVisible) {
    selectDefaultTemplate()
  }
})

// targetType が変更されたときもデフォルトテンプレートを選択
watch(() => props.targetType, () => {
  if (visible.value) {
    selectDefaultTemplate()
  }
})

function selectDefaultTemplate() {
  const defaultTemplate = templatesForType.value.find((t) => t.isDefault)
  if (defaultTemplate) {
    selectedTemplateId.value = defaultTemplate._id
  } else if (templatesForType.value.length > 0) {
    const first = templatesForType.value[0]
    selectedTemplateId.value = first ? first._id : ''
  } else {
    selectedTemplateId.value = ''
  }
}

async function handleGenerate() {
  if (!selectedTemplate.value || props.selectedOrders.length === 0) return

  generating.value = true
  try {
    const context: FormatterContext = {
      carriers: props.carriers,
      products: props.products,
    }

    let data: Record<string, any>[]

    if (props.targetType === 'shipment-list-picking') {
      // ピッキングリスト：商品を集計
      data = formatPickingListData(props.selectedOrders, context)
    } else {
      // 出荷明細リスト：注文詳細
      data = formatShipmentDetailData(props.selectedOrders, context)
    }

    if (data.length === 0) {
      ElMessage.warning('出力するデータがありません')
      return
    }

    // PDF を生成してダウンロード
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const filename = `${selectedTemplate.value.name}_${timestamp}.pdf`

    await generateFormPdf(selectedTemplate.value, data, {
      preview: true, // 新しいタブで開く
      filename,
    })

    ElMessage.success('PDFを生成しました')
  } catch (e: any) {
    console.error('PDF generation failed:', e)
    ElMessage.error(e?.message || 'PDF生成に失敗しました')
  } finally {
    generating.value = false
  }
}

async function handlePrint() {
  if (!selectedTemplate.value || props.selectedOrders.length === 0) return

  printing.value = true
  try {
    const context: FormatterContext = {
      carriers: props.carriers,
      products: props.products,
    }

    let data: Record<string, any>[]

    if (props.targetType === 'shipment-list-picking') {
      data = formatPickingListData(props.selectedOrders, context)
    } else {
      data = formatShipmentDetailData(props.selectedOrders, context)
    }

    if (data.length === 0) {
      ElMessage.warning('印刷するデータがありません')
      return
    }

    const blob = await generateFormPdf(selectedTemplate.value, data, {
      returnBlob: true,
    })

    if (blob) {
      await printPdfBlob(blob, {
        templateId: selectedTemplate.value._id,
        templateType: 'form',
      })
      ElMessage.success('印刷ジョブを送信しました')
    }
  } catch (e: any) {
    console.error('Print failed:', e)
    ElMessage.error(e?.message || '印刷に失敗しました')
  } finally {
    printing.value = false
  }
}

onMounted(() => {
  loadTemplates()
})
</script>

<style scoped>
.form-export-dialog {
  padding: 8px 0;
}

.info-section {
  display: flex;
  gap: 24px;
  margin-bottom: 20px;
  padding: 12px 16px;
  background: #f5f7fa;
  border-radius: 6px;
}

.info-item {
  font-size: 14px;
  color: #606266;
}

.info-label {
  color: #909399;
}

.no-template-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  font-size: 12px;
  color: #e6a23c;
}

.no-template-hint a {
  color: #409eff;
}

.template-info {
  margin-top: 16px;
  padding: 12px 16px;
  background: #fafafa;
  border: 1px solid #ebeef5;
  border-radius: 6px;
}

.template-info-title {
  font-size: 12px;
  font-weight: 600;
  color: #909399;
  margin-bottom: 8px;
}

.template-info-grid {
  display: flex;
  gap: 24px;
}

.template-info-item {
  font-size: 13px;
  color: #606266;
}

.template-info-item .label {
  color: #909399;
  margin-right: 4px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
