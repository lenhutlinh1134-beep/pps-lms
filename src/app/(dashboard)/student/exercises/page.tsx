import Link from "next/link";
import { ListChecks, ArrowRight, Trophy } from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/DashboardShell";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

interface AssignmentRow {
  id: string;
  title: string;
  class_id: string;
  created_at: string;
  class: { name: string } | null;
  mySubmission: { score: number | null } | null;
}

export default async function ExercisesPage() {
  const profile = await requireRole("student");
  const supabase = await createClient();

  // Lấy danh sách bài tập của các lớp HS đang học
  const { data: classLinks } = await supabase
    .from("class_students")
    .select("class_id")
    .eq("student_id", profile.id);

  const classIds = (classLinks ?? []).map((r) => r.class_id);

  let assignments: AssignmentRow[] = [];
  if (classIds.length > 0) {
    const { data } = await supabase
      .from("assignments")
      .select(`
        id, title, class_id, created_at,
        class:classes(name)
      `)
      .in("class_id", classIds)
      .order("created_at", { ascending: false });

    const rawAssignments = (data ?? []) as unknown as AssignmentRow[];

    // Lấy bài đã nộp
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
              return (
                <Link key={a.id} href={`/student/exercises/${a.id}`}>
                  <Card interactive className="flex items-center gap-md">
                    <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-md ${done ? "bg-tertiary-fixed text-tertiary" : "bg-primary-fixed text-primary"}`}>
                      {done ? <Trophy size={24} /> : <ListChecks size={24} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-body-md font-semibold">{a.title}</h3>
                      <p className="text-label-md text-on-surface-variant">
                        {className} · {new Date(a.created_at).toLocaleDateString("vi-VN")}
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
