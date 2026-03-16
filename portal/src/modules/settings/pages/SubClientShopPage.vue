<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { usePortalAuthStore } from '@/stores/auth'
import { http } from '@/api/http'

const { t } = useI18n()
const auth = usePortalAuthStore()
const clientId = auth.user?.clientId || ''

const subClients = ref<any[]>([])
const shops = ref<any[]>([])
const loading = ref(false)

const showSubDialog = ref(false)
const subForm = ref({ subClientCode: '', name: '', subClientType: 'end_customer', email: '' })
const showShopDialog = ref(false)
const shopForm = ref({ shopCode: '', shopName: '', platform: 'amazon_jp', subClientId: '', platformAccountId: '' })

async function loadData() {
  if (!clientId) return
  loading.value = true
  try {
    const [subsRes, shopsRes] = await Promise.all([
      http.get<any>(`/sub-clients?clientId=${clientId}&limit=100`),
      http.get<any>(`/shops?clientId=${clientId}&limit=100`),
    ])
    subClients.value = subsRes.data || []
    shops.value = shopsRes.data || []
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

async function createSubClient() {
  try {
    await http.post('/sub-clients', { ...subForm.value, clientId })
    ElMessage.success(t('common.success'))
    showSubDialog.value = false
    subForm.value = { subClientCode: '', name: '', subClientType: 'end_customer', email: '' }
    await loadData()
  } catch (e: any) { ElMessage.error(e.body?.message || t('common.error')) }
}

async function createShop() {
  try {
    await http.post('/shops', { ...shopForm.value, clientId })
    ElMessage.success(t('common.success'))
    showShopDialog.value = false
    shopForm.value = { shopCode: '', shopName: '', platform: 'amazon_jp', subClientId: '', platformAccountId: '' }
    await loadData()
  } catch (e: any) { ElMessage.error(e.body?.message || t('common.error')) }
}

onMounted(loadData)
</script>

<template>
  <div v-loading="loading">
    <h2 style="margin: 0 0 24px">{{ t('nav.subClients') }} & {{ t('nav.shops') }}</h2>

    <el-card style="margin-bottom: 16px">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span>{{ t('nav.subClients') }} ({{ subClients.length }})</span>
          <el-button size="small" type="primary" @click="showSubDialog = true">+ {{ t('common.save') }}</el-button>
        </div>
      </template>
      <el-table :data="subClients" size="small">
        <el-table-column prop="subClientCode" label="编号" width="120" />
        <el-table-column prop="name" label="名称" />
        <el-table-column prop="subClientType" label="类型" width="120" />
        <el-table-column prop="email" label="邮箱" />
      </el-table>
      <el-empty v-if="subClients.length === 0" :description="t('common.noData')" :image-size="40" />
    </el-card>

    <el-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span>{{ t('nav.shops') }} ({{ shops.length }})</span>
          <el-button size="small" type="primary" @click="showShopDialog = true">+ {{ t('common.save') }}</el-button>
        </div>
      </template>
      <el-table :data="shops" size="small">
        <el-table-column prop="shopCode" label="编号" width="120" />
        <el-table-column prop="shopName" label="店铺名" />
        <el-table-column prop="platform" label="平台" width="120" />
        <el-table-column prop="platformAccountId" label="平台ID" width="150" />
      </el-table>
      <el-empty v-if="shops.length === 0" :description="t('common.noData')" :image-size="40" />
    </el-card>

    <el-dialog v-model="showSubDialog" title="添加子客户" width="400px">
      <el-form label-width="70px">
        <el-form-item label="编号"><el-input v-model="subForm.subClientCode" /></el-form-item>
        <el-form-item label="名称"><el-input v-model="subForm.name" /></el-form-item>
        <el-form-item label="类型">
          <el-select v-model="subForm.subClientType" style="width: 100%">
            <el-option label="客户的客户" value="end_customer" />
            <el-option label="分公司" value="branch_office" />
          </el-select>
        </el-form-item>
        <el-form-item label="邮箱"><el-input v-model="subForm.email" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showSubDialog = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="createSubClient">{{ t('common.confirm') }}</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showShopDialog" title="添加店铺" width="400px">
      <el-form label-width="70px">
        <el-form-item label="编号"><el-input v-model="shopForm.shopCode" /></el-form-item>
        <el-form-item label="店铺名"><el-input v-model="shopForm.shopName" /></el-form-item>
        <el-form-item label="平台">
          <el-select v-model="shopForm.platform" style="width: 100%">
            <el-option label="Amazon.co.jp" value="amazon_jp" />
            <el-option label="楽天" value="rakuten" />
            <el-option label="Yahoo!" value="yahoo_shopping" />
            <el-option label="Shopify" value="shopify" />
            <el-option label="B2B" value="b2b" />
          </el-select>
        </el-form-item>
        <el-form-item label="子客户">
          <el-select v-model="shopForm.subClientId" style="width: 100%" clearable placeholder="(直接)">
            <el-option v-for="s in subClients" :key="s._id" :label="s.name" :value="s._id" />
          </el-select>
        </el-form-item>
        <el-form-item label="平台ID"><el-input v-model="shopForm.platformAccountId" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showShopDialog = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="createShop">{{ t('common.confirm') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>
