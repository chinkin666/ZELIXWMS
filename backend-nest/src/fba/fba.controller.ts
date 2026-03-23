// Amazon FBAコントローラ / Amazon FBA控制器
import { Controller, Get, Post, Put, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { FbaService } from './fba.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';
import { RequireRole } from '../common/decorators/require-role.decorator.js';

@Controller('api/fba')
@RequireRole('admin', 'manager', 'operator')
export class FbaController {
  constructor(private readonly fbaService: FbaService) {}

  // ===== 出荷プラン / 出货计划 =====

  // 出荷プラン一覧取得 / 获取出货计划列表
  @Get('shipment-plans')
  findAllPlans(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.fbaService.findAllPlans(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
    });
  }

  // 出荷プラン詳細取得 / 获取出货计划详情
  @Get('shipment-plans/:id')
  findPlanById(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.fbaService.findPlanById(tenantId, id);
  }

  // 出荷プラン作成 / 创建出货计划
  @Post('shipment-plans')
  createPlan(
    @TenantId() tenantId: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.fbaService.createPlan(tenantId, dto);
  }

  // 出荷プラン更新 / 更新出货计划
  @Put('shipment-plans/:id')
  updatePlan(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.fbaService.updatePlan(tenantId, id, dto);
  }

  // 出荷プラン確定 / 确认出货计划
  @Post('shipment-plans/:id/confirm')
  confirmPlan(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.fbaService.confirmPlan(tenantId, id);
  }

  // ===== FBAボックス / FBA箱子 =====

  // FBAボックス一覧取得 / 获取FBA箱子列表
  @Get('boxes')
  findAllBoxes(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('shipmentPlanId') shipmentPlanId?: string,
  ) {
    return this.fbaService.findAllBoxes(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      shipmentPlanId,
    });
  }

  // FBAボックス作成 / 创建FBA箱子
  @Post('boxes')
  createBox(
    @TenantId() tenantId: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.fbaService.createBox(tenantId, dto);
  }

  // FBAボックス更新 / 更新FBA箱子
  @Put('boxes/:id')
  updateBox(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.fbaService.updateBox(tenantId, id, dto);
  }
}
