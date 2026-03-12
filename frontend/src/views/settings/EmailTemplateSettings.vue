<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import OButton from '@/components/odoo/OButton.vue'
import ODialog from '@/components/odoo/ODialog.vue'
import { useToast } from '@/composables/useToast'
import {
  fetchEmailTemplates,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  previewEmailTemplate,
  type EmailTemplate,
} from '@/api/emailTemplate'
import { fetchCarriers } from '@/api/carrier'

const { showSuccess, showError } = useToast()

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const templates = ref<EmailTemplate[]>([])
const total = ref(0)
const isLoading = ref(false)

interface CarrierOption {
  readonly _id: string
  readonly name: string
}
const carriers = ref<CarrierOption[]>([])

// Form dialog
const showFormDialog = ref(false)
const isEditing = ref(false)
const isSaving = ref(false)

interface FormData {
  name: string
  carrierId: string
  carrierName: string
  senderName: string
  senderEmail: string
  replyToEmail: string
  subject: string
  bodyTemplate: string
  footerText: string
  isDefault: boolean
  isActive: boolean
}

const emptyForm: Readonly<FormData> = Object.freeze({
  name: '',
  carrierId: '',
  carrierName: '',
  senderName: '',
  senderEmail: '',
  replyToEmail: '',
  subject: '',
  bodyTemplate: '',
  footerText: '',
  isDefault: false,
  isActive: true,
})

const form = ref<FormData>({ ...emptyForm })
const editingId = ref<string | null>(null)

// Preview dialog
const showPreviewDialog = ref(false)
const previewHtml = ref('')
const isPreviewLoading = ref(false)

// Delete confirmation
const showDeleteDialog = ref(false)
const deletingTemplate = ref<EmailTemplate | null>(null)

// Available placeholders
const placeholders: readonly string[] = [
  '{{customerName}}',
  '{{orderNumber}}',
  '{{trackingNumber}}',
  '{{carrierName}}',
  '{{itemList}}',
  '{{shippingDate}}',
  '{{senderName}}',
]

const formTitle = computed(() => (isEditing.value ? 'メールテンプレート編集' : 'メールテンプレート作成'))

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------
async function loadTemplates(): Promise<void> {
  isLoading.value = true
  try {
    const result = await fetchEmailTemplates()
    templates.value = result.data
    total.value = result.total
  } catch (err: any) {
    showError(err.message || 'テンプレートの取得に失敗しました')
  } finally {
    isLoading.value = false
  }
}

async function loadCarriers(): Promise<void> {
  try {
    const data = await fetchCarriers()
    carriers.value = (Array.isArray(data) ? data : []).map((c: any) => ({
      _id: c._id,
      name: c.name,
    }))
  } catch {
    carriers.value = []
  }
}

onMounted(() => {
  loadTemplates()
  loadCarriers()
})

// ---------------------------------------------------------------------------
// Form actions
// ---------------------------------------------------------------------------
function openCreate(): void {
  form.value = { ...emptyForm }
  editingId.value = null
  isEditing.value = false
  showFormDialog.value = true
}

function openEdit(template: EmailTemplate): void {
  form.value = {
    name: template.name,
    carrierId: template.carrierId || '',
    carrierName: template.carrierName || '',
    senderName: template.senderName,
    senderEmail: template.senderEmail,
    replyToEmail: template.replyToEmail || '',
    subject: template.subject,
    bodyTemplate: template.bodyTemplate,
    footerText: template.footerText || '',
    isDefault: template.isDefault,
    isActive: template.isActive,
  }
  editingId.value = template._id
  isEditing.value = true
  showFormDialog.value = true
}

function onCarrierChange(): void {
  const found = carriers.value.find((c) => c._id === form.value.carrierId)
  form.value = {
    ...form.value,
    carrierName: found ? found.name : '',
  }
}

async function handleSave(): Promise<void> {
  if (!form.value.name.trim()) {
    showError('テンプレート名は必須です')
    return
  }
  if (!form.value.senderName.trim()) {
    showError('発送元名は必須です')
    return
  }
  if (!form.value.senderEmail.trim()) {
    showError('送信元メールアドレスは必須です')
    return
  }
  if (!form.value.subject.trim()) {
    showError('メールタイトルは必須です')
    return
  }
  if (!form.value.bodyTemplate.trim()) {
    showError('メール本文テンプレートは必須です')
    return
  }

  isSaving.value = true
  try {
    const payload = {
      ...form.value,
      carrierId: form.value.carrierId || null,
    }

    if (isEditing.value && editingId.value) {
      await updateEmailTemplate(editingId.value, payload)
      showSuccess('テンプレートを更新しました')
    } else {
      await createEmailTemplate(payload)
      showSuccess('テンプレートを作成しました')
    }
    showFormDialog.value = false
    await loadTemplates()
  } catch (err: any) {
    showError(err.message || '保存に失敗しました')
  } finally {
    isSaving.value = false
  }
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------
function confirmDelete(template: EmailTemplate): void {
  deletingTemplate.value = template
  showDeleteDialog.value = true
}

async function handleDelete(): Promise<void> {
  if (!deletingTemplate.value) return
  try {
    await deleteEmailTemplate(deletingTemplate.value._id)
    showSuccess('テンプレートを削除しました')
    showDeleteDialog.value = false
    deletingTemplate.value = null
    await loadTemplates()
  } catch (err: any) {
    showError(err.message || '削除に失敗しました')
  }
}

// ---------------------------------------------------------------------------
// Preview
// ---------------------------------------------------------------------------
async function handlePreview(template: EmailTemplate): Promise<void> {
  isPreviewLoading.value = true
  showPreviewDialog.value = true
  previewHtml.value = ''
  try {
    const result = await previewEmailTemplate(template._id)
    previewHtml.value = result.html
  } catch (err: any) {
    showError(err.message || 'プレビューの生成に失敗しました')
    showPreviewDialog.value = false
  } finally {
    isPreviewLoading.value = false
  }
}

// ---------------------------------------------------------------------------
// Toggle active
// ---------------------------------------------------------------------------
async function toggleActive(template: EmailTemplate): Promise<void> {
  try {
    await updateEmailTemplate(template._id, { isActive: !template.isActive })
    await loadTemplates()
  } catch (err: any) {
    showError(err.message || '更新に失敗しました')
  }
}
</script>

<template>
  <div class="email-template-settings">
    <ControlPanel title="出荷メール設定" :show-search="false">
      <template #actions>
        <OButton variant="primary" @click="openCreate">テンプレートを追加</OButton>
      </template>
    </ControlPanel>

    <!-- Template list -->
    <div class="o-list-view">
      <div v-if="isLoading" class="loading-state">読み込み中...</div>

      <div v-else-if="templates.length === 0" class="empty-state">
        <p>メールテンプレートがありません</p>
      </div>

      <table v-else class="o-list-table">
        <thead>
          <tr>
            <th>テンプレート名</th>
            <th>配送業者</th>
            <th>送信元</th>
            <th>メールタイトル</th>
            <th>デフォルト</th>
            <th>有効</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tpl in templates" :key="tpl._id">
            <td>{{ tpl.name }}</td>
            <td>{{ tpl.carrierName || '全配送業者' }}</td>
            <td>{{ tpl.senderEmail }}</td>
            <td class="subject-cell">{{ tpl.subject }}</td>
            <td>
              <span v-if="tpl.isDefault" class="o-badge o-badge-primary">デフォルト</span>
            </td>
            <td>
              <label class="o-toggle">
                <input
                  type="checkbox"
                  :checked="tpl.isActive"
                  @change="toggleActive(tpl)"
                />
                <span class="o-toggle-slider"></span>
              </label>
            </td>
            <td class="actions-cell">
              <OButton variant="secondary" size="sm" @click="handlePreview(tpl)">プレビュー</OButton>
              <OButton variant="primary" size="sm" @click="openEdit(tpl)">編集</OButton>
              <OButton variant="danger" size="sm" @click="confirmDelete(tpl)">削除</OButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Create/Edit Dialog -->
    <ODialog
      v-model="showFormDialog"
      :title="formTitle"
      size="xl"
      @close="showFormDialog = false"
      @confirm="handleSave"
    >
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">テンプレート名 <span class="required">*</span></label>
          <input v-model="form.name" type="text" class="form-input" placeholder="例: ヤマト運輸 出荷完了メール" />
        </div>

        <div class="form-group">
          <label class="form-label">配送業者</label>
          <select v-model="form.carrierId" class="form-input" @change="onCarrierChange">
            <option value="">全配送業者（共通）</option>
            <option v-for="c in carriers" :key="c._id" :value="c._id">{{ c.name }}</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">発送元名 <span class="required">*</span></label>
          <input v-model="form.senderName" type="text" class="form-input" placeholder="例: ZELIX倉庫" />
        </div>

        <div class="form-group">
          <label class="form-label">送信元メールアドレス <span class="required">*</span></label>
          <input v-model="form.senderEmail" type="email" class="form-input" placeholder="例: noreply@example.com" />
        </div>

        <div class="form-group">
          <label class="form-label">返信先メールアドレス</label>
          <input v-model="form.replyToEmail" type="email" class="form-input" placeholder="例: support@example.com" />
        </div>

        <div class="form-group full-width">
          <label class="form-label">メールタイトル <span class="required">*</span></label>
          <input v-model="form.subject" type="text" class="form-input" placeholder="例: 【{{senderName}}】ご注文 {{orderNumber}} を発送いたしました" />
        </div>

        <div class="form-group full-width body-section">
          <div class="body-layout">
            <div class="body-editor">
              <label class="form-label">メール本文テンプレート <span class="required">*</span></label>
              <textarea
                v-model="form.bodyTemplate"
                class="form-input form-textarea"
                rows="12"
                placeholder="{{customerName}} 様&#10;&#10;ご注文ありがとうございます。&#10;ご注文番号: {{orderNumber}}&#10;配送業者: {{carrierName}}&#10;追跡番号: {{trackingNumber}}&#10;出荷日: {{shippingDate}}&#10;&#10;■ 商品一覧&#10;{{itemList}}"
              ></textarea>
            </div>
            <div class="placeholder-list">
              <label class="form-label">利用可能なプレースホルダー</label>
              <ul class="placeholder-items">
                <li v-for="ph in placeholders" :key="ph" class="placeholder-item">
                  <code>{{ ph }}</code>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div class="form-group full-width">
          <label class="form-label">フッター</label>
          <textarea
            v-model="form.footerText"
            class="form-input form-textarea-sm"
            rows="3"
            placeholder="例: ※ このメールは自動送信です。ご返信いただいても対応できません。"
          ></textarea>
        </div>

        <div class="form-group checkbox-group">
          <label class="o-checkbox-label">
            <input v-model="form.isDefault" type="checkbox" />
            デフォルトテンプレートに設定
          </label>
        </div>

        <div class="form-group checkbox-group">
          <label class="o-checkbox-label">
            <input v-model="form.isActive" type="checkbox" />
            有効
          </label>
        </div>
      </div>

      <template #footer>
        <OButton variant="secondary" @click="showFormDialog = false">キャンセル</OButton>
        <OButton variant="primary" :disabled="isSaving" @click="handleSave">
          {{ isSaving ? '保存中...' : '保存' }}
        </OButton>
      </template>
    </ODialog>

    <!-- Preview Dialog -->
    <ODialog
      v-model="showPreviewDialog"
      title="メールプレビュー"
      size="lg"
      @close="showPreviewDialog = false"
    >
      <div v-if="isPreviewLoading" class="loading-state">プレビュー生成中...</div>
      <div v-else class="preview-content" v-html="previewHtml"></div>

      <template #footer>
        <OButton variant="secondary" @click="showPreviewDialog = false">閉じる</OButton>
      </template>
    </ODialog>

    <!-- Delete Confirmation Dialog -->
    <ODialog
      v-model="showDeleteDialog"
      title="テンプレート削除"
      size="sm"
      danger
      @close="showDeleteDialog = false"
      @confirm="handleDelete"
    >
      <p>テンプレート「{{ deletingTemplate?.name }}」を削除しますか？</p>
      <p style="color: var(--o-gray-500); font-size: 0.85em;">この操作は元に戻せません。</p>
    </ODialog>
  </div>
</template>

<style scoped>
@import '@/styles/order-table.css';

.email-template-settings {
  padding: 0;
}

.loading-state,
.empty-state {
  padding: 2rem;
  text-align: center;
  color: var(--o-gray-500);
}

.o-list-view {
  padding: 0 1rem 1rem;
}

.o-list-table {
  width: 100%;
  border-collapse: collapse;
}

.o-list-table th,
.o-list-table td {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--o-border-color, #dee2e6);
  text-align: left;
  font-size: var(--o-font-size-small, 0.8125rem);
}

.o-list-table th {
  font-weight: 600;
  color: var(--o-gray-600, #6c757d);
  background: var(--o-gray-50, #f8f9fa);
}

.subject-cell {
  max-width: 250px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.actions-cell {
  white-space: nowrap;
  display: flex;
  gap: 0.25rem;
}

/* Badge */
.o-badge {
  display: inline-block;
  padding: 0.15em 0.5em;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 3px;
}
.o-badge-primary {
  background: var(--o-brand-primary, #714b67);
  color: #fff;
}

/* Toggle */
.o-toggle {
  position: relative;
  display: inline-block;
  width: 36px;
  height: 20px;
}
.o-toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}
.o-toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--o-gray-300, #ccc);
  border-radius: 20px;
  transition: 0.2s;
}
.o-toggle-slider::before {
  content: '';
  position: absolute;
  height: 14px;
  width: 14px;
  left: 3px;
  bottom: 3px;
  background: #fff;
  border-radius: 50%;
  transition: 0.2s;
}
.o-toggle input:checked + .o-toggle-slider {
  background: var(--o-brand-primary, #714b67);
}
.o-toggle input:checked + .o-toggle-slider::before {
  transform: translateX(16px);
}

/* Form */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-group.checkbox-group {
  flex-direction: row;
  align-items: center;
}

.form-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--o-gray-700, #495057);
}

.required {
  color: var(--o-danger, #dc3545);
}

.form-input {
  padding: 0.375rem 0.5rem;
  border: 1px solid var(--o-border-color, #dee2e6);
  border-radius: var(--o-border-radius, 4px);
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--o-gray-800, #212529);
  background: #fff;
}

.form-input:focus {
  outline: none;
  border-color: var(--o-brand-primary, #714b67);
  box-shadow: 0 0 0 2px rgba(113, 75, 103, 0.15);
}

.form-textarea {
  resize: vertical;
  font-family: monospace;
  line-height: 1.6;
}

.form-textarea-sm {
  resize: vertical;
}

.o-checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  cursor: pointer;
}

/* Body section with placeholders sidebar */
.body-layout {
  display: flex;
  gap: 1rem;
}

.body-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.placeholder-list {
  width: 220px;
  flex-shrink: 0;
}

.placeholder-items {
  list-style: none;
  padding: 0;
  margin: 0.25rem 0 0;
}

.placeholder-item {
  padding: 0.25rem 0;
  font-size: 0.8rem;
}

.placeholder-item code {
  background: var(--o-gray-100, #f1f3f5);
  padding: 0.125rem 0.375rem;
  border-radius: 3px;
  font-size: 0.75rem;
  color: var(--o-brand-primary, #714b67);
  user-select: all;
}

/* Preview */
.preview-content {
  padding: 0.5rem;
  border: 1px solid var(--o-border-color, #dee2e6);
  border-radius: var(--o-border-radius, 4px);
  background: #fff;
  min-height: 200px;
  max-height: 60vh;
  overflow-y: auto;
}
</style>
