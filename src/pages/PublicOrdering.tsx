import { createContext, useContext, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  createPublicOrder,
  getPublicRestaurant,
  getPublishedMenu,
  type MenuItem,
  type PublicOrderResponse,
  type PublicRestaurant,
} from '../lib/data-services'
import './PublicOrdering.css'

type CartLine = { item: MenuItem; quantity: number; notes?: string }
type PublicOrderContextValue = {
  restaurant: PublicRestaurant | null
  menu: MenuItem[]
  cart: CartLine[]
  loading: boolean
  error: string | null
  add: (item: MenuItem, quantity?: number, notes?: string) => void
  setQuantity: (itemId: string, quantity: number) => void
  clear: () => void
  total: number
  currency: string
}

const PublicOrderContext = createContext<PublicOrderContextValue | null>(null)

function usePublicOrder() {
  const value = useContext(PublicOrderContext)
  if (!value) throw new Error('Public ordering must be used within PublicOrderProvider')
  return value
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value)
}

function PublicOrderProvider({ children }: { children: ReactNode }) {
  const { restaurantSlug = '' } = useParams()
  const [restaurant, setRestaurant] = useState<PublicRestaurant | null>(null)
  const [menu, setMenu] = useState<MenuItem[]>([])
  const [cart, setCart] = useState<CartLine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    Promise.all([getPublicRestaurant(restaurantSlug), getPublishedMenu(restaurantSlug)])
      .then(([nextRestaurant, nextMenu]) => {
        if (!active) return
        setRestaurant(nextRestaurant)
        setMenu(nextMenu)
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'This restaurant is unavailable.')
      })
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [restaurantSlug])

  const value = useMemo<PublicOrderContextValue>(() => ({
    restaurant,
    menu,
    cart,
    loading,
    error,
    add: (item, quantity = 1, notes) => setCart((current) => {
      const existing = current.find((line) => line.item.id === item.id)
      if (existing) {
        return current.map((line) => line.item.id === item.id
          ? { ...line, quantity: Math.min(99, line.quantity + quantity), notes: notes ?? line.notes }
          : line)
      }
      return [...current, { item, quantity, notes }]
    }),
    setQuantity: (itemId, quantity) => setCart((current) =>
      quantity > 0
        ? current.map((line) => line.item.id === itemId ? { ...line, quantity: Math.min(99, quantity) } : line)
        : current.filter((line) => line.item.id !== itemId)),
    clear: () => setCart([]),
    total: cart.reduce((sum, line) => sum + line.item.price * line.quantity, 0),
    currency: restaurant?.currency ?? 'UGX',
  }), [restaurant, menu, cart, loading, error])

  return <PublicOrderContext.Provider value={value}>{children}</PublicOrderContext.Provider>
}

function PublicLayout({ children }: { children: ReactNode }) {
  const { restaurant, cart } = usePublicOrder()
  const { restaurantSlug } = useParams()
  return (
    <div className="public-ordering">
      <header className="public-header">
        <Link to={`/r/${restaurantSlug}`} className="public-brand">
          {restaurant?.logo_url
            ? <img src={restaurant.logo_url} alt="" />
            : <span className="public-brand-mark">F</span>}
          <span><strong>{restaurant?.name ?? 'FairPrice Restaurant'}</strong><small>Order online</small></span>
        </Link>
        <Link className="cart-link" to={`/r/${restaurantSlug}/cart`}>
          Cart <b>{cart.reduce((sum, line) => sum + line.quantity, 0)}</b>
        </Link>
      </header>
      {children}
      <footer className="public-footer">Powered by FairPrice Restaurant OS</footer>
    </div>
  )
}

function PublicUnavailable() {
  const { error } = usePublicOrder()
  const text = error?.toLowerCase().includes('active') ? 'This restaurant is not taking orders right now.' : 'This ordering link is invalid or unavailable.'
  return <div className="public-state"><span className="public-state-icon">!</span><h1>Ordering unavailable</h1><p>{text}</p></div>
}

function PublicEdgeState({ title, message }: { title: string; message: string }) {
  return <div className="public-state"><span className="public-state-icon">!</span><h1>{title}</h1><p>{message}</p></div>
}

function MenuPage() {
  const { menu, loading, error, restaurant, currency, add, cart } = usePublicOrder()
  const { restaurantSlug } = useParams()
  if (loading) return <div className="public-state"><p>Loading menu…</p></div>
  if (error || !restaurant) return <PublicUnavailable />
  const categories = [...new Set(menu.map((item) => item.category_id))]
  return (
    <main className="public-main">
      <section className="public-hero">
        <p className="public-eyebrow">WELCOME TO {restaurant.name.toUpperCase()}</p>
        <h1>Choose something delicious</h1>
        <p>{restaurant.address ?? 'Freshly prepared, made for your table.'}</p>
      </section>
      {menu.length === 0 ? <div className="empty-menu"><h2>Menu coming soon</h2><p>There are no published items available yet.</p></div> : categories.map((category) => (
        <section className="menu-section" key={category}>
          <h2>{category === categories[0] ? 'Our menu' : 'More favourites'}</h2>
          <div className="menu-grid">
            {menu.filter((item) => item.category_id === category).map((item) => (
              <article className="menu-card" key={item.id}>
                {item.image_url ? <img src={item.image_url} alt="" /> : <div className="menu-image-placeholder">FP</div>}
                <div className="menu-card-body"><h3>{item.name}</h3><p>{item.description ?? 'Prepared fresh to order.'}</p><strong>{formatMoney(item.price, currency)}</strong>
                  <div className="menu-card-actions"><Link to={`/r/${restaurantSlug}/item/${item.id}`}>Details</Link><button onClick={() => add(item)}>Add</button></div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
      {cart.length > 0 && <Link className="floating-cart" to={`/r/${restaurantSlug}/cart`}>View cart · {formatMoney(cart.reduce((sum, line) => sum + line.item.price * line.quantity, 0), currency)}</Link>}
    </main>
  )
}

function ItemPage() {
  const { menu, currency, add } = usePublicOrder()
  const { restaurantSlug, itemId } = useParams()
  const item = menu.find((entry) => entry.id === itemId)
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  if (!item) return <PublicUnavailable />
  return <main className="public-main detail-page"><Link to={`/r/${restaurantSlug}`} className="back-link">← Back to menu</Link>
    {item.image_url ? <img className="detail-image" src={item.image_url} alt="" /> : <div className="detail-image menu-image-placeholder">FP</div>}
    <p className="public-eyebrow">MENU ITEM</p><h1>{item.name}</h1><strong className="detail-price">{formatMoney(item.price, currency)}</strong><p>{item.description ?? 'Prepared fresh to order.'}</p>
    <label className="field-label" htmlFor="item-notes">Notes for the kitchen</label><textarea id="item-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Any preferences or allergies?" />
    <div className="quantity-row"><button onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button><b>{quantity}</b><button onClick={() => setQuantity(Math.min(99, quantity + 1))}>+</button><button className="primary-button" onClick={() => add(item, quantity, notes || undefined)}>Add to order · {formatMoney(item.price * quantity, currency)}</button></div>
  </main>
}

function CartPage() {
  const { cart, setQuantity, total, currency } = usePublicOrder()
  const { restaurantSlug } = useParams()
  return <main className="public-main"><div className="page-heading"><div><p className="public-eyebrow">YOUR ORDER</p><h1>Review your cart</h1></div><Link to={`/r/${restaurantSlug}`}>Add more</Link></div>
    {cart.length === 0 ? <div className="empty-menu"><h2>Your cart is empty</h2><Link className="primary-button inline-button" to={`/r/${restaurantSlug}`}>Browse menu</Link></div> : <><div className="cart-list">{cart.map((line) => <div className="cart-line" key={line.item.id}><div><h3>{line.item.name}</h3><p>{line.notes || 'No special notes'}</p></div><strong>{formatMoney(line.item.price * line.quantity, currency)}</strong><div className="quantity-row compact"><button onClick={() => setQuantity(line.item.id, line.quantity - 1)}>−</button><b>{line.quantity}</b><button onClick={() => setQuantity(line.item.id, line.quantity + 1)}>+</button></div></div>)}</div><div className="cart-total"><span>Total</span><strong>{formatMoney(total, currency)}</strong></div><Link className="primary-button checkout-button" to={`/r/${restaurantSlug}/checkout`}>Continue to checkout</Link></>}
  </main>
}

function CheckoutPage() {
  const { cart, total, currency, restaurant, clear } = usePublicOrder()
  const { restaurantSlug } = useParams()
  const [searchParams] = useSearchParams()
  const [orderType, setOrderType] = useState<'DINE_IN' | 'REMOTE'>(searchParams.get('orderType') === 'REMOTE' ? 'REMOTE' : 'DINE_IN')
  const [name, setName] = useState(''); const [phone, setPhone] = useState(''); const [notes, setNotes] = useState(''); const [error, setError] = useState<string | null>(null); const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const qrToken = searchParams.get('qrToken') ?? undefined; const tableId = searchParams.get('tableId') ?? undefined; const seatId = searchParams.get('seatId') ?? undefined
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(null); setSubmitting(true)
    try {
      const response = await createPublicOrder({ restaurantSlug: restaurantSlug ?? '', orderType, items: cart.map((line) => ({ menuItemId: line.item.id, quantity: line.quantity })), qrToken, tableId, seatId, customerName: name || undefined, customerPhone: phone || undefined, notes: notes || undefined })
      clear(); sessionStorage.setItem(`fairprice-order-${response.orderId}`, JSON.stringify(response)); navigate(`/r/${restaurantSlug}/order/${response.orderId}/confirmation`, { state: response })
    } catch (reason: unknown) { setError(reason instanceof Error ? reason.message : 'We could not submit your order.') } finally { setSubmitting(false) }
  }
  if (!restaurant || cart.length === 0) return <CartPage />
  return <main className="public-main checkout-page"><Link to={`/r/${restaurantSlug}/cart`} className="back-link">← Back to cart</Link><p className="public-eyebrow">CHECKOUT</p><h1>How would you like to order?</h1>
    <form onSubmit={submit}><div className="order-type-toggle"><button type="button" className={orderType === 'DINE_IN' ? 'selected' : ''} onClick={() => setOrderType('DINE_IN')}>Dine in<small>Order to your table</small></button><button type="button" className={orderType === 'REMOTE' ? 'selected' : ''} onClick={() => setOrderType('REMOTE')}>Remote order<small>Pay before collection</small></button></div>
      {orderType === 'REMOTE' && <div className="form-grid"><label>Name<input value={name} onChange={(event) => setName(event.target.value)} required /></label><label>Phone<input value={phone} onChange={(event) => setPhone(event.target.value)} required /></label></div>}
      <label className="field-label" htmlFor="order-notes">Order notes</label><textarea id="order-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Anything we should know?" />
      {orderType === 'DINE_IN' && !qrToken && <p className="checkout-warning">Scan a valid table QR code before placing a dine-in order.</p>}
      {error && <p className="form-error">{error}</p>}<div className="checkout-summary"><span>Total to pay</span><strong>{formatMoney(total, currency)}</strong></div><button className="primary-button checkout-button" disabled={submitting || (orderType === 'DINE_IN' && !qrToken)}>{submitting ? 'Placing order…' : orderType === 'REMOTE' ? `Continue to payment · ${formatMoney(total, currency)}` : `Place dine-in order · ${formatMoney(total, currency)}`}</button>
    </form>
  </main>
}

function OrderResultPage({ paymentState = false }: { paymentState?: boolean }) {
  const location = useLocation(); const { restaurantSlug } = useParams(); const result = (location.state as PublicOrderResponse | null) ?? null
  const stored = result ?? (sessionStorage.getItem(`fairprice-order-${location.pathname.split('/')[3]}`) ? JSON.parse(sessionStorage.getItem(`fairprice-order-${location.pathname.split('/')[3]}`) as string) as PublicOrderResponse : null)
  if (!stored) return <PublicUnavailable />
  return <main className="public-main public-result"><span className="result-check">{paymentState ? '…' : '✓'}</span><p className="public-eyebrow">{paymentState ? 'PAYMENT' : 'ORDER CONFIRMED'}</p><h1>{paymentState ? 'Payment is pending' : 'Thanks, your order is in'}</h1><p>{paymentState ? 'Complete payment with the provider to start preparation.' : 'The restaurant has received your order and will begin preparing it shortly.'}</p><div className="order-reference"><small>Order reference</small><strong>{stored.orderReference}</strong><span>{formatMoney(stored.total, 'UGX')}</span></div><Link className="primary-button checkout-button" to={`/r/${restaurantSlug}/order/${stored.orderId}/tracking`}>{paymentState ? 'Check payment status' : 'Track your order'}</Link></main>
}

function PaymentStatusPage({ status }: { status: 'succeeded' | 'failed' }) {
  const { restaurantSlug } = useParams()
  const succeeded = status === 'succeeded'
  return <main className="public-main public-result"><span className={`result-check ${succeeded ? '' : 'result-failed'}`}>{succeeded ? '✓' : '!'}</span><p className="public-eyebrow">PAYMENT {status.toUpperCase()}</p><h1>{succeeded ? 'Payment confirmed' : 'Payment failed'}</h1><p>{succeeded ? 'Your payment was received and the restaurant can begin preparing your order.' : 'Your payment was not completed. You can try again or contact the restaurant.'}</p><Link className="primary-button checkout-button" to={succeeded ? `/r/${restaurantSlug}` : `/r/${restaurantSlug}/checkout`}>{succeeded ? 'Order something else' : 'Try payment again'}</Link></main>
}

function TrackingPage() {
  const { restaurantSlug, orderId } = useParams()
  const stored = sessionStorage.getItem(`fairprice-order-${orderId}`)
  if (!stored) return <PublicUnavailable />
  const order = JSON.parse(stored) as PublicOrderResponse
  return <main className="public-main public-result"><span className="result-check">↗</span><p className="public-eyebrow">ORDER TRACKING</p><h1>We’re preparing your order</h1><p>Keep this page open for updates from the restaurant.</p><div className="tracking-steps"><span className="done">Order received</span><span>Preparing</span><span>Ready</span></div><p className="tracking-note">Reference <strong>{order.orderReference}</strong></p><Link className="back-link" to={`/r/${restaurantSlug}`}>Order something else</Link></main>
}

export function PublicOrderingRoutes() {
  return <PublicOrderProvider><PublicLayout><PublicOrderingPage /></PublicLayout></PublicOrderProvider>
}

function PublicOrderingPage() {
  const { pathname } = useLocation()
  if (pathname.endsWith('/cart')) return <CartPage />
  if (pathname.endsWith('/checkout')) return <CheckoutPage />
  if (pathname.endsWith('/confirmation')) return <OrderResultPage />
  if (pathname.endsWith('/payment-pending')) return <OrderResultPage paymentState />
  if (pathname.endsWith('/payment-succeeded')) return <PaymentStatusPage status="succeeded" />
  if (pathname.endsWith('/payment-failed')) return <PaymentStatusPage status="failed" />
  if (pathname.endsWith('/invalid-qr')) return <PublicEdgeState title="Invalid QR code" message="This table QR code is invalid or has been revoked. Ask the restaurant for a current code." />
  if (pathname.endsWith('/inactive-table')) return <PublicEdgeState title="Table is not accepting orders" message="This table or seat is currently inactive. Please ask restaurant staff for help." />
  if (pathname.endsWith('/not-taking-orders')) return <PublicEdgeState title="Restaurant is not taking orders" message="Ordering is temporarily paused. Please try again later." />
  if (pathname.endsWith('/ordering-unavailable')) return <PublicEdgeState title="Ordering unavailable" message="Online ordering is not available for this restaurant right now." />
  if (pathname.endsWith('/tracking')) return <TrackingPage />
  if (pathname.includes('/item/')) return <ItemPage />
  return <MenuPage />
}
