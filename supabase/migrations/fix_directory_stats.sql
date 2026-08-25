-- ============================================================================
-- BTEC Brother — Fix: directory_stats() metric inflation
-- ----------------------------------------------------------------------------
-- The old `members` query joined completed orders, active orders AND payouts
-- in one FROM, producing a cross-product when a member had several completed
-- orders and several payouts. `completed`, `earnings`, etc. were inflated.
--
-- Fix: compute each metric with an independent correlated subquery so a member
-- is never counted more than once.
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
          'completed',  (select count(*) from public.orders o
                          where o.status = 'completed'
                            and (o.worker_id = u.id or o.broker_id = u.id)),
          'active',     (select count(*) from public.orders o
                          where o.status in ('in_progress', 'submitted', 'revision')
                            and (o.worker_id = u.id or o.broker_id = u.id)),
          'earnings',   coalesce((select sum(p.amount) from public.payouts p
                                   where p.user_id = u.id), 0),
          'avg_days',   coalesce((select round(avg(extract(epoch from (o.completed_at - o.created_at)) / 86400.0)::numeric, 1)
                                   from public.orders o
                                  where o.status = 'completed'
                                    and (o.worker_id = u.id or o.broker_id = u.id)), 0),
          'on_time',    (select count(*) from public.orders o
                          where o.status = 'completed'
                            and o.completed_at is not null
                            and o.completed_at <= o.deadline
                            and (o.worker_id = u.id or o.broker_id = u.id)),
          'precise',    (select count(*) from public.orders o
                          where o.status = 'completed'
                            and o.plagiarism_rate is not null
                            and o.plagiarism_rate <= 15
                            and (o.worker_id = u.id or o.broker_id = u.id)),
          'urgent',     (select count(*) from public.orders o
                          where o.status = 'completed'
                            and extract(epoch from (o.deadline - o.created_at)) < 3 * 86400
                            and (o.worker_id = u.id or o.broker_id = u.id))
        ) as m
        from public.users u
        where u.is_approved = true
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
