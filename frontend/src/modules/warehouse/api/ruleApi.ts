import { http } from '@/api/http'
import type { RuleDefinition } from '../types/rule'

export const ruleApi = {
  /** ルール一覧取得 */
  getRules(params?: { module?: string; warehouseId?: string; isActive?: boolean }) {
    const stringParams: Record<string, string> = {}
    if (params?.module) stringParams.module = params.module
    if (params?.warehouseId) stringParams.warehouseId = params.warehouseId
    if (params?.isActive !== undefined) stringParams.isActive = String(params.isActive)
    return http.get<unknown>('/rules', stringParams)
  },

  /** ルール詳細取得 */
  getRule(ruleId: string) {
    return http.get<unknown>(`/rules/${ruleId}`)
  },

  /** ルール作成 */
  createRule(data: Omit<RuleDefinition, '_id' | 'createdAt' | 'updatedAt' | 'executionCount' | 'lastExecutedAt'>) {
    return http.post<unknown>('/rules', data)
  },

  /** ルール更新 */
  updateRule(ruleId: string, data: Partial<RuleDefinition>) {
    return http.put<unknown>(`/rules/${ruleId}`, data)
  },

  /** ルール削除 */
  deleteRule(ruleId: string) {
    return http.delete<unknown>(`/rules/${ruleId}`)
  },

  /** ルール有効/無効切替 */
  toggleRule(ruleId: string, isActive: boolean) {
    return http.patch<unknown>(`/rules/${ruleId}/toggle`, { isActive })
  },

  /** ルールテスト実行（ドライラン） */
  testRule(module: string, context: Record<string, unknown>) {
    return http.post<unknown>('/rules/test', { module, context })
  },
}
