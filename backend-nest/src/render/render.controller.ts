// レンダリングコントローラ / 渲染控制器
import { Controller, Get, Post, Body } from '@nestjs/common';
import { RenderService } from './render.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';

@Controller('api/render')
export class RenderController {
  constructor(private readonly renderService: RenderService) {}

  // PDF生成 / 生成PDF
  @Post('pdf')
  renderPdf(
    @TenantId() tenantId: string,
    @Body() body: { templateId?: string; data?: Record<string, unknown> },
  ) {
    return this.renderService.renderPdf(tenantId, body.templateId, body.data);
  }

  // バーコード生成 / 生成条形码
  @Post('barcode')
  renderBarcode(
    @TenantId() tenantId: string,
    @Body() body: { value: string; format?: string },
  ) {
    return this.renderService.renderBarcode(tenantId, body.value, body.format);
  }

  // キャッシュ統計取得 / 获取缓存统计
  @Get('cache/stats')
  getCacheStats(@TenantId() tenantId: string) {
    return this.renderService.getCacheStats(tenantId);
  }
}
