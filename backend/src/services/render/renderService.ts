/**
 * Render service - main entry point for backend rendering
 * Coordinates template fetching, rendering, and PDF assembly
 * Includes file-based caching with 30-day retention
 * Uses Worker Threads for parallel rendering
 */

import Piscina from 'piscina'
import path from 'path'
import { assemblePdf, PdfPage } from './konva/pdfAssembler'
import { PrintTemplate as PrintTemplateModel } from '@/models/printTemplate'
import { ShipmentOrder as ShipmentOrderModel } from '@/models/shipmentOrder'
import { OrderSourceCompany as OrderSourceCompanyModel } from '@/models/orderSourceCompany'
import { cleanupOldCache } from './pdfCache'
import type { PrintTemplate } from './konva/skiaRenderer'

export interface KonvaRenderItem {
  templateId: string
  orderId: string
  orderSourceCompanyId?: string
}

export interface BatchRenderOptions {
  exportDpi: number
  background?: 'white' | 'transparent'
}

// Schedule cache cleanup once per day
let cleanupScheduled = false
function scheduleCleanup(): void {
  if (cleanupScheduled) return
  cleanupScheduled = true

  // Run cleanup immediately on first load
  setTimeout(() => {
    cleanupOldCache().catch((err) => console.error('[PDFCache] Cleanup error:', err))
  }, 5000)

  // Then run every 24 hours
  setInterval(
    () => {
      cleanupOldCache().catch((err) => console.error('[PDFCache] Cleanup error:', err))
    },
    24 * 60 * 60 * 1000
  )
}

// Start cleanup schedule
scheduleCleanup()

// buildPrintContext and runTransformMapping moved to renderWorker.ts

/**
 * Render a batch of items and return combined PDF
 * Uses Worker Threads for true parallel rendering
 */
export async function renderBatch(
  items: KonvaRenderItem[],
  options: BatchRenderOptions
): Promise<Buffer> {
  const startTime = Date.now()

  // Step 1: Batch prefetch all data to avoid N+1 queries
  console.log(`[Render] Prefetching data for ${items.length} items...`)
  const prefetchStart = Date.now()

  // Collect unique IDs
  const orderIds = [...new Set(items.map((i) => i.orderId))]
  const templateIds = [...new Set(items.map((i) => i.templateId))]
  const companyIds = [...new Set(items.map((i) => i.orderSourceCompanyId).filter(Boolean))]

  // Fetch all data in parallel
  const [orderDocs, templateDocs, companyDocs] = await Promise.all([
    ShipmentOrderModel.find({ _id: { $in: orderIds } }),
    PrintTemplateModel.find({ _id: { $in: templateIds } }),
    companyIds.length > 0
      ? OrderSourceCompanyModel.find({ _id: { $in: companyIds } })
      : Promise.resolve([]),
  ])

  // Build lookup maps
  const orderMap = new Map(orderDocs.map((doc) => [String(doc._id), doc.toObject()]))
  const templateMap = new Map(
    templateDocs.map((doc) => [String(doc._id), doc.toObject() as unknown as PrintTemplate])
  )
  const companyMap = new Map(companyDocs.map((doc) => [String(doc._id), doc.toObject()]))

  const prefetchTime = Date.now() - prefetchStart
  console.log(`[Render] Prefetched data in ${prefetchTime}ms`)

  // Step 2: Create Worker Pool
  // In development, use .ts files directly; in production, use compiled .js files
  const workerPath = path.resolve(
    __dirname,
    'konva',
    process.env.NODE_ENV === 'production' ? 'renderWorker.js' : 'renderWorker.ts'
  )

  // Determine worker count - use 16 for large batches to maximize parallelism
  // For small batches, use fewer workers to reduce overhead
  const workerCount = items.length > 100 ? 16 : Math.min(items.length, 8)

  const pool = new Piscina({
    filename: workerPath,
    minThreads: workerCount,
    maxThreads: workerCount, // Force exact worker count
    idleTimeout: 60000,
    // Enable TypeScript support in development
    execArgv: process.env.NODE_ENV !== 'production' ? ['-r', 'ts-node/register'] : undefined,
  })

  // Wait for workers to initialize
  await new Promise((resolve) => setTimeout(resolve, 100))

  console.log(
    `[Render] Dispatching ${items.length} items to ${workerCount} workers (pool has ${pool.threads.length} threads)...`
  )

  // Step 3: Stream processing with fixed concurrency (maintain 16 workers)
  // Complete one, release memory, add next one - never accumulate results
  const renderStart = Date.now()
  let completedCount = 0
  const progressInterval = setInterval(() => {
    console.log(
      `[Render] Progress: ${completedCount}/${items.length} (${Math.round((completedCount / items.length) * 100)}%)`
    )
  }, 5000)

  // Write results to temp file instead of keeping in memory
  const fs = await import('fs')
  const os = await import('os')
  const resultFilePath = path.join(os.tmpdir(), `nexand-results-${Date.now()}-${process.pid}.jsonl`)
  const resultStream = fs.createWriteStream(resultFilePath, { flags: 'a' })

  // Task queue: process with fixed concurrency
  let taskIndex = 0
  const runningTasks = new Set<Promise<void>>()

  // Worker task processor
  const processTask = async (index: number): Promise<void> => {
    const item = items[index]
    const order = orderMap.get(item.orderId)
    const template = templateMap.get(item.templateId)
    const company = item.orderSourceCompanyId ? companyMap.get(item.orderSourceCompanyId) : null

    if (!order) {
      throw new Error(`Order not found: ${item.orderId}`)
    }
    if (!template) {
      throw new Error(`Template not found: ${item.templateId}`)
    }

    try {
      // Dispatch to worker
      const result = await pool.run({
        item,
        order,
        template,
        company,
        options,
        index,
      })

      // Write result immediately, don't keep in memory
      resultStream.write(JSON.stringify(result) + '\n')

      completedCount++
    } catch (error) {
      console.error(`[Render] Task ${index} failed:`, error)
      // Write error result
      resultStream.write(
        JSON.stringify({
          success: false,
          index,
          error: (error as Error).message || String(error),
        }) + '\n'
      )
    }
  }

  // Start processing: maintain exactly workerCount concurrent tasks
  while (taskIndex < items.length || runningTasks.size > 0) {
    // Fill up to workerCount concurrent tasks
    while (runningTasks.size < workerCount && taskIndex < items.length) {
      const currentIndex = taskIndex++
      const task = processTask(currentIndex).then(() => {
        runningTasks.delete(task)
      })
      runningTasks.add(task)
    }

    // Wait for at least one task to complete before adding more
    if (runningTasks.size > 0) {
      await Promise.race(runningTasks)
    }
  }

  // Close result stream
  resultStream.end()
  await new Promise((resolve) => resultStream.on('finish', () => resolve(undefined)))

  clearInterval(progressInterval)

  const renderTime = Date.now() - renderStart
  console.log(`[Render] Rendered ${items.length} pages in ${renderTime}ms`)

  // Clear data maps immediately (workers still running in background)
  orderMap.clear()
  templateMap.clear()
  companyMap.clear()

  console.log('[Render] Proceeding to PDF assembly (workers will auto-cleanup)...')

  // NOTE: We intentionally DON'T call pool.destroy() here
  // Destroying the pool while native resources (skia-canvas) are cleaning up causes crashes
  // Instead, we let Piscina's idleTimeout (60s) handle worker cleanup naturally
  // The workers will terminate on their own after being idle

  // Step 4: Read results from file and assemble PDF
  const pdfStartTime = Date.now()

  // Read results from file
  const results: any[] = []
  const resultFileContent = fs.readFileSync(resultFilePath, 'utf-8')
  const lines = resultFileContent.trim().split('\n')

  for (const line of lines) {
    if (line) {
      results.push(JSON.parse(line))
    }
  }

  // Delete temp result file
  fs.unlinkSync(resultFilePath)

  // Sort by original index
  results.sort((a: any, b: any) => a.index - b.index)

  // Collect PDF paths
  const pdfPages: PdfPage[] = []
  for (const result of results) {
    if (!result.success) {
      throw new Error(result.error || 'Render failed')
    }

    if (result.result) {
      pdfPages.push({
        pdfPath: result.result.pdfPath,
        widthMm: result.result.widthMm,
        heightMm: result.result.heightMm,
      })
    }
  }

  // Free results array
  results.length = 0

  console.log(`[Render] Assembling ${pdfPages.length} pages from cache...`)

  const pdfBuffer = await assemblePdf(pdfPages, {
    title: 'Print Labels',
    author: 'Nexand Render Service',
  })

  const pdfTime = Date.now() - pdfStartTime
  const totalTime = Date.now() - startTime
  console.log(
    `[Render] Assembled PDF in ${pdfTime}ms, total: ${totalTime}ms (prefetch: ${prefetchTime}ms, render: ${renderTime}ms, pdf: ${pdfTime}ms)`
  )

  // Free results array
  results.length = 0

  // NOTE: We don't call pool.destroy() here because:
  // 1. Workers will auto-terminate after idleTimeout (60s)
  // 2. Calling destroy() with native resources still cleaning up causes crashes
  // 3. The PDF has already been returned to the client, so cleanup can be lazy
  console.log('[Render] Worker pool will auto-cleanup after 60s idle')

  return pdfBuffer
}
