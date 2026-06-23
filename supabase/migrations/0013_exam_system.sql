-- PPS LMS — Exam System (Luyện đề online như thi thật)
-- Hỗ trợ: IELTS Reading/Listening, KET, PET, TOEIC, nội bộ PPS

-- ============================================================
-- TABLES
-- ============================================================

-- Bộ đề thi
create table public.exam_sets (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  description      text,
  skill            text not null check (skill in ('reading','listening','full')),
  exam_type        text not null default 'ielts' check (exam_type in ('ielts','ket','pet','toeic','internal')),
  duration_minutes int  not null default 60,
  total_questions  int  not null default 0,
  is_published     boolean not null default false,
  thumbnail_url    text,
  created_by       uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Passage / Section (đoạn văn cho Reading, phần âm thanh cho Listening)
create table public.exam_passages (
  id           uuid primary key default gen_random_uuid(),
  exam_set_id  uuid not null references public.exam_sets(id) on delete cascade,
  order_index  int  not null default 0,
  title        text,
  content_text text,   -- Reading: nội dung đoạn văn đầy đủ
  audio_url    text,   -- Listening: link file âm thanh
  image_url    text,   -- Sơ đồ/bản đồ nếu có
  q_start      int,    -- Câu số bắt đầu (ví dụ: 1)
  q_end        int     -- Câu số kết thúc (ví dụ: 13)
);

-- Câu hỏi
create table public.exam_questions (
  id              uuid primary key default gen_random_uuid(),
  exam_set_id     uuid not null references public.exam_sets(id) on delete cascade,
  passage_id      uuid references public.exam_passages(id) on delete cascade,
  question_number int  not null,
  question_type   text not null check (question_type in ('mcq','fill_blank','tfng','ynng','matching','short_answer')),
  question_text   text,
  options         jsonb,          -- MCQ: ["A. ...", "B. ...", "C. ...", "D. ..."]
  correct_answer  text not null,  -- "A", "True", "climate change", v.v.
  explanation     text,
  points          int  not null default 1
);

-- Lần làm bài của học sinh
create table public.exam_attempts (
  id                 uuid primary key default gen_random_uuid(),
  exam_set_id        uuid not null references public.exam_sets(id) on delete cascade,
  student_id         uuid not null references public.profiles(id) on delete cascade,
  started_at         timestamptz not null default now(),
  submitted_at       timestamptz,
  time_spent_seconds int,
  score              int  not null default 0,
  total_points       int  not null default 0,
  band_score         numeric(3,1),
  status             text not null default 'in_progress' check (status in ('in_progress','submitted')),
  created_at         timestamptz not null default now()
);

-- Câu trả lời của học sinh (1 row / câu)
create table public.exam_answers (
  id             uuid primary key default gen_random_uuid(),
  attempt_id     uuid not null references public.exam_attempts(id) on delete cascade,
  question_id    uuid not null references public.exam_questions(id) on delete cascade,
  student_answer text,
  is_correct     boolean,
  answered_at    timestamptz default now(),
  unique(attempt_id, question_id)
);

-- ============================================================
-- INDEXES
-- ============================================================
create index exam_sets_published_idx   on public.exam_sets(is_published, skill, exam_type);
create index exam_sets_creator_idx     on public.exam_sets(created_by);
create index exam_passages_set_idx     on public.exam_passages(exam_set_id, order_index);
create index exam_questions_set_idx    on public.exam_questions(exam_set_id, question_number);
create index exam_questions_pass_idx   on public.exam_questions(passage_id);
create index exam_attempts_student_idx on public.exam_attempts(student_id, created_at desc);
create index exam_attempts_set_idx     on public.exam_attempts(exam_set_id);
create index exam_answers_attempt_idx  on public.exam_answers(attempt_id);

-- ============================================================
-- RLS
-- ============================================================
alter table public.exam_sets      enable row level security;
alter table public.exam_passages  enable row level security;
alter table public.exam_questions enable row level security;
alter table public.exam_attempts  enable row level security;
alter table public.exam_answers   enable row level security;

-- exam_sets
create policy "exams_select"
  on public.exam_sets for select
  using (
    is_published = true
    or created_by = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role in ('teacher','manager'))
  );

create policy "exams_insert"
  on public.exam_sets for insert
  with check (
    created_by = auth.uid()
    and exists (select 1 from public.profiles where id = auth.uid() and role in ('teacher','manager'))
  );

create policy "exams_update"
  on public.exam_sets for update
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "exams_delete"
  on public.exam_sets for delete
  using (created_by = auth.uid());

-- exam_passages: accessible khi exam visible
create policy "passages_select"
  on public.exam_passages for select
  using (exists (
    select 1 from public.exam_sets e
    where e.id = exam_set_id
      and (e.is_published = true or e.created_by = auth.uid())
  ));

create policy "passages_all"
  on public.exam_passages for all
  using (exists (
    select 1 from public.exam_sets e
    where e.id = exam_set_id and e.created_by = auth.uid()
  ))
  with check (exists (
    select 1 from public.exam_sets e
    where e.id = exam_set_id and e.created_by = auth.uid()
  ));

-- exam_questions: tương tự passages
create policy "questions_select"
  on public.exam_questions for select
  using (exists (
    select 1 from public.exam_sets e
    where e.id = exam_set_id
      and (e.is_published = true or e.created_by = auth.uid())
  ));

create policy "questions_all"
  on public.exam_questions for all
  using (exists (
    select 1 from public.exam_sets e
    where e.id = exam_set_id and e.created_by = auth.uid()
  ))
  with check (exists (
    select 1 from public.exam_sets e
    where e.id = exam_set_id and e.created_by = auth.uid()
  ));

-- exam_attempts
create policy "attempts_student_select"
  on public.exam_attempts for select
  using (student_id = auth.uid());

create policy "attempts_teacher_select"
  on public.exam_attempts for select
  using (exists (
    select 1 from public.exam_sets e
    where e.id = exam_set_id and e.created_by = auth.uid()
  ));

create policy "attempts_insert"
  on public.exam_attempts for insert
  with check (
    student_id = auth.uid()
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'student')
  );

create policy "attempts_update"
  on public.exam_attempts for update
  using (student_id = auth.uid() and status = 'in_progress')
  with check (student_id = auth.uid());

-- exam_answers
create policy "answers_student_select"
  on public.exam_answers for select
  using (exists (
    select 1 from public.exam_attempts a
    where a.id = attempt_id and a.student_id = auth.uid()
  ));

create policy "answers_teacher_select"
  on public.exam_answers for select
  using (exists (
    select 1 from public.exam_attempts a
    join public.exam_sets e on e.id = a.exam_set_id
    where a.id = attempt_id and e.created_by = auth.uid()
  ));

create policy "answers_upsert"
  on public.exam_answers for insert
  with check (exists (
    select 1 from public.exam_attempts a
    where a.id = attempt_id and a.student_id = auth.uid() and a.status = 'in_progress'
  ));

create policy "answers_update"
  on public.exam_answers for update
  using (exists (
    select 1 from public.exam_attempts a
    where a.id = attempt_id and a.student_id = auth.uid() and a.status = 'in_progress'
  ));

-- ============================================================
-- TRIGGER updated_at
-- ============================================================
create trigger exam_sets_updated_at
  before update on public.exam_sets
  for each row execute function public.set_updated_at();
