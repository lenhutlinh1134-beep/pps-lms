# /ui — Tạo Component Nhanh

**Dùng khi:** Cần tạo UI component mới cho PPS LMS.

**Model nên dùng:** claude-haiku-4-5-20251001 (rẻ nhất, đủ dùng cho UI)

## Context cố định (đừng search lại)

**Design tokens:**
- Primary: `#6b38d4` (tím) | Secondary: `#b4136d` (hồng)
- Font: `Plus Jakarta Sans` (tiêu đề), `Inter` (nội dung)
- Class Tailwind: `text-primary`, `bg-primary`, `text-secondary`, `bg-secondary`

**Stack:** Next.js App Router + TypeScript + Tailwind CSS + Supabase

**3 vai trò:** student | teacher | parent — mỗi component phải rõ dùng cho ai.

## Quy trình (4 bước, không thêm)

1. Hỏi: component này dành cho vai trò nào? (student/teacher/parent)
2. Tạo file `.tsx` với **8 trạng thái**: Loading, Empty, Error, Success, Notification, Search, Filter, Bulk
3. Dùng `use client` nếu có state, không thì Server Component
4. Self-review: responsive mobile? màu đúng token? không hard-code?

## Cách gọi

```
/ui [tên component] [vai trò]
```

Ví dụ: `/ui LessonCard student` hoặc `/ui AttendanceTable teacher`

## Output mong đợi

Một file `.tsx` duy nhất, đặt đúng thư mục theo vai trò:
- `src/components/student/`
- `src/components/teacher/`
- `src/components/parent/`
