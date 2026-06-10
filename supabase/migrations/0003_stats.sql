-- =====================================================================
-- PPS LMS — Migration Giai đoạn 4
-- Bổ sung: last_seen (online tracking) + RPCs tổng hợp số liệu.
-- Chạy SAU 0002_phase3.sql.
-- =====================================================================

-- ---- Theo dõi trạng thái online ----
alter table public.profiles add column if not exists last_seen timestamptz;

-- =====================================================================
-- RPC: Thống kê học tập tuần hiện tại của học sinh đang đăng nhập
-- Client: supabase.rpc('get_my_weekly_stats')
-- =====================================================================
create or replace function public.get_my_weekly_stats()
returns table (
  study_minutes_week int,
  listens_week       int,
  points_total       int,
  streak_days        int
)
language plpgsql security definer set search_path = public stable as $$
declare v_uid uuid := auth.uid();
begin
  return query
  with week_logs as (
    select type, coalesce(duration_seconds, 0) as dur, coalesce(listen_count, 0) as lc
    from public.student_logs
    where student_id = v_uid and occurred_at >= now() - interval '7 days'
  ),
  daily_study as (
    select distinct date_trunc('day', occurred_at)::date as d
    from public.student_logs where student_id = v_uid
  ),
  streak as (
    select count(*)::int as cnt
    from (
      select d, row_number() over (order by d desc) as rn from daily_study
    ) x
    where (current_date - x.d) = (x.rn - 1)
  )
  select
    coalesce(sum(w.dur) / 60, 0)::int,
    coalesce(sum(case when w.type = 'listen' then w.lc else 0 end), 0)::int,
    coalesce(
      (select sum(score * 10)::int from public.student_logs where student_id = v_uid and score is not null),
      0
    ),
    coalesce((select cnt from streak), 0)
  from week_logs w;
end;
$$;

-- =====================================================================
-- RPC: Tổng quan giáo viên (số lớp, học sinh, online)
-- Client: supabase.rpc('get_teacher_overview')
-- =====================================================================
create or replace function public.get_teacher_overview()
returns table (
  total_classes  int,
  total_students int,
  online_now     int
)
language sql security definer set search_path = public stable as $$
  with my_classes as (
    select class_id from public.class_teachers where teacher_id = auth.uid()
  ),
  my_students as (
    select distinct cs.student_id
    from public.class_students cs
    where cs.class_id in (select class_id from my_classes)
  )
  select
    (select count(*)::int from my_classes),
    (select count(*)::int from my_students),
    (select count(*)::int from public.profiles
     where id in (select student_id from my_students)
       and last_seen >= now() - interval '5 minutes');
$$;

-- =====================================================================
-- RPC: Số liệu học từng HS trong một lớp (cho Flag Engine)
-- Chỉ GV của lớp mới gọi được.
-- Client: supabase.rpc('get_class_student_metrics', { p_class_id })
-- =====================================================================
create or replace function public.get_class_student_metrics(p_class_id uuid)
returns table (
  student_id         uuid,
  study_minutes_week int,
  listens_week       int,
  days_since_active  int,
  avg_score          numeric
)
language sql security definer set search_path = public stable as $$
  select
    cs.student_id,
    coalesce(
      sum(case when sl.occurred_at >= now() - interval '7 days'
               then coalesce(sl.duration_seconds, 0) else 0 end) / 60, 0
    )::int,
    coalesce(
      sum(case when sl.occurred_at >= now() - interval '7 days' and sl.type = 'listen'
               then coalesce(sl.listen_count, 0) else 0 end), 0
    )::int,
    coalesce(
      (extract(epoch from (now() - max(sl.occurred_at))) / 86400)::int,
      999
    ),
    avg(case when sl.score is not null then sl.score end)
  from public.class_students cs
  left join public.student_logs sl on sl.student_id = cs.student_id
  where cs.class_id = p_class_id
    and exists (
      select 1 from public.class_teachers ct
      where ct.class_id = p_class_id and ct.teacher_id = auth.uid()
    )
  group by cs.student_id;
$$;

-- =====================================================================
-- RPC: Danh sách con + tên lớp (cho phụ huynh)
-- Client: supabase.rpc('get_my_children')
-- =====================================================================
create or replace function public.get_my_children()
returns table (
  student_id  uuid,
  full_name   text,
  email       text,
  avatar_url  text,
  last_seen   timestamptz,
  class_names text[]
)
language sql security definer set search_path = public stable as $$
  select
    p.id,
    p.full_name,
    p.email,
    p.avatar_url,
    p.last_seen,
    coalesce(
      array_agg(c.name order by c.created_at desc) filter (where c.id is not null),
      '{}'::text[]
    )
  from public.parent_student ps
  join public.profiles p on p.id = ps.student_id
  left join public.class_students css on css.student_id = p.id
  left join public.classes c on c.id = css.class_id
  where ps.parent_id = auth.uid()
  group by p.id, p.full_name, p.email, p.avatar_url, p.last_seen;
$$;

-- =====================================================================
-- RPC: Tổng hợp flags toàn bộ lớp của GV (cho trang báo cáo)
-- Client: supabase.rpc('get_all_my_students_metrics')
-- =====================================================================
create or replace function public.get_all_my_students_metrics()
returns table (
  student_id         uuid,
  student_name       text,
  class_id           uuid,
  class_name         text,
  study_minutes_week int,
  listens_week       int,
  days_since_active  int,
  avg_score          numeric
)
language sql security definer set search_path = public stable as $$
  select
    cs.student_id,
    p.full_name,
    cs.class_id,
    cl.name,
    coalesce(
      sum(case when sl.occurred_at >= now() - interval '7 days'
               then coalesce(sl.duration_seconds, 0) else 0 end) / 60, 0
    )::int,
    coalesce(
      sum(case when sl.occurred_at >= now() - interval '7 days' and sl.type = 'listen'
               then coalesce(sl.listen_count, 0) else 0 end), 0
    )::int,
    coalesce(
      (extract(epoch from (now() - max(sl.occurred_at))) / 86400)::int,
      999
    ),
    avg(case when sl.score is not null then sl.score end)
  from public.class_teachers ct
  join public.class_students cs on cs.class_id = ct.class_id
  join public.profiles p on p.id = cs.student_id
  join public.classes cl on cl.id = cs.class_id
  left join public.student_logs sl on sl.student_id = cs.student_id
  where ct.teacher_id = auth.uid()
  group by cs.student_id, p.full_name, cs.class_id, cl.name;
$$;
