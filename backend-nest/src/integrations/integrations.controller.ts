// 外部連携コントローラ / 外部集成控制器
import { Controller, Get, Post, Put, Body } from '@nestjs/common';
import { IntegrationsService } from './integrations.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';

@Controller('api/integrations')
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

  // OMS同期（プレースホルダー）/ OMS同步（占位符）
  @Post('oms/sync')
  syncOms(
    @TenantId() tenantId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return { message: 'Not implemented yet / 未実装 / 尚未实现', status: 'placeholder' };
  }

  // OMS設定更新（プレースホルダー）/ 更新OMS配置（占位符）
  @Put('oms/config')
  updateOmsConfig(
    @TenantId() tenantId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return { message: 'Not implemented yet / 未実装 / 尚未实现', status: 'placeholder' };
  }

  // マーケットプレイス同期（プレースホルダー）/ 市场平台同步（占位符）
  @Post('marketplace/sync')
  syncMarketplace(
    @TenantId() tenantId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return { message: 'Not implemented yet / 未実装 / 尚未实现', status: 'placeholder' };
  }

  // マーケットプレイス設定更新（プレースホルダー）/ 更新市场平台配置（占位符）
  @Put('marketplace/config')
  updateMarketplaceConfig(
    @TenantId() tenantId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return { message: 'Not implemented yet / 未実装 / 尚未实现', status: 'placeholder' };
  }

  // ERP同期（プレースホルダー）/ ERP同步（占位符）
  @Post('erp/sync')
  syncErp(
    @TenantId() tenantId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return { message: 'Not implemented yet / 未実装 / 尚未实现', status: 'placeholder' };
  }

  // ERP設定更新（プレースホルダー）/ 更新ERP配置（占位符）
  @Put('erp/config')
  updateErpConfig(
    @TenantId() tenantId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return { message: 'Not implemented yet / 未実装 / 尚未实现', status: 'placeholder' };
  }
}
