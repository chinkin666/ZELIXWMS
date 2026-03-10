import { PDFDocument } from 'pdf-lib'

export type GenerateMultiPagePdfOptions = {
  widthMm: number
  heightMm: number
}

/**
 * Generate a multi-page PDF from multiple PNG blobs.
 * Each PNG blob becomes one page in the PDF.
 */
export async function generateMultiPagePdf(
  pngBlobs: Blob[],
  options: GenerateMultiPagePdfOptions,
): Promise<Blob> {
  const pdfDoc = await PDFDocument.create()

  for (const pngBlob of pngBlobs) {
    // Convert mm to points (1mm = 2.83465 points)
    const widthPt = options.widthMm * 2.83465
    const heightPt = options.heightMm * 2.83465

    // Embed PNG image
    const pngBytes = await pngBlob.arrayBuffer()
    const pngImage = await pdfDoc.embedPng(pngBytes)

    // Get image dimensions
    const imgDims = pngImage.scale(1)
    const imgWidth = imgDims.width
    const imgHeight = imgDims.height

    // Calculate scaling to fit the page
    const scaleX = widthPt / imgWidth
    const scaleY = heightPt / imgHeight
    const scale = Math.min(scaleX, scaleY)

    // Calculate centered position
    const scaledWidth = imgWidth * scale
    const scaledHeight = imgHeight * scale
    const x = (widthPt - scaledWidth) / 2
    const y = (heightPt - scaledHeight) / 2

    // Add page
    const page = pdfDoc.addPage([widthPt, heightPt])
    page.drawImage(pngImage, {
      x,
      y,
      width: scaledWidth,
      height: scaledHeight,
    })
  }

  const pdfBytes = await pdfDoc.save()
  return new Blob([pdfBytes as BlobPart], { type: 'application/pdf' })
}

