export type ColumnDataType = 'string' | 'number' | 'date' | 'boolean'

export interface CarrierColumnConfig {
  name: string
  description?: string
  type: ColumnDataType
  maxWidth?: number
  required: boolean
  userUploadable: boolean
}

export interface CarrierFormatDefinition {
  columns: CarrierColumnConfig[]
}

/**
 * 送り状種類ごとの印刷テンプレート設定
 */
export interface CarrierService {
  /** 送り状種類 (0-9, A) */
  invoiceType: string
  /** 関連する印刷テンプレートID */
  printTemplateId?: string
}

export interface Carrier {
  _id: string
  code: string
  name: string
  description?: string
  enabled: boolean
  trackingIdColumnName?: string
  formatDefinition: CarrierFormatDefinition
  /** 組み込み配送業者かどうか（編集/削除不可） / 是否为内置配送業者（不可编辑/删除） */
  isBuiltIn?: boolean
  /** 自動化タイプ: 'yamato-b2' | 'sagawa-api' | 'seino-api' / 自动化类型: 'yamato-b2' | 'sagawa-api' | 'seino-api' */
  automationType?: string
  /** 送り状種類ごとの印刷テンプレート設定（ユーザー追加carrierのみ） */
  services?: CarrierService[]
  createdAt?: string
  updatedAt?: string
}

export interface CarrierFilters {
  code?: string
  name?: string
  enabled?: boolean
}

export type UpsertCarrierDto = Partial<
  Pick<
    Carrier,
    'code' | 'name' | 'description' | 'enabled' | 'formatDefinition' | 'trackingIdColumnName' | 'services'
  >
> &
  Required<Pick<Carrier, 'formatDefinition'>>



