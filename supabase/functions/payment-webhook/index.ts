import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type PaymentWebhook = {
  eventId: string
  providerReference: string
  orderReference: string
  status: 'succeeded' | 'paid' | 'failed' | 'cancelled'
  amount: number
  currency: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-payment-signature',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false
  let result = 0
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }
  return result === 0
}

async function signPayload(secret: string, payload: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payload),
  )
  return bytesToHex(new Uint8Array(signature))
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const secret = Deno.env.get('PAYMENT_WEBHOOK_SECRET')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!secret || !supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Webhook is not configured' }, 500)
  }

  const rawBody = await request.text()
  const suppliedSignature = request.headers.get('x-payment-signature')?.trim()
  if (!suppliedSignature) {
    return jsonResponse({ error: 'Missing webhook signature' }, 401)
  }

  const expectedSignature = await signPayload(secret, rawBody)
  if (!constantTimeEqual(suppliedSignature.toLowerCase(), expectedSignature)) {
    return jsonResponse({ error: 'Invalid webhook signature' }, 401)
  }

  let payload: PaymentWebhook
  try {
    payload = JSON.parse(rawBody) as PaymentWebhook
  } catch {
    return jsonResponse({ error: 'Invalid JSON request body' }, 400)
  }

  if (
    !payload.eventId ||
    !payload.providerReference ||
    !payload.orderReference ||
    !payload.status ||
    !Number.isFinite(payload.amount) ||
    payload.amount <= 0 ||
    !payload.currency
  ) {
    return jsonResponse({ error: 'Incomplete payment webhook payload' }, 400)
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)
  const { data, error } = await adminClient.rpc('reconcile_remote_payment', {
    webhook_event_id: payload.eventId,
    webhook_provider_reference: payload.providerReference,
    order_reference_value: payload.orderReference,
    webhook_status: payload.status,
    webhook_amount: payload.amount,
    webhook_currency: payload.currency,
    webhook_payload: payload,
  })

  if (error) {
    return jsonResponse({ error: error.message }, 400)
  }

  const result = Array.isArray(data) ? data[0] : data
  return jsonResponse({
    paymentId: result.payment_id,
    orderId: result.order_id,
    paymentStatus: result.payment_status,
    orderStatus: result.order_status,
    alreadyProcessed: result.already_processed,
  })
})
