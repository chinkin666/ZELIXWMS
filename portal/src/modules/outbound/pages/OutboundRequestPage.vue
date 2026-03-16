<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { usePortalAuthStore } from '@/stores/auth'
import { http } from '@/api/http'

const { t } = useI18n()
const auth = usePortalAuthStore()

const requests = ref<any[]>([])
const loading = ref(false)

const showDialog = ref(false)
const form = ref({
  recipientName: '',
  postalCode: '',
  prefecture: '',
  city: '',
  address1: '',
  phone: '',
  items: [{ sku: '', productName: '', quantity: 0 }] as any[],
  memo: '',
})

async function load() {
  loading.value = true
  try {
    const clientId = auth.user?.clientId || ''
    const res = await http.get<any>(`/outbound-requests?clientId=${clientId}&limit=50`)
    requests.value = res.data || []
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

function addItem() {
  form.value.items.push({ sku: '', productName: '', quantity: 0 })
}

async function submit() {
  try {
    await http.post('/outbound-requests', {
      clientId: auth.user?.clientId,
      clientName: auth.user?.clientName,
      ...form.value,
    })
    ElMessage.success(t('common.success'))
    showDialog.value = false
    form.value = { recipientName: '', postalCode: '', prefecture: '', city: '', address1: '', phone: '', items: [{ sku: '', productName: '', quantity: 0 }], memo: '' }
    await load()
  } catch (e: any) { ElMessage.error(e.body?.message || t('common.error')) }
}

const statusMap: Record<string, { label: string; type: string }> = {
  pending: { label: '待审批', type: 'info' },
  approved: { label: '已审批', type: 'warning' },
  picking: { label: '拣货中', type: '' },
  packed: { label: '已包装', type: '' },
  shipped: { label: '已出货', type: 'success' },
  completed: { label: '完结', type: 'info' },
}

onMounted(load)
</script>

<template>
  <div v-loading="loading">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
      <h2 style="margin: 0">出库申请</h2>
      <el-button type="primary" @click="showDialog = true">创建出库申请</el-button>
    </div>

    <el-table :data="requests" stripe size="small">
      <el-table-column prop="requestNumber" label="申请号" width="150" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="(statusMap[row.status]?.type as any) || 'info'" size="small">
            {{ statusMap[row.status]?.label || row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="收件人" width="120">
        <template #default="{ row }">{{ row.recipient?.recipientName || '--' }}</template>
      </el-table-column>
      <el-table-column label="商品数" width="70">
        <template #default="{ row }">{{ row.items?.reduce((s: number, i: any) => s + i.quantity, 0) || 0 }}</template>
      </el-table-column>
      <el-table-column label="追踪号" width="150">
        <template #default="{ row }">{{ row.trackingNumber || '--' }}</template>
      </el-table-column>
      <el-table-column label="创建日" width="100">
        <template #default="{ row }">{{ new Date(row.createdAt).toLocaleDateString() }}</template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && requests.length === 0" :description="t('common.noData')" />

    <el-dialog v-model="showDialog" title="创建出库申请" width="600px">
      <el-form label-width="80px">
        <el-divider content-position="left">收件信息</el-divider>
        <el-form-item label="收件人"><el-input v-model="form.recipientName" /></el-form-item>
        <el-row :gutter="8">
          <el-col :span="8"><el-form-item label="邮编"><el-input v-model="form.postalCode" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="都道府县"><el-input v-model="form.prefecture" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="市区町村"><el-input v-model="form.city" /></el-form-item></el-col>
        </el-row>
        <el-form-item label="地址"><el-input v-model="form.address1" /></el-form-item>
        <el-form-item label="电话"><el-input v-model="form.phone" /></el-form-item>

        <el-divider content-position="left">商品</el-divider>
        <el-table :data="form.items" size="small">
          <el-table-column label="SKU" width="150">
            <template #default="{ row }"><el-input v-model="row.sku" size="small" /></template>
          </el-table-column>
          <el-table-column label="商品名">
            <template #default="{ row }"><el-input v-model="row.productName" size="small" /></template>
          </el-table-column>
          <el-table-column label="数量" width="100">
            <template #default="{ row }"><el-input-number v-model="row.quantity" :min="1" size="small" /></template>
          </el-table-column>
        </el-table>
        <el-button style="margin-top: 8px" size="small" @click="addItem">+ 添加</el-button>

        <el-form-item label="备注" style="margin-top: 16px"><el-input v-model="form.memo" type="textarea" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="submit">{{ t('common.submit') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>
