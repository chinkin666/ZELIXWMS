import type { ComputedRef } from 'vue'
import type { Product } from '@/types/product'
import type { OrderProduct } from '@/types/order'
import { getStringWidth, splitByWidth } from '@/utils/japaneseCharWidth'
import {
  resolveAndFillProduct,
  determineCoolType,
  determineInvoiceType,
} from '@/utils/productMapUtils'

export function useV2ProductDefaults(
  productMap: ComputedRef<ReturnType<typeof import('@/utils/productMapUtils').createProductMap>>,
) {
  const normalizeAddress = (addr: { city?: string; street?: string; building?: string } | undefined) => {
    if (!addr) return addr
    let city = addr.city || ''
    let street = addr.street || ''
    let building = addr.building || ''
    const cityWidth = getStringWidth(city)
    if (cityWidth > 24) {
      const [cityFit, cityOverflow] = splitByWidth(city, 24)
      city = cityFit
      street = cityOverflow + street
    }
    const streetWidth = getStringWidth(street)
    if (streetWidth > 32) {
      const [streetFit, streetOverflow] = splitByWidth(street, 32)
      street = streetFit
      building = streetOverflow + building
    }
    return { ...addr, city, street, building }
  }

  const applyProductDefaults = (row: any): any => {
    const next = { ...row }
    const pMap = productMap.value

    if (Array.isArray(next.products)) {
      next.products = next.products.map((p: any): OrderProduct => {
        const inputSku = (p.inputSku || p.sku || '').trim()
        const quantity = p.quantity ?? 1
        if (p.productId && p.inputSku) return p as OrderProduct
        const existingData: Partial<OrderProduct> = {}
        if (p.barcode?.length) existingData.barcode = p.barcode
        if (p.name || p.productName) existingData.productName = p.productName || p.name
        return resolveAndFillProduct(inputSku, quantity, pMap, existingData)
      })

      const matchedProducts = next.products.filter((p: any) => p.productId)
      if (matchedProducts.length > 0) {
        const nextCoolType = determineCoolType(next.products)
        if (nextCoolType !== undefined) next.coolType = nextCoolType
        const calculatedInvoiceType = determineInvoiceType(next.products, next.invoiceType as '0' | '8' | 'A' | undefined)
        if (calculatedInvoiceType !== null) next.invoiceType = calculatedInvoiceType
      }
    }

    // クール便はメール便不可 → 発払いに強制変更
    if (next.coolType === '1' || next.coolType === '2') {
      const mailTypes = new Set(['3', '7', 'A'])
      if (mailTypes.has(next.invoiceType)) {
        next.invoiceType = '0'
      }
    }

    // ネコポス・ゆうメール等はお届け日・時間帯指定不可
    const noDateTimeTypes = new Set(['3', '7', 'A'])
    if (noDateTimeTypes.has(next.invoiceType)) {
      next.deliveryDatePreference = undefined
      next.deliveryTimeSlot = ''
    }

    return next
  }

  return { normalizeAddress, applyProductDefaults }
}
