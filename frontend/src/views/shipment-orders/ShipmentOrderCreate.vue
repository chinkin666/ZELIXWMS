<template>
  <div class="o-view">
    <!-- PageHeader Header -->
    <PageHeader
      :title="t('wms.shipmentOrder.createTitle', '出荷指示作成')"
      :show-search="false"
    >
      <template #center>
        <Input
          class="o-cp-search-input"
          v-model="globalSearchText"
          :placeholder="t('wms.common.search', '検索') + '...'"
        />
      </template>
      <template #actions>
        <Button variant="secondary" size="sm" @click="showColumnSettingsDialog = true" :title="t('wms.shipmentOrder.columnSettings', '列表示設定')">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
            <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.421 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z"/>
          </svg>
        </Button>
        <template v-if="displayFilter === 'pending_confirm'">
        <Button
          v-if="!bundleModeEnabled"
          variant="secondary"
          @click="handleOpenBundleList"
        >
          {{ t('wms.shipmentOrder.bundleCandidateList', '同捆候補一覧') }}
        </Button>
        <Button
          v-else
          variant="secondary"
          @click="handleExitBundleMode"
        >
          {{ t('wms.shipmentOrder.exitBundleMode', '同梱モード終了') }}
        </Button>
        </template>
        <template v-if="displayFilter === 'pending_confirm'">
          <Button variant="default" @click="handleImportClick">
            {{ t('wms.shipmentOrder.bulkRegister', '一括登録') }}
          </Button>
          <Button variant="default" @click="handleAdd">
            {{ t('wms.shipmentOrder.individualRegister', '個別登録') }}
          </Button>
        </template>
        <template v-if="displayFilter === 'pending_waybill'">
          <Button variant="default" @click="showCarrierImportDialog = true">
            {{ t('wms.shipmentOrder.importWaybillData', '送り状データ取込') }}
          </Button>
        </template>
      </template>
    </PageHeader>

    <div class="o-content">
      <!-- Filter Tabs -->
      <div class="o-filter-tabs">
        <Button class="o-filter-tab" :class="{ active: displayFilter === 'pending_confirm' }" @click="displayFilter = 'pending_confirm'">
          {{ t('wms.shipmentOrder.pendingConfirm', '出荷確認待ち') }} <span class="o-tab-count">{{ pendingConfirmCount }}</span>
        </Button>
        <Button class="o-filter-tab" :class="{ active: displayFilter === 'processing' }" @click="displayFilter = 'processing'">
          {{ t('wms.shipmentOrder.processing', '処理中') }} <span class="o-tab-count">{{ processingNonHeldCount }}</span>
        </Button>
        <Button class="o-filter-tab" :class="{ active: displayFilter === 'pending_waybill' }" @click="displayFilter = 'pending_waybill'">
          {{ t('wms.shipmentOrder.pendingWaybill', '送り状未発行') }} <span class="o-tab-count">{{ pendingWaybillNonHeldCount }}</span>
        </Button>
        <Button class="o-filter-tab" :class="{ active: displayFilter === 'held' }" @click="displayFilter = 'held'">
          {{ t('wms.shipmentOrder.held', '保留') }} <span class="o-tab-count">{{ totalHeldCount }}</span>
        </Button>
      </div>

      <!-- Backend error alert -->
      <div
        v-if="backendErrorCount > 0"
        class="o-alert o-alert-error"
      >
        <span>{{ t('wms.shipmentOrder.serverErrorAlert', 'サーバー側でエラーが発生しました。エラー行のみ表示に切り替えています。') }}</span>
        <Button class="o-alert-close" @click="clearBackendErrors">&times;</Button>
      </div>

      <!-- Bundle mode bar -->
      <div v-if="bundleModeEnabled" class="bundle-mode-section">
        <div class="bundle-mode-bar" @click="showBundleFilterDialog = true">
          <span class="bundle-mode-bar__title">{{ t('wms.shipmentOrder.filterConditions', '絞り込み条件') }}：</span>
          <span class="bundle-mode-bar__labels">{{ bundleFilterLabels || t('wms.shipmentOrder.notSet', '未設定') }}</span>
        </div>
        <div class="bundle-mode-actions">
          <Button
            variant="default"
            size="sm"
            :disabled="tableSelectedKeys.length === 0 || selectedBundleGroupKeys.length === 0"
            @click="handleBundleMergeAllSelected"
          >
            {{ t('wms.shipmentOrder.bundle', '同梱する') }}
          </Button>
          <Button
            variant="warning"
            size="sm"
            :disabled="!hasUnbundleableRows"
            @click="handleUnbundleSelected"
          >
            {{ t('wms.shipmentOrder.unbundle', '同梱を解除する') }}
          </Button>
        </div>
      </div>

      <!-- Plain table -->
      <div class="rounded-md border overflow-auto">
        <!-- Selection toolbar -->
        <div v-if="tableSelectedKeys.length > 0" class="flex items-center gap-2 px-4 py-2 bg-muted/50 border-b">
          <span class="text-sm text-muted-foreground">{{ tableSelectedKeys.length }}{{ t('wms.shipmentOrder.itemsSelected', '件選択中') }}</span>
        </div>
        <Table :class="{ 'resizing': resizingCol }">
          <TableHeader>
            <TableRow>
              <TableHead style="width:40px;">
                <Checkbox
                  :model-value="isAllCurrentPageSelected"
                  @update:model-value="toggleSelectAll"
                />
              </TableHead>
              <TableHead style="width:90px;">{{ t('wms.common.status', '状態') }}</TableHead>
              <TableHead style="width:220px;">{{ t('wms.shipmentOrder.shipmentNumber', '出荷管理番号') }}</TableHead>
              <TableHead style="width:200px;">{{ t('wms.shipmentOrder.deliveryInfo', '配送情報') }}</TableHead>
              <TableHead style="width:180px;">{{ t('wms.shipmentOrder.deliverySpec', '配送指定') }}</TableHead>
              <TableHead
                v-for="col in visibleColumns"
                :key="col.key"
                class="relative"
                :class="{ 'cursor-pointer': !bundleModeEnabled }"
                :style="{ width: getColWidth(col) }"
                @click="handleSortClick(col)"
              >
                {{ col.title }}
                <span v-if="sortKey === (col.dataKey || col.key) && !bundleModeEnabled" class="ml-1 text-xs">
                  {{ sortOrder === 'asc' ? '▲' : '▼' }}
                </span>
                <span
                  class="o-resize-handle"
                  @mousedown="onResizeStart($event, col)"
                  @click.stop
                />
              </TableHead>
              <TableHead style="width:170px;">{{ t('wms.shipmentOrder.history', '履歴') }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="isLoadingPendingWaybill && displayFilter !== 'pending_confirm'">
              <TableCell :colspan="visibleColumns.length + 6">
                <div class="space-y-3 p-4">
                  <Skeleton class="h-4 w-[250px] mx-auto" />
                  <Skeleton class="h-10 w-full" />
                  <Skeleton class="h-10 w-full" />
                  <Skeleton class="h-10 w-full" />
                </div>
              </TableCell>
            </TableRow>
            <TableRow v-else-if="paginatedRows.length === 0">
              <TableCell :colspan="visibleColumns.length + 6" class="text-center py-8 text-muted-foreground">{{ t('wms.ui.noData', 'データがありません') }}</TableCell>
            </TableRow>
            <template
              v-for="row in paginatedRows"
              :key="row.id"
            >
            <TableRow
              :data-state="tableSelectedKeys.includes(row.id) ? 'selected' : undefined"
              :class="{ 'bg-red-50': b2ValidationErrors.has(String(row._id || row.id)) || getRowErrorMessages(row).length > 0 }"
            >
              <TableCell>
                <Checkbox
                  :model-value="tableSelectedKeys.includes(row.id)"
                  @update:model-value="toggleRowSelection(row)"
                />
              </TableCell>
              <TableCell>
                <div class="status-cell">
                  <Badge v-if="displayFilter === 'pending_waybill'" variant="secondary" >{{ t('wms.shipmentOrder.pendingWaybill', '送り状未発行') }}</Badge>
                  <Badge v-else-if="b2ValidationErrors.has(String(row._id || row.id))" variant="secondary"  :title="getB2Errors(row).join('\n')">{{ t('wms.shipmentOrder.error', 'エラー') }}</Badge>
                  <Badge v-else-if="displayFilter === 'pending_confirm' && hasRowErrors(row)" variant="secondary" >{{ t('wms.shipmentOrder.error', 'エラー') }}</Badge>
                  <Badge v-else-if="row.statusHeld" class="bg-yellow-100 text-yellow-800">{{ t('wms.shipmentOrder.held', '保留') }}</Badge>
                  <Badge v-else-if="displayFilter === 'processing' && isAutoValidating" variant="secondary" >{{ t('wms.shipmentOrder.validating', '検証中...') }}</Badge>
                  <Badge v-if="isBundleable(row)" variant="secondary" >{{ t('wms.shipmentOrder.bundleable', '同捆可能') }}</Badge>
                  <Badge v-if="hasDeliverySpec(row)" variant="secondary" >{{ t('wms.shipmentOrder.deliverySpec', '配送指定') }}</Badge>
                  <Badge v-if="isOkinawa(row)" variant="secondary" >{{ t('wms.shipmentOrder.okinawaDelivery', '沖縄配送') }}</Badge>
                  <Badge v-if="isRemoteIsland(row)" variant="secondary" >{{ t('wms.shipmentOrder.remoteIslandDelivery', '離島配送') }}</Badge>
                  <Badge v-if="isDuplicate(row.id)" variant="secondary"  :title="isDuplicateBackend(row.id) ? t('wms.shipmentOrder.duplicateExisting', '既存注文と重複') : t('wms.shipmentOrder.duplicateInput', '入力データ内で重複')">{{ t('wms.shipmentOrder.duplicate', '重複') }}</Badge>
                </div>
              </TableCell>
              <!-- 出荷管理番号（3行表示） -->
              <TableCell>
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
              </TableCell>
              <!-- 配送情報（3行表示） -->
              <TableCell>
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
              </TableCell>
              <!-- 配送日時（3行表示） -->
              <TableCell>
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
              </TableCell>
              <TableCell
                v-for="col in visibleColumns"
                :key="col.key"
                :class="{ 'bg-red-50': isCellError(row, col) }"
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
              </TableCell>
              <!-- 履歴（3行表示） -->
              <TableCell>
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
              </TableCell>
            </TableRow>
            <TableRow v-if="b2ValidationErrors.has(String(row._id || row.id)) || getRowErrorMessages(row).length > 0" class="p-0 border-t-0">
              <TableCell :colspan="visibleColumns.length + 6" class="p-0">
                <div class="error-bar">
                  <span v-for="(err, ei) in [...getRowErrorMessages(row), ...getB2Errors(row)]" :key="ei">{{ err }}</span>
                </div>
              </TableCell>
            </TableRow>
            </template>
          </TableBody>
        </Table>
      </div>

      <!-- Pagination -->
      <div class="o-table-pagination">
        <span class="o-table-pagination__info">{{ sortedRows.length }} {{ t('wms.shipmentOrder.items', '件') }}</span>
        <div class="o-table-pagination__controls">
          <select class="h-8 text-sm" v-model.number="pageSize" style="width:80px;">
            <option :value="10">10</option>
            <option :value="25">25</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
            <option :value="500">500</option>
          </select>
          <Button variant="secondary" size="sm" :disabled="currentPage <= 1" @click="currentPage--">&lsaquo;</Button>
          <span class="o-table-pagination__page">{{ currentPage }} / {{ totalPages }}</span>
          <Button variant="secondary" size="sm" :disabled="currentPage >= totalPages" @click="currentPage++">&rsaquo;</Button>
        </div>
      </div>
    </div>

    <!-- Bottom bar -->
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
    <Dialog :open="showColumnSettingsDialog" @update:open="(v) => { if (!v) showColumnSettingsDialog = false }">
      <DialogContent class="sm:max-w-[400px]">
        <DialogHeader><DialogTitle>{{ t('wms.shipmentOrder.columnSettings', '列表示設定') }}</DialogTitle></DialogHeader>
      <div class="column-settings">
        <div class="column-settings__actions">
          <Button variant="secondary" size="sm" @click="showAllColumns">{{ t('wms.shipmentOrder.showAll', 'すべて表示') }}</Button>
        </div>
        <div class="column-settings__list">
          <label v-for="col in displayColumns" :key="col.key" class="column-settings__item">
            <Input
              type="checkbox"
              :checked="isColumnVisible(String(col.dataKey || col.key))"
              @change="toggleColumn(String(col.dataKey || col.key))"
            />
            <span>{{ col.title }}</span>
          </label>
        </div>
      </div>
      <DialogFooter>
        <Button variant="secondary" @click="showColumnSettingsDialog = false">{{ t('wms.shipmentOrder.close', '閉じる') }}</Button>
      </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- エラー詳細ダイアログ -->
    <Dialog :open="submitErrorDialogVisible" @update:open="(v) => { if (!v) submitErrorDialogVisible = false }">
      <DialogContent class="sm:max-w-[560px]">
        <DialogHeader><DialogTitle>{{ t('wms.shipmentOrder.errorDetail', 'エラー詳細') }}</DialogTitle></DialogHeader>
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
      <DialogFooter>
        <div style="display:flex; justify-content:flex-end; gap:10px;">
          <Button variant="secondary" @click="submitErrorDialogVisible = false">{{ t('wms.shipmentOrder.close', '閉じる') }}</Button>
        </div>
      </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- ご依頼主情報の一括設定 / 发件人批量设置 -->
    <BulkSettingDialog
      :open="senderBulkDialogVisible"
      :title="t('wms.shipmentOrder.senderBulkSetting', 'ご依頼主情報の一括設定')"
      :selected-count="tableSelectedKeys.length"
      :apply-label="t('wms.shipmentOrder.apply', '適用')"
      @close="senderBulkDialogVisible = false"
      @apply="applySenderBulkCompany"
    >
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
    </BulkSettingDialog>

    <!-- 配送業者一括設定 / 配送业者批量设置 -->
    <BulkSettingDialog
      :open="carrierBulkDialogVisible"
      :title="t('wms.shipmentOrder.carrierBulkSetting', '配送業者一括設定')"
      :selected-count="tableSelectedKeys.length"
      :apply-label="t('wms.shipmentOrder.apply', '適用')"
      @close="carrierBulkDialogVisible = false"
      @apply="applyCarrierBulk"
    >
      <div class="bulk-dialog__field">
        <label class="bulk-dialog__label">{{ t('wms.shipmentOrder.carrierLabel', '配送業者') }}</label>
        <select class="bulk-dialog__select" v-model="carrierBulkId">
          <option value="">{{ t('wms.shipmentOrder.selectCarrier', '配送業者を選択してください') }}</option>
          <option v-for="opt in carrierOptions" :key="String(opt.value)" :value="opt.value">{{ opt.label }}</option>
        </select>
      </div>
    </BulkSettingDialog>

    <!-- 出荷予定日一括設定 / 出货预定日批量设置 -->
    <BulkSettingDialog
      :open="shipPlanDateDialogVisible"
      :title="t('wms.shipmentOrder.shipPlanDateBulkSetting', '出荷予定日一括設定')"
      :selected-count="tableSelectedKeys.length"
      :apply-label="t('wms.shipmentOrder.apply', '適用')"
      @close="shipPlanDateDialogVisible = false"
      @apply="applyShipPlanDateToSelected"
    >
      <div class="bulk-dialog__field">
        <label class="bulk-dialog__label">{{ t('wms.shipmentOrder.shipPlanDate', '出荷予定日') }}</label>
        <Input type="date" class="bulk-dialog__input" v-model="shipPlanDateSelected" :min="todayDate" />
      </div>
    </BulkSettingDialog>

    <!-- 削除確認ダイアログ -->
    <Dialog :open="deleteDialogOpen" @update:open="(v) => { if (!v) deleteDialogOpen = false }">
      <DialogContent class="sm:max-w-[400px]">
        <DialogHeader><DialogTitle>{{ t('wms.shipmentOrder.deleteConfirmation', '削除確認') }}</DialogTitle></DialogHeader>
      <div class="delete-confirm">
        <div class="delete-confirm__icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#dc3545" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <p class="delete-confirm__message">{{ deleteDialogMessage }}</p>
        <p class="delete-confirm__hint">{{ t('wms.shipmentOrder.cannotUndo', 'この操作は元に戻せません。') }}</p>
      </div>
      <DialogFooter>
        <Button variant="secondary" @click="deleteDialogOpen = false">{{ t('wms.common.cancel', 'キャンセル') }}</Button>
        <Button variant="destructive" @click="confirmDelete">{{ t('wms.shipmentOrder.confirmDelete', '削除する') }}</Button>
      </DialogFooter>
      </DialogContent>
    </Dialog>

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { storeToRefs } from 'pinia'
import ShipmentOrderEditDialog from '@/components/form/ShipmentOrderEditDialog.vue'
import CarrierImportDialog from '@/components/import/CarrierImportDialog.vue'
import ShipmentOrderImportDialog from '@/components/import/ShipmentOrderImportDialog.vue'
import BundleFilterDialog from '@/components/bundle/BundleFilterDialog.vue'
import BulkSettingDialog from '@/components/dialogs/BulkSettingDialog.vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import PageHeader from '@/components/shared/PageHeader.vue'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
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
import { useOrderForm } from './composables/useOrderForm'
import { useOrderSubmit } from './composables/useOrderSubmit'
import { useOrderB2Cloud } from './composables/useOrderB2Cloud'
import { useOrderCarrierExport } from './composables/useOrderCarrierExport'
import { useOrderDuplicateCheck } from './composables/useOrderDuplicateCheck'
import { useOrderKeyboard } from './composables/useOrderKeyboard'
import { useOrderDataLoader } from './composables/useOrderDataLoader'
import { useShipmentCreateColumns } from './create/useShipmentCreateColumns'
import { useShipmentCreateBatchActions } from './create/useShipmentCreateBatchActions'
import { resolveImageUrl } from '@/utils/imageUrl'
import noImageSrc from '@/assets/images/no_image.png'
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { Badge } from '@/components/ui/badge'
// --- i18n / 国际化 ---
const { t } = useI18n()

// --- Toast / 提示 ---
const toast = useToast()

// --- Pinia Store ---
const draftStore = useShipmentOrderDraftStore()
const { allRows, heldRowIds } = storeToRefs(draftStore)

// --- ダイアログ状態 / 对话框状态 ---
const showCarrierImportDialog = ref(false)

// --- フィルター・表示 / 过滤・显示 ---
const displayFilter = ref<'pending_confirm' | 'processing' | 'pending_waybill' | 'held'>('pending_confirm')

// --- マスターデータ・バックエンド注文読み込み / 主数据・后端订单加载 ---
let _reapplyProductDefaults: () => void = () => {}
const dataLoader = useOrderDataLoader(toast, t, () => _reapplyProductDefaults())
const { orderSourceCompanies, products, carriers, pendingWaybillRows, isLoadingPendingWaybill, loadPendingWaybillOrders, loadAllMasterData } = dataLoader

// --- 循環依存を解消するための遅延参照 / 延迟引用以解决循环依赖 ---
let _isHeld: (id: string | number) => boolean = () => false
let _hasRowErrors: (row: UserOrderRow) => boolean = () => false
const _bundleModeEnabled = ref(false)
const _bundleFilterKeys = ref<string[]>([])

// ========================================
// 列定義・表示・ソート・リサイズ（集約composable）
// 列定义/显示/排序/列宽调整（聚合composable）
// ========================================
const columns = useShipmentCreateColumns({
  allRows,
  pendingWaybillRows,
  carriers,
  // bundleModeEnabled は batchActions 初期化後に設定（遅延参照）
  // bundleModeEnabled 在 batchActions 初始化后设置（延迟引用）
  bundleModeEnabled: computed(() => _bundleModeEnabled.value),
  bundleFilterKeys: computed(() => _bundleFilterKeys.value),
  displayFilter,
  isHeld: (id) => _isHeld(id),
  hasRowErrors: (row) => _hasRowErrors(row),
})
const {
  carrierOptions, baseColumns, formColumns, displayColumns,
  visibleColumns, toggleColumn, isColumnVisible, showAllColumns, showColumnSettingsDialog,
  resizingCol, getColWidth, onResizeStart,
  sortKey, sortOrder, handleSortClick,
  globalSearchText,
  filteredRows, displayRows, sortedRows,
  currentPage, pageSize, totalPages, paginatedRows,
  tableSelectedKeys, isAllCurrentPageSelected, isSomeCurrentPageSelected, toggleSelectAll, toggleRowSelection,
  getCellValue, getCarrierLabel, getInvoiceTypeLabel, getTimeSlotLabel, fmtDateTime, fmtPostal, getCoolTypeInfo,
  isOkinawa, isRemoteIsland, hasDeliverySpec,
} = columns

// --- B2 Cloud composable ---
const b2cloud = useOrderB2Cloud(
  pendingWaybillRows, carriers, tableSelectedKeys, sortedRows,
  loadPendingWaybillOrders, toast,
)
const {
  b2Validating, b2ValidateDialogVisible, b2ValidateResult, b2ValidateOrderMap,
  b2ApiErrorDialogVisible, b2ApiErrorMessage, b2ValidationErrors, isAutoValidating,
  getB2Errors, handleConfirmPrintReady, handleB2ValidateDialogCancel, handleB2ValidateDialogConfirm,
  autoValidateProcessingOrders,
  b2Exporting, b2ExportResultDialogVisible, b2ExportResult, canSendToB2Cloud,
  handleB2Export, handleB2ExportResultClose,
  cleanup: cleanupB2Cloud,
} = b2cloud

// --- Submit composable / 提交composable ---
const submit = useOrderSubmit(
  allRows, pendingWaybillRows, tableSelectedKeys, heldRowIds,
  baseColumns, displayFilter,
  (row) => hasFrontendRowErrors(row),
  (ids) => draftStore.setHeldIds(ids),
  () => draftStore.clearAll(),
  loadPendingWaybillOrders, autoValidateProcessingOrders, toast,
)
const {
  isSubmitting, submitErrorDialogVisible,
  backendErrorsByRowId, backendErrorCount, backendErrorList,
  clearBackendErrors, handleSubmitClick, handleReleaseHold,
} = submit

// --- バリデーション composable / 验证composable ---
const validation = useOrderValidation(baseColumns, backendErrorsByRowId)
const { hasRowErrors, hasFrontendRowErrors, isCellError, getRowErrorMessages } = validation
_hasRowErrors = hasRowErrors

// --- 配送業者データ出力 composable / 配送数据导出composable ---
const carrierExp = useOrderCarrierExport(pendingWaybillRows, carriers, tableSelectedKeys, toast)
const {
  carrierExportDialogVisible, carrierExportCarrierLabel, carrierExportFileNameBase,
  carrierExportHeaders, carrierExportOutputRows,
  carrierExportMappingOptions, carrierExportSelectedMappingId,
} = carrierExp

// ========================================
// バッチアクション（同梱・一括設定・保留・削除・バッチバー 集約composable）
// 批量操作（同捆/批量设置/保留/删除/批量工具栏 聚合composable）
// ========================================
const batch = useShipmentCreateBatchActions(
  {
    allRows, heldRowIds, tableSelectedKeys, sortedRows, filteredRows, displayRows,
    pendingWaybillRows, orderSourceCompanies, displayFilter,
    isSubmitting, backendErrorCount, b2Validating, isAutoValidating, b2Exporting, canSendToB2Cloud,
    submitErrorDialogVisible,
    saveHeldIds: (ids) => draftStore.setHeldIds(ids),
    saveStorage: (_rows, hIds) => { draftStore.setHeldIds(hIds) },
    loadPendingWaybillOrders,
    handleSubmitClick, handleConfirmPrintReady, handleB2Export,
    handleCarrierExport: carrierExp.handleCarrierExport,
    clearBackendErrors, handleReleaseHold,
  },
  toast, t,
)
const {
  // 同梱 / 同捆
  bundleFilterKeys, bundleModeEnabled, showBundleFilterDialog,
  bundleFilterFields, bundleFilterLabels,
  isBundleable, hasUnbundleableRows, selectedBundleGroupKeys,
  handleBundleMergeAllSelected, handleUnbundleSelected,
  handleOpenBundleList, handleExitBundleMode, handleBundleFilterSave, handleBundleFilterUpdate,
  restoreBundleCookies,
  // 一括設定 / 批量设置
  senderBulkDialogVisible, senderBulkCompanyId, senderBulkOverwriteBaseNo,
  carrierBulkDialogVisible, carrierBulkId,
  shipPlanDateDialogVisible, shipPlanDateSelected, todayDate,
  applyShipPlanDateToSelected, applySenderBulkCompany, applyCarrierBulk,
  // 保留 / 保留
  isHeld, pendingConfirmCount, totalHeldCount, processingNonHeldCount, pendingWaybillNonHeldCount,
  // 削除 / 删除
  deleteDialogOpen, deleteDialogMessage, confirmDelete, handleBatchDeleteFromBar,
  // バッチアクションバー / 批量操作工具栏
  batchActions, handleBatchAction, handleSelectAll,
  customExportDialogVisible, customExportOrders,
} = batch
_isHeld = isHeld
// 遅延参照を実値に接続 / 将延迟引用连接到实际值
watch(bundleModeEnabled, (v) => { _bundleModeEnabled.value = v }, { immediate: true })
watch(bundleFilterKeys, (v) => { _bundleFilterKeys.value = v }, { immediate: true })

// --- フォーム composable / 表单composable ---
const form = useOrderForm(allRows, products, (row) => getRowErrorMessages(row), loadPendingWaybillOrders, toast)
const {
  showDialog, showImportDialog, editingRow,
  handleEdit, handleAdd, handleFormSubmit, handleImport, handleImportClick,
  reapplyProductDefaults,
} = form
_reapplyProductDefaults = reapplyProductDefaults

// --- 重複チェック composable / 重复检查composable ---
const { isDuplicate, isDuplicateBackend } = useOrderDuplicateCheck(allRows, pendingWaybillRows)

// --- フィルター変更時の処理 / 过滤切换时的处理 ---
watch(displayFilter, (val) => {
  tableSelectedKeys.value = []
  if (val === 'processing' || val === 'pending_waybill') {
    loadPendingWaybillOrders()
  }
})

// --- キーボードショートカット / 键盘快捷键 ---
useOrderKeyboard(tableSelectedKeys, sortedRows, {
  selectAll: handleSelectAll,
  deselectAll: () => { tableSelectedKeys.value = [] },
  deleteSelected: handleBatchDeleteFromBar,
  submitSelected: handleSubmitClick,
  exportCsv: () => { customExportDialogVisible.value = true },
})

// --- 初期化 / 初始化 ---
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

/* PageHeader search input */
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
