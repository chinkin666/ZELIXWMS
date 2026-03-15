/**
 * ScriptRunner — 自动化脚本执行器 / 自動化スクリプトランナー
 *
 * 在 Node.js vm 沙箱中安全执行用户脚本。
 * Node.js vm サンドボックスでユーザースクリプトを安全に実行する。
 *
 * 特性 / 特徴:
 * - vm 沙箱隔离，不可访问系统资源
 *   vm サンドボックス隔離、システムリソースへのアクセス不可
 * - 超时保护（默认 5 秒）
 *   タイムアウト保護（デフォルト 5 秒）
 * - 白名单字段修改
 *   ホワイトリスト制のフィールド変更
 * - 禁止关键字检查
 *   禁止キーワードチェック
 * - 执行日志记录
 *   実行ログ記録
 */

import vm from 'vm';
import { logger } from '@/lib/logger';
import { AutomationScript } from '@/models/automationScript';
import { ScriptExecutionLog } from '@/models/scriptExecutionLog';

/** 禁止关键字 / 禁止キーワード */
const FORBIDDEN_KEYWORDS = [
  'require', 'import', 'eval', 'Function',
  'process', 'fs', 'child_process', 'net', 'http',
  'globalThis', '__dirname', '__filename',
];

/** 白名单可修改字段 / ホワイトリストの変更可能フィールド */
const ALLOWED_MODIFY_FIELDS = [
  // 出荷指示 / 出荷指示
  'order.orderGroup',
  'order.invoiceType',
  'order.coolType',
  'order.handlingTags',
  'order.customFields',
  'order.memo',
  'order.deliveryTimeSlot',
  'order.deliveryDatePreference',
  'order.shipPlanDate',
  // 商品 / 商品
  'product.customFields',
  'product.memo',
  'product.category',
  // 入庫 / 入庫
  'inbound.memo',
  'inbound.customFields',
  // 返品 / 返品
  'return.memo',
  'return.customFields',
  // 棚卸 / 棚卸
  'stocktaking.memo',
];

export class ScriptRunner {
  /**
   * 执行匹配事件的所有脚本 / イベントに一致するすべてのスクリプトを実行
   */
  async executeForEvent(event: string, payload: Record<string, unknown>): Promise<void> {
    let scripts;
    try {
      scripts = await AutomationScript.find({ event, enabled: true }).lean();
    } catch (err) {
      logger.error({ event, err }, 'Failed to query scripts / スクリプトクエリ失敗');
      return;
    }

    if (scripts.length === 0) return;

    for (const script of scripts) {
      try {
        await this.execute(script, payload);
      } catch (err) {
        logger.error(
          { scriptName: script.name, event, err },
          'Script execution error / スクリプト実行エラー',
        );
      }
    }
  }

  /**
   * 执行单个脚本 / 単一スクリプトを実行
   */
  async execute(
    script: { _id: any; name: string; code: string; event: string; timeout?: number },
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const startTime = Date.now();
    const timeout = script.timeout || 5000;
    const modifications: Record<string, unknown> = {};

    try {
      // 创建沙箱上下文 / サンドボックスコンテキストを作成
      const deepCopy = (v: unknown) => v ? JSON.parse(JSON.stringify(v)) : {};
      const sandbox = {
        // 只读数据注入 / 読み取り専用データ注入
        order: deepCopy(payload.order),
        product: deepCopy(payload.product),
        inventory: deepCopy(payload.inventory),
        inbound: deepCopy(payload.inbound),
        return: deepCopy(payload.return || payload.returnOrder),
        wave: deepCopy(payload.wave),
        task: deepCopy(payload.task),
        stocktaking: deepCopy(payload.stocktaking),
        // イベント情報 / 事件信息
        event: script.event,
        payload: deepCopy(payload),

        // 修改收集器 / 変更コレクター
        setField: (path: string, value: unknown) => {
          if (!ALLOWED_MODIFY_FIELDS.some((f) => path.startsWith(f))) {
            throw new Error(`Modification not allowed for field: ${path}`);
          }
          modifications[path] = value;
        },

        // 安全的工具函数 / 安全なユーティリティ関数
        console: {
          log: (...args: unknown[]) => {
            logger.info({ scriptName: script.name, args }, 'Script console.log');
          },
          warn: (...args: unknown[]) => {
            logger.warn({ scriptName: script.name, args }, 'Script console.warn');
          },
        },
        JSON: { parse: JSON.parse, stringify: JSON.stringify },
        Math,
        Date,
        parseInt,
        parseFloat,
        isNaN,
        isFinite,
        String,
        Number,
        Boolean,
        Array,
        Object,
      };

      // 创建 vm 上下文 / vm コンテキストを作成
      const context = vm.createContext(sandbox, {
        codeGeneration: { strings: false, wasm: false },
      });

      // 包装并执行脚本 / スクリプトをラップして実行
      const wrappedCode = `
        (function() {
          'use strict';
          ${script.code}
        })();
      `;

      const vmScript = new vm.Script(wrappedCode, {
        filename: `script:${script.name}`,
      });

      vmScript.runInContext(context, { timeout });

      const duration = Date.now() - startTime;

      // 记录成功日志 / 成功ログを記録
      await this.writeLog(script._id, script.name, script.event, 'success', duration, payload, modifications);

      return modifications;
    } catch (err: any) {
      const duration = Date.now() - startTime;
      const isTimeout = err.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT';
      const status = isTimeout ? 'timeout' : 'error';

      // 记录失败日志 / 失敗ログを記録
      await this.writeLog(
        script._id, script.name, script.event,
        status, duration, payload, undefined,
        isTimeout ? `Script timed out after ${timeout}ms` : err.message,
      );

      throw err;
    }
  }

  /**
   * 手动执行（测试用）/ 手動実行（テスト用）
   */
  async testExecute(
    scriptId: string,
    testPayload?: Record<string, unknown>,
  ): Promise<{
    success: boolean;
    duration: number;
    modifications: Record<string, unknown>;
    error?: string;
  }> {
    const script = await AutomationScript.findById(scriptId).lean();
    if (!script) throw new Error('Script not found / スクリプトが見つかりません');

    const payload = testPayload || {
      order: { _id: 'test', orderNumber: 'TEST-001' },
      product: {},
      inventory: {},
    };

    try {
      const modifications = await this.execute(script, payload);
      return {
        success: true,
        duration: 0, // will be updated from log
        modifications,
      };
    } catch (err: any) {
      return {
        success: false,
        duration: 0,
        modifications: {},
        error: err.message,
      };
    }
  }

  /**
   * 语法校验 + 禁止关键字检查 / 構文チェック + 禁止キーワードチェック
   */
  validate(code: string): { valid: boolean; error?: string } {
    // 禁止关键字检查 / 禁止キーワードチェック
    for (const keyword of FORBIDDEN_KEYWORDS) {
      // 使用 word boundary 匹配，避免误判
      const regex = new RegExp(`\\b${keyword}\\b`);
      if (regex.test(code)) {
        return { valid: false, error: `Forbidden keyword: ${keyword}` };
      }
    }

    // 语法检查 / 構文チェック
    try {
      new vm.Script(`(function() { 'use strict'; ${code} })();`, {
        filename: 'validation',
      });
      return { valid: true };
    } catch (err: any) {
      return { valid: false, error: err.message };
    }
  }

  /**
   * 写入执行日志 / 実行ログを書き込む
   */
  private async writeLog(
    scriptId: any,
    scriptName: string,
    event: string,
    status: 'success' | 'error' | 'timeout',
    duration: number,
    input?: Record<string, unknown>,
    output?: Record<string, unknown>,
    error?: string,
  ): Promise<void> {
    try {
      await ScriptExecutionLog.create({
        scriptId,
        scriptName,
        event,
        status,
        duration,
        input: input ? this.summarize(input) : undefined,
        output: output && Object.keys(output).length > 0 ? output : undefined,
        error,
      });
    } catch (err) {
      logger.error({ err }, 'Failed to write script log / スクリプトログ書き込み失敗');
    }
  }

  /**
   * 压缩输入数据 / 入力データを圧縮
   */
  private summarize(data: Record<string, unknown>): Record<string, unknown> {
    const summary: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value && typeof value === 'object' && '_id' in (value as Record<string, unknown>)) {
        const obj = value as Record<string, unknown>;
        summary[key] = { _id: obj._id };
      } else if (Array.isArray(value)) {
        summary[key] = `[Array(${value.length})]`;
      } else {
        summary[key] = value;
      }
    }
    return summary;
  }
}
