import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "./server";
import { DEMO_COOKIE, demoEnabled } from "@/lib/demo";

export type Role = "student" | "teacher" | "parent" | "manager";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: Role;
  avatar_url: string | null;
}

/** Lấy user + profile hiện tại (server-side). Trả null nếu chưa đăng nhập / chưa cấu hình env. */
export async function getCurrentProfile(): Promise<{ profile: Profile } | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, avatar_url")
    .eq("id", user.id)
    .single();

  if (!profile) return null;
  return { profile: profile as Profile };
}

/** Đường dẫn dashboard tương ứng vai trò. */
export function dashboardPath(role: Role): string {
  return `/${role}`;
}

/** Nhãn tiếng Việt của vai trò. */
export const ROLE_LABEL: Record<Role, string> = {
  student: "Học sinh",
  teacher: "Giáo viên",
  parent: "Phụ huynh",
  manager: "Quản lý",
};

/**
 * Dùng trong Server Component của từng dashboard: bắt buộc đăng nhập đúng vai trò.
 * - Chưa đăng nhập / chưa cấu hình -> về /login
 * - Sai vai trò -> chuyển về dashboard đúng của họ
 */
export async function requireRole(role: Role): Promise<Profile> {
  // CỬA SAU XEM THỬ (chỉ dev): nếu có cookie demo thì trả hồ sơ giả, không cần đăng nhập.
  const demo = await getDemoProfile();
  if (demo) {
    if (demo.role !== role) redirect(dashboardPath(demo.role));
    return demo;
  }

  const res = await getCurrentProfile();
  if (!res) redirect("/login");
  if (res.profile.role !== role) redirect(dashboardPath(res.profile.role));
  return res.profile;
}

/** Đọc cookie demo (chỉ khi demoEnabled). Trả hồ sơ giả để xem giao diện. */
async function getDemoProfile(): Promise<Profile | null> {
  if (!demoEnabled) return null;
  const role = (await cookies()).get(DEMO_COOKIE)?.value;
  if (role === "student" || role === "teacher" || role === "parent" || role === "manager") {
    const labels: Record<string, string> = { student: "Học sinh thử", teacher: "Giáo viên thử", parent: "Phụ huynh thử", manager: "Quản lý thử" };
    const label = labels[role];
    return { id: `demo-${role}`, full_name: label, email: null, role, avatar_url: null };
  }
  return null;
}
