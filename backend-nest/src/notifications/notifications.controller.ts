// 通知コントローラ / 通知控制器
import { Controller, Get, Post, Put, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { createNotificationSchema, type CreateNotificationDto } from './dto/create-notification.dto.js';

@Controller('api/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // 通知一覧取得 / 获取通知列表
  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('userId') userId?: string,
    @Query('type') type?: string,
    @Query('isRead') isRead?: string,
  ) {
    return this.notificationsService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      userId,
      type,
      isRead: isRead !== undefined ? isRead === 'true' : undefined,
    });
  }

  // 通知ID検索 / 按ID查找通知
  @Get(':id')
  findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notificationsService.findById(tenantId, id);
  }

  // 通知作成 / 创建通知
  @Post()
  create(
    @TenantId() tenantId: string,
    @Body(new ZodValidationPipe(createNotificationSchema)) dto: CreateNotificationDto,
  ) {
    return this.notificationsService.create(tenantId, dto);
  }

  // 単一通知を既読にする / 将单个通知标记为已读
  @Put(':id/read')
  markAsRead(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notificationsService.markAsRead(tenantId, id);
  }

  // 全通知を既読にする / 将全部通知标记为已读
  @Put('read-all')
  markAllRead(
    @TenantId() tenantId: string,
    @Query('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.notificationsService.markAllRead(tenantId, userId);
  }
}
