/**
 * scriptController 单元测试 / scriptController ユニットテスト
 *
 * 自动化脚本 CRUD + 校验 + 测试执行 + 日志查询
 * 自動化スクリプト CRUD + 検証 + テスト実行 + ログクエリ
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// 模拟 AutomationScript / AutomationScript をモック
vi.mock('@/models/automationScript', () => ({
  AutomationScript: {
    find: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
  },
}))

// 模拟 ScriptExecutionLog / ScriptExecutionLog をモック
vi.mock('@/models/scriptExecutionLog', () => ({
  ScriptExecutionLog: {
    find: vi.fn(),
    countDocuments: vi.fn(),
  },
}))

// 模拟 extensionManager / extensionManager をモック
const mockValidate = vi.fn()
const mockTestExecute = vi.fn()
vi.mock('@/core/extensions', () => ({
  extensionManager: {
    getScriptRunner: vi.fn(() => ({
      validate: mockValidate,
      testExecute: mockTestExecute,
    })),
  },
}))

vi.mock('@/core/extensions/types', () => ({
  HOOK_EVENTS: {
    ORDER_CREATED: 'order.created',
    ORDER_UPDATED: 'order.updated',
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { AutomationScript } from '@/models/automationScript'
import { ScriptExecutionLog } from '@/models/scriptExecutionLog'
import {
  listScripts,
  getScript,
  createScript,
  updateScript,
  deleteScript,
  toggleScript,
  validateScript,
  testScript,
  getScriptLogs,
} from '../scriptController'

const mockReq = (overrides = {}) =>
  ({ query: {}, params: {}, body: {}, headers: {}, user: { id: 'u1', tenantId: 'T1' }, ...overrides }) as any

const mockRes = () => {
  const res: any = { json: vi.fn(), status: vi.fn() }
  res.status.mockReturnValue(res)
  return res
}

describe('scriptController / スクリプトコントローラー', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // --- listScripts ---

  describe('listScripts / 一覧取得 / 列表获取', () => {
    it('全脚本を返す / 返回所有脚本', async () => {
      const scripts = [{ _id: 's1', name: 'test' }]
      const mockSort = vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(scripts) })
      ;(AutomationScript.find as any).mockReturnValue({ sort: mockSort })

      const req = mockReq()
      const res = mockRes()
      await listScripts(req, res)

      expect(res.json).toHaveBeenCalledWith({
        data: scripts,
        availableEvents: ['order.created', 'order.updated'],
      })
    })

    it('event フィルター適用 / event 过滤器应用', async () => {
      const mockSort = vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) })
      ;(AutomationScript.find as any).mockReturnValue({ sort: mockSort })

      const req = mockReq({ query: { event: 'order.created', enabled: 'true' } })
      const res = mockRes()
      await listScripts(req, res)

      expect(AutomationScript.find).toHaveBeenCalledWith({ event: 'order.created', enabled: true })
    })
  })

  // --- getScript ---

  describe('getScript / 単一取得 / 单个获取', () => {
    it('見つからない場合 404 / 找不到时返回 404', async () => {
      ;(AutomationScript.findById as any).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) })

      const req = mockReq({ params: { id: 'nonexist' } })
      const res = mockRes()
      await getScript(req, res)
      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('スクリプト返却 / 返回脚本', async () => {
      const script = { _id: 's1', name: 'test' }
      ;(AutomationScript.findById as any).mockReturnValue({ lean: vi.fn().mockResolvedValue(script) })

      const req = mockReq({ params: { id: 's1' } })
      const res = mockRes()
      await getScript(req, res)
      expect(res.json).toHaveBeenCalledWith(script)
    })
  })

  // --- createScript ---

  describe('createScript / 作成 / 创建', () => {
    it('必須フィールド不足で 400 / 缺少必填字段返回 400', async () => {
      const req = mockReq({ body: { name: 'x' } })
      const res = mockRes()
      await createScript(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('無効なイベント名で 400 / 无效事件名返回 400', async () => {
      const req = mockReq({ body: { name: 'x', event: 'invalid.event', code: 'c' } })
      const res = mockRes()
      await createScript(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('構文エラーで 400 / 语法错误返回 400', async () => {
      mockValidate.mockReturnValue({ valid: false, error: 'syntax error' })

      const req = mockReq({ body: { name: 'x', event: 'order.created', code: 'bad' } })
      const res = mockRes()
      await createScript(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('正常作成 201 / 正常创建返回 201', async () => {
      mockValidate.mockReturnValue({ valid: true })
      const created = { _id: 's1', name: 'x', toObject: () => ({ _id: 's1', name: 'x' }) }
      ;(AutomationScript.create as any).mockResolvedValue(created)

      const req = mockReq({ body: { name: 'x', event: 'order.created', code: 'ok' } })
      const res = mockRes()
      await createScript(req, res)
      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith({ _id: 's1', name: 'x' })
    })
  })

  // --- deleteScript ---

  describe('deleteScript / 削除 / 删除', () => {
    it('見つからない場合 404 / 找不到返回 404', async () => {
      ;(AutomationScript.findByIdAndDelete as any).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) })

      const req = mockReq({ params: { id: 'none' } })
      const res = mockRes()
      await deleteScript(req, res)
      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('正常削除 / 正常删除', async () => {
      ;(AutomationScript.findByIdAndDelete as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: 's1' }),
      })

      const req = mockReq({ params: { id: 's1' } })
      const res = mockRes()
      await deleteScript(req, res)
      expect(res.json).toHaveBeenCalledWith({ message: 'Script deleted / スクリプトを削除しました' })
    })
  })

  // --- toggleScript ---

  describe('toggleScript / 有効無効切替 / 启用禁用切换', () => {
    it('トグルで enabled を反転 / 切换 enabled 状态', async () => {
      const script = { _id: 's1', enabled: false, save: vi.fn() }
      ;(AutomationScript.findById as any).mockResolvedValue(script)

      const req = mockReq({ params: { id: 's1' } })
      const res = mockRes()
      await toggleScript(req, res)

      expect(script.enabled).toBe(true)
      expect(script.save).toHaveBeenCalled()
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ _id: 's1', enabled: true }),
      )
    })
  })

  // --- validateScript ---

  describe('validateScript / 構文チェック / 语法校验', () => {
    it('code 未指定で 400 / code 未提供返回 400', async () => {
      const req = mockReq({ body: {} })
      const res = mockRes()
      await validateScript(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('校验結果を返す / 返回校验结果', async () => {
      mockValidate.mockReturnValue({ valid: true })

      const req = mockReq({ body: { code: 'ok' } })
      const res = mockRes()
      await validateScript(req, res)
      expect(res.json).toHaveBeenCalledWith({ valid: true })
    })
  })

  // --- testScript ---

  describe('testScript / テスト実行 / 测试执行', () => {
    it('実行結果を返す / 返回执行结果', async () => {
      mockTestExecute.mockResolvedValue({ success: true, output: 'ok' })

      const req = mockReq({ params: { id: 's1' }, body: { payload: { x: 1 } } })
      const res = mockRes()
      await testScript(req, res)
      expect(res.json).toHaveBeenCalledWith({ success: true, output: 'ok' })
    })
  })

  // --- getScriptLogs ---

  describe('getScriptLogs / ログクエリ / 日志查询', () => {
    it('ページネーション付きログを返す / 返回分页日志', async () => {
      const logs = [{ _id: 'l1' }]
      const mockChain = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(logs),
      }
      ;(ScriptExecutionLog.find as any).mockReturnValue(mockChain)
      ;(ScriptExecutionLog.countDocuments as any).mockResolvedValue(1)

      const req = mockReq({ params: { id: 's1' }, query: { page: '1', limit: '10' } })
      const res = mockRes()
      await getScriptLogs(req, res)

      expect(res.json).toHaveBeenCalledWith({
        data: logs,
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      })
    })
  })
})
