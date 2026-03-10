/**
 * 映射配置 API 服务
 */

import { getApiBaseUrl } from '@/api/base'

// Transform pipeline schema
export interface TransformContext {
  meta?: Record<string, any>
  fetchImpl?: typeof fetch
}

export interface TransformStep {
  id: string
  plugin: string
  params?: any
  enabled?: boolean
  onError?: { mode: 'fail' | 'fallback' | 'skip'; value?: any }
}

export interface TransformPipeline {
  steps: TransformStep[]
}

export type InputSource =
  | { id: string; type: 'column'; column: string; pipeline?: TransformPipeline }
  | { id: string; type: 'literal'; value: any; pipeline?: TransformPipeline }
  | { id: string; type: 'generated'; generator: 'now' | 'uuid' | string; generatorParams?: any; pipeline?: TransformPipeline }

export interface CombineConfig {
  plugin: string
  params?: any
}

export interface TransformMapping {
  targetField: string
  inputs: InputSource[]
  combine: CombineConfig
  outputPipeline?: TransformPipeline
  required?: boolean
  defaultValue?: any
  meta?: Record<string, any>
}

export interface MappingConfig {
  _id: string
  schemaVersion?: number
  tenantId: string
  configType: 'ec-company-to-order' | 'order-to-carrier' | 'order-to-sheet' | 'product' | string
  name: string
  description?: string
  isDefault?: boolean
  orderSourceCompanyId?: string
  orderSourceCompanyName?: string
  carrierId?: string
  carrierCode?: string
  carrierName?: string
  mappings: TransformMapping[]
  createdAt: string
  updatedAt: string
  createdBy?: string
  updatedBy?: string
}

export interface CreateMappingConfigDto {
  schemaVersion?: number
  configType: 'ec-company-to-order' | 'order-to-carrier' | 'order-to-sheet' | 'product' | string
  name: string
  description?: string
  isDefault?: boolean
  orderSourceCompanyId?: string
  orderSourceCompanyName?: string
  carrierId?: string
  mappings: TransformMapping[]
}

export interface TransformPluginInfo {
  name: string
  nameJa?: string // 日文名称
  summary?: string
  descriptionJa?: string // 日文描述
  inputKinds?: string[]
  outputKind?: string
  sideEffects?: 'none' | 'network'
  paramsSchema?: any // JSON Schema
}

export interface CombinePluginInfo {
  name: string
  nameJa?: string // 日文名称
  summary?: string
  paramsSchema?: any // JSON Schema
}

export interface TransformPluginsResponse {
  transforms: TransformPluginInfo[]
  combines: CombinePluginInfo[]
}

const API_BASE_URL = getApiBaseUrl()

/**
 * 获取所有映射配置
 */
export async function getAllMappingConfigs(
  configType?: string,
  searchParams?: {
    name?: string
    orderSourceCompanyName?: string
    description?: string
    isDefault?: boolean
  },
): Promise<MappingConfig[]> {
  const url = new URL(`${API_BASE_URL}/mapping-configs`)
  if (configType) {
    url.searchParams.append('configType', configType)
  }
  if (searchParams) {
    if (searchParams.name) {
      url.searchParams.append('name', searchParams.name)
    }
    if (searchParams.orderSourceCompanyName) {
      url.searchParams.append('orderSourceCompanyName', searchParams.orderSourceCompanyName)
    }
    if (searchParams.description) {
      url.searchParams.append('description', searchParams.description)
    }
    if (searchParams.isDefault !== undefined) {
      url.searchParams.append('isDefault', searchParams.isDefault ? 'true' : 'false')
    }
  }

  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`Failed to fetch mapping configs: ${response.statusText}`)
  }
  return response.json()
}

/**
 * 根据ID获取映射配置
 */
export async function getMappingConfigById(id: string): Promise<MappingConfig> {
  const response = await fetch(`${API_BASE_URL}/mapping-configs/${id}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch mapping config: ${response.statusText}`)
  }
  return response.json()
}

/**
 * 创建映射配置
 */
export async function createMappingConfig(dto: CreateMappingConfigDto): Promise<MappingConfig> {
  const response = await fetch(`${API_BASE_URL}/mapping-configs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(dto),
  })
  if (!response.ok) {
    throw new Error(`Failed to create mapping config: ${response.statusText}`)
  }
  return response.json()
}

/**
 * 更新映射配置
 */
export async function updateMappingConfig(
  id: string,
  dto: Partial<CreateMappingConfigDto>,
): Promise<MappingConfig> {
  const response = await fetch(`${API_BASE_URL}/mapping-configs/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(dto),
  })
  if (!response.ok) {
    throw new Error(`Failed to update mapping config: ${response.statusText}`)
  }
  return response.json()
}

/**
 * 删除映射配置
 */
export async function deleteMappingConfig(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/mapping-configs/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    throw new Error(`Failed to delete mapping config: ${response.statusText}`)
  }
}

/**
 * 获取 transform plugins 列表
 */
export async function getTransformPlugins(): Promise<TransformPluginsResponse> {
  const response = await fetch(`${API_BASE_URL}/mapping-configs/transform-plugins`)
  if (!response.ok) {
    throw new Error(`Failed to fetch transform plugins: ${response.statusText}`)
  }
  return response.json()
}

