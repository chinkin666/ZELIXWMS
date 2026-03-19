/**
 * workflowController 统合テスト / Workflow Controller Integration Tests
 *
 * WorkflowEngine サービス層を通じた各ワークフロー操作の HTTP フローを検証する。
 * Verifies HTTP flow for each workflow operation through WorkflowEngine service layer.
 *
 * モック方針 / Mock strategy:
 * - WorkflowEngine 全体をモック（外部依存を排除）
 *   Mock entire WorkflowEngine (eliminate external dependencies)
 * - req/res を軽量オブジェクトで代替 / Replace req/res with lightweight objects
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言（hoisted） ─────────────────────────────────────────
// Module mock declarations (hoisted)

vi.mock('@/services/workflowEngine', () => ({
  WorkflowEngine: {
    // Inbound / 入荷
    startInboundReceiving: vi.fn(),
    confirmInboundLine: vi.fn(),
    startInboundPutaway: vi.fn(),
    completeInboundPutaway: vi.fn(),
    getInboundStatus: vi.fn(),
    // Outbound / 出荷
    createOutboundWave: vi.fn(),
    startOutboundPicking: vi.fn(),
    completePickingTask: vi.fn(),
    startOutboundSorting: vi.fn(),
    completeOutboundSorting: vi.fn(),
    completeOutboundPacking: vi.fn(),
    getOutboundProgress: vi.fn(),
    // Replenishment / 補充
    triggerReplenishment: vi.fn(),
    completeReplenishment: vi.fn(),
    getReplenishmentStatus: vi.fn(),
    // Summary / サマリー
    getWorkflowSummary: vi.fn(),
  },
}))

import { WorkflowEngine } from '@/services/workflowEngine'
import {
  startReceiving,
  confirmLine,
  startPutaway,
  completePutaway,
  getInboundStatus,
  createWave,
  startPicking,
  completePickTask,
  startSorting,
  completeSorting,
  completePacking,
  getOutboundProgress,
  triggerReplenishment,
  completeReplenish,
  getReplenishStatus,
  getSummary,
} from '@/api/controllers/workflowController'

// ─── テストユーティリティ / Test utilities ────────────────────────────────────

/**
 * モックリクエスト生成 / Mock request factory
 */
const mockReq = (overrides: Record<string, any> = {}) =>
  ({
    query: {},
    params: {},
    body: {},
    headers: {},
    user: { id: 'u1', tenantId: 'T1' },
    ...overrides,
  }) as any

/**
 * モックレスポンス生成 / Mock response factory
 * status().json() チェーンをサポート / Supports status().json() chaining
 */
const mockRes = () => {
  const res: any = {
    json: vi.fn(),
    status: vi.fn(),
  }
  res.status.mockReturnValue(res)
  return res
}

// ─── startReceiving ───────────────────────────────────────────────────────────

describe('startReceiving', () => {
  beforeEach(() => vi.clearAllMocks())

  it('WorkflowEngine.startInboundReceiving を呼び出して結果を返す / calls startInboundReceiving and returns result', async () => {
    // Arrange
    const fakeResult = { status: 'receiving', orderId: 'o1' }
    vi.mocked(WorkflowEngine.startInboundReceiving).mockResolvedValue(fakeResult as any)

    const req = mockReq({
      params: { orderId: 'o1' },
      body: { executedBy: 'user-1' },
    })
    const res = mockRes()

    // Act
    await startReceiving(req, res)

    // Assert: エンジンが正しい引数で呼ばれた / engine called with correct args
    expect(WorkflowEngine.startInboundReceiving).toHaveBeenCalledWith('o1', 'user-1')
    expect(res.json).toHaveBeenCalledWith(fakeResult)
  })

  it('エラー時に 500 を返す / returns 500 on error', async () => {
    // Arrange
    vi.mocked(WorkflowEngine.startInboundReceiving).mockRejectedValue(new Error('order not found'))

    const req = mockReq({ params: { orderId: 'bad-id' }, body: {} })
    const res = mockRes()

    // Act
    await startReceiving(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'order not found' }),
    )
  })
})

// ─── confirmLine ──────────────────────────────────────────────────────────────

describe('confirmLine', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lineNumber と receivedQuantity をエンジンに渡す / passes lineNumber and receivedQuantity to engine', async () => {
    // Arrange
    const fakeResult = { line: { lineNumber: 1, receivedQuantity: 5 } }
    vi.mocked(WorkflowEngine.confirmInboundLine).mockResolvedValue(fakeResult as any)

    const req = mockReq({
      params: { orderId: 'o1' },
      body: { lineNumber: 1, receivedQuantity: 5, executedBy: 'user-1' },
    })
    const res = mockRes()

    // Act
    await confirmLine(req, res)

    // Assert: エンジンが正しい引数で呼ばれた / engine called with correct args
    expect(WorkflowEngine.confirmInboundLine).toHaveBeenCalledWith('o1', 1, 5, 'user-1')
    expect(res.json).toHaveBeenCalledWith(fakeResult)
  })

  it('lineNumber が欠落している場合 400 を返す / returns 400 when lineNumber is missing', async () => {
    // Arrange: lineNumber なし / no lineNumber
    const req = mockReq({
      params: { orderId: 'o1' },
      body: { receivedQuantity: 5 },
    })
    const res = mockRes()

    // Act
    await confirmLine(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('lineNumber') }),
    )
    expect(WorkflowEngine.confirmInboundLine).not.toHaveBeenCalled()
  })

  it('receivedQuantity が欠落している場合 400 を返す / returns 400 when receivedQuantity is missing', async () => {
    // Arrange: receivedQuantity なし / no receivedQuantity
    const req = mockReq({
      params: { orderId: 'o1' },
      body: { lineNumber: 1 },
    })
    const res = mockRes()

    // Act
    await confirmLine(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('receivedQuantity') }),
    )
  })
})

// ─── startPutaway ─────────────────────────────────────────────────────────────

describe('startPutaway', () => {
  beforeEach(() => vi.clearAllMocks())

  it('WorkflowEngine.startInboundPutaway を呼び出す / calls startInboundPutaway', async () => {
    // Arrange
    const fakeResult = { status: 'putaway', orderId: 'o1' }
    vi.mocked(WorkflowEngine.startInboundPutaway).mockResolvedValue(fakeResult as any)

    const req = mockReq({
      params: { orderId: 'o1' },
      body: { executedBy: 'user-1' },
    })
    const res = mockRes()

    // Act
    await startPutaway(req, res)

    // Assert
    expect(WorkflowEngine.startInboundPutaway).toHaveBeenCalledWith('o1', 'user-1')
    expect(res.json).toHaveBeenCalledWith(fakeResult)
  })
})

// ─── completePutaway ──────────────────────────────────────────────────────────

describe('completePutaway', () => {
  beforeEach(() => vi.clearAllMocks())

  it('全必須フィールドをエンジンに渡す / passes all required fields to engine', async () => {
    // Arrange
    const fakeResult = { line: { lineNumber: 1, putawayLocationId: 'loc-2' } }
    vi.mocked(WorkflowEngine.completeInboundPutaway).mockResolvedValue(fakeResult as any)

    const req = mockReq({
      params: { orderId: 'o1' },
      body: {
        lineNumber: 1,
        putawayLocationId: 'loc-2',
        putawayQuantity: 10,
        executedBy: 'user-1',
      },
    })
    const res = mockRes()

    // Act
    await completePutaway(req, res)

    // Assert
    expect(WorkflowEngine.completeInboundPutaway).toHaveBeenCalledWith(
      'o1', 1, 'loc-2', 10, 'user-1',
    )
    expect(res.json).toHaveBeenCalledWith(fakeResult)
  })

  it('lineNumber が欠落している場合 400 を返す / returns 400 when lineNumber is missing', async () => {
    // Arrange
    const req = mockReq({
      params: { orderId: 'o1' },
      body: { putawayLocationId: 'loc-2', putawayQuantity: 5 },
    })
    const res = mockRes()

    // Act
    await completePutaway(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(WorkflowEngine.completeInboundPutaway).not.toHaveBeenCalled()
  })

  it('putawayLocationId が欠落している場合 400 を返す / returns 400 when putawayLocationId is missing', async () => {
    // Arrange
    const req = mockReq({
      params: { orderId: 'o1' },
      body: { lineNumber: 1, putawayQuantity: 5 },
    })
    const res = mockRes()

    // Act
    await completePutaway(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('putawayQuantity が欠落している場合 400 を返す / returns 400 when putawayQuantity is missing', async () => {
    // Arrange
    const req = mockReq({
      params: { orderId: 'o1' },
      body: { lineNumber: 1, putawayLocationId: 'loc-2' },
    })
    const res = mockRes()

    // Act
    await completePutaway(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })
})

// ─── getInboundStatus ─────────────────────────────────────────────────────────

describe('getInboundStatus', () => {
  beforeEach(() => vi.clearAllMocks())

  it('入荷ステータスを取得して返す / fetches and returns inbound status', async () => {
    // Arrange
    const fakeStatus = { orderId: 'o1', status: 'receiving', progress: 50 }
    vi.mocked(WorkflowEngine.getInboundStatus).mockResolvedValue(fakeStatus as any)

    const req = mockReq({ params: { orderId: 'o1' } })
    const res = mockRes()

    // Act
    await getInboundStatus(req, res)

    // Assert
    expect(WorkflowEngine.getInboundStatus).toHaveBeenCalledWith('o1')
    expect(res.json).toHaveBeenCalledWith(fakeStatus)
  })
})

// ─── createWave ───────────────────────────────────────────────────────────────

describe('createWave', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ウェーブを作成してレスポンスに返す / creates wave and returns in response', async () => {
    // Arrange
    const fakeWave = { waveId: 'w1', status: 'draft', shipmentCount: 3 }
    vi.mocked(WorkflowEngine.createOutboundWave).mockResolvedValue(fakeWave as any)

    const req = mockReq({
      body: {
        warehouseId: 'wh-1',
        shipmentOrderIds: ['s1', 's2', 's3'],
        priority: 'high',
        assignedTo: 'picker-1',
      },
    })
    const res = mockRes()

    // Act
    await createWave(req, res)

    // Assert: ウェーブ作成パラメータが渡された / wave creation params passed
    expect(WorkflowEngine.createOutboundWave).toHaveBeenCalledWith(
      expect.objectContaining({
        warehouseId: 'wh-1',
        shipmentOrderIds: ['s1', 's2', 's3'],
        priority: 'high',
      }),
    )
    expect(res.json).toHaveBeenCalledWith(fakeWave)
  })

  it('warehouseId が欠落している場合 400 を返す / returns 400 when warehouseId is missing', async () => {
    // Arrange: warehouseId なし / no warehouseId
    const req = mockReq({
      body: { shipmentOrderIds: ['s1'] },
    })
    const res = mockRes()

    // Act
    await createWave(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('warehouseId') }),
    )
    expect(WorkflowEngine.createOutboundWave).not.toHaveBeenCalled()
  })

  it('shipmentOrderIds が空配列の場合 400 を返す / returns 400 when shipmentOrderIds is empty', async () => {
    // Arrange: 空配列 / empty array
    const req = mockReq({
      body: { warehouseId: 'wh-1', shipmentOrderIds: [] },
    })
    const res = mockRes()

    // Act
    await createWave(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('shipmentOrderIds') }),
    )
  })

  it('shipmentOrderIds が配列でない場合 400 を返す / returns 400 when shipmentOrderIds is not an array', async () => {
    // Arrange: 文字列として渡された場合 / passed as string
    const req = mockReq({
      body: { warehouseId: 'wh-1', shipmentOrderIds: 's1' },
    })
    const res = mockRes()

    // Act
    await createWave(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('エラー時に 500 を返す / returns 500 on error', async () => {
    // Arrange
    vi.mocked(WorkflowEngine.createOutboundWave).mockRejectedValue(
      new Error('wave creation failed'),
    )

    const req = mockReq({
      body: { warehouseId: 'wh-1', shipmentOrderIds: ['s1'] },
    })
    const res = mockRes()

    // Act
    await createWave(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'wave creation failed' }),
    )
  })
})

// ─── startPicking ─────────────────────────────────────────────────────────────

describe('startPicking', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ピッキングを開始してウェーブ状態を返す / starts picking and returns wave state', async () => {
    // Arrange
    const fakeResult = { waveId: 'w1', status: 'picking', taskCount: 5 }
    vi.mocked(WorkflowEngine.startOutboundPicking).mockResolvedValue(fakeResult as any)

    const req = mockReq({
      params: { waveId: 'w1' },
      body: { executedBy: 'picker-1' },
    })
    const res = mockRes()

    // Act
    await startPicking(req, res)

    // Assert
    expect(WorkflowEngine.startOutboundPicking).toHaveBeenCalledWith('w1', 'picker-1')
    expect(res.json).toHaveBeenCalledWith(fakeResult)
  })

  it('エラー時に 500 を返す / returns 500 on error', async () => {
    // Arrange
    vi.mocked(WorkflowEngine.startOutboundPicking).mockRejectedValue(
      new Error('wave not found'),
    )

    const req = mockReq({ params: { waveId: 'bad' }, body: {} })
    const res = mockRes()

    // Act
    await startPicking(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── completePickTask ─────────────────────────────────────────────────────────

describe('completePickTask', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ピッキングタスクを完了してタスク状態を返す / completes pick task and returns task state', async () => {
    // Arrange
    const fakeResult = { taskId: 't1', status: 'done', pickedQuantity: 3 }
    vi.mocked(WorkflowEngine.completePickingTask).mockResolvedValue(fakeResult as any)

    const req = mockReq({
      params: { taskId: 't1' },
      body: { pickedQuantity: 3, executedBy: 'picker-1' },
    })
    const res = mockRes()

    // Act
    await completePickTask(req, res)

    // Assert
    expect(WorkflowEngine.completePickingTask).toHaveBeenCalledWith('t1', 3, 'picker-1')
    expect(res.json).toHaveBeenCalledWith(fakeResult)
  })

  it('pickedQuantity が欠落している場合 400 を返す / returns 400 when pickedQuantity is missing', async () => {
    // Arrange
    const req = mockReq({
      params: { taskId: 't1' },
      body: { executedBy: 'picker-1' },
    })
    const res = mockRes()

    // Act
    await completePickTask(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('pickedQuantity') }),
    )
    expect(WorkflowEngine.completePickingTask).not.toHaveBeenCalled()
  })
})

// ─── getOutboundProgress ──────────────────────────────────────────────────────

describe('getOutboundProgress', () => {
  beforeEach(() => vi.clearAllMocks())

  it('出荷進捗を取得して返す / fetches and returns outbound progress', async () => {
    // Arrange
    const fakeProgress = {
      waveId: 'w1',
      totalTasks: 10,
      completedTasks: 7,
      progress: 70,
    }
    vi.mocked(WorkflowEngine.getOutboundProgress).mockResolvedValue(fakeProgress as any)

    const req = mockReq({ params: { waveId: 'w1' } })
    const res = mockRes()

    // Act
    await getOutboundProgress(req, res)

    // Assert
    expect(WorkflowEngine.getOutboundProgress).toHaveBeenCalledWith('w1')
    expect(res.json).toHaveBeenCalledWith(fakeProgress)
  })

  it('エラー時に 500 を返す / returns 500 on error', async () => {
    // Arrange
    vi.mocked(WorkflowEngine.getOutboundProgress).mockRejectedValue(new Error('DB down'))

    const req = mockReq({ params: { waveId: 'w1' } })
    const res = mockRes()

    // Act
    await getOutboundProgress(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'DB down' }),
    )
  })
})

// ─── triggerReplenishment ─────────────────────────────────────────────────────

describe('triggerReplenishment', () => {
  beforeEach(() => vi.clearAllMocks())

  it('補充トリガーを実行して結果を返す / triggers replenishment and returns result', async () => {
    // Arrange
    const fakeResult = { tasksCreated: 3, warehouseId: 'wh-1' }
    vi.mocked(WorkflowEngine.triggerReplenishment).mockResolvedValue(fakeResult as any)

    const req = mockReq({
      body: { warehouseId: 'wh-1', executedBy: 'sys' },
    })
    const res = mockRes()

    // Act
    await triggerReplenishment(req, res)

    // Assert
    expect(WorkflowEngine.triggerReplenishment).toHaveBeenCalledWith('wh-1', 'sys')
    expect(res.json).toHaveBeenCalledWith(fakeResult)
  })

  it('warehouseId が欠落している場合 400 を返す / returns 400 when warehouseId is missing', async () => {
    // Arrange: warehouseId なし / no warehouseId
    const req = mockReq({ body: { executedBy: 'sys' } })
    const res = mockRes()

    // Act
    await triggerReplenishment(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('warehouseId') }),
    )
    expect(WorkflowEngine.triggerReplenishment).not.toHaveBeenCalled()
  })

  it('エラー時に 500 を返す / returns 500 on error', async () => {
    // Arrange
    vi.mocked(WorkflowEngine.triggerReplenishment).mockRejectedValue(
      new Error('replenishment engine failed'),
    )

    const req = mockReq({ body: { warehouseId: 'wh-1' } })
    const res = mockRes()

    // Act
    await triggerReplenishment(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── completeReplenish ────────────────────────────────────────────────────────

describe('completeReplenish', () => {
  beforeEach(() => vi.clearAllMocks())

  it('補充タスクを完了してタスク状態を返す / completes replenishment task and returns task state', async () => {
    // Arrange
    const fakeResult = { taskId: 'rt-1', status: 'done', movedQuantity: 20 }
    vi.mocked(WorkflowEngine.completeReplenishment).mockResolvedValue(fakeResult as any)

    const req = mockReq({
      params: { taskId: 'rt-1' },
      body: { movedQuantity: 20, executedBy: 'user-1' },
    })
    const res = mockRes()

    // Act
    await completeReplenish(req, res)

    // Assert
    expect(WorkflowEngine.completeReplenishment).toHaveBeenCalledWith('rt-1', 20, 'user-1')
    expect(res.json).toHaveBeenCalledWith(fakeResult)
  })

  it('movedQuantity が欠落している場合 400 を返す / returns 400 when movedQuantity is missing', async () => {
    // Arrange
    const req = mockReq({
      params: { taskId: 'rt-1' },
      body: { executedBy: 'user-1' },
    })
    const res = mockRes()

    // Act
    await completeReplenish(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('movedQuantity') }),
    )
  })
})

// ─── getReplenishStatus ───────────────────────────────────────────────────────

describe('getReplenishStatus', () => {
  beforeEach(() => vi.clearAllMocks())

  it('補充ステータスを取得して返す / fetches and returns replenishment status', async () => {
    // Arrange
    const fakeStatus = { warehouseId: 'wh-1', pendingTasks: 2, inProgressTasks: 1 }
    vi.mocked(WorkflowEngine.getReplenishmentStatus).mockResolvedValue(fakeStatus as any)

    const req = mockReq({ query: { warehouseId: 'wh-1' } })
    const res = mockRes()

    // Act
    await getReplenishStatus(req, res)

    // Assert
    expect(WorkflowEngine.getReplenishmentStatus).toHaveBeenCalledWith('wh-1')
    expect(res.json).toHaveBeenCalledWith(fakeStatus)
  })

  it('warehouseId が欠落している場合 400 を返す / returns 400 when warehouseId is missing', async () => {
    // Arrange: クエリパラメータなし / no query param
    const req = mockReq({ query: {} })
    const res = mockRes()

    // Act
    await getReplenishStatus(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(WorkflowEngine.getReplenishmentStatus).not.toHaveBeenCalled()
  })
})

// ─── getSummary ───────────────────────────────────────────────────────────────

describe('getSummary', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ワークフローサマリーを取得して返す / fetches and returns workflow summary', async () => {
    // Arrange
    const fakeSummary = {
      warehouseId: 'wh-1',
      inbound: { draft: 2, confirmed: 1, receiving: 0 },
      outbound: { pendingWaves: 3, activeWaves: 1 },
      replenishment: { pendingTasks: 2 },
    }
    vi.mocked(WorkflowEngine.getWorkflowSummary).mockResolvedValue(fakeSummary as any)

    const req = mockReq({ query: { warehouseId: 'wh-1' } })
    const res = mockRes()

    // Act
    await getSummary(req, res)

    // Assert
    expect(WorkflowEngine.getWorkflowSummary).toHaveBeenCalledWith('wh-1')
    expect(res.json).toHaveBeenCalledWith(fakeSummary)
  })

  it('warehouseId が欠落している場合 400 を返す / returns 400 when warehouseId is missing', async () => {
    // Arrange
    const req = mockReq({ query: {} })
    const res = mockRes()

    // Act
    await getSummary(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(WorkflowEngine.getWorkflowSummary).not.toHaveBeenCalled()
  })

  it('エラー時に 500 を返す / returns 500 on error', async () => {
    // Arrange
    vi.mocked(WorkflowEngine.getWorkflowSummary).mockRejectedValue(new Error('timeout'))

    const req = mockReq({ query: { warehouseId: 'wh-1' } })
    const res = mockRes()

    // Act
    await getSummary(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'timeout' }),
    )
  })
})

// ─── startSorting / completeSorting / completePacking ─────────────────────────

describe('startSorting', () => {
  beforeEach(() => vi.clearAllMocks())

  it('仕分けを開始して結果を返す / starts sorting and returns result', async () => {
    // Arrange
    const fakeResult = { waveId: 'w1', status: 'sorting' }
    vi.mocked(WorkflowEngine.startOutboundSorting).mockResolvedValue(fakeResult as any)

    const req = mockReq({ params: { waveId: 'w1' }, body: { executedBy: 'sorter-1' } })
    const res = mockRes()

    // Act
    await startSorting(req, res)

    // Assert
    expect(WorkflowEngine.startOutboundSorting).toHaveBeenCalledWith('w1', 'sorter-1')
    expect(res.json).toHaveBeenCalledWith(fakeResult)
  })
})

describe('completeSorting', () => {
  beforeEach(() => vi.clearAllMocks())

  it('仕分けを完了して結果を返す / completes sorting and returns result', async () => {
    // Arrange
    const fakeResult = { waveId: 'w1', status: 'packing' }
    vi.mocked(WorkflowEngine.completeOutboundSorting).mockResolvedValue(fakeResult as any)

    const req = mockReq({ params: { waveId: 'w1' }, body: { executedBy: 'sorter-1' } })
    const res = mockRes()

    // Act
    await completeSorting(req, res)

    // Assert
    expect(WorkflowEngine.completeOutboundSorting).toHaveBeenCalledWith('w1', 'sorter-1')
    expect(res.json).toHaveBeenCalledWith(fakeResult)
  })
})

describe('completePacking', () => {
  beforeEach(() => vi.clearAllMocks())

  it('梱包を完了して結果を返す / completes packing and returns result', async () => {
    // Arrange
    const fakeResult = { taskId: 'pt-1', status: 'done' }
    vi.mocked(WorkflowEngine.completeOutboundPacking).mockResolvedValue(fakeResult as any)

    const req = mockReq({ params: { taskId: 'pt-1' }, body: { executedBy: 'packer-1' } })
    const res = mockRes()

    // Act
    await completePacking(req, res)

    // Assert
    expect(WorkflowEngine.completeOutboundPacking).toHaveBeenCalledWith('pt-1', 'packer-1')
    expect(res.json).toHaveBeenCalledWith(fakeResult)
  })
})
