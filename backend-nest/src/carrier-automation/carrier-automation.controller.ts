// 配送業者自動化コントローラ / 配送业者自动化控制器
import { Controller, Get, Put, Post, Param, Body } from '@nestjs/common';
import { CarrierAutomationService } from './carrier-automation.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';

@Controller('api/carrier-automation')
export class CarrierAutomationController {
  constructor(private readonly carrierAutomationService: CarrierAutomationService) {}

  // === 設定管理エンドポイント / 配置管理端点 ===

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

  // === ヤマトB2エンドポイント（Expressプロキシ） / 大和B2端点（Express代理） ===

  // ヤマトB2ログイン / 大和B2登录
  @Post('yamato-b2/login')
  loginYamatoB2(
    @TenantId() tenantId: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.carrierAutomationService.loginYamatoB2(tenantId, dto);
  }

  // ヤマトB2バリデーション / 大和B2校验
  @Post('yamato-b2/validate')
  validateYamatoB2(
    @TenantId() tenantId: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.carrierAutomationService.validateYamatoB2(tenantId, dto);
  }

  // ヤマトB2エクスポート / 大和B2导出
  @Post('yamato-b2/export')
  exportYamatoB2(
    @TenantId() tenantId: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.carrierAutomationService.exportYamatoB2(tenantId, dto);
  }

  // ヤマトB2印刷 / 大和B2打印
  @Post('yamato-b2/print')
  printYamatoB2(
    @TenantId() tenantId: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.carrierAutomationService.printYamatoB2(tenantId, dto);
  }

  // ヤマトB2バッチPDF取得 / 大和B2批量PDF获取
  @Post('yamato-b2/pdf/batch')
  fetchBatchPdf(
    @TenantId() tenantId: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.carrierAutomationService.fetchBatchPdf(tenantId, dto);
  }

  // ヤマトB2インポート / 大和B2导入
  @Post('yamato-b2/import')
  importYamatoB2(
    @TenantId() tenantId: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.carrierAutomationService.importYamatoB2(tenantId, dto);
  }

  // ヤマトB2履歴取得 / 大和B2获取历史记录
  @Get('yamato-b2/history')
  historyYamatoB2(
    @TenantId() tenantId: string,
  ) {
    return this.carrierAutomationService.historyYamatoB2(tenantId);
  }

  // ヤマトB2確定取消 / 大和B2取消确认
  @Post('yamato-b2/unconfirm')
  unconfirmYamatoB2(
    @TenantId() tenantId: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.carrierAutomationService.unconfirmYamatoB2(tenantId, dto);
  }

  // === ヤマト運賃計算エンドポイント（プレースホルダー） / 大和运费计算端点（占位符） ===

  // ヤマト運賃見積 / 大和运费估算
  @Post('yamato-calc/estimate')
  estimateYamatoCalc(
    @TenantId() tenantId: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.carrierAutomationService.estimateYamatoCalc(tenantId, dto);
  }

  // ヤマト運賃率取得 / 获取大和运费率
  @Get('yamato-calc/rates')
  getYamatoCalcRates(@TenantId() tenantId: string) {
    return this.carrierAutomationService.getYamatoCalcRates(tenantId);
  }

  // ヤマト運賃率更新 / 更新大和运费率
  @Put('yamato-calc/rates')
  updateYamatoCalcRates(
    @TenantId() tenantId: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.carrierAutomationService.updateYamatoCalcRates(tenantId, dto);
  }
}
