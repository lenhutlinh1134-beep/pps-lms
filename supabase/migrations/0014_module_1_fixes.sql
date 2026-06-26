-- Thêm cột invite_code vào bảng classes
ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS invite_code text UNIQUE;

-- Sinh mã ngẫu nhiên cho các lớp chưa có invite_code
UPDATE public.classes 
SET invite_code = upper(substr(md5(random()::text), 1, 6))
WHERE invite_code IS NULL;

-- 1. Hàm get_class_stats
CREATE OR REPLACE FUNCTION public.get_class_stats(p_class_id uuid)
RETURNS TABLE (
  total_students int,
  attendance_rate numeric,
  avg_score numeric,
  study_minutes_7d int,
  listens_7d int,
  active_students_7d int,
  absent_count_7d int
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  WITH class_users AS (
    SELECT student_id FROM public.class_students WHERE class_id = p_class_id
  ),
  attendance_stats AS (
    SELECT 
      count(*) AS total_records,
      sum(case when status = 'present' or status = 'late' then 1 else 0 end) AS present_count,
      sum(case when status = 'absent' and date >= current_date - interval '7 days' then 1 else 0 end) AS absent_7d
    FROM public.attendance
    WHERE class_id = p_class_id
  ),
  log_stats AS (
    SELECT
      coalesce(sum(case when occurred_at >= now() - interval '7 days' then duration_seconds else 0 end) / 60, 0)::int AS sm_7d,
      coalesce(sum(case when occurred_at >= now() - interval '7 days' and type = 'listen' then listen_count else 0 end), 0)::int AS l_7d,
      count(distinct case when occurred_at >= now() - interval '7 days' then student_id end)::int AS as_7d,
      avg(score) AS a_score
    FROM public.student_logs
    WHERE student_id IN (SELECT student_id FROM class_users)
  )
  SELECT
    (SELECT count(*)::int FROM class_users),
    (SELECT case when total_records > 0 then round((present_count::numeric / total_records) * 100, 1) else null end FROM attendance_stats),
    (SELECT round(a_score, 1) FROM log_stats),
    (SELECT sm_7d FROM log_stats),
    (SELECT l_7d FROM log_stats),
    (SELECT as_7d FROM log_stats),
    (SELECT coalesce(absent_7d, 0)::int FROM attendance_stats);
$$;

-- 2. Hàm join_class_by_invite_code
CREATE OR REPLACE FUNCTION public.join_class_by_invite_code(p_code text)
RETURNS TABLE (
  class_id uuid,
  class_name text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_class_id uuid;
  v_class_name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Vui lòng đăng nhập';
  END IF;

  SELECT id, name INTO v_class_id, v_class_name 
  FROM public.classes 
  WHERE invite_code = upper(p_code);

  IF v_class_id IS NULL THEN
    RAISE EXCEPTION 'Mã mời không hợp lệ hoặc lớp không tồn tại';
  END IF;

  -- Kiểm tra xem đã có trong lớp chưa
  IF NOT EXISTS (SELECT 1 FROM public.class_students WHERE class_id = v_class_id AND student_id = auth.uid()) THEN
    INSERT INTO public.class_students (class_id, student_id) VALUES (v_class_id, auth.uid());
  END IF;

  RETURN QUERY SELECT v_class_id, v_class_name;
END;
$$;

-- 3. Hàm regenerate_invite_code
CREATE OR REPLACE FUNCTION public.regenerate_invite_code(p_class_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_code text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.class_teachers WHERE class_id = p_class_id AND teacher_id = auth.uid()) THEN
    RAISE EXCEPTION 'Bạn không có quyền thực hiện hành động này';
  END IF;

  new_code := upper(substr(md5(random()::text), 1, 6));

  UPDATE public.classes 
  SET invite_code = new_code 
  WHERE id = p_class_id;

  RETURN new_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_class_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_class_by_invite_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.regenerate_invite_code(uuid) TO authenticated;
