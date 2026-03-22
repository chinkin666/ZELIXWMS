<script setup lang="ts">
/**
 * 暫存エリアダッシュボード / 暂存区看板
 *
 * 当前暂存货物总览：停留时间分布、客户别汇总、超时预警
 * 現在の一時保管貨物概要：滞留時間分布、顧客別集計、超過警告
 */
import { ref, onMounted } from 'vue'
import { getApiBaseUrl } from '@/api/base'
import { useWmsUserStore } from '@/stores/wms/useWmsUserStore'

const userStore = useWmsUserStore()
const baseUrl = getApiBaseUrl()

const dashboard = ref<any>(null)
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const res = await fetch(`${baseUrl}/passthrough/staging`, {
      headers: { Authorization: `Bearer ${userStore.token}` },
    })
    if (res.ok) {
      const json = await res.json()
      // バックエンドが data でラップする場合の対応 / 兼容后端用 data 包装的情况
      const raw = json?.data ?? json
      dashboard.value = {
        totalOrders: raw?.totalOrders ?? 0,
        totalBoxes: raw?.totalBoxes ?? 0,
        byDuration: raw?.byDuration ?? { under24h: 0, under48h: 0, under72h: 0, over72h: 0 },
        alerts: raw?.alerts ?? [],
        byClient: raw?.byClient ?? {},
      }
    } else {
      // エンドポイント未実装時はデフォルト値を設定 / 端点未实装时设置默认值
      dashboard.value = { totalOrders: 0, totalBoxes: 0, byDuration: { under24h: 0, under48h: 0, under72h: 0, over72h: 0 }, alerts: [], byClient: {} }
    }
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
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
      <h2 style="margin: 0">暫存エリア / 暂存区看板</h2>
      <el-button @click="load">更新</el-button>
    </div>

    <template v-if="dashboard">
      <!-- KPI -->
      <el-row :gutter="16" style="margin-bottom: 24px">
        <el-col :span="6">
          <el-card shadow="hover">
            <div style="color: #909399">暂存中</div>
            <div style="font-size: 32px; font-weight: bold">{{ dashboard.totalOrders ?? 0 }}</div>
            <div style="font-size: 13px; color: #909399">{{ dashboard.totalBoxes ?? 0 }} 箱</div>
          </el-card>
        </el-col>
        <el-col :span="4">
          <el-card shadow="hover">
            <div style="color: #67c23a">&lt;24h</div>
            <div style="font-size: 28px; font-weight: bold">{{ dashboard.byDuration?.under24h ?? 0 }}</div>
          </el-card>
        </el-col>
        <el-col :span="4">
          <el-card shadow="hover">
            <div style="color: #e6a23c">24-48h</div>
            <div style="font-size: 28px; font-weight: bold">{{ dashboard.byDuration?.under48h ?? 0 }}</div>
          </el-card>
        </el-col>
        <el-col :span="4">
          <el-card shadow="hover">
            <div style="color: #f56c6c">48-72h</div>
            <div style="font-size: 28px; font-weight: bold">{{ dashboard.byDuration?.under72h ?? 0 }}</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" :body-style="{ background: (dashboard.byDuration?.over72h ?? 0) > 0 ? '#fef0f0' : '' }">
            <div style="color: #f56c6c; font-weight: bold">&gt;72h ⚠</div>
            <div style="font-size: 28px; font-weight: bold; color: #f56c6c">{{ dashboard.byDuration?.over72h ?? 0 }}</div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 超时预警 / 超過警告 -->
      <el-card v-if="dashboard.alerts?.length" style="margin-bottom: 16px">
        <template #header>
          <span style="color: #f56c6c">超時預警 / 超时预警 (>72h)</span>
        </template>
        <el-table :data="dashboard.alerts" size="small">
          <el-table-column prop="orderNumber" label="予約番号" width="160" />
          <el-table-column prop="reason" label="原因" />
          <el-table-column label="滞留" width="100">
            <template #default="{ row }">
              <span style="color: #f56c6c; font-weight: bold">{{ row.hours }}h</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100">
            <template #default="{ row }">
              <el-button text type="primary" size="small" @click="$router.push('/passthrough/tasks')">対応</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- 客户别汇总 / 顧客別集計 -->
      <el-card>
        <template #header>顧客別集計 / 客户别汇总</template>
        <el-table
          :data="Object.entries(dashboard.byClient || {}).map(([id, v]: any) => ({ id, ...v }))"
          size="small"
        >
          <el-table-column prop="id" label="客户ID" />
          <el-table-column prop="orders" label="预定数" width="100" />
          <el-table-column prop="boxes" label="箱数" width="100" />
        </el-table>
        <el-empty v-if="!Object.keys(dashboard.byClient || {}).length" description="暂无" :image-size="40" />
      </el-card>
    </template>
  </div>
</template>
