# /db — Thao Tác Database Nhanh

**Dùng khi:** Cần tạo migration, query, hoặc kiểm tra schema Supabase.

**Model nên dùng:** claude-haiku-4-5-20251001

## Schema cốt lõi (đừng search lại)

```
users(id, role: student|teacher|parent, full_name, email, avatar_url)
classes(id, teacher_id, name, level, is_active)
enrollments(id, class_id, student_id, parent_id)
lessons(id, class_id, title, video_url, audio_url, pdf_url, order_index)
attendance(id, lesson_id, student_id, status: present|absent|late)
assignments(id, lesson_id, title, due_date)
submissions(id, assignment_id, student_id, file_url, score, feedback)
comments(id, lesson_id, user_id, content, parent_comment_id)
```

**RLS bắt buộc:** Mỗi bảng đều có RLS. Không bao giờ tắt.

## Nguyên tắc (không cần nhắc lại)

- Không `SELECT *` — chỉ lấy cột cần thiết
- Luôn có `LIMIT` khi query danh sách
- Index trên FK và cột filter thường dùng
- Migration file đặt tại `supabase/migrations/` với prefix timestamp

## Cách gọi

```
/db [mô tả ngắn việc cần làm]
```

Ví dụ:
- `/db tạo bảng notifications`
- `/db query lấy danh sách bài học của class_id`
- `/db thêm index cho bảng attendance`

## Output

- Migration SQL hoặc query SQL
- Giải thích 1 câu tại sao làm vậy
- Cảnh báo nếu có vấn đề RLS hoặc performance
