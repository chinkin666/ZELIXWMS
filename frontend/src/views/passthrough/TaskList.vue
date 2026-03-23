<script setup lang="ts">
import { Input } from '@/components/ui/input'
/**
 * 通過型作業タスク一覧 / 通过型作业任务列表
 *
 * 受付済みの入庫予約の作業オプションを表示し、作業完了を記録する。
 * 显示已受付的入库预定的作业选项，记录作业完成。
 */
import { ref, onMounted } from 'vue'
import { Card, CardContent } from '@/components/ui/card'
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { getApiBaseUrl } from '@/api/base'
import { useWmsUserStore } from '@/stores/wms/useWmsUserStore'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'

const router = useRouter()
const userStore = useWmsUserStore()
const baseUrl = getApiBaseUrl()
const { showSuccess, showError } = useToast()

const orders = ref<any[]>([])
const loading = ref(false)

// 検索 / 搜索
const searchQuery = ref('')

// ページネーション / 分页
const page = ref(1)
const limit = ref(20)
const total = ref(0)

async function loadOrders() {
  loading.value = true
  try {
    const qp = new URLSearchParams({ status: 'processing', page: String(page.value), limit: String(limit.value) })
    if (searchQuery.value.trim()) qp.set('search', searchQuery.value.trim())
    const res = await fetch(
      `${baseUrl}/passthrough?${qp}`,
      { headers: { Authorization: `Bearer ${userStore.token}` } },
    )
    const data = await res.json()
    orders.value = data.data || []
    total.value = data.total ?? data.data?.length ?? 0
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

// 作业完成实际数量输入 / 作業完了実数量入力
const completingOrder = ref<string | null>(null)
const completingDialogVisible = ref(false)
const completingOption = ref('')
const actualQuantity = ref(0)
const submitting = ref(false)

function startComplete(orderId: string, optionCode: string, qty: number) {
  completingOrder.value = orderId
  completingOption.value = optionCode
  actualQuantity.value = qty
  completingDialogVisible.value = true
}

async function submitComplete() {
  if (!completingOrder.value) return
  submitting.value = true
  try {
    const res = await fetch(`${baseUrl}/passthrough/${completingOrder.value}/complete-option`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userStore.token}`,
      },
      body: JSON.stringify({
        optionCode: completingOption.value,
        actualQuantity: actualQuantity.value,
      }),
    })
    if (res.ok) {
      showSuccess('作業完了 / 作业完成')
      completingDialogVisible.value = false
      completingOrder.value = null
      await loadOrders()
    } else {
      const data = await res.json()
      showError(data.message || '失敗')
    }
  } catch (e: any) {
    showError(e.message)
  } finally {
    submitting.value = false
  }
}

// ページネーション / 分页
const totalPages = () => Math.ceil(total.value / limit.value)
function prevPage() { if (page.value > 1) { page.value--; loadOrders() } }
function nextPage() { if (page.value < totalPages()) { page.value++; loadOrders() } }

onMounted(loadOrders)
</script>

<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
      <h2 style="margin: 0">通過型作業タスク / 通过型作业任务</h2>
      <div style="display: flex; gap: 8px; align-items: center">
        <Input
          v-model="searchQuery"
          placeholder="注文番号検索 / 搜索订单号"
          class="flex h-9 w-56 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
          @keyup.enter="() => { page = 1; loadOrders() }"
        />
        <Button class="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 border border-input bg-background hover:bg-accent" @click="loadOrders">
          {{ loading ? '読み込み中...' : '更新' }}
        </Button>
      </div>
    </div>

    <div v-for="order in orders" :key="order._id" style="margin-bottom: 16px">
      <div class="rounded-lg border bg-card shadow-sm">
        <div class="border-b px-4 py-3">
          <div style="display: flex; justify-content: space-between; align-items: center">
            <span>{{ order.orderNumber }} — {{ (order.destinationType || '').toUpperCase() }}</span>
            <div style="display: flex; gap: 4px; align-items: center">
              <Button class="text-sm text-primary hover:underline" @click.stop="router.push(`/passthrough/inspection/${order._id}`)">検品</Button>
              <Button class="text-sm text-primary hover:underline" @click.stop="router.push(`/passthrough/boxes/${order._id}`)">FBA箱</Button>
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">{{ order.status }}</span>
            </div>
          </div>
        </div>
        <div class="p-4">
          <div class="rounded-md border overflow-auto">
            <Table class="w-full text-sm">
              <TableHeader>
                <TableRow class="border-b bg-muted/50">
                  <TableHead class="h-8 px-2 text-left font-medium text-muted-foreground">作業</TableHead>
                  <TableHead class="h-8 px-2 text-left font-medium text-muted-foreground" style="width: 100px">状態</TableHead>
                  <TableHead class="h-8 px-2 text-left font-medium text-muted-foreground" style="width: 100px">数量</TableHead>
                  <TableHead class="h-8 px-2 text-left font-medium text-muted-foreground" style="width: 120px">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="row in (order.serviceOptions || [])" :key="row.optionCode" class="border-b hover:bg-muted/50">
                  <TableCell class="p-2">{{ row.optionName }}</TableCell>
                  <TableCell class="p-2">
                    <span
                      :class="row.status === 'completed' ? 'bg-green-100 text-green-800' : row.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' : 'bg-muted text-muted-foreground'"
                      class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                    >
                      {{ row.status === 'completed' ? '完了' : row.status === 'in_progress' ? '進行中' : '待機' }}
                    </span>
                  </TableCell>
                  <TableCell class="p-2">{{ row.actualQuantity ?? '--' }} / {{ row.quantity }}</TableCell>
                  <TableCell class="p-2">
                    <Button
                      v-if="row.status !== 'completed'"
                      class="inline-flex items-center justify-center rounded-md text-sm font-medium h-8 px-3 bg-primary text-primary-foreground hover:bg-primary/90"
                      @click="startComplete(order._id, row.optionCode, row.quantity)"
                    >
                      完了
                    </Button>
                    <span v-else class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">済</span>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!loading && orders.length === 0" class="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <p>作業中の予約はありません / 没有作业中的预定</p>
    </div>

    <!-- ページネーション / 分页 -->
    <div v-if="total > limit" style="display: flex; justify-content: center; gap: 8px; margin-top: 16px">
      <Button class="inline-flex items-center justify-center rounded-md text-sm font-medium h-8 px-3 border border-input bg-background hover:bg-accent" :disabled="page <= 1" @click="prevPage">前へ</Button>
      <span class="flex items-center text-sm text-muted-foreground">{{ page }} / {{ totalPages() }}</span>
      <Button class="inline-flex items-center justify-center rounded-md text-sm font-medium h-8 px-3 border border-input bg-background hover:bg-accent" :disabled="page >= totalPages()" @click="nextPage">次へ</Button>
    </div>

    <!-- 完了ダイアログ / 完成对话框 -->
    <Dialog :open="completingDialogVisible" @update:open="(v: boolean) => { completingDialogVisible = v; if (!v) completingOrder = null }">
      <DialogContent class="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>作業完了 / 作业完成</DialogTitle>
        </DialogHeader>
        <div class="grid gap-4 py-4">
          <div class="grid grid-cols-4 items-center gap-4">
            <label class="text-right text-sm">作業</label>
            <span class="col-span-3 text-sm">{{ completingOption }}</span>
          </div>
          <div class="grid grid-cols-4 items-center gap-4">
            <label class="text-right text-sm">実数量</label>
            <Input v-model.number="actualQuantity" type="number" min="0" class="col-span-3 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" />
          </div>
        </div>
        <DialogFooter>
          <Button class="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 border border-input bg-background hover:bg-accent" @click="completingDialogVisible = false">キャンセル</Button>
          <Button class="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/90" :disabled="submitting" @click="submitComplete">
            {{ submitting ? '処理中...' : '完了' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
