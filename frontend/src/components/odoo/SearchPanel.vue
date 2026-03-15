<script setup lang="ts">
import { ref, computed } from 'vue'
import OButton from './OButton.vue'

interface FilterOption {
  key: string
  label: string
  values?: string[]
}

interface GroupByOption {
  key: string
  label: string
}

interface Props {
  filters?: FilterOption[]
  groupByOptions?: GroupByOption[]
  showFavorites?: boolean
}

withDefaults(defineProps<Props>(), {
  showFavorites: true,
})

const emit = defineEmits<{
  'apply-filter': [key: string, value: string]
  'remove-filter': [key: string]
  'group-by': [key: string]
  'save-favorite': [name: string]
}>()

const activeTab = ref<'filters' | 'groupby' | 'favorites'>('filters')
const activeFilters = ref<Record<string, string>>({})
const groupBy = ref('')
const favoriteName = ref('')

const savedFavorites = ref<{ name: string; filters: Record<string, string> }[]>([
  { name: 'My Orders', filters: { status: 'Paid' } },
  { name: 'Pending Review', filters: { status: 'Pending' } },
])

function toggleFilter(key: string, value: string) {
  if (activeFilters.value[key] === value) {
    const next = { ...activeFilters.value }
    delete next[key]
    activeFilters.value = next
    emit('remove-filter', key)
  } else {
    activeFilters.value = { ...activeFilters.value, [key]: value }
    emit('apply-filter', key, value)
  }
}

function setGroupBy(key: string) {
  groupBy.value = groupBy.value === key ? '' : key
  emit('group-by', groupBy.value)
}

function saveFavorite() {
  if (!favoriteName.value.trim()) return
  savedFavorites.value = [...savedFavorites.value, { name: favoriteName.value, filters: { ...activeFilters.value } }]
  emit('save-favorite', favoriteName.value)
  favoriteName.value = ''
}

const activeFilterCount = computed(() => Object.keys(activeFilters.value).length)
</script>

<template>
  <div class="o-search-panel">
    <!-- Tabs -->
    <div class="o-sp-tabs">
      <button
        class="o-sp-tab"
        :class="{ active: activeTab === 'filters' }"
        @click="activeTab = 'filters'"
      >
        Filters
        <span v-if="activeFilterCount" class="o-sp-badge">{{ activeFilterCount }}</span>
      </button>
      <button
        class="o-sp-tab"
        :class="{ active: activeTab === 'groupby' }"
        @click="activeTab = 'groupby'"
      >
        Group By
        <span v-if="groupBy" class="o-sp-badge">1</span>
      </button>
      <button
        v-if="showFavorites"
        class="o-sp-tab"
        :class="{ active: activeTab === 'favorites' }"
        @click="activeTab = 'favorites'"
      >
        Favorites
      </button>
    </div>

    <!-- Filters panel -->
    <div v-if="activeTab === 'filters'" class="o-sp-body">
      <div v-for="filter in filters" :key="filter.key" class="o-sp-section">
        <div class="o-sp-section-title">{{ filter.label }}</div>
        <div v-if="filter.values" class="o-sp-options">
          <label
            v-for="val in filter.values"
            :key="val"
            class="o-sp-option"
            :class="{ active: activeFilters[filter.key] === val }"
            @click="toggleFilter(filter.key, val)"
          >
            <span class="o-sp-check">{{ activeFilters[filter.key] === val ? '✓' : '' }}</span>
            <span>{{ val }}</span>
          </label>
        </div>
      </div>
      <div v-if="!filters?.length" class="o-sp-empty">No filters available</div>
    </div>

    <!-- Group By panel -->
    <div v-if="activeTab === 'groupby'" class="o-sp-body">
      <label
        v-for="opt in groupByOptions"
        :key="opt.key"
        class="o-sp-option"
        :class="{ active: groupBy === opt.key }"
        @click="setGroupBy(opt.key)"
      >
        <span class="o-sp-check">{{ groupBy === opt.key ? '✓' : '' }}</span>
        <span>{{ opt.label }}</span>
      </label>
      <div v-if="!groupByOptions?.length" class="o-sp-empty">No group options</div>
    </div>

    <!-- Favorites panel -->
    <div v-if="activeTab === 'favorites'" class="o-sp-body">
      <div v-for="fav in savedFavorites" :key="fav.name" class="o-sp-favorite">
        <span class="o-sp-fav-icon">★</span>
        <span>{{ fav.name }}</span>
      </div>
      <div class="o-sp-fav-add">
        <input
          v-model="favoriteName"
          type="text"
          placeholder="Save current search..."
          class="o-sp-fav-input"
          @keydown.enter="saveFavorite"
        />
        <OButton variant="primary" size="sm" @click="saveFavorite">Save</OButton>
      </div>
    </div>

    <!-- Active filter tags -->
    <div v-if="activeFilterCount > 0 || groupBy" class="o-sp-active">
      <span
        v-for="(val, key) in activeFilters"
        :key="key"
        class="o-sp-tag"
      >
        {{ key }}: {{ val }}
        <button class="o-sp-tag-remove" @click="toggleFilter(String(key), val)">&times;</button>
      </span>
      <span v-if="groupBy" class="o-sp-tag o-sp-tag--group">
        Group: {{ groupByOptions?.find(o => o.key === groupBy)?.label }}
        <button class="o-sp-tag-remove" @click="setGroupBy(groupBy)">&times;</button>
      </span>
    </div>
  </div>
</template>

<style scoped>
.o-search-panel {
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-border-color, #dee2e6);
  border-radius: var(--o-border-radius, 4px);
  margin-bottom: 1rem;
  overflow: hidden;
}

.o-sp-tabs {
  display: flex;
  border-bottom: 1px solid var(--o-border-color, #dee2e6);
  background: var(--o-gray-100, #f8f9fa);
}
.o-sp-tab {
  padding: 0.5rem 1rem;
  font-size: var(--o-font-size-small, 0.8125rem);
  font-weight: 500;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--o-gray-600, #6c757d);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.375rem;
}
.o-sp-tab:hover { color: var(--o-gray-900, #212529); }
.o-sp-tab.active {
  color: var(--o-brand-primary, #0052A3);
  border-bottom-color: var(--o-brand-primary, #0052A3);
}
.o-sp-badge {
  background: var(--o-brand-primary, #0052A3);
  color: #fff;
  font-size: 0.625rem;
  padding: 0.0625rem 0.375rem;
  border-radius: 10rem;
}

.o-sp-body {
  padding: 0.75rem 1rem;
}

.o-sp-section { margin-bottom: 0.75rem; }
.o-sp-section:last-child { margin-bottom: 0; }
.o-sp-section-title {
  font-size: var(--o-font-size-smaller, 0.75rem);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--o-gray-500, #adb5bd);
  margin-bottom: 0.375rem;
}

.o-sp-options {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}
.o-sp-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3125rem 0.5rem;
  font-size: var(--o-font-size-base, 0.875rem);
  border-radius: var(--o-border-radius-sm, 2px);
  cursor: pointer;
  transition: background 0.1s;
}
.o-sp-option:hover { background: var(--o-gray-100, #f8f9fa); }
.o-sp-option.active { background: var(--o-brand-light); color: var(--o-brand-primary, #0052A3); font-weight: 500; }

.o-sp-check {
  width: 1rem;
  text-align: center;
  font-size: 0.75rem;
  color: var(--o-brand-primary, #0052A3);
}

.o-sp-empty {
  font-size: var(--o-font-size-small, 0.8125rem);
  color: var(--o-gray-500, #adb5bd);
  padding: 0.5rem 0;
}

.o-sp-favorite {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.5rem;
  font-size: var(--o-font-size-base, 0.875rem);
  cursor: pointer;
  border-radius: var(--o-border-radius-sm, 2px);
}
.o-sp-favorite:hover { background: var(--o-gray-100, #f8f9fa); }
.o-sp-fav-icon { color: #f0ad4e; }

.o-sp-fav-add {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--o-gray-200, #e9ecef);
}
.o-sp-fav-input {
  flex: 1;
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--o-border-color, #dee2e6);
  border-radius: var(--o-border-radius-sm, 2px);
  font-size: var(--o-font-size-small, 0.8125rem);
}
.o-btn-sm { padding: 0.25rem 0.625rem; font-size: var(--o-font-size-smaller, 0.75rem); }

.o-sp-active {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  padding: 0.5rem 1rem;
  border-top: 1px solid var(--o-gray-200, #e9ecef);
  background: var(--o-gray-100, #f8f9fa);
}
.o-sp-tag {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.1875rem 0.5rem;
  background: var(--o-brand-primary, #0052A3);
  color: #fff;
  font-size: var(--o-font-size-smaller, 0.75rem);
  border-radius: 10rem;
}
.o-sp-tag--group {
  background: var(--o-info, #17a2b8);
}
.o-sp-tag-remove {
  background: none;
  border: none;
  color: #fff;
  font-size: 0.875rem;
  padding: 0;
  cursor: pointer;
  line-height: 1;
  opacity: 0.7;
}
.o-sp-tag-remove:hover { opacity: 1; }
</style>
