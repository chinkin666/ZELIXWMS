// 配送業者自動化サービス / 配送业者自动化服务
import { Inject, Injectable } from '@nestjs/common';
import { WmsException } from '../common/exceptions/wms.exception.js';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { carrierAutomationConfigs } from '../database/schema/carriers.js';

@Injectable()
export class CarrierAutomationService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  // 自動化設定一覧取得 / 获取自动化配置列表
  async findAllConfigs(tenantId: string) {
    const items = await this.db
      .select()
      .from(carrierAutomationConfigs)
      .where(eq(carrierAutomationConfigs.tenantId, tenantId));

    return { items };
  }

  // 自動化設定タイプ別取得 / 按类型获取自动化配置
  async findConfigByType(tenantId: string, type: string) {
    const rows = await this.db
      .select()
      .from(carrierAutomationConfigs)
      .where(and(
        eq(carrierAutomationConfigs.tenantId, tenantId),
        eq(carrierAutomationConfigs.carrierType, type),
      ))
      .limit(1);

    if (rows.length === 0) {
      throw new WmsException('CARRIER_AUTO_NOT_FOUND', `Type: ${type}`);
    }
    return rows[0];
  }

  // 自動化設定更新（upsert） / 更新自动化配置（upsert）
  async updateConfig(tenantId: string, type: string, dto: Record<string, any>) {
    // 既存チェック / 检查是否已存在
    const existing = await this.db
      .select()
      .from(carrierAutomationConfigs)
      .where(and(
        eq(carrierAutomationConfigs.tenantId, tenantId),
        eq(carrierAutomationConfigs.carrierType, type),
      ))
      .limit(1);

    if (existing.length > 0) {
      // 更新 / 更新
      const rows = await this.db
        .update(carrierAutomationConfigs)
        .set({
          enabled: dto.enabled ?? existing[0].enabled,
          config: dto.config ?? existing[0].config,
          updatedAt: new Date(),
        })
        .where(and(
          eq(carrierAutomationConfigs.tenantId, tenantId),
          eq(carrierAutomationConfigs.carrierType, type),
        ))
        .returning();
      return rows[0];
    }

    // 新規作成 / 新建
    const rows = await this.db
      .insert(carrierAutomationConfigs)
      .values({
        tenantId,
        carrierType: type,
        enabled: dto.enabled ?? false,
        config: dto.config ?? {},
      })
      .returning();
    return rows[0];
  }

  // ヤマトB2バリデーション（プレースホルダー — Expressサービスをラップ予定）
  // 大和B2校验（占位符 — 计划封装Express服务）
  async validateYamatoB2(tenantId: string, dto: Record<string, any>) {
    // TODO: Express yamatoB2Service をラップ / 封装Express yamatoB2Service
    return {
      message: 'Yamato B2 validation placeholder — wraps Express service / ' +
        'ヤマトB2バリデーションプレースホルダー — Expressサービスをラップ / ' +
        '大和B2校验占位符 — 封装Express服务',
      tenantId,
      shipmentIds: dto.shipmentIds ?? [],
    };
  }

  // ヤマトB2エクスポート（プレースホルダー）
  // 大和B2导出（占位符）
  async exportYamatoB2(tenantId: string, dto: Record<string, any>) {
    // TODO: Express yamatoB2Service をラップ / 封装Express yamatoB2Service
    return {
      message: 'Yamato B2 export placeholder — wraps Express service / ' +
        'ヤマトB2エクスポートプレースホルダー — Expressサービスをラップ / ' +
        '大和B2导出占位符 — 封装Express服务',
      tenantId,
      shipmentIds: dto.shipmentIds ?? [],
    };
  }
}
