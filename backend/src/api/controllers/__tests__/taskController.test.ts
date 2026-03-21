/**
 * taskController テスト / Task Controller Tests
 *
 * タスク管理の HTTP フローを検証する。
 * 验证任务管理的 HTTP 流程。
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// タスクモデルのモック / 任务模型 mock
vi.mock('@/models/warehouseTask', () => ({
  WarehouseTask: {
    find: vi.fn(),
    findById: vi.fn(),
    countDocuments: vi.fn(),
  },
}))

// タスクエンジンのモック / 任务引擎 mock
vi.mock('@/services/taskEngine', () => ({
  TaskEngine: {
    createTask: vi.fn(),
    assignTask: vi.fn(),
    startTask: vi.fn(),
    completeTask: vi.fn(),
    cancelTask: vi.fn(),
    holdTask: vi.fn(),
    getNextTask: vi.fn(),
    getTaskQueue: vi.fn(),
  },
}))

import { WarehouseTask } from '@/models/warehouseTask'
import { TaskEngine } from '@/services/taskEngine'
import {
  listTasks,
  getTask,
  createTask,
  assignTask,
  startTask,
  completeTask,
  cancelTask,
  holdTask,
  getNextTask,
  getTaskQueue,
} from '../taskController'

function mockReq(overrides: Record<string, unknown> = {}): any {
  return { body: {}, params: {}, query: {}, headers: {}, ...overrides }
}

function mockRes(): any {
  const res: any = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

describe('taskController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listTasks', () => {
    it('タスク一覧を返す / 返回任务列表', async () => {
      const mockData = [{ _id: 't1', taskNumber: 'TASK-001', type: 'picking' }]
      const chainMock = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockData),
      }
      vi.mocked(WarehouseTask.find).mockReturnValue(chainMock as any)
      vi.mocked(WarehouseTask.countDocuments).mockResolvedValue(1)

      const req = mockReq({ query: {} })
      const res = mockRes()
      await listTasks(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: mockData, total: 1 }))
    })

    it('フィルタが適用される / 应用过滤器', async () => {
      const chainMock = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      }
      vi.mocked(WarehouseTask.find).mockReturnValue(chainMock as any)
      vi.mocked(WarehouseTask.countDocuments).mockResolvedValue(0)

      const req = mockReq({ query: { warehouseId: 'w1', type: 'picking', status: 'pending', search: 'テスト' } })
      const res = mockRes()
      await listTasks(req, res)

      const filter = vi.mocked(WarehouseTask.find).mock.calls[0][0] as any
      expect(filter.warehouseId).toBe('w1')
      expect(filter.type).toBe('picking')
      expect(filter.status).toBe('pending')
      expect(filter.$or).toBeDefined()
    })

    it('500エラーを返す / 返回500错误', async () => {
      vi.mocked(WarehouseTask.find).mockImplementation(() => { throw new Error('DB error') })

      const req = mockReq({ query: {} })
      const res = mockRes()
      await listTasks(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe('getTask', () => {
    it('タスクを返す / 返回任务', async () => {
      const mockTask = { _id: 't1', taskNumber: 'TASK-001' }
      vi.mocked(WarehouseTask.findById).mockReturnValue({ lean: vi.fn().mockResolvedValue(mockTask) } as any)

      const req = mockReq({ params: { id: 't1' } })
      const res = mockRes()
      await getTask(req, res)

      expect(res.json).toHaveBeenCalledWith(mockTask)
    })

    it('存在しない場合404を返す / 不存在时返回404', async () => {
      vi.mocked(WarehouseTask.findById).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) } as any)

      const req = mockReq({ params: { id: 'nonexistent' } })
      const res = mockRes()
      await getTask(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  describe('createTask', () => {
    it('正常にタスクを作成する / 正常创建任务', async () => {
      const mockTask = { _id: 't1', taskNumber: 'TASK-001' }
      vi.mocked(TaskEngine.createTask).mockResolvedValue(mockTask as any)

      const req = mockReq({ body: { type: 'picking', warehouseId: 'w1' } })
      const res = mockRes()
      await createTask(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(mockTask)
    })

    it('500エラーを返す / 返回500错误', async () => {
      vi.mocked(TaskEngine.createTask).mockRejectedValue(new Error('Engine error'))

      const req = mockReq({ body: {} })
      const res = mockRes()
      await createTask(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe('assignTask', () => {
    it('存在しない場合404を返す / 不存在时返回404', async () => {
      vi.mocked(WarehouseTask.findById).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) } as any)

      const req = mockReq({ params: { id: 'nonexistent' }, body: { assignedTo: 'user1' } })
      const res = mockRes()
      await assignTask(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('assignedToが空の場合400を返す / assignedTo为空时返回400', async () => {
      vi.mocked(WarehouseTask.findById).mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: 't1' }) } as any)

      const req = mockReq({ params: { id: 't1' }, body: {} })
      const res = mockRes()
      await assignTask(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('正常に割り当てる / 正常分配', async () => {
      vi.mocked(WarehouseTask.findById).mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: 't1' }) } as any)
      const mockTask = { _id: 't1', assignedTo: 'user1' }
      vi.mocked(TaskEngine.assignTask).mockResolvedValue(mockTask as any)

      const req = mockReq({ params: { id: 't1' }, body: { assignedTo: 'user1', assignedName: 'ユーザー1' } })
      const res = mockRes()
      await assignTask(req, res)

      expect(res.json).toHaveBeenCalledWith(mockTask)
    })
  })

  describe('startTask', () => {
    it('存在しない場合404を返す / 不存在时返回404', async () => {
      vi.mocked(WarehouseTask.findById).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) } as any)

      const req = mockReq({ params: { id: 'nonexistent' } })
      const res = mockRes()
      await startTask(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('正常に開始する / 正常开始', async () => {
      vi.mocked(WarehouseTask.findById).mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: 't1' }) } as any)
      const mockTask = { _id: 't1', status: 'in_progress' }
      vi.mocked(TaskEngine.startTask).mockResolvedValue(mockTask as any)

      const req = mockReq({ params: { id: 't1' } })
      const res = mockRes()
      await startTask(req, res)

      expect(res.json).toHaveBeenCalledWith(mockTask)
    })
  })

  describe('completeTask', () => {
    it('存在しない場合404を返す / 不存在时返回404', async () => {
      vi.mocked(WarehouseTask.findById).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) } as any)

      const req = mockReq({ params: { id: 'nonexistent' }, body: { completedQuantity: 10 } })
      const res = mockRes()
      await completeTask(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('completedQuantityが不足の場合400を返す / completedQuantity缺失时返回400', async () => {
      vi.mocked(WarehouseTask.findById).mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: 't1' }) } as any)

      const req = mockReq({ params: { id: 't1' }, body: {} })
      const res = mockRes()
      await completeTask(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('正常に完了する / 正常完成', async () => {
      vi.mocked(WarehouseTask.findById).mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: 't1' }) } as any)
      const mockTask = { _id: 't1', status: 'completed' }
      vi.mocked(TaskEngine.completeTask).mockResolvedValue(mockTask as any)

      const req = mockReq({ params: { id: 't1' }, body: { completedQuantity: 10, executedBy: 'user1' } })
      const res = mockRes()
      await completeTask(req, res)

      expect(res.json).toHaveBeenCalledWith(mockTask)
    })
  })

  describe('cancelTask', () => {
    it('存在しない場合404を返す / 不存在时返回404', async () => {
      vi.mocked(WarehouseTask.findById).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) } as any)

      const req = mockReq({ params: { id: 'nonexistent' }, body: {} })
      const res = mockRes()
      await cancelTask(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('正常にキャンセルする / 正常取消', async () => {
      vi.mocked(WarehouseTask.findById).mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: 't1' }) } as any)
      const mockTask = { _id: 't1', status: 'cancelled' }
      vi.mocked(TaskEngine.cancelTask).mockResolvedValue(mockTask as any)

      const req = mockReq({ params: { id: 't1' }, body: { reason: 'テスト理由' } })
      const res = mockRes()
      await cancelTask(req, res)

      expect(res.json).toHaveBeenCalledWith(mockTask)
    })
  })

  describe('holdTask', () => {
    it('存在しない場合404を返す / 不存在时返回404', async () => {
      vi.mocked(WarehouseTask.findById).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) } as any)

      const req = mockReq({ params: { id: 'nonexistent' }, body: {} })
      const res = mockRes()
      await holdTask(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('正常に保留する / 正常挂起', async () => {
      vi.mocked(WarehouseTask.findById).mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: 't1' }) } as any)
      const mockTask = { _id: 't1', status: 'on_hold' }
      vi.mocked(TaskEngine.holdTask).mockResolvedValue(mockTask as any)

      const req = mockReq({ params: { id: 't1' }, body: { reason: '在庫不足' } })
      const res = mockRes()
      await holdTask(req, res)

      expect(res.json).toHaveBeenCalledWith(mockTask)
    })
  })

  describe('getNextTask', () => {
    it('warehouseIdが空の場合400を返す / warehouseId为空时返回400', async () => {
      const req = mockReq({ query: { assignedTo: 'user1' } })
      const res = mockRes()
      await getNextTask(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('assignedToが空の場合400を返す / assignedTo为空时返回400', async () => {
      const req = mockReq({ query: { warehouseId: 'w1' } })
      const res = mockRes()
      await getNextTask(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('次のタスクを返す / 返回下一个任务', async () => {
      const mockTask = { _id: 't1', taskNumber: 'TASK-001' }
      vi.mocked(TaskEngine.getNextTask).mockResolvedValue(mockTask as any)

      const req = mockReq({ query: { warehouseId: 'w1', assignedTo: 'user1' } })
      const res = mockRes()
      await getNextTask(req, res)

      expect(res.json).toHaveBeenCalledWith(mockTask)
    })
  })

  describe('getTaskQueue', () => {
    it('warehouseIdが空の場合400を返す / warehouseId为空时返回400', async () => {
      const req = mockReq({ query: {} })
      const res = mockRes()
      await getTaskQueue(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('タスクキューを返す / 返回任务队列', async () => {
      const mockTasks = [{ _id: 't1' }, { _id: 't2' }]
      vi.mocked(TaskEngine.getTaskQueue).mockResolvedValue(mockTasks as any)

      const req = mockReq({ query: { warehouseId: 'w1' } })
      const res = mockRes()
      await getTaskQueue(req, res)

      expect(res.json).toHaveBeenCalledWith(mockTasks)
    })
  })
})
