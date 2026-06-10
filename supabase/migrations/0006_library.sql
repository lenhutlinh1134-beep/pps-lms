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
