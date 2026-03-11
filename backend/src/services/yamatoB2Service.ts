import type { IYamatoB2Config } from '../models/carrierAutomationConfig';
import type { IShipmentOrder } from '../models/shipmentOrder';
import { CarrierSessionCache } from '../models/carrierSessionCache';
import { logger } from '../lib/logger';
import { sliceByWidth } from '../utils/japaneseCharWidth';

/**
 * Yamato B2 API レスポンス型
 */
interface YamatoLoginResponse {
  session_token: string;
  expires_at: string;
}

interface YamatoShipmentResult {
  success: boolean;
  tracking_number?: string;
  service_type?: string;
  error?: string;
  order_index: number;
}

interface YamatoExportResponse {
  results: YamatoShipmentResult[];
  total: number;
  success_count: number;
  error_count: number;
}

interface YamatoPrintResultByType {
  print_type: string;
  success: boolean;
  tracking_numbers: string[];         // 正式な送り状番号
  error?: string;
  shipments?: YamatoPrintShipmentData[];  // include_data=true 時のみ
}

interface YamatoExportAndPrintResponse extends YamatoExportResponse {
  printResults?: YamatoPrintResultByType[];
}

/**
 * Print API からの伝票データ（include_data=true時）
 */
interface YamatoPrintShipmentData {
  tracking_number: string;           // 正式な送り状番号
  temp_tracking_number?: string;     // 発行前の一時番号
  service_type?: string;
  shipment_number?: string;          // お客様管理番号（orderNumber）
  consignee_name?: string;
  consignee_zip_code?: string;
  consignee_address?: string;
  shipper_name?: string;
  item_name1?: string;
  shipment_date?: string;
  sorting_code?: string;
  [key: string]: any;                // B2 Cloud が返すその他すべてのフィールド
}

interface YamatoPrintResponse {
  pdf_base64?: string;
  tracking_numbers: string[];        // 正式な送り状番号の配列
  success: boolean;
  error?: string;
  shipments?: YamatoPrintShipmentData[];  // include_data=true 時のみ
}

interface YamatoExportApiResponse {
  // B2 Cloud actual response format
  feed?: {
    entry?: Array<{
      shipment?: {
        tracking_number?: string;
        shipment_number?: string;
        service_type?: string;
        error_flg?: string;
      };
    }>;
  };
  // Legacy format (kept for compatibility)
  results?: Array<{
    success?: boolean;
    tracking_number?: string;
    service_type?: string;
    error?: string;
  }>;
}

interface YamatoValidateResult {
  index: number;
  valid: boolean;
  errors: string[];
}

interface YamatoValidateResponse {
  results: YamatoValidateResult[];
  total: number;
  valid_count: number;
  invalid_count: number;
  all_valid: boolean;
}

type YamatoValidateApiResponse = Array<{
  index?: number;
  valid?: boolean;
  errors?: string[];
}>;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * 日付を指定フォーマットで出力
 */
function formatDate(date: Date, format: string): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return format.replace('YYYY', String(year)).replace('MM', month).replace('DD', day);
}

/**
 * service_type から print_type を取得
 *
 * B2 Cloud では print_type = service_type（同じ値を使用）
 *
 * | print_type | 説明                      |
 * |------------|---------------------------|
 * | 0          | 発払い                    |
 * | 2          | コレクト                  |
 * | 3          | クロネコゆうメール (DM便) |
 * | 4          | タイム                    |
 * | 5          | 着払い                    |
 * | 7          | クロネコゆうパケット      |
 * | 8          | 宅急便コンパクト          |
 * | 9          | コンパクトコレクト        |
 * | A          | ネコポス                  |
 */
function getPrintTypeForServiceType(serviceType: string): string {
  // print_type = service_type（同じ値）
  return serviceType || '';
}

/**
 * 認証エラーかどうかを判定
 */
function isAuthErrorStatus(status: number): boolean {
  return status === 401 || status === 403;
}

// ============================================================================
// Default Order → B2 Mapping
// ============================================================================

/**
 * 注文のinvoiceTypeからB2サービス種類を決定
 *
 * @param order 注文データ
 * @param config B2設定（serviceTypeMapping）
 * @returns B2 service_type
 */
function resolveServiceType(order: IShipmentOrder, config: IYamatoB2Config): string {
  const invoiceType = order.invoiceType || '0';

  // serviceTypeMappingを使用
  if (config.serviceTypeMapping) {
    // MongooseのMapはget()で取得、または toObject() で変換されていればオブジェクトアクセス
    const mapping = config.serviceTypeMapping instanceof Map
      ? config.serviceTypeMapping.get(invoiceType)
      : (config.serviceTypeMapping as Record<string, any>)[invoiceType];
    if (mapping) {
      // 新しい形式: { b2ServiceType: string, printTemplateId?: string }
      if (typeof mapping === 'object' && mapping.b2ServiceType) {
        return mapping.b2ServiceType;
      }
      // 旧形式との互換性: 直接文字列の場合
      if (typeof mapping === 'string') {
        return mapping;
      }
    }
  }

  // マッピングがない場合はinvoiceTypeをそのまま返す
  return invoiceType;
}

/**
 * Order → B2 直接マッピング
 *
 * アドレス字段マッピング規則：
 * - recipient.prefecture → お届け先都道府県
 * - recipient.city → お届け先市区郡町村
 * - recipient.street → お届け先町・番地 (width 1-32) + お届け先アパートマンション名 (width 33-64)
 *
 * フォーマット検証はB2 Cloud側で行われる
 */
function defaultMapOrderToB2(order: IShipmentOrder, config: IYamatoB2Config): Record<string, any> {
  const today = new Date();
  // B2 webapi expects YYYY/MM/DD format
  const shipmentDate = formatDate(today, 'YYYY/MM/DD');

  const productStr = order.products?.map((p) => {
    const name = p.productName || p.inputSku || '商品';
    const qty = p.quantity || 1;
    return qty === 1 ? name : `${name}*${qty}`;
  }).join(' / ') || '商品';
  const itemName1 = sliceByWidth(productStr, 1, 50) || '商品';
  const itemName2 = sliceByWidth(productStr, 51, 100);

  // 使用 sliceByWidth 与 mapping config 中的 jp.sliceByWidth 相同逻辑
  const recipientStreet = order.recipient?.street || '';
  const senderStreet = order.sender?.street || '';

  // 設定に基づいてサービス種類を決定
  const serviceType = resolveServiceType(order, config);

  return {
    shipment_number: order.orderNumber,
    note: order.customerManagementNumber || '',  // お客様管理番号
    service_type: serviceType,
    is_cool: order.coolType || '',
    shipment_date: shipmentDate,
    delivery_date: order.deliveryDatePreference ? formatDate(new Date(order.deliveryDatePreference), 'YYYY/MM/DD') : '',
    delivery_time_zone: order.deliveryTimeSlot || '',
    consignee_telephone_display: order.recipient?.phone,
    consignee_zip_code: order.recipient?.postalCode?.replace(/-/g, ''),
    // お届け先住所：英文字段名で直接マッピング
    consignee_address1: order.recipient?.prefecture || '',
    consignee_address2: order.recipient?.city || '',
    consignee_address3: sliceByWidth(recipientStreet, 1, 32),
    consignee_address4: sliceByWidth(recipientStreet, 33, 64),
    consignee_name: order.recipient?.name,
    consignee_title: order.honorific || '様',
    shipper_telephone_display: order.sender?.phone,
    shipper_zip_code: order.sender?.postalCode?.replace(/-/g, ''),
    // ご依頼主住所：英文字段名で直接マッピング
    shipper_address1: order.sender?.prefecture || '',
    shipper_address2: order.sender?.city || '',
    shipper_address3: sliceByWidth(senderStreet, 1, 32),
    shipper_address4: sliceByWidth(senderStreet, 33, 64),
    shipper_name: order.sender?.name,
    item_name1: itemName1,
    item_name2: itemName2,
    package_qty: '1',
    // 請求先
    invoice_code: config.invoiceCode || '',
    invoice_freight_no: config.invoiceFreightNo || '',
  };
}

// ============================================================================
// Yamato B2 Service
// ============================================================================

/**
 * Yamato B2 サービスクラス
 *
 * セッショントークンを MongoDB にキャッシュし、毎回のログインを回避する。
 * API呼び出しで認証エラー（401/403）が発生した場合、自動的にキャッシュを無効化して
 * 再ログイン→リトライを行う。
 */
export class YamatoB2Service {
  private config: IYamatoB2Config;
  private tenantId: string;
  private sessionToken: string | null = null;
  private tokenExpiresAt: Date | null = null;

  constructor(config: IYamatoB2Config, tenantId: string) {
    this.config = config;
    this.tenantId = tenantId;
  }

  /**
   * API エンドポイントを取得
   */
  private get apiEndpoint(): string {
    return this.config.apiEndpoint || 'https://yamato-b2-webapi.nexand.org';
  }

  /**
   * API Key を取得
   */
  private get apiKey(): string {
    return this.config.apiKey || '';
  }

  /**
   * OrderをB2形式に変換
   * 直接マッピングを使用（MappingConfig依存を削除）
   */
  private mapOrderToB2(order: IShipmentOrder): Record<string, any> {
    return defaultMapOrderToB2(order, this.config);
  }

  // ==========================================================================
  // セッション管理
  // ==========================================================================

  /**
   * ログイン（セッショントークン取得）
   *
   * 優先順位:
   * 1. インメモリキャッシュ
   * 2. MongoDB キャッシュ
   * 3. API ログイン（結果をMongoDBに保存）
   */
  async login(): Promise<string> {
    // 1. インメモリキャッシュ
    if (this.sessionToken && this.tokenExpiresAt && this.tokenExpiresAt > new Date()) {
      return this.sessionToken;
    }

    // 2. MongoDB キャッシュ
    try {
      const cached = await CarrierSessionCache.findOne({
        tenantId: this.tenantId,
        carrierType: 'yamato-b2',
        expiresAt: { $gt: new Date() },
      }).lean();

      if (cached) {
        this.sessionToken = cached.sessionToken;
        this.tokenExpiresAt = cached.expiresAt;
        logger.info('Yamato B2 session restored from MongoDB cache');
        return this.sessionToken;
      }
    } catch (err) {
      // キャッシュ読み取り失敗は無視してAPIログインにフォールバック
      logger.warn({ error: (err as Error).message }, 'Failed to read session cache from MongoDB');
    }

    // 3. API ログイン
    return this.loginFromApi();
  }

  /**
   * API経由でログインし、結果をキャッシュに保存
   */
  private async loginFromApi(): Promise<string> {
    const response = await fetch(`${this.apiEndpoint}/api/v1/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
      body: JSON.stringify({
        customer_code: this.config.customerCode,
        customer_password: this.config.customerPassword,
        customer_cls_code: this.config.customerClsCode,
        login_user_id: this.config.loginUserId,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error({ status: response.status, error }, 'Yamato B2 login failed');
      throw new Error(`Yamato B2 ログイン失敗: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as YamatoLoginResponse;
    this.sessionToken = data.session_token;
    this.tokenExpiresAt = new Date(data.expires_at);

    // MongoDB にキャッシュ保存
    try {
      await CarrierSessionCache.findOneAndUpdate(
        { tenantId: this.tenantId, carrierType: 'yamato-b2' },
        {
          sessionToken: this.sessionToken,
          expiresAt: this.tokenExpiresAt,
        },
        { upsert: true, new: true },
      );
    } catch (err) {
      // キャッシュ保存失敗は無視（ログインは成功している）
      logger.warn({ error: (err as Error).message }, 'Failed to save session cache to MongoDB');
    }

    logger.info({ expiresAt: this.tokenExpiresAt }, 'Yamato B2 login successful');
    return this.sessionToken;
  }

  /**
   * キャッシュを無効化（インメモリ + MongoDB）
   */
  private async invalidateCache(): Promise<void> {
    this.sessionToken = null;
    this.tokenExpiresAt = null;
    try {
      await CarrierSessionCache.deleteOne({
        tenantId: this.tenantId,
        carrierType: 'yamato-b2',
      });
    } catch (err) {
      logger.warn({ error: (err as Error).message }, 'Failed to invalidate session cache in MongoDB');
    }
  }

  /**
   * 認証付き fetch（認証エラー時に自動リトライ）
   *
   * 1. login() でトークン取得
   * 2. fetch 実行
   * 3. 401/403 → キャッシュ無効化 → 再ログイン → リトライ（1回のみ）
   */
  private async authenticatedFetch(url: string, init: RequestInit = {}): Promise<Response> {
    const token = await this.login();

    const headers: Record<string, string> = {
      'X-API-Key': this.apiKey,
      'Authorization': `Bearer ${token}`,
      ...(init.headers as Record<string, string> || {}),
    };

    const response = await fetch(url, { ...init, headers });

    if (isAuthErrorStatus(response.status)) {
      logger.warn({ status: response.status, url }, 'Yamato B2 auth error, invalidating cache and retrying');
      await this.invalidateCache();
      const newToken = await this.loginFromApi();

      const retryHeaders: Record<string, string> = {
        'X-API-Key': this.apiKey,
        'Authorization': `Bearer ${newToken}`,
        ...(init.headers as Record<string, string> || {}),
      };

      return fetch(url, { ...init, headers: retryHeaders });
    }

    return response;
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  /**
   * 接続テスト
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.login();
      return { success: true, message: '接続成功' };
    } catch (error: any) {
      return { success: false, message: error.message || '接続失敗' };
    }
  }

  /**
   * 配送データを検証（B2 Cloud のフォーマットチェック）
   */
  async validateShipments(orders: IShipmentOrder[]): Promise<YamatoValidateResponse> {
    // 注文をB2形式に変換
    const shipments = orders.map((order) => this.mapOrderToB2(order));

    logger.info({ shipmentCount: shipments.length, sample: shipments[0] }, 'Validating shipments');

    const response = await this.authenticatedFetch(`${this.apiEndpoint}/api/v1/shipments/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(shipments),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error({ status: response.status, error }, 'Yamato B2 validation failed');
      throw new Error(`Yamato B2 検証失敗: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as YamatoValidateApiResponse;

    const results: YamatoValidateResult[] = (data || []).map((r, index: number) => ({
      index: r.index ?? index,
      valid: r.valid || false,
      errors: r.errors || [],
    }));

    const validCount = results.filter((r) => r.valid).length;
    const invalidCount = results.filter((r) => !r.valid).length;

    return {
      results,
      total: orders.length,
      valid_count: validCount,
      invalid_count: invalidCount,
      all_valid: invalidCount === 0,
    };
  }

  /**
   * 配送データを B2 Cloud にエクスポート（作成）
   */
  async exportShipments(orders: IShipmentOrder[]): Promise<YamatoExportResponse> {
    // 注文をB2形式に変換
    const shipments = orders.map((order) => this.mapOrderToB2(order));

    const requestBody = JSON.stringify(shipments);
    logger.info({ shipmentCount: shipments.length, bodyPreview: requestBody.substring(0, 500) }, 'Exporting shipments to B2 Cloud');

    const response = await this.authenticatedFetch(`${this.apiEndpoint}/api/v1/shipments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: requestBody,
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error({ status: response.status, error }, 'Yamato B2 export failed');
      throw new Error(`Yamato B2 エクスポート失敗: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as YamatoExportApiResponse;

    // Parse B2 Cloud response format: feed.entry[].shipment
    let results: YamatoShipmentResult[];
    if (data.feed?.entry) {
      // B2 Cloud actual format
      results = data.feed.entry.map((entry, index) => {
        const shipment = entry.shipment;
        const hasTrackingNumber = !!shipment?.tracking_number;
        const hasError = shipment?.error_flg === '1';
        return {
          success: hasTrackingNumber && !hasError,
          tracking_number: shipment?.tracking_number,
          service_type: shipment?.service_type,
          error: hasError ? 'B2 Cloud error' : undefined,
          order_index: index,
        };
      });
    } else if (data.results) {
      // Legacy format
      results = data.results.map((r, index: number) => ({
        success: r.success || false,
        tracking_number: r.tracking_number,
        service_type: r.service_type,
        error: r.error,
        order_index: index,
      }));
    } else {
      results = [];
    }

    return {
      results,
      total: orders.length,
      success_count: results.filter((r) => r.success).length,
      error_count: results.filter((r) => !r.success).length,
    };
  }

  /**
   * 配送データをエクスポートして発行（print）
   * export 成功した shipment の tracking_number を使って print を呼ぶ
   *
   * 重要: print_type は service_type によって異なるため、
   * 同じ print_type のものをグループ化して別々に print を呼ぶ必要がある
   */
  async exportAndPrint(orders: IShipmentOrder[]): Promise<YamatoExportAndPrintResponse> {
    // 1. まず exportShipments を呼ぶ
    const exportResult = await this.exportShipments(orders);

    // 2. 成功した shipment を print_type でグループ化
    const successResults = exportResult.results.filter((r) => r.success && r.tracking_number);

    // print_type ごとにグループ化
    const groupedByPrintType: Record<string, string[]> = {};
    for (const result of successResults) {
      const serviceType = result.service_type || '0';
      const printType = getPrintTypeForServiceType(serviceType);

      if (!groupedByPrintType[printType]) {
        groupedByPrintType[printType] = [];
      }
      groupedByPrintType[printType].push(result.tracking_number!);
    }

    // 3. 各 print_type グループごとに printLabels を呼ぶ
    const printResults: YamatoPrintResultByType[] = [];

    for (const [printType, trackingNumbers] of Object.entries(groupedByPrintType)) {
      try {
        const printResponse = await this.printLabels(trackingNumbers, printType);
        printResults.push({
          print_type: printType,
          success: printResponse.success,
          tracking_numbers: printResponse.tracking_numbers,  // 正式な送り状番号
          error: printResponse.error,
          shipments: printResponse.shipments,  // 完全な伝票データ
        });
        logger.info({
          printType,
          inputTrackingNumbers: trackingNumbers,
          outputTrackingNumbers: printResponse.tracking_numbers,
          shipmentsCount: printResponse.shipments?.length || 0,
        }, 'Yamato B2 print (auto-issue) completed for group');
      } catch (error: any) {
        logger.error({ error: error.message, printType, trackingNumbers }, 'Yamato B2 print (auto-issue) failed for group');
        printResults.push({
          print_type: printType,
          success: false,
          tracking_numbers: [],
          error: error.message,
        });
      }
    }

    if (printResults.length === 0) {
      logger.warn('exportAndPrint: no tracking numbers found, skipping print');
    }

    return {
      ...exportResult,
      printResults,
    };
  }

  /**
   * ラベル発行（印刷）
   *
   * B2 Cloud の print API を呼び出して shipment を「発行済み」状態にする。
   * include_data=true を使用して、正式な送り状番号と完全な伝票データを取得する。
   *
   * @param trackingNumbers - 発行する shipment の tracking_number 配列（UMN... 形式の一時番号可）
   * @param printType - 印刷タイプ: "0"=発払い, "2"=コレクト, "3"=DM便, "5"=着払い, "7"=ゆうパケット, "8"=コンパクト, "9"=コンパクトコレクト, "A"=ネコポス
   */
  async printLabels(trackingNumbers: string[], printType: string = '3'): Promise<YamatoPrintResponse> {
    const requestBody = {
      print_type: printType,
      tracking_numbers: trackingNumbers,
    };

    // include_data=true を使用して正式な追跡番号と伝票データを取得
    const response = await this.authenticatedFetch(`${this.apiEndpoint}/api/v1/shipments/print?include_data=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error({ status: response.status, error }, 'Yamato B2 print failed');
      throw new Error(`Yamato B2 印刷失敗: ${response.status} - ${error}`);
    }

    const contentType = response.headers.get('content-type') || '';

    // include_data=true の場合、JSON レスポンスを期待
    if (contentType.includes('application/json')) {
      const data = await response.json() as Record<string, any>;
      const shipments = data.shipments as YamatoPrintShipmentData[] | undefined;

      // shipments から正式な送り状番号を抽出
      const realTrackingNumbers = shipments?.map(s => s.tracking_number).filter(Boolean) || [];

      logger.info({
        inputCount: trackingNumbers.length,
        outputCount: realTrackingNumbers.length,
        shipmentsCount: shipments?.length || 0,
      }, 'Yamato B2 print completed with include_data=true');

      return {
        pdf_base64: data.pdf_base64,
        tracking_numbers: realTrackingNumbers.length > 0 ? realTrackingNumbers : trackingNumbers,
        success: true,
        shipments,
      };
    }

    // フォールバック: PDF バイナリレスポンス（include_data=false の場合）
    if (contentType.includes('application/pdf')) {
      const pdfBuffer = await response.arrayBuffer();
      const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');

      logger.warn('Yamato B2 print returned PDF binary instead of JSON. include_data parameter may not be supported.');

      return {
        pdf_base64: pdfBase64,
        tracking_numbers: trackingNumbers,
        success: true,
      };
    }

    // 予期しないレスポンス形式
    const responseText = await response.text();
    logger.warn({ contentType, responseText: responseText.substring(0, 500) }, 'Yamato B2 print unexpected response');

    return {
      tracking_numbers: trackingNumbers,
      success: true,
    };
  }

  /**
   * 発行履歴を取得
   *
   * B2 webapi の /api/v1/history は以下の日付パラメータをサポート:
   * - shipment_plan_from: 出荷予定日（開始）YYYY-MM-DD
   * - shipment_plan_to: 出荷予定日（終了）YYYY-MM-DD
   */
  async getHistory(options?: {
    shipmentDateFrom?: string;
    shipmentDateTo?: string;
    limit?: number;
  }): Promise<any[]> {
    const params = new URLSearchParams();
    if (options?.shipmentDateFrom) params.append('shipment_plan_from', options.shipmentDateFrom);
    if (options?.shipmentDateTo) params.append('shipment_plan_to', options.shipmentDateTo);
    if (options?.limit) params.append('limit', options.limit.toString());

    const url = `${this.apiEndpoint}/api/v1/history?${params.toString()}`;
    logger.info({ url, params: params.toString() }, 'Yamato B2 history request');

    const response = await this.authenticatedFetch(url, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error({ status: response.status, error }, 'Yamato B2 history failed');
      throw new Error(`Yamato B2 履歴取得失敗: ${response.status} - ${error}`);
    }

    const data = await response.json() as any;
    logger.info({
      responseKeys: Object.keys(data),
      total: data.total,
      shipmentsLength: data.shipments?.length,
      historyLength: data.history?.length,
      rawResponse: JSON.stringify(data).substring(0, 500),
    }, 'Yamato B2 history response');

    // B2 webapi returns "shipments" array, not "history"
    return data.shipments || data.history || [];
  }

  /**
   * 履歴から伝票を削除（ソフト削除 - display_flg=0）
   *
   * B2 Cloud の DELETE /api/v1/history を呼び出して発行済み伝票を削除する。
   * これは「確認取消」操作で使用される。
   *
   * @param trackingNumbers - 削除する伝票の追跡番号配列
   * @returns 削除結果
   */
  async deleteFromHistory(trackingNumbers: string[]): Promise<{
    success: boolean;
    deleted: number;
    error?: string;
  }> {
    if (!trackingNumbers || trackingNumbers.length === 0) {
      return { success: true, deleted: 0 };
    }

    logger.info({ trackingNumbers }, 'Yamato B2 deleting from history');

    const response = await this.authenticatedFetch(`${this.apiEndpoint}/api/v1/history`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trackingNumbers),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error({ status: response.status, error }, 'Yamato B2 history delete failed');
      throw new Error(`Yamato B2 履歴削除失敗: ${response.status} - ${error}`);
    }

    const data = await response.json() as any;
    logger.info({ deleted: data.deleted, result: data.result }, 'Yamato B2 history delete completed');

    return {
      success: true,
      deleted: data.deleted || trackingNumbers.length,
    };
  }

  /**
   * 複数の追跡番号からPDFを一括取得（キャッシュから）
   *
   * B2 webapi の POST /api/v1/shipments/pdf/batch を呼び出して、
   * 複数の追跡番号に対応するPDFを結合して取得する。
   *
   * 注意: PDFはb2-webapiのキャッシュから取得されるため、
   * 事前に include_data=true で印刷されている必要がある。
   *
   * @param trackingNumbers - 取得する伝票の追跡番号配列
   * @returns PDF binary data (Buffer)
   */
  async fetchBatchPdf(trackingNumbers: string[]): Promise<Buffer> {
    if (!trackingNumbers || trackingNumbers.length === 0) {
      throw new Error('追跡番号が指定されていません');
    }

    logger.info({ trackingNumbers }, 'Yamato B2 fetching batch PDF');

    const response = await this.authenticatedFetch(`${this.apiEndpoint}/api/v1/shipments/pdf/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tracking_numbers: trackingNumbers }),
    });

    if (!response.ok) {
      const error = await response.text();
      let errorMessage = `Yamato B2 PDF取得失敗: ${response.status}`;
      try {
        const errorJson = JSON.parse(error);
        if (errorJson.detail?.missing) {
          errorMessage += ` - 以下の追跡番号のPDFがキャッシュにありません: ${errorJson.detail.missing.join(', ')}`;
        } else if (errorJson.message) {
          errorMessage += ` - ${errorJson.message}`;
        }
      } catch {
        errorMessage += ` - ${error}`;
      }
      logger.error({ status: response.status, error }, 'Yamato B2 batch PDF fetch failed');
      throw new Error(errorMessage);
    }

    const pdfBuffer = await response.arrayBuffer();
    logger.info({ trackingNumbers, pdfSize: pdfBuffer.byteLength }, 'Yamato B2 batch PDF fetched');

    return Buffer.from(pdfBuffer);
  }
}

/**
 * 設定からサービスインスタンスを作成
 */
export function createYamatoB2Service(config: IYamatoB2Config, tenantId: string): YamatoB2Service {
  return new YamatoB2Service(config, tenantId);
}
