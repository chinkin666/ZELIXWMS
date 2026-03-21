// 拡張機能コントローラ（Webhook・フィーチャーフラグ）/ 扩展功能控制器（Webhook・功能开关）
import { Controller, Get, Post, Put, Delete, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { ExtensionsService } from './extensions.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { createWebhookSchema, updateWebhookSchema, type CreateWebhookDto, type UpdateWebhookDto } from './dto/create-webhook.dto.js';

@Controller('api/extensions')
export class ExtensionsController {
  constructor(private readonly extensionsService: ExtensionsService) {}

  // ===== Webhook エンドポイント / Webhook 端点 =====

  // Webhook一覧取得 / 获取Webhook列表
  @Get('webhooks')
  findAllWebhooks(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.extensionsService.findAllWebhooks(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  // WebhookID検索 / 按ID查找Webhook
  @Get('webhooks/:id')
  findWebhookById(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.extensionsService.findWebhookById(tenantId, id);
  }

  // Webhook作成 / 创建Webhook
  @Post('webhooks')
  createWebhook(
    @TenantId() tenantId: string,
    @Body(new ZodValidationPipe(createWebhookSchema)) dto: CreateWebhookDto,
  ) {
    return this.extensionsService.createWebhook(tenantId, dto);
  }

  // Webhook更新 / 更新Webhook
  @Put('webhooks/:id')
  updateWebhook(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateWebhookSchema)) dto: UpdateWebhookDto,
  ) {
    return this.extensionsService.updateWebhook(tenantId, id, dto);
  }

  // Webhook削除（物理削除）/ 删除Webhook（硬删除）
  @Delete('webhooks/:id')
  removeWebhook(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.extensionsService.removeWebhook(tenantId, id);
  }

  // ===== フィーチャーフラグ エンドポイント / 功能开关端点 =====

  // フィーチャーフラグ一覧取得 / 获取功能开关列表
  @Get('feature-flags')
  findAllFlags() {
    return this.extensionsService.findAllFlags();
  }

  // フィーチャーフラグ切替 / 切换功能开关
  @Put('feature-flags/:id/toggle')
  toggleFlag(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.extensionsService.toggleFlag(id);
  }
}
