import { http } from '@/api/http'

export const taskApi = {
  /** タスクキュー取得 */
  getTaskQueue(warehouseId: string, params?: {
    type?: string
    status?: string
    assignedTo?: string
    limit?: number
  }) {
    const stringParams: Record<string, string> = { warehouseId }
    if (params?.type) stringParams.type = params.type
    if (params?.status) stringParams.status = params.status
    if (params?.assignedTo) stringParams.assignedTo = params.assignedTo
    if (params?.limit !== undefined) stringParams.limit = String(params.limit)
    return http.get<unknown>('/warehouse-tasks', stringParams)
  },

  /** タスク詳細取得 */
  getTask(taskId: string) {
    return http.get<unknown>(`/warehouse-tasks/${taskId}`)
  },

  /** タスク割当 */
  assignTask(taskId: string, assignedTo: string, assignedName?: string) {
    return http.post<unknown>(`/warehouse-tasks/${taskId}/assign`, { assignedTo, assignedName })
  },

  /** タスク開始 */
  startTask(taskId: string) {
    return http.post<unknown>(`/warehouse-tasks/${taskId}/start`)
  },

  /** タスク完了 */
  completeTask(taskId: string, completedQuantity: number) {
    return http.post<unknown>(`/warehouse-tasks/${taskId}/complete`, { completedQuantity })
  },

  /** タスクキャンセル */
  cancelTask(taskId: string, reason?: string) {
    return http.post<unknown>(`/warehouse-tasks/${taskId}/cancel`, { reason })
  },

  /** タスク保留 */
  holdTask(taskId: string, reason?: string) {
    return http.post<unknown>(`/warehouse-tasks/${taskId}/hold`, { reason })
  },

  /** 次のタスク取得（PDA用） */
  getNextTask(warehouseId: string, assignedTo: string) {
    return http.get<unknown>('/warehouse-tasks/next', { warehouseId, assignedTo })
  },
}
