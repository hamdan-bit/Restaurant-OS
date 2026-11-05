import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { createQrCode, getOwnerWorkspace, inviteManager, removeManagerAccess, revokeManagerInvitation, revokeQrCode, saveMenuCategory, saveMenuItem, saveRestaurantSettings, saveRestaurantTable, saveSeat, updateManagerInvitation, type OwnerWorkspaceData } from '../lib/data-services'
import QRCode from 'qrcode'
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
  const [refreshKey, setRefreshKey] = useState(0)
  useEffect(() => {
    let active = true
    setError(null)
    getOwnerWorkspace().then((result) => active && setData(result)).catch((reason: unknown) => active && setError(reason instanceof Error ? reason.message : 'Unable to load this workspace section.'))
    return () => { active = false }
  }, [refreshKey])
  if (!data && !error) return <AppShell><div className="owner-section-state">Loading workspace section…</div></AppShell>
  if (error || !data) return <AppShell><section className="owner-section-state"><h1>Section unavailable</h1><p>{error}</p></section></AppShell>
  const section = location.pathname.split('/')[2] ?? ''
  return <AppShell workspaceName={data.restaurant.name} workspaceLocation={data.restaurant.address ?? 'Restaurant workspace'}><OwnerSectionContent data={data} section={section} onSaved={() => setRefreshKey((key) => key + 1)} /></AppShell>
}

function OwnerSectionContent({ data, section, onSaved }: { data: OwnerWorkspaceData; section: string; onSaved: () => void }) {
  const { restaurant, orders, payments, subscription } = data
  const currency = restaurant.currency
  const heading = titleFromPath(`/owner/${section}`)
  if (section === 'orders') return <Section title={heading} description="Review recent customer orders and their current service status."><DataTable headers={['Reference', 'Type', 'Customer', 'Status', 'Total']} rows={orders.map((order) => [order.order_reference, order.order_type, order.customer_name ?? 'Walk-in', order.status, money(order.total, currency)])} empty="No orders have been placed yet." /></Section>
  if (section === 'menu') return <Section title={heading} description="Create categories and manage every menu item component."><MenuManager data={data} currency={currency} onSaved={onSaved} /></Section>
  if (section === 'tables') return <Section title={heading} description="Create tables and add seats for dine-in ordering."><TableManager data={data} onSaved={onSaved} /></Section>
  if (section === 'staff') return <Section title={heading} description="Invite staff by email, edit pending invitations, and remove restaurant access."><StaffManager data={data} onSaved={onSaved} /></Section>
  if (section === 'payments') return <Section title={heading} description="Review restaurant payment records separately from platform subscription billing."><DataTable headers={['Order', 'Method', 'Amount', 'Status', 'Recorded']} rows={payments.map((payment) => [orders.find((order) => order.id === payment.order_id)?.order_reference ?? 'Unknown order', payment.method, money(payment.amount, currency), payment.status, new Date(payment.created_at).toLocaleDateString()])} empty="No restaurant payments recorded yet." /></Section>
  if (section === 'reports') return <Section title={heading} description="Analyze completed sales and download the underlying order ledger for spreadsheets."><ReportManager orders={orders} currency={currency} restaurantName={restaurant.name} /></Section>
  if (section === 'billing') return <Section title={heading} description="Subscription charges are separate from customer meal payments."><div className="owner-detail-card"><strong>{subscription ? 'Subscription active' : 'No subscription configured'}</strong><p>{subscription ? `Status: ${subscription.status}. Billing period ends ${subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : 'not set'}.` : 'Contact your platform administrator to configure a plan.'}</p></div></Section>
  if (section === 'qr-codes') return <Section title={heading} description="Generate, download, and revoke dine-in QR codes for tables and seats."><QrManager data={data} onSaved={onSaved} /></Section>
  if (section === 'settings') return <Section title={heading} description="Update the restaurant profile used by your workspace and public ordering page."><SettingsManager restaurant={restaurant} onSaved={onSaved} /></Section>
  return <Section title={heading} description="This owner workspace section is ready for its next workflow module." />
}

function ReportManager({ orders, currency, restaurantName }: { orders: OwnerWorkspaceData['orders']; currency: string; restaurantName: string }) {
  const completed = orders.filter((order) => ['SERVED', 'COLLECTED'].includes(order.status))
  const daily = new Map<string, { orders: number; sales: number }>()
  completed.forEach((order) => {
    const day = order.created_at.slice(0, 10)
    const current = daily.get(day) ?? { orders: 0, sales: 0 }
    daily.set(day, { orders: current.orders + 1, sales: current.sales + order.total })
  })
  const trend = [...daily.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-14)
  const maxSales = Math.max(...trend.map(([, value]) => value.sales), 1)
  const statusCounts = new Map<string, number>()
  orders.forEach((order) => statusCounts.set(order.status, (statusCounts.get(order.status) ?? 0) + 1))
  const downloadCsv = () => {
    const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`
    const rows = [
      ['Order reference', 'Created at', 'Order type', 'Customer', 'Status', 'Subtotal', 'Total', 'Currency'],
      ...orders.map((order) => [order.order_reference, order.created_at, order.order_type, order.customer_name ?? '', order.status, order.subtotal, order.total, currency]),
    ]
    const csv = rows.map((row) => row.map(escape).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `${restaurantName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-sales-report.csv`
    link.click()
    URL.revokeObjectURL(url)
  }
  return <div className="owner-report">
    <div className="owner-report-actions"><button type="button" onClick={downloadCsv}>Download CSV</button><span>{orders.length} orders included · completed sales drive the chart</span></div>
    <div className="owner-stat-grid"><Stat label="Completed orders" value={completed.length} /><Stat label="Gross sales" value={money(completed.reduce((sum, order) => sum + order.total, 0), currency)} /><Stat label="Average order" value={money(completed.length ? completed.reduce((sum, order) => sum + order.total, 0) / completed.length : 0, currency)} /></div>
    <div className="owner-report-card"><h2>Daily sales trend</h2>{trend.length ? <div className="sales-chart" aria-label="Daily completed sales chart">{trend.map(([day, value]) => <div className="sales-chart-column" key={day}><span className="sales-chart-value">{money(value.sales, currency)}</span><div className="sales-chart-bar" style={{ height: `${Math.max((value.sales / maxSales) * 170, 6)}px` }} /><small>{day.slice(5)}</small><em>{value.orders} order{value.orders === 1 ? '' : 's'}</em></div>)}</div> : <EmptyState title="No completed sales yet" message="Completed orders will appear here as sales are served or collected." />}</div>
    <div className="owner-report-card"><h2>Order status breakdown</h2><div className="report-status-grid">{[...statusCounts.entries()].map(([status, count]) => <div key={status}><strong>{count}</strong><span>{status.replaceAll('_', ' ')}</span></div>)}</div></div>
  </div>
}

function QrManager({ data, onSaved }: { data: OwnerWorkspaceData; onSaved: () => void }) {
  const [tableId, setTableId] = useState(data.tables[0]?.id ?? '')
  const [seatId, setSeatId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tokens, setTokens] = useState<Record<string, string>>({})
  const create = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError(null)
    try {
      const result = await createQrCode(data.restaurant.id, tableId, seatId || null)
      setTokens((current) => ({ ...current, [result.qrCode.id]: result.token })); onSaved()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to create QR code.') } finally { setSaving(false) }
  }
  const urlFor = (qr: OwnerWorkspaceData['qrCodes'][number]) => {
    const token = tokens[qr.id]
    return token ? `${window.location.origin}/r/${data.restaurant.public_slug}?qrToken=${encodeURIComponent(token)}&tableId=${qr.table_id ?? ''}&seatId=${qr.seat_id ?? ''}` : ''
  }
  const download = async (qr: OwnerWorkspaceData['qrCodes'][number]) => {
    const url = urlFor(qr)
    if (!url) { setError('This QR code was created before this browser session and cannot be downloaded. Revoke it and generate a replacement.'); return }
    const dataUrl = await QRCode.toDataURL(url, { width: 720, margin: 2 })
    const link = document.createElement('a'); link.href = dataUrl; link.download = `qr-${qr.table_id ?? 'table'}.png`; link.click()
  }
  const revoke = async (id: string) => {
    setSaving(true); setError(null)
    try { await revokeQrCode(id); onSaved() } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to revoke QR code.') } finally { setSaving(false) }
  }
  const table = (id: string | null) => data.tables.find((item) => item.id === id)?.name ?? 'Unknown table'
  const seat = (id: string | null) => data.seats.find((item) => item.id === id)?.name ?? 'All seats'
  return <div className="owner-manager">{error && <div className="owner-form-error">{error}</div>}<form className="owner-form-card" onSubmit={create}><h2>Generate dine-in QR code</h2><div className="owner-form-grid"><label>Table<select required value={tableId} onChange={(event) => setTableId(event.target.value)}><option value="">Select table</option>{data.tables.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Seat (optional)<select value={seatId} onChange={(event) => setSeatId(event.target.value)}><option value="">All seats at this table</option>{data.seats.filter((item) => item.table_id === tableId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div><div className="owner-form-actions"><button type="submit" disabled={saving || !tableId}>{saving ? 'Generating…' : 'Generate QR code'}</button></div><small>Generate one table QR or a seat-specific QR. Keep QR tokens private because they authorize dine-in ordering context.</small></form><div className="owner-manager-list"><h2>QR inventory</h2>{data.qrCodes.length ? data.qrCodes.map((qr) => <div className="owner-list-row" key={qr.id}><span><strong>{table(qr.table_id)} · {seat(qr.seat_id)}</strong><small>{qr.is_active ? 'Active' : 'Revoked'} · created {new Date(qr.created_at).toLocaleDateString()}</small></span><div className="owner-row-actions">{qr.is_active && tokens[qr.id] && <button type="button" className="owner-secondary-button" onClick={() => download(qr)}>Download PNG</button>}{qr.is_active && <button type="button" className="owner-secondary-button" disabled={saving} onClick={() => revoke(qr.id)}>Revoke</button>}</div></div>) : <EmptyState title="No QR codes yet" message="Generate a QR code after creating tables and seats." />}</div></div>
}

function SettingsManager({ restaurant, onSaved }: { restaurant: OwnerWorkspaceData['restaurant']; onSaved: () => void }) {
  const [name, setName] = useState(restaurant.name)
  const [slug, setSlug] = useState(restaurant.public_slug)
  const [phone, setPhone] = useState(restaurant.phone ?? '')
  const [address, setAddress] = useState(restaurant.address ?? '')
  const [timezone, setTimezone] = useState(restaurant.timezone)
  const [currency, setCurrency] = useState(restaurant.currency)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true); setMessage(null); setError(null)
    try {
      await saveRestaurantSettings(restaurant.id, { name: name.trim(), public_slug: slug.trim().toLowerCase(), phone: phone.trim() || null, address: address.trim() || null, timezone: timezone.trim(), currency: currency.trim().toUpperCase() })
      setMessage('Restaurant settings saved.')
      onSaved()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save restaurant settings.') } finally { setSaving(false) }
  }
  return <form className="owner-form-card owner-settings-form" onSubmit={submit}>{error && <div className="owner-form-error">{error}</div>}{message && <div className="owner-form-success">{message}</div>}<div className="owner-form-grid"><label>Restaurant name<input required value={name} onChange={(event) => setName(event.target.value)} /></label><label>Public URL slug<input required pattern="[a-z0-9-]+" value={slug} onChange={(event) => setSlug(event.target.value.replace(/[^a-z0-9-]/g, '-'))} /></label><label>Phone<input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} /></label><label>Address<input value={address} onChange={(event) => setAddress(event.target.value)} /></label><label>Timezone<input required value={timezone} onChange={(event) => setTimezone(event.target.value)} /></label><label>Currency<input required maxLength={3} value={currency} onChange={(event) => setCurrency(event.target.value)} /></label></div><div className="owner-form-actions"><button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</button></div><small>Restaurant status: {restaurant.status}. Status and approval are controlled by the platform.</small></form>
}

type ManagerPreset = 'FLOOR_MANAGER' | 'SHIFT_LEAD' | 'SENIOR_MANAGER'

function StaffManager({ data, onSaved }: { data: OwnerWorkspaceData; onSaved: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [preset, setPreset] = useState<ManagerPreset>('FLOOR_MANAGER')
  const [editingId, setEditingId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true); setError(null)
    try {
      if (editingId) {
        await updateManagerInvitation(editingId, name.trim(), preset)
      } else {
        await inviteManager({ restaurantId: data.restaurant.id, email: email.trim(), fullName: name.trim(), preset })
      }
      setName(''); setEmail(''); setPreset('FLOOR_MANAGER'); setEditingId(''); onSaved()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save staff member.') } finally { setSaving(false) }
  }
  const edit = (invitation: OwnerWorkspaceData['invitations'][number]) => {
    if (invitation.status !== 'PENDING') return
    setEditingId(invitation.id); setName(invitation.full_name); setEmail(invitation.email); setPreset(invitation.preset as ManagerPreset)
  }
  const revoke = async (id: string) => {
    setSaving(true); setError(null)
    try { await revokeManagerInvitation(id); onSaved() } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to revoke invitation.') } finally { setSaving(false) }
  }
  const remove = async (userId: string) => {
    if (!window.confirm('Remove this staff member from the restaurant?')) return
    setSaving(true); setError(null)
    try { await removeManagerAccess(userId); onSaved() } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to remove staff access.') } finally { setSaving(false) }
  }
  return <div className="owner-manager">
    {error && <div className="owner-form-error">{error}</div>}
    <form className="owner-form-card" onSubmit={submit}><h2>{editingId ? 'Edit pending invitation' : 'Invite staff member'}</h2><div className="owner-form-grid"><label>Full name<input required value={name} onChange={(event) => setName(event.target.value)} /></label><label>Email<input required disabled={Boolean(editingId)} type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label></div><label>Permission preset<select value={preset} onChange={(event) => setPreset(event.target.value as ManagerPreset)}><option value="FLOOR_MANAGER">Floor manager</option><option value="SHIFT_LEAD">Shift lead</option><option value="SENIOR_MANAGER">Senior manager</option></select></label><div className="owner-form-actions"><button type="submit" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save invitation' : 'Send email invitation'}</button>{editingId && <button type="button" className="owner-secondary-button" onClick={() => { setEditingId(''); setName(''); setEmail(''); setPreset('FLOOR_MANAGER') }}>Cancel</button>}</div>{!editingId && <small>The staff member receives a secure sign-in invitation by email and completes account setup through Supabase Auth.</small>}</form>
    <div className="owner-manager-list"><h2>Staff and invitations</h2>{data.invitations.length ? data.invitations.map((invitation) => <div className="owner-list-row" key={invitation.id}><span><strong>{invitation.full_name}</strong><small>{invitation.email} · {invitation.preset} · {invitation.status}{invitation.invited_user_id ? ` · User ${invitation.invited_user_id.slice(0, 8)}` : ''}</small></span><div className="owner-row-actions">{invitation.status === 'PENDING' && <><button type="button" className="owner-secondary-button" onClick={() => edit(invitation)}>Edit</button><button type="button" className="owner-secondary-button" disabled={saving} onClick={() => revoke(invitation.id)}>Revoke</button></>}{invitation.status === 'ACCEPTED' && invitation.invited_user_id && <button type="button" className="owner-secondary-button" disabled={saving} onClick={() => remove(invitation.invited_user_id as string)}>Remove access</button>}</div></div>) : <EmptyState title="No staff yet" message="Invite a manager to start building your restaurant team." />}</div>
  </div>
}

function MenuManager({ data, currency, onSaved }: { data: OwnerWorkspaceData; currency: string; onSaved: () => void }) {
  const [categoryId, setCategoryId] = useState('')
  const [categoryName, setCategoryName] = useState('')
  const [categoryDescription, setCategoryDescription] = useState('')
  const [itemId, setItemId] = useState('')
  const [itemName, setItemName] = useState('')
  const [itemDescription, setItemDescription] = useState('')
  const [itemPrice, setItemPrice] = useState('')
  const [itemCategory, setItemCategory] = useState(data.categories[0]?.id ?? '')
  const [itemImage, setItemImage] = useState('')
  const [itemImageFile, setItemImageFile] = useState<File | undefined>()
  const [itemPublished, setItemPublished] = useState(false)
  const [itemAvailable, setItemAvailable] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submitCategory = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true); setError(null)
    try {
      await saveMenuCategory(data.restaurant.id, { name: categoryName.trim(), description: categoryDescription.trim() || null, sort_order: data.categories.length, is_published: true }, categoryId || undefined)
      setCategoryId(''); setCategoryName(''); setCategoryDescription(''); onSaved()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save category.') } finally { setSaving(false) }
  }
  const submitItem = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true); setError(null)
    try {
      await saveMenuItem(data.restaurant.id, { category_id: itemCategory, name: itemName.trim(), description: itemDescription.trim() || null, image_url: itemImage.trim() || null, price: Number(itemPrice), is_available: itemAvailable, is_published: itemPublished }, itemId || undefined, itemImageFile)
      setItemId(''); setItemName(''); setItemDescription(''); setItemPrice(''); setItemImage(''); setItemImageFile(undefined); setItemPublished(false); setItemAvailable(true); onSaved()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save menu item.') } finally { setSaving(false) }
  }
  const editCategory = (category: OwnerWorkspaceData['categories'][number]) => { setCategoryId(category.id); setCategoryName(category.name); setCategoryDescription(category.description ?? '') }
  const editItem = (item: OwnerWorkspaceData['menuItems'][number]) => { setItemId(item.id); setItemName(item.name); setItemDescription(item.description ?? ''); setItemPrice(String(item.price)); setItemCategory(item.category_id); setItemImage(item.image_url ?? ''); setItemImageFile(undefined); setItemPublished(item.is_published); setItemAvailable(item.is_available) }
  return <div className="owner-manager">
    {error && <div className="owner-form-error">{error}</div>}
    <div className="owner-form-grid">
      <form className="owner-form-card" onSubmit={submitCategory}><h2>{categoryId ? 'Edit category' : 'Add category'}</h2><label>Name<input required value={categoryName} onChange={(event) => setCategoryName(event.target.value)} /></label><label>Description<textarea value={categoryDescription} onChange={(event) => setCategoryDescription(event.target.value)} /></label><div className="owner-form-actions"><button type="submit" disabled={saving}>{saving ? 'Saving…' : categoryId ? 'Save category' : 'Add category'}</button>{categoryId && <button type="button" className="owner-secondary-button" onClick={() => { setCategoryId(''); setCategoryName(''); setCategoryDescription('') }}>Cancel</button>}</div></form>
      <form className="owner-form-card" onSubmit={submitItem}><h2>{itemId ? 'Edit menu item' : 'Add menu item'}</h2><label>Name<input required value={itemName} onChange={(event) => setItemName(event.target.value)} /></label><label>Category<select required value={itemCategory} onChange={(event) => setItemCategory(event.target.value)}><option value="">Select category</option>{data.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>Price ({currency})<input required min="0" step="0.01" type="number" value={itemPrice} onChange={(event) => setItemPrice(event.target.value)} /></label><label>Description<textarea value={itemDescription} onChange={(event) => setItemDescription(event.target.value)} /></label><label>Menu image<input accept="image/*" type="file" onChange={(event) => { const file = event.target.files?.[0]; setItemImageFile(file); if (file) setItemImage(file.name) }} /><small>{itemImage ? `Selected: ${itemImage}` : 'Upload JPG, PNG, WebP, or another image file.'}</small></label><div className="owner-checkboxes"><label><input type="checkbox" checked={itemPublished} onChange={(event) => setItemPublished(event.target.checked)} /> Published</label><label><input type="checkbox" checked={itemAvailable} onChange={(event) => setItemAvailable(event.target.checked)} /> Available</label></div><div className="owner-form-actions"><button type="submit" disabled={saving || !itemCategory}>{saving ? 'Saving…' : itemId ? 'Save item' : 'Add item'}</button>{itemId && <button type="button" className="owner-secondary-button" onClick={() => { setItemId(''); setItemImageFile(undefined) }}>Cancel</button>}</div></form>
    </div>
    <div className="owner-manager-list"><h2>Categories</h2>{data.categories.length ? data.categories.map((category) => <div className="owner-list-row" key={category.id}><span><strong>{category.name}</strong><small>{category.description || 'No description'}</small></span><button type="button" className="owner-secondary-button" onClick={() => editCategory(category)}>Edit</button></div>) : <EmptyState title="No categories yet" message="Add a category before adding menu items." />}</div>
    <div className="owner-manager-list"><h2>Menu items</h2>{data.menuItems.length ? data.menuItems.map((item) => <div className="owner-list-row" key={item.id}><span><strong>{item.name} · {money(item.price, currency)}</strong><small>{data.categories.find((category) => category.id === item.category_id)?.name ?? 'Uncategorised'} · {item.is_available ? 'Available' : 'Unavailable'} · {item.is_published ? 'Published' : 'Draft'}</small></span><button type="button" className="owner-secondary-button" onClick={() => editItem(item)}>Edit</button></div>) : <EmptyState title="No menu items yet" message="Add your first menu item above." />}</div>
  </div>
}

function TableManager({ data, onSaved }: { data: OwnerWorkspaceData; onSaved: () => void }) {
  const [tableId, setTableId] = useState('')
  const [tableName, setTableName] = useState('')
  const [capacity, setCapacity] = useState('4')
  const [seatId, setSeatId] = useState('')
  const [seatName, setSeatName] = useState('')
  const [seatTable, setSeatTable] = useState(data.tables[0]?.id ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submitTable = async (event: FormEvent) => { event.preventDefault(); setSaving(true); setError(null); try { await saveRestaurantTable(data.restaurant.id, { name: tableName.trim(), capacity: Number(capacity), is_active: true }, tableId || undefined); setTableId(''); setTableName(''); setCapacity('4'); onSaved() } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save table.') } finally { setSaving(false) } }
  const submitSeat = async (event: FormEvent) => { event.preventDefault(); setSaving(true); setError(null); try { await saveSeat(data.restaurant.id, { table_id: seatTable, name: seatName.trim(), is_active: true }, seatId || undefined); setSeatId(''); setSeatName(''); onSaved() } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save seat.') } finally { setSaving(false) } }
  return <div className="owner-manager">{error && <div className="owner-form-error">{error}</div>}<div className="owner-form-grid"><form className="owner-form-card" onSubmit={submitTable}><h2>{tableId ? 'Edit table' : 'Add table'}</h2><label>Name<input required value={tableName} onChange={(event) => setTableName(event.target.value)} placeholder="Table 1" /></label><label>Capacity<input required min="1" type="number" value={capacity} onChange={(event) => setCapacity(event.target.value)} /></label><div className="owner-form-actions"><button type="submit" disabled={saving}>{saving ? 'Saving…' : tableId ? 'Save table' : 'Add table'}</button>{tableId && <button type="button" className="owner-secondary-button" onClick={() => setTableId('')}>Cancel</button>}</div></form><form className="owner-form-card" onSubmit={submitSeat}><h2>{seatId ? 'Edit seat' : 'Add seat'}</h2><label>Table<select required value={seatTable} onChange={(event) => setSeatTable(event.target.value)}><option value="">Select table</option>{data.tables.map((table) => <option key={table.id} value={table.id}>{table.name}</option>)}</select></label><label>Seat name<input required value={seatName} onChange={(event) => setSeatName(event.target.value)} placeholder="Seat 1" /></label><div className="owner-form-actions"><button type="submit" disabled={saving || !seatTable}>{saving ? 'Saving…' : seatId ? 'Save seat' : 'Add seat'}</button>{seatId && <button type="button" className="owner-secondary-button" onClick={() => setSeatId('')}>Cancel</button>}</div></form></div><div className="owner-manager-list"><h2>Tables and seats</h2>{data.tables.length ? data.tables.map((table) => <div className="owner-list-row owner-table-row" key={table.id}><span><strong>{table.name} · capacity {table.capacity}</strong><small>{table.is_active ? 'Active' : 'Inactive'} · {data.seats.filter((seat) => seat.table_id === table.id).length} seat(s)</small></span><div className="owner-row-actions"><button type="button" className="owner-secondary-button" onClick={() => { setTableId(table.id); setTableName(table.name); setCapacity(String(table.capacity)) }}>Edit</button>{data.seats.filter((seat) => seat.table_id === table.id).map((seat) => <button type="button" className="owner-tag-button" key={seat.id} onClick={() => { setSeatId(seat.id); setSeatName(seat.name); setSeatTable(seat.table_id) }}>{seat.name} · Edit</button>)}</div></div>) : <EmptyState title="No tables yet" message="Add a table before adding seats." />}</div></div>
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
