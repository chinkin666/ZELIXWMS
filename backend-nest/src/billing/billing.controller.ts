// 請求コントローラ / 账单控制器
import { Controller, Get, Post, Put, Delete, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { BillingService } from './billing.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import {
  createServiceRateSchema,
  updateServiceRateSchema,
  type CreateServiceRateDto,
  type UpdateServiceRateDto,
} from './dto/create-service-rate.dto.js';

@Controller('api/billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  // ============================================
  // サービス料金エンドポイント / 服务费率端点
  // ============================================

  // サービス料金一覧取得 / 获取服务费率列表
  @Get('service-rates')
  findAllServiceRates(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('chargeType') chargeType?: string,
    @Query('clientId') clientId?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.billingService.findAllServiceRates(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      chargeType,
      clientId,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  // サービス料金ID検索 / 按ID查找服务费率
  @Get('service-rates/:id')
  findServiceRateById(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.billingService.findServiceRateById(tenantId, id);
  }

  // サービス料金作成 / 创建服务费率
  @Post('service-rates')
  createServiceRate(
    @TenantId() tenantId: string,
    @Body(new ZodValidationPipe(createServiceRateSchema)) dto: CreateServiceRateDto,
  ) {
    return this.billingService.createServiceRate(tenantId, dto);
  }

  // サービス料金更新 / 更新服务费率
  @Put('service-rates/:id')
  updateServiceRate(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateServiceRateSchema)) dto: UpdateServiceRateDto,
  ) {
    return this.billingService.updateServiceRate(tenantId, id, dto);
  }

  // サービス料金削除（論理削除: isActive=false）/ 删除服务费率（软删除: isActive=false）
  @Delete('service-rates/:id')
  removeServiceRate(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.billingService.removeServiceRate(tenantId, id);
  }

  // ============================================
  // 作業チャージエンドポイント / 作业费用端点
  // ============================================

  // 作業チャージ一覧取得 / 获取作业费用列表
  @Get('work-charges')
  findAllWorkCharges(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('chargeType') chargeType?: string,
    @Query('clientId') clientId?: string,
    @Query('isBilled') isBilled?: string,
    @Query('billingPeriod') billingPeriod?: string,
  ) {
    return this.billingService.findAllWorkCharges(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      chargeType,
      clientId,
      isBilled: isBilled !== undefined ? isBilled === 'true' : undefined,
      billingPeriod,
    });
  }

  // 作業チャージ作成 / 创建作业费用
  @Post('work-charges')
  createWorkCharge(
    @TenantId() tenantId: string,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.billingService.createWorkCharge(tenantId, dto);
  }
}
