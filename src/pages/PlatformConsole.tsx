import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import AppShell from '../components/AppShell'
import {
  approveRegistration,
  getPlatformConsole,
  rejectRegistration,
  requestRegistrationInformation,
  type PlatformConsoleData,
} from '../lib/data-services'
import './PlatformConsole.css'

function statusLabel(value: string) {
  return value.replaceAll('_', ' ').toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase())
}

function money(value: number, currency = 'UGX') {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value)
}

export default function PlatformConsole() {
  const [data, setData] = useState<PlatformConsoleData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = () => {
    setLoading(true)
    getPlatformConsole()
      .then(setData)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to load platform data.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    let active = true
    getPlatformConsole()
      .then((result) => active && setData(result))
      .catch((reason: unknown) => active && setError(reason instanceof Error ? reason.message : 'Unable to load platform data.'))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [])

  if (loading && !data) return <AppShell role="platform"><div className="platform-loading">Loading platform console…</div></AppShell>
  if (error && !data) return <AppShell role="platform"><section className="platform-error"><h1>Platform console unavailable</h1><p>{error}</p></section></AppShell>
  if (!data) return null

  return <AppShell role="platform"><ConsoleContent data={data} refresh={refresh} /></AppShell>
}

function ConsoleContent({ data, refresh }: { data: PlatformConsoleData; refresh: () => void }) {
  const pathname = useLocation().pathname
  const view = pathname === '/platform' ? 'overview'
    : pathname.includes('/registrations') ? 'registrations'
      : pathname.includes('/tenants') ? 'tenants'
        : pathname.includes('/plans') ? 'plans'
          : pathname.includes('/subscriptions') ? 'subscriptions'
            : pathname.includes('/audit') ? 'audit' : 'overview'
  const pending = data.applications.filter((application) => ['PENDING_APPROVAL', 'MORE_INFORMATION_REQUIRED'].includes(application.status))
  const activeTenants = data.restaurants.filter((restaurant) => restaurant.status === 'ACTIVE').length
  const activeSubscriptions = data.subscriptions.filter((subscription) => ['TRIAL', 'ACTIVE', 'PAST_DUE', 'GRACE_PERIOD'].includes(subscription.status)).length
  const monthlyRevenue = data.subscriptions.reduce((sum, subscription) => {
    const plan = data.plans.find((candidate) => candidate.id === subscription.plan_id)
    return sum + (plan?.monthly_price ?? 0)
  }, 0)

  return <div className="platform-page">
    {view === 'overview' && <Overview data={data} pending={pending.length} activeTenants={activeTenants} activeSubscriptions={activeSubscriptions} monthlyRevenue={monthlyRevenue} />}
    {view === 'registrations' && <Registrations data={data} refresh={refresh} />}
    {view === 'tenants' && <Tenants data={data} />}
    {view === 'plans' && <Plans data={data} />}
    {view === 'subscriptions' && <Subscriptions data={data} />}
    {view === 'audit' && <Audit data={data} />}
  </div>
}

function PlatformHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <section className="platform-intro"><div><p className="platform-eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div></section>
}

function Overview({ data, pending, activeTenants, activeSubscriptions, monthlyRevenue }: { data: PlatformConsoleData; pending: number; activeTenants: number; activeSubscriptions: number; monthlyRevenue: number }) {
  return <><PlatformHeader eyebrow="FAIRPRICE PLATFORM" title="Platform overview" description="Monitor tenant growth, approvals, and subscription health across FairPrice." /><section className="platform-metrics"><Metric label="Pending approvals" value={pending} detail="Applications requiring review" tone="amber" /><Metric label="Active tenants" value={activeTenants} detail={`${data.restaurants.length} total restaurant accounts`} tone="green" /><Metric label="Active subscriptions" value={activeSubscriptions} detail={`${data.plans.length} plans configured`} tone="blue" /><Metric label="Monthly recurring value" value={money(monthlyRevenue)} detail="Based on current plan prices" tone="purple" /></section><section className="platform-columns"><article className="platform-panel"><PanelHeading label="REGISTRATION PIPELINE" title="Recent applications" to="/platform/registrations" /><div className="platform-list">{data.applications.slice(0, 5).map((application) => <Link to="/platform/registrations" className="platform-row" key={application.id}><span><strong>{application.business_name}</strong><small>{application.owner_name} · {application.contact_email}</small></span><em className={application.status.toLowerCase()}>{statusLabel(application.status)}</em></Link>)}</div></article><article className="platform-panel"><PanelHeading label="TENANT HEALTH" title="Recent tenant accounts" to="/platform/tenants" /><div className="platform-list">{data.restaurants.slice(0, 5).map((restaurant) => <Link to="/platform/tenants" className="platform-row" key={restaurant.id}><span><strong>{restaurant.name}</strong><small>{restaurant.public_slug}</small></span><em className={restaurant.status.toLowerCase()}>{statusLabel(restaurant.status)}</em></Link>)}</div></article></section></>
}

function Registrations({ data, refresh }: { data: PlatformConsoleData; refresh: () => void }) {
  const [selected, setSelected] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [planId, setPlanId] = useState('')
  const [trialDays, setTrialDays] = useState(14)
  const [busy, setBusy] = useState(false)
  const applications = data.applications
  const chosen = applications.find((application) => application.id === selected)
  const decide = async (action: 'approve' | 'reject' | 'info') => {
    if (!chosen) return
    setBusy(true)
    try {
      if (action === 'approve') await approveRegistration(chosen.id, planId || null, trialDays)
      if (action === 'reject') await rejectRegistration(chosen.id, reason)
      if (action === 'info') await requestRegistrationInformation(chosen.id, reason)
      setSelected(null); setReason(''); refresh()
    } catch (failure: unknown) { setReason(failure instanceof Error ? failure.message : 'Decision failed.') } finally { setBusy(false) }
  }
  return <><PlatformHeader eyebrow="PLATFORM OPERATIONS" title="Registration approvals" description="Review applications and create tenant workspaces only after an explicit platform decision." /><div className="platform-table"><div className="platform-table-head"><span>Business</span><span>Owner</span><span>Contact</span><span>Status</span><span /></div>{applications.map((application) => <div className="platform-table-row" key={application.id}><span><strong>{application.business_name}</strong><small>{application.public_slug}</small></span><span>{application.owner_name}</span><span>{application.contact_email}</span><em className={application.status.toLowerCase()}>{statusLabel(application.status)}</em><button onClick={() => setSelected(application.id)}>Review</button></div>)}</div>{chosen && <div className="decision-panel"><button className="close-button" onClick={() => setSelected(null)}>×</button><p className="platform-eyebrow">APPLICATION DETAIL</p><h2>{chosen.business_name}</h2><p>{chosen.owner_name} · {chosen.contact_email} · {chosen.contact_phone ?? 'No phone provided'}</p><label>Plan<select value={planId} onChange={(event) => setPlanId(event.target.value)}><option value="">No subscription</option>{data.plans.filter((plan) => plan.is_active).map((plan) => <option key={plan.id} value={plan.id}>{plan.name} · {money(plan.monthly_price)}</option>)}</select></label><label>Trial days<input type="number" min="0" max="365" value={trialDays} onChange={(event) => setTrialDays(Number(event.target.value))} /></label><label>Decision note<textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Required for rejection or information requests" /></label><div className="decision-actions"><button disabled={busy} onClick={() => decide('approve')}>Approve & create tenant</button><button disabled={busy} onClick={() => decide('info')}>Request information</button><button className="danger-button" disabled={busy} onClick={() => decide('reject')}>Reject application</button></div></div>}</>
}

function Tenants({ data }: { data: PlatformConsoleData }) {
  return <><PlatformHeader eyebrow="PLATFORM OPERATIONS" title="Tenant accounts" description="Review restaurant workspaces and their current operational status." /><div className="platform-table"><div className="platform-table-head"><span>Restaurant</span><span>Slug</span><span>Location</span><span>Status</span><span>Created</span></div>{data.restaurants.map((restaurant) => <div className="platform-table-row" key={restaurant.id}><span><strong>{restaurant.name}</strong><small>{restaurant.phone ?? 'No phone'}</small></span><span>{restaurant.public_slug}</span><span>{restaurant.address ?? 'Not set'}</span><em className={restaurant.status.toLowerCase()}>{statusLabel(restaurant.status)}</em><span>{new Date(restaurant.created_at).toLocaleDateString()}</span></div>)}</div></>
}

function Plans({ data }: { data: PlatformConsoleData }) {
  return <><PlatformHeader eyebrow="REVENUE CONFIGURATION" title="Subscription plans" description="Review the plans available for tenant subscriptions." /><div className="plan-grid">{data.plans.map((plan) => <article className="plan-card" key={plan.id}><span className={plan.is_active ? 'plan-active' : 'plan-inactive'}>{plan.is_active ? 'Active' : 'Inactive'}</span><h2>{plan.name}</h2><p>{plan.description ?? 'No plan description provided.'}</p><strong>{money(plan.monthly_price)}<small>/ month</small></strong><span>Annual: {money(plan.annual_price)}</span></article>)}</div></>
}

function Subscriptions({ data }: { data: PlatformConsoleData }) {
  return <><PlatformHeader eyebrow="REVENUE OPERATIONS" title="Subscriptions" description="Monitor subscription lifecycle state across tenant accounts." /><div className="platform-table"><div className="platform-table-head"><span>Restaurant</span><span>Plan</span><span>Status</span><span>Started</span><span>Period end</span></div>{data.subscriptions.map((subscription) => <div className="platform-table-row" key={subscription.id}><span>{data.restaurants.find((restaurant) => restaurant.id === subscription.restaurant_id)?.name ?? subscription.restaurant_id}</span><span>{data.plans.find((plan) => plan.id === subscription.plan_id)?.name ?? 'Unknown plan'}</span><em className={subscription.status.toLowerCase()}>{statusLabel(subscription.status)}</em><span>{new Date(subscription.starts_at).toLocaleDateString()}</span><span>{subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : '—'}</span></div>)}</div></>
}

function Audit({ data }: { data: PlatformConsoleData }) {
  return <><PlatformHeader eyebrow="SECURITY & GOVERNANCE" title="Audit log" description="Review recent administrative and tenant decision events." /><div className="platform-table"><div className="platform-table-head"><span>Action</span><span>Entity</span><span>Actor</span><span>Time</span><span>Metadata</span></div>{data.auditLogs.map((entry) => <div className="platform-table-row" key={entry.id}><span><strong>{entry.action}</strong></span><span>{entry.entity_type}</span><span>{entry.actor_user_id ?? 'System'}</span><span>{new Date(entry.created_at).toLocaleString()}</span><span className="metadata-cell">{JSON.stringify(entry.metadata)}</span></div>)}</div></>
}

function Metric({ label, value, detail, tone }: { label: string; value: number | string; detail: string; tone: string }) {
  return <article className={`platform-metric ${tone}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>
}

function PanelHeading({ label, title, to }: { label: string; title: string; to: string }) {
  return <div className="platform-heading"><div><span>{label}</span><h2>{title}</h2></div><Link to={to}>View all →</Link></div>
}
