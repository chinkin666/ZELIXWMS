<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { http } from '@/api/http'

const route = useRoute()
const clientId = route.params.id as string
const client = ref<any>(null)
const rates = ref<any[]>([])
const loading = ref(false)

// 新增费率表单 / 新規費率フォーム
const showAddDialog = ref(false)
const addForm = ref({
  chargeType: '',
  name: '',
  unit: 'per_item',
  unitPrice: 0,
})

const chargeTypes = [
  { value: 'inbound_handling', label: '入库作业费' },
  { value: 'inspection', label: '检品费' },
  { value: 'labeling', label: '贴标费' },
  { value: 'opp_bagging', label: '套OPP袋费' },
  { value: 'suffocation_label', label: '防窒息标费' },
  { value: 'fragile_label', label: '易碎标费' },
  { value: 'bubble_wrap', label: '气泡膜包装费' },
  { value: 'set_assembly', label: '组合套装费' },
  { value: 'box_splitting', label: '分箱费' },
  { value: 'box_replacement', label: '换箱费' },
  { value: 'photo_documentation', label: '拍照留档费' },
  { value: 'fba_delivery', label: 'FBA配送费' },
  { value: 'storage', label: '保管费' },
  { value: 'outbound_handling', label: '出库作业费' },
  { value: 'shipping', label: '配送费' },
  { value: 'return_handling', label: '退货处理费' },
  { value: 'rush_processing', label: '加急处理费' },
  { value: 'overdue_storage', label: '超期仓储费' },
  { value: 'other', label: '其他' },
]

const unitOptions = [
  { value: 'per_item', label: '件' },
  { value: 'per_case', label: '箱' },
  { value: 'per_order', label: '单' },
  { value: 'per_set', label: '套' },
  { value: 'per_sheet', label: '张' },
  { value: 'per_location_day', label: '坪/天' },
  { value: 'flat', label: '固定' },
]

async function loadData() {
  loading.value = true
  try {
    const [clientRes, ratesRes]: any[] = await Promise.all([
      http.get(`/clients/${clientId}`),
      http.get(`/service-rates?clientId=${clientId}&limit=100`),
    ])
    client.value = clientRes
    rates.value = ratesRes.data || ratesRes || []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

async function handleAdd() {
  if (!addForm.value.chargeType || !addForm.value.name) {
    ElMessage.warning('请填写费用类型和名称')
    return
  }
  try {
    await http.post('/service-rates', {
      clientId,
      clientName: client.value?.name || '',
      chargeType: addForm.value.chargeType,
      name: addForm.value.name,
      unit: addForm.value.unit,
      unitPrice: addForm.value.unitPrice,
      isActive: true,
    })
    ElMessage.success('添加成功')
    showAddDialog.value = false
    addForm.value = { chargeType: '', name: '', unit: 'per_item', unitPrice: 0 }
    await loadData()
  } catch (e: any) {
    ElMessage.error(e.message || '添加失败')
  }
}

// 从默认模板复制 / デフォルトテンプレートからコピー
async function copyFromDefault() {
  try {
    const defaultRates: any = await http.get('/service-rates?limit=100')
    const defaults = (defaultRates.data || defaultRates || []).filter((r: any) => !r.clientId)
    if (defaults.length === 0) {
      ElMessage.warning('没有默认费率模板')
      return
    }
    let created = 0
    for (const r of defaults) {
      try {
        await http.post('/service-rates', {
          clientId,
          clientName: client.value?.name || '',
          chargeType: r.chargeType,
          name: r.name,
          unit: r.unit,
          unitPrice: r.unitPrice,
          isActive: true,
        })
        created++
      } catch { /* 跳过重复 */ }
    }
    ElMessage.success(`从模板复制了 ${created} 条费率`)
    await loadData()
  } catch (e: any) {
    ElMessage.error(e.message || '复制失败')
  }
}

onMounted(loadData)
</script>

<template>
  <div>
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px">
      <el-button @click="$router.back()">返回</el-button>
      <h2 style="margin: 0">价格目录: {{ client?.name || '...' }}</h2>
      <div style="flex: 1" />
      <el-button @click="copyFromDefault">从默认模板复制</el-button>
      <el-button type="primary" @click="showAddDialog = true">添加费率</el-button>
    </div>

    <el-table :data="rates" v-loading="loading" stripe>
      <el-table-column prop="chargeType" label="费用类型" width="180">
        <template #default="{ row }">
          {{ chargeTypes.find(c => c.value === row.chargeType)?.label || row.chargeType }}
        </template>
      </el-table-column>
      <el-table-column prop="name" label="名称" />
      <el-table-column prop="unit" label="单位" width="100">
        <template #default="{ row }">
          {{ unitOptions.find(u => u.value === row.unit)?.label || row.unit }}
        </template>
      </el-table-column>
      <el-table-column label="单价（円）" width="120">
        <template #default="{ row }">¥{{ row.unitPrice?.toLocaleString() || '0' }}</template>
      </el-table-column>
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.isActive ? 'success' : 'info'" size="small">
            {{ row.isActive ? '有效' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && rates.length === 0" description="暂无价格设定，请添加费率或从默认模板复制" />

    <!-- 添加费率对话框 / 費率追加ダイアログ -->
    <el-dialog v-model="showAddDialog" title="添加费率" width="500px">
      <el-form label-width="100px">
        <el-form-item label="费用类型">
          <el-select v-model="addForm.chargeType" filterable style="width: 100%">
            <el-option v-for="ct in chargeTypes" :key="ct.value" :label="ct.label" :value="ct.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="名称">
          <el-input v-model="addForm.name" placeholder="如: 贴FNSKU标签" />
        </el-form-item>
        <el-form-item label="单位">
          <el-select v-model="addForm.unit" style="width: 100%">
            <el-option v-for="u in unitOptions" :key="u.value" :label="u.label" :value="u.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="单价 (円)">
          <el-input-number v-model="addForm.unitPrice" :min="0" :step="10" style="width: 200px" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="handleAdd">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>
