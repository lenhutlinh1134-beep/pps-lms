-- Thêm cột level cho classes (cấp độ CEFR: A1/A2/B1/B2/C1/C2)
-- Học sinh trong lớp sẽ chỉ thấy listening topics đúng cấp độ lớp mình.

alter table public.classes add column if not exists level text not null default 'B1';

-- Update RPC create_class — nhận thêm p_level
create or replace function public.create_class(
  p_name       text,
  p_year       text    default null,
  p_school_id  uuid    default null,
  p_school_name text   default null,
  p_custom     jsonb   default '{}',
  p_level      text    default 'B1'
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_school uuid := p_school_id;
  v_class  uuid;
begin
  if public.my_role() <> 'teacher' then
    raise exception 'Chỉ giáo viên mới được tạo lớp';
  end if;

  if v_school is null and p_school_name is not null and length(trim(p_school_name)) > 0 then
    insert into public.schools (name) values (trim(p_school_name)) returning id into v_school;
  end if;

  insert into public.classes (school_id, name, year, custom_fields, level, created_by)
  values (v_school, p_name, p_year, coalesce(p_custom, '{}'::jsonb), coalesce(p_level, 'B1'), auth.uid())
  returning id into v_class;

  insert into public.class_teachers (class_id, teacher_id, role)
  values (v_class, auth.uid(), 'owner');

  return v_class;
end;
$$;
