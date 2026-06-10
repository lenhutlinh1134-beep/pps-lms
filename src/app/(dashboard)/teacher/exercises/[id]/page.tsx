import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, Trophy, Users } from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/DashboardShell";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface StudentResult {
  student_id: string;
  full_name: string | null;
  score: number | null;
  submitted_at: string | null;
  answers: (number | null)[] | null;
}

interface Question {
  question: string;
  options: string[];
  correct_index: number;
  explanation?: string | null;
}

export default async function AssignmentResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireRole("teacher");
  const supabase = await createClient();

  // Lấy bài tập — đảm bảo thuộc lớp của GV
  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, title, payload, created_at, class_id, class:classes(name, teacher_id)")
    .eq("id", id)
    .single();

  if (!assignment) notFound();
  const cls = assignment.class as unknown as { name: string; teacher_id: string } | null;
  if (cls?.teacher_id !== profile.id) notFound();

  const questions: Question[] = (assignment.payload as { questions: Question[] })?.questions ?? [];

  // Học sinh trong lớp
  const { data: members } = await supabase
    .from("class_students")
    .select("student_id, profiles:student_id(full_name)")
    .eq("class_id", assignment.class_id);

  // Bài nộp
  const { data: subs } = await supabase
    .from("submissions")
    .select("student_id, score, submitted_at, payload")
    .eq("assignment_id", id);

  const subMap = new Map(
    (subs ?? []).map((s) => [
      s.student_id,
      { score: s.score as number, submitted_at: s.submitted_at as string, answers: (s.payload as { answers: number[] })?.answers ?? null },
    ]),
  );

  const results: StudentResult[] = (members ?? []).map((m) => {
    const sub = subMap.get(m.student_id);
    const profile = m.profiles as unknown as { full_name: string } | null;
    return {
      student_id: m.student_id,
      full_name: profile?.full_name ?? null,
      score: sub?.score ?? null,
      submitted_at: sub?.submitted_at ?? null,
      answers: sub?.answers ?? null,
    };
  });

  const submitted = results.filter((r) => r.score !== null);
  const avgScore = submitted.length
    ? Math.round(submitted.reduce((sum, r) => sum + (r.score ?? 0), 0) / submitted.length)
    : null;

  const date = new Date(assignment.created_at).toLocaleDateString("vi-VN");

  return (
    <DashboardShell role="teacher" userName={profile.full_name || "Giáo viên"}>
      <div className="mx-auto max-w-4xl">
        <Link
          href="/teacher/exercises"
          className="mb-md inline-flex items-center gap-1 text-label-md text-on-surface-variant hover:text-primary"
        >
          <ArrowLeft size={16} /> Bài tập
        </Link>

        {/* Header */}
        <div className="mb-lg">
          <h1 className="text-display-lg">{assignment.title}</h1>
          <p className="mt-xs text-body-lg text-on-surface-variant">
            {cls?.name} · Giao ngày {date} · {questions.length} câu hỏi
          </p>
        </div>

        {/* Stat cards */}
        <div className="mb-lg grid grid-cols-2 gap-md sm:grid-cols-4">
          <Card padding="md" className="text-center">
            <p className="font-display text-display-sm text-primary">{results.length}</p>
            <p className="text-label-md text-on-surface-variant">Học sinh</p>
          </Card>
          <Card padding="md" className="text-center">
            <p className="font-display text-display-sm text-tertiary">{submitted.length}</p>
            <p className="text-label-md text-on-surface-variant">Đã nộp</p>
          </Card>
          <Card padding="md" className="text-center">
            <p className="font-display text-display-sm text-on-surface-variant">
              {results.length - submitted.length}
            </p>
            <p className="text-label-md text-on-surface-variant">Chưa nộp</p>
          </Card>
          <Card padding="md" className="text-center">
            <p className="font-display text-display-sm text-secondary">
              {avgScore != null ? `${avgScore}%` : "—"}
            </p>
            <p className="text-label-md text-on-surface-variant">TB lớp</p>
          </Card>
        </div>

        {/* Bảng kết quả */}
        <section className="mb-lg">
          <h2 className="mb-md text-headline-sm flex items-center gap-2">
            <Users size={20} className="text-primary" /> Kết quả học sinh
          </h2>
          {results.length === 0 ? (
            <Card className="py-xl text-center text-on-surface-variant">
              Lớp này chưa có học sinh nào.
            </Card>
          ) : (
            <div className="flex flex-col gap-sm">
              {results
                .sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
                .map((r) => {
                  const done = r.score !== null;
                  const scoreColor =
                    !done ? "" :
                    r.score! >= 80 ? "text-tertiary" :
                    r.score! >= 50 ? "text-secondary" : "text-error";

                  return (
                    <Card key={r.student_id} padding="md" className="flex items-center gap-md">
                      <span
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display font-bold text-body-md",
                          done ? "bg-tertiary-fixed text-tertiary" : "bg-surface-container text-outline",
                        )}
                      >
                        {done ? <Trophy size={18} /> : <Clock size={18} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-body-md font-semibold">
                          {r.full_name ?? "Học sinh"}
                        </p>
                        {r.submitted_at && (
                          <p className="text-label-md text-on-surface-variant">
                            Nộp lúc {new Date(r.submitted_at).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        {done ? (
                          <>
                            <p className={cn("text-body-lg font-bold", scoreColor)}>{r.score}%</p>
                            {r.answers && (
                              <p className="text-label-sm text-on-surface-variant">
                                {r.answers.filter((a, i) => a === questions[i]?.correct_index).length}/{questions.length} đúng
                              </p>
                            )}
                          </>
                        ) : (
                          <span className="text-label-md text-on-surface-variant">Chưa nộp</span>
                        )}
                      </div>
                    </Card>
                  );
                })}
            </div>
          )}
        </section>

        {/* Câu hỏi trong bài */}
        <section>
          <h2 className="mb-md text-headline-sm flex items-center gap-2">
            <CheckCircle2 size={20} className="text-primary" /> Đáp án bài tập ({questions.length} câu)
          </h2>
          <div className="flex flex-col gap-sm">
            {questions.map((q, i) => (
              <Card key={i} padding="md">
                <p className="mb-sm text-body-md font-semibold">
                  <span className="mr-2 text-on-surface-variant">{i + 1}.</span>
                  {q.question}
                </p>
                <div className="flex flex-col gap-1">
                  {q.options.map((opt, oi) => (
                    <p
                      key={oi}
                      className={cn(
                        "rounded px-3 py-1.5 text-body-md",
                        oi === q.correct_index
                          ? "bg-tertiary-fixed font-semibold text-on-tertiary-fixed"
                          : "text-on-surface-variant",
                      )}
                    >
                      {String.fromCharCode(65 + oi)}. {opt}
                      {oi === q.correct_index && " ✓"}
                    </p>
                  ))}
                </div>
                {q.explanation && (
                  <p className="mt-sm text-label-md text-on-surface-variant italic">
                    💡 {q.explanation}
                  </p>
                )}
              </Card>
            ))}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
