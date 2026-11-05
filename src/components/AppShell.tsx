import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './AppShell.css'

export type AppRole = 'owner' | 'manager' | 'platform'

type NavItem = { label: string; to: string }

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
  const [stableWorkspaceName, setStableWorkspaceName] = useState(() => {
    const stored = window.localStorage.getItem('fairprice-workspace-name')
    return stored || workspaceName
  })
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const stored = window.localStorage.getItem('fairprice-theme')
    return stored === 'dark' ? 'dark' : 'light'
  })
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const nav = navigation[role]
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    if (workspaceName !== 'Restaurant workspace') {
      setStableWorkspaceName(workspaceName)
      window.localStorage.setItem('fairprice-workspace-name', workspaceName)
    }
  }, [workspaceName])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    window.localStorage.setItem('fairprice-theme', next)
    document.documentElement.dataset.theme = next
  }

  return (
    <div className="app-shell">
      <header className="shell-header">
        <div className="shell-header-row">
          <Link className="workspace-switcher" to={role === 'platform' ? '/platform' : `/${role}`}>
            <span className="workspace-avatar">{stableWorkspaceName.slice(0, 2).toUpperCase()}</span>
            <strong>{stableWorkspaceName}</strong>
          </Link>
          <div className="shell-user">
            <span className="user-avatar">{initials(user?.email)}</span>
            <span className="shell-user-details">
              <strong>{user?.email ?? 'Signed-in user'}</strong>
              <small>{roleLabels[role]}</small>
            </span>
          </div>
          <div className="topbar-actions">
            <button className="topbar-account" onClick={toggleTheme}>
              {theme === 'light' ? 'Dark mode' : 'Light mode'}
            </button>
            <button className="topbar-icon" aria-label="Notifications">
              <span className="notification-dot" />♢
            </button>
            <button className="topbar-account" onClick={handleSignOut}>Sign out</button>
          </div>
        </div>
        <nav className="shell-nav" aria-label={`${roleLabels[role]} navigation`}>
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === `/${role}`}>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </header>
      <div className="shell-main">
        <main className="shell-content">{children}</main>
      </div>
    </div>
  )
}
