/**
 * labelingTaskController 単元テスト / labelingTaskController 单元测试
 *
 * ラベリングタスクの CRUD・ステータス遷移・一括生成を検証。
 * 验证标签任务的 CRUD、状态流转、批量生成。
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言（hoisted） / 模块Mock声明（提升） ──────────

vi.mock('@/models/labelingTask', () => ({
  LabelingTask: {
    find: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn(),
  },
}))

vi.mock('@/models/workCharge', () => ({
  WorkCharge: {},
}))

vi.mock('@/api/helpers/tenantHelper', () => ({
  getTenantId: vi.fn(),
}))

import { LabelingTask } from '@/models/labelingTask'
import { getTenantId } from '@/api/helpers/tenantHelper'
import {
  listLabelingTasks,
  createLabelingTask,
  getLabelingTask,
  startPrint,
  startLabel,
  verifyLabel,
  batchCreateFromOrder,
} from '../labelingTaskController'

// ─── テストユーティリティ / 测试工具 ────────────────────────

const mockReq = (overrides = {}) =>
  ({
    query: {},
    params: {},
    body: {},
    headers: {},
    user: { id: 'u1', tenantId: 'T1' },
    ...overrides,
  }) as any

const mockRes = () => {
  const res: any = { json: vi.fn(), status: vi.fn() }
  res.status.mockReturnValue(res)
  return res
}

// ─── テスト本体 / 测试主体 ────────────────────────

describe('labelingTaskController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getTenantId).mockReturnValue('T1')
  })

  // === 一覧取得 / 列表获取 ===
  describe('listLabelingTasks', () => {
    it('テナント別一覧を返す / 返回按租户筛选的列表', async () => {
      const tasks = [{ _id: '1', taskNumber: 'LBL-001', status: 'pending' }]
      const chain = { sort: vi.fn().mockReturnThis(), skip: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue(tasks) }
      vi.mocked(LabelingTask.find).mockReturnValue(chain as any)
      vi.mocked(LabelingTask.countDocuments).mockResolvedValue(1 as any)

      const req = mockReq({ query: { page: '1', limit: '10' } })
      const res = mockRes()
      await listLabelingTasks(req, res)

      expect(res.json).toHaveBeenCalledWith({ data: tasks, total: 1 })
    })

    it('ステータスフィルターを適用 / 应用状态过滤', async () => {
      const chain = { sort: vi.fn().mockReturnThis(), skip: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue([]) }
      vi.mocked(LabelingTask.find).mockReturnValue(chain as any)
      vi.mocked(LabelingTask.countDocuments).mockResolvedValue(0 as any)

      const req = mockReq({ query: { status: 'printing' } })
      const res = mockRes()
      await listLabelingTasks(req, res)

      expect(LabelingTask.find).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'T1', status: 'printing' }))
    })
  })

  // === 作成 / 创建 ===
  describe('createLabelingTask', () => {
    it('タスクを作成し 201 を返す / 创建任务并返回 201', async () => {
      const created = { toObject: () => ({ _id: 'new1', taskNumber: 'LBL-001', status: 'pending' }) }
      vi.mocked(LabelingTask.create).mockResolvedValue(created as any)

      const req = mockReq({ body: { sku: 'SKU1', requiredQuantity: 10 } })
      const res = mockRes()
      await createLabelingTask(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(LabelingTask.create).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'T1', status: 'pending', completedQuantity: 0, failedQuantity: 0 }),
      )
    })
  })

  // === 詳細取得 / 获取详情 ===
  describe('getLabelingTask', () => {
    it('タスクが見つかった場合返す / 找到任务时返回', async () => {
      const task = { _id: 't1', taskNumber: 'LBL-001' }
      const chain = { lean: vi.fn().mockResolvedValue(task) }
      vi.mocked(LabelingTask.findById).mockReturnValue(chain as any)

      const req = mockReq({ params: { id: 't1' } })
      const res = mockRes()
      await getLabelingTask(req, res)

      expect(res.json).toHaveBeenCalledWith(task)
    })

    it('存在しない場合 404 を返す / 不存在时返回 404', async () => {
      const chain = { lean: vi.fn().mockResolvedValue(null) }
      vi.mocked(LabelingTask.findById).mockReturnValue(chain as any)

      const req = mockReq({ params: { id: 'bad' } })
      const res = mockRes()
      await getLabelingTask(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  // === ステータス遷移 / 状态流转 ===
  describe('startPrint', () => {
    it('printing に遷移 / 转为 printing 状态', async () => {
      const updated = { _id: 't1', status: 'printing' }
      const chain = { lean: vi.fn().mockResolvedValue(updated) }
      vi.mocked(LabelingTask.findByIdAndUpdate).mockReturnValue(chain as any)

      const req = mockReq({ params: { id: 't1' }, body: { operatorId: 'op1' } })
      const res = mockRes()
      await startPrint(req, res)

      expect(res.json).toHaveBeenCalledWith(updated)
      expect(LabelingTask.findByIdAndUpdate).toHaveBeenCalledWith(
        't1',
        { status: 'printing', labeledBy: 'op1' },
        { new: true },
      )
    })

    it('存在しない場合 404 / 不存在时返回 404', async () => {
      const chain = { lean: vi.fn().mockResolvedValue(null) }
      vi.mocked(LabelingTask.findByIdAndUpdate).mockReturnValue(chain as any)

      const req = mockReq({ params: { id: 'bad' }, body: {} })
      const res = mockRes()
      await startPrint(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  describe('startLabel', () => {
    it('labeling に遷移 / 转为 labeling 状态', async () => {
      const updated = { _id: 't1', status: 'labeling' }
      const chain = { lean: vi.fn().mockResolvedValue(updated) }
      vi.mocked(LabelingTask.findByIdAndUpdate).mockReturnValue(chain as any)

      const req = mockReq({ params: { id: 't1' } })
      const res = mockRes()
      await startLabel(req, res)

      expect(res.json).toHaveBeenCalledWith(updated)
    })
  })

  describe('verifyLabel', () => {
    it('検証完了で completed に遷移 / 验证完成后转为 completed', async () => {
      const task = {
        _id: 't1',
        status: 'labeling',
        requiredQuantity: 10,
        save: vi.fn().mockResolvedValue(undefined),
        toObject: vi.fn().mockReturnValue({ _id: 't1', status: 'completed', completedQuantity: 8 }),
      }
      vi.mocked(LabelingTask.findById).mockResolvedValue(task as any)

      const req = mockReq({ params: { id: 't1' }, body: { verifiedBy: 'v1', result: 'pass', failedQuantity: 2 } })
      const res = mockRes()
      await verifyLabel(req, res)

      expect(task.status).toBe('completed')
      expect(task.completedQuantity).toBe(8)
      expect(task.save).toHaveBeenCalled()
      expect(res.json).toHaveBeenCalled()
    })

    it('存在しない場合 404 / 不存在时返回 404', async () => {
      vi.mocked(LabelingTask.findById).mockResolvedValue(null)

      const req = mockReq({ params: { id: 'bad' }, body: {} })
      const res = mockRes()
      await verifyLabel(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  // === 一括生成 / 批量生成 ===
  describe('batchCreateFromOrder', () => {
    it('lines から複数タスクを生成し 201 / 从 lines 批量生成任务并返回 201', async () => {
      const created = { toObject: () => ({ _id: 'x', status: 'pending' }) }
      vi.mocked(LabelingTask.create).mockResolvedValue(created as any)

      const req = mockReq({
        body: {
          inboundOrderId: 'ib1',
          lines: [
            { productId: 'p1', sku: 'S1', fnsku: 'F1', quantity: 5 },
            { productId: 'p2', sku: 'S2', fnsku: 'F2', quantity: 3 },
          ],
        },
      })
      const res = mockRes()
      await batchCreateFromOrder(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(LabelingTask.create).toHaveBeenCalledTimes(2)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ count: 2 }))
    })

    it('lines が空の場合 400 / lines 为空时返回 400', async () => {
      const req = mockReq({ body: { inboundOrderId: 'ib1', lines: [] } })
      const res = mockRes()
      await batchCreateFromOrder(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })
  })
})
