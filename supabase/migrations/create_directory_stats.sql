-- ============================================================================
-- BTEC Brother — Migration: directory_stats() RPC
-- ----------------------------------------------------------------------------
-- Run directly in the live Supabase SQL editor. Creates the aggregated
-- team-stats function used by the /directory page. Idempotent (create or
-- replace). This function only lived in schema.sql and was never shipped as a
-- migration, which is why the directory page rendered empty.
-- ============================================================================

create or replace function public.directory_stats()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'members', (
      select coalesce(jsonb_agg(m), '[]'::jsonb)
      from (
        select jsonb_build_object(
          'id',         u.id,
          'full_name',  u.full_name,
          'avatar_url', u.avatar_url,
          'role',       u.role,
          'is_active',  u.is_active,
          'completed',  count(c.id),
          'active',     count(a.id),
          'earnings',   coalesce(sum(p.amount), 0),
          'avg_days',   coalesce(round(avg(c.days)::numeric, 1), 0),
          'on_time',    count(c.id) filter (where c.on_time),
          'precise',    count(c.id) filter (where c.precise),
          'urgent',     count(c.id) filter (where c.urgent)
        ) as m
        from public.users u
        where u.is_approved = true
        left join (
          select o.id, o.worker_id, o.broker_id,
                 case
                   when o.completed_at is null then null
                   else extract(epoch from (o.completed_at - o.created_at)) / 86400.0
                 end as days,
                 (o.completed_at is not null and o.completed_at <= o.deadline) as on_time,
                 (o.plagiarism_rate is not null and o.plagiarism_rate <= 15) as precise,
                 (extract(epoch from (o.deadline - o.created_at)) < 3 * 86400) as urgent
          from public.orders o
          where o.status = 'completed'
        ) c on (c.worker_id = u.id or c.broker_id = u.id)
        left join (
          select o.id, o.worker_id, o.broker_id
          from public.orders o
          where o.status in ('in_progress', 'submitted', 'revision')
        ) a on (a.worker_id = u.id or a.broker_id = u.id)
        left join public.payouts p on p.user_id = u.id
        group by u.id, u.full_name, u.avatar_url, u.role, u.is_active
        order by u.full_name
      ) m
    ),
    'matrix', (
      select coalesce(jsonb_agg(m), '[]'::jsonb)
      from (
        select jsonb_build_object(
          'worker_id',   w.id,
          'worker_name', w.full_name,
          'broker_id',   b.id,
          'broker_name', b.full_name,
          'count',       count(o.id)
        ) as m
        from public.orders o
        join public.users w on w.id = o.worker_id
        join public.users b on b.id = o.broker_id
        where o.status = 'completed'
        group by w.id, w.full_name, b.id, b.full_name
        order by count(o.id) desc
      ) m
    )
  );
$$;

revoke all on function public.directory_stats() from public;
grant execute on function public.directory_stats() to authenticated, service_role;
