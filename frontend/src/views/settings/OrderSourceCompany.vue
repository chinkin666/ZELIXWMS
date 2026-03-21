<template>
  <div class="order-source-company">
    <ControlPanel title="ご依頼主設定" :show-search="false">
      <template #actions>
        <OButton variant="secondary" @click="showImportDialog = true">CSV取込</OButton>
        <OButton variant="primary" @click="openCreate">新規追加</OButton>
      </template>
    </ControlPanel>

    <SearchForm
      class="search-section"
      :columns="searchColumns"
      :show-save="false"
      storage-key="orderSourceCompanySearch"
      @search="handleSearch"
    />

    <!-- 一覧テーブル / 一览表格 -->
    <div class="table-section">
      <Table
        :columns="tableColumns"
        :data="list"
        row-key="_id"
        highlight-columns-on-hover
        pagination-enabled
        pagination-mode="client"
        :page-size="20"
        :page-sizes="[10, 20, 50]"
        :global-search-text="globalSearchText"
      />
    </div>

    <!-- 编辑弹窗 / 編集ダイアログ -->
    <ODialog
      :open="dialogVisible"
      :title="isEditing ? 'ご依頼主を編集' : 'ご依頼主を追加'"
      size="md"
      @close="dialogVisible = false"
    >
      <div class="osc-form">
        <div class="osc-form-group">
          <label class="osc-label">依頼主名 <span class="required-badge">必須</span></label>
          <input class="o-input" v-model="editForm.senderName" placeholder="依頼主名を入力" />
        </div>
        <div class="osc-form-group">
          <label class="osc-label">電話番号 <span class="required-badge">必須</span></label>
          <input class="o-input" v-model="editForm.senderPhone" placeholder="例: 0312345678" />
        </div>
        <div class="osc-form-row">
          <div class="osc-form-group" style="flex:0 0 180px;">
            <label class="osc-label">郵便番号 <span class="required-badge">必須</span></label>
            <div class="osc-postal-wrap">
              <input
                class="o-input"
                v-model="editForm.senderPostalCode"
                placeholder="例: 2310058"
                maxlength="7"
                @input="onPostalInput"
              />
              <button
                class="osc-postal-btn"
                :disabled="postalLoading"
                @click="lookupAddress"
                title="住所検索"
                type="button"
              >
                <svg v-if="!postalLoading" width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/></svg>
                <span v-else class="osc-postal-spinner" />
              </button>
            </div>
            <span v-if="postalMessage" class="osc-postal-msg" :class="postalMessageType">{{ postalMessage }}</span>
          </div>
          <div class="osc-form-group" style="flex:1;">
            <label class="osc-label">都道府県</label>
            <select class="o-input" v-model="editForm.senderAddressPrefecture">
              <option value="">選択してください</option>
              <option v-for="p in PREFECTURES" :key="p" :value="p">{{ p }}</option>
            </select>
          </div>
        </div>
        <div class="osc-form-group">
          <label class="osc-label">市区町村</label>
          <input class="o-input" v-model="editForm.senderAddressCity" placeholder="自動入力" />
        </div>
        <div class="osc-form-group">
          <label class="osc-label">町名・番地・建物</label>
          <input class="o-input" v-model="editForm.senderAddressStreet" placeholder="町名・番地・建物名" />
        </div>
        <div class="osc-form-row">
          <div class="osc-form-group">
            <label class="osc-label">発店コード1</label>
            <input class="o-input" v-model="editForm.hatsuBaseNo1" placeholder="3桁" maxlength="3" />
          </div>
          <div class="osc-form-group">
            <label class="osc-label">発店コード2</label>
            <input class="o-input" v-model="editForm.hatsuBaseNo2" placeholder="3桁" maxlength="3" />
          </div>
        </div>
      </div>
      <template #footer>
        <OButton variant="secondary" @click="dialogVisible = false">キャンセル</OButton>
        <OButton variant="primary" :disabled="saving" @click="handleDialogSubmit">
          {{ saving ? '保存中...' : (isEditing ? '更新' : '作成') }}
        </OButton>
      </template>
    </ODialog>

    <ImportDialog v-model="showImportDialog" :config-type="'order-source-company'" :passthrough="true" @import="handleImportCompanies" />
    <InputErrorDialog v-model="importErrorDialogVisible" :errors="importErrors" />
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import { ElMessageBox } from 'element-plus'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import OButton from '@/components/odoo/OButton.vue'
import ODialog from '@/components/odoo/ODialog.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import SearchForm from '@/components/search/SearchForm.vue'
import Table from '@/components/table/Table.vue'
import ImportDialog from '@/components/import/ImportDialog.vue'
import InputErrorDialog, { type InputRowError } from '@/components/input/InputErrorDialog.vue'
import type { TableColumn, Operator } from '@/types/table'
import {
  createOrderSourceCompany,
  deleteOrderSourceCompany,
  fetchOrderSourceCompanies,
  importOrderSourceCompaniesBulk,
  updateOrderSourceCompany,
  validateOrderSourceCompanyImport,
} from '@/api/orderSourceCompany'
import type { OrderSourceCompany, OrderSourceCompanyFilters } from '@/types/orderSourceCompany'
import { lookupPostalCode } from '@/utils/postalCode'

const PREFECTURES = [
  '北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県',
  '茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県',
  '新潟県','富山県','石川県','福井県','山梨県','長野県',
  '岐阜県','静岡県','愛知県','三重県',
  '滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県',
  '鳥取県','島根県','岡山県','広島県','山口県',
  '徳島県','香川県','愛媛県','高知県',
  '福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県',
] as const

const { show: showToast } = useToast()
const { t } = useI18n()

const list = ref<OrderSourceCompany[]>([])
const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const editingRow = ref<OrderSourceCompany | null>(null)
const showImportDialog = ref(false)
const importing = ref(false)
const importErrorDialogVisible = ref(false)
const importErrors = ref<InputRowError[]>([])
const globalSearchText = ref('')

// 列定义（表格+表单共用）/ カラム定義（テーブル+フォーム共通）
const baseColumns: TableColumn[] = [
  { key: 'senderName', dataKey: 'senderName', title: '依頼主名', width: 180, fieldType: 'string', required: true, searchable: true, searchType: 'string' },
  { key: 'senderPhone', dataKey: 'senderPhone', title: '電話番号', width: 140, fieldType: 'string', required: true, searchable: true, searchType: 'string' },
  { key: 'senderPostalCode', dataKey: 'senderPostalCode', title: '郵便番号', width: 100, fieldType: 'string', required: true, searchable: true, searchType: 'string' },
  { key: 'senderAddressPrefecture', dataKey: 'senderAddressPrefecture', title: '都道府県', width: 90, fieldType: 'string' },
  { key: 'senderAddressCity', dataKey: 'senderAddressCity', title: '市区町村', width: 140, fieldType: 'string' },
  { key: 'senderAddressStreet', dataKey: 'senderAddressStreet', title: '町名・番地・建物', width: 200, fieldType: 'string' },
  { key: 'hatsuBaseNo1', dataKey: 'hatsuBaseNo1', title: '発店コード1', width: 80, fieldType: 'string' },
  { key: 'hatsuBaseNo2', dataKey: 'hatsuBaseNo2', title: '発店コード2', width: 80, fieldType: 'string' },
  { key: 'createdAt', dataKey: 'createdAt', title: '作成日', width: 130, fieldType: 'date', formEditable: false },
]

const searchColumns: TableColumn[] = baseColumns.filter((c) => c.searchable)

const tableColumns: TableColumn[] = [
  ...baseColumns.map((col) => {
    if (col.key === 'createdAt') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: OrderSourceCompany }) => formatDate(rowData.createdAt),
      }
    }
    // 地址列合并显示 / 住所カラムの統合表示
    if (col.key === 'senderAddressPrefecture') {
      return {
        ...col,
        title: '住所',
        width: 280,
        cellRenderer: ({ rowData }: { rowData: OrderSourceCompany }) => {
          const addr = [
            rowData.senderAddressPrefecture,
            rowData.senderAddressCity,
            rowData.senderAddressStreet,
          ].filter(Boolean).join(' ')
          return addr || '-'
        },
      }
    }
    // 隐藏单独的 city/street 列（已合并到 prefecture）/ 個別の city/street は非表示（prefecture に統合済み）
    if (col.key === 'senderAddressCity' || col.key === 'senderAddressStreet') {
      return null
    }
    return {
      ...col,
      cellRenderer: ({ rowData }: { rowData: OrderSourceCompany }) =>
        (rowData as any)[col.dataKey || col.key] || '-',
    }
  }).filter(Boolean) as TableColumn[],
  {
    key: 'actions',
    title: '操作',
    width: 160,
    cellRenderer: ({ rowData }: { rowData: OrderSourceCompany }) =>
      h('div', { style: 'display:flex;gap:6px;' }, [
        h('button', {
          class: 'o-btn o-btn-sm o-btn-secondary',
          onClick: () => openEdit(rowData),
        }, '編集'),
        h('button', {
          class: 'o-btn o-btn-sm o-btn-secondary',
          onClick: () => duplicateRow(rowData),
        }, '複製'),
        h('button', {
          class: 'o-btn o-btn-sm o-btn-danger',
          onClick: () => confirmDelete(rowData),
        }, '削除'),
      ]),
  },
]

const currentFilters = ref<OrderSourceCompanyFilters>({})
const isEditing = computed(() => !!editingRow.value?._id)

// 编辑表单 / 編集フォーム
const editForm = ref({
  senderName: '',
  senderPhone: '',
  senderPostalCode: '',
  senderAddressPrefecture: '',
  senderAddressCity: '',
  senderAddressStreet: '',
  hatsuBaseNo1: '',
  hatsuBaseNo2: '',
})

// 邮编查询状态 / 郵便番号検索ステータス
const postalLoading = ref(false)
const postalMessage = ref('')
const postalMessageType = ref<'success' | 'error'>('success')

function resetEditForm() {
  editForm.value = {
    senderName: '', senderPhone: '', senderPostalCode: '',
    senderAddressPrefecture: '', senderAddressCity: '', senderAddressStreet: '',
    hatsuBaseNo1: '', hatsuBaseNo2: '',
  }
  postalMessage.value = ''
}

function openCreate() {
  editingRow.value = null
  resetEditForm()
  dialogVisible.value = true
}

function openEdit(row: OrderSourceCompany) {
  editingRow.value = row
  editForm.value = {
    senderName: row.senderName || '',
    senderPhone: row.senderPhone || '',
    senderPostalCode: row.senderPostalCode || '',
    senderAddressPrefecture: row.senderAddressPrefecture || '',
    senderAddressCity: row.senderAddressCity || '',
    senderAddressStreet: row.senderAddressStreet || '',
    hatsuBaseNo1: row.hatsuBaseNo1 || '',
    hatsuBaseNo2: row.hatsuBaseNo2 || '',
  }
  postalMessage.value = ''
  dialogVisible.value = true
}

// 邮编输入时自动查询（7位时）/ 郵便番号入力時に自動検索（7桁時）
let postalDebounce: ReturnType<typeof setTimeout> | null = null
function onPostalInput() {
  const code = editForm.value.senderPostalCode.replace(/[-\s]/g, '')
  if (code.length === 7) {
    if (postalDebounce) clearTimeout(postalDebounce)
    postalDebounce = setTimeout(() => lookupAddress(), 300)
  } else {
    postalMessage.value = ''
  }
}

async function lookupAddress() {
  const code = editForm.value.senderPostalCode.replace(/[-\s]/g, '')
  if (!/^\d{7}$/.test(code)) {
    postalMessage.value = '7桁の数字を入力してください'
    postalMessageType.value = 'error'
    return
  }
  postalLoading.value = true
  postalMessage.value = ''
  try {
    const result = await lookupPostalCode(code)
    if (result) {
      editForm.value.senderAddressPrefecture = result.prefecture
      editForm.value.senderAddressCity = result.city
      // 町名を先頭に設定、既存の番地は保持 / 町名を先頭にセット、既存の番地は保持
      const currentStreet = editForm.value.senderAddressStreet.trim()
      if (result.street) {
        // 既に町名が入っている場合は置換しない、空か町名と違う場合のみ設定
        // 已有町名时不替换，仅在空或不同时设置
        if (!currentStreet) {
          editForm.value.senderAddressStreet = result.street
        } else if (!currentStreet.startsWith(result.street)) {
          editForm.value.senderAddressStreet = result.street + currentStreet
        }
      }
      postalMessage.value = `${result.prefecture}${result.city}${result.street}`
      postalMessageType.value = 'success'
    } else {
      postalMessage.value = '該当する住所が見つかりません'
      postalMessageType.value = 'error'
    }
  } catch {
    postalMessage.value = '検索に失敗しました'
    postalMessageType.value = 'error'
  } finally {
    postalLoading.value = false
  }
}

function handleSearch(payload: Record<string, { operator: Operator; value: any }>) {
  if (payload.__global?.value) {
    globalSearchText.value = String(payload.__global.value).trim()
    delete payload.__global
  } else {
    globalSearchText.value = ''
  }

  const nextFilters: OrderSourceCompanyFilters = {}
  const pick = (val: any) => (typeof val === 'string' && val.trim() ? val.trim() : undefined)

  if (payload.senderName?.value) nextFilters.senderName = pick(payload.senderName.value)
  if (payload.senderPostalCode?.value) nextFilters.senderPostalCode = pick(payload.senderPostalCode.value)
  if (payload.senderPhone?.value) nextFilters.senderPhone = pick(payload.senderPhone.value)

  currentFilters.value = nextFilters
  loadList()
}

async function loadList() {
  loading.value = true
  try {
    list.value = await fetchOrderSourceCompanies(currentFilters.value)
  } catch (error: any) {
    showToast(error?.message || '取得に失敗しました', 'danger')
  } finally {
    loading.value = false
  }
}

async function handleDialogSubmit() {
  const f = editForm.value
  if (!f.senderName.trim()) { showToast('依頼主名は必須です', 'warning'); return }
  if (!f.senderPhone.trim()) { showToast('電話番号は必須です', 'warning'); return }
  if (!f.senderPostalCode.trim()) { showToast('郵便番号は必須です', 'warning'); return }

  saving.value = true
  try {
    const cleanPayload = {
      senderName: f.senderName.trim(),
      senderPostalCode: f.senderPostalCode.trim(),
      senderAddressPrefecture: f.senderAddressPrefecture.trim(),
      senderAddressCity: f.senderAddressCity.trim(),
      senderAddressStreet: f.senderAddressStreet.trim(),
      senderPhone: f.senderPhone.trim(),
      hatsuBaseNo1: f.hatsuBaseNo1.trim(),
      hatsuBaseNo2: f.hatsuBaseNo2.trim(),
    }

    if (editingRow.value?._id) {
      await updateOrderSourceCompany(editingRow.value._id, cleanPayload)
      showToast('更新しました', 'success')
    } else {
      await createOrderSourceCompany(cleanPayload)
      showToast('作成しました', 'success')
    }
    dialogVisible.value = false
    editingRow.value = null
    await loadList()
  } catch (error: any) {
    showToast(error?.response?.data?.message || error?.message || '保存に失敗しました', 'danger')
  } finally {
    saving.value = false
  }
}

async function duplicateRow(row: OrderSourceCompany) {
  try {
    const { _id, createdAt: _c, updatedAt: _u, ...rest } = row
    await createOrderSourceCompany({ ...rest, senderName: `${row.senderName}_copy` } as any)
    showToast('複製しました', 'success')
    await loadList()
  } catch (e: any) {
    showToast(e?.message || '複製に失敗しました', 'danger')
  }
}

async function confirmDelete(row: OrderSourceCompany) {
  try {
    await ElMessageBox.confirm(
      `「${row.senderName}」を削除してもよろしいですか？ / 确定要删除「${row.senderName}」吗？`,
      '確認 / 确认',
      { confirmButtonText: '削除 / 删除', cancelButtonText: 'キャンセル / 取消', type: 'warning' },
    )
  } catch { return }
  deleteOrderSourceCompany(row._id)
    .then(async () => {
      showToast('削除しました', 'success')
      await loadList()
    })
    .catch(() => {})
}

async function handleImportCompanies(rows: any[]) {
  if (!rows || !Array.isArray(rows)) return
  importing.value = true
  importErrors.value = []
  importErrorDialogVisible.value = false
  try {
    await validateOrderSourceCompanyImport(rows)
    const result = await importOrderSourceCompaniesBulk(rows)
    showToast(`${result.insertedCount}件登録しました`, 'success')
    await loadList()
    showImportDialog.value = false
  } catch (err: any) {
    const errors = (err?.errors || []) as InputRowError[]
    if (Array.isArray(errors) && errors.length > 0) {
      importErrors.value = errors
      importErrorDialogVisible.value = true
    } else {
      showToast(err?.message || '取り込みに失敗しました', 'danger')
    }
  } finally {
    importing.value = false
  }
}

function formatDate(iso: string) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

onMounted(() => loadList())
</script>

<style scoped>
.order-source-company {
  padding: 0 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}

.table-section {
  width: 100%;
}

/* 编辑弹窗 / 編集ダイアログ */
.osc-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 4px 0;
}
.osc-form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.osc-form-row {
  display: flex;
  gap: 12px;
}
.osc-form-row .osc-form-group { flex: 1; }
.osc-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--o-gray-700, #4a433d);
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 邮编查询 / 郵便番号検索 */
.osc-postal-wrap {
  display: flex;
  gap: 4px;
}
.osc-postal-wrap .o-input { flex: 1; }
.osc-postal-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--o-brand-primary, #0052A3);
  background: var(--o-brand-primary, #0052A3);
  color: #fff;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s;
}
.osc-postal-btn:hover { background: var(--o-brand-hover-dark, #B85D3A); }
.osc-postal-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.osc-postal-spinner {
  width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.osc-postal-msg {
  font-size: 11px;
  margin-top: 2px;
}
.osc-postal-msg.success { color: var(--o-success, #3D8B37); }
.osc-postal-msg.error { color: var(--o-danger, #C0392B); }

.required-badge {
  display: inline-block;
  background: #dc3545;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  padding: 2px 5px;
  border-radius: 3px;
  white-space: nowrap;
}
</style>
