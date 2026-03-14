<script setup lang="ts">
/**
 * コマンドパレット / 命令面板
 * Ctrl+K で起動、ページ名を入力して素早くナビゲーション
 * Ctrl+K 启动，输入页面名快速导航
 */
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const isOpen = ref(false)
const query = ref('')
const selectedIndex = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)

// 导航项目 / ナビゲーション項目
const navItems = [
  { label: 'ホーム', sublabel: 'ダッシュボード', path: '/home', keywords: 'home dashboard ダッシュボード 首页' },
  { label: '出荷指示作成', sublabel: '新規出荷', path: '/shipment/orders/create', keywords: 'shipment create order 出荷 作成 新規' },
  { label: '出荷作業一覧', sublabel: '検品・出荷', path: '/shipment/operations/tasks', keywords: 'shipment tasks 出荷 作業 検品' },
  { label: '出荷一覧', sublabel: '注文リスト', path: '/shipment/operations/list', keywords: 'shipment list 出荷 一覧' },
  { label: '出荷実績', sublabel: '出荷履歴', path: '/shipment/results', keywords: 'results history 実績 履歴' },
  { label: '1-1検品', sublabel: '単品検品', path: '/shipment/operations/one-by-one/inspection', keywords: 'inspection 検品 1対1' },
  { label: 'N-1検品', sublabel: '複数検品', path: '/shipment/operations/n-by-one/inspection', keywords: 'inspection 検品 N対1' },
  { label: '入庫ダッシュボード', sublabel: '入庫概要', path: '/inbound/dashboard', keywords: 'inbound dashboard 入庫 入库' },
  { label: '入庫指示一覧', sublabel: '', path: '/inbound/orders', keywords: 'inbound orders 入庫 指示' },
  { label: '入庫指示作成', sublabel: '', path: '/inbound/create', keywords: 'inbound create 入庫 作成' },
  { label: '在庫一覧', sublabel: '在庫管理', path: '/inventory/stock', keywords: 'inventory stock 在庫 库存' },
  { label: '入出庫履歴', sublabel: '', path: '/inventory/movements', keywords: 'inventory movements 入出庫 履歴' },
  { label: 'ロケーション', sublabel: '棚管理', path: '/inventory/locations', keywords: 'location 棚 ロケーション' },
  { label: 'ロット管理', sublabel: '', path: '/inventory/lots', keywords: 'lot ロット 批次' },
  { label: '在庫台帳', sublabel: '', path: '/inventory/ledger', keywords: 'ledger 台帳' },
  { label: '商品設定', sublabel: '商品マスタ', path: '/products/list', keywords: 'product 商品 マスタ 产品' },
  { label: 'バーコード管理', sublabel: '', path: '/products/barcodes', keywords: 'barcode バーコード' },
  { label: 'セット組一覧', sublabel: '', path: '/set-products/list', keywords: 'set product セット組' },
  { label: '棚卸一覧', sublabel: '', path: '/stocktaking/list', keywords: 'stocktaking 棚卸 盘点' },
  { label: '返品一覧', sublabel: '', path: '/returns/list', keywords: 'return 返品 退货' },
  { label: 'タスクダッシュボード', sublabel: '倉庫タスク', path: '/warehouse-ops/tasks', keywords: 'task warehouse タスク 倉庫 任务' },
  { label: 'ウェーブ管理', sublabel: '', path: '/warehouse-ops/waves', keywords: 'wave ウェーブ 波次' },
  { label: '日次レポート', sublabel: '', path: '/daily/list', keywords: 'daily report 日次 レポート 日报' },
  { label: '出荷統計', sublabel: '日次管理', path: '/daily/statistics', keywords: 'statistics 統計 出荷 shipment stats 报表' },
  { label: '基本設定', sublabel: '出荷設定', path: '/settings/basic', keywords: 'settings basic 基本 設定' },
  { label: 'ご依頼主設定', sublabel: '', path: '/settings/orderSourceCompany', keywords: 'sender 依頼主 发货人' },
  { label: '配送業者設定', sublabel: '', path: '/settings/carrier', keywords: 'carrier 配送 業者 运营商' },
  { label: '出荷グループ', sublabel: '', path: '/settings/order-groups', keywords: 'group 検品 グループ' },
  { label: '自動処理', sublabel: '', path: '/settings/auto-processing', keywords: 'auto processing 自動 処理' },
  { label: 'ファイルレイアウト', sublabel: 'マッピング', path: '/settings/mapping-patterns', keywords: 'mapping layout ファイル マッピング' },
  { label: '印刷テンプレート', sublabel: '', path: '/settings/print-templates', keywords: 'print template 印刷 テンプレート' },
  { label: '得意先一覧', sublabel: '', path: '/settings/customers', keywords: 'customer 得意先 顾客' },
  { label: '倉庫管理', sublabel: '', path: '/settings/warehouses', keywords: 'warehouse 倉庫 仓库' },
  { label: 'Webhook', sublabel: '拡張機能', path: '/settings/webhooks', keywords: 'webhook' },
  { label: 'プラグイン', sublabel: '拡張機能', path: '/settings/plugins', keywords: 'plugin プラグイン 插件' },
  { label: 'スクリプト', sublabel: '自動化', path: '/settings/scripts', keywords: 'script スクリプト 脚本' },
  { label: 'カスタムフィールド', sublabel: '', path: '/settings/custom-fields', keywords: 'custom field カスタム フィールド' },
  { label: 'テナント管理', sublabel: '', path: '/settings/tenants', keywords: 'tenant テナント 租户' },
  { label: '操作ログ', sublabel: '', path: '/settings/operation-logs', keywords: 'log 操作 ログ' },
]

const filteredItems = computed(() => {
  const q = query.value.toLowerCase().trim()
  if (!q) return navItems.slice(0, 10)
  return navItems.filter(item =>
    item.label.toLowerCase().includes(q) ||
    item.sublabel.toLowerCase().includes(q) ||
    item.keywords.toLowerCase().includes(q)
  ).slice(0, 10)
})

watch(query, () => { selectedIndex.value = 0 })

function open() {
  isOpen.value = true
  query.value = ''
  selectedIndex.value = 0
  nextTick(() => inputRef.value?.focus())
}

function close() {
  isOpen.value = false
}

function navigate(path: string) {
  router.push(path)
  close()
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectedIndex.value = Math.min(selectedIndex.value + 1, filteredItems.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const item = filteredItems.value[selectedIndex.value]
    if (item) navigate(item.path)
  }
}

function onGlobalKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    isOpen.value ? close() : open()
  }
  if (e.key === 'Escape' && isOpen.value) {
    close()
  }
}

onMounted(() => document.addEventListener('keydown', onGlobalKeydown))
onUnmounted(() => document.removeEventListener('keydown', onGlobalKeydown))
</script>

<template>
  <Teleport to="body">
    <Transition name="cmd">
      <div v-if="isOpen" class="cmd-backdrop" @click.self="close">
        <div class="cmd-palette">
          <div class="cmd-input-wrap">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" class="cmd-search-icon">
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
            </svg>
            <input
              ref="inputRef"
              v-model="query"
              class="cmd-input"
              placeholder="ページを検索..."
              @keydown="handleKeydown"
            />
            <kbd class="cmd-kbd">ESC</kbd>
          </div>
          <div class="cmd-list" v-if="filteredItems.length > 0">
            <button
              v-for="(item, i) in filteredItems"
              :key="item.path"
              class="cmd-item"
              :class="{ active: i === selectedIndex }"
              @click="navigate(item.path)"
              @mouseenter="selectedIndex = i"
            >
              <span class="cmd-item-label">{{ item.label }}</span>
              <span v-if="item.sublabel" class="cmd-item-sublabel">{{ item.sublabel }}</span>
            </button>
          </div>
          <div v-else class="cmd-empty">該当するページがありません</div>
          <div class="cmd-footer">
            <span><kbd>↑↓</kbd> 移動</span>
            <span><kbd>Enter</kbd> 選択</span>
            <span><kbd>Esc</kbd> 閉じる</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.cmd-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 15vh;
  z-index: 2000;
}

.cmd-palette {
  width: 520px;
  max-width: 90vw;
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-border-color, #e4e7ed);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.cmd-input-wrap {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  gap: 10px;
  border-bottom: 1px solid var(--o-border-color, #e4e7ed);
}

.cmd-search-icon {
  color: var(--o-gray-400, #c0c4cc);
  flex-shrink: 0;
}

.cmd-input {
  flex: 1;
  border: none;
  background: none;
  outline: none;
  font-size: 15px;
  color: var(--o-gray-900, #1a1613);
}
.cmd-input::placeholder {
  color: var(--o-gray-400, #c0c4cc);
}

.cmd-kbd {
  font-size: 11px;
  padding: 2px 6px;
  background: var(--o-gray-100, #f5f7fa);
  border: 1px solid var(--o-gray-300, #e2dbd5);
  color: var(--o-gray-500, #a69b91);
  font-family: var(--o-font-family-mono);
}

.cmd-list {
  max-height: 320px;
  overflow-y: auto;
  padding: 4px 0;
}

.cmd-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 16px;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
  font-size: 14px;
  color: var(--o-gray-700, #4a433d);
  transition: background 0.1s;
}
.cmd-item:hover,
.cmd-item.active {
  background: var(--o-brand-lighter, #FAF0EA);
}
.cmd-item.active {
  color: var(--o-brand-primary, #D97756);
}

.cmd-item-label {
  font-weight: 500;
}

.cmd-item-sublabel {
  font-size: 12px;
  color: var(--o-gray-400, #c0c4cc);
  margin-left: auto;
}

.cmd-empty {
  padding: 24px 16px;
  text-align: center;
  color: var(--o-gray-400, #c0c4cc);
  font-size: 13px;
}

.cmd-footer {
  display: flex;
  gap: 16px;
  padding: 8px 16px;
  border-top: 1px solid var(--o-border-color, #e4e7ed);
  font-size: 11px;
  color: var(--o-gray-400, #c0c4cc);
}
.cmd-footer kbd {
  font-size: 10px;
  padding: 1px 4px;
  background: var(--o-gray-100, #f5f7fa);
  border: 1px solid var(--o-gray-300, #e2dbd5);
  font-family: var(--o-font-family-mono);
}

/* Transition */
.cmd-enter-active { transition: opacity 0.15s ease; }
.cmd-leave-active { transition: opacity 0.1s ease; }
.cmd-enter-from, .cmd-leave-to { opacity: 0; }
.cmd-enter-active .cmd-palette { transition: transform 0.15s ease; }
.cmd-enter-from .cmd-palette { transform: scale(0.95) translateY(-10px); }
</style>
