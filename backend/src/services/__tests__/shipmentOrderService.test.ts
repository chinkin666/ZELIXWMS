/**
 * Sample service test showing how to mock mongoose models with vitest.
 *
 * Pattern:
 *   1. vi.mock() the model module
 *   2. Import the mocked model
 *   3. Use mockResolvedValue / mockImplementation per test
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the mongoose model before importing the service
vi.mock('@/models/shipmentOrder', () => ({
  ShipmentOrder: {
    insertMany: vi.fn(),
  },
  calculateProductsMeta: vi.fn(() => ({
    totalQuantity: 0,
    skuCount: 0,
  })),
}))

// Mock the id generator
vi.mock('@/utils/idGenerator', () => ({
  generateOrderNumbers: vi.fn(),
}))

import { ShipmentOrder, calculateProductsMeta } from '@/models/shipmentOrder'
import { generateOrderNumbers } from '@/utils/idGenerator'
import { assignOrderNumbers, persistShipmentOrders } from '../shipmentOrderService'

describe('shipmentOrderService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('assignOrderNumbers', () => {
    it('assigns generated order numbers to each order', async () => {
      const mockNumbers = ['ORD-001', 'ORD-002']
      vi.mocked(generateOrderNumbers).mockResolvedValue(mockNumbers)

      const orders = [{ products: [] }, { products: [] }] as any[]
      const result = await assignOrderNumbers(orders)

      expect(generateOrderNumbers).toHaveBeenCalledWith(2)
      expect(result).toHaveLength(2)
      expect(result[0].orderNumber).toBe('ORD-001')
      expect(result[1].orderNumber).toBe('ORD-002')
    })
  })

  describe('persistShipmentOrders', () => {
    it('calls insertMany with calculated productsMeta', async () => {
      vi.mocked(calculateProductsMeta).mockReturnValue({
        totalQuantity: 5,
        skuCount: 2,
      } as any)

      const mockInserted = [{ _id: 'abc123' }, { _id: 'def456' }]
      vi.mocked(ShipmentOrder.insertMany).mockResolvedValue(mockInserted as any)

      const orders = [
        { products: [{ sku: 'A', quantity: 3 }] },
        { products: [{ sku: 'B', quantity: 2 }] },
      ] as any[]

      const result = await persistShipmentOrders(orders)

      expect(ShipmentOrder.insertMany).toHaveBeenCalledOnce()
      expect(result.insertedIds).toEqual(['abc123', 'def456'])
    })
  })
})
