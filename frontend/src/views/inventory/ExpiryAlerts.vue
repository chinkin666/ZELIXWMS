<template>
  <div class="expiry-alerts" style="display:flex;flex-direction:column;">
    <ControlPanel title="賞味期限アラート" :show-search="false">
      <template #center>
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:13px;color:#606266;">表示期間</span>
          <select v-model="daysAhead" class="o-input" style="width:120px;" @change="loadData">
            <option :value="7">7日以内</option>
            <option :value="14">14日以内</option>
            <option :value="30">30日以内</option>
            <option :value="60">60日以内</option>
            <option :value="90">90日以内</option>
          </select>
        </div>
      </template>
      <template #actions>
        <OButton variant="secondary" size="sm" :disabled="isUpdating" @click="handleUpdateExpired">
          {{ isUpdating ? '更新中...' : '期限切れ一括更新' }}
        </OButton>
      </template>
    </ControlPanel>

    <!-- サマリーカード -->
    <div class="summary-cards">
      <div class="summary-card summary-card--danger">
        <div class="summary-value">{{ expiredCount }}</div>
        <div class="summary-label">期限切れ</div>
      </div>
      <div class="summary-card summary-card--warning">
        <div class="summary-value">{{ warningCount }}</div>
        <div class="summary-label">期限間近</div>
      </div>
      <div class="summary-card summary-card--info">
        <div class="summary-value">{{ alerts.length }}</div>
        <div class="summary-label">合計</div>
      </div>
    </div>

    <div class="o-table-wrapper">
      <table class="o-table">
        <thead>
          <tr>
            <th class="o-table-th" style="width:80px;">状態</th>
            <th class="o-table-th" style="width:140px;">ロット番号</th>
            <th class="o-table-th" style="width:120px;">SKU</th>
            <th class="o-table-th" style="width:180px;">商品名</th>
            <th class="o-table-th" style="width:120px;">賞味期限</th>
            <th class="o-table-th" style="width:100px;">残り日数</th>
            <th class="o-table-th o-table-th--right" style="width:100px;">在庫数</th>
            <th class="o-table-th o-table-th--right" style="width:100px;">有効在庫</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="8" class="o-table-empty">読み込み中...</td>
          </tr>
          <tr v-else-if="alerts.length === 0">
            <td colspan="8" class="o-table-empty">賞味期限アラートはありません</td>
          </tr>
          <tr v-for="alert in alerts" :key="alert.lotId" class="o-table-row">
            <td class="o-table-td">
              <span class="o-status-tag" :class="alert.isExpired ? 'o-status-tag--error' : 'o-status-tag--pending'">
                {{ alert.isExpired ? '期限切れ' : '期限間近' }}
              </span>
            </td>
            <td class="o-table-td"><strong>{{ alert.lotNumber }}</strong></td>
            <td class="o-table-td">{{ alert.productSku }}</td>
            <td class="o-table-td">{{ alert.productName || '-' }}</td>
            <td class="o-table-td">
              <span :class="alert.isExpired ? 'expiry-expired' : 'expiry-warning'">
                {{ formatDate(alert.expiryDate) }}
              </span>
            </td>
            <td class="o-table-td" style="text-align:center;">
              <span v-if="alert.daysUntilExpiry !== null" :class="alert.daysUntilExpiry < 0 ? 'expiry-expired' : 'expiry-warning'">
                {{ alert.daysUntilExpiry < 0 ? `${Math.abs(alert.daysUntilExpiry)}日超過` : `${alert.daysUntilExpiry}日` }}
              </span>
              <span v-else>-</span>
            </td>
            <td class="o-table-td" style="text-align:right;">{{ alert.totalQuantity }}</td>
            <td class="o-table-td" style="text-align:right;">{{ alert.totalAvailable }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import OButton from '@/components/odoo/OButton.vue'
import { fetchExpiryAlerts, updateExpiredLots } from '@/api/lot'
import type { ExpiryAlert } from '@/types/inventory'

const alerts = ref<ExpiryAlert[]>([])
const isLoading = ref(false)
const isUpdating = ref(false)
const daysAhead = ref(30)

const expiredCount = computed(() => alerts.value.filter(a => a.isExpired).length)
const warningCount = computed(() => alerts.value.filter(a => !a.isExpired).length)

async function loadData() {
  isLoading.value = true
  try {
    const res = await fetchExpiryAlerts(daysAhead.value)
    alerts.value = res.alerts
  } catch (e: any) {
    console.error('アラート取得エラー:', e)
  } finally {
    isLoading.value = false
  }
}

async function handleUpdateExpired() {
  if (!confirm('期限切れのロットステータスを一括更新しますか？')) return
  isUpdating.value = true
  try {
    const res = await updateExpiredLots()
    alert(res.message)
    await loadData()
  } catch (e: any) {
    alert(e.response?.data?.message || 'エラーが発生しました')
  } finally {
    isUpdating.value = false
  }
}

function formatDate(d: string) {
  return d ? new Date(d).toLocaleDateString('ja-JP') : ''
}

onMounted(loadData)
</script>

<style scoped>
@import '@/styles/order-table.css';

.expiry-alerts {
  max-width: 1400px;
  margin: 0 auto;
}

:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}

.summary-cards {
  display: flex;
  gap: 16px;
  margin: 16px 0;
}

.summary-card {
  flex: 1;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  border: 1px solid var(--o-border-color, #e4e7ed);
  background: var(--o-view-background, #fff);
}

.summary-card--danger { border-left: 4px solid #f56c6c; }
.summary-card--warning { border-left: 4px solid #e6a23c; }
.summary-card--info { border-left: 4px solid #409eff; }

.summary-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--o-gray-700, #303133);
}

.summary-label {
  font-size: 13px;
  color: var(--o-gray-500, #909399);
  margin-top: 4px;
}

.o-table-th--right { text-align: right; }

.expiry-expired { color: #f56c6c; font-weight: 600; }
.expiry-warning { color: #e6a23c; font-weight: 500; }
</style>
