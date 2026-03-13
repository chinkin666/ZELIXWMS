import type { WmsColumnDef } from '@/core/datatable'
import StatusCell from './components/cells/StatusCell.vue'
import ManagementNumberCell from './components/cells/ManagementNumberCell.vue'
import DeliveryInfoCell from './components/cells/DeliveryInfoCell.vue'
import DeliverySpecCell from './components/cells/DeliverySpecCell.vue'
import RecipientCell from './components/cells/RecipientCell.vue'
import ProductsCell from './components/cells/ProductsCell.vue'
import SenderCell from './components/cells/SenderCell.vue'

export interface ShipmentColumnDeps {
  activeTab: () => string
  hasFrontendRowErrors: (row: any) => boolean
  b2ValidationErrors: () => Map<string, string[]>
  isHeld: (row: any) => boolean
  hasDeliverySpec: (row: any) => boolean
  isOkinawa: (row: any) => boolean
  isRemoteIsland: (row: any) => boolean
  getCarrierLabel: (row: any) => string
  getInvoiceTypeLabel: (row: any) => string
  getCoolTypeLabel: (row: any) => string
  getCoolTypeColor: (row: any) => string
  getTimeSlotLabel: (slot?: string) => string
  onEditRow: (row: any) => void
}

/**
 * 出荷指示テーブルの列定義を生成
 * 依存関数を注入することで、列定義が純粋なConfigとして機能する
 */
export function createShipmentColumns(deps: ShipmentColumnDeps): WmsColumnDef[] {
  return [
    {
      key: 'status',
      title: '状態',
      width: 120,
      fixed: 'left',
      component: StatusCell,
      props: (row) => ({
        row,
        activeTab: deps.activeTab(),
        hasFrontendErrors: deps.hasFrontendRowErrors(row),
        isB2ValidationError: deps.b2ValidationErrors().has(String(row._id || row.id)),
        held: deps.isHeld(row),
        deliverySpec: deps.hasDeliverySpec(row),
        okinawa: deps.isOkinawa(row),
        remoteIsland: deps.isRemoteIsland(row),
      }),
    },
    {
      key: 'managementNumber',
      title: '出荷管理番号',
      width: 220,
      fixed: 'left',
      component: ManagementNumberCell,
      props: (row) => ({ row }),
      events: (row) => ({
        edit: () => deps.onEditRow(row),
      }),
    },
    {
      key: 'deliveryInfo',
      title: '配送情報',
      width: 200,
      component: DeliveryInfoCell,
      props: (row) => ({
        carrierLabel: deps.getCarrierLabel(row),
        invoiceTypeLabel: deps.getInvoiceTypeLabel(row),
        coolTypeLabel: deps.getCoolTypeLabel(row),
        coolTypeColor: deps.getCoolTypeColor(row),
      }),
    },
    {
      key: 'deliverySpec',
      title: '配送指定',
      width: 160,
      component: DeliverySpecCell,
      props: (row) => ({
        row,
        timeSlotLabel: deps.getTimeSlotLabel(row.deliveryTimeSlot),
      }),
    },
    {
      key: 'recipient',
      title: 'お届け先',
      minWidth: 240,
      component: RecipientCell,
    },
    {
      key: 'products',
      title: '商品',
      minWidth: 200,
      component: ProductsCell,
    },
    {
      key: 'sender',
      title: 'ご依頼主',
      width: 200,
      component: SenderCell,
    },
    {
      key: 'internalRecord',
      title: '備考',
      minWidth: 150,
      prop: 'internalRecord',
    },
  ]
}
