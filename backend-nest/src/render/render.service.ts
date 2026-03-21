// レンダリングサービス / 渲染服务
import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

// PDFレンダリング結果 / PDF渲染结果
export interface PdfResult {
  success: boolean;
  buffer: Buffer;
  contentType: string;
  fileName: string;
}

// バーコードレンダリング結果 / 条形码渲染结果
export interface BarcodeResult {
  success: boolean;
  data: string;
  format: string;
  value: string;
  contentType: string;
}

// キャッシュ統計 / 缓存统计
export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
  hitRate: number;
  keys: string[];
  memoryUsageBytes: number;
  lastResetAt: Date;
}

// テーブルアイテム型 / 表格项类型
interface TableItem {
  readonly name?: string;
  readonly quantity?: string | number;
  readonly price?: string | number;
}

// ===================================================================
// Code128 ビットパターンテーブル（ISO/IEC 15417準拠、値0〜106）
// Code128 位模式表（符合ISO/IEC 15417，值0~106）
//
// 各パターンは11ビット幅のバー/スペースパターン（1=黒,0=白）
// 每个模式是11位宽的条/空模式（1=黑,0=白）
// ストップコード(106)のみ13ビット / 只有终止码(106)是13位
// ===================================================================
const CODE128_BITSTRINGS: readonly string[] = [
  '11011001100', //   0: SP       (Code128B value 0 = ASCII 32)
  '11001101100', //   1: !
  '11001100110', //   2: "
  '10010011000', //   3: #
  '10010001100', //   4: $
  '10001001100', //   5: %
  '10011001000', //   6: &
  '10011000100', //   7: '
  '10001100100', //   8: (
  '11001001000', //   9: )
  '11001000100', //  10: *
  '11000100100', //  11: +
  '10110011100', //  12: ,
  '10011011100', //  13: -
  '10011001110', //  14: .
  '10111001100', //  15: /
  '10011101100', //  16: 0
  '10011100110', //  17: 1
  '11001110010', //  18: 2
  '11001011100', //  19: 3
  '11001001110', //  20: 4
  '11011100100', //  21: 5
  '11001110100', //  22: 6
  '11101101110', //  23: 7
  '11101001100', //  24: 8
  '11100101100', //  25: 9
  '11100100110', //  26: :
  '11101100100', //  27: ;
  '11100110100', //  28: <
  '11100110010', //  29: =
  '11011011000', //  30: >
  '11011000110', //  31: ?
  '11000110110', //  32: @
  '10100011000', //  33: A
  '10001011000', //  34: B
  '10001000110', //  35: C
  '10110001000', //  36: D
  '10001101000', //  37: E
  '10001100010', //  38: F
  '11010001000', //  39: G
  '11000101000', //  40: H
  '11000100010', //  41: I
  '10110111000', //  42: J
  '10110001110', //  43: K
  '10001101110', //  44: L
  '10111011000', //  45: M
  '10111000110', //  46: N
  '10001110110', //  47: O
  '11101110110', //  48: P
  '11010001110', //  49: Q
  '11000101110', //  50: R
  '11011101000', //  51: S
  '11011100010', //  52: T
  '11011101110', //  53: U
  '11101011000', //  54: V
  '11101000110', //  55: W
  '11100010110', //  56: X
  '11101101000', //  57: Y
  '11101100010', //  58: Z
  '11100011010', //  59: [
  '11101111010', //  60: backslash
  '11001000010', //  61: ]
  '11110001010', //  62: ^
  '10100110000', //  63: _
  '10100001100', //  64: `
  '10010110000', //  65: a
  '10010000110', //  66: b
  '10000101100', //  67: c
  '10000100110', //  68: d
  '10110010000', //  69: e
  '10110000100', //  70: f
  '10011010000', //  71: g
  '10011000010', //  72: h
  '10000110100', //  73: i
  '10000110010', //  74: j
  '11000010010', //  75: k
  '11001010000', //  76: l
  '11110111010', //  77: m
  '11000010100', //  78: n
  '10001111010', //  79: o
  '10100111100', //  80: p
  '10010111100', //  81: q
  '10010011110', //  82: r
  '10111100100', //  83: s
  '10011110100', //  84: t
  '10011110010', //  85: u
  '11110100100', //  86: v
  '11110010100', //  87: w
  '11110010010', //  88: x
  '11011011110', //  89: y
  '11011110110', //  90: z
  '11110110110', //  91: {
  '10101111000', //  92: |
  '10100011110', //  93: }
  '10001011110', //  94: ~
  '10111101000', //  95: DEL
  '10111100010', //  96: FNC3
  '11110101000', //  97: FNC2
  '11110100010', //  98: SHIFT
  '10111011110', //  99: CODE_C
  '10111101110', // 100: CODE_B (FNC4 in Code B)
  '11101011110', // 101: FNC4 (CODE_A in Code B)
  '11110101110', // 102: FNC1
  '11010000100', // 103: START_A
  '11010010000', // 104: START_B
  '11010011100', // 105: START_C
  '1100011101011', // 106: STOP (13ビット / 13位)
];

@Injectable()
export class RenderService {
  // レンダリングキャッシュ / 渲染缓存
  private readonly cache = new Map<string, { data: Buffer; createdAt: Date }>();
  private cacheHits = 0;
  private cacheMisses = 0;
  private readonly maxCacheSize = 100;
  private readonly cacheResetAt = new Date();

  // PDF生成（PDFKitベース）/ 生成PDF（基于PDFKit）
  async renderPdf(
    tenantId: string,
    templateId?: string,
    data?: Record<string, unknown>,
  ): Promise<PdfResult> {
    const template = templateId ?? 'default';
    const mergedData = data ?? {};

    // キャッシュキー生成 / 生成缓存键
    const cacheKey = `pdf:${tenantId}:${template}:${JSON.stringify(mergedData)}`;
    const cached = this.getCache(cacheKey);
    if (cached) {
      const fileName = `${template}-${Date.now()}.pdf`;
      return {
        success: true,
        buffer: cached,
        contentType: 'application/pdf',
        fileName,
      };
    }

    // PDFKitで実際のPDFを生成 / 使用PDFKit生成真正的PDF
    const buffer = await this.buildPdfWithPdfKit(template, mergedData);

    // キャッシュに保存 / 保存到缓存
    this.setCache(cacheKey, buffer);

    const fileName = `${template}-${Date.now()}.pdf`;

    return {
      success: true,
      buffer,
      contentType: 'application/pdf',
      fileName,
    };
  }

  // バーコード生成（Code128形式）/ 生成条形码（Code128格式）
  async renderBarcode(
    tenantId: string,
    value: string,
    format?: string,
  ): Promise<BarcodeResult> {
    const barcodeFormat = format ?? 'CODE128';

    // キャッシュチェック / 检查缓存
    const cacheKey = `barcode:${tenantId}:${barcodeFormat}:${value}`;
    const cached = this.getCache(cacheKey);
    if (cached) {
      return {
        success: true,
        data: cached.toString('base64'),
        format: barcodeFormat,
        value,
        contentType: 'image/svg+xml',
      };
    }

    // Code128バーコードデータ生成 / 生成Code128条形码数据
    const svgBarcode = this.generateCode128Svg(value);
    const buffer = Buffer.from(svgBarcode, 'utf-8');
    const base64Data = buffer.toString('base64');

    // キャッシュに保存 / 保存到缓存
    this.setCache(cacheKey, buffer);

    return {
      success: true,
      data: base64Data,
      format: barcodeFormat,
      value,
      contentType: 'image/svg+xml',
    };
  }

  // キャッシュ統計取得 / 获取缓存统计
  async getCacheStats(tenantId: string): Promise<CacheStats> {
    const totalRequests = this.cacheHits + this.cacheMisses;
    const hitRate = totalRequests > 0 ? this.cacheHits / totalRequests : 0;

    // メモリ使用量を概算 / 估算内存使用量
    let memoryUsageBytes = 0;
    const keys: string[] = [];
    for (const [key, entry] of this.cache.entries()) {
      memoryUsageBytes += entry.data.byteLength;
      keys.push(key);
    }

    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      hitRate: Math.round(hitRate * 10000) / 10000,
      keys,
      memoryUsageBytes,
      lastResetAt: this.cacheResetAt,
    };
  }

  // ===================================================================
  // PDFKit PDF生成 / PDFKit PDF生成
  // ===================================================================

  // PDFKit を使用した実際のPDF生成 / 使用PDFKit生成真正的PDF
  private buildPdfWithPdfKit(
    templateId: string,
    data: Record<string, unknown>,
  ): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      try {
        const title = String(data['title'] ?? templateId);

        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: title,
            Author: 'ZELIXWMS',
            Creator: 'ZELIXWMS RenderService',
          },
        });

        // ストリームでバッファを収集 / 通过流收集缓冲区
        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err: Error) => reject(err));

        const bodyContent = String(data['content'] ?? '');
        const items = (data['items'] as TableItem[] | undefined) ?? [];

        // タイトル描画 / 绘制标题
        doc.fontSize(20).font('Helvetica-Bold').text(title, { align: 'left' });

        // タイトル下線 / 标题下划线
        const titleBottomY = doc.y;
        doc
          .moveTo(50, titleBottomY + 4)
          .lineTo(545, titleBottomY + 4)
          .strokeColor('#333333')
          .lineWidth(2)
          .stroke();

        doc.moveDown(1);

        // 本文コンテンツ描画 / 绘制正文内容
        if (bodyContent) {
          doc
            .fontSize(11)
            .font('Helvetica')
            .fillColor('#333333')
            .text(bodyContent, { align: 'left' });
          doc.moveDown(0.5);
        }

        // テーブル描画 / 绘制表格
        if (items.length > 0) {
          this.drawPdfTable(doc, items);
        }

        // フッター描画 / 绘制页脚
        doc.moveDown(2);
        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#999999')
          .text(`Generated at ${new Date().toISOString()}`, { align: 'left' });

        // PDFを終了 / 结束PDF
        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  // テーブル描画 / 绘制表格
  private drawPdfTable(
    doc: PDFKit.PDFDocument,
    items: readonly TableItem[],
  ): void {
    const tableLeft = 50;
    const colWidths: readonly number[] = [40, 200, 80, 80];
    const headers: readonly string[] = ['#', 'Name', 'Qty', 'Price'];
    const rowHeight = 24;
    const textPadding = 6;

    let currentY = doc.y + 8;

    // ヘッダー背景 / 表头背景
    const totalWidth = colWidths.reduce((sum, w) => sum + w, 0);
    doc.rect(tableLeft, currentY, totalWidth, rowHeight).fillColor('#F5F5F5').fill();

    // ヘッダーテキスト / 表头文字
    let xOffset = tableLeft;
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#333333');
    for (let i = 0; i < headers.length; i++) {
      doc.text(headers[i], xOffset + textPadding, currentY + 6, {
        width: colWidths[i] - textPadding * 2,
        align: 'left',
      });
      xOffset += colWidths[i];
    }

    // ヘッダー罫線 / 表头边框
    this.drawPdfRowBorder(doc, tableLeft, currentY, colWidths, rowHeight);
    currentY += rowHeight;

    // データ行描画 / 绘制数据行
    doc.fontSize(10).font('Helvetica').fillColor('#333333');
    for (let rowIdx = 0; rowIdx < items.length; rowIdx++) {
      const item = items[rowIdx];

      // ページ溢れチェック / 页面溢出检查
      if (currentY + rowHeight > 750) {
        doc.addPage();
        currentY = 50;
      }

      xOffset = tableLeft;
      const cellValues: readonly string[] = [
        String(rowIdx + 1),
        String(item.name ?? ''),
        String(item.quantity ?? ''),
        String(item.price ?? ''),
      ];

      for (let i = 0; i < cellValues.length; i++) {
        doc.text(cellValues[i], xOffset + textPadding, currentY + 6, {
          width: colWidths[i] - textPadding * 2,
          align: 'left',
        });
        xOffset += colWidths[i];
      }

      this.drawPdfRowBorder(doc, tableLeft, currentY, colWidths, rowHeight);
      currentY += rowHeight;
    }

    // doc.yを更新 / 更新doc.y
    doc.y = currentY + 8;
  }

  // テーブル行罫線描画 / 绘制表格行边框
  private drawPdfRowBorder(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    colWidths: readonly number[],
    height: number,
  ): void {
    const totalWidth = colWidths.reduce((sum, w) => sum + w, 0);
    doc.strokeColor('#CCCCCC').lineWidth(0.5);

    // 外枠 / 外框
    doc.rect(x, y, totalWidth, height).stroke();

    // 縦罫線 / 竖线
    let colX = x;
    for (let i = 0; i < colWidths.length - 1; i++) {
      colX += colWidths[i];
      doc.moveTo(colX, y).lineTo(colX, y + height).stroke();
    }
  }

  // ===================================================================
  // Code128B バーコード生成 / Code128B 条形码生成
  // ===================================================================

  // Code128 SVGバーコード生成 / 生成Code128 SVG条形码
  private generateCode128Svg(value: string): string {
    const moduleWidth = 2;
    const height = 80;
    const quietZone = 10;

    // Code128Bエンコーディング / Code128B编码
    const codeValues = this.encodeCode128B(value);

    // コード値をビット列に変換 / 将码值转换为位序列
    const bits: string[] = [];
    for (const cv of codeValues) {
      if (cv >= 0 && cv < CODE128_BITSTRINGS.length) {
        bits.push(CODE128_BITSTRINGS[cv]);
      }
    }
    const bitString = bits.join('');

    const totalWidth = quietZone * 2 + bitString.length * moduleWidth;

    // SVGバー要素構築 / 构建SVG条元素
    let svgBars = '';
    for (let i = 0; i < bitString.length; i++) {
      if (bitString[i] === '1') {
        const x = quietZone + i * moduleWidth;
        svgBars += `<rect x="${x}" y="0" width="${moduleWidth}" height="${height}" fill="black"/>`;
      }
    }

    // テキストラベル追加 / 添加文本标签
    const textX = totalWidth / 2;
    const textY = height + 14;

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height + 20}" viewBox="0 0 ${totalWidth} ${height + 20}">
  <rect width="100%" height="100%" fill="white"/>
  ${svgBars}
  <text x="${textX}" y="${textY}" text-anchor="middle" font-family="monospace" font-size="12">${this.escapeXml(value)}</text>
</svg>`;
  }

  // Code128Bエンコード / Code128B编码
  // スタートコードB + データ + チェックサム + ストップコード
  // 起始码B + 数据 + 校验和 + 终止码
  private encodeCode128B(value: string): readonly number[] {
    const START_CODE_B = 104;
    const STOP_CODE = 106;

    // コード値配列を構築 / 构建码值数组
    const codeValues: number[] = [START_CODE_B];

    for (const char of value) {
      const ascii = char.charCodeAt(0);
      // Code128BはASCII 32-127をサポート / Code128B支持ASCII 32-127
      if (ascii >= 32 && ascii <= 127) {
        codeValues.push(ascii - 32);
      } else {
        // 範囲外文字はスペース(値0)に置換 / 超出范围的字符替换为空格(值0)
        codeValues.push(0);
      }
    }

    // チェックサム計算 / 计算校验和
    // checksum = (startCode + sum(position * value)) mod 103
    let checksum = START_CODE_B;
    for (let i = 1; i < codeValues.length; i++) {
      checksum += i * codeValues[i];
    }
    checksum = checksum % 103;

    return [...codeValues, checksum, STOP_CODE];
  }

  // ===================================================================
  // キャッシュ管理 / 缓存管理
  // ===================================================================

  // キャッシュ取得 / 获取缓存
  private getCache(key: string): Buffer | null {
    const entry = this.cache.get(key);
    if (entry) {
      this.cacheHits++;
      return entry.data;
    }
    this.cacheMisses++;
    return null;
  }

  // キャッシュ設定（LRU風エビクション）/ 设置缓存（类LRU淘汰）
  private setCache(key: string, data: Buffer): void {
    // 上限超過時は最古エントリを削除 / 超过上限时删除最旧条目
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, { data, createdAt: new Date() });
  }

  // ===================================================================
  // ユーティリティ / 工具方法
  // ===================================================================

  // XML特殊文字エスケープ / XML特殊字符转义
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
