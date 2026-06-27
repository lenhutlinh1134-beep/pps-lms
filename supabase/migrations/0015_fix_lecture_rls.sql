-- Thêm policy cho phép GV xem bài giảng của chính mình theo teacher_id
-- Lý do: policy cũ chỉ check is_class_teacher(class_id) nhưng session server-side
-- đôi khi không pass đủ cookie → RLS block toàn bộ SELECT.
-- Policy mới này là safety net: nếu teacher_id = auth.uid() thì cho xem.

CREATE POLICY "GV xem bài giảng của mình"
  ON public.lectures
  FOR SELECT
  USING (teacher_id = auth.uid());
