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
