import { BarChart3, BookOpen, ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/DashboardShell";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/EmptyState";
import { computeFlags, type StudentMetrics } from "@/lib/flags";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MetricsRow {
  student_id: string; student_name: string | null; class_id: string; class_name: string;
  study_minutes_week: number; listens_week: number; days_since_active: number; avg_score: number | null;
}

interface AssignmentRow {
  id: string; title: string; type: string; created_at: string; class_id: string;
  class_name: string; total_students: number; submitted: number;
  avg_score: number | null; pass_count: number;
}

interface ClassAttendance {
  class_id: string; class_name: string; student_count: number; session_count: number;
  present_count: number; absent_count: number; late_count: number; total_records: number;
}

type AttAgg = { present: number; absent: number; late: number; dates: Set<string> };

// ─── Constants ────────────────────────────────────────────────────────────────

const FLAG_STYLE: Record<string, string> = {
  red: "bg-error-container text-on-error-container",
  warn: "bg-secondary-fixed text-on-secondary-fixed",
  headphone: "bg-tertiary-fixed text-on-tertiary-fixed",
};

const TABS = [
  { key: "flags",       label: "Cảnh báo HS",      icon: BarChart3 },
  { key: "assignments", label: "Kết quả bài tập",   icon: BookOpen },
  { key: "attendance",  label: "Báo cáo điểm danh", icon: ClipboardCheck },
] as const;

type TabKey = typeof TABS[number]["key"];
const VALID_TABS: readonly string[] = TABS.map(t => t.key);

// ─── Helper ───────────────────────────────────────────────────────────────────

function buildAnalyzed(rows: MetricsRow[]) {
  return rows.map(r => {
    const metrics: StudentMetrics = {
      studyMinutesWeek: r.study_minutes_week,
      goalMinutesWeek: 60,
      listensWeek: r.listens_week,
      daysSinceActive: r.days_since_active,
      avgScore: r.avg_score,
    };
    return { ...r, flags: computeFlags(metrics), metrics };
  }).sort((a, b) => b.flags.length - a.flags.length);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: rawTab = "flags" } = await searchParams;
  const tab: TabKey = VALID_TABS.includes(rawTab) ? (rawTab as TabKey) : "flags";

  const profile = await requireRole("teacher");
  const supabase = await createClient();

  // Lấy class IDs của GV — dùng chung cho tất cả tabs
  const { data: ctData } = await supabase
    .from("class_teachers")
    .select("class_id")
    .eq("teacher_id", profile.id);
  const classIds = (ctData ?? []).map((r: { class_id: string }) => r.class_id);

  // ── Tab: Cảnh báo HS ──────────────────────────────────────────────────────

  let metricsRows: MetricsRow[] = [];
  let analyzed: ReturnType<typeof buildAnalyzed> = [];
  let flagCount = 0;

  if (tab === "flags") {
    const { data } = await supabase.rpc("get_all_my_students_metrics");
    metricsRows = (data as MetricsRow[]) ?? [];
    analyzed = buildAnalyzed(metricsRows);
    flagCount = analyzed.filter(x => x.flags.length > 0).length;
  }

  // ── Tab: Kết quả bài tập ──────────────────────────────────────────────────

  let assignments: AssignmentRow[] = [];

  if (tab === "assignments" && classIds.length > 0) {
    const [aRes, csRes] = await Promise.all([
      supabase
        .from("assignments")
        .select("id, title, type, created_at, class_id, classes(name)")
        .in("class_id", classIds)
        .order("created_at", { ascending: false }),
      supabase
        .from("class_students")
        .select("class_id, student_id")
        .in("class_id", classIds),
    ]);

    const aRows = (aRes.data ?? []) as unknown as {
      id: string; title: string; type: string; created_at: string;
      class_id: string; classes: { name: string } | null;
    }[];

    const studentsByClass = ((csRes.data ?? []) as { class_id: string; student_id: string }[])
      .reduce<Record<string, number>>((acc, r) => {
        acc[r.class_id] = (acc[r.class_id] ?? 0) + 1;
        return acc;
      }, {});

    if (aRows.length > 0) {
      const { data: sData } = await supabase
        .from("submissions")
        .select("assignment_id, student_id, score")
        .in("assignment_id", aRows.map(a => a.id));

      const subsByAssignment = ((sData ?? []) as { assignment_id: string; student_id: string; score: number | null }[])
        .reduce<Record<string, { student_id: string; score: number | null }[]>>((acc, s) => {
          (acc[s.assignment_id] ??= []).push(s);
          return acc;
        }, {});

      assignments = aRows.map(a => {
        const subs = subsByAssignment[a.id] ?? [];
        const scores = subs.map(s => s.score).filter((s): s is number => s !== null);
        const avg = scores.length > 0
          ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length * 10) / 10
          : null;
        return {
          id: a.id,
          title: a.title,
          type: a.type,
          created_at: a.created_at,
          class_id: a.class_id,
          class_name: a.classes?.name ?? "Lớp không xác định",
          total_students: studentsByClass[a.class_id] ?? 0,
          submitted: subs.length,
          avg_score: avg,
          pass_count: scores.filter(s => s >= 5).length,
        };
      });
    }
  }

  // ── Tab: Báo cáo điểm danh ────────────────────────────────────────────────

  let classAttendance: ClassAttendance[] = [];

  if (tab === "attendance" && classIds.length > 0) {
    const [clRes, csRes, attRes] = await Promise.all([
      supabase.from("classes").select("id, name").in("id", classIds),
      supabase.from("class_students").select("class_id").in("class_id", classIds),
      supabase.from("attendance").select("class_id, date, status").in("class_id", classIds),
    ]);

    const studentCount = ((csRes.data ?? []) as { class_id: string }[])
      .reduce<Record<string, number>>((acc, r) => {
        acc[r.class_id] = (acc[r.class_id] ?? 0) + 1;
        return acc;
      }, {});

    const attByClass = ((attRes.data ?? []) as { class_id: string; date: string; status: string }[])
      .reduce<Record<string, AttAgg>>((acc, r) => {
        if (!acc[r.class_id]) acc[r.class_id] = { present: 0, absent: 0, late: 0, dates: new Set() };
        const agg = acc[r.class_id];
        if (r.status === "present") agg.present++;
        else if (r.status === "absent") agg.absent++;
        else if (r.status === "late") agg.late++;
        agg.dates.add(r.date);
        return acc;
      }, {});

    classAttendance = ((clRes.data ?? []) as { id: string; name: string }[]).map(c => {
      const att = attByClass[c.id] ?? { present: 0, absent: 0, late: 0, dates: new Set<string>() };
      const total = att.present + att.absent + att.late;
      return {
        class_id: c.id,
        class_name: c.name,
        student_count: studentCount[c.id] ?? 0,
        session_count: att.dates.size,
        present_count: att.present,
        absent_count: att.absent,
        late_count: att.late,
        total_records: total,
      };
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <DashboardShell role="teacher" userName={profile.full_name || "Giáo viên"}>
      <div className="mx-auto flex max-w-5xl flex-col gap-lg">

        {/* Header */}
        <div>
          <h1 className="text-display-lg">Báo cáo & Thống kê</h1>
          <p className="mt-xs text-body-lg text-on-surface-variant">
            Theo dõi tiến trình học sinh, kết quả bài tập và điểm danh.
          </p>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-xs overflow-x-auto border-b border-outline-variant">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <Link
                key={t.key}
                href={`/teacher/reports?tab=${t.key}`}
                className={cn(
                  "flex shrink-0 items-center gap-xs border-b-2 px-md pb-sm pt-xs text-body-md font-medium transition-colors",
                  tab === t.key
                    ? "border-primary text-primary"
                    : "border-transparent text-on-surface-variant hover:text-on-surface",
                )}
              >
                <Icon size={16} />
                {t.label}
              </Link>
            );
          })}
        </div>

        {/* ══ Tab 1: Cảnh báo HS ══════════════════════════════════════════════ */}
        {tab === "flags" && (
          <>
            {/* Summary */}
            <div className="grid grid-cols-2 gap-md lg:grid-cols-4">
              {[
                { value: [...new Set(metricsRows.map(r => r.class_name))].length, label: "Lớp đang dạy",    color: "text-primary" },
                { value: metricsRows.length,              label: "Tổng học sinh",  color: "text-primary" },
                { value: flagCount,                       label: "Cần chú ý",      color: "text-error" },
                { value: analyzed.length - flagCount,     label: "Học bình thường",color: "text-tertiary" },
              ].map((s) => (
                <Card key={s.label} padding="md" className="text-center">
                  <p className={cn("font-display text-display-sm", s.color)}>{s.value}</p>
                  <p className="text-label-md text-on-surface-variant">{s.label}</p>
                </Card>
              ))}
            </div>

            {metricsRows.length === 0 ? (
              <EmptyState
                icon={BarChart3}
                title="Chưa có dữ liệu"
                description="Dữ liệu sẽ xuất hiện khi học sinh bắt đầu học và hệ thống ghi nhận log."
              />
            ) : (
              <div className="flex flex-col gap-sm">
                {analyzed.map(r => (
                  <Card key={`${r.student_id}-${r.class_id}`} padding="md">
                    <div className="flex flex-wrap items-start justify-between gap-sm">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-fixed text-label-sm font-bold text-on-primary-fixed">
                            {(r.student_name ?? "?").charAt(0).toUpperCase()}
                          </span>
                          <p className="text-body-md font-semibold">{r.student_name ?? "(Chưa có tên)"}</p>
                        </div>
                        <p className="mt-1 text-label-sm text-on-surface-variant">{r.class_name}</p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {r.flags.length === 0 ? (
                          <span className="rounded-full bg-tertiary-fixed px-3 py-1 text-label-sm text-on-tertiary-fixed">OK ✓</span>
                        ) : r.flags.map(f => (
                          <span key={f.key} title={f.detail}
                            className={cn("rounded-full px-3 py-1 text-label-sm font-medium", FLAG_STYLE[f.severity])}>
                            {f.label}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="mt-sm grid grid-cols-3 gap-sm text-center">
                      <div>
                        <p className="text-body-md font-semibold text-primary">{r.metrics.studyMinutesWeek}&apos;</p>
                        <p className="text-label-sm text-on-surface-variant">Phút/tuần</p>
                      </div>
                      <div>
                        <p className="text-body-md font-semibold text-secondary">{r.metrics.listensWeek}</p>
                        <p className="text-label-sm text-on-surface-variant">Lượt nghe</p>
                      </div>
                      <div>
                        <p className="text-body-md font-semibold text-tertiary">
                          {r.metrics.daysSinceActive >= 999 ? "—" : `${r.metrics.daysSinceActive}d`}
                        </p>
                        <p className="text-label-sm text-on-surface-variant">Ngày nghỉ</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* ══ Tab 2: Kết quả bài tập ══════════════════════════════════════════ */}
        {tab === "assignments" && (
          assignments.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="Chưa có bài tập nào"
              description="Tạo bài tập cho lớp học và kết quả nộp bài của học sinh sẽ hiện ở đây."
            />
          ) : (
            <div className="flex flex-col gap-sm">
              {assignments.map(a => {
                const submitRate = a.total_students > 0 ? Math.round(a.submitted / a.total_students * 100) : 0;
                const passRate   = a.submitted > 0     ? Math.round(a.pass_count / a.submitted * 100)     : 0;
                return (
                  <Card key={a.id} padding="md">
                    <div className="flex flex-wrap items-start justify-between gap-sm">
                      <div>
                        <p className="text-body-md font-semibold">{a.title}</p>
                        <p className="text-label-md text-on-surface-variant">
                          {a.class_name} · {fmtDate(a.created_at)}
                        </p>
                      </div>
                      <span className="rounded-full bg-surface-container px-3 py-1 text-label-sm text-on-surface-variant">
                        {a.type === "quiz" ? "Bài kiểm tra" : "Bài tập"}
                      </span>
                    </div>
                    <div className="mt-sm grid grid-cols-2 gap-sm sm:grid-cols-4">
                      {[
                        { value: a.total_students, label: "Sĩ số",            color: "text-primary" },
                        { value: `${a.submitted}/${a.total_students}`, label: `Đã nộp (${submitRate}%)`, color: "text-secondary" },
                        { value: a.avg_score ?? "—", label: "Điểm TB",         color: "text-tertiary" },
                        { value: `${passRate}%`,     label: "Đạt (≥5)",        color: passRate >= 70 ? "text-tertiary" : "text-error" },
                      ].map((s) => (
                        <div key={s.label} className="rounded-lg bg-surface-container px-3 py-2 text-center">
                          <p className={cn("text-body-md font-semibold", s.color)}>{s.value}</p>
                          <p className="text-label-sm text-on-surface-variant">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>
          )
        )}

        {/* ══ Tab 3: Báo cáo điểm danh ════════════════════════════════════════ */}
        {tab === "attendance" && (
          classAttendance.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title="Chưa có dữ liệu điểm danh"
              description="Dữ liệu sẽ hiện khi bạn ghi nhận điểm danh cho các lớp học."
            />
          ) : (
            <div className="flex flex-col gap-sm">
              {classAttendance.map(c => {
                const presentRate = c.total_records > 0 ? Math.round(c.present_count / c.total_records * 100) : 0;
                const absentRate  = c.total_records > 0 ? Math.round(c.absent_count  / c.total_records * 100) : 0;
                const lateRate    = c.total_records > 0 ? Math.round(c.late_count    / c.total_records * 100) : 0;
                return (
                  <Card key={c.class_id} padding="md">
                    <div className="mb-sm flex items-center justify-between gap-sm">
                      <div>
                        <p className="text-body-md font-semibold">{c.class_name}</p>
                        <p className="text-label-md text-on-surface-variant">
                          {c.session_count} buổi đã điểm danh
                        </p>
                      </div>
                      <span className="rounded-full bg-primary-fixed px-3 py-1 text-label-sm text-on-primary-fixed">
                        {c.student_count} học sinh
                      </span>
                    </div>

                    {/* Progress bar */}
                    {c.total_records > 0 && (
                      <div className="mb-sm flex h-2 overflow-hidden rounded-full bg-surface-container-high">
                        <div className="h-full bg-tertiary transition-all" style={{ width: `${presentRate}%` }} />
                        <div className="h-full bg-secondary" style={{ width: `${lateRate}%` }} />
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-sm text-center">
                      {[
                        { pct: presentRate, count: c.present_count, label: "Hiện diện", bg: "bg-tertiary-fixed/40",   color: "text-tertiary" },
                        { pct: absentRate,  count: c.absent_count,  label: "Vắng mặt",  bg: "bg-error-container/40", color: "text-error" },
                        { pct: lateRate,    count: c.late_count,    label: "Đi trễ",    bg: "bg-secondary-fixed/40", color: "text-secondary" },
                      ].map(s => (
                        <div key={s.label} className={cn("rounded-lg px-3 py-2", s.bg)}>
                          <p className={cn("text-body-md font-semibold", s.color)}>{s.pct}%</p>
                          <p className="text-label-sm text-on-surface-variant">{s.label} ({s.count})</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>
          )
        )}

      </div>
    </DashboardShell>
  );
}
