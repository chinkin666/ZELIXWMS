<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { usePortalAuthStore } from '@/stores/auth'
import { http } from '@/api/http'

const { t } = useI18n()
const router = useRouter()
const auth = usePortalAuthStore()

const loading = ref(false)
const dashboard = ref<any>(null)

async function load() {
  loading.value = true
  try {
    const clientId = auth.user?.clientId || ''
    const qs = clientId ? `?clientId=${clientId}` : ''
    dashboard.value = await http.get(`/portal/dashboard${qs}`)
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div v-loading="loading">
    <h2 style="margin: 0 0 24px">
      {{ t('dashboard.welcome') }}{{ dashboard?.client?.name ? `，${dashboard.client.name}` : (auth.user?.displayName ? `，${auth.user.displayName}` : '') }}
    </h2>

    <!-- KPI カード / KPI 卡片 -->
    <el-row :gutter="16" style="margin-bottom: 24px">
      <el-col :span="6">
        <el-card shadow="hover">
          <div style="font-size: 14px; color: #909399">{{ t('dashboard.inProgress') }}</div>
          <div style="font-size: 28px; font-weight: bold; margin-top: 8px">{{ dashboard?.stats?.inProgress ?? '--' }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div style="font-size: 14px; color: #909399">{{ t('dashboard.pending') }}</div>
          <div style="font-size: 28px; font-weight: bold; margin-top: 8px; color: #e6a23c">{{ dashboard?.stats?.pending ?? '--' }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div style="font-size: 14px; color: #909399">{{ t('dashboard.monthlyFee') }}</div>
          <div style="font-size: 28px; font-weight: bold; margin-top: 8px">¥{{ (dashboard?.stats?.monthlyFee || 0).toLocaleString() }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div style="font-size: 14px; color: #909399">{{ t('dashboard.creditUsage') }}</div>
          <div style="font-size: 28px; font-weight: bold; margin-top: 8px">{{ dashboard?.client?.creditUsage || '0' }}%</div>
          <el-progress
            :percentage="Number(dashboard?.client?.creditUsage || 0)"
            :stroke-width="4"
            :show-text="false"
            :color="Number(dashboard?.client?.creditUsage || 0) > 80 ? '#f56c6c' : '#67c23a'"
            style="margin-top: 8px"
          />
        </el-card>
      </el-col>
    </el-row>

    <!-- 需要处理 / 対応が必要 -->
    <el-card v-if="dashboard?.needsAttention?.length" style="margin-bottom: 16px">
      <template #header>
        <span style="color: #e6a23c">{{ t('dashboard.needsAttention') }} ({{ dashboard.needsAttention.length }})</span>
      </template>
      <div
        v-for="(item, idx) in dashboard.needsAttention"
        :key="idx"
        style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f5f5f5; cursor: pointer"
        @click="router.push(`/inbound/${item.orderId}`)"
      >
        <div>
          <el-tag :type="item.type === 'awaiting_label' ? 'danger' : 'warning'" size="small" style="margin-right: 8px">
            {{ item.type === 'awaiting_label' ? 'FBA標' : '差異' }}
          </el-tag>
          <span>{{ item.orderNumber }} — {{ item.message }}</span>
        </div>
        <span style="color: #909399; font-size: 12px">{{ new Date(item.date).toLocaleDateString() }}</span>
      </div>
    </el-card>

    <!-- 最近入庫予約 / 最近入库预定 -->
    <el-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span>{{ t('dashboard.recentOrders') }}</span>
          <el-button text type="primary" @click="router.push('/inbound')">全部查看</el-button>
        </div>
      </template>
      <el-table v-if="dashboard?.recentOrders?.length" :data="dashboard.recentOrders" size="small"
        @row-click="(row: any) => router.push(`/inbound/${row._id}`)">
        <el-table-column prop="orderNumber" label="预定号" width="150" />
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="row.status === 'shipped' ? 'success' : row.status === 'awaiting_label' ? 'danger' : ''" size="small">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="目的地" width="70">
          <template #default="{ row }">{{ (row.destinationType || '').toUpperCase() }}</template>
        </el-table-column>
        <el-table-column prop="totalBoxCount" label="箱数" width="60" />
        <el-table-column label="费用" width="100">
          <template #default="{ row }">¥{{ (row.estimatedCost || 0).toLocaleString() }}</template>
        </el-table-column>
        <el-table-column label="日期" width="100">
          <template #default="{ row }">{{ new Date(row.createdAt).toLocaleDateString() }}</template>
        </el-table-column>
      </el-table>
      <el-empty v-else :description="t('common.noData')" />
    </el-card>
  </div>
</template>
