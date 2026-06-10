# Quyết định đã chốt & Backlog — PPS LMS

## ✅ Quyết định đã chốt (2026-06-08)

| # | Quyết định |
|---|---|
| 1 | **Tech stack:** Supabase (Postgres + Auth + Storage + Realtime) |
| 2 | **Màu sắc:** Tím `#6b38d4` + Hồng `#b4136d` theo `dign.md` |
| 3 | **Frontend:** Next.js + Tailwind CSS + TypeScript |
| 4 | **Tên file design:** giữ `dign.md` |
| 5 | **Không có Super Admin** — chỉ 3 vai trò: Student / Teacher / Parent |

---

## 🕒 Việc để sau (theo PM)

| Tính năng | Lý do chưa làm |
|---|---|
| Đăng ký / đăng nhập giáo viên | Vấn đề riêng tư & phân quyền |
| Làm bài tập (trắc nghiệm) | Để placeholder, phát triển sau |
| Bổ sung dữ liệu "học từ kết nối" | PM sẽ cung cấp thêm nội dung + audio |
| Luồng phụ huynh đầy đủ | Liên kết PH ↔ con + màn hình xem điểm danh/nhận xét |
| Giám sát online realtime | Supabase Realtime — chưa implement UI |
| Báo cáo theo giờ | Báo cáo vắng/nghỉ cả lớp online lẫn lớp trường |
| Flag Engine | Cờ cảnh báo tự động từ student_logs |
| Chuyển audio lên Supabase Storage | 76MB đang ở `public/` — cần chuyển trước khi lên Vercel |

---

## ⚠️ Cửa sau xem thử (DEV ONLY)

Cho phép PM test trước khi cấu hình Supabase — **tự tắt khi `NODE_ENV=production`**.

| File | Vai trò |
|---|---|
| `src/lib/demo.ts` | Logic cookie `pps_demo_role` |
| `src/components/DemoEntry.tsx` | UI nút "Xem thử nhanh" trên trang login |
| `src/lib/supabase/auth.ts` | Nhánh demo trong `requireRole()` / `getDemoProfile()` |

**Khi không cần nữa**, xoá: `demo.ts`, `DemoEntry.tsx`, nhánh demo trong `auth.ts`, nút trong `login/page.tsx`.

---

## Ghi chú kỹ thuật

- Schema DB thực tế: `supabase/migrations/0001_init.sql` (migration đầu), `0002_phase3.sql`, `0003_stats.sql`
- Nếu đã chạy migration cũ → cần `ALTER TABLE` thêm cột `teacher_name` (lectures) và `author_name/author_role` (lecture_comments)
- Audio `public/audio/` đã `.gitignore` — khi clone mới cần copy lại từ nguồn gốc
