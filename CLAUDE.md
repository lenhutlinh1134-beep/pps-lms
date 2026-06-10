# CLAUDE.md — PPS LMS

> "clot.md" = tên anh đặt. File này phải tên `CLAUDE.md` để Claude Code tự đọc mỗi phiên. Đừng đổi tên.

---

## Dự án là gì?

**PPS LMS** — hệ thống học tiếng Anh online cho **Trung tâm Anh ngữ PPS Vietnam**.  
Kết nối 3 bên: Giáo viên dạy → Học sinh học → Phụ huynh theo dõi.  
Quy mô: ~**10.000 học sinh** — mọi quyết định code phải tính tới scale này.

| Vai trò | Làm gì |
|---|---|
| **Học sinh** | Luyện nghe, xem bài giảng, làm bài tập, hỏi đáp dưới video |
| **Giáo viên** | Tạo lớp, đăng bài giảng, điểm danh, nhận xét, báo cáo |
| **Phụ huynh** | Theo dõi tiến trình + nhận xét của giáo viên về con |

**KHÔNG có Super Admin.** Chỉ 3 vai trò trên.

---

## Tech Stack ✅ (đã chốt 2026-06-08)

| Layer | Công nghệ |
|---|---|
| Frontend | Next.js App Router + TypeScript + Tailwind CSS |
| Auth | Supabase Auth (Google + Email) |
| Database | Supabase PostgreSQL + Row Level Security |
| Storage | Supabase Storage (audio mp3, video, PDF) |
| Realtime | Supabase Realtime (giám sát online) |
| Deploy | Vercel |

**Màu sắc:** Tím `#6b38d4` + Hồng `#b4136d` — xem chi tiết trong [`dign.md`](dign.md).  
**Font:** `Plus Jakarta Sans` (tiêu đề) + `Inter` (nội dung).

---

## Quy tắc bắt buộc

**PHẢI:**
- Mobile-first / responsive (đa số HS dùng điện thoại)
- Bám [`dign.md`](dign.md) cho mọi giao diện — không hard-code màu/spacing
- Phân quyền RLS chặt: HS thấy của mình, PH thấy con mình, GV thấy lớp mình
- Đủ **8 trạng thái UI**: Empty / Loading / Error / Success / Notification / Search / Filter / Bulk Action
- Chịu 10k user: phân trang, đánh index, tránh N+1, không `select *` toàn bảng
- Giao tiếp với PM bằng **tiếng Việt**, đơn giản, không jargon

**KHÔNG được:**
- ❌ Sửa / xoá / ghi đè bất kỳ file nào trong `D:\WEB HỌC TIẾNG ANH` — chỉ COPY
- ❌ Xoá / ghi đè file trong dự án mà chưa hỏi PM
- ❌ Tắt RLS trên bảng ở production
- ❌ Commit file `.env.local` lên git
- ❌ Xây Super Admin
- ❌ Làm đăng ký/đăng nhập giáo viên (để sau)

---

## Agent Tự Động — Tiết Kiệm Quota

Claude PHẢI tự nhận dạng loại task và áp dụng đúng agent pattern bên dưới — PM **không cần gõ slash command**.

| Khi PM nói... | Agent dùng | Làm gì |
|---|---|---|
| "tạo component", "làm card", "làm màn hình", "build UI" | **UI Agent** | Dùng design tokens có sẵn, không search lại. Output: 1 file `.tsx` với 8 trạng thái |
| "tạo bảng", "migration", "query", "thêm cột", "index" | **DB Agent** | Dùng schema có sẵn dưới đây, không đọc lại file docs |
| "bị lỗi", "không hoạt động", "fix", "bug", "TypeError" | **Fix Agent** | Chỉ đọc file lỗi, sửa minimal, không refactor thêm |
| "tạo API", "endpoint", "route", "gọi server" | **API Agent** | Copy pattern chuẩn, không nghĩ lại từ đầu |
| "sắp deploy", "kiểm tra", "review nhanh" | **Check Agent** | Chạy checklist 4 mục, báo ✅/❌ |

### Schema DB nhúng sẵn (đừng search lại mỗi lần)

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

### Design Tokens nhúng sẵn (đừng search lại mỗi lần)

```
Primary: #6b38d4 (tím) | Secondary: #b4136d (hồng)
Font tiêu đề: Plus Jakarta Sans | Font nội dung: Inter
Tailwind: text-primary, bg-primary, text-secondary, bg-secondary
```

### Quy tắc agent

- **Không đọc file nào ngoài file cần thiết** — context đã có ở trên
- **Không search toàn project** nếu đã biết file nằm đâu
- **Output tối giản** — đủ dùng, không giải thích dài
- Sau khi làm xong: tự chạy 5-point self-review, sửa trước khi báo xong

---

## Lệnh thường dùng

```powershell
npm install        # cài lần đầu
npm run dev        # dev server → http://localhost:3000
npm run build      # build production
npm run lint       # kiểm tra lint
```

**Cấu hình Supabase:** xem [`SETUP.md`](SETUP.md). Tạo `.env.local` từ `.env.example`, điền `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

---

## Tài liệu chi tiết

| File | Nội dung |
|---|---|
| [`docs/features.md`](docs/features.md) | Chi tiết tính năng: luyện nghe, bài giảng, giáo viên, phụ huynh, flag engine |
| [`docs/architecture.md`](docs/architecture.md) | Kiến trúc hệ thống, schema database, luồng dữ liệu |
| [`docs/source-data.md`](docs/source-data.md) | Quy tắc dữ liệu gốc `D:\WEB HỌC TIẾNG ANH` |
| [`docs/decisions.md`](docs/decisions.md) | Quyết định đã chốt, backlog, cửa sau demo |
| [`src/CLAUDE.md`](src/CLAUDE.md) | Quy trình code, component patterns, self-review |
| [`supabase/CLAUDE.md`](supabase/CLAUDE.md) | Schema DB, nguyên tắc RLS, migrations |
| [`dign.md`](dign.md) | Design system "Lumina Learning" — nguồn chân lý thiết kế |
