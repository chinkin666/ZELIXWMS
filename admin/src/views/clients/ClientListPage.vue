<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { http } from '@/api/http'

const router = useRouter()
const clients = ref<any[]>([])
const loading = ref(false)
const search = ref('')

// 邀请对话框 / 招待ダイアログ
const showInviteDialog = ref(false)
const inviteForm = ref({ clientId: '', email: '', password: '', displayName: '' })
const inviting = ref(false)

async function loadClients() {
  loading.value = true
  try {
    const res: any = await http.get(`/clients?search=${encodeURIComponent(search.value)}&limit=50`)
    clients.value = res.data || []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

function openInvite(clientId: string) {
  inviteForm.value = { clientId, email: '', password: '', displayName: '' }
  showInviteDialog.value = true
}

async function submitInvite() {
  if (!inviteForm.value.email || !inviteForm.value.password) {
    ElMessage.warning('邮箱和密码必填')
    return
  }
  inviting.value = true
  try {
    await http.post('/portal/auth/invite', inviteForm.value)
    ElMessage.success('门户账号已创建')
    showInviteDialog.value = false
    await loadClients()
  } catch (e: any) {
    ElMessage.error(e.body?.message || e.message || '创建失败')
  } finally {
    inviting.value = false
  }
}

// 客户创建对话框 / 顧客作成ダイアログ
const showCreateDialog = ref(false)
const createForm = ref({
  clientCode: '',
  name: '',
  clientType: 'logistics_company',
  creditTier: 'new',
  creditLimit: 100000,
  paymentTermDays: 30,
  email: '',
  phone: '',
  portalLanguage: 'ja',
})
const creating = ref(false)

async function submitCreate() {
  if (!createForm.value.clientCode || !createForm.value.name) {
    ElMessage.warning('客户编号和名称必填')
    return
  }
  creating.value = true
  try {
    await http.post('/clients', createForm.value)
    ElMessage.success('客户已创建')
    showCreateDialog.value = false
    createForm.value = { clientCode: '', name: '', clientType: 'logistics_company', creditTier: 'new', creditLimit: 100000, paymentTermDays: 30, email: '', phone: '', portalLanguage: 'ja' }
    await loadClients()
  } catch (e: any) {
    ElMessage.error(e.body?.message || e.message || '创建失败')
  } finally { creating.value = false }
}

onMounted(loadClients)
</script>

<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
      <h2 style="margin: 0">客户管理</h2>
      <div style="display: flex; gap: 8px">
        <el-input v-model="search" placeholder="搜索客户..." style="width: 250px" @keyup.enter="loadClients" clearable />
        <el-button type="primary" @click="showCreateDialog = true">+ 新增客户</el-button>
      </div>
    </div>

    <el-table :data="clients" v-loading="loading" stripe>
      <el-table-column prop="clientCode" label="客户编号" width="120" />
      <el-table-column prop="name" label="客户名称" />
      <el-table-column prop="clientType" label="类型" width="140">
        <template #default="{ row }">
          {{ row.clientType === 'logistics_company' ? '物流公司' : row.clientType === 'domestic_company' ? '日本公司' : row.clientType === 'individual_seller' ? '独立卖家' : row.clientType || '--' }}
        </template>
      </el-table-column>
      <el-table-column prop="creditTier" label="信用" width="80" />
      <el-table-column label="额度" width="120">
        <template #default="{ row }">¥{{ (row.creditLimit || 0).toLocaleString() }}</template>
      </el-table-column>
      <el-table-column label="门户" width="80">
        <template #default="{ row }">
          <el-tag :type="row.portalEnabled ? 'success' : 'info'" size="small">
            {{ row.portalEnabled ? 'ON' : 'OFF' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200">
        <template #default="{ row }">
          <el-button text type="primary" size="small" @click="router.push(`/clients/${row._id}/pricing`)">价格</el-button>
          <el-button text size="small" @click="router.push(`/clients/${row._id}/sub-clients`)">子客户/店铺</el-button>
          <el-button text type="success" size="small" @click="openInvite(row._id)">邀请</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 邀请对话框 / 招待ダイアログ -->
    <el-dialog v-model="showInviteDialog" title="创建门户账号 / ポータルアカウント作成" width="450px">
      <el-form label-width="80px">
        <el-form-item label="邮箱">
          <el-input v-model="inviteForm.email" placeholder="client@example.com" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="inviteForm.password" type="password" placeholder="8位以上" show-password />
        </el-form-item>
        <el-form-item label="显示名">
          <el-input v-model="inviteForm.displayName" placeholder="客户负责人名" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showInviteDialog = false">取消</el-button>
        <el-button type="primary" :loading="inviting" @click="submitInvite">创建并邀请</el-button>
      </template>
    </el-dialog>
    <!-- 客户创建对话框 / 顧客作成ダイアログ -->
    <el-dialog v-model="showCreateDialog" title="新增客户 / 顧客作成" width="550px">
      <el-form label-width="100px">
        <el-form-item label="客户编号"><el-input v-model="createForm.clientCode" placeholder="如 CLT-001" /></el-form-item>
        <el-form-item label="客户名称"><el-input v-model="createForm.name" /></el-form-item>
        <el-form-item label="类型">
          <el-select v-model="createForm.clientType" style="width: 100%">
            <el-option label="跨境物流公司" value="logistics_company" />
            <el-option label="日本本土公司" value="domestic_company" />
            <el-option label="独立卖家" value="individual_seller" />
          </el-select>
        </el-form-item>
        <el-form-item label="信用等级">
          <el-select v-model="createForm.creditTier" style="width: 100%">
            <el-option label="新客户" value="new" />
            <el-option label="标准" value="standard" />
            <el-option label="VIP" value="vip" />
          </el-select>
        </el-form-item>
        <el-form-item label="信用额度(¥)"><el-input-number v-model="createForm.creditLimit" :min="0" :step="100000" /></el-form-item>
        <el-form-item label="结算周期(天)"><el-input-number v-model="createForm.paymentTermDays" :min="0" /></el-form-item>
        <el-form-item label="邮箱"><el-input v-model="createForm.email" /></el-form-item>
        <el-form-item label="电话"><el-input v-model="createForm.phone" /></el-form-item>
        <el-form-item label="门户语言">
          <el-select v-model="createForm.portalLanguage" style="width: 100%">
            <el-option label="日本語" value="ja" />
            <el-option label="中文" value="zh" />
            <el-option label="English" value="en" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="submitCreate">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>
