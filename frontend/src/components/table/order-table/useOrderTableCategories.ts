import { computed } from 'vue'
import type { Ref } from 'vue'

/**
 * カテゴリグループ構築コンポーザブル / 分类组构建组合式函数
 *
 * カラム定義からカテゴリ判定、住所フィールド結合、
 * カテゴリグループ computed を提供する。
 * 提供从列定义进行分类判定、地址字段合并、分类组 computed。
 */

type CategoryGroup = {
  title: string
  fields: Array<{
    key: string
    dataKey: string
    label: string
    column: any
  }>
  minWidth?: number
}

/** コンポーザブルの入力パラメータ / 组合式函数的输入参数 */
interface UseOrderTableCategoriesParams {
  /** カラム定義配列 / 列定义数组 */
  columns: Ref<Array<any>>
}

/**
 * フィールドキーからカテゴリを判定 / 根据字段 key 判断所属分类
 */
export function getFieldCategory(key: string): string | null {
  // 出荷情報フィールド / 出货信息字段
  const shipmentKeys = new Set([
    'ecCompanyId',
    'orderNumber',
    'customerManagementNumber',
    'carrierId',
    'invoiceType',
    'coolType',
    'shipPlanDate',
    'deliveryDatePreference',
    'deliveryTimeSlot',
    'handlingTags',
    'trackingId',
  ])

  // 商品情報フィールド / 商品信息字段
  const productKeys = new Set(['products'])

  // お届け先情報フィールド / 收件人信息字段
  const recipientKeys = new Set([
    'recipient.postalCode',
    'recipient.prefecture',
    'recipient.city',
    'recipient.street',
    'recipientAddress',
    'recipient.name',
    'recipient.phone',
    'honorific',
  ])

  // ご依頼主情報フィールド / 发件人信息字段
  const senderKeys = new Set([
    'sender.postalCode',
    'sender.prefecture',
    'sender.city',
    'sender.street',
    'senderAddress',
    'sender.name',
    'sender.phone',
  ])

  // 注文者情報フィールド / 订购者信息字段
  const ordererKeys = new Set([
    'orderer.postalCode',
    'orderer.prefecture',
    'orderer.city',
    'orderer.street',
    'ordererAddress',
    'orderer.name',
    'orderer.phone',
  ])

  // その他フィールド / 其他字段
  const otherKeys = new Set([
    'createdAt',
    'updatedAt',
    'statusPrinted',
    'statusCarrierReceipt',
    'statusPrintReady',
    'statusShipped',
    'statusConfirm',
    'statusCarrierReceiptIsReceived',
    'statusConfirmIsConfirmed',
    'statusPrintedIsPrinted',
    'statusShippedIsShipped',
  ])

  if (shipmentKeys.has(key)) return '出荷情報'
  if (productKeys.has(key)) return '商品情報'
  if (recipientKeys.has(key)) return 'お届け先情報'
  if (senderKeys.has(key)) return 'ご依頼主情報'
  if (ordererKeys.has(key)) return '注文者情報'
  if (otherKeys.has(key)) return 'その他'

  // status で始まるフィールドはその他 / 以 status 开头的字段归为其他
  if (key.startsWith('status')) return 'その他'

  return null
}

/**
 * 住所分割フィールド一覧 / 地址拆分字段列表
 * prefecture, city, street を結合住所に統合する対象。
 * 将 prefecture, city, street 合并为统一地址的对象。
 */
const addressSplitFields = new Set([
  'recipient.prefecture',
  'recipient.city',
  'recipient.street',
  'sender.prefecture',
  'sender.city',
  'sender.street',
  'orderer.prefecture',
  'orderer.city',
  'orderer.street',
])

/**
 * 住所結合フィールドマッピング / 地址合并字段映射
 */
const addressCombinedFieldMap: Record<string, { key: string; label: string }> = {
  recipient: { key: 'recipientAddress', label: 'お届け先住所' },
  sender: { key: 'senderAddress', label: 'ご依頼主住所' },
  orderer: { key: 'ordererAddress', label: '注文者住所' },
}

/**
 * テーブルに表示しないフィールド / 不在表格中显示的字段
 */
const excludedFields = new Set([
  'carrierData.yamato.hatsuBaseNo1',
  'carrierData.yamato.hatsuBaseNo2',
])

/**
 * カテゴリ表示順序 / 分类显示顺序
 */
const categoryOrder = ['出荷情報', '商品情報', 'お届け先情報', 'ご依頼主情報', 'その他']

export function useOrderTableCategories(params: UseOrderTableCategoriesParams) {
  const { columns } = params

  /**
   * カラム定義からカテゴリグループを構築する computed
   * 从列定义构建分类组的 computed
   */
  const categoryGroups = computed<CategoryGroup[]>(() => {
    if (!columns.value) {
      return []
    }

    const cols = columns.value || []
    const categoryMap = new Map<string, CategoryGroup['fields']>()
    const addedAddressFields = new Set<string>()

    for (const col of cols) {
      const key = col.key || col.dataKey
      if (!key || key === 'actions' || key === '__selection__' || key === '__bundle__') {
        continue
      }

      if (excludedFields.has(String(key))) {
        continue
      }

      const keyStr = String(key)

      // 住所分割フィールドの処理 / 地址拆分字段的处理
      if (addressSplitFields.has(keyStr)) {
        let prefix = ''
        if (keyStr.startsWith('recipient')) prefix = 'recipient'
        else if (keyStr.startsWith('sender')) prefix = 'sender'
        else if (keyStr.startsWith('orderer')) prefix = 'orderer'

        if (prefix && !addedAddressFields.has(prefix)) {
          addedAddressFields.add(prefix)
          const combined = addressCombinedFieldMap[prefix]
          if (combined) {
            const category = getFieldCategory(combined.key)
            if (category) {
              if (!categoryMap.has(category)) {
                categoryMap.set(category, [])
              }
              categoryMap.get(category)!.push({
                key: combined.key,
                dataKey: combined.key,
                label: combined.label,
                column: {
                  ...col,
                  key: combined.key,
                  dataKey: combined.key,
                  title: combined.label,
                  _isCombinedAddress: true,
                  _addressPrefix: prefix,
                },
              })
            }
          }
        }
        continue
      }

      // 結合住所キーはスキップ / 跳过合并地址键
      if (keyStr === 'recipientAddress' || keyStr === 'senderAddress' || keyStr === 'ordererAddress') {
        continue
      }

      const category = getFieldCategory(keyStr)
      if (!category) {
        // 未分類はその他へ / 未分类归入其他
        if (!categoryMap.has('その他')) {
          categoryMap.set('その他', [])
        }
        const dataKey = col.dataKey || col.key
        categoryMap.get('その他')!.push({
          key: keyStr,
          dataKey: String(dataKey),
          label: col.title || keyStr,
          column: col,
        })
      } else {
        if (!categoryMap.has(category)) {
          categoryMap.set(category, [])
        }
        const dataKey = col.dataKey || col.key
        categoryMap.get(category)!.push({
          key: keyStr,
          dataKey: String(dataKey),
          label: col.title || keyStr,
          column: col,
        })
      }
    }

    // 定義済み順序でグループを構築 / 按定义的顺序构建分组
    const groups: CategoryGroup[] = []
    for (const category of categoryOrder) {
      const fields = categoryMap.get(category)
      if (fields && fields.length > 0) {
        groups.push({
          title: category,
          fields,
          minWidth: 220,
        })
      }
    }

    return groups
  })

  return {
    categoryGroups,
    getFieldCategory,
    addressSplitFields,
    addressCombinedFieldMap,
    excludedFields,
  }
}
