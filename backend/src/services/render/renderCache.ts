/**
 * Render cache service
 * File-based caching for rendered PNG pages with 30-day retention
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

// Cache directory - use environment variable or default to data/render-cache
const CACHE_DIR = process.env.RENDER_CACHE_DIR || path.join(process.cwd(), 'data', 'render-cache')

// Cache retention period (30 days in milliseconds)
const CACHE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000

// Ensure cache directory exists
let cacheInitialized = false

function ensureCacheDir(): void {
  if (cacheInitialized) return

  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true })
    console.log(`[RenderCache] Created cache directory: ${CACHE_DIR}`)
  }
  cacheInitialized = true
}

/**
 * Generate cache key from render parameters
 */
export function getCacheKey(
  templateId: string,
  orderId: string,
  exportDpi: number
): string {
  const data = `${templateId}:${orderId}:${exportDpi}`
  return crypto.createHash('md5').update(data).digest('hex')
}

/**
 * Get cache file path for a given key
 */
function getCacheFilePath(cacheKey: string): string {
  // Use first 2 chars as subdirectory for better file system performance
  const subDir = cacheKey.substring(0, 2)
  return path.join(CACHE_DIR, subDir, `${cacheKey}.png`)
}

/**
 * Get cache PDF file path (single-page PDF for fast merging)
 */
function getCachePdfFilePath(cacheKey: string): string {
  const subDir = cacheKey.substring(0, 2)
  return path.join(CACHE_DIR, subDir, `${cacheKey}.pdf`)
}

/**
 * Get cache metadata file path
 */
function getMetadataFilePath(cacheKey: string): string {
  const subDir = cacheKey.substring(0, 2)
  return path.join(CACHE_DIR, subDir, `${cacheKey}.json`)
}

export interface CacheMetadata {
  templateId: string
  orderId: string
  exportDpi: number
  widthMm: number
  heightMm: number
  createdAt: number
  orderUpdatedAt?: number // carrierReceipt.receivedAt timestamp
}

// Cache hit/miss statistics for logging
let cacheHits = 0
let cacheMisses = 0
let lastStatsLog = Date.now()

function logCacheStats(): void {
  const now = Date.now()
  // Log stats every 10 seconds if there's activity
  if (now - lastStatsLog > 10000 && (cacheHits > 0 || cacheMisses > 0)) {
    const total = cacheHits + cacheMisses
    const hitRate = total > 0 ? Math.round((cacheHits / total) * 100) : 0
    console.log(`[RenderCache] Stats: ${cacheHits} hits, ${cacheMisses} misses (${hitRate}% hit rate)`)
    cacheHits = 0
    cacheMisses = 0
    lastStatsLog = now
  }
}

/**
 * Get file paths for cached render (lightweight, no buffer loading)
 * Returns null if cache invalid/missing
 */
export function getCachedRenderPaths(
  cacheKey: string,
  orderUpdatedAt?: Date | null
): { pdfPath: string; pngPath: string; metadata: CacheMetadata } | null {
  ensureCacheDir()

  const pngPath = getCacheFilePath(cacheKey)
  const pdfPath = getCachePdfFilePath(cacheKey)
  const metadataPath = getMetadataFilePath(cacheKey)

  // Check if cache files exist
  if (!fs.existsSync(pngPath) || !fs.existsSync(metadataPath)) {
    cacheMisses++
    logCacheStats()
    return null
  }

  try {
    // Read metadata
    const metadataRaw = fs.readFileSync(metadataPath, 'utf-8')
    const metadata: CacheMetadata = JSON.parse(metadataRaw)

    // Check if order has been updated since cache was created
    if (orderUpdatedAt) {
      const orderUpdateTime = orderUpdatedAt.getTime()
      const cacheCreateTime = metadata.createdAt

      if (orderUpdateTime > cacheCreateTime) {
        cacheMisses++
        logCacheStats()
        return null
      }
    }

    // Check if cache is expired (30 days)
    const now = Date.now()
    if (now - metadata.createdAt > CACHE_RETENTION_MS) {
      cacheMisses++
      logCacheStats()
      return null
    }

    cacheHits++
    logCacheStats()

    return {
      pdfPath: fs.existsSync(pdfPath) ? pdfPath : '',
      pngPath,
      metadata,
    }
  } catch (error) {
    console.error('[RenderCache] Error reading cache metadata:', error)
    cacheMisses++
    logCacheStats()
    return null
  }
}

/**
 * Check if cache is valid for the given order
 * Returns the cached PNG and PDF buffers if valid, null otherwise
 */
export async function getCachedRender(
  cacheKey: string,
  orderUpdatedAt?: Date | null
): Promise<{ pngBuffer: Buffer; pdfBuffer: Buffer | null; metadata: CacheMetadata } | null> {
  ensureCacheDir()

  const filePath = getCacheFilePath(cacheKey)
  const pdfPath = getCachePdfFilePath(cacheKey)
  const metadataPath = getMetadataFilePath(cacheKey)

  // Check if cache files exist
  if (!fs.existsSync(filePath) || !fs.existsSync(metadataPath)) {
    cacheMisses++
    logCacheStats()
    return null
  }

  try {
    // Read metadata
    const metadataRaw = fs.readFileSync(metadataPath, 'utf-8')
    const metadata: CacheMetadata = JSON.parse(metadataRaw)

    // Check if order has been updated since cache was created
    if (orderUpdatedAt) {
      const orderUpdateTime = orderUpdatedAt.getTime()
      const cacheCreateTime = metadata.createdAt

      // If order was updated after cache was created, cache is invalid
      if (orderUpdateTime > cacheCreateTime) {
        cacheMisses++
        logCacheStats()
        return null
      }
    }

    // Check if cache is expired (30 days)
    const now = Date.now()
    if (now - metadata.createdAt > CACHE_RETENTION_MS) {
      // Cache expired, delete files
      try {
        fs.unlinkSync(filePath)
        fs.unlinkSync(metadataPath)
        if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath)
      } catch {
        // Ignore deletion errors
      }
      cacheMisses++
      logCacheStats()
      return null
    }

    // Cache is valid, read PNG buffer
    const pngBuffer = fs.readFileSync(filePath)

    // Read PDF buffer if exists
    let pdfBuffer: Buffer | null = null
    if (fs.existsSync(pdfPath)) {
      pdfBuffer = fs.readFileSync(pdfPath)
    }

    cacheHits++
    logCacheStats()
    return { pngBuffer, pdfBuffer, metadata }
  } catch (error) {
    console.warn(`[RenderCache] Failed to read cache for ${cacheKey}:`, error)
    cacheMisses++
    logCacheStats()
    return null
  }
}

/**
 * Save rendered PNG and PDF to cache
 */
export async function setCachedRender(
  cacheKey: string,
  pngBuffer: Buffer,
  pdfBuffer: Buffer,
  metadata: Omit<CacheMetadata, 'createdAt'>
): Promise<void> {
  ensureCacheDir()

  const filePath = getCacheFilePath(cacheKey)
  const pdfPath = getCachePdfFilePath(cacheKey)
  const metadataPath = getMetadataFilePath(cacheKey)

  // Ensure subdirectory exists
  const subDir = path.dirname(filePath)
  if (!fs.existsSync(subDir)) {
    fs.mkdirSync(subDir, { recursive: true })
  }

  try {
    // Write PNG file
    fs.writeFileSync(filePath, pngBuffer)

    // Write PDF file
    fs.writeFileSync(pdfPath, pdfBuffer)

    // Write metadata
    const fullMetadata: CacheMetadata = {
      ...metadata,
      createdAt: Date.now(),
    }
    fs.writeFileSync(metadataPath, JSON.stringify(fullMetadata))
  } catch (error) {
    console.warn(`[RenderCache] Failed to write cache for ${cacheKey}:`, error)
  }
}

/**
 * Clean up expired cache files (older than 30 days)
 * Should be called periodically (e.g., once per day)
 */
export async function cleanupExpiredCache(): Promise<{ deleted: number; errors: number }> {
  ensureCacheDir()

  const now = Date.now()
  let deleted = 0
  let errors = 0

  try {
    // Iterate through subdirectories
    const subDirs = fs.readdirSync(CACHE_DIR)

    for (const subDir of subDirs) {
      const subDirPath = path.join(CACHE_DIR, subDir)
      const stat = fs.statSync(subDirPath)

      if (!stat.isDirectory()) continue

      const files = fs.readdirSync(subDirPath)

      for (const file of files) {
        if (!file.endsWith('.json')) continue

        const metadataPath = path.join(subDirPath, file)
        const pngPath = metadataPath.replace('.json', '.png')

        try {
          const metadataRaw = fs.readFileSync(metadataPath, 'utf-8')
          const metadata: CacheMetadata = JSON.parse(metadataRaw)

          if (now - metadata.createdAt > CACHE_RETENTION_MS) {
            // Delete expired files
            const pdfPath = metadataPath.replace('.json', '.pdf')
            if (fs.existsSync(pngPath)) fs.unlinkSync(pngPath)
            if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath)
            fs.unlinkSync(metadataPath)
            deleted++
          }
        } catch {
          errors++
        }
      }

      // Remove empty subdirectories
      const remainingFiles = fs.readdirSync(subDirPath)
      if (remainingFiles.length === 0) {
        fs.rmdirSync(subDirPath)
      }
    }
  } catch (error) {
    console.error('[RenderCache] Cleanup error:', error)
  }

  console.log(`[RenderCache] Cleanup completed: ${deleted} deleted, ${errors} errors`)
  return { deleted, errors }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  totalFiles: number
  totalSizeBytes: number
  oldestFile: number | null
  newestFile: number | null
}> {
  ensureCacheDir()

  let totalFiles = 0
  let totalSizeBytes = 0
  let oldestFile: number | null = null
  let newestFile: number | null = null

  try {
    const subDirs = fs.readdirSync(CACHE_DIR)

    for (const subDir of subDirs) {
      const subDirPath = path.join(CACHE_DIR, subDir)
      const stat = fs.statSync(subDirPath)

      if (!stat.isDirectory()) continue

      const files = fs.readdirSync(subDirPath)

      for (const file of files) {
        if (!file.endsWith('.png')) continue

        const filePath = path.join(subDirPath, file)
        const fileStat = fs.statSync(filePath)

        totalFiles++
        totalSizeBytes += fileStat.size

        const mtime = fileStat.mtimeMs
        if (oldestFile === null || mtime < oldestFile) oldestFile = mtime
        if (newestFile === null || mtime > newestFile) newestFile = mtime
      }
    }
  } catch (error) {
    console.error('[RenderCache] Stats error:', error)
  }

  return { totalFiles, totalSizeBytes, oldestFile, newestFile }
}
