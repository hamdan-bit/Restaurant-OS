create table public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider_event_id text not null unique,
  provider_reference text,
  payment_id uuid references public.payments(id) on delete set null,
  event_status text not null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz not null default now()
);

create index payment_webhook_events_reference_idx
  on public.payment_webhook_events (provider_reference);

alter table public.payment_webhook_events enable row level security;

alter table public.payments
  add constraint payments_provider_reference_not_blank
  check (provider_reference is null or length(trim(provider_reference)) > 0);

create or replace function public.reconcile_remote_payment(
  webhook_event_id text,
  webhook_provider_reference text,
  order_reference_value text,
  webhook_status text,
  webhook_amount numeric,
  webhook_currency text,
  webhook_payload jsonb default '{}'::jsonb
)
returns table (
  payment_id uuid,
  order_id uuid,
  payment_status public.payment_status,
  order_status public.order_status,
  already_processed boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  payment_record public.payments%rowtype;
  order_record public.orders%rowtype;
  restaurant_record public.restaurants%rowtype;
  existing_event public.payment_webhook_events%rowtype;
  normalized_status text := lower(trim(webhook_status));
begin
  if nullif(trim(webhook_event_id), '') is null
    or nullif(trim(webhook_provider_reference), '') is null
    or nullif(trim(order_reference_value), '') is null then
    raise exception 'Payment event, provider reference and order reference are required';
  end if;

  if normalized_status not in ('succeeded', 'paid', 'failed', 'cancelled') then
    raise exception 'Unsupported payment status';
  end if;

  if webhook_amount is null or webhook_amount <= 0 then
    raise exception 'Payment amount must be greater than zero';
  end if;

  select *
  into existing_event
  from public.payment_webhook_events
  where provider_event_id = trim(webhook_event_id);

  if found then
    return query
    select
      p.id,
      o.id,
      p.status,
      o.status,
      true
    from public.payment_webhook_events e
    join public.payments p on p.id = e.payment_id
    join public.orders o on o.id = p.order_id
    where e.id = existing_event.id;
    return;
  end if;

  select p.*
  into payment_record
  from public.payments p
  join public.orders o on o.id = p.order_id
  where o.order_reference = trim(order_reference_value)
    and o.order_type = 'REMOTE'
    and p.status = 'PENDING'
  order by p.created_at
  limit 1
  for update of p;

  if not found then
    raise exception 'Pending remote payment was not found';
  end if;

  select *
  into order_record
  from public.orders
  where id = payment_record.order_id
  for update;

  select *
  into restaurant_record
  from public.restaurants
  where id = payment_record.restaurant_id;

  if webhook_amount <> payment_record.amount
    or webhook_amount <> order_record.total then
    raise exception 'Payment amount does not match the order total';
  end if;

  if upper(trim(webhook_currency)) <> upper(trim(restaurant_record.currency)) then
    raise exception 'Payment currency does not match the restaurant currency';
  end if;

  if exists (
    select 1
    from public.payments
    where provider_reference = trim(webhook_provider_reference)
      and id <> payment_record.id
  ) then
    raise exception 'Provider reference is already linked to another payment';
  end if;

  insert into public.payment_webhook_events (
    provider_event_id,
    provider_reference,
    payment_id,
    event_status,
    payload
  )
  values (
    trim(webhook_event_id),
    trim(webhook_provider_reference),
    payment_record.id,
    normalized_status,
    coalesce(webhook_payload, '{}'::jsonb)
  );

  update public.payments
  set
    provider_reference = trim(webhook_provider_reference),
    status = case
      when normalized_status in ('succeeded', 'paid')
        then 'CONFIRMED'::public.payment_status
      else 'FAILED'::public.payment_status
    end,
    confirmed_at = case
      when normalized_status in ('succeeded', 'paid') then now()
      else null
    end
  where id = payment_record.id;

  insert into public.audit_logs (
    restaurant_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    payment_record.restaurant_id,
    'payment.webhook_reconciled',
    'payment',
    payment_record.id,
    jsonb_build_object(
      'provider_event_id', trim(webhook_event_id),
      'provider_reference', trim(webhook_provider_reference),
      'status', normalized_status
    )
  );

  return query
  select
    p.id,
    o.id,
    p.status,
    o.status,
    false
  from public.payments p
  join public.orders o on o.id = p.order_id
  where p.id = payment_record.id;
end;
$$;

create or replace function public.prevent_unpaid_remote_order_acceptance()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.order_type = 'REMOTE'
    and new.status in ('ACCEPTED', 'PREPARING', 'READY', 'COLLECTED')
    and not exists (
      select 1
      from public.payments p
      where p.order_id = new.id
        and p.status = 'CONFIRMED'
    ) then
    raise exception 'Remote orders require confirmed payment before preparation';
  end if;
  return new;
end;
$$;

create trigger orders_require_remote_payment
  before update on public.orders
  for each row execute function public.prevent_unpaid_remote_order_acceptance();

create or replace function public.prevent_payment_overpayment()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  order_total numeric;
  confirmed_total numeric;
begin
  if new.status = 'CONFIRMED' then
    select total into order_total
    from public.orders
    where id = new.order_id
      and restaurant_id = new.restaurant_id;

    select coalesce(sum(amount), 0)
    into confirmed_total
    from public.payments
    where order_id = new.order_id
      and status = 'CONFIRMED'
      and id <> new.id;

    if confirmed_total + new.amount > order_total then
      raise exception 'Payment would overpay the order';
    end if;
  end if;
  return new;
end;
$$;

create trigger payments_reject_overpayment
  before insert or update on public.payments
  for each row execute function public.prevent_payment_overpayment();

revoke all on function public.reconcile_remote_payment(
  text, text, text, text, numeric, text, jsonb
) from public;
grant execute on function public.reconcile_remote_payment(
  text, text, text, text, numeric, text, jsonb
) to anon;
