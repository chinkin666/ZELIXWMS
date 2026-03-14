import { getApiBaseUrl } from '@/api/base'
import noImageSrc from '@/assets/images/no_image.png'

/**
 * Server origin (without /api suffix).
 * Used for resolving relative image paths served by the backend.
 */
const SERVER_BASE = getApiBaseUrl().replace(/\/api$/, '')

/**
 * Resolve a product image URL that may be relative (e.g. `/uploads/xxx.png`)
 * into a fully-qualified URL.
 *
 * @param url - raw image URL from the backend (may be relative or absolute)
 * @param fallback - fallback image when url is falsy (defaults to no_image.png)
 */
export function resolveImageUrl(url?: string, fallback: string = noImageSrc): string {
  if (!url) return fallback
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${SERVER_BASE}${url.startsWith('/') ? '' : '/'}${url}`
}
