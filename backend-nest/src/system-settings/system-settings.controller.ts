// システム設定コントローラ / 系统设置控制器
import { Controller, Get, Put, Post, Body } from '@nestjs/common';
import { SystemSettingsService } from './system-settings.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';

@Controller('api/system-settings')
export class SystemSettingsController {
  constructor(private readonly systemSettingsService: SystemSettingsService) {}

  // 設定取得 / 获取设置
  @Get()
  getSettings(@TenantId() tenantId: string) {
    return this.systemSettingsService.getSettings(tenantId);
  }

  // 設定更新 / 更新设置
  @Put()
  updateSettings(
    @TenantId() tenantId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.systemSettingsService.updateSettings(tenantId, body);
  }

  // リセット / 重置
  @Post('reset')
  resetSettings(@TenantId() tenantId: string) {
    return this.systemSettingsService.resetSettings(tenantId);
  }
}
