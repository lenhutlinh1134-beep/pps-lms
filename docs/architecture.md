# Kiến trúc & Mô hình dữ liệu — PPS LMS

## Luồng dữ liệu tổng quát

```
Giáo viên (tạo bài / đăng video)
    ↓
Học sinh (học / làm bài)
    ↓
Hệ thống ghi nhận log (thời lượng, lượt nghe, điểm danh, điểm)
    ↓
Phân tích + Flag Engine
    ↓
Báo cáo → Giáo viên & Phụ huynh
```

---

## Schema Postgres (Supabase)

File thực tế: `supabase/migrations/`. Chi tiết RLS xem [`supabase/CLAUDE.md`](../supabase/CLAUDE.md).

### Bảng lõi

| Bảng | Mô tả |
|---|---|
| `profiles` | Hồ sơ người dùng, gắn `auth.users`, cột `role` = 'student' \| 'teacher' \| 'parent' |
| `schools` | Trường học |
| `classes` | Lớp học: `school_id`, năm học, `created_by`, trường tuỳ biến (JSONB) |
| `class_teachers` | Nối lớp ↔ giáo viên (nhiều GV/lớp, quyền theo người tạo lớp) |
| `class_students` | Nối lớp ↔ học sinh |
| `parent_student` | Nối phụ huynh ↔ con |

### Bảng nội dung học

| Bảng | Mô tả |
|---|---|
| `lectures` | Bài giảng / video do GV đăng. Có `teacher_name` (denormalize) |
| `lecture_comments` | Q&A dưới video. Có `author_name/author_role` (denormalize) |
| `lecture_views` | Đánh dấu đã xem + tiến độ của HS |
| `assignments` | Bài tập (làm sau) |
| `submissions` | Bài nộp (làm sau) |
| `listening_lessons` | Nội dung "học từ kết nối" (port từ dữ liệu cũ) |

### Bảng theo dõi & báo cáo

| Bảng | Mô tả |
|---|---|
| `student_logs` | Nhật ký HS: thời lượng học, lượt truy cập online, lượt nghe, điểm danh, điểm số |
| `teacher_notes` | Nhận xét / lưu ý của GV cho từng HS (phụ huynh xem được) |
| `attendance` | Điểm danh: ngày, trạng thái có mặt / muộn / vắng |

---

## Nguyên tắc kiến trúc (đánh giá mỗi khi build)

### Scalability — 10k học sinh
- Luôn phân trang danh sách (không load toàn bộ)
- Đánh index cột lọc / sắp xếp thường dùng
- Không `select *` toàn bảng
- Không query N+1 — dùng join hoặc `select` lồng của Supabase

### Security
- Bật **Row Level Security (RLS)** trên MỌI bảng
- HS chỉ thấy dữ liệu của mình
- PH chỉ thấy dữ liệu con mình
- GV chỉ thấy dữ liệu lớp mình
- **KHÔNG tắt RLS ở production**

### Performance
- Tránh N+1: dùng join / `select` lồng của Supabase
- Denormalize hợp lý cho dashboard (vd: lưu `teacher_name` thẳng vào `lectures`)
- Cache tĩnh khi hợp lý (Next.js `revalidate`)

### Maintainability
- Tách component theo vai trò (student / teacher / parent)
- Tái dùng design tokens từ `dign.md`
- RPC Postgres cho logic phức tạp (vd: `create_class`, `add_student_by_email`)

---

## Cấu trúc thư mục `src/`

```
src/
├── app/
│   ├── (auth)/login/          # Trang đăng nhập
│   ├── (auth)/register/       # Trang đăng ký
│   ├── (dashboard)/
│   │   ├── student/           # Dashboard học sinh
│   │   │   ├── listening/     # Trang luyện nghe
│   │   │   └── lectures/      # Trang bài giảng
│   │   ├── teacher/           # Dashboard giáo viên
│   │   │   ├── classes/       # Quản lý lớp
│   │   │   └── lectures/      # Đăng bài giảng
│   │   └── parent/            # Dashboard phụ huynh
│   ├── demo/                  # Xem thử không cần login (dev only)
│   └── auth/callback/         # Supabase auth callback
├── components/
│   ├── listening/             # ListeningStudio
│   ├── lectures/              # LectureForm, LectureView, LectureComments...
│   ├── teacher/               # ClassManager, NewClassForm
│   ├── parent/                # LinkChildForm
│   ├── student/               # OnlinePresence
│   ├── dashboard/             # Widgets chung
│   ├── profile/               # ProfileView
│   └── ui/                    # Button, Card, Input, ProgressRing (React 19)
├── lib/
│   ├── supabase/              # Client, auth helpers
│   ├── b1-words.ts            # Helper từ B1
│   ├── video.ts               # parseMedia()
│   └── demo.ts                # Cửa sau dev (xoá khi không cần)
└── data/
    ├── listening-topics.json  # 379 đoạn văn EN+VI
    └── b1-words.json          # 1075 từ B1
```
