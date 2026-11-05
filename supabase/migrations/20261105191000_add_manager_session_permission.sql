insert into public.permissions (code, description)
values ('tables.update_session', 'Update table and seat session states')
on conflict (code) do nothing;
