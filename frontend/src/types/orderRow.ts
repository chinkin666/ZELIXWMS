import type { OrderDocument } from '@/types/order'

/**
 * ユーザー注文行タイプ（一時ID付き、フロントエンド表示用）
 * バックエンドへのアップロード後、バックエンドが本来の _id を割り当てる
 */
export type UserOrderRow = OrderDocument & {
  /** 一時ID。フロントエンドのテーブル表示・操作専用。バックエンドアップロード後は本来の _id に置き換えられる */
  id: string
}

/**
 * 一時ID生成（フロントエンド専用）
 */
let tempIdCounter = 0
export const generateTempId = (): string => {
  return `temp-${Date.now()}-${++tempIdCounter}`
}
