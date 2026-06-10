import { CalendarOff } from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/DashboardShell";
import { LeaveReviewPanel, type ManagerLeaveRow } from "@/components/manager/LeaveReviewPanel";

export const dynamic = "force-dynamic";

const DEMO_LEAVES: ManagerLeaveRow[] = [
  {
    id: "demo-l1",
    start_date: "2026-07-01",
    end_date: "2026-07-03",
    reason: "Đi hội thảo chuyên môn tại Hà Nội",
    status: "pending",
    manager_note: null,
    reviewed_at: null,
    created_at: "2026-06-09T14:00:00Z",
    teacher_name: "Nguyễn Thị Lan",
  },
  {
    id: "demo-l2",
    start_date: "2026-06-20",
    end_date: "2026-06-20",
    reason: "Việc gia đình đột xuất",
    status: "approved",
    manager_note: "Đã ghi nhận, chúc gia đình bình an.",
    reviewed_at: "2026-06-10T09:00:00Z",
    created_at: "2026-06-08T08:00:00Z",
    teacher_name: "Trần Văn Minh",
  },
  {
    id: "demo-l3",
    start_date: "2026-06-28",
    end_date: "2026-06-30",
    reason: "Nghỉ phép hàng năm",
    status: "pending",
    manager_note: null,
    reviewed_at: null,
    created_at: "2026-06-10T10:00:00Z",
    teacher_name: "Lê Thị Hoa",
  },
];

export default async function ManagerLeavesPage() {
  const profile = await requireRole("manager");
  const isDemo = profile.id.startsWith("demo-");

  let leaves: ManagerLeaveRow[] = [];

  if (isDemo) {
    leaves = DEMO_LEAVES;
  } else {
    const supabase = await createClient();
    try {
      const { data } = await supabase
        .from("leave_requests")
        .select(`
          id, start_date, end_date, reason, status,
          manager_note, reviewed_at, created_at,
          teacher:profiles!leave_requests_teacher_id_fkey(full_name)
        `)
        .order("created_at", { ascending: false });

      leaves = ((data ?? []) as unknown as {
        id: string; start_date: string; end_date: string; reason: string;
        status: "pending" | "approved" | "rejected";
        manager_note: string | null; reviewed_at: string | null; created_at: string;
        teacher: { full_name: string | null } | null;
      }[]).map((r) => ({
        id: r.id,
        start_date: r.start_date,
        end_date: r.end_date,
        reason: r.reason,
        status: r.status,
        manager_note: r.manager_note,
        reviewed_at: r.reviewed_at,
        created_at: r.created_at,
        teacher_name: r.teacher?.full_name ?? "Giáo viên",
      }));
    } catch { /* fallback: rỗng */ }
  }

  const pendingCount = leaves.filter((l) => l.status === "pending").length;

  return (
    <DashboardShell role="manager" userName={profile.full_name || "Quản lý"}>
      <div className="mx-auto flex max-w-3xl flex-col gap-lg">
        <div className="flex items-start gap-md">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary-fixed">
            <CalendarOff size={24} className="text-secondary" />
          </span>
          <div>
            <h1 className="text-display-lg">Đơn xin nghỉ</h1>
            <p className="mt-xs text-body-lg text-on-surface-variant">
              {pendingCount > 0
                ? `${pendingCount} đơn đang chờ duyệt`
                : "Tất cả đơn đã được xử lý"}
            </p>
          </div>
        </div>

        <LeaveReviewPanel initialLeaves={leaves} demo={isDemo} />
      </div>
    </DashboardShell>
  );
}
