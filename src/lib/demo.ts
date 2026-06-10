// ============================================================
// CỬA SAU XEM THỬ (TẠM THỜI) — chỉ bật ở môi trường dev.
// Tự động TẮT khi build production (NODE_ENV=production trên Vercel).
// 🗑️ Cách gỡ bỏ hoàn toàn khi không cần: xoá file này + component
//    src/components/DemoEntry.tsx + nhánh "demo" trong src/lib/supabase/auth.ts.
// ============================================================

export const DEMO_COOKIE = "pps_demo_role";

/** Cửa sau chỉ hoạt động khi KHÔNG phải production. */
export const demoEnabled = process.env.NODE_ENV !== "production";

export type DemoRole = "student" | "teacher" | "parent" | "manager";

export const DEMO_ROLES: { role: DemoRole; label: string; emoji: string }[] = [
  { role: "student", label: "Học sinh", emoji: "🎓" },
  { role: "teacher", label: "Giáo viên", emoji: "👩‍🏫" },
  { role: "parent", label: "Phụ huynh", emoji: "👨‍👩‍👧" },
  { role: "manager", label: "Quản lý", emoji: "🏢" },
];
