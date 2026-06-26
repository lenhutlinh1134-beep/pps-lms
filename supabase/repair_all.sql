-- =====================================================================
-- PPS LMS — REPAIR SQL (chạy 1 lần trong Supabase SQL Editor)
-- Sửa tất cả lỗi: cột thiếu, RPC thiếu, bảng thiếu
-- =====================================================================

-- 1. Thêm cột còn thiếu vào bảng classes
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS level       TEXT NOT NULL DEFAULT 'B1',
  ADD COLUMN IF NOT EXISTS is_active   BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

-- Tạo invite_code ngẫu nhiên cho các lớp cũ chưa có
UPDATE public.classes
SET invite_code = upper(substr(md5(random()::text), 1, 8))
WHERE invite_code IS NULL;

-- 2. Tạo RPC create_class (có level) — idempotent
CREATE OR REPLACE FUNCTION public.create_class(
  p_name        TEXT,
  p_year        TEXT    DEFAULT NULL,
  p_school_id   UUID    DEFAULT NULL,
  p_school_name TEXT    DEFAULT NULL,
  p_custom      JSONB   DEFAULT '{}',
  p_level       TEXT    DEFAULT 'B1'
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_school UUID := p_school_id;
  v_class  UUID;
  v_code   TEXT;
BEGIN
  IF public.my_role() <> 'teacher' THEN
    RAISE EXCEPTION 'Chỉ giáo viên mới được tạo lớp';
  END IF;

  -- Tạo trường mới nếu cần
  IF v_school IS NULL AND p_school_name IS NOT NULL AND length(trim(p_school_name)) > 0 THEN
    INSERT INTO public.schools (name) VALUES (trim(p_school_name)) RETURNING id INTO v_school;
  END IF;

  -- Tạo invite_code ngẫu nhiên
  v_code := upper(substr(md5(random()::text), 1, 8));

  INSERT INTO public.classes (school_id, name, year, custom_fields, level, is_active, invite_code, created_by)
  VALUES (v_school, p_name, p_year, COALESCE(p_custom, '{}'::jsonb), COALESCE(p_level, 'B1'), true, v_code, auth.uid())
  RETURNING id INTO v_class;

  INSERT INTO public.class_teachers (class_id, teacher_id, role)
  VALUES (v_class, auth.uid(), 'owner');

  RETURN v_class;
END;
$$;

-- 3. RPC regenerate_invite_code
CREATE OR REPLACE FUNCTION public.regenerate_invite_code(p_class_id UUID)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_code TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.class_teachers
    WHERE class_id = p_class_id AND teacher_id = auth.uid() AND role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Chỉ giáo viên chủ lớp mới được đổi mã mời';
  END IF;

  v_code := upper(substr(md5(random()::text), 1, 8));
  UPDATE public.classes SET invite_code = v_code WHERE id = p_class_id;
  RETURN v_code;
END;
$$;

-- 4. RPC join_class_by_invite_code (học sinh dùng mã mời)
CREATE OR REPLACE FUNCTION public.join_class_by_invite_code(p_code TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_class_id UUID;
BEGIN
  SELECT id INTO v_class_id FROM public.classes
  WHERE invite_code = upper(trim(p_code)) AND is_active = true;

  IF v_class_id IS NULL THEN
    RAISE EXCEPTION 'Mã mời không hợp lệ hoặc lớp đã đóng';
  END IF;

  -- Thêm vào lớp (nếu chưa có)
  INSERT INTO public.class_students (class_id, student_id)
  VALUES (v_class_id, auth.uid())
  ON CONFLICT DO NOTHING;

  RETURN v_class_id;
END;
$$;

-- 5. Bảng specialties và programs (cho Manager dashboard)
CREATE TABLE IF NOT EXISTS public.specialties (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.specialties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "specialties_select" ON public.specialties;
DROP POLICY IF EXISTS "specialties_manage" ON public.specialties;
CREATE POLICY "specialties_select" ON public.specialties FOR SELECT TO authenticated USING (true);
CREATE POLICY "specialties_manage" ON public.specialties FOR ALL
  USING (public.my_role() = 'manager') WITH CHECK (public.my_role() = 'manager');

INSERT INTO public.specialties (name) VALUES ('Tiếng Anh'), ('IELTS'), ('TOEIC') ON CONFLICT DO NOTHING;

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
DROP POLICY IF EXISTS "programs_select" ON public.programs;
DROP POLICY IF EXISTS "programs_manage" ON public.programs;
CREATE POLICY "programs_select" ON public.programs FOR SELECT TO authenticated USING (true);
CREATE POLICY "programs_manage" ON public.programs FOR ALL
  USING (public.my_role() = 'manager') WITH CHECK (public.my_role() = 'manager');

INSERT INTO public.programs (code, name, level, tuition) VALUES
  ('ANH-CO-BAN',    'Tiếng Anh Cơ Bản',   1, 2500000),
  ('ANH-TRUNG-CAP', 'Tiếng Anh Trung Cấp', 2, 3000000),
  ('IELTS-PRO',     'Luyện Thi IELTS',     3, 4500000)
ON CONFLICT (code) DO NOTHING;

-- 6. Xác nhận tất cả user đã confirm email (không bị chặn đăng nhập)
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email_confirmed_at IS NULL;

-- 7. Kiểm tra kết quả
SELECT
  (SELECT count(*) FROM public.profiles)          AS profiles_count,
  (SELECT count(*) FROM public.classes)           AS classes_count,
  (SELECT count(*) FROM public.specialties)       AS specialties_count,
  (SELECT count(*) FROM public.programs)          AS programs_count,
  (SELECT column_name FROM information_schema.columns
   WHERE table_name='classes' AND column_name='level' LIMIT 1) AS has_level,
  (SELECT column_name FROM information_schema.columns
   WHERE table_name='classes' AND column_name='invite_code' LIMIT 1) AS has_invite_code,
  (SELECT column_name FROM information_schema.columns
   WHERE table_name='classes' AND column_name='is_active' LIMIT 1) AS has_is_active;
