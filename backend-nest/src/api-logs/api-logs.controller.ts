// APIログコントローラ / API日志控制器
import { Controller, Get, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiLogsService } from './api-logs.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';
import { RequireRole } from '../common/decorators/require-role.decorator.js';

@Controller('api/api-logs')
@RequireRole('admin', 'manager', 'operator', 'viewer')
export class ApiLogsController {
  constructor(private readonly apiLogsService: ApiLogsService) {}

  // APIログ一覧取得（ページネーション対応） / 获取API日志列表（支持分页）
  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('method') method?: string,
    @Query('statusCode') statusCode?: string,
    @Query('path') path?: string,
  ) {
    return this.apiLogsService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      method,
      statusCode: statusCode ? parseInt(statusCode, 10) : undefined,
      path,
    });
  }

  // APIログ統計取得（スタブ） / 获取API日志统计（存根）
  @Get('stats')
  getStats(
    @TenantId() tenantId: string,
  ) {
    return {
      totalCalls: 0,
      successRate: 100,
      avgDurationMs: 0,
      errorTotal: 0,
      byStatus: {},
      byApiName: [],
    };
  }

  // APIログ詳細取得 / 获取API日志详情
  @Get(':id')
  findById(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.apiLogsService.findById(tenantId, id);
  }
}
