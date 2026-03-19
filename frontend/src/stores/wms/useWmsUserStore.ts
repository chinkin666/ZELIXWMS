import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// ─── Types ───────────────────────────────────────────────────────────────────

export type UserRole = 'super_admin' | 'admin' | 'operator' | 'viewer' | 'client'

export interface WmsUser {
  readonly id: string
  readonly username: string
  readonly displayName: string
  readonly role: UserRole
  readonly parentUserId?: string
  readonly warehouseIds: string[]
  readonly clientIds: string[]
  readonly permissions: string[]
  readonly settings: Record<string, unknown>
  readonly createdAt: string
  readonly lastLoginAt?: string
}

export interface WarehouseLocation {
  readonly id: string
  readonly code: string // e.g., "A-01-02-03" (Zone-Aisle-Rack-Level)
  readonly zoneId: string
  readonly capacity: number
  readonly currentLoad: number
  readonly isActive: boolean
}

export interface WarehouseZone {
  readonly id: string
  readonly code: string
  readonly name: string
  readonly type:
    | 'receiving'
    | 'storage'
    | 'picking'
    | 'packing'
    | 'shipping'
    | 'returns'
    | 'quarantine'
  readonly locations: WarehouseLocation[]
}

export interface Warehouse {
  readonly id: string
  readonly code: string
  readonly name: string
  readonly address: string
  readonly zones: WarehouseZone[]
  readonly isActive: boolean
}

export interface Client3PL {
  readonly id: string
  readonly code: string
  readonly name: string
  readonly contactInfo: {
    readonly email: string
    readonly phone: string
    readonly address: string
  }
  readonly warehouseIds: string[]
  readonly isActive: boolean
}

// ─── Role Hierarchy ──────────────────────────────────────────────────────────

const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 4,
  admin: 3,
  operator: 2,
  viewer: 1,
  client: 0,
}

// ─── Storage Keys ────────────────────────────────────────────────────────────

const STORAGE_KEY_USER = 'wms_current_user'
const STORAGE_KEY_TOKEN = 'wms_token'
const STORAGE_KEY_WAREHOUSE = 'wms_current_warehouse_id'
const STORAGE_KEY_WAREHOUSES = 'wms_warehouses'
const STORAGE_KEY_CLIENTS = 'wms_clients'
const STORAGE_KEY_USERS = 'wms_users'

// ─── Storage Helpers ─────────────────────────────────────────────────────────

function loadJson<T>(key: string): T | null {
  const raw = localStorage.getItem(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    localStorage.removeItem(key)
    return null
  }
}

function saveJson<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useWmsUserStore = defineStore('wmsUser', () => {
  // ── State ────────────────────────────────────────────────────────────────

  const currentUser = ref<WmsUser | null>(null)
  const currentWarehouse = ref<Warehouse | null>(null)
  const warehouses = ref<Warehouse[]>([])
  const clients = ref<Client3PL[]>([])
  const users = ref<WmsUser[]>([])
  const token = ref<string | null>(null)
  const isAuthenticated = ref(false)

  // ── Computed ─────────────────────────────────────────────────────────────

  const subUsers = computed<WmsUser[]>(() => {
    if (!currentUser.value) return []
    return users.value.filter(
      (u) => u.parentUserId === currentUser.value!.id,
    )
  })

  const userPermissions = computed<string[]>(() => {
    return currentUser.value?.permissions ?? []
  })

  const isAdmin = computed(() => {
    if (!currentUser.value) return false
    return (
      currentUser.value.role === 'admin' ||
      currentUser.value.role === 'super_admin'
    )
  })

  const isSuperAdmin = computed(() => {
    return currentUser.value?.role === 'super_admin'
  })

  const accessibleWarehouses = computed(() => {
    if (!currentUser.value) return []
    if (currentUser.value.role === 'super_admin') return warehouses.value
    return warehouses.value.filter((w) =>
      currentUser.value!.warehouseIds.includes(w.id),
    )
  })

  const accessibleClients = computed(() => {
    if (!currentUser.value) return []
    if (currentUser.value.role === 'super_admin') return clients.value
    return clients.value.filter((c) =>
      currentUser.value!.clientIds.includes(c.id),
    )
  })

  // ── Helper Functions ─────────────────────────────────────────────────────

  function canAccessWarehouse(warehouseId: string): boolean {
    if (!currentUser.value) return false
    if (currentUser.value.role === 'super_admin') return true
    return currentUser.value.warehouseIds.includes(warehouseId)
  }

  function hasPermission(permission: string): boolean {
    if (!currentUser.value) return false
    if (currentUser.value.role === 'super_admin') return true
    return currentUser.value.permissions.includes(permission)
  }

  function canManageRole(targetRole: UserRole): boolean {
    if (!currentUser.value) return false
    return ROLE_HIERARCHY[currentUser.value.role] > ROLE_HIERARCHY[targetRole]
  }

  // ── Persistence ──────────────────────────────────────────────────────────

  function persistState(): void {
    if (currentUser.value) {
      saveJson(STORAGE_KEY_USER, currentUser.value)
    }
    if (currentWarehouse.value) {
      localStorage.setItem(STORAGE_KEY_WAREHOUSE, currentWarehouse.value.id)
    }
    saveJson(STORAGE_KEY_WAREHOUSES, warehouses.value)
    saveJson(STORAGE_KEY_CLIENTS, clients.value)
    saveJson(STORAGE_KEY_USERS, users.value)
  }

  function loadFromStorage(): void {
    const storedToken = localStorage.getItem(STORAGE_KEY_TOKEN)
    const storedUser = loadJson<WmsUser>(STORAGE_KEY_USER)

    if (!storedToken || !storedUser) {
      logout()
      return
    }

    currentUser.value = storedUser
    token.value = storedToken
    isAuthenticated.value = true

    warehouses.value = loadJson<Warehouse[]>(STORAGE_KEY_WAREHOUSES) ?? []
    clients.value = loadJson<Client3PL[]>(STORAGE_KEY_CLIENTS) ?? []
    users.value = loadJson<WmsUser[]>(STORAGE_KEY_USERS) ?? []

    const storedWarehouseId = localStorage.getItem(STORAGE_KEY_WAREHOUSE)
    if (storedWarehouseId) {
      const found = warehouses.value.find((w) => w.id === storedWarehouseId)
      currentWarehouse.value = found ?? null
    }
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  function login(
    username: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> {
    if (!username.trim() || !password.trim()) {
      return Promise.resolve({
        success: false,
        error: 'Username and password are required',
      })
    }

    return new Promise((resolve) => {
      setTimeout(() => {
        // Mock authentication — replace with real API call
        const mockUser: WmsUser = {
          id: `user-${Date.now()}`,
          username,
          displayName: username.charAt(0).toUpperCase() + username.slice(1),
          role: 'admin',
          warehouseIds: ['wh-001', 'wh-002'],
          clientIds: ['client-001'],
          permissions: [
            'inventory.read',
            'inventory.write',
            'order.read',
            'order.write',
            'user.manage',
            'warehouse.manage',
          ],
          settings: {},
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        }

        currentUser.value = mockUser
        token.value = `wms-token-${Date.now()}`
        isAuthenticated.value = true

        localStorage.setItem(STORAGE_KEY_TOKEN, token.value)
        persistState()

        resolve({ success: true })
      }, 600)
    })
  }

  function logout(): void {
    currentUser.value = null
    currentWarehouse.value = null
    warehouses.value = []
    clients.value = []
    users.value = []
    token.value = null
    isAuthenticated.value = false

    localStorage.removeItem(STORAGE_KEY_USER)
    localStorage.removeItem(STORAGE_KEY_TOKEN)
    localStorage.removeItem(STORAGE_KEY_WAREHOUSE)
    localStorage.removeItem(STORAGE_KEY_WAREHOUSES)
    localStorage.removeItem(STORAGE_KEY_CLIENTS)
    localStorage.removeItem(STORAGE_KEY_USERS)
  }

  function switchWarehouse(
    warehouseId: string,
  ): { success: boolean; error?: string } {
    if (!canAccessWarehouse(warehouseId)) {
      return { success: false, error: 'No access to the specified warehouse' }
    }

    const warehouse = warehouses.value.find((w) => w.id === warehouseId)
    if (!warehouse) {
      return { success: false, error: 'Warehouse not found' }
    }

    if (!warehouse.isActive) {
      return { success: false, error: 'Warehouse is not active' }
    }

    currentWarehouse.value = warehouse
    localStorage.setItem(STORAGE_KEY_WAREHOUSE, warehouseId)

    return { success: true }
  }

  function createSubUser(
    data: Pick<WmsUser, 'username' | 'displayName' | 'role' | 'permissions'> & {
      warehouseIds?: string[]
      clientIds?: string[]
    },
  ): { success: boolean; user?: WmsUser; error?: string } {
    if (!currentUser.value) {
      return { success: false, error: 'Not authenticated' }
    }

    if (!isAdmin.value) {
      return { success: false, error: 'Insufficient permissions to create users' }
    }

    if (!canManageRole(data.role)) {
      return {
        success: false,
        error: `Cannot create user with role "${data.role}" — must be lower than your own role`,
      }
    }

    const duplicate = users.value.find((u) => u.username === data.username)
    if (duplicate) {
      return { success: false, error: 'Username already exists' }
    }

    // Sub-user warehouses must be a subset of the parent's warehouses
    const assignedWarehouses = data.warehouseIds ?? []
    if (currentUser.value.role !== 'super_admin') {
      const invalidWarehouse = assignedWarehouses.find(
        (id) => !currentUser.value!.warehouseIds.includes(id),
      )
      if (invalidWarehouse) {
        return {
          success: false,
          error: `Cannot assign warehouse "${invalidWarehouse}" — not in your access list`,
        }
      }
    }

    // Sub-user clients must be a subset of the parent's clients
    const assignedClients = data.clientIds ?? []
    if (currentUser.value.role !== 'super_admin') {
      const invalidClient = assignedClients.find(
        (id) => !currentUser.value!.clientIds.includes(id),
      )
      if (invalidClient) {
        return {
          success: false,
          error: `Cannot assign client "${invalidClient}" — not in your access list`,
        }
      }
    }

    const newUser: WmsUser = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      username: data.username,
      displayName: data.displayName,
      role: data.role,
      parentUserId: currentUser.value.id,
      warehouseIds: assignedWarehouses,
      clientIds: assignedClients,
      permissions: data.permissions,
      settings: {},
      createdAt: new Date().toISOString(),
    }

    users.value = [...users.value, newUser]
    persistState()

    return { success: true, user: newUser }
  }

  function updateUserPermissions(
    userId: string,
    permissions: string[],
  ): { success: boolean; error?: string } {
    if (!currentUser.value) {
      return { success: false, error: 'Not authenticated' }
    }

    if (!isAdmin.value) {
      return { success: false, error: 'Insufficient permissions' }
    }

    const targetIndex = users.value.findIndex((u) => u.id === userId)
    if (targetIndex === -1) {
      return { success: false, error: 'User not found' }
    }

    const targetUser = users.value[targetIndex]
    if (!targetUser) {
      return { success: false, error: 'User not found' }
    }

    if (!canManageRole(targetUser.role)) {
      return {
        success: false,
        error: 'Cannot modify permissions for a user with equal or higher role',
      }
    }

    // Only allow granting permissions the current user also has (unless super_admin)
    if (currentUser.value.role !== 'super_admin') {
      const unauthorizedPerm = permissions.find(
        (p) => !currentUser.value!.permissions.includes(p),
      )
      if (unauthorizedPerm) {
        return {
          success: false,
          error: `Cannot grant permission "${unauthorizedPerm}" — you do not have it`,
        }
      }
    }

    const updatedUser: WmsUser = { ...targetUser, permissions }
    users.value = users.value.map((u) => (u.id === userId ? updatedUser : u))
    persistState()

    return { success: true }
  }

  function assignWarehouse(
    userId: string,
    warehouseId: string,
  ): { success: boolean; error?: string } {
    if (!currentUser.value) {
      return { success: false, error: 'Not authenticated' }
    }

    if (!isAdmin.value) {
      return { success: false, error: 'Insufficient permissions' }
    }

    if (!canAccessWarehouse(warehouseId)) {
      return { success: false, error: 'You do not have access to this warehouse' }
    }

    const warehouseExists = warehouses.value.some((w) => w.id === warehouseId)
    if (!warehouseExists) {
      return { success: false, error: 'Warehouse not found' }
    }

    const targetIndex = users.value.findIndex((u) => u.id === userId)
    if (targetIndex === -1) {
      return { success: false, error: 'User not found' }
    }

    const targetUser = users.value[targetIndex]
    if (!targetUser) {
      return { success: false, error: 'User not found' }
    }

    if (!canManageRole(targetUser.role)) {
      return {
        success: false,
        error: 'Cannot modify warehouse assignment for a user with equal or higher role',
      }
    }

    if (targetUser.warehouseIds.includes(warehouseId)) {
      return { success: false, error: 'User already assigned to this warehouse' }
    }

    const updatedUser: WmsUser = {
      ...targetUser,
      warehouseIds: [...targetUser.warehouseIds, warehouseId],
    }
    users.value = users.value.map((u) => (u.id === userId ? updatedUser : u))
    persistState()

    return { success: true }
  }

  function unassignWarehouse(
    userId: string,
    warehouseId: string,
  ): { success: boolean; error?: string } {
    if (!currentUser.value) {
      return { success: false, error: 'Not authenticated' }
    }

    if (!isAdmin.value) {
      return { success: false, error: 'Insufficient permissions' }
    }

    const targetIndex = users.value.findIndex((u) => u.id === userId)
    if (targetIndex === -1) {
      return { success: false, error: 'User not found' }
    }

    const targetUser = users.value[targetIndex]
    if (!targetUser) {
      return { success: false, error: 'User not found' }
    }

    if (!canManageRole(targetUser.role)) {
      return {
        success: false,
        error: 'Cannot modify warehouse assignment for a user with equal or higher role',
      }
    }

    if (!targetUser.warehouseIds.includes(warehouseId)) {
      return { success: false, error: 'User is not assigned to this warehouse' }
    }

    const updatedUser: WmsUser = {
      ...targetUser,
      warehouseIds: targetUser.warehouseIds.filter((id) => id !== warehouseId),
    }
    users.value = users.value.map((u) => (u.id === userId ? updatedUser : u))
    persistState()

    return { success: true }
  }

  function updateUserSettings(
    settings: Record<string, unknown>,
  ): { success: boolean; error?: string } {
    if (!currentUser.value) {
      return { success: false, error: 'Not authenticated' }
    }

    currentUser.value = {
      ...currentUser.value,
      settings: { ...currentUser.value.settings, ...settings },
    }
    persistState()

    return { success: true }
  }

  // ── Return ───────────────────────────────────────────────────────────────

  return {
    // State
    currentUser,
    currentWarehouse,
    warehouses,
    clients,
    users,
    token,
    isAuthenticated,

    // Computed
    subUsers,
    userPermissions,
    isAdmin,
    isSuperAdmin,
    accessibleWarehouses,
    accessibleClients,

    // Helpers
    canAccessWarehouse,
    hasPermission,
    canManageRole,

    // Actions
    login,
    logout,
    loadFromStorage,
    switchWarehouse,
    createSubUser,
    updateUserPermissions,
    assignWarehouse,
    unassignWarehouse,
    updateUserSettings,
  }
})
