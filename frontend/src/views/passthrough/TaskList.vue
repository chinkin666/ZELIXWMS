<script setup lang="ts">
/**
 * 通過型作業タスク一覧 / 通过型作业任务列表
 *
 * 受付済みの入庫予約の作業オプションを表示し、作業完了を記録する。
 * 显示已受付的入库预定的作业选项，记录作业完成。
 */
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getApiBaseUrl } from '@/api/base'
import { useWmsUserStore } from '@/stores/wms/useWmsUserStore'

const router = useRouter()
const userStore = useWmsUserStore()
const baseUrl = getApiBaseUrl()

const orders = ref<any[]>([])
const loading = ref(false)

async function loadOrders() {
  loading.value = true
  try {
    const res = await fetch(
      `${baseUrl}/passthrough?status=processing&limit=50`,
      { headers: { Authorization: `Bearer ${userStore.token}` } },
    )
    const data = await res.json()
    orders.value = data.data || []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

// 作业完成实际数量输入 / 作業完了実数量入力
const completingOrder = ref<string | null>(null)
const completingOption = ref('')
const actualQuantity = ref(0)
const submitting = ref(false)

function startComplete(orderId: string, optionCode: string, qty: number) {
  completingOrder.value = orderId
  completingOption.value = optionCode
  actualQuantity.value = qty
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
      ElMessage.success('作業完了 / 作业完成')
      completingOrder.value = null
      await loadOrders()
    } else {
      const data = await res.json()
      ElMessage.error(data.message || '失敗')
    }
  } catch (e: any) {
    ElMessage.error(e.message)
  } finally {
    submitting.value = false
  }
}

onMounted(loadOrders)
</script>

<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
      <h2 style="margin: 0">通過型作業タスク / 通过型作业任务</h2>
      <el-button @click="loadOrders" :loading="loading">更新</el-button>
    </div>

    <div v-for="order in orders" :key="order._id" style="margin-bottom: 16px">
      <el-card>
        <template #header>
          <div style="display: flex; justify-content: space-between; align-items: center">
            <span>{{ order.orderNumber }} — {{ (order.destinationType || '').toUpperCase() }}</span>
            <div style="display: flex; gap: 4px; align-items: center">
              <el-button text size="small" @click.stop="router.push(`/passthrough/inspection/${order._id}`)">検品</el-button>
              <el-button text size="small" @click.stop="router.push(`/passthrough/boxes/${order._id}`)">FBA箱</el-button>
              <el-tag size="small">{{ order.status }}</el-tag>
            </div>
          </div>
        </template>

        <el-table :data="order.serviceOptions || []" size="small">
          <el-table-column prop="optionName" label="作業" />
          <el-table-column label="状態" width="100">
            <template #default="{ row }">
              <el-tag
                :type="row.status === 'completed' ? 'success' : row.status === 'in_progress' ? 'warning' : 'info'"
                size="small"
              >
                {{ row.status === 'completed' ? '完了' : row.status === 'in_progress' ? '進行中' : '待機' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="数量" width="100">
            <template #default="{ row }">{{ row.actualQuantity ?? '--' }} / {{ row.quantity }}</template>
          </el-table-column>
          <el-table-column label="操作" width="120">
            <template #default="{ row }">
              <el-button
                v-if="row.status !== 'completed'"
                type="primary"
                size="small"
                @click="startComplete(order._id, row.optionCode, row.quantity)"
              >
                完了
              </el-button>
              <el-tag v-else type="success" size="small">済</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <el-empty v-if="!loading && orders.length === 0" description="作業中の予約はありません / 没有作业中的预定" />

    <!-- 完了ダイアログ / 完成对话框 -->
    <el-dialog v-model="completingOrder" title="作業完了 / 作业完成" width="400px" :close-on-click-modal="false" @close="completingOrder = null">
      <el-form label-width="100px">
        <el-form-item label="作業">{{ completingOption }}</el-form-item>
        <el-form-item label="実数量">
          <el-input-number v-model="actualQuantity" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="completingOrder = null">キャンセル</el-button>
        <el-button type="primary" :loading="submitting" @click="submitComplete">完了</el-button>
      </template>
    </el-dialog>
  </div>
</template>
