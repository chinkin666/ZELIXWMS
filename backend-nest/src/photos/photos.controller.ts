// 写真管理コントローラ / 照片管理控制器
import { Controller, Get, Post, Delete, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { PhotosService } from './photos.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';

@Controller('api/photos')
export class PhotosController {
  constructor(private readonly photosService: PhotosService) {}

  // 写真一覧取得 / 获取照片列表
  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
  ) {
    return this.photosService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      entityType,
      entityId,
    });
  }

  // 写真詳細取得 / 获取照片详情
  @Get(':id')
  findById(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.photosService.findById(tenantId, id);
  }

  // 写真アップロード / 上传照片
  @Post('upload')
  upload(
    @TenantId() tenantId: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.photosService.upload(tenantId, dto);
  }

  // 写真削除 / 删除照片
  @Delete(':id')
  remove(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.photosService.remove(tenantId, id);
  }

  // 写真一括アップロード / 批量上传照片
  @Post('bulk-upload')
  bulkUpload(
    @TenantId() tenantId: string,
    @Body() dto: { photos: Record<string, any>[] },
  ) {
    return this.photosService.bulkUpload(tenantId, dto.photos);
  }
}
