import type { OrderDocument } from '@/types/order'
import type { Carrier } from '@/types/carrier'
import type { Product } from '@/types/product'
import { mergeBarcodesWithSku } from '@/utils/barcode'

export interface FormatterContext {
  carriers: Carrier[]
  products: Product[]
}

const invoiceTypeMap: Record<string, string> = {
  '0': '発払い宅急便',
  '8': '宅急便コンパクト',
  'A': 'メール便',
}

const coolTypeMap: Record<string, string> = {
  '0': '通常',
  '1': 'クール冷凍',
  '2': 'クール冷蔵',
}

/**
 * 出荷明細リスト用のデータをフォーマット
 * 各注文の詳細情報を出力
 */
export function formatShipmentDetailData(
  orders: OrderDocument[],
  context: FormatterContext,
): Record<string, any>[] {
  const carrierMap = new Map(context.carriers.map((c) => [c._id, c.name]))

  return orders.map((order) => ({
    orderNumber: order.orderNumber || '-',
    customerManagementNumber: order.customerManagementNumber || '-',
    carrierName: carrierMap.get(order.carrierId) || order.carrierId || '-',
    invoiceTypeName: invoiceTypeMap[order.invoiceType] || order.invoiceType || '-',
    shipPlanDate: order.shipPlanDate || '-',
    deliveryDatePreference: order.deliveryDatePreference || '-',
    deliveryTimeSlot: formatTimeSlot(order.deliveryTimeSlot),
    coolTypeName: coolTypeMap[order.coolType || '0'] || '-',
    products: formatProducts(order.products),
    productTotalQuantity: order._productsMeta?.totalQuantity || order.products?.reduce((sum, p) => sum + (p.quantity || 0), 0) || 0,
    recipientPostalCode: order.recipient?.postalCode || '-',
    recipientAddress: [order.recipient?.prefecture, order.recipient?.city, order.recipient?.street].filter(Boolean).join(' ') || '-',
    recipientName: order.recipient?.name || '-',
    recipientPhone: order.recipient?.phone || '-',
    honorific: order.honorific || '様',
    senderPostalCode: order.sender?.postalCode || '-',
    senderAddress: [order.sender?.prefecture, order.sender?.city, order.sender?.street].filter(Boolean).join(' ') || '-',
    senderName: order.sender?.name || '-',
    senderPhone: order.sender?.phone || '-',
    ordererPostalCode: order.orderer?.postalCode || '-',
    ordererAddress: [order.orderer?.prefecture, order.orderer?.city, order.orderer?.street].filter(Boolean).join(' ') || '-',
    ordererName: order.orderer?.name || '-',
    ordererPhone: order.orderer?.phone || '-',
    handlingTags: order.handlingTags?.join(', ') || '-',
    createdAt: order.createdAt ? new Date(order.createdAt).toLocaleString('ja-JP') : '-',
    statusPrintedAt: order.status?.printed?.printedAt
      ? new Date(order.status.printed.printedAt).toLocaleString('ja-JP')
      : '-',
    statusCarrierReceiptAt: order.status?.carrierReceipt?.receivedAt
      ? new Date(order.status.carrierReceipt.receivedAt).toLocaleString('ja-JP')
      : '-',
  }))
}

const coolTypeDisplayMap: Record<string, string> = {
  '0': '通常',
  '1': 'クール冷凍',
  '2': 'クール冷蔵',
}

/**
 * ピッキングリスト用のデータをフォーマット
 * 複数注文の商品を集計して、商品マスタから完全な情報を取得して出力
 */
export function formatPickingListData(
  orders: OrderDocument[],
  context: FormatterContext,
): Record<string, any>[] {
  // 商品を集計（SKUごとの数量）
  const quantityMap = new Map<string, number>()

  for (const order of orders) {
    if (!order.products) continue
    for (const item of order.products) {
      // 使用 inputSku（新结构）或 productSku（父商品SKU）
      const sku = item.inputSku || item.productSku || ''
      const existing = quantityMap.get(sku) || 0
      quantityMap.set(sku, existing + (item.quantity || 0))
    }
  }

  // 商品マスタから完全な情報を取得
  const productMasterMap = new Map(context.products.map((p) => [p.sku, p]))
  
  // SKU順にソート
  const sortedSkus = Array.from(quantityMap.keys()).sort((a, b) => a.localeCompare(b))

  return sortedSkus.map((sku) => {
    const masterProduct = productMasterMap.get(sku)
    const quantity = quantityMap.get(sku) || 0
    
    // 商品マスタが見つかった場合は完全な情報を返す
    if (masterProduct) {
      const mergedBarcodes = mergeBarcodesWithSku(masterProduct.barcode, masterProduct.sku)
      // メール便計算の表示
      let mailCalcDisplay = '-'
      if (masterProduct.mailCalcEnabled === true) {
        mailCalcDisplay = masterProduct.mailCalcMaxQuantity
          ? `する(${masterProduct.mailCalcMaxQuantity})`
          : 'する'
      } else if (masterProduct.mailCalcEnabled === false) {
        mailCalcDisplay = 'しない'
      }

      return {
        sku: masterProduct.sku,
        name: masterProduct.name,
        nameFull: masterProduct.nameFull || '-',
        barcode: mergedBarcodes.length ? mergedBarcodes.join(', ') : '-',
        // バーコード/QRコード生成用に原始配列データを保持
        _rawBarcode: mergedBarcodes.length ? mergedBarcodes : null,
        coolType: coolTypeDisplayMap[masterProduct.coolType || '0'] || masterProduct.coolType || '-',
        mailCalc: mailCalcDisplay,
        totalQuantity: quantity,
      }
    }

    // 商品マスタが見つからない場合は SKU と数量のみ
    return {
      sku,
      name: sku,
      nameFull: '-',
      barcode: '-',
      // バーコード/QRコード生成用に原始配列データを保持（空配列）
      _rawBarcode: null,
      coolType: '-',
      mailCalc: '-',
      totalQuantity: quantity,
    }
  })
}

function formatTimeSlot(slot?: string): string {
  if (!slot || slot.length !== 4) return slot || '-'
  const start = slot.substring(0, 2)
  const end = slot.substring(2, 4)
  return `${start}時〜${end}時`
}

function formatProducts(products?: Array<{ inputSku?: string; productName?: string; quantity: number }>): string {
  if (!products || products.length === 0) return '-'
  return products.map((p) => `${p.productName || p.inputSku || '-'} x${p.quantity}`).join(', ')
}
