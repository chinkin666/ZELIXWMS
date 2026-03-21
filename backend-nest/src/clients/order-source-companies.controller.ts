// 依頼元会社コントローラ / 委托方公司控制器
import { Controller, Get, Post, Put, Delete, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { OrderSourceCompaniesService } from './order-source-companies.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { createOrderSourceCompanySchema, updateOrderSourceCompanySchema, type CreateOrderSourceCompanyDto, type UpdateOrderSourceCompanyDto } from './dto/create-order-source-company.dto.js';

@Controller('api/order-source-companies')
export class OrderSourceCompaniesController {
  constructor(private readonly orderSourceCompaniesService: OrderSourceCompaniesService) {}

  // 依頼元会社一覧取得 / 获取委托方公司列表
  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('senderName') senderName?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.orderSourceCompaniesService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      senderName,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  // 依頼元会社ID検索 / 按ID查找委托方公司
  @Get(':id')
  findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.orderSourceCompaniesService.findById(tenantId, id);
  }

  // 依頼元会社作成 / 创建委托方公司
  @Post()
  create(
    @TenantId() tenantId: string,
    @Body(new ZodValidationPipe(createOrderSourceCompanySchema)) dto: CreateOrderSourceCompanyDto,
  ) {
    return this.orderSourceCompaniesService.create(tenantId, dto);
  }

  // 依頼元会社更新 / 更新委托方公司
  @Put(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateOrderSourceCompanySchema)) dto: UpdateOrderSourceCompanyDto,
  ) {
    return this.orderSourceCompaniesService.update(tenantId, id, dto);
  }

  // 依頼元会社削除 / 删除委托方公司
  @Delete(':id')
  remove(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.orderSourceCompaniesService.remove(tenantId, id);
  }
}
