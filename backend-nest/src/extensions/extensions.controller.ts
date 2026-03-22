// 拡張機能コントローラ（Webhook・フィーチャーフラグ）/ 扩展功能控制器（Webhook・功能开关）
import { Controller, Get, Post, Put, Delete, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { ExtensionsService } from './extensions.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { createWebhookSchema, updateWebhookSchema, type CreateWebhookDto, type UpdateWebhookDto } from './dto/create-webhook.dto.js';

@Controller('api/extensions')
export class ExtensionsController {
  constructor(private readonly extensionsService: ExtensionsService) {}

  // SDK情報取得（スタブ） / 获取SDK信息（存根）
  @Get('sdk-info')
  getSdkInfo() {
    return {
      version: '1.0.0',
      availablePlugins: [],
      documentation: '',
    };
  }

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

  // Webhookテスト送信 / 测试发送Webhook
  @Post('webhooks/:id/test')
  testWebhook(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.extensionsService.testWebhook(tenantId, id);
  }

  // Webhookログ取得 / 获取Webhook日志
  @Get('webhooks/:id/logs')
  getWebhookLogs(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.extensionsService.getWebhookLogs(tenantId, id, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  // ===== フィーチャーフラグ エンドポイント / 功能开关端点 =====

  // フィーチャーフラグ一覧取得 / 获取功能开关列表
  @Get('feature-flags')
  findAllFlags() {
    return this.extensionsService.findAllFlags();
  }

  // フィーチャーフラグキー検索 / 按key查找功能开关
  @Get('feature-flags/:key')
  findFlagByKey(@Param('key') key: string) {
    return this.extensionsService.findFlagByKey(key);
  }

  // フィーチャーフラグ作成 / 创建功能开关
  @Post('feature-flags')
  createFlag(@Body() dto: Record<string, unknown>) {
    return this.extensionsService.createFlag(dto);
  }

  // フィーチャーフラグ更新 / 更新功能开关
  @Put('feature-flags/:key')
  updateFlag(
    @Param('key') key: string,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.extensionsService.updateFlag(key, dto);
  }

  // フィーチャーフラグ削除 / 删除功能开关
  @Delete('feature-flags/:key')
  removeFlag(@Param('key') key: string) {
    return this.extensionsService.removeFlag(key);
  }

  // フィーチャーフラグ切替 / 切换功能开关
  @Put('feature-flags/:id/toggle')
  toggleFlag(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.extensionsService.toggleFlag(id);
  }

  // ===== プラグイン エンドポイント / 插件端点 =====

  // プラグイン一覧取得 / 获取插件列表
  @Get('plugins')
  findAllPlugins(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.extensionsService.findAllPlugins(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  // プラグインID検索 / 按ID查找插件
  @Get('plugins/:id')
  findPluginById(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.extensionsService.findPluginById(tenantId, id);
  }

  // プラグインインストール / 安装插件
  @Post('plugins')
  installPlugin(
    @TenantId() tenantId: string,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.extensionsService.installPlugin(tenantId, dto);
  }

  // プラグイン設定更新 / 更新插件配置
  @Put('plugins/:id')
  updatePlugin(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.extensionsService.updatePlugin(tenantId, id, dto);
  }

  // プラグインアンインストール / 卸载插件
  @Delete('plugins/:id')
  uninstallPlugin(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.extensionsService.uninstallPlugin(tenantId, id);
  }

  // プラグイン有効化 / 启用插件
  @Post('plugins/:id/enable')
  enablePlugin(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.extensionsService.setPluginEnabled(tenantId, id, true);
  }

  // プラグイン無効化 / 禁用插件
  @Post('plugins/:id/disable')
  disablePlugin(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.extensionsService.setPluginEnabled(tenantId, id, false);
  }

  // ===== スクリプト エンドポイント / 脚本端点 =====

  // スクリプト一覧取得 / 获取脚本列表
  @Get('scripts')
  findAllScripts(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.extensionsService.findAllScripts(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  // スクリプトID検索 / 按ID查找脚本
  @Get('scripts/:id')
  findScriptById(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.extensionsService.findScriptById(tenantId, id);
  }

  // スクリプト作成 / 创建脚本
  @Post('scripts')
  createScript(
    @TenantId() tenantId: string,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.extensionsService.createScript(tenantId, dto);
  }

  // スクリプト更新 / 更新脚本
  @Put('scripts/:id')
  updateScript(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.extensionsService.updateScript(tenantId, id, dto);
  }

  // スクリプト削除 / 删除脚本
  @Delete('scripts/:id')
  removeScript(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.extensionsService.removeScript(tenantId, id);
  }

  // スクリプト実行 / 执行脚本
  @Post('scripts/:id/execute')
  executeScript(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.extensionsService.executeScript(tenantId, id);
  }

  // スクリプトログ取得 / 获取脚本日志
  @Get('scripts/:id/logs')
  getScriptLogs(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.extensionsService.getScriptLogs(tenantId, id);
  }

  // ===== カスタムフィールド エンドポイント / 自定义字段端点 =====

  // カスタムフィールド一覧取得 / 获取自定义字段列表
  @Get('custom-fields')
  findAllCustomFields(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('entityType') entityType?: string,
  ) {
    return this.extensionsService.findAllCustomFields(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      entityType,
    });
  }

  // カスタムフィールドID検索 / 按ID查找自定义字段
  @Get('custom-fields/:id')
  findCustomFieldById(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.extensionsService.findCustomFieldById(tenantId, id);
  }

  // カスタムフィールド作成 / 创建自定义字段
  @Post('custom-fields')
  createCustomField(
    @TenantId() tenantId: string,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.extensionsService.createCustomField(tenantId, dto);
  }

  // カスタムフィールド更新 / 更新自定义字段
  @Put('custom-fields/:id')
  updateCustomField(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.extensionsService.updateCustomField(tenantId, id, dto);
  }

  // カスタムフィールド削除 / 删除自定义字段
  @Delete('custom-fields/:id')
  removeCustomField(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.extensionsService.removeCustomField(tenantId, id);
  }

  // ===== 自動処理ルール エンドポイント / 自动处理规则端点 =====

  // 自動処理ルール一覧取得 / 获取自动处理规则列表
  @Get('auto-processing-rules')
  findAllAutoProcessingRules(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.extensionsService.findAllAutoProcessingRules(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  // 自動処理ルール作成 / 创建自动处理规则
  @Post('auto-processing-rules')
  createAutoProcessingRule(
    @TenantId() tenantId: string,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.extensionsService.createAutoProcessingRule(tenantId, dto);
  }

  // 自動処理ルール更新 / 更新自动处理规则
  @Put('auto-processing-rules/:id')
  updateAutoProcessingRule(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.extensionsService.updateAutoProcessingRule(tenantId, id, dto);
  }

  // 自動処理ルールID検索 / 按ID查找自动处理规则
  @Get('auto-processing-rules/:id')
  findAutoProcessingRuleById(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.extensionsService.findAutoProcessingRuleById(tenantId, id);
  }

  // 自動処理ルール削除 / 删除自动处理规则
  @Delete('auto-processing-rules/:id')
  removeAutoProcessingRule(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.extensionsService.removeAutoProcessingRule(tenantId, id);
  }

  // 自動処理ルールログ取得 / 获取自动处理规则日志
  @Get('auto-processing-rules/:id/logs')
  getAutoProcessingRuleLogs(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.extensionsService.getAutoProcessingRuleLogs(tenantId, id);
  }
}
