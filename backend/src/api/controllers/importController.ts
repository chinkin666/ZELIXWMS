/**
 * CSV 批量导入 API 控制器 / CSV 一括インポート API コントローラ
 */

import type { Request, Response } from 'express';
import multer from 'multer';
import { importShipmentOrders, importProducts } from '@/services/csvImportService';

// Multer 设置: 内存存储, 5MB 限制 / メモリストレージ, 5MB 制限
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
});

export const uploadMiddleware = upload.single('file');

/**
 * POST /api/import/shipment-orders
 * 出荷指示 CSV 一括インポート / 出荷指示 CSV 批量导入
 */
export async function importShipmentOrdersCsv(req: Request, res: Response) {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'CSV file is required / CSV ファイルは必須です' });
      return;
    }

    const csvContent = req.file.buffer.toString('utf-8');
    const dryRun = req.query.dryRun === 'true';
    const carrierId = req.body.carrierId || req.query.carrierId;

    const result = await importShipmentOrders(csvContent, { dryRun, carrierId });

    res.json({
      ...result,
      dryRun,
      message: dryRun
        ? `プレビュー: ${result.importedCount}件インポート可能 / Preview: ${result.importedCount} importable`
        : `${result.importedCount}件インポート完了 / ${result.importedCount} imported`,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

/**
 * POST /api/import/products
 * 商品 CSV 一括インポート / 商品 CSV 批量导入
 */
export async function importProductsCsv(req: Request, res: Response) {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'CSV file is required / CSV ファイルは必須です' });
      return;
    }

    const csvContent = req.file.buffer.toString('utf-8');
    const dryRun = req.query.dryRun === 'true';
    const clientId = req.body.clientId || req.query.clientId;

    const result = await importProducts(csvContent, { dryRun, clientId });

    res.json({
      ...result,
      dryRun,
      message: dryRun
        ? `プレビュー: ${result.importedCount}件インポート可能 / Preview: ${result.importedCount} importable`
        : `${result.importedCount}件インポート完了 / ${result.importedCount} imported`,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

/**
 * GET /api/import/templates/:type
 * CSV テンプレートダウンロード / CSV 模板下载
 */
export async function downloadTemplate(req: Request, res: Response) {
  const templates: Record<string, { filename: string; headers: string }> = {
    'shipment-orders': {
      filename: 'shipment_orders_template.csv',
      headers: 'お客様管理番号,送り先名称,送り先郵便番号,送り先都道府県,送り先市区町村,送り先番地,送り先建物名,送り先電話番号,出荷予定日,商品SKU,商品名,数量,単価,配送種別,メモ',
    },
    products: {
      filename: 'products_template.csv',
      headers: 'SKU,商品名,バーコード,価格,原価,カテゴリ,安全在庫,FNSKU,ASIN',
    },
  };

  const template = templates[req.params.type];
  if (!template) {
    res.status(404).json({ error: 'Template not found / テンプレートが見つかりません' });
    return;
  }

  // BOM + ヘッダー行 + サンプル行 / BOM + 标题行 + 示例行
  const bom = '\uFEFF';
  const sampleRows: Record<string, string> = {
    'shipment-orders': '\nCMN-001,田中太郎,530-0001,大阪府,大阪市北区,梅田1-2-3,テストビル5F,06-1234-5678,2026-04-01,SKU-001,テスト商品,2,1000,B2C,',
    products: '\nSKU-001,テスト商品A,4901234567890,1000,500,0,10,,',
  };

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${template.filename}"`);
  res.send(bom + template.headers + (sampleRows[req.params.type] || ''));
}
