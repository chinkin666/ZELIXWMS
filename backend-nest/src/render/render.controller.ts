// レンダリングコントローラ / 渲染控制器
import { Controller, Get, Post, Body, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { RenderService } from './render.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';
import { RequireRole } from '../common/decorators/require-role.decorator.js';

@Controller('api/render')
@RequireRole('admin', 'manager', 'operator')
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

  // ===================================================================
  // 入庫差異PDF / 入库差异PDF
  // 入庫指示の予定数と実績数の差異をPDFで出力
  // 输出入库指示预期数量与实际数量差异的PDF
  // ===================================================================
  @Get('inbound/:id/variance-pdf')
  async renderInboundVariancePdf(
    @TenantId() tenantId: string,
    @Param('id') orderId: string,
    @Res() res: Response,
  ) {
    const result = await this.renderService.renderInboundVariance(tenantId, orderId);
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `inline; filename="${result.fileName}"`);
    res.send(result.buffer);
  }

  // ===================================================================
  // 入庫看板PDF / 入库看板PDF
  // 入庫指示のサマリをA4看板形式でPDF出力（バーコード付き）
  // 以A4看板形式输出入库指示汇总PDF（含条形码）
  // ===================================================================
  @Get('inbound/:id/kanban-pdf')
  async renderInboundKanbanPdf(
    @TenantId() tenantId: string,
    @Param('id') orderId: string,
    @Res() res: Response,
  ) {
    const result = await this.renderService.renderInboundKanban(tenantId, orderId);
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `inline; filename="${result.fileName}"`);
    res.send(result.buffer);
  }

  // ===================================================================
  // 棚卸報告書PDF / 盘点报告书PDF
  // 棚卸結果のサマリ報告をPDF出力
  // 输出盘点结果汇总报告PDF
  // ===================================================================
  @Get('stocktaking/:id/report-pdf')
  async renderStocktakingReportPdf(
    @TenantId() tenantId: string,
    @Param('id') orderId: string,
    @Res() res: Response,
  ) {
    const result = await this.renderService.renderStocktakingReport(tenantId, orderId);
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `inline; filename="${result.fileName}"`);
    res.send(result.buffer);
  }

  // ===================================================================
  // ピッキングリストPDF / 拣货单PDF
  // 指定された注文IDのピッキングリストをPDF出力
  // 为指定的订单ID输出拣货单PDF
  // ===================================================================
  @Post('picking-list-pdf')
  async renderPickingListPdf(
    @TenantId() tenantId: string,
    @Body() body: { type: string; orderIds: string[] },
    @Res() res: Response,
  ) {
    const result = await this.renderService.renderPickingListPdf(
      tenantId,
      body.type,
      body.orderIds,
    );
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `inline; filename="${result.fileName}"`);
    res.send(result.buffer);
  }

  // ===================================================================
  // 入庫予定リストPDF / 入库预定列表PDF
  // 入庫指示のライン明細と予定数量をPDF出力
  // 输出入库指示的行明细和预期数量PDF
  // ===================================================================
  @Get('inbound/:id/schedule-pdf')
  async renderInboundSchedulePdf(
    @TenantId() tenantId: string,
    @Param('id') orderId: string,
    @Res() res: Response,
  ) {
    const result = await this.renderService.renderInboundSchedule(tenantId, orderId);
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `inline; filename="${result.fileName}"`);
    res.send(result.buffer);
  }

  // ===================================================================
  // 入庫予定一覧表PDF / 入库预定一览表PDF
  // 複数入庫指示のサマリテーブルをランドスケープPDF出力
  // 以横向PDF输出多个入库指示的汇总表
  // ===================================================================
  @Get('inbound/:id/schedule-summary-pdf')
  async renderInboundScheduleSummaryPdf(
    @TenantId() tenantId: string,
    @Param('id') orderId: string,
    @Res() res: Response,
  ) {
    const result = await this.renderService.renderInboundScheduleSummary(tenantId, orderId);
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `inline; filename="${result.fileName}"`);
    res.send(result.buffer);
  }

  // ===================================================================
  // ロケーション看板PDF / 库位看板PDF
  // 棚に貼る大文字ロケーションラベルをA4横でPDF出力
  // 以A4横向大字体输出库位标签PDF（贴在货架上）
  // ===================================================================
  @Get('inventory/location-signage-pdf')
  async renderLocationSignagePdf(
    @TenantId() tenantId: string,
    @Query('locationIds') locationIds: string,
    @Res() res: Response,
  ) {
    const ids = locationIds ? locationIds.split(',').map((id) => id.trim()) : [];
    const result = await this.renderService.renderLocationSignage(tenantId, ids);
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `inline; filename="${result.fileName}"`);
    res.send(result.buffer);
  }

  // ===================================================================
  // 在庫証明書PDF / 库存证明书PDF
  // 在庫数量・日付・テナント情報付きの証明書PDF出力
  // 输出带库存数量、日期、租户信息的库存证明书PDF
  // ===================================================================
  @Get('inventory/certificate-pdf')
  async renderInventoryCertificatePdf(
    @TenantId() tenantId: string,
    @Query('date') date: string,
    @Query('clientId') clientId: string,
    @Res() res: Response,
  ) {
    const result = await this.renderService.renderInventoryCertificate(
      tenantId,
      date ?? new Date().toISOString().slice(0, 10),
      clientId ?? '',
    );
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `inline; filename="${result.fileName}"`);
    res.send(result.buffer);
  }
}
