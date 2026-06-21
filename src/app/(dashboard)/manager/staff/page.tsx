import { Users, ChevronRight } from "lucide-react";
import Link from "next/link";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/DashboardShell";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

interface Teacher {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  avatar_url: string | null;
}

const DEMO_TEACHERS: Teacher[] = [
  { id: "t1", full_name: "Nguyễn Thị Lan", email: "lan.nguyen@pps.edu.vn", role: "teacher", avatar_url: null },
  { id: "t2", full_name: "Trần Văn Minh", email: "minh.tran@pps.edu.vn", role: "teacher", avatar_url: null },
  { id: "t3", full_name: "Lê Thị Hoa", email: "hoa.le@pps.edu.vn", role: "teacher", avatar_url: null },
  { id: "t4", full_name: "Phạm Quốc Bảo", email: "bao.pham@pps.edu.vn", role: "teacher", avatar_url: null },
];

export default async function StaffPage() {
  const profile = await requireRole("manager");
  const isDemo = profile.id.startsWith("demo-");

  let teachers: Teacher[] = [];

  if (isDemo) {
    teachers = DEMO_TEACHERS;
  } else {
    const supabase = await createClient();
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, avatar_url")
        .eq("role", "teacher")
        .order("full_name", { ascending: true });
      teachers = (data as Teacher[]) ?? [];
    } catch {
      // fallback: giữ mảng rỗng
    }
  }

  return (
    <DashboardShell role="manager" userName={profile.full_name || "Quản lý"}>
      <div className="mx-auto flex max-w-5xl flex-col gap-lg">
        <div>
          <h1 className="text-display-lg">Nhân viên</h1>
          <p className="mt-xs text-body-lg text-on-surface-variant">
            Danh sách giáo viên đang công tác tại trung tâm.
          </p>
        </div>

        {teachers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Chưa có giáo viên nào"
            description="Danh sách giáo viên sẽ hiển thị ở đây sau khi tài khoản được tạo."
          />
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-body-md">
                <thead>
                  <tr className="border-b border-outline-variant">
                    <th className="pb-md pr-lg text-label-md font-semibold text-on-surface-variant">
                      Giáo viên
                    </th>
                    <th className="pb-md pr-lg text-label-md font-semibold text-on-surface-variant hidden md:table-cell">
                      Email
                    </th>
                    <th className="pb-md pr-lg text-label-md font-semibold text-on-surface-variant">
                      Vai trò
                    </th>
                    <th className="pb-md w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {teachers.map((teacher) => {
                    const initials = (teacher.full_name ?? "?").charAt(0).toUpperCase();
                    return (
                      <tr key={teacher.id} className="hover:bg-surface-container transition-colors cursor-pointer">
                        <td className="py-md pr-lg">
                          <Link href={`/manager/staff/${teacher.id}`} className="flex items-center gap-sm">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-fixed font-display text-label-md font-bold text-on-primary-fixed">
                              {initials}
                            </span>
                            <div>
                              <p className="font-semibold leading-tight">
                                {teacher.full_name ?? "(Chưa có tên)"}
                              </p>
                              <p className="text-label-sm text-on-surface-variant md:hidden">
                                {teacher.email ?? "—"}
                              </p>
                            </div>
                          </Link>
                        </td>
                        <td className="py-md pr-lg text-on-surface-variant hidden md:table-cell">
                          {teacher.email ?? "—"}
                        </td>
                        <td className="py-md">
                          <span className="inline-flex items-center rounded-full bg-tertiary-fixed px-3 py-1 text-label-sm font-medium text-on-tertiary-fixed">
                            Giáo viên
                          </span>
                        </td>
                        <td className="py-md pl-md text-on-surface-variant">
                          <Link href={`/manager/staff/${teacher.id}`}>
                            <ChevronRight size={18} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-md text-label-sm text-on-surface-variant">
              Tổng: {teachers.length} giáo viên
            </p>
          </Card>
        )}
      </div>
    </DashboardShell>
  );
}
