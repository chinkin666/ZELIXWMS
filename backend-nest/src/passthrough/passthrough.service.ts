// パススルーサービス / 直通服务
// プレースホルダー実装 — パススルーテーブル確定後に本実装へ移行
// 占位符实现 — 直通表确定后迁移到正式实装
import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module.js';

interface FindAllQuery {
  page?: number;
  limit?: number;
  status?: string;
}

// パススルーのステータス遷移定義 / 直通状态迁移定义
const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['arrived'],
  arrived: ['shipped'],
  shipped: [],
};

@Injectable()
export class PassthroughService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  // パススルー注文一覧取得 / 获取直通订单列表
  async findAll(tenantId: string, query: FindAllQuery) {
    // TODO: パススルーテーブル実装後に本実装 / 直通表实装后正式实现
    return { items: [], total: 0, page: query.page ?? 1, limit: query.limit ?? 20 };
  }

  // パススルー注文詳細取得 / 获取直通订单详情
  async findById(tenantId: string, id: string) {
    // TODO: パススルーテーブル実装後に本実装 / 直通表实装后正式实现
    throw new NotFoundException(
      `Passthrough order ${id} not found / パススルー注文 ${id} が見つかりません / 直通订单 ${id} 未找到`,
    );
  }

  // パススルー注文作成 / 创建直通订单
  async create(tenantId: string, dto: Record<string, any>) {
    // TODO: パススルーテーブル実装後に本実装 / 直通表实装后正式实现
    return { id: 'placeholder', tenantId, ...dto, status: 'pending', createdAt: new Date() };
  }

  // ステータス遷移バリデーション / 状态迁移校验
  private validateStatusTransition(currentStatus: string, targetStatus: string): void {
    const allowed = STATUS_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(targetStatus)) {
      throw new BadRequestException(
        `Cannot transition from "${currentStatus}" to "${targetStatus}" / ` +
        `「${currentStatus}」から「${targetStatus}」への遷移は不可 / ` +
        `不能从「${currentStatus}」迁移到「${targetStatus}」`,
      );
    }
  }

  // パススルー注文到着処理 / 直通订单到货处理
  async arrive(tenantId: string, id: string) {
    // TODO: パススルーテーブル実装後に本実装 / 直通表实装后正式实现
    this.validateStatusTransition('pending', 'arrived');
    return { id, tenantId, status: 'arrived', arrivedAt: new Date() };
  }

  // パススルー注文出荷処理 / 直通订单发货处理
  async ship(tenantId: string, id: string) {
    // TODO: パススルーテーブル実装後に本実装 / 直通表实装后正式实现
    this.validateStatusTransition('arrived', 'shipped');
    return { id, tenantId, status: 'shipped', shippedAt: new Date() };
  }

  // ステージングダッシュボード / 暂存仪表板
  async getDashboard(tenantId: string) {
    // TODO: パススルーテーブル実装後に本実装 / 直通表实装后正式实现
    return {
      tenantId,
      summary: {
        pending: 0,
        arrived: 0,
        shipped: 0,
        total: 0,
      },
      recentOrders: [],
    };
  }
}
