// ユーザーコントローラ / 用户控制器
import { Controller, Get, Post, Put, Delete, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';
import { RequireRole } from '../common/decorators/require-role.decorator.js';

@Controller('api/users')
@RequireRole('admin')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ユーザー一覧取得 / 获取用户列表
  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.usersService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
      role,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  // ユーザーID検索 / 按ID查找用户
  @Get(':id')
  findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usersService.findById(tenantId, id);
  }

  // サブユーザー取得 / 获取子用户
  @Get(':id/sub-users')
  findSubUsers(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usersService.findSubUsers(tenantId, id);
  }

  // ユーザー作成 / 创建用户
  @Post()
  create(
    @TenantId() tenantId: string,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.usersService.create(tenantId, dto);
  }

  // ユーザー更新 / 更新用户
  @Put(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.usersService.update(tenantId, id, dto);
  }

  // パスワード変更 / 更改密码
  @Put(':id/change-password')
  changePassword(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { newPassword: string },
  ) {
    return this.usersService.changePassword(tenantId, id, dto);
  }

  // ユーザー削除 / 删除用户
  @Delete(':id')
  remove(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usersService.remove(tenantId, id);
  }
}
