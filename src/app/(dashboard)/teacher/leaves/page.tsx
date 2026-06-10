import { CalendarOff } from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/DashboardShell";
import { LeaveRequestManager, type LeaveRow } from "@/components/teacher/LeaveRequestManager";

export const dynamic = "force-dynamic";

const DEMO_LEAVES: LeaveRow[] = [
  {
    id: "demo-l1",
    start_date: "2026-06-20",
    end_date: "2026-06-20",
    reason: "Việc gia đình đột xuất",
    status: "approved",
    manager_note: "Đã ghi nhận, chúc gia đình bình an.",
    created_at: "2026-06-10T08:00:00Z",
  },
  {
    id: "demo-l2",
    start_date: "2026-07-01",
    end_date: "2026-07-03",
    reason: "Đi hội thảo chuyên môn tại Hà Nội",
    status: "pending",
    manager_note: null,
    created_at: "2026-06-09T14:00:00Z",
  },
];

export default async function TeacherLeavesPage() {
  const profile = await requireRole("teacher");
  const isDemo = profile.id.startsWith("demo-");

  let leaves: LeaveRow[] = [];

  if (isDemo) {
    leaves = DEMO_LEAVES;
  } else {
    const supabase = await createClient();
    try {
      const { data } = await supabase
        .from("leave_requests")
        .select("id, start_date, end_date, reason, status, manager_note, created_at")
        .eq("teacher_id", profile.id)
        .order("created_at", { ascending: false });
      leaves = (data as LeaveRow[]) ?? [];
    } catch { /* fallback: rỗng */ }
  }

  return (
    <DashboardShell role="teacher" userName={profile.full_name || "Giáo viên"}>
      <div className="mx-auto flex max-w-3xl flex-col gap-lg">
        <div className="flex items-start gap-md">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary-fixed">
            <CalendarOff size={24} className="text-secondary" />
          </span>
          <div>
            <h1 className="text-display-lg">Xin nghỉ phép</h1>
            <p className="mt-xs text-body-lg text-on-surface-variant">
              Nộp và theo dõi đơn xin nghỉ — quản lý sẽ duyệt trong vòng 24h.
            </p>
          </div>
        </div>

        <LeaveRequestManager initialLeaves={leaves} demo={isDemo} />
      </div>
    </DashboardShell>
  );
}
