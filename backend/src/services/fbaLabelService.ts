import { PDFDocument } from 'pdf-lib';
import { uploadPhoto } from '@/services/photoService';
import { InboundOrder } from '@/models/inboundOrder';

/**
 * FBA外箱ラベルPDF分割サービス / FBA外箱标PDF拆分服务
 *
 * Amazon Seller Central からダウンロードした外箱ラベルPDFを
 * 4-up (2x2) / 6-up (2x3) のレイアウトで個別ラベルに分割し、
 * 熱転写プリンタで1枚ずつ印刷できるようにする。
 *
 * 将 Amazon Seller Central 下载的外箱标 PDF 按
 * 4-up (2x2) / 6-up (2x3) 布局拆分为单张标签，
 * 支持热敏打印机逐张打印。
 */

type LabelFormat = '4up' | '6up' | 'single';

interface SplitResult {
  index: number;
  boxNumber: string;
  imageUrl: string;
  printed: boolean;
}

/**
 * PDFを分割して個別ラベルPDFを生成 / 拆分PDF生成单张标签
 *
 * @param pdfBuffer 元PDFデータ / 原始PDF数据
 * @param format ラベルフォーマット / 标签格式
 * @param tenantId テナントID
 * @param orderId 入庫予約ID（ストレージパス用）
 */
export async function splitFbaLabelPdf(
  pdfBuffer: Buffer,
  format: LabelFormat,
  tenantId: string,
  orderId: string,
): Promise<SplitResult[]> {
  const srcDoc = await PDFDocument.load(pdfBuffer);
  const pageCount = srcDoc.getPageCount();
  const results: SplitResult[] = [];

  if (format === 'single') {
    // 単一ラベル: ページごとに1枚 / 单张：每页一个标签
    for (let i = 0; i < pageCount; i++) {
      const newDoc = await PDFDocument.create();
      const [copiedPage] = await newDoc.copyPages(srcDoc, [i]);
      newDoc.addPage(copiedPage);
      const pdfBytes = await newDoc.save();

      const uploaded = await uploadPhoto(
        Buffer.from(pdfBytes),
        tenantId,
        'fba-labels',
        orderId,
        `label_${i + 1}.pdf`,
      );

      results.push({
        index: i,
        boxNumber: `U${String(i + 1).padStart(3, '0')}`,
        imageUrl: uploaded.url,
        printed: false,
      });
    }
    return results;
  }

  // 4-up / 6-up: ページ内のラベルを切り出す / 页内标签切割
  const grid = format === '4up'
    ? { cols: 2, rows: 2, labelsPerPage: 4 }
    : { cols: 2, rows: 3, labelsPerPage: 6 };

  let labelIndex = 0;

  for (let pageIdx = 0; pageIdx < pageCount; pageIdx++) {
    const srcPage = srcDoc.getPage(pageIdx);
    const { width, height } = srcPage.getSize();
    const cellWidth = width / grid.cols;
    const cellHeight = height / grid.rows;

    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        // 新しいPDFドキュメントを作成し、元ページをコピー
        // 创建新PDF文档，复制原始页面
        const newDoc = await PDFDocument.create();
        const [copiedPage] = await newDoc.copyPages(srcDoc, [pageIdx]);

        // セルサイズのページに設定 / 设置为单元格尺寸
        copiedPage.setSize(cellWidth, cellHeight);

        // MediaBox でクロップ（左下原点）/ MediaBox 裁切（左下角原点）
        // PDF 坐标系: 左下角是 (0,0)、y 轴向上
        const x = col * cellWidth;
        const y = height - (row + 1) * cellHeight; // 上から下、PDF座標は下から上
        copiedPage.setMediaBox(x, y, cellWidth, cellHeight);

        newDoc.addPage(copiedPage);
        const pdfBytes = await newDoc.save();

        const uploaded = await uploadPhoto(
          Buffer.from(pdfBytes),
          tenantId,
          'fba-labels',
          orderId,
          `label_${labelIndex + 1}.pdf`,
        );

        results.push({
          index: labelIndex,
          boxNumber: `U${String(labelIndex + 1).padStart(3, '0')}`,
          imageUrl: uploaded.url,
          printed: false,
        });

        labelIndex++;
      }
    }
  }

  return results;
}

/**
 * 入庫予約のFBAラベルを分割して保存 / 入库预定的FBA标拆分并保存
 */
export async function processOrderFbaLabel(
  orderId: string,
  pdfBuffer: Buffer,
  format: LabelFormat,
): Promise<SplitResult[]> {
  const order = await InboundOrder.findById(orderId);
  if (!order) throw new Error('入庫予約が見つかりません / 入库预定不存在');

  const tenantId = order.tenantId || 'default';

  // PDF を S3 に保存（元ファイル）/ 保存原始 PDF
  const originalUpload = await uploadPhoto(
    pdfBuffer,
    tenantId,
    'fba-labels',
    orderId,
    'original.pdf',
  );

  // 分割実行 / 执行拆分
  const splitLabels = await splitFbaLabelPdf(pdfBuffer, format, tenantId, orderId);

  // 入庫予約を更新 / 更新入库预定
  const infoField = order.destinationType === 'rsl' ? 'rslInfo' : 'fbaInfo';
  const info = (order as any)[infoField] || {};
  info.labelPdfUrl = originalUpload.url;
  info.labelSplitStatus = 'split';
  info.splitLabels = splitLabels;
  info.labelFormat = format;
  (order as any)[infoField] = info;
  order.markModified(infoField);

  // awaiting_label → ready_to_ship に推進 / 推进状态
  if (order.status === 'awaiting_label') {
    const allCompleted = !order.serviceOptions?.length ||
      order.serviceOptions.every((o) => o.status === 'completed');
    if (allCompleted) {
      order.status = 'ready_to_ship';
    }
  }

  await order.save();
  return splitLabels;
}
