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
      <el-row :gutter="20">
        <el-col :xs="24" :sm="12" :md="8" :lg="6" v-for="card in quickNavCards" :key="card.path">
          <el-card 
            class="nav-card" 
            shadow="hover"
            @click="navigateTo(card.path)"
          >
            <div class="card-content">
              <el-icon class="card-icon" :size="40">
                <component :is="card.icon" />
              </el-icon>
              <h3 class="card-title">{{ card.title }}</h3>
              <p class="card-description">{{ card.description }}</p>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 功能模块 -->
    <div class="modules-section">
      <h2 class="section-title">主要機能</h2>
      <el-row :gutter="20">
        <el-col :xs="24" :sm="12" :md="8" v-for="module in modules" :key="module.name">
          <el-card class="module-card" shadow="hover">
            <template #header>
              <div class="module-header">
                <el-icon class="module-icon">
                  <component :is="module.icon" />
                </el-icon>
                <span class="module-name">{{ module.name }}</span>
              </div>
            </template>
            <ul class="module-features">
              <li v-for="feature in module.features" :key="feature">
                {{ feature }}
              </li>
            </ul>
            <div class="module-actions">
              <el-button 
                type="primary" 
                plain 
                @click="navigateTo(module.path)"
              >
                アクセス
              </el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import {
  Document,
  Location,
  Menu,
  Setting,
  Plus,
  List
} from '@element-plus/icons-vue'

const router = useRouter()

// 快速导航卡片
const quickNavCards = [
  {
    title: '出荷指示作成',
    description: '新しい出荷指示を作成',
    icon: Plus,
    path: '/shipment-orders/create'
  },
  {
    title: '出荷指示確定',
    description: '出荷指示を確定・管理',
    icon: List,
    path: '/shipment-orders/confirm'
  },
  {
    title: '出荷作業一覧',
    description: '出荷作業を管理',
    icon: Menu,
    path: '/shipment-operations/tasks'
  }
]

// 功能模块
const modules = [
  {
    name: '出荷指示管理',
    icon: Document,
    path: '/shipment-orders/create',
    features: [
      '出荷指示の作成',
      '出荷指示の一覧表示',
      'データの取込・管理'
    ]
  },
  {
    name: '送り状管理',
    icon: Location,
    path: '/waybill-management/export',
    features: [
      '配送会社データ出力',
      '配送会社データ取込'
    ]
  },
  {
    name: '出荷作業',
    icon: Menu,
    path: '/shipment-operations/tasks',
    features: [
      '出荷グループ作成',
      '1-1検品出荷',
      '出荷実績管理'
    ]
  },
  {
    name: '設定',
    icon: Setting,
    path: '/settings/basic',
    features: [
      '基本設定',
      'ご依頼主・商品設定',
      '配送会社・テンプレート設定'
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
  color: #303133;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 2px solid #e4e7ed;
}

.nav-card {
  cursor: pointer;
  transition: all 0.3s;
  margin-bottom: 20px;
  height: 100%;
}

.nav-card:hover {
  transform: translateY(-4px);
}

.card-content {
  text-align: center;
  padding: 10px 0;
}

.card-icon {
  color: #409eff;
  margin-bottom: 16px;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 8px 0;
}

.card-description {
  font-size: 14px;
  color: #909399;
  margin: 0;
}

.module-card {
  margin-bottom: 20px;
  height: 100%;
}

.module-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.module-icon {
  font-size: 24px;
  color: #409eff;
}

.module-name {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.module-features {
  list-style: none;
  padding: 0;
  margin: 0 0 20px 0;
}

.module-features li {
  padding: 8px 0;
  padding-left: 24px;
  position: relative;
  color: #606266;
  font-size: 14px;
}

.module-features li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: #67c23a;
  font-weight: bold;
}

.module-actions {
  text-align: right;
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
}
</style>


