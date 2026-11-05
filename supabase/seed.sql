insert into public.subscription_plans
  (name, description, monthly_price, annual_price)
values
  ('Starter', 'Core menu, QR ordering and basic reports', 0, 0),
  ('Professional', 'Advanced reports and expanded manager capacity', 0, 0),
  ('Business', 'Full restaurant operations and future branch support', 0, 0)
on conflict (name) do nothing;

insert into public.plan_entitlements (plan_id, feature_code, enabled, limit_value)
select id, 'digital_menu', true, null
from public.subscription_plans
on conflict (plan_id, feature_code) do nothing;

insert into public.plan_entitlements (plan_id, feature_code, enabled, limit_value)
select id, 'qr_dine_in_ordering', true, null
from public.subscription_plans
on conflict (plan_id, feature_code) do nothing;

insert into public.plan_entitlements (plan_id, feature_code, enabled, limit_value)
select id, 'remote_ordering', name <> 'Starter', null
from public.subscription_plans
on conflict (plan_id, feature_code) do nothing;

insert into public.plan_entitlements (plan_id, feature_code, enabled, limit_value)
select id, 'sales_reports', true, null
from public.subscription_plans
on conflict (plan_id, feature_code) do nothing;

insert into public.plan_entitlements (plan_id, feature_code, enabled, limit_value)
select id, 'advanced_reports', name <> 'Starter', null
from public.subscription_plans
on conflict (plan_id, feature_code) do nothing;

insert into public.plan_entitlements (plan_id, feature_code, enabled, limit_value)
select id, 'manager_accounts', true,
  case name
    when 'Starter' then 2
    when 'Professional' then 5
    else 10
  end
from public.subscription_plans
on conflict (plan_id, feature_code) do nothing;

insert into public.plan_entitlements (plan_id, feature_code, enabled, limit_value)
select id, 'csv_export', name <> 'Starter', null
from public.subscription_plans
on conflict (plan_id, feature_code) do nothing;
