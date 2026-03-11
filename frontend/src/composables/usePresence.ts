import { ref, computed, onMounted, onUnmounted } from 'vue'

export type PresenceStatus = 'online' | 'idle' | 'away'

export interface PresenceUser {
  readonly id: number
  readonly name: string
  readonly initials: string
  readonly color: string
  readonly currentPage: string
  readonly status: PresenceStatus
  readonly since: number
}

const AVATAR_COLORS = [
  '#714B67',
  '#017E84',
  '#E07C24',
  '#2196F3',
  '#875A7B',
  '#00A09D',
] as const

const PAGES = ['/contacts', '/crm', '/projects', '/orders', '/invoices', '/inventory', '/settings'] as const
const STATUSES: readonly PresenceStatus[] = ['online', 'idle', 'away']

function createInitialUsers(): readonly PresenceUser[] {
  return [
    { id: 1, name: 'Admin User', initials: 'AU', color: AVATAR_COLORS[0], currentPage: '', status: 'online', since: Date.now() - 1200_000 },
    { id: 2, name: 'Marc Demo', initials: 'MD', color: AVATAR_COLORS[1], currentPage: '', status: 'online', since: Date.now() - 600_000 },
    { id: 3, name: 'Joel Willis', initials: 'JW', color: AVATAR_COLORS[2], currentPage: '/orders', status: 'online', since: Date.now() - 900_000 },
    { id: 4, name: 'Sarah Chen', initials: 'SC', color: AVATAR_COLORS[3], currentPage: '/projects', status: 'online', since: Date.now() - 300_000 },
    { id: 5, name: 'Lisa Park', initials: 'LP', color: AVATAR_COLORS[4], currentPage: '/crm', status: 'idle', since: Date.now() - 1800_000 },
    { id: 6, name: 'Alex Kim', initials: 'AK', color: AVATAR_COLORS[5], currentPage: '/invoices', status: 'online', since: Date.now() - 450_000 },
  ]
}

const users = ref<readonly PresenceUser[]>(createInitialUsers())

let intervalId: ReturnType<typeof setInterval> | null = null
let subscriberCount = 0

function startSimulation() {
  if (intervalId !== null) return
  intervalId = setInterval(() => {
    const idx = Math.floor(Math.random() * users.value.length)
    const user = users.value[idx]
    if (!user) return
    const changeType = Math.random()

    const updatedUser: PresenceUser = changeType < 0.5
      ? { ...user, currentPage: PAGES[Math.floor(Math.random() * PAGES.length)] as string }
      : { ...user, status: STATUSES[Math.floor(Math.random() * STATUSES.length)] as PresenceStatus }

    users.value = users.value.map((u, i) => (i === idx ? updatedUser : u))
  }, 10_000)
}

function stopSimulation() {
  if (intervalId !== null) {
    clearInterval(intervalId)
    intervalId = null
  }
}

export function usePresence(currentPage = '') {
  onMounted(() => {
    subscriberCount++
    // Mark current page users
    if (currentPage) {
      users.value = users.value.map(u =>
        u.currentPage === '' ? { ...u, currentPage } : u
      )
    }
    startSimulation()
  })

  onUnmounted(() => {
    subscriberCount--
    if (subscriberCount <= 0) {
      stopSimulation()
      subscriberCount = 0
    }
  })

  const viewingThisPage = computed(() =>
    users.value.filter(u => u.currentPage === '' || u.currentPage === currentPage)
  )

  const viewingOtherPages = computed(() =>
    users.value.filter(u => u.currentPage !== '' && u.currentPage !== currentPage)
  )

  const editingWarning = computed(() => {
    const editors = viewingThisPage.value.filter(u => u.id !== 1 && u.status === 'online')
    if (editors.length === 0) return null
    if (editors.length === 1) return `${editors[0]!.name} is also editing this record`
    return `${editors[0]!.name} and ${editors.length - 1} other(s) are also editing this record`
  })

  function formatDuration(since: number): string {
    const minutes = Math.floor((Date.now() - since) / 60_000)
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h`
    return `${Math.floor(hours / 24)}d`
  }

  return {
    users,
    viewingThisPage,
    viewingOtherPages,
    editingWarning,
    formatDuration,
  }
}
