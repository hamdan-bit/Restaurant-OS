create or replace function public.get_public_restaurant(restaurant_slug text)
returns table (
  id uuid,
  name text,
  public_slug text,
  logo_url text,
  address text,
  phone text,
  currency text,
  status public.restaurant_status
)
language sql
security definer
set search_path = public
as $$
  select
    r.id,
    r.name,
    r.public_slug,
    r.logo_url,
    r.address,
    r.phone,
    r.currency,
    r.status
  from public.restaurants r
  where r.public_slug = lower(trim(restaurant_slug))
    and r.status in ('ACTIVE', 'PENDING_SETUP', 'SUSPENDED', 'CLOSED');
$$;

revoke all on function public.get_public_restaurant(text) from public;
grant execute on function public.get_public_restaurant(text) to anon, authenticated;
