import { ref } from 'vue'
import type { Product } from '@/types/product'
import type { OrderDocument } from '@/types/order'
import { fetchProducts } from '@/api/product'

// 商品項目型 / 商品项类型
export interface ProductItem {
  id: string
  sku: string
  name: string
  quantity: number
  productData?: Product
}

/**
 * 商品スキャン検品ロジック / 商品扫描检品逻辑
 * - 商品キャッシュ管理 / 产品缓存管理
 * - 待スキャン・スキャン済みアイテム管理 / 待扫描・已扫描项目管理
 * - スキャンマッチング / 扫描匹配
 * - 初期スキャン処理 / 初始扫描处理
 */
export function useOrderItemScanLogic() {
  // 商品キャッシュ / 产品缓存
  const productCache = new Map<string, Product>()

  // 待スキャン・スキャン済みの商品 / 待扫描和已扫描的商品
  const pendingItems = ref<ProductItem[]>([])
  const scannedItems = ref<ProductItem[]>([])

  // スキャン成功フラッシュ / 扫描成功闪烁
  const lastScanSuccess = ref(false)

  // 商品キャッシュ読み込み / 产品缓存加载
  const loadAllProducts = async () => {
    const allProducts = await fetchProducts()
    for (const product of allProducts) {
      if (product.sku) {
        productCache.set(product.sku, product)
      }
    }
  }

  // SKUから商品取得 / 从SKU获取商品
  const loadProductBySku = (sku: string): Product | null => {
    return productCache.get(sku) || null
  }

  // 商品のマッチング値を取得 / 获取商品的所有匹配值
  const getProductMatchingValues = (item: ProductItem): string[] => {
    const values: string[] = []

    if (item.sku) {
      values.push(item.sku)
    }

    const productData = item.productData
    if (productData) {
      if (Array.isArray(productData.subSkus)) {
        for (const sub of productData.subSkus) {
          if (sub?.subSku && sub.isActive !== false) {
            values.push(sub.subSku)
          }
        }
      }

      if (Array.isArray(productData.barcode)) {
        for (const barcode of productData.barcode) {
          if (barcode) {
            values.push(String(barcode))
          }
        }
      }
    }

    return values
  }

  // 商品リスト初期化 / 初始化商品列表
  const initializeItems = (order: OrderDocument) => {
    try {
      const orderId = String(order._id)
      localStorage.removeItem(`orderItemScan_${orderId}`)
    } catch (_e) {
      // スキャン状態キャッシュクリア失敗 / Failed to clear scan state cache
    }

    const items: ProductItem[] = []
    if (Array.isArray(order.products)) {
      for (const prod of order.products) {
        const p = prod as any
        const sku = p.inputSku || p.sku || ''
        if (sku) {
          const productData = loadProductBySku(sku)
          items.push({
            id: `${sku}_${Date.now()}_${Math.random()}`,
            sku: sku,
            name: p.productName || p.name || sku,
            quantity: p.quantity || 1,
            productData: productData || undefined,
          })
        }
      }
    }
    pendingItems.value = items
    scannedItems.value = []
  }

  // pending から matched item を scanned に移動する共通処理
  // pending から matched item を scanned に移動 / 从待扫描移至已扫描
  const moveItemToScanned = (matchedIndex: number): { completed: boolean; movedItem: ProductItem } => {
    const matchedItem = pendingItems.value[matchedIndex]
    if (!matchedItem) {
      throw new Error('Invalid matched index')
    }

    const scannedItem: ProductItem = {
      id: `${matchedItem.sku}_scanned_${Date.now()}_${Math.random()}`,
      sku: matchedItem.sku,
      name: matchedItem.name,
      quantity: 1,
      productData: matchedItem.productData,
    }
    scannedItems.value = [...scannedItems.value, scannedItem]

    const updatedPending = [...pendingItems.value]
    const updatedItem = { ...matchedItem, quantity: matchedItem.quantity - 1 }

    if (updatedItem.quantity === 0) {
      updatedPending.splice(matchedIndex, 1)
    } else {
      updatedPending[matchedIndex] = updatedItem
    }
    pendingItems.value = updatedPending

    return {
      completed: pendingItems.value.length === 0,
      movedItem: scannedItem,
    }
  }

  // 入力値でマッチするアイテムを検索 / 通过输入值搜索匹配项
  const findMatchingPendingItem = (input: string): { item: ProductItem; index: number } | null => {
    for (let i = 0; i < pendingItems.value.length; i++) {
      const item = pendingItems.value[i]
      if (!item) continue
      const matchingValues = getProductMatchingValues(item)
      if (matchingValues.includes(input)) {
        return { item, index: i }
      }
    }
    return null
  }

  // スキャン済みかチェック / 检查是否已扫描
  const isAlreadyScanned = (input: string): boolean => {
    return scannedItems.value.some(item => {
      const matchValues = getProductMatchingValues(item)
      return matchValues.includes(input)
    })
  }

  // スキャン入力処理 / 扫描输入处理
  // 戻り値: 'empty' | 'no-pending' | 'already-scanned' | 'no-match' | 'completed' | 'matched'
  const processScan = (input: string): {
    status: 'empty' | 'no-pending' | 'already-scanned' | 'no-match' | 'completed' | 'matched'
    matchedItem?: ProductItem
  } => {
    if (!input) {
      return { status: 'empty' }
    }

    if (pendingItems.value.length === 0) {
      return { status: 'no-pending' }
    }

    const match = findMatchingPendingItem(input)

    if (!match) {
      if (isAlreadyScanned(input)) {
        return { status: 'already-scanned' }
      }
      return { status: 'no-match' }
    }

    const { completed, movedItem } = moveItemToScanned(match.index)

    // スキャン成功フラッシュ / 扫描成功闪烁
    lastScanSuccess.value = true
    setTimeout(() => { lastScanSuccess.value = false }, 600)

    return {
      status: completed ? 'completed' : 'matched',
      matchedItem: movedItem,
    }
  }

  // 初期スキャン処理（前ページからの引継ぎ） / 初始扫描处理（从上一页面传递）
  const processInitialScan = (scanValue: string): {
    status: 'no-match' | 'completed' | 'matched'
    matchedItem?: ProductItem
  } | null => {
    if (!scanValue || pendingItems.value.length === 0) return null

    const match = findMatchingPendingItem(scanValue)
    if (!match) return { status: 'no-match' }

    const { completed, movedItem } = moveItemToScanned(match.index)

    return {
      status: completed ? 'completed' : 'matched',
      matchedItem: movedItem,
    }
  }

  return {
    pendingItems,
    scannedItems,
    lastScanSuccess,
    loadAllProducts,
    loadProductBySku,
    getProductMatchingValues,
    initializeItems,
    processScan,
    processInitialScan,
  }
}
