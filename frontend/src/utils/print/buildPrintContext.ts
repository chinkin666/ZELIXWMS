import type { OrderDocument } from '@/types/order'
import type { OrderSourceCompany } from '@/types/orderSourceCompany'

/**
 * Build the variable context used by transform mappings.
 *
 * Current strategy:
 * - Flatten carrierRawRow to top-level (so template can use columns directly)
 * - Also expose a small, stable subset of order fields at top-level
 * - Add Yamato-specific fields if requiresYamatoSortCode is true
 *   - 仕分けコード: from order.carrierData.yamato.sortingCode (yamato-calc API or B2 Cloud)
 *                  or carrierRawRow['仕分けコード'], fallback to '999999'
 *   - 発店コード1: from order.carrierData.yamato.hatsuBaseNo1 or orderSourceCompany.hatsuBaseNo1
 *   - 発店コード2: from order.carrierData.yamato.hatsuBaseNo2 or orderSourceCompany.hatsuBaseNo2
 *   - 発ベースNo-1: from order.carrierData.yamato.hatsuBaseNo1 or orderSourceCompany.hatsuBaseNo1 (legacy support)
 *   - 発ベースNo-2: from order.carrierData.yamato.hatsuBaseNo2 or orderSourceCompany.hatsuBaseNo2 (legacy support)
 *
 * This keeps authoring simple while still allowing future expansion.
 */
export function buildPrintContext(
  order: OrderDocument,
  requiresYamatoSortCode = false,
  orderSourceCompany?: OrderSourceCompany | null,
): Record<string, any> {
  const carrierRawRow = (order?.carrierRawRow && typeof order.carrierRawRow === 'object' ? order.carrierRawRow : {}) as Record<
    string,
    any
  >

  const ctx: Record<string, any> = {
    ...carrierRawRow,
    // a few stable order fields (optional)
    orderId: order?._id,
    orderNumber: order?.orderNumber,
    carrierId: order?.carrierId,
    invoiceType: order?.invoiceType,
    // recipient fields (nested structure)
    recipientPostalCode: order?.recipient?.postalCode,
    recipientAddressPrefecture: order?.recipient?.prefecture,
    recipientAddressCity: order?.recipient?.city,
    recipientAddressStreet: order?.recipient?.street,
    recipientAddressBuilding: (order?.recipient as any)?.building || '',
    recipientAddress: [order?.recipient?.prefecture, order?.recipient?.city, order?.recipient?.street, (order?.recipient as any)?.building].filter(Boolean).join(' ') || '',
    recipientName: order?.recipient?.name,
    recipientPhone: order?.recipient?.phone,
    // sender fields (nested structure)
    senderPostalCode: order?.sender?.postalCode,
    senderAddressPrefecture: order?.sender?.prefecture,
    senderAddressCity: order?.sender?.city,
    senderAddressStreet: order?.sender?.street,
    senderAddressBuilding: (order?.sender as any)?.building || '',
    senderAddress: [order?.sender?.prefecture, order?.sender?.city, order?.sender?.street, (order?.sender as any)?.building].filter(Boolean).join(' ') || '',
    senderName: order?.sender?.name,
    senderPhone: order?.sender?.phone,
  }

  // Add Yamato-specific fields if required
  if (requiresYamatoSortCode) {
    const yamato = order?.carrierData?.yamato

    // 仕分けコード: from order.carrierData.yamato.sortingCode (yamato-calc API or B2 Cloud),
    // or carrierRawRow['仕分けコード'], fallback to '999999' if not available
    ctx['仕分けコード'] = yamato?.sortingCode || carrierRawRow['仕分けコード'] || '999999'

    // 発店コード1: from order.carrierData.yamato.hatsuBaseNo1, fallback to orderSourceCompany.hatsuBaseNo1 or '000'
    ctx['発店コード1'] = yamato?.hatsuBaseNo1 || orderSourceCompany?.hatsuBaseNo1 || '000'

    // 発店コード2: from order.carrierData.yamato.hatsuBaseNo2, fallback to orderSourceCompany.hatsuBaseNo2 or '000'
    ctx['発店コード2'] = yamato?.hatsuBaseNo2 || orderSourceCompany?.hatsuBaseNo2 || '000'

    // 発ベースNo-1: from order.carrierData.yamato.hatsuBaseNo1 or orderSourceCompany.hatsuBaseNo1, fallback to '000' (legacy support)
    ctx['発ベースNo-1'] = yamato?.hatsuBaseNo1 || orderSourceCompany?.hatsuBaseNo1 || '000'

    // 発ベースNo-2: from order.carrierData.yamato.hatsuBaseNo2 or orderSourceCompany.hatsuBaseNo2, fallback to '000' (legacy support)
    ctx['発ベースNo-2'] = yamato?.hatsuBaseNo2 || orderSourceCompany?.hatsuBaseNo2 || '000'
  }

  return ctx
}





