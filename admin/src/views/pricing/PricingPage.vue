<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { http } from '@/api/http'

const route = useRoute()
const clientId = route.params.id as string
const client = ref<any>(null)
const rates = ref<any[]>([])
const loading = ref(false)

async function loadData() {
  loading.value = true
  try {
    const [clientRes, ratesRes]: any[] = await Promise.all([
      http.get(`/clients/${clientId}`),
      http.get(`/service-rates?clientId=${clientId}&limit=100`),
    ])
    client.value = clientRes
    rates.value = ratesRes.data || ratesRes || []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>

<template>
  <div>
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px">
      <el-button @click="$router.back()">返回</el-button>
      <h2 style="margin: 0">价格目录: {{ client?.name || '...' }}</h2>
    </div>

    <el-table :data="rates" v-loading="loading" stripe>
      <el-table-column prop="chargeType" label="费用类型" width="180" />
      <el-table-column prop="name" label="名称" />
      <el-table-column prop="unit" label="单位" width="120" />
      <el-table-column prop="unitPrice" label="单价（円）" width="120">
        <template #default="{ row }">¥{{ row.unitPrice?.toLocaleString() || '0' }}</template>
      </el-table-column>
      <el-table-column prop="isActive" label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.isActive ? 'success' : 'info'" size="small">
            {{ row.isActive ? '有效' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && rates.length === 0" description="暂无价格设定，请添加费率" />
  </div>
</template>
