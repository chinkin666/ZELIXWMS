<template>
  <nav class="topbar-menu">
    <!-- ホーム -->
    <router-link to="/home" class="menu-item" :class="{ active: isActiveGroup('home') }">
      <span>ホーム</span>
    </router-link>

    <!-- 商品管理 dropdown -->
    <el-dropdown trigger="hover" @command="handleCommand" popper-class="topbar-dropdown">
      <div class="menu-item" :class="{ active: isActiveGroup('products') }">
        <span>商品管理</span>
        <el-icon class="dropdown-icon"><ArrowDown /></el-icon>
      </div>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item command="/products/list">商品設定</el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>

    <!-- 出荷指示 dropdown -->
    <el-dropdown trigger="hover" @command="handleCommand" popper-class="topbar-dropdown">
      <div class="menu-item" :class="{ active: isActiveGroup('shipment-orders') }">
        <span>出荷指示</span>
        <el-icon class="dropdown-icon"><ArrowDown /></el-icon>
      </div>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item command="/shipment-orders/create">出荷指示作成</el-dropdown-item>
          <el-dropdown-item command="/shipment-orders/confirm">出荷指示確定</el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>

    <!-- 送り状発行 dropdown -->
    <el-dropdown trigger="hover" @command="handleCommand" popper-class="topbar-dropdown">
      <div class="menu-item" :class="{ active: isActiveGroup('waybill-management') }">
        <span>送り状発行</span>
        <el-icon class="dropdown-icon"><ArrowDown /></el-icon>
      </div>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item command="/waybill-management/export">配送会社データ出力</el-dropdown-item>
          <el-dropdown-item command="/waybill-management/import">配送会社データ取込</el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>

    <!-- 出荷作業 dropdown -->
    <el-dropdown trigger="hover" @command="handleCommand" popper-class="topbar-dropdown">
      <div class="menu-item" :class="{ active: isActiveGroup('shipment-operations') }">
        <span>出荷作業</span>
        <el-icon class="dropdown-icon"><ArrowDown /></el-icon>
      </div>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item command="/shipment-operations/tasks">出荷作業一覧</el-dropdown-item>
          <el-dropdown-item command="/shipment-operations/list">出荷一覧</el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>

    <!-- 出荷実績一覧 -->
    <router-link to="/shipment-results" class="menu-item" :class="{ active: isActiveGroup('shipment-results') }">
      <span>出荷実績一覧</span>
    </router-link>

    <!-- 設定管理 dropdown -->
    <el-dropdown trigger="hover" @command="handleCommand" popper-class="topbar-dropdown">
      <div class="menu-item" :class="{ active: isActiveGroup('settings') }">
        <span>設定管理</span>
        <el-icon class="dropdown-icon"><ArrowDown /></el-icon>
      </div>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item command="/settings/basic">基本設定</el-dropdown-item>
          <el-dropdown-item command="/settings/orderSourceCompany">ご依頼主設定</el-dropdown-item>
          <el-dropdown-item command="/settings/carrier">配送会社設定</el-dropdown-item>
          <el-dropdown-item command="/settings/carrier-automation">配送会社自動化設定</el-dropdown-item>
          <el-dropdown-item command="/settings/order-groups">検品グループ設定</el-dropdown-item>
          <el-dropdown-item command="/settings/auto-processing">自動処理設定</el-dropdown-item>
          <el-dropdown-item command="/settings/mapping-patterns">ファイルレイアウト</el-dropdown-item>
          <el-dropdown-item command="/settings/print-templates">印刷テンプレート</el-dropdown-item>
          <el-dropdown-item command="/settings/form-templates">帳票テンプレート</el-dropdown-item>
          <el-dropdown-item command="/settings/printer">プリンター設定</el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </nav>
</template>

<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { ArrowDown } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()

const handleCommand = (command: string) => {
  router.push(command)
}

const isActiveGroup = (group: string) => {
  return route.path.startsWith(`/${group}`)
}
</script>

<style scoped>
.topbar-menu {
  display: flex;
  align-items: center;
  height: 100%;
  gap: 0;
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 100%;
  min-width: 80px;
  padding: 0 12px;
  font-size: 14px;
  color: #fff;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 0.2s;
  box-sizing: border-box;
  outline: none;
}

.menu-item:focus,
.menu-item:focus-visible {
  outline: none;
}

.menu-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.menu-item.active {
  background-color: rgba(255, 255, 255, 0.15);
}

.dropdown-icon {
  font-size: 12px;
  flex-shrink: 0;
}

.el-dropdown {
  height: 100%;
  outline: none;
}

.el-dropdown:focus,
.el-dropdown:focus-visible {
  outline: none;
}

.el-dropdown .menu-item {
  height: 55px;
}

/* 响应式布局：宽度小于1200px */
@media (max-width: 1199px) {
  .menu-item {
    min-width: auto;
    padding: 0 8px;
    font-size: 13px;
  }
}
</style>

<style>
/* 移除 el-dropdown 触发器的 focus 样式 */
.topbar-menu .el-dropdown__caret-button,
.topbar-menu .el-dropdown .el-tooltip__trigger,
.topbar-menu .el-dropdown .el-tooltip__trigger:focus,
.topbar-menu .el-dropdown .el-tooltip__trigger:focus-visible {
  outline: none !important;
  border: none !important;
  box-shadow: none !important;
}

/* 隐藏下拉菜单的箭头 */
.topbar-dropdown.el-popper.is-light .el-popper__arrow {
  display: none;
}

/* 下拉菜单容器样式 */
.topbar-dropdown.el-popper.is-light {
  border: none !important;
  background-color: #243B66;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.3);
}

.topbar-dropdown .el-dropdown-menu {
  background-color: #243B66;
  border: none;
  padding: 4px 0;
}

.topbar-dropdown .el-dropdown-menu__item {
  font-size: 14px;
  padding: 8px 20px;
  color: #fff;
}

.topbar-dropdown .el-dropdown-menu__item:hover,
.topbar-dropdown .el-dropdown-menu__item:focus {
  background-color: rgba(255, 255, 255, 0.15);
  color: #fff;
}

.topbar-dropdown .el-dropdown-menu__item:not(.is-disabled):focus {
  background-color: rgba(255, 255, 255, 0.15);
  color: #fff;
}
</style>
