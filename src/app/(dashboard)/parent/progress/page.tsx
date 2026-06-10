import { TrendingUp, FileText, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/DashboardShell";
import { Card } from "@/components/ui/Card";
import { EmptyState, StatTile } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

interface ChildRow {
  student_id: string;
  full_name: string | null;
}

interface SubmissionRow {
  id: string;
  student_id: string;
  assignment_id: string;
  file_url: string | null;
  score: number | null;
  feedback: string | null;
  created_at: string;
  assignment_title: string;
  assignment_due_date: string | null;
  class_name: string;
}

interface AttRow {
  student_id: string;
  date: string;
  status: "present" | "absent" | "late";
}

/** Score chip colour */
function scoreColor(score: number): string {
  if (score >= 80) return "bg-tertiary-fixed text-on-tertiary-fixed";
  if (score >= 50) return "bg-secondary-fixed text-on-secondary-fixed";
  return "bg-error-container text-on-error-container";
}

/** Format DD/MM/YYYY */
function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN");
}

/** Demo data */
function buildDemoData(): {
  children: ChildRow[];
  submissions: SubmissionRow[];
  attendance: AttRow[];
} {
  const children: ChildRow[] = [
    { student_id: "demo-child-1", full_name: "Nguyễn Bảo An" },
    { student_id: "demo-child-2", full_name: "Nguyễn Minh Khoa" },
  ];

  const today = new Date();
  const daysAgo = (n: number) =>
    new Date(today.getTime() - n * 86400000).toISOString();

  const submissions: SubmissionRow[] = [
    {
      id: "sub-1",
      student_id: "demo-child-1",
      assignment_id: "a1",
      file_url: "https://example.com/1.pdf",
      score: 92,
      feedback: "Xuất sắc! Phát âm rõ ràng.",
      created_at: daysAgo(1),
      assignment_title: "Bài tập phát âm IPA",
      assignment_due_date: daysAgo(0),
      class_name: "Lớp Sunshine A1",
    },
    {
      id: "sub-2",
      student_id: "demo-child-1",
      assignment_id: "a2",
      file_url: "https://example.com/2.pdf",
      score: 65,
      feedback: "Cần cải thiện ngữ pháp.",
      created_at: daysAgo(5),
      assignment_title: "Bài tập ngữ pháp thì quá khứ",
      assignment_due_date: daysAgo(4),
      class_name: "Lớp Sunshine A1",
    },
    {
      id: "sub-3",
      student_id: "demo-child-2",
      assignment_id: "a3",
      file_url: "https://example.com/3.pdf",
      score: 45,
      feedback: "Cần ôn lại từ vựng.",
      created_at: daysAgo(3),
      assignment_title: "Từ vựng chủ đề Du lịch",
      assignment_due_date: daysAgo(2),
      class_name: "Lớp Rainbow B2",
    },
    {
      id: "sub-4",
      student_id: "demo-child-2",
      assignment_id: "a4",
      file_url: null,
      score: null,
      feedback: null,
      created_at: daysAgo(0),
      assignment_title: "Nghe và viết lại đoạn hội thoại",
      assignment_due_date: daysAgo(-1),
      class_name: "Lớp Rainbow B2",
    },
  ];

  // 30 days attendance mock
  const attendance: AttRow[] = [];
  const statuses: AttRow["status"][] = ["present", "present", "present", "present", "late", "absent"];
  for (let i = 0; i < 30; i++) {
    if (i % 7 === 0 || i % 7 === 6) continue; // skip weekends
    const d = new Date(today.getTime() - i * 86400000).toISOString().slice(0, 10);
    attendance.push({
      student_id: "demo-child-1",
      date: d,
      status: statuses[i % statuses.length],
    });
    attendance.push({
      student_id: "demo-child-2",
      date: d,
      status: statuses[(i + 2) % statuses.length],
    });
  }

  return { children, submissions, attendance };
}

export default async function ParentProgressPage() {
  const profile = await requireRole("parent");

  let children: ChildRow[] = [];
  let submissions: SubmissionRow[] = [];
  let attendance: AttRow[] = [];
  let fetchError = false;

  if (profile.id.startsWith("demo-")) {
    ({ children, submissions, attendance } = buildDemoData());
  } else {
    try {
      const supabase = await createClient();

      // 1. Lấy danh sách con
      const { data: childrenRaw } = await supabase.rpc("get_my_children");
      children = ((childrenRaw as ChildRow[]) ?? []).map((c) => ({
        student_id: c.student_id,
        full_name: c.full_name,
      }));
      const childIds = children.map((c) => c.student_id);

      if (childIds.length > 0) {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
          .toISOString()
          .slice(0, 10);

        // 2. Submissions + assignments + classes — 1 query, tránh N+1
        const { data: subsRaw } = await supabase
          .from("submissions")
          .select(
            "id, student_id, assignment_id, file_url, score, feedback, created_at, assignment:assignments(title, due_date, class:classes(name))",
          )
          .in("student_id", childIds)
          .order("created_at", { ascending: false })
          .limit(50);

        submissions = (subsRaw ?? []).map((s) => {
          const asgn = s.assignment as unknown as {
            title: string;
            due_date: string | null;
            class: { name: string } | null;
          } | null;
          return {
            id: s.id,
            student_id: s.student_id,
            assignment_id: s.assignment_id,
            file_url: s.file_url ?? null,
            score: s.score ?? null,
            feedback: s.feedback ?? null,
            created_at: s.created_at,
            assignment_title: asgn?.title ?? "(Không có tiêu đề)",
            assignment_due_date: asgn?.due_date ?? null,
            class_name: asgn?.class?.name ?? "—",
          };
        });

        // 3. Attendance 30 ngày — 1 query
        const { data: attRaw } = await supabase
          .from("attendance")
          .select("student_id, date, status")
          .in("student_id", childIds)
          .gte("date", thirtyDaysAgo);

        attendance = (attRaw as AttRow[]) ?? [];
      }
    } catch {
      fetchError = true;
    }
  }

  // ─── Aggregate stats ───────────────────────────────────────────────────────
  const totalSubmitted = submissions.filter((s) => s.file_url !== null).length;

  const scoredSubs = submissions.filter((s) => s.score !== null);
  const avgScore =
    scoredSubs.length > 0
      ? scoredSubs.reduce((acc, s) => acc + (s.score ?? 0), 0) / scoredSubs.length
      : null;

  const presentCount = attendance.filter((a) => a.status === "present").length;

  return (
    <DashboardShell role="parent" userName={profile.full_name || "Phụ huynh"}>
      <div className="mx-auto flex max-w-5xl flex-col gap-xl">

        {/* Header */}
        <div className="flex items-center gap-md">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary-fixed text-primary">
            <TrendingUp size={28} />
          </span>
          <div>
            <h1 className="text-display-lg">Tiến độ học tập</h1>
            <p className="mt-xs text-body-lg text-on-surface-variant">
              Điểm bài tập và điểm danh của con
            </p>
          </div>
        </div>

        {/* Error state */}
        {fetchError && (
          <Card className="border border-error-container bg-error-container/20">
            <div className="flex items-center gap-sm text-on-error-container">
              <AlertCircle size={20} className="shrink-0" />
              <p className="text-body-md">
                Không thể tải dữ liệu. Vui lòng thử lại sau.
              </p>
            </div>
          </Card>
        )}

        {/* Stat tiles */}
        {!fetchError && (
          <div className="grid grid-cols-2 gap-md lg:grid-cols-3">
            <StatTile
              label="Bài đã nộp"
              value={`${totalSubmitted}`}
              hint={`/ ${submissions.length} bài được giao`}
            />
            <StatTile
              label="Điểm trung bình"
              value={avgScore !== null ? `${avgScore.toFixed(1)}` : "—"}
              hint={scoredSubs.length > 0 ? `${scoredSubs.length} bài đã chấm` : "Chưa có điểm"}
            />
            <StatTile
              label="Có mặt / 30 ngày"
              value={`${presentCount}`}
              hint={`/ ${attendance.length} buổi điểm danh`}
            />
          </div>
        )}

        {/* Empty state — no submissions at all */}
        {!fetchError && submissions.length === 0 && children.length > 0 && (
          <EmptyState
            icon={FileText}
            title="Con chưa có bài tập nào được giao"
            description="Khi giáo viên giao bài và con nộp bài, kết quả sẽ xuất hiện tại đây."
          />
        )}

        {/* Empty state — no children linked */}
        {!fetchError && children.length === 0 && (
          <EmptyState
            icon={TrendingUp}
            title="Chưa liên kết với học sinh nào"
            description="Liên kết tài khoản con để xem tiến độ học tập."
          />
        )}

        {/* Per-child sections */}
        {!fetchError &&
          children.map((child) => {
            const childSubs = submissions.filter(
              (s) => s.student_id === child.student_id,
            );
            const childAtt = attendance.filter(
              (a) => a.student_id === child.student_id,
            );
            const childPresent = childAtt.filter(
              (a) => a.status === "present",
            ).length;
            const childAbsent = childAtt.filter(
              (a) => a.status === "absent",
            ).length;
            const childLate = childAtt.filter(
              (a) => a.status === "late",
            ).length;

            return (
              <section key={child.student_id} className="flex flex-col gap-md">
                {/* Child heading */}
                <div className="flex flex-wrap items-center gap-md">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-fixed font-display text-headline-sm font-bold text-on-primary-fixed">
                    {(child.full_name ?? "?").charAt(0).toUpperCase()}
                  </span>
                  <h2 className="text-headline-sm">
                    {child.full_name ?? "(Chưa có tên)"}
                  </h2>

                  {/* Attendance summary chips */}
                  {childAtt.length > 0 && (
                    <div className="flex flex-wrap gap-xs">
                      <span className="flex items-center gap-1 rounded-full bg-tertiary-fixed px-3 py-1 text-label-sm text-on-tertiary-fixed">
                        <CheckCircle2 size={12} />
                        {childPresent} có mặt
                      </span>
                      {childLate > 0 && (
                        <span className="flex items-center gap-1 rounded-full bg-secondary-fixed px-3 py-1 text-label-sm text-on-secondary-fixed">
                          <Clock size={12} />
                          {childLate} trễ
                        </span>
                      )}
                      {childAbsent > 0 && (
                        <span className="flex items-center gap-1 rounded-full bg-error-container px-3 py-1 text-label-sm text-on-error-container">
                          {childAbsent} vắng
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Assignments table */}
                {childSubs.length === 0 ? (
                  <Card padding="md" className="flex items-center gap-md">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-container text-on-surface-variant">
                      <FileText size={20} />
                    </span>
                    <p className="text-body-md text-on-surface-variant">
                      Con chưa có bài tập nào được giao.
                    </p>
                  </Card>
                ) : (
                  <Card padding="none" className="overflow-hidden">
                    {/* Desktop table */}
                    <div className="hidden overflow-x-auto sm:block">
                      <table className="w-full text-body-md">
                        <thead>
                          <tr className="border-b border-outline-variant bg-surface-container text-left">
                            <th className="px-lg py-md text-label-md font-semibold text-on-surface-variant">
                              Bài tập
                            </th>
                            <th className="px-lg py-md text-label-md font-semibold text-on-surface-variant">
                              Lớp
                            </th>
                            <th className="px-lg py-md text-label-md font-semibold text-on-surface-variant">
                              Hạn nộp
                            </th>
                            <th className="px-lg py-md text-label-md font-semibold text-on-surface-variant">
                              Trạng thái
                            </th>
                            <th className="px-lg py-md text-right text-label-md font-semibold text-on-surface-variant">
                              Điểm
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant">
                          {childSubs.map((sub) => {
                            const submitted = sub.file_url !== null;
                            const graded = sub.score !== null;

                            return (
                              <tr
                                key={sub.id}
                                className="transition-colors hover:bg-surface-container"
                              >
                                <td className="px-lg py-md">
                                  <p className="font-medium">{sub.assignment_title}</p>
                                  {sub.feedback && (
                                    <p className="mt-0.5 text-label-sm text-on-surface-variant line-clamp-1">
                                      GV: {sub.feedback}
                                    </p>
                                  )}
                                </td>
                                <td className="px-lg py-md text-on-surface-variant">
                                  {sub.class_name}
                                </td>
                                <td className="px-lg py-md text-on-surface-variant">
                                  {fmtDate(sub.assignment_due_date)}
                                </td>
                                <td className="px-lg py-md">
                                  <StatusChip submitted={submitted} graded={graded} />
                                </td>
                                <td className="px-lg py-md text-right">
                                  {graded ? (
                                    <span
                                      className={`inline-flex items-center rounded-full px-3 py-1 text-label-md font-semibold ${scoreColor(sub.score!)}`}
                                    >
                                      {sub.score}
                                    </span>
                                  ) : (
                                    <span className="text-label-md text-on-surface-variant">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile card list */}
                    <div className="flex flex-col divide-y divide-outline-variant sm:hidden">
                      {childSubs.map((sub) => {
                        const submitted = sub.file_url !== null;
                        const graded = sub.score !== null;

                        return (
                          <div key={sub.id} className="flex flex-col gap-xs p-md">
                            <div className="flex items-start justify-between gap-sm">
                              <p className="font-medium text-body-md leading-snug flex-1">
                                {sub.assignment_title}
                              </p>
                              {graded ? (
                                <span
                                  className={`shrink-0 inline-flex items-center rounded-full px-3 py-1 text-label-md font-semibold ${scoreColor(sub.score!)}`}
                                >
                                  {sub.score}
                                </span>
                              ) : null}
                            </div>
                            <div className="flex flex-wrap items-center gap-xs text-label-sm text-on-surface-variant">
                              <span>{sub.class_name}</span>
                              <span>·</span>
                              <span>Hạn: {fmtDate(sub.assignment_due_date)}</span>
                            </div>
                            <StatusChip submitted={submitted} graded={graded} />
                            {sub.feedback && (
                              <p className="text-label-sm text-on-surface-variant line-clamp-2">
                                GV nhận xét: {sub.feedback}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                )}
              </section>
            );
          })}
      </div>
    </DashboardShell>
  );
}

/** Chip trạng thái bài nộp */
function StatusChip({
  submitted,
  graded,
}: {
  submitted: boolean;
  graded: boolean;
}) {
  if (graded) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-tertiary-fixed px-3 py-1 text-label-sm text-on-tertiary-fixed">
        <CheckCircle2 size={11} /> Đã chấm
      </span>
    );
  }
  if (submitted) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-secondary-fixed px-3 py-1 text-label-sm text-on-secondary-fixed">
        <FileText size={11} /> Đã nộp
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-container px-3 py-1 text-label-sm text-on-surface-variant">
      <Clock size={11} /> Chưa nộp
    </span>
  );
}
