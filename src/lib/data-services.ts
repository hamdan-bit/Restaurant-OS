import type { Tables, TablesInsert } from './database.types'
import { supabase } from './supabase'

export type PublicOrderItem = {
  menuItemId: string
  quantity: number
}

export type PublicOrderRequest = {
  restaurantSlug: string
  orderType: 'DINE_IN' | 'REMOTE'
  items: PublicOrderItem[]
  qrToken?: string
  tableId?: string
  seatId?: string
  customerName?: string
  customerPhone?: string
  notes?: string
}

export type PublicOrderResponse = {
  orderId: string
  orderReference: string
  total: number
  paymentRequired: boolean
}

type ManagerInviteRequest = {
  restaurantId: string
  email: string
  fullName: string
  preset?: 'FLOOR_MANAGER' | 'SHIFT_LEAD' | 'SENIOR_MANAGER'
}

type ManagerInviteResponse = {
  invitationId: string
  userId: string | null
  status: 'PENDING'
}

type RegistrationApplicationInput = Pick<
  TablesInsert<'registration_applications'>,
  'business_name' | 'public_slug' | 'owner_name' | 'contact_email' | 'contact_phone'
>

type RegistrationApplication = Tables<'registration_applications'>
type Restaurant = Tables<'restaurants'>
type ManagerInvitation = Tables<'manager_invitations'>
export type MenuItem = Tables<'menu_items'>
export type PublicRestaurant = Pick<
  Restaurant,
  'id' | 'name' | 'public_slug' | 'logo_url' | 'address' | 'phone' | 'currency' | 'status'
>

export type OwnerDashboardData = {
  restaurant: Restaurant
  orders: Tables<'orders'>[]
  menuItems: MenuItem[]
  activeTables: number
  activeSeats: number
  pendingPayments: number
  subscription: Tables<'subscriptions'> | null
  planName: string | null
}

export type PlatformConsoleData = {
  applications: Tables<'registration_applications'>[]
  restaurants: Restaurant[]
  plans: Tables<'subscription_plans'>[]
  subscriptions: Tables<'subscriptions'>[]
  auditLogs: Tables<'audit_logs'>[]
}

export type WorkspaceRole = 'owner' | 'manager' | 'platform'

export type AccountDestination =
  | { kind: 'platform'; path: '/platform' }
  | { kind: 'owner'; path: '/owner'; restaurant: Restaurant }
  | { kind: 'manager'; path: '/manager'; restaurant: Restaurant }
  | { kind: 'application'; path: '/application-status'; application: RegistrationApplication }
  | { kind: 'empty'; path: '/dashboard' }

function requireData<T>(data: T | null, error: { message: string } | null): T {
  if (error) {
    throw new Error(error.message)
  }
  if (data === null) {
    throw new Error('Supabase returned no data')
  }
  return data
}

export async function createRegistrationApplication(
  input: RegistrationApplicationInput,
) {
  const { data, error } = await supabase.rpc(
    'create_registration_application',
    {
      business_name: input.business_name,
      public_slug: input.public_slug,
      owner_name: input.owner_name,
      contact_email: input.contact_email,
      contact_phone: input.contact_phone ?? undefined,
    },
  )
  return requireData(data, error)
}

export async function submitRegistrationApplication(applicationId: string) {
  const { error } = await supabase.rpc('submit_registration_application', {
    application_id: applicationId,
  })
  if (error) throw new Error(error.message)
}

export async function listMyRegistrationApplications(): Promise<
  RegistrationApplication[]
> {
  const { data, error } = await supabase
    .from('registration_applications')
    .select('*')
    .order('created_at', { ascending: false })
  return requireData(data, error)
}

export async function listMyRestaurants(): Promise<Restaurant[]> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .order('created_at', { ascending: false })
  return requireData(data, error)
}

export async function getOwnerDashboard(): Promise<OwnerDashboardData> {
  const restaurants = await listMyRestaurants()
  const restaurant = restaurants[0]
  if (!restaurant) {
    throw new Error('No restaurant workspace is assigned to this account')
  }

  const [ordersResult, menuResult, tablesResult, seatsResult, paymentsResult, subscriptionResult] =
    await Promise.all([
      supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('name'),
      supabase
        .from('restaurant_tables')
        .select('id')
        .eq('restaurant_id', restaurant.id)
        .eq('is_active', true),
      supabase
        .from('seats')
        .select('id')
        .eq('restaurant_id', restaurant.id)
        .eq('is_active', true),
      supabase
        .from('payments')
        .select('id')
        .eq('restaurant_id', restaurant.id)
        .eq('status', 'PENDING'),
      supabase
        .from('subscriptions')
        .select('*, subscription_plans(name)')
        .eq('restaurant_id', restaurant.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

  const orders = requireData(ordersResult.data, ordersResult.error)
  const menuItems = requireData(menuResult.data, menuResult.error)
  const activeTables = requireData(tablesResult.data, tablesResult.error)
  const activeSeats = requireData(seatsResult.data, seatsResult.error)
  const pendingPayments = requireData(paymentsResult.data, paymentsResult.error)
  const subscription = requireData(subscriptionResult.data, subscriptionResult.error)
  const subscriptionWithPlan = subscription as (Tables<'subscriptions'> & {
    subscription_plans?: { name: string } | null
  }) | null

  return {
    restaurant,
    orders,
    menuItems,
    activeTables: activeTables.length,
    activeSeats: activeSeats.length,
    pendingPayments: pendingPayments.length,
    subscription,
    planName: subscriptionWithPlan?.subscription_plans?.name ?? null,
  }
}

export async function getManagerDashboard(): Promise<OwnerDashboardData> {
  return getOwnerDashboard()
}

export async function canAccessWorkspace(role: WorkspaceRole): Promise<boolean> {
  if (role === 'platform') {
    const { data, error } = await supabase.rpc('is_platform_user', {
      required_role: 'PLATFORM_ADMIN',
    })
    return requireData(data, error)
  }

  const restaurants = await listMyRestaurants()
  const restaurant = restaurants[0]
  if (!restaurant) return false

  const { data, error } = await supabase.rpc('has_tenant_permission', {
    required_permission: role === 'owner' ? 'settings.manage' : 'orders.view',
    target_restaurant_id: restaurant.id,
  })
  return requireData(data, error)
}

export async function getAccountDestination(): Promise<AccountDestination> {
  const { data: platformUser, error: platformError } = await supabase.rpc(
    'is_platform_user',
    {},
  )
  if (platformError) throw new Error(platformError.message)
  if (platformUser) return { kind: 'platform', path: '/platform' }

  const restaurants = await listMyRestaurants()
  const restaurant = restaurants[0]
  if (restaurant) {
    if (restaurant.owner_user_id) {
      return { kind: 'owner', path: '/owner', restaurant }
    }
    return { kind: 'manager', path: '/manager', restaurant }
  }

  const applications = await listMyRegistrationApplications()
  const application = applications[0]
  if (application) return { kind: 'application', path: '/application-status', application }
  return { kind: 'empty', path: '/dashboard' }
}

export async function getPlatformConsole(): Promise<PlatformConsoleData> {
  const [applicationsResult, restaurantsResult, plansResult, subscriptionsResult, auditResult] =
    await Promise.all([
      supabase.from('registration_applications').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('restaurants').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('subscription_plans').select('*').order('monthly_price'),
      supabase.from('subscriptions').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ])
  return {
    applications: requireData(applicationsResult.data, applicationsResult.error),
    restaurants: requireData(restaurantsResult.data, restaurantsResult.error),
    plans: requireData(plansResult.data, plansResult.error),
    subscriptions: requireData(subscriptionsResult.data, subscriptionsResult.error),
    auditLogs: requireData(auditResult.data, auditResult.error),
  }
}

export async function approveRegistration(
  applicationId: string,
  planId: string | null,
  trialDays: number,
) {
  const { data, error } = await supabase.rpc('approve_registration_application', {
    application_id: applicationId,
    selected_plan_id: planId || undefined,
    trial_days: trialDays,
  })
  return requireData(data, error)
}

export async function rejectRegistration(applicationId: string, reason: string) {
  const { error } = await supabase.rpc('reject_registration_application', {
    application_id: applicationId,
    reason,
  })
  if (error) throw new Error(error.message)
}

export async function requestRegistrationInformation(applicationId: string, reason: string) {
  const { error } = await supabase.rpc('request_registration_information', {
    application_id: applicationId,
    reason,
  })
  if (error) throw new Error(error.message)
}

export async function inviteManager(
  input: ManagerInviteRequest,
): Promise<ManagerInviteResponse> {
  const { data, error } = await supabase.functions.invoke<ManagerInviteResponse>(
    'manager-onboarding',
    { body: input },
  )
  return requireData(data, error)
}

export async function listManagerInvitations(
  restaurantId: string,
): Promise<ManagerInvitation[]> {
  const { data, error } = await supabase
    .from('manager_invitations')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
  return requireData(data, error)
}

export async function acceptManagerInvitation(invitationId: string) {
  const { data, error } = await supabase.rpc('accept_manager_invitation', {
    invitation_id: invitationId,
  })
  return requireData(data, error)
}

export async function revokeManagerInvitation(invitationId: string) {
  const { error } = await supabase.rpc('revoke_manager_invitation', {
    invitation_id: invitationId,
  })
  if (error) throw new Error(error.message)
}

export async function getPublishedMenu(
  restaurantSlug: string,
): Promise<MenuItem[]> {
  const activeRestaurant = await getPublicRestaurant(restaurantSlug)
  if (activeRestaurant.status !== 'ACTIVE') {
    throw new Error('Restaurant is not available for ordering')
  }
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('restaurant_id', activeRestaurant.id)
    .eq('is_published', true)
    .eq('is_available', true)
    .order('name')
  return requireData(data, error)
}

export async function getPublicRestaurant(
  restaurantSlug: string,
): Promise<PublicRestaurant> {
  const { data, error } = await supabase.rpc('get_public_restaurant', {
    restaurant_slug: restaurantSlug,
  })
  if (error) throw new Error(error.message)
  const restaurant = data?.[0]
  if (!restaurant) throw new Error('Restaurant is not available')
  return restaurant
}

export async function createPublicOrder(
  input: PublicOrderRequest,
): Promise<PublicOrderResponse> {
  const { data, error } = await supabase.functions.invoke<PublicOrderResponse>(
    'public-order',
    { body: input },
  )
  return requireData(data, error)
}
