<template>
  <div class="set-assembly">
    <PageHeader :title="pageTitle" :show-search="false">
      <template #actions>
        <div style="display:flex;gap:6px;">
          <Button
            :variant="mode === 'assembly' ? 'primary' : 'secondary'"
            size="sm"
            @click="mode = 'assembly'"
          >{{ t('wms.setProduct.assembly', 'セット組制作') }}</Button>
          <Button
            :variant="mode === 'disassembly' ? 'primary' : 'secondary'"
            size="sm"
            @click="mode = 'disassembly'"
          >{{ t('wms.setProduct.disassembly', 'バラシ') }}</Button>
        </div>
      </template>
    </PageHeader>

    <div class="assembly-content">
      <!-- Step 1: Select set product -->
      <div class="section">
        <h3 class="section-title">{{ t('wms.setProduct.step1SelectSet', '1. セット組を選択') }}</h3>
        <select v-model="selectedSetProductId" style="width:400px;" @change="onSetProductChange">
          <option value="">{{ t('wms.setProduct.selectSetPlaceholder', 'セット組を選択...') }}</option>
          <option v-for="sp in setProducts" :key="sp._id" :value="sp._id">
            {{ sp.sku }} - {{ sp.name }}
          </option>
        </select>
      </div>

      <!-- Components preview -->
      <div v-if="selectedSetProduct" class="section">
        <h3 class="section-title">{{ t('wms.setProduct.step2Components', '2. 構成品明細') }}</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>{{ t('wms.setProduct.productName', '商品名') }}</TableHead>
              <TableHead style="width:100px;">{{ t('wms.setProduct.perSet', '1セットあたり') }}</TableHead>
              <TableHead style="width:100px;">{{ t('wms.setProduct.totalRequired', '合計必要数') }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="(c, i) in selectedSetProduct.components" :key="i">
              <TableCell><strong>{{ c.sku }}</strong></TableCell>
              <TableCell>{{ c.name }}</TableCell>
              <TableCell>{{ c.quantity }}</TableCell>
              <TableCell><strong>{{ c.quantity * orderQuantity }}</strong></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <!-- Step 3: Order details -->
      <div v-if="selectedSetProduct" class="section">
        <h3 class="section-title">{{ t('wms.setProduct.step3OrderDetails', '3. 指示内容') }}</h3>
        <div class="order-form">
          <div class="form-row">
            <label>{{ t('wms.setProduct.quantity', '数量') }} <span class="req">{{ t('wms.setProduct.required', '必須') }}</span></label>
            <input v-model.number="orderQuantity" type="number" min="1" style="width:120px;" />
          </div>
          <div class="form-row">
            <label>{{ t('wms.setProduct.stockCategory', '在庫区分') }}</label>
            <input v-model="orderStockCategory" type="text" :placeholder="t('wms.setProduct.stockCategoryPlaceholder', '例: 良品、不良品')" style="width:200px;" />
          </div>
          <div class="form-row">
            <label>{{ t('wms.setProduct.desiredDate', '完成希望日') }}</label>
            <input v-model="orderDesiredDate" type="date" style="width:180px;" />
          </div>
          <div class="form-row">
            <label>{{ t('wms.setProduct.lot', 'ロット') }}</label>
            <input v-model="orderLotNumber" type="text" :placeholder="t('wms.setProduct.optional', '任意')" style="width:200px;" />
          </div>
          <div class="form-row">
            <label>{{ t('wms.setProduct.expiryDate', '消費期限') }}</label>
            <input v-model="orderExpiryDate" type="date" style="width:180px;" />
          </div>
          <div class="form-row">
            <label>{{ t('wms.setProduct.memo', 'メモ') }}</label>
            <input v-model="orderMemo" type="text" :placeholder="t('wms.setProduct.optional', '任意')" style="width:300px;" />
          </div>
        </div>
        <div style="margin-top:16px;">
          <Button variant="default" :disabled="isSubmitting || orderQuantity < 1" @click="handleSubmit">
            {{ isSubmitting ? t('wms.setProduct.creating', '作成中...') : (mode === 'assembly' ? t('wms.setProduct.createAssemblyOrder', 'セット組制作指示を作成') : t('wms.setProduct.createDisassemblyOrder', 'バラシ指示を作成')) }}
          </Button>
        </div>
      </div>

      <!-- Recent orders -->
      <div class="section" style="margin-top:32px;">
        <h3 class="section-title">{{ t('wms.setProduct.recentOrders', '最近の指示') }}</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead style="width:160px;">{{ t('wms.setProduct.orderNumber', '指示番号') }}</TableHead>
              <TableHead style="width:80px;">{{ t('wms.setProduct.type', '種別') }}</TableHead>
              <TableHead style="width:120px;">{{ t('wms.setProduct.sku', '品番') }}</TableHead>
              <TableHead style="width:150px;">{{ t('wms.setProduct.name', '名称') }}</TableHead>
              <TableHead style="width:80px;">{{ t('wms.setProduct.orderQuantity', '指示数') }}</TableHead>
              <TableHead style="width:80px;">{{ t('wms.setProduct.completedQuantity', '完成数') }}</TableHead>
              <TableHead style="width:90px;">{{ t('wms.setProduct.status', 'ステータス') }}</TableHead>
              <TableHead style="width:120px;">{{ t('wms.common.actions', '操作') }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="ordersLoading">
              <TableCell colspan="8">
                <div class="space-y-3 p-4">
                  <Skeleton class="h-4 w-[250px] mx-auto" />
                  <Skeleton class="h-10 w-full" />
                  <Skeleton class="h-10 w-full" />
                  <Skeleton class="h-10 w-full" />
                </div>
              </TableCell>
            </TableRow>
            <TableRow v-else-if="recentOrders.length === 0">
              <TableCell colspan="8" class="text-center py-8 text-muted-foreground">{{ t('wms.setProduct.noOrders', '指示がありません') }}</TableCell>
            </TableRow>
            <TableRow v-for="order in recentOrders" :key="order._id">
              <TableCell><strong>{{ order.orderNumber }}</strong></TableCell>
              <TableCell>
                <span class="type-tag" :class="'type--' + order.type">
                  {{ order.type === 'assembly' ? t('wms.setProduct.assemblyType', '組立') : t('wms.setProduct.disassemblyType', 'バラシ') }}
                </span>
              </TableCell>
              <TableCell>{{ order.setSku }}</TableCell>
              <TableCell>{{ order.setName }}</TableCell>
              <TableCell>{{ order.quantity }}</TableCell>
              <TableCell>{{ order.completedQuantity }}</TableCell>
              <TableCell>
                <span class="status-tag" :class="'status--' + order.status">{{ statusLabel(order.status) }}</span>
              </TableCell>
              <TableCell>
                <div style="display:inline-flex;gap:4px;">
                  <Button
                    v-if="order.status === 'pending' || order.status === 'in_progress'"
                    variant="default" size="sm"
                    @click="openCompleteDialog(order)"
                  >{{ t('wms.setProduct.complete', '完了') }}</Button>
                  <Button
                    v-if="order.status !== 'completed' && order.status !== 'cancelled'"
                    variant="outline" size="sm"
                    style="border-color:var(--o-danger, #C0392B);color:var(--o-danger, #C0392B);"
                    @click="handleCancel(order)"
                  >{{ t('wms.setProduct.cancelOrder', '取消') }}</Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>

    <!-- Complete Dialog -->
    <Dialog :open="completeDialogVisible" @update:open="completeDialogVisible = $event">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{{ t('wms.setProduct.completeOrderTitle', 'セット組指示完了') }}</DialogTitle>
        </DialogHeader>
        <div class="dialog-form">
          <p>{{ t('wms.setProduct.orderNumber', '指示番号') }}: <strong>{{ completingOrder?.orderNumber }}</strong></p>
          <p>{{ t('wms.setProduct.orderQuantity', '指示数') }}: {{ completingOrder?.quantity }}</p>
          <div class="form-field">
            <label>{{ t('wms.setProduct.completedQuantity', '完成数') }}</label>
            <input v-model.number="completeQuantity" type="number" min="1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="completeDialogVisible = false">{{ t('wms.common.cancel', 'キャンセル') }}</Button>
          <Button variant="default" :disabled="completingSaving" @click="handleComplete">
            {{ completingSaving ? t('wms.setProduct.processing', '処理中...') : t('wms.setProduct.complete', '完了') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { ref, computed, onMounted, watch } from 'vue'
import PageHeader from '@/components/shared/PageHeader.vue'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  fetchSetProducts,
  fetchSetOrders,
  createSetOrder,
  completeSetOrder,
  cancelSetOrder,
} from '@/api/setProduct'
import type { SetProduct, SetOrder, SetOrderStatus } from '@/types/setProduct'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
const { confirm } = useConfirmDialog()

const { t } = useI18n()
const toast = useToast()

const mode = ref<'assembly' | 'disassembly'>('assembly')
const pageTitle = computed(() => mode.value === 'assembly' ? t('wms.setProduct.assemblyOrderTitle', 'セット組制作指示') : t('wms.setProduct.disassemblyOrderTitle', 'バラシ指示'))

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
    toast.showWarning(t('wms.setProduct.selectSetWarning', 'セット組を選択してください'))
    return
  }
  if (orderQuantity.value < 1) {
    toast.showWarning(t('wms.setProduct.quantityWarning', '数量は1以上を指定してください'))
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
    toast.showSuccess(t('wms.setProduct.orderCreated', `${mode.value === 'assembly' ? 'セット組制作' : 'バラシ'}指示を作成しました`))
    // Reset form
    orderQuantity.value = 1
    orderStockCategory.value = ''
    orderDesiredDate.value = ''
    orderLotNumber.value = ''
    orderExpiryDate.value = ''
    orderMemo.value = ''
    await loadOrders()
  } catch (e: any) {
    toast.showError(e.message || t('wms.setProduct.orderCreateFailed', '指示の作成に失敗しました'))
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
    recentOrders.value = res?.items ?? []
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
    toast.showSuccess(t('wms.setProduct.orderCompleted', '指示を完了しました'))
    completeDialogVisible.value = false
    await loadOrders()
  } catch (e: any) {
    toast.showError(e.message || t('wms.setProduct.completeFailed', '完了処理に失敗しました'))
  } finally {
    completingSaving.value = false
  }
}

async function handleCancel(order: SetOrder) {
  if (!(await confirm('この操作を実行しますか？'))) return
  try {
    await cancelSetOrder(order._id)
    toast.showSuccess(t('wms.setProduct.orderCancelled', '指示をキャンセルしました'))
    await loadOrders()
  } catch (e: any) {
    toast.showError(e.message || t('wms.setProduct.cancelFailed', 'キャンセルに失敗しました'))
  }
}

function statusLabel(s: SetOrderStatus): string {
  const map: Record<SetOrderStatus, string> = {
    pending: t('wms.setProduct.statusPending', '未着手'),
    in_progress: t('wms.setProduct.statusInProgress', '作業中'),
    completed: t('wms.setProduct.statusCompleted', '完了'),
    cancelled: t('wms.setProduct.statusCancelled', 'キャンセル'),
  }
  return map[s] || s
}

onMounted(async () => {
  try {
    const res = await fetchSetProducts({ isActive: true })
    setProducts.value = Array.isArray(res) ? res : []
  } catch {
    // silent
  }
  await loadOrders()
})
</script>

<style scoped>
.set-assembly {
  padding: 0 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}

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
.req { color: var(--o-danger, #C0392B); font-size: 11px; }

.{ padding: 6px 10px; border: 1px solid var(--o-border-color, #dcdfe6); border-radius: 4px; font-size: 14px; outline: none; }
.o-input:focus { border-color: var(--o-brand-primary, #714b67); }

.type-tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
.type--assembly { background: var(--o-info-bg, #ecf5ff); color: var(--o-info, #409eff); }
.type--disassembly { background: var(--o-warning-bg, #fdf6ec); color: var(--o-warning, #e6a23c); }

.status-tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
.status--pending { background: var(--o-gray-200, #f5f5f5); color: var(--o-gray-500, #909399); }
.status--in_progress { background: var(--o-info-bg, #ecf5ff); color: var(--o-info, #409eff); }
.status--completed { background: var(--o-success-bg, #e1f3d8); color: var(--o-success, #67c23a); }
.status--cancelled { background: var(--o-danger-bg, #fde2e2); color: var(--o-danger, #f56c6c); }

.dialog-form { display: flex; flex-direction: column; gap: 12px; padding: 4px 0; }
.form-field { display: flex; flex-direction: column; gap: 4px; }
</style>
