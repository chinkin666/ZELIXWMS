<template>
  <ODialog
    :open="visible"
    title="確認取消"
    @close="handleCancel"
    width="500px"
  >
    <div class="dialog-content">
      <div class="order-info">
        <p>注文番号: <strong>{{ orderNumber }}</strong></p>
        <p>確認を取り消し、未確認状態に戻します。</p>
        <p v-if="showB2Warning" class="warning-text">
          B2 Cloud連携を使用している場合、B2 Cloudからも削除されます。
        </p>
        <p v-if="showManualCarrierWarning" class="error-text">
          手動連携の注文です。運送会社のシステムから手動で注文を削除してください。
        </p>
      </div>

      <div class="template-section">
        <div class="template-header">
          <span class="template-label">テンプレート:</span>
        </div>
        <div class="template-tags">
          <span
            v-for="(template, index) in templates"
            :key="index"
            class="template-tag"
            @click="applyTemplate(template)"
          >
            {{ template }}
            <span class="template-tag-close" @click.stop="removeTemplate(index)">✕</span>
          </span>
          <input
            v-if="showAddInput"
            ref="addInputRef"
            class="o-input add-input"
            v-model="newTemplate"
            placeholder="テンプレート名"
            @keyup.enter="confirmAddTemplate"
            @blur="confirmAddTemplate"
          />
          <OButton
            v-else
            variant="secondary"
            size="sm"
            class="add-btn"
            @click="showAddInput = true"
          >
            +
          </OButton>
        </div>
      </div>

      <div class="reason-section">
        <textarea
          class="o-input"
          v-model="reason"
          rows="3"
          placeholder="取消理由を入力してください（空欄可、入力すると内部データとして記録されます）"
        ></textarea>
      </div>
    </div>

    <template #footer>
      <OButton variant="secondary" @click="handleCancel">キャンセル</OButton>
      <OButton variant="primary" :disabled="loading" @click="handleConfirm">
        {{ loading ? '処理中...' : '確認取消' }}
      </OButton>
    </template>
  </ODialog>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue'
import ODialog from '@/components/odoo/ODialog.vue'
import OButton from '@/components/odoo/OButton.vue'

const STORAGE_KEY = 'unconfirmReasonTemplates'
const DEFAULT_TEMPLATES = ['送り状種類修正必要']

const props = defineProps<{
  modelValue: boolean
  orderNumber: string
  showB2Warning?: boolean
  showManualCarrierWarning?: boolean
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', reason: string): void
  (e: 'cancel'): void
}>()

const visible = ref(props.modelValue)
const reason = ref('')
const templates = ref<string[]>([])
const showAddInput = ref(false)
const newTemplate = ref('')
const addInputRef = ref<HTMLInputElement | null>(null)

const loadTemplates = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      templates.value = JSON.parse(stored)
    } else {
      templates.value = [...DEFAULT_TEMPLATES]
      saveTemplates()
    }
  } catch (_e) {
    templates.value = [...DEFAULT_TEMPLATES]
  }
}

const saveTemplates = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates.value))
  } catch (e) {
    console.error('Failed to save templates:', e)
  }
}

const applyTemplate = (template: string) => {
  reason.value = template
}

const removeTemplate = (index: number) => {
  templates.value.splice(index, 1)
  saveTemplates()
}

const confirmAddTemplate = () => {
  const trimmed = newTemplate.value.trim()
  if (trimmed && !templates.value.includes(trimmed)) {
    templates.value.push(trimmed)
    saveTemplates()
  }
  newTemplate.value = ''
  showAddInput.value = false
}

watch(showAddInput, async (val) => {
  if (val) {
    await nextTick()
    addInputRef.value?.focus()
  }
})

watch(
  () => props.modelValue,
  (val) => {
    visible.value = val
    if (val) {
      reason.value = ''
    }
  },
)

watch(visible, (val) => {
  emit('update:modelValue', val)
})

const handleConfirm = () => {
  emit('confirm', reason.value.trim())
}

const handleCancel = () => {
  visible.value = false
  emit('cancel')
}

onMounted(() => {
  loadTemplates()
})
</script>

<style scoped>
.dialog-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.order-info {
  padding: 12px;
  background: #f5f7fa;
  border-radius: 4px;
}

.order-info p {
  margin: 4px 0;
  font-size: 14px;
  color: #606266;
}

.warning-text {
  color: #e6a23c !important;
  font-size: 13px !important;
}

.error-text {
  color: #f56c6c !important;
  font-size: 13px !important;
  font-weight: 500;
}

.template-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.template-header {
  display: flex;
  align-items: center;
}

.template-label {
  font-size: 13px;
  font-weight: 500;
  color: #606266;
}

.template-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.template-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid #d9ecff;
  border-radius: 4px;
  background: #ecf5ff;
  color: #409eff;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.template-tag:hover {
  background-color: #d9ecff;
  border-color: #409eff;
}

.template-tag-close {
  font-size: 11px;
  cursor: pointer;
  margin-left: 2px;
}

.add-input {
  width: 150px;
}

.add-btn {
  padding: 4px 8px;
}

.reason-section {
  margin-top: 8px;
}
</style>
