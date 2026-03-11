import mongoose from 'mongoose';

/**
 * PDF取得元
 */
export type PdfSource = 'local' | 'b2-webapi';

/**
 * 送り状種類ごとの設定
 */
export interface IServiceTypeConfig {
  /** B2サービス種類 (0-9, A) */
  b2ServiceType: string;
  /** 印刷テンプレートID */
  printTemplateId?: string;
  /** PDF取得元（'local' = ローカルテンプレート, 'b2-webapi' = B2 Cloudから取得） */
  pdfSource?: PdfSource;
}

/**
 * Yamato B2 配置
 */
export interface IYamatoB2Config {
  /** API エンドポイント */
  apiEndpoint: string;
  /** API Key（公開API用アクセスキー） */
  apiKey: string;
  /** お客様コード（ヤマトビジネスメンバーズID） */
  customerCode: string;
  /** パスワード（暗号化保存） */
  customerPassword: string;
  /** お届け先分類コード（任意） */
  customerClsCode?: string;
  /** ログインユーザーID（任意） */
  loginUserId?: string;
  /**
   * 送り状種類ごとの設定マッピング
   * key: 送り状種類 (0-9, A)
   * value: IServiceTypeConfig（B2サービス種類 + 印刷テンプレート）
   */
  serviceTypeMapping?: Record<string, IServiceTypeConfig>;
  /** 請求先顧客コード（10-12桁）- B2 webapi field: invoice_code */
  invoiceCode?: string;
  /** 運賃管理番号（2桁）- B2 webapi field: invoice_freight_no */
  invoiceFreightNo?: string;
}

/**
 * 配送業者自動化設定
 */
export interface ICarrierAutomationConfig {
  _id: mongoose.Types.ObjectId;
  /** テナントID */
  tenantId: string;
  /** 自動化タイプ */
  automationType: string;
  /** 有効フラグ */
  enabled: boolean;
  /** Yamato B2 設定 */
  yamatoB2?: IYamatoB2Config;
  /** 作成日時 */
  createdAt: Date;
  /** 更新日時 */
  updatedAt: Date;
}

const serviceTypeConfigSchema = new mongoose.Schema<IServiceTypeConfig>(
  {
    b2ServiceType: {
      type: String,
      required: true,
      trim: true,
    },
    printTemplateId: {
      type: String,
      trim: true,
    },
    pdfSource: {
      type: String,
      enum: ['local', 'b2-webapi'],
      default: 'local',
    },
  },
  { _id: false },
);

const yamatoB2ConfigSchema = new mongoose.Schema<IYamatoB2Config>(
  {
    apiEndpoint: {
      type: String,
      required: true,
      default: 'https://yamato-b2-webapi.nexand.org',
    },
    apiKey: {
      type: String,
      required: true,
      trim: true,
    },
    customerCode: {
      type: String,
      required: true,
      trim: true,
    },
    customerPassword: {
      type: String,
      required: true,
    },
    customerClsCode: {
      type: String,
      trim: true,
    },
    loginUserId: {
      type: String,
      trim: true,
    },
    serviceTypeMapping: {
      type: Map,
      of: serviceTypeConfigSchema,
      default: () => new Map([
        ['0', { b2ServiceType: '0' }], // 発払い
        ['1', { b2ServiceType: '1' }], // EAZY
        ['2', { b2ServiceType: '2' }], // コレクト
        ['3', { b2ServiceType: '3' }], // クロネコゆうメール（DM便）
        ['4', { b2ServiceType: '4' }], // タイム
        ['5', { b2ServiceType: '5' }], // 着払い
        ['6', { b2ServiceType: '6' }], // 発払い複数口
        ['7', { b2ServiceType: '7' }], // クロネコゆうパケット
        ['8', { b2ServiceType: '8' }], // 宅急便コンパクト
        ['9', { b2ServiceType: '9' }], // コンパクトコレクト
        ['A', { b2ServiceType: 'A' }], // ネコポス
      ]),
    },
    invoiceCode: {
      type: String,
      trim: true,
    },
    invoiceFreightNo: {
      type: String,
      trim: true,
    },
  },
  { _id: false },
);

const carrierAutomationConfigSchema = new mongoose.Schema<ICarrierAutomationConfig>(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    automationType: {
      type: String,
      required: true,
      enum: ['yamato-b2', 'sagawa-api', 'seino-api'],
      trim: true,
    },
    enabled: {
      type: Boolean,
      default: false,
    },
    yamatoB2: {
      type: yamatoB2ConfigSchema,
    },
  },
  {
    timestamps: true,
    collection: 'carrier_automation_configs',
  },
);

// テナント + 自動化タイプで一意
carrierAutomationConfigSchema.index({ tenantId: 1, automationType: 1 }, { unique: true });

export const CarrierAutomationConfig = mongoose.model<ICarrierAutomationConfig>(
  'CarrierAutomationConfig',
  carrierAutomationConfigSchema,
);
