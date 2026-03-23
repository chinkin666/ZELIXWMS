<template>
  <div class="carrier-settings">
    <PageHeader :title="t('wms.settings.carrierSettingsTitle', '配送業者設定')" :show-search="false">
      <template #actions>
        <Button variant="default" @click="openCreate">{{ t('wms.settings.addNew', '新規追加') }}</Button>
      </template>
    </PageHeader>

    <div class="table-section">
      <DataTable
        :columns="tableColumns"
        :data="list"
        row-key="_id"
        :search-columns="searchColumns"
        @search="handleSearch"
        highlight-columns-on-hover
        pagination-enabled
        pagination-mode="client"
        :page-size="20"
        :page-sizes="[10, 20, 50]"
      />
    </div>

    <!-- Template Settings Dialog -->
    <Dialog :open="templateDialogVisible" @update:open="val => { if (!val) { templateDialogVisible = false } }">
      <DialogContent>
        <DialogHeader><DialogTitle>{{ `${t('wms.settings.printTemplateSettings', '印刷テンプレート設定')} - ${templateEditingCarrier?.name || ''}` }}</DialogTitle></DialogHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead style="width:220px">{{ t('wms.settings.waybillType') }}</TableHead>
            <TableHead>{{ t('wms.settings.printTemplate') }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="row in templateMappingList" :key="row.invoiceType">
            <TableCell>{{ row.invoiceType }}: {{ row.name }}</TableCell>
            <TableCell>
              <Select v-model="row.printTemplateId">
        <SelectTrigger class="w-full">
          <SelectValue placeholder="{{ t('wms.settings.pleaseSelect', '選択してください') }}" />
        </SelectTrigger>
        <SelectContent>
        <SelectItem v-for="tpl in printTemplates" :key="tpl.id" :value="tpl.id">{{ tpl.name }}</SelectItem>
        </SelectContent>
      </Select>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <DialogFooter>
        <Button variant="secondary" @click="templateDialogVisible = false">{{ t('wms.common.cancel') }}</Button>
        <Button variant="default" :disabled="templateSaving" @click="saveTemplateSettings">{{ t('wms.common.save') }}</Button>
      </DialogFooter>
    </DialogContent>
    </Dialog>

    <Dialog :open="dialogVisible" @update:open="val => { if (!val) { dialogVisible = false } }">
      <DialogContent>
        <DialogHeader><DialogTitle>{{ isEditing ? t('wms.settings.editCarrier') : t('wms.settings.addCarrier') }}</DialogTitle></DialogHeader>
      <div class="carrier-form">
        <!-- 基本信息区 / 基本情報エリア -->
        <div class="form-section">
          <div class="form-section-title">基本情報</div>
          <div class="form-grid">
            <div class="o-form-group">
              <Label>配送業者コード <span class="text-destructive">*</span></Label>
              <Input v-model="editForm.code" placeholder="例: yamato_b2" :disabled="isEditing" />
              <span v-if="isEditing" class="form-hint">コードは変更できません</span>
            </div>
            <div class="o-form-group">
              <Label>配送業者名 <span class="text-destructive">*</span></Label>
              <Input v-model="editForm.name" placeholder="配送業者名" />
            </div>
            <div class="o-form-group">
              <Label>追跡番号列名</Label>
              <Input v-model="editForm.trackingIdColumnName" placeholder="回执/実績ファイルの列名（例: 伝票番号）" />
            </div>
            <div class="o-form-group">
              <Label>有効</Label>
              <label class="o-toggle">
                <input type="checkbox" v-model="editForm.enabled" />
                <span class="o-toggle-slider"></span>
              </label>
            </div>
          </div>
          <div class="o-form-group">
            <Label>説明</Label>
            <textarea v-model="editForm.description" rows="2" placeholder="補足説明"></textarea>
          </div>
        </div>

        <!-- 格式定义区 / フォーマット定義エリア -->
        <div class="form-section">
          <div class="format-header">
            <div>
              <div class="form-section-title">フォーマット定義 <span class="format-count">{{ editForm.formatDefinition.columns.length }}列</span></div>
              <p class="subtext">列名・型・最大文字数・必須・ユーザー入力可否を編集できます</p>
            </div>
            <div class="format-actions">
              <Button variant="secondary" size="sm" @click="addColumn">列を追加</Button>
              <Button variant="secondary" size="sm" @click="resetColumnsFromEditing">リセット</Button>
            </div>
          </div>

          <div class="format-table-wrapper">
            <table class="format-table">
              <thead>
                <tr>
                  <th style="width:30px;text-align:center">#</th>
                  <th style="min-width:140px">列名</th>
                  <th style="min-width:180px">説明</th>
                  <th style="width:100px">型</th>
                  <th style="width:80px">最大幅</th>
                  <th style="width:50px;text-align:center">必須</th>
                  <th style="width:60px;text-align:center">入力</th>
                  <th style="width:50px"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, $index) in editForm.formatDefinition.columns" :key="row.__key">
                  <td style="text-align:center;color:var(--o-gray-400);font-size:11px;">{{ $index + 1 }}</td>
                  <td><Input v-model="row.name" placeholder="列名" /></td>
                  <td><Input v-model="row.description" placeholder="説明" /></td>
                  <td>
                    <Select v-model="row.type">
        <SelectTrigger class="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
        <SelectItem value="string">文字列</SelectItem>
        <SelectItem value="number">数値</SelectItem>
        <SelectItem value="date">日付</SelectItem>
        <SelectItem value="boolean">真偽値</SelectItem>
        </SelectContent>
      </Select>
                  </td>
                  <td><Input v-model.number="row.maxWidth" type="number" min="1" placeholder="幅" /></td>
                  <td style="text-align:center"><Checkbox :checked="row.required" @update:checked="val => row.required = val" /></td>
                  <td style="text-align:center"><Checkbox :checked="row.userUploadable" @update:checked="val => row.userUploadable = val" /></td>
                  <td>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      @click="removeColumn($index)"
                      :disabled="editForm.formatDefinition.columns.length <= 1"
                      title="削除"
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H5.5l1-1h3l1 1H14a1 1 0 0 1 1 1v1z"/></svg>
                    </Button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="secondary" @click="dialogVisible = false">キャンセル</Button>
        <Button variant="default" :disabled="saving" @click="handleSave">
          {{ isEditing ? '更新' : '作成' }}
        </Button>
      </DialogFooter>
    </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useToast } from '@/composables/useToast'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/shared/PageHeader.vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DataTable } from '@/components/data-table'
import type { TableColumn, Operator } from '@/types/table'
import { createCarrier, deleteCarrier, fetchCarriers, updateCarrier } from '@/api/carrier'
import { fetchPrintTemplates } from '@/api/printTemplates'
import type { Carrier, CarrierFilters, CarrierColumnConfig, CarrierService } from '@/types/carrier'
import type { PrintTemplate } from '@/types/printTemplate'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
const { confirm } = useConfirmDialog()

const { t } = useI18n()
const { show: showToast } = useToast()

/** 配送業者別 送り状種類 / 配送業者別送り状種類 */
const CARRIER_INVOICE_TYPES: Record<string, ReadonlyArray<{ invoiceType: string; name: string }>> = {
  // ヤマト運輸 B2 Cloud
  yamato_b2: [
    { invoiceType: '0', name: '発払い' },
    { invoiceType: '1', name: 'EAZY' },
    { invoiceType: '2', name: 'コレクト' },
    { invoiceType: '3', name: 'クロネコゆうメール（DM便）' },
    { invoiceType: '4', name: 'タイム' },
    { invoiceType: '5', name: '着払い' },
    { invoiceType: '6', name: '発払い複数口' },
    { invoiceType: '7', name: 'クロネコゆうパケット' },
    { invoiceType: '8', name: '宅急便コンパクト' },
    { invoiceType: '9', name: 'コンパクトコレクト' },
    { invoiceType: 'A', name: 'ネコポス' },
  ],
  // 佐川急便 e飛伝Ⅲ
  sagawa: [
    { invoiceType: '0', name: '元払い' },
    { invoiceType: '1', name: '着払い' },
    { invoiceType: '2', name: 'e-コレクト（代引き）' },
  ],
  // 日本郵便 ゆうパック（将来用）
  japanpost: [
    { invoiceType: '0', name: 'ゆうパック' },
    { invoiceType: '1', name: 'ゆうパケット' },
    { invoiceType: '2', name: 'ゆうメール' },
  ],
}

/**
 * 配送業者コードから送り状種類を取得 / 配送業者コードから送り状種類を取得
 */
function getInvoiceTypesForCarrier(carrier: Carrier): ReadonlyArray<{ invoiceType: string; name: string }> {
  const code = carrier.code || ''
  // 完全一致 / 完全一致
  if (CARRIER_INVOICE_TYPES[code]) return CARRIER_INVOICE_TYPES[code]
  // 部分一致（sagawa_xxx → sagawa）/ 部分一致
  for (const key of Object.keys(CARRIER_INVOICE_TYPES)) {
    if (code.includes(key)) return CARRIER_INVOICE_TYPES[key]!
  }
  // automationType で判定 / automationType で判定
  if (carrier.automationType) {
    if (carrier.automationType.includes('yamato')) return CARRIER_INVOICE_TYPES.yamato_b2!
    if (carrier.automationType.includes('sagawa')) return CARRIER_INVOICE_TYPES.sagawa!
    if (carrier.automationType.includes('japanpost')) return CARRIER_INVOICE_TYPES.japanpost!
  }
  // フォールバック: ヤマト（最も利用が多い）/ フォールバック
  return CARRIER_INVOICE_TYPES.yamato_b2!
}

type EditableColumn = CarrierColumnConfig & { __key?: string }
type EditableCarrier = Omit<Carrier, 'formatDefinition'> & { formatDefinition: { columns: EditableColumn[] } }

const list = ref<Carrier[]>([])
const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const editingRow = ref<Carrier | null>(null)
const editForm = ref<EditableCarrier>(getEmptyCarrier())
const originalColumns = ref<CarrierColumnConfig[]>([])
const globalSearchText = ref('')

// Template settings dialog state
const templateDialogVisible = ref(false)
const templateSaving = ref(false)
const templateEditingCarrier = ref<Carrier | null>(null)
const printTemplates = ref<PrintTemplate[]>([])
const templateMappingList = ref<Array<{ invoiceType: string; name: string; printTemplateId?: string }>>([])

const baseColumns: TableColumn[] = [
  {
    key: 'code',
    dataKey: 'code',
    title: t('wms.settings.carrierCode'),
    width: 140,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'name',
    dataKey: 'name',
    title: t('wms.settings.carrierName'),
    width: 180,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'description',
    dataKey: 'description',
    title: t('wms.settings.description', '説明'),
    width: 200,
    fieldType: 'string',
  },
  {
    key: 'trackingIdColumnName',
    dataKey: 'trackingIdColumnName',
    title: t('wms.settings.trackingColumn'),
    width: 180,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'enabled',
    dataKey: 'enabled',
    title: t('wms.settings.enabled', '有効'),
    width: 100,
    fieldType: 'boolean',
    searchable: true,
    searchType: 'boolean',
  },
  {
    key: 'automationType',
    dataKey: 'automationType',
    title: t('wms.settings.automationType', '連携方式'),
    width: 110,
    fieldType: 'string',
  },
  {
    key: 'services',
    dataKey: 'services',
    title: t('wms.settings.services', 'サービス'),
    width: 110,
    fieldType: 'string',
  },
  {
    key: 'sortOrder',
    dataKey: 'sortOrder',
    title: t('wms.settings.sortOrder', '表示順'),
    width: 80,
    fieldType: 'number',
  },
  {
    key: 'formatColumns',
    title: t('wms.settings.columnCount', '列数'),
    width: 80,
    fieldType: 'number',
  },
  {
    key: 'createdAt',
    dataKey: 'createdAt',
    title: t('wms.settings.createdAt', '作成日時'),
    width: 180,
    fieldType: 'date',
    formEditable: false,
  },
]

const searchColumns: TableColumn[] = baseColumns.filter((c) => c.searchable)

const tableColumns: TableColumn[] = [
  ...baseColumns.map((col) => {
    if (col.key === 'createdAt') {
      return { ...col, cellRenderer: ({ rowData }: { rowData: Carrier }) => formatDate(rowData.createdAt) }
    }
    if (col.key === 'enabled') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: Carrier }) =>
          h('span', { class: rowData.enabled ? 'o-badge o-badge-success' : 'o-badge o-badge-info' },
            rowData.enabled ? 'ON' : 'OFF'),
      }
    }
    if (col.key === 'automationType') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: Carrier }) => {
          const v = (rowData as any).automationType
          const label: Record<string, string> = { csv: 'CSV', api: 'API', manual: '手動' }
          return label[v] ?? v ?? '-'
        },
      }
    }
    if (col.key === 'services') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: Carrier }) => {
          const s = (rowData as any).services
          if (Array.isArray(s) && s.length > 0) return `${s.length}種`
          return '-'
        },
      }
    }
    if (col.key === 'sortOrder') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: Carrier }) => (rowData as any).sortOrder ?? '-',
      }
    }
    if (col.key === 'description') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: Carrier }) => (rowData as any).description || '-',
      }
    }
    if (col.key === 'formatColumns') {
      return {
        ...col,
        dataKey: undefined,
        cellRenderer: ({ rowData }: { rowData: Carrier }) => rowData.formatDefinition?.columns?.length ?? 0,
      }
    }
    if (col.key === 'name') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: Carrier }) => {
          const children = [h('span', null, rowData.name || '-')]
          if (rowData.isBuiltIn) {
            children.push(h('span', { class: 'o-badge o-badge-secondary', style: 'margin-left:6px;font-size:10px;' }, '内蔵'))
          }
          return h('span', { style: 'display:inline-flex;align-items:center;' }, children)
        },
      }
    }
    return {
      ...col,
      cellRenderer: ({ rowData }: { rowData: Carrier }) => (rowData as any)[col.dataKey || col.key] || '-',
    }
  }),
  {
    key: 'actions',
    title: t('wms.settings.actions'),
    width: 280,
    cellRenderer: ({ rowData }: { rowData: Carrier }) => {
      const buttons = [
        h(Button, { variant: 'secondary', size: 'sm', onClick: () => openEdit(rowData) }, () => '編集'),
      ]
      if (!rowData.isBuiltIn) {
        buttons.push(h(Button, { variant: 'secondary', size: 'sm', onClick: () => duplicateCarrier(rowData) }, () => '複製'))
      }
      buttons.push(h(Button, { variant: 'secondary', size: 'sm', onClick: () => openTemplateSettings(rowData) }, () => 'テンプレート'))
      if (!rowData.isBuiltIn) {
        buttons.push(h(Button, { variant: 'destructive', size: 'sm', onClick: () => confirmDelete(rowData) }, () => '削除'))
      }
      return h('div', { style: 'display:flex;gap:4px;flex-wrap:wrap;' }, buttons)
    },
  },
]

const currentFilters = ref<CarrierFilters>({})
const isEditing = computed(() => !!editingRow.value?._id)

function getEmptyCarrier(): EditableCarrier {
  return {
    _id: '',
    code: '',
    name: '',
    description: '',
    enabled: true,
    trackingIdColumnName: '',
    formatDefinition: { columns: [createEmptyColumn()] },
  }
}

function createEmptyColumn(): EditableColumn {
  return {
    __key: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
    name: '',
    description: '',
    type: 'string',
    maxWidth: undefined,
    required: false,
    userUploadable: true,
  }
}

const handleSearch = (payload: Record<string, { operator: Operator; value: any }>) => {
  if (payload.__global?.value) {
    globalSearchText.value = String(payload.__global.value).trim()
    delete payload.__global
  } else {
    globalSearchText.value = ''
  }

  const nextFilters: CarrierFilters = {}
  const pickString = (val: any) => (typeof val === 'string' && val.trim() ? val.trim() : undefined)

  if (payload.code?.value) nextFilters.code = pickString(payload.code.value)
  if (payload.name?.value) nextFilters.name = pickString(payload.name.value)
  if (typeof payload.enabled?.value === 'boolean') nextFilters.enabled = payload.enabled.value

  currentFilters.value = nextFilters
  loadList()
}

const loadList = async () => {
  loading.value = true
  try {
    list.value = await fetchCarriers(currentFilters.value)
  } catch (error: any) {
    showToast(error?.message || t('wms.settings.fetchFailed', '取得に失敗しました'), 'danger')
  } finally {
    loading.value = false
  }
}

const resetEditForm = () => {
  editForm.value = getEmptyCarrier()
  originalColumns.value = []
}

const openCreate = () => {
  editingRow.value = null
  resetEditForm()
  dialogVisible.value = true
}

const openEdit = (row: Carrier) => {
  editingRow.value = row
  const cloned = JSON.parse(JSON.stringify(row)) as Carrier
  const columns = (cloned.formatDefinition?.columns || []).map((c) => ({
    ...c,
    __key: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
  }))
  editForm.value = {
    ...cloned,
    trackingIdColumnName: cloned.trackingIdColumnName || '',
    formatDefinition: { columns },
  }
  originalColumns.value = columns.map((c) => ({ ...c }))
  dialogVisible.value = true
}

const addColumn = () => {
  editForm.value.formatDefinition.columns.push(createEmptyColumn())
}

const removeColumn = (index: number) => {
  editForm.value.formatDefinition.columns.splice(index, 1)
}

const resetColumnsFromEditing = () => {
  if (originalColumns.value.length > 0) {
    editForm.value.formatDefinition.columns = originalColumns.value.map((c) => ({
      ...c,
      __key: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
    }))
  } else {
    editForm.value.formatDefinition.columns = [createEmptyColumn()]
  }
}

const handleSave = async () => {
  if (!editForm.value.code.trim() || !editForm.value.name.trim()) {
    showToast(t('wms.settings.carrierCodeNameRequired', '配送業者コード・配送業者名は必須です'), 'warning')
    return
  }

  const cleanColumns = editForm.value.formatDefinition.columns.map(({ __key, ...rest }) => ({
    ...rest,
    maxWidth: typeof rest.maxWidth === 'number' && !Number.isNaN(rest.maxWidth) ? rest.maxWidth : undefined,
    name: rest.name?.trim() || '',
    description: rest.description?.trim() || '',
  }))

  const payload = {
    code: editForm.value.code.trim(),
    name: editForm.value.name.trim(),
    description: editForm.value.description?.trim() || undefined,
    enabled: !!editForm.value.enabled,
    trackingIdColumnName: editForm.value.trackingIdColumnName?.trim() || undefined,
    formatDefinition: {
      columns: cleanColumns,
    },
  }

  saving.value = true
  try {
    if (isEditing.value && editingRow.value?._id) {
      await updateCarrier(editingRow.value._id, payload)
      showToast(t('wms.settings.updated', '更新しました'), 'success')
    } else {
      await createCarrier(payload)
      showToast(t('wms.settings.created', '作成しました'), 'success')
    }
    dialogVisible.value = false
    resetEditForm()
    await loadList()
  } catch (error: any) {
    showToast(error?.response?.data?.message || error?.message || t('wms.settings.saveFailed', '保存に失敗しました'), 'danger')
  } finally {
    saving.value = false
  }
}

const duplicateCarrier = async (row: Carrier) => {
  try {
    const { _id, createdAt: _createdAt, updatedAt: _updatedAt, isBuiltIn: _isBuiltIn, automationType: _automationType, ...rest } = row
    await createCarrier({ ...rest, code: `${row.code}_copy`, name: `${row.name}_copy` } as any)
    showToast(t('wms.settings.duplicated', '複製しました'), 'success')
    await loadList()
  } catch (e: any) {
    showToast(e?.response?.data?.message || e?.message || t('wms.settings.duplicateFailed', '複製に失敗しました'), 'danger')
  }
}

const confirmDelete = async (row: Carrier) => {
  if (!(await confirm('この操作を実行しますか？'))) return
  deleteCarrier(row._id)
    .then(async () => {
      showToast(t('wms.settings.deleted', '削除しました'), 'success')
      await loadList()
    })
    .catch(() => {})
}

const formatDate = (iso?: string) => {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Template settings functions
const openTemplateSettings = async (row: Carrier) => {
  templateEditingCarrier.value = row

  if (printTemplates.value.length === 0) {
    try {
      printTemplates.value = await fetchPrintTemplates()
    } catch (_e: any) {
      showToast(t('wms.settings.printTemplateFetchFailed', '印刷テンプレートの取得に失敗しました'), 'danger')
      return
    }
  }

  const existingServices = row.services || []
  const invoiceTypes = getInvoiceTypesForCarrier(row)
  templateMappingList.value = invoiceTypes.map((type) => {
    const existing = existingServices.find((s) => s.invoiceType === type.invoiceType)
    return {
      invoiceType: type.invoiceType,
      name: type.name,
      printTemplateId: existing?.printTemplateId,
    }
  })

  templateDialogVisible.value = true
}

const saveTemplateSettings = async () => {
  if (!templateEditingCarrier.value) return

  templateSaving.value = true
  try {
    const services: CarrierService[] = templateMappingList.value
      .filter((item) => item.printTemplateId)
      .map((item) => ({
        invoiceType: item.invoiceType,
        printTemplateId: item.printTemplateId,
      }))

    await updateCarrier(templateEditingCarrier.value._id, {
      formatDefinition: templateEditingCarrier.value.formatDefinition,
      services,
    })

    const idx = list.value.findIndex((c) => c._id === templateEditingCarrier.value!._id)
    if (idx >= 0 && list.value[idx]) {
      list.value[idx].services = services
    }

    showToast(t('wms.settings.saved', '保存しました'), 'success')
    templateDialogVisible.value = false
  } catch (e: any) {
    showToast(e?.response?.data?.message || e?.message || t('wms.settings.saveFailed', '保存に失敗しました'), 'danger')
  } finally {
    templateSaving.value = false
  }
}

onMounted(() => {
  loadList()
})
</script>

<style scoped>
.carrier-settings {
  padding: 0 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}
.table-section { width: 100%; }

.{
  width: 100%;
  padding: 6px 10px;
  border: 1px solid var(--o-border-color, #dcdfe6);
  border-radius: var(--o-border-radius, 4px);
  font-size: var(--o-font-size-base, 14px);
  color: var(--o-gray-700, #303133);
  background: var(--o-view-background, #fff);
  box-sizing: border-box;
}
textarea.{ resize: vertical; }

.o-form-group { margin-bottom: 1rem; }
.form-label { display: block; font-size: var(--o-font-size-small, 13px); font-weight: 500; color: var(--o-gray-700, #303133); margin-bottom: 0.25rem; }
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
  vertical-align: middle;
  margin-left: 4px;
}

.o-toggle { position: relative; display: inline-flex; align-items: center; cursor: pointer; }
.o-toggle input { position: absolute; opacity: 0; width: 0; height: 0; }
.o-toggle-slider { width: 40px; height: 20px; background: var(--o-toggle-off, #c0c4cc); border-radius: 10px; transition: 0.2s; position: relative; }
.o-toggle-slider::after { content: ''; position: absolute; width: 16px; height: 16px; border-radius: 50%; background: #fff; top: 2px; left: 2px; transition: 0.2s; }
.o-toggle input:checked + .o-toggle-slider { background: var(--o-brand-primary, #0052A3); }
.o-toggle input:checked + .o-toggle-slider::after { left: 22px; }

.carrier-form {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.form-section {
  padding: 16px 20px;
  border-bottom: 1px solid var(--o-border-color, #e4e7ed);
}
.form-section:last-child { border-bottom: none; }

.form-section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--o-gray-800, #303133);
  margin-bottom: 12px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 16px;
  margin-bottom: 12px;
}

.format-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.format-count {
  font-size: 12px;
  font-weight: 400;
  color: var(--o-gray-500);
  margin-left: 6px;
}

.format-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.format-table-wrapper {
  max-height: 400px;
  overflow: auto;
  border: 1px solid var(--o-border-color, #e4e7ed);
}

.o-input--compact {
  padding: 4px 8px;
  font-size: 13px;
  height: 28px;
}

.o-input--disabled {
  background: var(--o-gray-100, #f5f7fa);
  color: var(--o-gray-500);
  cursor: not-allowed;
}

.form-hint {
  display: block;
  font-size: 11px;
  color: var(--o-gray-400);
  margin-top: 2px;
}

.subtext {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--o-gray-500);
}
</style>
