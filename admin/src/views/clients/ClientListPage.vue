<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { http } from '@/api/http'

const router = useRouter()
const clients = ref<any[]>([])
const loading = ref(false)
const search = ref('')

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

onMounted(loadClients)
</script>

<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
      <h2 style="margin: 0">客户管理</h2>
      <el-input v-model="search" placeholder="搜索客户..." style="width: 300px" @keyup.enter="loadClients" clearable />
    </div>

    <el-table :data="clients" v-loading="loading" stripe>
      <el-table-column prop="clientCode" label="客户编号" width="120" />
      <el-table-column prop="name" label="客户名称" />
      <el-table-column prop="clientType" label="类型" width="140" />
      <el-table-column prop="creditTier" label="信用等级" width="100" />
      <el-table-column prop="creditLimit" label="信用额度" width="120">
        <template #default="{ row }">{{ row.creditLimit?.toLocaleString() || '--' }}</template>
      </el-table-column>
      <el-table-column prop="portalEnabled" label="门户" width="80">
        <template #default="{ row }">
          <el-tag :type="row.portalEnabled ? 'success' : 'info'" size="small">
            {{ row.portalEnabled ? 'ON' : 'OFF' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150">
        <template #default="{ row }">
          <el-button text type="primary" @click="router.push(`/clients/${row._id}/pricing`)">价格设定</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>
