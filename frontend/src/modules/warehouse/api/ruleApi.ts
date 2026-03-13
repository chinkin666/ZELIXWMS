import axios from 'axios'
import type { RuleDefinition } from '../types/rule'

const api = axios.create({ baseURL: '/api' })

export const ruleApi = {
  /** ルール一覧取得 */
  getRules(params?: { module?: string; warehouseId?: string; isActive?: boolean }) {
    return api.get('/rules', { params })
  },

  /** ルール詳細取得 */
  getRule(ruleId: string) {
    return api.get(`/rules/${ruleId}`)
  },

  /** ルール作成 */
  createRule(data: Omit<RuleDefinition, '_id' | 'createdAt' | 'updatedAt' | 'executionCount' | 'lastExecutedAt'>) {
    return api.post('/rules', data)
  },

  /** ルール更新 */
  updateRule(ruleId: string, data: Partial<RuleDefinition>) {
    return api.put(`/rules/${ruleId}`, data)
  },

  /** ルール削除 */
  deleteRule(ruleId: string) {
    return api.delete(`/rules/${ruleId}`)
  },

  /** ルール有効/無効切替 */
  toggleRule(ruleId: string, isActive: boolean) {
    return api.patch(`/rules/${ruleId}/toggle`, { isActive })
  },

  /** ルールテスト実行（ドライラン） */
  testRule(module: string, context: Record<string, unknown>) {
    return api.post('/rules/test', { module, context })
  },
}
