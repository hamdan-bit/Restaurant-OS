create or replace function public.update_manager_invitation(
  invitation_id uuid,
  manager_name text,
  manager_preset text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  restaurant_id_value uuid;
begin
  if manager_preset not in ('FLOOR_MANAGER', 'SHIFT_LEAD', 'SENIOR_MANAGER') then
    raise exception 'Invalid manager permission preset';
  end if;
  if nullif(trim(manager_name), '') is null then
    raise exception 'Manager name is required';
  end if;

  update public.manager_invitations mi
  set full_name = trim(manager_name), preset = manager_preset
  from public.restaurants r
  where mi.id = invitation_id
    and mi.restaurant_id = r.id
    and r.owner_user_id = auth.uid()
    and mi.status = 'PENDING'
  returning mi.restaurant_id into restaurant_id_value;

  if restaurant_id_value is null then
    raise exception 'Pending invitation not found or already finalized';
  end if;

  insert into public.audit_logs (restaurant_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (
    restaurant_id_value, auth.uid(), 'manager.invitation_updated',
    'manager_invitation', invitation_id,
    jsonb_build_object('preset', manager_preset)
  );
end;
$$;

create or replace function public.remove_manager_access(
  target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  restaurant_id_value uuid;
begin
  if target_user_id = auth.uid() then
    raise exception 'The restaurant owner cannot remove their own access';
  end if;

  select r.id into restaurant_id_value
  from public.restaurants r
  where r.owner_user_id = auth.uid()
    and exists (
      select 1 from public.user_roles ur
      where ur.restaurant_id = r.id and ur.user_id = target_user_id
    )
  limit 1;

  if restaurant_id_value is null then
    raise exception 'Staff member not found in your restaurant';
  end if;

  delete from public.user_roles
  where restaurant_id = restaurant_id_value
    and user_id = target_user_id;

  update public.manager_invitations
  set status = 'REVOKED', revoked_at = coalesce(revoked_at, now())
  where restaurant_id = restaurant_id_value
    and invited_user_id = target_user_id
    and status = 'ACCEPTED';

  insert into public.audit_logs (restaurant_id, actor_user_id, action, entity_type, entity_id)
  values (restaurant_id_value, auth.uid(), 'manager.access_removed', 'user', target_user_id);
end;
$$;

revoke all on function public.update_manager_invitation(uuid, text, text) from public;
revoke all on function public.remove_manager_access(uuid) from public;
grant execute on function public.update_manager_invitation(uuid, text, text) to authenticated;
grant execute on function public.remove_manager_access(uuid) to authenticated;
