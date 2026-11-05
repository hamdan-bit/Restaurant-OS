import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { getOwnerDashboard, type OwnerDashboardData } from '../lib/data-services'
import { EmptyState } from './StatePage'
import './OwnerOverview.css'

const activeStatuses = new Set(['RECEIVED', 'ACCEPTED', 'PREPARING', 'READY'])

function money(value: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value)
}

function formatStatus(status: string) {
  return status.replaceAll('_', ' ').toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase())
}

export default function OwnerOverview() {
  const [data, setData] = useState<OwnerDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getOwnerDashboard()
      .then((result) => active && setData(result))
      .catch((reason: unknown) => active && setError(reason instanceof Error ? reason.message : 'Unable to load your restaurant overview.'))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [])

  if (loading) return <AppShell><div className="owner-loading">Loading restaurant overview…</div></AppShell>
  if (error || !data) return <AppShell><section className="owner-error"><h1>Overview unavailable</h1><p>{error ?? 'No restaurant workspace is available.'}</p></section></AppShell>

  return <AppShell workspaceName={data.restaurant.name} workspaceLocation={data.restaurant.address ?? 'Restaurant workspace'}>
    <OwnerOverviewContent data={data} />
  </AppShell>
}

function OwnerOverviewContent({ data }: { data: OwnerDashboardData }) {
  const { restaurant, orders, menuItems, activeTables, activeSeats, pendingPayments, subscription, planName } = data
  const today = new Date().toISOString().slice(0, 10)
  const todayOrders = orders.filter((order) => order.created_at.slice(0, 10) === today)
  const activeOrders = todayOrders.filter((order) => activeStatuses.has(order.status))
  const todaySales = todayOrders
    .filter((order) => order.status !== 'CANCELLED' && order.status !== 'REJECTED')
    .reduce((sum, order) => sum + order.total, 0)
  const completedOrders = todayOrders.filter((order) => ['SERVED', 'COLLECTED'].includes(order.status)).length
  const popularItems = useMemo(() => {
    const counts = new Map<string, { name: string; quantity: number; sales: number }>()
    orders.forEach((order) => {
      if (!['SERVED', 'COLLECTED'].includes(order.status)) return
      // Order-item snapshots are not embedded in the order list; menu availability is still surfaced below.
      const current = counts.get(order.order_type) ?? { name: order.order_type === 'DINE_IN' ? 'Dine-in service' : 'Remote orders', quantity: 0, sales: 0 }
      current.quantity += 1
      current.sales += order.total
      counts.set(order.order_type, current)
    })
    return [...counts.values()].sort((a, b) => b.sales - a.sales)
  }, [orders])

  return <div className="owner-page">
    <section className="owner-intro">
      <div><p className="owner-eyebrow">{restaurant.name.toUpperCase()} · TODAY</p><h1>Restaurant overview</h1><p>Monitor today’s service, sales, and setup from one place.</p></div>
      <Link className="owner-primary" to="/owner/menu">Add menu item</Link>
    </section>
    <div className="owner-status-row"><span className={`status-pill ${restaurant.status.toLowerCase()}`}>{formatStatus(restaurant.status)}</span><span>{restaurant.address ?? 'Restaurant workspace'}</span><span className="owner-status-plan">{planName ? `${planName} plan` : 'Subscription not configured'}</span></div>
    <section className="owner-metrics">
      <Metric label="Today's gross sales" value={money(todaySales, restaurant.currency)} detail={`${todayOrders.length} orders today`} />
      <Metric label="Orders today" value={String(todayOrders.length)} detail={`${completedOrders} completed · ${activeOrders.length} active`} />
      <Metric label="Outstanding payments" value={String(pendingPayments)} detail="Pending payment records" warning={pendingPayments > 0} />
      <Metric label="Active tables" value={String(activeTables)} detail={`${activeSeats} active seats`} />
    </section>
    <section className="owner-columns">
      <article className="owner-panel"><div className="owner-panel-heading"><div><span>LIVE OPERATIONS</span><h2>Order pipeline</h2></div><Link to="/owner/orders">Open orders →</Link></div><div className="owner-pipeline">{[['RECEIVED', 'New'], ['ACCEPTED', 'Accepted'], ['PREPARING', 'Preparing'], ['READY', 'Ready']].map(([status, label]) => <div key={status}><b>{todayOrders.filter((order) => order.status === status).length}</b><span>{label}</span></div>)}</div>{orders.length === 0 ? <EmptyState title="No orders yet" message="Orders will appear here when customers place them." action={{ label: 'View menu setup', to: '/owner/menu' }} /> : <div className="owner-order-list">{orders.slice(0, 4).map((order) => <Link to={`/owner/orders/${order.id}`} key={order.id}><span><strong>{order.order_reference}</strong><small>{order.order_type === 'DINE_IN' ? 'Dine-in' : 'Remote'} · {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small></span><b>{money(order.total, restaurant.currency)}</b><em className={order.status.toLowerCase()}>{formatStatus(order.status)}</em></Link>)}</div>}</article>
      <article className="owner-panel"><div className="owner-panel-heading"><div><span>SETUP & CATALOGUE</span><h2>Restaurant readiness</h2></div><Link to="/owner/settings">Manage →</Link></div><div className="readiness-list"><Readiness label="Published menu items" value={menuItems.filter((item) => item.is_published).length > 0} detail={`${menuItems.filter((item) => item.is_published).length} published`} /><Readiness label="Available menu items" value={menuItems.some((item) => item.is_available)} detail={`${menuItems.filter((item) => item.is_available).length} available`} /><Readiness label="Tables and seats" value={activeTables > 0 && activeSeats > 0} detail={`${activeTables} tables · ${activeSeats} seats`} /><Readiness label="Subscription" value={Boolean(subscription)} detail={planName ?? 'Not configured'} /></div><Link className="owner-secondary" to="/owner/menu">Review setup checklist</Link></article>
    </section>
    <section className="owner-panel owner-performance"><div className="owner-panel-heading"><div><span>PERFORMANCE SNAPSHOT</span><h2>Service activity</h2></div><Link to="/owner/reports">View reports →</Link></div><div className="performance-grid"><div><strong>{completedOrders}</strong><span>Completed today</span></div><div><strong>{activeOrders.length}</strong><span>In service now</span></div>{popularItems.slice(0, 2).map((item) => <div key={item.name}><strong>{item.quantity}</strong><span>{item.name}</span></div>)}</div></section>
  </div>
}

function Metric({ label, value, detail, warning = false }: { label: string; value: string; detail: string; warning?: boolean }) {
  return <article className={`owner-metric ${warning ? 'warning' : ''}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>
}

function Readiness({ label, value, detail }: { label: string; value: boolean; detail: string }) {
  return <div className="readiness-item"><i className={value ? 'complete' : ''}>{value ? '✓' : '!'}</i><span><b>{label}</b><small>{detail}</small></span></div>
}
