<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { http } from '@/api/http'

const orders = ref<any[]>([])
const total = ref(0)
const loading = ref(false)
const statusFilter = ref('')

const statusOptions = [
  { value: '', label: '全部' },
  { value: 'confirmed', label: '待到货' },
  { value: 'arrived', label: '已受付' },
  { value: 'processing', label: '作业中' },
  { value: 'awaiting_label', label: 'FBA标待传' },
  { value: 'ready_to_ship', label: '待出货' },
  { value: 'shipped', label: '已出货' },
]

async function load() {
  loading.value = true
  try {
    const params = new URLSearchParams({ limit: '50' })
    if (statusFilter.value) params.set('status', statusFilter.value)
    const res: any = await http.get(`/passthrough?${params}`)
    orders.value = res.data || []
    total.value = res.total || 0
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

onMounted(load)
</script>

<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
      <h2 style="margin: 0">全部通过型预定 ({{ total }})</h2>
      <el-select v-model="statusFilter" style="width: 150px" @change="load" clearable placeholder="状态筛选">
        <el-option v-for="s in statusOptions" :key="s.value" :label="s.label" :value="s.value" />
      </el-select>
    </div>

    <el-table :data="orders" v-loading="loading" stripe size="small">
      <el-table-column prop="orderNumber" label="预定号" width="150" />
      <el-table-column label="状态" width="110">
        <template #default="{ row }">
          <el-tag :type="row.status === 'shipped' ? 'success' : row.status === 'awaiting_label' ? 'danger' : row.status === 'processing' ? 'warning' : ''" size="small">
            {{ statusOptions.find(s => s.value === row.status)?.label || row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="目的地" width="70">
        <template #default="{ row }">{{ (row.destinationType || '').toUpperCase() }}</template>
      </el-table-column>
      <el-table-column prop="totalBoxCount" label="箱数" width="60" />
      <el-table-column label="商品数" width="70">
        <template #default="{ row }">{{ row.lines?.reduce((s: number, l: any) => s + l.expectedQuantity, 0) || 0 }}</template>
      </el-table-column>
      <el-table-column label="预估费用" width="100">
        <template #default="{ row }">
          ¥{{ (row.serviceOptions?.reduce((s: number, o: any) => s + (o.actualCost || o.estimatedCost || 0), 0) || 0).toLocaleString() }}
        </template>
      </el-table-column>
      <el-table-column label="客户" width="160">
        <template #default="{ row }">{{ row.clientName || '--' }}</template>
      </el-table-column>
      <el-table-column label="创建日" width="100">
        <template #default="{ row }">{{ new Date(row.createdAt).toLocaleDateString() }}</template>
      </el-table-column>
    </el-table>
  </div>
</template>
