<template>
  <nav class="topbar-menu">
    <!-- ホーム -->
    <router-link to="/home" class="menu-item" :class="{ active: isActiveGroup('home') }">
      <span>ホーム</span>
    </router-link>

    <!-- 商品管理 dropdown -->
    <div class="menu-dropdown" :class="{ active: isActiveGroup('products') }">
      <div class="menu-item">
        <span>商品管理</span>
        <span class="dropdown-arrow">▾</span>
      </div>
      <div class="dropdown-panel">
        <router-link to="/products/list" class="dropdown-item">商品設定</router-link>
      </div>
    </div>

    <!-- 出荷指示 dropdown -->
    <div class="menu-dropdown" :class="{ active: isActiveGroup('shipment-orders') }">
      <div class="menu-item">
        <span>出荷指示</span>
        <span class="dropdown-arrow">▾</span>
      </div>
      <div class="dropdown-panel">
        <router-link to="/shipment-orders/create" class="dropdown-item">出荷指示作成</router-link>
        <router-link to="/shipment-orders/confirm" class="dropdown-item">出荷指示確定</router-link>
      </div>
    </div>

    <!-- 送り状発行 dropdown -->
    <div class="menu-dropdown" :class="{ active: isActiveGroup('waybill-management') }">
      <div class="menu-item">
        <span>送り状発行</span>
        <span class="dropdown-arrow">▾</span>
      </div>
      <div class="dropdown-panel">
        <router-link to="/waybill-management/export" class="dropdown-item">配送業者データ出力</router-link>
        <router-link to="/waybill-management/import" class="dropdown-item">配送業者データ取込</router-link>
      </div>
    </div>

    <!-- 出荷作業 dropdown -->
    <div class="menu-dropdown" :class="{ active: isActiveGroup('shipment-operations') }">
      <div class="menu-item">
        <span>出荷作業</span>
        <span class="dropdown-arrow">▾</span>
      </div>
      <div class="dropdown-panel">
        <router-link to="/shipment-operations/tasks" class="dropdown-item">出荷作業一覧</router-link>
        <router-link to="/shipment-operations/list" class="dropdown-item">出荷一覧</router-link>
      </div>
    </div>

    <!-- 出荷実績一覧 -->
    <router-link to="/shipment-results" class="menu-item" :class="{ active: isActiveGroup('shipment-results') }">
      <span>出荷実績一覧</span>
    </router-link>

    <!-- 設定管理 dropdown -->
    <div class="menu-dropdown" :class="{ active: isActiveGroup('settings') }">
      <div class="menu-item">
        <span>設定管理</span>
        <span class="dropdown-arrow">▾</span>
      </div>
      <div class="dropdown-panel">
        <router-link to="/settings/basic" class="dropdown-item">基本設定</router-link>
        <router-link to="/settings/orderSourceCompany" class="dropdown-item">ご依頼主設定</router-link>
        <router-link to="/settings/carrier" class="dropdown-item">配送業者設定</router-link>
        <router-link to="/settings/carrier-automation" class="dropdown-item">配送業者自動化設定</router-link>
        <router-link to="/settings/order-groups" class="dropdown-item">検品グループ設定</router-link>
        <router-link to="/settings/auto-processing" class="dropdown-item">自動処理設定</router-link>
        <router-link to="/settings/mapping-patterns" class="dropdown-item">ファイルレイアウト</router-link>
        <router-link to="/settings/print-templates" class="dropdown-item">印刷テンプレート</router-link>
        <router-link to="/settings/form-templates" class="dropdown-item">帳票テンプレート</router-link>
        <router-link to="/settings/printer" class="dropdown-item">プリンター設定</router-link>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()

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
  user-select: none;
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

.dropdown-arrow {
  font-size: 10px;
  margin-left: 2px;
  flex-shrink: 0;
}

/* Dropdown container */
.menu-dropdown {
  position: relative;
  height: 100%;
  display: flex;
  align-items: center;
}

.menu-dropdown > .menu-item {
  height: 100%;
}

.menu-dropdown.active > .menu-item {
  background-color: rgba(255, 255, 255, 0.15);
}

.menu-dropdown:hover > .menu-item {
  background-color: rgba(255, 255, 255, 0.1);
}

/* Dropdown panel */
.dropdown-panel {
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 200px;
  background: var(--o-brand-primary, #714B67);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  padding: 4px 0;
}

.menu-dropdown:hover .dropdown-panel {
  display: block;
}

.dropdown-item {
  display: block;
  padding: 8px 20px;
  color: #fff;
  text-decoration: none;
  font-size: 14px;
  white-space: nowrap;
  transition: background-color 0.15s;
}

.dropdown-item:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

/* Responsive: width less than 1200px */
@media (max-width: 1199px) {
  .menu-item {
    min-width: auto;
    padding: 0 8px;
    font-size: 13px;
  }
}
</style>
