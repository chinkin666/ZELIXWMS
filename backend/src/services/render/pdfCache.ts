/**
 * Simple PDF cache using orderNumber as filename
 * Stores in /backend/tmp/pdf-render/
 * Cache is valid until order's carrierReceipt.receivedAt changes
 */

import fs from 'fs'
import path from 'path'

// PDF cache directory: /backend/tmp/pdf-render/
const CACHE_DIR = path.join(process.cwd(), 'tmp', 'pdf-render')

// Ensure cache directory exists
function ensureCacheDir(): void {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true })
    console.log(`[PDFCache] Created cache directory: ${CACHE_DIR}`)
  }
}

/**
 * Get PDF cache file path for an order
 */
export function getPdfCachePath(orderNumber: string): string {
  ensureCacheDir()
  // Sanitize orderNumber to be filesystem-safe
  const safeOrderNumber = orderNumber.replace(/[^a-zA-Z0-9_-]/g, '_')
  return path.join(CACHE_DIR, `${safeOrderNumber}.pdf`)
}

/**
 * Check if cached PDF is valid
 * Returns file path if valid, null if cache miss or invalid
 */
export function checkPdfCache(
  orderNumber: string,
  orderUpdatedAt?: Date | null
): string | null {
  const cachePath = getPdfCachePath(orderNumber)

  // Check if file exists
  if (!fs.existsSync(cachePath)) {
    return null
  }

  // If orderUpdatedAt provided, check if cache is still valid
  if (orderUpdatedAt) {
    try {
      const stat = fs.statSync(cachePath)
      const cacheTime = stat.mtimeMs
      const orderTime = orderUpdatedAt.getTime()

      // If order was updated after cache was created, cache is invalid
      if (orderTime > cacheTime) {
        console.log(`[PDFCache] Cache invalid for ${orderNumber}: order updated after cache`)
        return null
      }
    } catch (error) {
      console.error(`[PDFCache] Error checking cache for ${orderNumber}:`, error)
      return null
    }
  }

  return cachePath
}

/**
 * Save PDF to cache
 */
export async function savePdfToCache(
  orderNumber: string,
  pdfBuffer: Buffer
): Promise<string> {
  ensureCacheDir()
  const cachePath = getPdfCachePath(orderNumber)

  try {
    fs.writeFileSync(cachePath, pdfBuffer)
    return cachePath
  } catch (error) {
    console.error(`[PDFCache] Failed to save cache for ${orderNumber}:`, error)
    throw error
  }
}

/**
 * Get cache directory path
 */
export function getCacheDir(): string {
  ensureCacheDir()
  return CACHE_DIR
}

/**
 * Clean up old cache files (older than 30 days)
 */
export async function cleanupOldCache(): Promise<{ deleted: number; errors: number }> {
  ensureCacheDir()

  const now = Date.now()
  const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000 // 30 days
  let deleted = 0
  let errors = 0

  try {
    const files = fs.readdirSync(CACHE_DIR)

    for (const file of files) {
      if (!file.endsWith('.pdf')) continue

      const filePath = path.join(CACHE_DIR, file)

      try {
        const stat = fs.statSync(filePath)
        const age = now - stat.mtimeMs

        if (age > MAX_AGE_MS) {
          fs.unlinkSync(filePath)
          deleted++
        }
      } catch (error) {
        errors++
        console.error(`[PDFCache] Error processing ${file}:`, error)
      }
    }

    if (deleted > 0 || errors > 0) {
      console.log(`[PDFCache] Cleanup: ${deleted} deleted, ${errors} errors`)
    }
  } catch (error) {
    console.error('[PDFCache] Cleanup error:', error)
  }

  return { deleted, errors }
}
