// 商品コントローラ / 商品控制器
import { Controller, Get, Post, Put, Patch, Delete, Param, Query, Body, UsePipes, ParseUUIDPipe } from '@nestjs/common';
import { ProductsService } from './products.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { createProductSchema, updateProductSchema, type CreateProductDto, type UpdateProductDto } from './dto/create-product.dto.js';
import { RequireRole } from '../common/decorators/require-role.decorator.js';

@Controller('api/products')
@RequireRole('admin', 'manager', 'operator')
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

  // 商品全文検索（SKU/名前/バーコード）/ 商品全文搜索（SKU/名称/条码）
  @Get('search')
  search(
    @TenantId() tenantId: string,
    @Query('q') q: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.productsService.search(tenantId, q ?? '', {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  // バーコード検索 / 按条码查找商品
  @Get('barcode/:code')
  findByBarcode(
    @TenantId() tenantId: string,
    @Param('code') code: string,
  ) {
    return this.productsService.findByBarcode(tenantId, code);
  }

  // 商品出荷統計（:idルートより前に配置）/ 商品出货统计（放在:id路由之前）
  @Get('shipment-stats')
  getShipmentStats(@TenantId() tenantId: string) {
    return this.productsService.getShipmentStats(tenantId);
  }

  // 商品ID検索 / 按ID查找商品
  @Get(':id')
  findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.productsService.findById(tenantId, id);
  }

  // 商品別在庫取得（在庫サービスへ委譲）/ 获取商品库存（委托给库存服务）
  @Get(':id/stock')
  getProductStock(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    // NOTE: 在庫サービスへのプロキシ。将来的にInventoryServiceを注入する。
    // 注意: 代理到库存服务。将来注入InventoryService。
    return this.productsService.findById(tenantId, id).then((product) => ({
      productId: product.id,
      sku: product.sku,
      name: product.name,
      stock: { message: 'Delegate to inventory service / 在庫サービスに委譲 / 委托给库存服务' },
    }));
  }

  // インポート行バリデーション / 导入行验证
  @Post('validate-import')
  validateImport(
    @TenantId() tenantId: string,
    @Body() body: Record<string, any>[],
  ) {
    return this.productsService.validateImport(tenantId, body);
  }

  // 商品一括インポート（挿入/アップサート）/ 商品批量导入（插入/更新插入）
  @Post('import-bulk')
  importBulk(
    @TenantId() tenantId: string,
    @Body() body: Record<string, any>[],
  ) {
    return this.productsService.importBulk(tenantId, body);
  }

  // SKU利用可否チェック / SKU可用性检查
  @Post('check-sku-availability')
  checkSkuAvailability(
    @TenantId() tenantId: string,
    @Body() body: { sku: string },
  ) {
    return this.productsService.checkSkuAvailability(tenantId, body.sku);
  }

  // 商品CSVインポート / 商品CSV导入
  @Post('import')
  importCsv(
    @TenantId() tenantId: string,
    @Body() body: { products: Record<string, any>[] },
  ) {
    return this.productsService.importCsv(tenantId, body);
  }

  // 商品CSVエクスポート / 商品CSV导出
  @Post('export')
  exportCsv(@TenantId() tenantId: string) {
    return this.productsService.exportCsv(tenantId);
  }

  // 商品一括更新 / 商品批量更新
  @Post('bulk-update')
  bulkUpdate(
    @TenantId() tenantId: string,
    @Body() body: { ids: string[]; data: UpdateProductDto },
  ) {
    return this.productsService.bulkUpdate(tenantId, body.ids, body.data);
  }

  // 商品一括削除（論理削除）/ 商品批量删除（软删除）
  @Post('bulk-delete')
  bulkDelete(
    @TenantId() tenantId: string,
    @Body() body: { ids: string[] },
  ) {
    return this.productsService.bulkDelete(tenantId, body.ids);
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

  // 商品部分更新（PUTのエイリアス）/ 商品部分更新（PUT的别名）
  @Patch(':id')
  partialUpdate(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(tenantId, id, dto);
  }

  // 商品変更履歴取得 / 获取商品变更历史
  @Get(':id/history')
  getHistory(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.productsService.getHistory(tenantId, id);
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
