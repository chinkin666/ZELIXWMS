// 外部連携サービス / 外部集成服务
import { Injectable } from '@nestjs/common';

// 連携ステータスの型定義 / 集成状态类型定义
export interface IntegrationStatus {
  configured: boolean;
  message: string;
  provider?: string;
}

@Injectable()
export class IntegrationsService {
  // FBA連携ステータス（スタブ）/ FBA集成状态（桩）
  async getFbaStatus(tenantId: string): Promise<IntegrationStatus> {
    // TODO: 実際のFBA設定をDBから取得 / 从DB获取实际FBA配置
    return {
      configured: false,
      message: 'FBA integration not configured / FBA連携未設定 / FBA集成未配置',
      provider: 'amazon-fba',
    };
  }

  // RSL連携ステータス（スタブ）/ RSL集成状态（桩）
  async getRslStatus(tenantId: string): Promise<IntegrationStatus> {
    // TODO: 実際のRSL設定をDBから取得 / 从DB获取实际RSL配置
    return {
      configured: false,
      message: 'RSL integration not configured / RSL連携未設定 / RSL集成未配置',
      provider: 'amazon-rsl',
    };
  }

  // OMS連携ステータス（スタブ）/ OMS集成状态（桩）
  async getOmsStatus(tenantId: string): Promise<IntegrationStatus> {
    // TODO: 実際のOMS設定をDBから取得 / 从DB获取实际OMS配置
    return {
      configured: false,
      message: 'OMS integration not configured / OMS連携未設定 / OMS集成未配置',
      provider: 'oms',
    };
  }

  // マーケットプレイスプロバイダ一覧（スタブ）/ 市场平台提供商列表（桩）
  async getMarketplaceProviders(tenantId: string) {
    // TODO: 実際のマーケットプレイス設定をDBから取得 / 从DB获取实际市场平台配置
    return {
      providers: [
        { id: 'shopify', name: 'Shopify', configured: false },
        { id: 'rakuten', name: '楽天市場 / 乐天市场', configured: false },
        { id: 'yahoo', name: 'Yahoo!ショッピング / Yahoo!购物', configured: false },
        { id: 'amazon', name: 'Amazon', configured: false },
        { id: 'base', name: 'BASE', configured: false },
      ],
    };
  }

  // ERP連携ステータス（スタブ）/ ERP集成状态（桩）
  async getErpStatus(tenantId: string): Promise<IntegrationStatus> {
    // TODO: 実際のERP設定をDBから取得 / 从DB获取实际ERP配置
    return {
      configured: false,
      message: 'ERP integration not configured / ERP連携未設定 / ERP集成未配置',
      provider: 'erp',
    };
  }
}
