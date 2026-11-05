import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { getOwnerWorkspace, saveMenuCategory, saveMenuItem, saveRestaurantTable, saveSeat, type OwnerWorkspaceData } from '../lib/data-services'
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
  const { restaurant, orders, payments, invitations, roles, subscription } = data
  const currency = restaurant.currency
  const heading = titleFromPath(`/owner/${section}`)
  if (section === 'orders') return <Section title={heading} description="Review recent customer orders and their current service status."><DataTable headers={['Reference', 'Type', 'Customer', 'Status', 'Total']} rows={orders.map((order) => [order.order_reference, order.order_type, order.customer_name ?? 'Walk-in', order.status, money(order.total, currency)])} empty="No orders have been placed yet." /></Section>
  if (section === 'menu') return <Section title={heading} description="Create categories and manage every menu item component."><MenuManager data={data} currency={currency} onSaved={onSaved} /></Section>
  if (section === 'tables') return <Section title={heading} description="Create tables and add seats for dine-in ordering."><TableManager data={data} onSaved={onSaved} /></Section>
  if (section === 'staff') return <Section title={heading} description="Review manager invitations and restaurant roles."><div className="owner-stat-grid"><Stat label="Invitations" value={invitations.length} /><Stat label="Roles" value={roles.length} /><Stat label="Pending" value={invitations.filter((invite) => invite.status === 'PENDING').length} /></div><DataTable headers={['Name', 'Email', 'Preset', 'Status']} rows={invitations.map((invite) => [invite.full_name, invite.email, invite.preset, invite.status])} empty="No manager invitations yet." /></Section>
  if (section === 'payments') return <Section title={heading} description="Review restaurant payment records separately from platform subscription billing."><DataTable headers={['Order', 'Method', 'Amount', 'Status', 'Recorded']} rows={payments.map((payment) => [orders.find((order) => order.id === payment.order_id)?.order_reference ?? 'Unknown order', payment.method, money(payment.amount, currency), payment.status, new Date(payment.created_at).toLocaleDateString()])} empty="No restaurant payments recorded yet." /></Section>
  if (section === 'reports') { const completed = orders.filter((order) => ['SERVED', 'COLLECTED'].includes(order.status)); return <Section title={heading} description="Sales figures are calculated from the tenant order ledger."><div className="owner-stat-grid"><Stat label="Orders" value={completed.length} /><Stat label="Gross sales" value={money(completed.reduce((sum, order) => sum + order.total, 0), currency)} /><Stat label="Average order" value={money(completed.length ? completed.reduce((sum, order) => sum + order.total, 0) / completed.length : 0, currency)} /></div></Section> }
  if (section === 'billing') return <Section title={heading} description="Subscription charges are separate from customer meal payments."><div className="owner-detail-card"><strong>{subscription ? 'Subscription active' : 'No subscription configured'}</strong><p>{subscription ? `Status: ${subscription.status}. Billing period ends ${subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : 'not set'}.` : 'Contact your platform administrator to configure a plan.'}</p></div></Section>
  if (section === 'settings') return <Section title={heading} description="Current tenant profile and public ordering identity."><div className="owner-detail-card"><strong>{restaurant.name}</strong><p>Public slug: {restaurant.public_slug}</p><p>Phone: {restaurant.phone ?? 'Not set'}</p><p>Address: {restaurant.address ?? 'Not set'}</p><p>Status: {restaurant.status}</p></div></Section>
  return <Section title={heading} description="This owner workspace section is ready for its next workflow module." />
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
