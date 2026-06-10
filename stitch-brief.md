# Stitch Brief — Brief thiết kế cho Google Stitch (PPS LMS)

> Mục đích: Dán kèm đoạn brief bên dưới **mỗi lần nhờ Stitch vẽ giao diện**, để Stitch
> vẽ đúng theo hệ thống thiết kế `dign.md` ("Lumina Learning") thay vì gu mặc định của Google.
>
> Quy trình: **Stitch vẽ nháp** (kèm brief này) → **Claude chuyển thành component Next.js + Tailwind**
> đúng token của dự án → **ghép vào app**. Stitch ra mockup/HTML thô, là bản nháp tham khảo,
> không phải code dùng ngay.

---

## 1. Brief gốc (dán nguyên văn vào Stitch — tiếng Anh để Stitch hiểu tốt nhất)

```
Design system "Lumina Learning".
Colors: primary purple #6b38d4, secondary magenta #b4136d, tertiary cyan #006577,
background #f8f9ff, cards #ffffff, text #0b1c30, muted text #494454, outline #cbc3d7.
Fonts: headings = Plus Jakarta Sans (bold 700, tight letter-spacing), body = Inter (16px, line-height 1.6).
Style: modern corporate + glassmorphism, soft blurred shadows (blur 20px, low opacity),
vivid purple→magenta gradients for primary actions, lots of whitespace, layered depth.
Shapes: cards rounded 16px, buttons pill-shaped / rounded-xl, inputs 56px tall, progress rings with rounded caps.
Layout: mobile-first, fully responsive (most users on phones).
Language: all UI text in Vietnamese.
Tone: clean, friendly, encouraging — an English-learning app for Vietnamese students (kids/teens),
connecting students, teachers and parents.
Always include these UI states where relevant: empty, loading, error, success.
```

---

## 2. Câu mở đầu cho từng màn hình (ghép TRƯỚC brief ở mục 1)

| Màn hình | Câu mô tả ghép vào đầu |
|---|---|
| 🏠 Dashboard học sinh | `Design a student dashboard home screen: greeting + streak, "continue learning" card, listening practice shortcut, today's lessons, progress overview, bottom nav.` |
| 📚 Trang lớp học | `Design a class detail screen: class header, list of lectures (video + theory) with thumbnails and progress, tabs for Lectures / Exercises / Notes.` |
| 🎧 Luyện nghe | `Design a "listen & memorize" study screen: big highlighted sentence, play/prev/next/stop controls, speed and voice selector, A-B loop, sentence list sidebar.` |
| 👨‍🏫 Dashboard giáo viên | `Design a teacher dashboard: class list, live online students count, attendance, recent student notes, quick actions to post a lecture.` |
| 👪 Trang phụ huynh | `Design a parent screen: child progress overview, teacher notes/comments timeline, attendance summary, alert flags.` |

---

## 3. Token gốc (tham chiếu nhanh — nguồn chân lý là `dign.md`)

- **Màu:** primary `#6b38d4` · secondary `#b4136d` · tertiary `#006577` · nền `#f8f9ff` · card `#ffffff` · chữ `#0b1c30`
- **Font:** Plus Jakarta Sans (tiêu đề, ≥600) + Inter (nội dung, line-height ≥1.5)
- **Bo góc:** card 16px · nút pill/rounded-xl · input cao 56px
- **Spacing:** base 4px · padding card 24px · khoảng cách module 32px · lề mobile 20px
- **Hiệu ứng:** glassmorphism (backdrop-blur 20px, trắng 70%) · bóng mềm blur 20px opacity ~4%
- **8 trạng thái UI bắt buộc:** Empty · Loading · Error · Success · Notification · Search · Filter · Bulk Action
