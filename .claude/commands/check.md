# /check — Kiểm Tra Nhanh Trước Khi Deploy

**Dùng khi:** Sắp commit/deploy, muốn kiểm tra nhanh mà không tốn nhiều quota.

**Model nên dùng:** claude-haiku-4-5-20251001

## Checklist tự động (chạy lần lượt, báo kết quả)

### 1. Security (quan trọng nhất)
- [ ] Không có `.env.local` trong git staging
- [ ] Không có hardcode API key, password trong code
- [ ] Mọi API route đều check session
- [ ] RLS còn bật trên tất cả bảng

### 2. Performance
- [ ] Không có `SELECT *` không có LIMIT
- [ ] Không có query trong vòng lặp (N+1)
- [ ] Image dùng `next/image`, không dùng `<img>` thuần

### 3. UX
- [ ] Loading state có hiện không?
- [ ] Error state có message hiểu được không?
- [ ] Empty state có hướng dẫn làm gì tiếp không?
- [ ] Mobile responsive (thử ở màn 375px)

### 4. Code quality
- [ ] Không có `console.log` còn sót
- [ ] TypeScript không có `any` bừa bãi
- [ ] Không có TODO/FIXME chưa xử lý

## Cách gọi

```
/check [tên file hoặc tính năng vừa làm]
```

Ví dụ:
- `/check src/app/student/lessons/page.tsx`
- `/check tính năng điểm danh vừa build`

## Output

Bảng kết quả ✅/❌/⚠️ — không giải thích dài, chỉ đánh dấu và nêu vấn đề nếu có.
