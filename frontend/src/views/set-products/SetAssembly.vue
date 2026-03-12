<template>
  <div class="set-assembly">
    <ControlPanel :title="pageTitle" :show-search="false">
      <template #actions>
        <div style="display:flex;gap:6px;">
          <OButton
            :variant="mode === 'assembly' ? 'primary' : 'secondary'"
            size="sm"
            @click="mode = 'assembly'"
          >セット組制作</OButton>
          <OButton
            :variant="mode === 'disassembly' ? 'primary' : 'secondary'"
            size="sm"
            @click="mode = 'disassembly'"
          >バラシ</OButton>
        </div>
      </template>
    </ControlPanel>

    <div class="assembly-content">
      <!-- Step 1: Select set product -->
      <div class="section">
        <h3 class="section-title">1. セット組を選択</h3>
        <select v-model="selectedSetProductId" class="o-input" style="width:400px;" @change="onSetProductChange">
          <option value="">セット組を選択...</option>
          <option v-for="sp in setProducts" :key="sp._id" :value="sp._id">
            {{ sp.sku }} - {{ sp.name }}
          </option>
        </select>
      </div>

      <!-- Components preview -->
      <div v-if="selectedSetProduct" class="section">
        <h3 class="section-title">2. 構成品明細</h3>
        <table class="o-table">
          <thead>
            <tr>
              <th class="o-table-th">SKU</th>
              <th class="o-table-th">商品名</th>
              <th class="o-table-th" style="width:100px;">1セットあたり</th>
              <th class="o-table-th" style="width:100px;">合計必要数</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(c, i) in selectedSetProduct.components" :key="i" class="o-table-row">
              <td class="o-table-td"><strong>{{ c.sku }}</strong></td>
              <td class="o-table-td">{{ c.name }}</td>
              <td class="o-table-td">{{ c.quantity }}</td>
              <td class="o-table-td"><strong>{{ c.quantity * orderQuantity }}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Step 3: Order details -->
      <div v-if="selectedSetProduct" class="section">
        <h3 class="section-title">3. 指示内容</h3>
        <div class="order-form">
          <div class="form-row">
            <label class="form-label">数量 <span class="req">必須</span></label>
            <input v-model.number="orderQuantity" type="number" class="o-input" min="1" style="width:120px;" />
          </div>
          <div class="form-row">
            <label class="form-label">在庫区分</label>
            <input v-model="orderStockCategory" type="text" class="o-input" placeholder="例: 良品、不良品" style="width:200px;" />
          </div>
          <div class="form-row">
            <label class="form-label">完成希望日</label>
            <input v-model="orderDesiredDate" type="date" class="o-input" style="width:180px;" />
          </div>
          <div class="form-row">
            <label class="form-label">ロット</label>
            <input v-model="orderLotNumber" type="text" class="o-input" placeholder="任意" style="width:200px;" />
          </div>
          <div class="form-row">
            <label class="form-label">消費期限</label>
            <input v-model="orderExpiryDate" type="date" class="o-input" style="width:180px;" />
          </div>
          <div class="form-row">
            <label class="form-label">メモ</label>
            <input v-model="orderMemo" type="text" class="o-input" placeholder="任意" style="width:300px;" />
          </div>
        </div>
        <div style="margin-top:16px;">
          <OButton variant="primary" :disabled="isSubmitting || orderQuantity < 1" @click="handleSubmit">
            {{ isSubmitting ? '作成中...' : (mode === 'assembly' ? 'セット組制作指示を作成' : 'バラシ指示を作成') }}
          </OButton>
        </div>
      </div>

      <!-- Recent orders -->
      <div class="section" style="margin-top:32px;">
        <h3 class="section-title">最近の指示</h3>
        <table class="o-table">
          <thead>
            <tr>
              <th class="o-table-th" style="width:160px;">指示番号</th>
              <th class="o-table-th" style="width:80px;">種別</th>
              <th class="o-table-th" style="width:120px;">品番</th>
              <th class="o-table-th" style="width:150px;">名称</th>
              <th class="o-table-th" style="width:80px;">指示数</th>
              <th class="o-table-th" style="width:80px;">完成数</th>
              <th class="o-table-th" style="width:90px;">ステータス</th>
              <th class="o-table-th" style="width:120px;">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="ordersLoading">
              <td colspan="8" class="o-table-empty">読み込み中...</td>
            </tr>
            <tr v-else-if="recentOrders.length === 0">
              <td colspan="8" class="o-table-empty">指示がありません</td>
            </tr>
            <tr v-for="order in recentOrders" :key="order._id" class="o-table-row">
              <td class="o-table-td"><strong>{{ order.orderNumber }}</strong></td>
              <td class="o-table-td">
                <span class="type-tag" :class="'type--' + order.type">
                  {{ order.type === 'assembly' ? '組立' : 'バラシ' }}
                </span>
              </td>
              <td class="o-table-td">{{ order.setSku }}</td>
              <td class="o-table-td">{{ order.setName }}</td>
              <td class="o-table-td">{{ order.quantity }}</td>
              <td class="o-table-td">{{ order.completedQuantity }}</td>
              <td class="o-table-td">
                <span class="status-tag" :class="'status--' + order.status">{{ statusLabel(order.status) }}</span>
              </td>
              <td class="o-table-td">
                <div style="display:inline-flex;gap:4px;">
                  <OButton
                    v-if="order.status === 'pending' || order.status === 'in_progress'"
                    variant="primary" size="sm"
                    @click="openCompleteDialog(order)"
                  >完了</OButton>
                  <OButton
                    v-if="order.status !== 'completed' && order.status !== 'cancelled'"
                    variant="secondary" size="sm"
                    style="border-color:#f56c6c;color:#f56c6c;"
                    @click="handleCancel(order)"
                  >取消</OButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Complete Dialog -->
    <ODialog v-model="completeDialogVisible" title="セット組指示完了" size="sm">
      <div class="dialog-form">
        <p>指示番号: <strong>{{ completingOrder?.orderNumber }}</strong></p>
        <p>指示数: {{ completingOrder?.quantity }}</p>
        <div class="form-field">
          <label class="form-label">完成数</label>
          <input v-model.number="completeQuantity" type="number" class="o-input" min="1" />
        </div>
      </div>
      <template #footer>
        <OButton variant="secondary" @click="completeDialogVisible = false">キャンセル</OButton>
        <OButton variant="primary" :disabled="completingSaving" @click="handleComplete">
          {{ completingSaving ? '処理中...' : '完了' }}
        </OButton>
      </template>
    </ODialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import OButton from '@/components/odoo/OButton.vue'
import ODialog from '@/components/odoo/ODialog.vue'
import {
  fetchSetProducts,
  fetchSetOrders,
  createSetOrder,
  completeSetOrder,
  cancelSetOrder,
} from '@/api/setProduct'
import type { SetProduct, SetOrder, SetOrderStatus } from '@/types/setProduct'
import { useToast } from '@/composables/useToast'

const toast = useToast()

const mode = ref<'assembly' | 'disassembly'>('assembly')
const pageTitle = computed(() => mode.value === 'assembly' ? 'セット組制作指示' : 'バラシ指示')

// Set products
const setProducts = ref<SetProduct[]>([])
const selectedSetProductId = ref('')
const selectedSetProduct = computed(() =>
  setProducts.value.find((s) => s._id === selectedSetProductId.value) || null,
)

// Order form
const orderQuantity = ref(1)
const orderStockCategory = ref('')
const orderDesiredDate = ref('')
const orderLotNumber = ref('')
const orderExpiryDate = ref('')
const orderMemo = ref('')
const isSubmitting = ref(false)

function onSetProductChange() {
  orderQuantity.value = 1
}

async function handleSubmit() {
  if (!selectedSetProductId.value) {
    toast.showWarning('セット組を選択してください')
    return
  }
  if (orderQuantity.value < 1) {
    toast.showWarning('数量は1以上を指定してください')
    return
  }

  isSubmitting.value = true
  try {
    await createSetOrder({
      setProductId: selectedSetProductId.value,
      type: mode.value,
      quantity: orderQuantity.value,
      stockCategory: orderStockCategory.value.trim() || undefined,
      desiredDate: orderDesiredDate.value || undefined,
      lotNumber: orderLotNumber.value.trim() || undefined,
      expiryDate: orderExpiryDate.value || undefined,
      memo: orderMemo.value.trim() || undefined,
    })
    toast.showSuccess(`${mode.value === 'assembly' ? 'セット組制作' : 'バラシ'}指示を作成しました`)
    // Reset form
    orderQuantity.value = 1
    orderStockCategory.value = ''
    orderDesiredDate.value = ''
    orderLotNumber.value = ''
    orderExpiryDate.value = ''
    orderMemo.value = ''
    await loadOrders()
  } catch (e: any) {
    toast.showError(e.message || '指示の作成に失敗しました')
  } finally {
    isSubmitting.value = false
  }
}

// Recent orders
const recentOrders = ref<SetOrder[]>([])
const ordersLoading = ref(false)

async function loadOrders() {
  ordersLoading.value = true
  try {
    const res = await fetchSetOrders({ type: mode.value, limit: 20 })
    recentOrders.value = res.items
  } catch {
    // silent
  } finally {
    ordersLoading.value = false
  }
}

watch(mode, () => {
  loadOrders()
})

// Complete dialog
const completeDialogVisible = ref(false)
const completingOrder = ref<SetOrder | null>(null)
const completeQuantity = ref(0)
const completingSaving = ref(false)

function openCompleteDialog(order: SetOrder) {
  completingOrder.value = order
  completeQuantity.value = order.quantity
  completeDialogVisible.value = true
}

async function handleComplete() {
  if (!completingOrder.value) return
  completingSaving.value = true
  try {
    await completeSetOrder(completingOrder.value._id, completeQuantity.value)
    toast.showSuccess('指示を完了しました')
    completeDialogVisible.value = false
    await loadOrders()
  } catch (e: any) {
    toast.showError(e.message || '完了処理に失敗しました')
  } finally {
    completingSaving.value = false
  }
}

async function handleCancel(order: SetOrder) {
  if (!confirm(`指示「${order.orderNumber}」をキャンセルしますか？`)) return
  try {
    await cancelSetOrder(order._id)
    toast.showSuccess('指示をキャンセルしました')
    await loadOrders()
  } catch (e: any) {
    toast.showError(e.message || 'キャンセルに失敗しました')
  }
}

function statusLabel(s: SetOrderStatus): string {
  const map: Record<SetOrderStatus, string> = {
    pending: '未着手',
    in_progress: '作業中',
    completed: '完了',
    cancelled: 'キャンセル',
  }
  return map[s] || s
}

onMounted(async () => {
  try {
    setProducts.value = await fetchSetProducts({ isActive: true })
  } catch {
    // silent
  }
  await loadOrders()
})
</script>

<style scoped>
.set-assembly { max-width: 1200px; margin: 0 auto; }

.assembly-content { padding: 0 4px; }

.section { margin-top: 20px; }
.section-title { font-size: 15px; font-weight: 600; color: var(--o-gray-700, #303133); margin-bottom: 10px; padding-bottom: 6px; border-bottom: 2px solid var(--o-border-color, #e4e7ed); }

.o-table { width: 100%; border-collapse: collapse; background: var(--o-view-background, #fff); border: 1px solid var(--o-border-color, #e4e7ed); border-radius: 8px; overflow: hidden; }
.o-table-th { text-align: left; padding: 10px 12px; background: var(--o-gray-100, #f5f7fa); font-weight: 600; font-size: 13px; color: var(--o-gray-600, #606266); border-bottom: 1px solid var(--o-border-color, #e4e7ed); white-space: nowrap; }
.o-table-row:hover { background: var(--o-gray-50, #fafafa); }
.o-table-td { padding: 8px 12px; font-size: 13px; border-bottom: 1px solid var(--o-border-color-light, #ebeef5); color: var(--o-gray-700, #303133); }
.o-table-empty { text-align: center; padding: 40px; color: var(--o-gray-400, #c0c4cc); }

.order-form { display: flex; flex-direction: column; gap: 10px; }
.form-row { display: flex; align-items: center; gap: 10px; }
.form-label { font-size: 13px; font-weight: 500; color: var(--o-gray-600, #606266); width: 100px; min-width: 100px; }
.req { color: #dc3545; font-size: 11px; }

.o-input { padding: 6px 10px; border: 1px solid var(--o-border-color, #dcdfe6); border-radius: 4px; font-size: 14px; outline: none; }
.o-input:focus { border-color: var(--o-brand-primary, #714b67); }

.type-tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
.type--assembly { background: #ecf5ff; color: #409eff; }
.type--disassembly { background: #fdf6ec; color: #e6a23c; }

.status-tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
.status--pending { background: #f5f5f5; color: #909399; }
.status--in_progress { background: #ecf5ff; color: #409eff; }
.status--completed { background: #e1f3d8; color: #67c23a; }
.status--cancelled { background: #fde2e2; color: #f56c6c; }

.dialog-form { display: flex; flex-direction: column; gap: 12px; padding: 4px 0; }
.form-field { display: flex; flex-direction: column; gap: 4px; }
</style>
