// 楽天RSLコントローラ / 乐天RSL控制器
import { Controller, Get, Post, Put, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { RslService } from './rsl.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';
import { RequireRole } from '../common/decorators/require-role.decorator.js';

@Controller('api/rsl')
@RequireRole('admin', 'manager', 'operator')
export class RslController {
  constructor(private readonly rslService: RslService) {}

  // RSLプラン一覧取得 / 获取RSL计划列表
  @Get('plans')
  findAllPlans(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.rslService.findAllPlans(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
    });
  }

  // RSLプラン詳細取得 / 获取RSL计划详情
  @Get('plans/:id')
  findPlanById(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.rslService.findPlanById(tenantId, id);
  }

  // RSLプラン作成 / 创建RSL计划
  @Post('plans')
  createPlan(
    @TenantId() tenantId: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.rslService.createPlan(tenantId, dto);
  }

  // RSLプラン更新 / 更新RSL计划
  @Put('plans/:id')
  updatePlan(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.rslService.updatePlan(tenantId, id, dto);
  }

  // RSLプラン確定 / 确认RSL计划
  @Post('plans/:id/confirm')
  confirmPlan(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.rslService.confirmPlan(tenantId, id);
  }

  // RSLプラン出荷 / RSL计划发货
  @Post('plans/:id/ship')
  shipPlan(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.rslService.shipPlan(tenantId, id);
  }
}
