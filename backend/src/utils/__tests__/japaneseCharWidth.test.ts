/**
 * japaneseCharWidth 单元测试 / japaneseCharWidth ユニットテスト
 *
 * 日本語文字幅計算：ヤマトB2/佐川などの送り状フォーマットで使用
 * 日语字符宽度计算：用于大和B2/佐川等发货单格式
 */

import { describe, it, expect } from 'vitest';
import {
  getCharWidth,
  getStringWidth,
  getJapaneseCharWidth,
  truncateByWidth,
  sliceByWidth,
  exceedsWidth,
} from '../japaneseCharWidth';

describe('japaneseCharWidth / 日本語文字幅', () => {

  // ─── getCharWidth / 文字幅計算 ─────────────────────────────

  describe('getCharWidth / 文字幅計算', () => {
    it('ASCII半角文字は幅1 / ASCII半角字符宽度为1', () => {
      expect(getCharWidth('A'.charCodeAt(0))).toBe(1);
      expect(getCharWidth('0'.charCodeAt(0))).toBe(1);
      expect(getCharWidth(' '.charCodeAt(0))).toBe(1);
      expect(getCharWidth('-'.charCodeAt(0))).toBe(1);
    });

    it('半角カタカナは幅1 / 半角片假名宽度为1', () => {
      // ｱ = 0xFF71
      expect(getCharWidth(0xff71)).toBe(1);
      // ﾝ = 0xFF9D
      expect(getCharWidth(0xff9d)).toBe(1);
    });

    it('全角漢字は幅2 / 全角汉字宽度为2', () => {
      expect(getCharWidth('東'.charCodeAt(0))).toBe(2);
      expect(getCharWidth('京'.charCodeAt(0))).toBe(2);
      expect(getCharWidth('倉'.charCodeAt(0))).toBe(2);
      expect(getCharWidth('庫'.charCodeAt(0))).toBe(2);
    });

    it('ひらがなは幅2 / 平假名宽度为2', () => {
      expect(getCharWidth('あ'.charCodeAt(0))).toBe(2);
      expect(getCharWidth('ん'.charCodeAt(0))).toBe(2);
    });

    it('全角カタカナは幅2 / 全角片假名宽度为2', () => {
      expect(getCharWidth('ア'.charCodeAt(0))).toBe(2);
      expect(getCharWidth('ン'.charCodeAt(0))).toBe(2);
    });

    it('全角ASCII・記号は幅2 / 全角ASCII、符号宽度为2', () => {
      // Ａ = 0xFF21
      expect(getCharWidth(0xff21)).toBe(2);
    });

    it('CJK記号は幅2 / CJK符号宽度为2', () => {
      // 　(全角空白) = 0x3000
      expect(getCharWidth(0x3000)).toBe(2);
      // 「 = 0x300C
      expect(getCharWidth(0x300c)).toBe(2);
    });
  });

  // ─── getStringWidth / 文字列幅計算 ─────────────────────────

  describe('getStringWidth / 文字列幅計算', () => {
    it('半角のみの文字列 / 纯半角字符串', () => {
      expect(getStringWidth('Hello')).toBe(5);
      expect(getStringWidth('ABC123')).toBe(6);
    });

    it('全角のみの文字列 / 纯全角字符串', () => {
      expect(getStringWidth('東京都')).toBe(6);
      expect(getStringWidth('あいう')).toBe(6);
    });

    it('混合文字列（住所形式）/ 混合字符串（地址格式）', () => {
      // 東京都渋谷区1-2-3 = 全角5文字(10) + 半角5文字(5) = 15
      expect(getStringWidth('東京都渋谷区1-2-3')).toBe(17);
    });

    it('空文字列は幅0 / 空字符串宽度为0', () => {
      expect(getStringWidth('')).toBe(0);
    });

    it('送り状の宛名欄（田中太郎様）/ 发货单收件人栏', () => {
      expect(getStringWidth('田中太郎様')).toBe(10);
    });

    it('郵便番号（123-4567）/ 邮编', () => {
      expect(getStringWidth('123-4567')).toBe(8);
    });
  });

  // ─── getJapaneseCharWidth (エイリアス) ─────────────────────

  describe('getJapaneseCharWidth / エイリアス', () => {
    it('getStringWidthと同じ結果を返すこと / 返回与getStringWidth相同的结果', () => {
      expect(getJapaneseCharWidth('テスト')).toBe(getStringWidth('テスト'));
      expect(getJapaneseCharWidth('ABC')).toBe(getStringWidth('ABC'));
    });
  });

  // ─── truncateByWidth / 幅切り詰め ─────────────────────────

  describe('truncateByWidth / 幅切り詰め', () => {
    it('幅内の文字列はそのまま / 宽度内的字符串不变', () => {
      expect(truncateByWidth('ABC', 10)).toBe('ABC');
    });

    it('全角文字を幅で切り詰め / 按宽度截断全角字符', () => {
      // 東京都 = 幅6, maxWidth=4 → 東京
      expect(truncateByWidth('東京都', 4)).toBe('東京');
    });

    it('混合文字の切り詰め / 混合字符截断', () => {
      // A東B = 1+2+1 = 4, maxWidth=3 → A東
      expect(truncateByWidth('A東B', 3)).toBe('A東');
    });

    it('空文字列はそのまま / 空字符串不变', () => {
      expect(truncateByWidth('', 10)).toBe('');
    });

    it('nullish値はカラ文字列 / null值返回空字符串', () => {
      expect(truncateByWidth(null as any, 10)).toBe('');
      expect(truncateByWidth(undefined as any, 10)).toBe('');
    });

    it('ヤマト送り状: お届け先名は全角16文字（幅32）以内 / 大和发货单收件人限制', () => {
      const name = '株式会社テスト商事　営業部　田中太郎'; // 18文字 = 36幅
      const truncated = truncateByWidth(name, 32);
      expect(getStringWidth(truncated)).toBeLessThanOrEqual(32);
    });
  });

  // ─── sliceByWidth / 幅スライス ────────────────────────────

  describe('sliceByWidth / 幅スライス', () => {
    it('半角文字列のスライス / 半角字符串切片', () => {
      expect(sliceByWidth('ABCDEF', 1, 3)).toBe('ABC');
    });

    it('全角文字列のスライス / 全角字符串切片', () => {
      // 東京都 = 幅 2,4,6 → startWidth=3, endWidth=4 → 京
      expect(sliceByWidth('東京都', 3, 4)).toBe('京');
    });

    it('空文字列はカラ / 空字符串返回空', () => {
      expect(sliceByWidth('', 1, 5)).toBe('');
    });

    it('startがendより大きい場合はカラ / start大于end返回空', () => {
      expect(sliceByWidth('ABC', 5, 3)).toBe('');
    });

    it('文字列が短い場合はカラ / 字符串太短返回空', () => {
      expect(sliceByWidth('A', 10, 20)).toBe('');
    });
  });

  // ─── exceedsWidth / 幅超過チェック ────────────────────────

  describe('exceedsWidth / 幅超過チェック', () => {
    it('幅を超えない場合はfalse / 不超过宽度返回false', () => {
      expect(exceedsWidth('ABC', 5)).toBe(false);
      expect(exceedsWidth('ABC', 3)).toBe(false);
    });

    it('幅を超える場合はtrue / 超过宽度返回true', () => {
      expect(exceedsWidth('東京都', 4)).toBe(true);
      expect(exceedsWidth('ABCDEF', 5)).toBe(true);
    });

    it('ちょうどの場合はfalse / 刚好等于宽度返回false', () => {
      expect(exceedsWidth('ABC', 3)).toBe(false);
      expect(exceedsWidth('東京', 4)).toBe(false);
    });

    it('佐川送り状: 住所欄は全角16文字（幅32）以内 / 佐川发货单地址限制', () => {
      const shortAddr = '東京都渋谷区1-2-3';
      const longAddr = '東京都港区六本木ヒルズ森タワー42階クロスポイント株式会社';
      expect(exceedsWidth(shortAddr, 32)).toBe(false);
      expect(exceedsWidth(longAddr, 32)).toBe(true);
    });
  });
});
