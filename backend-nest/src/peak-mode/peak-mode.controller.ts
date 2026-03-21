// ピークモードコントローラ / 高峰模式控制器
import { Controller, Get, Post } from '@nestjs/common';
import { PeakModeService } from './peak-mode.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';

@Controller('api/peak-mode')
export class PeakModeController {
  constructor(private readonly peakModeService: PeakModeService) {}

  // ピークモードステータス取得 / 获取高峰模式状态
  @Get('status')
  getStatus(@TenantId() tenantId: string) {
    return this.peakModeService.getStatus(tenantId);
  }

  // ピークモード有効化 / 激活高峰模式
  @Post('activate')
  activate(@TenantId() tenantId: string) {
    return this.peakModeService.activate(tenantId);
  }

  // ピークモード無効化 / 停用高峰模式
  @Post('deactivate')
  deactivate(@TenantId() tenantId: string) {
    return this.peakModeService.deactivate(tenantId);
  }
}
