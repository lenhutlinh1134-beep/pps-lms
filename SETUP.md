# Hướng dẫn cài đặt & chạy web PPS LMS

Tài liệu này viết cho người **không rành kỹ thuật**. Làm tuần tự từng bước là chạy được.

---

## Bước 1 — Cài thư viện (chỉ làm 1 lần)

Mở **PowerShell** trong thư mục dự án (`d:\dự án`) rồi gõ:

```powershell
npm install
```

> Lệnh này tải toàn bộ thư viện cần thiết. Chờ vài phút cho xong.

---

## Bước 2 — Tạo dự án Supabase (kho dữ liệu của web)

1. Vào https://supabase.com → đăng nhập (có thể bằng Google) → **New project**.
2. Đặt tên (vd `pps-lms`), chọn vùng **Southeast Asia (Singapore)** cho nhanh, đặt mật khẩu database rồi tạo.
3. Chờ ~2 phút cho project khởi tạo xong.

---

## Bước 3 — Lấy "chìa khoá" kết nối

1. Trong project Supabase: vào **Project Settings** (bánh răng) → **API**.
2. Sao chép 2 giá trị:
   - **Project URL**
   - **anon public** (trong mục Project API keys)
3. Trong thư mục dự án, tạo file tên **`.env.local`** (copy từ `.env.example`) rồi điền vào:

```
NEXT_PUBLIC_SUPABASE_URL=dán-Project-URL-vào-đây
NEXT_PUBLIC_SUPABASE_ANON_KEY=dán-anon-public-key-vào-đây
```

> ⚠️ File `.env.local` chứa chìa khoá — **không gửi cho ai, không đẩy lên git** (đã được chặn sẵn).

---

## Bước 4 — Tạo bảng dữ liệu

1. Trong Supabase: vào **SQL Editor** → **New query**.
2. Mở file `supabase/migrations/0001_init.sql` trong dự án, **copy toàn bộ** nội dung.
3. Dán vào ô SQL Editor rồi bấm **Run**. Báo "Success" là xong — đã tạo đủ bảng + phân quyền.

---

## Bước 5 — Tạo kho chứa file (audio / video)

1. Trong Supabase: vào **Storage** → **New bucket**.
2. Tạo bucket tên **`media`**, để **Public** (cho phép phát audio/video).

---

## Bước 6 — (Tuỳ chọn) Bật đăng nhập Google

1. Vào **Authentication** → **Providers** → bật **Google**.
2. Làm theo hướng dẫn của Supabase để lấy Client ID/Secret từ Google Cloud.
3. Nếu chưa làm bước này, người dùng vẫn đăng nhập được bằng **Email + mật khẩu**.

> Mẹo khi đang phát triển: vào **Authentication → Providers → Email** và **tắt "Confirm email"** để đăng ký xong vào học ngay (không phải bấm link xác nhận trong email).

---

## Bước 7 — Chạy web

```powershell
npm run dev
```

Mở trình duyệt vào **http://localhost:3000**. Xong! 🎉

---

## Các lệnh hay dùng

| Lệnh | Tác dụng |
|---|---|
| `npm run dev` | Chạy web ở chế độ phát triển (tự cập nhật khi sửa code) |
| `npm run build` | Đóng gói bản chạy thật |
| `npm run start` | Chạy bản đã build |
| `npm run lint` | Kiểm tra lỗi code |

## Gặp lỗi?

- **Trang đăng nhập báo "Không kết nối được máy chủ"** → kiểm tra lại `.env.local` (Bước 3) đã điền đúng chưa, rồi tắt và chạy lại `npm run dev`.
- **Đăng ký không thấy trường/lớp** → bình thường, vì trường/lớp do **giáo viên tạo** trước. Giai đoạn này có thể tự thêm vài dòng mẫu trong bảng `schools` và `classes` (Supabase → Table Editor) để thử.
- **Đăng nhập Google lỗi** → bạn chưa làm Bước 6; dùng Email + mật khẩu thay thế.
