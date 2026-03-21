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

    it('should include provided data in the HTML template', async () => {
      const result = await service.renderPdf(tenantId, 'report', {
        title: 'Monthly Report',
        content: 'Some body content',
      });

      const html = result.buffer.toString('utf-8');
      expect(html).toContain('Monthly Report');
      expect(html).toContain('Some body content');
    });

    it('should render items table when items are provided', async () => {
      const result = await service.renderPdf(tenantId, 'packing', {
        title: 'Packing List',
        items: [
          { name: 'Widget A', quantity: 10, price: 500 },
          { name: 'Widget B', quantity: 5, price: 1000 },
        ],
      });

      const html = result.buffer.toString('utf-8');
      expect(html).toContain('Widget A');
      expect(html).toContain('Widget B');
      expect(html).toContain('<table');
    });

    it('should generate valid HTML structure', async () => {
      const result = await service.renderPdf(tenantId, 'test', { title: 'Test' });

      const html = result.buffer.toString('utf-8');
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html>');
      expect(html).toContain('</html>');
    });

    it('should include generation timestamp in footer', async () => {
      const result = await service.renderPdf(tenantId);

      const html = result.buffer.toString('utf-8');
      expect(html).toContain('Generated at');
    });

    it('should handle empty data object', async () => {
      const result = await service.renderPdf(tenantId, 'test', {});

      expect(result.success).toBe(true);
      expect(result.buffer.length).toBeGreaterThan(0);
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

      // base64 should be decodable
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
      expect(result2.contentType).toBe('image/png'); // cached returns image/png
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
      // First render = miss + cache store
      await service.renderBarcode(tenantId, 'STATS-TEST');
      // Second render = hit
      await service.renderBarcode(tenantId, 'STATS-TEST');

      const result = await service.getCacheStats(tenantId);

      expect(result.hits).toBe(1);
      expect(result.misses).toBe(1);
      expect(result.hitRate).toBeGreaterThan(0);
    });

    it('should calculate hit rate correctly', async () => {
      // 2 misses (different values), 2 hits (same values again)
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

      // 3 barcode entries + possible pdf entries (none in this case)
      expect(result.size).toBe(3);
    });

    it('should evict oldest entry when cache exceeds max size', async () => {
      // The max cache size is 100. We render 101 different barcodes.
      for (let i = 0; i < 101; i++) {
        await service.renderBarcode(tenantId, `EVICT-${i}`);
      }

      const result = await service.getCacheStats(tenantId);

      expect(result.size).toBeLessThanOrEqual(100);
    });
  });
});
