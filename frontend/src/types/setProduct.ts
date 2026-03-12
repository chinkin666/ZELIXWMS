export interface SetComponent {
  productId: string
  sku: string
  name: string
  quantity: number
}

export interface SetProduct {
  _id: string
  sku: string
  name: string
  components: SetComponent[]
  isActive: boolean
  memo?: string
  createdAt: string
  updatedAt: string
}

export type SetOrderType = 'assembly' | 'disassembly'
export type SetOrderStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

export interface SetOrderComponent {
  productId: string
  sku: string
  name: string
  quantityPerSet: number
  totalQuantity: number
}

export interface SetOrder {
  _id: string
  orderNumber: string
  type: SetOrderType
  setProductId: string
  setSku: string
  setName: string
  quantity: number
  completedQuantity: number
  stockCategory?: string
  desiredDate?: string
  lotNumber?: string
  expiryDate?: string
  status: SetOrderStatus
  completedAt?: string
  components: SetOrderComponent[]
  memo?: string
  createdAt: string
  updatedAt: string
}
