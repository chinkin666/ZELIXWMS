<script setup lang="ts">
/**
 * FBA箱管理ページ / FBA箱管理页面
 */
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getApiBaseUrl } from '@/api/base'
import { useWmsUserStore } from '@/stores/wms/useWmsUserStore'

const route = useRoute()
const router = useRouter()
const userStore = useWmsUserStore()
const baseUrl = getApiBaseUrl()

const orderId = route.params.orderId as string
const boxes = ref<any[]>([])
const validation = ref<any>(null)
const loading = ref(false)

// 新規箱フォーム / 新建箱表单
const showAddDialog = ref(false)
const addForm = ref({
  items: [{ sku: '', fnsku: '', quantity: 0, productId: '000000000000000000000000' }],
  weight: 0,
  length: 0,
  width: 0,
  height: 0,
  destinationFc: '',
})

async function loadBoxes() {
  loading.value = true
  try {
    const [boxRes, valRes] = await Promise.all([
      fetch(`${baseUrl}/fba-boxes?inboundOrderId=${orderId}`, { headers: { Authorization: `Bearer ${userStore.token}` } }),
      fetch(`${baseUrl}/fba-boxes/validate/${orderId}`, { headers: { Authorization: `Bearer ${userStore.token}` } }),
    ])
    const boxData = await boxRes.json()
    boxes.value = boxData.data || []
    validation.value = await valRes.json()
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

async function createBox() {
  try {
    const res = await fetch(`${baseUrl}/fba-boxes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userStore.token}` },
      body: JSON.stringify({ ...addForm.value, inboundOrderId: orderId }),
    })
    if (res.ok) {
      ElMessage.success('箱を作成しました / 箱已创建')
      showAddDialog.value = false
      addForm.value = { items: [{ sku: '', fnsku: '', quantity: 0, productId: '000000000000000000000000' }], weight: 0, length: 0, width: 0, height: 0, destinationFc: '' }
      await loadBoxes()
    }
  } catch (e: any) { ElMessage.error(e.message) }
}

async function sealBox(boxId: string) {
  try {
    await fetch(`${baseUrl}/fba-boxes/${boxId}/seal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userStore.token}` },
      body: JSON.stringify({ sealedBy: userStore.currentUser?.displayName }),
    })
    ElMessage.success('封箱完了')
    await loadBoxes()
  } catch (e: any) { ElMessage.error(e.message) }
}

async function deleteBox(boxId: string) {
  try {
    await fetch(`${baseUrl}/fba-boxes/${boxId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userStore.token}` },
    })
    await loadBoxes()
  } catch (e: any) { ElMessage.error(e.message) }
}

function getValidation(boxNumber: string) {
  return validation.value?.results?.find((r: any) => r.boxNumber === boxNumber)
}

onMounted(loadBoxes)
</script>

<template>
  <div v-loading="loading">
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px">
      <el-button @click="router.back()">戻る</el-button>
      <h2 style="margin: 0">FBA箱管理</h2>
      <div style="flex: 1" />
      <el-tag v-if="validation" :type="validation.allValid ? 'success' : 'danger'">
        {{ validation.allValid ? '全箱検証OK' : '検証エラーあり' }} ({{ validation.totalBoxes }}箱)
      </el-tag>
      <el-button type="primary" @click="showAddDialog = true">+ 箱追加</el-button>
    </div>

    <el-row :gutter="12">
      <el-col :span="8" v-for="box in boxes" :key="box._id">
        <el-card style="margin-bottom: 12px" :body-style="{ padding: '16px' }">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px">
            <span style="font-weight: bold; font-size: 16px">{{ box.boxNumber }}</span>
            <el-tag :type="box.status === 'sealed' ? 'success' : box.status === 'labeled' ? 'warning' : 'info'" size="small">
              {{ box.status }}
            </el-tag>
          </div>

          <!-- 箱内容 / 箱内容 -->
          <div v-for="item in box.items" :key="item.sku" style="font-size: 12px; color: #606266">
            {{ item.sku }} ({{ item.fnsku }}) × {{ item.quantity }}
          </div>

          <!-- 物理属性 / 物理属性 -->
          <div style="font-size: 12px; color: #909399; margin-top: 8px">
            {{ box.weight || '--' }}kg | {{ box.length || '--' }}×{{ box.width || '--' }}×{{ box.height || '--' }}cm
          </div>

          <!-- 検証結果 / 校验结果 -->
          <div v-if="getValidation(box.boxNumber)" style="margin-top: 8px">
            <el-tag v-if="getValidation(box.boxNumber).valid" type="success" size="small">規格OK</el-tag>
            <div v-else>
              <el-tag type="danger" size="small" v-for="(err, i) in getValidation(box.boxNumber).errors" :key="i" style="margin: 2px">
                {{ err }}
              </el-tag>
            </div>
          </div>

          <!-- 操作 / 操作 -->
          <div style="display: flex; gap: 4px; margin-top: 8px">
            <el-button v-if="box.status === 'packing'" size="small" type="success" @click="sealBox(box._id)">封箱</el-button>
            <el-button v-if="box.status === 'packing'" size="small" type="danger" @click="deleteBox(box._id)">削除</el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-empty v-if="!loading && boxes.length === 0" description="箱がありません / 暂无箱" />

    <!-- 新規箱ダイアログ / 新建箱对话框 -->
    <el-dialog v-model="showAddDialog" title="箱追加 / 添加箱" width="500px">
      <el-form label-width="100px">
        <el-form-item label="SKU">
          <el-input v-model="addForm.items[0].sku" />
        </el-form-item>
        <el-form-item label="FNSKU">
          <el-input v-model="addForm.items[0].fnsku" />
        </el-form-item>
        <el-form-item label="数量">
          <el-input-number v-model="addForm.items[0].quantity" :min="1" />
        </el-form-item>
        <el-form-item label="重量(kg)">
          <el-input-number v-model="addForm.weight" :min="0" :precision="1" />
        </el-form-item>
        <el-form-item label="長さ(cm)">
          <el-input-number v-model="addForm.length" :min="0" :precision="1" />
        </el-form-item>
        <el-form-item label="幅(cm)">
          <el-input-number v-model="addForm.width" :min="0" :precision="1" />
        </el-form-item>
        <el-form-item label="高さ(cm)">
          <el-input-number v-model="addForm.height" :min="0" :precision="1" />
        </el-form-item>
        <el-form-item label="目的FC">
          <el-input v-model="addForm.destinationFc" placeholder="NRT5" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">キャンセル</el-button>
        <el-button type="primary" @click="createBox">作成</el-button>
      </template>
    </el-dialog>
  </div>
</template>
