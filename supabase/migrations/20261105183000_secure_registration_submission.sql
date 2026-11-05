create or replace function public.create_registration_application(
  business_name text,
  public_slug text,
  owner_name text,
  contact_email text,
  contact_phone text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  created_application_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  if nullif(trim(business_name), '') is null
    or nullif(trim(public_slug), '') is null
    or nullif(trim(owner_name), '') is null
    or nullif(trim(contact_email), '') is null then
    raise exception 'Business, owner and contact details are required';
  end if;

  insert into public.registration_applications (
    applicant_user_id,
    business_name,
    public_slug,
    owner_name,
    contact_email,
    contact_phone
  )
  values (
    auth.uid(),
    trim(business_name),
    lower(trim(public_slug)),
    trim(owner_name),
    lower(trim(contact_email)),
    nullif(trim(contact_phone), '')
  )
  returning id into created_application_id;

  return created_application_id;
exception
  when unique_violation then
    raise exception 'A registration already uses this public slug';
end;
$$;

create or replace function public.submit_registration_application(
  application_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  if not exists (
    select 1
    from auth.users
    where id = auth.uid()
      and email_confirmed_at is not null
  ) then
    raise exception 'Contact verification is required before submission';
  end if;

  update public.registration_applications
  set
    status = 'PENDING_APPROVAL',
    reviewed_by = null,
    reviewed_at = null,
    decision_reason = null
  where id = application_id
    and applicant_user_id = auth.uid()
    and status in ('PENDING_VERIFICATION', 'MORE_INFORMATION_REQUIRED');

  if not found then
    raise exception 'Registration application cannot be submitted';
  end if;
end;
$$;

revoke all on function public.create_registration_application(text, text, text, text, text) from public;
revoke all on function public.submit_registration_application(uuid) from public;
grant execute on function public.create_registration_application(text, text, text, text, text) to authenticated;
grant execute on function public.submit_registration_application(uuid) to authenticated;

drop policy if exists "applicants can create applications"
  on public.registration_applications;
