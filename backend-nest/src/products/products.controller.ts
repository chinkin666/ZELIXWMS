// 商品コントローラ / 商品控制器
import { Controller, Get, Post, Put, Delete, Param, Query, Body, UsePipes, ParseUUIDPipe } from '@nestjs/common';
import { ProductsService } from './products.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { createProductSchema, updateProductSchema, type CreateProductDto, type UpdateProductDto } from './dto/create-product.dto.js';

@Controller('api/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // 商品一覧取得 / 获取商品列表
  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sku') sku?: string,
    @Query('name') name?: string,
    @Query('category') category?: string,
    @Query('brandCode') brandCode?: string,
  ) {
    return this.productsService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      sku,
      name,
      category,
      brandCode,
    });
  }

  // 商品ID検索 / 按ID查找商品
  @Get(':id')
  findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.productsService.findById(tenantId, id);
  }

  // 商品作成 / 创建商品
  @Post()
  create(
    @TenantId() tenantId: string,
    @Body(new ZodValidationPipe(createProductSchema)) dto: CreateProductDto,
  ) {
    return this.productsService.create(tenantId, dto);
  }

  // 商品更新 / 更新商品
  @Put(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateProductSchema)) dto: UpdateProductDto,
  ) {
    return this.productsService.update(tenantId, id, dto);
  }

  // 商品削除（論理削除）/ 删除商品（软删除）
  @Delete(':id')
  remove(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.productsService.remove(tenantId, id);
  }
}
