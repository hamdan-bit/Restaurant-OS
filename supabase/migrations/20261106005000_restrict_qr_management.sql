drop policy if exists "owners can manage qr codes" on public.qr_codes;

create policy "owners can manage qr codes"
  on public.qr_codes for all
  using (public.has_tenant_permission(restaurant_id, 'settings.manage'))
  with check (public.has_tenant_permission(restaurant_id, 'settings.manage'));
