<template>
  <div class="o-view">
    <!-- ControlPanel Header -->
    <ControlPanel
      :title="t('wms.shipmentOrder.createTitle', '出荷指示作成')"
      :show-search="false"
    >
      <template #center>
        <input
          class="o-input o-cp-search-input"
          v-model="globalSearchText"
          :placeholder="t('wms.common.search', '検索') + '...'"
        />
      </template>
      <template #actions>
        <OButton variant="secondary" size="sm" @click="showColumnSettingsDialog = true" :title="t('wms.shipmentOrder.columnSettings', '列表示設定')">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
            <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.421 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z"/>
          </svg>
        </OButton>
        <template v-if="displayFilter === 'pending_confirm'">
        <OButton
          v-if="!bundleModeEnabled"
          variant="secondary"
          @click="handleOpenBundleList"
        >
          {{ t('wms.shipmentOrder.bundleCandidateList', '同捆候補一覧') }}
        </OButton>
        <OButton
          v-else
          variant="secondary"
          @click="handleExitBundleMode"
        >
          {{ t('wms.shipmentOrder.exitBundleMode', '同梱モード終了') }}
        </OButton>
        </template>
        <template v-if="displayFilter === 'pending_confirm'">
          <OButton variant="success" @click="handleImportClick">
            {{ t('wms.shipmentOrder.bulkRegister', '一括登録') }}
          </OButton>
          <OButton variant="primary" @click="handleAdd">
            {{ t('wms.shipmentOrder.individualRegister', '個別登録') }}
          </OButton>
        </template>
        <template v-if="displayFilter === 'pending_waybill'">
          <OButton variant="success" @click="showCarrierImportDialog = true">
            {{ t('wms.shipmentOrder.importWaybillData', '送り状データ取込') }}
          </OButton>
        </template>
      </template>
    </ControlPanel>

    <div class="o-content">
      <!-- Filter Tabs -->
      <div class="o-filter-tabs">
        <button class="o-filter-tab" :class="{ active: displayFilter === 'pending_confirm' }" @click="displayFilter = 'pending_confirm'">
          {{ t('wms.shipmentOrder.pendingConfirm', '出荷確認待ち') }} <span class="o-tab-count">{{ pendingConfirmCount }}</span>
        </button>
        <button class="o-filter-tab" :class="{ active: displayFilter === 'processing' }" @click="displayFilter = 'processing'">
          {{ t('wms.shipmentOrder.processing', '処理中') }} <span class="o-tab-count">{{ processingNonHeldCount }}</span>
        </button>
        <button class="o-filter-tab" :class="{ active: displayFilter === 'pending_waybill' }" @click="displayFilter = 'pending_waybill'">
          {{ t('wms.shipmentOrder.pendingWaybill', '送り状未発行') }} <span class="o-tab-count">{{ pendingWaybillNonHeldCount }}</span>
        </button>
        <button class="o-filter-tab" :class="{ active: displayFilter === 'held' }" @click="displayFilter = 'held'">
          {{ t('wms.shipmentOrder.held', '保留') }} <span class="o-tab-count">{{ totalHeldCount }}</span>
        </button>
      </div>

      <!-- Backend error alert -->
      <div
        v-if="backendErrorCount > 0"
        class="o-alert o-alert-error"
      >
        <span>{{ t('wms.shipmentOrder.serverErrorAlert', 'サーバー側でエラーが発生しました。エラー行のみ表示に切り替えています。') }}</span>
        <button class="o-alert-close" @click="clearBackendErrors">&times;</button>
      </div>

      <!-- Bundle mode bar -->
      <div v-if="bundleModeEnabled" class="bundle-mode-section">
        <div class="bundle-mode-bar" @click="showBundleFilterDialog = true">
          <span class="bundle-mode-bar__title">{{ t('wms.shipmentOrder.filterConditions', '絞り込み条件') }}：</span>
          <span class="bundle-mode-bar__labels">{{ bundleFilterLabels || t('wms.shipmentOrder.notSet', '未設定') }}</span>
        </div>
        <div class="bundle-mode-actions">
          <OButton
            variant="primary"
            size="sm"
            :disabled="tableSelectedKeys.length === 0 || selectedBundleGroupKeys.length === 0"
            @click="handleBundleMergeAllSelected"
          >
            {{ t('wms.shipmentOrder.bundle', '同梱する') }}
          </OButton>
          <OButton
            variant="warning"
            size="sm"
            :disabled="!hasUnbundleableRows"
            @click="handleUnbundleSelected"
          >
            {{ t('wms.shipmentOrder.unbundle', '同梱を解除する') }}
          </OButton>
        </div>
      </div>

      <!-- Plain table -->
      <div class="o-table-wrapper">
        <!-- Selection toolbar -->
        <div v-if="tableSelectedKeys.length > 0" class="o-list-toolbar o-toolbar-active">
          <span class="o-selected-count">{{ tableSelectedKeys.length }}{{ t('wms.shipmentOrder.itemsSelected', '件選択中') }}</span>
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
              <th class="o-table-th" style="width:90px;">{{ t('wms.common.status', '状態') }}</th>
              <th class="o-table-th" style="width:220px;">{{ t('wms.shipmentOrder.shipmentNumber', '出荷管理番号') }}</th>
              <th class="o-table-th" style="width:200px;">{{ t('wms.shipmentOrder.deliveryInfo', '配送情報') }}</th>
              <th class="o-table-th" style="width:180px;">{{ t('wms.shipmentOrder.deliverySpec', '配送指定') }}</th>
              <th
                v-for="col in visibleColumns"
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
              <th class="o-table-th" style="width:170px;">{{ t('wms.shipmentOrder.history', '履歴') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="isLoadingPendingWaybill && displayFilter !== 'pending_confirm'">
              <td :colspan="visibleColumns.length + 6" class="o-table-empty">{{ t('wms.ui.loading', '読み込み中...') }}</td>
            </tr>
            <tr v-else-if="paginatedRows.length === 0">
              <td :colspan="visibleColumns.length + 6" class="o-table-empty">{{ t('wms.ui.noData', 'データがありません') }}</td>
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
                  <span v-if="displayFilter === 'pending_waybill'" class="o-status-tag o-status-tag--processing">{{ t('wms.shipmentOrder.pendingWaybill', '送り状未発行') }}</span>
                  <span v-else-if="b2ValidationErrors.has(String(row._id || row.id))" class="o-status-tag o-status-tag--error" :title="getB2Errors(row).join('\n')">{{ t('wms.shipmentOrder.error', 'エラー') }}</span>
                  <span v-else-if="displayFilter === 'pending_confirm' && hasRowErrors(row)" class="o-status-tag o-status-tag--error">{{ t('wms.shipmentOrder.error', 'エラー') }}</span>
                  <span v-else-if="isHeld(row.id)" class="o-status-tag o-status-tag--held">{{ t('wms.shipmentOrder.held', '保留') }}</span>
                  <span v-else-if="displayFilter === 'processing' && isAutoValidating" class="o-status-tag o-status-tag--validating">{{ t('wms.shipmentOrder.validating', '検証中...') }}</span>
                  <span v-if="isBundleable(row)" class="o-status-tag o-status-tag--bundleable">{{ t('wms.shipmentOrder.bundleable', '同捆可能') }}</span>
                  <span v-if="hasDeliverySpec(row)" class="o-status-tag o-status-tag--delivery">{{ t('wms.shipmentOrder.deliverySpec', '配送指定') }}</span>
                  <span v-if="isOkinawa(row)" class="o-status-tag o-status-tag--okinawa">{{ t('wms.shipmentOrder.okinawaDelivery', '沖縄配送') }}</span>
                  <span v-if="isRemoteIsland(row)" class="o-status-tag o-status-tag--remote">{{ t('wms.shipmentOrder.remoteIslandDelivery', '離島配送') }}</span>
                  <span v-if="isDuplicate(row.id)" class="o-status-tag o-status-tag--duplicate" :title="isDuplicateBackend(row.id) ? t('wms.shipmentOrder.duplicateExisting', '既存注文と重複') : t('wms.shipmentOrder.duplicateInput', '入力データ内で重複')">{{ t('wms.shipmentOrder.duplicate', '重複') }}</span>
                </div>
              </td>
              <!-- 出荷管理番号（3行表示） -->
              <td class="o-table-td o-table-td--mgmt">
                <div class="mgmt-cell">
                  <div class="mgmt-cell__row">
                    <span class="mgmt-cell__label">{{ t('wms.shipmentOrder.shipmentManagementNo', '出荷管理No') }}</span>
                    <a v-if="(row as any).orderNumber" href="#" class="mgmt-cell__link mgmt-cell__value" @click.prevent="handleEdit(row)">{{ (row as any).orderNumber }}</a>
                    <span v-else class="mgmt-cell__value mgmt-cell__value--muted">{{ t('wms.shipmentOrder.autoNumberAfterRegister', '登録後に自動採番') }}</span>
                  </div>
                  <div class="mgmt-cell__row">
                    <span class="mgmt-cell__label">{{ t('wms.shipmentOrder.orderNumber', '注文番号') }}</span>
                    <a href="#" class="mgmt-cell__link mgmt-cell__value" @click.prevent="handleEdit(row)">{{ row.customerManagementNumber || '-' }}</a>
                  </div>
                  <div class="mgmt-cell__row">
                    <span class="mgmt-cell__label">{{ t('wms.shipmentOrder.waybillNumber', '送り状番号') }}</span>
                    <span class="mgmt-cell__value">{{ (row as any).trackingId || t('wms.shipmentOrder.notIssued', '未発行') }}</span>
                  </div>
                </div>
              </td>
              <!-- 配送情報（3行表示） -->
              <td class="o-table-td o-table-td--mgmt">
                <div class="mgmt-cell">
                  <div class="mgmt-cell__row">
                    <span class="mgmt-cell__label">{{ t('wms.shipmentOrder.carrierCompany', '配送会社') }}</span>
                    <span class="mgmt-cell__value">{{ getCarrierLabel(row) }}</span>
                  </div>
                  <div class="mgmt-cell__row">
                    <span class="mgmt-cell__label">{{ t('wms.shipmentOrder.deliveryService', '配送サービス') }}</span>
                    <span class="mgmt-cell__value">{{ getInvoiceTypeLabel(row) }}</span>
                  </div>
                  <div class="mgmt-cell__row">
                    <span class="mgmt-cell__label">{{ t('wms.shipmentOrder.temperatureZone', '温度帯') }}</span>
                    <span class="mgmt-cell__value" :style="{ color: getCoolTypeInfo(row).color }">{{ getCoolTypeInfo(row).label }}</span>
                  </div>
                </div>
              </td>
              <!-- 配送日時（3行表示） -->
              <td class="o-table-td o-table-td--mgmt">
                <div class="mgmt-cell">
                  <div class="mgmt-cell__row">
                    <span class="mgmt-cell__label">{{ t('wms.shipmentOrder.shipPlanDate', '出荷予定日') }}</span>
                    <span class="mgmt-cell__value">{{ (row as any).shipPlanDate || '-' }}</span>
                  </div>
                  <div class="mgmt-cell__row">
                    <span class="mgmt-cell__label">{{ t('wms.shipmentOrder.deliveryDate', 'お届け日') }}</span>
                    <span class="mgmt-cell__value">{{ (row as any).deliveryDatePreference || t('wms.shipmentOrder.earliest', '最短') }}</span>
                  </div>
                  <div class="mgmt-cell__row">
                    <span class="mgmt-cell__label">{{ t('wms.shipmentOrder.timeSlot', '時間帯指定') }}</span>
                    <span class="mgmt-cell__value">{{ getTimeSlotLabel(row) }}</span>
                  </div>
                </div>
              </td>
              <td
                v-for="col in visibleColumns"
                :key="col.key"
                class="o-table-td"
                :class="{ 'o-table-td--error': isCellError(row, col) }"
              >
                <template v-if="(col.dataKey || col.key) === '__recipient_addr__'">
                  <div class="recipient-cell">
                    <div>〒{{ fmtPostal(row.recipient?.postalCode) }}</div>
                    <div>{{ [row.recipient?.prefecture, row.recipient?.city, row.recipient?.street, row.recipient?.building].filter(Boolean).join(' ') || '-' }}</div>
                    <div>{{ row.recipient?.phone || '-' }}</div>
                    <div class="recipient-cell__name">{{ row.recipient?.name || '-' }} {{ row.honorific || t('wms.shipmentOrder.honorific', '様') }}</div>
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
                        <span class="product-item__meta">{{ t('wms.common.barcode', 'バーコード') }}: {{ Array.isArray(p.barcode) ? p.barcode.join(', ') : (p.barcode || '-') }}</span>
                        <span class="product-item__meta">{{ t('wms.shipmentOrder.qty', '個数') }}: {{ p.quantity ?? 0 }}</span>
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
                    <span class="mgmt-cell__label">{{ t('wms.shipmentOrder.createdAt', '作成日時') }}</span>
                    <span class="mgmt-cell__value">{{ fmtDateTime((row as any).createdAt) }}</span>
                  </div>
                  <div class="mgmt-cell__row">
                    <span class="mgmt-cell__label">{{ t('wms.shipmentOrder.updatedAt', '更新日時') }}</span>
                    <span class="mgmt-cell__value">{{ (row as any).updatedAt && (row as any).updatedAt !== (row as any).createdAt ? fmtDateTime((row as any).updatedAt) : '-' }}</span>
                  </div>
                  <div class="mgmt-cell__row">
                    <span class="mgmt-cell__label">{{ t('wms.shipmentOrder.waybillIssuedAt', '送り状発行日時') }}</span>
                    <span class="mgmt-cell__value">{{ fmtDateTime((row as any).status?.carrierReceipt?.receivedAt) }}</span>
                  </div>
                </div>
              </td>
            </tr>
            <tr v-if="b2ValidationErrors.has(String(row._id || row.id)) || getRowErrorMessages(row).length > 0" class="o-table-row--error-bar">
              <td :colspan="visibleColumns.length + 6" class="o-table-td--error-bar">
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
        <span class="o-table-pagination__info">{{ sortedRows.length }} {{ t('wms.shipmentOrder.items', '件') }}</span>
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
      :title="editingRow ? t('wms.shipmentOrder.editShipment', '出荷指示を編集') : t('wms.shipmentOrder.individualRegisterDialog', '出荷指示個別登録')"
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

    <!-- 列表示設定 -->
    <ODialog
      :open="showColumnSettingsDialog"
      :title="t('wms.shipmentOrder.columnSettings', '列表示設定')"
      size="sm"
      @close="showColumnSettingsDialog = false"
    >
      <div class="column-settings">
        <div class="column-settings__actions">
          <OButton variant="secondary" size="sm" @click="showAllColumns">{{ t('wms.shipmentOrder.showAll', 'すべて表示') }}</OButton>
        </div>
        <div class="column-settings__list">
          <label v-for="col in displayColumns" :key="col.key" class="column-settings__item">
            <input
              type="checkbox"
              :checked="isColumnVisible(String(col.dataKey || col.key))"
              @change="toggleColumn(String(col.dataKey || col.key))"
            />
            <span>{{ col.title }}</span>
          </label>
        </div>
      </div>
      <template #footer>
        <OButton variant="secondary" @click="showColumnSettingsDialog = false">{{ t('wms.shipmentOrder.close', '閉じる') }}</OButton>
      </template>
    </ODialog>

    <!-- エラー詳細ダイアログ -->
    <ODialog
      :open="submitErrorDialogVisible"
      :title="t('wms.shipmentOrder.errorDetail', 'エラー詳細')"
      @close="submitErrorDialogVisible = false"
    >
      <div v-if="backendErrorCount === 0" style="color: #909399;">
        {{ t('wms.shipmentOrder.noErrors', 'エラーはありません。') }}
      </div>
      <div v-else class="error-list">
        <div class="error-list__meta">
          {{ t('wms.shipmentOrder.errorCount', 'エラー件数') }}：<strong>{{ backendErrorCount }}</strong>
        </div>
        <div class="error-list__items">
          <div v-for="(e, idx) in backendErrorList" :key="`${idx}-${e.clientId}-${e.field}`" class="error-list__item">
            <div class="error-list__item-title">
              {{ t('wms.shipmentOrder.rowId', '行') }}：<strong>{{ e.clientId?.startsWith('temp-') ? `#${idx + 1}` : (e.clientId || '-') }}</strong>
              <span v-if="e.orderNumber">（{{ t('wms.shipmentOrder.shipmentManagementNo', '出荷管理No') }}：{{ e.orderNumber }}）</span>
              <span v-if="e.fieldTitle"> - {{ e.fieldTitle }}</span>
            </div>
            <div class="error-list__item-msg">{{ e.message }}</div>
          </div>
        </div>
      </div>
      <template #footer>
        <div style="display:flex; justify-content:flex-end; gap:10px;">
          <OButton variant="secondary" @click="submitErrorDialogVisible = false">{{ t('wms.shipmentOrder.close', '閉じる') }}</OButton>
        </div>
      </template>
    </ODialog>

    <!-- ご依頼主情報の一括設定 -->
    <ODialog
      :open="senderBulkDialogVisible"
      :title="t('wms.shipmentOrder.senderBulkSetting', 'ご依頼主情報の一括設定')"
      @close="senderBulkDialogVisible = false"
    >
      <div class="bulk-dialog">
        <div class="bulk-dialog__badge">
          {{ t('wms.shipmentOrder.target', '対象') }} <strong>{{ tableSelectedKeys.length }}</strong> {{ t('wms.shipmentOrder.items', '件') }}
        </div>
        <div class="bulk-dialog__field">
          <label class="bulk-dialog__label">{{ t('wms.shipmentOrder.sender', 'ご依頼主') }}</label>
          <select class="bulk-dialog__select" v-model="senderBulkCompanyId">
            <option value="">{{ t('wms.shipmentOrder.selectSender', 'ご依頼主を選択してください') }}</option>
            <option v-for="company in orderSourceCompanies" :key="company._id" :value="company._id">{{ company.senderName }}</option>
          </select>
        </div>
        <div class="bulk-dialog__field">
          <label class="bulk-dialog__checkbox">
            <input type="checkbox" v-model="senderBulkOverwriteBaseNo">
            <span>{{ t('wms.shipmentOrder.overwrite', '上書きする') }}</span>
          </label>
        </div>
      </div>
      <template #footer>
        <div class="bulk-dialog__footer-split">
          <OButton variant="secondary" @click="senderBulkDialogVisible = false">{{ t('wms.common.cancel', 'キャンセル') }}</OButton>
          <OButton variant="primary" @click="applySenderBulkCompany">{{ t('wms.shipmentOrder.apply', '適用') }}</OButton>
        </div>
      </template>
    </ODialog>

    <!-- 配送業者一括設定 -->
    <ODialog
      :open="carrierBulkDialogVisible"
      :title="t('wms.shipmentOrder.carrierBulkSetting', '配送業者一括設定')"
      @close="carrierBulkDialogVisible = false"
    >
      <div class="bulk-dialog">
        <div class="bulk-dialog__badge">
          {{ t('wms.shipmentOrder.target', '対象') }} <strong>{{ tableSelectedKeys.length }}</strong> {{ t('wms.shipmentOrder.items', '件') }}
        </div>
        <div class="bulk-dialog__field">
          <label class="bulk-dialog__label">{{ t('wms.shipmentOrder.carrierLabel', '配送業者') }}</label>
          <select class="bulk-dialog__select" v-model="carrierBulkId">
            <option value="">{{ t('wms.shipmentOrder.selectCarrier', '配送業者を選択してください') }}</option>
            <option v-for="opt in carrierOptions" :key="String(opt.value)" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
      </div>
      <template #footer>
        <div class="bulk-dialog__footer-split">
          <OButton variant="secondary" @click="carrierBulkDialogVisible = false">{{ t('wms.common.cancel', 'キャンセル') }}</OButton>
          <OButton variant="primary" @click="applyCarrierBulk">{{ t('wms.shipmentOrder.apply', '適用') }}</OButton>
        </div>
      </template>
    </ODialog>

    <!-- 出荷予定日一括設定 -->
    <ODialog
      :open="shipPlanDateDialogVisible"
      :title="t('wms.shipmentOrder.shipPlanDateBulkSetting', '出荷予定日一括設定')"
      @close="shipPlanDateDialogVisible = false"
    >
      <div class="bulk-dialog">
        <div class="bulk-dialog__badge">
          {{ t('wms.shipmentOrder.target', '対象') }} <strong>{{ tableSelectedKeys.length }}</strong> {{ t('wms.shipmentOrder.items', '件') }}
        </div>
        <div class="bulk-dialog__field">
          <label class="bulk-dialog__label">{{ t('wms.shipmentOrder.shipPlanDate', '出荷予定日') }}</label>
          <input type="date" class="bulk-dialog__input" v-model="shipPlanDateSelected" :min="todayDate" />
        </div>
      </div>
      <template #footer>
        <div class="bulk-dialog__footer-split">
          <OButton variant="secondary" @click="shipPlanDateDialogVisible = false">{{ t('wms.common.cancel', 'キャンセル') }}</OButton>
          <OButton variant="primary" @click="applyShipPlanDateToSelected">{{ t('wms.shipmentOrder.apply', '適用') }}</OButton>
        </div>
      </template>
    </ODialog>

    <!-- 削除確認ダイアログ -->
    <ODialog
      :open="deleteDialogOpen"
      :title="t('wms.shipmentOrder.deleteConfirmation', '削除確認')"
      size="sm"
      :danger="true"
      @close="deleteDialogOpen = false"
      @confirm="confirmDelete"
    >
      <div class="delete-confirm">
        <div class="delete-confirm__icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#dc3545" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <p class="delete-confirm__message">{{ deleteDialogMessage }}</p>
        <p class="delete-confirm__hint">{{ t('wms.shipmentOrder.cannotUndo', 'この操作は元に戻せません。') }}</p>
      </div>
      <template #confirm-text>{{ t('wms.shipmentOrder.confirmDelete', '削除する') }}</template>
    </ODialog>

    <!-- B2 Cloud validate dialog -->
    <YamatoB2ValidateResultDialog
      v-model="b2ValidateDialogVisible"
      :result="b2ValidateResult"
      :order-map="b2ValidateOrderMap"
      :confirm-button-text="t('wms.shipmentOrder.confirmShipment', '出荷指示を確定')"
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

    <CustomExportDialog
      v-model="customExportDialogVisible"
      :orders="customExportOrders"
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
import YamatoB2ValidateResultDialog from '@/components/carrier-automation/YamatoB2ValidateResultDialog.vue'
import YamatoB2ExportResultDialog from '@/components/carrier-automation/YamatoB2ExportResultDialog.vue'
import YamatoB2ApiErrorDialog from '@/components/carrier-automation/YamatoB2ApiErrorDialog.vue'
import CarrierExportResultDialog from '@/components/waybill-management/CarrierExportResultDialog.vue'
import CustomExportDialog from '@/components/export/CustomExportDialog.vue'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import { useShipmentOrderDraftStore } from '@/stores/shipmentOrderDraft'
import type { UserOrderRow } from '@/types/orderRow'
import { useOrderValidation } from './composables/useOrderValidation'
import { useOrderHold } from './composables/useOrderHold'
import { useOrderBulkActions } from './composables/useOrderBulkActions'
import { useOrderTable } from './composables/useOrderTable'
import { useOrderDelete } from './composables/useOrderDelete'
import { useOrderBundle } from './composables/useOrderBundle'
import { useOrderForm } from './composables/useOrderForm'
import { useOrderSubmit } from './composables/useOrderSubmit'
import { useOrderB2Cloud } from './composables/useOrderB2Cloud'
import { useOrderCarrierExport } from './composables/useOrderCarrierExport'
import { useOrderDuplicateCheck } from './composables/useOrderDuplicateCheck'
import { useColumnVisibility } from './composables/useColumnVisibility'
import { useOrderKeyboard } from './composables/useOrderKeyboard'
import { useOrderBatchBar } from './composables/useOrderBatchBar'
import { useOrderDataLoader } from './composables/useOrderDataLoader'
import { resolveImageUrl } from '@/utils/imageUrl'
import noImageSrc from '@/assets/images/no_image.png'

// --- i18n ---
const { t } = useI18n()

// --- Toast ---
const toast = useToast()

// --- Pinia Store ---
const draftStore = useShipmentOrderDraftStore()
const { allRows, heldRowIds } = storeToRefs(draftStore)

// --- ダイアログ状態 ---
const showCarrierImportDialog = ref(false)

// --- フィルター・表示 ---
const displayFilter = ref<'pending_confirm' | 'processing' | 'pending_waybill' | 'held'>('pending_confirm')

// --- マスターデータ・バックエンド注文読み込み ---
let _reapplyProductDefaults: () => void = () => {}
const dataLoader = useOrderDataLoader(toast, t, () => _reapplyProductDefaults())
const { orderSourceCompanies, products, carriers, pendingWaybillRows, isLoadingPendingWaybill, loadPendingWaybillOrders, loadAllMasterData } = dataLoader

// --- 循環依存を解消するための遅延参照 ---
let _isHeld: (id: string | number) => boolean = () => false
let _hasRowErrors: (row: UserOrderRow) => boolean = () => false

// --- テーブル composable ---
const bundle = useOrderBundle(
  allRows,
  computed(() => filteredRows.value),
  computed(() => displayRows.value),
  computed({ get: () => tableSelectedKeys.value, set: (v) => { tableSelectedKeys.value = v } }) as any,
  displayFilter,
  toast,
)
const {
  bundleFilterKeys,
  bundleModeEnabled,
  showBundleFilterDialog,
  bundleFilterFields,
  bundleFilterLabels,
  isBundleable,
  hasUnbundleableRows,
  selectedBundleGroupKeys,
  handleBundleMergeAllSelected,
  handleUnbundleSelected,
  handleOpenBundleList,
  handleExitBundleMode,
  handleBundleFilterSave,
  handleBundleFilterUpdate,
  restoreFromCookies: restoreBundleCookies,
} = bundle

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
  isOkinawa,
  isRemoteIsland,
  hasDeliverySpec,
} = table

// --- バッチアクションバー composable ---
const batchBar = useOrderBatchBar(
  {
    displayFilter,
    tableSelectedKeys,
    sortedRows,
    bundleModeEnabled,
    isSubmitting: computed(() => isSubmitting.value),
    backendErrorCount: computed(() => backendErrorCount.value),
    b2Validating: computed(() => b2Validating.value),
    isAutoValidating: computed(() => isAutoValidating.value),
    b2Exporting: computed(() => b2Exporting.value),
    canSendToB2Cloud: computed(() => canSendToB2Cloud.value),
  },
  {
    bundleMerge: () => handleBundleMergeAllSelected(),
    unbundle: () => handleUnbundleSelected(),
    shipPlanDate: () => { shipPlanDateDialogVisible.value = true },
    senderBulk: () => { senderBulkDialogVisible.value = true },
    carrierBulk: () => { carrierBulkDialogVisible.value = true },
    submit: () => handleSubmitClick(),
    clearSelected: () => handleBatchDeleteFromBar(),
    holdToggle: () => toggleHoldSelected(),
    showErrorDetail: () => { submitErrorDialogVisible.value = true },
    deletePending: () => handleDeletePending(),
    confirmPrintReady: () => handleConfirmPrintReady(),
    reloadPending: () => loadPendingWaybillOrders(),
    b2Export: () => handleB2Export(),
    carrierExport: () => handleCarrierExport(),
    clearBackendErrors: () => clearBackendErrors(),
    releaseHold: () => handleReleaseHold(),
    deleteHeld: () => handleDeleteHeld(),
    exportCsv: () => { /* handled internally by composable */ },
  },
  t,
)
const { batchActions, handleBatchAction, handleSelectAll, customExportDialogVisible, customExportOrders } = batchBar

// --- 列表示設定 composable ---
const {
  visibleColumns,
  toggleColumn,
  isColumnVisible,
  showAllColumns,
  showColumnSettingsDialog,
} = useColumnVisibility(displayColumns)

// --- フォーム composable ---
const form = useOrderForm(allRows, products, (row) => getRowErrorMessages(row), loadPendingWaybillOrders, toast)
const {
  showDialog,
  showImportDialog,
  editingRow,
  handleEdit,
  handleAdd,
  handleFormSubmit,
  handleImport,
  handleImportClick,
  reapplyProductDefaults,
} = form
_reapplyProductDefaults = reapplyProductDefaults

// --- B2 Cloud composable ---
const b2cloud = useOrderB2Cloud(
  pendingWaybillRows,
  carriers,
  tableSelectedKeys,
  sortedRows,
  loadPendingWaybillOrders,
  toast,
)
const {
  b2Validating,
  b2ValidateDialogVisible,
  b2ValidateResult,
  b2ValidateOrderMap,
  b2ApiErrorDialogVisible,
  b2ApiErrorMessage,
  b2ValidationErrors,
  isAutoValidating,
  getB2Errors,
  handleConfirmPrintReady,
  handleB2ValidateDialogCancel,
  handleB2ValidateDialogConfirm,
  autoValidateProcessingOrders,
  b2Exporting,
  b2ExportResultDialogVisible,
  b2ExportResult,
  canSendToB2Cloud,
  handleB2Export,
  handleB2ExportResultClose,
  cleanup: cleanupB2Cloud,
} = b2cloud

// --- Submit composable ---
const submit = useOrderSubmit(
  allRows,
  pendingWaybillRows,
  tableSelectedKeys,
  heldRowIds,
  baseColumns,
  displayFilter,
  (row) => hasFrontendRowErrors(row),
  (ids) => draftStore.setHeldIds(ids),
  () => draftStore.clearAll(),
  loadPendingWaybillOrders,
  autoValidateProcessingOrders,
  toast,
)
const {
  isSubmitting,
  submitErrorDialogVisible,
  backendErrorsByRowId,
  backendErrorCount,
  backendErrorList,
  clearBackendErrors,
  handleSubmitClick,
  handleReleaseHold,
} = submit

// --- バリデーション composable（tableのbaseColumnsを参照） ---
const validation = useOrderValidation(baseColumns, backendErrorsByRowId)
const { hasRowErrors, hasFrontendRowErrors, isCellError, getRowErrorMessages } = validation
_hasRowErrors = hasRowErrors

// --- 保留 composable ---
const hold = useOrderHold(
  allRows,
  pendingWaybillRows,
  tableSelectedKeys,
  (_rows, hIds) => { draftStore.setHeldIds(hIds) },
  loadPendingWaybillOrders,
  toast,
)
const { isHeld, pendingConfirmCount, totalHeldCount, processingNonHeldCount, pendingWaybillNonHeldCount, toggleHoldSelected } = hold
_isHeld = isHeld

// --- 一括操作 composable ---
const bulk = useOrderBulkActions(
  allRows,
  tableSelectedKeys,
  orderSourceCompanies,
  (_rows, hIds) => { draftStore.setHeldIds(hIds) },
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

// --- 削除 composable ---
const del = useOrderDelete(
  allRows,
  pendingWaybillRows,
  tableSelectedKeys,
  heldRowIds,
  (ids) => draftStore.setHeldIds(ids),
  sortedRows,
  loadPendingWaybillOrders,
  toast,
)
const {
  deleteDialogOpen,
  deleteDialogMessage,
  confirmDelete,
  handleBatchDeleteFromBar,
  handleDeletePending,
  handleDeleteHeld,
} = del

// --- 配送業者データ出力 composable ---
const carrierExp = useOrderCarrierExport(pendingWaybillRows, carriers, tableSelectedKeys, toast)
const {
  carrierExportDialogVisible,
  carrierExportCarrierLabel,
  carrierExportFileNameBase,
  carrierExportHeaders,
  carrierExportOutputRows,
  carrierExportMappingOptions,
  carrierExportSelectedMappingId,
  handleCarrierExport,
} = carrierExp

// --- 重複チェック composable ---
const { isDuplicate, isDuplicateLocal, isDuplicateBackend } = useOrderDuplicateCheck(allRows, pendingWaybillRows)


// --- フィルター変更時の処理 ---
watch(displayFilter, (val) => {
  tableSelectedKeys.value = []
  if (val === 'processing' || val === 'pending_waybill') {
    loadPendingWaybillOrders()
  }
})


// --- キーボードショートカット ---
useOrderKeyboard(tableSelectedKeys, sortedRows, {
  selectAll: handleSelectAll,
  deselectAll: () => { tableSelectedKeys.value = [] },
  deleteSelected: handleBatchDeleteFromBar,
  submitSelected: handleSubmitClick,
  exportCsv: () => { customExportDialogVisible.value = true },
})

// --- 初期化 ---
onMounted(() => {
  loadAllMasterData()
  restoreBundleCookies()
  draftStore.loadFromStorage()
})

onBeforeUnmount(() => {
  cleanupB2Cloud()
})
</script>

<style scoped>
@import '@/styles/order-table.css';

/* Root layout */
.o-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0 20px 20px;
}

:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
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
.o-status-tag--duplicate { background: #f59e0b; color: #fff; }
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
.o-filter-tab:hover { border-color: var(--o-brand-primary, #0052A3); color: var(--o-brand-primary, #0052A3); }
.o-filter-tab.active { background: var(--o-brand-primary, #0052A3); color: #fff; border-color: var(--o-brand-primary, #0052A3); }

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
.o-resize-handle:hover, .o-table--resizing .o-resize-handle { background: var(--o-brand-primary, #0052A3); }

/* Page-specific cell styles */
.o-table-td--error { background: #fff0f0; }
.o-cell-sub { font-size: 11px; color: var(--o-gray-500, #909399); }
.product-item__img--empty { background: var(--o-gray-100, #f5f5f5); }
.o-cool-tag { font-size: 11px; padding: 1px 5px; border-radius: 3px; display: inline-block; }
.customer-mgmt-link { color: var(--o-brand-primary, #0052A3); text-decoration: none; font-weight: 500; }
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
  color: var(--o-brand-primary, #0052A3);
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
  border-color: var(--o-brand-primary, #0052A3);
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
  accent-color: var(--o-brand-primary, #0052A3);
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

/* Delete confirm dialog */
.delete-confirm { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0.75rem; padding: 0.5rem 0; }
.delete-confirm__icon { line-height: 0; }
.delete-confirm__message { font-size: 14px; font-weight: 500; color: var(--o-gray-900, #212529); margin: 0; }
.delete-confirm__hint { font-size: 12px; color: var(--o-gray-500, #909399); margin: 0; }

.error-list { display: flex; flex-direction: column; gap: 0.5rem; }
.error-list__meta { font-size: var(--o-font-size-small, 13px); color: var(--o-gray-600, #606266); margin-bottom: 0.5rem; }
.error-list__items { max-height: 300px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem; }
.error-list__item { padding: 0.5rem 0.75rem; border: 1px solid var(--o-danger-border, #f5c6cb); border-radius: 4px; background: var(--o-danger-light, #fdf0f1); }
.error-list__item-title { font-size: var(--o-font-size-small, 13px); font-weight: 500; color: var(--o-gray-800, #343a40); margin-bottom: 2px; }
.error-list__item-msg { font-size: 12px; color: var(--o-danger, #dc3545); }

/* Column visibility settings */
.column-settings { display: flex; flex-direction: column; gap: 12px; }
.column-settings__actions { display: flex; justify-content: flex-end; }
.column-settings__list { display: flex; flex-direction: column; gap: 6px; max-height: 400px; overflow-y: auto; }
.column-settings__item { display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer; padding: 4px 0; }
.column-settings__item input { accent-color: var(--o-brand-primary, #0052A3); }
</style>
