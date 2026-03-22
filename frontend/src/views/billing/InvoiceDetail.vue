<template>
  <div class="invoice-detail" :class="{ 'invoice-detail--print': isPrintMode }">
    <!-- 操作バー（印刷時非表示） / 操作栏（打印时隐藏） -->
    <div class="invoice-actions no-print">
      <OButton variant="secondary" size="sm" @click="router.back()">戻る</OButton>
      <div style="display:flex;gap:6px;">
        <OButton
          v-if="invoice && (invoice.status === 'draft' || invoice.status === 'issued')"
          variant="primary"
          size="sm"
          @click="handleMarkPaid"
        >
          入金確認
        </OButton>
        <OButton variant="secondary" size="sm" @click="handlePrint">印刷</OButton>
      </div>
    </div>

    <!-- ローディング / 加载中 -->
    <div v-if="loading" class="invoice-loading">読み込み中...</div>

    <!-- エラー / 错误 -->
    <div v-else-if="errorMsg" class="invoice-error">{{ errorMsg }}</div>

    <!-- 請求書本体 / 发票主体 -->
    <div v-else-if="invoice" class="invoice-paper">
      <!-- ヘッダー / 头部 -->
      <div class="invoice-header">
        <h1 class="invoice-title">請求書</h1>
        <div class="invoice-meta">
          <table class="meta-table">
            <tr>
              <th>請求書番号</th>
              <td>{{ invoice.invoiceNumber }}</td>
            </tr>
            <tr>
              <th>発行日</th>
              <td>{{ formatDate(invoice.issueDate) }}</td>
            </tr>
            <tr>
              <th>お支払期限</th>
              <td>{{ formatDate(invoice.dueDate) }}</td>
            </tr>
            <tr>
              <th>ステータス</th>
              <td>
                <span class="invoice-status" :class="`invoice-status--${invoice.status}`">
                  {{ statusLabel(invoice.status) }}
                </span>
              </td>
            </tr>
          </table>
        </div>
      </div>

      <!-- 請求先情報 / 客户信息 -->
      <div class="invoice-client">
        <div class="client-name">{{ invoice.clientName || '---' }} 御中</div>
        <div class="client-period">対象期間: {{ invoice.period }}</div>
      </div>

      <hr class="invoice-divider" />

      <!-- 明細テーブル / 明细表 -->
      <table class="invoice-table">
        <thead>
          <tr>
            <th class="col-desc">項目</th>
            <th class="col-qty">数量</th>
            <th class="col-unit">単価</th>
            <th class="col-amount">金額</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, idx) in (invoice.lineItems ?? [])" :key="idx">
            <td class="col-desc">{{ item.description }}</td>
            <td class="col-qty">{{ (item.quantity ?? 0).toLocaleString() }}</td>
            <td class="col-unit">&yen;{{ (item.unitPrice ?? 0).toLocaleString() }}</td>
            <td class="col-amount">&yen;{{ (item.amount ?? 0).toLocaleString() }}</td>
          </tr>
          <tr v-if="invoice.lineItems?.length === 0">
            <td colspan="4" style="text-align:center;color:#999;">明細なし</td>
          </tr>
        </tbody>
      </table>

      <!-- 合計エリア / 合计区域 -->
      <div class="invoice-totals">
        <table class="totals-table">
          <tr>
            <th>小計</th>
            <td>&yen;{{ (invoice.subtotal ?? 0).toLocaleString() }}</td>
          </tr>
          <tr>
            <th>消費税（{{ Math.round((invoice.taxRate ?? 0) * 100) }}%）</th>
            <td>&yen;{{ (invoice.taxAmount ?? 0).toLocaleString() }}</td>
          </tr>
          <tr class="total-row">
            <th>合計</th>
            <td>&yen;{{ (invoice.totalAmount ?? 0).toLocaleString() }}</td>
          </tr>
        </table>
      </div>

      <!-- 備考 / 备注 -->
      <div v-if="invoice.memo" class="invoice-memo">
        <strong>備考:</strong> {{ invoice.memo }}
      </div>

      <!-- 入金済情報 / 已入金信息 -->
      <div v-if="invoice.paidAt" class="invoice-paid-info">
        入金日: {{ formatDate(invoice.paidAt) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessageBox } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import OButton from '@/components/odoo/OButton.vue'
import { fetchInvoiceDetail, updateInvoiceStatus } from '@/api/billing'
import type { InvoiceDetail, InvoiceStatus } from '@/api/billing'

const route = useRoute()
const router = useRouter()
const { show: showToast } = useToast()

const invoice = ref<InvoiceDetail | null>(null)
const loading = ref(false)
const errorMsg = ref('')
const isPrintMode = ref(false)

// ── ステータス表示 / 状态显示 ──
const statusLabel = (s: InvoiceStatus): string => {
  const map: Record<InvoiceStatus, string> = {
    draft: '下書き',
    issued: '発行済',
    sent: '送付済',
    paid: '入金済',
    overdue: '支払遅延',
    cancelled: 'キャンセル',
  }
  return map[s] || s
}

// ── 日付フォーマット / 日期格式化 ──
const formatDate = (dateStr: string): string => {
  if (!dateStr) return '---'
  const d = new Date(dateStr)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

// ── データ取得 / 数据获取 ──
const loadInvoice = async () => {
  const id = route.params.id as string
  if (!id) {
    errorMsg.value = '請求書IDが指定されていません'
    return
  }
  loading.value = true
  errorMsg.value = ''
  try {
    invoice.value = await fetchInvoiceDetail(id)
  } catch (error: any) {
    errorMsg.value = error?.message || '請求書の取得に失敗しました'
  } finally {
    loading.value = false
  }
}

// ── 入金確認 / 确认入金 ──
const handleMarkPaid = async () => {
  if (!invoice.value) return
  try {
    await ElMessageBox.confirm(
      '入金を確認しますか？ / 确定要确认入金吗？',
      '確認 / 确认',
      { confirmButtonText: '確認 / 确认', cancelButtonText: 'キャンセル / 取消', type: 'warning' },
    )
  } catch { return }
  try {
    const updated = await updateInvoiceStatus(invoice.value._id, 'paid')
    invoice.value = { ...invoice.value, ...updated }
    showToast('入金を確認しました', 'success')
  } catch (error: any) {
    showToast(error?.message || '入金確認に失敗しました', 'danger')
  }
}

// ── 印刷 / 打印 ──
const handlePrint = () => {
  window.print()
}

onMounted(() => {
  loadInvoice()
})
</script>

<style scoped>
.invoice-detail {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.invoice-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.invoice-loading,
.invoice-error {
  text-align: center;
  padding: 40px;
  color: #666;
}

.invoice-error {
  color: #dc3545;
}

/* 請求書用紙スタイル / 发票纸张样式 */
.invoice-paper {
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 40px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}

.invoice-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 30px;
}

.invoice-title {
  font-size: 28px;
  font-weight: 700;
  color: #333;
  margin: 0;
}

.meta-table {
  border-collapse: collapse;
  text-align: left;
}

.meta-table th {
  padding: 3px 12px 3px 0;
  font-weight: 500;
  color: #666;
  font-size: 13px;
  white-space: nowrap;
}

.meta-table td {
  padding: 3px 0;
  font-size: 13px;
}

.invoice-status {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: 600;
}

.invoice-status--draft { background: #f0f0f0; color: #666; }
.invoice-status--issued { background: #e3f2fd; color: #1565c0; }
.invoice-status--sent { background: #fff3e0; color: #e65100; }
.invoice-status--paid { background: #e8f5e9; color: #2e7d32; }
.invoice-status--overdue { background: #fce4ec; color: #c62828; }
.invoice-status--cancelled { background: #f5f5f5; color: #999; }

.invoice-client {
  margin-bottom: 20px;
}

.client-name {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.client-period {
  font-size: 13px;
  color: #666;
}

.invoice-divider {
  border: none;
  border-top: 2px solid #333;
  margin: 20px 0;
}

/* 明細テーブル / 明细表 */
.invoice-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 24px;
}

.invoice-table th {
  background: #f8f9fa;
  border-bottom: 2px solid #dee2e6;
  padding: 10px 12px;
  font-size: 13px;
  font-weight: 600;
  color: #495057;
}

.invoice-table td {
  border-bottom: 1px solid #eee;
  padding: 10px 12px;
  font-size: 13px;
}

.col-desc { text-align: left; }
.col-qty { text-align: right; width: 80px; }
.col-unit { text-align: right; width: 120px; }
.col-amount { text-align: right; width: 120px; }

/* 合計エリア / 合计区域 */
.invoice-totals {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 24px;
}

.totals-table {
  border-collapse: collapse;
  min-width: 280px;
}

.totals-table th {
  text-align: left;
  padding: 6px 16px 6px 0;
  font-weight: 500;
  font-size: 13px;
  color: #555;
}

.totals-table td {
  text-align: right;
  padding: 6px 0;
  font-size: 13px;
}

.totals-table .total-row th,
.totals-table .total-row td {
  border-top: 2px solid #333;
  padding-top: 10px;
  font-size: 16px;
  font-weight: 700;
  color: #333;
}

.invoice-memo {
  margin-top: 20px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 4px;
  font-size: 13px;
  color: #555;
}

.invoice-paid-info {
  margin-top: 12px;
  font-size: 13px;
  color: #2e7d32;
  font-weight: 500;
}

/* 印刷用スタイル / 打印样式 */
@media print {
  .no-print {
    display: none !important;
  }

  .invoice-detail {
    max-width: 100%;
    padding: 0;
    margin: 0;
  }

  .invoice-paper {
    border: none;
    box-shadow: none;
    padding: 20px;
  }

  .invoice-status {
    border: 1px solid #999;
  }
}
</style>
