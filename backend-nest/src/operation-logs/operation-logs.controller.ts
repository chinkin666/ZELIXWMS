// 操作ログコントローラ / 操作日志控制器
import { Controller, Get, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { OperationLogsService } from './operation-logs.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';
import { RequireRole } from '../common/decorators/require-role.decorator.js';

@Controller('api/operation-logs')
@RequireRole('admin', 'manager', 'operator', 'viewer')
export class OperationLogsController {
  constructor(private readonly operationLogsService: OperationLogsService) {}

  // 操作ログ一覧取得（ページネーション・フィルター対応）
  // 获取操作日志列表（支持分页和过滤）
  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('action') action?: string,
    @Query('resourceType') resourceType?: string,
    @Query('userId') userId?: string,
  ) {
    return this.operationLogsService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      action,
      resourceType,
      userId,
    });
  }

  // 操作ログ詳細取得 / 获取操作日志详情
  @Get(':id')
  findById(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.operationLogsService.findById(tenantId, id);
  }
}
