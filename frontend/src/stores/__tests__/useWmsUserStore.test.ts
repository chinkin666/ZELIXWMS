/**
 * WMS ユーザーストア ユニットテスト / WMS 用户 Store 单元测试
 *
 * 認証、権限管理、倉庫切替、サブユーザー作成を検証する。
 * 验证认证、权限管理、仓库切换、子用户创建。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWmsUserStore } from '@/stores/wms/useWmsUserStore'
import type { WmsUser, Warehouse } from '@/stores/wms/useWmsUserStore'

// ─── テスト用ヘルパー / 测试辅助 ─────────────────────────────────────────────

/**
 * テスト用のモック管理者ユーザーを作成する / 创建测试用的模拟管理员用户
 */
function makeMockAdmin(overrides: Partial<WmsUser> = {}): WmsUser {
  return {
    id: 'admin-001',
    username: 'admin',
    displayName: 'Admin User',
    role: 'admin',
    warehouseIds: ['wh-001', 'wh-002'],
    clientIds: ['client-001'],
    permissions: ['inventory.read', 'inventory.write', 'order.read', 'order.write'],
    settings: {},
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

/**
 * テスト用のモック倉庫を作成する / 创建测试用的模拟仓库
 */
function makeMockWarehouse(overrides: Partial<Warehouse> = {}): Warehouse {
  return {
    id: 'wh-001',
    code: 'WH001',
    name: 'Main Warehouse',
    address: 'Tokyo',
    zones: [],
    isActive: true,
    ...overrides,
  }
}

// ─── セットアップ / 设置 ──────────────────────────────────────────────────────

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

// ─── loadFromStorage / localStorage から読込 ────────────────────────────────

describe('loadFromStorage / localStorage から読込', () => {
  it('トークンとユーザーが存在する場合、認証状態を復元する / token 和 user 存在时恢复认证状态', () => {
    const mockUser = makeMockAdmin()
    localStorage.setItem('wms_token', 'saved-token')
    localStorage.setItem('wms_current_user', JSON.stringify(mockUser))

    const store = useWmsUserStore()
    store.loadFromStorage()

    expect(store.isAuthenticated).toBe(true)
    expect(store.token).toBe('saved-token')
    expect(store.currentUser?.username).toBe('admin')
  })

  it('トークンがない場合、ログアウト状態になる / 没有 token 时变为登出状态', () => {
    localStorage.setItem('wms_current_user', JSON.stringify(makeMockAdmin()))
    // トークンなし / 无 token

    const store = useWmsUserStore()
    store.loadFromStorage()

    expect(store.isAuthenticated).toBe(false)
    expect(store.token).toBeNull()
    expect(store.currentUser).toBeNull()
  })

  it('ユーザーがない場合、ログアウト状態になる / 没有 user 时变为登出状态', () => {
    localStorage.setItem('wms_token', 'orphan-token')
    // ユーザーなし / 无 user

    const store = useWmsUserStore()
    store.loadFromStorage()

    expect(store.isAuthenticated).toBe(false)
    expect(store.currentUser).toBeNull()
  })

  it('倉庫一覧も復元する / 也恢复仓库列表', () => {
    const mockUser = makeMockAdmin()
    const warehouses = [makeMockWarehouse(), makeMockWarehouse({ id: 'wh-002', code: 'WH002', name: 'Sub Warehouse' })]

    localStorage.setItem('wms_token', 'token')
    localStorage.setItem('wms_current_user', JSON.stringify(mockUser))
    localStorage.setItem('wms_warehouses', JSON.stringify(warehouses))

    const store = useWmsUserStore()
    store.loadFromStorage()

    expect(store.warehouses).toHaveLength(2)
  })

  it('破損した JSON は無視して空にする / 忽略损坏的 JSON 并置空', () => {
    localStorage.setItem('wms_token', 'token')
    localStorage.setItem('wms_current_user', 'not-valid-json')

    const store = useWmsUserStore()
    store.loadFromStorage()

    expect(store.isAuthenticated).toBe(false)
    expect(store.currentUser).toBeNull()
  })
})

// ─── login / ログイン ─────────────────────────────────────────────────────────

describe('login / ログイン', () => {
  it('成功時に認証状態をセットする / 成功时设置认证状态', async () => {
    vi.useFakeTimers()
    const store = useWmsUserStore()

    const promise = store.login('testuser', 'password123')
    vi.advanceTimersByTime(700) // モックの setTimeout(600) を進める / 推进 mock 的 setTimeout(600)

    const result = await promise

    expect(result.success).toBe(true)
    expect(store.isAuthenticated).toBe(true)
    expect(store.token).toBeTruthy()
    expect(store.currentUser?.username).toBe('testuser')

    vi.useRealTimers()
  })

  it('空のユーザー名でエラーを返す / 空用户名时返回错误', async () => {
    const store = useWmsUserStore()
    const result = await store.login('', 'password')

    expect(result.success).toBe(false)
    expect(result.error).toContain('required')
    expect(store.isAuthenticated).toBe(false)
  })

  it('空のパスワードでエラーを返す / 空密码时返回错误', async () => {
    const store = useWmsUserStore()
    const result = await store.login('user', '   ')

    expect(result.success).toBe(false)
    expect(result.error).toContain('required')
  })

  it('ログイン成功後 localStorage にトークンを保存する / 登录成功后在 localStorage 保存 token', async () => {
    vi.useFakeTimers()
    const store = useWmsUserStore()

    const promise = store.login('user', 'pass')
    vi.advanceTimersByTime(700)
    await promise

    expect(localStorage.getItem('wms_token')).toBeTruthy()
    expect(localStorage.getItem('wms_current_user')).toBeTruthy()

    vi.useRealTimers()
  })
})

// ─── logout / ログアウト ──────────────────────────────────────────────────────

describe('logout / ログアウト', () => {
  it('全ての状態をクリアする / 清除所有状态', () => {
    const store = useWmsUserStore()

    // まず状態をセット / 先设置状态
    store.currentUser = makeMockAdmin() as any
    store.token = 'some-token'
    store.isAuthenticated = true
    store.warehouses = [makeMockWarehouse()] as any
    localStorage.setItem('wms_token', 'some-token')
    localStorage.setItem('wms_current_user', '{}')

    store.logout()

    expect(store.currentUser).toBeNull()
    expect(store.token).toBeNull()
    expect(store.isAuthenticated).toBe(false)
    expect(store.warehouses).toHaveLength(0)
    expect(store.clients).toHaveLength(0)
    expect(store.users).toHaveLength(0)
    expect(localStorage.getItem('wms_token')).toBeNull()
    expect(localStorage.getItem('wms_current_user')).toBeNull()
  })
})

// ─── 権限チェック / 权限检查 ──────────────────────────────────────────────────

describe('hasPermission / 権限チェック', () => {
  it('ユーザーが持つ権限は true を返す / 用户拥有的权限返回 true', () => {
    const store = useWmsUserStore()
    store.currentUser = makeMockAdmin() as any

    expect(store.hasPermission('inventory.read')).toBe(true)
    expect(store.hasPermission('order.write')).toBe(true)
  })

  it('ユーザーが持たない権限は false を返す / 用户没有的权限返回 false', () => {
    const store = useWmsUserStore()
    store.currentUser = makeMockAdmin() as any

    expect(store.hasPermission('user.delete')).toBe(false)
  })

  it('未認証の場合は false を返す / 未认证时返回 false', () => {
    const store = useWmsUserStore()
    expect(store.hasPermission('inventory.read')).toBe(false)
  })

  it('super_admin は全権限を持つ / super_admin 拥有所有权限', () => {
    const store = useWmsUserStore()
    store.currentUser = makeMockAdmin({ role: 'super_admin', permissions: [] }) as any

    expect(store.hasPermission('anything.at.all')).toBe(true)
  })
})

// ─── computed / 計算プロパティ ────────────────────────────────────────────────

describe('computed properties / 計算プロパティ', () => {
  it('isAdmin — admin ロールの場合 true / admin 角色时为 true', () => {
    const store = useWmsUserStore()
    store.currentUser = makeMockAdmin({ role: 'admin' }) as any
    expect(store.isAdmin).toBe(true)
  })

  it('isAdmin — operator ロールの場合 false / operator 角色时为 false', () => {
    const store = useWmsUserStore()
    store.currentUser = makeMockAdmin({ role: 'operator' }) as any
    expect(store.isAdmin).toBe(false)
  })

  it('isSuperAdmin — super_admin ロールの場合 true / super_admin 角色时为 true', () => {
    const store = useWmsUserStore()
    store.currentUser = makeMockAdmin({ role: 'super_admin' }) as any
    expect(store.isSuperAdmin).toBe(true)
  })

  it('isSuperAdmin — admin ロールの場合 false / admin 角色时为 false', () => {
    const store = useWmsUserStore()
    store.currentUser = makeMockAdmin({ role: 'admin' }) as any
    expect(store.isSuperAdmin).toBe(false)
  })

  it('accessibleWarehouses — super_admin は全倉庫にアクセス可 / super_admin 可访问所有仓库', () => {
    const store = useWmsUserStore()
    store.currentUser = makeMockAdmin({ role: 'super_admin' }) as any
    store.warehouses = [
      makeMockWarehouse({ id: 'wh-001' }),
      makeMockWarehouse({ id: 'wh-999' }),
    ] as any

    expect(store.accessibleWarehouses).toHaveLength(2)
  })

  it('accessibleWarehouses — 一般ユーザーは割当倉庫のみ / 普通用户只能访问分配的仓库', () => {
    const store = useWmsUserStore()
    store.currentUser = makeMockAdmin({ role: 'admin', warehouseIds: ['wh-001'] }) as any
    store.warehouses = [
      makeMockWarehouse({ id: 'wh-001' }),
      makeMockWarehouse({ id: 'wh-999' }),
    ] as any

    expect(store.accessibleWarehouses).toHaveLength(1)
    expect(store.accessibleWarehouses[0].id).toBe('wh-001')
  })
})

// ─── switchWarehouse / 倉庫切替 ──────────────────────────────────────────────

describe('switchWarehouse / 倉庫切替', () => {
  it('アクセス可能なアクティブ倉庫に切替できる / 可以切换到可访问的活跃仓库', () => {
    const store = useWmsUserStore()
    store.currentUser = makeMockAdmin() as any
    const wh = makeMockWarehouse({ id: 'wh-001', isActive: true })
    store.warehouses = [wh] as any

    const result = store.switchWarehouse('wh-001')
    expect(result.success).toBe(true)
    expect(store.currentWarehouse?.id).toBe('wh-001')
  })

  it('アクセス権がない倉庫への切替は失敗する / 无访问权的仓库切换失败', () => {
    const store = useWmsUserStore()
    store.currentUser = makeMockAdmin({ warehouseIds: ['wh-001'] }) as any
    store.warehouses = [makeMockWarehouse({ id: 'wh-999' })] as any

    const result = store.switchWarehouse('wh-999')
    expect(result.success).toBe(false)
    expect(result.error).toContain('No access')
  })

  it('存在しない倉庫への切替は失敗する / 不存在的仓库切换失败', () => {
    const store = useWmsUserStore()
    store.currentUser = makeMockAdmin({ role: 'super_admin' }) as any
    store.warehouses = [] as any

    const result = store.switchWarehouse('nonexistent')
    expect(result.success).toBe(false)
    expect(result.error).toContain('not found')
  })

  it('非アクティブ倉庫への切替は失敗する / 非活跃仓库切换失败', () => {
    const store = useWmsUserStore()
    store.currentUser = makeMockAdmin({ role: 'super_admin' }) as any
    store.warehouses = [makeMockWarehouse({ id: 'wh-001', isActive: false })] as any

    const result = store.switchWarehouse('wh-001')
    expect(result.success).toBe(false)
    expect(result.error).toContain('not active')
  })
})

// ─── canManageRole / ロール管理 ──────────────────────────────────────────────

describe('canManageRole / ロール管理権限', () => {
  it('admin は operator を管理できる / admin 可以管理 operator', () => {
    const store = useWmsUserStore()
    store.currentUser = makeMockAdmin({ role: 'admin' }) as any
    expect(store.canManageRole('operator')).toBe(true)
  })

  it('admin は admin を管理できない / admin 不能管理 admin', () => {
    const store = useWmsUserStore()
    store.currentUser = makeMockAdmin({ role: 'admin' }) as any
    expect(store.canManageRole('admin')).toBe(false)
  })

  it('operator は viewer を管理できる / operator 可以管理 viewer', () => {
    const store = useWmsUserStore()
    store.currentUser = makeMockAdmin({ role: 'operator' }) as any
    expect(store.canManageRole('viewer')).toBe(true)
  })

  it('未認証の場合は false / 未认证时为 false', () => {
    const store = useWmsUserStore()
    expect(store.canManageRole('viewer')).toBe(false)
  })
})
