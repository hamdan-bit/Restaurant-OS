import { Link, useLocation } from 'react-router-dom'
import AppShell, { type AppRole } from '../components/AppShell'
import './StatePage.css'

type StatePageProps = {
  title: string
  message: string
  action?: { label: string; to: string }
  role?: AppRole
}

export function LoadingState({ message = 'Loading…' }: { message?: string }) {
  return <div className="shared-state shared-state-loading"><span className="loading-spinner" /><p>{message}</p></div>
}

export function ErrorState({ title = 'Something went wrong', message, action }: StatePageProps) {
  return <StatePage title={title} message={message} action={action} />
}

export function EmptyState({ title, message, action }: StatePageProps) {
  return <section className="shared-state shared-state-empty"><span className="empty-mark">—</span><h2>{title}</h2><p>{message}</p>{action && <Link className="state-action" to={action.to}>{action.label}</Link>}</section>
}

export function StatePage({ title, message, action, role = 'owner' }: StatePageProps) {
  return (
    <AppShell role={role}>
      <section className="state-page">
        <span className="state-mark">i</span>
        <p className="state-eyebrow">FairPrice Restaurant OS</p>
        <h1>{title}</h1>
        <p>{message}</p>
        {action && <Link className="state-action" to={action.to}>{action.label}</Link>}
      </section>
    </AppShell>
  )
}

export function WorkspacePlaceholder({ role = 'owner' }: { role?: AppRole }) {
  const location = useLocation()
  const title = location.pathname === `/${role}` ? 'Workspace overview' : 'Workspace section'
  return (
    <AppShell role={role}>
      <section className="workspace-placeholder">
        <p className="state-eyebrow">{role === 'platform' ? 'FAIRPRICE PLATFORM' : 'SAVANNA TABLE'}</p>
        <h1>{title}</h1>
        <p>This shared workspace is ready for the next feature module.</p>
        <span className="prototype-badge">Foundation route</span>
      </section>
    </AppShell>
  )
}

export function NotFoundPage() {
  return (
    <StatePage
      title="Page not found"
      message="The page you requested does not exist or is no longer available."
      action={{ label: 'Go to dashboard', to: '/dashboard' }}
    />
  )
}

export function PermissionDeniedPage() {
  return (
    <StatePage
      title="Permission denied"
      message="You do not have permission to view this area. Ask the workspace owner if you need access."
      action={{ label: 'Return to dashboard', to: '/dashboard' }}
    />
  )
}

export function SessionExpiredPage() {
  return (
    <StatePage
      title="Your session expired"
      message="For your security, please sign in again to continue."
      action={{ label: 'Sign in again', to: '/login' }}
    />
  )
}
