// 日次レポートコントローラ / 日报控制器
import { Controller, Get, Post, Put, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { DailyReportsService } from './daily-reports.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { createDailyReportSchema, updateDailyReportSchema, type CreateDailyReportDto, type UpdateDailyReportDto } from './dto/create-daily-report.dto.js';

@Controller('api/daily-reports')
export class DailyReportsController {
  constructor(private readonly dailyReportsService: DailyReportsService) {}

  // 日次レポート一覧取得 / 获取日报列表
  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.dailyReportsService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      from,
      to,
    });
  }

  // 日次レポートID検索 / 按ID查找日报
  @Get(':id')
  findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.dailyReportsService.findById(tenantId, id);
  }

  // 日次レポート作成 / 创建日报
  @Post()
  create(
    @TenantId() tenantId: string,
    @Body(new ZodValidationPipe(createDailyReportSchema)) dto: CreateDailyReportDto,
  ) {
    return this.dailyReportsService.create(tenantId, dto);
  }

  // 日次レポート更新 / 更新日报
  @Put(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateDailyReportSchema)) dto: UpdateDailyReportDto,
  ) {
    return this.dailyReportsService.update(tenantId, id, dto);
  }

  // 日次レポートクローズ / 关闭日报
  @Post(':date/close')
  close(
    @TenantId() tenantId: string,
    @Param('date') date: string,
  ) {
    return this.dailyReportsService.close(tenantId, date);
  }

  // 日次レポートロック / 锁定日报
  @Post(':date/lock')
  lock(
    @TenantId() tenantId: string,
    @Param('date') date: string,
  ) {
    return this.dailyReportsService.lock(tenantId, date);
  }

  // 日次レポート生成 / 生成日报
  @Post('generate')
  generate(
    @TenantId() tenantId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.dailyReportsService.generate(tenantId, body);
  }

  // 日次レポートエクスポート / 导出日报
  @Post('export')
  exportReports(@TenantId() tenantId: string) {
    return this.dailyReportsService.exportReports(tenantId);
  }
}
