# /fix — Fix Bug Nhanh

**Dùng khi:** Có lỗi cụ thể cần sửa ngay, không cần phân tích dài.

**Model nên dùng:** claude-haiku-4-5-20251001 cho lỗi đơn giản, claude-sonnet-4-6 cho lỗi logic phức tạp.

## Quy trình (không dài dòng)

1. **Đọc lỗi** — paste error message hoặc mô tả hành vi sai
2. **Tìm file** — chỉ đọc file liên quan, không scan toàn bộ project
3. **Sửa** — minimal change, không refactor thêm
4. **Verify** — tự kiểm tra xem sửa có gây lỗi chỗ khác không

## Cách gọi

```
/fix [mô tả lỗi hoặc paste error]
```

Ví dụ:
- `/fix TypeError: Cannot read property 'id' of undefined — trang /student/lessons`
- `/fix nút submit không hoạt động trong form tạo bài tập`

## Cam kết

- **Không** thêm feature khi đang fix bug
- **Không** refactor code xung quanh
- **Không** đổi tên biến, hàm nếu không cần thiết
- Chỉ sửa đúng chỗ gây lỗi

## Output

- File đã sửa (chỉ phần thay đổi)
- 1 câu giải thích nguyên nhân gốc rễ
