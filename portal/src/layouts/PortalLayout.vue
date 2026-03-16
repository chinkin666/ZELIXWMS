<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { usePortalAuthStore } from '@/stores/auth'
import { http } from '@/api/http'

const { t, locale } = useI18n()
const router = useRouter()
const auth = usePortalAuthStore()

// 待处理数 / 対応待ち件数
const pendingCount = ref(0)

async function loadPending() {
  try {
    const clientId = auth.user?.clientId || ''
    const qs = clientId ? `?clientId=${clientId}` : ''
    const res = await http.get<any>(`/portal/dashboard${qs}`)
    pendingCount.value = res.needsAttention?.length || 0
  } catch { /* ignore */ }
}

onMounted(loadPending)

function switchLang(lang: string) {
  locale.value = lang
  localStorage.setItem('portal_lang', lang)
}

function logout() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <el-container style="min-height: 100vh">
    <!-- サイドバー / 侧边栏 -->
    <el-aside width="220px" style="background: #1d1e2c">
      <div style="padding: 20px; color: #fff; font-size: 18px; font-weight: bold; border-bottom: 1px solid #2d2e3c">
        {{ t('common.appName') }}
      </div>
      <div v-if="auth.user?.clientName" style="padding: 8px 20px; font-size: 12px; color: #6b6d8a">
        {{ auth.user.clientName }}
      </div>
      <el-menu
        :default-active="$route.path"
        background-color="#1d1e2c"
        text-color="#a0a3bd"
        active-text-color="#fff"
        router
        style="border-right: none"
      >
        <el-menu-item index="/">
          <span>{{ t('nav.home') }}</span>
          <el-badge v-if="pendingCount > 0" :value="pendingCount" :max="9" style="margin-left: 8px" />
        </el-menu-item>
        <el-menu-item index="/products">
          <span>{{ t('nav.products') }}</span>
        </el-menu-item>
        <el-menu-item index="/inbound">
          <span>{{ t('nav.inbound') }}</span>
        </el-menu-item>
        <el-menu-item index="/outbound">
          <span>出库申请</span>
        </el-menu-item>
        <el-menu-item index="/billing">
          <span>{{ t('nav.billing') }}</span>
        </el-menu-item>
        <el-menu-item index="/sub-clients">
          <span>{{ t('nav.subClients') }}</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <!-- ヘッダー / 顶栏 -->
      <el-header style="display: flex; align-items: center; justify-content: flex-end; gap: 16px; border-bottom: 1px solid #eee">
        <!-- 言語切替 / 语言切换 -->
        <el-dropdown @command="switchLang">
          <span style="cursor: pointer; font-size: 14px; color: #606266">
            {{ locale === 'zh' ? '中文' : locale === 'ja' ? '日本語' : 'EN' }}
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="zh">中文</el-dropdown-item>
              <el-dropdown-item command="ja">日本語</el-dropdown-item>
              <el-dropdown-item command="en">English</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <!-- ユーザー / 用户 -->
        <el-dropdown @command="(cmd: string) => cmd === 'logout' && logout()">
          <span style="cursor: pointer; font-size: 14px; color: #303133">
            {{ auth.user?.displayName || '---' }}
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="logout">{{ t('auth.logout') }}</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </el-header>

      <!-- メインコンテンツ / 主内容 -->
      <el-main style="background: #f5f7fa">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>
