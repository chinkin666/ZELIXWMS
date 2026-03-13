import { getApiBaseUrl } from '@/api/base'

const API_BASE_URL = getApiBaseUrl()

export interface WarehouseTask {
  _id: string
  taskNumber: string
  type: 'picking' | 'putaway' | 'replenishment' | 'counting' | 'sorting' | 'packing' | 'receiving' | 'shipping'
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'
  priority: 'urgent' | 'high' | 'normal' | 'low'
  warehouseId?: string
  productId?: string
  fromLocationId?: string
  toLocationId?: string
  quantity?: number
  completedQuantity?: number
  assignedTo?: string
  assignedName?: string
  referenceType?: string
  referenceId?: string
  referenceNumber?: string
  reason?: string
  memo?: string
  startedAt?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
}

export interface TaskListParams {
  warehouseId?: string
  type?: string
  status?: string
  assignedTo?: string
  priority?: string
  page?: number
  limit?: number
}

export interface TaskListResponse {
  data: WarehouseTask[]
  total: number
}

export async function fetchTasks(params?: TaskListParams): Promise<TaskListResponse> {
  const url = new URL(`${API_BASE_URL}/tasks`)
  if (params) {
    if (params.warehouseId) url.searchParams.append('warehouseId', params.warehouseId)
    if (params.type) url.searchParams.append('type', params.type)
    if (params.status) url.searchParams.append('status', params.status)
    if (params.assignedTo) url.searchParams.append('assignedTo', params.assignedTo)
    if (params.priority) url.searchParams.append('priority', params.priority)
    if (params.page) url.searchParams.append('page', String(params.page))
    if (params.limit) url.searchParams.append('limit', String(params.limit))
  }
  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`タスクの取得に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function fetchTask(id: string): Promise<WarehouseTask> {
  const response = await fetch(`${API_BASE_URL}/tasks/${id}`)
  if (!response.ok) {
    throw new Error(`タスクの取得に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function createTask(data: Partial<WarehouseTask>): Promise<WarehouseTask> {
  const response = await fetch(`${API_BASE_URL}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`タスクの作成に失敗しました: ${message}`)
  }
  return response.json()
}

export async function assignTask(id: string, data: { assignedTo: string; assignedName?: string }): Promise<WarehouseTask> {
  const response = await fetch(`${API_BASE_URL}/tasks/${id}/assign`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`タスクの割当に失敗しました: ${message}`)
  }
  return response.json()
}

export async function startTask(id: string): Promise<WarehouseTask> {
  const response = await fetch(`${API_BASE_URL}/tasks/${id}/start`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`タスクの開始に失敗しました: ${message}`)
  }
  return response.json()
}

export async function completeTask(id: string, data: { completedQuantity: number; executedBy?: string }): Promise<WarehouseTask> {
  const response = await fetch(`${API_BASE_URL}/tasks/${id}/complete`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`タスクの完了に失敗しました: ${message}`)
  }
  return response.json()
}

export async function cancelTask(id: string, data: { reason?: string }): Promise<WarehouseTask> {
  const response = await fetch(`${API_BASE_URL}/tasks/${id}/cancel`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`タスクのキャンセルに失敗しました: ${message}`)
  }
  return response.json()
}

export async function holdTask(id: string, data: { reason?: string }): Promise<WarehouseTask> {
  const response = await fetch(`${API_BASE_URL}/tasks/${id}/hold`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`タスクの保留に失敗しました: ${message}`)
  }
  return response.json()
}

export async function fetchNextTask(params: { warehouseId: string; assignedTo: string }): Promise<WarehouseTask | null> {
  const url = new URL(`${API_BASE_URL}/tasks/next`)
  url.searchParams.append('warehouseId', params.warehouseId)
  url.searchParams.append('assignedTo', params.assignedTo)
  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`次のタスクの取得に失敗しました: ${response.statusText}`)
  }
  const data = await response.json()
  return data || null
}

export async function fetchTaskQueue(params: { warehouseId?: string; type?: string; status?: string; limit?: number }): Promise<WarehouseTask[]> {
  const url = new URL(`${API_BASE_URL}/tasks/queue`)
  if (params.warehouseId) url.searchParams.append('warehouseId', params.warehouseId)
  if (params.type) url.searchParams.append('type', params.type)
  if (params.status) url.searchParams.append('status', params.status)
  if (params.limit) url.searchParams.append('limit', String(params.limit))
  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`タスクキューの取得に失敗しました: ${response.statusText}`)
  }
  return response.json()
}
