// 配送業者自動化コントローラ / 配送业者自动化控制器
import { Controller, Get, Put, Post, Param, Body } from '@nestjs/common';
import { CarrierAutomationService } from './carrier-automation.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';

@Controller('api/carrier-automation')
export class CarrierAutomationController {
  constructor(private readonly carrierAutomationService: CarrierAutomationService) {}

  // 自動化設定一覧取得 / 获取自动化配置列表
  @Get('configs')
  findAllConfigs(
    @TenantId() tenantId: string,
  ) {
    return this.carrierAutomationService.findAllConfigs(tenantId);
  }

  // 自動化設定タイプ別取得 / 按类型获取自动化配置
  @Get('configs/:type')
  findConfigByType(
    @TenantId() tenantId: string,
    @Param('type') type: string,
  ) {
    return this.carrierAutomationService.findConfigByType(tenantId, type);
  }

  // 自動化設定タイプ別更新 / 按类型更新自动化配置
  @Put('configs/:type')
  updateConfig(
    @TenantId() tenantId: string,
    @Param('type') type: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.carrierAutomationService.updateConfig(tenantId, type, dto);
  }

  // ヤマトB2バリデーション（プレースホルダー — Expressサービスをラップ）
  // 大和B2校验（占位符 — 封装Express服务）
  @Post('yamato-b2/validate')
  validateYamatoB2(
    @TenantId() tenantId: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.carrierAutomationService.validateYamatoB2(tenantId, dto);
  }

  // ヤマトB2エクスポート（プレースホルダー）
  // 大和B2导出（占位符）
  @Post('yamato-b2/export')
  exportYamatoB2(
    @TenantId() tenantId: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.carrierAutomationService.exportYamatoB2(tenantId, dto);
  }
}
