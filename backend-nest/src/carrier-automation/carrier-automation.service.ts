// 配送業者自動化サービス / 配送业者自动化服务
// B2 Cloud は Python FastAPI プロキシ経由で通信 / B2 Cloud 通过 Python FastAPI 代理通信
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WmsException } from '../common/exceptions/wms.exception.js';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { carrierAutomationConfigs } from '../database/schema/carriers.js';
import type { DrizzleDB } from '../database/database.types.js';

// プロキシレスポンス型 / 代理响应类型
interface ProxyResponse<T = any> {
  readonly status: number;
  readonly data: T;
  readonly ok: boolean;
}

// B2セッションキャッシュ型 / B2 session缓存类型
interface B2SessionCache {
  readonly token: string;
  readonly expiresAt: number;
}

@Injectable()
export class CarrierAutomationService {
  private readonly logger = new Logger(CarrierAutomationService.name);
  private readonly b2ApiUrl: string;

  // テナント別B2セッションキャッシュ（インメモリ）/ 按租户B2 session缓存（内存）
  // Redis不可用時のフォールバック / Redis不可用时的降级方案
  private readonly sessionCache = new Map<string, B2SessionCache>();

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly configService: ConfigService,
  ) {
    // B2_API_URL環境変数 or デフォルト / B2_API_URL环境变量或默认值
    this.b2ApiUrl = this.configService.get<string>(
      'B2_API_URL',
      'http://localhost:8000',
    );
    this.logger.log(`B2 API URL: ${this.b2ApiUrl}`);
  }

  // === B2 API プロキシヘルパー / B2 API 代理辅助方法 ===

  /**
   * Python FastAPI B2プロキシへHTTPリクエストを送信
   * 向Python FastAPI B2代理发送HTTP请求
   */
  private async proxyToB2<T = any>(
    path: string,
    method: string,
    body?: any,
    headers?: Record<string, string>,
  ): Promise<ProxyResponse<T>> {
    const url = `${this.b2ApiUrl}${path}`;
    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    const fetchOptions: RequestInit = {
      method: method.toUpperCase(),
      headers: reqHeaders,
    };

    // GETリクエストにはbodyを付けない / GET请求不附带body
    if (body !== undefined && method.toUpperCase() !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    try {
      this.logger.debug(`B2プロキシ: ${method.toUpperCase()} ${url}`);

      const response = await fetch(url, fetchOptions);
      const data = await response.json() as T;

      if (!response.ok) {
        this.logger.warn(`B2プロキシエラー: ${response.status} ${response.statusText}`);
      }

      // 不変オブジェクトとして返す / 返回不可变对象
      return Object.freeze({ status: response.status, data, ok: response.ok });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`B2プロキシ接続失敗: ${message}`);
      throw new WmsException(
        'CARRIER_PROXY_ERROR',
        `B2 API proxy to ${path} failed: ${message} / B2 API代理失败: ${message}`,
      );
    }
  }

  /**
   * テナント別B2セッショントークン取得（キャッシュ付き）
   * 按租户获取B2 session token（带缓存）
   * キャッシュ優先順位: インメモリ → DB設定 → B2 API ログイン
   * 缓存优先级: 内存 → DB配置 → B2 API 登录
   */
  private async getB2Token(tenantId: string): Promise<string | null> {
    // 1. インメモリキャッシュ確認 / 检查内存缓存
    const cached = this.sessionCache.get(tenantId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.token;
    }

    // 2. DB設定からB2認証情報取得してログイン / 从DB获取B2认证信息并登录
    try {
      const config = await this.findConfigByType(tenantId, 'yamato-b2');
      const b2Config = config.config as Record<string, any>;
      if (!b2Config?.customerCode || !b2Config?.customerPassword) {
        return null;
      }

      const loginResult = await this.proxyToB2<any>('/api/v1/login', 'POST', {
        customer_code: b2Config.customerCode,
        customer_password: b2Config.customerPassword,
        customer_cls_code: b2Config.customerClsCode,
        login_user_id: b2Config.loginUserId,
      }, {
        'X-API-Key': b2Config.apiKey || '',
      });

      if (loginResult.ok && loginResult.data?.session_token) {
        const token = loginResult.data.session_token;
        // 3.5時間キャッシュ（B2トークンは4時間有効）/ 缓存3.5小时（B2 token有效期4小时）
        this.sessionCache.set(tenantId, {
          token,
          expiresAt: Date.now() + 3.5 * 60 * 60 * 1000,
        });
        return token;
      }
    } catch (e) {
      this.logger.warn(`B2自動ログイン失敗: ${tenantId} / B2自动登录失败`);
    }

    return null;
  }

  /**
   * B2認証ヘッダー構築 / 构建B2认证头
   */
  private async getB2AuthHeaders(tenantId: string, apiKey?: string): Promise<Record<string, string>> {
    const headers: Record<string, string> = {};

    if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }

    const token = await this.getB2Token(tenantId);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  // === 設定管理メソッド / 配置管理方法 ===

  // 自動化設定一覧取得 / 获取自动化配置列表
  async findAllConfigs(tenantId: string) {
    const items = await this.db
      .select()
      .from(carrierAutomationConfigs)
      .where(eq(carrierAutomationConfigs.tenantId, tenantId));
    return { items };
  }

  // 自動化設定タイプ別取得 / 按类型获取自动化配置
  async findConfigByType(tenantId: string, type: string) {
    const rows = await this.db
      .select()
      .from(carrierAutomationConfigs)
      .where(and(
        eq(carrierAutomationConfigs.tenantId, tenantId),
        eq(carrierAutomationConfigs.carrierType, type),
      ))
      .limit(1);

    if (rows.length === 0) {
      throw new WmsException('CARRIER_AUTO_NOT_FOUND', `Type: ${type}`);
    }
    return rows[0];
  }

  // 自動化設定更新（upsert） / 更新自动化配置（upsert）
  async updateConfig(tenantId: string, type: string, dto: Record<string, any>) {
    const existing = await this.db
      .select()
      .from(carrierAutomationConfigs)
      .where(and(
        eq(carrierAutomationConfigs.tenantId, tenantId),
        eq(carrierAutomationConfigs.carrierType, type),
      ))
      .limit(1);

    if (existing.length > 0) {
      const rows = await this.db
        .update(carrierAutomationConfigs)
        .set({
          enabled: dto.enabled ?? existing[0].enabled,
          config: dto.config ?? existing[0].config,
          updatedAt: new Date(),
        })
        .where(and(
          eq(carrierAutomationConfigs.tenantId, tenantId),
          eq(carrierAutomationConfigs.carrierType, type),
        ))
        .returning();
      return rows[0];
    }

    const rows = await this.db
      .insert(carrierAutomationConfigs)
      .values({
        tenantId,
        carrierType: type,
        enabled: dto.enabled ?? false,
        config: dto.config ?? {},
      })
      .returning();
    return rows[0];
  }

  // === ヤマトB2 API メソッド（Python FastAPI直接呼出）===
  // === 大和B2 API 方法（直接调用Python FastAPI）===

  // ヤマトB2ログイン / 大和B2登录
  async loginYamatoB2(tenantId: string, dto: Record<string, any>) {
    const result = await this.proxyToB2('/api/v1/login', 'POST', {
      customer_code: dto.customerCode ?? dto.customer_code,
      customer_password: dto.customerPassword ?? dto.customer_password,
      customer_cls_code: dto.customerClsCode ?? dto.customer_cls_code,
      login_user_id: dto.loginUserId ?? dto.login_user_id,
    }, {
      'X-API-Key': dto.apiKey ?? dto.api_key ?? '',
    });

    // ログイン成功時にセッションキャッシュ / 登录成功时缓存session
    if (result.ok && result.data?.session_token) {
      this.sessionCache.set(tenantId, {
        token: result.data.session_token,
        expiresAt: Date.now() + 3.5 * 60 * 60 * 1000,
      });
    }

    return result.data;
  }

  // ヤマトB2バリデーション / 大和B2校验
  async validateYamatoB2(tenantId: string, dto: Record<string, any>) {
    const authHeaders = await this.getB2AuthHeaders(tenantId, dto.apiKey);
    const result = await this.proxyToB2('/api/v1/shipments/validate', 'POST', dto.shipments ?? dto, authHeaders);
    return result.data;
  }

  // ヤマトB2エクスポート（出荷データ作成）/ 大和B2导出（创建出货数据）
  async exportYamatoB2(tenantId: string, dto: Record<string, any>) {
    const authHeaders = await this.getB2AuthHeaders(tenantId, dto.apiKey);
    const result = await this.proxyToB2('/api/v1/shipments', 'POST', dto.shipments ?? dto, authHeaders);
    return result.data;
  }

  // ヤマトB2印刷（発行） / 大和B2打印（发行）
  async printYamatoB2(tenantId: string, dto: Record<string, any>) {
    const authHeaders = await this.getB2AuthHeaders(tenantId, dto.apiKey);
    const result = await this.proxyToB2('/api/v1/shipments/print', 'POST', dto, authHeaders);
    return result.data;
  }

  // ヤマトB2バッチPDF取得 / 大和B2批量PDF获取
  async fetchBatchPdf(tenantId: string, dto: Record<string, any>) {
    const authHeaders = await this.getB2AuthHeaders(tenantId, dto.apiKey);
    const result = await this.proxyToB2('/api/v1/shipments/pdf/batch', 'POST', dto, authHeaders);
    return result.data;
  }

  // ヤマトB2インポート（履歴取込）/ 大和B2导入（历史导入）
  async importYamatoB2(tenantId: string, dto: Record<string, any>) {
    const authHeaders = await this.getB2AuthHeaders(tenantId, dto.apiKey);
    const result = await this.proxyToB2('/api/v1/history/all', 'GET', undefined, authHeaders);
    return result.data;
  }

  // ヤマトB2履歴取得 / 大和B2获取历史记录
  async historyYamatoB2(tenantId: string) {
    const authHeaders = await this.getB2AuthHeaders(tenantId);
    const result = await this.proxyToB2('/api/v1/history', 'GET', undefined, authHeaders);
    return result.data;
  }

  // ヤマトB2確定取消 / 大和B2取消确认
  async unconfirmYamatoB2(tenantId: string, dto: Record<string, any>) {
    const authHeaders = await this.getB2AuthHeaders(tenantId, dto.apiKey);
    const result = await this.proxyToB2('/api/v1/shipments', 'DELETE', dto, authHeaders);
    return result.data;
  }

  // === ヤマト運賃計算メソッド / 大和运费计算方法 ===
  // 注: 運賃計算はB2 APIにはない。DB設定ベース / 注: 运费计算不走B2 API，基于DB配置

  // ヤマト運賃見積 / 大和运费估算
  async estimateYamatoCalc(tenantId: string, dto: Record<string, any>) {
    // DB設定から運賃テーブル取得して計算 / 从DB配置获取运费表进行计算
    try {
      const config = await this.findConfigByType(tenantId, 'yamato-calc');
      const rates = (config.config as Record<string, any>)?.rates ?? {};
      const size = dto.size ?? 60;
      const zone = dto.zone ?? 1;
      const rate = (rates as any)?.[size]?.[zone] ?? 0;
      return { estimatedCost: rate, size, zone, currency: 'JPY' };
    } catch {
      return { estimatedCost: 0, size: dto.size, zone: dto.zone, currency: 'JPY', error: 'Config not found' };
    }
  }

  // ヤマト運賃率取得 / 获取大和运费率
  async getYamatoCalcRates(tenantId: string) {
    try {
      const config = await this.findConfigByType(tenantId, 'yamato-calc');
      return config.config;
    } catch {
      return { rates: {} };
    }
  }

  // ヤマト運賃率更新 / 更新大和运费率
  async updateYamatoCalcRates(tenantId: string, dto: Record<string, any>) {
    return this.updateConfig(tenantId, 'yamato-calc', { config: dto });
  }
}
