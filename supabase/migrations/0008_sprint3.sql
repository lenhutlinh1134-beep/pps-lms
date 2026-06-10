-- PPS LMS Sprint 3 — Lịch dạy · Phản hồi PH · Tin tức
-- Chạy SAU 0007_manager.sql
-- Tạo: class_sessions, parent_feedback, news
-- RPC: get_my_children_metrics()
-- =====================================================================


-- =====================================================================
-- 1. CLASS_SESSIONS — Lịch dạy cố định theo lớp
-- =====================================================================
create table if not exists public.class_sessions (
  id           uuid primary key default gen_random_uuid(),
  class_id     uuid not null references public.classes(id) on delete cascade,
  day_of_week  smallint not null check (day_of_week between 1 and 7), -- 1=CN, 2=Thứ 2, ..., 7=Thứ 7
  start_time   time not null,
  end_time     time not null,
  room         text,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  constraint class_sessions_time_check check (end_time > start_time)
);

-- Index hay dùng nhất: lọc theo lớp
create index if not exists class_sessions_class_id_idx on public.class_sessions(class_id);

alter table public.class_sessions enable row level security;

-- SELECT: học sinh đã enrolled, giáo viên của lớp, manager xem tất cả
create policy "cs_select" on public.class_sessions
  for select using (
    public.my_role() = 'manager'
    or exists (
      select 1 from public.class_teachers ct
      where ct.class_id = class_sessions.class_id
        and ct.teacher_id = auth.uid()
    )
    or exists (
      select 1 from public.class_students cs
      where cs.class_id = class_sessions.class_id
        and cs.student_id = auth.uid()
    )
  );

-- INSERT: giáo viên của lớp đó hoặc manager
create policy "cs_insert" on public.class_sessions
  for insert with check (
    public.my_role() = 'manager'
    or exists (
      select 1 from public.class_teachers ct
      where ct.class_id = class_sessions.class_id
        and ct.teacher_id = auth.uid()
    )
  );

-- UPDATE: giáo viên của lớp đó hoặc manager
create policy "cs_update" on public.class_sessions
  for update using (
    public.my_role() = 'manager'
    or exists (
      select 1 from public.class_teachers ct
      where ct.class_id = class_sessions.class_id
        and ct.teacher_id = auth.uid()
    )
  );

-- DELETE: giáo viên của lớp đó hoặc manager
create policy "cs_delete" on public.class_sessions
  for delete using (
    public.my_role() = 'manager'
    or exists (
      select 1 from public.class_teachers ct
      where ct.class_id = class_sessions.class_id
        and ct.teacher_id = auth.uid()
    )
  );


-- =====================================================================
-- 2. PARENT_FEEDBACK — Phản hồi từ phụ huynh
-- =====================================================================
create table if not exists public.parent_feedback (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid not null references public.profiles(id) on delete cascade,
  student_id  uuid not null references public.profiles(id) on delete cascade,
  class_id    uuid references public.classes(id) on delete set null,
  content     text not null,
  reply       text,
  replied_by  uuid references public.profiles(id) on delete set null,
  replied_at  timestamptz,
  status      text not null default 'pending'
                check (status in ('pending', 'replied')),
  created_at  timestamptz not null default now()
);

-- Index: lọc theo phụ huynh, học sinh, trạng thái
create index if not exists parent_feedback_parent_id_idx  on public.parent_feedback(parent_id);
create index if not exists parent_feedback_student_id_idx on public.parent_feedback(student_id);
create index if not exists parent_feedback_status_idx     on public.parent_feedback(status);

alter table public.parent_feedback enable row level security;

-- SELECT: phụ huynh thấy của mình, giáo viên thấy phản hồi thuộc lớp mình, manager thấy tất cả
create policy "pf_select" on public.parent_feedback
  for select using (
    public.my_role() = 'manager'
    or (public.my_role() = 'parent' and parent_id = auth.uid())
    or (
      public.my_role() = 'teacher'
      and class_id is not null
      and exists (
        select 1 from public.class_teachers ct
        where ct.class_id = parent_feedback.class_id
          and ct.teacher_id = auth.uid()
      )
    )
  );

-- INSERT: chỉ phụ huynh, phải tự đứng tên
create policy "pf_insert" on public.parent_feedback
  for insert with check (
    public.my_role() = 'parent'
    and parent_id = auth.uid()
  );

-- UPDATE: giáo viên lớp đó và manager (chỉ cập nhật phần trả lời)
create policy "pf_update" on public.parent_feedback
  for update using (
    public.my_role() = 'manager'
    or (
      public.my_role() = 'teacher'
      and class_id is not null
      and exists (
        select 1 from public.class_teachers ct
        where ct.class_id = parent_feedback.class_id
          and ct.teacher_id = auth.uid()
      )
    )
  );


-- =====================================================================
-- 3. NEWS — Tin tức / Thông báo toàn hệ thống
-- =====================================================================
create table if not exists public.news (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  content        text not null,
  published_by   uuid references public.profiles(id) on delete set null,
  publisher_name text,                                        -- denormalize tránh join profiles
  is_pinned      boolean not null default false,
  target_roles   text[] not null default '{"student","teacher","parent"}', -- ai được xem
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Index: sắp xếp theo thời gian + ghim
create index if not exists news_created_at_idx on public.news(created_at desc);
create index if not exists news_is_pinned_idx  on public.news(is_pinned) where is_pinned = true;

alter table public.news enable row level security;

-- SELECT: authenticated user nếu role nằm trong target_roles
create policy "news_select" on public.news
  for select using (
    auth.uid() is not null
    and public.my_role()::text = any(target_roles)
  );

-- INSERT/UPDATE/DELETE: chỉ manager
create policy "news_insert" on public.news
  for insert with check (public.my_role() = 'manager');

create policy "news_update" on public.news
  for update using (public.my_role() = 'manager');

create policy "news_delete" on public.news
  for delete using (public.my_role() = 'manager');

-- Trigger tự cập nhật updated_at khi sửa tin
create or replace function public.set_news_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger news_updated_at_trigger
  before update on public.news
  for each row execute function public.set_news_updated_at();


-- =====================================================================
-- 4. RPC: get_my_children_metrics() — Phụ huynh xem chỉ số học tập của con
-- Trả về: từng con + từng lớp → phút học/tuần, số lần nghe/tuần,
--         số ngày chưa active, điểm trung bình
-- =====================================================================
create or replace function public.get_my_children_metrics()
returns table (
  student_id       uuid,
  student_name     text,
  class_id         uuid,
  class_name       text,
  study_minutes_week int,
  listens_week     int,
  days_since_active int,
  avg_score        numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id                                             as student_id,
    p.full_name                                      as student_name,
    c.id                                             as class_id,
    c.name                                           as class_name,

    -- Tổng số phút học trong 7 ngày gần nhất
    coalesce(
      sum(sl.duration_seconds) filter (
        where sl.occurred_at >= now() - interval '7 days'
      ) / 60,
      0
    )::int                                           as study_minutes_week,

    -- Tổng số lần nghe trong 7 ngày gần nhất
    coalesce(
      sum(sl.listen_count) filter (
        where sl.occurred_at >= now() - interval '7 days'
      ),
      0
    )::int                                           as listens_week,

    -- Số ngày kể từ lần hoạt động gần nhất (null → 999)
    coalesce(
      extract(day from now() - max(sl.occurred_at))::int,
      999
    )                                                as days_since_active,

    -- Điểm trung bình (làm tròn 1 chữ số thập phân)
    round(
      coalesce(avg(sl.score) filter (where sl.score is not null), 0),
      1
    )                                                as avg_score

  from public.parent_student ps
  join public.profiles p      on p.id = ps.student_id
  join public.class_students cs on cs.student_id = p.id
  join public.classes c        on c.id = cs.class_id
  left join public.student_logs sl on sl.student_id = p.id

  where ps.parent_id = auth.uid()

  group by p.id, p.full_name, c.id, c.name
  order by p.full_name, c.name;
$$;

-- Chỉ phụ huynh đã đăng nhập mới được gọi RPC này
revoke execute on function public.get_my_children_metrics() from public;
grant  execute on function public.get_my_children_metrics() to authenticated;
