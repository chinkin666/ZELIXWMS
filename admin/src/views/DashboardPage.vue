<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { http } from '@/api/http'

const router = useRouter()
const loading = ref(false)
const data = ref<any>(null)

async function load() {
  loading.value = true
  try {
    data.value = await http.get('/admin/dashboard')
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

onMounted(load)

const statusLabels: Record<string, string> = {
  confirmed: '待到货',
  arrived: '已受付',
  processing: '作业中',
  awaiting_label: 'FBA标待传',
  ready_to_ship: '待出货',
  shipped: '已出货',
  done: '完结',
}
</script>

<template>
  <div v-loading="loading">
    <h2 style="margin: 0 0 24px">Platform Dashboard</h2>

    <el-row :gutter="16" style="margin-bottom: 24px">
      <el-col :span="6">
        <el-card shadow="hover">
          <div style="color: #909399">全客户数</div>
          <div style="font-size: 32px; font-weight: bold; margin-top: 8px">{{ data?.stats?.activeClientCount ?? '--' }}</div>
          <div style="font-size: 12px; color: #909399">总计 {{ data?.stats?.clientCount ?? '--' }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div style="color: #909399">全仓库数</div>
          <div style="font-size: 32px; font-weight: bold; margin-top: 8px">{{ data?.stats?.warehouseCount ?? '--' }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div style="color: #909399">本月营收</div>
          <div style="font-size: 32px; font-weight: bold; margin-top: 8px; color: #67c23a">
            ¥{{ (data?.stats?.monthlyRevenue || 0).toLocaleString() }}
          </div>
          <div style="font-size: 12px; color: #909399">{{ data?.stats?.chargeCount ?? 0 }} 笔</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div style="color: #909399">活跃预定</div>
          <div style="font-size: 32px; font-weight: bold; margin-top: 8px; color: #409eff">{{ data?.stats?.activeOrders ?? '--' }}</div>
          <div style="font-size: 12px; color: #909399">本月出货 {{ data?.stats?.shippedThisMonth ?? 0 }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <el-col :span="12">
        <el-card style="margin-bottom: 16px">
          <template #header>客户营收排名（本月）</template>
          <el-table v-if="data?.revenueByClient?.length" :data="data.revenueByClient" size="small">
            <el-table-column prop="clientName" label="客户" />
            <el-table-column label="营收" width="120">
              <template #default="{ row }">¥{{ row.total.toLocaleString() }}</template>
            </el-table-column>
            <el-table-column prop="count" label="笔数" width="70" />
          </el-table>
          <el-empty v-else description="暂无数据" :image-size="40" />
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card style="margin-bottom: 16px">
          <template #header>预定状态分布</template>
          <div v-if="data?.ordersByStatus" style="display: flex; flex-wrap: wrap; gap: 12px">
            <div v-for="(count, status) in data.ordersByStatus" :key="status"
              style="text-align: center; padding: 12px 16px; background: #f5f7fa; border-radius: 8px; min-width: 80px">
              <div style="font-size: 24px; font-weight: bold">{{ count }}</div>
              <div style="font-size: 12px; color: #909399">{{ statusLabels[String(status)] || status }}</div>
            </div>
          </div>
          <el-empty v-else description="暂无数据" :image-size="40" />
        </el-card>
      </el-col>
    </el-row>

    <el-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span>最近客户</span>
          <el-button text type="primary" @click="router.push('/clients')">查看全部</el-button>
        </div>
      </template>
      <el-table v-if="data?.recentClients?.length" :data="data.recentClients" size="small"
        @row-click="(row: any) => router.push(`/clients/${row._id}/sub-clients`)">
        <el-table-column prop="clientCode" label="编号" width="100" />
        <el-table-column prop="name" label="名称" />
        <el-table-column prop="clientType" label="类型" width="120" />
        <el-table-column prop="creditTier" label="信用" width="80" />
        <el-table-column label="门户" width="60">
          <template #default="{ row }">
            <el-tag :type="row.portalEnabled ? 'success' : 'info'" size="small">{{ row.portalEnabled ? 'ON' : 'OFF' }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>
