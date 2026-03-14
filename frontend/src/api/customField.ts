import { getApiBaseUrl } from '@/api/base'

const API_BASE_URL = getApiBaseUrl()

export type CustomFieldEntityType = 'order' | 'product' | 'inboundOrder' | 'returnOrder'
export type CustomFieldType = 'text' | 'number' | 'boolean' | 'date' | 'select'

export interface CustomFieldDefinition {
  _id: string
  tenantId?: string
  entityType: CustomFieldEntityType
  fieldKey: string
  label: string
  labelJa?: string
  fieldType: CustomFieldType
  required: boolean
  defaultValue?: unknown
  options?: string[]
  sortOrder: number
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface CustomFieldListResponse {
  data: CustomFieldDefinition[]
}

export async function fetchCustomFieldDefinitions(params?: {
  entityType?: string
  tenantId?: string
}): Promise<CustomFieldListResponse> {
  const url = new URL(`${API_BASE_URL}/extensions/custom-fields`)
  if (params?.entityType) url.searchParams.append('entityType', params.entityType)
  if (params?.tenantId) url.searchParams.append('tenantId', params.tenantId)
  const response = await fetch(url.toString())
  if (!response.ok) throw new Error(`カスタムフィールド定義の取得に失敗しました: ${response.statusText}`)
  return response.json()
}

export async function fetchActiveDefinitions(
  entityType: CustomFieldEntityType,
  tenantId?: string,
): Promise<CustomFieldListResponse> {
  const url = new URL(`${API_BASE_URL}/extensions/custom-fields/${entityType}/active`)
  if (tenantId) url.searchParams.append('tenantId', tenantId)
  const response = await fetch(url.toString())
  if (!response.ok) throw new Error(`カスタムフィールド定義の取得に失敗しました: ${response.statusText}`)
  return response.json()
}

export async function createCustomFieldDefinition(
  data: Partial<CustomFieldDefinition>,
): Promise<CustomFieldDefinition> {
  const response = await fetch(`${API_BASE_URL}/extensions/custom-fields`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || 'カスタムフィールド定義の作成に失敗しました')
  }
  return response.json()
}

export async function updateCustomFieldDefinition(
  id: string,
  data: Partial<CustomFieldDefinition>,
): Promise<CustomFieldDefinition> {
  const response = await fetch(`${API_BASE_URL}/extensions/custom-fields/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || 'カスタムフィールド定義の更新に失敗しました')
  }
  return response.json()
}

export async function deleteCustomFieldDefinition(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/extensions/custom-fields/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || 'カスタムフィールド定義の削除に失敗しました')
  }
}
