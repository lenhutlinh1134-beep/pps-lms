# Nguồn dữ liệu gốc — `D:\WEB HỌC TIẾNG ANH`

## 🚨 QUY TẮC TỐI THƯỢNG

> **CHỈ COPY — TUYỆT ĐỐI KHÔNG SỬA / XOÁ / GHI ĐÈ bất cứ thứ gì trong `D:\WEB HỌC TIẾNG ANH`.**

Mọi thao tác chỉ là **đọc + sao chép** sang thư mục dự án `d:\dự án`.  
Vi phạm quy tắc này = mất dữ liệu gốc không thể phục hồi.

---

## Mô tả

Đây là web học tiếng Anh **đã tồn tại** (HTML/CSS/JS thuần + Firebase).  
Tính năng "học từ kết nối" của PPS LMS được port từ đây.

---

## Cấu trúc đáng chú ý

| File / Thư mục | Mô tả |
|---|---|
| `listen.html` (~187 KB) | **Tính năng "học từ kết nối" gốc** = "Listen & Memorize". Có bản `.bak` — không đụng tới |
| `audio/` | **2.807 file mp3** — 4 thư mục giọng: `aria/`, `guy/`, `ryan/`, `sonia/`. Đặt tên theo chủ đề: `buildings_0.mp3`, `city_0.mp3`… |
| `b1_words.js` | Bộ từ vựng B1 (book 1) |
| `data/*.json` | **37 đề thi PET** (Cambridge Preliminary English Test) cho 8 cuốn: listening / reading / writing. JSON còn placeholder cần điền: `[BẠN_CẦN_CHÈN_LINK_FILE_MP3]`, `[CẦN_CẮT_ẢNH_...]` |
| `book 1-8/` | 8 PDF sách Cambridge PET gốc |
| `app.js` (~211 KB), `index.css`, `mobile.html` | Logic & style web cũ — tham khảo để port |
| `firebase.json`, `firestore.rules`, `.firebaserc` | Cấu hình Firebase cũ — tham khảo |
| `generate-*.js`, `node-edge-tts` | Script tạo giọng đọc TTS (đã dùng để sinh audio) |

---

## Đã port sang dự án

| Nguồn gốc | Đã làm | Kết quả |
|---|---|---|
| `listen.html` | `scripts/extract-listening.mjs` | `src/data/listening-topics.json` (379 đoạn văn EN+VI) |
| `b1_words.js` | `scripts/extract-b1words.mjs` | `src/data/b1-words.json` (1075 từ) |
| `audio/` (giọng aria/guy/ryan/sonia) | Copy 1516 file ~76MB | `public/audio/` (đã `.gitignore`) |

---

## Việc còn lại với dữ liệu gốc

1. **Khi PM bổ sung nội dung mới** → chạy lại 2 script extract
2. **Trước khi deploy production** → chuyển toàn bộ audio lên **Supabase Storage** (76MB không nên nằm trong `public/` khi deploy Vercel)
3. **37 đề PET** → điền placeholder → import vào bảng Postgres khi làm tính năng bài tập
