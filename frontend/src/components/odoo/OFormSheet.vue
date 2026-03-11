<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from '../../composables/useI18n'

const { t } = useI18n()

// ---------- Types ----------

interface Props {
  title?: string
  hasChatter?: boolean
  stickyHeader?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  hasChatter: false,
  stickyHeader: false,
})

// ---------- Responsive ----------

const isMobile = ref(false)

function checkMobile() {
  isMobile.value = window.matchMedia('(max-width: 768px)').matches
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', checkMobile)
})

// ---------- Layout ----------

const layoutClass = computed(() => ({
  'o-form-sheet-layout': true,
  'o-form-sheet-layout--with-chatter': props.hasChatter && !isMobile.value,
  'o-form-sheet-layout--mobile': isMobile.value,
}))

const headerClass = computed(() => ({
  'o-form-sheet-header': true,
  'o-form-sheet-header--sticky': props.stickyHeader,
}))
</script>

<template>
  <div class="o-form-sheet-wrapper">
    <!-- Status bar -->
    <div v-if="$slots.statusbar" class="o-form-sheet-statusbar">
      <slot name="statusbar" />
    </div>

    <div :class="layoutClass">
      <!-- Sheet card -->
      <div class="o-form-sheet">
        <!-- Header -->
        <div :class="headerClass">
          <div class="o-form-sheet-title-row">
            <h2 v-if="title" class="o-form-sheet-title">{{ title }}</h2>
            <slot name="header" />
          </div>
          <div v-if="$slots['smart-buttons']" class="o-form-sheet-smart-buttons">
            <slot name="smart-buttons" />
          </div>
        </div>

        <!-- Main content -->
        <div class="o-form-sheet-body">
          <slot />
        </div>

        <!-- Tabs -->
        <div v-if="$slots.tabs" class="o-form-sheet-tabs">
          <slot name="tabs" />
        </div>
      </div>

      <!-- Chatter (sidebar on desktop, below on mobile) -->
      <aside
        v-if="hasChatter && $slots.chatter"
        class="o-form-sheet-chatter"
        :class="{ 'o-form-sheet-chatter--mobile': isMobile }"
      >
        <slot name="chatter" />
      </aside>
    </div>
  </div>
</template>

<style scoped>
.o-form-sheet-wrapper {
  width: 100%;
  min-height: 100%;
  background: var(--o-webclient-bg, #f0f0f0);
  padding-bottom: 2rem;
}

.o-form-sheet-statusbar {
  background: var(--o-view-background, #fff);
  border-bottom: 1px solid var(--o-border-color, #dee2e6);
  padding: 0.5rem 1rem;
}

.o-form-sheet-layout {
  display: flex;
  flex-direction: column;
  max-width: 1140px;
  margin: 0 auto;
  padding: 1rem;
  gap: 1rem;
}

.o-form-sheet-layout--with-chatter {
  flex-direction: row;
  max-width: 100%;
  padding: 1rem 1.5rem;
}

.o-form-sheet-layout--mobile {
  padding: 0.5rem;
}

.o-form-sheet {
  flex: 1;
  min-width: 0;
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-border-color, #dee2e6);
  border-radius: var(--o-border-radius-lg, 8px);
  box-shadow: var(--o-shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.08));
  overflow: hidden;
}

.o-form-sheet-layout--with-chatter .o-form-sheet {
  max-width: 1140px;
}

.o-form-sheet-header {
  padding: 1rem 1.5rem 0.75rem;
  border-bottom: 1px solid var(--o-border-color, #dee2e6);
  background: var(--o-view-background, #fff);
}

.o-form-sheet-header--sticky {
  position: sticky;
  top: 0;
  z-index: 10;
}

.o-form-sheet-title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.o-form-sheet-title {
  margin: 0;
  font-size: 1.375rem;
  font-weight: 700;
  color: var(--o-gray-900, #212529);
  line-height: 1.3;
}

.o-form-sheet-smart-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-top: 0.5rem;
}

.o-form-sheet-body {
  padding: 1.25rem 1.5rem;
}

.o-form-sheet-tabs {
  padding: 0 1.5rem 1.25rem;
}

/* ---------- Chatter ---------- */

.o-form-sheet-chatter {
  width: 340px;
  flex-shrink: 0;
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-border-color, #dee2e6);
  border-radius: var(--o-border-radius-lg, 8px);
  box-shadow: var(--o-shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.08));
  padding: 1rem;
  max-height: calc(100vh - 140px);
  overflow-y: auto;
  align-self: flex-start;
  position: sticky;
  top: 1rem;
}

.o-form-sheet-chatter--mobile {
  width: 100%;
  position: static;
  max-height: none;
}

/* ---------- Responsive ---------- */

@media (max-width: 768px) {
  .o-form-sheet-header {
    padding: 0.75rem 1rem 0.5rem;
  }

  .o-form-sheet-body {
    padding: 1rem;
  }

  .o-form-sheet-tabs {
    padding: 0 1rem 1rem;
  }

  .o-form-sheet-title {
    font-size: 1.125rem;
  }
}

/* ---------- Dark theme ---------- */

[data-theme="dark"] .o-form-sheet-wrapper {
  background: var(--o-gray-100, #1a1a2e);
}

[data-theme="dark"] .o-form-sheet {
  background: var(--o-gray-200);
  border-color: var(--o-gray-300);
}

[data-theme="dark"] .o-form-sheet-header {
  background: var(--o-gray-200);
  border-color: var(--o-gray-300);
}

[data-theme="dark"] .o-form-sheet-statusbar {
  background: var(--o-gray-200);
  border-color: var(--o-gray-300);
}

[data-theme="dark"] .o-form-sheet-chatter {
  background: var(--o-gray-200);
  border-color: var(--o-gray-300);
}

[data-theme="dark"] .o-form-sheet-title {
  color: var(--o-gray-900);
}
</style>
