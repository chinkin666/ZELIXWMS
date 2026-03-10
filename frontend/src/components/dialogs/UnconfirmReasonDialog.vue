<template>
  <el-dialog
    v-model="visible"
    title="確認取消"
    width="500px"
    :close-on-click-modal="false"
  >
    <div class="dialog-content">
      <!-- 订单信息 -->
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

      <!-- 模板选择区域 -->
      <div class="template-section">
        <div class="template-header">
          <span class="template-label">テンプレート:</span>
        </div>
        <div class="template-tags">
          <el-tag
            v-for="(template, index) in templates"
            :key="index"
            class="template-tag"
            :closable="true"
            @click="applyTemplate(template)"
            @close="removeTemplate(index)"
          >
            {{ template }}
          </el-tag>
          <el-input
            v-if="showAddInput"
            ref="addInputRef"
            v-model="newTemplate"
            class="add-input"
            size="small"
            placeholder="テンプレート名"
            @keyup.enter="confirmAddTemplate"
            @blur="confirmAddTemplate"
          />
          <el-button
            v-else
            class="add-btn"
            size="small"
            :icon="Plus"
            circle
            @click="showAddInput = true"
          />
        </div>
      </div>

      <!-- 理由输入 -->
      <div class="reason-section">
        <el-input
          v-model="reason"
          type="textarea"
          :rows="3"
          placeholder="取消理由を入力してください（空欄可、入力すると内部データとして記録されます）"
        />
      </div>
    </div>

    <template #footer>
      <el-button @click="handleCancel">キャンセル</el-button>
      <el-button type="warning" :loading="loading" @click="handleConfirm">
        確認取消
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue'
import { Plus } from '@element-plus/icons-vue'

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
const addInputRef = ref<any>(null)

// 从 localStorage 加载模板
const loadTemplates = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      templates.value = JSON.parse(stored)
    } else {
      // 首次使用，设置默认模板
      templates.value = [...DEFAULT_TEMPLATES]
      saveTemplates()
    }
  } catch (e) {
    templates.value = [...DEFAULT_TEMPLATES]
  }
}

// 保存模板到 localStorage
const saveTemplates = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates.value))
  } catch (e) {
    console.error('Failed to save templates:', e)
  }
}

// 应用模板
const applyTemplate = (template: string) => {
  reason.value = template
}

// 删除模板
const removeTemplate = (index: number) => {
  templates.value.splice(index, 1)
  saveTemplates()
}

// 确认添加模板
const confirmAddTemplate = () => {
  const trimmed = newTemplate.value.trim()
  if (trimmed && !templates.value.includes(trimmed)) {
    templates.value.push(trimmed)
    saveTemplates()
  }
  newTemplate.value = ''
  showAddInput.value = false
}

// 监听 showAddInput，自动聚焦
watch(showAddInput, async (val) => {
  if (val) {
    await nextTick()
    addInputRef.value?.focus()
  }
})

// 同步 visible
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
  cursor: pointer;
  transition: all 0.2s;
}

.template-tag:hover {
  background-color: #ecf5ff;
  border-color: #409eff;
  color: #409eff;
}

.add-input {
  width: 150px;
}

.add-btn {
  padding: 4px;
}

.reason-section {
  margin-top: 8px;
}
</style>
