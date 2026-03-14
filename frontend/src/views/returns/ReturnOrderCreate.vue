<template>
  <div class="return-create">
    <ControlPanel :title="t('wms.returns.createTitle', '返品作成')" :show-search="false">
      <template #actions>
        <OButton variant="secondary" size="sm" @click="$router.back()">{{ t('wms.returns.back', '戻る') }}</OButton>
      </template>
    </ControlPanel>

    <div class="form-card o-card">
      <div class="form-grid">
        <div class="form-row">
          <label class="form-label">{{ t('wms.returns.returnReason', '返品理由') }} <span class="required-badge">必須</span></label>
          <select v-model="form.returnReason" class="o-input" style="width:200px;">
            <option value="customer_request">{{ t('wms.returns.reasonCustomerRequest', 'お客様都合') }}</option>
            <option value="defective">{{ t('wms.returns.reasonDefective', '不良品') }}</option>
            <option value="wrong_item">{{ t('wms.returns.reasonWrongItem', '誤配送') }}</option>
            <option value="damaged">{{ t('wms.returns.reasonDamaged', '破損') }}</option>
            <option value="other">{{ t('wms.returns.reasonOther', 'その他') }}</option>
          </select>
        </div>

        <div class="form-row">
          <label class="form-label">{{ t('wms.returns.customerName', '顧客名') }}</label>
          <input v-model="form.customerName" class="o-input" style="width:200px;" :placeholder="t('wms.returns.customerName', '顧客名')" />
        </div>

        <div class="form-row">
          <label class="form-label">{{ t('wms.returns.receivedDate', '受付日') }}</label>
          <input v-model="form.receivedDate" type="date" class="o-input" style="width:200px;" />
        </div>

        <div class="form-row">
          <label class="form-label">{{ t('wms.returns.originalShipmentNumber', '元出荷番号') }}</label>
          <input v-model="form.shipmentOrderNumber" class="o-input" style="width:200px;" placeholder="SH..." />
        </div>

        <div class="form-row" style="grid-column:1/-1;">
          <label class="form-label">{{ t('wms.returns.reasonDetail', '理由詳細') }}</label>
          <textarea v-model="form.reasonDetail" class="o-input" rows="2" style="width:100%;max-width:500px;" />
        </div>
      </div>

      <!-- 返品明細 -->
      <div class="lines-section">
        <h3 class="lines-title">{{ t('wms.returns.returnLines', '返品明細') }}</h3>
        <table class="o-table" style="margin-bottom:0.5rem;">
          <thead>
            <tr>
              <th class="o-table-th" style="width:200px;">{{ t('wms.returns.productSkuSearch', '商品 (SKU検索)') }}</th>
              <th class="o-table-th o-table-th--right" style="width:80px;">{{ t('wms.returns.quantity', '数量') }}</th>
              <th class="o-table-th" style="width:120px;">{{ t('wms.returns.memo', 'メモ') }}</th>
              <th class="o-table-th" style="width:50px;"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(line, idx) in form.lines" :key="idx">
              <td class="o-table-td">
                <input v-model="line.productSku" class="o-input o-input-sm" placeholder="SKU" style="width:100%;" />
              </td>
              <td class="o-table-td o-table-td--right">
                <input v-model.number="line.quantity" type="number" min="1" class="o-input o-input-sm" style="width:70px;text-align:right;" />
              </td>
              <td class="o-table-td">
                <input v-model="line.memo" class="o-input o-input-sm" style="width:100%;" />
              </td>
              <td class="o-table-td">
                <button class="remove-btn" @click="form.lines.splice(idx, 1)">&times;</button>
              </td>
            </tr>
          </tbody>
        </table>
        <OButton variant="secondary" size="sm" @click="addLine">{{ t('wms.returns.addLine', '+ 行追加') }}</OButton>
      </div>

      <div class="form-actions">
        <OButton variant="primary" :disabled="isSubmitting" @click="handleCreate">
          {{ isSubmitting ? t('wms.returns.creating', '作成中...') : t('wms.common.create', '作成') }}
        </OButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import { createReturnOrder } from '@/api/returnOrder'
import { http } from '@/api/http'

const router = useRouter()
const toast = useToast()
const { t } = useI18n()
const isSubmitting = ref(false)

const form = reactive({
  returnReason: 'customer_request' as string,
  reasonDetail: '',
  customerName: '',
  receivedDate: new Date().toISOString().slice(0, 10),
  shipmentOrderNumber: '',
  lines: [{ productSku: '', quantity: 1, memo: '' }] as Array<{ productSku: string; quantity: number; memo: string }>,
})

const addLine = () => form.lines.push({ productSku: '', quantity: 1, memo: '' })

const handleCreate = async () => {
  const validLines = form.lines.filter(l => l.productSku.trim())
  if (validLines.length === 0) { toast.showError(t('wms.returns.atLeastOneLine', '少なくとも1行の商品を入力してください')); return }

  isSubmitting.value = true
  try {
    // SKUから商品IDを解決
    const resolvedLines = []
    for (const line of validLines) {
      const data = await http.get<any>('/products', { search: line.productSku, limit: '1' })
      const products = data.data || data || []
      const product = Array.isArray(products) ? products[0] : null
      if (!product) { toast.showError(t('wms.returns.productNotFound', `商品 ${line.productSku} が見つかりません`)); isSubmitting.value = false; return }
      resolvedLines.push({
        productId: product._id,
        productSku: product.sku,
        productName: product.name,
        quantity: line.quantity,
        memo: line.memo || undefined,
      })
    }

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
