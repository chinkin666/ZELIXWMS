import type { Request, Response } from 'express';
import { CarrierAutomationConfig } from '@/models/carrierAutomationConfig';
import { ShipmentOrder } from '@/models/shipmentOrder';
import { createYamatoB2Service } from '@/services/yamatoB2Service';
import { deriveYamatoSortCode } from '@/services/yamatoCalcService';
import { convertB2ApiToCarrierRawRow } from '@/utils/yamatoB2Format';
import {
  upsertCarrierAutomationConfigSchema,
  exportRequestSchema,
  printRequestSchema,
  historyRequestSchema,
  importRequestSchema,
  unconfirmRequestSchema,
  changeInvoiceTypeRequestSchema,
  splitOrderRequestSchema,
} from '@/schemas/carrierAutomationSchema';
import { generateOrderNumbers } from '@/utils/idGenerator';
import { isBuiltInCarrierId } from '@/data/builtInCarriers';
import { logger } from '@/lib/logger';

/**
 * テナントIDを取得（将来的にはJWTなどから取得）
 */
function getTenantId(_req: Request): string {
  // TODO: 認証ミドルウェアからテナントIDを取得
  return 'default';
}

/**
 * 全ての自動化設定を取得
 */
export const listCarrierAutomationConfigs = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);
    const configs = await CarrierAutomationConfig.find({ tenantId }).lean();
    res.json(configs);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to list carrier automation configs');
    res.status(500).json({ message: '設定の取得に失敗しました', error: error.message });
  }
};

/**
 * 特定タイプの自動化設定を取得
 */
export const getCarrierAutomationConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);
    const { type } = req.params;

    const config = await CarrierAutomationConfig.findOne({
      tenantId,
      automationType: type,
    }).lean();

    if (!config) {
      // 設定が存在しない場合はデフォルト値を返す
      res.json({
        tenantId,
        automationType: type,
        enabled: false,
        yamatoB2: type === 'yamato-b2' ? {
          apiEndpoint: 'https://yamato-b2-webapi.nexand.org',
          apiKey: '',
          customerCode: '',
          customerPassword: '',
          customerClsCode: '',
          loginUserId: '',
          serviceTypeMapping: {
            '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
            '5': '5', '6': '6', '7': '7', '8': '8', '9': '9', 'A': 'A',
          },
        } : undefined,
      });
      return;
    }

    res.json(config);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to get carrier automation config');
    res.status(500).json({ message: '設定の取得に失敗しました', error: error.message });
  }
};

/**
 * 自動化設定を作成/更新
 */
export const upsertCarrierAutomationConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);
    const { type } = req.params;

    const parsed = upsertCarrierAutomationConfigSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: 'バリデーションエラー',
        errors: parsed.error.flatten(),
      });
      return;
    }

    const config = await CarrierAutomationConfig.findOneAndUpdate(
      { tenantId, automationType: type },
      {
        tenantId,
        automationType: type,
        ...parsed.data,
      },
      { upsert: true, new: true, runValidators: true }
    ).lean();

    logger.info({ tenantId, automationType: type }, 'Carrier automation config upserted');
    res.json(config);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to upsert carrier automation config');
    res.status(500).json({ message: '設定の保存に失敗しました', error: error.message });
  }
};

/**
 * 自動化設定を削除
 */
export const deleteCarrierAutomationConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);
    const { type } = req.params;

    const deleted = await CarrierAutomationConfig.findOneAndDelete({
      tenantId,
      automationType: type,
    }).lean();

    if (!deleted) {
      res.status(404).json({ message: '設定が見つかりません' });
      return;
    }

    logger.info({ tenantId, automationType: type }, 'Carrier automation config deleted');
    res.json({ message: '削除しました', id: deleted._id });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to delete carrier automation config');
    res.status(500).json({ message: '設定の削除に失敗しました', error: error.message });
  }
};

/**
 * 接続テスト
 */
export const testCarrierAutomationConnection = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);
    const { type } = req.params;

    const config = await CarrierAutomationConfig.findOne({
      tenantId,
      automationType: type,
    }).lean();

    if (!config) {
      res.status(404).json({ message: '設定が見つかりません。先に設定を保存してください。' });
      return;
    }

    if (type === 'yamato-b2') {
      if (!config.yamatoB2) {
        res.status(400).json({ message: 'Yamato B2の設定が見つかりません' });
        return;
      }

      const service = createYamatoB2Service(config.yamatoB2, tenantId);
      const result = await service.testConnection();
      res.json(result);
    } else {
      res.status(400).json({ message: `未対応の自動化タイプ: ${type}` });
    }
  } catch (error: any) {
    logger.error({ error: error.message }, 'Connection test failed');
    res.status(500).json({ message: '接続テストに失敗しました', error: error.message });
  }
};

/**
 * Yamato B2: 配送データを検証（エクスポート前のフォーマットチェック）
 */
export const yamatoB2Validate = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);

    const parsed = exportRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: 'バリデーションエラー',
        errors: parsed.error.flatten(),
      });
      return;
    }

    // 設定を取得
    const config = await CarrierAutomationConfig.findOne({
      tenantId,
      automationType: 'yamato-b2',
    }).lean();

    if (!config?.yamatoB2) {
      res.status(400).json({ message: 'Yamato B2の設定が見つかりません' });
      return;
    }

    if (!config.enabled) {
      res.status(400).json({ message: 'Yamato B2連携が無効になっています' });
      return;
    }

    // 注文を取得
    const orders = await ShipmentOrder.find({
      _id: { $in: parsed.data.orderIds },
    }).lean();

    if (orders.length === 0) {
      res.status(400).json({ message: '注文が見つかりません' });
      return;
    }

    // Yamato B2 APIを呼び出し（検証のみ）
    const service = createYamatoB2Service(config.yamatoB2, tenantId);
    const result = await service.validateShipments(orders);

    logger.info({
      total: result.total,
      valid: result.valid_count,
      invalid: result.invalid_count,
    }, 'Yamato B2 validation completed');

    res.json(result);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Yamato B2 validation failed');
    res.status(500).json({ message: '検証に失敗しました', error: error.message });
  }
};

/**
 * Yamato B2: 配送データをエクスポート
 */
export const yamatoB2Export = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);

    const parsed = exportRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: 'バリデーションエラー',
        errors: parsed.error.flatten(),
      });
      return;
    }

    // 設定を取得
    const config = await CarrierAutomationConfig.findOne({
      tenantId,
      automationType: 'yamato-b2',
    }).lean();

    if (!config?.yamatoB2) {
      res.status(400).json({ message: 'Yamato B2の設定が見つかりません' });
      return;
    }

    if (!config.enabled) {
      res.status(400).json({ message: 'Yamato B2連携が無効になっています' });
      return;
    }

    // 注文を取得
    const orders = await ShipmentOrder.find({
      _id: { $in: parsed.data.orderIds },
    }).lean();

    if (orders.length === 0) {
      res.status(400).json({ message: '注文が見つかりません' });
      return;
    }

    // Yamato B2 APIを呼び出し（エクスポート + 自動発行）
    const service = createYamatoB2Service(config.yamatoB2, tenantId);
    const exportResult = await service.exportAndPrint(orders);

    // print結果から全shipmentデータを収集（2つのマップを構築）
    const shipmentByOrderNumber = new Map<string, {
      tracking_number: string;
      shipmentData: any;
    }>();
    const shipmentByTempTracking = new Map<string, {
      tracking_number: string;
      shipmentData: any;
    }>();

    if (exportResult.printResults) {
      for (const printResult of exportResult.printResults) {
        if (printResult.success && printResult.shipments) {
          for (const shipment of printResult.shipments) {
            if (shipment.tracking_number) {
              const data = {
                tracking_number: shipment.tracking_number,
                shipmentData: shipment,
              };
              if (shipment.shipment_number) {
                shipmentByOrderNumber.set(shipment.shipment_number, data);
              }
              if (shipment.temp_tracking_number) {
                shipmentByTempTracking.set(shipment.temp_tracking_number, data);
              }
            }
          }
        }
      }
    }

    // 注文を更新（real tracking number と carrierRawRow を保存）
    const now = new Date();
    let updatedCount = 0;

    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      const exportResultItem = exportResult.results[i];

      // 1. 注文番号でマッチング
      let matchedData = shipmentByOrderNumber.get(order.orderNumber);

      // 2. フォールバック: 一時番号でマッチング
      if (!matchedData && exportResultItem?.tracking_number) {
        matchedData = shipmentByTempTracking.get(exportResultItem.tracking_number);
      }

      if (matchedData) {
        // print結果から正式な追跡番号と伝票データを取得
        const realTrackingNumber = matchedData.tracking_number;
        const shipmentData = matchedData.shipmentData;

        const carrierRawRow = convertB2ApiToCarrierRawRow(shipmentData);
        const sortingCode = deriveYamatoSortCode(shipmentData.sorting_code);

        const updateData: Record<string, any> = {
          trackingId: realTrackingNumber,
          carrierRawRow,
          'status.confirm.isConfirmed': true,
          'status.confirm.confirmedAt': now,
          'status.carrierReceipt.isReceived': true,
          'status.carrierReceipt.receivedAt': now,
        };

        if (sortingCode) {
          updateData['carrierData.yamato.sortingCode'] = sortingCode;
        }

        await ShipmentOrder.updateOne({ _id: order._id }, { $set: updateData });
        updatedCount++;

        logger.info({
          orderNumber: order.orderNumber,
          realTrackingNumber,
          hasSortingCode: !!sortingCode,
        }, 'Order updated with real tracking number from print result');
      } else if (exportResultItem?.success && exportResultItem.tracking_number) {
        // print結果にマッチするデータがない（include_data未対応の可能性）
        // 一時番号を使用（後でimportで更新される）
        logger.warn({
          orderNumber: order.orderNumber,
          tempTrackingNumber: exportResultItem.tracking_number,
        }, 'Using temp tracking number - print result data not available');

        await ShipmentOrder.updateOne(
          { _id: order._id },
          {
            $set: {
              trackingId: exportResultItem.tracking_number,
              'status.confirm.isConfirmed': true,
              'status.confirm.confirmedAt': now,
              'status.carrierReceipt.isReceived': true,
              'status.carrierReceipt.receivedAt': now,
            },
          }
        );
        updatedCount++;
      }
    }

    logger.info({
      total: exportResult.total,
      success: exportResult.success_count,
      errors: exportResult.error_count,
      updatedCount,
      printResults: exportResult.printResults?.map(pr => ({
        print_type: pr.print_type,
        success: pr.success,
        trackingCount: pr.tracking_numbers.length,
        shipmentsCount: pr.shipments?.length || 0,
      })),
    }, 'Yamato B2 export and print completed');

    res.json({
      ...exportResult,
      updatedCount,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Yamato B2 export failed');
    res.status(500).json({ message: 'エクスポートに失敗しました', error: error.message });
  }
};

/**
 * Yamato B2: ラベル印刷
 */
export const yamatoB2Print = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);

    const parsed = printRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: 'バリデーションエラー',
        errors: parsed.error.flatten(),
      });
      return;
    }

    // 設定を取得
    const config = await CarrierAutomationConfig.findOne({
      tenantId,
      automationType: 'yamato-b2',
    }).lean();

    if (!config?.yamatoB2) {
      res.status(400).json({ message: 'Yamato B2の設定が見つかりません' });
      return;
    }

    if (!config.enabled) {
      res.status(400).json({ message: 'Yamato B2連携が無効になっています' });
      return;
    }

    // Yamato B2 APIを呼び出し
    const service = createYamatoB2Service(config.yamatoB2, tenantId);
    const result = await service.printLabels(parsed.data.trackingNumbers);

    logger.info({
      trackingNumbers: result.tracking_numbers,
    }, 'Yamato B2 print completed');

    res.json(result);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Yamato B2 print failed');
    res.status(500).json({ message: '印刷に失敗しました', error: error.message });
  }
};

/**
 * Yamato B2: 複数追跡番号からPDFを一括取得（b2-webapiのキャッシュから）
 */
export const yamatoB2FetchBatchPdf = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);

    const parsed = printRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: 'バリデーションエラー',
        errors: parsed.error.flatten(),
      });
      return;
    }

    // 設定を取得
    const config = await CarrierAutomationConfig.findOne({
      tenantId,
      automationType: 'yamato-b2',
    }).lean();

    if (!config?.yamatoB2) {
      res.status(400).json({ message: 'Yamato B2の設定が見つかりません' });
      return;
    }

    if (!config.enabled) {
      res.status(400).json({ message: 'Yamato B2連携が無効になっています' });
      return;
    }

    // Yamato B2 APIを呼び出してPDFを取得
    const service = createYamatoB2Service(config.yamatoB2, tenantId);
    const pdfBuffer = await service.fetchBatchPdf(parsed.data.trackingNumbers);

    logger.info({
      trackingNumbers: parsed.data.trackingNumbers,
      pdfSize: pdfBuffer.length,
    }, 'Yamato B2 batch PDF fetch completed');

    // PDFをレスポンスとして返す
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=labels.pdf');
    res.send(pdfBuffer);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Yamato B2 batch PDF fetch failed');
    res.status(500).json({ message: 'PDF取得に失敗しました', error: error.message });
  }
};

/**
 * Yamato B2: 履歴からインポート
 */
export const yamatoB2Import = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);

    // リクエストボディを解析（日付フィルタ）
    const parsed = importRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: 'バリデーションエラー',
        errors: parsed.error.flatten(),
      });
      return;
    }

    // 設定を取得
    const config = await CarrierAutomationConfig.findOne({
      tenantId,
      automationType: 'yamato-b2',
    }).lean();

    if (!config?.yamatoB2) {
      res.status(400).json({ message: 'Yamato B2の設定が見つかりません' });
      return;
    }

    if (!config.enabled) {
      res.status(400).json({ message: 'Yamato B2連携が無効になっています' });
      return;
    }

    // Yamato B2 APIから履歴を取得（日付フィルタ付き）
    logger.info({
      shipmentDateFrom: parsed.data.shipmentDateFrom,
      shipmentDateTo: parsed.data.shipmentDateTo,
    }, 'Yamato B2 import: fetching history with date filter');

    const service = createYamatoB2Service(config.yamatoB2, tenantId);
    const history = await service.getHistory({
      shipmentDateFrom: parsed.data.shipmentDateFrom,
      shipmentDateTo: parsed.data.shipmentDateTo,
      limit: 1000,  // Increased limit since we now have date filter
    });

    logger.info({ historyLength: history.length }, 'Yamato B2 import: history fetched');

    // 注文番号から追跡番号をマッチング更新
    // 履歴APIのレスポンス形式: { shipment: { tracking_number, shipment_number, ... }, ... }
    let matchedCount = 0;
    let unmatchedCount = 0;

    for (const item of history) {
      // Extract shipment data from nested structure
      const shipment = item.shipment || item;
      const orderNumber = shipment.shipment_number || shipment.customer_order_no;
      const trackingNumber = shipment.tracking_number;

      if (orderNumber && trackingNumber) {
        // B2 API レスポンスを日本語キーの carrierRawRow 形式に変換
        const carrierRawRow = convertB2ApiToCarrierRawRow(shipment);

        // B2 から返却された sorting_code を 6桁に変換（7桁の先頭を除去）
        const sortingCode = deriveYamatoSortCode(shipment.sorting_code);

        // 更新データを構築
        const updateData: Record<string, any> = {
          trackingId: trackingNumber,
          carrierRawRow,
          'status.carrierReceipt.isReceived': true,
          'status.carrierReceipt.receivedAt': new Date(),
        };
        if (sortingCode) {
          updateData['carrierData.yamato.sortingCode'] = sortingCode;
        }

        // Match by orderNumber and update trackingId (overwrites existing value)
        const result = await ShipmentOrder.findOneAndUpdate(
          {
            orderNumber,
          },
          {
            $set: updateData,
          }
        );
        if (result) {
          matchedCount++;
        } else {
          unmatchedCount++;
        }
      }
    }

    logger.info({
      total: history.length,
      matched: matchedCount,
      unmatched: unmatchedCount,
    }, 'Yamato B2 import completed');

    res.json({
      success: true,
      total: history.length,
      matched: matchedCount,
      unmatched: unmatchedCount,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Yamato B2 import failed');
    res.status(500).json({ message: 'インポートに失敗しました', error: error.message });
  }
};

/**
 * Yamato B2: 発行履歴を取得
 */
export const yamatoB2History = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);

    const parsed = historyRequestSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        message: 'バリデーションエラー',
        errors: parsed.error.flatten(),
      });
      return;
    }

    // 設定を取得
    const config = await CarrierAutomationConfig.findOne({
      tenantId,
      automationType: 'yamato-b2',
    }).lean();

    if (!config?.yamatoB2) {
      res.status(400).json({ message: 'Yamato B2の設定が見つかりません' });
      return;
    }

    if (!config.enabled) {
      res.status(400).json({ message: 'Yamato B2連携が無効になっています' });
      return;
    }

    // Yamato B2 APIから履歴を取得
    const service = createYamatoB2Service(config.yamatoB2, tenantId);
    const history = await service.getHistory(parsed.data);

    res.json({ history });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Yamato B2 history failed');
    res.status(500).json({ message: '履歴の取得に失敗しました', error: error.message });
  }
};

// ============================================================
// 共通ヘルパー関数（B2 Cloud 操作の共通化）
// ============================================================

/**
 * B2 Cloud 削除エラー（canRetryWithSkip 付き）
 */
class B2CloudDeleteError extends Error {
  canRetryWithSkip = true;
  trackingNumbers: string[];
  constructor(message: string, trackingNumbers: string[]) {
    super(message);
    this.trackingNumbers = trackingNumbers;
  }
}

interface B2DeleteOptions {
  trackingNumbers: string[];
  skipCarrierDelete: boolean;
  logContext: string;
}

interface B2DeleteOutcome {
  b2DeleteResult: { success: boolean; deleted: number; error?: string } | null;
  carrierDeleteSkipped: boolean;
}

/**
 * B2 Cloud からの履歴削除（共通処理）
 * - skipCarrierDelete の場合はスキップ
 * - trackingNumbers が空の場合は何もしない
 * - 失敗時は B2CloudDeleteError を throw
 */
async function deleteFromB2CloudIfNeeded(
  service: ReturnType<typeof createYamatoB2Service>,
  options: B2DeleteOptions
): Promise<B2DeleteOutcome> {
  const { trackingNumbers, skipCarrierDelete, logContext } = options;

  if (trackingNumbers.length === 0) {
    return { b2DeleteResult: null, carrierDeleteSkipped: false };
  }

  if (skipCarrierDelete) {
    logger.info({ trackingNumbers }, `Yamato B2 history deletion skipped by user request during ${logContext}`);
    return { b2DeleteResult: null, carrierDeleteSkipped: true };
  }

  try {
    const b2DeleteResult = await service.deleteFromHistory(trackingNumbers);
    logger.info({ trackingNumbers, result: b2DeleteResult }, `Yamato B2 history deletion completed during ${logContext}`);
    return { b2DeleteResult, carrierDeleteSkipped: false };
  } catch (error: any) {
    logger.error({ error: error.message }, `Yamato B2 history deletion failed during ${logContext}`);
    throw new B2CloudDeleteError(error.message, trackingNumbers);
  }
}

interface B2ResubmitOrderResult {
  orderId: string;
  orderNumber: string;
  success: boolean;
  newTrackingId?: string;
  error?: string;
  isBuiltIn: boolean;
}

/**
 * B2 Cloud への再エクスポート（共通処理）
 * - 注文を再取得して exportAndPrint を実行
 * - printResults から trackingId をマッチングして注文を更新
 * - 結果配列を返す
 */
async function resubmitOrdersToB2Cloud(
  service: ReturnType<typeof createYamatoB2Service>,
  orderIds: Array<import('mongoose').Types.ObjectId>,
  now: Date,
  logContext: string
): Promise<B2ResubmitOrderResult[]> {
  const orderResults: B2ResubmitOrderResult[] = [];

  try {
    const updatedOrders = await ShipmentOrder.find({
      _id: { $in: orderIds },
    }).lean();

    const exportResult = await service.exportAndPrint(updatedOrders);

    // print結果から全shipmentデータを収集
    const shipmentByOrderNumber = new Map<string, {
      tracking_number: string;
      shipmentData: any;
    }>();
    const shipmentByTempTracking = new Map<string, {
      tracking_number: string;
      shipmentData: any;
    }>();

    if (exportResult.printResults) {
      for (const printResult of exportResult.printResults) {
        if (printResult.success && printResult.shipments) {
          for (const shipment of printResult.shipments) {
            if (shipment.tracking_number) {
              const data = {
                tracking_number: shipment.tracking_number,
                shipmentData: shipment,
              };
              if (shipment.shipment_number) {
                shipmentByOrderNumber.set(shipment.shipment_number, data);
              }
              if (shipment.temp_tracking_number) {
                shipmentByTempTracking.set(shipment.temp_tracking_number, data);
              }
            }
          }
        }
      }
    }

    logger.info({
      printResultsCount: exportResult.printResults?.length || 0,
      shipmentByOrderNumberSize: shipmentByOrderNumber.size,
      shipmentByTempTrackingSize: shipmentByTempTracking.size,
      orderNumbers: Array.from(shipmentByOrderNumber.keys()),
      tempTrackingNumbers: Array.from(shipmentByTempTracking.keys()),
    }, `Yamato B2 print results processed during ${logContext}`);

    // 結果を処理（注文番号 → 一時番号 の順でマッチング）
    for (let i = 0; i < updatedOrders.length; i++) {
      const order = updatedOrders[i];
      const exportResultItem = exportResult.results[i];

      let matchedData = shipmentByOrderNumber.get(order.orderNumber);

      if (!matchedData && exportResultItem?.tracking_number) {
        matchedData = shipmentByTempTracking.get(exportResultItem.tracking_number);
      }

      if (matchedData) {
        const realTrackingNumber = matchedData.tracking_number;
        const shipmentData = matchedData.shipmentData;
        const carrierRawRow = convertB2ApiToCarrierRawRow(shipmentData);
        const sortingCode = deriveYamatoSortCode(shipmentData.sorting_code);

        const updateData: Record<string, any> = {
          trackingId: realTrackingNumber,
          carrierRawRow,
          'status.confirm.isConfirmed': true,
          'status.confirm.confirmedAt': now,
          'status.carrierReceipt.isReceived': true,
          'status.carrierReceipt.receivedAt': now,
        };

        if (sortingCode) {
          updateData['carrierData.yamato.sortingCode'] = sortingCode;
        }

        await ShipmentOrder.updateOne({ _id: order._id }, { $set: updateData });

        orderResults.push({
          orderId: String(order._id),
          orderNumber: order.orderNumber,
          success: true,
          newTrackingId: realTrackingNumber,
          isBuiltIn: true,
        });
      } else if (exportResultItem?.success && exportResultItem.tracking_number) {
        logger.warn({
          orderNumber: order.orderNumber,
          tempTrackingNumber: exportResultItem.tracking_number,
        }, `Using temp tracking number - print result data not available during ${logContext}`);

        await ShipmentOrder.updateOne(
          { _id: order._id },
          {
            $set: {
              trackingId: exportResultItem.tracking_number,
              'status.confirm.isConfirmed': true,
              'status.confirm.confirmedAt': now,
              'status.carrierReceipt.isReceived': true,
              'status.carrierReceipt.receivedAt': now,
            },
          }
        );

        orderResults.push({
          orderId: String(order._id),
          orderNumber: order.orderNumber,
          success: true,
          newTrackingId: exportResultItem.tracking_number,
          isBuiltIn: true,
        });
      } else {
        orderResults.push({
          orderId: String(order._id),
          orderNumber: order.orderNumber,
          success: false,
          error: exportResultItem?.error || 'B2 Cloud エクスポート失敗',
          isBuiltIn: true,
        });
      }
    }

    logger.info({
      total: exportResult.total,
      success: exportResult.success_count,
      errors: exportResult.error_count,
      printResults: exportResult.printResults?.map(pr => ({
        print_type: pr.print_type,
        success: pr.success,
        trackingCount: pr.tracking_numbers.length,
        shipmentsCount: pr.shipments?.length || 0,
      })),
    }, `Yamato B2 resubmit export completed during ${logContext}`);

  } catch (error: any) {
    logger.error({ error: error.message }, `Yamato B2 resubmit export failed during ${logContext}`);

    // エクスポート全体が失敗 → 対象注文すべてを失敗として返す
    const orders = await ShipmentOrder.find({ _id: { $in: orderIds } }).lean();
    for (const order of orders) {
      orderResults.push({
        orderId: String(order._id),
        orderNumber: order.orderNumber,
        success: false,
        error: error.message || 'B2 Cloud エクスポート失敗',
        isBuiltIn: true,
      });
    }
  }

  return orderResults;
}

/**
 * 注文のステータスリセット + trackingId/carrierRawRow クリア（共通処理）
 */
async function resetOrderStatusAndTracking(
  order: { _id: any; internalRecord?: Array<{ user: string; timestamp: Date; content: string }> },
  internalRecordContent: string | null,
  additionalSetFields?: Record<string, any>,
  additionalUnsetFields?: Record<string, string>
): Promise<void> {
  const existingRecords = order.internalRecord || [];
  const now = new Date();

  const setFields: Record<string, any> = {
    'status.confirm.isConfirmed': false,
    'status.printed.isPrinted': false,
    'status.carrierReceipt.isReceived': false,
    ...additionalSetFields,
  };

  if (internalRecordContent) {
    setFields.internalRecord = [
      ...existingRecords,
      {
        user: 'user',
        timestamp: now,
        content: internalRecordContent,
      },
    ];
  }

  await ShipmentOrder.updateOne(
    { _id: order._id },
    {
      $set: setFields,
      $unset: {
        'status.confirm.confirmedAt': '',
        'status.printed.printedAt': '',
        'status.carrierReceipt.receivedAt': '',
        trackingId: '',
        carrierRawRow: '',
        ...additionalUnsetFields,
      },
    }
  );
}

/**
 * B2CloudDeleteError を HTTP レスポンスに変換するヘルパー
 */
function sendB2DeleteErrorResponse(res: Response, error: B2CloudDeleteError): void {
  res.status(500).json({
    message: 'B2 Cloud からの履歴削除に失敗しました',
    error: error.message,
    canRetryWithSkip: true,
    trackingNumbers: error.trackingNumbers,
  });
}

// ============================================================
// エンドポイントハンドラ
// ============================================================

/**
 * Yamato B2: 確認取消
 * - 注文のステータスをリセット（confirm, printed, carrierReceipt, shipped を false に）
 * - trackingId, carrierRawRow をクリア
 * - B2 Cloud 履歴から削除（trackingId がある場合）
 * - internalRecord に記録を追加
 */
export const yamatoB2Unconfirm = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);

    const parsed = unconfirmRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: 'バリデーションエラー',
        errors: parsed.error.flatten(),
      });
      return;
    }

    const { orderIds, reason, skipCarrierDelete } = parsed.data;

    // 注文を取得
    const orders = await ShipmentOrder.find({
      _id: { $in: orderIds },
    });

    if (orders.length === 0) {
      res.status(400).json({ message: '注文が見つかりません' });
      return;
    }

    // B2 Cloud からの削除
    let b2DeleteResult: { success: boolean; deleted: number; error?: string } | null = null;
    let carrierDeleteSkipped = false;

    const config = await CarrierAutomationConfig.findOne({
      tenantId,
      automationType: 'yamato-b2',
    }).lean();

    if (config?.yamatoB2 && config.enabled) {
      // 只筛选内蔵 carrier（B2 Cloud）的订单
      const builtInOrders = orders.filter((o) => isBuiltInCarrierId(o.carrierId ? String(o.carrierId) : undefined));

      const trackingNumbersToDelete = builtInOrders
        .filter((o) => o.trackingId && o.trackingId.trim())
        .map((o) => o.trackingId!);

      const service = createYamatoB2Service(config.yamatoB2, tenantId);
      const outcome = await deleteFromB2CloudIfNeeded(service, {
        trackingNumbers: trackingNumbersToDelete,
        skipCarrierDelete,
        logContext: 'unconfirm',
      });
      b2DeleteResult = outcome.b2DeleteResult;
      carrierDeleteSkipped = outcome.carrierDeleteSkipped;
    }

    // 注文のステータスをリセット
    const reasonContent = (reason && reason.trim() !== '') ? reason : null;

    for (const order of orders) {
      await resetOrderStatusAndTracking(
        order,
        reasonContent,
        { 'status.shipped.isShipped': false },
        { 'status.shipped.shippedAt': '' }
      );
    }

    logger.info({
      orderIds,
      updatedCount: orders.length,
      b2DeleteResult,
      carrierDeleteSkipped,
    }, 'Yamato B2 unconfirm completed');

    res.json({
      success: true,
      updatedCount: orders.length,
      b2DeleteResult,
      carrierDeleteSkipped,
    });
  } catch (error: any) {
    if (error instanceof B2CloudDeleteError) {
      sendB2DeleteErrorResponse(res, error);
      return;
    }
    logger.error({ error: error.message }, 'Yamato B2 unconfirm failed');
    res.status(500).json({ message: '確認取消に失敗しました', error: error.message });
  }
};

/**
 * 送り状種類変更
 * - 内蔵Carrier（B2 Cloud等）の場合：既存運単を削除 → invoiceType更新 → 再提出 → 新trackingId取得
 * - 手動Carrierの場合：invoiceType更新 → ステータスリセット（確認画面に戻す）
 */
export const changeInvoiceType = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);

    // 1. バリデーション
    const parsed = changeInvoiceTypeRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: 'バリデーションエラー',
        errors: parsed.error.flatten(),
      });
      return;
    }

    const { orderIds, newInvoiceType, skipCarrierDelete } = parsed.data;

    // 2. 注文を取得
    const orders = await ShipmentOrder.find({ _id: { $in: orderIds } });

    if (orders.length === 0) {
      res.status(400).json({ message: '注文が見つかりません' });
      return;
    }

    // 3. coolType 互換性チェック（0, 2, 5 のみクール便対応）
    const coolSupportedInvoiceTypes = ['0', '2', '5'];
    const incompatibleOrders = orders.filter((order) => {
      const coolType = order.coolType;
      return coolType && coolType !== '0' && !coolSupportedInvoiceTypes.includes(newInvoiceType);
    });

    if (incompatibleOrders.length > 0) {
      res.status(400).json({
        message: `送り状種類「${newInvoiceType}」はクール便（冷凍・冷蔵）に対応していません。`,
        incompatibleOrderNumbers: incompatibleOrders.map((o) => o.orderNumber),
      });
      return;
    }

    // 4. 内蔵Carrierと手動Carrierに分類
    const builtInOrders = orders.filter((o) => isBuiltInCarrierId(o.carrierId ? String(o.carrierId) : undefined));
    const manualOrders = orders.filter((o) => !isBuiltInCarrierId(o.carrierId ? String(o.carrierId) : undefined));

    const now = new Date();
    const orderResults: B2ResubmitOrderResult[] = [];

    // 5. 手動Carrier処理：invoiceType更新 + ステータスリセットのみ
    for (const order of manualOrders) {
      const oldInvoiceType = order.invoiceType || '';
      await resetOrderStatusAndTracking(
        order,
        `送り状種類変更: ${oldInvoiceType} → ${newInvoiceType}`,
        { invoiceType: newInvoiceType }
      );

      orderResults.push({
        orderId: String(order._id),
        orderNumber: order.orderNumber,
        success: true,
        isBuiltIn: false,
      });
    }

    // 6. 内蔵Carrier処理
    let b2DeleteResult: { success: boolean; deleted: number; error?: string } | null = null;
    let carrierDeleteSkipped = false;

    if (builtInOrders.length > 0) {
      const config = await CarrierAutomationConfig.findOne({
        tenantId,
        automationType: 'yamato-b2',
      }).lean();

      if (!config?.yamatoB2 || !config.enabled) {
        // B2設定がない/無効の場合は手動Carrierと同様に処理
        for (const order of builtInOrders) {
          const oldInvoiceType = order.invoiceType || '';
          await resetOrderStatusAndTracking(
            order,
            `送り状種類変更: ${oldInvoiceType} → ${newInvoiceType}`,
            { invoiceType: newInvoiceType }
          );

          orderResults.push({
            orderId: String(order._id),
            orderNumber: order.orderNumber,
            success: true,
            isBuiltIn: true,
            error: 'B2 Cloud連携が無効のため、手動で運送会社に再登録が必要です',
          });
        }
      } else {
        const trackingNumbersToDelete = builtInOrders
          .filter((o) => o.trackingId && o.trackingId.trim())
          .map((o) => o.trackingId!);

        const service = createYamatoB2Service(config.yamatoB2, tenantId);

        // B2 Cloud からの削除
        const deleteOutcome = await deleteFromB2CloudIfNeeded(service, {
          trackingNumbers: trackingNumbersToDelete,
          skipCarrierDelete,
          logContext: 'invoice-type-change',
        });
        b2DeleteResult = deleteOutcome.b2DeleteResult;
        carrierDeleteSkipped = deleteOutcome.carrierDeleteSkipped;

        // invoiceType 更新 + ステータスリセット
        await Promise.all(builtInOrders.map(async (order) => {
          const oldInvoiceType = order.invoiceType || '';
          await resetOrderStatusAndTracking(
            order,
            `送り状種類変更: ${oldInvoiceType} → ${newInvoiceType}`,
            { invoiceType: newInvoiceType }
          );
        }));

        // B2 Cloud に再エクスポート
        const resubmitResults = await resubmitOrdersToB2Cloud(
          service,
          builtInOrders.map((o) => o._id),
          now,
          'invoice-type-change'
        );
        orderResults.push(...resubmitResults);
      }
    }

    // 7. 結果を返す
    const successCount = orderResults.filter((r) => r.success).length;
    const hasManualCarrier = manualOrders.length > 0;
    const hasBuiltInCarrier = builtInOrders.length > 0;

    logger.info({
      orderIds,
      newInvoiceType,
      total: orders.length,
      successCount,
      manualCount: manualOrders.length,
      builtInCount: builtInOrders.length,
    }, 'Invoice type change completed');

    res.json({
      success: successCount > 0,
      total: orders.length,
      updatedCount: orders.length, // invoiceType は全て更新済み
      resubmittedCount: orderResults.filter((r) => r.isBuiltIn && r.success && r.newTrackingId).length,
      isBuiltInCarrier: hasBuiltInCarrier && !hasManualCarrier,
      requiresManualUpload: hasManualCarrier,
      deleteResult: b2DeleteResult,
      carrierDeleteSkipped,
      orderResults,
      errors: orderResults.filter((r) => !r.success).map((r) => `${r.orderNumber}: ${r.error}`),
      message: hasManualCarrier
        ? '手動連携の注文は運送会社のシステムから手動で削除・再登録が必要です。'
        : undefined,
    });
  } catch (error: any) {
    if (error instanceof B2CloudDeleteError) {
      sendB2DeleteErrorResponse(res, error);
      return;
    }
    logger.error({ error: error.message }, 'Invoice type change failed');
    res.status(500).json({ message: '送り状種類変更に失敗しました', error: error.message });
  }
};

/**
 * 注文分割
 * - 1つの注文を複数の注文に分割
 * - 商品以外の情報はすべて元注文から引き継ぐ
 * - 内蔵Carrier（B2 Cloud等）の場合：既存運単を削除 → 分割注文を再提出
 * - 手動Carrierの場合：分割注文を未確認状態で作成
 */
export const splitOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);

    // 1. バリデーション
    const parsed = splitOrderRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: 'バリデーションエラー',
        errors: parsed.error.flatten(),
      });
      return;
    }

    const { orderId, splitGroups, skipCarrierDelete } = parsed.data;

    // 2. 元注文を取得
    const originalOrder = await ShipmentOrder.findById(orderId);
    if (!originalOrder) {
      res.status(404).json({ message: '注文が見つかりません' });
      return;
    }

    // 3. 商品総数チェック
    const totalQuantity = originalOrder.products.reduce((sum, p) => sum + p.quantity, 0);
    if (totalQuantity <= 1) {
      res.status(400).json({ message: '商品数が1以下の注文は分割できません' });
      return;
    }

    // 4. splitGroups が全商品を正確にカバーしているか検証
    const quantityMap = new Map<number, number>();
    for (const group of splitGroups) {
      for (const item of group.products) {
        if (item.productIndex < 0 || item.productIndex >= originalOrder.products.length) {
          res.status(400).json({ message: `無効な商品インデックス: ${item.productIndex}` });
          return;
        }
        quantityMap.set(
          item.productIndex,
          (quantityMap.get(item.productIndex) || 0) + item.quantity
        );
      }
    }

    for (let i = 0; i < originalOrder.products.length; i++) {
      const allocated = quantityMap.get(i) || 0;
      if (allocated !== originalOrder.products[i].quantity) {
        res.status(400).json({
          message: `商品[${i}]の数量が一致しません（元: ${originalOrder.products[i].quantity}, 割当: ${allocated}）`,
        });
        return;
      }
    }

    // 5. 新注文番号を生成
    const newOrderNumbers = await generateOrderNumbers(splitGroups.length);
    const now = new Date();

    // 6. 分割注文ドキュメントを構築
    const originalObj = originalOrder.toObject();
    const newOrderDocs = splitGroups.map((group, idx) => {
      const products = group.products.map((item) => {
        const origProduct = originalObj.products[item.productIndex];
        return {
          ...origProduct,
          _id: undefined, // 新しいIDを生成させる
          quantity: item.quantity,
          subtotal: origProduct.unitPrice
            ? origProduct.unitPrice * item.quantity
            : origProduct.subtotal,
        };
      });

      return {
        tenantId: originalObj.tenantId,
        orderNumber: newOrderNumbers[idx],
        sourceOrderAt: originalObj.sourceOrderAt,
        carrierId: originalObj.carrierId,
        customerManagementNumber: originalObj.customerManagementNumber,
        orderer: originalObj.orderer,
        recipient: originalObj.recipient,
        honorific: originalObj.honorific,
        products,
        shipPlanDate: originalObj.shipPlanDate,
        invoiceType: originalObj.invoiceType,
        coolType: originalObj.coolType,
        deliveryTimeSlot: originalObj.deliveryTimeSlot,
        deliveryDatePreference: originalObj.deliveryDatePreference,
        orderSourceCompanyId: originalObj.orderSourceCompanyId,
        sender: originalObj.sender,
        handlingTags: originalObj.handlingTags,
        sourceRawRows: originalObj.sourceRawRows,
        orderGroupId: originalObj.orderGroupId,
        carrierData: originalObj.carrierData,
        status: {
          carrierReceipt: { isReceived: false },
          confirm: { isConfirmed: false },
          printed: { isPrinted: false },
          inspected: { isInspected: false },
          shipped: { isShipped: false },
          ecExported: { isExported: false },
        },
        internalRecord: [{
          user: 'user',
          timestamp: now,
          content: `注文分割: 元注文 ${originalOrder.orderNumber} から分割`,
        }],
      };
    });

    // 7. 一括挿入
    const insertedOrders = await ShipmentOrder.insertMany(newOrderDocs);

    // 8. キャリア種別で分岐
    const isBuiltIn = isBuiltInCarrierId(
      originalOrder.carrierId ? String(originalOrder.carrierId) : undefined
    );

    let b2DeleteResult: { success: boolean; deleted: number; error?: string } | null = null;
    let carrierDeleteSkipped = false;
    let resubmitResults: B2ResubmitOrderResult[] = [];

    if (isBuiltIn) {
      const config = await CarrierAutomationConfig.findOne({
        tenantId,
        automationType: 'yamato-b2',
      }).lean();

      if (config?.yamatoB2 && config.enabled) {
        // B2 Cloud から元注文を削除
        const trackingNumbers = originalOrder.trackingId?.trim()
          ? [originalOrder.trackingId]
          : [];

        const service = createYamatoB2Service(config.yamatoB2, tenantId);

        try {
          const deleteOutcome = await deleteFromB2CloudIfNeeded(service, {
            trackingNumbers,
            skipCarrierDelete,
            logContext: 'split-order',
          });
          b2DeleteResult = deleteOutcome.b2DeleteResult;
          carrierDeleteSkipped = deleteOutcome.carrierDeleteSkipped;
        } catch (error: any) {
          // B2削除失敗 → 挿入済み分割注文をロールバック
          await ShipmentOrder.deleteMany({
            _id: { $in: insertedOrders.map((o) => o._id) },
          });
          if (error instanceof B2CloudDeleteError) {
            sendB2DeleteErrorResponse(res, error);
            return;
          }
          throw error;
        }

        // 元注文を DB から削除
        await ShipmentOrder.deleteOne({ _id: originalOrder._id });

        // 分割注文を B2 Cloud に再提出
        resubmitResults = await resubmitOrdersToB2Cloud(
          service,
          insertedOrders.map((o) => o._id),
          now,
          'split-order'
        );
      } else {
        // B2設定がない/無効 → 元注文を削除のみ
        await ShipmentOrder.deleteOne({ _id: originalOrder._id });
      }
    } else {
      // 手動Carrier → 元注文を削除、分割注文は未確認のまま
      await ShipmentOrder.deleteOne({ _id: originalOrder._id });
    }

    // 9. 結果を構築
    const splitOrders = insertedOrders.map((o) => {
      const resubmitResult = resubmitResults.find((r) => r.orderId === String(o._id));
      return {
        orderId: String(o._id),
        orderNumber: o.orderNumber,
        productCount: o.products.length,
        success: resubmitResult ? resubmitResult.success : true,
        newTrackingId: resubmitResult?.newTrackingId,
        error: resubmitResult?.error,
      };
    });

    logger.info({
      originalOrderId: orderId,
      originalOrderNumber: originalOrder.orderNumber,
      splitCount: splitOrders.length,
      isBuiltIn,
    }, 'Order split completed');

    res.json({
      success: true,
      originalOrderId: orderId,
      originalOrderNumber: originalOrder.orderNumber,
      splitOrders,
      isBuiltInCarrier: isBuiltIn,
      deleteResult: b2DeleteResult,
      carrierDeleteSkipped,
      errors: splitOrders.filter((o) => !o.success).map((o) => `${o.orderNumber}: ${o.error}`),
    });
  } catch (error: any) {
    if (error instanceof B2CloudDeleteError) {
      sendB2DeleteErrorResponse(res, error);
      return;
    }
    logger.error({ error: error.message }, 'Order split failed');
    res.status(500).json({ message: '注文分割に失敗しました', error: error.message });
  }
};
