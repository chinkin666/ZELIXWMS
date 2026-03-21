// レンダリングサービスのテスト / 渲染服务测试
import { Test, TestingModule } from '@nestjs/testing';
import { RenderService } from './render.service';

describe('RenderService', () => {
  let service: RenderService;

  const tenantId = 'tenant-001';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RenderService],
    }).compile();

    service = module.get<RenderService>(RenderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ===== renderPdf =====
  describe('renderPdf', () => {
    it('should return successful PDF result with buffer', async () => {
      const result = await service.renderPdf(tenantId);

      expect(result.success).toBe(true);
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.contentType).toBe('application/pdf');
      expect(result.fileName).toContain('.pdf');
    });

    it('should use default template when none specified', async () => {
      const result = await service.renderPdf(tenantId);

      expect(result.fileName).toContain('default');
    });

    it('should use custom template id in filename', async () => {
      const result = await service.renderPdf(tenantId, 'invoice');

      expect(result.fileName).toContain('invoice');
    });

    // PDFKitで実際のPDFを生成するため、バイナリPDFヘッダーを検証
    // 使用PDFKit生成真正的PDF，验证二进制PDF头
    it('should generate a real PDF (starts with %PDF header)', async () => {
      const result = await service.renderPdf(tenantId, 'report', {
        title: 'Monthly Report',
        content: 'Some body content',
      });

      const pdfHeader = result.buffer.subarray(0, 5).toString('ascii');
      expect(pdfHeader).toBe('%PDF-');
    });

    it('should generate a valid PDF buffer for items', async () => {
      const result = await service.renderPdf(tenantId, 'packing', {
        title: 'Packing List',
        items: [
          { name: 'Widget A', quantity: 10, price: 500 },
          { name: 'Widget B', quantity: 5, price: 1000 },
        ],
      });

      // 実際のPDFバイナリであることを確認 / 确认是真正的PDF二进制
      const pdfHeader = result.buffer.subarray(0, 5).toString('ascii');
      expect(pdfHeader).toBe('%PDF-');
      expect(result.buffer.length).toBeGreaterThan(100);
    });

    it('should generate a valid PDF structure', async () => {
      const result = await service.renderPdf(tenantId, 'test', { title: 'Test' });

      // PDFファイルは%PDF-で始まり%%EOFで終わる / PDF文件以%PDF-开头，以%%EOF结尾
      const pdfHeader = result.buffer.subarray(0, 5).toString('ascii');
      expect(pdfHeader).toBe('%PDF-');
      const pdfString = result.buffer.toString('ascii');
      expect(pdfString).toContain('%%EOF');
    });

    it('should include creation date in PDF metadata', async () => {
      const result = await service.renderPdf(tenantId);

      // PDFメタデータにCreationDateが含まれることを確認
      // 确认PDF元数据中包含CreationDate
      const pdfString = result.buffer.toString('latin1');
      expect(pdfString).toContain('/CreationDate');
    });

    it('should handle empty data object', async () => {
      const result = await service.renderPdf(tenantId, 'test', {});

      expect(result.success).toBe(true);
      expect(result.buffer.length).toBeGreaterThan(0);
    });

    // キャッシュヒットテスト / 缓存命中测试
    it('should return cached PDF on second call with same params', async () => {
      const result1 = await service.renderPdf(tenantId, 'cache-test', { title: 'Cache' });
      const result2 = await service.renderPdf(tenantId, 'cache-test', { title: 'Cache' });

      expect(result2.success).toBe(true);
      // 同じバッファが返されること / 返回相同的缓冲区
      expect(result2.buffer).toEqual(result1.buffer);
    });
  });

  // ===== renderBarcode =====
  describe('renderBarcode', () => {
    it('should return successful barcode result', async () => {
      const result = await service.renderBarcode(tenantId, '4901234567890');

      expect(result.success).toBe(true);
      expect(result.value).toBe('4901234567890');
      expect(result.format).toBe('CODE128');
      expect(result.data).toBeDefined();
      expect(result.data.length).toBeGreaterThan(0);
    });

    it('should use CODE128 as default format', async () => {
      const result = await service.renderBarcode(tenantId, 'TEST');

      expect(result.format).toBe('CODE128');
    });

    it('should use custom format when specified', async () => {
      const result = await service.renderBarcode(tenantId, '4901234567890', 'EAN13');

      expect(result.format).toBe('EAN13');
    });

    it('should return base64 encoded data', async () => {
      const result = await service.renderBarcode(tenantId, 'TEST');

      // base64デコード可能であること / 可以base64解码
      const buffer = Buffer.from(result.data, 'base64');
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should return SVG content type for fresh render', async () => {
      const result = await service.renderBarcode(tenantId, 'UNIQUE-VALUE-12345');

      expect(result.contentType).toBe('image/svg+xml');
    });

    it('should generate valid SVG content', async () => {
      const result = await service.renderBarcode(tenantId, 'SVG-TEST');

      const svg = Buffer.from(result.data, 'base64').toString('utf-8');
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
      expect(svg).toContain('SVG-TEST');
    });

    it('should return cached result on second call with same params', async () => {
      const result1 = await service.renderBarcode(tenantId, 'CACHED-TEST');
      const result2 = await service.renderBarcode(tenantId, 'CACHED-TEST');

      expect(result2.success).toBe(true);
      // キャッシュヒット時もSVGコンテンツタイプを返す / 缓存命中时也返回SVG内容类型
      expect(result2.contentType).toBe('image/svg+xml');
      expect(result2.data).toBe(result1.data);
    });
  });

  // ===== getCacheStats =====
  describe('getCacheStats', () => {
    it('should return zero stats for fresh service', async () => {
      const result = await service.getCacheStats(tenantId);

      expect(result.hits).toBe(0);
      expect(result.misses).toBe(0);
      expect(result.size).toBe(0);
      expect(result.maxSize).toBe(100);
      expect(result.hitRate).toBe(0);
      expect(result.keys).toEqual([]);
      expect(result.memoryUsageBytes).toBe(0);
      expect(result.lastResetAt).toBeInstanceOf(Date);
    });

    it('should track cache entries after PDF render', async () => {
      await service.renderPdf(tenantId, 'test', { title: 'Test' });

      const result = await service.getCacheStats(tenantId);

      expect(result.size).toBe(1);
      expect(result.memoryUsageBytes).toBeGreaterThan(0);
      expect(result.keys).toHaveLength(1);
    });

    it('should track cache hits and misses after barcode render', async () => {
      // 初回レンダー = ミス + キャッシュ保存 / 第一次渲染 = 未命中 + 缓存保存
      await service.renderBarcode(tenantId, 'STATS-TEST');
      // 2回目レンダー = ヒット / 第二次渲染 = 命中
      await service.renderBarcode(tenantId, 'STATS-TEST');

      const result = await service.getCacheStats(tenantId);

      expect(result.hits).toBe(1);
      expect(result.misses).toBe(1);
      expect(result.hitRate).toBeGreaterThan(0);
    });

    it('should calculate hit rate correctly', async () => {
      // 2ミス（異なる値）、2ヒット（同じ値の再アクセス）
      // 2次未命中（不同值），2次命中（相同值的再次访问）
      await service.renderBarcode(tenantId, 'A');
      await service.renderBarcode(tenantId, 'B');
      await service.renderBarcode(tenantId, 'A'); // hit
      await service.renderBarcode(tenantId, 'B'); // hit

      const result = await service.getCacheStats(tenantId);

      expect(result.hits).toBe(2);
      expect(result.misses).toBe(2);
      expect(result.hitRate).toBe(0.5);
    });

    it('should report correct number of cache keys', async () => {
      await service.renderBarcode(tenantId, 'KEY1');
      await service.renderBarcode(tenantId, 'KEY2');
      await service.renderBarcode(tenantId, 'KEY3');

      const result = await service.getCacheStats(tenantId);

      // 3つのバーコードエントリ / 3个条形码条目
      expect(result.size).toBe(3);
    });

    it('should evict oldest entry when cache exceeds max size', async () => {
      // 最大キャッシュサイズは100。101個のバーコードをレンダー
      // 最大缓存大小为100。渲染101个条形码
      for (let i = 0; i < 101; i++) {
        await service.renderBarcode(tenantId, `EVICT-${i}`);
      }

      const result = await service.getCacheStats(tenantId);

      expect(result.size).toBeLessThanOrEqual(100);
    });
  });
});
