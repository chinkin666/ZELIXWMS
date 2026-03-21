// 外部連携コントローラ / 外部集成控制器
import { Controller, Get } from '@nestjs/common';
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
}
