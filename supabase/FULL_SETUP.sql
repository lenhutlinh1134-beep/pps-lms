-- ============================================================
-- PPS LMS — FULL SETUP SQL (IDEMPOTENT — chạy lại được)
-- Paste toàn bộ file này vào Supabase SQL Editor > Run
-- Project: zrbsdtwbrtgoreddpsua
-- ============================================================

-- Reset toàn bộ schema (xóa sạch tables, types, functions cũ)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

-- =====================================================================
-- PPS LMS — Schema khởi tạo (Supabase / PostgreSQL)
-- Cách chạy: Supabase Dashboard > SQL Editor > New query > dán file này > Run.
-- =====================================================================

-- ============ KIỂU DỮ LIỆU (ENUM) ============
create type public.user_role as enum ('student', 'teacher', 'parent');
create type public.lecture_type as enum ('video', 'theory');
create type public.attendance_status as enum ('present', 'absent', 'late');

-- ============ HỒ SƠ NGƯỜI DÙNG ============
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  email      text,
  role       public.user_role not null default 'student',
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Tự tạo profile khi có user mới đăng ký (role lấy từ metadata, mặc định student)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'student')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ TRƯỜNG / LỚP ============
create table public.schools (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  address    text,
  created_at timestamptz not null default now()
);

create table public.classes (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid references public.schools(id) on delete set null,
  name          text not null,
  year          text,                              -- năm học
  custom_fields jsonb not null default '{}',       -- trường dữ liệu tuỳ biến do GV thêm
  created_by    uuid not null references public.profiles(id),
  created_at    timestamptz not null default now()
);

-- Nhiều giáo viên / 1 lớp; quyền do người tạo lớp quyết định
create table public.class_teachers (
  class_id    uuid references public.classes(id) on delete cascade,
  teacher_id  uuid references public.profiles(id) on delete cascade,
  role        text not null default 'co_teacher',  -- 'owner' | 'co_teacher'
  permissions jsonb not null default '{}',
  added_at    timestamptz not null default now(),
  primary key (class_id, teacher_id)
);

create table public.class_students (
  class_id   uuid references public.classes(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete cascade,
  joined_at  timestamptz not null default now(),
  primary key (class_id, student_id)
);

-- Nối phụ huynh ↔ con
create table public.parent_student (
  parent_id  uuid references public.profiles(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete cascade,
  primary key (parent_id, student_id)
);

-- ============ NỘI DUNG HỌC ============
create table public.lectures (
  id           uuid primary key default gen_random_uuid(),
  class_id     uuid references public.classes(id) on delete cascade,
  teacher_id   uuid references public.profiles(id),
  teacher_name text,                               -- lưu sẵn tên GV (tránh join + RLS profiles)
  title        text not null,
  description  text,
  type         public.lecture_type not null default 'theory',
  content_url  text,                               -- link video / file bài giảng (Supabase Storage)
  created_at   timestamptz not null default now()
);
create index lectures_class_idx on public.lectures (class_id, created_at desc);

-- Câu hỏi & trả lời dưới video (Q&A)
create table public.lecture_comments (
  id                uuid primary key default gen_random_uuid(),
  lecture_id        uuid references public.lectures(id) on delete cascade,
  user_id           uuid references public.profiles(id),
  author_name       text,                          -- lưu sẵn tên người hỏi/đáp
  author_role       public.user_role,              -- 'student' | 'teacher' | 'parent'
  parent_comment_id uuid references public.lecture_comments(id) on delete cascade,
  body              text not null,
  created_at        timestamptz not null default now()
);
create index lecture_comments_lecture_idx on public.lecture_comments (lecture_id, created_at);

-- "Học từ kết nối" — luyện nghe (port từ dữ liệu cũ D:\WEB HỌC TIẾNG ANH)
create table public.listening_lessons (
  id         uuid primary key default gen_random_uuid(),
  topic      text not null,
  level      text,
  content    jsonb not null default '{}',          -- từ vựng / câu / đáp án
  audio_path text,                                  -- đường dẫn mp3 trên Storage
  created_at timestamptz not null default now()
);

-- Bài tập (phát triển sau — để sẵn cấu trúc)
create table public.assignments (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid references public.classes(id) on delete cascade,
  title      text not null,
  type       text not null default 'quiz',
  payload    jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.submissions (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid references public.assignments(id) on delete cascade,
  student_id    uuid references public.profiles(id) on delete cascade,
  score         numeric,
  payload       jsonb not null default '{}',
  submitted_at  timestamptz not null default now()
);

-- ============ GIÁM SÁT / BÁO CÁO ============
-- Nhật ký hoạt động học sinh (nguồn cho Flag Engine & báo cáo)
create table public.student_logs (
  id               uuid primary key default gen_random_uuid(),
  student_id       uuid references public.profiles(id) on delete cascade,
  class_id         uuid references public.classes(id) on delete set null,
  type             text not null,                  -- 'login' | 'listen' | 'lecture' | 'assignment'
  duration_seconds int default 0,
  listen_count     int default 0,
  score            numeric,
  occurred_at      timestamptz not null default now()
);
create index student_logs_student_time_idx on public.student_logs (student_id, occurred_at desc);
create index student_logs_class_time_idx on public.student_logs (class_id, occurred_at desc);

-- Điểm danh
create table public.attendance (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid references public.classes(id) on delete cascade,
  student_id  uuid references public.profiles(id) on delete cascade,
  date        date not null default current_date,
  status      public.attendance_status not null default 'present',
  note        text,
  recorded_by uuid references public.profiles(id),
  unique (class_id, student_id, date)
);

-- Nhận xét / lưu ý của GV cho HS (phụ huynh xem được)
create table public.teacher_notes (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid references public.classes(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete cascade,
  teacher_id uuid references public.profiles(id),
  note       text not null,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- HÀM TRỢ GIÚP (security definer — tránh đệ quy RLS)
-- =====================================================================
create or replace function public.my_role()
returns public.user_role language sql security definer set search_path = public stable as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_class_teacher(cid uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.class_teachers where class_id = cid and teacher_id = auth.uid());
$$;

create or replace function public.is_class_student(cid uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.class_students where class_id = cid and student_id = auth.uid());
$$;

create or replace function public.is_parent_of(sid uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.parent_student where parent_id = auth.uid() and student_id = sid);
$$;

-- GV có được xem 1 học sinh không (HS đó nằm trong lớp GV dạy)
create or replace function public.teacher_sees_student(sid uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.class_students cs
    join public.class_teachers ct on ct.class_id = cs.class_id
    where ct.teacher_id = auth.uid() and cs.student_id = sid
  );
$$;

-- =====================================================================
-- BẬT ROW LEVEL SECURITY + POLICY THEO VAI TRÒ
-- (Baseline v1 — siết chặt thêm khi nghiệp vụ rõ hơn)
-- =====================================================================
alter table public.profiles         enable row level security;
alter table public.schools          enable row level security;
alter table public.classes          enable row level security;
alter table public.class_teachers   enable row level security;
alter table public.class_students   enable row level security;
alter table public.parent_student   enable row level security;
alter table public.lectures         enable row level security;
alter table public.lecture_comments enable row level security;
alter table public.listening_lessons enable row level security;
alter table public.assignments      enable row level security;
alter table public.submissions      enable row level security;
alter table public.student_logs     enable row level security;
alter table public.attendance       enable row level security;
alter table public.teacher_notes    enable row level security;

-- ---- profiles ----
create policy "xem hồ sơ của mình / con / học sinh mình dạy" on public.profiles
  for select using (
    id = auth.uid() or public.is_parent_of(id) or public.teacher_sees_student(id)
  );
create policy "tự tạo hồ sơ" on public.profiles
  for insert with check (id = auth.uid());
create policy "tự cập nhật hồ sơ" on public.profiles
  for update using (id = auth.uid());

-- ---- schools (ai đăng nhập cũng đọc được; GV quản lý) ----
create policy "đọc trường" on public.schools
  for select to authenticated using (true);
create policy "GV quản lý trường" on public.schools
  for all to authenticated using (public.my_role() = 'teacher') with check (public.my_role() = 'teacher');

-- ---- classes ----
create policy "đọc lớp liên quan" on public.classes
  for select using (
    public.is_class_teacher(id) or public.is_class_student(id) or created_by = auth.uid()
  );
create policy "GV tạo lớp" on public.classes
  for insert with check (public.my_role() = 'teacher' and created_by = auth.uid());
create policy "GV của lớp sửa lớp" on public.classes
  for update using (public.is_class_teacher(id));
create policy "người tạo xoá lớp" on public.classes
  for delete using (created_by = auth.uid());

-- ---- class_teachers ----
create policy "đọc giáo viên của lớp mình" on public.class_teachers
  for select using (public.is_class_teacher(class_id) or teacher_id = auth.uid());
-- GV trong lớp HOẶC người tạo lớp được quản lý đồng giáo viên
-- (điều kiện "người tạo" cho phép chủ lớp tự thêm mình làm owner lúc mới tạo lớp)
create policy "quản lý đồng giáo viên" on public.class_teachers
  for all
  using (
    public.is_class_teacher(class_id)
    or exists (select 1 from public.classes c where c.id = class_id and c.created_by = auth.uid())
  )
  with check (
    public.is_class_teacher(class_id)
    or exists (select 1 from public.classes c where c.id = class_id and c.created_by = auth.uid())
  );

-- ---- class_students ----
create policy "đọc học sinh của lớp" on public.class_students
  for select using (public.is_class_teacher(class_id) or student_id = auth.uid());
create policy "GV của lớp thêm/bớt học sinh" on public.class_students
  for all using (public.is_class_teacher(class_id)) with check (public.is_class_teacher(class_id));
create policy "học sinh tự ghi danh" on public.class_students
  for insert with check (student_id = auth.uid());

-- ---- parent_student ----
create policy "phụ huynh/HS xem liên kết của mình" on public.parent_student
  for select using (parent_id = auth.uid() or student_id = auth.uid());
create policy "phụ huynh tự liên kết" on public.parent_student
  for insert with check (parent_id = auth.uid());

-- ---- lectures ----
create policy "đọc bài giảng của lớp liên quan" on public.lectures
  for select using (public.is_class_teacher(class_id) or public.is_class_student(class_id));
create policy "GV của lớp quản lý bài giảng" on public.lectures
  for all using (public.is_class_teacher(class_id)) with check (public.is_class_teacher(class_id));

-- ---- lecture_comments ----
create policy "đọc bình luận bài giảng liên quan" on public.lecture_comments
  for select using (
    exists (
      select 1 from public.lectures l
      where l.id = lecture_id and (public.is_class_teacher(l.class_id) or public.is_class_student(l.class_id))
    )
  );
create policy "viết bình luận nếu thuộc lớp" on public.lecture_comments
  for insert with check (
    user_id = auth.uid() and exists (
      select 1 from public.lectures l
      where l.id = lecture_id and (public.is_class_teacher(l.class_id) or public.is_class_student(l.class_id))
    )
  );
create policy "tự sửa/xoá bình luận" on public.lecture_comments
  for update using (user_id = auth.uid());
create policy "tự xoá bình luận" on public.lecture_comments
  for delete using (user_id = auth.uid());

-- ---- listening_lessons (mọi người đăng nhập đều học được) ----
create policy "đọc bài luyện nghe" on public.listening_lessons
  for select to authenticated using (true);
create policy "GV quản lý bài luyện nghe" on public.listening_lessons
  for all to authenticated using (public.my_role() = 'teacher') with check (public.my_role() = 'teacher');

-- ---- assignments ----
create policy "đọc bài tập của lớp liên quan" on public.assignments
  for select using (public.is_class_teacher(class_id) or public.is_class_student(class_id));
create policy "GV của lớp quản lý bài tập" on public.assignments
  for all using (public.is_class_teacher(class_id)) with check (public.is_class_teacher(class_id));

-- ---- submissions ----
create policy "HS xem bài nộp của mình, GV xem cả lớp" on public.submissions
  for select using (
    student_id = auth.uid() or exists (
      select 1 from public.assignments a where a.id = assignment_id and public.is_class_teacher(a.class_id)
    )
  );
create policy "HS nộp bài" on public.submissions
  for insert with check (student_id = auth.uid());

-- ---- student_logs ----
create policy "xem nhật ký: HS của mình, GV của lớp, PH của con" on public.student_logs
  for select using (
    student_id = auth.uid()
    or public.teacher_sees_student(student_id)
    or public.is_parent_of(student_id)
  );
create policy "HS tự ghi nhật ký" on public.student_logs
  for insert with check (student_id = auth.uid());

-- ---- attendance ----
create policy "xem điểm danh liên quan" on public.attendance
  for select using (
    student_id = auth.uid()
    or public.is_class_teacher(class_id)
    or public.is_parent_of(student_id)
  );
create policy "GV của lớp điểm danh" on public.attendance
  for all using (public.is_class_teacher(class_id)) with check (public.is_class_teacher(class_id));

-- ---- teacher_notes ----
create policy "xem nhận xét: HS của mình, GV của lớp, PH của con" on public.teacher_notes
  for select using (
    student_id = auth.uid()
    or public.is_class_teacher(class_id)
    or public.is_parent_of(student_id)
  );
create policy "GV của lớp viết nhận xét" on public.teacher_notes
  for all using (public.is_class_teacher(class_id)) with check (public.is_class_teacher(class_id));

-- =====================================================================
-- RPC: Tạo lớp (atomic) — tạo trường (nếu cần) + lớp + gán người tạo làm chủ lớp
-- Client gọi: supabase.rpc('create_class', { p_name, p_year, p_school_id, p_school_name, p_custom })
-- =====================================================================
create or replace function public.create_class(
  p_name text,
  p_year text default null,
  p_school_id uuid default null,
  p_school_name text default null,
  p_custom jsonb default '{}'
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_school uuid := p_school_id;
  v_class uuid;
begin
  if public.my_role() <> 'teacher' then
    raise exception 'Chỉ giáo viên mới được tạo lớp';
  end if;

  -- Tạo trường mới nếu chưa chọn trường có sẵn
  if v_school is null and p_school_name is not null and length(trim(p_school_name)) > 0 then
    insert into public.schools (name) values (trim(p_school_name)) returning id into v_school;
  end if;

  insert into public.classes (school_id, name, year, custom_fields, created_by)
  values (v_school, p_name, p_year, coalesce(p_custom, '{}'::jsonb), auth.uid())
  returning id into v_class;

  insert into public.class_teachers (class_id, teacher_id, role)
  values (v_class, auth.uid(), 'owner');

  return v_class;
end;
$$;

-- =====================================================================
-- RPC: Thêm học sinh vào lớp theo email (security definer — tra cứu profiles
-- mà không lộ dữ liệu; chỉ GV của lớp được dùng).
-- Client gọi: supabase.rpc('add_student_by_email', { p_class_id, p_email })
-- =====================================================================
create or replace function public.add_student_by_email(p_class_id uuid, p_email text)
returns table (student_id uuid, full_name text)
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_name text;
begin
  if not (
    public.is_class_teacher(p_class_id)
    or exists (select 1 from public.classes c where c.id = p_class_id and c.created_by = auth.uid())
  ) then
    raise exception 'Bạn không có quyền quản lý lớp này';
  end if;

  select id, full_name into v_id, v_name
  from public.profiles
  where lower(email) = lower(trim(p_email)) and role = 'student'
  limit 1;

  if v_id is null then
    raise exception 'Không tìm thấy học sinh đã đăng ký với email: %', p_email;
  end if;

  insert into public.class_students (class_id, student_id)
  values (p_class_id, v_id)
  on conflict do nothing;

  return query select v_id, v_name;
end;
$$;

-- =====================================================================
-- Lượt xem bài giảng (học sinh đánh dấu đã học) — cho tiến độ & báo cáo
-- =====================================================================
create table public.lecture_views (
  lecture_id uuid references public.lectures(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (lecture_id, student_id)
);
alter table public.lecture_views enable row level security;

create policy "HS xem/ghi lượt xem của mình" on public.lecture_views
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy "GV của lớp xem lượt xem của HS" on public.lecture_views
  for select using (
    exists (select 1 from public.lectures l where l.id = lecture_id and public.is_class_teacher(l.class_id))
  );

-- thêm role manager (migration 0005b)
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'manager';

-- =====================================================================
-- PPS LMS — Migration Giai đoạn 3 (G3)
-- Bổ sung: liên kết Phụ huynh ↔ Con (RPC) + Ngân hàng câu hỏi.
-- Cách chạy: Supabase Dashboard > SQL Editor > dán file này > Run.
-- (Chạy SAU 0001_init.sql. File này CHỈ THÊM, không sửa bảng cũ.)
-- =====================================================================

-- =====================================================================
-- RPC: Phụ huynh tự liên kết với con bằng EMAIL (security definer).
-- Lý do cần RPC: RLS của bảng `profiles` không cho phụ huynh đọc hồ sơ
-- học sinh chưa liên kết → không thể tra id từ email phía client. Hàm này
-- tra cứu an toàn (không lộ dữ liệu) rồi tạo liên kết.
--
-- ⚠️ LƯU Ý BẢO MẬT (cần siết ở production): hiện chỉ cần biết email là
-- liên kết được. Giai đoạn sau nên thêm 1 trong 2 lớp xác thực:
--   (A) Học sinh cung cấp "mã liên kết" 6 số do hệ thống sinh, hoặc
--   (B) Giáo viên/HS duyệt yêu cầu liên kết trước khi có hiệu lực.
-- Client gọi: supabase.rpc('link_child_by_email', { p_email })
-- =====================================================================
create or replace function public.link_child_by_email(p_email text)
returns table (student_id uuid, full_name text)
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_name text;
begin
  if public.my_role() <> 'parent' then
    raise exception 'Chỉ tài khoản phụ huynh mới được liên kết với con';
  end if;

  select id, full_name into v_id, v_name
  from public.profiles
  where lower(email) = lower(trim(p_email)) and role = 'student'
  limit 1;

  if v_id is null then
    raise exception 'Không tìm thấy học sinh đã đăng ký với email: %', p_email;
  end if;

  insert into public.parent_student (parent_id, student_id)
  values (auth.uid(), v_id)
  on conflict do nothing;

  return query select v_id, v_name;
end;
$$;

-- =====================================================================
-- NGÂN HÀNG CÂU HỎI — thư viện câu hỏi riêng của từng giáo viên.
-- Là nền tảng cho tính năng "Làm bài tập" (mục 2.3) ở giai đoạn sau:
-- giáo viên soạn sẵn câu hỏi rồi gom thành bài tập gán cho lớp.
-- =====================================================================
create table if not exists public.question_bank (
  id            uuid primary key default gen_random_uuid(),
  teacher_id    uuid not null references public.profiles(id) on delete cascade,
  topic         text,                                  -- chủ đề / nhóm (vd "Thì hiện tại đơn")
  difficulty    text not null default 'medium',        -- 'easy' | 'medium' | 'hard'
  question      text not null,
  options       jsonb not null default '[]',           -- ["A","B","C","D"]
  correct_index int  not null default 0,               -- vị trí đáp án đúng trong options
  explanation   text,                                  -- giải thích đáp án (tuỳ chọn)
  created_at    timestamptz not null default now()
);
-- Index phục vụ lọc theo giáo viên + chủ đề (tránh quét toàn bảng khi 10k+ câu)
create index if not exists question_bank_teacher_idx on public.question_bank (teacher_id, created_at desc);
create index if not exists question_bank_topic_idx   on public.question_bank (teacher_id, topic);

alter table public.question_bank enable row level security;

-- Mỗi giáo viên chỉ thấy & quản lý câu hỏi của chính mình.
create policy "GV quản lý ngân hàng câu hỏi của mình" on public.question_bank
  for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid() and public.my_role() = 'teacher');

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

-- ===========================================
-- Migration 0004: Hệ thống chat giáo viên ↔ học sinh
-- ===========================================

-- Bảng cuộc trò chuyện (1 thread per student-teacher pair per class)
create table if not exists conversations (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references classes(id) on delete cascade,
  student_id  uuid not null references profiles(id) on delete cascade,
  teacher_id  uuid not null references profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  unique (class_id, student_id, teacher_id)
);

-- Bảng tin nhắn
create table if not exists messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id       uuid not null references profiles(id) on delete cascade,
  body            text not null check (char_length(body) > 0 and char_length(body) <= 2000),
  is_read         boolean not null default false,
  created_at      timestamptz not null default now()
);

-- Index để query nhanh
create index if not exists messages_conv_idx        on messages(conversation_id, created_at desc);
create index if not exists messages_sender_idx      on messages(sender_id);
create index if not exists conversations_student_idx on conversations(student_id);
create index if not exists conversations_teacher_idx on conversations(teacher_id);
create index if not exists conversations_class_idx   on conversations(class_id);
create index if not exists conversations_last_msg_idx on conversations(last_message_at desc);

-- ===========================================
-- RLS Policies
-- ===========================================
alter table conversations enable row level security;
alter table messages       enable row level security;

-- Conversations: học sinh xem của mình, giáo viên xem lớp mình dạy
create policy "conversations_student_select" on conversations
  for select using (student_id = auth.uid());

create policy "conversations_teacher_select" on conversations
  for select using (
    teacher_id = auth.uid()
    or exists (
      select 1 from class_teachers
      where class_teachers.class_id = conversations.class_id
        and class_teachers.teacher_id = auth.uid()
    )
  );

-- Tạo conversation: học sinh hoặc giáo viên trong lớp đó
create policy "conversations_insert" on conversations
  for insert with check (
    student_id = auth.uid()
    or teacher_id = auth.uid()
    or exists (
      select 1 from class_teachers
      where class_teachers.class_id = conversations.class_id
        and class_teachers.teacher_id = auth.uid()
    )
  );

-- Messages: chỉ xem được conversation mình tham gia
create policy "messages_select" on messages
  for select using (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and (c.student_id = auth.uid() or c.teacher_id = auth.uid())
    )
  );

-- Gửi tin nhắn: phải là member của conversation
create policy "messages_insert" on messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and (c.student_id = auth.uid() or c.teacher_id = auth.uid())
    )
  );

-- Đánh dấu đã đọc: chỉ người nhận mới được update
create policy "messages_update_read" on messages
  for update using (
    sender_id != auth.uid()
    and exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and (c.student_id = auth.uid() or c.teacher_id = auth.uid())
    )
  ) with check (is_read = true);

-- Realtime: bật cho messages
alter publication supabase_realtime add table messages;

-- Function: cập nhật last_message_at khi gửi tin
create or replace function update_conversation_last_message()
returns trigger language plpgsql security definer as $$
begin
  update conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_update_conversation_timestamp
  after insert on messages
  for each row
  execute function update_conversation_last_message();

-- =====================================================================
-- Migration 0005 — RPC thêm đồng giáo viên vào lớp bằng email
-- =====================================================================

-- Thêm đồng giáo viên vào lớp, chỉ người tạo lớp (owner) mới được gọi.
create or replace function public.add_teacher_by_email(
  p_class_id  uuid,
  p_email     text
)
returns table(full_name text) language plpgsql security definer set search_path = public as $$
declare
  v_teacher_id uuid;
  v_caller_id  uuid := auth.uid();
  v_owner_id   uuid;
  v_name       text;
begin
  -- Lấy owner của lớp
  select created_by into v_owner_id from classes where id = p_class_id;
  if v_owner_id is null then
    raise exception 'Lớp không tồn tại.';
  end if;
  if v_owner_id <> v_caller_id then
    raise exception 'Bạn không có quyền thêm giáo viên vào lớp này.';
  end if;

  -- Tìm giáo viên theo email với role = teacher
  select p.id, p.full_name
  into v_teacher_id, v_name
  from profiles p
  where p.email = p_email
    and p.role = 'teacher'
  limit 1;

  if v_teacher_id is null then
    raise exception 'Không tìm thấy giáo viên với email này.';
  end if;

  -- Thêm vào class_teachers nếu chưa có
  insert into class_teachers(class_id, teacher_id, role)
  values (p_class_id, v_teacher_id, 'co_teacher')
  on conflict (class_id, teacher_id) do nothing;

  return query select v_name;
end;
$$;

-- Quyền gọi: chỉ người dùng đã đăng nhập
revoke all on function public.add_teacher_by_email(uuid, text) from anon;
grant execute on function public.add_teacher_by_email(uuid, text) to authenticated;

-- Index hỗ trợ tìm theo email (nếu chưa có)
create index if not exists idx_profiles_email on public.profiles(email);

-- =====================================================================
-- PPS LMS — Kho tài liệu tham khảo
-- Cách chạy: Supabase Dashboard > SQL Editor > dán file này > Run
-- =====================================================================

-- ===== CHỦ ĐỀ TÀI LIỆU =====
create table if not exists public.library_topics (
  id         uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  title      text not null,
  created_at timestamptz not null default now()
);
create index if not exists library_topics_teacher_idx on public.library_topics(teacher_id, created_at desc);
alter table public.library_topics enable row level security;

-- GV quản lý chủ đề của mình
create policy "GV quản lý chủ đề" on public.library_topics
  for all
  using  (teacher_id = auth.uid())
  with check (teacher_id = auth.uid() and public.my_role() = 'teacher');

-- HS xem chủ đề của GV đang dạy lớp mình
create policy "HS xem chủ đề" on public.library_topics
  for select
  using (
    public.my_role() = 'student' and
    exists (
      select 1 from public.class_students cs
      join public.class_teachers ct on ct.class_id = cs.class_id
      where cs.student_id = auth.uid()
        and ct.teacher_id = library_topics.teacher_id
    )
  );

-- Quản lý xem tất cả
create policy "Quản lý xem chủ đề" on public.library_topics
  for select
  using (public.my_role() = 'manager');

-- ===== TÀI LIỆU TRONG CHỦ ĐỀ =====
create table if not exists public.library_docs (
  id          uuid primary key default gen_random_uuid(),
  topic_id    uuid not null references public.library_topics(id) on delete cascade,
  teacher_id  uuid not null references public.profiles(id),
  title       text not null,
  file_url    text,                              -- URL tài liệu (Google Drive, YouTube, v.v.)
  file_type   text not null default 'link',      -- 'pdf' | 'link' | 'video' | 'image'
  description text,
  created_at  timestamptz not null default now()
);
create index if not exists library_docs_topic_idx on public.library_docs(topic_id, created_at desc);
alter table public.library_docs enable row level security;

-- GV quản lý tài liệu của mình
create policy "GV quản lý tài liệu" on public.library_docs
  for all
  using  (teacher_id = auth.uid())
  with check (teacher_id = auth.uid() and public.my_role() = 'teacher');

-- HS xem tài liệu của GV đang dạy lớp mình
create policy "HS xem tài liệu" on public.library_docs
  for select
  using (
    public.my_role() = 'student' and
    exists (
      select 1 from public.class_students cs
      join public.class_teachers ct on ct.class_id = cs.class_id
      where cs.student_id = auth.uid()
        and ct.teacher_id = library_docs.teacher_id
    )
  );

-- Quản lý xem tất cả
create policy "Quản lý xem tài liệu" on public.library_docs
  for select
  using (public.my_role() = 'manager');
-- =====================================================================
-- PPS LMS — Vai trò Quản lý + Chương trình học
-- Cách chạy: Supabase Dashboard > SQL Editor > dán file này > Run
-- QUAN TRỌNG: chạy SAU 0006_library.sql
-- =====================================================================

-- Thêm giá trị 'manager' vào enum user_role
-- (ALTER TYPE ADD VALUE không thể rollback — chạy cẩn thận)
alter type public.user_role add value if not exists 'manager';

-- Cập nhật hàm handle_new_user để chấp nhận role 'manager'
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(
      (new.raw_user_meta_data ->> 'role')::public.user_role,
      'student'
    )
  );
  return new;
end;
$$;

-- Cập nhật my_role() — hàm helper (không cần thay đổi, enum đã mở rộng)

-- ===== CHUYÊN MÔN =====
create table if not exists public.specialties (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  created_at timestamptz not null default now()
);
alter table public.specialties enable row level security;
create policy "Mọi người xem chuyên môn" on public.specialties
  for select using (true);
create policy "Quản lý quản lý chuyên môn" on public.specialties
  for all using (public.my_role() = 'manager')
  with check (public.my_role() = 'manager');

-- ===== CHƯƠNG TRÌNH HỌC =====
create table if not exists public.programs (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,          -- mã chương trình VD: "ANH-SO-CAP"
  name         text not null,
  level        int not null default 1,         -- cấp bậc 1, 2, 3...
  tuition      numeric not null default 0,     -- học phí
  specialty_id uuid references public.specialties(id) on delete set null,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists programs_specialty_idx on public.programs(specialty_id);
alter table public.programs enable row level security;

create policy "Mọi người xem chương trình học" on public.programs
  for select using (true);
create policy "Quản lý quản lý chương trình học" on public.programs
  for all using (public.my_role() = 'manager')
  with check (public.my_role() = 'manager');

-- ===== DỮ LIỆU MẪU cho chuyên môn =====
insert into public.specialties (name) values
  ('Tiếng Anh'),
  ('Toán'),
  ('Ngữ Văn')
on conflict (name) do nothing;
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
-- PPS LMS G3 — Class Announcements · Leave Requests · Question Bank
-- Chạy SAU 0008_sprint3.sql
-- Tạo: class_announcements, leave_requests, question_banks, questions, exams, exam_questions
-- =====================================================================


-- =====================================================================
-- 1. CLASS_ANNOUNCEMENTS — Thông báo nhanh GV → lớp
-- =====================================================================
create table if not exists public.class_announcements (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.classes(id) on delete cascade,
  teacher_id  uuid not null references public.profiles(id) on delete cascade,
  content     text not null,
  created_at  timestamptz not null default now()
);

create index if not exists ca_class_id_idx      on public.class_announcements(class_id);
create index if not exists ca_created_at_idx    on public.class_announcements(created_at desc);

alter table public.class_announcements enable row level security;

-- SELECT: HS trong lớp, GV của lớp, manager
create policy "ca_select" on public.class_announcements
  for select using (
    public.my_role() = 'manager'
    or exists (
      select 1 from public.class_teachers ct
      where ct.class_id = class_announcements.class_id
        and ct.teacher_id = auth.uid()
    )
    or exists (
      select 1 from public.class_students cs
      where cs.class_id = class_announcements.class_id
        and cs.student_id = auth.uid()
    )
  );

-- INSERT: GV của lớp đó
create policy "ca_insert" on public.class_announcements
  for insert with check (
    public.my_role() = 'teacher'
    and teacher_id = auth.uid()
    and exists (
      select 1 from public.class_teachers ct
      where ct.class_id = class_announcements.class_id
        and ct.teacher_id = auth.uid()
    )
  );

-- DELETE: GV tạo ra hoặc manager
create policy "ca_delete" on public.class_announcements
  for delete using (
    public.my_role() = 'manager'
    or (public.my_role() = 'teacher' and teacher_id = auth.uid())
  );


-- =====================================================================
-- 2. LEAVE_REQUESTS — Lịch nghỉ / Xin phép của giáo viên
-- =====================================================================
create table if not exists public.leave_requests (
  id            uuid primary key default gen_random_uuid(),
  teacher_id    uuid not null references public.profiles(id) on delete cascade,
  start_date    date not null,
  end_date      date not null,
  reason        text not null,
  status        text not null default 'pending'
                  check (status in ('pending', 'approved', 'rejected')),
  reviewed_by   uuid references public.profiles(id) on delete set null,
  reviewed_at   timestamptz,
  manager_note  text,
  created_at    timestamptz not null default now(),
  constraint leave_dates_check check (end_date >= start_date)
);

create index if not exists lr_teacher_id_idx  on public.leave_requests(teacher_id);
create index if not exists lr_status_idx      on public.leave_requests(status);
create index if not exists lr_start_date_idx  on public.leave_requests(start_date);

alter table public.leave_requests enable row level security;

-- SELECT: GV thấy đơn của mình, manager thấy tất cả
create policy "lr_select" on public.leave_requests
  for select using (
    public.my_role() = 'manager'
    or (public.my_role() = 'teacher' and teacher_id = auth.uid())
  );

-- INSERT: chỉ GV, phải đứng tên mình
create policy "lr_insert" on public.leave_requests
  for insert with check (
    public.my_role() = 'teacher'
    and teacher_id = auth.uid()
  );

-- UPDATE: GV sửa khi còn pending, manager duyệt bất cứ lúc nào
create policy "lr_update" on public.leave_requests
  for update using (
    public.my_role() = 'manager'
    or (public.my_role() = 'teacher' and teacher_id = auth.uid() and status = 'pending')
  );

-- DELETE: GV xóa khi còn pending
create policy "lr_delete" on public.leave_requests
  for delete using (
    public.my_role() = 'teacher'
    and teacher_id = auth.uid()
    and status = 'pending'
  );


-- =====================================================================
-- 3. QUESTION_BANKS — Ngân hàng câu hỏi của giáo viên
-- =====================================================================
create table if not exists public.question_banks (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  description text,
  subject     text,
  created_at  timestamptz not null default now()
);

create index if not exists qb_teacher_id_idx on public.question_banks(teacher_id);

alter table public.question_banks enable row level security;

-- GV chỉ thấy ngân hàng của mình, manager thấy tất cả
create policy "qb_select" on public.question_banks
  for select using (
    public.my_role() = 'manager'
    or (public.my_role() = 'teacher' and teacher_id = auth.uid())
  );

create policy "qb_insert" on public.question_banks
  for insert with check (
    public.my_role() = 'teacher' and teacher_id = auth.uid()
  );

create policy "qb_update" on public.question_banks
  for update using (
    public.my_role() = 'teacher' and teacher_id = auth.uid()
  );

create policy "qb_delete" on public.question_banks
  for delete using (
    public.my_role() = 'teacher' and teacher_id = auth.uid()
  );


-- =====================================================================
-- 4. QUESTIONS — Câu hỏi trong ngân hàng
-- =====================================================================
create table if not exists public.questions (
  id            uuid primary key default gen_random_uuid(),
  bank_id       uuid not null references public.question_banks(id) on delete cascade,
  content       text not null,
  type          text not null check (type in ('multiple_choice', 'essay')),
  -- multiple_choice: {"A":"...","B":"...","C":"...","D":"..."}
  options       jsonb,
  correct_answer text,   -- multiple_choice: "A"|"B"|"C"|"D"
  max_score     int not null default 1,
  explanation   text,
  order_index   int not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists q_bank_id_idx     on public.questions(bank_id);
create index if not exists q_type_idx        on public.questions(type);
create index if not exists q_order_idx       on public.questions(bank_id, order_index);

alter table public.questions enable row level security;

-- Kế thừa quyền từ question_banks (GV chỉ thấy câu hỏi thuộc ngân hàng của mình)
create policy "q_select" on public.questions
  for select using (
    exists (
      select 1 from public.question_banks qb
      where qb.id = questions.bank_id
        and (qb.teacher_id = auth.uid() or public.my_role() = 'manager')
    )
  );

create policy "q_insert" on public.questions
  for insert with check (
    exists (
      select 1 from public.question_banks qb
      where qb.id = questions.bank_id and qb.teacher_id = auth.uid()
    )
  );

create policy "q_update" on public.questions
  for update using (
    exists (
      select 1 from public.question_banks qb
      where qb.id = questions.bank_id and qb.teacher_id = auth.uid()
    )
  );

create policy "q_delete" on public.questions
  for delete using (
    exists (
      select 1 from public.question_banks qb
      where qb.id = questions.bank_id and qb.teacher_id = auth.uid()
    )
  );


-- =====================================================================
-- 5. EXAMS — Đề thi được tạo từ ngân hàng câu hỏi
-- =====================================================================
create table if not exists public.exams (
  id               uuid primary key default gen_random_uuid(),
  teacher_id       uuid not null references public.profiles(id) on delete cascade,
  class_id         uuid references public.classes(id) on delete set null,
  bank_id          uuid references public.question_banks(id) on delete set null,
  title            text not null,
  description      text,
  exam_type        text not null check (exam_type in ('multiple_choice', 'essay', 'mixed')),
  duration_minutes int,
  due_date         timestamptz,
  is_published     boolean not null default false,
  created_at       timestamptz not null default now()
);

create index if not exists e_teacher_id_idx on public.exams(teacher_id);
create index if not exists e_class_id_idx   on public.exams(class_id);
create index if not exists e_due_date_idx   on public.exams(due_date);

alter table public.exams enable row level security;

-- GV thấy đề của mình, HS thấy đề đã publish trong lớp mình, manager thấy tất cả
create policy "e_select" on public.exams
  for select using (
    public.my_role() = 'manager'
    or (public.my_role() = 'teacher' and teacher_id = auth.uid())
    or (
      public.my_role() = 'student'
      and is_published = true
      and class_id is not null
      and exists (
        select 1 from public.class_students cs
        where cs.class_id = exams.class_id
          and cs.student_id = auth.uid()
      )
    )
  );

create policy "e_insert" on public.exams
  for insert with check (
    public.my_role() = 'teacher' and teacher_id = auth.uid()
  );

create policy "e_update" on public.exams
  for update using (
    public.my_role() = 'teacher' and teacher_id = auth.uid()
  );

create policy "e_delete" on public.exams
  for delete using (
    public.my_role() = 'teacher' and teacher_id = auth.uid()
  );


-- =====================================================================
-- 6. EXAM_QUESTIONS — Câu hỏi trong đề thi (snapshot, không linked trực tiếp)
-- =====================================================================
create table if not exists public.exam_questions (
  id              uuid primary key default gen_random_uuid(),
  exam_id         uuid not null references public.exams(id) on delete cascade,
  -- Lưu snapshot nội dung câu hỏi để đề không bị thay đổi khi sửa ngân hàng
  content         text not null,
  type            text not null check (type in ('multiple_choice', 'essay')),
  options         jsonb,
  correct_answer  text,
  max_score       int not null default 1,
  order_index     int not null default 0
);

create index if not exists eq_exam_id_idx    on public.exam_questions(exam_id);
create index if not exists eq_order_idx      on public.exam_questions(exam_id, order_index);

alter table public.exam_questions enable row level security;

-- Kế thừa quyền từ exams
create policy "eq_select" on public.exam_questions
  for select using (
    exists (
      select 1 from public.exams e
      where e.id = exam_questions.exam_id
        and (
          public.my_role() = 'manager'
          or (public.my_role() = 'teacher' and e.teacher_id = auth.uid())
          or (
            public.my_role() = 'student'
            and e.is_published = true
            and e.class_id is not null
            and exists (
              select 1 from public.class_students cs
              where cs.class_id = e.class_id and cs.student_id = auth.uid()
            )
          )
        )
    )
  );

create policy "eq_insert" on public.exam_questions
  for insert with check (
    exists (
      select 1 from public.exams e
      where e.id = exam_questions.exam_id and e.teacher_id = auth.uid()
    )
  );

create policy "eq_delete" on public.exam_questions
  for delete using (
    exists (
      select 1 from public.exams e
      where e.id = exam_questions.exam_id and e.teacher_id = auth.uid()
    )
  );
-- Thêm cột level cho classes (cấp độ CEFR: A1/A2/B1/B2/C1/C2)
-- Học sinh trong lớp sẽ chỉ thấy listening topics đúng cấp độ lớp mình.

alter table public.classes add column if not exists level text not null default 'B1';

-- Update RPC create_class — nhận thêm p_level
create or replace function public.create_class(
  p_name       text,
  p_year       text    default null,
  p_school_id  uuid    default null,
  p_school_name text   default null,
  p_custom     jsonb   default '{}',
  p_level      text    default 'B1'
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_school uuid := p_school_id;
  v_class  uuid;
begin
  if public.my_role() <> 'teacher' then
    raise exception 'Chỉ giáo viên mới được tạo lớp';
  end if;

  if v_school is null and p_school_name is not null and length(trim(p_school_name)) > 0 then
    insert into public.schools (name) values (trim(p_school_name)) returning id into v_school;
  end if;

  insert into public.classes (school_id, name, year, custom_fields, level, created_by)
  values (v_school, p_name, p_year, coalesce(p_custom, '{}'::jsonb), coalesce(p_level, 'B1'), auth.uid())
  returning id into v_class;

  insert into public.class_teachers (class_id, teacher_id, role)
  values (v_class, auth.uid(), 'owner');

  return v_class;
end;
$$;
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
-- PPS LMS — Assignments v2: due_date, description, submission feedback
-- Chạy SAU 0011_lecture_admin.sql

ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS due_date    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS feedback TEXT;

-- Index hỗ trợ lọc bài tập sắp hết hạn
CREATE INDEX IF NOT EXISTS assign_due_date_idx ON public.assignments(due_date)
  WHERE due_date IS NOT NULL;
