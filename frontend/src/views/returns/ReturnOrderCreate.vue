<template>
  <div class="return-create">
    <PageHeader :title="t('wms.returns.createTitle', '返品作成')" :show-search="false">
      <template #actions>
        <Button variant="secondary" size="sm" @click="$router.back()">{{ t('wms.returns.back', '戻る') }}</Button>
      </template>
    </PageHeader>

    <div class="rounded-lg border bg-card p-4">
      <div class="form-grid">
        <div class="form-row">
          <label>{{ t('wms.returns.returnReason', '返品理由') }} <span class="text-destructive text-xs">*</span></label>
          <Select v-model="form.returnReason">
            <SelectTrigger class="h-9 w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="customer_request">{{ t('wms.returns.reasonCustomerRequest', 'お客様都合') }}</SelectItem>
              <SelectItem value="defective">{{ t('wms.returns.reasonDefective', '不良品') }}</SelectItem>
              <SelectItem value="wrong_item">{{ t('wms.returns.reasonWrongItem', '誤配送') }}</SelectItem>
              <SelectItem value="damaged">{{ t('wms.returns.reasonDamaged', '破損') }}</SelectItem>
              <SelectItem value="other">{{ t('wms.returns.reasonOther', 'その他') }}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="form-row">
          <label>{{ t('wms.returns.customerName', '顧客名') }}</label>
          <Input v-model="form.customerName" style="width:200px;" :placeholder="t('wms.returns.customerName', '顧客名')" />
        </div>

        <div class="form-row">
          <label>{{ t('wms.returns.receivedDate', '受付日') }}</label>
          <Input v-model="form.receivedDate" type="date" style="width:200px;" />
        </div>

        <div class="form-row">
          <label>{{ t('wms.returns.originalShipmentNumber', '元出荷番号') }}</label>
          <Input v-model="form.shipmentOrderNumber" style="width:200px;" placeholder="SH..." />
        </div>

        <div class="form-row" style="grid-column:1/-1;">
          <label>{{ t('wms.returns.reasonDetail', '理由詳細') }}</label>
          <textarea v-model="form.reasonDetail" rows="2" style="width:100%;max-width:500px;" />
        </div>
      </div>

      <!-- 返品明細 -->
      <div class="lines-section">
        <h3 class="lines-title">{{ t('wms.returns.returnLines', '返品明細') }}</h3>
        <Table style="margin-bottom:0.5rem;">
          <TableHeader>
            <TableRow>
              <TableHead style="width:200px;">{{ t('wms.returns.productSkuSearch', '商品 (SKU検索)') }}</TableHead>
              <TableHead class="text-right" style="width:80px;">{{ t('wms.returns.quantity', '数量') }}</TableHead>
              <TableHead style="width:120px;">{{ t('wms.returns.memo', 'メモ') }}</TableHead>
              <TableHead style="width:50px;"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="(line, idx) in form.lines" :key="idx">
              <TableCell>
                <Select :model-value="line.productId || '__empty__'" @update:model-value="(v: string) => { line.productId = v === '__empty__' ? '' : v; onProductSelect(idx) }">
                  <SelectTrigger class="h-8 w-full text-sm">
                    <SelectValue :placeholder="t('wms.returns.selectProduct', '商品を選択...')" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__empty__">{{ t('wms.returns.selectProduct', '商品を選択...') }}</SelectItem>
                    <SelectItem v-for="p in products" :key="p._id" :value="p._id">
                      {{ p.sku }} - {{ p.name }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell class="text-right">
                <Input v-model.number="line.quantity" type="number" min="1" class="h-8 text-sm" style="width:70px;text-align:right;" />
              </TableCell>
              <TableCell>
                <Input v-model="line.memo" class="h-8 text-sm" style="width:100%;" />
              </TableCell>
              <TableCell>
                <Button class="remove-btn" @click="form.lines.splice(idx, 1)">&times;</Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <Button variant="secondary" size="sm" @click="addLine">{{ t('wms.returns.addLine', '+ 行追加') }}</Button>
      </div>

      <div class="form-actions">
        <Button variant="default" :disabled="isSubmitting" @click="handleCreate">
          {{ isSubmitting ? t('wms.returns.creating', '作成中...') : t('wms.common.create', '作成') }}
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { onMounted, ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import PageHeader from '@/components/shared/PageHeader.vue'
import { createReturnOrder } from '@/api/returnOrder'
import { fetchProducts } from '@/api/product'
import type { Product } from '@/types/product'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const router = useRouter()
const toast = useToast()
const { t } = useI18n()
const isSubmitting = ref(false)
const products = ref<Product[]>([])

onMounted(async () => {
  try {
    products.value = await fetchProducts()
  } catch (e: any) {
    toast.showError(t('wms.returns.productLoadError', '商品マスタの取得に失敗しました'))
  }
})

const form = reactive({
  returnReason: 'customer_request' as string,
  reasonDetail: '',
  customerName: '',
  receivedDate: new Date().toISOString().slice(0, 10),
  shipmentOrderNumber: '',
  lines: [{ productId: '', productSku: '', quantity: 1, memo: '' }] as Array<{ productId: string; productSku: string; quantity: number; memo: string }>,
})

// 商品選択時にSKUを自動設定 / 选择商品时自动设置SKU
const onProductSelect = (idx: number) => {
  const line = form.lines[idx]!
  const product = products.value.find(p => p._id === line.productId)
  line.productSku = product?.sku || ''
}

const addLine = () => form.lines.push({ productId: '', productSku: '', quantity: 1, memo: '' })

const handleCreate = async () => {
  const validLines = form.lines.filter(l => l.productId)
  if (validLines.length === 0) { toast.showError(t('wms.returns.atLeastOneLine', '少なくとも1行の商品を入力してください')); return }

  isSubmitting.value = true
  try {
    // 選択済み商品からライン情報を構築 / 从已选商品构建行信息
    const resolvedLines = validLines.map(line => {
      const product = products.value.find(p => p._id === line.productId)
      return {
        productId: line.productId,
        productSku: product?.sku || line.productSku,
        productName: product?.name || '',
        quantity: line.quantity,
        memo: line.memo || undefined,
      }
    })

    const result = await createReturnOrder({
      returnReason: form.returnReason,
      reasonDetail: form.reasonDetail || undefined,
      customerName: form.customerName || undefined,
      receivedDate: form.receivedDate || undefined,
      lines: resolvedLines,
      memo: undefined,
    })
    toast.showSuccess(t('wms.returns.createSuccess', `返品 ${result.orderNumber} を作成しました`))
    router.push(`/returns/${result._id}`)
  } catch (e: any) {
    toast.showError(e?.message || t('wms.returns.createError', '作成に失敗しました'))
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style>
@import '@/styles/order-table.css';
</style>

<style scoped>
.return-create { display: flex; flex-direction: column; gap: 16px; padding: 0 20px 20px; }
:deep(.o-control-panel) { margin-left: -20px; margin-right: -20px; }
.form-card { max-width: 800px; padding: 1.5rem; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; }
.form-row { display: flex; flex-direction: column; gap: 4px; }
.form-label { font-weight: 600; font-size: 13px; color: var(--o-gray-700); }
.required-badge { display:inline-block;background:#dc3545;color:#fff;font-size:10px;font-weight:700;line-height:1;padding:2px 5px;border-radius:3px;white-space:nowrap;vertical-align:middle;margin-left:4px; }
.lines-section { margin-bottom: 1.5rem; }
.lines-title { font-size: 15px; font-weight: 600; margin-bottom: 0.5rem; color: var(--o-gray-700); }
.form-actions { margin-top: 1rem; }
.remove-btn { background: none; border: none; cursor: pointer; color: #f56c6c; font-size: 18px; }
.o-table-td--right { text-align: right; }
.o-table-th--right { text-align: right; }
.o-card {
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-border-color, #e4e7ed);
  border-radius: var(--o-border-radius, 8px);
}
</style>
