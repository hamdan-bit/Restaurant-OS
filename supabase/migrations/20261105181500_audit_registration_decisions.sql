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

  insert into public.audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    auth.uid(),
    'registration.rejected',
    'registration_application',
    application_id,
    jsonb_build_object('reason', trim(reason))
  );
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

  insert into public.audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    auth.uid(),
    'registration.more_information_requested',
    'registration_application',
    application_id,
    jsonb_build_object('reason', trim(reason))
  );
end;
$$;
