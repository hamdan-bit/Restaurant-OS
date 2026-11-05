create extension if not exists pgcrypto;

create type public.restaurant_status as enum ('PENDING_SETUP', 'ACTIVE', 'SUSPENDED', 'CLOSED');
create type public.application_status as enum (
  'PENDING_VERIFICATION',
  'PENDING_APPROVAL',
  'MORE_INFORMATION_REQUIRED',
  'APPROVED',
  'REJECTED'
);
create type public.subscription_status as enum (
  'TRIAL',
  'ACTIVE',
  'PAST_DUE',
  'GRACE_PERIOD',
  'SUSPENDED',
  'CANCELLED',
  'EXPIRED'
);
create type public.platform_role as enum ('SUPER_ADMIN', 'PLATFORM_ADMIN', 'SUPPORT_STAFF');
create type public.restaurant_role as enum ('OWNER', 'MANAGER');
create type public.order_type as enum ('DINE_IN', 'REMOTE');
create type public.order_status as enum (
  'RECEIVED',
  'ACCEPTED',
  'PREPARING',
  'READY',
  'SERVED',
  'COLLECTED',
  'REJECTED',
  'CANCELLED'
);
create type public.payment_method as enum ('CASH', 'MOBILE_MONEY', 'CARD', 'OTHER');
create type public.payment_status as enum ('PENDING', 'CONFIRMED', 'FAILED', 'REFUNDED');

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete restrict,
  name text not null,
  public_slug text not null unique,
  status public.restaurant_status not null default 'PENDING_SETUP',
  phone text,
  address text,
  currency text not null default 'UGX',
  timezone text not null default 'Africa/Kampala',
  logo_url text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.platform_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.platform_role not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text not null
);

create table public.platform_role_permissions (
  role public.platform_role not null,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (role, permission_id)
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  preset text,
  created_at timestamptz not null default now(),
  unique (restaurant_id, name)
);

create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  primary key (user_id, restaurant_id, role_id)
);

create table public.registration_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_user_id uuid not null references auth.users(id) on delete restrict,
  business_name text not null,
  public_slug text not null,
  owner_name text not null,
  contact_email text not null,
  contact_phone text,
  status public.application_status not null default 'PENDING_VERIFICATION',
  decision_reason text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (public_slug)
);

create table public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  monthly_price numeric(12, 2) not null default 0 check (monthly_price >= 0),
  annual_price numeric(12, 2) not null default 0 check (annual_price >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.plan_entitlements (
  plan_id uuid not null references public.subscription_plans(id) on delete cascade,
  feature_code text not null,
  enabled boolean not null default false,
  limit_value integer check (limit_value is null or limit_value >= 0),
  primary key (plan_id, feature_code)
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete restrict,
  plan_id uuid not null references public.subscription_plans(id) on delete restrict,
  status public.subscription_status not null,
  starts_at timestamptz not null default now(),
  current_period_end timestamptz,
  trial_ends_at timestamptz,
  cancelled_at timestamptz,
  provider_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index subscriptions_one_current_per_restaurant
  on public.subscriptions (restaurant_id)
  where status in ('TRIAL', 'ACTIVE', 'PAST_DUE', 'GRACE_PERIOD');

create table public.subscription_invoices (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete restrict,
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'UGX',
  status text not null default 'OPEN',
  due_at timestamptz,
  paid_at timestamptz,
  provider_reference text,
  created_at timestamptz not null default now()
);

create table public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.subscription_invoices(id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'UGX',
  status public.payment_status not null default 'PENDING',
  provider_reference text unique,
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  description text,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, name)
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  category_id uuid not null references public.menu_categories(id) on delete restrict,
  name text not null,
  description text,
  image_url text,
  price numeric(12, 2) not null check (price >= 0),
  is_available boolean not null default true,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  capacity integer not null default 1 check (capacity > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (restaurant_id, name)
);

create table public.seats (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  table_id uuid not null references public.restaurant_tables(id) on delete restrict,
  name text not null,
  is_active boolean not null default true,
  unique (restaurant_id, table_id, name)
);

create table public.qr_codes (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  table_id uuid references public.restaurant_tables(id) on delete restrict,
  seat_id uuid references public.seats(id) on delete restrict,
  token_hash text not null unique,
  is_active boolean not null default true,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete restrict,
  order_reference text not null,
  order_type public.order_type not null,
  status public.order_status not null default 'RECEIVED',
  table_id uuid references public.restaurant_tables(id) on delete restrict,
  seat_id uuid references public.seats(id) on delete restrict,
  customer_name text,
  customer_phone text,
  notes text,
  subtotal numeric(12, 2) not null default 0 check (subtotal >= 0),
  total numeric(12, 2) not null default 0 check (total >= 0),
  accepted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, order_reference)
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  menu_item_id uuid not null references public.menu_items(id) on delete restrict,
  item_name text not null,
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  line_total numeric(12, 2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  method public.payment_method not null,
  status public.payment_status not null default 'PENDING',
  provider_reference text unique,
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  event_type text not null,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index user_roles_restaurant_idx on public.user_roles (restaurant_id, user_id);
create index menu_items_restaurant_idx on public.menu_items (restaurant_id);
create index orders_restaurant_created_idx on public.orders (restaurant_id, created_at desc);
create index payments_restaurant_order_idx on public.payments (restaurant_id, order_id);
create index audit_logs_restaurant_created_idx on public.audit_logs (restaurant_id, created_at desc);
create index notifications_recipient_idx on public.notifications (recipient_user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'restaurants',
    'profiles',
    'platform_users',
    'roles',
    'registration_applications',
    'subscriptions',
    'menu_categories',
    'menu_items',
    'orders'
  ]
  loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      table_name || '_set_updated_at',
      table_name
    );
  end loop;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_platform_user(required_role public.platform_role default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_users
    where user_id = auth.uid()
      and is_active
      and (required_role is null or role = required_role or role = 'SUPER_ADMIN')
  );
$$;

create or replace function public.is_tenant_member(target_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and restaurant_id = target_restaurant_id
  )
  or exists (
    select 1
    from public.restaurants
    where id = target_restaurant_id
      and owner_user_id = auth.uid()
  );
$$;

create or replace function public.has_tenant_permission(
  target_restaurant_id uuid,
  required_permission text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_user()
  or exists (
    select 1
    from public.restaurants r
    where r.id = target_restaurant_id
      and r.owner_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    join public.permissions p on p.id = rp.permission_id
    where ur.user_id = auth.uid()
      and ur.restaurant_id = target_restaurant_id
      and p.code = required_permission
  );
$$;

create or replace function public.is_order_owner(target_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.orders
    where id = target_order_id
      and public.is_tenant_member(restaurant_id)
  );
$$;

insert into public.permissions (code, description) values
  ('platform.overview.view', 'View the FairPrice platform overview'),
  ('platform.revenue.view', 'View FairPrice subscription revenue'),
  ('registrations.view', 'View registration applications'),
  ('registrations.decide', 'Approve, reject or request registration information'),
  ('tenants.view', 'View tenant accounts'),
  ('tenants.suspend', 'Suspend tenant accounts'),
  ('tenants.reinstate', 'Reinstate tenant accounts'),
  ('subscriptions.view', 'View tenant subscriptions'),
  ('billing.view', 'View platform billing'),
  ('platform_users.manage', 'Manage platform users and permissions'),
  ('support.tickets.manage', 'Manage support tickets'),
  ('support.access.request', 'Request support access to tenant data'),
  ('support.access.approve', 'Approve support access requests'),
  ('health.view', 'View platform health'),
  ('audit.view', 'View platform audit logs'),
  ('orders.view', 'View current orders'),
  ('orders.accept', 'Accept incoming orders'),
  ('orders.reject', 'Reject incoming orders'),
  ('orders.update_status', 'Update permitted order states'),
  ('orders.view_history', 'View order history'),
  ('orders.cancel', 'Cancel accepted orders'),
  ('customers.lookup', 'Look up customer order records'),
  ('tables.view', 'View tables and seats'),
  ('tables.manage', 'Manage tables and seats'),
  ('payments.view', 'View payment status'),
  ('payments.record_physical', 'Record physical payments'),
  ('menu.view', 'View the menu'),
  ('menu.manage', 'Manage menu items and categories'),
  ('menu.set_availability', 'Change item availability'),
  ('staff.view', 'View staff'),
  ('staff.invite', 'Invite staff'),
  ('staff.deactivate', 'Deactivate staff'),
  ('reports.view_operations', 'View operational reports'),
  ('reports.view_sales', 'View sales reports'),
  ('reports.export', 'Export reports'),
  ('settings.manage', 'Manage restaurant settings')
on conflict (code) do nothing;

insert into public.platform_role_permissions (role, permission_id)
select 'SUPER_ADMIN'::public.platform_role, id
from public.permissions
where code in (
  'platform.overview.view', 'platform.revenue.view', 'registrations.view',
  'registrations.decide', 'tenants.view', 'tenants.suspend',
  'tenants.reinstate', 'subscriptions.view', 'billing.view',
  'platform_users.manage', 'support.tickets.manage',
  'support.access.request', 'support.access.approve', 'health.view',
  'audit.view'
)
on conflict do nothing;

insert into public.platform_role_permissions (role, permission_id)
select 'PLATFORM_ADMIN'::public.platform_role, id
from public.permissions
where code in (
  'platform.overview.view', 'registrations.view', 'registrations.decide',
  'tenants.view', 'tenants.suspend', 'tenants.reinstate',
  'subscriptions.view', 'support.tickets.manage', 'health.view', 'audit.view'
)
on conflict do nothing;

insert into public.platform_role_permissions (role, permission_id)
select 'SUPPORT_STAFF'::public.platform_role, id
from public.permissions
where code in ('platform.overview.view', 'tenants.view', 'support.tickets.manage')
on conflict do nothing;

alter table public.restaurants enable row level security;
alter table public.profiles enable row level security;
alter table public.platform_users enable row level security;
alter table public.permissions enable row level security;
alter table public.platform_role_permissions enable row level security;
alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;
alter table public.registration_applications enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.plan_entitlements enable row level security;
alter table public.subscriptions enable row level security;
alter table public.subscription_invoices enable row level security;
alter table public.subscription_payments enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.restaurant_tables enable row level security;
alter table public.seats enable row level security;
alter table public.qr_codes enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.audit_logs enable row level security;
alter table public.notifications enable row level security;

create policy "users can view their profile"
  on public.profiles for select using (id = auth.uid());
create policy "users can update their profile"
  on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "members can view their restaurants"
  on public.restaurants for select using (owner_user_id = auth.uid() or public.is_tenant_member(id));
create policy "owners can update their restaurant"
  on public.restaurants for update using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());
create policy "platform users can manage restaurants"
  on public.restaurants for all using (public.is_platform_user()) with check (public.is_platform_user());

create policy "platform users can view platform users"
  on public.platform_users for select using (public.is_platform_user());
create policy "super admins can manage platform users"
  on public.platform_users for all using (public.is_platform_user('SUPER_ADMIN')) with check (public.is_platform_user('SUPER_ADMIN'));

create policy "authenticated users can view permissions"
  on public.permissions for select to authenticated using (true);

create policy "members can view roles"
  on public.roles for select using (public.is_tenant_member(restaurant_id));
create policy "owners can manage roles"
  on public.roles for all using (
    exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_user_id = auth.uid())
  ) with check (
    exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_user_id = auth.uid())
  );

create policy "members can view role permissions"
  on public.role_permissions for select using (
    exists (select 1 from public.roles r where r.id = role_id and public.is_tenant_member(r.restaurant_id))
  );
create policy "owners can manage role permissions"
  on public.role_permissions for all using (
    exists (
      select 1 from public.roles r
      join public.restaurants rest on rest.id = r.restaurant_id
      where r.id = role_id and rest.owner_user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.roles r
      join public.restaurants rest on rest.id = r.restaurant_id
      where r.id = role_id and rest.owner_user_id = auth.uid()
    )
  );

create policy "members can view user roles"
  on public.user_roles for select using (public.is_tenant_member(restaurant_id));
create policy "owners can manage user roles"
  on public.user_roles for all using (
    exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_user_id = auth.uid())
  ) with check (
    exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_user_id = auth.uid())
  );

create policy "applicants can view their applications"
  on public.registration_applications for select using (applicant_user_id = auth.uid());
create policy "applicants can create applications"
  on public.registration_applications for insert with check (applicant_user_id = auth.uid());
create policy "platform admins can manage applications"
  on public.registration_applications for all using (public.is_platform_user()) with check (public.is_platform_user());

create policy "authenticated users can view active plans"
  on public.subscription_plans for select to authenticated using (is_active or public.is_platform_user());
create policy "platform users can manage plans"
  on public.subscription_plans for all using (public.is_platform_user()) with check (public.is_platform_user());
create policy "authenticated users can view plan entitlements"
  on public.plan_entitlements for select to authenticated using (true);
create policy "platform users can manage plan entitlements"
  on public.plan_entitlements for all using (public.is_platform_user()) with check (public.is_platform_user());

create policy "members can view subscriptions"
  on public.subscriptions for select using (public.is_tenant_member(restaurant_id));
create policy "platform users can manage subscriptions"
  on public.subscriptions for all using (public.is_platform_user()) with check (public.is_platform_user());
create policy "members can view invoices"
  on public.subscription_invoices for select using (
    exists (select 1 from public.subscriptions s where s.id = subscription_id and public.is_tenant_member(s.restaurant_id))
  );
create policy "platform users can manage invoices"
  on public.subscription_invoices for all using (public.is_platform_user()) with check (public.is_platform_user());
create policy "members can view subscription payments"
  on public.subscription_payments for select using (
    exists (
      select 1 from public.subscription_invoices i
      join public.subscriptions s on s.id = i.subscription_id
      where i.id = invoice_id and public.is_tenant_member(s.restaurant_id)
    )
  );
create policy "platform users can manage subscription payments"
  on public.subscription_payments for all using (public.is_platform_user()) with check (public.is_platform_user());

create policy "public can view published menu categories"
  on public.menu_categories for select using (
    is_published and exists (
      select 1 from public.restaurants r where r.id = restaurant_id and r.status = 'ACTIVE'
    )
  );
create policy "members can view menu categories"
  on public.menu_categories for select using (public.is_tenant_member(restaurant_id));
create policy "owners can manage menu categories"
  on public.menu_categories for all using (public.has_tenant_permission(restaurant_id, 'menu.manage'))
  with check (public.has_tenant_permission(restaurant_id, 'menu.manage'));

create policy "public can view published menu items"
  on public.menu_items for select using (
    is_published and is_available and exists (
      select 1 from public.restaurants r where r.id = restaurant_id and r.status = 'ACTIVE'
    )
  );
create policy "members can view menu items"
  on public.menu_items for select using (public.is_tenant_member(restaurant_id));
create policy "authorized users can manage menu items"
  on public.menu_items for all using (public.has_tenant_permission(restaurant_id, 'menu.manage'))
  with check (public.has_tenant_permission(restaurant_id, 'menu.manage'));

create policy "members can view tables"
  on public.restaurant_tables for select using (public.is_tenant_member(restaurant_id));
create policy "authorized users can manage tables"
  on public.restaurant_tables for all using (public.has_tenant_permission(restaurant_id, 'tables.manage'))
  with check (public.has_tenant_permission(restaurant_id, 'tables.manage'));
create policy "members can view seats"
  on public.seats for select using (public.is_tenant_member(restaurant_id));
create policy "authorized users can manage seats"
  on public.seats for all using (public.has_tenant_permission(restaurant_id, 'tables.manage'))
  with check (public.has_tenant_permission(restaurant_id, 'tables.manage'));
create policy "members can view qr codes"
  on public.qr_codes for select using (public.is_tenant_member(restaurant_id));
create policy "owners can manage qr codes"
  on public.qr_codes for all using (public.is_tenant_member(restaurant_id))
  with check (public.is_tenant_member(restaurant_id));

create policy "members can view orders"
  on public.orders for select using (public.has_tenant_permission(restaurant_id, 'orders.view'));
create policy "members can create orders"
  on public.orders for insert with check (
    exists (select 1 from public.restaurants r where r.id = restaurant_id and r.status = 'ACTIVE')
  );
create policy "authorized users can update orders"
  on public.orders for update using (public.has_tenant_permission(restaurant_id, 'orders.update_status'))
  with check (public.has_tenant_permission(restaurant_id, 'orders.update_status'));
create policy "authorized users can delete orders"
  on public.orders for delete using (public.has_tenant_permission(restaurant_id, 'orders.cancel'));

create policy "members can view order items"
  on public.order_items for select using (public.is_order_owner(order_id));
create policy "members can create order items"
  on public.order_items for insert with check (public.is_order_owner(order_id));
create policy "members can view payments"
  on public.payments for select using (public.has_tenant_permission(restaurant_id, 'payments.view'));
create policy "authorized users can create payments"
  on public.payments for insert with check (public.has_tenant_permission(restaurant_id, 'payments.record_physical'));
create policy "authorized users can update payments"
  on public.payments for update using (public.has_tenant_permission(restaurant_id, 'payments.record_physical'))
  with check (public.has_tenant_permission(restaurant_id, 'payments.record_physical'));

create policy "members can view audit logs"
  on public.audit_logs for select using (public.is_tenant_member(restaurant_id));
create policy "platform users can view all audit logs"
  on public.audit_logs for select using (public.is_platform_user());
create policy "authenticated users can create audit logs"
  on public.audit_logs for insert with check (actor_user_id = auth.uid());

create policy "users can view their notifications"
  on public.notifications for select using (recipient_user_id = auth.uid());
create policy "users can update their notifications"
  on public.notifications for update using (recipient_user_id = auth.uid())
  with check (recipient_user_id = auth.uid());

grant usage on schema public to anon, authenticated;
grant select on public.menu_categories, public.menu_items to anon;
grant select, insert on public.registration_applications to authenticated;
grant select on public.permissions, public.subscription_plans, public.plan_entitlements to authenticated;
grant select on public.permissions, public.menu_categories, public.menu_items to anon;
