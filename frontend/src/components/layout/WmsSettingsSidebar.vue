<script setup lang="ts">
import type { SubMenuGroup } from './menuData'

const props = defineProps<{
  groups: SubMenuGroup[]
  currentPath: string
}>()

const emit = defineEmits<{
  navigate: [to: string]
}>()

function isSubActive(to: string) {
  return props.currentPath === to || props.currentPath.startsWith(to + '/')
}
</script>

<template>
  <aside class="o-settings-sidebar">
    <div class="o-settings-sidebar-inner">
      <template v-for="group in groups" :key="group.groupLabel">
        <div class="o-settings-group-label">{{ group.groupLabel }}</div>
        <button
          v-for="item in group.items"
          :key="item.to"
          class="o-settings-sidebar-item"
          :class="{ active: isSubActive(item.to) }"
          @click="emit('navigate', item.to)"
        >
          {{ item.label }}
        </button>
      </template>
    </div>
  </aside>
</template>

<style scoped>
.o-settings-sidebar {
  position: fixed;
  top: var(--o-navbar-height);
  left: 0;
  bottom: 0;
  width: var(--o-settings-sidebar-width, 200px);
  background: var(--o-view-background);
  border-right: 1px solid var(--o-border-color);
  z-index: 998;
  overflow-y: auto;
  overflow-x: hidden;
}
.o-settings-sidebar::-webkit-scrollbar {
  width: 4px;
}
.o-settings-sidebar::-webkit-scrollbar-thumb {
  background: var(--o-gray-300, #d4d4d4);
  border-radius: 2px;
}

.o-settings-sidebar-inner {
  padding: 8px 0;
}

.o-settings-group-label {
  padding: 12px 16px 4px 16px;
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--o-gray-400, #c0c4cc);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  user-select: none;
}
.o-settings-sidebar-inner > .o-settings-group-label:first-child {
  padding-top: 6px;
}

.o-settings-sidebar-item {
  display: block;
  width: 100%;
  padding: 7px 16px 7px 20px;
  font-size: var(--o-font-size-small, 13px);
  color: var(--o-gray-600, #606266);
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border: none;
  background: none;
  cursor: pointer;
  transition: background 0.1s, color 0.1s;
}
.o-settings-sidebar-item:hover {
  background: var(--o-gray-100, #f5f7fa);
  color: var(--o-gray-900, #1d1d1d);
}
.o-settings-sidebar-item.active {
  background: var(--o-brand-lighter, #FAF0EA);
  color: var(--o-brand-primary, #D97756);
  font-weight: 600;
  border-left: 3px solid var(--o-brand-primary, #D97756);
  padding-left: 17px;
}

@media (max-width: 768px) {
  .o-settings-sidebar {
    width: 220px;
  }
}

@media (max-width: 480px) {
  .o-settings-sidebar {
    position: fixed;
    width: 100%;
    height: auto;
    max-height: 50vh;
    top: var(--o-navbar-height);
    bottom: auto;
    border-right: none;
    border-bottom: 1px solid var(--o-border-color);
    z-index: 998;
  }
}
</style>
