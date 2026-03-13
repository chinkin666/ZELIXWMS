import { ElMessage } from 'element-plus'
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
      console.error('注文の取得に失敗しました:', err)
      ElMessage.error('注文の取得に失敗しました')
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
      console.error('配送業者の取得に失敗しました:', err)
    }
  }

  const loadOrderSourceCompanies = async () => {
    try {
      state.orderSourceCompanies.value = await fetchOrderSourceCompanies()
    } catch (err) {
      console.error('ご依頼主リストの読み込みに失敗しました:', err)
    }
  }

  const loadProducts = async () => {
    try {
      state.products.value = await fetchProducts()
    } catch (err) {
      console.error('商品リストの読み込みに失敗しました:', err)
    }
  }

  return { loadBackendOrders, loadCarriers, loadOrderSourceCompanies, loadProducts }
}
