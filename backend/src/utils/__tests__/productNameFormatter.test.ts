/**
 * productNameFormatter 单元测试 / productNameFormatter ユニットテスト
 *
 * 配送伝票CSV出力時の品名フォーマットテスト
 * 配送单CSV输出时的品名格式化测试
 */

import { describe, it, expect } from 'vitest';
import { formatProductName, formatProductNameSplit } from '../productNameFormatter';

describe('productNameFormatter / 品名フォーマッター', () => {

  // ─── formatProductName 基本テスト / 基本测试 ─────────────

  describe('formatProductName / 品名フォーマット', () => {
    it('空の商品リストは「商品」を返す / 空商品列表返回「商品」', () => {
      expect(formatProductName([])).toBe('商品');
      expect(formatProductName(null as any)).toBe('商品');
    });

    it('単一商品: productNameを使用 / 单商品使用productName', () => {
      const products = [{ productName: 'テストシャツ', quantity: 1 }];
      expect(formatProductName(products)).toBe('テストシャツ');
    });

    it('単一商品: productNameなしの場合はinputSkuを使用 / 无productName时用inputSku', () => {
      const products = [{ inputSku: 'SKU-001', quantity: 1 }];
      expect(formatProductName(products)).toBe('SKU-001');
    });

    it('単一商品: 両方なしの場合は「商品」/ 两者都无时返回「商品」', () => {
      const products = [{ quantity: 1 }];
      expect(formatProductName(products)).toBe('商品');
    });

    it('数量表示: quantity>1で「×N」を付ける / quantity>1时添加「×N」', () => {
      const products = [{ productName: 'Tシャツ', quantity: 3 }];
      expect(formatProductName(products, { includeQuantity: true })).toBe('Tシャツ×3');
    });

    it('数量表示: quantity=1では付けない / quantity=1时不添加', () => {
      const products = [{ productName: 'Tシャツ', quantity: 1 }];
      expect(formatProductName(products, { includeQuantity: true })).toBe('Tシャツ');
    });
  });

  // ─── 複数SKUモード / 多SKU模式 ────────────────────────────

  describe('複数SKUモード / 多SKU模式', () => {
    const products = [
      { productName: 'Tシャツ', quantity: 1 },
      { productName: 'パンツ', quantity: 2 },
      { productName: '靴下', quantity: 3 },
    ];

    it('first（デフォルト）: 最初の商品+他N点 / first模式', () => {
      const result = formatProductName(products);
      expect(result).toBe('Tシャツ 他2点');
    });

    it('count: 「商品 N点」形式 / count模式', () => {
      const result = formatProductName(products, { multiSkuMode: 'count' });
      expect(result).toBe('商品 3点');
    });

    it('concat: 全商品名を結合 / concat模式', () => {
      const result = formatProductName(products, { multiSkuMode: 'concat' });
      expect(result).toBe('Tシャツ、パンツ、靴下');
    });

    it('concat + includeQuantity / concat+数量表示', () => {
      const result = formatProductName(products, { multiSkuMode: 'concat', includeQuantity: true });
      expect(result).toBe('Tシャツ、パンツ×2、靴下×3');
    });
  });

  // ─── ルール適用 / 规则应用 ─────────────────────────────────

  describe('ルール適用 / 规则应用', () => {
    it('front: 前からN文字を抜き出し / front规则', () => {
      const products = [{ productName: 'テスト商品名称長いバージョン' }];
      const result = formatProductName(products, {
        rule: { type: 'front', maxChars: 5 },
      });
      expect(result).toBe('テスト商品名'.slice(0, 5));
    });

    it('back: 後ろからN文字を抜き出し / back规则', () => {
      const products = [{ productName: 'テスト商品名称長いバージョン' }];
      const result = formatProductName(products, {
        rule: { type: 'back', maxChars: 5 },
      });
      expect(result).toBe('バージョン');
    });

    it('back: 文字数がmaxChars以下の場合はそのまま / back规则短字符串', () => {
      const products = [{ productName: 'ABC' }];
      const result = formatProductName(products, {
        rule: { type: 'back', maxChars: 10 },
      });
      expect(result).toBe('ABC');
    });

    it('between: キーワード間の文字を抜き出し / between规则', () => {
      const products = [{ productName: '【サイズ:M】テスト商品【カラー:赤】' }];
      const result = formatProductName(products, {
        rule: { type: 'between', startKeyword: '】', endKeyword: '【', maxChars: 25 },
      });
      expect(result).toBe('テスト商品');
    });

    it('between: 開始キーワードが見つからない場合はそのまま / 无开始关键字', () => {
      const products = [{ productName: 'テスト商品' }];
      const result = formatProductName(products, {
        rule: { type: 'between', startKeyword: '【', endKeyword: '】', maxChars: 25 },
      });
      expect(result).toBe('テスト商品');
    });

    it('between: 終了キーワードが見つからない場合は開始以降を返す / 无结束关键字', () => {
      const products = [{ productName: '【テスト】商品名' }];
      const result = formatProductName(products, {
        rule: { type: 'between', startKeyword: '【テスト】', endKeyword: '★', maxChars: 25 },
      });
      expect(result).toBe('商品名');
    });

    it('fixed: 固定文字を返す / fixed规则', () => {
      const products = [{ productName: '何でも' }];
      const result = formatProductName(products, {
        rule: { type: 'fixed', text: '衣類' },
      });
      expect(result).toBe('衣類');
    });
  });

  // ─── maxChars（文字数制限）/ 字符数限制 ──────────────────

  describe('maxChars / 文字数制限', () => {
    it('品名をmaxCharsで切り詰める / 按maxChars截断品名', () => {
      const products = [{ productName: '非常に長い商品名称テストです' }];
      const result = formatProductName(products, { maxChars: 10 });
      expect(result.length).toBeLessThanOrEqual(10);
    });

    it('デフォルトmaxCharsは25 / 默认maxChars为25', () => {
      const longName = 'あ'.repeat(30);
      const products = [{ productName: longName }];
      const result = formatProductName(products);
      expect(result.length).toBe(25);
    });
  });

  // ─── formatProductNameSplit / 品名2行分割 ─────────────────

  describe('formatProductNameSplit / 品名2行分割', () => {
    it('短い品名は1行目のみ / 短品名只在第1行', () => {
      const products = [{ productName: 'テスト' }];
      const [line1, line2] = formatProductNameSplit(products);
      expect(line1).toBe('テスト');
      expect(line2).toBe('');
    });

    it('長い品名を2行に分割 / 长品名分2行', () => {
      const longName = 'あ'.repeat(40);
      const products = [{ productName: longName }];
      const [line1, line2] = formatProductNameSplit(products, {}, 25);
      expect(line1.length).toBeLessThanOrEqual(25);
      expect(line2.length).toBeGreaterThan(0);
    });

    it('佐川伝票: 品名1+品名2に分割 / 佐川发货单品名分割', () => {
      const products = [
        { productName: 'テスト商品A' },
        { productName: 'テスト商品B' },
        { productName: 'テスト商品C' },
      ];
      const [line1, line2] = formatProductNameSplit(products, { multiSkuMode: 'concat' }, 15);
      // 全結合は15文字を超えるので分割される
      expect(line1.length).toBeLessThanOrEqual(15);
    });
  });

  // ─── 実務シナリオ / 实务场景 ──────────────────────────────

  describe('実務シナリオ / 实务场景', () => {
    it('ヤマト送り状: 品名欄は25文字以内 / 大和发货单品名限制', () => {
      const products = [
        { productName: '高級日本製シルクブラウス', quantity: 2 },
        { productName: 'カシミヤマフラー', quantity: 1 },
      ];
      const result = formatProductName(products, { maxChars: 25 });
      expect(result.length).toBeLessThanOrEqual(25);
    });

    it('Amazon FBA: 品名は固定「雑貨」/ Amazon FBA品名固定', () => {
      const products = [
        { productName: 'ASIN-B012345', quantity: 10 },
      ];
      const result = formatProductName(products, {
        rule: { type: 'fixed', text: '雑貨' },
      });
      expect(result).toBe('雑貨');
    });

    it('楽天市場: 商品名の前10文字 / 乐天商品名前10字', () => {
      const products = [{ productName: '【送料無料】テスト商品Sサイズブラック' }];
      const result = formatProductName(products, {
        rule: { type: 'front', maxChars: 10 },
      });
      expect(result).toBe('【送料無料】テスト商品Sサイズブラック'.slice(0, 10));
    });
  });
});
