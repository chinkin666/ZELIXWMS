// 管理コントローラ / 管理控制器
import { Controller, Get, Post, Put, Delete, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { AdminService } from './admin.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';
import { RequireRole } from '../common/decorators/require-role.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { createUserSchema, updateUserSchema, type CreateUserDto, type UpdateUserDto } from './dto/create-user.dto.js';
import {
  createTenantSchema, updateTenantSchema, upsertSettingsSchema,
  type CreateTenantDto, type UpdateTenantDto, type UpsertSettingsDto,
} from './dto/create-tenant.dto.js';

@Controller('api/admin')
@RequireRole('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ========== ユーザー管理 / 用户管理 ==========

  // ユーザー一覧取得 / 获取用户列表
  @Get('users')
  findAllUsers(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('email') email?: string,
    @Query('role') role?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.adminService.findAllUsers(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      email,
      role,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  // ユーザーID検索 / 按ID查找用户
  @Get('users/:id')
  findUserById(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.adminService.findUserById(tenantId, id);
  }

  // ユーザー作成 / 创建用户
  @Post('users')
  createUser(
    @TenantId() tenantId: string,
    @Body(new ZodValidationPipe(createUserSchema)) dto: CreateUserDto,
  ) {
    return this.adminService.createUser(tenantId, dto);
  }

  // ユーザー更新 / 更新用户
  @Put('users/:id')
  updateUser(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateUserSchema)) dto: UpdateUserDto,
  ) {
    return this.adminService.updateUser(tenantId, id, dto);
  }

  // ユーザー削除（isActive=falseに設定）/ 删除用户（设为isActive=false）
  @Delete('users/:id')
  removeUser(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.adminService.removeUser(tenantId, id);
  }

  // ========== システム設定 / 系统设置 ==========

  // 設定取得 / 获取设置
  @Get('settings/:key')
  getSettings(
    @TenantId() tenantId: string,
    @Param('key') key: string,
  ) {
    return this.adminService.getSettings(tenantId, key);
  }

  // 設定更新（Zodバリデーション適用）/ 更新设置（应用Zod验证）
  @Put('settings/:key')
  upsertSettings(
    @TenantId() tenantId: string,
    @Param('key') key: string,
    @Body(new ZodValidationPipe(upsertSettingsSchema)) dto: UpsertSettingsDto,
  ) {
    return this.adminService.upsertSettings(tenantId, key, dto.settings);
  }

  // ========== ダッシュボード / 仪表盘 ==========

  // 管理ダッシュボード / 管理仪表盘
  @Get('dashboard')
  getDashboard(@TenantId() tenantId: string) {
    return this.adminService.getDashboard(tenantId);
  }

  // ========== テナント管理（superadmin限定）/ 租户管理（仅superadmin） ==========

  // テナント一覧取得 / 获取租户列表
  @Get('tenants')
  @RequireRole('superadmin')
  findAllTenants(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.findAllTenants({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  // テナントID検索 / 按ID查找租户
  @Get('tenants/:id')
  @RequireRole('superadmin')
  findTenantById(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.findTenantById(id);
  }

  // テナント作成（Zodバリデーション適用）/ 创建租户（应用Zod验证）
  @Post('tenants')
  @RequireRole('superadmin')
  createTenant(
    @Body(new ZodValidationPipe(createTenantSchema)) dto: CreateTenantDto,
  ) {
    return this.adminService.createTenant(dto);
  }

  // テナント更新（Zodバリデーション適用）/ 更新租户（应用Zod验证）
  @Put('tenants/:id')
  @RequireRole('superadmin')
  updateTenant(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateTenantSchema)) dto: UpdateTenantDto,
  ) {
    return this.adminService.updateTenant(id, dto);
  }

  // ========== APIログ / API日志 ==========

  // APIログ取得 / 获取API日志
  // TODO: [stub] 実テーブルから取得するよう実装が必要 / 需要实现从实际表中获取
  @Get('api-logs')
  findApiLogs(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.findApiLogs(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  // ========== 操作ログ / 操作日志 ==========

  // 操作ログ取得 / 获取操作日志
  @Get('operation-logs')
  findOperationLogs(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('action') action?: string,
    @Query('resourceType') resourceType?: string,
  ) {
    return this.adminService.findOperationLogs(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      action,
      resourceType,
    });
  }

  // テナント統計ダッシュボード / 租户统计仪表盘
  @Get('dashboard/tenant-stats')
  getTenantStats(@TenantId() tenantId: string) {
    return this.adminService.getTenantStats(tenantId);
  }
}
