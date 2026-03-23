/**
 * 出荷指示作成画面 — 列定義・列表示・ソート・リサイズ集約コンポーザブル
 * 出货指示创建画面 — 列定义/列显示/排序/列宽调整聚合composable
 *
 * useOrderTable と useColumnVisibility を統合し、列関連の API を一つにまとめる。
 * 将 useOrderTable 和 useColumnVisibility 整合，统一列相关的 API。
 */
import type { Ref } from 'vue'
import type { UserOrderRow } from '@/types/orderRow'
import type { Carrier } from '@/types/carrier'
import { useOrderTable } from '../composables/useOrderTable'
import { useColumnVisibility } from '../composables/useColumnVisibility'

/** 依存パラメータ型定義 / 依赖参数类型定义 */
export interface ShipmentCreateColumnsDeps {
  allRows: Ref<UserOrderRow[]>
  pendingWaybillRows: Ref<UserOrderRow[]>
  carriers: Ref<Carrier[]>
  bundleModeEnabled: Ref<boolean>
  bundleFilterKeys: Ref<string[]>
  displayFilter: Ref<'pending_confirm' | 'processing' | 'pending_waybill' | 'held'>
  /** 遅延評価コールバック：循環依存回避 / 延迟求值回调：避免循环依赖 */
  isHeld: (id: string | number) => boolean
  /** 遅延評価コールバック：循環依存回避 / 延迟求值回调：避免循环依赖 */
  hasRowErrors: (row: UserOrderRow) => boolean
}

export function useShipmentCreateColumns(deps: ShipmentCreateColumnsDeps) {
  // ========================================
  // テーブルコア（列定義・ソート・ページネーション・選択・セル表示）
  // 表格核心（列定义/排序/分页/选择/单元格显示）
  // ========================================
  const table = useOrderTable(
    deps.allRows,
    deps.pendingWaybillRows,
    deps.carriers,
    deps.bundleModeEnabled,
    deps.bundleFilterKeys,
    deps.displayFilter,
    (id) => deps.isHeld(id),
    (row) => deps.hasRowErrors(row),
  )

  // ========================================
  // 列表示設定（表示/非表示切替、localStorage 永続化）
  // 列显示设置（显示/隐藏切换、localStorage 持久化）
  // ========================================
  const colVis = useColumnVisibility(table.displayColumns)

  return {
    // --- 列定義 / 列定义 ---
    carrierOptions: table.carrierOptions,
    baseColumns: table.baseColumns,
    formColumns: table.formColumns,
    displayColumns: table.displayColumns,

    // --- 列表示設定 / 列显示设置 ---
    visibleColumns: colVis.visibleColumns,
    toggleColumn: colVis.toggleColumn,
    isColumnVisible: colVis.isColumnVisible,
    showAllColumns: colVis.showAllColumns,
    showColumnSettingsDialog: colVis.showColumnSettingsDialog,

    // --- リサイズ / 列宽调整 ---
    resizingCol: table.resizingCol,
    getColWidth: table.getColWidth,
    onResizeStart: table.onResizeStart,

    // --- ソート / 排序 ---
    sortKey: table.sortKey,
    sortOrder: table.sortOrder,
    handleSortClick: table.handleSortClick,

    // --- 検索 / 搜索 ---
    globalSearchText: table.globalSearchText,

    // --- フィルタ済みデータ / 过滤后数据 ---
    filteredRows: table.filteredRows,
    displayRows: table.displayRows,
    sortedRows: table.sortedRows,

    // --- ページネーション / 分页 ---
    currentPage: table.currentPage,
    pageSize: table.pageSize,
    totalPages: table.totalPages,
    paginatedRows: table.paginatedRows,

    // --- 選択 / 选择 ---
    tableSelectedKeys: table.tableSelectedKeys,
    isAllCurrentPageSelected: table.isAllCurrentPageSelected,
    isSomeCurrentPageSelected: table.isSomeCurrentPageSelected,
    toggleSelectAll: table.toggleSelectAll,
    toggleRowSelection: table.toggleRowSelection,

    // --- セル表示ヘルパー / 单元格显示辅助函数 ---
    getCellValue: table.getCellValue,
    getCarrierLabel: table.getCarrierLabel,
    getInvoiceTypeLabel: table.getInvoiceTypeLabel,
    getTimeSlotLabel: table.getTimeSlotLabel,
    fmtDateTime: table.fmtDateTime,
    fmtPostal: table.fmtPostal,
    getCoolTypeInfo: table.getCoolTypeInfo,
    isOkinawa: table.isOkinawa,
    isRemoteIsland: table.isRemoteIsland,
    hasDeliverySpec: table.hasDeliverySpec,
  }
}
