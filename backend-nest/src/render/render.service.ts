// レンダリングサービス / 渲染服务
import { Injectable } from '@nestjs/common';

// PDFレンダリング結果 / PDF渲染结果
interface PdfResult {
  success: boolean;
  buffer: Buffer;
  contentType: string;
  fileName: string;
}

// バーコードレンダリング結果 / 条形码渲染结果
interface BarcodeResult {
  success: boolean;
  data: string;
  format: string;
  value: string;
  contentType: string;
}

// キャッシュ統計 / 缓存统计
interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
  hitRate: number;
  keys: string[];
  memoryUsageBytes: number;
  lastResetAt: Date;
}

@Injectable()
export class RenderService {
  // レンダリングキャッシュ / 渲染缓存
  private readonly cache = new Map<string, { data: Buffer; createdAt: Date }>();
  private cacheHits = 0;
  private cacheMisses = 0;
  private readonly maxCacheSize = 100;
  private readonly cacheResetAt = new Date();

  // PDF生成（HTMLテンプレートベース）/ 生成PDF（基于HTML模板）
  async renderPdf(
    tenantId: string,
    templateId?: string,
    data?: Record<string, unknown>,
  ): Promise<PdfResult> {
    const template = templateId ?? 'default';
    const mergedData = data ?? {};

    // HTMLテンプレート構築 / 构建HTML模板
    const htmlContent = this.buildHtmlTemplate(template, mergedData);

    // HTMLをBufferに変換（実際のPDF変換はpuppeteer等で行う想定）
    // 将HTML转换为Buffer（实际PDF转换预期使用puppeteer等）
    const buffer = Buffer.from(htmlContent, 'utf-8');

    // キャッシュキー生成 / 生成缓存键
    const cacheKey = `pdf:${tenantId}:${template}:${JSON.stringify(mergedData)}`;
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
        contentType: 'image/png',
      };
    }

    // Code128バーコードデータ生成 / 生成Code128条形码数据
    // SVGベースのバーコード表現を生成 / 生成基于SVG的条形码表现
    const svgBarcode = this.generateCode128Svg(value, barcodeFormat);
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

  // HTMLテンプレート構築 / 构建HTML模板
  private buildHtmlTemplate(
    templateId: string,
    data: Record<string, unknown>,
  ): string {
    const title = String(data['title'] ?? templateId);
    const bodyContent = String(data['content'] ?? '');
    const items = (data['items'] as any[]) ?? [];

    // テーブル行生成 / 生成表格行
    const tableRows = items
      .map(
        (item, idx) =>
          `<tr><td>${idx + 1}</td><td>${item.name ?? ''}</td><td>${item.quantity ?? ''}</td><td>${item.price ?? ''}</td></tr>`,
      )
      .join('\n');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: 'Helvetica', 'Arial', sans-serif; margin: 20px; }
    h1 { font-size: 18px; border-bottom: 2px solid #333; padding-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
    th { background-color: #f5f5f5; }
    .footer { margin-top: 24px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${bodyContent ? `<div>${bodyContent}</div>` : ''}
  ${tableRows ? `<table><thead><tr><th>#</th><th>Name</th><th>Qty</th><th>Price</th></tr></thead><tbody>${tableRows}</tbody></table>` : ''}
  <div class="footer">Generated at ${new Date().toISOString()}</div>
</body>
</html>`;
  }

  // Code128 SVGバーコード生成 / 生成Code128 SVG条形码
  private generateCode128Svg(value: string, format: string): string {
    // Code128Bエンコーディングパターン / Code128B编码模式
    const barWidth = 2;
    const height = 80;
    const quietZone = 10;

    // 簡易Code128Bバーパターン生成 / 简易Code128B条纹模式生成
    // 各文字をバーパターンに変換 / 将每个字符转换为条纹模式
    const bars: number[] = [];

    // スタートコードB: 11010010000 / 起始码B
    bars.push(1, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0);

    for (const char of value) {
      // 簡易パターン（文字コードベース）/ 简易模式（基于字符编码）
      const code = char.charCodeAt(0) - 32;
      const pattern = this.getCode128Pattern(code);
      bars.push(...pattern);
    }

    // ストップコード: 1100011101011 / 终止码
    bars.push(1, 1, 0, 0, 0, 1, 1, 1, 0, 1, 0, 1, 1);

    const totalWidth = quietZone * 2 + bars.length * barWidth;

    // SVG構築 / 构建SVG
    let svgBars = '';
    for (let i = 0; i < bars.length; i++) {
      if (bars[i] === 1) {
        const x = quietZone + i * barWidth;
        svgBars += `<rect x="${x}" y="0" width="${barWidth}" height="${height}" fill="black"/>`;
      }
    }

    // テキストラベル追加 / 添加文本标签
    const textX = totalWidth / 2;
    const textY = height + 14;

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height + 20}" viewBox="0 0 ${totalWidth} ${height + 20}">
  <rect width="100%" height="100%" fill="white"/>
  ${svgBars}
  <text x="${textX}" y="${textY}" text-anchor="middle" font-family="monospace" font-size="12">${value}</text>
</svg>`;
  }

  // Code128バーパターン取得 / 获取Code128条纹模式
  private getCode128Pattern(code: number): number[] {
    // 標準Code128Bパターンテーブル（上位20文字分）/ 标准Code128B模式表（前20个字符）
    const patterns: number[][] = [
      [1, 1, 0, 1, 1, 0, 0, 1, 1, 0, 0], // 0: space
      [1, 1, 0, 0, 1, 1, 0, 1, 1, 0, 0], // 1: !
      [1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0], // 2: "
      [1, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0], // 3: #
      [1, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0], // 4: $
      [1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0], // 5: %
      [1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0], // 6: &
      [1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0], // 7: '
      [1, 0, 0, 0, 1, 1, 0, 0, 1, 0, 0], // 8: (
      [1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0], // 9: )
      [1, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0], // 10: *
      [1, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0], // 11: +
      [1, 0, 1, 1, 0, 0, 1, 1, 1, 0, 0], // 12: ,
      [1, 0, 0, 1, 1, 0, 1, 1, 1, 0, 0], // 13: -
      [1, 0, 0, 1, 1, 0, 0, 1, 1, 1, 0], // 14: .
      [1, 0, 1, 1, 1, 0, 0, 1, 1, 0, 0], // 15: /
      [1, 0, 0, 1, 1, 1, 0, 1, 1, 0, 0], // 16: 0
      [1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 0], // 17: 1
      [1, 1, 0, 0, 1, 0, 1, 1, 1, 0, 0], // 18: 2
      [1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0], // 19: 3
    ];

    // パターンテーブル範囲内ならそれを使用、範囲外なら汎用パターン / 在表范围内则使用表,否则使用通用模式
    if (code >= 0 && code < patterns.length) {
      return patterns[code];
    }
    // 汎用フォールバックパターン / 通用后备模式
    return [1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0];
  }

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
}
