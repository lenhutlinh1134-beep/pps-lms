-- =====================================================================
-- PPS LMS — Migration Giai đoạn 3 (G3)
-- Bổ sung: liên kết Phụ huynh ↔ Con (RPC) + Ngân hàng câu hỏi.
-- Cách chạy: Supabase Dashboard > SQL Editor > dán file này > Run.
-- (Chạy SAU 0001_init.sql. File này CHỈ THÊM, không sửa bảng cũ.)
-- =====================================================================

-- =====================================================================
-- RPC: Phụ huynh tự liên kết với con bằng EMAIL (security definer).
-- Lý do cần RPC: RLS của bảng `profiles` không cho phụ huynh đọc hồ sơ
-- học sinh chưa liên kết → không thể tra id từ email phía client. Hàm này
-- tra cứu an toàn (không lộ dữ liệu) rồi tạo liên kết.
--
-- ⚠️ LƯU Ý BẢO MẬT (cần siết ở production): hiện chỉ cần biết email là
-- liên kết được. Giai đoạn sau nên thêm 1 trong 2 lớp xác thực:
--   (A) Học sinh cung cấp "mã liên kết" 6 số do hệ thống sinh, hoặc
--   (B) Giáo viên/HS duyệt yêu cầu liên kết trước khi có hiệu lực.
-- Client gọi: supabase.rpc('link_child_by_email', { p_email })
-- =====================================================================
create or replace function public.link_child_by_email(p_email text)
returns table (student_id uuid, full_name text)
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_name text;
begin
  if public.my_role() <> 'parent' then
    raise exception 'Chỉ tài khoản phụ huynh mới được liên kết với con';
  end if;

  select id, full_name into v_id, v_name
  from public.profiles
  where lower(email) = lower(trim(p_email)) and role = 'student'
  limit 1;

  if v_id is null then
    raise exception 'Không tìm thấy học sinh đã đăng ký với email: %', p_email;
  end if;

  insert into public.parent_student (parent_id, student_id)
  values (auth.uid(), v_id)
  on conflict do nothing;

  return query select v_id, v_name;
end;
$$;

-- =====================================================================
-- NGÂN HÀNG CÂU HỎI — thư viện câu hỏi riêng của từng giáo viên.
-- Là nền tảng cho tính năng "Làm bài tập" (mục 2.3) ở giai đoạn sau:
-- giáo viên soạn sẵn câu hỏi rồi gom thành bài tập gán cho lớp.
-- =====================================================================
create table if not exists public.question_bank (
  id            uuid primary key default gen_random_uuid(),
  teacher_id    uuid not null references public.profiles(id) on delete cascade,
  topic         text,                                  -- chủ đề / nhóm (vd "Thì hiện tại đơn")
  difficulty    text not null default 'medium',        -- 'easy' | 'medium' | 'hard'
  question      text not null,
  options       jsonb not null default '[]',           -- ["A","B","C","D"]
  correct_index int  not null default 0,               -- vị trí đáp án đúng trong options
  explanation   text,                                  -- giải thích đáp án (tuỳ chọn)
  created_at    timestamptz not null default now()
);
-- Index phục vụ lọc theo giáo viên + chủ đề (tránh quét toàn bảng khi 10k+ câu)
create index if not exists question_bank_teacher_idx on public.question_bank (teacher_id, created_at desc);
create index if not exists question_bank_topic_idx   on public.question_bank (teacher_id, topic);

alter table public.question_bank enable row level security;

-- Mỗi giáo viên chỉ thấy & quản lý câu hỏi của chính mình.
create policy "GV quản lý ngân hàng câu hỏi của mình" on public.question_bank
  for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid() and public.my_role() = 'teacher');
