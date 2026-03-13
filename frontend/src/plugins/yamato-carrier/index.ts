import type { IntegrationPlugin } from '@/core/plugin'

/**
 * ヤマト運輸 B2 Cloud 連携プラグイン
 *
 * 既存の B2 Cloud サービスをプラグインとして登録する例。
 * 実際の API 呼び出しは backend 側の yamatoB2Service が行う。
 */
export const yamatoCarrierPlugin: IntegrationPlugin = {
  id: 'yamato-carrier',
  name: 'ヤマト運輸 B2 Cloud',
  version: '1.0.0',
  type: 'integration',
  description: 'ヤマト運輸 B2 Cloud API 連携（送り状発行・検証・取込）',
  integration: {
    adapter: {
      init: async () => {
        // Backend API 経由で B2 Cloud 設定を読み込む
        // 実装は backend の carrierAutomation サービスに委譲
      },
      healthCheck: async () => {
        // Backend の /api/carrier-automation/config を確認
        return true
      },
    },
    endpoint: '/api/carrier-automation',
  },
}
