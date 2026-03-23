<script setup lang="ts">
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
/**
 * 検品操作ページ / 检品操作页面
 *
 * 入庫予約の商品を6次元チェックし、異常を記録する。
 * 对入库预定的商品进行6维度检查，记录异常。
 */
import { ref, onMounted } from 'vue'
import { Card, CardContent } from '@/components/ui/card'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { getApiBaseUrl } from '@/api/base'
import { useWmsUserStore } from '@/stores/wms/useWmsUserStore'
import { Button } from '@/components/ui/button'

const route = useRoute()
const router = useRouter()
const userStore = useWmsUserStore()
const baseUrl = getApiBaseUrl()
const { showSuccess, showError } = useToast()

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
  { value: 'pass', label: '✓ 合格', color: 'bg-green-100 text-green-800' },
  { value: 'fail', label: '✗ 不合格', color: 'bg-red-100 text-red-800' },
  { value: 'na', label: '— N/A', color: 'bg-muted text-muted-foreground' },
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
      showSuccess('検品記録を保存しました / 检品记录已保存')
      router.back()
    } else {
      const data = await res.json()
      showError(data.message || '保存に失敗')
    }
  } catch (e: any) { showError(e.message) }
  finally { submitting.value = false }
}

onMounted(loadOrder)
</script>

<template>
  <div style="max-width: 800px; margin: 0 auto">
    <div v-if="loading" class="space-y-3 p-4">
      <Skeleton class="h-4 w-[250px]" />
      <Skeleton class="h-4 w-[200px]" />
      <Skeleton class="h-10 w-full" />
      <Skeleton class="h-10 w-full" />
      <Skeleton class="h-10 w-full" />
    </div>
    <template v-else>
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px">
        <Button class="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 border border-input bg-background hover:bg-accent" @click="router.back()">戻る</Button>
        <h2 style="margin: 0">検品 / 检品: {{ order?.orderNumber || '...' }}</h2>
      </div>

      <template v-if="order">
        <!-- 検品方式 / 检品方式 -->
        <div class="rounded-lg border bg-card shadow-sm" style="margin-bottom: 16px">
          <div class="border-b px-4 py-3">検品方式 / 检品方式</div>
          <div class="p-4">
            <div class="flex gap-4">
              <label class="inline-flex items-center gap-1 text-sm"><input type="radio" v-model="inspectionMode" value="full" /> 全数検品 / 全检</label>
              <label class="inline-flex items-center gap-1 text-sm"><input type="radio" v-model="inspectionMode" value="sampling" /> 抜取検品 / 抽检</label>
            </div>
            <div v-if="inspectionMode === 'sampling'" style="margin-top: 8px">
              抜取率 / 抽检比例: <Input v-model.number="samplingRate" type="number" min="0.01" max="1" step="0.05" class="inline-flex h-8 w-20 rounded-md border border-input bg-transparent px-2 py-1 text-sm" /> ({{ Math.round(samplingRate * 100) }}%)
            </div>
          </div>
        </div>

        <!-- 6次元チェック / 6维度检查 -->
        <div class="rounded-lg border bg-card shadow-sm" style="margin-bottom: 16px">
          <div class="border-b px-4 py-3">6次元チェック / 6维度检查</div>
          <div class="p-4">
            <div class="grid gap-4">
              <div v-for="(displayLabel, fieldKey) in {
                skuMatch: 'SKU 一致',
                barcodeMatch: 'バーコード一致',
                quantityMatch: '数量一致',
                appearanceOk: '外観OK',
                accessoriesOk: '付属品OK',
                packagingOk: '包装OK',
              }" :key="fieldKey" class="grid grid-cols-4 items-center gap-4">
                <label class="text-right text-sm font-medium">{{ displayLabel }}</label>
                <div class="col-span-3 flex gap-2">
                  <Button v-for="opt in checkOptions" :key="opt.value"
                    :class="[(checks as any)[fieldKey] === opt.value ? opt.color + ' ring-2 ring-offset-1' : 'bg-muted/30 text-muted-foreground']"
                    class="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium cursor-pointer"
                    @click="(checks as any)[fieldKey] = opt.value"
                  >
                    {{ opt.label }}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 数量 / 数量 -->
        <div class="rounded-lg border bg-card shadow-sm" style="margin-bottom: 16px">
          <div class="p-4">
            <div class="grid grid-cols-3 gap-4">
              <div>
                <div style="color: #909399; font-size: 12px">検品数量</div>
                <Input v-model.number="inspectedQuantity" type="number" min="0" class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" />
              </div>
              <div>
                <div style="color: #909399; font-size: 12px">合格数量</div>
                <Input v-model.number="passedQuantity" type="number" min="0" class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" />
              </div>
              <div>
                <div style="color: #909399; font-size: 12px">不合格数量</div>
                <Input v-model.number="failedQuantity" type="number" min="0" class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" />
              </div>
            </div>
          </div>
        </div>

        <!-- 異常 / 异常 -->
        <div class="rounded-lg border bg-card shadow-sm" style="margin-bottom: 16px">
          <div class="border-b px-4 py-3">
            <div style="display: flex; justify-content: space-between; align-items: center">
              <span>異常記録 / 异常记录</span>
              <Button class="inline-flex items-center justify-center rounded-md text-sm font-medium h-8 px-3 border border-input bg-background hover:bg-accent" @click="addException">+ 追加</Button>
            </div>
          </div>
          <div class="p-4">
            <div v-for="(exc, idx) in exceptions" :key="idx" style="border-bottom: 1px solid #f0f0f0; padding: 12px 0">
              <div class="grid grid-cols-12 gap-2">
                <div class="col-span-4">
                  <select v-model="exc.category" class="flex h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm">
                    <option v-for="c in categoryOptions" :key="c.value" :value="c.value">{{ c.label }}</option>
                  </select>
                </div>
                <div class="col-span-2">
                  <Input v-model.number="exc.quantity" type="number" min="0" class="flex h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm" />
                </div>
                <div class="col-span-5">
                  <Input v-model="exc.description" placeholder="説明 / 描述" class="flex h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm" />
                </div>
                <div class="col-span-1">
                  <Button class="text-sm text-destructive hover:underline" @click="removeException(idx)">X</Button>
                </div>
              </div>
            </div>
            <div v-if="!exceptions.length" class="flex flex-col items-center justify-center py-6 text-muted-foreground">
              <p>異常なし / 无异常</p>
            </div>
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 8px">
          <Button class="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 border border-input bg-background hover:bg-accent" @click="router.back()">キャンセル</Button>
          <Button class="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/90" :disabled="submitting" @click="submitInspection">
            {{ submitting ? '処理中...' : '検品完了 / 检品完成' }}
          </Button>
        </div>
      </template>
    </template>
  </div>
</template>
