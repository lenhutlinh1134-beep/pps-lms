-- =====================================================================
-- PPS LMS — Quản trị video bài giảng cho giáo viên
-- Chạy SAU 0010_class_level.sql
-- 1. Đo thời gian xem video của từng học sinh (watch_seconds)
-- 2. Ngưỡng cảnh báo "xem không đủ" (lectures.min_watch_minutes)
-- 3. Chia sẻ 1 bài giảng cho nhiều lớp (lecture_classes)
-- 4. RPC track_lecture_watch — học sinh gửi nhịp đếm giờ
-- 5. RPC get_lecture_watch_stats — GV xem thống kê từng em
-- =====================================================================

-- ===== 1. Cột mới =====
alter table public.lectures
  add column if not exists min_watch_minutes int; -- null = không yêu cầu / không cảnh báo

alter table public.lecture_views
  add column if not exists watch_seconds int not null default 0,
  add column if not exists completed boolean not null default true, -- rows cũ = đã đánh dấu học xong
  add column if not exists last_seen_at timestamptz not null default now();

-- ===== 2. Chia sẻ bài giảng cho nhiều lớp =====
create table if not exists public.lecture_classes (
  lecture_id uuid not null references public.lectures(id) on delete cascade,
  class_id   uuid not null references public.classes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (lecture_id, class_id)
);
create index if not exists lecture_classes_class_idx on public.lecture_classes(class_id);

-- Backfill: bài giảng hiện có → chia sẻ cho chính lớp gốc
insert into public.lecture_classes (lecture_id, class_id)
select id, class_id from public.lectures where class_id is not null
on conflict do nothing;

-- Trigger: tạo bài giảng mới → tự chia sẻ cho lớp gốc
create or replace function public.lecture_share_own_class()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.class_id is not null then
    insert into public.lecture_classes (lecture_id, class_id)
    values (new.id, new.class_id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;
drop trigger if exists lectures_share_own_class on public.lectures;
create trigger lectures_share_own_class
  after insert on public.lectures
  for each row execute function public.lecture_share_own_class();

alter table public.lecture_classes enable row level security;

-- GV sở hữu bài giảng quản lý việc chia sẻ
create policy "GV quản lý chia sẻ bài giảng" on public.lecture_classes
  for all using (
    exists (
      select 1 from public.lectures l
      where l.id = lecture_classes.lecture_id
        and (l.teacher_id = auth.uid() or public.is_class_teacher(l.class_id))
    )
  ) with check (
    exists (
      select 1 from public.lectures l
      where l.id = lecture_classes.lecture_id
        and (l.teacher_id = auth.uid() or public.is_class_teacher(l.class_id))
    )
    -- chỉ chia sẻ vào lớp mà GV đang dạy
    and public.is_class_teacher(class_id)
  );

-- HS thấy bản ghi chia sẻ của lớp mình
create policy "HS xem chia sẻ của lớp mình" on public.lecture_classes
  for select using (public.is_class_student(class_id));

-- HS đọc được bài giảng chia sẻ cho lớp mình (mở rộng policy cũ vốn chỉ check class_id gốc)
create policy "HS đọc bài giảng được chia sẻ" on public.lectures
  for select using (
    exists (
      select 1 from public.lecture_classes lc
      where lc.lecture_id = lectures.id and public.is_class_student(lc.class_id)
    )
  );

-- ===== 3. RPC: học sinh gửi nhịp đếm thời gian xem =====
-- Client gọi mỗi 30 giây khi đang mở bài giảng. Giới hạn 0–120s/lần chống gian lận.
create or replace function public.track_lecture_watch(
  p_lecture_id uuid,
  p_seconds    int
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_secs int := least(greatest(coalesce(p_seconds, 0), 0), 120);
begin
  if public.my_role() <> 'student' then
    return; -- chỉ học sinh mới được tính giờ
  end if;

  -- Phải thuộc lớp được chia sẻ bài giảng này
  if not exists (
    select 1 from public.lecture_classes lc
    where lc.lecture_id = p_lecture_id and public.is_class_student(lc.class_id)
  ) and not exists (
    select 1 from public.lectures l
    where l.id = p_lecture_id and public.is_class_student(l.class_id)
  ) then
    return;
  end if;

  insert into public.lecture_views (lecture_id, student_id, watch_seconds, completed, last_seen_at)
  values (p_lecture_id, auth.uid(), v_secs, false, now())
  on conflict (lecture_id, student_id) do update
    set watch_seconds = public.lecture_views.watch_seconds + v_secs,
        last_seen_at  = now();
end;
$$;
revoke all on function public.track_lecture_watch(uuid, int) from anon;
grant execute on function public.track_lecture_watch(uuid, int) to authenticated;

-- ===== 4. RPC: GV lấy thống kê xem video từng học sinh =====
-- Trả về toàn bộ HS của các lớp được chia sẻ (kể cả em chưa xem) + số giây đã xem.
create or replace function public.get_lecture_watch_stats(p_lecture_id uuid)
returns table (
  student_id    uuid,
  full_name     text,
  email         text,
  class_name    text,
  watch_seconds int,
  completed     boolean,
  last_seen_at  timestamptz
)
language sql stable security definer set search_path = public as $$
  select distinct on (p.id)
    p.id            as student_id,
    p.full_name,
    p.email,
    c.name          as class_name,
    coalesce(lv.watch_seconds, 0) as watch_seconds,
    coalesce(lv.completed, false) as completed,
    lv.last_seen_at
  from public.lecture_classes lc
  join public.classes c        on c.id = lc.class_id
  join public.class_students cs on cs.class_id = lc.class_id
  join public.profiles p       on p.id = cs.student_id
  left join public.lecture_views lv
    on lv.lecture_id = lc.lecture_id and lv.student_id = p.id
  where lc.lecture_id = p_lecture_id
    -- chỉ GV sở hữu bài giảng / GV của lớp gốc mới xem được
    and exists (
      select 1 from public.lectures l
      where l.id = p_lecture_id
        and (l.teacher_id = auth.uid() or public.is_class_teacher(l.class_id))
    )
  order by p.id, lv.watch_seconds desc nulls last;
$$;
revoke all on function public.get_lecture_watch_stats(uuid) from anon;
grant execute on function public.get_lecture_watch_stats(uuid) to authenticated;

-- Index hỗ trợ thống kê
create index if not exists lecture_views_lecture_idx on public.lecture_views(lecture_id);
