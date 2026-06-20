import { ClipboardCheck, Baby } from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { isDemoId, DEMO_PARENT_ATTENDANCE, DEMO_PARENT_CHILDREN } from "@/lib/demo-data";
import type { DemoChildRow } from "@/lib/demo-data";
import { DashboardShell } from "@/components/DashboardShell";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface AttRow {
  student_id: string;
  date: string;
  status: "present" | "absent" | "late";
  class?: { name: string } | null;
}

interface ChildRow {
  student_id: string;
  full_name: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  present: "Có mặt",
  absent: "Vắng",
  late: "Đi muộn",
};

const STATUS_STYLE: Record<string, string> = {
  present: "bg-tertiary-fixed text-on-tertiary-fixed",
  absent: "bg-error-container text-on-error-container",
  late: "bg-secondary-fixed text-on-secondary-fixed",
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" });
}

export default async function ParentAttendancePage() {
  const profile = await requireRole("parent");
  const demo = isDemoId(profile.id);

  let children: ChildRow[] = [];
  let records: AttRow[] = [];

  if (demo) {
    children = (DEMO_PARENT_CHILDREN as unknown as DemoChildRow[]).map((c) => ({
      student_id: c.student_id,
      full_name: c.full_name,
    }));
    records = (DEMO_PARENT_ATTENDANCE as AttRow[]);
  } else {
    try {
      const supabase = await createClient();
      const { data: links } = await supabase
        .from("parent_student")
        .select("student_id")
        .eq("parent_id", profile.id);
      const childIds = (links ?? []).map((l) => l.student_id);

      if (childIds.length > 0) {
        const [profilesRes, attRes] = await Promise.all([
          supabase.from("profiles").select("id, full_name").in("id", childIds),
          supabase
            .from("attendance")
            .select("student_id, date, status, class:classes(name)")
            .in("student_id", childIds)
            .order("date", { ascending: false })
            .limit(90),
        ]);
        children = (profilesRes.data ?? []).map((p: { id: string; full_name: string | null }) => ({
          student_id: p.id,
          full_name: p.full_name,
        }));
        records = (attRes.data as unknown as AttRow[]) ?? [];
      }
    } catch { /* bỏ qua lỗi */ }
  }

  // Nhóm theo con
  const byChild = children.map((child) => {
    const rows = records.filter((r) => r.student_id === child.student_id);
    const present = rows.filter((r) => r.status === "present").length;
    const absent = rows.filter((r) => r.status === "absent").length;
    const late = rows.filter((r) => r.status === "late").length;
    return { child, rows, present, absent, late };
  });

  return (
    <DashboardShell role="parent" userName={profile.full_name || "Phụ huynh"}>
      <div className="mx-auto flex max-w-3xl flex-col gap-lg">
        <div>
          <h1 className="text-display-lg">Điểm danh</h1>
          <p className="mt-xs text-body-lg text-on-surface-variant">
            Lịch sử điểm danh 90 ngày gần nhất của con.
          </p>
        </div>

        {children.length === 0 ? (
          <EmptyState
            icon={Baby}
            title="Chưa liên kết với học sinh nào"
            description="Vào mục Con của tôi để liên kết tài khoản con trước."
          />
        ) : (
          byChild.map(({ child, rows, present, absent, late }) => (
            <div key={child.student_id} className="flex flex-col gap-md">
              {/* Header con */}
              <div className="flex items-center justify-between flex-wrap gap-sm">
                <h2 className="text-headline-sm text-primary">{child.full_name ?? "(Học sinh)"}</h2>
                <div className="flex gap-sm text-label-md">
                  <span className="rounded-full bg-tertiary-fixed px-3 py-1 text-on-tertiary-fixed">
                    ✅ {present} có mặt
                  </span>
                  <span className="rounded-full bg-secondary-fixed px-3 py-1 text-on-secondary-fixed">
                    🕐 {late} muộn
                  </span>
                  <span className="rounded-full bg-error-container px-3 py-1 text-on-error-container">
                    ❌ {absent} vắng
                  </span>
                </div>
              </div>

              {rows.length === 0 ? (
                <Card className="py-lg text-center text-on-surface-variant text-body-md">
                  Chưa có dữ liệu điểm danh.
                </Card>
              ) : (
                <Card>
                  <div className="flex flex-col divide-y divide-outline-variant/30">
                    {rows.map((r, i) => {
                      const cls = (r.class as unknown as { name: string } | null)?.name;
                      return (
                        <div key={i} className="flex items-center justify-between gap-md py-sm">
                          <div>
                            <p className="text-body-md font-medium">{fmtDate(r.date)}</p>
                            {cls && <p className="text-label-sm text-on-surface-variant">{cls}</p>}
                          </div>
                          <span className={cn("rounded-full px-3 py-1 text-label-sm font-medium", STATUS_STYLE[r.status])}>
                            {STATUS_LABEL[r.status]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}
            </div>
          ))
        )}
      </div>
    </DashboardShell>
  );
}
