import Link from "next/link";
import { ListChecks, ArrowRight, Trophy, Clock } from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { isDemoId, DEMO_STUDENT_ASSIGNMENTS, CLASS_6A } from "@/lib/demo-data";
import { DashboardShell } from "@/components/DashboardShell";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

interface AssignmentRow {
  id: string;
  title: string;
  class_id: string;
  created_at: string;
  due_date: string | null;
  class: { name: string } | null;
  mySubmission: { score: number | null } | null;
}

export default async function ExercisesPage() {
  const profile = await requireRole("student");
  const demo = isDemoId(profile.id);

  let classIds: string[] = [];
  let assignments: AssignmentRow[] = [];

  if (demo) {
    classIds = [CLASS_6A];
    assignments = DEMO_STUDENT_ASSIGNMENTS.map((a) => ({
      id: a.id,
      title: a.title,
      class_id: a.class_id,
      created_at: a.created_at,
      due_date: null,
      class: { name: a.class_name },
      mySubmission: a.score !== null ? { score: a.score } : null,
    }));
  } else {
    try {
      const supabase = await createClient();
      const { data: classLinks } = await supabase
        .from("class_students")
        .select("class_id")
        .eq("student_id", profile.id);

      classIds = (classLinks ?? []).map((r) => r.class_id);

      if (classIds.length > 0) {
        const { data } = await supabase
          .from("assignments")
          .select("id, title, class_id, created_at, due_date, class:classes(name)")
          .in("class_id", classIds)
          .order("created_at", { ascending: false });

        const rawAssignments = (data ?? []) as unknown as AssignmentRow[];
        if (rawAssignments.length > 0) {
          const { data: subs } = await supabase
            .from("submissions")
            .select("assignment_id, score")
            .eq("student_id", profile.id)
            .in("assignment_id", rawAssignments.map((a) => a.id));
          const subMap = new Map((subs ?? []).map((s) => [s.assignment_id, s]));
          assignments = rawAssignments.map((a) => ({
            ...a,
            mySubmission: subMap.get(a.id) ? { score: subMap.get(a.id)!.score } : null,
          }));
        }
      }
    } catch { /* bỏ qua lỗi */ }
  }

  return (
    <DashboardShell role="student" userName={profile.full_name || "Học sinh"}>
      <div className="mx-auto flex max-w-4xl flex-col gap-lg">
        <div>
          <h1 className="text-display-lg">Bài tập</h1>
          <p className="mt-xs text-body-lg text-on-surface-variant">
            Bài tập giáo viên giao từ các lớp của bạn.
          </p>
        </div>

        {classIds.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="Bạn chưa tham gia lớp nào"
            description="Liên hệ giáo viên để được thêm vào lớp."
          />
        ) : assignments.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="Chưa có bài tập nào"
            description="Giáo viên chưa giao bài tập. Hãy tiếp tục luyện nghe và học lý thuyết nhé!"
          />
        ) : (
          <div className="flex flex-col gap-md">
            {assignments.map((a) => {
              const done = a.mySubmission !== null;
              const score = a.mySubmission?.score;
              const className = (a.class as unknown as { name: string } | null)?.name;
              const now = Date.now();
              const dueMs = a.due_date ? new Date(a.due_date).getTime() : null;
              const isOverdue = !done && dueMs !== null && dueMs < now;
              const isUrgent = !done && !isOverdue && dueMs !== null && dueMs - now < 24 * 60 * 60 * 1000;
              return (
                <Link key={a.id} href={`/student/exercises/${a.id}`}>
                  <Card interactive className="flex items-center gap-md">
                    <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-md ${done ? "bg-tertiary-fixed text-tertiary" : isOverdue ? "bg-error-container text-on-error-container" : "bg-primary-fixed text-primary"}`}>
                      {done ? <Trophy size={24} /> : <ListChecks size={24} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="truncate text-body-md font-semibold">{a.title}</h3>
                        {isOverdue && (
                          <span className="shrink-0 rounded-full bg-error-container px-2 py-0.5 text-label-xs font-medium text-on-error-container">
                            Đã hết hạn
                          </span>
                        )}
                        {isUrgent && (
                          <span className="shrink-0 flex items-center gap-0.5 rounded-full bg-secondary-fixed px-2 py-0.5 text-label-xs font-medium text-on-secondary-fixed">
                            <Clock size={10} /> Sắp hết hạn
                          </span>
                        )}
                      </div>
                      <p className="text-label-md text-on-surface-variant">
                        {className} · {new Date(a.created_at).toLocaleDateString("vi-VN")}
                        {dueMs && ` · Hạn: ${new Date(dueMs).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}`}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      {done ? (
                        <span className="text-body-md font-bold text-tertiary">{score != null ? `${Math.round(score)}%` : "Đã nộp"}</span>
                      ) : (
                        <span className="flex items-center gap-1 text-label-md font-semibold text-primary">
                          Làm bài <ArrowRight size={14} />
                        </span>
                      )}
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
