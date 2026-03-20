/**
 * 入庫帳票テンプレート シードスクリプト
 * 入库单据模板 种子脚本
 *
 * LOGIFAST 仕様準拠の入庫帳票テンプレート5種を upsert する。
 * 按照 LOGIFAST 规范插入/更新5种入库单据模板。
 *
 * meta.code をキーとして upsert するため、再実行しても重複しない。
 * 以 meta.code 为键进行 upsert，重复执行不会产生重复数据。
 */

import type { AnyBulkWriteOperation } from 'mongoose';
import { PrintTemplate, type IPrintTemplate } from '@/models/printTemplate';
import { logger } from '@/lib/logger';

/* ------------------------------------------------------------------ */
/* 用紙サイズ定義 / 纸张尺寸定义                                      */
/* ------------------------------------------------------------------ */
const PAPER = {
  /** A4 横向き / A4 横向 */
  A4_LANDSCAPE: { widthMm: 297, heightMm: 210, pxPerMm: 4 },
  /** A4 縦向き / A4 纵向 */
  A4_PORTRAIT: { widthMm: 210, heightMm: 297, pxPerMm: 4 },
} as const;

/* ------------------------------------------------------------------ */
/* テンプレート定義 / 模板定义                                         */
/* ------------------------------------------------------------------ */
interface InboundTemplateDef {
  code: string;
  name: string;
  category: string;
  paperSize: string;
  orientation: string;
  description: string;
  canvas: { widthMm: number; heightMm: number; pxPerMm: number };
}

const INBOUND_TEMPLATES: InboundTemplateDef[] = [
  /* -------------------------------------------------------------- */
  /* 1. 入庫予定一覧表 / 入库预定一览表                              */
  /* -------------------------------------------------------------- */
  {
    code: 'INBOUND_SCHEDULE_LIST',
    name: '入庫予定一覧表 / 入库预定一览表',
    category: 'inbound',
    paperSize: 'A4',
    orientation: 'landscape',
    description:
      'LOGIFAST 0531版準拠。入庫予定の全明細を一覧表示。' +
      'Seq/顧客商品コード/検品コード/商品名/納品元名/有効期限/ロット/' +
      '倉庫種類/入庫予定数/入庫数/未入庫数/入庫時付帯作業/備考',
    canvas: PAPER.A4_LANDSCAPE,
  },

  /* -------------------------------------------------------------- */
  /* 2. 入庫チェックリスト / 入库检查单                              */
  /* -------------------------------------------------------------- */
  {
    code: 'INBOUND_CHECKLIST',
    name: '入庫チェックリスト / 入库检查单',
    category: 'inbound',
    paperSize: 'A4',
    orientation: 'landscape',
    description:
      '入庫検品用。Seq/顧客商品コード/検品コード/商品名/納品元/有効期限/' +
      'ロット/入庫予定数/入庫数/差異/結果判明/その他/備考。' +
      'フッターにコンテナ数/パレット数/カートン数/PCS数の集計欄',
    canvas: PAPER.A4_LANDSCAPE,
  },

  /* -------------------------------------------------------------- */
  /* 3. 入庫差異/破損リスト / 入库差异/破损清单                      */
  /* -------------------------------------------------------------- */
  {
    code: 'INBOUND_VARIANCE_LIST',
    name: '入庫差異/破損リスト / 入库差异/破损清单',
    category: 'inbound',
    paperSize: 'A4',
    orientation: 'landscape',
    description:
      '差異分のみ抽出。Seq/顧客商品コード/検品コード/商品名/納品元/倉庫種類/' +
      '入庫予定数/入庫数(良品)/入庫数(不良品)/差異/結果判明/備考。' +
      '顧客連絡日・連絡者欄付き',
    canvas: PAPER.A4_LANDSCAPE,
  },

  /* -------------------------------------------------------------- */
  /* 4. 入庫実績一覧表 / 入库实绩一览表                              */
  /* -------------------------------------------------------------- */
  {
    code: 'INBOUND_RESULTS_LIST',
    name: '入庫実績一覧表 / 入库实绩一览表',
    category: 'inbound',
    paperSize: 'A4',
    orientation: 'landscape',
    description:
      '全明細の入庫実績。Seq/顧客商品コード/検品コード/商品名/納品元/倉庫種類/' +
      '入庫予定数/入庫数(良品)/入庫数(不良品)/差異/結果判明/備考/棚番号',
    canvas: PAPER.A4_LANDSCAPE,
  },

  /* -------------------------------------------------------------- */
  /* 5. 入庫看板 / 入库看板                                          */
  /* -------------------------------------------------------------- */
  {
    code: 'INBOUND_KANBAN',
    name: '入庫看板 / 入库看板',
    category: 'inbound',
    paperSize: 'A4',
    orientation: 'portrait',
    description:
      '商品単位のA4看板。顧客商品コード/検品コード(バーコード印刷)/商品名/' +
      '入庫日/棚番号/入庫数(PCS)/LogiFast商品コード。' +
      '大きな文字とバーコードで現場作業に最適化',
    canvas: PAPER.A4_PORTRAIT,
  },
];

/* ------------------------------------------------------------------ */
/* シード実行関数 / 种子执行函数                                       */
/* ------------------------------------------------------------------ */

/**
 * 入庫帳票テンプレート5種を upsert する。
 * 插入/更新5种入库单据模板。
 *
 * meta.code をキーに updateOne (upsert) を使用。
 * 使用 meta.code 作为键，通过 updateOne (upsert) 写入。
 */
export async function seedInboundPrintTemplates(): Promise<void> {
  logger.info('Seeding inbound print templates (5 LOGIFAST-spec templates)...');

  const ops: AnyBulkWriteOperation<IPrintTemplate>[] = INBOUND_TEMPLATES.map((tpl) => ({
    updateOne: {
      filter: {
        tenantId: 'default',
        'meta.code': tpl.code,
      },
      update: {
        $set: {
          name: tpl.name,
          schemaVersion: 1,
          canvas: tpl.canvas,
          // elements は後ほどビジュアルエディタで設計する
          // elements 将在可视化编辑器中设计
          elements: [],
          meta: {
            code: tpl.code,
            category: tpl.category,
            paperSize: tpl.paperSize,
            orientation: tpl.orientation,
            description: tpl.description,
            isActive: true,
            isBuiltIn: true,
          },
        },
        $setOnInsert: {
          tenantId: 'default',
        },
      },
      upsert: true,
    },
  }));

  const res = await PrintTemplate.bulkWrite(ops, { ordered: false });

  logger.info(
    {
      matched: res.matchedCount,
      upserted: res.upsertedCount,
      modified: res.modifiedCount,
    },
    'Inbound print template seeding completed / 入庫帳票テンプレート シード完了',
  );
}
