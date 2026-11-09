import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { listMyRestaurants } from '../lib/data-services'
import { supabase } from '../lib/supabase'
import './AppShell.css'

export type AppRole = 'owner' | 'manager' | 'platform'

type NavItem = { label: string; to: string; action?: boolean }

const navigation: Record<AppRole, NavItem[]> = {
  owner: [
    { label: 'Overview', to: '/owner' },
    { label: 'Orders & Customers', to: '/owner/orders' },
    { label: 'Menu & Categories', to: '/owner/menu' },
    { label: 'Tables & Seats', to: '/owner/tables' },
    { label: 'QR Codes', to: '/owner/qr-codes' },
    { label: 'Staff & Managers', to: '/owner/staff' },
    { label: 'Payments', to: '/owner/payments' },
    { label: 'Sales Reports', to: '/owner/reports' },
    { label: 'Subscription & Billing', to: '/owner/billing' },
    { label: 'Settings', to: '/owner/settings' },
  ],
  manager: [
    { label: 'Operations Overview', to: '/manager' },
    { label: 'Incoming Orders', to: '/manager/orders/incoming' },
    { label: 'Active Orders', to: '/manager/orders/active' },
    { label: 'Order History', to: '/manager/orders/history' },
    { label: 'Kitchen Coordination', to: '/manager/kitchen' },
    { label: 'Ready to Serve', to: '/manager/ready' },
    { label: 'Table & Seat Monitor', to: '/manager/tables' },
    { label: 'Payment Recording', to: '/manager/payments' },
    { label: 'Customer Lookup', to: '/manager/customers' },
    { label: 'My Account', to: '/manager/account' },
  ],
  platform: [
    { label: 'Platform Overview', to: '/platform' },
    { label: 'Registration Approvals', to: '/platform/registrations' },
    { label: 'Tenant Accounts', to: '/platform/tenants' },
    { label: 'Subscription Plans', to: '/platform/plans' },
    { label: 'Subscriptions', to: '/platform/subscriptions' },
    { label: 'Billing & Revenue', to: '/platform/billing' },
    { label: 'Platform Users', to: '/platform/users' },
    { label: 'Support', to: '/platform/support' },
    { label: 'System Health', to: '/platform/health' },
    { label: 'Security & Audit', to: '/platform/audit' },
  ],
}

const roleLabels: Record<AppRole, string> = {
  owner: 'Restaurant Owner',
  manager: 'Restaurant Manager',
  platform: 'Platform Administrator',
}

const roleSearch: Record<AppRole, string> = {
  owner: 'Search orders, digital menus, tables...',
  manager: 'Search orders, customers, tables...',
  platform: 'Search tenants, audits, plans...',
}

const navigationGroups: Record<AppRole, NavItem[][]> = {
  owner: [navigation.owner.slice(0, 5), navigation.owner.slice(5, 8), navigation.owner.slice(8)],
  manager: [navigation.manager.slice(0, 4), navigation.manager.slice(4, 8), navigation.manager.slice(8)],
  platform: [
    navigation.platform.slice(0, 3),
    navigation.platform.slice(3, 6),
    navigation.platform.slice(6, 8),
    navigation.platform.slice(8),
  ],
}

function initials(email: string | undefined) {
  return email?.slice(0, 2).toUpperCase() ?? 'FP'
}

export default function AppShell({
  role = 'owner',
  workspaceName = 'Restaurant workspace',
  children,
}: {
  role?: AppRole
  workspaceName?: string
  workspaceLocation?: string
  children: ReactNode
}) {
  const [stableWorkspaceName] = useState(() => {
    const stored = window.localStorage.getItem('fairprice-workspace-name')
    return stored || workspaceName
  })
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const stored = window.localStorage.getItem('fairprice-theme')
    return stored === 'dark' ? 'dark' : 'light'
  })
  const [profileOpen, setProfileOpen] = useState(false)
  const [actionCount, setActionCount] = useState(0)
  const { user, signOut } = useAuth()
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    if (workspaceName !== 'Restaurant workspace') {
      window.localStorage.setItem('fairprice-workspace-name', workspaceName)
    }
  }, [workspaceName])

  useEffect(() => {
    let active = true
    const loadActions = async () => {
      if (role === 'platform') {
        const { count } = await supabase.from('registration_applications').select('id', { count: 'exact', head: true }).eq('status', 'PENDING_APPROVAL')
        if (active) setActionCount(count ?? 0)
        return
      }
      const restaurants = await listMyRestaurants()
      const restaurant = restaurants[0]
      if (!restaurant) return
      const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurant.id).is('read_at', null)
      if (active) setActionCount(count ?? 0)
    }
    loadActions().catch(() => { if (active) setActionCount(0) })
    return () => { active = false }
  }, [role])

  const handleSignOut = async () => {
    await signOut()
    window.location.replace('/')
  }

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    window.localStorage.setItem('fairprice-theme', next)
    document.documentElement.dataset.theme = next
  }
  const displayWorkspaceName = workspaceName === 'Restaurant workspace' ? stableWorkspaceName : workspaceName

  return (
    <div className="app-shell">
      <header className="shell-header">
        <div className="shell-header-row">
          <Link className="workspace-switcher" to={role === 'platform' ? '/platform' : `/${role}`}>
            <span className="workspace-avatar">{displayWorkspaceName.slice(0, 2).toUpperCase()}</span>
            <strong>{displayWorkspaceName}</strong>
          </Link>
          <div className="shell-search">
            <span aria-hidden="true">⌕</span>
            <input aria-label="Global search" placeholder={roleSearch[role]} />
            <kbd>⌘K</kbd>
          </div>
          <div className="shell-user-menu">
          <button className="shell-user" onClick={() => setProfileOpen((open) => !open)} aria-expanded={profileOpen}>
            <span className="user-avatar">{initials(user?.email)}</span>
            <span className="shell-user-details">
              <strong>{user?.email ?? 'Signed-in user'}</strong>
              <small><i />{roleLabels[role]}</small>
            </span>
            <span className="profile-chevron">⌄</span>
          </button>
          {profileOpen && <div className="profile-menu"><strong>{user?.email}</strong><span>{roleLabels[role]}</span><button onClick={handleSignOut}>Sign out</button></div>}
          </div>
          <div className="topbar-actions">
            {role === 'platform' && <span className="system-status"><i />Healthy 99.9%</span>}
            {role !== 'platform' && <button className="topbar-icon notification-button" aria-label={`${actionCount} unread notifications`}><svg className="notification-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>{actionCount > 0 && <b>{actionCount > 9 ? '9+' : actionCount}</b>}</button>}
            <button className="topbar-account" onClick={toggleTheme}>
              {theme === 'light' ? 'Dark mode' : 'Light mode'}
            </button>
          </div>
        </div>
        <nav className="shell-nav" aria-label={`${roleLabels[role]} navigation`}>
          {navigationGroups[role].map((group, groupIndex) => <span className="nav-group" key={groupIndex}>{group.map((item) => <NavLink key={item.to} to={item.to} end={item.to === `/${role}`}><span className="nav-label">{item.label}</span>{(role === 'platform' && item.to === '/platform/registrations' || role !== 'platform' && item.to.includes('orders')) && actionCount > 0 && <b className="nav-badge">{actionCount > 9 ? '9+' : actionCount}</b>}</NavLink>)}</span>)}
        </nav>
      </header>
      <div className="shell-main">
        <main className="shell-content">{children}</main>
      </div>
    </div>
  )
}
