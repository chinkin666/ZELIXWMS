<script setup lang="ts">
/**
 * 通過型受付スキャン / 通过型受付扫码
 *
 * 仓库员扫入库外箱标 → 匹配预定 → 逐箱扫描 → 差异提交 → 放入暂存区
 * 倉庫員が入庫箱ラベルをスキャン → 予約マッチ → 逐箱スキャン → 差異提出 → 一時保管
 */
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { getApiBaseUrl } from '@/api/base'
import { useWmsUserStore } from '@/stores/wms/useWmsUserStore'

const userStore = useWmsUserStore()
const baseUrl = getApiBaseUrl()

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
      ElMessage.warning('未找到匹配的入库预定 / 入庫予約が見つかりません')
    }
  } catch (e: any) {
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}

// スキャン済み箱番号の重複チェック用 / 已扫描箱号去重检查用
const scannedBoxNumbers = ref<Set<string>>(new Set())

function handleScan() {
  if (!scanInput.value.trim()) return
  if (!order.value) {
    // 初回スキャンで予約マッチ / 第一次扫码匹配预定
    fetchOrder(scanInput.value.trim())
  } else {
    const boxCode = scanInput.value.trim()
    // 重複チェック / 去重检查
    if (scannedBoxNumbers.value.has(boxCode)) {
      ElMessage.warning(`この箱は既にスキャン済みです: ${boxCode}`)
    } else {
      scannedBoxNumbers.value.add(boxCode)
      scannedBoxes.value++
      ElMessage.success(`箱 #${scannedBoxes.value} スキャン完了: ${boxCode}`)
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
      ElMessage.success('受付完了！暂存区へ移動 / 受付完了！一時保管エリアへ')
      order.value = data
    } else {
      ElMessage.error(data.message || '受付に失敗')
    }
  } catch (e: any) {
    ElMessage.error(e.message)
  } finally {
    submitting.value = false
  }
}

function reset() {
  order.value = null
  scannedBoxes.value = 0
  scannedBoxNumbers.value = new Set()
  varianceDetails.value = []
  scanInput.value = ''
}
</script>

<template>
  <div style="max-width: 900px; margin: 0 auto">
    <h2>通過型受付 / 通过型受付</h2>

    <!-- 扫码输入 / スキャン入力 -->
    <el-card style="margin-bottom: 16px">
      <el-input
        ref="scanRef"
        v-model="scanInput"
        :placeholder="order ? '箱ラベルをスキャン / 扫箱标' : '入庫予約番号をスキャン / 扫入库预定号'"
        size="large"
        autofocus
        @keyup.enter="handleScan"
      >
        <template #prefix>📦</template>
      </el-input>
    </el-card>

    <template v-if="order">
      <!-- 预定信息 / 予約情報 -->
      <el-card style="margin-bottom: 16px">
        <template #header>
          <div style="display: flex; justify-content: space-between; align-items: center">
            <span>{{ order.orderNumber }} — {{ (order.destinationType || '').toUpperCase() }}</span>
            <el-tag :type="order.status === 'confirmed' ? 'info' : 'success'">{{ order.status }}</el-tag>
          </div>
        </template>
        <el-descriptions :column="3" size="small" border>
          <el-descriptions-item label="予定箱数">{{ order.totalBoxCount || '--' }}</el-descriptions-item>
          <el-descriptions-item label="スキャン済箱数">
            <span :style="{ color: scannedBoxes !== order.totalBoxCount ? '#e6a23c' : '#67c23a', fontWeight: 'bold' }">
              {{ scannedBoxes }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="商品行数">{{ order.lines?.length || 0 }}</el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 差异核对 / 差異確認 -->
      <el-card v-if="order.status === 'confirmed'" style="margin-bottom: 16px">
        <template #header>数量照合（差異がある場合は実数を修正） / 数量核对（如有差异请修改实收数量）</template>
        <el-table :data="varianceDetails" size="small">
          <el-table-column prop="sku" label="SKU" width="150" />
          <el-table-column prop="productName" label="商品名" />
          <el-table-column prop="expectedQuantity" label="予定数" width="80" />
          <el-table-column label="実数" width="120">
            <template #default="{ row, $index }">
              <el-input-number v-model="row.actualQuantity" :min="0" size="small" @change="updateVariance($index)" />
            </template>
          </el-table-column>
          <el-table-column label="差異" width="80">
            <template #default="{ row }">
              <span :style="{ color: row.variance !== 0 ? '#f56c6c' : '#67c23a' }">
                {{ row.variance > 0 ? '+' : '' }}{{ row.variance }}
              </span>
            </template>
          </el-table-column>
        </el-table>

        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px">
          <el-button @click="reset">リセット</el-button>
          <el-button type="primary" :loading="submitting" @click="submitArrive">
            受付完了 → 一時保管エリア
          </el-button>
        </div>
      </el-card>

      <!-- 受付完了 / 受付完了 -->
      <el-card v-else>
        <el-result icon="success" title="受付完了" :sub-title="`ステータス: ${order.status}`">
          <template #extra>
            <el-button type="primary" @click="reset">次の受付へ</el-button>
          </template>
        </el-result>
      </el-card>
    </template>

    <el-empty v-else-if="!loading" description="入庫予約番号をスキャンしてください" />
  </div>
</template>
