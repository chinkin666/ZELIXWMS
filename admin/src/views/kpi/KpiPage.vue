<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { http } from '@/api/http'

const loading = ref(false)
const kpiData = ref<any>(null)
const period = ref(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`)

async function load() {
  loading.value = true
  try {
    kpiData.value = await http.get(`/kpi/dashboard?period=${period.value}`)
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

onMounted(load)
</script>

<template>
  <div v-loading="loading">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px">
      <h2 style="margin: 0">KPI Dashboard</h2>
      <el-date-picker v-model="period" type="month" format="YYYY-MM" value-format="YYYY-MM" @change="load" />
    </div>

    <el-row v-if="kpiData" :gutter="16">
      <el-col :span="6" v-for="kpi in kpiData.kpis" :key="kpi.name">
        <el-card shadow="hover" :body-style="{ background: kpi.met ? '#f0f9eb' : '#fef0f0' }">
          <div style="font-size: 13px; color: #606266">{{ kpi.name }}</div>
          <div style="font-size: 32px; font-weight: bold; margin: 8px 0" :style="{ color: kpi.met ? '#67c23a' : '#f56c6c' }">
            {{ kpi.display }}
          </div>
          <div style="font-size: 12px; color: #909399">
            目标: {{ kpi.targetDisplay }}
            <el-tag :type="kpi.met ? 'success' : 'danger'" size="small" style="margin-left: 8px">
              {{ kpi.met ? '达成' : '未达成' }}
            </el-tag>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card v-if="kpiData" style="margin-top: 16px">
      <template #header>数据汇总</template>
      <el-descriptions :column="3" border size="small">
        <el-descriptions-item label="入库预定数">{{ kpiData.summary.totalInbound }}</el-descriptions-item>
        <el-descriptions-item label="贴标总数">{{ kpiData.summary.totalLabeled }}</el-descriptions-item>
        <el-descriptions-item label="异常总数">{{ kpiData.summary.totalExceptions }}</el-descriptions-item>
        <el-descriptions-item label="SLA超时">{{ kpiData.summary.slaBreached }}</el-descriptions-item>
        <el-descriptions-item label="已出货">{{ kpiData.summary.shippedOrders }}</el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>
