create or replace function public.approve_registration_application(
  application_id uuid,
  selected_plan_id uuid default null,
  trial_days integer default 0
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  application_record public.registration_applications%rowtype;
  created_restaurant_id uuid;
  owner_role_id uuid;
begin
  if not public.is_platform_user('PLATFORM_ADMIN') then
    raise exception 'Only a platform administrator can approve registrations';
  end if;

  if trial_days < 0 or trial_days > 365 then
    raise exception 'Trial duration must be between 0 and 365 days';
  end if;

  if selected_plan_id is not null and not exists (
    select 1
    from public.subscription_plans
    where id = selected_plan_id
      and is_active
  ) then
    raise exception 'Selected subscription plan is not active';
  end if;

  select *
  into application_record
  from public.registration_applications
  where id = application_id
  for update;

  if not found then
    raise exception 'Registration application not found';
  end if;

  if application_record.status not in ('PENDING_APPROVAL', 'MORE_INFORMATION_REQUIRED') then
    raise exception 'Registration application is not awaiting approval';
  end if;

  if exists (
    select 1
    from public.restaurants
    where public_slug = application_record.public_slug
  ) then
    raise exception 'A restaurant already uses this public slug';
  end if;

  insert into public.restaurants (
    owner_user_id,
    name,
    public_slug,
    phone
  )
  values (
    application_record.applicant_user_id,
    application_record.business_name,
    application_record.public_slug,
    application_record.contact_phone
  )
  returning id into created_restaurant_id;

  insert into public.roles (restaurant_id, name, preset)
  values (created_restaurant_id, 'Owner', 'OWNER')
  returning id into owner_role_id;

  insert into public.user_roles (user_id, restaurant_id, role_id)
  values (
    application_record.applicant_user_id,
    created_restaurant_id,
    owner_role_id
  );

  if selected_plan_id is not null then
    insert into public.subscriptions (
      restaurant_id,
      plan_id,
      status,
      trial_ends_at,
      current_period_end
    )
    values (
      created_restaurant_id,
      selected_plan_id,
      case when trial_days > 0 then 'TRIAL'::public.subscription_status
        else 'ACTIVE'::public.subscription_status
      end,
      case when trial_days > 0 then now() + make_interval(days => trial_days) end,
      now() + interval '1 month'
    );
  end if;

  update public.registration_applications
  set
    status = 'APPROVED',
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    decision_reason = null
  where id = application_id;

  insert into public.audit_logs (
    restaurant_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    created_restaurant_id,
    auth.uid(),
    'registration.approved',
    'registration_application',
    application_id,
    jsonb_build_object(
      'selected_plan_id', selected_plan_id,
      'trial_days', trial_days
    )
  );

  return created_restaurant_id;
end;
$$;

create or replace function public.reject_registration_application(
  application_id uuid,
  reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_user('PLATFORM_ADMIN') then
    raise exception 'Only a platform administrator can reject registrations';
  end if;

  if nullif(trim(reason), '') is null then
    raise exception 'A rejection reason is required';
  end if;

  update public.registration_applications
  set
    status = 'REJECTED',
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    decision_reason = trim(reason)
  where id = application_id
    and status in ('PENDING_APPROVAL', 'MORE_INFORMATION_REQUIRED');

  if not found then
    raise exception 'Registration application is not awaiting rejection';
  end if;
end;
$$;

create or replace function public.request_registration_information(
  application_id uuid,
  reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_user('PLATFORM_ADMIN') then
    raise exception 'Only a platform administrator can request information';
  end if;

  if nullif(trim(reason), '') is null then
    raise exception 'A request reason is required';
  end if;

  update public.registration_applications
  set
    status = 'MORE_INFORMATION_REQUIRED',
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    decision_reason = trim(reason)
  where id = application_id
    and status in ('PENDING_APPROVAL', 'MORE_INFORMATION_REQUIRED');

  if not found then
    raise exception 'Registration application is not awaiting information';
  end if;
end;
$$;

revoke all on function public.approve_registration_application(uuid, uuid, integer) from public;
revoke all on function public.reject_registration_application(uuid, text) from public;
revoke all on function public.request_registration_information(uuid, text) from public;
grant execute on function public.approve_registration_application(uuid, uuid, integer) to authenticated;
grant execute on function public.reject_registration_application(uuid, text) to authenticated;
grant execute on function public.request_registration_information(uuid, text) to authenticated;

drop policy if exists "platform admins can manage applications"
  on public.registration_applications;

create policy "platform administrators can manage applications"
  on public.registration_applications
  for all
  using (public.is_platform_user('PLATFORM_ADMIN'))
  with check (public.is_platform_user('PLATFORM_ADMIN'));
