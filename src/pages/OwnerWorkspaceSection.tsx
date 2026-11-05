import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { getOwnerWorkspace, type OwnerWorkspaceData } from '../lib/data-services'
import { EmptyState } from './StatePage'
import './OwnerWorkspaceSection.css'

function money(value: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value)
}

function titleFromPath(path: string) {
  const titles: Record<string, string> = {
    orders: 'Orders and customers',
    menu: 'Menu and categories',
    tables: 'Tables and seats',
    'qr-codes': 'QR codes',
    staff: 'Staff and managers',
    payments: 'Payments',
    reports: 'Sales reports',
    billing: 'Subscription and billing',
    settings: 'Restaurant settings',
  }
  return titles[path.split('/')[2]] ?? 'Owner workspace'
}

export default function OwnerWorkspaceSection() {
  const location = useLocation()
  const [data, setData] = useState<OwnerWorkspaceData | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    getOwnerWorkspace().then((result) => active && setData(result)).catch((reason: unknown) => active && setError(reason instanceof Error ? reason.message : 'Unable to load this workspace section.'))
    return () => { active = false }
  }, [])
  if (!data && !error) return <AppShell><div className="owner-section-state">Loading workspace section…</div></AppShell>
  if (error || !data) return <AppShell><section className="owner-section-state"><h1>Section unavailable</h1><p>{error}</p></section></AppShell>
  const section = location.pathname.split('/')[2] ?? ''
  return <AppShell workspaceName={data.restaurant.name} workspaceLocation={data.restaurant.address ?? 'Restaurant workspace'}><OwnerSectionContent data={data} section={section} /></AppShell>
}

function OwnerSectionContent({ data, section }: { data: OwnerWorkspaceData; section: string }) {
  const { restaurant, orders, menuItems, categories, payments, invitations, roles, tables, subscription } = data
  const currency = restaurant.currency
  const heading = titleFromPath(`/owner/${section}`)
  if (section === 'orders') return <Section title={heading} description="Review recent customer orders and their current service status."><DataTable headers={['Reference', 'Type', 'Customer', 'Status', 'Total']} rows={orders.map((order) => [order.order_reference, order.order_type, order.customer_name ?? 'Walk-in', order.status, money(order.total, currency)])} empty="No orders have been placed yet." /></Section>
  if (section === 'menu') return <Section title={heading} description="Review published categories and menu availability."><div className="owner-stat-grid"><Stat label="Categories" value={categories.length} /><Stat label="Published items" value={menuItems.filter((item) => item.is_published).length} /><Stat label="Available items" value={menuItems.filter((item) => item.is_available).length} /></div><DataTable headers={['Item', 'Category', 'Price', 'Published', 'Available']} rows={menuItems.map((item) => [item.name, categories.find((category) => category.id === item.category_id)?.name ?? 'Uncategorised', money(item.price, currency), item.is_published ? 'Yes' : 'No', item.is_available ? 'Yes' : 'No'])} empty="No menu items have been configured." /></Section>
  if (section === 'tables') return <Section title={heading} description="Monitor the active table and seat configuration."><DataTable headers={['Table', 'Capacity', 'Status']} rows={tables.map((table) => [table.name, String(table.capacity), table.is_active ? 'Active' : 'Inactive'])} empty="No tables have been configured." /></Section>
  if (section === 'staff') return <Section title={heading} description="Review manager invitations and restaurant roles."><div className="owner-stat-grid"><Stat label="Invitations" value={invitations.length} /><Stat label="Roles" value={roles.length} /><Stat label="Pending" value={invitations.filter((invite) => invite.status === 'PENDING').length} /></div><DataTable headers={['Name', 'Email', 'Preset', 'Status']} rows={invitations.map((invite) => [invite.full_name, invite.email, invite.preset, invite.status])} empty="No manager invitations yet." /></Section>
  if (section === 'payments') return <Section title={heading} description="Review restaurant payment records separately from platform subscription billing."><DataTable headers={['Order', 'Method', 'Amount', 'Status', 'Recorded']} rows={payments.map((payment) => [orders.find((order) => order.id === payment.order_id)?.order_reference ?? 'Unknown order', payment.method, money(payment.amount, currency), payment.status, new Date(payment.created_at).toLocaleDateString()])} empty="No restaurant payments recorded yet." /></Section>
  if (section === 'reports') { const completed = orders.filter((order) => ['SERVED', 'COLLECTED'].includes(order.status)); return <Section title={heading} description="Sales figures are calculated from the tenant order ledger."><div className="owner-stat-grid"><Stat label="Orders" value={completed.length} /><Stat label="Gross sales" value={money(completed.reduce((sum, order) => sum + order.total, 0), currency)} /><Stat label="Average order" value={money(completed.length ? completed.reduce((sum, order) => sum + order.total, 0) / completed.length : 0, currency)} /></div></Section> }
  if (section === 'billing') return <Section title={heading} description="Subscription charges are separate from customer meal payments."><div className="owner-detail-card"><strong>{subscription ? 'Subscription active' : 'No subscription configured'}</strong><p>{subscription ? `Status: ${subscription.status}. Billing period ends ${subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : 'not set'}.` : 'Contact your platform administrator to configure a plan.'}</p></div></Section>
  if (section === 'settings') return <Section title={heading} description="Current tenant profile and public ordering identity."><div className="owner-detail-card"><strong>{restaurant.name}</strong><p>Public slug: {restaurant.public_slug}</p><p>Phone: {restaurant.phone ?? 'Not set'}</p><p>Address: {restaurant.address ?? 'Not set'}</p><p>Status: {restaurant.status}</p></div></Section>
  return <Section title={heading} description="This owner workspace section is ready for its next workflow module." />
}

function Section({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return <main className="owner-section"><div className="owner-section-heading"><div><p>OWNER WORKSPACE</p><h1>{title}</h1><span>{description}</span></div><Link to="/owner">← Overview</Link></div>{children ?? <EmptyState title="No data to display" message="This section has no records yet." />}</main>
}

function DataTable({ headers, rows, empty }: { headers: string[]; rows: string[][]; empty: string }) {
  if (rows.length === 0) return <EmptyState title="Nothing here yet" message={empty} />
  return <div className="owner-data-table"><div className="owner-data-head">{headers.map((header) => <span key={header}>{header}</span>)}</div>{rows.map((row, index) => <div className="owner-data-row" key={`${row[0]}-${index}`}>{row.map((cell, cellIndex) => <span key={`${cell}-${cellIndex}`}>{cell}</span>)}</div>)}</div>
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className="owner-section-stat"><small>{label}</small><strong>{value}</strong></div>
}
