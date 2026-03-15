import {
  getPrintConfig,
  getPrintParamsForPrintTemplate,
  getPrintParamsForFormTemplate,
  getPrintParamsForB2Cloud,
  type TemplatePrintParams,
} from './printConfig'

export type PrintImageOptions = {
  widthMm: number
  heightMm: number
  /** optional window title */
  title?: string
  /** Prefer opening a new tab/window. Default: false (use hidden iframe for reliability). */
  useNewWindow?: boolean
  /** Template ID for per-template printer settings (local bridge only) */
  templateId?: string
  /** Template type: 'print' for 印刷テンプレート, 'form' for 帳票テンプレート, 'b2-cloud' for B2 Cloud PDF */
  templateType?: 'print' | 'form' | 'b2-cloud'
  /** 送り状種類 (required when templateType is 'b2-cloud', e.g. '0'-'9','A') */
  invoiceType?: string
}

/**
 * Print an image via browser dialog or local print bridge.
 *
 * The print method is determined by the global print configuration.
 * When using local bridge, per-template printer settings are applied.
 */
export async function printImage(blobUrl: string, opts: PrintImageOptions): Promise<Window | null> {
  const config = getPrintConfig()

  if (config.method === 'local-bridge') {
    return await printImageViaLocalBridge(blobUrl, config.localBridge.serviceUrl, opts)
  }

  // Browser print
  if (!opts.useNewWindow) {
    return printImageViaIframe(blobUrl, opts)
  }

  const w = window.open('', '_blank', 'noopener')
  if (!w) return null

  const title = opts.title ?? 'Print'
  const { widthMm, heightMm } = opts

  w.document.open()
  w.document.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      @page { size: ${widthMm}mm ${heightMm}mm; margin: 0; }
      html, body { width: ${widthMm}mm; height: ${heightMm}mm; margin: 0; padding: 0; }
      img { width: ${widthMm}mm; height: ${heightMm}mm; display: block; }
    </style>
  </head>
  <body>
    <img id="img" src="${blobUrl}" />
    <script>
      const img = document.getElementById('img');
      img.addEventListener('load', () => {
        setTimeout(() => { window.focus(); window.print(); }, 100);
      });
      img.addEventListener('error', () => {
        console.error('Failed to load print image:', img && img.src);
      });
      setTimeout(() => {
        try { window.focus(); window.print(); } catch {}
      }, 1500);
    </script>
  </body>
</html>`)
  w.document.close()
  return w
}

function printImageViaIframe(blobUrl: string, opts: PrintImageOptions): Window | null {
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  iframe.style.visibility = 'hidden'
  iframe.setAttribute('aria-hidden', 'true')

  const id = `print_${Date.now()}_${Math.random().toString(36).slice(2)}`
  const title = opts.title ?? 'Print'
  const { widthMm, heightMm } = opts

  const cleanup = () => {
    window.removeEventListener('message', onMessage)
    iframe.remove()
  }

  let didPrint = false
  const onMessage = (ev: MessageEvent) => {
    if (ev.source !== iframe.contentWindow) return
    const data = ev.data
    if (!data || data.id !== id) return

    if (data.type === 'print-image-error') {
      // 印刷画像読み込み失敗 / Print image failed to load
      cleanup()
      return
    }

    if (data.type === 'print-image-loaded') {
      if (didPrint) return
      didPrint = true
      window.removeEventListener('message', onMessage)
      try {
        const w = iframe.contentWindow
        if (w) {
          w.focus()
          w.print()
        }
      } catch (e) {
        // 印刷トリガー失敗 / Failed to trigger print
      } finally {
        setTimeout(cleanup, 3000)
      }
    }
  }

  window.addEventListener('message', onMessage)

  iframe.srcdoc = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      @page { size: ${widthMm}mm ${heightMm}mm; margin: 0; }
      html, body { width: ${widthMm}mm; height: ${heightMm}mm; margin: 0; padding: 0; }
      img { width: ${widthMm}mm; height: ${heightMm}mm; display: block; }
    </style>
  </head>
  <body>
    <img id="img" src="${blobUrl}" />
    <script>
      const id = ${JSON.stringify(id)};
      const img = document.getElementById('img');
      let sent = false;
      function notify(type, extra) {
        if (sent) return;
        sent = true;
        parent.postMessage(Object.assign({ type, id }, extra || {}), '*');
      }
      img.addEventListener('load', () => notify('print-image-loaded'));
      img.addEventListener('error', () => notify('print-image-error', { error: 'img.onerror: ' + (img && img.src) }));
      setTimeout(() => {
        try {
          if (!img) return;
          if (!img.complete) return;
          notify('print-image-loaded');
        } catch {}
      }, 1500);
    </script>
  </body>
</html>`

  document.body.appendChild(iframe)
  return iframe.contentWindow
}

/**
 * Resolve print params for a given template.
 */
function resolveTemplateParams(opts: { templateId?: string; templateType?: 'print' | 'form' | 'b2-cloud'; invoiceType?: string }): TemplatePrintParams | undefined {
  if (opts.templateType === 'b2-cloud') {
    return getPrintParamsForB2Cloud(opts.invoiceType || '0')
  }
  if (!opts.templateId) return undefined
  if (opts.templateType === 'form') {
    return getPrintParamsForFormTemplate(opts.templateId)
  }
  // Default to print template
  return getPrintParamsForPrintTemplate(opts.templateId)
}

/**
 * Print image via local print bridge service.
 */
async function printImageViaLocalBridge(
  blobUrl: string,
  serviceUrl: string,
  opts: PrintImageOptions,
): Promise<Window | null> {
  try {
    const response = await fetch(blobUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`)
    }
    const blob = await response.blob()

    const params = resolveTemplateParams(opts)

    const { printFile } = await import('./printBridgeApi')
    await printFile(serviceUrl, blob, params, 'print.png')

    return null
  } catch (error: any) {
    // ローカルブリッジ印刷失敗、ブラウザ印刷にフォールバック / Local bridge failed, falling back to browser print
    if (!opts.useNewWindow) {
      return printImageViaIframe(blobUrl, opts)
    }
    throw error
  }
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Print a PDF blob using browser's print dialog or local print bridge.
 */
export async function printPdfBlob(
  pdfBlob: Blob,
  opts?: {
    title?: string
    templateId?: string
    templateType?: 'print' | 'form' | 'b2-cloud'
    /** 送り状種類 (for b2-cloud) */
    invoiceType?: string
  },
): Promise<void> {
  const config = getPrintConfig()

  if (config.method === 'local-bridge') {
    try {
      const params = opts ? resolveTemplateParams(opts) : undefined
      const { printFile } = await import('./printBridgeApi')
      await printFile(config.localBridge.serviceUrl, pdfBlob, params, 'print.pdf')
      return
    } catch (error: any) {
      // ローカルブリッジPDF印刷失敗 / Failed to print PDF via local bridge
      // Fall through to browser print
    }
  }

  const blobUrl = URL.createObjectURL(pdfBlob)

  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  iframe.style.visibility = 'hidden'
  iframe.setAttribute('aria-hidden', 'true')
  iframe.src = blobUrl

  let cleaned = false
  const cleanup = () => {
    if (cleaned) return
    cleaned = true
    iframe.remove()
    URL.revokeObjectURL(blobUrl)
  }

  iframe.onload = () => {
    try {
      const contentWindow = iframe.contentWindow
      if (!contentWindow) {
        throw new Error('No content window')
      }

      contentWindow.addEventListener('afterprint', () => {
        setTimeout(cleanup, 1000)
      })

      contentWindow.focus()
      contentWindow.print()

      // Fallback cleanup after 5 minutes
      setTimeout(cleanup, 300000)
    } catch (e) {
      // 印刷トリガー失敗 / Failed to trigger print
      window.open(blobUrl, '_blank')
      cleanup()
    }
  }

  iframe.onerror = () => {
    // PDF iframe読み込み失敗 / Failed to load PDF in iframe
    window.open(blobUrl, '_blank')
    cleanup()
  }

  document.body.appendChild(iframe)
}
