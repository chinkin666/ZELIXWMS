/**
 * PDF assembler using Muhammara
 * Direct single-pass merge for optimal performance
 */

import muhammara from 'muhammara'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { logger } from '@/lib/logger'

export interface PdfPage {
  pdfPath?: string
  pngPath?: string
  pngBuffer?: Buffer | Uint8Array
  pdfBuffer?: Buffer | Uint8Array
  widthMm: number
  heightMm: number
}

export interface AssemblePdfOptions {
  title?: string
  author?: string
}

/**
 * Assemble PDFs using direct single-pass Muhammara merge
 * Writes each page only once (no intermediate batch files)
 */
export async function assemblePdf(
  pages: PdfPage[],
  options: AssemblePdfOptions = {}
): Promise<Buffer> {
  const totalPages = pages.length
  logger.info(`[PDF] Starting direct Muhammara assembly of ${totalPages} pages...`)

  // Validate all PDF files exist
  for (let i = 0; i < pages.length; i++) {
    if (!pages[i].pdfPath) {
      throw new Error(`No PDF path provided for page ${i}`)
    }
    if (!fs.existsSync(pages[i].pdfPath!)) {
      throw new Error(`PDF file not found: ${pages[i].pdfPath}`)
    }
  }

  const startTime = Date.now()
  const finalPath = path.join(os.tmpdir(), `nexand-final-${Date.now()}-${process.pid}.pdf`)

  try {
    // Create final PDF writer
    const pdfWriter = muhammara.createWriter(finalPath)

    // Set PDF metadata
    try {
      const context = pdfWriter.getDocumentContext()
      const infoDict = context.getInfoDictionary()

      if (options.title) infoDict.title = options.title
      if (options.author) infoDict.author = options.author
      infoDict.creator = 'Nexand Render Service'
      infoDict.producer = 'Muhammara'
    } catch (error) {
      logger.warn({ err: error }, '[PDF] Failed to set metadata')
    }

    // Direct merge: append each single-page PDF directly to final output
    for (let i = 0; i < pages.length; i++) {
      pdfWriter.appendPDFPagesFromPDF(pages[i].pdfPath!, {
        type: muhammara.eRangeTypeAll,
      })

      // Progress logging every 500 pages
      if ((i + 1) % 500 === 0 || i === pages.length - 1) {
        logger.info(`[PDF] Merged ${i + 1}/${totalPages} pages...`)
      }
    }

    pdfWriter.end()

    const totalTime = Date.now() - startTime
    logger.info(`[PDF] Assembly complete: ${totalPages} pages in ${totalTime}ms`)

    // Read final PDF into buffer
    const pdfBuffer = fs.readFileSync(finalPath)

    // Cleanup final temp file
    fs.unlinkSync(finalPath)

    return pdfBuffer
  } catch (error) {
    // Cleanup on error
    if (fs.existsSync(finalPath)) {
      try {
        fs.unlinkSync(finalPath)
      } catch (cleanupError) {
        logger.error({ err: cleanupError }, `[PDF] Failed to cleanup ${finalPath}`)
      }
    }
    throw error
  }
}
