import type { FormTemplate, CreateFormTemplateDto, UpdateFormTemplateDto } from '@/types/formTemplate'
import { getApiBaseUrl } from '@/api/base'
import { apiFetch } from '@/api/http'

const API_BASE_URL = getApiBaseUrl()

/**
 * すべての帳票テンプレートを取得
 */
export async function fetchFormTemplates(targetType?: string): Promise<FormTemplate[]> {
  const params = new URLSearchParams()
  if (targetType) {
    params.set('targetType', targetType)
  }
  const url = `${API_BASE_URL}/form-templates${params.toString() ? `?${params}` : ''}`
  const res = await apiFetch(url)
  if (!res.ok) {
    throw new Error(`Failed to fetch form templates: ${res.status}`)
  }
  return res.json()
}

/**
 * 帳票テンプレートを取得
 */
export async function fetchFormTemplate(id: string): Promise<FormTemplate> {
  const res = await apiFetch(`${API_BASE_URL}/form-templates/${id}`)
  if (!res.ok) {
    throw new Error(`Failed to fetch form template: ${res.status}`)
  }
  return res.json()
}

/**
 * 帳票テンプレートを作成
 */
export async function createFormTemplate(dto: CreateFormTemplateDto): Promise<FormTemplate> {
  const res = await apiFetch(`${API_BASE_URL}/form-templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  })
  if (!res.ok) {
    throw new Error(`Failed to create form template: ${res.status}`)
  }
  return res.json()
}

/**
 * 帳票テンプレートを更新
 */
export async function updateFormTemplate(id: string, dto: UpdateFormTemplateDto): Promise<FormTemplate> {
  const res = await apiFetch(`${API_BASE_URL}/form-templates/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  })
  if (!res.ok) {
    throw new Error(`Failed to update form template: ${res.status}`)
  }
  return res.json()
}

/**
 * 帳票テンプレートを削除
 */
export async function deleteFormTemplate(id: string): Promise<void> {
  const res = await apiFetch(`${API_BASE_URL}/form-templates/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    throw new Error(`Failed to delete form template: ${res.status}`)
  }
}
