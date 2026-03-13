import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const taskApi = {
  /** タスクキュー取得 */
  getTaskQueue(warehouseId: string, params?: {
    type?: string
    status?: string
    assignedTo?: string
    limit?: number
  }) {
    return api.get(`/warehouse-tasks`, { params: { warehouseId, ...params } })
  },

  /** タスク詳細取得 */
  getTask(taskId: string) {
    return api.get(`/warehouse-tasks/${taskId}`)
  },

  /** タスク割当 */
  assignTask(taskId: string, assignedTo: string, assignedName?: string) {
    return api.post(`/warehouse-tasks/${taskId}/assign`, { assignedTo, assignedName })
  },

  /** タスク開始 */
  startTask(taskId: string) {
    return api.post(`/warehouse-tasks/${taskId}/start`)
  },

  /** タスク完了 */
  completeTask(taskId: string, completedQuantity: number) {
    return api.post(`/warehouse-tasks/${taskId}/complete`, { completedQuantity })
  },

  /** タスクキャンセル */
  cancelTask(taskId: string, reason?: string) {
    return api.post(`/warehouse-tasks/${taskId}/cancel`, { reason })
  },

  /** タスク保留 */
  holdTask(taskId: string, reason?: string) {
    return api.post(`/warehouse-tasks/${taskId}/hold`, { reason })
  },

  /** 次のタスク取得（PDA用） */
  getNextTask(warehouseId: string, assignedTo: string) {
    return api.get(`/warehouse-tasks/next`, { params: { warehouseId, assignedTo } })
  },
}
