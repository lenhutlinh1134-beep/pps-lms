-- ===========================================
-- Migration 0004: Hệ thống chat giáo viên ↔ học sinh
-- ===========================================

-- Bảng cuộc trò chuyện (1 thread per student-teacher pair per class)
create table if not exists conversations (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references classes(id) on delete cascade,
  student_id  uuid not null references profiles(id) on delete cascade,
  teacher_id  uuid not null references profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  unique (class_id, student_id, teacher_id)
);

-- Bảng tin nhắn
create table if not exists messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id       uuid not null references profiles(id) on delete cascade,
  body            text not null check (char_length(body) > 0 and char_length(body) <= 2000),
  is_read         boolean not null default false,
  created_at      timestamptz not null default now()
);

-- Index để query nhanh
create index if not exists messages_conv_idx        on messages(conversation_id, created_at desc);
create index if not exists messages_sender_idx      on messages(sender_id);
create index if not exists conversations_student_idx on conversations(student_id);
create index if not exists conversations_teacher_idx on conversations(teacher_id);
create index if not exists conversations_class_idx   on conversations(class_id);
create index if not exists conversations_last_msg_idx on conversations(last_message_at desc);

-- ===========================================
-- RLS Policies
-- ===========================================
alter table conversations enable row level security;
alter table messages       enable row level security;

-- Conversations: học sinh xem của mình, giáo viên xem lớp mình dạy
create policy "conversations_student_select" on conversations
  for select using (student_id = auth.uid());

create policy "conversations_teacher_select" on conversations
  for select using (
    teacher_id = auth.uid()
    or exists (
      select 1 from class_teachers
      where class_teachers.class_id = conversations.class_id
        and class_teachers.teacher_id = auth.uid()
    )
  );

-- Tạo conversation: học sinh hoặc giáo viên trong lớp đó
create policy "conversations_insert" on conversations
  for insert with check (
    student_id = auth.uid()
    or teacher_id = auth.uid()
    or exists (
      select 1 from class_teachers
      where class_teachers.class_id = conversations.class_id
        and class_teachers.teacher_id = auth.uid()
    )
  );

-- Messages: chỉ xem được conversation mình tham gia
create policy "messages_select" on messages
  for select using (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and (c.student_id = auth.uid() or c.teacher_id = auth.uid())
    )
  );

-- Gửi tin nhắn: phải là member của conversation
create policy "messages_insert" on messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and (c.student_id = auth.uid() or c.teacher_id = auth.uid())
    )
  );

-- Đánh dấu đã đọc: chỉ người nhận mới được update
create policy "messages_update_read" on messages
  for update using (
    sender_id != auth.uid()
    and exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and (c.student_id = auth.uid() or c.teacher_id = auth.uid())
    )
  ) with check (is_read = true);

-- Realtime: bật cho messages
alter publication supabase_realtime add table messages;

-- Function: cập nhật last_message_at khi gửi tin
create or replace function update_conversation_last_message()
returns trigger language plpgsql security definer as $$
begin
  update conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_update_conversation_timestamp
  after insert on messages
  for each row
  execute function update_conversation_last_message();
