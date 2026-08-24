-- ============================================================================
-- remove_hardcoded_admin_bootstrap.sql — audit follow-up 2026-08-24
--
-- Removes automatic admin grants by hardcoded email from handle_new_user
-- ('admin@btechub.app', and 'omarbaha224@gmail.com' in some environments).
-- Anyone registering such an address on a fresh environment used to become
-- an approved admin without any verification.
--
-- After this migration every sign-up is an unapproved worker/broker request;
-- admins are provisioned EXPLICITLY. Bootstrap a new admin with (runs as
-- postgres / SQL editor / psql — auth.uid() is null there, which
-- enforce_user_field_protection allows through):
--
--   update public.users set role = 'admin', is_approved = true
--   where email = '<your-email>';
--
-- supabase/seed.sql already promotes its accounts by UUID, so fresh env
-- seeding is unaffected.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requested_role public.user_role;
begin
  v_requested_role := case
    when new.raw_user_meta_data ->> 'requested_role' = 'broker' then 'broker'::public.user_role
    else 'worker'::public.user_role
  end;

  insert into public.users (
    id, email, full_name, role, phone_number, is_approved, requested_role
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    'worker'::public.user_role,
    nullif(new.raw_user_meta_data ->> 'phone_number', ''),
    false,
    v_requested_role
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Existing admins keep their role; nothing to revoke here. Verify with:
--   select email, role, is_approved from public.users where role = 'admin';
