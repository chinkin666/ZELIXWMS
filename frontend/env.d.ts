/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_BACKEND_ORIGIN?: string
  readonly VITE_BACKEND_API_PREFIX?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module 'element-plus/dist/locale/ja.mjs' {
  const locale: any
  export default locale
}

declare module 'bwip-js' {
  export interface ToCanvasOptions {
    bcid: string
    text: string
    scale?: number
    [key: string]: any
  }
  export function toCanvas(canvas: HTMLCanvasElement, options: ToCanvasOptions): void
  const bwipjs: {
    toCanvas: typeof toCanvas
  }
  export default bwipjs
}
