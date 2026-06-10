# PPS LMS — Hệ thống học tiếng Anh online

Web LMS cho **Trung tâm Anh ngữ PPS Vietnam**, kết nối 3 vai trò: **học sinh**, **giáo viên**, **phụ huynh**.

## Tính năng chính
- 🎧 **Học từ kết nối** — luyện nghe & ghi nhớ từ vựng (tính năng cốt lõi).
- 📖 **Học lý thuyết** — bài giảng/video do giáo viên đăng, có hỏi đáp.
- ✅ **Làm bài tập** — trắc nghiệm (phát triển sau).
- 👩‍🏫 **Giáo viên** — mở lớp, giám sát online, điểm danh, nhận xét, báo cáo phụ huynh.
- 👨‍👩‍👧 **Phụ huynh** — theo dõi tiến trình & nhận xét cho con.

## Công nghệ
- **Next.js (App Router) + TypeScript + Tailwind CSS**
- **Supabase** (Auth + PostgreSQL + Storage + Realtime)
- Thiết kế theo design system trong [`dign.md`](./dign.md)

## Bắt đầu
Xem hướng dẫn từng bước (dành cho người không rành kỹ thuật) trong **[SETUP.md](./SETUP.md)**.

```powershell
npm install
# tạo .env.local từ .env.example và điền key Supabase
npm run dev
```

## Cấu trúc thư mục
```
src/
  app/               # Trang (Next.js App Router)
    (auth)/          # Đăng nhập / đăng ký
    (dashboard)/     # Dashboard student / teacher / parent
    auth/callback/   # Callback đăng nhập Google
  components/        # UI dùng chung (Button, Card, Input, DashboardShell…)
  lib/supabase/      # Kết nối Supabase (client/server/middleware/auth)
supabase/migrations/ # Schema database (chạy trong Supabase SQL Editor)
```

> Quy tắc làm việc & kiến trúc chi tiết: xem [`CLAUDE.md`](./CLAUDE.md).
