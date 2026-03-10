import type { Product, SubSku } from '@/types/product'
import type { OrderProduct } from '@/types/order'

/**
 * SKU正規化:
 * - trim
 * - 全角英数字/ハイフンを半角に変換
 * - 大文字に統一（SKUは通常大文字小文字を区別しない）
 */
export function normalizeSku(raw: any): string {
  if (raw === undefined || raw === null) return ''
  const toHalfWidth = (s: string) =>
    s
      .replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
      .replace(/[Ａ-Ｚ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
      .replace(/[ａ-ｚ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
      .replace(/[－ー―]/g, '-') // 全角ハイフン類を半角に
  return toHalfWidth(String(raw)).trim().toUpperCase()
}

/**
 * 商品リストからSKUマップを構築
 * - 主SKU: そのまま親商品を登録
 * - 子SKU: 親商品への参照を登録（アクティブな子SKUのみ）
 */
export function createProductMap(products: Product[]): Map<string, Product> {
  const map = new Map<string, Product>()
  for (const p of products) {
    // 主SKUでインデックス
    const mainKey = normalizeSku(p.sku)
    if (mainKey) map.set(mainKey, p)

    // 子SKUでもインデックス（子SKUから親商品を引ける）
    if (p.subSkus && p.subSkus.length > 0) {
      for (const sub of p.subSkus) {
        if (sub.isActive !== false) { // アクティブな子SKUのみ
          const subKey = normalizeSku(sub.subSku)
          if (subKey && !map.has(subKey)) { // 重複防止
            map.set(subKey, p)
          }
        }
      }
    }
  }
  return map
}

/**
 * SKU解決結果
 */
export interface ResolvedProduct {
  product: Product
  subSku?: SubSku     // 子SKUにマッチした場合
  isMainSku: boolean  // 主SKUにマッチしたか
}

/**
 * 入力SKUから商品を解決
 * @param inputSku ユーザー入力のSKU（主SKUまたは子SKU）
 * @param productMap createProductMapで構築したマップ
 * @returns 解決結果（見つからない場合はnull）
 */
export function resolveProductBySku(
  inputSku: string,
  productMap: Map<string, Product>
): ResolvedProduct | null {
  const key = normalizeSku(inputSku)
  if (!key) return null

  const product = productMap.get(key)
  if (!product) return null

  // 主SKUにマッチしたかチェック
  const isMainSku = normalizeSku(product.sku) === key

  // 子SKUにマッチした場合、該当する子SKU情報を取得
  const subSku = isMainSku
    ? undefined
    : product.subSkus?.find(s => normalizeSku(s.subSku) === key && s.isActive !== false)

  return { product, subSku, isMainSku }
}

/**
 * 入力SKUからOrderProductを生成（auto-fill用）
 * @param inputSku ユーザー入力のSKU
 * @param quantity 数量
 * @param productMap createProductMapで構築したマップ
 * @param existingData アップロード時に既に設定されているデータ（優先使用）
 * @returns OrderProduct（商品が見つからない場合も基本情報のみで返す）
 */
export function resolveAndFillProduct(
  inputSku: string,
  quantity: number,
  productMap: Map<string, Product>,
  existingData?: Partial<OrderProduct>
): OrderProduct {
  const resolved = resolveProductBySku(inputSku, productMap)

  if (!resolved) {
    // 商品マスタに見つからない場合、入力とアップロード値を保持
    return {
      inputSku,
      quantity,
      ...(existingData?.barcode?.length ? { barcode: existingData.barcode } : {}),
      ...(existingData?.productName ? { productName: existingData.productName } : {}),
    }
  }

  const { product, subSku } = resolved

  // 価格計算：子SKU価格 > 親商品価格
  const unitPrice = subSku?.price ?? product.price ?? 0
  const subtotal = unitPrice * quantity

  return {
    // ユーザー入力
    inputSku,
    quantity,

    // 親商品情報
    productId: product._id,
    productSku: product.sku,
    productName: existingData?.productName || product.name,

    // 子SKU情報（マッチした場合）
    matchedSubSku: subSku
      ? {
          code: subSku.subSku,
          price: subSku.price,
          description: subSku.description,
        }
      : undefined,

    // 親商品からスナップショット（アップロード値を優先）
    imageUrl: product.imageUrl,
    barcode: existingData?.barcode?.length ? existingData.barcode : product.barcode,
    coolType: product.coolType,
    // メール便計算設定
    mailCalcEnabled: product.mailCalcEnabled,
    mailCalcMaxQuantity: product.mailCalcMaxQuantity,

    // 価格情報
    unitPrice,
    subtotal,
  }
}

/**
 * OrderProduct配列の合計金額を計算
 */
export function calculateTotalPrice(products: OrderProduct[]): number {
  return products.reduce((sum, p) => sum + (p.subtotal || 0), 0)
}

/**
 * OrderProduct配列からクール区分を決定
 * 優先順位: 冷凍(2) > 冷蔵(1) > 常温(0)
 */
export function determineCoolType(products: OrderProduct[]): '0' | '1' | '2' | undefined {
  // 優先度マップ：大きいほど優先
  const priorityMap: Record<string, number> = { '2': 3, '1': 2, '0': 1 }
  let maxPriority = 0
  let result: '0' | '1' | '2' | undefined = undefined

  for (const p of products) {
    const ct = p.coolType
    if (ct) {
      const priority = priorityMap[ct] ?? 0
      if (priority > maxPriority) {
        maxPriority = priority
        result = ct
      }
    }
  }
  return result
}

/**
 * OrderProduct配列から送り状種類（メール便 or 宅急便）を決定
 *
 * ロジック:
 * 1. mailCalcEnabled: true の商品は計算対象
 *    - 各商品の (quantity / mailCalcMaxQuantity) を合計
 *    - 合計 < 1 → メール便 ('A')
 *    - 合計 >= 1 → 宅急便 ('0')
 * 2. mailCalcEnabled: false の商品は計算対象外（defaultInvoiceType を使用）
 * 3. 混在している場合:
 *    - 計算対象の商品で計算した結果と defaultInvoiceType を組み合わせ
 *    - いずれかが宅急便('0'/'8')なら宅急便('0')、すべてメール便ならメール便('A')
 * 4. すべて計算対象外の場合: null を返す（変更なし、元の invoiceType を維持）
 *
 * @param products OrderProduct配列
 * @param defaultInvoiceType 計算対象外商品に適用するデフォルト値（同梱時は元orderの invoiceType）
 * @returns '0' | 'A' | null（null は変更なしを意味）
 */
export function determineInvoiceType(
  products: OrderProduct[],
  defaultInvoiceType?: '0' | '8' | 'A'
): '0' | 'A' | null {
  if (products.length === 0) return null // 変更なし

  // 計算対象と対象外に分ける
  const calcEnabled = products.filter(p => p.mailCalcEnabled === true)
  const calcDisabled = products.filter(p => p.mailCalcEnabled !== true)

  // すべて計算対象外の場合、変更なし
  if (calcEnabled.length === 0) {
    return null
  }

  // 計算対象の商品で送り状種類を計算
  let totalRatio = 0
  for (const p of calcEnabled) {
    const qty = p.quantity ?? 1
    // mailCalcMaxQuantity が未設定または0以下の場合は1として計算
    const maxQty = (p.mailCalcMaxQuantity && p.mailCalcMaxQuantity > 0)
      ? p.mailCalcMaxQuantity
      : 1
    totalRatio += qty / maxQty
  }
  const calculatedType: '0' | 'A' = totalRatio < 1 ? 'A' : '0'

  // 計算対象外がない場合、計算結果をそのまま返す
  if (calcDisabled.length === 0) {
    return calculatedType
  }

  // 混在している場合、両方を組み合わせ
  // defaultInvoiceType が宅急便('0'/'8')または計算結果が宅急便('0')なら宅急便
  const defaultIsNonMail = defaultInvoiceType === '0' || defaultInvoiceType === '8'
  if (defaultIsNonMail || calculatedType === '0') {
    return '0'
  }

  return 'A'
}
