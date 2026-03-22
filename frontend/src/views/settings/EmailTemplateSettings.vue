<script setup lang="ts">
import { ref, h, onMounted, computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import OButton from '@/components/odoo/OButton.vue'
import ODialog from '@/components/odoo/ODialog.vue'
import SearchForm from '@/components/search/SearchForm.vue'
import Table from '@/components/table/Table.vue'
import type { TableColumn, Operator } from '@/types/table'
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

const { t } = useI18n()
const { showSuccess, showError } = useToast()

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const templates = ref<EmailTemplate[]>([])
const total = ref(0)
const isLoading = ref(false)
const globalSearchText = ref('')

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

const formTitle = computed(() => (isEditing.value ? t('wms.settings.email.editTemplate', 'メールテンプレート編集') : t('wms.settings.email.createTemplate', 'メールテンプレート作成')))

// ---------------------------------------------------------------------------
// Table columns
// ---------------------------------------------------------------------------
const baseColumns: TableColumn[] = [
  {
    key: 'name',
    dataKey: 'name',
    title: t('wms.settings.email.templateName', 'テンプレート名'),
    width: 180,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'carrierName',
    dataKey: 'carrierName',
    title: t('wms.settings.email.carrier', '配送業者'),
    width: 140,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'senderEmail',
    dataKey: 'senderEmail',
    title: t('wms.settings.email.senderEmail', '送信元'),
    width: 180,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'subject',
    dataKey: 'subject',
    title: t('wms.settings.email.subject', 'メールタイトル'),
    width: 250,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'isDefault',
    dataKey: 'isDefault',
    title: t('wms.settings.isDefault'),
    width: 100,
    fieldType: 'boolean',
    searchable: true,
    searchType: 'boolean',
  },
  {
    key: 'isActive',
    dataKey: 'isActive',
    title: t('wms.settings.email.active', '有効'),
    width: 80,
    fieldType: 'boolean',
    searchable: true,
    searchType: 'boolean',
  },
]

const searchColumns: TableColumn[] = baseColumns.filter((c) => c.searchable)

const tableColumns: TableColumn[] = [
  ...baseColumns.map((col) => {
    if (col.key === 'carrierName') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: EmailTemplate }) => rowData.carrierName || t('wms.settings.email.allCarriers', '全配送業者'),
      }
    }
    if (col.key === 'subject') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: EmailTemplate }) =>
          h('span', { class: 'subject-cell-text' }, rowData.subject),
      }
    }
    if (col.key === 'isDefault') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: EmailTemplate }) =>
          rowData.isDefault
            ? h('span', { class: 'o-badge o-badge-primary' }, t('wms.settings.isDefault'))
            : '',
      }
    }
    if (col.key === 'isActive') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: EmailTemplate }) =>
          h('span', {
            class: rowData.isActive ? 'o-badge o-badge-success' : 'o-badge o-badge-info',
            style: 'cursor:pointer;',
            onClick: () => toggleActive(rowData),
          }, rowData.isActive ? 'ON' : 'OFF'),
      }
    }
    return col
  }),
  {
    key: 'actions',
    title: t('wms.settings.actions'),
    width: 200,
    cellRenderer: ({ rowData }: { rowData: EmailTemplate }) =>
      h('div', { style: 'display:flex;gap:6px;' }, [
        h(OButton, { variant: 'secondary', size: 'sm', onClick: () => handlePreview(rowData) }, () => 'プレビュー'),
        h(OButton, { variant: 'secondary', size: 'sm', onClick: () => openEdit(rowData) }, () => '編集'),
        h('button', {
          class: 'delete-icon-btn',
          onClick: () => confirmDelete(rowData),
          title: '削除',
          innerHTML: '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H5.5l1-1h3l1 1H14a1 1 0 0 1 1 1v1z"/></svg>',
        }),
      ]),
  },
]

const handleSearch = (payload: Record<string, { operator: Operator; value: any }>) => {
  if (payload.__global?.value) {
    globalSearchText.value = String(payload.__global.value).trim()
  } else {
    globalSearchText.value = ''
  }
}

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
    <ControlPanel :title="t('wms.settings.email.title', '出荷メール設定')" :show-search="false">
      <template #actions>
        <OButton variant="primary" @click="openCreate">テンプレートを作成</OButton>
      </template>
    </ControlPanel>

    <SearchForm
      class="search-section"
      :columns="searchColumns"
      :show-save="false"
      storage-key="emailTemplateSearch"
      @search="handleSearch"
    />

    <div class="table-section">
      <Table
        :columns="tableColumns"
        :data="templates"
        row-key="_id"
        pagination-enabled
        pagination-mode="client"
        :page-size="20"
        :page-sizes="[10, 20, 50]"
        :global-search-text="globalSearchText"
      />
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
          <label class="form-label">{{ t('wms.settings.email.templateName', 'テンプレート名') }} <span class="required-badge">必須</span></label>
          <input v-model="form.name" type="text" class="form-input" :placeholder="t('wms.settings.email.templateNamePlaceholder', '例: ヤマト運輸 出荷完了メール')" />
        </div>

        <div class="form-group">
          <label class="form-label">{{ t('wms.settings.email.carrier', '配送業者') }}</label>
          <select v-model="form.carrierId" class="form-input" @change="onCarrierChange">
            <option value="">{{ t('wms.settings.email.allCarriersCommon', '全配送業者（共通）') }}</option>
            <option v-for="c in carriers" :key="c._id" :value="c._id">{{ c.name }}</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">{{ t('wms.settings.email.senderName', '発送元名') }} <span class="required-badge">必須</span></label>
          <input v-model="form.senderName" type="text" class="form-input" placeholder="例: ZELIX倉庫" />
        </div>

        <div class="form-group">
          <label class="form-label">{{ t('wms.settings.email.senderEmailAddress', '送信元メールアドレス') }} <span class="required-badge">必須</span></label>
          <input v-model="form.senderEmail" type="email" class="form-input" placeholder="例: noreply@example.com" />
        </div>

        <div class="form-group">
          <label class="form-label">{{ t('wms.settings.email.replyToEmail', '返信先メールアドレス') }}</label>
          <input v-model="form.replyToEmail" type="email" class="form-input" placeholder="例: support@example.com" />
        </div>

        <div class="form-group full-width">
          <label class="form-label">{{ t('wms.settings.email.subject', 'メールタイトル') }} <span class="required-badge">必須</span></label>
          <input v-model="form.subject" type="text" class="form-input" placeholder="例: 【{{senderName}}】ご注文 {{orderNumber}} を発送いたしました" />
        </div>

        <div class="form-group full-width body-section">
          <div class="body-layout">
            <div class="body-editor">
              <label class="form-label">{{ t('wms.settings.email.bodyTemplate', 'メール本文テンプレート') }} <span class="required-badge">必須</span></label>
              <textarea
                v-model="form.bodyTemplate"
                class="form-input form-textarea"
                rows="12"
                placeholder="{{customerName}} 様&#10;&#10;ご注文ありがとうございます。&#10;ご注文番号: {{orderNumber}}&#10;配送業者: {{carrierName}}&#10;追跡番号: {{trackingNumber}}&#10;出荷日: {{shippingDate}}&#10;&#10;■ 商品一覧&#10;{{itemList}}"
              ></textarea>
            </div>
            <div class="placeholder-list">
              <label class="form-label">{{ t('wms.settings.email.availablePlaceholders', '利用可能なプレースホルダー') }}</label>
              <ul class="placeholder-items">
                <li v-for="ph in placeholders" :key="ph" class="placeholder-item">
                  <code>{{ ph }}</code>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div class="form-group full-width">
          <label class="form-label">{{ t('wms.settings.email.footer', 'フッター') }}</label>
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
            {{ t('wms.settings.email.setAsDefault', 'デフォルトテンプレートに設定') }}
          </label>
        </div>

        <div class="form-group checkbox-group">
          <label class="o-checkbox-label">
            <input v-model="form.isActive" type="checkbox" />
            {{ t('wms.settings.email.active', '有効') }}
          </label>
        </div>
      </div>

      <template #footer>
        <OButton variant="secondary" @click="showFormDialog = false">{{ t('wms.common.cancel') }}</OButton>
        <OButton variant="primary" :disabled="isSaving" @click="handleSave">
          {{ isSaving ? t('wms.settings.email.saving', '保存中...') : t('wms.common.save') }}
        </OButton>
      </template>
    </ODialog>

    <!-- Preview Dialog -->
    <ODialog
      v-model="showPreviewDialog"
      :title="t('wms.settings.email.previewTitle', 'メールプレビュー')"
      size="lg"
      @close="showPreviewDialog = false"
    >
      <div v-if="isPreviewLoading" class="loading-state">{{ t('wms.settings.email.generatingPreview', 'プレビュー生成中...') }}</div>
      <iframe v-else-if="previewHtml" :srcdoc="previewHtml" sandbox="" style="width:100%;height:400px;border:1px solid #eee;border-radius:4px;" />

      <template #footer>
        <OButton variant="secondary" @click="showPreviewDialog = false">{{ t('wms.settings.email.close', '閉じる') }}</OButton>
      </template>
    </ODialog>

    <!-- Delete Confirmation Dialog -->
    <ODialog
      v-model="showDeleteDialog"
      :title="t('wms.settings.email.deleteTemplate', 'テンプレート削除')"
      size="sm"
      danger
      @close="showDeleteDialog = false"
      @confirm="handleDelete"
    >
      <p>{{ t('wms.settings.email.deleteConfirm', `テンプレート「${deletingTemplate?.name}」を削除しますか？`) }}</p>
      <p style="color: var(--o-gray-500); font-size: 0.85em;">{{ t('wms.settings.email.deleteWarning', 'この操作は元に戻せません。') }}</p>
    </ODialog>
  </div>
</template>

<style scoped>
.email-template-settings {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0 20px 20px;
}
:deep(.o-control-panel) { margin-left: -20px; margin-right: -20px; }

.table-section { width: 100%; }

.subject-cell-text {
  display: block; max-width: 250px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.delete-icon-btn {
  display: flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; border: none; background: none;
  color: var(--o-gray-400); cursor: pointer; transition: color 0.15s;
}
.delete-icon-btn:hover { color: var(--o-danger, #C0392B); }

/* Form */
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.form-group { display: flex; flex-direction: column; gap: 0.25rem; }
.form-group.full-width { grid-column: 1 / -1; }
.form-group.checkbox-group { flex-direction: row; align-items: center; }

.form-label { font-size: 13px; font-weight: 600; color: var(--o-gray-700); }
.form-input {
  padding: 6px 8px;
  border: 1px solid var(--o-border-color, #dee2e6);
  font-size: 13px; line-height: 1.5;
  color: var(--o-gray-800);
  background: var(--o-view-background, #fff);
}
.form-input:focus {
  outline: none;
  border-color: var(--o-brand-primary, #0052A3);
  box-shadow: 0 0 0 2px rgba(0, 82, 163, 0.15);
}
.form-textarea { resize: vertical; font-family: monospace; line-height: 1.6; }
.form-textarea-sm { resize: vertical; }

.o-checkbox-label { display: flex; align-items: center; gap: 0.5rem; font-size: 13px; cursor: pointer; }

/* Body + placeholder sidebar */
.body-layout { display: flex; gap: 1rem; }
.body-editor { flex: 1; display: flex; flex-direction: column; gap: 0.25rem; }
.placeholder-list { width: 220px; flex-shrink: 0; }
.placeholder-items { list-style: none; padding: 0; margin: 0.25rem 0 0; }
.placeholder-item { padding: 0.25rem 0; font-size: 12px; }
.placeholder-item code {
  background: var(--o-gray-100, #f1f3f5);
  padding: 2px 6px;
  font-size: 11px;
  color: var(--o-brand-primary, #0052A3);
  cursor: pointer;
  user-select: all;
}
.placeholder-item code:hover { background: var(--o-brand-lighter, #FAF0EA); }

/* Preview */
.preview-content {
  padding: 0.5rem;
  border: 1px solid var(--o-border-color);
  background: var(--o-view-background, #fff);
  min-height: 200px; max-height: 60vh; overflow-y: auto;
}

.loading-state { padding: 2rem; text-align: center; color: var(--o-gray-500); }
</style>
