/**
 * 品名印字規則 / 品名印字ルール
 *
 * 配送伝票 CSV 出力時の品名フォーマットを統一管理。
 * 配送伝票 CSV 出力時の品名フォーマットを統一管理。
 *
 * 4つのパターン:
 * 1. front  - 商品名の前からN文字を抜き出し
 * 2. back   - 商品名の後ろからN文字を抜き出し
 * 3. between - 指定キーワード間の文字を抜き出し
 * 4. fixed  - 固定文字を入力
 */

export type ProductNameRule =
  | { type: 'front'; maxChars: number }
  | { type: 'back'; maxChars: number }
  | { type: 'between'; startKeyword: string; endKeyword: string; maxChars: number }
  | { type: 'fixed'; text: string }

export interface ProductNameFormatOptions {
  /** 品名印字规则 / 品名印字ルール */
  rule?: ProductNameRule
  /** 品名最大文字数（未指定時はルール内の maxChars を使用）/ 品名最大文字数 */
  maxChars?: number
  /** 多SKU时的格式: 'first'=第一个商品名, 'count'=「商品 N点」, 'concat'=拼接 / 複数SKU時のフォーマット */
  multiSkuMode?: 'first' | 'count' | 'concat'
  /** 数量を含めるか（例: 「商品A×2」）/ 数量を含めるか */
  includeQuantity?: boolean
}

/**
 * 生成品名文字列 / 品名文字列を生成
 *
 * @param products 商品列表 / 商品リスト
 * @param options 格式化选项 / フォーマットオプション
 * @returns 格式化后的品名 / フォーマット済み品名
 */
export function formatProductName(
  products: Array<{ productName?: string; inputSku?: string; quantity?: number }>,
  options: ProductNameFormatOptions = {},
): string {
  if (!products || products.length === 0) return '商品';

  const { rule, multiSkuMode = 'first', includeQuantity = false } = options;
  const maxChars = options.maxChars ?? (rule && 'maxChars' in rule ? rule.maxChars : 25);

  // 固定文字模式 / 固定文字モード
  if (rule?.type === 'fixed') {
    return truncate(rule.text, maxChars);
  }

  // 获取原始品名 / 元の品名を取得
  let rawName: string;

  if (products.length === 1) {
    rawName = buildSingleProductName(products[0], includeQuantity);
  } else {
    switch (multiSkuMode) {
      case 'count':
        rawName = `商品 ${products.length}点`;
        break;
      case 'concat': {
        const names = products.map(p => buildSingleProductName(p, includeQuantity));
        rawName = names.join('、');
        break;
      }
      case 'first':
      default:
        rawName = buildSingleProductName(products[0], includeQuantity);
        if (products.length > 1) {
          rawName += ` 他${products.length - 1}点`;
        }
        break;
    }
  }

  // 品名抽出规则适用 / 品名抽出ルール適用
  if (rule) {
    rawName = applyRule(rawName, rule);
  }

  return truncate(rawName, maxChars);
}

/**
 * 品名を2行に分割 / 品名を2行に分割
 *
 * 佐川等では品名1+品名2の2フィールドを使うため、maxChars で分割。
 *
 * @param products 商品リスト
 * @param options フォーマットオプション
 * @param lineMaxChars 1行あたりの最大文字数
 * @returns [品名1, 品名2]
 */
export function formatProductNameSplit(
  products: Array<{ productName?: string; inputSku?: string; quantity?: number }>,
  options: ProductNameFormatOptions = {},
  lineMaxChars: number = 25,
): [string, string] {
  const fullName = formatProductName(products, { ...options, maxChars: lineMaxChars * 2 });

  if (fullName.length <= lineMaxChars) {
    return [fullName, ''];
  }

  return [fullName.slice(0, lineMaxChars), fullName.slice(lineMaxChars, lineMaxChars * 2)];
}

// --- 内部函数 / 内部関数 ---

function buildSingleProductName(
  product: { productName?: string; inputSku?: string; quantity?: number },
  includeQuantity: boolean,
): string {
  const name = product.productName || product.inputSku || '商品';
  if (includeQuantity && product.quantity && product.quantity > 1) {
    return `${name}×${product.quantity}`;
  }
  return name;
}

function applyRule(text: string, rule: ProductNameRule): string {
  switch (rule.type) {
    case 'front':
      return text.slice(0, rule.maxChars);

    case 'back':
      return text.length > rule.maxChars
        ? text.slice(-rule.maxChars)
        : text;

    case 'between': {
      const startIdx = text.indexOf(rule.startKeyword);
      if (startIdx === -1) return text;
      const afterStart = startIdx + rule.startKeyword.length;
      const endIdx = text.indexOf(rule.endKeyword, afterStart);
      if (endIdx === -1) return text.slice(afterStart);
      return text.slice(afterStart, endIdx);
    }

    case 'fixed':
      return rule.text;

    default:
      return text;
  }
}

/**
 * 全角半角混合の文字列を指定文字数で切り詰め / 全角半角混合文字列を指定文字数でトランケート
 */
function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars);
}
