/**
 * Render API routes
 * Provides batch rendering endpoint for print templates
 */

import type { Request, Response } from 'express';
import { Router } from 'express'
import type { KonvaRenderItem, BatchRenderOptions } from '@/services/render/renderService';
import { renderBatch } from '@/services/render/renderService'
import { getCacheStats, cleanupExpiredCache } from '@/services/render/renderCache'

const router = Router()

/**
 * Request body for batch render
 */
interface BatchRenderRequest {
  type: 'konva-print-template' | 'pdfmake-form'
  items: KonvaRenderItem[]
  options: {
    exportDpi?: number
    background?: 'white' | 'transparent'
    outputFormat?: 'pdf' | 'png'
  }
}

/**
 * POST /api/render/batch
 * Render multiple items and return combined PDF
 */
router.post('/batch', async (req: Request, res: Response) => {
  const body = req.body as BatchRenderRequest

  // Validate request
  if (!body.type) {
    return res.status(400).json({ error: 'Missing type field' })
  }

  if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
    return res.status(400).json({ error: 'Missing or empty items array' })
  }

  // Currently only support konva-print-template
  if (body.type !== 'konva-print-template') {
    return res.status(400).json({ error: `Unsupported render type: ${body.type}` })
  }

  try {
    const options: BatchRenderOptions = {
      exportDpi: body.options?.exportDpi || 203,
      background: body.options?.background || 'white',
    }

    // Validate items
    for (const item of body.items) {
      if (!item.templateId) {
        return res.status(400).json({ error: 'Missing templateId in item' })
      }
      if (!item.orderId) {
        return res.status(400).json({ error: 'Missing orderId in item' })
      }
    }

    console.log(`[Render] Starting batch render of ${body.items.length} items at ${options.exportDpi} DPI`)
    const startTime = Date.now()

    const pdfBuffer = await renderBatch(body.items, options)

    const duration = Date.now() - startTime
    console.log(`[Render] Batch render completed in ${duration}ms`)

    // Set response headers
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="render.pdf"',
      'Content-Length': pdfBuffer.length.toString(),
    })

    return res.send(pdfBuffer)
  } catch (error) {
    console.error('[Render] Batch render error:', error)
    return res.status(500).json({
      error: 'Rendering failed',
      message: error instanceof Error ? error.message : String(error),
    })
  }
})

/**
 * GET /api/render/health
 * Health check endpoint
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'render' })
})

/**
 * GET /api/render/cache/stats
 * Get cache statistics
 */
router.get('/cache/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await getCacheStats()
    res.json({
      totalFiles: stats.totalFiles,
      totalSizeMB: Math.round((stats.totalSizeBytes / 1024 / 1024) * 100) / 100,
      oldestFile: stats.oldestFile ? new Date(stats.oldestFile).toISOString() : null,
      newestFile: stats.newestFile ? new Date(stats.newestFile).toISOString() : null,
    })
  } catch (_error) {
    res.status(500).json({ error: 'Failed to get cache stats' })
  }
})

/**
 * POST /api/render/cache/cleanup
 * Manually trigger cache cleanup
 */
router.post('/cache/cleanup', async (_req: Request, res: Response) => {
  try {
    const result = await cleanupExpiredCache()
    res.json({
      deleted: result.deleted,
      errors: result.errors,
    })
  } catch (_error) {
    res.status(500).json({ error: 'Failed to cleanup cache' })
  }
})

export { router as renderRouter }
