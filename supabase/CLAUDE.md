# Supabase — Database & RLS — PPS LMS

> Tài liệu này tự động load khi làm việc trong thư mục `supabase/`.

---

## Files migration

| File | Nội dung |
|---|---|
| `migrations/0001_init.sql` | Schema khởi tạo: profiles, schools, classes, lectures, comments, student_logs, RLS |
| `migrations/0002_phase3.sql` | Nâng cấp bản 2: lecture_views, attendance, teacher_notes |
| `migrations/0003_stats.sql` | Bảng/view thống kê |

**Cách chạy:** Supabase Dashboard → SQL Editor → New query → dán file → Run.

---

## Bảng chính & quan hệ

```
auth.users
    └─ profiles (role: student | teacher | parent)
           ├─ classes (created_by → teacher)
           │      ├─ class_teachers (nhiều GV/lớp)
           │      ├─ class_students (nhiều HS/lớp)
           │      ├─ lectures → lecture_comments
           │      │              └─ lecture_views
           │      ├─ attendance
           │      └─ teacher_notes
           └─ parent_student (PH ↔ con)
```

---

## Enum types

```sql
user_role       = 'student' | 'teacher' | 'parent'
lecture_type    = 'video' | 'theory'
attendance_status = 'present' | 'absent' | 'late'
```

---

## Nguyên tắc RLS — KHÔNG BAO GIỜ TẮT ở production

Mỗi bảng phải có policy theo vai trò:

| Vai trò | Được xem |
|---|---|
| **Học sinh** | Dữ liệu của chính mình + bài giảng lớp mình đang học |
| **Giáo viên** | Dữ liệu lớp mình tạo / được mời vào |
| **Phụ huynh** | Dữ liệu con mình (qua bảng `parent_student`) |

**Quy tắc viết policy:**
- Dùng `auth.uid()` để xác định người dùng hiện tại
- Dùng subquery để kiểm tra vai trò qua bảng `profiles`
- Không bao giờ dùng `using (true)` trên bảng nhạy cảm
- Tách rõ policy SELECT / INSERT / UPDATE / DELETE

---

## Functions & RPC quan trọng

| RPC | Mô tả |
|---|---|
| `handle_new_user()` | Trigger tự tạo `profiles` khi có user mới đăng ký |
| `create_class(...)` | Tạo lớp + ghi `class_teachers` cùng lúc |
| `add_student_by_email(email, class_id)` | Thêm HS vào lớp bằng email |

---

## Denormalize — tránh N+1 với RLS

RLS trên `profiles` gây vấn đề khi join → **lưu sẵn vào bảng**:

| Bảng | Cột denormalize | Lý do |
|---|---|---|
| `lectures` | `teacher_name text` | Tránh join `profiles` khi hiện danh sách |
| `lecture_comments` | `author_name text`, `author_role user_role` | Tránh join `profiles` trong Q&A |

---

## Lưu ý khi thêm migration mới

1. Đặt tên file: `000X_mô_tả_ngắn.sql`
2. Luôn thêm `-- comment` mô tả mục đích
3. Thêm index cho cột lọc/sắp xếp thường dùng (`class_id`, `student_id`, `created_at`)
4. Viết RLS policy ngay trong cùng file migration
5. Test policy với `set role authenticated; set local "request.jwt.claims" ...` trước khi áp dụng

---

## Cấu hình môi trường

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

Xem hướng dẫn đầy đủ trong [`SETUP.md`](../SETUP.md).  
**KHÔNG commit `.env.local` lên git.**
