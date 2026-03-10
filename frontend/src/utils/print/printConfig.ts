/**
 * 打印配置管理工具
 * 使用 localStorage 存储打印配置，全局生效
 * 支持按模板（印刷テンプレート / 帳票テンプレート）指定打印机和打印参数
 */

export type PrintMethod = 'browser' | 'local-bridge'

/** 打印机信息（从 Local Print Bridge API 缓存） */
export interface PrinterInfo {
  name: string
  paper_sizes: Array<{ name: string; width_mm: number; height_mm: number }>
}

/** 每个模板的打印参数 */
export interface TemplatePrintParams {
  /** 打印机名称（空 = 使用 bridge 默认打印机） */
  printer?: string
  /** 纸张名称（'AUTO' = 打印机默认） */
  paper?: string
  /** 方向 */
  orientation?: 'portrait' | 'landscape'
  /** 缩放模式 */
  scale?: 'fit' | 'fill' | 'actual'
  /** 边距（毫米），0-50 */
  margin_mm?: number
  /** 打印份数，1-50 */
  copies?: number
}

/** 本地打印桥接配置 */
export interface LocalBridgeConfig {
  /** 服务地址，默认 http://127.0.0.1:8765 */
  serviceUrl: string
  /** 缓存的打印机列表 */
  printersCache: PrinterInfo[]
  /** 系统默认打印机名称 */
  defaultPrinterOs: string | null
  /** 上次缓存更新时间（ISO string） */
  lastCacheUpdate: string | null
  /** 印刷テンプレート 打印设置 (key = template id) */
  printTemplateSettings: Record<string, TemplatePrintParams>
  /** 帳票テンプレート 打印设置 (key = template id) */
  formTemplateSettings: Record<string, TemplatePrintParams>
  /** B2 Cloud PDF 打印设置（按送り状種類, key = invoiceType '0'-'9','A'） */
  b2CloudPrintParams: Record<string, TemplatePrintParams>
}

export interface PrintConfig {
  /** 打印方式：浏览器打印 或 本地打印桥接 */
  method: PrintMethod
  /** 本地打印桥接配置 */
  localBridge: LocalBridgeConfig
}

const STORAGE_KEY = 'printConfig'

const DEFAULT_LOCAL_BRIDGE: LocalBridgeConfig = {
  serviceUrl: 'http://127.0.0.1:8765',
  printersCache: [],
  defaultPrinterOs: null,
  lastCacheUpdate: null,
  printTemplateSettings: {},
  formTemplateSettings: {},
  b2CloudPrintParams: {},
}

const DEFAULT_CONFIG: PrintConfig = {
  method: 'browser',
  localBridge: { ...DEFAULT_LOCAL_BRIDGE },
}

const DEFAULT_PRINT_PARAMS: Required<TemplatePrintParams> = {
  printer: '',
  paper: 'AUTO',
  orientation: 'portrait',
  scale: 'fit',
  margin_mm: 6,
  copies: 1,
}

/**
 * 获取打印配置
 */
export function getPrintConfig(): PrintConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<PrintConfig>
      return {
        method: parsed.method || DEFAULT_CONFIG.method,
        localBridge: {
          ...DEFAULT_LOCAL_BRIDGE,
          ...parsed.localBridge,
        },
      }
    }
  } catch (error) {
    console.error('Failed to load print config from localStorage:', error)
  }
  return structuredClone(DEFAULT_CONFIG)
}

/**
 * 保存打印配置
 */
export function savePrintConfig(config: PrintConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch (error) {
    console.error('Failed to save print config to localStorage:', error)
    throw new Error('設定の保存に失敗しました')
  }
}

/**
 * 重置为默认配置
 */
export function resetPrintConfig(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('Failed to reset print config:', error)
  }
}

// ─── Per-Template Settings Helpers ───

/**
 * 获取印刷テンプレートの打印参数（合并默认值）
 */
export function getPrintParamsForPrintTemplate(templateId: string): Required<TemplatePrintParams> {
  const config = getPrintConfig()
  const saved = config.localBridge.printTemplateSettings[templateId]
  return { ...DEFAULT_PRINT_PARAMS, ...saved }
}

/**
 * 获取帳票テンプレートの打印参数（合并默认值）
 */
export function getPrintParamsForFormTemplate(templateId: string): Required<TemplatePrintParams> {
  const config = getPrintConfig()
  const saved = config.localBridge.formTemplateSettings[templateId]
  return { ...DEFAULT_PRINT_PARAMS, ...saved }
}

/**
 * 保存印刷テンプレートの打印参数
 */
export function savePrintTemplateParams(templateId: string, params: TemplatePrintParams): void {
  const config = getPrintConfig()
  config.localBridge.printTemplateSettings[templateId] = params
  savePrintConfig(config)
}

/**
 * 保存帳票テンプレートの打印参数
 */
export function saveFormTemplateParams(templateId: string, params: TemplatePrintParams): void {
  const config = getPrintConfig()
  config.localBridge.formTemplateSettings[templateId] = params
  savePrintConfig(config)
}

/**
 * 获取 B2 Cloud PDF の打印参数（按送り状種類，合并默认值）
 */
export function getPrintParamsForB2Cloud(invoiceType: string): Required<TemplatePrintParams> {
  const config = getPrintConfig()
  const saved = config.localBridge.b2CloudPrintParams[invoiceType]
  return { ...DEFAULT_PRINT_PARAMS, ...saved }
}

/**
 * 保存 B2 Cloud PDF の打印参数（按送り状種類）
 */
export function saveB2CloudPrintParams(invoiceType: string, params: TemplatePrintParams): void {
  const config = getPrintConfig()
  config.localBridge.b2CloudPrintParams[invoiceType] = params
  savePrintConfig(config)
}

// ─── Printer Cache Helpers ───

/**
 * 获取缓存的打印机列表
 */
export function getCachedPrinters(): PrinterInfo[] {
  return getPrintConfig().localBridge.printersCache
}

/**
 * 更新打印机缓存
 */
export function updatePrintersCache(printers: PrinterInfo[], defaultPrinterOs: string | null): void {
  const config = getPrintConfig()
  config.localBridge.printersCache = printers
  config.localBridge.defaultPrinterOs = defaultPrinterOs
  config.localBridge.lastCacheUpdate = new Date().toISOString()
  savePrintConfig(config)
}

/**
 * 获取默认打印参数
 */
export function getDefaultPrintParams(): Required<TemplatePrintParams> {
  return { ...DEFAULT_PRINT_PARAMS }
}
