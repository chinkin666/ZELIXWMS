<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { usePortalAuthStore } from '@/stores/auth'
import { createOrder } from '@/api/passthrough'
import { http } from '@/api/http'

const { t } = useI18n()
const router = useRouter()
const auth = usePortalAuthStore()

const currentStep = ref(0)
const submitting = ref(false)
const steps = ['inbound.step1', 'inbound.step2', 'inbound.step3', 'inbound.step4', 'inbound.step5']

// Step 1: 基本信息 / 基本情報
const form = ref({
  destinationType: 'fba' as 'fba' | 'rsl' | 'b2b',
  expectedDate: '',
  totalBoxCount: 1,
  memo: '',
})

// Step 2: 商品明细 / 商品明細
const lines = ref<Array<{ productId: string; productSku: string; productName: string; fnsku: string; expectedQuantity: number }>>([
  { productId: '', productSku: '', productName: '', fnsku: '', expectedQuantity: 0 },
])

// 商品搜索 / 商品検索
const productSearchResults = ref<any[]>([])
const searchingProduct = ref(false)

async function searchProduct(query: string, lineIdx: number) {
  if (!query || query.length < 2) { productSearchResults.value = []; return }
  searchingProduct.value = true
  try {
    const params: Record<string, string> = { search: query, limit: '10' }
    if (auth.user?.clientId) params.clientId = auth.user.clientId
    const res = await http.get<any>(`/products?${new URLSearchParams(params)}`)
    productSearchResults.value = (res.data || []).map((p: any) => ({
      ...p,
      _lineIdx: lineIdx,
    }))
  } catch { productSearchResults.value = [] }
  finally { searchingProduct.value = false }
}

function selectProduct(product: any) {
  const idx = product._lineIdx
  if (idx !== undefined && lines.value[idx]) {
    lines.value[idx].productId = product._id
    lines.value[idx].productSku = product.sku
    lines.value[idx].productName = product.name
    lines.value[idx].fnsku = product.fnsku || ''
  }
  productSearchResults.value = []
}

function addLine() {
  lines.value.push({ productId: '', productSku: '', productName: '', fnsku: '', expectedQuantity: 0 })
}
function removeLine(idx: number) {
  lines.value.splice(idx, 1)
}

// Step 3: FBA/RSL/B2B 信息
const fbaInfo = ref({ shipmentId: '', destinationFc: 'NRT5' })
const rslInfo = ref({ rslPlanId: '', destinationWarehouse: '' })
const b2bInfo = ref({ recipientName: '', postalCode: '', prefecture: '', city: '', address1: '', phone: '' })

const fcOptions = ['NRT5', 'KIX2', 'HND3', 'NGO2', 'FUK3', 'NRT1', 'KIX4', 'HND9', 'TPF6', 'FSZ1']

// Step 4: 作業オプション / 作业选项
const availableOptions = ref([
  { code: 'inbound_handling', name: '数量点数', required: true, unitPrice: 0, unit: '件' },
  { code: 'inspection', name: '开箱全检', required: false, unitPrice: 0, unit: '件' },
  { code: 'labeling', name: '贴 FNSKU', required: false, unitPrice: 0, unit: '件' },
  { code: 'opp_bagging', name: '套 OPP 袋', required: false, unitPrice: 0, unit: '件' },
  { code: 'suffocation_label', name: '贴防窒息标', required: false, unitPrice: 0, unit: '件' },
  { code: 'fragile_label', name: '贴易碎标', required: false, unitPrice: 0, unit: '件' },
  { code: 'bubble_wrap', name: '气泡膜包装', required: false, unitPrice: 0, unit: '件' },
  { code: 'set_assembly', name: '组合套装', required: false, unitPrice: 0, unit: '套' },
  { code: 'box_splitting', name: '分箱', required: false, unitPrice: 0, unit: '箱' },
  { code: 'box_replacement', name: '换箱', required: false, unitPrice: 0, unit: '箱' },
  { code: 'photo_documentation', name: '拍照留档', required: false, unitPrice: 0, unit: '次' },
])

const selectedOptions = ref<string[]>(['inbound_handling'])

// 加载客户价格 / 顧客価格をロード
async function loadPrices() {
  try {
    const clientId = auth.user?.clientId || ''
    const res = await http.get<any>(`/service-rates?clientId=${clientId}&limit=50`)
    const rates = res.data || res || []
    for (const opt of availableOptions.value) {
      const rate = rates.find((r: any) => r.chargeType === opt.code)
      if (rate) {
        opt.unitPrice = rate.unitPrice
        const unitMap: Record<string, string> = { per_item: '件', per_case: '箱', per_set: '套', per_sheet: '张', per_order: '单', flat: '固定' }
        opt.unit = unitMap[rate.unit] || rate.unit
      }
    }
  } catch { /* ignore */ }
}

// 预估费用计算 / 概算費用計算
const estimatedTotal = computed(() => {
  return selectedOptions.value.reduce((sum, code) => {
    const opt = availableOptions.value.find(o => o.code === code)
    if (!opt) return sum
    return sum + opt.unitPrice * totalQuantity.value
  }, 0)
})

const totalQuantity = computed(() => lines.value.reduce((s, l) => s + (l.expectedQuantity || 0), 0))

// Step 5: 确认提交 / 確認・送信
async function handleSubmit() {
  submitting.value = true
  try {
    const serviceOptions = selectedOptions.value.map((code) => {
      const opt = availableOptions.value.find((o) => o.code === code)!
      return {
        optionCode: code,
        optionName: opt.name,
        quantity: totalQuantity.value,
        unitPrice: 0, // 后端从 ServiceRate 自动取 / バックエンドが ServiceRate から自動取得
        estimatedCost: 0,
        status: 'pending' as const,
      }
    })

    const payload: Record<string, unknown> = {
      destinationType: form.value.destinationType,
      expectedDate: form.value.expectedDate || undefined,
      totalBoxCount: form.value.totalBoxCount,
      memo: form.value.memo,
      clientId: auth.user?.clientId,
      subClientId: auth.user?.subClientId,
      lines: lines.value
        .filter((l) => l.productSku)
        .map((l, i) => ({
          lineNumber: i + 1,
          productId: l.productId || '000000000000000000000000',
          productSku: l.productSku,
          productName: l.productName,
          expectedQuantity: l.expectedQuantity,
          receivedQuantity: 0,
          putawayQuantity: 0,
          stockCategory: 'new',
          stockMoveIds: [],
        })),
      serviceOptions,
    }

    if (form.value.destinationType === 'fba') payload.fbaInfo = fbaInfo.value
    if (form.value.destinationType === 'rsl') payload.rslInfo = rslInfo.value
    if (form.value.destinationType === 'b2b') payload.b2bInfo = b2bInfo.value

    const created = await createOrder(payload)
    ElMessage.success(t('common.success'))
    router.push(`/inbound/${(created as any)._id}`)
  } catch (e: any) {
    ElMessage.error(e.message || t('common.error'))
  } finally {
    submitting.value = false
  }
}

onMounted(loadPrices)
</script>

<template>
  <div>
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px">
      <el-button @click="router.back()">{{ t('common.back') }}</el-button>
      <h2 style="margin: 0">{{ t('inbound.createOrder') }}</h2>
    </div>

    <el-steps :active="currentStep" finish-status="success" style="margin-bottom: 32px">
      <el-step v-for="(step, i) in steps" :key="i" :title="t(step)" />
    </el-steps>

    <!-- Step 1: 基本信息 -->
    <el-card v-show="currentStep === 0">
      <el-form label-width="120px">
        <el-form-item label="出货目的地">
          <el-radio-group v-model="form.destinationType">
            <el-radio-button value="fba">FBA</el-radio-button>
            <el-radio-button value="rsl">RSL</el-radio-button>
            <el-radio-button value="b2b">B2B</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="预计到达日">
          <el-date-picker v-model="form.expectedDate" type="date" style="width: 200px" />
        </el-form-item>
        <el-form-item label="总箱数">
          <el-input-number v-model="form.totalBoxCount" :min="1" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.memo" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
    </el-card>

    <!-- Step 2: 商品明细 -->
    <el-card v-show="currentStep === 1">
      <el-table :data="lines">
        <el-table-column label="SKU" width="200">
          <template #default="{ row, $index }">
            <el-autocomplete
              v-model="row.productSku"
              :fetch-suggestions="(_q: string, cb: any) => {
                searchProduct(row.productSku, $index)
                cb(productSearchResults.map((p: any) => ({ value: p.sku, ...p })))
              }"
              :trigger-on-focus="false"
              size="small"
              placeholder="SKU 搜索"
              @select="(item: any) => selectProduct({ ...item, _lineIdx: $index })"
            />
          </template>
        </el-table-column>
        <el-table-column label="FNSKU" width="140">
          <template #default="{ row }"><span style="font-size: 12px; color: #909399">{{ row.fnsku || '--' }}</span></template>
        </el-table-column>
        <el-table-column label="商品名">
          <template #default="{ row }"><el-input v-model="row.productName" size="small" /></template>
        </el-table-column>
        <el-table-column label="数量" width="120">
          <template #default="{ row }"><el-input-number v-model="row.expectedQuantity" :min="0" size="small" /></template>
        </el-table-column>
        <el-table-column width="60">
          <template #default="{ $index }">
            <el-button v-if="lines.length > 1" text type="danger" size="small" @click="removeLine($index)">X</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-button style="margin-top: 8px" @click="addLine">+ 添加商品</el-button>
      <div style="margin-top: 8px; color: #909399">合计: {{ lines.length }} SKU, {{ totalQuantity }} 件</div>
    </el-card>

    <!-- Step 3: FBA/RSL/B2B 信息 -->
    <el-card v-show="currentStep === 2">
      <!-- FBA -->
      <el-form v-if="form.destinationType === 'fba'" label-width="160px">
        <el-form-item label="Amazon Shipment ID">
          <el-input v-model="fbaInfo.shipmentId" style="width: 300px" />
        </el-form-item>
        <el-form-item label="目的 FC">
          <el-select v-model="fbaInfo.destinationFc" style="width: 200px">
            <el-option v-for="fc in fcOptions" :key="fc" :label="fc" :value="fc" />
          </el-select>
        </el-form-item>
        <el-form-item label="FBA 外箱标 PDF">
          <span style="color: #909399">可稍后在预定详情页上传</span>
        </el-form-item>
      </el-form>
      <!-- RSL -->
      <el-form v-else-if="form.destinationType === 'rsl'" label-width="160px">
        <el-form-item label="RSL 计划 ID"><el-input v-model="rslInfo.rslPlanId" style="width: 300px" /></el-form-item>
        <el-form-item label="楽天仓库"><el-input v-model="rslInfo.destinationWarehouse" style="width: 300px" /></el-form-item>
      </el-form>
      <!-- B2B -->
      <el-form v-else label-width="100px">
        <el-form-item label="收件人"><el-input v-model="b2bInfo.recipientName" /></el-form-item>
        <el-form-item label="邮编"><el-input v-model="b2bInfo.postalCode" style="width: 200px" /></el-form-item>
        <el-form-item label="都道府县"><el-input v-model="b2bInfo.prefecture" style="width: 200px" /></el-form-item>
        <el-form-item label="市区町村"><el-input v-model="b2bInfo.city" /></el-form-item>
        <el-form-item label="地址"><el-input v-model="b2bInfo.address1" /></el-form-item>
        <el-form-item label="电话"><el-input v-model="b2bInfo.phone" style="width: 200px" /></el-form-item>
      </el-form>
    </el-card>

    <!-- Step 4: 作业选项 -->
    <el-card v-show="currentStep === 3">
      <el-checkbox-group v-model="selectedOptions">
        <div v-for="opt in availableOptions" :key="opt.code"
          style="margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-radius: 6px"
          :style="{ background: selectedOptions.includes(opt.code) ? '#f0f9eb' : '#fafafa' }">
          <div style="display: flex; align-items: center; gap: 8px">
            <el-checkbox :value="opt.code" :disabled="opt.required">{{ opt.name }}</el-checkbox>
            <el-tag v-if="opt.required" size="small" type="info">必选</el-tag>
          </div>
          <div style="text-align: right; min-width: 180px">
            <span style="color: #606266; font-size: 13px">¥{{ opt.unitPrice }}/{{ opt.unit }}</span>
            <span v-if="selectedOptions.includes(opt.code)" style="margin-left: 12px; font-weight: bold; color: #67c23a">
              = ¥{{ (opt.unitPrice * totalQuantity).toLocaleString() }}
            </span>
          </div>
        </div>
      </el-checkbox-group>
      <div style="margin-top: 16px; padding: 12px; background: #f5f7fa; border-radius: 6px; display: flex; justify-content: space-between; align-items: center">
        <span style="font-size: 14px; color: #606266">预估总费用 / 概算合計</span>
        <span style="font-size: 24px; font-weight: bold; color: #409eff">¥{{ estimatedTotal.toLocaleString() }}</span>
      </div>
    </el-card>

    <!-- Step 5: 确认 -->
    <el-card v-show="currentStep === 4">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="目的地">{{ form.destinationType.toUpperCase() }}</el-descriptions-item>
        <el-descriptions-item label="箱数">{{ form.totalBoxCount }}</el-descriptions-item>
        <el-descriptions-item label="商品">{{ lines.filter(l => l.productSku).length }} SKU, {{ totalQuantity }} 件</el-descriptions-item>
        <el-descriptions-item label="作业项">{{ selectedOptions.length }} 项</el-descriptions-item>
        <el-descriptions-item label="预估费用">
          <span style="font-size: 18px; font-weight: bold; color: #409eff">¥{{ estimatedTotal.toLocaleString() }}</span>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 导航按钮 / ナビゲーション -->
    <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px">
      <el-button v-if="currentStep > 0" @click="currentStep--">{{ t('common.back') }}</el-button>
      <el-button v-if="currentStep < steps.length - 1" type="primary" @click="currentStep++">
        {{ t('common.confirm') }}
      </el-button>
      <el-button v-if="currentStep === steps.length - 1" type="primary" :loading="submitting" @click="handleSubmit">
        {{ t('common.submit') }}
      </el-button>
    </div>
  </div>
</template>
