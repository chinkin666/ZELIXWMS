import { getApiBaseUrl } from '@/api/base'
import type { Location } from '@/types/inventory'

const API_BASE_URL = getApiBaseUrl()

export async function fetchLocations(params?: {
  type?: string
  warehouseId?: string
  parentId?: string | null
  isActive?: boolean
}): Promise<Location[]> {
  const url = new URL(`${API_BASE_URL}/locations`)
  if (params?.type) url.searchParams.append('type', params.type)
  if (params?.warehouseId) url.searchParams.append('warehouseId', params.warehouseId)
  if (params?.parentId !== undefined) url.searchParams.append('parentId', params.parentId === null ? 'null' : params.parentId)
  if (params?.isActive !== undefined) url.searchParams.append('isActive', String(params.isActive))
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to fetch locations')
  return res.json()
}

export async function fetchLocation(id: string): Promise<Location> {
  const res = await fetch(`${API_BASE_URL}/locations/${id}`)
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to fetch location')
  return res.json()
}

export async function createLocation(data: Partial<Location>): Promise<Location> {
  const res = await fetch(`${API_BASE_URL}/locations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to create location')
  return res.json()
}

export async function updateLocation(id: string, data: Partial<Location>): Promise<Location> {
  const res = await fetch(`${API_BASE_URL}/locations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to update location')
  return res.json()
}

export async function deleteLocation(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/locations/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to delete location')
}

export async function seedLocations(): Promise<{ message: string; created: string[] }> {
  const res = await fetch(`${API_BASE_URL}/locations/seed`, { method: 'POST' })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to seed locations')
  return res.json()
}
