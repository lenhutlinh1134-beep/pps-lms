# Tính năng chi tiết — PPS LMS

## 2.1 "Học từ kết nối" — Luyện nghe ⭐ (CỐT LÕI) — ✅ Đã làm

Đây là **trái tim của sản phẩm**, ưu tiên số 1.  
Nguồn gốc: tính năng "Listen & Memorize" trong `D:\WEB HỌC TIẾNG ANH\listen.html`.

### Đã hoàn thành

| File | Vai trò |
|---|---|
| `scripts/extract-listening.mjs` | Trích 11 chủ đề / 379 đoạn văn EN+VI → `src/data/listening-topics.json` |
| `scripts/extract-b1words.mjs` | Trích 1075 từ B1 → `src/data/b1-words.json` |
| `src/lib/b1-words.ts` | Helper highlight & chế độ Chép |
| `src/components/listening/ListeningStudio.tsx` | Component chính — giao diện GIỐNG bản gốc `listen.html` |

**Giao diện ListeningStudio gồm:**
- Header + sidebar chủ đề
- Ô chữ lớn highlight từ khi phát
- Thanh điều khiển: play / prev / next / stop
- Lặp A-B, tốc độ 0.6–1.15x, chọn giọng (aria/guy/ryan/sonia)
- Tự chuyển đoạn + danh sách đoạn

**3 chế độ học:**
- 🎧 **Nghe** — nghe + xem text highlight
- ✍️ **Chép** — điền từ B1 / điền tất cả, xem đáp án
- 🗣️ **Nói** — Web Speech API, tô xanh từ đọc đúng

**Trang dùng:**
- `src/app/(dashboard)/student/listening/[id]/page.tsx` — có đăng nhập
- `src/app/demo/[id]/page.tsx` — xem thử không cần login
- `src/app/(dashboard)/student/listening/page.tsx` + `src/app/demo/page.tsx` — danh sách

Ghi `student_logs` mỗi lượt nghe.

### Việc còn lại

- Chạy lại 2 script extract khi PM bổ sung dữ liệu mới
- Chuyển 76MB audio lên **Supabase Storage** trước khi deploy production (không nên ở `public/` khi lên Vercel)
- Cân nhắc tách chế độ "Nói" sang dữ liệu chấm phát âm chuyên biệt hơn

---

## 2.2 Học lý thuyết (Theory) — ✅ Đã làm

Giáo viên đăng bài giảng video (YouTube/mp4) hoặc tài liệu (link PDF/slide) cho từng lớp. Học sinh xem + hỏi đáp Q&A ngay dưới bài.

### Bản 1 — Component chính

| File | Vai trò |
|---|---|
| `src/components/lectures/LectureForm.tsx` | Form đăng: chọn lớp, loại, tiêu đề, link, mô tả |
| `src/components/lectures/LectureView.tsx` | Nhúng YouTube / `<video>` / link file |
| `src/lib/video.ts` | Helper `parseMedia()` |
| `src/components/lectures/LectureComments.tsx` | Q&A: bình luận + 1 cấp trả lời, GV có nhãn riêng |
| `src/components/lectures/LectureGrid.tsx` | Lưới danh sách bài giảng |

**Trang GV:** `src/app/(dashboard)/teacher/lectures/` (list, `new`, `[id]`)  
**Trang HS:** `src/app/(dashboard)/student/lectures/` (list, `[id]`)

**Lưu ý denormalize:** tránh N+1 & vướng RLS — lưu sẵn `lectures.teacher_name` và `lecture_comments.author_name/author_role` trong DB.

### Bản 2 — Nâng cấp đã làm

| Tính năng | File |
|---|---|
| Tải file lên Supabase Storage (video/PDF/ảnh) | `LectureForm.tsx` + `safeName()` |
| Sửa & xoá bài giảng | `src/app/(dashboard)/teacher/lectures/[id]/edit/page.tsx` + `src/components/lectures/LectureActions.tsx` |
| Tìm kiếm / lọc / phân trang | `src/components/lectures/LectureBrowser.tsx` |
| Đánh dấu đã xem + tiến độ | `src/components/lectures/MarkWatched.tsx` + bảng `lecture_views` |

---

## 2.3 Làm bài tập (Exercises) — 🕒 Để sau

Placeholder chỗ trống — chỉ chừa cấu trúc. Chưa phát triển.  
Bảng `assignments` + `submissions` đã có trong schema.

---

## 2.4 Tính năng Giáo viên (Teacher Portal)

### Đã làm

- **Tạo lớp:** `NewClassForm` + RPC `create_class`
- **Quản lý lớp:** `src/app/(dashboard)/teacher/classes/[id]/page.tsx` + `src/components/teacher/ClassManager.tsx` với 3 tab:
  - **Học sinh** — thêm bằng email (RPC `add_student_by_email`), xoá
  - **Điểm danh** — theo ngày, trạng thái: có mặt / muộn / vắng, upsert bảng `attendance`
  - **Nhận xét** — ghi `teacher_notes` cho từng HS (phụ huynh xem được)

### Chưa làm

- Giám sát trực tuyến realtime (Supabase Realtime)
- UI mời đồng giáo viên vào lớp
- Báo cáo theo giờ (vắng/nghỉ cả lớp online lẫn lớp trường)

---

## 2.5 Tính năng Phụ huynh (Parent) — 🕒 Đang làm dần

Theo dõi tiến trình học của con, đọc nhận xét/lưu ý của giáo viên.  
`src/components/parent/LinkChildForm.tsx` — form liên kết PH ↔ con (đã có).  
**Chưa khép vòng:** màn hình xem điểm danh + nhận xét đầy đủ.

---

## 2.6 Đăng ký / Đăng nhập (Auth)

- **Học sinh:** đăng nhập Google hoặc Email. Lần đầu sẽ hiện form chọn trường/lớp + điền thông tin.
- **Giáo viên:** làm sau (vấn đề riêng tư & phân quyền).

---

## 2.7 Cảnh báo thông minh (Flag Engine) — 🕒 Chưa làm

Tự gắn "cờ" cảnh báo dựa trên hành vi học từ `student_logs`:

| Cờ | Điều kiện | Kết quả |
|---|---|---|
| 🔴 Thời lượng không đạt | Học < 30% yêu cầu | Cờ đỏ |
| 🎧 Luyện nghe không đủ | < 3 bài nghe/tuần | Cờ tai nghe |
| 🔴 Không hoạt động | Không đăng nhập > 7 ngày | Cờ đỏ |
| ⚠️ Tiến độ thấp | Điểm TB < 50% | Cờ cảnh báo |
