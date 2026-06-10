-- =====================================================================
-- PPS LMS — Vai trò Quản lý + Chương trình học
-- Cách chạy: Supabase Dashboard > SQL Editor > dán file này > Run
-- QUAN TRỌNG: chạy SAU 0006_library.sql
-- =====================================================================

-- Thêm giá trị 'manager' vào enum user_role
-- (ALTER TYPE ADD VALUE không thể rollback — chạy cẩn thận)
alter type public.user_role add value if not exists 'manager';

-- Cập nhật hàm handle_new_user để chấp nhận role 'manager'
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(
      (new.raw_user_meta_data ->> 'role')::public.user_role,
      'student'
    )
  );
  return new;
end;
$$;

-- Cập nhật my_role() — hàm helper (không cần thay đổi, enum đã mở rộng)

-- ===== CHUYÊN MÔN =====
create table if not exists public.specialties (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  created_at timestamptz not null default now()
);
alter table public.specialties enable row level security;
create policy "Mọi người xem chuyên môn" on public.specialties
  for select using (true);
create policy "Quản lý quản lý chuyên môn" on public.specialties
  for all using (public.my_role() = 'manager')
  with check (public.my_role() = 'manager');

-- ===== CHƯƠNG TRÌNH HỌC =====
create table if not exists public.programs (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,          -- mã chương trình VD: "ANH-SO-CAP"
  name         text not null,
  level        int not null default 1,         -- cấp bậc 1, 2, 3...
  tuition      numeric not null default 0,     -- học phí
  specialty_id uuid references public.specialties(id) on delete set null,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists programs_specialty_idx on public.programs(specialty_id);
alter table public.programs enable row level security;

create policy "Mọi người xem chương trình học" on public.programs
  for select using (true);
create policy "Quản lý quản lý chương trình học" on public.programs
  for all using (public.my_role() = 'manager')
  with check (public.my_role() = 'manager');

-- ===== DỮ LIỆU MẪU cho chuyên môn =====
insert into public.specialties (name) values
  ('Tiếng Anh'),
  ('Toán'),
  ('Ngữ Văn')
on conflict (name) do nothing;
