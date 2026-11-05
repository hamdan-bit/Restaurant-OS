import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)

async function source(relativePath) {
  return readFile(new URL(relativePath, root), 'utf8')
}

function envValue(contents, name) {
  const match = contents.match(new RegExp(`^${name}=(.*)$`, 'm'))
  return match?.[1]?.trim().replace(/^['"]|['"]$/g, '') ?? ''
}

test('frontend route surface covers public, owner, manager and platform journeys', async () => {
  const app = await source('src/App.tsx')
  const publicOrdering = await source('src/pages/PublicOrdering.tsx')

  for (const route of ['/r/:restaurantSlug/*', '/owner', '/manager', '/platform', '/permission-denied', '/session-expired']) {
    assert.match(app, new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
  for (const state of ['invalid-qr', 'inactive-table', 'not-taking-orders', 'ordering-unavailable', 'payment-pending', 'payment-succeeded', 'payment-failed']) {
    assert.match(publicOrdering, new RegExp(state))
  }
})

test('protected workspaces use hosted permission checks', async () => {
  const accessRoute = await source('src/components/WorkspaceAccessRoute.tsx')
  const services = await source('src/lib/data-services.ts')

  assert.match(accessRoute, /canAccessWorkspace/)
  assert.match(accessRoute, /permission-denied/)
  assert.match(services, /has_tenant_permission/)
  assert.match(services, /is_platform_user/)
})

test('public ordering contract rejects malformed requests without mutation', async (t) => {
  const env = await source('.env.local')
  const supabaseUrl = envValue(env, 'VITE_SUPABASE_URL')
  const anonKey = envValue(env, 'VITE_SUPABASE_ANON_KEY')

  if (!supabaseUrl || !anonKey) {
    t.skip('Hosted Supabase browser credentials are not configured')
    return
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/public-order`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({}),
  })

  assert.equal(response.status, 400)
  const payload = await response.json()
  assert.equal(typeof payload.error, 'string')
})

test('hosted public menu RLS is readable with the browser key', async (t) => {
  const env = await source('.env.local')
  const supabaseUrl = envValue(env, 'VITE_SUPABASE_URL')
  const anonKey = envValue(env, 'VITE_SUPABASE_ANON_KEY')

  if (!supabaseUrl || !anonKey) {
    t.skip('Hosted Supabase browser credentials are not configured')
    return
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/menu_items?select=id&limit=1`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
  })

  test('hosted public restaurant lookup exposes only the safe public contract', async (t) => {
    const env = await source('.env.local')
    const supabaseUrl = envValue(env, 'VITE_SUPABASE_URL')
    const anonKey = envValue(env, 'VITE_SUPABASE_ANON_KEY')

    if (!supabaseUrl || !anonKey) {
      t.skip('Hosted Supabase browser credentials are not configured')
      return
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/get_public_restaurant`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ restaurant_slug: 'nonexistent-test-slug' }),
    })

    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), [])
  })
  assert.equal(response.status, 200)
  assert.ok(Array.isArray(await response.json()))
})
