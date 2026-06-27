-- Mở rộng policy INSERT lecture_comments:
-- Policy cũ chỉ check class_id gốc của bài giảng.
-- Học sinh trong lớp được CHIA SẺ (lecture_classes) cũng phải comment được.

CREATE POLICY "HS lớp chia sẻ viết bình luận"
  ON public.lecture_classes
  FOR SELECT
  USING (public.is_class_student(class_id));

CREATE POLICY "HS lớp chia sẻ được comment"
  ON public.lecture_comments
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.lecture_classes lc
      WHERE lc.lecture_id = lecture_id
        AND public.is_class_student(lc.class_id)
    )
  );
