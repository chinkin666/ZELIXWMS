<template>
  <div class="welcome-page">
    <!-- 欢迎横幅 -->
    <div class="welcome-banner">
      <h1 class="welcome-title">Nexand 出荷管理システム</h1>
      <p class="welcome-subtitle">出荷業務を効率的に管理するための統合プラットフォーム</p>
    </div>

    <!-- 快速导航卡片 -->
    <div class="quick-nav-section">
      <h2 class="section-title">クイックアクセス</h2>
      <div class="card-grid">
        <div
          v-for="card in quickNavCards"
          :key="card.path"
          class="o-card nav-card"
          @click="navigateTo(card.path)"
        >
          <div class="card-content">
            <span class="card-icon">{{ card.emoji }}</span>
            <h3 class="card-title">{{ card.title }}</h3>
            <p class="card-description">{{ card.description }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 功能模块 -->
    <div class="modules-section">
      <h2 class="section-title">主要機能</h2>
      <div class="module-grid">
        <div v-for="module in modules" :key="module.name" class="o-card module-card">
          <div class="module-header">
            <span class="module-icon">{{ module.emoji }}</span>
            <span class="module-name">{{ module.name }}</span>
          </div>
          <ul class="module-features">
            <li v-for="feature in module.features" :key="feature">
              {{ feature }}
            </li>
          </ul>
          <div class="module-actions">
            <OButton variant="primary" @click="navigateTo(module.path)">
              アクセス
            </OButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import OButton from '@/components/odoo/OButton.vue'

const router = useRouter()

// 快速导航卡片
const quickNavCards = [
  {
    title: '出荷指示作成',
    description: '新しい出荷指示を作成',
    emoji: '+',
    path: '/shipment-orders/create'
  },
  {
    title: '出荷作業一覧',
    description: '出荷作業を管理',
    emoji: '☰',
    path: '/shipment-operations/tasks'
  }
]

// 功能模块
const modules = [
  {
    name: '出荷指示管理',
    emoji: '📄',
    path: '/shipment-orders/create',
    features: [
      '出荷指示の作成',
      '出荷指示の一覧表示',
      'データの取込・管理'
    ]
  },
  {
    name: '出荷作業',
    emoji: '📋',
    path: '/shipment-operations/tasks',
    features: [
      '出荷グループ作成',
      '1-1検品出荷',
      '出荷実績管理'
    ]
  },
  {
    name: '入庫管理',
    emoji: '📥',
    path: '/inbound/dashboard',
    features: [
      '入庫ダッシュボード・CSV取込',
      '3種検品（スキャン・数量入力・一括）',
      '棚入れ（ロケーション割当）・入庫実績'
    ]
  },
  {
    name: '在庫管理',
    emoji: '📦',
    path: '/inventory/stock',
    features: [
      '在庫一覧・集計',
      '入出庫履歴',
      '在庫調整・ロケーション管理'
    ]
  },
  {
    name: '棚卸管理',
    emoji: '📋',
    path: '/stocktaking/list',
    features: [
      '全棚卸・循環棚卸・スポット棚卸',
      '実数量カウント・差異確認',
      '棚卸調整の在庫反映'
    ]
  },
  {
    name: '返品管理',
    emoji: '🔄',
    path: '/returns/list',
    features: [
      '返品受付・検品',
      '良品再入庫・不良廃棄判定',
      '元出荷指示との紐付け'
    ]
  },
  {
    name: '日次管理',
    emoji: '📅',
    path: '/daily/list',
    features: [
      '日次レポート自動集計',
      '日次締め処理',
      '出荷・入庫・返品・在庫サマリー'
    ]
  },
  {
    name: '設定管理',
    emoji: '⚙',
    path: '/settings/basic',
    features: [
      '基本設定',
      'ご依頼主・商品設定',
      '配送業者・テンプレート設定'
    ]
  }
]

const navigateTo = (path: string) => {
  router.push(path)
}
</script>

<style scoped>
.welcome-page {
  max-width: 1400px;
  margin: 0 auto;
}

.welcome-banner {
  text-align: center;
  padding: 40px 20px;
  background: linear-gradient(135deg, #D97756 0%, #B85D3A 100%);
  border-radius: 8px;
  margin-bottom: 40px;
  color: white;
}

.welcome-title {
  font-size: 36px;
  font-weight: 600;
  margin: 0 0 12px 0;
  color: white;
}

.welcome-subtitle {
  font-size: 18px;
  margin: 0;
  opacity: 0.95;
  color: white;
}

.quick-nav-section,
.modules-section {
  margin-bottom: 40px;
}

.section-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--o-gray-700, #303133);
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--o-border-color, #e4e7ed);
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 20px;
}

.nav-card {
  cursor: pointer;
  transition: all 0.3s;
}

.nav-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.card-content {
  text-align: center;
  padding: 10px 0;
}

.card-icon {
  font-size: 40px;
  color: var(--o-brand-primary, #409eff);
  display: block;
  margin-bottom: 16px;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--o-gray-700, #303133);
  margin: 0 0 8px 0;
}

.card-description {
  font-size: 14px;
  color: var(--o-gray-500, #909399);
  margin: 0;
}

.module-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.module-card {
  display: flex;
  flex-direction: column;
}

.module-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--o-border-color, #e4e7ed);
  margin-bottom: 12px;
}

.module-icon {
  font-size: 24px;
}

.module-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--o-gray-700, #303133);
}

.module-features {
  list-style: none;
  padding: 0;
  margin: 0 0 20px 0;
  flex: 1;
}

.module-features li {
  padding: 8px 0;
  padding-left: 24px;
  position: relative;
  color: var(--o-gray-600, #606266);
  font-size: 14px;
}

.module-features li::before {
  content: '\2713';
  position: absolute;
  left: 0;
  color: #67c23a;
  font-weight: bold;
}

.module-actions {
  text-align: right;
}

.o-card {
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-border-color, #e4e7ed);
  border-radius: var(--o-border-radius, 8px);
  padding: 1.25rem;
}

.o-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  border: 1px solid var(--o-border-color, #dcdfe6);
  border-radius: var(--o-border-radius, 4px);
  font-size: var(--o-font-size-base, 14px);
  cursor: pointer;
  background: var(--o-view-background, #fff);
  color: var(--o-gray-700, #303133);
  transition: 0.2s;
}

.o-btn-primary {
  background: var(--o-brand-primary, #714b67);
  color: #fff;
  border-color: var(--o-brand-primary, #714b67);
}

.o-btn-primary:hover {
  opacity: 0.85;
}

@media (max-width: 768px) {
  .welcome-title {
    font-size: 28px;
  }

  .welcome-subtitle {
    font-size: 16px;
  }

  .section-title {
    font-size: 20px;
  }

  .card-grid {
    grid-template-columns: 1fr;
  }

  .module-grid {
    grid-template-columns: 1fr;
  }
}
</style>
