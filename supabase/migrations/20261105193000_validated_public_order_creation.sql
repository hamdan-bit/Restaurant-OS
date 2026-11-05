create or replace function public.create_public_order(
  restaurant_slug text,
  requested_order_type public.order_type,
  requested_items jsonb,
  requested_qr_token text default null,
  requested_table_id uuid default null,
  requested_seat_id uuid default null,
  requested_customer_name text default null,
  requested_customer_phone text default null,
  requested_notes text default null
)
returns table (
  order_id uuid,
  order_reference text,
  order_total numeric,
  payment_required boolean
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  restaurant_record public.restaurants%rowtype;
  item_record record;
  created_order_id uuid;
  generated_reference text;
  calculated_total numeric(12, 2) := 0;
  item_count integer := 0;
  payment_is_required boolean := false;
  qr_restaurant_id uuid;
  qr_table_id uuid;
  qr_seat_id uuid;
  current_subscription public.subscriptions%rowtype;
  remote_ordering_enabled boolean := false;
begin
  if nullif(trim(restaurant_slug), '') is null then
    raise exception 'Restaurant slug is required';
  end if;

  if requested_items is null
    or jsonb_typeof(requested_items) <> 'array'
    or jsonb_array_length(requested_items) = 0 then
    raise exception 'At least one order item is required';
  end if;

  if jsonb_array_length(requested_items) > 50 then
    raise exception 'An order cannot contain more than 50 lines';
  end if;

  select *
  into restaurant_record
  from public.restaurants
  where public_slug = lower(trim(restaurant_slug))
    and status = 'ACTIVE';

  if not found then
    raise exception 'Restaurant is not available for ordering';
  end if;

  if requested_order_type = 'DINE_IN' then
    if requested_qr_token is null
      or requested_table_id is null
      or requested_seat_id is null then
      raise exception 'A valid table QR context is required for dine-in orders';
    end if;

    select q.restaurant_id, q.table_id, q.seat_id
    into qr_restaurant_id, qr_table_id, qr_seat_id
    from public.qr_codes q
    where q.restaurant_id = restaurant_record.id
      and q.token_hash = encode(digest(requested_qr_token, 'sha256'), 'hex')
      and q.is_active
      and q.revoked_at is null
      and q.table_id = requested_table_id
      and q.seat_id = requested_seat_id;

    if not found then
      raise exception 'QR code or seating context is invalid';
    end if;

    if not exists (
      select 1
      from public.restaurant_tables t
      join public.seats s on s.table_id = t.id
      where t.id = requested_table_id
        and s.id = requested_seat_id
        and t.restaurant_id = restaurant_record.id
        and s.restaurant_id = restaurant_record.id
        and t.is_active
        and s.is_active
    ) then
      raise exception 'Table or seat is not accepting orders';
    end if;
  elsif requested_order_type = 'REMOTE' then
    if nullif(trim(requested_customer_name), '') is null
      or nullif(trim(requested_customer_phone), '') is null then
      raise exception 'Customer name and phone are required for remote orders';
    end if;

    select *
    into current_subscription
    from public.subscriptions
    where restaurant_id = restaurant_record.id
      and status in ('TRIAL', 'ACTIVE', 'PAST_DUE', 'GRACE_PERIOD')
    order by created_at desc
    limit 1;

    if not found then
      raise exception 'Remote ordering is not available for this restaurant';
    end if;

    select coalesce(pe.enabled, false)
    into remote_ordering_enabled
    from public.plan_entitlements pe
    where pe.plan_id = current_subscription.plan_id
      and pe.feature_code = 'remote_ordering';

    if not remote_ordering_enabled then
      raise exception 'Remote ordering is not available for this restaurant';
    end if;

    payment_is_required := true;
  else
    raise exception 'Unsupported order type';
  end if;

  for item_record in
    select
      (line ->> 'menu_item_id')::uuid as menu_item_id,
      (line ->> 'quantity')::integer as quantity
    from jsonb_array_elements(requested_items) as lines(line)
  loop
    if item_record.menu_item_id is null
      or item_record.quantity is null
      or item_record.quantity < 1
      or item_record.quantity > 99 then
      raise exception 'Each item must have a valid menu item and quantity';
    end if;

    if exists (
      select 1
      from jsonb_array_elements(requested_items) as lines(line)
      where (line ->> 'menu_item_id')::uuid = item_record.menu_item_id
      group by (line ->> 'menu_item_id')
      having count(*) > 1
    ) then
      raise exception 'Duplicate menu items are not allowed';
    end if;

    if not exists (
      select 1
      from public.menu_items mi
      join public.menu_categories mc on mc.id = mi.category_id
      where mi.id = item_record.menu_item_id
        and mi.restaurant_id = restaurant_record.id
        and mi.is_published
        and mi.is_available
        and mc.restaurant_id = restaurant_record.id
        and mc.is_published
    ) then
      raise exception 'One or more menu items are unavailable';
    end if;

    item_count := item_count + 1;
    calculated_total := calculated_total + (
      select mi.price * item_record.quantity
      from public.menu_items mi
      where mi.id = item_record.menu_item_id
        and mi.restaurant_id = restaurant_record.id
    );
  end loop;

  if item_count = 0 or calculated_total <= 0 then
    raise exception 'Order total must be greater than zero';
  end if;

  generated_reference := 'FP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.orders (
    restaurant_id,
    order_reference,
    order_type,
    status,
    table_id,
    seat_id,
    customer_name,
    customer_phone,
    notes,
    subtotal,
    total
  )
  values (
    restaurant_record.id,
    generated_reference,
    requested_order_type,
    'RECEIVED',
    case when requested_order_type = 'DINE_IN' then requested_table_id end,
    case when requested_order_type = 'DINE_IN' then requested_seat_id end,
    nullif(trim(requested_customer_name), ''),
    nullif(trim(requested_customer_phone), ''),
    nullif(trim(requested_notes), ''),
    calculated_total,
    calculated_total
  )
  returning id into created_order_id;

  insert into public.order_items (
    restaurant_id,
    order_id,
    menu_item_id,
    item_name,
    unit_price,
    quantity,
    line_total
  )
  select
    restaurant_record.id,
    created_order_id,
    mi.id,
    mi.name,
    mi.price,
    (line ->> 'quantity')::integer,
    mi.price * (line ->> 'quantity')::integer
  from jsonb_array_elements(requested_items) as lines(line)
  join public.menu_items mi
    on mi.id = (line ->> 'menu_item_id')::uuid
   and mi.restaurant_id = restaurant_record.id;

  if payment_is_required then
    insert into public.payments (
      restaurant_id,
      order_id,
      amount,
      method,
      status
    )
    values (
      restaurant_record.id,
      created_order_id,
      calculated_total,
      'OTHER',
      'PENDING'
    );
  end if;

  return query
  select created_order_id, generated_reference, calculated_total, payment_is_required;
end;
$$;

revoke all on function public.create_public_order(
  text,
  public.order_type,
  jsonb,
  text,
  uuid,
  uuid,
  text,
  text,
  text
) from public;

grant execute on function public.create_public_order(
  text,
  public.order_type,
  jsonb,
  text,
  uuid,
  uuid,
  text,
  text,
  text
) to anon, authenticated;
