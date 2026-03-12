import { getApiBaseUrl } from '@/api/base'

const API_BASE_URL = getApiBaseUrl()

export interface EmailTemplate {
  _id: string
  name: string
  carrierId?: string | null
  carrierName?: string
  isActive: boolean
  senderName: string
  senderEmail: string
  replyToEmail?: string
  subject: string
  bodyTemplate: string
  footerText?: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface EmailTemplateListParams {
  carrierId?: string
  isActive?: string
  page?: number
  limit?: number
}

export interface EmailTemplateListResponse {
  data: EmailTemplate[]
  total: number
}

export interface EmailPreviewResponse {
  subject: string
  body: string
  footer: string
  html: string
}

export async function fetchEmailTemplates(params?: EmailTemplateListParams): Promise<EmailTemplateListResponse> {
  const url = new URL(`${API_BASE_URL}/email-templates`)
  if (params) {
    if (params.carrierId) url.searchParams.append('carrierId', params.carrierId)
    if (params.isActive !== undefined) url.searchParams.append('isActive', params.isActive)
    if (params.page) url.searchParams.append('page', String(params.page))
    if (params.limit) url.searchParams.append('limit', String(params.limit))
  }
  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`メールテンプレートの取得に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function fetchEmailTemplate(id: string): Promise<EmailTemplate> {
  const response = await fetch(`${API_BASE_URL}/email-templates/${id}`)
  if (!response.ok) {
    throw new Error(`メールテンプレートの取得に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function createEmailTemplate(data: Partial<EmailTemplate>): Promise<EmailTemplate> {
  const response = await fetch(`${API_BASE_URL}/email-templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`メールテンプレートの作成に失敗しました: ${message}`)
  }
  return response.json()
}

export async function updateEmailTemplate(id: string, data: Partial<EmailTemplate>): Promise<EmailTemplate> {
  const response = await fetch(`${API_BASE_URL}/email-templates/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`メールテンプレートの更新に失敗しました: ${message}`)
  }
  return response.json()
}

export async function deleteEmailTemplate(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/email-templates/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`メールテンプレートの削除に失敗しました: ${message}`)
  }
}

export async function previewEmailTemplate(
  templateId: string,
  sampleData?: Record<string, string>,
): Promise<EmailPreviewResponse> {
  const response = await fetch(`${API_BASE_URL}/email-templates/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ templateId, sampleData }),
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`プレビューの生成に失敗しました: ${message}`)
  }
  return response.json()
}
