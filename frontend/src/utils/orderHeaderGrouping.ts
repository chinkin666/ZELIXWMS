import type { HeaderGroupingConfig } from '@/components/table/tableHeaderGroup'
import type { TableColumn } from '@/types/table'

type GroupDef = {
  title: string
  keys: string[]
  style: { backgroundColor: string; color: string }
}

const GROUP_DEFS: GroupDef[] = [
  {
    title: '出荷情報',
    keys: ['ecCompanyId', 'orderNumber', 'customerManagementNumber', 'carrierId', 'invoiceType', 'coolType', 'shipPlanDate', 'deliveryDatePreference', 'deliveryTimeSlot', 'products', 'handlingTags', 'trackingId'],
    style: { backgroundColor: '#5661b7', color: '#ffffff' },
  },
  {
    title: '送付先情報',
    keys: ['recipient.postalCode', 'recipient.prefecture', 'recipient.city', 'recipient.street', 'recipientAddress', 'recipient.name', 'recipient.phone', 'honorific'],
    style: { backgroundColor: '#e6a23c', color: '#ffffff' },
  },
  {
    title: 'ご依頼主情報',
    keys: ['sender.postalCode', 'sender.prefecture', 'sender.city', 'sender.street', 'senderAddress', 'sender.name', 'sender.phone', 'carrierData.yamato.hatsuBaseNo1', 'carrierData.yamato.hatsuBaseNo2'],
    style: { backgroundColor: '#3b499f', color: '#ffffff' },
  },
  {
    title: '注文者情報',
    keys: ['orderer.postalCode', 'orderer.prefecture', 'orderer.city', 'orderer.street', 'ordererAddress', 'orderer.name', 'orderer.phone'],
    style: { backgroundColor: '#67c23a', color: '#ffffff' },
  },
  {
    title: '状態',
    keys: ['statusPrinted', 'statusCarrierReceipt', 'statusPrintReady', 'statusShipped', 'statusEcExported', 'statusEcExportedAt'],
    style: { backgroundColor: '#f56c6c', color: '#ffffff' },
  },
  {
    title: 'その他',
    keys: ['createdAt', 'updatedAt', 'internalRecord'],
    style: { backgroundColor: '#909399', color: '#ffffff' },
  },
]

const getColumnKey = (c: TableColumn): string => String((c as any)?.key ?? '')

/**
 * Build header grouping config for Order-based tables from the actual columns,
 * so it stays correct even when Order fields are added/removed/reordered.
 *
 * Notes:
 * - This grouping targets business columns only (selection/actions are handled as aux cells in `createCustomizedHeader`).
 * - Unknown columns are appended to the last group ("メタ") to avoid breaking header alignment.
 */
export function buildOrderHeaderGroupingConfig(columns: TableColumn[]): HeaderGroupingConfig {
  const cols = Array.isArray(columns) ? columns : []
  const keys = cols.map(getColumnKey).filter(Boolean)
  const keySet = new Set(keys)

  const groups: number[] = []
  const titles: string[] = []
  const cellStyles: Array<{ backgroundColor?: string; color?: string }> = []

  // Track keys we have assigned to a group.
  const used = new Set<string>()

  for (const def of GROUP_DEFS) {
    // count only keys that exist in the current table columns, respecting current visibility
    const count = def.keys.filter((k) => keySet.has(k)).length
    if (count <= 0) continue
    groups.push(count)
    titles.push(def.title)
    cellStyles.push(def.style)
    def.keys.forEach((k) => {
      if (keySet.has(k)) used.add(k)
    })
  }

  // Any remaining columns (new fields, custom fields, etc.) should still be grouped to keep alignment correct.
  const unknownCount = keys.filter((k) => !used.has(k)).length
  if (unknownCount > 0) {
    // Prefer merging into last group ("その他"). If we skipped "その他" entirely, create a fallback group.
    const lastIdx = titles.length - 1
    if (lastIdx >= 0 && titles[lastIdx] === 'その他') {
      groups[lastIdx] = (groups[lastIdx] ?? 0) + unknownCount
    } else {
      groups.push(unknownCount)
      titles.push('その他')
      cellStyles.push({ backgroundColor: '#909399', color: '#ffffff' })
    }
  }

  return {
    rows: [
      {
        groups,
        titles,
        cellStyles,
      },
    ],
  }
}


