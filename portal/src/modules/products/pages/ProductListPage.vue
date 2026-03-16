<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { listProducts, createProduct, updateProduct, type Product } from '@/api/product'
import { usePortalAuthStore } from '@/stores/auth'

const { t } = useI18n()
const auth = usePortalAuthStore()

const products = ref<Product[]>([])
const total = ref(0)
const loading = ref(false)
const search = ref('')
const page = ref(1)

// 新增/编辑对话框 / 新規・編集ダイアログ
const showDialog = ref(false)
const editingId = ref<string | null>(null)
const form = ref({ sku: '', name: '', fnsku: '', asin: '', janCode: '', weight: 0 })
const saving = ref(false)

async function load() {
  loading.value = true
  try {
    const params: Record<string, string> = { page: String(page.value), limit: '50' }
    if (auth.user?.clientId) params.clientId = auth.user.clientId
    if (search.value) params.search = search.value
    const res = await listProducts(params)
    products.value = res.data || []
    total.value = res.total || 0
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

function openCreate() {
  editingId.value = null
  form.value = { sku: '', name: '', fnsku: '', asin: '', janCode: '', weight: 0 }
  showDialog.value = true
}

function openEdit(product: Product) {
  editingId.value = product._id
  form.value = {
    sku: product.sku,
    name: product.name,
    fnsku: product.fnsku || '',
    asin: product.asin || '',
    janCode: product.janCode || '',
    weight: product.weight || 0,
  }
  showDialog.value = true
}

async function handleSave() {
  if (!form.value.sku || !form.value.name) {
    ElMessage.warning('SKU 和商品名必填')
    return
  }
  saving.value = true
  try {
    const data: Record<string, unknown> = {
      ...form.value,
      clientId: auth.user?.clientId,
    }
    if (editingId.value) {
      await updateProduct(editingId.value, data)
    } else {
      await createProduct(data)
    }
    ElMessage.success(t('common.success'))
    showDialog.value = false
    await load()
  } catch (e: any) {
    ElMessage.error(e.body?.message || e.message || t('common.error'))
  } finally { saving.value = false }
}

onMounted(load)
</script>

<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
      <h2 style="margin: 0">{{ t('products.title') }}</h2>
      <div style="display: flex; gap: 8px">
        <el-input v-model="search" :placeholder="t('common.search')" style="width: 250px" clearable @keyup.enter="load" />
        <el-button type="primary" @click="openCreate">{{ t('products.addProduct') }}</el-button>
      </div>
    </div>

    <el-table :data="products" v-loading="loading" stripe>
      <el-table-column prop="sku" :label="t('products.sku')" width="150" />
      <el-table-column prop="fnsku" :label="t('products.fnsku')" width="150" />
      <el-table-column prop="name" :label="t('products.productName')" />
      <el-table-column prop="janCode" label="JAN" width="140" />
      <el-table-column label="重量" width="80">
        <template #default="{ row }">{{ row.weight ? `${row.weight}g` : '--' }}</template>
      </el-table-column>
      <el-table-column :label="t('common.actions')" width="120">
        <template #default="{ row }">
          <el-button text type="primary" size="small" @click="openEdit(row)">{{ t('common.edit') }}</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div style="display: flex; justify-content: flex-end; margin-top: 16px">
      <el-pagination v-model:current-page="page" :total="total" :page-size="50" layout="total, prev, pager, next" @current-change="load" />
    </div>

    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="showDialog" :title="editingId ? t('common.edit') : t('products.addProduct')" width="500px">
      <el-form label-width="80px">
        <el-form-item label="SKU"><el-input v-model="form.sku" :disabled="!!editingId" /></el-form-item>
        <el-form-item :label="t('products.productName')"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="FNSKU"><el-input v-model="form.fnsku" /></el-form-item>
        <el-form-item label="ASIN"><el-input v-model="form.asin" /></el-form-item>
        <el-form-item label="JAN"><el-input v-model="form.janCode" /></el-form-item>
        <el-form-item label="重量(g)"><el-input-number v-model="form.weight" :min="0" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>
