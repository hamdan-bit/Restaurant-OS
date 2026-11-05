import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type PublicOrderRequest = {
  restaurantSlug: string
  orderType: 'DINE_IN' | 'REMOTE'
  items: Array<{ menuItemId: string; quantity: number }>
  qrToken?: string
  tableId?: string
  seatId?: string
  customerName?: string
  customerPhone?: string
  notes?: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return response({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !anonKey) {
    return response({ error: 'Function is not configured' }, 500)
  }

  let payload: PublicOrderRequest
  try {
    payload = await request.json() as PublicOrderRequest
  } catch {
    return response({ error: 'Invalid JSON request body' }, 400)
  }

  if (!payload.restaurantSlug || !payload.orderType || !Array.isArray(payload.items)) {
    return response({ error: 'restaurantSlug, orderType and items are required' }, 400)
  }

  const client = createClient(supabaseUrl, anonKey)
  const { data, error } = await client.rpc('create_public_order', {
    restaurant_slug: payload.restaurantSlug,
    requested_order_type: payload.orderType,
    requested_items: payload.items.map((item) => ({
      menu_item_id: item.menuItemId,
      quantity: item.quantity,
    })),
    requested_qr_token: payload.qrToken ?? null,
    requested_table_id: payload.tableId ?? null,
    requested_seat_id: payload.seatId ?? null,
    requested_customer_name: payload.customerName ?? null,
    requested_customer_phone: payload.customerPhone ?? null,
    requested_notes: payload.notes ?? null,
  })

  if (error) {
    return response({ error: error.message }, 400)
  }

  const order = Array.isArray(data) ? data[0] : data
  return response({
    orderId: order.order_id,
    orderReference: order.order_reference,
    total: order.order_total,
    paymentRequired: order.payment_required,
  }, 201)
})
