// クライアントポータルコントローラ / 客户门户控制器
import { Controller, Get, Query } from '@nestjs/common';
import { ClientPortalService } from './client-portal.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';
import { RequireRole } from '../common/decorators/require-role.decorator.js';

@Controller('api/portal')
@RequireRole('client')
export class ClientPortalController {
  constructor(private readonly clientPortalService: ClientPortalService) {}

  // ポータルダッシュボード取得 / 获取门户仪表盘
  @Get('dashboard')
  getDashboard(
    @TenantId() tenantId: string,
    @Query('clientId') clientId: string,
  ) {
    return this.clientPortalService.getDashboard(tenantId, clientId);
  }

  // クライアントの出荷注文一覧 / 获取客户出货订单列表
  @Get('orders')
  getOrders(
    @TenantId() tenantId: string,
    @Query('clientId') clientId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.clientPortalService.getOrders(tenantId, clientId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
    });
  }

  // クライアントの入荷注文一覧 / 获取客户入库订单列表
  @Get('inbound')
  getInbound(
    @TenantId() tenantId: string,
    @Query('clientId') clientId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.clientPortalService.getInbound(tenantId, clientId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
    });
  }

  // クライアントの請求情報 / 获取客户账单信息
  @Get('billing')
  getBilling(
    @TenantId() tenantId: string,
    @Query('clientId') clientId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.clientPortalService.getBilling(tenantId, clientId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  // クライアントの出荷一覧（ordersのエイリアス）/ 获取客户出货列表（orders的别名）
  @Get('shipments')
  getShipments(
    @TenantId() tenantId: string,
    @Query('clientId') clientId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.clientPortalService.getOrders(tenantId, clientId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
    });
  }

  // クライアントの在庫一覧 / 获取客户库存列表
  @Get('inventory')
  getInventory(
    @TenantId() tenantId: string,
    @Query('clientId') clientId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return { items: [], total: 0, page: page ? parseInt(page, 10) : 1, limit: limit ? parseInt(limit, 10) : 20, message: 'Not implemented yet / 未実装 / 尚未实现' };
  }
}
