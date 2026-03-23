<script setup lang="ts">
import { Input } from '@/components/ui/input'
/**
 * 通過型受付スキャン / 通过型受付扫码
 *
 * 仓库员扫入库外箱标 → 匹配预定 → 逐箱扫描 → 差异提交 → 放入暂存区
 * 倉庫員が入庫箱ラベルをスキャン → 予約マッチ → 逐箱スキャン → 差異提出 → 一時保管
 */
import { ref, computed } from 'vue'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/composables/useToast'
import { getApiBaseUrl } from '@/api/base'
import { useWmsUserStore } from '@/stores/wms/useWmsUserStore'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'

const userStore = useWmsUserStore()
const baseUrl = getApiBaseUrl()
const { showSuccess, showError, showWarning } = useToast()

// 扫码输入 / スキャン入力
const scanInput = ref('')
const order = ref<any>(null)
const loading = ref(false)
const scannedBoxes = ref(0)
const submitting = ref(false)

// 差异明细 / 差異明細
const varianceDetails = ref<Array<{
  sku: string; productName: string; expectedQuantity: number; actualQuantity: number; variance: number
}>>([])

async function fetchOrder(orderNumber: string) {
  loading.value = true
  try {
    const res = await fetch(`${baseUrl}/passthrough?search=${encodeURIComponent(orderNumber)}&limit=1`, {
      headers: { Authorization: `Bearer ${userStore.token}` },
    })
    const data = await res.json()
    if (data.data?.[0]) {
      order.value = data.data[0]
      // 初始化差异表 / 差異テーブル初期化
      varianceDetails.value = (order.value.lines || []).map((l: any) => ({
        sku: l.productSku,
        productName: l.productName || '',
        expectedQuantity: l.expectedQuantity,
        actualQuantity: l.expectedQuantity, // 默认=预定数量 / デフォルト=予定数量
        variance: 0,
      }))
    } else {
      showWarning('未找到匹配的入库预定 / 入庫予約が見つかりません')
    }
  } catch (e: any) {
    showError(e.message)
  } finally {
    loading.value = false
  }
}

// スキャン済み箱番号の重複チェック用 / 已扫描箱号去重检查用
const scannedBoxNumbers = ref<string[]>([])

function handleScan() {
  if (!scanInput.value.trim()) return
  if (!order.value) {
    // 初回スキャンで予約マッチ / 第一次扫码匹配预定
    fetchOrder(scanInput.value.trim())
  } else {
    const boxCode = scanInput.value.trim()
    // 重複チェック / 去重检查
    if (scannedBoxNumbers.value.includes(boxCode)) {
      showWarning(`この箱は既にスキャン済みです: ${boxCode}`)
    } else {
      scannedBoxNumbers.value = [...scannedBoxNumbers.value, boxCode]
      scannedBoxes.value++
      showSuccess(`箱 #${scannedBoxes.value} スキャン完了: ${boxCode}`)
    }
  }
  scanInput.value = ''
}

function updateVariance(idx: number) {
  const d = varianceDetails.value[idx]
  if (!d) return
  d.variance = d.actualQuantity - d.expectedQuantity
}

const hasVariance = computed(() => varianceDetails.value.some(d => d.variance !== 0))

async function submitArrive() {
  if (!order.value) return
  submitting.value = true
  try {
    const res = await fetch(`${baseUrl}/passthrough/${order.value._id}/arrive`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userStore.token}`,
      },
      body: JSON.stringify({
        actualBoxCount: scannedBoxes.value || order.value.totalBoxCount,
        receivedBy: userStore.currentUser?.displayName || 'unknown',
        varianceDetails: hasVariance.value ? varianceDetails.value : undefined,
      }),
    })
    const data = await res.json()
    if (res.ok) {
      showSuccess('受付完了！暂存区へ移動 / 受付完了！一時保管エリアへ')
      order.value = data
    } else {
      showError(data.message || '受付に失敗')
    }
  } catch (e: any) {
    showError(e.message)
  } finally {
    submitting.value = false
  }
}

function reset() {
  order.value = null
  scannedBoxes.value = 0
  scannedBoxNumbers.value = []
  varianceDetails.value = []
  scanInput.value = ''
}
</script>

<template>
  <div style="max-width: 900px; margin: 0 auto">
    <h2>通過型受付 / 通过型受付</h2>

    <!-- 扫码输入 / スキャン入力 -->
    <div class="rounded-lg border bg-card shadow-sm p-4" style="margin-bottom: 16px">
      <div class="flex items-center gap-2">
        <span>📦</span>
        <Input
          v-model="scanInput"
          :placeholder="order ? '箱ラベルをスキャン / 扫箱标' : '入庫予約番号をスキャン / 扫入库预定号'"
          class="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base"
          autofocus
          @keyup.enter="handleScan"
        />
      </div>
    </div>

    <template v-if="order">
      <!-- 预定信息 / 予約情報 -->
      <div class="rounded-lg border bg-card shadow-sm" style="margin-bottom: 16px">
        <div class="border-b px-4 py-3">
          <div style="display: flex; justify-content: space-between; align-items: center">
            <span>{{ order.orderNumber }} — {{ (order.destinationType || '').toUpperCase() }}</span>
            <span :class="order.status === 'confirmed' ? 'bg-muted text-muted-foreground' : 'bg-green-100 text-green-800'" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium">{{ order.status }}</span>
          </div>
        </div>
        <div class="p-4">
          <div class="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span class="text-muted-foreground">予定箱数</span>
              <div class="font-medium">{{ order.totalBoxCount || '--' }}</div>
            </div>
            <div>
              <span class="text-muted-foreground">スキャン済箱数</span>
              <div class="font-medium" :style="{ color: scannedBoxes !== order.totalBoxCount ? '#e6a23c' : '#67c23a' }">
                {{ scannedBoxes }}
              </div>
            </div>
            <div>
              <span class="text-muted-foreground">商品行数</span>
              <div class="font-medium">{{ order.lines?.length || 0 }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 差异核对 / 差異確認 -->
      <div v-if="order.status === 'confirmed'" class="rounded-lg border bg-card shadow-sm" style="margin-bottom: 16px">
        <div class="border-b px-4 py-3">数量照合（差異がある場合は実数を修正） / 数量核对（如有差异请修改实收数量）</div>
        <div class="p-4">
          <div class="rounded-md border overflow-auto">
            <Table class="w-full text-sm">
              <TableHeader>
                <TableRow class="border-b bg-muted/50">
                  <TableHead class="h-8 px-2 text-left font-medium text-muted-foreground" style="width: 150px">SKU</TableHead>
                  <TableHead class="h-8 px-2 text-left font-medium text-muted-foreground">商品名</TableHead>
                  <TableHead class="h-8 px-2 text-left font-medium text-muted-foreground" style="width: 80px">予定数</TableHead>
                  <TableHead class="h-8 px-2 text-left font-medium text-muted-foreground" style="width: 120px">実数</TableHead>
                  <TableHead class="h-8 px-2 text-left font-medium text-muted-foreground" style="width: 80px">差異</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="(row, $index) in varianceDetails" :key="row.sku" class="border-b hover:bg-muted/50">
                  <TableCell class="p-2">{{ row.sku }}</TableCell>
                  <TableCell class="p-2">{{ row.productName }}</TableCell>
                  <TableCell class="p-2">{{ row.expectedQuantity }}</TableCell>
                  <TableCell class="p-2">
                    <Input v-model.number="row.actualQuantity" type="number" min="0" class="flex h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm" @change="updateVariance($index)" />
                  </TableCell>
                  <TableCell class="p-2">
                    <span :style="{ color: row.variance !== 0 ? '#f56c6c' : '#67c23a' }">
                      {{ row.variance > 0 ? '+' : '' }}{{ row.variance }}
                    </span>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px">
            <Button class="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 border border-input bg-background hover:bg-accent" @click="reset">リセット</Button>
            <Button class="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/90" :disabled="submitting" @click="submitArrive">
              {{ submitting ? '処理中...' : '受付完了 → 一時保管エリア' }}
            </Button>
          </div>
        </div>
      </div>

      <!-- 受付完了 / 受付完了 -->
      <div v-else class="rounded-lg border bg-card shadow-sm p-8 text-center">
        <div class="text-green-600 text-4xl mb-4">✓</div>
        <h3 class="text-lg font-semibold">受付完了</h3>
        <p class="text-muted-foreground mt-1">ステータス: {{ order.status }}</p>
        <div class="mt-4">
          <Button class="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/90" @click="reset">次の受付へ</Button>
        </div>
      </div>
    </template>

    <div v-else-if="!loading" class="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <p>入庫予約番号をスキャンしてください</p>
    </div>
  </div>
</template>
