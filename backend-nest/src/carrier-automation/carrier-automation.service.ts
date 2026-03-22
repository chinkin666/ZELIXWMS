// 配送業者自動化サービス / 配送业者自动化服务
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WmsException } from '../common/exceptions/wms.exception.js';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { carrierAutomationConfigs } from '../database/schema/carriers.js';
import type { DrizzleDB } from '../database/database.types.js';

// Expressプロキシレスポンス型 / Express代理响应类型
interface ProxyResponse<T = any> {
  readonly status: number;
  readonly data: T;
  readonly ok: boolean;
}

@Injectable()
export class CarrierAutomationService {
  private readonly logger = new Logger(CarrierAutomationService.name);
  private readonly expressPort: number;

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly configService: ConfigService,
  ) {
    this.expressPort = this.configService.get<number>('EXPRESS_API_PORT', 4000);
  }

  // === Expressプロキシヘルパー / Express代理辅助方法 ===

  /**
   * ExpressバックエンドへHTTPリクエストをプロキシする
   * 向Express后端代理HTTP请求
   */
  private async proxyToExpress<T = any>(
    path: string,
    method: string,
    body?: any,
    tenantId?: string,
  ): Promise<ProxyResponse<T>> {
    const url = `http://localhost:${this.expressPort}/api/carrier-automation/${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (tenantId) {
      headers['x-tenant-id'] = tenantId;
    }

    const fetchOptions: RequestInit = {
      method: method.toUpperCase(),
      headers,
    };

    // GETリクエストにはbodyを付けない / GET请求不附带body
    if (body !== undefined && method.toUpperCase() !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    try {
      this.logger.debug(
        `Expressプロキシ: ${method.toUpperCase()} ${url} / Express代理: ${method.toUpperCase()} ${url}`,
      );

      const response = await fetch(url, fetchOptions);
      const data = await response.json() as T;

      if (!response.ok) {
        this.logger.warn(
          `Expressプロキシエラー: ${response.status} ${response.statusText} / Express代理错误: ${response.status} ${response.statusText}`,
        );
      }

      // 不変オブジェクトとして返す / 返回不可变对象
      return Object.freeze({
        status: response.status,
        data,
        ok: response.ok,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Expressプロキシ接続失敗: ${message} / Express代理连接失败: ${message}`,
      );
      throw new WmsException(
        'CARRIER_PROXY_ERROR',
        `Express proxy to ${path} failed: ${message}`,
      );
    }
  }

  // === 設定管理メソッド（変更なし） / 配置管理方法（不变） ===

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
    // 既存チェック / 检查是否已存在
    const existing = await this.db
      .select()
      .from(carrierAutomationConfigs)
      .where(and(
        eq(carrierAutomationConfigs.tenantId, tenantId),
        eq(carrierAutomationConfigs.carrierType, type),
      ))
      .limit(1);

    if (existing.length > 0) {
      // 更新 / 更新
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

    // 新規作成 / 新建
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

  // === ヤマトB2 Expressプロキシメソッド / 大和B2 Express代理方法 ===

  // ヤマトB2ログイン / 大和B2登录
  async loginYamatoB2(tenantId: string, dto: Record<string, any>) {
    const result = await this.proxyToExpress('yamato-b2/login', 'POST', dto, tenantId);
    return result.data;
  }

  // ヤマトB2バリデーション / 大和B2校验
  async validateYamatoB2(tenantId: string, dto: Record<string, any>) {
    const result = await this.proxyToExpress('yamato-b2/validate', 'POST', dto, tenantId);
    return result.data;
  }

  // ヤマトB2エクスポート / 大和B2导出
  async exportYamatoB2(tenantId: string, dto: Record<string, any>) {
    const result = await this.proxyToExpress('yamato-b2/export', 'POST', dto, tenantId);
    return result.data;
  }

  // ヤマトB2印刷 / 大和B2打印
  async printYamatoB2(tenantId: string, dto: Record<string, any>) {
    const result = await this.proxyToExpress('yamato-b2/print', 'POST', dto, tenantId);
    return result.data;
  }

  // ヤマトB2バッチPDF取得 / 大和B2批量PDF获取
  async fetchBatchPdf(tenantId: string, dto: Record<string, any>) {
    const result = await this.proxyToExpress('yamato-b2/pdf/batch', 'POST', dto, tenantId);
    return result.data;
  }

  // ヤマトB2インポート / 大和B2导入
  async importYamatoB2(tenantId: string, dto: Record<string, any>) {
    const result = await this.proxyToExpress('yamato-b2/import', 'POST', dto, tenantId);
    return result.data;
  }

  // ヤマトB2履歴取得 / 大和B2获取历史记录
  async historyYamatoB2(tenantId: string) {
    const result = await this.proxyToExpress('yamato-b2/history', 'GET', undefined, tenantId);
    return result.data;
  }

  // ヤマトB2確定取消 / 大和B2取消确认
  async unconfirmYamatoB2(tenantId: string, dto: Record<string, any>) {
    const result = await this.proxyToExpress('yamato-b2/unconfirm', 'POST', dto, tenantId);
    return result.data;
  }

  // === ヤマト運賃計算メソッド（Expressプロキシ） / 大和运费计算方法（Express代理） ===

  // ヤマト運賃見積 / 大和运费估算
  async estimateYamatoCalc(tenantId: string, dto: Record<string, any>) {
    const result = await this.proxyToExpress('yamato-calc/estimate', 'POST', dto, tenantId);
    return result.data;
  }

  // ヤマト運賃率取得 / 获取大和运费率
  async getYamatoCalcRates(tenantId: string) {
    const result = await this.proxyToExpress('yamato-calc/rates', 'GET', undefined, tenantId);
    return result.data;
  }

  // ヤマト運賃率更新 / 更新大和运费率
  async updateYamatoCalcRates(tenantId: string, dto: Record<string, any>) {
    const result = await this.proxyToExpress('yamato-calc/rates', 'PUT', dto, tenantId);
    return result.data;
  }
}
