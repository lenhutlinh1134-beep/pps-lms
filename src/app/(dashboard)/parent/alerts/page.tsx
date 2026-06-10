import { AlertTriangle, ShieldCheck } from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/DashboardShell";
import { Card } from "@/components/ui/Card";
import { EmptyState, StatTile } from "@/components/EmptyState";
import { computeFlags, flagWeight, type Flag, type StudentMetrics } from "@/lib/flags";

export const dynamic = "force-dynamic";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChildMetricsRow {
  student_id: string;
  student_name: string;
  class_id: string;
  class_name: string;
  study_minutes_week: number;
  listens_week: number;
  days_since_active: number;
  avg_score: number | null;
}

interface StudentAlert {
  student_id: string;
  student_name: string;
  class_name: string;
  flags: Flag[];
  weight: number;
}

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO_METRICS: ChildMetricsRow[] = [
  {
    student_id: "demo-s1",
    student_name: "Nguyễn An",
    class_id: "demo-c1",
    class_name: "Tiếng Anh Nâng Cao A",
    study_minutes_week: 10,
    listens_week: 1,
    days_since_active: 9,
    avg_score: 45,
  },
  {
    student_id: "demo-s2",
    student_name: "Nguyễn Bình",
    class_id: "demo-c2",
    class_name: "Tiếng Anh Cơ Bản B",
    study_minutes_week: 120,
    listens_week: 5,
    days_since_active: 1,
    avg_score: 82,
  },
];

// ─── Flag chip ────────────────────────────────────────────────────────────────

function FlagChip({ flag }: { flag: Flag }) {
  const colorMap: Record<string, string> = {
    red: "bg-error-container text-on-error-container",
    warn: "bg-secondary-fixed text-on-secondary-fixed",
    headphone: "bg-tertiary-fixed text-on-tertiary-fixed",
  };
  return (
    <span
      title={flag.detail}
      className={`inline-flex items-center rounded-full px-3 py-1 text-label-sm font-medium ${colorMap[flag.severity]}`}
    >
      {flag.label}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ParentAlertsPage() {
  const profile = await requireRole("parent");
  const isDemo = profile.id.startsWith("demo-");

  let rows: ChildMetricsRow[] = [];
  let fetchError = false;

  if (isDemo) {
    rows = DEMO_METRICS;
  } else {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_my_children_metrics");
    if (error) {
      fetchError = true;
    } else {
      rows = (data as ChildMetricsRow[]) ?? [];
    }
  }

  // Compute flags & sort
  const alerts: StudentAlert[] = rows.map((r) => {
    const metrics: StudentMetrics = {
      studyMinutesWeek: r.study_minutes_week,
      goalMinutesWeek: 60, // 60 phút/tuần là mục tiêu mặc định
      listensWeek: r.listens_week,
      daysSinceActive: r.days_since_active,
      avgScore: r.avg_score,
    };
    const flags = computeFlags(metrics);
    return {
      student_id: r.student_id,
      student_name: r.student_name,
      class_name: r.class_name,
      flags,
      weight: flagWeight(flags),
    };
  });

  alerts.sort((a, b) => b.weight - a.weight);

  const totalChildren = alerts.length;
  const childrenWithAlerts = alerts.filter((a) => a.flags.length > 0).length;
  const redAlerts = alerts.reduce(
    (sum, a) => sum + a.flags.filter((f) => f.severity === "red").length,
    0,
  );
  const allGood = childrenWithAlerts === 0;

  return (
    <DashboardShell role="parent" userName={profile.full_name || "Phụ huynh"}>
      <div className="mx-auto flex max-w-3xl flex-col gap-lg">
        {/* Header */}
        <div className="flex items-start gap-md">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-error-container text-on-error-container">
            <AlertTriangle size={24} />
          </span>
          <div>
            <h1 className="text-display-lg">Cảnh báo học viên</h1>
            <p className="mt-xs text-body-lg text-on-surface-variant">
              Theo dõi những dấu hiệu cần chú ý của con
            </p>
          </div>
        </div>

        {/* Error state */}
        {fetchError && (
          <Card className="border border-error-container bg-error-container">
            <p className="text-body-md text-on-error-container">
              Không thể tải dữ liệu. Vui lòng thử lại sau.
            </p>
          </Card>
        )}

        {/* Stat tiles */}
        {!fetchError && (
          <div className="grid grid-cols-3 gap-md">
            <StatTile label="Con đang theo dõi" value={String(totalChildren)} />
            <StatTile
              label="Con có cảnh báo"
              value={String(childrenWithAlerts)}
              hint={childrenWithAlerts > 0 ? "Cần chú ý" : undefined}
            />
            <StatTile
              label="Cảnh báo đỏ"
              value={String(redAlerts)}
              hint={redAlerts > 0 ? "Khẩn cấp" : undefined}
            />
          </div>
        )}

        {/* Empty / list */}
        {!fetchError && allGood ? (
          <EmptyState
            icon={ShieldCheck}
            title="Không có cảnh báo nào"
            description="Tất cả con đang học đúng tiến độ. Tiếp tục duy trì nhé!"
          />
        ) : !fetchError ? (
          <div className="flex flex-col gap-md">
            {alerts.map((a) => (
              <Card key={a.student_id}>
                <div className="flex flex-col gap-sm">
                  {/* Name + class */}
                  <div>
                    <p className="text-body-md font-semibold">{a.student_name}</p>
                    <p className="text-label-md text-on-surface-variant">{a.class_name}</p>
                  </div>

                  {/* Flags */}
                  {a.flags.length === 0 ? (
                    <span className="inline-flex items-center gap-1 text-label-md text-on-surface-variant">
                      <ShieldCheck size={14} /> Không có cảnh báo
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-xs">
                      {a.flags.map((f) => (
                        <FlagChip key={f.key} flag={f} />
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : null}
      </div>
    </DashboardShell>
  );
}
