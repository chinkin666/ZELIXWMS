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
        <button
          v-if="!bundleModeEnabled"
          class="o-btn o-btn-secondary"
          @click="handleOpenBundleList"
        >
          同捆候補一覧
        </button>
        <button
          v-else
          class="o-btn o-btn-secondary"
          @click="handleExitBundleMode"
        >
          同梱モード終了
        </button>
        <template v-if="displayFilter !== 'pending_waybill'">
          <button class="o-btn o-btn-secondary" style="border-color:#67c23a;color:#67c23a;" @click="handleImportClick">
            一括登録
          </button>
          <button class="o-btn o-btn-primary" @click="handleAdd">
            個別登録
          </button>
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
        <div class="o-stat-card" :class="{ 'o-stat-card--clickable': displayFilter === 'pending_waybill' || displayFilter === 'held' }" @click="(displayFilter === 'pending_waybill' || displayFilter === 'held') && toggleHoldSelected()" title="選択中の行を保留/解除（送り状未発行・保留タブのみ）">
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
          <button
            class="o-btn o-btn-primary o-btn-sm"
            :disabled="tableSelectedKeys.length === 0 || selectedBundleGroupKeys.length === 0"
            @click="handleBundleMergeAllSelected"
          >
            同梱する
          </button>
          <button
            class="o-btn o-btn-sm"
            style="border-color:#e6a23c;color:#e6a23c;background:transparent;"
            :disabled="!hasUnbundleableRows"
            @click="handleUnbundleSelected"
          >
            同梱を解除する
          </button>
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
                  <button class="o-btn-icon" title="編集" @click="handleEdit(row)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button class="o-btn-icon o-btn-icon--danger" title="削除" @click="handleDelete(row)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                  </button>
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
          <button class="o-btn o-btn-sm" :disabled="currentPage <= 1" @click="currentPage--">&lsaquo;</button>
          <span class="o-table-pagination__page">{{ currentPage }} / {{ totalPages }}</span>
          <button class="o-btn o-btn-sm" :disabled="currentPage >= totalPages" @click="currentPage++">&rsaquo;</button>
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
        <!-- Bundle mode: show bundle/unbundle buttons -->
        <template v-if="bundleModeEnabled">
          <button
            class="o-btn o-btn-primary o-btn-sm"
            :disabled="tableSelectedKeys.length === 0 || selectedBundleGroupKeys.length === 0"
            @click="handleBundleMergeAllSelected"
          >
            同梱する
          </button>
          <button
            class="o-btn o-btn-sm"
            style="border-color:#e6a23c;color:#e6a23c;background:transparent;"
            :disabled="!hasUnbundleableRows"
            @click="handleUnbundleSelected"
          >
            同梱を解除する
          </button>
        </template>
        <!-- Normal mode: show standard buttons -->
        <template v-else>
          <button
            class="o-btn o-btn-primary o-btn-sm"
            style="opacity:0.8;"
            :disabled="tableSelectedKeys.length === 0"
            @click="shipPlanDateDialogVisible = true"
          >
            出荷予定日一括設定
          </button>
          <button
            class="o-btn o-btn-primary o-btn-sm"
            style="opacity:0.8;"
            :disabled="tableSelectedKeys.length === 0"
            @click="senderBulkDialogVisible = true"
          >
            ご依頼主一括設定
          </button>
          <button
            class="o-btn o-btn-primary o-btn-sm"
            style="opacity:0.8;"
            :disabled="tableSelectedKeys.length === 0 || carriers.length === 0"
            @click="carrierBulkDialogVisible = true"
          >
            配送業者一括設定
          </button>
          <!-- bulk edit removed (plain table) -->
          <button
            class="o-btn o-btn-danger o-btn-sm"
            :disabled="allRows.length === 0"
            @click="handleClearAll"
          >
            データクリア
          </button>
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
        <div
          v-if="backendErrorCount > 0"
          class="bottom-bar__alert"
          style="background:#fef0f0;border:1px solid #fde2e2;border-radius:6px;padding:8px 12px;color:#f56c6c;font-size:13px;display:flex;align-items:center;justify-content:space-between;"
        >
          <span>サーバー側でエラーが発生しました。エラー行のみ表示に切り替えています。</span>
          <button style="background:none;border:none;font-size:16px;cursor:pointer;color:#f56c6c;" @click="clearBackendErrors">&times;</button>
        </div>
      </template>
      <template #right>
        <template v-if="displayFilter !== 'pending_waybill'">
          <button
            class="o-btn o-btn-primary"
            :disabled="allRows.length === 0 || isSubmitting"
            @click="handleSubmitClick"
          >
            {{ isSubmitting ? '登録中...' : '出荷指示登録' }}
          </button>
          <button
            v-if="backendErrorCount > 0"
            class="o-btn o-btn-danger"
            @click="submitErrorDialogVisible = true"
          >
            エラー詳細
          </button>
        </template>
        <template v-else>
          <button
            class="o-btn o-btn-secondary"
            :disabled="isLoadingPendingWaybill"
            @click="loadPendingWaybillOrders"
          >
            {{ isLoadingPendingWaybill ? '読込中...' : '再読込' }}
          </button>
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

    <!-- Backend error dialog -->
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
          <button class="o-btn o-btn-secondary" @click="submitErrorDialogVisible = false">閉じる</button>
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
        <select
          class="o-input"
          v-model="senderBulkCompanyId"
          style="width: 100%"
        >
          <option value="">ご依頼主を選択</option>
          <option
            v-for="company in orderSourceCompanies"
            :key="company._id"
            :value="company._id"
          >{{ company.senderName }}</option>
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
          <button class="o-btn o-btn-secondary" @click="senderBulkDialogVisible = false">キャンセル</button>
          <button class="o-btn o-btn-primary" @click="applySenderBulkCompany">確定</button>
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
        <select
          class="o-input"
          v-model="carrierBulkId"
          style="width: 100%"
        >
          <option value="">配送業者を選択</option>
          <option
            v-for="opt in carrierOptions"
            :key="String(opt.value)"
            :value="opt.value"
          >{{ opt.label }}</option>
        </select>
      </div>

      <template #footer>
        <div class="sender-bulk__footer">
          <button class="o-btn o-btn-secondary" @click="carrierBulkDialogVisible = false">キャンセル</button>
          <button class="o-btn o-btn-primary" @click="applyCarrierBulk">確定</button>
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
        <input
          type="date"
          class="o-input"
          v-model="shipPlanDateSelected"
          :min="todayDate"
          style="width: 100%"
        />
      </div>

      <template #footer>
        <div class="sender-bulk__footer">
          <button class="o-btn o-btn-secondary" @click="shipPlanDateDialogVisible = false">キャンセル</button>
          <button class="o-btn o-btn-primary" @click="applyShipPlanDateToSelected">確定</button>
        </div>
      </template>
    </ODialog>

    <!-- Delete confirmation dialog -->
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
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import OrderBottomBar from '@/components/table/OrderBottomBar.vue'
import ShipmentOrderEditDialog from '@/components/form/ShipmentOrderEditDialog.vue'
import ShipmentOrderImportDialog from '@/components/import/ShipmentOrderImportDialog.vue'
import BundleFilterDialog from '@/components/bundle/BundleFilterDialog.vue'
import ODialog from '@/components/odoo/ODialog.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import { getOrderFieldDefinitions } from '@/types/order'
import { fetchProducts } from '@/api/product'
import type { Product } from '@/types/product'
import { fetchCarriers } from '@/api/carrier'
import type { Carrier } from '@/types/carrier'
import type { TableColumn } from '@/types/table'
import { type UserOrderRow, generateTempId } from '@/types/orderRow'
import { fetchOrderSourceCompanies } from '@/api/orderSourceCompany'
import type { OrderSourceCompany } from '@/types/orderSourceCompany'
import { ShipmentOrderBulkApiError, createShipmentOrdersBulk, fetchShipmentOrders, updateShipmentOrderStatusBulk } from '@/api/shipmentOrders'
import { normalizeDateOnly } from '@/utils/dateNormalize'
import { getNestedValue } from '@/utils/nestedObject'
import { validateCell } from '@/utils/orderValidation'
import {
  createProductMap,
  resolveAndFillProduct,
  determineCoolType,
  determineInvoiceType,
} from '@/utils/productMapUtils'
import type { OrderProduct } from '@/types/order'

const allRows = ref<UserOrderRow[]>([])
const rows = ref<UserOrderRow[]>([])
const showDialog = ref(false)
const showImportDialog = ref(false)
const showBundleFilterDialog = ref(false)
const bundleFilterKeys = ref<string[]>([])
const bundleModeEnabled = ref(false)
const BUNDLE_FILTER_COOKIE_KEY = 'bundle_filter_keys'
const BUNDLE_MODE_COOKIE_KEY = 'bundle_mode_enabled'
const TABLE_DATA_STORAGE_KEY = 'shipment_order_create_table_data'
const HELD_ROWS_STORAGE_KEY = 'shipment_order_create_held_rows'

// 批量删除功能开关（可通过配置或环境变量控制）
const batchDeleteEnabled = ref(true)

const setCookie = (name: string, value: string, days = 30) => {
  const expires = new Date()
  expires.setDate(expires.getDate() + days)
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/`
}

const getCookie = (name: string): string | null => {
  const pattern = `(?:^|; )${encodeURIComponent(name)}=([^;]*)`
  const match = document.cookie.match(new RegExp(pattern))
  const value = match?.[1]
  if (!value) return null
  return decodeURIComponent(value)
}

// localStorage 缓存表格数据
const saveTableDataToStorage = () => {
  try {
    const stripped = allRows.value.map((row: any) => {
      const base: any = {
        ...row,
        sourceRawRows: row.sourceRawRows,
      }
      if (!Array.isArray(base.products)) return base
      return {
        ...base,
        products: base.products.map((p: any) => ({
          inputSku: p.inputSku,
          quantity: p.quantity,
          productId: p.productId,
          productSku: p.productSku,
          productName: p.productName,
          matchedSubSku: p.matchedSubSku,
          ...(p.barcode?.length ? { barcode: p.barcode } : {}),
        })),
      }
    })
    localStorage.setItem(TABLE_DATA_STORAGE_KEY, JSON.stringify(stripped))
    localStorage.setItem(HELD_ROWS_STORAGE_KEY, JSON.stringify(heldRowIds.value))
  } catch (error) {
    console.error('Failed to save table data to localStorage:', error)
  }
}

const loadTableDataFromStorage = (): UserOrderRow[] => {
  try {
    const saved = localStorage.getItem(TABLE_DATA_STORAGE_KEY)
    if (!saved) return []
    const parsed = JSON.parse(saved)
    if (Array.isArray(parsed)) {
      return parsed as UserOrderRow[]
    }
    return []
  } catch (error) {
    console.error('Failed to load table data from localStorage:', error)
    return []
  }
}

const loadHeldRowsFromStorage = (): (string | number)[] => {
  try {
    const saved = localStorage.getItem(HELD_ROWS_STORAGE_KEY)
    if (!saved) return []
    const parsed = JSON.parse(saved)
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}

const clearTableDataStorage = () => {
  try {
    localStorage.removeItem(TABLE_DATA_STORAGE_KEY)
    localStorage.removeItem(HELD_ROWS_STORAGE_KEY)
  } catch (error) {
    console.error('Failed to clear table data from localStorage:', error)
  }
}
const editingRow = ref<UserOrderRow | null>(null)
const showOnlyErrors = ref(false)
const showOnlyUnregisteredSku = ref(false)
const displayFilter = ref<'new' | 'error' | 'pending_waybill' | 'held'>('new')

// 保留行（本地行用 localStorage，后台行用 status.held）
const heldRowIds = ref<(string | number)[]>([])

const isHeld = (id: string | number) => {
  // 先查本地保留列表
  if (heldRowIds.value.includes(id)) return true
  // 再查后台订单的 status.held
  const pwRow = pendingWaybillRows.value.find(r => r.id === id)
  if (pwRow && (pwRow as any).status?.held?.isHeld) return true
  return false
}

const toggleHoldSelected = async () => {
  if (tableSelectedKeys.value.length === 0) {
    alert('保留する行を選択してください')
    return
  }

  // 分开：后台订单（有 _id）和本地行
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

  // 处理本地行保留
  if (localIds.length > 0) {
    const currentSet = new Set(heldRowIds.value)
    const allHeld = localIds.every(id => currentSet.has(id))
    if (allHeld) {
      for (const id of localIds) currentSet.delete(id)
    } else {
      for (const id of localIds) currentSet.add(id)
    }
    heldRowIds.value = [...currentSet]
    saveTableDataToStorage()
  }

  // 处理后台订单保留
  if (backendIds.length > 0) {
    const allBackendHeld = backendIds.every(id => {
      const row = pendingWaybillRows.value.find(r => r.id === id)
      return row && (row as any).status?.held?.isHeld
    })
    const action = allBackendHeld ? 'unhold' : 'mark-held'
    try {
      await updateShipmentOrderStatusBulk(backendIds, action)
      // 刷新列表
      await loadPendingWaybillOrders()
    } catch (err) {
      console.error('Failed to update hold status:', err)
      alert('保留状態の更新に失敗しました')
    }
  }

  tableSelectedKeys.value = []
}

// 送り状未発行 orders from backend
const pendingWaybillRows = ref<UserOrderRow[]>([])
const isLoadingPendingWaybill = ref(false)

const loadPendingWaybillOrders = async () => {
  try {
    isLoadingPendingWaybill.value = true
    const orders = await fetchShipmentOrders({ limit: 500 })
    // Filter: submitted to backend, no trackingId yet
    pendingWaybillRows.value = (orders || [])
      .filter((o: any) => !o.trackingId)
      .map((o: any) => ({ ...o, id: o._id } as UserOrderRow))
  } catch (err) {
    console.error('Failed to load pending waybill orders:', err)
  } finally {
    isLoadingPendingWaybill.value = false
  }
}

// Watch displayFilter changes and sync with showOnlyErrors
watch(displayFilter, (val) => {
  showOnlyErrors.value = val === 'error'
  showOnlyUnregisteredSku.value = false
  tableSelectedKeys.value = []
  if (val === 'pending_waybill') {
    loadPendingWaybillOrders()
  }
})
const orderSourceCompanies = ref<OrderSourceCompany[]>([])
const products = ref<Product[]>([])
const carriers = ref<Carrier[]>([])
const isSubmitting = ref(false)
const submitErrorDialogVisible = ref(false)

type BackendErrorByRow = Record<string, Record<string, string[]>>
const backendErrorsByRowId = ref<BackendErrorByRow>({})

// Table selection（左側チェック）
const tableSelectedKeys = ref<Array<string | number>>([])

// 依頼主一括設定
const senderBulkDialogVisible = ref(false)
const senderBulkCompanyId = ref<string | null>(null)
const senderBulkOverwriteBaseNo = ref(false)

// 配送業者一括設定
const carrierBulkDialogVisible = ref(false)
const carrierBulkId = ref<string | null>(null)

// 出荷予定日一括設定
const shipPlanDateDialogVisible = ref(false)
const shipPlanDateSelected = ref<string>('')
const todayDate = new Date().toISOString().slice(0, 10)

// productMap is now built using the shared utility
const productMap = computed(() => createProductMap(products.value))

const handleTableSelectionChange = (payload: { selectedKeys: Array<string | number>; selectedRows: any[] }) => {
  tableSelectedKeys.value = payload.selectedKeys
}

const formatDateYYYYMMDD = (d: Date): string => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}/${m}/${day}`
}

const applyShipPlanDateToSelected = () => {
  if (!tableSelectedKeys.value.length) {
    alert('左側のチェックで編集対象の行を選択してください')
    return
  }
  if (!shipPlanDateSelected.value) {
    alert('出荷予定日を選択してください')
    return
  }

  const keySet = new Set(tableSelectedKeys.value)
  let changed = 0
  const nowIso = new Date().toISOString()

  for (const row of allRows.value) {
    if (!keySet.has(row.id)) continue
    row.shipPlanDate = shipPlanDateSelected.value
    row.updatedAt = nowIso
    changed += 1
  }

  saveTableDataToStorage()
  alert(`出荷予定日を${shipPlanDateSelected.value}に設定しました（${changed}件）`)
  shipPlanDateDialogVisible.value = false
}

const applySenderBulkCompany = () => {
  if (!senderBulkCompanyId.value) {
    alert('ご依頼主を選択してください')
    return
  }
  if (!tableSelectedKeys.value.length) {
    alert('左側のチェックで編集対象の行を選択してください')
    return
  }

  const company =
    orderSourceCompanies.value.find((c) => c._id === senderBulkCompanyId.value) || null
  if (!company) {
    alert('ご依頼主が見つかりません')
    return
  }

  const keySet = new Set(tableSelectedKeys.value)
  let changed = 0
  for (const row of allRows.value) {
    if (!keySet.has(row.id)) continue
    ;(row as any).orderSourceCompanyId = company._id
    row.sender = {
      postalCode: company.senderPostalCode || '',
      prefecture: company.senderAddressPrefecture || '',
      city: company.senderAddressCity || '',
      street: company.senderAddressStreet || '',
      name: company.senderName || '',
      phone: company.senderPhone || '',
    }

    if (!row.carrierData) {
      row.carrierData = {}
    }
    if (!row.carrierData.yamato) {
      row.carrierData.yamato = {}
    }

    if (senderBulkOverwriteBaseNo.value) {
      row.carrierData.yamato.hatsuBaseNo1 = company.hatsuBaseNo1 || ''
      row.carrierData.yamato.hatsuBaseNo2 = company.hatsuBaseNo2 || ''
    } else {
      if (!row.carrierData.yamato.hatsuBaseNo1 && company.hatsuBaseNo1) {
        row.carrierData.yamato.hatsuBaseNo1 = company.hatsuBaseNo1
      }
      if (!row.carrierData.yamato.hatsuBaseNo2 && company.hatsuBaseNo2) {
        row.carrierData.yamato.hatsuBaseNo2 = company.hatsuBaseNo2
      }
    }

    row.updatedAt = new Date().toISOString()
    changed += 1
  }

  saveTableDataToStorage()
  alert(`ご依頼主一括設定しました（${changed}件）`)
  senderBulkDialogVisible.value = false
  senderBulkOverwriteBaseNo.value = false
}

const applyCarrierBulk = () => {
  if (!carrierBulkId.value) {
    alert('配送業者を選択してください')
    return
  }
  if (!tableSelectedKeys.value.length) {
    alert('左側のチェックで編集対象の行を選択してください')
    return
  }

  const keySet = new Set(tableSelectedKeys.value)
  let changed = 0
  for (const row of allRows.value) {
    if (!keySet.has(row.id)) continue
    ;(row as any).carrierId = carrierBulkId.value
    row.updatedAt = new Date().toISOString()
    changed += 1
  }

  saveTableDataToStorage()
  alert(`配送業者一括設定しました（${changed}件）`)
  carrierBulkDialogVisible.value = false
}

const handleEdit = (row: UserOrderRow) => {
  editingRow.value = row
  showDialog.value = true
}

const handleAdd = () => {
  editingRow.value = null
  showDialog.value = true
}

// --- Delete confirmation dialog ---
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
    const index = allRows.value.findIndex((r: UserOrderRow) => r.id === row.id)
    if (index !== -1) {
      allRows.value.splice(index, 1)
      saveTableDataToStorage()
    }
  } else {
    const { keys } = deleteTarget.value
    allRows.value = allRows.value.filter((row: UserOrderRow) => !keys.has(row.id))
    tableSelectedKeys.value = []
    saveTableDataToStorage()
  }
  deleteDialogOpen.value = false
  deleteTarget.value = null
}

const handleBatchDelete = (payload: { selectedKeys: Array<string | number>; selectedRows: any[] }) => {
  const { selectedKeys } = payload

  if (selectedKeys.length === 0) {
    alert('削除する行を選択してください')
    return
  }

  deleteTarget.value = { type: 'batch', keys: new Set(selectedKeys), count: selectedKeys.length }
  deleteDialogMessage.value = `選択した${selectedKeys.length}件の出荷指示を削除しますか？`
  deleteDialogOpen.value = true
}

const carrierOptions = computed(() => {
  return (carriers.value || [])
    .filter((c) => c && c.enabled !== false)
    .map((c) => ({
      label: c.name,
      value: c._id,
    }))
})

const allFieldDefinitions = computed(() => getOrderFieldDefinitions({
  carrierOptions: carrierOptions.value,
}))

const hasUnregisteredSku = (row: UserOrderRow): boolean => {
  if (!Array.isArray(row.products) || row.products.length === 0) return false
  return row.products.some((p: OrderProduct) => !p.productId)
}

const unregisteredSkuRowCount = computed(() => {
  return allRows.value.filter((r) => hasUnregisteredSku(r)).length
})

const hasRowErrors = (row: UserOrderRow): boolean => {
  const hasFrontend = baseColumns.value.some((col) => !validateCell(row, col))
  const backend = backendErrorsByRowId.value?.[row.id]
  const hasBackend = backend ? Object.keys(backend).length > 0 : false
  return hasFrontend || hasBackend
}

const hasFrontendRowErrors = (row: UserOrderRow): boolean => {
  return baseColumns.value.some((col) => !validateCell(row, col))
}


const baseColumns = computed(() => {
  const excludedDataKeys = new Set([
    'orderNumber',
    'createdAt',
    'updatedAt',
    'sourceRawRows',
    'carrierRawRow',
    'status.carrierReceipt.isReceived',
    'status.confirm.isConfirmed',
    'status.printed.isPrinted',
    'handlingTags',
    'coolType',
    'deliveryTimeSlot',
    'recipient.postalCode',
    'recipient.prefecture',
    'recipient.city',
    'recipient.street',
    'recipient.name',
    'recipient.phone',
    'honorific',
    'sender.postalCode',
    'sender.prefecture',
    'sender.city',
    'sender.street',
    'sender.name',
    'sender.phone',
    'carrierData.yamato.hatsuBaseNo1',
    'carrierData.yamato.hatsuBaseNo2',
    'orderer.postalCode',
    'orderer.prefecture',
    'orderer.city',
    'orderer.street',
    'orderer.name',
    'orderer.phone',
  ])

  return (allFieldDefinitions.value || []).filter((col) => {
    if (col.tableVisible === false) return false
    const dataKey = col.dataKey ?? undefined
    if (!dataKey) return false
    if (String(dataKey).startsWith('__mappingExample_')) return false
    if (col.formEditable === false) return false
    if (excludedDataKeys.has(String(dataKey))) return false
    return true
  })
})

const formColumns = computed(() => {
  return allFieldDefinitions.value.filter(
    (col) => col.formEditable !== false && col.dataKey !== undefined
  )
})

// Virtual merged columns for 送付先
const recipientAddrColumn: TableColumn = {
  key: '__recipient_addr__',
  dataKey: '__recipient_addr__',
  title: '送付先',
  width: 260,
  fieldType: 'string',
  searchType: 'string',
}
const recipientNameColumn: TableColumn = {
  key: '__recipient_name__',
  dataKey: '__recipient_name__',
  title: '送付先名',
  width: 180,
  fieldType: 'string',
  searchType: 'string',
}
const senderNameColumn: TableColumn = {
  key: '__sender_name__',
  dataKey: '__sender_name__',
  title: 'ご依頼主氏名',
  width: 150,
  fieldType: 'string',
  searchType: 'string',
}
const ordererNameColumn: TableColumn = {
  key: '__orderer_name__',
  dataKey: '__orderer_name__',
  title: '注文者氏名',
  width: 150,
  fieldType: 'string',
  searchType: 'string',
}

// 送り状未発行タブ用カラム（確定画面のその他と同等）
const pendingWaybillColumns = computed(() => {
  const showKeys = new Set([
    'orderNumber',
    'customerManagementNumber',
    'carrierId',
    'invoiceType',
    'shipPlanDate',
    'deliveryDatePreference',
    'trackingId',
    'products',
    'createdAt',
    'updatedAt',
    'status.printed.printedAt',
    'status.confirm.confirmedAt',
    'status.carrierReceipt.receivedAt',
    'status.shipped.shippedAt',
    'internalRecord',
  ])
  const cols = (allFieldDefinitions.value || []).filter((col) => {
    const dataKey = col.dataKey ?? undefined
    if (!dataKey) return false
    return showKeys.has(String(dataKey))
  })
  // showKeysの順序で並べる
  const keyOrder = [...showKeys]
  cols.sort((a, b) => keyOrder.indexOf(String(a.dataKey)) - keyOrder.indexOf(String(b.dataKey)))
  // 送付先名・送付先住所の仮想列を追加
  const deliveryIdx = cols.findIndex(c => (c.dataKey || c.key) === 'deliveryDatePreference')
  if (deliveryIdx >= 0) {
    cols.splice(deliveryIdx + 1, 0, recipientNameColumn, recipientAddrColumn)
  } else {
    cols.push(recipientNameColumn, recipientAddrColumn)
  }
  return cols as TableColumn[]
})

// Flat columns for the plain table (no grouping)
// Insert 送付先 column after deliveryDatePreference
const flatColumns = computed(() => {
  const cols = [...baseColumns.value]
  // products列を取り出す
  const productsIdx = cols.findIndex(c => (c.dataKey || c.key) === 'products')
  const productsCol = productsIdx >= 0 ? cols.splice(productsIdx, 1)[0] : null
  // deliveryDatePreference の後に products → 送付先名 → 送付先 → 依頼主 → 注文者 の順で挿入
  const insertAfter = cols.findIndex(c => (c.dataKey || c.key) === 'deliveryDatePreference')
  const virtualCols = [
    ...(productsCol ? [productsCol] : []),
    recipientNameColumn, recipientAddrColumn, senderNameColumn, ordererNameColumn,
  ]
  if (insertAfter >= 0) {
    cols.splice(insertAfter + 1, 0, ...virtualCols)
  } else {
    cols.push(...virtualCols)
  }
  return cols as TableColumn[]
})

// タブに応じたカラム切り替え
const displayColumns = computed(() => {
  return displayFilter.value === 'pending_waybill' ? pendingWaybillColumns.value : flatColumns.value
})

// --- Column resize ---
const columnWidths = ref<Record<string, number>>({})
const resizingCol = ref<string | null>(null)
const resizeStartX = ref(0)
const resizeStartW = ref(0)

function getColWidth(col: TableColumn): string | undefined {
  const key = (col.dataKey || col.key) as string
  if (columnWidths.value[key]) return `${columnWidths.value[key]}px`
  return col.width ? `${col.width}px` : undefined
}

function onResizeStart(e: MouseEvent, col: TableColumn) {
  e.preventDefault()
  e.stopPropagation()
  const key = (col.dataKey || col.key) as string
  resizingCol.value = key
  resizeStartX.value = e.clientX
  const th = (e.target as HTMLElement).parentElement
  resizeStartW.value = th ? th.offsetWidth : 100
  document.addEventListener('mousemove', onResizeMove)
  document.addEventListener('mouseup', onResizeEnd)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

function onResizeMove(e: MouseEvent) {
  if (!resizingCol.value) return
  const diff = e.clientX - resizeStartX.value
  const newWidth = Math.max(50, resizeStartW.value + diff)
  columnWidths.value = { ...columnWidths.value, [resizingCol.value]: newWidth }
}

function onResizeEnd() {
  resizingCol.value = null
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
})

// --- Pagination & Sorting ---
const currentPage = ref(1)
const pageSize = ref(50)
const sortKey = ref('id')
const sortOrder = ref<'asc' | 'desc'>('asc')

const handleSortClick = (col: TableColumn) => {
  if (bundleModeEnabled.value) return
  const key = (col.dataKey || col.key) as string
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortOrder.value = 'asc'
  }
  currentPage.value = 1
}

// (sortedRows, paginatedRows, selection helpers, cell helpers defined after displayRows)

const bundleFilterFields = computed(() => {
  return [
    { key: 'recipient.name', title: '送付先氏名', description: '送付先の氏名が一致する注文を同梱候補とする' },
    { key: 'recipient.postalCode', title: '送付先郵便番号', description: '送付先の郵便番号が一致する注文を同梱候補とする' },
    { key: 'recipient.street', title: '送付先住所', description: '送付先の住所が一致する注文を同梱候補とする' },
    { key: 'recipient.phone', title: '送付先電話番号', description: '送付先の電話番号が一致する注文を同梱候補とする' },
    { key: 'orderSourceCompanyId', title: '販売分類', description: '※ご依頼主を超えて同梱する時には「販売分類」のチェックを外してください' },
  ]
})

const bundleFilterLabels = computed(() => {
  if (bundleFilterKeys.value.length === 0) return ''
  const labels = bundleFilterKeys.value
    .map((key) => {
      const field = bundleFilterFields.value.find((f) => f.key === key)
      return field?.title || key
    })
    .filter(Boolean)
  return labels.join(', ')
})

const hasUnbundleableRows = computed(() => {
  const selectedSet = new Set(tableSelectedKeys.value)
  if (selectedSet.size === 0) return false
  return allRows.value.some((row) => {
    if (!selectedSet.has(row.id)) return false
    return Array.isArray((row as any)._bundleOriginalRows) && (row as any)._bundleOriginalRows.length > 0
  })
})

const calculateProductsMetaForRow = (row: UserOrderRow) => {
  const products = Array.isArray(row.products) ? row.products : []
  const skus = [...new Set(products.map((p: OrderProduct) => p.inputSku || p.productSku).filter((s): s is string => Boolean(s)))]
  const names = [...new Set(products.map((p: OrderProduct) => p.productName).filter((name): name is string => Boolean(name && typeof name === 'string' && name.trim())))]
  const barcodes = [...new Set(products.flatMap((p: OrderProduct) => p.barcode || []).filter((b): b is string => Boolean(b)))]
  const totalQuantity = products.reduce((sum, p: OrderProduct) => sum + (p.quantity || 0), 0)
  const totalPrice = products.reduce((sum, p: OrderProduct) => sum + (p.subtotal || 0), 0)

  return {
    skus,
    names,
    barcodes,
    skuCount: skus.length,
    totalQuantity,
    totalPrice,
  }
}

const enrichRowWithProductsMeta = (row: UserOrderRow): UserOrderRow => {
  const meta: any = (row as any)._productsMeta
  const needsRecalc =
    !meta ||
    !Array.isArray(meta.skus) ||
    typeof meta.skuCount !== 'number' ||
    typeof meta.totalQuantity !== 'number' ||
    typeof meta.totalPrice !== 'number' ||
    !Array.isArray(meta.names) ||
    !Array.isArray(meta.barcodes)

  if (!needsRecalc) return row

  return {
    ...row,
    _productsMeta: calculateProductsMetaForRow(row),
  }
}

const globalSearchText = ref<string>('')

const searchedRows = computed(() => {
  const enriched = allRows.value.map(enrichRowWithProductsMeta)
  const q = globalSearchText.value.trim().toLowerCase()
  if (!q) return enriched
  return enriched.filter((row: UserOrderRow) => {
    const fields = [
      row.customerManagementNumber,
      row.orderNumber,
      row.recipient?.name,
      row.recipient?.phone,
      row.recipient?.postalCode,
      row.recipient?.prefecture,
      row.recipient?.city,
      row.recipient?.street,
      row.sender?.name,
      row.sender?.phone,
      row.orderer?.name,
      row.orderer?.phone,
      ...(row.products || []).flatMap((p: any) => [p.inputSku, p.productSku, p.productName]),
    ]
    return fields.some(f => f && String(f).toLowerCase().includes(q))
  })
})

const filteredRows = computed(() => {
  if (displayFilter.value === 'pending_waybill') {
    // 排除后台已保留的订单
    let rows = pendingWaybillRows.value.filter((row: any) => !row.status?.held?.isHeld)
    const q = globalSearchText.value.trim().toLowerCase()
    if (q) {
      rows = rows.filter((row: UserOrderRow) => {
        const fields = [
          row.customerManagementNumber, row.orderNumber,
          row.recipient?.name, row.recipient?.phone,
          row.sender?.name, row.orderer?.name,
        ]
        return fields.some(f => f && String(f).toLowerCase().includes(q))
      })
    }
    return rows
  }

  if (displayFilter.value === 'held') {
    // 本地保留行 + 后台保留行
    const localHeld = searchedRows.value.filter((row: UserOrderRow) => heldRowIds.value.includes(row.id))
    const backendHeld = pendingWaybillRows.value.filter((row: UserOrderRow) => (row as any).status?.held?.isHeld)
    return [...localHeld, ...backendHeld]
  }

  let result = searchedRows.value.filter((row: UserOrderRow) => !isHeld(row.id))

  if (displayFilter.value === 'new') {
    result = result.filter((row: UserOrderRow) => !hasRowErrors(row))
  } else if (displayFilter.value === 'error') {
    result = result.filter((row: UserOrderRow) => hasRowErrors(row))
  }

  return result
})

const nonHeldRows = computed(() => allRows.value.filter((r) => !isHeld(r.id)))

const totalHeldCount = computed(() => {
  const localCount = heldRowIds.value.length
  const backendCount = pendingWaybillRows.value.filter((r: any) => r.status?.held?.isHeld).length
  return localCount + backendCount
})

const pendingWaybillNonHeldCount = computed(() => {
  return pendingWaybillRows.value.filter((r: any) => !r.status?.held?.isHeld).length
})

const errorRowCount = computed(() => {
  return nonHeldRows.value.filter((r) => hasRowErrors(r)).length
})

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

const displayRows = computed(() => {
  if (bundleModeEnabled.value && bundleFilterKeys.value.length > 0) {
    const groups = new Map<string, UserOrderRow[]>()
    const bundledRows: UserOrderRow[] = []

    for (const row of filteredRows.value) {
      if (Array.isArray((row as any)._bundleOriginalRows) && (row as any)._bundleOriginalRows.length > 0) {
        bundledRows.push(row)
        continue
      }

      const keyParts = bundleFilterKeys.value.map((k) => getNestedValue(row, k) ?? '')
      const groupKey = JSON.stringify(keyParts)
      if (!groups.has(groupKey)) groups.set(groupKey, [])
      groups.get(groupKey)!.push(row)
    }

    const groupedEntries = Array.from(groups.entries()).filter(([, rows]) => rows.length >= 2)
    groupedEntries.sort(([a], [b]) => a.localeCompare(b))

    const result: any[] = []

    for (const row of bundledRows) {
      result.push({
        ...row,
        _bundleGroupKey: '__bundled__',
        _bundleGroupSize: 1,
        _bundleGroupFirst: true,
        _isBundled: true,
      })
    }

    for (const [key, rows] of groupedEntries) {
      const sortedRows = [...rows].sort((a, b) => {
        const aKey = String((a as any)?.orderNumber || (a as any)?.id || '')
        const bKey = String((b as any)?.orderNumber || (b as any)?.id || '')
        return aKey.localeCompare(bKey)
      })

      sortedRows.forEach((row, idx) => {
        result.push({
          ...row,
          _bundleGroupKey: key,
          _bundleGroupSize: sortedRows.length,
          _bundleGroupFirst: idx === 0,
          _isBundled: false,
        })
      })
    }
    return result
  }

  return [...filteredRows.value]
})

watch(displayRows, (newRows) => {
  rows.value = newRows
}, { immediate: true, deep: true })

// --- Sorted / paginated rows (must be after displayRows) ---
const sortedRows = computed(() => {
  const data = [...displayRows.value]
  if (bundleModeEnabled.value) return data
  const key = sortKey.value
  const order = sortOrder.value === 'asc' ? 1 : -1
  data.sort((a, b) => {
    const va = getNestedValue(a, key) ?? ''
    const vb = getNestedValue(b, key) ?? ''
    if (va < vb) return -1 * order
    if (va > vb) return 1 * order
    return 0
  })
  return data
})

const totalPages = computed(() => Math.max(1, Math.ceil(sortedRows.value.length / pageSize.value)))

watch([displayRows, pageSize], () => {
  if (currentPage.value > totalPages.value) currentPage.value = totalPages.value
})

const paginatedRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return sortedRows.value.slice(start, start + pageSize.value)
})

// --- Selection helpers ---
const isAllCurrentPageSelected = computed(() => {
  if (paginatedRows.value.length === 0) return false
  return paginatedRows.value.every((r) => tableSelectedKeys.value.includes(r.id))
})

const isSomeCurrentPageSelected = computed(() => {
  return paginatedRows.value.some((r) => tableSelectedKeys.value.includes(r.id))
})

const toggleSelectAll = () => {
  const pageIds = paginatedRows.value.map((r) => r.id)
  if (isAllCurrentPageSelected.value) {
    const pageSet = new Set(pageIds)
    tableSelectedKeys.value = tableSelectedKeys.value.filter((id) => !pageSet.has(id as string))
  } else {
    const existing = new Set(tableSelectedKeys.value)
    for (const id of pageIds) {
      if (!existing.has(id)) tableSelectedKeys.value.push(id)
    }
  }
}

const toggleRowSelection = (row: UserOrderRow) => {
  const idx = tableSelectedKeys.value.indexOf(row.id)
  if (idx >= 0) {
    tableSelectedKeys.value.splice(idx, 1)
  } else {
    tableSelectedKeys.value.push(row.id)
  }
}

// --- Cell helpers ---
const getCellValue = (row: UserOrderRow, col: TableColumn): string => {
  const key = (col.dataKey || col.key) as string
  const val = getNestedValue(row, key)
  if (val === null || val === undefined || val === '') {
    if (key === 'coolType') return '通常'
    if (key === 'deliveryDatePreference') return '最短'
    return '-'
  }
  // cellRenderer があればそちらを使う
  if (col.cellRenderer) {
    return String(col.cellRenderer({ rowData: row } as any) ?? '-')
  }
  // If column has searchOptions, map value to label
  if (col.searchOptions && col.searchOptions.length > 0) {
    const hit = col.searchOptions.find((opt) => String(opt.value) === String(val))
    if (hit) return hit.label
  }
  // 日付型はフォーマット
  if (col.fieldType === 'date' && typeof val === 'string') {
    try { return new Date(val).toLocaleString('ja-JP') } catch { /* fall through */ }
  }
  if (Array.isArray(val)) return val.join(', ')
  return String(val)
}

const TIME_SLOT_LABELS: Record<string, string> = { '0812': '午前中', '1416': '14-16時', '1618': '16-18時', '1820': '18-20時', '1921': '19-21時' }
const getTimeSlotLabel = (row: UserOrderRow): string => {
  const val = (row as any).deliveryTimeSlot
  if (!val) return '時間指定なし'
  return TIME_SLOT_LABELS[val] || val
}

const fmtPostal = (val?: string): string => {
  if (!val) return ''
  const d = val.replace(/[^0-9]/g, '')
  return d.length === 7 ? `${d.slice(0, 3)}-${d.slice(3)}` : val
}

const COOL_TYPE_MAP: Record<string, { label: string; color: string; bg: string }> = {
  '0': { label: '通常', color: '#666', bg: 'transparent' },
  '1': { label: 'クール冷凍', color: '#1d4ed8', bg: '#dbeafe' },
  '2': { label: 'クール冷蔵', color: '#0e7490', bg: '#cffafe' },
}
const getCoolTypeInfo = (row: UserOrderRow) => {
  const val = (row as any).coolType
  return COOL_TYPE_MAP[val] || COOL_TYPE_MAP['0']!
}

const formatProductsSku = (row: UserOrderRow): string => {
  const prods = row.products
  if (!Array.isArray(prods) || prods.length === 0) return '-'
  return prods.map((p: any) => `${p.inputSku || p.productSku || '?'} x${p.quantity || 0}`).join(', ')
}

const formatProductsName = (row: UserOrderRow): string => {
  const prods = row.products
  if (!Array.isArray(prods) || prods.length === 0) return ''
  const names = prods.map((p: any) => p.productName || '').filter(Boolean)
  return names.length > 0 ? names.join(', ') : '-'
}

const isCellError = (row: UserOrderRow, col: TableColumn): boolean => {
  const dataKey = (col.dataKey || col.key) as string
  const backendFieldErrors = backendErrorsByRowId.value?.[row.id]?.[dataKey]
  const hasBackendError = Array.isArray(backendFieldErrors) && backendFieldErrors.length > 0
  return !validateCell(row, col) || hasBackendError
}

const handleBatchDeleteFromBar = () => {
  if (tableSelectedKeys.value.length === 0) return
  const selectedRows = allRows.value.filter((r) => tableSelectedKeys.value.includes(r.id))
  handleBatchDelete({ selectedKeys: [...tableSelectedKeys.value], selectedRows })
}

const handleFormSubmit = (data: Record<string, any>) => {
  const now = new Date().toISOString()

  if (editingRow.value) {
    const index = allRows.value.findIndex((r: UserOrderRow) => r.id === editingRow.value!.id)
    if (index !== -1) {
      let updatedRow: UserOrderRow = {
        ...editingRow.value,
        orderNumber: editingRow.value.orderNumber || '',
        sourceOrderAt: data.sourceOrderAt !== undefined ? data.sourceOrderAt : editingRow.value.sourceOrderAt,
        carrierId: typeof data.carrierId === 'string' ? data.carrierId : (editingRow.value as any).carrierId || '',
        customerManagementNumber: data.customerManagementNumber || editingRow.value.customerManagementNumber || '',
        orderer: {
          postalCode: data.orderer?.postalCode || '',
          prefecture: data.orderer?.prefecture || '',
          city: data.orderer?.city || '',
          street: data.orderer?.street || '',
          name: data.orderer?.name || '',
          phone: data.orderer?.phone || '',
        },
        recipient: {
          postalCode: data.recipient?.postalCode || '',
          prefecture: data.recipient?.prefecture || '',
          city: data.recipient?.city || '',
          street: data.recipient?.street || '',
          name: data.recipient?.name || '',
          phone: data.recipient?.phone || '',
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
          postalCode: data.sender?.postalCode || '',
          prefecture: data.sender?.prefecture || '',
          city: data.sender?.city || '',
          street: data.sender?.street || '',
          name: data.sender?.name || '',
          phone: data.sender?.phone || '',
        },
        handlingTags: Array.isArray(data.handlingTags) ? data.handlingTags : editingRow.value.handlingTags || [],
        updatedAt: now,
      }
      updatedRow = applyProductDefaults(updatedRow)

      allRows.value[index] = updatedRow
      saveTableDataToStorage()
      alert('出荷指示を更新しました')
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
        postalCode: data.orderer?.postalCode || '',
        prefecture: data.orderer?.prefecture || '',
        city: data.orderer?.city || '',
        street: data.orderer?.street || '',
        name: data.orderer?.name || '',
        phone: data.orderer?.phone || '',
      },
      recipient: {
        postalCode: data.recipient?.postalCode || '',
        prefecture: data.recipient?.prefecture || '',
        city: data.recipient?.city || '',
        street: data.recipient?.street || '',
        name: data.recipient?.name || '',
        phone: data.recipient?.phone || '',
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
        postalCode: data.sender?.postalCode || '',
        prefecture: data.sender?.prefecture || '',
        city: data.sender?.city || '',
        street: data.sender?.street || '',
        name: data.sender?.name || '',
        phone: data.sender?.phone || '',
      },
      handlingTags: Array.isArray(data.handlingTags) ? data.handlingTags : [],
      sourceRawRows: [],
      createdAt: now,
      updatedAt: now,
    }
    newRow = applyProductDefaults(newRow)

    allRows.value.push(newRow)
    saveTableDataToStorage()
    alert('個別登録しました')
  }

  editingRow.value = null
}

const handleImportClick = () => {
  showImportDialog.value = true
}

const handleImport = (importedRows: UserOrderRow[]) => {
  const rowsWithDefaults = importedRows.map((row: UserOrderRow) => {
    let updatedRow = { ...row }
    if (Array.isArray(updatedRow.products)) {
      updatedRow.products = updatedRow.products.map((p: any): OrderProduct => {
        const quantityNum = p?.quantity !== undefined ? Number(p.quantity) : 1
        return {
          inputSku: p?.inputSku || p?.sku || '',
          quantity: Number.isNaN(quantityNum) ? 1 : quantityNum,
          productName: p?.productName || p?.name || undefined,
          ...(p?.barcode?.length ? { barcode: p.barcode } : {}),
        }
      })
    }
    updatedRow = applyProductDefaults(updatedRow)
    return updatedRow
  })
  allRows.value.push(...rowsWithDefaults)
  saveTableDataToStorage()
  alert(`${importedRows.length}件のデータを取り込みしました`)
}

const loadOrderSourceCompanies = async () => {
  try {
    const companies = await fetchOrderSourceCompanies()
    orderSourceCompanies.value = companies
  } catch (error) {
    console.error('Failed to load order source companies:', error)
    alert('ご依頼主リストの読み込みに失敗しました')
  }
}

const loadProductsCache = async () => {
  try {
    products.value = await fetchProducts()
    if (allRows.value.length > 0) {
      allRows.value = allRows.value.map((row) => applyProductDefaults(row))
    }
  } catch (error) {
    console.error('Failed to load products:', error)
    alert('商品マスタの取得に失敗しました')
  }
}

const loadCarriers = async () => {
  try {
    carriers.value = await fetchCarriers({ enabled: true })
  } catch (error) {
    console.error('Failed to load carriers:', error)
    alert('配送業者マスタの取得に失敗しました')
  }
}

const applyProductDefaults = (row: UserOrderRow): UserOrderRow => {
  const next: UserOrderRow = { ...row }
  const pMap = productMap.value

  if (Array.isArray(next.products)) {
    next.products = next.products.map((p: any): OrderProduct => {
      const inputSku = (p.inputSku || p.sku || '').trim()
      const quantity = p.quantity ?? 1

      if (p.productId && p.inputSku) {
        return p as OrderProduct
      }

      const existingData: Partial<OrderProduct> = {}
      if (p.barcode?.length) existingData.barcode = p.barcode
      if (p.name || p.productName) existingData.productName = p.productName || p.name

      const resolved = resolveAndFillProduct(inputSku, quantity, pMap, existingData)

      return resolved
    })

    const matchedProducts = next.products.filter(p => p.productId)
    if (matchedProducts.length > 0) {
      const nextCoolType = determineCoolType(next.products)
      if (nextCoolType !== undefined) {
        next.coolType = nextCoolType
      }

      const calculatedInvoiceType = determineInvoiceType(next.products, next.invoiceType as '0' | '8' | 'A' | undefined)
      if (calculatedInvoiceType !== null) {
        next.invoiceType = calculatedInvoiceType
      }
    }
  }
  return next
}

onMounted(() => {
  loadOrderSourceCompanies()
  loadProductsCache()
  loadCarriers()
  loadPendingWaybillOrders()

  const saved = getCookie(BUNDLE_FILTER_COOKIE_KEY)
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed)) {
        bundleFilterKeys.value = parsed.filter((k) => typeof k === 'string')
      }
    } catch (err) {
      console.warn('Failed to parse bundle filter cookie', err)
    }
  }

  const savedMode = getCookie(BUNDLE_MODE_COOKIE_KEY)
  if (savedMode === '1') {
    bundleModeEnabled.value = true
  }

  const savedTableData = loadTableDataFromStorage()
  if (savedTableData.length > 0) {
    allRows.value = savedTableData
  }
  const savedHeldIds = loadHeldRowsFromStorage()
  // 清理不存在的本地行保留记录
  const localRowIds = new Set(allRows.value.map(r => r.id))
  heldRowIds.value = savedHeldIds.filter(id => localRowIds.has(id))
})

const handleBundleFilterSave = (keys: string[]) => {
  bundleFilterKeys.value = keys
  setCookie(BUNDLE_FILTER_COOKIE_KEY, JSON.stringify(keys ?? []), 30)
  alert('同梱設定を保存しました')
}

const handleBundleFilterUpdate = (keys: string[]) => {
  bundleFilterKeys.value = keys
  setCookie(BUNDLE_FILTER_COOKIE_KEY, JSON.stringify(keys ?? []), 30)
}

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


const buildBulkUploadPayload = (rows?: typeof allRows.value) => {
  const targetRows = rows ?? allRows.value
  return {
    items: targetRows.map((row) => {
      const order = {
        ...(row.sourceOrderAt && { sourceOrderAt: row.sourceOrderAt }),
        carrierId: (row as any).carrierId,
        customerManagementNumber: row.customerManagementNumber,
        orderer: (row.orderer?.postalCode || row.orderer?.name || row.orderer?.phone)
          ? {
              postalCode: row.orderer.postalCode || undefined,
              prefecture: row.orderer.prefecture || undefined,
              city: row.orderer.city || undefined,
              street: row.orderer.street || undefined,
              name: row.orderer.name || undefined,
              phone: row.orderer.phone || undefined,
            }
          : undefined,
        recipient: {
          postalCode: row.recipient?.postalCode || '',
          prefecture: row.recipient?.prefecture || '',
          city: row.recipient?.city || '',
          street: row.recipient?.street || '',
          name: row.recipient?.name || '',
          phone: row.recipient?.phone || '',
        },
        honorific: row.honorific ?? '様',
        products: Array.isArray(row.products)
          ? row.products.map((p: OrderProduct) => ({
              inputSku: p.inputSku || '',
              quantity: typeof p.quantity === 'number' ? p.quantity : Number(p.quantity ?? 1),
              productId: p.productId || undefined,
              productSku: p.productSku || undefined,
              productName: p.productName || undefined,
              matchedSubSku: p.matchedSubSku ? {
                code: p.matchedSubSku.code,
                price: p.matchedSubSku.price,
                description: p.matchedSubSku.description,
              } : undefined,
              imageUrl: p.imageUrl || undefined,
              barcode: p.barcode,
              coolType: p.coolType,
              mailCalcEnabled: p.mailCalcEnabled,
              mailCalcMaxQuantity: p.mailCalcMaxQuantity,
              unitPrice: p.unitPrice,
              subtotal: p.subtotal,
            }))
          : [],
        shipPlanDate: row.shipPlanDate,
        invoiceType: row.invoiceType,
        coolType: row.coolType ?? undefined,
        deliveryTimeSlot: row.deliveryTimeSlot || undefined,
        deliveryDatePreference: row.deliveryDatePreference ? normalizeDateOnly(row.deliveryDatePreference) : undefined,
        orderSourceCompanyId: (row as any).orderSourceCompanyId || undefined,
        carrierData: row.carrierData ? {
          yamato: row.carrierData.yamato ? {
            sortingCode: row.carrierData.yamato.sortingCode || undefined,
            hatsuBaseNo1: row.carrierData.yamato.hatsuBaseNo1 || undefined,
            hatsuBaseNo2: row.carrierData.yamato.hatsuBaseNo2 || undefined,
          } : undefined,
        } : undefined,
        sender: {
          postalCode: row.sender?.postalCode || '',
          prefecture: row.sender?.prefecture || '',
          city: row.sender?.city || '',
          street: row.sender?.street || '',
          name: row.sender?.name || '',
          phone: row.sender?.phone || '',
        },
        handlingTags: Array.isArray(row.handlingTags) ? row.handlingTags : [],
        sourceRawRows: Array.isArray((row as any).sourceRawRows) ? (row as any).sourceRawRows : undefined,
      }
      return { clientId: row.id, order }
    }),
  }
}

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
    alert('登録するデータがありません')
    return
  }

  if (tableSelectedKeys.value.length === 0) {
    alert('登録する行を選択してください')
    return
  }

  const selectedSet = new Set(tableSelectedKeys.value)
  const targetRows = allRows.value.filter((r) => selectedSet.has(r.id))

  const invalidRows = targetRows.filter((r) => hasFrontendRowErrors(r))
  if (invalidRows.length > 0) {
    displayFilter.value = 'error'
    alert(`入力に誤りがある行が${invalidRows.length}件あります。エラー行のみ表示に切り替えました。`)
    return
  }

  if (!confirm(`登録対象：${targetRows.length}件\n出荷指示登録しますか？`)) return

  try {
    isSubmitting.value = true
    const payload = buildBulkUploadPayload(targetRows)
    const res = await createShipmentOrdersBulk(payload)
    alert(res?.message || '登録しました')

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
      saveTableDataToStorage()
    } else {
      allRows.value = []
      rows.value = []
      clearBackendErrors()
      clearTableDataStorage()
      // Switch to 送り状未発行 tab to show submitted orders
      await loadPendingWaybillOrders()
      displayFilter.value = 'pending_waybill'
    }
  } catch (err: any) {
    if (err instanceof ShipmentOrderBulkApiError) {
      if (Array.isArray(err.errors) && err.errors.length > 0) {
        applyBackendErrors(err.errors)
        showOnlyErrors.value = true
        submitErrorDialogVisible.value = true
        alert('サーバー側のバリデーションエラーがあります。')
        return
      }
      alert(err.message || 'アップロードに失敗しました')
      return
    }
    alert(err?.message || 'アップロードに失敗しました')
  } finally {
    isSubmitting.value = false
  }
}

const handleBundleMerge = (groupKey: string) => {
  if (!groupKey) return
  const groups = new Map<string, UserOrderRow[]>()
  for (const row of filteredRows.value) {
    const keyParts = bundleFilterKeys.value.map((k) => getNestedValue(row, k) ?? '')
    const k = JSON.stringify(keyParts)
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k)!.push(row)
  }

  const targetGroup = groups.get(groupKey)
  if (!targetGroup || targetGroup.length < 2) {
    alert('同梱対象が2件以上必要です')
    return
  }

  const [first, ...rest] = targetGroup
  if (!first) return
  const mergedProducts = [
    ...((first.products ?? []) as any[]),
    ...rest.flatMap((r) => (Array.isArray(r.products) ? r.products : [])),
  ]
  const mergedSourceRawRows = [
    ...(((first as any).sourceRawRows ?? []) as any[]),
    ...rest.flatMap((r) => (((r as any).sourceRawRows ?? []) as any[])),
  ]

  const mergedCoolType = determineCoolType(mergedProducts)
  const mergedInvoiceType = determineInvoiceType(mergedProducts, first.invoiceType as '0' | '8' | 'A' | undefined)

  const originalRows = targetGroup.map((r) => {
    const { _bundleOriginalRows, ...cleanRow } = r as any
    return cleanRow
  })

  const mergedRow: UserOrderRow = {
    ...first,
    orderNumber: first.orderNumber || '',
    recipient: {
      postalCode: first.recipient?.postalCode || '',
      prefecture: first.recipient?.prefecture || '',
      city: first.recipient?.city || '',
      street: first.recipient?.street || '',
      name: first.recipient?.name || '',
      phone: first.recipient?.phone || '',
    },
    sender: {
      postalCode: first.sender?.postalCode || '',
      prefecture: first.sender?.prefecture || '',
      city: first.sender?.city || '',
      street: first.sender?.street || '',
      name: first.sender?.name || '',
      phone: first.sender?.phone || '',
    },
    handlingTags: first.handlingTags || [],
    products: mergedProducts,
    sourceRawRows: mergedSourceRawRows,
    coolType: mergedCoolType ?? first.coolType,
    invoiceType: mergedInvoiceType ?? first.invoiceType,
    updatedAt: new Date().toISOString(),
    id: first.id,
    _bundleOriginalRows: originalRows,
  } as any

  const groupIds = new Set(targetGroup.map((r) => r.id))
  const nextAll = [] as UserOrderRow[]
  for (const row of allRows.value) {
    if (row.id === first.id) {
      nextAll.push(mergedRow)
    } else if (!groupIds.has(row.id)) {
      nextAll.push(row)
    }
  }
  allRows.value = nextAll
  saveTableDataToStorage()
  alert(`同梱完了：${targetGroup.length}件を統合しました`)
}

const handleUnbundleSelected = async () => {
  const selectedSet = new Set(tableSelectedKeys.value)
  if (selectedSet.size === 0) {
    alert('解除する行を選択してください')
    return
  }

  const bundledRows = allRows.value.filter((row) => {
    if (!selectedSet.has(row.id)) return false
    return Array.isArray((row as any)._bundleOriginalRows) && (row as any)._bundleOriginalRows.length > 0
  })

  if (bundledRows.length === 0) {
    alert('選択された行に同梱済みの行がありません')
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
          const restoredRow = {
            ...originalRow,
            updatedAt: new Date().toISOString(),
          }
          nextAll.push(restoredRow)
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
  saveTableDataToStorage()
  alert(`同梱解除完了：${restoredCount}件の行を復元しました`)
}

const handleUnbundleSingleRow = (rowId: string) => {
  const row = allRows.value.find((r) => r.id === rowId)
  if (!row) return

  const originalRows = (row as any)._bundleOriginalRows as UserOrderRow[]
  if (!Array.isArray(originalRows) || originalRows.length === 0) {
    alert('この行は同梱されていません')
    return
  }

  const nextAll: UserOrderRow[] = []
  let restoredCount = 0

  for (const r of allRows.value) {
    if (r.id === rowId) {
      for (const originalRow of originalRows) {
        const restoredRow = {
          ...originalRow,
          updatedAt: new Date().toISOString(),
        }
        nextAll.push(restoredRow)
        restoredCount++
      }
    } else {
      nextAll.push(r)
    }
  }

  allRows.value = nextAll
  saveTableDataToStorage()
  alert(`同梱解除完了：${restoredCount}件の行を復元しました`)
}

const selectedBundleGroupKeys = computed(() => {
  if (!bundleModeEnabled.value) return []
  if (!bundleFilterKeys.value.length) return []
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

const handleBundleMergeAllSelected = async () => {
  if (!bundleModeEnabled.value || bundleFilterKeys.value.length === 0) {
    alert('同梱モードとフィルターを有効にしてください')
    return
  }
  if (!tableSelectedKeys.value.length) {
    alert('左側のチェックで同梱したい行を選択してください')
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
    alert('選択した行に同梱可能なグループがありません')
    return
  }

  if (!confirm(`選択行を含む${groupKeysToMerge.length}グループ（合計${totalRowsToMerge}件）を同梱しますか？`)) return

  const mergedByFirstId = new Map<string, UserOrderRow>()
  const idsToRemove = new Set<string>()
  let mergedGroupCount = 0

  for (const gk of groupKeysToMerge) {
    const targetGroup = groups.get(gk)
    if (!targetGroup || targetGroup.length < 2) continue

    const [first, ...rest] = targetGroup
    if (!first) continue

    const mergedProducts = [
      ...((first.products ?? []) as any[]),
      ...rest.flatMap((r) => (Array.isArray(r.products) ? r.products : [])),
    ]
    const mergedSourceRawRows = [
      ...(((first as any).sourceRawRows ?? []) as any[]),
      ...rest.flatMap((r) => (((r as any).sourceRawRows ?? []) as any[])),
    ]

    const mergedCoolType = determineCoolType(mergedProducts)
    const mergedInvoiceType = determineInvoiceType(mergedProducts, first.invoiceType as '0' | '8' | 'A' | undefined)

    const originalRows = targetGroup.map((r) => {
      const { _bundleOriginalRows, ...cleanRow } = r as any
      return cleanRow
    })

    const mergedRow: UserOrderRow = {
      ...first,
      orderNumber: first.orderNumber || '',
      recipient: {
        postalCode: first.recipient?.postalCode || '',
        prefecture: first.recipient?.prefecture || '',
        city: first.recipient?.city || '',
        street: first.recipient?.street || '',
        name: first.recipient?.name || '',
        phone: first.recipient?.phone || '',
      },
      sender: {
        postalCode: first.sender?.postalCode || '',
        prefecture: first.sender?.prefecture || '',
        city: first.sender?.city || '',
        street: first.sender?.street || '',
        name: first.sender?.name || '',
        phone: first.sender?.phone || '',
      },
      handlingTags: first.handlingTags || [],
      products: mergedProducts,
      sourceRawRows: mergedSourceRawRows,
      coolType: mergedCoolType ?? first.coolType,
      invoiceType: mergedInvoiceType ?? first.invoiceType,
      updatedAt: new Date().toISOString(),
      id: first.id,
      _bundleOriginalRows: originalRows,
    } as any

    mergedByFirstId.set(first.id, mergedRow)
    for (const r of targetGroup) {
      if (r.id !== first.id) idsToRemove.add(r.id)
    }
    mergedGroupCount += 1
  }

  const nextAll: UserOrderRow[] = []
  for (const row of allRows.value) {
    if (idsToRemove.has(row.id)) continue
    const replacement = mergedByFirstId.get(row.id)
    nextAll.push(replacement ?? row)
  }
  allRows.value = nextAll

  tableSelectedKeys.value = []
  saveTableDataToStorage()
  alert(`全て同梱完了：${mergedGroupCount}グループを同梱しました`)
}

const handleClearAll = async () => {
  if (allRows.value.length === 0) {
    alert('クリアするデータがありません')
    return
  }

  if (!confirm(`すべてのデータ（${allRows.value.length}件）をクリアしますか？\nこの操作は元に戻せません。`)) return

  allRows.value = []
  rows.value = []
  tableSelectedKeys.value = []
  displayFilter.value = 'new'
  clearBackendErrors()
  clearTableDataStorage()
  alert('すべてのデータをクリアしました')
}
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
.o-status-tag--new {
  background: #dbeafe;
  color: #1d4ed8;
}
.o-status-tag--error {
  background: #fee2e2;
  color: #dc2626;
}
.o-status-tag--pending {
  background: #fef3c7;
  color: #d97706;
}
.o-status-tag--held {
  background: #fff3e0;
  color: #e65100;
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

.o-filter-tab:hover {
  border-color: var(--o-brand-primary, #714B67);
  color: var(--o-brand-primary, #714B67);
}

.o-filter-tab.active {
  background: var(--o-brand-primary, #714B67);
  color: #fff;
  border-color: var(--o-brand-primary, #714B67);
}

.o-tab-count {
  font-size: 0.6875rem;
  background: rgba(0, 0, 0, 0.1);
  padding: 0.0625rem 0.375rem;
  border-radius: 10rem;
}

.o-filter-tab.active .o-tab-count {
  background: rgba(255, 255, 255, 0.25);
}

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

.o-alert-error {
  background: #fef0f0;
  border: 1px solid #fde2e2;
  color: #f56c6c;
}

.o-alert-close {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  color: inherit;
  padding: 0 0.25rem;
}

/* ControlPanel search input */
.o-cp-search-input {
  width: 280px;
}

/* Bundle mode section */
.bundle-mode-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 1rem;
}

.bundle-mode-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: var(--o-gray-100, #eeeeee);
  border: 1px solid var(--o-border-color, #d6d6d6);
  border-radius: var(--o-border-radius, 4px);
  cursor: pointer;
  transition: background-color 0.2s;
}

.bundle-mode-bar:hover {
  background: var(--o-gray-200, #e5e5e5);
}

.bundle-mode-bar__title {
  font-size: var(--o-font-size-small, 13px);
  color: var(--o-gray-900, #102040);
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
}

.bundle-mode-bar__labels {
  font-size: var(--o-font-size-small, 13px);
  color: var(--o-gray-900, #102040);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bundle-mode-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Plain table */
.o-table-wrapper {
  overflow-x: auto;
  border: 1px solid var(--o-border-color, #d6d6d6);
  border-radius: var(--o-border-radius, 4px);
  background: var(--o-view-background, #fff);
}

.o-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--o-font-size-small, 13px);
  table-layout: fixed;
}

.o-table-th {
  position: sticky;
  top: 0;
  background: var(--o-gray-100, #f8f9fa);
  color: var(--o-gray-700, #495057);
  font-weight: 600;
  text-align: left;
  padding: 8px 10px;
  border-bottom: 2px solid var(--o-border-color, #d6d6d6);
  user-select: none;
  font-size: 12px;
  letter-spacing: 0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.o-table-th--sortable {
  cursor: pointer;
}

.o-table-th--sortable:hover {
  background: var(--o-gray-200, #e9ecef);
}

/* Column resize handle */
.o-resize-handle {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 5px;
  cursor: col-resize;
  background: transparent;
  transition: background 0.15s;
  z-index: 1;
}
.o-resize-handle:hover,
.o-table--resizing .o-resize-handle {
  background: var(--o-brand-primary, #714B67);
  opacity: 0.4;
}
.o-table--resizing {
  cursor: col-resize;
}

.o-table-th--checkbox {
  text-align: center;
  width: 40px;
}

.o-sort-icon {
  font-size: 9px;
  margin-left: 4px;
  opacity: 0.6;
}

.o-table-row {
  transition: background 0.1s;
}

.o-table-row:hover {
  background: var(--o-gray-50, #f8f9fa);
}

.o-table-row--selected {
  background: #f0e6ee !important;
}

[data-theme="dark"] .o-table-row--selected {
  background: rgba(113, 75, 103, 0.15) !important;
}

.o-table-td {
  padding: 6px 10px;
  border-bottom: 1px solid var(--o-border-color, #dee2e6);
  color: var(--o-gray-900, #212529);
  vertical-align: middle;
  overflow: hidden;
}

.o-table-td .o-cell {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
  white-space: normal;
  word-break: break-all;
}

.o-cell-sub {
  font-size: 11px;
  color: var(--o-gray-500, #909399);
}
.o-cool-tag {
  display: inline-block;
  font-size: 11px;
  padding: 0 6px;
  border-radius: 3px;
  line-height: 18px;
  font-weight: 500;
}

.o-table-td--checkbox {
  text-align: center;
  width: 40px;
}

.o-table-td--error {
  background-color: #ffebee !important;
}

.o-table-td--actions {
  text-align: center;
  white-space: nowrap;
  width: 60px;
}

.o-table-empty {
  text-align: center;
  padding: 40px;
  color: var(--o-gray-500, #909399);
}

.o-btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--o-gray-500, #6c757d);
  padding: 4px;
  border-radius: 4px;
  transition: color 0.15s, background 0.15s;
}

.o-btn-icon:hover {
  color: var(--o-brand-primary, #714B67);
  background: var(--o-gray-100, #f1f3f5);
}

.o-btn-icon--danger:hover {
  color: #dc3545;
  background: #fef0f0;
}

.customer-mgmt-link {
  color: var(--o-brand-primary, #714B67);
  text-decoration: none;
  font-weight: 500;
  cursor: pointer;
}

.customer-mgmt-link:hover {
  text-decoration: underline;
}

.o-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  background: var(--o-gray-200, #e9ecef);
  color: var(--o-gray-700, #495057);
  margin-right: 4px;
}

/* Batch action bar */
.o-table-batch-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  background: var(--o-gray-900, #212529);
  color: #fff;
  border-radius: var(--o-border-radius, 4px) var(--o-border-radius, 4px) 0 0;
  font-size: var(--o-font-size-small, 13px);
}

.o-table-batch-bar + .o-table-wrapper {
  border-top-left-radius: 0;
  border-top-right-radius: 0;
}

.o-table-batch-count {
  font-weight: 600;
}

.o-table-batch-bar .o-btn-sm {
  background: transparent;
  color: #fff;
  border-color: rgba(255,255,255,0.3);
}

.o-table-batch-bar .o-btn-sm:hover {
  border-color: #fff;
}

/* Pagination */
.o-table-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  font-size: var(--o-font-size-small, 13px);
  color: var(--o-gray-600, #606266);
}

.o-table-pagination__controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.o-table-pagination__page {
  min-width: 60px;
  text-align: center;
}

.o-input-sm {
  padding: 4px 8px;
  font-size: 12px;
}

/* Bottom bar meta */
.bottom-bar__meta {
  color: var(--o-gray-900, #303133);
  font-size: var(--o-font-size-small, 13px);
}

.bottom-bar__errors {
  color: #f56c6c;
}

.bottom-bar__unregistered {
  color: #e6a23c;
}

.bottom-bar__alert {
  max-width: 680px;
}

/* Dialog form styles */
.sender-bulk__meta {
  margin-bottom: 12px;
  color: var(--o-gray-600, #606266);
  font-size: var(--o-font-size-small, 13px);
}

.sender-bulk__footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hint {
  color: var(--o-gray-500, #909399);
  font-size: var(--o-font-size-smaller, 12px);
  line-height: 1.5;
}

/* Error list dialog */
.error-list__meta {
  margin-bottom: 12px;
  color: var(--o-gray-600, #606266);
  font-size: var(--o-font-size-small, 13px);
}

.error-list__items {
  max-height: 460px;
  overflow: auto;
  border: 1px solid var(--o-border-color, #ebeef5);
  border-radius: 6px;
}

.error-list__item {
  padding: 10px 12px;
  border-bottom: 1px solid var(--o-border-color, #ebeef5);
}

.error-list__item:last-child {
  border-bottom: none;
}

.error-list__item-title {
  font-size: var(--o-font-size-small, 13px);
  color: var(--o-gray-900, #303133);
  margin-bottom: 4px;
}

.error-list__item-msg {
  font-size: var(--o-font-size-small, 13px);
  color: #f56c6c;
  white-space: pre-wrap;
}

/* Form utility classes */
.o-form-group {
  margin-bottom: 1rem;
}

.o-form-label {
  display: block;
  font-size: var(--o-font-size-small, 13px);
  font-weight: 500;
  color: var(--o-gray-700, #606266);
  margin-bottom: 0.25rem;
}

.o-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 13px;
}

/* Responsive */
@media (max-width: 1024px) {
  .o-quick-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .o-quick-stats {
    grid-template-columns: 1fr;
  }

  .o-cp-search-input {
    width: 160px;
  }
}
</style>
