import type { Ref } from 'vue'
import type { OrderDocument } from '@/types/order'
import { fetchShipmentOrdersByIds } from '@/api/shipmentOrders'

/**
 * 検品ページのlocalStorage保存・読み込み / 检品页面的localStorage保存与加载
 * OneByOneInspection で使用
 */
export function useInspectionStorage(
  pendingOrders: Ref<OrderDocument[]>,
  processedOrderIds: Ref<string[]>,
) {
  // 注文IDをlocalStorageに保存 / 将订单ID保存到localStorage
  function saveOrdersToStorage() {
    try {
      const pendingIds = pendingOrders.value.map(o => String(o._id)).filter(Boolean)
      localStorage.setItem('oneByOneSelectedOrderIds', JSON.stringify(pendingIds))
      localStorage.setItem('oneByOneProcessedOrderIds', JSON.stringify(processedOrderIds.value))
    } catch (_e) {
      // 注文ID保存失敗 / 订单ID保存失败
    }
  }

  // localStorageから注文を読み込み / 从localStorage加载订单
  async function loadOrdersFromStorage(): Promise<void> {
    try {
      const storedIds = localStorage.getItem('oneByOneSelectedOrderIds')
      const processedStoredIds = localStorage.getItem('oneByOneProcessedOrderIds')

      if (storedIds) {
        const orderIds = JSON.parse(storedIds) as string[]
        if (orderIds.length > 0) {
          pendingOrders.value = await fetchShipmentOrdersByIds<OrderDocument>(orderIds)
        }
      }

      if (processedStoredIds) {
        processedOrderIds.value = JSON.parse(processedStoredIds) as string[]
      }
    } catch (_e) {
      // ストレージからの注文読み込み失敗 / 从存储加载订单失败
      throw new Error('保存された注文の読み込みに失敗しました')
    }
  }

  return { saveOrdersToStorage, loadOrdersFromStorage }
}
