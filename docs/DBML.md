# Database Schema — DBML Format

Paste toàn bộ code bên dưới vào **https://dbdiagram.io** để xem sơ đồ ERD trực quan.

---

## Cách Dùng

1. Truy cập [https://dbdiagram.io/d](https://dbdiagram.io/d)
2. Xoá nội dung mẫu ở cửa sổ bên trái
3. Paste toàn bộ code DBML bên dưới vào
4. Sơ đồ tự động render bên phải
5. Click **Share** → Copy link để chia sẻ

---

## DBML Code

```dbml
// PPS Anh Ngữ LMS — Database Schema
// Version: 1.0 | Date: 2026-06-27
// Tool: https://dbdiagram.io

//// ─── ENUMS ───────────────────────────────────────────

enum user_role {
  student
  teacher
  parent
  manager
}

enum lecture_type {
  video
  theory
}

enum attendance_status {
  present
  absent
  late
}

enum class_teacher_role {
  main
  assistant
}


//// ─── CORE USER TABLES ─────────────────────────────────

Table profiles {
  id uuid [pk, note: "FK → auth.users.id"]
  role user_role [not null]
  full_name text [not null]
  email text [not null, unique]
  avatar_url text
  school_id uuid [ref: > schools.id]
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]

  indexes {
    email [unique]
    school_id
    role
  }

  Note: "Mọi người dùng đều có 1 profile. Role quyết định quyền truy cập."
}

Table schools {
  id uuid [pk, default: `gen_random_uuid()`]
  name text [not null]
  code text [not null, unique, note: "VD: PPS-HCM"]
  address text
  is_active boolean [not null, default: true]
  created_at timestamptz [not null, default: `now()`]

  Note: "Trường / trung tâm học tiếng Anh"
}


//// ─── CLASS MANAGEMENT ─────────────────────────────────

Table classes {
  id uuid [pk, default: `gen_random_uuid()`]
  school_id uuid [not null, ref: > schools.id]
  name text [not null, note: "VD: Pre-IELTS A"]
  level text [note: "A1 / A2 / B1 / B2 / C1"]
  year integer [note: "Năm học, VD: 2026"]
  join_code text [unique, note: "6 ký tự, học sinh dùng để join"]
  is_active boolean [not null, default: true]
  created_by uuid [not null, ref: > profiles.id]
  created_at timestamptz [not null, default: `now()`]

  indexes {
    school_id
    created_by
    is_active
  }

  Note: "Lớp học. 1 lớp có thể có nhiều giáo viên và nhiều học sinh."
}

Table class_teachers {
  id uuid [pk, default: `gen_random_uuid()`]
  class_id uuid [not null, ref: > classes.id]
  teacher_id uuid [not null, ref: > profiles.id]
  role class_teacher_role [not null, default: "main"]

  indexes {
    (class_id, teacher_id) [unique]
    class_id
    teacher_id
  }

  Note: "Many-to-many: 1 lớp ↔ nhiều giáo viên. 1 GV dạy nhiều lớp."
}

Table class_students {
  id uuid [pk, default: `gen_random_uuid()`]
  class_id uuid [not null, ref: > classes.id]
  student_id uuid [not null, ref: > profiles.id]
  joined_at timestamptz [not null, default: `now()`]

  indexes {
    (class_id, student_id) [unique]
    class_id
    student_id
  }

  Note: "Many-to-many: 1 lớp ↔ nhiều học sinh. 1 HS có thể ở nhiều lớp."
}

Table parent_student {
  id uuid [pk, default: `gen_random_uuid()`]
  parent_id uuid [not null, ref: > profiles.id]
  student_id uuid [not null, ref: > profiles.id]

  indexes {
    (parent_id, student_id) [unique]
    parent_id
    student_id
  }

  Note: "Many-to-many: 1 phụ huynh ↔ nhiều con. 1 HS có thể có nhiều PH."
}


//// ─── CONTENT ──────────────────────────────────────────

Table lectures {
  id uuid [pk, default: `gen_random_uuid()`]
  class_id uuid [not null, ref: > classes.id]
  teacher_id uuid [not null, ref: > profiles.id]
  teacher_name text [not null, note: "Denormalized: tránh JOIN qua RLS"]
  type lecture_type [not null]
  title text [not null]
  description text
  media_url text [note: "YouTube URL, mp4 URL, hoặc PDF URL"]
  order_index integer [not null, default: 0]
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]

  indexes {
    class_id
    teacher_id
    created_at
  }

  Note: "Bài giảng video hoặc tài liệu do giáo viên đăng lên lớp."
}

Table lecture_comments {
  id uuid [pk, default: `gen_random_uuid()`]
  lecture_id uuid [not null, ref: > lectures.id]
  author_id uuid [not null, ref: > profiles.id]
  author_name text [not null, note: "Denormalized"]
  author_role user_role [not null, note: "Denormalized: student | teacher"]
  content text [not null]
  parent_comment_id uuid [ref: > lecture_comments.id, note: "NULL = top-level comment"]
  is_deleted boolean [not null, default: false]
  created_at timestamptz [not null, default: `now()`]

  indexes {
    lecture_id
    parent_comment_id
    author_id
  }

  Note: "Q&A dưới bài giảng. Hỗ trợ 1 cấp reply (parent_comment_id)."
}

Table lecture_views {
  id uuid [pk, default: `gen_random_uuid()`]
  lecture_id uuid [not null, ref: > lectures.id]
  student_id uuid [not null, ref: > profiles.id]
  watched_at timestamptz [not null, default: `now()`]
  progress_pct integer [not null, default: 0, note: "0–100%"]

  indexes {
    (lecture_id, student_id) [unique]
    student_id
  }

  Note: "Track học sinh đã xem bài giảng nào, xem đến % nào."
}


//// ─── EXERCISES ───────────────────────────────────────

Table assignments {
  id uuid [pk, default: `gen_random_uuid()`]
  class_id uuid [not null, ref: > classes.id]
  teacher_id uuid [not null, ref: > profiles.id]
  title text [not null]
  description text
  due_date timestamptz

  indexes {
    class_id
    due_date
    teacher_id
  }

  Note: "Bài tập / homework do giáo viên tạo và giao cho lớp."
}

Table submissions {
  id uuid [pk, default: `gen_random_uuid()`]
  assignment_id uuid [not null, ref: > assignments.id]
  student_id uuid [not null, ref: > profiles.id]
  content text [note: "Câu trả lời dạng text"]
  file_url text [note: "Supabase Storage URL nếu nộp file"]
  score numeric(5,2) [note: "0.00 – 100.00, NULL nếu chưa chấm"]
  feedback text [note: "Nhận xét của giáo viên"]
  submitted_at timestamptz [not null, default: `now()`]
  graded_at timestamptz [note: "NULL nếu chưa chấm"]

  indexes {
    (assignment_id, student_id) [unique]
    student_id
    assignment_id
  }

  Note: "Bài nộp của học sinh. 1 HS chỉ nộp 1 lần / 1 bài tập."
}


//// ─── ATTENDANCE & NOTES ──────────────────────────────

Table attendance {
  id uuid [pk, default: `gen_random_uuid()`]
  class_id uuid [not null, ref: > classes.id]
  student_id uuid [not null, ref: > profiles.id]
  date date [not null]
  status attendance_status [not null, default: "absent"]
  recorded_by uuid [not null, ref: > profiles.id]
  created_at timestamptz [not null, default: `now()`]

  indexes {
    (class_id, student_id, date) [unique]
    (class_id, date)
    (student_id, date)
  }

  Note: "Điểm danh từng buổi. UPSERT theo (class_id, student_id, date)."
}

Table teacher_notes {
  id uuid [pk, default: `gen_random_uuid()`]
  class_id uuid [not null, ref: > classes.id]
  student_id uuid [not null, ref: > profiles.id]
  teacher_id uuid [not null, ref: > profiles.id]
  note_text text [not null]
  visible_to_parents boolean [not null, default: false]
  created_at timestamptz [not null, default: `now()`]

  indexes {
    student_id
    class_id
    teacher_id
  }

  Note: "Nhận xét của GV về HS. visible_to_parents = true thì PH xem được."
}


//// ─── ANALYTICS ─────────────────────────────────────

Table student_logs {
  id uuid [pk, default: `gen_random_uuid()`]
  student_id uuid [not null, ref: > profiles.id]
  class_id uuid [ref: > classes.id]
  date date [not null]
  study_duration integer [not null, default: 0, note: "Giây học trong ngày"]
  login_count integer [not null, default: 0]
  listening_count integer [not null, default: 0, note: "Số bài nghe đã làm"]
  score numeric(5,2) [note: "Điểm trung bình ngày"]

  indexes {
    (student_id, date) [unique]
    (student_id, date)
    class_id
  }

  Note: "Log hoạt động học tập hàng ngày. Dùng cho Flag Engine và báo cáo."
}
```

---

## Mối Quan Hệ Tóm Tắt

| Bảng A | Quan hệ | Bảng B | Qua bảng trung gian |
|---|---|---|---|
| profiles | N:N | classes | class_teachers (GV) |
| profiles | N:N | classes | class_students (HS) |
| profiles | N:N | profiles | parent_student |
| classes | 1:N | lectures | — |
| lectures | 1:N | lecture_comments | — |
| lectures | N:N | profiles | lecture_views |
| classes | 1:N | assignments | — |
| assignments | 1:N | submissions | — |
| classes | 1:N | attendance | — |
| classes | 1:N | teacher_notes | — |
| profiles | 1:N | student_logs | — |

---

## Indexes Quan Trọng Cho 10k Users

```sql
-- Tìm lớp của học sinh (query thường xuyên nhất)
CREATE INDEX idx_class_students_student ON class_students(student_id);
CREATE INDEX idx_class_students_class ON class_students(class_id);

-- Tìm lớp của giáo viên
CREATE INDEX idx_class_teachers_teacher ON class_teachers(teacher_id);

-- Điểm danh theo ngày
CREATE INDEX idx_attendance_class_date ON attendance(class_id, date);
CREATE INDEX idx_attendance_student_date ON attendance(student_id, date DESC);

-- Bài giảng của lớp, mới nhất trước
CREATE INDEX idx_lectures_class_created ON lectures(class_id, created_at DESC);

-- Log học tập theo ngày
CREATE INDEX idx_student_logs_student_date ON student_logs(student_id, date DESC);

-- Con của phụ huynh
CREATE INDEX idx_parent_student_parent ON parent_student(parent_id);
```

---

## Views Phân Tích (Analytics)

```sql
-- Tỉ lệ đi học theo lớp, theo tháng
CREATE VIEW v_class_attendance_summary AS
SELECT
  class_id,
  date_trunc('month', date) AS month,
  COUNT(*) FILTER (WHERE status = 'present') AS present_count,
  COUNT(*) FILTER (WHERE status = 'absent') AS absent_count,
  COUNT(*) FILTER (WHERE status = 'late') AS late_count,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'present') * 100.0 / COUNT(*), 2
  ) AS attendance_rate_pct
FROM attendance
GROUP BY class_id, date_trunc('month', date);

-- Tiến độ học tập của học sinh theo lớp
CREATE VIEW v_student_progress AS
SELECT
  cs.class_id,
  cs.student_id,
  p.full_name,
  COALESCE(SUM(sl.study_duration), 0) AS total_study_seconds,
  COALESCE(SUM(sl.listening_count), 0) AS total_listening,
  COALESCE(AVG(sl.score), 0) AS avg_score,
  MAX(sl.date) AS last_active_date
FROM class_students cs
JOIN profiles p ON p.id = cs.student_id
LEFT JOIN student_logs sl ON sl.student_id = cs.student_id AND sl.class_id = cs.class_id
GROUP BY cs.class_id, cs.student_id, p.full_name;
```

---

*Cập nhật khi thêm bảng mới vào migrations. Sync với [`SPEC.md`](SPEC.md) phần 5.*
