insert into storage.buckets (id, name, public)
values ('menu-images', 'menu-images', true)
on conflict (id) do update set public = excluded.public;

create policy "public can view menu images"
  on storage.objects for select
  using (bucket_id = 'menu-images');

create policy "authorized users can upload menu images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'menu-images'
    and public.has_tenant_permission(
      ((storage.foldername(name))[1])::uuid,
      'menu.manage'
    )
  );

create policy "authorized users can update menu images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'menu-images'
    and public.has_tenant_permission(
      ((storage.foldername(name))[1])::uuid,
      'menu.manage'
    )
  )
  with check (
    bucket_id = 'menu-images'
    and public.has_tenant_permission(
      ((storage.foldername(name))[1])::uuid,
      'menu.manage'
    )
  );
