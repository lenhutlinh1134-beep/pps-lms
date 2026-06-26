-- =====================================================================
-- Migration 0013 — Bảng còn thiếu cho Manager dashboard
-- Chạy trong Supabase SQL Editor > Run
-- =====================================================================

-- 1. Thêm cột is_active vào classes (nếu chưa có)
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- 2. Bảng chuyên ngành (specialties)
CREATE TABLE IF NOT EXISTS public.specialties (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.specialties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "specialties_select" ON public.specialties
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "specialties_manage" ON public.specialties
  FOR ALL USING (public.my_role() = 'manager') WITH CHECK (public.my_role() = 'manager');

-- Seed dữ liệu mặc định
INSERT INTO public.specialties (name) VALUES
  ('Tiếng Anh'),
  ('IELTS'),
  ('TOEIC')
ON CONFLICT (name) DO NOTHING;

-- 3. Bảng chương trình học (programs)
CREATE TABLE IF NOT EXISTS public.programs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code         TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  level        INT NOT NULL DEFAULT 1,
  tuition      NUMERIC NOT NULL DEFAULT 0,
  specialty_id UUID REFERENCES public.specialties(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS programs_specialty_idx ON public.programs(specialty_id);
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "programs_select" ON public.programs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "programs_manage" ON public.programs
  FOR ALL USING (public.my_role() = 'manager') WITH CHECK (public.my_role() = 'manager');

-- Seed dữ liệu mặc định
INSERT INTO public.programs (code, name, level, tuition) VALUES
  ('ANH-CO-BAN',    'Tiếng Anh Cơ Bản',   1, 2500000),
  ('ANH-TRUNG-CAP', 'Tiếng Anh Trung Cấp', 2, 3000000),
  ('IELTS-PRO',     'Luyện Thi IELTS',     3, 4500000)
ON CONFLICT (code) DO NOTHING;
