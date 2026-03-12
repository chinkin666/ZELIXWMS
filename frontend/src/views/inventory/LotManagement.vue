<template>
  <div class="lot-management" style="display:flex;flex-direction:column;">
    <ControlPanel title="ロット管理" :show-search="false">
      <template #center>
        <input
          v-model="searchText"
          type="text"
          class="o-input"
          placeholder="ロット番号・SKU・商品名で検索..."
          style="width: 280px;"
          @input="handleSearchDebounced"
        />
      </template>
      <template #actions>
        <div style="display:flex;gap:6px;">
          <select v-model="statusFilter" class="o-input" style="width:120px;" @change="loadData">
            <option value="">全ステータス</option>
            <option value="active">有効</option>
            <option value="expired">期限切れ</option>
            <option value="recalled">リコール</option>
            <option value="quarantine">隔離</option>
          </select>
          <OButton variant="primary" size="sm" @click="openCreateDialog">
            新規作成
          </OButton>
        </div>
      </template>
    </ControlPanel>

    <div class="o-table-wrapper">
      <table class="o-table">
        <thead>
          <tr>
            <th class="o-table-th" style="width:140px;">ロット番号</th>
            <th class="o-table-th" style="width:120px;">SKU</th>
            <th class="o-table-th" style="width:180px;">商品名</th>
            <th class="o-table-th" style="width:120px;">賞味期限</th>
            <th class="o-table-th" style="width:120px;">製造日</th>
            <th class="o-table-th" style="width:80px;">ステータス</th>
            <th class="o-table-th" style="width:180px;">メモ</th>
            <th class="o-table-th" style="width:140px;">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="8" class="o-table-empty">読み込み中...</td>
          </tr>
          <tr v-else-if="lots.length === 0">
            <td colspan="8" class="o-table-empty">ロットがありません</td>
          </tr>
          <tr v-for="lot in lots" :key="lot._id" class="o-table-row">
            <td class="o-table-td"><strong>{{ lot.lotNumber }}</strong></td>
            <td class="o-table-td">{{ lot.productSku }}</td>
            <td class="o-table-td">{{ lot.productName || '-' }}</td>
            <td class="o-table-td">
              <span v-if="lot.expiryDate" :class="expiryClass(lot.expiryDate)">
                {{ formatDate(lot.expiryDate) }}
              </span>
              <span v-else>-</span>
            </td>
            <td class="o-table-td">{{ lot.manufactureDate ? formatDate(lot.manufactureDate) : '-' }}</td>
            <td class="o-table-td">
              <span class="o-status-tag" :class="'o-status-tag--' + statusTagVariant(lot.status)">{{ statusLabel(lot.status) }}</span>
            </td>
            <td class="o-table-td">{{ lot.memo || '-' }}</td>
            <td class="o-table-td o-table-td--actions">
              <div style="display:inline-flex;gap:4px;">
                <OButton variant="primary" size="sm" @click="openEditDialog(lot)">編集</OButton>
                <OButton
                  variant="secondary" size="sm"
                  style="border-color:#f56c6c;color:#f56c6c;"
                  @click="handleDelete(lot)"
                >
                  削除
                </OButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="o-table-pagination">
      <span class="o-table-pagination__info">{{ total }} 件</span>
      <div class="o-table-pagination__controls">
        <select class="o-input o-input-sm" v-model.number="pageSize" style="width:80px;">
          <option :value="25">25</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
        </select>
        <OButton variant="secondary" size="sm" :disabled="page <= 1" @click="page--; loadData()">&lsaquo;</OButton>
        <span class="o-table-pagination__page">{{ page }} / {{ totalPages }}</span>
        <OButton variant="secondary" size="sm" :disabled="page >= totalPages" @click="page++; loadData()">&rsaquo;</OButton>
      </div>
    </div>

    <!-- Create/Edit Dialog -->
    <ODialog v-model="dialogVisible" :title="editingId ? 'ロット編集' : 'ロット新規作成'" size="md">
      <div class="dialog-form">
        <div v-if="!editingId" class="form-field">
          <label class="form-label">商品</label>
          <select v-model="form.productId" class="o-input">
            <option value="">商品を選択...</option>
            <option v-for="p in productOptions" :key="p._id" :value="p._id">{{ p.sku }} - {{ p.name }}</option>
          </select>
        </div>
        <div v-if="!editingId" class="form-field">
          <label class="form-label">ロット番号</label>
          <input v-model="form.lotNumber" type="text" class="o-input" placeholder="例: LOT-2026-001" />
        </div>
        <div class="form-field">
          <label class="form-label">賞味期限</label>
          <input v-model="form.expiryDate" type="date" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">製造日</label>
          <input v-model="form.manufactureDate" type="date" class="o-input" />
        </div>
        <div v-if="editingId" class="form-field">
          <label class="form-label">ステータス</label>
          <select v-model="form.status" class="o-input">
            <option value="active">有効</option>
            <option value="expired">期限切れ</option>
            <option value="recalled">リコール</option>
            <option value="quarantine">隔離</option>
          </select>
        </div>
        <div class="form-field">
          <label class="form-label">メモ</label>
          <textarea v-model="form.memo" class="o-input" rows="2" />
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
import { fetchLots, createLot, updateLot, deleteLot } from '@/api/lot'
import type { Lot, LotStatus } from '@/types/inventory'
import { getApiBaseUrl } from '@/api/base'

const lots = ref<Lot[]>([])
const isLoading = ref(false)
const searchText = ref('')
const statusFilter = ref('')
const page = ref(1)
const total = ref(0)
const pageSize = ref(50)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

// Product options for create dialog
const productOptions = ref<Array<{ _id: string; sku: string; name: string }>>([])

// Dialog state
const dialogVisible = ref(false)
const editingId = ref<string | null>(null)
const isSaving = ref(false)
const form = ref({
  productId: '',
  lotNumber: '',
  expiryDate: '',
  manufactureDate: '',
  status: 'active' as string,
  memo: '',
})

let searchTimer: ReturnType<typeof setTimeout> | null = null
function handleSearchDebounced() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    loadData()
  }, 300)
}

async function loadData() {
  isLoading.value = true
  try {
    const res = await fetchLots({
      search: searchText.value || undefined,
      status: statusFilter.value || undefined,
      page: page.value,
      limit: pageSize.value,
    })
    lots.value = res.items
    total.value = res.total
  } catch (e: any) {
    console.error('ロット一覧取得エラー:', e)
  } finally {
    isLoading.value = false
  }
}

async function loadProducts() {
  try {
    const res = await fetch(`${getApiBaseUrl()}/products?limit=1000`)
    const data = await res.json()
    productOptions.value = (data.items || data || []).map((p: any) => ({
      _id: p._id,
      sku: p.sku,
      name: p.name,
    }))
  } catch (e: any) {
    console.error('商品取得エラー:', e)
  }
}

function openCreateDialog() {
  editingId.value = null
  form.value = { productId: '', lotNumber: '', expiryDate: '', manufactureDate: '', status: 'active', memo: '' }
  dialogVisible.value = true
}

function openEditDialog(lot: Lot) {
  editingId.value = lot._id
  form.value = {
    productId: lot.productId,
    lotNumber: lot.lotNumber,
    expiryDate: lot.expiryDate ? lot.expiryDate.slice(0, 10) : '',
    manufactureDate: lot.manufactureDate ? lot.manufactureDate.slice(0, 10) : '',
    status: lot.status,
    memo: lot.memo || '',
  }
  dialogVisible.value = true
}

async function handleSave() {
  isSaving.value = true
  try {
    if (editingId.value) {
      await updateLot(editingId.value, {
        expiryDate: form.value.expiryDate || null,
        manufactureDate: form.value.manufactureDate || null,
        status: form.value.status,
        memo: form.value.memo,
      })
    } else {
      if (!form.value.productId || !form.value.lotNumber.trim()) {
        alert('商品とロット番号は必須です')
        return
      }
      await createLot({
        lotNumber: form.value.lotNumber.trim(),
        productId: form.value.productId,
        expiryDate: form.value.expiryDate || undefined,
        manufactureDate: form.value.manufactureDate || undefined,
        memo: form.value.memo || undefined,
      })
    }
    dialogVisible.value = false
    await loadData()
  } catch (e: any) {
    alert(e.response?.data?.message || 'エラーが発生しました')
  } finally {
    isSaving.value = false
  }
}

async function handleDelete(lot: Lot) {
  if (!confirm(`ロット「${lot.lotNumber}」を削除しますか？`)) return
  try {
    await deleteLot(lot._id)
    await loadData()
  } catch (e: any) {
    alert(e.response?.data?.message || '削除に失敗しました')
  }
}

function formatDate(d: string) {
  return d ? new Date(d).toLocaleDateString('ja-JP') : ''
}

function expiryClass(d: string): string {
  const now = new Date()
  const exp = new Date(d)
  const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (daysLeft < 0) return 'expiry-expired'
  if (daysLeft <= 30) return 'expiry-warning'
  return ''
}

function statusLabel(s: LotStatus): string {
  const map: Record<LotStatus, string> = {
    active: '有効',
    expired: '期限切れ',
    recalled: 'リコール',
    quarantine: '隔離',
  }
  return map[s] || s
}

function statusTagVariant(s: LotStatus): string {
  const map: Record<LotStatus, string> = {
    active: 'confirmed',
    expired: 'error',
    recalled: 'pending',
    quarantine: 'new',
  }
  return map[s] || 'new'
}

onMounted(() => {
  loadData()
  loadProducts()
})
</script>

<style scoped>
@import '@/styles/order-table.css';

.lot-management {
  max-width: 1400px;
  margin: 0 auto;
}

:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}

.expiry-expired { color: #f56c6c; font-weight: 600; }
.expiry-warning { color: #e6a23c; font-weight: 500; }

.dialog-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 4px 0;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--o-gray-600, #606266);
}
</style>
