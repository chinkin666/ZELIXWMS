import { ref } from 'vue'
import type { Ref } from 'vue'
import { fetchProducts } from '@/api/product'
import { fetchCarriers } from '@/api/carrier'
import { fetchOrderSourceCompanies } from '@/api/orderSourceCompany'
import { fetchShipmentOrders } from '@/api/shipmentOrders'
import type { Product } from '@/types/product'
import type { Carrier } from '@/types/carrier'
import type { OrderSourceCompany } from '@/types/orderSourceCompany'
import type { UserOrderRow } from '@/types/orderRow'
import type { useToast } from '@/composables/useToast'
import type { useI18n } from '@/composables/useI18n'

/**
 * マスターデータ読み込み・バックエンド注文取得を管理するComposable
 * マスターデータ読み込み・バックエンド注文取得を管理するComposable
 */
export function useOrderDataLoader(
  toast: ReturnType<typeof useToast>,
  t: ReturnType<typeof useI18n>['t'],
  reapplyProductDefaults: () => void,
) {
  // --- マスターデータ / マスターデータ ---
  const orderSourceCompanies = ref<OrderSourceCompany[]>([])
  const products = ref<Product[]>([])
  const carriers = ref<Carrier[]>([])

  // --- 送り状未発行注文（バックエンドから取得） / 送り状未発行注文 ---
  const pendingWaybillRows = ref<UserOrderRow[]>([])
  const isLoadingPendingWaybill = ref(false)

  // --- バージョン管理（競合回避） / バージョン管理 ---
  let loadPendingWaybillVersion = 0

  // --- バックエンド注文の読み込み / バックエンド注文読み込み ---
  async function loadPendingWaybillOrders() {
    const version = ++loadPendingWaybillVersion
    try {
      isLoadingPendingWaybill.value = true
      const orders = await fetchShipmentOrders({ limit: 500 })
      if (version !== loadPendingWaybillVersion) return
      pendingWaybillRows.value = (orders || [])
        .map((o: any) => ({ ...o, id: o._id } as UserOrderRow))
    } catch (err: any) {
      if (version !== loadPendingWaybillVersion) return
      // 注文取得失敗はトーストで通知 / Order fetch failure notified via toast
      toast.showError(t('wms.shipmentOrder.fetchOrdersFailed', '注文の取得に失敗しました'))
    } finally {
      if (version === loadPendingWaybillVersion) {
        isLoadingPendingWaybill.value = false
      }
    }
  }

  // --- マスターデータ読み込み / マスターデータ読み込み ---
  const loadOrderSourceCompanies = async () => {
    try {
      orderSourceCompanies.value = await fetchOrderSourceCompanies()
    } catch (error) {
      // ご依頼主リスト読み込み失敗 / Failed to load order source companies
      toast.showError(t('wms.shipmentOrder.fetchSendersFailed', 'ご依頼主リストの読み込みに失敗しました'))
    }
  }

  const loadProductsCache = async () => {
    try {
      products.value = await fetchProducts()
      reapplyProductDefaults()
    } catch (error) {
      // 商品マスタ取得失敗 / Failed to fetch products
      toast.showError(t('wms.shipmentOrder.fetchProductsFailed', '商品マスタの取得に失敗しました'))
    }
  }

  const loadCarriers = async () => {
    try {
      carriers.value = await fetchCarriers({ enabled: true })
    } catch (error) {
      // 配送業者マスタ取得失敗 / Failed to fetch carriers
      toast.showError(t('wms.shipmentOrder.fetchCarriersFailed', '配送業者マスタの取得に失敗しました'))
    }
  }

  // --- 全マスターデータ一括読み込み / 全マスターデータ一括読み込み ---
  const loadAllMasterData = () => {
    loadOrderSourceCompanies()
    loadProductsCache()
    loadCarriers()
    loadPendingWaybillOrders()
  }

  return {
    orderSourceCompanies,
    products,
    carriers,
    pendingWaybillRows,
    isLoadingPendingWaybill,
    loadPendingWaybillOrders,
    loadAllMasterData,
  }
}
