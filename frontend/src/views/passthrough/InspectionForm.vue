<script setup lang="ts">
/**
 * 検品操作ページ / 检品操作页面
 *
 * 入庫予約の商品を6次元チェックし、異常を記録する。
 * 对入库预定的商品进行6维度检查，记录异常。
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
const order = ref<any>(null)
const loading = ref(false)
const submitting = ref(false)

// 検品フォーム / 检品表单
const inspectionMode = ref<'full' | 'sampling'>('full')
const samplingRate = ref(0.1)
const checks = ref({
  skuMatch: 'pass' as string,
  barcodeMatch: 'pass' as string,
  quantityMatch: 'pass' as string,
  appearanceOk: 'pass' as string,
  accessoriesOk: 'na' as string,
  packagingOk: 'pass' as string,
})
const inspectedQuantity = ref(0)
const passedQuantity = ref(0)
const failedQuantity = ref(0)

// 異常リスト / 异常列表
const exceptions = ref<Array<{
  category: string; quantity: number; description: string; photoUrls: string[]
}>>([])

function addException() {
  exceptions.value.push({ category: 'appearance_defect', quantity: 0, description: '', photoUrls: [] })
}
function removeException(idx: number) { exceptions.value.splice(idx, 1) }

const categoryOptions = [
  { value: 'quantity_variance', label: '数量差異 / 数量异常' },
  { value: 'label_error', label: 'ラベル異常 / 标签异常' },
  { value: 'appearance_defect', label: '外観不良 / 外观不良' },
  { value: 'packaging_issue', label: '包装異常 / 包装异常' },
  { value: 'mixed_shipment', label: '混載異常 / 混装异常' },
  { value: 'other', label: 'その他 / 其他' },
]

const checkOptions = [
  { value: 'pass', label: '✓ 合格', type: 'success' },
  { value: 'fail', label: '✗ 不合格', type: 'danger' },
  { value: 'na', label: '— N/A', type: 'info' },
]

async function loadOrder() {
  loading.value = true
  try {
    const res = await fetch(`${baseUrl}/passthrough/${orderId}`, {
      headers: { Authorization: `Bearer ${userStore.token}` },
    })
    order.value = await res.json()
    if (order.value?.lines?.[0]) {
      inspectedQuantity.value = order.value.lines.reduce((s: number, l: any) => s + l.expectedQuantity, 0)
      passedQuantity.value = inspectedQuantity.value
    }
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

async function submitInspection() {
  submitting.value = true
  try {
    const body = {
      inboundOrderId: orderId,
      sku: order.value?.lines?.[0]?.productSku || '',
      inspectionMode: inspectionMode.value,
      samplingRate: inspectionMode.value === 'sampling' ? samplingRate.value : undefined,
      checks: checks.value,
      expectedQuantity: inspectedQuantity.value,
      inspectedQuantity: inspectedQuantity.value,
      passedQuantity: passedQuantity.value,
      failedQuantity: failedQuantity.value,
      exceptions: exceptions.value.filter(e => e.description),
      inspectedBy: userStore.currentUser?.displayName || 'unknown',
      photos: [],
      clientId: order.value?.clientId,
    }
    const res = await fetch(`${baseUrl}/inspections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userStore.token}` },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      ElMessage.success('検品記録を保存しました / 检品记录已保存')
      router.back()
    } else {
      const data = await res.json()
      ElMessage.error(data.message || '保存に失敗')
    }
  } catch (e: any) { ElMessage.error(e.message) }
  finally { submitting.value = false }
}

onMounted(loadOrder)
</script>

<template>
  <div style="max-width: 800px; margin: 0 auto" v-loading="loading">
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px">
      <el-button @click="router.back()">戻る</el-button>
      <h2 style="margin: 0">検品 / 检品: {{ order?.orderNumber || '...' }}</h2>
    </div>

    <template v-if="order">
      <!-- 検品方式 / 检品方式 -->
      <el-card style="margin-bottom: 16px">
        <template #header>検品方式 / 检品方式</template>
        <el-radio-group v-model="inspectionMode">
          <el-radio value="full">全数検品 / 全检</el-radio>
          <el-radio value="sampling">抜取検品 / 抽检</el-radio>
        </el-radio-group>
        <div v-if="inspectionMode === 'sampling'" style="margin-top: 8px">
          抜取率 / 抽检比例: <el-input-number v-model="samplingRate" :min="0.01" :max="1" :step="0.05" size="small" /> ({{ Math.round(samplingRate * 100) }}%)
        </div>
      </el-card>

      <!-- 6次元チェック / 6维度检查 -->
      <el-card style="margin-bottom: 16px">
        <template #header>6次元チェック / 6维度检查</template>
        <el-form label-width="140px">
          <el-form-item v-for="(displayLabel, fieldKey) in {
            skuMatch: 'SKU 一致',
            barcodeMatch: 'バーコード一致',
            quantityMatch: '数量一致',
            appearanceOk: '外観OK',
            accessoriesOk: '付属品OK',
            packagingOk: '包装OK',
          }" :key="fieldKey" :label="displayLabel">
            <el-radio-group v-model="(checks as any)[fieldKey]">
              <el-radio-button v-for="opt in checkOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </el-radio-button>
            </el-radio-group>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 数量 / 数量 -->
      <el-card style="margin-bottom: 16px">
        <el-row :gutter="16">
          <el-col :span="8">
            <div style="color: #909399; font-size: 12px">検品数量</div>
            <el-input-number v-model="inspectedQuantity" :min="0" />
          </el-col>
          <el-col :span="8">
            <div style="color: #909399; font-size: 12px">合格数量</div>
            <el-input-number v-model="passedQuantity" :min="0" />
          </el-col>
          <el-col :span="8">
            <div style="color: #909399; font-size: 12px">不合格数量</div>
            <el-input-number v-model="failedQuantity" :min="0" />
          </el-col>
        </el-row>
      </el-card>

      <!-- 異常 / 异常 -->
      <el-card style="margin-bottom: 16px">
        <template #header>
          <div style="display: flex; justify-content: space-between; align-items: center">
            <span>異常記録 / 异常记录</span>
            <el-button size="small" @click="addException">+ 追加</el-button>
          </div>
        </template>
        <div v-for="(exc, idx) in exceptions" :key="idx" style="border-bottom: 1px solid #f0f0f0; padding: 12px 0">
          <el-row :gutter="8">
            <el-col :span="8">
              <el-select v-model="exc.category" size="small" style="width: 100%">
                <el-option v-for="c in categoryOptions" :key="c.value" :label="c.label" :value="c.value" />
              </el-select>
            </el-col>
            <el-col :span="4">
              <el-input-number v-model="exc.quantity" :min="0" size="small" style="width: 100%" />
            </el-col>
            <el-col :span="10">
              <el-input v-model="exc.description" placeholder="説明 / 描述" size="small" />
            </el-col>
            <el-col :span="2">
              <el-button text type="danger" size="small" @click="removeException(idx)">X</el-button>
            </el-col>
          </el-row>
        </div>
        <el-empty v-if="!exceptions.length" description="異常なし / 无异常" :image-size="40" />
      </el-card>

      <div style="display: flex; justify-content: flex-end; gap: 8px">
        <el-button @click="router.back()">キャンセル</el-button>
        <el-button type="primary" :loading="submitting" @click="submitInspection">検品完了 / 检品完成</el-button>
      </div>
    </template>
  </div>
</template>
