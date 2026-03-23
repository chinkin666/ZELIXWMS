<script setup lang="ts">
import { Input } from '@/components/ui/input'
/**
 * 通過型出荷マッチング / 通过型出货匹配
 *
 * FBA外箱標と配送伝票を紐付けて出荷完了にする。
 * FBA外箱标与快递单匹配后完成出货。
 */
import { ref, onMounted } from 'vue'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/composables/useToast'
import { getApiBaseUrl } from '@/api/base'
import { useWmsUserStore } from '@/stores/wms/useWmsUserStore'
import { Button } from '@/components/ui/button'

const userStore = useWmsUserStore()
const { showSuccess, showError, showWarning } = useToast()
const baseUrl = getApiBaseUrl()

const orders = ref<any[]>([])
const loading = ref(false)

async function loadOrders() {
  loading.value = true
  try {
    const res = await fetch(
      `${baseUrl}/passthrough?status=ready_to_ship&limit=50`,
      { headers: { Authorization: `Bearer ${userStore.token}` } },
    )
    const data = await res.json()
    orders.value = (data.data || []).map((o: any) => ({
      ...o,
      trackingInput: [{ boxNumber: '', trackingNumber: '', carrier: '' }],
    }))
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

function addTracking(order: any) {
  order.trackingInput.push({ boxNumber: '', trackingNumber: '', carrier: '' })
}

async function submitShip(order: any) {
  const trackingNumbers = order.trackingInput.filter((t: any) => t.trackingNumber.trim())
  if (trackingNumbers.length === 0) {
    showWarning('追跡番号を入力してください / 请输入追踪号')
    return
  }

  try {
    const res = await fetch(`${baseUrl}/passthrough/${order._id}/ship`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userStore.token}`,
      },
      body: JSON.stringify({ trackingNumbers }),
    })
    if (res.ok) {
      showSuccess(`${order.orderNumber} 出荷完了 / 出货完成`)
      await loadOrders()
    } else {
      const data = await res.json()
      showError(data.message || '出荷に失敗')
    }
  } catch (e: any) {
    showError(e.message)
  }
}

onMounted(loadOrders)
</script>

<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
      <h2 style="margin: 0">出荷マッチング / 出货匹配</h2>
      <Button class="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 border border-input bg-background hover:bg-accent hover:text-accent-foreground" @click="loadOrders">
        {{ loading ? '読み込み中...' : '更新' }}
      </Button>
    </div>

    <div v-for="order in orders" :key="order._id" style="margin-bottom: 16px">
      <div class="rounded-lg border bg-card shadow-sm">
        <div class="border-b px-4 py-3">
          <div style="display: flex; justify-content: space-between; align-items: center">
            <div>
              {{ order.orderNumber }} — {{ (order.destinationType || '').toUpperCase() }}
              <span v-if="order.fbaInfo?.destinationFc" style="color: #909399; margin-left: 8px">
                FC: {{ order.fbaInfo.destinationFc }}
              </span>
            </div>
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">{{ order.totalBoxCount || '--' }} 箱</span>
          </div>
        </div>
        <div class="p-4">
          <!-- FBA ラベル状態 / FBA标状态 -->
          <div v-if="order.fbaInfo?.splitLabels?.length" style="margin-bottom: 12px">
            <span style="font-size: 13px; color: #606266">FBA ラベル: {{ order.fbaInfo.splitLabels.length }} 枚拆分済</span>
          </div>

          <!-- 追踪号入力 / 追踪号输入 -->
          <div style="margin-bottom: 12px">
            <div style="font-size: 13px; color: #606266; margin-bottom: 8px">追跡番号:</div>
            <div v-for="(t, idx) in order.trackingInput" :key="idx" style="display: flex; gap: 8px; margin-bottom: 8px">
              <Input v-model="t.boxNumber" placeholder="箱号(任意)" class="flex h-8 rounded-md border border-input bg-transparent px-3 py-1 text-sm" style="width: 100px" />
              <Input v-model="t.trackingNumber" placeholder="追跡番号" class="flex h-8 rounded-md border border-input bg-transparent px-3 py-1 text-sm" style="flex: 1" />
              <Input v-model="t.carrier" placeholder="承運商" class="flex h-8 rounded-md border border-input bg-transparent px-3 py-1 text-sm" style="width: 100px" />
            </div>
            <Button class="text-sm text-primary hover:underline" @click="addTracking(order)">+ 追加</Button>
          </div>

          <div style="display: flex; justify-content: flex-end">
            <Button class="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/90" @click="submitShip(order)">出荷完了</Button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!loading && orders.length === 0" class="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <p>出荷待ちの予約はありません / 没有待出货的预定</p>
    </div>
  </div>
</template>
