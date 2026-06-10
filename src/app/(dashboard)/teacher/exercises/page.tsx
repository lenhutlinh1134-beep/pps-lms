import Link from "next/link";
import { Plus, ListChecks, BookOpen, Users, BarChart2 } from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/DashboardShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/EmptyState";
import { DeleteQuestionButton } from "@/components/exercises/DeleteQuestionButton";

export const dynamic = "force-dynamic";

interface QuestionRow {
  id: string;
  topic: string | null;
  difficulty: string;
  question: string;
  created_at: string;
}

interface AssignmentRow {
  id: string;
  title: string;
  created_at: string;
  class: { name: string } | null;
  sub_count: number;
  student_count: number;
}

export default async function TeacherExercisesPage() {
  const profile = await requireRole("teacher");
  const supabase = await createClient();

  // Lấy lớp của GV
  const { data: myClasses } = await supabase
    .from("classes")
    .select("id")
    .eq("teacher_id", profile.id);
  const classIds = (myClasses ?? []).map((c) => c.id);

  const [{ data: questions }, { data: assignmentData }] = await Promise.all([
    supabase
      .from("question_bank")
      .select("id, topic, difficulty, question, created_at")
      .eq("teacher_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(50),
    classIds.length > 0
      ? supabase
          .from("assignments")
          .select("id, title, created_at, class:classes(name)")
          .in("class_id", classIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const bank: QuestionRow[] = (questions as QuestionRow[]) ?? [];

  // Lấy số lượt nộp cho mỗi bài tập
  const rawAssignments = (assignmentData ?? []) as unknown as Omit<AssignmentRow, "sub_count" | "student_count">[];
  let assignments: AssignmentRow[] = [];
  if (rawAssignments.length > 0) {
    const { data: subCounts } = await supabase
      .from("submissions")
      .select("assignment_id")
      .in("assignment_id", rawAssignments.map((a) => a.id));
    const subMap = new Map<string, number>();
    for (const s of subCounts ?? []) {
      subMap.set(s.assignment_id, (subMap.get(s.assignment_id) ?? 0) + 1);
    }
    assignments = rawAssignments.map((a) => ({
      ...a,
      sub_count: subMap.get(a.id) ?? 0,
      student_count: 0,
    }));
  }

  const topics = [...new Set(bank.map((q) => q.topic).filter(Boolean))] as string[];

  const DIFF_STYLE: Record<string, string> = {
    easy: "bg-tertiary-fixed text-on-tertiary-fixed",
    medium: "bg-secondary-fixed text-on-secondary-fixed",
    hard: "bg-error-container text-on-error-container",
  };

  return (
    <DashboardShell role="teacher" userName={profile.full_name || "Giáo viên"}>
      <div className="mx-auto flex max-w-5xl flex-col gap-lg">
        <div className="flex flex-wrap items-center justify-between gap-md">
          <div>
            <h1 className="text-display-lg">Ngân hàng câu hỏi</h1>
            <p className="mt-xs text-body-lg text-on-surface-variant">
              Soạn câu hỏi rồi gom thành bài tập giao cho lớp.
            </p>
          </div>
          <Link href="/teacher/exercises/new-question">
            <Button><Plus size={20} /> Thêm câu hỏi</Button>
          </Link>
        </div>

        {/* Tóm tắt */}
        {bank.length > 0 && (
          <div className="grid grid-cols-2 gap-md lg:grid-cols-4">
            <Card padding="md" className="text-center">
              <p className="font-display text-display-sm text-primary">{bank.length}</p>
              <p className="text-label-md text-on-surface-variant">Tổng câu hỏi</p>
            </Card>
            <Card padding="md" className="text-center">
              <p className="font-display text-display-sm text-secondary">{topics.length}</p>
              <p className="text-label-md text-on-surface-variant">Chủ đề</p>
            </Card>
            <Card padding="md" className="text-center">
              <p className="font-display text-display-sm text-tertiary">
                {bank.filter((q) => q.difficulty === "easy").length}
              </p>
              <p className="text-label-md text-on-surface-variant">Dễ</p>
            </Card>
            <Card padding="md" className="text-center">
              <p className="font-display text-display-sm text-error">
                {bank.filter((q) => q.difficulty === "hard").length}
              </p>
              <p className="text-label-md text-on-surface-variant">Khó</p>
            </Card>
          </div>
        )}

        {bank.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Ngân hàng câu hỏi trống"
            description="Thêm câu hỏi vào ngân hàng để tạo bài tập cho học sinh."
            action={
              <Link href="/teacher/exercises/new-question">
                <Button><Plus size={20} /> Thêm câu hỏi đầu tiên</Button>
              </Link>
            }
          />
        ) : (
          <section>
            <div className="mb-md flex items-center justify-between">
              <h2 className="text-headline-sm">Câu hỏi ({bank.length})</h2>
            </div>
            <div className="flex flex-col gap-sm">
              {bank.map((q) => (
                <Card key={q.id} padding="md" className="flex items-start gap-md">
                  <div className="min-w-0 flex-1">
                    <p className="text-body-md font-semibold">{q.question}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {q.topic && (
                        <span className="rounded-full bg-primary-fixed px-2 py-0.5 text-label-sm text-on-primary-fixed">
                          {q.topic}
                        </span>
                      )}
                      <span className={`rounded-full px-2 py-0.5 text-label-sm ${DIFF_STYLE[q.difficulty] ?? "bg-surface-container"}`}>
                        {q.difficulty === "easy" ? "Dễ" : q.difficulty === "hard" ? "Khó" : "Trung bình"}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-sm">
                    <span className="text-label-sm text-on-surface-variant">
                      {new Date(q.created_at).toLocaleDateString("vi-VN")}
                    </span>
                    <DeleteQuestionButton questionId={q.id} />
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Tạo bài tập từ ngân hàng */}
        {bank.length > 0 && (
          <section>
            <Card className="flex items-center gap-md">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-secondary-fixed text-secondary">
                <ListChecks size={22} />
              </span>
              <div className="flex-1">
                <p className="text-body-md font-semibold">Tạo bài tập từ ngân hàng câu hỏi</p>
                <p className="text-label-sm text-on-surface-variant">Chọn câu hỏi, gán lớp và phát cho học sinh làm.</p>
              </div>
              <Link href="/teacher/exercises/new-assignment">
                <Button><Plus size={18} /> Tạo bài tập</Button>
              </Link>
            </Card>
          </section>
        )}

        {/* Bài tập đã giao */}
        <section>
          <div className="mb-md flex items-center justify-between">
            <h2 className="text-headline-sm">Bài tập đã giao ({assignments.length})</h2>
          </div>
          {assignments.length === 0 ? (
            <EmptyState
              icon={BarChart2}
              title="Chưa có bài tập nào"
              description="Tạo câu hỏi rồi bấm 'Tạo bài tập' để giao cho học sinh."
            />
          ) : (
            <div className="flex flex-col gap-sm">
              {assignments.map((a) => {
                const className = (a.class as unknown as { name: string } | null)?.name;
                return (
                  <Link key={a.id} href={`/teacher/exercises/${a.id}`}>
                    <Card interactive className="flex items-center gap-md">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-secondary-fixed text-secondary">
                        <ListChecks size={22} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body-md font-semibold">{a.title}</p>
                        <p className="text-label-md text-on-surface-variant">
                          {className} · {new Date(a.created_at).toLocaleDateString("vi-VN")}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-body-md font-bold text-primary">{a.sub_count}</p>
                        <p className="text-label-sm text-on-surface-variant flex items-center gap-1">
                          <Users size={12} /> đã nộp
                        </p>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
