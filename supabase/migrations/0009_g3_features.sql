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
