<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { listOrders, type PassthroughOrder } from '@/api/passthrough'

const { t } = useI18n()
const router = useRouter()

const orders = ref<PassthroughOrder[]>([])
const total = ref(0)
const loading = ref(false)
const statusFilter = ref('')

const statusOptions = [
  { value: '', label: '全部' },
  { value: 'confirmed', label: '待到货' },
  { value: 'arrived', label: '已受付' },
  { value: 'processing', label: '作业中' },
  { value: 'awaiting_label', label: 'FBA标待上传' },
  { value: 'ready_to_ship', label: '待出货' },
  { value: 'shipped', label: '已出货' },
  { value: 'done', label: '完结' },
]

const statusTagType: Record<string, string> = {
  confirmed: 'info',
  arrived: 'warning',
  processing: '',
  awaiting_label: 'danger',
  ready_to_ship: 'success',
  shipped: 'success',
  done: 'info',
}

async function load() {
  loading.value = true
  try {
    const params: Record<string, string> = { limit: '50' }
    if (statusFilter.value) params.status = statusFilter.value
    const res = await listOrders(params)
    orders.value = res.data || []
    total.value = res.total || 0
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

function getStatusLabel(status: string) {
  return statusOptions.find((o) => o.value === status)?.label || status
}

onMounted(load)
</script>

<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
      <h2 style="margin: 0">{{ t('inbound.title') }}</h2>
      <div style="display: flex; gap: 8px">
        <el-select v-model="statusFilter" style="width: 160px" @change="load">
          <el-option v-for="opt in statusOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>
        <el-button type="primary" @click="router.push('/inbound/new')">{{ t('inbound.createOrder') }}</el-button>
      </div>
    </div>

    <el-table :data="orders" v-loading="loading" stripe @row-click="(row: any) => router.push(`/inbound/${row._id}`)">
      <el-table-column prop="orderNumber" :label="t('inbound.orderNumber')" width="160" />
      <el-table-column :label="t('inbound.status')" width="130">
        <template #default="{ row }">
          <el-tag :type="(statusTagType[row.status] as any) || 'info'" size="small">
            {{ getStatusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="目的地" width="80">
        <template #default="{ row }">
          {{ (row.destinationType || '').toUpperCase() }}
        </template>
      </el-table-column>
      <el-table-column prop="totalBoxCount" :label="t('inbound.boxCount')" width="80" />
      <el-table-column label="商品数" width="80">
        <template #default="{ row }">
          {{ row.lines?.reduce((s: number, l: any) => s + l.expectedQuantity, 0) || 0 }}
        </template>
      </el-table-column>
      <el-table-column :label="t('inbound.estimatedCost')" width="120">
        <template #default="{ row }">
          ¥{{ (row.serviceOptions?.reduce((s: number, o: any) => s + (o.estimatedCost || 0), 0) || 0).toLocaleString() }}
        </template>
      </el-table-column>
      <el-table-column label="预定日" width="110">
        <template #default="{ row }">
          {{ row.expectedDate ? new Date(row.expectedDate).toLocaleDateString() : '--' }}
        </template>
      </el-table-column>
      <el-table-column label="创建日" width="110">
        <template #default="{ row }">
          {{ new Date(row.createdAt).toLocaleDateString() }}
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>
