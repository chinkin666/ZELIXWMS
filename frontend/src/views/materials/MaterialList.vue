<template>
  <div class="material-list">
    <ControlPanel title="耗材一覧" :show-search="false">
      <template #actions>
        <OButton variant="primary" @click="openCreate"><span class="o-icon">+</span> 新規追加</OButton>
      </template>
    </ControlPanel>

    <!-- カテゴリフィルタータブ / 类别过滤标签 -->
    <div class="category-filter-bar">
      <button
        v-for="tab in categoryTabs"
        :key="tab.value"
        class="category-filter-btn"
        :class="{ 'category-filter-btn--active': categoryFilter === tab.value }"
        @click="onCategoryChange(tab.value)"
      >{{ tab.label }}</button>
    </div>

    <div class="table-section">
      <Table
        :columns="tableColumns"
        :data="list"
        :height="520"
        row-key="_id"
        pagination-enabled
        pagination-mode="server"
        :page-size="pageSize"
        :page-sizes="[10, 20, 50]"
        :total="total"
        :current-page="currentPage"
        @page-change="handlePageChange"
      />
    </div>

    <!-- 作成/編集ダイアログ / 创建/编辑对话框 -->
    <ODialog :open="dialogVisible" :title="isEditing ? '耗材を編集' : '耗材を追加'" size="lg" @close="closeDialog">
        <form class="material-form" @submit.prevent="handleSubmit">
          <div class="form-grid">
            <div class="form-col">
              <!-- SKU -->
              <div class="form-row">
                <label class="form-label">SKU <span class="required-badge">必須</span></label>
                <input class="o-input" v-model="form.sku" required :disabled="isEditing" placeholder="半角英数字" />
              </div>
              <!-- 耗材名 / 耗材名称 -->
              <div class="form-row">
                <label class="form-label">耗材名 <span class="required-badge">必須</span></label>
                <input class="o-input" v-model="form.name" required placeholder="耗材名を入力" />
              </div>
              <!-- カテゴリ / 类别 -->
              <div class="form-row">
                <label class="form-label">カテゴリ <span class="required-badge">必須</span></label>
                <select class="o-input" v-model="form.category" required>
                  <option value="">選択してください</option>
                  <option v-for="opt in CATEGORY_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </div>
              <!-- 単価 / 单价 -->
              <div class="form-row">
                <label class="form-label">単価 (円)</label>
                <input class="o-input" type="number" v-model.number="form.unitCost" min="0" step="0.01" placeholder="0" />
              </div>
              <!-- 箱入数 / 箱入数量 -->
              <div class="form-row">
                <label class="form-label">箱入数</label>
                <input class="o-input" type="number" v-model.number="form.caseQuantity" min="1" placeholder="1ケースあたりの個数" />
              </div>
            </div>
            <div class="form-col">
              <!-- 在庫管理 / 库存管理 -->
              <div class="form-row">
                <label class="form-label">在庫管理</label>
                <select class="o-input" v-model="form.inventoryEnabled">
                  <option :value="false">しない</option>
                  <option :value="true">する</option>
                </select>
              </div>
              <!-- 安全在庫 / 安全库存 -->
              <div class="form-row">
                <label class="form-label">安全在庫</label>
                <input class="o-input" type="number" v-model.number="form.safetyStock" min="0" placeholder="安全在庫数" />
              </div>
              <!-- サイズ（箱カテゴリのみ表示）/ 尺寸（仅箱类别显示） -->
              <template v-if="form.category === 'box'">
                <div class="form-row">
                  <label class="form-label">幅 (mm)</label>
                  <input class="o-input" type="number" v-model.number="form.widthMm" min="0" step="0.1" />
                </div>
                <div class="form-row">
                  <label class="form-label">奥行 (mm)</label>
                  <input class="o-input" type="number" v-model.number="form.depthMm" min="0" step="0.1" />
                </div>
                <div class="form-row">
                  <label class="form-label">高さ (mm)</label>
                  <input class="o-input" type="number" v-model.number="form.heightMm" min="0" step="0.1" />
                </div>
              </template>
              <!-- 仕入先コード / 供应商代码 -->
              <div class="form-row">
                <label class="form-label">仕入先コード</label>
                <input class="o-input" v-model="form.supplierCode" placeholder="仕入先コード" />
              </div>
              <!-- リードタイム / 交付周期 -->
              <div class="form-row">
                <label class="form-label">リードタイム (日)</label>
                <input class="o-input" type="number" v-model.number="form.leadTime" min="0" placeholder="日数" />
              </div>
              <!-- メモ / 备注 -->
              <div class="form-row">
                <label class="form-label">メモ</label>
                <textarea class="o-input" v-model="form.memo" rows="2" />
              </div>
            </div>
          </div>
          <div class="form-actions">
            <OButton variant="secondary" type="button" @click="closeDialog">キャンセル</OButton>
            <OButton variant="primary" type="submit" :disabled="saving">
              {{ saving ? '保存中...' : '保存' }}
            </OButton>
          </div>
        </form>
    </ODialog>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import { useToast } from '@/composables/useToast'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import ODialog from '@/components/odoo/ODialog.vue'
import Table from '@/components/table/Table.vue'
import type { TableColumn } from '@/types/table'
import {
  fetchMaterials,
  createMaterial,
  updateMaterial,
  deleteMaterial,
} from '@/api/material'
import type { Material, MaterialCategory } from '@/api/material'

const { show: showToast } = useToast()

// ---------------------------------------------------------------------------
// カテゴリ定義 / 类别定义
// ---------------------------------------------------------------------------
const CATEGORY_OPTIONS: Array<{ value: MaterialCategory; label: string; color: string; bg: string }> = [
  { value: 'box', label: '箱', color: '#1d4ed8', bg: '#dbeafe' },
  { value: 'cushioning', label: '緩衝材', color: '#15803d', bg: '#dcfce7' },
  { value: 'tape', label: 'テープ', color: '#c2410c', bg: '#ffedd5' },
  { value: 'label', label: 'ラベル', color: '#7c3aed', bg: '#ede9fe' },
  { value: 'bag', label: '袋', color: '#0e7490', bg: '#cffafe' },
  { value: 'other', label: 'その他', color: '#6b7280', bg: '#f3f4f6' },
]

const categoryTabs = [
  { value: '', label: '全て' },
  ...CATEGORY_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
]

const getCategoryOption = (val?: string) => CATEGORY_OPTIONS.find((o) => o.value === val)
const getCategoryLabel = (val?: string) => getCategoryOption(val)?.label ?? '-'

// ---------------------------------------------------------------------------
// State / 状态
// ---------------------------------------------------------------------------
const list = ref<Material[]>([])
const total = ref(0)
const loading = ref(false)
const saving = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)
const categoryFilter = ref<MaterialCategory | ''>('')

const dialogVisible = ref(false)
const editingId = ref<string | null>(null)

const emptyForm = (): Record<string, any> => ({
  sku: '',
  name: '',
  category: '' as MaterialCategory | '',
  unitCost: 0,
  inventoryEnabled: false,
  safetyStock: undefined,
  widthMm: undefined,
  depthMm: undefined,
  heightMm: undefined,
  supplierCode: '',
  caseQuantity: undefined,
  leadTime: undefined,
  memo: '',
})

const form = ref(emptyForm())

// ---------------------------------------------------------------------------
// テーブル列定義 / 表格列定义
// ---------------------------------------------------------------------------
const tableColumns: TableColumn[] = [
  {
    key: 'sku',
    dataKey: 'sku',
    title: 'SKU',
    width: 140,
    fieldType: 'string',
  },
  {
    key: 'name',
    dataKey: 'name',
    title: '耗材名',
    width: 200,
    fieldType: 'string',
  },
  {
    key: 'category',
    dataKey: 'category',
    title: 'カテゴリ',
    width: 120,
    fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: Material }) => {
      const opt = getCategoryOption(rowData.category)
      if (!opt) return '-'
      return h('span', {
        class: 'category-badge',
        style: { background: opt.bg, color: opt.color },
      }, opt.label)
    },
  },
  {
    key: 'unitCost',
    dataKey: 'unitCost',
    title: '単価(円)',
    width: 100,
    fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: Material }) =>
      rowData.unitCost != null ? `\u00A5${rowData.unitCost.toLocaleString()}` : '-',
  },
  {
    key: 'currentStock',
    dataKey: 'currentStock',
    title: '在庫数',
    width: 100,
    fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: Material }) =>
      rowData.currentStock != null ? String(rowData.currentStock) : '-',
  },
  {
    key: 'safetyStock',
    dataKey: 'safetyStock',
    title: '安全在庫',
    width: 100,
    fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: Material }) =>
      rowData.safetyStock != null ? String(rowData.safetyStock) : '-',
  },
  {
    key: 'isActive',
    dataKey: 'isActive',
    title: '有効',
    width: 80,
    fieldType: 'boolean',
    cellRenderer: ({ rowData }: { rowData: Material }) =>
      h(
        'span',
        { class: rowData.isActive ? 'o-status-tag o-status-tag--confirmed' : 'o-status-tag o-status-tag--cancelled' },
        rowData.isActive ? '有効' : '無効',
      ),
  },
  {
    key: 'actions',
    title: '操作',
    width: 160,
    cellRenderer: ({ rowData }: { rowData: Material }) =>
      h('div', { class: 'action-cell' }, [
        h(OButton, { variant: 'primary', size: 'sm', onClick: () => openEdit(rowData) }, () => '編集'),
        h(OButton, { variant: 'icon-danger', size: 'sm', onClick: () => confirmDelete(rowData) }, () => '削除'),
      ]),
  },
]

// ---------------------------------------------------------------------------
// Computed / 计算属性
// ---------------------------------------------------------------------------
const isEditing = computed(() => editingId.value !== null)

// ---------------------------------------------------------------------------
// データ取得 / 数据获取
// ---------------------------------------------------------------------------
const loadList = async () => {
  loading.value = true
  try {
    const result = await fetchMaterials({
      category: categoryFilter.value || undefined,
      page: currentPage.value,
      limit: pageSize.value,
    })
    list.value = result.data
    total.value = result.total
  } catch (error: any) {
    showToast(error?.message || '取得に失敗しました', 'danger')
  } finally {
    loading.value = false
  }
}

// ---------------------------------------------------------------------------
// カテゴリフィルター変更 / 类别过滤变更
// ---------------------------------------------------------------------------
const onCategoryChange = (value: MaterialCategory | '') => {
  categoryFilter.value = value
  currentPage.value = 1
  loadList()
}

// ---------------------------------------------------------------------------
// ページネーション / 分页
// ---------------------------------------------------------------------------
const handlePageChange = (payload: { page: number; pageSize: number }) => {
  currentPage.value = payload.page
  pageSize.value = payload.pageSize
  loadList()
}

// ---------------------------------------------------------------------------
// ダイアログ操作 / 对话框操作
// ---------------------------------------------------------------------------
const openCreate = () => {
  editingId.value = null
  form.value = emptyForm()
  dialogVisible.value = true
}

const openEdit = (item: Material) => {
  editingId.value = item._id
  form.value = {
    sku: item.sku,
    name: item.name,
    category: item.category,
    unitCost: item.unitCost ?? 0,
    inventoryEnabled: item.inventoryEnabled ?? false,
    safetyStock: item.safetyStock,
    widthMm: item.widthMm,
    depthMm: item.depthMm,
    heightMm: item.heightMm,
    supplierCode: item.supplierCode || '',
    caseQuantity: item.caseQuantity,
    leadTime: item.leadTime,
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
    const payload: Record<string, any> = {
      sku: form.value.sku.trim(),
      name: form.value.name.trim(),
      category: form.value.category,
      unitCost: form.value.unitCost ?? 0,
      inventoryEnabled: form.value.inventoryEnabled ?? false,
      safetyStock: form.value.safetyStock ?? undefined,
      supplierCode: form.value.supplierCode?.trim() || undefined,
      caseQuantity: form.value.caseQuantity ?? undefined,
      leadTime: form.value.leadTime ?? undefined,
      memo: form.value.memo?.trim() || undefined,
    }

    // サイズフィールドは箱カテゴリのみ送信 / 尺寸字段仅箱类别发送
    if (form.value.category === 'box') {
      payload.widthMm = form.value.widthMm ?? undefined
      payload.depthMm = form.value.depthMm ?? undefined
      payload.heightMm = form.value.heightMm ?? undefined
    }

    if (editingId.value) {
      await updateMaterial(editingId.value, payload)
      showToast('更新しました', 'success')
    } else {
      await createMaterial(payload)
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
// 削除 / 删除
// ---------------------------------------------------------------------------
const confirmDelete = async (item: Material) => {
  if (!confirm(`「${item.name}」を削除しますか？`)) return
  try {
    await deleteMaterial(item._id)
    showToast('削除しました', 'success')
    await loadList()
  } catch (error: any) {
    showToast(error?.message || '削除に失敗しました', 'danger')
  }
}

// ---------------------------------------------------------------------------
// 初期化 / 初始化
// ---------------------------------------------------------------------------
onMounted(() => {
  loadList()
})
</script>

<style>
@import '@/styles/order-table.css';

.o-status-tag--cancelled { background: #fef0f0; color: #f56c6c; }
</style>

<style scoped>
.material-list {
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

/* カテゴリフィルター / 类别过滤器 */
.category-filter-bar {
  display: flex;
  align-items: center;
  gap: 6px;
}

.category-filter-btn {
  padding: 4px 14px;
  font-size: 12px;
  border: 1px solid var(--o-border-color, #dcdfe6);
  border-radius: 4px;
  background: var(--o-view-background, #fff);
  color: var(--o-gray-600, #606266);
  cursor: pointer;
  transition: all 0.15s;
}

.category-filter-btn:hover {
  border-color: var(--o-primary, #714b67);
  color: var(--o-primary, #714b67);
}

.category-filter-btn--active {
  background: var(--o-primary, #714b67);
  color: #fff;
  border-color: var(--o-primary, #714b67);
}

/* カテゴリバッジ / 类别标签 */
:deep(.category-badge) {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
}

/* フォーム / 表单 */
.material-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 0;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 24px;
}

.form-col {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--o-gray-700, #303133);
}

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

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}
</style>
