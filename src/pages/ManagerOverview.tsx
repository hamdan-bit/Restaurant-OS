import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { getManagerDashboard, type OwnerDashboardData } from '../lib/data-services'
import { EmptyState } from './StatePage'
import './ManagerOverview.css'

const activeStatuses = new Set(['RECEIVED', 'ACCEPTED', 'PREPARING', 'READY'])

function money(value: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value)
}

function label(status: string) {
  return status.replaceAll('_', ' ').toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase())
}

export default function ManagerOverview() {
  const [data, setData] = useState<OwnerDashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    getManagerDashboard()
      .then((result) => active && setData(result))
      .catch((reason: unknown) => active && setError(reason instanceof Error ? reason.message : 'Unable to load the operations dashboard.'))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [])

  if (loading) return <AppShell role="manager"><div className="manager-loading">Loading live operations…</div></AppShell>
  if (!data || error) return <AppShell role="manager"><section className="manager-error"><h1>Operations unavailable</h1><p>{error ?? 'No restaurant workspace is assigned to this account.'}</p></section></AppShell>

  return <AppShell role="manager" workspaceName={data.restaurant.name} workspaceLocation={data.restaurant.address ?? 'Restaurant workspace'}><ManagerContent data={data} /></AppShell>
}

function ManagerContent({ data }: { data: OwnerDashboardData }) {
  const { restaurant, orders, activeTables, activeSeats, pendingPayments } = data
  const today = new Date().toISOString().slice(0, 10)
  const todayOrders = orders.filter((order) => order.created_at.slice(0, 10) === today)
  const incoming = todayOrders.filter((order) => order.status === 'RECEIVED')
  const active = todayOrders.filter((order) => activeStatuses.has(order.status))
  const ready = todayOrders.filter((order) => order.status === 'READY')
  const completed = todayOrders.filter((order) => ['SERVED', 'COLLECTED'].includes(order.status))
  const shiftSales = completed.reduce((sum, order) => sum + order.total, 0)
  const statusCounts = ['RECEIVED', 'ACCEPTED', 'PREPARING', 'READY'].map((status) => ({
    status,
    count: todayOrders.filter((order) => order.status === status).length,
  }))

  return <div className="manager-page">
    <section className="manager-intro"><div><p className="manager-eyebrow">LIVE SHIFT · {restaurant.name.toUpperCase()}</p><h1>Operations overview</h1><p>Keep service moving with a live view of incoming and active orders.</p></div><div className="shift-live"><i />Shift live<span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div></section>
    {restaurant.status !== 'ACTIVE' && <div className="manager-alert"><strong>Restaurant is {label(restaurant.status).toLowerCase()}.</strong><span>Some operational actions may be unavailable until the workspace is live.</span><Link to="/not-live">View status</Link></div>}
    <section className="manager-metrics"><ManagerMetric label="Incoming orders" value={incoming.length} detail="Need attention now" tone="amber" /><ManagerMetric label="Active orders" value={active.length} detail={`${ready.length} ready to serve`} tone="green" /><ManagerMetric label="Completed today" value={completed.length} detail={money(shiftSales, restaurant.currency)} tone="blue" /><ManagerMetric label="Pending payments" value={pendingPayments} detail={`${activeTables} tables · ${activeSeats} seats`} tone="purple" /></section>
    <section className="manager-columns">
      <article className="manager-panel"><div className="manager-heading"><div><span>ORDER QUEUE</span><h2>Incoming orders</h2></div><Link to="/manager/orders/incoming">View queue →</Link></div>{incoming.length === 0 ? <EmptyState title="Queue is clear" message="New customer orders will appear here." /> : <div className="manager-order-list">{incoming.map((order) => <OrderRow key={order.id} order={order} currency={restaurant.currency} />)}</div>}</article>
      <article className="manager-panel"><div className="manager-heading"><div><span>PREPARATION</span><h2>Active orders</h2></div><Link to="/manager/orders/active">Open active →</Link></div>{active.length === 0 ? <EmptyState title="No active orders" message="Accepted orders will appear here while the kitchen is working." /> : <div className="manager-order-list">{active.slice(0, 5).map((order) => <OrderRow key={order.id} order={order} currency={restaurant.currency} />)}</div>}</article>
    </section>
    <section className="manager-columns lower">
      <article className="manager-panel"><div className="manager-heading"><div><span>SHIFT PIPELINE</span><h2>Service flow</h2></div><Link to="/manager/kitchen">Kitchen →</Link></div><div className="manager-pipeline">{statusCounts.map((item) => <div key={item.status}><b>{item.count}</b><span>{label(item.status)}</span></div>)}</div><div className="manager-shortcuts"><Link to="/manager/ready">Ready to serve <b>{ready.length}</b></Link><Link to="/manager/tables">Table monitor <b>{activeTables}</b></Link></div></article>
      <article className="manager-panel"><div className="manager-heading"><div><span>SHIFT SUMMARY</span><h2>Today at a glance</h2></div><Link to="/manager/reports">Reports →</Link></div><div className="manager-summary"><div><strong>{todayOrders.length}</strong><span>Orders received</span></div><div><strong>{money(shiftSales, restaurant.currency)}</strong><span>Completed sales</span></div><div><strong>{pendingPayments}</strong><span>Payments to review</span></div></div><Link className="manager-secondary" to="/manager/orders/history">Review order history</Link></article>
    </section>
  </div>
}

function OrderRow({ order, currency }: { order: OwnerDashboardData['orders'][number]; currency: string }) {
  return <Link className="manager-order" to={`/manager/orders/${order.id}`}><span><strong>{order.order_reference}</strong><small>{order.order_type === 'DINE_IN' ? 'Dine-in' : 'Remote'} · {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small></span><b>{money(order.total, currency)}</b><em className={order.status.toLowerCase()}>{label(order.status)}</em></Link>
}

function ManagerMetric({ label: metricLabel, value, detail, tone }: { label: string; value: number; detail: string; tone: string }) {
  return <article className={`manager-metric ${tone}`}><span>{metricLabel}</span><strong>{value}</strong><small>{detail}</small></article>
}
