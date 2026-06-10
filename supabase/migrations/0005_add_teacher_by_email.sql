-- =====================================================================
-- Migration 0005 — RPC thêm đồng giáo viên vào lớp bằng email
-- =====================================================================

-- Thêm đồng giáo viên vào lớp, chỉ người tạo lớp (owner) mới được gọi.
create or replace function public.add_teacher_by_email(
  p_class_id  uuid,
  p_email     text
)
returns table(full_name text) language plpgsql security definer set search_path = public as $$
declare
  v_teacher_id uuid;
  v_caller_id  uuid := auth.uid();
  v_owner_id   uuid;
  v_name       text;
begin
  -- Lấy owner của lớp
  select created_by into v_owner_id from classes where id = p_class_id;
  if v_owner_id is null then
    raise exception 'Lớp không tồn tại.';
  end if;
  if v_owner_id <> v_caller_id then
    raise exception 'Bạn không có quyền thêm giáo viên vào lớp này.';
  end if;

  -- Tìm giáo viên theo email với role = teacher
  select p.id, p.full_name
  into v_teacher_id, v_name
  from profiles p
  where p.email = p_email
    and p.role = 'teacher'
  limit 1;

  if v_teacher_id is null then
    raise exception 'Không tìm thấy giáo viên với email này.';
  end if;

  -- Thêm vào class_teachers nếu chưa có
  insert into class_teachers(class_id, teacher_id, role)
  values (p_class_id, v_teacher_id, 'co_teacher')
  on conflict (class_id, teacher_id) do nothing;

  return query select v_name;
end;
$$;

-- Quyền gọi: chỉ người dùng đã đăng nhập
revoke all on function public.add_teacher_by_email(uuid, text) from anon;
grant execute on function public.add_teacher_by_email(uuid, text) to authenticated;

-- Index hỗ trợ tìm theo email (nếu chưa có)
create index if not exists idx_profiles_email on public.profiles(email);
