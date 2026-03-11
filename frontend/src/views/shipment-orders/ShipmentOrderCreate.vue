<template>
  <div class="o-view">
    <!-- ControlPanel Header -->
    <ControlPanel
      title="出荷指示作成"
      :breadcrumbs="['出荷指示', '出荷指示作成']"
      :show-search="false"
    >
      <template #actions>
        <input
          class="o-input o-cp-search-input"
          v-model="globalSearchText"
          placeholder="検索..."
        />
        <OButton
          v-if="!bundleModeEnabled"
          variant="secondary"
          @click="handleOpenBundleList"
        >
          同捆候補一覧
        </OButton>
        <OButton
          v-else
          variant="secondary"
          @click="handleExitBundleMode"
        >
          同梱モード終了
        </OButton>
        <template v-if="displayFilter !== 'pending_waybill'">
          <OButton variant="success" @click="handleImportClick">
            一括登録
          </OButton>
          <OButton variant="primary" @click="handleAdd">
            個別登録
          </OButton>
        </template>
      </template>
    </ControlPanel>

    <div class="o-content">
      <!-- Quick Stats Row -->
      <div class="o-quick-stats">
        <div class="o-stat-card">
          <div class="o-stat-icon o-stat-icon-total">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor"><path d="M14.5 3a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h13zm-13-1A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2h-13z"/><path d="M5 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 5 8zm0-2.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm0 5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-1-5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0zM4 8a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0zm0 2.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0z"/></svg>
          </div>
          <div class="o-stat-info">
            <span class="o-stat-value">{{ nonHeldRows.length }}</span>
            <span class="o-stat-label">登録対象</span>
          </div>
        </div>
        <div class="o-stat-card">
          <div class="o-stat-icon o-stat-icon-error">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor"><path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg>
          </div>
          <div class="o-stat-info">
            <span class="o-stat-value">{{ errorRowCount }}</span>
            <span class="o-stat-label">エラー件数</span>
          </div>
        </div>
        <div class="o-stat-card">
          <div class="o-stat-icon o-stat-icon-unregistered">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor"><path d="M11 5.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-1z"/><path d="M2 2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H2zm13 2v5H1V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1zm-1 9H2a1 1 0 0 1-1-1v-1h14v1a1 1 0 0 1-1 1z"/></svg>
          </div>
          <div class="o-stat-info">
            <span class="o-stat-value">{{ pendingWaybillNonHeldCount }}</span>
            <span class="o-stat-label">送り状未発行</span>
          </div>
        </div>
        <div
          class="o-stat-card"
          :class="{ 'o-stat-card--clickable': displayFilter === 'pending_waybill' || displayFilter === 'held' }"
          @click="handleStatCardHoldClick"
          title="選択中の行を保留/解除（送り状未発行・保留タブのみ）"
        >
          <div class="o-stat-icon o-stat-icon-held">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor"><path d="M6.5 1A1.5 1.5 0 0 0 5 2.5V3H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1H11v-.5A1.5 1.5 0 0 0 9.5 1h-3zm0 1h3a.5.5 0 0 1 .5.5V3H6v-.5a.5.5 0 0 1 .5-.5z"/></svg>
          </div>
          <div class="o-stat-info">
            <span class="o-stat-value">{{ totalHeldCount }}</span>
            <span class="o-stat-label">保留</span>
          </div>
        </div>
      </div>

      <!-- Filter Tabs -->
      <div class="o-filter-tabs">
        <button class="o-filter-tab" :class="{ active: displayFilter === 'new' }" @click="displayFilter = 'new'">
          新規 <span class="o-tab-count">{{ nonHeldRows.length - errorRowCount }}</span>
        </button>
        <button class="o-filter-tab" :class="{ active: displayFilter === 'error' }" @click="displayFilter = 'error'">
          エラー <span class="o-tab-count">{{ errorRowCount }}</span>
        </button>
        <button class="o-filter-tab" :class="{ active: displayFilter === 'pending_waybill' }" @click="displayFilter = 'pending_waybill'">
          送り状未発行 <span class="o-tab-count">{{ pendingWaybillNonHeldCount }}</span>
        </button>
        <button class="o-filter-tab" :class="{ active: displayFilter === 'held' }" @click="displayFilter = 'held'">
          保留 <span class="o-tab-count">{{ totalHeldCount }}</span>
        </button>
        <button
          v-if="tableSelectedKeys.length > 0 && displayFilter !== 'pending_waybill'"
          class="o-btn o-btn-sm o-batch-delete-btn"
          @click="handleBatchDeleteFromBar"
        >
          {{ tableSelectedKeys.length }}件選択中 削除
        </button>
      </div>

      <!-- Backend error alert -->
      <div
        v-if="backendErrorCount > 0"
        class="o-alert o-alert-error"
      >
        <span>サーバー側でエラーが発生しました。エラー行のみ表示に切り替えています。</span>
        <button class="o-alert-close" @click="clearBackendErrors">&times;</button>
      </div>

      <!-- Bundle mode bar -->
      <div v-if="bundleModeEnabled" class="bundle-mode-section">
        <div class="bundle-mode-bar" @click="showBundleFilterDialog = true">
          <span class="bundle-mode-bar__title">絞り込み条件：</span>
          <span class="bundle-mode-bar__labels">{{ bundleFilterLabels || '未設定' }}</span>
        </div>
        <div class="bundle-mode-actions">
          <OButton
            variant="primary"
            size="sm"
            :disabled="tableSelectedKeys.length === 0 || selectedBundleGroupKeys.length === 0"
            @click="handleBundleMergeAllSelected"
          >
            同梱する
          </OButton>
          <OButton
            variant="warning"
            size="sm"
            :disabled="!hasUnbundleableRows"
            @click="handleUnbundleSelected"
          >
            同梱を解除する
          </OButton>
        </div>
      </div>

      <!-- Plain table -->
      <div class="o-table-wrapper">
        <table class="o-table" :class="{ 'o-table--resizing': resizingCol }">
          <thead>
            <tr>
              <th class="o-table-th o-table-th--checkbox" style="width:40px;">
                <input
                  type="checkbox"
                  :checked="isAllCurrentPageSelected"
                  :indeterminate="isSomeCurrentPageSelected && !isAllCurrentPageSelected"
                  @change="toggleSelectAll"
                />
              </th>
              <th class="o-table-th" style="width:90px;">状態</th>
              <th
                v-for="col in displayColumns"
                :key="col.key"
                class="o-table-th"
                :class="{ 'o-table-th--sortable': !bundleModeEnabled }"
                :style="{ width: getColWidth(col) }"
                @click="handleSortClick(col)"
              >
                {{ col.title }}
                <span v-if="sortKey === (col.dataKey || col.key) && !bundleModeEnabled" class="o-sort-icon">
                  {{ sortOrder === 'asc' ? '▲' : '▼' }}
                </span>
                <span
                  class="o-resize-handle"
                  @mousedown="onResizeStart($event, col)"
                  @click.stop
                />
              </th>
              <th class="o-table-th" style="width:60px;">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="paginatedRows.length === 0">
              <td :colspan="displayColumns.length + 3" class="o-table-empty">データがありません</td>
            </tr>
            <tr
              v-for="row in paginatedRows"
              :key="row.id"
              class="o-table-row"
              :class="{ 'o-table-row--selected': tableSelectedKeys.includes(row.id) }"
            >
              <td class="o-table-td o-table-td--checkbox">
                <input
                  type="checkbox"
                  :checked="tableSelectedKeys.includes(row.id)"
                  @change="toggleRowSelection(row)"
                />
              </td>
              <td class="o-table-td">
                <span v-if="displayFilter === 'pending_waybill'" class="o-status-tag o-status-tag--pending">送り状未発行</span>
                <span v-else-if="isHeld(row.id)" class="o-status-tag o-status-tag--held">保留</span>
                <span v-else-if="hasRowErrors(row)" class="o-status-tag o-status-tag--error">エラー</span>
                <span v-else class="o-status-tag o-status-tag--new">新規</span>
              </td>
              <td
                v-for="col in displayColumns"
                :key="col.key"
                class="o-table-td"
                :class="{ 'o-table-td--error': isCellError(row, col) }"
              >
                <template v-if="(col.dataKey || col.key) === 'customerManagementNumber'">
                  <a href="#" class="customer-mgmt-link o-cell" @click.prevent="handleEdit(row)">
                    {{ row.customerManagementNumber || '-' }}
                  </a>
                </template>
                <template v-else-if="(col.dataKey || col.key) === '__recipient_name__'">
                  <span class="o-cell">{{ row.recipient?.name || '-' }} {{ row.honorific || '様' }}<br/><span class="o-cell-sub">{{ row.recipient?.phone || '-' }}</span></span>
                </template>
                <template v-else-if="(col.dataKey || col.key) === '__recipient_addr__'">
                  <span class="o-cell">〒{{ fmtPostal(row.recipient?.postalCode) }}<br/><span class="o-cell-sub">{{ [row.recipient?.prefecture, row.recipient?.city, row.recipient?.street].filter(Boolean).join(' ') || '-' }}</span></span>
                </template>
                <template v-else-if="(col.dataKey || col.key) === '__sender_name__'">
                  <span class="o-cell">{{ row.sender?.name || '-' }}</span>
                </template>
                <template v-else-if="(col.dataKey || col.key) === '__orderer_name__'">
                  <span class="o-cell">{{ row.orderer?.name || '-' }}</span>
                </template>
                <template v-else-if="(col.dataKey || col.key) === 'deliveryDatePreference'">
                  <span class="o-cell">{{ getCellValue(row, col) }}<br/><span class="o-cell-sub">{{ getTimeSlotLabel(row) }}</span></span>
                </template>
                <template v-else-if="(col.dataKey || col.key) === 'invoiceType'">
                  <span class="o-cell">{{ getCellValue(row, col) }}<br/><span
                    class="o-cool-tag"
                    :style="{ color: getCoolTypeInfo(row).color, background: getCoolTypeInfo(row).bg }"
                  >{{ getCoolTypeInfo(row).label }}</span></span>
                </template>
                <template v-else-if="(col.dataKey || col.key) === 'products'">
                  <span class="o-cell">{{ formatProductsSku(row) }}<br/><span class="o-cell-sub">{{ formatProductsName(row) }}</span></span>
                </template>
                <template v-else-if="(col.dataKey || col.key) === 'handlingTags'">
                  <span class="o-cell"><span v-for="(tag, ti) in (row.handlingTags || [])" :key="ti" class="o-badge">{{ tag }}</span></span>
                </template>
                <template v-else>
                  <span class="o-cell">{{ getCellValue(row, col) }}</span>
                </template>
              </td>
              <td class="o-table-td o-table-td--actions">
                <template v-if="displayFilter !== 'pending_waybill'">
                  <OButton variant="icon" title="編集" @click="handleEdit(row)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </OButton>
                  <OButton variant="icon-danger" title="削除" @click="handleDelete(row)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                  </OButton>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="o-table-pagination">
        <span class="o-table-pagination__info">{{ sortedRows.length }} 件</span>
        <div class="o-table-pagination__controls">
          <select class="o-input o-input-sm" v-model.number="pageSize" style="width:80px;">
            <option :value="10">10</option>
            <option :value="25">25</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
            <option :value="500">500</option>
          </select>
          <OButton variant="secondary" size="sm" :disabled="currentPage <= 1" @click="currentPage--">&lsaquo;</OButton>
          <span class="o-table-pagination__page">{{ currentPage }} / {{ totalPages }}</span>
          <OButton variant="secondary" size="sm" :disabled="currentPage >= totalPages" @click="currentPage++">&rsaquo;</OButton>
        </div>
      </div>
    </div>

    <!-- Bottom bar -->
    <OrderBottomBar
      :total-count="allRows.length"
      :selected-count="tableSelectedKeys.length"
      :error-count="errorRowCount"
      total-label="登録対象"
    >
      <template #left>
        <template v-if="bundleModeEnabled">
          <OButton
            variant="primary"
            size="sm"
            :disabled="tableSelectedKeys.length === 0 || selectedBundleGroupKeys.length === 0"
            @click="handleBundleMergeAllSelected"
          >
            同梱する
          </OButton>
          <OButton
            variant="warning"
            size="sm"
            :disabled="!hasUnbundleableRows"
            @click="handleUnbundleSelected"
          >
            同梱を解除する
          </OButton>
        </template>
        <template v-else>
          <OButton
            variant="primary"
            size="sm"
            :disabled="tableSelectedKeys.length === 0"
            @click="shipPlanDateDialogVisible = true"
          >
            出荷予定日一括設定
          </OButton>
          <OButton
            variant="primary"
            size="sm"
            :disabled="tableSelectedKeys.length === 0"
            @click="senderBulkDialogVisible = true"
          >
            ご依頼主一括設定
          </OButton>
          <OButton
            variant="primary"
            size="sm"
            :disabled="tableSelectedKeys.length === 0 || carriers.length === 0"
            @click="carrierBulkDialogVisible = true"
          >
            配送業者一括設定
          </OButton>
          <OButton
            variant="danger"
            size="sm"
            :disabled="allRows.length === 0"
            @click="handleClearAll"
          >
            データクリア
          </OButton>
        </template>
      </template>
      <template #center>
        <div class="bottom-bar__meta">
          登録対象：<strong>{{ allRows.length }}</strong>件
          <span v-if="errorRowCount > 0" class="bottom-bar__errors">
            （誤り：<strong>{{ errorRowCount }}</strong>件）
          </span>
          <span v-if="unregisteredSkuRowCount > 0" class="bottom-bar__unregistered">
            （商品SKU未登録：<strong>{{ unregisteredSkuRowCount }}</strong>件）
          </span>
        </div>
      </template>
      <template #alert>
        <div v-if="backendErrorCount > 0" class="bottom-bar__alert">
          <span>サーバー側でエラーが発生しました。エラー行のみ表示に切り替えています。</span>
          <button class="bottom-bar__alert-close" @click="clearBackendErrors">&times;</button>
        </div>
      </template>
      <template #right>
        <template v-if="displayFilter !== 'pending_waybill'">
          <OButton
            variant="primary"
            :disabled="allRows.length === 0 || isSubmitting"
            @click="handleSubmitClick"
          >
            {{ isSubmitting ? '登録中...' : '出荷指示登録' }}
          </OButton>
          <OButton
            v-if="backendErrorCount > 0"
            variant="danger"
            @click="submitErrorDialogVisible = true"
          >
            エラー詳細
          </OButton>
        </template>
        <template v-else>
          <OButton
            variant="secondary"
            :disabled="isLoadingPendingWaybill"
            @click="loadPendingWaybillOrders"
          >
            {{ isLoadingPendingWaybill ? '読込中...' : '再読込' }}
          </OButton>
        </template>
      </template>
    </OrderBottomBar>

    <!-- Dialogs -->
    <ShipmentOrderEditDialog
      v-model="showDialog"
      :title="editingRow ? '出荷指示を編集' : '出荷指示個別登録'"
      :columns="formColumns"
      :initial-data="editingRow || {}"
      allow-invalid-submit
      @submit="handleFormSubmit"
    />

    <ShipmentOrderImportDialog
      v-model="showImportDialog"
      :order-source-companies="orderSourceCompanies"
      :carriers="carriers"
      default-file-encoding="shift_jis"
      @import="handleImport"
    />

    <BundleFilterDialog
      v-model="showBundleFilterDialog"
      :fields="bundleFilterFields"
      :selected-keys="bundleFilterKeys"
      @update:selected-keys="handleBundleFilterUpdate"
      @save="handleBundleFilterSave"
    />

    <!-- エラー詳細ダイアログ -->
    <ODialog
      :open="submitErrorDialogVisible"
      title="エラー詳細"
      @close="submitErrorDialogVisible = false"
    >
      <div v-if="backendErrorCount === 0" style="color: #909399;">
        エラーはありません。
      </div>
      <div v-else class="error-list">
        <div class="error-list__meta">
          エラー件数：<strong>{{ backendErrorCount }}</strong>
        </div>
        <div class="error-list__items">
          <div v-for="(e, idx) in backendErrorList" :key="`${idx}-${e.clientId}-${e.field}`" class="error-list__item">
            <div class="error-list__item-title">
              行ID：<strong>{{ e.clientId || '-' }}</strong>
              <span v-if="e.orderNumber">（出荷管理No：{{ e.orderNumber }}）</span>
              <span v-if="e.fieldTitle"> - {{ e.fieldTitle }}</span>
            </div>
            <div class="error-list__item-msg">{{ e.message }}</div>
          </div>
        </div>
      </div>
      <template #footer>
        <div style="display:flex; justify-content:flex-end; gap:10px;">
          <OButton variant="secondary" @click="submitErrorDialogVisible = false">閉じる</OButton>
        </div>
      </template>
    </ODialog>

    <!-- ご依頼主一括設定 -->
    <ODialog
      :open="senderBulkDialogVisible"
      title="ご依頼主一括設定"
      @close="senderBulkDialogVisible = false"
    >
      <div class="sender-bulk__meta">
        選択中件数：<strong>{{ tableSelectedKeys.length }}</strong>
      </div>
      <div class="o-form-group">
        <label class="o-form-label">ご依頼主</label>
        <select class="o-input" v-model="senderBulkCompanyId" style="width: 100%">
          <option value="">ご依頼主を選択</option>
          <option v-for="company in orderSourceCompanies" :key="company._id" :value="company._id">{{ company.senderName }}</option>
        </select>
      </div>
      <div class="o-form-group">
        <label class="o-form-label">発店コードの上書き</label>
        <div class="row">
          <label class="o-checkbox">
            <input type="checkbox" v-model="senderBulkOverwriteBaseNo">
            <span>既存の値を上書きする</span>
          </label>
          <div class="hint">
            発店コード1・2が既に設定されている場合、ご依頼主の情報で上書きします<br />
            チェックを外すと、既存の値がある場合は保持し、ない場合のみご依頼主の情報を設定します
          </div>
        </div>
      </div>
      <template #footer>
        <div class="sender-bulk__footer">
          <OButton variant="secondary" @click="senderBulkDialogVisible = false">キャンセル</OButton>
          <OButton variant="primary" @click="applySenderBulkCompany">確定</OButton>
        </div>
      </template>
    </ODialog>

    <!-- 配送業者一括設定 -->
    <ODialog
      :open="carrierBulkDialogVisible"
      title="配送業者一括設定"
      @close="carrierBulkDialogVisible = false"
    >
      <div class="sender-bulk__meta">
        選択中件数：<strong>{{ tableSelectedKeys.length }}</strong>
      </div>
      <div class="o-form-group">
        <label class="o-form-label">配送業者</label>
        <select class="o-input" v-model="carrierBulkId" style="width: 100%">
          <option value="">配送業者を選択</option>
          <option v-for="opt in carrierOptions" :key="String(opt.value)" :value="opt.value">{{ opt.label }}</option>
        </select>
      </div>
      <template #footer>
        <div class="sender-bulk__footer">
          <OButton variant="secondary" @click="carrierBulkDialogVisible = false">キャンセル</OButton>
          <OButton variant="primary" @click="applyCarrierBulk">確定</OButton>
        </div>
      </template>
    </ODialog>

    <!-- 出荷予定日一括設定 -->
    <ODialog
      :open="shipPlanDateDialogVisible"
      title="出荷予定日一括設定"
      @close="shipPlanDateDialogVisible = false"
    >
      <div class="sender-bulk__meta">
        選択中件数：<strong>{{ tableSelectedKeys.length }}</strong>
      </div>
      <div class="o-form-group">
        <label class="o-form-label">出荷予定日</label>
        <input type="date" class="o-input" v-model="shipPlanDateSelected" :min="todayDate" style="width: 100%" />
      </div>
      <template #footer>
        <div class="sender-bulk__footer">
          <OButton variant="secondary" @click="shipPlanDateDialogVisible = false">キャンセル</OButton>
          <OButton variant="primary" @click="applyShipPlanDateToSelected">確定</OButton>
        </div>
      </template>
    </ODialog>

    <!-- 削除確認ダイアログ -->
    <ODialog
      :open="deleteDialogOpen"
      title="削除確認"
      size="sm"
      :danger="true"
      @close="deleteDialogOpen = false"
      @confirm="confirmDelete"
    >
      <p>{{ deleteDialogMessage }}</p>
      <template #confirm-text>削除</template>
    </ODialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import OrderBottomBar from '@/components/table/OrderBottomBar.vue'
import ShipmentOrderEditDialog from '@/components/form/ShipmentOrderEditDialog.vue'
import ShipmentOrderImportDialog from '@/components/import/ShipmentOrderImportDialog.vue'
import BundleFilterDialog from '@/components/bundle/BundleFilterDialog.vue'
import ODialog from '@/components/odoo/ODialog.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import OButton from '@/components/odoo/OButton.vue'
import { useToast } from '@/composables/useToast'
import { useShipmentOrderDraftStore } from '@/stores/shipmentOrderDraft'
import { fetchProducts } from '@/api/product'
import type { Product } from '@/types/product'
import { fetchCarriers } from '@/api/carrier'
import type { Carrier } from '@/types/carrier'
import { type UserOrderRow, generateTempId } from '@/types/orderRow'
import { fetchOrderSourceCompanies } from '@/api/orderSourceCompany'
import type { OrderSourceCompany } from '@/types/orderSourceCompany'
import { ShipmentOrderBulkApiError, createShipmentOrdersBulk, fetchShipmentOrders } from '@/api/shipmentOrders'
import { normalizeDateOnly } from '@/utils/dateNormalize'
import { getNestedValue } from '@/utils/nestedObject'
import {
  createProductMap,
  resolveAndFillProduct,
  determineCoolType,
  determineInvoiceType,
} from '@/utils/productMapUtils'
import type { OrderProduct } from '@/types/order'
import { useOrderValidation } from './composables/useOrderValidation'
import { useOrderHold } from './composables/useOrderHold'
import { useOrderBulkActions } from './composables/useOrderBulkActions'
import { useOrderTable } from './composables/useOrderTable'
import { setCookie, getCookie, BUNDLE_FILTER_COOKIE_KEY, BUNDLE_MODE_COOKIE_KEY } from './composables/useOrderStorage'

// --- Toast ---
const toast = useToast()

// --- Pinia Store（テーブルデータ・保留IDの単一ソース） ---
const draftStore = useShipmentOrderDraftStore()
const { allRows, heldRowIds } = storeToRefs(draftStore)

// --- マスターデータ ---
const orderSourceCompanies = ref<OrderSourceCompany[]>([])
const products = ref<Product[]>([])
const carriers = ref<Carrier[]>([])

// --- ダイアログ状態 ---
const showDialog = ref(false)
const showImportDialog = ref(false)
const showBundleFilterDialog = ref(false)
const editingRow = ref<UserOrderRow | null>(null)
const submitErrorDialogVisible = ref(false)
const isSubmitting = ref(false)
const isLoadingPendingWaybill = ref(false)

// --- バンドルモード ---
const bundleFilterKeys = ref<string[]>([])
const bundleModeEnabled = ref(false)

// --- 送り状未発行注文（バックエンドから取得） ---
const pendingWaybillRows = ref<UserOrderRow[]>([])

// --- フィルター・表示 ---
const displayFilter = ref<'new' | 'error' | 'pending_waybill' | 'held'>('new')
const showOnlyErrors = ref(false)

// --- バックエンドエラー ---
type BackendErrorByRow = Record<string, Record<string, string[]>>
const backendErrorsByRowId = ref<BackendErrorByRow>({})

// --- 循環依存を解消するための遅延参照 ---
// table は isHeld と hasRowErrors を必要とするが、
// hold と validation は table の tableSelectedKeys/baseColumns を必要とするため
// lazy closure パターンで初期化順序の制約を回避する
let _isHeld: (id: string | number) => boolean = () => false
let _hasRowErrors: (row: UserOrderRow) => boolean = () => false

// --- テーブル composable（先に作成） ---
const table = useOrderTable(
  allRows,
  pendingWaybillRows,
  carriers,
  bundleModeEnabled,
  bundleFilterKeys,
  displayFilter,
  (id) => _isHeld(id),
  (row) => _hasRowErrors(row),
)
const {
  carrierOptions,
  baseColumns,
  formColumns,
  displayColumns,
  resizingCol,
  getColWidth,
  onResizeStart,
  currentPage,
  pageSize,
  sortKey,
  sortOrder,
  handleSortClick,
  globalSearchText,
  filteredRows,
  displayRows,
  sortedRows,
  totalPages,
  paginatedRows,
  tableSelectedKeys,
  isAllCurrentPageSelected,
  isSomeCurrentPageSelected,
  toggleSelectAll,
  toggleRowSelection,
  getCellValue,
  getTimeSlotLabel,
  fmtPostal,
  getCoolTypeInfo,
  formatProductsSku,
  formatProductsName,
} = table

// --- バリデーション composable（tableのbaseColumnsを参照） ---
const validation = useOrderValidation(baseColumns, backendErrorsByRowId)
const { hasRowErrors, hasFrontendRowErrors, isCellError, hasUnregisteredSku } = validation
// 遅延参照を実際の実装に更新
_hasRowErrors = hasRowErrors

// --- 保留 composable（tableのtableSelectedKeysを参照） ---
const hold = useOrderHold(
  allRows,
  pendingWaybillRows,
  tableSelectedKeys,
  (rows, heldIds) => { draftStore.setHeldIds(heldIds) },
  loadPendingWaybillOrders,
  toast,
)
const { isHeld, nonHeldRows, totalHeldCount, pendingWaybillNonHeldCount, toggleHoldSelected } = hold
// 遅延参照を実際の実装に更新
_isHeld = isHeld

// --- 一括操作 composable ---
const bulk = useOrderBulkActions(
  allRows,
  tableSelectedKeys,
  orderSourceCompanies,
  (_rows, heldIds) => { draftStore.setHeldIds(heldIds) },
  heldRowIds,
  toast,
)
const {
  senderBulkDialogVisible,
  senderBulkCompanyId,
  senderBulkOverwriteBaseNo,
  carrierBulkDialogVisible,
  carrierBulkId,
  shipPlanDateDialogVisible,
  shipPlanDateSelected,
  todayDate,
  applyShipPlanDateToSelected,
  applySenderBulkCompany,
  applyCarrierBulk,
} = bulk

// --- 集計 computed ---
const unregisteredSkuRowCount = computed(() =>
  allRows.value.filter((r) => hasUnregisteredSku(r)).length
)

const errorRowCount = computed(() =>
  nonHeldRows.value.filter((r) => hasRowErrors(r)).length
)

const backendErrorCount = computed(() => {
  let count = 0
  for (const rowId of Object.keys(backendErrorsByRowId.value || {})) {
    const perField = backendErrorsByRowId.value[rowId] || {}
    for (const fieldKey of Object.keys(perField)) {
      count += (perField[fieldKey] || []).length
    }
  }
  return count
})

const columnTitleMap = computed(() => {
  const map = new Map<string, string>()
  for (const col of baseColumns.value) {
    const k = (col.dataKey || col.key) as string
    map.set(k, col.title)
  }
  return map
})

const backendErrorList = computed(() => {
  const list: Array<{ clientId?: string; field?: string; fieldTitle?: string; message: string; orderNumber?: string }> = []
  for (const rowId of Object.keys(backendErrorsByRowId.value || {})) {
    const row = allRows.value.find((r) => r.id === rowId)
    const perField = backendErrorsByRowId.value[rowId] || {}
    for (const fieldKey of Object.keys(perField)) {
      const msgs = perField[fieldKey] || []
      for (const msg of msgs) {
        list.push({
          clientId: rowId,
          field: fieldKey,
          fieldTitle: columnTitleMap.value.get(fieldKey),
          message: msg,
          orderNumber: row?.orderNumber,
        })
      }
    }
  }
  return list
})

const clearBackendErrors = () => {
  backendErrorsByRowId.value = {}
}

// --- バンドル関連 ---
const bundleFilterFields = computed(() => [
  { key: 'recipient.name', title: '送付先氏名', description: '送付先の氏名が一致する注文を同梱候補とする' },
  { key: 'recipient.postalCode', title: '送付先郵便番号', description: '送付先の郵便番号が一致する注文を同梱候補とする' },
  { key: 'recipient.street', title: '送付先住所', description: '送付先の住所が一致する注文を同梱候補とする' },
  { key: 'recipient.phone', title: '送付先電話番号', description: '送付先の電話番号が一致する注文を同梱候補とする' },
  { key: 'orderSourceCompanyId', title: '販売分類', description: '※ご依頼主を超えて同梱する時には「販売分類」のチェックを外してください' },
])

const bundleFilterLabels = computed(() => {
  if (bundleFilterKeys.value.length === 0) return ''
  return bundleFilterKeys.value
    .map((key) => bundleFilterFields.value.find((f) => f.key === key)?.title || key)
    .filter(Boolean)
    .join(', ')
})

const hasUnbundleableRows = computed(() => {
  const selectedSet = new Set(tableSelectedKeys.value)
  if (selectedSet.size === 0) return false
  return allRows.value.some((row) => {
    if (!selectedSet.has(row.id)) return false
    return Array.isArray((row as any)._bundleOriginalRows) && (row as any)._bundleOriginalRows.length > 0
  })
})

const selectedBundleGroupKeys = computed(() => {
  if (!bundleModeEnabled.value || !bundleFilterKeys.value.length) return []
  const selectedSet = new Set(tableSelectedKeys.value)
  if (!selectedSet.size) return []
  const keys = new Set<string>()
  for (const row of displayRows.value as any[]) {
    const id = (row as any)?.id
    const gk = (row as any)?._bundleGroupKey
    const sz = (row as any)?._bundleGroupSize
    if (!id || !gk) continue
    if (typeof sz === 'number' && sz < 2) continue
    if (selectedSet.has(id)) keys.add(String(gk))
  }
  return Array.from(keys)
})

// バンドルマージ共通関数
const mergeGroup = (targetGroup: UserOrderRow[]): UserOrderRow => {
  const [first, ...rest] = targetGroup
  const mergedProducts = [...((first!.products ?? []) as any[]), ...rest.flatMap((r) => (Array.isArray(r.products) ? r.products : []))]
  const mergedSourceRawRows = [...(((first as any).sourceRawRows ?? []) as any[]), ...rest.flatMap((r) => (((r as any).sourceRawRows ?? []) as any[]))]
  const mergedCoolType = determineCoolType(mergedProducts)
  const mergedInvoiceType = determineInvoiceType(mergedProducts, first!.invoiceType as '0' | '8' | 'A' | undefined)
  const originalRows = targetGroup.map((r) => { const { _bundleOriginalRows, ...cleanRow } = r as any; return cleanRow })

  return {
    ...first!,
    orderNumber: first!.orderNumber || '',
    recipient: {
      postalCode: first!.recipient?.postalCode || '', prefecture: first!.recipient?.prefecture || '',
      city: first!.recipient?.city || '', street: first!.recipient?.street || '',
      name: first!.recipient?.name || '', phone: first!.recipient?.phone || '',
    },
    sender: {
      postalCode: first!.sender?.postalCode || '', prefecture: first!.sender?.prefecture || '',
      city: first!.sender?.city || '', street: first!.sender?.street || '',
      name: first!.sender?.name || '', phone: first!.sender?.phone || '',
    },
    handlingTags: first!.handlingTags || [],
    products: mergedProducts,
    sourceRawRows: mergedSourceRawRows,
    coolType: mergedCoolType ?? first!.coolType,
    invoiceType: mergedInvoiceType ?? first!.invoiceType,
    updatedAt: new Date().toISOString(),
    id: first!.id,
    _bundleOriginalRows: originalRows,
  } as any
}

const handleBundleMergeAllSelected = async () => {
  if (!bundleModeEnabled.value || bundleFilterKeys.value.length === 0) {
    toast.showWarning('同梱モードとフィルターを有効にしてください')
    return
  }
  if (!tableSelectedKeys.value.length) {
    toast.showWarning('左側のチェックで同梱したい行を選択してください')
    return
  }

  const groups = new Map<string, UserOrderRow[]>()
  for (const row of filteredRows.value) {
    const keyParts = bundleFilterKeys.value.map((k) => getNestedValue(row, k) ?? '')
    const gk = JSON.stringify(keyParts)
    if (!groups.has(gk)) groups.set(gk, [])
    groups.get(gk)!.push(row)
  }

  const selectedSet = new Set(tableSelectedKeys.value)
  const groupKeysToMerge: string[] = []
  let totalRowsToMerge = 0
  for (const [gk, rows] of groups.entries()) {
    if (rows.length < 2) continue
    if (rows.some((r) => selectedSet.has(r.id))) {
      groupKeysToMerge.push(gk)
      totalRowsToMerge += rows.length
    }
  }

  if (groupKeysToMerge.length === 0) {
    toast.showWarning('選択した行に同梱可能なグループがありません')
    return
  }

  if (!confirm(`選択行を含む${groupKeysToMerge.length}グループ（合計${totalRowsToMerge}件）を同梱しますか？`)) return

  const mergedByFirstId = new Map<string, UserOrderRow>()
  const idsToRemove = new Set<string>()
  let mergedGroupCount = 0

  for (const gk of groupKeysToMerge) {
    const targetGroup = groups.get(gk)
    if (!targetGroup || targetGroup.length < 2) continue
    const mergedRow = mergeGroup(targetGroup)
    mergedByFirstId.set(targetGroup[0]!.id, mergedRow)
    for (const r of targetGroup) {
      if (r.id !== targetGroup[0]!.id) idsToRemove.add(r.id)
    }
    mergedGroupCount += 1
  }

  allRows.value = allRows.value
    .filter(row => !idsToRemove.has(row.id))
    .map(row => mergedByFirstId.get(row.id) ?? row)

  tableSelectedKeys.value = []
  toast.showSuccess(`全て同梱完了：${mergedGroupCount}グループを同梱しました`)
}

const handleUnbundleSelected = async () => {
  const selectedSet = new Set(tableSelectedKeys.value)
  if (selectedSet.size === 0) {
    toast.showWarning('解除する行を選択してください')
    return
  }

  const bundledRows = allRows.value.filter((row) => {
    if (!selectedSet.has(row.id)) return false
    return Array.isArray((row as any)._bundleOriginalRows) && (row as any)._bundleOriginalRows.length > 0
  })

  if (bundledRows.length === 0) {
    toast.showWarning('選択された行に同梱済みの行がありません')
    return
  }

  const totalOriginalRows = bundledRows.reduce((sum, row) => sum + ((row as any)._bundleOriginalRows?.length || 0), 0)
  if (!confirm(`選択した${bundledRows.length}件の同梱を解除し、${totalOriginalRows}件の元の行に戻しますか？`)) return

  const bundledIds = new Set(bundledRows.map((r) => r.id))
  const nextAll: UserOrderRow[] = []
  let restoredCount = 0

  for (const row of allRows.value) {
    if (bundledIds.has(row.id)) {
      const originalRows = (row as any)._bundleOriginalRows as UserOrderRow[]
      if (Array.isArray(originalRows) && originalRows.length > 0) {
        for (const originalRow of originalRows) {
          nextAll.push({ ...originalRow, updatedAt: new Date().toISOString() })
          restoredCount++
        }
      } else {
        nextAll.push(row)
      }
    } else {
      nextAll.push(row)
    }
  }

  allRows.value = nextAll
  tableSelectedKeys.value = []
  toast.showSuccess(`同梱解除完了：${restoredCount}件の行を復元しました`)
}

// --- 削除 ---
const deleteDialogOpen = ref(false)
const deleteTarget = ref<{ type: 'single'; row: UserOrderRow } | { type: 'batch'; keys: Set<string | number>; count: number } | null>(null)
const deleteDialogMessage = ref('')

const handleDelete = (row: UserOrderRow) => {
  deleteTarget.value = { type: 'single', row }
  deleteDialogMessage.value = `「${row.customerManagementNumber || row.orderNumber || row.id}」を削除しますか？`
  deleteDialogOpen.value = true
}

const confirmDelete = () => {
  if (!deleteTarget.value) return
  if (deleteTarget.value.type === 'single') {
    const { row } = deleteTarget.value
    allRows.value = allRows.value.filter(r => r.id !== row.id)
  } else {
    const { keys } = deleteTarget.value
    allRows.value = allRows.value.filter(r => !keys.has(r.id))
    tableSelectedKeys.value = []
  }
  deleteDialogOpen.value = false
  deleteTarget.value = null
}

const handleBatchDeleteFromBar = () => {
  if (tableSelectedKeys.value.length === 0) return
  deleteTarget.value = { type: 'batch', keys: new Set(tableSelectedKeys.value), count: tableSelectedKeys.value.length }
  deleteDialogMessage.value = `選択した${tableSelectedKeys.value.length}件の出荷指示を削除しますか？`
  deleteDialogOpen.value = true
}

// --- 商品デフォルト適用 ---
const productMap = computed(() => createProductMap(products.value))

const applyProductDefaults = (row: UserOrderRow): UserOrderRow => {
  const next: UserOrderRow = { ...row }
  const pMap = productMap.value

  if (Array.isArray(next.products)) {
    next.products = next.products.map((p: any): OrderProduct => {
      const inputSku = (p.inputSku || p.sku || '').trim()
      const quantity = p.quantity ?? 1
      if (p.productId && p.inputSku) return p as OrderProduct
      const existingData: Partial<OrderProduct> = {}
      if (p.barcode?.length) existingData.barcode = p.barcode
      if (p.name || p.productName) existingData.productName = p.productName || p.name
      return resolveAndFillProduct(inputSku, quantity, pMap, existingData)
    })

    const matchedProducts = next.products.filter(p => p.productId)
    if (matchedProducts.length > 0) {
      const nextCoolType = determineCoolType(next.products)
      if (nextCoolType !== undefined) next.coolType = nextCoolType
      const calculatedInvoiceType = determineInvoiceType(next.products, next.invoiceType as '0' | '8' | 'A' | undefined)
      if (calculatedInvoiceType !== null) next.invoiceType = calculatedInvoiceType
    }
  }
  return next
}

// --- フォーム送信 ---
const handleEdit = (row: UserOrderRow) => {
  editingRow.value = row
  showDialog.value = true
}

const handleAdd = () => {
  editingRow.value = null
  showDialog.value = true
}

const handleFormSubmit = (data: Record<string, any>) => {
  const now = new Date().toISOString()

  if (editingRow.value) {
    let updatedRow: UserOrderRow = {
      ...editingRow.value,
      orderNumber: editingRow.value.orderNumber || '',
      sourceOrderAt: data.sourceOrderAt !== undefined ? data.sourceOrderAt : editingRow.value.sourceOrderAt,
      carrierId: typeof data.carrierId === 'string' ? data.carrierId : editingRow.value.carrierId || '',
      customerManagementNumber: data.customerManagementNumber || editingRow.value.customerManagementNumber || '',
      orderer: {
        postalCode: data.orderer?.postalCode || '', prefecture: data.orderer?.prefecture || '',
        city: data.orderer?.city || '', street: data.orderer?.street || '',
        name: data.orderer?.name || '', phone: data.orderer?.phone || '',
      },
      recipient: {
        postalCode: data.recipient?.postalCode || '', prefecture: data.recipient?.prefecture || '',
        city: data.recipient?.city || '', street: data.recipient?.street || '',
        name: data.recipient?.name || '', phone: data.recipient?.phone || '',
      },
      honorific: data.honorific !== undefined ? data.honorific : (editingRow.value.honorific ?? '様'),
      products: Array.isArray(data.products) && data.products.length > 0
        ? data.products.map((p: any): OrderProduct => ({
            inputSku: p.inputSku || p.sku || '',
            quantity: p.quantity ? Number(p.quantity) : 1,
            productName: p.productName || p.name || undefined,
          }))
        : editingRow.value.products || [],
      shipPlanDate: data.shipPlanDate || editingRow.value.shipPlanDate || '',
      deliveryTimeSlot: data.deliveryTimeSlot || '',
      deliveryDatePreference: data.deliveryDatePreference ? normalizeDateOnly(data.deliveryDatePreference) : (editingRow.value.deliveryDatePreference ? normalizeDateOnly(editingRow.value.deliveryDatePreference) : undefined),
      invoiceType: data.invoiceType || editingRow.value.invoiceType || '',
      coolType: data.coolType ?? editingRow.value.coolType,
      sender: {
        postalCode: data.sender?.postalCode || '', prefecture: data.sender?.prefecture || '',
        city: data.sender?.city || '', street: data.sender?.street || '',
        name: data.sender?.name || '', phone: data.sender?.phone || '',
      },
      handlingTags: Array.isArray(data.handlingTags) ? data.handlingTags : editingRow.value.handlingTags || [],
      updatedAt: now,
    }
    updatedRow = applyProductDefaults(updatedRow)
    allRows.value = allRows.value.map(r => r.id === editingRow.value!.id ? updatedRow : r)
    toast.showSuccess('出荷指示を更新しました')
  } else {
    const tempId = generateTempId()
    let newRow: UserOrderRow = {
      id: tempId,
      orderNumber: '',
      sourceOrderAt: data.sourceOrderAt,
      carrierId: typeof data.carrierId === 'string' ? data.carrierId : '',
      customerManagementNumber: data.customerManagementNumber || '',
      orderer: {
        postalCode: data.orderer?.postalCode || '', prefecture: data.orderer?.prefecture || '',
        city: data.orderer?.city || '', street: data.orderer?.street || '',
        name: data.orderer?.name || '', phone: data.orderer?.phone || '',
      },
      recipient: {
        postalCode: data.recipient?.postalCode || '', prefecture: data.recipient?.prefecture || '',
        city: data.recipient?.city || '', street: data.recipient?.street || '',
        name: data.recipient?.name || '', phone: data.recipient?.phone || '',
      },
      honorific: data.honorific ?? '様',
      products: Array.isArray(data.products) && data.products.length > 0
        ? data.products.map((p: any): OrderProduct => ({
            inputSku: p.inputSku || p.sku || '',
            quantity: p.quantity ? Number(p.quantity) : 1,
            productName: p.productName || p.name || undefined,
          }))
        : [],
      shipPlanDate: data.shipPlanDate || '',
      deliveryTimeSlot: data.deliveryTimeSlot || '',
      deliveryDatePreference: data.deliveryDatePreference ? normalizeDateOnly(data.deliveryDatePreference) : undefined,
      invoiceType: data.invoiceType || '',
      coolType: data.coolType ?? undefined,
      sender: {
        postalCode: data.sender?.postalCode || '', prefecture: data.sender?.prefecture || '',
        city: data.sender?.city || '', street: data.sender?.street || '',
        name: data.sender?.name || '', phone: data.sender?.phone || '',
      },
      handlingTags: Array.isArray(data.handlingTags) ? data.handlingTags : [],
      sourceRawRows: [],
      createdAt: now,
      updatedAt: now,
    }
    newRow = applyProductDefaults(newRow)
    allRows.value = [...allRows.value, newRow]
    toast.showSuccess('個別登録しました')
  }

  editingRow.value = null
}

// --- インポート ---
const handleImportClick = () => { showImportDialog.value = true }

const handleImport = (importedRows: UserOrderRow[]) => {
  const rowsWithDefaults = importedRows.map((row: UserOrderRow) => {
    const updatedRow = {
      ...row,
      products: Array.isArray(row.products)
        ? row.products.map((p: any): OrderProduct => {
            const quantityNum = p?.quantity !== undefined ? Number(p.quantity) : 1
            return {
              inputSku: p?.inputSku || p?.sku || '',
              quantity: Number.isNaN(quantityNum) ? 1 : quantityNum,
              productName: p?.productName || p?.name || undefined,
              ...(p?.barcode?.length ? { barcode: p.barcode } : {}),
            }
          })
        : row.products,
    }
    return applyProductDefaults(updatedRow)
  })
  allRows.value = [...allRows.value, ...rowsWithDefaults]
  toast.showSuccess(`${importedRows.length}件のデータを取り込みしました`)
}

// --- バックエンド送信 ---
const buildBulkUploadPayload = (rows: typeof allRows.value) => ({
  items: rows.map((row) => ({
    clientId: row.id,
    order: {
      ...(row.sourceOrderAt && { sourceOrderAt: row.sourceOrderAt }),
      carrierId: row.carrierId,
      customerManagementNumber: row.customerManagementNumber,
      orderer: (row.orderer?.postalCode || row.orderer?.name || row.orderer?.phone)
        ? { postalCode: row.orderer.postalCode || undefined, prefecture: row.orderer.prefecture || undefined, city: row.orderer.city || undefined, street: row.orderer.street || undefined, name: row.orderer.name || undefined, phone: row.orderer.phone || undefined }
        : undefined,
      recipient: { postalCode: row.recipient?.postalCode || '', prefecture: row.recipient?.prefecture || '', city: row.recipient?.city || '', street: row.recipient?.street || '', name: row.recipient?.name || '', phone: row.recipient?.phone || '' },
      honorific: row.honorific ?? '様',
      products: Array.isArray(row.products)
        ? row.products.map((p: OrderProduct) => ({
            inputSku: p.inputSku || '', quantity: typeof p.quantity === 'number' ? p.quantity : Number(p.quantity ?? 1),
            productId: p.productId || undefined, productSku: p.productSku || undefined, productName: p.productName || undefined,
            matchedSubSku: p.matchedSubSku ? { code: p.matchedSubSku.code, price: p.matchedSubSku.price, description: p.matchedSubSku.description } : undefined,
            imageUrl: p.imageUrl || undefined, barcode: p.barcode, coolType: p.coolType,
            mailCalcEnabled: p.mailCalcEnabled, mailCalcMaxQuantity: p.mailCalcMaxQuantity, unitPrice: p.unitPrice, subtotal: p.subtotal,
          }))
        : [],
      shipPlanDate: row.shipPlanDate, invoiceType: row.invoiceType, coolType: row.coolType ?? undefined,
      deliveryTimeSlot: row.deliveryTimeSlot || undefined,
      deliveryDatePreference: row.deliveryDatePreference ? normalizeDateOnly(row.deliveryDatePreference) : undefined,
      orderSourceCompanyId: row.orderSourceCompanyId || undefined,
      carrierData: row.carrierData ? {
        yamato: row.carrierData.yamato ? { sortingCode: row.carrierData.yamato.sortingCode || undefined, hatsuBaseNo1: row.carrierData.yamato.hatsuBaseNo1 || undefined, hatsuBaseNo2: row.carrierData.yamato.hatsuBaseNo2 || undefined } : undefined,
      } : undefined,
      sender: { postalCode: row.sender?.postalCode || '', prefecture: row.sender?.prefecture || '', city: row.sender?.city || '', street: row.sender?.street || '', name: row.sender?.name || '', phone: row.sender?.phone || '' },
      handlingTags: Array.isArray(row.handlingTags) ? row.handlingTags : [],
      sourceRawRows: Array.isArray((row as any).sourceRawRows) ? (row as any).sourceRawRows : undefined,
    },
  })),
})

const applyBackendErrors = (errors: Array<{ clientId?: string; field?: string; message: string }>) => {
  const next: BackendErrorByRow = {}
  for (const e of errors) {
    const rowId = e.clientId
    if (!rowId) continue
    const rawField = e.field || ''
    const baseField = rawField ? String(rawField).split('.')[0] : ''
    const fieldKey = baseField || '__row__'
    if (!next[rowId]) next[rowId] = {}
    if (!next[rowId][fieldKey]) next[rowId][fieldKey] = []
    next[rowId][fieldKey].push(e.message)
  }
  backendErrorsByRowId.value = next
}

const handleSubmitClick = async () => {
  if (isSubmitting.value) return
  clearBackendErrors()

  if (!allRows.value.length) {
    toast.showWarning('登録するデータがありません')
    return
  }
  if (tableSelectedKeys.value.length === 0) {
    toast.showWarning('登録する行を選択してください')
    return
  }

  const selectedSet = new Set(tableSelectedKeys.value)
  const targetRows = allRows.value.filter((r) => selectedSet.has(r.id))
  const invalidRows = targetRows.filter((r) => hasFrontendRowErrors(r))

  if (invalidRows.length > 0) {
    displayFilter.value = 'error'
    toast.showError(`入力に誤りがある行が${invalidRows.length}件あります。エラー行のみ表示に切り替えました。`)
    return
  }

  if (!confirm(`登録対象：${targetRows.length}件\n出荷指示登録しますか？`)) return

  try {
    isSubmitting.value = true
    const payload = buildBulkUploadPayload(targetRows)
    const res = await createShipmentOrdersBulk(payload)
    toast.showSuccess(res?.message || '登録しました')

    const successes = Array.isArray((res as any)?.data?.successes) ? ((res as any).data.successes as any[]) : []
    const failures = Array.isArray((res as any)?.data?.failures) ? ((res as any).data.failures as any[]) : []

    if (successes.length > 0) {
      const successIds = new Set(successes.map((s) => s?.clientId).filter(Boolean))
      allRows.value = allRows.value.filter((r) => !successIds.has(r.id))
    }

    tableSelectedKeys.value = []

    if (failures.length > 0) {
      applyBackendErrors(failures)
      displayFilter.value = 'error'
      submitErrorDialogVisible.value = true
    } else {
      allRows.value = []
      clearBackendErrors()
      draftStore.clearAll()
      await loadPendingWaybillOrders()
      displayFilter.value = 'pending_waybill'
    }
  } catch (err: any) {
    if (err instanceof ShipmentOrderBulkApiError) {
      if (Array.isArray(err.errors) && err.errors.length > 0) {
        applyBackendErrors(err.errors)
        showOnlyErrors.value = true
        submitErrorDialogVisible.value = true
        toast.showError('サーバー側のバリデーションエラーがあります。')
        return
      }
      toast.showError(err.message || 'アップロードに失敗しました')
      return
    }
    toast.showError(err?.message || 'アップロードに失敗しました')
  } finally {
    isSubmitting.value = false
  }
}

// --- データクリア ---
const handleClearAll = async () => {
  if (allRows.value.length === 0) {
    toast.showWarning('クリアするデータがありません')
    return
  }
  if (!confirm(`すべてのデータ（${allRows.value.length}件）をクリアしますか？\nこの操作は元に戻せません。`)) return

  tableSelectedKeys.value = []
  displayFilter.value = 'new'
  clearBackendErrors()
  draftStore.clearAll()
  toast.showSuccess('すべてのデータをクリアしました')
}

// --- 送り状未発行注文の読み込み ---
async function loadPendingWaybillOrders() {
  try {
    isLoadingPendingWaybill.value = true
    const orders = await fetchShipmentOrders({ limit: 500 })
    pendingWaybillRows.value = (orders || [])
      .filter((o: any) => !o.trackingId)
      .map((o: any) => ({ ...o, id: o._id } as UserOrderRow))
  } catch (err) {
    console.error('送り状未発行注文の取得に失敗しました:', err)
  } finally {
    isLoadingPendingWaybill.value = false
  }
}

// --- バンドルモード ---
const handleOpenBundleList = () => {
  if (bundleFilterKeys.value.length === 0) {
    showBundleFilterDialog.value = true
  } else {
    bundleModeEnabled.value = true
    setCookie(BUNDLE_MODE_COOKIE_KEY, '1', 30)
  }
}

const handleExitBundleMode = () => {
  bundleModeEnabled.value = false
  setCookie(BUNDLE_MODE_COOKIE_KEY, '0', 30)
}

const handleBundleFilterSave = (keys: string[]) => {
  bundleFilterKeys.value = keys
  setCookie(BUNDLE_FILTER_COOKIE_KEY, JSON.stringify(keys ?? []), 30)
  toast.showSuccess('同梱設定を保存しました')
}

const handleBundleFilterUpdate = (keys: string[]) => {
  bundleFilterKeys.value = keys
  setCookie(BUNDLE_FILTER_COOKIE_KEY, JSON.stringify(keys ?? []), 30)
}

// --- 保留カードクリック ---
const handleStatCardHoldClick = () => {
  if (displayFilter.value === 'pending_waybill' || displayFilter.value === 'held') {
    toggleHoldSelected()
  }
}

// --- フィルター変更時の処理 ---
watch(displayFilter, (val) => {
  showOnlyErrors.value = val === 'error'
  tableSelectedKeys.value = []
  if (val === 'pending_waybill') {
    loadPendingWaybillOrders()
  }
})

// --- マスターデータ読み込み ---
const loadOrderSourceCompanies = async () => {
  try {
    orderSourceCompanies.value = await fetchOrderSourceCompanies()
  } catch (error) {
    console.error('ご依頼主リストの読み込みに失敗しました:', error)
    toast.showError('ご依頼主リストの読み込みに失敗しました')
  }
}

const loadProductsCache = async () => {
  try {
    products.value = await fetchProducts()
    if (allRows.value.length > 0) {
      allRows.value = allRows.value.map((row) => applyProductDefaults(row))
    }
  } catch (error) {
    console.error('商品マスタの取得に失敗しました:', error)
    toast.showError('商品マスタの取得に失敗しました')
  }
}

const loadCarriers = async () => {
  try {
    carriers.value = await fetchCarriers({ enabled: true })
  } catch (error) {
    console.error('配送業者マスタの取得に失敗しました:', error)
    toast.showError('配送業者マスタの取得に失敗しました')
  }
}

// --- 初期化 ---
onMounted(() => {
  loadOrderSourceCompanies()
  loadProductsCache()
  loadCarriers()
  loadPendingWaybillOrders()

  // バンドルフィルターをCookieから復元
  const savedFilter = getCookie(BUNDLE_FILTER_COOKIE_KEY)
  if (savedFilter) {
    try {
      const parsed = JSON.parse(savedFilter)
      if (Array.isArray(parsed)) bundleFilterKeys.value = parsed.filter((k) => typeof k === 'string')
    } catch (err) {
      console.warn('バンドルフィルターCookieの解析に失敗しました', err)
    }
  }

  const savedMode = getCookie(BUNDLE_MODE_COOKIE_KEY)
  if (savedMode === '1') bundleModeEnabled.value = true

  // Piniaストアからテーブルデータを復元
  draftStore.loadFromStorage()
})
</script>

<style scoped>
/* Root layout */
.o-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.o-content {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
}

/* Quick Stats */
.o-quick-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.o-stat-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-border-color, #d6d6d6);
  border-radius: var(--o-border-radius, 4px);
  transition: box-shadow 0.15s;
}

.o-stat-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.o-stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.o-stat-icon-total { background: #e8f0fe; color: #1a73e8; }
.o-stat-icon-error { background: #fce8e6; color: #d93025; }
.o-stat-icon-unregistered { background: #fef7e0; color: #f9ab00; }
.o-stat-icon-held { background: #fff3e0; color: #e65100; }

.o-stat-card--clickable { cursor: pointer; transition: box-shadow 0.15s; }
.o-stat-card--clickable:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.12); }

[data-theme="dark"] .o-stat-icon-total { background: rgba(26, 115, 232, 0.15); }
[data-theme="dark"] .o-stat-icon-error { background: rgba(217, 48, 37, 0.15); }
[data-theme="dark"] .o-stat-icon-unregistered { background: rgba(249, 171, 0, 0.15); }
[data-theme="dark"] .o-stat-icon-held { background: rgba(230, 81, 0, 0.15); }

.o-stat-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.o-stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--o-gray-900, #303133);
  line-height: 1.2;
}

.o-stat-label {
  font-size: var(--o-font-size-smaller, 12px);
  color: var(--o-gray-500, #909399);
  white-space: nowrap;
}

/* Filter Tabs */
.o-filter-tabs {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-bottom: 1rem;
}

.o-btn-icon {
  padding: 0.375rem;
  line-height: 0;
}
.o-batch-delete-btn {
  margin-left: auto;
  background: var(--o-danger, #dc3545);
  color: #fff;
  border: 1px solid var(--o-danger, #dc3545);
  border-radius: var(--o-border-radius, 4px);
  padding: 0.375rem 0.75rem;
  font-size: var(--o-font-size-small, 13px);
  cursor: pointer;
  font-weight: 500;
}
.o-batch-delete-btn:hover {
  background: #c82333;
  border-color: #bd2130;
}

.o-status-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 500;
  line-height: 18px;
  white-space: nowrap;
}
.o-status-tag--new { background: #dbeafe; color: #1d4ed8; }
.o-status-tag--error { background: #fee2e2; color: #dc2626; }
.o-status-tag--pending { background: #fef3c7; color: #d97706; }
.o-status-tag--held { background: #fff3e0; color: #e65100; }

.o-filter-tab {
  padding: 0.375rem 0.75rem;
  border: 1px solid var(--o-border-color, #d6d6d6);
  border-radius: var(--o-border-radius, 4px);
  background: var(--o-view-background, #fff);
  font-size: var(--o-font-size-small, 13px);
  color: var(--o-gray-600, #606266);
  display: flex;
  align-items: center;
  gap: 0.375rem;
  cursor: pointer;
  transition: all 0.15s;
}
.o-filter-tab:hover { border-color: var(--o-brand-primary, #714B67); color: var(--o-brand-primary, #714B67); }
.o-filter-tab.active { background: var(--o-brand-primary, #714B67); color: #fff; border-color: var(--o-brand-primary, #714B67); }

.o-tab-count {
  font-size: 0.6875rem;
  background: rgba(0, 0, 0, 0.1);
  padding: 0.0625rem 0.375rem;
  border-radius: 10rem;
}
.o-filter-tab.active .o-tab-count { background: rgba(255, 255, 255, 0.25); }

/* Alert banner */
.o-alert {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  border-radius: var(--o-border-radius, 4px);
  font-size: var(--o-font-size-small, 13px);
  margin-bottom: 1rem;
}
.o-alert-error { background: #fef0f0; border: 1px solid #fde2e2; color: #f56c6c; }
.o-alert-close { background: none; border: none; font-size: 16px; cursor: pointer; color: inherit; padding: 0 0.25rem; }

/* ControlPanel search input */
.o-cp-search-input { width: 280px; }

/* Bundle mode section */
.bundle-mode-section { display: flex; flex-direction: column; gap: 8px; margin-bottom: 1rem; }
.bundle-mode-bar { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: var(--o-gray-100, #eeeeee); border: 1px solid var(--o-border-color, #d6d6d6); border-radius: var(--o-border-radius, 4px); cursor: pointer; transition: background-color 0.2s; }
.bundle-mode-bar:hover { background: var(--o-gray-200, #e5e5e5); }
.bundle-mode-bar__title { font-size: var(--o-font-size-small, 13px); color: var(--o-gray-900, #102040); font-weight: 500; white-space: nowrap; flex-shrink: 0; }
.bundle-mode-bar__labels { font-size: var(--o-font-size-small, 13px); color: var(--o-gray-900, #102040); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bundle-mode-actions { display: flex; align-items: center; gap: 8px; }

/* Plain table */
.o-table-wrapper { overflow-x: auto; border: 1px solid var(--o-border-color, #d6d6d6); border-radius: var(--o-border-radius, 4px); background: var(--o-view-background, #fff); }
.o-table { width: 100%; border-collapse: collapse; font-size: var(--o-font-size-small, 13px); table-layout: fixed; }
.o-table-th { position: sticky; top: 0; background: var(--o-gray-100, #f8f9fa); color: var(--o-gray-700, #495057); font-weight: 600; text-align: left; padding: 8px 10px; border-bottom: 2px solid var(--o-border-color, #d6d6d6); user-select: none; font-size: 12px; letter-spacing: 0.02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.o-table-th--sortable { cursor: pointer; }
.o-table-th--sortable:hover { background: var(--o-gray-200, #e9ecef); }

/* Column resize handle */
.o-resize-handle { position: absolute; top: 0; right: 0; bottom: 0; width: 5px; cursor: col-resize; background: transparent; transition: background 0.15s; z-index: 1; }
.o-resize-handle:hover, .o-table--resizing .o-resize-handle { background: var(--o-brand-primary, #714B67); }
.o-table-th { position: relative; }

.o-table-th--checkbox { text-align: center; }
.o-sort-icon { font-size: 10px; margin-left: 4px; opacity: 0.6; }

.o-table-td { padding: 6px 10px; border-bottom: 1px solid var(--o-border-color, #f0f0f0); font-size: var(--o-font-size-small, 13px); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.o-table-td--checkbox { text-align: center; }
.o-table-td--actions { text-align: center; white-space: nowrap; }
.o-table-td--error { background: #fff0f0; }

.o-table-row:hover { background: var(--o-list-hover, #edf2ff); }
.o-table-row--selected { background: var(--o-list-selected, #e8f0fe); }
.o-table-row--selected:hover { background: #d0e4fd; }
.o-table-empty { text-align: center; padding: 2rem; color: var(--o-gray-500, #909399); }

.o-cell { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.o-cell-sub { font-size: 11px; color: var(--o-gray-500, #909399); }
.o-cool-tag { font-size: 11px; padding: 1px 5px; border-radius: 3px; display: inline-block; }
.o-badge { display: inline-block; background: var(--o-gray-200, #e9ecef); color: var(--o-gray-700, #495057); font-size: 11px; padding: 1px 6px; border-radius: 3px; margin-right: 2px; }
.customer-mgmt-link { color: var(--o-brand-primary, #714B67); text-decoration: none; font-weight: 500; }
.customer-mgmt-link:hover { text-decoration: underline; }

/* Pagination */
.o-table-pagination { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.25rem; font-size: var(--o-font-size-small, 13px); }
.o-table-pagination__info { color: var(--o-gray-600, #606266); }
.o-table-pagination__controls { display: flex; align-items: center; gap: 0.5rem; }
.o-table-pagination__page { color: var(--o-gray-700, #495057); min-width: 60px; text-align: center; }

/* Bottom bar */
.bottom-bar__meta { font-size: var(--o-font-size-small, 13px); color: var(--o-gray-700, #495057); }
.bottom-bar__errors { color: var(--o-danger, #dc3545); }
.bottom-bar__unregistered { color: var(--o-warning, #ffac00); }
.bottom-bar__alert {
  background: #fef0f0;
  border: 1px solid #fde2e2;
  border-radius: 6px;
  padding: 8px 12px;
  color: #f56c6c;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.bottom-bar__alert-close { background: none; border: none; font-size: 16px; cursor: pointer; color: #f56c6c; }

/* Dialogs */
.sender-bulk__meta { margin-bottom: 1rem; font-size: var(--o-font-size-small, 13px); color: var(--o-gray-600, #606266); }
.sender-bulk__footer { display: flex; justify-content: flex-end; gap: 0.5rem; }
.hint { font-size: 12px; color: var(--o-gray-500, #909399); margin-top: 4px; }
.row { display: flex; flex-direction: column; gap: 4px; }

.error-list { display: flex; flex-direction: column; gap: 0.5rem; }
.error-list__meta { font-size: var(--o-font-size-small, 13px); color: var(--o-gray-600, #606266); margin-bottom: 0.5rem; }
.error-list__items { max-height: 300px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem; }
.error-list__item { padding: 0.5rem 0.75rem; border: 1px solid var(--o-danger-border, #f5c6cb); border-radius: 4px; background: var(--o-danger-light, #fdf0f1); }
.error-list__item-title { font-size: var(--o-font-size-small, 13px); font-weight: 500; color: var(--o-gray-800, #343a40); margin-bottom: 2px; }
.error-list__item-msg { font-size: 12px; color: var(--o-danger, #dc3545); }
</style>
