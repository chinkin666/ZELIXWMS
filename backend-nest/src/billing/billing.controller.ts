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

  // 作業チャージID検索 / 按ID查找作业费用
  @Get('work-charges/:id')
  findWorkChargeById(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.billingService.findWorkChargeById(tenantId, id);
  }

  // 作業チャージ更新 / 更新作业费用
  @Put('work-charges/:id')
  updateWorkCharge(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.billingService.updateWorkCharge(tenantId, id, dto);
  }

  // 作業チャージ削除 / 删除作业费用
  @Delete('work-charges/:id')
  removeWorkCharge(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.billingService.removeWorkCharge(tenantId, id);
  }

  // ============================================
  // 運費率エンドポイント / 运费率端点
  // ============================================

  // 運費率一覧取得 / 获取运费率列表
  @Get('shipping-rates')
  findAllShippingRates(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('carrierId') carrierId?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.billingService.findAllShippingRates(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      carrierId,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  // 運費率ID検索 / 按ID查找运费率
  @Get('shipping-rates/:id')
  findShippingRateById(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.billingService.findShippingRateById(tenantId, id);
  }

  // 運費率作成 / 创建运费率
  @Post('shipping-rates')
  createShippingRate(
    @TenantId() tenantId: string,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.billingService.createShippingRate(tenantId, dto);
  }

  // 運費率更新 / 更新运费率
  @Put('shipping-rates/:id')
  updateShippingRate(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.billingService.updateShippingRate(tenantId, id, dto);
  }

  // 運費率削除（論理削除: isActive=false）/ 删除运费率（软删除: isActive=false）
  @Delete('shipping-rates/:id')
  removeShippingRate(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.billingService.removeShippingRate(tenantId, id);
  }

  // ============================================
  // 請求書エンドポイント / 发票端点
  // ============================================

  // 請求書一覧取得 / 获取发票列表
  @Get('invoices')
  findAllInvoices(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('clientId') clientId?: string,
    @Query('period') period?: string,
  ) {
    return this.billingService.findAllInvoices(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
      clientId,
      period,
    });
  }

  // 請求書ID検索 / 按ID查找发票
  @Get('invoices/:id')
  findInvoiceById(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.billingService.findInvoiceById(tenantId, id);
  }

  // 請求書作成 / 创建发票
  @Post('invoices')
  createInvoice(
    @TenantId() tenantId: string,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.billingService.createInvoice(tenantId, dto);
  }
}
