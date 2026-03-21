/**
 * wmsScheduleController 单元测试 / wmsScheduleController ユニットテスト
 *
 * WMS スケジュール CRUD + 手動実行 + トグル + タスク/ログクエリ + 監査ログ
 * WMS 调度 CRUD + 手动执行 + 切换 + 任务/日志查询 + 审计日志
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// 模拟 WmsSchedule / WmsSchedule をモック
vi.mock('@/models/wmsSchedule', () => ({
  WmsSchedule: {
    find: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
  },
}))

// 模拟 WmsTask / WmsTask をモック
vi.mock('@/models/wmsTask', () => ({
  WmsTask: {
    find: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn(),
  },
}))

// 模拟 WmsScheduleLog / WmsScheduleLog をモック
vi.mock('@/models/wmsScheduleLog', () => ({
  WmsScheduleLog: {
    find: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn(),
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { WmsSchedule } from '@/models/wmsSchedule'
import { WmsTask } from '@/models/wmsTask'
import { WmsScheduleLog } from '@/models/wmsScheduleLog'
import {
  listSchedules,
  getSchedule,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  runSchedule,
  toggleSchedule,
  listTasks,
  getTask,
  listLogs,
  exportLogs,
} from '../wmsScheduleController'

const mockReq = (overrides = {}) =>
  ({ query: {}, params: {}, body: {}, headers: {}, user: { id: 'u1', tenantId: 'T1' }, ...overrides }) as any

const mockRes = () => {
  const res: any = { json: vi.fn(), status: vi.fn() }
  res.status.mockReturnValue(res)
  return res
}

describe('wmsScheduleController / WMS スケジュールコントローラー', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // --- listSchedules ---

  describe('listSchedules / 一覧取得 / 列表获取', () => {
    it('スケジュール一覧を返す / 返回调度列表', async () => {
      const data = [{ _id: 's1', name: 'Daily' }]
      const mockSort = vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(data) })
      ;(WmsSchedule.find as any).mockReturnValue({ sort: mockSort })

      const req = mockReq()
      const res = mockRes()
      await listSchedules(req, res)

      expect(res.json).toHaveBeenCalledWith({ data, total: 1 })
    })
  })

  // --- getSchedule ---

  describe('getSchedule / 単一取得 / 单个获取', () => {
    it('見つからない場合 404 / 找不到返回 404', async () => {
      ;(WmsSchedule.findById as any).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) })

      const req = mockReq({ params: { id: 'none' } })
      const res = mockRes()
      await getSchedule(req, res)
      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('スケジュールを返す / 返回调度', async () => {
      const doc = { _id: 's1', name: 'Daily' }
      ;(WmsSchedule.findById as any).mockReturnValue({ lean: vi.fn().mockResolvedValue(doc) })

      const req = mockReq({ params: { id: 's1' } })
      const res = mockRes()
      await getSchedule(req, res)
      expect(res.json).toHaveBeenCalledWith(doc)
    })
  })

  // --- createSchedule ---

  describe('createSchedule / 作成 / 创建', () => {
    it('正常作成 201 + 監査ログ / 正常创建 201 + 审计日志', async () => {
      const doc = {
        _id: 's1',
        name: 'Daily',
        action: 'sync',
        toObject: () => ({ _id: 's1', name: 'Daily' }),
      }
      ;(WmsSchedule.create as any).mockResolvedValue(doc)
      ;(WmsScheduleLog.create as any).mockResolvedValue({})

      const req = mockReq({ body: { name: 'Daily', action: 'sync', cron: '0 0 * * *' } })
      const res = mockRes()
      await createSchedule(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      // 監査ログが作成されることを確認 / 确认创建了审计日志
      expect(WmsScheduleLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'schedule_created' }),
      )
    })
  })

  // --- updateSchedule ---

  describe('updateSchedule / 更新 / 更新', () => {
    it('見つからない場合 404 / 找不到返回 404', async () => {
      ;(WmsSchedule.findByIdAndUpdate as any).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) })

      const req = mockReq({ params: { id: 'none' }, body: { name: 'X' } })
      const res = mockRes()
      await updateSchedule(req, res)
      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('正常更新 + 監査ログ / 正常更新 + 审计日志', async () => {
      const doc = { _id: 's1', name: 'Updated', action: 'sync' }
      ;(WmsSchedule.findByIdAndUpdate as any).mockReturnValue({ lean: vi.fn().mockResolvedValue(doc) })
      ;(WmsScheduleLog.create as any).mockResolvedValue({})

      const req = mockReq({ params: { id: 's1' }, body: { name: 'Updated' } })
      const res = mockRes()
      await updateSchedule(req, res)

      expect(res.json).toHaveBeenCalledWith(doc)
      expect(WmsScheduleLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'schedule_updated' }),
      )
    })
  })

  // --- deleteSchedule ---

  describe('deleteSchedule / 削除 / 删除', () => {
    it('見つからない場合 404 / 找不到返回 404', async () => {
      ;(WmsSchedule.findByIdAndDelete as any).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) })

      const req = mockReq({ params: { id: 'none' } })
      const res = mockRes()
      await deleteSchedule(req, res)
      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('正常削除 / 正常删除', async () => {
      ;(WmsSchedule.findByIdAndDelete as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: 's1' }),
      })

      const req = mockReq({ params: { id: 's1' } })
      const res = mockRes()
      await deleteSchedule(req, res)
      expect(res.json).toHaveBeenCalledWith({ message: 'スケジュールを削除しました' })
    })
  })

  // --- runSchedule ---

  describe('runSchedule / 手動実行 / 手动执行', () => {
    it('見つからない場合 404 / 找不到返回 404', async () => {
      ;(WmsSchedule.findById as any).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) })

      const req = mockReq({ params: { id: 'none' } })
      const res = mockRes()
      await runSchedule(req, res)
      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('タスク作成 + ログ + 201 / 创建任务 + 日志 + 201', async () => {
      const schedule = { _id: 's1', name: 'Daily', action: 'sync' }
      ;(WmsSchedule.findById as any).mockReturnValue({ lean: vi.fn().mockResolvedValue(schedule) })

      const task = { _id: 't1', taskNumber: 'WMT-xxx', toObject: () => ({ _id: 't1' }) }
      ;(WmsTask.create as any).mockResolvedValue(task)
      ;(WmsSchedule.findByIdAndUpdate as any).mockResolvedValue({})
      ;(WmsScheduleLog.create as any).mockResolvedValue({})

      const req = mockReq({ params: { id: 's1' } })
      const res = mockRes()
      await runSchedule(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(WmsTask.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'queued', triggeredBy: 'manual' }),
      )
      expect(WmsScheduleLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'manual_run' }),
      )
    })
  })

  // --- toggleSchedule ---

  describe('toggleSchedule / トグル / 切换', () => {
    it('isEnabled を反転 + ログ / 反转 isEnabled + 日志', async () => {
      const schedule = { _id: 's1', name: 'Daily', action: 'sync', isEnabled: false, save: vi.fn(), toObject: () => ({ _id: 's1', isEnabled: true }) }
      ;(WmsSchedule.findById as any).mockResolvedValue(schedule)
      ;(WmsScheduleLog.create as any).mockResolvedValue({})

      const req = mockReq({ params: { id: 's1' } })
      const res = mockRes()
      await toggleSchedule(req, res)

      expect(schedule.isEnabled).toBe(true)
      expect(schedule.save).toHaveBeenCalled()
      expect(WmsScheduleLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'schedule_enabled' }),
      )
    })
  })

  // --- listTasks ---

  describe('listTasks / タスク一覧 / 任务列表', () => {
    it('ページネーション付きタスクを返す / 返回分页任务', async () => {
      const data = [{ _id: 't1' }]
      const mockChain = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(data),
      }
      ;(WmsTask.find as any).mockReturnValue(mockChain)
      ;(WmsTask.countDocuments as any).mockResolvedValue(1)

      const req = mockReq({ query: { page: '1', limit: '50' } })
      const res = mockRes()
      await listTasks(req, res)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data, total: 1 }),
      )
    })
  })

  // --- getTask ---

  describe('getTask / タスク詳細 / 任务详情', () => {
    it('見つからない場合 404 / 找不到返回 404', async () => {
      ;(WmsTask.findById as any).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) })

      const req = mockReq({ params: { taskId: 'none' } })
      const res = mockRes()
      await getTask(req, res)
      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  // --- exportLogs ---

  describe('exportLogs / ログエクスポート / 日志导出', () => {
    it('全件JSONを返す / 返回全部 JSON', async () => {
      const data = [{ _id: 'l1' }, { _id: 'l2' }]
      const mockChain = {
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(data),
      }
      ;(WmsScheduleLog.find as any).mockReturnValue(mockChain)

      const req = mockReq({ query: {} })
      const res = mockRes()
      await exportLogs(req, res)

      expect(res.json).toHaveBeenCalledWith(data)
    })
  })
})
