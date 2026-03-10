const DEFAULT_BACKEND_ORIGIN = 'http://localhost:4000'
const DEFAULT_API_PREFIX = '/api'

function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '')
}

function normalizePathPrefix(prefix: string): string {
  const trimmed = prefix.trim()
  if (!trimmed) return ''
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

/**
 * API base url resolution priority:
 * 1) VITE_API_BASE_URL (full URL, e.g. https://example.com/api)
 * 2) VITE_BACKEND_ORIGIN + VITE_BACKEND_API_PREFIX (e.g. https://example.com + /api)
 * 3) defaults: http://localhost:4000 + /api
 */
export function getApiBaseUrl(): string {
  const explicit = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim()
  if (explicit) return trimTrailingSlashes(explicit)

  const origin = (import.meta.env.VITE_BACKEND_ORIGIN as string | undefined)?.trim() || DEFAULT_BACKEND_ORIGIN
  const prefix = (import.meta.env.VITE_BACKEND_API_PREFIX as string | undefined)?.trim() || DEFAULT_API_PREFIX

  return `${trimTrailingSlashes(origin)}${normalizePathPrefix(prefix)}`
}




