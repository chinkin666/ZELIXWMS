// 通知設定コントローラ / 通知偏好控制器
import { Controller, Get, Put, Body } from '@nestjs/common';
import { NotificationPreferencesService } from './notification-preferences.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';

@Controller('api/notification-preferences')
export class NotificationPreferencesController {
  constructor(private readonly notificationPreferencesService: NotificationPreferencesService) {}

  // 通知設定取得 / 获取通知偏好
  @Get()
  findAll(@TenantId() tenantId: string) {
    return { preferences: {}, message: 'Not implemented yet / 未実装 / 尚未实现' };
  }

  // 通知設定更新 / 更新通知偏好
  @Put()
  update(@TenantId() tenantId: string, @Body() dto: Record<string, unknown>) {
    return { message: 'Not implemented yet / 未実装 / 尚未实现', status: 'placeholder' };
  }
}
