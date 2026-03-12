<template>
  <div class="set-product-list">
    <ControlPanel title="セット組一覧" :show-search="false">
      <template #center>
        <input
          v-model="searchText"
          type="text"
          class="o-input"
          placeholder="品番・名称で検索..."
          style="width: 260px;"
        />
      </template>
      <template #actions>
        <div style="display:flex;gap:6px;">
          <OButton variant="secondary" size="sm" @click="exportCsv">CSVエクスポート</OButton>
          <OButton variant="primary" size="sm" @click="openCreateDialog">新規作成</OButton>
        </div>
      </template>
    </ControlPanel>

    <div class="o-table-wrapper">
      <table class="o-table">
        <thead>
          <tr>
            <th class="o-table-th" style="width:140px;">品番</th>
            <th class="o-table-th" style="width:180px;">名称</th>
            <th class="o-table-th">構成品</th>
            <th class="o-table-th" style="width:80px;">状態</th>
            <th class="o-table-th" style="width:160px;">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="5" class="o-table-empty">読み込み中...</td>
          </tr>
          <tr v-else-if="filtered.length === 0">
            <td colspan="5" class="o-table-empty">セット組がありません</td>
          </tr>
          <tr v-for="item in filtered" :key="item._id" class="o-table-row">
            <td class="o-table-td"><strong>{{ item.sku }}</strong></td>
            <td class="o-table-td">{{ item.name }}</td>
            <td class="o-table-td">
              <div class="component-tags">
                <span v-for="(c, i) in item.components" :key="i" class="comp-tag">
                  {{ c.sku }} ×{{ c.quantity }}
                </span>
              </div>
            </td>
            <td class="o-table-td">
              <span class="o-status-tag" :class="item.isActive ? 'o-status-tag--confirmed' : 'o-status-tag--inactive'">
                {{ item.isActive ? '有効' : '無効' }}
              </span>
            </td>
            <td class="o-table-td">
              <div style="display:inline-flex;gap:4px;">
                <OButton variant="primary" size="sm" @click="openEditDialog(item)">編集</OButton>
                <OButton
                  variant="secondary" size="sm"
                  style="border-color:#f56c6c;color:#f56c6c;"
                  @click="handleDelete(item)"
                >削除</OButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Create/Edit Dialog -->
    <ODialog v-model="dialogVisible" :title="editingId ? 'セット組編集' : 'セット組新規作成'" size="lg">
      <div class="dialog-form">
        <div class="form-field">
          <label class="form-label">品番 <span class="req">必須</span></label>
          <input v-model="form.sku" type="text" class="o-input" placeholder="セット組品番" />
        </div>
        <div class="form-field">
          <label class="form-label">名称 <span class="req">必須</span></label>
          <input v-model="form.name" type="text" class="o-input" placeholder="セット組名称" />
        </div>
        <div class="form-field">
          <label class="form-label">メモ</label>
          <textarea v-model="form.memo" class="o-input" rows="2" />
        </div>

        <div class="form-field">
          <label class="form-label">構成品 <span class="req">必須</span></label>
          <table class="comp-table">
            <thead>
              <tr>
                <th>商品</th>
                <th style="width:80px;">数量</th>
                <th style="width:40px;"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(comp, idx) in form.components" :key="idx">
                <td>
                  <select
                    class="o-input"
                    :value="comp.productId"
                    @change="onComponentProductChange(idx, ($event.target as HTMLSelectElement).value)"
                  >
                    <option value="">商品を選択...</option>
                    <option v-for="p in productOptions" :key="p._id" :value="p._id">
                      {{ p.sku }} - {{ p.name }}
                    </option>
                  </select>
                </td>
                <td>
                  <input
                    class="o-input"
                    type="number"
                    :value="comp.quantity"
                    min="1"
                    @input="(e: Event) => comp.quantity = Number((e.target as HTMLInputElement).value) || 1"
                    style="width:70px;"
                  />
                </td>
                <td style="text-align:center;">
                  <button class="remove-btn" @click="removeComponent(idx)">&times;</button>
                </td>
              </tr>
            </tbody>
          </table>
          <button class="add-comp-btn" @click="addComponent">+ 構成品を追加</button>
        </div>
      </div>
      <template #footer>
        <OButton variant="secondary" @click="dialogVisible = false">キャンセル</OButton>
        <OButton variant="primary" :disabled="isSaving" @click="handleSave">
          {{ isSaving ? '保存中...' : '保存' }}
        </OButton>
      </template>
    </ODialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import OButton from '@/components/odoo/OButton.vue'
import ODialog from '@/components/odoo/ODialog.vue'
import { fetchSetProducts, createSetProduct, updateSetProduct, deleteSetProduct } from '@/api/setProduct'
import { fetchProducts } from '@/api/product'
import type { SetProduct } from '@/types/setProduct'
import { useToast } from '@/composables/useToast'

const toast = useToast()

const items = ref<SetProduct[]>([])
const isLoading = ref(false)
const searchText = ref('')

const productOptions = ref<Array<{ _id: string; sku: string; name: string }>>([])

const filtered = computed(() => {
  if (!searchText.value.trim()) return items.value
  const q = searchText.value.trim().toLowerCase()
  return items.value.filter(
    (s) => s.sku.toLowerCase().includes(q) || s.name.toLowerCase().includes(q),
  )
})

// Dialog
const dialogVisible = ref(false)
const editingId = ref<string | null>(null)
const isSaving = ref(false)

interface FormComponent {
  productId: string
  sku: string
  name: string
  quantity: number
}

const form = ref({
  sku: '',
  name: '',
  memo: '',
  components: [] as FormComponent[],
})

function openCreateDialog() {
  editingId.value = null
  form.value = { sku: '', name: '', memo: '', components: [{ productId: '', sku: '', name: '', quantity: 1 }] }
  dialogVisible.value = true
}

function openEditDialog(item: SetProduct) {
  editingId.value = item._id
  form.value = {
    sku: item.sku,
    name: item.name,
    memo: item.memo || '',
    components: item.components.map((c) => ({ ...c })),
  }
  dialogVisible.value = true
}

function addComponent() {
  form.value = {
    ...form.value,
    components: [...form.value.components, { productId: '', sku: '', name: '', quantity: 1 }],
  }
}

function removeComponent(idx: number) {
  form.value = {
    ...form.value,
    components: form.value.components.filter((_, i) => i !== idx),
  }
}

function onComponentProductChange(idx: number, productId: string) {
  const product = productOptions.value.find((p) => p._id === productId)
  const updated = form.value.components.map((c, i) =>
    i === idx
      ? { ...c, productId, sku: product?.sku || '', name: product?.name || '' }
      : c,
  )
  form.value = { ...form.value, components: updated }
}

async function handleSave() {
  if (!form.value.sku.trim() || !form.value.name.trim()) {
    toast.showWarning('品番と名称は必須です')
    return
  }
  const validComponents = form.value.components.filter((c) => c.productId)
  if (validComponents.length === 0) {
    toast.showWarning('構成品は1つ以上必要です')
    return
  }

  isSaving.value = true
  try {
    const payload = {
      sku: form.value.sku.trim(),
      name: form.value.name.trim(),
      memo: form.value.memo.trim() || undefined,
      components: validComponents.map((c) => ({
        productId: c.productId,
        sku: c.sku,
        name: c.name,
        quantity: c.quantity,
      })),
    }

    if (editingId.value) {
      await updateSetProduct(editingId.value, payload)
      toast.showSuccess('更新しました')
    } else {
      await createSetProduct(payload)
      toast.showSuccess('作成しました')
    }
    dialogVisible.value = false
    await loadData()
  } catch (e: any) {
    toast.showError(e.message || '保存に失敗しました')
  } finally {
    isSaving.value = false
  }
}

async function handleDelete(item: SetProduct) {
  if (!confirm(`セット組「${item.sku}」を削除しますか？`)) return
  try {
    await deleteSetProduct(item._id)
    toast.showSuccess('削除しました')
    await loadData()
  } catch (e: any) {
    toast.showError(e.message || '削除に失敗しました')
  }
}

function exportCsv() {
  const rows: string[] = ['品番,名称,構成品SKU,構成品名,数量']
  for (const item of filtered.value) {
    for (const c of item.components) {
      rows.push(`"${item.sku}","${item.name}","${c.sku}","${c.name}",${c.quantity}`)
    }
  }
  const bom = '\uFEFF'
  const blob = new Blob([bom + rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `set_products_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

async function loadData() {
  isLoading.value = true
  try {
    items.value = await fetchSetProducts()
  } catch (e: any) {
    toast.showError('セット組の取得に失敗しました')
  } finally {
    isLoading.value = false
  }
}

async function loadProducts() {
  try {
    const all = await fetchProducts()
    productOptions.value = all.map((p) => ({ _id: p._id, sku: p.sku, name: p.name }))
  } catch {
    // silent
  }
}

onMounted(() => {
  loadData()
  loadProducts()
})
</script>

<style>
@import '@/styles/order-table.css';
</style>

<style scoped>
.set-product-list { max-width: 1400px; margin: 0 auto; }

.o-table-wrapper { margin-top: 8px; }

/* Component tags (set-product specific) */
.component-tags { display: flex; flex-wrap: wrap; gap: 4px; }
.comp-tag { display: inline-block; padding: 2px 8px; background: #f0f9eb; color: #67c23a; border-radius: 4px; font-size: 12px; font-weight: 500; }

/* Inactive status tag (not in order-table.css) */
.o-status-tag--inactive { background: #f5f5f5; color: #909399; }

/* Dialog form */
.dialog-form { display: flex; flex-direction: column; gap: 14px; padding: 4px 0; }
.form-field { display: flex; flex-direction: column; gap: 4px; }
.form-label { font-size: 13px; font-weight: 600; color: var(--o-gray-600, #606266); }
.req { color: #dc3545; font-size: 11px; }

/* Component composition table inside dialog */
.comp-table { width: 100%; border-collapse: collapse; }
.comp-table th { padding: 6px 8px; font-size: 12px; font-weight: 600; text-align: left; border-bottom: 2px solid var(--o-border-color, #d6d6d6); color: var(--o-gray-600, #606266); }
.comp-table td { padding: 4px 6px; border-bottom: 1px solid #eee; }
.remove-btn { background: none; border: none; color: #f56c6c; cursor: pointer; font-size: 18px; line-height: 1; }
.remove-btn:hover { color: #dc3545; }
.add-comp-btn { width: 100%; padding: 6px; background: none; border: 1px dashed #999; border-radius: 4px; color: var(--o-brand-primary, #714b67); font-size: 13px; cursor: pointer; margin-top: 6px; }
.add-comp-btn:hover { border-color: var(--o-brand-primary, #714b67); background: rgba(113,75,103,0.04); }
</style>
