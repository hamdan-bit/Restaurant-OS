import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type InviteRequest = {
  restaurantId: string
  email: string
  fullName: string
  preset?: 'FLOOR_MANAGER' | 'SHIFT_LEAD' | 'SENIOR_MANAGER'
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: unknown, status = 200) {
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
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const authorization = request.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Authentication is required' }, 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: 'Function is not configured' }, 500)
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  })
  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  let payload: InviteRequest
  try {
    payload = await request.json() as InviteRequest
  } catch {
    return jsonResponse({ error: 'Invalid JSON request body' }, 400)
  }

  if (!payload.restaurantId || !payload.email || !payload.fullName) {
    return jsonResponse({ error: 'restaurantId, email and fullName are required' }, 400)
  }

  const { data: invitationId, error: createError } = await callerClient.rpc(
    'create_manager_invitation',
    {
      target_restaurant_id: payload.restaurantId,
      manager_email: payload.email,
      manager_name: payload.fullName,
      manager_preset: payload.preset ?? 'FLOOR_MANAGER',
    },
  )

  if (createError) {
    return jsonResponse({ error: createError.message }, 400)
  }

  const redirectTo = Deno.env.get('MANAGER_INVITE_REDIRECT_URL')
  const { data: inviteData, error: inviteError } =
    await adminClient.auth.admin.inviteUserByEmail(payload.email, {
      data: {
        full_name: payload.fullName,
        manager_invitation_id: invitationId,
      },
      ...(redirectTo ? { redirectTo } : {}),
    })

  if (inviteError) {
    await callerClient.rpc('mark_manager_invitation_failed', {
      invitation_id: invitationId,
    })
    return jsonResponse({ error: inviteError.message }, 502)
  }

  return jsonResponse({
    invitationId,
    userId: inviteData.user?.id ?? null,
    status: 'PENDING',
  }, 201)
})
