<template>
  <div class="o-view">
    <!-- ControlPanel Header -->
    <ControlPanel
      title="出荷指示作成"
      :breadcrumbs="['出荷指示', '出荷指示作成']"
      :show-search="false"
    >
      <template #center>
        <input
          class="o-input o-cp-search-input"
          v-model="globalSearchText"
          placeholder="検索..."
        />
      </template>
      <template #actions>
        <template v-if="displayFilter === 'pending_confirm'">
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
        </template>
        <template v-if="displayFilter === 'pending_confirm'">
          <OButton variant="success" @click="handleImportClick">
            一括登録
          </OButton>
          <OButton variant="primary" @click="handleAdd">
            個別登録
          </OButton>
        </template>
        <template v-if="displayFilter === 'pending_waybill'">
          <OButton variant="success" @click="showCarrierImportDialog = true">
            送り状データ取込
          </OButton>
        </template>
      </template>
    </ControlPanel>

    <div class="o-content">
      <!-- Filter Tabs -->
      <div class="o-filter-tabs">
        <button class="o-filter-tab" :class="{ active: displayFilter === 'pending_confirm' }" @click="displayFilter = 'pending_confirm'">
          出荷確認待ち <span class="o-tab-count">{{ pendingConfirmCount }}</span>
        </button>
        <button class="o-filter-tab" :class="{ active: displayFilter === 'processing' }" @click="displayFilter = 'processing'">
          処理中 <span class="o-tab-count">{{ processingNonHeldCount }}</span>
        </button>
        <button class="o-filter-tab" :class="{ active: displayFilter === 'pending_waybill' }" @click="displayFilter = 'pending_waybill'">
          送り状未発行 <span class="o-tab-count">{{ pendingWaybillNonHeldCount }}</span>
        </button>
        <button class="o-filter-tab" :class="{ active: displayFilter === 'held' }" @click="displayFilter = 'held'">
          保留 <span class="o-tab-count">{{ totalHeldCount }}</span>
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
        <!-- Selection toolbar -->
        <div v-if="tableSelectedKeys.length > 0" class="o-list-toolbar o-toolbar-active">
          <span class="o-selected-count">{{ tableSelectedKeys.length }}件選択中</span>
        </div>
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
              <th class="o-table-th" style="width:220px;">出荷管理番号</th>
              <th class="o-table-th" style="width:200px;">配送情報</th>
              <th class="o-table-th" style="width:180px;">配送指定</th>
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
              <th class="o-table-th" style="width:170px;">履歴</th>
              <th class="o-table-th" style="width:60px;">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="isLoadingPendingWaybill && displayFilter !== 'pending_confirm'">
              <td :colspan="displayColumns.length + 7" class="o-table-empty">読み込み中...</td>
            </tr>
            <tr v-else-if="paginatedRows.length === 0">
              <td :colspan="displayColumns.length + 7" class="o-table-empty">データがありません</td>
            </tr>
            <template
              v-for="row in paginatedRows"
              :key="row.id"
            >
            <tr
              class="o-table-row"
              :class="{ 'o-table-row--selected': tableSelectedKeys.includes(row.id), 'o-table-row--has-error': b2ValidationErrors.has(String(row._id || row.id)) || getRowErrorMessages(row).length > 0 }"
            >
              <td class="o-table-td o-table-td--checkbox">
                <input
                  type="checkbox"
                  :checked="tableSelectedKeys.includes(row.id)"
                  @change="toggleRowSelection(row)"
                />
              </td>
              <td class="o-table-td o-table-td--status">
                <div class="status-cell">
                  <span v-if="displayFilter === 'pending_waybill'" class="o-status-tag o-status-tag--processing">送り状未発行</span>
                  <span v-else-if="b2ValidationErrors.has(String(row._id || row.id))" class="o-status-tag o-status-tag--error" :title="getB2Errors(row).join('\n')">エラー</span>
                  <span v-else-if="displayFilter === 'pending_confirm' && hasRowErrors(row)" class="o-status-tag o-status-tag--error">エラー</span>
                  <span v-else-if="isHeld(row.id)" class="o-status-tag o-status-tag--held">保留</span>
                  <span v-else-if="displayFilter === 'processing' && isAutoValidating" class="o-status-tag o-status-tag--validating">検証中...</span>
                  <span v-if="isBundleable(row)" class="o-status-tag o-status-tag--bundleable">同捆可能</span>
                  <span v-if="hasDeliverySpec(row)" class="o-status-tag o-status-tag--delivery">配送指定</span>
                  <span v-if="isOkinawa(row)" class="o-status-tag o-status-tag--okinawa">沖縄配送</span>
                  <span v-if="isRemoteIsland(row)" class="o-status-tag o-status-tag--remote">離島配送</span>
                </div>
              </td>
              <!-- 出荷管理番号（3行表示） -->
              <td class="o-table-td o-table-td--mgmt">
                <div class="mgmt-cell">
                  <div class="mgmt-cell__row">
                    <span class="mgmt-cell__label">出荷管理No</span>
                    <a v-if="(row as any).orderNumber" href="#" class="mgmt-cell__link mgmt-cell__value" @click.prevent="handleEdit(row)">{{ (row as any).orderNumber }}</a>
                    <span v-else class="mgmt-cell__value mgmt-cell__value--muted">登録後に自動採番</span>
                  </div>
                  <div class="mgmt-cell__row">
                    <span class="mgmt-cell__label">注文番号</span>
                    <a href="#" class="mgmt-cell__link mgmt-cell__value" @click.prevent="handleEdit(row)">{{ row.customerManagementNumber || '-' }}</a>
                  </div>
                  <div class="mgmt-cell__row">
                    <span class="mgmt-cell__label">送り状番号</span>
                    <span class="mgmt-cell__value">{{ (row as any).trackingId || '未発行' }}</span>
                  </div>
                </div>
              </td>
              <!-- 配送情報（3行表示） -->
              <td class="o-table-td o-table-td--mgmt">
                <div class="mgmt-cell">
                  <div class="mgmt-cell__row">
                    <span class="mgmt-cell__label">配送会社</span>
                    <span class="mgmt-cell__value">{{ getCarrierLabel(row) }}</span>
                  </div>
                  <div class="mgmt-cell__row">
                    <span class="mgmt-cell__label">配送サービス</span>
                    <span class="mgmt-cell__value">{{ getInvoiceTypeLabel(row) }}</span>
                  </div>
                  <div class="mgmt-cell__row">
                    <span class="mgmt-cell__label">温度帯</span>
                    <span class="mgmt-cell__value" :style="{ color: getCoolTypeInfo(row).color }">{{ getCoolTypeInfo(row).label }}</span>
                  </div>
                </div>
              </td>
              <!-- 配送日時（3行表示） -->
              <td class="o-table-td o-table-td--mgmt">
                <div class="mgmt-cell">
                  <div class="mgmt-cell__row">
                    <span class="mgmt-cell__label">出荷予定日</span>
                    <span class="mgmt-cell__value">{{ (row as any).shipPlanDate || '-' }}</span>
                  </div>
                  <div class="mgmt-cell__row">
                    <span class="mgmt-cell__label">お届け日</span>
                    <span class="mgmt-cell__value">{{ (row as any).deliveryDatePreference || '最短' }}</span>
                  </div>
                  <div class="mgmt-cell__row">
                    <span class="mgmt-cell__label">時間帯指定</span>
                    <span class="mgmt-cell__value">{{ getTimeSlotLabel(row) }}</span>
                  </div>
                </div>
              </td>
              <td
                v-for="col in displayColumns"
                :key="col.key"
                class="o-table-td"
                :class="{ 'o-table-td--error': isCellError(row, col) }"
              >
                <template v-if="(col.dataKey || col.key) === '__recipient_addr__'">
                  <div class="recipient-cell">
                    <div>〒{{ fmtPostal(row.recipient?.postalCode) }}</div>
                    <div>{{ [row.recipient?.prefecture, row.recipient?.city, row.recipient?.street, row.recipient?.building].filter(Boolean).join(' ') || '-' }}</div>
                    <div>{{ row.recipient?.phone || '-' }}</div>
                    <div class="recipient-cell__name">{{ row.recipient?.name || '-' }} {{ row.honorific || '様' }}</div>
                  </div>
                </template>
                <template v-else-if="(col.dataKey || col.key) === '__sender_name__'">
                  <div class="recipient-cell">
                    <div>〒{{ fmtPostal(row.sender?.postalCode) }}</div>
                    <div>{{ [row.sender?.prefecture, row.sender?.city, row.sender?.street, row.sender?.building].filter(Boolean).join(' ') || '-' }}</div>
                    <div>{{ row.sender?.phone || '-' }}</div>
                    <div class="recipient-cell__name">{{ row.sender?.name || '-' }}</div>
                  </div>
                </template>
                <template v-else-if="(col.dataKey || col.key) === '__orderer_name__'">
                  <span class="o-cell">{{ row.orderer?.name || '-' }}</span>
                </template>
                <template v-else-if="(col.dataKey || col.key) === 'products'">
                  <div class="product-list">
                    <div v-for="(p, pi) in (row.products || [])" :key="pi" class="product-item">
                      <img :src="resolveImageUrl(p.imageUrl)" class="product-item__img" alt="" @error="(e: Event) => { (e.target as HTMLImageElement).src = noImageSrc }" />
                      <div class="product-item__info">
                        <span class="product-item__name">{{ p.productName || '-' }}</span>
                        <span class="product-item__meta">SKU: {{ p.inputSku || p.productSku || '-' }}</span>
                        <span class="product-item__meta">バーコード: {{ Array.isArray(p.barcode) ? p.barcode.join(', ') : (p.barcode || '-') }}</span>
                        <span class="product-item__meta">個数: {{ p.quantity ?? 0 }}</span>
                      </div>
                    </div>
                    <span v-if="!row.products?.length" class="o-cell">-</span>
                  </div>
                </template>
                <template v-else-if="(col.dataKey || col.key) === 'handlingTags'">
                  <span class="o-cell"><span v-for="(tag, ti) in (row.handlingTags || [])" :key="ti" class="o-badge">{{ tag }}</span></span>
                </template>
                <template v-else>
                  <span class="o-cell">{{ getCellValue(row, col) }}</span>
                </template>
              </td>
              <!-- 履歴（3行表示） -->
              <td class="o-table-td o-table-td--mgmt">
                <div class="mgmt-cell">
                  <div class="mgmt-cell__row">
                    <span class="mgmt-cell__label">作成日時</span>
                    <span class="mgmt-cell__value">{{ fmtDateTime((row as any).createdAt) }}</span>
                  </div>
                  <div class="mgmt-cell__row">
                    <span class="mgmt-cell__label">更新日時</span>
                    <span class="mgmt-cell__value">{{ (row as any).updatedAt && (row as any).updatedAt !== (row as any).createdAt ? fmtDateTime((row as any).updatedAt) : '-' }}</span>
                  </div>
                  <div class="mgmt-cell__row">
                    <span class="mgmt-cell__label">送り状発行日時</span>
                    <span class="mgmt-cell__value">{{ fmtDateTime((row as any).status?.carrierReceipt?.receivedAt) }}</span>
                  </div>
                </div>
              </td>
              <td class="o-table-td o-table-td--actions">
                <template v-if="displayFilter === 'pending_confirm'">
                  <OButton variant="icon" title="編集" @click="handleEdit(row)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </OButton>
                  <OButton variant="icon-danger" title="削除" @click="handleDelete(row)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                  </OButton>
                </template>
              </td>
            </tr>
            <tr v-if="b2ValidationErrors.has(String(row._id || row.id)) || getRowErrorMessages(row).length > 0" class="o-table-row--error-bar">
              <td :colspan="displayColumns.length + 7" class="o-table-td--error-bar">
                <div class="error-bar">
                  <span v-for="(err, ei) in [...getRowErrorMessages(row), ...getB2Errors(row)]" :key="ei">{{ err }}</span>
                </div>
              </td>
            </tr>
            </template>
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
    <OBatchActionBar
      :selected-count="tableSelectedKeys.length"
      :actions="batchActions"
      @action-click="handleBatchAction"
      @select-all="handleSelectAll"
      @deselect-all="tableSelectedKeys = []"
    />

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

    <CarrierImportDialog
      v-model="showCarrierImportDialog"
      @imported="loadPendingWaybillOrders"
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

    <!-- ご依頼主情報の一括設定 -->
    <ODialog
      :open="senderBulkDialogVisible"
      title="ご依頼主情報の一括設定"
      @close="senderBulkDialogVisible = false"
    >
      <div class="bulk-dialog">
        <div class="bulk-dialog__badge">
          対象 <strong>{{ tableSelectedKeys.length }}</strong> 件
        </div>
        <div class="bulk-dialog__field">
          <label class="bulk-dialog__label">ご依頼主</label>
          <select class="bulk-dialog__select" v-model="senderBulkCompanyId">
            <option value="">ご依頼主を選択してください</option>
            <option v-for="company in orderSourceCompanies" :key="company._id" :value="company._id">{{ company.senderName }}</option>
          </select>
        </div>
        <div class="bulk-dialog__field">
          <label class="bulk-dialog__checkbox">
            <input type="checkbox" v-model="senderBulkOverwriteBaseNo">
            <span>上書きする</span>
          </label>
        </div>
      </div>
      <template #footer>
        <div class="bulk-dialog__footer-split">
          <OButton variant="secondary" @click="senderBulkDialogVisible = false">キャンセル</OButton>
          <OButton variant="primary" @click="applySenderBulkCompany">適用</OButton>
        </div>
      </template>
    </ODialog>

    <!-- 配送業者一括設定 -->
    <ODialog
      :open="carrierBulkDialogVisible"
      title="配送業者一括設定"
      @close="carrierBulkDialogVisible = false"
    >
      <div class="bulk-dialog">
        <div class="bulk-dialog__badge">
          対象 <strong>{{ tableSelectedKeys.length }}</strong> 件
        </div>
        <div class="bulk-dialog__field">
          <label class="bulk-dialog__label">配送業者</label>
          <select class="bulk-dialog__select" v-model="carrierBulkId">
            <option value="">配送業者を選択してください</option>
            <option v-for="opt in carrierOptions" :key="String(opt.value)" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
      </div>
      <template #footer>
        <div class="bulk-dialog__footer-split">
          <OButton variant="secondary" @click="carrierBulkDialogVisible = false">キャンセル</OButton>
          <OButton variant="primary" @click="applyCarrierBulk">適用</OButton>
        </div>
      </template>
    </ODialog>

    <!-- 出荷予定日一括設定 -->
    <ODialog
      :open="shipPlanDateDialogVisible"
      title="出荷予定日一括設定"
      @close="shipPlanDateDialogVisible = false"
    >
      <div class="bulk-dialog">
        <div class="bulk-dialog__badge">
          対象 <strong>{{ tableSelectedKeys.length }}</strong> 件
        </div>
        <div class="bulk-dialog__field">
          <label class="bulk-dialog__label">出荷予定日</label>
          <input type="date" class="bulk-dialog__input" v-model="shipPlanDateSelected" :min="todayDate" />
        </div>
      </div>
      <template #footer>
        <div class="bulk-dialog__footer-split">
          <OButton variant="secondary" @click="shipPlanDateDialogVisible = false">キャンセル</OButton>
          <OButton variant="primary" @click="applyShipPlanDateToSelected">適用</OButton>
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

    <!-- B2 Cloud validate dialog -->
    <YamatoB2ValidateResultDialog
      v-model="b2ValidateDialogVisible"
      :result="b2ValidateResult"
      :order-map="b2ValidateOrderMap"
      confirm-button-text="出荷指示を確定"
      @cancel="handleB2ValidateDialogCancel"
      @confirm="handleB2ValidateDialogConfirm"
    />

    <!-- B2 Cloud API error dialog -->
    <YamatoB2ApiErrorDialog
      v-model="b2ApiErrorDialogVisible"
      :error-message="b2ApiErrorMessage"
    />

    <YamatoB2ExportResultDialog
      v-model="b2ExportResultDialogVisible"
      :result="b2ExportResult"
      @confirm="handleB2ExportResultClose"
    />

    <CarrierExportResultDialog
      v-model="carrierExportDialogVisible"
      :carrier-label="carrierExportCarrierLabel"
      :mapping-options="carrierExportMappingOptions"
      v-model:selected-mapping-id="carrierExportSelectedMappingId"
      :headers="carrierExportHeaders"
      :rows="carrierExportOutputRows"
      :file-name-base="carrierExportFileNameBase"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import ShipmentOrderEditDialog from '@/components/form/ShipmentOrderEditDialog.vue'
import CarrierImportDialog from '@/components/import/CarrierImportDialog.vue'
import OBatchActionBar from '@/components/odoo/OBatchActionBar.vue'
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
import { ShipmentOrderBulkApiError, createShipmentOrdersBulk, fetchShipmentOrders, updateShipmentOrder, updateShipmentOrderStatusBulk, deleteShipmentOrdersBulk } from '@/api/shipmentOrders'
import { yamatoB2Validate, yamatoB2Export } from '@/api/carrierAutomation'
import type { YamatoB2ValidateResult, YamatoB2ExportResult } from '@/types/carrierAutomation'
import YamatoB2ValidateResultDialog from '@/components/carrier-automation/YamatoB2ValidateResultDialog.vue'
import YamatoB2ExportResultDialog from '@/components/carrier-automation/YamatoB2ExportResultDialog.vue'
import YamatoB2ApiErrorDialog from '@/components/carrier-automation/YamatoB2ApiErrorDialog.vue'
import CarrierExportResultDialog from '@/components/waybill-management/CarrierExportResultDialog.vue'
import { getAllMappingConfigs, type MappingConfig } from '@/api/mappingConfig'
import { applyTransformMappings } from '@/utils/transformRunner'
import { formatOrderProductsText } from '@/utils/formatOrderProductsText'
import { normalizeDateOnly } from '@/utils/dateNormalize'
import { getNestedValue } from '@/utils/nestedObject'
import { getStringWidth, splitByWidth } from '@/utils/japaneseCharWidth'
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
import { getApiBaseUrl } from '@/api/base'
import noImageSrc from '@/assets/images/no_image.png'

const API_BASE = getApiBaseUrl().replace(/\/api$/, '')
const resolveImageUrl = (url?: string) => {
  if (!url) return noImageSrc
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${API_BASE}${url}`
}

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
const showCarrierImportDialog = ref(false)
const showBundleFilterDialog = ref(false)
const editingRow = ref<UserOrderRow | null>(null)
const submitErrorDialogVisible = ref(false)
const isSubmitting = ref(false)
const isLoadingPendingWaybill = ref(false)

// --- B2 Cloud バリデーション ---
const b2Validating = ref(false)
const b2ValidateDialogVisible = ref(false)
const b2ValidateResult = ref<YamatoB2ValidateResult | null>(null)
const b2PendingConfirmIds = ref<string[]>([])
const b2PendingB2OrderIds = ref<string[]>([]) // B2 検証対象の ID 配列（index とマッピング）
const b2ValidateOrderMap = ref<Map<number, string>>(new Map()) // index → orderNumber
const b2ApiErrorDialogVisible = ref(false)
const b2ApiErrorMessage = ref('')
const b2ValidationErrors = ref<Map<string, string[]>>(new Map()) // orderId → error messages
const isAutoValidating = ref(false)
let autoValidateRetryTimer: ReturnType<typeof setTimeout> | null = null

// --- B2 Cloud 送信 & 配送業者データ出力 ---
const b2Exporting = ref(false)
const b2ExportResultDialogVisible = ref(false)
const b2ExportResult = ref<YamatoB2ExportResult | null>(null)
const carrierExportDialogVisible = ref(false)
const carrierExportCarrierLabel = ref('')
const carrierExportFileNameBase = ref('')
const carrierExportHeaders = ref<string[]>([])
const carrierExportOutputRows = ref<Array<Record<string, any>>>([])
const carrierExportMappingOptions = ref<Array<{ label: string; value: string }>>([])
const carrierExportSelectedMappingId = ref<string>('')
const carrierExportMappingConfigsById = ref<Map<string, MappingConfig>>(new Map())
const carrierExportSourceOrders = ref<any[]>([])

// B2 エラー文字列からユーザー向けメッセージを抽出
const parseB2Error = (err: string): string => {
  // Python dict 文字列: {'error_description': '...', ...}
  const descMatch = err.match(/['"]error_description['"]\s*:\s*['"](.+?)['"]/)
  if (descMatch) return descMatch[1]
  // JSON 文字列: {"error_description": "...", ...}
  try {
    const parsed = JSON.parse(err)
    if (parsed?.error_description) return parsed.error_description
    if (parsed?.error_message) return parsed.error_message
  } catch { /* not JSON */ }
  return err
}
const getB2Errors = (row: any): string[] => {
  const id = String(row._id || row.id)
  const errors = b2ValidationErrors.value.get(id)
  if (!errors) return []
  return errors.map(parseB2Error)
}

// --- バンドルモード ---
const bundleFilterKeys = ref<string[]>([])
const bundleModeEnabled = ref(false)

// --- 送り状未発行注文（バックエンドから取得） ---
const pendingWaybillRows = ref<UserOrderRow[]>([])

// --- フィルター・表示 ---
const displayFilter = ref<'pending_confirm' | 'processing' | 'pending_waybill' | 'held'>('pending_confirm')

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
  getCarrierLabel,
  getInvoiceTypeLabel,
  getTimeSlotLabel,
  fmtDateTime,
  fmtPostal,
  getCoolTypeInfo,
  formatProductsSku,
  formatProductsName,
  isOkinawa,
  isRemoteIsland,
  hasDeliverySpec,
} = table

// --- バリデーション composable（tableのbaseColumnsを参照） ---
const validation = useOrderValidation(baseColumns, backendErrorsByRowId)
const { hasRowErrors, hasFrontendRowErrors, isCellError, hasUnregisteredSku, getRowErrorMessages } = validation
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
const { isHeld, nonHeldRows, pendingConfirmCount, totalHeldCount, processingNonHeldCount, pendingWaybillNonHeldCount, toggleHoldSelected } = hold
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

// --- 同捆可能判定（同一お届け先の注文が2件以上あるか） ---
const bundleableRowIds = computed(() => {
  const rows = displayFilter.value === 'pending_confirm' ? filteredRows.value : []
  if (rows.length < 2) return new Set<string>()
  const groupCounts = new Map<string, string[]>()
  for (const row of rows) {
    const name = getNestedValue(row, 'recipient.name') ?? ''
    const postal = getNestedValue(row, 'recipient.postalCode') ?? ''
    if (!name && !postal) continue
    const key = `${name}|${postal}`
    if (!groupCounts.has(key)) groupCounts.set(key, [])
    groupCounts.get(key)!.push(row.id)
  }
  const ids = new Set<string>()
  for (const [, rowIds] of groupCounts) {
    if (rowIds.length >= 2) {
      for (const id of rowIds) ids.add(id)
    }
  }
  return ids
})

const isBundleable = (row: any): boolean => {
  return bundleableRowIds.value.has(row.id)
}

// --- バンドル関連 ---
const bundleFilterFields = computed(() => [
  { key: 'recipient.name', title: 'お届け先氏名', description: 'お届け先の氏名が一致する注文を同梱候補とする' },
  { key: 'recipient.postalCode', title: 'お届け先郵便番号', description: 'お届け先の郵便番号が一致する注文を同梱候補とする' },
  { key: 'recipient.street', title: 'お届け先住所', description: 'お届け先の住所が一致する注文を同梱候補とする' },
  { key: 'recipient.phone', title: 'お届け先電話番号', description: 'お届け先の電話番号が一致する注文を同梱候補とする' },
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
      building: first!.recipient?.building || '', name: first!.recipient?.name || '', phone: first!.recipient?.phone || '',
    },
    sender: {
      postalCode: first!.sender?.postalCode || '', prefecture: first!.sender?.prefecture || '',
      city: first!.sender?.city || '', street: first!.sender?.street || '',
      building: first!.sender?.building || '', name: first!.sender?.name || '', phone: first!.sender?.phone || '',
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

  // ネコポス・ゆうメール・ゆうパケット等メール便はお届け日・時間帯指定不可
  const noDateTimeTypes = new Set(['3', '7', 'A'])
  if (noDateTimeTypes.has(next.invoiceType)) {
    next.deliveryDatePreference = undefined as any
    next.deliveryTimeSlot = ''
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

const handleFormSubmit = async (data: Record<string, any>) => {
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
        building: data.orderer?.building || '', name: data.orderer?.name || '', phone: data.orderer?.phone || '',
      },
      recipient: {
        postalCode: data.recipient?.postalCode || '', prefecture: data.recipient?.prefecture || '',
        city: data.recipient?.city || '', street: data.recipient?.street || '',
        building: data.recipient?.building || '', name: data.recipient?.name || '', phone: data.recipient?.phone || '',
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
        building: data.sender?.building || '', name: data.sender?.name || '', phone: data.sender?.phone || '',
      },
      handlingTags: Array.isArray(data.handlingTags) ? data.handlingTags : editingRow.value.handlingTags || [],
      updatedAt: now,
    }
    updatedRow = applyProductDefaults(updatedRow)

    // バックエンド注文（_id あり）の場合は API で更新
    const backendId = (editingRow.value as any)._id
    if (backendId) {
      try {
        // バックエンドスキーマに合致するフィールドのみ送信（余分なフロントエンド専用フィールドを除外）
        const allowedFields = [
          'sourceOrderAt', 'carrierId', 'customerManagementNumber',
          'orderer', 'recipient', 'honorific', 'products',
          'shipPlanDate', 'invoiceType', 'coolType',
          'deliveryTimeSlot', 'deliveryDatePreference',
          'orderSourceCompanyId', 'carrierData', 'sender',
          'handlingTags', 'trackingId', 'updatedAt',
        ] as const
        // 空文字列のオプションフィールドはスキップ（バックエンド .min(1) バリデーション回避）
        const optionalSkipIfEmpty = new Set([
          'deliveryTimeSlot', 'deliveryDatePreference', 'orderSourceCompanyId',
          'honorific', 'trackingId', 'sourceOrderAt',
        ])
        const payload: Record<string, any> = {}
        for (const key of allowedFields) {
          const val = (updatedRow as any)[key]
          if (val === undefined || val === null) continue
          if (optionalSkipIfEmpty.has(key) && typeof val === 'string' && val.trim() === '') continue
          payload[key] = val
        }
        await updateShipmentOrder(String(backendId), payload)
        await loadPendingWaybillOrders()
        toast.showSuccess('出荷指示を更新しました')
      } catch (e: any) {
        console.error('Order update failed:', e, 'payload:', JSON.stringify(payload, null, 2))
        toast.showError(e?.message || '更新に失敗しました')
        return
      }
    } else {
      allRows.value = allRows.value.map(r => r.id === editingRow.value!.id ? updatedRow : r)
      toast.showSuccess('出荷指示を更新しました')
    }
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
        building: data.orderer?.building || '', name: data.orderer?.name || '', phone: data.orderer?.phone || '',
      },
      recipient: {
        postalCode: data.recipient?.postalCode || '', prefecture: data.recipient?.prefecture || '',
        city: data.recipient?.city || '', street: data.recipient?.street || '',
        building: data.recipient?.building || '', name: data.recipient?.name || '', phone: data.recipient?.phone || '',
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
        building: data.sender?.building || '', name: data.sender?.name || '', phone: data.sender?.phone || '',
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

// 住所フィールド文字数制限の正規化（半角幅ベース）
// 住所フィールドの正規化（B2 Cloud フィールド幅制限に合わせて分割）
const normalizeAddress = (addr: { city?: string; street?: string; building?: string } | undefined) => {
  if (!addr) return addr
  let city = addr.city || ''
  let street = addr.street || ''
  let building = addr.building || ''
  // 市区郡町村が24半角幅を超える場合、超過分を町・番地の先頭に移動
  const cityWidth = getStringWidth(city)
  if (cityWidth > 24) {
    const [cityFit, cityOverflow] = splitByWidth(city, 24)
    city = cityFit
    street = cityOverflow + street
  }
  // 町・番地が32半角幅を超える場合、超過分をアパートマンション名の先頭に移動
  const streetWidth = getStringWidth(street)
  if (streetWidth > 32) {
    const [streetFit, streetOverflow] = splitByWidth(street, 32)
    street = streetFit
    building = streetOverflow + building
  }
  return { ...addr, city, street, building }
}

const handleImport = (importedRows: UserOrderRow[]) => {
  const rowsWithDefaults = importedRows.map((row: UserOrderRow) => {
    const updatedRow = {
      ...row,
      recipient: normalizeAddress(row.recipient) as typeof row.recipient,
      sender: normalizeAddress(row.sender) as typeof row.sender,
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

  // バリデーションエラーチェック
  const errorRows = rowsWithDefaults.filter((r) => getRowErrorMessages(r).length > 0)
  if (errorRows.length > 0) {
    toast.showWarning(`${importedRows.length}件取り込み完了。${errorRows.length}件にエラーがあります。修正してください。`)
  } else {
    toast.showSuccess(`${importedRows.length}件のデータを取り込みしました`)
  }
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
        ? { postalCode: row.orderer.postalCode || undefined, prefecture: row.orderer.prefecture || undefined, city: row.orderer.city || undefined, street: row.orderer.street || undefined, building: row.orderer.building || undefined, name: row.orderer.name || undefined, phone: row.orderer.phone || undefined }
        : undefined,
      recipient: { postalCode: row.recipient?.postalCode || '', prefecture: row.recipient?.prefecture || '', city: row.recipient?.city || '', street: row.recipient?.street || '', building: row.recipient?.building || '', name: row.recipient?.name || '', phone: row.recipient?.phone || '' },
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
      sender: { postalCode: row.sender?.postalCode || '', prefecture: row.sender?.prefecture || '', city: row.sender?.city || '', street: row.sender?.street || '', building: row.sender?.building || '', name: row.sender?.name || '', phone: row.sender?.phone || '' },
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
    displayFilter.value = 'pending_confirm'
    toast.showError(`入力に誤りがある行が${invalidRows.length}件あります。エラー行のみ表示に切り替えました。`)
    return
  }

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
      displayFilter.value = 'pending_confirm'
      submitErrorDialogVisible.value = true
    } else {
      clearBackendErrors()
      if (allRows.value.length === 0) {
        draftStore.clearAll()
      }
      await loadPendingWaybillOrders()
      displayFilter.value = 'processing'
      // 自動 B2 Cloud 検証をバックグラウンドで実行（今回提出した注文のみ対象）
      const submittedIds = new Set(successes.map((s) => s?.insertedId).filter(Boolean))
      autoValidateProcessingOrders(submittedIds)
    }
  } catch (err: any) {
    if (err instanceof ShipmentOrderBulkApiError) {
      if (Array.isArray(err.errors) && err.errors.length > 0) {
        applyBackendErrors(err.errors)
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

const handleReleaseHold = async () => {
  if (tableSelectedKeys.value.length === 0) {
    toast.showWarning('保留解除する行を選択してください')
    return
  }
  const backendIds: string[] = []
  const localIds: (string | number)[] = []
  for (const id of tableSelectedKeys.value) {
    const isPendingWaybill = pendingWaybillRows.value.some(r => r.id === id)
    if (isPendingWaybill) {
      backendIds.push(String(id))
    } else {
      localIds.push(id)
    }
  }
  // ローカル行の保留解除
  if (localIds.length > 0) {
    const removeSet = new Set(localIds)
    heldRowIds.value = heldRowIds.value.filter(id => !removeSet.has(id))
    draftStore.setHeldIds(heldRowIds.value)
  }
  // バックエンド注文の保留解除
  if (backendIds.length > 0) {
    try {
      await updateShipmentOrderStatusBulk(backendIds, 'unhold')
      await loadPendingWaybillOrders()
    } catch (err) {
      toast.showError('保留解除に失敗しました')
      return
    }
  }
  const count = tableSelectedKeys.value.length
  tableSelectedKeys.value = []
  toast.showSuccess(`${count}件の保留を解除しました`)
}

const handleDeleteHeld = async () => {
  if (tableSelectedKeys.value.length === 0) {
    toast.showWarning('削除する行を選択してください')
    return
  }
  const backendIds: string[] = []
  const localIds: (string | number)[] = []
  for (const id of tableSelectedKeys.value) {
    const isPendingWaybill = pendingWaybillRows.value.some(r => r.id === id)
    if (isPendingWaybill) {
      const row = pendingWaybillRows.value.find(r => r.id === id)
      if (row) backendIds.push(String((row as any)._id || row.id))
    } else {
      localIds.push(id)
    }
  }
  // ローカル行の削除
  if (localIds.length > 0) {
    const localSet = new Set(localIds)
    allRows.value = allRows.value.filter((r) => !localSet.has(r.id))
    heldRowIds.value = heldRowIds.value.filter(id => !localSet.has(id))
    draftStore.setHeldIds(heldRowIds.value)
  }
  // バックエンド注文の削除
  if (backendIds.length > 0) {
    try {
      await deleteShipmentOrdersBulk(backendIds)
      await loadPendingWaybillOrders()
    } catch (e: any) {
      toast.showError(e?.message || '削除に失敗しました')
      return
    }
  }
  const count = tableSelectedKeys.value.length
  tableSelectedKeys.value = []
  toast.showSuccess(`${count}件を削除しました`)
}

// --- バックエンド注文の読み込み（送り状未発行・発行中・発行済） ---
let loadPendingWaybillVersion = 0

async function loadPendingWaybillOrders() {
  const version = ++loadPendingWaybillVersion
  try {
    isLoadingPendingWaybill.value = true
    const orders = await fetchShipmentOrders({ limit: 500 })
    // 古いリクエストの結果は破棄
    if (version !== loadPendingWaybillVersion) return
    pendingWaybillRows.value = (orders || [])
      .map((o: any) => ({ ...o, id: o._id } as UserOrderRow))
  } catch (err: any) {
    if (version !== loadPendingWaybillVersion) return
    console.error('注文の取得に失敗しました:', err)
    toast.showError('注文の取得に失敗しました')
  } finally {
    if (version === loadPendingWaybillVersion) {
      isLoadingPendingWaybill.value = false
    }
  }
}

// --- 出荷指示確定（B2 Cloud バリデーション） ---
const isYamatoB2Carrier = (carrierId: string): boolean => {
  const carrier = carriers.value.find((c) => c._id === carrierId)
  return carrier?.automationType === 'yamato-b2'
}

const handleConfirmPrintReady = async () => {
  if (tableSelectedKeys.value.length === 0) {
    toast.showWarning('確認する行を選択してください')
    return
  }

  const selectedRows = sortedRows.value.filter((row) =>
    tableSelectedKeys.value.includes(row.id),
  )

  if (!confirm(`選択した${selectedRows.length}件の出荷指示確定しますか？`)) return

  const ids = selectedRows.map((row) => String(row._id || row.id)).filter(Boolean)
  if (ids.length === 0) {
    toast.showWarning('有効なIDがありません')
    return
  }

  const b2OrderIds = selectedRows
    .filter((row) => isYamatoB2Carrier(row.carrierId))
    .map((row) => String(row._id || row.id))

  if (b2OrderIds.length > 0) {
    b2Validating.value = true
    // index → orderNumber マッピング構築
    const b2Rows = selectedRows.filter((row) => isYamatoB2Carrier(row.carrierId))
    const orderMap = new Map<number, string>()
    b2Rows.forEach((row, i) => {
      orderMap.set(i, (row as any).orderNumber || row.customerManagementNumber || '-')
    })
    b2ValidateOrderMap.value = orderMap
    try {
      const validateResult = await yamatoB2Validate(b2OrderIds)
      b2ValidateResult.value = validateResult
      b2PendingConfirmIds.value = ids
      b2PendingB2OrderIds.value = b2OrderIds
      b2Validating.value = false
      b2ValidateDialogVisible.value = true
    } catch (e: any) {
      b2Validating.value = false
      b2ApiErrorMessage.value = e?.message || 'B2 Cloud の検証中にエラーが発生しました'
      b2ApiErrorDialogVisible.value = true
    }
  } else {
    await doConfirmOrders(ids)
  }
}

const doConfirmOrders = async (ids: string[]) => {
  if (ids.length === 0) return
  try {
    await updateShipmentOrderStatusBulk(ids, 'mark-print-ready')
    toast.showSuccess(`${ids.length}件の出荷指示を確定しました`)
    tableSelectedKeys.value = []
    await loadPendingWaybillOrders()
  } catch (e: any) {
    toast.showError(e?.message || '出荷指示確定に失敗しました')
  }
}

const handleB2ValidateDialogCancel = () => {
  b2ValidateDialogVisible.value = false
  b2ValidateResult.value = null
  b2PendingConfirmIds.value = []
  b2PendingB2OrderIds.value = []
}

const handleB2ValidateDialogConfirm = async () => {
  b2ValidateDialogVisible.value = false

  // 検証結果から正常な B2 注文 ID のみ抽出
  const validB2Ids = new Set<string>()
  const invalidB2Ids = new Set<string>()
  if (b2ValidateResult.value) {
    for (const item of b2ValidateResult.value.results) {
      const orderId = b2PendingB2OrderIds.value[item.index]
      if (!orderId) continue
      if (item.valid) {
        validB2Ids.add(orderId)
      } else {
        invalidB2Ids.add(orderId)
      }
    }
  }

  // 非 B2 注文 + 正常な B2 注文のみ確定
  const confirmIds = b2PendingConfirmIds.value.filter((id) => !invalidB2Ids.has(id))
  await doConfirmOrders(confirmIds)

  b2PendingConfirmIds.value = []
  b2PendingB2OrderIds.value = []
  b2ValidateResult.value = null
}

// --- 自動 B2 Cloud 検証（処理中の注文をバックグラウンドで検証） ---
// 初回検証失敗時は「検証中」を維持し、短い待機後に再検証。2回目も失敗した場合のみエラー表示。
const RETRY_DELAY_MS = 8_000 // 初回失敗→リトライまでの待機時間
const LONG_RETRY_DELAY_MS = 5 * 60 * 1000 // 2回目失敗→長期リトライ

const autoValidateProcessingOrders = async (scopeIds?: Set<string>, isRetry = false) => {
  // リトライタイマーをクリア
  if (autoValidateRetryTimer) {
    clearTimeout(autoValidateRetryTimer)
    autoValidateRetryTimer = null
  }

  // 処理中の注文を取得（未確定 & 保留なし、scopeIds があれば今回提出分のみ）
  const processingOrders = pendingWaybillRows.value.filter(
    (r: any) => !r.status?.held?.isHeld && !r.status?.confirm?.isConfirmed
      && (!scopeIds || scopeIds.has(String(r._id || r.id))),
  )
  if (processingOrders.length === 0) return

  // B2 キャリアの注文のみ抽出
  const b2Orders = processingOrders.filter((r) => isYamatoB2Carrier(r.carrierId))
  if (b2Orders.length === 0) {
    // B2 以外の注文は直接確定
    const nonB2Ids = processingOrders.map((r) => String(r._id || r.id)).filter(Boolean)
    if (nonB2Ids.length > 0) {
      await doConfirmOrders(nonB2Ids)
    }
    return
  }

  const b2OrderIds = b2Orders.map((r) => String(r._id || r.id)).filter(Boolean)
  const nonB2Orders = processingOrders.filter((r) => !isYamatoB2Carrier(r.carrierId))
  const nonB2Ids = nonB2Orders.map((r) => String(r._id || r.id)).filter(Boolean)

  isAutoValidating.value = true
  // リトライ時はエラー表示をクリアしない（検証中のまま維持）
  if (!isRetry) {
    b2ValidationErrors.value = new Map()
  }

  try {
    const validateResult = await yamatoB2Validate(b2OrderIds)

    const validIds: string[] = []
    const newErrors = new Map<string, string[]>()

    for (const item of validateResult.results) {
      const orderId = b2OrderIds[item.index]
      if (!orderId) continue
      if (item.valid) {
        validIds.push(orderId)
      } else {
        newErrors.set(orderId, item.errors)
      }
    }

    // 検証通過した注文 + 非B2注文を確定（送り状未発行へ移動）
    const confirmIds = [...validIds, ...nonB2Ids]
    if (confirmIds.length > 0) {
      await doConfirmOrders(confirmIds)
    }

    if (newErrors.size > 0) {
      if (!isRetry) {
        // 初回失敗: エラーを表示せず「検証中」を維持、短い待機後にリトライ
        autoValidateRetryTimer = setTimeout(() => {
          autoValidateRetryTimer = null
          // 失敗した注文IDのみを対象にリトライ
          const failedIds = new Set(newErrors.keys())
          autoValidateProcessingOrders(failedIds, true)
        }, RETRY_DELAY_MS)
      } else {
        // 2回目失敗: エラーを表示
        b2ValidationErrors.value = newErrors
        isAutoValidating.value = false
        toast.showWarning(`${newErrors.size}件のデータにエラーがあります。処理中タブをご確認ください。`)
        // 長期リトライ
        autoValidateRetryTimer = setTimeout(() => {
          autoValidateRetryTimer = null
          autoValidateProcessingOrders()
        }, LONG_RETRY_DELAY_MS)
      }
    } else {
      b2ValidationErrors.value = new Map()
      isAutoValidating.value = false
      if (validIds.length > 0) {
        toast.showSuccess(`${validIds.length}件の検証が正常に完了しました`)
      }
    }
    return // finally で isAutoValidating をリセットしないよう早期 return
  } catch (e: any) {
    if (!isRetry) {
      // 初回 API エラー: 検証中を維持、短い待機後にリトライ
      autoValidateRetryTimer = setTimeout(() => {
        autoValidateRetryTimer = null
        autoValidateProcessingOrders(scopeIds, true)
      }, RETRY_DELAY_MS)
    } else {
      // 2回目 API エラー: エラーを表示
      isAutoValidating.value = false
      toast.showError(e?.message || 'B2 Cloud の検証中にエラーが発生しました')
      autoValidateRetryTimer = setTimeout(() => {
        autoValidateRetryTimer = null
        autoValidateProcessingOrders()
      }, LONG_RETRY_DELAY_MS)
    }
  }
}

// --- 送り状未発行の削除 ---
// --- バッチアクションバー ---
const batchActions = computed(() => {
  if (displayFilter.value === 'pending_confirm') {
    if (bundleModeEnabled.value) {
      return [
        { id: 'bundle-merge', label: '同梱する', variant: 'primary' as const },
        { id: 'unbundle', label: '同梱を解除する', variant: 'warning' as const },
      ]
    }
    const noSel = tableSelectedKeys.value.length === 0
    const actions: Array<{ id: string; label: string; icon?: string; variant?: 'primary' | 'danger' | 'secondary' | 'warning'; position?: 'left' | 'right'; separated?: boolean; disabled?: boolean }> = [
      { id: 'ship-plan-date', label: '出荷予定日一括設定', variant: 'primary', position: 'left', disabled: noSel },
      { id: 'sender-bulk', label: 'ご依頼主情報の一括設定', variant: 'primary', position: 'left', disabled: noSel },
      { id: 'carrier-bulk', label: '配送業者一括設定', variant: 'primary', position: 'left', disabled: noSel },
      { id: 'clear-selected', label: '削除', variant: 'danger', position: 'left', disabled: noSel },
      { id: 'hold-toggle', label: '保留切替', variant: 'secondary', disabled: noSel },
      { id: 'submit', label: isSubmitting.value ? '確認中...' : '出荷確認する', variant: 'primary', separated: true, disabled: noSel || isSubmitting.value },
    ]
    if (backendErrorCount.value > 0) {
      actions.push({ id: 'show-error-detail', label: 'エラー詳細', variant: 'danger' })
    }
    return actions
  }
  if (displayFilter.value === 'processing') {
    const noSel = tableSelectedKeys.value.length === 0
    return [
      { id: 'delete-pending', label: '削除', variant: 'danger' as const, position: 'left' as const, disabled: noSel },
      { id: 'confirm-print-ready', label: (b2Validating.value || isAutoValidating.value) ? '確定中...' : '再検証', variant: 'success' as const, disabled: noSel || b2Validating.value || isAutoValidating.value },
    ]
  }
  if (displayFilter.value === 'pending_waybill') {
    const noSel = tableSelectedKeys.value.length === 0
    return [
      { id: 'delete-pending', label: '削除', icon: 'delete', variant: 'danger' as const, position: 'left' as const, disabled: noSel },
      { id: 'b2-export', label: b2Exporting.value ? '処理中...' : 'B2 Cloudで伝票作成', variant: 'success' as const, disabled: !canSendToB2Cloud.value || b2Exporting.value },
      { id: 'carrier-export', label: '配送業者データ出力', variant: 'primary' as const, disabled: noSel },
    ]
  }
  if (displayFilter.value === 'held') {
    const noSel = tableSelectedKeys.value.length === 0
    return [
      { id: 'delete-held', label: '削除', variant: 'danger' as const, position: 'left' as const, disabled: noSel },
      { id: 'release-hold', label: '保留解除', variant: 'primary' as const, disabled: noSel },
    ]
  }
  return []
})

const handleBatchAction = (actionId: string) => {
  switch (actionId) {
    case 'bundle-merge': handleBundleMergeAllSelected(); break
    case 'unbundle': handleUnbundleSelected(); break
    case 'ship-plan-date': shipPlanDateDialogVisible.value = true; break
    case 'sender-bulk': senderBulkDialogVisible.value = true; break
    case 'carrier-bulk': carrierBulkDialogVisible.value = true; break
    case 'submit': handleSubmitClick(); break
    case 'clear-selected': handleBatchDeleteFromBar(); break
    case 'hold-toggle': toggleHoldSelected(); break
    case 'show-error-detail': submitErrorDialogVisible.value = true; break
    case 'delete-pending': handleDeletePending(); break
    case 'confirm-print-ready': handleConfirmPrintReady(); break
    case 'reload-pending': loadPendingWaybillOrders(); break
    case 'b2-export': handleB2Export(); break
    case 'carrier-export': handleCarrierExport(); break
    case 'clear-backend-errors': clearBackendErrors(); break
    case 'release-hold': handleReleaseHold(); break
    case 'delete-held': handleDeleteHeld(); break
  }
}

const handleSelectAll = () => {
  tableSelectedKeys.value = sortedRows.value.map((r) => r.id)
}

const handleDeletePending = async () => {
  if (tableSelectedKeys.value.length === 0) {
    toast.showWarning('削除する行を選択してください')
    return
  }
  if (!confirm(`選択した${tableSelectedKeys.value.length}件の出荷指示を削除しますか？\nこの操作は元に戻せません。`)) return

  const ids = sortedRows.value
    .filter((row) => tableSelectedKeys.value.includes(row.id))
    .map((row) => String(row._id || row.id))
    .filter(Boolean)

  try {
    const result = await deleteShipmentOrdersBulk(ids)
    toast.showSuccess(`${result.deletedCount}件の出荷指示を削除しました`)
    tableSelectedKeys.value = []
    await loadPendingWaybillOrders()
  } catch (e: any) {
    toast.showError(e?.message || '削除に失敗しました')
  }
}

// --- B2 Cloud 送信 ---
const canSendToB2Cloud = computed(() => {
  if (tableSelectedKeys.value.length === 0) return false
  const keySet = new Set(tableSelectedKeys.value)
  const selectedRows = pendingWaybillRows.value.filter((r) => keySet.has(r.id))
  if (selectedRows.length === 0) return false
  return selectedRows.every((row) => {
    const carrierId = String(row.carrierId || '')
    if (!carrierId) return false
    const carrier = carriers.value.find((c) => c._id === carrierId)
    return carrier?.automationType === 'yamato-b2'
  })
})

const handleB2Export = async () => {
  if (tableSelectedKeys.value.length === 0) return
  const keySet = new Set(tableSelectedKeys.value)
  const selectedRows = pendingWaybillRows.value.filter((r) => keySet.has(r.id))
  if (!selectedRows.length) return

  const carrierIdSet = new Set(selectedRows.map((r) => String(r.carrierId || '')).filter(Boolean))
  if (carrierIdSet.size !== 1) {
    toast.showWarning('選択した行の配送業者が一致しません。配送業者ごとに出力してください。')
    return
  }
  const carrierId = Array.from(carrierIdSet)[0]!
  const carrier = carriers.value.find((c) => c._id === carrierId)
  if (!carrier || carrier.automationType !== 'yamato-b2') {
    toast.showWarning('選択した配送業者はB2 Cloud自動連携に対応していません')
    return
  }

  const orderIds = selectedRows.map((r) => String((r as any)._id)).filter(Boolean)
  if (!orderIds.length) return

  b2Exporting.value = true
  try {
    const result = await yamatoB2Export(orderIds)
    b2ExportResult.value = result
    b2ExportResultDialogVisible.value = true
    if (result.success_count > 0) toast.showSuccess(`${result.success_count}件の送信に成功しました`)
    if (result.error_count > 0) toast.showError(`${result.error_count}件の送信に失敗しました`)
  } catch (e: any) {
    b2ApiErrorMessage.value = e?.message || 'B2 Cloudへの送信に失敗しました'
    b2ApiErrorDialogVisible.value = true
  } finally {
    b2Exporting.value = false
  }
}

const handleB2ExportResultClose = async () => {
  b2ExportResultDialogVisible.value = false
  b2ExportResult.value = null
  tableSelectedKeys.value = []
  await loadPendingWaybillOrders()
}

// --- 配送業者データ出力 ---
const normalizeOrderValueForExport = (sourcePath: string, raw: any): any => {
  if (sourcePath === 'products') {
    if (Array.isArray(raw)) return formatOrderProductsText(raw)
    if (raw && typeof raw === 'object') return formatOrderProductsText([raw])
  }
  return raw
}

const buildFlatRowForMappings = (order: any, mappings: MappingConfig['mappings']): Record<string, any> => {
  const flat: Record<string, any> = {}
  for (const m of mappings || []) {
    for (const input of (m as any)?.inputs || []) {
      if (input?.type !== 'column') continue
      const col = String(input.column || '')
      if (!col || col in flat) continue
      const raw = getNestedValue(order as any, col)
      flat[col] = normalizeOrderValueForExport(col, raw)
    }
  }
  return flat
}

const rebuildCarrierExportRows = async () => {
  const mappingId = carrierExportSelectedMappingId.value
  const cfg = carrierExportMappingConfigsById.value.get(String(mappingId || ''))
  if (!cfg) { carrierExportOutputRows.value = []; return }
  const headers = carrierExportHeaders.value
  const out = await Promise.all(
    carrierExportSourceOrders.value.map(async (order: any) => {
      const flatRow = buildFlatRowForMappings(order, cfg.mappings || [])
      const mapped = await applyTransformMappings(cfg.mappings || [], flatRow, { meta: { row: flatRow } })
      const row: Record<string, any> = {}
      for (const h of headers) row[h] = mapped?.[h] ?? ''
      return row
    }),
  )
  carrierExportOutputRows.value = out
}

const handleCarrierExport = async () => {
  if (tableSelectedKeys.value.length === 0) return
  const keySet = new Set(tableSelectedKeys.value)
  const selectedRows = pendingWaybillRows.value.filter((r) => keySet.has(r.id))
  if (!selectedRows.length) return

  const carrierIdSet = new Set(selectedRows.map((r) => String(r.carrierId || '')).filter(Boolean))
  if (carrierIdSet.size !== 1) {
    toast.showWarning('選択した行の配送業者が一致しません。配送業者ごとに出力してください。')
    return
  }

  const carrierId = Array.from(carrierIdSet)[0]!
  const carrier = carriers.value.find((c) => c._id === carrierId)
  if (!carrier) { toast.showError('配送業者情報が見つかりません'); return }

  const headers = (carrier.formatDefinition?.columns || []).map((c: any) => c.name).filter(Boolean)
  carrierExportHeaders.value = headers
  carrierExportSourceOrders.value = selectedRows

  try {
    const all = await getAllMappingConfigs('order-to-carrier')
    const filtered = (all || []).filter((c) => c?.configType === 'order-to-carrier' && c?.carrierCode === String(carrier.code || ''))
    filtered.sort((a, b) => Number(!!b.isDefault) - Number(!!a.isDefault) || a.name.localeCompare(b.name))
    carrierExportMappingConfigsById.value = new Map(filtered.map((c) => [c._id, c]))
    carrierExportMappingOptions.value = filtered.map((c) => ({ label: `${c.name}${c.isDefault ? ' (default)' : ''}`, value: c._id }))

    if (!carrierExportMappingOptions.value.length) {
      toast.showWarning('この配送業者に出力レイアウトが未設定です（レイアウト設定で作成してください）。')
      return
    }

    carrierExportSelectedMappingId.value = carrierExportMappingOptions.value[0]!.value
    const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    carrierExportCarrierLabel.value = `${carrier.name} (${carrier.code})`
    carrierExportFileNameBase.value = `${carrier.code || 'carrier'}_${ymd}`
    await rebuildCarrierExportRows()
    carrierExportDialogVisible.value = true
  } catch (e: any) {
    toast.showError(e?.message || '配送業者データ出力に失敗しました')
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

// --- フィルター変更時の処理 ---
watch(carrierExportSelectedMappingId, async () => {
  if (!carrierExportDialogVisible.value) return
  try { await rebuildCarrierExportRows() } catch (e: any) { toast.showError(e?.message || '出力レイアウトの適用に失敗しました') }
})

watch(displayFilter, (val) => {
  tableSelectedKeys.value = []
  if (val === 'processing' || val === 'pending_waybill') {
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

onBeforeUnmount(() => {
  if (autoValidateRetryTimer) {
    clearTimeout(autoValidateRetryTimer)
    autoValidateRetryTimer = null
  }
})
</script>

<style scoped>
@import '@/styles/order-table.css';

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

/* Page-specific status tags */
.o-status-tag--bundleable { background: #2563eb; color: #fff; }
.o-status-tag--validating { background: #e0e7ff; color: #4338ca; animation: pulse 1.5s infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

.o-table-row--has-error { background: #fff5f5 !important; }
.o-table-row--error-bar td { padding: 0 !important; border-top: none !important; }
.error-bar {
  background: #dc2626;
  color: #fff;
  font-size: 12px;
  padding: 4px 12px;
  line-height: 1.4;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

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

/* Toolbar buttons */
.o-toolbar-btn { background: rgba(255,255,255,0.2); border: none; color: #fff; padding: 0.25rem 0.625rem; border-radius: var(--o-border-radius-sm); font-size: var(--o-font-size-smaller); cursor: pointer; }
.o-toolbar-btn:hover { background: rgba(255,255,255,0.3); }
.o-toolbar-danger { background: var(--o-danger); }
.o-toolbar-danger:hover { background: #c82333; }

/* Column resize handle */
.o-resize-handle { position: absolute; top: 0; right: 0; bottom: 0; width: 5px; cursor: col-resize; background: transparent; transition: background 0.15s; z-index: 1; }
.o-resize-handle:hover, .o-table--resizing .o-resize-handle { background: var(--o-brand-primary, #714B67); }

/* Page-specific cell styles */
.o-table-td--error { background: #fff0f0; }
.o-cell-sub { font-size: 11px; color: var(--o-gray-500, #909399); }
.product-item__img--empty { background: var(--o-gray-100, #f5f5f5); }
.o-cool-tag { font-size: 11px; padding: 1px 5px; border-radius: 3px; display: inline-block; }
.customer-mgmt-link { color: var(--o-brand-primary, #714B67); text-decoration: none; font-weight: 500; }
.customer-mgmt-link:hover { text-decoration: underline; }

/* Bulk Dialogs */
.bulk-dialog {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.bulk-dialog__badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.375rem 0.75rem;
  background: var(--o-gray-100, #f1f3f5);
  border-radius: var(--o-border-radius, 4px);
  font-size: 0.8125rem;
  color: var(--o-gray-700, #495057);
  width: fit-content;
}
.bulk-dialog__badge strong {
  color: var(--o-brand-primary, #714B67);
  font-size: 0.9375rem;
}
.bulk-dialog__field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}
.bulk-dialog__label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--o-gray-800, #343a40);
}
.bulk-dialog__select,
.bulk-dialog__input {
  width: 100%;
  padding: 0.5rem 0.625rem;
  border: 1px solid var(--o-border-color, #dee2e6);
  border-radius: var(--o-border-radius, 4px);
  font-size: 0.875rem;
  color: var(--o-gray-900, #212529);
  background: var(--o-view-background, #fff);
  transition: border-color 0.15s;
  outline: none;
  box-sizing: border-box;
}
.bulk-dialog__select:focus,
.bulk-dialog__input:focus {
  border-color: var(--o-brand-primary, #714B67);
  box-shadow: 0 0 0 2px rgba(113, 75, 103, 0.12);
}
.bulk-dialog__checkbox {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--o-gray-800, #343a40);
  cursor: pointer;
}
.bulk-dialog__checkbox input[type="checkbox"] {
  width: 1rem;
  height: 1rem;
  accent-color: var(--o-brand-primary, #714B67);
  cursor: pointer;
}
.bulk-dialog__hint {
  font-size: 0.75rem;
  color: var(--o-gray-500, #909399);
  line-height: 1.5;
  margin: 0;
}
.bulk-dialog__footer-split {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

.error-list { display: flex; flex-direction: column; gap: 0.5rem; }
.error-list__meta { font-size: var(--o-font-size-small, 13px); color: var(--o-gray-600, #606266); margin-bottom: 0.5rem; }
.error-list__items { max-height: 300px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem; }
.error-list__item { padding: 0.5rem 0.75rem; border: 1px solid var(--o-danger-border, #f5c6cb); border-radius: 4px; background: var(--o-danger-light, #fdf0f1); }
.error-list__item-title { font-size: var(--o-font-size-small, 13px); font-weight: 500; color: var(--o-gray-800, #343a40); margin-bottom: 2px; }
.error-list__item-msg { font-size: 12px; color: var(--o-danger, #dc3545); }
</style>
