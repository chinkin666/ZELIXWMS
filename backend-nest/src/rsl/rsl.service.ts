// 楽天RSLサービス / 乐天RSL服务
// プレースホルダー実装 — DB テーブル確定後に本実装へ移行
// 占位符实现 — DB表确定后迁移到正式实装
import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module.js';

interface FindAllQuery {
  page?: number;
  limit?: number;
  status?: string;
}

// RSLプランのステータス遷移定義 / RSL计划状态迁移定义
const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['confirmed'],
  confirmed: ['shipped'],
  shipped: [],
};

@Injectable()
export class RslService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  // RSLプラン一覧取得 / 获取RSL计划列表
  async findAllPlans(tenantId: string, query: FindAllQuery) {
    // TODO: RSLテーブル実装後に本実装 / RSL表实装后正式实现
    return { items: [], total: 0, page: query.page ?? 1, limit: query.limit ?? 20 };
  }

  // RSLプラン詳細取得 / 获取RSL计划详情
  async findPlanById(tenantId: string, id: string) {
    // TODO: RSLテーブル実装後に本実装 / RSL表实装后正式实现
    throw new NotFoundException(
      `RSL plan ${id} not found / RSLプラン ${id} が見つかりません / RSL计划 ${id} 未找到`,
    );
  }

  // RSLプラン作成 / 创建RSL计划
  async createPlan(tenantId: string, dto: Record<string, any>) {
    // TODO: RSLテーブル実装後に本実装 / RSL表实装后正式实现
    return { id: 'placeholder', tenantId, ...dto, status: 'draft', createdAt: new Date() };
  }

  // RSLプラン更新 / 更新RSL计划
  async updatePlan(tenantId: string, id: string, dto: Record<string, any>) {
    // TODO: RSLテーブル実装後に本実装 / RSL表实装后正式实现
    return { id, tenantId, ...dto, updatedAt: new Date() };
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

  // RSLプラン確定 / 确认RSL计划
  async confirmPlan(tenantId: string, id: string) {
    // TODO: RSLテーブル実装後に本実装 / RSL表实装后正式实现
    this.validateStatusTransition('draft', 'confirmed');
    return { id, tenantId, status: 'confirmed', confirmedAt: new Date() };
  }

  // RSLプラン出荷 / RSL计划发货
  async shipPlan(tenantId: string, id: string) {
    // TODO: RSLテーブル実装後に本実装 / RSL表实装后正式实现
    this.validateStatusTransition('confirmed', 'shipped');
    return { id, tenantId, status: 'shipped', shippedAt: new Date() };
  }
}
