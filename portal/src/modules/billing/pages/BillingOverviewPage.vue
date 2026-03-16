<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePortalAuthStore } from '@/stores/auth'
import { http } from '@/api/http'

const { t } = useI18n()
const auth = usePortalAuthStore()

const loading = ref(false)
const charges = ref<any[]>([])
const total = ref(0)
const client = ref<any>(null)
const period = ref(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`)

async function load() {
  loading.value = true
  try {
    const clientId = auth.user?.clientId || ''
    const [chargeRes, clientRes] = await Promise.all([
      http.get<any>(`/work-charges?clientId=${clientId}&billingPeriod=${period.value}&limit=100`),
      clientId ? http.get<any>(`/clients/${clientId}`) : Promise.resolve(null),
    ])
    charges.value = chargeRes.data || []
    total.value = chargeRes.total || 0
    client.value = clientRes
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const totalAmount = () => charges.value.reduce((s: number, c: any) => s + (c.amount || 0), 0)

// 按子客户/店铺分组 / サブ顧客・店舗別グループ
const bySubClient = () => {
  const map: Record<string, { name: string; amount: number; count: number }> = {}
  for (const c of charges.value) {
    const key = c.subClientName || c.subClientId || '(直接)'
    if (!map[key]) map[key] = { name: key, amount: 0, count: 0 }
    map[key].amount += c.amount || 0
    map[key].count++
  }
  return Object.values(map).sort((a, b) => b.amount - a.amount)
}

onMounted(load)
</script>

<template>
  <div v-loading="loading">
    <h2 style="margin: 0 0 24px">{{ t('billing.title') }}</h2>

    <!-- 期间选择 / 期間選択 -->
    <div style="margin-bottom: 16px">
      <el-date-picker v-model="period" type="month" format="YYYY-MM" value-format="YYYY-MM" @change="load" />
    </div>

    <!-- KPI -->
    <el-row :gutter="16" style="margin-bottom: 24px">
      <el-col :span="8">
        <el-card shadow="hover">
          <div style="font-size: 14px; color: #909399">{{ t('billing.creditLimit') }}</div>
          <div style="font-size: 28px; font-weight: bold; margin-top: 8px">¥{{ (client?.creditLimit || 0).toLocaleString() }}</div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <div style="font-size: 14px; color: #909399">{{ t('billing.currentBalance') }}</div>
          <div style="font-size: 28px; font-weight: bold; margin-top: 8px">¥{{ (client?.currentBalance || 0).toLocaleString() }}</div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <div style="font-size: 14px; color: #909399">{{ period }} 合計</div>
          <div style="font-size: 28px; font-weight: bold; margin-top: 8px">¥{{ totalAmount().toLocaleString() }}</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 子客户别汇总 / サブ顧客別集計 -->
    <el-card v-if="bySubClient().length > 1" style="margin-bottom: 16px">
      <template #header>按子客户/分公司拆分</template>
      <el-table :data="bySubClient()" size="small">
        <el-table-column prop="name" label="子客户" />
        <el-table-column prop="count" label="件数" width="80" />
        <el-table-column label="金额" width="120">
          <template #default="{ row }">¥{{ row.amount.toLocaleString() }}</template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 费用明细 / 費用明細 -->
    <el-card>
      <template #header>{{ t('billing.details') }} ({{ total }}件)</template>
      <el-table :data="charges" size="small">
        <el-table-column label="日期" width="100">
          <template #default="{ row }">{{ new Date(row.chargeDate).toLocaleDateString() }}</template>
        </el-table-column>
        <el-table-column prop="referenceNumber" label="预定号" width="150" />
        <el-table-column prop="chargeType" label="费用类型" width="140" />
        <el-table-column prop="description" label="说明" />
        <el-table-column prop="quantity" label="数量" width="70" />
        <el-table-column label="单价" width="80">
          <template #default="{ row }">¥{{ (row.unitPrice || 0).toLocaleString() }}</template>
        </el-table-column>
        <el-table-column label="金额" width="100">
          <template #default="{ row }">¥{{ (row.amount || 0).toLocaleString() }}</template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && charges.length === 0" :description="t('common.noData')" />
    </el-card>
  </div>
</template>
