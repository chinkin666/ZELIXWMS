<template>
  <div class="packing-rule-settings">
    <PageHeader title="梱包ルール" :show-search="false">
      <template #actions>
        <Button variant="default" @click="openCreate"><span>+</span> 新規追加</Button>
      </template>
    </PageHeader>

    <div class="table-section">
      <DataTable
        :columns="tableColumns"
        :data="list"
        row-key="_id"
        pagination-enabled
        pagination-mode="client"
        :page-size="20"
        :page-sizes="[10, 20, 50]"
      />
    </div>

    <!-- 作成/編集ダイアログ / 创建/编辑对话框 -->
    <Dialog :open="dialogVisible" @update:open="val => { if (!val) { closeDialog } }">
      <DialogContent>
        <DialogHeader><DialogTitle>{{ isEditing ? '梱包ルールを編集' : '梱包ルールを追加' }}</DialogTitle></DialogHeader>
        <form class="rule-form" @submit.prevent="handleSubmit">
          <div class="form-row-inline">
            <div class="form-row">
              <label>ルール名 <span class="text-destructive text-xs">*</span></label>
              <Input v-model="form.name" required placeholder="例: 標準梱包ルール" />
            </div>
            <div class="form-row" style="max-width: 120px;">
              <label>優先度</label>
              <Input type="number" v-model.number="form.priority" min="0" placeholder="0" />
            </div>
            <div class="form-row" style="max-width: 100px;">
              <label>有効</label>
              <Select v-model="form.isActive">
        <SelectTrigger class="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
        <SelectItem value="true">有効</SelectItem>
        <SelectItem value="false">無効</SelectItem>
        </SelectContent>
      </Select>
            </div>
          </div>

          <div class="form-section-title">条件 / 条件</div>
          <div class="form-row-inline">
            <div class="form-row">
              <label>最大重量 (g)</label>
              <Input type="number" v-model.number="form.conditions.maxWeight" min="0" placeholder="制限なし" />
            </div>
            <div class="form-row">
              <label>最大サイズ (mm)</label>
              <Input type="number" v-model.number="form.conditions.maxDimension" min="0" placeholder="制限なし" />
            </div>
          </div>
          <div class="form-row-inline">
            <div class="form-row">
              <label>クール区分</label>
              <Select v-model="form.conditions.coolType">
        <SelectTrigger class="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
        <SelectItem value="__all__">指定なし</SelectItem>
        <SelectItem value="0">通常</SelectItem>
        <SelectItem value="1">クール冷凍</SelectItem>
        <SelectItem value="2">クール冷蔵</SelectItem>
        </SelectContent>
      </Select>
            </div>
            <div class="form-row">
              <label>送り状種類</label>
              <Input v-model="form.conditions.invoiceType" placeholder="指定なし" />
            </div>
            <div class="form-row">
              <label>最大商品点数</label>
              <Input type="number" v-model.number="form.conditions.maxProductCount" min="0" placeholder="制限なし" />
            </div>
          </div>

          <div class="form-section-title">耗材（梱包材）/ 耗材（梱包材）</div>
          <table class="materials-table">
            <thead>
              <tr>
                <th>耗材SKU</th>
                <th>耗材名</th>
                <th style="width:80px;">数量</th>
                <th style="width:100px;">単価</th>
                <th style="width:50px;"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(mat, index) in form.materials" :key="index">
                <td><Input v-model="mat.materialSku" placeholder="SKU" /></td>
                <td><Input v-model="mat.materialName" placeholder="耗材名" /></td>
                <td><Input type="number" v-model.number="mat.quantity" min="1" /></td>
                <td><Input type="number" v-model.number="mat.unitCost" min="0" step="0.01" placeholder="0" /></td>
                <td style="text-align:center;">
                  <Button variant="destructive" size="sm" @click="removeMaterial(index)" title="削除">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                  </Button>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="5">
                  <Button type="button" class="add-material-btn" @click="addMaterial">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2z"/></svg>
                    耗材を追加
                  </Button>
                </td>
              </tr>
            </tfoot>
          </table>

          <div class="form-row">
            <label>備考</label>
            <textarea v-model="form.memo" rows="2" />
          </div>

          <div class="form-actions">
            <Button variant="secondary" type="button" @click="closeDialog">キャンセル</Button>
            <Button variant="default" type="submit" :disabled="saving">
              {{ saving ? '保存中...' : '保存' }}
            </Button>
          </div>
        </form>
    </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { useToast } from '@/composables/useToast'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/shared/PageHeader.vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { DataTable } from '@/components/data-table'
import type { TableColumn } from '@/types/table'
import {
  fetchPackingRules,
  createPackingRule,
  updatePackingRule,
  deletePackingRule,
} from '@/api/packingRule'
import type { PackingRule, PackingRuleMaterial } from '@/api/packingRule'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { computed, h, onMounted, ref } from 'vue'
import { Badge } from '@/components/ui/badge'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
const { confirm } = useConfirmDialog()
const { show: showToast } = useToast()

// ---------------------------------------------------------------------------
// State / 状態管理
// ---------------------------------------------------------------------------
const list = ref<PackingRule[]>([])
const loading = ref(false)
const saving = ref(false)

const dialogVisible = ref(false)
const editingId = ref<string | null>(null)

interface FormMaterial {
  materialSku: string
  materialName: string
  quantity: number
  unitCost: number | undefined
}

interface FormData {
  name: string
  priority: number
  isActive: boolean
  conditions: {
    maxWeight: number | undefined
    maxDimension: number | undefined
    coolType: string
    invoiceType: string
    maxProductCount: number | undefined
  }
  materials: FormMaterial[]
  memo: string
}

const emptyForm = (): FormData => ({
  name: '',
  priority: 0,
  isActive: true,
  conditions: {
    maxWeight: undefined,
    maxDimension: undefined,
    coolType: '',
    invoiceType: '',
    maxProductCount: undefined,
  },
  materials: [],
  memo: '',
})

const form = ref<FormData>(emptyForm())

// ---------------------------------------------------------------------------
// Table columns / 表格列定义
// ---------------------------------------------------------------------------
const conditionSummary = (rule: PackingRule): string => {
  const parts: string[] = []
  const c = rule.conditions || {}
  if (c.maxWeight) parts.push(`重量<=${c.maxWeight}g`)
  if (c.maxDimension) parts.push(`サイズ<=${c.maxDimension}mm`)
  if (c.coolType) {
    const coolLabels: Record<string, string> = { '0': '通常', '1': '冷凍', '2': '冷蔵' }
    parts.push(coolLabels[c.coolType] || c.coolType)
  }
  if (c.invoiceType) parts.push(c.invoiceType)
  if (c.maxProductCount) parts.push(`点数<=${c.maxProductCount}`)
  return parts.length > 0 ? parts.join(', ') : '-'
}

const tableColumns: TableColumn[] = [
  {
    key: 'name',
    dataKey: 'name',
    title: 'ルール名',
    width: 200,
    fieldType: 'string',
  },
  {
    key: 'priority',
    dataKey: 'priority',
    title: '優先度',
    width: 80,
    fieldType: 'number',
  },
  {
    key: 'conditions',
    dataKey: 'conditions',
    title: '条件サマリー',
    width: 260,
    fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: PackingRule }) => conditionSummary(rowData),
  },
  {
    key: 'materialsCount',
    dataKey: 'materials',
    title: '耗材数',
    width: 80,
    fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: PackingRule }) =>
      String(rowData.materials?.length ?? 0),
  },
  {
    key: 'isActive',
    dataKey: 'isActive',
    title: '有効',
    width: 70,
    fieldType: 'boolean',
    cellRenderer: ({ rowData }: { rowData: PackingRule }) =>
      h(
        'span',
        { class: rowData.isActive ? 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800' : 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800' },
        rowData.isActive ? '有効' : '無効',
      ),
  },
  {
    key: 'actions',
    title: '操作',
    width: 160,
    cellRenderer: ({ rowData }: { rowData: PackingRule }) =>
      h('div', { class: 'action-cell' }, [
        h(Button, { variant: 'default', size: 'sm', onClick: () => openEdit(rowData) }, () => '編集'),
        h(Button, { variant: 'destructive', size: 'sm', onClick: () => confirmDelete(rowData) }, () => '削除'),
      ]),
  },
]

// ---------------------------------------------------------------------------
// Computed
// ---------------------------------------------------------------------------
const isEditing = computed(() => editingId.value !== null)

// ---------------------------------------------------------------------------
// Data loading / 数据加载
// ---------------------------------------------------------------------------
const loadList = async () => {
  loading.value = true
  try {
    const result = await fetchPackingRules()
    list.value = Array.isArray(result) ? result : (result.data || [])
  } catch (error: any) {
    showToast(error?.message || '取得に失敗しました', 'danger')
  } finally {
    loading.value = false
  }
}

// ---------------------------------------------------------------------------
// Materials management / 耗材管理
// ---------------------------------------------------------------------------
const addMaterial = () => {
  form.value = {
    ...form.value,
    materials: [...form.value.materials, { materialSku: '', materialName: '', quantity: 1, unitCost: undefined }],
  }
}

const removeMaterial = (index: number) => {
  form.value = {
    ...form.value,
    materials: form.value.materials.filter((_, i) => i !== index),
  }
}

// ---------------------------------------------------------------------------
// Dialog / 对话框
// ---------------------------------------------------------------------------
const openCreate = () => {
  editingId.value = null
  form.value = emptyForm()
  dialogVisible.value = true
}

const openEdit = (item: PackingRule) => {
  editingId.value = item._id
  form.value = {
    name: item.name,
    priority: item.priority,
    isActive: item.isActive,
    conditions: {
      maxWeight: item.conditions.maxWeight ?? undefined,
      maxDimension: item.conditions.maxDimension ?? undefined,
      coolType: item.conditions.coolType || '',
      invoiceType: item.conditions.invoiceType || '',
      maxProductCount: item.conditions.maxProductCount ?? undefined,
    },
    materials: (item.materials || []).map((m) => ({
      materialSku: m.materialSku,
      materialName: m.materialName || '',
      quantity: m.quantity,
      unitCost: m.unitCost ?? undefined,
    })),
    memo: item.memo || '',
  }
  dialogVisible.value = true
}

const closeDialog = () => {
  dialogVisible.value = false
  editingId.value = null
  form.value = emptyForm()
}

const handleSubmit = async () => {
  saving.value = true
  try {
    const payload: Record<string, unknown> = {
      name: form.value.name.trim(),
      priority: form.value.priority,
      isActive: form.value.isActive,
      conditions: {
        maxWeight: form.value.conditions.maxWeight || undefined,
        maxDimension: form.value.conditions.maxDimension || undefined,
        coolType: form.value.conditions.coolType || undefined,
        invoiceType: form.value.conditions.invoiceType?.trim() || undefined,
        maxProductCount: form.value.conditions.maxProductCount || undefined,
      },
      materials: form.value.materials
        .filter((m) => m.materialSku.trim())
        .map((m) => ({
          materialSku: m.materialSku.trim(),
          materialName: m.materialName?.trim() || undefined,
          quantity: m.quantity,
          unitCost: m.unitCost ?? undefined,
        })),
      memo: form.value.memo.trim() || undefined,
    }

    if (editingId.value) {
      await updatePackingRule(editingId.value, payload as Partial<PackingRule>)
      showToast('更新しました', 'success')
    } else {
      await createPackingRule(payload as Partial<PackingRule>)
      showToast('作成しました', 'success')
    }
    closeDialog()
    await loadList()
  } catch (error: any) {
    showToast(error?.message || '保存に失敗しました', 'danger')
  } finally {
    saving.value = false
  }
}

// ---------------------------------------------------------------------------
// Delete / 删除
// ---------------------------------------------------------------------------
const confirmDelete = async (item: PackingRule) => {
  if (!(await confirm('この操作を実行しますか？'))) return
  try {
    await deletePackingRule(item._id)
    showToast('削除しました', 'success')
    await loadList()
  } catch (error: any) {
    showToast(error?.message || '削除に失敗しました', 'danger')
  }
}

// ---------------------------------------------------------------------------
// Init / 初始化
// ---------------------------------------------------------------------------
onMounted(() => {
  loadList()
})
</script>

<style>
@import '@/styles/order-table.css';

</style>

<style scoped>
.packing-rule-settings {
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

:deep(.action-cell) {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* フォーム / 表单 */
.rule-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px 0;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.form-row-inline {
  display: flex;
  gap: 12px;
}

.form-section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--o-gray-600, #606266);
  border-bottom: 1px solid var(--o-border-color, #dcdfe6);
  padding-bottom: 4px;
  margin-top: 4px;
}

.form-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--o-gray-700, #303133);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

/* 耗材テーブル / 耗材表格 */
.materials-table {
  width: 100%;
  border-collapse: collapse;
}

.materials-table th {
  padding: 6px 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--o-gray-600, #606266);
  border-bottom: 2px solid var(--o-border-color, #dcdfe6);
  text-align: left;
}

.materials-table td {
  padding: 4px 6px;
  border-bottom: 1px solid var(--o-gray-200, #e5e5e5);
}

.materials-table tbody tr:hover {
  background: var(--o-gray-50, #f8f9fa);
}

.materials-table .{
  width: 100%;
  padding: 4px 6px;
  font-size: 13px;
}

.add-material-btn {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  padding: 6px;
  background: none;
  border: 1px dashed #999;
  border-radius: 4px;
  color: var(--o-brand-primary, #0052A3);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.add-material-btn:hover {
  border-color: var(--o-brand-primary, #0052A3);
  background: rgba(113, 75, 103, 0.04);
}
</style>
