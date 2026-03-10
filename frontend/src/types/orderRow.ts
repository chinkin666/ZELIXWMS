import type { OrderDocument } from '@/types/order'

/**
 * 用户订单行类型（临时 ID，用于前端显示）
 * 上传到后端后，后端会分配真正的 _id
 */
export type UserOrderRow = OrderDocument & { 
  /** 临时 ID，仅用于前端表格显示和操作，上传到后端后会替换为真正的 _id */
  id: string 
}

/**
 * 生成临时 ID（仅用于前端）
 */
let tempIdCounter = 0
export const generateTempId = (): string => {
  return `temp-${Date.now()}-${++tempIdCounter}`
}







