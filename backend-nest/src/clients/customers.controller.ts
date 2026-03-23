// カスタマーコントローラ / 顾客控制器
import { Controller, Get, Post, Put, Delete, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { CustomersService } from './customers.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';
import { RequireRole } from '../common/decorators/require-role.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { createCustomerSchema, updateCustomerSchema, type CreateCustomerDto, type UpdateCustomerDto } from './dto/create-customer.dto.js';

@Controller('api/customers')
@RequireRole('admin', 'manager', 'operator')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  // カスタマー一覧取得 / 获取顾客列表
  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('clientId') clientId?: string,
    @Query('code') code?: string,
    @Query('name') name?: string,
    @Query('email') email?: string,
  ) {
    return this.customersService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      clientId,
      code,
      name,
      email,
    });
  }

  // カスタマーエクスポート / 导出顾客
  @Get('export')
  exportCustomers(@TenantId() tenantId: string) {
    return this.customersService.exportCustomers(tenantId);
  }

  // カスタマーID検索 / 按ID查找顾客
  @Get(':id')
  findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.customersService.findById(tenantId, id);
  }

  // カスタマー一括インポート / 顾客批量导入
  @Post('bulk-import')
  bulkImport(
    @TenantId() tenantId: string,
    @Body() body: { customers: Record<string, any>[] },
  ) {
    return this.customersService.bulkImport(tenantId, body.customers);
  }

  // カスタマー作成 / 创建顾客
  @Post()
  create(
    @TenantId() tenantId: string,
    @Body(new ZodValidationPipe(createCustomerSchema)) dto: CreateCustomerDto,
  ) {
    return this.customersService.create(tenantId, dto);
  }

  // カスタマー更新 / 更新顾客
  @Put(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateCustomerSchema)) dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(tenantId, id, dto);
  }

  // カスタマー削除 / 删除顾客
  @Delete(':id')
  remove(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.customersService.remove(tenantId, id);
  }
}
