import { http } from './http'

export interface Product {
  _id: string
  sku: string
  name: string
  fnsku?: string
  asin?: string
  amazonSku?: string
  rakutenSku?: string
  janCode?: string
  imageUrl?: string
  weight?: number
  width?: number
  depth?: number
  height?: number
  shopId?: string
  clientId?: string
  fbaEnabled?: boolean
  rslEnabled?: boolean
}

export function listProducts(params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  return http.get<{ data: Product[]; total: number }>(`/products${qs}`)
}

export function getProduct(id: string) {
  return http.get<Product>(`/products/${id}`)
}

export function createProduct(data: Record<string, unknown>) {
  return http.post<Product>('/products', data)
}

export function updateProduct(id: string, data: Record<string, unknown>) {
  return http.put<Product>(`/products/${id}`, data)
}

export function deleteProduct(id: string) {
  return http.delete(`/products/${id}`)
}
