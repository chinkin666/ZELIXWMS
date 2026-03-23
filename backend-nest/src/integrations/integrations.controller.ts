// 外部連携コントローラ / 外部集成控制器
import { Controller, Get, Post, Put, Body } from '@nestjs/common';
import { IntegrationsService } from './integrations.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';
import { RequireRole } from '../common/decorators/require-role.decorator.js';

@Controller('api/integrations')
@RequireRole('admin')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  // FBA連携ステータス取得 / 获取FBA集成状态
  @Get('fba/status')
  getFbaStatus(@TenantId() tenantId: string) {
    return this.integrationsService.getFbaStatus(tenantId);
  }

  // RSL連携ステータス取得 / 获取RSL集成状态
  @Get('rsl/status')
  getRslStatus(@TenantId() tenantId: string) {
    return this.integrationsService.getRslStatus(tenantId);
  }

  // OMS連携ステータス取得 / 获取OMS集成状态
  @Get('oms/status')
  getOmsStatus(@TenantId() tenantId: string) {
    return this.integrationsService.getOmsStatus(tenantId);
  }

  // マーケットプレイスプロバイダ一覧 / 获取市场平台提供商列表
  @Get('marketplace/providers')
  getMarketplaceProviders(@TenantId() tenantId: string) {
    return this.integrationsService.getMarketplaceProviders(tenantId);
  }

  // ERP連携ステータス取得 / 获取ERP集成状态
  @Get('erp/status')
  getErpStatus(@TenantId() tenantId: string) {
    return this.integrationsService.getErpStatus(tenantId);
  }

  // OMS設定取得（スタブ） / 获取OMS配置（存根）
  @Get('oms/config')
  getOmsConfig(@TenantId() tenantId: string) {
    return {
      endpointUrl: '',
      apiKey: '',
      syncInterval: 3600,
      autoSync: false,
      syncOrders: false,
      syncInventory: false,
      syncShipments: false,
    };
  }

  // ERP設定取得（スタブ） / 获取ERP配置（存根）
  @Get('erp/config')
  getErpConfig(@TenantId() tenantId: string) {
    return {
      erpType: '',
      endpointUrl: '',
      apiKey: '',
      exportShipments: false,
      exportInvoices: false,
      exportInventory: false,
      syncInterval: 3600,
      autoSync: false,
    };
  }

  // OMS同期 / OMS同步
  @Post('oms/sync')
  syncOms(
    @TenantId() tenantId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.integrationsService.syncOms(tenantId, body);
  }

  // OMS設定更新 / 更新OMS配置
  @Put('oms/config')
  updateOmsConfig(
    @TenantId() tenantId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.integrationsService.updateOmsConfig(tenantId, body);
  }

  // マーケットプレイス同期 / 市场平台同步
  @Post('marketplace/sync')
  syncMarketplace(
    @TenantId() tenantId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.integrationsService.syncMarketplace(tenantId, body);
  }

  // マーケットプレイス設定更新 / 更新市场平台配置
  @Put('marketplace/config')
  updateMarketplaceConfig(
    @TenantId() tenantId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.integrationsService.updateMarketplaceConfig(tenantId, body);
  }

  // ERP同期 / ERP同步
  @Post('erp/sync')
  syncErp(
    @TenantId() tenantId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.integrationsService.syncErp(tenantId, body);
  }

  // ERP設定更新 / 更新ERP配置
  @Put('erp/config')
  updateErpConfig(
    @TenantId() tenantId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.integrationsService.updateErpConfig(tenantId, body);
  }
}
