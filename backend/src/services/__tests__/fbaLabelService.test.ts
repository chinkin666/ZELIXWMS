/**
 * fbaLabelService 单元测试 / fbaLabelService ユニットテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';

const oid = () => new mongoose.Types.ObjectId();
const mockSave = vi.fn();

vi.mock('pdf-lib', () => {
  const mockPage = {
    getSize: vi.fn().mockReturnValue({ width: 612, height: 792 }),
    setSize: vi.fn(),
    setMediaBox: vi.fn(),
  };
  const mockDoc = {
    getPageCount: vi.fn().mockReturnValue(1),
    getPage: vi.fn().mockReturnValue(mockPage),
    copyPages: vi.fn().mockResolvedValue([mockPage]),
    addPage: vi.fn(),
    save: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
  };
  return {
    PDFDocument: {
      load: vi.fn().mockResolvedValue(mockDoc),
      create: vi.fn().mockResolvedValue(mockDoc),
    },
  };
});

vi.mock('@/services/photoService', () => ({
  uploadPhoto: vi.fn().mockResolvedValue({ url: 'https://storage.example.com/label.pdf' }),
}));

vi.mock('@/models/inboundOrder', () => ({
  InboundOrder: {
    findById: vi.fn(),
  },
}));

import { InboundOrder } from '@/models/inboundOrder';
import { uploadPhoto } from '@/services/photoService';

describe('fbaLabelService / FBAラベルサービス', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSave.mockResolvedValue(undefined);
  });

  describe('splitFbaLabelPdf / PDFラベル分割', () => {
    it('singleフォーマット→ページごとに1枚 / single格式每页一个', async () => {
      const { splitFbaLabelPdf } = await import('../fbaLabelService');
      const result = await splitFbaLabelPdf(
        Buffer.from('test'),
        'single',
        'T1',
        'order-1',
      );

      expect(result).toHaveLength(1); // 1ページ
      expect(result[0].boxNumber).toBe('U001');
      expect(result[0].printed).toBe(false);
      expect(uploadPhoto).toHaveBeenCalledWith(
        expect.any(Buffer),
        'T1',
        'fba-labels',
        'order-1',
        'label_1.pdf',
      );
    });

    it('4upフォーマット→ページあたり4枚 / 4up格式每页4个', async () => {
      const { splitFbaLabelPdf } = await import('../fbaLabelService');
      const result = await splitFbaLabelPdf(
        Buffer.from('test'),
        '4up',
        'T1',
        'order-1',
      );

      expect(result).toHaveLength(4); // 1ページ × 2×2
      expect(result[0].boxNumber).toBe('U001');
      expect(result[3].boxNumber).toBe('U004');
    });

    it('6upフォーマット→ページあたり6枚 / 6up格式每页6个', async () => {
      const { splitFbaLabelPdf } = await import('../fbaLabelService');
      const result = await splitFbaLabelPdf(
        Buffer.from('test'),
        '6up',
        'T1',
        'order-1',
      );

      expect(result).toHaveLength(6); // 1ページ × 2×3
    });
  });

  describe('processOrderFbaLabel / 入庫予約FBAラベル処理', () => {
    it('注文が見つからない→エラー / 订单不存在报错', async () => {
      vi.mocked(InboundOrder.findById).mockResolvedValue(null);

      const { processOrderFbaLabel } = await import('../fbaLabelService');
      await expect(
        processOrderFbaLabel('nonexistent', Buffer.from('test'), 'single'),
      ).rejects.toThrow('見つかりません');
    });

    it('awaiting_label→ready_to_shipに遷移すること / 从awaiting_label转为ready_to_ship', async () => {
      const order = {
        _id: oid(),
        tenantId: 'T1',
        status: 'awaiting_label',
        destinationType: 'fba',
        fbaInfo: {},
        serviceOptions: [],
        markModified: vi.fn(),
        save: mockSave,
      };
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { processOrderFbaLabel } = await import('../fbaLabelService');
      await processOrderFbaLabel(String(order._id), Buffer.from('test'), 'single');

      expect(order.status).toBe('ready_to_ship');
      expect((order.fbaInfo as any).labelSplitStatus).toBe('split');
      expect((order.fbaInfo as any).labelPdfUrl).toBeDefined();
      expect(mockSave).toHaveBeenCalled();
    });
  });
});
