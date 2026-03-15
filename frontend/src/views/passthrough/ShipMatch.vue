<script setup lang="ts">
/**
 * 通過型出荷マッチング / 通过型出货匹配
 *
 * FBA外箱標と配送伝票を紐付けて出荷完了にする。
 * FBA外箱标与快递单匹配后完成出货。
 */
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getApiBaseUrl } from '@/api/base'
import { useWmsUserStore } from '@/stores/wms/useWmsUserStore'

const userStore = useWmsUserStore()
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
    ElMessage.warning('追跡番号を入力してください / 请输入追踪号')
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
      ElMessage.success(`${order.orderNumber} 出荷完了 / 出货完成`)
      await loadOrders()
    } else {
      const data = await res.json()
      ElMessage.error(data.message || '出荷に失敗')
    }
  } catch (e: any) {
    ElMessage.error(e.message)
  }
}

onMounted(loadOrders)
</script>

<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
      <h2 style="margin: 0">出荷マッチング / 出货匹配</h2>
      <el-button @click="loadOrders" :loading="loading">更新</el-button>
    </div>

    <div v-for="order in orders" :key="order._id" style="margin-bottom: 16px">
      <el-card>
        <template #header>
          <div style="display: flex; justify-content: space-between; align-items: center">
            <div>
              {{ order.orderNumber }} — {{ (order.destinationType || '').toUpperCase() }}
              <span v-if="order.fbaInfo?.destinationFc" style="color: #909399; margin-left: 8px">
                FC: {{ order.fbaInfo.destinationFc }}
              </span>
            </div>
            <el-tag type="success" size="small">{{ order.totalBoxCount || '--' }} 箱</el-tag>
          </div>
        </template>

        <!-- FBA ラベル状態 / FBA标状态 -->
        <div v-if="order.fbaInfo?.splitLabels?.length" style="margin-bottom: 12px">
          <span style="font-size: 13px; color: #606266">FBA ラベル: {{ order.fbaInfo.splitLabels.length }} 枚拆分済</span>
        </div>

        <!-- 追踪号入力 / 追踪号输入 -->
        <div style="margin-bottom: 12px">
          <div style="font-size: 13px; color: #606266; margin-bottom: 8px">追跡番号:</div>
          <div v-for="(t, idx) in order.trackingInput" :key="idx" style="display: flex; gap: 8px; margin-bottom: 8px">
            <el-input v-model="t.boxNumber" placeholder="箱号(任意)" style="width: 100px" size="small" />
            <el-input v-model="t.trackingNumber" placeholder="追跡番号" style="flex: 1" size="small" />
            <el-input v-model="t.carrier" placeholder="承運商" style="width: 100px" size="small" />
          </div>
          <el-button text type="primary" size="small" @click="addTracking(order)">+ 追加</el-button>
        </div>

        <div style="display: flex; justify-content: flex-end">
          <el-button type="primary" @click="submitShip(order)">出荷完了</el-button>
        </div>
      </el-card>
    </div>

    <el-empty v-if="!loading && orders.length === 0" description="出荷待ちの予約はありません / 没有待出货的预定" />
  </div>
</template>
