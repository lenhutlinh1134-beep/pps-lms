# ĐẶC TẢ DỰ ÁN PHẦN MỀM

## PPS Anh Ngữ LMS — Learning Management System

---

| Trường | Nội dung |
|---|---|
| **Tên dự án** | PPS Anh Ngữ LMS |
| **Phiên bản tài liệu** | v1.0 |
| **Ngày tạo** | 2026-06-27 |
| **Cập nhật lần cuối** | 2026-06-27 |
| **Tác giả** | PPS Vietnam — Engineering Team |
| **Trạng thái** | In Development |
| **Môi trường production** | https://pps-lms-app.vercel.app |

---

## Mục Lục

1. [Tổng Quan Dự Án](#1-tổng-quan-dự-án)
2. [Kiến Trúc Hệ Thống](#2-kiến-trúc-hệ-thống)
3. [Yêu Cầu Chức Năng](#3-yêu-cầu-chức-năng)
4. [Yêu Cầu Phi Chức Năng](#4-yêu-cầu-phi-chức-năng)
5. [Thiết Kế Cơ Sở Dữ Liệu](#5-thiết-kế-cơ-sở-dữ-liệu)
6. [Thiết Kế API](#6-thiết-kế-api)
7. [Mô Hình Bảo Mật](#7-mô-hình-bảo-mật)
8. [Môi Trường & Triển Khai](#8-môi-trường--triển-khai)
9. [Lộ Trình Phát Triển](#9-lộ-trình-phát-triển)
10. [Bảng Thuật Ngữ](#10-bảng-thuật-ngữ)

---

## 1. Tổng Quan Dự Án

### 1.1 Mô Tả

PPS Anh Ngữ LMS là nền tảng quản lý học tập trực tuyến (Learning Management System) được xây dựng riêng cho **Trung tâm Anh ngữ PPS Vietnam**. Hệ thống số hóa toàn bộ quy trình dạy và học, kết nối ba bên: giáo viên — học sinh — phụ huynh trong một giao diện thống nhất.

### 1.2 Bối Cảnh Nghiệp Vụ

Trước khi có hệ thống, trung tâm quản lý lớp học bằng bảng tính Excel, liên lạc phụ huynh qua Zalo nhóm, và không có cơ chế theo dõi tiến độ học sinh một cách hệ thống. Dữ liệu bài giảng phân tán trên nhiều kênh (Google Drive, YouTube cá nhân, USB).

**Vấn đề cốt lõi cần giải quyết:**
- Giáo viên mất quá nhiều thời gian vào công việc hành chính (điểm danh thủ công, gửi nhận xét riêng lẻ)
- Phụ huynh không có kênh chính thức để theo dõi tiến độ học của con
- Học sinh thiếu công cụ luyện tập nghe ngoài giờ học
- Không có báo cáo học tập có hệ thống để điều chỉnh giảng dạy

### 1.3 Mục Tiêu Hệ Thống

| Mục tiêu | Đo lường thành công |
|---|---|
| Số hóa điểm danh | Giáo viên điểm danh < 2 phút/buổi |
| Tăng thời gian luyện nghe | HS luyện nghe ≥ 30 phút/ngày ngoài giờ |
| Kết nối phụ huynh | PH tra cứu kết quả con bất kỳ lúc nào |
| Tập trung bài giảng | 100% video bài giảng trên hệ thống |
| Scale | Hỗ trợ 10.000 học sinh không cần nâng cấp hạ tầng |

### 1.4 Phạm Vi (Scope)

**IN SCOPE — Có trong phiên bản này:**
- Đăng nhập / đăng ký (Google OAuth + Email/Password)
- Quản lý lớp học, phân công giáo viên, thêm học sinh
- Module luyện nghe (379 bài, 3 chế độ: Nghe / Chép chính tả / Nói)
- Bài giảng video (YouTube embed + file upload)
- Hỏi đáp dưới bài giảng (comments + replies)
- Giao bài tập và nộp bài
- Điểm danh (có mặt / vắng / trễ)
- Nhận xét giáo viên → phụ huynh xem
- Dashboard phụ huynh (điểm danh, nhận xét, tiến độ)
- Dashboard quản lý trường (thống kê, quản lý giáo viên)

**OUT OF SCOPE — Không trong phiên bản này:**
- Thanh toán học phí online
- Hệ thống live-stream / video call trực tiếp
- App mobile native (iOS/Android) — chỉ web responsive
- Đa ngôn ngữ ngoài Tiếng Việt và Tiếng Anh
- Super Admin quản lý nhiều trung tâm

### 1.5 Định Nghĩa Thuật Ngữ (Glossary)

| Thuật ngữ | Định nghĩa |
|---|---|
| **LMS** | Learning Management System — Hệ thống quản lý học tập |
| **RLS** | Row Level Security — Bảo mật cấp hàng trong PostgreSQL |
| **JWT** | JSON Web Token — Token xác thực người dùng |
| **ERD** | Entity Relationship Diagram — Sơ đồ quan hệ thực thể |
| **SSR** | Server-Side Rendering — Render HTML phía server |
| **RSC** | React Server Components — Component chạy trên server |
| **CDN** | Content Delivery Network — Mạng phân phối nội dung |
| **RPC** | Remote Procedure Call — Gọi hàm từ xa (Supabase stored function) |
| **Student** | Học sinh đã đăng ký tài khoản và vào lớp |
| **Teacher** | Giáo viên được tạo tài khoản bởi quản lý |
| **Parent** | Phụ huynh đã liên kết tài khoản với con |
| **Manager** | Quản lý trung tâm, có quyền xem toàn bộ dữ liệu |
| **Class** | Lớp học có 1 giáo viên chính, nhiều học sinh |
| **Lecture** | Bài giảng video/tài liệu do giáo viên đăng |
| **Submission** | Bài nộp của học sinh cho một bài tập |
| **Flag** | Cảnh báo tự động khi học sinh có dấu hiệu học kém |

---

## 2. Kiến Trúc Hệ Thống

### 2.1 Tổng Quan Kiến Trúc

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENT TIER                          │
│  Browser (Chrome/Safari/Firefox) — Mobile + Desktop      │
│  Next.js App Router (React Server Components)            │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS
┌────────────────────────▼────────────────────────────────┐
│                    SERVER TIER                           │
│  Vercel Edge Network (CDN + Serverless Functions)        │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Next.js 15 App Router                          │   │
│  │  ├─ /app/(auth)/         Login / Register        │   │
│  │  ├─ /app/(dashboard)/    Protected pages         │   │
│  │  │   ├─ /student/        Student portal          │   │
│  │  │   ├─ /teacher/        Teacher portal          │   │
│  │  │   ├─ /parent/         Parent portal           │   │
│  │  │   └─ /manager/        Admin portal            │   │
│  │  └─ /app/api/v1/         REST API endpoints      │   │
│  └─────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────┘
                         │ Supabase SDK / REST / Realtime
┌────────────────────────▼────────────────────────────────┐
│                    DATA TIER (Supabase)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ PostgreSQL   │  │ Supabase     │  │ Supabase     │  │
│  │ + RLS        │  │ Auth (JWT)   │  │ Storage      │  │
│  │ 13 tables    │  │ Google OAuth │  │ (audio/video │  │
│  │ 3 migrations │  │ Email/Pass   │  │  PDF files)  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌──────────────┐                                        │
│  │ Supabase     │                                        │
│  │ Realtime     │  (WebSocket — online monitoring)       │
│  └──────────────┘                                        │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Tech Stack

| Layer | Công nghệ | Phiên bản | Lý Do Chọn |
|---|---|---|---|
| **Framework** | Next.js | 15 (App Router) | SSR/SSG/RSC, Vercel-native, SEO tốt |
| **Language** | TypeScript | 5.x (strict mode) | Type-safe, bắt lỗi compile-time |
| **UI Library** | React | 19 | Server Components, concurrent rendering |
| **Styling** | Tailwind CSS | 3.x | Utility-first, design tokens, responsive |
| **Database** | PostgreSQL | 15 (via Supabase) | ACID, RLS built-in, mature ecosystem |
| **Auth** | Supabase Auth | — | JWT + Google OAuth, tích hợp sẵn với DB |
| **Storage** | Supabase Storage | — | S3-compatible, signed URLs |
| **Realtime** | Supabase Realtime | — | WebSocket, pub/sub cho live monitoring |
| **Deploy** | Vercel | — | Zero-config, auto-deploy từ GitHub, CDN global |
| **Testing** | Playwright | — | E2E tests, cross-browser |

### 2.3 Luồng Dữ Liệu (Data Flow)

```
[Giáo viên tạo bài giảng]
       │
       ▼
LectureForm.tsx ──POST──▶ /api/v1/lectures ──INSERT──▶ lectures table
       │                                                     │
       │                              (RLS: teacher_id = auth.uid())
       │
[Học sinh xem bài giảng]
       │
       ▼
student/lectures/[id] ──SELECT──▶ lectures + lecture_views
       │                 (RLS: student phải có trong class_students)
       │
       ▼
MarkWatched component ──UPSERT──▶ lecture_views (progress %)
       │
       ▼
student_logs ──INSERT──▶ (study_duration, date)
       │
       ▼
[Phụ huynh xem báo cáo]
       │
       ▼
parent/progress ──SELECT──▶ student_logs WHERE student_id IN
                            (SELECT student_id FROM parent_student
                             WHERE parent_id = auth.uid())
```

### 2.4 Component Architecture

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Route group — unauthenticated
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/              # Route group — requires auth
│   │   ├── layout.tsx            # Auth guard + role check
│   │   ├── student/              # Student-only pages
│   │   ├── teacher/              # Teacher-only pages
│   │   ├── parent/               # Parent-only pages
│   │   └── manager/              # Manager-only pages
│   └── api/v1/                   # API Routes (REST)
├── components/
│   ├── ui/                       # Atomic design: Button, Card, Input
│   ├── listening/                # ListeningStudio (core feature)
│   ├── lectures/                 # LectureForm, LectureView, Comments
│   ├── teacher/                  # ClassManager, NewClassForm
│   ├── parent/                   # LinkChildForm, ProgressCard
│   └── dashboard/                # Shared widgets
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser client
│   │   └── server.ts             # Server component client
│   └── auth.ts                   # Auth helpers, role checks
└── data/
    ├── listening-topics.json     # 379 passages (11 topics)
    └── b1-words.json             # 1075 B1 vocabulary
```

---

## 3. Yêu Cầu Chức Năng

### 3.1 Sơ Đồ Use Case

```
                    ┌─────────────────────────────────┐
                    │         PPS LMS System           │
                    │                                   │
  [Student] ───────▶│ UC-S01: Đăng ký / Đăng nhập     │
  [Teacher] ───────▶│ UC-S02: Quản lý profile           │
  [Parent]  ───────▶│                                   │
  [Manager] ───────▶│ UC-L01: Luyện nghe (3 mode)      │◀─── [Student]
                    │ UC-L02: Xem danh sách bài nghe    │◀─── [Student]
                    │                                   │
                    │ UC-V01: Đăng bài giảng           │◀─── [Teacher]
                    │ UC-V02: Xem bài giảng + Q&A      │◀─── [Student][Teacher]
                    │ UC-V03: Sửa/xoá bài giảng        │◀─── [Teacher]
                    │                                   │
                    │ UC-C01: Tạo lớp học              │◀─── [Teacher]
                    │ UC-C02: Thêm học sinh vào lớp    │◀─── [Teacher]
                    │ UC-C03: Điểm danh                │◀─── [Teacher]
                    │ UC-C04: Ghi nhận xét học sinh    │◀─── [Teacher]
                    │                                   │
                    │ UC-A01: Tạo bài tập              │◀─── [Teacher]
                    │ UC-A02: Nộp bài tập              │◀─── [Student]
                    │ UC-A03: Chấm bài / phản hồi      │◀─── [Teacher]
                    │                                   │
                    │ UC-P01: Liên kết tài khoản con   │◀─── [Parent]
                    │ UC-P02: Xem điểm danh con        │◀─── [Parent]
                    │ UC-P03: Xem nhận xét của GV      │◀─── [Parent]
                    │ UC-P04: Xem tiến độ học con      │◀─── [Parent]
                    │                                   │
                    │ UC-M01: Xem thống kê trường      │◀─── [Manager]
                    │ UC-M02: Quản lý giáo viên        │◀─── [Manager]
                    │ UC-M03: Quản lý lớp học          │◀─── [Manager]
                    └─────────────────────────────────┘
```

### 3.2 Yêu Cầu Chức Năng — Học Sinh (Student)

#### FR-STU-01: Đăng Ký Tài Khoản
- **Mô tả:** Học sinh có thể tạo tài khoản bằng Google OAuth hoặc Email + Password
- **Luồng chính:**
  1. Học sinh truy cập `/register`
  2. Chọn phương thức đăng ký (Google / Email)
  3. Điền thông tin: họ tên, chọn trường, chọn lớp (nếu có)
  4. Hệ thống tạo record trong `auth.users` và `profiles` (role = student)
  5. Redirect về student dashboard
- **Validation:**
  - Họ tên: required, 2–100 ký tự
  - Email: format hợp lệ, unique trong hệ thống
  - Password: tối thiểu 8 ký tự
- **Exception flows:**
  - Email đã tồn tại → hiển thị lỗi "Email đã được đăng ký"
  - Google account chưa có profile → tự động tạo profile với role = student

#### FR-STU-02: Luyện Nghe (Core Feature)
- **Mô tả:** Học sinh luyện nghe với 379 bài, 11 chủ đề, 4 giọng đọc
- **3 chế độ học:**
  - **Listening Mode:** Phát audio + highlight text theo từng từ
  - **Dictation Mode:** Ẩn từ B1, học sinh điền vào ô trống, hệ thống chấm điểm
  - **Speaking Mode:** Học sinh đọc → Web Speech API nhận diện → highlight từ đúng
- **Tính năng phụ:**
  - Loop A-B (lặp đoạn)
  - Tốc độ phát: 0.6x / 0.75x / 1.0x / 1.15x
  - Chọn giọng: aria / guy / ryan / sonia
  - Auto-advance sang bài tiếp theo
  - Ghi log vào `student_logs` sau mỗi phiên
- **Data:** `src/data/listening-topics.json` (379 passages) + `src/data/b1-words.json` (1075 từ)

#### FR-STU-03: Xem Bài Giảng
- **Mô tả:** Học sinh xem danh sách bài giảng của lớp mình, xem chi tiết với video embed
- **Điều kiện:** Học sinh phải trong `class_students` của lớp đó (RLS kiểm tra)
- **Tính năng:**
  - Tìm kiếm bài giảng theo tên
  - Filter theo loại (video / tài liệu)
  - Đánh dấu đã xem (ghi vào `lecture_views`)
  - Thanh tiến độ xem

#### FR-STU-04: Hỏi Đáp Dưới Bài Giảng
- **Mô tả:** Học sinh đặt câu hỏi, giáo viên và học sinh khác trả lời
- **Tính năng:**
  - Comment 1 cấp + 1 cấp reply
  - Hiển thị badge role (GV / HS)
  - Soft delete (không xoá cứng)

#### FR-STU-05: Nộp Bài Tập
- **Mô tả:** Học sinh xem bài tập, nộp câu trả lời hoặc file
- **Trạng thái bài tập:** Chưa nộp / Đã nộp / Đã chấm
- **Deadline:** Hiển thị đếm ngược nếu còn < 24 giờ

#### FR-STU-06: Xem Điểm Danh
- **Mô tả:** Học sinh xem lịch sử điểm danh theo tháng
- **Hiển thị:** Calendar view + tỉ lệ % đi học

#### FR-STU-07: Xem Thời Khóa Biểu
- **Mô tả:** Học sinh xem lịch học theo tuần

---

### 3.3 Yêu Cầu Chức Năng — Giáo Viên (Teacher)

#### FR-TCH-01: Tạo Lớp Học
- **Mô tả:** Giáo viên tạo lớp mới với tên, trình độ, năm học
- **RPC:** `create_class(name, level, school_id, year)` → tự động thêm giáo viên vào `class_teachers`
- **Sinh mã tham gia:** Tạo `join_code` ngẫu nhiên 6 ký tự

#### FR-TCH-02: Thêm Học Sinh
- **Mô tả:** Giáo viên nhập email học sinh để thêm vào lớp
- **RPC:** `add_student_by_email(email, class_id)` → tìm profile → thêm vào `class_students`
- **Exception:** Email không tồn tại trong hệ thống → báo lỗi, không tự tạo account

#### FR-TCH-03: Đăng Bài Giảng
- **Mô tả:** Giáo viên tạo bài giảng bằng YouTube link hoặc upload file
- **Loại bài giảng:** `video` (YouTube embed / mp4) | `theory` (PDF link / Google Docs)
- **Upload:** File được lưu vào Supabase Storage bucket `media`, đường dẫn trả về gán vào `media_url`
- **Denormalization:** Ghi `teacher_name` trực tiếp vào bảng `lectures` để tránh N+1

#### FR-TCH-04: Tạo Bài Tập
- **Mô tả:** Giáo viên tạo bài tập có deadline, giao cho lớp
- **Question Bank:** Giáo viên có thể lưu câu hỏi vào ngân hàng để tái sử dụng

#### FR-TCH-05: Điểm Danh
- **Mô tả:** Giáo viên điểm danh từng buổi học, 3 trạng thái: present / absent / late
- **Storage:** UPSERT vào `attendance(class_id, student_id, date, status)`
- **Mặc định:** Tất cả học sinh = absent, giáo viên chỉ cần đổi những người có mặt

#### FR-TCH-06: Ghi Nhận Xét
- **Mô tả:** Giáo viên ghi nhận xét cho từng học sinh, có thể đánh dấu "hiển thị cho phụ huynh"
- **Storage:** `teacher_notes(class_id, student_id, teacher_id, note_text, visible_to_parents)`

#### FR-TCH-07: Xem Báo Cáo Lớp
- **Mô tả:** Dashboard tổng hợp: tỉ lệ đi học, điểm trung bình, thời gian luyện nghe trung bình

---

### 3.4 Yêu Cầu Chức Năng — Phụ Huynh (Parent)

#### FR-PAR-01: Liên Kết Tài Khoản Con
- **Mô tả:** Phụ huynh nhập email của con để liên kết
- **Flow:** `LinkChildForm` → tìm profile có role=student → thêm vào `parent_student`
- **Validation:** Một phụ huynh có thể liên kết nhiều con

#### FR-PAR-02: Xem Điểm Danh Con
- **Mô tả:** Xem lịch điểm danh của con theo tháng, tỉ lệ đi học
- **RLS:** Chỉ đọc được data của con mình (via `parent_student`)

#### FR-PAR-03: Đọc Nhận Xét Giáo Viên
- **Mô tả:** Xem nhận xét mà giáo viên đã đánh dấu `visible_to_parents = true`

#### FR-PAR-04: Xem Tiến Độ Học Tập
- **Mô tả:** Biểu đồ thời gian học, số bài đã làm, điểm trung bình theo tuần/tháng

---

### 3.5 Yêu Cầu Chức Năng — Quản Lý (Manager)

#### FR-MGR-01: Dashboard Thống Kê
- Tổng số lớp, giáo viên, học sinh đang hoạt động
- Biểu đồ điểm danh toàn trường theo tuần
- Top lớp có tỉ lệ đi học cao nhất / thấp nhất

#### FR-MGR-02: Quản Lý Giáo Viên
- Danh sách giáo viên, xem chi tiết từng người
- Xem lớp mà giáo viên đang phụ trách

#### FR-MGR-03: Quản Lý Lớp Học
- Drill-down vào từng lớp: xem học sinh, xem điểm danh, xem bài giảng

#### FR-MGR-04: Quản Lý Nghỉ Phép
- Giáo viên gửi đơn nghỉ phép → manager phê duyệt/từ chối

#### FR-MGR-05: Đăng Thông Báo
- Tạo thông báo hiển thị cho toàn trường hoặc lớp cụ thể

---

## 4. Yêu Cầu Phi Chức Năng

### 4.1 Hiệu Năng (Performance)

| Chỉ số | Mục tiêu | Cách đo |
|---|---|---|
| API response time (P50) | < 200ms | Vercel Analytics |
| API response time (P95) | < 500ms | Vercel Analytics |
| Page load (LCP) | < 2.5s | Core Web Vitals |
| Time to Interactive | < 3.5s | Lighthouse |
| DB query time | < 100ms | Supabase Dashboard |

**Chiến lược đạt được:**
- Phân trang tất cả danh sách (page size = 20)
- Index trên `class_id`, `student_id`, `created_at`, `date` ở mọi bảng cần
- Sử dụng React Server Components — không gửi JS thừa về client
- Tránh N+1: dùng Supabase nested select thay vì loop query
- Denormalize `teacher_name`, `author_name` để tránh JOIN qua RLS

### 4.2 Khả Năng Mở Rộng (Scalability)

- **Target:** 10.000 học sinh, 500 giáo viên, 1.000 lớp học
- **Database:** PostgreSQL với connection pooling (Supabase sẵn có)
- **File Storage:** Supabase Storage — không giới hạn file số lượng, tính theo dung lượng
- **CDN:** Vercel Edge Network — static assets gần người dùng nhất
- **Audio files:** 76MB audio hiện tại → migrate sang Supabase Storage trước production

### 4.3 Bảo Mật (Security)

- **Authentication:** Supabase Auth JWT (expire 1 giờ, refresh token 7 ngày)
- **Authorization:** Row Level Security (RLS) trên TẤT CẢ bảng — không có exception
- **Data isolation:** Học sinh A KHÔNG THỂ đọc data của học sinh B dù biết ID
- **Input validation:** Zod schema trên mọi API endpoint
- **File upload:** Kiểm tra MIME type, giới hạn 100MB/file
- **Secrets:** `.env.local` không commit git, secrets chỉ qua Vercel env vars

### 4.4 Khả Năng Sử Dụng (Usability)

- **Mobile-first:** 70% học sinh dùng điện thoại → thiết kế mobile trước
- **Responsive breakpoints:** 320px (mobile) → 768px (tablet) → 1280px (desktop)
- **8 trạng thái UI bắt buộc** cho mọi tính năng:
  - Empty State, Loading, Error, Success, Notification, Search, Filter, Bulk Action
- **Font:** Plus Jakarta Sans (tiêu đề) + Inter (nội dung) — tải qua Google Fonts
- **Màu sắc:** Tím `#6b38d4` (primary) + Hồng `#b4136d` (secondary)

### 4.5 Khả Năng Sẵn Sàng (Availability)

- **SLA mục tiêu:** 99.9% uptime
- **Vercel:** Auto-scaling, không cần quản lý server
- **Supabase:** 99.9% SLA (Pro plan), daily backup

### 4.6 Tương Thích (Compatibility)

| Nền tảng | Phiên bản hỗ trợ |
|---|---|
| Chrome | 100+ |
| Safari | 15+ |
| Firefox | 100+ |
| Edge | 100+ |
| iOS Safari | 15+ |
| Android Chrome | 100+ |

---

## 5. Thiết Kế Cơ Sở Dữ Liệu

### 5.1 Sơ Đồ Quan Hệ (ERD)

```
auth.users (Supabase managed)
    │ 1
    │
    ▼ 1
profiles ─────────────────────────────────────────────────────┐
    │ (id, role, full_name, email, avatar_url, school_id)      │
    │                                                           │
    │ 1..* (teacher)          1..* (parent)      1..* (student)│
    ▼                         ▼                   ▼            │
class_teachers          parent_student       class_students    │
    │ (class_id,              │ (parent_id,       │ (class_id, │
    │  teacher_id, role)      │  student_id)      │  student_id│
    │                         │                   │  joined_at)│
    │ *..*                    │                   │            │
    ▼                         │                   │            │
classes ◀────────────────────────────────────────┘            │
    │ (id, school_id,                                          │
    │  name, level, year,                                      │
    │  join_code, is_active)                                   │
    │                                                          │
    ├──────────────────────────────────────────────────────────┤
    │ 1..*                                                     │
    ▼                                                          │
lectures                                                       │
    │ (id, class_id, teacher_id, teacher_name,                 │
    │  type, title, description,                               │
    │  media_url, order_index, created_at)                     │
    │                                                          │
    ├─────────────┬────────────────────                        │
    │             │                                            │
    ▼ 1..*        ▼ 1..*                                       │
lecture_      lecture_views                                    │
comments      (lecture_id, student_id,                         │
(id,           watched_at, progress_pct)                       │
 lecture_id,                                                   │
 author_id,                                                    │
 author_name,                                                  │
 author_role,                                                  │
 content,                                                      │
 parent_comment_id)                                            │
    │                                                          │
    │ 1..*                                                     │
    ▼                                                          │
classes (continued)                                            │
    │                                                          │
    ├──────────────┬──────────────┬──────────────────────      │
    │              │              │                            │
    ▼ 1..*         ▼ 1..*         ▼ 1..*                      │
attendance    teacher_notes  assignments                        │
(class_id,    (class_id,     (id, class_id,                    │
 student_id,   student_id,    title,                           │
 date,         teacher_id,    description,                     │
 status)       note_text,     due_date)                        │
               visible_to_     │                               │
               parents)        │ 1..*                          │
                               ▼                               │
                           submissions                         │
                           (assignment_id,                     │
                            student_id,                        │
                            content, file_url,                 │
                            score, feedback,                   │
                            submitted_at)                      │
                                                               │
student_logs ◀─────────────────────────────────────────────── ┘
(student_id, class_id, date,
 study_duration, login_count,
 listening_count, score)
```

### 5.2 Mô Tả Chi Tiết Từng Bảng

#### Bảng `profiles`
| Cột | Kiểu | Nullable | Mô tả |
|---|---|---|---|
| `id` | UUID | NOT NULL | PK, FK → auth.users.id |
| `role` | ENUM | NOT NULL | student \| teacher \| parent \| manager |
| `full_name` | TEXT | NOT NULL | Họ và tên đầy đủ |
| `email` | TEXT | NOT NULL | Email đăng nhập, unique |
| `avatar_url` | TEXT | NULL | URL ảnh đại diện |
| `school_id` | UUID | NULL | FK → schools.id |
| `created_at` | TIMESTAMPTZ | NOT NULL | Thời điểm tạo |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Thời điểm cập nhật |

**Indexes:** `email` (UNIQUE), `school_id`, `role`

---

#### Bảng `schools`
| Cột | Kiểu | Nullable | Mô tả |
|---|---|---|---|
| `id` | UUID | NOT NULL | PK |
| `name` | TEXT | NOT NULL | Tên trường/trung tâm |
| `code` | TEXT | NOT NULL | Mã ngắn (VD: "PPS-HCM") |
| `address` | TEXT | NULL | Địa chỉ |
| `is_active` | BOOLEAN | NOT NULL | Trường đang hoạt động |

---

#### Bảng `classes`
| Cột | Kiểu | Nullable | Mô tả |
|---|---|---|---|
| `id` | UUID | NOT NULL | PK |
| `school_id` | UUID | NOT NULL | FK → schools.id |
| `name` | TEXT | NOT NULL | Tên lớp (VD: "Pre-IELTS A") |
| `level` | TEXT | NULL | Trình độ (A1/A2/B1/B2/C1) |
| `year` | INTEGER | NULL | Năm học |
| `join_code` | TEXT | NULL | Mã 6 ký tự để học sinh tham gia |
| `is_active` | BOOLEAN | NOT NULL | Lớp đang hoạt động |
| `created_by` | UUID | NOT NULL | FK → profiles.id (giáo viên tạo) |
| `created_at` | TIMESTAMPTZ | NOT NULL | — |

**Indexes:** `school_id`, `created_by`, `is_active`

---

#### Bảng `class_teachers`
| Cột | Kiểu | Nullable | Mô tả |
|---|---|---|---|
| `id` | UUID | NOT NULL | PK |
| `class_id` | UUID | NOT NULL | FK → classes.id |
| `teacher_id` | UUID | NOT NULL | FK → profiles.id |
| `role` | TEXT | NOT NULL | "main" \| "assistant" |

**Constraint:** UNIQUE(class_id, teacher_id)

---

#### Bảng `class_students`
| Cột | Kiểu | Nullable | Mô tả |
|---|---|---|---|
| `id` | UUID | NOT NULL | PK |
| `class_id` | UUID | NOT NULL | FK → classes.id |
| `student_id` | UUID | NOT NULL | FK → profiles.id |
| `joined_at` | TIMESTAMPTZ | NOT NULL | Thời điểm vào lớp |

**Constraint:** UNIQUE(class_id, student_id)

---

#### Bảng `parent_student`
| Cột | Kiểu | Nullable | Mô tả |
|---|---|---|---|
| `id` | UUID | NOT NULL | PK |
| `parent_id` | UUID | NOT NULL | FK → profiles.id (role=parent) |
| `student_id` | UUID | NOT NULL | FK → profiles.id (role=student) |

**Constraint:** UNIQUE(parent_id, student_id)

---

#### Bảng `lectures`
| Cột | Kiểu | Nullable | Mô tả |
|---|---|---|---|
| `id` | UUID | NOT NULL | PK |
| `class_id` | UUID | NOT NULL | FK → classes.id |
| `teacher_id` | UUID | NOT NULL | FK → profiles.id |
| `teacher_name` | TEXT | NOT NULL | Denormalized — tránh JOIN qua RLS |
| `type` | ENUM | NOT NULL | "video" \| "theory" |
| `title` | TEXT | NOT NULL | Tiêu đề bài giảng |
| `description` | TEXT | NULL | Mô tả |
| `media_url` | TEXT | NULL | YouTube URL, mp4 URL, hoặc PDF URL |
| `order_index` | INTEGER | NOT NULL DEFAULT 0 | Thứ tự trong danh sách |
| `created_at` | TIMESTAMPTZ | NOT NULL | — |
| `updated_at` | TIMESTAMPTZ | NOT NULL | — |

**Indexes:** `class_id`, `teacher_id`, `created_at DESC`

---

#### Bảng `lecture_comments`
| Cột | Kiểu | Nullable | Mô tả |
|---|---|---|---|
| `id` | UUID | NOT NULL | PK |
| `lecture_id` | UUID | NOT NULL | FK → lectures.id |
| `author_id` | UUID | NOT NULL | FK → profiles.id |
| `author_name` | TEXT | NOT NULL | Denormalized |
| `author_role` | ENUM | NOT NULL | "student" \| "teacher" — Denormalized |
| `content` | TEXT | NOT NULL | Nội dung comment |
| `parent_comment_id` | UUID | NULL | FK → lecture_comments.id (null = top-level) |
| `is_deleted` | BOOLEAN | NOT NULL DEFAULT false | Soft delete |
| `created_at` | TIMESTAMPTZ | NOT NULL | — |

**Indexes:** `lecture_id`, `parent_comment_id`

---

#### Bảng `lecture_views`
| Cột | Kiểu | Nullable | Mô tả |
|---|---|---|---|
| `id` | UUID | NOT NULL | PK |
| `lecture_id` | UUID | NOT NULL | FK → lectures.id |
| `student_id` | UUID | NOT NULL | FK → profiles.id |
| `watched_at` | TIMESTAMPTZ | NOT NULL | Lần xem gần nhất |
| `progress_pct` | INTEGER | NOT NULL DEFAULT 0 | % đã xem (0–100) |

**Constraint:** UNIQUE(lecture_id, student_id)

---

#### Bảng `attendance`
| Cột | Kiểu | Nullable | Mô tả |
|---|---|---|---|
| `id` | UUID | NOT NULL | PK |
| `class_id` | UUID | NOT NULL | FK → classes.id |
| `student_id` | UUID | NOT NULL | FK → profiles.id |
| `date` | DATE | NOT NULL | Ngày điểm danh (YYYY-MM-DD) |
| `status` | ENUM | NOT NULL | "present" \| "absent" \| "late" |
| `recorded_by` | UUID | NOT NULL | FK → profiles.id (giáo viên) |
| `created_at` | TIMESTAMPTZ | NOT NULL | — |

**Constraint:** UNIQUE(class_id, student_id, date)
**Indexes:** `class_id, date`, `student_id, date`

---

#### Bảng `teacher_notes`
| Cột | Kiểu | Nullable | Mô tả |
|---|---|---|---|
| `id` | UUID | NOT NULL | PK |
| `class_id` | UUID | NOT NULL | FK → classes.id |
| `student_id` | UUID | NOT NULL | FK → profiles.id |
| `teacher_id` | UUID | NOT NULL | FK → profiles.id |
| `note_text` | TEXT | NOT NULL | Nội dung nhận xét |
| `visible_to_parents` | BOOLEAN | NOT NULL DEFAULT false | Phụ huynh có thấy không |
| `created_at` | TIMESTAMPTZ | NOT NULL | — |

**Indexes:** `student_id`, `class_id`

---

#### Bảng `assignments`
| Cột | Kiểu | Nullable | Mô tả |
|---|---|---|---|
| `id` | UUID | NOT NULL | PK |
| `class_id` | UUID | NOT NULL | FK → classes.id |
| `teacher_id` | UUID | NOT NULL | FK → profiles.id |
| `title` | TEXT | NOT NULL | Tên bài tập |
| `description` | TEXT | NULL | Hướng dẫn |
| `due_date` | TIMESTAMPTZ | NULL | Hạn nộp |
| `created_at` | TIMESTAMPTZ | NOT NULL | — |

**Indexes:** `class_id`, `due_date`

---

#### Bảng `submissions`
| Cột | Kiểu | Nullable | Mô tả |
|---|---|---|---|
| `id` | UUID | NOT NULL | PK |
| `assignment_id` | UUID | NOT NULL | FK → assignments.id |
| `student_id` | UUID | NOT NULL | FK → profiles.id |
| `content` | TEXT | NULL | Câu trả lời dạng text |
| `file_url` | TEXT | NULL | URL file đính kèm |
| `score` | NUMERIC(5,2) | NULL | Điểm (0.00 – 100.00) |
| `feedback` | TEXT | NULL | Nhận xét giáo viên |
| `submitted_at` | TIMESTAMPTZ | NOT NULL | — |
| `graded_at` | TIMESTAMPTZ | NULL | Thời điểm giáo viên chấm |

**Constraint:** UNIQUE(assignment_id, student_id)

---

#### Bảng `student_logs`
| Cột | Kiểu | Nullable | Mô tả |
|---|---|---|---|
| `id` | UUID | NOT NULL | PK |
| `student_id` | UUID | NOT NULL | FK → profiles.id |
| `class_id` | UUID | NULL | FK → classes.id |
| `date` | DATE | NOT NULL | Ngày ghi log |
| `study_duration` | INTEGER | NOT NULL DEFAULT 0 | Thời gian học (giây) |
| `login_count` | INTEGER | NOT NULL DEFAULT 0 | Số lần đăng nhập |
| `listening_count` | INTEGER | NOT NULL DEFAULT 0 | Số bài nghe đã làm |
| `score` | NUMERIC(5,2) | NULL | Điểm trung bình ngày |

**Constraint:** UNIQUE(student_id, date)
**Indexes:** `student_id, date DESC`

### 5.3 Stored Functions (RPC)

```sql
-- Tạo lớp học (transaction: tạo class + thêm giáo viên vào class_teachers)
CREATE FUNCTION create_class(
  p_name TEXT,
  p_level TEXT,
  p_school_id UUID,
  p_year INTEGER
) RETURNS classes AS $$
  -- INSERT INTO classes
  -- INSERT INTO class_teachers (class_id, teacher_id=auth.uid(), role='main')
$$;

-- Thêm học sinh bằng email
CREATE FUNCTION add_student_by_email(
  p_email TEXT,
  p_class_id UUID
) RETURNS class_students AS $$
  -- SELECT id FROM profiles WHERE email = p_email AND role = 'student'
  -- INSERT INTO class_students
$$;

-- Auto-create profile khi user mới đăng ký (trigger)
CREATE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
  -- INSERT INTO profiles (id, email, role='student')
$$;
```

### 5.4 RLS Policy Framework

```sql
-- Ví dụ: Student chỉ đọc lecture của lớp mình
CREATE POLICY "student_read_own_class_lectures"
ON lectures FOR SELECT
TO authenticated
USING (
  class_id IN (
    SELECT class_id FROM class_students
    WHERE student_id = auth.uid()
  )
);

-- Giáo viên chỉ ghi/sửa lecture của mình
CREATE POLICY "teacher_manage_own_lectures"
ON lectures FOR ALL
TO authenticated
USING (teacher_id = auth.uid())
WITH CHECK (teacher_id = auth.uid());

-- Parent chỉ đọc data của con
CREATE POLICY "parent_read_child_attendance"
ON attendance FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT student_id FROM parent_student
    WHERE parent_id = auth.uid()
  )
);
```

---

## 6. Thiết Kế API

### 6.1 API Convention

```
Base URL:    /api/v1/
Auth:        Authorization: Bearer <supabase_jwt>
Content-Type: application/json
Response:    { data: T | null, error: string | null, meta?: { total, page, pageSize } }
```

### 6.2 Authentication Endpoints

| Method | Endpoint | Mô tả | Role |
|---|---|---|---|
| POST | `/api/v1/auth/register` | Đăng ký học sinh | Public |
| POST | `/api/v1/auth/login` | Đăng nhập | Public |
| GET | `/auth/callback` | OAuth callback (Supabase) | Public |
| POST | `/api/v1/auth/logout` | Đăng xuất | Auth |

### 6.3 Classes Endpoints

| Method | Endpoint | Mô tả | Role |
|---|---|---|---|
| GET | `/api/v1/classes` | Danh sách lớp | Teacher, Manager |
| POST | `/api/v1/classes` | Tạo lớp mới | Teacher |
| GET | `/api/v1/classes/:id` | Chi tiết lớp | Teacher, Student, Manager |
| PUT | `/api/v1/classes/:id` | Cập nhật lớp | Teacher (owner) |
| GET | `/api/v1/classes/:id/students` | DS học sinh trong lớp | Teacher, Manager |
| POST | `/api/v1/classes/:id/students` | Thêm học sinh | Teacher |
| DELETE | `/api/v1/classes/:id/students/:sid` | Xoá học sinh | Teacher |

### 6.4 Lectures Endpoints

| Method | Endpoint | Mô tả | Role |
|---|---|---|---|
| GET | `/api/v1/lectures?class_id=&page=` | Danh sách bài giảng | Teacher, Student |
| POST | `/api/v1/lectures` | Tạo bài giảng | Teacher |
| GET | `/api/v1/lectures/:id` | Chi tiết bài giảng | Teacher, Student |
| PUT | `/api/v1/lectures/:id` | Cập nhật | Teacher (owner) |
| DELETE | `/api/v1/lectures/:id` | Xoá | Teacher (owner) |
| GET | `/api/v1/lectures/:id/comments` | Danh sách comments | Teacher, Student |
| POST | `/api/v1/lectures/:id/comments` | Đăng comment | Teacher, Student |
| POST | `/api/v1/lectures/:id/views` | Cập nhật progress | Student |

### 6.5 Attendance Endpoints

| Method | Endpoint | Mô tả | Role |
|---|---|---|---|
| GET | `/api/v1/attendance?class_id=&date=` | Điểm danh theo ngày | Teacher |
| POST | `/api/v1/attendance/bulk` | Điểm danh hàng loạt | Teacher |
| GET | `/api/v1/attendance/student/:id` | Lịch sử điểm danh 1 HS | Student, Parent, Teacher |

### 6.6 Response Format

```json
// Success
{
  "data": { "id": "...", "name": "Pre-IELTS A" },
  "error": null,
  "meta": { "total": 120, "page": 1, "pageSize": 20 }
}

// Error
{
  "data": null,
  "error": "Unauthorized: Student not in this class"
}
```

---

## 7. Mô Hình Bảo Mật

### 7.1 Authentication Flow

```
User nhập email/password (hoặc click Google)
         │
         ▼
Supabase Auth xác thực
         │
         ▼
Trả về: access_token (JWT, expire 1h) + refresh_token (7 ngày)
         │
         ▼
Next.js middleware đọc token từ cookie (httpOnly)
         │
         ▼
Mỗi request: JWT được gửi tự động đến Supabase
         │
         ▼
PostgreSQL RLS policies đọc auth.uid() từ JWT
         │
         ▼
Chỉ trả về rows mà RLS policy cho phép
```

### 7.2 Ma Trận Phân Quyền

| Action | Student | Teacher | Parent | Manager |
|---|---|---|---|---|
| Đọc profile của mình | ✅ | ✅ | ✅ | ✅ |
| Đọc profile người khác | ❌ | ✅ (trong lớp mình) | ❌ | ✅ |
| Tạo lớp học | ❌ | ✅ | ❌ | ✅ |
| Xem bài giảng | ✅ (lớp mình) | ✅ (lớp mình) | ❌ | ✅ |
| Tạo bài giảng | ❌ | ✅ (lớp mình) | ❌ | ❌ |
| Điểm danh | ❌ | ✅ (lớp mình) | ❌ | ❌ |
| Xem điểm danh | ✅ (mình) | ✅ (lớp mình) | ✅ (con mình) | ✅ |
| Nhận xét HS | ❌ | ✅ (lớp mình) | ❌ | ❌ |
| Xem nhận xét | ❌ | ✅ (của mình) | ✅ (visible=true) | ✅ |
| Xem thống kê trường | ❌ | ❌ | ❌ | ✅ |

### 7.3 File Storage Security

```
Bucket: media (public)
  ├── lectures/{class_id}/{lecture_id}/     ← Video/PDF bài giảng
  ├── submissions/{assignment_id}/{user_id}/ ← File nộp bài
  └── avatars/{user_id}/                    ← Ảnh đại diện

Policy: Chỉ authenticated users trong lớp liên quan mới đọc được
        Teacher chỉ ghi vào thư mục lớp mình phụ trách
```

---

## 8. Môi Trường & Triển Khai

### 8.1 Environment Variables

| Biến | Môi trường | Mô tả |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | All | URL Supabase project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Admin key (KHÔNG public) |

### 8.2 CI/CD Pipeline

```
Developer push code
       │
       ▼
GitHub (main branch)
       │
       ▼ Webhook
Vercel build triggered
       │
       ├── npm run lint      ← Fail nếu có lỗi ESLint
       ├── npm run build     ← Fail nếu TypeScript lỗi
       │
       ▼ (nếu pass)
Preview deployment → URL unique để test
       │
       ▼ (merge to main)
Production deployment → https://pps-lms-app.vercel.app
```

### 8.3 Database Migration

```
Thứ tự chạy migrations:
1. supabase/migrations/0001_init.sql      ← Schema cơ bản + RLS
2. supabase/migrations/0002_phase3.sql    ← lecture_views, attendance, teacher_notes
3. supabase/migrations/0003_stats.sql     ← Analytics views

Cách chạy:
  Supabase Dashboard → SQL Editor → Paste file → Run
  (Hoặc: supabase db push nếu dùng Supabase CLI)
```

### 8.4 Checklist Trước Production

- [ ] Chạy hết 3 migration files trên Supabase production
- [ ] Tạo Storage bucket `media` (public)
- [ ] Move audio files từ `public/audio/` → Supabase Storage
- [ ] Enable Google Auth trong Supabase Dashboard
- [ ] Set environment variables trong Vercel
- [ ] Disable "Email confirmation" chỉ trong dev, bật lại cho prod
- [ ] Xoá code demo (`src/lib/demo.ts`, `DemoEntry.tsx`) trước production
- [ ] Verify RLS đang ON cho tất cả bảng

---

## 9. Lộ Trình Phát Triển

### Phase 1 — Foundation (✅ Hoàn thành)
| Tính năng | Trạng thái |
|---|---|
| Setup Next.js + Supabase + Tailwind | ✅ |
| Database schema (3 migrations) | ✅ |
| Authentication (Google + Email) | ✅ |
| Module luyện nghe (379 bài, 3 mode) | ✅ |
| Bài giảng video (tạo / xem / edit / xoá) | ✅ |
| Q&A dưới bài giảng | ✅ |
| Tạo lớp học + thêm học sinh | ✅ |
| Điểm danh | ✅ |
| Nhận xét học sinh | ✅ |
| Manager drill-down (staff → teacher → class) | ✅ |

### Phase 2 — Learning & Tracking (🔄 Đang thực hiện)
| Tính năng | Ưu tiên |
|---|---|
| Bài tập full implementation | High |
| Parent portal (điểm danh, nhận xét) | High |
| Student progress tracking | Medium |
| Báo cáo lớp cho giáo viên | Medium |
| Real-time online monitoring | Low |

### Phase 3 — Intelligence (📅 Kế hoạch)
| Tính năng | Ưu tiên |
|---|---|
| Flag engine (cảnh báo tự động) | High |
| Push notifications (nhắc học) | Medium |
| Export báo cáo (PDF/Excel) | Medium |
| Advanced analytics | Low |

### Phase 4 — AI Features (📅 Tương lai)
| Tính năng | Mô tả |
|---|---|
| AI Pronunciation Checker | Học sinh đọc → AI chấm phát âm |
| Auto-Generate Quiz | AI tạo câu hỏi từ bài học |
| Smart Study Planner | AI gợi ý lịch học |
| Spaced Repetition | Bài sai tự động xuất hiện lại |

---

## 10. Bảng Thuật Ngữ

| Thuật ngữ | Giải thích |
|---|---|
| `auth.uid()` | Hàm Supabase trả về ID người dùng từ JWT token |
| `UPSERT` | INSERT + UPDATE kết hợp: nếu có thì UPDATE, chưa có thì INSERT |
| Denormalize | Lưu dữ liệu thừa (VD: teacher_name) để tránh JOIN chậm |
| N+1 Query | Anti-pattern: query 1 lần để lấy list, rồi N lần nữa cho từng item |
| Row Level Security | PostgreSQL tự lọc dữ liệu theo policy, không cần filter trong code |
| Server Component | React component chạy trên server, không ship JS về browser |
| JWT | Token chứa thông tin user + chữ ký, dùng để xác thực mỗi request |
| Edge Function | Serverless function chạy tại CDN edge node gần user nhất |
| `join_code` | Mã 6 ký tự cho học sinh tự tham gia lớp mà không cần email |

---

*Tài liệu này được duy trì bởi Engineering Team. Mọi thay đổi kiến trúc phải cập nhật vào file này.*

*Xem thêm: [architecture.md](architecture.md) | [features.md](features.md) | [decisions.md](decisions.md)*
