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
