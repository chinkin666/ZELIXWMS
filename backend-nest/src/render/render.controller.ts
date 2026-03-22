// レンダリングコントローラ / 渲染控制器
import { Controller, Get, Post, Body, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
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
}
