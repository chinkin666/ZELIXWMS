import { ref, watch, type Ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'

export interface Tab {
  readonly id: string
  readonly title: string
  readonly icon: string
  readonly path: string
  readonly pinned: boolean
  readonly active: boolean
}

const MAX_TABS = 10
const STORAGE_KEY = 'o-tab-manager'

const tabs: Ref<readonly Tab[]> = ref(loadTabs())
const activeTabId = ref<string>(loadActiveTabId())

function generateId(): string {
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function loadTabs(): readonly Tab[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as Tab[]
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch {
    // Ignore corrupt storage
  }
  return []
}

function loadActiveTabId(): string {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}-active`)
    if (stored) return stored
  } catch {
    // Ignore
  }
  return ''
}

function persistTabs(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs.value))
    localStorage.setItem(`${STORAGE_KEY}-active`, activeTabId.value)
  } catch {
    // Storage full or unavailable
  }
}

function findTabByPath(path: string): Tab | undefined {
  return tabs.value.find(t => t.path === path)
}

function openTab(path: string, title: string, icon: string = ''): void {
  const existing = findTabByPath(path)
  if (existing) {
    setActiveTab(existing.id)
    return
  }

  const newTab: Tab = {
    id: generateId(),
    title,
    icon,
    path,
    pinned: false,
    active: true,
  }

  let updatedTabs = tabs.value.map(t => ({ ...t, active: false }))

  if (updatedTabs.length >= MAX_TABS) {
    const oldestUnpinnedIndex = updatedTabs.findIndex(t => !t.pinned)
    if (oldestUnpinnedIndex !== -1) {
      updatedTabs = [
        ...updatedTabs.slice(0, oldestUnpinnedIndex),
        ...updatedTabs.slice(oldestUnpinnedIndex + 1),
      ]
    } else {
      // All pinned, replace last
      updatedTabs = updatedTabs.slice(0, -1)
    }
  }

  tabs.value = [...updatedTabs, newTab]
  activeTabId.value = newTab.id
  persistTabs()
}

function closeTab(id: string): void {
  const tabIndex = tabs.value.findIndex(t => t.id === id)
  if (tabIndex === -1) return

  const tab = tabs.value[tabIndex]
  if (!tab || tab.pinned) return

  const remaining = tabs.value.filter(t => t.id !== id)

  if (tab.active && remaining.length > 0) {
    // Activate the nearest tab
    const nextIndex = Math.min(tabIndex, remaining.length - 1)
    const updatedRemaining = remaining.map((t, i) => ({
      ...t,
      active: i === nextIndex,
    }))
    tabs.value = updatedRemaining
    const newActive = updatedRemaining[nextIndex]
    activeTabId.value = newActive?.id ?? ''
    persistTabs()
    return
  }

  tabs.value = remaining
  if (remaining.length === 0) {
    activeTabId.value = ''
  }
  persistTabs()
}

function closeOtherTabs(id: string): void {
  const kept = tabs.value.filter(t => t.id === id || t.pinned)
  tabs.value = kept.map(t => ({
    ...t,
    active: t.id === id,
  }))
  activeTabId.value = id
  persistTabs()
}

function closeAllTabs(): void {
  const pinned = tabs.value.filter(t => t.pinned)
  if (pinned.length > 0) {
    tabs.value = pinned.map((t, i) => ({
      ...t,
      active: i === 0,
    }))
    activeTabId.value = pinned[0]?.id ?? ''
  } else {
    tabs.value = []
    activeTabId.value = ''
  }
  persistTabs()
}

function pinTab(id: string): void {
  tabs.value = tabs.value.map(t =>
    t.id === id ? { ...t, pinned: !t.pinned } : t
  )
  persistTabs()
}

function setActiveTab(id: string): void {
  tabs.value = tabs.value.map(t => ({
    ...t,
    active: t.id === id,
  }))
  activeTabId.value = id
  persistTabs()
}

function renameTab(id: string, title: string): void {
  tabs.value = tabs.value.map(t =>
    t.id === id ? { ...t, title } : t
  )
  persistTabs()
}

function getActiveTab(): Tab | undefined {
  return tabs.value.find(t => t.active)
}

export function useTabManager() {
  const router = useRouter()
  const route = useRoute()

  // Sync route changes to tabs
  watch(
    () => route.path,
    (newPath) => {
      const existing = findTabByPath(newPath)
      if (existing) {
        setActiveTab(existing.id)
      } else {
        const routeName = route.name
        const title = routeName
          ? String(routeName).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
          : newPath
        openTab(newPath, title)
      }
    },
    { immediate: true }
  )

  function navigateToTab(id: string): void {
    const tab = tabs.value.find(t => t.id === id)
    if (tab) {
      setActiveTab(id)
      router.push(tab.path)
    }
  }

  function handleCloseTab(id: string): void {
    const wasActive = tabs.value.find(t => t.id === id)?.active
    closeTab(id)
    if (wasActive) {
      const active = getActiveTab()
      if (active) {
        router.push(active.path)
      } else {
        router.push('/')
      }
    }
  }

  function handleCloseOtherTabs(id: string): void {
    closeOtherTabs(id)
    const tab = tabs.value.find(t => t.id === id)
    if (tab) {
      router.push(tab.path)
    }
  }

  function handleCloseAllTabs(): void {
    closeAllTabs()
    const active = getActiveTab()
    if (active) {
      router.push(active.path)
    } else {
      router.push('/')
    }
  }

  function handleNewTab(): void {
    router.push('/')
  }

  return {
    tabs,
    activeTabId,
    openTab,
    closeTab: handleCloseTab,
    closeOtherTabs: handleCloseOtherTabs,
    closeAllTabs: handleCloseAllTabs,
    pinTab,
    setActiveTab,
    renameTab,
    navigateToTab,
    newTab: handleNewTab,
  }
}
