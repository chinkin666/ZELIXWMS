<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { http } from '@/api/http'

const route = useRoute()
const clientId = route.params.id as string
const client = ref<any>(null)
const subClients = ref<any[]>([])
const shops = ref<any[]>([])
const loading = ref(false)

// 子客户对话框
const showSubDialog = ref(false)
const subForm = ref({ subClientCode: '', name: '', subClientType: 'end_customer', email: '', phone: '' })
// 店铺对话框
const showShopDialog = ref(false)
const shopForm = ref({ shopCode: '', shopName: '', platform: 'amazon_jp', subClientId: '', platformAccountId: '' })

async function loadData() {
  loading.value = true
  try {
    const [c, subs, shps] = await Promise.all([
      http.get<any>(`/clients/${clientId}`),
      http.get<any>(`/sub-clients?clientId=${clientId}&limit=100`),
      http.get<any>(`/shops?clientId=${clientId}&limit=100`),
    ])
    client.value = c
    subClients.value = subs.data || []
    shops.value = shps.data || []
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

async function createSubClient() {
  try {
    await http.post('/sub-clients', { ...subForm.value, clientId })
    ElMessage.success('子客户已创建')
    showSubDialog.value = false
    subForm.value = { subClientCode: '', name: '', subClientType: 'end_customer', email: '', phone: '' }
    await loadData()
  } catch (e: any) { ElMessage.error(e.body?.message || '失败') }
}

async function createShop() {
  try {
    await http.post('/shops', { ...shopForm.value, clientId })
    ElMessage.success('店铺已创建')
    showShopDialog.value = false
    shopForm.value = { shopCode: '', shopName: '', platform: 'amazon_jp', subClientId: '', platformAccountId: '' }
    await loadData()
  } catch (e: any) { ElMessage.error(e.body?.message || '失败') }
}

onMounted(loadData)
</script>

<template>
  <div v-loading="loading">
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px">
      <el-button @click="$router.back()">返回</el-button>
      <h2 style="margin: 0">{{ client?.name || '...' }} — 子客户 & 店铺</h2>
    </div>

    <!-- 子客户 -->
    <el-card style="margin-bottom: 16px">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span>子客户/分公司 ({{ subClients.length }})</span>
          <el-button size="small" type="primary" @click="showSubDialog = true">+ 添加</el-button>
        </div>
      </template>
      <el-table :data="subClients" size="small">
        <el-table-column prop="subClientCode" label="编号" width="120" />
        <el-table-column prop="name" label="名称" />
        <el-table-column prop="subClientType" label="类型" width="120">
          <template #default="{ row }">{{ row.subClientType === 'end_customer' ? '客户的客户' : '分公司' }}</template>
        </el-table-column>
        <el-table-column prop="email" label="邮箱" width="180" />
        <el-table-column label="门户" width="60">
          <template #default="{ row }"><el-tag :type="row.portalEnabled ? 'success' : 'info'" size="small">{{ row.portalEnabled ? 'ON' : 'OFF' }}</el-tag></template>
        </el-table-column>
      </el-table>
      <el-empty v-if="subClients.length === 0" description="暂无子客户" :image-size="40" />
    </el-card>

    <!-- 店铺 -->
    <el-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span>店铺 ({{ shops.length }})</span>
          <el-button size="small" type="primary" @click="showShopDialog = true">+ 添加</el-button>
        </div>
      </template>
      <el-table :data="shops" size="small">
        <el-table-column prop="shopCode" label="编号" width="120" />
        <el-table-column prop="shopName" label="店铺名" />
        <el-table-column prop="platform" label="平台" width="120" />
        <el-table-column prop="platformAccountId" label="平台ID" width="150" />
      </el-table>
      <el-empty v-if="shops.length === 0" description="暂无店铺" :image-size="40" />
    </el-card>

    <!-- 子客户对话框 -->
    <el-dialog v-model="showSubDialog" title="添加子客户" width="450px">
      <el-form label-width="80px">
        <el-form-item label="编号"><el-input v-model="subForm.subClientCode" /></el-form-item>
        <el-form-item label="名称"><el-input v-model="subForm.name" /></el-form-item>
        <el-form-item label="类型">
          <el-select v-model="subForm.subClientType" style="width: 100%">
            <el-option label="客户的客户" value="end_customer" />
            <el-option label="分公司/支社" value="branch_office" />
          </el-select>
        </el-form-item>
        <el-form-item label="邮箱"><el-input v-model="subForm.email" /></el-form-item>
        <el-form-item label="电话"><el-input v-model="subForm.phone" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showSubDialog = false">取消</el-button>
        <el-button type="primary" @click="createSubClient">创建</el-button>
      </template>
    </el-dialog>

    <!-- 店铺对话框 -->
    <el-dialog v-model="showShopDialog" title="添加店铺" width="450px">
      <el-form label-width="80px">
        <el-form-item label="编号"><el-input v-model="shopForm.shopCode" /></el-form-item>
        <el-form-item label="店铺名"><el-input v-model="shopForm.shopName" /></el-form-item>
        <el-form-item label="平台">
          <el-select v-model="shopForm.platform" style="width: 100%">
            <el-option label="Amazon.co.jp" value="amazon_jp" />
            <el-option label="楽天" value="rakuten" />
            <el-option label="Yahoo! Shopping" value="yahoo_shopping" />
            <el-option label="Shopify" value="shopify" />
            <el-option label="B2B" value="b2b" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="子客户">
          <el-select v-model="shopForm.subClientId" style="width: 100%" clearable placeholder="(直接挂客户)">
            <el-option v-for="s in subClients" :key="s._id" :label="s.name" :value="s._id" />
          </el-select>
        </el-form-item>
        <el-form-item label="平台ID"><el-input v-model="shopForm.platformAccountId" placeholder="如 Seller ID" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showShopDialog = false">取消</el-button>
        <el-button type="primary" @click="createShop">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>
