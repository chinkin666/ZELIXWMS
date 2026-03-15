import type { Request, Response } from 'express';
import { BillingRecord } from '@/models/billingRecord';
import { Invoice } from '@/models/invoice';
import { ShipmentOrder } from '@/models/shipmentOrder';
import { OrderSourceCompany } from '@/models/orderSourceCompany';
import { Carrier } from '@/models/carrier';

// ---------------------------------------------------------------------------
// ヘルパー: 期間（YYYY-MM）から日付範囲を取得
// 辅助: 从期间（YYYY-MM）获取日期范围
// ---------------------------------------------------------------------------
function periodToDateRange(period: string): { startDate: Date; endDate: Date } {
  const [year, month] = period.split('-').map(Number);
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 1)); // 翌月1日 / 下月1日
  return { startDate, endDate };
}

// ---------------------------------------------------------------------------
// ヘルパー: 請求書番号の自動採番
// 辅助: 发票编号自动编号
// ---------------------------------------------------------------------------
async function generateInvoiceNumber(tenantId: string, period: string): Promise<string> {
  const prefix = `INV-${period.replace('-', '')}`;
  const lastInvoice = await Invoice.findOne(
    { tenantId, invoiceNumber: { $regex: `^${prefix}` } },
    { invoiceNumber: 1 },
    { sort: { invoiceNumber: -1 } },
  ).lean();

  let seq = 1;
  if (lastInvoice) {
    const lastSeq = parseInt(lastInvoice.invoiceNumber.split('-').pop() || '0', 10);
    seq = lastSeq + 1;
  }
  return `${prefix}-${String(seq).padStart(3, '0')}`;
}

// ---------------------------------------------------------------------------
// POST /api/billing/generate - 月次請求データ生成
// 月次请求数据生成
// ---------------------------------------------------------------------------
export async function generateMonthlyBilling(req: Request, res: Response) {
  try {
    const { period, tenantId } = req.body;

    if (!period || !/^\d{4}-\d{2}$/.test(period)) {
      return res.status(400).json({ error: '期間(YYYY-MM)が必要です / 需要期间(YYYY-MM)' });
    }
    if (!tenantId) {
      return res.status(400).json({ error: 'tenantIdが必要です / 需要tenantId' });
    }

    const { startDate, endDate } = periodToDateRange(period);

    // 出荷オーダーを荷主・配送業者別に集計
    // 按货主・配送商分组汇总出货订单
    const aggregation = await ShipmentOrder.aggregate([
      {
        $match: {
          shipPlanDate: {
            $gte: `${period}-01`,
            $lt: endDate.toISOString().slice(0, 10),
          },
          'status.shipped.isShipped': true,
        },
      },
      {
        $group: {
          _id: {
            clientId: '$orderSourceCompanyId',
            carrierId: '$carrierId',
          },
          orderCount: { $sum: 1 },
          totalQuantity: { $sum: { $ifNull: ['$_productsMeta.totalQuantity', 0] } },
          totalShippingCost: { $sum: { $ifNull: ['$_productsMeta.totalPrice', 0] } },
        },
      },
    ]);

    // 荷主名・配送業者名のキャッシュ取得
    // 获取货主名・配送商名缓存
    const clientIds = [...new Set(aggregation.map((r) => r._id.clientId).filter(Boolean))];
    const carrierIds = [...new Set(aggregation.map((r) => r._id.carrierId).filter(Boolean))];

    const [clients, carriers] = await Promise.all([
      clientIds.length > 0
        ? OrderSourceCompany.find({ _id: { $in: clientIds } }, { _id: 1, senderName: 1 }).lean()
        : Promise.resolve([]),
      carrierIds.length > 0
        ? Carrier.find({ _id: { $in: carrierIds } }, { _id: 1, name: 1 }).lean()
        : Promise.resolve([]),
    ]);

    const clientMap = new Map(clients.map((c) => [String(c._id), c.senderName]));
    const carrierMap = new Map(carriers.map((c) => [String(c._id), c.name]));

    // 請求明細を作成/更新
    // 创建/更新请求明细
    const results = [];
    for (const row of aggregation) {
      const clientId = row._id.clientId ? String(row._id.clientId) : undefined;
      const carrierId = row._id.carrierId ? String(row._id.carrierId) : undefined;
      const totalAmount = row.totalShippingCost;

      const filter = {
        tenantId,
        period,
        clientId: clientId || null,
        carrierId: carrierId || null,
      };

      const update = {
        tenantId,
        period,
        clientId,
        clientName: clientId ? clientMap.get(clientId) || undefined : undefined,
        carrierId,
        carrierName: carrierId ? carrierMap.get(carrierId) || undefined : undefined,
        orderCount: row.orderCount,
        totalQuantity: row.totalQuantity,
        totalShippingCost: row.totalShippingCost,
        handlingFee: 0,
        storageFee: 0,
        otherFees: 0,
        totalAmount,
        status: 'draft' as const,
      };

      const doc = await BillingRecord.findOneAndUpdate(
        { ...filter, status: 'draft' },
        { $set: update },
        { upsert: true, new: true },
      );
      results.push(doc);
    }

    res.status(201).json({ data: results, count: results.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// ---------------------------------------------------------------------------
// GET /api/billing - 請求明細一覧
// 请求明细列表
// ---------------------------------------------------------------------------
export async function listBillingRecords(req: Request, res: Response) {
  try {
    const { period, clientId, status, tenantId, page = '1', limit = '50' } = req.query;
    const filter: Record<string, unknown> = {};

    if (tenantId) filter.tenantId = tenantId;
    if (period) filter.period = period;
    if (clientId) filter.clientId = clientId;
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [docs, total] = await Promise.all([
      BillingRecord.find(filter)
        .sort({ period: -1, clientName: 1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      BillingRecord.countDocuments(filter),
    ]);

    res.json({ data: docs, total, page: Number(page), limit: Number(limit) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// ---------------------------------------------------------------------------
// GET /api/billing/:id - 請求明細取得
// 获取请求明细
// ---------------------------------------------------------------------------
export async function getBillingRecord(req: Request, res: Response) {
  try {
    const doc = await BillingRecord.findById(req.params.id).lean();
    if (!doc) {
      return res.status(404).json({ error: '請求明細が見つかりません / 未找到请求明细' });
    }
    res.json(doc);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// ---------------------------------------------------------------------------
// POST /api/billing/:id/confirm - 請求明細確定
// 请求明细确认
// ---------------------------------------------------------------------------
export async function confirmBillingRecord(req: Request, res: Response) {
  try {
    const doc = await BillingRecord.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: '請求明細が見つかりません / 未找到请求明细' });
    }
    if (doc.status !== 'draft') {
      return res.status(400).json({
        error: 'ドラフト状態の請求明細のみ確定できます / 仅草稿状态的请求明细可以确认',
      });
    }

    doc.status = 'confirmed';
    doc.confirmedAt = new Date();
    doc.confirmedBy = req.body.confirmedBy || 'system';
    await doc.save();
    res.json(doc.toObject());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// ---------------------------------------------------------------------------
// POST /api/billing/invoices - 請求書作成（BillingRecordから）
// 从BillingRecord创建发票
// ---------------------------------------------------------------------------
export async function createInvoice(req: Request, res: Response) {
  try {
    const {
      tenantId,
      billingRecordId,
      clientId,
      clientName,
      period,
      issueDate,
      dueDate,
      taxRate = 0.10,
      lineItems = [],
      memo,
    } = req.body;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantIdが必要です / 需要tenantId' });
    }
    if (!period || !/^\d{4}-\d{2}$/.test(period)) {
      return res.status(400).json({ error: '期間(YYYY-MM)が必要です / 需要期间(YYYY-MM)' });
    }
    if (!issueDate || !dueDate) {
      return res.status(400).json({
        error: '発行日と支払期限が必要です / 需要发行日和支付期限',
      });
    }

    // BillingRecordからデータを取得（指定がある場合）
    // 从BillingRecord获取数据（如有指定）
    let invoiceLineItems = lineItems;
    let invoiceClientId = clientId;
    let invoiceClientName = clientName;

    if (billingRecordId) {
      const billingRecord = await BillingRecord.findById(billingRecordId).lean();
      if (!billingRecord) {
        return res.status(404).json({ error: '請求明細が見つかりません / 未找到请求明细' });
      }
      if (billingRecord.status === 'draft') {
        return res.status(400).json({
          error: '確定済みの請求明細のみ請求書を作成できます / 仅确认后的请求明细可以创建发票',
        });
      }

      invoiceClientId = invoiceClientId || billingRecord.clientId;
      invoiceClientName = invoiceClientName || billingRecord.clientName;

      // 明細行が指定されていない場合、BillingRecordから自動生成
      // 如果未指定明细行，从BillingRecord自动生成
      if (invoiceLineItems.length === 0) {
        invoiceLineItems = [];
        if (billingRecord.totalShippingCost > 0) {
          invoiceLineItems.push({
            description: '配送料金 / 配送费用',
            quantity: billingRecord.orderCount,
            unitPrice: Math.round((billingRecord.totalShippingCost / billingRecord.orderCount) * 100) / 100,
            amount: billingRecord.totalShippingCost,
          });
        }
        if (billingRecord.handlingFee > 0) {
          invoiceLineItems.push({
            description: '作業手数料 / 操作手续费',
            quantity: 1,
            unitPrice: billingRecord.handlingFee,
            amount: billingRecord.handlingFee,
          });
        }
        if (billingRecord.storageFee > 0) {
          invoiceLineItems.push({
            description: '保管料 / 保管费',
            quantity: 1,
            unitPrice: billingRecord.storageFee,
            amount: billingRecord.storageFee,
          });
        }
        if (billingRecord.otherFees > 0) {
          invoiceLineItems.push({
            description: 'その他費用 / 其他费用',
            quantity: 1,
            unitPrice: billingRecord.otherFees,
            amount: billingRecord.otherFees,
          });
        }
      }
    }

    // 金額計算 / 金额计算
    const subtotal = invoiceLineItems.reduce(
      (sum: number, item: { amount: number }) => sum + item.amount,
      0,
    );
    const taxAmount = Math.round(subtotal * taxRate);
    const totalAmount = subtotal + taxAmount;

    // 請求書番号の自動採番 / 发票编号自动编号
    const invoiceNumber = await generateInvoiceNumber(tenantId, period);

    const invoice = await Invoice.create({
      tenantId,
      invoiceNumber,
      billingRecordId,
      clientId: invoiceClientId,
      clientName: invoiceClientName,
      period,
      issueDate: new Date(issueDate),
      dueDate: new Date(dueDate),
      subtotal,
      taxRate,
      taxAmount,
      totalAmount,
      lineItems: invoiceLineItems,
      status: 'draft',
      memo,
    });

    // BillingRecordのステータスを更新 / 更新BillingRecord状态
    if (billingRecordId) {
      await BillingRecord.findByIdAndUpdate(billingRecordId, { $set: { status: 'invoiced' } });
    }

    res.status(201).json(invoice.toObject());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// ---------------------------------------------------------------------------
// GET /api/billing/invoices - 請求書一覧
// 发票列表
// ---------------------------------------------------------------------------
export async function listInvoices(req: Request, res: Response) {
  try {
    const { tenantId, period, clientId, status, page = '1', limit = '50' } = req.query;
    const filter: Record<string, unknown> = {};

    if (tenantId) filter.tenantId = tenantId;
    if (period) filter.period = period;
    if (clientId) filter.clientId = clientId;
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [docs, total] = await Promise.all([
      Invoice.find(filter)
        .sort({ issueDate: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Invoice.countDocuments(filter),
    ]);

    res.json({ data: docs, total, page: Number(page), limit: Number(limit) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// ---------------------------------------------------------------------------
// GET /api/billing/invoices/:id - 請求書取得
// 获取发票
// ---------------------------------------------------------------------------
export async function getInvoice(req: Request, res: Response) {
  try {
    const doc = await Invoice.findById(req.params.id).lean();
    if (!doc) {
      return res.status(404).json({ error: '請求書が見つかりません / 未找到发票' });
    }
    res.json(doc);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// ---------------------------------------------------------------------------
// PUT /api/billing/invoices/:id/status - 請求書ステータス更新
// 更新发票状态
// ---------------------------------------------------------------------------
export async function updateInvoiceStatus(req: Request, res: Response) {
  try {
    const { status } = req.body;
    const validStatuses = ['draft', 'issued', 'sent', 'paid', 'overdue', 'cancelled'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: `有効なステータスが必要です: ${validStatuses.join(', ')} / 需要有效状态`,
      });
    }

    const doc = await Invoice.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: '請求書が見つかりません / 未找到发票' });
    }

    // ステータス遷移バリデーション / 状态转换验证
    if (doc.status === 'cancelled') {
      return res.status(400).json({
        error: 'キャンセル済みの請求書はステータスを変更できません / 已取消的发票无法更改状态',
      });
    }

    doc.status = status;
    if (status === 'paid') {
      doc.paidAt = new Date();
      // 関連BillingRecordも更新 / 同时更新关联的BillingRecord
      if (doc.billingRecordId) {
        await BillingRecord.findByIdAndUpdate(doc.billingRecordId, { $set: { status: 'paid' } });
      }
    }

    await doc.save();
    res.json(doc.toObject());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * 請求ダッシュボードKPI / 请求仪表板KPI
 * GET /billing/dashboard
 */
export async function getBillingDashboard(_req: Request, res: Response) {
  try {
    const now = new Date();
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // 当月集計 / 当月汇总
    const currentMonthRecords = await BillingRecord.find({ period: currentPeriod }).lean();
    const monthlyOrderCount = currentMonthRecords.reduce((s, r) => s + (r.orderCount || 0), 0);
    const monthlyShippingCost = currentMonthRecords.reduce((s, r) => s + (r.totalShippingCost || 0), 0);

    // 未請求額（draft + confirmed） / 未开票金额
    const unbilledRecords = await BillingRecord.find({ status: { $in: ['draft', 'confirmed'] } }).lean();
    const unbilledAmount = unbilledRecords.reduce((s, r) => s + (r.totalAmount || 0), 0);

    // 未入金額（issued + sent + overdue） / 未收款金额
    const unpaidInvoices = await Invoice.find({ status: { $in: ['issued', 'sent', 'overdue'] } }).lean();
    const unpaidAmount = unpaidInvoices.reduce((s, r) => s + (r.totalAmount || 0), 0);

    // 最近の請求明細 / 最近的请求明细
    const recentRecords = await BillingRecord.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.json({
      monthlyOrderCount,
      monthlyShippingCost,
      unbilledAmount,
      unpaidAmount,
      currentPeriod,
      recentRecords,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
