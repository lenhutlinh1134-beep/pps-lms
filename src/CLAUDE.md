# Quy trình code — PPS LMS `src/`

> Tài liệu này tự động load khi làm việc trong thư mục `src/`.

---

## Trước khi code — 6 câu bắt buộc

1. **Vấn đề thực sự** là gì?
2. Có cách nào **tốt hơn** yêu cầu ban đầu không?
3. Có cách nào **đơn giản hơn** không?
4. Có thể **tự động hóa** phần nào không?
5. Nên **thêm tính năng** gì mà khách chưa nghĩ tới?
6. Nên **bỏ tính năng** gì để đơn giản hơn?

Sau đó đề xuất **3 phương án A / B / C** và recommend.

---

## Design system

**Nguồn chân lý:** [`dign.md`](../dign.md) — Lumina Learning design system.

| Token | Giá trị | Dùng khi |
|---|---|---|
| Primary | `#6b38d4` (tím) | Nút chính, nav active, progress bar |
| Accent | `#b4136d` (hồng) | Gamification, điểm nhấn ưu tiên cao |
| Tertiary | `#006577` (cyan) | Trạng thái thông tin |
| Nền | `#f8f9ff` base / `#ffffff` card | |
| Font heading | `Plus Jakarta Sans` weight ≥600 | |
| Font body | `Inter` line-height ≥1.5 | |
| Bo góc | card `rounded-lg` (16px), nút `rounded-xl` | |
| Input height | 56px | Dễ chạm trên mobile |
| Spacing base | 4px | Padding card 24px, module 32px |

**Glassmorphism:** `backdrop-blur-20 bg-white/70` cho sidebar/banner.

---

## React 19 — Quy tắc bắt buộc

- **KHÔNG dùng `forwardRef`** — ref là prop thường trong React 19
- Dùng `use()` thay `useContext()` khi có thể
- Bộ UI `src/components/ui/` đã theo chuẩn React 19

---

## Skills Vercel — đọc trước khi code

Trong `.agents/skills/` có tài liệu kỹ thuật (KHÔNG phải slash command — đọc thủ công):

| Skill | Dùng khi |
|---|---|
| `vercel-react-best-practices` | 70 quy tắc tối ưu React/Next (waterfall, bundle, re-render…) |
| `vercel-composition-patterns` | Kiến trúc component, compound component |
| `vercel-react-view-transitions` | Hiệu ứng chuyển trang |
| `web-design-guidelines` | Soát UI/accessibility |
| `writing-guidelines` | Soát chữ copy trong UI |
| `deploy-to-vercel` | Khi deploy |
| ❌ `vercel-react-native-skills` | Bỏ qua — dành cho app điện thoại |

---

## 8 trạng thái UI — bắt buộc mỗi tính năng

| Trạng thái | Mô tả |
|---|---|
| Empty State | Khi chưa có dữ liệu |
| Loading State | Khi đang tải |
| Error State | Khi có lỗi |
| Success State | Khi thành công |
| Notification | Thông báo cho người dùng |
| Search | Tìm kiếm |
| Filter | Lọc dữ liệu |
| Bulk Action | Thao tác nhiều item cùng lúc |

Thiếu trạng thái nào → tự bổ sung trước khi báo xong.

---

## Self-review trước khi báo "xong"

- [ ] **Code smell?** — có đoạn lặp lại, khó đọc?
- [ ] **Performance?** — có query chậm, render thừa?
- [ ] **Security?** — có lộ data, thiếu validation?
- [ ] **UX?** — người dùng có bị nhầm lẫn?
- [ ] **Database?** — có N+1, thiếu index?

Phát hiện vấn đề → **sửa trước khi báo xong**.

---

## Sau mỗi thay đổi giao diện

Chụp màn hình + so sánh với `dign.md` / ảnh mockup. Nếu lệch → sửa cho khớp trước khi báo xong.

---

## Phân quyền theo vai trò

- `src/app/(dashboard)/student/` — chỉ học sinh
- `src/app/(dashboard)/teacher/` — chỉ giáo viên  
- `src/app/(dashboard)/parent/` — chỉ phụ huynh
- `src/app/demo/` — dev only, không cần login (tự tắt ở production)

Xem chi tiết schema + RLS trong [`supabase/CLAUDE.md`](../supabase/CLAUDE.md).
