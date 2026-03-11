<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { usePresence, type PresenceUser, type PresenceStatus } from '../../composables/usePresence'

const {
  users,
  viewingThisPage,
  viewingOtherPages,
  editingWarning,
  formatDuration,
} = usePresence('')

const isExpanded = ref(false)
const MAX_VISIBLE = 4

const visibleAvatars = computed(() => users.value.slice(0, MAX_VISIBLE))
const overflowCount = computed(() => Math.max(0, users.value.length - MAX_VISIBLE))

const statusColors: Record<PresenceStatus, string> = {
  online: '#28a745',
  idle: '#ffc107',
  away: '#adb5bd',
}

const statusLabels: Record<PresenceStatus, string> = {
  online: 'Online',
  idle: 'Idle',
  away: 'Away',
}

function togglePanel() {
  isExpanded.value = !isExpanded.value
}

function handleClickOutside(event: MouseEvent) {
  const el = (event.target as HTMLElement).closest('.o-presence')
  if (!el) {
    isExpanded.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside, true)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside, true)
})
</script>

<template>
  <div class="o-presence">
    <!-- Collapsed: avatar stack -->
    <div class="o-presence-stack" @click="togglePanel">
      <div
        v-for="(user, i) in visibleAvatars"
        :key="user.id"
        class="o-presence-avatar"
        :style="{
          backgroundColor: user.color,
          zIndex: MAX_VISIBLE - i,
          marginLeft: i > 0 ? '-8px' : '0',
        }"
        :title="user.name"
      >
        {{ user.initials }}
        <span
          class="o-presence-status-dot"
          :style="{ backgroundColor: statusColors[user.status] }"
          :class="{ 'o-presence-pulse': user.status === 'online' }"
        ></span>
      </div>
      <div
        v-if="overflowCount > 0"
        class="o-presence-avatar o-presence-overflow"
        :style="{ marginLeft: '-8px', zIndex: 0 }"
      >
        +{{ overflowCount }}
      </div>
    </div>

    <!-- Expanded panel -->
    <Transition name="o-presence-panel">
      <div v-if="isExpanded" class="o-presence-panel">
        <div class="o-presence-panel-header">
          <span class="o-presence-panel-title">Currently viewing</span>
          <span class="o-presence-panel-count">{{ users.length }} online</span>
        </div>

        <!-- Viewing this page -->
        <div v-if="viewingThisPage.length > 0" class="o-presence-group">
          <div class="o-presence-group-label">Viewing this page</div>
          <div
            v-for="user in viewingThisPage"
            :key="user.id"
            class="o-presence-user-row"
          >
            <div
              class="o-presence-row-avatar"
              :style="{ backgroundColor: user.color }"
            >
              {{ user.initials }}
              <span
                class="o-presence-status-dot"
                :style="{ backgroundColor: statusColors[user.status] }"
                :class="{ 'o-presence-pulse': user.status === 'online' }"
              ></span>
            </div>
            <div class="o-presence-row-info">
              <span class="o-presence-row-name">{{ user.name }}</span>
              <span class="o-presence-row-meta">
                <span
                  class="o-presence-status-label"
                  :style="{ color: statusColors[user.status] }"
                >{{ statusLabels[user.status] }}</span>
                &middot; {{ formatDuration(user.since) }}
              </span>
            </div>
          </div>
        </div>

        <!-- On other pages -->
        <div v-if="viewingOtherPages.length > 0" class="o-presence-group">
          <div class="o-presence-group-label">On other pages</div>
          <div
            v-for="user in viewingOtherPages"
            :key="user.id"
            class="o-presence-user-row"
          >
            <div
              class="o-presence-row-avatar"
              :style="{ backgroundColor: user.color }"
            >
              {{ user.initials }}
              <span
                class="o-presence-status-dot"
                :style="{ backgroundColor: statusColors[user.status] }"
                :class="{ 'o-presence-pulse': user.status === 'online' }"
              ></span>
            </div>
            <div class="o-presence-row-info">
              <span class="o-presence-row-name">{{ user.name }}</span>
              <span class="o-presence-row-meta">
                {{ user.currentPage }}
                &middot;
                <span
                  class="o-presence-status-label"
                  :style="{ color: statusColors[user.status] }"
                >{{ statusLabels[user.status] }}</span>
                &middot; {{ formatDuration(user.since) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Editing warning bar -->
    <Transition name="o-presence-warning">
      <div v-if="editingWarning" class="o-presence-warning">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
        </svg>
        <span>{{ editingWarning }}</span>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* ===== Presence Container ===== */
.o-presence {
  position: relative;
  display: flex;
  align-items: center;
}

/* ===== Avatar Stack ===== */
.o-presence-stack {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 0.125rem 0;
}

.o-presence-avatar {
  width: 24px;
  height: 24px;
  min-width: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.5625rem;
  font-weight: 700;
  color: #fff;
  border: 2px solid var(--o-view-background, #fff);
  position: relative;
  transition: transform 0.15s ease;
  user-select: none;
}

.o-presence-stack:hover .o-presence-avatar {
  transform: translateY(-1px);
}

.o-presence-overflow {
  background: var(--o-gray-400);
  font-size: 0.5rem;
  font-weight: 600;
}

/* ===== Status Dot ===== */
.o-presence-status-dot {
  position: absolute;
  bottom: -1px;
  right: -1px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 1.5px solid var(--o-view-background, #fff);
}

.o-presence-pulse {
  animation: o-pulse 2s infinite;
}

@keyframes o-pulse {
  0% { box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.4); }
  70% { box-shadow: 0 0 0 4px rgba(40, 167, 69, 0); }
  100% { box-shadow: 0 0 0 0 rgba(40, 167, 69, 0); }
}

/* ===== Expanded Panel ===== */
.o-presence-panel {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  width: 300px;
  background: var(--o-view-background);
  border: 1px solid var(--o-border-color);
  border-radius: var(--o-border-radius-lg, 8px);
  box-shadow: var(--o-shadow-lg, 0 10px 25px rgba(0,0,0,0.12));
  z-index: 1050;
  overflow: hidden;
}

.o-presence-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 0.875rem 0.5rem;
  border-bottom: 1px solid var(--o-border-color);
}

.o-presence-panel-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--o-gray-900);
}

.o-presence-panel-count {
  font-size: 0.6875rem;
  color: var(--o-gray-500);
  font-weight: 500;
}

/* ===== Groups ===== */
.o-presence-group {
  padding: 0.375rem 0;
}

.o-presence-group + .o-presence-group {
  border-top: 1px solid var(--o-border-color);
}

.o-presence-group-label {
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--o-gray-400);
  padding: 0.375rem 0.875rem 0.25rem;
}

/* ===== User Rows ===== */
.o-presence-user-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.875rem;
  transition: background 0.15s;
}

.o-presence-user-row:hover {
  background: var(--o-gray-50, #f9fafb);
}

.o-presence-row-avatar {
  width: 28px;
  height: 28px;
  min-width: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.625rem;
  font-weight: 700;
  color: #fff;
  position: relative;
  flex-shrink: 0;
}

.o-presence-row-avatar .o-presence-status-dot {
  width: 9px;
  height: 9px;
  bottom: -1px;
  right: -1px;
}

.o-presence-row-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.o-presence-row-name {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--o-gray-900);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.o-presence-row-meta {
  font-size: 0.6875rem;
  color: var(--o-gray-500);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.o-presence-status-label {
  font-weight: 500;
}

/* ===== Warning Bar ===== */
.o-presence-warning {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  background: #fff3cd;
  color: #856404;
  border: 1px solid #ffc107;
  border-radius: var(--o-border-radius, 4px);
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  box-shadow: var(--o-shadow-sm, 0 1px 3px rgba(0,0,0,0.08));
  z-index: 1049;
}

/* ===== Transitions ===== */
.o-presence-panel-enter-active,
.o-presence-panel-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.o-presence-panel-enter-from,
.o-presence-panel-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.o-presence-warning-enter-active,
.o-presence-warning-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.o-presence-warning-enter-from,
.o-presence-warning-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* ===== Dark Mode ===== */
:root[data-theme="dark"] .o-presence-avatar,
.dark .o-presence-avatar {
  border-color: var(--o-gray-800, #343a40);
}
:root[data-theme="dark"] .o-presence-status-dot,
.dark .o-presence-status-dot {
  border-color: var(--o-gray-800, #343a40);
}
:root[data-theme="dark"] .o-presence-warning,
.dark .o-presence-warning {
  background: rgba(255, 193, 7, 0.15);
  color: #ffc107;
  border-color: rgba(255, 193, 7, 0.3);
}
</style>
