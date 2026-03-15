/**
 * ユーザー管理 API クライアント / 用户管理 API 客户端
 */
import { getApiBaseUrl } from '@/api/base'

const API_BASE_URL = getApiBaseUrl()

// ─── 型定義 / 类型定义 ─────────────────────────────────────────────────────

export type UserRole = 'admin' | 'manager' | 'operator' | 'viewer' | 'client'

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: '管理者',
  manager: '主管',
  operator: '作業員',
  viewer: '閲覧者',
  client: '荷主',
}

export const ROLE_COLORS: Record<UserRole, string> = {
  admin: '#c62828',
  manager: '#1565c0',
  operator: '#2e7d32',
  viewer: '#6d4c41',
  client: '#7b1fa2',
}

export const ALL_ROLES: readonly UserRole[] = ['admin', 'manager', 'operator', 'viewer', 'client'] as const

export interface User {
  _id: string
  email: string
  displayName: string
  role: UserRole
  warehouseIds?: string[]
  clientId?: string
  clientName?: string
  parentUserId?: string
  phone?: string
  language?: string
  isActive: boolean
  lastLoginAt?: string
  loginCount: number
  memo?: string
  createdAt: string
  updatedAt: string
}

export interface CreateUserDto {
  email: string
  password: string
  displayName: string
  role: UserRole
  warehouseIds?: string[]
  clientId?: string
  clientName?: string
  parentUserId?: string
  phone?: string
  language?: string
  memo?: string
}

export interface UpdateUserDto {
  email?: string
  password?: string
  displayName?: string
  role?: UserRole
  warehouseIds?: string[]
  clientId?: string
  clientName?: string
  parentUserId?: string
  phone?: string
  language?: string
  memo?: string
  isActive?: boolean
}

export interface UserListParams {
  search?: string
  role?: UserRole
  page?: number
  limit?: number
  isActive?: string
}

export interface UserListResponse {
  data: User[]
  total: number
}

export interface ChangePasswordDto {
  newPassword: string
}

// ─── URL 構築 / URL 构建 ──────────────────────────────────────────────────

function buildQueryUrl(params?: UserListParams): string {
  const url = new URL(`${API_BASE_URL}/users`)
  if (params) {
    if (params.search) url.searchParams.append('search', params.search)
    if (params.role) url.searchParams.append('role', params.role)
    if (params.page) url.searchParams.append('page', String(params.page))
    if (params.limit) url.searchParams.append('limit', String(params.limit))
    if (params.isActive) url.searchParams.append('isActive', params.isActive)
  }
  return url.toString()
}

// ─── API 関数 / API 函数 ──────────────────────────────────────────────────

export async function fetchUsers(params?: UserListParams): Promise<UserListResponse> {
  const response = await fetch(buildQueryUrl(params))
  if (!response.ok) {
    throw new Error(`ユーザーの取得に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function createUser(data: CreateUserDto): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message || `ユーザーの作成に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function updateUser(id: string, data: UpdateUserDto): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message || `ユーザーの更新に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function deleteUser(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/users/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message || `ユーザーの削除に失敗しました: ${response.statusText}`)
  }
}

export async function fetchSubUsers(parentUserId: string): Promise<User[]> {
  const response = await fetch(`${API_BASE_URL}/users/${parentUserId}/sub-users`)
  if (!response.ok) {
    throw new Error(`サブユーザーの取得に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function changePassword(id: string, data: ChangePasswordDto): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/users/${id}/change-password`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message || `パスワードの変更に失敗しました: ${response.statusText}`)
  }
}
