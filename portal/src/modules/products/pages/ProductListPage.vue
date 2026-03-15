<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { listProducts, type Product } from '@/api/product'
import { usePortalAuthStore } from '@/stores/auth'

const { t } = useI18n()
const auth = usePortalAuthStore()

const products = ref<Product[]>([])
const total = ref(0)
const loading = ref(false)
const search = ref('')
const page = ref(1)

async function load() {
  loading.value = true
  try {
    const params: Record<string, string> = {
      page: String(page.value),
      limit: '50',
      clientId: auth.user?.clientId || '',
    }
    if (search.value) params.search = search.value
    const res = await listProducts(params)
    products.value = res.data || []
    total.value = res.total || 0
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
      <h2 style="margin: 0">{{ t('products.title') }}</h2>
      <div style="display: flex; gap: 8px">
        <el-input
          v-model="search"
          :placeholder="t('common.search')"
          style="width: 250px"
          clearable
          @keyup.enter="load"
        />
        <el-button>{{ t('products.importProducts') }}</el-button>
        <el-button type="primary">{{ t('products.addProduct') }}</el-button>
      </div>
    </div>

    <el-table :data="products" v-loading="loading" stripe>
      <el-table-column prop="sku" :label="t('products.sku')" width="150" />
      <el-table-column prop="fnsku" :label="t('products.fnsku')" width="150" />
      <el-table-column prop="name" :label="t('products.productName')" />
      <el-table-column prop="janCode" label="JAN" width="140" />
      <el-table-column :label="t('common.actions')" width="120">
        <template #default>
          <el-button text type="primary" size="small">{{ t('common.edit') }}</el-button>
          <el-button text type="primary" size="small">{{ t('products.printLabel') }}</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div style="display: flex; justify-content: flex-end; margin-top: 16px">
      <el-pagination
        v-model:current-page="page"
        :total="total"
        :page-size="50"
        layout="total, prev, pager, next"
        @current-change="load"
      />
    </div>
  </div>
</template>
