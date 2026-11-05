create type public.manager_invitation_status as enum (
  'PENDING',
  'ACCEPTED',
  'REVOKED',
  'EXPIRED'
);

create table public.manager_invitations (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete restrict,
  email text not null,
  full_name text not null,
  preset text not null default 'FLOOR_MANAGER'
    check (preset in ('FLOOR_MANAGER', 'SHIFT_LEAD', 'SENIOR_MANAGER')),
  status public.manager_invitation_status not null default 'PENDING',
  invited_user_id uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index manager_invitations_pending_email_idx
  on public.manager_invitations (restaurant_id, lower(email))
  where status = 'PENDING';

create index manager_invitations_restaurant_idx
  on public.manager_invitations (restaurant_id, created_at desc);

alter table public.manager_invitations enable row level security;

create or replace function public.create_manager_invitation(
  target_restaurant_id uuid,
  manager_email text,
  manager_name text,
  manager_preset text default 'FLOOR_MANAGER'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  if not exists (
    select 1
    from public.restaurants
    where id = target_restaurant_id
      and owner_user_id = auth.uid()
  ) then
    raise exception 'Only the restaurant owner can invite managers';
  end if;

  if nullif(trim(manager_email), '') is null
    or nullif(trim(manager_name), '') is null then
    raise exception 'Manager name and email are required';
  end if;

  if manager_preset not in ('FLOOR_MANAGER', 'SHIFT_LEAD', 'SENIOR_MANAGER') then
    raise exception 'Invalid manager permission preset';
  end if;

  if exists (
    select 1
    from public.user_roles ur
    join auth.users au on au.id = ur.user_id
    where ur.restaurant_id = target_restaurant_id
      and lower(au.email) = lower(trim(manager_email))
  ) then
    raise exception 'This email already belongs to a restaurant user';
  end if;

  insert into public.manager_invitations (
    restaurant_id,
    invited_by,
    email,
    full_name,
    preset
  )
  values (
    target_restaurant_id,
    auth.uid(),
    lower(trim(manager_email)),
    trim(manager_name),
    manager_preset
  )
  returning id into invitation_id;

  insert into public.audit_logs (
    restaurant_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    target_restaurant_id,
    auth.uid(),
    'manager.invitation_created',
    'manager_invitation',
    invitation_id,
    jsonb_build_object('email', lower(trim(manager_email)), 'preset', manager_preset)
  );

  return invitation_id;
exception
  when unique_violation then
    raise exception 'A pending invitation already exists for this email';
end;
$$;

create or replace function public.mark_manager_invitation_failed(
  invitation_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.manager_invitations mi
  set status = 'REVOKED', revoked_at = now()
  where mi.id = invitation_id
    and mi.invited_by = auth.uid()
    and mi.status = 'PENDING';
end;
$$;

create or replace function public.accept_manager_invitation(
  invitation_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation_record public.manager_invitations%rowtype;
  manager_role_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  select *
  into invitation_record
  from public.manager_invitations
  where id = invitation_id
  for update;

  if not found or invitation_record.status <> 'PENDING' then
    raise exception 'This manager invitation is no longer available';
  end if;

  if invitation_record.expires_at <= now() then
    update public.manager_invitations
    set status = 'EXPIRED'
    where id = invitation_id;
    raise exception 'This manager invitation has expired';
  end if;

  if lower(coalesce((select email from auth.users where id = auth.uid()), ''))
      <> lower(invitation_record.email) then
    raise exception 'The signed-in email does not match this invitation';
  end if;

  insert into public.roles (restaurant_id, name, preset)
  values (
    invitation_record.restaurant_id,
    'Manager - ' || invitation_record.preset,
    invitation_record.preset
  )
  on conflict (restaurant_id, name) do update
    set preset = excluded.preset
  returning id into manager_role_id;

  delete from public.role_permissions
  where role_id = manager_role_id;

  insert into public.role_permissions (role_id, permission_id)
  select manager_role_id, p.id
  from public.permissions p
  where p.code in (
    'orders.view',
    'orders.accept',
    'orders.reject',
    'orders.update_status',
    'customers.lookup',
    'tables.view',
    'payments.view',
    'payments.record_physical',
    'menu.view'
  )
  or (
    invitation_record.preset in ('SHIFT_LEAD', 'SENIOR_MANAGER')
    and p.code in (
      'orders.view_history',
      'menu.set_availability',
      'reports.view_operations',
      'tables.update_session'
    )
  )
  or (
    invitation_record.preset = 'SENIOR_MANAGER'
    and p.code in (
      'orders.cancel',
      'reports.view_sales',
      'reports.export',
      'staff.view'
    )
  )
  on conflict do nothing;

  insert into public.user_roles (user_id, restaurant_id, role_id)
  values (auth.uid(), invitation_record.restaurant_id, manager_role_id)
  on conflict do nothing;

  update public.manager_invitations
  set
    status = 'ACCEPTED',
    invited_user_id = auth.uid(),
    accepted_at = now()
  where id = invitation_id;

  insert into public.audit_logs (
    restaurant_id,
    actor_user_id,
    action,
    entity_type,
    entity_id
  )
  values (
    invitation_record.restaurant_id,
    auth.uid(),
    'manager.invitation_accepted',
    'manager_invitation',
    invitation_id
  );

  return invitation_record.restaurant_id;
end;
$$;

create or replace function public.revoke_manager_invitation(
  invitation_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  restaurant_id_value uuid;
begin
  select mi.restaurant_id
  into restaurant_id_value
  from public.manager_invitations mi
  join public.restaurants r on r.id = mi.restaurant_id
  where mi.id = invitation_id
    and r.owner_user_id = auth.uid()
    and mi.status = 'PENDING';

  if restaurant_id_value is null then
    raise exception 'Invitation not found or already finalized';
  end if;

  update public.manager_invitations
  set status = 'REVOKED', revoked_at = now()
  where id = invitation_id;

  insert into public.audit_logs (
    restaurant_id,
    actor_user_id,
    action,
    entity_type,
    entity_id
  )
  values (
    restaurant_id_value,
    auth.uid(),
    'manager.invitation_revoked',
    'manager_invitation',
    invitation_id
  );
end;
$$;

create policy "owners can view manager invitations"
  on public.manager_invitations
  for select using (
    exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id and r.owner_user_id = auth.uid()
    )
    or invited_by = auth.uid()
  );

revoke all on function public.create_manager_invitation(uuid, text, text, text) from public;
revoke all on function public.mark_manager_invitation_failed(uuid) from public;
revoke all on function public.accept_manager_invitation(uuid) from public;
revoke all on function public.revoke_manager_invitation(uuid) from public;
grant execute on function public.create_manager_invitation(uuid, text, text, text) to authenticated;
grant execute on function public.mark_manager_invitation_failed(uuid) to authenticated;
grant execute on function public.accept_manager_invitation(uuid) to authenticated;
grant execute on function public.revoke_manager_invitation(uuid) to authenticated;
