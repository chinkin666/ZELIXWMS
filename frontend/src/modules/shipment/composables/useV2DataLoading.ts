import { toast } from 'vue-sonner'
import { fetchShipmentOrders } from '@/api/shipmentOrders'
import { fetchCarriers } from '@/api/carrier'
import { fetchOrderSourceCompanies } from '@/api/orderSourceCompany'
import { fetchProducts } from '@/api/product'
import type { V2State } from './useV2State'

export function useV2DataLoading(state: V2State) {
  let loadVersion = 0

  const loadBackendOrders = async () => {
    const version = ++loadVersion
    state.loading.value = true
    try {
      const orders = await fetchShipmentOrders({ limit: 500 })
      if (version !== loadVersion) return
      state.backendRows.value = (orders || []).map((o: any) => ({ ...o, id: o._id }))
    } catch (err: any) {
      if (version !== loadVersion) return
      // 注文取得失敗はtoastで通知済み / Order fetch failure notified via toast
      toast.error('注文の取得に失敗しました')
    } finally {
      if (version === loadVersion) {
        state.loading.value = false
      }
    }
  }

  const loadCarriers = async () => {
    try {
      state.carriers.value = await fetchCarriers({ enabled: true })
    } catch (err) {
      // 配送業者取得失敗 / Failed to fetch carriers
    }
  }

  const loadOrderSourceCompanies = async () => {
    try {
      state.orderSourceCompanies.value = await fetchOrderSourceCompanies()
    } catch (err) {
      // ご依頼主リスト読み込み失敗 / Failed to load order source companies
    }
  }

  const loadProducts = async () => {
    try {
      state.products.value = await fetchProducts()
    } catch (err) {
      // 商品リスト読み込み失敗 / Failed to load products
    }
  }

  return { loadBackendOrders, loadCarriers, loadOrderSourceCompanies, loadProducts }
}
